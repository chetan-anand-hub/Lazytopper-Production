import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import type { UserChapterStats } from "../engine/smartLearningTypes";
import type { PracticeAttempt } from "./practiceInsights";
import type { TopicHubMasterySnapshot } from "./topicHubMastery";

type ProgressScope = "smartLearning" | "practiceInsights" | "topicHubMastery";

// Canonical product-level segment names used by acceptance and analytics layers.
export const PROGRESS_SEGMENT_ALIASES = {
  topic_mastery: "topicMasteryByTopic",
  attempt_stats: "attempts",
  accuracy: "statsByChapter",
  streak: "streak",
  recent_activity: "recentActivity",
} as const;

const ACTIVE_UID_KEY = "lazytopper.progress.active_uid.v1";
const SNAPSHOT_KEY_PREFIX = "lazytopper.progress.snapshot.v1";
const SCOPE_KEY_PREFIX = "lazytopper.progress.scope.v1";

type LearnerRecentActivity = {
  kind: string;
  topicKey?: string;
  at: string;
};

export interface LearnerProgressSnapshot {
  uid: string;
  statsByChapter?: Record<string, UserChapterStats>;
  attempts?: PracticeAttempt[];
  topicMasteryByTopic?: Record<string, TopicHubMasterySnapshot>;
  streak?: number;
  recentActivity?: LearnerRecentActivity[];
  updatedAt?: string;
}

function snapshotKey(uid: string): string {
  return `${SNAPSHOT_KEY_PREFIX}:${uid}`;
}

function normalizeTopicStorageKey(topicKey: string): string {
  const cleaned = String(topicKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "topic";
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures
  }
}

function sanitizeSnapshot(uid: string, input: unknown): LearnerProgressSnapshot | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const rec = input as Record<string, unknown>;
  const topicMasteryByTopic =
    rec.topicMasteryByTopic && typeof rec.topicMasteryByTopic === "object" && !Array.isArray(rec.topicMasteryByTopic)
      ? (rec.topicMasteryByTopic as Record<string, TopicHubMasterySnapshot>)
      : undefined;
  const statsByChapter =
    rec.statsByChapter && typeof rec.statsByChapter === "object" && !Array.isArray(rec.statsByChapter)
      ? (rec.statsByChapter as Record<string, UserChapterStats>)
      : undefined;
  const attempts = Array.isArray(rec.attempts) ? (rec.attempts as PracticeAttempt[]) : undefined;
  const recentActivity = Array.isArray(rec.recentActivity)
    ? (rec.recentActivity as LearnerRecentActivity[])
    : undefined;
  const streak = Number(rec.streak);
  return {
    uid,
    statsByChapter,
    attempts,
    topicMasteryByTopic,
    streak: Number.isFinite(streak) ? streak : undefined,
    recentActivity,
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : undefined,
  };
}

function mergeSnapshots(
  uid: string,
  base: LearnerProgressSnapshot | null,
  patch: Partial<LearnerProgressSnapshot>
): LearnerProgressSnapshot {
  const prev = base || { uid };
  return {
    uid,
    statsByChapter: patch.statsByChapter ?? prev.statsByChapter,
    attempts: patch.attempts ?? prev.attempts,
    topicMasteryByTopic: patch.topicMasteryByTopic
      ? {
          ...(prev.topicMasteryByTopic || {}),
          ...patch.topicMasteryByTopic,
        }
      : prev.topicMasteryByTopic,
    streak: patch.streak ?? prev.streak,
    recentActivity: patch.recentActivity ?? prev.recentActivity,
    updatedAt: new Date().toISOString(),
  };
}

export function setActiveProgressUser(uid: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (!uid) {
      window.localStorage.removeItem(ACTIVE_UID_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_UID_KEY, String(uid));
  } catch {
    // ignore failures
  }
}

export function getActiveProgressUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const uid = window.localStorage.getItem(ACTIVE_UID_KEY);
    return uid && uid.trim() ? uid : null;
  } catch {
    return null;
  }
}

export function buildProgressScopeKey(
  scope: ProgressScope,
  uid?: string | null,
  topicKey?: string
): string {
  const resolvedUid = String(uid || getActiveProgressUser() || "anonymous");
  if (scope === "topicHubMastery") {
    return `${SCOPE_KEY_PREFIX}:${scope}:${resolvedUid}:${normalizeTopicStorageKey(String(topicKey || ""))}`;
  }
  return `${SCOPE_KEY_PREFIX}:${scope}:${resolvedUid}`;
}

export async function loadLearnerProgress(uid: string): Promise<LearnerProgressSnapshot | null> {
  const local = sanitizeSnapshot(uid, readJson(snapshotKey(uid)));
  if (!firestoreDb) return local;

  try {
    const snap = await getDoc(doc(firestoreDb, "learnerProgress", uid));
    if (!snap.exists()) return local;
    const remote = sanitizeSnapshot(uid, snap.data());
    if (!remote) return local;
    const merged = mergeSnapshots(uid, local, remote);
    writeJson(snapshotKey(uid), merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveLearnerProgress(
  uid: string,
  patch: Partial<LearnerProgressSnapshot>
): Promise<void> {
  const local = sanitizeSnapshot(uid, readJson(snapshotKey(uid)));
  const merged = mergeSnapshots(uid, local, patch);
  writeJson(snapshotKey(uid), merged);

  if (!firestoreDb) return;
  try {
    await setDoc(
      doc(firestoreDb, "learnerProgress", uid),
      {
        ...patch,
        updatedAt: merged.updatedAt,
      },
      { merge: true }
    );
  } catch {
    // local fallback remains source until cloud write succeeds.
  }
}

export async function saveLearnerProgressSegment(
  uid: string,
  segment: "statsByChapter" | "attempts" | "topicMasteryByTopic" | "streak" | "recentActivity",
  value: unknown
): Promise<void> {
  const patch: Partial<LearnerProgressSnapshot> = {};
  if (segment === "statsByChapter") patch.statsByChapter = value as Record<string, UserChapterStats>;
  if (segment === "attempts") patch.attempts = value as PracticeAttempt[];
  if (segment === "topicMasteryByTopic") {
    patch.topicMasteryByTopic = value as Record<string, TopicHubMasterySnapshot>;
  }
  if (segment === "streak") patch.streak = Number(value);
  if (segment === "recentActivity") patch.recentActivity = value as LearnerRecentActivity[];
  await saveLearnerProgress(uid, patch);
}

export async function hydrateLocalProgressFromCloud(uid: string): Promise<void> {
  const snapshot = await loadLearnerProgress(uid);
  if (!snapshot) return;

  if (snapshot.statsByChapter) {
    writeJson(buildProgressScopeKey("smartLearning", uid), snapshot.statsByChapter);
  }

  if (snapshot.attempts) {
    writeJson(buildProgressScopeKey("practiceInsights", uid), {
      attempts: snapshot.attempts,
    });
  }

  if (snapshot.topicMasteryByTopic && typeof snapshot.topicMasteryByTopic === "object") {
    Object.entries(snapshot.topicMasteryByTopic).forEach(([topicKey, mastery]) => {
      writeJson(buildProgressScopeKey("topicHubMastery", uid, topicKey), mastery);
    });
  }
}

export async function ensureLearnerProgressBaseline(uid: string): Promise<void> {
  const safeUid = String(uid || "").trim();
  if (!safeUid || !firestoreDb) return;
  try {
    await setDoc(
      doc(firestoreDb, "learnerProgress", safeUid),
      {
        uid: safeUid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // noop: local cache remains fallback
  }
}
