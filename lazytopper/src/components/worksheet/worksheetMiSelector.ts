// src/components/worksheet/worksheetMiSelector.ts
//
// FIX A — SCOPE-RELATIVE Mistake-Intelligence for the worksheet builder.
//
// The prior builder resolved ONE global weakest topic and only enriched when that
// happened to fall inside the chosen scope; anything else showed a single "grade a
// worksheet first…" locked box — which is FALSE for a student who DOES have mistake
// history (it simply isn't the topic they picked). This pure selector replaces that
// with a scope-relative read of the SAME real Mistake-Intelligence source
// (`lazytopper.mistakeLogs.v1:{uid}` — the C&I / worksheet-grade mistake log), so the
// builder can say the true thing in every situation and weight honestly.
//
// DERIVATION, NOT FABRICATION (no schema change, no migration, no new writes):
//   • topic       — matched against the worksheet topic universe by normalized
//                    label OR key (a mistake entry's `topic` may be either).
//   • marks lost  — the entry's real `marksLost`, summed within the 30-day window.
//   • section     — derived from the entry's `totalMarks` via the CBSE band proxy
//                    (1→A, 2→B, 3→C, 4→E case, 5→D). Mistake-log entries carry no
//                    persisted `questionId`, so the exact questionIds→canonicalBank
//                    join (available on the separate SessionRecord store — see
//                    sessionRecords.ts `questionIds`) is not applicable here; the
//                    band proxy is the task-endorsed fallback and the native
//                    granularity of this store. When `totalMarks` is missing / not a
//                    canonical CBSE value the section is an HONEST UNKNOWN: it still
//                    contributes to `marksLost` (and the 4-type totals) but to NO
//                    section bucket — never a fabricated section. Wiring uploaded C&I
//                    questions with a canonical identity (→ exact section) is future
//                    work: [FU-CI-SOLUTION-CACHE].
//   • mistake mix — the entry's `mistakeCounts` 4-type tallies, summed per topic.
//
// Pure + unit-testable: `aggregateMistakeLog` takes entries + `nowMs`; the impure
// `readWorksheetMi` wrapper only supplies the localStorage read + the clock.

import type { WorksheetTopic } from "./worksheetModel";

export type MistakeSection = "A" | "B" | "C" | "D" | "E";

const MISTAKE_LOG_PREFIX = "lazytopper.mistakeLogs.v1";
const WINDOW_DAYS = 30;

/** The subset of a stored MistakeLogEntry this selector reads (see
 *  services/mistakeLogService.ts `MistakeLogEntry`). */
export interface RawMistakeEntry {
  topic?: string;
  subject?: string;
  timestamp?: string;
  marksLost?: number;
  totalMarks?: number;
  mistakeCounts?: {
    conceptual?: number;
    calculation?: number;
    silly?: number;
    presentation?: number;
  };
}

export interface TopicMi {
  key: string;
  label: string;
  /** Total marks lost on this topic within the window. */
  marksLost: number;
  /** Marks lost per CBSE section, derived from each mistake's `totalMarks` band. */
  sectionLoss: Partial<Record<MistakeSection, number>>;
  /** Marks lost that carried no resolvable CBSE band (honest unknown) — counted in
   *  `marksLost` but assigned to NO section (never a fabricated section). */
  unknownSectionLoss: number;
  mistakeTypes: { conceptual: number; calculation: number; silly: number; presentation: number };
}

export interface WorksheetMi {
  /** true when at least one supplied topic has attributable marks lost. */
  hasData: boolean;
  byTopic: Map<string, TopicMi>;
}

const EMPTY_MI: WorksheetMi = { hasData: false, byTopic: new Map() };

/** Lower-case, collapse non-alphanumerics — so a stored key ("real-numbers") and a
 *  label ("Real Numbers") both normalize to the same token ("real numbers"). */
