/**
 * serverEvents.cjs - SERVER-EVENTS-1: server-side Meta Conversions API (CAPI) + GA4 Measurement Protocol events, sent from
 * the places where the server has already VERIFIED the money, so the ad bidders count what the browser pixels lose
 * (ad blockers, Facebook / Instagram in-app browsers, closed tabs).
 *
 * ★ NEVER IN THE PAYMENT PATH. Every public entry point here is fire-and-forget and cannot throw or reject: callers use
 *   `fire(...)`, which wraps the call in try / catch and swallows a rejected promise. Nothing here is ever awaited by a grant,
 *   verify, webhook or sign-in response. Timeout <= 3 s, ONE retry, errors swallowed and counted (`serverEvents.*` counters).
 * ★ NEVER CHANGES GRANT / VERIFY / PRICE. It only READS the stored order (after it is paid) and writes ONE additive field,
 *   `serverEvents.{meta,ga4}`, on that order doc (the once-per-order marker).
 * ★ ENV (all optional; nothing set -> a silent no-op):
 *     META_CAPI_ACCESS_TOKEN  META_PIXEL_ID (default 2018097265518900)  META_TEST_EVENT_CODE
 *     GA4_MEASUREMENT_ID (default G-1T8Q12H4RQ, the id the client loads)  GA4_API_SECRET
 *     SERVER_EVENTS_DISABLED=1  (kill switch: everything off)
 * ★ PRIVACY. Owner ruling 13 Nov 2026: email + phone go to Meta, SHA-256 hashed + normalised (Meta spec), for every buyer and
 *   sign-up we have them for. Raw values are never logged: logs carry order ids + a status word only.
 *
 * Browser counterparts (src/analytics): Purchase / PackPurchase use eventID = the Razorpay order id (META-PURCHASE-DEDUP-1);
 * InitiateCheckout (packs) uses the checkout attempt id (META-PACK-CHECKOUT-1). CompleteRegistration has NO browser eventID
 * today (documented gap): the server sends its own stable id.
 */

const crypto = require('crypto');
const { isPackProduct } = require('./packProducts.cjs');
const { isTopupProduct } = require('./passPricing.cjs');

const DEFAULT_PIXEL_ID = '2018097265518900';
const DEFAULT_GA4_ID = 'G-1T8Q12H4RQ';
const GRAPH_VERSION = 'v21.0';
const TIMEOUT_MS = 3000;
const PENDING_STALE_MS = 5 * 60 * 1000;
const PAID_STATES = Object.freeze(['paid', 'paid_unclaimed', 'claimed']);
const SITE_ORIGIN = 'https://www.lazytopper.com';

const truthy = (v) => /^(1|true|on|yes)$/i.test(String(v || '').trim());
const clean = (v) => (typeof v === 'string' ? v.trim() : '');

/* ── PURE helpers (exported for the tests) ─────────────────────────────────────────────────────────────────────────── */

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Meta spec: trim, lowercase, then SHA-256. null when it does not look like an email. */
function hashEmail(raw) {
  const v = clean(raw).toLowerCase();
  if (!v || v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return sha256Hex(v);
}

/** Meta spec: digits only, WITH country code (91 for a bare Indian number), then SHA-256. null when unusable. */
function normalisePhone(raw) {
  let d = clean(raw).replace(/\D+/g, '');
  if (!d) return null;
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  if (d.length < 11 || d.length > 15) return null;
  return d;
}
function hashPhone(raw) {
  const d = normalisePhone(raw);
  return d ? sha256Hex(d) : null;
}

/** An opaque stable id for the signed-in account (Meta `external_id`); never the raw uid. */
function hashExternalId(uid) {
  const v = clean(uid);
  return v ? sha256Hex(v) : null;
}

const FBP_RE = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,64}$/;
const FBC_RE = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,300}$/;
const GA_COOKIE_RE = /^GA\d\.\d\.(\d{1,12}\.\d{1,12})$/;
const GA_SESSION_COOKIE = '_ga_1T8Q12H4RQ';
const GA_SESSION_RES = [/^GS1\.\d\.(\d{9,12})\./, /^GS2\.\d\.s(\d{9,12})(?:\$|$)/];
const GA_CLIENT_RE = /^\d{1,12}\.\d{1,12}$/;
const ATTEMPT_RE = /^[A-Za-z0-9_-]{8,80}$/;

