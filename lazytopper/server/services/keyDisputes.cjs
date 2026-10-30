'use strict';
/**
 * keyDisputes - TUTOR-KEY-TRUST-1. Server-only Firestore writes/reads for disputed answer keys.
 *
 *   keyDisputes/{questionId}                      summary: source, fileHint, counts {mismatch, opinion, challenge},
 *                                                 firstAt, lastAt, resolved
 *   keyDisputes/{questionId}/reports/{uid_day_kind}   one report per (question, uid, IST day, kind)
 *
 * Written ONLY by the Admin SDK (the tutor route, the admin route): no client write path and no rules change
 * (the collection stays deny-all to clients). The report id is deterministic, written with create(), so a
 * repeat in the same day fails ALREADY_EXISTS and the whole batch (report + counter bump) is dropped: the
 * dedupe and the counters can never disagree.
 */
const { istDayKey } = require('./rateLimiter.cjs');
const { scrubChallenge, fileHintOf, FLAG_KINDS } = require('./keyTrust.cjs');

const KINDS = new Set([...FLAG_KINDS, 'challenge']);
const QID_RE = /^[A-Za-z0-9._-]{1,120}$/;

function fieldValueOf(firebaseAdmin) {
  const FV = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
  return FV && typeof FV.increment === 'function' ? FV : null;
}

/**
 * Record one report. Returns { written: boolean, reason? }. Never throws (a failed log must not fail the tutor).
 * `report`: { questionId, uid, kind, reason, source, studentChallenge, keyAtTime }
 */
async function recordKeyDispute({ firestore, firebaseAdmin, nowMs = Date.now() }, report) {
  try {
    if (!firestore || typeof firestore.collection !== 'function') return { written: false, reason: 'no-firestore' };
    const questionId = String(report && report.questionId || '');
    const uid = String(report && report.uid || '');
    const kind = String(report && report.kind || '');
    if (!QID_RE.test(questionId) || !uid || !KINDS.has(kind)) return { written: false, reason: 'invalid' };
    const FV = fieldValueOf(firebaseAdmin);
    const day = istDayKey(nowMs);
    const parentRef = firestore.collection('keyDisputes').doc(questionId);
    const reportRef = parentRef.collection('reports').doc(`${uid}_${day}_${kind}`);
    const at = new Date(nowMs);
    const source = String(report.source || '').slice(0, 120);
    const body = {
      questionId,
      source,
      kind,
      reason: String(report.reason || '').slice(0, 200),
      studentChallenge: scrubChallenge(report.studentChallenge),
      keyAtTime: String(report.keyAtTime || '').slice(0, 200),
      uid,
      day,
      at,
    };
    const bump = FV ? FV.increment(1) : 1;
    const batch = firestore.batch();
    batch.create(reportRef, body);
    batch.set(
      parentRef,
      { questionId, source, fileHint: fileHintOf(questionId), counts: { [kind]: bump }, lastAt: at, resolved: false },
      { merge: true },
    );
    // firstAt / the latest reasons are read from the reports themselves (admin route), so nothing here races.
    await batch.commit();
    return { written: true };
  } catch (e) {
    const code = e && (e.code || e.status);
    if (code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS') return { written: false, reason: 'duplicate' };
    console.error('[key-disputes] write failed:', e && e.message);
    return { written: false, reason: 'error' };
  }
}

module.exports = { recordKeyDispute, KINDS, QID_RE };
