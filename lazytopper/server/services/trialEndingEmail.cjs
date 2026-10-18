/**
 * trialEndingEmail.cjs — TRIAL-END-1 (owner ruling 18 Oct 2026): ONE honest service email,
 * ~24-48 h before a student's 7-day Premium trial ends.
 *
 * Until now the server sent no email at all, so a trial ended silently. This module is the
 * smallest safe sender:
 *
 *   ★ OFF BY DEFAULT. Nothing is scheduled unless TRIAL_EMAIL_ENABLED is set. Enabled, it is
 *     still a DRY RUN (logs who WOULD be emailed, writes nothing, sends nothing) until the owner
 *     ALSO sets TRIAL_EMAIL_DRY_RUN=0 — and a real send further needs RESEND_API_KEY,
 *     TRIAL_EMAIL_FROM and a >= 32-character TRIAL_EMAIL_UNSUBSCRIBE_SECRET. Missing any one of
 *     those, it stays a dry run and says which is missing. No agent ever handles these secrets.
 *
 *   ★ ONCE PER TRIAL, EVEN ACROSS RESTARTS AND TWO INSTANCES. Before sending, the job CLAIMS
 *     `trialEmails/{uid}` with a create-only write; Firestore lets exactly one `create` win, so a
 *     restart, an overlapping Railway deploy (overlapSeconds) or a second replica can never send
 *     twice. A crash between claim and send leaves the claim in place: at most once, never twice.
 *     Only a send that certainly did NOT go out (HTTP 429/5xx or a network error) releases the
 *     claim for the next hourly run, and those retries carry a provider Idempotency-Key.
 *
 *   ★ TRANSACTIONAL, NOT MARKETING (DPDP Act 2023 — many students are minors). It is a notice
 *     about the student's OWN trial: when it ends (the real derived end, start + TRIAL_DAYS),
 *     what they actually did (real graded session records — zero said as zero), that nothing is
 *     charged automatically, a link back and an unsubscribe link. No name, no tracking pixel, no
 *     link tracking, no urgency copy. Only accounts that signed in with an email (Google, or
 *     email + password) are considered; phone-only accounts are never emailed.
 *
 *   ★ WHO IS IN THE WINDOW. `subscriptions/{uid}.trialStartDate` is a server-pinned Timestamp
 *     (firestore.rules pin it to request.time). The trial ends at start + 7 d, so "ends 24-48 h
 *     from now" is exactly "started between now - 6 d and now - 5 d": one single-field range
 *     query (no composite index), then entitlement.deriveEffectiveTier on each row — the same
 *     derivation the entitlement gate uses — so premium, pass-holders and ended trials are
 *     skipped. Run hourly, every trial passes through the window during ~24 runs.
 *
 * Measured by: the `[trial-email] trial_email_sent uid=…` log line, telemetry counter
 * `trial_email_sent`, and `trialEmails/{uid}.status == "sent"`.
 */

const crypto = require('crypto');
const { deriveEffectiveTier, isServerPinnedStart, TRIAL_MS } = require('./entitlement.cjs');

const TRIAL_EMAILS_COLLECTION = 'trialEmails';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const SESSION_RECORDS_COLLECTION = 'sessionRecords';
// A SUBcollection, held as a property (the studentActivity ACTIVITY_SEGMENTS pattern) so the
// studentDataMap drift scanner does not read it as a phantom top-level `records` collection.
const SESSION_RECORDS_SEGMENTS = Object.freeze({ records: 'records' });

const TRIAL_EMAIL_UNSUBSCRIBE_PATH = '/api/trial-email/unsubscribe';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_APP_URL = 'https://www.lazytopper.com';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** Send when the trial ends between these two distances from now. */
const WINDOW_MIN_MS = 24 * HOUR_MS;
const WINDOW_MAX_MS = 48 * HOUR_MS;
const DEFAULT_INTERVAL_MS = HOUR_MS;
const MIN_INTERVAL_MS = 5 * MINUTE_MS;
const MAX_INTERVAL_MS = 6 * HOUR_MS;
const FIRST_RUN_DELAY_MS = 2 * MINUTE_MS;
/** Under Resend's free-plan 100/day, with headroom. Owner can lower/raise via TRIAL_EMAIL_DAILY_CAP. */
const DEFAULT_DAILY_CAP = 90;
const MIN_UNSUBSCRIBE_SECRET_LENGTH = 32;
const SEND_TIMEOUT_MS = 15 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * MINUTE_MS;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Config ──────────────────────────────────────────────────────────────────────────────

