'use strict';
/**
 * adminKeyDisputes - TUTOR-KEY-TRUST-1. The admin "Disputed answer keys" queue.
 *
 *   GET  /api/admin/key-disputes                 -> { ok, items: [...] }   read-only
 *   POST /api/admin/key-disputes/resolve {questionId, resolved}  -> { ok }  marks the summary resolved
 *
 * ADMIN-ONLY through the one shared gate (`requireAdmin`, ADMIN_FIREBASE_UIDS), run FIRST, before the body is
 * read. A missing gate is a 503, so it cannot fall open by being mounted wrong. Resolving only flips a flag on
 * the summary doc; fixing the key itself is a data lane. A newer report re-opens a resolved question.
 */
const { fileHintOf } = require('../services/keyTrust.cjs');
const { QID_RE } = require('../services/keyDisputes.cjs');

const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });
const LIST_CAP = 300;
const SHOWN_CAP = 100;

const msOf = (v) => (v instanceof Date ? v.getTime() : v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);
const n = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

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
      const snap = await adminFirestore.collection('keyDisputes').limit(LIST_CAP).get();
      const rows = [];
      snap.forEach((d) => {
        const v = d.data() || {};
        const c = v.counts && typeof v.counts === 'object' ? v.counts : {};
        const counts = { mismatch: n(c.mismatch), opinion: n(c.opinion), challenge: n(c.challenge) };
        rows.push({
          questionId: d.id,
          source: typeof v.source === 'string' ? v.source : '',
          fileHint: typeof v.fileHint === 'string' && v.fileHint ? v.fileHint : fileHintOf(d.id),
          counts,
          total: counts.mismatch + counts.opinion + counts.challenge,
          lastAtMs: msOf(v.lastAt),
          resolved: v.resolved === true,
        });
      });
      rows.sort((a, b) => b.counts.mismatch - a.counts.mismatch || b.total - a.total || (b.lastAtMs || 0) - (a.lastAtMs || 0));
      const shown = rows.slice(0, SHOWN_CAP);
      const items = [];
      for (const r of shown) {
        let latest = [];
        let firstAtMs = null;
        try {
          const reports = adminFirestore.collection('keyDisputes').doc(r.questionId).collection('reports');
          const recent = await reports.orderBy('at', 'desc').limit(3).get();
          recent.forEach((d) => {
            const v = d.data() || {};
            latest.push({ kind: String(v.kind || ''), reason: String(v.reason || ''), studentChallenge: String(v.studentChallenge || ''), atMs: msOf(v.at) });
          });
          const oldest = await reports.orderBy('at', 'asc').limit(1).get();
          oldest.forEach((d) => { firstAtMs = msOf((d.data() || {}).at); });
        } catch {
          latest = [];
        }
        items.push({ ...r, latest, firstAtMs });
      }
      return send(res, 200, { ok: true, items, truncated: rows.length > shown.length });
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
      await adminFirestore.collection('keyDisputes').doc(questionId).set(
        resolved ? { resolved: true, resolvedAt: new Date(), resolvedBy: auth.uid } : { resolved: false },
        { merge: true },
      );
      return send(res, 200, { ok: true, questionId, resolved });
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
