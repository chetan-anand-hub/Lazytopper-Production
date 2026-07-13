// src/services/progressStore.ts
//
// Progress-Journey PR-1 — the ONE aggregation service. Every progress surface reads
// its slice HERE, at the right altitude, and NEVER recomputes per page (LOCKED
// contract Decision #5 + §2 interconnection map). It reads the stores the arc writes
// — `sessionRecords` (this PR), the `practiceInsights` attempts stream, and
// `mockScoreHistory` — and hands each surface exactly what it needs:
//
//   · Per-surface history (Worksheet / CT / FM pages)  → getSurfaceHistory()
//   · Me recent-activity strip                          → getRecentSessions() + getActivitySummary()
//   · Me rolled-up progress (before→now, honest-or-silent, windowed) → getSubjectProgress()
//   · Home ungraded nudge (status ≠ graded)             → getPendingSessions()
//   · Topic Hub per-topic before→now                    → getTopicProgress()
//
// HONEST-OR-SILENT everywhere: thin data returns null / an empty list, NEVER a
// fabricated line or number (§2 invariants). No writes here — read-only aggregation.

import { getAttempts, getAttemptsFromCloud, type PracticeAttempt } from "./practiceInsights";
import {
  loadLocalSessionRecords,
  getSessionRecordsFromCloud,
  getAllSessionPerQuestionFromCloud,
  type SessionRecord,
  type SessionSurface,
  type SessionStatus,
  type SessionSubject,
  type SessionPerQuestionPayload,
} from "./sessionRecords";
import { getMistakeLogs, type MistakeLogEntry } from "./mistakeLogService";
import { getActiveProgressUser } from "./studentProgressStore";
import { conceptForQuestionId, isChapterEchoSubtopic, normalizeSection, type BankConcept } from "./progressBankIndex";

// ── Per-surface history (§3a) ────────────────────────────────────────────────

/** All session records for one surface, newest-first. Reads the sessionRecords the
 *  grading surfaces write; a page filters to its own surface. */
export function getSurfaceHistory(surface: SessionSurface, uid?: string | null): SessionRecord[] {
  return loadLocalSessionRecords(uid)
    .filter((r) => r.surface === surface)
    .sort((a, b) => b.gradedAt - a.gradedAt);
}

/** A single record by its code/id (to re-open a stored scorecard). */
export function getSessionRecordById(id: string, uid?: string | null): SessionRecord | null {
  return loadLocalSessionRecords(uid).find((r) => r.id === id) ?? null;
}

// ── Me recent-activity strip (§3b band 2) ────────────────────────────────────

/** The most-recent graded sessions across all surfaces, newest-first — each row
 *  links OUT to its surface history. */
export function getRecentSessions(uid?: string | null, limit = 8): SessionRecord[] {
  return loadLocalSessionRecords(uid)
    .slice()
    .sort((a, b) => b.gradedAt - a.gradedAt)
    .slice(0, Math.max(0, limit));
}

export interface ActivitySummary {
  worksheets: number;
  chapterTests: number;
  fullMocks: number;
  /** Raw graded-attempt count (Quick Practice writes NO session record — §1a — so a
   *  practice-SET count is not derivable here; this is the honest per-question figure
   *  the Me PR can phrase, never a fabricated set count). */
  practiceAttempts: number;
}

/** Activity-level counts for the recent strip ("3 worksheets · 1 chapter test …" —
 *  Decision #3). Session counts come from durable records; practice is attempt-level
 *  (honest — see ActivitySummary.practiceAttempts). Windowed by `sinceDays`. */
export function getActivitySummary(uid?: string | null, sinceDays?: number): ActivitySummary {
  const cutoff = sinceDays ? Date.now() - sinceDays * DAY_MS : 0;
  const records = loadLocalSessionRecords(uid).filter((r) => r.gradedAt >= cutoff);
  const summary: ActivitySummary = { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 };
  for (const r of records) {
    if (r.surface === "worksheet") summary.worksheets += 1;
    else if (r.surface === "chapter-test") summary.chapterTests += 1;
    else if (r.surface === "full-mock") summary.fullMocks += 1;
  }
  summary.practiceAttempts = getAttempts(cutoff ? { start: cutoff } : {}).length;
  return summary;
}

