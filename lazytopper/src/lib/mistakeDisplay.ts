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
 * UNITS (owner ruling, D2 → PR-2 B7). A grade that carries GRADER-CORE-1's `marksLostByType`
 * (requested with `acceptsV2: true`) is shown in MARKS — "Where your marks went", and every
 * part sums to the marks lost (G3). A record or response WITHOUT it (an old count-only record,
 * the signed-out free check) keeps its COUNTS, each with its unit ("2 mistakes"): it is never
 * converted and never given invented marks (G5).
 *
 * HONEST STATES (PR-2 B8 + the owner's answerMismatch addendum): a question that was NOT graded
 * — could not be read, its option could not be read, or its answer does not match the question
 * — says so in the owner's words, carries no marks and no type, and is recorded nowhere. Not
 * attempted is its own state; crossed-out ("withdrawn") work is shown apart, struck, unmarked.
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

/** The heading over the per-kind block of a COUNT-ONLY grade or record. It counts MISTAKES, so
 *  it must not claim marks (D2). */
export const MISTAKES_BY_KIND_HEADING = "Mistakes the examiner found, by kind";

/** The heading over the per-kind block of a grade that carries `marksLostByType` (PR-2 B7):
 *  every number under it is MARKS, and the parts sum to the marks lost. */
export const MARKS_HEADING = "Where your marks went";

/** Lost marks the grader gave no reason for — shown honestly, never assigned to a type. */
export const UNTYPED_MARKS_LABEL = "Marks lost, reason not recorded";

/* ── honest states (PR-2 B8 + owner addendum 2026-10-05) — the owner's words, verbatim ── */

/** couldNotRead — the answer was not graded. */
export const COULD_NOT_READ_COPY = "We couldn't read this answer — retake the photo";

/** objectiveResolved:false — the chosen option could not be read; not a 0. */
export const UNREAD_OPTION_COPY = "We couldn't read your option";

/** answerMismatch:true — the owner's addendum, verbatim (em dash included). */
export const ANSWER_MISMATCH_COPY =
  "This answer doesn't seem to match the question — check you uploaded the right page";

/**
 * `notGraded` (GRADER-SPEED-1, Controller A's PR-3; OWNER-APPROVED 2026-10-05) — the server's own
 * verdict that it did NOT grade a question, and why. Non-null = not graded and not charged: out
 * of the score ("X of Y graded"), no mistake recorded, no attempt. Absent / null = graded
 * normally, so this client is correct before AND after that server change ships.
 */
export type NotGradedReason = "unreadable" | "withheld" | "timeout" | "error" | "interrupted";

/** notGraded "timeout" / "error" — the owner-approved wording, verbatim. */
export const NOT_GRADED_TRY_AGAIN_COPY = "We couldn't grade this question this time — please try again";

/** notGraded "interrupted" (GRADING-JOBS-1 J2, contract v1.0 §5) — a background check stopped
 *  (server restart) before this question was marked. Not charged; the page offers "grade the
 *  remaining N". Wording from the contract's own example; owner wording check pending. */
export const NOT_GRADED_INTERRUPTED_COPY = "Not graded — the check was interrupted before this question was marked. You have not been charged for it";

/** notGraded "withheld" — the owner-approved wording, verbatim. */
export const NOT_GRADED_WITHHELD_COPY = "We couldn't grade this answer reliably — please try again";

/** `rubric` — how the question was marked; never inside the teacher note. */
export const RUBRIC_HEADING = "How this was marked";

/** `withdrawn` steps — struck work, shown apart from the answer, unmarked, untyped. */
export const WITHDRAWN_HEADING = "Crossed-out work — not marked";
export const WITHDRAWN_LABEL = "Crossed out";

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

/* ── marks lost, per type (GRADER-CORE-1 v2 `marksLostByType`) — PR-2 B7 ────────── */

/** The six buckets the grader puts every lost mark into. The four stored types are mistakes;
 *  `unattempted` is NEVER a mistake; `untyped` is a loss the grader gave no reason for. */
export type MarksLostBucket = StoredMistakeType | "unattempted" | "untyped";

export const MARKS_LOST_BUCKETS: readonly MarksLostBucket[] = [
  "conceptual",
  "calculation",
  "silly",
  "presentation",
  "unattempted",
  "untyped",
];

export type MarksLostByType = Record<MarksLostBucket, number>;

/** The schema version Mistake Intelligence stores beside `marksLostByType` (G5). An entry
 *  without it is a COUNT-ONLY record: read as counts, never converted, never given marks. */
export const MARKS_LOST_BY_TYPE_VERSION = 1 as const;

export function zeroMarksLost(): MarksLostByType {
  return { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 };
}

/** Marks on the CBSE ½ grid, with float noise removed (sums of halves are exact; this keeps
 *  a stray 0.30000000000000004 from ever reaching a student). */
export function roundMarks(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * A grader's `marksLostByType`, or null when the value is absent or not a well-formed record
 * (every bucket a finite, non-negative number). Null means "this grade is COUNT-ONLY" — the
 * caller shows counts, never marks. Never fills a missing bucket with an invented 0.
 */
export function readMarksLostByType(raw: unknown): MarksLostByType | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const out = zeroMarksLost();
  for (const b of MARKS_LOST_BUCKETS) {
    const v = rec[b];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
    out[b] = v;
  }
  return out;
}

export function addMarksLost(a: MarksLostByType, b: MarksLostByType): MarksLostByType {
  const out = zeroMarksLost();
  for (const k of MARKS_LOST_BUCKETS) out[k] = roundMarks(a[k] + b[k]);
  return out;
}

/** Every lost mark in the record (all six buckets). */
export function marksLostTotal(m: MarksLostByType): number {
  return roundMarks(MARKS_LOST_BUCKETS.reduce((s, k) => s + m[k], 0));
}

/** "1 mark" / "2.5 marks" — marks always carry their unit. */
export function marksWithUnit(n: number): string {
  const v = roundMarks(n);
  return `${v} ${v === 1 ? "mark" : "marks"}`;
}

export interface MarksGroupRow {
  group: MistakeGroup;
  marks: number;
  types: Array<{ type: StoredMistakeType; label: string; marks: number }>;
}

/** The three groups in display order, each with its member types, in MARKS. */
export function marksGroupRows(m: MarksLostByType): MarksGroupRow[] {
  return MISTAKE_GROUPS.map((group) => ({
    group,
    marks: roundMarks(group.types.reduce((s, t) => s + m[t], 0)),
    types: group.types.map((type) => ({ type, label: MISTAKE_TYPE_LABEL[type], marks: m[type] })),
  }));
}

/** Per-group marks (knowledge / technique / careless), plus the two non-mistake lines. */
export function groupMarks(m: MarksLostByType): Record<MistakeGroupKey, number> & { notAttempted: number; untyped: number } {
  const rows = marksGroupRows(m);
  const by = (k: MistakeGroupKey) => rows.find((r) => r.group.key === k)?.marks ?? 0;
  return {
    knowledge: by("knowledge"),
    technique: by("technique"),
    careless: by("careless"),
    notAttempted: m.unattempted,
    untyped: m.untyped,
  };
}

/** One locally-scored objective question's loss (a Chapter Test / Full Mock Section-A pick, a
 *  Quick Practice MCQ whose mark the local compare replaced). Whole mark or nothing: an
 *  unanswered pick is NOT ATTEMPTED; a wrong pick is lost with the grader's type when one was
 *  given, else "reason not recorded" — never an invented type. */
export function objectiveMarksLost(args: {
  totalMarks: number;
  marksAwarded: number;
  attempted: boolean;
  type?: unknown;
}): MarksLostByType {
  const out = zeroMarksLost();
  const lost = roundMarks(Math.max(0, (Number(args.totalMarks) || 0) - (Number(args.marksAwarded) || 0)));
  if (lost <= 0) return out;
  if (!args.attempted) out.unattempted = lost;
  else if (isStoredMistakeType(args.type)) out[args.type] = lost;
  else out.untyped = lost;
  return out;
}

/* ── per-question display state ─────────────────────────────────────────────── */

/** One validated rubric value point ("How this was marked"). */
export interface RubricPoint {
  point: string;
  marks: number;
}

/** The minimal shape of one graded question every surface already carries — plus the v2
 *  fields GRADER-CORE-1 returns to a request that sent `acceptsV2: true` (all optional: an
 *  old record or a legacy response simply lacks them). */
export interface GradedQuestionLike {
  couldNotRead?: boolean;
  totalMarks?: number | null;
  marksAwarded?: number | null;
  mistakeSummary?: CountsLike;
  annotatedSteps?: ReadonlyArray<StepLike> | null;
  objective?: boolean | null;
  /** v2 · true = NOT graded (the answer does not address the question); null = undecided →
   *  graded normally, no message. */
  answerMismatch?: boolean | null;
  /** v2 · false on an objective question = its option could not be read (couldNotRead). */
  objectiveResolved?: boolean | null;
  /** v2 · per-bucket marks lost; validated by `readMarksLostByType` before any use. */
  marksLostByType?: unknown;
  /** v2 · validated value points; never inside the teacher note. */
  rubric?: unknown;
  /** v2 (A's PR-3) · non-null = the server did NOT grade this question (and did not charge for
   *  it); the value says why. Absent / null = graded normally. Read through `notGradedReasonOf`. */
  notGraded?: NotGradedReason | null;
}

/**
 * The server's `notGraded` reason, read tolerantly: absent, null, false or "" → null (graded
 * normally). Any other value means NOT graded; a reason this client does not know yet is
 * treated as "error" (try again) — never as graded, never as a 0.
 */
export function notGradedReasonOf(q: GradedQuestionLike | null | undefined): NotGradedReason | null {
  const v: unknown = q ? (q as { notGraded?: unknown }).notGraded : undefined;
  if (v === undefined || v === null || v === false || v === "") return null;
  return v === "unreadable" || v === "withheld" || v === "timeout" || v === "error" || v === "interrupted" ? v : "error";
}

/* ── grade state: was this question GRADED at all? (PR-2 B8 + owner addendum) ──── */

export type GradeState = "graded" | "could-not-read" | "unread-option" | "answer-mismatch" | "not-graded";

/**
 * The ONE grade-state decision. Branches on the FLAGS, never on the marks (an unmatched answer
 * comes back with `marksAwarded: 0`, which must never read as a graded 0):
 *   - `notGraded` non-null → not graded, and the SERVER's reason is the one shown (a timeout
 *     must never read "retake the photo"): "unreadable" → the could-not-read state; "withheld",
 *     "timeout", "error" → "not-graded" (owner-approved, 2026-10-05);
 *   - `answerMismatch === true` → not graded (the owner's addendum);
 *   - `couldNotRead` → not graded, "retake the photo" — it always wins (controller R3);
 *   - `objectiveResolved === false` on an otherwise read page → not graded, the unread option;
 *   - anything else → graded (`answerMismatch: null` = undecided = graded, no message).
 */
export function gradeStateOf(q: GradedQuestionLike | null | undefined): GradeState {
  if (!q) return "could-not-read";
  const notGraded = notGradedReasonOf(q);
  if (notGraded === "unreadable") return "could-not-read";
  if (notGraded) return "not-graded";
  if (q.answerMismatch === true) return "answer-mismatch";
  // R3 (controller, 2026-10-05): couldNotRead ALWAYS wins ("retake the photo"); "couldn't read
  // your option" is only for an unread pick on an otherwise read page.
  if (q.couldNotRead) return "could-not-read";
  if (q.objectiveResolved === false) return "unread-option";
  return "graded";
}

/** True only for a GRADED question — the gate for marks, types, MI, attempts and progress. */
export function isGradedQuestion(q: GradedQuestionLike | null | undefined): boolean {
  return gradeStateOf(q) === "graded";
}

/** The student-facing sentence for a question that was not graded; null when it was. */
export function gradeStateCopy(q: GradedQuestionLike | null | undefined): string | null {
  switch (gradeStateOf(q)) {
    case "answer-mismatch":
      return ANSWER_MISMATCH_COPY;
    case "unread-option":
      return UNREAD_OPTION_COPY;
    case "could-not-read":
      return COULD_NOT_READ_COPY;
    case "not-graded":
      {
      const reason = notGradedReasonOf(q);
      if (reason === "interrupted") return NOT_GRADED_INTERRUPTED_COPY;
      return reason === "withheld" ? NOT_GRADED_WITHHELD_COPY : NOT_GRADED_TRY_AGAIN_COPY;
    }
    default:
      return null;
  }
}

/** How a paper's not-graded questions split, for its summary lines. `mismatch` and `notGraded`
 *  are counted from the questions; `unread` is the rest of `pendingCount` (the server counts
 *  every not-graded question there), so a timeout is never called an unreadable page. */
export function pendingBreakdown(
  questions: ReadonlyArray<GradedQuestionLike> | null | undefined,
  pendingCount: number,
): { unread: number; mismatch: number; notGraded: number } {
  let mismatch = 0;
  let notGraded = 0;
  for (const q of questions ?? []) {
    const state = gradeStateOf(q);
    if (state === "answer-mismatch") mismatch += 1;
    else if (state === "not-graded") notGraded += 1;
  }
  return { unread: Math.max(0, (Number(pendingCount) || 0) - mismatch - notGraded), mismatch, notGraded };
}

/** A paper's summary line for its questions whose answer does not match the question — the owner's
 *  sentence VERBATIM (N7, verifier, controller fix round 2026-10-05: never paraphrased). */
export function mismatchSummaryLine(count: number): string {
  return `${countWithUnit(count, "answer")} not marked: ${ANSWER_MISMATCH_COPY}.`;
}

/** A paper's summary line for its `notGraded` questions (withheld / timeout / error) — the
 *  controller's wording ruling W1 (2026-10-05), verbatim, singular and plural. */
export function notGradedSummaryLine(count: number): string {
  const n = Number(count) || 0;
  return n === 1
    ? "1 answer couldn't be graded this time — it's not in your score. Please try again."
    : `${n} answers couldn't be graded this time — they're not in your score. Please try again.`;
}

/** A grader's `rubric`, or null when absent / malformed. Never invented. */
export function readRubric(raw: unknown): RubricPoint[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: RubricPoint[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const point = String((r as { point?: unknown }).point ?? "").trim();
    const marks = (r as { marks?: unknown }).marks;
    if (!point || typeof marks !== "number" || !Number.isFinite(marks) || marks < 0) return null;
    out.push({ point, marks });
  }
  return out;
}

/**
 * The v2 fields of a per-question grade, for an adapter that re-shapes it (a worksheet row into
 * the single-question shape MI consumes). Only fields actually present are copied, so a legacy
 * grade stays byte-identical in shape.
 */
export function v2GradeFields<G extends GradedQuestionLike>(
  g: G | null | undefined,
): Partial<Pick<G, "couldNotRead" | "answerMismatch" | "objectiveResolved" | "marksLostByType" | "rubric" | "notGraded">> {
  const out: Partial<Pick<G, "couldNotRead" | "answerMismatch" | "objectiveResolved" | "marksLostByType" | "rubric" | "notGraded">> = {};
  if (!g) return out;
  if (g.couldNotRead === true) out.couldNotRead = g.couldNotRead;
  if (g.notGraded !== undefined) out.notGraded = g.notGraded;
  if (g.answerMismatch !== undefined) out.answerMismatch = g.answerMismatch;
  if (g.objectiveResolved !== undefined) out.objectiveResolved = g.objectiveResolved;
  if (g.marksLostByType !== undefined) out.marksLostByType = g.marksLostByType;
  if (g.rubric !== undefined) out.rubric = g.rubric;
  return out;
}

export interface StepLike {
  status?: string | null;
  mistakeType?: string | null;
  marksDeducted?: number | null;
  marksAwarded?: number | null;
}

/** Marks lost on one question (total − awarded, never negative). Zero for a question that was
 *  not graded (could not be read, option unread, answer does not match): nothing was lost on
 *  work that was never marked. */
export function marksLostOn(q: GradedQuestionLike): number {
  if (!isGradedQuestion(q)) return 0;
  return Math.max(0, (Number(q.totalMarks) || 0) - (Number(q.marksAwarded) || 0));
}

/** Count of steps carrying each stored type (never a not-attempted or crossed-out step). */
export function stepTypeCounts(steps: ReadonlyArray<StepLike> | null | undefined): MistakeTypeCounts {
  const out = zeroCounts();
  for (const s of steps ?? []) {
    if (isStoredMistakeType(s?.mistakeType) && !isNotAttemptedStatus(s?.status) && !isWithdrawnStatus(s?.status)) {
      out[s.mistakeType] += 1;
    }
  }
  return out;
}

/**
 * The type counts a surface may SHOW for one question — the SAME numbers on the scorecard,
 * both PDFs, the C&I chips, the session record and MI (G3: one function, applied once).
 *   - not graded (couldNotRead / unread option / answerMismatch) → nothing;
 *   - full marks (nothing lost, which includes a right-option MCQ) → nothing: a type is never
 *     shown on a question that lost no mark (owner ruling; D3);
 *   - otherwise, per type, the larger of the grader's reconciled summary and the number of
 *     its steps carrying that type — the grader's own rule (max of claim and steps), applied
 *     identically everywhere so MI and the scorecard can no longer disagree (GA-20).
 *     Never invented: a type nobody reported stays zero.
 */
export function effectiveTypeCounts(q: GradedQuestionLike): MistakeTypeCounts {
  if (!isGradedQuestion(q)) return zeroCounts();
  if (marksLostOn(q) <= 0) return zeroCounts();
  const summary = toCounts(q.mistakeSummary);
  const steps = stepTypeCounts(q.annotatedSteps);
  const out = zeroCounts();
  for (const t of STORED_MISTAKE_TYPES) out[t] = Math.max(summary[t], steps[t]);
  return out;
}

/**
 * The response every downstream reader should receive: each graded question's
 * `mistakeSummary` replaced by its `effectiveTypeCounts`, so the session record, the stored
 * payload, MI and the scorecard all hold the same four numbers. A question whose summary was
 * absent and whose steps carry no type keeps it absent (absent = unknown, never a zero claim).
 * A question that was not graded is passed through untouched. Pure: returns a copy; old
 * stored records are never touched.
 */
export function withEffectiveCounts<R extends { results: ReadonlyArray<GradedQuestionLike> }>(response: R): R {
  return {
    ...response,
    results: response.results.map((r) => {
      if (!isGradedQuestion(r)) return r;
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
 * One GRADED question's marks lost per bucket, or null when the grade carries no usable
 * `marksLostByType` (a count-only grade: the caller shows counts) or was not graded.
 *   - parts that sum to the loss are returned as they are (G3 asserts it everywhere);
 *   - parts that sum SHORT of the loss: the shortfall is marked "reason not recorded" — the
 *     loss is shown, never assigned to a type;
 *   - parts that sum OVER the loss cannot be trusted: null (counts), never a number that
 *     disagrees with the score.
 */
export function questionMarksLost(q: GradedQuestionLike | null | undefined): MarksLostByType | null {
  if (!q || !isGradedQuestion(q)) return null;
  const raw = readMarksLostByType(q.marksLostByType);
  if (!raw) return null;
  const lost = roundMarks(marksLostOn(q));
  const sum = marksLostTotal(raw);
  if (sum > lost + 1e-9) return null;
  // R2 (controller, 2026-10-05): the SERVER's buckets, exactly — one source of truth, so the
  // scorecard, MI and the server agree. An untyped deduction stays "reason not recorded" even on
  // a "missing" step; nothing is re-bucketed here. A short sum is shown as "reason not recorded".
  return sum < lost - 1e-9 ? { ...raw, untyped: roundMarks(raw.untyped + (lost - sum)) } : { ...raw };
}

export interface PaperMarksLost {
  /** Per bucket, over the GRADED questions only. Sums to `lost`. */
  byType: MarksLostByType;
  /** total − awarded over the graded questions. */
  lost: number;
  /** Graded questions that lost marks without a per-type split (a locally scored row in a v2
   *  paper): their loss is in `untyped` — shown, never given a type. */
  unsplitCount: number;
}

/**
 * A paper's marks lost per bucket — the numbers behind "Where your marks went". Null when NO
 * graded question carries `marksLostByType`: that paper is count-only and is shown in counts.
 * Questions that were not graded (couldNotRead, unread option, answerMismatch) are excluded,
 * exactly as the paper's graded totals exclude them.
 */
export function paperMarksLost(questions: ReadonlyArray<GradedQuestionLike> | null | undefined): PaperMarksLost | null {
  let byType = zeroMarksLost();
  let lost = 0;
  let unsplitCount = 0;
  let any = false;
  for (const q of questions ?? []) {
    if (!isGradedQuestion(q)) continue;
    const qLost = marksLostOn(q);
    lost = roundMarks(lost + qLost);
    const m = questionMarksLost(q);
    if (m) {
      any = true;
      byType = addMarksLost(byType, m);
    } else if (qLost > 0) {
      unsplitCount += 1;
      byType = { ...byType, untyped: roundMarks(byType.untyped + qLost) };
    }
  }
  return any ? { byType, lost, unsplitCount } : null;
}

/** A paper's honest totals over its GRADED questions only (a question that was not graded is
 *  neither a 0 nor part of the total). */
export function paperGradedTotals(questions: ReadonlyArray<GradedQuestionLike> | null | undefined): {
  awarded: number;
  total: number;
  gradedCount: number;
  notGradedCount: number;
} {
  let awarded = 0;
  let total = 0;
  let gradedCount = 0;
  let notGradedCount = 0;
  for (const q of questions ?? []) {
    if (!isGradedQuestion(q)) {
      notGradedCount += 1;
      continue;
    }
    gradedCount += 1;
    awarded = roundMarks(awarded + (Number(q.marksAwarded) || 0));
    total = roundMarks(total + (Number(q.totalMarks) || 0));
  }
  return { awarded, total, gradedCount, notGradedCount };
}

/**
 * Marks lost to the student's WORK on one graded question — the loss minus anything NOT
 * ATTEMPTED (never a mistake, never an MI entry). Controller rulings R1/R2 (2026-10-05):
 *   - v2 (`marksLostByType`): the loss minus the SERVER's `unattempted` bucket, exactly;
 *   - v1: zero only for a question that was not attempted at all (every step "missing", nothing
 *     awarded); otherwise the whole loss — a "missing" step the grader TYPED (a missing
 *     conclusion, unit or formula) is a CBSE exam-technique deduction and keeps its type.
 */
export function marksLostToWork(q: GradedQuestionLike): number {
  const lost = roundMarks(marksLostOn(q));
  if (lost <= 0) return 0;
  const m = questionMarksLost(q);
  if (m) return roundMarks(Math.max(0, lost - m.unattempted));
  return isQuestionNotAttempted(q) ? 0 : lost;
}

/**
 * True when a GRADED question lost marks and EVERY lost mark is "not attempted" — the question
 * as a whole, or (v2) only parts the student never wrote. This is the ONE not-attempted decision
 * shared by the Mistake-Intelligence front door (no entry: not a mistake, OR-LIVE L3) and the
 * attempt store (the attempt carries `notAttempted`, so Me can show those marks as "Not
 * attempted" instead of "no reason recorded" — H11). One predicate, so the two can never
 * disagree about the same question.
 */
export function isLossOnlyNotAttempted(q: GradedQuestionLike): boolean {
  if (!isGradedQuestion(q)) return false;
  return isQuestionNotAttempted(q) || (marksLostOn(q) > 0 && marksLostToWork(q) <= 0);
}

/** A stored MI entry's marks per bucket — ONLY when it carries the versioned field (PR-2). An
 *  entry without it is COUNT-ONLY: null, and the reader shows its counts (G5). */
export function entryMarksLost(entry: { marksLostByType?: unknown; marksLostByTypeVersion?: unknown } | null | undefined): MarksLostByType | null {
  if (!entry || entry.marksLostByTypeVersion !== MARKS_LOST_BY_TYPE_VERSION) return null;
  return readMarksLostByType(entry.marksLostByType);
}

/**
 * THE per-question chip picker (GA-34) — screen and PDF call this, nothing else. On a grade
 * with `marksLostByType`, the type that cost the MOST MARKS (B7: marks, not counts); otherwise
 * the type with the most mistakes. A tie goes to the group shown first (knowledge, technique,
 * careless), then to the type's own order inside the group. Null when nothing may be shown
 * (not graded, full marks, or a loss with no mistake type — not attempted / reason not given).
 */
export function questionChipType(q: GradedQuestionLike): StoredMistakeType | null {
  if (!isGradedQuestion(q) || marksLostOn(q) <= 0) return null;
  const marks = questionMarksLost(q);
  const score: Record<StoredMistakeType, number> = marks
    ? { conceptual: marks.conceptual, calculation: marks.calculation, silly: marks.silly, presentation: marks.presentation }
    : effectiveTypeCounts(q);
  let best: StoredMistakeType | null = null;
  let bestN = 0;
  for (const g of MISTAKE_GROUPS) {
    for (const t of g.types) {
      if (score[t] > bestN) {
        best = t;
        bestN = score[t];
      }
    }
  }
  return best;
}

/* ── per-step display state ─────────────────────────────────────────────────── */

export type StepDisplayKind = "correct" | "partial" | "lost" | "not-attempted" | "withdrawn" | "unknown";

export interface StepDisplay {
  kind: StepDisplayKind;
  label: string;
  /** Short tone suffix renderers map to their palette ("ok" | "part" | "bad" | "na" | "struck" | "unk"). */
  tone: "ok" | "part" | "bad" | "na" | "struck" | "unk";
  /** False for a not-attempted, crossed-out or unknown step: no "−N" deduction is printed. */
  showDeduction: boolean;
}

/** The not-attempted state: today's grader marks an absent step `status: "missing"`; the v2
 *  grader (acceptsV2) says `"unattempted"`. Both are the fourth state, never a mistake. */
export function isNotAttemptedStatus(status: unknown): boolean {
  return status === "missing" || status === "unattempted";
}

/** A crossed-out attempt (v2 `"withdrawn"`): its own step, never marked, never typed, never
 *  merged into the answer. */
export function isWithdrawnStatus(status: unknown): boolean {
  return status === "withdrawn";
}

/**
 * One step's display state. Tolerates ANY status (D4): a value this module does not know
 * renders as a neutral "Not marked", never as "Incorrect".
 *
 * A "missing" step the grader TYPED is a MISTAKE, not a non-attempt — GRADER-CORE-1's final
 * contract (D29, 2026-10-05): genuinely unattempted work comes back "unattempted"; an
 * exam-technique loss (a unit or a conclusion never written) comes back "missing" +
 * presentation. So a typed "missing" step shows as lost, with its deduction and its type —
 * the same as its marks and its MI entry (controller ruling R1). An UNTYPED "missing" step
 * (today's grader's absent step) and every "unattempted" one stay Not attempted.
 */
export function stepDisplay(status: unknown, mistakeType?: unknown): StepDisplay {
  if (status === "missing" && isStoredMistakeType(mistakeType)) {
    return { kind: "lost", label: "Missing", tone: "bad", showDeduction: true };
  }
  switch (status) {
    case "correct":
      return { kind: "correct", label: "Correct", tone: "ok", showDeduction: true };
    case "partial":
      return { kind: "partial", label: "Partial", tone: "part", showDeduction: true };
    case "incorrect":
      return { kind: "lost", label: "Incorrect", tone: "bad", showDeduction: true };
    case "missing":
    case "unattempted":
      return { kind: "not-attempted", label: NOT_ATTEMPTED.label, tone: "na", showDeduction: false };
    case "withdrawn":
      return { kind: "withdrawn", label: WITHDRAWN_LABEL, tone: "struck", showDeduction: false };
    default:
      return { kind: "unknown", label: "Not marked", tone: "unk", showDeduction: false };
  }
}

/**
 * A question's steps, split: the MARKED working (everything a renderer shows as the answer) and
 * the CROSSED-OUT attempts (shown apart, struck — B8). A legacy grade has no withdrawn steps,
 * so `withdrawn` is empty and `marked` holds every step, in order.
 */
export function splitWithdrawnSteps<S extends StepLike>(steps: ReadonlyArray<S> | null | undefined): { marked: S[]; withdrawn: S[] } {
  const marked: S[] = [];
  const withdrawn: S[] = [];
  for (const s of steps ?? []) (isWithdrawnStatus(s?.status) ? withdrawn : marked).push(s);
  return { marked, withdrawn };
}

/** Whether a step's own type chip may be shown: never on a full-mark question, a not-attempted,
 *  crossed-out or unknown-status step. */
export function stepShowsType(step: StepLike, q: GradedQuestionLike): boolean {
  if (!isStoredMistakeType(step?.mistakeType)) return false;
  if (marksLostOn(q) <= 0) return false;
  const k = stepDisplay(step?.status, step?.mistakeType).kind;
  return k !== "not-attempted" && k !== "unknown" && k !== "withdrawn";
}

/** The step a renderer should draw: its type removed when it may not be shown. Pure copy. */
export function stepForDisplay<S extends StepLike>(step: S, q: GradedQuestionLike): S {
  if (step?.mistakeType && !stepShowsType(step, q)) return { ...step, mistakeType: null };
  return step;
}

/** A question the student did not attempt: graded, nothing awarded, and every MARKED step the
 *  grader returned is a not-attempted step (crossed-out attempts are not an answer). A v2 grade
 *  whose whole loss is "unattempted" is not attempted even without steps. A question with no
 *  steps and no such loss is NOT assumed. */
export function isQuestionNotAttempted(q: GradedQuestionLike): boolean {
  if (!isGradedQuestion(q)) return false;
  if ((Number(q.marksAwarded) || 0) > 0) return false;
  const total = Number(q.totalMarks) || 0;
  const marks = readMarksLostByType(q.marksLostByType);
  // R2 — a v2 grade follows the SERVER's buckets: not attempted only when its whole loss is in
  // `unattempted` (an all-"missing" question the server filed as untyped is NOT re-labelled).
  if (marks) return total > 0 && roundMarks(marks.unattempted) === roundMarks(total);
  const steps = splitWithdrawnSteps(q.annotatedSteps).marked;
  if (steps.length === 0) return false;
  return steps.every((s) => isNotAttemptedStatus(s?.status));
}

/* ── coaching ──────────────────────────────────────────────────────────────── */

export interface CoachingInput {
  marksAwarded: number;
  marksTotal: number;
  /** Paper-level counts, already through `effectiveTypeCounts`. Used when `marks` is absent. */
  counts: CountsLike;
  /** PR-2 B7 · the paper's marks lost per bucket (`paperMarksLost(...).byType`). When present
   *  the line speaks in MARKS; absent (a count-only grade or record) it speaks in counts. */
  marks?: MarksLostByType | null;
  pendingCount?: number;
  notAttemptedCount?: number;
  /** Questions not graded because the answer did not match the question (owner addendum).
   *  They are part of `pendingCount` (the server counts them there) and are named apart. */
  mismatchCount?: number;
  /** Questions the server did not grade (`notGraded` withheld / timeout / error — owner-approved
   *  2026-10-05). Also part of `pendingCount`; never told to "re-upload the page". */
  notGradedCount?: number;
  /** What to call the thing being practised ("this topic", "this chapter"). */
  practiseWhat?: string;
}

/**
 * The coaching line every surface prints. It may only say "full marks" when nothing was lost
 * (GA-24), names the three groups in the owner's words, and speaks in MARKS when the grade
 * carries them (PR-2), else in mistakes.
 */
export function coachingLine(input: CoachingInput): string {
  const awarded = Number(input.marksAwarded) || 0;
  const total = Number(input.marksTotal) || 0;
  const lost = Math.max(0, total - awarded);
  const parts: string[] = [];
  const what = input.practiseWhat || "this topic";
  const notAttempted = Number(input.notAttemptedCount) || 0;
  if (input.marks) {
    const g = groupMarks(input.marks);
    if (g.knowledge > 0) parts.push(`Learn this: ${marksWithUnit(g.knowledge)} to gain — practise ${what} until the method is yours.`);
    if (g.technique > 0) parts.push(`The quickest wins: ${marksWithUnit(g.technique)} to gain — write the formula, the units and the conclusion every time.`);
    if (g.careless > 0) parts.push(`You already know this: ${marksWithUnit(g.careless)} to gain — slow down and check each line.`);
    if (g.notAttempted > 0) parts.push(`${marksWithUnit(g.notAttempted)} not attempted — not counted as a mistake.`);
    if (g.untyped > 0) parts.push(`${marksWithUnit(g.untyped)} lost, reason not recorded.`);
  } else {
    const g = groupCounts(input.counts);
    if (g.knowledge > 0) {
      parts.push(`Learn this: ${countWithUnit(g.knowledge, "knowledge gap")} — practise ${what} until the method is yours.`);
    }
    if (g.technique > 0) {
      parts.push(`The quickest wins: ${countWithUnit(g.technique, "exam-technique mistake")} — write the formula, the units and the conclusion every time.`);
    }
    if (g.careless > 0) {
      parts.push(`You already know this: ${countWithUnit(g.careless, "careless slip")} — slow down and check each line.`);
    }
    if (notAttempted > 0) {
      parts.push(`${countWithUnit(notAttempted, "question")} not attempted — not counted as a mistake.`);
    }
    if (lost > 0 && totalCount(toCounts(input.counts)) === 0 && notAttempted === 0) {
      parts.push(`You lost ${lost} ${lost === 1 ? "mark" : "marks"}, and the examiner did not name a mistake type for ${lost === 1 ? "it" : "them"}.`);
    }
  }
  const mismatch = Number(input.mismatchCount) || 0;
  if (mismatch > 0) {
    parts.push(mismatchSummaryLine(mismatch));
  }
  const notGraded = Number(input.notGradedCount) || 0;
  if (notGraded > 0) parts.push(notGradedSummaryLine(notGraded));
  const pending = Math.max(0, (Number(input.pendingCount) || 0) - mismatch - notGraded);
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
