import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getActiveProgressUser } from "./studentProgressStore";
import { firestoreDb } from "./firebaseClient";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";

export interface MockScoreEntry {
  id: string;
  subject: "Maths" | "Science";
  totalMarks: number;
  maxMarks: number;
  percent: number;
  timestamp: number;
  topicBreakdown?: Record<string, { scored: number; maxPossible: number }>;
}

export interface MockScoreHistory {
  entries: MockScoreEntry[];
}

const STORAGE_PREFIX = "lazytopper.user";

function getStorageKey(uid: string | null = getActiveProgressUser()): string {
  return `${STORAGE_PREFIX}.${uid}.mockScoreHistory.v1`;
}

function isMockScoreEntry(v: unknown): v is MockScoreEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.id === "string" && (e.subject === "Maths" || e.subject === "Science") && typeof e.timestamp === "number";
}

/** Drop the cloud-only bookkeeping field so a hydrated entry is shaped exactly as a saved one. */
function asEntry(v: MockScoreEntry & { updatedAt?: unknown }): MockScoreEntry {
  const { updatedAt: _ignored, ...entry } = v;
  return entry;
}

/**
 * ME-ENGINE-1 PR-2 (G11) — bring the student's synced mock history onto this device (sign-in, run
 * with the mistake-log hydration). Mock scores were already WRITTEN to the cloud (the blob and one
 * doc per mock) but never READ back, so a second device showed none. This unions the cloud copies
 * (`mockScoreHistory/{uid}/entries/*` and the older blob's `entries`) with the device copy BY ID —
 * nothing is invented, nothing on the device is lost — and writes the union to the device cache
 * every reader already reads. Never throws. Returns how many entries arrived from the cloud.
 */
export async function hydrateMockScoreHistoryFromCloud(uid: string | null | undefined): Promise<number> {
  if (typeof window === "undefined" || !firestoreDb || !uid || uid === "anonymous") return 0;
  try {
    const [blob, perMock] = await Promise.all([
      getDoc(doc(firestoreDb, "mockScoreHistory", uid)),
      getDocs(collection(firestoreDb, "mockScoreHistory", uid, "entries")),
    ]);
    const cloud: MockScoreEntry[] = [];
    const blobEntries = blob.exists() ? (blob.data() as { entries?: unknown }).entries : undefined;
    if (Array.isArray(blobEntries)) cloud.push(...blobEntries.filter(isMockScoreEntry).map(asEntry));
    for (const d of perMock.docs) {
      const data = d.data();
      if (isMockScoreEntry(data)) cloud.push(asEntry(data));
    }
    const key = getStorageKey(uid);
    let local: MockScoreHistory = { entries: [] };
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) local = JSON.parse(raw);
    } catch {}
    const byId = new Map<string, MockScoreEntry>();
    for (const e of Array.isArray(local.entries) ? local.entries : []) byId.set(e.id, e);
    let added = 0;
    for (const e of cloud) {
      if (byId.has(e.id)) continue;
      byId.set(e.id, e);
      added += 1;
    }
    if (added > 0) {
      const entries = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
      window.localStorage.setItem(key, JSON.stringify({ entries }));
    }
    return added;
  } catch {
    return 0;
  }
}

export function loadMockScoreHistory(): MockScoreHistory {
  if (typeof window === "undefined") return { entries: [] };
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return { entries: [] };
}

function saveMockScoreHistory(history: MockScoreHistory): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(), JSON.stringify(history));

  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    void setDoc(doc(firestoreDb, "mockScoreHistory", uid), { ...history, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }
}

export function saveMockScore(entry: Omit<MockScoreEntry, "id" | "timestamp">): void {
  const history = loadMockScoreHistory();
  const newEntry: MockScoreEntry = {
    ...entry,
    id: `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  history.entries.push(newEntry);
  saveMockScoreHistory(history);

  // PR-B: durable per-mock record (mirror of the attempt subcollection). Keep the
  // existing blob write above; this is the additional queryable layer. Fire-and-forget.
  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    void setDoc(
      doc(firestoreDb, "mockScoreHistory", uid, "entries", newEntry.id),
      { ...newEntry, updatedAt: new Date().toISOString() },
      { merge: true },
    ).catch(() => {});
  }
}

export function getMockScoresForSubject(subject: "Maths" | "Science"): MockScoreEntry[] {
  return loadMockScoreHistory().entries.filter((e) => e.subject === subject);
}

export function getLatestMockScores(limit = 10): MockScoreEntry[] {
  const history = loadMockScoreHistory();
  return history.entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getMockTopicScores(): Map<string, { avgPercent: number; attempts: number }> {
  const history = loadMockScoreHistory();
  const map = new Map<string, { totalPercent: number; count: number }>();

  for (const entry of history.entries) {
    if (!entry.topicBreakdown) continue;
    for (const [rawTopicKey, data] of Object.entries(entry.topicBreakdown)) {
      // Resolve at read so historical raw-key mock records bucket with new
      // canonical-key ones (P0 [FU-TOPICKEY-UNIVERSAL]).
      const topicKey = resolveCanonicalSlug(rawTopicKey) || rawTopicKey;
      const prev = map.get(topicKey) || { totalPercent: 0, count: 0 };
      const pct = data.maxPossible > 0 ? (data.scored / data.maxPossible) * 100 : 0;
      prev.totalPercent += pct;
      prev.count++;
      map.set(topicKey, prev);
    }
  }

  const result = new Map<string, { avgPercent: number; attempts: number }>();
  for (const [key, data] of map) {
    result.set(key, { avgPercent: data.totalPercent / data.count, attempts: data.count });
  }
  return result;
}
