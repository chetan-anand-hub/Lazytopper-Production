/**
 * nudgeEmail.cjs — EMAIL-NUDGE-1 (owner ruling 25 Oct 2026): a small, study-led email sequence
 * for students who signed up but have not yet got value, built on the SAME rails as the
 * trial-ending email (services/trialEndingEmail.cjs) — its Resend call, its unsubscribe, its
 * eligibility rule, its activity counting. There is no second mailer.
 *
 *   D1       "first check"  signed up 20-30 h ago and NO graded session record: check one answer.
 *   D3       "come back"    signed up 3-14 days ago, has done something, not active for 48 h:
 *                            what they did (real counts, zero said as zero) + one next step.
 *   founding "founding"     engaged (>= 15 active minutes, OR opened /pricing, OR >= 2 graded),
 *                            not premium, 10 Nov - 30 Nov 2026 (IST): one factual price line and a
 *                            pointer to the Plans page, where the existing "forward link to
 *                            parents" action lives. Behind its OWN flag NUDGE_FOUNDING_EMAIL_ENABLED (default off) and dark until payments + parent pay are live.
 *
 * ★ OFF BY DEFAULT. Nothing is scheduled unless NUDGE_EMAIL_ENABLED is set. Enabled, it is a DRY
 *   RUN (logs who WOULD be emailed, writes nothing, sends nothing) until NUDGE_EMAIL_DRY_RUN=0 AND
 *   RESEND_API_KEY, a sender (NUDGE_EMAIL_FROM, else OPS_REPORT_FROM, else TRIAL_EMAIL_FROM; it must be on mail.lazytopper.com) and the >= 32-character
 *   TRIAL_EMAIL_UNSUBSCRIBE_SECRET are all present. Missing one -> dry run, and the log says which.
 *   No agent ever handles these secrets.
 *
 * ★ EACH EMAIL AT MOST ONCE PER STUDENT, across restarts and instances: before sending, the job
 *   CLAIMS that email's slot in `nudgeEmails/{uid}` in a Firestore TRANSACTION that also takes one
 *   slot of the IST day's durable cap (`nudgeEmailDaily/{day}`) and re-reads the opt-out. A crash
 *   between claim and send leaves the claim: at most once. Only a send that certainly did NOT go
 *   out (429/5xx/network) releases the claim, in a transaction.
 *
 * ★ ONE UNSUBSCRIBE FOR ALL. The link in every email is the trial email's signed unsubscribe link;
 *   it records `trialEmails/{uid}.optedOut`, which this job reads (inside the claim transaction).
 *   Opting out of one stops all.
 *
 * ★ SPACING. A student gets at most one nudge per 24 h, and none within 24 h of a trial-ending
 *   email (sent, or about to be: trial ends in 24-48 h) — the trial email already covers them.
 *
 * ★ STUDY-LED, NOT MARKETING (DPDP Act 2023 — many students are minors). No name, no tracking
 *   pixel, no link tracking, no urgency words, no invented numbers. Only email sign-ins with a
 *   VERIFIED address (trialEndingEmail.emailEligibility). The price line is read from the server's
 *   pricing mirror (passPricing.cjs), never hard-coded here.
 *
 * ★ "ACTIVE MINUTES" is this lane's definition (no earlier one exists): the feed entries of
 *   `activityLog/{uid}/activityDays/*` sorted by time, summing every gap between consecutive
 *   entries that is <= IDLE_GAP_MS (5 min). A gap longer than that is idle time, not counted.
 *
 * Measured by: `[nudge-email] nudge_email_sent kind=… uid=…`, telemetry counter
 * `nudge_email_sent_<kind>`, and `nudgeEmails/{uid}.<kind>.status == "sent"`.
 */

const {
  isOnFlag,
  isOffFlag,
  clampInt,
  normaliseAppUrl,
  escapeHtml,
  emailEligibility,
  countTrialActivity,
  maskEmail,
  istDayKeyOf,
  formatIstDate,
  sendViaResend,
  unsubscribeUrlFor,
  plural,
  isAlreadyExists,
  TRIAL_EMAILS_COLLECTION,
  UNVERIFIED_RECHECK_MS,
  MIN_UNSUBSCRIBE_SECRET_LENGTH,
  SUBSCRIPTIONS_COLLECTION,
  SESSION_RECORDS_COLLECTION,
  SESSION_RECORDS_SEGMENTS,
  PERMANENT_SKIP_REASONS,
  decideCandidate,
  MINUTE_MS,
  HOUR_MS,
  DAY_MS,
  FIRST_RUN_DELAY_MS,
} = require('./trialEndingEmail.cjs');
const { deriveEffectiveTier, isServerPinnedStart } = require('./entitlement.cjs');
const pricing = require('./passPricing.cjs');

