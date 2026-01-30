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
  | 'InstrumentEnd'
  | 'Fork';

export type TopicEndKind = 'positive' | 'negative';

export const RESERVED_NODE_NAMES = [
  'Start', 'End', 'NewInstrument', 'InstrumentEnd', 'NewTopicIn', 'NewTopicOut', 
  'TopicStart', 'TopicEnd', 'Fork'
] as const;

export interface Position {
  x: number;
  y: number;
}

export interface Instrument {
  type: string;          // User-facing instrument type (e.g., "pacs_008")
  revision: string;      // Required - from revisions config or free string
  label?: string;        // Optional human-friendly name
  description?: string;  // Optional description for gallery display
}

// Convert a label to Java enum-style identifier for PUML export
export function labelToEnumId(label: string): string {
  if (!label || !label.trim()) return 'STATE';
  return label
    .trim()
    .replace(/[^a-zA-Z0-9_\s]/g, '')  // Remove special chars
    .replace(/\s+/g, '_')              // Spaces to underscores
    .replace(/^(\d)/, '_$1')           // Prefix if starts with digit
    .toUpperCase() || 'STATE';
}

export interface Topic {
  id: string;
  label?: string;
  kind: TopicKind;
}

export interface StateNode {
  id: string;              // Internal UUID (auto-generated, hidden from user)
  label: string;           // User-facing label (required)
  stereotype?: string;
  position: Position;
  isSystemNode: boolean;
  systemNodeType?: SystemNodeType;
  topicEndKind?: TopicEndKind;
}

export interface Transition {
  id: string;
  from: string; // state id
  to: string;   // state id
  kind: TransitionKind;
  isRoutingOnly?: boolean;
  endTopicKind?: TopicEndKind;
  teleportEnabled?: boolean;
  // Message properties
  revision?: string; // R1, R2, R3 - optional
  instrument?: string; // optional
  topic?: string; // optional
  messageType?: string;
  flowType?: FlowType;
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

export function isRoutingOnlyTransition(transition: Transition, toState?: StateNode): boolean {
  if (toState) {
    return toState.systemNodeType === 'Fork';
  }
  return transition.isRoutingOnly ?? false;
}

export function getTopicEndKind(state?: StateNode): TopicEndKind | undefined {
  if (!state) return undefined;
  if (Object.prototype.hasOwnProperty.call(state, 'topicEndKind')) {
    return state.topicEndKind ?? 'positive';
  }
  return undefined;
}

export function isTopicEndState(state?: StateNode): boolean {
  return getTopicEndKind(state) !== undefined;
}
