/**
 * waOptIn.cjs - WHATSAPP-OPTIN-1 (owner 13 Nov 2026): the WhatsApp number + consent tick offered at checkout and on free-sample
 * downloads, so an unpaid checkout / a downloaded sample can be followed up on WhatsApp.
 *
 * ONE place for the exact consent label, its version, the validation (the existing normaliseIndianMobile) and the stored shape:
 *   waOptIn: { phone: '+91XXXXXXXXXX', consentText, consentVersion: 'wa-optin-v1', consentAt: <ms>, source: 'checkout' | 'sample' }
 *
 * The CONSENT TEXT is a server constant: it is what the visitor saw and ticked (the client renders the same string), never a
 * client-supplied field. Invalid number OR no explicit `consent === true` -> nothing is stored and the order is still created.
 * The number is never logged and never goes to analytics.
 */

const crypto = require('node:crypto');
const { normaliseIndianMobile } = require('./guestPay.cjs');

/** The label beside the tick. Keep byte-identical to src/services/waOptIn.ts WA_OPTIN_LABEL (a test compares them). */
const WA_OPTIN_LABEL = 'Send me updates on WhatsApp';
const WA_OPTIN_VERSION = 'wa-optin-v1';
const WA_OPTIN_COLLECTION = 'waOptIns';

/** Server kill switch: WA_OPTIN_DISABLED=1 -> the route answers 404 and orders ignore the field. */
function isWaOptInDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.WA_OPTIN_DISABLED) || '').trim());
}

/**
 * The validated opt-in out of a request value `{ phone, consent }`, or null. PURE.
 * @returns {{ phone: string } | null}
 */
function readOptIn(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.consent !== true) return null;
  const phone = normaliseIndianMobile(typeof raw.phone === 'string' ? raw.phone : '');
  return phone ? { phone } : null;
}

/** The object stored on a payOrders doc, or null (invalid / unticked / switched off). */
function buildOrderOptIn(raw, nowMs, env = process.env) {
  if (isWaOptInDisabled(env)) return null;
  const ok = readOptIn(raw);
  if (!ok) return null;
  return { phone: ok.phone, consentText: WA_OPTIN_LABEL, consentVersion: WA_OPTIN_VERSION, consentAt: nowMs, source: 'checkout' };
}

/** Spread into a payOrders `set({...})`: `{ waOptIn }` or `{}`. */
function orderOptInField(body, nowMs, env = process.env) {
  const v = buildOrderOptIn(body && typeof body === 'object' ? body.waOptIn : null, nowMs, env);
  return v ? { waOptIn: v } : {};
}

/** The waOptIns document id: the hash of the E.164 number (so one number is one row and the id holds no digits). */
function optInDocId(e164) {
  return crypto.createHash('sha256').update(String(e164)).digest('hex');
}

module.exports = {
  WA_OPTIN_LABEL,
  WA_OPTIN_VERSION,
  WA_OPTIN_COLLECTION,
  isWaOptInDisabled,
  readOptIn,
  buildOrderOptIn,
  orderOptInField,
  optInDocId,
};
