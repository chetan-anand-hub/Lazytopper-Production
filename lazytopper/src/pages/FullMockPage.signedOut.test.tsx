// TS-FREE-SIGNEDOUT (owner ruling 26 Nov 2026, 19:23 IST) - a signed-out visitor opens and sits a Test Series Full-Length Test
// without signing in; submit asks for sign-in (return path to the same paper) and marks / writes nothing; after sign-in the same paper
// opens with the answers back on it and the EXISTING signed-in flow runs. Kill switch restores the sign-in-first redirect.
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
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, freeTest: actual.readTestSeriesFreeTest({ paperKey: null, checksPerPaper: 2, used: 0 }) }),
  };
});
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: async (uid?: string | null) => (uid ? actual.loadLocalSessionRecords(uid) : []),
    getSessionPerQuestion: async () => null,
  };
});
const spies = vi.hoisted(() => ({ partial: 0 }));
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return {
    ...actual,
    writeFullMockPartialRecord: (...a: Parameters<typeof actual.writeFullMockPartialRecord>) => {
      spies.partial += 1;
      return actual.writeFullMockPartialRecord(...a);
    },
  };
});

import FullMockPage from "./FullMockPage";
import { loadLocalSessionRecords } from "../services/sessionRecords";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";
import { SIGNED_OUT_ATTEMPT_KEY } from "../lib/testSeries/signedOutAttempt";

const URL_ = "/full-mock/10/maths?paper=1";
const SIGNED_IN = { uid: "student-new", isLocalSession: false, email: "n@x.com" };

function LoginProbe() {
  const loc = useLocation();
  return <p data-testid="login-page">{new URLSearchParams(loc.search).get("redirect")}</p>;
}
function tree(url: string) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );
}
function mount(url = URL_) {
  const r = render(tree(url));
  return { rerender: () => r.rerender(tree(url)) };
}
const fetchSpy = vi.fn(async (_u: unknown, _init?: RequestInit) => new Response(JSON.stringify({ enforced: false }), { status: 200 }));
const selected = () => (document.querySelector(".lt-ct__opt--sel")?.textContent ?? "").trim();
const localFmSessions = () => Object.keys(window.localStorage).filter((k) => k.startsWith("lazytopper.fm.session.v1.local."));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  auth.user = null;
  spies.partial = 0;
  resetTestSeriesOwnershipForTests();
  resetOwnedPacksCache();
  fetchSpy.mockClear();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TS-FREE-SIGNEDOUT · Full Mock series paper", () => {
  it("signed out: opens, submit marks nothing and asks for sign-in; after sign-in the answers are back and the signed-in submit runs", async () => {
    mount();
    expect(await screen.findByTestId("ts-signed-out-note", {}, { timeout: 60000 })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 }));
    await waitFor(() => expect(document.querySelector(".lt-ct__opt")).not.toBeNull(), { timeout: 30000 });
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>(".lt-ct__opt")[0]);
    const picked = selected();
    expect(picked).not.toBe("");
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    expect(await screen.findByTestId("ts-sign-in-to-mark")).toBeTruthy();
    expect(spies.partial).toBe(0);
    expect(loadLocalSessionRecords(null)).toHaveLength(0);
    expect(fetchSpy.mock.calls.filter(([, init]) => (init?.method ?? "GET").toUpperCase() !== "GET")).toHaveLength(0);
    // back to the paper and submit again: still the sign-in card
    fireEvent.click(screen.getByTestId("ts-sign-in-to-mark-back"));
    expect(selected()).toBe(picked);
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    fireEvent.click(await screen.findByTestId("ts-sign-in-to-mark-go"));
    expect((await screen.findByTestId("login-page")).textContent).toBe(URL_);
    expect(localFmSessions()).toHaveLength(0); // a signed-out sitting never writes the device autosave
    expect(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY)).not.toBeNull();
    cleanup();

    auth.user = SIGNED_IN;
    resetTestSeriesOwnershipForTests();
    resetOwnedPacksCache();
    mount();
    expect(await screen.findByTestId("ts-signed-out-restored", {}, { timeout: 60000 })).toBeTruthy();
    const start = await screen.findByRole("button", { name: /Start the mock/ });
    await waitFor(() => expect(screen.queryByText(/Checking your access/)).toBeNull());
    fireEvent.click(start);
    await waitFor(() => expect(document.querySelector(".lt-ct__opt")).not.toBeNull(), { timeout: 30000 });
    expect(selected()).toBe(picked);
    expect(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY)).toBeNull();
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    await waitFor(() => {
      const rec = loadLocalSessionRecords(SIGNED_IN.uid).filter((r) => r.surface === "full-mock");
      expect(rec).toHaveLength(1);
      expect(rec[0].status).toBe("partial");
    });
    expect(spies.partial).toBe(1);
  }, 150000);

  it("review blocker: an account appearing MID-SITTING never submits it - back to Start with the answers kept; nothing written", async () => {
    const page = mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 }));
    await waitFor(() => expect(document.querySelector(".lt-ct__opt")).not.toBeNull(), { timeout: 30000 });
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>(".lt-ct__opt")[0]);
    const picked = selected();
    expect(localFmSessions()).toHaveLength(0);
    auth.user = SIGNED_IN;
    page.rerender();
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    expect(document.querySelector(".lt-ct__exit")).toBeNull();
    expect(spies.partial).toBe(0);
    expect(await screen.findByTestId("ts-signed-out-restored", {}, { timeout: 30000 })).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/Checking your access/)).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Start the mock/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__opt")).not.toBeNull(), { timeout: 30000 });
    expect(selected()).toBe(picked);
    expect(spies.partial).toBe(0);
  }, 150000);

  it("owner decision: a non-sample paper (Full-Length Test 2) and a focus set signed out keep sign-in first", async () => {
    for (const url of ["/full-mock/10/maths?paper=2", "/full-mock/10/maths?focus=FS-M-LA-1"]) {
      mount(url);
      fireEvent.click(await screen.findByRole("button", { name: /Start/ }, { timeout: 60000 }));
      expect((await screen.findByTestId("login-page")).textContent).toBe(url);
      cleanup();
    }
  }, 150000);

  it("kill switch VITE_TS_FREE_SIGNEDOUT_DISABLED=1: today's sign-in-first redirect", async () => {
    vi.stubEnv("VITE_TS_FREE_SIGNEDOUT_DISABLED", "1");
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 }));
    expect((await screen.findByTestId("login-page")).textContent).toBe(URL_);
  }, 90000);
});
