/**
 * GST-EXCL-1 (review G2) - "what is charged must equal what was shown before payment", even on a device whose clock is
 * wrong or a tab rendered before 00:00 IST 7 Nov 2026.
 *
 * Every Pay/Buy label is computed in the browser from the device clock. The SERVER decides the charge from its own
 * clock and, from the GST cut-off, returns its breakup on the order (`gst`, `packCreditInr`). Before Razorpay opens,
 * every checkout path calls `confirmServerPrice(order)`:
 *   - the server charged base + GST, but this device either thinks it is still before the cut-off, or this page was
 *     opened before it (so a label on screen may still say the all-in price) -> ask, showing the corrected breakup;
 *   - otherwise (the normal case, and every order before the cut-off) -> no dialog, nothing changes.
 * Cancel = the student closed the checkout (`dismissed`); no money moves.
 *
 * ★ NO MODULE-LOAD CLOCK READ: the page's open time is `performance.timeOrigin` (navigation start), never `Date`.
 */
import { boardPassGstExclusive, formatInr, GST_EXCLUSIVE_FROM_MS, GST_RATE_PERCENT } from "../config/pricing";
import "./priceConfirm.css";

/** The server's breakup for an order created at/after the cut-off (whole rupees). */
export interface ServerGst {
  baseInr: number;
  gstInr: number;
  totalInr: number;
}

/** The price facts of a created order, as the server reported them. */
export interface ServerPricedOrder {
  amountPaise: number;
  gst?: ServerGst;
  packCreditInr?: number;
}

/** `{ gst, packCreditInr }` from an order response, kept only when they add up (never shown half-trusted). */
export function serverPriceFields(json: Record<string, unknown>): { gst?: ServerGst; packCreditInr?: number } {
  const g = json.gst as Record<string, unknown> | undefined;
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
  const out: { gst?: ServerGst; packCreditInr?: number } = {};
  if (g && typeof g === "object" && ok(g.baseInr) && ok(g.gstInr) && ok(g.totalInr) && g.baseInr + g.gstInr === g.totalInr) {
    out.gst = { baseInr: g.baseInr, gstInr: g.gstInr, totalInr: g.totalInr };
  }
  if (ok(json.packCreditInr) && json.packCreditInr > 0) out.packCreditInr = json.packCreditInr;
  return out;
}

/** When this page was opened (epoch ms), from the navigation timing - NaN when unknown (then we ask, to be safe). */
export function pageOpenedAtMs(): number {
  try {
    return typeof performance !== "undefined" && Number.isFinite(performance.timeOrigin) ? performance.timeOrigin : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

/** PURE. Must the student confirm the server's price before Razorpay opens? */
export function priceConfirmNeeded(order: ServerPricedOrder, nowMs: number, openedAtMs: number): boolean {
  // Only an order that ADDED GST can be dearer than a label on screen. (The reverse - a fast device clock showing a total
  // with GST while the server, before the cut-off, charges the all-in price - can only charge LESS than was shown, and
  // Razorpay shows that lower amount; no dialog, so a pre-cut-off order stays exactly as today.)
  if (!order.gst) return false;
  return !boardPassGstExclusive(nowMs) || !(openedAtMs >= GST_EXCLUSIVE_FROM_MS);
}

/** PURE. "Price now ₹1,917 + ₹345 GST (18%) = ₹2,262" (a credit is named), or "Price now ₹1,917". */
export function priceNowLine(order: ServerPricedOrder): string {
  const charged = formatInr(order.amountPaise / 100);
  if (!order.gst) return `Price now ${charged}`;
  const head = `Price now ${formatInr(order.gst.baseInr)} + ${formatInr(order.gst.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(order.gst.totalInr)}`;
  return order.packCreditInr ? `${head}, less your pack credit ${formatInr(order.packCreditInr)}: ${charged}` : head;
}

/**
 * PURE. The Razorpay checkout `description`: unchanged for an all-in order (every order before the GST cut-off, so it stays
 * byte-identical to today); for an order that ADDED GST, the server's own breakup is appended, so the Razorpay sheet names
 * the same figures the checkout step showed: "Board Pass till your boards · ₹1,917 + ₹345 GST (18%) = ₹2,262" (a pack
 * credit is named: "…, less pack credit ₹49: ₹2,213").
 */
export function razorpayDescription(description: string, order: ServerPricedOrder): string {
  if (!order.gst) return description;
  const head = `${formatInr(order.gst.baseInr)} + ${formatInr(order.gst.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(order.gst.totalInr)}`;
  const tail = order.packCreditInr ? `${head}, less pack credit ${formatInr(order.packCreditInr)}: ${formatInr(order.amountPaise / 100)}` : head;
  return `${description} \u00b7 ${tail}`;
}

/** PURE. The confirm button: "Pay ₹2,262" - exactly what Razorpay will ask for. */
export function priceConfirmPayLabel(order: ServerPricedOrder): string {
  return `Pay ${formatInr(order.amountPaise / 100)}`;
}

export const PRICE_CONFIRM_TITLE = "The price has been updated";
export const PRICE_CONFIRM_CANCEL = "Cancel";

/** The dialog. Resolves true on Pay, false on Cancel / Escape / a tap outside. */
function askPriceConfirm(order: ServerPricedOrder): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "lt-pc";
    overlay.setAttribute("data-testid", "price-confirm");
    const panel = document.createElement("div");
    panel.className = "lt-pc__panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "lt-pc-title");
    const title = document.createElement("h2");
    title.className = "lt-pc__title";
    title.id = "lt-pc-title";
    title.textContent = PRICE_CONFIRM_TITLE;
    const line = document.createElement("p");
    line.className = "lt-pc__line";
    line.setAttribute("data-testid", "price-confirm-line");
    line.textContent = priceNowLine(order);
    const pay = document.createElement("button");
    pay.type = "button";
    pay.className = "lt-pc__pay";
    pay.setAttribute("data-testid", "price-confirm-pay");
    pay.textContent = priceConfirmPayLabel(order);
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "lt-pc__cancel";
    cancel.setAttribute("data-testid", "price-confirm-cancel");
    cancel.textContent = PRICE_CONFIRM_CANCEL;
    panel.append(title, line, pay, cancel);
    overlay.append(panel);
    const done = (ok: boolean) => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(ok);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") done(false);
    };
    pay.addEventListener("click", () => done(true));
    cancel.addEventListener("click", () => done(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) done(false);
    });
    document.addEventListener("keydown", onKey);
    document.body.append(overlay);
    pay.focus();
  });
}

/**
 * Call right before Razorpay opens, on EVERY checkout path. True = go ahead (no dialog was needed, or the student
 * confirmed the corrected price); false = the student cancelled.
 */
export async function confirmServerPrice(order: ServerPricedOrder, nowMs?: number, openedAtMs?: number): Promise<boolean> {
  // An all-in order (every order before the cut-off) returns at once, without even reading the clock.
  if (!order.gst) return true;
  if (!priceConfirmNeeded(order, nowMs ?? Date.now(), openedAtMs ?? pageOpenedAtMs())) return true;
  return askPriceConfirm(order);
}
