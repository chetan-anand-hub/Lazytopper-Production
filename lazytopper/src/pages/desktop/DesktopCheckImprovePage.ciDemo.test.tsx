/**
 * CI-SOFT-1 — the sample-marking card on /check-improve, rendered in the page: who sees it, that
 * Start-here stands down while it shows (one Byte per screen) and returns once it is closed, and what
 * "Check my own answer" does (fills the question like "Try a board question", closes the card for the
 * tab, lands on Type with the answer box focused, grades NOTHING).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: true,
    isTrialExpired: false,
    hydrated: true,
    tier: "premium",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  local: [] as unknown[],
  cloudHas: vi.fn(),
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: () => H.local,
    getSessionRecordsFromCloud: () => Promise.resolve(H.local),
    cloudHasAnySessionRecord: (...a: unknown[]) => H.cloudHas(...a),
  };
});
vi.mock("../../services/checkImproveDraft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveDraft")>();
  // saveCiDraft is stubbed too: its 30-minute expiry reads the clock, which would make this suite date-sensitive.
  return { ...actual, takeCiDraft: () => Promise.resolve(null), clearCiDraft: () => {}, saveCiDraft: () => {} };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { resetZeroGradedCacheForTests } from "../../components/startHere/zeroGraded";
import { CI_DEMO_CLOSED_KEY } from "../../components/ciDemo/ciDemoModel";
import { CI_DEMO_SAMPLES } from "../../components/ciDemo/ciDemoSamples";

const SIGNED_IN = { uid: "ci-new", email: null, phoneNumber: "+919000000000", displayName: null };

function page() {
  return (
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>
  );
}
const adArrival = () =>
  window.sessionStorage.setItem(
    "lazytopper.guideIntent",
    JSON.stringify({ landing: "/check-improve", utm_content: null, utm_campaign: "yt_students" }),
  );
const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests();
  H.auth = { user: SIGNED_IN, loading: false };
  H.local = [];
  H.cloudHas.mockReset().mockResolvedValue(false);
  H.track.mockReset();
  H.detectQuestion.mockReset();
  H.checkSolutionImage.mockReset();
  H.gradeWorksheet.mockReset();
  setMatchMediaMatches(true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
});

describe("CI-SOFT-1 · the card on /check-improve", () => {
  it("★ signed-in, zero graded, ad arrival → the card shows and Start-here is NOT rendered; closing brings Start-here back", async () => {
    adArrival();
    render(page());
    expect(await screen.findByTestId("ci-demo")).toBeInTheDocument();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    fireEvent.click(screen.getByTestId("ci-demo-close"));
    await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
    expect(window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY)).toBe("1");
    expect(await screen.findByTestId("start-here-card")).toBeInTheDocument();
  });

  it("★ CONTROL: no ad arrival (landed elsewhere, no campaign) → today's page, no card", async () => {
    window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/notes", utm_content: null, utm_campaign: null }));
    render(page());
    expect(await screen.findByTestId("start-here-card")).toBeInTheDocument();
    expect(screen.queryByTestId("ci-demo")).toBeNull();
  });

  it("★ CONTROL: a student who already has graded work → today's page, no card", async () => {
    adArrival();
    H.local = [{ id: "QP-M-TRIG-001", surface: "quick-practice", topicKeys: [], questionIds: [], gradedAt: 1 }];
    render(page());
    await settle();
    expect(screen.queryByTestId("ci-demo")).toBeNull();
  });

  it("★ closed earlier in this tab → no card", async () => {
    adArrival();
    window.sessionStorage.setItem(CI_DEMO_CLOSED_KEY, "1");
    render(page());
    await settle();
    expect(screen.queryByTestId("ci-demo")).toBeNull();
  });

  it("★ signed out, free check unspent → the card shows; spent → it does not", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    expect(await screen.findByTestId("ci-demo")).toBeInTheDocument();
    cleanup();
    window.localStorage.setItem("ltFreeCheck.used.v1", "1");
    render(page());
    await settle();
    expect(screen.queryByTestId("ci-demo")).toBeNull();
  });

  it("★ typing in the question box does not make an open card vanish", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    await screen.findByTestId("ci-demo");
    const box = screen.getByLabelText("Type the question");
    fireEvent.change(box, { target: { value: "My own question" } });
    await settle();
    expect(screen.getByTestId("ci-demo")).toBeInTheDocument();
  });

  it("★★ Check my own answer: fills the question + provenance line, closes the card, Type tab, answer box focused, NOTHING graded", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    fireEvent.click(await screen.findByTestId("ci-demo-tile-circ"));
    // (this suite's matchMedia answers "yes" to everything: wide + reduced motion → the result at once)
    fireEvent.click(await screen.findByTestId("ci-demo-check-own"));
    const s = CI_DEMO_SAMPLES.circ;
    await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
    expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe(`${s.questionText} [2]`);
    expect(screen.getByTestId("ci-board-source").textContent).toBe("CBSE board question (2024) · Circles");
    const answer = screen.getByLabelText("Type your answer");
    expect(document.activeElement).toBe(answer);
    expect(window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY)).toBe("1");
    expect(H.detectQuestion).not.toHaveBeenCalled();
    expect(H.checkSolutionImage).not.toHaveBeenCalled();
    expect(H.gradeWorksheet).not.toHaveBeenCalled();
    expect(H.track.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(["ci_demo_shown", "ci_demo_pick", "ci_demo_result", "ci_demo_check_own"]),
    );
  });
});
