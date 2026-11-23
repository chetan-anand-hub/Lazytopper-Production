// TS-BOARDSCORE-1 - the Universal shell renders the full-length board view (lazy block) when the variant carries one, and nothing
// when it does not. The Mistake Intelligence "Where your marks went" block and the rest of the card are untouched.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

const st = vi.hoisted(() => ({ known: true, owns: false, phase: "ready" as "ready" | "loading" | "error" | "idle", tier: "free" as string, asked: [] as Array<string | null | undefined> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ hydrated: true, tier: st.tier, isTrialExpired: false, isTrialActive: false, daysLeftInTrial: 0, status: { tier: st.tier } }),
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: st.tier, plan: "none", trialStartDate: st.known ? "2026-01-01T00:00:00.000Z" : null, trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: () => () => {},
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackScorecardUpgrade: vi.fn(), trackPaywallAction: vi.fn(), trackSaleMoment: vi.fn() };
});
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: () => Promise.resolve({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) };
});
vi.mock("../testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => {
    st.asked.push(uid);
    return { owns: st.owns, status: null, phase: st.phase, retry: () => {} };
  },
}));

import ResultsScorecard from "./ResultsScorecard";
import { fullMockScorecardVariant } from "./scorecardVariants";
import { buildBoardScoreView } from "../../lib/fullmock/boardEstimate";

const full80 = (): WorksheetGradeResponse => ({
  ok: true,
  results: [
    {
      qNumber: 1,
      couldNotRead: false,
      totalMarks: 5,
      marksAwarded: 2,
      mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      marksLostByType: { conceptual: 3, calculation: 0, silly: 0, presentation: 0 },
    } as WorksheetGradeResponse["results"][number],
  ],
  totalQuestions: 38,
  gradedCount: 38,
  pendingCount: 0,
  gradedMarksAwarded: 61,
  gradedMarksTotal: 80,
  worksheetTotalMarks: 80,
});

afterEach(cleanup);

function renderCard(withBoard: boolean) {
  const boardScore = withBoard
    ? buildBoardScoreView({
        paper: { awarded: 61, total: 80, pendingCount: 0 },
        scores: [
          { id: "FM-M-01", score: 52, gradedAt: 1 },
          { id: "FM-M-02", score: 61, gradedAt: 2 },
        ],
      })
    : null;
  const variant = fullMockScorecardVariant({ name: "Maths · Mock #2", code: "FM-M-02", phase: "full", response: full80(), boardScore });
  return render(
    <MemoryRouter>
      <ResultsScorecard variant={variant} onClose={() => {}} />
    </MemoryRouter>,
  );
}

describe("ResultsScorecard - TS-BOARDSCORE-1 board view", () => {
  it("awaiting-sheet phase: hero out of 80, the written marks named as waiting, no board view", async () => {
    const response: WorksheetGradeResponse = {
      ...full80(),
      results: [{ qNumber: 1, couldNotRead: false, totalMarks: 1, marksAwarded: 1 }],
      totalQuestions: 38,
      gradedCount: 20,
      gradedMarksAwarded: 17,
      gradedMarksTotal: 20,
    };
    const variant = fullMockScorecardVariant({ name: "Maths · Mock #4", code: "FM-M-04", phase: "partial", response, onUpload: () => {}, onUploadLater: () => {} });
    render(
      <MemoryRouter>
        <ResultsScorecard variant={variant} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.querySelector(".lt-sc__big")?.textContent).toBe("17 / 80");
    expect(screen.getByTestId("score-not-marked").textContent).toBe("60 marks waiting for your answer sheet \u2014 upload it to complete");
    expect(screen.getByText("Upload answer sheet for the full result")).toBeTruthy();
    expect(screen.queryByTestId("board-score")).toBeNull();
  });

  it("owner ruling 19:59: the hero is out of 80 and the unmarked marks are named under it, with the 'So far' line", async () => {
    const response: WorksheetGradeResponse = {
      ...full80(),
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 2 },
        { qNumber: 2, couldNotRead: true, totalMarks: 3, marksAwarded: 0 },
        { qNumber: 3, couldNotRead: true, totalMarks: 3, marksAwarded: 0 },
      ],
      gradedCount: 36,
      pendingCount: 2,
      gradedMarksAwarded: 52,
      gradedMarksTotal: 74,
    };
    const boardScore = buildBoardScoreView({ paper: { awarded: 52, total: 80, pendingCount: 2, notMarkedMarks: 6 }, scores: [] });
    const variant = fullMockScorecardVariant({ name: "Maths · Mock #2", code: "FM-M-02", phase: "full", response, boardScore });
    render(
      <MemoryRouter>
        <ResultsScorecard variant={variant} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.querySelector(".lt-sc__big")?.textContent).toBe("52 / 80");
    expect(screen.getByTestId("score-not-marked").textContent).toBe(
      "6 marks not marked yet (2 questions) \u2014 upload a clearer photo to complete",
    );
    expect(await screen.findByText("So far: 52 / 80 \u00b7 6 marks not marked yet")).toBeTruthy();
    expect(screen.queryByText(/Board estimate/)).toBeNull();
  });

  it("renders the board view on a fully graded full-length card, beside the MI block", async () => {
    renderCard(true);
    expect(await screen.findByTestId("board-score")).toBeTruthy();
    expect(screen.getByText("You scored 61 / 80 on a full CBSE-pattern paper.")).toBeTruthy();
    expect(screen.getByText("Board estimate (theory): 49\u201367 / 80")).toBeTruthy();
    expect(screen.getByText(/Where your marks went|Mistakes the examiner found/i)).toBeTruthy();
  });

  it("renders nothing new without a board view", async () => {
    renderCard(false);
    expect(await screen.findByText(/Where your marks went|Mistakes the examiner found/i)).toBeTruthy();
    expect(screen.queryByTestId("board-score")).toBeNull();
    expect(screen.queryByText(/CBSE-pattern paper/)).toBeNull();
  });
});
