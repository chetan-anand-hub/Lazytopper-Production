import { class10MathTopicTrends } from "../data/class10MathTopicTrends";
import { class10ScienceTopicTrends } from "../data/class10ScienceTopicTrends";

export type DriftSubject = "Maths" | "Science" | "General";
export type DriftSignalKind = "official_sqp" | "official_circular";
export type DriftStatus =
  | "ok"
  | "changed"
  | "missing-baseline"
  | "stale-topics"
  | "fetch-error";

export interface DriftSignalSource {
  id: string;
  label: string;
  subject: DriftSubject;
  kind: DriftSignalKind;
  url: string;
}

export interface DriftBaselineSnapshot {
  sourceId: string;
  signature: string;
  checkedAtIso: string;
}

export interface DriftSourceResult {
  sourceId: string;
  label: string;
  subject: DriftSubject;
  kind: DriftSignalKind;
  status: DriftStatus;
  signature: string;
  baselineSignature: string;
  checkedAtIso: string;
  topicCoverage: number;
  staleTopics: string[];
  notes: string;
}

export interface DriftMonitorReport {
  checkedAtIso: string;
  results: DriftSourceResult[];
  summary: {
    total: number;
    changed: number;
    staleTopics: number;
    fetchErrors: number;
    missingBaseline: number;
  };
}

export interface DriftMonitorOptions {
  sources?: DriftSignalSource[];
  baseline?: DriftBaselineSnapshot[];
  fetchTimeoutMs?: number;
  minTopicCoverage?: number;
  fetchText?: (url: string, timeoutMs: number) => Promise<string>;
}

const DEFAULT_SOURCES: DriftSignalSource[] = [
  {
    id: "cbse-class10-sqp",
    label: "CBSE Class 10 SQP Portal",
    subject: "General",
    kind: "official_sqp",
    url: "https://cbseacademic.nic.in/SQP_CLASSX_2025-26.html",
  },
  {
    id: "cbse-circulars",
    label: "CBSE Circulars",
    subject: "General",
    kind: "official_circular",
    url: "https://www.cbse.gov.in/cbsenew/circulars.html",
  },
];

export const DEFAULT_DRIFT_BASELINE: DriftBaselineSnapshot[] = [
  {
    sourceId: "cbse-class10-sqp",
    signature: "",
    checkedAtIso: "2026-02-09T00:00:00.000Z",
  },
  {
    sourceId: "cbse-circulars",
    signature: "",
    checkedAtIso: "2026-02-09T00:00:00.000Z",
  },
];

function normalizeText(raw: string): string {
  return String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fnv1aHash(raw: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function allTrackedTopics(): string[] {
  const maths = Object.keys(class10MathTopicTrends.topics).map((topicKey) =>
    String(topicKey)
  );
  const science = Object.values(class10ScienceTopicTrends.topics).map((topic) =>
    String(topic.topicName || topic.topicKey)
  );
  return [...maths, ...science];
}

function subjectTrackedTopics(subject: DriftSubject): string[] {
  if (subject === "Maths") {
    return Object.keys(class10MathTopicTrends.topics).map((topicKey) =>
      String(topicKey)
    );
  }
  if (subject === "Science") {
    return Object.values(class10ScienceTopicTrends.topics).map((topic) =>
      String(topic.topicName || topic.topicKey)
    );
  }
  return allTrackedTopics();
}

async function defaultFetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function topicCoverageDetails(rawText: string, topics: string[]) {
  const normalized = normalizeText(rawText);
  if (topics.length === 0) {
    return { coverage: 1, missing: [] as string[] };
  }

  const missing: string[] = [];
  let hit = 0;
  for (const topic of topics) {
    const token = normalizeText(topic);
    if (!token) continue;
    if (normalized.includes(token)) {
      hit += 1;
    } else {
      missing.push(topic);
    }
  }
  return {
    coverage: hit / topics.length,
    missing,
  };
}

function byId<T extends { sourceId: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) out[item.sourceId] = item;
  return out;
}

export async function runPredictionDriftMonitor(
  options: DriftMonitorOptions = {}
): Promise<DriftMonitorReport> {
  const checkedAtIso = new Date().toISOString();
  const sources = options.sources ?? DEFAULT_SOURCES;
  const baselineById = byId(options.baseline ?? DEFAULT_DRIFT_BASELINE);
  const fetchTimeoutMs = options.fetchTimeoutMs ?? 12000;
  const minTopicCoverage = options.minTopicCoverage ?? 0.1;
  const fetchText = options.fetchText ?? defaultFetchText;

  const results: DriftSourceResult[] = [];

  for (const source of sources) {
    const baseline = baselineById[source.id];
    const baselineSignature = baseline?.signature ?? "";

    try {
      const rawText = await fetchText(source.url, fetchTimeoutMs);
      const signature = fnv1aHash(normalizeText(rawText));
      const trackedTopics = subjectTrackedTopics(source.subject);
      const topicCoverage = topicCoverageDetails(rawText, trackedTopics);
      const signatureChanged =
        baselineSignature.length > 0 && baselineSignature !== signature;
      const staleTopics = topicCoverage.coverage < minTopicCoverage;

      let status: DriftStatus = "ok";
      if (!baselineSignature) status = "missing-baseline";
      if (signatureChanged) status = "changed";
      if (staleTopics) status = "stale-topics";

      results.push({
        sourceId: source.id,
        label: source.label,
        subject: source.subject,
        kind: source.kind,
        status,
        signature,
        baselineSignature,
        checkedAtIso,
        topicCoverage: topicCoverage.coverage,
        staleTopics: topicCoverage.missing.slice(0, 25),
        notes: signatureChanged
          ? "Official source signature changed versus baseline."
          : staleTopics
          ? "Tracked topic coverage dropped below threshold."
          : baselineSignature
          ? "No drift detected."
          : "Baseline missing; set baseline after manual verification.",
      });
    } catch (error) {
      results.push({
        sourceId: source.id,
        label: source.label,
        subject: source.subject,
        kind: source.kind,
        status: "fetch-error",
        signature: "",
        baselineSignature,
        checkedAtIso,
        topicCoverage: 0,
        staleTopics: [],
        notes: `Fetch failed: ${String(error instanceof Error ? error.message : error)}`,
      });
    }
  }

  return {
    checkedAtIso,
    results,
    summary: {
      total: results.length,
      changed: results.filter((result) => result.status === "changed").length,
      staleTopics: results.filter((result) => result.status === "stale-topics").length,
      fetchErrors: results.filter((result) => result.status === "fetch-error").length,
      missingBaseline: results.filter((result) => result.status === "missing-baseline").length,
    },
  };
}
