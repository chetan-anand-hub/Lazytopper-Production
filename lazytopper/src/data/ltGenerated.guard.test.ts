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
import { BANK_FIX_1_PR2_WITHHOLD_CATEGORY } from "./bankFix/bankFix1Pr2Withholds";
import { resolveCanonicalSlug } from "./syllabus/canonicalTopicSlug";
import { PredictionCore } from "./predictionCore";
import { generatePracticeSet } from "./practiceSetGenerator";
import { predictedQuestions } from "./predictedQuestions";
import { sciencePredictedQuestions } from "./predictedQuestionsScience";
import { buildActionableDesktopTopicHubContent } from "../lib/desktop/topicHubContent";
import { parseMarkBandRange } from "../lib/desktop/navigation";
import { questionMatchesFilters } from "../pages/PracticePage";
import type { PracticeQuestion } from "./predictionDataService";
import { drawChapterTest } from "../components/chaptertest/chapterTestBlueprint";
import { buildPracticeQuestionsFromEngine } from "../components/practice/practiceQuestionBuilder";
import { chapterHasCbqs, practiceTopicLabel } from "../components/practice/cbqAvailability";
import { buildUnionPool, drawFullMock, fullMockChapterWeights } from "../components/fullmock/fullMockBlueprint";

const T = { timeout: 120_000 };

const GEN: CanonicalQuestion[] = canonicalQuestionBank.filter((q) => q.origin === "lt-generated");
// Owner DEC-12 (2026-10-07): persistence of vision is not in the 2026-27 Human Eye content list, so these
// generated rows are WITHHELD (kept in their pack, not served). No other generated row may be withheld.
const OWNER_WITHHELD_GENERATED: ReadonlySet<string> = new Set(["LTG-S-EYE-202", "LTG-S-EYE-207", "LTG-S-EYE-212", "LTG-S-EYE-215"]);
const BANK_BY_ID = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const RAW_BY_ID = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
// BANK-FIX-1 PR-2 (2026-10-07, controller D18): a template is the row a generated question WAS modelled on, so
// re-pointing it would falsify provenance. A template may therefore be WITHHELD when BANK-FIX-1 PR-2 withheld it
// for a reason that leaves its content in the syllabus (figure missing / duplicate / garbled text). A template
// withheld as out of the syllabus (out-of-syllabus / limit / syllabus-excluded / formative-only) is still a red:
// a question modelled on it carries that content.
const TEMPLATE_MAY_BE_WITHHELD = new Set(["figure", "duplicate", "garbled"]);
// BANK-FIX-1 PR-2 (2026-10-07, controller D21): a template withheld as "limit" is accepted ONLY for these reviewed rows.
// The limit is lazytopper/src/config/syllabus2026-27.ts:699-704 — "Heights & distances: at most TWO right triangles"
// ("Problems should not involve more than two right triangles.") and "angles of elevation/depression ONLY 30°, 45°,
// 60°". Their templates (PB-M-1-TRIG-C-001, PB-M-2-TRIG-C-001) need three right triangles; each generated row was
// reviewed and uses exactly two right triangles with angles 30°/45°/60° only:
//   LTG-M-TRIG-251 drone 60 m up, depression 30° -> 60°; LTG-M-TRIG-253 10 m ladder slipping 60° -> 30°;
//   LTG-M-TRIG-255 helicopter 300 m up, lifeboat at 45° and swimmer at 30°.
export const LIMIT_TEMPLATE_REVIEWED: ReadonlySet<string> = new Set(["LTG-M-TRIG-251", "LTG-M-TRIG-253", "LTG-M-TRIG-255"]);
const templateOf = (q: CanonicalQuestion): CanonicalQuestion | undefined => {
  const id = String(q.shapedFrom);
  if (BANK_BY_ID.has(id)) return BANK_BY_ID.get(id);
  const cat = BANK_FIX_1_PR2_WITHHOLD_CATEGORY.get(id);
  const allowed = cat !== undefined && (TEMPLATE_MAY_BE_WITHHELD.has(cat) || (cat === "limit" && LIMIT_TEMPLATE_REVIEWED.has(q.id)));
  return allowed && WITHHELD_QUESTION_IDS.has(id) ? RAW_BY_ID.get(id) : undefined;
};

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

