// AWAIT-1-PAPERS — a DOWNLOADED Full Mock is kept (pending record + paper under the printed
// code); "Upload now" re-opens THAT paper, Section A is tapped in, and the existing upload grades
// the rest against the SAME ids. A downloaded mock was not sat in the app: no time or focus
// figure is invented — none is recorded and none is shown (owner ruling).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildFullMockSessionRecord, type SessionRecord } from "../services/sessionRecords";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import type { ObjectiveScore } from "../services/chapterTestGradeService";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
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
const grade = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }));
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return {
    ...actual,
    gradeFullMockUpload: vi.fn(async (args: Record<string, unknown>) => {
      grade.calls.push(args);
      return { ok: false, response: { ok: false, error: "stubbed" }, miOutcomes: [] };
    }),
  };
});

import FullMockPage from "./FullMockPage";
import { awaitingPaperResponse } from "../components/papers/paperDownloadRecord";
import { __resetUsageClientForTests } from "../services/usageClient";

const CODE = "FM-M-02";
const paper: PersistedWorksheet = {
  worksheetId: "fm-downloaded-1",
  createdAt: "2026-10-17",
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
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AWAIT-1 · Full Mock download", () => {
  it("★ download -> pending-upload record + paper under the PRINTED code; no time or focus is recorded", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Download this paper/ }, { timeout: 60000 }));
    await waitFor(() => expect(recordWrites()).toHaveLength(1));
    const printed = pdf.calls[0].code!;
    expect(printed).toMatch(/^FM-M-/);
    const rec = recordWrites()[0];
    expect(rec.path).toBe(`sessionRecords/student-1/records/${printed}`);
    expect(rec.body).toMatchObject({ id: printed, surface: "full-mock", status: "pending-upload", marksAwarded: 0, marksTotal: 0 });
    expect(rec.body).not.toHaveProperty("focus");
    await waitFor(() => expect(paperWrites()).toHaveLength(1));
    const snap = paperWrites()[0].body;
    expect(snap).toMatchObject({ code: printed, downloaded: true, objective: null, durationMs: 0 });
    expect(snap).not.toHaveProperty("focus");
    const note = await screen.findByTestId("paper-downloaded-note");
    expect(note.textContent).toContain(`Your paper: ${printed}.`);
    expect(screen.getByTestId("paper-reminder-actions")).toBeTruthy();
  }, 90000);
});

describe("AWAIT-1 · Upload on a downloaded Full Mock", () => {
  it("★ 'Upload now' -> Section A picks -> the existing upload, SAME ids, no focus figure", async () => {
    records.list = [pendingRecord()];
    fs.docs[`sessionRecords/student-1/fullMockPapers/${CODE}`] = {
      code: CODE, name: "Maths · Mock #2", subject: "Maths", grade: "10", paper,
      startedAt: 1, durationMs: 0, objective: null, downloaded: true, savedAt: 1,
    };
    mount();
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    // The banner never reads "objective scored 0/0" for a downloaded paper.
    expect(document.body.textContent).toContain(`(${CODE}) is awaiting your answer sheet.`);
    expect(document.body.textContent).not.toMatch(/objective scored\s*0\/0/);
    fireEvent.click(await screen.findByRole("button", { name: /Upload now/ }));
    const picker = await screen.findByTestId("section-a-picker");
    expect(picker.textContent).toContain("Untapped questions count as not attempted.");
    fireEvent.click(screen.getAllByRole("button", { name: /^B/ })[1]); // Q2 = "6" (correct)
    fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
    const step = await screen.findByTestId("upload-step");
    expect(step.textContent).toContain(`${CODE} · objective 1/2`);
    await waitFor(() => expect(recordWrites().at(-1)?.body).toMatchObject({ id: CODE, status: "partial", marksAwarded: 1, marksTotal: 2 }));
    expect(recordWrites().at(-1)?.body).not.toHaveProperty("focus");
    // No on-screen time line for a paper that was not sat in the app.
    expect(document.body.textContent).not.toMatch(/Focus time/);
    fireEvent.click(screen.getByRole("button", { name: "stub-grade" }));
    await waitFor(() => expect(grade.calls).toHaveLength(1));
    const args = grade.calls[0] as { paper: PersistedWorksheet; code: string; objective: ObjectiveScore; subjectiveQuestions: PersistedWorksheet["questions"]; focus?: unknown };
    expect(args.code).toBe(CODE);
    expect(args.paper.worksheetId).toBe("fm-downloaded-1");
    expect(args.objective.results.map((r) => [r.id, r.selected, r.awarded])).toEqual([
      ["q-a1", null, 0],
      ["q-a2", "6", 1],
    ]);
    expect(args.subjectiveQuestions.map((q) => q.id)).toEqual(["q-c"]);
    expect(args.focus).toBeUndefined();
  }, 90000);
});
