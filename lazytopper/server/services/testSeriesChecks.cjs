'use strict';
// TS-PACK-1 - written-answer checking on the Test Series papers for Test Series Pack owners. Server-only; Admin SDK only.
//
// WHAT IT ADMITS (owner ruling 18 Nov 2026, 19:38 IST). A /api/grade-worksheet request from a caller who is NOT Premium is
// graded on the Test Series Pack ONLY IF ALL of these hold, every one decided here, on the server:
//   1. the request names a Test Series paper: `worksheetId` equals a manifest paper's paperKey or paperCode;
//   2. EVERY submitted question carries a `questionId` that is in THAT paper's written (Section B-E) id list, once;
//   3. EVERY submitted question's text is that question's canonical text: its hash equals the manifest's hash for the id
//      (so a valid id cannot carry a swapped question). Marks are pinned too when the manifest lists them;
//   4. the caller owns `test_series` (packEntitlements/{uid}/packs/test_series:all, written ONLY by a verified Razorpay
//      payment) and it is unexpired (31 May 2027, packTerms.cjs TEST_SERIES_ENDS_MS);
//   5. that paper has been checked fewer than CHECKS_PER_PAPER (2) times for this student.
//
// ★ THE MANIFEST IS THE ONLY SOURCE OF WHAT A SERIES PAPER IS. `lazytopper/server/data/testSeriesPapers.json` is committed
//   by lane TEST-SERIES-1 (its generator and staleness guard live there). Nothing the client sends can add a paper, an id
//   or a hash. A missing or unreadable manifest has NO papers: nothing is admitted on the pack and nothing else changes.
//   The server cannot load a bank question by id (the banks are TypeScript under src/data, compiled into the browser
//   bundle only), so the manifest carries a hash of each written question's canonical text and the request's text is
//   compared to it (canonicalQuestionTextHash below - the generator MUST use this exact function).
// ★ THE PAPER PASS IS NOT USED. The fair-use paper pass (/api/usage/paper) is minted on the client's word; it decides
//   nothing here ([FU-TS-PAPER-PASS-SELF-DECLARED]).
//
// THE COUNT - reserve, then settle. ONE Firestore transaction reads ownership and this paper's count and, when a check is
// left, writes count + 1 (the RESERVATION) before grading starts. Two parallel requests for the last check serialise on the
// parent document: exactly one reserves, the other is refused. When the response finishes, a 2xx that graded at least one
// question KEEPS the reservation; anything else (4xx/5xx, nothing graded, a dropped connection) gives it back - once, in
// its own transaction, never below 0. So a failed grading costs nothing and a check is never spent twice.
//
// WHERE IT LIVES. On the existing server-only parent document packEntitlements/{uid}: `testSeriesChecks: { <paperId>: n }`
// (paperId = a hash of the paper key, so the field path is always safe). No new collection; no firestore.rules change (the
// Admin SDK bypasses rules and no client can reach the document).

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ENTITLEMENTS_COLLECTION, PACK_SEGMENTS } = require('./packGrant.cjs');
const { TEST_SERIES_ENDS_MS } = require('./packTerms.cjs');
const { TEST_SERIES_SKU, TEST_SERIES_PACK_ID } = require('./packProducts.cjs');
const { chargeableCountOf } = require('../grading/charge.cjs');

/** Owner ruling 18 Nov 2026 (19:38 IST): each Test Series paper can be checked at most 2 times on the pack. */
const CHECKS_PER_PAPER = 2;
const CHECKS_FIELD = 'testSeriesChecks';
const GRADE_WORKSHEET_PATH = '/api/grade-worksheet';

/** Where TEST-SERIES-1 commits the manifest. */
const MANIFEST_PATH = path.join(__dirname, '..', 'data', 'testSeriesPapers.json');

/**
 * ★ THE MANIFEST FIELD NAMES - in ONE place, so matching TEST-SERIES-1's final shape is a one-line change.
 *   { papers: [ { paperKey, paperCode, questionIds: [id], writtenIds: [id (Section B-E)], textHashes: { id: sha256hex },
 *                 marks?: { id: number } } ] }
 */
const F = Object.freeze({
  papers: 'papers',
  paperKey: 'paperKey',
  paperCode: 'paperCode',
  questionIds: 'questionIds',
  writtenIds: 'writtenIds',
  textHashes: 'textHashes',
  marks: 'marks',
});
/** The per-question id field the browser sends in each `questions[]` entry of a series grading request. */
const REQUEST_ID_FIELD = 'questionId';

const HEX64 = /^[0-9a-f]{64}$/;
const ID_MAX = 200;

/**
 * THE canonical text hash: sha256 (hex) of the text, Unicode NFC, every whitespace run as one space, trimmed. The manifest
 * generator and this file MUST use this same function. PURE.
 */
