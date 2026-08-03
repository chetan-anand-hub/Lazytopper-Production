import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { CheckSolutionResponse } from "../../ai/aiClient";

/**
 * SolutionChecker CONTRACT TESTS — the replacement for the blanket FORBIDDEN ban.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `check_improve_convergence_acceptance.mjs` listed
 * `lazytopper/src/components/question/SolutionChecker.tsx` in its FORBIDDEN array, so
 * ANY pull request that touched the file failed the gate. The owner's reason, recorded
 * in that array's comment, was two-part:
 *
 *   "the solution checker engine ... shouldn't at all be changed"
 *   "SolutionChecker - shares EquationInput; the whole autoGrow default-off proof
 *    exists so THIS file can stay byte-identical."
 *
 * A blanket ban says "something here must not change" without ever saying WHAT. These
 * tests make it explicit, following the #519 (DesktopShell.tsx) and PR-C1
 * (checkSolution.cjs) precedent: the protection changes FORM, it does not disappear.
 *
 * WHAT WAS ACTUALLY UNPROTECTED BEFORE
 * ------------------------------------
 * The convergence gate's section 7 AUTOGROW block asserts a REGEX over the source of
 * `EquationInput.tsx` (that `autoGrow?: boolean` is declared and that it
 * `= false`-defaults). It asserts NOTHING about SolutionChecker: not that this file
 * declines to opt in, and not one line of its rendered behaviour. `EquationInput.test.tsx`
 * covers the palette, typing round-trip and the disabled state -- again, nothing about
 * this component. So before this file, the FORBIDDEN entry was the ENTIRE protection,
 * and it protected by refusal rather than by knowing what mattered.
 *
 * THE EquationInput / autoGrow RELATIONSHIP, TRACED
 * -------------------------------------------------
 * SolutionChecker's "Type my working" panel mounts the shared <EquationInput> and
 * deliberately passes NO `autoGrow` and NO `maxRows`:
 *
 *     <EquationInput value={textAnswer} onChange={setTextAnswer}
 *                    placeholder="..." rows={4}
 *                    ariaLabel="Type your working and answer" />
 *
 * Inside EquationInput, `autoGrow = false` and `maxRows` is undefined. Two things follow,
 * and BOTH would change here without SolutionChecker changing one byte if the shared
 * default ever flipped on:
 *
 *   1. the textarea class becomes `lt-eq__textarea lt-eq__textarea--grow`, and
 *      `.lt-eq__textarea--grow { resize: none; }` -- the student loses the resize handle
 *      on the box they type long working into;
 *   2. the `useLayoutEffect` stops early-returning and clamps the height to
 *      `[rows, maxRows ?? rows]`. Because this consumer passes no `maxRows`, that range
 *      collapses to `[4, 4]`: the box is PINNED at four rows and can never grow, while
 *      `overflowY` is forced. A non-resizable, non-growing four-row box is strictly worse
 *      than what ships today.
 *
 * That is the concrete regression the ban was buying. It is pinned below, with a positive
 * control so the assertion cannot pass vacuously if the class name is ever renamed.
 *
 * SCOPE NOTE: `ResultsScorecard.tsx` REMAINS BANNED by deliberate owner decision. This
 * file replaces the protection for SolutionChecker only.
 */

// ---------------------------------------------------------------------------
// Mocks. The real <EquationInput> is DELIBERATELY NOT mocked -- it is the subject of the
// autoGrow assertions and a stub would assert nothing.
// ---------------------------------------------------------------------------

const checkSolutionImage = vi.fn();
const recordMistake = vi.fn();
const recordAttempt = vi.fn();
const qrProps = vi.fn();

vi.mock("../../ai/aiClient", () => ({
  checkSolutionImage: (...args: unknown[]) => checkSolutionImage(...args),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }),
}));

vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: (...args: unknown[]) => recordMistake(...args),
  isSavedOutcome: (outcome: string) => outcome === "logged" || outcome === "duplicate",
}));

vi.mock("../../services/practiceInsights", () => ({
  recordAttempt: (...args: unknown[]) => recordAttempt(...args),
}));

// Stubbed so the QR mount's PROPS are observable -- the assertion is on what
// SolutionChecker passes, which is exactly the contract point.
vi.mock("../qr/QrAnswerHandoff", () => ({
  default: (props: Record<string, unknown>) => {
    qrProps(props);
    return <div data-testid="qr-handoff" data-mode={String(props.mode)} />;
  },
}));

