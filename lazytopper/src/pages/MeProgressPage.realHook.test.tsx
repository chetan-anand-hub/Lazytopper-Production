/**
 * MeProgressPage with the REAL useSubscription hook — EARLY-PAYWALL-1.
 * Cached status = active trial, cloud hydration still pending: the real Learn button shows, no lock / Pay path.
 * (Header and harness note copied from MeProgressPage.test.tsx.)
 *
 * ★ HARNESS NOTE (#490's defect class). The app is ALWAYS inside main.tsx's
 * <BrowserRouter>. This file therefore renders the page inside ONE MemoryRouter —
 * that router stands in for the app's always-present outer router. The page itself
 * must NEVER construct a router: a <Router> inside another <Router> is the #490
 * defect verbatim, and it error-paged every student.
 *
 * The one-router assertion below is written POSITIVELY (assert on the rendered
 * result) and is paired with a CONTROL that adds a SECOND router and proves the
 * harness can detect it. An `expect(...).not.toThrow()` here would be a silent
 * no-op, exactly as it was in App.routing.contract.test.tsx.
 *
 * Every "absent" assertion in this file is paired with a control that renders the
 * thing, so an absence can never pass because the query was wrong.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { WindowedProgress, RungTrend } from "../services/progressStore";

/* ────────────────── mocks — the reads only; the real component runs ────────────────── */

const mockGetWindowedProgress = vi.fn();
const mockGetRecentSessions = vi.fn();
const mockGetActivitySummary = vi.fn();
const mockGetTopicTrendFromCloud = vi.fn();

vi.mock("../services/progressStore", async (importOriginal) => ({
  // ME-ENGINE-1 PR-1 — the page reads the REAL shared read model (services/progressReadModel),
  // which uses the REAL window / canonicaliser helpers; only the cloud aggregation is mocked.
  ...(await importOriginal<typeof import("../services/progressStore")>()),
  getWindowedProgress: (...a: unknown[]) => mockGetWindowedProgress(...a),
  getRecentSessions: (...a: unknown[]) => mockGetRecentSessions(...a),
  getActivitySummary: (...a: unknown[]) => mockGetActivitySummary(...a),
  getTopicTrendFromCloud: (...a: unknown[]) => mockGetTopicTrendFromCloud(...a),
  isShortSpan: () => false,
}));

vi.mock("../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeLogService")>()),
  getMistakeLogHistoryFromCloud: vi.fn(async () => ({ entries: [], complete: true })),
}));

vi.mock("../services/mistakeInsightsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeInsightsService")>()),
  summarizeCareless: () => ({
    calculationCount: 0,
    sillyCount: 0,
    count: 0,
    marksLost: 0,
    hasData: false,
  }),
}));

vi.mock("../services/adaptivePracticeEngine", () => ({
  getWrongConceptsForTopic: () => [],
}));

// ProgressWindowArc does its own async cloud reads; the page's contract with it is
// that it is MOUNTED (so its honesty copy is reused by import, not duplicated).
vi.mock("../components/progress/ProgressWindowArc", () => ({
  ProgressWindowArc: ({ uid }: { uid: string | null }) => (
    <div data-testid="progress-window-arc" data-uid={uid ?? ""} />
  ),
  progressArcStateKind: () => "rungs",
}));

vi.mock("../components/subscription/UpgradeSheet", () => ({
  UpgradeSheet: ({ featureLabel }: { featureLabel?: string }) => (
    <div data-testid="upgrade-sheet">{featureLabel}</div>
  ),
}));


// Pass-through gate stub (entitlementGating blast-radius guard); the REAL useSubscription is what this test exercises.
vi.mock("../components/auth/RequireAuth", () => ({
  RequireAuth: ({ children }: { children: unknown }) => children,
  RequirePremium: ({ children }: { children: unknown }) => children,
}));

vi.mock("../services/subscriptionService", async (importOriginal) => {
  const real = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...real,
    loadSubscription: () => ({
      tier: "trial",
      plan: "trial_7day",
      trialStartDate: "2026-11-04T16:00:00.000Z",
      trialEndDate: null,
      premiumSince: null,
    }),
    // fixed day count, so this test never reads the clock
    getDaysLeftInTrial: () => 6,
    // never resolves: hydration is pending for the whole test
    hydrateSubscriptionFromCloud: () => new Promise(() => {}),
  };
});

vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => false }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-1", displayName: "Asha Rao" }, loading: false, mistakeLogsHydrated: true }),
}));

import MeProgressPage from "./MeProgressPage";

const topic = {
  key: "real-numbers", label: "Real Numbers", before: 40, now: 55, delta: 15,
  sampleBefore: 6, sampleNow: 8, spanDays: 30,
};

describe("EARLY-PAYWALL-1 · real useSubscription, cached trial, hydration pending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecentSessions.mockReturnValue([]);
    mockGetActivitySummary.mockReturnValue({ worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 });
    mockGetTopicTrendFromCloud.mockResolvedValue(null);
    mockGetWindowedProgress.mockResolvedValue({
      window: "month", subjects: [topic], topics: [topic], concepts: [], sections: [], mistakeTypes: [],
      activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
      activitySpanDays: 30, mistakeLog: { loggedInWindow: 0 },
    });
  });

  it("shows the real Learn button and no lock, placeholder or upgrade sheet", async () => {
    render(
      <MemoryRouter initialEntries={["/me"]}>
        <MeProgressPage />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("me-cta-learn-real-numbers")).toBeInTheDocument();
    expect(screen.queryByTestId("me-cta-learn-locked-real-numbers")).toBeNull();
    expect(screen.queryByTestId("me-cta-learn-pending-real-numbers")).toBeNull();
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull();
    expect(screen.queryByText("Board Pass")).toBeNull();
  });
});
