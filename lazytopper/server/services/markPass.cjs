'use strict';
/**
 * MARK-ON-PHOTO-1 (owner ruling 25 Nov 2026, 21:30 IST): "Mark it on your photo" counts as the SAME paper.
 *
 * An Answer Checker whole-paper grade (worksheetId `ci:<code>`) that leaves questions UNREAD (not found, could not be
 * read, answered as another question) returns a server-signed MARK PASS naming that paper, the LIMITS-1 slot id the
 * paper reserved, and those questions (number + a hash of the question text). A later one-question grade that
 * carries the pass (header X-Lazytopper-Mark-Pass) re-reserves THAT slot id: while the paper's slot is held the mark
 * costs nothing (`reused`); if the paper charged nothing (its slot was released) or the slot aged out, the mark takes
 * a real slot exactly as before. Fair use still counts the mark as one question.
 *
 * Binding: an HMAC (FAIR_USE_PAPER_SECRET, with a `mark|` prefix so it can never pass as a paper pass) over
 * uid | body | issuedAt, honoured for 24 h. The limits gate only verifies it (it never reads the body); the route then
 * REFUSES a request whose body is not one of those marks: the paper's own mark id, exactly one question whose number
 * AND text match the pass, one answer photo, no document. Without the secret no pass is issued and nothing changes.
 */
const crypto = require('crypto');

const MARK_PASS_HEADER = 'x-lazytopper-mark-pass';
const MARK_PASS_TTL_MS = 24 * 60 * 60 * 1000;
const SECRET_ENV = 'FAIR_USE_PAPER_SECRET';
const VERIFIED = Symbol.for('lazytopper.markPass.verified');
const CI_PAPER_RE = /^ci:[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const MAX_NUMBERS = 60;

function secretOf(env) {
  return String((env && env[SECRET_ENV]) || '').trim();
}
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(secret, uid, body, issuedAt) {
  return b64u(crypto.createHmac('sha256', secret).update(`mark|${uid}|${body}|${issuedAt}`).digest());
}

/** The short content hash a pass binds each question to: the mark must be the SAME question, not any question. */
function textHash(questionText) {
  return crypto.createHash('sha256').update(String(questionText || '').trim(), 'utf8').digest('hex').slice(0, 16);
}

function cleanItems(list) {
  const out = [];
  for (const it of Array.isArray(list) ? list : []) {
    const n = Number(Array.isArray(it) ? it[0] : NaN);
    const h = Array.isArray(it) ? String(it[1] || '') : '';
    if (Number.isInteger(n) && n > 0 && n < 1000 && /^[0-9a-f]{16}$/.test(h)) out.push([n, h]);
  }
  return out.slice(0, MAX_NUMBERS);
}

/** A whole-paper Answer Checker id (never a mark's own id). */
function isCiPaperKey(worksheetId) {
  return CI_PAPER_RE.test(String(worksheetId || ''));
}

/**
 * The pass for this paper's unmarked questions, or null (no secret, no uid, not a ci paper, no slot, nothing unmarked).
 * `slot` is the LIMITS-1 slot id the paper itself reserved: a mark re-reserves that SAME id, so while the paper's slot
 * is held the mark costs nothing, and once it is gone (released because nothing was graded, or aged out) a mark takes
 * a real slot exactly as before.
 */
function issueMarkPass({ env, uid, worksheetId, slot, questions, nowMs = Date.now() }) {
  const secret = secretOf(env);
  const q = cleanItems((Array.isArray(questions) ? questions : []).map((x) => [x && x.qNumber, textHash(x && x.questionText)]));
  if (!secret || !uid || !isCiPaperKey(worksheetId) || !slot || q.length === 0) return null;
  const issuedAt = Math.floor(nowMs);
  const body = b64u(Buffer.from(JSON.stringify({ k: worksheetId, s: String(slot), q }), 'utf8'));
  return `m1.${issuedAt}.${body}.${sign(secret, uid, body, issuedAt)}`;
}

/** { paperKey, slot, items, issuedAt } for a pass this uid holds, under 24 h old; null otherwise. Never throws. */
function verifyMarkPass(token, { env, uid, nowMs = Date.now() }) {
  try {
    const secret = secretOf(env);
    if (!secret || !uid || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'm1') return null;
    const issuedAt = Number(parts[1]);
    if (!Number.isFinite(issuedAt) || issuedAt > nowMs + 60 * 1000 || nowMs - issuedAt > MARK_PASS_TTL_MS) return null;
    const expected = Buffer.from(sign(secret, uid, parts[2], parts[1]), 'utf8');
    const got = Buffer.from(parts[3], 'utf8');
    if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
    const parsed = JSON.parse(fromB64u(parts[2]).toString('utf8'));
    const paperKey = String((parsed && parsed.k) || '');
    const slot = String((parsed && parsed.s) || '');
    const items = cleanItems(parsed && parsed.q);
    if (!isCiPaperKey(paperKey) || !slot || items.length === 0) return null;
    return { paperKey, slot, items, issuedAt };
  } catch {
    return null;
  }
}

/** The limits gate: the verified pass on this request (also remembered on req for the route), or null. */
function verifiedMarkPassOf(req, uid, env, nowMs) {
  const token = req && req.headers ? req.headers[MARK_PASS_HEADER] : undefined;
  if (typeof token !== 'string' || !token) return null;
  const pass = verifyMarkPass(token, { env, uid, nowMs });
  if (pass && req && typeof req === 'object') {
    Object.defineProperty(req, VERIFIED, { value: pass, configurable: true });
  }
  return pass;
}

/** The pass the limits gate accepted for this request (it re-used the paper's slot id), or null. */
function acceptedMarkPassOf(req) {
  const p = req && typeof req === 'object' ? req[VERIFIED] : undefined;
  return p && typeof p === 'object' ? p : null;
}

/**
 * The route's check for a request that rode a pass: exactly one mark the pass allows (the paper's own mark id, one
 * question the pass names WITH THE SAME TEXT, one answer photo, no document). Null when it matches, else the reason.
 */
function markBodyMismatch(pass, { worksheetId, questions, uploads, imageBase64 }) {
  if (!pass) return null;
  // `ci:<code>:mark:<row>` — the suffix is the client's row index, informational only.
  const m = /^(ci:[^:]+):mark:\d{1,3}$/.exec(String(worksheetId || ''));
  if (!m || m[1] !== pass.paperKey) return 'paper';
  if (imageBase64) return 'document';
  if (!Array.isArray(questions) || questions.length !== 1) return 'questions';
  if (!Array.isArray(uploads) || uploads.length !== 1) return 'uploads';
  const n = questions[0].qNumber;
  const h = textHash(questions[0].questionText);
  if (!pass.items.some(([qn, qh]) => qn === n && qh === h) || uploads[0].qNumber !== n) return 'number';
  return null;
}

module.exports = {
  MARK_PASS_HEADER,
  MARK_PASS_TTL_MS,
  isCiPaperKey,
  textHash,
  issueMarkPass,
  verifyMarkPass,
  verifiedMarkPassOf,
  acceptedMarkPassOf,
  markBodyMismatch,
};
