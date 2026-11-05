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
import { MemoryRouter, Routes, Route, useLocation, useNavigate, useNavigationType } from "react-router-dom";
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
  payload: null as null | Record<string, unknown>,
  lock: "open" as "open" | "locked",
  exportCi: vi.fn(async () => "x.pdf"),
  onboarding: vi.fn(),
  url: "",
  pushes: 0,
  nav: null as null | ((to: number) => void),
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
    getSessionPerQuestion: () => Promise.resolve(H.payload),
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

// TUTOR-RETURN-SHEET-1 - the exporter is observed, never run; the detail lock is steerable.
vi.mock("../../components/worksheet/worksheetPdfExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../components/worksheet/worksheetPdfExport")>()),
  exportGradedCheckImprovePdf: (...a: unknown[]) => (H.exportCi as (...b: unknown[]) => unknown)(...a),
}));
vi.mock("../../components/results/useDetailLock", () => ({ useDetailLock: () => H.lock }));

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
  const nav = useNavigate();
  H.nav = (n: number) => nav(n);
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
  H.payload = null;
  H.lock = "open";
  H.exportCi.mockClear();
  H.url = "";
  H.pushes = 0;
  window.sessionStorage.clear();
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

  it("★ an unreadable code, or ANOTHER account's record → the plain page and an honest 'couldn't reopen' line", async () => {
    H.records = [ciRecord("CI-M-REAL-09", "someone-else")];
    for (const code of ["CI-M-REAL-404", "CI-M-REAL-09"]) {
      render(page(`/check-improve?review=${code}`));
      await waitFor(() => expect(H.url).toBe("/check-improve"));
      await act(async () => {});
      expect(screen.queryByText(new RegExp(`${code} · graded`))).toBeNull();
      expect(screen.getByLabelText("Type the question")).toBeInTheDocument();
      // CI-TUTOR-RETURN-1 - no longer silent: an honest line and a way to Your papers.
      expect(await screen.findByTestId("ci-review-missed")).toHaveTextContent("We couldn’t reopen that paper.");
      cleanup();
    }
  });

  describe("TUTOR-RETURN-SHEET-1 · the restored Answer Checker card keeps its graded-sheet download", () => {
    const g = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
      qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: Math.round((marksAwarded / totalMarks) * 100),
      annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
    });
    const response = (rows: ReturnType<typeof g>[]) => ({
      ok: true,
      results: rows,
      gradedMarksAwarded: rows.reduce((a, r) => a + r.marksAwarded, 0),
      gradedMarksTotal: rows.reduce((a, r) => a + r.totalMarks, 0),
      gradedCount: rows.length,
      totalQuestions: rows.length,
      pendingCount: 0,
      worksheetTotalMarks: rows.reduce((a, r) => a + r.totalMarks, 0),
    });
    const DL = /Download graded solution/;
    const open = async () => {
      H.records = [ciRecord("CI-M-REAL-07", "u1")];
      render(page("/check-improve?review=CI-M-REAL-07"));
      await screen.findByText(/CI-M-REAL-07 · graded/);
    };
    const printed = () => (H.exportCi.mock.calls[0] as unknown as [{ code: string; questions: Array<{ qNumber?: number; questionText?: string }> }])[0];

    it("★ single question: the download prints the SAVED question text", async () => {
      H.payload = { response: response([g(1, 3, 2)]), questionTexts: ["Prove that root 2 is irrational."] };
      await open();
      fireEvent.click(await screen.findByRole("button", { name: DL }));
      await waitFor(() => expect(H.exportCi).toHaveBeenCalledTimes(1));
      expect(printed().code).toBe("CI-M-REAL-07");
      expect(printed().questions).toHaveLength(1);
      expect(printed().questions[0].questionText).toBe("Prove that root 2 is irrational.");
      expect(printed().questions[0].qNumber).toBeUndefined();
    });

    it("★ multi question: one saved text per question, in order", async () => {
      H.payload = { response: response([g(1, 3, 2), g(2, 2, 2)]), questionTexts: ["First question", "Second question"] };
      await open();
      fireEvent.click(await screen.findByRole("button", { name: DL }));
      await waitFor(() => expect(H.exportCi).toHaveBeenCalledTimes(1));
      expect(printed().questions.map((q) => [q.qNumber, q.questionText])).toEqual([[1, "First question"], [2, "Second question"]]);
    });

    it("★ an older paper (no saved texts) prints the honest line, never invented text", async () => {
      H.payload = { response: response([g(1, 3, 2), g(2, 2, 2)]) };
      await open();
      fireEvent.click(await screen.findByRole("button", { name: DL }));
      await waitFor(() => expect(H.exportCi).toHaveBeenCalledTimes(1));
      for (const q of printed().questions) expect(q.questionText).toBe("Question text not saved for this older paper");
    });

    it("★ a LOCKED card, or one with nothing graded, offers no download", async () => {
      H.payload = { response: response([g(1, 3, 2)]) };
      H.lock = "locked";
      await open();
      await screen.findByRole("button", { name: "Done" });
      await act(async () => {});
      expect(screen.queryByRole("button", { name: DL })).toBeNull();
    });
  });
});


