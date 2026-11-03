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
  packIsAdminHit,
  purchaseSentMemory,
  readPurchaseSent,
  rememberPurchaseSent,
  sendAdsConversion,
  sendAnalyticsHit,
  sendGa4Hit,
} from "../../analytics/analytics";

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

/** Where a `pack_view` happened (PRICING-ONE-1): the /packs page or the packs section of /pricing. */
export type PackViewSurface = "packs" | "pricing";

/** `pack_view` (page opened) and `pack_download` (a file saved). `sku` is the pack kind, never an id. `surface` (pack_view only) says which page. */
export function trackPackEvent(name: "pack_view" | "pack_download", sku?: PackSkuName, surface?: PackViewSurface): void {
  try {
    const data: Record<string, string> = { ...(sku ? { sku } : {}), ...(surface ? { surface } : {}) };
    const has = Object.keys(data).length > 0;
    sendAnalyticsHit("event", { name, ...(has ? { data } : {}) }, has ? { ga4: data } : {});
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * `pack_ready_shown` (PACK-READY-1): the "Your pack is ready" banner (My packs) or toast (any other page) was shown after a pay-by-phone
 * claim. `sku` is the pack kind (or `board_pass`), `surface` is `banner` | `toast`. Nothing about the person is attached.
 */
export function trackPackReadyShown(sku: string, surface: "banner" | "toast"): void {
  try {
    const data = { sku, surface };
    sendAnalyticsHit("event", { name: "pack_ready_shown", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * `pack_sample_download` (PACK-SAMPLE-1): a visitor tapped "Free sample page". `pack` is `<sku>:<target>` (e.g. `pack_cbq:science`),
 * `surface` says where the link was. Sent for signed-out visitors too: nothing about the person is attached.
 */
export function trackPackSampleDownload(pack: string, surface: string): void {
  try {
    const data = { pack, surface };
    sendAnalyticsHit("event", { name: "pack_sample_download", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/** PACKS-CONVERT-1: where a checkout tap came from, when it is not a plain Buy. */
export type PackCheckoutFrom = "sample";

/**
 * `pack_checkout` at the Buy TAP. BUY-PATH-1: `signedIn` (when given) adds `signed_in` to the first-party / Vercel / GA4
 * data, so a signed-out tap (sent before the branch to sign-in or pay-by-phone) is told apart from a signed-in one.
 */
export function trackPackCheckout(details: PackCheckoutDetails, ctx: { signedIn?: boolean; resumed?: boolean; from?: PackCheckoutFrom } = {}): void {
  try {
    const money = packMoney(details);
    // BUY-PATH-1 review: `resumed: true` marks a checkout started AUTOMATICALLY after sign-in (the ?buy= resume), so a funnel can
    // drop it and not count the sign-in-first visitor twice. The event is never suppressed.
    const who = {
      ...(typeof ctx.signedIn === "boolean" ? { signed_in: ctx.signedIn } : {}),
      ...(ctx.resumed ? { resumed: true } : {}),
      // PACKS-CONVERT-1: `from: "sample"` marks a Buy tapped on the "Liked the sample?" button that follows a free-sample download.
      ...(ctx.from ? { from: ctx.from } : {}),
    };
    sendAnalyticsHit("event", { name: "pack_checkout", data: { ...money, sku: details.sku, ...who } }, { ga4: { ...money, sku: details.sku, ...who } });
    sendGa4Only("begin_checkout", { ...money, items: [packItem(details)], ...who });
  } catch {
    /* analytics must never break the page */
  }
}

/** Once per `transactionId`, ever in this tab. Call ONLY from the server-verified paid branch. */
export function trackPackPurchase(details: PackCheckoutDetails & { transactionId: string }): void {
  try {
    const id = details.transactionId;
    if (!id || purchaseSentMemory.has(id) || readPurchaseSent().includes(id)) return;
    rememberPurchaseSent(id);
    const money = packMoney(details);
    sendAnalyticsHit("event", { name: "pack_purchase", data: { ...money, sku: details.sku } }, { ga4: { ...money, sku: details.sku }, meta: money });
    sendGa4Only("purchase", {
      transaction_id: id,
      ...money,
      items: [packItem(details)],
    });
    sendAdsConversion(id, details.valueInr); // ADS-TAG-1: same moment as the GA4 purchase above
  } catch {
    /* analytics must never break the page */
  }
}

