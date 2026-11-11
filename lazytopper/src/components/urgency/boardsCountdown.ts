/**
 * URGENCY-1 (owner, 11 Nov 2026) - the boards countdown strip's words. PURE: the clock is an argument.
 *
 * The CBSE Class 10 boards start 16 Feb 2027 (date sheet released 6 Nov 2026). Pre-boards are set by each school (round 1 December 2026,
 * round 2 January 2027), so no specific pre-board date is ever claimed. The day count and the phase are computed on the IST calendar date.
 */
export const BOARDS_START_ISO = "2027-02-16";
const BOARDS_START_UTC_DAY = Date.parse(`${BOARDS_START_ISO}T00:00:00Z`) / 86_400_000;
const IST_OFFSET_MS = 5.5 * 3_600_000;
const PRACTISE = "Practise the real paper pattern now.";

/** The IST calendar date of an instant, as whole days since 1970-01-01 (UTC midnights of that IST date). */
export function istDayNumber(nowMs: number): number {
  return Math.floor((nowMs + IST_OFFSET_MS) / 86_400_000);
}

/** Whole IST calendar days from today until the boards start (0 on the day itself, negative after). */
export function daysToBoards(nowMs: number): number {
  return BOARDS_START_UTC_DAY - istDayNumber(nowMs);
}

export function boardsDaysLabel(n: number): string {
  return n === 1 ? "1 day" : `${n} days`;
}

/** The strip's sentence, or null from 16 Feb 2027 (IST) on. */
export function boardsCountdownCopy(nowMs: number = Date.now()): string | null {
  const n = daysToBoards(nowMs);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ist = new Date(nowMs + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth(); // 0 = Jan
  const boards = `Boards in ${boardsDaysLabel(n)}.`;
  if (year === 2026 && month === 11) return `Pre-boards are on. ${boards} ${PRACTISE}`;
  if (year === 2026) return `Pre-boards in December. ${boards} ${PRACTISE}`;
  return `${boards} ${PRACTISE}`;
}

/** The pack-tile line (Mock Pack, Maths + Science Bundle). Never "answer key"; never says a pack includes LazyTopper marking. */
export const PACK_PREBOARD_LINE =
  "Sit your pre-board before your pre-board. Check it yourself with the worked solutions — or get it marked like a CBSE examiner with the Board Pass.";
export const PACK_PREBOARD_LINE_SHORT =
  "Pre-board practice: self-check with worked solutions, or get CBSE-examiner marking with the Board Pass.";
