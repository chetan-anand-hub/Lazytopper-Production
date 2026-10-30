// TUTOR-UX-1 (A) — the panel shows the clean caption, never the catalogue rationale.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExplanationPanel from "./ExplanationPanel";

describe("ExplanationPanel image caption", () => {
  it("renders figure reference + concept label as alt and figcaption", () => {
    render(
      <ExplanationPanel
        visual={{
          conceptLabel: "Sign convention (New Cartesian)",
          body: {
            kind: "image",
            url: "/x.webp",
            source: "notes",
            caption: "NCERT Fig 9.9 — literally 'The New Cartesian Sign Convention for spherical mirrors'.",
          },
        }}
        onClose={() => {}}
        onOpenNcert={() => {}}
      />,
    );
    const want = "NCERT Fig 9.9 · Sign convention (New Cartesian)";
    expect(screen.getByRole("img").getAttribute("alt")).toBe(want);
    expect(screen.getByText(want, { selector: "figcaption" })).toBeTruthy();
    expect(screen.queryByText(/literally/)).toBeNull();
  });
});
