/**
 * MATH-RENDER-2 — grader FEEDBACK strings render through the shared maths renderer.
 *
 * The step fields (description / studentWork / teacherAnnotation / correctedWorking) already
 * went through <MathText>; the feedback strings around them (scorecard verdict and "where the
 * mark went", the examiner note on the printed sheets, the practice card's notes, since removed) were printed raw, so `x^2` showed as `x^2` and `\(\sqrt{169}\)` as its source.
 *
 * Each case mounts the REAL component. KaTeX is loaded up front (`loadKatex`) so MathText
 * renders synchronously, exactly as it does on a page that has already fetched the chunk.
 *
 * ★ Every positive case has a CONTROL: plain prose must come out byte-identical (no `.katex`
 * node, same text), so the wrap cannot be "proved" by a renderer that mangles everything.
 *
 * NOTE ON NOTATION. The inputs use the shorthand MathText already promotes (`x^2`, `sqrt{169}`,
 * `\(...\)`, `\theta`). `sqrt(169)`, `x^(n-1)` and a bare `theta` are NOT promoted by MathText
 * today (they render as plain text before and after this lane); that is a renderer-grammar
 * question, not a wrapping one, and is deliberately not pinned here.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false,
    daysLeftInTrial: 0, status: { tier: "free" }, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/practiceInsights", () => ({ recordAttempt: () => "logged" }));
vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: async () => ({ outcome: "logged", bridged: false }),
  isSavedOutcome: () => true,
}));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("../question/QuestionVisualAid", () => ({ QuestionVisualAid: () => null }));
vi.mock("../../diagrams/SolutionFigure", () => ({ default: () => null }));

import ResultsScorecard from "./ResultsScorecard";
import type { ScorecardGradedAnswer, ScorecardVariant } from "./scorecardVariants";
import { loadKatex } from "../question/MathText";
import { WorksheetGradedPrintDoc } from "../worksheet/WorksheetGradedPrintDoc";
import { CheckImproveGradedPrintDoc } from "../checkimprove/CheckImproveGradedPrintDoc";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";

// Realistic grader feedback carrying maths in the forms MathText renders.
const VERDICT = "Correct method: x^2 - 5x + 6 = 0 factorises, but one root was dropped.";
const LOST = "The step sqrt{169} = 13 is right; the final line omits the negative root.";
const NOTE = "Good start. Use \\(\\sin\\theta = \\frac{1}{2}\\) to get \\(\\theta = 30^\\circ\\), then sqrt{3} for the height.";
const PROSE = "Clear working, every step shown, units stated correctly.";

beforeAll(async () => {
  await loadKatex();
});
afterEach(cleanup);

/** The visible text must carry no raw shorthand / LaTeX source. */
function expectRendered(el: Element | null) {
  expect(el, "feedback element must be present").not.toBeNull();
  expect(el!.querySelectorAll(".katex").length).toBeGreaterThan(0);
  // Visible text only: KaTeX keeps the TeX source in a hidden <annotation>; drop it.
  const clone = el!.cloneNode(true) as Element;
  clone.querySelectorAll("annotation, .katex-mathml").forEach((n) => n.remove());
  const text = clone.textContent ?? "";
  expect(text).not.toMatch(/sqrt[({]/);
  expect(text).not.toContain("\\(");
  expect(text).not.toContain("\\frac");
  expect(text).not.toContain("^2");
}

function expectPlain(el: Element | null, prose: string) {
  expect(el).not.toBeNull();
  expect(el!.querySelectorAll(".katex")).toHaveLength(0);
  expect(el!.textContent).toContain(prose);
}

// ── ResultsScorecard (Chapter Test / Full Mock / Worksheet / Quick Practice scorecard) ──
const answer = (over: Partial<ScorecardGradedAnswer> = {}): ScorecardGradedAnswer => ({
  label: "Question 4",
  descriptor: "3 marks",
  awarded: 2,
  available: 3,
  verdict: VERDICT,
  lostLabel: "Where the mark went:",
  lostDetail: LOST,
  steps: null,
  ...over,
});
const variant = (a: ScorecardGradedAnswer): ScorecardVariant => ({
  surface: "chapter-test",
  title: "Quadratic Equations · Test #1",
  subtitle: "CT-M-QUAD-01 · fully graded",
  score: { kind: "marks", awarded: 2, total: 3, gradedCount: 1, totalQuestions: 1 },
  actions: [],
  gradedAnswers: [a],
});

describe("ResultsScorecard — verdict and lostDetail", () => {
  it("renders maths in the verdict and the lost-marks line", () => {
    const { baseElement } = render(<ResultsScorecard variant={variant(answer())} onClose={() => {}} />);
    expectRendered(baseElement.querySelector(".lt-sc__ga-verdict"));
    const lost = baseElement.querySelector(".lt-sc__ga-lost");
    expectRendered(lost);
    // The label still precedes the detail.
    expect(lost!.textContent).toMatch(/^Where the mark went: /);
  });

  it("CONTROL — plain prose is unchanged; an absent verdict/lostDetail renders nothing", () => {
    const { baseElement, unmount } = render(
      <ResultsScorecard variant={variant(answer({ verdict: PROSE, lostDetail: PROSE }))} onClose={() => {}} />,
    );
    expectPlain(baseElement.querySelector(".lt-sc__ga-verdict"), PROSE);
    expect(baseElement.querySelector(".lt-sc__ga-verdict")!.textContent).toBe(PROSE);
    expectPlain(baseElement.querySelector(".lt-sc__ga-lost"), PROSE);
    unmount();
    const r2 = render(
      <ResultsScorecard variant={variant(answer({ verdict: undefined, lostDetail: undefined }))} onClose={() => {}} />,
    );
    expect(r2.baseElement.querySelector(".lt-sc__ga-verdict")).toBeNull();
    expect(r2.baseElement.querySelector(".lt-sc__ga-lost")).toBeNull();
  });
});

// ── WorksheetGradedPrintDoc (Worksheet / Chapter Test / Full Mock graded PDF) ──
function ws(): PersistedWorksheet {
  return {
    questions: [{ qNumber: 1, section: "C", marks: 3, questionText: "Solve x^2 - 5x + 6 = 0.", solutionSteps: ["Factorise"], finalAnswer: "2, 3" }],
    totalMarks: 3,
    createdAt: "2026-08-16T00:00:00.000Z",
  } as unknown as PersistedWorksheet;
}
function resp(r: WorksheetQuestionGrade): WorksheetGradeResponse {
  return {
    ok: true, results: [r], totalQuestions: 1, gradedCount: 1, pendingCount: 0,
    gradedMarksAwarded: Number(r.marksAwarded) || 0, gradedMarksTotal: 3, worksheetTotalMarks: 3,
  };
}
const wsStep = {
  stepNumber: 1, description: "Factorise", studentWork: "(x - 2)(x - 3) = 0", status: "incorrect" as const,
  marksAwarded: 1, marksDeducted: 1, teacherAnnotation: "One root dropped", mistakeType: "calculation" as const,
  correctedWorking: "x = 2 or x = 3",
};
function paintWs(r: WorksheetQuestionGrade) {
  return render(<WorksheetGradedPrintDoc ws={ws()} response={resp(r)} name="Test Student" code="WS-01" coaching="Coaching line." />);
}

describe("WorksheetGradedPrintDoc — teacherNote (with steps, and the no-steps fallback)", () => {
  it("renders maths in the examiner note beside annotated steps", () => {
    const { container } = paintWs({ qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 2, teacherNote: NOTE, annotatedSteps: [wsStep] as never });
    expectRendered(container.querySelector(".lt-gp__fb"));
  });

  it("renders maths in the no-steps fallback note", () => {
    const { container } = paintWs({ qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 2, teacherNote: NOTE });
    expectRendered(container.querySelector(".lt-gp__fb"));
  });

  it("CONTROL — prose note unchanged; no note ⇒ the fixed fallback sentence, unchanged", () => {
    const a = paintWs({ qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 2, teacherNote: PROSE });
    expectPlain(a.container.querySelector(".lt-gp__fb"), PROSE);
    expect(a.container.querySelector(".lt-gp__fb")!.textContent).toBe(PROSE);
    a.unmount();
    const b = paintWs({ qNumber: 1, couldNotRead: false, totalMarks: 3, marksAwarded: 2 });
    expect(b.container.querySelector(".lt-gp__fb")!.textContent).toBe("Graded against the marking scheme.");
  });
});

// ── CheckImproveGradedPrintDoc (C&I single + multi graded sheet / PDF) ──
function paintCi(teacherNote: string | undefined) {
  return render(
    <CheckImproveGradedPrintDoc
      code="CI-M-QUAD-01"
      name="Quadratic Equations · Check & Improve"
      questions={[{ qNumber: 1, questionText: "Solve x^2 - 5x + 6 = 0.", totalMarks: 3, marksAwarded: 2, annotatedSteps: [wsStep] as never, teacherNote }]}
      gradedMarksAwarded={2}
      gradedMarksTotal={3}
      pendingCount={0}
      coaching="Coaching line."
    />,
  );
}

describe("CheckImproveGradedPrintDoc — teacherNote", () => {
  it("renders maths in the examiner note", () => {
    const { container } = paintCi(NOTE);
    expectRendered(container.querySelector(".lt-cigp__notet"));
  });

  it("CONTROL — prose unchanged; no note ⇒ no note block", () => {
    const a = paintCi(PROSE);
    expectPlain(a.container.querySelector(".lt-cigp__notet"), PROSE);
    expect(a.container.querySelector(".lt-cigp__notet")!.textContent).toBe(PROSE);
    a.unmount();
    const b = paintCi(undefined);
    expect(b.container.querySelector(".lt-cigp__note")).toBeNull();
  });
});
