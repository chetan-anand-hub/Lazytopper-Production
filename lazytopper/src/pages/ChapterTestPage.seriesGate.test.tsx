// TEST-SERIES-1 (owner rulings 18 Nov 2026, 19:31 / 19:38 / 19:44 IST) — the Chapter Test surface for free, trial and Board Pass
// accounts: Section A is marked for everyone; the written-answer upload and the paper download are for a Board Pass (or Test
// Series) holder, everyone else sees the upgrade card / link; free and trial accounts may take ONE test in total.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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
vi.mock("../services/packs", async (orig) => ({ ...(await orig<typeof import("../services/packs")>()), fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) }));
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

function mount() {
  render(
    <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
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
    fireEvent.click(await screen.findByRole("button", { name: /Upload written answers for full result/ }));
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
    prior.list = [{ id: "FM-M-01", worksheetId: "fm-old", surface: "full-mock", status: "partial", subject: "maths", topicKeys: [], questionIds: [], marksAwarded: 1, marksTotal: 20, gradedAt: Date.parse("2026-11-19T00:00:00Z") }];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
    if (entitled) {
      await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    } else {
      const wall = await screen.findByTestId("series-start-wall");
      expect(wall.textContent).toContain("Upgrade to the Test Series (₹999 + GST) or the Board Pass to take all 180 tests");
      expect(document.querySelector(".lt-ct__exit")).toBeNull();
    }
  }, 90000);
});
