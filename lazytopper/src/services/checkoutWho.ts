/**
 * checkoutWho — the browser half of "Who will use it?" (CHECKOUT-WHO-1, owner 3 Nov 2026).
 *
 * ★★ DARK BY DEFAULT. `isCheckoutWhoClientEnabled()` is false unless the build flag `VITE_CHECKOUT_WHO_ENABLED` is on; the
 * server has its own switch (CHECKOUT_WHO_ENABLED + PAYMENTS_ENABLED). BOTH are needed. Off, no caller mounts the sheet and
 * every Pay / Buy behaves exactly as before.
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT MONEY OR ACCESS. It sends a SKU (+ target) and the recipient the payer typed (a
 * mobile number and/or an email); the server validates both, prices the order, verifies the payment, and attaches it
 * (to an existing account for that phone / email, or at that person's first verified sign-in).
 *
 * ★ PRIVACY. What the payer typed never goes into a URL, an analytics event or storage. The server only ever echoes it
 * MASKED. For a purchase for SOMEONE ELSE the recipient is never prefilled as the Razorpay payer contact (the payer gives
 * their own for the receipt).
 */
import { loadCheckoutScript, watchPaymentFailed, type RazorpayConstructor, type RazorpaySuccess } from "./checkout";
import { GUEST_ORDER_ENDPOINT, GUEST_VERIFY_ENDPOINT, maskIndianMobile, normaliseIndianMobile, type GuestItem } from "./guestPay";

export { isCheckoutWhoClientEnabled } from "./checkoutWhoFlag";

/* ── copy (owner prototype Checkout-Flow, 3 Nov 2026) ─────────────────────────── */

export const WHO_TITLE = "Who will use it?";
export const WHO_FIELD_LABEL = "Mobile number or email they sign in with";
export const WHO_ADD_EMAIL = "+ Add their email too (optional)";
export const WHO_ADD_MOBILE = "+ Add their mobile too (optional)";
export const WHO_SOMEONE_ELSE = "Buying for someone else?";
export const WHO_BAD_FIRST = "Enter a 10-digit Indian mobile number or an email address.";
export const WHO_BAD_EMAIL = "Enter a full email address, like name@gmail.com.";
export const WHO_BAD_MOBILE = "Enter a 10-digit Indian mobile number.";
export const WHO_FAILED = "We couldn't start the payment. You have not been charged. Please try again.";
export const WHO_CLOSED = "Payment window closed. Tap Pay to try again.";
/** Generic on purpose: the same words whatever the reason (nothing says whether a purchase exists for it). */
export const WHO_UNAVAILABLE = "We couldn't start a payment for this. If it was paid for before, sign in with it to get the purchase.";
export const WHO_EMAILED = "We've emailed this to them too.";
export const WHO_HAVE_ACCOUNT = "Have an account? Sign in first";

/** "For: you · an••••@gmail.com" (the signed-in student's own masked email or phone). */
export function selfLine(masked: string | null): string {
  return masked ? `For: you · ${masked}` : "For: you";
}

/** "Pay ₹1,917 for 98765 43210" — the Pay button repeats back EXACTLY what was typed (trimmed). Nothing typed: "Pay ₹1,917". */
export function payReadBack(priceDisplay: string, typed: string): string {
  const t = typed.trim();
  return t ? `Pay ${priceDisplay} for ${t}` : `Pay ${priceDisplay}`;
}

/** The success line (owner wording). `ids` are MASKED. */
export function paidLine(kind: GuestItem["kind"], ids: readonly string[]): string {
  const who = ids.filter(Boolean).join(" or ");
  return kind === "pack" ? `Sign in with ${who} and open My packs to download.` : `Sign in with ${who} — the Board Pass is already there.`;
}

/** "That account already has the Board Pass till the boards." — says nothing beyond what the payer typed. */
export function alreadyCoveredLine(kind: GuestItem["kind"]): string {
  return kind === "pack" ? "The account for this already has this pack. Nothing to pay." : "The account for this already has the Board Pass till the boards. Nothing to pay.";
}

/* ── detection / normalisation (mirrors server/services/guestPay.cjs) ─────────── */

const EMAIL_SHAPE = /^[^\s@<>()",;:]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** An email as the claim key (trimmed, lower-cased), or null. */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e && e.length <= 254 && EMAIL_SHAPE.test(e) ? e : null;
}

/** `an••••@gmail.com`; not an email -> "". */
export function maskEmail(raw: string | null | undefined): string {
  const e = normaliseEmail(raw);
  if (!e) return "";
  const at = e.indexOf("@");
  return `${e.slice(0, Math.min(2, at))}••••${e.slice(at)}`;
}

export type IdKind = "phone" | "email";

/**
 * What one box holds: an `@` or any letter -> an email; digits (with spaces, dashes, a leading +91 / 0) -> a mobile.
 * `value` is the normalised form when valid (E.164 phone / lower-cased email), else null. Empty -> kind null.
 */
export function detectIdentifier(raw: string): { kind: IdKind | null; value: string | null } {
  const t = (raw || "").trim();
  if (!t) return { kind: null, value: null };
  if (t.includes("@") || /[a-z]/i.test(t)) return { kind: "email", value: normaliseEmail(t) };
  return { kind: "phone", value: normaliseIndianMobile(t) };
}

export interface Recipient {
  phone?: string;
  email?: string;
  first: IdKind;
}

