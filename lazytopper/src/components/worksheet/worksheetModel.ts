// src/components/worksheet/worksheetModel.ts
//
// PR-E2a — Worksheet rebuild: the pure, testable model layer behind the one
// responsive worksheet generator. This file owns everything that is NOT React:
//
//   1. The canonical Class 10 worksheet topic lists (Maths + Science) — the SAME
//      slugs the production generator (predictionDataService) keys on.
//   2. CONTENT CORRECTNESS — the deleted-topics filter. Two topic entries that
//      ship today (`heredity-and-evolution`, `magnetic-effects`) are OUT of the
//      board-assessed CBSE 2026-27 scope and must never be OFFERED on the
//      worksheet surface. The exact reasons trace to scripts/src/syllabusGuard.ts
//      (re-read 2026-06-21): the Evolution section (Ch 9) and the Motor / EMI /
//      Generator content of Magnetic Effects (Ch 13) are formative-only /
//      board-excluded. A teacher seeing a deleted chapter offered = instant trust
//      loss (spec §5). NOTE: the guard is a build-time node script, not a runtime
//      import — so this DELETED_TOPIC_KEYS set is the runtime mirror of its
//      board-excluded list for the topics the worksheet surface exposes.
//   3. DISTRIBUTION — the explicit allocation that replaces the old accidentally
//      random "pool per topic up to full count, dedupe, shuffle, truncate":
//        • multi-topic   → EVEN split (count ÷ N), largest-remainder.
//        • full-subject  → BOARD-WEIGHTAGE split (each topic's real CBSE marks
//          weightage — the same data Exam Trends uses).
//        • MI-enrich     → re-weights toward the student's weak topic.
//      Allocation is capped at each topic's REAL available unique count, so the
//      planned split and the generated set always agree (honest counts — the
//      shown number is the number generated, never "up to 25" when fewer exist).
//
// React/UI lives in WorksheetGenerator.tsx; the downloadable PDFs render via
// WorksheetPrintDoc.tsx (HTML + MathText/KaTeX through window.print(), so math
// symbols are real); later-grading persistence in services/worksheetSessionStore.ts.

import {
  generatePracticeQuestions,
  type PracticeQuestion,
  type DifficultyChoice,
} from "../../data/predictionDataService";
import type { LTSubjectKey } from "../../data/predictionTypes";
import { class10TopicByName } from "../../data/class10MathTopicWeights";
import { class10ScienceTopicTrends } from "../../data/class10ScienceTopicTrends";

export type PaperScope = "topic" | "multi-topic" | "full-subject";
export type ScienceStream = "All" | "Physics" | "Chemistry" | "Biology";

export interface WorksheetTopic {
  key: string;
  label: string;
  /** Science only — used by the stream filter. */
  stream?: Exclude<ScienceStream, "All">;
}

// ── Canonical worksheet topic lists (slugs match the production generator) ────
export const MATHS_TOPICS: WorksheetTopic[] = [
  { key: "real-numbers", label: "Real Numbers" },
  { key: "polynomials", label: "Polynomials" },
  { key: "pair-of-linear-equations", label: "Linear Equations" },
  { key: "quadratic-equations", label: "Quadratic Equations" },
  { key: "arithmetic-progression", label: "Arithmetic Progression" },
  { key: "triangles", label: "Triangles" },
  { key: "coordinate-geometry", label: "Coordinate Geometry" },
  { key: "circles", label: "Circles" },
  { key: "areas-related-to-circles", label: "Areas Related to Circles" },
  { key: "surface-areas-and-volumes", label: "Surface Areas & Volumes" },
  { key: "trigonometry", label: "Trigonometry" },
  { key: "statistics", label: "Statistics" },
  { key: "probability", label: "Probability" },
];

// Science includes the two board-excluded entries here ONLY so the deleted-topics
// filter has something to strip; getTopics() never returns them. Keeping them in
// the raw list documents exactly what is being removed and why.
const SCIENCE_TOPICS_RAW: WorksheetTopic[] = [
  { key: "chemical-reactions-equations", label: "Chemical Reactions", stream: "Chemistry" },
  { key: "acids-bases-salts", label: "Acids, Bases & Salts", stream: "Chemistry" },
  { key: "metals-non-metals", label: "Metals & Non-Metals", stream: "Chemistry" },
  { key: "carbon-and-its-compounds", label: "Carbon Compounds", stream: "Chemistry" },
  { key: "life-processes", label: "Life Processes", stream: "Biology" },
  { key: "control-and-coordination", label: "Control & Coordination", stream: "Biology" },
  { key: "reproduction", label: "Reproduction", stream: "Biology" },
  { key: "heredity-and-evolution", label: "Heredity & Evolution", stream: "Biology" }, // DELETED — see DELETED_TOPIC_KEYS
  { key: "light", label: "Light – Reflection & Refraction", stream: "Physics" },
  { key: "electricity", label: "Electricity", stream: "Physics" },
  { key: "magnetic-effects", label: "Magnetic Effects of Current", stream: "Physics" }, // DELETED — see DELETED_TOPIC_KEYS
  { key: "our-environment", label: "Our Environment", stream: "Biology" },
];

