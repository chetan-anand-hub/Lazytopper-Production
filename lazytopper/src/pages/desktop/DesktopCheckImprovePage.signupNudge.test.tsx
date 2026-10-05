/**
 * SIGNUP-NUDGE-1 (owner spec §2) — a free check that ends in a sign-up.
 *
 *   S1  the "used" block: its headline, the waiting result's summary (or the plain line
 *       when none is waiting / it expired), the body, the trial line, the ONE existing
 *       sign-in link with its OR-18 intent — and no "Practice CBQs" link (P9: a
 *       signed-out student cannot get a CBQ answer checked, so S1d is omitted).
 *   S2  the summary bar at the TOP of a free-mode result, never in paid mode; the bottom
 *       save prompt (P3) stays.
 *   S3  the summary reads only the waiting result; no new analytics event or payload.
 *
 * TIME: every expiry-sensitive case pins the free-check clock (__setFreeCheckClockForTests)
 * and seeds `gradedAt` relative to it — nothing here reads the wall clock raw, so the file
 * passes at any LT_TEST_CLOCK instant. The page cases write `gradedAt` from the page's own
 * `Date.now()` and read it back through the same clock, one moment later.
 *
 * Mutations this file turns RED (applied one at a time, seen red, reverted — lane report):
 *   M1  the pending-result read dropped (summarizePendingFreeCheck never peeks)
 *   M2  the bar shown in paid mode (the single-question mount's `isFreeMode &&` removed)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: false,
    isTrialExpired: false,
    hydrated: true,
    tier: "free",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  detectQuestion: (() => undefined) as (...a: unknown[]) => unknown,
  checkSolutionImage: (() => undefined) as (...a: unknown[]) => unknown,
  gradeWorksheet: (() => undefined) as (...a: unknown[]) => unknown,
  track: [] as unknown[][],
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({
  useFreeCheckReturn: () => "none",
}));
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
  return {
    ...actual,
    trackNamedEvent: (...a: unknown[]) => {
      H.track.push(a);
    },
  };
});
// The paid (signed-in) grade saves into the account; these writers are stubbed for a
// signed-in user only, exactly as the signinIntent suite does. A signed-out grade's own
// calls (user null) go to the real modules.
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return {
    ...actual,
    recordMistake: (user: { uid?: string } | null, ...rest: unknown[]) => {
      if (!user?.uid) return (actual.recordMistake as (...a: unknown[]) => unknown)(user, ...rest);
      return Promise.resolve({ outcome: "logged", bridged: false });
    },
  };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return {
    ...actual,
    recordAttempt: (user: { uid?: string } | null, ...rest: unknown[]) => {
      if (!user?.uid) return (actual.recordAttempt as (...a: unknown[]) => unknown)(user, ...rest);
      return "recorded";
    },
  };
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
  };
});
vi.mock("../../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveGradeService")>();
  return {
    ...actual,
    persistCheckImproveSession: (args: { user?: { uid?: string } | null }) => {
      if (!args.user?.uid) return actual.persistCheckImproveSession(args as never);
      return "recorded";
    },
  };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { FreeCheckResultBar, FreeCheckUsedPanel } from "../../components/checkimprove/FreeCheckPanels";
import {
  FREE_CHECK_PENDING_KEY,
  FREE_CHECK_PENDING_MAX_AGE_MS,
  FREE_CHECK_SIGNIN_INTENT_KEY,
  FREE_CHECK_SIGNIN_PATH,
  FREE_CHECK_USED_KEY,
  __setFreeCheckClockForTests,
  recordFreeCheckSuccess,
  summarizePendingFreeCheck,
  FREE_CHECK_SUMMARY_MAX_TAGS,
  type PendingMultiFreeCheck,
  type PendingSingleFreeCheck,
} from "../../services/freeCheckClient";
import { MONTHLY_INLINE } from "../../config/pricing";

/* ── the spec's copy, character for character (§2) ── */
const HEADLINE = "Your free check is done ✅";
const PLAIN = "Your answer was checked like a CBSE examiner.";
const BODY = "Sign up in one tap to keep this result and keep checking answers.";
// TRIAL-ON-SIGNUP-1b (owner addendum, wave B-6): the shared general line, price = MONTHLY_INLINE.
const TRIAL = `Try Premium free for 7 days — no card needed. After that, keep free Basic or upgrade to Premium at ${MONTHLY_INLINE}.`;
const MAIN_BUTTON = "Sign up free";
const BAR_CTA = "Sign up free to keep this";
const S1D_LINK = "Not now? Practice CBQs free";