// ── Home ungraded nudge (§3c) ────────────────────────────────────────────────

/** Sessions still awaiting an answer sheet (status ≠ graded) — powers the soft,
 *  dismissible Home nudge. Honest end-to-end: pending-upload never a fake 0. */
export function getPendingSessions(uid?: string | null): SessionRecord[] {
  const pendingStatuses: SessionStatus[] = ["pending-upload", "partial"];
  return loadLocalSessionRecords(uid)
    .filter((r) => pendingStatuses.includes(r.status))
    .sort((a, b) => b.gradedAt - a.gradedAt);
}

// ── Rolled-up progress: marks before→now, honest-or-silent (§3b band 1, D-PROG-5) ─

const DAY_MS = 24 * 60 * 60 * 1000;
/** Below this many measurable attempts in EITHER half, a trend is silent (honest). */
const MIN_HALF_SAMPLE = 3;

export type ProgressWindow = "week" | "2wk" | "month" | "4mo";
const WINDOW_DAYS: Record<ProgressWindow, number> = { week: 7, "2wk": 14, month: 30, "4mo": 120 };

export interface ProgressTrend {
  /** % marks in the earlier half of the window. */
  before: number;
  /** % marks in the later half of the window. */
  now: number;
  /** now − before (positive = rising). */
  delta: number;
  sampleBefore: number;
  sampleNow: number;
  window: ProgressWindow;
}

/** Marks % over a set of attempts (marks-anchored, not attempt-count). null if no
 *  measurable marks. */
function marksPercent(attempts: PracticeAttempt[]): { pct: number; sample: number } | null {
  let scored = 0;
  let available = 0;
  let sample = 0;
  for (const a of attempts) {
    const avail = Number(a.marksAvailable) || 0;
    if (avail <= 0) continue;
    scored += Number(a.marksScored) || 0;
    available += avail;
    sample += 1;
  }
  if (available <= 0 || sample === 0) return null;
  return { pct: Math.round((scored / available) * 1000) / 10, sample };
}

/**
 * Split the window's attempts at its midpoint and compare marks% before→now. Returns
 * null (SILENT) unless BOTH halves carry ≥ MIN_HALF_SAMPLE measurable attempts — a
 * trend is shown only when it is data-backed (honest-or-silent). `filter` narrows to
 * a subject or a topic; omit for all.
 */
function computeTrend(
  window: ProgressWindow,
  filter: (a: PracticeAttempt) => boolean,
  uid?: string | null,
): ProgressTrend | null {
  void uid; // attempts are the active-user stream (device-local); uid reserved for future cloud read
  const days = WINDOW_DAYS[window];
  const now = Date.now();
  const start = now - days * DAY_MS;
  const mid = now - (days / 2) * DAY_MS;

  const inWindow = getAttempts({ start }).filter(filter);
  const before = marksPercent(inWindow.filter((a) => a.timestamp < mid));
  const later = marksPercent(inWindow.filter((a) => a.timestamp >= mid));

  if (!before || !later) return null;
  if (before.sample < MIN_HALF_SAMPLE || later.sample < MIN_HALF_SAMPLE) return null;

  return {
    before: before.pct,
    now: later.pct,
    delta: Math.round((later.pct - before.pct) * 10) / 10,
    sampleBefore: before.sample,
    sampleNow: later.sample,
    window,
  };
}

function normalizeSubject(subject: string): "maths" | "science" {
  return /sci/i.test(String(subject || "")) ? "science" : "maths";
}

