// PRACTICE-HONESTY-1 §3 — Predicted Questions: steps/logic unlock after an ATTEMPT on that
// question (an option pick, or a written answer the checker actually marked — SolutionChecker
// onResult), and "Show all solutions" at the end of the list unlocks every row at once.
//
// ★ CONTROL per unlock: the OTHER row stays locked, so a page that simply unlocked everything
// could not pass.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, fetchStepSolution: vi.fn(async () => ({ totalMarks: 3, steps: [] })) };
});
// The checker is stubbed to its contract: a marked answer fires `onResult`.
vi.mock("../components/question/SolutionChecker", () => ({
  SolutionChecker: ({ onResult }: { onResult?: (r: unknown) => void }) => (
    <button type="button" data-testid="stub-checker-mark" onClick={() => onResult?.({ ok: true })}>
      stub: mark my answer
    </button>
  ),
}));
vi.mock("../data/highlyProbableQuestions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/highlyProbableQuestions")>();
  return {
    ...actual,
    getHighlyProbableQuestions: () => [
      {
        topic: "Real Numbers",
        subject: "Maths",
        questions: [
          {
            id: "hpq-mcq-1", subject: "Maths", topic: "Real Numbers", section: "A", type: "MCQ",
            marks: 1, likelihood: "High", question: "Which of these numbers is irrational?",
            options: ["the number four", "root two", "the number nine", "one half"], correctOption: "B",
          },
          {
            id: "hpq-written-1", subject: "Maths", topic: "Real Numbers", section: "C", type: "Short",
            marks: 3, likelihood: "High", question: "Prove that the square root of 5 is irrational.",
          },
        ],
      },
    ],
  };
});

import HighlyProbableQuestions from "./HighlyProbableQuestions";

afterEach(cleanup);

const HPQ_LOCK_COPY = "Try it first: answer this question (or tap Show all solutions at the end) to see the steps.";

async function mount() {
  render(
    <MemoryRouter initialEntries={["/hpq?subject=maths"]}>
      <HighlyProbableQuestions />
    </MemoryRouter>,
  );
  await screen.findByText(/square root of 5 is irrational/);
}

/** The row (article/list item) holding a question's text. */
function rowOf(text: RegExp): HTMLElement {
  let el: HTMLElement | null = screen.getByText(text);
  while (el && !el.querySelector('[data-testid="steps-locked-note"], button')) el = el.parentElement;
  // Walk up until the row holds exactly one question's controls.
  while (el && el.parentElement && el.querySelectorAll("button").length < 2) el = el.parentElement;
  return el as HTMLElement;
}
const notes = () => screen.queryAllByTestId("steps-locked-note");
const stepButtons = () => screen.queryAllByRole("button", { name: /^(Show|Hide) (steps|logic)$/ });

describe("PRACTICE-HONESTY-1 §3 · Predicted Questions unlock", () => {
  it("★★ fresh page: every row locked with the HPQ copy, no Show steps / Show logic", async () => {
    await mount();
    expect(notes()).toHaveLength(2);
    for (const n of notes()) expect(n.textContent).toContain(HPQ_LOCK_COPY);
    expect(stepButtons()).toHaveLength(0);
  });

  it("★★ an option pick unlocks THAT row's logic (CONTROL: the written row stays locked)", async () => {
    await mount();
    fireEvent.click(screen.getByText("root two"));
    expect(screen.getByRole("button", { name: "Show logic" })).toBeInTheDocument();
    expect(notes()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Show steps" })).toBeNull();
  });

  it("★★ a written answer the checker MARKED unlocks that row (SolutionChecker onResult)", async () => {
    await mount();
    const written = rowOf(/square root of 5 is irrational/);
    fireEvent.click(within(written).getByRole("button", { name: "Check my answer" }));
    // Opening the checker is not an attempt.
    expect(screen.queryByRole("button", { name: "Show steps" })).toBeNull();
    fireEvent.click(await screen.findByTestId("stub-checker-mark"));
    expect(await screen.findByRole("button", { name: "Show steps" })).toBeInTheDocument();
    // CONTROL — the MCQ row is still locked.
    expect(notes()).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Show logic" })).toBeNull();
  });

  it("★★ 'Show all solutions' at the end of the list unlocks every row", async () => {
    await mount();
    const showAll = screen.getByTestId("hpq-show-all-solutions");
    expect(showAll.textContent).toBe("Show all solutions");
    // At the END of the list: after every question.
    const lastQ = screen.getByText(/square root of 5 is irrational/);
    expect(lastQ.compareDocumentPosition(showAll) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(showAll);
    expect(notes()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Show logic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show steps" })).toBeInTheDocument();
    expect(screen.queryByTestId("hpq-show-all-solutions")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/All solutions are unlocked/);
  });
});
