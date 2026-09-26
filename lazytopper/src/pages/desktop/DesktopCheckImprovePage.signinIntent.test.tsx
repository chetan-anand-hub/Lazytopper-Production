/**
 * FREE-CHECK-1b FIX-2 (owner ruling OR-18) — Check & Improve, rendered with the REAL
 * return hook (useFreeCheckReturn) and the REAL replay (freeCheckReplay): a waiting free
 * result is saved into an account ONLY when THIS TAB clicked a free-check sign-in link
 * for it. The shared-device hazard: someone else signs in on the same browser and opens
 * Check & Improve — they must get nothing saved and no trial offer.
 *
 * Only the edges are stubbed: auth (useAuth), the subscription gate (useSubscription),
 * the grading calls (aiClient spies), the analytics sink, and the account writers
 * (recordMistake / recordAttempt / the session code / the session record). A writer
 * called with a SIGNED-IN user is a save into an account; the signed-out grade's own
 * calls (user null) go to the real modules, exactly as in production.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
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
  activeUid: null as string | null,
  detectQuestion: (() => undefined) as (...a: unknown[]) => unknown,
  checkSolutionImage: (() => undefined) as (...a: unknown[]) => unknown,
  accountRecordMistake: [] as unknown[][],
  accountRecordAttempt: [] as unknown[][],
  accountPersist: [] as unknown[][],
  track: [] as unknown[][],
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => H.auth,
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => H.sub,
}));
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
  return {
    ...actual,
    trackNamedEvent: (...a: unknown[]) => {
      H.track.push(a);
    },
  };
});
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return {
    ...actual,
    recordMistake: (user: { uid?: string } | null, ...rest: unknown[]) => {
      if (!user?.uid) return (actual.recordMistake as (...a: unknown[]) => unknown)(user, ...rest);
      H.accountRecordMistake.push([user, ...rest]);
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
      H.accountRecordAttempt.push([user, ...rest]);
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
      H.accountPersist.push([args]);
      return "recorded";
    },
  };
});
vi.mock("../../services/studentProgressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/studentProgressStore")>();
  return { ...actual, getActiveProgressUser: () => H.activeUid };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import {
  FREE_CHECK_PENDING_KEY,
  FREE_CHECK_SIGNIN_INTENT_KEY,
  FREE_CHECK_USED_KEY,
  __setFreeCheckClockForTests,
  hasPendingFreeCheck,
} from "../../services/freeCheckClient";

const PERSON_B = { uid: "person-b", email: null, phoneNumber: "+919000000001", displayName: null };
const STUDENT = { uid: "the-student", email: null, phoneNumber: "+919000000002", displayName: null };

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

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  setMatchMediaMatches(true);
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.sub.isTrialExpired = false;
  H.sub.hydrated = true;
  H.sub.startTrial = vi.fn();
  H.activeUid = null;
  H.detectQuestion = vi.fn().mockResolvedValue(DETECTED);
  H.checkSolutionImage = vi.fn().mockResolvedValue(GRADED);
  H.accountRecordMistake = [];
  H.accountRecordAttempt = [];
  H.accountPersist = [];
  H.track = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setFreeCheckClockForTests(null);
});

/** Signed out: read the question, type an answer, grade it. The result then waits (R8). */
async function freeGradeSignedOut() {
  renderPage();
  fireEvent.change(screen.getByLabelText("Type the question"), {
    target: { value: "Prove that root 2 is irrational." },
  });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), {
    target: { value: "Let root 2 = p/q in lowest terms, then 2q^2 = p^2 ..." },
  });
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
  await waitFor(() => expect(window.localStorage.getItem(FREE_CHECK_USED_KEY)).not.toBeNull());
  expect(hasPendingFreeCheck()).toBe(true);
}

/** The login round trip in the SAME tab: the page remounts, now signed in as `user`. */
function returnSignedInAs(user: Record<string, unknown>) {
  cleanup();
  H.auth = { user, loading: false };
  H.activeUid = user.uid as string; // AuthContext has set the progress scope
  return renderPage();
}

