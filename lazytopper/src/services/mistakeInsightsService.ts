import { getMistakeLogs, type MistakeLogEntry } from "./mistakeLogService";
import {
  MISTAKE_GROUPS,
  addMarksLost,
  entryMarksLost,
  isCarelessType,
  zeroMarksLost,
  type MarksLostByType,
} from "../lib/mistakeDisplay";

export type CheckerMistakeType = "conceptual" | "calculation" | "silly" | "presentation";

export interface MistakeCounts {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}

export interface TopicHotspot {
  topic: string;
  subject: string;
  marksLost: number;
  count: number;
  dominantType: CheckerMistakeType;
  lastSeen: string;
}

export interface RecommendedAction {
  label: string;
  type: "practice" | "learn" | "retry";
  subject?: string;
  topic?: string;
}

export interface MistakeInsights {
  totalChecked: number;
  /**
   * The sum of every entry's own `marksLost` (total − awarded on that question). It is
   * ALREADY in marks on every entry version — old count-only entries included — so it is
   * summed as stored, never converted. It includes marks the student did not attempt and
   * marks lost with no reason recorded: it is "marks lost", not "marks lost to mistakes".
   */
  totalMarksLost: number;
  mistakeCounts: MistakeCounts;
  /**
   * SCORECARD-MI-1 PR-2 (B7) — the student's biggest loss. When ANY entry in the window
   * carries v2 `marksLostByType`, it is the type that cost the most MARKS over those entries
   * (`topMistakeBasis: "marks"`); otherwise it is the type with the most mistakes, exactly as
   * before (`"counts"`). Null when nothing names a type.
   */
  topMistakeType: CheckerMistakeType | null;
  /** What `topMistakeType` was decided on — "marks" (v2 entries) or "counts"; null with no type. */
  topMistakeBasis: "marks" | "counts" | null;
  /** The v2 entries' marks lost per bucket, summed; null when no entry in the window carries
   *  them (a count-only window is never given marks). */
  marksLostByType: MarksLostByType | null;
  topHotspot: TopicHotspot | null;
  hasEnoughData: boolean;
}

export interface MistakeTrend {
  direction: "improving" | "worsening" | "stable";
  overallPctChange: number | null;
  byType: Partial<Record<CheckerMistakeType, number | null>>;
  label: string;
}

const EMPTY_COUNTS: MistakeCounts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
const MISTAKE_TYPES: CheckerMistakeType[] = ["conceptual", "calculation", "silly", "presentation"];

export function isSafeEntry(e: unknown): e is MistakeLogEntry {
  if (!e || typeof e !== "object") return false;
  const entry = e as Record<string, unknown>;
  if (typeof entry.timestamp !== "string") return false;
  if (!entry.mistakeCounts || typeof entry.mistakeCounts !== "object") return false;
  return true;
}

function aggregateCounts(entries: MistakeLogEntry[]): MistakeCounts {
  const counts = { ...EMPTY_COUNTS };
  for (const e of entries) {
    if (!e.mistakeCounts) continue;
    counts.conceptual += Number(e.mistakeCounts.conceptual) || 0;
    counts.calculation += Number(e.mistakeCounts.calculation) || 0;
    counts.silly += Number(e.mistakeCounts.silly) || 0;
    counts.presentation += Number(e.mistakeCounts.presentation) || 0;
  }
  return counts;
}

function topType(counts: MistakeCounts): CheckerMistakeType | null {
  const max = Math.max(counts.conceptual, counts.calculation, counts.silly, counts.presentation);
  if (max === 0) return null;
  return (MISTAKE_TYPES.find((t) => counts[t] === max) ?? null);
}

/**
 * SCORECARD-MI-1 PR-2 (B7) — the marks lost per bucket over the entries that CARRY them
 * (`entryMarksLost`: a v2 entry with `marksLostByTypeVersion: 1`), or null when none does.
 * A count-only entry contributes nothing here: it is never given invented marks (G5).
 */
export function aggregateEntryMarks(entries: MistakeLogEntry[]): MarksLostByType | null {
  let sum = zeroMarksLost();
  let any = false;
  for (const e of entries) {
    const m = entryMarksLost(e);
    if (!m) continue;
    any = true;
    sum = addMarksLost(sum, m);
  }
  return any ? sum : null;
}

/**
 * The stored type that cost the most MARKS (only the four mistake buckets — "unattempted" and
 * "untyped" are never a mistake type). A tie goes to the group shown first (knowledge,
 * technique, careless — MISTAKE_GROUPS order), then to the type's order inside its group.
 * Null when no mistake bucket lost a mark.
 */
