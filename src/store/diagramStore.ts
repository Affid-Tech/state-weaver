import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { 
  DiagramProject, 
  Instrument, 
  Topic, 
  TopicData, 
  StateNode, 
  Transition, 
  TopicKind,
  FlowType,
  Position,
  TopicEndKind 
} from '@/types/diagram';
import { deriveTransitionKind } from '@/types/diagram';
import type { FieldConfig } from '@/types/fieldConfig';
import { DEFAULT_FIELD_CONFIG } from '@/types/fieldConfig';

export interface DiagramState {
  // Multi-project workspace
  projects: DiagramProject[];
  activeProjectId: string | null;
  
  // UI state
  selectedElementId: string | null;
  selectedElementType: 'state' | 'transition' | null;
  viewMode: 'topic' | 'aggregate';
  transitionVisibility: Record<string, boolean>;
  hiddenSelfLoopTransitionIds: Record<string, boolean>;
  
  // Global field config (shared across all projects)
  fieldConfig: FieldConfig;
  
  // Project management actions
  createProject: (instrument: Partial<Instrument>) => string;
  duplicateProject: (projectId: string) => string | null;
  deleteProject: (projectId: string) => void;
  selectProject: (projectId: string) => void;
  
  // Legacy single-project actions (operate on active project)
  setProject: (project: DiagramProject) => void;
  updateProjectName: (name: string) => void;
  updateInstrument: (instrument: Partial<Instrument>) => void;
  
  // Topic actions
  createTopic: (id: string, kind: TopicKind, label?: string) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  deleteTopic: (topicId: string) => void;
  selectTopic: (topicId: string) => void;
  setRootTopic: (topicId: string) => void;
  
  // State actions - now takes label instead of id
  addState: (topicId: string, label: string, position?: Position) => void;
  addFork: (topicId: string, position?: Position) => void;
  updateState: (topicId: string, stateId: string, updates: Partial<StateNode>) => void;
  deleteState: (topicId: string, stateId: string) => void;
  updateStatePosition: (topicId: string, stateId: string, position: Position) => void;
  
  // Transition actions
  addTransition: (
    topicId: string,
    from: string,
    to: string,
    messageType?: string,
    flowType?: FlowType,
    sourceHandleId?: string,
    targetHandleId?: string,
    revision?: string,
    instrument?: string,
    topic?: string,
    endTopicKind?: TopicEndKind
  ) => string;
  updateTransition: (topicId: string, transitionId: string, updates: Partial<Omit<Transition, 'kind'>>) => void;
  deleteTransition: (topicId: string, transitionId: string) => void;
  updateTransitionRouting: (topicId: string, transitionId: string, sourceHandleId?: string, targetHandleId?: string, curveOffset?: number) => void;
  updateTransitionTeleportAnchors: (topicId: string, transitionId: string, teleportAnchorIn?: Position, teleportAnchorOut?: Position) => void;
  getTransitionTeleportEnabled: (topicId: string, transitionId: string) => boolean;
  setTransitionTeleportEnabled: (topicId: string, transitionId: string, enabled: boolean) => void;
  setTransitionVisibility: (transitionId: string, isVisible: boolean) => void;
  setTransitionsVisibility: (transitionIds: string[], isVisible: boolean) => void;
  
  // Selection
  selectElement: (elementId: string | null, elementType: 'state' | 'transition' | null) => void;
  
  // View mode
  setViewMode: (mode: 'topic' | 'aggregate') => void;

  // Self-loop visibility
  isSelfLoopTransitionHidden: (transitionId: string) => boolean;
  toggleSelfLoopTransitionVisibility: (transitionId: string) => void;
  
  // Field config
  updateFieldConfig: (config: Partial<FieldConfig>) => void;
  
  // Import/Export
  exportInstrument: () => string;
  exportProject: () => string;
  importInstrument: (json: string) => boolean;
  importProject: (json: string) => boolean;
  resetProject: () => void;
  
  // Computed helper
  getActiveProject: () => DiagramProject | null;
}

