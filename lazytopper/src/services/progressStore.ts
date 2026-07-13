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
//   · Topic Hub per-topic before→now + recent points    → getTopicTrendFromCloud()
//
// HONEST-OR-SILENT everywhere: thin data returns null / an empty list, NEVER a
// fabricated line or number (§2 invariants). No writes here — read-only aggregation.
//
// PR-B-v2 (the engine fixes under arc PR-4's UI):
//   • ONE canonical topic vocabulary — every topic compare/group resolves BOTH sides
//     through `resolveCanonicalSlug` (the P0 [FU-TOPICKEY-UNIVERSAL] authority), so
//     write-side slugs, read-side aliasMap spellings and legacy label-keyed attempts
//     land in the same bucket ([FU-PROG-TOPIC-KEY-MISMATCH]).
//   • The UNIFIED graded stream — subject/topic rungs read the attempts stream UNION
//     the per-question marks in sessionRecords payloads (deduped deterministically by
//     the synthetic ws:/ct:/fm: question ids), so CT/FM objective sections and
//     record-only history feed the trend ([FU-PROG-DATA-COMPLETENESS]).
//   • The ACTIVITY-MEDIAN window split (owner-ratified Option B) — a window splits at
//     the median of the student's actual practice, not the calendar midpoint, so a
//     wider window never shows less than a narrower one; `spanDays` carries the honest
//     span for the short-term-trend label ([FU-PROG-WINDOW-MODEL]).

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
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";

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

/** True when a trend's activity span covers less than half its selected window —
 *  the consumer must show the honest "your practice here is recent — this is your
 *  short-term trend" label instead of claiming the full window ([FU-PROG-WINDOW-MODEL]
 *  honesty guard; shared so the Me arc and the Topic Hub phrase it consistently). */
export function isShortSpan(window: ProgressWindow, spanDays: number | null | undefined): boolean {
  return typeof spanDays === "number" && spanDays > 0 && spanDays < WINDOW_DAYS[window] / 2;
}

export interface ProgressTrend {
  /** % marks in the earlier half of the student's in-window activity. */
  before: number;
  /** % marks in the later half. */
  now: number;
  /** now − before (positive = rising). */
  delta: number;
  sampleBefore: number;
  sampleNow: number;
  /** Days between the first and last point actually used (≥1). When this is short
   *  relative to the window (isShortSpan), the consumer labels the trend honestly
   *  as short-term rather than claiming the whole window. */
  spanDays: number;
  window: ProgressWindow;
}

/** ONE canonical topic vocabulary ([FU-PROG-TOPIC-KEY-MISMATCH]): resolve EVERY
 *  spelling — write-side canonical slugs, the Topic Hub's aliasMap vocabulary
 *  (e.g. "reproduction", "heredity-and-evolution"), legacy label-keyed attempts
 *  ("Real Numbers") — through the SAME authority before comparing or grouping.
 *  Memoized: windowed reads resolve thousands of points. */
const topicKeyMemo = new Map<string, string>();
function canonicalKey(raw: string | null | undefined): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  let out = topicKeyMemo.get(input);
  if (out === undefined) {
    out = String(resolveCanonicalSlug(input) || "").trim().toLowerCase();
    topicKeyMemo.set(input, out);
  }
  return out;
}

