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
 *  25), matching the locked prototype's "even · MI-weighted" example. Retained for
 *  the single-target `miBoostTopicKey` path + its unit test; FIX-3 multi-topic
 *  enrichment uses `allocateMiCounts` (proportional across all weak topics). */
export const MI_BOOST = 1.5;

// ── FIX-3: MI-aware BETWEEN-topic allocation (proportional · floor · cap) ─────
/** Per-topic MI cap for 3+ in-scope topics: no single topic exceeds ~half the
 *  worksheet (a tilt, not a takeover — stops a multi-topic sheet degenerating to
 *  one topic). */
export const MI_CAP_FRACTION_MANY = 0.5;
/** Per-topic MI cap for a 2-topic mix: the looser ~60% ceiling preserves the locked
 *  15:10-of-25 enrichment tilt (owner decision 2026-07-10 — cap engages at 3+ only). */
export const MI_CAP_FRACTION_TWO = 0.6;

/** The MI per-topic cap fraction for `topicCount` in-scope topics. */
export function miCapFractionFor(topicCount: number): number {
  return topicCount >= 3 ? MI_CAP_FRACTION_MANY : MI_CAP_FRACTION_TWO;
}

export interface MiTopicAllocInput extends TopicAllocInput {
  /** Real marks lost on this in-scope topic (0 = no MI signal → no boost, keeps floor). */
  marksLost: number;
}

/**
 * FIX-3 — allocate `requested` questions across in-scope topics with THREE guarantees
 * layered on the tested largest-remainder primitive (`allocateCounts`):
 *   1. FLOOR — every topic the student chose keeps a minimum (~half its no-MI fair
 *      share, never below 1 while its pool allows). A zero-MI topic gets no boost but
 *      keeps its floor — the selection is intent; MI only tilts, never overrules it.
 *   2. PROPORTIONAL enrichment — the ABOVE-FLOOR remainder is split proportionally to
 *      real marks lost, so the topics the student loses the most marks on get the extra
 *      weight (level 1).
 *   3. CAP + AVAILABILITY — no topic exceeds `capFraction` of the total, and nothing
 *      exceeds a topic's REAL drawable pool (the #353 lesson: an un-suppliable boost is
 *      never fabricated). If per-topic caps would leave the sheet short while real
 *      questions remain, the gap is filled honestly rather than the count under-drawn.
 * Total allocated == min(requested, total availability). Deterministic (unit-testable).
 */
export function allocateMiCounts(
  rows: MiTopicAllocInput[],
  requested: number,
  capFraction: number,
): TopicAllocRow[] {
  const out: TopicAllocRow[] = rows.map((r) => ({ ...r, allocated: 0 }));
  if (out.length === 0 || requested <= 0) return out;

  const capacity = out.reduce((s, r) => s + Math.max(0, r.available), 0);
  const target = Math.min(requested, capacity);
  if (target <= 0) return out;

  const baseRows: TopicAllocInput[] = rows.map((r) => ({
    key: r.key,
    label: r.label,
    weight: r.weight,
    available: r.available,
  }));

  // No-MI fair share (even / weightage) → the FLOOR baseline.
  const base = allocateCounts(baseRows, target);

  // Per-topic hard ceiling: the cap AND real availability.
  const capCount = Math.max(1, Math.floor(target * capFraction));
  const hi = out.map((r) => Math.min(Math.max(0, r.available), capCount));

  // Floors: ~half the fair share, never below 1 while the pool allows; 0 only when the
  // fair share is itself 0 (more topics than questions — honest, not everyone gets one).
  const floors = out.map((_, i) =>
    base[i].allocated > 0 ? Math.min(hi[i], Math.max(1, Math.floor(base[i].allocated * 0.5))) : 0,
  );
  for (let i = 0; i < out.length; i += 1) out[i].allocated = floors[i];

  // Enrichment remainder → proportional to marks lost, within the residual (cap−floor) room.
  const usedFloor = floors.reduce((s, v) => s + v, 0);
  const remainder = allocateCounts(
    rows.map((r, i) => ({
      key: r.key,
      label: r.label,
      weight: Math.max(0, r.marksLost),
      available: hi[i] - floors[i],
    })),
    target - usedFloor,
  );
  for (let i = 0; i < out.length; i += 1) out[i].allocated += remainder[i].allocated;

  // Honest top-up: if per-topic caps blocked the target while real questions remain,
  // fill the gap (availability-bound) so the sheet is never short when the bank is not.
  const placed = out.reduce((s, r) => s + r.allocated, 0);
  if (placed < target) {
    const top = allocateCounts(
      rows.map((r, i) => ({
        key: r.key,
        label: r.label,
        weight: r.marksLost > 0 ? r.marksLost : 1,
        available: Math.max(0, r.available) - out[i].allocated,
      })),
      target - placed,
    );
    for (let i = 0; i < out.length; i += 1) out[i].allocated += top[i].allocated;
  }

  return out;
}

