// @vitest-environment jsdom
//
// RESULT-LIST-BACKFILL-1 - read-time `writtenGraded` for Chapter Test / Full Mock records written before #1802,
// from the record's own stored per-question payload. Nothing is written.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("./firebaseClient", () => ({ firestoreDb: null }));

const cloud = vi.hoisted(() => ({ reads: [] as string[], docs: new Map<string, unknown>() }));
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return {
    ...actual,
    getSessionPerQuestionDocFromCloud: vi.fn(async (_uid: string, ref: string) => {
      cloud.reads.push(ref);
      return (cloud.docs.get(ref) as never) ?? null;
    }),
  };
});

import {
  __resetLegacyWrittenGradedForTests,
  deriveWrittenGraded,
  isLegacyWrittenGradedCandidate,
  MAX_CLOUD_READS,
  payloadProvesWrittenGraded,
  resultsShowGradedWritten,
  withDerivedWrittenGraded,
  withDerivedWrittenGradedLocal,
} from "./legacyWrittenGraded";
import { isGradedPaperRecord, type SessionPerQuestionPayload, type SessionRecord } from "./sessionRecords";
import { buildChapterTestResponse, type ObjectiveScore } from "./chapterTestGradeService";
import { buildFullMockResponse } from "./fullMockGradeService";
import { pendingFromSessionRecords } from "../components/home/pendingPapers";
import { pendingMockRecords } from "../components/fullmock/pendingMocks";
import { useDerivedWrittenGraded } from "../hooks/useDerivedWrittenGraded";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { WorksheetGradeResponse } from "../ai/aiClient";

const UID = "student-1";

// A real 4-question paper: Q1-Q2 Section A (scored on submit), Q3-Q4 written.
const paper = {
  worksheetId: "ws-ct-1",
  title: "Quadratic Equations",
  name: "Quadratic Equations · Test #1",
  totalMarks: 8,
  questions: [
    { qNumber: 1, id: "b1", section: "A", marks: 1, topicKey: "quadratic-equations" },
    { qNumber: 2, id: "b2", section: "A", marks: 1, topicKey: "quadratic-equations" },
    { qNumber: 3, id: "b3", section: "C", marks: 3, topicKey: "quadratic-equations" },
    { qNumber: 4, id: "b4", section: "C", marks: 3, topicKey: "quadratic-equations" },
  ],
} as unknown as PersistedWorksheet;
const objective: ObjectiveScore = {
  results: [
    { qNumber: 1, id: "b1", selected: "a", correct: true, awarded: 1, total: 1 },
    { qNumber: 2, id: "b2", selected: "c", correct: false, awarded: 0, total: 1 },
  ],
  awarded: 1,
  total: 2,
  answeredCount: 2,
  totalQuestions: 2,
} as unknown as ObjectiveScore;
const subjectiveQuestions = paper.questions.slice(2);

/** What the grader returned for the written sheet: Q3 graded, Q4 could not be read -> the paper stays partial. */
const graderReply = {
  ok: true,
  results: [
    {
      qNumber: 3,
      couldNotRead: false,
      ok: true,
      totalMarks: 3,
      marksAwarded: 2,
      percentage: 67,
      annotatedSteps: [{ description: "Discriminant", studentWork: "b^2-4ac", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "", mistakeType: null }],
      mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
      teacherNote: "Good method.",
    },
    { qNumber: 4, couldNotRead: true, totalMarks: 3, note: "Could not read this page." },
  ],
} as unknown as WorksheetGradeResponse;

const atSubmit = buildChapterTestResponse({ paper, objective, subjectiveQuestions, subjectiveResponse: null });
const afterUpload = buildChapterTestResponse({ paper, objective, subjectiveQuestions, subjectiveResponse: graderReply });

function rec(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "CT-M-QUAD-01",
    worksheetId: "ws-ct-1",
    surface: "chapter-test",
    title: "Quadratic Equations · Test #1",
    subject: "maths",
    topicKeys: ["quadratic-equations"],
    questionIds: ["b1", "b2", "b3", "b4"],
    marksAwarded: 3,
    marksTotal: 5,
    status: "partial",
    fourType: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: Date.UTC(2026, 10, 18),
    perQuestionRef: "ct:CT-M-QUAD-01",
    dedupKey: `${UID}::CT-M-QUAD-01`,
    ...over,
  };
}
function payloadFor(r: SessionRecord, response: WorksheetGradeResponse, over: Partial<SessionPerQuestionPayload> = {}): SessionPerQuestionPayload {
  return { ref: r.perQuestionRef, code: r.id, worksheetId: r.worksheetId, surface: r.surface, gradedAt: r.gradedAt, response, ...over };
}
function seedLocalPayloads(list: SessionPerQuestionPayload[]): void {
  const map: Record<string, SessionPerQuestionPayload> = {};
  for (const p of list) map[p.ref] = p;
  window.localStorage.setItem(`lazytopper.user.${UID}.sessionPerQuestion.v1`, JSON.stringify(map));
}

