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
import { maskEmail, normaliseEmail } from "./checkoutWhoFlag";
import { GUEST_ORDER_ENDPOINT, GUEST_VERIFY_ENDPOINT, maskIndianMobile, normaliseIndianMobile, type GuestItem } from "./guestPay";
import { confirmServerPrice, serverPriceFields, razorpaySheetDescription } from "./priceConfirm";
import { gstBuyerOrderFields, gstStateFieldOn, isGstBuyerCancelled } from "./gstBuyerOrder";
import { isCheckoutSelfClientEnabled } from "./checkoutWhoFlag";
import { waOptInOrderFields } from "./waOptIn";
import { orderSourceFields } from "../analytics/visitSource";

export { isCheckoutWhoClientEnabled, isPayAutoAccountClientEnabled, isCheckoutSelfClientEnabled } from "./checkoutWhoFlag";

/* ── copy (owner prototype Checkout-Flow, 3 Nov 2026) ─────────────────────────── */

export const WHO_TITLE = "Who will use it?";
// PAY-ACCOUNT-1 addendum B (owner 4 Nov 2026): so a parent does not type their OWN details.
export const WHO_FIELD_LABEL = "Student's mobile number or email";
export const WHO_FIELD_HELP = "The one your child will log in with \u2014 not yours. Razorpay asks for your own details for the receipt.";
// PARENTS-PAY-1 (owner 4 Nov 2026): opened FROM /for-parents only. Many children have no phone, so any number or email works.
export const WHO_PARENT_FIELD_LABEL = "Mobile number or email your child will sign in with";
export const WHO_PARENT_FIELD_HELP = "It can be your own number if your child uses your phone \u2014 they sign in with it. Or use an email.";
export const WHO_SECOND_EMAIL_LABEL = "Student's email (optional)";
export const WHO_SECOND_MOBILE_LABEL = "Student's mobile number (optional)";
export const WHO_ADD_EMAIL = "+ Add their email too (optional)";
export const WHO_ADD_MOBILE = "+ Add their mobile too (optional)";
export const WHO_SOMEONE_ELSE = "Buying for someone else?";
export const WHO_BAD_FIRST = "Enter a 10-digit Indian mobile number or an email address.";
export const WHO_BAD_EMAIL = "Enter a full email address, like name@gmail.com.";
export const WHO_BAD_MOBILE = "Enter a 10-digit Indian mobile number.";
export const WHO_FAILED = "We couldn't start the payment. You have not been charged. Please try again.";
export const WHO_CLOSED = "Payment window closed. Tap Pay to try again.";
/** Generic on purpose: the same words whatever the reason (nothing says whether a purchase exists for it). */
/**
 * CHECKOUT-WHO-2 - ONE generic line for every "cannot sell this to that recipient right now" (already covered, or a payment
 * already waiting for them): it never says whether an account exists (owner-reviewed wording).
 */
export const WHO_UNAVAILABLE = "This can't be bought for that number or email right now. If the student already has it, they can sign in to check.";
export const WHO_EMAILED = "We've emailed this to them too.";
export const WHO_HAVE_ACCOUNT = "Have an account? Sign in first";

/* ── CHECKOUT-SELF-2 (owner 11 Nov 2026): signed out, "Buy for yourself" comes first ─────────────────────────── */
export const SELF_TITLE = "Buy for yourself";
export const SELF_HELP = "Pay first. Then sign in with the same mobile number or email you give at payment to open it.";
/** Razorpay itself asks for the mobile number (and email); LazyTopper reads them from the verified payment, never from this page. */
export const SELF_PAID_NO_CONTACT =
  "We couldn't read a mobile number or email from your payment, so we can't open it for you automatically. Your payment is safe: message us on WhatsApp and we will attach it to your account.";
export const SELF_PAID_UNCONFIRMED = "We are still confirming it with the payment provider. Sign in with the mobile number or email you paid with; it will be there.";

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

/** CHECKOUT-WHO-2: kept for callers; the same generic line as WHO_UNAVAILABLE (nothing account-revealing). */
export function alreadyCoveredLine(_kind: GuestItem["kind"]): string {
  return WHO_UNAVAILABLE;
}

