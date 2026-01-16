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
  Position 
} from '@/types/diagram';
import { deriveTransitionKind } from '@/types/diagram';
import type { FieldConfig } from '@/types/fieldConfig';
import { DEFAULT_FIELD_CONFIG } from '@/types/fieldConfig';

interface DiagramState {
  // Multi-project workspace
  projects: DiagramProject[];
  activeProjectId: string | null;
  
  // UI state
  selectedElementId: string | null;
  selectedElementType: 'state' | 'transition' | null;
  viewMode: 'topic' | 'aggregate';
  
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
  addInstrumentEnd: (topicId: string) => void;
  addTopicEnd: (topicId: string) => void;
  updateState: (topicId: string, stateId: string, updates: Partial<StateNode>) => void;
  deleteState: (topicId: string, stateId: string) => void;
  updateStatePosition: (topicId: string, stateId: string, position: Position) => void;
  
  // Transition actions
  addTransition: (topicId: string, from: string, to: string, messageType: string, flowType: FlowType, sourceHandleId?: string, targetHandleId?: string, revision?: string, instrument?: string, topic?: string) => string;
  updateTransition: (topicId: string, transitionId: string, updates: Partial<Omit<Transition, 'kind'>>) => void;
  deleteTransition: (topicId: string, transitionId: string) => void;
  updateTransitionRouting: (topicId: string, transitionId: string, sourceHandleId?: string, targetHandleId?: string, curveOffset?: number) => void;
  
  // Selection
  selectElement: (elementId: string | null, elementType: 'state' | 'transition' | null) => void;
  
  // View mode
  setViewMode: (mode: 'topic' | 'aggregate') => void;
  
  // Field config
  updateFieldConfig: (config: Partial<FieldConfig>) => void;
  
  // Import/Export
  exportProject: () => string;
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
      {
        id: 'TopicEnd',
        label: 'Topic End',
        stereotype: 'End',
        position: { x: 400, y: 300 },
        isSystemNode: true,
        systemNodeType: 'TopicEnd',
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
    {
      id: 'TopicEnd',
      label: 'Topic End',
      stereotype: 'End',
      position: { x: 400, y: 300 },
      isSystemNode: true,
      systemNodeType: 'TopicEnd',
    },
  ];
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

        addInstrumentEnd: (topicId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const exists = topicData.states.some(s => s.systemNodeType === 'InstrumentEnd');
            if (!exists) {
              const instrumentEnd: StateNode = {
                id: 'InstrumentEnd',
                label: 'Instrument End',
                stereotype: 'End',
                position: { x: 500, y: 300 },
                isSystemNode: true,
                systemNodeType: 'InstrumentEnd',
              };
              topicData.states.push(instrumentEnd);
              project.updatedAt = new Date().toISOString();
            }
          }
        }),

        addTopicEnd: (topicId) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const exists = topicData.states.some(s => s.systemNodeType === 'TopicEnd');
            if (!exists) {
              const topicEnd: StateNode = {
                id: 'TopicEnd',
                label: 'Topic End',
                stereotype: 'End',
                position: { x: 400, y: 300 },
                isSystemNode: true,
                systemNodeType: 'TopicEnd',
              };
              topicData.states.push(topicEnd);
              project.updatedAt = new Date().toISOString();
            }
          }
        }),
        
        updateState: (topicId, stateId, updates) => set((state) => {
          const project = state.projects.find(p => p.id === state.activeProjectId);
          if (!project) return;
          
          const topicData = project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const stateNode = topicData.states.find(s => s.id === stateId);
            if (stateNode && !stateNode.isSystemNode) {
              Object.assign(stateNode, updates);
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
            if (stateNode && !stateNode.isSystemNode) {
              topicData.states = topicData.states.filter(s => s.id !== stateId);
              topicData.transitions = topicData.transitions.filter(
                t => t.from !== stateId && t.to !== stateId
              );
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
        
        addTransition: (topicId, from, to, messageType, flowType, sourceHandleId, targetHandleId, revision, instrument, topic) => {
          const transitionId = uuidv4();
          set((state) => {
            const project = state.projects.find(p => p.id === state.activeProjectId);
            if (!project) return;
            
            const topicData = project.topics.find(t => t.topic.id === topicId);
            if (topicData) {
              const fromState = topicData.states.find(s => s.id === from);
              const toState = topicData.states.find(s => s.id === to);
              const kind = deriveTransitionKind(fromState, toState);
              
              topicData.transitions.push({
                id: transitionId,
                from,
                to,
                kind,
                messageType,
                flowType,
                sourceHandleId,
                targetHandleId,
                revision,
                instrument,
                topic,
              });
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
        
        selectElement: (elementId, elementType) => set((state) => {
          state.selectedElementId = elementId;
          state.selectedElementType = elementType;
        }),
        
        setViewMode: (mode) => set((state) => {
          state.viewMode = mode;
        }),
        
        updateFieldConfig: (config) => set((state) => {
          Object.assign(state.fieldConfig, config);
        }),
        
        exportProject: () => {
          const state = get();
          const project = state.projects.find(p => p.id === state.activeProjectId);
          return project ? JSON.stringify(project, null, 2) : '';
        },
        
        importProject: (json) => {
          try {
            const project = JSON.parse(json) as DiagramProject;
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
        
        resetProject: () => set((state) => {
          // Reset to empty workspace
          state.projects = [];
          state.activeProjectId = null;
          state.selectedElementId = null;
          state.selectedElementType = null;
        }),
      };
    }),
    {
      name: 'diagram-workspace', // Fresh key to avoid old corrupted state
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        selectedElementId: state.selectedElementId,
        selectedElementType: state.selectedElementType,
        viewMode: state.viewMode,
        fieldConfig: state.fieldConfig,
      }),
      onRehydrateStorage: () => (state) => {
        // Fix up any inconsistent state after rehydration
        if (state) {
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
