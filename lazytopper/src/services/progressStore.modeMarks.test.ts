// @vitest-environment jsdom
/**
 * MI-MODE-MARKS-1 — marks lost split by answer MODE, derived at READ time (records only; no write
 * and no grading changes). The subject rung and the subject totals gain an additive optional
 * `marksWrongObjective`: of the marks lost, those lost to a WRONG objective pick recorded
 * attempt-only (DECISION-MCQ-WRONG, #237) — a Quick Practice MCQ click, or a Chapter Test / Full
 * Mock Section-A pick scored on submit. It explains PART of the remainder Me calls "no reason
 * recorded"; the headline, the split and every consumer are unchanged
 * (miConsumers.characterization.test.tsx).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { MI_FIXTURE_NOW, MI_FIXTURE_UID, bankIds, miFixtureStudent, type MiFixtureStreams } from "../test/miFixture";

const H = vi.hoisted(() => ({ s: null as unknown as MiFixtureStreams }));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.s.attempts.filter((a) => start === undefined || a.timestamp >= start).map((a) => ({ ...a })),
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => H.s.records.map((r) => ({ ...r })),
  getAllSessionPerQuestionFromCloud: async () => H.s.payloads.map((p) => ({ ...p })),
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.s.mistakes.filter((e) => Date.parse(e.timestamp) >= startMs).map((e) => ({ ...e })),
    complete: true,
  }),
}));

import { buildMistakeView, readStudyModel, subjectRungOf, type ReadSubject, type StudyReadModel } from "./progressReadModel";
import { splitPaperMarks } from "./meSplit";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";

const HOUR = 60 * 60 * 1000;
const read = (subject?: ReadSubject): Promise<StudyReadModel> =>
  readStudyModel(MI_FIXTURE_UID, { window: "month", tutor: false, ...(subject ? { subject } : {}) });

function paperOf(model: StudyReadModel, paper: ReadSubject) {
  const rung = subjectRungOf(model.progress, paper);
  const entries = buildMistakeView(model.mistakes.entries, { ...model.range, subject: paper }, true).entries;
  return { rung, split: splitPaperMarks(rung, entries), total: model.progress.subjectTotals[paper] };
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MI_FIXTURE_NOW);
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  H.s = miFixtureStudent();
});

describe("the owner's probe, as a test: 21 lost = 16 typed + 5 wrong MCQ picks", () => {
  it("★ 8 written answers lose 2 conceptual marks each; 5 MCQ picks are wrong → the 5 is named", async () => {
    const at = (h: number) => MI_FIXTURE_NOW - h * HOUR;
    const ids = bankIds("real-numbers", 13);
    const graded = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => ({
      id: `g${i}`, questionId: ids[i], timestamp: at(h), subject: "maths", topicKey: "real-numbers", topicName: "Real Numbers",
      difficulty: "Medium", correct: false, marksScored: 1, marksAvailable: 3, mode: "graded",
    }) as PracticeAttempt);
    const mcq = [1, 2, 3, 40, 90].map((h, i) => ({
      id: `m${i}`, questionId: ids[8 + i], timestamp: at(h), subject: "maths", topicKey: "real-numbers", topicName: "Real Numbers",
      difficulty: "Medium", correct: false, marksScored: 0, marksAvailable: 1, mode: "mcq",
    }) as PracticeAttempt);
    const entries = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => ({
      id: `e${i}`, timestamp: new Date(at(h)).toISOString(), topic: "Real Numbers", subject: "Maths", marksLost: 2, totalMarks: 3,
      questionText: "q", questionId: ids[i], mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, stepDetails: [],
      marksLostByType: { conceptual: 2, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 }, marksLostByTypeVersion: 1,
    }) as unknown as MistakeLogEntry);
    H.s = { attempts: [...graded, ...mcq], mistakes: entries, records: [], payloads: [] };
    const { rung, split, total } = paperOf(await read(), "maths");
    expect(split).toMatchObject({ lost: 21, knowledge: 16, unclassified: 5, splitKnown: true });
    expect(rung?.marksWrongObjective).toBe(5);
    expect(total?.marksWrongObjective).toBe(5);
    expect(total?.marksLost).toBe(21);
  });
});

describe("the fixture mix — MCQ clicks, Section-A picks, a legacy attempt with no mode, blanks", () => {
  it("★ Maths: the 5 wrong clicks only — right clicks, the legacy no-mode attempt and blanks are never counted", async () => {
    const { rung, split, total } = paperOf(await read(), "maths");
    expect(rung?.marksWrongObjective).toBe(5);
    expect(total?.marksWrongObjective).toBe(5);
    // The headline and Me's split are exactly what they were (pinned in the characterization suite).
    expect(split).toMatchObject({ lost: 25, notAttempted: 3, unclassified: 8 });
  });

  it("★ Science: 2 wrong clicks + 2 wrong Section-A picks scored on submit; the blank pick stays 'not attempted'", async () => {
    const { rung, split, total } = paperOf(await read(), "science");
    expect(rung?.marksWrongObjective).toBe(4);
    expect(total?.marksWrongObjective).toBe(4);
    expect(split).toMatchObject({ lost: 13, notAttempted: 1, unclassified: 4 });
  });

  it("★ it only ever EXPLAINS part of the remainder — never more than Me's 'no reason recorded'", async () => {
    const model = await read();
    for (const p of ["maths", "science"] as const) {
      const { rung, split } = paperOf(model, p);
      expect(rung?.marksWrongObjective ?? 0).toBeLessThanOrEqual(split!.unclassified);
    }
  });

  it("CONTROL — a legacy attempt with no mode is unknown: removing every mode-less attempt changes nothing", async () => {
    const before = paperOf(await read(), "maths").rung?.marksWrongObjective;
    H.s.attempts = H.s.attempts.filter((a) => a.mode !== undefined);
    expect(paperOf(await read(), "maths").rung?.marksWrongObjective).toBe(before);
  });

  it("CONTROL — no wrong pick at all → the field is ABSENT (additive: no 0 written onto any rung or total)", async () => {
    H.s.attempts = H.s.attempts.filter((a) => a.mode !== "mcq");
    H.s.records = [];
    const model = await read();
    for (const p of ["maths", "science"] as const) {
      expect(subjectRungOf(model.progress, p)).not.toHaveProperty("marksWrongObjective");
      expect(model.progress.subjectTotals[p]).not.toHaveProperty("marksWrongObjective");
    }
    expect(model.progress.topics.some((t) => "marksWrongObjective" in t)).toBe(false);
  });
});

describe("Maths / Science separation — the stored subject key decides, never guessed", () => {
  it("★ a Science-only wrong pick never shows under Maths (unscoped read and a Maths-scoped read)", async () => {
    H.s.attempts = H.s.attempts.filter((a) => !(a.subject === "maths" && a.mode === "mcq"));
    const all = await read();
    expect(subjectRungOf(all.progress, "maths")).not.toHaveProperty("marksWrongObjective");
    expect(subjectRungOf(all.progress, "science")?.marksWrongObjective).toBe(4);
    const maths = await read("maths");
    expect(maths.progress.subjectTotals.maths).not.toHaveProperty("marksWrongObjective");
    expect(maths.progress.subjectTotals.science).toBeUndefined();
  });
});

describe("the Section-A rule is conservative — a row that is not provably a pick stays in the remainder", () => {
  it("a row with annotated steps, a non-Section-A question, or a worksheet record is never counted", async () => {
    const payload = H.s.payloads[0] as unknown as { response: { results: Array<Record<string, unknown>> } };
    // Row 1 gains a step (the grader wrote it → not a submit-scored pick).
    payload.response.results[0] = { ...payload.response.results[0], annotatedSteps: [{ stepNumber: 1, status: "wrong", mistakeType: "", marksDeducted: 1 }] };
    // Row 2 points at a Section-B question.
    const rec = H.s.records[0] as unknown as { questionIds: string[] };
    rec.questionIds = [...rec.questionIds];
    rec.questionIds[1] = bankIds("chemical-reactions-and-equations", 1, "B")[0];
    expect(paperOf(await read(), "science").rung?.marksWrongObjective).toBe(2); // the 2 MCQ clicks only
    // The same rows on a WORKSHEET record (all of whose questions go to the grader) → never a pick.
    H.s = miFixtureStudent();
    (H.s.records[0] as unknown as { surface: string }).surface = "worksheet";
    (H.s.payloads[0] as unknown as { surface: string }).surface = "worksheet";
    expect(paperOf(await read(), "science").rung?.marksWrongObjective).toBe(2);
  });
});
