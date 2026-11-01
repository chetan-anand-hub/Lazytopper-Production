/**
 * TUTOR-STICKY-1 — the PURE half of the tutor's daily "Fix 3 lost marks" card.
 *
 * Everything that decides WHAT the card says lives here and is pinned by tests with a fixed clock:
 *   - the picks are the student's OWN live, unresolved mistakes (the Mistake Intelligence read the Home
 *     card and Me already use). No mistake -> no items -> the card renders nothing (honest empty state);
 *   - at most 3, newest first, one per bank question;
 *   - "not attempted" is never a mistake and never a pick; a mistake a later correct attempt already won
 *     back is not "unresolved";
 *   - a chapter the registry cannot place is skipped (the tutor needs a chapter to open on);
 *   - the card "resets daily (IST)": a fix the student cleared TODAY stays on the card, ticked; one cleared
 *     on an earlier day is gone, so tomorrow shows the next three.
 *
 * ★ The cleared-fix record (below) is a per-viewer CONVENIENCE in localStorage, keyed by uid: which cards the
 *   student already worked through. It is never premium or trial state (CLAUDE.md section 7), never a grade, and
 *   losing it only means a card may show again.
 */
import type { MistakeLogEntry } from "../../services/mistakeLogService";
import { isWonBack, isSupersededByRegrade } from "../../services/mistakeLogService";
import { boardChapterKey } from "../../services/progressStore";
import { mistakeSubjectOf } from "../../services/progressReadModel";
import { desktopTopicBySlug } from "../desktop/topics";
import { MISTAKE_TYPE_LABEL, readMarksLostByType, type StoredMistakeType } from "../mistakeDisplay";
import { marksText } from "../mi/miScope";
import { buildTutorPath } from "../../pages/tutor/tutorPath";

/** How many lost marks one day's card holds. */
export const DAILY_FIX_MAX = 3;

export interface DailyFixItem {
  /** The mistake-log entry id (stable; rides the tutor URL as `fix`). */
  key: string;
  chapterKey: string;
  chapterName: string;
  subject: "Maths" | "Science";
  /** The bank row's subtopic, verbatim, when the entry carries one. */
  concept: string | null;
  /** A bare bank question id when the entry has one (a paper's synthetic id is not a bank id). */
  questionId: string | null;
  type: StoredMistakeType;
  marks: number;
  /** "Electricity — silly slip, 0.5 mark". */
  line: string;
  /** The tutor URL, anchored on this item. */
  path: string;
  /** Cleared today (ticked on the card). */
  done: boolean;
}

const SYNTHETIC_QID = /^(ws|ct|fm|ci|qn):/;
const TYPES: readonly StoredMistakeType[] = ["conceptual", "calculation", "silly", "presentation"];

/** The one type that cost this entry the most, or null when the entry's loss was not a typed mistake. */
export function dominantTypeOf(e: Pick<MistakeLogEntry, "marksLostByType" | "marksLostByTypeVersion" | "mistakeCounts">): StoredMistakeType | null {
  const byType = readMarksLostByType(e.marksLostByType);
  if (byType) {
    let best: StoredMistakeType | null = null;
    let bestMarks = 0;
    for (const t of TYPES) {
      if (byType[t] > bestMarks) {
        best = t;
        bestMarks = byType[t];
      }
    }
    return best;
  }
  // A COUNT-ONLY entry: the type with the most recorded mistakes (the grader's own count), never marks.
  let best: StoredMistakeType | null = null;
  let bestCount = 0;
  for (const t of TYPES) {
    const n = Number(e.mistakeCounts?.[t]) || 0;
    if (n > bestCount) {
      best = t;
      bestCount = n;
    }
  }
  return best;
}

/** "YYYY-MM-DD" of the IST calendar day of `ms` (a fixed UTC+05:30, no daylight saving). */
export function istDay(ms: number): string {
  return new Date(ms + (5 * 60 + 30) * 60 * 1000).toISOString().slice(0, 10);
}

export type ClearedFixes = Readonly<Record<string, string>>;

