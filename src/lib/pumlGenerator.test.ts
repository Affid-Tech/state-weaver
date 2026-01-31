import { describe, expect, it } from "vitest";
import { generateAggregatePuml, generateTopicPuml } from "@/lib/pumlGenerator";
import type { DiagramProject, TopicData } from "@/types/diagram";

const createProjectWithRootTopic = (): DiagramProject => {
  const rootTopic: TopicData = {
    topic: {
      id: "ROOT",
      label: "Root Topic",
      kind: "root",
    },
    states: [
      {
        id: "NewInstrument",
        label: "New Instrument",
        position: { x: 0, y: 0 },
        isSystemNode: true,
        systemNodeType: "NewInstrument",
      },
      {
        id: "state-ready",
        label: "Ready",
        position: { x: 10, y: 10 },
        isSystemNode: false,
      },
      {
        id: "state-done",
        label: "Completed",
        position: { x: 20, y: 20 },
        isSystemNode: false,
        topicEndKind: "positive",
      },
    ],
    transitions: [
      {
        id: "transition-1",
        from: "NewInstrument",
        to: "state-ready",
        kind: "startInstrument",
        messageType: "MSG",
        flowType: "B2B",
      },
      {
        id: "transition-2",
        from: "state-ready",
        to: "state-done",
        kind: "normal",
        messageType: "DONE",
        flowType: "C2C",
      },
    ],
  };

  return {
    id: "project-1",
    name: "Project",
    instrument: {
      type: "InstrumentX",
      revision: "R1",
      label: "Instrument X",
    },
    topics: [rootTopic],
    selectedTopicId: "ROOT",
    createdAt: "now",
    updatedAt: "now",
  };
};

describe("generateTopicPuml", () => {
  it("renders topic diagram with expected declarations and transitions", () => {
    const project = createProjectWithRootTopic();

    const puml = generateTopicPuml(project, "ROOT");

    expect(puml).toContain("@startuml");
    expect(puml).toContain('state "Ready" as InstrumentX.ROOT.READY <<READY>>');
    expect(puml).toContain('state InstrumentX.ROOT.End as "Topic End" <<exitPoint>>');
    expect(puml).toContain("NewInstrument --> InstrumentX.ROOT.READY : MSG B2B");
    expect(puml).toContain("InstrumentX.ROOT.READY --> InstrumentX.ROOT.COMPLETED : DONE C2C");
    expect(puml).toContain("InstrumentX.ROOT.COMPLETED --> InstrumentX.ROOT.End");
  });
});

describe("generateAggregatePuml", () => {
  it("renders aggregate diagram with topic router nodes and connections", () => {
    const rootTopic = createProjectWithRootTopic().topics[0];
    const normalTopic: TopicData = {
      topic: {
        id: "NORMAL",
        label: "Normal Topic",
        kind: "normal",
      },
      states: [
        {
          id: "TopicStart",
          label: "Topic Start",
          position: { x: 0, y: 0 },
          isSystemNode: true,
          systemNodeType: "TopicStart",
        },
        {
          id: "state-review",
          label: "Review",
          position: { x: 10, y: 10 },
          isSystemNode: false,
          topicEndKind: "positive",
        },
      ],
      transitions: [
        {
          id: "transition-3",
          from: "TopicStart",
          to: "state-review",
          kind: "startTopic",
          messageType: "CHECK",
          flowType: "B2C",
        },
      ],
    };

    const project: DiagramProject = {
      ...createProjectWithRootTopic(),
      topics: [rootTopic, normalTopic],
    };

    const puml = generateAggregatePuml(project);

    expect(puml).toContain('state NewInstrument <<start>>');
    expect(puml).toContain('state "New Topic" as InstrumentX_NewTopic_Out');
    expect(puml).toContain("InstrumentX_NewTopic_Out --> InstrumentX.NORMAL.Start");
    expect(puml).toContain("InstrumentX.ROOT.End --> InstrumentX_NewTopic_Out");
    expect(puml).toContain("InstrumentX.NORMAL.End --> InstrumentX_NewTopic_In");
  });
});
