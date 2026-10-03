// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
// BANK-SPLIT-1 PR-2: this suite calls the bank's sync APIs directly, so it preloads every chapter.
import "../test/preloadBankChapters";

import { drawChapterTest } from "../components/chaptertest/chapterTestBlueprint";
import { drawFullMock } from "../components/fullmock/fullMockBlueprint";
import { buildPracticeQuestionsFromEngine } from "../components/practice/practiceQuestionBuilder";
import { getTopics, planWorksheet, generateFromPlan } from "../components/worksheet/worksheetModel";
import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { questionKey } from "../utils/questionKey";

/**
 * GUARD — BANK-SPLIT-1 PR-1: no set contains the same question twice.
 *
 * OWNER RULING (2026-10-03). No Practice, Chapter Test, Full Mock or worksheet set may
 * contain the same question twice. "The same question" is `questionKey`: N1(stem) plus
 * N1(option set). The same proof at 2 and 3 marks is ONE question in a set; two MCQs
 * that share a generic stem but have different options are two.
 *
 * WHY A SEEDED RUN OF THE REAL BUILDERS. The scout measured the defect with exactly this
 * method (30 / 2,600 Chapter Tests and 6 / 560 worksheets repeated a question). Each
 * builder dedupes at its own point (drawBalancedSet, the Chapter Test used-set, the
 * practice builder, the worksheet plan, the Full Mock pool), so the guard
 * drives the builders the pages call, over the real bank, and counts repeated keys in
 * what comes out. A unit test of `questionKey` alone would pass with every builder still
 * keying on the old id / 120-char prefix / stem-only text.
 *
 * CONTROL. A guard that cannot fail is not a guard. The CONTROL block feeds each builder
 * a synthetic pool holding one duplicate pair (same stem and options, different ids) and
 * runs it twice: with the real `questionKey` (0 repeats) and with the key check DISABLED
 * (the key degrades to the row id, so only the old id checks remain), where each builder
 * MUST repeat the pair. That proves the detector fires and that the key check, not luck,
 * is what keeps the real runs at 0.
 */

/** Count repeated questionKeys in one set (0 = no repeats). */
function repeatsIn(set: ReadonlyArray<Parameters<typeof questionKey>[0]>): number {
  const seen = new Set<string>();
  let repeats = 0;
  for (const q of set) {
    const key = questionKey(q);
    if (seen.has(key)) repeats += 1;
    seen.add(key);
  }
  return repeats;
}

const seedOf = (s: number): number => (s * 2654435761) >>> 0;

/** The runs are long and synchronous; hand the event loop back to vitest's worker RPC
 *  between chapters, or its heartbeat times out and the run reports an unhandled error. */
const yieldToRunner = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Every (subject, topicKey) the served bank carries — the scout's 26 chapters. */
const CHAPTERS: Array<{ subject: "Maths" | "Science"; topicKey: string }> = [
  ...new Map(
    canonicalQuestionBank.map((q) => [
      `${q.subject}|${q.topicKey}`,
      { subject: q.subject as "Maths" | "Science", topicKey: q.topicKey },
    ]),
  ).values(),
];

const totals = { sets: 0, repeats: 0 };
const tally = (label: string, sets: number, repeats: number, examples: string[]) => {
  totals.sets += sets;
  totals.repeats += repeats;
  console.info(`NO_REPEAT[${label}]: sets=${sets} repeats=${repeats}${examples.length ? ` e.g. ${examples.slice(0, 5).join("; ")}` : ""}`);
};

