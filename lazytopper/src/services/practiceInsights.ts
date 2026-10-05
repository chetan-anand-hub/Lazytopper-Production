/*
 * Practice Insights Service
 *
 * Records and retrieves practice attempts for analytics features like
 * Daily Mix and Weekly Wrapped.
 */

import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import type { AuthUser } from "../context/AuthContext";
import {
  buildProgressScopeKey,
  getActiveProgressUser,
  saveLearnerProgressSegment,
} from "./studentProgressStore";
import { clearWrongAnswer, getWrongConceptsForTopic } from "./adaptivePracticeEngine";
import { resolveCanonicalSlug, canonicalSlugMatches } from "../data/syllabus/canonicalTopicSlug";
import { firestoreDb } from "./firebaseClient";
import {
  attemptDedupKey,
  legacyAttemptKey,
  legacyAttemptKeyPrefix,
  legacyKeyOutcome,
  upsertAttempt,
} from "./attemptDedupKey";
import {
  MARKS_LOST_BY_TYPE_VERSION,
  isGradedQuestion,
  isLossOnlyNotAttempted,
  questionMarksLost,
  type GradedQuestionLike,
  type MarksLostByType,
} from "../lib/mistakeDisplay";

export type LTSubject = "maths" | "science";
export type DifficultyLevel = "Easy" | "Medium" | "Hard";

/** How an attempt was produced. Marks is the universal unit (MI-Loop decision 1):
 *  `graded` = examiner-style check (marksScored/marksAvailable from the grader);
 *  `mcq` = objective click (1/1 or 0/1); `self-assess` = got-it / need-practice. */
export type AttemptMode = "graded" | "mcq" | "self-assess";

export interface PracticeAttempt {
  id: string;
  questionId: string;
  topicKey: string;
  topicName?: string;
  subject: LTSubject;
  difficulty: DifficultyLevel;
  bloomSkill?: string;
  /** Derived binary view (full marks) — kept for the existing %-correct readers. */
  correct: boolean;
  /** Marks model (source of truth). Optional so legacy/binary attempts still parse. */
  marksScored?: number;
  marksAvailable?: number;
  mode?: AttemptMode;
  /** Detect-then-confirm telemetry (Check & Improve): how the mark scale was set
   *  (stated/inferred/fallback/user), and — when the student corrected the AI's
   *  detection — the detected-vs-confirmed values. A correction signal for future
   *  classifier-accuracy measurement; never shown to the student. */
  marksSource?: string;
  detectionOverride?: DetectionOverrideLog | null;
  /** SCORECARD-MI-1 PR-2 (H11) — ADDITIVE OPTIONAL. True when every mark this attempt lost was
   *  NOT ATTEMPTED (the question as a whole, or only unwritten parts) — the same decision the
   *  MI front door makes (`isLossOnlyNotAttempted`), which writes no MI entry for it. Lets Me
   *  show those marks as "Not attempted" rather than "no reason recorded". Absent on every
   *  attempt written before PR-2 (never back-filled). */
  notAttempted?: boolean;
  /** SCORECARD-MI-1 PR-2 (H7, B7) — ADDITIVE OPTIONAL, VERSIONED. The grade's marks lost per
   *  bucket, written ONLY from a grade that carries GRADER-CORE-1 v2 `marksLostByType`, and read
   *  only with `marksLostByTypeVersion` (an old or count-only attempt is never given marks). */
  marksLostByType?: MarksLostByType;
  marksLostByTypeVersion?: typeof MARKS_LOST_BY_TYPE_VERSION;
  timestamp: number;
}

export interface DetectionOverrideLog {
  detected: { marks: number; subject: string; topicKey: string };
  confirmed: { marks: number; subject: string; topicKey: string };
}

export interface PracticeInsights {
  attempts: PracticeAttempt[];
}

export interface PracticeWeakConcept {
  concept: string;
  count: number;
}

export interface PracticeCommonMistake {
  mistake: string;
  count: number;
}

