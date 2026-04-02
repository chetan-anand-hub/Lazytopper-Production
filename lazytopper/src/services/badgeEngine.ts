import { loadInsights } from "./practiceInsights";
import { loadTopicMasterySnapshot, type TopicHubNodeMasteryState } from "./topicHubMastery";
import {
  loadLearnerProgress,
  saveLearnerProgress,
} from "./studentProgressStore";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "practice" | "mastery" | "accuracy" | "milestone";
  check: (ctx: BadgeContext) => boolean;
}

export interface EarnedBadge {
  id: string;
  earnedAt: string;
}

export interface JourneyMilestone {
  id: string;
  label: string;
  date: string;
  icon: string;
}

export interface BadgeContext {
  streak: number;
  totalQuestions: number;
  totalCorrect: number;
  topicsMastered: number;
  topicsStarted: number;
  totalTopics: number;
  perfectSets: number;
  daysActive: number;
}

const MATHS_TOPICS = [
  "real-numbers", "polynomials", "pair-of-linear-equations",
  "quadratic-equations", "arithmetic-progression", "triangles",
  "coordinate-geometry", "circles", "constructions",
  "areas-related-to-circles", "surface-areas-and-volumes",
  "trigonometry", "statistics", "probability",
];

const SCIENCE_TOPICS = [
  "chemical-reactions-equations", "acids-bases-salts",
  "metals-non-metals", "carbon-and-its-compounds",
  "life-processes", "how-do-organisms-reproduce",
  "human-eye-colourful-world", "electricity",
  "magnetic-effects-of-electric-current", "light-reflection-refraction",
];

export const ALL_TOPICS_BY_SUBJECT: Record<string, string[]> = {
  Maths: MATHS_TOPICS,
  Science: SCIENCE_TOPICS,
};

export const ALL_TOPIC_KEYS = [...MATHS_TOPICS, ...SCIENCE_TOPICS];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first-practice",
    name: "First Steps",
    description: "Completed your first practice question",
    icon: "🎯",
    category: "milestone",
    check: (ctx) => ctx.totalQuestions >= 1,
  },
  {
    id: "10-questions",
    name: "Getting Warmed Up",
    description: "Solved 10 questions",
    icon: "🔥",
    category: "practice",
    check: (ctx) => ctx.totalQuestions >= 10,
  },
  {
    id: "50-questions",
    name: "Half Century",
    description: "Solved 50 questions",
    icon: "🏏",
    category: "practice",
    check: (ctx) => ctx.totalQuestions >= 50,
  },
  {
    id: "100-questions",
    name: "Century Club",
    description: "Solved 100 questions",
    icon: "💯",
    category: "practice",
    check: (ctx) => ctx.totalQuestions >= 100,
  },
  {
    id: "streak-3",
    name: "3-Day Spark",
    description: "Maintained a 3-day streak",
    icon: "⚡",
    category: "streak",
    check: (ctx) => ctx.streak >= 3,
  },
  {
    id: "streak-7",
    name: "No Zero Week",
    description: "7 days of consistent practice",
    icon: "🗓️",
    category: "streak",
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: "streak-14",
    name: "Streak Beast",
    description: "14-day study streak",
    icon: "💪",
    category: "streak",
    check: (ctx) => ctx.streak >= 14,
  },
  {
    id: "streak-30",
    name: "Board Warrior",
    description: "30-day unbroken streak",
    icon: "🏆",
    category: "streak",
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: "streak-60",
    name: "Consistency Legend",
    description: "60 No Zero Days",
    icon: "💎",
    category: "streak",
    check: (ctx) => ctx.streak >= 60,
  },
  {
    id: "first-mastery",
    name: "Topic Conquered",
    description: "Mastered your first topic",
    icon: "👑",
    category: "mastery",
    check: (ctx) => ctx.topicsMastered >= 1,
  },
  {
    id: "5-topics-mastered",
    name: "Five Star",
    description: "Mastered 5 topics",
    icon: "⭐",
    category: "mastery",
    check: (ctx) => ctx.topicsMastered >= 5,
  },
  {
    id: "all-topics-started",
    name: "Explorer",
    description: "Attempted at least one question from every topic",
    icon: "🧭",
    category: "milestone",
    check: (ctx) => ctx.topicsStarted >= ctx.totalTopics && ctx.totalTopics > 0,
  },
  {
    id: "accuracy-80",
    name: "Sharpshooter",
    description: "Achieved 80%+ overall accuracy",
    icon: "🎯",
    category: "accuracy",
    check: (ctx) => ctx.totalQuestions >= 10 && (ctx.totalCorrect / ctx.totalQuestions) >= 0.8,
  },
  {
    id: "accuracy-90",
    name: "Laser Focus",
    description: "Achieved 90%+ overall accuracy",
    icon: "🔬",
    category: "accuracy",
    check: (ctx) => ctx.totalQuestions >= 20 && (ctx.totalCorrect / ctx.totalQuestions) >= 0.9,
  },
  {
    id: "perfect-set",
    name: "Flawless",
    description: "Scored 100% on a practice set (5+ questions)",
    icon: "✨",
    category: "practice",
    check: (ctx) => ctx.perfectSets >= 1,
  },
];