/** A fixed instant — the pinned free-check clock. Never the wall clock. */
const NOW = Date.UTC(2026, 9, 1, 6, 30, 0);

function single(
  gradedAt: number,
  graded: Partial<PendingSingleFreeCheck["graded"]> = {},
): PendingSingleFreeCheck {
  return {
    v: 1,
    kind: "single",
    gradedAt,
    subject: "Maths",
    topicName: "Real Numbers",
    topicSlug: "real-numbers",
    topicTouched: false,
    question: "Prove that root 2 is irrational.",
    marksSource: "stated",
    detectionOverride: null,
    graded: {
      ok: true,
      totalMarks: 3,
      marksAwarded: 2,
      percentage: 67,
      annotatedSteps: [],
      mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "",
      ...graded,
    },
  };
}

function multi(gradedAt: number): PendingMultiFreeCheck {
  return {
    v: 1,
    kind: "multi",
    gradedAt,
    subject: "Maths",
    topicName: "Real Numbers",
    topicSlug: "real-numbers",
    topicTouched: false,
    questions: [
      { questionNumber: 1, questionText: "Q-A" },
      { questionNumber: 2, questionText: "Q-B" },
      { questionNumber: 3, questionText: "Q-C" },
    ],
    response: {
      ok: true,
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 2, marksAwarded: 1, mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 } },
        { qNumber: 2, couldNotRead: false, totalMarks: 3, marksAwarded: 2, mistakeSummary: { conceptual: 0, calculation: 1, silly: 1, presentation: 0 } },
        // An unread page carries no grade — its (absent) tags must not be counted.
        { qNumber: 3, couldNotRead: true, totalMarks: 5, note: "illegible" },
      ],
      totalQuestions: 3,
      gradedCount: 2,
      pendingCount: 1,
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      worksheetTotalMarks: 10,
    },
  };
}

/** Write a waiting result exactly as a successful free grade does (result + tab flag + R1 mark). */
function seedWaiting(p: PendingSingleFreeCheck | PendingMultiFreeCheck) {
  recordFreeCheckSuccess(p);
}

const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.sub.isTrialExpired = false;
  H.sub.hydrated = true;
  H.track = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setFreeCheckClockForTests(null);
});

/* ══════════════════════════════════════════════════════════════════════════
   S1 — the used block
   ══════════════════════════════════════════════════════════════════════════ */

describe("S1 — the used block, WITH a waiting result", () => {
  it("headline, '<score>/<max> marks' + the tag, body, trial line, and the main button — exact copy", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - 60_000));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = mount(<FreeCheckUsedPanel />);

    expect(screen.getByRole("heading", { name: HEADLINE })).toBeInTheDocument();
    const summary = screen.getByTestId("free-check-summary");
    expect(summary).toHaveTextContent("2/3 marks");
    expect(summary).toHaveTextContent("Knowledge gap ×1");
    expect(container.textContent).not.toContain(PLAIN);
    expect(container.textContent).toContain(BODY);
    expect(container.textContent).toContain(TRIAL);
    expect(screen.getByRole("link", { name: MAIN_BUTTON })).toHaveAttribute("href", FREE_CHECK_SIGNIN_PATH);
    // S3 — reading the waiting result sends nothing anywhere.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a whole-paper result: the graded subtotal, tags summed over the READ questions only", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(multi(NOW - 60_000));
    mount(<FreeCheckUsedPanel />);
    const summary = screen.getByTestId("free-check-summary");
    expect(summary).toHaveTextContent("3/5 marks");
    const tags = Array.from(summary.querySelectorAll(".lt-fc__tag")).map((t) => t.textContent);
    // SCORECARD-MI-1 — owner grouping: calculation + silly are CARELESS (2 calculation + 1 silly).
    expect(tags).toEqual(["Careless ×3"]);
  });

  it("at exactly two hours old the result is still waiting (the boundary is 'older than')", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - FREE_CHECK_PENDING_MAX_AGE_MS));
    const { container } = mount(<FreeCheckUsedPanel />);
    expect(screen.getByTestId("free-check-summary")).toHaveTextContent("2/3 marks");
    expect(container.textContent).not.toContain(PLAIN);
  });
});

