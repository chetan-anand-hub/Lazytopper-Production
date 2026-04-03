import { loadInsights, type PracticeAttempt } from "./practiceInsights";
import { loadWrongAnswerLog, type WrongAnswerEntry } from "./adaptivePracticeEngine";
import { loadTopicMasterySnapshot, type TopicHubNodeMasteryState } from "./topicHubMastery";
import { canonicalChapters } from "../data/syllabus/cbse10Canonical";
import { normalizeTopicKey } from "../utils/topicResolver";
import { getMockTopicScores } from "./mockScoreHistory";

export interface WeakArea {
  topicKey: string;
  topicName: string;
  subject: "Maths" | "Science";
  confidenceScore: number;
  accuracy: number;
  totalAttempts: number;
  wrongCount: number;
  masteryPercent: number;
  masteryState: TopicHubNodeMasteryState;
  lastPracticedAt: number;
  weakConcepts: string[];
}

export interface WeakAreaSummary {
  weakAreas: WeakArea[];
  totalWeak: number;
  closedThisWeek: number;
  overallMasteryPercent: number;
}

const TOPIC_NAMES: Record<string, string> = {
  "real-numbers": "Real Numbers",
  polynomials: "Polynomials",
  "pair-of-linear-equations": "Linear Equations",
  "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression",
  triangles: "Triangles",
  "coordinate-geometry": "Coordinate Geometry",
  circles: "Circles",
  constructions: "Constructions",
  "areas-related-to-circles": "Areas & Circles",
  "surface-areas-and-volumes": "Surface Area & Volumes",
  trigonometry: "Trigonometry",
  statistics: "Statistics",
  probability: "Probability",
  "chemical-reactions-equations": "Chemical Reactions",
  "acids-bases-salts": "Acids, Bases & Salts",
  "metals-non-metals": "Metals & Non-metals",
  "carbon-and-its-compounds": "Carbon Compounds",
  "life-processes": "Life Processes",
  "how-do-organisms-reproduce": "Reproduction",
  "human-eye-colourful-world": "Human Eye",
  electricity: "Electricity",
  "magnetic-effects-of-electric-current": "Magnetic Effects",
  "light-reflection-refraction": "Light & Refraction",
  "control-and-coordination": "Control & Coordination",
  "heredity-and-evolution": "Heredity & Evolution",
  "our-environment": "Our Environment",
};