/** Per-subject marks before→now for the Me "You're rising" band. Honest-or-silent. */
export function getSubjectProgress(
  subject: "maths" | "science",
  window: ProgressWindow = "month",
  uid?: string | null,
): ProgressTrend | null {
  return computeTrend(window, (a) => normalizeSubject(a.subject) === subject, uid);
}

/** This topic's before→now marks trend for the Topic Hub (topic altitude, D-PROG-5). */
export function getTopicProgress(
  topicKey: string,
  window: ProgressWindow = "4mo",
  uid?: string | null,
): ProgressTrend | null {
  const key = String(topicKey || "").trim().toLowerCase();
  if (!key) return null;
  return computeTrend(window, (a) => String(a.topicKey || "").trim().toLowerCase() === key, uid);
}

// ════════════════════════════════════════════════════════════════════════════
// PR-B — CROSS-DEVICE, MULTI-RUNG windowed aggregation (the progress-memory layer)
// ────────────────────────────────────────────────────────────────────────────
// `getWindowedProgress` is the ONE async, CROSS-DEVICE read the Me/Progress redesign
// (arc PR-4) + scorecards consume. It reads the DURABLE streams — honoring `uid` (the
// `void uid` device-local seam above becomes a real cloud read here):
//   • getAttemptsFromCloud   — per-question marks (every graded surface + QP/HPQ)
//   • getSessionRecordsFromCloud + getAllSessionPerQuestionFromCloud — per-session
//     four-type (idempotent) + the per-question marks join for concept/section
//   • getMistakeLogs         — DEDUPED ENRICHMENT ONLY (never a before→now rate)
// and derives a before→now trend at every rung. HONEST-OR-SILENT PER RUNG: a
// rung/row appears only when BOTH halves of the window carry ≥ MIN_HALF_SAMPLE
// measurable points; otherwise it is omitted — an honest empty, never a fabricated
// line. No writes — read-only aggregation, the single source read at altitudes.
//
// SOURCE-OF-TRUTH per rung (verified against the write paths, 2026-07-13):
//   • subject / topic  → practiceInsights attempts ONLY. Every graded surface already
//     records each question as an attempt (worksheet/CT/FM/C&I via recordAttempt),
//     so attempts are the COMPLETE marks stream; unioning sessionRecords totals would
//     DOUBLE-COUNT. Fix vs today = cross-device, not fold-in.
//   • concept / section → BANK-MATCHED only. QP/HPQ attempts carry a real bank id
//     (→ subtopic/section, marks inline). worksheet/CT/FM attempts carry SYNTHETIC
//     ids (ws:/ct:/fm:), so those resolve via the record's paper-order questionIds +
//     the perQuestion payload marks. C&I (questionIds:[]) is silent by design.
//   • mistake-type → the COMPOSITION SHARE of typed mistakes (of your mistakes, what
//     fraction is conceptual / calculation / silly / presentation), from the idempotent
//     sessionRecords.fourType over FULLY-GRADED records only. Share is self-normalizing,
//     so it is immune to the fabrication a per-question RATE would suffer: a
//     pending/partial record (written at submit before upload — fourType {0,0,0,0} but a
//     full-paper questionIds count) would inject a zero-mistake denominator and fake a
//     "mistakes fell" trend driven by upload timing, not learning. mistakeLog stays
//     deduped ENRICHMENT only — its device-local dedup would over-count cross-device.
//     "Fewer mistakes overall" is carried by the marks rungs; this rung carries the
//     careless-vs-weakness composition shift (the MI moat).

export type MistakeType = "conceptual" | "calculation" | "silly" | "presentation";
const MISTAKE_TYPES: MistakeType[] = ["conceptual", "calculation", "silly", "presentation"];
const MISTAKE_TYPE_LABELS: Record<MistakeType, string> = {
  conceptual: "Conceptual",
  calculation: "Calculation",
  silly: "Silly",
  presentation: "Presentation",
};

