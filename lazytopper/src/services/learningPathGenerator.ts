import { getWeakAreas, type WeakArea } from "./weakAreaAggregator";
import { getDueReviews } from "./spacedRepetitionEngine";
import { getActiveProgressUser } from "./studentProgressStore";
import { callMentor } from "../ai/aiClient";

export interface LearningPathDay {
  day: number;
  date: string;
  topics: LearningPathTopic[];
  reviewTopics: string[];
  estimatedMinutes: number;
  isMilestone: boolean;
}

export interface LearningPathTopic {
  topicKey: string;
  topicName: string;
  subject: "Maths" | "Science";
  targetQuestions: number;
  difficulty: "Easy" | "Medium" | "Hard";
  focusConcepts: string[];
}

export interface LearningPath {
  id: string;
  createdAt: string;
  updatedAt: string;
  totalDays: number;
  daysCompleted: number;
  days: LearningPathDay[];
  weakAreasAtStart: number;
  status: "active" | "completed" | "paused";
}

const STORAGE_KEY = "lazytopper.learningPath.v1";

function getUserScopedKey(): string {
  const uid = getActiveProgressUser() || "anonymous";
  return `lazytopper.user.${uid}.learningPath.v1`;
}
const PREREQUISITE_ORDER: Record<string, string[]> = {
  "quadratic-equations": ["polynomials"],
  "arithmetic-progression": ["real-numbers"],
  triangles: ["coordinate-geometry"],
  "areas-related-to-circles": ["circles"],
  "surface-areas-and-volumes": ["areas-related-to-circles"],
  trigonometry: ["triangles"],
  statistics: ["probability"],
  "acids-bases-salts": ["chemical-reactions-equations"],
  "carbon-and-its-compounds": ["acids-bases-salts"],
  "heredity-and-evolution": ["how-do-organisms-reproduce"],
  "our-environment": ["life-processes"],
};

function addDaysToDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sortByPrerequisites(areas: WeakArea[]): WeakArea[] {
  const result: WeakArea[] = [];
  const remaining = [...areas];
  const added = new Set<string>();

  const addWithDeps = (area: WeakArea) => {
    if (added.has(area.topicKey)) return;
    const deps = PREREQUISITE_ORDER[area.topicKey] || [];
    for (const dep of deps) {
      const depArea = remaining.find((a) => a.topicKey === dep);
      if (depArea && !added.has(dep)) addWithDeps(depArea);
    }
    added.add(area.topicKey);
    result.push(area);
  };

  for (const area of remaining) addWithDeps(area);
  return result;
}

