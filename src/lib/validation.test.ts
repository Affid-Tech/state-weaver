import { describe, expect, it } from "vitest";
import { hasBlockingErrors, validateProject } from "@/lib/validation";
import type { DiagramProject, TopicData } from "@/types/diagram";

const createBaseProject = (): DiagramProject => ({
  id: "project-1",
  name: "Project",
  instrument: {
    type: "InstrumentType",
    revision: "R1",
  },
  topics: [],
  selectedTopicId: null,
  createdAt: "now",
  updatedAt: "now",
});

const createRootTopic = (): TopicData => ({
  topic: {
    id: "RootTopic",
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
      id: "state-1",
      label: "State One",
      position: { x: 10, y: 10 },
      isSystemNode: false,
    },
  ],
  transitions: [
    {
      id: "transition-1",
      from: "NewInstrument",
      to: "state-1",
      kind: "startInstrument",
      messageType: "MSG",
      flowType: "B2B",
    },
  ],
});

describe("validateProject", () => {
  it("returns blocking errors for missing instrument metadata", () => {
    const project = {
      ...createBaseProject(),
      instrument: { type: "", revision: "" },
    };

    const issues = validateProject(project);

    expect(issues.some((issue) => issue.message === "Instrument type is required")).toBe(true);
    expect(issues.some((issue) => issue.message === "Instrument revision is required")).toBe(true);
    expect(hasBlockingErrors(issues)).toBe(true);
  });

  it("returns warnings without blocking errors for missing end paths", () => {
    const project = {
      ...createBaseProject(),
      topics: [createRootTopic()],
      selectedTopicId: "RootTopic",
    };

    const issues = validateProject(project);

    expect(issues.some((issue) => issue.level === "warning")).toBe(true);
    expect(hasBlockingErrors(issues)).toBe(false);
  });
});
