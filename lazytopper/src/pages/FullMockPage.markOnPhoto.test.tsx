// MARK-ON-PHOTO-2 — Full Mock: "Mark it on your photo" on a FRESH result and on a RE-OPENED one. After the (stubbed) mark the
// scorecard's headline score and the row move; on a re-opened mock the score is the RECORD's (review S1), so the page must swap
// in the record the mark re-saved — this test is RED when it keeps the stale one.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildFullMockSessionRecord, type SessionRecord } from "../services/sessionRecords";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
const fs = vi.hoisted(() => ({ docs: {} as Record<string, unknown> }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async (ref: { path: string }) => ({ exists: () => fs.docs[ref.path] != null, data: () => fs.docs[ref.path], metadata: { fromCache: false } })),
  deleteDoc: vi.fn(async () => {}),
}));
const records = vi.hoisted(() => ({ list: [] as unknown[], response: null as unknown }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: async () => records.list,
    getSessionPerQuestion: async () => (records.response ? { response: records.response } : null),
  };
});
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, snapshot: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
vi.mock("../components/results/useDetailLock", () => ({ useDetailLock: () => "open" }));
vi.mock("../components/chaptertest/ChapterTestUploadPanel", () => ({
  default: (p: { onGrade: (u: unknown) => void }) => (
    <button type="button" onClick={() => p.onGrade({ imageBase64: "x", imageMimeType: "application/pdf" })}>stub-grade</button>
  ),
}));
vi.mock("../components/checkimprove/MarkOnPhoto", () => ({
  MarkOnPhotoDialog: (p: { label: string; onSubmit: (i: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" data-testid="stub-mark-submit" onClick={() => p.onSubmit({ imageBase64: "Q1JPUA==", imageMimeType: "image/jpeg" })}>
      submit {p.label}
    </button>
  ),
}));
const svc = vi.hoisted(() => ({ upload: vi.fn(), mark: vi.fn() }));
vi.mock("../services/fullMockGradeService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/fullMockGradeService")>()),
  gradeFullMockUpload: svc.upload,
  markFullMockQuestion: svc.mark,
}));
vi.mock("../components/testSeries/WrittenCheckGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../components/testSeries/WrittenCheckGate")>()),
  useSeriesPaperAccess: () => true,
  useSeriesAccess: () => ({ canCheck: true, canDownload: true, checking: false, failed: false, ownsSeries: false, status: null, retry: () => undefined }),
  useBoardPassHolder: () => true,
}));

import FullMockPage from "./FullMockPage";
import { awaitingPaperResponse } from "../components/papers/paperDownloadRecord";
import { __resetUsageClientForTests } from "../services/usageClient";
import { asNotFoundNotAttempted } from "../lib/notFoundNotAttempted";