/* ── SELFPAY-ATTACH-1 (owner 12 Nov 2026): pay first, then "who will use it?" - copy follows the approved mock-up ─────── */

/**
 * ON whenever "Buy for yourself" is; VITE_CHECKOUT_SELF_ATTACH_DISABLED=1 restores the previous flow (the order carries no
 * `attach` marker, so the server delivers at payment as before). The server has its own switch (CHECKOUT_SELF_ATTACH_DISABLED).
 */
export function isSelfAttachClientEnabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_CHECKOUT_SELF_ATTACH_DISABLED;
    return isCheckoutSelfClientEnabled() && !/^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** SELFPAY-ATTACH-1: the choose-who endpoint (kept here: this lane may not edit services/guestPay.ts). */
export const GUEST_ATTACH_ENDPOINT = "/api/pay/guest/attach";
/** The server holds a paid attach order for 10 minutes (owner: "make it 10 mins"); the screen's timer is only the screen. */
export const ATTACH_HOLD_MS = 10 * 60 * 1000;
export const ATTACH_BEFORE_PAY = "After paying, you'll choose who uses it: you or someone else.";
export const attachWhoTitle = (kind: GuestItem["kind"]): string => (kind === "pack" ? "Who will use this pack?" : "Who will use this Board Pass?");
export const ATTACH_ME = "Me";
export const ATTACH_ME_SUB = "I'm the student";
export const ATTACH_OTHER = "My child / someone else";
export const ATTACH_OTHER_SUB = "We'll put it on their mobile or email";
/** `masked` = the paid-with number / email, already masked. */
export const attachHoldNote = (masked: string, isPhone: boolean): string =>
  `If you don't choose in 10 minutes, it goes on ${masked}, the ${isPhone ? "number" : "email"} you paid with. You can sign in with ${isPhone ? "that number" : "that email"}.`;
export const ATTACH_ME_TITLE = "Put it on this number?";
export const attachMeLine = (what: string, masked: string, isPhone: boolean): string => `We'll put your ${what} on ${masked}, the ${isPhone ? "number" : "email"} you paid with.`;
export const ATTACH_ME_YES = "Yes, that's me";
export const ATTACH_ME_DIFFERENT = "Use a different mobile or email";
export const attachMeFine = (isPhone: boolean): string => `You'll sign in with this ${isPhone ? "number" : "email"} to use it.`;
export const ATTACH_ME_FORM_TITLE = "Which mobile or email is yours?";
export const ATTACH_ME_FORM_LABEL = "Your mobile number or email";
export const ATTACH_OTHER_TITLE = "Who should get it?";
export const ATTACH_OTHER_PHONE_LABEL = "Their WhatsApp number";
export const ATTACH_OTHER_EMAIL_LABEL = "Their email";
export const ATTACH_USE_EMAIL = "Use their email instead";
export const ATTACH_USE_PHONE = "Use their WhatsApp number instead";
export const attachOtherLine = (what: string, isPhone: boolean): string => `We'll activate the ${what} on this ${isPhone ? "number" : "email"}. They sign in with it.`;
export const attachActivateLabel = (typed: string): string => (typed.trim() ? `Activate on ${typed.trim()}` : "Activate");
export const ATTACH_ANOTHER_TITLE = "Who should this one go to?";
export const ATTACH_ANOTHER_LABEL = "Another WhatsApp number or email";
export const ATTACH_ACTIVATE = "Activate";
export const attachAlreadyHasWarn = (masked: string, kind: GuestItem["kind"]): string =>
  kind === "pack" ? `${masked} already owns this pack.` : `${masked} already has the Board Pass till the boards.`;
/** BEFORE payment (the "someone else" box): the same plain answer, about the number / email just typed. */
export const alreadyHasLine = (kind: GuestItem["kind"], isEmail: boolean): string =>
  kind === "pack" ? `This ${isEmail ? "email" : "number"} already owns this pack.` : `This ${isEmail ? "email" : "number"} already has the Board Pass till the boards.`;
