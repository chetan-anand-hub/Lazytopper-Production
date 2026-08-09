// src/services/mistakeRetry.ts
//
// RETRY-1 — classify a mistake-log entry by WHAT IT CAN RE-SERVE, so the surface
// that renders it (ME-2) can label the button with what the button actually does.
//
// ★ THE RULE THIS MODULE EXISTS TO ENFORCE: a button's copy must match its behaviour.
//   "Re-do that one" promises the student their EXACT question back. That promise is
//   keepable only when the entry's `questionId` is a row in `canonicalQuestionBank`.
//   When it is not, the honest affordance is "Try one like it" — a fresh draw from the
//   same concept and mark band. Offering "Re-do that one" for an id that cannot be
//   resolved is the fake-data failure this product's doctrine forbids: the control
//   would lie about what it returns.
//
// ★ PURE + RENDER-FREE ON PURPOSE. This module decides; it does not draw and it does
//   not navigate. ME-2 owns the markup. Keeping the decision here means the copy and
//   the capability cannot drift apart in a component nobody re-reads.
//
// ─── WHY TWO RESOLVERS, AND WHY THE OBVIOUS ONE IS THE WRONG ONE ────────────────
// `mistakeConcept.conceptForBankQuestionId` LOOKS like the existence test. It is not.
// It deliberately returns `undefined` for a "chapter-echo" subtopic ("General",
// "Chapter Practice — …") because such a label must never be PRESENTED as a concept.
// Those rows are still perfectly real bank questions and can still be re-served
// exactly. Measured against the live bank at authoring time: 773 of 8543 rows carry a
// chapter-echo subtopic, so using the concept resolver as an existence test would
// have demoted ~9% of genuinely re-servable questions to "Try one like it".
//   ⇒ EXISTENCE is answered by `progressBankIndex.conceptForQuestionId` (row or null).
//   ⇒ DISPLAY CONCEPT is answered by `mistakeConcept.conceptForBankQuestionId`.
// Do not collapse these two calls into one. They answer different questions.
//
// ─── THE ID CLASSES, AS THE PRODUCT ACTUALLY WRITES THEM ────────────────────────
// `recordMistake` (services/mistakeIntelligence.ts) is the single writer, and its
// callers supply `questionId` in exactly these shapes:
//   • BANK id — Quick Practice (`quickPracticeSessionService`) and the per-question
//     `SolutionChecker` pass the bare bank id.            → EXACT
//   • SYNTHETIC attempt id — worksheet (`ws:`), full mock (`fm:`), chapter test
//     (`ct:`) and MULTI-question Check & Improve (`ci:`). These are attempt ids, not
//     bank ids; they never resolve and must never be looked up.   → SIMILAR
//   • NON-BANK stable id — the Highly Probable Questions page renders a
//     `SolutionChecker` with `questionId={q.id}`, and HPQ ids live in
//     `data/highlyProbableQuestions.ts`, which `canonicalQuestionBank.ts` does not
//     import. Verified by enumeration: 0 of 140 HPQ ids are bank rows.  → SIMILAR
//   • ABSENT — SINGLE-question Check & Improve passes no `questionId` at all, and
//     every entry written before MI-CONCEPT-1 shipped has neither `questionId` nor
//     `concept`.                                          → NONE (render nothing)
//
// ⚠ LEGACY SHAPE. `questionId` and `concept` are optional BY DESIGN and must stay so.
//   Entries are read back from localStorage / Firestore — untrusted, possibly written
//   by an older build — so every field is coerced here rather than trusted.

import type { MistakeLogEntry } from "./mistakeLogService";
import { conceptForQuestionId } from "./progressBankIndex";
import { conceptForBankQuestionId } from "./mistakeConcept";

/**
 * The surface-scoped SYNTHETIC attempt-id prefixes. These are dedup / weak-area
 * bridge keys, NOT bank ids, and nothing may re-serve a question from them.
 *
 * ⚠ FOUR, not three. `ci:` (multi-question Check & Improve) belongs here: only the
 * SINGLE-question C&I path omits `questionId` entirely.
 * ⚠ `qp:` is deliberately ABSENT. It exists in the codebase but is a SessionRecord
 * `worksheetId` / `perQuestionRef`, never a mistake-log `questionId` — Quick Practice
 * writes REAL bank ids. Adding it here would demote every Quick Practice entry.
 */
export const SYNTHETIC_ATTEMPT_ID_PREFIXES = ["ws:", "fm:", "ct:", "ci:"] as const;

/**
 * The student-facing copy for each affordance. Exported so the label and the
 * capability are decided in ONE place — ME-2 must read these rather than retype them.
 */
export const RETRY_COPY = {
  /** The entry's exact question can be served again. */
  exact: "Re-do that one",
  /** Only a fresh question from the same concept / mark band can be served. */
  similar: "Try one like it",
} as const;

