// TEST-SERIES-1 (owner rulings 18 Nov 2026, 19:31 / 19:38 / 19:44 IST) — the Full Mock surface for free, trial and Board Pass
// accounts: Section A is marked for everyone (the AWAIT-1 picker path); the written-answer upload and the paper download are for a
// Board Pass (or Test Series) holder, everyone else sees the upgrade card / link; free and trial accounts take ONE test in total.
// Fixtures from FullMockPage.await1.test.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { packPriceLabel } from "../services/packs";
import { seriesTotals } from "../lib/testSeries/testSeries";
import { buildFullMockSessionRecord, type SessionRecord } from "../services/sessionRecords";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import type { ObjectiveScore } from "../services/chapterTestGradeService";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
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
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
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
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
const fs = vi.hoisted(() => ({
  writes: [] as Array<{ path: string; body: Record<string, unknown> }>,
  docs: {} as Record<string, unknown>,
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async (ref: { path: string }, body: Record<string, unknown>) => {
    fs.writes.push({ path: ref.path, body });
  }),
  getDoc: vi.fn(async (ref: { path: string }) => ({
    exists: () => fs.docs[ref.path] != null,
    data: () => fs.docs[ref.path],
    metadata: { fromCache: false },
  })),
  deleteDoc: vi.fn(async () => {}),
}));
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list, getSessionPerQuestion: async () => null };
});
const pdf = vi.hoisted(() => ({ calls: [] as Array<{ paper: PersistedWorksheet; kind: string; code?: string }> }));
vi.mock("../components/worksheet/worksheetPdfExport", () => ({
  exportWorksheetPdf: vi.fn(async (paper: PersistedWorksheet, kind: string, code?: string) => {
    pdf.calls.push({ paper, kind, code });
  }),
  exportGradedWorksheetPdf: vi.fn(async () => {}),
}));
vi.mock("../components/chaptertest/ChapterTestUploadPanel", () => ({
  default: (p: { code: string; objective: { awarded: number; total: number }; onGrade: (u: unknown) => void }) => (
    <div data-testid="upload-step">
      {p.code} · objective {p.objective.awarded}/{p.objective.total}
      <button type="button" onClick={() => p.onGrade({ imageBase64: "x", imageMimeType: "application/pdf" })}>
        stub-grade
      </button>
    </div>
  ),
}));
const grade = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>>, ok: null as unknown }));
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return {
    ...actual,
    gradeFullMockUpload: vi.fn(async (args: Record<string, unknown>) => {
      grade.calls.push(args);
      if (grade.ok) return grade.ok;
      return { ok: false, response: { ok: false, error: "stubbed" }, miOutcomes: [] };
    }),
  };
});

import FullMockPage from "./FullMockPage";
import { awaitingPaperResponse } from "../components/papers/paperDownloadRecord";
import { __resetUsageClientForTests } from "../services/usageClient";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";
import { seriesMockWorksheetId } from "../lib/testSeries/testSeries";

