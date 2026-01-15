import type { DiagramProject, TopicData, ValidationIssue, RESERVED_NODE_NAMES } from '@/types/diagram';
import { v4 as uuidv4 } from 'uuid';

const RESERVED_NAMES: readonly string[] = [
  'Start', 'End', 'NewInstrument', 'InstrumentEnd', 'NewTopicIn', 'NewTopicOut', 
  'TopicStart', 'TopicEnd'
];

const VALID_ID_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateProject(project: DiagramProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate instrument
  if (!project.instrument.id || project.instrument.id.trim() === '') {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Instrument ID is required',
    });
  } else if (!VALID_ID_REGEX.test(project.instrument.id)) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Instrument ID "${project.instrument.id}" contains invalid characters`,
    });
  }

  // Validate each topic
  project.topics.forEach((topicData) => {
    issues.push(...validateTopic(topicData, project.instrument.id));
  });

  // Check for exactly one root topic (warning if none)
  const rootTopics = project.topics.filter(t => t.topic.kind === 'root');
  if (project.topics.length > 0 && rootTopics.length === 0) {
    issues.push({
      id: uuidv4(),
      level: 'warning',
      message: 'No root topic defined. One topic should be marked as root for instrument aggregate diagram.',
    });
  }

  return issues;
}

function validateTopic(topicData: TopicData, instrumentId: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { topic, states, transitions } = topicData;

  // Validate topic ID
  if (!topic.id || topic.id.trim() === '') {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Topic ID is required',
      topicId: topic.id,
    });
  } else if (!VALID_ID_REGEX.test(topic.id)) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Topic ID "${topic.id}" contains invalid characters`,
      topicId: topic.id,
    });
  }

  // Validate state IDs
  states.forEach((state) => {
    if (!state.isSystemNode) {
      if (!state.id || state.id.trim() === '') {
        issues.push({
          id: uuidv4(),
          level: 'error',
          message: 'State ID is required',
          topicId: topic.id,
          elementId: state.id,
          elementType: 'state',
        });
      } else if (!VALID_ID_REGEX.test(state.id)) {
        issues.push({
          id: uuidv4(),
          level: 'error',
          message: `State ID "${state.id}" contains invalid characters`,
          topicId: topic.id,
          elementId: state.id,
          elementType: 'state',
        });
      } else if (RESERVED_NAMES.includes(state.id)) {
        issues.push({
          id: uuidv4(),
          level: 'error',
          message: `State ID "${state.id}" is a reserved name`,
          topicId: topic.id,
          elementId: state.id,
          elementType: 'state',
        });
      }
    }
  });

  // Check for required start transitions
  const startNodeId = topic.kind === 'root' ? 'NewInstrument' : 'TopicStart';
  const hasStartTransition = transitions.some(t => t.from === startNodeId);
  if (!hasStartTransition) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Topic "${topic.id}" must have at least one transition from ${startNodeId}`,
      topicId: topic.id,
    });
  }

  // Check for path to TopicEnd (simplified check - at least one transition to TopicEnd)
  const hasEndTransition = transitions.some(t => t.to === 'TopicEnd');
  if (!hasEndTransition) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Topic "${topic.id}" must have at least one path to TopicEnd`,
      topicId: topic.id,
    });
  }

  // Validate transitions
  transitions.forEach((transition) => {
    const fromState = states.find(s => s.id === transition.from);
    const toState = states.find(s => s.id === transition.to);

    if (!fromState) {
      issues.push({
        id: uuidv4(),
        level: 'error',
        message: `Transition "${transition.id}" has invalid source state "${transition.from}"`,
        topicId: topic.id,
        elementId: transition.id,
        elementType: 'transition',
      });
    }

    if (!toState) {
      issues.push({
        id: uuidv4(),
        level: 'error',
        message: `Transition "${transition.id}" has invalid target state "${transition.to}"`,
        topicId: topic.id,
        elementId: transition.id,
        elementType: 'transition',
      });
    }

    // Validate transition kinds
    if (transition.kind === 'startTopic' && transition.from !== 'TopicStart') {
      issues.push({
        id: uuidv4(),
        level: 'error',
        message: `startTopic transition must originate from TopicStart`,
        topicId: topic.id,
        elementId: transition.id,
        elementType: 'transition',
      });
    }

    if (transition.kind === 'startInstrument' && transition.from !== 'NewInstrument') {
      issues.push({
        id: uuidv4(),
        level: 'error',
        message: `startInstrument transition must originate from NewInstrument`,
        topicId: topic.id,
        elementId: transition.id,
        elementType: 'transition',
      });
    }

    if (transition.kind === 'endTopic' && transition.to !== 'TopicEnd') {
      issues.push({
        id: uuidv4(),
        level: 'error',
        message: `endTopic transition must end at TopicEnd`,
        topicId: topic.id,
        elementId: transition.id,
        elementType: 'transition',
      });
    }
  });

  // Check for orphan states (warning)
  states.forEach((state) => {
    if (!state.isSystemNode) {
      const hasIncoming = transitions.some(t => t.to === state.id);
      const hasOutgoing = transitions.some(t => t.from === state.id);
      if (!hasIncoming && !hasOutgoing) {
        issues.push({
          id: uuidv4(),
          level: 'warning',
          message: `State "${state.id}" is orphaned (no connections)`,
          topicId: topic.id,
          elementId: state.id,
          elementType: 'state',
        });
      }
    }
  });

  // Check for unreachable states (warning)
  const reachableFromStart = new Set<string>();
  const startNode = startNodeId;
  const queue = [startNode];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachableFromStart.has(current)) continue;
    reachableFromStart.add(current);
    transitions.filter(t => t.from === current).forEach(t => queue.push(t.to));
  }

  states.forEach((state) => {
    if (!state.isSystemNode && !reachableFromStart.has(state.id)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `State "${state.id}" is unreachable from start`,
        topicId: topic.id,
        elementId: state.id,
        elementType: 'state',
      });
    }
  });

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some(issue => issue.level === 'error');
}