const createSystemNodes = (kind: TopicKind): StateNode[] => {
  if (kind === 'root') {
    return [
      {
        id: 'NewInstrument',
        label: 'New Instrument',
        stereotype: 'NewInstrument',
        position: { x: 100, y: 100 },
        isSystemNode: true,
        systemNodeType: 'NewInstrument',
      },
    ];
  }
  return [
    {
      id: 'TopicStart',
      label: 'Topic Start',
      stereotype: 'Start',
      position: { x: 100, y: 100 },
      isSystemNode: true,
      systemNodeType: 'TopicStart',
    },
  ];
};

const LEGACY_TOPIC_END_IDS = new Set(['EndTopic', 'TopicEnd']);
const LEGACY_INSTRUMENT_END_IDS = new Set(['EndInstrument', 'EndInsturment', 'InstrumentEnd']);
const LEGACY_END_NODE_IDS = new Set([...LEGACY_TOPIC_END_IDS, ...LEGACY_INSTRUMENT_END_IDS]);

const isLegacyEndNode = (state: StateNode): boolean => {
  if (state.systemNodeType === 'TopicEnd' || state.systemNodeType === 'InstrumentEnd') {
    return true;
  }
  if (LEGACY_END_NODE_IDS.has(state.id)) return true;
  if (LEGACY_END_NODE_IDS.has(state.label)) return true;
  if (state.stereotype && LEGACY_END_NODE_IDS.has(state.stereotype)) return true;
  return false;
};

const normalizeTopicEndMarkers = (projects: DiagramProject[]): Set<string> => {
  const removedTransitionIds = new Set<string>();
  projects.forEach((project) => {
    project.topics.forEach((topicData) => {
      const legacyEndStateKinds = new Map<string, TopicEndKind>();
      topicData.states.forEach((state) => {
        if (!isLegacyEndNode(state)) {
          return;
        }
        if (
          state.systemNodeType === 'InstrumentEnd'
          || LEGACY_INSTRUMENT_END_IDS.has(state.id)
          || LEGACY_INSTRUMENT_END_IDS.has(state.label)
          || (state.stereotype && LEGACY_INSTRUMENT_END_IDS.has(state.stereotype))
        ) {
          legacyEndStateKinds.set(state.id, 'negative');
          return;
        }
        legacyEndStateKinds.set(state.id, 'positive');
      });
      if (legacyEndStateKinds.size > 0) {
        const transitionsToRemove = new Set<string>();
        topicData.transitions.forEach((transition) => {
          const legacyEndKind = legacyEndStateKinds.get(transition.to);
          if (legacyEndKind) {
            const fromState = topicData.states.find((state) => state.id === transition.from);
            if (fromState && fromState.topicEndKind == null) {
              fromState.topicEndKind = legacyEndKind;
            }
            transitionsToRemove.add(transition.id);
            removedTransitionIds.add(transition.id);
          }
        });
        if (transitionsToRemove.size > 0) {
          topicData.transitions = topicData.transitions.filter(
            (transition) => !transitionsToRemove.has(transition.id)
          );
        }
        topicData.states = topicData.states.filter(
          (state) => !legacyEndStateKinds.has(state.id)
        );
      }
      topicData.states.forEach((state) => {
        const hasTopicEndKind = Object.prototype.hasOwnProperty.call(state, 'topicEndKind');
        if (hasTopicEndKind && state.topicEndKind == null) {
          state.topicEndKind = 'positive';
        }
        if (Object.prototype.hasOwnProperty.call(state, 'isTopicEnd')) {
          if ((state as { isTopicEnd?: boolean }).isTopicEnd) {
            state.topicEndKind = state.topicEndKind ?? 'positive';
          }
          delete (state as { isTopicEnd?: boolean }).isTopicEnd;
        }
      });
      topicData.transitions.forEach((transition) => {
        if (transition.kind === 'endTopic' && transition.endTopicKind == null) {
          transition.endTopicKind = 'positive';
        }
      });
      const statesById = new Map(topicData.states.map((state) => [state.id, state]));
      if (topicData.transitions.some((transition) => transition.kind === 'endTopic')) {
        const transitionsToRemove = new Set<string>();
        topicData.transitions.forEach((transition) => {
          if (transition.kind !== 'endTopic') return;
          const toState = statesById.get(transition.to);
          if (!toState) {
            transitionsToRemove.add(transition.id);
            removedTransitionIds.add(transition.id);
            return;
          }
          if (toState.systemNodeType !== 'TopicEnd') {
            const fromState = statesById.get(transition.from);
            transition.kind = deriveTransitionKind(fromState, toState);
            if (transition.kind !== 'endTopic') {
              transition.endTopicKind = undefined;
            }
          }
        });
        if (transitionsToRemove.size > 0) {
          topicData.transitions = topicData.transitions.filter(
            (transition) => !transitionsToRemove.has(transition.id)
          );
        }
      }
    });
  });
  return removedTransitionIds;
};

