import { loadTopicMasterySnapshot } from "./topicHubMastery";

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

function nowMs(): number {
  return Date.now();
}

export function loadWrongAnswerLog(): WrongAnswerLog {
  if (typeof window === "undefined") return { version: 1, entries: {} };
  try {
    const raw = window.localStorage.getItem(WRONG_ANSWER_STORAGE_KEY);
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
    window.localStorage.setItem(WRONG_ANSWER_STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

export function recordWrongAnswer(
  questionId: string,
  topicKey: string,
  conceptKey: string,
  difficulty: string
): WrongAnswerLog {
  const log = loadWrongAnswerLog();
  const key = `${topicKey}::${conceptKey || questionId}`;
  const existing = log.entries[key];
  log.entries[key] = {
    questionId,
    topicKey,
    conceptKey: conceptKey || questionId,
    difficulty,
    timestamp: nowMs(),
    count: (existing?.count ?? 0) + 1,
  };
  saveWrongAnswerLog(log);
  return log;
}

export function clearWrongAnswer(
  topicKey: string,
  conceptKey: string
): void {
  const log = loadWrongAnswerLog();
  const key = `${topicKey}::${conceptKey}`;
  if (log.entries[key]) {
    log.entries[key].count = Math.max(0, log.entries[key].count - 1);
    if (log.entries[key].count <= 0) {
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