export interface WorksheetPlanParams {
  subject: LTSubjectKey;
  scope: PaperScope;
  /** In-scope topics already resolved (single → 1; multi → picked; full → all). */
  topics: WorksheetTopic[];
  sections?: string[]; // undefined = all sections
  difficulty?: DifficultyChoice;
  requested: number;
  /** Weak-topic slug to boost when MI-enrich is on (must be in `topics`). Drives the
   *  single-target cross-TOPIC re-weight (legacy path; FIX-3 prefers miTopicWeights). */
  miBoostTopicKey?: string | null;
  /**
   * FIX-3 — BETWEEN-topic marks-lost weights (multi-topic / full-subject scope): topic
   * key → real marks lost (0 or absent = no MI signal → no boost, keeps its floor).
   * When present (and non-empty) the plan allocates via `allocateMiCounts` (proportional
   * enrichment with a floor + cap), superseding the single-target `miBoostTopicKey`.
   */
  miTopicWeights?: Record<string, number> | null;
  /** Per-topic MI cap fraction (see `miCapFractionFor`); defaults from the topic count. */
  miCapFraction?: number;
  /**
   * FIX A — WITHIN-topic section skew (single-topic scope): CBSE section letter →
   * draw-weight multiplier (≥1) for the student's weak sections, from the derived
   * Mistake-Intelligence selector (worksheetMiSelector.sectionBoostsFor). ADDITIVE:
   * when present it biases each topic's own draw toward the boosted sections (capped
   * at real per-section availability — never fabricated); when absent the draw is the
   * original uniform pool sample, so the cross-topic boost behaviour is unchanged.
   */
  sectionBoosts?: Record<string, number> | null;
  /**
   * FIX-3 — PER-TOPIC within-topic section skew (multi-topic / full-subject scope):
   * topic key → its own section-boost map. Stacks level 2 ON TOP of the level-1
   * between-topic allocation, so each in-scope topic's own draw skews toward the
   * sections that topic loses the most marks on. A topic absent here draws uniformly.
   */
  topicSectionBoosts?: Record<string, Record<string, number>> | null;
}

export interface WorksheetPlan {
  rows: TopicAllocRow[];
  requested: number;
  totalAvailable: number;
  totalAllocated: number;
  /** Unique pools per topic key (already filtered) — reused for generation. */
  pools: Map<string, PracticeQuestion[]>;
  /** FIX A — within-topic section-skew weights carried onto the plan so
   *  generateFromPlan can bias each topic's draw (null / absent = uniform draw). */
  sectionBoosts?: Record<string, number> | null;
  /** FIX-3 — per-topic within-topic section-skew (multi/full scope); topic key → its
   *  own section-boost map. Takes precedence over `sectionBoosts` for that topic. */
  topicSectionBoosts?: Record<string, Record<string, number>> | null;
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

  const baseInputs: TopicAllocInput[] = params.topics.map((t) => ({
    key: t.key,
    label: t.label,
    weight: weightMode === "weightage" ? weightFor(params.subject, t.key) ?? 1 : 1,
    available: pools.get(t.key)?.length ?? 0,
  }));

  // FIX-3 — proportional marks-lost enrichment (floor + cap) when in-scope MI weights
  // are supplied; otherwise the base split, optionally the legacy single-target boost.
  const miWeights = params.miTopicWeights;
  let rows: TopicAllocRow[];
  if (miWeights && Object.keys(miWeights).length > 0) {
    const miInputs: MiTopicAllocInput[] = baseInputs.map((r) => ({
      ...r,
      marksLost: Math.max(0, miWeights[r.key] ?? 0),
    }));
    rows = allocateMiCounts(
      miInputs,
      params.requested,
      params.miCapFraction ?? miCapFractionFor(baseInputs.length),
    );
  } else {
    const inputs = baseInputs.map((r) => ({
      ...r,
      weight: params.miBoostTopicKey && r.key === params.miBoostTopicKey ? r.weight * MI_BOOST : r.weight,
    }));
    rows = allocateCounts(inputs, params.requested);
  }
  const totalAvailable = baseInputs.reduce((s, r) => s + r.available, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);