const createNewProject = (instrument: Partial<Instrument> = {}): DiagramProject => {
  const projectId = uuidv4();
  const defaultInstrument: Instrument = {
    type: instrument.type || 'new_instrument',
    revision: instrument.revision || 'R1',
    label: instrument.label,
    description: instrument.description,
  };
  
  return {
    id: projectId,
    name: defaultInstrument.label || defaultInstrument.type,
    instrument: defaultInstrument,
    topics: [], // Start with empty topics
    selectedTopicId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const useDiagramStore = create<DiagramState>()(
  persist(
    immer((set, get) => {
      return {
        // Start with empty workspace - no sample project
        projects: [],
        activeProjectId: null,
        selectedElementId: null,
        selectedElementType: null,
        viewMode: 'topic',
        transitionVisibility: {},
        hiddenSelfLoopTransitionIds: {},
        fieldConfig: DEFAULT_FIELD_CONFIG,

        getActiveProject: () => {
          const state = get();
          return state.projects.find(p => p.id === state.activeProjectId) || null;
        },
        
        // Project management
        createProject: (instrument) => {
          const newProject = createNewProject(instrument);
          set((state) => {
            state.projects.push(newProject);
            state.activeProjectId = newProject.id;
            state.selectedElementId = null;
            state.selectedElementType = null;
          });
          return newProject.id;
        },
        
        duplicateProject: (projectId) => {
          const state = get();
          const source = state.projects.find(p => p.id === projectId);
          if (!source) return null;
          
          const newProject: DiagramProject = {
            ...JSON.parse(JSON.stringify(source)),
            id: uuidv4(),
            name: `${source.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => {
            state.projects.push(newProject);
          });
          
          return newProject.id;
        },
        
        deleteProject: (projectId) => set((state) => {
          // Allow deleting all projects (gallery can be empty)
          state.projects = state.projects.filter(p => p.id !== projectId);
          if (state.activeProjectId === projectId) {
            state.activeProjectId = state.projects[0]?.id || null;
            state.selectedElementId = null;
            state.selectedElementType = null;
          }
        }),
        
        selectProject: (projectId) => set((state) => {
          if (state.projects.some(p => p.id === projectId)) {
            state.activeProjectId = projectId;
            state.selectedElementId = null;
            state.selectedElementType = null;
          }
        }),

        setProject: (project) => set((state) => {
          const idx = state.projects.findIndex(p => p.id === state.activeProjectId);
          if (idx >= 0) {
            state.projects[idx] = project;
          }
        }),
        
        updateProjectName: (name) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (project) {
            project.name = name;
            project.updatedAt = new Date().toISOString();
          }
        }),
        
        updateInstrument: (instrument) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (project) {
            project.instrument = { ...project.instrument, ...instrument };
            project.updatedAt = new Date().toISOString();
          }
        }),
        
        createTopic: (id, kind, label) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          // Check for duplicate topic type within this instrument
          const exists = project.topics.some(t => t.topic.id === id);
          if (exists) {
            // Topic with this type already exists - abort silently
            // UI layer should handle user feedback
            return;
          }
          
          const topicData: TopicData = {
            topic: { id, kind, label },
            states: createSystemNodes(kind),
            transitions: [],
          };
          project.topics.push(topicData);
          project.selectedTopicId = id;
          project.updatedAt = new Date().toISOString();
        }),
        
        updateTopic: (topicId, updates) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            Object.assign(topicData.topic, updates);
            project.updatedAt = new Date().toISOString();
          }
        }),
        
        deleteTopic: (topicId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          project.topics = project.topics.filter(t => t.topic.id !== topicId);
          if (project.selectedTopicId === topicId) {
            project.selectedTopicId = project.topics[0]?.topic.id ?? null;
          }
          project.updatedAt = new Date().toISOString();
        }),
        
        selectTopic: (topicId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          project.selectedTopicId = topicId;
          state.selectedElementId = null;
          state.selectedElementType = null;
        }),
        
        setRootTopic: (topicId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (!topicData) return;
          
          if (topicData.topic.kind === 'root') {
            topicData.topic.kind = 'normal';
            const startNode = topicData.states.find(s => s.systemNodeType === 'NewInstrument');
            if (startNode) {
              const oldId = startNode.id;
              startNode.id = 'TopicStart';
              startNode.label = 'Topic Start';
              startNode.stereotype = 'Start';
              startNode.systemNodeType = 'TopicStart';
              topicData.transitions.forEach(tr => {
                if (tr.from === oldId) tr.from = 'TopicStart';
                if (tr.to === oldId) tr.to = 'TopicStart';
              });
              topicData.transitions.forEach(tr => {
                const fromState = topicData.states.find(s => s.id === tr.from);
                const toState = topicData.states.find(s => s.id === tr.to);
                tr.kind = deriveTransitionKind(fromState, toState);
              });
            }
          } else {
            topicData.topic.kind = 'root';
            const startNode = topicData.states.find(s => s.systemNodeType === 'TopicStart');
            if (startNode) {
              const oldId = startNode.id;
              startNode.id = 'NewInstrument';
              startNode.label = 'New Instrument';
              startNode.stereotype = 'NewInstrument';
              startNode.systemNodeType = 'NewInstrument';
              topicData.transitions.forEach(tr => {
                if (tr.from === oldId) tr.from = 'NewInstrument';
                if (tr.to === oldId) tr.to = 'NewInstrument';
              });
              topicData.transitions.forEach(tr => {
                const fromState = topicData.states.find(s => s.id === tr.from);
                const toState = topicData.states.find(s => s.id === tr.to);
                tr.kind = deriveTransitionKind(fromState, toState);
              });
            }
          }
          project.updatedAt = new Date().toISOString();
        }),
        
        // Updated addState: takes label, generates UUID for id
        addState: (topicId, label, position) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const newState: StateNode = {
              id: uuidv4(), // Auto-generate UUID
              label,
              stereotype: undefined, // No stereotype by default for custom states
              position: position ?? { x: 250, y: 200 },
              isSystemNode: false,
            };
            topicData.states.push(newState);
            project.updatedAt = new Date().toISOString();
          }
        }),

        addFork: (topicId, position) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;

          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const forkNode: StateNode = {
              id: uuidv4(),
              label: 'Fork',
              position: position ?? { x: 300, y: 200 },
              isSystemNode: true,
              systemNodeType: 'Fork',
            };
            topicData.states.push(forkNode);
            project.updatedAt = new Date().toISOString();
          }
        }),
        
        updateState: (topicId, stateId, updates) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const stateNode = topicData.states.find(s => s.id === stateId);
            if (stateNode && !stateNode.isSystemNode) {
              if ('topicEndKind' in updates && updates.topicEndKind === undefined) {
                delete stateNode.topicEndKind;
                const { topicEndKind: _topicEndKind, ...rest } = updates;
                Object.assign(stateNode, rest);
              } else {
                Object.assign(stateNode, updates);
              }
              project.updatedAt = new Date().toISOString();
            }
          }
        }),
        
        deleteState: (topicId, stateId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const stateNode = topicData.states.find(s => s.id === stateId);
            if (stateNode && (!stateNode.isSystemNode || stateNode.systemNodeType === 'Fork')) {
              const removedTransitionIds = topicData.transitions
                .filter(t => t.from === stateId || t.to === stateId)
                .map(t => t.id);
              topicData.states = topicData.states.filter(s => s.id !== stateId);
              topicData.transitions = topicData.transitions.filter(
                t => t.from !== stateId && t.to !== stateId
              );
              removedTransitionIds.forEach((transitionId) => {
                delete state.transitionVisibility[transitionId];
              });
              project.updatedAt = new Date().toISOString();
            }
          }
        }),
        
        updateStatePosition: (topicId, stateId, position) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const stateNode = topicData.states.find(s => s.id === stateId);
            if (stateNode) {
              stateNode.position = position;
              project.updatedAt = new Date().toISOString();
            }
          }
        }),
        
        addTransition: (topicId, from, to, messageType, flowType, sourceHandleId, targetHandleId, revision, instrument, topic, endTopicKind) => {
          const transitionId = uuidv4();
          set((state) => {
            const project = state.projects.find(p => p.id === state.activeProjectId);
            if (!project) return;
            
            const topicData = project.topics.find(t => t.topic.id === topicId);
            if (topicData) {
              const fromState = topicData.states.find(s => s.id === from);
              const toState = topicData.states.find(s => s.id === to);
              const kind = deriveTransitionKind(fromState, toState);
              const isRoutingOnly = toState?.systemNodeType === 'Fork';
              const resolvedEndTopicKind = kind === 'endTopic'
                ? endTopicKind ?? 'positive'
                : undefined;
              
              topicData.transitions.push({
                id: transitionId,
                from,
                to,
                kind,
                isRoutingOnly,
                endTopicKind: resolvedEndTopicKind,
                teleportEnabled: false,
                messageType: isRoutingOnly ? undefined : messageType,
                flowType: isRoutingOnly ? undefined : flowType,
                sourceHandleId,
                targetHandleId,
                revision,
                instrument,
                topic,
              });
              state.transitionVisibility[transitionId] = true;
              project.updatedAt = new Date().toISOString();
            }
          });
          return transitionId;
        },
        
        updateTransition: (topicId, transitionId, updates) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const transition = topicData.transitions.find(t => t.id === transitionId);
            if (transition) {
              const { kind: _kind, ...safeUpdates } = updates as Partial<Transition>;
              Object.assign(transition, safeUpdates);
              
              if (updates.from !== undefined || updates.to !== undefined) {
                const fromState = topicData.states.find(s => s.id === transition.from);
                const toState = topicData.states.find(s => s.id === transition.to);
                transition.kind = deriveTransitionKind(fromState, toState);
                transition.isRoutingOnly = toState?.systemNodeType === 'Fork';
                if (transition.kind === 'endTopic' && transition.endTopicKind == null) {
                  transition.endTopicKind = 'positive';
                }
                if (transition.isRoutingOnly) {
                  transition.messageType = undefined;
                  transition.flowType = undefined;
                }
              }
              project.updatedAt = new Date().toISOString();
            }
          }
        }),
        
        deleteTransition: (topicId, transitionId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            topicData.transitions = topicData.transitions.filter(t => t.id !== transitionId);
            delete state.transitionVisibility[transitionId];
            project.updatedAt = new Date().toISOString();
          }
        }),
        
        updateTransitionRouting: (topicId, transitionId, sourceHandleId, targetHandleId, curveOffset) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const transition = topicData.transitions.find(t => t.id === transitionId);
            if (transition) {
              if (sourceHandleId !== undefined) transition.sourceHandleId = sourceHandleId;
              if (targetHandleId !== undefined) transition.targetHandleId = targetHandleId;
              if (curveOffset !== undefined) transition.curveOffset = curveOffset;
              project.updatedAt = new Date().toISOString();
            }
          }
        }),

        updateTransitionTeleportAnchors: (topicId, transitionId, teleportAnchorIn, teleportAnchorOut) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;

          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const transition = topicData.transitions.find(t => t.id === transitionId);
            if (transition) {
              if (teleportAnchorIn !== undefined) transition.teleportAnchorIn = teleportAnchorIn;
              if (teleportAnchorOut !== undefined) transition.teleportAnchorOut = teleportAnchorOut;
              project.updatedAt = new Date().toISOString();
            }
          }
        }),

        getTransitionTeleportEnabled: (topicId, transitionId) => {
          const state = get();
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return false;
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (!topicData) return false;
          const transition = topicData.transitions.find(t => t.id === transitionId);
          return transition?.teleportEnabled === true;
        },

        setTransitionTeleportEnabled: (topicId, transitionId, enabled) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (!topicData) return;
          const transition = topicData.transitions.find(t => t.id === transitionId);
          if (transition) {
            transition.teleportEnabled = enabled;
            project.updatedAt = new Date().toISOString();
          }
        }),

        setTransitionVisibility: (transitionId, isVisible) => set((state) => {
          state.transitionVisibility[transitionId] = isVisible;
        }),

        setTransitionsVisibility: (transitionIds, isVisible) => set((state) => {
          transitionIds.forEach((transitionId) => {
            state.transitionVisibility[transitionId] = isVisible;
          });
        }),
        
        selectElement: (elementId, elementType) => set((state) => {
          state.selectedElementId = elementId;
          state.selectedElementType = elementType;
        }),
        
        setViewMode: (mode) => set((state) => {
          state.viewMode = mode;
        }),

        isSelfLoopTransitionHidden: (transitionId) => {
          const state = get();
          return Boolean(state.hiddenSelfLoopTransitionIds[transitionId]);
        },

        toggleSelfLoopTransitionVisibility: (transitionId) => set((state) => {
          if (state.hiddenSelfLoopTransitionIds[transitionId]) {
            delete state.hiddenSelfLoopTransitionIds[transitionId];
          } else {
            state.hiddenSelfLoopTransitionIds[transitionId] = true;
          }
        }),
        
        updateFieldConfig: (config) => set((state) => {
          Object.assign(state.fieldConfig, config);
        }),
        
        exportInstrument: () => {
          const state = get();
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return '';
          const sanitizedProject = JSON.parse(JSON.stringify(project)) as DiagramProject;
          normalizeTopicEndMarkers([sanitizedProject]);
          return JSON.stringify(sanitizedProject, null, 2);
        },

        exportProject: () => {
          const stateForExport = JSON.parse(JSON.stringify(get())) as DiagramState;
          normalizeTopicEndMarkers(stateForExport.projects);
          stateForExport.viewMode = "topic";
          stateForExport.activeProjectId = null;
          stateForExport.selectedElementId = null;
          stateForExport.selectedElementType = null;
          return JSON.stringify(stateForExport, null, 2);
        },
        
        importInstrument: (json) => {
          try {
            const project = JSON.parse(json) as DiagramProject;
            normalizeTopicEndMarkers([project]);
            // Give it a new ID to avoid conflicts
            project.id = uuidv4();
            project.updatedAt = new Date().toISOString();
            
            set((state) => {
              state.projects.push(project);
              state.activeProjectId = project.id;
              state.selectedElementId = null;
              state.selectedElementType = null;
            });
            return true;
          } catch {
            return false;
          }
        },

        importProject: (json) => {
          try {
            const newState = JSON.parse(json) as DiagramState;
            // Give it a new ID to avoid conflicts
            const removedTransitionIds = normalizeTopicEndMarkers(newState.projects);

            set((state) => {
              state.projects = newState.projects;
              state.fieldConfig = newState.fieldConfig;
              state.viewMode = "topic";
              state.activeProjectId = null;
              state.selectedElementId = null;
              state.selectedElementType = null;
              state.hiddenSelfLoopTransitionIds = newState.hiddenSelfLoopTransitionIds ?? {};
              removedTransitionIds.forEach((transitionId) => {
                delete state.transitionVisibility[transitionId];
                delete state.hiddenSelfLoopTransitionIds[transitionId];
              });
            });
            return true;
          } catch {
            return false;
          }
        },
        
        resetProject: () => set((state) => {
          // Reset to empty workspace
          state.projects = [];
          state.activeProjectId = null;
          state.selectedElementId = null;
          state.selectedElementType = null;
          state.hiddenSelfLoopTransitionIds = {};
        }),
      };
    }),
    {
      name: 'diagram-workspace',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        selectedElementId: state.selectedElementId,
        selectedElementType: state.selectedElementType,
        viewMode: state.viewMode,
        hiddenSelfLoopTransitionIds: state.hiddenSelfLoopTransitionIds,
        fieldConfig: state.fieldConfig,
      }),
      onRehydrateStorage: () => (state) => {
        // Fix up any inconsistent state after rehydration
        if (state) {
          const removedTransitionIds = normalizeTopicEndMarkers(state.projects);
          removedTransitionIds.forEach((transitionId) => {
            delete state.transitionVisibility[transitionId];
            delete state.hiddenSelfLoopTransitionIds[transitionId];
          });
          // If activeProjectId points to non-existent project, fix it
          if (state.activeProjectId && !state.projects.some(p => p.id === state.activeProjectId)) {
            state.activeProjectId = state.projects[0]?.id || null;
          }
          // If no active project but projects exist, select first
          if (!state.activeProjectId && state.projects.length > 0) {
            state.activeProjectId = state.projects[0].id;
          }
        }
      },
    }
  )
);
