import {
  buildProgressScopeKey,
  getActiveProgressUser,
  saveLearnerProgressSegment,
} from "./studentProgressStore";

export type TopicHubNodeMasteryState =
  | "unseen"
  | "learning"
  | "checkpoint_passed"
  | "needs_practice"
  | "mastered";

export interface TopicHubNodeMasteryRecord {
  state: TopicHubNodeMasteryState;
  attempts: number;
  lastScore?: number;
  lastBand?: string;
  lastStatus?: string;
  updatedAt: string;
}

export interface TopicHubMasterySnapshot {
  version: 1;
  topicKey: string;
  updatedAt: string;
  lastTutorNodeId?: string;
  lastGrindNodeId?: string;
  nodes: Record<string, TopicHubNodeMasteryRecord>;
}

export interface TopicHubNodeProgressInput {
  score?: number;
  band?: string;
  status?: string;
}

const STORAGE_KEY = "lazytopper.topicHub.triangles.mastery.v1";
const STORAGE_VERSION = 1;

const stateRank: Record<TopicHubNodeMasteryState, number> = {
  unseen: 0,
  learning: 1,
  needs_practice: 2,
  checkpoint_passed: 3,
  mastered: 4,
};

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeState(value: unknown): TopicHubNodeMasteryState {
  const v = String(value || "").trim();
  if (v === "learning") return "learning";
  if (v === "checkpoint_passed") return "checkpoint_passed";
  if (v === "needs_practice") return "needs_practice";
  if (v === "mastered") return "mastered";
  return "unseen";
}

function sanitizeNodeRecord(value: unknown): TopicHubNodeMasteryRecord {
  const obj = isRecord(value) ? value : {};
  const scoreRaw = Number(obj.lastScore);
  return {
    state: sanitizeState(obj.state),
    attempts: Math.max(0, Number(obj.attempts) || 0),
    lastScore: Number.isFinite(scoreRaw) ? scoreRaw : undefined,
    lastBand: typeof obj.lastBand === "string" ? obj.lastBand : undefined,
    lastStatus: typeof obj.lastStatus === "string" ? obj.lastStatus : undefined,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : nowIso(),
  };
}

export function createEmptyTrianglesMastery(): TopicHubMasterySnapshot {
  return createEmptyTopicMastery("triangles");
}

export function createEmptyTopicMastery(topicKey: string): TopicHubMasterySnapshot {
  const normalizedTopicKey = normalizeTopicKeyForStorage(topicKey);
  return {
    version: STORAGE_VERSION,
    topicKey: normalizedTopicKey,
    updatedAt: nowIso(),
    nodes: {},
  };
}

export function ensureTrianglesMasterySnapshot(
  value?: TopicHubMasterySnapshot | null
): TopicHubMasterySnapshot {
  return ensureTopicMasterySnapshot("triangles", value);
}

