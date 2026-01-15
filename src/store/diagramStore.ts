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
  TransitionKind,
  FlowType,
  Position 
} from '@/types/diagram';
import { deriveTransitionKind } from '@/types/diagram';

interface DiagramState {
  project: DiagramProject;
  selectedElementId: string | null;
  selectedElementType: 'state' | 'transition' | null;
  viewMode: 'topic' | 'aggregate';
  
  // Actions
  setProject: (project: DiagramProject) => void;
  updateProjectName: (name: string) => void;
  updateInstrument: (instrument: Partial<Instrument>) => void;
  
  // Topic actions
  createTopic: (id: string, kind: TopicKind, label?: string) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  deleteTopic: (topicId: string) => void;
  selectTopic: (topicId: string) => void;
  setRootTopic: (topicId: string) => void;
  
  // State actions
  addState: (topicId: string, id: string, label?: string, position?: Position) => void;
  addInstrumentEnd: (topicId: string) => void;
  addTopicEnd: (topicId: string) => void;
  updateState: (topicId: string, stateId: string, updates: Partial<StateNode>) => void;
  deleteState: (topicId: string, stateId: string) => void;
  updateStatePosition: (topicId: string, stateId: string, position: Position) => void;
  
  // Transition actions
  addTransition: (topicId: string, from: string, to: string, messageType: string, flowType: FlowType, sourceHandleId?: string, targetHandleId?: string) => string;
  updateTransition: (topicId: string, transitionId: string, updates: Partial<Omit<Transition, 'kind'>>) => void;
  deleteTransition: (topicId: string, transitionId: string) => void;
  updateTransitionRouting: (topicId: string, transitionId: string, sourceHandleId?: string, targetHandleId?: string, curveOffset?: number) => void;
  
  // Selection
  selectElement: (elementId: string | null, elementType: 'state' | 'transition' | null) => void;
  
  // View mode
  setViewMode: (mode: 'topic' | 'aggregate') => void;
  
  // Import/Export
  exportProject: () => string;
  importProject: (json: string) => boolean;
  resetProject: () => void;
}