export interface RungTrend {
  /** subject | canonical topicKey | subtopic | CBSE section letter | mistake-type. */
  key: string;
  label: string;
  /** Earlier-half metric. Score rungs (subject/topic/concept/section): marks %.
   *  mistake-type: the SHARE (%) this type is of all typed mistakes in the half. */
  before: number;
  /** Later-half metric (same unit as `before`). */
  now: number;
  /** now − before. Score rungs: positive = RISING (good). mistake-type: positive =
   *  this type is a LARGER share of your mistakes — the consumer reads polarity per
   *  type (conceptual/calculation up = weakness growing; silly/presentation is careless). */
  delta: number;
  sampleBefore: number;
  sampleNow: number;
}

/** Deduped mistakeLog readout — ENRICHMENT ONLY. Never feeds a before→now rate
 *  (mistakeLog has no server-side idempotency; unioning it would over-count
 *  cross-device). Read-time-deduped by a reconstructed content signature. */
export interface MistakeLogEnrichment {
  /** Distinct mistakes logged inside the window (cross-device dups collapsed). */
  loggedInWindow: number;
}

/** The ONE cross-device windowed aggregation, read at altitudes. Every array is
 *  honest-or-silent: empty when the window is too thin for a data-backed trend. */
export interface WindowedProgress {
  window: ProgressWindow;
  /** Rolled-up per-subject marks before→now (Me). */
  subjects: RungTrend[];
  /** Per-topic marks before→now (Topic Hub). */
  topics: RungTrend[];
  /** Bank-matched subtopics — resolvable rows only (C&I / chapter-echo silent). */
  concepts: RungTrend[];
  /** CBSE A–E marks before→now. */
  sections: RungTrend[];
  /** Four-type mistake COMPOSITION share (%) before→now (idempotent, fully-graded). */
  mistakeTypes: RungTrend[];
  /** Activity counts within the window. */
  activity: ActivitySummary;
  /** Deduped mistakeLog enrichment — NOT part of any rate. */
  mistakeLog: MistakeLogEnrichment;
}

/** Narrow a subject/topic scope for a windowed read (Topic Hub passes topicKey). */
export interface WindowedProgressScope {
  subject?: SessionSubject;
  topicKey?: string;
}

interface MarkPoint {
  ts: number;
  scored: number;
  available: number;
}

function progressReadUid(uid?: string | null): string | null {
  const resolved = uid ?? getActiveProgressUser();
  return resolved && resolved !== "anonymous" ? resolved : null;
}

function emptyWindowed(window: ProgressWindow): WindowedProgress {
  return {
    window,
    subjects: [],
    topics: [],
    concepts: [],
    sections: [],
    mistakeTypes: [],
    activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
    mistakeLog: { loggedInWindow: 0 },
  };
}

/** Marks % over a set of MarkPoints. null when nothing measurable (marksAvailable≤0). */
function marksPercentOf(points: MarkPoint[]): { pct: number; sample: number } | null {
  let scored = 0;
  let available = 0;
  let sample = 0;
  for (const p of points) {
    const avail = Number(p.available) || 0;
    if (avail <= 0) continue;
    scored += Number(p.scored) || 0;
    available += avail;
    sample += 1;
  }
  if (available <= 0 || sample === 0) return null;
  return { pct: Math.round((scored / available) * 1000) / 10, sample };
}

/** Split MarkPoints at the window midpoint → a marks before→now RungTrend, or null
 *  (SILENT) unless BOTH halves carry ≥ MIN_HALF_SAMPLE measurable points. */
function marksTrend(points: MarkPoint[], mid: number, key: string, label: string): RungTrend | null {
  const before = marksPercentOf(points.filter((p) => p.ts < mid));
  const later = marksPercentOf(points.filter((p) => p.ts >= mid));
  if (!before || !later) return null;
  if (before.sample < MIN_HALF_SAMPLE || later.sample < MIN_HALF_SAMPLE) return null;
  return {
    key,
    label,
    before: before.pct,
    now: later.pct,
    delta: Math.round((later.pct - before.pct) * 10) / 10,
    sampleBefore: before.sample,
    sampleNow: later.sample,
  };
}