describe("no repeated question in a set — the real builders over the real bank", () => {
  it("PRECONDITION: the bank carries the 26 chapters the runs iterate", () => {
    expect(CHAPTERS).toHaveLength(26);
    expect(CHAPTERS.filter((c) => c.subject === "Maths").length).toBeGreaterThan(0);
    expect(CHAPTERS.filter((c) => c.subject === "Science").length).toBeGreaterThan(0);
  });

  it("Chapter Test: 26 chapters x 100 seeds, 0 repeated keys", async () => {
    let sets = 0;
    let repeats = 0;
    let questions = 0;
    const examples: string[] = [];
    for (const { subject, topicKey } of CHAPTERS) {
      await yieldToRunner();
      for (let s = 1; s <= 100; s += 1) {
        const d = drawChapterTest({ subject, topicKey, topicLabel: topicKey, worksheetId: "guard", seed: seedOf(s) });
        sets += 1;
        questions += d.paper.questions.length;
        const r = repeatsIn(d.paper.questions);
        if (r) examples.push(`${topicKey}#${s}`);
        repeats += r;
      }
    }
    tally("chapter-test", sets, repeats, examples);
    expect(sets).toBe(2600);
    expect(questions).toBeGreaterThan(2600 * 5); // not vacuous: the papers are real
    expect(repeats).toBe(0);
  }, 600_000);

  it("Full Mock: 2 subjects x 100 seeds, 0 repeated keys", async () => {
    let sets = 0;
    let repeats = 0;
    let questions = 0;
    const examples: string[] = [];
    for (const subject of ["Maths", "Science"] as const) {
      for (let s = 1; s <= 100; s += 1) {
        if (s % 10 === 0) await yieldToRunner();
        const d = drawFullMock({ subject, worksheetId: "guard", code: "FM-guard", name: "guard", seed: seedOf(s) });
        sets += 1;
        questions += d.paper.questions.length;
        const r = repeatsIn(d.paper.questions);
        if (r) examples.push(`${subject}#${s}`);
        repeats += r;
      }
    }
    tally("full-mock", sets, repeats, examples);
    expect(sets).toBe(200);
    expect(questions).toBeGreaterThan(200 * 20);
    expect(repeats).toBe(0);
  }, 600_000);

  it("Practice: 26 chapters x 50 runs, 0 repeated keys", async () => {
    const difficulties = ["All", "Easy", "Medium", "Hard"] as const;
    let sets = 0;
    let repeats = 0;
    let questions = 0;
    const examples: string[] = [];
    for (const { subject, topicKey } of CHAPTERS) {
      await yieldToRunner();
      for (let r = 0; r < 50; r += 1) {
        const qs = buildPracticeQuestionsFromEngine({
          subjectKey: subject,
          topicKey,
          count: 20,
          difficulty: difficulties[r % difficulties.length],
        });
        sets += 1;
        questions += qs.length;
        const n = repeatsIn(qs);
        if (n) examples.push(`${topicKey}#${r}`);
        repeats += n;
      }
    }
    tally("practice", sets, repeats, examples);
    expect(sets).toBe(1300);
    expect(questions).toBeGreaterThan(1300 * 5);
    expect(repeats).toBe(0);
  }, 600_000);

  it("Worksheets: 26 single-topic x 20 + 4 full-subject, 0 repeated keys", async () => {
    let sets = 0;
    let repeats = 0;
    let questions = 0;
    let singleTopics = 0;
    const examples: string[] = [];
    for (const subject of ["Maths", "Science"] as const) {
      const topics = getTopics(subject);
      singleTopics += topics.length;
      for (const t of topics) {
        await yieldToRunner();
        for (let r = 0; r < 20; r += 1) {
          const qs = generateFromPlan(planWorksheet({ subject, scope: "topic", topics: [t], requested: 15 }));
          sets += 1;
          questions += qs.length;
          const n = repeatsIn(qs);
          if (n) examples.push(`${t.key}#${r}`);
          repeats += n;
        }
      }
      for (let r = 0; r < 2; r += 1) {
        const qs = generateFromPlan(planWorksheet({ subject, scope: "full-subject", topics, requested: 30 }));
        sets += 1;
        questions += qs.length;
        const n = repeatsIn(qs);
        if (n) examples.push(`full-${subject}#${r}`);
        repeats += n;
      }
    }
    tally("worksheet", sets, repeats, examples);
    expect(singleTopics).toBe(26);
    expect(sets).toBe(26 * 20 + 4);
    expect(questions).toBeGreaterThan(26 * 20 * 5);
    expect(repeats).toBe(0);
  }, 600_000);

  it("prints the NO_REPEAT total", () => {
    console.info(`NO_REPEAT: sets=${totals.sets} repeats=${totals.repeats}`);
    expect(totals.sets).toBe(2600 + 200 + 1300 + 26 * 20 + 4);
    expect(totals.repeats).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CONTROL — a synthetic duplicate pair repeats in every builder when the key check is off
// ---------------------------------------------------------------------------

/** A synthetic bank row. `dup` rows share a stem and option set; their ids differ. */
function row(id: string, over: Record<string, unknown>) {
  return {
    id,
    subject: "Maths",
    topicKey: "triangles",
    subtopic: "Guard control",
    marks: 3,
    section: "C",
    difficulty: "Medium",
    questionText: `Control question ${id}: prove the stated result.`,
    solutionSteps: ["Step 1", "Step 2", "Step 3"],
    finalAnswer: "Proved.",
    answer: "Proved.",
    ...over,
  };
}
const DUP_STEM = "Prove that the tangents drawn from an external point to a circle are equal.";
const DUP_MCQ = { questionText: "Which of the following is the value of sin 30 degrees?", options: ["1/2", "1", "0", "√3/2"], answer: "1/2" };

const KEY_MODULE = "../utils/questionKey";

/** Fresh module graph. `disabled` → `questionKey` degrades to the row's id, so a builder
 *  is left with nothing but the id checks it had before BANK-SPLIT-1. */
async function freshGraph(disabled: boolean) {
  vi.resetModules();
  if (disabled) {
    vi.doMock(KEY_MODULE, async (importOriginal) => {
      const real = await importOriginal<typeof import("../utils/questionKey")>();
      return { ...real, questionKey: (q: { id?: unknown }) => `disabled:${String(q.id)}` };
    });
  } else {
    vi.doUnmock(KEY_MODULE);
  }
}

afterEach(() => {
  vi.doUnmock(KEY_MODULE);
  vi.doUnmock("../data/bankQuery");
  vi.doUnmock("../data/canonicalQuestionBank");
  vi.doUnmock("../data/bankChapters/loader");
  vi.doUnmock("../data/predictedQuestions");
  vi.doUnmock("../data/predictedQuestionsScience");
  vi.doUnmock("../data/predictionCore");
  vi.resetModules();
});

describe("CONTROL — the key check is what prevents the repeat", () => {
  it("the detector fires on a set that holds the same question twice", () => {
    expect(repeatsIn([row("a", { questionText: DUP_STEM }), row("b", { questionText: DUP_STEM, marks: 5 })])).toBe(1);
    expect(repeatsIn([row("a", DUP_MCQ), row("b", { ...DUP_MCQ, options: ["1", "1/2", "√3/2", "0"] })])).toBe(1);
    // Different options under one stem are different questions.
    expect(repeatsIn([row("a", DUP_MCQ), row("b", { ...DUP_MCQ, options: ["2", "3", "4", "5"] })])).toBe(0);
  });

  for (const disabled of [false, true]) {
    const expectRepeat = (n: number) => (disabled ? expect(n).toBeGreaterThan(0) : expect(n).toBe(0));
    const mode = disabled ? "check DISABLED → repeats" : "check on → 0 repeats";

    it(`drawBalancedSet (${mode})`, async () => {
      await freshGraph(disabled);
      const { drawBalancedSet } = await import("../utils/balancedMockDraw");
      const pool = [row("d1", DUP_MCQ), row("d2", DUP_MCQ), row("x1", {}), row("x2", {})];
      const r = drawBalancedSet({ pool, count: 4, seed: 7 });
      expect(r.drawn.length).toBe(disabled ? 4 : 3);
      expectRepeat(repeatsIn(r.drawn));
    });

    it(`Chapter Test (${mode})`, async () => {
      await freshGraph(disabled);
      const synthetic = [
        row("ct-c", { questionText: DUP_STEM, marks: 3 }), // Section C
        row("ct-d", { questionText: DUP_STEM, marks: 5, section: "D" }), // Section D — the same proof
        row("ct-b1", { marks: 2, section: "B" }),
        row("ct-b2", { marks: 2, section: "B" }),
      ];
      vi.doMock("../data/bankQuery", async (importOriginal) => ({
        ...(await importOriginal<typeof import("../data/bankQuery")>()),
        selectBankQuestions: () => synthetic,
      }));
      const ct = await import("../components/chaptertest/chapterTestBlueprint");
      const d = ct.drawChapterTest({ subject: "Maths", topicKey: "triangles", topicLabel: "Triangles", worksheetId: "c", seed: 11 });
      expectRepeat(repeatsIn(d.paper.questions));
    });

    it(`Full Mock (${mode})`, async () => {
      await freshGraph(disabled);
      const synthetic = [
        row("fm-1", { questionText: DUP_STEM, marks: 3 }),
        row("fm-2", { questionText: DUP_STEM, marks: 3 }),
      ];
      // BANK-SPLIT-1 PR-2: buildUnionPool reads the subject's rows from the per-chapter
      // loader (no longer canonicalQuestionBank), so the synthetic pool is served there.
      vi.doMock("../data/bankChapters/loader", async (importOriginal) => ({
        ...(await importOriginal<typeof import("../data/bankChapters/loader")>()),
        getBankRowsForSubject: () => synthetic,
        isAiGeneratedBankId: () => false,
      }));
      vi.doMock("../data/predictedQuestions", async (importOriginal) => ({
        ...(await importOriginal<typeof import("../data/predictedQuestions")>()),
        predictedQuestions: [],
      }));
      vi.doMock("../data/predictedQuestionsScience", async (importOriginal) => ({
        ...(await importOriginal<typeof import("../data/predictedQuestionsScience")>()),
        sciencePredictedQuestions: [],
      }));
      const fm = await import("../components/fullmock/fullMockBlueprint");
      const d = fm.drawFullMock({ subject: "Maths", worksheetId: "c", code: "FM-c", name: "c", seed: 13 });
      expect(d.paper.questions.length).toBe(disabled ? 2 : 1);
      expectRepeat(repeatsIn(d.paper.questions));
    });

    it(`Practice (${mode})`, async () => {
      await freshGraph(disabled);
      const synthetic = [
        row("pr-1", { ...DUP_MCQ, marks: 1, section: "A", difficulty: "Easy" }),
        // Same question, extra inner space: the practice generator's legacy 120-char prefix
        // key (practiceSetGenerator.ts, frozen by the QP-overlay ops gate) does NOT catch it,
        // so only the builder's questionKey check stands between it and a repeat.
        row("pr-2", { ...DUP_MCQ, questionText: DUP_MCQ.questionText.replace("value of", "value  of"), marks: 1, section: "A", difficulty: "Easy" }),
        row("pr-3", { difficulty: "Medium" }),
        row("pr-4", { difficulty: "Hard" }),
      ];
      vi.doMock("../data/predictionCore", async (importOriginal) => {
        const real = await importOriginal<typeof import("../data/predictionCore")>();
        return { ...real, PredictionCore: { ...real.PredictionCore, getLikelyQuestionsForConcept: () => synthetic } };
      });
      const pb = await import("../components/practice/practiceQuestionBuilder");
      const qs = pb.buildPracticeQuestionsFromEngine({ subjectKey: "Maths", topicKey: "triangles", count: 10, difficulty: "All" });
      expectRepeat(repeatsIn(qs));
    });

    it(`Worksheets (${mode})`, async () => {
      await freshGraph(disabled);
      const wm = await import("../components/worksheet/worksheetModel");
      const pool = [row("ws-1", DUP_MCQ), row("ws-2", DUP_MCQ), row("ws-3", {}), row("ws-4", {})];
      const plan = {
        rows: [{ key: "triangles", label: "Triangles", weight: 1, available: 4, allocated: 4 }],
        requested: 4,
        totalAvailable: 4,
        totalAllocated: 4,
        pools: new Map([["triangles", pool]]),
      } as unknown as Parameters<typeof wm.generateFromPlan>[0];
      const qs = wm.generateFromPlan(plan);
      expect(qs.length).toBe(disabled ? 4 : 3);
      expectRepeat(repeatsIn(qs));
    });
  }
});