beforeEach(() => {
  window.localStorage.clear();
  cloud.reads = [];
  cloud.docs.clear();
  __resetLegacyWrittenGradedForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the evidence: a graded row the grader produced", () => {
  it("the on-submit objective rows (real builder) never count: an at-submit payload proves nothing", () => {
    expect(atSubmit.gradedCount).toBe(2);
    expect(resultsShowGradedWritten(atSubmit.results)).toBe(false);
  });
  it("after an upload with one written answer graded (paper still partial) it does", () => {
    expect(afterUpload.pendingCount).toBe(1);
    expect(resultsShowGradedWritten(afterUpload.results)).toBe(true);
    // Full Mock reuses the same builder (+ the section stamp): same answer.
    const fm = buildFullMockResponse({ paper, objective, subjectiveQuestions, subjectiveResponse: graderReply });
    expect(resultsShowGradedWritten(fm.results)).toBe(true);
  });
  it("a graded row with only a teacher note counts; a not-graded row with a note does not", () => {
    expect(resultsShowGradedWritten([{ qNumber: 3, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 0, annotatedSteps: [], teacherNote: "Not attempted." }] as never)).toBe(true);
    expect(resultsShowGradedWritten([{ qNumber: 3, couldNotRead: true, totalMarks: 3, teacherNote: "Could not read." }] as never)).toBe(false);
    expect(resultsShowGradedWritten(undefined)).toBe(false);
  });
  it("the payload must be the record's own: same ref, same paper, same surface", () => {
    const r = rec();
    expect(payloadProvesWrittenGraded(r, payloadFor(r, afterUpload))).toBe(true);
    expect(payloadProvesWrittenGraded(r, payloadFor(r, afterUpload, { worksheetId: "ws-other" }))).toBe(false);
    expect(payloadProvesWrittenGraded(r, payloadFor(r, afterUpload, { ref: "ct:CT-M-QUAD-02" }))).toBe(false);
    expect(payloadProvesWrittenGraded(r, payloadFor(r, afterUpload, { surface: "worksheet" }))).toBe(false);
    expect(payloadProvesWrittenGraded(r, null)).toBe(false);
  });
});

describe("withDerivedWrittenGraded (pure, in memory only)", () => {
  it("only a CT/FM partial without the field is a candidate", () => {
    expect(isLegacyWrittenGradedCandidate(rec())).toBe(true);
    expect(isLegacyWrittenGradedCandidate(rec({ surface: "full-mock", perQuestionRef: "fm:FM-M-01" }))).toBe(true);
    expect(isLegacyWrittenGradedCandidate(rec({ writtenGraded: false }))).toBe(false); // post-#1802 objective-only: its own answer stands
    expect(isLegacyWrittenGradedCandidate(rec({ status: "graded" }))).toBe(false);
    expect(isLegacyWrittenGradedCandidate(rec({ status: "pending-upload" }))).toBe(false);
    expect(isLegacyWrittenGradedCandidate(rec({ surface: "worksheet" }))).toBe(false);
  });
  it("sets writtenGraded on a COPY when proven; never mutates the stored object, never sets false", () => {
    const legacy = rec();
    const objOnly = rec({ id: "CT-M-QUAD-02", perQuestionRef: "ct:CT-M-QUAD-02", worksheetId: "ws-ct-2" });
    const payloads = new Map([
      [legacy.perQuestionRef, payloadFor(legacy, afterUpload)],
      [objOnly.perQuestionRef, payloadFor(objOnly, atSubmit)],
    ]);
    const out = withDerivedWrittenGraded([legacy, objOnly], (r) => payloads.get(r.perQuestionRef));
    expect(out[0].writtenGraded).toBe(true);
    expect(isGradedPaperRecord(out[0])).toBe(true);
    expect(legacy.writtenGraded).toBeUndefined();
    expect(out[1]).toBe(objOnly);
    expect("writtenGraded" in out[1]).toBe(false);
  });
  it("kill switch VITE_RESULT_LIST_BACKFILL_DISABLED=1 leaves every record as stored", () => {
    vi.stubEnv("VITE_RESULT_LIST_BACKFILL_DISABLED", "1");
    const legacy = rec();
    const out = withDerivedWrittenGraded([legacy], () => payloadFor(legacy, afterUpload));
    expect(out[0]).toBe(legacy);
  });
});

