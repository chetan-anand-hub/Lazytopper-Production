// PRACTICE-HONESTY-1 §1 — the SHARED card's `stepsLocked` prop (every practice host renders
// this card: Practice, Quick Practice, chapter, Topic Hub, CBQ sets, the tutor overlay).
//
//   locked   → the owner's lock note (dimmed, 🔒) IN PLACE of "Show steps", and NOTHING of the
//              steps panel renders — even when a host passes a stale `isOpen=true`.
//   unlocked → "Show steps" as shipped; with isOpen the steps render.
//   omitted  → the shipped behaviour (a consumer that does not opt in is unchanged).
//
// The lock RULE (`!(mcqResult || savedAnswer || graded) && !sessionFinished`) is the host's;
// PracticePage.finishReview.test.tsx drives it on the real page.

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, within, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
// DIAGRAMS-1 PR-2a's lazy solution figure lives INSIDE the steps panel. A stub that always
// mounts, so the lock (not the figure registry) decides whether it appears.
vi.mock("../../diagrams/SolutionFigure", () => ({
  default: ({ questionId }: { questionId: string }) => (
    <div data-testid="solution-figure-mount" data-question-id={questionId} />
  ),
}));

import { PracticeQuestionCard } from "./PracticeQuestionCard";
import { STEPS_LOCKED_COPY } from "./StepsLockedNote";
import type { PracticeQuestion } from "../../data/predictionDataService";
import type { StepSolutionResponse } from "../../ai/aiClient";

afterEach(cleanup);

const Q = {
  id: "Q1",
  marks: 3,
  section: "C",
  difficulty: "Medium",
  questionText: "Prove that root 5 is irrational.",
  solutionSteps: ["Assume root 5 is rational, equal to p over q in lowest terms.", "Square both sides and reach a contradiction."],
  finalAnswer: "Root 5 is irrational.",
  subject: "Maths",
  topicKey: "real-numbers",
} as unknown as PracticeQuestion;

function renderCard(opts: { isOpen: boolean; stepsLocked?: boolean }) {
  return render(
    <MemoryRouter>
      <PracticeQuestionCard
        q={Q}
        idx={0}
        subjectKey="Maths"
        topicLabel="Real Numbers"
        isOpen={opts.isOpen}
        solutionLoading={false}
        solutionError={undefined}
        solutionData={SOLUTION}
        mcqSelection={undefined}
        mcqResult={undefined}
        onSetActiveQuestion={() => {}}
        onToggleAnswer={() => {}}
        onMcqSelect={() => {}}
        onMcqResult={() => {}}
        {...(opts.stepsLocked === undefined ? {} : { stepsLocked: opts.stepsLocked })}
      />
    </MemoryRouter>,
  );
}

const STEP_TEXT = /Assume root 5 is rational/;
/** What a host hands the card once "Show steps" fetched (or built) the solution. */
const SOLUTION = {
  totalMarks: 3,
  steps: [
    { stepNumber: 1, description: "Assume root 5 is rational, equal to p over q.", working: "p squared = 5 q squared", marks: 1 },
    { stepNumber: 2, description: "Reach a contradiction.", working: "5 divides both p and q", marks: 2 },
  ],
} as unknown as StepSolutionResponse;

describe("PracticeQuestionCard — stepsLocked", () => {
  it("★★ locked: the owner's note replaces 'Show steps', dimmed with a 🔒", () => {
    renderCard({ isOpen: false, stepsLocked: true });
    const note = screen.getByTestId("steps-locked-note");
    expect(note.textContent).toContain(
      "Try it first: answer this question (or finish the session) to see the steps.",
    );
    expect(note.textContent).toContain(STEPS_LOCKED_COPY);
    expect(note.className).toContain("lt-steps-locked");
    expect(within(note).getByText("\u{1F512}").getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByTestId("practice-mentor-cta")).toBeNull();
    expect(screen.queryByRole("button", { name: /Show steps/ })).toBeNull();
  });

  it("★★ locked beats a stale isOpen: NO steps panel, no step text, no report link", () => {
    renderCard({ isOpen: true, stepsLocked: true });
    expect(screen.queryByText("Solution steps (for comparison)")).toBeNull();
    expect(document.body.textContent).not.toMatch(STEP_TEXT);
    expect(screen.queryByText(/Report/i)).toBeNull();
  });

  it("★★ DIAGRAMS PR-2a: the solution figure never mounts while locked, and mounts once unlocked", async () => {
    const locked = renderCard({ isOpen: true, stepsLocked: true });
    // Let any lazy import settle — a figure that WOULD mount has had its chance.
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.queryByTestId("solution-figure-mount")).toBeNull();
    locked.unmount();
    renderCard({ isOpen: true, stepsLocked: false });
    const fig = await screen.findByTestId("solution-figure-mount", {}, { timeout: 10000 });
    expect(fig.getAttribute("data-question-id")).toBe("Q1");
  });

  it("CONTROL — unlocked + open: the steps DO render (the probe can see them)", () => {
    renderCard({ isOpen: true, stepsLocked: false });
    expect(screen.getByText("Solution steps (for comparison)")).toBeInTheDocument();
    expect(document.body.textContent).toMatch(STEP_TEXT);
    expect(screen.queryByTestId("steps-locked-note")).toBeNull();
  });

  it("unlocked + closed: 'Show steps' as shipped", () => {
    renderCard({ isOpen: false, stepsLocked: false });
    expect(screen.getByTestId("practice-mentor-cta").textContent).toBe("Show steps");
    expect(screen.queryByTestId("steps-locked-note")).toBeNull();
  });

  it("omitted prop ⇒ the shipped behaviour (not locked)", () => {
    renderCard({ isOpen: false });
    expect(screen.getByTestId("practice-mentor-cta").textContent).toBe("Show steps");
    expect(screen.queryByTestId("steps-locked-note")).toBeNull();
  });
});
