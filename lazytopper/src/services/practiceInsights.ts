/*
 * Practice Insights Service
 *
 * Records and retrieves practice attempts for analytics features like
 * Daily Mix and Weekly Wrapped.
 */

import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import type { AuthUser } from "../context/AuthContext";
import {
  buildProgressScopeKey,
  getActiveProgressUser,
  saveLearnerProgressSegment,
} from "./studentProgressStore";
import { clearWrongAnswer, getWrongConceptsForTopic } from "./adaptivePracticeEngine";
import { normalizeTopicKey } from "../utils/topicResolver";
import { firestoreDb } from "./firebaseClient";

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
        void setDoc(doc(firestoreDb, "practiceInsights", uid), { ...data, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Failed to save practice insights:", err);
  }
}

/**
 * Append a single practice attempt to the store (localStorage + Firestore
 * mirror via saveInsights). Internal — every write goes through the
 * `recordAttempt` front door so policy + dedup can never be bypassed.
 */
function appendAttempt(attempt: Omit<PracticeAttempt, "id"> & { id?: string }): void {
  const data = loadInsights();
  const id =
    attempt.id ??
    `${attempt.questionId || "q"}-${attempt.topicKey}-${Date.now().toString(36)}`;
  data.attempts.push({ ...attempt, id });
  saveInsights(data);
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
}

export type RecordAttemptOutcome =
  | "recorded" // newly persisted
  | "duplicate" // same (user, question, score, mode) already recorded
  | "skipped-no-user" // signed out
  | "skipped-local" // local/browse session — never persists fabricated history
  | "skipped-invalid"; // no positive marksAvailable — nothing measurable to record

const ATTEMPT_DEDUP_KEY = "lazytopper.attempt.dedup.v1";
const ATTEMPT_DEDUP_MAX = 400;

/** Stable, dependency-free string hash (djb2) for the no-questionId dedup sig. */
function hashAttemptString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

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

function attemptDedupKey(
  uid: string,
  ctx: RecordAttemptContext,
  scored: number,
  available: number,
): string {
  const qid =
    ctx.questionId && ctx.questionId.trim()
      ? ctx.questionId.trim()
      : `t:${hashAttemptString(ctx.question || ctx.topic || "")}`;
  return [uid, qid, `${scored}/${available}`, ctx.mode].join("::");
}

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
 * The single attempt-ingestion front door. Idempotent per (user, question,
 * score, mode). Returns the outcome so a surface can drive its own status.
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

  // ── Dedup ─────────────────────────────────────────────────────────────
  const key = attemptDedupKey(user.uid, ctx, scored, available);
  const seen = readAttemptDedup();
  if (seen.includes(key)) return "duplicate";

  // ── Build + persist ───────────────────────────────────────────────────
  const topicLabel = String(ctx.topic ?? ctx.topicKey ?? "").trim();
  const isCorrect = scored >= available;
  const attemptDoc = {
    questionId: ctx.questionId?.trim() || "",
    topicKey: topicLabel,
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
    timestamp: Number(ctx.timestamp) || Date.now(),
  };
  appendAttempt(attemptDoc);
  writeAttemptDedup([key, ...seen.filter((k) => k !== key)]);

  // PR-B: durable per-attempt time-series. Write each recorded attempt as an
  // independently queryable Firestore document. Idempotent BY CONSTRUCTION — the
  // doc id derives from the same dedup signature `key`, so a cache-restore replay
  // overwrites the same doc (never duplicates). Fire-and-forget, mirrors the
  // blob-write guard in saveInsights. The root blob still loads on app start;
  // this subcollection is the new durable, range-queryable layer.
  if (firestoreDb && user.uid !== "anonymous") {
    // `key` is `uid::qid::scored/available::mode` — sanitize Firestore-illegal chars
    // ("/", ".", "#", "$", "[", "]", whitespace) to "_" so it is a valid doc id.
    const attemptId = key.replace(/[/.#$[\]\s]/g, "_");
    void setDoc(
      doc(firestoreDb, "practiceInsights", user.uid, "attempts", attemptId),
      { ...attemptDoc, id: attemptId },
      { merge: true },
    ).catch(() => {});
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
  // weakness was keyed by the bridge as `normalizeTopicKey(topicKey ?? topic)`,
  // so we resolve the SAME canonical key here (NOT the raw human label — the
  // weak-area lookup keeps hyphens but turns spaces into "_", so a raw label
  // would miss the canonical entry). We then decrement the stored entry using
  // its OWN keys, so the map key matches exactly.
  if (isCorrect) {
    try {
      const canonicalKey = normalizeTopicKey(ctx.topicKey ?? ctx.topic) || "";
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

  return "recorded";
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
    if (options.topic && a.topicKey !== options.topic) continue;
    if (!a.correct) {
      const key = a.topicKey;
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
