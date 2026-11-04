'use strict';
/**
 * emailCode.cjs — EMAIL-CODE-1 (owner 4 Nov 2026 11:39): the pieces behind "sign in with a 6-digit code from your email",
 * typed right there on the screen (like the phone OTP). Firebase has no email OTP, so the server issues the code and, once
 * it matches, mints a Firebase custom token for the account that OWNS that email (routes/emailCode.cjs).
 *
 * ★★ ONLY A HASH IS KEPT. The 6-digit code (crypto.randomInt) is HMAC-SHA256'd with a server secret together with the
 *    (hashed) email it was issued for; the plain code exists only in memory long enough to be emailed. The email itself is
 *    never a key either: entries are keyed by HMAC(secret, email). Nothing here logs, counts or returns a code or an email.
 * ★★ BRUTE FORCE IS BOUNDED. A code lives 10 minutes (server clock), allows 5 wrong tries, then is locked until a NEW code
 *    is sent; a right code is used up at once (single use). Sends per email are capped (30 s apart, 3 per 15 min, 10 per
 *    24 h), both routes are capped per client IP, and one IP may ask for codes for at most 10 DIFFERENT emails a day — so
 *    at most ~50 guesses per email per day against 1,000,000 codes.
 * ★★ FAIL CLOSED WHEN FULL (review M1). Every limiter and the code store hold at most a fixed number of keys, each kind
 *    (email / IP / distinct-emails / codes) in its OWN map. When a map is full (after dropping keys whose windows are
 *    over) a NEW key is REFUSED - the caller gets the generic "unavailable" answer - and no existing key is ever evicted,
 *    so a flood of fresh addresses cannot reset a victim's counters or drop a victim's code. The day-wide email ceiling is
 *    its own counter.
 * ★ CLIENT IP (review M2): the hop the TRUSTED proxy appended - counted from the RIGHT of X-Forwarded-For
 *    (EMAIL_CODE_TRUSTED_PROXY_HOPS, default 1 = the right-most entry), never the client-supplied left-most value.
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
/** A bound on memory per map: far above any honest day. Full -> NEW keys are refused (never evict). */
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
/** DIFFERENT emails one client IP may ask codes for in 24 h (review M3). Repeat sends to the same email do not count. */
const MAX_DISTINCT_EMAILS_PER_IP_PER_DAY = 10;
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

/**
 * The client IP the limiters key on (review M2), hashed: the address itself is never held. X-Forwarded-For is
 * "client-supplied, …, proxy-appended"; only the entries our TRUSTED proxies append can be believed, and they are at the
 * RIGHT. `trustedHops` = how many entries from the right to step in (1 = the right-most, appended by the proxy in front
 * of this server). A client-supplied header can only ADD entries on the left, so it never changes the key. No header ->
 * the socket address.
 */
