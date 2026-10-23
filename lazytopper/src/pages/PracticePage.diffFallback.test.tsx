// GUIDE-FILTER-1 (#1302 review) — a RENDERED test of the Difficulty fallback.
//
// A Weak Area / nav entry carries a difficulty PRESET (`practiceFilters.difficultyPreset`), which
// sets BOTH the committed Difficulty chip and the ENGINE draw's `difficulty`. When the chosen
// chapter holds none of that difficulty, the page falls the chip back to "all" — and must reset
// the engine difficulty too, or the engine keeps drawing a level the chapter does not have.
// No real chapter lacks a difficulty (every one of the 26 holds Easy, Medium and Hard), so the
// chapter pool and the engine draw are mocked to a pool with no Hard rows.
// RED without `setDifficulty("All")` in the fallback: the last engine call still asks for "Hard".

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn(), buildChapterServedPool: vi.fn() };
});

import PracticePage from "./PracticePage";
import { buildChapterServedPool, buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import type { PracticeQuestion } from "../data/predictionDataService";

const mockDraw = vi.mocked(buildPracticeQuestionsWithAiTopup);
const mockPool = vi.mocked(buildChapterServedPool);

/** Easy / Medium only — this chapter (as mocked) holds no Hard question. */
const POOL: PracticeQuestion[] = Array.from({ length: 12 }, (_, i) => ({
  id: `nh-${i}`,
  subject: "Maths",
  questionText: `No-hard question ${i}.`,
  marks: 2,
  section: "B",
  format: "short",
  difficulty: i % 2 ? "Easy" : "Medium",
  subtopic: "seed",
  topicKey: "real-numbers",
  solutionSteps: ["Step one.", "Step two."],
  finalAnswer: "x",
})) as unknown as PracticeQuestion[];

afterEach(() => {
  cleanup();
  mockDraw.mockReset();
  mockPool.mockReset();
});

describe("GUIDE-FILTER-1 · a Weak Area difficulty preset the chapter has none of", () => {
  it("★★ falls back to all levels, resets the ENGINE difficulty, and says so honestly", async () => {
    mockDraw.mockResolvedValue(POOL);
    mockPool.mockReturnValue(POOL);
    setMatchMediaMatches(true);
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/practice/10/maths",
            search: "?topic=real-numbers&count=5",
            state: { practiceFilters: { difficultyPreset: "Hard" } },
          },
        ]}
      >
        <Routes>
          <Route path="/practice/:grade/:subject" element={<PracticePage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    // The honest line, and no Hard chip on the built set.
    expect((await screen.findByTestId("qp-filter-dropped")).textContent).toBe(
      "No Hard questions in this chapter — showing a mixed set.",
    );
    expect(screen.queryByTestId("qp-chip-diff")).toBeNull();
    // The ENGINE draw now asks for every level (RED: it kept asking for "Hard").
    await waitFor(() => {
      const last = mockDraw.mock.calls[mockDraw.mock.calls.length - 1]?.[0] as { difficulty?: string } | undefined;
      expect(last?.difficulty).toBe("All");
    });
  }, 120000);
});
