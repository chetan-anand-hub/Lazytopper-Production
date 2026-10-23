/**
 * COMPANION-1 — Byte & Ziggy as companions across months of board prep (owner ruling 22 Oct 2026,
 * moments approved by the controller). THIS FILE IS PURE + DEVICE-LOCAL: when each companion moment
 * is due, from numbers the app already holds. No copy and no drawing live here (those are in the lazy
 * ./companionChunk.tsx); nothing here is sent anywhere.
 *
 * THE RULES EVERY MOMENT KEEPS
 *  - rare and TRUE: each fires from a real fact (a record, an attempt, the clock, an OFFICIAL date)
 *    and at most once per its window, remembered per account per device (`lazytopper.companion.<tag>`);
 *  - never guilt: breaks and sleep are encouraged; a quiet week is never mentioned;
 *  - ONE character on screen: two moments that qualify together → the higher priority shows
 *    (`claimStage`), and none starts while another mascot is already on the page.
 *
 * Every function that depends on time takes `now` — none reads the clock itself.
 */
import type { GuideMomentId } from "../../../analytics/analytics";
import type { SessionRecord } from "../../../services/sessionRecords";
import { guideAccountTag, guidePreviewActive } from "../guideVariant";

export type CompanionMomentId =
  | "lowScore"
  | "breathe"
  | "improve"
  | "milestone"
  | "welcomeBack"
  | "lateNight"
  | "rhythm"
  | "countdown";

/** The `moment` each one reports in guide_moment_shown / guide_moment_click. */
export const COMPANION_EVENT_ID: Record<CompanionMomentId, GuideMomentId> = {
  lowScore: "c_low_score",
  breathe: "c_breathe",
  improve: "c_improve",
  milestone: "c_milestone",
  welcomeBack: "c_welcome_back",
  lateNight: "c_late_night",
  rhythm: "c_rhythm",
  countdown: "c_countdown",
};

/** When two qualify at once, the higher shows and the other waits (wellbeing first). */
export const COMPANION_PRIORITY: Record<CompanionMomentId, number> = {
  lateNight: 100,
  lowScore: 90,
  improve: 85,
  breathe: 80,
  milestone: 70,
  welcomeBack: 60,
  rhythm: 40,
  countdown: 20,
};

/* ── the thresholds (pinned by companionModel.test.ts at their boundaries) ───────────────────── */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
/** IST is a fixed UTC+05:30 (no daylight saving). */
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
/** Below this percentage a scorecard gets Byte's comfort (strictly below: 40% itself does not). */
export const LOW_SCORE_PCT = 40;
/** At least this many points up on the same surface + chapter → the high five. */
export const IMPROVE_POINTS = 10;
/** Away at least this long → "Missed you!". */
export const RETURN_AWAY_DAYS = 3;
/** Practised on at least this many distinct IST days in the last seven → the rhythm moment. */
export const RHYTHM_DAYS = 3;
export const RHYTHM_WINDOW_DAYS = 7;
/** The late-night window in IST: 23:00 up to (not including) 05:00. */
export const LATE_NIGHT_START_HOUR = 23;
export const LATE_NIGHT_END_HOUR = 5;
/** …and only once this tab's signed-in session is longer than this. */
export const LATE_NIGHT_SESSION_MS = 30 * 60 * 1000;
/** The breathe moment's length before it steps aside on its own. */
export const BREATHE_TOTAL_MS = 10_000;

/* ── IST clock helpers ───────────────────────────────────────────────────────────────────────── */

