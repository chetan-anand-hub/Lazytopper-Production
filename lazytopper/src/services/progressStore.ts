// src/services/progressStore.ts
//
// Progress-Journey PR-1 — the ONE aggregation service. Every progress surface reads
// its slice HERE, at the right altitude, and NEVER recomputes per page (LOCKED
// contract Decision #5 + §2 interconnection map). It reads THREE stores — the
// `sessionRecords` store, the `practiceInsights` attempts stream, and the
// `mistakeLog` — and hands each surface exactly what it needs:
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
// LOCKED §1a as amended (owner-ratified 2026-07-15): Quick Practice contributes to
// progress/MI ONLY via the recordAttempt stream — exactly as originally ratified. It
// ALSO writes a NON-COUNTING session record (seen-set / history / tutor anchor), which
// `PROGRESS_COUNTING_SURFACES` excludes from every rung at the aggregation boundary.
// Counting a QP record would DOUBLE its marks and mistakes; the counting rule is
// unchanged, and now enforced structurally rather than by QP writing nothing.
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
// BANK-LEAN-1 (C4): the pure shape + predicates come from the bank-free module. The
// bank-backed `conceptForQuestionId` is NOT imported statically — it is loaded with
// `await import("./progressBankIndex")` inside the two async reads below (see
// `loadBankLookup`), so a page that only renders a trend (Topic Hub) no longer ships
// the question bank on first load. Every number is unchanged: the same function runs.
import { isChapterEchoSubtopic, normalizeSection, type BankConcept } from "./progressBankShape";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import { isBoardChapterKey } from "../config/syllabus2026-27";
import { MISTAKE_TYPE_LABEL, isGradedQuestion, isLossOnlyNotAttempted } from "../lib/mistakeDisplay";

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
 *  links OUT to its surface history.
 *  Quick Practice rows DO appear here (owner-ratified 2026-07-15): a student should see
 *  their practice in recent activity. This is a DISPLAY read, not a counting stream —
 *  no marks or mistakes are aggregated from it — so it sits outside the
 *  PROGRESS_COUNTING_SURFACES boundary by design, not by omission. */
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
  /** ME-ENGINE-1 PR-1 — answers CHECKED by the grader in the window: attempts with
   *  `mode: "graded"` (one per submission). Unlike `practiceAttempts` it excludes the QP
   *  MCQ-click (`mode: "mcq"`) and binary rows. The sidebar MI widget's "checked answers"
   *  (SCORECARD-MI-1 H3) is exactly this rule. Optional: the device-local summary leaves it out. */
  gradedAnswers?: number;
  /** Raw graded-attempt count — the honest per-question figure the Me PR can phrase,
   *  never a fabricated set count.
   *  §1a as amended: QP now DOES write a (non-counting) record, so a practice-SET count
   *  became derivable — but it is deliberately NOT derived here. Adding one is a Me
   *  surface change, not plumbing; it would also silently change a live number. If a
   *  future PR wants it, count `surface === "quick-practice"` records into a NEW field
   *  and leave `practiceAttempts` alone — the two are different units (questions vs
   *  sets) and must never be conflated. */
  practiceAttempts: number;
}

/** Activity-level counts for the recent strip ("3 worksheets · 1 chapter test …" —
 *  Decision #3). Session counts come from durable records; practice is attempt-level
 *  (honest — see ActivitySummary.practiceAttempts). Windowed by `sinceDays`.
 *  The per-surface if/else-if has no `else`: a quick-practice record is ignored here
 *  by construction, so this summary's numbers are unchanged by §1a's amendment. */
export function getActivitySummary(uid?: string | null, sinceDays?: number): ActivitySummary {
  const cutoff = sinceDays ? Date.now() - sinceDays * DAY_MS : 0;
  // ME-ENGINE-1 PR-1 (G10) — a test is TAKEN once it is graded: a pending-upload or partial
  // record is a test still waiting for its answer sheet, never a completed one.
  const records = loadLocalSessionRecords(uid).filter((r) => r.gradedAt >= cutoff && isTestTaken(r));
  const summary: ActivitySummary = { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 };
  for (const r of records) {
    if (r.surface === "worksheet") summary.worksheets += 1;
    else if (r.surface === "chapter-test") summary.chapterTests += 1;
    else if (r.surface === "full-mock") summary.fullMocks += 1;
  }
  summary.practiceAttempts = getAttempts(cutoff ? { start: cutoff } : {}).length;
  return summary;
}

