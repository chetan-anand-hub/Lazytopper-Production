// TS-FREE-SIGNEDOUT (owner ruling 26 Nov 2026, 19:23 IST) - a signed-out visitor opens and sits a Test Series chapter test without
// signing in; "get my answers marked" asks for sign-in (return path to the same paper), and the attempt is back on the paper after
// sign-in, where the EXISTING signed-in flow (start rules, the partial record, the free test) runs unchanged.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession: boolean; email: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: auth.user ? "trial" : "free",
    isPremium: !!auth.user,
    isTrialActive: !!auth.user,
    isTrialExpired: false,
    daysLeftInTrial: auth.user ? 7 : 0,
    status: { tier: auth.user ? "trial" : "free", plan: "none" },
    hydrated: true,
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
const mine = vi.hoisted(() => ({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } as unknown }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: async () => {
      const freeTest = actual.readTestSeriesFreeTest(mine.freeTest);
      return { packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, ...(freeTest ? { freeTest } : {}) };
    },
  };
});
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
const prior = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async (uid?: string | null) => (uid ? [...prior.list, ...actual.loadLocalSessionRecords(uid)] : []) };
});
const spies = vi.hoisted(() => ({ partial: 0, paperCopy: 0 }));
vi.mock("../services/chapterTestGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/chapterTestGradeService")>();
  return {
    ...actual,
    writeChapterTestPartialRecord: (...a: Parameters<typeof actual.writeChapterTestPartialRecord>) => {
      spies.partial += 1;
      return actual.writeChapterTestPartialRecord(...a);
    },
  };
});
vi.mock("../services/chapterTestPaperStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/chapterTestPaperStore")>();
  return {
    ...actual,
    saveChapterTestPaper: (...a: Parameters<typeof actual.saveChapterTestPaper>) => {
      spies.paperCopy += 1;
      return actual.saveChapterTestPaper(...a);
    },
  };
});

import ChapterTestPage from "./ChapterTestPage";
import { loadLocalSessionRecords } from "../services/sessionRecords";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";
import { SIGNED_OUT_ATTEMPT_KEY } from "../lib/testSeries/signedOutAttempt";

const SERIES_URL = "/chapter-test/10/maths/real-numbers?series=1";
const SIGNED_IN = { uid: "student-new", isLocalSession: false, email: "n@x.com" };

function LoginProbe() {
  const loc = useLocation();
  return <p data-testid="login-page">{new URLSearchParams(loc.search).get("redirect")}</p>;
}
function tree(url: string) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );
}
function mount(url = SERIES_URL) {
  const r = render(tree(url));
  return { rerender: () => r.rerender(tree(url)) };
}
const fetchSpy = vi.fn(async (_u: unknown, _init?: RequestInit) => new Response(JSON.stringify({ enforced: false }), { status: 200 }));
const selected = () => (document.querySelector(".lt-ct__opt--sel")?.textContent ?? "").trim();