/**
 * The student's unresolved mistakes as up to three tutor-ready items. `entries` are the read model's LIVE
 * mistakes (newest first); `cleared` maps entry id -> the IST day the student cleared it with the tutor.
 */
export function selectDailyFixes(entries: readonly MistakeLogEntry[], nowMs: number, cleared: ClearedFixes = {}): DailyFixItem[] {
  const today = istDay(nowMs);
  const seen = new Set<string>();
  const out: DailyFixItem[] = [];
  for (const e of entries) {
    if (out.length >= DAILY_FIX_MAX) break;
    if (!e || typeof e.id !== "string" || !e.id) continue;
    if (e.habitOnly || isWonBack(e) || isSupersededByRegrade(e) || e.resolvedAt) continue;
    const marks = Number(e.marksLost) || 0;
    if (marks <= 0) continue;
    const type = dominantTypeOf(e);
    if (!type) continue; // an all-"not attempted" loss is never a mistake
    const clearedOn = cleared[e.id];
    if (clearedOn && clearedOn !== today) continue; // cleared on an earlier day: tomorrow shows the next one
    const subject = mistakeSubjectOf(e.subject);
    const chapterKey = boardChapterKey(e.topic);
    if (!subject || !chapterKey) continue;
    const qid = String(e.questionId ?? "").trim();
    const questionId = qid && !SYNTHETIC_QID.test(qid) ? qid : null;
    const dedupe = questionId ?? e.id;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const chapterName = desktopTopicBySlug(chapterKey)?.name ?? "";
    if (!chapterName) continue;
    const concept = typeof e.concept === "string" && e.concept.trim() ? e.concept.trim() : null;
    const paperName = subject === "science" ? "Science" : "Maths";
    out.push({
      key: e.id,
      chapterKey,
      chapterName,
      subject: paperName,
      concept,
      questionId,
      type,
      marks,
      line: `${chapterName} — ${MISTAKE_TYPE_LABEL[type].toLowerCase()}, ${marksText(marks)}`,
      path: buildTutorPath({
        subject: paperName,
        topicKey: chapterKey,
        concept: concept ?? undefined,
        questionId: questionId ?? undefined,
        source: "daily-fix",
        returnTo: "/",
        fix: e.id,
      }),
      done: clearedOn === today,
    });
  }
  return out;
}

/** The first item still to do, after `afterKey` when given (the "next lost mark"), else the first not done. */
export function nextFix(items: readonly DailyFixItem[], currentKey?: string | null): DailyFixItem | null {
  return items.find((i) => !i.done && i.key !== currentKey) ?? null;
}

/** "Fix 3 lost marks today" / "Fix 1 lost mark today" — counts the items (each is a lost mark or more). */
export function dailyFixHeading(items: readonly DailyFixItem[]): string {
  const n = items.filter((i) => !i.done).length || items.length;
  return `Fix ${n} lost ${n === 1 ? "mark" : "marks"} today`;
}

/* ───────────────────────── the cleared-fix record (per viewer, localStorage) ───────────────────────── */

const CLEARED_KEY_PREFIX = "lazytopper.tutorDailyFix.v1.";
const CLEARED_MAX = 60;
export const DAILY_FIX_CHANGED_EVENT = "lazytopper:tutor-daily-fix";

export function readClearedFixes(uid: string): ClearedFixes {
  try {
    const raw = window.localStorage.getItem(CLEARED_KEY_PREFIX + uid);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Record that the student cleared this fix on `dayKey` (the newest CLEARED_MAX are kept). */
export function markFixCleared(uid: string, key: string, dayKey: string): void {
  if (!uid || !key) return;
  try {
    const next: Record<string, string> = { ...readClearedFixes(uid), [key]: dayKey };
    const keep = Object.entries(next)
      .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
      .slice(0, CLEARED_MAX);
    window.localStorage.setItem(CLEARED_KEY_PREFIX + uid, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    /* storage unavailable: the card may show this fix again, nothing else */
  }
  try {
    window.dispatchEvent(new Event(DAILY_FIX_CHANGED_EVENT));
  } catch {
    /* no window: nothing is listening */
  }
}
