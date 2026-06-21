import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// PR-E2a.1/.2 — the worksheet doc must render REAL math symbols (MathText/KaTeX),
// never the old jsPDF-ASCII output (√→"sqrt", unmappable→"?"), AND must render
// EVERY persisted question (count identity: header === array === rendered, the
// number the PDF then captures). Runs in CI/Codespaces vitest.

afterEach(cleanup);

function makeWs(n: number): PersistedWorksheet {
  return {
    worksheetId: "ws-test",
    createdAt: "2026-06-20T00:00:00Z",
    title: "Real Numbers — Board exam mix",
    subject: "Maths",
    grade: "10",
    sectionFilter: "All sections (A–E)",
    totalMarks: n,
    questions: Array.from({ length: n }).map((_, i) => ({
      qNumber: i + 1,
      id: `q${i + 1}`,
      subject: "Maths",
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      section: i % 2 === 0 ? "A" : "C",
      // Unicode math as the bank stores it (√, ², − U+2212) + a bare-ASCII "sqrt".
      questionText: `Q${i + 1}: prove 3 + 2√5 irrational; a² − b²; evaluate sqrt2.`,
      marks: 1,
      solutionSteps: ["√5 is a surd", "Sum stays irrational"],
      finalAnswer: "√5 + √2",
    })),
  };
}

describe("WorksheetPrintDoc — real math symbols (FIX 1)", () => {
  it("renders unicode math; no ASCII 'sqrt2' / no '?' placeholders", () => {
    const { container } = render(<WorksheetPrintDoc ws={makeWs(2)} kind="questions" />);
    const text = container.textContent || "";
    expect(text).toContain("√");
    expect(text).toContain("²");
    expect(text).not.toMatch(/\bsqrt\d/);
    expect(text).not.toContain("?");
  });

  it("answer key renders the badge + step solutions with symbols", () => {
    const { container } = render(<WorksheetPrintDoc ws={makeWs(2)} kind="answers" />);
    const text = container.textContent || "";
    expect(text.toLowerCase()).toContain("answer key");
    expect(text).toContain("√");
    expect(text).not.toContain("?");
  });
});

describe("WorksheetPrintDoc — count identity (FIX 2)", () => {
  it("renders EXACTLY ws.questions.length question blocks (header === array === rendered)", () => {
    const ws = makeWs(25);
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="questions" />);
    expect(container.querySelectorAll(".lt-wsp__q").length).toBe(ws.questions.length);
    expect(container.textContent).toContain(`${ws.questions.length} questions`);
  });

  it("answer key renders one solution block per question", () => {
    const ws = makeWs(25);
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="answers" />);
    expect(container.querySelectorAll(".lt-wsp__sol").length).toBe(ws.questions.length);
  });

  it("a thin worksheet (6) renders 6 — never an inflated count", () => {
    const ws = makeWs(6);
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="questions" />);
    expect(container.querySelectorAll(".lt-wsp__q").length).toBe(6);
    expect(container.textContent).toContain("6 questions");
  });
});