export function generateLearningPath(options?: {
  daysAvailable?: number;
  minutesPerDay?: number;
  subject?: "Maths" | "Science";
}): LearningPath {
  const totalDays = options?.daysAvailable ?? 14;
  const minutesPerDay = options?.minutesPerDay ?? 60;
  const { weakAreas } = getWeakAreas({ subject: options?.subject, limit: 20 });

  const sortedAreas = sortByPrerequisites(weakAreas);
  const dueReviews = getDueReviews({ subject: options?.subject, limit: 10 });
  const reviewTopicKeys = [...new Set(dueReviews.map((r) => r.topicKey))];

  const days: LearningPathDay[] = [];
  const topicsPerDay = Math.max(1, Math.ceil(sortedAreas.length / totalDays));
  const now = new Date();

  for (let d = 0; d < totalDays; d++) {
    const startIdx = d * topicsPerDay;
    const dayTopics = sortedAreas.slice(startIdx, startIdx + topicsPerDay);
    const isMilestone = d === Math.floor(totalDays / 2) - 1 || d === totalDays - 1;

    const topics: LearningPathTopic[] = dayTopics.map((area) => {
      let difficulty: "Easy" | "Medium" | "Hard" = "Easy";
      if (area.masteryPercent >= 30) difficulty = "Medium";
      if (area.masteryPercent >= 60) difficulty = "Hard";

      return {
        topicKey: area.topicKey,
        topicName: area.topicName,
        subject: area.subject,
        targetQuestions: Math.max(5, Math.min(15, Math.round(minutesPerDay / (dayTopics.length * 4)))),
        difficulty,
        focusConcepts: area.weakConcepts.slice(0, 3),
      };
    });

    const dayReviewTopics = d % 3 === 2 ? reviewTopicKeys.slice(0, 2) : [];

    days.push({
      day: d + 1,
      date: addDaysToDate(now, d),
      topics,
      reviewTopics: dayReviewTopics,
      estimatedMinutes: topics.length > 0 ? minutesPerDay : 30,
      isMilestone,
    });
  }

  const path: LearningPath = {
    id: `lp-${Date.now().toString(36)}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    totalDays,
    daysCompleted: 0,
    days,
    weakAreasAtStart: weakAreas.length,
    status: "active",
  };

  saveLearningPath(path);
  return path;
}

export function loadLearningPath(): LearningPath | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getUserScopedKey();
    const raw = window.localStorage.getItem(key) || window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LearningPath;
  } catch {
    return null;
  }
}

export function saveLearningPath(path: LearningPath): void {
  if (typeof window === "undefined") return;
  try {
    const key = getUserScopedKey();
    path.updatedAt = new Date().toISOString();
    window.localStorage.setItem(key, JSON.stringify(path));
  } catch {}
}

export async function generateAILearningPath(options?: {
  daysAvailable?: number;
  minutesPerDay?: number;
  subject?: "Maths" | "Science";
}): Promise<LearningPath> {
  const totalDays = options?.daysAvailable ?? 14;
  const minutesPerDay = options?.minutesPerDay ?? 60;
  const { weakAreas } = getWeakAreas({ subject: options?.subject, limit: 15 });

  if (weakAreas.length === 0) {
    return generateLearningPath(options);
  }

  const weakSummary = weakAreas
    .map((w) => `${w.topicName} (${w.subject}, mastery ${w.masteryPercent}%, accuracy ${w.accuracy}%, concepts: ${w.weakConcepts.join(", ") || "general"})`)
    .join("\n");

  try {
    const response = await callMentor("plan", {
      subject: options?.subject || "Maths",
      extraNotes: [
        `Create a ${totalDays}-day study plan for CBSE Class 10 board exam preparation.`,
        `Student has ${minutesPerDay} minutes per day available.`,
        `Weak areas identified:\n${weakSummary}`,
        `Requirements:`,
        `- Order topics by prerequisites (foundational first)`,
        `- Start each topic with Easy difficulty, progress to Hard`,
        `- Include review days every 3-4 days`,
        `- Mark day ${Math.floor(totalDays / 2)} and day ${totalDays} as milestones`,
        `- For each day provide: topic names, difficulty level (Easy/Medium/Hard), number of questions (5-15), key concepts to focus on`,
        `Respond with a structured day-by-day plan.`,
      ].join("\n"),
      daysLeft: totalDays,
      hoursPerDayTotal: minutesPerDay / 60,
    });

    const aiText = response?.data?.text || "";

    const localPath = generateLearningPath(options);

    if (aiText.length > 50) {
      localPath.id = `ai-lp-${Date.now().toString(36)}`;

      const dayMentions = aiText.match(/day\s*(\d+)/gi) || [];
      for (const mention of dayMentions) {
        const dayNum = parseInt(mention.replace(/day\s*/i, ""), 10);
        if (dayNum > 0 && dayNum <= localPath.days.length) {
          const dayObj = localPath.days[dayNum - 1];
          if (aiText.toLowerCase().includes("review") && dayNum % 3 === 0) {
            dayObj.reviewTopics = weakAreas.slice(0, 3).map((w) => w.topicKey);
          }
        }
      }
    }

    saveLearningPath(localPath);
    return localPath;
  } catch (err) {
    console.warn("AI learning path generation failed, falling back to local:", err);
    return generateLearningPath(options);
  }
}

export function markDayCompleted(dayIndex: number): LearningPath | null {
  const path = loadLearningPath();
  if (!path) return null;
  if (dayIndex >= 0 && dayIndex < path.days.length) {
    path.daysCompleted = Math.max(path.daysCompleted, dayIndex + 1);
    if (path.daysCompleted >= path.totalDays) path.status = "completed";
    saveLearningPath(path);
  }
  return path;
}