/**
 * ME-ENGINE-1 PR-1 (G10) — the ONE rule for "a test was taken": its record is fully graded.
 * `pending-upload` (submitted, no answer sheet yet) and `partial` (only some of it graded) are
 * tests still in progress — counting them inflated "tests taken" with work that has no result.
 */
export function isTestTaken(r: Pick<SessionRecord, "status">): boolean {
  return r.status === "graded";
}

// ── Home ungraded nudge (§3c) ────────────────────────────────────────────────

/** Sessions still awaiting an answer sheet (status ≠ graded) — powers the soft,
 *  dismissible Home nudge. Honest end-to-end: pending-upload never a fake 0.
 *  A quick-practice record can never appear here: QP has no upload cycle, so it always
 *  writes `status: "graded"` (see SessionStatus). That is why this status-only filter
 *  needs no surface guard — nudging a student to upload a sheet for a session with
 *  nothing to upload would be a lie. */
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
/** Exported for SCORECARD-MI-1 (GA-19): Me reads the mistake log for the SAME window. */
export const WINDOW_DAYS: Record<ProgressWindow, number> = { week: 7, "2wk": 14, month: 30, "4mo": 120 };

/**
 * ME-ENGINE-1 PR-1 (G3 "today") — every window the shared read model serves. `today` is the
 * CALENDAR DAY IN IST (Asia/Kolkata, UTC+05:30, no daylight saving): it starts at the last IST
 * midnight, not 24 hours ago, and so is never a rolling window. The four rolling windows are
 * unchanged. `ProgressWindow` itself is NOT widened: the Topic Hub and Me's chips key records on
 * it, and a `today` they cannot render must not appear in their types.
 */
export type ReadWindow = "today" | ProgressWindow;
/** Days each window spans — `today` counts as ONE day for span labels only (see windowRange). */
export const READ_WINDOW_DAYS: Record<ReadWindow, number> = { today: 1, ...WINDOW_DAYS };

/** IST is a fixed UTC+05:30 — India observes no daylight saving. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The epoch ms of the IST midnight that starts the IST calendar day containing `ms`. */
export function istDayStartMs(ms: number): number {
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/** The [start, end] epoch-ms range a window covers at `nowMs` (end = now, inclusive). */
export function windowRange(window: ReadWindow, nowMs: number): { start: number; end: number } {
  if (window === "today") return { start: istDayStartMs(nowMs), end: nowMs };
  return { start: nowMs - WINDOW_DAYS[window] * DAY_MS, end: nowMs };
}

/** True when a trend's activity span covers less than half its selected window —
 *  the consumer must show the honest "your practice here is recent — this is your
 *  short-term trend" label instead of claiming the full window ([FU-PROG-WINDOW-MODEL]
 *  honesty guard; shared so the Me arc and the Topic Hub phrase it consistently). */
export function isShortSpan(window: ReadWindow, spanDays: number | null | undefined): boolean {
  return typeof spanDays === "number" && spanDays > 0 && spanDays < READ_WINDOW_DAYS[window] / 2;
}

export interface ProgressTrend {
  /** % marks in the earlier half of the student's in-window activity. */
  before: number;
  /** % marks in the later half. */
  now: number;
  /** now − before (positive = rising). */
  delta: number;
  /** POINT counts — how many measurable questions fell in each half. NOT marks: a
   *  single 5-mark question is ONE point. See marksScored/marksAvailable below. */
  sampleBefore: number;
  sampleNow: number;
  /** Days between the first and last point actually used (≥1). When this is short
   *  relative to the window (isShortSpan), the consumer labels the trend honestly
   *  as short-term rather than claiming the whole window. */
  spanDays: number;
  /** RAW MARKS across the whole measurable window (both halves) — the denomination
   *  the Me/Progress page speaks in ("N marks on the table", "51 secured"). Always
   *  present: every ProgressTrend is produced by spreading a SplitTrend. */
  marksScored: number;
  marksAvailable: number;
  /** The same marks split at the activity median, mirroring sampleBefore/sampleNow.
   *  before + now === the whole-window totals above, by construction. */
  marksScoredBefore: number;
  marksAvailableBefore: number;
  marksScoredNow: number;
  marksAvailableNow: number;
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
    const slug = String(resolveCanonicalSlug(input) || "").trim().toLowerCase();
    // ME-ENGINE-1 PR-1 — the topic key set IS the 26 board chapters of 2026-27
    // (config/syllabus2026-27). Anything else ("" or a non-board slug) is no chapter: its
    // marks stay on the subject rung and it is honestly silent on every chapter view.
    out = isBoardChapterKey(slug) ? slug : "";
    topicKeyMemo.set(input, out);
  }
  return out;
}

