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
vi.mock("../../services/checkImproveDraft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveDraft")>();
  // saveCiDraft is stubbed too: its 30-minute expiry reads the clock, which would make this suite date-sensitive.
  return { ...actual, takeCiDraft: () => Promise.resolve(null), clearCiDraft: () => {}, saveCiDraft: () => {} };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { resetZeroGradedCacheForTests } from "../../components/startHere/zeroGraded";
import { CI_DEMO_CLOSED_KEY } from "../../components/ciDemo/ciDemoModel";
import { CI_DEMO_SAMPLES } from "../../components/ciDemo/ciDemoSamples";
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
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
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

  it("★ ONE-MINUTE-1: a signed-in tap is recorded once as an MCQ attempt (0 or 1 of 1, the Practice card's identity); no mistake type", async () => {
    adArrival();
    render(page());
    fireEvent.click(await screen.findByTestId("one-min-opt-0"));
    await waitFor(() => expect(H.recordAttempt).toHaveBeenCalledTimes(1));
    const [user, ctx] = H.recordAttempt.mock.calls[0] as [{ uid: string }, Record<string, unknown>];
    expect(user.uid).toBe(SIGNED_IN.uid);
    expect(ctx).toMatchObject({ mode: "mcq", marksAvailable: 1, surface: expect.any(String), questionId: expect.stringMatching(/^PYQ-/) });
    expect([0, 1]).toContain(ctx.marksScored);
    expect(ctx).not.toHaveProperty("grade");
  });

  async function ladderToTypedAnswer() {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    fireEvent.click(await screen.findByTestId("one-min-opt-0"));
    fireEvent.click(screen.getByTestId("one-min-next"));
    await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Step 1 formula. Step 2 substitute. Step 3 answer 5 cm." } });
  }

  it("★ ONE-MINUTE-1: the typed grade fires one_min_type_graded once with seconds_since_ladder_start, and the photo CTA shows", async () => {
    await ladderToTypedAnswer();
    H.checkSolutionImage.mockResolvedValue(GRADED);
    fireEvent.click(await screen.findByRole("button", { name: /^check|grade/i }));
    expect(await screen.findByTestId("one-min-photo-cta")).toBeInTheDocument();
    // The event fires after the grade settles; wait for it rather than racing the CTA's paint (CI flake, 1 Nov).
    await waitFor(() => expect(H.one.mock.calls.filter((c) => c[0] === "one_min_type_graded")).toHaveLength(1));
    const graded = H.one.mock.calls.filter((c) => c[0] === "one_min_type_graded");
    expect(Object.keys(graded[0][1] as object)).toEqual(["seconds_since_ladder_start"]);
    expect(typeof (graded[0][1] as { seconds_since_ladder_start: number }).seconds_since_ladder_start).toBe("number");
  });

  it("★ ONE-MINUTE-1: editing the question after the typed step ends the ladder: no type_graded, no photo CTA for the unrelated answer", async () => {
    await ladderToTypedAnswer();
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "State Ohm's law and write its formula. [2]" } });
    H.detectQuestion.mockResolvedValue({ ok: true, detectedMarks: 2, detectedSubject: "Science", detectedTopic: "electricity", marksSource: "stated", questions: [{ questionNumber: 1, questionText: "State Ohm's law and write its formula.", marks: 2, marksSource: "stated" }] });
    fireEvent.click(await screen.findByRole("button", { name: /read the question/i }));
    H.checkSolutionImage.mockResolvedValue(GRADED);
    fireEvent.click(await screen.findByRole("button", { name: /^check|grade/i }));
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalled());
    await settle();
    expect(H.one.mock.calls.filter((c) => c[0] === "one_min_type_graded")).toHaveLength(0);
    expect(screen.queryByTestId("one-min-photo-cta")).toBeNull();
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
    // ONE-MINUTE-1: an ad arrival leads with the 1-tap ladder; the sample picker is its secondary link.
    fireEvent.click(await screen.findByTestId("one-min-watch"));
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

  it("★ S2: the shared-link moment (M9, a second Byte) does not show while the card shows; shared-link visitors stay in the audience", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    __setGuideAbForTests(true, "guide");
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    adArrival();
    render(page("/check-improve?utm_source=parent_share&utm_medium=whatsapp"));
    expect(await screen.findByTestId("ci-demo")).toBeInTheDocument();
    await settle();
    await settle();
    expect(screen.queryByTestId("guide-moment-m9")).toBeNull();
    // once the card is closed the shared-link moment is exactly what it was before this lane
    fireEvent.click(screen.getByTestId("ci-demo-close"));
    await waitFor(() => expect(screen.queryByTestId("guide-moment-m9")).not.toBeNull(), { timeout: 5000 });
  });

  it("★ S4: while the chunk loads, a placeholder holds the card's place (and only for a visitor who will see the card)", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    // a signed-out free visitor is in the audience from the first render: the placeholder (or the card) is there at once.
    expect(screen.queryByTestId("ci-demo-placeholder") ?? screen.queryByTestId("ci-demo")).not.toBeNull();
    expect(await screen.findByTestId("ci-demo")).toBeInTheDocument();
    expect(screen.queryByTestId("ci-demo-placeholder")).toBeNull();
  });

  it("★ S4 control: a visitor outside the audience gets no placeholder", async () => {
    window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/notes", utm_content: null, utm_campaign: null }));
    render(page());
    await settle();
    expect(screen.queryByTestId("ci-demo-placeholder")).toBeNull();
  });

  it("★ S2b: the answer-step moment (M4, a second Byte) waits while the card shows, and returns once it is closed", async () => {
    __setGuideAbForTests(true, "guide");
    adArrival();
    render(page());
    expect(await screen.findByTestId("ci-demo")).toBeInTheDocument();
    await settle();
    await settle();
    expect(screen.queryByTestId("guide-moment-m4")).toBeNull();
    fireEvent.click(screen.getByTestId("ci-demo-close"));
    await waitFor(() => expect(screen.queryByTestId("guide-moment-m4")).not.toBeNull(), { timeout: 5000 });
  });

  it("★ CI-SOFT-1b: after × the inline Start-here card returns but its full-screen Byte does NOT open (this tab)", async () => {
    adArrival();
    render(page());
    fireEvent.click(await screen.findByTestId("ci-demo-close"));
    expect(await screen.findByTestId("start-here-card")).toBeInTheDocument();
    await settle();
    await settle();
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
  });

  it("★ CI-SOFT-1b: a reload of the tab after × keeps it (the closed key), still no full-screen Byte", async () => {
    adArrival();
    window.sessionStorage.setItem(CI_DEMO_CLOSED_KEY, "1");
    render(page());
    expect(await screen.findByTestId("start-here-card")).toBeInTheDocument();
    await settle();
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
  });

  it("★ CI-SOFT-1b CONTROL: where the card never showed (no ad arrival) the focus surface opens exactly as today", async () => {
    window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/notes", utm_content: null, utm_campaign: null }));
    render(page());
    expect(await screen.findByTestId("start-here-focus")).toBeInTheDocument();
  });

  it("★ CI-SOFT-1b: 'Check my own answer' focuses THIS page's answer box, not another one in the document", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    const decoy = document.createElement("textarea");
    decoy.setAttribute("aria-label", "Type your answer");
    document.body.prepend(decoy);
    try {
      render(page());
      fireEvent.click(await screen.findByTestId("one-min-watch"));
      fireEvent.click(await screen.findByTestId("ci-demo-tile-circ"));
      fireEvent.click(await screen.findByTestId("ci-demo-check-own"));
      await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
      const mine = screen.getAllByLabelText("Type your answer").find((el) => el !== decoy);
      expect(mine).toBeDefined();
      expect(document.activeElement).toBe(mine);
      expect(document.activeElement).not.toBe(decoy);
    } finally {
      decoy.remove();
    }
  });

  it("★★ ONE-MINUTE-1: tap → '2-mark one' fills the question, seeds the confirmed read (NO detect call), Type tab, box focused; Check grades the seeded request", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    adArrival();
    render(page());
    fireEvent.click(await screen.findByTestId("one-min-opt-0"));
    expect(screen.getByTestId("one-min-verdict")).toBeInTheDocument();
    // signed out: the tap persists nothing
    expect(H.recordAttempt.mock.calls.every((c) => !(c[0] as { uid?: string } | null)?.uid)).toBe(true); // the door only ever sees no user
    fireEvent.click(screen.getByTestId("one-min-next"));
    await waitFor(() => expect(screen.queryByTestId("ci-demo")).toBeNull());
    const q = (screen.getByLabelText("Type the question") as HTMLTextAreaElement).value;
    expect(q).toMatch(/\[2\]$/);
    expect(document.activeElement).toBe(screen.getByLabelText("Type your answer"));
    expect(H.detectQuestion).not.toHaveBeenCalled();
    // the confirmed chip is already there (marks 2), so Check is reachable without "Read the question"
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Step 1 formula. Step 2 substitute. Step 3 answer 5 cm." } });
    H.checkSolutionImage.mockReturnValue(new Promise(() => {})); // only the request is under test
    fireEvent.click(await screen.findByRole("button", { name: /^check|grade/i }));
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    const sent = H.checkSolutionImage.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).toMatchObject({ question: q, marks: 2, textAnswer: expect.stringContaining("Step 1") });
    expect(typeof sent.subject).toBe("string");
    expect(String(sent.topic)).not.toBe("");
    expect(H.detectQuestion).not.toHaveBeenCalled();
  });
});