/** The hour (0–23) of `ms` on an Indian clock, whatever the device's own zone. */
export function istHour(ms: number): number {
  const inDay = (((ms + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return Math.floor(inDay / 3_600_000);
}

/** The IST calendar day containing `ms`, as a whole-day index. */
export function istDayIndex(ms: number): number {
  return Math.floor((ms + IST_OFFSET_MS) / DAY_MS);
}

/** 23:00 ≤ IST time < 05:00. */
export function isLateNightIst(ms: number): boolean {
  const h = istHour(ms);
  return h >= LATE_NIGHT_START_HOUR || h < LATE_NIGHT_END_HOUR;
}

/** One key per night: 23:00 on day D and 04:59 on day D+1 share it (the day shifts at 05:00 IST). */
export function nightKey(ms: number): number {
  return Math.floor((ms + IST_OFFSET_MS - LATE_NIGHT_END_HOUR * 3_600_000) / DAY_MS);
}

/** 6. Late night: in the window, a session past 30 minutes, not yet shown this night. */
export function lateNightDue(a: { now: number; sessionStart: number | null; lastNight: number | null }): boolean {
  if (!isLateNightIst(a.now)) return false;
  if (a.sessionStart === null || a.now - a.sessionStart <= LATE_NIGHT_SESSION_MS) return false;
  return a.lastNight !== nightKey(a.now);
}

/* ── 1 & 3 — the scorecard's numbers (exported for GUIDE-SCORE-1 to adopt) ───────────────────── */

/** A whole percentage from marks already on the scorecard; null when there is nothing to divide. */
export function scorePct(awarded: number, total: number): number | null {
  if (!Number.isFinite(awarded) || !Number.isFinite(total) || total <= 0 || awarded < 0) return null;
  return Math.max(0, Math.min(100, Math.round((awarded / total) * 100)));
}

export function isLowScore(pct: number | null): boolean {
  return pct !== null && pct < LOW_SCORE_PCT;
}

export interface Improvement {
  from: number;
  to: number;
}

/** The rule and the words use the SAME whole percentages, so the line can never disagree with it. */
export function improvementOf(prevPct: number | null, nowPct: number | null): Improvement | null {
  if (prevPct === null || nowPct === null) return null;
  const from = Math.round(prevPct);
  const to = Math.round(nowPct);
  return to - from >= IMPROVE_POINTS ? { from, to } : null;
}

export type ScoreMoment = { moment: "improve"; from: number; to: number } | { moment: "lowScore" } | null;

/** One scorecard → at most one moment: a real improvement is celebrated even if still below 40%. */
export function companionScoreMoment(nowPct: number | null, prevPct: number | null): ScoreMoment {
  const up = improvementOf(prevPct, nowPct);
  if (up) return { moment: "improve", ...up };
  return isLowScore(nowPct) ? { moment: "lowScore" } : null;
}

type ScoreRecord = Pick<SessionRecord, "id" | "surface" | "topicKeys" | "gradedAt" | "status" | "marksAwarded" | "marksTotal">;

/**
 * The previous fully graded result on the SAME surface and the SAME single chapter, before this one —
 * from records the scorecard's page already loaded. Null when there is no fair comparison.
 */
export function previousSameScore(
  records: readonly ScoreRecord[],
  current: { surface: SessionRecord["surface"]; topicKey: string; gradedAt: number; id?: string },
): number | null {
  if (!current.topicKey) return null;
  let best: ScoreRecord | null = null;
  for (const r of records) {
    if (r.id === current.id || r.surface !== current.surface || r.status !== "graded") continue;
    if (r.topicKeys.length !== 1 || r.topicKeys[0] !== current.topicKey) continue;
    if (!(r.gradedAt < current.gradedAt) || !(r.marksTotal > 0)) continue;
    if (!best || r.gradedAt > best.gradedAt) best = r;
  }
  return best ? scorePct(best.marksAwarded, best.marksTotal) : null;
}

/* ── 4 — milestones ──────────────────────────────────────────────────────────────────────────── */

export const MILESTONES = ["firstWritten", "firstChapterTest", "firstFullMock", "answers10", "answers50"] as const;
export type MilestoneId = (typeof MILESTONES)[number];

type FactRecord = Pick<SessionRecord, "surface" | "status" | "gradedAt" | "topicKeys" | "subject">;

export interface ActivityFacts {
  records: readonly FactRecord[];
  /** Answers checked by the grader (practice attempts with mode "graded" — Me's "checked answers"). */
  gradedAnswers: number;
}

/** Every milestone this account has truly reached, from this device's records and attempts. */
export function achievedMilestones(f: ActivityFacts): MilestoneId[] {
  const done = (surface: SessionRecord["surface"]) => f.records.some((r) => r.surface === surface && r.status === "graded");
  const out: MilestoneId[] = [];
  if (f.gradedAnswers >= 1 || done("check-improve")) out.push("firstWritten");
  if (done("chapter-test")) out.push("firstChapterTest");
  if (done("full-mock")) out.push("firstFullMock");
  if (f.gradedAnswers >= 10) out.push("answers10");
  if (f.gradedAnswers >= 50) out.push("answers50");
  return out;
}

/**
 * Once each, and rare: of the reached-but-not-yet-celebrated milestones, ONE badge shows (the
 * furthest along), and all of them are marked — so a student who arrives with several reached
 * gets one badge, not a week of them.
 */
export function milestoneToShow(achieved: readonly MilestoneId[], shown: readonly MilestoneId[]): { show: MilestoneId | null; mark: MilestoneId[] } {
  const fresh = MILESTONES.filter((m) => achieved.includes(m) && !shown.includes(m));
  if (fresh.length === 0) return { show: null, mark: [] };
  return { show: fresh[fresh.length - 1], mark: fresh };
}

/* ── 5 — welcome back ────────────────────────────────────────────────────────────────────────── */

/** The newest moment of practice on this device (a graded record or an attempt), or null. */
export function lastActivityAt(records: readonly Pick<SessionRecord, "gradedAt">[], attemptTimes: readonly number[]): number | null {
  let last: number | null = null;
  for (const r of records) if (Number.isFinite(r.gradedAt) && (last === null || r.gradedAt > last)) last = r.gradedAt;
  for (const t of attemptTimes) if (Number.isFinite(t) && (last === null || t > last)) last = t;
  return last;
}

/**
 * Away ≥ 3 days: the later of the last visit and the last practice is at least three days back.
 * Returns that reference time (the marker, so it fires once per return), or null. A brand-new
 * account (no practice at all) is never "missed".
 */
export function welcomeBackDue(a: { now: number; prevSeen: number | null; lastActivity: number | null; lastWelcomeFor: number | null }): number | null {
  if (a.lastActivity === null) return null;
  const ref = Math.max(a.prevSeen ?? 0, a.lastActivity);
  if (a.now - ref < RETURN_AWAY_DAYS * DAY_MS) return null;
  return a.lastWelcomeFor === ref ? null : ref;
}

/** Where "5 quick questions" goes: Quick Practice on the student's most recent single chapter. */
export function warmUpPath(records: readonly FactRecord[], returnTo: string): string | null {
  let pick: FactRecord | null = null;
  for (const r of records) {
    if (r.topicKeys.length !== 1 || !r.topicKeys[0]) continue;
    if (r.subject !== "maths" && r.subject !== "science") continue;
    if (!pick || r.gradedAt > pick.gradedAt) pick = r;
  }
  if (!pick) return null;
  const subject = pick.subject === "maths" ? "Maths" : "Science";
  const sp = new URLSearchParams();
  sp.set("topic", pick.topicKeys[0]);
  sp.set("count", "5");
  sp.set("backLabel", "Back");
  sp.set("returnTo", returnTo === "/browse" ? "/browse" : "/");
  return `/practice/10/${subject}?${sp.toString()}`;
}

/* ── 7 — practice rhythm ─────────────────────────────────────────────────────────────────────── */

/** Distinct IST days with practice in the last seven IST calendar days (today included). */
export function practiceDaysThisWeek(times: readonly number[], now: number): number {
  const today = istDayIndex(now);
  const days = new Set<number>();
  for (const t of times) {
    if (!Number.isFinite(t) || t > now) continue;
    const d = istDayIndex(t);
    if (d > today - RHYTHM_WINDOW_DAYS && d <= today) days.add(d);
  }
  return days.size;
}

/** 3+ days this week, at most once a week. Only ever counts what was done — never what was not. */
export function rhythmDue(a: { now: number; days: number; lastRhythmAt: number | null }): boolean {
  if (a.days < RHYTHM_DAYS) return false;
  return a.lastRhythmAt === null || a.now - a.lastRhythmAt >= WEEK_MS;
}

/* ── 8 — the board countdown (an OFFICIAL date only) ─────────────────────────────────────────── */

/** Whole IST days from `now` to the IST calendar date `iso` (YYYY-MM-DD); null if past or malformed. */
export function daysToBoards(now: number, iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(target)) return null;
  const days = Math.floor(target / DAY_MS) - istDayIndex(now);
  return days > 0 ? days : null;
}

export function countdownDue(a: { now: number; lastCountdownAt: number | null }): boolean {
  return a.lastCountdownAt === null || a.now - a.lastCountdownAt >= WEEK_MS;
}

/* ── the Home pick (4, 5, 7 — the countdown needs a read, so it is decided after) ────────────── */

export type HomePick =
  | { moment: "milestone"; milestone: MilestoneId; mark: MilestoneId[] }
  | { moment: "welcomeBack"; ref: number; to: string }
  | { moment: "rhythm"; days: number };

export function pickHomeMoment(a: {
  now: number;
  facts: ActivityFacts;
  attemptTimes: readonly number[];
  prevSeen: number | null;
  marks: CompanionMarks;
  returnTo: string;
}): HomePick | null {
  const ms = milestoneToShow(achievedMilestones(a.facts), a.marks.m);
  if (ms.show) return { moment: "milestone", milestone: ms.show, mark: ms.mark };
  const ref = welcomeBackDue({
    now: a.now,
    prevSeen: a.prevSeen,
    lastActivity: lastActivityAt(a.facts.records, a.attemptTimes),
    lastWelcomeFor: a.marks.wb,
  });
  const to = ref !== null ? warmUpPath(a.facts.records, a.returnTo) : null;
  if (ref !== null && to) return { moment: "welcomeBack", ref, to };
  const days = practiceDaysThisWeek([...a.facts.records.map((r) => r.gradedAt), ...a.attemptTimes], a.now);
  if (rhythmDue({ now: a.now, days, lastRhythmAt: a.marks.r })) return { moment: "rhythm", days };
  return null;
}

/* ── the device memory (`lazytopper.companion.<tag>`, `lazytopper.companionSession`) ─────────── */

export const COMPANION_KEY_PREFIX = "lazytopper.companion.";
export const COMPANION_SESSION_KEY = "lazytopper.companionSession";

export interface CompanionMarks {
  /** milestones already celebrated */
  m: MilestoneId[];
  /** the welcome-back reference it last fired for */
  wb: number | null;
  /** when the rhythm moment last showed */
  r: number | null;
  /** when the countdown last showed */
  c: number | null;
  /** the night key the late-night note last showed on */
  n: number | null;
  /** when this account last opened a signed-in page on this device */
  s: number | null;
}

const EMPTY: CompanionMarks = { m: [], wb: null, r: null, c: null, n: null, s: null };
const memory = new Map<string, CompanionMarks>();
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function keyFor(uid: string): string {
  return COMPANION_KEY_PREFIX + guideAccountTag(uid);
}

export function readMarks(uid: string): CompanionMarks {
  const key = keyFor(uid);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const v = JSON.parse(raw) as Record<string, unknown> | null;
      if (v && typeof v === "object") {
        const m = Array.isArray(v.m) ? (v.m.filter((x) => (MILESTONES as readonly unknown[]).includes(x)) as MilestoneId[]) : [];
        return { m, wb: num(v.wb), r: num(v.r), c: num(v.c), n: num(v.n), s: num(v.s) };
      }
    }
  } catch {
    /* blocked or malformed: fall back to this load's memory */
  }
  return { ...EMPTY, ...(memory.get(key) ?? {}) };
}