function isOnFlag(v) {
  return typeof v === 'string' && /^(1|true|yes|on)$/i.test(v.trim());
}
function isOffFlag(v) {
  return typeof v === 'string' && /^(0|false|no|off)$/i.test(v.trim());
}
function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
function normaliseAppUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_APP_URL;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:') return DEFAULT_APP_URL;
    return u.origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

/**
 * Resolve every switch from the environment. PURE. `mode` is one of:
 *   off            TRIAL_EMAIL_ENABLED unset/false — nothing is scheduled at all (the default)
 *   dry-run        enabled, TRIAL_EMAIL_DRY_RUN not explicitly 0 — logs, writes nothing
 *   misconfigured  enabled, dry run off, but a secret/sender is missing — behaves as dry-run
 *   send           enabled, dry run off, everything present — really sends
 */
function resolveTrialEmailConfig(env = process.env) {
  const e = env || {};
  const enabled = isOnFlag(e.TRIAL_EMAIL_ENABLED);
  const dryRun = !isOffFlag(e.TRIAL_EMAIL_DRY_RUN);
  const apiKey = typeof e.RESEND_API_KEY === 'string' ? e.RESEND_API_KEY.trim() : '';
  const from = typeof e.TRIAL_EMAIL_FROM === 'string' ? e.TRIAL_EMAIL_FROM.trim() : '';
  const replyTo = typeof e.TRIAL_EMAIL_REPLY_TO === 'string' && e.TRIAL_EMAIL_REPLY_TO.trim() ? e.TRIAL_EMAIL_REPLY_TO.trim() : null;
  const unsubscribeSecret = typeof e.TRIAL_EMAIL_UNSUBSCRIBE_SECRET === 'string' ? e.TRIAL_EMAIL_UNSUBSCRIBE_SECRET : '';
  const missing = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!from) missing.push('TRIAL_EMAIL_FROM');
  if (unsubscribeSecret.length < MIN_UNSUBSCRIBE_SECRET_LENGTH) missing.push('TRIAL_EMAIL_UNSUBSCRIBE_SECRET');
  let mode = 'off';
  if (enabled) mode = dryRun ? 'dry-run' : missing.length ? 'misconfigured' : 'send';
  return {
    enabled,
    dryRun,
    mode,
    missing,
    apiKey,
    from,
    replyTo,
    unsubscribeSecret,
    appUrl: normaliseAppUrl(e.TRIAL_EMAIL_APP_URL),
    intervalMs: clampInt(e.TRIAL_EMAIL_INTERVAL_MS, DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS, MAX_INTERVAL_MS),
    dailyCap: clampInt(e.TRIAL_EMAIL_DAILY_CAP, DEFAULT_DAILY_CAP, 1, 1000),
  };
}

/** The one log line that says what this deploy will do. Never prints a secret. */
function describeConfig(config) {
  if (config.mode === 'off') return '[trial-email] OFF (TRIAL_EMAIL_ENABLED not set) - no trial emails, nothing scheduled.';
  if (config.mode === 'dry-run') return `[trial-email] DRY RUN - logs who would be emailed every ${Math.round(config.intervalMs / MINUTE_MS)} min; sends and writes nothing. Set TRIAL_EMAIL_DRY_RUN=0 to send.`;
  if (config.mode === 'misconfigured') return `[trial-email] DRY RUN (misconfigured: missing ${config.missing.join(', ')}) - nothing is sent until these are set.`;
  return `[trial-email] SENDING via Resend every ${Math.round(config.intervalMs / MINUTE_MS)} min, cap ${config.dailyCap}/IST day, from ${config.from}.`;
}