function clientIp(req, trustedHops = 1) {
  const parts = String((req && req.headers && req.headers['x-forwarded-for']) || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const hops = Number.isInteger(trustedHops) && trustedHops > 0 ? trustedHops : 1;
  if (parts.length >= hops) return parts[parts.length - hops];
  return String((req && req.socket && req.socket.remoteAddress) || '').trim() || parts[0] || 'unknown';
}
function resolveTrustedHops(env = process.env) {
  const n = Number((env || {}).EMAIL_CODE_TRUSTED_PROXY_HOPS);
  return Number.isInteger(n) && n > 0 && n <= 5 ? n : 1;
}
function clientKey(req, trustedHops = 1) {
  return `ip:${crypto.createHash('sha256').update(clientIp(req, trustedHops)).digest('hex').slice(0, 32)}`;
}

/**
 * A sliding-window limiter over several windows at once, for ONE kind of key. `hit(key, rules)` admits and RECORDS one
 * event only when every window has room; else { allowed: false, retryAfterMs }. When the map is full (after dropping keys
 * with no event inside their longest window) a NEW key is refused with { allowed: false, full: true } - existing keys are
 * never evicted (review M1). Process-local.
 */
function createWindowLimiter({ now = () => Date.now(), maxKeys = MAX_ENTRIES, longestMs = DAY } = {}) {
  const events = new Map();
  function prune(t) {
    for (const [k, list] of events) if (!list.length || t - list[list.length - 1] >= longestMs) events.delete(k);
  }
  function hit(key, rules) {
    const t = now();
    const longest = Math.max(...rules.map((r) => r.windowMs));
    if (!events.has(key) && events.size >= maxKeys) {
      prune(t);
      if (events.size >= maxKeys) return { allowed: false, full: true, retryAfterMs: 60 * 1000 };
    }
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
    events.set(key, kept);
    return { allowed: true, retryAfterMs: 0 };
  }
  return { hit, size: () => events.size };
}

/**
 * Review M3: how many DIFFERENT emails each client IP asked codes for in the last 24 h. `hit(ipKey, emailId)` admits an
 * email already seen for that IP, or a new one while the IP is under `max`. Full map -> a NEW IP is refused (M1).
 */
function createDistinctLimiter({ now = () => Date.now(), max = MAX_DISTINCT_EMAILS_PER_IP_PER_DAY, windowMs = DAY, maxKeys = MAX_ENTRIES } = {}) {
  const byIp = new Map();
  function fresh(seen, t) {
    for (const [id, at] of seen) if (t - at >= windowMs) seen.delete(id);
    return seen;
  }
  function hit(ipKey, emailId) {
    const t = now();
    if (!byIp.has(ipKey) && byIp.size >= maxKeys) {
      for (const [k, seen] of byIp) if (!fresh(seen, t).size) byIp.delete(k);
      if (byIp.size >= maxKeys) return { allowed: false, full: true };
    }
    const seen = fresh(byIp.get(ipKey) || new Map(), t);
    if (!seen.has(emailId) && seen.size >= max) {
      byIp.set(ipKey, seen);
      return { allowed: false };
    }
    if (!seen.has(emailId)) seen.set(emailId, t);
    byIp.set(ipKey, seen);
    return { allowed: true };
  }
  return { hit, size: () => byIp.size };
}

/** Review M1/M3: the day-wide ceiling on REAL code emails, its own counter (a rolling 24 h). */
function createDailyCounter({ now = () => Date.now(), cap, windowMs = DAY } = {}) {
  let times = [];
  const trim = () => {
    const t = now();
    times = times.filter((at) => t - at < windowMs);
  };
  return {
    reached() {
      trim();
      return times.length >= cap;
    },
    /** Take one slot; false when the ceiling is reached. */
    take() {
      trim();
      if (times.length >= cap) return false;
      times.push(now());
      return true;
    },
    count() {
      trim();
      return times.length;
    },
  };
}

/**
 * The code store. `issue(email)` replaces any earlier code for that email (attempts reset) and returns the plain code ONCE
 * (or null when the store is full of LIVE codes and this email has none: fail closed, never evict - review M1);
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
  }

  function issue(email) {
    const t = now();
    const id = idFor(email);
    if (!entries.has(id) && entries.size >= maxEntries) {
      sweep(t);
      if (entries.size >= maxEntries) return null;
    }
    const code = codeFn();
    entries.set(id, { codeHash: hashFor(id, code), expiresAtMs: t + CODE_TTL_MS, attempts: 0 });
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
  clientIp,
  clientKey,
  resolveTrustedHops,
  createWindowLimiter,
  createDistinctLimiter,
  createDailyCounter,
  createCodeStore,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  CODE_DIGITS,
  MIN_SECRET_LENGTH,
  PER_EMAIL_SEND_RULES,
  PER_IP_SEND_RULES,
  PER_IP_VERIFY_RULES,
  MAX_DISTINCT_EMAILS_PER_IP_PER_DAY,
  MAX_ENTRIES,
};