export function topTypeByMarks(marks: MarksLostByType): CheckerMistakeType | null {
  let best: CheckerMistakeType | null = null;
  let bestMarks = 0;
  for (const g of MISTAKE_GROUPS) {
    for (const t of g.types) {
      if (marks[t] > bestMarks) {
        best = t;
        bestMarks = marks[t];
      }
    }
  }
  return best;
}

function buildHotspots(entries: MistakeLogEntry[]): TopicHotspot[] {
  const map = new Map<string, {
    subject: string;
    marksLost: number;
    count: number;
    counts: MistakeCounts;
    lastSeen: string;
  }>();

  for (const e of entries) {
    const key = (e.topic || "").trim() || "Unknown";
    const prev = map.get(key) ?? {
      subject: e.subject || "",
      marksLost: 0,
      count: 0,
      counts: { ...EMPTY_COUNTS },
      lastSeen: "",
    };
    prev.marksLost += Number(e.marksLost) || 0;
    prev.count += 1;
    if (e.mistakeCounts) {
      prev.counts.conceptual += Number(e.mistakeCounts.conceptual) || 0;
      prev.counts.calculation += Number(e.mistakeCounts.calculation) || 0;
      prev.counts.silly += Number(e.mistakeCounts.silly) || 0;
      prev.counts.presentation += Number(e.mistakeCounts.presentation) || 0;
    }
    if (!prev.lastSeen || e.timestamp > prev.lastSeen) prev.lastSeen = e.timestamp;
    map.set(key, prev);
  }

  const hotspots: TopicHotspot[] = [];
  for (const [topic, data] of map.entries()) {
    const dominant = topType(data.counts) ?? "conceptual";
    hotspots.push({
      topic,
      subject: data.subject,
      marksLost: data.marksLost,
      count: data.count,
      dominantType: dominant,
      lastSeen: data.lastSeen,
    });
  }
  return hotspots.sort((a, b) => b.marksLost - a.marksLost);
}

export async function getMistakeInsights(uid: string, days: number): Promise<MistakeInsights> {
  try {
    const raw = await getMistakeLogs(uid, days);
    const entries = raw.filter(isSafeEntry);
    const counts = aggregateCounts(entries);
    const hotspots = buildHotspots(entries);
    // Already marks on every entry version (see MistakeInsights.totalMarksLost) — summed as stored.
    const totalMarksLost = entries.reduce((s, e) => s + (Number(e.marksLost) || 0), 0);

    // B7 — marks decide the top type whenever the window holds v2 entries. Should those
    // entries name no mistake mark at all (every loss not attempted / reason not recorded),
    // the count-based answer is used and labelled "counts" — never a marks claim.
    const marksLostByType = aggregateEntryMarks(entries);
    const byMarks = marksLostByType ? topTypeByMarks(marksLostByType) : null;
    const byCounts = byMarks ? null : topType(counts);
    const topMistakeType = byMarks ?? byCounts;

    return {
      totalChecked: entries.length,
      totalMarksLost,
      mistakeCounts: counts,
      topMistakeType,
      topMistakeBasis: byMarks ? "marks" : byCounts ? "counts" : null,
      marksLostByType,
      topHotspot: hotspots[0] ?? null,
      hasEnoughData: entries.length >= 3,
    };
  } catch {
    return {
      totalChecked: 0,
      totalMarksLost: 0,
      mistakeCounts: { ...EMPTY_COUNTS },
      topMistakeType: null,
      topMistakeBasis: null,
      marksLostByType: null,
      topHotspot: null,
      hasEnoughData: false,
    };
  }
}

