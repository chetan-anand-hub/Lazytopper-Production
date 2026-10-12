/**
 * ACTIVATION-1 · L2 — Check & Improve, rendered with the REAL draft service: a signed-out
 * visitor's in-progress question + answer survive the sign-in round trip in THIS TAB, come
 * back UN-SUBMITTED at the step they left (the student taps Check), and are cleared on
 * submit and on expiry. Before this the page remounted EMPTY after sign-up.
 *
 * Only the edges are stubbed: auth, the subscription gate, the AI calls (spies) and the
 * analytics sink. The image half of the draft is the service's in-memory fake (jsdom has no
 * IndexedDB); the text half is the real sessionStorage.
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
  checkSolution: (() => undefined) as (...a: unknown[]) => unknown,
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    checkSolution: (...a: unknown[]) => H.checkSolution(...a),
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: () => {} };
});
vi.mock("../../services/studentProgressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/studentProgressStore")>();
  return { ...actual, getActiveProgressUser: () => H.activeUid };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import {
  CI_DRAFT_KEY,
  CI_DRAFT_MAX_AGE_MS,
  __setCiDraftImageStoreForTests,
  type CiDraftImageStore,
} from "../../services/checkImproveDraft";

const STUDENT = { uid: "the-student", email: "new@example.com", displayName: null, providerIds: ["password"] };
const QUESTION = "Prove that root 2 is irrational.";
const ANSWER = "Let root 2 = p/q in lowest terms, then 2q^2 = p^2 ...";

const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: QUESTION, marks: 3, marksSource: "stated" }],
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

function memoryImageStore(): CiDraftImageStore {
  const rows = new Map<string, { data: string; savedAt: number }>();
  return {
    async put(id, slot, data, savedAt) {
      rows.set(`${id}:${slot}`, { data, savedAt });
    },
    async get(id, slot) {
      return rows.get(`${id}:${slot}`)?.data ?? null;
    },
    async deleteId(id) {
      rows.delete(`${id}:q`);
      rows.delete(`${id}:a`);
    },
    async purgeOlderThan() {},
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __setCiDraftImageStoreForTests(memoryImageStore());
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  setMatchMediaMatches(true);
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.sub.hydrated = true;
  H.activeUid = null;
  H.detectQuestion = vi.fn().mockResolvedValue(DETECTED);
  H.checkSolutionImage = vi.fn().mockResolvedValue({ ok: false });
  H.checkSolution = vi.fn().mockResolvedValue({ ok: false });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setCiDraftImageStoreForTests(null);
});

/** Signed out: read the question and type (but do NOT grade) an answer, then let the autosave fire. */
async function typeQuestionAndAnswerSignedOut() {
  renderPage();
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: QUESTION } });
  fireEvent.click(screen.getByRole("button", { name: /Read the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: ANSWER } });
  // the 800 ms autosave debounce
  await waitFor(() => expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).not.toBeNull(), { timeout: 3000 });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1000));
  });
}

/** The sign-in round trip in the SAME tab: the page remounts, now signed in as `user`. */
function returnSignedInAs(user: Record<string, unknown>) {
  cleanup();
  H.auth = { user, loading: false };
  H.activeUid = user.uid as string;
  H.sub.isPremium = true; // a new account's 7-day trial started at sign-up: Check & Improve is open
  return renderPage();
}

describe("ACTIVATION-1 · the in-progress answer survives sign-up in this tab", () => {
  it("★ question + answer typed signed-out come back after sign-in, UN-SUBMITTED, with Check ready; nothing is sent", async () => {
    await typeQuestionAndAnswerSignedOut();
    const stored = window.sessionStorage.getItem(CI_DRAFT_KEY)!;
    expect(stored).toContain("root 2"); // text lives in this tab's sessionStorage …
    expect(window.localStorage.length).toBe(0); // … and never in localStorage

    returnSignedInAs(STUDENT);

    // The question is back, confirmed (the read is not repeated), and the answer is attached.
    await waitFor(() =>
      expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe(QUESTION),
    );
    await waitFor(() =>
      expect((screen.getByLabelText("Type your answer") as HTMLTextAreaElement).value).toBe(ANSWER),
    );
    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    await waitFor(() => expect(grade).not.toBeDisabled());

    // The student taps Check: NOTHING was graded or re-read on their behalf.
    expect(H.checkSolution).not.toHaveBeenCalled();
    expect(H.checkSolutionImage).not.toHaveBeenCalled();
    expect(H.detectQuestion).toHaveBeenCalledTimes(1); // the signed-out read only
    // One-shot: restored, so cleared.
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
  });

  it("★ a draft older than 30 minutes is NOT restored (the page comes back empty) and is cleared", async () => {
    await typeQuestionAndAnswerSignedOut();
    const d = JSON.parse(window.sessionStorage.getItem(CI_DRAFT_KEY)!) as { savedAt: number };
    d.savedAt = Date.now() - CI_DRAFT_MAX_AGE_MS - 60_000;
    window.sessionStorage.setItem(CI_DRAFT_KEY, JSON.stringify(d));

    returnSignedInAs(STUDENT);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe("");
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
  });

  it("CONTROL: the same draft aged just under 30 minutes IS restored (the expiry case can fail)", async () => {
    await typeQuestionAndAnswerSignedOut();
    const d = JSON.parse(window.sessionStorage.getItem(CI_DRAFT_KEY)!) as { savedAt: number };
    d.savedAt = Date.now() - CI_DRAFT_MAX_AGE_MS + 120_000;
    window.sessionStorage.setItem(CI_DRAFT_KEY, JSON.stringify(d));

    returnSignedInAs(STUDENT);
    await waitFor(() =>
      expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe(QUESTION),
    );
  });

  it("submitting clears the draft: a graded signed-out attempt is not offered back after sign-in", async () => {
    H.checkSolution = vi.fn().mockResolvedValue({
      ok: true,
      totalMarks: 3,
      marksAwarded: 2,
      percentage: 67,
      annotatedSteps: [],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "ok",
    });
    await typeQuestionAndAnswerSignedOut();
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).not.toBeNull();

    const grade = await screen.findByRole("button", { name: /Grade my answer/ });
    await waitFor(() => expect(grade).not.toBeDisabled());
    fireEvent.click(grade);
    await waitFor(() => expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull());

    returnSignedInAs(STUDENT);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe("");
  });

  it("a signed-IN student's typing is never saved as a draft", async () => {
    H.auth = { user: STUDENT, loading: false };
    H.activeUid = STUDENT.uid;
    H.sub.isPremium = true;
    renderPage();
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: QUESTION } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1200));
    });
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
  });

  it("★ the last edit inside the 800 ms debounce is saved when the student leaves for sign-in", async () => {
    const view = renderPage();
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: QUESTION } });
    // no wait: unmount (the sign-in navigation) before the debounce fires
    view.unmount();
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toContain("root 2");
  });

  it("★ a remount between the read and the apply (StrictMode) still restores the draft", async () => {
    await typeQuestionAndAnswerSignedOut();
    cleanup();
    H.auth = { user: STUDENT, loading: false };
    H.activeUid = STUDENT.uid;
    H.sub.isPremium = true;
    const { StrictMode } = await import("react");
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/check-improve"]}>
          <Routes>
            <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
    await waitFor(() =>
      expect((screen.getByLabelText("Type your answer") as HTMLTextAreaElement).value).toBe(ANSWER),
    );
    expect(window.sessionStorage.getItem(CI_DRAFT_KEY)).toBeNull();
  });
});