// ── Pure helpers ────────────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" of the IST day containing `ms`. */
function istDayKeyOf(ms) {
  return new Date(Math.floor((ms + IST_OFFSET_MS) / DAY_MS) * DAY_MS).toISOString().slice(0, 10);
}
function formatIstTime(ms) {
  const ist = new Date(ms + IST_OFFSET_MS);
  const h24 = ist.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(ist.getUTCMinutes()).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}
function formatIstDate(ms) {
  const ist = new Date(ms + IST_OFFSET_MS);
  return `${DAYS[ist.getUTCDay()]} ${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]}`;
}

/** The trialStartDate range whose trials end 24-48 h after `nowMs`: [lo, hi). */
function startRangeFor(nowMs) {
  return { loMs: nowMs + WINDOW_MIN_MS - TRIAL_MS, hiMs: nowMs + WINDOW_MAX_MS - TRIAL_MS };
}

/**
 * Is this `subscriptions/{uid}` row a running trial that ends 24-48 h from now? PURE.
 * Requires a SERVER-PINNED start (a client-written ISO string proves nothing) and the
 * entitlement gate's own derived tier to be `trial`.
 */
function decideCandidate(raw, nowMs) {
  const doc = raw && typeof raw === 'object' ? raw : {};
  if (!isServerPinnedStart(doc.trialStartDate)) return { ok: false, reason: 'start-not-server-pinned' };
  const { tier, trialEndsAtMs } = deriveEffectiveTier(doc, nowMs);
  if (tier !== 'trial' || trialEndsAtMs === null) return { ok: false, reason: `tier-${tier}` };
  const left = trialEndsAtMs - nowMs;
  if (left < WINDOW_MIN_MS || left >= WINDOW_MAX_MS) return { ok: false, reason: 'outside-window' };
  return { ok: true, trialStartMs: trialEndsAtMs - TRIAL_MS, trialEndsAtMs };
}

const EMAIL_PROVIDERS = new Set(['google.com', 'password']);

/**
 * May this Auth account get the email, and at which address? PURE. Only an account that signed
 * in with an email (Google, or email + password); never a phone-only account, never a disabled
 * one, never an address Google has not verified unless the student typed it at sign-up.
 */
function emailEligibility(user) {
  if (!user || typeof user !== 'object') return { ok: false, reason: 'no-account' };
  if (user.disabled) return { ok: false, reason: 'disabled' };
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'no-email' };
  const providers = Array.isArray(user.providerData) ? user.providerData.map((p) => p && p.providerId) : [];
  const viaEmail = providers.some((p) => EMAIL_PROVIDERS.has(p));
  if (!viaEmail) return { ok: false, reason: 'not-an-email-sign-in' };
  if (!user.emailVerified && !providers.includes('password')) return { ok: false, reason: 'email-unverified' };
  return { ok: true, email };
}

/** "a***@gmail.com" — enough to recognise in a log, not enough to be the address. */
function maskEmail(email) {
  const at = String(email || '').lastIndexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/** Port of src/components/trial/trialEndBannerModel.ts countTrialActivity — a vitest pins parity. */
function countTrialActivity(records, trialStartMs) {
  const counts = { checks: 0, tests: 0, practiceSets: 0 };
  const seen = new Set();
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || typeof r.gradedAt !== 'number' || r.gradedAt < trialStartMs) continue;
    if (r.status !== 'graded') continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (r.surface === 'check-improve') counts.checks += 1;
    else if (r.surface === 'worksheet' || r.surface === 'chapter-test' || r.surface === 'full-mock') counts.tests += 1;
    else if (r.surface === 'quick-practice') counts.practiceSets += 1;
  }
  return counts;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Port of trialEndBannerModel.ts trialActivityLine — a vitest pins parity. */
