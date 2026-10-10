// src/components/fullmock/fullMockBlueprint.ts
//
// FULL MOCK SOURCING + PAPER ASSEMBLY (locked spec §2/§3 + dispatch §3.1–3.2).
//
// A Full Mock is a WHOLE-SUBJECT board paper (Sections A–E, ~38 Q / 80 marks)
// drawn fresh from the DUAL-SOURCE UNION pool — resolves [FU-FM-RESOURCE-PREDICTED]:
//   • canonicalQuestionBank (every authored / extracted / PYQ question), PLUS
//   • the live predicted (HPQ) bank for the subject
//     (Maths: predictedQuestions · Science: sciencePredictedQuestions —
//      predictedScienceQuestions.ts is planner-only and EXCLUDED, owner decision 5).
// NEVER predicted-only, never pyqOnly: every eligible question can reach a mock.
//
// MARKS PER UNIT (SYLLABUS-FIX-CODE F3): the paper is allocated across the WHOLE
// paper by CBSE's UNIT marks — read from the one reference, src/config/syllabus2026-27.ts
// (Maths p3: 6/20/6/15/12/10/11 · Science p4: 25/25/12/13/5). `allocateUnitSlots`
// decides how many questions of each section every unit gets so that each unit's
// marks land EXACTLY on its CBSE total, for every seed, given what the pool holds.
// CBSE publishes no per-chapter marks, so a unit's slots are shared between its
// chapters by LazyTopper's estimate (`topics.ts` approx. marks), seeded per paper.
// This replaced a per-section largest-remainder split by trends `weightagePercent`
// that put e.g. 25 marks on Maths Algebra (CBSE: 20) and 1 on Science Unit V (CBSE: 5).
// The PYQ/fresh mix inside each (section × chapter) cell comes from the shared
// `drawBalancedSet` (utils/balancedMockDraw.ts).
//
// SYLLABUS GUARD: the chapter registry is the 26 board chapters of F1 ∩ the canonical
// `topics.ts` registry (validated through `desktopTopicBySlug` after
// `resolveCanonicalSlug`), so a banned / deleted / unknown chapter key can never leak
// into the legend or the draw.
//
// HONESTY: a chapter thin in a band hands its slots to the other chapters of the SAME
// unit (never to another unit — that would break the unit's marks). If the pool cannot
// meet some unit's marks for ANY section split, the draw keeps the unit-marks shape,
// tops a short section up from its remaining real pool, and SAYS SO (`unitMarksExact`
// false; each unit's real marks are shown against its CBSE total) — it never falls back
// to a percent split, and nothing is padded or fabricated. On the real bank every seed
// is exact (fullMockBlueprint.test.ts pins it). Section A eligibility requires the answer KEY to RESOLVE against
// the question's own options (a mis-keyed MCQ would deterministically mis-score a
// correct pick, so it is excluded rather than guessed at — the #352 bar).
//
// The drawn paper is a PersistedWorksheet-shaped object held IN MEMORY ONLY
// (never saved to the worksheet store — the CT D2 precedent) so the SHARED
// renderers + grader run byte-unchanged. Its code/name carry the FULL-MOCK
// identity (FM-…), never WS-/CT-.

