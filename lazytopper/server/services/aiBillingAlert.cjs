'use strict';
/**
 * AI-BILLING-ALERT-1 - tell the owner within minutes when Gemini stops answering because of the KEY or BILLING.
 *
 * Why: on 22 Nov 2026 (~05:10-08:24 IST) every AI feature failed with Gemini `402 Payment Required - prepayment credits are
 * depleted` and nobody knew for ~3 hours. This module makes that visible. It changes NOTHING a student sees: the Gemini
 * gateway (geminiClient.cjs) calls `note` / `noteOk` fire-and-forget, and nothing here can throw into, slow or change a call.
 *
 * What counts as a key / billing failure (`classifyGeminiFailure`, conservative on purpose):
 *   - HTTP 401, 402, 403: always (unauthenticated, prepaid credits depleted, permission denied). These never heal by retrying.
 *   - HTTP 400 ONLY when the body names a bad key (API_KEY_INVALID / "API key not valid" / "API key expired") - Google answers
 *     an invalid key with 400, not 401 (the eval harness learned this on 2026-10-05).
 *   - HTTP 429 ONLY when the body says the money or the day's quota is gone: "prepayment credits" / "credits are depleted"
 *     (Google returned this as 429 before moving it to 402), a spend cap, a disabled billing account, or a quota id that is
 *     per DAY. An ordinary per-minute rate limit ("You exceeded your current quota ... PerMinute...", or a bare 429) is NOT
 *     a billing failure: it heals on its own and the gateway already backs off.
 *   - Anything else (5xx, timeouts, other 4xx): not this module's business.
 *
 * Email: at most ONE per 30 minutes while failures continue (in memory; a restart may send one extra - accepted), then ONE
 * "recovered" email at the first success after an alert. Recipient: AI_ALERT_TO, else OPS_REPORT_TO - nothing hard-coded.
 * Sending reuses the receipt-email Resend rails index.cjs already hands the unclaimed-order alert (`send` / `canSend`).
 * Kill switch: AI_BILLING_ALERT_DISABLED=1 -> log only. No recipient or no email rails -> log only, and the boot line says so.
 *
 * WhatsApp (owner, 22 Nov 09:09): the same alert ALSO goes to the owner's WhatsApp, on the same cadence (one "failing" per
 * 30 minutes + one "recovered"), sent alongside the email. Backend today: CallMeBot's personal WhatsApp API (one GET, 10 s
 * timeout) with OWNER_ALERT_WHATSAPP (digits, e.g. 91 + mobile) and CALLMEBOT_APIKEY; either missing -> WhatsApp off, and
 * the boot line says so (number masked to its last 4 digits). Own kill switch AI_ALERT_WHATSAPP_DISABLED=1. Each channel
 * keeps its own send state, so a failing or hanging send on one never blocks the other. `createCallMeBotSender` /
 * `deps.sendWhatsApp(text) -> { ok }` is the seam a Meta Cloud API backend replaces later. No number is hard-coded.
 * Nothing secret is logged or mailed: no key, no student data; the body snippet is the error's status + message only.
 */

const ALERT_EVERY_MS = 30 * 60 * 1000;
/** A failed send is retried no sooner than this (so a Resend outage cannot turn every student request into a send). */
const SEND_RETRY_MS = 5 * 60 * 1000;
const SNIPPET_MAX = 200;
const BILLING_URL = 'https://aistudio.google.com/billing';

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const truthy = (v) => /^(1|true|on|yes)$/i.test(String(v || '').trim());

function isDisabled(env = process.env) {
  return truthy(env && env.AI_BILLING_ALERT_DISABLED);
}

/** AI_ALERT_TO, else OPS_REPORT_TO. One address; '' when none / invalid. */
function alertRecipient(env = process.env) {
  const e = env || {};
  for (const k of ['AI_ALERT_TO', 'OPS_REPORT_TO']) {
    const v = typeof e[k] === 'string' ? e[k].trim() : '';
    if (v && EMAIL_RE.test(v)) return v;
  }
  return '';
}

