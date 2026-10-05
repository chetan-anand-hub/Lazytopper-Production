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
function wrongAnswerStorageKey(): string {
  if (typeof window === "undefined") return WRONG_ANSWER_STORAGE_KEY;
  try {
    const uid = window.localStorage.getItem(ACTIVE_PROGRESS_UID_KEY);
    return uid && uid.trim() ? `${WRONG_ANSWER_STORAGE_KEY}:${uid.trim()}` : WRONG_ANSWER_STORAGE_KEY;
  } catch {
    return WRONG_ANSWER_STORAGE_KEY;
  }
}

function nowMs(): number {
  return Date.now();
}

export function loadWrongAnswerLog(): WrongAnswerLog {
  if (typeof window === "undefined") return { version: 1, entries: {} };
  try {
    const raw = window.localStorage.getItem(wrongAnswerStorageKey());
    if (!raw) return { version: 1, entries: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.version === 1 && parsed.entries) {
      return parsed as WrongAnswerLog;
    }
    return { version: 1, entries: {} };
  } catch {
    return { version: 1, entries: {} };
  }
}

export function saveWrongAnswerLog(log: WrongAnswerLog): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(wrongAnswerStorageKey(), JSON.stringify(log));
  } catch {
    /* ignore */
  }
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
