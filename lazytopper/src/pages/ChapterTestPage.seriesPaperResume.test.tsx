// TS-MORE-1 - a series paper 2..5 saves its in-progress sitting under its STABLE paper code, not the chapter's attempt counter: starting p2,
// then another sitting of the chapter being saved (the counter moves on), then reopening p2 still resumes p2. Paper 1 keeps today's key.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "../test/preloadBankChapters";

vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0, status: { tier: "premium", plan: "pass_till_boards" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {} }),
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
const prior = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [...prior.list] };
});

import ChapterTestPage from "./ChapterTestPage";

const BASE = "/chapter-test/10/maths/real-numbers";
function mount(search: string) {
  render(
    <MemoryRouter initialEntries={[`${BASE}${search}`]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const inTest = () => document.querySelector(".lt-ct__exit") !== null;
async function startAndAnswer() {
  const start = await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  fireEvent.click(start);
  await waitFor(() => expect(inTest()).toBe(true));
  fireEvent.click(document.querySelectorAll<HTMLButtonElement>(".lt-ct__opt")[1]);
  await act(async () => {});
}
const progressKeys = () => Object.keys(window.sessionStorage).filter((k) => k.startsWith("lazytopper.ct.progress."));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  prior.list = [];
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("TS-MORE-1 chapter paper progress key", () => {
  it("p2 in progress -> another sitting of the chapter is saved (the counter moves) -> p2 still resumes, and its progress is never deleted", async () => {
    mount("?series=1&paper=2");
    await startAndAnswer();
    expect(progressKeys()).toEqual(["lazytopper.ct.progress.ts.CT-M01-2"]);
    cleanup();
    // Paper 1 is submitted meanwhile: the chapter now has one record, so the attempt counter is 2, not 1.
    prior.list = [
      { id: "CT-M-RN-01", title: "Real Numbers - Chapter Test", surface: "chapter-test", subject: "Maths", status: "graded", marksAwarded: 5, marksTotal: 30, gradedAt: 1_700_000_000_000, topicKeys: ["real-numbers"], worksheetId: "ct-ts1-real-numbers--a", fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 } },
    ];
    mount("?series=1&paper=2");
    expect(await screen.findByTestId("ct-resume-note", {}, { timeout: 60000 })).toBeTruthy();
    expect(progressKeys()).toEqual(["lazytopper.ct.progress.ts.CT-M01-2"]);
    fireEvent.click(screen.getByRole("button", { name: /Resume your test/ }));
    await waitFor(() => expect(inTest()).toBe(true));
  }, 120_000);

  it("paper 1 keeps today's key (the attempt code), and opening paper 3 neither resumes nor deletes it", async () => {
    mount("?series=1");
    await startAndAnswer();
    const keys = progressKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain(".ts.");
    cleanup();
    mount("?series=1&paper=3");
    await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 });
    expect(screen.queryByTestId("ct-resume-note")).toBeNull();
    expect(progressKeys()).toEqual(keys);
  }, 120_000);
});