async function startAndPickFirst(): Promise<string> {
  fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
  await waitFor(() => expect(document.querySelector(".lt-ct__opt")).not.toBeNull(), { timeout: 30000 });
  const opt = document.querySelectorAll<HTMLButtonElement>(".lt-ct__opt")[0];
  fireEvent.click(opt);
  return selected();
}
async function submit() {
  fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
  fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  auth.user = null;
  prior.list = [];
  spies.partial = 0;
  spies.paperCopy = 0;
  mine.freeTest = { paperKey: null, checksPerPaper: 2, used: 0 };
  resetTestSeriesOwnershipForTests();
  resetOwnedPacksCache();
  fetchSpy.mockClear();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TS-FREE-SIGNEDOUT · Chapter Test series paper", () => {
  it("signed out: the paper opens (no redirect), submit marks and writes nothing, sign-in returns to the paper with the answers back; the signed-in flow then runs", async () => {
    mount();
    expect((await screen.findByTestId("ts-signed-out-note", {}, { timeout: 60000 })).textContent).toMatch(/not signed in/);
    const picked = await startAndPickFirst();
    expect(picked).not.toBe("");
    expect(screen.queryByTestId("login-page")).toBeNull();
    await submit();
    expect(await screen.findByTestId("ts-sign-in-to-mark")).toBeTruthy();
    // nothing marked, recorded, copied or sent signed out
    expect(spies.partial).toBe(0);
    expect(spies.paperCopy).toBe(0);
    expect(loadLocalSessionRecords(null)).toHaveLength(0);
    expect(fetchSpy.mock.calls.filter(([, init]) => (init?.method ?? "GET").toUpperCase() !== "GET")).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/Section A marked/);
    expect(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY)).not.toBeNull();
    fireEvent.click(screen.getByTestId("ts-sign-in-to-mark-go"));
    expect((await screen.findByTestId("login-page")).textContent).toBe(SERIES_URL);
    cleanup();

    // back from sign-in (a new trial account): the same paper, the answers back on it, nothing started for them
    auth.user = SIGNED_IN;
    resetTestSeriesOwnershipForTests();
    resetOwnedPacksCache();
    mount();
    expect(await screen.findByTestId("ts-signed-out-restored", {}, { timeout: 60000 })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__opt")).not.toBeNull(), { timeout: 30000 });
    expect(selected()).toBe(picked);
    expect(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY)).toBeNull();
    await submit();
    // the EXISTING signed-in submit: the partial record is written (Section A marked)
    await waitFor(() => {
      const rec = loadLocalSessionRecords(SIGNED_IN.uid).filter((r) => r.surface === "chapter-test");
      expect(rec).toHaveLength(1);
      expect(rec[0].status).toBe("partial");
    });
    expect(screen.queryByTestId("ts-sign-in-to-mark")).toBeNull();
  }, 120000);

  it("back from sign-in on an account that has used its free test: the existing wall, no paper", async () => {
    window.sessionStorage.setItem(
      SIGNED_OUT_ATTEMPT_KEY,
      JSON.stringify({ v: 1, surface: "chapter-test", path: SERIES_URL, ids: ["x"], answers: {}, flags: [], currentQNumber: 1, elapsedMs: 0, savedAt: Date.now() }),
    );
    auth.user = SIGNED_IN;
    prior.list = [{ id: "FM-M-01", worksheetId: "fm-old", surface: "full-mock", status: "partial", subject: "maths", topicKeys: [], questionIds: [], marksAwarded: 1, marksTotal: 20, gradedAt: Date.parse("2026-11-19T00:00:00Z") }];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
    expect(await screen.findByTestId("series-start-wall")).toBeTruthy();
    expect(document.querySelector(".lt-ct__exit")).toBeNull();
  }, 90000);

  it("review blocker: an account appearing MID-SITTING (sign-in in another tab) never submits the signed-out sitting - back to Start, answers kept, start rules run", async () => {
    const page = mount();
    const picked = await startAndPickFirst();
    auth.user = SIGNED_IN;
    prior.list = [{ id: "FM-M-01", worksheetId: "fm-old", surface: "full-mock", status: "partial", subject: "maths", topicKeys: [], questionIds: [], marksAwarded: 1, marksTotal: 20, gradedAt: Date.parse("2026-11-19T00:00:00Z") }];
    page.rerender();
    // the paper closes: back on the start screen, nothing written
    await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 });
    expect(document.querySelector(".lt-ct__exit")).toBeNull();
    expect(spies.partial).toBe(0);
    expect(loadLocalSessionRecords(SIGNED_IN.uid)).toHaveLength(0);
    expect(await screen.findByTestId("ts-signed-out-restored", {}, { timeout: 30000 })).toBeTruthy();
    expect(picked).not.toBe("");
    // this account has used its free test: Start shows the existing wall, never the paper
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    expect(await screen.findByTestId("series-start-wall")).toBeTruthy();
    expect(document.querySelector(".lt-ct__exit")).toBeNull();
    expect(spies.partial).toBe(0);
  }, 120000);

  it("review nit 1: a kept attempt whose time ran out comes back LOCKED at its submit step - the clock is not switched off, no answer edits, no auto-submit; submit marks it", async () => {
    mount();
    const picked = await startAndPickFirst();
    expect(picked).not.toBe("");
    await submit();
    fireEvent.click(await screen.findByTestId("ts-sign-in-to-mark-go"));
    await screen.findByTestId("login-page");
    cleanup();
    // the sign-in took longer than the paper's time limit (the clock was on)
    const kept = JSON.parse(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY) as string);
    expect(kept.timerEnabled).toBe(true);
    window.sessionStorage.setItem(SIGNED_OUT_ATTEMPT_KEY, JSON.stringify({ ...kept, elapsedMs: 10 * 60 * 60 * 1000 }));

    auth.user = SIGNED_IN;
    resetTestSeriesOwnershipForTests();
    resetOwnedPacksCache();
    mount();
    expect(await screen.findByTestId("ts-signed-out-restored", {}, { timeout: 60000 })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }));
    expect(await screen.findByTestId("ts-time-up-submit", {}, { timeout: 30000 })).toBeTruthy();
    // locked: no option, flag, navigator or "keep working" on screen - nothing can be changed past time
    expect(document.querySelector(".lt-ct__opt")).toBeNull();
    expect(document.querySelector(".lt-ct__exit")).toBeNull();
    expect(screen.queryByRole("button", { name: /Keep working/ })).toBeNull();
    // the autosave of the sitting keeps the clock ON (the old fix switched it off) and nothing is submitted behind the student's back
    await new Promise((r) => setTimeout(r, 2500));
    expect(spies.partial).toBe(0);
    expect(loadLocalSessionRecords(SIGNED_IN.uid)).toHaveLength(0);
    const progress = Object.keys(window.sessionStorage)
      .filter((k) => k.startsWith("lazytopper.ct.progress."))
      .map((k) => JSON.parse(window.sessionStorage.getItem(k) as string) as { timerEnabled?: boolean; answers?: Record<string, string> });
    expect(progress).toHaveLength(1);
    expect(progress[0].timerEnabled).toBe(true);
    expect(progress[0].answers).toEqual(kept.answers);
    // the student taps submit: the EXISTING signed-in submit runs, once
    fireEvent.click(screen.getByTestId("ts-time-up-submit-go"));
    await waitFor(() => {
      const rec = loadLocalSessionRecords(SIGNED_IN.uid).filter((r) => r.surface === "chapter-test");
      expect(rec).toHaveLength(1);
      expect(rec[0].status).toBe("partial");
    });
    expect(spies.partial).toBe(1);
    expect(screen.queryByTestId("ts-time-up-submit")).toBeNull();
  }, 120000);

  it("review nit 2: signing OUT mid-sitting (the autosave-restore effect re-runs) keeps the answers - none lost, none duplicated, no crash", async () => {
    auth.user = SIGNED_IN;
    const page = mount();
    const picked = await startAndPickFirst();
    expect(picked).not.toBe("");
    const before = Object.keys(window.sessionStorage).filter((k) => k.startsWith("lazytopper.ct.progress."));
    expect(before).toHaveLength(1);
    const answersBefore = (JSON.parse(window.sessionStorage.getItem(before[0]) as string) as { answers: Record<string, string> }).answers;
    expect(Object.keys(answersBefore)).toHaveLength(1);
    const questionsBefore = document.querySelectorAll(".lt-ct__seg").length;
    // sign out in another tab, mid-sitting
    auth.user = null;
    page.rerender();
    await new Promise((r) => setTimeout(r, 1500));
    // still on the same paper, the same question, the same single answer picked
    expect(document.querySelector(".lt-ct__opt")).not.toBeNull();
    expect(document.querySelectorAll(".lt-ct__seg").length).toBe(questionsBefore);
    expect(document.querySelectorAll(".lt-ct__opt--sel")).toHaveLength(1);
    expect(selected()).toBe(picked);
    // one autosave of the sitting, carrying exactly the answers it had (nothing dropped, nothing doubled)
    const after = Object.keys(window.sessionStorage).filter((k) => k.startsWith("lazytopper.ct.progress."));
    expect(after).toHaveLength(1);
    expect((JSON.parse(window.sessionStorage.getItem(after[0]) as string) as { answers: Record<string, string> }).answers).toEqual(answersBefore);
    // and it was not turned into a kept signed-out attempt (it was started signed in)
    expect(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY)).toBeNull();
    expect(screen.queryByTestId("ts-sign-in-to-mark")).toBeNull();
  }, 120000);

  it("owner decision: a NON-sample Test Series paper signed out keeps sign-in first (CT-M02, and a paper 2 of the sample chapter)", async () => {
    for (const url of ["/chapter-test/10/maths/polynomials?series=1", "/chapter-test/10/maths/real-numbers?series=1&paper=2"]) {
      mount(url);
      expect(screen.queryByTestId("ts-signed-out-note")).toBeNull();
      fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
      expect((await screen.findByTestId("login-page")).textContent).toBe(url);
      cleanup();
    }
  }, 120000);

  it("owner decision: the Science sample (CT-S01) opens signed out", async () => {
    mount("/chapter-test/10/science/chemical-reactions-and-equations?series=1");
    expect(await screen.findByTestId("ts-signed-out-note", {}, { timeout: 60000 })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull(), { timeout: 30000 });
    expect(screen.queryByTestId("login-page")).toBeNull();
  }, 90000);

  it("a non-series chapter test signed out still signs in first (scope: Test Series papers only)", async () => {
    mount("/chapter-test/10/maths/real-numbers");
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
    expect(await screen.findByTestId("login-page")).toBeTruthy();
  }, 90000);

  it("kill switch VITE_TS_FREE_SIGNEDOUT_DISABLED=1: today's sign-in-first redirect", async () => {
    vi.stubEnv("VITE_TS_FREE_SIGNEDOUT_DISABLED", "1");
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
    expect((await screen.findByTestId("login-page")).textContent).toBe(SERIES_URL);
    expect(screen.queryByTestId("ts-signed-out-note")).toBeNull();
  }, 90000);
});