describe("CI-TUTOR-RETURN-1 · come back from the tutor to the same graded paper, with every tutor button", () => {
  const g = (qNumber: number, totalMarks: number, marksAwarded: number, extra: Record<string, unknown> = {}) => ({
    qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: Math.round((marksAwarded / totalMarks) * 100),
    annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "", ...extra,
  });
  const paper = (rows: ReturnType<typeof g>[]) => ({
    ok: true, results: rows,
    gradedMarksAwarded: rows.reduce((a, r) => a + r.marksAwarded, 0),
    gradedMarksTotal: rows.reduce((a, r) => a + r.totalMarks, 0),
    gradedCount: rows.length, totalQuestions: rows.length, pendingCount: 0,
    worksheetTotalMarks: rows.reduce((a, r) => a + r.totalMarks, 0),
  });
  // Q1 lost, Q2 full, Q3 lost (own chapter), Q4 lost.
  const ROWS = () => [g(1, 3, 2), g(2, 2, 2), g(3, 3, 1, { topicSlug: "polynomials", topicSubject: "Maths" }), g(4, 5, 3)];
  const arrange = () => {
    H.records = [ciRecord("CI-M-REAL-07", "u1")];
    H.payload = { response: paper(ROWS()), questionTexts: ["T1", "T2", "T3", "T4"] };
  };
  const askButtons = () => screen.getAllByTestId("sc-tutor-ask");

  it("★★ the RESTORED card carries a tutor button on every question that lost marks (and only those)", async () => {
    arrange();
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    expect(screen.getAllByTestId("sc-wrong-answer").map((e) => e.textContent)).toEqual([
      expect.stringContaining("Question 1"), expect.stringContaining("Question 3"), expect.stringContaining("Question 4"),
    ]);
  });

  it("★★ a restored button hands the tutor the paper code + position (no text, answer or contact in the URL) and the question's own chapter", async () => {
    arrange();
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    fireEvent.click(askButtons()[1]); // Question 3 -> its own chapter
    await waitFor(() => expect(H.url).toMatch(/^\/tutor\//));
    expect(H.url).toContain("/polynomials");
    const q = new URLSearchParams(H.url.split("?")[1]);
    expect(q.get("q")).toBe("qn:3");
    expect(q.get("from")).toBe("CI-M-REAL-07");
    expect(q.get("returnTo")).toBe("/check-improve?review=CI-M-REAL-07");
    expect(H.url).not.toMatch(/T3|9000000000|@/);
  });

  it("★★ BROWSER BACK from the tutor restores the paper with every button; ask again about ANOTHER question", async () => {
    arrange();
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    fireEvent.click(askButtons()[0]);
    await waitFor(() => expect(H.url).toMatch(/^\/tutor\//));
    await act(async () => H.nav!(-1));
    // the entry we left now NAMES the paper, so it reopens (it used to be the bare, empty form)
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    // the asked one says so and is still tappable; the others are untouched
    expect(askButtons()[0]).toHaveTextContent("Asked the tutor \u2713 \u00b7 ask again");
    expect(askButtons()[1]).toHaveTextContent("Ask the tutor why I lost this mark");
    fireEvent.click(askButtons()[2]); // another mistake
    await waitFor(() => expect(new URLSearchParams(H.url.split("?")[1]).get("q")).toBe("qn:4"));
    await act(async () => H.nav!(-1));
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    expect(askButtons()[0]).toHaveTextContent("ask again");
    expect(askButtons()[2]).toHaveTextContent("ask again");
    expect(askButtons()[1]).not.toHaveTextContent("ask again");
    fireEvent.click(askButtons()[0]); // and the first one, again
    await waitFor(() => expect(new URLSearchParams(H.url.split("?")[1]).get("q")).toBe("qn:1"));
  });

  it("★★ arriving at the tutor's returnTo link restores the paper with every button", async () => {
    arrange();
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    cleanup();
    H.pushes = 0;
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
  });

  it("★ the 'asked' marker persists across the return (per-viewer, question numbers only)", async () => {
    arrange();
    window.sessionStorage.setItem("lt.scorecardAsked.v1", JSON.stringify({ "CI-M-REAL-07": [4] }));
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    expect(askButtons()[2]).toHaveTextContent("ask again");
    expect(askButtons()[0]).not.toHaveTextContent("ask again");
  });

  it("★ with sessionStorage blocked the buttons still render and work", async () => {
    arrange();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(3));
    fireEvent.click(askButtons()[0]);
    await waitFor(() => expect(H.url).toMatch(/^\/tutor\//));
  });

  it("★ a locked-down / older record with no resolvable chapter offers no button (never a guess)", async () => {
    H.records = [{ ...ciRecord("CI-M-REAL-07", "u1"), topicKeys: [], topicSource: "mixed" }];
    H.payload = { response: paper([g(1, 3, 1), g(2, 3, 1, { topicSlug: "polynomials", topicSubject: "Maths" })]) };
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(askButtons()).toHaveLength(1));
  });

  it("★★ the review waits for sign-in: while auth is loading the param is NOT stripped; then the paper opens", async () => {
    arrange();
    H.auth = { user: null, loading: true };
    const view = render(page("/check-improve?review=CI-M-REAL-07"));
    await act(async () => {});
    expect(H.url).toBe("/check-improve?review=CI-M-REAL-07");
    expect(screen.queryByTestId("ci-review-missed")).toBeNull();
    H.auth = { user: SIGNED_IN, loading: false };
    view.rerender(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/);
    await waitFor(() => expect(H.url).toBe("/check-improve"));
  });

  it("★★ a record that arrives on the retry read still opens (the miss is not final on the first read)", async () => {
    arrange();
    const all = H.records;
    H.records = [];
    // the second read of the records finds the paper
    let reads = 0;
    Object.defineProperty(H, "records", { configurable: true, get: () => (reads++ >= 1 ? all : []), set: () => {} });
    render(page("/check-improve?review=CI-M-REAL-07"));
    await screen.findByText(/CI-M-REAL-07 · graded/, {}, { timeout: 5000 });
    expect(screen.queryByTestId("ci-review-missed")).toBeNull();
    Object.defineProperty(H, "records", { configurable: true, writable: true, value: [] });
  });
});