const CODE = "FM-M-02";
const paper: PersistedWorksheet = {
  worksheetId: "fm-downloaded-1",
  createdAt: "2026-11-19", // MYPACKS-TS-1: after the release (a paper created before it keeps the old upload rule)
  title: "Maths · Mock #2",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 5,
  code: CODE,
  name: "Maths · Mock #2",
  questions: [
    { qNumber: 1, id: "q-a1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "HCF of 6 and 8?", options: ["1", "2", "3", "4"], answer: "2" },
    { qNumber: 2, id: "q-a2", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "LCM of 2 and 3?", options: ["5", "6", "7", "8"], answer: "6" },
    { qNumber: 3, id: "q-c", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove sqrt(2) is irrational.", solutionSteps: ["a", "b", "c"] },
  ],
};
function pendingRecord(): SessionRecord {
  return buildFullMockSessionRecord({ paper, code: CODE, subject: "maths", uid: "student-1", response: awaitingPaperResponse(paper) });
}
function mount() {
  render(
    <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const recordWrites = () => fs.writes.filter((w) => w.path.startsWith("sessionRecords/student-1/records/"));
const paperWrites = () => fs.writes.filter((w) => w.path.startsWith("sessionRecords/student-1/fullMockPapers/"));

beforeEach(() => {
  window.localStorage.clear();
  __resetUsageClientForTests();
  records.list = [];
  fs.writes = [];
  fs.docs = {};
  pdf.calls = [];
  grade.calls = [];
  grade.ok = null;
  mine.freeTest = undefined;
  resetTestSeriesOwnershipForTests();
  resetOwnedPacksCache();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each(["free", "trial", "premium"] as const)("Full Mock · %s account", (tier) => {
  const entitled = tier === "premium";
  it(`Section A is marked; ${entitled ? "the upload step and the Download button" : "the upgrade card and the download link"}`, async () => {
    sub.tier = tier;
    records.list = [pendingRecord()];
    fs.docs[`sessionRecords/student-1/fullMockPapers/${CODE}`] = {
      code: CODE, name: "Maths · Mock #2", subject: "Maths", grade: "10", paper,
      startedAt: 1, durationMs: 0, objective: null, downloaded: true, savedAt: 1,
    };
    fs.docs[`sessionRecords/student-1/records/${CODE}`] = pendingRecord();
    mount();
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    if (entitled) {
      expect(screen.getByRole("button", { name: /Download this paper/ })).toBeTruthy();
      expect(screen.queryByTestId("download-with-plan")).toBeNull();
    } else {
      expect(screen.queryByRole("button", { name: /Download this paper/ })).toBeNull();
      expect(screen.getByTestId("download-with-plan").getAttribute("href")).toBe("/packs?buy=test_series");
    }
    fireEvent.click(await screen.findByRole("button", { name: /Upload now/ }));
    await screen.findByTestId("section-a-picker");
    fireEvent.click(screen.getAllByRole("button", { name: /^B/ })[1]); // Q2 = "6" (correct)
    fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
    // Section A is marked for everyone.
    await waitFor(() => expect(recordWrites().at(-1)?.body).toMatchObject({ id: CODE, status: "partial", marksAwarded: 1, marksTotal: 2 }));
    if (entitled) {
      expect((await screen.findByTestId("upload-step")).textContent).toContain(`${CODE} · objective 1/2`);
      expect(screen.queryByTestId("written-check-upgrade")).toBeNull();
    } else {
      const card = await screen.findByTestId("written-check-upgrade");
      expect(card.textContent).toContain("Section A marked: 1/2");
      expect(card.textContent).toContain("Sections B–E");
      expect(screen.getByTestId("written-check-ts").getAttribute("href")).toBe("/packs?buy=test_series");
      expect(screen.getByTestId("written-check-bp").getAttribute("href")).toBe("/board-pass");
      expect(screen.queryByTestId("upload-step")).toBeNull();
    }
  }, 90000);

  it(`with one test already taken: ${entitled ? "starts a new mock" : "the upgrade wall, no new paper"}`, async () => {
    sub.tier = tier;
    records.list = [{ ...pendingRecord(), id: "CT-M-RN-01", surface: "chapter-test", worksheetId: "ct-old" }];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 }));
    if (entitled) {
      await waitFor(() => expect(screen.queryByRole("button", { name: /Start the mock/ })).toBeNull());
      expect(screen.queryByTestId("series-start-wall")).toBeNull();
    } else {
      const wall = await screen.findByTestId("series-start-wall");
      expect(wall.textContent).toContain(`Upgrade to the Test Series (${packPriceLabel("test_series")}) or the Board Pass to take all ${seriesTotals().total} tests`);
      expect(screen.getByRole("button", { name: /Start the mock/ })).toBeTruthy();
    }
  }, 90000);
});

/* ── TS-FREE-CHECK-1 (owner ruling 23 Nov 2026) · the free Test Series test includes written-answer marking ─────────────────── */
// The server pins the free paper at the first written check and refuses every other paper (server/services/testSeriesChecks.test.cjs);
// here: the same downloaded-paper flow as above, on a Test Series Full-Length paper that IS the account's one free test.
const SERIES_CODE = "FM-M-03";
const seriesPaper: PersistedWorksheet = { ...paper, worksheetId: seriesMockWorksheetId("fm-downloaded-1", "Maths", 1), code: SERIES_CODE };
function seriesPendingRecord(): SessionRecord {
  return buildFullMockSessionRecord({ paper: seriesPaper, code: SERIES_CODE, subject: "maths", uid: "student-1", response: awaitingPaperResponse(seriesPaper) });
}
async function uploadSeriesPaper() {
  records.list = [seriesPendingRecord()];
  fs.docs[`sessionRecords/student-1/fullMockPapers/${SERIES_CODE}`] = {
    code: SERIES_CODE, name: "Maths · Mock #1", subject: "Maths", grade: "10", paper: seriesPaper,
    startedAt: 1, durationMs: 0, objective: null, downloaded: true, savedAt: 1,
  };
  fs.docs[`sessionRecords/student-1/records/${SERIES_CODE}`] = seriesPendingRecord();
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Upload now/ }, { timeout: 60000 }));
  await screen.findByTestId("section-a-picker");
  fireEvent.click(screen.getAllByRole("button", { name: /^B/ })[1]);
  fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
  await waitFor(() => expect(recordWrites().at(-1)?.body).toMatchObject({ id: SERIES_CODE, status: "partial" }));
}

describe.each(["free", "trial"] as const)("TS-FREE-CHECK-1 · Full Mock series paper · %s account", (tier) => {
  it("the free test (no pin yet; it is the account's one test) -> the written-answer upload with the free test's 2 checks", async () => {
    sub.tier = tier;
    mine.freeTest = { paperKey: null, checksPerPaper: 2, used: 0 };
    await uploadSeriesPaper();
    expect((await screen.findByTestId("upload-step")).textContent).toContain(`${SERIES_CODE} · objective 1/2`);
    expect(screen.queryByTestId("written-check-upgrade")).toBeNull();
    expect((await screen.findByTestId("series-checks-left")).textContent).toBe("Your free test · Checks left on this paper: 2 of 2");
  }, 90000);

  it("the server pinned ANOTHER paper as the free test -> the upgrade card, no upload (today's behaviour)", async () => {
    sub.tier = tier;
    mine.freeTest = { paperKey: "TS-CT-M01", checksPerPaper: 2, used: 2 };
    await uploadSeriesPaper();
    expect(await screen.findByTestId("written-check-upgrade")).toBeTruthy();
    expect(screen.queryByTestId("upload-step")).toBeNull();
  }, 90000);

  it("no `freeTest` from the server (its kill switch) -> the upgrade card exactly as before", async () => {
    sub.tier = tier;
    await uploadSeriesPaper();
    expect(await screen.findByTestId("written-check-upgrade")).toBeTruthy();
    expect(screen.queryByTestId("upload-step")).toBeNull();
  }, 90000);
});