interface MarkPoint {
  ts: number;
  scored: number;
  available: number;
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

interface SplitTrend {
  before: number;
  now: number;
  delta: number;
  sampleBefore: number;
  sampleNow: number;
  spanDays: number;
}

/**
 * The ACTIVITY-MEDIAN window model ([FU-PROG-WINDOW-MODEL], owner-ratified Option B).
 * Sort the measurable points and split at the median of the student's ACTUAL activity
 * (equal halves by attempt order) — NOT the calendar midpoint, which stranded the
 * older half empty under recent-heavy practice and made a wider window show LESS than
 * a narrower one. With this split a wider window's point-set is a superset of a
 * narrower one's, so wider ≥ narrower always holds. Still honest-or-silent: null
 * unless BOTH halves carry ≥ MIN_HALF_SAMPLE measurable points. `spanDays` reports
 * the real stretch covered so consumers can label an all-recent trend honestly as
 * short-term (never silence-that-looks-broken, never a claimed full-window trend).
 */
function splitTrendOf(points: MarkPoint[]): SplitTrend | null {
  const usable = points
    .filter((p) => (Number(p.available) || 0) > 0)
    .sort((a, b) => a.ts - b.ts);
  if (usable.length < MIN_HALF_SAMPLE * 2) return null;
  const half = Math.floor(usable.length / 2);
  const before = marksPercentOf(usable.slice(0, half));
  const later = marksPercentOf(usable.slice(half));
  if (!before || !later) return null;
  const spanDays = Math.max(1, Math.ceil((usable[usable.length - 1].ts - usable[0].ts) / DAY_MS));
  return {
    before: before.pct,
    now: later.pct,
    delta: Math.round((later.pct - before.pct) * 10) / 10,
    sampleBefore: before.sample,
    sampleNow: later.sample,
    spanDays,
  };
}

/**
 * Device-local fast-path trend over the sync attempts stream (quick-glance chips).
 * Splits at the activity median (see splitTrendOf). `filter` narrows to a subject or
 * a topic; omit for all. NOTE: cross-device truth lives in the ASYNC cloud reads
 * (getWindowedProgress / getTopicTrendFromCloud) — this sync path is a same-device
 * quick glance, never the authoritative number beside them.
 */
function computeTrend(
  window: ProgressWindow,
  filter: (a: PracticeAttempt) => boolean,
  uid?: string | null,
): ProgressTrend | null {
  void uid; // attempts are the active-user stream (device-local); the cloud reads honor uid
  const days = WINDOW_DAYS[window];
  const now = Date.now();
  const start = now - days * DAY_MS;

  const inWindow = getAttempts({ start }).filter(filter);
  const t = splitTrendOf(
    inWindow.map((a) => ({
      ts: a.timestamp,
      scored: Number(a.marksScored) || 0,
      available: Number(a.marksAvailable) || 0,
    })),
  );
  return t ? { ...t, window } : null;
}

function normalizeSubject(subject: string): "maths" | "science" {
  return /sci/i.test(String(subject || "")) ? "science" : "maths";
}

/** Per-subject marks before→now for quick-glance chips (SurfaceHistory). Honest-or-
 *  silent. Device-local sync fast-path — the Me arc's async getWindowedProgress is
 *  the cross-device source of truth beside it. */
export function getSubjectProgress(
  subject: "maths" | "science",
  window: ProgressWindow = "month",
  uid?: string | null,
): ProgressTrend | null {
  return computeTrend(window, (a) => normalizeSubject(a.subject) === subject, uid);
}

/** This topic's before→now marks trend (topic altitude, D-PROG-5). Both sides of the
 *  match resolve through the ONE canonical vocabulary, so any spelling finds the
 *  attempts ([FU-PROG-TOPIC-KEY-MISMATCH]). Device-local sync fast-path — the Topic
 *  Hub consumes the cross-device getTopicTrendFromCloud instead. */
export function getTopicProgress(
  topicKey: string,
  window: ProgressWindow = "4mo",
  uid?: string | null,
): ProgressTrend | null {
  const key = canonicalKey(topicKey);
  if (!key) return null;
  return computeTrend(window, (a) => canonicalKey(a.topicKey || a.topicName) === key, uid);
}

// ════════════════════════════════════════════════════════════════════════════
// PR-B — CROSS-DEVICE, MULTI-RUNG windowed aggregation (the progress-memory layer)
// ────────────────────────────────────────────────────────────────────────────
// `getWindowedProgress` is the ONE async, CROSS-DEVICE read the Me/Progress redesign
// (arc PR-4) + scorecards consume. It reads the DURABLE streams — honoring `uid`:
//   • getAttemptsFromCloud   — per-question marks (every graded surface + QP/HPQ)
//   • getSessionRecordsFromCloud + getAllSessionPerQuestionFromCloud — per-session
//     four-type (idempotent) + the per-question marks join
//   • getMistakeLogs         — DEDUPED ENRICHMENT ONLY (never a before→now rate)
// and derives a before→now trend at every rung. HONEST-OR-SILENT PER RUNG: a
// rung/row appears only when BOTH halves of its activity-median split carry
// ≥ MIN_HALF_SAMPLE measurable points; otherwise it is omitted — an honest empty,
// never a fabricated line. No writes — read-only aggregation.
//
// SOURCE-OF-TRUTH per rung (re-verified against the write paths, PR-B-v2 2026-07-13):
//   • subject / topic  → the UNIFIED graded stream: practiceInsights attempts UNION
//     the sessionRecords per-question payload marks, deduped by the deterministic
//     synthetic question ids (ws:/ct:/fm:{worksheetId}:q{n}) the grade services fan
//     through recordAttempt. The union exists because attempts alone are NOT complete:
//     CT/FM fan only their SUBJECTIVE results (the objective Section-A marks never
//     become attempts), and history predating the durable attempts subcollection
//     (#403) exists only in records. C&I records (questionIds:[]) are skipped — its
//     per-question attempts already cover it, so the dual write can never double-count
//     by construction ([FU-PROG-DATA-COMPLETENESS]).
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
  /** Days between the first and last point this rung actually used (≥1) — the honest
   *  span for the short-term-trend label (see isShortSpan). */
  spanDays: number;
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
  /** Days between the first and last measurable graded point in the window (null when
   *  fewer than 2 points). When short relative to the window (isShortSpan), the arc
   *  labels the trends honestly as short-term ([FU-PROG-WINDOW-MODEL] honesty guard). */
  activitySpanDays: number | null;
  /** Deduped mistakeLog enrichment — NOT part of any rate. */
  mistakeLog: MistakeLogEnrichment;
}