function normalizeTopicKeyForStorage(topicKey: string | null | undefined): string {
  const cleaned = String(topicKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "topic";
}

function getStorageKeyForTopic(topicKey: string): string {
  const normalizedTopicKey = normalizeTopicKeyForStorage(topicKey);
  return buildProgressScopeKey(
    "topicHubMastery",
    getActiveProgressUser(),
    normalizedTopicKey
  );
}

export function ensureTopicMasterySnapshot(
  topicKey: string,
  value?: TopicHubMasterySnapshot | null
): TopicHubMasterySnapshot {
  const normalizedTopicKey = normalizeTopicKeyForStorage(topicKey);
  if (!value) return createEmptyTopicMastery(normalizedTopicKey);
  const nodes: Record<string, TopicHubNodeMasteryRecord> = {};
  const src = isRecord(value.nodes) ? value.nodes : {};
  Object.keys(src).forEach((nodeId) => {
    if (!String(nodeId || "").trim()) return;
    nodes[String(nodeId)] = sanitizeNodeRecord(src[nodeId]);
  });
  return {
    version: STORAGE_VERSION,
    topicKey: normalizedTopicKey,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : nowIso(),
    lastTutorNodeId:
      typeof value.lastTutorNodeId === "string" && value.lastTutorNodeId.trim()
        ? value.lastTutorNodeId
        : undefined,
    lastGrindNodeId:
      typeof value.lastGrindNodeId === "string" && value.lastGrindNodeId.trim()
        ? value.lastGrindNodeId
        : undefined,
    nodes,
  };
}

export function loadTrianglesMasterySnapshot(): TopicHubMasterySnapshot {
  return loadTopicMasterySnapshot("triangles");
}

export function loadTopicMasterySnapshot(topicKey: string): TopicHubMasterySnapshot {
  const normalizedTopicKey = normalizeTopicKeyForStorage(topicKey);
  if (typeof window === "undefined") return createEmptyTopicMastery(normalizedTopicKey);
  const storageKey = getStorageKeyForTopic(normalizedTopicKey);
  try {
    const raw =
      window.localStorage.getItem(storageKey) ||
      (normalizedTopicKey === "triangles" ? window.localStorage.getItem(STORAGE_KEY) : null);
    if (!raw) return createEmptyTopicMastery(normalizedTopicKey);
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return createEmptyTopicMastery(normalizedTopicKey);
    const snapshot = ensureTopicMasterySnapshot(
      normalizedTopicKey,
      parsed as unknown as TopicHubMasterySnapshot
    );
    if (snapshot.topicKey !== normalizedTopicKey) return createEmptyTopicMastery(normalizedTopicKey);
    return snapshot;
  } catch {
    return createEmptyTopicMastery(normalizedTopicKey);
  }
}

export function saveTrianglesMasterySnapshot(snapshot: TopicHubMasterySnapshot): void {
  saveTopicMasterySnapshot(snapshot, "triangles");
}

export function saveTopicMasterySnapshot(
  snapshot: TopicHubMasterySnapshot,
  topicKey?: string
): void {
  if (typeof window === "undefined") return;
  const normalizedTopicKey = normalizeTopicKeyForStorage(topicKey || snapshot.topicKey);
  const storageKey = getStorageKeyForTopic(normalizedTopicKey);
  const ensured = ensureTopicMasterySnapshot(normalizedTopicKey, snapshot);
  const uid = getActiveProgressUser();
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ensured));
    if (!uid && storageKey !== STORAGE_KEY && normalizedTopicKey === "triangles") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ensured));
    }
  } catch {
    // Ignore write errors to avoid breaking tutor flow.
  }
  if (uid) {
    void saveLearnerProgressSegment(uid, "topicMasteryByTopic", {
      [normalizedTopicKey]: ensured,
    });
  }
}

export function getNodeMasteryRecord(
  snapshot: TopicHubMasterySnapshot | null | undefined,
  nodeId: string | null | undefined
): TopicHubNodeMasteryRecord | null {
  if (!snapshot || !nodeId) return null;
  const key = String(nodeId || "").trim();
  if (!key) return null;
  const rec = snapshot.nodes[key];
  return rec ? sanitizeNodeRecord(rec) : null;
}

export function getNodeMasteryState(
  snapshot: TopicHubMasterySnapshot | null | undefined,
  nodeId: string | null | undefined
): TopicHubNodeMasteryState {
  const rec = getNodeMasteryRecord(snapshot, nodeId);
  return rec?.state || "unseen";
}

export function deriveMasteryStateFromProgress(
  input: TopicHubNodeProgressInput
): TopicHubNodeMasteryState {
  const status = String(input.status || "").toLowerCase();
  const score = Number(input.score);
  if (status === "correct" || (Number.isFinite(score) && score >= 70)) return "mastered";
  if (status === "partially_correct" || (Number.isFinite(score) && score >= 50)) {
    return "checkpoint_passed";
  }
  return "needs_practice";
}