const NUDGE_EMAILS_COLLECTION = 'nudgeEmails';
/** One doc per IST day holding ONLY a count (uid-free; listed in studentDataMap NON_STUDENT_COLLECTIONS). */
const NUDGE_EMAIL_DAILY_COLLECTION = 'nudgeEmailDaily';
const ACTIVITY_COLLECTION = 'activityLog';
// A SUBcollection held as a property (the studentActivity pattern) so the studentDataMap drift
// scanner does not read it as a phantom top-level collection.
const ACTIVITY_SEGMENTS = Object.freeze({ days: 'activityDays' });

const KINDS = Object.freeze(['d1', 'd3', 'founding']);

const D1_MIN_MS = 20 * HOUR_MS;
const D1_MAX_MS = 30 * HOUR_MS;
const D3_MIN_AGE_MS = 3 * DAY_MS;
const D3_MAX_AGE_MS = 14 * DAY_MS;
const D3_INACTIVE_MS = 48 * HOUR_MS;
/** The founding email reaches accounts that signed up within this long (owner decision for later; email is off by default). */
const COHORT_MAX_AGE_MS = 45 * DAY_MS;
/** Per-query caps (newest signups first, so the freshest students are never starved by old ones). */
const CAP_D1 = 500;
const CAP_D3 = 500;
const CAP_FOUNDING = 1000;
/** Only the most recent activity days are read (D3 looks back <= 14 d; founding engagement uses these too). */
const RECENT_DAYS = 14;
/** A student who is not due yet is looked at again after this long (marker in the nudgeEmails doc). */
const RECHECK_MS = 6 * HOUR_MS;
const SPACING_MS = 24 * HOUR_MS;
const IDLE_GAP_MS = 5 * MINUTE_MS;
const ENGAGED_ACTIVE_MINUTES = 15;
const ENGAGED_GRADED = 2;

/** The founding-price email: 10 Nov 2026 00:00 IST up to (not including) 1 Dec 2026 00:00 IST. */
const FOUNDING_LAST_DAY_IST = '2026-11-30';
const FOUNDING_FROM_MS = Date.parse('2026-11-10T00:00:00.000+05:30');
const FOUNDING_UNTIL_MS = Date.parse('2026-12-01T00:00:00.000+05:30');

const DEFAULT_INTERVAL_MS = HOUR_MS;
const MIN_INTERVAL_MS = 5 * MINUTE_MS;
const MAX_INTERVAL_MS = 6 * HOUR_MS;
/** Together with the trial email's own cap this stays under Resend's free plan of 100/day. */
const DEFAULT_DAILY_CAP = 30;

// ── Config ──────────────────────────────────────────────────────────────────────────────

/** The Resend-verified sending domain (owner/coordinator, 25 Oct 2026): mail.lazytopper.com, a subdomain. */
const SENDING_DOMAIN = 'mail.lazytopper.com';

/** Is the from-address ("a@b.c" or "Name <a@b.c>") on the verified sending domain (or below it)? PURE. */
function senderOnVerifiedDomain(from) {
  const m = /<([^<>]+)>\s*$/.exec(String(from || '')) || [null, String(from || '').trim()];
  const addr = m[1].trim().toLowerCase();
  const at = addr.lastIndexOf('@');
  if (at < 1) return false;
  const domain = addr.slice(at + 1);
  return domain === SENDING_DOMAIN || domain.endsWith(`.${SENDING_DOMAIN}`);
}

/** off | dry-run | misconfigured | send — same semantics as the trial email. PURE. */
function resolveNudgeConfig(env = process.env) {
  const e = env || {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const enabled = isOnFlag(e.NUDGE_EMAIL_ENABLED);
  const dryRun = !isOffFlag(e.NUDGE_EMAIL_DRY_RUN);
  const apiKey = str(e.RESEND_API_KEY);
  const from = str(e.NUDGE_EMAIL_FROM) || str(e.OPS_REPORT_FROM) || str(e.TRIAL_EMAIL_FROM);
  const replyTo = str(e.NUDGE_EMAIL_REPLY_TO) || str(e.TRIAL_EMAIL_REPLY_TO) || null;
  const unsubscribeSecret = typeof e.TRIAL_EMAIL_UNSUBSCRIBE_SECRET === 'string' ? e.TRIAL_EMAIL_UNSUBSCRIBE_SECRET : '';
  const missing = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!from) missing.push('NUDGE_EMAIL_FROM');
  else if (!senderOnVerifiedDomain(from)) missing.push(`NUDGE_EMAIL_FROM (must be an address on ${SENDING_DOMAIN})`);
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
    appUrl: normaliseAppUrl(e.NUDGE_EMAIL_APP_URL || e.TRIAL_EMAIL_APP_URL),
    intervalMs: clampInt(e.NUDGE_EMAIL_INTERVAL_MS, DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS, MAX_INTERVAL_MS),
    dailyCap: clampInt(e.NUDGE_EMAIL_DAILY_CAP, DEFAULT_DAILY_CAP, 1, 1000),
    // The founding email points at the Plans page's parent-forward action: it needs payments live.
    paymentsLive: isOnFlag(e.PAYMENTS_ENABLED) && isOnFlag(e.PARENT_PAY_ENABLED),
    // Email 3 has its OWN switch, default OFF, independent of NUDGE_EMAIL_ENABLED (owner decides separately).
    foundingEnabled: isOnFlag(e.NUDGE_FOUNDING_EMAIL_ENABLED),
  };
}