const createSampleProject = (): DiagramProject => {
  const projectId = uuidv4();
  return {
    id: projectId,
    name: 'Payment Processing',
    instrument: { id: 'pacs_008', label: 'PACS 008 Payment' },
    topics: [
      {
        topic: { id: 'Release', label: 'Payment Release', kind: 'root' },
        states: [
          {
            id: 'NewInstrument',
            label: 'New Instrument',
            stereotype: 'NewInstrument',
            position: { x: 250, y: 50 },
            isSystemNode: true,
            systemNodeType: 'NewInstrument',
          },
          {
            id: 'TopicEnd',
            label: 'Topic End',
            stereotype: 'End',
            position: { x: 250, y: 400 },
            isSystemNode: true,
            systemNodeType: 'TopicEnd',
          },
          {
            id: 'InstrumentEnd',
            label: 'Instrument End',
            stereotype: 'End',
            position: { x: 500, y: 400 },
            isSystemNode: true,
            systemNodeType: 'InstrumentEnd',
          },
          {
            id: 'Submitted',
            label: 'Submitted',
            stereotype: 'Submitted',
            position: { x: 250, y: 150 },
            isSystemNode: false,
          },
          {
            id: 'Validated',
            label: 'Validated',
            stereotype: 'Validated',
            position: { x: 250, y: 250 },
            isSystemNode: false,
          },
          {
            id: 'Rejected',
            label: 'Rejected',
            stereotype: 'Rejected',
            position: { x: 450, y: 200 },
            isSystemNode: false,
          },
        ],
        transitions: [
          { id: uuidv4(), from: 'NewInstrument', to: 'Submitted', kind: 'startInstrument', messageType: 'pacs.008', flowType: 'B2B', sourceHandleId: 'source-bottom', targetHandleId: 'target-top' },
          { id: uuidv4(), from: 'Submitted', to: 'Validated', kind: 'normal', messageType: 'validate', flowType: 'B2B', sourceHandleId: 'source-bottom', targetHandleId: 'target-top' },
          { id: uuidv4(), from: 'Submitted', to: 'Rejected', kind: 'normal', messageType: 'reject', flowType: 'B2B', sourceHandleId: 'source-right', targetHandleId: 'target-left' },
          { id: uuidv4(), from: 'Validated', to: 'TopicEnd', kind: 'endTopic', messageType: '', flowType: 'B2B', sourceHandleId: 'source-bottom', targetHandleId: 'target-top' },
          { id: uuidv4(), from: 'Rejected', to: 'InstrumentEnd', kind: 'endInstrument', messageType: '', flowType: 'B2B', sourceHandleId: 'source-bottom', targetHandleId: 'target-top' },
        ],
      },
    ],
    selectedTopicId: 'Release',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const createDefaultProject = (): DiagramProject => createSampleProject();

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

export const useDiagramStore = create<DiagramState>()(
  persist(
    immer((set, get) => ({
      project: createDefaultProject(),
      selectedElementId: null,
      selectedElementType: null,
      viewMode: 'topic',

      setProject: (project) => set({ project }),
      
      updateProjectName: (name) => set((state) => {
        state.project.name = name;
        state.project.updatedAt = new Date().toISOString();
      }),
      
      updateInstrument: (instrument) => set((state) => {
        state.project.instrument = { ...state.project.instrument, ...instrument };
        state.project.updatedAt = new Date().toISOString();
      }),
      
      createTopic: (id, kind, label) => set((state) => {
        const existingRoot = state.project.topics.find(t => t.topic.kind === 'root');
        if (kind === 'root' && existingRoot) {
          // Change existing root to normal
          existingRoot.topic.kind = 'normal';
          // Update system nodes for the existing root
          const startNode = existingRoot.states.find(s => s.systemNodeType === 'NewInstrument');
          if (startNode) {
            startNode.id = 'TopicStart';
            startNode.label = 'Topic Start';
            startNode.stereotype = 'Start';
            startNode.systemNodeType = 'TopicStart';
          }
        }
        
        const topicData: TopicData = {
          topic: { id, kind, label },
          states: createSystemNodes(kind),
          transitions: [],
        };
        state.project.topics.push(topicData);
        state.project.selectedTopicId = id;
        state.project.updatedAt = new Date().toISOString();
      }),
      
      updateTopic: (topicId, updates) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          Object.assign(topicData.topic, updates);
          state.project.updatedAt = new Date().toISOString();
        }
      }),
      
      deleteTopic: (topicId) => set((state) => {
        state.project.topics = state.project.topics.filter(t => t.topic.id !== topicId);
        if (state.project.selectedTopicId === topicId) {
          state.project.selectedTopicId = state.project.topics[0]?.topic.id ?? null;
        }
        state.project.updatedAt = new Date().toISOString();
      }),
      
      selectTopic: (topicId) => set((state) => {
        state.project.selectedTopicId = topicId;
        state.selectedElementId = null;
        state.selectedElementType = null;
      }),
      
      setRootTopic: (topicId) => set((state) => {
        state.project.topics.forEach(t => {
          if (t.topic.id === topicId) {
            t.topic.kind = 'root';
            // Update system nodes and reassign transitions
            const startNode = t.states.find(s => s.systemNodeType === 'TopicStart');
            if (startNode) {
              const oldId = startNode.id;
              startNode.id = 'NewInstrument';
              startNode.label = 'New Instrument';
              startNode.stereotype = 'NewInstrument';
              startNode.systemNodeType = 'NewInstrument';
              // Reassign transitions
              t.transitions.forEach(tr => {
                if (tr.from === oldId) tr.from = 'NewInstrument';
                if (tr.to === oldId) tr.to = 'NewInstrument';
              });
              // Recalculate kinds
              t.transitions.forEach(tr => {
                const fromState = t.states.find(s => s.id === tr.from);
                const toState = t.states.find(s => s.id === tr.to);
                tr.kind = deriveTransitionKind(fromState, toState);
              });
            }
          } else if (t.topic.kind === 'root') {
            t.topic.kind = 'normal';
            const startNode = t.states.find(s => s.systemNodeType === 'NewInstrument');
            if (startNode) {
              const oldId = startNode.id;
              startNode.id = 'TopicStart';
              startNode.label = 'Topic Start';
              startNode.stereotype = 'Start';
              startNode.systemNodeType = 'TopicStart';
              // Reassign transitions
              t.transitions.forEach(tr => {
                if (tr.from === oldId) tr.from = 'TopicStart';
                if (tr.to === oldId) tr.to = 'TopicStart';
              });
              // Recalculate kinds
              t.transitions.forEach(tr => {
                const fromState = t.states.find(s => s.id === tr.from);
                const toState = t.states.find(s => s.id === tr.to);
                tr.kind = deriveTransitionKind(fromState, toState);
              });
            }
          }
        });
        state.project.updatedAt = new Date().toISOString();
      }),
      
      addState: (topicId, id, label, position) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          const newState: StateNode = {
            id,
            label,
            stereotype: id,
            position: position ?? { x: 250, y: 200 },
            isSystemNode: false,
          };
          topicData.states.push(newState);
          state.project.updatedAt = new Date().toISOString();
        }
      }),

      addInstrumentEnd: (topicId) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          // Check if InstrumentEnd already exists
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
            state.project.updatedAt = new Date().toISOString();
          }
        }
      }),

      addTopicEnd: (topicId) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          // Check if TopicEnd already exists
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
            state.project.updatedAt = new Date().toISOString();
          }
        }
      }),
      
      updateState: (topicId, stateId, updates) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          const stateNode = topicData.states.find(s => s.id === stateId);
          if (stateNode && !stateNode.isSystemNode) {
            Object.assign(stateNode, updates);
            state.project.updatedAt = new Date().toISOString();
          }
        }
      }),
      
      deleteState: (topicId, stateId) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          const stateNode = topicData.states.find(s => s.id === stateId);
          // Allow deleting InstrumentEnd if TopicEnd exists
          // TopicEnd cannot be deleted - topic should always have a path to proper end
          const isInstrumentEnd = stateNode?.systemNodeType === 'InstrumentEnd';
          const hasTopicEnd = topicData.states.some(s => s.systemNodeType === 'TopicEnd');
          
          // InstrumentEnd can be deleted only if TopicEnd exists
          // TopicEnd can never be deleted
          // Start nodes (TopicStart, NewInstrument) can never be deleted
          const canDeleteSystemNode = isInstrumentEnd && hasTopicEnd;
          
          if (stateNode && (!stateNode.isSystemNode || canDeleteSystemNode)) {
            topicData.states = topicData.states.filter(s => s.id !== stateId);
            topicData.transitions = topicData.transitions.filter(
              t => t.from !== stateId && t.to !== stateId
            );
            state.project.updatedAt = new Date().toISOString();
          }
        }
      }),
      
      updateStatePosition: (topicId, stateId, position) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          const stateNode = topicData.states.find(s => s.id === stateId);
          if (stateNode) {
            stateNode.position = position;
            state.project.updatedAt = new Date().toISOString();
          }
        }
      }),
      
      addTransition: (topicId, from, to, messageType, flowType, sourceHandleId, targetHandleId) => {
        let transitionId = '';
        set((state) => {
          const topicData = state.project.topics.find(t => t.topic.id === topicId);
          if (topicData) {
            const fromState = topicData.states.find(s => s.id === from);
            const toState = topicData.states.find(s => s.id === to);
            const kind = deriveTransitionKind(fromState, toState);
            
            transitionId = uuidv4();
            const transition: Transition = {
              id: transitionId,
              from,
              to,
              kind,
              messageType,
              flowType,
              sourceHandleId: sourceHandleId || 'source-bottom',
              targetHandleId: targetHandleId || 'target-top',
            };
            topicData.transitions.push(transition);
            state.project.updatedAt = new Date().toISOString();
          }
        });
        return transitionId;
      },
      
      updateTransition: (topicId, transitionId, updates) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          const transition = topicData.transitions.find(t => t.id === transitionId);
          if (transition) {
            // Apply updates but recalculate kind if from/to changed
            const { from, to, ...otherUpdates } = updates;
            Object.assign(transition, otherUpdates);
            
            if (from !== undefined) transition.from = from;
            if (to !== undefined) transition.to = to;
            
            // Recalculate kind based on connected states
            const fromState = topicData.states.find(s => s.id === transition.from);
            const toState = topicData.states.find(s => s.id === transition.to);
            transition.kind = deriveTransitionKind(fromState, toState);
            
            state.project.updatedAt = new Date().toISOString();
          }
        }
      }),
      
      deleteTransition: (topicId, transitionId) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          topicData.transitions = topicData.transitions.filter(t => t.id !== transitionId);
          state.project.updatedAt = new Date().toISOString();
        }
      }),

      updateTransitionRouting: (topicId, transitionId, sourceHandleId, targetHandleId, curveOffset) => set((state) => {
        const topicData = state.project.topics.find(t => t.topic.id === topicId);
        if (topicData) {
          const transition = topicData.transitions.find(t => t.id === transitionId);
          if (transition) {
            if (sourceHandleId !== undefined) transition.sourceHandleId = sourceHandleId;
            if (targetHandleId !== undefined) transition.targetHandleId = targetHandleId;
            if (curveOffset !== undefined) transition.curveOffset = curveOffset;
            state.project.updatedAt = new Date().toISOString();
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
      
      exportProject: () => {
        return JSON.stringify(get().project, null, 2);
      },
      
      importProject: (json) => {
        try {
          const project = JSON.parse(json) as DiagramProject;
          set({ project, selectedElementId: null, selectedElementType: null });
          return true;
        } catch {
          return false;
        }
      },
      
      resetProject: () => set({
        project: createDefaultProject(),
        selectedElementId: null,
        selectedElementType: null,
        viewMode: 'topic',
      }),
    })),
    {
      name: 'diagram-project',
    }
  )
);
