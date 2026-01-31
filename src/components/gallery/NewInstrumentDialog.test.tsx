import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import { NewInstrumentDialog } from "@/components/gallery/NewInstrumentDialog";

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

describe("NewInstrumentDialog", () => {
  beforeEach(() => {
    toastError.mockClear();
    mockUseDiagramStore.mockReset();
  });

  it("renders only when open and validates required fields before creating", () => {
    const createProject = vi.fn(() => "project-1");
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();

    mockUseDiagramStore.mockReturnValue({
      fieldConfig: {
        instrumentTypes: ["TypeA"],
        revisions: ["R1"],
      },
      createProject,
      projects: [],
    });

    const { rerender } = renderWithProviders(
      <NewInstrumentDialog open={false} onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    expect(screen.queryByText("New Instrument")).not.toBeInTheDocument();

    rerender(
      <NewInstrumentDialog open onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeDisabled();

    const [typeCombobox, revisionCombobox] = screen.getAllByRole("combobox");

    fireEvent.click(typeCombobox);
    fireEvent.click(screen.getByText("TypeA"));

    fireEvent.click(revisionCombobox);
    fireEvent.click(screen.getByText("R1"));

    expect(createButton).toBeEnabled();

    fireEvent.click(createButton);

    expect(createProject).toHaveBeenCalledWith({
      type: "TypeA",
      revision: "R1",
      description: undefined,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreated).toHaveBeenCalledWith("project-1");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("prevents duplicate instruments and surfaces an error toast", () => {
    const onOpenChange = vi.fn();
    const onCreated = vi.fn();

    mockUseDiagramStore.mockReturnValue({
      fieldConfig: {
        instrumentTypes: ["TypeA"],
        revisions: ["R1"],
      },
      createProject: vi.fn(),
      projects: [
        {
          id: "existing",
          instrument: { type: "TypeA", revision: "R1" },
        },
      ],
    });

    renderWithProviders(
      <NewInstrumentDialog open onOpenChange={onOpenChange} onCreated={onCreated} />,
    );

    const [typeCombobox, revisionCombobox] = screen.getAllByRole("combobox");

    fireEvent.click(typeCombobox);
    fireEvent.click(screen.getByText("TypeA"));

    fireEvent.click(revisionCombobox);
    fireEvent.click(screen.getByText("R1"));

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toBeEnabled();
    fireEvent.click(createButton);

    expect(toastError).toHaveBeenCalledWith(
      'An instrument with type "TypeA" and revision "R1" already exists.',
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
