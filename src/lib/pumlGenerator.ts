import type { DiagramProject, TopicData, StateNode, Transition } from '@/types/diagram';

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

function getTransitionLabel(transition: Transition): string {
  // End transitions have no label
  if (transition.kind === 'endTopic' || transition.kind === 'endInstrument') {
    return '';
  }
  const parts: string[] = [];
  if (transition.revision) parts.push(transition.revision);
  if (transition.instrument) parts.push(transition.instrument);
  if (transition.topic) parts.push(transition.topic);
  parts.push(transition.messageType);
  parts.push(transition.flowType);
  return parts.join('.');
}

export function generateTopicPuml(project: DiagramProject, topicId: string): string | null {
  const topicData = project.topics.find(t => t.topic.id === topicId);
  if (!topicData) return null;

  const { instrument } = project;
  const { topic, states, transitions } = topicData;
  const isRootTopic = topic.kind === 'root';

  const lines: string[] = [];
  lines.push('@startuml');
  lines.push('');
  lines.push(`' Topic: ${topic.label || topic.id}`);
  lines.push(`' Instrument: ${instrument.label || instrument.id}`);
  lines.push('');
  lines.push(INLINE_STYLES);
  lines.push('');

  // State declarations
  lines.push(`' --- States ---`);
  states.forEach((state) => {
    const qualifiedId = `${instrument.id}.${topic.id}.${state.id}`;
    
    if (state.systemNodeType === 'NewInstrument') {
      // Root topic start: state NewInstrument <<start>>
      lines.push(`state NewInstrument <<start>>`);
    } else if (state.systemNodeType === 'TopicStart') {
      // Normal topic start: state $type.$subtype.Start as "Topic Start" <<entryPoint>>
      lines.push(`state ${instrument.id}.${topic.id}.Start as "Topic Start" <<entryPoint>>`);
    } else if (state.systemNodeType === 'TopicEnd') {
      // Topic end: state $type.$subtype.End as "Topic End" <<exitPoint>>
      lines.push(`state ${instrument.id}.${topic.id}.End as "Topic End" <<exitPoint>>`);
    } else if (state.systemNodeType === 'InstrumentEnd') {
      // Instrument end: state $type.End <<end>>
      lines.push(`state ${instrument.id}.End <<end>>`);
    } else {
      // Regular state
      const label = state.label || state.id;
      const stereotype = state.stereotype || state.id;
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
      fromAlias = `${instrument.id}.${topic.id}.Start`;
    } else if (fromState?.systemNodeType === 'TopicEnd') {
      fromAlias = `${instrument.id}.${topic.id}.End`;
    } else if (fromState?.systemNodeType === 'InstrumentEnd') {
      fromAlias = `${instrument.id}.End`;
    } else {
      fromAlias = `${instrument.id}.${topic.id}.${transition.from}`;
    }
    
    let toAlias: string;
    if (toState?.systemNodeType === 'NewInstrument') {
      toAlias = 'NewInstrument';
    } else if (toState?.systemNodeType === 'TopicStart') {
      toAlias = `${instrument.id}.${topic.id}.Start`;
    } else if (toState?.systemNodeType === 'TopicEnd') {
      toAlias = `${instrument.id}.${topic.id}.End`;
    } else if (toState?.systemNodeType === 'InstrumentEnd') {
      toAlias = `${instrument.id}.End`;
    } else {
      toAlias = `${instrument.id}.${topic.id}.${transition.to}`;
    }
    
    const label = getTransitionLabel(transition);
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
  const rootTopic = project.topics.find(t => t.topic.kind === 'root');
  if (!rootTopic) return null;

  const { instrument } = project;
  const normalTopics = project.topics.filter(t => t.topic.kind === 'normal');

  const lines: string[] = [];
  lines.push('@startuml');
  lines.push('');
  lines.push(`' Instrument Aggregate: ${instrument.label || instrument.id}`);
  lines.push('');
  lines.push(INLINE_STYLES);
  lines.push('');

  // Root topic container
  lines.push(`state "${instrument.label || instrument.id}" as ${instrument.id} {`);
  lines.push('');

  // NewInstrument start
  lines.push(`  state NewInstrument <<start>>`);
  lines.push('');

  // Root topic
  const rootId = `${instrument.id}.${rootTopic.topic.id}`;
  lines.push(`  state "${rootTopic.topic.label || rootTopic.topic.id}" as ${rootId} {`);
  rootTopic.states.forEach((state) => {
    if (state.systemNodeType === 'NewInstrument') {
      // Skip, already declared at instrument level
    } else if (state.systemNodeType === 'TopicEnd') {
      lines.push(`    state ${rootId}.End as "Topic End" <<exitPoint>>`);
    } else if (state.systemNodeType === 'InstrumentEnd') {
      // Skip, declared at instrument level
    } else {
      const label = state.label || state.id;
      const stereotype = state.stereotype || state.id;
      lines.push(`    state "${escapeLabel(label)}" as ${rootId}.${state.id} <<${stereotype}>>`);
    }
  });
  lines.push('');
  rootTopic.transitions.forEach((transition) => {
    const fromState = rootTopic.states.find(s => s.id === transition.from);
    const toState = rootTopic.states.find(s => s.id === transition.to);
    
    let fromAlias = fromState?.systemNodeType === 'NewInstrument' 
      ? 'NewInstrument' 
      : `${rootId}.${transition.from}`;
    let toAlias = toState?.systemNodeType === 'TopicEnd' 
      ? `${rootId}.End` 
      : toState?.systemNodeType === 'InstrumentEnd'
        ? `${instrument.id}.End`
        : `${rootId}.${transition.to}`;
    
    const label = getTransitionLabel(transition);
    if (label) {
      lines.push(`    ${fromAlias} --> ${toAlias} : ${label}`);
    } else {
      lines.push(`    ${fromAlias} --> ${toAlias}`);
    }
  });
  lines.push('  }');
  lines.push('');

  // Flow control nodes
  lines.push(`  state "New Topic" as ${instrument.id}_NewTopicOut <<choice>>`);
  lines.push(`  state "Topic Complete" as ${instrument.id}_NewTopicIn <<choice>>`);
  lines.push('');

  // Instrument end
  lines.push(`  state ${instrument.id}.End <<end>>`);
  lines.push('');

  // Connect root end to NewTopicOut
  lines.push(`  ${rootId}.End --> ${instrument.id}_NewTopicOut`);
  lines.push('');

  // Normal topics
  normalTopics.forEach((topicData) => {
    const topicAlias = `${instrument.id}.${topicData.topic.id}`;
    lines.push(`  state "${topicData.topic.label || topicData.topic.id}" as ${topicAlias} {`);
    topicData.states.forEach((state) => {
      if (state.systemNodeType === 'TopicStart') {
        lines.push(`    state ${topicAlias}.Start as "Topic Start" <<entryPoint>>`);
      } else if (state.systemNodeType === 'TopicEnd') {
        lines.push(`    state ${topicAlias}.End as "Topic End" <<exitPoint>>`);
      } else if (state.systemNodeType === 'InstrumentEnd') {
        // Skip, declared at instrument level
      } else {
        const label = state.label || state.id;
        const stereotype = state.stereotype || state.id;
        lines.push(`    state "${escapeLabel(label)}" as ${topicAlias}.${state.id} <<${stereotype}>>`);
      }
    });
    lines.push('');
    topicData.transitions.forEach((transition) => {
      const fromState = topicData.states.find(s => s.id === transition.from);
      const toState = topicData.states.find(s => s.id === transition.to);
      
      let fromAlias = fromState?.systemNodeType === 'TopicStart' 
        ? `${topicAlias}.Start` 
        : `${topicAlias}.${transition.from}`;
      let toAlias = toState?.systemNodeType === 'TopicEnd' 
        ? `${topicAlias}.End` 
        : toState?.systemNodeType === 'InstrumentEnd'
          ? `${instrument.id}.End`
          : `${topicAlias}.${transition.to}`;
      
      const label = getTransitionLabel(transition);
      if (label) {
        lines.push(`    ${fromAlias} --> ${toAlias} : ${label}`);
      } else {
        lines.push(`    ${fromAlias} --> ${toAlias}`);
      }
    });
    lines.push('  }');
    lines.push('');

    // Connect NewTopicOut to topic start
    lines.push(`  ${instrument.id}_NewTopicOut --> ${topicAlias}.Start`);
    // Connect topic end to NewTopicIn
    lines.push(`  ${topicAlias}.End --> ${instrument.id}_NewTopicIn`);
    lines.push('');
  });

  // Loop back
  if (normalTopics.length > 0) {
    lines.push(`  ${instrument.id}_NewTopicIn --> ${instrument.id}_NewTopicOut`);
  }

  lines.push('}');
  lines.push('');
  lines.push('@enduml');

  return lines.join('\n');
}
