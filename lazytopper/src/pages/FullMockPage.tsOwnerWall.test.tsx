// FAIRUSE-TS-OWNER-1 (live finding 24 Nov 2026 ~23:10 IST; owner 23:11 "fix it thoroughly for both Board Pass owners and Test
// Series owners") - on the REAL Full Mock page:
//   * a trial Test Series owner on a series Full-Length Test / focus set is never shown the weekly fair-use wall, and the paper starts;
//   * a trial NON-owner still sees it; while ownership is being read the page waits (no wall then a flip); a failed read is a retry;
//   * a Board Pass holder is never walled - even while the usage view still says trial (just paid, a cached verdict);
//   * the kill switch VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED=1 restores the wall; an owner's wall names no full Board Pass price.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildFullMockSessionRecord, type SessionRecord } from "../services/sessionRecords";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const sub = vi.hoisted(() => ({ tier: "trial" as "free" | "trial" | "premium" }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: sub.tier,
    isPremium: sub.tier !== "free",
    isTrialActive: sub.tier === "trial",
    isTrialExpired: false,
    daysLeftInTrial: sub.tier === "trial" ? 5 : 0,
    status: { tier: sub.tier, plan: sub.tier === "premium" ? "pass_till_boards" : "none" },
    hydrated: true,
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
/** /api/packs/mine: "owner" | "none" | "pending" (never answers) | "fail" (throws). */
const mine = vi.hoisted(() => ({ mode: "owner" as "owner" | "none" | "pending" | "fail" }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: async () => {
      if (mine.mode === "pending") return new Promise(() => {});
      if (mine.mode === "fail") throw new Error("packs down");
      return {
        packs: [], licensee: { name: "", email: "" }, boardPassCredit: null,
        ...(mine.mode === "owner" ? { ownsTestSeries: true, testSeries: { validUntilMs: Date.now() + 1e10, checksPerPaper: 2, used: {} } } : {}),
      };
    },
  };
});
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined, metadata: { fromCache: false } })),
  deleteDoc: vi.fn(async () => {}),
}));
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list, getSessionPerQuestion: async () => null };
});

import FullMockPage from "./FullMockPage";
import { awaitingPaperResponse } from "../components/papers/paperDownloadRecord";
import { __resetUsageClientForTests } from "../services/usageClient";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";
import { TS_OWNER_BOARD_PASS_LINE } from "../components/usage/FairUseLimitPanel";

const RESET = new Date(Date.now() + 5 * 86400000).toISOString();
/** The usage view of a trial account whose week's mock is spent (what freelance.iitian's page read). */
const SPENT_TRIAL = {
  enforced: true, tier: "trial",
  trial: { checksLeftToday: 5, chapterTestsLeftToday: 1, mocksLeft: 0, worksheetsLeft: 1, resets: { checks: RESET, chapterTests: RESET, mocks: RESET, worksheets: RESET } },
  premium: null,
};

const oldPaper: PersistedWorksheet = {
  worksheetId: "ct-ts1-real-numbers--ct-old", createdAt: "2026-11-19", title: "x", subject: "Maths", grade: "10", sectionFilter: "All",
  totalMarks: 1, code: "CT-M-RN-01", name: "x",
  questions: [{ qNumber: 1, id: "q", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "q", options: ["1", "2"], answer: "2" }],
};
/** One test already taken (the owner's earlier Chapter Test): a non-owner would get the one-free-test wall, an owner starts. */
function takenRecord(): SessionRecord {
  return { ...buildFullMockSessionRecord({ paper: oldPaper, code: "CT-M-RN-01", subject: "maths", uid: "student-1", response: awaitingPaperResponse(oldPaper) }), surface: "chapter-test" } as SessionRecord;
}