function cleanUrl(raw) {
  const v = clean(raw);
  if (!v || v.length > 400) return '';
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || !/(^|\.)lazytopper\.com$/i.test(u.hostname)) return '';
    return `${u.origin}${u.pathname}`.slice(0, 200); // never a query string or fragment
  } catch {
    return '';
  }
}

/** Accept the raw `_ga` cookie (GA1.1.123.456) or the bare client id (123.456). */
function gaClientIdFrom(raw) {
  const v = clean(raw);
  if (GA_CLIENT_RE.test(v)) return v;
  const m = GA_COOKIE_RE.exec(v);
  return m ? m[1] : '';
}

/** The GA4 session id out of a `_ga_<stream>` cookie (GS1.1.<id>.n... or GS2.1.s<id>$o...), or the bare digits; '' when malformed. */
function gaSessionIdFrom(raw) {
  const v = clean(raw);
  if (/^\d{9,12}$/.test(v)) return v;
  for (const re of GA_SESSION_RES) {
    const m = re.exec(v);
    if (m) return m[1];
  }
  return '';
}

/** The matching cookies out of a Cookie request header (same-origin API calls carry them). Never throws. */
function signalsFromCookieHeader(header) {
  const out = {};
  try {
    for (const part of String(header || '').split(';')) {
      const i = part.indexOf('=');
      if (i < 0) continue;
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k === '_fbp' && FBP_RE.test(v)) out.fbp = v;
      else if (k === '_fbc' && FBC_RE.test(v)) out.fbc = v;
      else if (k === GA_SESSION_COOKIE) {
        const g = gaSessionIdFrom(v);
        if (g) out.gaSessionId = g;
      } else if (k === '_ga') {
        const g = gaClientIdFrom(v);
        if (g) out.gaClientId = g;
      }
    }
  } catch {
    /* no signals */
  }
  return out;
}

