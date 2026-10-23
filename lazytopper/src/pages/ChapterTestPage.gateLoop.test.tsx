// CT-RESUME-2 HOLD 1 — the REAL page behind the REAL daily gate: <MockViewGate><ChapterTestPage/>.
//
// The loop the review found: open (counted) → download (a pending record #N) → start (autosave #N)
// → reload: the gate sees an autosave for this route and lets the visit through UNCOUNTED, but
// the page mints test #N+1 (the pending record moved the number on), drops the #N save and shows a
// FRESH draw — which "Start" used to begin without ever being counted. Repeat = unlimited papers.
// Every new-paper action (Start, Download of this visit's draw) now claims the view: at 3 of 3
// the fresh draw is refused, right under the button, and the count stays 3.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "../test/preloadBankChapters";

const UID = "student-1";
const USER = { uid: UID, isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isPremium: false,
    isTrialActive: false,
    isTrialExpired: true,
    daysLeftInTrial: 0,
    status: { tier: "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": UID, Authorization: "Bearer tok" }) };
});
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list };
});

import ChapterTestPage from "./ChapterTestPage";
import { MockViewGate } from "../components/auth/MockViewGate";
import { __resetUsageClientForTests } from "../services/usageClient";

const SLUG = "carbon-and-its-compounds";
const ROUTE = `/chapter-test/10/science/${SLUG}`;

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}
const setViews = (count: number) =>
  localStorage.setItem(`lazytopper.dailyMockViews:${UID}`, JSON.stringify({ day: today(), count }));
const viewsToday = () => JSON.parse(localStorage.getItem(`lazytopper.dailyMockViews:${UID}`) || "{}").count ?? 0;

function mount() {
  render(
    <MemoryRouter initialEntries={[ROUTE]}>
      <Routes>
        <Route
          path="/chapter-test/:grade/:subject/:topicKey"
          element={<MockViewGate><ChapterTestPage /></MockViewGate>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
const inTest = () => document.querySelector(".lt-ct__exit") !== null;

/** The pending record a download of test #N writes (AWAIT-1-PAPERS) — it moves the next number on. */
function pendingRecord(n: number) {
  const code = `CT-S-CAIC-${String(n).padStart(2, "0")}`;
  return {
    id: code,
    worksheetId: `ct-${n}`,
    surface: "chapter-test",
    title: `Carbon · Test #${n}`,
    subject: "science",
    topicKeys: [SLUG],
    questionIds: [],
    marksAwarded: 0,
    marksTotal: 0,
    status: "pending-upload",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    gradedAt: 1_700_000_000_000,
    perQuestionRef: `ct:${code}`,
    dedupKey: `${UID}::${code}`,
  };
}

beforeEach(() => {
  __resetUsageClientForTests();
  localStorage.clear();
  sessionStorage.clear();
  records.list = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/api/usage/me")
        ? new Response(JSON.stringify({ enforced: false, tier: "trial", trial: {}, premium: null }), { status: 200 })
        : new Response("{}", { status: 404 }),
    ),
  );
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("CT-RESUME-2 HOLD 1 · open → download → start → reload is NOT a free new paper", () => {
  it("★★ at 3 of 3, the fresh draw behind a stale-autosave reload cannot be started or downloaded", async () => {
    setViews(2);
    // 1) Open the Carbon test: counted (3 of 3). Start it: an autosave for this route exists.
    mount();
    const start = await screen.findByRole("button", { name: /Start the test/ });
    expect(viewsToday()).toBe(3);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    fireEvent.click(start);
    await waitFor(() => expect(inTest()).toBe(true));
    // 2) The download of that test wrote its pending record, so the NEXT visit mints test #2.
    records.list = [pendingRecord(1)];
    cleanup();

    // 3) Reload: the gate lets it through (an autosave for this route), but the page shows a FRESH
    //    draw (#2) — no saved paper is offered.
    mount();
    const start2 = await screen.findByRole("button", { name: /Start the test/ });
    expect(screen.queryByTestId("ct-resume-note")).toBeNull();
    expect(viewsToday()).toBe(3);

    // 4) Starting it is a NEW paper: refused at 3 of 3, said right under the button.
    fireEvent.click(start2);
    const notice = await screen.findByTestId("ct-limit-notice");
    expect(notice.textContent).toContain("You've opened today's papers already — a new paper opens again tomorrow.");
    expect(inTest()).toBe(false);
    expect(viewsToday()).toBe(3);

    // 5) Downloading it is a new paper too: refused, nothing counted.
    fireEvent.click(screen.getByRole("button", { name: /Download this test/ }));
    await act(async () => {});
    expect(viewsToday()).toBe(3);
    expect(inTest()).toBe(false);
  });

  it("★ under the limit the same path is counted exactly once (no double count, no refusal)", async () => {
    setViews(1);
    mount();
    const start = await screen.findByRole("button", { name: /Start the test/ });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    fireEvent.click(start);
    await waitFor(() => expect(inTest()).toBe(true));
    expect(viewsToday()).toBe(2);
    records.list = [pendingRecord(1)];
    cleanup();
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }));
    await waitFor(() => expect(inTest()).toBe(true));
    expect(viewsToday()).toBe(3); // the new paper is counted once, when it starts
    expect(screen.queryByTestId("ct-limit-notice")).toBeNull();
  });
});
