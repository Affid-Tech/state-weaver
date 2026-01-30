import type { DiagramProject, TopicData, StateNode, Transition, Instrument, Topic } from '@/types/diagram';
import { getTopicEndKind, isRoutingOnlyTransition, isTopicEndState, labelToEnumId } from '@/types/diagram';

const INLINE_STYLES = `skinparam state {
  BackgroundColor #F8FAFC
  BorderColor #CBD5E1
  FontColor #0F172A
  ArrowColor #64748B
}

skinparam state<<start>> {
  BackgroundColor #22C55E
  BorderColor #16A34A
  FontColor #FFFFFF
}

skinparam state<<end>> {
  BackgroundColor #EF4444
  BorderColor #DC2626
  FontColor #FFFFFF
}

skinparam state<<entryPoint>> {
  BackgroundColor #3B82F6
  BorderColor #2563EB
  FontColor #FFFFFF
}

skinparam state<<exitPoint>> {
  BackgroundColor #F59E0B
  BorderColor #D97706
  FontColor #FFFFFF
}

hide empty description`;

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}

const isTopicEndSystemNode = (state: StateNode | undefined): boolean =>
  state?.systemNodeType === 'TopicEnd';

// Get PUML-safe state ID from a StateNode
function getStateEnumId(state: StateNode): string {
  if (state.isSystemNode) {
    // System nodes keep their fixed IDs
    return state.id;
  }
  // User-created states derive ID from label
  return labelToEnumId(state.label);
}

/**
 * Generate transition label with inheritance rule:
 * All fields to the right of the most left optional filled field must be filled too.
 * If revision is specified, instrument and topic MUST be included (inherit from parent if not set).
 * If instrument is specified (but no revision), topic must follow.
 */
function getTransitionLabel(
  transition: Transition,
  instrument: Instrument,
  topic: Topic,
  toState?: StateNode
): string {
  // End transitions have no label
  if (
    transition.kind === 'endTopic'
    || transition.kind === 'endInstrument'
    || isRoutingOnlyTransition(transition, toState)
    || !transition.messageType
    || !transition.flowType
  ) {
    return '';
  }
  
  const parts: string[] = [];
  
  if (transition.revision) {
    // If revision is specified, instrument and topic MUST follow
    parts.push(transition.revision);
    parts.push(transition.instrument || instrument.type);
    parts.push(transition.topic || topic.id);
  } else if (transition.instrument) {
    // If instrument is specified (but no revision), topic must follow
    parts.push(transition.instrument);
    parts.push(transition.topic || topic.id);
  } else if (transition.topic) {
    // Only topic specified
    parts.push(transition.topic);
  }
  
  // MessageType and FlowType are always required
  parts.push(transition.messageType);
  parts.push(transition.flowType);
  
  return parts.join(' ');
}

type RenderTransition = {
  from: string;
  to: string;
  label: string;
};