/** "chetan@example.com" -> "c***@example.com". Never prints the whole local part. */
function maskRecipient(addr) {
  const s = String(addr || '');
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s[0]}***${s.slice(at)}`;
}

const BILLING_429_RE = /prepayment credits|credits are depleted|spend(ing)?[ _-]?cap|billing account|BILLING_DISABLED|billing (is )?(not enabled|disabled)/i;
const PER_DAY_QUOTA_RE = /"quotaId"\s*:\s*"[^"]*PerDay/i;
const PER_MINUTE_RE = /PerMinute/i;
const BAD_KEY_400_RE = /API_KEY_INVALID|API key not valid|API key expired/i;

/**
 * PURE. 'billing' | 'key' when (status, body) is a key / billing failure, else null.
 */
function classifyGeminiFailure(status, body) {
  const s = Number(status);
  const text = typeof body === 'string' ? body : '';
  if (s === 402) return 'billing';
  if (s === 401 || s === 403) return 'key';
  if (s === 400) return BAD_KEY_400_RE.test(text) ? 'key' : null;
  if (s === 429) {
    if (BILLING_429_RE.test(text)) return 'billing';
    if (PER_DAY_QUOTA_RE.test(text) && !PER_MINUTE_RE.test(text)) return 'billing';
    return null;
  }
  return null;
}

/** The error's `status` and `message` only (Gemini's error envelope), trimmed. Never the request, never a key. */
function snippetOf(body) {
  const text = typeof body === 'string' ? body : '';
  let out = '';
  try {
    const parsed = JSON.parse(text);
    const err = parsed && (Array.isArray(parsed) ? parsed[0] && parsed[0].error : parsed.error);
    if (err && typeof err === 'object') {
      out = [err.status, err.message].filter((x) => typeof x === 'string' && x).join(': ');
    }
  } catch {
    /* not JSON */
  }
  if (!out) out = text;
  out = out.replace(/\s+/g, ' ').replace(/(key=)[^&\s"]+/gi, '$1***').trim();
  return out.length > SNIPPET_MAX ? `${out.slice(0, SNIPPET_MAX)}...` : out;
}

function istTime(ms) {
  try {
    return `${new Date(ms).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })} IST`;
  } catch {
    return new Date(ms).toISOString();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

function buildFailureEmail({ status, kind, firstSeenMs, countInWindow, totalCount, snippet }) {
  const lines = [
    `Gemini is refusing LazyTopper's AI calls (HTTP ${status}). Grading, detect, the tutor and the free check are failing for students.`,
    `Status: ${status} (${kind === 'billing' ? 'billing / credits' : 'API key / permission'})`,
    `First seen: ${istTime(firstSeenMs)}`,
    `Failures in this window: ${countInWindow} (since first seen: ${totalCount})`,
    snippet ? `Gemini said: ${snippet}` : '',
    `Check AI Studio billing: ${BILLING_URL}`,
    'You get at most one of these every 30 minutes while it continues, and one "recovered" email when AI works again.',
  ].filter(Boolean);
  return { subject: `LazyTopper: AI is failing (Gemini ${status} — ${kind === 'billing' ? 'billing' : 'key'})`, text: lines.join('\n') };
}

function buildRecoveredEmail({ recoveredMs, firstSeenMs, totalCount }) {
  const lines = [
    `AI recovered at ${istTime(recoveredMs)}.`,
    `It had been failing since ${istTime(firstSeenMs)} (${totalCount} failed Gemini responses seen).`,
  ];
  return { subject: 'LazyTopper: AI recovered', text: lines.join('\n') };
}

/** OWNER_ALERT_WHATSAPP as bare digits (a leading + and spaces/dashes are dropped); '' when absent / not 8-15 digits. */
function whatsappNumber(env = process.env) {
  const raw = env && typeof env.OWNER_ALERT_WHATSAPP === 'string' ? env.OWNER_ALERT_WHATSAPP.trim() : '';
  const digits = raw.replace(/^\+/, '').replace(/[\s-]/g, '');
  return /^\d{8,15}$/.test(digits) ? digits : '';
}

/** "91XXXXXX1234" -> "***1234". Never prints more than the last 4 digits. */
function maskPhone(digits) {
  const s = String(digits || '');
  return s.length >= 4 ? `***${s.slice(-4)}` : '***';
}

