// CBQ-1 PR-2 — the setup legend shows the paper's real CBQ share, and the honest short note
// appears exactly when the paper is short (never otherwise).
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CbqShareNote } from "./CbqShareNote";

afterEach(cleanup);

const base = { totalMarks: 80, plainMcqMarks: 16, scope: "subject" as const, scopeName: "Science" };

describe("CbqShareNote", () => {
  it("states the real share against the ≥ 50% target and CBSE's 50 / 20 / 30 pattern, and no short note when the paper meets it", () => {
    render(<CbqShareNote {...base} cbqMarks={41} cbqShortfall={0} constructedMarks={23} />);
    const el = screen.getByTestId("cbq-share");
    expect(el.textContent).toContain("CBQ marks: 41 of 80 · target ≥ 50%");
    expect(el.textContent).toContain("16 marks of plain MCQs and 23 marks of short / long answers. CBSE pattern: 50% competency, 20% MCQ, 30% constructed.");
    // "≥" is our target, never attributed to CBSE (Acad-30/2024 says "= 50%").
    expect(el.textContent).not.toMatch(/CBSE[^.]*≥/);
    expect(screen.queryByTestId("cbq-share-short")).toBeNull();
    expect(el.getAttribute("style")).toBeNull();
  });

  it("CONTROL — a short paper shows its real number and the calm honest note", () => {
    render(<CbqShareNote {...base} scopeName="Maths" cbqMarks={18} cbqShortfall={22} constructedMarks={46} />);
    expect(screen.getByTestId("cbq-share").textContent).toContain("CBQ marks: 18 of 80");
    expect(screen.getByTestId("cbq-share-short").textContent).toBe(
      "The Maths bank doesn’t have enough competency-based questions yet to fill half the marks, so this paper uses every competency-based question that fits its CBSE unit plan and completes the rest with real board-style questions. More are being added.",
    );
    // Never the unqualified claim: the Full Mock swaps only within a section x CBSE unit.
    expect(screen.getByTestId("cbq-share-short").textContent).not.toContain("every one we have");
  });

  it("names the chapter on a Chapter Test", () => {
    render(
      <CbqShareNote
        totalMarks={32}
        plainMcqMarks={6}
        constructedMarks={26}
        cbqMarks={0}
        cbqShortfall={16}
        scope="chapter"
        scopeName="Triangles"
      />,
    );
    expect(screen.getByTestId("cbq-share-short").textContent).toBe(
      "Triangles doesn’t have enough competency-based questions yet to fill half the marks, so this test uses every competency-based question that fits its sections and completes the rest with real board-style questions. More are being added.",
    );
  });
});
