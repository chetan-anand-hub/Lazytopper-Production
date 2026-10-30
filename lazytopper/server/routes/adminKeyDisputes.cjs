'use strict';
/**
 * adminKeyDisputes - TUTOR-KEY-TRUST-1. The admin "Disputed answer keys" queue.
 *
 *   GET  /api/admin/key-disputes                 -> { ok, items: [...] }   read-only
 *   POST /api/admin/key-disputes/resolve {questionId, resolved}  -> { ok }  marks the summary resolved
 *
 * ADMIN-ONLY through the one shared gate (`requireAdmin`, ADMIN_FIREBASE_UIDS), run FIRST, before the body is
 * read. A missing gate is a 503, so it cannot fall open by being mounted wrong. Resolving marks the question's
 * EXISTING reports resolved; fixing the key itself is a data lane. A newer report is unresolved, so it re-opens it.
 */
const { fileHintOf } = require('../services/keyTrust.cjs');
const { QID_RE } = require('../services/keyDisputes.cjs');

const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const READ_CAP = 2000;
const SHOWN_CAP = 100;

const msOf = (v) => (v instanceof Date ? v.getTime() : v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);

function createAdminKeyDisputesRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, readJson, adminFirestore, requireAdmin } = deps;
  const send = (res, status, body) =>
    typeof sendJsonWithHeaders === 'function' ? sendJsonWithHeaders(res, status, body, NO_STORE) : sendJson(res, status, body);

  async function gate(req, res) {
    if (typeof requireAdmin !== 'function') {
      send(res, 503, { ok: false, error: 'Admin endpoints disabled: admin gate not configured' });
      return null;
    }
    const auth = await requireAdmin(req);
    if (!auth || !auth.ok || !auth.uid) {
      send(res, (auth && auth.status) || 503, { ok: false, error: (auth && auth.error) || 'Admin auth unavailable' });
      return null;
    }
    if (!adminFirestore) {
      send(res, 503, { ok: false, error: 'firebase-admin Firestore is not initialised on this deploy' });
      return null;
    }
    return auth;
  }

  async function list(req, res) {
    if (!(await gate(req, res))) return;
    try {
      const snap = await adminFirestore.collection('keyDisputeReports').orderBy('at', 'desc').limit(READ_CAP).get();
      const by = new Map();
      snap.forEach((d) => {
        const v = d.data() || {};
        const qid = typeof v.questionId === 'string' ? v.questionId : '';
        if (!qid) return;
        const kind = v.kind === 'mismatch' || v.kind === 'opinion' || v.kind === 'challenge' ? v.kind : null;
        if (!kind) return;
        let r = by.get(qid);
        if (!r) {
          r = { questionId: qid, source: '', fileHint: fileHintOf(qid), counts: { mismatch: 0, opinion: 0, challenge: 0 }, total: 0, lastAtMs: null, firstAtMs: null, resolved: true, latest: [] };
          by.set(qid, r);
        }
        r.counts[kind] += 1;
        r.total += 1;
        if (!r.source && typeof v.source === 'string') r.source = v.source;
        if (v.resolved !== true) r.resolved = false;
        const at = msOf(v.at);
        if (at !== null) {
          if (r.lastAtMs === null || at > r.lastAtMs) r.lastAtMs = at;
          if (r.firstAtMs === null || at < r.firstAtMs) r.firstAtMs = at;
        }
        r.latest.push({ kind, reason: String(v.reason || ''), studentChallenge: String(v.studentChallenge || ''), atMs: at });
      });
      const rows = [...by.values()];
      for (const r of rows) r.latest = r.latest.sort((a, b) => (b.atMs || 0) - (a.atMs || 0)).slice(0, 3);
      rows.sort((a, b) => b.counts.mismatch - a.counts.mismatch || b.total - a.total || (b.lastAtMs || 0) - (a.lastAtMs || 0));
      return send(res, 200, { ok: true, items: rows.slice(0, SHOWN_CAP), truncated: rows.length > SHOWN_CAP || snap.size >= READ_CAP });
    } catch (e) {
      console.error('[key-disputes] list failed:', e && e.message);
      return send(res, 500, { ok: false, error: 'Could not read the disputed keys' });
    }
  }

  async function resolve(req, res) {
    const auth = await gate(req, res);
    if (!auth) return;
    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: 'Invalid JSON' }); }
    const b = body && typeof body === 'object' ? body : {};
    const questionId = String(b.questionId || '');
    if (!QID_RE.test(questionId)) return send(res, 400, { ok: false, error: 'Provide a valid questionId' });
    const resolved = b.resolved !== false;
    try {
      const snap = await adminFirestore.collection('keyDisputeReports').where('questionId', '==', questionId).get();
      const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
      for (const d of docs) await d.ref.update(resolved ? { resolved: true, resolvedAt: new Date(), resolvedBy: auth.uid } : { resolved: false });
      return send(res, 200, { ok: true, questionId, resolved, updated: docs.length });
    } catch (e) {
      console.error('[key-disputes] resolve failed:', e && e.message);
      return send(res, 500, { ok: false, error: 'Could not update the dispute' });
    }
  }

  return { list, resolve };
}

let mounted = null;
function handleAdminKeyDisputes(req, res, deps) {
  if (!mounted) mounted = createAdminKeyDisputesRoutes(deps);
  return String(req.method).toUpperCase() === 'POST' ? mounted.resolve(req, res) : mounted.list(req, res);
}

module.exports = { createAdminKeyDisputesRoutes, handleAdminKeyDisputes };
