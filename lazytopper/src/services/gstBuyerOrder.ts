/**
 * GST-INVOICE-1 - the tiny, import-free door the order functions use. With VITE_GST_STATE_FIELD off (the default) it
 * returns {} at once: no chunk is loaded, no request is made and the order body is byte-identical to before. On, it loads
 * the "Your state" dialog (./gstBuyer) on demand.
 */
import type { GstBuyer } from "./gstBuyer";

/** The client switch, read synchronously, so a call site with the flag off adds not even an await (timing is unchanged too). */
export function gstStateFieldOn(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_GST_STATE_FIELD;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/*
 * GST-INVOICE-2a (review 2a) - the Pay button, captured IN THE CLICK HANDLER. A capture-phase `click` listener records
 * the button the buyer pressed, before any surface handler runs (and so before a surface disables Pay while busy, which
 * moves focus off it). The "Your state" dialog returns focus to it on close. Installed ONLY with VITE_GST_STATE_FIELD on:
 * with the flag off nothing is added to the page.
 */
const PRESS_MAX_AGE_MS = 15000;
let lastPress: { el: HTMLElement; at: number } | null = null;
/** An elapsed-time reading (monotonic; not the calendar clock - only "how long ago was Pay pressed"). */
const tick = (): number => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : 0);
function recordPress(e: Event): void {
  const t = e.target;
  if (typeof Element === "undefined" || !(t instanceof Element)) return;
  const hit = t.closest("button, [role='button'], a[href], input[type='submit'], input[type='button']");
  // A press INSIDE the dialog (Continue / Cancel / Change toggles) is not an opener.
  if (hit instanceof HTMLElement && !hit.closest(".lt-gst")) lastPress = { el: hit, at: tick() };
}
let pressListening = false;
/** Arms the click capture (idempotent). Called at import when the flag is on; exported for tests. */
export function armPressCapture(): void {
  if (pressListening || typeof document === "undefined") return;
  pressListening = true;
  document.addEventListener("click", recordPress, true);
}
/** The button pressed within the last 15 s that is still on the page, or null. */
export function recentPress(): HTMLElement | null {
  if (!lastPress || tick() - lastPress.at > PRESS_MAX_AGE_MS || !lastPress.el.isConnected) return null;
  return lastPress.el;
}
/** Test seam. */
export function resetPressForTests(): void {
  lastPress = null;
}
if (gstStateFieldOn()) armPressCapture();

/**
 * GST-AFTER-PAY-1 (owner 13 Nov 2026): NO state + PIN step before Razorpay on any checkout. The order body carries no `gstBuyer`
 * (the server still accepts one from an old tab). The buyer gives state + PIN on the paid screen instead (components/gstInvoice/
 * PostPayGst). Kept as the one door every order function calls, so a future pre-pay field has one place to go.
 */
export async function gstBuyerOrderFields(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _authHeaders: Record<string, string> | (() => Promise<Record<string, string>>) | null = null,
): Promise<{ gstBuyer?: GstBuyer }> {
  return {};
}

/** True for the buyer closing the "Your state" dialog: every buy function treats it as "dismissed", never "failed". */
export function isGstBuyerCancelled(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { name?: unknown }).name === "GstBuyerCancelledError";
}