function describeNudgeConfig(config) {
  if (config.mode === 'off') return '[nudge-email] OFF (NUDGE_EMAIL_ENABLED not set) - no nudge emails, nothing scheduled.';
  if (config.mode === 'dry-run') return `[nudge-email] DRY RUN - logs who would be emailed every ${Math.round(config.intervalMs / MINUTE_MS)} min; sends and writes nothing. Set NUDGE_EMAIL_DRY_RUN=0 to send.`;
  if (config.mode === 'misconfigured') return `[nudge-email] DRY RUN (misconfigured: missing ${config.missing.join(', ')}) - nothing is sent until these are set.`;
  return `[nudge-email] SENDING via Resend every ${Math.round(config.intervalMs / MINUTE_MS)} min, cap ${config.dailyCap}/IST day, from ${config.from}.`;
}

// ── Pure helpers ────────────────────────────────────────────────────────────────────────

function msOf(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return null;
}

/** Which emails could be due for an account that signed up `ageMs` ago at `nowMs`? Time only. PURE. */
function kindsInWindow(ageMs, nowMs) {
  const out = [];
  if (ageMs >= D1_MIN_MS && ageMs < D1_MAX_MS) out.push('d1');
  if (ageMs >= D3_MIN_AGE_MS && ageMs < D3_MAX_AGE_MS) out.push('d3');
  if (nowMs >= FOUNDING_FROM_MS && nowMs < FOUNDING_UNTIL_MS && ageMs >= 0 && ageMs < COHORT_MAX_AGE_MS) out.push('founding');
  return out;
}

/**
 * Active minutes from the activity feeds of every day document (see header). PURE.
 * `days` is an array of day-document data; a day without a feed contributes nothing.
 */
function activeMinutesFromDays(days) {
  const times = [];
  for (const d of Array.isArray(days) ? days : []) {
    const feed = d && Array.isArray(d.feed) ? d.feed : [];
    for (const e of feed) if (e && typeof e.t === 'number' && Number.isFinite(e.t)) times.push(e.t);
  }
  times.sort((a, b) => a - b);
  let ms = 0;
  for (let i = 1; i < times.length; i += 1) {
    const gap = times[i] - times[i - 1];
    if (gap > 0 && gap <= IDLE_GAP_MS) ms += gap;
  }
  return ms / MINUTE_MS;
}

/** Did the student open the Plans page? A section count or a feed page hit. PURE. */
function openedPricing(days) {
  for (const d of Array.isArray(days) ? days : []) {
    if (!d) continue;
    const s = d.sections && typeof d.sections === 'object' ? d.sections.pricing : 0;
    if (typeof s === 'number' && s > 0) return true;
    const feed = Array.isArray(d.feed) ? d.feed : [];
    if (feed.some((e) => e && e.k === 'page' && e.n === 'pricing')) return true;
  }
  return false;
}

function lastActiveMs(days, records) {
  let last = null;
  for (const d of Array.isArray(days) ? days : []) {
    const t = d && typeof d.lastSeenMs === 'number' ? d.lastSeenMs : null;
    if (t !== null && (last === null || t > last)) last = t;
  }
  for (const r of Array.isArray(records) ? records : []) {
    const t = r && typeof r.gradedAt === 'number' ? r.gradedAt : null;
    if (t !== null && (last === null || t > last)) last = t;
  }
  return last;
}

const totalGraded = (c) => c.checks + c.tests + c.practiceSets;

/**
 * Is this email due for this student, given what we know? PURE.
 * `facts` = { counts, days, records, nowMs, ageMs }. Returns { ok } or { ok:false, reason }.
 */
