/**
 * FREE-CHECK-1b — Check & Improve, rendered: the flag-off invariant (R11 / N12), the
 * signed-out free check at both widths (N11), R1, the refusal copy, the save prompt's
 * sign-in target (OR-8), and the R9 trial offer (N15).
 *
 * The gate is stubbed through `useSubscription` (the blast-radius guard in
 * entitlementGating.test.ts), and auth through `useAuth` — both mutable per test. The
 * grading calls are spies on the REAL aiClient module (every other export kept), so
 * what the page hands them — the free-check opt-in — is what is asserted.
 *
 * Mutations this file turns RED (applied, seen red, reverted — see the lane report):
 *   B1 the flag check removed (the free branch shows with the flag off)
 *   B3 the R1 mark set before the result arrives
 *   B4 a sign-in link pointed at /sign-up
 *   B6 the trial auto-started
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
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
    startTrial: vi.fn(),
    upgradeToPremium: vi.fn(),
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  phase: "none" as "none" | "saving" | "saved",
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
vi.mock("../../hooks/useFreeCheckReturn", () => ({
  useFreeCheckReturn: (user: unknown, enabled: boolean) => (user && enabled ? H.phase : "none"),
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
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { PremiumRequiredError } from "../../ai/aiClient";
import {
  FREE_CHECK_PENDING_KEY,
  FREE_CHECK_USED_KEY,
  FreeCheckRefusedError,
  type FreeCheckRefusalReason,
} from "../../services/freeCheckClient";

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

function LoginProbe() {
  const loc = useLocation();
  return <div data-testid="login-probe">{`LOGIN from=${String((loc.state as { from?: string } | null)?.from)}`}</div>;
}

function renderPage(props: { overlay?: { onClose: () => void } } = {}) {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage {...props} />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.sub.isTrialExpired = false;
  H.sub.hydrated = true;
  H.sub.startTrial = vi.fn();
  H.phase = "none";
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset();
  H.track.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const flagOn = () => vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
const flagOff = () => vi.stubEnv("VITE_FREE_CHECK_ENABLED", "");

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

/* ══════════════════════════════════════════════════════════════════════════
   R11 / N12 — FLAG OFF: byte-for-byte today's behaviour, both outcomes pinned
   ══════════════════════════════════════════════════════════════════════════ */

describe("flag OFF — Check & Improve behaves exactly as today (N12)", () => {
  it("a SIGNED-OUT visitor is redirected to /login with state.from", async () => {
    flagOff();
    renderPage();
    expect(await screen.findByTestId("login-probe")).toHaveTextContent("LOGIN from=/check-improve");
    expect(H.detectQuestion).not.toHaveBeenCalled();
  });

  it("a SIGNED-IN free student sees the Premium lock", () => {
    flagOff();
    H.auth = { user: SIGNED_IN, loading: false };
    const { container } = renderPage();
    expect(container.textContent).toContain("Premium Feature");
    expect(container.textContent).toMatch(/Start my free 7-day trial/);
    expect(screen.queryByRole("button", { name: /Read the question/ })).toBeNull();
  });

  it("even a waiting free result is ignored with the flag off (no free-check UI at all)", () => {
    flagOff();
    H.auth = { user: SIGNED_IN, loading: false };
    H.phase = "saved";
    const { container } = renderPage();
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(container.textContent).toContain("Premium Feature");
  });
});

