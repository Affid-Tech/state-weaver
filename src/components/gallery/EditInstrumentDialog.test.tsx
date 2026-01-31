import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import { EditInstrumentDialog } from "@/components/gallery/EditInstrumentDialog";

const toastError = vi.hoisted(() => vi.fn());
const mockUseDiagramStore = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

vi.mock("@/store/diagramStore", () => ({
  useDiagramStore: mockUseDiagramStore,
}));

describe("EditInstrumentDialog", () => {
  beforeEach(() => {
    toastError.mockClear();
    mockUseDiagramStore.mockReset();
  });

  it("loads project details and saves updates when valid", () => {
    const updateInstrument = vi.fn();
    const selectProject = vi.fn();
    const onOpenChange = vi.fn();

    mockUseDiagramStore.mockReturnValue({
      fieldConfig: {
        instrumentTypes: ["TypeA", "TypeB"],
        revisions: ["R1", "R2"],
      },
      updateInstrument,
      selectProject,
      activeProjectId: "active-project",
      projects: [
        {
          id: "project-1",
          instrument: { type: "TypeA", revision: "R1" },
        },
      ],
    });

    renderWithProviders(
      <EditInstrumentDialog
        open
        onOpenChange={onOpenChange}
        project={{
          id: "project-1",
          name: "Project 1",
          instrument: {
            type: "TypeA",
            revision: "R1",
            label: "Alpha",
            description: "Desc",
          },
          topics: [],
          selectedTopicId: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        }}
      />,
    );

    const [typeCombobox, revisionCombobox] = screen.getAllByRole("combobox");

    fireEvent.click(typeCombobox);
    fireEvent.change(
      screen.getByPlaceholderText(/filter select or enter type/i),
      {
        target: { value: "TypeB" },
      },
    );
    fireEvent.click(screen.getByRole("option", { name: "TypeB" }));

    fireEvent.click(revisionCombobox);
    fireEvent.change(
      screen.getByPlaceholderText(/filter select or enter revision/i),
      {
        target: { value: "R2" },
      },
    );
    fireEvent.click(screen.getByRole("option", { name: "R2" }));

    const saveButton = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveButton);

    expect(selectProject).toHaveBeenCalledWith("project-1");
    expect(updateInstrument).toHaveBeenCalledWith({
      type: "TypeB",
      revision: "R2",
      label: "Alpha",
      description: "Desc",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("blocks duplicate type/revision updates and shows an error toast", () => {
    const updateInstrument = vi.fn();
    const selectProject = vi.fn();
    const onOpenChange = vi.fn();

    mockUseDiagramStore.mockReturnValue({
      fieldConfig: {
        instrumentTypes: ["TypeA"],
        revisions: ["R1"],
      },
      updateInstrument,
      selectProject,
      activeProjectId: "project-1",
      projects: [
        {
          id: "project-1",
          instrument: { type: "TypeA", revision: "R1" },
        },
        {
          id: "project-2",
          instrument: { type: "TypeA", revision: "R1" },
        },
      ],
    });

    renderWithProviders(
      <EditInstrumentDialog
        open
        onOpenChange={onOpenChange}
        project={{
          id: "project-1",
          name: "Project 1",
          instrument: {
            type: "TypeA",
            revision: "R1",
          },
          topics: [],
          selectedTopicId: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        }}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    expect(toastError).toHaveBeenCalledWith(
      'An instrument with type "TypeA" and revision "R1" already exists.',
    );
    expect(updateInstrument).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