export interface PracticeInsightSnapshot {
  weakConcepts: PracticeWeakConcept[];
  commonMistakes: PracticeCommonMistake[];
}

const LEGACY_STORAGE_KEY = "lazyTopper_practice_insights";

function getStorageKey(): string {
  return buildProgressScopeKey("practiceInsights", getActiveProgressUser());
}

/**
 * Load all recorded practice attempts from localStorage.
 */
export function loadInsights(): PracticeInsights {
  if (typeof window === "undefined") {
    return { attempts: [] };
  }
  try {
    const scopedKey = getStorageKey();
    const raw =
      window.localStorage.getItem(scopedKey) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return { attempts: [] };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.attempts)) {
      if (!window.localStorage.getItem(scopedKey)) {
        window.localStorage.setItem(scopedKey, raw);
      }
      return { attempts: parsed.attempts as PracticeAttempt[] };
    }
  } catch (err) {
    console.warn("Failed to parse practice insights from localStorage:", err);
  }
  try {
    window.localStorage.removeItem(getStorageKey());
  } catch {
    // ignore
  }
  return { attempts: [] };
}

/**
 * Persist the given practice insights to localStorage.
 */
export function saveInsights(data: PracticeInsights): void {
  if (typeof window === "undefined") return;
  try {
    const scopedKey = getStorageKey();
    window.localStorage.setItem(scopedKey, JSON.stringify(data));
    const uid = getActiveProgressUser();
    if (uid) {
      void saveLearnerProgressSegment(uid, "attempts", data.attempts);
      if (firestoreDb && uid !== "anonymous") {
        void setDoc(doc(firestoreDb, "practiceInsights", uid), { ...data, updatedAt: new Date().toISOString() }, { merge: true }).catch((e) => console.warn("[practiceInsights] blob write failed", e));
      }
    }
  } catch (err) {
    console.warn("Failed to save practice insights:", err);
  }
}

/**
 * Store a single practice attempt (localStorage + Firestore mirror via saveInsights).
 * Internal — every write goes through the `recordAttempt` front door so policy + identity
 * can never be bypassed.
 *
 * SCORECARD-MI-1 PR-2 (H1) — superseded by owner ruling 2026-10-05 (re-grade replaces): the
 * attempt's `id` is its submission identity, and `upsertAttempt` REPLACES the stored attempt
 * with that id (latest wins) instead of appending a second one. The same outcome again writes
 * nothing ("duplicate").
 */
function storeAttempt(attempt: PracticeAttempt): { outcome: "recorded" | "replaced" | "duplicate"; previous: PracticeAttempt | null } {
  const data = loadInsights();
  const { attempts, outcome, previous } = upsertAttempt(data.attempts, attempt);
  if (outcome !== "duplicate") saveInsights({ ...data, attempts });
  return { outcome, previous };
}

/**
 * N1 (verifier, controller fix round 2026-10-05) — THE TRANSITION. A submission recorded BEFORE
 * the identity key (H1) is stored under the old score-keyed key, so its first re-record after the
 * change — a re-grade, or the SolutionChecker cache-restore on a revisit — would otherwise add a
 * SECOND attempt and drain a weakness again. It is recognised through the device's `seen` list,
 * which holds the old keys:
 *   - "same-outcome": the old key for THIS outcome is in `seen` → it is the attempt already
 *     stored: nothing is written, nothing drained (exactly what the old dedup did);
 *   - "re-graded": a different outcome, recognised ONLY where the old key was already
 *     submission-scoped (its question id embeds the paper / session id, e.g. `ws:<paper>:q3`) —
 *     the old attempt is REPLACED (latest wins), never joined by a second;
 *   - "none": anything else, including a question whose old key cannot tell this submission from
 *     an earlier one (a bank id): a genuinely new submission stays a new attempt.
 * A submission already re-recorded under its identity is the normal latest-wins path.
 */
type LegacyTransition =
  | { kind: "none" }
  | { kind: "same-outcome" }
  | { kind: "re-graded"; legacyKeys: string[]; previousCorrect: boolean };

