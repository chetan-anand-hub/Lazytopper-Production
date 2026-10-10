// FAIR-USE-WARN-1 — one MOUNT test per surface: the REAL page, the REAL usage client,
// only the network stubbed. Enforced Premium at 80% of the 5-hour window → the banner
// renders with its text; the dark twin (enforced:false) renders no banner.
// (Practice and Check & Improve carry their mount test in their own *.fairUse.test.tsx.)

import { describe, it, expect, afterAll, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";

// The clock is pinned for the WHOLE file, imports included: these pages read the date
// while they load (e.g. the exam-cycle year), so pinning only inside a test is too late.
// 2026-09-28 10:00 IST = 04:30Z; the 5-hour window resets at 1:00 pm IST.
const { NOW } = vi.hoisted(() => {
  const now = Date.parse("2026-09-28T04:30:00Z");
  vi.useFakeTimers({ now, toFake: ["Date"] });
  return { NOW: now };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../../ai/paidCallHeaders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../ai/paidCallHeaders")>()),
  paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }),
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
}));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));
// The Tutor's conversation engine — the page around it is real.
vi.mock("../../pages/tutor/useTutorSession", () => ({
  useTutorSession: () => ({
    opener: { text: "Hi", forks: [] },
    messages: [],
    status: "idle",
    error: null,
    started: false,
    canRoundTrip: true,
    pending: null,
    returnFollow: null,
    send: () => {},
    retry: () => {},
    openCheckImproveOverlay: () => {},
    checkImproveOverlayOpen: false,
    closeCheckImprove: () => {},
    openQuickPracticeOverlay: () => {},
    quickPracticeOverlayOpen: false,
    closeQuickPractice: () => {},
    quickPracticeHref: "",
    recheckPending: () => {},
    dismissPending: () => {},
  }),
}));

import ChapterTestPage from "../../pages/ChapterTestPage";
import FullMockPage from "../../pages/FullMockPage";
import TutorPage from "../../pages/tutor/TutorPage";
import WorksheetGenerator from "../worksheet/WorksheetGenerator";
import WorksheetGradePanel from "../worksheet/WorksheetGradePanel";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import { __resetUsageClientForTests } from "../../services/usageClient";
import { __resetBankChaptersForTest } from "../../data/bankChapters/loader";

const body = (enforced: boolean) => ({
  enforced,
  tier: "premium",
  premium: {
    fiveHourPct: 80,
    dayPct: 40,
    weekPct: 20,
    resets: { fiveHour: "2026-09-28T07:30:00.000Z", day: "2026-09-28T18:30:00.000Z", week: "2026-10-01T08:30:00.000Z" },
  },
});
const BANNER = "You've used 75% of your 5-hour AI use allowance. It resets at 1:00 pm.";

let usageFetch: ReturnType<typeof vi.fn>;
function stubUsage(enforced: boolean) {
  usageFetch = vi.fn(async (url: string) =>
    String(url).includes("/api/usage/me")
      ? new Response(JSON.stringify(body(enforced)), { status: 200 })
      : new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", usageFetch);
}

beforeEach(() => {
  vi.setSystemTime(NOW);
  __resetUsageClientForTests();
  __resetBankChaptersForTest();
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(() => vi.useRealTimers());

const WS = {
  worksheetId: "ws-1",
  createdAt: "2026-09-27T00:00:00.000Z",
  title: "AP worksheet",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 3,
  questions: [
    {
      qNumber: 1, id: "q1", subject: "Maths", topicKey: "arithmetic-progressions", topicLabel: "Arithmetic Progressions",
      section: "C", marks: 3, questionText: "Find the 10th term of the AP 3, 7, 11, …",
    },
  ],
} as PersistedWorksheet;

const SURFACES: Array<[string, () => ReactElement]> = [
  [
    "Chapter Test",
    () => (
      <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  [
    "Full Mock",
    () => (
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  [
    "Worksheet generator",
    () => (
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>
    ),
  ],
  [
    "Worksheet grade panel",
    () => (
      <MemoryRouter>
        <WorksheetGradePanel ws={WS} />
      </MemoryRouter>
    ),
  ],
  [
    "Tutor (self-read; one component at desktop and 390 px)",
    () => (
      <MemoryRouter initialEntries={["/tutor/10/science/electricity"]}>
        <Routes>
          <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
];

describe("FAIR-USE-WARN-1 · the banner is mounted on every surface", () => {
  it.each(SURFACES)("★★ %s: enforced Premium at 80% → the banner and its text", async (_name, page) => {
    stubUsage(true);
    render(page());
    const banner = await screen.findByTestId("usage-warning", {}, { timeout: 30000 });
    expect(banner.textContent).toContain(BANNER);
    expect(screen.getByTestId("usage-warning-link").getAttribute("href")).toBe("/me");
  }, 60000);

  it.each(SURFACES)("★ %s DARK: enforced:false → no banner", async (_name, page) => {
    stubUsage(false);
    render(page());
    await waitFor(() => expect(usageFetch).toHaveBeenCalled(), { timeout: 30000 });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(screen.queryByTestId("usage-warning")).toBeNull();
  }, 60000);
});
