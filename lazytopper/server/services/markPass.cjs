'use strict';
/**
 * MARK-ON-PHOTO-1 (owner ruling 25 Nov 2026, 21:30 IST): "Mark it on your photo" counts as the SAME paper.
 *
 * An Answer Checker whole-paper grade (worksheetId `ci:<code>`) that leaves questions unmarked returns a
 * server-signed MARK PASS naming that paper and those question numbers. A later one-question grade that
 * carries the pass (header X-Lazytopper-Mark-Pass), for one of those numbers, under worksheetId
 * `ci:<code>:mark:<n>`, rides the original paper's weekly LIMITS-1 slot: no new slot is reserved. Fair use
 * still counts it as one question, exactly as before.
 *
 * Binding: the pass is an HMAC over uid | paper | numbers | issuedAt with FAIR_USE_PAPER_SECRET, honoured for
 * 24 h. The limits gate only verifies it (it never reads the body); the route then REFUSES a request whose body
 * does not match the pass (one question, one answer photo, no document, a number the pass names, the paper's
 * own mark id). Without the secret no pass is issued and every grade is decided exactly as before.
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

function sign(secret, uid, paperKey, numbers, issuedAt) {
  return b64u(crypto.createHmac('sha256', secret).update(`mark|${uid}|${paperKey}|${numbers.join(',')}|${issuedAt}`).digest());
}

function cleanNumbers(list) {
  const out = [];
  for (const n of Array.isArray(list) ? list : []) {
    const v = Number(n);
    if (Number.isInteger(v) && v > 0 && v < 1000 && !out.includes(v)) out.push(v);
  }
  return out.sort((a, b) => a - b).slice(0, MAX_NUMBERS);
}

/** A whole-paper Answer Checker id (never a mark's own id). */
function isCiPaperKey(worksheetId) {
  return CI_PAPER_RE.test(String(worksheetId || ''));
}

/** The pass for this paper's unmarked questions, or null (no secret, no uid, not a ci paper, nothing unmarked). */
function issueMarkPass({ env, uid, worksheetId, numbers, nowMs = Date.now() }) {
  const secret = secretOf(env);
  const q = cleanNumbers(numbers);
  if (!secret || !uid || !isCiPaperKey(worksheetId) || q.length === 0) return null;
  const issuedAt = Math.floor(nowMs);
  const body = b64u(Buffer.from(JSON.stringify({ k: worksheetId, q }), 'utf8'));
  return `m1.${issuedAt}.${body}.${sign(secret, uid, worksheetId, q, issuedAt)}`;
}

/** { paperKey, numbers, issuedAt } for a pass this uid holds, under 24 h old; null otherwise. Never throws. */
function verifyMarkPass(token, { env, uid, nowMs = Date.now() }) {
  try {
    const secret = secretOf(env);
    if (!secret || !uid || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'm1') return null;
    const issuedAt = Number(parts[1]);
    if (!Number.isFinite(issuedAt) || issuedAt > nowMs + 60 * 1000 || nowMs - issuedAt > MARK_PASS_TTL_MS) return null;
    const parsed = JSON.parse(fromB64u(parts[2]).toString('utf8'));
    const paperKey = String((parsed && parsed.k) || '');
    const numbers = cleanNumbers(parsed && parsed.q);
    if (!isCiPaperKey(paperKey) || numbers.length === 0) return null;
    const expected = Buffer.from(sign(secret, uid, paperKey, numbers, issuedAt), 'utf8');
    const got = Buffer.from(parts[3], 'utf8');
    if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null;
    return { paperKey, numbers, issuedAt };
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

/** The pass the limits gate accepted for this request (it then reserved no slot), or null. */
function acceptedMarkPassOf(req) {
  const p = req && typeof req === 'object' ? req[VERIFIED] : undefined;
  return p && typeof p === 'object' ? p : null;
}

/**
 * The route's check for a request that rode a pass: exactly the one mark the pass allows. Returns null when the
 * body matches, else the reason (the route answers 400).
 */
function markBodyMismatch(pass, { worksheetId, questions, uploads, imageBase64 }) {
  if (!pass) return null;
  const m = /^(ci:[^:]+):mark:(\d{1,3})$/.exec(String(worksheetId || ''));
  if (!m || m[1] !== pass.paperKey) return 'paper';
  if (imageBase64) return 'document';
  if (!Array.isArray(questions) || questions.length !== 1) return 'questions';
  if (!Array.isArray(uploads) || uploads.length !== 1) return 'uploads';
  const n = questions[0].qNumber;
  if (!pass.numbers.includes(n) || uploads[0].qNumber !== n) return 'number';
  return null;
}

module.exports = {
  MARK_PASS_HEADER,
  MARK_PASS_TTL_MS,
  isCiPaperKey,
  issueMarkPass,
  verifyMarkPass,
  verifiedMarkPassOf,
  acceptedMarkPassOf,
  markBodyMismatch,
};