/**
 * ME-ENGINE-1 PR-1 — THE ONE topic canonicaliser every progress / Mistake Intelligence reader
 * uses (Me/Progress, the Topic Hub trend, and next the sidebar MI widget and — PR-2 — the Tutor brief).
 * Any spelling (slug, label, legacy alias, URL param, stored MI `topic` label) resolves through
 * `resolveCanonicalSlug` and is kept ONLY if it is one of the 26 board chapter keys
 * (`BOARD_CHAPTER_KEYS`); otherwise "". A reader that groups by any other function
 * (`normalizeTopicKey`, `resolveCanonicalTopicKey`) lands in a different vocabulary
 * ("reproduction", "heredity-and-evolution") and silently misses — the G3 consistency pin
 * catches exactly that.
 */
export function boardChapterKey(raw: string | null | undefined): string {
  return canonicalKey(raw);
}

interface MarkPoint {
  ts: number;
  scored: number;
  available: number;
  /** SCORECARD-MI-1 PR-2 (H11) — marks on this point lost ONLY to work not attempted. */
  notAttempted?: number;
}

/** Marks % over a set of MarkPoints. null when nothing measurable (marksAvailable≤0).
 *  Returns the two RAW marks totals alongside the percentage — `scored` and
 *  `available` are the numbers the percentage is a ratio OF, and the Me/Progress
 *  page is denominated in marks, not percentages ("N marks on the table",
 *  "51 secured", "7 of 12 lost"). They were already computed here and discarded.
 *  ⚠ `sample` is a POINT COUNT (how many measurable questions), NEVER marks — the
 *  two are different units and conflating them is what the control test pins. */
function marksPercentOf(
  points: MarkPoint[],
): { pct: number; sample: number; scored: number; available: number; notAttempted: number } | null {
  let scored = 0;
  let available = 0;
  let sample = 0;
  let notAttempted = 0;
  for (const p of points) {
    const avail = Number(p.available) || 0;
    if (avail <= 0) continue;
    scored += Number(p.scored) || 0;
    available += avail;
    notAttempted += Number(p.notAttempted) || 0;
    sample += 1;
  }
  if (available <= 0 || sample === 0) return null;
  return { pct: Math.round((scored / available) * 1000) / 10, sample, scored, available, notAttempted };
}