/** Chapter codes that bank ids carry (e.g. PYQ-S-2025-ACID-008, CIRC-N-NCERT-10-…, CBE-S-MAGN-…). */
const CHAPTER_ID_CODES: Record<string, string> = {
  RN: "real-numbers", POLY: "polynomials", PLE: "pair-of-linear-equations", QE: "quadratic-equations",
  AP: "arithmetic-progression", TRI: "triangles", CG: "coordinate-geometry", TRIG: "trigonometry",
  CIRC: "circles", ARC: "areas-related-to-circles", SAV: "surface-areas-and-volumes", STAT: "statistics",
  PROB: "probability", CHEMRXN: "chemical-reactions-and-equations", ACID: "acids-bases-and-salts",
  METAL: "metals-and-non-metals", CARB: "carbon-and-its-compounds", LIFE: "life-processes",
  CTRL: "control-and-coordination", REPR: "how-do-organisms-reproduce", HERED: "heredity",
  LIGHT: "light-reflection-and-refraction", LGHT: "light-reflection-and-refraction",
  EYE: "human-eye-and-colourful-world", ELEC: "electricity", MAG: "magnetic-effects-of-electric-current",
  MAGN: "magnetic-effects-of-electric-current", ENV: "our-environment",
};
/** An official CBSE-origin row: a board PYQ (pyqYear) or an SQP / sample-paper / item-bank / APQ / CFPQ / pre-board id. */
const isOfficialRow = (q: CanonicalQuestion) => Boolean(q.pyqYear) || /^(SQP|SP-|CBE|APQ|PYQ|CFPQ|PB-)/.test(q.id);
const NCERT_ID = /^(rn-n-|poly-n-|ple-n-|qe-n-|ap-n-|tri-n-|cg-n-|trig-n-|circ-n-|arc-n-|sav-n-|stat-n-|prob-n-)|ncert|exemplar|-exmplr-|-ncert-|-exem-/i;
const SECTION_FOR_MARKS: Record<number, string> = { 1: "A", 2: "B", 3: "C", 5: "D", 4: "E" };
const STEP = /^\[(\d+(?:\.5)?|½) marks?\]\s/;
const stepValue = (s: string) => {
  const m = STEP.exec(s);
  return m ? (m[1] === "½" ? 0.5 : Number(m[1])) : NaN;
};
const asPQ = (q: CanonicalQuestion) => q as unknown as PracticeQuestion;