function countMasteryStates(topicKeys: string[]): { mastered: number; started: number } {
  let mastered = 0;
  let started = 0;
  for (const key of topicKeys) {
    const snap = loadTopicMasterySnapshot(key);
    if (!snap?.nodes) continue;
    const nodeStates = Object.values(snap.nodes);
    if (nodeStates.length > 0) started++;
    const hasMastered = nodeStates.some(
      (n) => (n as { state: TopicHubNodeMasteryState }).state === "mastered"
    );
    if (hasMastered) mastered++;
  }
  return { mastered, started };
}

export function buildBadgeContext(): BadgeContext {
  const insights = loadInsights();
  const attempts = insights.attempts || [];
  const totalQuestions = attempts.length;
  const totalCorrect = attempts.filter((a) => a.correct).length;

  const { mastered, started } = countMasteryStates(ALL_TOPIC_KEYS);

  let streak = 0;
  try {
    const raw = localStorage.getItem("lazytopper.progress.snapshot.v1:" + (localStorage.getItem("lazytopper.progress.active_uid.v1") || "anonymous"));
    if (raw) {
      const parsed = JSON.parse(raw);
      streak = Number(parsed?.streak) || 0;
    }
  } catch {
    streak = 0;
  }

  const uniqueDays = new Set<string>();
  for (const a of attempts) {
    const d = new Date(a.timestamp);
    uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  let perfectSets = 0;
  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const key = a.topicKey || "unknown";
    const e = byTopic.get(key) || { correct: 0, total: 0 };
    e.total++;
    if (a.correct) e.correct++;
    byTopic.set(key, e);
  }
  for (const [, v] of byTopic) {
    if (v.total >= 5 && v.correct === v.total) {
      perfectSets++;
    }
  }

  return {
    streak,
    totalQuestions,
    totalCorrect,
    topicsMastered: mastered,
    topicsStarted: started,
    totalTopics: ALL_TOPIC_KEYS.length,
    perfectSets,
    daysActive: uniqueDays.size,
  };
}

export function evaluateBadges(ctx: BadgeContext, existingBadges: EarnedBadge[]): EarnedBadge[] {
  const earned = [...existingBadges];
  const existingIds = new Set(earned.map((b) => b.id));
  const now = new Date().toISOString();
  for (const def of BADGE_DEFINITIONS) {
    if (existingIds.has(def.id)) continue;
    if (def.check(ctx)) {
      earned.push({ id: def.id, earnedAt: now });
    }
  }
  return earned;
}

export function buildJourneyMilestones(ctx: BadgeContext): JourneyMilestone[] {
  const milestones: JourneyMilestone[] = [];

  const insights = loadInsights();
  const attempts = insights.attempts || [];
  const sortedAttempts = [...attempts].sort((a, b) => a.timestamp - b.timestamp);

  function dateOfNthAttempt(n: number): string {
    if (sortedAttempts.length >= n) {
      return new Date(sortedAttempts[n - 1].timestamp).toLocaleDateString();
    }
    return "";
  }

  if (ctx.totalQuestions >= 1) {
    milestones.push({
      id: "first-question",
      label: "Solved your first question",
      date: dateOfNthAttempt(1),
      icon: "🎯",
    });
  }
  if (ctx.topicsStarted >= 1) {
    const firstTopicDate = sortedAttempts.length > 0
      ? new Date(sortedAttempts[0].timestamp).toLocaleDateString()
      : "";
    milestones.push({
      id: "first-topic",
      label: "Started your first topic",
      date: firstTopicDate,
      icon: "📖",
    });
  }
  if (ctx.streak >= 3) {
    milestones.push({
      id: "streak-3",
      label: "Hit a 3-day streak",
      date: "",
      icon: "⚡",
    });
  }
  if (ctx.totalQuestions >= 50) {
    milestones.push({
      id: "50-questions",
      label: "Crossed 50 questions",
      date: dateOfNthAttempt(50),
      icon: "🏏",
    });
  }
  if (ctx.topicsMastered >= 1) {
    milestones.push({
      id: "first-mastery",
      label: "Mastered your first topic",
      date: "",
      icon: "👑",
    });
  }
  if (ctx.streak >= 7) {
    milestones.push({
      id: "streak-7",
      label: "Full week streak achieved",
      date: "",
      icon: "🗓️",
    });
  }
  if (ctx.totalQuestions >= 100) {
    milestones.push({
      id: "100-questions",
      label: "Century of questions solved",
      date: dateOfNthAttempt(100),
      icon: "💯",
    });
  }
  if (ctx.topicsMastered >= 5) {
    milestones.push({
      id: "5-topics",
      label: "Mastered 5 topics",
      date: "",
      icon: "⭐",
    });
  }
  return milestones;
}

export async function syncBadgesToCloud(uid: string): Promise<EarnedBadge[]> {
  const ctx = buildBadgeContext();
  const progress = await loadLearnerProgress(uid);
  const existing = (progress?.badges as EarnedBadge[] | undefined) || [];
  const updated = evaluateBadges(ctx, existing);
  if (updated.length !== existing.length) {
    await saveLearnerProgress(uid, { badges: updated });
  }
  return updated;
}