/** Merge into the stored marks. Skipped entirely under an admin preview (it never spends a moment). */
export function writeMarks(uid: string, patch: Partial<CompanionMarks>): void {
  if (guidePreviewActive()) return;
  const key = keyFor(uid);
  const next: CompanionMarks = { ...readMarks(uid), ...patch };
  memory.set(key, next);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* blocked storage: this page load only */
  }
}

/** Under an admin preview the once-only rules are relaxed (the M11 rule): no marker is read. */
export function marksFor(uid: string): CompanionMarks {
  return guidePreviewActive() ? { ...EMPTY } : readMarks(uid);
}

let sessionStartMemo: number | null = null;

/** When this tab's signed-in session started (set on the first call of the tab). */
export function sessionStartMs(now: number): number {
  if (sessionStartMemo !== null) return sessionStartMemo;
  let start = now;
  try {
    const raw = Number(window.sessionStorage.getItem(COMPANION_SESSION_KEY));
    if (Number.isFinite(raw) && raw > 0 && raw <= now) start = raw;
    else window.sessionStorage.setItem(COMPANION_SESSION_KEY, String(now));
  } catch {
    /* blocked storage: this page load */
  }
  sessionStartMemo = start;
  return start;
}

const prevSeenMemo = new Map<string, number | null>();

