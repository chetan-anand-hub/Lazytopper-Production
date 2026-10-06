import { loadTopicMasterySnapshot } from "./topicHubMastery";
import { roundMarks } from "../lib/mistakeDisplay";

export type AdaptiveLevel = "building_foundations" | "exam_ready" | "challenge_mode";

export interface AdaptiveLevelInfo {
  level: AdaptiveLevel;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export interface WrongAnswerEntry {
  questionId: string;
  topicKey: string;
  conceptKey: string;
  difficulty: string;
  timestamp: number;
  count: number;
  /**
   * SCORECARD-MI-1 PR-2 (B7) — the knowledge-gap (conceptual) MARKS lost across the wrongs on
   * this entry that came from a grade carrying v2 `marksLostByType`. OPTIONAL and additive (the
   * log stays version 1): an entry written before PR-2, or only from count-only grades, has
   * neither this nor `conceptualMarksCount` and is weighed by `count`, exactly as before.
   */
  conceptualMarksLost?: number;
  /** How many of `count` carried `conceptualMarksLost` (so a count-only wrong on the same entry
   *  keeps its count weight). Present only together with `conceptualMarksLost`. */
  conceptualMarksCount?: number;
}

export interface WrongAnswerLog {
  version: 1;
  entries: Record<string, WrongAnswerEntry>;
  /** ME-ENGINE-1 PR-2 (G11) — epoch ms of the last change, set on every save. Decides which copy
   *  wins when a device and the cloud disagree (newer wins, as the Tutor thread). Optional and
   *  additive: a log saved before PR-2 has none and counts as oldest (0). */
  updatedAt?: number;
}

export interface AdaptiveDifficultyMix {
  Easy: number;
  Medium: number;
  Hard: number;
}

export interface SelfAssessment {
  questionId: string;
  result: "got_it" | "need_practice";
  timestamp: number;
}

export interface PracticeSessionTracker {
  topicKey: string;
  assessments: SelfAssessment[];
  followUpQueue: FollowUpRequest[];
}

export interface FollowUpRequest {
  conceptKey: string;
  difficulty: string;
  sourceQuestionId: string;
  injectedAtIndex: number;
}

const WRONG_ANSWER_STORAGE_KEY = "lazytopper.wrongAnswerLog.v1";
/** Same key studentProgressStore keeps the active uid under (read directly so this module
 *  stays free of the Firebase import graph). */
const ACTIVE_PROGRESS_UID_KEY = "lazytopper.progress.active_uid.v1";

/**
 * GA-26 (SCORECARD-MI-1) — the wrong-answer log is PER STUDENT. It used to be one unscoped
 * device key, so on a shared device one student's knowledge gaps fed another student's weak
 * areas. A signed-in uid now owns `lazytopper.wrongAnswerLog.v1:<uid>`; the unscoped key is
 * read only when nobody is active (never merged into a student's log, which is what leaked).
 */
function activeUid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const uid = window.localStorage.getItem(ACTIVE_PROGRESS_UID_KEY);
    return uid && uid.trim() ? uid.trim() : null;
  } catch {
    return null;
  }
}

function wrongAnswerStorageKey(uid: string | null = activeUid()): string {
  return uid ? `${WRONG_ANSWER_STORAGE_KEY}:${uid}` : WRONG_ANSWER_STORAGE_KEY;
}

function parseWrongAnswerLog(raw: unknown): WrongAnswerLog | null {
  if (raw && typeof raw === "object") {
    const parsed = raw as WrongAnswerLog;
    if (parsed.version === 1 && parsed.entries && typeof parsed.entries === "object") return parsed;
  }
  return null;
}

/* ── ME-ENGINE-1 PR-2 (G11) — the wrong-answer log is SYNCED ─────────────────────────────────
 * It used to live on one device only, so a second device showed no weak areas at all. Every save
 * now also writes the whole log as ONE field, `wrongAnswerLog`, of the student's existing profile
 * document `learnerProfiles/{uid}` (owner-only rules; DPDP map id `learnerProfiles`, which export
 * and erasure already walk — a new field on an existing location, no new location). The field is
 * REPLACED whole on each write (`mergeFields`), never deep-merged, so a cleared entry stays
 * cleared; every other profile field is untouched. Sign-in hydrates it back
 * (`hydrateWrongAnswerLogFromCloud`, run with the mistake-log hydration). The newer copy wins by
 * `updatedAt`. The Firebase modules are imported lazily so this module's static import graph
 * stays Firebase-free.
 */
