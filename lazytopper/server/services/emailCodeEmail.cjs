'use strict';
/**
 * emailCodeEmail.cjs — EMAIL-CODE-1: the "Your LazyTopper sign-in code" email, on the trial email's Resend rail
 * (trialEndingEmail.sendViaResend); there is no second mailer.
 *
 * ★ Transactional: no link, no unsubscribe, no tracking. The code is in the subject and the body (that is the point of
 *   the email) and NOWHERE else: not in the Idempotency-Key (a random id), not in a tag, not in a log or a counter.
 * ★ Sends only when RESEND_API_KEY is set and the sender is on the verified domain (mail.lazytopper.com); otherwise
 *   `ready` is false and the routes answer 503 for every address alike.
 */

const crypto = require('node:crypto');
const { sendViaResend } = require('./trialEndingEmail.cjs');
const { senderOnVerifiedDomain } = require('./nudgeEmail.cjs');

const DEFAULT_FROM = 'LazyTopper <hello@mail.lazytopper.com>';
const DEFAULT_REPLY_TO = 'support@lazytopper.com';

function resolveEmailCodeMailConfig(env = process.env) {
  const e = env || {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const apiKey = str(e.RESEND_API_KEY);
  const from = str(e.EMAIL_CODE_FROM) || str(e.PAYMENT_EMAIL_FROM) || DEFAULT_FROM;
  const replyTo = str(e.PAYMENT_EMAIL_REPLY_TO) || DEFAULT_REPLY_TO;
  return { ready: !!apiKey && senderOnVerifiedDomain(from), apiKey, from, replyTo };
}

/** PURE. The email for one code. */
function buildSignInCodeEmail(code) {
  const c = String(code);
  const subject = `Your LazyTopper sign-in code: ${c}`;
  const text = [
    `Your LazyTopper sign-in code: ${c}`,
    'It is valid for 10 minutes. Type it on the screen where you asked for it.',
    "If you didn't ask for it, ignore this email. Nobody can sign in without this code, and we will never ask you for it.",
    'LazyTopper',
  ].join('\n\n');
  const html = `<p>Your LazyTopper sign-in code:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace">${c}</p>
<p>It is valid for 10 minutes. Type it on the screen where you asked for it.</p>
<p>If you didn't ask for it, ignore this email. Nobody can sign in without this code, and we will never ask you for it.</p>
<p>LazyTopper</p>`;
  return { subject, text, html };
}

function createEmailCodeMailer({ env = process.env, fetchImpl = typeof fetch === 'function' ? fetch : null } = {}) {
  const config = resolveEmailCodeMailConfig(env);
  return {
    ready: () => config.ready && typeof fetchImpl === 'function',
    /** { ok } — never throws. */
    async send({ to, code }) {
      if (!config.ready || typeof fetchImpl !== 'function') return { ok: false, code: 'not_configured' };
      const built = buildSignInCodeEmail(code);
      return sendViaResend({
        fetchImpl,
        apiKey: config.apiKey,
        from: config.from,
        replyTo: config.replyTo,
        to,
        subject: built.subject,
        text: built.text,
        html: built.html,
        idempotencyKey: `signin-code-${crypto.randomUUID()}`,
        category: 'signin_code',
      });
    },
  };
}

module.exports = { resolveEmailCodeMailConfig, buildSignInCodeEmail, createEmailCodeMailer };