/** Why a "similar" plan could not be an "exact" one. Reported, never guessed. */
export type SimilarReason =
  /** A surface-scoped attempt id (`ws:`/`fm:`/`ct:`/`ci:`) — never a bank row. */
  | "synthetic-attempt-id"
  /** A real, stable id that is not in the bank — HPQ, or a withheld/deleted row. */
  | "unresolved-question-id";

export type MistakeRetryPlan =
  | {
      kind: "exact";
      /** The bank id, verified present in `canonicalQuestionBank`. */
      bankQuestionId: string;
      /** Bank `subtopic`, VERBATIM. `null` when unknowable or a chapter echo. */
      concept: string | null;
      /** The entry's topic label, verbatim. Always the honest fallback for copy. */
      topic: string;
      /** Numeric marks. `null` = unknown. NEVER a coarse "1"/"23"/"5"/"4" bucket. */
      marks: number | null;
    }
  | {
      kind: "similar";
      reason: SimilarReason;
      concept: string | null;
      topic: string;
      marks: number | null;
    }
  | {
      kind: "none";
      /** The entry carries no question identity, so nothing can be re-served. */
      reason: "no-question-id";
    };

/** The fields this classifier reads. `MistakeLogEntry` satisfies it structurally. */
export interface MistakeRetryInput {
  questionId?: string | null;
  concept?: string | null;
  topic?: string | null;
  totalMarks?: number | null;
}

/** Compile-time proof that a real log entry is an acceptable input. */
export type MistakeRetryInputIsSatisfiedByEntry = MistakeLogEntry extends MistakeRetryInput
  ? true
  : never;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Marks as a NUMBER. `null` when absent, non-finite or non-positive.
 *
 * ⚠ Never derive a mark band from the coarse buckets ("1"/"23"/"5"/"4") — they FUSE
 * 2- and 3-mark questions and cannot isolate a single mark value. A caller wanting a
 * band filters on the bank's numeric `q.marks` using this number.
 */
function marksOf(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * True when `id` is a surface-scoped synthetic attempt id.
 *
 * Matching is on the RAW, trimmed id and is case-SENSITIVE — every writer emits a
 * lowercase prefix, and case-folding here would silently capture a bank id that
 * happened to start with "WS:".
 */
export function isSyntheticAttemptId(id: string | null | undefined): boolean {
  const key = text(id);
  if (!key) return false;
  return SYNTHETIC_ATTEMPT_ID_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Classify a mistake-log entry into the retry it can honestly offer.
 *
 * Never throws — a legacy entry (no `questionId`, no `concept`), a malformed entry
 * and a fully-populated entry all return a plan.
 *
 * ★ ORDER IS LOAD-BEARING. The synthetic check runs BEFORE any bank lookup, so a
 *   synthetic attempt id can never reach the index — see the "never looks up" test.
 */
export function planMistakeRetry(entry: MistakeRetryInput | null | undefined): MistakeRetryPlan {
  const topic = text(entry?.topic);
  const marks = marksOf(entry?.totalMarks);
  // The concept persisted at write time, VERBATIM. Never re-derived, never slugified.
  const persistedConcept = text(entry?.concept) || null;

  const questionId = text(entry?.questionId);
  // ── No identity at all → no affordance. Render nothing. ──────────────────────
  if (!questionId) {
    return { kind: "none", reason: "no-question-id" };
  }

  // ── Synthetic attempt id → similar ONLY, and WITHOUT touching the bank index. ─
  if (isSyntheticAttemptId(questionId)) {
    return {
      kind: "similar",
      reason: "synthetic-attempt-id",
      concept: persistedConcept,
      topic,
      marks,
    };
  }

  // ── EXISTENCE, not display: a chapter-echo row is still a re-servable row. ────
  const row = conceptForQuestionId(questionId);
  if (!row) {
    // A stable id the bank does not contain: an HPQ id, or a withheld/deleted row.
    return {
      kind: "similar",
      reason: "unresolved-question-id",
      concept: persistedConcept,
      topic,
      marks,
    };
  }

  return {
    kind: "exact",
    bankQuestionId: questionId,
    // Prefer what was persisted; otherwise resolve through the SAME single concept
    // vocabulary that wrote it, which back-fills legacy pre-MI-CONCEPT-1 entries.
    // Stays `null` for a chapter echo — re-serving is fine, LABELLING it is not.
    concept: persistedConcept ?? conceptForBankQuestionId(questionId) ?? null,
    topic,
    marks,
  };
}

/**
 * The button copy for a plan, or `null` when there is no button to draw.
 *
 * ME-2 must call this rather than switching on `kind` itself — that is what keeps the
 * words and the capability from drifting apart.
 */
export function retryCopyFor(plan: MistakeRetryPlan): string | null {
  switch (plan.kind) {
    case "exact":
      return RETRY_COPY.exact;
    case "similar":
      return RETRY_COPY.similar;
    case "none":
      return null;
  }
}
