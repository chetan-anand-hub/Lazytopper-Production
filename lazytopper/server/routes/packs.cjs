'use strict';
// PACKS-SERVER-1 - GET /api/packs/mine: the PDF packs the verified caller owns, plus the licensee
// (name + email) the client prints on every page. AUTH REQUIRED (401 otherwise).
//
// Deliberately NOT behind PACKS_ENABLED: a pack a student paid for stays downloadable if the flag is
// ever turned off (contract §1). The licensee comes from the server's own auth record for the VERIFIED
// uid (deps.getLicensee) - never from a header, query or body.

const { listPacks } = require('../services/packGrant.cjs');

const PACKS_MINE_PATH = '/api/packs/mine';

function createPackRoutes(deps = {}) {
  const { sendJson, verifiedCaller, adminFirestore, getLicensee, telemetry } = deps;

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
    return sendJson(res, 200, { packs, licensee });
  }

  return { handleMine };
}

module.exports = { createPackRoutes, PACKS_MINE_PATH };