function legacyTransition(
  uid: string,
  ctx: RecordAttemptContext,
  attemptId: string,
  seen: readonly string[],
  scored: number,
  available: number,
): LegacyTransition {
  if (loadInsights().attempts.some((a) => a.id === attemptId)) return { kind: "none" };
  if (seen.includes(legacyAttemptKey(uid, ctx, scored, available))) return { kind: "same-outcome" };
  const qid = String(ctx.questionId ?? "").trim();
  const sub = String(ctx.submissionId ?? "").trim();
  if (!qid || !sub || !qid.includes(sub)) return { kind: "none" };
  const prefix = legacyAttemptKeyPrefix(uid, ctx);
  const legacyKeys = seen.filter((k) => legacyKeyOutcome(k, prefix) !== null);
  if (legacyKeys.length === 0) return { kind: "none" };
  const last = legacyKeyOutcome(legacyKeys[0], prefix)!; // `seen` is newest-first
  return { kind: "re-graded", legacyKeys, previousCorrect: last.scored >= last.available };
}

/** The "re-graded" transition: the old attempt(s) of this submission leave the local store and the
 *  new one takes their place — ONE attempt, the latest outcome. */
function replaceLegacyAttempts(attempt: PracticeAttempt): void {
  const data = loadInsights();
  const kept = data.attempts.filter((a) => !(a.questionId === attempt.questionId && a.id !== attempt.id));
  saveInsights({ ...data, attempts: [...kept, attempt] });
}

/* ──────────────────────────────────────────────────────────────────────────
 * recordAttempt — the unified attempt front door (MI-Loop Stage 2, PR 1).
 *
 * The score-twin of `recordMistake` (mistakeIntelligence.ts): the ONE writer of
 * the attempt store. Mirrors recordMistake's signature + policy (skip no-user /
 * skip local; localStorage + Firestore) and adds idempotency so a cache-restore
 * of the same graded result never double-counts. Unlike recordMistake it records
 * EVERY graded attempt — including full marks — because accuracy needs the
 * correct answers too (and PR 2 will use a correct attempt to shrink a weakness).
 *
 * Marks is the universal unit: an attempt carries marksScored/marksAvailable;
 * `correct` is derived (full marks) for the existing %-correct readers.
 * ────────────────────────────────────────────────────────────────────────── */

export interface RecordAttemptContext {
  subject: string;
  /** Human-readable topic label — stored as topicKey + topicName so attempts
   *  group with mistake-log rows (which also key on the label) on the Me page. */
  topic: string;
  /** Optional canonical/slug key; only a fallback when `topic` is absent. */
  topicKey?: string;
  /** Optional question text — distinguishes free-typed checks in the dedup key. */
  question?: string;
  /** Stable question id when the surface has one (Quick Practice / HPQ). */
  questionId?: string;
  marksScored: number;
  marksAvailable: number;
  mode: AttemptMode;
  difficulty?: string;
  bloomSkill?: string;
  /** Detect-then-confirm telemetry (Check & Improve only). */
  marksSource?: string;
  detectionOverride?: DetectionOverrideLog | null;
  /** Defaults to now; pass-through kept for testability. */
  timestamp?: number;
  /** SCORECARD-MI-1 PR-2 (H1, ruling A2) — the submission identity, the SAME fields the
   *  sibling `recordMistake` call keys its entry on: which surface graded it, the session /
   *  paper / check id, and the answer's own identity only where one context allows several
   *  answers to one question. Re-grading the same submission REPLACES its attempt. */
  surface?: string;
  submissionId?: string;
  answerKey?: string;
  /** SCORECARD-MI-1 PR-2 (H7/H11) — the per-question grade this attempt records, when the
   *  surface has one. Read only for its v2 marks (versioned) and its not-attempted state
   *  (`isLossOnlyNotAttempted`); the marks recorded stay `marksScored` / `marksAvailable`. */
  grade?: GradedQuestionLike | null;
}