export const attachDoneOk = (what: string): string => `${what} activated \u2713`;
export const attachDoneTitle = (masked: string): string => `${masked} can sign in now`;
export const attachDoneLine = (isPhone: boolean): string => `They open LazyTopper and sign in with this ${isPhone ? "number" : "email"}. Everything is already there.`;
export const ATTACH_SEND_WHATSAPP = "Send them the link on WhatsApp";
export const ATTACH_DONE = "Done";
export const ATTACH_OPEN_TITLE = "Open your Board Pass";
export const attachFallbackTitle = (what: string, masked: string): string => `Your ${what} is on ${masked}`;
export const attachFallbackLine = (what: string, isPhone: boolean): string =>
  `This is the ${isPhone ? "number" : "email"} you paid with. Sign in with it to use the ${what}.`;
export const ATTACH_START = "Start";
export const attachCloseConfirm = (masked: string): string => `Your payment is safe. Sign in with ${masked} to use it.`;
export const ATTACH_FAILED = "We couldn't save that just now. Your payment is safe. Please try again.";
export const ATTACH_BAD_ID = "Enter a 10-digit Indian mobile number or an email address.";

/** Where an attach buyer lands: Home (Board Pass) or My packs, with the one-time welcome flag (?welcome=board_pass | pack). */
export function welcomeLandingPath(kind: GuestItem["kind"], desktop: boolean, packId?: string): string {
  // F5: the pack's id rides along (a catalogue id such as "pack_mock:maths" - not personal data) so the banner checks THAT pack.
  if (kind === "pack") return `/packs?from=pay&welcome=pack${packId && /^[a-z_]+:[a-z0-9_-]+$/i.test(packId) ? `&pack=${encodeURIComponent(packId)}` : ""}#my-packs`;
  // Mobile Home is /browse (RootEntry would drop the query on its redirect from "/").
  return desktop ? "/?welcome=board_pass" : "/browse?welcome=board_pass";
}

/**
 * F1: a sign-in DURING the hold claims nothing (the server holds the order), and the claim runs once per page session. So when the page
 * is still open at the hold's end and the user is signed in, run the claim once more, then re-read the subscription so Premium shows.
 * Never throws. Memory only: nothing is stored. Without a signed-in user this does nothing (the claim at sign-in works after the hold).
 */
export interface HoldEndDeps {
  uid: () => Promise<string>;
  claim: (uid: string) => Promise<Array<unknown> | null>;
  afterClaim: (uid: string) => Promise<void>;
  setTimer: (fn: () => void, ms: number) => unknown;
  now: () => number;
}
const DEFAULT_HOLD_END_DEPS: HoldEndDeps = {
  uid: async () => {
    const { authClient } = await import("./firebaseClient");
    const u = authClient?.currentUser as { uid?: string; isLocalSession?: boolean } | null | undefined;
    return u && u.uid && !u.isLocalSession ? u.uid : "";
  },
  claim: async (uid) => (await import("./guestPay")).claimOncePerSession(uid, { force: true }),
  afterClaim: async (uid) => {
    const { hydrateSubscriptionFromCloud } = await import("./subscriptionService");
    await hydrateSubscriptionFromCloud(uid);
  },
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  now: () => Date.now(),
};
export const HOLD_END_RETRY_MS = 60_000;
/**
 * `remainingMs` is the SERVER's remaining hold (a device clock may be wrong); absent -> holdUntilMs minus this device's clock.
 * If the first re-claim attaches nothing, it tries exactly once more 60 s later.
 */
export function scheduleHoldEndClaim(holdUntilMs: number, deps: HoldEndDeps = DEFAULT_HOLD_END_DEPS, remainingMs?: number): void {
  const remaining = typeof remainingMs === "number" && Number.isFinite(remainingMs) ? remainingMs : holdUntilMs - deps.now();
  if (!Number.isFinite(remaining)) return;
  // +2 s so the server clock is surely past the hold; capped so a bad value cannot park a timer for days.
  const wait = Math.min(Math.max(remaining, 0) + 2000, ATTACH_HOLD_MS + 60_000);
  const attempt = (retry: boolean) => {
    void (async () => {
      try {
        const uid = await deps.uid();
        if (!uid) return;
        const claimed = await deps.claim(uid);
        if (claimed && claimed.length > 0) await deps.afterClaim(uid);
        else if (!retry) deps.setTimer(() => attempt(true), HOLD_END_RETRY_MS);
      } catch {
        /* the next sign-in claims */
      }
    })();
  };
  deps.setTimer(() => attempt(false), wait);
}

