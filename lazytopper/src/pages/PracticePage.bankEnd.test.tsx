// PracticePage — MLT-MUTE-1 · the honest end of the bank.
//
// "More like this" no longer asks the AI to write questions once the verified bank runs out
// (owner ruling 2026-10-22). A set can therefore come back SHORTER than the student asked for.
// When it does, the page says so in plain words — "That's every question we have like this for
// now." — and offers real next steps on routes that exist (Chapter Test, the Practice hub).
//
// RED on the old code: the note did not exist (the AI top-up padded the set instead).
// ★ ONE router — the same seed-location harness as PracticePage.solutionError.test.tsx.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "student-1", isLocalSession: false, email: "s@x.com" },
    loading: false,
    getToken: async () => "tok",
  }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { BANK_END_TITLE } from "../components/practice/PracticeQuestionList";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

function written(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 3,
    section: "C",
    format: "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
  } as unknown as PQ;
}

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

async function openSet(served: PQ[], count: number) {
  mockBuild.mockResolvedValue(served);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=${count}`]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}

describe("MLT-MUTE-1 · the honest end of the bank", () => {
  it("★★ RED on the old code: a set SHORTER than asked says it is every question we have, with real next steps", async () => {
    await openSet([written(1)], 3);
    const note = await screen.findByTestId("qp-bank-end");
    expect(note).toHaveTextContent(BANK_END_TITLE);
    expect(BANK_END_TITLE).toBe("That's every question we have like this for now.");
    const ct = screen.getByTestId("qp-bank-end-chapter-test");
    expect(ct.getAttribute("href")).toMatch(/^\/chapter-test\/10\/[^/]+\/real-numbers$/);
    expect(screen.getByTestId("qp-bank-end-practice-hub").getAttribute("href")).toBe("/practice-hub");
    // Nothing is invented to fill the gap: exactly the one served question is on the page.
    expect(screen.getAllByText(/^Question \d+: solve it\.$/)).toHaveLength(1);
  });

  it("★ CONTROL: a FULL set (the bank had enough) shows no end-of-bank note", async () => {
    await openSet([written(1), written(2), written(3)], 3);
    expect(screen.getAllByText(/^Question \d+: solve it\.$/)).toHaveLength(3);
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
  });
});