export type RecordAttemptOutcome =
  | "recorded" // newly persisted
  | "replaced" // a re-grade of the same submission: its attempt now holds the LATEST outcome
  | "duplicate" // the same submission with the same outcome already recorded
  | "skipped-no-user" // signed out
  | "skipped-local" // local/browse session — never persists fabricated history
  | "skipped-invalid"; // no positive marksAvailable — nothing measurable to record

const ATTEMPT_DEDUP_KEY = "lazytopper.attempt.dedup.v1";
const ATTEMPT_DEDUP_MAX = 400;

function readAttemptDedup(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ATTEMPT_DEDUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeAttemptDedup(keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ATTEMPT_DEDUP_KEY,
      JSON.stringify(keys.slice(0, ATTEMPT_DEDUP_MAX)),
    );
  } catch {
    /* quota / SSR — dedup is best-effort, never blocks recording */
  }
}

// attemptDedupKey + upsertAttempt live in ./attemptDedupKey (a dependency-free module) so
// the key's properties — mode-independence, and (SCORECARD-MI-1 PR-2, H1) one key per
// SUBMISSION with the score never in it, latest outcome wins — are provable in the CI-gated
// ops matrix by importing the REAL functions (objective_dedup_acceptance.mjs §4b).

function toLTSubject(subject: string): LTSubject {
  return String(subject).trim().toLowerCase() === "science" ? "science" : "maths";
}

function toDifficulty(difficulty?: string): DifficultyLevel {
  const v = String(difficulty || "").trim().toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Medium";
}

/**
 * The single attempt-ingestion front door. ONE attempt per SUBMISSION (ruling A2; H1):
 * re-grading the same submission REPLACES its attempt (latest wins), a new submission adds
 * one. Returns the outcome so a surface can drive its own status.
 */
