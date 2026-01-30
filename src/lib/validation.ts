import type { DiagramProject, TopicData, ValidationIssue, Transition } from '@/types/diagram';
import { isRoutingOnlyTransition, labelToEnumId } from '@/types/diagram';
import type { FieldConfig } from '@/types/fieldConfig';
import { v4 as uuidv4 } from 'uuid';

const RESERVED_NAMES: readonly string[] = [
  'Start', 'End', 'NewInstrument', 'InstrumentEnd', 'NewTopicIn', 'NewTopicOut', 
  'TopicStart', 'TopicEnd'
];

// Java enum naming convention: starts with letter, only letters/numbers/underscores
const JAVA_ENUM_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export function isValidEnumName(value: string): boolean {
  return JAVA_ENUM_PATTERN.test(value);
}

export function validateProject(project: DiagramProject, fieldConfig?: FieldConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate instrument type
  if (!project.instrument.type || project.instrument.type.trim() === '') {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Instrument type is required',
    });
  } else if (!isValidEnumName(project.instrument.type)) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Instrument type "${project.instrument.type}" must follow Java enum naming (letters, numbers, underscores only)`,
    });
  } else if (fieldConfig?.instrumentTypes && fieldConfig.instrumentTypes.length > 0) {
    if (!fieldConfig.instrumentTypes.includes(project.instrument.type)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Instrument type "${project.instrument.type}" is not in configured instrument types`,
      });
    }
  }

  // Validate instrument revision (required)
  if (!project.instrument.revision || project.instrument.revision.trim() === '') {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Instrument revision is required',
    });
  } else if (!isValidEnumName(project.instrument.revision)) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Instrument revision "${project.instrument.revision}" must follow Java enum naming`,
    });
  } else if (fieldConfig?.revisions && fieldConfig.revisions.length > 0) {
    if (!fieldConfig.revisions.includes(project.instrument.revision)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Instrument revision "${project.instrument.revision}" is not in configured revisions`,
      });
    }
  }

  // Validate each topic
  project.topics.forEach((topicData) => {
    issues.push(...validateTopic(topicData, project.instrument.type, fieldConfig));
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

function validateTopic(topicData: TopicData, instrumentType: string, fieldConfig?: FieldConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { topic, states, transitions } = topicData;
  const isTopicEndState = (state: { systemNodeType?: string; isTopicEnd?: boolean } | undefined) =>
    state?.systemNodeType === 'TopicEnd' || state?.isTopicEnd;

  // Validate topic ID
  if (!topic.id || topic.id.trim() === '') {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Topic ID is required',
      topicId: topic.id,
    });
  } else if (!isValidEnumName(topic.id)) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Topic ID "${topic.id}" must follow Java enum naming (letters, numbers, underscores only)`,
      topicId: topic.id,
    });
  } else if (RESERVED_NAMES.includes(topic.id)) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Topic ID "${topic.id}" is a reserved name`,
      topicId: topic.id,
    });
  } else if (fieldConfig?.topicTypes && fieldConfig.topicTypes.length > 0) {
    if (!fieldConfig.topicTypes.includes(topic.id)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Topic ID "${topic.id}" is not in configured topic types`,
        topicId: topic.id,
      });
    }
  }

  // Validate state labels (what becomes PUML IDs)
  states.forEach((state) => {
    if (!state.isSystemNode) {
      if (!state.label || state.label.trim() === '') {
        issues.push({
          id: uuidv4(),
          level: 'error',
          message: 'State label is required',
          topicId: topic.id,
          elementId: state.id,
          elementType: 'state',
        });
      } else {
        // Convert label to check what the PUML ID will be
        const pumlId = labelToEnumId(state.label);
        if (!isValidEnumName(pumlId)) {
          issues.push({
            id: uuidv4(),
            level: 'warning',
            message: `State label "${state.label}" converts to invalid PUML ID "${pumlId}"`,
            topicId: topic.id,
            elementId: state.id,
            elementType: 'state',
          });
        } else if (RESERVED_NAMES.includes(pumlId)) {
          issues.push({
            id: uuidv4(),
            level: 'error',
            message: `State label "${state.label}" converts to reserved name "${pumlId}"`,
            topicId: topic.id,
            elementId: state.id,
            elementType: 'state',
          });
        }
      }
    }
  });

  // Check for required start transitions
  const startNodeId = topic.kind === 'root' ? 'NewInstrument' : 'TopicStart';
  const hasStartTransition = transitions.some(
    t => {
      if (t.from !== startNodeId) return false;
      const targetState = states.find(s => s.id === t.to);
      if (targetState?.systemNodeType !== 'Fork') {
        return true;
      }
      return transitions.some(
        forkTransition =>
          forkTransition.from === t.to &&
          states.find(s => s.id === forkTransition.to)?.systemNodeType !== 'Fork'
      );
    }
  );
  if (!hasStartTransition) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: `Topic "${topic.id}" must have at least one transition from ${startNodeId}`,
      topicId: topic.id,
    });
  }

  // Check for path to an end-topic state (simplified check - at least one transition to end topic)
  const hasEndTransition = transitions.some(
    t => {
      const targetState = states.find(s => s.id === t.to);
      if (!isTopicEndState(targetState)) return false;
      const sourceState = states.find(s => s.id === t.from);
      if (sourceState?.systemNodeType !== 'Fork') {
        return true;
      }
      return transitions.some(
        forkTransition =>
          forkTransition.to === t.from &&
          states.find(s => s.id === forkTransition.from)?.systemNodeType !== 'Fork'
      );
    }
  );
  if (!hasEndTransition) {
    issues.push({
      id: uuidv4(),
      level: 'warning',
      message: `Topic "${topic.id}" should have at least one path to an end-topic state`,
      topicId: topic.id,
    });
  }

  // Validate transitions
  transitions.forEach((transition) => {
    const fromState = states.find(s => s.id === transition.from);
    const toState = states.find(s => s.id === transition.to);
    const isForkTransition = isRoutingOnlyTransition(transition, toState);

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

    if (transition.kind === 'endTopic' && !isTopicEndState(toState)) {
      issues.push({
        id: uuidv4(),
        level: 'error',
        message: `endTopic transition must end at a TopicEnd or marked end-topic state`,
        topicId: topic.id,
        elementId: transition.id,
        elementType: 'transition',
      });
    }

    // Validate transition field values against config (only for non-end transitions)
    if (transition.kind !== 'endTopic' && transition.kind !== 'endInstrument') {
      issues.push(...validateTransitionFields(transition, topic.id, fieldConfig, isForkTransition));
    }
  });

  // Warn about forks without incoming or outgoing transitions
  states
    .filter(state => state.systemNodeType === 'Fork')
    .forEach((forkState) => {
      const hasIncoming = transitions.some(t => t.to === forkState.id);
      const hasOutgoing = transitions.some(t => t.from === forkState.id);

      if (!hasIncoming) {
        issues.push({
          id: uuidv4(),
          level: 'warning',
          message: `Fork "${forkState.label}" has no incoming transitions (no effective expansion)`,
          topicId: topic.id,
          elementId: forkState.id,
          elementType: 'state',
        });
      }

      if (!hasOutgoing) {
        issues.push({
          id: uuidv4(),
          level: 'warning',
          message: `Fork "${forkState.label}" has no outgoing transitions (no effective expansion)`,
          topicId: topic.id,
          elementId: forkState.id,
          elementType: 'state',
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
          message: `State "${state.label}" is orphaned (no connections)`,
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
        message: `State "${state.label}" is unreachable from start`,
        topicId: topic.id,
        elementId: state.id,
        elementType: 'state',
      });
    }
  });

  return issues;
}

function validateTransitionFields(transition: Transition, topicId: string, fieldConfig: FieldConfig | undefined, isRoutingOnly: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate revision field
  if (transition.revision) {
    if (!isValidEnumName(transition.revision)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Transition revision "${transition.revision}" must follow Java enum naming`,
        topicId,
        elementId: transition.id,
        elementType: 'transition',
      });
    } else if (fieldConfig?.revisions && fieldConfig.revisions.length > 0) {
      if (!fieldConfig.revisions.includes(transition.revision)) {
        issues.push({
          id: uuidv4(),
          level: 'warning',
          message: `Transition revision "${transition.revision}" is not in configured revisions`,
          topicId,
          elementId: transition.id,
          elementType: 'transition',
        });
      }
    }
  }

  // Validate instrument field
  if (transition.instrument) {
    if (!isValidEnumName(transition.instrument)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Transition instrument "${transition.instrument}" must follow Java enum naming`,
        topicId,
        elementId: transition.id,
        elementType: 'transition',
      });
    } else if (fieldConfig?.instrumentTypes && fieldConfig.instrumentTypes.length > 0) {
      if (!fieldConfig.instrumentTypes.includes(transition.instrument)) {
        issues.push({
          id: uuidv4(),
          level: 'warning',
          message: `Transition instrument "${transition.instrument}" is not in configured instrument types`,
          topicId,
          elementId: transition.id,
          elementType: 'transition',
        });
      }
    }
  }

  // Validate topic field
  if (transition.topic) {
    if (!isValidEnumName(transition.topic)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Transition topic "${transition.topic}" must follow Java enum naming`,
        topicId,
        elementId: transition.id,
        elementType: 'transition',
      });
    } else if (fieldConfig?.topicTypes && fieldConfig.topicTypes.length > 0) {
      if (!fieldConfig.topicTypes.includes(transition.topic)) {
        issues.push({
          id: uuidv4(),
          level: 'warning',
          message: `Transition topic "${transition.topic}" is not in configured topic types`,
          topicId,
          elementId: transition.id,
          elementType: 'transition',
        });
      }
    }
  }

  // Validate messageType field (required)
  if (!isRoutingOnly && (!transition.messageType || transition.messageType.trim() === '')) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Transition messageType is required',
      topicId,
      elementId: transition.id,
      elementType: 'transition',
    });
  } else if (transition.messageType && !isValidEnumName(transition.messageType)) {
    issues.push({
      id: uuidv4(),
      level: 'warning',
      message: `Transition messageType "${transition.messageType}" must follow Java enum naming`,
      topicId,
      elementId: transition.id,
      elementType: 'transition',
    });
  } else if (transition.messageType && fieldConfig?.messageTypes && fieldConfig.messageTypes.length > 0) {
    if (!fieldConfig.messageTypes.includes(transition.messageType)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Transition messageType "${transition.messageType}" is not in configured message types`,
        topicId,
        elementId: transition.id,
        elementType: 'transition',
      });
    }
  }

  // Validate flowType field (required)
  if (!isRoutingOnly && (!transition.flowType || transition.flowType.trim() === '')) {
    issues.push({
      id: uuidv4(),
      level: 'error',
      message: 'Transition flowType is required',
      topicId,
      elementId: transition.id,
      elementType: 'transition',
    });
  } else if (transition.flowType && !isValidEnumName(transition.flowType)) {
    issues.push({
      id: uuidv4(),
      level: 'warning',
      message: `Transition flowType "${transition.flowType}" must follow Java enum naming`,
      topicId,
      elementId: transition.id,
      elementType: 'transition',
    });
  } else if (transition.flowType && fieldConfig?.flowTypes && fieldConfig.flowTypes.length > 0) {
    if (!fieldConfig.flowTypes.includes(transition.flowType)) {
      issues.push({
        id: uuidv4(),
        level: 'warning',
        message: `Transition flowType "${transition.flowType}" is not in configured flow types`,
        topicId,
        elementId: transition.id,
        elementType: 'transition',
      });
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some(issue => issue.level === 'error');
}