const CODE = "FM-M-02";
const paper: PersistedWorksheet = {
  worksheetId: "fm-downloaded-1", createdAt: "2026-10-17", title: "Maths · Mock #2", subject: "Maths", grade: "10", sectionFilter: "All",
  totalMarks: 4, code: CODE, name: "Maths · Mock #2",
  questions: [
    { qNumber: 1, id: "q-a1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "HCF of 6 and 8?", options: ["1", "2", "3", "4"], answer: "2" },
    { qNumber: 2, id: "q-c", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove sqrt(2) is irrational.", solutionSteps: ["a", "b", "c"] },
  ],
} as PersistedWorksheet;
const row = (qNumber: number, total: number, awarded: number): WorksheetQuestionGrade => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: Math.round((awarded / total) * 100),
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
});
const unread = (qNumber: number, total: number) => ({ qNumber, couldNotRead: true, totalMarks: total, note: "We couldn't read this answer." }) as WorksheetQuestionGrade;
const notFound = (qNumber: number, total: number) => asNotFoundNotAttempted(({ qNumber, couldNotRead: true, totalMarks: total, note: "Answer not found on the uploaded pages." }) as WorksheetQuestionGrade);
const resp = (rows: WorksheetQuestionGrade[]): WorksheetGradeResponse => {
  const graded = rows.filter((r) => !r.couldNotRead);
  return {
    ok: true, worksheetId: paper.worksheetId, results: rows, totalQuestions: rows.length, gradedCount: graded.length, pendingCount: rows.length - graded.length,
    gradedMarksAwarded: graded.reduce((s, r) => s + (r.marksAwarded ?? 0), 0), gradedMarksTotal: graded.reduce((s, r) => s + (r.totalMarks ?? 0), 0), worksheetTotalMarks: 4,
  };
};
const hero = () => (document.querySelector(".lt-sc__big")?.textContent ?? "").replace(/\s+/g, " ").trim();
const OBJ = { results: [{ qNumber: 1, id: "q-a1", selected: "2", correct: true, awarded: 1, total: 1 }], awarded: 1, total: 1, answeredCount: 1, totalQuestions: 1 };
const SNAP_PATH = `sessionRecords/student-1/fullMockPapers/${CODE}`;
function savedRecord(response: WorksheetGradeResponse): SessionRecord {
  return buildFullMockSessionRecord({ paper, code: CODE, subject: "maths", uid: "student-1", response });
}
function mount(search = "") {
  render(
    <MemoryRouter initialEntries={[`/full-mock/10/maths${search}`]}>
      <Routes><Route path="/full-mock/:grade/:subject" element={<FullMockPage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  __resetUsageClientForTests();
  records.list = [];
  records.response = null;
  fs.docs = {};
  svc.upload.mockReset();
  svc.mark.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MARK-ON-PHOTO-2 · Full Mock", () => {
  it("★★ FRESH: the mark grades that row, and the scorecard's score and row move", async () => {
    records.list = [buildFullMockSessionRecord({ paper, code: CODE, subject: "maths", uid: "student-1", response: awaitingPaperResponse(paper) })];
    fs.docs[SNAP_PATH] = { code: CODE, name: "Maths · Mock #2", subject: "Maths", grade: "10", paper, startedAt: 1, durationMs: 0, objective: OBJ, savedAt: 1 };
    svc.upload.mockResolvedValue({ ok: true, response: resp([row(1, 1, 1), unread(2, 3)]), miOutcomes: [] });
    mount(`?upload=${CODE}`);
    fireEvent.click(await screen.findByRole("button", { name: "stub-grade" }, { timeout: 60000 }));
    const btn = await screen.findByTestId("sc-mark-on-photo-btn", {}, { timeout: 15000 });
    expect(btn.textContent).toBe("Q2");
    expect(hero()).toMatch(/^1 \/ 4/);
    svc.mark.mockResolvedValue({ kind: "marked", response: resp([row(1, 1, 1), row(2, 3, 2)]) });
    fireEvent.click(btn);
    fireEvent.click(await screen.findByTestId("stub-mark-submit", {}, { timeout: 15000 }));
    await waitFor(() => expect(hero()).toMatch(/^3 \/ 4/), { timeout: 15000 });
    expect(screen.queryByTestId("sc-mark-on-photo")).toBeNull();
    expect(svc.mark.mock.calls[0][0]).toMatchObject({ code: CODE, index: 1, paper: { worksheetId: paper.worksheetId } });
  }, 90000);

  it("★★ RE-OPENED: the headline score is the re-saved RECORD's after the mark (review S1)", async () => {
    const before = resp([row(1, 1, 1), notFound(2, 3)]);
    records.list = [savedRecord(before)];
    records.response = before;
    fs.docs[SNAP_PATH] = { code: CODE, name: "Maths · Mock #2", subject: "Maths", grade: "10", paper, startedAt: 1, durationMs: 0, objective: OBJ, savedAt: 1 };
    mount(`?review=${CODE}`);
    const btn = await screen.findByTestId("sc-mark-on-photo-btn", {}, { timeout: 60000 });
    expect(hero()).toMatch(/^1 \//);
    const after = resp([row(1, 1, 1), row(2, 3, 3)]);
    svc.mark.mockResolvedValue({ kind: "marked", response: after, record: savedRecord(after) });
    fireEvent.click(btn);
    fireEvent.click(await screen.findByTestId("stub-mark-submit", {}, { timeout: 15000 }));
    await waitFor(() => expect(hero()).toMatch(/^4 \/ 4/), { timeout: 15000 });
    expect(screen.queryByTestId("sc-not-found-not-attempted")).toBeNull();
  }, 90000);
});
