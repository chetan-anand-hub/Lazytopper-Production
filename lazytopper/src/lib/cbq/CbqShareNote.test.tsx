// CBQ-1 PR-2 — the setup legend shows the paper's real CBQ share, and the honest short note
// appears exactly when the paper is short (never otherwise).
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CbqShareNote } from "./CbqShareNote";

afterEach(cleanup);

const base = { totalMarks: 80, plainMcqMarks: 16, scope: "subject" as const, scopeName: "Science" };

describe("CbqShareNote", () => {
  it("states the real share against CBSE's 50%, and no short note when the paper meets it", () => {
    render(<CbqShareNote {...base} cbqMarks={41} cbqShortfall={0} constructedMarks={23} />);
    const el = screen.getByTestId("cbq-share");
    expect(el.textContent).toContain("CBQ marks: 41 of 80 (CBSE: ≥ 50%)");
    expect(el.textContent).toContain("16 marks of plain MCQs and 23 marks of short / long answers (CBSE: 20% and 30%)");
    expect(screen.queryByTestId("cbq-share-short")).toBeNull();
    expect(el.getAttribute("style")).toBeNull();
  });

  it("CONTROL — a short paper shows its real number and the calm honest note", () => {
    render(<CbqShareNote {...base} scopeName="Maths" cbqMarks={18} cbqShortfall={22} constructedMarks={46} />);
    expect(screen.getByTestId("cbq-share").textContent).toContain("CBQ marks: 18 of 80");
    expect(screen.getByTestId("cbq-share-short").textContent).toContain("The Maths bank doesn’t have enough");
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
    expect(screen.getByTestId("cbq-share-short").textContent).toMatch(/^Triangles doesn’t have enough competency-based questions yet/);
  });
});
