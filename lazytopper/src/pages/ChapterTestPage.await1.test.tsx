// AWAIT-1-PAPERS — a DOWNLOADED Chapter Test is kept (pending record + paper with the printed
// code), the student is told the code, and "Upload" later re-opens THAT paper: Section A is
// tapped in (owner ruling, option a) and scored by the existing scorer, the written sections go
// through the existing upload — graded against the SAME question ids. Signed out: export only.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildChapterTestSessionRecord, type SessionRecord } from "../services/sessionRecords";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import type { ObjectiveScore } from "../services/chapterTestGradeService";

const auth = vi.hoisted(() => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" } as unknown }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));

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
// Item 4: the picker honours the same fair-use start gate as an in-app start.
const fair = vi.hoisted(() => ({ block: false }));
vi.mock("../components/usage/useFairUse", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/usage/useFairUse")>();
  return {
    ...actual,
    useFairUse: (...args: Parameters<typeof actual.useFairUse>) => {
      const r = actual.useFairUse(...args);
      return { ...r, blockPaperStart: () => (fair.block ? true : r.blockPaperStart()) };
    },
  };
});

const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: async () => records.list,
    getSessionPerQuestion: async () => null,
  };
});

const pdf = vi.hoisted(() => ({ calls: [] as Array<{ paper: PersistedWorksheet; kind: string; code?: string }> }));
vi.mock("../components/worksheet/worksheetPdfExport", () => ({
  exportWorksheetPdf: vi.fn(async (paper: PersistedWorksheet, kind: string, code?: string) => {
    pdf.calls.push({ paper, kind, code });
  }),
  exportGradedWorksheetPdf: vi.fn(async () => {}),
}));

// The upload step itself is unchanged and tested elsewhere; a stub hands a sheet to onGrade.
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
const mi = vi.hoisted(() => ({ recordMistake: vi.fn(), recordAttempt: vi.fn() }));
vi.mock("../services/mistakeIntelligence", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeIntelligence")>()),
  recordMistake: mi.recordMistake,
}));
vi.mock("../services/practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/practiceInsights")>()),
  recordAttempt: mi.recordAttempt,
}));
vi.mock("../services/chapterTestGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/chapterTestGradeService")>();
  return {
    ...actual,
    gradeChapterTestUpload: vi.fn(async (args: Record<string, unknown>) => {
      grade.calls.push(args);
      return { ok: false, response: { ok: false, error: "stubbed" }, miOutcomes: [] };
    }),
  };
});

import ChapterTestPage from "./ChapterTestPage";
import { awaitingPaperResponse } from "../components/papers/paperDownloadRecord";
import { saveChapterTestPaper } from "../services/chapterTestPaperStore";

