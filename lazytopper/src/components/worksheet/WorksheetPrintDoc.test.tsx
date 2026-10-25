import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import { loadKatex } from "../question/MathText";

// LOW-END-1 (L6): KaTeX is fetched on demand; this suite pins the rendered print doc.
await loadKatex();
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
    // The closing "Wrote your own answer?" box is real copy with a question mark; every other "?" would be a placeholder.
    const cta = container.querySelector(".lt-wsp__cta")?.textContent ?? "";
    expect(cta).toContain("Wrote your own answer?");
    expect(text.replace(cta, "")).not.toContain("?");
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

describe("WorksheetPrintDoc — WORKSHEET-FIX-2: one option label, no printed source tag", () => {
  const wsWith = (questionText: string, options: string[]): PersistedWorksheet => ({
    ...makeWs(1),
    questions: [{ ...makeWs(1).questions[0], questionText, options }],
  });

  it("an option that already carries its own letter prints ONE label: '(a) 77/6', not '(a) (A) 77/6'", () => {
    const { container } = render(<WorksheetPrintDoc ws={wsWith("Area of the sector?", ["(A) 77/6 cm", "B) 154/6 cm", "(C) 49/6 cm", "D. 98/6 cm"])} kind="questions" />);
    const lis = Array.from(container.querySelectorAll(".lt-wsp__opts li")).map((li) => li.textContent?.replace(/\s+/g, " ").trim());
    expect(lis).toEqual(["(a) 77/6 cm", "(b) 154/6 cm", "(c) 49/6 cm", "(d) 98/6 cm"]);
  });

  it("CONTROL (verifier): a statement-combination MCQ keeps its options whole: \"(a) and (b)\" is content, not a label", () => {
    const { container } = render(<WorksheetPrintDoc ws={wsWith("Which statements are correct?", ["(a) and (b)", "(a) and (c)", "(a), (b) and (c)", "all"])} kind="questions" />);
    const lis = Array.from(container.querySelectorAll(".lt-wsp__opts li")).map((li) => li.textContent?.replace(/\s+/g, " ").trim());
    expect(lis).toEqual(["(a) (a) and (b)", "(b) (a) and (c)", "(c) (a), (b) and (c)", "(d) all"]);
  });

  it("the answer key does not print a source tag either (steps and final answer)", () => {
    const ws = makeWs(1);
    ws.questions[0] = { ...ws.questions[0], solutionSteps: ["Step one [Delhi 2017]"], finalAnswer: "42 [All India 2016]" };
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="answers" />);
    const text = container.textContent || "";
    expect(text).toContain("Step one");
    expect(text).toContain("42");
    expect(text).not.toMatch(/Delhi 2017|All India 2016/);
  });

  it("CONTROL: plain options are unchanged", () => {
    const { container } = render(<WorksheetPrintDoc ws={wsWith("Pick one", ["77/6 cm", "154/6 cm"])} kind="questions" />);
    const lis = Array.from(container.querySelectorAll(".lt-wsp__opts li")).map((li) => li.textContent?.replace(/\s+/g, " ").trim());
    expect(lis).toEqual(["(a) 77/6 cm", "(b) 154/6 cm"]);
  });

  it("a trailing exam-source tag is not printed; other bracketed text stays", () => {
    const { container } = render(<WorksheetPrintDoc ws={wsWith("Why does it take food? [All India 2017]", [])} kind="questions" />);
    const text = container.textContent || "";
    expect(text).toContain("Why does it take food?");
    expect(text).not.toContain("All India");
    const keep = render(<WorksheetPrintDoc ws={wsWith("Find x [in cm]", [])} kind="questions" />);
    expect(keep.container.textContent).toContain("[in cm]");
  });
});