interface SplitTrend {
  before: number;
  now: number;
  delta: number;
  sampleBefore: number;
  sampleNow: number;
  spanDays: number;
  marksScored: number;
  marksAvailable: number;
  marksScoredBefore: number;
  marksAvailableBefore: number;
  marksScoredNow: number;
  marksAvailableNow: number;
  /** SCORECARD-MI-1 PR-2 (H11) — present only when > 0: see RungTrend.marksNotAttempted. */
  marksNotAttempted?: number;
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
    // Raw marks, carried alongside the percentages (never replacing them). The
    // whole-window totals are the sum of the two halves BY CONSTRUCTION: `usable`
    // is filtered to available>0 and then split with no remainder, so
    // before ∪ now IS the measurable set. Summing here rather than making the
    // consumer add four numbers is deliberate — the hero bar is where an
    // off-by-one-half would ship as a wrong mark total.
    marksScored: before.scored + later.scored,
    marksAvailable: before.available + later.available,
    marksScoredBefore: before.scored,
    marksAvailableBefore: before.available,
    marksScoredNow: later.scored,
    marksAvailableNow: later.available,
    // H11 — marks lost ONLY to work not attempted (attempts carrying `notAttempted`, and
    // record questions the same predicate marks so). Additive: absent when there are none.
    ...(before.notAttempted + later.notAttempted > 0
      ? { marksNotAttempted: Math.round((before.notAttempted + later.notAttempted) * 100) / 100 }
      : {}),
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
/** ONE name per stored type — lib/mistakeDisplay (SCORECARD-MI-1). */
const MISTAKE_TYPE_LABELS: Readonly<Record<MistakeType, string>> = MISTAKE_TYPE_LABEL;

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
  /** POINT counts — measurable questions per half. NOT marks (one 5-mark question
   *  is ONE point); the marks live in marksScored/marksAvailable below. */
  sampleBefore: number;
  sampleNow: number;
  /** Days between the first and last point this rung actually used (≥1) — the honest
   *  span for the short-term-trend label (see isShortSpan). */
  spanDays: number;
  /** RAW MARKS across the whole measurable window for this rung — what the
   *  Me/Progress page renders ("7 of 12 lost", the 80-mark bar). Percentages stay
   *  in before/now; these do not replace them.
   *
   *  ⚠ OPTIONAL, AND THE ABSENCE IS MEANINGFUL — not an oversight. The marks rungs
   *  (subject / topic / concept / section) always carry them. The mistake-type rung
   *  does NOT: it is a COMPOSITION SHARE (%) of typed mistakes, not a score, so it
   *  has no marks denominator at all. A consumer must render these only when
   *  present and must NEVER coerce absence to 0 — "0 of 0 marks" on the mistake-type
   *  rung would be an invented figure, which is exactly the fabrication the
   *  honest-or-silent rule forbids. */
  marksScored?: number;
  marksAvailable?: number;
  /** The same marks split at the activity median (marks rungs only, see above). */
  marksScoredBefore?: number;
  marksAvailableBefore?: number;
  marksScoredNow?: number;
  marksAvailableNow?: number;
  /** SCORECARD-MI-1 PR-2 (H11) — marks rungs only, ADDITIVE OPTIONAL: of the marks LOST in the
   *  window, those lost ONLY to work not attempted (the same predicate the MI front door uses, so
   *  these questions have no MI entry and are never counted twice). Lets Me show them as "Not
   *  attempted" instead of "no reason recorded". Absent = none recorded (every pre-PR-2 attempt). */
  marksNotAttempted?: number;
}

/** Deduped mistakeLog readout — ENRICHMENT ONLY. Never feeds a before→now rate
 *  (mistakeLog has no server-side idempotency; unioning it would over-count
 *  cross-device). Read-time-deduped by a reconstructed content signature. */
export interface MistakeLogEnrichment {
  /** Distinct mistakes logged inside the window (cross-device dups collapsed). */
  loggedInWindow: number;
}

/**
 * ME-ENGINE-1 PR-1 (G4) — the UNGATED window total: every measurable graded answer in the
 * window, summed, with its count. It sits BESIDE the gated trend, never instead of it:
 * a trend (before→now) still needs ≥ MIN_HALF_SAMPLE points per half, but a total is a plain
 * sum and is honest at any n — so it always carries `answers` (n) for the reader to print.
 * When the gated subject rung exists, its marksScored/marksAvailable equal this total for the
 * same scope BY CONSTRUCTION (the split sums both halves of the same point set).
 */
export interface WindowTotal {
  marksScored: number;
  marksAvailable: number;
  /** available − scored (≥ 0), rounded to 0.1. */
  marksLost: number;
  /** Of `marksLost`, marks lost ONLY to work not attempted (H11) — 0 when none recorded. */
  marksNotAttempted: number;
  /** n — measurable graded answers (POINTS, not marks) the total is over. */
  answers: number;
}

/** The ONE cross-device windowed aggregation, read at altitudes. Every array is
 *  honest-or-silent: empty when the window is too thin for a data-backed trend. */
export interface WindowedProgress {
  window: ReadWindow;
  /** ME-ENGINE-1 PR-1 (G4) — the ungated total for the read's scope (subject / topic), or
   *  null when the window holds no measurable graded answer. */
  totals: WindowTotal | null;
  /** The same ungated totals per subject (the unscoped read fills both papers). */
  subjectTotals: Partial<Record<"maths" | "science", WindowTotal>>;
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

/** The honest empty read (signed out, no data, or a chapter outside the 26). */
export function emptyWindowed(window: ReadWindow): WindowedProgress {
  return {
    window,
    totals: null,
    subjectTotals: {},
    subjects: [],
    topics: [],
    concepts: [],
    sections: [],
    mistakeTypes: [],
    activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0, gradedAnswers: 0 },
    activitySpanDays: null,
    mistakeLog: { loggedInWindow: 0 },
  };
}

