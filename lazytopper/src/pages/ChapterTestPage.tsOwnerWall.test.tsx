// FAIRUSE-TS-OWNER-1 (live finding 24 Nov 2026 ~23:10 IST; owner 23:11 "fix it thoroughly for both Board Pass owners and Test
// Series owners") - the same rules on the REAL Chapter Test page (a trial account's chapter test is 1 per IST day):
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

import ChapterTestPage from "./ChapterTestPage";
import { awaitingPaperResponse } from "../components/papers/paperDownloadRecord";
import { __resetUsageClientForTests } from "../services/usageClient";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";
import { TS_OWNER_BOARD_PASS_LINE } from "../components/usage/FairUseLimitPanel";

const RESET = new Date(Date.now() + 6 * 3600000).toISOString();
/** The usage view of a trial account whose chapter test for today is spent. */
const SPENT_TRIAL = {
  enforced: true, tier: "trial",
  trial: { checksLeftToday: 5, chapterTestsLeftToday: 0, mocksLeft: 1, worksheetsLeft: 1, resets: { checks: RESET, chapterTests: RESET, mocks: RESET, worksheets: RESET } },
  premium: null,
};
const oldPaper: PersistedWorksheet = {
  worksheetId: "fm-ts1-m1--fm-old", createdAt: "2026-11-19", title: "x", subject: "Maths", grade: "10", sectionFilter: "All",
  totalMarks: 1, code: "FM-M-01", name: "x",
  questions: [{ qNumber: 1, id: "q", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "q", options: ["1", "2"], answer: "2" }],
};
/** One test already taken: a non-owner would get the one-free-test wall, an owner starts. */
function takenRecord(): SessionRecord {
  return buildFullMockSessionRecord({ paper: oldPaper, code: "FM-M-01", subject: "maths", uid: "student-1", response: awaitingPaperResponse(oldPaper) });
}
const SERIES_URL = "/chapter-test/10/maths/real-numbers?series=1";
const FRESH_URL = "/chapter-test/10/maths/real-numbers";

function mount(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function tapStart(settleMs = 50) {
  const start = await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, settleMs));
  fireEvent.click(start);
}
/** The taking phase's own control - present only once the paper has begun. */
const began = () => document.querySelector(".lt-ct__exit") !== null;

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

describe("FAIRUSE-TS-OWNER-1 · Chapter Test page · Test Series owner", () => {
  it("★★ trial owner, today's chapter test spent, one test already taken: the series paper starts - no wall", async () => {
    records.list = [takenRecord()];
    mount(SERIES_URL);
    await tapStart(300);
    await waitFor(() => expect(began()).toBe(true));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  }, 90000);

  it("★ CONTROL: a trial NON-owner (no test taken yet) still sees the daily wall; the paper does not begin", async () => {
    mine.mode = "none";
    mount(SERIES_URL);
    await tapStart(300);
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(panel.textContent).toContain("today's chapter test");
    expect(began()).toBe(false);
  }, 90000);

  it("★ while ownership is still being read: 'Checking your access…', never the wall", async () => {
    mine.mode = "pending";
    mount(SERIES_URL);
    await tapStart();
    expect((await screen.findAllByText(/Checking your access/)).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
    expect(began()).toBe(false);
  }, 90000);

  it("★ an owner on a FRESH (non-series) chapter test keeps the daily wall - with no full Board Pass price", async () => {
    mount(FRESH_URL);
    await tapStart(300);
    await screen.findByTestId("fair-use-limit-panel");
    expect(screen.getByTestId("fair-use-board-pass").textContent).toBe(TS_OWNER_BOARD_PASS_LINE);
  }, 90000);

  it("★ kill switch VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED=1: the owner sees the wall exactly as before", async () => {
    vi.stubEnv("VITE_FAIRUSE_TS_OWNER_EXEMPT_DISABLED", "1");
    mount(SERIES_URL);
    await tapStart(300);
    await screen.findByTestId("fair-use-limit-panel");
    expect(began()).toBe(false);
  }, 90000);
});

describe("FAIRUSE-TS-OWNER-1 · Chapter Test page · Board Pass holder", () => {
  for (const url of [FRESH_URL, SERIES_URL]) {
    it(`★★ paid Premium with a STALE trial usage view (just paid): ${url} starts, no wall`, async () => {
      sub.tier = "premium";
      mine.mode = "none";
      records.list = [takenRecord()];
      mount(url);
      await tapStart(300);
      await waitFor(() => expect(began()).toBe(true));
      expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
    }, 90000);
  }
});
