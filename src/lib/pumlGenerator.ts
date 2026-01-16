import type { DiagramProject, TopicData, StateNode, Transition, Instrument, Topic } from '@/types/diagram';
import { labelToEnumId } from '@/types/diagram';

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
function getTransitionLabel(transition: Transition, instrument: Instrument, topic: Topic): string {
  // End transitions have no label
  if (transition.kind === 'endTopic' || transition.kind === 'endInstrument') {
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

export function generateTopicPuml(project: DiagramProject, topicId: string): string | null {
  const topicData = project.topics.find(t => t.topic.id === topicId);
  if (!topicData) return null;

  const { instrument } = project;
  const { topic, states, transitions } = topicData;

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
  const hasInstrumentEnd = states.some(s => s.systemNodeType === 'InstrumentEnd');
  
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
  lines.push('');

  // Transitions
  lines.push(`' --- Transitions ---`);
  transitions.forEach((transition) => {
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
    
    const label = getTransitionLabel(transition, instrument, topic);
    if (label) {
      lines.push(`${fromAlias} --> ${toAlias} : ${label}`);
    } else {
      lines.push(`${fromAlias} --> ${toAlias}`);
    }
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
    lines.push(`  state "${rootTopic.topic.label || rootTopic.topic.id}" as ${rootId} {`);
    rootTopic.states.forEach((state) => {
      if (state.systemNodeType === 'NewInstrument') {
        // Skip, declared at top level
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
    lines.push('');
    
    // Transitions within root topic (excluding connections to NewInstrument - handled externally)
    rootTopic.transitions.forEach((transition) => {
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
      
      const label = getTransitionLabel(transition, instrument, rootTopic.topic);
      if (label) {
        lines.push(`    ${fromAlias} --> ${toAlias} : ${label}`);
      } else {
        lines.push(`    ${fromAlias} --> ${toAlias}`);
      }
    });
    lines.push('  }');
    lines.push('');
  });

  // Only add flow control nodes if there are normal topics
  // Using L/R split for visual clarity (reducing arrow length)
  if (hasNormalTopics) {
    lines.push(`  ' New Topic router nodes (duplicated for visual clarity)`);
    lines.push(`  state "New Topic" as ${instrument.type}_NewTopic_L`);
    lines.push(`  state "New Topic" as ${instrument.type}_NewTopic_R`);
    lines.push('');
  }

  // Normal topics
  normalTopics.forEach((topicData) => {
    const topicAlias = `${instrument.type}.${topicData.topic.id}`;
    lines.push(`  state "${topicData.topic.label || topicData.topic.id}" as ${topicAlias} {`);
    topicData.states.forEach((state) => {
      if (state.systemNodeType === 'TopicStart') {
        lines.push(`    state ${topicAlias}.Start as "Topic Start" <<entryPoint>>`);
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
    lines.push('');
    topicData.transitions.forEach((transition) => {
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
      
      const label = getTransitionLabel(transition, instrument, topicData.topic);
      if (label) {
        lines.push(`    ${fromAlias} --> ${toAlias} : ${label}`);
      } else {
        lines.push(`    ${fromAlias} --> ${toAlias}`);
      }
    });
    lines.push('  }');
    lines.push('');
  });

  // Connect router nodes (only if normal topics exist)
  if (hasNormalTopics) {
    // Connect right router to normal topic starts
    normalTopics.forEach((topicData) => {
      const topicAlias = `${instrument.type}.${topicData.topic.id}`;
      lines.push(`  ${instrument.type}_NewTopic_R --> ${topicAlias}.Start`);
    });
    lines.push('');
    
    // Connect normal topic ends to left router
    normalTopics.forEach((topicData) => {
      const topicAlias = `${instrument.type}.${topicData.topic.id}`;
      lines.push(`  ${topicAlias}.End --> ${instrument.type}_NewTopic_L`);
    });
    lines.push('');
    
    // Connect left router to right router (visual bridge for looping)
    lines.push(`  ${instrument.type}_NewTopic_L --> ${instrument.type}_NewTopic_R`);
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  // InstrumentEnd OUTSIDE the instrument container
  lines.push(`state EndInstrument <<end>>`);
  lines.push('');

  // Connect NewInstrument to first state of each root topic
  rootTopics.forEach((rootTopic) => {
    const rootId = `${instrument.type}.${rootTopic.topic.id}`;
    // Find the first regular state that NewInstrument connects to
    const startTransition = rootTopic.transitions.find(t => {
      const fromState = rootTopic.states.find(s => s.id === t.from);
      return fromState?.systemNodeType === 'NewInstrument';
    });
    
    if (startTransition) {
      const toState = rootTopic.states.find(s => s.id === startTransition.to);
      let toAlias = toState?.systemNodeType === 'TopicEnd'
        ? `${rootId}.End`
        : `${rootId}.${toState ? getStateEnumId(toState) : startTransition.to}`;
      
      const label = getTransitionLabel(startTransition, instrument, rootTopic.topic);
      if (label) {
        lines.push(`NewInstrument --> ${toAlias} : ${label}`);
      } else {
        lines.push(`NewInstrument --> ${toAlias}`);
      }
    }
  });
  lines.push('');

  // Connect root topic ends to left router (only if normal topics exist)
  if (hasNormalTopics) {
    rootTopics.forEach((rootTopic) => {
      const rootId = `${instrument.type}.${rootTopic.topic.id}`;
      lines.push(`${rootId}.End --> ${instrument.type}_NewTopic_L`);
    });
    lines.push('');
  }

  lines.push('@enduml');

  return lines.join('\n');
}