function canonicalQuestionTextHash(text) {
  const norm = String(text == null ? '' : text).normalize('NFC').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(norm, 'utf8').digest('hex');
}

/** The counter key for a paper: a hash of its key (always a safe Firestore field name). PURE. */
function paperIdOf(paperKey) {
  return crypto.createHash('sha256').update(`ts|${paperKey}`, 'utf8').digest('hex').slice(0, 24);
}

const str = (v) => (typeof v === 'string' && v.trim() && v.length <= ID_MAX ? v.trim() : '');

/**
 * Validate a parsed manifest into a lookup. A paper that is not entirely well-formed is DROPPED (fail closed for that
 * paper): a written id with no hash, a written id outside questionIds, a duplicate key. PURE.
 * @returns {{ papers: Map<string, object>, count: number, dropped: number }}
 */
function indexManifest(raw) {
  const byName = new Map();
  let count = 0;
  let dropped = 0;
  const list = raw && typeof raw === 'object' && Array.isArray(raw[F.papers]) ? raw[F.papers] : [];
  const seenKeys = new Set();
  for (const p of list) {
    const paperKey = str(p && p[F.paperKey]);
    const paperCode = str(p && p[F.paperCode]);
    const questionIds = Array.isArray(p && p[F.questionIds]) ? p[F.questionIds].map(str) : null;
    const writtenIds = Array.isArray(p && p[F.writtenIds]) ? p[F.writtenIds].map(str) : null;
    const hashes = p && p[F.textHashes] && typeof p[F.textHashes] === 'object' ? p[F.textHashes] : null;
    const marks = p && p[F.marks] && typeof p[F.marks] === 'object' ? p[F.marks] : null;
    const ok =
      paperKey && questionIds && writtenIds && hashes && writtenIds.length > 0
      && questionIds.every(Boolean) && writtenIds.every(Boolean)
      && new Set(writtenIds).size === writtenIds.length
      && writtenIds.every((id) => questionIds.includes(id) && typeof hashes[id] === 'string' && HEX64.test(hashes[id]))
      && (!marks || writtenIds.every((id) => marks[id] === undefined || (Number.isFinite(marks[id]) && marks[id] > 0)))
      && !seenKeys.has(paperKey) && !(paperCode && seenKeys.has(paperCode));
    if (!ok) {
      dropped += 1;
      continue;
    }
    const paper = Object.freeze({
      paperKey,
      paperCode: paperCode || null,
      paperId: paperIdOf(paperKey),
      written: new Map(writtenIds.map((id) => [id, { hash: hashes[id], marks: marks && marks[id] !== undefined ? Number(marks[id]) : null }])),
    });
    seenKeys.add(paperKey);
    byName.set(paperKey, paper);
    if (paperCode) {
      seenKeys.add(paperCode);
      byName.set(paperCode, paper);
    }
    count += 1;
  }
  return { papers: byName, count, dropped };
}

/** Read and index the manifest file. Missing -> no papers (silently); unreadable / malformed -> no papers (logged). */
function loadManifest(file = MANIFEST_PATH, logger = console) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { papers: new Map(), count: 0, dropped: 0, missing: true };
  }
  try {
    const out = indexManifest(JSON.parse(text));
    if (out.dropped > 0) logger.error(`[test-series] manifest: ${out.dropped} paper(s) malformed and NOT admitted`);
    return out;
  } catch (e) {
    logger.error(`[test-series] manifest unreadable - no series paper is admitted: ${(e && e.message) || e}`);
    return { papers: new Map(), count: 0, dropped: 0, unreadable: true };
  }
}

/** The manifest paper this request names (worksheetId = paperKey or paperCode), or null. PURE. */
function seriesPaperOf(body, manifest) {
  if (!manifest || !body || typeof body !== 'object') return null;
  const name = str(body.worksheetId);
  return (name && manifest.papers.get(name)) || null;
}

