/**
 * TUTOR-MEM-1 - the brief remembers (a) the option the student picked on a past wrong objective answer and
 * (b) when each concept was last seen. Both come from stored data only; absent data -> the field is absent.
 */
import { describe, it, expect } from "vitest";
import { BRIEF_BYTE_BUDGET, briefFromModel, fitBriefSize } from "./tutorContextBrief";
import type { StudyReadModel } from "../../services/progressReadModel";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

const rung = (key: string, label: string, o: Record<string, unknown> = {}) => ({
  key, label, before: 40, now: 40, delta: 0, sampleBefore: 3, sampleNow: 3, spanDays: 20, marksAvailable: 10, marksScored: 10, ...o,
});
const entry = (id: string, questionId: string, extra: Partial<MistakeLogEntry> = {}): MistakeLogEntry => ({
  id: `quick-practice::S::${id}`,
  timestamp: "2026-10-30T06:00:00.000Z",
  questionText: "student text", topic: "Real Numbers", subject: "maths", totalMarks: 1, marksLost: 1, questionId,
  mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  stepDetails: [],
  ...extra,
});
const zero = { knowledge: 0, technique: 0, careless: 0, notAttempted: 0, untyped: 0, v2Entries: 0, legacyEntries: 0 };
const subject = (entries: MistakeLogEntry[]): StudyReadModel => ({
  window: "month", subject: "maths", topicKey: null, range: { start: 0, end: 1 },
  progress: {
    subjects: [rung("Maths", "Maths", { marksAvailable: 100, marksScored: 70 })],
    topics: [rung("real-numbers", "Real Numbers", { marksAvailable: 20, marksScored: 12 })],
    concepts: [], totals: { marksLost: 8 },
  },
  mistakes: { entries: [], marksLost: 0, byGroup: zero, legacyCount: 0, byChapter: { "real-numbers": entries }, wonBack: { count: 0, marks: 0 }, byConcept: {}, complete: true },
  activity: { practice: 1, answersChecked: 1, tests: { worksheets: 0, chapterTests: 0, fullMocks: 0, total: 0 }, checks: 0, tutor: { doubts: 0, sessions: 0, complete: true } },
}) as unknown as StudyReadModel;
const T_LEMMA = Date.UTC(2026, 9, 27, 20, 0); // 28 Oct 01:30 IST
const chapter = (lastTs?: Record<string, number>): StudyReadModel => ({
  progress: {
    concepts: [rung("real-numbers|Euclid's division lemma", "Euclid's division lemma", { marksAvailable: 14, marksScored: 10, sampleBefore: 3, sampleNow: 4, delta: -30, examConcept: true })],
    conceptEvidence: {
      bankIdBySessionQid: {}, fullyCorrect: {},
      gradedCount: { "real-numbers|Euclid's division lemma": 7, "real-numbers|HCF and LCM": 2 },
      gradedLost: {},
      ...(lastTs ? { lastTs } : {}),
    },
  },
}) as unknown as StudyReadModel;
const EXAM = ["Euclid's division lemma", "HCF and LCM"];

describe("TUTOR-MEM-1 - pick history", () => {
  it("a recent mistake with a stored wrong tap carries pick + correct:false; one without carries neither", () => {
    const b = briefFromModel(
      subject([
        entry("a", "bank-1", { pickedOption: "(b) 7", keyOption: "(c) 9" }),
        entry("b", "bank-2"),
        entry("c", "bank-3", { pickedOption: "(a) 3" }),
      ]),
      "real-numbers", chapter(), {},
    );
    const r = b.chapter!.recent!;
    expect(r[0]).toMatchObject({ id: "bank-1", pick: "(b) 7; key (c) 9", correct: false });
    expect("pick" in r[1]).toBe(false);
    expect("correct" in r[1]).toBe(false);
    expect(r[2]).toMatchObject({ pick: "(a) 3", correct: false });
  });
  it("the brief stays inside its byte budget with five picks", () => {
    const five = ["a", "b", "c", "d", "e"].map((x) =>
      entry(x, `bank-${x}`, { pickedOption: `(b) ${"x".repeat(40)}`, keyOption: `(c) ${"y".repeat(40)}` }));
    const b = fitBriefSize(briefFromModel(subject(five), "real-numbers", chapter(), { examConcepts: EXAM }));
    expect(new TextEncoder().encode(JSON.stringify(b)).length).toBeLessThanOrEqual(BRIEF_BYTE_BUDGET);
  });
});

describe("TUTOR-MEM-1 - concept lastSeen", () => {
  it("a concept with a stored newest-graded time carries its IST date; one without carries none", () => {
    const b = briefFromModel(subject([entry("a", "bank-1")]), "real-numbers", chapter({ "real-numbers|Euclid's division lemma": T_LEMMA }), { examConcepts: EXAM });
    const byName = Object.fromEntries(b.chapter!.concepts!.map((c) => [c.name, c]));
    expect(byName["Euclid's division lemma"].lastSeen).toBe("2026-10-28");
    expect("lastSeen" in byName["HCF and LCM"]).toBe(false);
  });
  it("no evidence timestamps at all (an older read) -> no lastSeen anywhere", () => {
    const b = briefFromModel(subject([entry("a", "bank-1")]), "real-numbers", chapter(), { examConcepts: EXAM });
    expect(JSON.stringify(b.chapter!.concepts)).not.toContain("lastSeen");
  });
  it("a junk timestamp is never turned into a date", () => {
    const b = briefFromModel(subject([entry("a", "bank-1")]), "real-numbers", chapter({ "real-numbers|Euclid's division lemma": 0, "real-numbers|HCF and LCM": Number.NaN }), { examConcepts: EXAM });
    expect(JSON.stringify(b.chapter!.concepts)).not.toContain("lastSeen");
  });
});