function buildSubjectRung(attempts: PracticeAttempt[], mid: number): RungTrend[] {
  const groups = new Map<"maths" | "science", MarkPoint[]>();
  for (const a of attempts) {
    const s = normalizeSubject(a.subject);
    const arr = groups.get(s) ?? [];
    arr.push({ ts: a.timestamp, scored: Number(a.marksScored) || 0, available: Number(a.marksAvailable) || 0 });
    groups.set(s, arr);
  }
  const out: RungTrend[] = [];
  for (const [s, pts] of groups) {
    const t = marksTrend(pts, mid, s, s === "science" ? "Science" : "Maths");
    if (t) out.push(t);
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

function buildTopicRung(attempts: PracticeAttempt[], mid: number): RungTrend[] {
  const groups = new Map<string, { label: string; pts: MarkPoint[] }>();
  for (const a of attempts) {
    const key = String(a.topicKey || "").trim().toLowerCase();
    if (!key) continue;
    const g = groups.get(key) ?? { label: a.topicName || a.topicKey, pts: [] };
    g.pts.push({ ts: a.timestamp, scored: Number(a.marksScored) || 0, available: Number(a.marksAvailable) || 0 });
    groups.set(key, g);
  }
  const out: RungTrend[] = [];
  for (const [key, g] of groups) {
    const t = marksTrend(g.pts, mid, key, g.label);
    if (t) out.push(t);
  }
  return out.sort((a, b) => b.sampleNow + b.sampleBefore - (a.sampleNow + a.sampleBefore));
}

/** Concept (subtopic) + section rungs — bank-matched only. Two non-overlapping
 *  sources (QP/HPQ attempts with a real bank id; worksheet/CT/FM records+payloads).
 *  Synthetic-id attempts and C&I records resolve to nothing → silent by construction. */
function buildConceptSectionRungs(
  attempts: PracticeAttempt[],
  records: SessionRecord[],
  payloads: SessionPerQuestionPayload[],
  mid: number,
  topicFilter?: string,
): { concepts: RungTrend[]; sections: RungTrend[] } {
  const conceptPts = new Map<string, MarkPoint[]>();
  const sectionPts = new Map<string, MarkPoint[]>();

  const add = (c: BankConcept, ts: number, scored: number, available: number): void => {
    if (!(Number(available) > 0)) return;
    // Topic-scoped read (Topic Hub): keep the concept EXACT per question — never let
    // another topic's subtopic (e.g. from a multi-topic worksheet, same subject) leak
    // into a per-topic view.
    if (topicFilter && String(c.topicKey || "").trim().toLowerCase() !== topicFilter) return;
    if (c.subtopic && !isChapterEchoSubtopic(c.subtopic)) {
      const arr = conceptPts.get(c.subtopic) ?? [];
      arr.push({ ts, scored, available });
      conceptPts.set(c.subtopic, arr);
    }
    const sec = normalizeSection(c.section);
    if (sec) {
      const arr = sectionPts.get(sec) ?? [];
      arr.push({ ts, scored, available });
      sectionPts.set(sec, arr);
    }
  };

  // (1) QP/HPQ attempts carry a REAL bank questionId (marks inline). Synthetic
  //     worksheet/CT/FM attempt ids (ws:/ct:/fm:) resolve to null → skipped here,
  //     so there is NO overlap with the record path below.
  for (const a of attempts) {
    const c = conceptForQuestionId(a.questionId);
    if (!c) continue;
    add(c, a.timestamp, Number(a.marksScored) || 0, Number(a.marksAvailable) || 0);
  }

  // (2) worksheet/CT/FM records: paper-order questionIds (bank ids) + payload marks.
  //     C&I records (questionIds:[]) are skipped — concept genuinely unknowable.
  const payloadByRef = new Map<string, SessionPerQuestionPayload>();
  for (const p of payloads) payloadByRef.set(p.ref, p);
  for (const r of records) {
    if (r.surface === "check-improve") continue;
    if (!Array.isArray(r.questionIds) || r.questionIds.length === 0) continue;
    const results = payloadByRef.get(r.perQuestionRef)?.response?.results;
    if (!Array.isArray(results)) continue;
    // Alignment guard (existing re-open doctrine): a dropped/empty id shifts the
    // index → omit the whole record rather than mis-attribute a concept.
    if (results.length !== r.questionIds.length) continue;
    for (const res of results) {
      if (res.couldNotRead) continue;
      const idx = Number(res.qNumber) - 1;
      if (idx < 0 || idx >= r.questionIds.length) continue;
      const c = conceptForQuestionId(r.questionIds[idx]);
      if (!c) continue;
      add(c, r.gradedAt, Number(res.marksAwarded) || 0, Number(res.totalMarks) || 0);
    }
  }

  const concepts: RungTrend[] = [];
  for (const [subtopic, pts] of conceptPts) {
    const t = marksTrend(pts, mid, subtopic, subtopic);
    if (t) concepts.push(t);
  }
  concepts.sort((a, b) => b.sampleNow + b.sampleBefore - (a.sampleNow + a.sampleBefore));

  const sections: RungTrend[] = [];
  for (const [section, pts] of sectionPts) {
    const t = marksTrend(pts, mid, section, `Section ${section}`);
    if (t) sections.push(t);
  }
  sections.sort((a, b) => a.key.localeCompare(b.key));

  return { concepts, sections };
}

/** Four-type mistake COMPOSITION share (%) before→now, from the IDEMPOTENT
 *  sessionRecords.fourType over FULLY-GRADED records ONLY (`status === "graded"`).
 *  Share (typeCount / total typed mistakes) is self-normalizing, so it is immune to
 *  the fabrication a per-question rate would suffer from pending/partial records
 *  (fourType {0,0,0,0} + a full-paper denominator would fake a "mistakes fell" trend
 *  from upload timing) and from objective MCQs (which never carry a mistakeSummary).
 *  SILENT unless BOTH halves carry ≥ MIN_HALF_SAMPLE fully-graded records AND at least
 *  one typed mistake — a half with no mistakes has no composition to show (honest). */
function buildMistakeTypeRung(records: SessionRecord[], mid: number): RungTrend[] {
  const agg = (recs: SessionRecord[]) => {
    const counts: Record<MistakeType, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    let sample = 0;
    for (const r of recs) {
      // Only FULLY-GRADED records: a pending/partial record's mistake data is
      // incomplete (nothing/only-some graded yet) — it counts once fully graded.
      if (r.status !== "graded") continue;
      sample += 1;
      counts.conceptual += Number(r.fourType?.conceptual) || 0;
      counts.calculation += Number(r.fourType?.calculation) || 0;
      counts.silly += Number(r.fourType?.silly) || 0;
      counts.presentation += Number(r.fourType?.presentation) || 0;
    }
    const total = counts.conceptual + counts.calculation + counts.silly + counts.presentation;
    return { counts, total, sample };
  };
  const before = agg(records.filter((r) => r.gradedAt < mid));
  const later = agg(records.filter((r) => r.gradedAt >= mid));
  if (before.sample < MIN_HALF_SAMPLE || later.sample < MIN_HALF_SAMPLE) return [];
  // No typed mistakes in a half → composition is undefined → silent (honest; the
  // "you're making fewer mistakes" story is carried by the marks rungs).
  if (before.total <= 0 || later.total <= 0) return [];

  return MISTAKE_TYPES.map((t) => {
    const b = Math.round((before.counts[t] / before.total) * 1000) / 10;
    const n = Math.round((later.counts[t] / later.total) * 1000) / 10;
    return {
      key: t,
      label: MISTAKE_TYPE_LABELS[t],
      before: b,
      now: n,
      delta: Math.round((n - b) * 10) / 10,
      sampleBefore: before.sample,
      sampleNow: later.sample,
    };
  });
}

/** Distinct mistakes logged inside the window. Parses the mistakeLog ISO-string
 *  timestamp → epoch ms (the normalization point vs the epoch-ms streams) and dedups
 *  by a reconstructed content signature so a cross-device double-log counts once.
 *  ENRICHMENT ONLY — never feeds a before→now rate. */
function dedupMistakeLogCount(mistakes: MistakeLogEntry[], start: number, end: number): number {
  const seen = new Set<string>();
  let count = 0;
  for (const m of mistakes) {
    const ts = Date.parse(m.timestamp); // ISO-8601 → epoch ms
    if (!Number.isFinite(ts) || ts < start || ts > end) continue;
    const c = m.mistakeCounts || { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    const sig = [
      m.questionText || "",
      m.totalMarks ?? "",
      m.marksLost ?? "",
      c.conceptual ?? 0,
      c.calculation ?? 0,
      c.silly ?? 0,
      c.presentation ?? 0,
    ].join("::");
    if (seen.has(sig)) continue;
    seen.add(sig);
    count += 1;
  }
  return count;
}

/**
 * The cross-device, multi-rung windowed progress aggregation. Reads the durable
 * streams honoring `uid` (never the device-local mirrors), splits the window at its
 * midpoint, and returns an honest-or-silent before→now trend at every rung. Signed
 * out / anonymous / no data → an honest empty (all rungs silent), never a fake curve.
 *
 * `nowMs` is a testability seam (defaults to Date.now()) so windowing is deterministic
 * under test — it is NOT a product parameter.
 */
export async function getWindowedProgress(
  uid?: string | null,
  window: ProgressWindow = "month",
  scope?: WindowedProgressScope,
  nowMs?: number,
): Promise<WindowedProgress> {
  const id = progressReadUid(uid);
  if (!id) return emptyWindowed(window);

  const days = WINDOW_DAYS[window];
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const start = now - days * DAY_MS;
  const mid = now - (days / 2) * DAY_MS;

  const [attempts, records, payloads, mistakes] = await Promise.all([
    getAttemptsFromCloud(id, { start }).catch(() => [] as PracticeAttempt[]),
    getSessionRecordsFromCloud(id).catch(() => [] as SessionRecord[]),
    getAllSessionPerQuestionFromCloud(id).catch(() => [] as SessionPerQuestionPayload[]),
    getMistakeLogs(id, days).catch(() => [] as MistakeLogEntry[]),
  ]);

  const subjFilter = scope?.subject;
  const topicFilter = scope?.topicKey ? String(scope.topicKey).trim().toLowerCase() : undefined;

  const winAttempts = attempts.filter(
    (a) =>
      a.timestamp >= start &&
      a.timestamp <= now &&
      (!subjFilter || normalizeSubject(a.subject) === subjFilter) &&
      (!topicFilter || String(a.topicKey || "").trim().toLowerCase() === topicFilter),
  );
  const winRecords = records.filter(
    (r) => r.gradedAt >= start && r.gradedAt <= now && (!subjFilter || r.subject === subjFilter),
  );

  const { concepts, sections } = buildConceptSectionRungs(winAttempts, winRecords, payloads, mid, topicFilter);

  return {
    window,
    subjects: buildSubjectRung(winAttempts, mid),
    topics: buildTopicRung(winAttempts, mid),
    concepts,
    sections,
    mistakeTypes: buildMistakeTypeRung(winRecords, mid),
    activity: {
      worksheets: winRecords.filter((r) => r.surface === "worksheet").length,
      chapterTests: winRecords.filter((r) => r.surface === "chapter-test").length,
      fullMocks: winRecords.filter((r) => r.surface === "full-mock").length,
      practiceAttempts: winAttempts.length,
    },
    mistakeLog: { loggedInWindow: dedupMistakeLogCount(mistakes, start, now) },
  };
}