export interface AttachProof {
  orderId: string;
  paymentId: string;
  signature: string;
}

export type AttachOutcome =
  | { status: "ok"; phoneMasked?: string; emailMasked?: string }
  | { status: "already_has" }
  | { status: "invalid" }
  | { status: "failed" };

/**
 * POST /api/pay/guest/attach - say who a PAID attach order is for. The proof is Razorpay's checkout signature, held in memory only
 * (never a URL, storage or an analytics event). `recipient` absent + choice "me" = the number / email read off the payment.
 */
export async function attachPayment(proof: AttachProof, choice: "me" | "other", recipient?: Recipient | null, fetchImpl: typeof fetch = fetch): Promise<AttachOutcome> {
  try {
    const res = await fetchImpl(GUEST_ATTACH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...proof,
        choice,
        ...(recipient ? { recipient: { ...(recipient.phone ? { phone: recipient.phone } : {}), ...(recipient.email ? { email: recipient.email } : {}), first: recipient.first } } : {}),
      }),
    });
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = (await res.json()) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
    if (res.ok && parsed && parsed.ok === true) {
      return {
        status: "ok",
        ...(typeof parsed.phoneMasked === "string" ? { phoneMasked: parsed.phoneMasked } : {}),
        ...(typeof parsed.emailMasked === "string" ? { emailMasked: parsed.emailMasked } : {}),
      };
    }
    if (res.ok && parsed && parsed.ok === false && parsed.reason === "already_has") return { status: "already_has" };
    if (parsed && parsed.reason === "invalid_recipient") return { status: "invalid" };
    return { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

/* ── PAID-SHOWS-1: the payer's receipt - "once somebody has paid, show them what they got" ─────────────────────────── */

export const GUEST_RECEIPT_ENDPOINT = "/api/pay/guest/receipt";
export const RECEIPT_PAYMENT_RECEIVED = "Payment received \u2713";
export const receiptPackTitle = (title: string): string => `Your ${title}`;
export const RECEIPT_PASS_TITLE = "Your Board Pass is active till your boards";
export const RECEIPT_LOADING = "Getting your purchase\u2026";
export const RECEIPT_PREPARING = "Preparing your files\u2026";
export const RECEIPT_FAILED = "We couldn't load it just now. Your payment is safe.";
export const RECEIPT_FILES_FAILED = "We couldn't prepare the files just now. Your payment is safe.";
export const RECEIPT_RETRY = "Try again";
export const RECEIPT_HIDE = "Hide";
/** Chosen recipient (or the buyer paid with this contact and nothing else was chosen - attach off): where the pack lives from now on. */
export const receiptSavedTo = (masked: string): string => `Saved to ${masked}. Sign in with it any time to download again.`;
/** The attach choice is still open: the files name the paid-with contact for now. */
export const receiptSavedToPending = (masked: string): string =>
  `For now it's saved to ${masked}, the one you paid with. If you choose someone else below, it moves to them. Sign in with it any time to download again.`;
export const receiptExpired = (masked: string): string => (masked ? `Sign in with ${masked} to download.` : "Sign in with the number or email you paid with to download.");

export interface ReceiptPack {
  packId: string;
  sku: string;
  target: string;
  paidAt: number;
  orderId: string;
}
export type ReceiptOutcome =
  | { status: "ok"; kind: "pack" | "pass"; attached: boolean; savedTo: string; pack?: ReceiptPack; licensee?: { name: string; email: string; phone?: string } }
  | { status: "expired"; savedTo: string }
  | { status: "failed" };

/** POST /api/pay/guest/receipt - proof = Razorpay's checkout signature (memory / this tab's sessionStorage only). Never throws. */
export async function fetchReceipt(proof: AttachProof, fetchImpl: typeof fetch = fetch): Promise<ReceiptOutcome> {
  try {
    const res = await fetchImpl(GUEST_RECEIPT_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(proof) });
    let j: Record<string, unknown> | null = null;
    try {
      j = (await res.json()) as Record<string, unknown>;
    } catch {
      j = null;
    }
    if (!res.ok || !j) return { status: "failed" };
    const savedTo = typeof j.savedTo === "string" ? j.savedTo : "";
    if (j.ok === false && j.reason === "expired") return { status: "expired", savedTo };
    const item = j.item as { kind?: unknown } | undefined;
    if (j.ok !== true || !item || (item.kind !== "pack" && item.kind !== "pass")) return { status: "failed" };
    const out: ReceiptOutcome = { status: "ok", kind: item.kind, attached: j.attached === true, savedTo };
    const p = j.pack as Partial<ReceiptPack> | undefined;
    if (item.kind === "pack" && p && typeof p.packId === "string" && typeof p.sku === "string" && typeof p.target === "string") {
      out.pack = { packId: p.packId, sku: p.sku, target: p.target, paidAt: typeof p.paidAt === "number" ? p.paidAt : 0, orderId: typeof p.orderId === "string" ? p.orderId : "" };
      const l = j.licensee as { name?: unknown; email?: unknown; phone?: unknown } | null | undefined;
      if (l && typeof l === "object") out.licensee = { name: typeof l.name === "string" ? l.name : "", email: typeof l.email === "string" ? l.email : "", ...(typeof l.phone === "string" ? { phone: l.phone } : {}) };
    }
    return out;
  } catch {
    return { status: "failed" };
  }
}