function expandForkTransitions(
  states: StateNode[],
  transitions: Transition[],
  getLabel: (transition: Transition, toState?: StateNode) => string
): RenderTransition[] {
  const forkIds = new Set(states.filter(state => state.systemNodeType === 'Fork').map(state => state.id));
  const expandedTransitions: RenderTransition[] = [];
  const dedupe = new Set<string>();

  const findState = (stateId: string) => states.find(state => state.id === stateId);
  const addTransition = (from: string, to: string, label: string) => {
    if (forkIds.has(from) || forkIds.has(to)) return;
    const key = `${from}::${to}::${label}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    expandedTransitions.push({ from, to, label });
  };

  transitions
    .filter(transition => !forkIds.has(transition.from) && !forkIds.has(transition.to))
    .forEach((transition) => {
      const toState = findState(transition.to);
      addTransition(transition.from, transition.to, getLabel(transition, toState));
    });

  forkIds.forEach((forkId) => {
    const incoming = transitions.filter(transition => transition.to === forkId);
    const outgoing = transitions.filter(transition => transition.from === forkId);

    incoming.forEach((incomingTransition) => {
      outgoing.forEach((outgoingTransition) => {
        const toState = findState(outgoingTransition.to);
        addTransition(
          incomingTransition.from,
          outgoingTransition.to,
          getLabel(outgoingTransition, toState)
        );
      });
    });
  });

  return expandedTransitions;
}

function getTopicRenderTransitions(topicData: TopicData, instrument: Instrument): RenderTransition[] {
  return expandForkTransitions(
    topicData.states,
    topicData.transitions,
    (transition, toState) => getTransitionLabel(transition, instrument, topicData.topic, toState)
  );
}

export function generateTopicPuml(project: DiagramProject, topicId: string): string | null {
  const topicData = project.topics.find(t => t.topic.id === topicId);
  if (!topicData) return null;

  const { instrument } = project;
  const { topic, states } = topicData;
  const renderTransitions = getTopicRenderTransitions(topicData, instrument);
  const isRootTopic = topic.kind === 'root';
  const markedTopicEnds = states.filter((state) => getTopicEndKind(state) && !state.isSystemNode);
  const positiveMarkedTopicEnds = isRootTopic
    ? markedTopicEnds.filter((state) => getTopicEndKind(state) !== 'negative')
    : markedTopicEnds;
  const negativeMarkedTopicEnds = isRootTopic
    ? markedTopicEnds.filter((state) => getTopicEndKind(state) === 'negative')
    : [];
  const hasTopicEndNode = states.some((state) => state.systemNodeType === 'TopicEnd');
  const hasSyntheticTopicEnd = !hasTopicEndNode && positiveMarkedTopicEnds.length > 0;
  const hasNegativeRootTopicEnds = negativeMarkedTopicEnds.length > 0;

  const lines: string[] = [];
  lines.push('@startuml');
  lines.push('');
  lines.push(`' Topic: ${topic.label || topic.id}`);
  lines.push(`' Instrument: ${instrument.label || instrument.type}`);
  lines.push('');
  lines.push(INLINE_STYLES);
  lines.push('');

  // State declarations - InstrumentEnd and NewInstrument are declared at top level (outside topic)
  lines.push(`' --- States ---`);
  
  // Declare top-level states first (outside any container)
  const hasNewInstrument = states.some(s => s.systemNodeType === 'NewInstrument');
  const hasInstrumentEnd = states.some(s => s.systemNodeType === 'InstrumentEnd') || hasNegativeRootTopicEnds;
  
  if (hasNewInstrument) {
    lines.push(`state NewInstrument <<start>>`);
  }
  if (hasInstrumentEnd) {
    lines.push(`state EndInstrument <<end>>`);
  }
  if (hasNewInstrument || hasInstrumentEnd) {
    lines.push('');
  }

  // Regular states within topic
  states.forEach((state) => {
    const stateEnumId = getStateEnumId(state);
    const qualifiedId = `${instrument.type}.${topic.id}.${stateEnumId}`;
    
    if (state.systemNodeType === 'NewInstrument') {
      // Already declared at top level
    } else if (state.systemNodeType === 'Fork') {
      // Skip fork nodes (expanded in transitions)
    } else if (state.systemNodeType === 'TopicStart') {
      lines.push(`state ${instrument.type}.${topic.id}.Start as "Topic Start" <<entryPoint>>`);
    } else if (state.systemNodeType === 'TopicEnd') {
      lines.push(`state ${instrument.type}.${topic.id}.End as "Topic End" <<exitPoint>>`);
    } else if (state.systemNodeType === 'InstrumentEnd') {
      // Already declared at top level
    } else {
      const label = state.label;
      const stereotype = state.stereotype || stateEnumId;
      lines.push(`state "${escapeLabel(label)}" as ${qualifiedId} <<${stereotype}>>`);
    }
  });
  if (hasSyntheticTopicEnd) {
    lines.push(`state ${instrument.type}.${topic.id}.End as "Topic End" <<exitPoint>>`);
  }
  lines.push('');

  // Transitions
  lines.push(`' --- Transitions ---`);
  renderTransitions.forEach((transition) => {
    const fromState = states.find(s => s.id === transition.from);
    const toState = states.find(s => s.id === transition.to);
    
    // Determine the alias for each state
    let fromAlias: string;
    if (fromState?.systemNodeType === 'NewInstrument') {
      fromAlias = 'NewInstrument';
    } else if (fromState?.systemNodeType === 'TopicStart') {
      fromAlias = `${instrument.type}.${topic.id}.Start`;
    } else if (fromState?.systemNodeType === 'TopicEnd') {
      fromAlias = `${instrument.type}.${topic.id}.End`;
    } else if (fromState?.systemNodeType === 'InstrumentEnd') {
      fromAlias = 'EndInstrument';
    } else if (fromState) {
      fromAlias = `${instrument.type}.${topic.id}.${getStateEnumId(fromState)}`;
    } else {
      fromAlias = `${instrument.type}.${topic.id}.${transition.from}`;
    }
    
    let toAlias: string;
    if (toState?.systemNodeType === 'NewInstrument') {
      toAlias = 'NewInstrument';
    } else if (toState?.systemNodeType === 'TopicStart') {
      toAlias = `${instrument.type}.${topic.id}.Start`;
    } else if (toState?.systemNodeType === 'TopicEnd') {
      toAlias = `${instrument.type}.${topic.id}.End`;
    } else if (toState?.systemNodeType === 'InstrumentEnd') {
      toAlias = 'EndInstrument';
    } else if (toState) {
      toAlias = `${instrument.type}.${topic.id}.${getStateEnumId(toState)}`;
    } else {
      toAlias = `${instrument.type}.${topic.id}.${transition.to}`;
    }
    
    if (transition.label) {
      lines.push(`${fromAlias} --> ${toAlias} : ${transition.label}`);
    } else {
      lines.push(`${fromAlias} --> ${toAlias}`);
    }
  });
  positiveMarkedTopicEnds.forEach((state) => {
    const stateAlias = `${instrument.type}.${topic.id}.${getStateEnumId(state)}`;
    const endAlias = `${instrument.type}.${topic.id}.End`;
    lines.push(`${stateAlias} --> ${endAlias}`);
  });
  negativeMarkedTopicEnds.forEach((state) => {
    const stateAlias = `${instrument.type}.${topic.id}.${getStateEnumId(state)}`;
    lines.push(`${stateAlias} --> EndInstrument`);
  });
  lines.push('');

  lines.push('@enduml');

  return lines.join('\n');
}

export function generateAggregatePuml(project: DiagramProject): string | null {
  const rootTopics = project.topics.filter(t => t.topic.kind === 'root');
  if (rootTopics.length === 0) return null;

  const { instrument } = project;
  const normalTopics = project.topics.filter(t => t.topic.kind === 'normal');
  const hasNormalTopics = normalTopics.length > 0;
  const hasNegativeRootTopicEnds = rootTopics.some((rootTopic) =>
    rootTopic.states.some((state) => getTopicEndKind(state) === 'negative')
  );
  
  // Check if any topic has a transition to InstrumentEnd
  const hasInstrumentEndTransitions = project.topics.some(topicData => 
    topicData.transitions.some(t => {
      const toState = topicData.states.find(s => s.id === t.to);
      return toState?.systemNodeType === 'InstrumentEnd';
    })
  ) || hasNegativeRootTopicEnds;
  const expandedTransitionsByTopicId = new Map<string, RenderTransition[]>();
  const getExpandedTransitions = (topicData: TopicData) => {
    const existing = expandedTransitionsByTopicId.get(topicData.topic.id);
    if (existing) return existing;
    const expanded = getTopicRenderTransitions(topicData, instrument);
    expandedTransitionsByTopicId.set(topicData.topic.id, expanded);
    return expanded;
  };

  const lines: string[] = [];
  lines.push('@startuml');
  lines.push('');
  lines.push(`' Instrument Aggregate: ${instrument.label || instrument.type}`);
  lines.push('');
  lines.push(INLINE_STYLES);
  lines.push('');

  // NewInstrument OUTSIDE the instrument container
  lines.push(`state NewInstrument <<start>>`);
  lines.push('');

  // Instrument container
  lines.push(`state "${instrument.label || instrument.type}" as ${instrument.type} {`);
  lines.push('');

  // All root topics
  rootTopics.forEach((rootTopic) => {
    const rootId = `${instrument.type}.${rootTopic.topic.id}`;
    const rootMarkedTopicEnds = rootTopic.states.filter(
      (state) => getTopicEndKind(state) && !state.isSystemNode
    );
    const rootPositiveMarkedTopicEnds = rootMarkedTopicEnds.filter(
      (state) => getTopicEndKind(state) !== 'negative'
    );
    const rootNegativeMarkedTopicEnds = rootMarkedTopicEnds.filter(
      (state) => getTopicEndKind(state) === 'negative'
    );
    const rootHasTopicEndNode = rootTopic.states.some(
      (state) => state.systemNodeType === 'TopicEnd'
    );
    const rootHasSyntheticTopicEnd = !rootHasTopicEndNode && rootPositiveMarkedTopicEnds.length > 0;
    lines.push(`  state "${rootTopic.topic.label || rootTopic.topic.id}" as ${rootId} {`);
    rootTopic.states.forEach((state) => {
      if (state.systemNodeType === 'NewInstrument') {
        // Skip, declared at top level
      } else if (state.systemNodeType === 'Fork') {
        // Skip fork nodes (expanded in transitions)
      } else if (state.systemNodeType === 'TopicEnd') {
        lines.push(`    state ${rootId}.End as "Topic End" <<exitPoint>>`);
      } else if (state.systemNodeType === 'InstrumentEnd') {
        // Skip, declared at top level
      } else {
        const stateEnumId = getStateEnumId(state);
        const label = state.label;
        const stereotype = state.stereotype || stateEnumId;
        lines.push(`    state "${escapeLabel(label)}" as ${rootId}.${stateEnumId} <<${stereotype}>>`);
      }
    });
    if (rootHasSyntheticTopicEnd) {
      lines.push(`    state ${rootId}.End as "Topic End" <<exitPoint>>`);
    }
    lines.push('');
    
    // Transitions within root topic (excluding connections to NewInstrument - handled externally)
    getExpandedTransitions(rootTopic).forEach((transition) => {
      const fromState = rootTopic.states.find(s => s.id === transition.from);
      const toState = rootTopic.states.find(s => s.id === transition.to);
      
      // Skip transitions from NewInstrument (handled externally)
      if (fromState?.systemNodeType === 'NewInstrument') return;
      
      const fromStateEnumId = fromState ? getStateEnumId(fromState) : transition.from;
      let fromAlias = `${rootId}.${fromStateEnumId}`;
      let toAlias = toState?.systemNodeType === 'TopicEnd' 
        ? `${rootId}.End` 
        : toState?.systemNodeType === 'InstrumentEnd'
          ? 'EndInstrument'
          : `${rootId}.${toState ? getStateEnumId(toState) : transition.to}`;
      
      if (transition.label) {
        lines.push(`    ${fromAlias} --> ${toAlias} : ${transition.label}`);
      } else {
        lines.push(`    ${fromAlias} --> ${toAlias}`);
      }
    });
    rootPositiveMarkedTopicEnds.forEach((state) => {
      const stateEnumId = getStateEnumId(state);
      lines.push(`    ${rootId}.${stateEnumId} --> ${rootId}.End`);
    });
    rootNegativeMarkedTopicEnds.forEach((state) => {
      const stateEnumId = getStateEnumId(state);
      lines.push(`    ${rootId}.${stateEnumId} --> EndInstrument`);
    });
    lines.push('  }');
    lines.push('');
  });

  // Only add flow control nodes if there are normal topics
  if (hasNormalTopics) {
    lines.push(`  ' New Topic router nodes`);
    lines.push(`  state "New Topic" as ${instrument.type}_NewTopic_Out`);
    lines.push(`  state "New Topic" as ${instrument.type}_NewTopic_In`);
    lines.push('');
  }

  // Normal topics
  normalTopics.forEach((topicData) => {
    const topicAlias = `${instrument.type}.${topicData.topic.id}`;
    const markedTopicEnds = topicData.states.filter(
      (state) => getTopicEndKind(state) && !state.isSystemNode
    );
    const hasTopicEndNode = topicData.states.some(
      (state) => state.systemNodeType === 'TopicEnd'
    );
    const hasSyntheticTopicEnd = !hasTopicEndNode && markedTopicEnds.length > 0;
    lines.push(`  state "${topicData.topic.label || topicData.topic.id}" as ${topicAlias} {`);
    topicData.states.forEach((state) => {
      if (state.systemNodeType === 'TopicStart') {
        lines.push(`    state ${topicAlias}.Start as "Topic Start" <<entryPoint>>`);
      } else if (state.systemNodeType === 'Fork') {
        // Skip fork nodes (expanded in transitions)
      } else if (state.systemNodeType === 'TopicEnd') {
        lines.push(`    state ${topicAlias}.End as "Topic End" <<exitPoint>>`);
      } else if (state.systemNodeType === 'InstrumentEnd') {
        // Skip, declared at top level
      } else {
        const stateEnumId = getStateEnumId(state);
        const label = state.label;
        const stereotype = state.stereotype || stateEnumId;
        lines.push(`    state "${escapeLabel(label)}" as ${topicAlias}.${stateEnumId} <<${stereotype}>>`);
      }
    });
    if (hasSyntheticTopicEnd) {
      lines.push(`    state ${topicAlias}.End as "Topic End" <<exitPoint>>`);
    }
    lines.push('');
    getExpandedTransitions(topicData).forEach((transition) => {
      const fromState = topicData.states.find(s => s.id === transition.from);
      const toState = topicData.states.find(s => s.id === transition.to);
      
      let fromAlias = fromState?.systemNodeType === 'TopicStart' 
        ? `${topicAlias}.Start` 
        : `${topicAlias}.${fromState ? getStateEnumId(fromState) : transition.from}`;
      let toAlias = toState?.systemNodeType === 'TopicEnd' 
        ? `${topicAlias}.End` 
        : toState?.systemNodeType === 'InstrumentEnd'
          ? 'EndInstrument'
          : `${topicAlias}.${toState ? getStateEnumId(toState) : transition.to}`;
      
      if (transition.label) {
        lines.push(`    ${fromAlias} --> ${toAlias} : ${transition.label}`);
      } else {
        lines.push(`    ${fromAlias} --> ${toAlias}`);
      }
    });
    markedTopicEnds.forEach((state) => {
      const stateEnumId = getStateEnumId(state);
      lines.push(`    ${topicAlias}.${stateEnumId} --> ${topicAlias}.End`);
    });
    lines.push('  }');
    lines.push('');
  });

  // Connect router nodes (only if normal topics exist)
  if (hasNormalTopics) {
    // NewTopic_Out distributes to normal topic starts
    normalTopics.forEach((topicData) => {
      const topicAlias = `${instrument.type}.${topicData.topic.id}`;
      lines.push(`  ${instrument.type}_NewTopic_Out --> ${topicAlias}.Start`);
    });
    lines.push('');
    
    // Normal topic ends flow into NewTopic_In (sink - no outgoing)
    normalTopics.forEach((topicData) => {
      const topicAlias = `${instrument.type}.${topicData.topic.id}`;
      topicData.states
        .filter((state) => isTopicEndState(state))
        .forEach((state) => {
          lines.push(`  ${topicAlias}.End --> ${instrument.type}_NewTopic_In`);
        });
    });
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  // InstrumentEnd OUTSIDE the instrument container - only if there are transitions to it
  if (hasInstrumentEndTransitions) {
    lines.push(`state EndInstrument <<end>>`);
    lines.push('');
  }

  // Connect NewInstrument to first state of each root topic
  rootTopics.forEach((rootTopic) => {
    const rootId = `${instrument.type}.${rootTopic.topic.id}`;
    getExpandedTransitions(rootTopic)
      .filter((transition) => {
        const fromState = rootTopic.states.find(s => s.id === transition.from);
        return fromState?.systemNodeType === 'NewInstrument';
      })
      .forEach((transition) => {
        const toState = rootTopic.states.find(s => s.id === transition.to);
        let toAlias = toState?.systemNodeType === 'TopicEnd'
          ? `${rootId}.End`
          : `${rootId}.${toState ? getStateEnumId(toState) : transition.to}`;
        
        if (transition.label) {
          lines.push(`NewInstrument --> ${toAlias} : ${transition.label}`);
        } else {
          lines.push(`NewInstrument --> ${toAlias}`);
        }
      });
  });
  lines.push('');

  // Connect root topic ends to NewTopic_Out (only if normal topics exist)
  if (hasNormalTopics) {
    rootTopics.forEach((rootTopic) => {
      const rootId = `${instrument.type}.${rootTopic.topic.id}`;
      const hasPositiveEnds = rootTopic.states.some((state) => {
        if (state.systemNodeType === 'TopicEnd') return true;
        if (getTopicEndKind(state) === 'negative') return false;
        return getTopicEndKind(state) !== undefined;
      });
      if (hasPositiveEnds) {
        lines.push(`${rootId}.End --> ${instrument.type}_NewTopic_Out`);
      }
    });
    lines.push('');
  }

  lines.push('@enduml');

  return lines.join('\n');
}