/** Split MarkPoints at the activity median → a marks before→now RungTrend, or null
 *  (SILENT) unless BOTH halves carry ≥ MIN_HALF_SAMPLE measurable points.
 *  The spread carries SplitTrend's raw marks through, so every rung built here is
 *  marks-denominated (unlike the mistake-type share rung — see buildMistakeTypeRung). */
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
  /** H11 — marks this point lost ONLY to work not attempted (0 when none, or unknown). */
  notAttempted: number;
}

/** The synthetic per-question id prefix each session surface fans through
 *  recordAttempt (worksheetQuestionId / chapterTestQuestionId / fullMockQuestionId).
 *  check-improve is DELIBERATELY absent: its per-question work is already in the
 *  attempts stream and its record carries questionIds:[] — skipping it here is what
 *  makes the C&I dual write count exactly once.
 *
 *  ⚠ DO NOT ADD `"quick-practice": "qp"`. The missing entry looks like an oversight;
 *  it is not. This map is an OPT-IN, and QP must stay out of it twice over:
 *    1. QP records never reach here at all — PROGRESS_COUNTING_SURFACES gates them out
 *       at the winRecords boundary (LOCKED §1a as amended).
 *    2. Even if they did, the dedup below builds `qp:{worksheetId}:q{n}`, which could
 *       NEVER match a QP attempt's id — QP attempts carry REAL bank ids (`b1`, …), not
 *       synthetic ones. The dedup would silently miss and every QP mark would count
 *       TWICE (once from its attempt, once from its record). */
const SURFACE_QID_PREFIX: Partial<Record<SessionSurface, string>> = {
  worksheet: "ws",
  "chapter-test": "ct",
  "full-mock": "fm",
};

/**
 * ── THE COUNTING BOUNDARY (LOCKED §1a as amended, owner-ratified 2026-07-15) ──
 *
 * Surfaces whose records feed the COUNTING rungs. Quick Practice is deliberately
 * absent: its per-question work ALREADY streams through recordAttempt, so counting its
 * record too would DOUBLE every QP mark and mistake. A QP record is a SESSION/HISTORY
 * artifact (getSurfaceHistory / getRecentSessions — display), never a counting stream.
 *
 * Applied at the `winRecords` filters — the ONLY two places a cloud SessionRecord
 * enters aggregation. That placement is deliberate and load-bearing: a BOUNDARY guard
 * cannot be forgotten by a future rung author, whereas a per-function guard must be
 * re-audited by every one of them. This file already proves the failure mode —
 * buildConceptSectionRungs' `check-improve` deny-list drifted out of sync with
 * SURFACE_QID_PREFIX's allow-list above, and a QP record would have double-counted
 * through exactly that gap. Allow-list, one place, or it drifts again.
 *
 * Pinned by "QP's record is skipped — its attempts stay" in progressStore.test.ts,
 * mirroring the ratified C&I "dual write counts ONCE" property.
 */
const PROGRESS_COUNTING_SURFACES: SessionSurface[] = [
  "worksheet",
  "chapter-test",
  "full-mock",
  "check-improve",
];

/** The bank-backed id → concept lookup, passed into the two builders that need it. */
type BankLookup = (id: string | null | undefined) => BankConcept | null;

/** Stands in for the bank when NEITHER builder can reach a lookup (see the two
 *  predicates below) — so it is never actually called, and no number can differ. */
const NO_BANK_LOOKUP: BankLookup = () => null;

/** True when `buildUnifiedGradedPoints` CAN call the bank lookup: only for a record on
 *  a SURFACE_QID_PREFIX surface that carries questionIds. A SUPERSET of its real call
 *  condition (it also needs an aligned payload), so it can only load the bank too often,
 *  never too rarely. */
function unifiedNeedsBank(records: SessionRecord[]): boolean {
  return records.some(
    (r) => !!SURFACE_QID_PREFIX[r.surface] && Array.isArray(r.questionIds) && r.questionIds.length > 0,
  );
}

/** True when `buildConceptSectionRungs` CAN call the bank lookup: for ANY attempt, or a
 *  non-C&I record that carries questionIds. Mirrors its two loops; a superset, as above. */