function isWhatsappDisabled(env = process.env) {
  return truthy(env && env.AI_ALERT_WHATSAPP_DISABLED);
}

const CALLMEBOT_ENDPOINT = 'https://api.callmebot.com/whatsapp.php';
const WHATSAPP_TIMEOUT_MS = 10 * 1000;

/** PURE. The CallMeBot GET URL. Every value is URL-encoded. */
function buildCallMeBotUrl({ phone, text, apiKey }) {
  return `${CALLMEBOT_ENDPOINT}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
}

/**
 * The WhatsApp backend TODAY: CallMeBot's personal WhatsApp API (one GET, 10 s timeout). Resolves { ok }; never rejects.
 * ★ SEAM: this is the ONE function a Meta Cloud API backend replaces later (same signature: text in, { ok } out); the
 * throttle, the kill switches and the message text do not change.
 */
function createCallMeBotSender({ env = process.env, fetchImpl } = {}) {
  return async function sendWhatsApp(text) {
    try {
      const phone = whatsappNumber(env);
      const apiKey = env && typeof env.CALLMEBOT_APIKEY === 'string' ? env.CALLMEBOT_APIKEY.trim() : '';
      const f = fetchImpl || (typeof fetch === 'function' ? fetch : null);
      if (!phone || !apiKey || !f) return { ok: false, code: 'not_configured' };
      const res = await f(buildCallMeBotUrl({ phone, text, apiKey }), {
        method: 'GET',
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(WHATSAPP_TIMEOUT_MS) : undefined,
      });
      return { ok: !!(res && res.ok), code: res ? `http_${res.status}` : 'no_response' };
    } catch (e) {
      return { ok: false, code: e && e.name === 'TimeoutError' ? 'timeout' : 'network' };
    }
  };
}

function whatsappFailureText({ status, firstSeenMs, totalCount }) {
  return `LazyTopper ALERT: AI failing since ${istTime(firstSeenMs)} (Gemini ${status}, ${totalCount} errors). Check AI Studio billing.`;
}
function whatsappRecoveredText({ recoveredMs }) {
  return `LazyTopper: AI recovered at ${istTime(recoveredMs)}.`;
}

function createAiBillingAlert(deps = {}) {
  let env = deps.env || process.env;
  let send = typeof deps.send === 'function' ? deps.send : null;
  let canSend = typeof deps.canSend === 'function' ? deps.canSend : null;
  let now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  let log = typeof deps.log === 'function' ? deps.log : (line) => console.warn(line);
  let fetchImpl = typeof deps.fetchImpl === 'function' ? deps.fetchImpl : null;
  // `deps.sendWhatsApp(text) -> { ok }` replaces the CallMeBot backend (tests; later the Meta Cloud API).
  let customWhatsApp = typeof deps.sendWhatsApp === 'function' ? deps.sendWhatsApp : null;
  const sendWhatsApp = (text) =>
    (customWhatsApp || createCallMeBotSender({ env, fetchImpl }))(text);

  // Outage state, shared by every channel. `firstSeenMs` marks an outage in progress (null = healthy).
  let firstSeenMs = null;
  let totalCount = 0;
  let lastStatus = null;
  let lastKind = null;
  let lastRecovery = null; // { ms, since, total } of the last recovery, for an alert that landed after it

  /* Each channel keeps its OWN send state, so a failing (or hanging) WhatsApp send never blocks the email and vice versa.
     The cadence is the same for both: one "failing" per 30 minutes while it continues, one "recovered" after an alert. */
  function makeChannel(name, offReasonFn, deliver) {
    return {
      name,
      offReason: offReasonFn,
      deliver, // (message: { kind: 'failure'|'recovered', ... }, key) -> Promise<{ ok }>
      lastSendMs: null, // the last alert ATTEMPT (kept across recovery, so flapping cannot beat the 30-minute cap)
      windowCount: 0,
      alerted: false,
      sending: false,
    };
  }

  function emailOffReason() {
    if (isDisabled(env)) return 'AI_BILLING_ALERT_DISABLED=1';
    if (!alertRecipient(env)) return 'no recipient (set AI_ALERT_TO or OPS_REPORT_TO)';
    if (!send) return 'no email sender wired';
    let ready = true;
    try {
      ready = canSend ? !!canSend() : true;
    } catch {
      ready = false;
    }
    if (!ready) return 'email not configured (PAYMENT_EMAIL_ENABLED + RESEND_API_KEY on a verified sender)';
    return '';
  }

  function whatsappOffReason() {
    if (isDisabled(env)) return 'AI_BILLING_ALERT_DISABLED=1';
    if (isWhatsappDisabled(env)) return 'AI_ALERT_WHATSAPP_DISABLED=1';
    if (customWhatsApp) return '';
    const missing = [];
    if (!whatsappNumber(env)) missing.push('OWNER_ALERT_WHATSAPP');
    if (!(env && typeof env.CALLMEBOT_APIKEY === 'string' && env.CALLMEBOT_APIKEY.trim())) missing.push('CALLMEBOT_APIKEY');
    return missing.length ? `missing ${missing.join(' + ')}` : '';
  }

  const emailChannel = makeChannel('email', emailOffReason, (m, key) => {
    const mail =
      m.kind === 'failure'
        ? buildFailureEmail({ status: m.status, kind: m.errKind, firstSeenMs: m.firstSeenMs, countInWindow: m.countInWindow, totalCount: m.totalCount, snippet: m.snippet })
        : buildRecoveredEmail({ recoveredMs: m.recoveredMs, firstSeenMs: m.firstSeenMs, totalCount: m.totalCount });
    return send({
      to: alertRecipient(env),
      subject: mail.subject,
      text: mail.text,
      html: `<pre>${escapeHtml(mail.text)}</pre>`,
      idempotencyKey: key,
      category: 'ai_billing_alert',
    });
  });
  const whatsappChannel = makeChannel('whatsapp', whatsappOffReason, (m) =>
    sendWhatsApp(m.kind === 'failure' ? whatsappFailureText(m) : whatsappRecoveredText(m)),
  );
  const channels = [emailChannel, whatsappChannel];

  function configure(next = {}) {
    if (next.env) env = next.env;
    if (typeof next.send === 'function') send = next.send;
    if (typeof next.canSend === 'function') canSend = next.canSend;
    if (typeof next.now === 'function') now = next.now;
    if (typeof next.log === 'function') log = next.log;
    if (typeof next.fetchImpl === 'function') fetchImpl = next.fetchImpl;
    if (typeof next.sendWhatsApp === 'function') customWhatsApp = next.sendWhatsApp;
  }

  /** The boot line(s). Never prints a key; the recipient and number are masked. */
  function describe() {
    const e = emailOffReason();
    const w = whatsappOffReason();
    const emailPart = e ? `alert OFF (${e}) - log only.` : `alert ON to ${maskRecipient(alertRecipient(env))}`;
    const waPart = w
      ? `WhatsApp OFF (${w})`
      : `WhatsApp ON to ${customWhatsApp && !whatsappNumber(env) ? 'a custom sender' : maskPhone(whatsappNumber(env))}`;
    return `[ai-billing] ${emailPart} | ${waPart}`;
  }

  /** Fire-and-forget on ONE channel. Resolves to a boolean; never rejects. */
  function dispatch(ch, message, key) {
    ch.sending = true;
    return Promise.resolve()
      .then(() => ch.deliver(message, key))
      .then(
        (r) => !!(r && r.ok),
        () => false,
      )
      .finally(() => {
        ch.sending = false;
      });
  }

  function sendRecovered(ch, rec) {
    if (ch.offReason()) return;
    void dispatch(ch, { kind: 'recovered', recoveredMs: rec.ms, firstSeenMs: rec.since, totalCount: rec.total }, `ai-billing-recovered-${rec.since}`).then((ok) => {
      log(ok ? `[ai-billing] recovered ${ch.name} sent` : `[ai-billing] recovered ${ch.name} NOT sent (send failed)`);
    });
  }

  function maybeAlert(ch, t, status, errKind, snippet) {
    if (ch.offReason() || ch.sending) return;
    if (ch.lastSendMs !== null && t - ch.lastSendMs < ALERT_EVERY_MS) return;
    const previous = ch.lastSendMs;
    ch.lastSendMs = t;
    const outage = firstSeenMs;
    const message = { kind: 'failure', status, errKind, firstSeenMs: outage, countInWindow: ch.windowCount, totalCount, snippet };
    ch.windowCount = 0;
    void dispatch(ch, message, `ai-billing-alert-${outage}-${t}`).then((ok) => {
      if (ok) {
        log(`[ai-billing] alert ${ch.name} sent (status=${status})`);
        // Only if this outage is still the current one (a success may have arrived while the send was in flight).
        if (firstSeenMs === outage) ch.alerted = true;
        else if (lastRecovery && lastRecovery.since === outage) sendRecovered(ch, lastRecovery);
      } else {
        // Retry no sooner than SEND_RETRY_MS, and never earlier than the 30-minute cap would have allowed anyway.
        ch.lastSendMs = Math.max(previous === null ? -Infinity : previous, t - ALERT_EVERY_MS + SEND_RETRY_MS);
        log(`[ai-billing] alert ${ch.name} NOT sent (send failed)`);
      }
    });
  }

  /**
   * One key / billing failure from Gemini. Synchronous and cheap; nothing is awaited. Never throws.
   * `kind` is optional ('billing' | 'key'); derived from the status when absent.
   */
  function note(status, snippet, kind) {
    try {
      const t = now();
      const k = kind || (Number(status) === 402 || Number(status) === 429 ? 'billing' : 'key');
      if (firstSeenMs === null) firstSeenMs = t;
      totalCount += 1;
      lastStatus = status;
      lastKind = k;
      log(`[ai-billing] FAILURE status=${status} count=${totalCount}`);
      for (const ch of channels) {
        try {
          ch.windowCount += 1;
          maybeAlert(ch, t, status, k, snippet);
        } catch {
          /* one channel never stops the other */
        }
      }
    } catch {
      /* an alert must never matter to the caller */
    }
  }

  /** A successful Gemini response. Cheap no-op while healthy. Never throws. */
  function noteOk() {
    try {
      if (firstSeenMs === null) return;
      const t = now();
      const since = firstSeenMs;
      const total = totalCount;
      firstSeenMs = null;
      totalCount = 0;
      lastRecovery = { ms: t, since, total };
      log(`[ai-billing] RECOVERED after ${total} failures`);
      for (const ch of channels) {
        try {
          const wasAlerted = ch.alerted;
          ch.alerted = false;
          ch.windowCount = 0;
          if (wasAlerted) sendRecovered(ch, lastRecovery);
        } catch {
          /* one channel never stops the other */
        }
      }
    } catch {
      /* never matters to the caller */
    }
  }

  function state() {
    const ch = (c) => ({ lastSendMs: c.lastSendMs, windowCount: c.windowCount, alerted: c.alerted, sending: c.sending });
    return { firstSeenMs, totalCount, lastStatus, lastKind, email: ch(emailChannel), whatsapp: ch(whatsappChannel) };
  }

  return { note, noteOk, configure, describe, state };
}

// The process-wide instance the gateway reports to. index.cjs `configure`s its sender at boot; until then (and in scripts,
// tests and evals that never configure it) it is log only.
const defaultAlert = createAiBillingAlert();

module.exports = {
  createAiBillingAlert,
  classifyGeminiFailure,
  snippetOf,
  alertRecipient,
  maskRecipient,
  isDisabled,
  buildFailureEmail,
  buildRecoveredEmail,
  // WhatsApp channel (CallMeBot today; `sendWhatsApp` is the seam for the Meta Cloud API).
  whatsappNumber,
  maskPhone,
  isWhatsappDisabled,
  buildCallMeBotUrl,
  createCallMeBotSender,
  whatsappFailureText,
  whatsappRecoveredText,
  CALLMEBOT_ENDPOINT,
  WHATSAPP_TIMEOUT_MS,
  note: (status, snippet, kind) => defaultAlert.note(status, snippet, kind),
  noteOk: () => defaultAlert.noteOk(),
  configure: (deps) => defaultAlert.configure(deps),
  describe: () => defaultAlert.describe(),
  defaultAlert,
  ALERT_EVERY_MS,
  SEND_RETRY_MS,
  BILLING_URL,
};
