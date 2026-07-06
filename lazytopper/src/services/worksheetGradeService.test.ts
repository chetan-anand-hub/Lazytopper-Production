import { describe, it, expect, vi, beforeEach } from "vitest";

// PR-E2b — the worksheet grade-loop orchestration: maps the upload result to the
// KNOWN scheme BY NUMBER, persists by worksheetId, and feeds Mistake Intelligence
// via the single front door with a STABLE worksheet-scoped questionId. The grader,
// MI front door, and persistence are mocked so the wiring is asserted in isolation.
// Runs in CI/Codespaces vitest; not in the Windows-local quality-gate matrix.

const gradeWorksheetMock = vi.fn();
const recordMistakeMock = vi.fn();
const recordAttemptMock = vi.fn();
const saveWorksheetGradeMock = vi.fn();
const ensureCodeMock = vi.fn();
const writeRecordMock = vi.fn();
const writePerQMock = vi.fn();
const buildRecordMock = vi.fn();

vi.mock("../ai/aiClient", () => ({ gradeWorksheet: (...a: unknown[]) => gradeWorksheetMock(...a) }));
vi.mock("./mistakeIntelligence", () => ({
  recordMistake: (...a: unknown[]) => recordMistakeMock(...a),
}));
vi.mock("./practiceInsights", () => ({
  recordAttempt: (...a: unknown[]) => recordAttemptMock(...a),
}));
vi.mock("./worksheetSessionStore", () => ({
  saveWorksheetGrade: (...a: unknown[]) => saveWorksheetGradeMock(...a),
  getWorksheetGrade: () => null,
  listStoredWorksheetsLite: () => [],
}));
vi.mock("./sessionRecords", () => ({
  ensureWorksheetSessionCode: (...a: unknown[]) => ensureCodeMock(...a),
  writeSessionRecord: (...a: unknown[]) => writeRecordMock(...a),
  writeSessionPerQuestion: (...a: unknown[]) => writePerQMock(...a),
  buildWorksheetSessionRecord: (...a: unknown[]) => buildRecordMock(...a),
}));

import {
  gradeWorksheetAndRecord,
  worksheetQuestionId,
} from "./worksheetGradeService";
import type { PersistedWorksheet } from "./worksheetSessionStore";

const USER = { uid: "u1", isLocalSession: false } as never;

