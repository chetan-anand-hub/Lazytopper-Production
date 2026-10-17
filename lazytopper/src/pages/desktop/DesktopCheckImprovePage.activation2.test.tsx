/**
 * ACTIVATION-2 on the REAL Check & Improve page (A, B, D, E). Only the edges are stubbed: auth,
 * the subscription gate, the AI calls (spies), the analytics sinks and the board-question
 * picker (its own file pins it against the real bank).
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
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  local: [] as unknown[],
  activeUid: null as string | null,
  detectQuestion: (() => undefined) as (...a: unknown[]) => unknown,
  checkSolutionImage: (() => undefined) as (...a: unknown[]) => unknown,
  checkSolution: (() => undefined) as (...a: unknown[]) => unknown,
  pick: (() => undefined) as (...a: unknown[]) => unknown,
  onboarding: vi.fn(),
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
    checkSolution: (...a: unknown[]) => H.checkSolution(...a),
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: () => {}, trackOnboardingEvent: (...a: unknown[]) => H.onboarding(...a) };
});
vi.mock("../../services/studentProgressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/studentProgressStore")>();
  return { ...actual, getActiveProgressUser: () => H.activeUid };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: () => H.local,
    getSessionRecordsFromCloud: () => Promise.resolve(H.local),
    cloudHasAnySessionRecord: async () => false,
  };
});
vi.mock("../../components/checkimprove/boardQuestionPick", () => ({
  pickBoardTryQuestion: (...a: unknown[]) => H.pick(...a),
}));
// The draft service, as an in-memory store with the real contract (save while signed out, take
// once after sign-in). Its real expiry clock is pinned in DesktopCheckImprovePage.activationDraft.
const D = vi.hoisted(() => ({ saved: null as null | { fields: unknown; images: unknown } }));
vi.mock("../../services/checkImproveDraft", () => ({
  saveCiDraft: (fields: unknown, images: unknown) => { D.saved = { fields, images }; },
  clearCiDraft: () => { D.saved = null; },
  takeCiDraft: async () => D.saved,
  sweepExpiredCiDraftImages: async () => {},
}));

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { FREE_CHECK_SIGNIN_PATH, hasUsedFreeCheck } from "../../services/freeCheckClient";

const STUDENT = { uid: "the-student", email: "new@example.com", displayName: null, providerIds: ["password"] };
const QUESTION = "Prove that root 2 is irrational.";
const BOARD = {
  id: "PYQ-S-2025-ELEC-004",
  subject: "Science",
  text: "A voltage source sends a current of 2 A to a resistor of 40 Ω connected across it for 5 minutes. Calculate the electrical energy supplied by the source. [2]",
  label: "CBSE board question (2025) · Electricity",
};

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return <div data-testid="login-probe">LOGIN</div>;
}
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="/login" element={<Probe />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}
const questionBox = () => screen.getByLabelText("Type the question") as HTMLTextAreaElement;
const howItWorks = () => screen.getByText("How it works").closest("details") as HTMLDetailsElement;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  D.saved = null;
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  setMatchMediaMatches(false); // phone width
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.local = [];
  H.activeUid = null;
  H.detectQuestion = vi.fn().mockResolvedValue({ ok: false });
  H.checkSolutionImage = vi.fn().mockResolvedValue({ ok: false });
  H.checkSolution = vi.fn().mockResolvedValue({ ok: false });
  H.pick = vi.fn().mockResolvedValue(BOARD);
  H.onboarding.mockReset();
  where = "";
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
});

describe("ACTIVATION-2 A · Start here on Check & Improve → 'Check one answer'", () => {
  it("★★ closes the takeover and puts the student in the question box", async () => {
    setMatchMediaMatches(true);
    H.auth = { user: STUDENT, loading: false };
    H.activeUid = STUDENT.uid;
    H.sub.isPremium = true;
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderPage();
    fireEvent.click(await screen.findByTestId("start-here-focus-check-one"));
    // iOS: focused INSIDE the tap (synchronously), not on a later tick
    expect(document.activeElement).toBe(questionBox());
    await waitFor(() => expect(screen.queryByTestId("start-here-focus")).toBeNull());
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    // the closing takeover did not pull focus back or restore it elsewhere
    expect(document.activeElement).toBe(questionBox());
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(document.activeElement).toBe(questionBox());
  });
});

describe("ACTIVATION-2 B · mobile header Sign up (signed out)", () => {
  it("★★ goes to the free check's sign-in path, and the typed draft comes back after sign-in", async () => {
    renderPage();
    fireEvent.change(questionBox(), { target: { value: QUESTION } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(where).toBe(FREE_CHECK_SIGNIN_PATH);
    // flushed on the way out (no waiting for the 800 ms autosave debounce)
    expect((D.saved?.fields as { question?: string } | undefined)?.question).toBe(QUESTION);

    cleanup();
    H.auth = { user: STUDENT, loading: false };
    H.activeUid = STUDENT.uid;
    H.sub.isPremium = true;
    renderPage();
    await waitFor(() => expect(questionBox().value).toBe(QUESTION));
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull(); // signed in: gone
  });

  it("CONTROL: not on desktop (the shell already has Log in)", () => {
    setMatchMediaMatches(true);
    renderPage();
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
  });
});

describe("ACTIVATION-2 D · Try a board question", () => {
  it("★★ fills the box with the real bank question + its source line; nothing is read, graded or spent", async () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Try a board question" }).style.minHeight).toBe("44px"); // phone tap target
    fireEvent.click(screen.getByRole("button", { name: "Try a board question" }));
    await waitFor(() => expect(questionBox().value).toBe(BOARD.text));
    expect(screen.getByTestId("ci-board-source").textContent).toBe(BOARD.label);
    expect(H.pick).toHaveBeenCalledTimes(1);
    expect(H.detectQuestion).not.toHaveBeenCalled();
    expect(H.checkSolution).not.toHaveBeenCalled();
    expect(H.checkSolutionImage).not.toHaveBeenCalled();
    expect(hasUsedFreeCheck()).toBe(false);
    // the box is no longer empty, so the offer steps aside
    expect(screen.queryByRole("button", { name: "Try a board question" })).toBeNull();
  });

  it("★ editing the filled question drops the source line (it is no longer the board's words)", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Try a board question" }));
    await waitFor(() => expect(questionBox().value).toBe(BOARD.text));
    fireEvent.change(questionBox(), { target: { value: `${BOARD.text} extra` } });
    expect(screen.queryByTestId("ci-board-source")).toBeNull();
  });

  it("★ alternates subjects on later taps", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Try a board question" }));
    await waitFor(() => expect(questionBox().value).toBe(BOARD.text));
    fireEvent.change(questionBox(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Try a board question" }));
    await waitFor(() => expect(H.pick).toHaveBeenCalledTimes(2));
    const s1 = (H.pick as ReturnType<typeof vi.fn>).mock.calls[0][0].subject;
    const s2 = (H.pick as ReturnType<typeof vi.fn>).mock.calls[1][0].subject;
    expect(new Set([s1, s2])).toEqual(new Set(["Maths", "Science"]));
  });

  it("CONTROL: a subject with nothing to offer says so honestly and fills nothing", async () => {
    H.pick = vi.fn().mockResolvedValue(null);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Try a board question" }));
    expect(await screen.findByText(/couldn.t load a board question/i)).toBeTruthy();
    expect(questionBox().value).toBe("");
  });
});

describe("ACTIVATION-2 E · How it works", () => {
  it("★★ starts collapsed on a phone", async () => {
    renderPage();
    await act(async () => {});
    expect(howItWorks().open).toBe(false);
  });

  it("CONTROL: desktop unchanged — open for a student with no checked papers", async () => {
    setMatchMediaMatches(true);
    renderPage();
    await act(async () => {});
    expect(howItWorks().open).toBe(true);
  });
});