export function markNodeLearning(
  snapshot: TopicHubMasterySnapshot,
  nodeId: string
): TopicHubMasterySnapshot {
  const key = String(nodeId || "").trim();
  if (!key) return snapshot;
  const next = ensureTopicMasterySnapshot(snapshot.topicKey, snapshot);
  const prev = getNodeMasteryRecord(next, key);
  const prevAttempts = prev?.attempts ?? 0;
  next.nodes[key] = {
    state:
      prev?.state === "mastered" || prev?.state === "checkpoint_passed"
        ? prev.state
        : "learning",
    attempts: prevAttempts,
    lastScore: prev?.lastScore,
    lastBand: prev?.lastBand,
    lastStatus: prev?.lastStatus,
    updatedAt: nowIso(),
  };
  next.updatedAt = nowIso();
  return next;
}

export function setLastTutorNodeId(
  snapshot: TopicHubMasterySnapshot,
  nodeId: string | null | undefined
): TopicHubMasterySnapshot {
  const key = String(nodeId || "").trim();
  if (!key) return snapshot;
  const next = ensureTopicMasterySnapshot(snapshot.topicKey, snapshot);
  next.lastTutorNodeId = key;
  next.updatedAt = nowIso();
  return next;
}

export function setLastGrindNodeId(
  snapshot: TopicHubMasterySnapshot,
  nodeId: string | null | undefined
): TopicHubMasterySnapshot {
  const key = String(nodeId || "").trim();
  if (!key) return snapshot;
  const next = ensureTopicMasterySnapshot(snapshot.topicKey, snapshot);
  next.lastGrindNodeId = key;
  next.updatedAt = nowIso();
  return next;
}

export function upsertNodeProgress(
  snapshot: TopicHubMasterySnapshot,
  nodeId: string,
  input: TopicHubNodeProgressInput
): TopicHubMasterySnapshot {
  const key = String(nodeId || "").trim();
  if (!key) return snapshot;
  const next = ensureTopicMasterySnapshot(snapshot.topicKey, snapshot);
  const prev = getNodeMasteryRecord(next, key);
  const score = Number(input.score);
  const state = deriveMasteryStateFromProgress(input);
  next.nodes[key] = {
    state,
    attempts: (prev?.attempts ?? 0) + 1,
    lastScore: Number.isFinite(score) ? score : prev?.lastScore,
    lastBand: input.band || prev?.lastBand,
    lastStatus: input.status || prev?.lastStatus,
    updatedAt: nowIso(),
  };
  next.updatedAt = nowIso();
  return next;
}

export function pickWeakestNodeId(
  orderedNodeIds: string[],
  snapshot: TopicHubMasterySnapshot | null | undefined
): string {
  const order = Array.isArray(orderedNodeIds) ? orderedNodeIds : [];
  if (!order.length) return "";
  const topicKey = snapshot?.topicKey || "triangles";
  const snap = ensureTopicMasterySnapshot(
    topicKey,
    snapshot || createEmptyTopicMastery(topicKey)
  );
  let bestId = order[0];
  let bestRank = Number.POSITIVE_INFINITY;
  order.forEach((nodeId) => {
    const rec = getNodeMasteryRecord(snap, nodeId);
    const rank = stateRank[rec?.state || "unseen"];
    if (rank < bestRank) {
      bestRank = rank;
      bestId = nodeId;
    }
  });
  return bestId;
}

export function getMasteryCounts(
  orderedNodeIds: string[],
  snapshot: TopicHubMasterySnapshot | null | undefined
): { mastered: number; checkpointPassed: number; total: number } {
  const order = Array.isArray(orderedNodeIds) ? orderedNodeIds : [];
  if (!order.length) return { mastered: 0, checkpointPassed: 0, total: 0 };
  let mastered = 0;
  let checkpointPassed = 0;
  order.forEach((id) => {
    const state = getNodeMasteryState(snapshot, id);
    if (state === "mastered") mastered += 1;
    if (state === "checkpoint_passed" || state === "mastered") checkpointPassed += 1;
  });
  return { mastered, checkpointPassed, total: order.length };
}