import { SolutionChecker } from "./SolutionChecker";
import { EquationInput } from "../equation";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_PROPS = {
  question: "Prove that sin^2(x) + cos^2(x) = 1",
  marks: 3,
  subject: "Maths",
  topic: "introduction-to-trigonometry",
};

function gradedResponse(over: Partial<CheckSolutionResponse> = {}): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [
      {
        stepNumber: 1,
        description: "State the Pythagorean identity",
        studentWork: "sin^2 x + cos^2 x",
        status: "partial",
        marksAwarded: 1,
        marksDeducted: 0,
        teacherAnnotation: "State the identity before using it",
        mistakeType: "presentation",
        correctedWorking: "sin^2 x + cos^2 x = 1",
      },
    ],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
    teacherNote: "Good structure, name the identity you invoke.",
    ...over,
  };
}

/** The one textarea SolutionChecker's "Type my working" panel mounts. */
function typePanelTextarea(): HTMLTextAreaElement {
  return screen.getByLabelText("Type your working and answer") as HTMLTextAreaElement;
}

function openTypeTab(): void {
  fireEvent.click(screen.getByRole("tab", { name: "Type my working" }));
}

beforeEach(() => {
  localStorage.clear();
  checkSolutionImage.mockReset();
  recordMistake.mockReset();
  recordAttempt.mockReset();
  qrProps.mockReset();
  checkSolutionImage.mockResolvedValue(gradedResponse());
  recordMistake.mockResolvedValue({ outcome: "logged", bridged: false });
  recordAttempt.mockReturnValue("logged");
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1 - THE EquationInput / autoGrow RELATIONSHIP (the reason the ban existed)
// ---------------------------------------------------------------------------

describe("SolutionChecker x EquationInput -- the autoGrow default-off contract", () => {
  it("mounts the shared EquationInput in NON-autoGrow mode (no --grow class, so resize:vertical survives)", () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    const ta = typePanelTextarea();
    expect(ta.className).toBe("lt-eq__textarea");
    expect(ta.classList.contains("lt-eq__textarea--grow")).toBe(false);
  });

  it("POSITIVE CONTROL -- the same EquationInput DOES take the --grow class when autoGrow is on", () => {
    // Without this control the assertion above would keep passing if `--grow` were
    // renamed or deleted, i.e. it would become a check that inspects nothing.
    render(
      <EquationInput value="" onChange={() => {}} autoGrow maxRows={8} ariaLabel="control input" />,
    );
    const ta = screen.getByLabelText("control input") as HTMLTextAreaElement;
    expect(ta.classList.contains("lt-eq__textarea--grow")).toBe(true);
  });

  it("passes rows=4 and NO maxRows, so an autoGrow flip would pin the box at [4,4] rows", () => {
    // maxRows is absent here by design; `maxRows ?? rows` is what collapses the clamp.
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    expect(typePanelTextarea()).toHaveAttribute("rows", "4");
  });

  it("leaves the textarea height UNMANAGED -- no inline height/overflow is written", () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    const ta = typePanelTextarea();
    expect(ta.style.height).toBe("");
    expect(ta.style.overflowY).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 2 - THE PUBLIC PROP CONTRACT
// ---------------------------------------------------------------------------

describe("SolutionChecker -- public prop contract", () => {
  // Compile-time half: enforced by `typecheck:test` (tsconfig.test.json), which CI runs
  // as its own step. Renaming or removing a prop in the source makes this file RED.
  type Props = ComponentProps<typeof SolutionChecker>;

  const REQUIRED: Props = {
    question: "q",
    marks: 3,
    subject: "Maths",
    topic: "circles",
  };

  const FULL: Props = {
    ...REQUIRED,
    questionId: "qid-1",
    solutionSteps: ["step one"],
    finalAnswer: "1",
    section: "A",
    format: "MCQ",
    options: ["a", "b"],
    answer: "a",
    onRequestStepSolution: () => {},
    onResult: () => {},
  };

  it("renders from the four REQUIRED props alone (the optional signals stay optional)", () => {
    render(<SolutionChecker {...REQUIRED} />);
    expect(screen.getByText("Check my answer")).toBeInTheDocument();
  });

  it("accepts the FULL prop set including the objective signals and both callbacks", () => {
    render(<SolutionChecker {...FULL} />);
    expect(screen.getByRole("tab", { name: "Type my working" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3 - THE RENDERING STATES
// ---------------------------------------------------------------------------

describe("SolutionChecker -- every rendering state still renders", () => {
  it("STATE upload (default): two EQUAL tab peers, the dropzone, and the QR sub-mode at mode=photo", () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Type my working", "Upload a photo"]);
    // "upload" is the default tab -- the dropzone, not the type panel, is showing.
    expect(screen.getByText("Upload a photo or PDF of your answer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Type your working and answer")).toBeNull();
    // The QR handoff is a SUB-MODE OF UPLOAD, never a third peer, and it is "photo"
    // (one handwritten answer to one question), never the Chapter Test's "document".
    expect(screen.getByTestId("qr-handoff")).toHaveAttribute("data-mode", "photo");
  });

  it("STATE type: switching tabs swaps the dropzone for the EquationInput panel", () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    expect(typePanelTextarea()).toBeInTheDocument();
    expect(screen.queryByText("Upload a photo or PDF of your answer")).toBeNull();
  });

  it("STATE type + text: the Check CTA appears only once the ACTIVE tab has something to send", () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    expect(screen.queryByRole("button", { name: "Check my answer" })).toBeNull();
    fireEvent.change(typePanelTextarea(), { target: { value: "sin^2 x + cos^2 x = 1" } });
    expect(screen.getByRole("button", { name: "Check my answer" })).toBeInTheDocument();
  });

  it("STATE result: score banner, evidence label, annotated step, examiner note and both CTAs", async () => {
    const onRequestStepSolution = vi.fn();
    render(<SolutionChecker {...BASE_PROPS} onRequestStepSolution={onRequestStepSolution} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "my working" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));

    // Score banner -- marks out of total, and the percentage verdict line. Asserted via
    // the score circle's own subtree so "2" cannot collide with a step number elsewhere.
    const totalEl = await screen.findByText("/3");
    expect(totalEl.parentElement?.textContent).toBe("2/3");
    expect(screen.getByText(/67%/)).toBeInTheDocument();
    expect(screen.getByText(/Partly correct/)).toBeInTheDocument();
    // Evidence state label -- the honest "where did this go" line.
    expect(screen.getByText("Checked and saved to mistake history.")).toBeInTheDocument();
    // Annotated step card + its mistake badge + the per-step mark chip.
    expect(screen.getByText("State the Pythagorean identity")).toBeInTheDocument();
    expect(screen.getByText("Presentation")).toBeInTheDocument();
    expect(screen.getByText(/\+1\s*mark/)).toBeInTheDocument();
    // Examiner note + the two result-state CTAs.
    expect(screen.getByText("Examiner note")).toBeInTheDocument();
    expect(screen.getByText("See the Model Answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try another solution" })).toBeInTheDocument();
    // The tab control is gone once a result is showing.
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("STATE result: the per-step mark chip is SUPPRESSED for an objective question", async () => {
    checkSolutionImage.mockResolvedValue(gradedResponse({ objective: true }));
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(await screen.findByText("State the Pythagorean identity")).toBeInTheDocument();
    // The annotation survives; only the misleading "+1 mark" chip goes.
    expect(screen.getByText("State the identity before using it")).toBeInTheDocument();
    expect(screen.queryByText(/\+1\s*mark/)).toBeNull();
  });

  it("STATE error: a not-ok grade surfaces the grader's message, not a result", async () => {
    checkSolutionImage.mockResolvedValue({ ...gradedResponse(), ok: false, error: "Could not read that image" });
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(await screen.findByText("Could not read that image")).toBeInTheDocument();
    expect(screen.queryByText("Examiner note")).toBeNull();
  });

  it("STATE cached: a stored result restores under the versioned cache key with the Re-check affordance", async () => {
    // The key prefix is a DATA CONTRACT with every student's device -- changing it
    // silently orphans every result they have already paid a grader call for.
    localStorage.setItem(
      "lazytopper.checkResult.v1.qid-cached",
      JSON.stringify(gradedResponse()),
    );
    render(<SolutionChecker {...BASE_PROPS} questionId="qid-cached" />);
    expect(await screen.findByText("Showing your previous check result")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-check" })).toBeInTheDocument();
    expect(screen.getByText("Examiner note")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4 - THE GRADE-TRIGGER PAYLOAD ("the solution checker engine")
// ---------------------------------------------------------------------------

describe("SolutionChecker -- the grade call payload", () => {
  it("sends what the ACTIVE tab shows: textAnswer, trimmed, and NO image field", async () => {
    render(
      <SolutionChecker
        {...BASE_PROPS}
        questionId="qid-1"
        solutionSteps={["step one", "step two"]}
        finalAnswer="1"
      />,
    );
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "  my working  " } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));

    await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
    const payload = checkSolutionImage.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      question: BASE_PROPS.question,
      marks: 3,
      subject: "Maths",
      topic: "introduction-to-trigonometry",
      textAnswer: "my working",
      solutionSteps: ["step one", "step two"],
      finalAnswer: "1",
    });
    // image-XOR-text: the grader route ignores text when an image rides along, so the
    // client must never send both.
    expect(payload).not.toHaveProperty("imageBase64");
    expect(payload).not.toHaveProperty("imageMimeType");
  });

  it("forwards the objective signals ONLY when a bank-sourced caller supplies them", async () => {
    render(
      <SolutionChecker {...BASE_PROPS} section="A" format="MCQ" options={["a", "b"]} answer="a" />,
    );
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "a" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));

    await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
    const payload = checkSolutionImage.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.section).toBe("A");
    expect(payload.format).toBe("MCQ");
    expect(payload.options).toEqual(["a", "b"]);
    expect(payload.answer).toBe("a");
  });

  it("OMITS every optional key when the caller supplies none (a non-bank grade call is unchanged)", async () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "working" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));

    await waitFor(() => expect(checkSolutionImage).toHaveBeenCalledTimes(1));
    const payload = checkSolutionImage.mock.calls[0][0] as Record<string, unknown>;
    for (const key of ["section", "format", "options", "answer", "solutionSteps", "finalAnswer"]) {
      expect(Object.keys(payload)).not.toContain(key);
    }
  });

  it("never grades an empty answer -- the CTA is absent, so no grader call can be made", () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "   " } });
    expect(screen.queryByRole("button", { name: "Check my answer" })).toBeNull();
    expect(checkSolutionImage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5 - THE PERSISTENCE TWINS (mistake history + accuracy)
// ---------------------------------------------------------------------------

describe("SolutionChecker -- the post-grade persistence twins", () => {
  it("routes the graded result through recordMistake AND the recordAttempt score-twin", async () => {
    const response = gradedResponse();
    checkSolutionImage.mockResolvedValue(response);
    const onResult = vi.fn();
    render(<SolutionChecker {...BASE_PROPS} questionId="qid-1" onResult={onResult} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "working" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));

    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(1));
    expect(recordMistake.mock.calls[0][1]).toBe(response);
    expect(recordMistake.mock.calls[0][2]).toEqual({
      subject: "Maths",
      topic: "introduction-to-trigonometry",
      question: BASE_PROPS.question,
      questionId: "qid-1",
    });

    // The score-twin: EVERY graded answer is an attempt, including full marks --
    // accuracy needs both halves or it silently reads high.
    await waitFor(() => expect(recordAttempt).toHaveBeenCalledTimes(1));
    expect(recordAttempt.mock.calls[0][1]).toEqual({
      subject: "Maths",
      topic: "introduction-to-trigonometry",
      question: BASE_PROPS.question,
      questionId: "qid-1",
      marksScored: 2,
      marksAvailable: 3,
      mode: "graded",
    });

    expect(onResult).toHaveBeenCalledWith(response);
  });

  it("persists the result under the versioned cache key so it survives a remount", async () => {
    render(<SolutionChecker {...BASE_PROPS} questionId="qid-1" />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "working" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    await waitFor(() =>
      expect(localStorage.getItem("lazytopper.checkResult.v1.qid-1")).not.toBeNull(),
    );
  });

  it("does NOT persist anything when the caller gives no questionId", async () => {
    render(<SolutionChecker {...BASE_PROPS} />);
    openTypeTab();
    fireEvent.change(typePanelTextarea(), { target: { value: "working" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(1));
    expect(Object.keys(localStorage)).toHaveLength(0);
  });
});
