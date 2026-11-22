/**
 * SERVER-EVENTS-1 - the ad-matching ids the server needs to send Meta Conversions API / GA4 Measurement Protocol events for an
 * order: the first-party cookies Meta and GA4 already set (`_fbp`, `_fbc`, `_ga`), the page the buyer is on (no query string), and
 * the checkout attempt id the pixel's InitiateCheckout used as its eventID (packs). Sent ONCE, in the order-create body, as
 * `adSignals`; the server validates every value and stores them on the order. Nothing here reads or sends an email or phone, and
 * nothing is persisted by this module beyond one in-memory attempt id. Never throws; absent cookies -> `{}`.
 */

import { newCheckoutAttemptId, trackMetaInitiateCheckoutAtOrder } from "./analytics";
import { metaIcAtOrderDisabled } from "./metaIcFlag";

const ATTEMPT_TTL_MS = 10 * 60 * 1000;
let lastAttempt: { id: string; at: number } | null = null;

/** Called by the pack checkout tap with the id it gives Meta's InitiateCheckout as `eventID`. */
export function rememberCheckoutAttempt(id: string): void {
  if (typeof id === "string" && id) lastAttempt = { id, at: Date.now() };
}

function cookieValue(name: string): string {
  try {
    for (const part of document.cookie.split(";")) {
      const i = part.indexOf("=");
      if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
    }
  } catch {
    /* cookies blocked */
  }
  return "";
}

export interface AdSignals {
  fbp?: string;
  fbc?: string;
  ga?: string;
  gas?: string;
  url?: string;
  attemptId?: string;
}

/** Spread into an order-create body: `{ adSignals }` or `{}`. The attempt id is handed out ONCE (then forgotten). */
export function adSignalFields(): { adSignals?: AdSignals } {
  try {
    const s: AdSignals = {};
    const fbp = cookieValue("_fbp");
    const fbc = cookieValue("_fbc");
    const ga = cookieValue("_ga");
    const gas = cookieValue("_ga_1T8Q12H4RQ"); // GA4 session cookie: the server reads the session id out of it
    if (fbp) s.fbp = fbp;
    if (fbc) s.fbc = fbc;
    if (ga) s.ga = ga;
    if (gas) s.gas = gas;
    s.url = `${window.location.origin}${window.location.pathname}`;
    if (lastAttempt && Date.now() - lastAttempt.at < ATTEMPT_TTL_MS) s.attemptId = lastAttempt.id;
    else if (!metaIcAtOrderDisabled()) {
      // META-IC-1: every order-create call is ONE checkout attempt with its own id (a retry that re-sends this body keeps it; a new
      // order after a failure builds a new body and gets a new one). The order-create observer sends the pixel InitiateCheckout
      // with this id once the order exists (metaIcAfterOrder), and the server sends its twin with it.
      s.attemptId = newCheckoutAttemptId();
    }
    lastAttempt = null;
    return s.fbp || s.fbc || s.ga || s.attemptId ? { adSignals: s } : {};
  } catch {
    return {};
  }
}

/**
 * META-IC-1 - called by each order-create service function AFTER its response is ok and valid: sends Meta's InitiateCheckout
 * (pixel, eventID = the attempt id the request carried; the server sends its twin with the same id). `reused: true` (an open order
 * handed back) sends nothing; an order id is counted once. Never throws.
 */
export function metaIcAfterOrder(signals: { adSignals?: AdSignals }, order: { orderId?: unknown; amountPaise?: unknown; reused?: unknown; sku?: unknown }, sku: string | null): void {
  try {
    const attemptId = signals.adSignals?.attemptId;
    if (!attemptId || typeof order.orderId !== "string") return;
    trackMetaInitiateCheckoutAtOrder({
      attemptId,
      orderId: order.orderId,
      reused: order.reused === true,
      amountPaise: typeof order.amountPaise === "number" ? order.amountPaise : null,
      sku: sku ?? (typeof order.sku === "string" ? order.sku : null),
    });
  } catch {
    /* analytics must never break the page */
  }
}