/** The two boxes -> the recipient the server is sent, or null when the first is invalid or the second is filled but invalid. */
export function readRecipient(first: string, second: string): Recipient | null {
  const a = detectIdentifier(first);
  if (!a.kind || !a.value) return null;
  const b = second.trim() ? detectIdentifier(second) : { kind: null, value: null };
  if (second.trim() && (b.kind === a.kind || !b.value)) return null;
  const phone = a.kind === "phone" ? a.value : b.kind === "phone" ? b.value : null;
  const email = a.kind === "email" ? a.value : b.kind === "email" ? b.value : null;
  return { ...(phone ? { phone } : {}), ...(email ? { email } : {}), first: a.kind };
}

/** The masked identifiers, first-entered first. */
export function maskedIds(r: Recipient): string[] {
  const p = r.phone ? maskIndianMobile(r.phone) : "";
  const e = r.email ? maskEmail(r.email) : "";
  return (r.first === "email" ? [e, p] : [p, e]).filter(Boolean);
}

/* ── the purchase ─────────────────────────────────────────────────────────────── */

export type WhoBuyOutcome =
  /** `confirmed: false`: Razorpay signed a success but our verify did not answer (the webhook records it). */
  | { status: "paid"; confirmed: boolean; amountInr?: number; paymentId?: string }
  | { status: "dismissed" }
  | { status: "already_covered" }
  | { status: "unavailable" }
  | { status: "invalid" }
  | { status: "failed" };

interface WhoOrder {
  orderId: string;
  keyId: string;
  amountPaise: number;
}

class WhoError extends Error {
  readonly code: "already_covered" | "unavailable" | "invalid" | "failed";
  constructor(code: "already_covered" | "unavailable" | "invalid" | "failed") {
    super(code);
    this.code = code;
  }
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (res.ok && parsed && parsed.ok === true) return parsed;
  if (res.status === 409 && parsed && parsed.error === "already_covered") throw new WhoError("already_covered");
  if (res.status === 409 && parsed && parsed.error === "payment_unavailable") throw new WhoError("unavailable");
  if (parsed && parsed.reason === "invalid_recipient") throw new WhoError("invalid");
  throw new WhoError("failed");
}

/** Exported for tests. The body carries the SKU (+ target) and the recipient; never an amount. */
export async function createWhoOrder(item: GuestItem, recipient: Recipient, signedIn: boolean): Promise<WhoOrder> {
  let headers: Record<string, string> = {};
  if (signedIn) {
    // A signed-in payer buying for someone else: the server records the payer (verified token) - never the recipient's.
    const { authHeaders } = await import("./checkout");
    headers = await authHeaders().catch(() => ({}));
  }
  const json = await postJson(
    GUEST_ORDER_ENDPOINT,
    {
      sku: item.sku,
      ...(item.kind === "pack" && item.target ? { target: item.target } : {}),
      recipient: { ...(recipient.phone ? { phone: recipient.phone } : {}), ...(recipient.email ? { email: recipient.email } : {}), first: recipient.first },
    },
    headers,
  );
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") throw new WhoError("failed");
  return { orderId, keyId, amountPaise };
}

async function verifyWhoPayment(success: RazorpaySuccess): Promise<void> {
  await postJson(GUEST_VERIFY_ENDPOINT, {
    orderId: success.razorpay_order_id,
    paymentId: success.razorpay_payment_id,
    signature: success.razorpay_signature,
  });
}

export interface WhoBuyDeps {
  createOrder: (item: GuestItem, recipient: Recipient, signedIn: boolean) => Promise<WhoOrder>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (success: RazorpaySuccess) => Promise<void>;
}

const DEFAULT_DEPS: WhoBuyDeps = {
  createOrder: createWhoOrder,
  loadScript: () => loadCheckoutScript(),
  verify: verifyWhoPayment,
};

/**
 * The Razorpay prefill for a recipient purchase. A signed-in payer buying for SOMEONE ELSE: nothing (the payer gives their
 * own contact for the receipt). Signed out: what was typed, as today's pay-by-phone prefill but EDITABLE (a parent paying
 * for a child can put their own number for the receipt).
 */
export function whoPrefill(recipient: Recipient, signedIn: boolean): { prefill?: { contact?: string; email?: string } } {
  if (signedIn) return {};
  const prefill = { ...(recipient.phone ? { contact: recipient.phone } : {}), ...(recipient.email ? { email: recipient.email } : {}) };
  return prefill.contact || prefill.email ? { prefill } : {};
}

/** Order (server-priced) -> Razorpay -> server verify. Never throws. */
export async function buyForRecipient(item: GuestItem, recipient: Recipient, signedIn: boolean, deps: WhoBuyDeps = DEFAULT_DEPS): Promise<WhoBuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(item, recipient, signedIn), deps.loadScript()]);
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: item.description,
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
        ...whoPrefill(recipient, signedIn),
      });
      watchPaymentFailed(checkout, () => undefined);
      checkout.open();
    });
    if (!success) return { status: "dismissed" };
    const amountInr = order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    const paymentId = typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    let confirmed = true;
    try {
      await deps.verify(success);
    } catch {
      confirmed = false; // Razorpay SIGNED a success: never "didn't go through"; the webhook records it.
    }
    return { status: "paid", confirmed, ...(amountInr !== undefined ? { amountInr } : {}), ...(paymentId !== undefined ? { paymentId } : {}) };
  } catch (e) {
    if (e instanceof WhoError && e.code !== "failed") return { status: e.code };
    return { status: "failed" };
  }
}

/* ── after a claim: "Also sign in with <masked>?" ─────────────────────────────── */

// The pending "also sign in" itself lives with the claim (services/guestPay: readAlsoSignIn; the event name in checkoutWhoFlag).
export { ALSO_SIGNIN_EVENT, readAlsoSignIn, clearAlsoSignIn, type AlsoSignIn } from "./guestPay";

export { alsoSignInLine } from "./checkoutWhoFlag";