  return {
    rows,
    requested: params.requested,
    totalAvailable,
    totalAllocated,
    pools,
    sectionBoosts: params.sectionBoosts ?? null,
    topicSectionBoosts: params.topicSectionBoosts ?? null,
  };
}

// ── PR-A: worksheet nomenclature (code + friendly name) ──────────────────────
// Display-only naming for the grade redesign — shown on the scorecard, the
// on-screen graded sheet, and the PDF. Code: `WS-{S}-{TOPIC}-{NN}` (e.g.
// `WS-M-RN-03` = Worksheet · Maths · Real Numbers · #3); friendly:
// `Real Numbers · Worksheet 3`. Topic abbreviations reuse the extraction-ID set;
// MIX = multi-topic, FULL = full-subject. PR-A uses the DEVICE-LOCAL count (the
// store list is passed in, so this stays a pure, testable function); PR-B makes
// the sequence durable + cross-device.

const TOPIC_ABBR: Record<string, string> = {
  "real-numbers": "RN",
  polynomials: "PO",
  "pair-of-linear-equations": "LE",
  "quadratic-equations": "QE",
  "arithmetic-progression": "AP",
  triangles: "TRI",
  "coordinate-geometry": "CG",
  circles: "CI",
  "areas-related-to-circles": "AC",
  "surface-areas-and-volumes": "SV",
  trigonometry: "TR",
  statistics: "ST",
  probability: "PR",
  "chemical-reactions-equations": "CRE",
  "acids-bases-salts": "ABS",
  "metals-non-metals": "MNM",
  "carbon-and-its-compounds": "CC",
  "life-processes": "LP",
  "control-and-coordination": "CAC",
  reproduction: "REP",
  light: "LRR",
  electricity: "ELE",
  "our-environment": "OE",
};

/** Topic → short code (extraction-ID set). Falls back to derived initials so a
 *  new/unmapped topic never breaks the code. */
export function topicAbbr(key: string): string {
  const k = String(key || "").trim().toLowerCase();
  if (TOPIC_ABBR[k]) return TOPIC_ABBR[k];
  const derived = k
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return derived || "WS";
}

/** Lightweight stored-worksheet row used to compute the device-local sequence. */
export interface StoredWorksheetLite {
  worksheetId: string;
  subject: string;
  createdAt: string;
  title: string;
  topicKeys: string[];
}

export interface WorksheetNomenclature {
  /** `WS-{S}-{TOPIC}-{NN}` — e.g. `WS-M-RN-03`. */
  code: string;
  /** Friendly name — e.g. `Real Numbers · Worksheet 3`. */
  name: string;
  kind: "single" | "multi" | "full";
  sequence: number;
}

/** A worksheet shaped just enough to name it (a structural subset of
 *  PersistedWorksheet — no store import needed). */
interface NameableWorksheet {
  worksheetId: string;
  subject: string;
  createdAt: string;
  title: string;
  questions: Array<{ topicKey: string; topicLabel: string }>;
}

function subjectLetterOf(subject: string): "M" | "S" {
  return /sci/i.test(String(subject || "")) ? "S" : "M";
}

/** Group key a worksheet's sequence counts within (single → per-topic; multi →
 *  MIX; full → FULL), scoped to the subject. */
function groupKeyOf(subject: string, title: string, topicKeys: string[]): string {
  const sl = subjectLetterOf(subject);
  const distinct = Array.from(new Set(topicKeys.filter(Boolean)));
  if (distinct.length <= 1) return `${sl}:${distinct[0] ?? ""}`;
  return /^full\b/i.test(String(title || "").trim()) ? `${sl}:FULL` : `${sl}:MIX`;
}

/**
 * Build a worksheet's display name + code. The sequence `#NN` is this
 * worksheet's 1-based rank (by createdAt) among the stored worksheets sharing its
 * (subject, topic-group) — so it is stable for a given worksheet and matches the
 * order they were generated. Pure: the store list is supplied by the caller.
 */
