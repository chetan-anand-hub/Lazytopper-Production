import { doc, getDoc, setDoc } from "firebase/firestore";
import { getWeakAreas, type WeakArea } from "./weakAreaAggregator";
import { getDueReviews } from "./spacedRepetitionEngine";
import { getActiveProgressUser } from "./studentProgressStore";
import { callMentor } from "../ai/aiClient";
import { firestoreDb } from "./firebaseClient";

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

export async function loadLearningPathWithSync(): Promise<LearningPath | null> {
  const local = loadLearningPath();
  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    try {
      const snap = await getDoc(doc(firestoreDb, "learningPaths", uid));
      if (snap.exists()) {
        const remote = snap.data() as LearningPath;
        if (!local || remote.updatedAt > local.updatedAt) {
          saveLocalLearningPath(remote);
          return remote;
        }
      }
    } catch {}
  }
  return local;
}

function saveLocalLearningPath(path: LearningPath): void {
  if (typeof window === "undefined") return;
  try {
    const key = getUserScopedKey();
    window.localStorage.setItem(key, JSON.stringify(path));
  } catch {}
}

export function saveLearningPath(path: LearningPath): void {
  path.updatedAt = new Date().toISOString();
  saveLocalLearningPath(path);

  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    void setDoc(doc(firestoreDb, "learningPaths", uid), { ...path }, { merge: true }).catch(() => {});
  }
}

function parseAIDayPlan(
  aiText: string,
  weakAreas: WeakArea[],
  totalDays: number,
  minutesPerDay: number
): LearningPathDay[] | null {
  const weakByName = new Map<string, WeakArea>();
  const weakByKey = new Map<string, WeakArea>();
  for (const w of weakAreas) {
    weakByName.set(w.topicName.toLowerCase(), w);
    weakByKey.set(w.topicKey.toLowerCase(), w);
  }

  function findWeakArea(text: string): WeakArea | undefined {
    const lower = text.toLowerCase();
    for (const [name, area] of weakByName) {
      if (lower.includes(name)) return area;
    }
    for (const [key, area] of weakByKey) {
      if (lower.includes(key.replace(/-/g, " "))) return area;
    }
    return undefined;
  }

  const dayBlocks = aiText.split(/(?:^|\n)(?:\*{0,2})?[Dd]ay\s*(\d+)/gm);
  if (dayBlocks.length < 3) return null;

  const days: LearningPathDay[] = [];
  const now = new Date();

  for (let i = 1; i < dayBlocks.length; i += 2) {
    const dayNum = parseInt(dayBlocks[i], 10);
    const content = dayBlocks[i + 1] || "";
    if (dayNum < 1 || dayNum > totalDays || !content) continue;

    const topics: LearningPathTopic[] = [];
    const lines = content.split("\n").filter((l) => l.trim());
    const reviewTopics: string[] = [];
    let isReviewDay = false;

    for (const line of lines) {
      if (/review/i.test(line)) {
        isReviewDay = true;
        const area = findWeakArea(line);
        if (area) reviewTopics.push(area.topicKey);
        continue;
      }

      const area = findWeakArea(line);
      if (!area) continue;

      let difficulty: "Easy" | "Medium" | "Hard" = "Easy";
      if (/hard/i.test(line)) difficulty = "Hard";
      else if (/medium/i.test(line)) difficulty = "Medium";

      const qMatch = line.match(/(\d+)\s*(?:questions?|q(?:s|uestions?)?)/i);
      const targetQuestions = qMatch ? Math.min(15, Math.max(5, parseInt(qMatch[1], 10))) : 10;

      const conceptsMatch = line.match(/(?:focus|concepts?|key):\s*(.+)/i);
      const focusConcepts = conceptsMatch
        ? conceptsMatch[1].split(/[,;]/).map((c) => c.trim()).filter(Boolean).slice(0, 3)
        : area.weakConcepts.slice(0, 3);

      topics.push({
        topicKey: area.topicKey,
        topicName: area.topicName,
        subject: area.subject,
        targetQuestions,
        difficulty,
        focusConcepts,
      });
    }

    if (topics.length === 0 && !isReviewDay) continue;

    const isMilestone = dayNum === Math.floor(totalDays / 2) || dayNum === totalDays;

    days.push({
      day: dayNum,
      date: addDaysToDate(now, dayNum - 1),
      topics,
      reviewTopics,
      estimatedMinutes: topics.length > 0 ? minutesPerDay : 30,
      isMilestone,
    });
  }

  return days.length >= Math.min(3, totalDays) ? days : null;
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
        `- Start each topic with Easy difficulty, progress to Hard over multiple sessions`,
        `- Include review days every 3-4 days`,
        `- Mark day ${Math.floor(totalDays / 2)} and day ${totalDays} as milestones`,
        `Format each day as:`,
        `Day N:`,
        `- TopicName: difficulty (Easy/Medium/Hard), X questions, focus: concept1, concept2`,
        `- Review: PreviousTopicName`,
      ].join("\n"),
      daysLeft: totalDays,
      hoursPerDayTotal: minutesPerDay / 60,
    });

    const aiText = response?.data?.text || "";

    if (aiText.length > 50) {
      const parsedDays = parseAIDayPlan(aiText, weakAreas, totalDays, minutesPerDay);

      if (parsedDays && parsedDays.length > 0) {
        const path: LearningPath = {
          id: `ai-lp-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalDays: parsedDays.length,
          daysCompleted: 0,
          days: parsedDays,
          weakAreasAtStart: weakAreas.length,
          status: "active",
        };
        saveLearningPath(path);
        return path;
      }
    }

    return generateLearningPath(options);
  } catch (err) {
    console.warn("AI learning path generation failed, falling back to local:", err);
    return generateLearningPath(options);
  }
}

export function checkAndAdaptPath(): LearningPath | null {
  const path = loadLearningPath();
  if (!path || path.status !== "active") return null;

  const lastUpdate = new Date(path.updatedAt).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - lastUpdate < weekMs) return path;

  const { weakAreas } = getWeakAreas({ limit: 15 });
  const currentWeakKeys = new Set(weakAreas.map((w) => w.topicKey));

  let adapted = false;
  for (let d = path.daysCompleted; d < path.days.length; d++) {
    const day = path.days[d];
    for (let t = 0; t < day.topics.length; t++) {
      const topic = day.topics[t];
      const weakArea = weakAreas.find((w) => w.topicKey === topic.topicKey);
      if (weakArea) {
        const newDiff: "Easy" | "Medium" | "Hard" =
          weakArea.masteryPercent < 20 ? "Easy" :
          weakArea.masteryPercent < 50 ? "Medium" : "Hard";
        if (newDiff !== topic.difficulty) {
          day.topics[t] = { ...topic, difficulty: newDiff };
          adapted = true;
        }
      } else if (!currentWeakKeys.has(topic.topicKey)) {
        day.topics[t] = { ...topic, targetQuestions: Math.max(3, topic.targetQuestions - 3) };
        adapted = true;
      }
    }
  }

  if (adapted) {
    saveLearningPath(path);
  }
  return path;
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
