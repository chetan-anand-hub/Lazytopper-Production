/**
 * mistakeDisplay — THE ONE place a stored mistake type becomes something a student reads.
 *
 * SCORECARD-MI-1 (wave B-15) · owner rulings of 5 Oct 2026, fixed:
 *   knowledge gap  = conceptual               → "Marks to gain — learn this"
 *   exam technique = presentation             → "Marks to gain — the quickest wins"
 *   careless       = calculation + silly      → "Marks to gain — you already know this"
 *   "Not attempted" is its OWN state — never a mistake, never "Incorrect −N", never an MI type.
 *
 * WHAT THIS MODULE OWNS (and nothing else may re-derive):
 *   - the group each stored type belongs to, the group's label, heading, colour key and order;
 *   - ONE display name per stored type (no "Silly slip" here and "Careless slip" there);
 *   - the per-question chip picker, used by the screen AND the PDF (GA-34);
 *   - the per-step display state, including "Not attempted" and an unknown status;
 *   - the counts a surface may show (no type on a full-mark question — GA-15/D3);
 *   - the coaching line (never "Clean" while marks were lost — GA-24).
 *
 * WHAT IT DOES NOT CHANGE: the STORED type names stay `conceptual | calculation | silly |
 * presentation`. Old records are never converted. Absent means unknown, shown as unknown.
 *
 * UNITS (owner ruling, D2). Every number this module helps print is a COUNT of mistakes or
 * questions and says so ("2 mistakes"). Marks per type do not exist in today's data; nothing
 * here may print a count where a reader would read marks. PR-2 switches to marksLostByType.
 *
 * GUARD: `mistakeDisplay.guard.test.ts` fails on any other hard-coded grouping or legacy label
 * under src/. Pure module: no React, no I/O, no imports beyond types.
 */

/** The four stored type names — unchanged, never renamed in storage. */
export type StoredMistakeType = "conceptual" | "calculation" | "silly" | "presentation";

export const STORED_MISTAKE_TYPES: readonly StoredMistakeType[] = [
  "conceptual",
  "calculation",
  "silly",
  "presentation",
];

export type MistakeTypeCounts = Record<StoredMistakeType, number>;

/** Any record that may carry the four counts (a grader summary, a stored fourType, a legacy
 *  entry). Fields may be missing or junk; `toCounts` makes them four honest numbers. */
export type CountsLike = {
  conceptual?: unknown;
  calculation?: unknown;
  silly?: unknown;
  presentation?: unknown;
} | null | undefined;

export type MistakeGroupKey = "knowledge" | "technique" | "careless";

export interface MistakeGroup {
  key: MistakeGroupKey;
  /** The group's short name ("Knowledge gap"). */
  label: string;
  /** The owner's heading, verbatim. */
  heading: string;
  /** The stored types this group collects. */
  types: readonly StoredMistakeType[];
  /** Colour key a renderer maps to its own palette ("gap" | "technique" | "careless"). */
  colorKey: "gap" | "technique" | "careless";
  /** Short CSS-class suffix the PDFs use ("con" | "tech" | "care"). */
  cls: "con" | "tech" | "care";
}

/** The three groups, IN DISPLAY ORDER. */
export const MISTAKE_GROUPS: readonly MistakeGroup[] = [
  {
    key: "knowledge",
    label: "Knowledge gap",
    heading: "Marks to gain — learn this",
    types: ["conceptual"],
    colorKey: "gap",
    cls: "con",
  },
  {
    key: "technique",
    label: "Exam technique",
    heading: "Marks to gain — the quickest wins",
    types: ["presentation"],
    colorKey: "technique",
    cls: "tech",
  },
  {
    key: "careless",
    label: "Careless",
    heading: "Marks to gain — you already know this",
    types: ["calculation", "silly"],
    colorKey: "careless",
    cls: "care",
  },
];

/** The fourth state. Not a mistake and not a group: it never carries a type, never enters MI. */
export const NOT_ATTEMPTED = {
  key: "not-attempted" as const,
  label: "Not attempted",
  note: "Not attempted — not counted as a mistake.",
};

/** ONE display name per stored type. */
export const MISTAKE_TYPE_LABEL: Readonly<Record<StoredMistakeType, string>> = {
  conceptual: "Concept gap",
  calculation: "Calculation slip",
  silly: "Silly slip",
  presentation: "Presentation",
};