function isKindDue(kind, facts) {
  const { counts, days, records, nowMs, ageMs } = facts;
  if (!counts) return { ok: false, reason: 'records-unavailable' };
  if (kind === 'd1') {
    if (ageMs < D1_MIN_MS || ageMs >= D1_MAX_MS) return { ok: false, reason: 'outside-window' };
    // "NO graded session record": any record at all (not only status graded) counts as value got.
    if (totalGraded(counts) > 0 || (Array.isArray(records) && records.length > 0)) return { ok: false, reason: 'already-graded' };
    return { ok: true };
  }
  if (kind === 'd3') {
    if (ageMs < D3_MIN_AGE_MS || ageMs >= D3_MAX_AGE_MS) return { ok: false, reason: 'outside-window' };
    const didSomething = totalGraded(counts) > 0 || (Array.isArray(days) && days.length > 0);
    if (!didSomething) return { ok: false, reason: 'nothing-done' };
    const last = lastActiveMs(days, records);
    if (last === null) return { ok: false, reason: 'no-last-active' };
    if (nowMs - last < D3_INACTIVE_MS) return { ok: false, reason: 'recently-active' };
    return { ok: true };
  }
  if (kind === 'founding') {
    if (nowMs < FOUNDING_FROM_MS || nowMs >= FOUNDING_UNTIL_MS) return { ok: false, reason: 'outside-window' };
    const engaged =
      activeMinutesFromDays(days) >= ENGAGED_ACTIVE_MINUTES || openedPricing(days) || totalGraded(counts) >= ENGAGED_GRADED;
    return engaged ? { ok: true } : { ok: false, reason: 'not-engaged' };
  }
  return { ok: false, reason: 'unknown-kind' };
}

/**
 * When should a student who is NOT due for `kind` be looked at again? PURE. Never earlier than the
 * next hour; a kind that can no longer become due waits out its own window.
 */
function recheckAtMs(kind, reason, facts, startMs) {
  const { nowMs, days, records } = facts;
  let at = nowMs + RECHECK_MS;
  if (reason === 'records-unavailable') at = nowMs + HOUR_MS;
  else if (kind === 'd1' && reason === 'already-graded') at = startMs + D1_MAX_MS;
  else if (kind === 'd3' && reason === 'recently-active') {
    const last = lastActiveMs(days, records);
    if (last !== null) at = Math.max(nowMs + HOUR_MS, last + D3_INACTIVE_MS);
  }
  return at;
}

/** "Founding price: ₹599 a month until 30 Nov; from 1 Dec it is ₹999." Prices from the pricing mirror. PURE. */
function foundingPriceLine() {
  const lastDay = new Date(Date.parse(`${FOUNDING_LAST_DAY_IST}T00:00:00.000+05:30`));
  const lastLabel = formatIstDate(lastDay.getTime()).replace(/^\w{3} /, '');
  const nextLabel = formatIstDate(FOUNDING_UNTIL_MS).replace(/^\w{3} /, '');
  const rupee = (n) => `₹${n}`;
  return `Founding price: ${rupee(pricing.PRICE_MONTHLY_FOUNDING_INR)} a month until ${lastLabel}. From ${nextLabel} it is ${rupee(pricing.PRICE_MONTHLY_LIST_INR)} a month.`;
}

function activityLine(counts) {
  const parts = [];
  if (counts.checks > 0) parts.push(plural(counts.checks, 'answer check', 'answer checks'));
  if (counts.tests > 0) parts.push(plural(counts.tests, 'test taken', 'tests taken'));
  if (counts.practiceSets > 0) parts.push(plural(counts.practiceSets, 'practice set', 'practice sets'));
  if (parts.length === 0) return { text: "So far you haven't checked an answer or taken a test.", zero: true };
  return { text: `So far: ${parts.join(' · ')}.`, zero: false };
}

/**
 * The email for one kind. PURE. Plain HTML + text, no name, no tracking, an unsubscribe link,
 * no urgency words. `counts` is required for d3.
 */