function conceptNeedsBank(attempts: PracticeAttempt[], records: SessionRecord[]): boolean {
  return (
    attempts.length > 0 ||
    records.some(
      (r) => r.surface !== "check-improve" && Array.isArray(r.questionIds) && r.questionIds.length > 0,
    )
  );
}

/**
 * BANK-LEAN-1 (C4) — load the bank-backed concept lookup ON DEMAND. Only the two async
 * reads call this, and only after the signed-out / no-uid early return, so a signed-out
 * Topic Hub never requests the bank chunk at all. When `needed` is false the builders
 * provably never call the lookup, so the stub cannot change a number. A failed chunk
 * load REJECTS (it is not swallowed into a null lookup, which would silently move the
 * topic/concept rungs); every caller already catches and degrades to its honest empty.
 */
async function loadBankLookup(needed: boolean): Promise<BankLookup> {
  if (!needed) return NO_BANK_LOOKUP;
  const { conceptForQuestionId } = await import("./progressBankIndex");
  return conceptForQuestionId;
}

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
  conceptForQuestionId: BankLookup,
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
    const aScored = Number(a.marksScored) || 0;
    const aAvailable = Number(a.marksAvailable) || 0;
    points.push({
      ts: a.timestamp,
      scored: aScored,
      available: aAvailable,
      subject: normalizeSubject(a.subject),
      topicKey,
      topicLabel: a.topicName || a.topicKey,
      // H11 — the attempt says its whole loss was not attempted (never inferred for an old one).
      notAttempted: a.notAttempted === true ? Math.max(0, aAvailable - aScored) : 0,
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
      // H10 — every NOT-GRADED state (could not be read, option unread, answer does not match
      // the question), not only couldNotRead: such a question is never a 0 in progress.
      if (!isGradedQuestion(res)) continue;
      const available = Number(res.totalMarks) || 0;
      if (available <= 0) continue;
      const idx = Number(res.qNumber) - 1;
      if (idx < 0 || idx >= r.questionIds.length) continue;
      if (attemptQids.has(`${prefix}:${r.worksheetId}:q${res.qNumber}`)) continue;
      const bank = conceptForQuestionId(r.questionIds[idx]);
      const topicKey = bank?.topicKey ? canonicalKey(bank.topicKey) : recordTopic;
      if (topicFilter && topicKey !== topicFilter) continue;
      const rScored = Number(res.marksAwarded) || 0;
      points.push({
        ts: r.gradedAt,
        scored: rScored,
        available,
        subject: r.subject === "science" ? "science" : "maths",
        topicKey,
        notAttempted: isLossOnlyNotAttempted(res) ? Math.max(0, available - rScored) : 0,
      });
    }
  }

  return points;
}