function clientIpOf(req) {
  try {
    const xff = String((req && req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
    const ip = xff || String((req && req.socket && req.socket.remoteAddress) || '').trim();
    return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : '';
  } catch {
    return '';
  }
}

/**
 * The matching data stored on the order doc at creation: `{ adSignals: {...} }` or `{}`. The body's `adSignals` (client cookie
 * capture) wins; the request's Cookie header is the fallback; the IP and user agent are the SERVER's own read of the request.
 * Every value is validated against a narrow pattern - an unknown or malformed value is dropped, never stored.
 */
function adSignalsField(body, req, env = process.env) {
  try {
    if (truthy(env && env.SERVER_EVENTS_DISABLED)) return {};
    const raw = body && typeof body === 'object' && body.adSignals && typeof body.adSignals === 'object' ? body.adSignals : {};
    const fromCookie = signalsFromCookieHeader(req && req.headers && req.headers.cookie);
    const s = {};
    const fbp = clean(raw.fbp);
    const fbc = clean(raw.fbc);
    const ga = gaClientIdFrom(raw.ga);
    const url = cleanUrl(raw.url);
    const attempt = clean(raw.attemptId);
    if (FBP_RE.test(fbp)) s.fbp = fbp;
    else if (fromCookie.fbp) s.fbp = fromCookie.fbp;
    if (FBC_RE.test(fbc)) s.fbc = fbc;
    else if (fromCookie.fbc) s.fbc = fromCookie.fbc;
    if (ga) s.gaClientId = ga;
    else if (fromCookie.gaClientId) s.gaClientId = fromCookie.gaClientId;
    const gas = gaSessionIdFrom(raw.gas);
    if (gas) s.gaSessionId = gas;
    else if (fromCookie.gaSessionId) s.gaSessionId = fromCookie.gaSessionId;
    if (url) s.url = url;
    if (ATTEMPT_RE.test(attempt)) s.attemptId = attempt;
    const ua = clean(req && req.headers && req.headers['user-agent']).slice(0, 300);
    if (ua) s.ua = ua;
    const ip = clientIpOf(req);
    if (ip) s.ip = ip;
    return Object.keys(s).length ? { adSignals: s } : {};
  } catch {
    return {};
  }
}

function userDataFrom({ email, phone, uid, signals }) {
  const s = signals && typeof signals === 'object' ? signals : {};
  const em = hashEmail(email);
  const ph = hashPhone(phone);
  const ext = hashExternalId(uid);
  const ud = {};
  if (em) ud.em = [em];
  if (ph) ud.ph = [ph];
  if (ext) ud.external_id = [ext];
  if (s.ip) ud.client_ip_address = s.ip;
  if (s.ua) ud.client_user_agent = s.ua;
  if (s.fbp) ud.fbp = s.fbp;
  if (s.fbc) ud.fbc = s.fbc;
  return ud;
}

/** One Meta CAPI event object. `custom_data` is passed through. */
function buildMetaEvent({ name, eventId, nowMs, url, userData, customData }) {
  return {
    event_name: name,
    event_time: Math.floor(nowMs / 1000),
    event_id: eventId,
    event_source_url: cleanUrl(url) || `${SITE_ORIGIN}/`,
    action_source: 'website',
    user_data: userData,
    ...(customData ? { custom_data: customData } : {}),
  };
}

function orderValueInr(order) {
  const p = order && order.amountPaise;
  return typeof p === 'number' && Number.isFinite(p) && p > 0 ? Math.round(p) / 100 : null;
}

const ITEM_NAMES = Object.freeze({ till_boards: 'Premium pass till your boards', month: 'Premium month pass' });

/** The GA4 Measurement Protocol body for a paid order. Same transaction_id as the browser hit, so GA4 de-duplicates. */
function buildGa4Purchase({ orderId, order, signals }) {
  const value = orderValueInr(order);
  const passType = order && order.passType;
  // No GA cookie (ad blocker): a stable synthetic id so the revenue still counts; GA4 de-duplicates the sale by transaction_id.
  const client = signals && signals.gaClientId ? signals.gaClientId : `${parseInt(sha256Hex(String(orderId)).slice(0, 8), 16)}.1700000000`;
  return {
    client_id: client,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: orderId,
          // Join the visitor's GA4 session (else the sale shows as "(not set)"); omitted when the cookie was missing / malformed.
          ...(signals && signals.gaSessionId ? { session_id: signals.gaSessionId, engagement_time_msec: 1 } : {}),
          currency: 'INR',
          ...(value === null ? {} : { value }),
          items: [{ item_id: passType, item_name: ITEM_NAMES[passType] || String(passType), ...(value === null ? {} : { price: value }), quantity: 1 }],
        },
      },
    ],
  };
}

/* ── the service ───────────────────────────────────────────────────────────────────────────────────────────────────── */

