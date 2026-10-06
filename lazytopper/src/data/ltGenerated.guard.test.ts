/**
 * ltGenerated.guard.test.ts — GEN-THIN-1: LazyTopper-generated practice rows.
 *
 * ★ WHY (owner ruling, 2026-10-06). The extracted official papers are exhausted for five
 * thin IN concepts, so LazyTopper GENERATES CBSE-shaped questions, each modelled on a cited
 * real question. The owner's non-negotiables, each pinned here or in
 * `components/practice/surfaceReachability.guard.test.ts`:
 *   1. No student-facing tag of any kind. Provenance (`origin: "lt-generated"`, `modelledOn`,
 *      `questionProvenance: "authored"`, `shapedFrom`) is internal: no non-data module may
 *      even READ it, except the board-questions rule that excludes these rows.
 *   2. Never look like a past-year question: no pyqYear / isPYQ / pastBoardYear / pyqSet /
 *      ncertRef, ids outside the NCERT / exemplar patterns (source filter: All + Others only,
 *      pinned in the reachability guard), and never in Predicted Questions, HPQ or trends.
 *   3. They must actually surface — the engine pool, a concept practice set, Topic Hub
 *      concept practice, a Chapter Test draw and a Full Mock draw (here); Practice, the
 *      source filter, Worksheets, CT / FM eligibility and the CBQ chooser (reachability guard).
 *   4. A full CBSE marking scheme: leading `[N mark]` steps summing to the marks.
 *   5. Syllabus: the root guard matrix scans every served subtopic; the Science deletion
 *      filter is proven not to drop a row (every row is in the engine pool).
 */

import "../test/preloadBankChapters";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it, expect } from "vitest";

import {
  canonicalQuestionBank,
  RAW_CANONICAL_QUESTION_BANK,
  WITHHELD_QUESTION_IDS,
  AI_GENERATED_QUESTION_IDS,
  LT_GENERATED_QUESTION_IDS,
} from "./canonicalQuestionBank";
import type { CanonicalQuestion } from "./predictionTypes";
import { PredictionCore } from "./predictionCore";
import { generatePracticeSet } from "./practiceSetGenerator";
import { predictedQuestions } from "./predictedQuestions";
import { sciencePredictedQuestions } from "./predictedQuestionsScience";
import { buildActionableDesktopTopicHubContent } from "../lib/desktop/topicHubContent";
import { parseMarkBandRange } from "../lib/desktop/navigation";
import { questionMatchesFilters } from "../pages/PracticePage";
import type { PracticeQuestion } from "./predictionDataService";
import { drawChapterTest } from "../components/chaptertest/chapterTestBlueprint";
import { buildUnionPool, drawFullMock, fullMockChapterWeights } from "../components/fullmock/fullMockBlueprint";

const T = { timeout: 120_000 };

const GEN: CanonicalQuestion[] = canonicalQuestionBank.filter((q) => q.origin === "lt-generated");
const BANK_BY_ID = new Map(canonicalQuestionBank.map((q) => [q.id, q]));

/** The five thin concepts (B-16's list), each with the subtopic label its generated rows
 *  carry and the Topic Hub concept row that links into Practice for it. */
const THIN_CONCEPTS = [
  { concept: "AP derivations", slug: "arithmetic-progression", label: "Derivation of nth Term and Sum of n Terms", hub: "Sum of first n terms" },
  { concept: "Similarity definitions / counter-examples", slug: "triangles", label: "Similar Figures — Definitions and Counter-examples", hub: "Similar triangles — definition" },
  { concept: "Proving equal tangents", slug: "circles", label: "Equal Tangents from an External Point", hub: "Two tangents from an external point" },
  { concept: "AC frequency", slug: "magnetic-effects-of-electric-current", label: "AC Frequency", hub: "Direct current vs alternating current" },
  { concept: "Advantage of AC", slug: "magnetic-effects-of-electric-current", label: "Advantages of AC over DC", hub: "Direct current vs alternating current" },
] as const;
/** Owner target (GEN-THIN-1 §2): every thin concept serves ≥ 10 questions. */
const THIN_FLOOR = 10;

const NCERT_ID = /^(rn-n-|poly-n-|ple-n-|qe-n-|ap-n-|tri-n-|cg-n-|trig-n-|circ-n-|arc-n-|sav-n-|stat-n-|prob-n-)|ncert|exemplar|-exmplr-|-ncert-|-exem-/i;
const SECTION_FOR_MARKS: Record<number, string> = { 1: "A", 2: "B", 3: "C", 5: "D", 4: "E" };
const STEP = /^\[(\d+(?:\.5)?|½) marks?\]\s/;
const stepValue = (s: string) => {
  const m = STEP.exec(s);
  return m ? (m[1] === "½" ? 0.5 : Number(m[1])) : NaN;
};
const asPQ = (q: CanonicalQuestion) => q as unknown as PracticeQuestion;

