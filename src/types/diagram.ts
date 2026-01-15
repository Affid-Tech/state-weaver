// Core domain types for the state machine diagram editor

export type TopicKind = 'root' | 'normal';

export type TransitionKind = 
  | 'normal' 
  | 'startTopic' 
  | 'endTopic' 
  | 'startInstrument' 
  | 'endInstrument';

export type FlowType = 'B2B' | 'B2C' | 'C2B' | 'C2C';

export type SystemNodeType = 
  | 'TopicStart' 
  | 'TopicEnd' 
  | 'NewInstrument' 
  | 'InstrumentEnd';

export const RESERVED_NODE_NAMES = [
  'Start', 'End', 'NewInstrument', 'InstrumentEnd', 'NewTopicIn', 'NewTopicOut', 
  'TopicStart', 'TopicEnd'
] as const;

export interface Position {
  x: number;
  y: number;
}

export interface Instrument {
  id: string;
  label?: string;
}

export interface Topic {
  id: string;
  label?: string;
  kind: TopicKind;
}

export interface StateNode {
  id: string;
  label?: string;
  stereotype?: string;
  position: Position;
  isSystemNode: boolean;
  systemNodeType?: SystemNodeType;
}

export interface Transition {
  id: string;
  from: string; // state id
  to: string;   // state id
  kind: TransitionKind;
  // Message properties
  revision?: string; // R1, R2, R3 - optional
  instrument?: string; // optional
  topic?: string; // optional
  messageType: string; // required
  flowType: FlowType; // required
  // Edge routing properties (persisted)
  sourceHandleId?: string; // which handle on source node
  targetHandleId?: string; // which handle on target node
  curveOffset?: number; // manual curve offset set by user
}

export interface TopicData {
  topic: Topic;
  states: StateNode[];
  transitions: Transition[];
}

export interface DiagramProject {
  id: string;
  name: string;
  instrument: Instrument;
  topics: TopicData[];
  selectedTopicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ValidationLevel = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  level: ValidationLevel;
  message: string;
  topicId?: string;
  elementId?: string; // state or transition id
  elementType?: 'state' | 'transition';
}

// Helper to derive transition kind from connected states
export function deriveTransitionKind(
  fromState: StateNode | undefined,
  toState: StateNode | undefined
): TransitionKind {
  if (!fromState || !toState) return 'normal';
  
  // Starting from NewInstrument
  if (fromState.systemNodeType === 'NewInstrument') {
    return 'startInstrument';
  }
  
  // Starting from TopicStart
  if (fromState.systemNodeType === 'TopicStart') {
    return 'startTopic';
  }
  
  // Ending at TopicEnd
  if (toState.systemNodeType === 'TopicEnd') {
    return 'endTopic';
  }
  
  // Ending at InstrumentEnd
  if (toState.systemNodeType === 'InstrumentEnd') {
    return 'endInstrument';
  }
  
  return 'normal';
}