/** Narrow a subject/topic scope for a windowed read (Topic Hub passes topicKey). */
export interface WindowedProgressScope {
  subject?: SessionSubject;
  topicKey?: string;
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
    activitySpanDays: null,
    mistakeLog: { loggedInWindow: 0 },
  };
}

/** Split MarkPoints at the activity median → a marks before→now RungTrend, or null
 *  (SILENT) unless BOTH halves carry ≥ MIN_HALF_SAMPLE measurable points. */
function marksTrend(points: MarkPoint[], key: string, label: string): RungTrend | null {
  const t = splitTrendOf(points);
  return t ? { key, label, ...t } : null;
}

// ── The unified graded-attempt stream ([FU-PROG-DATA-COMPLETENESS]) ──────────

/** One graded question, whatever surface produced it — the shape the subject/topic
 *  rungs aggregate. `topicKey` is canonical ("" when genuinely unresolvable: the
 *  point then feeds the subject rung and stays honestly silent on the topic rung). */
interface GradedPoint {
  ts: number;
  scored: number;
  available: number;
  subject: "maths" | "science";
  topicKey: string;
  topicLabel?: string;
}

/** The synthetic per-question id prefix each session surface fans through
 *  recordAttempt (worksheetQuestionId / chapterTestQuestionId / fullMockQuestionId).
 *  check-improve is DELIBERATELY absent: its per-question work is already in the
 *  attempts stream and its record carries questionIds:[] — skipping it here is what
 *  makes the C&I dual write count exactly once. */
const SURFACE_QID_PREFIX: Partial<Record<SessionSurface, string>> = {
  worksheet: "ws",
  "chapter-test": "ct",
  "full-mock": "fm",
};

/**
 * Union the attempts stream with the per-question marks stored in sessionRecords
 * payloads, deduped DETERMINISTICALLY: a record-derived question is added only when
 * its synthetic id (`ws:/ct:/fm:{worksheetId}:q{n}` — the exact id the grade service
 * fanned through recordAttempt) is NOT already among the attempt questionIds. This
 * closes the two verified attempt-stream gaps (CT/FM objective sections; record-only
 * history predating the durable attempts subcollection) without ever counting a
 * question twice. Alignment guard kept from the concept path: a payload whose results
 * don't line up with the record's questionIds is omitted whole (no mis-attribution).
 */