function buildNudgeEmail(kind, { counts, appUrl, unsubscribeUrl }) {
  const checkUrl = `${appUrl}/check-improve`;
  const practiceUrl = `${appUrl}/practice-hub`;
  const plansUrl = `${appUrl}/pricing`;
  let subject;
  const paras = []; // { t: text, links: [{label,url}] }
  if (kind === 'd1') {
    subject = 'Check one answer and see where the marks go';
    paras.push({ t: 'Hi,' });
    paras.push({ t: 'You made your LazyTopper account a day ago. Here is one small thing to try: take an answer you wrote for a board-style question and check it. LazyTopper shows where the marks went, step by step, and what kind of mistake it was. It is free.' });
    paras.push({ t: 'Check an answer', links: [{ label: 'Check an answer', url: checkUrl }] });
    paras.push({ t: 'No pen and paper nearby? Quick Practice works from your phone.', links: [{ label: 'Open Quick Practice', url: practiceUrl }] });
  } else if (kind === 'd3') {
    subject = 'Where you left off on LazyTopper';
    const a = activityLine(counts || { checks: 0, tests: 0, practiceSets: 0 });
    paras.push({ t: 'Hi,' });
    paras.push({ t: `It has been a couple of days since you last used LazyTopper. ${a.text}` });
    if (a.zero) {
      paras.push({ t: 'One next step: check a single answer and see where the marks go.', links: [{ label: 'Check an answer', url: checkUrl }] });
    } else {
      paras.push({ t: 'One next step: a short practice set on a topic you worked on, to see if the same mistake comes back.', links: [{ label: 'Open Practice', url: practiceUrl }] });
    }
  } else {
    subject = 'A note for you and your parents about LazyTopper plans';
    paras.push({ t: 'Hi,' });
    paras.push({ t: 'You have been using LazyTopper to study. If you want to keep going with Premium, here is the price, so you can talk it over at home.' });
    paras.push({ t: foundingPriceLine() });
    paras.push({
      t: 'Plans are on the Plans page. There is a button there to send a link to a parent, so they can look at it when it suits them. Nothing is charged automatically.',
      links: [{ label: 'See plans', url: plansUrl }],
    });
  }

  const textLines = [];
  for (const p of paras) {
    if (p.links && p.t === p.links[0].label) {
      textLines.push(`${p.links[0].label}: ${p.links[0].url}`);
    } else {
      textLines.push(p.t);
      for (const l of p.links || []) textLines.push(`${l.label}: ${l.url}`);
    }
    textLines.push('');
  }
  textLines.push(
    "You're getting this because you made a LazyTopper account with this address. You can stop these emails any time.",
    `Unsubscribe: ${unsubscribeUrl}`,
    '',
    'LazyTopper',
  );
  const text = textLines.join('\n');

  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const a = (href, label) => `<a href="${escapeHtml(href)}" style="color:#13804f;font-weight:600">${escapeHtml(label)}</a>`;
  const body = paras
    .map((p) => {
      if (p.links && p.t === p.links[0].label) return `<p style="${pStyle}">${a(p.links[0].url, p.links[0].label)}</p>`;
      const links = (p.links || []).map((l) => ` ${a(l.url, l.label)}`).join('');
      return `<p style="${pStyle}">${escapeHtml(p.t)}${links}</p>`;
    })
    .join('');
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    body,
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">You're getting this because you made a LazyTopper account with this address. You can stop these emails any time. ${a(unsubscribeUrl, 'Unsubscribe')}</p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html };
}

// ── The job ─────────────────────────────────────────────────────────────────────────────