function mount(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function tapStart(settleMs = 300) {
  const start = await screen.findByRole("button", { name: /Start the mock|Start the test|Start/ }, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, settleMs)); // the usage snapshot lands first (the gate reads what is already here)
  fireEvent.click(start);
  return start;
}
const began = () => screen.queryByRole("button", { name: /Start the mock|Start the test/ }) === null;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetUsageClientForTests();
  resetTestSeriesOwnershipForTests();
  resetOwnedPacksCache();
  records.list = [];
  sub.tier = "trial";
  mine.mode = "owner";
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    String(url).includes("/api/usage/me") ? new Response(JSON.stringify(SPENT_TRIAL), { status: 200 }) : new Response("{}", { status: 404 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("FAIRUSE-TS-OWNER-1 · Full Mock page · Test Series owner", () => {
  it("★★ trial owner, week's mock spent, one test already taken: Full-Length Test 2 starts - no weekly wall", async () => {
    records.list = [takenRecord()];
    mount("/full-mock/10/maths?paper=2");
    await waitFor(() => expect(screen.queryByText(/Checking your access/)).toBeNull());
    await tapStart();
    await waitFor(() => expect(began()).toBe(true));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
    expect(screen.queryByTestId("series-start-wall")).toBeNull();
  }, 90000);

  it("★★ trial owner on a FOCUS SET: starts, no weekly wall", async () => {
    records.list = [takenRecord()];
    mount("/full-mock/10/maths?focus=FS-M-LA-1");
    await tapStart();
    await waitFor(() => expect(began()).toBe(true));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  }, 90000);

  it("★ CONTROL: a trial NON-owner (no test taken yet) on the same paper still sees the weekly wall; the paper does not begin", async () => {
    mine.mode = "none";
    mount("/full-mock/10/maths?paper=2");
    await tapStart();
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(panel.textContent).toContain("this week's full mock");
    expect(began()).toBe(false);
  }, 90000);

  it("★ while ownership is still being read: 'Checking your access…', never the wall", async () => {
    mine.mode = "pending";
    mount("/full-mock/10/maths?paper=2");
    await tapStart(50);
    expect((await screen.findAllByText(/Checking your access/)).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
    expect(began()).toBe(false);
  }, 90000);

  it("★ ownership read failed: 'Couldn't confirm your purchase' + retry, never the wall", async () => {
    mine.mode = "fail";
    mount("/full-mock/10/maths?paper=2");
    await screen.findByRole("button", { name: /Start the mock|Start the test|Start/ }, { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500)); // the read and its one quiet retry (700 ms) both fail
    await tapStart();
    await waitFor(() => expect(screen.queryAllByText(/Couldn't confirm your purchase/).length).toBeGreaterThan(0), { timeout: 5000 });
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
    expect(began()).toBe(false);
  }, 90000);

  it("★ an owner on a FRESH (non-series) mock keeps the weekly wall - and its Board Pass line names no full price", async () => {
    mount("/full-mock/10/maths");
    await tapStart();
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(screen.getByTestId("fair-use-board-pass").textContent).toBe(TS_OWNER_BOARD_PASS_LINE);
    expect(panel.textContent).not.toMatch(/₹/);
  }, 90000);

  it("★ kill switch VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED=1: the owner sees the wall exactly as before (full Board Pass line)", async () => {
    vi.stubEnv("VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED", "1");
    mount("/full-mock/10/maths?paper=2");
    await waitFor(() => expect(screen.queryByText(/Checking your access/)).toBeNull());
    await tapStart();
    await screen.findByTestId("fair-use-limit-panel");
    expect(screen.getByTestId("fair-use-board-pass").textContent).not.toBe(TS_OWNER_BOARD_PASS_LINE);
    expect(began()).toBe(false);
  }, 90000);
});

describe("FAIRUSE-TS-OWNER-1 · Full Mock page · Board Pass holder", () => {
  for (const url of ["/full-mock/10/maths", "/full-mock/10/maths?paper=2", "/full-mock/10/maths?focus=FS-M-LA-1"]) {
    it(`★★ paid Premium with a STALE trial usage view (just paid, cached verdict): ${url} starts, no wall`, async () => {
      sub.tier = "premium";
      mine.mode = "none";
      records.list = [takenRecord()];
      mount(url);
      await tapStart();
      await waitFor(() => expect(began()).toBe(true));
      expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
    }, 90000);
  }
});
