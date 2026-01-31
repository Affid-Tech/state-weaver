import Gallery from "@/pages/Gallery";
import { renderWithProviders } from "@/test/renderWithProviders";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("App", () => {
  it("renders the gallery on the root route", () => {
    renderWithProviders(<Gallery />);
    expect(
      screen.getByRole("heading", { name: /instruments/i }),
    ).toBeInTheDocument();
  });
});