/**
 * The account's previous visit on this device, read ONCE per page load (then the stored value
 * moves to `now`). Every companion door calls it, so whichever mounts first records the visit.
 */
export function previousSeen(uid: string, now: number): number | null {
  if (prevSeenMemo.has(uid)) return prevSeenMemo.get(uid) ?? null;
  const prev = readMarks(uid).s;
  prevSeenMemo.set(uid, prev);
  writeMarks(uid, { s: now });
  return prev;
}

/* ── one character on screen ─────────────────────────────────────────────────────────────────── */

const wants = new Map<string, number>();
const stageListeners = new Set<() => void>();

function emitStage(): void {
  for (const l of stageListeners) l();
}

/** A moment asks for the stage; the highest priority holds it. */
export function claimStage(id: string, priority: number): void {
  if (wants.get(id) === priority) return;
  wants.set(id, priority);
  emitStage();
}

export function releaseStage(id: string): void {
  if (!wants.delete(id)) return;
  emitStage();
}

export function stageHolder(): string | null {
  let best: string | null = null;
  let bestP = -Infinity;
  for (const [id, p] of wants) {
    if (p > bestP) {
      best = id;
      bestP = p;
    }
  }
  return best;
}

export function subscribeStage(l: () => void): () => void {
  stageListeners.add(l);
  return () => {
    stageListeners.delete(l);
  };
}

/** The sidebar's MI voice is CHROME: while a companion moment is up it is hidden (companion.css). */
export const CHROME_MASCOT_CLASS = "lt-mi-voice__char";

/** Every companion card's own character carries this class (the stage already keeps those to one). */
export const COMPANION_CHAR_CLASS = "lt-cmp__char";

/** Another Byte / Ziggy / Mummy is already on the page (not a companion card's, not the sidebar chrome). */
export function otherMascotOnScreen(): boolean {
  if (typeof document === "undefined") return false;
  const hosts = document.querySelectorAll(".lt-gr-host");
  for (let i = 0; i < hosts.length; i += 1) {
    const h = hosts[i];
    if (h.classList.contains(COMPANION_CHAR_CLASS) || h.classList.contains(CHROME_MASCOT_CLASS)) continue;
    return true;
  }
  return false;
}

export function __resetCompanionForTests(): void {
  memory.clear();
  prevSeenMemo.clear();
  sessionStartMemo = null;
  wants.clear();
  emitStage();
}