function buildUnifiedGradedPoints(
  attempts: PracticeAttempt[],
  records: SessionRecord[],
  payloads: SessionPerQuestionPayload[],
  topicFilter?: string,
): GradedPoint[] {
  const points: GradedPoint[] = [];

  // (1) Attempts — QP/HPQ (real bank ids), C&I, and the sessions' fanned questions.
  //     The dedup set collects EVERY attempt qid (even topic-filtered-out ones) so a
  //     record can never re-add a question the attempts stream already carries.
  const attemptQids = new Set<string>();
  for (const a of attempts) {
    const qid = String(a.questionId || "").trim();
    if (qid) attemptQids.add(qid);
    const topicKey = canonicalKey(a.topicKey || a.topicName);
    if (topicFilter && topicKey !== topicFilter) continue;
    points.push({
      ts: a.timestamp,
      scored: Number(a.marksScored) || 0,
      available: Number(a.marksAvailable) || 0,
      subject: normalizeSubject(a.subject),
      topicKey,
      topicLabel: a.topicName || a.topicKey,
    });
  }

  // (2) worksheet/CT/FM records: whatever the attempts stream is missing.
  const payloadByRef = new Map<string, SessionPerQuestionPayload>();
  for (const p of payloads) payloadByRef.set(p.ref, p);
  for (const r of records) {
    const prefix = SURFACE_QID_PREFIX[r.surface];
    if (!prefix) continue; // check-improve — covered by its attempts (no double-count)
    if (!Array.isArray(r.questionIds) || r.questionIds.length === 0) continue;
    const results = payloadByRef.get(r.perQuestionRef)?.response?.results;
    if (!Array.isArray(results)) continue;
    if (results.length !== r.questionIds.length) continue;
    // Per-question bank topic wins (FM papers span topics); a single-topic record's
    // own key is the fallback; otherwise "" → subject-rung-only (honest).
    const recordTopic =
      Array.isArray(r.topicKeys) && r.topicKeys.length === 1 ? canonicalKey(r.topicKeys[0]) : "";
    for (const res of results) {
      if (res.couldNotRead) continue;
      const available = Number(res.totalMarks) || 0;
      if (available <= 0) continue;
      const idx = Number(res.qNumber) - 1;
      if (idx < 0 || idx >= r.questionIds.length) continue;
      if (attemptQids.has(`${prefix}:${r.worksheetId}:q${res.qNumber}`)) continue;
      const bank = conceptForQuestionId(r.questionIds[idx]);
      const topicKey = bank?.topicKey ? canonicalKey(bank.topicKey) : recordTopic;
      if (topicFilter && topicKey !== topicFilter) continue;
      points.push({
        ts: r.gradedAt,
        scored: Number(res.marksAwarded) || 0,
        available,
        subject: r.subject === "science" ? "science" : "maths",
        topicKey,
      });
    }
  }

  return points;
}

