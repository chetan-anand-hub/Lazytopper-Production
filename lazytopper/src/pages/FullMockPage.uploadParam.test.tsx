// GRADE-ROUTE-1 A2 - `?upload=<code>` opens THAT pending mock's upload like the pending banner's button.
// (scaffold copied from FullMockPage.await1.test.tsx; a DOWNLOADED Full Mock is kept (pending record + paper under the printed
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
function mount(search = "") {
  render(
    <MemoryRouter initialEntries={[`/full-mock/10/maths${search}`]}>
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


function seedPending() {
  records.list = [pendingRecord()];
  fs.docs[`sessionRecords/student-1/fullMockPapers/${CODE}`] = {
    code: CODE, name: "Maths · Mock #2", subject: "Maths", grade: "10", paper,
    startedAt: 1, durationMs: 0, objective: null, downloaded: true, savedAt: 1,
  };
  fs.docs[`sessionRecords/student-1/records/${CODE}`] = pendingRecord();
}

describe("GRADE-ROUTE-1 A2 - /full-mock/10/<Subject>?upload=<code>", () => {
  it("opens THAT pending mock's upload (Section A picks first), attaching to the EXISTING record", async () => {
    seedPending();
    mount(`?upload=${CODE}`);
    const picker = await screen.findByTestId("section-a-picker", {}, { timeout: 60000 });
    expect(picker.textContent).toContain("Untapped questions count as not attempted.");
    expect(recordWrites()).toHaveLength(0); // nothing new is written by merely opening it
    fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
    const step = await screen.findByTestId("upload-step");
    expect(step.textContent).toContain(`${CODE} ·`);
    expect(new Set(recordWrites().map((w) => w.path))).toEqual(new Set([`sessionRecords/student-1/records/${CODE}`]));
  }, 90000);

  it("unknown code, or a GRADED mock: the normal page (no upload step opens)", async () => {
    seedPending();
    mount("?upload=FM-M-99");
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    expect(screen.queryByTestId("section-a-picker")).toBeNull();
    expect(screen.queryByTestId("upload-step")).toBeNull();
    cleanup();
    records.list = [{ ...pendingRecord(), status: "graded", marksAwarded: 2, marksTotal: 5 }];
    mount(`?upload=${CODE}`);
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    expect(screen.queryByTestId("section-a-picker")).toBeNull();
    expect(screen.queryByTestId("upload-step")).toBeNull();
  }, 90000);
});
