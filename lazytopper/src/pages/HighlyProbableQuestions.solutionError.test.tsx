// HighlyProbableQuestions — BUGFIX-1 · B2: the step-solution error speaks to the student.
//
// A signed-in student whose ID token could not be confirmed is thrown a
// `SignInAgainError` by `paidCallHeaders`, whose message asks for the one thing that
// fixes it. The page used to swallow every error behind "Step solution is unavailable
// right now" — telling that student nothing they could act on. Detection is by
// `err.name` (never `instanceof`), and every OTHER error keeps today's copy.
//
// ★ ONE router — the MemoryRouter stands in for the app's always-present outer router.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { fetchStepSolution } = vi.hoisted(() => ({ fetchStepSolution: vi.fn() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return { ...actual, fetchStepSolution };
});
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
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
            id: "hpq-t1",
            subject: "Maths",
            topic: "Real Numbers",
            section: "C",
            type: "Short",
            marks: 3,
            likelihood: "High",
            question: "Prove that the square root of 5 is irrational.",
          },
        ],
      },
    ],
  };
});

import HighlyProbableQuestions from "./HighlyProbableQuestions";

/** The message `paidCallHeaders.ts` gives `SignInAgainError`. Built by NAME here — the
 *  page must detect it by `err.name`, so a plain Error with that name is the contract. */
const SIGN_IN_COPY = "We couldn't confirm you're signed in. Please sign in again, then try once more.";
const GENERIC_COPY = "Step solution is unavailable right now. Try Check my answer or Revise topic.";

function signInAgainError(): Error {
  const e = new Error(SIGN_IN_COPY);
  e.name = "SignInAgainError";
  return e;
}

afterEach(() => {
  cleanup();
  fetchStepSolution.mockReset();
});

async function openSteps() {
  render(
    <MemoryRouter initialEntries={["/hpq?subject=maths"]}>
      <HighlyProbableQuestions />
    </MemoryRouter>,
  );
  await screen.findByText(/square root of 5 is irrational/);
  // PRACTICE-HONESTY-1 — steps are locked until an attempt; this suite is about the error
  // copy, so it unlocks the row the student-facing way ("Show all solutions"), then opens.
  expect(screen.queryByRole("button", { name: /Show steps/i })).toBeNull();
  fireEvent.click(screen.getByTestId("hpq-show-all-solutions"));
  fireEvent.click(screen.getByRole("button", { name: /Show steps/i }));
}

describe("BUGFIX-1 · B2 · HPQ step-solution error copy", () => {
  it("★★ a SignInAgainError renders its own message — the student is told to sign in again", async () => {
    fetchStepSolution.mockRejectedValue(signInAgainError());
    await openSteps();
    expect(await screen.findByText(SIGN_IN_COPY)).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_COPY)).toBeNull();
    expect(fetchStepSolution).toHaveBeenCalledTimes(1);
  });

  it("★ CONTROL: any other error keeps today's copy — and never leaks the raw message", async () => {
    fetchStepSolution.mockRejectedValue(new Error("premium_required"));
    await openSteps();
    expect(await screen.findByText(GENERIC_COPY)).toBeInTheDocument();
    expect(screen.queryByText(/premium_required/)).toBeNull();
    expect(screen.queryByText(SIGN_IN_COPY)).toBeNull();
  });
});