function createNudgeEmailer(deps = {}) {
  const config = deps.config || resolveNudgeConfig(deps.env || process.env);
  const { adminFirestore, firebaseAdmin } = deps;
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const log = typeof deps.log === 'function' ? deps.log : (line) => console.log(line);
  const telemetry = deps.telemetry || null;
  const setTimeoutFn = deps.setTimeoutFn || setTimeout;
  const setIntervalFn = deps.setIntervalFn || setInterval;

  let running = false;
  const dryRunLogged = new Set();

  function timestampFromMillis(ms) {
    const T = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.Timestamp;
    return T && typeof T.fromMillis === 'function' ? T.fromMillis(ms) : new Date(ms);
  }
  function serverTimestamp() {
    const FV = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
    return FV && typeof FV.serverTimestamp === 'function' ? FV.serverTimestamp() : new Date(now());
  }
  const bump = (name) => {
    if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(name);
  };

  async function readRecords(uid, sinceMs) {
    try {
      const snap = await adminFirestore
        .collection(SESSION_RECORDS_COLLECTION)
        .doc(uid)
        .collection(SESSION_RECORDS_SEGMENTS.records)
        .where('gradedAt', '>=', sinceMs)
        .get();
      return snap.docs.map((d) => d.data());
    } catch {
      return null;
    }
  }
  async function readDays(uid) {
    try {
      const snap = await adminFirestore
        .collection(ACTIVITY_COLLECTION)
        .doc(uid)
        .collection(ACTIVITY_SEGMENTS.days)
        .orderBy('firstSeenMs', 'desc')
        .limit(RECENT_DAYS)
        .get();
      return snap.docs.map((d) => d.data());
    } catch {
      return null;
    }
  }

  /** Millis of the most recent claim/send in a trial-email ledger row, or null. */
  function trialEmailRecentMs(data) {
    if (!data || (data.status !== 'sent' && data.status !== 'claimed')) return null;
    const times = [msOf(data.sentAt), msOf(data.claimedAt)].filter((t) => t !== null);
    return times.length ? Math.max(...times) : null;
  }

  function isDueSkipMarker(skip, nowMs) {
    return !!skip && typeof skip.recheckAfterMs === 'number' && skip.recheckAfterMs <= nowMs;
  }

  /**
   * ★ CLAIM + DURABLE CAP + OPT-OUT RE-READ, in ONE transaction. Returns
   * 'claimed' | 'claimed-elsewhere' | 'opted-out' | 'daily-cap'.
   */
  async function claimWithinCap(uid, kind, dayKey, nowMs) {
    const ledgerRef = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
    const trialRef = adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid);
    const dailyRef = adminFirestore.collection(NUDGE_EMAIL_DAILY_COLLECTION).doc(dayKey);
    return adminFirestore.runTransaction(async (tx) => {
      const l = await tx.get(ledgerRef);
      const t = await tx.get(trialRef);
      const d = await tx.get(dailyRef);
      if (t.exists && (t.data() || {}).optedOut) return 'opted-out';
      const row = l.exists ? l.data() || {} : {};
      if (row[kind]) return 'claimed-elsewhere';
      if (typeof row.lastClaimMs === 'number' && nowMs - row.lastClaimMs < SPACING_MS) return 'spaced';
      const raw = d.exists ? (d.data() || {}).count : 0;
      const count = typeof raw === 'number' && raw > 0 ? raw : 0;
      if (count >= config.dailyCap) return 'daily-cap';
      tx.set(ledgerRef, { [kind]: { status: 'claimed', claimedAt: serverTimestamp(), claimedMs: nowMs, capDay: dayKey }, lastClaimMs: nowMs }, { merge: true });
      tx.set(dailyRef, { count: count + 1, dayKey, updatedAt: serverTimestamp() }, { merge: true });
      return 'claimed';
    });
  }

  /** Release a claim whose send certainly did not go out, and give the day's slot back. */
  async function releaseClaim(uid, kind, dayKey) {
    const ledgerRef = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
    const dailyRef = adminFirestore.collection(NUDGE_EMAIL_DAILY_COLLECTION).doc(dayKey);
    return adminFirestore.runTransaction(async (tx) => {
      const l = await tx.get(ledgerRef);
      const d = await tx.get(dailyRef);
      if (!l.exists) return false;
      const row = { ...(l.data() || {}) };
      if (!row[kind] || row[kind].status !== 'claimed') return false;
      delete row[kind];
      let last = null;
      for (const k of KINDS) {
        const c = row[k] && typeof row[k].claimedMs === 'number' ? row[k].claimedMs : null;
        if (c !== null && (last === null || c > last)) last = c;
      }
      if (last === null) delete row.lastClaimMs;
      else row.lastClaimMs = last;
      tx.set(l.ref || ledgerRef, row);
      const raw = d.exists ? (d.data() || {}).count : 0;
      if (typeof raw === 'number' && raw > 0) tx.set(dailyRef, { count: raw - 1, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    });
  }

  /** Merge "look again after" times (per kind) into the ledger. Never written in a dry run. */
  async function writeCheckMarker(uid, times) {
    try {
      await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).set({ check: times }, { merge: true });
    } catch {
      /* a missing marker only costs a re-read next hour */
    }
  }

  async function writeSkipMarker(uid, reason, nowMs) {
    try {
      await adminFirestore
        .collection(NUDGE_EMAILS_COLLECTION)
        .doc(uid)
        .set({ skip: { reason, recheckAfterMs: PERMANENT_SKIP_REASONS.has(reason) ? null : nowMs + UNVERIFIED_RECHECK_MS, skippedAt: serverTimestamp() } }, { merge: true });
    } catch {
      /* a missing marker only costs a lookup next hour */
    }
  }

  /** One pass. Never throws; returns a summary (also logged). */
  async function runOnce() {
    const summary = { mode: config.mode, candidates: 0, wouldSend: 0, sent: 0, failed: 0, skipped: {}, byKind: { d1: 0, d3: 0, founding: 0 } };
    const skip = (reason) => {
      summary.skipped[reason] = (summary.skipped[reason] || 0) + 1;
    };
    if (config.mode === 'off') return { ...summary, ran: false, reason: 'off' };
    if (running) return { ...summary, ran: false, reason: 'already-running' };
    if (!adminFirestore || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function') {
      log('[nudge-email] skipped - firebase-admin not initialised on this deploy.');
      return { ...summary, ran: false, reason: 'no-admin' };
    }
    running = true;
    try {
      const nowMs = now();
      const day = istDayKeyOf(nowMs);
      // Why the founding email is not running (named in the run log), or null when it is.
      const foundingInWindow = nowMs >= FOUNDING_FROM_MS && nowMs < FOUNDING_UNTIL_MS;
      let foundingGate = null;
      if (foundingInWindow) {
        if (!config.foundingEnabled) foundingGate = 'founding-flag-off';
        else if (!config.paymentsLive) foundingGate = 'payments-not-live';
        else if (!pricing.foundingOfferOpen(nowMs)) foundingGate = 'founding-offer-closed';
      }
      const allowFounding = foundingInWindow && foundingGate === null;
      // ONE narrow single-field range query per window (the trialEndingEmail pattern), newest first.
      const ranges = [
        { loMs: nowMs - D1_MAX_MS, hiMs: nowMs - D1_MIN_MS, cap: CAP_D1 },
        { loMs: nowMs - D3_MAX_AGE_MS, hiMs: nowMs - D3_MIN_AGE_MS, cap: CAP_D3 },
      ];
      if (allowFounding) ranges.push({ loMs: nowMs - COHORT_MAX_AGE_MS, hiMs: nowMs + 1, cap: CAP_FOUNDING });
      const cohort = new Map();
      for (const r of ranges) {
        const qs = await adminFirestore
          .collection(SUBSCRIPTIONS_COLLECTION)
          .where('trialStartDate', '>=', timestampFromMillis(r.loMs))
          .where('trialStartDate', '<', timestampFromMillis(r.hiMs))
          .orderBy('trialStartDate', 'desc')
          .limit(r.cap)
          .get();
        for (const d of qs.docs) if (!cohort.has(d.id)) cohort.set(d.id, d);
      }

      for (const doc of cohort.values()) {
        summary.candidates += 1;
        const uid = doc.id;
        const sub = doc.data() || {};
        // The signup moment is the SERVER-PINNED trial start (a client-written string proves nothing).
        if (!isServerPinnedStart(sub.trialStartDate)) {
          skip('start-not-server-pinned');
          continue;
        }
        const startMs = msOf(sub.trialStartDate);
        const ageMs = nowMs - startMs;
        const { tier } = deriveEffectiveTier(sub, nowMs);
        if (tier === 'premium') {
          skip('premium');
          continue;
        }
        let kinds = kindsInWindow(ageMs, nowMs).filter((k) => k !== 'founding' || allowFounding);
        if (kinds.length === 0) {
          skip('no-window');
          continue;
        }

        const ledgerSnap = await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).get();
        const ledger = ledgerSnap.exists ? ledgerSnap.data() || {} : {};
        if (ledger.skip && !isDueSkipMarker(ledger.skip, nowMs)) {
          skip(`marked-${ledger.skip.reason || 'skipped'}`);
          continue;
        }
        kinds = kinds.filter((k) => !ledger[k]);
        if (kinds.length === 0) {
          skip('already-sent');
          continue;
        }
        // "Look again after": a kind that was not due is not re-evaluated until its marker passes.
        const check = ledger.check && typeof ledger.check === 'object' ? ledger.check : {};
        kinds = kinds.filter((k) => !(typeof check[k] === 'number' && check[k] > nowMs));
        if (kinds.length === 0) {
          skip('not-yet');
          continue;
        }
        const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
        const trialRow = trialSnap.exists ? trialSnap.data() || {} : {};
        if (trialRow.optedOut) {
          skip('opted-out');
          continue;
        }
        // Spacing: one nudge per 24 h (re-checked INSIDE the claim transaction), and none beside the
        // trial-ending email (sent, or about to be).
        if (typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < SPACING_MS) {
          skip('spaced');
          continue;
        }
        const trialRecent = trialEmailRecentMs(trialRow);
        if ((trialRecent !== null && nowMs - trialRecent < SPACING_MS) || decideCandidate(sub, nowMs).ok) {
          skip('trial-email-covers');
          continue;
        }

        const records = await readRecords(uid, startMs);
        const counts = records ? countTrialActivity(records, startMs) : null;
        const needsDays = kinds.includes('d3') || kinds.includes('founding');
        const days = needsDays ? await readDays(uid) : [];
        if (needsDays && days === null) {
          skip('activity-unavailable');
          continue;
        }
        const facts = { counts, days, records, nowMs, ageMs };
        let kind = null;
        let lastReason = 'not-due';
        const notDue = {};
        for (const k of KINDS) {
          if (!kinds.includes(k)) continue;
          const due = isKindDue(k, facts);
          if (due.ok) {
            kind = k;
            break;
          }
          lastReason = `${k}-${due.reason}`;
          notDue[k] = recheckAtMs(k, due.reason, facts, startMs);
        }
        if (!kind) {
          skip(lastReason);
          // Remember when to look again so the next hourly runs do not re-read this student.
          if (config.mode === 'send' && Object.keys(notDue).length) await writeCheckMarker(uid, notDue);
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
          if (config.mode === 'send' && (PERMANENT_SKIP_REASONS.has(who.reason) || who.reason === 'email-unverified')) {
            await writeSkipMarker(uid, who.reason, nowMs);
          }
          continue;
        }

        if (config.mode !== 'send') {
          summary.wouldSend += 1;
          summary.byKind[kind] += 1;
          const key = `${uid}:${kind}`;
          if (!dryRunLogged.has(key)) {
            dryRunLogged.add(key);
            log(`[nudge-email] dry-run: would email kind=${kind} uid=${uid} to=${maskEmail(who.email)} checks=${counts.checks} tests=${counts.tests} practice=${counts.practiceSets}`);
          }
          continue;
        }

        let claim;
        try {
          claim = await claimWithinCap(uid, kind, day, nowMs);
        } catch (e) {
          skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
          continue;
        }
        if (claim !== 'claimed') {
          skip(claim);
          if (claim === 'daily-cap') break; // the day is full: no point trying the rest
          continue;
        }

        const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
        const message = buildNudgeEmail(kind, { counts, appUrl: config.appUrl, unsubscribeUrl });
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
              idempotencyKey: `nudge-${kind}-${uid}`,
              category: `nudge_${kind}`,
            })
          : { ok: false, retryable: false, code: 'no-fetch' };

        try {
          const ref = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
          if (result.ok) {
            await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
          } else if (result.retryable) {
            await releaseClaim(uid, kind, day);
          } else {
            await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
          }
        } catch {
          /* the claim stays: at most once */
        }

        if (result.ok) {
          summary.sent += 1;
          summary.byKind[kind] += 1;
          bump(`nudge_email_sent_${kind}`);
          log(`[nudge-email] nudge_email_sent kind=${kind} uid=${uid}`);
        } else {
          summary.failed += 1;
          bump(`nudge_email_failed_${kind}`);
          log(`[nudge-email] send failed kind=${kind} uid=${uid} code=${result.code} retry=${result.retryable ? 'next-run' : 'never'}`);
        }
      }
      if (foundingGate) log(`[nudge-email] founding email not running: ${foundingGate}`);
      log(`[nudge-email] run mode=${summary.mode} candidates=${summary.candidates} wouldSend=${summary.wouldSend} sent=${summary.sent} failed=${summary.failed} byKind=${JSON.stringify(summary.byKind)} skipped=${JSON.stringify(summary.skipped)}`);
      return { ...summary, ran: true };
    } catch (e) {
      log(`[nudge-email] run failed: ${e && e.message ? e.message : 'error'}`);
      return { ...summary, ran: false, reason: 'error' };
    } finally {
      running = false;
    }
  }

  /** Arm the hourly job. Off -> logs one line and schedules NOTHING. */
  function schedule() {
    log(describeNudgeConfig(config));
    if (config.mode === 'off') return null;
    // Offset from the trial email's first run so the two jobs do not start together.
    const first = setTimeoutFn(() => {
      void runOnce();
    }, FIRST_RUN_DELAY_MS + 3 * MINUTE_MS);
    const every = setIntervalFn(() => {
      void runOnce();
    }, config.intervalMs);
    if (first && typeof first.unref === 'function') first.unref();
    if (every && typeof every.unref === 'function') every.unref();
    return { first, every };
  }

  return { config, runOnce, schedule };
}

module.exports = {
  createNudgeEmailer,
  resolveNudgeConfig,
  senderOnVerifiedDomain,
  SENDING_DOMAIN,
  describeNudgeConfig,
  kindsInWindow,
  isKindDue,
  recheckAtMs,
  activeMinutesFromDays,
  openedPricing,
  foundingPriceLine,
  buildNudgeEmail,
  NUDGE_EMAILS_COLLECTION,
  NUDGE_EMAIL_DAILY_COLLECTION,
  KINDS,
  DEFAULT_DAILY_CAP,
  FOUNDING_FROM_MS,
  FOUNDING_UNTIL_MS,
  IDLE_GAP_MS,
};