describe("GEN-THIN-1 · provenance — internal, complete, and never PYQ-shaped", () => {
  it("the population is real and the id-set matches the tag (served = raw, except owner-ruled withholds)", () => {
    expect(GEN.length).toBeGreaterThanOrEqual(144); // 50 (PR-1) + 94 (PR-2)
    // P1: a generated id is withheld ONLY by an explicit owner ruling listed in OWNER_WITHHELD_GENERATED.
    for (const q of GEN) expect(WITHHELD_QUESTION_IDS.has(q.id), q.id).toBe(false);
    for (const id of OWNER_WITHHELD_GENERATED) expect(WITHHELD_QUESTION_IDS.has(id), `${id} must be withheld`).toBe(true);
    const rawGen = RAW_CANONICAL_QUESTION_BANK.filter((q) => q.origin === "lt-generated");
    expect(rawGen.filter((q) => !OWNER_WITHHELD_GENERATED.has(q.id)).map((q) => q.id).sort()).toEqual(GEN.map((q) => q.id).sort());
    expect([...LT_GENERATED_QUESTION_IDS].filter((id) => !OWNER_WITHHELD_GENERATED.has(id)).sort()).toEqual(GEN.map((q) => q.id).sort());
  });

  it("every row: authored + origin + a real, non-generated, non-AI template + a paper/question citation", () => {
    for (const q of GEN) {
      expect(q.questionProvenance, q.id).toBe("authored");
      const tpl = templateOf(q);
      expect(tpl, `${q.id} shapedFrom ${q.shapedFrom} is not a served bank row (nor a BANK-FIX-1 PR-2 figure/duplicate/garbled withhold)`).toBeTruthy();
      // a WITHHELD template must still be a same-subject row (the next test pins subject and chapter for all)
      if (!BANK_BY_ID.has(String(q.shapedFrom))) {
        expect(tpl!.subject, `${q.id} withheld template ${q.shapedFrom} subject`).toBe(q.subject);
      }
      expect(tpl?.origin, `${q.id} is modelled on another generated row`).toBeUndefined();
      expect(AI_GENERATED_QUESTION_IDS.has(String(q.shapedFrom)), `${q.id} modelled on an AI-pack row`).toBe(false);
      expect(String(q.modelledOn ?? "").trim().length, `${q.id} modelledOn`).toBeGreaterThanOrEqual(12);
      expect(AI_GENERATED_QUESTION_IDS.has(q.id)).toBe(false);
    }
  });

  it("every template is a SAME-SUBJECT official row whose id names only its own chapter; cross-chapter only when the row's chapter has no same-shape official row (owner, sample review 2026-10-06)", () => {
    // The owner caught LTG-S-MAG rows citing `PYQ-S-2026-ACID-018` — really the 2026 Magnetic
    // Effects board question (31/5/2 Q39), filed under an Acids-looking id. Owner rule: cite a
    // same-chapter row, or the nearest same-shape row of the same subject, and pin same-subject.
    for (const q of GEN) {
      const tpl = templateOf(q)!;
      expect(tpl.subject, `${q.id} -> ${tpl.id} subject`).toBe(q.subject);
      const tplChapter = resolveCanonicalSlug(tpl.topicKey);
      const named = String(tpl.id).toUpperCase().split(/[-_]/).map((t) => CHAPTER_ID_CODES[t]).filter(Boolean);
      for (const ch of named) expect(ch, `${q.id} -> ${tpl.id} names chapter ${ch} but sits in ${tplChapter}`).toBe(tplChapter);
      if (tplChapter !== resolveCanonicalSlug(q.topicKey)) {
        const sameShapeInChapter = canonicalQuestionBank.some(
          (r) => resolveCanonicalSlug(r.topicKey) === resolveCanonicalSlug(q.topicKey) && isOfficialRow(r) &&
            !AI_GENERATED_QUESTION_IDS.has(r.id) && r.marks === q.marks && r.format === q.format,
        );
        expect(sameShapeInChapter, `${q.id} cites ${tpl.id} from another chapter although its own chapter has an official ${q.marks}-mark ${q.format} row`).toBe(false);
        expect(isOfficialRow(tpl), `${q.id} cross-chapter template ${tpl.id} must be an official row`).toBe(true);
      }
    }
  });

  it("CONTROL — a withheld template is accepted only for a figure / duplicate / garbled withhold (BANK-FIX-1 PR-2, D18)", () => {
    const byCat = (c: string) => [...BANK_FIX_1_PR2_WITHHOLD_CATEGORY].find(([, v]) => v === c)?.[0];
    const fig = byCat("figure")!, lim = byCat("limit")!, oos = byCat("out-of-syllabus")!;
    expect(templateOf({ shapedFrom: fig } as CanonicalQuestion)?.id).toBe(fig);
    expect(templateOf({ shapedFrom: lim } as CanonicalQuestion)).toBeUndefined();
    // a reviewed generated row may use its "limit" template; the same template for any other row is still a red
    expect(templateOf({ id: "LTG-M-TRIG-251", shapedFrom: "PB-M-2-TRIG-C-001" } as CanonicalQuestion)?.id).toBe("PB-M-2-TRIG-C-001");
    expect(templateOf({ id: "LTG-M-TRIG-999", shapedFrom: "PB-M-2-TRIG-C-001" } as CanonicalQuestion)).toBeUndefined();
    expect(templateOf({ shapedFrom: oos } as CanonicalQuestion)).toBeUndefined();
    // every categorised id IS withheld (the map and the withhold block agree)
    expect([...BANK_FIX_1_PR2_WITHHOLD_CATEGORY.keys()].filter((id) => !WITHHELD_QUESTION_IDS.has(id))).toEqual([]);
  });

  it("CONTROL — the chapter-code check fires on the Acids-looking id it was written for", () => {
    const named = "PYQ-S-2026-ACID-018".split("-").map((t) => CHAPTER_ID_CODES[t]).filter(Boolean);
    expect(named).toEqual(["acids-bases-and-salts"]);
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
    // CBQ-1 (owner, 2026-10-07): `competencyVerified` is no longer internal provenance — it is THE
    // CBQ flag, set on bank rows (generated and official) and read ONLY through the CBQ
    // classification module. Bank data, the official-tag pins and lib/cbq/** may name it.
    const cbqReaders = files
      .filter((f) => /competencyVerified/.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f).split("\\").join("/"))
      .filter((f) => !f.endsWith(".ltgen.ts") && !ALLOWED.has(f) && !/^data\/(questionBanks|cbq)\//.test(f) && !/^lib\/cbq\//.test(f));
    expect(cbqReaders).toEqual([]);
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

// ---------------------------------------------------------------------------
// GEN-THIN-1 PR-2 — competency-based questions of every mark
// ---------------------------------------------------------------------------
// Owner ruling (2026-10-06, P3): the chapters whose CBQ chooser showed fewer than 8 served
// (human-tier) case studies are brought to ≥ 8, Magnetic Effects first (it had 0), each with
// ≥ 2 one-mark, ≥ 2 two/three-mark and a five-mark where the chapter's papers carry one.
// Every PR-2 row carries a deliberately-set `competencyVerified: true` (FU-CBQ-CHOOSER-ALL-MARKS:
// the chooser does NOT read it yet — that waits on BANK-FIX-1 re-validating isCompetencyBased).

const CBQ_CHAPTERS = [
  { subject: "Science", slug: "magnetic-effects-of-electric-current", fiveMark: true },
  { subject: "Science", slug: "how-do-organisms-reproduce", fiveMark: true },
  { subject: "Science", slug: "control-and-coordination", fiveMark: true },
  { subject: "Maths", slug: "circles", fiveMark: true },
  { subject: "Science", slug: "carbon-and-its-compounds", fiveMark: true },
  { subject: "Science", slug: "heredity", fiveMark: true },
  { subject: "Science", slug: "human-eye-and-colourful-world", fiveMark: true },
  { subject: "Science", slug: "our-environment", fiveMark: true },
  { subject: "Maths", slug: "real-numbers", fiveMark: false }, // no official five-mark row in the chapter
  { subject: "Science", slug: "light-reflection-and-refraction", fiveMark: true },
] as const;
const CBQ_FLOOR = 8;

/** The chooser's own draw (cbqAvailability.chapterHasCbqs), counted instead of `.some`. */
const chooserCaseStudies = (subject: "Maths" | "Science", slug: string) =>
  buildPracticeQuestionsFromEngine({
    subjectKey: subject,
    topicKey: practiceTopicLabel(subject, slug),
    count: 200,
    difficulty: "All",
    boardPattern: "E",
  }).filter((q) => questionMatchesFilters(q, "4", "case", "all", "all", null));

describe("GEN-THIN-1 PR-2 · CBQs of every mark", () => {
  it("CBQ CHOOSER — each of the 10 chapters shows ≥ 8 distinct human-tier case studies through the chooser's own draw", T, () => {
    for (const c of CBQ_CHAPTERS) {
      const drawn = chooserCaseStudies(c.subject, c.slug).filter((q) => !AI_GENERATED_QUESTION_IDS.has(q.id));
      expect(new Set(drawn.map((q) => q.id)).size, `${c.slug}: chooser case studies`).toBeGreaterThanOrEqual(CBQ_FLOOR);
      expect(chapterHasCbqs(c.subject, c.slug), `${c.slug}: chooser offers the chapter`).toBe(true);
    }
  });

  it("every generated case study is in its chapter's chooser draw (reachable, not merely eligible)", T, () => {
    for (const c of CBQ_CHAPTERS) {
      const drawn = new Set(chooserCaseStudies(c.subject, c.slug).map((q) => q.id));
      for (const q of GEN.filter((g) => g.topicKey === c.slug && g.format === "Case-Based")) expect(drawn.has(q.id), q.id).toBe(true);
    }
  });

  it("per chapter: ≥ 2 one-mark, ≥ 2 two/three-mark, ≥ 2 four-mark case studies (1+1+2), ≥ 1 five-mark where the papers have one", () => {
    for (const c of CBQ_CHAPTERS) {
      const rows = GEN.filter((q) => q.topicKey === c.slug && q.competencyVerified === true);
      const n = (f: (q: CanonicalQuestion) => boolean) => rows.filter(f).length;
      expect(n((q) => q.marks === 1), `${c.slug} 1-mark`).toBeGreaterThanOrEqual(2);
      expect(n((q) => q.marks === 2 || q.marks === 3), `${c.slug} 2/3-mark`).toBeGreaterThanOrEqual(2);
      expect(n((q) => q.format === "Case-Based"), `${c.slug} case`).toBeGreaterThanOrEqual(2);
      if (c.fiveMark) expect(n((q) => q.marks === 5), `${c.slug} 5-mark`).toBeGreaterThanOrEqual(1);
      for (const q of rows.filter((r) => r.format === "Case-Based")) {
        const marks = (q.solutionSteps ?? []).map(stepValue);
        expect(marks, `${q.id} case split`).toEqual([1, 1, 1, 1]);
        for (const part of ["(i)", "(ii)", "(iii)"]) expect(q.questionText.includes(part), `${q.id} ${part}`).toBe(true);
      }
    }
  });

  // CBQ-1 (owner, 2026-10-07): official CBSE-origin rows may carry the flag too, once they pass
  // ruling 1 and a blind re-solve — pinned per subject in src/data/cbq/officialCbqTags.*.ts
  // (officialCbqTags.science.test.ts proves the tagged Science set equals that list exactly).
  it("competencyVerified is set ONLY on generated rows (always with isCompetencyBased) or official CBSE-origin rows, and on every PR-2 row", () => {
    for (const q of canonicalQuestionBank.filter((r) => r.competencyVerified !== undefined)) {
      expect(q.competencyVerified, q.id).toBe(true);
      if (q.origin === "lt-generated") {
        expect(q.isCompetencyBased, q.id).toBe(true);
      } else {
        expect(q.origin, q.id).toBeUndefined();
        expect(isOfficialRow(q) || NCERT_ID.test(q.id), `${q.id} carries competencyVerified but is neither generated nor official`).toBe(true);
        expect(AI_GENERATED_QUESTION_IDS.has(q.id), `${q.id} is an AI-pack row`).toBe(false);
      }
    }
    const pr2 = GEN.filter((q) => /-1\d\d$/.test(q.id));
    expect(pr2.length).toBe(94);
    for (const q of pr2) expect(q.competencyVerified, q.id).toBe(true);
  });
});
