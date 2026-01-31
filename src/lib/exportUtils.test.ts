import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { exportProjectAsZip } from "@/lib/exportUtils";
import { generateAggregatePuml, generateTopicPuml } from "@/lib/pumlGenerator";
import type { DiagramProject } from "@/types/diagram";
import type { DiagramState } from "@/store/diagramStore";

vi.mock("jszip");
vi.mock("@/lib/pumlGenerator", () => ({
  generateAggregatePuml: vi.fn(),
  generateTopicPuml: vi.fn(),
}));

describe("exportProjectAsZip", () => {
  const mockGenerateTopicPuml = vi.mocked(generateTopicPuml);
  const mockGenerateAggregatePuml = vi.mocked(generateAggregatePuml);
  const mockJSZip = vi.mocked(JSZip);

  beforeEach(() => {
    mockGenerateTopicPuml.mockReset();
    mockGenerateAggregatePuml.mockReset();
    mockJSZip.mockReset();
  });

  it("adds expected files and content to the zip archive", async () => {
    const fileEntries: Array<{ path: string; content: string }> = [];
    const folderEntries: string[] = [];
    const generateAsync = vi.fn().mockResolvedValue(new Blob(["zip"]));

    mockJSZip.mockImplementation(() => ({
      folder: (path: string) => {
        folderEntries.push(path);
        return {
          file: (filePath: string, content: string) => {
            fileEntries.push({ path: `${path}/${filePath}`, content });
          },
        };
      },
      generateAsync,
    }) as unknown as JSZip);

    const project: DiagramProject = {
      id: "project-1",
      name: "Project",
      instrument: {
        type: "instrument",
        revision: "r1",
      },
      topics: [
        {
          topic: { id: "Root", kind: "root" },
          states: [],
          transitions: [],
        },
        {
          topic: { id: "TopicB", kind: "normal" },
          states: [],
          transitions: [],
        },
      ],
      selectedTopicId: "Root",
      createdAt: "now",
      updatedAt: "now",
    };

    const state = {
      projects: [project],
      exportProject: () => "snapshot-json",
    } as DiagramState;

    mockGenerateTopicPuml.mockImplementation((_project, topicId) => `topic-${topicId}`);
    mockGenerateAggregatePuml.mockReturnValue("aggregate-puml");

    await exportProjectAsZip(state);

    expect(folderEntries).toEqual(["builder", "R1/INSTRUMENT"]);
    expect(fileEntries).toContainEqual({
      path: "builder/statemachine_snapshot.json",
      content: "snapshot-json",
    });
    expect(fileEntries).toContainEqual({
      path: "R1/INSTRUMENT/root.puml",
      content: "topic-Root",
    });
    expect(fileEntries).toContainEqual({
      path: "R1/INSTRUMENT/topicb.puml",
      content: "topic-TopicB",
    });
    expect(fileEntries).toContainEqual({
      path: "R1/INSTRUMENT/complete.puml",
      content: "aggregate-puml",
    });
    expect(generateAsync).toHaveBeenCalledWith({ type: "blob" });
  });
});
