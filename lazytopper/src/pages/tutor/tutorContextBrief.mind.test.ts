/**
 * TUTOR-MIND-1 (B1-B5) — the richer brief, from a FIXTURE read model through the pure builder
 * (`briefFromModel`), so every figure here is one the model already derives for Me / the Topic Hub.
 * Pins: concept depth (all worked concepts, attempts, direction, untouched names), the Topic Hub's
 * before->now, recent mistakes with OUR bank stem, the subject view, the activity counts, the weakness
 * gate (below it nothing names a weakness), and the size cap. No cloud, no clock.
 */
import { describe, it, expect } from "vitest";
import { BRIEF_BYTE_BUDGET, briefFromModel, fitBriefSize } from "./tutorContextBrief";
import type { StudyReadModel } from "../../services/progressReadModel";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

const rung = (key: string, label: string, o: Record<string, unknown> = {}) => ({
  key, label, before: 40, now: 40, delta: 0, sampleBefore: 3, sampleNow: 3, spanDays: 20,
  marksAvailable: 10, marksScored: 10, ...o,
});
const entry = (id: string, questionId: string, marksLost: number, agoDays: number): MistakeLogEntry => ({
  id: `quick-practice::S::${id}`,
  timestamp: new Date(Date.UTC(2026, 9, 6, 6, 0) - agoDays * 86400000).toISOString(),
  questionText: "student-visible text that must never be copied",
  topic: "Real Numbers",
  subject: "maths",
  totalMarks: 3,
  marksLost,
  questionId,
  mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: marksLost }],
});

const zeroGroups = { knowledge: 0, technique: 0, careless: 0, notAttempted: 0, untyped: 0, v2Entries: 0, legacyEntries: 0 };
function subjectModel(o: { gated?: boolean } = {}): StudyReadModel {
  const gated = o.gated !== false;
  return {
    window: "month",
    subject: "maths",
    topicKey: null,
    range: { start: 0, end: 1 },
    progress: {
      subjects: [rung("Maths", "Maths", gated ? { marksAvailable: 100, marksScored: 70 } : { marksAvailable: 0, marksScored: 0 })],
      topics: [
        rung("real-numbers", "Real Numbers", { marksAvailable: 20, marksScored: 12 }), // lost 8
        rung("trigonometry", "Trigonometry", { marksAvailable: 20, marksScored: 15, before: 30, now: 60, delta: 30 }), // lost 5, improved
        rung("polynomials", "Polynomials", { marksAvailable: 10, marksScored: 9 }), // lost 1
        rung("probability", "Probability", { marksAvailable: 10, marksScored: 6, before: 80, now: 40, delta: -40 }), // lost 4
        rung("statistics", "Statistics", { marksAvailable: 10, marksScored: 10, sampleBefore: 0 }), // lost 0
      ],
      concepts: [],
      totals: { marksLost: 30 },
    },
    mistakes: {
      entries: [],
      marksLost: 0,
      byGroup: zeroGroups,
      legacyCount: 0,
      byChapter: {
        "real-numbers": [
          entry("a", "bank-1", 2, 1),
          entry("b", "ws:SHEET:q3", 1, 2),
          entry("c", "bank-2", 1, 3),
          entry("d", "bank-3", 1, 4),
          entry("e", "bank-4", 1, 5),
          entry("f", "bank-5", 1, 6),
        ],
      },
      wonBack: { count: 0, marks: 0 },
      byConcept: {},
      complete: true,
    },
    activity: { practice: 41, answersChecked: 30, tests: { worksheets: 1, chapterTests: 1, fullMocks: 0, total: 2 }, checks: 3, tutor: { doubts: 0, sessions: 0, complete: true } },
  } as unknown as StudyReadModel;
}

const concept = (label: string, o: Record<string, unknown> = {}) => rung(`c:${label}`, label, { examConcept: true, ...o });
function chapterModel(): StudyReadModel {
  return {
    progress: {
      concepts: [
        concept("Euclid's division lemma", { marksAvailable: 6, marksScored: 2, sampleBefore: 2, sampleNow: 2, delta: -30 }), // lost 4, worsening
        concept("Irrational numbers", { marksAvailable: 4, marksScored: 3, sampleBefore: 1, sampleNow: 3, delta: 25 }), // lost 1, improving
        concept("HCF and LCM", { marksAvailable: 5, marksScored: 5, sampleBefore: 0, sampleNow: 2, delta: 0 }), // lost 0, practised, no direction
      ],
    },
  } as unknown as StudyReadModel;
}
const EXAM = ["Euclid's division lemma", "Irrational numbers", "HCF and LCM", "Fundamental Theorem of Arithmetic", "Decimal expansions"];
const STEMS = new Map([
  ["bank-1", "  Find the HCF   of 96 and 404 using Euclid's lemma.  "],
  ["bank-2", "x".repeat(900)],
]);
const PROGRESS = { beforePct: 41.5, nowPct: 66, gradedAnswers: 14, window: "last 120 days" };