export function recordAttempt(
  user: AuthUser | null | undefined,
  ctx: RecordAttemptContext,
): RecordAttemptOutcome {
  // ── Policy (mirror recordMistake) ─────────────────────────────────────
  if (!user?.uid) return "skipped-no-user";
  if (user.isLocalSession) return "skipped-local";

  const available = Number(ctx.marksAvailable);
  if (!Number.isFinite(available) || available <= 0) return "skipped-invalid";
  let scored = Number(ctx.marksScored);
  if (!Number.isFinite(scored)) scored = 0;
  // Clamp to [0, available] so a stray grader value can never invent marks.
  scored = Math.max(0, Math.min(scored, available));

  // ── Identity (H1 — superseded by owner ruling 2026-10-05: re-grade replaces) ──
  // The submission's identity — never the score. A re-grade writes the SAME key, so the
  // stored attempt (local id AND Firestore doc id) is replaced, never doubled.
  const key = attemptDedupKey(user.uid, ctx);
  // Sanitize Firestore-illegal chars ("/", ".", "#", "$", "[", "]", whitespace) to "_" so the
  // key is a valid doc id. The same id is the local attempt's id, so both stores replace.
  const attemptId = key.replace(/[/.#$[\]\s]/g, "_");
  const seen = readAttemptDedup();

  // ── H7 / H11 — what the grade says beyond the marks (both additive, both versioned) ──
  const grade = ctx.grade && isGradedQuestion(ctx.grade) ? ctx.grade : null;
  const v2Marks = grade ? questionMarksLost(grade) : null;
  const notAttempted = grade ? isLossOnlyNotAttempted(grade) : false;

  // ── Build + persist ───────────────────────────────────────────────────
  const topicLabel = String(ctx.topic ?? ctx.topicKey ?? "").trim();
  // Canonicalise ONLY the key to the topics.ts slug (P0 [FU-TOPICKEY-UNIVERSAL]);
  // keep the human-readable label verbatim in topicName. Read-time aggregation
  // re-resolves both old (label-keyed) and new (slug-keyed) attempts to the same
  // canonical bucket, so no historical backfill is needed.
  const canonicalTopicKey = resolveCanonicalSlug(ctx.topicKey ?? ctx.topic) || topicLabel;
  const isCorrect = scored >= available;
  const attemptDoc: PracticeAttempt = {
    id: attemptId,
    questionId: ctx.questionId?.trim() || "",
    topicKey: canonicalTopicKey,
    topicName: topicLabel || undefined,
    subject: toLTSubject(ctx.subject),
    difficulty: toDifficulty(ctx.difficulty),
    bloomSkill: ctx.bloomSkill,
    correct: isCorrect,
    marksScored: scored,
    marksAvailable: available,
    mode: ctx.mode,                       // AttemptMode: "graded" | "mcq" | "self-assess" — UNCHANGED
    ...(ctx.marksSource ? { marksSource: ctx.marksSource } : {}),
    ...(ctx.detectionOverride ? { detectionOverride: ctx.detectionOverride } : {}),
    ...(notAttempted ? { notAttempted: true } : {}),
    ...(v2Marks ? { marksLostByType: v2Marks, marksLostByTypeVersion: MARKS_LOST_BY_TYPE_VERSION } : {}),
    timestamp: Number(ctx.timestamp) || Date.now(),
  };
  // N1 — a submission recorded before the identity key: recognised, never doubled (see above).
  const transition = legacyTransition(user.uid, ctx, attemptId, seen, scored, available);
  if (transition.kind === "same-outcome") return "duplicate";
  let stored: { outcome: "recorded" | "replaced" | "duplicate"; previous: Pick<PracticeAttempt, "correct"> | null };
  if (transition.kind === "re-graded") {
    replaceLegacyAttempts(attemptDoc);
    stored = { outcome: "replaced", previous: { correct: transition.previousCorrect } };
  } else {
    stored = storeAttempt(attemptDoc);
  }
  if (stored.outcome === "duplicate") return "duplicate";
  const retired = transition.kind === "re-graded" ? transition.legacyKeys : [];
  writeAttemptDedup([key, ...seen.filter((k) => k !== key && !retired.includes(k))]);

  // PR-B: durable per-attempt time-series. Write each recorded attempt as an
  // independently queryable Firestore document. Idempotent BY CONSTRUCTION — the doc id IS
  // the submission identity, so a re-grade (or a cache-restore replay) OVERWRITES the same
  // doc: latest wins, never a duplicate. `merge: false` so a field the new outcome no longer
  // carries (e.g. `notAttempted` after a re-grade) does not linger from the old one.
  // Fire-and-forget, mirrors the blob-write guard in saveInsights.
  if (firestoreDb && user.uid !== "anonymous") {
    // N1 — the old score-keyed doc of a re-graded pre-change submission leaves the cloud too, so
    // the durable time-series also holds ONE attempt for it (its id = the old key, sanitized).
    for (const legacyKey of retired) {
      try {
        void deleteDoc(doc(firestoreDb, "practiceInsights", user.uid, "attempts", legacyKey.replace(/[/.#$[\]\s]/g, "_")))
          .catch((e) => console.warn("[practiceInsights] legacy attempt delete failed", e));
      } catch (e) {
        console.warn("[practiceInsights] legacy attempt delete failed", e);
      }
    }
    void setDoc(
      doc(firestoreDb, "practiceInsights", user.uid, "attempts", attemptId),
      attemptDoc,
    ).catch((e) => console.warn("[practiceInsights] attempt write failed", e));
  }

  // ── Loop-closer (MI-Loop Stage 2 PR 2) ────────────────────────────────
  // A FULLY-correct attempt shrinks the topic's active weakness by one. This
  // is the return leg: `recordMistake` grows the wrong-answer count (Stream 3)
  // when a graded answer loses marks; a clean drill answered correctly here
  // decrements it via `clearWrongAnswer` (already clamped at 0 — never
  // negative). A partial / wrong attempt is `isCorrect === false` and never
  // shrinks anything.
  //
  // Key-matching is the critical detail (the G9 alias-fragility class): the
  // wrong-answer weakness is keyed by the bridge as the canonical topics.ts slug
  // (`resolveCanonicalSlug(topicKey ?? topic)`), so we resolve the SAME canonical
  // key here (NOT the raw human label) and decrement the stored entry using its
  // OWN key, so the map key matches exactly (P0 [FU-TOPICKEY-UNIVERSAL]).
  //
  // H1 — it fires when the SUBMISSION becomes fully correct: a new correct attempt, or a
  // re-grade that turns a wrong one right. A re-grade of an already-correct submission
  // drains nothing twice.
  const becameCorrect = isCorrect && !(stored.outcome === "replaced" && stored.previous?.correct === true);
  if (becameCorrect) {
    try {
      const canonicalKey = resolveCanonicalSlug(ctx.topicKey ?? ctx.topic) || "";
      if (canonicalKey) {
        const gaps = getWrongConceptsForTopic(canonicalKey);
        if (gaps.length > 0) {
          // Drain the dominant gap first (highest count; tie-break most recent).
          const target = gaps.reduce((a, b) =>
            b.count > a.count || (b.count === a.count && b.timestamp > a.timestamp) ? b : a,
          );
          clearWrongAnswer(target.topicKey, target.conceptKey);
        }
      }
    } catch {
      /* loop-closer is best-effort — never blocks recording the attempt */
    }
  }

  return stored.outcome;
}

/**
 * PR-B: durable cloud-backed attempt query. Reads the per-attempt subcollection
 * `practiceInsights/{uid}/attempts`, filtered by timestamp range — the durable,
 * cross-device source the Progress engine reads. Additive: the synchronous
 * getAttempts() (localStorage) is unchanged and stays the fast-path for quick surfaces.
 */
export async function getAttemptsFromCloud(
  uid: string,
  options: { start?: number; end?: number } = {},
): Promise<PracticeAttempt[]> {
  if (!firestoreDb || !uid || uid === "anonymous") return [];
  try {
    const col = collection(firestoreDb, "practiceInsights", uid, "attempts");
    const clauses = [];
    if (typeof options.start === "number") clauses.push(where("timestamp", ">=", options.start));
    if (typeof options.end === "number") clauses.push(where("timestamp", "<=", options.end));
    const snap = await getDocs(clauses.length ? query(col, ...clauses) : query(col));
    return snap.docs.map((d) => d.data() as PracticeAttempt);
  } catch (err) {
    console.warn("getAttemptsFromCloud failed:", err);
    return [];
  }
}

/**
 * Retrieve attempts within a given time range.
 */
export function getAttempts(options: {
  start?: number;
  end?: number;
} = {}): PracticeAttempt[] {
  const { start, end } = options;
  const data = loadInsights();
  return data.attempts.filter((attempt) => {
    const ts = attempt.timestamp;
    if (start !== undefined && ts < start) return false;
    if (end !== undefined && ts > end) return false;
    return true;
  });
}

/**
 * Clear all recorded practice insights.
 */
export function clearInsights(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getStorageKey());
    const uid = getActiveProgressUser();
    if (!uid) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Failed to clear practice insights:", err);
  }
}

/**
 * Compute a lightweight snapshot of weak concepts and common mistakes.
 */
export function computePracticeInsights(options: {
  grade: number;
  subject: string;
  topic: string;
}): PracticeInsightSnapshot {
  const attempts = getAttempts();
  const weakCounts: Record<string, number> = {};
  for (const a of attempts) {
    if (options.subject && a.subject !== options.subject.toLowerCase()) continue;
    if (options.topic && !canonicalSlugMatches(a.topicKey, options.topic)) continue;
    if (!a.correct) {
      const key = resolveCanonicalSlug(a.topicKey) || a.topicKey;
      weakCounts[key] = (weakCounts[key] ?? 0) + 1;
    }
  }
  const weakConcepts: PracticeWeakConcept[] = Object.entries(weakCounts)
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const commonMistakes: PracticeCommonMistake[] = [];
  return { weakConcepts, commonMistakes };
}