describe("S1 — the used block, WITHOUT a waiting result → the plain line", () => {
  it("nothing waiting on this device", () => {
    __setFreeCheckClockForTests(() => NOW);
    window.localStorage.setItem(FREE_CHECK_USED_KEY, "1");
    const { container } = mount(<FreeCheckUsedPanel />);
    expect(screen.getByRole("heading", { name: HEADLINE })).toBeInTheDocument();
    expect(container.textContent).toContain(PLAIN);
    expect(screen.queryByTestId("free-check-summary")).toBeNull();
    expect(container.textContent).not.toMatch(/\d+\/\d+ marks/);
    expect(container.textContent).toContain(BODY);
    expect(container.textContent).toContain(TRIAL);
    expect(screen.getByRole("link", { name: MAIN_BUTTON })).toHaveAttribute("href", FREE_CHECK_SIGNIN_PATH);
  });

  it("an EXPIRED result (older than two hours) is absent — the plain line, never its score", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - FREE_CHECK_PENDING_MAX_AGE_MS - 1));
    const { container } = mount(<FreeCheckUsedPanel />);
    expect(container.textContent).toContain(PLAIN);
    expect(screen.queryByTestId("free-check-summary")).toBeNull();
    expect(container.textContent).not.toContain("2/3 marks");
  });

  it("a waiting result with no usable max and no tag says nothing invented — the plain line", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(
      single(NOW - 60_000, {
        totalMarks: 0,
        marksAwarded: 0,
        mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      }),
    );
    const { container } = mount(<FreeCheckUsedPanel />);
    expect(container.textContent).toContain(PLAIN);
    expect(container.textContent).not.toContain("0/0 marks");
  });

  it("no usable max: no score AND no tag (a type is shown only where a mark was lost) — never '2/0'", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - 60_000, { totalMarks: 0 }));
    const { container } = mount(<FreeCheckUsedPanel />);
    expect(container.textContent).toContain(PLAIN);
    expect(container.textContent).not.toMatch(/2\/0/);
    expect(container.textContent).not.toMatch(/Knowledge gap/);
  });
});

describe("S1b — the tags are capped at 3", () => {
  it("every mistake type present → never more than 3 tags, largest first, the owner's grouped wording", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(
      single(NOW - 60_000, {
        totalMarks: 5,
        marksAwarded: 1,
        mistakeSummary: { conceptual: 2, calculation: 1, silly: 4, presentation: 3 },
      }),
    );
    mount(<FreeCheckUsedPanel />);
    const tags = Array.from(screen.getByTestId("free-check-summary").querySelectorAll(".lt-fc__tag")).map(
      (t) => t.textContent,
    );
    // SCORECARD-MI-1 — the owner's three groups: careless = calculation 1 + silly 4,
    // exam technique = presentation 3, knowledge gap = conceptual 2. Largest first.
    expect(tags).toEqual(["Careless ×5", "Exam technique ×3", "Knowledge gap ×2"]);
    expect(summarizePendingFreeCheck()?.tags.length).toBeLessThanOrEqual(FREE_CHECK_SUMMARY_MAX_TAGS);
    // The four MI type names are never shown — only the approved grouped labels.
    expect(tags.join(" ")).not.toMatch(/Conceptual|Calculation|Silly|Presentation/);
  });
});

describe("S1d — the 'Practice CBQs free' link is OMITTED (P9: does not work signed out)", () => {
  it.each([
    ["with a waiting result", true],
    ["without one", false],
  ])("%s: the sign-in link plus (FRICTION-FIX-1 · F4) the one 'See plans' link; no /practice-hub link, no S1d copy", (_l, withResult) => {
    __setFreeCheckClockForTests(() => NOW);
    if (withResult) seedWaiting(single(NOW - 60_000));
    const { container } = mount(<FreeCheckUsedPanel />);
    expect(hrefs(container)).toEqual([FREE_CHECK_SIGNIN_PATH, "/pricing"]);
    expect(container.textContent).not.toContain(S1D_LINK);
    expect(container.querySelector('a[href*="practice-hub"]')).toBeNull();
  });
});

