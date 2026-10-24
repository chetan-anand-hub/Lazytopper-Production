/**
 * MOMENTS-3 — Ziggy's "aha" (ziggy_aha) with Byte's proud nod: a repeated mistake type STOPS.
 * PURE: no React, no storage, no network. Display only.
 *
 * ★ HONEST OR SILENT. The fact is read from the student's OWN session records (the same store the
 * Mistake Intelligence card and Me read: `SessionRecord.fourType`, written by recordFourTypeAndMarks),
 * never estimated. It is established only when ALL hold; any doubt returns null (nothing shows):
 *   - the result on screen IS the newest graded result of a counting surface (worksheet, chapter
 *     test, full mock, Check & Improve — Quick Practice's record is non-counting and never used),
 *     and its record is `graded` (no unread/pending question hides a mistake) and ≥ 5 marks;
 *   - its subject is unambiguous (a Maths + Science paper is skipped), and so is each earlier one;
 *   - the type T appeared (count ≥ 1) in AT LEAST TWO of the student's previous graded results for
 *     that subject (the latest five are looked at, each ≥ 5 marks);
 *   - the newest result has NONE of T, AND the data shows the mistake typing was live for it: either
 *     it lost no marks at all, or it carries at least one typed mistake of another type. ("It had
 *     questions where T could occur": a graded paper of ≥ 5 marks with typed output. The record does
 *     not say which question could have held T, so this is the honest limit; nothing finer is claimed.)
 *   - this type has not been celebrated in the last 7 days (marks `a`, ./companion/companionModel).
 */
import type { SessionRecord, SessionSurface } from "../../services/sessionRecords";
import { loadLocalSessionRecords, sessionRecordSubjects } from "../../services/sessionRecords";
import { MISTAKE_TYPE_LABEL } from "../../lib/mistakeDisplay";
import { guidePreviewActive } from "./guideVariant";
import { getActiveProgressUser } from "../../services/studentProgressStore";
import { WEEK_MS, marksFor, readMarks, writeMarks } from "./companion/companionModel";

export type AhaType = "conceptual" | "calculation" | "silly" | "presentation";
export const AHA_TYPES: readonly AhaType[] = ["conceptual", "calculation", "silly", "presentation"];

/** Surfaces whose records COUNT toward Mistake Intelligence (sessionRecords.ts LOCKED §1a). */
const COUNTING: ReadonlySet<SessionSurface> = new Set<SessionSurface>(["worksheet", "chapter-test", "full-mock", "check-improve"]);

/** A result smaller than this cannot establish a pattern either way. */
export const AHA_MIN_MARKS = 5;
/** How many earlier results are looked at, and how many must have held the type. */
export const AHA_LOOKBACK = 5;
export const AHA_MIN_PRIOR = 2;

/** The two lines (Ziggy, then Byte). `{name}` is the display label from lib/mistakeDisplay (MISTAKE_TYPE_LABEL, the one display module - guard G4); no digits. */
export const AHA_COPY = {
  ziggy: "Aha! No {name} this time. It showed up in your earlier results.",
  byte: "That's a real change. Keep checking each step the same way.",
} as const;

export interface AhaFact {
  type: AhaType;
}

const usable = (r: SessionRecord) => COUNTING.has(r.surface) && r.status === "graded" && r.marksTotal >= AHA_MIN_MARKS;
const single = (r: SessionRecord) => sessionRecordSubjects(r).length === 1;
const typedTotal = (r: SessionRecord) => AHA_TYPES.reduce((n, t) => n + (Number(r.fourType?.[t]) || 0), 0);

export function ahaFor(a: {
  records: readonly SessionRecord[];
  /** The scorecard's result id (ScorecardVariant.parentResultRef); null → nothing. */
  resultId: string | null | undefined;
  now: number;
  /** companion marks `a`: when each type last showed. */
  lastShown?: Partial<Record<AhaType, number>>;
}): AhaFact | null {
  if (!a.resultId) return null;
  const counting = a.records.filter((r) => COUNTING.has(r.surface));
  const newest = counting.reduce<SessionRecord | null>((best, r) => (best === null || r.gradedAt > best.gradedAt ? r : best), null);
  if (!newest || newest.id !== a.resultId || !usable(newest) || !single(newest)) return null;
  const subject = newest.subject;
  const prior = counting
    .filter((r) => r.id !== newest.id && r.gradedAt < newest.gradedAt && r.subject === subject && single(r) && usable(r))
    .sort((x, y) => y.gradedAt - x.gradedAt)
    .slice(0, AHA_LOOKBACK);
  if (prior.length < AHA_MIN_PRIOR) return null;
  const lostNothing = newest.marksAwarded >= newest.marksTotal;
  if (!lostNothing && typedTotal(newest) === 0) return null; // marks lost but nothing typed: absence unproven
  for (const t of AHA_TYPES) {
    if ((Number(newest.fourType?.[t]) || 0) !== 0) continue;
    const hits = prior.filter((r) => (Number(r.fourType?.[t]) || 0) > 0).length;
    if (hits < AHA_MIN_PRIOR) continue;
    const last = a.lastShown?.[t];
    if (typeof last === "number" && a.now - last < WEEK_MS) continue;
    return { type: t };
  }
  return null;
}

export function ahaLines(f: AhaFact): { ziggy: string; byte: string } {
  return { ziggy: AHA_COPY.ziggy.replace("{name}", MISTAKE_TYPE_LABEL[f.type]), byte: AHA_COPY.byte };
}

/**
 * The fact for the result on screen, read from this device's records for the active account (null if
 * unknowable). The clock is read ONLY once there are enough records to matter, so a scorecard with no
 * history never touches it (and no unrelated test becomes clock-sensitive).
 */
export function currentAha(resultId: string | null | undefined): AhaFact | null {
  try {
    const uid = getActiveProgressUser();
    if (!uid || !resultId) return null;
    const records = loadLocalSessionRecords(uid);
    if (records.length <= AHA_MIN_PRIOR) return null;
    return ahaFor({ records, resultId, now: Date.now(), lastShown: marksFor(uid).a });
  } catch {
    return null;
  }
}

/** The aha was DRAWN: this type rests for a week (companion marks; skipped under an admin preview). */
export function noteAhaShown(type: AhaType, now: number): void {
  if (guidePreviewActive()) return; // an admin preview never marks the student's week
  try {
    const uid = getActiveProgressUser();
    if (!uid) return;
    writeMarks(uid, { a: { ...readMarks(uid).a, [type]: now } });
  } catch {
    /* nothing stored */
  }
}
