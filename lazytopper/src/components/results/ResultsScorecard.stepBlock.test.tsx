/**
 * GRADED-STEP-BLOCK — the per-step block on the universal scorecard shell.
 *
 * WHAT THIS SUITE PINS, AND WHY IT IS FULL DISCIPLINE (ops/AGENT_STANDING_RULES.md):
 * every assertion here encodes a JUDGEMENT, not a framework behaviour.
 *  · that a graded answer carrying steps renders the student's OWN working — the product
 *    promise this lane exists to deliver, and impossible on this shell before it;
 *  · that a graded answer carrying NO steps renders EXACTLY as it did before — the honest
 *    empty state, which is a doctrine rule (CLAUDE.md: absent means unknowable);
 *  · that a HALF mark renders as a half — CBSE awards 0.5 for a correct formula alone, so
 *    rounding it away would misreport a real mark;
 *  · that Chapter Test and Full Mock now EMIT graded answers at all — the founding defect,
 *    which no test in the repo could previously have caught because the field was never set.
 *
 * ★ EVERY POSITIVE ASSERTION IS PAIRED WITH A CONTROL. A "renders nothing" assertion that
 * would also pass against a component that renders nothing ever is worth nothing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultsScorecard, { GRADED_SHEET_ANCHOR_ID, revealGradedSheet } from "./ResultsScorecard";
import {
  chapterTestScorecardVariant,
  fullMockScorecardVariant,
  type ScorecardGradedAnswer,
  type ScorecardVariant,
} from "./scorecardVariants";
import type { CheckSolutionAnnotatedStep, WorksheetGradeResponse } from "../../ai/aiClient";

const step = (over: Partial<CheckSolutionAnnotatedStep> = {}): CheckSolutionAnnotatedStep => ({
  stepNumber: 1,
  description: "State the formula",
  studentWork: "v = u + at",
  status: "correct",
  marksAwarded: 1,
  marksDeducted: 0,
  teacherAnnotation: "Correct formula stated.",
  mistakeType: null,
  correctedWorking: null,
  ...over,
});

const answer = (over: Partial<ScorecardGradedAnswer> = {}): ScorecardGradedAnswer => ({
  label: "Question 1",
  descriptor: "3 marks",
  awarded: 2,
  available: 3,
  ...over,
});

const variant = (over: Partial<ScorecardVariant> = {}): ScorecardVariant => ({
  surface: "chapter-test",
  title: "Light · Test #1",
  subtitle: "CT-S-LIGHT-01 · fully graded",
  score: { kind: "marks", awarded: 2, total: 3, gradedCount: 1, totalQuestions: 1 },
  actions: [],
  ...over,
});

describe("CASE 1 — a graded answer carrying steps renders a per-step block", () => {
  it("renders the student's OWN working, the step marks and the annotation", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [answer({
            steps: [
              step({ stepNumber: 1, description: "State the formula", studentWork: "v = u + at", marksAwarded: 1 }),
              step({
                stepNumber: 2, description: "Substitute", studentWork: "v = 0 + 9.8 x 3",
                status: "incorrect", marksAwarded: 0, marksDeducted: 1,
                teacherAnnotation: "Used 3 s instead of 2 s.",
                correctedWorking: "v = 0 + 9.8 x 2",
              }),
            ],
          })],
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("Your working, step by step")).toBeInTheDocument();
    // THE STUDENT'S OWN WORKING — the thing the scorecard never showed before.
    expect(screen.getByText("v = u + at")).toBeInTheDocument();
    expect(screen.getByText("v = 0 + 9.8 x 3")).toBeInTheDocument();
    expect(screen.getByText("Used 3 s instead of 2 s.")).toBeInTheDocument();
    expect(screen.getByText(/Should be: v = 0 \+ 9\.8 x 2/)).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("−1")).toBeInTheDocument();
  });

  it("★ CONTROL — the SAME shell, the SAME answer, steps removed: none of it renders", () => {
    render(
      <ResultsScorecard
        variant={variant({ gradedAnswers: [answer({ steps: null })] })}
        onClose={() => {}}
      />,
    );
    // The answer itself still renders — this is a control, not an empty page.
    expect(screen.getByText(/Question 1/)).toBeInTheDocument();
    expect(screen.queryByText("Your working, step by step")).not.toBeInTheDocument();
    expect(screen.queryByText("v = u + at")).not.toBeInTheDocument();
  });
});

describe("CASE 2 — a graded answer carrying NO steps renders exactly as before (honest empty state)", () => {
  it("renders NOTHING extra: no heading, no panel, no zeros", () => {
    const { container } = render(
      <ResultsScorecard
        variant={variant({ gradedAnswers: [answer({ steps: null, lostLabel: "Where the mark went:", lostDetail: "Unit missing." })] })}
        onClose={() => {}}
      />,
    );
    expect(container.querySelectorAll(".lt-sc__gsteps")).toHaveLength(0);
    expect(container.querySelectorAll(".lt-sc__gst")).toHaveLength(0);
    // ⚠ "not a placeholder, not an empty panel, not FOUR ZEROS."
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // The rest of the card is untouched.
    expect(screen.getByText("Unit missing.")).toBeInTheDocument();
  });

  it("an EMPTY steps array is indistinguishable from absent — never an empty panel", () => {
    const { container } = render(
      <ResultsScorecard variant={variant({ gradedAnswers: [answer({ steps: [] })] })} onClose={() => {}} />,
    );
    expect(container.querySelectorAll(".lt-sc__gsteps")).toHaveLength(0);
  });
});

describe("CASE 6 — a half mark renders as a HALF: no rounding, no throw", () => {
  it("+0.5 renders as +0.5 — CBSE awards half a mark for the formula alone", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [answer({
            awarded: 0.5, available: 2,
            steps: [step({ marksAwarded: 0.5, status: "partial" })],
          })],
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("+0.5")).toBeInTheDocument();
    expect(screen.getByText(/0\.5 \/ 2/)).toBeInTheDocument();
    // ★ CONTROL against silent rounding: the rounded forms must be ABSENT.
    expect(screen.queryByText("+1")).not.toBeInTheDocument();
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
  });

  it("a half-mark DEDUCTION renders as a half too", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [answer({ steps: [step({ marksAwarded: 0, marksDeducted: 0.5, status: "partial" })] })],
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("−0.5")).toBeInTheDocument();
  });
});

describe("★★ OBJECTIVE — the per-step mark chip is suppressed, the annotations survive", () => {
  it("an objective answer shows no misleading per-step 0, but keeps the working and the note", () => {
    const { container } = render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [answer({
            objective: true, awarded: 0, available: 1,
            steps: [step({ marksAwarded: 0, marksDeducted: 0, teacherAnnotation: "Read the graph the wrong way." })],
          })],
        })}
        onClose={() => {}}
      />,
    );
    expect(container.querySelectorAll(".lt-sc__gst-mk")).toHaveLength(0);
    expect(screen.getByText("Read the graph the wrong way.")).toBeInTheDocument();
    expect(screen.getByText("v = u + at")).toBeInTheDocument();
  });

  it("★ CONTROL — the same step on a NON-objective answer DOES show the chip", () => {
    const { container } = render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [answer({ objective: false, steps: [step({ marksAwarded: 0, marksDeducted: 0 })] })],
        })}
        onClose={() => {}}
      />,
    );
    expect(container.querySelectorAll(".lt-sc__gst-mk")).toHaveLength(1);
  });
});

/* ── The founding defect: CT and FM never emitted a graded answer sheet AT ALL ── */