describe("S1 — free_check_used_block still fires once per showing, and nothing new is counted", () => {
  it("one showing = one event (a re-render does not recount); a second showing counts again", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - 60_000));
    const first = mount(<FreeCheckUsedPanel />);
    first.rerender(
      <MemoryRouter>
        <FreeCheckUsedPanel />
      </MemoryRouter>,
    );
    expect(H.track).toEqual([["free_check_used_block"]]);
    first.unmount();
    mount(<FreeCheckUsedPanel />);
    // S3 — the name only, no payload, and no new event beside it.
    expect(H.track).toEqual([["free_check_used_block"], ["free_check_used_block"]]);
  });
});

describe("the sign-in links carry the existing intent (OR-18 marker, same path)", () => {
  it.each([
    ["the used block's 'Sign up free'", <FreeCheckUsedPanel />, MAIN_BUTTON],
    ["the result bar's 'Sign up free to keep this'", <FreeCheckResultBar />, BAR_CTA],
  ] as Array<[string, React.ReactElement, string]>)("%s", (_label, ui, name) => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - 60_000));
    mount(ui);
    const link = screen.getByRole("link", { name });
    expect(link).toHaveAttribute("href", FREE_CHECK_SIGNIN_PATH);
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull(); // rendering writes nothing
    fireEvent.click(link);
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(NOW - 60_000));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   S2 — the summary bar
   ══════════════════════════════════════════════════════════════════════════ */

describe("S2 — the bar (component)", () => {
  it("with a waiting result: the summary and 'Sign up free to keep this'", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - 60_000));
    mount(<FreeCheckResultBar />);
    const bar = screen.getByTestId("free-check-result-bar");
    expect(bar).toHaveTextContent("2/3 marks");
    expect(bar).toHaveTextContent("Knowledge gap ×1");
    expect(bar).toHaveTextContent(BAR_CTA);
  });

  it("with nothing waiting (or expired): no bar — there is nothing to keep", () => {
    __setFreeCheckClockForTests(() => NOW);
    seedWaiting(single(NOW - FREE_CHECK_PENDING_MAX_AGE_MS - 1));
    const { container } = mount(<FreeCheckResultBar />);
    expect(screen.queryByTestId("free-check-result-bar")).toBeNull();
    expect(container.textContent).toBe("");
  });
});

/* ── the page: free mode shows the bar at the top; paid mode never does ── */

const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 3, marksSource: "stated" }],
};
const TWO_QUESTIONS = {
  ...DETECTED,
  questions: [
    { questionNumber: 1, questionText: "Q-A", marks: 2, marksSource: "stated" },
    { questionNumber: 2, questionText: "Q-B", marks: 3, marksSource: "stated" },
  ],
};
const GRADED = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [
    {
      stepNumber: 1,
      description: "Assume rational",
      studentWork: "Let root 2 = p/q",
      status: "partial",
      marksAwarded: 1,
      marksDeducted: 1,
      teacherAnnotation: "State co-prime.",
      mistakeType: "presentation",
      correctedWorking: null,
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
  teacherNote: "Nearly there.",
};
const WS_GRADED = {
  ok: true,
  results: [
    { qNumber: 1, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50, annotatedSteps: [], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
    { qNumber: 2, couldNotRead: false, totalMarks: 3, ok: true, marksAwarded: 3, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
  ],
  totalQuestions: 2,
  gradedCount: 2,
  pendingCount: 0,
  gradedMarksAwarded: 4,
  gradedMarksTotal: 5,
  worksheetTotalMarks: 5,
};

const SIGNED_IN = { uid: "the-student", email: null, phoneNumber: "+919000000002", displayName: null };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="/login" element={<div data-testid="login-probe">LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function readQuestion() {
  fireEvent.change(screen.getByLabelText("Type the question"), {
    target: { value: "Prove that root 2 is irrational." },
  });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
}

async function gradeTypedAnswer() {
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), {
    target: { value: "Let root 2 = p/q in lowest terms, then 2q^2 = p^2 ..." },
  });
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}

async function gradeUploadedPaper(container: HTMLElement) {
  const answerInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
  fireEvent.change(answerInput, {
    target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] },
  });
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}

