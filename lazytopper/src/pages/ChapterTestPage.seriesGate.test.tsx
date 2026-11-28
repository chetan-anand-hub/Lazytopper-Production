// TEST-SERIES-1 (owner rulings 18 Nov 2026, 19:31 / 19:38 / 19:44 IST) — the Chapter Test surface for free, trial and Board Pass
// accounts: Section A is marked for everyone; the written-answer upload and the paper download are for a Board Pass (or Test
// Series) holder, everyone else sees the upgrade card / link; free and trial accounts may take ONE test in total.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { packPriceLabel } from "../services/packs";
import { seriesTotals, seriesMockWorksheetId } from "../lib/testSeries/testSeries";

const sub = vi.hoisted(() => ({ tier: "free" as "free" | "trial" | "premium" }));
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
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
// MYPACKS-TS-1: ownership is a three-state read now; a student who owns nothing resolves to "not owned" (the upgrade card), a failed read is a retry.
// TS-FREE-CHECK-1: `mine.freeTest` is the server's free-test state (absent = the server switch is off / an older server: today's page).
const mine = vi.hoisted(() => ({ freeTest: undefined as unknown }));
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
  return {
    ...actual,
    getSessionRecordsFromCloud: async (uid?: string | null) => [...prior.list, ...actual.loadLocalSessionRecords(uid)],
  };
});

import ChapterTestPage from "./ChapterTestPage";
import { loadLocalSessionRecords } from "../services/sessionRecords";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";

function mount(url = "/chapter-test/10/maths/real-numbers") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  prior.list = [];
  mine.freeTest = undefined;
  // TS-FREE-CHECK-1: the ownership read is held per page life (module memory) - each test reads its own server state.
  resetTestSeriesOwnershipForTests();
  resetOwnedPacksCache();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(["free", "trial", "premium"] as const)("Chapter Test · %s account", (tier) => {
  const entitled = tier === "premium";
  it(`Section A is marked; ${entitled ? "the upload panel and the Download button" : "the upgrade card and the download link"}`, async () => {
    sub.tier = tier;
    mount();
    await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 });
    if (entitled) {
      expect(screen.getByRole("button", { name: /Download this test/ })).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/Download & print with|first download is free/);
      expect(screen.queryByTestId("download-with-plan")).toBeNull();
    } else {
      expect(screen.queryByRole("button", { name: /Download this test/ })).toBeNull();
      expect(screen.getByTestId("download-with-plan").textContent).toContain("Download & print with the Test Series or Board Pass");
    }
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    // Section A is marked for everyone: the submit writes the objective-only record.
    await waitFor(() => {
      const rec = loadLocalSessionRecords("student-1").filter((r) => r.surface === "chapter-test");
      expect(rec).toHaveLength(1);
      expect(rec[0].status).toBe("partial");
      expect(rec[0].marksTotal).toBeGreaterThan(0);
    });
    if (!entitled) {
      // TS-UX-SCORE-1: the auto-opened partial scorecard offers no upload it cannot use - Section A's real marks and the two offers.
      expect(await screen.findByTestId("scorecard-wc-bp")).toBeTruthy();
      expect(screen.getByTestId("scorecard-wc-ts")).toBeTruthy();
      expect(document.body.textContent).toMatch(/Section A marked: \d+\/\d+\. Your written answers \(Sections B–D\) are checked with the Test Series or the Board Pass\./);
      expect(screen.queryByRole("button", { name: /Upload written answers for full result/ })).toBeNull();
    } else {
      fireEvent.click(await screen.findByRole("button", { name: /Upload written answers for full result/ }));
    }
    if (entitled) {
      expect((await screen.findAllByText(/Upload your written answers/)).length).toBeGreaterThan(0);
      expect(screen.queryByTestId("written-check-upgrade")).toBeNull();
    } else {
      const card = await screen.findByTestId("written-check-upgrade");
      expect(within(card).getByTestId("written-check-objective").textContent).toMatch(/Section A marked: \d+\/\d+/);
      expect(within(card).getByTestId("written-check-ts").getAttribute("href")).toBe("/packs?buy=test_series");
      expect(within(card).getByTestId("written-check-bp").getAttribute("href")).toBe("/board-pass");
      expect(screen.queryByText(/Upload your written answers/)).toBeNull();
    }
  }, 90000);

  it(`with one test already taken: ${entitled ? "starts another" : "the upgrade wall, no new paper"}`, async () => {
    sub.tier = tier;
    prior.list = [{ id: "FM-M-01", worksheetId: seriesMockWorksheetId("fm-old", "Maths", 1), surface: "full-mock", status: "partial", subject: "maths", topicKeys: [], questionIds: [], marksAwarded: 1, marksTotal: 20, gradedAt: Date.parse("2026-11-19T00:00:00Z") }];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
    if (entitled) {
      await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    } else {
      const wall = await screen.findByTestId("series-start-wall");
      expect(wall.textContent).toContain(`Upgrade to the Test Series (${packPriceLabel("test_series")}) or the Board Pass to take all ${seriesTotals().total} tests`);
      expect(document.querySelector(".lt-ct__exit")).toBeNull();
    }
  }, 90000);
});

/* ── TS-FREE-CHECK-1 (owner ruling 23 Nov 2026) · the free Test Series test includes written-answer marking ─────────────────── */
// The server pins the free paper at the first written check and refuses every other paper (server/services/testSeriesChecks.test.cjs);
// here: what the page shows a free / trial account on a Test Series paper (`?series=1`).
const SERIES_URL = "/chapter-test/10/maths/real-numbers?series=1";

async function submitFirstTest() {
  fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
  await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
  fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
  fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
}

describe.each(["free", "trial"] as const)("TS-FREE-CHECK-1 · Chapter Test series paper · %s account", (tier) => {
  // an earlier test's sitting (same student) must not be resumed here: each case starts from no sitting at all
  beforeEach(() => window.sessionStorage.clear());
  it("the free test: the written-marking note before Start, then the upload (not the upgrade card) with the free test's 2 checks", async () => {
    sub.tier = tier;
    mine.freeTest = { paperKey: null, checksPerPaper: 2, used: 0 };
    mount(SERIES_URL);
    const note = await screen.findByTestId("series-free-test-note", {}, { timeout: 60000 });
    expect(note.textContent).toBe("This is your 1 free test — written answers marked step by step, like a CBSE examiner.");
    await submitFirstTest();
    const close = await screen.findAllByRole("button", { name: /Upload written answers for full result/ }, { timeout: 30000 });
    fireEvent.click(close[0]);
    expect((await screen.findAllByText(/Upload your written answers/)).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("written-check-upgrade")).toBeNull();
    expect((await screen.findByTestId("series-checks-left")).textContent).toBe("Your free test · Checks left on this paper: 2 of 2");
  }, 90000);

  it("the server already pinned ANOTHER paper as the free test -> the MCQ-only note and the upgrade card (today's behaviour)", async () => {
    sub.tier = tier;
    mine.freeTest = { paperKey: "TS-FM-M1", checksPerPaper: 2, used: 1 };
    mount(SERIES_URL);
    const note = await screen.findByTestId("series-free-test-note", {}, { timeout: 60000 });
    expect(note.textContent).toBe("This is your 1 free test. Its MCQs (Section A) are marked free.");
    await submitFirstTest();
    expect(await screen.findByTestId("written-check-upgrade", {}, { timeout: 30000 })).toBeTruthy();
    expect(screen.queryByText(/Upload your written answers/)).toBeNull();
  }, 90000);
});
