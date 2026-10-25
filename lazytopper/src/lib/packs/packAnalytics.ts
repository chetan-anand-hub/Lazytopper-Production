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
  sendAnalyticsHit,
  sendGa4Hit,
} from "../../analytics/analytics";

export type PackSkuName = "pack_chapter" | "pack_mock" | "pack_subject" | "pack_bundle";

export interface PackCheckoutDetails {
  sku: PackSkuName;
  itemName: string;
  /** Rupees. null when unknown: the event is sent without a value. */
  valueInr: number | null;
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

/** `pack_view` (page opened) and `pack_download` (a file saved). `sku` is the pack kind, never an id. */
export function trackPackEvent(name: "pack_view" | "pack_download", sku?: PackSkuName): void {
  try {
    sendAnalyticsHit("event", { name, ...(sku ? { data: { sku } } : {}) }, sku ? { ga4: { sku } } : {});
  } catch {
    /* analytics must never break the page */
  }
}

export function trackPackCheckout(details: PackCheckoutDetails): void {
  try {
    const money = packMoney(details);
    sendAnalyticsHit("event", { name: "pack_checkout", data: { ...money, sku: details.sku } }, { ga4: { ...money, sku: details.sku } });
    sendGa4Only("begin_checkout", { ...money, items: [{ item_id: details.sku, item_name: details.itemName }] });
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
      items: [{ item_id: details.sku, item_name: details.itemName }],
    });
  } catch {
    /* analytics must never break the page */
  }
}

