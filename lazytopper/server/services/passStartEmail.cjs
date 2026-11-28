'use strict';
/**
 * passStartEmail.cjs - PASS-START-1 (owner "go ahead", 28 Nov 2026). ONE "start here" email to a student whose Board Pass was
 * granted 24-72 h ago and who has done NOTHING yet (no graded record, no practice attempt). PURE helpers and the template; no I/O,
 * no clock. The pass that uses them is runPassStart in services/nudgeEmail.cjs, on the SAME rails as every other nudge (claim +
 * durable daily cap + opt-out re-read in one transaction, the IST send window, 24 h spacing, the shared signed unsubscribe, Resend).
 * No second scheduler and no new collection: the ledger key is `nudgeEmails/{uid}.passstart`, at most once per student, ever.
 *
 * ★ DARK BY DEFAULT. Nothing runs unless PASS_START_EMAIL_ENABLED is exactly "1" (on top of the nudge job's own
 *   NUDGE_EMAIL_ENABLED / NUDGE_EMAIL_DRY_RUN=0 / Resend / sender / unsubscribe-secret requirements). Kill switch = unset it.
 * ★ WHO. The account that HOLDS the pass (the grant is on its uid), whoever paid. Only the student is emailed: the payer's address is
 *   never stored on the order and is not used here. Verified-email sign-ins only; never admin / @lazytopper.com / opted out.
 * ★ COPY. No price, no progress, no invented numbers. One link, to Home, where the Start-here card is.
 * ★ PRIVACY. The URL carries a path and UTM tags only: no uid, no email, no phone.
 */

const { escapeHtml } = require('./trialEndingEmail.cjs');
const { greetingFor } = require('./packNudge.cjs');

const HOUR_MS = 60 * 60 * 1000;
/** Due 24 h after the grant; still eligible until 72 h (a full daily cap or the send window can defer it). */
const PASS_START_MIN_AGE_MS = 24 * HOUR_MS;
const PASS_START_MAX_AGE_MS = 72 * HOUR_MS;
const CAP_PASS_START = 500;
const KIND = 'passstart';
const METRIC = 'pass_start';

/** The switch: exactly "1" turns it on; anything else (unset included) is off. PURE. */
function passStartEmailEnabled(env = process.env) {
  return String((env && env.PASS_START_EMAIL_ENABLED) || '').trim() === '1';
}

/** Is a grant `ageMs` ago inside the send window? PURE. */
function passStartDue(ageMs) {
  return Number.isFinite(ageMs) && ageMs >= PASS_START_MIN_AGE_MS && ageMs < PASS_START_MAX_AGE_MS;
}

function homeUrl(appUrl) {
  return `${appUrl}/?utm_source=email&utm_medium=email&utm_campaign=nudge_passstart`;
}

/** @returns {{subject:string, text:string, html:string}} PURE. */
function buildPassStartEmail({ displayName, appUrl, unsubscribeUrl }) {
  const greeting = greetingFor(displayName);
  const url = homeUrl(appUrl);
  const subject = 'Your Board Pass is active: a 5-minute first step';
  const lead = `${greeting} your LazyTopper Board Pass is active, and you have not started yet.`;
  const body = 'The easiest first step is one 5-minute Quick Practice. Open Home and tap the card at the top.';
  const button = 'Open Home';
  const signoff = 'Team LazyTopper';
  const footer = "You're getting this because you made a LazyTopper account with this address. You can stop these emails any time.";
  const text = [lead, '', body, '', `${button}: ${url}`, '', signoff, '', footer, `Unsubscribe: ${unsubscribeUrl}`, '', 'LazyTopper'].join('\n');
  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    `<p style="${pStyle}">${escapeHtml(lead)}</p>`,
    `<p style="${pStyle}">${escapeHtml(body)}</p>`,
    `<p style="margin:0 0 18px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#13804f;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(button)}</a></p>`,
    `<p style="${pStyle}">${escapeHtml(signoff)}</p>`,
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">${escapeHtml(footer)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b7c">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html };
}

/** One structured line per run: counts only, no PII. */
function runCountLine(own) {
  return `[pass-start] run mode=${own.mode} candidates=${own.candidates} wouldSend=${own.wouldSend} sent=${own.sent} failed=${own.failed} skipped=${JSON.stringify(own.skipped)}`;
}

module.exports = {
  PASS_START_MIN_AGE_MS,
  PASS_START_MAX_AGE_MS,
  CAP_PASS_START,
  KIND,
  METRIC,
  passStartEmailEnabled,
  passStartDue,
  homeUrl,
  buildPassStartEmail,
  runCountLine,
};
