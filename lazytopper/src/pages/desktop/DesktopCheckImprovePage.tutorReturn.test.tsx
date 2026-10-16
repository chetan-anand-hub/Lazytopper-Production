/**
 * QP-SCORECARD-2 C (law 6) — Check & Improve's half of "the tutor round trip returns to the
 * scorecard", on the REAL page. Only the network edges are stubbed (the funnelEvents harness).
 *
 *   · a SAVED paper's "Ask the tutor why I lost this mark" hands the tutor
 *     returnTo=/check-improve?review=<that paper's code> (was the bare /check-improve);
 *   · landing on /check-improve?review=<code> reopens THAT saved paper read-only, once, and
 *     strips the param with replace;
 *   · an unreadable code, or another account's record → the plain page, silently.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { useEffect } from "react";

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
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  records: [] as unknown[],
  onboarding: vi.fn(),
  url: "",
  pushes: 0,
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
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: (...a: unknown[]) => H.onboarding(...a) };
});
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: () => Promise.resolve({ outcome: "logged", bridged: false }) };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: () => "recorded" };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    ensureCheckImproveSessionCode: (...a: unknown[]) => {
      const user = a[3] as { uid?: string } | null | undefined;
      if (!user?.uid) return (actual.ensureCheckImproveSessionCode as (...b: unknown[]) => unknown)(...a);
      return Promise.resolve({ code: "CI-M-REAL-02", name: "Real Numbers · Paper #2", sequence: 2 });
    },
    getSessionRecordsFromCloud: () => Promise.resolve(H.records),
    getSessionPerQuestion: () => Promise.resolve(null),
  };
});
vi.mock("../../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveGradeService")>();
  return {
    ...actual,
    persistCheckImproveSession: (args: { user?: { uid?: string } | null }) =>
      args.user?.uid ? "recorded" : actual.persistCheckImproveSession(args as never),
  };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

const SIGNED_IN = { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null };
const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 3, marksSource: "stated" }],
};
const GRADED = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [
    {
      stepNumber: 1, description: "Assume rational", studentWork: "Let root 2 = p/q", status: "partial",
      marksAwarded: 1, marksDeducted: 1, teacherAnnotation: "State co-prime.", mistakeType: "presentation", correctedWorking: null,
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
  teacherNote: "Nearly there.",
};
function ciRecord(id: string, uid: string) {
  return {
    id,
    worksheetId: `ci:${id}`,
    surface: "check-improve",
    title: "Real Numbers · Paper #7",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: [],
    marksAwarded: 4,
    marksTotal: 5,
    status: "graded",
    fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1751500000000,
    perQuestionRef: `ci:${id}`,
    dedupKey: `${uid}::${id}`,
  };
}

function Probe() {
  const l = useLocation();
  const t = useNavigationType();
  H.url = `${l.pathname}${l.search}`;
  useEffect(() => {
    if (t === "PUSH") H.pushes += 1;
  }, [l.key, t]);
  return null;
}
function page(url = "/check-improve") {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Probe />
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="*" element={<div data-testid="elsewhere" />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.records = [];
  H.url = "";
  H.pushes = 0;
  H.onboarding.mockReset();
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("QP-SCORECARD-2 C · Check & Improve — the tutor returns to the SAVED paper", () => {
  it("★★ the saved paper's tutor button hands returnTo=/check-improve?review=<that paper's code>", async () => {
    render(page());
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Prove that root 2 is irrational." } });
    fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Let root 2 = p/q in lowest terms ..." } });
    const grade = await screen.findByRole("button", { name: /Grade my answer|Retry grading/ });
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    const ask = await screen.findByTestId("sc-tutor-ask", {}, { timeout: 10000 });
    fireEvent.click(ask);
    await waitFor(() => expect(H.url).toMatch(/^\/tutor\//));
    const q = new URLSearchParams(H.url.split("?")[1]);
    expect(q.get("from")).toBe("CI-M-REAL-02");
    expect(q.get("returnTo")).toBe("/check-improve?review=CI-M-REAL-02");
  });

  it("★★ landing on ?review=<code> reopens THAT saved paper read-only, once; the param is stripped with replace", async () => {
    H.records = [ciRecord("CI-M-REAL-07", "u1")];
    render(page("/check-improve?review=CI-M-REAL-07"));
    expect(await screen.findByText(/CI-M-REAL-07 · graded/)).toBeInTheDocument();
    expect(screen.getByText("Real Numbers · Paper #7")).toBeInTheDocument();
    await waitFor(() => expect(H.url).toBe("/check-improve"));
    expect(H.pushes).toBe(0);
    // Done closes it; it does not reopen (one reopen per return).
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await act(async () => {});
    expect(screen.queryByText(/CI-M-REAL-07 · graded/)).toBeNull();
  });

  it("★ an unreadable code, or ANOTHER account's record → the plain page, silently", async () => {
    H.records = [ciRecord("CI-M-REAL-09", "someone-else")];
    for (const code of ["CI-M-REAL-404", "CI-M-REAL-09"]) {
      render(page(`/check-improve?review=${code}`));
      await waitFor(() => expect(H.url).toBe("/check-improve"));
      await act(async () => {});
      expect(screen.queryByText(new RegExp(`${code} · graded`))).toBeNull();
      expect(screen.getByLabelText("Type the question")).toBeInTheDocument();
      cleanup();
    }
  });
});