export function normalizeMiLabel(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** CBSE band proxy: a question's total marks → its section. Only the five canonical
 *  CBSE mark values map; anything else is an honest unknown (null), never a
 *  fabricated section. (1→A MCQ/AR · 2→B VSA · 3→C SA · 4→E case · 5→D LA.) */
export function sectionFromTotalMarks(totalMarks: unknown): MistakeSection | null {
  switch (Number(totalMarks)) {
    case 1:
      return "A";
    case 2:
      return "B";
    case 3:
      return "C";
    case 4:
      return "E";
    case 5:
      return "D";
    default:
      return null;
  }
}

function emptyTopicMi(topic: WorksheetTopic): TopicMi {
  return {
    key: topic.key,
    label: topic.label,
    marksLost: 0,
    sectionLoss: {},
    unknownSectionLoss: 0,
    mistakeTypes: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  };
}

/**
 * Pure aggregation of raw mistake entries against a topic universe. Entries outside
 * the 30-day window, with no marks lost, or not matching any supplied topic are
 * ignored — subject scoping falls out of the topic match (labels are subject-unique).
 */
export function aggregateMistakeLog(
  entries: RawMistakeEntry[],
  topics: WorksheetTopic[],
  nowMs: number,
): WorksheetMi {
  if (!Array.isArray(entries) || entries.length === 0 || topics.length === 0) {
    return { hasData: false, byTopic: new Map() };
  }
  const cutoff = nowMs - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  // normalized label AND key → topic (a mistake entry's `topic` may be either).
  const byNorm = new Map<string, WorksheetTopic>();
  for (const t of topics) {
    byNorm.set(normalizeMiLabel(t.label), t);
    byNorm.set(normalizeMiLabel(t.key), t);
  }
  const acc = new Map<string, TopicMi>();
  for (const e of entries) {
    const ts = e.timestamp ? new Date(e.timestamp).getTime() : NaN;
    if (Number.isFinite(ts) && ts < cutoff) continue;
    const topic = byNorm.get(normalizeMiLabel(String(e.topic || "")));
    if (!topic) continue;
    const lost = Number(e.marksLost) || 0;
    if (lost <= 0) continue;
    let mi = acc.get(topic.key);
    if (!mi) {
      mi = emptyTopicMi(topic);
      acc.set(topic.key, mi);
    }
    mi.marksLost += lost;
    const section = sectionFromTotalMarks(e.totalMarks);
    if (section) mi.sectionLoss[section] = (mi.sectionLoss[section] ?? 0) + lost;
    else mi.unknownSectionLoss += lost;
    const c = e.mistakeCounts;
    if (c) {
      mi.mistakeTypes.conceptual += Number(c.conceptual) || 0;
      mi.mistakeTypes.calculation += Number(c.calculation) || 0;
      mi.mistakeTypes.silly += Number(c.silly) || 0;
      mi.mistakeTypes.presentation += Number(c.presentation) || 0;
    }
  }
  return { hasData: acc.size > 0, byTopic: acc };
}

/** Read + aggregate the signed-in user's mistake log (impure wrapper over
 *  `aggregateMistakeLog`). Returns empty MI for signed-out / SSR / unreadable log. */
export function readWorksheetMi(
  uid: string | null | undefined,
  topics: WorksheetTopic[],
): WorksheetMi {
  if (!uid || typeof window === "undefined") return EMPTY_MI;
  let entries: RawMistakeEntry[] = [];
  try {
    const raw = window.localStorage.getItem(`${MISTAKE_LOG_PREFIX}:${uid}`);
    if (!raw) return EMPTY_MI;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_MI;
    entries = parsed as RawMistakeEntry[];
  } catch {
    return EMPTY_MI;
  }
  return aggregateMistakeLog(entries, topics, Date.now());
}

/** The topic among `candidates` with the most marks lost (>0), or null. Used both
 *  scope-relatively (candidates = in-scope topics) and globally (candidates = all). */
export function weakestTopic(mi: WorksheetMi, candidates: WorksheetTopic[]): TopicMi | null {
  let best: TopicMi | null = null;
  for (const t of candidates) {
    const m = mi.byTopic.get(t.key);
    if (m && m.marksLost > 0 && (!best || m.marksLost > best.marksLost)) best = m;
  }
  return best;
}

/** One in-scope weak topic with its real marks-lost weight (FIX-3, level 1). */
export interface WeakTopicWeight {
  key: string;
  label: string;
  /** Real marks lost on this topic in the window (>0). The between-topic weight. */
  marksLost: number;
}

/**
 * FIX-3 — the scope-relative multi-topic analogue of `weakestTopic`: the FULL ranked
 * set of in-scope topics that carry attributable marks lost, most-marks-lost first.
 * Where `weakestTopic` names only the single weakest, this names EVERY weak in-scope
 * topic so the worksheet can weight BETWEEN them proportionally to real marks lost
 * (level 1) — and it is what the honest copy enumerates ("… Real Numbers and
 * Polynomials, where you've lost the most marks"). Topics with no recorded loss are
 * omitted (never named, never boosted). Ties keep the candidate order (deterministic).
 * `weakestTopic` is retained unchanged for its existing single-topic callers.
 */
export function rankedInScopeWeakTopics(
  mi: WorksheetMi,
  candidates: WorksheetTopic[],
): WeakTopicWeight[] {
  const rows: Array<{ w: WeakTopicWeight; i: number }> = [];
  candidates.forEach((t, i) => {
    const m = mi.byTopic.get(t.key);
    if (m && m.marksLost > 0) rows.push({ w: { key: t.key, label: t.label, marksLost: m.marksLost }, i });
  });
  return rows
    .sort((a, b) => b.w.marksLost - a.w.marksLost || a.i - b.i)
    .map((r) => r.w);
}

/** A topic's known weak sections, most-marks-lost first (unknown-band loss excluded). */
export function weakSections(topicMi: TopicMi | null | undefined): MistakeSection[] {
  if (!topicMi) return [];
  return (Object.keys(topicMi.sectionLoss) as MistakeSection[])
    .filter((s) => (topicMi.sectionLoss[s] ?? 0) > 0)
    .sort((a, b) => (topicMi.sectionLoss[b] ?? 0) - (topicMi.sectionLoss[a] ?? 0));
}

/** How strongly the weakest section is over-weighted in a single-topic worksheet
 *  (the top weak section's draw weight is multiplied by this; lighter sections
 *  scale down proportionally to their share of marks lost). */
export const SECTION_BOOST_STRENGTH = 1.5;

/**
 * Section boost multipliers (≥1) for a topic's weak sections — proportional to each
 * section's share of the topic's marks lost, so the section the student loses the
 * MOST marks in gets the full `SECTION_BOOST_STRENGTH` and the rest scale down.
 * Sections with no recorded loss are simply absent (no boost). Returns `{}` when
 * there is no usable section signal (nothing to weight toward) — the caller then
 * offers no toggle, so a default-ON toggle never silently does nothing.
 */
export function sectionBoostsFor(
  topicMi: TopicMi | null | undefined,
): Partial<Record<MistakeSection, number>> {
  const sections = weakSections(topicMi);
  if (!topicMi || sections.length === 0) return {};
  const max = topicMi.sectionLoss[sections[0]] ?? 0;
  if (max <= 0) return {};
  const out: Partial<Record<MistakeSection, number>> = {};
  for (const s of sections) {
    const share = (topicMi.sectionLoss[s] ?? 0) / max; // 0..1
    out[s] = 1 + share * (SECTION_BOOST_STRENGTH - 1);
  }
  return out;
}
