import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  buildProgressScopeKey,
  getActiveProgressUser,
  saveLearnerProgressSegment,
} from "./studentProgressStore";
import { firestoreDb } from "./firebaseClient";

export type SRStage = "new" | "learning" | "review" | "mastered";

export interface SRConceptCard {
  conceptKey: string;
  topicKey: string;
  subject: "Maths" | "Science";
  stage: SRStage;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string;
  consecutiveCorrect: number;
}

export interface SRSchedule {
  version: 1;
  cards: Record<string, SRConceptCard>;
  updatedAt: string;
}

const STORAGE_KEY = "lazytopper.spacedRepetition.v1";
const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStorageKey(): string {
  return buildProgressScopeKey("practiceInsights", getActiveProgressUser()) + ":sr";
}

export function loadSRSchedule(): SRSchedule {
  if (typeof window === "undefined") return { version: 1, cards: {}, updatedAt: nowIso() };
  try {
    const key = getStorageKey();
    const raw = window.localStorage.getItem(key) || window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, cards: {}, updatedAt: nowIso() };
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1 && parsed?.cards) return parsed as SRSchedule;
  } catch {}
  return { version: 1, cards: {}, updatedAt: nowIso() };
}

export function saveSRSchedule(schedule: SRSchedule): void {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey();
    schedule.updatedAt = nowIso();
    window.localStorage.setItem(key, JSON.stringify(schedule));

    const uid = getActiveProgressUser();
    if (uid) {
      void saveLearnerProgressSegment(uid, "recentActivity", [
        { kind: "sr_update", at: nowIso() },
      ]);
      if (firestoreDb && uid !== "anonymous") {
        void setDoc(doc(firestoreDb, "srSchedules", uid), { ...schedule }, { merge: true }).catch(() => {});
      }
    }
  } catch {}
}

export async function loadSRScheduleWithSync(): Promise<SRSchedule> {
  const local = loadSRSchedule();
  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    try {
      const snap = await getDoc(doc(firestoreDb, "srSchedules", uid));
      if (snap.exists()) {
        const remote = snap.data() as SRSchedule;
        if (remote?.version === 1 && remote?.cards && remote.updatedAt > local.updatedAt) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(getStorageKey(), JSON.stringify(remote));
          }
          return remote;
        }
      }
    } catch {}
  }
  return local;
}

function computeCardKey(topicKey: string, conceptKey: string): string {
  return `${topicKey}::${conceptKey}`;
}

function deriveStage(interval: number, consecutiveCorrect: number): SRStage {
  if (consecutiveCorrect === 0) return "new";
  if (interval <= 1) return "learning";
  if (interval >= 30 && consecutiveCorrect >= 5) return "mastered";
  return "review";
}

export function addConceptToSR(
  topicKey: string,
  conceptKey: string,
  subject: "Maths" | "Science"
): SRSchedule {
  const schedule = loadSRSchedule();
  const key = computeCardKey(topicKey, conceptKey);
  if (schedule.cards[key]) return schedule;

  schedule.cards[key] = {
    conceptKey,
    topicKey,
    subject,
    stage: "new",
    easeFactor: INITIAL_EASE,
    interval: 0,
    repetitions: 0,
    nextReviewDate: todayIso(),
    lastReviewDate: "",
    consecutiveCorrect: 0,
  };
  saveSRSchedule(schedule);
  return schedule;
}

export function reviewConcept(
  topicKey: string,
  conceptKey: string,
  quality: number
): SRSchedule {
  const schedule = loadSRSchedule();
  const key = computeCardKey(topicKey, conceptKey);
  const card = schedule.cards[key];
  if (!card) return schedule;

  const q = Math.max(0, Math.min(5, quality));
  const today = todayIso();

  if (q < 3) {
    card.repetitions = 0;
    card.interval = 1;
    card.consecutiveCorrect = 0;
  } else {
    card.consecutiveCorrect++;
    if (card.repetitions === 0) {
      card.interval = 1;
    } else if (card.repetitions === 1) {
      card.interval = 6;
    } else {
      card.interval = Math.round(card.interval * card.easeFactor);
    }
    card.repetitions++;
  }

  card.easeFactor = Math.max(
    MIN_EASE,
    card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );
  card.lastReviewDate = today;
  card.nextReviewDate = addDays(today, card.interval);
  card.stage = deriveStage(card.interval, card.consecutiveCorrect);

  saveSRSchedule(schedule);
  return schedule;
}

export function getDueReviews(options?: { subject?: "Maths" | "Science"; limit?: number }): SRConceptCard[] {
  const schedule = loadSRSchedule();
  const today = todayIso();

  const due = Object.values(schedule.cards).filter((card) => {
    if (card.stage === "mastered") return false;
    if (options?.subject && card.subject !== options.subject) return false;
    return card.nextReviewDate <= today;
  });

  due.sort((a, b) => {
    if (a.stage === "new" && b.stage !== "new") return -1;
    if (b.stage === "new" && a.stage !== "new") return 1;
    return a.nextReviewDate.localeCompare(b.nextReviewDate);
  });

  return due.slice(0, options?.limit ?? 20);
}

export function getSRStats(): {
  total: number;
  newCount: number;
  learning: number;
  review: number;
  mastered: number;
  dueToday: number;
} {
  const schedule = loadSRSchedule();
  const today = todayIso();
  const cards = Object.values(schedule.cards);

  let newCount = 0;
  let learning = 0;
  let review = 0;
  let mastered = 0;
  let dueToday = 0;

  for (const card of cards) {
    switch (card.stage) {
      case "new": newCount++; break;
      case "learning": learning++; break;
      case "review": review++; break;
      case "mastered": mastered++; break;
    }
    if (card.nextReviewDate <= today && card.stage !== "mastered") dueToday++;
  }

  return { total: cards.length, newCount, learning, review, mastered, dueToday };
}

export function addWrongAnswerToSR(
  topicKey: string,
  conceptKey: string,
  subject: "Maths" | "Science"
): void {
  const schedule = loadSRSchedule();
  const key = computeCardKey(topicKey, conceptKey);
  if (!schedule.cards[key]) {
    addConceptToSR(topicKey, conceptKey, subject);
  }
  reviewConcept(topicKey, conceptKey, 1);
}
