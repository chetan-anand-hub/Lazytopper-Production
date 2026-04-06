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
  stability: number;
  difficulty: number;
  retrievability: number;
  nextReviewDate: string;
  lastReviewDate: string;
  consecutiveCorrect: number;
  /** @deprecated SM-2 legacy — kept for migration only */
  easeFactor?: number;
  /** @deprecated SM-2 legacy — kept for migration only */
  interval?: number;
  /** @deprecated SM-2 legacy — kept for migration only */
  repetitions?: number;
}

export interface SRSchedule {
  version: 2;
  cards: Record<string, SRConceptCard>;
  updatedAt: string;
}

const DESIRED_RETENTION = 0.9;
const MASTERY_DEMOTION_THRESHOLD = 0.5;
const MASTERY_STABILITY_THRESHOLD = 30;

const FSRS_W = [
  0.4072, 1.1829, 3.1262, 15.4722,
  7.2102, 0.5316, 1.0651, 0.0589,
  1.5747, 0.1070, 1.0013, 1.9279,
  0.1100, 0.2904, 2.2698, 0.2315,
  2.9898, 0.5163, 0.6136,
];

function nowIso(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(dateA: string, dateB: string): number {
  if (!dateA || !dateB) return 0;
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getStorageKey(): string {
  return buildProgressScopeKey("practiceInsights", getActiveProgressUser()) + ":sr";
}

const LEGACY_STORAGE_KEY = "lazytopper.spacedRepetition.v1";

const FSRS_DECAY = -0.5;
const FSRS_FACTOR = 19 / 81;

function computeRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + FSRS_FACTOR * elapsedDays / stability, FSRS_DECAY);
}