export function worksheetNomenclature(
  ws: NameableWorksheet,
  allStored: StoredWorksheetLite[],
): WorksheetNomenclature {
  const subject = String(ws.subject || "Maths");
  const sl = subjectLetterOf(subject);
  const distinct = Array.from(new Set(ws.questions.map((q) => q.topicKey).filter(Boolean)));
  const isFull = /^full\b/i.test(String(ws.title || "").trim());
  const kind: "single" | "multi" | "full" =
    distinct.length <= 1 ? "single" : isFull ? "full" : "multi";

  let token: string;
  let topicLabel: string;
  if (kind === "single") {
    const key = distinct[0] ?? "";
    token = topicAbbr(key);
    topicLabel = ws.questions.find((q) => q.topicKey === key)?.topicLabel || key || subject;
  } else if (kind === "full") {
    token = "FULL";
    topicLabel = `${subject} Full`;
  } else {
    token = "MIX";
    topicLabel = `${subject} Mixed`;
  }

  const groupKey = groupKeyOf(subject, ws.title, distinct);
  const sameGroup = allStored
    .filter((w) => groupKeyOf(w.subject, w.title, w.topicKeys) === groupKey)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const idx = sameGroup.findIndex((w) => w.worksheetId === ws.worksheetId);
  const sequence = (idx >= 0 ? idx : sameGroup.length) + 1;

  const code = `WS-${sl}-${token}-${String(sequence).padStart(2, "0")}`;
  const name = `${topicLabel} · Worksheet ${sequence}`;
  return { code, name, kind, sequence };
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Does this boost map actually raise any section above the neutral 1.0? */
function hasEffectiveBoost(sectionBoosts?: Record<string, number> | null): boolean {
  return !!sectionBoosts && Object.values(sectionBoosts).some((w) => Number(w) > 1);
}

/**
 * FIX A — order a single topic's pool so that taking the first `allocated` questions
 * yields a section mix skewed toward the boosted (weak) sections. Reuses the tested
 * `allocateCounts` over the pool's SECTIONS: each section's base weight is its natural
 * share of the pool (so with no boost the mix ≈ the pool's own composition) times its
 * boost multiplier; the allocation is capped at each section's REAL availability, so
 * the skew is honest — a weak section with no questions in the filtered pool simply
 * contributes nothing (never fabricated). Sections not present in the pool are absent.
 * Returns the pool reordered as [skewed head … remainder], both internally shuffled.
 */
function orderPoolBySectionBoost(
  pool: PracticeQuestion[],
  allocated: number,
  sectionBoosts: Record<string, number>,
): PracticeQuestion[] {
  const bySection = new Map<string, PracticeQuestion[]>();
  for (const q of pool) {
    const s = String(q.section || "").toUpperCase();
    const arr = bySection.get(s);
    if (arr) arr.push(q);
    else bySection.set(s, [q]);
  }
  if (bySection.size <= 1) return shuffleInPlace([...pool]); // nothing to skew between
  for (const arr of bySection.values()) shuffleInPlace(arr);

  const total = pool.length || 1;
  const inputs: TopicAllocInput[] = [...bySection.entries()].map(([s, arr]) => ({
    key: s,
    label: s,
    weight: (arr.length / total) * (Number(sectionBoosts[s]) > 0 ? Number(sectionBoosts[s]) : 1),
    available: arr.length,
  }));
  const alloc = allocateCounts(inputs, allocated);

  const head: PracticeQuestion[] = [];
  const tail: PracticeQuestion[] = [];
  for (const row of alloc) {
    const arr = bySection.get(row.key) ?? [];
    head.push(...arr.slice(0, row.allocated));
    tail.push(...arr.slice(row.allocated));
  }
  // head.length === min(allocated, total), so taking the first `allocated` from the
  // returned list yields exactly the boosted per-section counts.
  return [...shuffleInPlace(head), ...shuffleInPlace(tail)];
}

/**
 * Generate the worksheet question set from a plan: take exactly `allocated`
 * unique questions per topic (randomly chosen from that topic's pool), dedupe
 * across topics by id, then shuffle the combined set so it is not clumped by
 * topic. The output length equals the plan's totalAllocated == the shown count.
 *
 * When a topic carries section boosts — `topicSectionBoosts[key]` (FIX-3 per-topic
 * multi/full enrichment) or the shared `sectionBoosts` (FIX A single-topic) — that
 * topic's draw is skewed toward the boosted sections via `orderPoolBySectionBoost`;
 * otherwise the draw is the original uniform pool sample (unchanged behaviour).
 */
export function generateFromPlan(plan: WorksheetPlan): PracticeQuestion[] {
  const seen = new Set<string>();
  const collected: PracticeQuestion[] = [];
  for (const row of plan.rows) {
    if (row.allocated <= 0) continue;
    const basePool = plan.pools.get(row.key) ?? [];
    const boosts = plan.topicSectionBoosts?.[row.key] ?? plan.sectionBoosts ?? null;
    const ordered = hasEffectiveBoost(boosts)
      ? orderPoolBySectionBoost(basePool, row.allocated, boosts as Record<string, number>)
      : shuffleInPlace([...basePool]);
    let taken = 0;
    for (const q of ordered) {
      if (taken >= row.allocated) break;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      collected.push(q);
      taken += 1;
    }
  }
  return shuffleInPlace(collected);
}