const WRONG_ANSWER_CLOUD_FIELD = "wrongAnswerLog";

function isCloudUid(uid: string | null): uid is string {
  return Boolean(uid && uid !== "anonymous");
}

async function cloudRef(uid: string) {
  const [{ firestoreDb }, { doc }] = await Promise.all([import("./firebaseClient"), import("firebase/firestore")]);
  return firestoreDb ? doc(firestoreDb, "learnerProfiles", uid) : null;
}

/** Pushes run ONE AT A TIME, in save order — two quick saves must never land newest-first. */
let pushChain: Promise<void> = Promise.resolve();

function pushWrongAnswerLog(uid: string, log: WrongAnswerLog): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(log)) as WrongAnswerLog;
  pushChain = pushChain
    .then(async () => {
      const ref = await cloudRef(uid);
      if (!ref) return;
      const { setDoc } = await import("firebase/firestore");
      await setDoc(ref, { [WRONG_ANSWER_CLOUD_FIELD]: snapshot }, { mergeFields: [WRONG_ANSWER_CLOUD_FIELD] });
    })
    .catch(() => {
      /* best-effort: the device copy stays, and the next save or sign-in retries */
    });
  return pushChain;
}

/**
 * Bring the signed-in student's synced wrong-answer log onto this device (sign-in). The newer copy
 * wins: a newer cloud log replaces the device copy; a newer device log (written before it could
 * sync) is pushed up. Never throws. Returns which way it went (for tests and diagnostics).
 */
export async function hydrateWrongAnswerLogFromCloud(
  uid: string | null | undefined,
): Promise<"pulled" | "pushed" | "same" | "skipped"> {
  const id = uid ?? null;
  if (typeof window === "undefined" || !isCloudUid(id)) return "skipped";
  try {
    const ref = await cloudRef(id);
    if (!ref) return "skipped";
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(ref);
    const cloud = snap.exists() ? parseWrongAnswerLog((snap.data() as Record<string, unknown>)[WRONG_ANSWER_CLOUD_FIELD]) : null;
    const local = readWrongAnswerLogFor(id);
    const cloudAt = Number(cloud?.updatedAt) || 0;
    const localAt = Number(local?.updatedAt) || 0;
    if (cloud && cloudAt > localAt) {
      window.localStorage.setItem(wrongAnswerStorageKey(id), JSON.stringify(cloud));
      return "pulled";
    }
    if (local && Object.keys(local.entries).length > 0 && localAt > cloudAt) {
      await pushWrongAnswerLog(id, { ...local, updatedAt: localAt || Date.now() });
      return "pushed";
    }
    return "same";
  } catch {
    return "skipped";
  }
}

