import { beforeEach, describe, expect, it } from "vitest";

import { useDiagramStore } from "@/store/diagramStore";
import type { DiagramState } from "@/store/diagramStore";
import { DEFAULT_FIELD_CONFIG } from "@/types/fieldConfig";

const resetStore = () => {
  localStorage.clear();
  useDiagramStore.setState({
    projects: [],
    activeProjectId: null,
    selectedElementId: null,
    selectedElementType: null,
    viewMode: "topic",
    transitionVisibility: {},
    fieldConfig: JSON.parse(JSON.stringify(DEFAULT_FIELD_CONFIG)),
  });
};

describe("diagramStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("manages project lifecycle", () => {
    const projectId = useDiagramStore.getState().createProject({
      type: "pacs_008",
      revision: "R1",
      label: "Payments",
    });

    const stateAfterCreate = useDiagramStore.getState();
    expect(stateAfterCreate.projects).toHaveLength(1);
    expect(stateAfterCreate.activeProjectId).toBe(projectId);
    expect(stateAfterCreate.getActiveProject()?.id).toBe(projectId);

    const duplicateId = useDiagramStore.getState().duplicateProject(projectId);
    const stateAfterDuplicate = useDiagramStore.getState();
    expect(duplicateId).not.toBeNull();
    expect(stateAfterDuplicate.projects).toHaveLength(2);
    expect(
      stateAfterDuplicate.projects.find((project) => project.id === duplicateId)
        ?.name,
    ).toBe("Payments (Copy)");

    if (duplicateId) {
      useDiagramStore.getState().selectProject(duplicateId);
      expect(useDiagramStore.getState().activeProjectId).toBe(duplicateId);
    }

    useDiagramStore.getState().deleteProject(projectId);
    const stateAfterDelete = useDiagramStore.getState();
    expect(stateAfterDelete.projects).toHaveLength(1);

    if (duplicateId) {
      useDiagramStore.getState().deleteProject(duplicateId);
    }

    expect(useDiagramStore.getState().getActiveProject()).toBeNull();
  });

  it("handles topics, states, transitions, and selection", () => {
    useDiagramStore
      .getState()
      .createProject({ type: "pacs_008", revision: "R1" });
    useDiagramStore.getState().createTopic("topic-a", "normal", "Topic A");

    const project = useDiagramStore.getState().getActiveProject();
    expect(project?.topics).toHaveLength(1);
    expect(project?.selectedTopicId).toBe("topic-a");

    const topicData = project?.topics[0];
    const topicStart = topicData?.states.find(
      (state) => state.systemNodeType === "TopicStart",
    );
    expect(topicStart).toBeDefined();

    useDiagramStore.getState().addState("topic-a", "Customer");
    useDiagramStore
      .getState()
      .addFork("topic-a", { x: 150, y: 120 });

    const updatedTopic = useDiagramStore
      .getState()
      .getActiveProject()
      ?.topics[0];
    const customState = updatedTopic?.states.find(
      (state) => !state.isSystemNode,
    );
    const forkState = updatedTopic?.states.find(
      (state) => state.systemNodeType === "Fork",
    );

    expect(customState?.label).toBe("Customer");
    expect(forkState).toBeDefined();

    if (!topicStart || !customState || !forkState) {
      throw new Error("Missing required states for transition test");
    }

    const transitionId = useDiagramStore.getState().addTransition(
      "topic-a",
      topicStart.id,
      customState.id,
      "pacs.008",
      "B2B",
    );

    const transition = useDiagramStore
      .getState()
      .getActiveProject()
      ?.topics[0]
      .transitions.find((item) => item.id === transitionId);

    expect(transition?.kind).toBe("startTopic");
    expect(useDiagramStore.getState().transitionVisibility[transitionId]).toBe(
      true,
    );

    useDiagramStore
      .getState()
      .updateTransition("topic-a", transitionId, {
        from: customState.id,
        to: forkState.id,
      });

    const transitionAfterUpdate = useDiagramStore
      .getState()
      .getActiveProject()
      ?.topics[0]
      .transitions.find((item) => item.id === transitionId);

    expect(transitionAfterUpdate?.kind).toBe("normal");
    expect(transitionAfterUpdate?.isRoutingOnly).toBe(true);
    expect(transitionAfterUpdate?.messageType).toBeUndefined();
    expect(transitionAfterUpdate?.flowType).toBeUndefined();

    useDiagramStore
      .getState()
      .updateStatePosition("topic-a", customState.id, { x: 400, y: 300 });
    const updatedState = useDiagramStore
      .getState()
      .getActiveProject()
      ?.topics[0]
      .states.find((state) => state.id === customState.id);
    expect(updatedState?.position).toEqual({ x: 400, y: 300 });

    useDiagramStore.getState().selectElement(transitionId, "transition");
    expect(useDiagramStore.getState().selectedElementId).toBe(transitionId);
    expect(useDiagramStore.getState().selectedElementType).toBe("transition");

    useDiagramStore.getState().selectTopic("topic-a");
    expect(useDiagramStore.getState().getActiveProject()?.selectedTopicId).toBe(
      "topic-a",
    );
    expect(useDiagramStore.getState().selectedElementId).toBeNull();
    expect(useDiagramStore.getState().selectedElementType).toBeNull();

    useDiagramStore
      .getState()
      .deleteState("topic-a", customState.id);
    expect(
      useDiagramStore.getState().transitionVisibility[transitionId],
    ).toBeUndefined();

    useDiagramStore
      .getState()
      .deleteTransition("topic-a", transitionId);
    expect(
      useDiagramStore.getState().transitionVisibility[transitionId],
    ).toBeUndefined();
  });

  it("rehydrates transition visibility from storage", async () => {
    const persistedState = {
      projects: [],
      activeProjectId: null,
      selectedElementId: null,
      selectedElementType: null,
      viewMode: "topic",
      transitionVisibility: {
        "transition-123": false,
      },
      fieldConfig: JSON.parse(JSON.stringify(DEFAULT_FIELD_CONFIG)),
    };

    localStorage.setItem(
      "diagram-workspace",
      JSON.stringify({ state: persistedState, version: 0 }),
    );

    await useDiagramStore.persist.rehydrate();

    expect(
      useDiagramStore.getState().transitionVisibility["transition-123"],
    ).toBe(false);
  });

  it("normalizes legacy end markers on import", () => {
    const stateFixture: DiagramState = {
      projects: [
        {
          id: "project-1",
          name: "Legacy",
          instrument: { type: "pacs_008", revision: "R1" },
          selectedTopicId: "topic-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          topics: [
            {
              topic: { id: "topic-1", kind: "normal" },
              states: [
                {
                  id: "TopicStart",
                  label: "Topic Start",
                  stereotype: "Start",
                  position: { x: 0, y: 0 },
                  isSystemNode: true,
                  systemNodeType: "TopicStart",
                },
                {
                  id: "state-1",
                  label: "State 1",
                  position: { x: 100, y: 100 },
                  isSystemNode: false,
                },
                {
                  id: "EndTopic",
                  label: "EndTopic",
                  position: { x: 200, y: 200 },
                  isSystemNode: true,
                  systemNodeType: "TopicEnd",
                },
              ],
              transitions: [
                {
                  id: "transition-1",
                  from: "state-1",
                  to: "EndTopic",
                  kind: "endTopic",
                },
                {
                  id: "transition-2",
                  from: "TopicStart",
                  to: "state-1",
                  kind: "endTopic",
                },
              ],
            },
          ],
        },
      ],
      activeProjectId: "project-1",
      selectedElementId: null,
      selectedElementType: null,
      viewMode: "topic",
      transitionVisibility: {
        "transition-1": true,
        "transition-2": true,
      },
      fieldConfig: JSON.parse(JSON.stringify(DEFAULT_FIELD_CONFIG)),
      createProject: useDiagramStore.getState().createProject,
      duplicateProject: useDiagramStore.getState().duplicateProject,
      deleteProject: useDiagramStore.getState().deleteProject,
      selectProject: useDiagramStore.getState().selectProject,
      setProject: useDiagramStore.getState().setProject,
      updateProjectName: useDiagramStore.getState().updateProjectName,
      updateInstrument: useDiagramStore.getState().updateInstrument,
      createTopic: useDiagramStore.getState().createTopic,
      updateTopic: useDiagramStore.getState().updateTopic,
      deleteTopic: useDiagramStore.getState().deleteTopic,
      selectTopic: useDiagramStore.getState().selectTopic,
      setRootTopic: useDiagramStore.getState().setRootTopic,
      addState: useDiagramStore.getState().addState,
      addFork: useDiagramStore.getState().addFork,
      updateState: useDiagramStore.getState().updateState,
      deleteState: useDiagramStore.getState().deleteState,
      updateStatePosition: useDiagramStore.getState().updateStatePosition,
      addTransition: useDiagramStore.getState().addTransition,
      updateTransition: useDiagramStore.getState().updateTransition,
      deleteTransition: useDiagramStore.getState().deleteTransition,
      updateTransitionRouting: useDiagramStore.getState().updateTransitionRouting,
      updateTransitionTeleportAnchors:
        useDiagramStore.getState().updateTransitionTeleportAnchors,
      getTransitionTeleportEnabled:
        useDiagramStore.getState().getTransitionTeleportEnabled,
      setTransitionTeleportEnabled:
        useDiagramStore.getState().setTransitionTeleportEnabled,
      setTransitionVisibility: useDiagramStore.getState().setTransitionVisibility,
      setTransitionsVisibility:
        useDiagramStore.getState().setTransitionsVisibility,
      selectElement: useDiagramStore.getState().selectElement,
      setViewMode: useDiagramStore.getState().setViewMode,
      updateFieldConfig: useDiagramStore.getState().updateFieldConfig,
      exportInstrument: useDiagramStore.getState().exportInstrument,
      exportProject: useDiagramStore.getState().exportProject,
      importInstrument: useDiagramStore.getState().importInstrument,
      importProject: useDiagramStore.getState().importProject,
      resetProject: useDiagramStore.getState().resetProject,
      getActiveProject: useDiagramStore.getState().getActiveProject,
    };

    const imported = useDiagramStore
      .getState()
      .importProject(JSON.stringify(stateFixture));
    expect(imported).toBe(true);

    const importedTopic = useDiagramStore
      .getState()
      .projects[0]
      .topics[0];
    const legacyState = importedTopic.states.find(
      (state) => state.id === "EndTopic",
    );
    expect(legacyState).toBeUndefined();

    const normalizedState = importedTopic.states.find(
      (state) => state.id === "state-1",
    );
    expect(normalizedState?.topicEndKind).toBe("positive");

    const remainingTransitions = importedTopic.transitions.map(
      (transition) => transition.id,
    );
    expect(remainingTransitions).toContain("transition-2");
    expect(remainingTransitions).not.toContain("transition-1");
    expect(
      useDiagramStore.getState().transitionVisibility["transition-1"],
    ).toBeUndefined();

    const updatedTransition = importedTopic.transitions.find(
      (transition) => transition.id === "transition-2",
    );
    expect(updatedTransition?.kind).toBe("startTopic");
  });

  it("round-trips export/import for a minimal project", () => {
    useDiagramStore
      .getState()
      .createProject({ type: "pacs_008", revision: "R1" });
    useDiagramStore.getState().createTopic("topic-a", "normal", "Topic A");
    useDiagramStore.getState().addState("topic-a", "Customer");

    const topic = useDiagramStore.getState().getActiveProject()?.topics[0];
    const start = topic?.states.find(
      (state) => state.systemNodeType === "TopicStart",
    );
    const state = topic?.states.find((node) => !node.isSystemNode);

    if (!start || !state) {
      throw new Error("Missing states for export/import test");
    }

    useDiagramStore
      .getState()
      .addTransition("topic-a", start.id, state.id, "pacs.008", "B2B");

    const exported = useDiagramStore.getState().exportProject();
    resetStore();

    const imported = useDiagramStore.getState().importProject(exported);
    expect(imported).toBe(true);

    const importedProject = useDiagramStore.getState().projects[0];
    expect(importedProject.instrument.type).toBe("pacs_008");
    expect(importedProject.topics[0].topic.id).toBe("topic-a");
    expect(importedProject.topics[0].transitions).toHaveLength(1);
  });
});
