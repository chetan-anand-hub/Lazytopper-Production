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
 *                            not premium, 3 Nov - 30 Nov 2026 (IST): one factual price line and a
 *                            pointer to the Plans page, where the existing "forward link to
 *                            parents" action lives. Behind its OWN flag NUDGE_FOUNDING_EMAIL_ENABLED (default off) and dark until payments + parent pay are live.
 *
 *   EMAIL-CONCIERGE-1 (owner ruling 25 Oct 2026, the founder's hand-sent notes, automated; templates in
 *   nudgeConciergeTemplates.cjs), each at most ONCE per student ever, behind NUDGE_CONCIERGE_ENABLED (default off):
 *   founder_checkin  not paying, active in the last 14 days, and >= 15 active minutes OR >= 2 graded OR the Plans
 *                    page opened >= 2 times: thanks, one honest question, a free 10-minute call.
 *   checkout_help    a plan order created 2-48 h ago and still unpaid: did payment go wrong, or the price?
 *   REACTIVATE-1 (owner ruling 31 Oct 2026): `comeback`, at most ONCE per student ever, behind NUDGE_COMEBACK_ENABLED (default off):
 *   signed up 2-30 days ago with ZERO activity (no session record of any kind), not premium/admin/@lazytopper.com. One study offer:
 *   5 board-style questions from one chapter, one button into a ready Quick Practice set. No price. Served LAST under the shared
 *   daily cap (after checkout_help, d1, d3 and founder_checkin), newest sign-ups first. Every rule below applies unchanged.
 *   CHECKOUT-NUDGE-1 (owner approved 3 Nov 2026): `abandoned_<product>`, at most ONCE per student per product ever, behind
 *   ABANDONED_CHECKOUT_EMAIL_ENABLED="1" (default off): a signed-in student's own Board Pass / PDF pack order, still
 *   'created' 1-36 h after it was opened, with no payment for that product since. Served FIRST under the shared daily cap
 *   (before checkout_help and the pack nudges). Pure rules + template: abandonedCheckout.cjs.
 *   SAMPLE-FOLLOWUP-1 (owner approved 4 Nov 2026): `samplefu_<pack>`, at most ONCE per student per pack ever, behind
 *   SAMPLE_FOLLOWUP_EMAIL_ENABLED="1" (default off): a SIGNED-IN student who saved a pack's free sample 24-72 h ago and does not
 *   own that pack (or one that includes it) nor a paid Board Pass. The "sample saved" marker is written by routes/packSampleSeen.cjs
 *   into `nudgeEmails/{uid}.sampleSeenAt_<pack>`. Runs after the pack nudges, before d1/d3. Pure rules + template: sampleFollowup.cjs.
 *   GUEST-ABANDON-1 (owner ruling 6 Nov 2026): `abandoned_<product>` in `guestNudgeEmails/{emailKey}`, at most ONCE per
 *   recipient address per product ever, behind GUEST_ABANDON_EMAIL_ENABLED="1" (default off): a SIGNED-OUT guest checkout
 *   that carries an email address, still 'created' 1-36 h after it was opened, nothing paid for it since. Runs right after
 *   CHECKOUT-NUDGE-1. Its own stop link writes `emailSuppression/{emailKey}`. Pure rules + template: guestAbandonEmail.cjs.
 *   Both need a reply-to (NUDGE_EMAIL_REPLY_TO) - without one they are skipped and logged. They share the daily
 *   cap with the rest; checkout_help is served first. Never premium, admin (ADMIN_FIREBASE_UIDS) or @lazytopper.com.
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
const { isPackProduct } = require('./packProducts.cjs');
const { buildConciergeEmail } = require('./nudgeConciergeTemplates.cjs');
const packNudge = require('./packNudge.cjs');
const { resolveSendWindow } = require('./emailSendWindow.cjs'); // EMAIL-SEND-WINDOW-1
const { packIdFor } = require('./packProducts.cjs');
const abandoned = require('./abandonedCheckout.cjs'); // CHECKOUT-NUDGE-1
const sampleFu = require('./sampleFollowup.cjs'); // SAMPLE-FOLLOWUP-1
const { listPacks } = require('./packGrant.cjs');
const guestEmail = require('./guestAbandonEmail.cjs'); // GUEST-ABANDON-1
const { isSuppressedTx } = require('./emailSuppression.cjs');
const { PACK_PRODUCTS, isAlreadyOwned } = require('./packProducts.cjs');
const { computeGrant } = require('./passGrant.cjs');

const NUDGE_EMAILS_COLLECTION = 'nudgeEmails';
/** One doc per IST day holding ONLY a count (uid-free; listed in studentDataMap NON_STUDENT_COLLECTIONS). */
const NUDGE_EMAIL_DAILY_COLLECTION = 'nudgeEmailDaily';
const ACTIVITY_COLLECTION = 'activityLog';
const PRACTICE_INSIGHTS_COLLECTION = 'practiceInsights';
// A SUBcollection held as a property (same pattern as ACTIVITY_SEGMENTS) so the drift scanner does not read it as a top-level one.
const PRACTICE_SEGMENTS = Object.freeze({ attempts: 'attempts' });
// A SUBcollection held as a property (the studentActivity pattern) so the studentDataMap drift
// scanner does not read it as a phantom top-level collection.
const ACTIVITY_SEGMENTS = Object.freeze({ days: 'activityDays' });