export { storeReceiptProof, readReceiptProof, clearReceiptProof } from "./paidReceiptProof";

/* ── PAY-ACCOUNT-1: the thank-you screen (the account is made at payment) ─────────── */

/**
 * Review MED 4 + re-review A/B: the thank-you line claims nothing the browser cannot know. It does not name an identifier:
 * the purchase may land on the account of the SECOND identifier (the first has none), and the verify answer is identical
 * either way on purpose (no enumeration), so the browser cannot tell which. "It's for me" therefore stays on the
 * first-entered identifier (accepted by review).
 */
export const ACCOUNT_LINE = "It goes onto the student's LazyTopper account.";
export const OPEN_FOR_ME = "It's for me \u2014 open it now";
export const SEND_TO_CHILD = "Send it to my child";
export const SEND_ME_LINK = "Send me the sign-in link";
export const CHECK_INBOX = "Check your inbox and tap the link to open LazyTopper.";
export const COPY_MESSAGE = "Copy message";
export const MESSAGE_COPIED = "Message copied";
/** The ONLY address the child is sent to: the plain sign-in page (never a number, an email or a token in it). */
export const CHILD_LOGIN_URL = "https://www.lazytopper.com/login";

/** Where the buyer lands once signed in: My packs for a pack, Home for the Board Pass. Fixed internal paths. */
/** SELF-PAY-LAND-1: My packs, marked `from=pay` so the trial-ended screen stays out of a just-paid buyer's way (trialAskRoutes). */
export const PAID_PACKS_LANDING = "/packs?from=pay#my-packs";

export function landingPath(kind: GuestItem["kind"]): string {
  return kind === "pack" ? PAID_PACKS_LANDING : "/";
}

/**
 * The message the payer sends the child. Names WHAT to sign in with ("your mobile number" / "your email"), never the value:
 * the child knows their own number, and nothing typed at checkout travels in a share.
 */
export function childShareText(product: string, recipient: Pick<Recipient, "phone" | "email" | "first">): string {
  const viaPhone = recipient.phone && (recipient.first === "phone" || !recipient.email);
  const how = viaPhone ? "your mobile number" : "your email";
  return `I've bought you ${product} on LazyTopper. Open ${CHILD_LOGIN_URL} and sign in with ${how} \u2014 it's already in your account.`;
}

/** WhatsApp share fallback: ONLY the message text (no phone number in the URL - doctrine; WhatsApp asks whom to send it to). */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/* ── detection / normalisation (mirrors server/services/guestPay.cjs) ─────────── */