const WS: PersistedWorksheet = {
  worksheetId: "ws-abc",
  createdAt: "2026-06-21T00:00:00.000Z",
  title: "Real Numbers — Quick drill",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 6,
  questions: [
    { qNumber: 1, id: "q-1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "Q one text" },
    { qNumber: 2, id: "q-2", subject: "Maths", topicKey: "polynomials", topicLabel: "Polynomials", section: "C", marks: 3, questionText: "Q two text" },
    { qNumber: 3, id: "q-3", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "B", marks: 2, questionText: "Q three text" },
  ],
};

/** A response: Q1 full marks, Q2 wrong (conceptual), Q3 couldNotRead. */
function buildResponse() {
  return {
    ok: true,
    worksheetId: "ws-abc",
    totalQuestions: 3,
    gradedCount: 2,
    pendingCount: 1,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 4,
    worksheetTotalMarks: 6,
    summary: "Good effort.",
    results: [
      { qNumber: 1, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 1, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "Correct." },
      { qNumber: 2, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 1, percentage: 33, annotatedSteps: [{ stepNumber: 1, description: "Method", studentWork: "x", status: "incorrect", marksAwarded: 0, marksDeducted: 2, teacherAnnotation: "Wrong method", mistakeType: "conceptual", correctedWorking: "Use Euclid" }], mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "Review the method." },
      { qNumber: 3, couldNotRead: true, totalMarks: 2, note: "Couldn't read — re-upload." },
    ],
  };
}

beforeEach(() => {
  gradeWorksheetMock.mockReset();
  recordMistakeMock.mockReset();
  recordAttemptMock.mockReset();
  saveWorksheetGradeMock.mockReset();
  ensureCodeMock.mockReset();
  writeRecordMock.mockReset();
  writePerQMock.mockReset();
  buildRecordMock.mockReset();
  recordMistakeMock.mockResolvedValue({ outcome: "logged", bridged: true });
  recordAttemptMock.mockReturnValue("recorded");
  ensureCodeMock.mockResolvedValue({ code: "WS-M-RN-01", name: "Real Numbers · Worksheet 1", kind: "single", sequence: 1 });
  buildRecordMock.mockReturnValue({ id: "WS-M-RN-01", surface: "worksheet", perQuestionRef: "ws:WS-M-RN-01", gradedAt: 123, dedupKey: "u1::WS-M-RN-01" });
  writeRecordMock.mockReturnValue("recorded");
});

describe("worksheetQuestionId — stable, namespaced", () => {
  it("is stable across re-grades and namespaced so it can't collide with other surfaces", () => {
    expect(worksheetQuestionId("ws-abc", 2)).toBe("ws:ws-abc:q2");
    expect(worksheetQuestionId("ws-abc", 2)).toBe(worksheetQuestionId("ws-abc", 2));
  });
});

describe("gradeWorksheetAndRecord", () => {
  it("sends the KNOWN question set (by number + scheme) to the grader", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    await gradeWorksheetAndRecord(USER, WS, { imageBase64: "BASE64", imageMimeType: "application/pdf" });
    const req = gradeWorksheetMock.mock.calls[0][0];
    expect(req.worksheetId).toBe("ws-abc");
    expect(req.imageBase64).toBe("BASE64");
    expect(req.questions.map((q: { qNumber: number }) => q.qNumber)).toEqual([1, 2, 3]);
    expect(req.questions[1]).toMatchObject({ qNumber: 2, marks: 3, questionText: "Q two text" });
  });

  it("persists the grade by worksheetId", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });
    expect(saveWorksheetGradeMock).toHaveBeenCalledTimes(1);
    expect(saveWorksheetGradeMock.mock.calls[0][0]).toBe("ws-abc");
  });

  it("routes each LEGIBLE question through the MI front door with a stable id; skips the unreadable one (no zero, no MI)", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    const { miOutcomes } = await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });

    // Q1 + Q2 fed to MI; Q3 (couldNotRead) NOT — never fabricated into a mistake/zero.
    expect(recordMistakeMock).toHaveBeenCalledTimes(2);
    const qIds = recordMistakeMock.mock.calls.map((c) => c[2].questionId);
    expect(qIds).toEqual(["ws:ws-abc:q1", "ws:ws-abc:q2"]);
    expect(qIds).not.toContain("ws:ws-abc:q3");

    // The wrong answer (Q2) carries the right topic + a real CheckSolutionResponse
    // (the mistakeType is what MI routes on — derived exactly like Check & Improve).
    const q2call = recordMistakeMock.mock.calls.find((c) => c[2].questionId === "ws:ws-abc:q2")!;
    expect(q2call[2]).toMatchObject({ subject: "Maths", topic: "Polynomials", topicKey: "polynomials" });
    expect(q2call[1].annotatedSteps[0].mistakeType).toBe("conceptual");

    expect(miOutcomes.map((o) => o.qNumber)).toEqual([1, 2]);
  });

  it("records a score-twin attempt for every graded question (full marks included)", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });
    expect(recordAttemptMock).toHaveBeenCalledTimes(2);
    const q1attempt = recordAttemptMock.mock.calls.find((c) => c[1].questionId === "ws:ws-abc:q1")!;
    expect(q1attempt[1]).toMatchObject({ marksScored: 1, marksAvailable: 1, mode: "graded" });
  });

  it("does not persist or wire MI when the grade call fails", async () => {
    gradeWorksheetMock.mockResolvedValue({ ok: false, error: "bad scan", results: [], totalQuestions: 0, gradedCount: 0, pendingCount: 0, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 0 });
    const { miOutcomes } = await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });
    expect(saveWorksheetGradeMock).not.toHaveBeenCalled();
    expect(recordMistakeMock).not.toHaveBeenCalled();
    expect(miOutcomes).toEqual([]);
  });
});

describe("gradeWorksheetAndRecord — PR-1 session record", () => {
  it("mints the durable code and writes ONE session record + its per-question payload", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    const outcome = await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });

    // Durable code minted (with the device-local fallback list) and surfaced on the outcome.
    expect(ensureCodeMock).toHaveBeenCalledTimes(1);
    expect(outcome.sessionCode).toBe("WS-M-RN-01");
    expect(outcome.sessionName).toBe("Real Numbers · Worksheet 1");

    // Exactly one record built + written (idempotent, id = code) and its payload persisted.
    expect(buildRecordMock).toHaveBeenCalledTimes(1);
    expect(buildRecordMock.mock.calls[0][3]).toBe("u1"); // uid joined into the record
    expect(writeRecordMock).toHaveBeenCalledTimes(1);
    expect(writeRecordMock.mock.calls[0][0]).toBe(USER);
    expect(writePerQMock).toHaveBeenCalledTimes(1);
    expect(writePerQMock.mock.calls[0][1]).toMatchObject({
      ref: "ws:WS-M-RN-01",
      surface: "worksheet",
      worksheetId: "ws-abc",
    });
  });

  it("does NOT write a session record for a local/browse session (honest-failure), but still yields a code", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    const LOCAL = { uid: "u1", isLocalSession: true } as never;
    const outcome = await gradeWorksheetAndRecord(LOCAL, WS, { imageBase64: "B", imageMimeType: "application/pdf" });
    expect(outcome.sessionCode).toBe("WS-M-RN-01"); // a code is still produced (device-local)
    expect(writeRecordMock).not.toHaveBeenCalled(); // but nothing persisted
    expect(writePerQMock).not.toHaveBeenCalled();
  });

  it("a session-record write failure never breaks grading (best-effort)", async () => {
    gradeWorksheetMock.mockResolvedValue(buildResponse());
    ensureCodeMock.mockRejectedValue(new Error("firestore down"));
    const outcome = await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });
    // Grade result + MI wiring are intact; the session block swallowed its own error.
    expect(outcome.response.ok).toBe(true);
    expect(recordMistakeMock).toHaveBeenCalledTimes(2);
    expect(outcome.sessionCode).toBeUndefined();
    expect(writeRecordMock).not.toHaveBeenCalled();
  });
});