const CODE = "CT-M-REAL-03";
const paper: PersistedWorksheet = {
  worksheetId: "ct-downloaded-1",
  createdAt: "2026-10-17",
  title: "Real Numbers test",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 5,
  code: CODE,
  name: "Real Numbers · Test #3",
  questions: [
    { qNumber: 1, id: "q-a1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "HCF of 6 and 8?", options: ["1", "2", "3", "4"], answer: "2" },
    { qNumber: 2, id: "q-a2", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "LCM of 2 and 3?", options: ["5", "6", "7", "8"], answer: "6" },
    { qNumber: 3, id: "q-c", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove sqrt(2) is irrational.", solutionSteps: ["a", "b", "c"] },
  ],
};
function pendingRecord(): SessionRecord {
  return buildChapterTestSessionRecord({
    paper,
    code: CODE,
    subject: "maths",
    topicKey: "real-numbers",
    uid: "student-1",
    response: awaitingPaperResponse(paper),
  });
}

async function mount() {
  render(
    <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const recordWrites = () => fs.writes.filter((w) => w.path.startsWith("sessionRecords/student-1/records/"));
const paperWrites = () => fs.writes.filter((w) => w.path.startsWith("sessionRecords/student-1/chapterTestPapers/"));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  fs.writes = [];
  fs.docs = {};
  fair.block = false;
  pdf.calls = [];
  grade.calls = [];
  records.list = [];
  mi.recordMistake.mockReset();
  mi.recordAttempt.mockReset();
  auth.user = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
});
afterEach(() => cleanup());

describe("AWAIT-1 · Chapter Test download keeps the paper", () => {
  it("★ download -> a pending-upload record + the paper, under the code PRINTED on the PDF; the code is shown", async () => {
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /Download this test/ }, { timeout: 30000 }));
    await waitFor(() => expect(recordWrites()).toHaveLength(1));
    const printed = pdf.calls[0].code!;
    expect(printed).toMatch(/^CT-M-/);
    const rec = recordWrites()[0];
    expect(rec.path).toBe(`sessionRecords/student-1/records/${printed}`);
    // Exactly what is written: nothing graded, no marks, no mistake types.
    expect(rec.body).toMatchObject({ id: printed, surface: "chapter-test", status: "pending-upload", marksAwarded: 0, marksTotal: 0 });
    expect(Object.values((rec.body.fourType as Record<string, number> | null) ?? {}).every((n) => !n)).toBe(true);
    expect(rec.body.questionIds).toEqual(pdf.calls[0].paper.questions.map((q) => q.id));
    // The paper itself, same code, no Section A result yet.
    await waitFor(() => expect(paperWrites()).toHaveLength(1));
    expect(paperWrites()[0].path).toBe(`sessionRecords/student-1/chapterTestPapers/${printed}`);
    expect(paperWrites()[0].body).toMatchObject({ code: printed, downloaded: true, objective: null });
    expect((paperWrites()[0].body.paper as PersistedWorksheet).worksheetId).toBe(pdf.calls[0].paper.worksheetId);
    // The confirmation card: the code, where to come back, and the reminders.
    const note = await screen.findByTestId("paper-downloaded-note");
    expect(note.textContent).toContain(`Your paper: ${printed}.`);
    expect(note.textContent).toMatch(/Write this code at the top of your answer sheet/);
    expect(screen.getByTestId("paper-reminder-actions")).toBeTruthy();
    // MI / progress untouched: nothing was graded.
    expect(mi.recordMistake).not.toHaveBeenCalled();
    expect(mi.recordAttempt).not.toHaveBeenCalled();
  });

  it("★ the next mount does not re-mint the downloaded paper's code for a new paper", async () => {
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /Download this test/ }, { timeout: 30000 }));
    await waitFor(() => expect(recordWrites()).toHaveLength(1));
    const first = pdf.calls[0].code!;
    cleanup();
    records.list = [recordWrites()[0].body];
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /Download this test/ }, { timeout: 30000 }));
    await waitFor(() => expect(pdf.calls).toHaveLength(2));
    expect(pdf.calls[1].code).not.toBe(first);
  });

  it("★ signed out: the PDF downloads, nothing is stored, and the sign-in line shows", async () => {
    auth.user = null;
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /Download this test/ }, { timeout: 30000 }));
    await screen.findByText("Sign in to keep this paper and upload your answers later.");
    expect(pdf.calls).toHaveLength(1);
    expect(fs.writes).toHaveLength(0);
    expect(screen.queryByTestId("paper-reminder-actions")).toBeNull();
  });
});

