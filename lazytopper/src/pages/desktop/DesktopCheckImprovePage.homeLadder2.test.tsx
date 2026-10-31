/**
 * HOME-LADDER-2 (real draft service) — CI-SOFT-1 — the sample-marking card on /check-improve, rendered in the page: who sees it, that
 * Start-here stands down while it shows (one Byte per screen) and returns once it is closed, and what
 * "Check my own answer" does (fills the question like "Try a board question", closes the card for the
 * tab, lands on Type with the answer box focused, grades NOTHING).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { CI_DRAFT_KEY, __setCiDraftImageStoreForTests } from "../../services/checkImproveDraft";
import { FreeCheckRefusedError } from "../../services/freeCheckClient";
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
  recordAttempt: vi.fn(),
  one: vi.fn(),
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
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a), trackOneMinute: (...a: unknown[]) => H.one(...a) };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: (...a: unknown[]) => H.recordAttempt(...a) };
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
import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { resetZeroGradedCacheForTests } from "../../components/startHere/zeroGraded";
import { CI_DEMO_CLOSED_KEY } from "../../components/ciDemo/ciDemoModel";
import { __setGuideAbForTests } from "../../components/guide/guideVariant";
import { __resetMascotsForTests } from "../../components/guide/mascotsMute";
import { GUIDE_PUBLIC_ARM_KEY, __resetPublicArmForTests } from "../../components/guide/public/publicPeekModel";

const GRADED = {
  ok: true, totalMarks: 2, marksAwarded: 1, percentage: 50,
  annotatedSteps: [{ stepNumber: 1, description: "Formula", studentWork: "w", status: "partial", marksAwarded: 1, marksDeducted: 1, teacherAnnotation: "x", mistakeType: "presentation", correctedWorking: null }],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 }, teacherNote: "ok",
};
const SIGNED_IN = { uid: "ci-new", email: null, phoneNumber: "+919000000000", displayName: null };

function page(entry = "/check-improve") {
  return (
    <MemoryRouter initialEntries={[entry]}>
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
  __resetPublicArmForTests();
  __resetMascotsForTests();
  H.auth = { user: SIGNED_IN, loading: false };
  H.local = [];
  H.cloudHas.mockReset().mockResolvedValue(false);
  H.track.mockReset();
  H.detectQuestion.mockReset();
  H.checkSolutionImage.mockReset();
  H.gradeWorksheet.mockReset();
  setMatchMediaMatches(true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  __setCiDraftImageStoreForTests({ put: async () => {}, get: async () => null, deleteId: async () => {}, purgeOlderThan: async () => {} });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
  __setCiDraftImageStoreForTests(null);
});


const LADDER_NOTE = "lazytopper.checkOneLadder";
const sleep = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

async function signedOutLadderThenPhotoCta() {
  H.auth = { user: null, loading: false };
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  adArrival();
  render(page());
  fireEvent.click(await screen.findByTestId("one-min-opt-0"));
  fireEvent.click(screen.getByTestId("one-min-next"));
  await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Step 1 formula. Step 2 substitute. Step 3 answer 5 cm." } });
  await sleep(1000); // the ungraded draft is autosaved (as today)
  H.checkSolutionImage.mockResolvedValue(GRADED);
  fireEvent.click(await screen.findByRole("button", { name: /^check|grade/i }));
  fireEvent.click(await screen.findByTestId("one-min-photo-cta"));
  await sleep(1200); // past the autosave debounce
}

describe("HOME-LADDER-2 · a ladder question already graded signed-out must not travel through sign-up", () => {
  it("★ graded signed-out + photo CTA, then sign-up: no draft is carried and Byte's ladder starts", async () => {
    await signedOutLadderThenPhotoCta();
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
    cleanup();
    window.sessionStorage.setItem("lazytopper.checkOneHandover", "1");
    window.sessionStorage.setItem(LADDER_NOTE, "1");
    H.auth = { user: SIGNED_IN, loading: false };
    render(page());
    expect(await screen.findByTestId("one-min-opt-0", {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it("★ a REFUSED (never graded) check keeps the typed work as a draft: refusal -> sign-up -> restored intact", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    fireEvent.click(await screen.findByTestId("one-min-opt-0"));
    fireEvent.click(screen.getByTestId("one-min-next"));
    await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
    const answer = "My own working: v = u + at, so 5 m/s.";
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: answer } });
    H.checkSolutionImage.mockRejectedValue(new FreeCheckRefusedError("ceiling_reached", "2026-09-26T18:30:00.000Z"));
    fireEvent.click(await screen.findByRole("button", { name: /^check|grade/i }));
    await waitFor(() => expect(document.body.textContent).toContain("all used up"));
    await sleep(1200);
    const raw = window.sessionStorage.getItem(CI_DRAFT_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).textAnswer).toBe(answer);
    expect(window.sessionStorage.getItem("lazytopper.ladderQuestion")).toBeNull();
    cleanup();
    H.auth = { user: SIGNED_IN, loading: false };
    render(page());
    await waitFor(() => expect((screen.getByLabelText("Type your answer") as HTMLTextAreaElement).value).toBe(answer));
  });

  it("an UNGRADED typed draft still survives sign-in (ACTIVATION-1 handover)", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    render(page());
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Prove that root 2 is irrational." } });
    await sleep(1200);
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).not.toBeNull();
    cleanup();
    H.auth = { user: SIGNED_IN, loading: false };
    render(page());
    await waitFor(() => expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe("Prove that root 2 is irrational."));
  });

  it("a leftover ladder-starter draft never blocks Byte's pending ladder", async () => {
    window.sessionStorage.setItem("lazytopper.ladderQuestion", JSON.stringify({ q: "Left-over ladder question", a: "typed" }));
    // simulate an older build / race leaving the ladder's 2-mark starter question as a draft
    window.sessionStorage.setItem(CI_DRAFT_KEY, JSON.stringify({ v: 1, id: "x", savedAt: Date.now(), questionTab: "type", question: "Left-over ladder question", qImageMime: "", qImageName: "", tab: "type", textAnswer: "typed", imageMime: "", imageName: "", detected: null, confirmed: null, hasQImage: false, hasAnswerImage: false }));
    cleanup();
    window.sessionStorage.setItem(LADDER_NOTE, "1");
    H.auth = { user: SIGNED_IN, loading: false };
    render(page());
    expect(await screen.findByTestId("one-min-opt-0", {}, { timeout: 4000 })).toBeInTheDocument();
  });
});