const KINDS = Object.freeze(['d1', 'd3', 'founding']);
/** EMAIL-CONCIERGE-1: the two founder-note kinds. Own flag, own queries; checkout_help is served first. */
const CONCIERGE_KINDS = Object.freeze(['checkout_help', 'founder_checkin']);
/** REACTIVATE-1: the comeback kind has its own flag and its own pass (runComeback), served after everything else. */
const COMEBACK_KIND = 'comeback';
const ALL_KINDS = Object.freeze([...KINDS, ...CONCIERGE_KINDS, COMEBACK_KIND]);
const COMEBACK_MIN_AGE_MS = 2 * DAY_MS;
const COMEBACK_MAX_AGE_MS = 30 * DAY_MS;
const CAP_COMEBACK = 1000;
const COMEBACK_SPACING_MS = 48 * HOUR_MS;
/** The two offers, alternated per student by a stable hash of the uid (no randomness). `topic` = the Quick Practice topic key. */
const COMEBACK_CHAPTERS = Object.freeze([
  Object.freeze({ subject: 'science', topic: 'electricity', label: 'Electricity' }),
  Object.freeze({ subject: 'maths', topic: 'trigonometry', label: 'Trigonometry' }),
]);
function comebackChapterFor(uid) {
  let h = 0;
  for (const ch of String(uid || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COMEBACK_CHAPTERS[h % COMEBACK_CHAPTERS.length];
}
/** The Quick Practice route that builds and starts a 5-question set on arrival (a topic param = targeted entry). UTM only. */
function comebackPracticeUrl(appUrl, chapter) {
  return `${appUrl}/practice/10/${chapter.subject}?topic=${encodeURIComponent(chapter.topic)}&count=5&utm_source=email&utm_medium=email&utm_campaign=nudge_comeback`;
}
const PAY_ORDERS_COLLECTION = 'payOrders';
/** PACK-NUDGE-1: where a student's purchased packs live (packEntitlements/{uid}/packs/{packId}). Subcollection held as a property. */
const PACK_ENTITLEMENTS_COLLECTION = 'packEntitlements';
const PACK_ENTITLEMENT_SEGMENTS = Object.freeze({ packs: 'packs' });
const CAP_PACK_NUDGE = 500;
/** checkout_help: an order created 2-48 h ago and still not paid. */
const CHECKOUT_MIN_MS = 2 * HOUR_MS;
const CHECKOUT_MAX_MS = 48 * HOUR_MS;
const CAP_CHECKOUT = 500;
const CAP_CHECKIN = 1000;
/** founder_checkin: active within this long, and at least one engagement signal. */
const CHECKIN_ACTIVE_WITHIN_MS = 14 * DAY_MS;
const CHECKIN_MIN_PRICING_OPENS = 2;
const CHECKIN_INTERNAL_EMAIL_DOMAINS = Object.freeze(['lazytopper.com']);

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

/** The founding-price email: 3 Nov 2026 00:00 IST (owner ruling 3 Nov 2026: start now, not 10 Nov) up to (not including) 1 Dec 2026 00:00 IST. */
const FOUNDING_LAST_DAY_IST = '2026-11-30';
const FOUNDING_FROM_MS = Date.parse('2026-11-03T00:00:00.000+05:30');
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
    // EMAIL-CONCIERGE-1: the founder-note emails have their OWN switch, default OFF, on top of NUDGE_EMAIL_ENABLED.
    conciergeEnabled: isOnFlag(e.NUDGE_CONCIERGE_ENABLED),
    // REACTIVATE-1: the comeback email has its OWN switch, default OFF, on top of NUDGE_EMAIL_ENABLED.
    comebackEnabled: isOnFlag(e.NUDGE_COMEBACK_ENABLED),
    // PACK-NUDGE-1: the "you have not opened your pack" emails have their OWN switch, default OFF, on top of NUDGE_EMAIL_ENABLED.
    packNudgeEnabled: isOnFlag(e.PACK_NUDGE_ENABLED),
    // CHECKOUT-NUDGE-1: the abandoned-checkout email has its OWN switch, default OFF, exactly "1" enables, on top of NUDGE_EMAIL_ENABLED.
    abandonedCheckoutEnabled: abandoned.abandonedCheckoutEnabled(e),
    // SAMPLE-FOLLOWUP-1: the free-sample follow-up email has its OWN switch, default OFF, exactly "1" enables, on top of NUDGE_EMAIL_ENABLED.
    sampleFollowupEnabled: sampleFu.sampleFollowupEnabled(e),
    // GUEST-ABANDON-1: the signed-out abandoned-checkout email has its OWN switch, default OFF, exactly "1" enables, on top of NUDGE_EMAIL_ENABLED.
    guestAbandonEnabled: guestEmail.guestAbandonEmailEnabled(e),
    // Never emailed: the admin allowlist (the same ADMIN_FIREBASE_UIDS the admin pages use).
    adminUids: new Set(str(e.ADMIN_FIREBASE_UIDS).split(',').map((x) => x.trim()).filter(Boolean)),
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

/** How many times the Plans page was opened: per day the larger of the section count and the feed hits. PURE. */
function pricingOpenCount(days) {
  let n = 0;
  for (const d of Array.isArray(days) ? days : []) {
    if (!d) continue;
    const s = d.sections && typeof d.sections === 'object' && typeof d.sections.pricing === 'number' ? d.sections.pricing : 0;
    const feed = Array.isArray(d.feed) ? d.feed.filter((e) => e && e.k === 'page' && e.n === 'pricing').length : 0;
    n += Math.max(s, feed);
  }
  return n;
}

/** Is this a LazyTopper/admin account (never sent a founder note)? PURE. */
function isInternalAccount(uid, email, adminUids) {
  if (adminUids && typeof adminUids.has === 'function' && adminUids.has(uid)) return true;
  const at = String(email || '').lastIndexOf('@');
  if (at < 0) return false;
  const domain = String(email).slice(at + 1).toLowerCase();
  return CHECKIN_INTERNAL_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/**
 * founder_checkin: not paying (the caller drops premium), active in the last 14 days, and one of
 * >= 15 active minutes, >= 2 graded items, >= 2 Plans-page opens. PURE. Returns { ok, facts } or { ok:false, reason }.
 */
function isCheckinDue({ counts, days, records, nowMs }) {
  if (!counts) return { ok: false, reason: 'records-unavailable' };
  const last = lastActiveMs(days, records);
  if (last === null || nowMs - last > CHECKIN_ACTIVE_WITHIN_MS) return { ok: false, reason: 'inactive' };
  const activeMinutes = activeMinutesFromDays(days);
  const pricingOpens = pricingOpenCount(days);
  const graded = totalGraded(counts);
  if (activeMinutes >= ENGAGED_ACTIVE_MINUTES || graded >= ENGAGED_GRADED || pricingOpens >= CHECKIN_MIN_PRICING_OPENS) {
    return { ok: true, facts: { checks: counts.checks, tests: counts.tests, practiceSets: counts.practiceSets, activeMinutes, pricingOpens } };
  }
  return { ok: false, reason: 'not-engaged' };
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

/**
 * PRICE-FIXED-1: "Board Pass: ₹<today's price>, one payment till your boards." The price (founding, then after-founding) comes from the pricing mirror. The
 * month pass is NOT quoted to anyone (owner ruling 31 Oct 2026: the monthly price is hidden throughout).
 * Kept under its old export name so callers and the test seam do not move. PURE.
 */
function foundingPriceLine() {
  const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  return `Board Pass: ${rupee(pricing.tillBoardsPriceInr(Date.now()))}, one payment, and you are covered till your boards.`;
}

function activityLine(counts) {
  const parts = [];
  if (counts.checks > 0) parts.push(plural(counts.checks, 'answer check', 'answer checks'));
  if (counts.tests > 0) parts.push(plural(counts.tests, 'test taken', 'tests taken'));
  if (counts.practiceSets > 0) parts.push(plural(counts.practiceSets, 'practice set', 'practice sets'));
  if (parts.length === 0) return { text: "So far you haven't checked an answer or taken a test.", zero: true };
  return { text: `So far: ${parts.join(' · ')}.`, zero: false };
}

/** One short PDF-packs line for the d1 / d3 nudges. UTM only; no uid, email or other student data in the URL. */
function packsPara(appUrl, campaign) {
  const label = 'Want printed practice? Chapter packs from ₹49 → lazytopper.com/pricing';
  return { t: label, links: [{ label, url: `${appUrl}/pricing?utm_source=email&utm_medium=email&utm_campaign=${campaign}&utm_content=packs#packs` }] };
}

/**
 * The email for one kind. PURE. Plain HTML + text, no name, no tracking, an unsubscribe link,
 * no urgency words. `counts` is required for d3.
 */
function buildNudgeEmail(kind, { counts, appUrl, unsubscribeUrl, chapter }) {
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
    paras.push(packsPara(appUrl, 'nudge_d1'));
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
    paras.push(packsPara(appUrl, 'nudge_d3'));
  } else if (kind === 'comeback') {
    const ch = chapter || COMEBACK_CHAPTERS[0];
    subject = '5 board-style questions, about 2 minutes';
    paras.push({ t: 'Hi,' });
    paras.push({ t: `Your LazyTopper account is ready. Here is a small way to start: 5 board-style questions from ${ch.label}, about 2 minutes. You tap your answers, so your phone is enough, and it is free.` });
    paras.push({ t: 'Start the 5 questions', links: [{ label: 'Start the 5 questions', url: comebackPracticeUrl(appUrl, ch) }] });
    paras.push({ t: 'Later, when you have written an answer on paper, Answer Checker shows where the marks went, step by step.' });
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
  // EMAIL-SEND-WINDOW-1: batch student emails go out only inside this IST clock window (default 08:00-21:00).
  const sendWindow = resolveSendWindow(deps.env || process.env, log);

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
  /** REACTIVATE-1: has the student tapped any practice card? (writes no session record). null = unreadable. */
  async function hasPracticeAttempts(uid) {
    try {
      const snap = await adminFirestore.collection(PRACTICE_INSIGHTS_COLLECTION).doc(uid).collection(PRACTICE_SEGMENTS.attempts).limit(1).get();
      return snap.docs.length > 0;
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
  async function claimWithinCap(uid, kind, dayKey, nowMs, email) {
    const ledgerRef = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
    const trialRef = adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid);
    const dailyRef = adminFirestore.collection(NUDGE_EMAIL_DAILY_COLLECTION).doc(dayKey);
    return adminFirestore.runTransaction(async (tx) => {
      const l = await tx.get(ledgerRef);
      const t = await tx.get(trialRef);
      const d = await tx.get(dailyRef);
      if (t.exists && (t.data() || {}).optedOut) return 'opted-out';
      // GUEST-ABANDON-1 review D1: a stop recorded for this ADDRESS (guest stop link) stops every nudge too.
      if (await isSuppressedTx(tx, adminFirestore, email)) return 'opted-out';
      const row = l.exists ? l.data() || {} : {};
      if (row[kind]) return 'claimed-elsewhere';
      if (typeof row.lastClaimMs === 'number' && nowMs - row.lastClaimMs < SPACING_MS) return 'spaced';
      // EMAIL-ONEADAY-1: a trial-ending email claimed or sent within 24 h, read INSIDE the transaction.
      const trialRecent = trialEmailRecentMs(t.exists ? t.data() || {} : null);
      if (trialRecent !== null && nowMs - trialRecent < SPACING_MS) return 'spaced';
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
      // Every ledger entry that carries a claim time (the fixed kinds AND the per-pack PACK-NUDGE-1 keys).
      for (const k of Object.keys(row)) {
        const c = row[k] && typeof row[k] === 'object' && typeof row[k].claimedMs === 'number' ? row[k].claimedMs : null;
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

  /**
   * Re-read just before a checkout_help claim: is the student Premium now, or is any of their orders NEWER
   * than the candidate order paid/captured? Returns a skip reason or null. A failed read skips (never emails blind).
   */
  async function paidSince(uid, candidateOrder, nowMs) {
    try {
      const subSnap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
      const fresh = subSnap.exists ? subSnap.data() || {} : {};
      if (deriveEffectiveTier(fresh, nowMs).tier === 'premium') return 'premium-now';
      const since = msOf(candidateOrder && candidateOrder.createdAt);
      const snap = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where('uid', '==', uid).get();
      for (const d of snap.docs) {
        const o = d.data() || {};
        const at = msOf(o.createdAt);
        if ((o.status === 'paid' || o.status === 'captured') && (since === null || at === null || at > since)) return 'paid-since';
      }
      return null;
    } catch {
      return 'recheck-unavailable';
    }
  }

  /**
   * EMAIL-CONCIERGE-1: the founder's two personal notes, sent automatically (at most ONCE per student,
   * ever) on the same claim / cap / opt-out / spacing rails. checkout_help candidates come first, so when
   * the shared daily cap binds they win. Returns true when the daily cap is full (the caller stops).
   */
  async function runConcierge({ summary, skip, nowMs, day, phase, state }) {
    if (!config.conciergeEnabled) return false;
    if (!config.replyTo) {
      // Their whole point is that the founder gets the reply: with no reply-to they do not run.
      if (phase === 'checkout_help') log('[nudge-email] concierge skipped: no reply-to');
      return false;
    }
    const candidates = []; // { uid, kind, sub, order }

    // checkout_help: an order created 2-48 h ago, none of this student's orders in that window paid.
    if (phase === 'checkout_help') try {
      const qs = await adminFirestore
        .collection(PAY_ORDERS_COLLECTION)
        .where('createdAt', '>=', timestampFromMillis(nowMs - CHECKOUT_MAX_MS))
        .where('createdAt', '<', timestampFromMillis(nowMs - CHECKOUT_MIN_MS))
        .orderBy('createdAt', 'desc')
        .limit(CAP_CHECKOUT)
        .get();
      const byUid = new Map();
      for (const d of qs.docs) {
        const o = d.data() || {};
        if (typeof o.uid !== 'string' || !o.uid) continue;
        const e = byUid.get(o.uid) || { paid: false, order: null };
        if (o.status === 'paid') e.paid = true;
        // The student's OWN plan order only: not a top-up, not a PDF pack (PACKS-SERVER-1: the email is
        // framed around a plan), and not an order a parent started.
        else if (!e.order && !pricing.isTopupProduct(o.passType) && !isPackProduct(o.passType) && !o.parentLinkId && !o.payer) e.order = o;
        byUid.set(o.uid, e);
      }
      for (const [uid, e] of byUid) {
        if (e.paid) skip('checkout-paid');
        else if (e.order) candidates.push({ uid, kind: 'checkout_help', order: e.order });
      }
    } catch {
      skip('checkout-orders-unavailable');
    }

    // founder_checkin: the recent signups; activity and engagement are checked per student below.
    if (phase === 'founder_checkin') try {
      const qs = await adminFirestore
        .collection(SUBSCRIPTIONS_COLLECTION)
        .where('trialStartDate', '>=', timestampFromMillis(nowMs - COHORT_MAX_AGE_MS))
        .where('trialStartDate', '<', timestampFromMillis(nowMs + 1))
        .orderBy('trialStartDate', 'desc')
        .limit(CAP_CHECKIN)
        .get();
      for (const d of qs.docs) candidates.push({ uid: d.id, kind: 'founder_checkin', sub: d.data() || {} });
    } catch {
      skip('checkin-cohort-unavailable');
    }

    const { seen, dead } = state;
    // (shared across the two phases of one run)  // student-level stops (premium, internal, opted out, no usable address): not tried again as the other kind
    for (const c of candidates) {
      const { uid, kind } = c;
      if (seen.has(uid) || dead.has(uid)) continue; // one note per student per run; checkout_help came first
      summary.candidates += 1;
      let sub = c.sub;
      // Same rule as the d1/d3 loop: the signup moment is the SERVER-PINNED trial start.
      if (kind === 'founder_checkin' && !isServerPinnedStart(sub.trialStartDate)) {
        skip('start-not-server-pinned');
        continue;
      }
      if (!sub) {
        try {
          const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
          sub = snap.exists ? snap.data() || {} : {};
        } catch {
          skip('subscription-unavailable');
          continue;
        }
      }
      if (deriveEffectiveTier(sub, nowMs).tier === 'premium') {
        dead.add(uid);
        skip('premium');
        continue;
      }
      if (config.adminUids.has(uid)) {
        dead.add(uid);
        skip('internal');
        continue;
      }
      const ledgerSnap = await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).get();
      const ledger = ledgerSnap.exists ? ledgerSnap.data() || {} : {};
      if (ledger[kind]) {
        skip('already-sent');
        continue;
      }
      // CHECKOUT-NUDGE-1: the abandoned-checkout email already followed this student's checkout up; no second note.
      if (kind === 'checkout_help' && abandoned.hasAbandonedEntry(ledger)) {
        skip('abandoned-email-covers');
        continue;
      }
      if (ledger.skip && !isDueSkipMarker(ledger.skip, nowMs)) {
        skip(`marked-${ledger.skip.reason || 'skipped'}`);
        continue;
      }
      const check = ledger.check && typeof ledger.check === 'object' ? ledger.check : {};
      if (typeof check[kind] === 'number' && check[kind] > nowMs) {
        skip('not-yet');
        continue;
      }
      const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
      const trialRow = trialSnap.exists ? trialSnap.data() || {} : {};
      if (trialRow.optedOut) {
        dead.add(uid);
        skip('opted-out');
        continue;
      }
      if (typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < SPACING_MS) {
        skip('spaced');
        continue;
      }
      const trialRecent = trialEmailRecentMs(trialRow);
      if ((trialRecent !== null && nowMs - trialRecent < SPACING_MS) || decideCandidate(sub, nowMs).ok) {
        skip('trial-email-covers');
        continue;
      }

      let facts = null;
      let counts = null;
      if (kind === 'founder_checkin') {
        const startMs = msOf(sub.trialStartDate);
        const records = startMs === null ? null : await readRecords(uid, startMs);
        counts = records ? countTrialActivity(records, startMs) : null;
        const days = await readDays(uid);
        if (days === null) {
          skip('activity-unavailable');
          continue;
        }
        const due = isCheckinDue({ counts, days, records, nowMs });
        if (!due.ok) {
          skip(`${kind}-${due.reason}`);
          if (config.mode === 'send') await writeCheckMarker(uid, { [kind]: nowMs + (due.reason === 'records-unavailable' ? HOUR_MS : RECHECK_MS) });
          continue;
        }
        facts = due.facts;
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
        dead.add(uid);
        skip(who.reason);
        if (config.mode === 'send' && (PERMANENT_SKIP_REASONS.has(who.reason) || who.reason === 'email-unverified')) {
          await writeSkipMarker(uid, who.reason, nowMs);
        }
        continue;
      }
      if (isInternalAccount(uid, who.email, config.adminUids)) {
        dead.add(uid);
        skip('internal');
        continue;
      }
      // checkout_help, last look before the claim: a payment that landed after the early reads (a newer
      // order paid/captured, or Premium now) means no email.
      if (kind === 'checkout_help') {
        const late = await paidSince(uid, c.order, nowMs);
        if (late) {
          dead.add(uid);
          skip(late);
          continue;
        }
      }
      seen.add(uid);

      if (config.mode !== 'send') {
        summary.wouldSend += 1;
        summary.byKind[kind] += 1;
        const key = `${uid}:${kind}`;
        if (!dryRunLogged.has(key)) {
          dryRunLogged.add(key);
          log(`[nudge-email] dry-run: would email kind=${kind} uid=${uid} to=${maskEmail(who.email)}`);
        }
        continue;
      }

      let claim;
      try {
        claim = await claimWithinCap(uid, kind, day, nowMs, who.email);
      } catch (e) {
        skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
        continue;
      }
      if (claim !== 'claimed') {
        skip(claim);
        if (claim === 'daily-cap') return true;
        continue;
      }

      const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
      const message = buildConciergeEmail(kind, { facts, order: c.order, unsubscribeUrl });
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
        if (result.ok) await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
        else if (result.retryable) await releaseClaim(uid, kind, day);
        else await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
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
    return false;
  }

  /**
   * REACTIVATE-1: the one "comeback" email for sign-ups 2-30 days old who never did anything. Same rails as the
   * others (claim + durable cap + opt-out re-read in ONE transaction, 24 h spacing, trial-email overlap, verified
   * email only, at most once ever). Newest sign-ups first; runs after every other kind so the cap serves them first.
   * Returns true when the daily cap is full.
   */
  async function runComeback({ summary, skip, nowMs, day }) {
    if (!config.comebackEnabled) return false;
    const kind = COMEBACK_KIND;
    let docs = [];
    try {
      const qs = await adminFirestore
        .collection(SUBSCRIPTIONS_COLLECTION)
        .where('trialStartDate', '>=', timestampFromMillis(nowMs - COMEBACK_MAX_AGE_MS))
        .where('trialStartDate', '<', timestampFromMillis(nowMs - COMEBACK_MIN_AGE_MS))
        .orderBy('trialStartDate', 'desc')
        .limit(CAP_COMEBACK)
        .get();
      docs = qs.docs;
    } catch {
      skip('comeback-cohort-unavailable');
      return false;
    }
    for (const doc of docs) {
      const uid = doc.id;
      const sub = doc.data() || {};
      summary.candidates += 1;
      if (!isServerPinnedStart(sub.trialStartDate)) {
        skip('start-not-server-pinned');
        continue;
      }
      const startMs = msOf(sub.trialStartDate);
      if (deriveEffectiveTier(sub, nowMs).tier === 'premium') {
        skip('premium');
        continue;
      }
      if (config.adminUids.has(uid)) {
        skip('internal');
        continue;
      }
      const ledgerSnap = await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).get();
      const ledger = ledgerSnap.exists ? ledgerSnap.data() || {} : {};
      if (ledger[kind]) {
        skip('already-sent');
        continue;
      }
      if (ledger.skip && !isDueSkipMarker(ledger.skip, nowMs)) {
        skip(`marked-${ledger.skip.reason || 'skipped'}`);
        continue;
      }
      const check = ledger.check && typeof ledger.check === 'object' ? ledger.check : {};
      if (typeof check[kind] === 'number' && check[kind] > nowMs) {
        skip('not-yet');
        continue;
      }
      const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
      const trialRow = trialSnap.exists ? trialSnap.data() || {} : {};
      if (trialRow.optedOut) {
        skip('opted-out');
        continue;
      }
      // Comeback waits 48 h after ANY other nudge (lastClaimMs is the latest claim of every kind), so D1 on
      // day 1 is never followed by comeback on day 2.
      if (typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < COMEBACK_SPACING_MS) {
        skip('spaced');
        continue;
      }
      const trialRecent = trialEmailRecentMs(trialRow);
      if ((trialRecent !== null && nowMs - trialRecent < SPACING_MS) || decideCandidate(sub, nowMs).ok) {
        skip('trial-email-covers');
        continue;
      }
      // ZERO activity: no session record of ANY status/surface, so nothing graded, tested or practised.
      const records = await readRecords(uid, startMs);
      const counts = records ? countTrialActivity(records, startMs) : null;
      if (!records || !counts) {
        skip('records-unavailable');
        if (config.mode === 'send') await writeCheckMarker(uid, { [kind]: nowMs + HOUR_MS });
        continue;
      }
      if (records.length > 0 || totalGraded(counts) > 0) {
        skip('comeback-has-activity');
        if (config.mode === 'send') await writeCheckMarker(uid, { [kind]: nowMs + COMEBACK_MAX_AGE_MS });
        continue;
      }
      const tapped = await hasPracticeAttempts(uid);
      if (tapped === null) {
        skip('records-unavailable');
        continue;
      }
      if (tapped) {
        skip('comeback-has-activity');
        if (config.mode === 'send') await writeCheckMarker(uid, { [kind]: nowMs + COMEBACK_MAX_AGE_MS });
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
      if (isInternalAccount(uid, who.email, config.adminUids)) {
        skip('internal');
        continue;
      }

      if (config.mode !== 'send') {
        summary.wouldSend += 1;
        summary.byKind[kind] += 1;
        const key = `${uid}:${kind}`;
        if (!dryRunLogged.has(key)) {
          dryRunLogged.add(key);
          log(`[nudge-email] dry-run: would email kind=${kind} uid=${uid} to=${maskEmail(who.email)}`);
        }
        continue;
      }

      let claim;
      try {
        claim = await claimWithinCap(uid, kind, day, nowMs, who.email);
      } catch (e) {
        skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
        continue;
      }
      if (claim !== 'claimed') {
        skip(claim);
        if (claim === 'daily-cap') return true;
        continue;
      }

      const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
      const message = buildNudgeEmail(kind, { appUrl: config.appUrl, unsubscribeUrl, chapter: comebackChapterFor(uid) });
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
        if (result.ok) await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
        else if (result.retryable) await releaseClaim(uid, kind, day);
        else await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
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
    return false;
  }

  /**
   * CHECKOUT-NUDGE-1: one email to a signed-in student who opened a Board Pass / PDF pack checkout 1-36 h ago and has not
   * paid for that product since. At most once per student per product, ever (ledger key `abandoned_<product>` in
   * nudgeEmails/{uid}). Same rails as every other nudge: claim + durable daily cap + opt-out re-read in ONE transaction,
   * 24 h spacing, trial-email overlap, verified email only, admin/@lazytopper.com never. Runs FIRST in the run.
   * Logs one structured count line per run (no PII). Returns true when the daily cap is full.
   */
  async function runAbandonedCheckout({ summary, skip: skipAll, nowMs, day }) {
    if (!config.abandonedCheckoutEnabled) return false;
    const own = { mode: config.mode, candidates: 0, wouldSend: 0, sent: 0, failed: 0, skipped: {} };
    const skip = (reason) => {
      own.skipped[reason] = (own.skipped[reason] || 0) + 1;
      skipAll(reason);
    };
    let capFull = false;
    try {
      let orders = [];
      try {
        const qs = await adminFirestore
          .collection(PAY_ORDERS_COLLECTION)
          .where('createdAt', '>=', timestampFromMillis(nowMs - abandoned.ABANDONED_MAX_AGE_MS))
          .where('createdAt', '<', timestampFromMillis(nowMs - abandoned.ABANDONED_MIN_AGE_MS))
          .orderBy('createdAt', 'desc')
          .limit(abandoned.CAP_ABANDONED)
          .get();
        orders = qs.docs.map((d) => d.data() || {});
      } catch {
        skip('abandoned-orders-unavailable');
        return false;
      }
      const candidates = abandoned.pickCandidates(orders, nowMs, skip);
      // One decision per student per run: their newest product first; an older product is tried only when the newer
      // one is already emailed, paid or owned (those outcomes say nothing about the student, only about that product).
      const decided = new Set();
      for (const c of candidates) {
        const { uid, order, product } = c;
        if (decided.has(uid)) continue;
        decided.add(uid);
        const kind = abandoned.abandonedKind(product);
        own.candidates += 1;
        summary.candidates += 1;
        if (config.adminUids.has(uid)) {
          skip('internal');
          continue;
        }
        const ledgerSnap = await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).get();
        const ledger = ledgerSnap.exists ? ledgerSnap.data() || {} : {};
        if (ledger[kind]) {
          skip('already-sent');
          decided.delete(uid);
          continue;
        }
        if (ledger.skip && !isDueSkipMarker(ledger.skip, nowMs)) {
          skip(`marked-${ledger.skip.reason || 'skipped'}`);
          continue;
        }
        const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
        const trialRow = trialSnap.exists ? trialSnap.data() || {} : {};
        if (trialRow.optedOut) {
          skip('opted-out');
          continue;
        }
        if (typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < SPACING_MS) {
          skip('spaced');
          continue;
        }
        let sub = {};
        try {
          const ss = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
          sub = ss.exists ? ss.data() || {} : {};
        } catch {
          skip('subscription-unavailable');
          continue;
        }
        const trialRecent = trialEmailRecentMs(trialRow);
        if ((trialRecent !== null && nowMs - trialRecent < SPACING_MS) || decideCandidate(sub, nowMs).ok) {
          skip('trial-email-covers');
          continue;
        }
        // Paid since? Every order of this student (single-field uid query, the checkout_help pattern) and, for a pack,
        // what they own now. A failed read skips: never email blind.
        let late = null;
        try {
          const os = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where('uid', '==', uid).get();
          const uidOrders = os.docs.map((d) => d.data() || {});
          const packs = product.kind === 'pack' ? await listPacks(adminFirestore, uid) : [];
          const isPremium = deriveEffectiveTier(sub, nowMs).tier === 'premium';
          late = abandoned.paidSinceReason({ product, order, uidOrders, packs, isPremium });
        } catch {
          late = 'recheck-unavailable';
        }
        if (late) {
          skip(late);
          if (late !== 'recheck-unavailable') decided.delete(uid);
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
        if (isInternalAccount(uid, who.email, config.adminUids)) {
          skip('internal');
          continue;
        }

        if (config.mode !== 'send') {
          own.wouldSend += 1;
          summary.wouldSend += 1;
          summary.byKind[abandoned.METRIC] += 1;
          const key = `${uid}:${kind}`;
          if (!dryRunLogged.has(key)) {
            dryRunLogged.add(key);
            log(`[nudge-email] dry-run: would email kind=${abandoned.METRIC} product=${product.key} uid=${uid} to=${maskEmail(who.email)}`);
          }
          continue;
        }

        let claim;
        try {
          claim = await claimWithinCap(uid, kind, day, nowMs, who.email);
        } catch (e) {
          skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
          continue;
        }
        if (claim !== 'claimed') {
          skip(claim);
          if (claim === 'daily-cap') {
            capFull = true;
            break;
          }
          continue;
        }

        // The honest marks line: only from the student's real graded sessions; unreadable -> no line.
        const records = await readRecords(uid, nowMs - 30 * DAY_MS);
        const marksLine = records ? abandoned.marksLostLine(records, nowMs) : null;
        const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
        const message = abandoned.buildAbandonedCheckoutEmail({
          product,
          order,
          marksLine,
          appUrl: config.appUrl,
          unsubscribeUrl,
          parentPayLive: config.paymentsLive,
        });
        const result =
          fetchImpl && message
            ? await sendViaResend({
                fetchImpl,
                apiKey: config.apiKey,
                from: config.from,
                replyTo: config.replyTo || packNudge.DEFAULT_REPLY_TO,
                to: who.email,
                subject: message.subject,
                text: message.text,
                html: message.html,
                unsubscribeUrl,
                idempotencyKey: `nudge-${kind}-${uid}`,
                category: `nudge_${abandoned.METRIC}`,
              })
            : { ok: false, retryable: false, code: message ? 'no-fetch' : 'bad-product' };
        try {
          const ref = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
          if (result.ok) await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
          else if (result.retryable) await releaseClaim(uid, kind, day);
          else await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
        } catch {
          /* the claim stays: at most once */
        }
        if (result.ok) {
          own.sent += 1;
          summary.sent += 1;
          summary.byKind[abandoned.METRIC] += 1;
          bump(`nudge_email_sent_${abandoned.METRIC}`);
          log(`[nudge-email] nudge_email_sent kind=${abandoned.METRIC} uid=${uid}`);
        } else {
          own.failed += 1;
          summary.failed += 1;
          bump(`nudge_email_failed_${abandoned.METRIC}`);
          log(`[nudge-email] send failed kind=${abandoned.METRIC} uid=${uid} code=${result.code} retry=${result.retryable ? 'next-run' : 'never'}`);
        }
      }
    } finally {
      log(abandoned.runCountLine(own));
    }
    return capFull;
  }

  /**
   * PACK-NUDGE-1: email a student who BOUGHT a PDF pack and has not saved any file of it. Email 1 on day 2-4 after the
   * purchase, email 2 on day 5-7 (only after email 1 was sent, and only if still unopened). Same rails as every other
   * nudge: the claim + durable daily cap + opt-out re-read transaction, 24 h spacing (so a second email the same day is
   * deferred to the next hourly run, never duplicated), the shared unsubscribe, Resend. A guest (phone) purchase that
   * is not yet claimed has no uid and is never a candidate. Returns true when the daily cap is full.
   */
  async function runPackNudge({ summary, skip, nowMs, day }) {
    if (!config.packNudgeEnabled) return false;
    let orders = [];
    try {
      const qs = await adminFirestore
        .collection(PAY_ORDERS_COLLECTION)
        .where('paidAt', '>=', timestampFromMillis(nowMs - packNudge.PACK_NUDGE_MAX_AGE_MS - DAY_MS))
        .where('paidAt', '<', timestampFromMillis(nowMs - packNudge.PACK_NUDGE_MIN_AGE_MS + 1))
        .orderBy('paidAt', 'desc')
        .limit(CAP_PACK_NUDGE)
        .get();
      orders = qs.docs.map((d) => d.data() || {});
    } catch {
      skip('pack-orders-unavailable');
      return false;
    }
    const seenPacks = new Set();
    for (const o of orders) {
      if (o.status !== 'paid' || !isPackProduct(o.passType) || o.duplicate) continue;
      if (typeof o.uid !== 'string' || !o.uid) {
        skip('pack-guest-unclaimed');
        continue;
      }
      const uid = o.uid;
      const packId = packIdFor(o.passType, o.packTarget);
      if (!packId || seenPacks.has(`${uid}|${packId}`)) continue;
      seenPacks.add(`${uid}|${packId}`);
      summary.candidates += 1;

      // The entitlement is the truth for "bought, and when".
      let paidAtMs = null;
      try {
        const es = await adminFirestore.collection(PACK_ENTITLEMENTS_COLLECTION).doc(uid).collection(PACK_ENTITLEMENT_SEGMENTS.packs).doc(packId).get();
        const ent = es.exists ? es.data() || {} : null;
        paidAtMs = ent && typeof ent.paidAt === 'number' ? ent.paidAt : null;
      } catch {
        skip('pack-entitlement-unavailable');
        continue;
      }
      if (paidAtMs === null) {
        skip('pack-not-granted');
        continue;
      }
      const stage = packNudge.packNudgeStageFor(nowMs - paidAtMs);
      if (!stage) {
        skip('pack-no-window');
        continue;
      }
      const kind = packNudge.packNudgeKind(stage, packId);
      const kind1 = packNudge.packNudgeKind(1, packId);
      const kind2 = packNudge.packNudgeKind(2, packId);
      const metric = `pack_nudge_${stage}`;

      if (config.adminUids.has(uid)) {
        skip('internal');
        continue;
      }
      const ledgerSnap = await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).get();
      const ledger = ledgerSnap.exists ? ledgerSnap.data() || {} : {};
      if (ledger[kind]) {
        skip('already-sent');
        continue;
      }
      if (stage === 2 && !(ledger[kind1] && ledger[kind1].status === 'sent')) {
        skip('pack-email1-not-sent');
        continue;
      }
      if (ledger.skip && !isDueSkipMarker(ledger.skip, nowMs)) {
        skip(`marked-${ledger.skip.reason || 'skipped'}`);
        continue;
      }
      const check = ledger.check && typeof ledger.check === 'object' ? ledger.check : {};
      if (typeof check[kind] === 'number' && check[kind] > nowMs) {
        skip('not-yet');
        continue;
      }
      const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
      const trialRow = trialSnap.exists ? trialSnap.data() || {} : {};
      if (trialRow.optedOut) {
        skip('opted-out');
        continue;
      }
      // One email a day: deferred (retried next hour, inside the window), re-checked INSIDE the claim transaction.
      if (typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < SPACING_MS) {
        skip('spaced');
        continue;
      }
      let sub = {};
      try {
        const ss = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
        sub = ss.exists ? ss.data() || {} : {};
      } catch {
        skip('subscription-unavailable');
        continue;
      }
      const trialRecent = trialEmailRecentMs(trialRow);
      if ((trialRecent !== null && nowMs - trialRecent < SPACING_MS) || decideCandidate(sub, nowMs).ok) {
        skip('trial-email-covers');
        continue;
      }
      // Has the student saved any pack file since buying? Unreadable activity -> no email (never nag blind).
      const days = await readDays(uid);
      if (days === null) {
        skip('activity-unavailable');
        continue;
      }
      if (packNudge.packDownloadedSince(days, paidAtMs)) {
        skip('pack-already-opened');
        if (config.mode === 'send') await writeCheckMarker(uid, { [kind1]: paidAtMs + packNudge.PACK_NUDGE_MAX_AGE_MS, [kind2]: paidAtMs + packNudge.PACK_NUDGE_MAX_AGE_MS });
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
      if (isInternalAccount(uid, who.email, config.adminUids)) {
        skip('internal');
        continue;
      }

      if (config.mode !== 'send') {
        summary.wouldSend += 1;
        summary.byKind[metric] += 1;
        const key = `${uid}:${kind}`;
        if (!dryRunLogged.has(key)) {
          dryRunLogged.add(key);
          log(`[nudge-email] dry-run: would email kind=${metric} pack=${packId} uid=${uid} to=${maskEmail(who.email)}`);
        }
        continue;
      }

      let claim;
      try {
        claim = await claimWithinCap(uid, kind, day, nowMs, who.email);
      } catch (e) {
        skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
        continue;
      }
      if (claim !== 'claimed') {
        skip(claim);
        if (claim === 'daily-cap') return true;
        continue;
      }

      const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
      const message = packNudge.buildPackNudgeEmail(stage, { packId, displayName: user && user.displayName, appUrl: config.appUrl, unsubscribeUrl });
      const result =
        fetchImpl && message
          ? await sendViaResend({
              fetchImpl,
              apiKey: config.apiKey,
              from: config.from,
              replyTo: config.replyTo || packNudge.DEFAULT_REPLY_TO,
              to: who.email,
              subject: message.subject,
              text: message.text,
              html: message.html,
              unsubscribeUrl,
              idempotencyKey: `nudge-${kind}-${uid}`,
              category: `nudge_${metric}`,
            })
          : { ok: false, retryable: false, code: message ? 'no-fetch' : 'bad-pack' };
      try {
        const ref = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
        if (result.ok) await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
        else if (result.retryable) await releaseClaim(uid, kind, day);
        else await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
      } catch {
        /* the claim stays: at most once */
      }
      if (result.ok) {
        summary.sent += 1;
        summary.byKind[metric] += 1;
        bump(`nudge_email_sent_${metric}`);
        log(`[nudge-email] nudge_email_sent kind=${metric} uid=${uid}`);
      } else {
        summary.failed += 1;
        bump(`nudge_email_failed_${metric}`);
        log(`[nudge-email] send failed kind=${metric} uid=${uid} code=${result.code} retry=${result.retryable ? 'next-run' : 'never'}`);
      }
    }
    return false;
  }

  /**
   * SAMPLE-FOLLOWUP-1: one email to a SIGNED-IN student who saved a pack's free sample page 24-72 h ago and does not own that
   * pack (or a pack that includes it) nor hold a paid Board Pass. At most once per student per pack, ever (ledger key
   * `samplefu_<pack>` in nudgeEmails/{uid}). The marker (`sampleSeenAt_<pack>` = first-save ms) is written by
   * routes/packSampleSeen.cjs from a verified ID token, so a signed-out visitor is never a candidate. Same rails as every other
   * nudge: claim + durable daily cap + opt-out re-read in ONE transaction, 24 h spacing, trial-email overlap, verified email
   * only, admin / @lazytopper.com never. Logs one count line per run (no PII). Returns true when the daily cap is full.
   */
  async function runSampleFollowup({ summary, skip: skipAll, nowMs, day }) {
    if (!config.sampleFollowupEnabled) return false;
    const own = { mode: config.mode, candidates: 0, wouldSend: 0, sent: 0, failed: 0, skipped: {} };
    const skip = (reason) => {
      own.skipped[reason] = (own.skipped[reason] || 0) + 1;
      skipAll(reason);
    };
    try {
      // One single-field range query PER PACK on that pack's own first-save time, so a later sample of another pack can never
      // push an earlier pack out of its 24-72 h window. A student with two packs due is one candidate per pack, oldest first.
      const found = [];
      for (const key of sampleFu.SAMPLE_KEYS) {
        const field = sampleFu.seenField(key);
        try {
          const qs = await adminFirestore
            .collection(NUDGE_EMAILS_COLLECTION)
            .where(field, '>=', nowMs - sampleFu.SAMPLE_FOLLOWUP_MAX_AGE_MS)
            .where(field, '<', nowMs - sampleFu.SAMPLE_FOLLOWUP_MIN_AGE_MS + 1)
            .orderBy(field, 'desc')
            .limit(sampleFu.CAP_SAMPLE_FOLLOWUP)
            .get();
          for (const d of qs.docs) found.push({ uid: d.id, ledger: d.data() || {}, packKey: key, at: d.data()[field] });
        } catch {
          skip('sample-rows-unavailable');
        }
      }
      found.sort((x, y) => x.at - y.at);
      const handled = new Set();
      for (const { uid, ledger, packKey } of found) {
        const kind = sampleFu.sampleFollowupKind(packKey);
        if (ledger[kind]) {
          skip('already-sent');
          continue;
        }
        // One email a day per student: the oldest due pack that passes every check is served; another due pack waits for a later run.
        if (handled.has(uid)) {
          skip('spaced');
          continue;
        }
        own.candidates += 1;
        summary.candidates += 1;
        if (config.adminUids.has(uid)) {
          skip('internal');
          continue;
        }
        if (ledger.skip && !isDueSkipMarker(ledger.skip, nowMs)) {
          skip(`marked-${ledger.skip.reason || 'skipped'}`);
          continue;
        }
        const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
        const trialRow = trialSnap.exists ? trialSnap.data() || {} : {};
        if (trialRow.optedOut) {
          skip('opted-out');
          continue;
        }
        if (typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < SPACING_MS) {
          skip('spaced');
          continue;
        }
        let sub = {};
        try {
          const ss = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
          sub = ss.exists ? ss.data() || {} : {};
        } catch {
          skip('subscription-unavailable');
          continue;
        }
        const trialRecent = trialEmailRecentMs(trialRow);
        if ((trialRecent !== null && nowMs - trialRecent < SPACING_MS) || decideCandidate(sub, nowMs).ok) {
          skip('trial-email-covers');
          continue;
        }
        // Bought since? A paid Board Pass (tier 'premium'; a free trial is 'trial' and still gets the email) or what they own now.
        // A failed read skips: never email blind.
        let owned = false;
        try {
          if (deriveEffectiveTier(sub, nowMs).tier === 'premium') owned = true;
          else owned = sampleFu.sampleOwned(await listPacks(adminFirestore, uid), packKey);
        } catch {
          skip('recheck-unavailable');
          continue;
        }
        if (owned) {
          skip('already-owned');
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
        if (isInternalAccount(uid, who.email, config.adminUids)) {
          skip('internal');
          continue;
        }

        if (config.mode !== 'send') {
          handled.add(uid);
          own.wouldSend += 1;
          summary.wouldSend += 1;
          summary.byKind[sampleFu.METRIC] += 1;
          const key = `${uid}:${kind}`;
          if (!dryRunLogged.has(key)) {
            dryRunLogged.add(key);
            log(`[nudge-email] dry-run: would email kind=${sampleFu.METRIC} pack=${packKey} uid=${uid} to=${maskEmail(who.email)}`);
          }
          continue;
        }

        let claim;
        try {
          claim = await claimWithinCap(uid, kind, day, nowMs, who.email);
        } catch (e) {
          skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
          continue;
        }
        if (claim !== 'claimed') {
          skip(claim);
          if (claim === 'daily-cap') return true;
          continue;
        }

        handled.add(uid);
        const unsubscribeUrl = unsubscribeUrlFor(config.appUrl, uid, config.unsubscribeSecret);
        const message = sampleFu.buildSampleFollowupEmail({ packKey, displayName: user && user.displayName, appUrl: config.appUrl, unsubscribeUrl });
        const result =
          fetchImpl && message
            ? await sendViaResend({
                fetchImpl,
                apiKey: config.apiKey,
                from: config.from,
                replyTo: config.replyTo || packNudge.DEFAULT_REPLY_TO,
                to: who.email,
                subject: message.subject,
                text: message.text,
                html: message.html,
                unsubscribeUrl,
                idempotencyKey: `nudge-${kind}-${uid}`,
                category: 'nudge_sample_followup',
              })
            : { ok: false, retryable: false, code: message ? 'no-fetch' : 'bad-pack' };
        try {
          const ref = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
          if (result.ok) await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
          else if (result.retryable) await releaseClaim(uid, kind, day);
          else await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
        } catch {
          /* the claim stays: at most once */
        }
        if (result.ok) {
          own.sent += 1;
          summary.sent += 1;
          summary.byKind[sampleFu.METRIC] += 1;
          bump(`nudge_email_sent_${sampleFu.METRIC}`);
          log(`[nudge-email] nudge_email_sent kind=${sampleFu.METRIC} uid=${uid}`);
        } else {
          own.failed += 1;
          summary.failed += 1;
          bump(`nudge_email_failed_${sampleFu.METRIC}`);
          log(`[nudge-email] send failed kind=${sampleFu.METRIC} uid=${uid} code=${result.code} retry=${result.retryable ? 'next-run' : 'never'}`);
        }
      }
    } finally {
      log(sampleFu.runCountLine(own));
    }
    return false;
  }

  /**
   * GUEST-ABANDON-1: ONE email for a signed-out (guest) checkout opened 1-36 h ago and not paid, ONLY when the order
   * carries an email address. Behind GUEST_ABANDON_EMAIL_ENABLED="1" (default off). Same rails as CHECKOUT-NUDGE-1:
   * claim + durable daily cap + opt-out re-read in ONE transaction, 24 h one-a-day spacing per recipient, at most once
   * per recipient per product ever. The recipient is keyed by guestEmail.emailKey (no uid, no raw address stored). If the
   * address is also an account's sign-in email, that account's opt-out, nudge ledger, spacing and purchases count too.
   * Logs counts only (never the address). Returns true when the daily cap is full.
   */
  async function claimGuestWithinCap({ key, uid, kind, dayKey, nowMs, info = {} }) {
    const guestRef = adminFirestore.collection(guestEmail.GUEST_NUDGE_EMAILS_COLLECTION).doc(key);
    const suppRef = adminFirestore.collection(guestEmail.EMAIL_SUPPRESSION_COLLECTION).doc(key);
    const dailyRef = adminFirestore.collection(NUDGE_EMAIL_DAILY_COLLECTION).doc(dayKey);
    const ledgerRef = uid ? adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid) : null;
    const trialRef = uid ? adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid) : null;
    return adminFirestore.runTransaction(async (tx) => {
      const g = await tx.get(guestRef);
      const s = await tx.get(suppRef);
      const d = await tx.get(dailyRef);
      const l = ledgerRef ? await tx.get(ledgerRef) : null;
      const t = trialRef ? await tx.get(trialRef) : null;
      if (s.exists && (s.data() || {}).optedOut) return 'opted-out';
      if (t && t.exists && (t.data() || {}).optedOut) return 'opted-out';
      const row = g.exists ? g.data() || {} : {};
      const acct = l && l.exists ? l.data() || {} : {};
      if (row[kind] || acct[kind]) return 'claimed-elsewhere';
      for (const last of [row.lastClaimMs, acct.lastClaimMs]) if (typeof last === 'number' && nowMs - last < SPACING_MS) return 'spaced';
      const trialRecent = trialEmailRecentMs(t && t.exists ? t.data() || {} : null);
      if (trialRecent !== null && nowMs - trialRecent < SPACING_MS) return 'spaced';
      const raw = d.exists ? (d.data() || {}).count : 0;
      const count = typeof raw === 'number' && raw > 0 ? raw : 0;
      if (count >= config.dailyCap) return 'daily-cap';
      // Review D5: the FIRST attempt time survives a released claim, so a retry can tell whether the provider's
      // 24 h Idempotency-Key window still covers a send that may have gone out.
      const firstKey = `${GUEST_FIRST_ATTEMPT_PREFIX}${kind}`;
      const first = typeof row[firstKey] === 'number' ? row[firstKey] : nowMs;
      info.firstAttemptMs = first;
      tx.set(guestRef, { [kind]: { status: 'claimed', claimedAt: serverTimestamp(), claimedMs: nowMs, capDay: dayKey }, lastClaimMs: nowMs, [firstKey]: first }, { merge: true });
      // The account's one-a-day spacing sees this email too (not released on a retryable failure: one day later at worst).
      if (ledgerRef) tx.set(ledgerRef, { lastClaimMs: nowMs }, { merge: true });
      tx.set(dailyRef, { count: count + 1, dayKey, updatedAt: serverTimestamp() }, { merge: true });
      return 'claimed';
    });
  }

  /** Release a guest claim whose send certainly did not go out, and give the day's slot back. */
  async function releaseGuestClaim(key, kind, dayKey) {
    const guestRef = adminFirestore.collection(guestEmail.GUEST_NUDGE_EMAILS_COLLECTION).doc(key);
    const dailyRef = adminFirestore.collection(NUDGE_EMAIL_DAILY_COLLECTION).doc(dayKey);
    return adminFirestore.runTransaction(async (tx) => {
      const g = await tx.get(guestRef);
      const d = await tx.get(dailyRef);
      if (!g.exists) return false;
      const row = { ...(g.data() || {}) };
      if (!row[kind] || row[kind].status !== 'claimed') return false;
      delete row[kind];
      let last = null;
      for (const k of Object.keys(row)) {
        const c = row[k] && typeof row[k] === 'object' && typeof row[k].claimedMs === 'number' ? row[k].claimedMs : null;
        if (c !== null && (last === null || c > last)) last = c;
      }
      if (last === null) delete row.lastClaimMs;
      else row.lastClaimMs = last;
      tx.set(guestRef, row);
      const raw = d.exists ? (d.data() || {}).count : 0;
      if (typeof raw === 'number' && raw > 0) tx.set(dailyRef, { count: raw - 1, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    });
  }

  /** The item's CURRENT price for someone with no account (the guest checkout's own quote rule). null if unknown. */
  function currentPriceInr(product, nowMs) {
    try {
      if (product.kind === 'pack') return PACK_PRODUCTS[product.sku] ? PACK_PRODUCTS[product.sku].priceInr : null;
      const p = computeGrant({}, { passType: 'till_boards', paymentRef: 'quote', nowMs }).fields.pricePaidInr;
      return Number.isFinite(p) && p > 0 ? p : null;
    } catch {
      return null;
    }
  }

  const GUEST_FIRST_ATTEMPT_PREFIX = 'firstAttemptMs_';
  const GUEST_RETRY_WINDOW_MS = 22 * HOUR_MS;

  async function runGuestAbandonedCheckout({ summary, skip: skipAll, nowMs, day }) {
    if (!config.guestAbandonEnabled) return false;
    const own = { mode: config.mode, candidates: 0, wouldSend: 0, sent: 0, failed: 0, skipped: {} };
    const skip = (reason) => {
      own.skipped[reason] = (own.skipped[reason] || 0) + 1;
      skipAll(reason);
    };
    let capFull = false;
    try {
      let orders = [];
      try {
        const qs = await adminFirestore
          .collection(PAY_ORDERS_COLLECTION)
          .where('createdAt', '>=', timestampFromMillis(nowMs - abandoned.ABANDONED_MAX_AGE_MS))
          .where('createdAt', '<', timestampFromMillis(nowMs - abandoned.ABANDONED_MIN_AGE_MS))
          .orderBy('createdAt', 'desc')
          .limit(abandoned.CAP_ABANDONED)
          .get();
        orders = qs.docs.map((d) => d.data() || {});
      } catch {
        skip('guest-orders-unavailable');
        return false;
      }
      const candidates = guestEmail.pickGuestCandidates(orders, nowMs, skip);
      const decided = new Set(); // one decision per recipient per run
      for (const c of candidates) {
        const { key, email, order, product } = c;
        if (decided.has(key)) continue;
        decided.add(key);
        const kind = abandoned.abandonedKind(product);
        own.candidates += 1;
        summary.candidates += 1;
        if (isInternalAccount(null, email, config.adminUids) || (typeof order.payerUid === 'string' && config.adminUids.has(order.payerUid))) {
          skip('internal');
          continue;
        }
        let row = {};
        let suppressed = false;
        try {
          const g = await adminFirestore.collection(guestEmail.GUEST_NUDGE_EMAILS_COLLECTION).doc(key).get();
          row = g.exists ? g.data() || {} : {};
          const s = await adminFirestore.collection(guestEmail.EMAIL_SUPPRESSION_COLLECTION).doc(key).get();
          suppressed = s.exists && !!(s.data() || {}).optedOut;
        } catch {
          skip('guest-ledger-unavailable');
          continue;
        }
        if (suppressed) {
          skip('opted-out');
          continue;
        }
        if (row[kind]) {
          skip('already-sent');
          decided.delete(key);
          continue;
        }
        if (typeof row.lastClaimMs === 'number' && nowMs - row.lastClaimMs < SPACING_MS) {
          skip('spaced');
          continue;
        }
        // Is this address also an account? Then that account's opt-out, ledger and purchases count too.
        let uid = null;
        try {
          const user = await firebaseAdmin.auth().getUserByEmail(email);
          uid = user && typeof user.uid === 'string' ? user.uid : null;
        } catch (e) {
          if (!(e && e.code === 'auth/user-not-found')) {
            skip('account-lookup-unavailable');
            continue;
          }
        }
        if (uid && config.adminUids.has(uid)) {
          skip('internal');
          continue;
        }
        let late = null;
        try {
          const related = [];
          for (const [field, value] of [['guestEmail', email], ['guestPhone', order.guestPhone]]) {
            if (typeof value !== 'string' || !value) continue;
            const rs = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where(field, '==', value).get();
            related.push(...rs.docs.map((d) => d.data() || {}));
          }
          let accountOrders = [];
          let accountPremium = false;
          let accountOwnsPack = false;
          if (uid) {
            const trialSnap = await adminFirestore.collection(TRIAL_EMAILS_COLLECTION).doc(uid).get();
            if (trialSnap.exists && (trialSnap.data() || {}).optedOut) late = 'opted-out';
            const ledgerSnap = await adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid).get();
            const ledger = ledgerSnap.exists ? ledgerSnap.data() || {} : {};
            if (!late && ledger[kind]) late = 'already-sent';
            if (!late && typeof ledger.lastClaimMs === 'number' && nowMs - ledger.lastClaimMs < SPACING_MS) late = 'spaced';
            if (!late) {
              const os = await adminFirestore.collection(PAY_ORDERS_COLLECTION).where('uid', '==', uid).get();
              accountOrders = os.docs.map((d) => d.data() || {});
              const ss = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
              accountPremium = deriveEffectiveTier(ss.exists ? ss.data() || {} : {}, nowMs).tier === 'premium';
              if (product.kind === 'pack') accountOwnsPack = isAlreadyOwned(await listPacks(adminFirestore, uid), product.sku, product.target);
            }
          }
          if (!late) late = guestEmail.guestPaidSinceReason({ product, order, related, accountOrders, accountPremium, accountOwnsPack });
        } catch {
          late = 'recheck-unavailable';
        }
        if (late) {
          skip(late);
          if (late === 'paid-since' || late === 'premium-now' || late === 'already-owned' || late === 'already-sent') decided.delete(key);
          continue;
        }

        if (config.mode !== 'send') {
          own.wouldSend += 1;
          summary.wouldSend += 1;
          summary.byKind[guestEmail.METRIC] += 1;
          const dk = `${key}:${kind}`;
          if (!dryRunLogged.has(dk)) {
            dryRunLogged.add(dk);
            log(`[nudge-email] dry-run: would email kind=${guestEmail.METRIC} product=${product.key} to=${maskEmail(email)}`);
          }
          continue;
        }

        let claim;
        const claimInfo = {};
        try {
          claim = await claimGuestWithinCap({ key, uid, kind, dayKey: day, nowMs, info: claimInfo });
        } catch (e) {
          skip(isAlreadyExists(e) ? 'claimed-elsewhere' : 'claim-error');
          continue;
        }
        if (claim !== 'claimed') {
          skip(claim);
          if (claim === 'daily-cap') {
            capFull = true;
            break;
          }
          continue;
        }

        const unsubscribeUrl = guestEmail.guestUnsubscribeUrlFor(config.appUrl, key, config.unsubscribeSecret);
        const message = guestEmail.buildGuestAbandonEmail({ product, currentPriceInr: currentPriceInr(product, nowMs), appUrl: config.appUrl, unsubscribeUrl });
        let result =
          fetchImpl && message
            ? await sendViaResend({
                fetchImpl,
                apiKey: config.apiKey,
                from: config.from,
                replyTo: config.replyTo || packNudge.DEFAULT_REPLY_TO,
                to: email,
                subject: message.subject,
                text: message.text,
                html: message.html,
                unsubscribeUrl,
                idempotencyKey: `nudge-guest-${kind}-${key.slice(0, 40)}`,
                category: `nudge_${guestEmail.METRIC}`,
              })
            : { ok: false, retryable: false, code: message ? 'no-fetch' : 'bad-product' };
        // Review D5: a retry more than 22 h after the FIRST attempt is outside the safe part of Resend's 24 h idempotency
        // window - a timed-out send that did go out could be delivered twice - so it is NOT retried.
        if (!result.ok && result.retryable && typeof claimInfo.firstAttemptMs === 'number' && nowMs - claimInfo.firstAttemptMs > GUEST_RETRY_WINDOW_MS) {
          result = { ...result, retryable: false, code: `${result.code || 'error'}-past-idempotency-window` };
        }
        try {
          const ref = adminFirestore.collection(guestEmail.GUEST_NUDGE_EMAILS_COLLECTION).doc(key);
          if (result.ok) await ref.set({ [kind]: { status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null } }, { merge: true });
          else if (result.retryable) await releaseGuestClaim(key, kind, day);
          else await ref.set({ [kind]: { status: 'failed', failedAt: serverTimestamp(), error: result.code } }, { merge: true });
        } catch {
          /* the claim stays: at most once */
        }
        if (result.ok) {
          own.sent += 1;
          summary.sent += 1;
          summary.byKind[guestEmail.METRIC] += 1;
          bump(`nudge_email_sent_${guestEmail.METRIC}`);
          log(`[nudge-email] nudge_email_sent kind=${guestEmail.METRIC} product=${product.key}`);
        } else {
          own.failed += 1;
          summary.failed += 1;
          bump(`nudge_email_failed_${guestEmail.METRIC}`);
          log(`[nudge-email] send failed kind=${guestEmail.METRIC} code=${result.code} retry=${result.retryable ? 'next-run' : 'never'}`);
        }
      }
    } finally {
      log(guestEmail.runCountLine(own));
    }
    return capFull;
  }

  /**
   * GUEST-ABANDON-1: the guest email's stop link. GET shows one confirm button (a link scanner's prefetch never
   * unsubscribes anyone); POST (also a mail client's RFC 8058 one-click) records `emailSuppression/{key}` - the hash
   * key only, never the address. Honoured by every later guest email to that address.
   */
  function sendGuestHtml(res, status, title, bodyHtml) {
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

  async function handleGuestUnsubscribe(req, res, rawUrl) {
    try {
      let token = '';
      try {
        token = new URL(String(rawUrl || req.url || ''), 'http://local').searchParams.get('t') || '';
      } catch {
        token = '';
      }
      const key = guestEmail.verifyGuestUnsubscribe(token, config.unsubscribeSecret);
      if (!key) return sendGuestHtml(res, 400, 'Link not valid', '<h1 style="font-size:20px">This unsubscribe link is not valid.</h1><p>If you copied it, check it is complete.</p>');
      if (req.method === 'GET') {
        const action = `${guestEmail.GUEST_EMAIL_UNSUBSCRIBE_PATH}?t=${encodeURIComponent(token)}`;
        return sendGuestHtml(
          res,
          200,
          'Unsubscribe',
          '<h1 style="font-size:20px">Stop LazyTopper emails to this address?</h1>' +
            `<form method="post" action="${escapeHtml(action)}"><button type="submit" style="min-height:44px;padding:0 18px;border:0;border-radius:10px;background:#1f9d63;color:#fff;font-size:15px;font-weight:700">Unsubscribe</button></form>`,
        );
      }
      if (req.method !== 'POST') return sendGuestHtml(res, 405, 'Not allowed', '<p>Not allowed.</p>');
      if (typeof req.resume === 'function') req.resume();
      if (!adminFirestore) return sendGuestHtml(res, 503, 'Try again later', '<p>We could not record that right now. Please try the link again later.</p>');
      await adminFirestore
        .collection(guestEmail.EMAIL_SUPPRESSION_COLLECTION)
        .doc(key)
        .set({ optedOut: true, optedOutAt: serverTimestamp(), source: 'guest-email' }, { merge: true });
      return sendGuestHtml(res, 200, 'Unsubscribed', "<h1 style=\"font-size:20px\">You're unsubscribed.</h1><p>We won't send LazyTopper reminder or follow-up emails to this address. Sign-in codes and payment receipts still arrive.</p>");
    } catch {
      return sendGuestHtml(res, 500, 'Try again later', '<p>We could not record that right now. Please try the link again later.</p>');
    }
  }

  /** One pass. Never throws; returns a summary (also logged). */
  async function runOnce() {
    const summary = { mode: config.mode, candidates: 0, wouldSend: 0, sent: 0, failed: 0, skipped: {}, byKind: { d1: 0, d3: 0, founding: 0, checkout_help: 0, founder_checkin: 0, comeback: 0, pack_nudge_1: 0, pack_nudge_2: 0, abandoned_checkout: 0, sample_followup: 0, guest_abandoned_checkout: 0 } };
    const skip = (reason) => {
      summary.skipped[reason] = (summary.skipped[reason] || 0) + 1;
    };
    if (config.mode === 'off') return { ...summary, ran: false, reason: 'off' };
    if (running) return { ...summary, ran: false, reason: 'already-running' };
    if (!adminFirestore || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function') {
      log('[nudge-email] skipped - firebase-admin not initialised on this deploy.');
      return { ...summary, ran: false, reason: 'no-admin' };
    }
    // EMAIL-SEND-WINDOW-1: outside the window a real (send-mode) run returns BEFORE any read or write - no cap
    // claim, no ledger row, no skip marker - and the hourly cadence picks it up at the next in-window tick.
    // A dry run still reports what it would send (it already writes nothing) and says it is outside the window.
    {
      const t = now();
      if (!sendWindow.contains(t)) {
        if (config.mode === 'send') {
          log(`[nudge-email] outside send window (${sendWindow.label}) - nothing sent, nothing written; next in-window run will send.`);
          return { ...summary, ran: false, reason: 'outside-send-window' };
        }
        log(`[nudge-email] outside send window (${sendWindow.label}) - dry run reports only what it WOULD send once inside the window.`);
        summary.outsideWindow = true;
      }
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
      // CHECKOUT-NUDGE-1: the abandoned-checkout email runs FIRST of all, ahead of checkout_help and the pack nudges:
      // its 1-36 h window is the shortest (a student skipped today is out of the window tomorrow), it is the one
      // email tied to a purchase the student just tried to make, and it is at most once per product, so it cannot
      // flood the cap. The pack nudges' 3-day windows survive a full day. A failure here must not abort the rest.
      let capFull = false;
      try {
        capFull = await runAbandonedCheckout({ summary, skip, nowMs, day });
      } catch (e) {
        skip('abandoned-phase-error');
        log(`[nudge-email] abandoned-checkout phase failed: ${e && e.message ? e.message : 'error'}`);
      }
      // GUEST-ABANDON-1: the signed-out checkout email, right after the signed-in one (same 1-36 h window). A failure here
      // must not abort the rest.
      try {
        if (!capFull) capFull = await runGuestAbandonedCheckout({ summary, skip, nowMs, day });
      } catch (e) {
        skip('guest-abandoned-phase-error');
        log(`[nudge-email] guest abandoned-checkout phase failed: ${e && e.message ? e.message : 'error'}`);
      }
      // EMAIL-CONCIERGE-1: checkout_help runs next so the shared daily cap serves it before d1/d3/founding;
      // founder_checkin runs after them.
      const conciergeState = { seen: new Set(), dead: new Set() };
      if (!capFull) await runConcierge({ summary, skip, nowMs, day, phase: 'checkout_help', state: conciergeState });
      // PACK-NUDGE-PRIORITY-1: a buyer who has not opened their pack is also served BEFORE d1/d3/founding, so a
      // morning of "Where you left off" mail cannot fill the shared daily cap and starve people who paid.
      // A failure inside the pack phase must not abort d1/d3 (review note): log it and carry on.
      try {
        if (!capFull) capFull = await runPackNudge({ summary, skip, nowMs, day });
      } catch (e) {
        skip('pack-phase-error');
        log(`[nudge-email] pack phase failed: ${e && e.message ? e.message : 'error'}`);
      }
      // SAMPLE-FOLLOWUP-1: a signed-in student's free-sample follow-up is served after the pack nudges and before d1/d3 (a 3-day
      // window; one email, at most once per pack). A failure here must not abort d1/d3.
      try {
        if (!capFull) capFull = await runSampleFollowup({ summary, skip, nowMs, day });
      } catch (e) {
        skip('sample-phase-error');
        log(`[nudge-email] sample-followup phase failed: ${e && e.message ? e.message : 'error'}`);
      }
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
          claim = await claimWithinCap(uid, kind, day, nowMs, who.email);
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
      if (!capFull) capFull = await runConcierge({ summary, skip, nowMs, day, phase: 'founder_checkin', state: conciergeState });
      if (!capFull) await runComeback({ summary, skip, nowMs, day });
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

  return { config, runOnce, schedule, handleGuestUnsubscribe };
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
  CONCIERGE_KINDS,
  COMEBACK_KIND,
  comebackChapterFor,
  comebackPracticeUrl,
  isCheckinDue,
  isInternalAccount,
  pricingOpenCount,
};