function computeNextInterval(stability: number): number {
  if (stability <= 0) return 1;
  const interval = (stability / FSRS_FACTOR) * (Math.pow(DESIRED_RETENTION, 1 / FSRS_DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

function initStability(rating: number): number {
  const idx = Math.max(0, Math.min(3, rating - 1));
  return Math.max(0.1, FSRS_W[idx]);
}

function initDifficulty(rating: number): number {
  const d = FSRS_W[4] - Math.exp(FSRS_W[5] * (rating - 1)) + 1;
  return Math.max(1, Math.min(10, d));
}

function updateDifficulty(prevD: number, rating: number): number {
  const deltaDelta = -FSRS_W[6] * (rating - 3);
  const newD = prevD + deltaDelta;
  const meanRevert = FSRS_W[7] * (initDifficulty(4) - newD) + newD;
  return Math.max(1, Math.min(10, meanRevert));
}

function updateStabilityOnSuccess(prevS: number, d: number, r: number, rating: number): number {
  const ratingBonus = rating === 4
    ? Math.exp(FSRS_W[15]) * (11 - d) * Math.pow(prevS, -FSRS_W[16]) * (Math.exp((1 - r) * FSRS_W[17]) - 1)
    : 0;
  const sinr = Math.exp(FSRS_W[8]) *
    (11 - d) *
    Math.pow(prevS, -FSRS_W[9]) *
    (Math.exp((1 - r) * FSRS_W[10]) - 1);
  const newS = prevS * (1 + sinr + ratingBonus);
  return Math.max(0.1, newS);
}

function updateStabilityOnFail(prevS: number, d: number, r: number): number {
  const newS = FSRS_W[11] *
    Math.pow(d, -FSRS_W[12]) *
    (Math.pow(prevS + 1, FSRS_W[13]) - 1) *
    Math.exp((1 - r) * FSRS_W[14]);
  return Math.max(0.1, Math.min(newS, prevS));
}

function ratingFromQuality(quality: number): number {
  if (quality <= 1) return 1;
  if (quality <= 2) return 2;
  if (quality <= 3) return 3;
  return 4;
}

function migrateSM2Card(card: Record<string, unknown>): SRConceptCard {
  const oldEase = typeof card.easeFactor === "number" ? card.easeFactor : 2.5;
  const oldInterval = typeof card.interval === "number" ? card.interval : 0;
  const oldConsecutive = typeof card.consecutiveCorrect === "number" ? card.consecutiveCorrect : 0;

  let stability: number;
  if (oldInterval <= 0) {
    stability = FSRS_W[0];
  } else if (oldInterval <= 1) {
    stability = FSRS_W[1];
  } else {
    stability = oldInterval * (oldEase / 2.5);
  }
  stability = Math.max(0.1, stability);

  const difficulty = Math.max(1, Math.min(10, 11 - (oldEase / 2.5) * 5));

  const today = todayIso();
  const lastReview = typeof card.lastReviewDate === "string" ? card.lastReviewDate : "";
  const elapsed = lastReview ? daysBetween(lastReview, today) : 0;
  const retrievability = computeRetrievability(stability, elapsed);

  return {
    conceptKey: String(card.conceptKey || ""),
    topicKey: String(card.topicKey || ""),
    subject: (card.subject === "Science" ? "Science" : "Maths") as "Maths" | "Science",
    stage: deriveStageFSRS(stability, retrievability, oldConsecutive),
    stability,
    difficulty,
    retrievability,
    nextReviewDate: typeof card.nextReviewDate === "string" ? card.nextReviewDate : today,
    lastReviewDate: lastReview,
    consecutiveCorrect: oldConsecutive,
  };
}

function deriveStageFSRS(stability: number, retrievability: number, consecutiveCorrect: number): SRStage {
  if (consecutiveCorrect === 0) return "new";
  if (stability >= MASTERY_STABILITY_THRESHOLD && retrievability >= DESIRED_RETENTION) return "mastered";
  if (stability <= 1) return "learning";
  return "review";
}

function migrateScheduleV1toV2(raw: Record<string, unknown>): SRSchedule {
  const oldCards = (raw.cards || {}) as Record<string, Record<string, unknown>>;
  const newCards: Record<string, SRConceptCard> = {};
  for (const [key, oldCard] of Object.entries(oldCards)) {
    newCards[key] = migrateSM2Card(oldCard);
  }
  return { version: 2, cards: newCards, updatedAt: nowIso() };
}

export function loadSRSchedule(): SRSchedule {
  if (typeof window === "undefined") return { version: 2, cards: {}, updatedAt: nowIso() };
  try {
    const key = getStorageKey();
    const raw = window.localStorage.getItem(key) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { version: 2, cards: {}, updatedAt: nowIso() };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.version === 2 && parsed?.cards) return parsed as unknown as SRSchedule;
    if (parsed?.version === 1 && parsed?.cards) {
      const migrated = migrateScheduleV1toV2(parsed);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(migrated));
      }
      return migrated;
    }
  } catch { /* best effort */ }
  return { version: 2, cards: {}, updatedAt: nowIso() };
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
  } catch { /* best effort */ }
}

export async function loadSRScheduleWithSync(): Promise<SRSchedule> {
  const local = loadSRSchedule();
  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    try {
      const snap = await getDoc(doc(firestoreDb, "srSchedules", uid));
      if (snap.exists()) {
        const remote = snap.data() as Record<string, unknown>;
        if (remote?.version === 2 && remote?.cards && (remote.updatedAt as string) > local.updatedAt) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(getStorageKey(), JSON.stringify(remote));
          }
          return remote as unknown as SRSchedule;
        }
        if (remote?.version === 1 && remote?.cards) {
          const migrated = migrateScheduleV1toV2(remote);
          const remoteUpdatedAt = typeof remote.updatedAt === "string" ? remote.updatedAt : "";
          if (remoteUpdatedAt > local.updatedAt || Object.keys(local.cards).length === 0) {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(getStorageKey(), JSON.stringify(migrated));
            }
            void setDoc(doc(firestoreDb, "srSchedules", uid), { ...migrated }, { merge: true }).catch(() => {});
            return migrated;
          }
        }
      }
    } catch { /* best effort */ }
  }
  return local;
}

