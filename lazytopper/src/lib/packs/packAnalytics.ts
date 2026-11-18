/**
 * packAnalytics — PACKS-CLIENT-1 event senders (lazy: imported by PacksPage only, never by the entry chunk).
 *
 * The printable PDF packs. Separate from the Premium pass funnel on purpose:
 * `purchase` / `begin_checkout` (first-party log, Vercel, Meta) keep meaning "Premium pass".
 *
 *   pack_view / pack_download  bare vendor event + the first-party name; `data` is coarse (sku / kind).
 *   pack_checkout              vendors + first-party get `pack_checkout`; GA4 ALSO gets its recommended
 *                              `begin_checkout` ecommerce hit (item_id = sku), GA4 only.
 *   pack_purchase              ONLY from the server-verified paid branch, once per transaction id
 *                              (the same per-tab dedupe as `purchase`). Meta: custom `PackPurchase` with
 *                              { value, currency }. GA4 ALSO gets its recommended `purchase` hit
 *                              (transaction_id, items[item_id = sku]), GA4 only.
 */

import {
  CHECKOUT_CURRENCY,
  analyticsEnabled,
  currentSalesPageSurface,
  packIsAdminHit,
  purchaseSentMemory,
  readPurchaseSent,
  rememberPurchaseSent,
  sendAdsConversion,
  sendAnalyticsHit,
  newCheckoutAttemptId,
  sendGa4Hit,
} from "../../analytics/analytics";
import { rememberCheckoutAttempt } from "../../analytics/adSignals";
import { priceWithGst } from "../../config/pricing";
import { currentInAppPay } from "../../utils/inAppPay";
import { reportPackSampleSeen, signedInHint } from "./packSampleSeen";

export type PackSkuName = "pack_chapter" | "pack_mock" | "pack_subject" | "pack_bundle" | "pack_cbq";

export interface PackCheckoutDetails {
  sku: PackSkuName;
  itemName: string;
  /** Rupees. null when unknown: the event is sent without a value. */
  valueInr: number | null;
}

/** The GA4 ecommerce item: sku, name, the rupee price when known, and quantity 1 (a pack is bought one at a time). */
function packItem(d: PackCheckoutDetails): Record<string, unknown> {
  const price = typeof d.valueInr === "number" && Number.isFinite(d.valueInr) && d.valueInr > 0 ? d.valueInr : null;
  return { item_id: d.sku, item_name: d.itemName, ...(price === null ? {} : { price }), quantity: 1 };
}

function packMoney(d: PackCheckoutDetails): Record<string, unknown> {
  const value = typeof d.valueInr === "number" && Number.isFinite(d.valueInr) && d.valueInr > 0 ? d.valueInr : null;
  return value === null ? { currency: CHECKOUT_CURRENCY } : { currency: CHECKOUT_CURRENCY, value };
}

