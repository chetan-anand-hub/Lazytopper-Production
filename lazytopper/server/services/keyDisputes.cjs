'use strict';
/**
 * keyDisputes - TUTOR-KEY-TRUST-1. Server-only Firestore writes for disputed answer keys.
 *
 *   keyDisputeReports/{uid}_{day}_{kind}_{questionId}   ONE root collection, FIELD-KEYED (a `uid` field), so the
 *                                                       DPDP erasure / export walkers reach it with a plain
 *                                                       where('uid','==',uid) (see STUDENT_DATA_MAP).
 *
 * Written ONLY by the Admin SDK (the tutor route): no client write path and no rules change (the collection stays
 * deny-all to clients). The id is deterministic and written with create(), so a repeat in the same IST day fails
 * ALREADY_EXISTS: one report per (question, uid, day, kind). A per-process memo short-circuits repeats before
 * Firestore, and a per-uid daily cap bounds a spammer.
 */
const { istDayKey } = require('./rateLimiter.cjs');
const { scrubChallenge, fileHintOf, FLAG_KINDS } = require('./keyTrust.cjs');

const KINDS = new Set([...FLAG_KINDS, 'challenge']);
const QID_RE = /^[A-Za-z0-9._-]{1,120}$/;

const PER_UID_DAILY_CAP = 10;
const seen = new Set(); // `${day}|${uid}|${questionId}|${kind}`
const perUid = new Map(); // `${day}|${uid}` -> count
function resetMemo() {
  seen.clear();
  perUid.clear();
}

/**
 * Record one report. Returns { written: boolean, reason? }. Never throws (a failed log must not fail the tutor).
 * `report`: { questionId, uid, kind, reason, source, studentChallenge, keyAtTime }
 */
async function recordKeyDispute({ firestore, nowMs = Date.now() }, report) {
  try {
    if (!firestore || typeof firestore.collection !== 'function') return { written: false, reason: 'no-firestore' };
    const questionId = String((report && report.questionId) || '');
    const uid = String((report && report.uid) || '');
    const kind = String((report && report.kind) || '');
    if (!QID_RE.test(questionId) || !uid || !KINDS.has(kind)) return { written: false, reason: 'invalid' };
    const day = istDayKey(nowMs);
    const memo = `${day}|${uid}|${questionId}|${kind}`;
    if (seen.has(memo)) return { written: false, reason: 'duplicate' };
    const capKey = `${day}|${uid}`;
    if ((perUid.get(capKey) || 0) >= PER_UID_DAILY_CAP) return { written: false, reason: 'cap' };
    seen.add(memo);
    perUid.set(capKey, (perUid.get(capKey) || 0) + 1);
    if (seen.size > 20000) resetMemo();
    const body = {
      questionId,
      source: String(report.source || '').slice(0, 120),
      fileHint: fileHintOf(questionId),
      kind,
      reason: String(report.reason || '').slice(0, 200),
      studentChallenge: scrubChallenge(report.studentChallenge),
      keyAtTime: String(report.keyAtTime || '').slice(0, 200),
      uid,
      day,
      at: new Date(nowMs),
      resolved: false,
    };
    await firestore.collection('keyDisputeReports').doc(`${uid}_${day}_${kind}_${questionId}`).create(body);
    return { written: true };
  } catch (e) {
    const code = e && (e.code || e.status);
    if (code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS') return { written: false, reason: 'duplicate' };
    console.error('[key-disputes] write failed:', e && e.message);
    return { written: false, reason: 'error' };
  }
}

module.exports = { recordKeyDispute, resetMemo, KINDS, QID_RE, PER_UID_DAILY_CAP };
