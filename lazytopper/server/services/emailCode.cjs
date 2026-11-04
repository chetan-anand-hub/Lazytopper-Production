'use strict';
/**
 * emailCode.cjs — EMAIL-CODE-1 (owner 4 Nov 2026 11:39): the pieces behind "sign in with a 6-digit code from your email",
 * typed right there on the screen (like the phone OTP). Firebase has no email OTP, so the server issues the code and, once
 * it matches, returns a one-time Firebase email sign-in link for the account that OWNS that email (routes/emailCode.cjs).
 *
 * ★★ ONLY A HASH IS KEPT. The 6-digit code (crypto.randomInt) is HMAC-SHA256'd with a server secret together with the
 *    (hashed) email it was issued for; the plain code exists only in memory long enough to be emailed. The email itself is
 *    never a key either: entries are keyed by HMAC(secret, email). Nothing here logs, counts or returns a code or an email.
 * ★★ BRUTE FORCE IS BOUNDED. A code lives 10 minutes (server clock), allows 5 wrong tries, then is locked until a NEW code
 *    is sent; a right code is used up at once (single use). Sends per email are capped (30 s apart, 3 per 15 min, 10 per
 *    24 h) and both routes are capped per client IP — so at most ~50 guesses per email per day against 1,000,000 codes.
 * ★ IN MEMORY, ON PURPOSE (like every limiter in this server, [FU-RATE-LIMIT-IN-MEMORY]). A restart drops every code (the
 *    student sends a new one: "Code expired") and never weakens a bound: a dropped code can no longer be guessed. A durable
 *    Firestore store would be a NEW collection, which must first be classified in src/services/studentDataMap.ts (outside
 *    this lane) — see the PR. Railway runs ONE replica; a second replica would answer "expired" for a code issued by the
 *    other (safe, not convenient).
 * ★ The HMAC secret: EMAIL_CODE_SECRET (>= 32 chars) when set, else 32 random bytes made at process start (enough, since the
 *    hashes it protects live only in this process's memory).
 */

const crypto = require('node:crypto');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const CODE_DIGITS = 6;
const MIN_SECRET_LENGTH = 32;
/** A bound on memory: far above any honest day; the oldest entries go first. */
const MAX_ENTRIES = 20000;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
/** Sends per email (keyed by the email's HMAC): one every 30 s, 3 per 15 min, 10 per 24 h. */
const PER_EMAIL_SEND_RULES = Object.freeze([
  { windowMs: 30 * 1000, max: 1 },
  { windowMs: 15 * MINUTE, max: 3 },
  { windowMs: DAY, max: 10 },
]);
/** Sends per client IP (generous: many Indian students share a carrier IP). */
const PER_IP_SEND_RULES = Object.freeze([
  { windowMs: 15 * MINUTE, max: 20 },
  { windowMs: DAY, max: 60 },
]);
/** Verify calls per client IP. */
const PER_IP_VERIFY_RULES = Object.freeze([
  { windowMs: 15 * MINUTE, max: 40 },
  { windowMs: DAY, max: 200 },
]);

function isOn(v) {
  return typeof v === 'string' && /^(1|true|yes|on)$/i.test(v.trim());
}

/** The server switch. OFF unless EMAIL_CODE_SIGNIN_ENABLED is on: both routes then answer 404 before reading anything. */
function isEmailCodeSigninEnabled(env = process.env) {
  return isOn((env || {}).EMAIL_CODE_SIGNIN_ENABLED);
}

function resolveSecret(env = process.env) {
  const s = typeof (env || {}).EMAIL_CODE_SECRET === 'string' ? env.EMAIL_CODE_SECRET.trim() : '';
  return s.length >= MIN_SECRET_LENGTH ? s : crypto.randomBytes(32).toString('hex');
}

/** A fresh 6-digit code, uniformly drawn (crypto.randomInt), zero-padded. */
function generateCode() {
  return String(crypto.randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, '0');
}