/** A GA4-only hit: the vendor-recommended name, with no first-party / Vercel / Meta copy. Never on /admin. */
function sendGa4Only(name: string, params: Record<string, unknown>): void {
  if (!analyticsEnabled()) return;
  let adminHit = true;
  try {
    adminHit = packIsAdminHit("event", { name });
  } catch {
    adminHit = true;
  }
  if (adminHit) return;
  try {
    sendGa4Hit("event", { name }, params);
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * PASS-OWNER-PACKS-1: the four gentle pack offers a Board Pass owner may see (payment success, a downloaded paper, a graded Full
 * Mock, Me / Progress). Used as the `surface` of `pack_view` and the `from` of `pack_checkout`. Nothing about the person.
 */
export type PassOwnerOfferSurface = "pass_success" | "pass_download" | "pass_mock" | "pass_me";

/** Where a `pack_view` happened (PRICING-ONE-1): the /packs page or the packs section of /pricing; or a Board Pass owner's offer. */
export type PackViewSurface = "packs" | "pricing" | "for_parents" | "cbq-packs" | PassOwnerOfferSurface;

/** PRICING-PAGES-2 F4: the sales page the event happened on (null off those pages: payloads unchanged). */
function salesSurface(): { surface: string } | Record<string, never> {
  const s = currentSalesPageSurface();
  return s ? { surface: s } : {};
}

/**
 * PRICING-PAGES-2 N2 - the page each pack's checkout STARTED on (sku -> surface, null = not a sales page), captured at
 * `pack_checkout`. A purchase confirmed later (a pending order the shop keeps polling after the student moved on) reports the page it
 * started on, not the page open when it settles. A purchase with no recorded start (none in this tab) uses the page open now.
 */
const checkoutStartedOn = new Map<string, string | null>();
function purchaseSurface(sku: string): { surface: string } | Record<string, never> {
  const s = checkoutStartedOn.has(sku) ? checkoutStartedOn.get(sku) ?? null : currentSalesPageSurface();
  return s ? { surface: s } : {};
}
/** Test seam: forget the recorded checkout starts. */
export function __resetPackCheckoutStartsForTests(): void {
  checkoutStartedOn.clear();
}

/** `pack_view` (page opened) and `pack_download` (a file saved). `sku` is the pack kind, never an id. `surface` (pack_view only) says which page. */
export function trackPackEvent(name: "pack_view" | "pack_download", sku?: PackSkuName, surface?: PackViewSurface): void {
  try {
    // PRICING-PAGES-2 F4: a pack_view on a sales page names that page (the shop it mounts passes its default "packs").
    const page = name === "pack_view" ? currentSalesPageSurface() : null;
    const where = page ?? surface;
    const data: Record<string, string> = { ...(sku ? { sku } : {}), ...(where ? { surface: where } : {}) };
    const has = Object.keys(data).length > 0;
    sendAnalyticsHit("event", { name, ...(has ? { data } : {}) }, has ? { ga4: data } : {});
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * `pack_ready_shown` (PACK-READY-1): the "Your pack is ready" banner (My packs) or toast (any other page) was shown after a pay-by-phone
 * claim. `sku` is the pack kind (or `board_pass`), `surface` is `banner` | `toast` | `banner_return` (arrived at #my-packs with no claim in hand). Nothing about the person is attached.
 */
export function trackPackReadyShown(sku: string, surface: "banner" | "toast" | "banner_return"): void {
  try {
    const data = { sku, surface };
    sendAnalyticsHit("event", { name: "pack_ready_shown", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * `pack_sample_download` (PACK-SAMPLE-1): a visitor tapped "Free sample page". `pack` is `<sku>:<target>` (e.g. `pack_cbq:science`),
 * `surface` says where the link was; `signed_in` (SAMPLE-FOLLOWUP-1) says whether a signed-in student tapped. Sent for signed-out visitors too: nothing about the person is attached.
 */
export function trackPackSampleDownload(pack: string, surface: string): void {
  try {
    // SAMPLE-FOLLOWUP-1: `signed_in` (true / false, never who) is added once Firebase Auth is known, so signed-in and signed-out
    // sample downloads can be counted apart. A signed-in tap also tells our server which pack, for the one follow-up email.
    const signedIn = signedInHint();
    const data = { pack, surface, ...(typeof signedIn === "boolean" ? { signed_in: signedIn } : {}) };
    sendAnalyticsHit("event", { name: "pack_sample_download", data }, { ga4: data });
    reportPackSampleSeen(pack);
  } catch {
    /* analytics must never break the page */
  }
}

/** PACKS-CONVERT-1: where a checkout tap came from, when it is not a plain Buy. */
export type PackCheckoutFrom = "sample" | "for_parents" | PassOwnerOfferSurface;

/**
 * `pack_checkout` at the Buy TAP. BUY-PATH-1: `signedIn` (when given) adds `signed_in` to the first-party / Vercel / GA4
 * data, so a signed-out tap (sent before the branch to sign-in or pay-by-phone) is told apart from a signed-in one.
 */
/**
 * META-PACK-CHECKOUT-1: attempt ids that already sent Meta's InitiateCheckout in this page load, so a re-render or a second call
 * with the same id sends it once. (Meta also discards a repeat name + eventID within 48 h; this keeps the second call off the wire.)
 */
const metaCheckoutSent = new Set<string>();
/** Test seam: forget the attempt ids already sent to Meta. */
export function __resetPackMetaCheckoutForTests(): void {
  metaCheckoutSent.clear();
}

export function trackPackCheckout(
  details: PackCheckoutDetails,
  ctx: { signedIn?: boolean; resumed?: boolean; from?: PackCheckoutFrom; attemptId?: string } = {},
): void {
  try {
    const money = packMoney(details);
    // BUY-PATH-1 review: `resumed: true` marks a checkout started AUTOMATICALLY after sign-in (the ?buy= resume), so a funnel can
    // drop it and not count the sign-in-first visitor twice. The event is never suppressed.
    const inApp = currentInAppPay();
    const who = {
      // INAPP-PAY-1: the in-app browser the checkout started in (coarse slug; absent in a normal browser / when killed).
      ...(inApp ? { in_app: inApp.app } : {}),
      ...(typeof ctx.signedIn === "boolean" ? { signed_in: ctx.signedIn } : {}),
      ...(ctx.resumed ? { resumed: true } : {}),
      // PACKS-CONVERT-1: `from: "sample"` marks a Buy tapped on the "Liked the sample?" button that follows a free-sample download.
      ...(ctx.from ? { from: ctx.from } : {}),
      ...salesSurface(),
    };
    checkoutStartedOn.set(details.sku, currentSalesPageSurface());
    // META-PACK-CHECKOUT-1: ONE standard InitiateCheckout per checkout attempt, through the same Meta gate and queue as every
    // other event (META_EVENTS["pack_checkout"]). `eventID` is the attempt id the call site already mints (else one is made here);
    // value is the TOTAL charged (base + GST, rupees); nothing about the person. The Premium pass tap is unchanged.
    const attemptId = ctx.attemptId || newCheckoutAttemptId();
    rememberCheckoutAttempt(attemptId); // SERVER-EVENTS-1: the order-create body carries it, so the server InitiateCheckout reuses this eventID
    const sendMeta = !metaCheckoutSent.has(attemptId);
    if (sendMeta) metaCheckoutSent.add(attemptId);
    const total = typeof details.valueInr === "number" && Number.isFinite(details.valueInr) && details.valueInr > 0 ? priceWithGst(details.valueInr) : null;
    const meta = { currency: CHECKOUT_CURRENCY, ...(total === null ? {} : { value: total }), content_ids: [details.sku], content_type: "product" };
    sendAnalyticsHit(
      "event",
      { name: "pack_checkout", data: { ...money, sku: details.sku, ...who } },
      { ga4: { ...money, sku: details.sku, ...who }, ...(sendMeta ? { meta, metaEventId: attemptId } : {}) },
    );
    sendGa4Only("begin_checkout", { ...money, items: [packItem(details)], ...who });
  } catch {
    /* analytics must never break the page */
  }
}

/** Once per `transactionId`, ever in this browser (every tab). Call ONLY from the server-verified paid branch. */
export function trackPackPurchase(details: PackCheckoutDetails & { transactionId: string }): void {
  try {
    const id = details.transactionId;
    if (!id || purchaseSentMemory.has(id) || readPurchaseSent().includes(id)) return;
    rememberPurchaseSent(id);
    const money = packMoney(details);
    const where = purchaseSurface(details.sku);
    sendAnalyticsHit("event", { name: "pack_purchase", data: { ...money, sku: details.sku, ...where } }, { ga4: { ...money, sku: details.sku, ...where }, meta: { ...money, ...where }, metaEventId: id });
    sendGa4Only("purchase", {
      transaction_id: id,
      ...money,
      items: [packItem(details)],
      ...where,
    });
    sendAdsConversion(id, details.valueInr); // ADS-TAG-1: same moment as the GA4 purchase above
  } catch {
    /* analytics must never break the page */
  }
}

