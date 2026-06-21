import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

// PR-E2a.1 FIX 1 — the worksheet PDF must render REAL math symbols (via
// MathText/KaTeX), never the old jsPDF-ASCII output (√→"sqrt", unmappable→"?").
// Runs in CI/Codespaces vitest; not in the Windows-local quality-gate matrix.

afterEach(cleanup);

const ws: PersistedWorksheet = {
  worksheetId: "ws-test",
  createdAt: "2026-06-20T00:00:00Z",
  title: "Real Numbers — Board exam mix",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All sections (A–E)",
  totalMarks: 4,
  questions: [
    {
      qNumber: 1,
      id: "q1",
      subject: "Maths",
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      section: "A",
      // Unicode math exactly as the bank stores it (√, ², − U+2212).
      questionText: "Prove that 3 + 2√5 is irrational; also note a² − b² factorises.",
      marks: 1,
    },
    {
      qNumber: 2,
      id: "q2",
      subject: "Maths",
      topicKey: "real-numbers",
      topicLabel: "Real Numbers",
      section: "C",
      // Bare-ASCII "sqrt5" must be UPGRADED by MathText, never left literal.
      questionText: "Evaluate sqrt5 + sqrt2.",
      marks: 3,
      solutionSteps: ["√5 and √2 are surds", "Sum stays irrational"],
      finalAnswer: "√5 + √2",
    },
  ],
};

describe("WorksheetPrintDoc — real math symbols (FIX 1)", () => {
  it("questions render unicode math; no ASCII 'sqrt5' / no '?' placeholders", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="questions" />);
    const text = container.textContent || "";
    expect(text).toContain("√"); // real root glyph from the unicode question
    expect(text).toContain("²"); // real superscript
    expect(text).not.toMatch(/\bsqrt\d/); // "sqrt5" must be converted, not literal
    expect(text).not.toContain("?"); // no mojibake placeholder
  });

  it("answer key renders the badge + step solutions with symbols", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="answers" />);
    const text = container.textContent || "";
    expect(text.toLowerCase()).toContain("answer key");
    expect(text).toContain("√");
    expect(text).not.toContain("?");
  });

  it("mounts as the #print-area (so print.css shows only it)", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="questions" />);
    expect(container.querySelector("#print-area")).not.toBeNull();
  });
});