/** The heading over the per-kind block. It counts MISTAKES, so it must not claim marks (D2). */
export const MISTAKES_BY_KIND_HEADING = "Mistakes the examiner found, by kind";

/** The heading over a graded sheet's coaching line (it used to read "Where your marks went",
 *  which claimed marks the line does not carry until PR-2). */
export const COACHING_HEADING = "What to work on next";

export function isStoredMistakeType(value: unknown): value is StoredMistakeType {
  return typeof value === "string" && (STORED_MISTAKE_TYPES as readonly string[]).includes(value);
}

/** The display name for a stored type, or null for anything else (honest silence). */
export function mistakeTypeLabel(type: unknown): string | null {
  return isStoredMistakeType(type) ? MISTAKE_TYPE_LABEL[type] : null;
}

/** The group a stored type belongs to, or null for an unknown value. */
export function mistakeGroupOf(type: unknown): MistakeGroup | null {
  if (!isStoredMistakeType(type)) return null;
  return MISTAKE_GROUPS.find((g) => g.types.includes(type)) ?? null;
}

export function mistakeGroupByKey(key: MistakeGroupKey): MistakeGroup {
  return MISTAKE_GROUPS.find((g) => g.key === key) as MistakeGroup;
}

/** True ONLY for a knowledge-gap type — the single weak-area bridge predicate (GA-21). */
export function isKnowledgeGapType(type: unknown): boolean {
  return mistakeGroupOf(type)?.key === "knowledge";
}

/** True for the careless group (calculation + silly). */
export function isCarelessType(type: unknown): boolean {
  return mistakeGroupOf(type)?.key === "careless";
}

/** True for the exam-technique group (presentation). */
export function isTechniqueType(type: unknown): boolean {
  return mistakeGroupOf(type)?.key === "technique";
}