describe("flag ON — the tutor overlay is untouched (the free branch is direct-visit only)", () => {
  it("a signed-out overlay mount still meets the gate, not the free check", async () => {
    flagOn();
    renderPage({ overlay: { onClose: vi.fn() } });
    expect(await screen.findByTestId("login-probe")).toHaveTextContent("LOGIN from=/check-improve");
  });

  it("a signed-in free student still sees the lock (P16's lock stays for everyone else)", () => {
    flagOn();
    H.auth = { user: SIGNED_IN, loading: false };
    const { container } = renderPage();
    expect(container.textContent).toContain("Premium Feature");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   The free check — signed out, flag on, both widths (N11)
   ══════════════════════════════════════════════════════════════════════════ */

describe("flag ON, signed out — the free check renders at both widths", () => {
  it("DESKTOP (≥1024): the page itself, no redirect, the dormant sign-in copy hidden", () => {
    flagOn();
    setMatchMediaMatches(true);
    const { container } = renderPage();
    expect(screen.getByRole("button", { name: /Read the question/ })).toBeInTheDocument();
    expect(screen.queryByTestId("login-probe")).toBeNull();
    expect(container.querySelector(".phone-shell")).toBeNull(); // DesktopShell owns desktop chrome
    expect(container.textContent).not.toContain("Sign in to save history");
  });

  it("MOBILE (<1024): the page inside MobileShell — the header is there (N11)", () => {
    flagOn();
    setMatchMediaMatches(false);
    const { container } = renderPage();
    expect(screen.getByRole("button", { name: /Read the question/ })).toBeInTheDocument();
    expect(container.querySelector(".phone-shell header")).not.toBeNull();
  });

  it("auth still loading → the gate's own 'Checking your session…', never the free form", () => {
    flagOn();
    H.auth = { user: null, loading: true };
    const { container } = renderPage();
    expect(container.textContent).toContain("Checking your session");
    expect(screen.queryByRole("button", { name: /Read the question/ })).toBeNull();
  });
});

describe("the free check, end to end (single question)", () => {
  it("every C&I call opts in to the free-check wire; success spends R1 and saves the result", async () => {
    flagOn();
    const { container } = renderPage();
    await readQuestion();
    expect(H.detectQuestion.mock.calls[0][1]).toEqual({ freeCheck: true });

    await gradeTypedAnswer();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    expect(H.checkSolutionImage.mock.calls[0][1]).toEqual({ freeCheck: true });

    // R1 — spent only now, after the grader answered ok. R8 — the result is waiting.
    await waitFor(() => expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).not.toBeNull());
    const pending = JSON.parse(window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "null");
    expect(pending).toMatchObject({ v: 1, kind: "single", subject: "Maths", graded: { marksAwarded: 2 } });

    // The post-result prompt (the scorecard footnote + the result card), exact copy.
    await waitFor(() =>
      expect(container.textContent).toContain("Sign up free to save this and build your mistake pattern."),
    );
    // OR-8 — every sign-in LINK on the page is the one door with the C&I redirect.
    const hrefs = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => /login|sign-up|signup/.test(h));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(h).toBe("/login?redirect=%2Fcheck-improve");
  });

  it("the scorecard's 'Sign up free' row goes to /login?redirect=%2Fcheck-improve", async () => {
    flagOn();
    renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    const row = await screen.findByRole("button", { name: /Sign up free/ });
    fireEvent.click(row);
    expect(await screen.findByTestId("login-probe")).toBeInTheDocument();
    // (the probe proves the route; the path+query is asserted on the constant in
    // freeCheckClient.test.ts and on every <a> above)
  });

  it("R1 — after the free result, 'Grade another' shows USED, and counts it with no identifier", async () => {
    flagOn();
    const { container } = renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    await waitFor(() => expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).not.toBeNull());
    fireEvent.click(screen.getAllByRole("button", { name: /Grade another/ })[0]);
    await waitFor(() =>
      expect(container.textContent).toContain(
        "You've used your free check. Sign up free to save it and start your 7-day free trial — no card needed.",
      ),
    );
    expect(screen.queryByRole("button", { name: /Read the question/ })).toBeNull();
    expect(H.track.mock.calls).toContainEqual(["free_check_used_block"]);
    for (const c of H.track.mock.calls) expect(c).toHaveLength(1);
  });

  it("R1 — a browser that already used it sees USED on arrival and can call nothing", () => {
    flagOn();
    window.localStorage.setItem(FREE_CHECK_USED_KEY, "1");
    const { container } = renderPage();
    expect(container.textContent).toContain("You've used your free check.");
    expect(screen.queryByRole("button", { name: /Read the question/ })).toBeNull();
    expect(H.detectQuestion).not.toHaveBeenCalled();
  });
});

describe("the free check, end to end (whole paper)", () => {
  it("grade-worksheet AND every per-question detect opt in; one upload spends R1 once", async () => {
    flagOn();
    H.detectQuestion.mockImplementation(async (req: { question?: string }) =>
      req.question === "Q-A" || req.question === "Q-B"
        ? { ok: true, detectedTopic: null, detectedSubject: null }
        : {
            ...DETECTED,
            questions: [
              { questionNumber: 1, questionText: "Q-A", marks: 2, marksSource: "stated" },
              { questionNumber: 2, questionText: "Q-B", marks: 3, marksSource: "stated" },
            ],
          },
    );
    H.gradeWorksheet.mockResolvedValue({
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
    });
    const { container } = renderPage();
    await readQuestion();

    // The question is typed, so the only file input on the page is the ANSWER sheet's.
    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs).toHaveLength(1);
    const answerInput = fileInputs[0] as HTMLInputElement;
    fireEvent.change(answerInput, {
      target: { files: [new File(["png-bytes"], "answers.png", { type: "image/png" })] },
    });
    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);

    await waitFor(() => expect(H.gradeWorksheet).toHaveBeenCalledTimes(1));
    expect(H.gradeWorksheet.mock.calls[0][1]).toEqual({ freeCheck: true });
    // 1 session detect + 2 per-question detects, EVERY one opted in (each mints its own token).
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(3));
    for (const c of H.detectQuestion.mock.calls) expect(c[1]).toEqual({ freeCheck: true });

    await waitFor(() => expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).not.toBeNull());
    const pending = JSON.parse(window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "null");
    expect(pending).toMatchObject({ kind: "multi", questions: [{ questionNumber: 1 }, { questionNumber: 2 }] });
    // Text only — the uploaded answer sheet never reaches storage.
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).not.toMatch(/imageBase64|cG5nLWJ5dGVz/);
    await waitFor(() =>
      expect(container.textContent).toContain("Sign up free to save this and build your mistake pattern."),
    );
  });
});