describe("the lists that said 'Awaiting sheet'", () => {
  it("Home: a legacy graded partial leaves the waiting list from the device's own payload (no network)", () => {
    const legacy = rec();
    seedLocalPayloads([payloadFor(legacy, afterUpload)]);
    expect(pendingFromSessionRecords([legacy]).map((p) => p.code)).toEqual(["CT-M-QUAD-01"]); // as stored: still "awaiting"
    expect(pendingFromSessionRecords(withDerivedWrittenGradedLocal(UID, [legacy]))).toEqual([]);
    expect(cloud.reads).toEqual([]);
  });
  it("Full Mock: the awaiting banner list drops it; an at-submit partial stays awaiting", () => {
    const fm = rec({ id: "FM-M-01", surface: "full-mock", perQuestionRef: "fm:FM-M-01", worksheetId: "ws-fm-1" });
    const waiting = rec({ id: "FM-M-02", surface: "full-mock", perQuestionRef: "fm:FM-M-02", worksheetId: "ws-fm-2" });
    seedLocalPayloads([payloadFor(fm, afterUpload), payloadFor(waiting, atSubmit)]);
    const listed = withDerivedWrittenGradedLocal(UID, [fm, waiting]);
    expect(pendingMockRecords(listed).map((r) => r.id)).toEqual(["FM-M-02"]);
  });
});

describe("deriveWrittenGraded (device first, then one doc read per candidate, memoised)", () => {
  it("no candidate -> no read at all", async () => {
    const out = await deriveWrittenGraded(UID, [rec({ status: "graded" }), rec({ writtenGraded: false })]);
    expect(out).toHaveLength(2);
    expect(cloud.reads).toEqual([]);
  });
  it("device payload proves it -> no cloud read", async () => {
    const legacy = rec();
    seedLocalPayloads([payloadFor(legacy, afterUpload)]);
    const out = await deriveWrittenGraded(UID, [legacy]);
    expect(out[0].writtenGraded).toBe(true);
    expect(cloud.reads).toEqual([]);
  });
  it("cloud-only payload: ONE doc read, memoised for the tab (found or not)", async () => {
    const legacy = rec();
    const missing = rec({ id: "CT-M-QUAD-03", perQuestionRef: "ct:CT-M-QUAD-03", worksheetId: "ws-ct-3" });
    cloud.docs.set(legacy.perQuestionRef, payloadFor(legacy, afterUpload));
    const first = await deriveWrittenGraded(UID, [legacy, missing]);
    expect(first[0].writtenGraded).toBe(true);
    expect(first[1].writtenGraded).toBeUndefined();
    expect(cloud.reads.sort()).toEqual(["ct:CT-M-QUAD-01", "ct:CT-M-QUAD-03"]);
    await deriveWrittenGraded(UID, [legacy, missing]);
    expect(cloud.reads).toHaveLength(2);
  });
  it("cloud reads are capped per call", async () => {
    const many = Array.from({ length: MAX_CLOUD_READS + 5 }, (_, i) =>
      rec({ id: `CT-M-QUAD-${i}`, perQuestionRef: `ct:CT-M-QUAD-${i}`, worksheetId: `ws-${i}` }),
    );
    await deriveWrittenGraded(UID, many);
    expect(cloud.reads).toHaveLength(MAX_CLOUD_READS);
  });
  it("signed out / kill switch -> as stored, no read", async () => {
    cloud.docs.set("ct:CT-M-QUAD-01", payloadFor(rec(), afterUpload));
    expect((await deriveWrittenGraded(null, [rec()]))[0].writtenGraded).toBeUndefined();
    vi.stubEnv("VITE_RESULT_LIST_BACKFILL_DISABLED", "true");
    expect((await deriveWrittenGraded(UID, [rec()]))[0].writtenGraded).toBeUndefined();
    expect(cloud.reads).toEqual([]);
  });
});

describe("useDerivedWrittenGraded (the pages' display copy)", () => {
  it("returns the input at once, then the derived copy", async () => {
    const legacy = rec();
    cloud.docs.set(legacy.perQuestionRef, payloadFor(legacy, afterUpload));
    const records = [legacy];
    const { result } = renderHook(() => useDerivedWrittenGraded(records, UID));
    expect(result.current[0]).toBe(legacy);
    await waitFor(() => expect(result.current[0].writtenGraded).toBe(true));
    expect(legacy.writtenGraded).toBeUndefined();
  });
  it("signed out -> the input, untouched", () => {
    const records = [rec()];
    const { result } = renderHook(() => useDerivedWrittenGraded(records, null));
    expect(result.current).toBe(records);
  });
});
