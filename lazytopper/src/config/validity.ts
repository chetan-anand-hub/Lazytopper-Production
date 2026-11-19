/**
 * VALIDITY-FEB27 (owner ruling 19 Nov 2026, 22:00 IST) - ONE client-side end date for the Test Series Pack and the Board Pass.
 *
 * Both are valid until 28 Feb 2027, 23:59:59 IST. Why: CBSE Class 10 Phase 1 is Maths on 17 Feb and Science on 22 Feb 2027 (date sheet
 * released 6 Nov 2026), so "till 17 Feb" cut a Board Pass holder off before Science. The optional improvement exam (May 2027) will be a
 * separate product. PDF packs' own re-download dates (packLabels.ts / packTerms.cjs) are NOT touched.
 *
 * The SERVER copy is server/services/validityWindow.cjs; src/config/validity.parity.test.ts requires it and pins the two together.
 * Pure constants + pure functions: NO clock read here (the prerender may import this module and bake the FIXED date "28 Feb 2027").
 */

export const VALIDITY_END_ISO = "2027-02-28";
/** The LAST millisecond of validity: 28 Feb 2027, 23:59:59.999 IST. */
export const VALIDITY_END_MS = Date.parse(`${VALIDITY_END_ISO}T23:59:59.999+05:30`);
/** The short date every surface prints. */
export const VALIDITY_LABEL = "28 Feb 2027";
/** Short form: chips, buttons, tight rows. */
export const VALIDITY_SHORT = `valid till ${VALIDITY_LABEL}`;
/** Long form: the one sentence under a price, on a sheet, on a page. */
export const VALIDITY_LONG = `One payment, valid till ${VALIDITY_LABEL} — covers your Maths (17 Feb) and Science (22 Feb) boards.`;
/** The end every Board Pass granted BEFORE this change carries: the last ms of 17 Feb 2027 IST. A stored end earlier than this is never raised. */
export const OLD_BOARD_PASS_END_MS = Date.parse("2027-02-17T23:59:59.999+05:30");

/**
 * The end a NEW Board Pass granted at `nowMs` gets (the server decides; this is the mirror the parity test pins): 28 Feb 2027
 * end-of-day IST, rolling to the same day of the next year once that instant has passed so a pass is never born expired.
 */
export function validityEndMsFor(nowMs: number): number {
  let end = VALIDITY_END_MS;
  if (!Number.isFinite(nowMs)) return end;
  let year = 2027;
  while (end < nowMs && year < 2100) {
    year += 1;
    end = Date.parse(`${year}-02-28T23:59:59.999+05:30`);
  }
  return end;
}

/**
 * PURE. The end a stored pass is READ as: a `till_boards` pass whose stored end is in [OLD_BOARD_PASS_END_MS, VALIDITY_END_MS) reads
 * as VALIDITY_END_MS. NEVER lowers an end (a later stored end is returned unchanged); a pass stored with an end BEFORE the old Board
 * Pass end (ended early by an admin, refunded / revoked, last session's) is returned unchanged (nothing ended on purpose is resurrected). Mirror of validityWindow.cjs effectiveBoardPassEndMs.
 */
export function effectiveBoardPassEndMs(passType: unknown, storedEndMs: number): number {
  if (!Number.isFinite(storedEndMs)) return storedEndMs;
  if (passType !== "till_boards") return storedEndMs;
  if (storedEndMs >= VALIDITY_END_MS) return storedEndMs;
  if (storedEndMs < OLD_BOARD_PASS_END_MS) return storedEndMs;
  return VALIDITY_END_MS;
}