function readWrongAnswerLogFor(uid: string | null): WrongAnswerLog | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(wrongAnswerStorageKey(uid));
    return raw ? parseWrongAnswerLog(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function nowMs(): number {
  return Date.now();
}

export function loadWrongAnswerLog(): WrongAnswerLog {
  return readWrongAnswerLogFor(activeUid()) ?? { version: 1, entries: {} };
}

export function saveWrongAnswerLog(log: WrongAnswerLog): void {
  if (typeof window === "undefined") return;
  const uid = activeUid();
  const stamped: WrongAnswerLog = { ...log, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(wrongAnswerStorageKey(uid), JSON.stringify(stamped));
  } catch {
    /* ignore */
  }
  // G11 — the signed-in student's log is synced (never the unscoped signed-out key).
  if (isCloudUid(uid)) void pushWrongAnswerLog(uid, stamped);
}

/** A usable conceptual-marks figure (finite, > 0), else null — never an invented 0. */
function positiveMarks(value: unknown): number | null {
  const n = Number(value);
  return typeof value === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Record one wrong answer on a (topic, concept). SCORECARD-MI-1 PR-2 (B7): the optional
 * `conceptualMarksLost` is the knowledge-gap MARKS that grade lost (from GRADER-CORE-1 v2
 * `marksLostByType.conceptual`). When given (> 0) the entry accumulates it, so weak areas can
 * weigh this wrong by marks; absent (a count-only grade), the entry is recorded exactly as
 * before — no marks field is written and none is invented.
 */
export function recordWrongAnswer(
  questionId: string,
  topicKey: string,
  conceptKey: string,
  difficulty: string,
  conceptualMarksLost?: number
): WrongAnswerLog {
  const log = loadWrongAnswerLog();
  const key = `${topicKey}::${conceptKey || questionId}`;
  const existing = log.entries[key];
  const next: WrongAnswerEntry = {
    questionId,
    topicKey,
    conceptKey: conceptKey || questionId,
    difficulty,
    timestamp: nowMs(),
    count: (existing?.count ?? 0) + 1,
  };
  const priorMarks = positiveMarks(existing?.conceptualMarksLost);
  const priorMarked = priorMarks ? Math.max(0, Math.floor(Number(existing?.conceptualMarksCount) || 0)) : 0;
  const added = positiveMarks(conceptualMarksLost);
  if (priorMarks || added) {
    next.conceptualMarksLost = roundMarks((priorMarks ?? 0) + (added ?? 0));
    next.conceptualMarksCount = Math.min(next.count, priorMarked + (added ? 1 : 0));
  }
  log.entries[key] = next;
  saveWrongAnswerLog(log);
  return log;
}

/**
 * One wrong on the entry is cleared (the student got the concept right). The count drops by
 * one, as before; an entry with no count left is removed, as before. SCORECARD-MI-1 PR-2: on an
 * entry that carries conceptual marks, a count-only wrong is cleared first; once only marked
 * wrongs remain, a clear removes one marked wrong's AVERAGE marks — so the marks evidence falls
 * with the count and a topic can recover, never stranded at its old weight.
 */
export function clearWrongAnswer(
  topicKey: string,
  conceptKey: string
): void {
  const log = loadWrongAnswerLog();
  const key = `${topicKey}::${conceptKey}`;
  if (log.entries[key]) {
    const entry = log.entries[key];
    entry.count = Math.max(0, entry.count - 1);
    const marks = positiveMarks(entry.conceptualMarksLost);
    const marked = Math.max(0, Math.floor(Number(entry.conceptualMarksCount) || 0));
    if (marks && marked > 0 && entry.count < marked) {
      entry.conceptualMarksLost = roundMarks(marks - marks / marked);
      entry.conceptualMarksCount = marked - 1;
    }
    if (entry.count <= 0) {
      delete log.entries[key];
    }
    saveWrongAnswerLog(log);
  }
}

export function getWrongConceptsForTopic(topicKey: string): WrongAnswerEntry[] {
  const log = loadWrongAnswerLog();
  const normalizedTopic = topicKey.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return Object.values(log.entries).filter(
    (e) => e.topicKey.toLowerCase().replace(/[^a-z0-9_-]+/g, "_") === normalizedTopic && e.count > 0
  );
}

export function computeTopicMasteryScore(topicKey: string): number {
  const snapshot = loadTopicMasterySnapshot(topicKey);
  const nodes = Object.values(snapshot.nodes);
  if (nodes.length === 0) return 0;

  let totalScore = 0;
  for (const node of nodes) {
    switch (node.state) {
      case "mastered":
        totalScore += 100;
        break;
      case "checkpoint_passed":
        totalScore += 70;
        break;
      case "needs_practice":
        totalScore += 30;
        break;
      case "learning":
        totalScore += 15;
        break;
      default:
        totalScore += 0;
    }
  }
  return totalScore / nodes.length;
}

export function computeAdaptiveDifficultyMix(topicKey: string): AdaptiveDifficultyMix {
  const masteryScore = computeTopicMasteryScore(topicKey);
  const wrongConcepts = getWrongConceptsForTopic(topicKey);
  const wrongCount = wrongConcepts.reduce((sum, e) => sum + e.count, 0);

  const wrongPenalty = Math.min(wrongCount * 5, 25);
  const effectiveMastery = Math.max(0, masteryScore - wrongPenalty);

  if (effectiveMastery < 30) {
    return { Easy: 0.55, Medium: 0.35, Hard: 0.1 };
  }
  if (effectiveMastery < 55) {
    return { Easy: 0.35, Medium: 0.45, Hard: 0.2 };
  }
  if (effectiveMastery < 75) {
    return { Easy: 0.2, Medium: 0.45, Hard: 0.35 };
  }
  return { Easy: 0.1, Medium: 0.35, Hard: 0.55 };
}

export function getAdaptiveLevel(topicKey: string): AdaptiveLevel {
  const masteryScore = computeTopicMasteryScore(topicKey);
  if (masteryScore < 40) return "building_foundations";
  if (masteryScore < 75) return "exam_ready";
  return "challenge_mode";
}

export function getAdaptiveLevelInfo(topicKey: string): AdaptiveLevelInfo {
  const level = getAdaptiveLevel(topicKey);
  switch (level) {
    case "building_foundations":
      return {
        level,
        label: "Building Foundations",
        emoji: "🧱",
        color: "#b45309",
        bgColor: "#fef3c7",
      };
    case "exam_ready":
      return {
        level,
        label: "Exam Ready",
        emoji: "📝",
        color: "#1d4ed8",
        bgColor: "#dbeafe",
      };
    case "challenge_mode":
      return {
        level,
        label: "Challenge Mode",
        emoji: "🚀",
        color: "#7c3aed",
        bgColor: "#ede9fe",
      };
  }
}

export function createSessionTracker(topicKey: string): PracticeSessionTracker {
  return {
    topicKey,
    assessments: [],
    followUpQueue: [],
  };
}

export function recordSelfAssessment(
  tracker: PracticeSessionTracker,
  questionId: string,
  result: "got_it" | "need_practice",
  conceptKey: string,
  difficulty: string
): PracticeSessionTracker {
  const next = { ...tracker };
  next.assessments = [
    ...tracker.assessments,
    { questionId, result, timestamp: nowMs() },
  ];

  if (result === "need_practice") {
    recordWrongAnswer(questionId, tracker.topicKey, conceptKey, difficulty);
    next.followUpQueue = [
      ...tracker.followUpQueue,
      {
        conceptKey: conceptKey || questionId,
        difficulty,
        sourceQuestionId: questionId,
        injectedAtIndex: -1,
      },
    ];
  } else {
    if (conceptKey) {
      clearWrongAnswer(tracker.topicKey, conceptKey);
    }
  }

  return next;
}

export function getNextFollowUp(
  tracker: PracticeSessionTracker
): FollowUpRequest | null {
  const pending = tracker.followUpQueue.filter((f) => f.injectedAtIndex === -1);
  return pending.length > 0 ? pending[0] : null;
}

export function markFollowUpInjected(
  tracker: PracticeSessionTracker,
  sourceQuestionId: string,
  atIndex: number
): PracticeSessionTracker {
  return {
    ...tracker,
    followUpQueue: tracker.followUpQueue.map((f) =>
      f.sourceQuestionId === sourceQuestionId && f.injectedAtIndex === -1
        ? { ...f, injectedAtIndex: atIndex }
        : f
    ),
  };
}

function extractConcept(q: Record<string, unknown>): string {
  return String(
    q.subtopic ?? q.conceptKey ?? q.subtopicKey ?? ""
  ).toLowerCase().trim();
}

export function findFollowUpQuestion<T>(
  allQuestions: T[],
  currentQuestionIds: Set<string>,
  conceptKey: string,
  _difficulty: string
): T | null {
  const target = conceptKey.toLowerCase().trim();
  if (!target) return null;
  for (const q of allQuestions) {
    const rec = q as Record<string, unknown>;
    const qId = String(rec.id ?? "");
    if (currentQuestionIds.has(qId)) continue;
    const qConcept = extractConcept(rec);
    if (qConcept && qConcept === target) {
      return q;
    }
  }
  for (const q of allQuestions) {
    const rec = q as Record<string, unknown>;
    const qId = String(rec.id ?? "");
    if (currentQuestionIds.has(qId)) continue;
    const qConcept = extractConcept(rec);
    if (qConcept && (target.includes(qConcept) || qConcept.includes(target))) {
      return q;
    }
  }
  return null;
}

export function getSessionStats(tracker: PracticeSessionTracker): {
  total: number;
  gotIt: number;
  needPractice: number;
  accuracy: number;
} {
  const total = tracker.assessments.length;
  const gotIt = tracker.assessments.filter((a) => a.result === "got_it").length;
  const needPractice = total - gotIt;
  return {
    total,
    gotIt,
    needPractice,
    accuracy: total > 0 ? gotIt / total : 0,
  };
}

export function shouldInjectFollowUp(
  tracker: PracticeSessionTracker,
  currentIndex: number
): boolean {
  const pendingFollowUps = tracker.followUpQueue.filter(
    (f) => f.injectedAtIndex === -1
  );
  if (pendingFollowUps.length === 0) return false;

  const lastWrongIndex = tracker.assessments.length - 1;
  const questionsAfterWrong = currentIndex - lastWrongIndex;
  return questionsAfterWrong >= 1 && questionsAfterWrong <= 3;
}