import type { CanonicalQuestion } from "../../data/predictionTypes";
// BANK-SPLIT-1 PR-2 (L4): the subject's rows come from the per-chapter cache. FullMockPage
// awaits ensureBankSubject(subject) before it draws; reading an unloaded chapter throws.
import { getBankRowsForSubject, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { predictedQuestions, type PredictedQuestion } from "../../data/predictedQuestions";
import {
  sciencePredictedQuestions,
  type SciencePredictedQuestion,
} from "../../data/predictedQuestionsScience";
import { SYLLABUS_2026_27, chapterUnit } from "../../config/syllabus2026-27";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { resolveTopicDisplayName } from "../../utils/topicResolver";
import { allocateByPercent } from "../../utils/mockBlueprint";
import { drawBalancedSet, mulberry32 } from "../../utils/balancedMockDraw";
import { questionKey } from "../../utils/questionKey";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { cbqFlagOf } from "../../lib/cbq/cbqClassification";
import { needsMissingFigure } from "../../lib/figureSafe";
import { balanceCbqShare } from "../../lib/cbq/cbqPaperBalance";
import type {
  PersistedWorksheet,
  PersistedWorksheetQuestion,
} from "../../services/worksheetSessionStore";

export type FMSubject = "Maths" | "Science";
export type FMSection = "A" | "B" | "C" | "D" | "E";

export interface FMSectionSpec {
  section: FMSection;
  label: string;
  /** Board-blueprint question count (A 20×1 · B 5×2 · C 6×3 · D 4×5 · E 3×4 = 80). */
  targetCount: number;
  marksEach: number;
  /** Section A objective auto-grades 0-or-full on submit; B–E upload. */
  autoGraded: boolean;
}

// The CBSE 80-mark board blueprint (matches mockPaperEngine's
// DEFAULT_SECTION_BLUEPRINT and the locked mockup): 38 questions / 80 marks.
export const FM_BLUEPRINT: readonly FMSectionSpec[] = [
  { section: "A", label: "Objective (MCQ / AR)", targetCount: 20, marksEach: 1, autoGraded: true },
  { section: "B", label: "Very short answer", targetCount: 5, marksEach: 2, autoGraded: false },
  { section: "C", label: "Short answer", targetCount: 6, marksEach: 3, autoGraded: false },
  { section: "D", label: "Long answer", targetCount: 4, marksEach: 5, autoGraded: false },
  { section: "E", label: "Case-based", targetCount: 3, marksEach: 4, autoGraded: false },
] as const;

/** 3 hours — the board duration. Always on, no toggle (spec §2). */
export const FM_DURATION_MS = 3 * 60 * 60 * 1000;

/** Below this many drawable questions the setup shows an honest empty state —
 *  a 5-question "board mock" would be a fake paper, not a thin one. */
const MIN_MOCK_QUESTIONS = 15;

export interface FMBlueprintRow extends FMSectionSpec {
  /** Honest — may be < target when the union pool is thin; never padded. */
  actualCount: number;
  actualMarks: number;
}

/** One board chapter of the paper — canonical slugs only. */
export interface FMChapterWeight {
  slug: string;
  label: string;
  /** Approximate share of the 80-mark paper, from CBSE's unit marks (topics.ts approx.
   *  marks ÷ 80). An estimate — CBSE publishes marks per UNIT, never per chapter. */
  percent: number;
  /** The CBSE unit this chapter belongs to (e.g. "II"). */
  unit: string;
}

/** One CBSE unit of the paper: its board marks and the marks this draw actually holds. */
export interface FMUnitMarks {
  unit: string;
  name: string;
  /** CBSE's marks for the unit (the one reference). */
  target: number;
  /** Marks of this draw's questions in the unit — equals `target` whenever the pool allows. */
  actual: number;
}

export interface DrawnFullMock {
  /** In-memory PersistedWorksheet (FM- identity) — drives the shared renderers +
   *  grader byte-unchanged. NEVER persisted to the worksheet store. */
  paper: PersistedWorksheet;
  blueprint: FMBlueprintRow[];
  chapterWeights: FMChapterWeight[];
  /** Marks per CBSE unit — the setup legend ("by CBSE's unit marks"). */
  unitMarks: FMUnitMarks[];
  /** True when every unit's marks equal its CBSE total (the normal case). */
  unitMarksExact: boolean;
  objectiveCount: number;
  subjectiveCount: number;
  totalMarks: number;
  /** The REAL mix of the draw (shown to the student — never the target implied). */
  pyqCount: number;
  freshCount: number;
  enoughQuestions: boolean;
  /** CBQ-1 PR-2 — the paper's REAL CBQ share (target >= 40 of 80 marks; CBSE pattern: 50%). `cbqShortfall` > 0
   *  only when the subject's pool has no more CBQs to place (shown honestly on the page). */
  cbqMarks: number;
  cbqTarget: number;
  cbqShortfall: number;
  /** Section A marks that are not CBQs (CBSE: ~20%). */
  plainMcqMarks: number;
  /** Section B-E marks that are not CBQs (CBSE: ~30%). */
  constructedMarks: number;
}

// ── The union pool ───────────────────────────────────────────────────────────

/** A pool item — the union VIEW over CanonicalQuestion and PredictedQuestion.
 *  Every field is copied from the source question (honest renames only, e.g. the
 *  shared-string `kind`→format distinction never matters here); nothing is
 *  fabricated. `pyqYear`/`isPYQ` pass through so `isPYQQuestion` classifies. */
/** The CBQ flag a pool item carries — copied from its source row by the one classifier
 *  (`cbqFlagOf`, CBQ-1), never derived here. */
type FMCbqFlag = ReturnType<typeof cbqFlagOf>;

export interface FMPoolQuestion extends FMCbqFlag {
  id: string;
  topicSlug: string;
  subtopic?: string;
  marks: number;
  questionText: string;
  options?: string[];
  answer?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  pyqYear?: string;
  isPYQ?: boolean;
  source: "canonical" | "predicted";
}

const norm = (s: string): string => String(s || "").trim().toLowerCase();

function fromCanonical(q: CanonicalQuestion): FMPoolQuestion {
  return {
    id: q.id,
    topicSlug: resolveCanonicalSlug(q.topicKey),
    subtopic: q.subtopic,
    marks: Number(q.marks) || 0,
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    // BANK-FIX-1 ruling 2: an overridden row is never PYQ (isPYQQuestion, keeper).
    pyqYear: q.sourceOverride === "others" ? undefined : q.pyqYear,
    ...cbqFlagOf(q),
    source: "canonical",
  };
}

function fromPredicted(q: PredictedQuestion | SciencePredictedQuestion): FMPoolQuestion {
  return {
    id: q.id,
    topicSlug: resolveCanonicalSlug(String(q.topicKey)),
    subtopic: q.subtopic,
    marks: Number(q.marks) || 0,
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    // No pyqYear on the predicted shape: predicted questions are the FRESH class
    // under the shipped isPYQQuestion matcher (authored, not past-year-tagged).
    ...cbqFlagOf(q),
    source: "predicted",
  };
}

const syllabusSubject = (subject: FMSubject): "maths" | "science" => (subject === "Science" ? "science" : "maths");

/**
 * The subject's chapter registry: the board chapters of the one reference
 * (src/config/syllabus2026-27.ts, CBSE unit order) that resolve to a canonical
 * `topics.ts` chapter OF THIS SUBJECT. The double gate (resolveCanonicalSlug +
 * desktopTopicBySlug + subject match) means a banned, deleted, or unknown chapter key
 * can never appear in the draw. `percent` is the chapter's approximate share of the
 * paper from CBSE's unit marks (topics.ts approx. marks / 80).
 */
export function fullMockChapterWeights(subject: FMSubject): FMChapterWeight[] {
  const out: FMChapterWeight[] = [];
  const seen = new Set<string>();
  for (const unit of SYLLABUS_2026_27[syllabusSubject(subject)].units) {
    for (const key of unit.chapters) {
      const candidate = resolveCanonicalSlug(key);
      const meta = candidate ? desktopTopicBySlug(candidate) : undefined;
      if (!meta || norm(meta.subject) !== norm(subject) || seen.has(meta.slug)) continue;
      if (chapterUnit(meta.slug)?.unit !== unit.unit || meta.weight <= 0) continue;
      seen.add(meta.slug);
      out.push({
        slug: meta.slug,
        label: resolveTopicDisplayName(subject, meta.slug),
        percent: (meta.weight / 80) * 100,
        unit: unit.unit,
      });
    }
  }
  return out;
}

/** The subject's CBSE units with their marks, in CBSE order (the one reference). */
export function fullMockUnits(subject: FMSubject): Array<{ unit: string; name: string; marks: number }> {
  return SYLLABUS_2026_27[syllabusSubject(subject)].units.map((u) => ({
    unit: u.unit,
    name: u.name,
    marks: u.marks,
  }));
}

// ── Unit-marks allocation (F3) ───────────────────────────────────────────────

/** Per unit: how many questions of each section it gets (indexed like FM_BLUEPRINT). */
export type FMUnitSlots = Record<string, number[]>;

/** The search gives up after this many tried compositions. */
const ALLOC_NODE_BUDGET = 200_000;

/**
 * Decide how many questions of each section every CBSE unit gets, so that EACH UNIT'S
 * MARKS EQUAL ITS CBSE TOTAL and every section keeps its board count (A 20x1 · B 5x2 ·
 * C 6x3 · D 4x5 · E 3x4).
 *
 * `available[unit][i]` caps a unit's questions in section i by what the pool really
 * holds. For each unit, every section split ("composition") that sums to its marks is
 * enumerated and scored by its distance from the proportional ideal
 * (section count x unit marks / 80), plus a small seeded jitter so different papers use
 * different (still near-proportional) splits. A depth-first search then picks one
 * composition per unit, most-constrained unit first, without overfilling any section.
 * Because the section shape and the unit marks both total 80, any full assignment that
 * does not overfill a section fills every section exactly.
 *
 * Returns null when no split exists within the caps — the caller REPORTS that; it never
 * falls back to a percent split. Pure and deterministic for a seed.
 */
export function allocateUnitSlots(args: {
  units: ReadonlyArray<{ unit: string; marks: number }>;
  available: Readonly<Record<string, readonly number[]>>;
  seed: number;
}): FMUnitSlots | null {
  const counts = FM_BLUEPRINT.map((s) => s.targetCount);
  const marks = FM_BLUEPRINT.map((s) => s.marksEach);
  const paperMarks = counts.reduce((sum, c, i) => sum + c * marks[i], 0);
  const unitTotal = args.units.reduce((sum, u) => sum + u.marks, 0);
  if (unitTotal !== paperMarks) return null;
  const rand = mulberry32(args.seed ^ 0x5eed0001);

  type Comp = { x: number[]; cost: number };
  const compsByUnit = new Map<string, Comp[]>();
  for (const u of args.units) {
    const caps = counts.map((c, i) => Math.min(c, Math.max(0, args.available[u.unit]?.[i] ?? 0)));
    const ideal = counts.map((c) => (c * u.marks) / paperMarks);
    const comps: Comp[] = [];
    const x = new Array<number>(counts.length).fill(0);
    const walk = (i: number, left: number): void => {
      if (i === counts.length) {
        if (left === 0) {
          const cost = x.reduce((sum, v, k) => sum + (v - ideal[k]) ** 2, 0);
          comps.push({ x: [...x], cost: cost + rand() * 1.5 });
        }
        return;
      }
      for (let v = 0; v <= caps[i] && v * marks[i] <= left; v += 1) {
        x[i] = v;
        walk(i + 1, left - v * marks[i]);
      }
      x[i] = 0;
    };
    walk(0, u.marks);
    comps.sort((a, b) => a.cost - b.cost);
    compsByUnit.set(u.unit, comps);
  }

  const order = [...args.units].sort(
    (a, b) =>
      compsByUnit.get(a.unit)!.length - compsByUnit.get(b.unit)!.length ||
      args.units.indexOf(a) - args.units.indexOf(b),
  );
  // For the bound: the most of section i any composition of each unit can take.
  const maxTake = order.map((u) =>
    counts.map((_, i) => compsByUnit.get(u.unit)!.reduce((m, c) => Math.max(m, c.x[i]), 0)),
  );
  // tail[k][i] = what units k.. can still take of section i at most.
  const tail = order.map((_, k) =>
    counts.map((_, i) => maxTake.slice(k).reduce((sum, t) => sum + t[i], 0)),
  );

  const residual = [...counts];
  const chosen: number[][] = [];
  let nodes = 0;
  const dfs = (k: number): boolean => {
    if (k === order.length) return residual.every((r) => r === 0);
    for (const comp of compsByUnit.get(order[k].unit)!) {
      nodes += 1;
      if (nodes > ALLOC_NODE_BUDGET) return false;
      if (comp.x.some((v, i) => v > residual[i])) continue;
      comp.x.forEach((v, i) => (residual[i] -= v));
      // Bound: the units still to place must be able to absorb every section's remainder.
      const feasible =
        k + 1 === order.length
          ? residual.every((r) => r === 0)
          : residual.every((r, i) => tail[k + 1][i] >= r);
      if (feasible) {
        chosen[k] = comp.x;
        if (dfs(k + 1)) return true;
      }
      comp.x.forEach((v, i) => (residual[i] += v));
    }
    return false;
  };
  if (!dfs(0)) return null;
  const out: FMUnitSlots = {};
  order.forEach((u, k) => (out[u.unit] = chosen[k]));
  return out;
}

/**
 * Share a unit's `count` slots in one section between the unit's chapters, by
 * LazyTopper's per-chapter estimate (topics.ts approx. marks) through the KEPT
 * `allocateByPercent` (largest remainder). Each paper perturbs the estimate by a seeded
 * factor in [0.75, 1.25) so a one-slot cell does not always go to the same chapter.
 * A chapter never gets more than its real availability; its excess goes to the unit's
 * other chapters (heaviest first) — never outside the unit.
 */
function splitAcrossChapters(
  count: number,
  chapters: ReadonlyArray<{ slug: string; weight: number; available: number }>,
  seed: number,
): Map<string, number> {
  const rand = mulberry32(seed);
  const jittered = chapters.map((c) => ({ ...c, w: Math.max(c.weight, 0.0001) * (0.75 + 0.5 * rand()) }));
  const totalW = jittered.reduce((sum, c) => sum + c.w, 0);
  const base = allocateByPercent(
    count,
    jittered.map((c) => ({ key: c.slug, percent: (c.w / totalW) * 100 })),
  );
  const taken = new Map<string, number>();
  let excess = 0;
  for (const c of jittered) {
    const want = base[c.slug] ?? 0;
    const t = Math.min(want, c.available);
    excess += want - t;
    taken.set(c.slug, t);
  }
  for (const c of [...jittered].sort((a, b) => b.w - a.w)) {
    while (excess > 0 && (taken.get(c.slug) ?? 0) < c.available) {
      taken.set(c.slug, (taken.get(c.slug) ?? 0) + 1);
      excess -= 1;
    }
  }
  return taken;
}

/** Section A must auto-grade deterministically 0-or-full, so an objective
 *  question is eligible ONLY when its answer key RESOLVES against its own
 *  options (the #352 bar) — a mis-keyed MCQ would score a correct pick 0. */
function isAutoGradeableObjective(q: FMPoolQuestion): boolean {
  if (!Array.isArray(q.options) || q.options.length < 2) return false;
  const key = norm(q.answer || "");
  if (!key) return false;
  return q.options.some((o) => norm(o) === key);
}

function isMcqShaped(q: FMPoolQuestion): boolean {
  return Array.isArray(q.options) && q.options.length >= 2;
}

/** The per-section eligibility bands — EXACT numeric marks (§7: never the coarse
 *  fused buckets). B–E are written sections, so MCQ-shaped items stay out. */
export function sectionPool(pool: FMPoolQuestion[], section: FMSection): FMPoolQuestion[] {
  switch (section) {
    case "A":
      return pool.filter((q) => q.marks === 1 && isAutoGradeableObjective(q));
    case "B":
      return pool.filter((q) => q.marks === 2 && !isMcqShaped(q));
    case "C":
      return pool.filter((q) => q.marks === 3 && !isMcqShaped(q));
    case "D":
      return pool.filter((q) => q.marks === 5 && !isMcqShaped(q));
    case "E":
      return pool.filter((q) => q.marks === 4 && !isMcqShaped(q));
  }
}

/**
 * Build the union pool for a subject: canonical + the live predicted bank,
 * restricted to the subject's canonical chapters, deduped by id and by questionKey
 * (keeper: pyqYear, then non-AI, then bank order — canonical before predicted).
 */
export function buildUnionPool(subject: FMSubject, chapterSlugs: Set<string>): FMPoolQuestion[] {
  // Same rows, same order as `canonicalQuestionBank.filter((q) => q.subject === subject)`.
  // FIGURES-ALL-SURFACES-1: a row whose stem demands a supplied figure that no binder
  // entry supplies is never drawn. Filtered on the SOURCE rows, before the mapping —
  // `fromCanonical` drops `requiresDiagram`, so the pool item could not be checked.
  const canonical = getBankRowsForSubject(subject)
    .filter((q) => !needsMissingFigure(q))
    .map(fromCanonical);
  const predicted = (
    subject === "Science" ? sciencePredictedQuestions : predictedQuestions
  )
    .filter((q) => !needsMissingFigure(q))
    .map(fromPredicted);

  // NO REPEATS IN A SET (BANK-SPLIT-1): dedupe by id and by questionKey (stem AND
  // option set, so different MCQs sharing a generic stem both stay). When rows share
  // a key the keeper follows the ruling: a pyqYear row, else a row NOT in
  // AI_GENERATED_QUESTION_IDS, else the earlier row in bank order (canonical first).
  // Survivors keep their bank order.
  const candidates = [...canonical, ...predicted]
    .filter((q) => chapterSlugs.has(q.topicSlug))
    .map((q) => ({ q, key: questionKey(q) }));
  const keeperRank = (q: FMPoolQuestion) =>
    (q.pyqYear ? 0 : 2) + (isAiGeneratedBankId(q.id) ? 1 : 0);
  const keeperByKey = new Map<string, FMPoolQuestion>();
  for (const { q, key } of candidates) {
    const current = keeperByKey.get(key);
    if (!current || keeperRank(q) < keeperRank(current)) keeperByKey.set(key, q);
  }
  const out: FMPoolQuestion[] = [];
  const seenIds = new Set<string>();
  for (const { q, key } of candidates) {
    const idKey = q.id || q.questionText;
    if (seenIds.has(idKey) || keeperByKey.get(key) !== q) continue;
    seenIds.add(idKey);
    out.push(q);
  }
  return out;
}

/** djb2 — a tiny stable string hash to derive a distinct sub-seed per
 *  (section × chapter) cell from the paper's seed. */
function hashCell(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Draw one fresh Full Mock for a subject. The paper is allocated by CBSE unit marks
 * (`allocateUnitSlots`): every unit gets the section mix that lands its marks on the
 * CBSE total, its slots are shared between its chapters, and each (section x chapter)
 * cell is drawn through `drawBalancedSet` for the PYQ/fresh mix. Deterministic for a
 * given seed.
 */
export function drawFullMock(args: {
  subject: FMSubject;
  grade?: string;
  worksheetId: string;
  code: string;
  name: string;
  seed: number;
  pyqTargetFraction?: number;
  createdAt?: string;
}): DrawnFullMock {
  const { subject, worksheetId, code, name, seed } = args;
  const chapterWeights = fullMockChapterWeights(subject);
  const slugSet = new Set(chapterWeights.map((c) => c.slug));
  const pool = buildUnionPool(subject, slugSet);
  const labelBySlug = new Map(chapterWeights.map((c) => [c.slug, c.label]));
  const units = fullMockUnits(subject);
  const chaptersOfUnit = (unit: string) => chapterWeights.filter((c) => c.unit === unit);

  const used = new Set<string>();
  const notUsed = (q: FMPoolQuestion) => !used.has(q.id || q.questionText);
  const markUsed = (qs: FMPoolQuestion[]) => qs.forEach((q) => used.add(q.id || q.questionText));

  const sectionPools = FM_BLUEPRINT.map((spec) => sectionPool(pool, spec.section));
  const availableIn = (i: number, slug: string) =>
    sectionPools[i].filter((q) => q.topicSlug === slug).length;
  const available: Record<string, number[]> = {};
  for (const u of units) {
    available[u.unit] = FM_BLUEPRINT.map((_, i) =>
      chaptersOfUnit(u.unit).reduce((sum, c) => sum + availableIn(i, c.slug), 0),
    );
  }
  // Within the pool's real availability. If NO split fits the pool, the uncapped split
  // keeps the unit-marks shape and the thin cells simply come up short — reported
  // through `unitMarks` / `unitMarksExact`, never re-targeted to another unit.
  const slots =
    allocateUnitSlots({ units, available, seed }) ??
    allocateUnitSlots({
      units,
      available: Object.fromEntries(units.map((u) => [u.unit, FM_BLUEPRINT.map((s) => s.targetCount)])),
      seed,
    });

  const bySection = new Map<FMSection, FMPoolQuestion[]>();
  FM_BLUEPRINT.forEach((spec, i) => {
    const chosen: FMPoolQuestion[] = [];
    for (const u of units) {
      const want = slots?.[u.unit]?.[i] ?? 0;
      if (want <= 0) continue;
      const chapters = chaptersOfUnit(u.unit);
      const split = splitAcrossChapters(
        want,
        chapters.map((c) => ({ slug: c.slug, weight: c.percent, available: availableIn(i, c.slug) })),
        seed ^ hashCell(`${spec.section}:unit:${u.unit}`),
      );
      for (const c of chapters) {
        const n = split.get(c.slug) ?? 0;
        if (n <= 0) continue;
        const cell = sectionPools[i].filter((q) => q.topicSlug === c.slug && notUsed(q));
        const r = drawBalancedSet({
          pool: cell,
          count: n,
          pyqTargetFraction: args.pyqTargetFraction,
          seed: seed ^ hashCell(`${spec.section}:${c.slug}`),
        });
        markUsed(r.drawn);
        chosen.push(...r.drawn);
      }
    }
    // Only reachable when NO split fits the pool (the uncapped fallback above): a cell came
    // up short, so the section is topped up from its remaining real pool. The unit marks
    // are then NOT exact — and the draw says so per unit (`unitMarks`, `unitMarksExact`),
    // the setup legend shows "N of M marks". Nothing is padded or fabricated.
    const shortfall = spec.targetCount - chosen.length;
    if (shortfall > 0) {
      const r = drawBalancedSet({
        pool: sectionPools[i].filter(notUsed),
        count: shortfall,
        pyqTargetFraction: args.pyqTargetFraction,
        seed: seed ^ hashCell(`${spec.section}:redistribute`),
      });
      markUsed(r.drawn);
      chosen.push(...r.drawn);
    }
    bySection.set(spec.section, chosen);
  });

  // CBQ-1 PR-2 — CBSE's 50 / 20 / 30 marks typology. A swap group is ONE section x ONE CBSE
  // unit: every row in it carries the section's exact marks, so a swap keeps each unit's
  // marks, each section's count, the Section A key bar and the no-repeat rule. A swap
  // prefers the same chapter and the same PYQ class. A short subject keeps its real rows
  // and reports the shortfall.
  const unitOf = (q: FMPoolQuestion) => chapterUnit(q.topicSlug)?.unit ?? "?";
  const groupPools = new Map<string, FMPoolQuestion[]>();
  FM_BLUEPRINT.forEach((spec, i) => {
    for (const q of sectionPools[i]) {
      const g = `${spec.section}:${unitOf(q)}`;
      const list = groupPools.get(g);
      if (list) list.push(q);
      else groupPools.set(g, [q]);
    }
  });
  const balanced = balanceCbqShare({
    slots: FM_BLUEPRINT.flatMap((spec) =>
      (bySection.get(spec.section) ?? []).map((q) => ({
        group: `${spec.section}:${unitOf(q)}`,
        objective: spec.section === "A",
        item: q,
      })),
    ),
    groupPools,
    keyOf: questionKey,
    isPyq: isPYQQuestion,
    affinityOf: (q) => q.topicSlug,
    seed: seed ^ hashCell("FM:cbq"),
  });
  for (const spec of FM_BLUEPRINT) {
    bySection.set(
      spec.section,
      balanced.slots.filter((s) => s.group.startsWith(`${spec.section}:`)).map((s) => s.item),
    );
  }

  // Assemble in board order A→E, numbered 1..N.
  const questions: PersistedWorksheetQuestion[] = [];
  let qNumber = 1;
  for (const spec of FM_BLUEPRINT) {
    for (const q of bySection.get(spec.section) ?? []) {
      questions.push({
        qNumber: qNumber++,
        id: q.id,
        subject,
        topicKey: q.topicSlug,
        topicLabel: labelBySlug.get(q.topicSlug) ?? resolveTopicDisplayName(subject, q.topicSlug),
        section: spec.section,
        marks: q.marks,
        questionText: q.questionText,
        options: q.options,
        solutionSteps: q.solutionSteps,
        finalAnswer: q.finalAnswer,
        answer: q.answer,
      });
    }
  }

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const blueprint: FMBlueprintRow[] = FM_BLUEPRINT.map((spec) => {
    const rows = questions.filter((q) => q.section === spec.section);
    return {
      ...spec,
      actualCount: rows.length,
      actualMarks: rows.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    };
  });
  const objectiveCount = questions.filter((q) => q.section === "A").length;

  // Marks per CBSE unit, from the questions actually on the paper.
  const unitMarks: FMUnitMarks[] = units.map((u) => ({
    unit: u.unit,
    name: u.name,
    target: u.marks,
    actual: questions
      .filter((q) => chapterUnit(String(q.topicKey))?.unit === u.unit)
      .reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
  }));

  // Classify the REAL mix off the final selection — one source of truth.
  const drawnPool = new Map<string, FMPoolQuestion>();
  for (const q of pool) drawnPool.set(q.id || q.questionText, q);
  let pyqCount = 0;
  for (const q of questions) {
    const src = drawnPool.get(q.id || q.questionText);
    if (src && isPYQQuestion(src)) pyqCount += 1;
  }

  const paper: PersistedWorksheet = {
    worksheetId,
    createdAt: args.createdAt ?? new Date().toISOString(),
    title: name,
    subject,
    grade: args.grade ?? "10",
    sectionFilter: "A-E",
    totalMarks,
    questions,
    code,
    name,
  };

  return {
    paper,
    blueprint,
    chapterWeights,
    unitMarks,
    unitMarksExact: unitMarks.every((u) => u.actual === u.target),
    objectiveCount,
    subjectiveCount: questions.length - objectiveCount,
    totalMarks,
    pyqCount,
    freshCount: questions.length - pyqCount,
    enoughQuestions: questions.length >= MIN_MOCK_QUESTIONS,
    cbqMarks: balanced.share.cbqMarks,
    cbqTarget: balanced.share.cbqTarget,
    cbqShortfall: balanced.share.cbqShortfall,
    plainMcqMarks: balanced.share.plainMcqMarks,
    constructedMarks: balanced.share.constructedMarks,
  };
}

/** The subjective (Sections B–E) questions — written on paper and uploaded. */
export function fullMockSubjectiveQuestions(paper: PersistedWorksheet): PersistedWorksheetQuestion[] {
  return paper.questions.filter((q) => String(q.section).toUpperCase() !== "A");
}

/** The objective (Section A) questions — auto-graded 0-or-full on submit. */
export function fullMockObjectiveQuestions(paper: PersistedWorksheet): PersistedWorksheetQuestion[] {
  return paper.questions.filter((q) => String(q.section).toUpperCase() === "A");
}