/** The bar precedes the result's own header (its "Grade another" action) in the document. */
function expectBarAtTop(bar: HTMLElement) {
  const gradeAnother = screen.getAllByRole("button", { name: /Grade another/ })[0];
  expect(bar.compareDocumentPosition(gradeAnother) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe("S2 — the page, FREE mode (signed out, flag on): the bar tops the result", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    setMatchMediaMatches(true);
  });

  it("single question: the bar shows the score + tag at the top; the bottom save prompt stays", async () => {
    H.detectQuestion = vi.fn().mockResolvedValue(DETECTED);
    H.checkSolutionImage = vi.fn().mockResolvedValue(GRADED);
    renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    const bar = await screen.findByTestId("free-check-result-bar");
    expect(bar).toHaveTextContent("2/3 marks");
    // presentation is EXAM TECHNIQUE (owner ruling), not careless.
    expect(bar).toHaveTextContent("Exam technique ×1");
    expect(bar.querySelector("a")).toHaveAttribute("href", FREE_CHECK_SIGNIN_PATH);
    expect(bar).toHaveTextContent(BAR_CTA);
    expectBarAtTop(bar);
    // P3 unchanged — the bottom box is still there.
    expect(screen.getByTestId("free-check-save-prompt")).toBeInTheDocument();
    expect(screen.getAllByTestId("free-check-result-bar")).toHaveLength(1);
  });

  it("whole paper: the bar shows the graded subtotal + tag at the top", async () => {
    H.detectQuestion = vi.fn(async (req: unknown) =>
      (req as { question?: string }).question === "Q-A" || (req as { question?: string }).question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : TWO_QUESTIONS,
    );
    H.gradeWorksheet = vi.fn().mockResolvedValue(WS_GRADED);
    const { container } = renderPage();
    await readQuestion();
    await gradeUploadedPaper(container);
    const bar = await screen.findByTestId("free-check-result-bar");
    expect(bar).toHaveTextContent("4/5 marks");
    expect(bar).toHaveTextContent("Knowledge gap ×1");
    expectBarAtTop(bar);
    expect(screen.getAllByTestId("free-check-result-bar")).toHaveLength(1);
  });
});

describe("S2 — the page, PAID mode (a signed-in Premium student): never the bar", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    setMatchMediaMatches(true);
    H.auth = { user: SIGNED_IN, loading: false };
    H.sub.isPremium = true;
    // A free result is even waiting on this device — the bar would have something to
    // show if it were (wrongly) mounted. It must not be.
    seedWaiting(single(Date.now()));
  });

  it("single question: the result renders, no bar, no 'Sign up free to keep this'", async () => {
    H.detectQuestion = vi.fn().mockResolvedValue(DETECTED);
    H.checkSolutionImage = vi.fn().mockResolvedValue(GRADED);
    const { container } = renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    await screen.findAllByRole("button", { name: /Grade another/ });
    expect(screen.queryByTestId("free-check-result-bar")).toBeNull();
    expect(container.textContent).not.toContain(BAR_CTA);
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).not.toBeNull(); // the seed was there
  });

  it("whole paper: the result renders, no bar", async () => {
    H.detectQuestion = vi.fn(async (req: unknown) =>
      (req as { question?: string }).question === "Q-A" || (req as { question?: string }).question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : TWO_QUESTIONS,
    );
    H.gradeWorksheet = vi.fn().mockResolvedValue(WS_GRADED);
    const { container } = renderPage();
    await readQuestion();
    await gradeUploadedPaper(container);
    await screen.findAllByRole("button", { name: /Grade another/ });
    expect(screen.queryByTestId("free-check-result-bar")).toBeNull();
    expect(container.textContent).not.toContain(BAR_CTA);
  });
});