/** A zero four-type record. */
export function zeroCounts(): MistakeTypeCounts {
  return { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
}

/** Coerce any partial / legacy count record into four finite, non-negative numbers. */
export function toCounts(raw: CountsLike): MistakeTypeCounts {
  const out = zeroCounts();
  if (!raw) return out;
  for (const t of STORED_MISTAKE_TYPES) {
    const n = Number(raw[t]);
    out[t] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

export function addCounts(a: MistakeTypeCounts, b: MistakeTypeCounts): MistakeTypeCounts {
  const out = zeroCounts();
  for (const t of STORED_MISTAKE_TYPES) out[t] = a[t] + b[t];
  return out;
}

export function totalCount(counts: MistakeTypeCounts): number {
  return STORED_MISTAKE_TYPES.reduce((s, t) => s + counts[t], 0);
}

/** Per-group counts (mistake COUNTS, never marks). */
export function groupCounts(counts: CountsLike): Record<MistakeGroupKey, number> {
  const c = toCounts(counts);
  const out: Record<MistakeGroupKey, number> = { knowledge: 0, technique: 0, careless: 0 };
  for (const g of MISTAKE_GROUPS) out[g.key] = g.types.reduce((s, t) => s + c[t], 0);
  return out;
}

export interface MistakeGroupRow {
  group: MistakeGroup;
  count: number;
  types: Array<{ type: StoredMistakeType; label: string; count: number }>;
}

/** The three groups in display order, each with its member types and counts. */
export function groupRows(counts: CountsLike): MistakeGroupRow[] {
  const c = toCounts(counts);
  return MISTAKE_GROUPS.map((group) => ({
    group,
    count: group.types.reduce((s, t) => s + c[t], 0),
    types: group.types.map((type) => ({ type, label: MISTAKE_TYPE_LABEL[type], count: c[type] })),
  }));
}

/** "1 mistake" / "3 mistakes" — every number carries its real unit (D2). */
export function countWithUnit(n: number, singular = "mistake", plural?: string): string {
  const v = Number(n) || 0;
  return `${v} ${v === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/* ── per-question display state ─────────────────────────────────────────────── */

/** The minimal shape of one graded question every surface already carries. */
export interface GradedQuestionLike {
  couldNotRead?: boolean;
  totalMarks?: number | null;
  marksAwarded?: number | null;
  mistakeSummary?: CountsLike;
  annotatedSteps?: ReadonlyArray<StepLike> | null;
  objective?: boolean | null;
}

export interface StepLike {
  status?: string | null;
  mistakeType?: string | null;
  marksDeducted?: number | null;
  marksAwarded?: number | null;
}

/** Marks lost on one question (total − awarded, never negative). */
export function marksLostOn(q: GradedQuestionLike): number {
  if (q.couldNotRead) return 0;
  return Math.max(0, (Number(q.totalMarks) || 0) - (Number(q.marksAwarded) || 0));
}

/** Count of steps carrying each stored type. */
export function stepTypeCounts(steps: ReadonlyArray<StepLike> | null | undefined): MistakeTypeCounts {
  const out = zeroCounts();
  for (const s of steps ?? []) {
    if (isStoredMistakeType(s?.mistakeType) && !isNotAttemptedStatus(s?.status)) out[s.mistakeType] += 1;
  }
  return out;
}

/**
 * The type counts a surface may SHOW for one question — the SAME numbers on the scorecard,
 * both PDFs, the C&I chips, the session record and MI (G3: one function, applied once).
 *   - couldNotRead → nothing (it was not graded);
 *   - full marks (nothing lost, which includes a right-option MCQ) → nothing: a type is never
 *     shown on a question that lost no mark (owner ruling; D3);
 *   - otherwise, per type, the larger of the grader's reconciled summary and the number of
 *     its steps carrying that type — the grader's own rule (max of claim and steps), applied
 *     identically everywhere so MI and the scorecard can no longer disagree (GA-20).
 *     Never invented: a type nobody reported stays zero.
 */
export function effectiveTypeCounts(q: GradedQuestionLike): MistakeTypeCounts {
  if (q.couldNotRead) return zeroCounts();
  if (marksLostOn(q) <= 0) return zeroCounts();
  const summary = toCounts(q.mistakeSummary);
  const steps = stepTypeCounts(q.annotatedSteps);
  const out = zeroCounts();
  for (const t of STORED_MISTAKE_TYPES) out[t] = Math.max(summary[t], steps[t]);
  return out;
}

/**
 * The response every downstream reader should receive: each legible question's
 * `mistakeSummary` replaced by its `effectiveTypeCounts`, so the session record, the stored
 * payload, MI and the scorecard all hold the same four numbers. A question whose summary was
 * absent and whose steps carry no type keeps it absent (absent = unknown, never a zero claim).
 * Pure: returns a copy; old stored records are never touched.
 */
export function withEffectiveCounts<R extends { results: ReadonlyArray<GradedQuestionLike> }>(response: R): R {
  return {
    ...response,
    results: response.results.map((r) => {
      if (r.couldNotRead) return r;
      const hasAny = r.mistakeSummary != null || totalCount(stepTypeCounts(r.annotatedSteps)) > 0;
      return hasAny ? { ...r, mistakeSummary: effectiveTypeCounts(r) } : r;
    }),
  } as R;
}

/** Sum of `effectiveTypeCounts` over a paper's questions. */
export function effectivePaperCounts(questions: ReadonlyArray<GradedQuestionLike> | null | undefined): MistakeTypeCounts {
  let acc = zeroCounts();
  for (const q of questions ?? []) acc = addCounts(acc, effectiveTypeCounts(q));
  return acc;
}

/**
 * THE per-question chip picker (GA-34) — screen and PDF call this, nothing else. The type with
 * the most mistakes; a tie goes to the group shown first (knowledge, technique, careless), then
 * to the type's own order inside the group. Null when nothing may be shown.
 */
export function questionChipType(q: GradedQuestionLike): StoredMistakeType | null {
  const c = effectiveTypeCounts(q);
  let best: StoredMistakeType | null = null;
  let bestN = 0;
  for (const g of MISTAKE_GROUPS) {
    for (const t of g.types) {
      if (c[t] > bestN) {
        best = t;
        bestN = c[t];
      }
    }
  }
  return best;
}

/* ── per-step display state ─────────────────────────────────────────────────── */

export type StepDisplayKind = "correct" | "partial" | "lost" | "not-attempted" | "unknown";

export interface StepDisplay {
  kind: StepDisplayKind;
  label: string;
  /** Short tone suffix renderers map to their palette ("ok" | "part" | "bad" | "na" | "unk"). */
  tone: "ok" | "part" | "bad" | "na" | "unk";
  /** False for a not-attempted or unknown step: no "−N" deduction is printed against it. */
  showDeduction: boolean;
}

/** Today's grader marks an absent step `status: "missing"` — the not-attempted state (D3). */
export function isNotAttemptedStatus(status: unknown): boolean {
  return status === "missing";
}

/**
 * One step's display state. Tolerates ANY status (D4): a value this module does not know —
 * e.g. a future "withdrawn" — renders as a neutral "Not marked", never as "Incorrect".
 */
export function stepDisplay(status: unknown): StepDisplay {
  switch (status) {
    case "correct":
      return { kind: "correct", label: "Correct", tone: "ok", showDeduction: true };
    case "partial":
      return { kind: "partial", label: "Partial", tone: "part", showDeduction: true };
    case "incorrect":
      return { kind: "lost", label: "Incorrect", tone: "bad", showDeduction: true };
    case "missing":
      return { kind: "not-attempted", label: NOT_ATTEMPTED.label, tone: "na", showDeduction: false };
    default:
      return { kind: "unknown", label: "Not marked", tone: "unk", showDeduction: false };
  }
}

/** Whether a step's own type chip may be shown: never on a full-mark question, a not-attempted
 *  step, or a step whose status is unknown. */
export function stepShowsType(step: StepLike, q: GradedQuestionLike): boolean {
  if (!isStoredMistakeType(step?.mistakeType)) return false;
  if (marksLostOn(q) <= 0) return false;
  const k = stepDisplay(step?.status).kind;
  return k !== "not-attempted" && k !== "unknown";
}

/** The step a renderer should draw: its type removed when it may not be shown. Pure copy. */
export function stepForDisplay<S extends StepLike>(step: S, q: GradedQuestionLike): S {
  if (step?.mistakeType && !stepShowsType(step, q)) return { ...step, mistakeType: null };
  return step;
}

/** A question the student did not attempt, by today's data: graded, nothing awarded, and every
 *  step the grader returned is a missing step. A question with no steps is NOT assumed. */
export function isQuestionNotAttempted(q: GradedQuestionLike): boolean {
  if (q.couldNotRead) return false;
  const steps = q.annotatedSteps ?? [];
  if (steps.length === 0) return false;
  if ((Number(q.marksAwarded) || 0) > 0) return false;
  return steps.every((s) => isNotAttemptedStatus(s?.status));
}

/* ── coaching ──────────────────────────────────────────────────────────────── */

export interface CoachingInput {
  marksAwarded: number;
  marksTotal: number;
  /** Paper-level counts, already through `effectiveTypeCounts`. */
  counts: CountsLike;
  pendingCount?: number;
  notAttemptedCount?: number;
  /** What to call the thing being practised ("this topic", "this chapter"). */
  practiseWhat?: string;
}

/**
 * The coaching line every surface prints. It may only say "Clean" when nothing was lost
 * (GA-24), names the three groups in the owner's words, and counts in mistakes, not marks.
 */
export function coachingLine(input: CoachingInput): string {
  const awarded = Number(input.marksAwarded) || 0;
  const total = Number(input.marksTotal) || 0;
  const lost = Math.max(0, total - awarded);
  const g = groupCounts(input.counts);
  const parts: string[] = [];
  const what = input.practiseWhat || "this topic";
  if (g.knowledge > 0) {
    parts.push(`Learn this: ${countWithUnit(g.knowledge, "knowledge gap")} — practise ${what} until the method is yours.`);
  }
  if (g.technique > 0) {
    parts.push(`The quickest wins: ${countWithUnit(g.technique, "exam-technique mistake")} — write the formula, the units and the conclusion every time.`);
  }
  if (g.careless > 0) {
    parts.push(`You already know this: ${countWithUnit(g.careless, "careless slip")} — slow down and check each line.`);
  }
  const notAttempted = Number(input.notAttemptedCount) || 0;
  if (notAttempted > 0) {
    parts.push(`${countWithUnit(notAttempted, "question")} not attempted — not counted as a mistake.`);
  }
  if (lost > 0 && totalCount(toCounts(input.counts)) === 0 && notAttempted === 0) {
    parts.push(`You lost ${lost} ${lost === 1 ? "mark" : "marks"}, and the examiner did not name a mistake type for ${lost === 1 ? "it" : "them"}.`);
  }
  const pending = Number(input.pendingCount) || 0;
  if (pending > 0) {
    parts.push(`Re-upload the ${countWithUnit(pending, "pending page")} to complete your score.`);
  }
  if (parts.length === 0) {
    if (total > 0 && lost === 0) {
      return "Full marks on everything graded — keep showing every step so an examiner can award every method mark.";
    }
    return "";
  }
  return parts.join(" ");
}