export { maskEmail, normaliseEmail };

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
  | { status: "paid"; confirmed: boolean; amountInr?: number; paymentId?: string; orderId?: string; receipt?: AttachProof; gstProof?: AttachProof }
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
  // GST-INVOICE-1: the PAYER's state (a signed-in payer's remembered state is used without asking).
  const gst = gstStateFieldOn() ? await gstBuyerOrderFields(signedIn && headers.Authorization ? headers : null, { postPay: true }) : {}; // host: CheckoutSheet (paid / attach steps mount PostPayGst)
  const json = await postJson(
    GUEST_ORDER_ENDPOINT,
    {
      sku: item.sku,
      ...(item.kind === "pack" && item.target ? { target: item.target } : {}),
      recipient: { ...(recipient.phone ? { phone: recipient.phone } : {}), ...(recipient.email ? { email: recipient.email } : {}), first: recipient.first },
      ...gst,
      ...waOptInOrderFields(), // WHATSAPP-OPTIN-1: the payer's own number + tick, never the recipient's
      ...orderSourceFields(), // ORDER-SOURCE-1
    },
    headers,
  );
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") throw new WhoError("failed");
  return { orderId, keyId, amountPaise, ...serverPriceFields(json) };
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

/** PAID-SHOWS-1: Razorpay's signed proof of THIS payment, for the receipt card (memory / this tab only). */
function receiptOf(success: RazorpaySuccess): { receipt?: AttachProof } {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = success;
  return typeof orderId === "string" && orderId && typeof paymentId === "string" && paymentId && typeof signature === "string" && signature ? { receipt: { orderId, paymentId, signature } } : {};
}

/**
 * GST-AFTER-PAY-1: Razorpay's signed proof of THIS payment for the GST block ONLY - kept even when /verify failed (the server re-checks
 * the signature itself). It never shows the purchase card; that still needs a confirmed payment (`receipt`).
 */
function gstProofOf(success: RazorpaySuccess): { gstProof?: AttachProof } {
  const r = receiptOf(success).receipt;
  return r ? { gstProof: r } : {};
}

/** Order (server-priced) -> Razorpay -> server verify. Never throws. */
export async function buyForRecipient(item: GuestItem, recipient: Recipient, signedIn: boolean, deps: WhoBuyDeps = DEFAULT_DEPS): Promise<WhoBuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(item, recipient, signedIn), deps.loadScript()]);
    // GST-EXCL-1 (review G2): the server's price differs from what this device showed -> confirm it before Razorpay opens.
    if (!(await confirmServerPrice(order))) return { status: "dismissed" };
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: razorpaySheetDescription(item.description, order),
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
    return { status: "paid", confirmed, ...(confirmed ? receiptOf(success) : {}), ...gstProofOf(success), ...(amountInr !== undefined ? { amountInr } : {}), ...(paymentId !== undefined ? { paymentId } : {}), orderId: order.orderId };
  } catch (e) {
    if (isGstBuyerCancelled(e)) return { status: "dismissed" };
    if (e instanceof WhoError && e.code !== "failed") return { status: e.code };
    return { status: "failed" };
  }
}

/* ── CHECKOUT-SELF-2: "Buy for yourself" - no identifier typed; the server reads the buyer's contact from the verified payment ── */

export type SelfBuyOutcome =
  /** `contact`: the buyer's mobile / email as the server read them off the verified payment (null = nothing usable, or not confirmed). */
  | { status: "paid"; confirmed: boolean; contact: Recipient | null; amountInr?: number; paymentId?: string; orderId?: string; attach?: AttachProof; receipt?: AttachProof; gstProof?: AttachProof }
  | { status: "dismissed" }
  | { status: "unavailable" }
  | { status: "failed" };

export interface SelfBuyDeps {
  createOrder: (item: GuestItem) => Promise<WhoOrder>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (success: RazorpaySuccess) => Promise<Record<string, unknown>>;
  /** Test seam: schedules the one claim at the hold's end (F1). */
  scheduleHoldEnd?: (holdUntilMs: number, remainingMs?: number) => void;
}

/** Exported for tests. The body carries the SKU (+ target) and `self: true`; never an amount, an account phone or an email. WHATSAPP-OPTIN-1: plus `waOptIn` ({ phone, consent: true }) ONLY when the visitor typed a valid WhatsApp number AND ticked - it is not the account's contact. */
export async function createSelfOrder(item: GuestItem): Promise<WhoOrder> {
  const gst = gstStateFieldOn() ? await gstBuyerOrderFields(null, { postPay: true }) : {}; // host: CheckoutSheet (attach / paidSelf steps mount PostPayGst)
  const json = await postJson(GUEST_ORDER_ENDPOINT, { sku: item.sku, ...(item.kind === "pack" && item.target ? { target: item.target } : {}), self: true, ...(isSelfAttachClientEnabled() ? { attach: true } : {}), ...gst, ...waOptInOrderFields(), ...orderSourceFields() });
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") throw new WhoError("failed");
  return { orderId, keyId, amountPaise, ...serverPriceFields(json) };
}

