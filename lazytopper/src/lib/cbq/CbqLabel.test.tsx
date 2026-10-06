// CBQ-1 PR-1 — the visible CBQ label renders iff isCbq.
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CbqLabel } from "./CbqLabel";

afterEach(cleanup);

describe("CbqLabel", () => {
  it("shows 'CBQ' with an accessible name for a verified CBQ", () => {
    render(<CbqLabel question={{ competencyVerified: true, marks: 2 }} />);
    const el = screen.getByTestId("cbq-label");
    expect(el.textContent).toBe("CBQ");
    expect(el.getAttribute("aria-label")).toBe("Competency-based question");
    expect(el.className).toBe("lt-cbq-label");
    expect(el.getAttribute("style")).toBeNull(); // class-driven, no inline style
  });

  it("CONTROL — renders nothing for a legacy isCompetencyBased-only row", () => {
    const { container } = render(
      <CbqLabel question={{ marks: 4, isCompetencyBased: true } as { marks: number }} />,
    );
    expect(container.innerHTML).toBe("");
    expect(screen.queryByTestId("cbq-label")).toBeNull();
  });
});