function buildSubjectRung(points: GradedPoint[]): RungTrend[] {
  const groups = new Map<"maths" | "science", MarkPoint[]>();
  for (const p of points) {
    const arr = groups.get(p.subject) ?? [];
    arr.push({ ts: p.ts, scored: p.scored, available: p.available, notAttempted: p.notAttempted });
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
    g.pts.push({ ts: p.ts, scored: p.scored, available: p.available, notAttempted: p.notAttempted });
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
  conceptForQuestionId: BankLookup,
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
      // A question that was NOT graded (could not be read, option unread, answer does not match,
      // or the server's notGraded) is never a 0 on a concept or a section — the same one
      // predicate as the topic rungs above.
      if (!isGradedQuestion(res)) continue;
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
      // ⚠ marksScored / marksAvailable are DELIBERATELY ABSENT here, and this is not
      // an oversight to be tidied up later. This rung is a composition SHARE of typed
      // mistakes, not a score — there is no marks denominator behind it. Filling them
      // with 0 to "complete the shape" would put an invented "0 of 0 marks" on screen.
      // Absent is the honest value. See RungTrend's field docs.
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

/** G4 — the ungated total over a set of graded points (null when none is measurable). The
 *  SAME `marksPercentOf` the gated split uses, so the two can never disagree on a sum. */
function windowTotalOf(points: GradedPoint[]): WindowTotal | null {
  const m = marksPercentOf(points);
  if (!m) return null;
  return {
    marksScored: Math.round(m.scored * 100) / 100,
    marksAvailable: Math.round(m.available * 100) / 100,
    marksLost: Math.max(0, Math.round((m.available - m.scored) * 10) / 10),
    marksNotAttempted: Math.round(m.notAttempted * 100) / 100,
    answers: m.sample,
  };
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
  window: ReadWindow = "month",
  scope?: WindowedProgressScope,
  nowMs?: number,
): Promise<WindowedProgress> {
  const id = progressReadUid(uid);
  if (!id) return emptyWindowed(window);

  const now = typeof nowMs === "number" ? nowMs : Date.now();
  // ME-ENGINE-1 PR-1 — `today` is the IST calendar day (windowRange), the rest are rolling.
  const { start } = windowRange(window, now);
  // The mistake-log enrichment read is day-granular; ceil so `today` reads at least its day.
  const logDays = Math.max(1, Math.ceil((now - start) / DAY_MS));

  // A topic scope that is not one of the 26 board chapters scopes to NOTHING — it must never
  // silently widen into an unscoped read (the old `"" → undefined` fall-through).
  const topicFilter = scope?.topicKey ? canonicalKey(scope.topicKey) : undefined;
  if (scope?.topicKey && !topicFilter) return emptyWindowed(window);

  const [attempts, records, payloads, mistakes] = await Promise.all([
    getAttemptsFromCloud(id, { start }).catch(() => [] as PracticeAttempt[]),
    getSessionRecordsFromCloud(id).catch(() => [] as SessionRecord[]),
    getAllSessionPerQuestionFromCloud(id).catch(() => [] as SessionPerQuestionPayload[]),
    getMistakeLogs(id, logDays).catch(() => [] as MistakeLogEntry[]),
  ]);

  const subjFilter = scope?.subject;

  const winAttempts = attempts.filter(
    (a) =>
      a.timestamp >= start &&
      a.timestamp <= now &&
      (!subjFilter || normalizeSubject(a.subject) === subjFilter) &&
      (!topicFilter || canonicalKey(a.topicKey || a.topicName) === topicFilter),
  );
  // The counting boundary: a non-counting surface's record never enters aggregation
  // (LOCKED §1a as amended — see PROGRESS_COUNTING_SURFACES).
  const winRecords = records.filter(
    (r) =>
      PROGRESS_COUNTING_SURFACES.includes(r.surface) &&
      r.gradedAt >= start &&
      r.gradedAt <= now &&
      (!subjFilter || r.subject === subjFilter),
  );

  const bankLookup = await loadBankLookup(
    unifiedNeedsBank(winRecords) || conceptNeedsBank(winAttempts, winRecords),
  );
  const unified = buildUnifiedGradedPoints(winAttempts, winRecords, payloads, bankLookup, topicFilter);
  const { concepts, sections } = buildConceptSectionRungs(
    winAttempts,
    winRecords,
    payloads,
    bankLookup,
    topicFilter,
  );

  const subjectTotals: WindowedProgress["subjectTotals"] = {};
  for (const s of ["maths", "science"] as const) {
    const t = windowTotalOf(unified.filter((p) => p.subject === s));
    if (t) subjectTotals[s] = t;
  }
  // G10 — "tests taken" counts a test once it is GRADED (isTestTaken), never pending/partial.
  const takenRecords = winRecords.filter(isTestTaken);

  return {
    window,
    totals: windowTotalOf(unified),
    subjectTotals,
    subjects: buildSubjectRung(unified),
    topics: buildTopicRung(unified),
    concepts,
    sections,
    mistakeTypes: buildMistakeTypeRung(winRecords),
    activity: {
      worksheets: takenRecords.filter((r) => r.surface === "worksheet").length,
      chapterTests: takenRecords.filter((r) => r.surface === "chapter-test").length,
      fullMocks: takenRecords.filter((r) => r.surface === "full-mock").length,
      practiceAttempts: winAttempts.length,
      gradedAnswers: winAttempts.filter((a) => a.mode === "graded").length,
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
  // The counting boundary (see getWindowedProgress) — the second and last place a
  // cloud SessionRecord enters aggregation.
  const winRecords = records.filter(
    (r) => PROGRESS_COUNTING_SURFACES.includes(r.surface) && r.gradedAt >= start && r.gradedAt <= now,
  );

  const bankLookup = await loadBankLookup(unifiedNeedsBank(winRecords));
  const unified = buildUnifiedGradedPoints(winAttempts, winRecords, payloads, bankLookup, key);
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