function buildSubjectRung(points: GradedPoint[]): RungTrend[] {
  const groups = new Map<"maths" | "science", MarkPoint[]>();
  for (const p of points) {
    const arr = groups.get(p.subject) ?? [];
    arr.push({ ts: p.ts, scored: p.scored, available: p.available });
    groups.set(p.subject, arr);
  }
  const out: RungTrend[] = [];
  for (const [s, pts] of groups) {
    const t = marksTrend(pts, s, s === "science" ? "Science" : "Maths");
    if (t) out.push(t);
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

function buildTopicRung(points: GradedPoint[]): RungTrend[] {
  const groups = new Map<string, { label: string; pts: MarkPoint[] }>();
  for (const p of points) {
    if (!p.topicKey) continue; // unresolvable topic → subject rung only (honest)
    const g = groups.get(p.topicKey) ?? { label: "", pts: [] };
    if (!g.label && p.topicLabel) g.label = p.topicLabel;
    g.pts.push({ ts: p.ts, scored: p.scored, available: p.available });
    groups.set(p.topicKey, g);
  }
  const out: RungTrend[] = [];
  for (const [key, g] of groups) {
    const t = marksTrend(g.pts, key, g.label || key);
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
  topicFilter?: string,
): { concepts: RungTrend[]; sections: RungTrend[] } {
  const conceptPts = new Map<string, MarkPoint[]>();
  const sectionPts = new Map<string, MarkPoint[]>();

  const add = (c: BankConcept, ts: number, scored: number, available: number): void => {
    if (!(Number(available) > 0)) return;
    // Topic-scoped read (Topic Hub): keep the concept EXACT per question — never let
    // another topic's subtopic (e.g. from a multi-topic worksheet, same subject) leak
    // into a per-topic view. Canonical compare on BOTH sides (one vocabulary).
    if (topicFilter && canonicalKey(c.topicKey) !== topicFilter) return;
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
    const t = marksTrend(pts, subtopic, subtopic);
    if (t) concepts.push(t);
  }
  concepts.sort((a, b) => b.sampleNow + b.sampleBefore - (a.sampleNow + a.sampleBefore));

  const sections: RungTrend[] = [];
  for (const [section, pts] of sectionPts) {
    const t = marksTrend(pts, section, `Section ${section}`);
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
 *  Splits at the activity median of the graded records (the same Option-B model as
 *  the marks rungs). SILENT unless BOTH halves carry ≥ MIN_HALF_SAMPLE fully-graded
 *  records AND at least one typed mistake — a half with no mistakes has no
 *  composition to show (honest). */
function buildMistakeTypeRung(records: SessionRecord[]): RungTrend[] {
  // Only FULLY-GRADED records: a pending/partial record's mistake data is
  // incomplete (nothing/only-some graded yet) — it counts once fully graded.
  const graded = records
    .filter((r) => r.status === "graded")
    .sort((a, b) => a.gradedAt - b.gradedAt);
  if (graded.length < MIN_HALF_SAMPLE * 2) return [];
  const half = Math.floor(graded.length / 2);

  const agg = (recs: SessionRecord[]) => {
    const counts: Record<MistakeType, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    for (const r of recs) {
      counts.conceptual += Number(r.fourType?.conceptual) || 0;
      counts.calculation += Number(r.fourType?.calculation) || 0;
      counts.silly += Number(r.fourType?.silly) || 0;
      counts.presentation += Number(r.fourType?.presentation) || 0;
    }
    const total = counts.conceptual + counts.calculation + counts.silly + counts.presentation;
    return { counts, total };
  };
  const before = agg(graded.slice(0, half));
  const later = agg(graded.slice(half));
  // No typed mistakes in a half → composition is undefined → silent (honest; the
  // "you're making fewer mistakes" story is carried by the marks rungs).
  if (before.total <= 0 || later.total <= 0) return [];
  const spanDays = Math.max(1, Math.ceil((graded[graded.length - 1].gradedAt - graded[0].gradedAt) / DAY_MS));

  return MISTAKE_TYPES.map((t) => {
    const b = Math.round((before.counts[t] / before.total) * 1000) / 10;
    const n = Math.round((later.counts[t] / later.total) * 1000) / 10;
    return {
      key: t,
      label: MISTAKE_TYPE_LABELS[t],
      before: b,
      now: n,
      delta: Math.round((n - b) * 10) / 10,
      sampleBefore: half,
      sampleNow: graded.length - half,
      spanDays,
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

/** Span (whole days, ≥1) between the first and last MEASURABLE point; null under 2
 *  points. Powers the arc's honest short-term-trend label (see isShortSpan). */
function activitySpanOf(points: GradedPoint[]): number | null {
  let min = Infinity;
  let max = -Infinity;
  let n = 0;
  for (const p of points) {
    if (!(p.available > 0)) continue;
    n += 1;
    if (p.ts < min) min = p.ts;
    if (p.ts > max) max = p.ts;
  }
  if (n < 2) return null;
  return Math.max(1, Math.ceil((max - min) / DAY_MS));
}

/**
 * The cross-device, multi-rung windowed progress aggregation. Reads the durable
 * streams honoring `uid` (never the device-local mirrors), splits each rung at the
 * median of the student's actual activity, and returns an honest-or-silent before→now
 * trend at every rung. Signed out / anonymous / no data → an honest empty (all rungs
 * silent), never a fake curve.
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

  const [attempts, records, payloads, mistakes] = await Promise.all([
    getAttemptsFromCloud(id, { start }).catch(() => [] as PracticeAttempt[]),
    getSessionRecordsFromCloud(id).catch(() => [] as SessionRecord[]),
    getAllSessionPerQuestionFromCloud(id).catch(() => [] as SessionPerQuestionPayload[]),
    getMistakeLogs(id, days).catch(() => [] as MistakeLogEntry[]),
  ]);

  const subjFilter = scope?.subject;
  const topicFilter = scope?.topicKey ? canonicalKey(scope.topicKey) : undefined;

  const winAttempts = attempts.filter(
    (a) =>
      a.timestamp >= start &&
      a.timestamp <= now &&
      (!subjFilter || normalizeSubject(a.subject) === subjFilter) &&
      (!topicFilter || canonicalKey(a.topicKey || a.topicName) === topicFilter),
  );
  const winRecords = records.filter(
    (r) => r.gradedAt >= start && r.gradedAt <= now && (!subjFilter || r.subject === subjFilter),
  );

  const unified = buildUnifiedGradedPoints(winAttempts, winRecords, payloads, topicFilter);
  const { concepts, sections } = buildConceptSectionRungs(winAttempts, winRecords, payloads, topicFilter);

  return {
    window,
    subjects: buildSubjectRung(unified),
    topics: buildTopicRung(unified),
    concepts,
    sections,
    mistakeTypes: buildMistakeTypeRung(winRecords),
    activity: {
      worksheets: winRecords.filter((r) => r.surface === "worksheet").length,
      chapterTests: winRecords.filter((r) => r.surface === "chapter-test").length,
      fullMocks: winRecords.filter((r) => r.surface === "full-mock").length,
      practiceAttempts: winAttempts.length,
    },
    activitySpanDays: activitySpanOf(unified),
    mistakeLog: { loggedInWindow: dedupMistakeLogCount(mistakes, start, now) },
  };
}

// ── The Topic Hub's cross-device per-topic read ([FU-PROG-TOPIC-KEY-MISMATCH] +
//    the Finding-D running-accuracy points) ──────────────────────────────────

/** One recent graded answer on the topic — a REAL score (marks %), never a fitted
 *  line. The Topic Hub renders these as the running-accuracy micro-trend. */
export interface TopicTrendPoint {
  ts: number;
  pct: number;
}

export interface TopicCloudTrend {
  window: ProgressWindow;
  /** Before→now over the unified stream, or null (honest-or-silent). */
  trend: ProgressTrend | null;
  /** The most recent graded answers on this topic (oldest→newest, capped) — shows
   *  real movement from as few as 2 points while the delta needs 6. */
  points: TopicTrendPoint[];
}

/** How many recent per-question points the sparkline read returns. */
const TOPIC_SPARK_CAP = 12;

/**
 * The Topic Hub's cross-device per-topic trend: the before→now delta AND the recent
 * per-question points, both over the UNIFIED graded stream (all four surfaces),
 * matched through the ONE canonical vocabulary. Replaces the device-local sync read
 * the hub consumed before PR-B-v2 (which violated the cross-device invariant).
 */
export async function getTopicTrendFromCloud(
  topicKey: string,
  window: ProgressWindow = "4mo",
  uid?: string | null,
  nowMs?: number,
): Promise<TopicCloudTrend> {
  const key = canonicalKey(topicKey);
  const id = progressReadUid(uid);
  if (!id || !key) return { window, trend: null, points: [] };

  const days = WINDOW_DAYS[window];
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const start = now - days * DAY_MS;

  const [attempts, records, payloads] = await Promise.all([
    getAttemptsFromCloud(id, { start }).catch(() => [] as PracticeAttempt[]),
    getSessionRecordsFromCloud(id).catch(() => [] as SessionRecord[]),
    getAllSessionPerQuestionFromCloud(id).catch(() => [] as SessionPerQuestionPayload[]),
  ]);

  const winAttempts = attempts.filter(
    (a) => a.timestamp >= start && a.timestamp <= now && canonicalKey(a.topicKey || a.topicName) === key,
  );
  const winRecords = records.filter((r) => r.gradedAt >= start && r.gradedAt <= now);

  const unified = buildUnifiedGradedPoints(winAttempts, winRecords, payloads, key);
  const t = splitTrendOf(unified);

  const measurable = unified
    .filter((p) => p.available > 0)
    .sort((a, b) => a.ts - b.ts)
    .slice(-TOPIC_SPARK_CAP);
  const points = measurable.map((p) => ({
    ts: p.ts,
    pct: Math.round(Math.max(0, Math.min(1, p.scored / p.available)) * 1000) / 10,
  }));

  return { window, trend: t ? { ...t, window } : null, points };
}