describe("WorksheetPrintDoc - PDF-REBRAND-1: source tag, chips, key box", () => {
  const withQ = (extra: Record<string, unknown>): PersistedWorksheet => {
    const base = makeWs(1);
    return { ...base, questions: [{ ...base.questions[0], ...extra } as never] };
  };
  const tag = (ws: PersistedWorksheet) => render(<WorksheetPrintDoc ws={ws} kind="questions" />).container.querySelector(".lt-wsp__src")?.textContent ?? null;

  it("a past-board row shows 'CBSE <year> · Set <set>'", () => {
    expect(tag(withQ({ pyqYear: "2023", pyqSet: "1" }))).toBe("CBSE 2023 · Set 1");
  });
  it("a row with a year but no set shows 'CBSE <year>' only", () => {
    expect(tag(withQ({ pyqYear: "2024" }))).toBe("CBSE 2024");
  });
  it("a sourceOverride 'others' row shows NO tag, even with a year; a row with no year shows none", () => {
    expect(tag(withQ({ pyqYear: "2023", pyqSet: "2", sourceOverride: "others" }))).toBeNull();
    cleanup();
    expect(tag(withQ({}))).toBeNull();
  });

  it("the answer key turns each step's own '[N mark]' prefix into a chip and the 'Answer:' line stays", () => {
    const { container } = render(<WorksheetPrintDoc ws={withQ({ marks: 2, section: "B", solutionSteps: ["[1 mark] Assume the contrary", "[1 mark] Contradiction"], finalAnswer: "irrational" })} kind="answers" />);
    const chips = Array.from(container.querySelectorAll(".lt-wsp__chip")).map((c) => c.textContent);
    expect(chips).toEqual(["1 mark", "1 mark"]);
    expect(container.querySelector(".lt-wsp__steptext")?.textContent).toBe("Assume the contrary");
    expect(container.querySelector(".lt-wsp__final")?.textContent).toContain("Answer: irrational");
  });
  it("a step that ends '[1]' or '[\u00bd]' (the bank's own style) gets that mark as its chip and the bracket leaves the text", () => {
    const { container } = render(<WorksheetPrintDoc ws={withQ({ marks: 2, section: "B", solutionSteps: ["6 = 2 \u00d7 3 [\u00bd]", "LCM = 60 [1]", "keep a[1] as it is"] })} kind="answers" />);
    expect(Array.from(container.querySelectorAll(".lt-wsp__chip")).map((c) => c.textContent).filter(Boolean)).toEqual(["0.5 marks", "1 mark"]);
    const texts = Array.from(container.querySelectorAll(".lt-wsp__steptext")).map((e) => e.textContent);
    expect(texts[0]).toBe("6 = 2 \u00d7 3");
    expect(texts[1]).toBe("LCM = 60");
    expect(texts[2]).toContain("a[1]");
  });
  it("an objective question's steps get no split chips (0-or-full on the answer alone)", () => {
    const { container } = render(<WorksheetPrintDoc ws={withQ({ marks: 1, options: ["1", "2"], solutionSteps: ["a", "b", "c"], finalAnswer: "(a) 1" })} kind="answers" />);
    expect(Array.from(container.querySelectorAll(".lt-wsp__chip")).every((c) => (c.textContent ?? "") === "")).toBe(true);
  });
  it("every answer key ends with the 'Wrote your own answer?' box; a question paper does not", () => {
    expect(render(<WorksheetPrintDoc ws={makeWs(2)} kind="answers" />).container.textContent).toContain("Wrote your own answer? Get it marked step by step.");
    cleanup();
    expect(render(<WorksheetPrintDoc ws={makeWs(2)} kind="questions" />).container.querySelector(".lt-wsp__cta")).toBeNull();
  });
  it("watermark=false removes the tiled watermark; the default keeps it", () => {
    expect(render(<WorksheetPrintDoc ws={makeWs(1)} kind="questions" watermark={false} />).container.querySelector(".lt-wsp__wm")).toBeNull();
    cleanup();
    expect(render(<WorksheetPrintDoc ws={makeWs(1)} kind="questions" />).container.querySelector(".lt-wsp__wm")).not.toBeNull();
  });
});