describe("TUTOR-MIND-1 · the richer brief", () => {
  const brief = briefFromModel(subjectModel(), "real-numbers", chapterModel(), {
    progress: PROGRESS,
    examConcepts: EXAM,
    questionTextById: STEMS,
  });

  it("B1 — every worked concept (not 3) with attempts and direction; untouched are names only", () => {
    expect(brief.chapter?.concepts).toEqual([
      { name: "Euclid's division lemma", marksLost: 4, attempts: 4, trend: "worsening" },
      { name: "Irrational numbers", marksLost: 1, attempts: 4, trend: "improving" },
      { name: "HCF and LCM", marksLost: 0, attempts: 2 }, // one half empty -> no direction invented
    ]);
    expect(brief.chapter?.untouched).toEqual(["Fundamental Theorem of Arithmetic", "Decimal expansions"]);
    // no per-concept percentage and no lastSeen (no existing derivation)
    expect(JSON.stringify(brief.chapter?.concepts)).not.toMatch(/pct|percent|lastSeen/i);
  });

  it("B2 — the Topic Hub's figure rides as given, with its own window; absent when the hub shows none", () => {
    expect(brief.chapter?.progress).toEqual(PROGRESS);
    const none = briefFromModel(subjectModel(), "real-numbers", chapterModel(), { examConcepts: EXAM });
    expect(none.chapter?.progress).toBeUndefined();
  });

  it("B3 — up to 5 newest mistakes; OUR bank stem (trimmed) for a bank id, none for a paper's synthetic id", () => {
    const r = brief.chapter!.recent!;
    expect(r).toHaveLength(5);
    expect(r[0]).toMatchObject({ id: "bank-1", marksLost: 2, question: "Find the HCF of 96 and 404 using Euclid's lemma." });
    expect(r[1].id).toBe("Q3");
    expect(r[1].question).toBeUndefined(); // ws: id never resolves to a stem
    expect(r[2].question).toHaveLength(300);
    expect(JSON.stringify(r)).not.toContain("student-visible text");
    // honest about what is not recorded: no pick and no verdict are invented
    for (const row of r) {
      expect(row.pick).toBeUndefined();
      expect(row.correct).toBeUndefined();
    }
  });

  it("B4 — top 3 chapters by marks lost + the most-improved chapter, from the chapter rungs", () => {
    expect(brief.subject?.chapters).toEqual([
      { name: "Real Numbers", marksLost: 8 },
      { name: "Trigonometry", marksLost: 5 },
      { name: "Probability", marksLost: 4 },
    ]);
    expect(brief.subject?.improved).toEqual({ name: "Trigonometry", beforePct: 30, nowPct: 60 });
    expect(brief.subject?.marksLost).toBe(30);
  });

  it("B5 — the counts Me shows; no session or last-active figure is invented", () => {
    expect(brief.activity).toEqual({ questionsAnswered: 41, testsTaken: 2, checksDone: 3 });
    expect(JSON.stringify(brief)).not.toMatch(/sessionsThisWeek|lastActive/);
  });

  it("the gate holds: below Me's weakness gate nothing names a weakness (no concepts, untouched, recent, chapters); the Topic Hub figure may still ride", () => {
    const thin = briefFromModel(subjectModel({ gated: false }), "real-numbers", chapterModel(), {
      progress: PROGRESS,
      examConcepts: EXAM,
      questionTextById: STEMS,
    });
    expect(thin.chapter?.concepts).toBeUndefined();
    expect(thin.chapter?.untouched).toBeUndefined();
    expect(thin.chapter?.recent).toBeUndefined();
    expect(thin.subject).toBeUndefined();
    expect(thin.topic.weakConcepts).toBeUndefined();
    expect(thin.chapter?.progress).toEqual(PROGRESS);
  });

  it("a hasData:false brief carries no activity", () => {
    const m = subjectModel({ gated: false });
    m.progress.topics = [];
    const empty = briefFromModel(m, "", null, {});
    expect(empty.hasData).toBe(false);
    expect(empty.activity).toBeUndefined();
  });
});

describe("TUTOR-MIND-1 · payload size", () => {
  it("★ the full fixture brief stays under the byte budget (target < 6 KB)", () => {
    const b = briefFromModel(subjectModel(), "real-numbers", chapterModel(), { progress: PROGRESS, examConcepts: EXAM, questionTextById: STEMS });
    expect(JSON.stringify(fitBriefSize(b)).length).toBeLessThan(BRIEF_BYTE_BUDGET);
  });

  it("★ a worst-case brief (12 long concepts, 5 x 300-char stems, long untouched list) is already under the budget", () => {
    const longStem = new Map<string, string>();
    for (let i = 1; i <= 5; i += 1) longStem.set(`bank-${i}`, "y".repeat(300));
    const big = chapterModel();
    big.progress.concepts = Array.from({ length: 12 }, (_, i) =>
      concept(`Concept number ${i + 1} with a rather long descriptive label to eat bytes`, { marksAvailable: 6, marksScored: 2, sampleBefore: 2, sampleNow: 2 }),
    ) as never;
    const exam = Array.from({ length: 30 }, (_, i) => `Untouched concept ${i + 1} also with a fairly long name to add weight`);
    const b = briefFromModel(subjectModel(), "real-numbers", big, { progress: PROGRESS, examConcepts: exam, questionTextById: longStem });
    expect(b.chapter?.concepts).toHaveLength(12); // the caps are the first line of defence
    expect(b.chapter?.untouched).toHaveLength(12);
    expect(JSON.stringify(b).length).toBeLessThan(BRIEF_BYTE_BUDGET);
  });

  it("★ the trimmer sheds stems, then list tails, never a figure (exercised with a tight budget)", () => {
    const longStem = new Map<string, string>();
    for (let i = 1; i <= 5; i += 1) longStem.set(`bank-${i}`, "y".repeat(300));
    const make = () => briefFromModel(subjectModel(), "real-numbers", chapterModel(), { progress: PROGRESS, examConcepts: EXAM, questionTextById: longStem });
    const full = JSON.stringify(make()).length;
    const budget = full - 400;
    const fitted = fitBriefSize(make(), budget);
    expect(JSON.stringify(fitted).length).toBeLessThanOrEqual(budget);
    expect(fitted.chapter?.marksLost).toBe(8);
    expect(fitted.chapter?.progress).toEqual(PROGRESS);
    expect(fitted.subject?.chapters).toHaveLength(3);
    expect(fitted.chapter?.concepts).toHaveLength(3);
  });
});