function createServerEvents(deps = {}) {
  const { firestore, telemetry } = deps;
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const logger = deps.logger || console;

  const disabled = truthy(env.SERVER_EVENTS_DISABLED);
  const metaToken = clean(env.META_CAPI_ACCESS_TOKEN);
  const pixelId = clean(env.META_PIXEL_ID) || DEFAULT_PIXEL_ID;
  const testCode = clean(env.META_TEST_EVENT_CODE);
  const ga4Id = clean(env.GA4_MEASUREMENT_ID) || DEFAULT_GA4_ID;
  const ga4Secret = clean(env.GA4_API_SECRET);
  const metaOn = !disabled && !!metaToken && !!fetchImpl;
  const ga4On = !disabled && !!ga4Secret && !!ga4Id && !!fetchImpl;

  function count(name) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(`serverEvents.${name}`, 1);
    } catch {
      /* a counter must never fail anything */
    }
  }

  /** POST JSON with a 3 s timeout and ONE retry (network error, 429 or 5xx). Resolves true/false; never throws. */
  async function postJson(url, body, channel) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timer;
      try {
        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
        if (ctl) timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          ...(ctl ? { signal: ctl.signal } : {}),
        });
        if (res && res.ok) return true;
        const status = res && typeof res.status === 'number' ? res.status : 0;
        if (status >= 400 && status < 500 && status !== 429) {
          count(`${channel}.rejected`);
          return false;
        }
      } catch {
        /* retry once */
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    count(`${channel}.error`);
    return false;
  }

  function sendMetaEvent(event) {
    if (!metaOn) return Promise.resolve(false);
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events`;
    return postJson(url, { data: [event], access_token: metaToken, ...(testCode ? { test_event_code: testCode } : {}) }, 'meta').then((ok) => {
      if (ok) count('meta.sent');
      return ok;
    });
  }

  function sendGa4Body(body) {
    if (!ga4On) return Promise.resolve(false);
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(ga4Id)}&api_secret=${encodeURIComponent(ga4Secret)}`;
    return postJson(url, body, 'ga4').then((ok) => {
      if (ok) count('ga4.sent');
      return ok;
    });
  }

  /**
   * Claim "send once" for an order + channel in ONE transaction. Returns the stored order (to build the event from) or null
   * when the order is not paid / is gone / was already sent / is being sent right now. A failed send is marked `failed`,
   * which a later verify / webhook / status call may claim again.
   */
  async function claim(orderId, channel) {
    if (!firestore || typeof firestore.runTransaction !== 'function') return null;
    const ref = firestore.collection('payOrders').doc(orderId);
    return firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap || !snap.exists) return null;
      const order = snap.data() || {};
      if (!PAID_STATES.includes(order.status)) return null;
      const mark = order.serverEvents && order.serverEvents[channel];
      if (mark && (mark.state === 'sent' || (mark.state === 'pending' && now() - Number(mark.at || 0) < PENDING_STALE_MS))) return null;
      tx.set(ref, { serverEvents: { ...(order.serverEvents || {}), [channel]: { state: 'pending', at: now() } } }, { merge: true });
      return order;
    });
  }

  async function settle(orderId, channel, ok) {
    try {
      const ref = firestore.collection('payOrders').doc(orderId);
      await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = snap && snap.exists ? (snap.data() || {}).serverEvents || {} : {};
        tx.set(ref, { serverEvents: { ...prev, [channel]: { state: ok ? 'sent' : 'failed', at: now() } } }, { merge: true });
      });
    } catch {
      count(`${channel}.marker_error`);
    }
  }

  async function sendPaidChannel(channel, orderId, payment, build) {
    let order;
    try {
      order = await claim(orderId, channel);
    } catch {
      count(`${channel}.claim_error`);
      return false;
    }
    if (!order) return false;
    let ok = false;
    try {
      ok = await build(order);
    } catch {
      count(`${channel}.error`);
    }
    await settle(orderId, channel, ok);
    return ok;
  }

  /**
   * A server-verified paid order: Meta `Purchase` (pass) / `PackPurchase` (pack) + GA4 `purchase`. Once per order across
   * verify + webhook + status. Top-ups send nothing (the browser sends none). Resolves; never rejects.
   */
  async function orderPaid({ orderId, payment } = {}) {
    try {
      if (!(metaOn || ga4On) || typeof orderId !== 'string' || !orderId) return;
      const pay = payment && typeof payment === 'object' ? payment : {};
      const jobs = [];
      if (metaOn) {
        jobs.push(() =>
          sendPaidChannel('meta', orderId, pay, async (order) => {
            if (isTopupProduct(order.passType)) return true;
            const value = orderValueInr(order);
            const s = order.adSignals || {};
            const ev = buildMetaEvent({
              name: isPackProduct(order.passType) ? 'PackPurchase' : 'Purchase',
              eventId: orderId,
              nowMs: now(),
              url: s.url,
              // A recipient order's stored contact is the RECIPIENT's, not the buyer's: only a plain guest order falls back to it.
              userData: userDataFrom({ email: pay.email || (order.checkoutWho === true ? '' : order.guestEmail), phone: pay.contact || (order.checkoutWho === true ? '' : order.guestPhone), uid: order.uid, signals: s }),
              customData: { currency: 'INR', ...(value === null ? {} : { value }) },
            });
            return sendMetaEvent(ev);
          }),
        );
      }
      if (ga4On) {
        jobs.push(() =>
          sendPaidChannel('ga4', orderId, pay, async (order) => {
            if (isTopupProduct(order.passType)) return true;
            return sendGa4Body(buildGa4Purchase({ orderId, order, signals: order.adSignals }));
          }),
        );
      }
      // Sequential, not parallel: each channel's claim / settle rewrites the shared `serverEvents` map, so they must read each other's marker.
      for (const job of jobs) {
        try {
          await job();
        } catch {
          count('orderPaid.error');
        }
      }
    } catch {
      count('orderPaid.error');
    }
  }

  /**
   * Meta `InitiateCheckout` when the server has created a Razorpay order. event_id is the BROWSER's checkout attempt id, passed
   * through on the order body (packs only today: the Board Pass tap sends no eventID, so there is nothing to dedupe against and
   * none is sent). Resolves; never rejects.
   */
  async function orderCreated({ orderId, passType, amountPaise, uid, signals } = {}) {
    try {
      if (!metaOn || !signals || !signals.attemptId || !isPackProduct(passType)) return;
      const value = orderValueInr({ amountPaise });
      await sendMetaEvent(
        buildMetaEvent({
          name: 'InitiateCheckout',
          eventId: signals.attemptId,
          nowMs: now(),
          url: signals.url,
          userData: userDataFrom({ uid, signals }),
          customData: { currency: 'INR', ...(value === null ? {} : { value }), content_ids: [passType], content_type: 'product' },
        }),
      );
    } catch {
      count('orderCreated.error');
    }
  }

  /** Meta `CompleteRegistration` for a brand-new account. event_id = `reg_` + a hash of the uid (the browser sends none). */
  async function registration({ uid, email, phone, signals } = {}) {
    try {
      const ext = hashExternalId(uid);
      if (!metaOn || !ext) return;
      await sendMetaEvent(
        buildMetaEvent({
          name: 'CompleteRegistration',
          eventId: `reg_${ext.slice(0, 24)}`,
          nowMs: now(),
          url: signals && signals.url,
          userData: userDataFrom({ email, phone, uid, signals }),
          customData: { currency: 'INR', value: 0 },
        }),
      );
    } catch {
      count('registration.error');
    }
  }

  /** The boot line, once. Statuses only. */
  function bootLine() {
    try {
      logger.log(`[server-events] meta=${metaOn ? 'ON' : 'OFF'} ga4=${ga4On ? 'ON' : 'OFF'}`);
    } catch {
      /* ignore */
    }
  }

  /** The order-doc field `{ adSignals }` - or `{}` when neither channel is ON (so an order is byte-identical to today). */
  function signalsField(body, req) {
    return metaOn || ga4On ? adSignalsField(body, req, env) : {};
  }

  return { metaOn, ga4On, signalsField, orderPaid, orderCreated, registration, bootLine };
}

/**
 * Run a server-events call WITHOUT letting it touch the caller: a synchronous throw and a rejected promise are both
 * swallowed, and nothing is awaited. This is the ONLY way payment routes call the service.
 */
function fire(fn) {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') out.then(undefined, () => {});
  } catch {
    /* never into the payment path */
  }
}

/** `serverEvents.signalsField(body, req)` or `{}`: safe in an order write (a missing / broken service can never fail an order). */
function signalsFor(serverEvents, body, req) {
  try {
    return serverEvents && typeof serverEvents.signalsField === 'function' ? serverEvents.signalsField(body, req) || {} : {};
  } catch {
    return {};
  }
}

module.exports = {
  createServerEvents,
  fire,
  signalsFor,
  adSignalsField,
  signalsFromCookieHeader,
  sha256Hex,
  hashEmail,
  hashPhone,
  normalisePhone,
  hashExternalId,
  buildMetaEvent,
  buildGa4Purchase,
  userDataFrom,
  gaClientIdFrom,
  gaSessionIdFrom,
  cleanUrl,
  DEFAULT_PIXEL_ID,
  DEFAULT_GA4_ID,
};