describe("HOME-LADDER-1b · Home's ladder request survives auth arriving after first render", () => {
  it("★ note set, user null -> uid later: the ladder starts (one_min_tap_shown) and the question box is NOT focused", async () => {
    window.sessionStorage.setItem("lazytopper.checkOneHandover", "1");
    window.sessionStorage.setItem("lazytopper.checkOneLadder", "1");
    H.auth = { user: null, loading: true };
    const view = render(page());
    await settle();
    expect(screen.queryByTestId("one-min-opt-0")).toBeNull();
    // The gate shows while auth resolves: the page (and its note) are not mounted yet, nothing is consumed.
    expect(window.sessionStorage.getItem("lazytopper.checkOneLadder")).toBe("1");
    H.auth = { user: SIGNED_IN, loading: false };
    view.rerender(page());
    // On mount the page is still reading its draft (`inProgress`), so startLadder() is refused at first; it is retried.
    await waitFor(() => expect(window.sessionStorage.getItem("lazytopper.checkOneLadder")).toBeNull());
    expect(await screen.findByTestId("one-min-opt-0")).toBeInTheDocument();
    expect(H.one.mock.calls.map((c) => c[0])).toContain("one_min_tap_shown");
    const box = document.querySelector("textarea");
    expect(box && document.activeElement === box).toBe(false);
  });

  it("no note: nothing starts on its own", async () => {
    window.sessionStorage.setItem("lazytopper.checkOneHandover", "1");
    render(page());
    await settle();
    expect(screen.queryByTestId("one-min-opt-0")).toBeNull();
  });
});