/**
 * Does EVERY submitted question belong to `paper`'s written list with its canonical text (and marks, when pinned)? PURE.
 * Checks the RAW `questions` array - every entry, not only the ones the grader later keeps.
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function verifySubmission(body, paper) {
  const qs = body && Array.isArray(body.questions) ? body.questions : null;
  if (!qs || qs.length === 0) return { ok: false, reason: 'no_questions' };
  if (qs.length > paper.written.size) return { ok: false, reason: 'too_many_questions' };
  const seen = new Set();
  for (const q of qs) {
    const id = str(q && q[REQUEST_ID_FIELD]);
    if (!id) return { ok: false, reason: 'missing_question_id' };
    const canon = paper.written.get(id);
    if (!canon) return { ok: false, reason: 'not_a_written_question' };
    if (seen.has(id)) return { ok: false, reason: 'duplicate_question' };
    seen.add(id);
    if (canonicalQuestionTextHash(q && q.questionText) !== canon.hash) return { ok: false, reason: 'question_text_mismatch' };
    if (canon.marks !== null && Number(q && q.marks) !== canon.marks) return { ok: false, reason: 'marks_mismatch' };
  }
  return { ok: true };
}

const docId = (v) => (typeof v === 'string' && v.trim() && !v.includes('/') ? v.trim() : '');

/** The stored count for one paper as a whole number >= 0 (anything unusable reads as 0; a large number stays large). PURE. */
function usedOn(data, paperId) {
  const map = data && data[CHECKS_FIELD] && typeof data[CHECKS_FIELD] === 'object' ? data[CHECKS_FIELD] : {};
  const n = map[paperId];
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** True when this stored pack document is a live Test Series Pack at `nowMs`. PURE. */
function isLivePack(pack, nowMs) {
  return !!pack && pack.sku === TEST_SERIES_SKU && pack.packId === TEST_SERIES_PACK_ID
    && Number.isFinite(nowMs) && nowMs <= TEST_SERIES_ENDS_MS;
}

/**
 * @param {{ adminFirestore: object|null, telemetry?: object|null, now?: () => number, manifest?: object,
 *           readBody?: (req) => Promise<object> }} deps
 */
function createTestSeriesChecks(deps = {}) {
  const { adminFirestore = null, telemetry = null, now = () => Date.now(), readBody = null } = deps;
  const manifest = deps.manifest || loadManifest(MANIFEST_PATH, deps.logger || console);
  const emit = (e) => {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(e);
    } catch {
      /* telemetry never blocks */
    }
  };
  const userRefOf = (uid) => adminFirestore.collection(ENTITLEMENTS_COLLECTION).doc(uid);
  const packRefOf = (uid) => userRefOf(uid).collection(PACK_SEGMENTS.packs).doc(TEST_SERIES_PACK_ID);
  const usable = () => !!adminFirestore && typeof adminFirestore.collection === 'function';

  /** Does the uid own a live Test Series Pack? true / false, or null when it cannot be read. */
  async function ownsActive(uid) {
    const id = docId(uid);
    if (!id || !usable()) return null;
    try {
      const snap = await packRefOf(id).get();
      return isLivePack(snap && snap.exists ? snap.data() || {} : null, now());
    } catch {
      emit('test_series.read_failed');
      return null;
    }
  }

  /**
   * The owner's view for GET /api/packs/mine: { owned, validUntilMs, checksPerPaper, used: { <paperKey>: n } } (only the
   * papers checked at least once), or null when not owned / unreadable.
   */
  async function status(uid) {
    const id = docId(uid);
    if (!id || !usable()) return null;
    try {
      const [packSnap, userSnap] = await Promise.all([packRefOf(id).get(), userRefOf(id).get()]);
      const pack = packSnap && packSnap.exists ? packSnap.data() || {} : null;
      if (!pack || pack.sku !== TEST_SERIES_SKU) return null;
      const data = userSnap && userSnap.exists ? userSnap.data() || {} : {};
      const used = {};
      for (const [name, paper] of manifest.papers) {
        if (name !== paper.paperKey) continue; // each paper once, by its key
        const n = usedOn(data, paper.paperId);
        if (n > 0) used[paper.paperKey] = Math.min(n, CHECKS_PER_PAPER);
      }
      return { owned: true, active: isLivePack(pack, now()), validUntilMs: TEST_SERIES_ENDS_MS, checksPerPaper: CHECKS_PER_PAPER, used };
    } catch {
      emit('test_series.read_failed');
      return null;
    }
  }

  /**
   * ONE transaction: ownership + this paper's count, and the reservation (count + 1) when a check is left.
   * Never throws. -> { kind: 'reserved', used, left } | 'not_owner' | 'expired' | 'exhausted' | 'unavailable'
   */
  async function reserve(uid, paper) {
    const id = docId(uid);
    if (!id || !adminFirestore || typeof adminFirestore.runTransaction !== 'function') return { kind: 'unavailable' };
    const nowMs = now();
    try {
      return await adminFirestore.runTransaction(async (tx) => {
        const userRef = userRefOf(id);
        // Every read before any write (Firestore's transaction contract).
        const packSnap = await tx.get(packRefOf(id));
        const userSnap = await tx.get(userRef);
        const pack = packSnap && packSnap.exists ? packSnap.data() || {} : null;
        if (!pack || pack.sku !== TEST_SERIES_SKU) return { kind: 'not_owner' };
        if (!isLivePack(pack, nowMs)) return { kind: 'expired' };
        const data = userSnap && userSnap.exists ? userSnap.data() || {} : {};
        const used = usedOn(data, paper.paperId);
        if (used >= CHECKS_PER_PAPER) return { kind: 'exhausted', used: CHECKS_PER_PAPER, left: 0 };
        const map = { ...(data[CHECKS_FIELD] && typeof data[CHECKS_FIELD] === 'object' ? data[CHECKS_FIELD] : {}), [paper.paperId]: used + 1 };
        tx.set(userRef, { [CHECKS_FIELD]: map, updatedAt: new Date(nowMs) }, { merge: true });
        return { kind: 'reserved', used: used + 1, left: CHECKS_PER_PAPER - used - 1 };
      });
    } catch {
      emit('test_series.reserve_failed');
      return { kind: 'unavailable' };
    }
  }

  /** Give back ONE reserved check on this paper (never below 0). Never throws. */
  async function release(uid, paper) {
    const id = docId(uid);
    if (!id || !adminFirestore || typeof adminFirestore.runTransaction !== 'function') return false;
    try {
      const done = await adminFirestore.runTransaction(async (tx) => {
        const userRef = userRefOf(id);
        const snap = await tx.get(userRef);
        const data = snap && snap.exists ? snap.data() || {} : {};
        const used = usedOn(data, paper.paperId);
        if (used <= 0) return false;
        const map = { ...(data[CHECKS_FIELD] && typeof data[CHECKS_FIELD] === 'object' ? data[CHECKS_FIELD] : {}), [paper.paperId]: used - 1 };
        tx.set(userRef, { [CHECKS_FIELD]: map, updatedAt: new Date(now()) }, { merge: true });
        return true;
      });
      emit(done ? 'test_series.check_released' : 'test_series.release_noop');
      return done;
    } catch {
      emit('test_series.release_failed');
      return false;
    }
  }

  /**
   * Keep the reservation for a served grade, give it back otherwise - exactly once per request.
   * Served = a 2xx whose handler graded at least one question (grading/charge.cjs). A dropped connection releases.
   */
  function settleOnFinish(req, res, uid, paper) {
    if (!res || typeof res.once !== 'function') return;
    let settled = false;
    const settle = (keep) => {
      if (settled) return;
      settled = true;
      if (keep) {
        emit('test_series.check_spent');
        return;
      }
      void Promise.resolve(release(uid, paper)).catch(() => {});
    };
    res.once('finish', () => {
      const charged = chargeableCountOf(res);
      settle(res.statusCode >= 200 && res.statusCode < 300 && charged !== undefined && charged > 0);
    });
    res.once('close', () => {
      if (!res.writableFinished) settle(false);
    });
  }

  /** The request body, read ONCE (the handler later gets the same parse). null when it cannot be parsed. */
  async function bodyOf(req) {
    if (typeof readBody !== 'function') return null;
    try {
      const b = await readBody(req);
      return b && typeof b === 'object' ? b : null;
    } catch {
      return null;
    }
  }

  /**
   * The decision for a grade-worksheet request from a NON-Premium caller. Never throws.
   *   { kind: 'not_series' }                          not a Test Series paper: the caller's ordinary rules apply
   *   { kind: 'admitted', paperKey, used, left }      graded on the pack; the reservation settles on finish
   *   { kind: 'refused', reason, status, ... }        a series paper this caller may not have checked on the pack
   */
  async function decide(req, res, uid) {
    if (manifest.count === 0) return { kind: 'not_series' };
    const body = await bodyOf(req);
    const paper = seriesPaperOf(body, manifest);
    if (!paper) return { kind: 'not_series' };
    emit('test_series.series_request');
    const verdict = verifySubmission(body, paper);
    if (!verdict.ok) {
      emit(`test_series.mismatch.${verdict.reason}`);
      return { kind: 'refused', reason: 'series_paper_mismatch', detail: verdict.reason, paperKey: paper.paperKey };
    }
    const r = await reserve(uid, paper);
    if (r.kind !== 'reserved') {
      emit(`test_series.refused.${r.kind}`);
      return { kind: 'refused', reason: r.kind, paperKey: paper.paperKey, ...(r.kind === 'exhausted' ? { used: r.used, left: 0 } : {}) };
    }
    // A background job would settle long after this response: the series check is graded synchronously instead
    // (the browser already handles the synchronous 200), so `finish` is the grade's real end.
    if (req) req.lazytopperSyncOnly = true;
    settleOnFinish(req, res, uid, paper);
    emit('test_series.check_reserved');
    return { kind: 'admitted', paperKey: paper.paperKey, used: r.used, left: r.left };
  }

  return { decide, ownsActive, status, reserve, release, manifest };
}

module.exports = {
  createTestSeriesChecks,
  canonicalQuestionTextHash,
  paperIdOf,
  indexManifest,
  loadManifest,
  seriesPaperOf,
  verifySubmission,
  usedOn,
  isLivePack,
  CHECKS_PER_PAPER,
  CHECKS_FIELD,
  MANIFEST_PATH,
  MANIFEST_FIELDS: F,
  REQUEST_ID_FIELD,
  GRADE_WORKSHEET_PATH,
};
