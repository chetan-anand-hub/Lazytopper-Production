import { describe, it, expect, vi, beforeEach } from "vitest";

// MI-CONCEPT-1 — the WIRING half for the grade paths.
//
// The front-door suite proves what `recordMistake` persists. This proves the thing
// only a call site can prove: that the worksheet loop resolves the concept from the
// PERSISTED BANK ID (`PersistedWorksheetQuestion.id`) and not from the synthetic
// `ws:` attempt id it passes as `questionId` — which cannot resolve.
//
// full-mock and chapter-test carry the identical one-line wiring against the same
// `PersistedWorksheetQuestion[]` shape.

const gradeWorksheetMock = vi.fn();
const recordMistakeMock = vi.fn();

vi.mock("../ai/aiClient", () => ({ gradeWorksheet: (...a: unknown[]) => gradeWorksheetMock(...a) }));
vi.mock("./mistakeIntelligence", () => ({
  recordMistake: (...a: unknown[]) => recordMistakeMock(...a),
}));
vi.mock("./practiceInsights", () => ({ recordAttempt: vi.fn() }));
vi.mock("./worksheetSessionStore", () => ({
  saveWorksheetGrade: vi.fn(),
  getWorksheetGrade: () => null,
  listStoredWorksheetsLite: () => [],
}));
vi.mock("./sessionRecords", () => ({
  ensureWorksheetSessionCode: vi.fn(async () => ({ code: "WS-M-RN-01", name: "Worksheet 1" })),
  writeSessionRecord: vi.fn(),
  writeSessionPerQuestion: vi.fn(),
  buildWorksheetSessionRecord: vi.fn(() => ({ id: "WS-M-RN-01" })),
}));

import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { isChapterEchoSubtopic } from "./progressBankIndex";
import { gradeWorksheetAndRecord } from "./worksheetGradeService";
import type { PersistedWorksheet } from "./worksheetSessionStore";

const USER = { uid: "u1", isLocalSession: false } as never;

/** A REAL bank question — the point of the test is that its id resolves. */
const REAL = canonicalQuestionBank.find(
  (q) => q && typeof q.id === "string" && q.id && q.subtopic && !isChapterEchoSubtopic(q.subtopic),
)!;

const WS: PersistedWorksheet = {
  worksheetId: "ws-abc",
  createdAt: "2026-08-08T00:00:00.000Z",
  title: "Concept wiring",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 6,
  questions: [
    // q1 carries a REAL bank id; q2 carries an id that is not in the bank.
    { qNumber: 1, id: String(REAL?.id), subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Q one text" },
    { qNumber: 2, id: "not-a-bank-id-4b19", subject: "Maths", topicKey: "polynomials", topicLabel: "Polynomials", section: "C", marks: 3, questionText: "Q two text" },
  ],
};

function wrong(qNumber: number) {
  return {
    qNumber,
    couldNotRead: false,
    ok: true,
    totalMarks: 3,
    marksAwarded: 1,
    percentage: 33,
    annotatedSteps: [
      { stepNumber: 1, description: "Method", studentWork: "x", status: "incorrect", marksAwarded: 0, marksDeducted: 2, teacherAnnotation: "Wrong", mistakeType: "conceptual", correctedWorking: "…" },
    ],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "Review.",
  };
}

beforeEach(() => {
  recordMistakeMock.mockReset();
  recordMistakeMock.mockResolvedValue({ outcome: "logged", bridged: true });
  gradeWorksheetMock.mockReset();
  gradeWorksheetMock.mockResolvedValue({
    ok: true,
    worksheetId: "ws-abc",
    totalQuestions: 2,
    gradedCount: 2,
    pendingCount: 0,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 6,
    worksheetTotalMarks: 6,
    summary: "…",
    results: [wrong(1), wrong(2)],
  });
});

describe("worksheetGradeService — concept comes from the BANK id, not the attempt id", () => {
  it("the real bank fixture resolved (not an empty-bank no-op)", () => {
    expect(REAL).toBeDefined();
    expect(String(REAL.subtopic).length).toBeGreaterThan(0);
  });

  it("★ a worksheet question with a real bank id gets its concept, verbatim", async () => {
    await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });

    expect(recordMistakeMock).toHaveBeenCalledTimes(2);
    const q1 = recordMistakeMock.mock.calls.find((c) => c[2].questionId === "ws:ws-abc:q1")!;
    expect(q1).toBeDefined();
    // The id it PASSES is synthetic — proving the concept did NOT come from it.
    expect(q1[2].questionId).toBe("ws:ws-abc:q1");
    expect(q1[2].concept).toBe(REAL.subtopic);
  });

  it("★ CONTROL — a worksheet question whose id is not in the bank gets NO concept", async () => {
    await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });

    const q2 = recordMistakeMock.mock.calls.find((c) => c[2].questionId === "ws:ws-abc:q2")!;
    expect(q2).toBeDefined();
    expect(q2[2].concept).toBeUndefined();
    // …and it is still routed to MI — the mistake is not dropped for want of a concept.
    expect(q2[2].topic).toBe("Polynomials");
  });

  it("the existing contract is unchanged — same ids, same topics", async () => {
    await gradeWorksheetAndRecord(USER, WS, { imageBase64: "B", imageMimeType: "application/pdf" });
    expect(recordMistakeMock.mock.calls.map((c) => c[2].questionId)).toEqual([
      "ws:ws-abc:q1",
      "ws:ws-abc:q2",
    ]);
  });
});