function getTopicDisplayName(topicKey: string): string {
  return TOPIC_NAMES[topicKey] || topicKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeTopicMastery(topicKey: string): { percent: number; state: TopicHubNodeMasteryState } {
  const snap = loadTopicMasterySnapshot(topicKey);
  const nodes = Object.values(snap.nodes);
  if (nodes.length === 0) return { percent: 0, state: "unseen" };

  const stateScores: Record<string, number> = {
    unseen: 0, learning: 20, needs_practice: 40, checkpoint_passed: 70, mastered: 100,
  };
  let total = 0;
  let worstState: TopicHubNodeMasteryState = "mastered";
  const stateRank: Record<string, number> = { unseen: 0, learning: 1, needs_practice: 2, checkpoint_passed: 3, mastered: 4 };

  for (const n of nodes) {
    total += stateScores[n.state] ?? 0;
    if ((stateRank[n.state] ?? 0) < (stateRank[worstState] ?? 0)) {
      worstState = n.state;
    }
  }
  return { percent: total / nodes.length, state: worstState };
}

function aggregateAttemptsByTopic(attempts: PracticeAttempt[]): Map<string, { correct: number; total: number; lastTs: number }> {
  const map = new Map<string, { correct: number; total: number; lastTs: number }>();
  for (const a of attempts) {
    const key = normalizeTopicKey(a.topicKey) || a.topicKey;
    const prev = map.get(key) || { correct: 0, total: 0, lastTs: 0 };
    prev.total++;
    if (a.correct) prev.correct++;
    prev.lastTs = Math.max(prev.lastTs, a.timestamp);
    map.set(key, prev);
  }
  return map;
}

function aggregateWrongAnswersByTopic(entries: WrongAnswerEntry[]): Map<string, { count: number; concepts: string[] }> {
  const map = new Map<string, { count: number; concepts: string[] }>();
  for (const e of entries) {
    const key = normalizeTopicKey(e.topicKey) || e.topicKey;
    const prev = map.get(key) || { count: 0, concepts: [] };
    prev.count += e.count;
    if (e.conceptKey && !prev.concepts.includes(e.conceptKey)) {
      prev.concepts.push(e.conceptKey);
    }
    map.set(key, prev);
  }
  return map;
}

export function getWeakAreas(options?: { subject?: "Maths" | "Science"; limit?: number }): WeakAreaSummary {
  const insights = loadInsights();
  const wrongLog = loadWrongAnswerLog();

  const attemptMap = aggregateAttemptsByTopic(insights.attempts);
  const wrongMap = aggregateWrongAnswersByTopic(Object.values(wrongLog.entries));
  const mockTopicScores = getMockTopicScores();

  const allTopics = canonicalChapters.map((ch) => ({
    topicKey: normalizeTopicKey(ch.canonicalSlug) || ch.canonicalSlug,
    subject: (ch.subjectId === "science" ? "Science" : "Maths") as "Maths" | "Science",
  }));

  const weakAreas: WeakArea[] = [];
  let totalMastery = 0;
  let topicCount = 0;

  for (const { topicKey, subject } of allTopics) {
    if (options?.subject && subject !== options.subject) continue;

    const { percent: masteryPercent, state: masteryState } = computeTopicMastery(topicKey);
    const attemptData = attemptMap.get(topicKey) || { correct: 0, total: 0, lastTs: 0 };
    const wrongData = wrongMap.get(topicKey) || { count: 0, concepts: [] };

    totalMastery += masteryPercent;
    topicCount++;

    const accuracy = attemptData.total > 0 ? (attemptData.correct / attemptData.total) * 100 : 0;

    const mockData = mockTopicScores.get(topicKey);

    let confidenceScore = 0;
    if (masteryPercent < 50) confidenceScore += (50 - masteryPercent) * 0.4;
    if (accuracy < 60 && attemptData.total >= 2) confidenceScore += (60 - accuracy) * 0.3;
    if (wrongData.count > 0) confidenceScore += Math.min(wrongData.count * 5, 30);
    if (attemptData.total === 0) confidenceScore += 15;
    if (masteryState === "unseen") confidenceScore += 10;
    if (mockData && mockData.avgPercent < 50) confidenceScore += (50 - mockData.avgPercent) * 0.25;

    if (confidenceScore > 5) {
      weakAreas.push({
        topicKey,
        topicName: getTopicDisplayName(topicKey),
        subject,
        confidenceScore: Math.round(confidenceScore),
        accuracy: Math.round(accuracy),
        totalAttempts: attemptData.total,
        wrongCount: wrongData.count,
        masteryPercent: Math.round(masteryPercent),
        masteryState,
        lastPracticedAt: attemptData.lastTs,
        weakConcepts: wrongData.concepts.slice(0, 5),
      });
    }
  }

  weakAreas.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentAttempts = insights.attempts.filter((a) => a.timestamp > oneWeekAgo);
  const recentTopics = new Set(recentAttempts.map((a) => normalizeTopicKey(a.topicKey)));
  let closedThisWeek = 0;
  for (const tk of recentTopics) {
    if (!tk) continue;
    const mastery = computeTopicMastery(tk);
    if (mastery.percent < 70) continue;

    const olderAttempts = insights.attempts.filter(
      (a) => (normalizeTopicKey(a.topicKey) === tk) && a.timestamp <= oneWeekAgo
    );
    if (olderAttempts.length === 0) continue;
    const olderCorrect = olderAttempts.filter((a) => a.correct).length;
    const olderAccuracy = (olderCorrect / olderAttempts.length) * 100;
    if (olderAccuracy < 50) {
      closedThisWeek++;
    }
  }

  const limit = options?.limit ?? 20;
  return {
    weakAreas: weakAreas.slice(0, limit),
    totalWeak: weakAreas.length,
    closedThisWeek,
    overallMasteryPercent: topicCount > 0 ? Math.round(totalMastery / topicCount) : 0,
  };
}

export function getWeakTopicKeys(subject?: "Maths" | "Science", limit = 5): string[] {
  const { weakAreas } = getWeakAreas({ subject, limit });
  return weakAreas.map((w) => w.topicKey);
}