const gradeResponse = (over: Partial<WorksheetGradeResponse> = {}): WorksheetGradeResponse => ({
  ok: true,
  results: [
    {
      qNumber: 1, couldNotRead: false, ok: true, marksAwarded: 2, totalMarks: 3, percentage: 67,
      teacherNote: "Method right, arithmetic slipped.",
      mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
      annotatedSteps: [
        step({ stepNumber: 1, description: "Formula", studentWork: "s = ut + 1/2 at^2", marksAwarded: 1 }),
        step({
          stepNumber: 2, description: "Substitute", studentWork: "s = 0 + 0.5 x 10 x 9",
          status: "partial", marksAwarded: 1, marksDeducted: 1,
          teacherAnnotation: "t squared should be 4, not 9.",
        }),
      ],
    },
    { qNumber: 2, couldNotRead: true, totalMarks: 2, note: "That page came back blurred." },
  ],
  totalQuestions: 2, gradedCount: 1, pendingCount: 1,
  gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 5,
  ...over,
});

describe("CASE 3 — the read-sheet action SHOWS the block instead of closing the scorecard", () => {
  beforeEach(() => {
    // jsdom has no layout engine; scrollIntoView is not implemented there.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("★★★ CHAPTER TEST now EMITS a graded answer sheet — it emitted NONE before this lane", () => {
    const v = chapterTestScorecardVariant({
      name: "Light · Test #1", code: "CT-S-LIGHT-01", phase: "full",
      response: gradeResponse(), onReadSheet: revealGradedSheet,
    });
    expect(v.gradedAnswers).not.toBeNull();
    expect(v.gradedAnswers).toHaveLength(2);
    expect(v.gradedAnswers?.[0].steps).toHaveLength(2);
    // The unreadable page stays HONEST: a named reason, and NO mark.
    expect(v.gradedAnswers?.[1].ungraded?.reason).toBe("could-not-read");
    expect(v.gradedAnswers?.[1].awarded).toBeUndefined();
  });

  it("★★★ FULL MOCK ships the SAME fix in the SAME lane", () => {
    const v = fullMockScorecardVariant({
      name: "Full Mock #1", code: "FM-01", phase: "full",
      response: gradeResponse(), onReadSheet: revealGradedSheet,
    } as Parameters<typeof fullMockScorecardVariant>[0]);
    expect(v.gradedAnswers).not.toBeNull();
    expect(v.gradedAnswers?.[0].steps).toHaveLength(2);
  });

  it("clicking 'Read my graded answer sheet' SCROLLS TO the sheet — it does NOT close the panel", async () => {
    const onClose = vi.fn();
    const v = chapterTestScorecardVariant({
      name: "Light · Test #1", code: "CT-S-LIGHT-01", phase: "full",
      response: gradeResponse(), onReadSheet: revealGradedSheet,
    });
    const { container } = render(<ResultsScorecard variant={v} onClose={onClose} />);

    const anchor = container.querySelector(`#${GRADED_SHEET_ANCHOR_ID}`);
    expect(anchor).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Read my graded answer sheet/i }));

    // ★★ THE WHOLE POINT: the panel is still open and the student was taken to the sheet.
    expect(onClose).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByText("Your working, step by step")).toBeInTheDocument();
  });

  it("★ CONTROL — onClose is wired and CAN fire, so 'not called' above is a real result", async () => {
    const onClose = vi.fn();
    const v = chapterTestScorecardVariant({
      name: "Light · Test #1", code: "CT-S-LIGHT-01", phase: "full",
      response: gradeResponse(), onReadSheet: revealGradedSheet,
    });
    render(<ResultsScorecard variant={v} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/**
 * ★★ THE PAGE WIRING ITSELF — read from source.
 *
 * WHY SOURCE AND NOT A RENDER: the render tests above build the variant directly, so they
 * would stay green if ChapterTestPage or FullMockPage silently reverted to closing the
 * panel. This is the regression the owner named ("a LOOP. A student cannot get out."), and
 * it lives in the PAGES, not in the shell. Both pages are asserted, because fixing one and
 * not the other is the one-path-fixed-one-not pattern this arc has found seven times.
 */
describe("★★ BOTH surfaces are wired to the sheet, not to a close call", () => {
  const pages = [
    ["ChapterTestPage", readFileSync(resolve(__dirname, "../../pages/ChapterTestPage.tsx"), "utf8")],
    ["FullMockPage", readFileSync(resolve(__dirname, "../../pages/FullMockPage.tsx"), "utf8")],
  ] as const;

  for (const [name, src] of pages) {
    it(`${name} wires onReadSheet to revealGradedSheet`, () => {
      expect(src).toContain("onReadSheet: revealGradedSheet");
    });

    it(`${name} no longer wires onReadSheet to setScorecardOpen(false)`, () => {
      expect(src).not.toContain("onReadSheet: () => setScorecardOpen(false)");
    });

    it(`★ CONTROL — ${name} source really was read (it still closes on the ✕)`, () => {
      // Without this, an empty/unreadable file would pass both assertions above.
      expect(src).toContain("onClose={() => setScorecardOpen(false)}");
    });
  }
});

/**
 * ★★ CAUGHT BY A 1440px SCREENSHOT, NOT BY AN ASSERTION.
 * "Where the mark went" must describe a mark that actually went somewhere. The fallback to
 * the teacher's overall note printed "Where the mark went: Fully correct." on a 2/2 answer,
 * and printed the same sentence twice — once as the verdict, once as the loss — on every
 * other one. Both are visible nonsense and neither was covered by any test in this repo.
 */
describe("★★ 'Where the mark went' never duplicates the verdict, and never appears on full marks", () => {
  const fullMarks: WorksheetGradeResponse = {
    ok: true,
    results: [{
      qNumber: 1, couldNotRead: false, ok: true, marksAwarded: 2, totalMarks: 2, percentage: 100,
      teacherNote: "Fully correct.",
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      annotatedSteps: [step({ status: "correct", marksAwarded: 2, marksDeducted: 0, teacherAnnotation: "" })],
    }],
    totalQuestions: 1, gradedCount: 1, pendingCount: 0,
    gradedMarksAwarded: 2, gradedMarksTotal: 2, worksheetTotalMarks: 2,
  };

  it("a FULL-MARKS chapter-test answer shows no 'Where the mark went' line at all", () => {
    const v = chapterTestScorecardVariant({
      name: "T", code: "CT-1", phase: "full", response: fullMarks, onReadSheet: revealGradedSheet,
    });
    expect(v.gradedAnswers?.[0].lostDetail).toBeNull();
    expect(v.gradedAnswers?.[0].lostLabel).toBeNull();

    render(<ResultsScorecard variant={v} onClose={() => {}} />);
    expect(screen.queryByText(/Where the mark went/)).not.toBeInTheDocument();
    // ★ CONTROL — the note itself still reaches the student, as the verdict.
    expect(screen.getByText("Fully correct.")).toBeInTheDocument();
  });

  it("★ CONTROL — an answer that DID lose a mark still shows the line, from the losing STEP", () => {
    const lost: WorksheetGradeResponse = {
      ...fullMarks,
      results: [{
        ...fullMarks.results[0], marksAwarded: 1,
        annotatedSteps: [step({
          status: "incorrect", marksAwarded: 0, marksDeducted: 1,
          teacherAnnotation: "Unit missing on the final line.",
        })],
      }],
      gradedMarksAwarded: 1,
    };
    const v = chapterTestScorecardVariant({
      name: "T", code: "CT-1", phase: "full", response: lost, onReadSheet: revealGradedSheet,
    });
    render(<ResultsScorecard variant={v} onClose={() => {}} />);
    expect(screen.getByText(/Where the mark went/)).toBeInTheDocument();
    // ★★ and it is the STEP's annotation, NOT the overall note duplicated.
    expect(screen.getAllByText(/Unit missing on the final line\./).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fully correct.")).toHaveLength(1);
  });
});