describe("AWAIT-1 · Upload on a downloaded Chapter Test", () => {
  it("★ re-opens THAT paper: Section A tapped in (untapped = not attempted), graded against the SAME ids", async () => {
    records.list = [pendingRecord()];
    fs.docs[`sessionRecords/student-1/records/${CODE}`] = pendingRecord(); // still pending on the server
    saveChapterTestPaper(auth.user as never, {
      code: CODE, name: paper.name!, subject: "Maths", topicKey: "real-numbers", paper, objective: null, downloaded: true,
    });
    fs.writes = [];
    await mount();
    await screen.findByText(/Awaiting sheet/, undefined, { timeout: 30000 });
    // Item 2: the rail never reads "Objective scored (0/0)" for a downloaded paper.
    expect(document.body.textContent).toContain("Awaiting your answers — nothing graded yet.");
    expect(document.body.textContent).not.toMatch(/Objective scored \(0\/0\)/);
    fireEvent.click(screen.getByText(/Awaiting sheet/));
    const picker = await screen.findByTestId("section-a-picker");
    expect(picker.textContent).toContain("Untapped questions count as not attempted.");
    expect(picker.textContent).toContain(CODE);
    // Tap Q1 = "2" (correct); leave Q2 untapped.
    fireEvent.click(screen.getAllByRole("button", { name: /^B/ })[0]);
    expect(picker.textContent).toMatch(/1 of 2 tapped · 1 will count as not attempted/);
    fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
    const step = await screen.findByTestId("upload-step");
    expect(step.textContent).toContain(`${CODE} · objective 1/2`);
    // The Section A result is now kept like an in-app submit (a partial record + the paper).
    await waitFor(() => expect(recordWrites().at(-1)?.body).toMatchObject({ id: CODE, status: "partial", marksAwarded: 1, marksTotal: 2 }));
    fireEvent.click(screen.getByRole("button", { name: "stub-grade" }));
    await waitFor(() => expect(grade.calls).toHaveLength(1));
    const args = grade.calls[0] as { paper: PersistedWorksheet; code: string; objective: ObjectiveScore; subjectiveQuestions: PersistedWorksheet["questions"] };
    expect(args.code).toBe(CODE);
    expect(args.paper.worksheetId).toBe("ct-downloaded-1");
    expect(args.paper.questions.map((q) => q.id)).toEqual(["q-a1", "q-a2", "q-c"]);
    expect(args.objective.results.map((r) => [r.id, r.selected, r.awarded])).toEqual([
      ["q-a1", "2", 1],
      ["q-a2", null, 0],
    ]);
    expect(args.subjectiveQuestions.map((q) => q.id)).toEqual(["q-c"]);
  });

  it("★ continued on ANOTHER device meanwhile -> nothing is written here; the notice + its current state (upload step)", async () => {
    const serverObjective: ObjectiveScore = {
      results: [
        { qNumber: 1, id: "q-a1", selected: "2", correct: true, awarded: 1, total: 1 },
        { qNumber: 2, id: "q-a2", selected: "6", correct: true, awarded: 1, total: 1 },
      ],
      awarded: 2, total: 2, answeredCount: 2, totalQuestions: 2,
    };
    records.list = [pendingRecord()]; // this device's view is stale
    saveChapterTestPaper(auth.user as never, {
      code: CODE, name: paper.name!, subject: "Maths", topicKey: "real-numbers", paper, objective: null, downloaded: true,
    });
    // The server: the other device entered Section A (partial) and saved the paper with it.
    fs.docs[`sessionRecords/student-1/records/${CODE}`] = { ...pendingRecord(), status: "partial", marksAwarded: 2, marksTotal: 2 };
    fs.docs[`sessionRecords/student-1/chapterTestPapers/${CODE}`] = {
      code: CODE, name: paper.name, subject: "Maths", topicKey: "real-numbers", paper, objective: serverObjective, downloaded: true, savedAt: 2,
    };
    fs.writes = [];
    await mount();
    fireEvent.click(await screen.findByText(/Awaiting sheet/, undefined, { timeout: 30000 }));
    await screen.findByTestId("section-a-picker");
    records.list = [{ ...pendingRecord(), status: "partial", marksAwarded: 2, marksTotal: 2 }];
    fireEvent.click(screen.getAllByRole("button", { name: /^A/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
    expect((await screen.findByTestId("paper-notice")).textContent).toBe("This paper was already continued on another device.");
    const step = await screen.findByTestId("upload-step");
    expect(step.textContent).toContain(`${CODE} · objective 2/2`); // the OTHER device's Section A, not this one's taps
    expect(recordWrites()).toHaveLength(0);
    expect(paperWrites()).toHaveLength(0);
  });

  it("★ a read we cannot trust (offline cache) -> nothing is written, the student is told, the picker stays", async () => {
    const { getDoc } = await import("firebase/firestore");
    records.list = [pendingRecord()];
    saveChapterTestPaper(auth.user as never, {
      code: CODE, name: paper.name!, subject: "Maths", topicKey: "real-numbers", paper, objective: null, downloaded: true,
    });
    fs.writes = [];
    await mount();
    fireEvent.click(await screen.findByText(/Awaiting sheet/, undefined, { timeout: 30000 }));
    await screen.findByTestId("section-a-picker");
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => pendingRecord(), metadata: { fromCache: true } } as never);
    fireEvent.click(screen.getByRole("button", { name: /Continue to upload/ }));
    expect((await screen.findByTestId("paper-notice")).textContent).toMatch(/couldn.t check this paper/);
    expect(screen.getByTestId("section-a-picker")).toBeTruthy();
    expect(recordWrites()).toHaveLength(0);
  });

  it("★ fair use: an exhausted allowance stops the picker before anything is scored or written", async () => {
    fair.block = true;
    records.list = [pendingRecord()];
    saveChapterTestPaper(auth.user as never, {
      code: CODE, name: paper.name!, subject: "Maths", topicKey: "real-numbers", paper, objective: null, downloaded: true,
    });
    fs.writes = [];
    await mount();
    fireEvent.click(await screen.findByText(/Awaiting sheet/, undefined, { timeout: 30000 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("section-a-picker")).toBeNull();
    expect(recordWrites()).toHaveLength(0);
  });

  it("CONTROL: a test submitted in the app still opens straight on the upload step (no picker)", async () => {
    const objective: ObjectiveScore = {
      results: [
        { qNumber: 1, id: "q-a1", selected: "2", correct: true, awarded: 1, total: 1 },
        { qNumber: 2, id: "q-a2", selected: "6", correct: true, awarded: 1, total: 1 },
      ],
      awarded: 2, total: 2, answeredCount: 2, totalQuestions: 2,
    };
    records.list = [{ ...pendingRecord(), status: "partial" }];
    saveChapterTestPaper(auth.user as never, { code: CODE, name: paper.name!, subject: "Maths", topicKey: "real-numbers", paper, objective });
    await mount();
    fireEvent.click(await screen.findByText(/Awaiting sheet/, undefined, { timeout: 30000 }));
    const step = await screen.findByTestId("upload-step");
    expect(step.textContent).toContain(`${CODE} · objective 2/2`);
    expect(screen.queryByTestId("section-a-picker")).toBeNull();
  });
});