function trialActivityLine(counts) {
  const parts = [];
  if (counts.checks > 0) parts.push(plural(counts.checks, 'answer check', 'answer checks'));
  if (counts.tests > 0) parts.push(plural(counts.tests, 'test taken', 'tests taken'));
  if (counts.practiceSets > 0) parts.push(plural(counts.practiceSets, 'practice set', 'practice sets'));
  if (parts.length === 0) {
    return { text: "You haven't checked an answer yet. Check one before your trial ends.", zero: true };
  }
  return { text: `In your trial so far: ${parts.join(' · ')}.`, zero: false };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * The email. PURE. `counts` may be null (the records read failed): the activity line is then
 * left OUT rather than replaced by an invented zero.
 */
function buildTrialEmail({ trialEndsAtMs, counts, appUrl, unsubscribeUrl }) {
  const when = `${formatIstDate(trialEndsAtMs)} at ${formatIstTime(trialEndsAtMs)} (IST)`;
  const subject = `Your LazyTopper trial ends on ${formatIstDate(trialEndsAtMs)}`;
  const activity = counts ? trialActivityLine(counts) : null;
  const plansUrl = `${appUrl}/pricing`;
  const checkUrl = `${appUrl}/check-improve`;
  const lines = [
    'Hi,',
    '',
    `This is a service note about your LazyTopper account: your 7-day Premium trial ends on ${when}.`,
    '',
  ];
  if (activity) {
    lines.push(activity.text);
    if (activity.zero) lines.push(`Check an answer: ${checkUrl}`);
    lines.push('');
  }
  lines.push(
    "After it ends, the free features stay free. Premium features need a pass. Nothing is charged automatically - you don't need to do anything.",
    '',
    `See plans: ${plansUrl}`,
    `Open LazyTopper: ${appUrl}/`,
    '',
    "You're getting this one email because you started a trial with this address. We won't email you again about it.",
    `Unsubscribe: ${unsubscribeUrl}`,
    '',
    'LazyTopper',
  );
  const text = lines.join('\n');

  const p = (s) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a">${s}</p>`;
  const a = (href, label) => `<a href="${escapeHtml(href)}" style="color:#13804f;font-weight:600">${escapeHtml(label)}</a>`;
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    p('Hi,'),
    p(`This is a service note about your LazyTopper account: your 7-day Premium trial ends on <strong>${escapeHtml(when)}</strong>.`),
    activity ? p(escapeHtml(activity.text) + (activity.zero ? ` ${a(checkUrl, 'Check an answer')}` : '')) : '',
    p("After it ends, the free features stay free. Premium features need a pass. Nothing is charged automatically - you don't need to do anything."),
    p(`${a(plansUrl, 'See plans')} &nbsp;·&nbsp; ${a(`${appUrl}/`, 'Open LazyTopper')}`),
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">You're getting this one email because you started a trial with this address. We won't email you again about it. ${a(unsubscribeUrl, 'Unsubscribe')}</p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html };
}

// ── Unsubscribe tokens (HMAC, no expiry: an unsubscribe link must keep working) ──────────

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function signUnsubscribe(uid, secret) {
  const mac = crypto.createHmac('sha256', secret).update(`trial-email-unsubscribe:${uid}`).digest();
  return `${b64url(Buffer.from(uid, 'utf8'))}.${b64url(mac)}`;
}
/** The uid a token is for, or null. Constant-time compare; never throws. */
function verifyUnsubscribe(token, secret) {
  try {
    if (!secret || secret.length < MIN_UNSUBSCRIBE_SECRET_LENGTH) return null;
    if (typeof token !== 'string' || token.length > 512) return null;
    const [uidPart, macPart] = token.split('.');
    if (!uidPart || !macPart) return null;
    const uid = fromB64url(uidPart).toString('utf8');
    if (!uid || uid.length > 128 || !/^[A-Za-z0-9_-]+$/.test(uid)) return null;
    const expected = crypto.createHmac('sha256', secret).update(`trial-email-unsubscribe:${uid}`).digest();
    const got = fromB64url(macPart);
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return null;
    return uid;
  } catch {
    return null;
  }
}
function unsubscribeUrlFor(appUrl, uid, secret) {
  return `${appUrl}${TRIAL_EMAIL_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(signUnsubscribe(uid, secret))}`;
}

// ── Provider ────────────────────────────────────────────────────────────────────────────

/**
 * One POST to Resend's REST API (no SDK, no new dependency). `retryable` is true ONLY when the
 * email certainly did not go out or the provider's Idempotency-Key makes a retry safe.
 */
async function sendViaResend({ fetchImpl, apiKey, from, replyTo, to, subject, text, html, unsubscribeUrl, idempotencyKey }) {
  try {
    const body = {
      from,
      to: [to],
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'category', value: 'trial_ending' }],
    };
    if (replyTo) body.reply_to = replyTo;
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(SEND_TIMEOUT_MS) : undefined,
    });
    if (res && res.ok) {
      let id = null;
      try {
        const json = await res.json();
        id = json && typeof json.id === 'string' ? json.id : null;
      } catch {
        /* sent; the id is a nicety */
      }
      return { ok: true, id };
    }
    const status = res ? res.status : 0;
    return { ok: false, retryable: status === 429 || status >= 500, code: `http_${status}` };
  } catch (e) {
    return { ok: false, retryable: true, code: e && e.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

function isAlreadyExists(e) {
  if (!e) return false;
  return e.code === 6 || e.code === 'already-exists' || /already exists/i.test(String(e.message || ''));
}

// ── The job ─────────────────────────────────────────────────────────────────────────────

function createTrialEndingEmailer(deps = {}) {
  const config = deps.config || resolveTrialEmailConfig(deps.env || process.env);
  const { adminFirestore, firebaseAdmin } = deps;
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const log = typeof deps.log === 'function' ? deps.log : (line) => console.log(line);
  const telemetry = deps.telemetry || null;
  const setTimeoutFn = deps.setTimeoutFn || setTimeout;
  const setIntervalFn = deps.setIntervalFn || setInterval;

  let running = false;
  let capDay = '';
  let sentToday = 0;
  const dryRunLogged = new Set();

  function timestampFromMillis(ms) {
    const T = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.Timestamp;
    return T && typeof T.fromMillis === 'function' ? T.fromMillis(ms) : new Date(ms);
  }
  function serverTimestamp() {
    const FV = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
    return FV && typeof FV.serverTimestamp === 'function' ? FV.serverTimestamp() : new Date(now());
  }

  async function readCounts(uid, trialStartMs) {
    try {
      const snap = await adminFirestore
        .collection(SESSION_RECORDS_COLLECTION)
        .doc(uid)
        .collection(SESSION_RECORDS_SEGMENTS.records)
        .where('gradedAt', '>=', trialStartMs)
        .get();
      return countTrialActivity(snap.docs.map((d) => d.data()), trialStartMs);
    } catch {
      return null;
    }
  }

  /** One pass. Never throws; returns a summary (also logged). */
  async function runOnce() {
    const summary = { mode: config.mode, candidates: 0, wouldSend: 0, sent: 0, failed: 0, skipped: {} };
    const skip = (reason) => {
      summary.skipped[reason] = (summary.skipped[reason] || 0) + 1;
    };
    if (config.mode === 'off') return { ...summary, ran: false, reason: 'off' };
    if (running) return { ...summary, ran: false, reason: 'already-running' };
    if (!adminFirestore || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function') {
      log('[trial-email] skipped - firebase-admin not initialised on this deploy.');
      return { ...summary, ran: false, reason: 'no-admin' };
    }
    running = true;
    try {
      const nowMs = now();
      const day = istDayKeyOf(nowMs);
      if (day !== capDay) {
        capDay = day;
        sentToday = 0;
      }
      const { loMs, hiMs } = startRangeFor(nowMs);
      const snap = await adminFirestore
        .collection(SUBSCRIPTIONS_COLLECTION)
        .where('trialStartDate', '>=', timestampFromMillis(loMs))
        .where('trialStartDate', '<', timestampFromMillis(hiMs))
        .get();

      for (const doc of snap.docs) {
        summary.candidates += 1;
        const uid = doc.id;
        const decision = decideCandidate(doc.data(), nowMs);
        if (!decision.ok) {
          skip(decision.reason);
          continue;
        }
        const ledgerRef = adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid);
        const ledger = await ledgerRef.get();
        if (ledger.exists) {
          const data = ledger.data() || {};
          skip(data.optedOut ? 'opted-out' : `already-${data.status || 'recorded'}`);
          continue;
        }
        let user = null;
        try {
          user = await firebaseAdmin.auth().getUser(uid);
        } catch {
          skip('no-account');
          continue;
        }
        const who = emailEligibility(user);
        if (!who.ok) {
          skip(who.reason);
          continue;
        }
        const counts = await readCounts(uid, decision.trialStartMs);
        const endsIso = new Date(decision.trialEndsAtMs).toISOString();

        if (config.mode !== 'send') {
          summary.wouldSend += 1;
          if (!dryRunLogged.has(uid)) {
            dryRunLogged.add(uid);
            const c = counts ? `checks=${counts.checks} tests=${counts.tests} practice=${counts.practiceSets}` : 'counts=unavailable';
            log(`[trial-email] dry-run: would email uid=${uid} to=${maskEmail(who.email)} trialEndsAt=${endsIso} ${c}`);
          }
          continue;
        }

        if (sentToday >= config.dailyCap) {
          skip('daily-cap');
          continue;
        }

        // ★ THE CLAIM — create-only. Exactly one instance/run wins; everyone else skips.
        try {
          await ledgerRef.create({
            trialStartMs: decision.trialStartMs,
            trialEndsAtMs: decision.trialEndsAtMs,
            status: 'claimed',
            claimedAt: serverTimestamp(),
          });
        } catch (e) {
          if (isAlreadyExists(e)) {
            skip('claimed-elsewhere');
            continue;
          }
          skip('claim-error');
          continue;
        }

        const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
        const message = buildTrialEmail({ trialEndsAtMs: decision.trialEndsAtMs, counts, appUrl: config.appUrl, unsubscribeUrl });
        const result = fetchImpl
          ? await sendViaResend({
              fetchImpl,
              apiKey: config.apiKey,
              from: config.from,
              replyTo: config.replyTo,
              to: who.email,
              subject: message.subject,
              text: message.text,
              html: message.html,
              unsubscribeUrl,
              idempotencyKey: `trial-ending-${uid}-${decision.trialStartMs}`,
            })
          : { ok: false, retryable: false, code: 'no-fetch' };

        try {
          if (result.ok) {
            await ledgerRef.update({ status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null });
          } else if (result.retryable) {
            // Certainly not delivered (or safe to retry under the Idempotency-Key): release.
            await ledgerRef.delete();
          } else {
            await ledgerRef.update({ status: 'failed', failedAt: serverTimestamp(), error: result.code });
          }
        } catch {
          /* the claim stays: at most once */
        }

        if (result.ok) {
          summary.sent += 1;
          sentToday += 1;
          if (telemetry && typeof telemetry.increment === 'function') telemetry.increment('trial_email_sent');
          log(`[trial-email] trial_email_sent uid=${uid} trialEndsAt=${endsIso}`);
        } else {
          summary.failed += 1;
          log(`[trial-email] send failed uid=${uid} code=${result.code} retry=${result.retryable ? 'next-run' : 'never'}`);
        }
      }
      log(`[trial-email] run mode=${summary.mode} candidates=${summary.candidates} wouldSend=${summary.wouldSend} sent=${summary.sent} failed=${summary.failed} skipped=${JSON.stringify(summary.skipped)}`);
      return { ...summary, ran: true };
    } catch (e) {
      log(`[trial-email] run failed: ${e && e.message ? e.message : 'error'}`);
      return { ...summary, ran: false, reason: 'error' };
    } finally {
      running = false;
    }
  }

  /** Arm the hourly job. Off -> logs one line and schedules NOTHING. Returns the timers (tests). */
  function schedule() {
    log(describeConfig(config));
    if (config.mode === 'off') return null;
    const first = setTimeoutFn(() => {
      void runOnce();
    }, FIRST_RUN_DELAY_MS);
    const every = setIntervalFn(() => {
      void runOnce();
    }, config.intervalMs);
    if (first && typeof first.unref === 'function') first.unref();
    if (every && typeof every.unref === 'function') every.unref();
    return { first, every };
  }

  // ── Unsubscribe (GET shows a confirm button; POST records it — also RFC 8058 one-click) ──

  function sendHtml(res, status, title, bodyHtml) {
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>` +
        `<body style="margin:0;padding:32px 16px;background:#0f1d33;color:#eaf2fb;font-family:Arial,Helvetica,sans-serif"><main style="max-width:480px;margin:0 auto">${bodyHtml}</main></body></html>`,
    );
  }

  /**
   * GET  -> a confirmation page with one button (a link scanner that prefetches the GET can never
   *         unsubscribe anyone by accident).
   * POST -> record the opt-out on `trialEmails/{uid}` (merge) and confirm. Also what a mail
   *         client's one-click unsubscribe sends. An erased account is not re-created.
   */
  async function handleUnsubscribe(req, res, rawUrl) {
    try {
      let token = '';
      try {
        token = new URL(String(rawUrl || req.url || ''), 'http://local').searchParams.get('t') || '';
      } catch {
        token = '';
      }
      const uid = verifyUnsubscribe(token, config.unsubscribeSecret);
      if (!uid) {
        return sendHtml(res, 400, 'Link not valid', '<h1 style="font-size:20px">This unsubscribe link is not valid.</h1><p>If you copied it, check it is complete.</p>');
      }
      if (req.method === 'GET') {
        const action = `${TRIAL_EMAIL_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(token)}`;
        return sendHtml(
          res,
          200,
          'Unsubscribe',
          '<h1 style="font-size:20px">Stop trial emails from LazyTopper?</h1>' +
            `<form method="post" action="${escapeHtml(action)}"><button type="submit" style="min-height:44px;padding:0 18px;border:0;border-radius:10px;background:#1f9d63;color:#fff;font-size:15px;font-weight:700">Unsubscribe</button></form>`,
        );
      }
      if (req.method !== 'POST') return sendHtml(res, 405, 'Not allowed', '<p>Not allowed.</p>');
      // Drain any one-click body; it carries nothing we need.
      if (typeof req.resume === 'function') req.resume();
      if (adminFirestore && firebaseAdmin && typeof firebaseAdmin.auth === 'function') {
        let exists = true;
        try {
          await firebaseAdmin.auth().getUser(uid);
        } catch (e) {
          if (e && e.code === 'auth/user-not-found') exists = false;
        }
        if (exists) {
          await adminFirestore
            .collection(TRIAL_EMAILS_COLLECTION)
            .doc(uid)
            .set({ optedOut: true, optedOutAt: serverTimestamp() }, { merge: true });
        }
      } else {
        return sendHtml(res, 503, 'Try again later', '<p>We could not record that right now. Please try the link again later.</p>');
      }
      return sendHtml(res, 200, 'Unsubscribed', "<h1 style=\"font-size:20px\">You're unsubscribed.</h1><p>We won't send you trial emails.</p>");
    } catch {
      return sendHtml(res, 500, 'Try again later', '<p>We could not record that right now. Please try the link again later.</p>');
    }
  }

  return { config, runOnce, schedule, handleUnsubscribe };
}

module.exports = {
  createTrialEndingEmailer,
  resolveTrialEmailConfig,
  describeConfig,
  decideCandidate,
  emailEligibility,
  countTrialActivity,
  trialActivityLine,
  buildTrialEmail,
  signUnsubscribe,
  verifyUnsubscribe,
  unsubscribeUrlFor,
  sendViaResend,
  startRangeFor,
  maskEmail,
  istDayKeyOf,
  formatIstDate,
  formatIstTime,
  TRIAL_EMAILS_COLLECTION,
  TRIAL_EMAIL_UNSUBSCRIBE_PATH,
  RESEND_ENDPOINT,
  WINDOW_MIN_MS,
  WINDOW_MAX_MS,
  DEFAULT_DAILY_CAP,
  FIRST_RUN_DELAY_MS,
  MIN_UNSUBSCRIBE_SECRET_LENGTH,
};