describe("GEN-THIN-1 · provenance — internal, complete, and never PYQ-shaped", () => {
  it("the population is real and the id-set matches the tag (served = raw: none withheld)", () => {
    expect(GEN.length).toBeGreaterThanOrEqual(50);
    expect([...LT_GENERATED_QUESTION_IDS].sort()).toEqual(GEN.map((q) => q.id).sort());
    // P1: a generated id never collides with the withhold list.
    for (const q of GEN) expect(WITHHELD_QUESTION_IDS.has(q.id), q.id).toBe(false);
    const rawGen = RAW_CANONICAL_QUESTION_BANK.filter((q) => q.origin === "lt-generated");
    expect(rawGen.length).toBe(GEN.length);
  });

  it("every row: authored + origin + a real, non-generated, non-AI template + a paper/question citation", () => {
    for (const q of GEN) {
      expect(q.questionProvenance, q.id).toBe("authored");
      const tpl = BANK_BY_ID.get(String(q.shapedFrom));
      expect(tpl, `${q.id} shapedFrom ${q.shapedFrom} is not a served bank row`).toBeTruthy();
      expect(tpl?.origin, `${q.id} is modelled on another generated row`).toBeUndefined();
      expect(AI_GENERATED_QUESTION_IDS.has(String(q.shapedFrom)), `${q.id} modelled on an AI-pack row`).toBe(false);
      expect(String(q.modelledOn ?? "").trim().length, `${q.id} modelledOn`).toBeGreaterThanOrEqual(12);
      expect(AI_GENERATED_QUESTION_IDS.has(q.id)).toBe(false);
    }
  });

  it("no row carries a field that would make it read as a past-year / NCERT question, and no id looks like one", () => {
    for (const q of GEN) {
      for (const f of ["pyqYear", "isPYQ", "pastBoardYear", "pyqSet", "ncertRef", "requiresDiagram", "diagramDescription", "visualExplainerId"] as const) {
        expect((q as unknown as Record<string, unknown>)[f], `${q.id}.${f}`).toBeUndefined();
      }
      expect(q.id, q.id).toMatch(/^LTG-[MS]-[A-Z]+-\d{3}$/);
      expect(NCERT_ID.test(q.id), `${q.id} matches an NCERT/exemplar id pattern`).toBe(false);
      expect(/pyq|prf/i.test(q.id), `${q.id} carries a PYQ/proof id marker`).toBe(false);
    }
  });

  it("every row has a full CBSE marking scheme: leading [N mark] steps summing to marks; shape matches section", () => {
    for (const q of GEN) {
      expect(q.section, q.id).toBe(SECTION_FOR_MARKS[q.marks]);
      const steps = q.solutionSteps ?? [];
      expect(steps.length, q.id).toBeGreaterThan(0);
      const sum = steps.reduce((s, x) => s + stepValue(x), 0);
      expect(sum, `${q.id} step marks`).toBe(q.marks);
      expect(String(q.finalAnswer ?? "").length, q.id).toBeGreaterThan(0);
      const objective = q.format === "MCQ" || q.format === "Assertion-Reasoning";
      if (objective) {
        // Objective invariant: 0 or FULL on the answer alone — one step, key is an option.
        expect(q.marks, q.id).toBe(1);
        expect(steps.length, q.id).toBe(1);
        expect(q.options?.length, q.id).toBe(4);
        expect(q.options, q.id).toContain(q.answer);
      } else {
        expect(q.options ?? [], q.id).toEqual([]);
      }
      if (q.format === "Case-Based") expect(q.marks, q.id).toBe(4);
      if (q.marks === 5) expect(q.format, q.id).toBe("Long");
    }
  });
});

describe("GEN-THIN-1 · no rendered tag and no PYQ / Predicted / trend presence", () => {
  const SRC = join(__dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !p.includes(`${join("src", "test")}`)) files.push(p);
    }
  };
  walk(SRC);

  it("only the data layer and the board-questions exclusion read the provenance fields (no component can render them)", () => {
    const ALLOWED = new Set([
      "data/predictionTypes.ts",
      "data/canonicalQuestionBank.ts",
      "lib/boardQuestions/selectionRule.ts",
    ]);
    const readers = files
      .filter((f) => /lt-generated|modelledOn|LT_GENERATED_QUESTION_IDS|shapedFrom|questionProvenance/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f).split("\\").join("/"))
      .filter((f) => !f.endsWith(".ltgen.ts") && !ALLOWED.has(f));
    expect(readers).toEqual([]);
    // No .tsx file mentions them at all.
    expect(files.filter((f) => f.endsWith(".tsx") && /lt-generated|modelledOn|shapedFrom|questionProvenance/.test(readFileSync(f, "utf8")))).toEqual([]);
  });

  it("Predicted Questions, HPQ and trend modules never read the bank, and hold no generated id", () => {
    const MODULES = [
      "data/predictedQuestions.ts",
      "data/predictedQuestionsScience.ts",
      "data/predictedScienceQuestions.ts",
      "data/highlyProbableQuestions.ts",
      "data/hpqCompetencyAdditions.ts",
      "data/class10MathTopicTrends.ts",
      "data/class10ScienceTopicTrends.ts",
    ];
    for (const m of MODULES) {
      const text = readFileSync(join(SRC, m), "utf8");
      expect(/canonicalQuestionBank|bankChapters|\.ltgen/.test(text), `${m} imports the bank`).toBe(false);
      expect(text.includes("LTG-"), `${m} holds a generated id`).toBe(false);
    }
    const predictedIds = new Set([...predictedQuestions, ...sciencePredictedQuestions].map((q) => q.id));
    for (const q of GEN) expect(predictedIds.has(q.id), q.id).toBe(false);
  });

  it("CONTROL — the reader scan fires on a component that reads the tag", () => {
    const fake = 'export const Badge = (q) => q.origin === "lt-generated" ? "LT" : null;';
    expect(/lt-generated|modelledOn/.test(fake)).toBe(true);
  });
});