async function verifySelfPayment(success: RazorpaySuccess): Promise<Record<string, unknown>> {
  return postJson(GUEST_VERIFY_ENDPOINT, {
    orderId: success.razorpay_order_id,
    paymentId: success.razorpay_payment_id,
    signature: success.razorpay_signature,
  });
}

/** The server's `selfContact` -> a Recipient, re-validated here (shape only; the server decided what it is). Null when unusable. */
export function readSelfContact(raw: unknown): Recipient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { phone?: unknown; email?: unknown; first?: unknown };
  const phone = typeof r.phone === "string" ? normaliseIndianMobile(r.phone) : null;
  const email = typeof r.email === "string" ? normaliseEmail(r.email) : null;
  if (!phone && !email) return null;
  return { ...(phone ? { phone } : {}), ...(email ? { email } : {}), first: phone && (r.first !== "email" || !email) ? "phone" : "email" };
}

const SELF_DEPS: SelfBuyDeps = { createOrder: createSelfOrder, loadScript: () => loadCheckoutScript(), verify: verifySelfPayment };

/** Order (server-priced, no identifier) -> Razorpay (no prefill: it asks the buyer) -> server verify -> the contact it read. Never throws. */
export async function buyForSelf(item: GuestItem, deps: SelfBuyDeps = SELF_DEPS): Promise<SelfBuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(item), deps.loadScript()]);
    if (!(await confirmServerPrice(order))) return { status: "dismissed" };
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: razorpaySheetDescription(item.description, order),
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
      });
      watchPaymentFailed(checkout, () => undefined);
      checkout.open();
    });
    if (!success) return { status: "dismissed" };
    const amountInr = order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    const paymentId = typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    let confirmed = true;
    let contact: Recipient | null = null;
    let attach: AttachProof | undefined;
    try {
      const verified = await deps.verify(success);
      contact = readSelfContact(verified.selfContact);
      // SELFPAY-ATTACH-1: the server says the choice of WHO is still open -> keep Razorpay's signature (memory only) to answer it.
      const open = verified.attach as { attached?: unknown; holdUntilMs?: unknown; holdRemainingMs?: unknown } | undefined;
      if (open && open.attached === false && typeof success.razorpay_signature === "string" && success.razorpay_signature) {
        if (typeof open.holdUntilMs === "number") (deps.scheduleHoldEnd || ((u, r) => scheduleHoldEndClaim(u, undefined, r)))(open.holdUntilMs, typeof open.holdRemainingMs === "number" ? open.holdRemainingMs : undefined);
        attach = { orderId: success.razorpay_order_id, paymentId: success.razorpay_payment_id, signature: success.razorpay_signature };
      }
    } catch {
      confirmed = false; // Razorpay SIGNED a success: never "didn't go through"; the webhook records it and reads the contact.
    }
    return { status: "paid", confirmed, contact, ...(attach ? { attach } : {}), ...(confirmed ? receiptOf(success) : {}), ...gstProofOf(success), ...(amountInr !== undefined ? { amountInr } : {}), ...(paymentId !== undefined ? { paymentId } : {}), orderId: order.orderId };
  } catch (e) {
    if (isGstBuyerCancelled(e)) return { status: "dismissed" };
    if (e instanceof WhoError && e.code !== "failed") return { status: e.code === "unavailable" || e.code === "already_covered" ? "unavailable" : "failed" };
    return { status: "failed" };
  }
}

/* ── after a claim: "Also sign in with <masked>?" ─────────────────────────────── */

// The pending "also sign in" itself lives with the claim (services/guestPay: readAlsoSignIn; the event name in checkoutWhoFlag).
export { ALSO_SIGNIN_EVENT, readAlsoSignIn, clearAlsoSignIn, type AlsoSignIn } from "./guestPay";

export { alsoSignInLine } from "./checkoutWhoFlag";
