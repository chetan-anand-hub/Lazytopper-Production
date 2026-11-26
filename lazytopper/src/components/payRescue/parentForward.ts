/**
 * parentForward - PARENT-PAY-FIRST-1 (owner ruling 26 Nov 2026).
 *
 * Production: ~80% of the Razorpay orders opened are closed without a payment attempt, mostly by a student who cannot pay
 * alone. After the sheet is closed, the FIRST action is now "Send to Mummy/Papa on WhatsApp", then a QR the parent can scan,
 * then "Try paying again".
 *
 *   Signed in  -> the existing per-account parent-pay link (server-minted, 72 h, single use; PaywallActions). Nothing new here.
 *   Signed out -> there is no account to bind a link to (the server mints only for a verified uid), so the message carries the
 *                 PRODUCT PAGE. The parent pays there signed out (pay-first) and the "Who will use it?" step (AttachFlow) puts
 *                 the purchase on the child's number. The page URL is tagged utm_source=parent_forward so it can be measured.
 *                 Copy never promises a single-use link to a guest: it is only a page.
 *
 * Nothing here touches an order, a price the server charges, or access. The guest message NEVER quotes a rupee figure (a page link
 * outlives any price): it says "one-time payment" and the page shows the live price.
 *
 * Kill switch: VITE_PARENT_PAY_FIRST_DISABLED=1 -> every surface exactly as before this lane.
 */
import { trackOnboardingEvent } from "../../analytics/analytics";
import { inAppRescueUrl } from "../../utils/inAppPay";

declare module "../../analytics/analytics" {
  interface OnboardingEventParams {
    parent_forward_shown: { signed_in: "true" | "false"; product: string };
    parent_forward_clicked: { signed_in: "true" | "false"; product: string };
    parent_forward_qr_shown: { signed_in: "true" | "false"; product: string };
  }
}

export const PARENT_FORWARD_LABEL = "Send to Mummy/Papa on WhatsApp";
export const PARENT_FORWARD_QR_LABEL = "Show QR for parent to scan";
export const PARENT_FORWARD_HEADING = "Can't pay right now?";
export const PARENT_FORWARD_LINE = "Most parents pay for their child. Send this to Mummy or Papa and they can pay on their phone.";
export const PARENT_FORWARD_WA_BLOCKED = "WhatsApp didn't open. Tap the button again, or use the link below.";
export const PARENT_FORWARD_WA_FALLBACK = "Open WhatsApp";
export const PARENT_FORWARD_QR_ALT = "QR code for your parent to scan and pay";
export const PARENT_FORWARD_QR_NOTE = "Your parent scans this with their phone camera to open the payment page.";
export const PARENT_FORWARD_QR_FAILED = "Couldn't draw the QR. Send it on WhatsApp instead.";

/** Where a guest's parent lands, tagged for measurement. */
export const PARENT_FORWARD_UTM = "utm_source=parent_forward&utm_medium=whatsapp&utm_campaign=pay_rescue";

export function isParentPayFirstDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_PARENT_PAY_FIRST_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

export type ParentForwardProduct = "board_pass" | "test_series" | "pack";
export interface ParentForwardItem {
  kind: "pass" | "pack";
  sku: string;
  target?: string;
  /** The product's display name ("Board Pass", "Test Series", "Chapter Pack"). */
  label: string;
}

export function forwardProductOf(item: ParentForwardItem): ParentForwardProduct {
  if (item.kind === "pass") return "board_pass";
  return item.sku === "test_series" ? "test_series" : "pack";
}

/** The page URL a guest's parent opens (this site; the same product; tagged). */
export function parentForwardUrl(item: ParentForwardItem, origin: string, base = "/"): string {
  const b = base.replace(/\/+$/, "");
  const path = item.kind === "pack" && item.sku === "test_series" ? "/test-series" : "/pricing";
  const page = `${origin}${b}${path}?${PARENT_FORWARD_UTM}`;
  if (path === "/test-series") return page;
  // The same ?buy= arrival the in-app rescue uses (PassCheckout / PacksShop read it, signed out too): the parent lands on this product.
  const buy = item.kind === "pass" ? { kind: "pass" as const } : { kind: "pack" as const, sku: item.sku, ...(item.target ? { target: item.target } : {}) };
  return inAppRescueUrl(page, buy) ?? page;
}

/**
 * The guest's message. `flow: "attach"` - the parent pays, then enters the child's number (CheckoutSheet's pay-first). `"number"` - the
 * older number-first guest sheet: the parent enters the child's number, then pays. No promise of a single-use link.
 */
export function buildParentForwardMessage({ name, url, flow }: { name: string; url: string; flow: "attach" | "number" }): string {
  // Never a rupee figure: the message is a non-expiring page link, forwarded and read days later (possibly after the 1 Dec price
  // switch). The page the parent opens shows the live price.
  const cost = "It's a one-time payment; the page shows the price.";
  const how =
    flow === "number"
      ? "Open this, enter my mobile number when it asks, and pay with your UPI or card:"
      : "Open this, pay with your UPI or card, then enter my mobile number so it opens on my account:";
  return `Hi Mummy/Papa, can you help me pay for the ${name} on LazyTopper? ${cost} ${how}\n${url}`;
}

type Which = "shown" | "clicked" | "qr_shown";
export function trackParentForward(which: Which, signedIn: boolean, product: string): void {
  const data = { signed_in: signedIn ? ("true" as const) : ("false" as const), product };
  try {
    if (which === "shown") trackOnboardingEvent("parent_forward_shown", data);
    else if (which === "clicked") trackOnboardingEvent("parent_forward_clicked", data);
    else trackOnboardingEvent("parent_forward_qr_shown", data);
  } catch {
    /* analytics must never break a payment screen */
  }
}
