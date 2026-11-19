'use strict';
// VALIDITY-FEB27 (owner ruling 19 Nov 2026, 22:00 IST) - ONE server-side end date for the Test Series Pack and the Board Pass.
//
//   Both are valid until 28 Feb 2027, 23:59:59.999 IST. Why: CBSE Class 10 Phase 1 is Maths on 17 Feb and Science on 22 Feb 2027
//   (date sheet released 6 Nov 2026), so "till 17 Feb" cut a Board Pass holder off before the Science paper. The optional
//   improvement exam (May 2027) will be a separate product. PDF packs' own re-download dates (packTerms.cjs) are NOT touched.
//
// The client copy lives in src/config/validity.ts; src/config/validity.parity.test.ts requires THIS file and pins the two together.
//
// EXISTING Board Pass holders (read-time rule, never a write):
//   `effectiveBoardPassEndMs(passType, storedEndMs)` raises a stored `till_boards` pass whose end is the OLD Board Pass end
//   (end of 17 Feb 2027 IST - what every grant before this change wrote) or later, but before VALIDITY_END_MS, up to VALIDITY_END_MS.
//   It NEVER lowers an end: a stored end at or after VALIDITY_END_MS (a later admin extension, a later grant) is returned unchanged.
//   A stored end BEFORE the old Board Pass end (a pass an admin ended early, a refunded / revoked pass, last session's pass) is returned
//   unchanged, so nothing that was ended on purpose is ever resurrected.
//   Nothing is written to Firestore: every reader that already honours `passEnd` goes through this function.

const IST = '+05:30';
const VALIDITY_END_ISO = '2027-02-28';
/** The LAST millisecond of validity: 28 Feb 2027, 23:59:59.999 IST. */
const VALIDITY_END_MS = Date.parse(`${VALIDITY_END_ISO}T23:59:59.999${IST}`);
/** The short date every surface prints. */
const VALIDITY_LABEL = '28 Feb 2027';
/** The end every Board Pass granted BEFORE this change carries: the last ms of 17 Feb 2027 IST. A stored end earlier than this is never raised. */
const OLD_BOARD_PASS_END_MS = Date.parse(`2027-02-17T23:59:59.999${IST}`);

/**
 * The validity end a NEW Board Pass granted at `nowMs` gets: 28 Feb 2027 end-of-day IST; once that instant has passed, the same
 * day of the next year(s) (so a pass sold after it is never born expired - the same roll predictBoardDateIso does for the boards).
 */
function validityEndMsFor(nowMs) {
  let end = VALIDITY_END_MS;
  if (!Number.isFinite(nowMs)) return end;
  let year = 2027;
  while (end < nowMs && year < 2100) {
    year += 1;
    // 28 Feb exists every year; end of that day IST.
    end = Date.parse(`${year}-02-28T23:59:59.999${IST}`);
  }
  return end;
}

/**
 * PURE. The end a stored pass is READ as. `storedEndMs` is the stored `passEnd` in ms (null/NaN = none readable).
 * Only a `till_boards` pass whose end is in [OLD_BOARD_PASS_END_MS, VALIDITY_END_MS) is raised; everything else is returned as
 * given. Never lowers.
 */
function effectiveBoardPassEndMs(passType, storedEndMs) {
  if (typeof storedEndMs !== 'number' || !Number.isFinite(storedEndMs)) return storedEndMs;
  if (passType !== 'till_boards') return storedEndMs;
  if (storedEndMs >= VALIDITY_END_MS) return storedEndMs;
  if (storedEndMs < OLD_BOARD_PASS_END_MS) return storedEndMs;
  return VALIDITY_END_MS;
}

module.exports = { VALIDITY_END_ISO, VALIDITY_END_MS, VALIDITY_LABEL, OLD_BOARD_PASS_END_MS, validityEndMsFor, effectiveBoardPassEndMs };
