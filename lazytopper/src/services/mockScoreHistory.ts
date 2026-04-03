import { getActiveProgressUser } from "./studentProgressStore";

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

function getStorageKey(): string {
  const uid = getActiveProgressUser();
  return `${STORAGE_PREFIX}.${uid}.mockScoreHistory.v1`;
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
}

export function saveMockScore(entry: Omit<MockScoreEntry, "id" | "timestamp">): void {
  const history = loadMockScoreHistory();
  history.entries.push({
    ...entry,
    id: `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
  saveMockScoreHistory(history);
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
    for (const [topicKey, data] of Object.entries(entry.topicBreakdown)) {
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
