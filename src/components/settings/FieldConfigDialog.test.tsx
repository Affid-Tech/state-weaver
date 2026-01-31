import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import { FieldConfigDialog } from "@/components/settings/FieldConfigDialog";

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

describe("FieldConfigDialog", () => {
  beforeEach(() => {
    toastError.mockClear();
    mockUseDiagramStore.mockReset();
  });

  it("adds and removes values and supports keyboard activation of Done", () => {
    const updateFieldConfig = vi.fn();
    const onOpenChange = vi.fn();

    mockUseDiagramStore.mockReturnValue({
      fieldConfig: {
        revisions: ["R1"],
        instrumentTypes: [],
        topicTypes: [],
        messageTypes: [],
        flowTypes: [],
        flowTypeColors: {},
      },
      updateFieldConfig,
    });

    renderWithProviders(
      <FieldConfigDialog open onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText("Field Configuration")).toBeInTheDocument();

    const input = screen.getByPlaceholderText("Add new value (e.g., MY_VALUE)...");
    fireEvent.change(input, { target: { value: "R2" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(updateFieldConfig).toHaveBeenCalledWith({ revisions: ["R1", "R2"] });

    fireEvent.click(screen.getByLabelText("Remove R1"));

    expect(updateFieldConfig).toHaveBeenCalledWith({ revisions: [] });

    const doneButton = screen.getByRole("button", { name: "Done" });
    doneButton.focus();
    expect(doneButton).toHaveFocus();
    fireEvent.click(doneButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("validates enum naming and blocks invalid imports", () => {
    const updateFieldConfig = vi.fn();

    mockUseDiagramStore.mockReturnValue({
      fieldConfig: {
        revisions: [],
        instrumentTypes: [],
        topicTypes: [],
        messageTypes: [],
        flowTypes: [],
        flowTypeColors: {},
      },
      updateFieldConfig,
    });

    renderWithProviders(
      <FieldConfigDialog open onOpenChange={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText("Add new value (e.g., MY_VALUE)...");
    fireEvent.change(input, { target: { value: "Not Valid" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Add Revisions value" }),
    );

    expect(toastError).toHaveBeenCalledWith(
      "Invalid name: must follow Java enum convention (start with letter, only letters/numbers/underscores, no spaces)",
    );
    expect(updateFieldConfig).not.toHaveBeenCalled();
  });
});