describe("R1 — the mark is set ONLY on a successful result", () => {
  it("a grade the grader could not do (ok:false) spends nothing", async () => {
    flagOn();
    H.checkSolutionImage.mockResolvedValue({ ok: false, error: "unreadable" });
    renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).toBeNull();
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).toBeNull();
  });

  it("a refused grade spends nothing and shows the refusal", async () => {
    flagOn();
    H.checkSolutionImage.mockRejectedValue(new FreeCheckRefusedError("ceiling_reached", "2026-09-26T18:30:00.000Z"));
    const { container } = renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    await waitFor(() => expect(container.textContent).toContain("Today's free checks are all used up."));
    expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).toBeNull();
  });
});

describe("each refusal reason → its copy, with the one sign-in link (N13 catch mapping)", () => {
  const QUOTA = "Today's free checks are all used up. Come back tomorrow — or sign up free now and start your 7-day trial to check today.";
  const BROWSER = "We couldn't start a free check in this browser. Sign up free and your 7-day trial covers it.";
  // OR-14 — `unavailable` has its own line; the App Check line is for app_check_* only.
  const UNAVAILABLE = "Free checks aren't available right now. Sign up free and your 7-day trial covers it.";
  it.each([
    ["ceiling_reached", QUOTA],
    ["budget", QUOTA],
    ["app_check_missing", BROWSER],
    ["app_check_invalid", BROWSER],
    ["unavailable", UNAVAILABLE],
  ] as Array<[FreeCheckRefusalReason, string]>)("detect refused: %s", async (reason, copy) => {
    flagOn();
    H.detectQuestion.mockRejectedValue(new FreeCheckRefusedError(reason));
    const { container } = renderPage();
    await readQuestion();
    await waitFor(() => expect(container.textContent).toContain(copy));
    const links = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(links).toContain("/login?redirect=%2Fcheck-improve");
    expect(links.some((h) => (h ?? "").startsWith("/sign-up"))).toBe(false);
    expect(container.textContent).not.toContain("We couldn't read the question");
  });

  it("the server's free check being OFF (a plain 402) reads as 'unavailable', not a grading error", async () => {
    flagOn();
    H.checkSolutionImage.mockRejectedValue(new PremiumRequiredError("Premium", "check-solution", "free", null));
    const { container } = renderPage();
    await readQuestion();
    await gradeTypedAnswer();
    await waitFor(() => expect(container.textContent).toContain(UNAVAILABLE));
    expect(container.textContent).not.toContain(BROWSER);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   R9 / N15 — the trial offer after a saved free result
   ══════════════════════════════════════════════════════════════════════════ */

describe("R9 — the trial offer (signed in, a free result saved)", () => {
  beforeEach(() => {
    flagOn();
    H.auth = { user: SIGNED_IN, loading: false };
  });

  it("while the result is being saved: the saving panel, no offer, no lock", () => {
    H.phase = "saving";
    const { container } = renderPage();
    expect(container.textContent).toContain("Saving your answer…");
    expect(container.textContent).not.toContain("Premium Feature");
  });

  it("saved but the subscription NOT hydrated yet → no offer", () => {
    H.phase = "saved";
    H.sub.hydrated = false;
    const { container } = renderPage();
    expect(container.textContent).not.toContain("Your answer is saved.");
  });

  it("saved + hydrated + free + never trialled → the offer, and mounting it starts NOTHING", async () => {
    H.phase = "saved";
    const { container } = renderPage();
    expect(container.textContent).toContain("Your answer is saved.");
    expect(container.textContent).toContain("Every answer you check helps build your mistake pattern.");
    expect(container.textContent).not.toMatch(/more checks? and your mistake pattern appears/i);
    await act(async () => {});
    expect(H.sub.startTrial).not.toHaveBeenCalled();
  });

  it("'Start my free trial' → startTrial once + the event, then the gate REMOUNTS open", async () => {
    H.phase = "saved";
    H.sub.startTrial = vi.fn(() => {
      H.sub.isPremium = true; // what activateTrial's cached trial reads as, on the remount
    });
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Start my free trial" }));
    expect(H.sub.startTrial).toHaveBeenCalledTimes(1);
    expect(H.track.mock.calls).toContainEqual(["free_check_trial_start"]);
    await waitFor(() => expect(screen.getByRole("button", { name: /Read the question/ })).toBeInTheDocument());
    expect(container.textContent).not.toContain("Your answer is saved.");
  });

  it("'Maybe later' → no trial, the offer goes, and the page is today's lock", () => {
    H.phase = "saved";
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    expect(H.sub.startTrial).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(container.textContent).toContain("Premium Feature");
  });

  it("a PREMIUM student is never offered a trial", () => {
    H.phase = "saved";
    H.sub.isPremium = true;
    const { container } = renderPage();
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(screen.getByRole("button", { name: /Read the question/ })).toBeInTheDocument();
  });

  it("an EXPIRED-trial student is never offered a trial", () => {
    H.phase = "saved";
    H.sub.isTrialExpired = true;
    const { container } = renderPage();
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(container.textContent).not.toMatch(/Start my free trial/);
  });
});