/**
 * Topic slugs OUT of the board-assessed CBSE 2026-27 scope — never offered on the
 * worksheet surface. Mirrors scripts/src/syllabusGuard.ts (Science RULES +
 * SURFACE_BANNED_PHRASES), re-read 2026-06-21:
 *   - "heredity-and-evolution": the Evolution section (Ch 9) is formative-only /
 *     board-excluded ("Natural Selection", "Speciation", "Human Evolution",
 *     "Homologous Organs" …). Heredity/Mendel are retained but the bundled topic
 *     entry conflates them, so the owner-locked spec removes the entry whole.
 *   - "magnetic-effects": Motor / Electromagnetic Induction / Electric Generator
 *     are formative-only board exclusions (SURFACE_BANNED_PHRASES), so the
 *     Magnetic Effects chapter entry is removed from board-prep worksheets.
 */
export const DELETED_TOPIC_KEYS: ReadonlySet<string> = new Set([
  "heredity-and-evolution",
  "magnetic-effects",
]);

/** Visible topics for a subject (+ Science stream), with deleted topics removed. */
export function getTopics(
  subject: LTSubjectKey,
  stream: ScienceStream = "All",
): WorksheetTopic[] {
  const base = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS_RAW;
  return base.filter(
    (t) =>
      !DELETED_TOPIC_KEYS.has(t.key) &&
      (subject !== "Science" || stream === "All" || t.stream === stream),
  );
}

// ── Board weightage lookup (the data Exam Trends uses) ───────────────────────
// Maths worksheet slugs → canonical names in class10MathTopicWeights.
const MATHS_KEY_TO_WEIGHT_NAME: Record<string, string> = {
  "real-numbers": "Real Numbers",
  polynomials: "Polynomials",
  "pair-of-linear-equations": "Pair of Linear Equations in Two Variables",
  "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression",
  triangles: "Triangles",
  "coordinate-geometry": "Coordinate Geometry",
  circles: "Circles",
  "areas-related-to-circles": "Areas Related to Circles",
  "surface-areas-and-volumes": "Surface Areas and Volumes",
  trigonometry: "Introduction to Trigonometry",
  statistics: "Statistics",
  probability: "Probability",
};

// Science worksheet slugs → Class10ScienceTopicKey in class10ScienceTopicTrends.
const SCIENCE_KEY_TO_TREND_KEY: Record<string, string> = {
  "chemical-reactions-equations": "ChemicalReactions",
  "acids-bases-salts": "AcidsBasesSalts",
  "metals-non-metals": "MetalsNonMetals",
  "carbon-and-its-compounds": "CarbonCompounds",
  "life-processes": "LifeProcesses",
  "control-and-coordination": "ControlAndCoordination",
  reproduction: "Reproduction",
  light: "Light",
  electricity: "Electricity",
  "our-environment": "OurEnvironment",
};

/**
 * Real CBSE marks-weightage (percent) for a worksheet topic, or null if unknown.
 * Used ONLY by the full-subject board-weightage split; a null falls back to an
 * equal weight so an unmapped topic is never silently dropped.
 */
export function weightFor(subject: LTSubjectKey, key: string): number | null {
  if (subject === "Maths") {
    const name = MATHS_KEY_TO_WEIGHT_NAME[key];
    const w = name ? class10TopicByName[name] : undefined;
    return w ? w.weightagePercent : null;
  }
  const trendKey = SCIENCE_KEY_TO_TREND_KEY[key];
  const t = trendKey
    ? class10ScienceTopicTrends.topics[
        trendKey as keyof typeof class10ScienceTopicTrends.topics
      ]
    : undefined;
  return t ? t.weightagePercent : null;
}

// ── Distribution / allocation ────────────────────────────────────────────────
export interface TopicAllocInput {
  key: string;
  label: string;
  /** Relative weight (even = 1 each; full-subject = weightage%). */
  weight: number;
  /** Real available unique question count for the active filters. */
  available: number;
}

export interface TopicAllocRow extends TopicAllocInput {
  /** How many questions this topic contributes to the worksheet. */
  allocated: number;
}

/**
 * Allocate `requested` questions across topics by weight, using the
 * largest-remainder method, and capped at each topic's real availability so the
 * total allocated == min(requested, total available) — never an inflated count.
 * Deterministic (no randomness) so distribution is unit-testable.
 */
