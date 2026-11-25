// MARK-ON-PHOTO-2 — Chapter Test: "Mark it on your photo" on a FRESH result and on a RE-OPENED one. After the (stubbed) mark
// the scorecard's headline score and the row move; on a re-opened test the score is the RECORD's (review S1), so the page must
// swap in the record the mark re-saved — this test is RED when it keeps the stale one.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionRecord } from "../services/sessionRecords";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, snapshot: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
vi.mock("../components/results/useDetailLock", () => ({ useDetailLock: () => "open" }));
vi.mock("../components/testSeries/WrittenCheckGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../components/testSeries/WrittenCheckGate")>()),
  useSeriesPaperAccess: () => true,
  useSeriesAccess: () => ({ canCheck: true, canDownload: true, checking: false, failed: false, ownsSeries: false, status: null, retry: () => undefined }),
  useBoardPassHolder: () => true,
}));
// The dialog's crop step needs a canvas: the stub hands the page an answer image, as the real one does after the box is drawn.
vi.mock("../components/checkimprove/MarkOnPhoto", () => ({
  MarkOnPhotoDialog: (p: { label: string; onSubmit: (i: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" data-testid="stub-mark-submit" onClick={() => p.onSubmit({ imageBase64: "Q1JPUA==", imageMimeType: "image/jpeg" })}>
      submit {p.label}
    </button>
  ),
}));
vi.mock("../components/chaptertest/ChapterTestUploadPanel", () => ({
  default: (p: { onGrade: (u: unknown) => void }) => (
    <button type="button" onClick={() => p.onGrade({ imageBase64: "JVBER", imageMimeType: "application/pdf" })}>stub-grade</button>
  ),
}));
const store = vi.hoisted(() => ({ list: [] as unknown[], response: null as unknown }));
vi.mock("../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => store.list,
  getSessionPerQuestion: async () => (store.response ? { response: store.response } : null),
}));
const snap = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("../services/chapterTestPaperStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/chapterTestPaperStore")>()),
  loadChapterTestPaper: async () => snap.value,
  deleteChapterTestPaper: vi.fn(),
}));
const svc = vi.hoisted(() => ({ upload: vi.fn(), mark: vi.fn() }));
vi.mock("../services/chapterTestGradeService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/chapterTestGradeService")>()),
  gradeChapterTestUpload: svc.upload,
  markChapterTestQuestion: svc.mark,
}));

import ChapterTestPage from "./ChapterTestPage";
import { asNotFoundNotAttempted } from "../lib/notFoundNotAttempted";

const PAGE = "/chapter-test/10/maths/real-numbers";
const CODE = "CT-M-REALNUMBERS-07";
const row = (qNumber: number, total: number, awarded: number): WorksheetQuestionGrade => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: Math.round((awarded / total) * 100),
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
});
const unread = (qNumber: number, total: number): WorksheetQuestionGrade => ({ qNumber, couldNotRead: true, totalMarks: total, note: "We couldn't read this answer." }) as WorksheetQuestionGrade;
const notFound = (qNumber: number, total: number) => asNotFoundNotAttempted({ qNumber, couldNotRead: true, totalMarks: total, note: "Answer not found on the uploaded pages." } as WorksheetQuestionGrade);
const resp = (rows: WorksheetQuestionGrade[]): WorksheetGradeResponse => {
  const graded = rows.filter((r) => !r.couldNotRead);
  return {
    ok: true, worksheetId: "ct-1", results: rows, totalQuestions: rows.length, gradedCount: graded.length, pendingCount: rows.length - graded.length,
    gradedMarksAwarded: graded.reduce((s, r) => s + (r.marksAwarded ?? 0), 0), gradedMarksTotal: graded.reduce((s, r) => s + (r.totalMarks ?? 0), 0),
    worksheetTotalMarks: rows.reduce((s, r) => s + (r.totalMarks ?? 0), 0),
  };
};
const hero = () => (document.querySelector(".lt-sc__big")?.textContent ?? "").replace(/\s+/g, " ").trim();

function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: CODE, worksheetId: "ct-1", surface: "chapter-test", title: "Real Numbers · Test #7", subject: "maths", topicKeys: ["real-numbers"],
    questionIds: ["q-a", "q-c"], marksAwarded: 1, marksTotal: 4, status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, sectionBreakdown: null, gradedAt: 1_790_000_000_000,
    perQuestionRef: `ct:${CODE}`, dedupKey: `student-1::${CODE}`, ...over,
  } as SessionRecord;
}
function mount(at = PAGE) {
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes><Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  store.list = [];
  store.response = null;
  snap.value = null;
  svc.upload.mockReset();
  svc.mark.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MARK-ON-PHOTO-2 · Chapter Test", () => {
  it("★★ FRESH: the mark grades that row, and the scorecard's score and row move", async () => {
    svc.upload.mockImplementation(async (args: { paper: { worksheetId: string } }) => ({
      ok: true, response: { ...resp([row(1, 1, 1), unread(2, 3)]), worksheetId: args.paper.worksheetId }, miOutcomes: [],
    }));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Upload written answers for full result/ }));
    fireEvent.click(await screen.findByRole("button", { name: "stub-grade" }));
    const btn = await screen.findByTestId("sc-mark-on-photo-btn", {}, { timeout: 15000 });
    expect(btn.textContent).toBe("Q2");
    expect(hero()).toMatch(/^1 \/ 4/);
    svc.mark.mockImplementation(async (a: { response: WorksheetGradeResponse }) => ({ kind: "marked", response: { ...resp([row(1, 1, 1), row(2, 3, 2)]), worksheetId: a.response.worksheetId } }));
    fireEvent.click(btn);
    fireEvent.click(await screen.findByTestId("stub-mark-submit", {}, { timeout: 15000 }));
    await waitFor(() => expect(hero()).toMatch(/^3 \/ 4/), { timeout: 15000 });
    expect(screen.queryByTestId("sc-mark-on-photo")).toBeNull();
    expect(svc.mark).toHaveBeenCalledTimes(1);
    expect(svc.mark.mock.calls[0][0]).toMatchObject({ index: 1, image: { imageBase64: "Q1JPUA==" } });
  }, 90000);

  it("★★ RE-OPENED: the headline score is the re-saved RECORD's after the mark (review S1)", async () => {
    store.list = [record({ status: "graded", marksAwarded: 1 })];
    store.response = resp([row(1, 1, 1), notFound(2, 3)]);
    snap.value = { code: CODE, name: "Real Numbers · Test #7", subject: "Maths", topicKey: "real-numbers", paper: { worksheetId: "ct-1", questions: [] }, objective: { results: [], awarded: 1, total: 1, answeredCount: 1, totalQuestions: 1 } };
    mount(`${PAGE}?review=${CODE}`);
    const btn = await screen.findByTestId("sc-mark-on-photo-btn", {}, { timeout: 60000 });
    expect(hero()).toMatch(/^1 \//);
    svc.mark.mockImplementation(async () => ({
      kind: "marked",
      response: resp([row(1, 1, 1), row(2, 3, 3)]),
      record: record({ status: "graded", marksAwarded: 4, marksTotal: 4 }),
    }));
    fireEvent.click(btn);
    fireEvent.click(await screen.findByTestId("stub-mark-submit", {}, { timeout: 15000 }));
    await waitFor(() => expect(hero()).toMatch(/^4 \/ 4/), { timeout: 15000 });
    expect(screen.queryByTestId("sc-not-found-not-attempted")).toBeNull();
    expect(svc.mark.mock.calls[0][0]).toMatchObject({ code: CODE, index: 1 });
  }, 90000);
});