describe("OR-18 — a sign-in WITHOUT the marker saves nothing and offers nothing", () => {
  it("★ a different person signs in on the shared device: no recordMistake / recordAttempt into their account, no offer, today's lock", async () => {
    await freeGradeSignedOut();
    // The student walks away WITHOUT clicking a free-check sign-in link.
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();

    const { container } = returnSignedInAs(PERSON_B);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect(H.accountRecordMistake).toEqual([]);
    expect(H.accountRecordAttempt).toEqual([]);
    expect(H.accountPersist).toEqual([]);
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(container.textContent).not.toContain("Saving your answer");
    expect(screen.queryByRole("button", { name: "Start my free trial" })).toBeNull();
    expect(container.textContent).toContain("Premium Feature"); // the lock, exactly as today
    expect(H.track).not.toContainEqual(["free_check_signup"]);
    // Left on the device to expire (2h), not claimed.
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).not.toBeNull();
  });
});

describe("OR-18 — the same-tab flow WITH the marker is saved as before (OR-8 unchanged)", () => {
  it("★ grade → 'Sign up free' (the scorecard row) → sign in in this tab → saved once through recordMistake + recordAttempt → the offer; the marker is cleared", async () => {
    await freeGradeSignedOut();
    const pending = JSON.parse(window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "null") as { gradedAt: number };

    // The click writes the marker, then navigates to /login?redirect=%2Fcheck-improve.
    fireEvent.click(await screen.findByRole("button", { name: /Sign up free/ }));
    expect(await screen.findByTestId("login-probe")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(pending.gradedAt));

    const { container } = returnSignedInAs(STUDENT);
    await waitFor(() => expect(container.textContent).toContain("Your answer is saved."), { timeout: 3000 });

    expect(H.accountRecordMistake).toHaveLength(1);
    expect(H.accountRecordAttempt).toHaveLength(1);
    expect((H.accountRecordMistake[0][0] as { uid: string }).uid).toBe("the-student");
    expect(H.accountRecordAttempt[0][1]).toMatchObject({ timestamp: pending.gradedAt, marksScored: 2 });
    expect(H.accountPersist).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Start my free trial" })).toBeInTheDocument();
    expect(H.sub.startTrial).not.toHaveBeenCalled();
    // Spent: the marker and the waiting result are both gone.
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBeNull();
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).toBeNull();
  });

  it("the inline save prompt's link writes the marker too, and the same tab is saved", async () => {
    await freeGradeSignedOut();
    const pending = JSON.parse(window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "null") as { gradedAt: number };
    const links = await screen.findAllByTestId("free-check-signin");
    fireEvent.click(links[0]);
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(pending.gradedAt));

    const { container } = returnSignedInAs(STUDENT);
    await waitFor(() => expect(container.textContent).toContain("Your answer is saved."), { timeout: 3000 });
    expect(H.accountRecordMistake).toHaveLength(1);
    expect(H.accountRecordAttempt).toHaveLength(1);
  });

  it("★ the marker cannot outlive the result: signed in 2h+1m after grading → discarded, nothing saved, no offer", async () => {
    await freeGradeSignedOut();
    const pending = JSON.parse(window.localStorage.getItem(FREE_CHECK_PENDING_KEY) ?? "null") as { gradedAt: number };
    fireEvent.click(await screen.findByRole("button", { name: /Sign up free/ }));
    expect(window.sessionStorage.getItem(FREE_CHECK_SIGNIN_INTENT_KEY)).toBe(String(pending.gradedAt));

    __setFreeCheckClockForTests(() => pending.gradedAt + 2 * 60 * 60 * 1000 + 60 * 1000);
    const { container } = returnSignedInAs(STUDENT);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(H.accountRecordMistake).toEqual([]);
    expect(H.accountRecordAttempt).toEqual([]);
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).toBeNull(); // deleted when peeked
  });
});
