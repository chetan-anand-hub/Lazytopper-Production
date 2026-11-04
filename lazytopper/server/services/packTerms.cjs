'use strict';
// REDOWNLOAD-ENFORCE-1 - the pack re-download date, decided on the SERVER (owner ruling 3-4 Nov 2026).
//
// ONE place on the server. The client copy lives in src/lib/packs/packLabels.ts (redownloadUntilFor); a vitest
// (src/lib/packs/packTerms.serverParity.test.ts) requires this file and pins the two together, so they cannot drift.
//
//   Paid AT or AFTER 5 Nov 2026 00:00 IST  -> downloadable until 31 March 2027, end of day IST.
//   Paid BEFORE the cut-off                -> until 31 May 2027, end of day IST (the date already printed on their covers).
//   Paid time unknown / unusable           -> 31 May 2027 (generous: never cut short someone who may have been promised May).
//
// ★ The clock is ALWAYS the server's (callers pass their injected `now()`); nothing here reads a client time.
// ★ Ending a re-download window removes nothing: the entitlement document stays (history, admin, receipts); callers only
//   stop SERVING the pack (My packs list, the download-limit cover rule).

/** 5 Nov 2026 00:00 IST. packCredit.cjs's PACK_CREDIT_CUTOFF_MS is this same instant (the two terms change together). */
const PACK_TERMS_CUTOFF_MS = Date.parse('2026-11-05T00:00:00+05:30');

const REDOWNLOAD_UNTIL = '31 March 2027';
const REDOWNLOAD_UNTIL_LEGACY = '31 May 2027';
/** The LAST millisecond a pack can still be downloaded (end of the day, IST). */
const REDOWNLOAD_ENDS_MS = Date.parse('2027-03-31T23:59:59.999+05:30');
const REDOWNLOAD_ENDS_LEGACY_MS = Date.parse('2027-05-31T23:59:59.999+05:30');

/** A stored paidAt (ms number, Date, or Firestore Timestamp) as ms, or null when unusable. */
function paidAtMsOf(value) {
  let ms = null;
  if (typeof value === 'number') ms = value;
  else if (value instanceof Date) ms = value.getTime();
  else if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
    try {
      ms = value.toMillis();
    } catch {
      ms = null;
    }
  }
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : null;
}

function isNewTerms(paidAt) {
  const ms = paidAtMsOf(paidAt);
  return ms !== null && ms >= PACK_TERMS_CUTOFF_MS;
}

/** The last ms the pack paid at `paidAt` may be downloaded. PURE. */
function redownloadEndsMsFor(paidAt) {
  return isNewTerms(paidAt) ? REDOWNLOAD_ENDS_MS : REDOWNLOAD_ENDS_LEGACY_MS;
}

/** "31 March 2027" / "31 May 2027" for the pack paid at `paidAt` (same words as the client's redownloadUntilFor). PURE. */
function redownloadUntilFor(paidAt) {
  return isNewTerms(paidAt) ? REDOWNLOAD_UNTIL : REDOWNLOAD_UNTIL_LEGACY;
}

/** Is the pack's re-download window still open at the server's `nowMs`? Boundary: the whole last day (IST) is open. */
function isRedownloadOpen(pack, nowMs) {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) return true; // no usable clock: never cut a student off on a bug
  return nowMs <= redownloadEndsMsFor(pack && pack.paidAt);
}

/**
 * Split an owned-pack list at `nowMs`. `open` keeps the input objects and their order untouched (so a response built from
 * it before the date is byte-identical to today's). `ended` carries what the honest "ended" line needs.
 * @returns {{ open: object[], ended: { packId: string, sku: string, target: string, paidAt: any, redownloadUntil: string, endedAtMs: number }[] }}
 */
function splitByRedownload(packs, nowMs) {
  const open = [];
  const ended = [];
  for (const p of Array.isArray(packs) ? packs : []) {
    if (isRedownloadOpen(p, nowMs)) {
      open.push(p);
      continue;
    }
    ended.push({
      packId: p.packId,
      sku: p.sku,
      target: p.target,
      paidAt: p.paidAt,
      redownloadUntil: redownloadUntilFor(p.paidAt),
      endedAtMs: redownloadEndsMsFor(p.paidAt),
    });
  }
  return { open, ended };
}

module.exports = {
  PACK_TERMS_CUTOFF_MS,
  REDOWNLOAD_UNTIL,
  REDOWNLOAD_UNTIL_LEGACY,
  REDOWNLOAD_ENDS_MS,
  REDOWNLOAD_ENDS_LEGACY_MS,
  paidAtMsOf,
  redownloadEndsMsFor,
  redownloadUntilFor,
  isRedownloadOpen,
  splitByRedownload,
};