describe("GEN-THIN-1 · thin concepts reach ≥ 10 and the surfaces really draw them", () => {
  it("every thin concept serves ≥ 10 generated questions with mixed marks", T, () => {
    for (const c of THIN_CONCEPTS) {
      const rows = GEN.filter((q) => q.topicKey === c.slug && q.subtopic === c.label);
      expect(rows.length, c.concept).toBeGreaterThanOrEqual(THIN_FLOOR);
      expect(new Set(rows.map((q) => q.marks)).size, `${c.concept} mark mix`).toBeGreaterThanOrEqual(3);
    }
  });

  it("ENGINE POOL — every generated row is in its chapter's Practice pool (no deletion filter drops one)", T, () => {
    for (const slug of new Set(GEN.map((q) => q.topicKey))) {
      const pool = new Set(PredictionCore.getLikelyQuestionsForConcept(slug).map((q) => q.id));
      for (const q of GEN.filter((g) => g.topicKey === slug)) expect(pool.has(q.id), q.id).toBe(true);
    }
  });

  it("CONCEPT PRACTICE — the engine's concept draw and a 10-question practice set give ≥ 8 distinct questions per thin concept", T, () => {
    for (const c of THIN_CONCEPTS) {
      const concept = PredictionCore.getLikelyQuestionsForConcept(c.slug, c.label);
      expect(new Set(concept.map((q) => q.id)).size, c.concept).toBeGreaterThanOrEqual(THIN_FLOOR);
      const set = generatePracticeSet({ subject: GEN.find((q) => q.topicKey === c.slug)!.subject, topicKey: c.slug, conceptKey: c.label, totalQuestions: 10, shuffle: false });
      expect(new Set(set.questions.map((q) => q.id)).size, `${c.concept} practice set`).toBeGreaterThanOrEqual(8);
    }
  });

  it("TOPIC HUB CONCEPT PRACTICE — each thin concept's hub row exists and its mark band admits generated rows of that concept", T, () => {
    for (const c of THIN_CONCEPTS) {
      const hub = buildActionableDesktopTopicHubContent(c.slug); // the builder DesktopTopicHubPage.tsx:158 renders
      const row = hub?.boardEssentials.find((b) => b.name.startsWith(c.hub));
      expect(row, `${c.slug}: hub row "${c.hub}"`).toBeTruthy();
      const range = parseMarkBandRange(row!.marks);
      expect(range, `${c.slug}: band ${row!.marks}`).toBeTruthy();
      const inBand = GEN.filter(
        (q) => q.topicKey === c.slug && q.subtopic === c.label &&
          questionMatchesFilters(asPQ(q), "all", "all", "all", "all", range),
      );
      expect(inBand.length, `${c.concept}: generated rows inside the hub band ${row!.marks}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("CHAPTER TEST — across seeded draws of each thin chapter, generated rows are drawn", T, () => {
    for (const slug of new Set(GEN.map((q) => q.topicKey))) {
      const subject = GEN.find((q) => q.topicKey === slug)!.subject;
      let hits = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const paper = drawChapterTest({ subject, topicKey: slug, topicLabel: slug, worksheetId: `gen-${seed}`, seed });
        if (JSON.stringify(paper).includes("LTG-")) hits++;
      }
      expect(hits, `${slug}: draws containing a generated row`).toBeGreaterThan(0);
    }
  });

  it("FULL MOCK — every generated row is in the union pool, and seeded draws include them", T, () => {
    for (const subject of ["Maths", "Science"] as const) {
      const slugs = new Set(fullMockChapterWeights(subject).map((c) => c.slug));
      const pool = new Set(buildUnionPool(subject, slugs).map((q) => q.id));
      for (const q of GEN.filter((g) => g.subject === subject)) expect(pool.has(q.id), q.id).toBe(true);
      let hits = 0;
      for (let seed = 1; seed <= 60 && hits === 0; seed++) {
        const paper = drawFullMock({ subject, worksheetId: `gen-fm-${seed}`, code: "X", name: "GEN", seed });
        if (JSON.stringify(paper).includes("LTG-")) hits++;
      }
      expect(hits, `${subject}: a Full Mock draw containing a generated row`).toBeGreaterThan(0);
    }
  });
});