export function allocateCounts(
  rows: TopicAllocInput[],
  requested: number,
): TopicAllocRow[] {
  const out: TopicAllocRow[] = rows.map((r) => ({ ...r, allocated: 0 }));
  if (out.length === 0 || requested <= 0) return out;

  const capacity = out.reduce((s, r) => s + Math.max(0, r.available), 0);
  const target = Math.min(requested, capacity);
  if (target <= 0) return out;

  const totalWeight =
    out.reduce((s, r) => s + Math.max(0, r.weight), 0) || out.length;

  // Floor allocation by weight, capped at availability.
  const ideal = out.map((r) => (target * Math.max(0, r.weight)) / totalWeight);
  for (let i = 0; i < out.length; i += 1) {
    out[i].allocated = Math.min(out[i].available, Math.floor(ideal[i]));
  }

  let remaining = target - out.reduce((s, r) => s + r.allocated, 0);

  // Distribute the remainder by largest fractional part, honoring availability.
  const order = ideal
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  while (remaining > 0) {
    let progressed = false;
    for (const { i } of order) {
      if (remaining <= 0) break;
      if (out[i].allocated < out[i].available) {
        out[i].allocated += 1;
        remaining -= 1;
        progressed = true;
      }
    }
    if (!progressed) break; // capacity exhausted — honest shortfall
  }

  return out;
}

/** MI re-weight: the boost applied to the student's weak topic when MI-enrich is
 *  on. 1.5 makes a 2-topic even split (1:1) become roughly 3:2 (e.g. 15:10 of
 *  25), matching the locked prototype's "even · MI-weighted" example. */
export const MI_BOOST = 1.5;

export interface WorksheetPlanParams {
  subject: LTSubjectKey;
  scope: PaperScope;
  /** In-scope topics already resolved (single → 1; multi → picked; full → all). */
  topics: WorksheetTopic[];
  sections?: string[]; // undefined = all sections
  difficulty?: DifficultyChoice;
  requested: number;
  /** Weak-topic slug to boost when MI-enrich is on (must be in `topics`). */
  miBoostTopicKey?: string | null;
}

export interface WorksheetPlan {
  rows: TopicAllocRow[];
  requested: number;
  totalAvailable: number;
  totalAllocated: number;
  /** Unique pools per topic key (already filtered) — reused for generation. */
  pools: Map<string, PracticeQuestion[]>;
}

const POOL_OVERSAMPLE = 999;

/** Build the unique, filter-scoped pool for every in-scope topic (no repeats). */
function buildPools(params: WorksheetPlanParams): Map<string, PracticeQuestion[]> {
  const pools = new Map<string, PracticeQuestion[]>();
  for (const t of params.topics) {
    const pool = generatePracticeQuestions({
      subject: params.subject as LTSubjectKey,
      topicKey: t.key,
      count: POOL_OVERSAMPLE,
      difficulty:
        params.difficulty && params.difficulty !== "All"
          ? (params.difficulty as never)
          : undefined,
      sections: params.sections,
      allowRepeats: false,
    });
    pools.set(t.key, pool);
  }
  return pools;
}

/**
 * Plan the worksheet: compute real availability per topic, then allocate the
 * requested count by the scope's weighting. Pure apart from the in-memory pool
 * read; safe to call on every render to keep the live preview honest.
 */
export function planWorksheet(params: WorksheetPlanParams): WorksheetPlan {
  const pools = buildPools(params);

  const weightMode: "even" | "weightage" =
    params.scope === "full-subject" ? "weightage" : "even";

  const inputs: TopicAllocInput[] = params.topics.map((t) => {
    let weight = weightMode === "weightage" ? weightFor(params.subject, t.key) ?? 1 : 1;
    if (params.miBoostTopicKey && t.key === params.miBoostTopicKey) {
      weight *= MI_BOOST;
    }
    return {
      key: t.key,
      label: t.label,
      weight,
      available: pools.get(t.key)?.length ?? 0,
    };
  });

  const rows = allocateCounts(inputs, params.requested);
  const totalAvailable = inputs.reduce((s, r) => s + r.available, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);

  return { rows, requested: params.requested, totalAvailable, totalAllocated, pools };
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate the worksheet question set from a plan: take exactly `allocated`
 * unique questions per topic (randomly chosen from that topic's pool), dedupe
 * across topics by id, then shuffle the combined set so it is not clumped by
 * topic. The output length equals the plan's totalAllocated == the shown count.
 */
export function generateFromPlan(plan: WorksheetPlan): PracticeQuestion[] {
  const seen = new Set<string>();
  const collected: PracticeQuestion[] = [];
  for (const row of plan.rows) {
    if (row.allocated <= 0) continue;
    const pool = shuffleInPlace([...(plan.pools.get(row.key) ?? [])]);
    let taken = 0;
    for (const q of pool) {
      if (taken >= row.allocated) break;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      collected.push(q);
      taken += 1;
    }
  }
  return shuffleInPlace(collected);
}
