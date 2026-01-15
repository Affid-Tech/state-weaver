// Core domain types for the state machine diagram editor

export type TopicKind = 'root' | 'normal';

export type TransitionKind = 
  | 'normal' 
  | 'startTopic' 
  | 'endTopic' 
  | 'startInstrument' 
  | 'endInstrument';

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
  label?: string;
  kind: TransitionKind;
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