function computeCardKey(topicKey: string, conceptKey: string): string {
  return `${topicKey}::${conceptKey}`;
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
    stability: FSRS_W[0],
    difficulty: initDifficulty(3),
    retrievability: 1.0,
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
  const rating = ratingFromQuality(q);
  const today = todayIso();

  const elapsed = card.lastReviewDate ? daysBetween(card.lastReviewDate, today) : 0;
  const currentR = computeRetrievability(card.stability, elapsed);

  const isNew = card.consecutiveCorrect === 0 && !card.lastReviewDate;
  const isSuccess = rating >= 3;

  let newStability: number;
  let newDifficulty: number;

  if (isNew) {
    newStability = initStability(rating);
    newDifficulty = initDifficulty(rating);
  } else {
    newDifficulty = updateDifficulty(card.difficulty, rating);
    if (isSuccess) {
      newStability = updateStabilityOnSuccess(card.stability, card.difficulty, currentR, rating);
    } else {
      newStability = updateStabilityOnFail(card.stability, card.difficulty, currentR);
    }
  }

  if (isSuccess) {
    card.consecutiveCorrect++;
  } else {
    card.consecutiveCorrect = 0;
  }

  card.stability = newStability;
  card.difficulty = newDifficulty;
  card.lastReviewDate = today;

  const nextInterval = computeNextInterval(newStability);
  card.nextReviewDate = addDays(today, nextInterval);
  card.retrievability = 1.0;
  card.stage = deriveStageFSRS(newStability, 1.0, card.consecutiveCorrect);

  saveSRSchedule(schedule);
  return schedule;
}

export function getRetrievability(card: SRConceptCard): number {
  if (!card.lastReviewDate) return card.retrievability ?? 1.0;
  const today = todayIso();
  const elapsed = daysBetween(card.lastReviewDate, today);
  return computeRetrievability(card.stability, elapsed);
}

export function getDueReviews(options?: { subject?: "Maths" | "Science"; limit?: number }): SRConceptCard[] {
  const schedule = loadSRSchedule();
  const today = todayIso();

  const due = Object.values(schedule.cards).filter((card) => {
    if (options?.subject && card.subject !== options.subject) return false;
    const r = getRetrievability(card);
    if (card.stage === "mastered" && r >= DESIRED_RETENTION) return false;
    return card.nextReviewDate <= today || r < DESIRED_RETENTION;
  });

  due.sort((a, b) => {
    const rA = getRetrievability(a);
    const rB = getRetrievability(b);
    return rA - rB;
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
  checkMasteryDemotions();
  const schedule = loadSRSchedule();
  const today = todayIso();
  const cards = Object.values(schedule.cards);

  let newCount = 0;
  let learning = 0;
  let review = 0;
  let mastered = 0;
  let dueToday = 0;

  for (const card of cards) {
    const r = getRetrievability(card);
    const liveStage = deriveStageFSRS(card.stability, r, card.consecutiveCorrect);

    switch (liveStage) {
      case "new": newCount++; break;
      case "learning": learning++; break;
      case "review": review++; break;
      case "mastered": mastered++; break;
    }

    if (liveStage !== "mastered" && (card.nextReviewDate <= today || r < DESIRED_RETENTION)) {
      dueToday++;
    }
  }

  return { total: cards.length, newCount, learning, review, mastered, dueToday };
}

export function checkMasteryDemotions(): { conceptKey: string; topicKey: string; subject: "Maths" | "Science"; retrievability: number }[] {
  const schedule = loadSRSchedule();
  const demotions: { conceptKey: string; topicKey: string; subject: "Maths" | "Science"; retrievability: number }[] = [];

  for (const card of Object.values(schedule.cards)) {
    if (card.stage === "mastered") {
      const r = getRetrievability(card);
      if (r < MASTERY_DEMOTION_THRESHOLD) {
        card.stage = "review";
        card.retrievability = r;
        card.nextReviewDate = todayIso();
        demotions.push({
          conceptKey: card.conceptKey,
          topicKey: card.topicKey,
          subject: card.subject,
          retrievability: r,
        });
      }
    }
  }

  if (demotions.length > 0) {
    saveSRSchedule(schedule);
  }

  return demotions;
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

export { DESIRED_RETENTION, MASTERY_DEMOTION_THRESHOLD, MASTERY_STABILITY_THRESHOLD };