/** The client IP the limiter keys on (the same reading as rateLimiter.cjs), hashed: the address itself is never held. */
function clientKey(req) {
  const xff = String((req && req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  const ip = xff || String((req && req.socket && req.socket.remoteAddress) || '').trim() || 'unknown';
  return `ip:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)}`;
}

/**
 * A sliding-window limiter over several windows at once. `hit(key, rules)` admits and RECORDS one event only when every
 * window has room; else { allowed: false, retryAfterMs }. Process-local.
 */
function createWindowLimiter({ now = () => Date.now(), maxKeys = MAX_ENTRIES } = {}) {
  const events = new Map();
  function hit(key, rules) {
    const t = now();
    const longest = Math.max(...rules.map((r) => r.windowMs));
    const kept = (events.get(key) || []).filter((at) => t - at < longest);
    let retryAfterMs = 0;
    for (const r of rules) {
      const inWindow = kept.filter((at) => t - at < r.windowMs);
      if (inWindow.length >= r.max) retryAfterMs = Math.max(retryAfterMs, inWindow[inWindow.length - r.max] + r.windowMs - t);
    }
    if (retryAfterMs > 0) {
      events.set(key, kept);
      return { allowed: false, retryAfterMs };
    }
    kept.push(t);
    events.delete(key);
    events.set(key, kept);
    while (events.size > maxKeys) events.delete(events.keys().next().value);
    return { allowed: true, retryAfterMs: 0 };
  }
  return { hit, size: () => events.size };
}

/**
 * The code store. `issue(email)` replaces any earlier code for that email (attempts reset) and returns the plain code ONCE;
 * `check(email, code)` answers { status: 'ok' } (and deletes the code: single use), { status: 'mismatch', triesLeft },
 * { status: 'locked' } (5 wrong tries: send a new code) or { status: 'expired' } (none, expired or already used — one
 * answer for all three).
 */
function createCodeStore({ secret, now = () => Date.now(), maxEntries = MAX_ENTRIES, codeFn = generateCode } = {}) {
  if (typeof secret !== 'string' || !secret) throw new Error('emailCode: a secret is required');
  const entries = new Map();
  const hmac = (s) => crypto.createHmac('sha256', secret).update(s).digest();
  const idFor = (email) => hmac(`email:${email}`).toString('hex');
  const hashFor = (id, code) => hmac(`code:${id}:${code}`);

  function sweep(t) {
    for (const [k, v] of entries) if (v.expiresAtMs <= t) entries.delete(k);
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
  }

  function issue(email) {
    const t = now();
    const id = idFor(email);
    const code = codeFn();
    entries.delete(id);
    entries.set(id, { codeHash: hashFor(id, code), expiresAtMs: t + CODE_TTL_MS, attempts: 0 });
    if (entries.size > maxEntries / 2) sweep(t);
    return code;
  }

  function check(email, code) {
    const t = now();
    const id = idFor(email);
    const entry = entries.get(id);
    if (!entry || entry.expiresAtMs <= t) {
      if (entry) entries.delete(id);
      return { status: 'expired' };
    }
    if (entry.attempts >= MAX_ATTEMPTS) return { status: 'locked' };
    const given = hashFor(id, String(code));
    if (given.length === entry.codeHash.length && crypto.timingSafeEqual(given, entry.codeHash)) {
      entries.delete(id);
      return { status: 'ok' };
    }
    entry.attempts += 1;
    const triesLeft = MAX_ATTEMPTS - entry.attempts;
    return triesLeft > 0 ? { status: 'mismatch', triesLeft } : { status: 'locked' };
  }

  return { issue, check, idFor, size: () => entries.size };
}

module.exports = {
  isEmailCodeSigninEnabled,
  resolveSecret,
  generateCode,
  clientKey,
  createWindowLimiter,
  createCodeStore,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  CODE_DIGITS,
  MIN_SECRET_LENGTH,
  PER_EMAIL_SEND_RULES,
  PER_IP_SEND_RULES,
  PER_IP_VERIFY_RULES,
};
