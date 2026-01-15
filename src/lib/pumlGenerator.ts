import type { DiagramProject, TopicData, StateNode, Transition } from '@/types/diagram';

const INLINE_STYLES = `skinparam state {
  BackgroundColor #F8FAFC
  BorderColor #CBD5E1
  FontColor #0F172A
  ArrowColor #64748B
}

skinparam state<<Start>> {
  BackgroundColor #22C55E
  BorderColor #16A34A
  FontColor #FFFFFF
}

skinparam state<<End>> {
  BackgroundColor #EF4444
  BorderColor #DC2626
  FontColor #FFFFFF
}

skinparam state<<NewInstrument>> {
  BackgroundColor #8B5CF6
  BorderColor #7C3AED
  FontColor #FFFFFF
}

hide empty description`;

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}

function getQualifiedId(instrumentId: string, topicId: string, stateId: string): string {
  return `${instrumentId}.${topicId}.${stateId}`;
}

function getStateAlias(instrumentId: string, topicId: string, stateId: string): string {
  return `${instrumentId}_${topicId}_${stateId}`;
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
  lines.push(`' Instrument: ${instrument.label || instrument.id}`);
  lines.push('');
  lines.push(INLINE_STYLES);
  lines.push('');

  // State declarations
  lines.push(`' --- States ---`);
  states.forEach((state) => {
    const qualifiedId = getQualifiedId(instrument.id, topic.id, state.id);
    const alias = getStateAlias(instrument.id, topic.id, state.id);
    const label = state.label || state.id;
    const stereotype = state.stereotype || state.id;
    lines.push(`state "${escapeLabel(label)}" as ${alias} <<${stereotype}>>`);
  });
  lines.push('');

  // Transitions
  lines.push(`' --- Transitions ---`);
  transitions.forEach((transition) => {
    const fromAlias = getStateAlias(instrument.id, topic.id, transition.from);
    const toAlias = getStateAlias(instrument.id, topic.id, transition.to);
    const label = transition.label ? ` : ${escapeLabel(transition.label)}` : '';
    lines.push(`${fromAlias} --> ${toAlias}${label}`);
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

  // Root topic
  const rootId = `${instrument.id}_${rootTopic.topic.id}`;
  lines.push(`  state "${rootTopic.topic.label || rootTopic.topic.id}" as ${rootId} {`);
  rootTopic.states.forEach((state) => {
    const alias = `${rootId}_${state.id}`;
    const label = state.label || state.id;
    const stereotype = state.stereotype || state.id;
    lines.push(`    state "${escapeLabel(label)}" as ${alias} <<${stereotype}>>`);
  });
  lines.push('');
  rootTopic.transitions.forEach((transition) => {
    const fromAlias = `${rootId}_${transition.from}`;
    const toAlias = `${rootId}_${transition.to}`;
    const label = transition.label ? ` : ${escapeLabel(transition.label)}` : '';
    lines.push(`    ${fromAlias} --> ${toAlias}${label}`);
  });
  lines.push('  }');
  lines.push('');

  // Flow control nodes
  lines.push(`  state "New Topic" as ${instrument.id}_NewTopicOut <<choice>>`);
  lines.push(`  state "Topic Complete" as ${instrument.id}_NewTopicIn <<choice>>`);
  lines.push('');

  // Connect root end to NewTopicOut
  lines.push(`  ${rootId}_TopicEnd --> ${instrument.id}_NewTopicOut`);
  lines.push('');

  // Normal topics
  normalTopics.forEach((topicData) => {
    const topicAlias = `${instrument.id}_${topicData.topic.id}`;
    lines.push(`  state "${topicData.topic.label || topicData.topic.id}" as ${topicAlias} {`);
    topicData.states.forEach((state) => {
      const alias = `${topicAlias}_${state.id}`;
      const label = state.label || state.id;
      const stereotype = state.stereotype || state.id;
      lines.push(`    state "${escapeLabel(label)}" as ${alias} <<${stereotype}>>`);
    });
    lines.push('');
    topicData.transitions.forEach((transition) => {
      const fromAlias = `${topicAlias}_${transition.from}`;
      const toAlias = `${topicAlias}_${transition.to}`;
      const label = transition.label ? ` : ${escapeLabel(transition.label)}` : '';
      lines.push(`    ${fromAlias} --> ${toAlias}${label}`);
    });
    lines.push('  }');
    lines.push('');

    // Connect NewTopicOut to topic start
    lines.push(`  ${instrument.id}_NewTopicOut --> ${topicAlias}_TopicStart`);
    // Connect topic end to NewTopicIn
    lines.push(`  ${topicAlias}_TopicEnd --> ${instrument.id}_NewTopicIn`);
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
