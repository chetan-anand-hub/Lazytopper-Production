'use strict';
// PACKS-SERVER-1 - GET /api/packs/mine: the PDF packs the verified caller owns, plus the licensee
// (name + email) the client prints on every page. AUTH REQUIRED (401 otherwise).
//
// Deliberately NOT behind PACKS_ENABLED: a pack a student paid for stays downloadable if the flag is
// ever turned off (contract §1). The licensee comes from the server's own auth record for the VERIFIED
// uid (deps.getLicensee) - never from a header, query or body.

const { listPacks } = require('../services/packGrant.cjs');
const { boardPassCreditFor } = require('../services/packCredit.cjs');
const { quotePass } = require('./payments.cjs');

const PACKS_MINE_PATH = '/api/packs/mine';
/** The subscription document the Board Pass quote is read from (same collection passGrant writes). */
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

function createPackRoutes(deps = {}) {
  const { sendJson, verifiedCaller, adminFirestore, getLicensee, telemetry, cbqTutorTaste, now = () => Date.now(), foundingOfferOpen } = deps;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  async function handleMine(req, res) {
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    if (!adminFirestore) {
      emit('packs.mine.unavailable');
      return sendJson(res, 503, { ok: false, error: 'Packs are unavailable right now.' });
    }
    // The licensee is printed on every page of every PDF: without a real email there is nothing safe to
    // print, so refuse (503) rather than hand back blanks. Checked first; nothing about the packs is sent.
    let licensee = null;
    try {
      const got = typeof getLicensee === 'function' ? await getLicensee(uid) : null;
      const email = got && typeof got.email === 'string' ? got.email.trim() : '';
      if (email) licensee = { name: typeof got.name === 'string' ? got.name : '', email };
    } catch {
      /* falls through to licensee_unavailable */
    }
    if (!licensee) {
      emit('packs.mine.licensee_unavailable');
      return sendJson(res, 503, { ok: false, error: 'licensee_unavailable' });
    }
    let packs;
    try {
      packs = await listPacks(adminFirestore, uid);
    } catch (e) {
      emit('packs.mine.read_failed');
      console.error('[packs/mine] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not read your packs.' });
    }
    // PACK-CREDIT-1: what the student's recent packs take off a Board Pass right now, and what the server says
    // the student would then pay (payInr = the server's Board Pass quote less the credit). READ ONLY. A failed
    // or doubtful read is credit 0 (the packs themselves are still returned). The order route decides the
    // amount actually charged, again, with the same rule.
    let boardPassCredit = { creditInr: 0, expiresAtMs: null, payInr: null };
    try {
      const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
      const stored = snap && snap.exists ? snap.data() || {} : {};
      const nowMs = now();
      const quote = quotePass(stored, 'till_boards', nowMs, { foundingOfferOpen });
      const credit = await boardPassCreditFor(adminFirestore, uid, 'till_boards', quote.pricePaidInr, nowMs);
      if (credit.readFailed) emit('packs.mine.credit_read_failed');
      if (credit.creditInr > 0) {
        boardPassCredit = { creditInr: credit.creditInr, expiresAtMs: credit.expiresAtMs, payInr: quote.pricePaidInr - credit.creditInr };
      }
    } catch {
      emit('packs.mine.credit_read_failed');
    }
    // CBQ-TUTOR-TASTE-1: how many of the 3 CBQ-Pack tutor questions are left. READ ONLY, additive, and present only
    // for a student who owns a CBQ Pack (the client shows its banner from it, and only to a non-Premium student).
    let tutorTaste;
    try {
      if (packs.some((p) => p.sku === 'pack_cbq') && cbqTutorTaste && typeof cbqTutorTaste.status === 'function') {
        const t = await cbqTutorTaste.status(uid);
        if (t && t.owned) tutorTaste = { used: t.used, left: t.left, limit: t.limit };
      }
    } catch {
      tutorTaste = undefined;
    }
    return sendJson(res, 200, { packs, licensee, boardPassCredit, ...(tutorTaste ? { tutorTaste } : {}) });
  }

  return { handleMine };
}

module.exports = { createPackRoutes, PACKS_MINE_PATH };
