/**
 * orderSource.cjs - ORDER-SOURCE-1 (owner-approved): where did the buyer of this order come from, so paid ads can be matched
 * to real orders.
 *
 * The client sends `source` in the order-create body (the coarse visit source it already keeps: src/analytics/visitSource.ts).
 * It is UNTRUSTED. This module rebuilds it from an allow-list, field by field:
 *   - only the known keys below; every other key (and every nested object / array) is dropped;
 *   - strings are trimmed and capped at 100 chars, and must match a narrow charset (no '?', '#', '://', '@', spaces);
 *   - an Indian-mobile-shaped run in any string drops that string;
 *   - click ids (gclid / fbclid / gbraid / wbraid) are kept ONLY as the boolean `true`; a string value is dropped, never stored;
 *   - nothing usable -> `{}` so the order document is byte-identical to today.
 * Never stored: a click-id value, an email, a phone, a full URL, a query string.
 *
 * Server kill switch: ORDER_SOURCE_DISABLED=1 -> never stored.
 */

const MAX_LEN = 100;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']; // the client never sends utm_term
const CLICK_KEYS = ['gclid', 'fbclid', 'gbraid', 'wbraid'];

const TAG_CHARSET = /^[A-Za-z0-9_.\-{}]+$/;
const HOST_CHARSET = /^[a-z0-9.-]+$/;
const PATH_CHARSET = /^\/(?!\/)[A-Za-z0-9_\-./:]*$/; // a single leading slash: never protocol-relative (//host)
const MOBILE_SHAPE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/;

function isOrderSourceDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.ORDER_SOURCE_DISABLED) || '').trim());
}

function clean(raw, charset) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().slice(0, MAX_LEN);
  if (!v || !charset.test(v) || MOBILE_SHAPE.test(v)) return null;
  return v;
}

/**
 * PURE. The whitelisted, sanitised source out of a request value, or {} (nothing to store).
 * @returns {Record<string, string | true>}
 */
function sanitiseOrderSource(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  const ref = clean(typeof raw.ref === 'string' ? raw.ref.toLowerCase() : raw.ref, HOST_CHARSET);
  if (ref) out.ref = ref;
  for (const k of UTM_KEYS) {
    const v = clean(raw[k], TAG_CHARSET);
    if (v) out[k] = v;
  }
  const landing = clean(raw.landing, PATH_CHARSET);
  if (landing) out.landing = landing;
  for (const k of CLICK_KEYS) if (raw[k] === true) out[k] = true;
  return out;
}

/** The order-document field `{ source: {...} }`, or {} (invalid / absent / kill switch). Spread into the order write. */
function orderSourceField(body, env = process.env) {
  if (isOrderSourceDisabled(env)) return {};
  const s = sanitiseOrderSource(body && typeof body === 'object' ? body.source : null);
  return Object.keys(s).length ? { source: s } : {};
}

module.exports = { MAX_LEN, isOrderSourceDisabled, sanitiseOrderSource, orderSourceField };
