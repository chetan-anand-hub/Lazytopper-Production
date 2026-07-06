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

import { getAttempts, type PracticeAttempt } from "./practiceInsights";
import { loadLocalSessionRecords, type SessionRecord, type SessionSurface, type SessionStatus } from "./sessionRecords";

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