export async function getMistakeTrend(
  uid: string,
  currentDays: number,
  previousDays: number
): Promise<MistakeTrend> {
  try {
    const now = Date.now();
    const allRaw = await getMistakeLogs(uid, currentDays + previousDays);
    const all = allRaw.filter(isSafeEntry);

    const currentCutoff = now - currentDays * 86400000;
    const previousCutoff = now - (currentDays + previousDays) * 86400000;

    const current = all.filter((e) => new Date(e.timestamp).getTime() >= currentCutoff);
    const previous = all.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= previousCutoff && t < currentCutoff;
    });

    const curCounts = aggregateCounts(current);
    const prevCounts = aggregateCounts(previous);
    const curTotal = current.reduce((s, e) => s + (Number(e.marksLost) || 0), 0);
    const prevTotal = previous.reduce((s, e) => s + (Number(e.marksLost) || 0), 0);

    const pct = (cur: number, prev: number): number | null => {
      if (prev === 0) return cur > 0 ? null : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const overallPct = pct(curTotal, prevTotal);

    const byType: Partial<Record<CheckerMistakeType, number | null>> = {};
    for (const t of MISTAKE_TYPES) {
      byType[t] = pct(curCounts[t], prevCounts[t]);
    }

    let direction: MistakeTrend["direction"] = "stable";
    if (overallPct !== null) {
      if (overallPct <= -10) direction = "improving";
      else if (overallPct >= 10) direction = "worsening";
    }

    return {
      direction,
      overallPctChange: overallPct,
      byType,
      label: `vs previous ${previousDays} days`,
    };
  } catch {
    return {
      direction: "stable",
      overallPctChange: null,
      byType: {},
      label: "",
    };
  }
}

export async function getTopicMistakeHotspots(uid: string, days: number): Promise<TopicHotspot[]> {
  try {
    const raw = await getMistakeLogs(uid, days);
    const entries = raw.filter(isSafeEntry);
    return buildHotspots(entries);
  } catch {
    return [];
  }
}

/**
 * The careless view (Me page "easy marks"). SCORECARD-MI-1 — owner ruling: careless =
 * calculation + silly ("Marks to gain — you already know this"); the grouping is decided in
 * lib/mistakeDisplay. Never a knowledge gap, so deliberately kept OUT of weak areas.
 */
export interface CarelessInsight {
  calculationCount: number;
  sillyCount: number;
  count: number;
  /** MARKS from the step deductions the grader wrote on careless steps. */
  marksLost: number;
  hasData: boolean;
}

/** Pure aggregator — call from surfaces that already hold the entries. */
export function summarizeCareless(entries: MistakeLogEntry[]): CarelessInsight {
  let calculationCount = 0;
  let sillyCount = 0;
  let marksLost = 0;
  for (const e of entries) {
    if (!isSafeEntry(e)) continue;
    calculationCount += Number(e.mistakeCounts?.calculation) || 0;
    sillyCount += Number(e.mistakeCounts?.silly) || 0;
    for (const s of e.stepDetails ?? []) {
      if (isCarelessType(String(s.mistakeType))) {
        marksLost += Number(s.marksDeducted) || 0;
      }
    }
  }
  const count = calculationCount + sillyCount;
  return {
    calculationCount,
    sillyCount,
    count,
    marksLost: Math.round(marksLost * 10) / 10,
    hasData: count > 0,
  };
}

/** Async wrapper for surfaces that need to fetch first. */
export async function getCarelessInsight(uid: string, days: number): Promise<CarelessInsight> {
  try {
    const raw = await getMistakeLogs(uid, days);
    return summarizeCareless(raw.filter(isSafeEntry));
  } catch {
    return { calculationCount: 0, sillyCount: 0, count: 0, marksLost: 0, hasData: false };
  }
}

export async function getRecommendedNextActions(uid: string, days: number): Promise<RecommendedAction[]> {
  try {
    const insights = await getMistakeInsights(uid, days);
    if (!insights.hasEnoughData || !insights.topMistakeType) return [];

    const topic = insights.topHotspot?.topic;
    const subject = insights.topHotspot?.subject;
    const actions: RecommendedAction[] = [];

    switch (insights.topMistakeType) {
      case "presentation":
        actions.push({
          label: "Retry 3 written questions — focus on units, labels, and final answer format",
          type: "retry",
          subject,
          topic,
        });
        break;
      case "conceptual":
        actions.push({
          label: topic
            ? `Learn ${topic} first before more practice`
            : "Review the concept before attempting more questions",
          type: "learn",
          subject,
          topic,
        });
        break;
      case "calculation":
        actions.push({
          label: "Do untimed accuracy practice — slow down and check each step",
          type: "practice",
          subject,
          topic,
        });
        break;
      case "silly":
        actions.push({
          label: "Switch to slower timed drills — review your final line before submitting",
          type: "practice",
          subject,
          topic,
        });
        break;
    }

    if (insights.topHotspot && actions.length < 2) {
      actions.push({
        label: `Practice more ${insights.topHotspot.topic} questions`,
        type: "practice",
        subject: insights.topHotspot.subject,
        topic: insights.topHotspot.topic,
      });
    }

    return actions.slice(0, 3);
  } catch {
    return [];
  }
}
