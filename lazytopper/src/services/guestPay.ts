/**
 * guestPay — the browser half of "Pay now with your phone number" (PAY-PHONE-1, owner 2 Nov 2026).
 *
 * ★★ DARK BY DEFAULT. `isGuestPayClientEnabled()` is false unless BOTH build flags `VITE_PAYMENTS_ENABLED` and
 * `VITE_GUEST_PAY_ENABLED` are on. The server has its own pair (PAYMENTS_ENABLED + GUEST_PAY_ENABLED).
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT MONEY OR ACCESS. It sends a SKU (+ target) and the typed number; the server
 * prices the order. After Razorpay's signed success the server verifies the payment and records it as "paid, not yet
 * claimed" — nothing is granted to anyone. The purchase attaches only when an account whose VERIFIED Firebase token
 * carries the same phone number calls `claimGuestPurchases()` (the server reads the number from the token, never
 * from here: the claim sends an empty body).
 *
 * ★ PRIVACY. The number never goes into a URL, an analytics event or storage. It travels to the sign-in page in
 * react-router's in-memory navigation state only.
 */
import { loadCheckoutScript, watchPaymentFailed, type RazorpayConstructor, type RazorpaySuccess } from "./checkout";
import { ALSO_SIGNIN_EVENT, type AlsoSignIn } from "./checkoutWhoFlag";
import { maskIndianMobile, normaliseIndianMobile } from "../lib/maskContact";

export const GUEST_ORDER_ENDPOINT = "/api/pay/guest/order";
export const GUEST_VERIFY_ENDPOINT = "/api/pay/guest/verify";
export const GUEST_CLAIM_ENDPOINT = "/api/pay/guest/claim";
/** Fired on `window` after a claim attached at least one purchase, so open pages re-read what the student owns. */
export const GUEST_CLAIMED_EVENT = "lazytopper:guest-claimed";

/**
 * PACK-READY-1 - what a claim attached, for the "Your pack is ready" banner / toast. Names and SKUs only: never a phone number,
 * an order id or a payment id. `name` is the display name ("Maths + Science Bundle", "Board Pass"); a chapter pack's chapter label is
 * added by the screen that shows it (the slug is `target`).
 */
export interface ClaimedItem {
  kind: "pack" | "pass";
  sku: string;
  target: string | null;
  name: string;
}
export interface GuestClaimedDetail {
  count: number;
  items: ClaimedItem[];
}

/** The display name of a claimed purchase. PURE and import-free (this module stays tiny). */
export function claimedItemName(kind: "pack" | "pass", sku: string, target: string | null): string {
  if (kind === "pass") return "Board Pass";
  const subject = target === "science" ? "Science" : "Maths";
  switch (sku) {
    case "pack_chapter":
      return "Chapter Pack";
    case "pack_mock":
      return `Mock Pack \u00b7 ${subject}`;
    case "pack_subject":
      return `Subject Pack \u00b7 ${subject}`;
    case "pack_cbq":
      return `${subject} CBQ Pack`;
    case "pack_bundle":
      return "Maths + Science Bundle";
    default:
      return "PDF pack";
  }
}

/** The most recent claim, kept so a page that mounts AFTER the event (the sign-in lands on /packs) can still say "ready". */
let recentClaim: { uid: string; items: ClaimedItem[]; at: number } | null = null;
const RECENT_CLAIM_MS = 10 * 60 * 1000;
// performance.now(), not the wall clock: this is an elapsed-time window, and it keeps the clock-guard out of every test that mounts My packs.
const elapsedNow = (): number => performance.now();
/** Only for the SAME account that claimed: a different signed-in uid (shared device) never sees another buyer's claim. */
export function readRecentClaim(uid: string, now: number = elapsedNow()): ClaimedItem[] {
  return uid && recentClaim && recentClaim.uid === uid && now - recentClaim.at <= RECENT_CLAIM_MS ? recentClaim.items : [];
}

function readFlag(name: "payments" | "guest"): string {
  try {
    // Literal `import.meta.env.VITE_…` expressions, so Vite and Vitest both rewrite them.
    const raw: unknown = name === "payments" ? import.meta.env.VITE_PAYMENTS_ENABLED : import.meta.env.VITE_GUEST_PAY_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

export function isGuestPayClientEnabled(): boolean {
  const on = (v: string) => /^(1|true|on|yes)$/i.test(v);
  return on(readFlag("payments")) && on(readFlag("guest"));
}

/* CODE-WHERE-1: normaliseIndianMobile + maskIndianMobile moved to lib/maskContact (import-free, so the sign-in screens can
 * show where a code went without pulling this module); re-exported here so every existing import keeps working. */
export { maskIndianMobile, normaliseIndianMobile };

/** The 10 digits the sign-in page's +91 field takes, or "". */
export function tenDigits(raw: string | null | undefined): string {
  const n = normaliseIndianMobile(raw);
  return n ? n.slice(3) : "";
}

export type GuestItem =
  | { kind: "pass"; sku: "till_boards"; label: string; description: string }
  | { kind: "pack"; sku: string; target?: string; label: string; description: string };

export type GuestBuyOutcome =
  /** The server verified the payment and recorded it for this number. `confirmed: false`: Razorpay signed a success
   *  but our verify did not answer (the webhook records it) — the student is still told to sign in with the number. */
  | { status: "paid"; confirmed: boolean; phoneMasked: string; phone: string; amountInr?: number; paymentId?: string }
  | { status: "dismissed" }
  | { status: "already_paid"; phoneMasked: string; phone: string }
  /** Owner ruling 2 Nov 2026: this number already has a LazyTopper account - sign in with it instead of paying as a guest. */
  | { status: "account_exists"; phoneMasked: string; phone: string }
  | { status: "invalid_phone" }
  | { status: "failed" };

interface GuestOrder {
  orderId: string;
  keyId: string;
  amountPaise: number;
}

class GuestPayError extends Error {
  readonly code: "already_paid" | "account_exists" | "invalid_phone" | "failed";
  constructor(code: "already_paid" | "account_exists" | "invalid_phone" | "failed") {
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
  // Review fix 4: the server's refusal is deliberately generic (it does not say whether this number has a purchase).
  if (res.status === 409 && parsed && parsed.error === "payment_unavailable") throw new GuestPayError("already_paid");
  if (res.status === 409 && parsed && parsed.error === "account_exists") throw new GuestPayError("account_exists");
  if (parsed && parsed.reason === "invalid_phone") throw new GuestPayError("invalid_phone");
  throw new GuestPayError("failed");
}

/** Exported for tests; the default `buyAsGuest` path. */
export async function createGuestOrder(item: GuestItem, phone: string): Promise<GuestOrder> {
  const json = await postJson(GUEST_ORDER_ENDPOINT, {
    sku: item.sku,
    ...(item.kind === "pack" && item.target ? { target: item.target } : {}),
    phone,
  });
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") {
    throw new GuestPayError("failed");
  }
  return { orderId, keyId, amountPaise };
}

async function verifyGuestPayment(success: RazorpaySuccess): Promise<void> {
  await postJson(GUEST_VERIFY_ENDPOINT, {
    orderId: success.razorpay_order_id,
    paymentId: success.razorpay_payment_id,
    signature: success.razorpay_signature,
  });
}

export interface GuestBuyDeps {
  createOrder: (item: GuestItem, phone: string) => Promise<GuestOrder>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (success: RazorpaySuccess) => Promise<void>;
}

const DEFAULT_DEPS: GuestBuyDeps = {
  createOrder: createGuestOrder,
  loadScript: () => loadCheckoutScript(),
  verify: verifyGuestPayment,
};

/**
 * Order (server-priced) -> Razorpay with the number prefilled and READ-ONLY -> server verify. Never throws.
 */
export async function buyAsGuest(item: GuestItem, rawPhone: string, deps: GuestBuyDeps = DEFAULT_DEPS): Promise<GuestBuyOutcome> {
  const phone = normaliseIndianMobile(rawPhone);
  if (!phone) return { status: "invalid_phone" };
  const phoneMasked = maskIndianMobile(phone);
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(item, phone), deps.loadScript()]);
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
        // The number the visitor typed (normalised here); the server never echoes it back (review fix 6).
        prefill: { contact: phone },
        readonly: { contact: true },
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
      // Razorpay SIGNED a success: never "didn't go through". The webhook records the payment for this number.
      confirmed = false;
    }
    return {
      status: "paid",
      confirmed,
      phoneMasked,
      phone,
      ...(amountInr !== undefined ? { amountInr } : {}),
      ...(paymentId !== undefined ? { paymentId } : {}),
    };
  } catch (e) {
    if (e instanceof GuestPayError && e.code === "already_paid") return { status: "already_paid", phoneMasked, phone };
    if (e instanceof GuestPayError && e.code === "account_exists") return { status: "account_exists", phoneMasked, phone };
    if (e instanceof GuestPayError && e.code === "invalid_phone") return { status: "invalid_phone" };
    return { status: "failed" };
  }
}

export interface ClaimedPurchase {
  orderId: string;
  kind: "pack" | "pass";
  sku: string;
  target: string | null;
}

/**
 * CHECKOUT-WHO-1 - a claim attached an order that ALSO named a phone this account does not sign in with: the server says so,
 * MASKED (`alsoSignIn`), and Home offers the existing link-a-number step (LinkPhoneNudge -> LinkSignInMethodModal, SMS code).
 * Fired on `window`; also kept (for THIS uid only) for a Home that mounts after the event. Never the full number.
 */
export { ALSO_SIGNIN_EVENT, type AlsoSignIn };
let lastClaimAlso: AlsoSignIn | null = null;
/** PAY-ACCOUNT-1: the server said THIS claim is the first sign-in of an account made at payment (its sign-up). */
let lastClaimFirstSignIn: { trialStarted: boolean } | null = null;
/** ...kept for THIS uid until AuthContext takes it (to count the sign-up, once). */
let pendingFirstSignIn: { uid: string; trialStarted: boolean } | null = null;
let pendingAlso: { uid: string; also: AlsoSignIn } | null = null;

function parseAlso(raw: unknown): AlsoSignIn | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // CHECKOUT-WHO-2: a missing phone OR a missing (verified) email.
  return (r.kind === "phone" || r.kind === "email") && typeof r.masked === "string" && r.masked ? { kind: r.kind, masked: r.masked } : null;
}

/** The pending "also sign in" for THIS account only, or null. */
export function readAlsoSignIn(uid: string): AlsoSignIn | null {
  return uid && pendingAlso && pendingAlso.uid === uid ? pendingAlso.also : null;
}
export function clearAlsoSignIn(): void {
  pendingAlso = null;
}

/**
 * Attach every purchase paid with the signed-in account's VERIFIED phone number (CHECKOUT-WHO-1: or its VERIFIED email,
 * read by the server from the token). Sends nothing but the ID token
 * (empty body). Never throws: a failure returns null and the next sign-in tries again.
 */
export async function claimGuestPurchases(): Promise<ClaimedPurchase[] | null> {
  try {
    const { authHeaders } = await import("./checkout");
    const json = await postJson(GUEST_CLAIM_ENDPOINT, {}, await authHeaders());
    lastClaimAlso = parseAlso(json.alsoSignIn);
    lastClaimFirstSignIn = json.firstSignIn === true ? { trialStarted: json.trialStarted === true } : null;
    const list = Array.isArray(json.claimed) ? json.claimed : [];
    return list
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({
        orderId: String(x.orderId || ""),
        kind: x.kind === "pack" ? ("pack" as const) : ("pass" as const),
        sku: String(x.sku || ""),
        target: typeof x.target === "string" ? x.target : null,
      }));
  } catch {
    return null;
  }
}

/** Once per uid per page session: the uids a claim has already SUCCEEDED for (a failure leaves the uid out, so it retries). */
const claimedThisSession = new Set<string>();
const inFlight = new Map<string, Promise<ClaimedPurchase[] | null>>();

/**
 * Claim once per session for this uid. On a claim that attached something, fires GUEST_CLAIMED_EVENT on window.
 * `force` (after the post-payment sign-in) runs it even if this session already claimed.
 */
export function claimOncePerSession(uid: string, opts: { force?: boolean; claim?: () => Promise<ClaimedPurchase[] | null> } = {}): Promise<ClaimedPurchase[] | null> {
  if (!uid) return Promise.resolve(null);
  if (!opts.force && claimedThisSession.has(uid)) return Promise.resolve([]);
  const running = inFlight.get(uid);
  if (running) return running;
  // Review fix 1: a NEW account's sign-up trial write must settle before the claim can grant a pass on top of it.
  const p = (async () => {
    try {
      const { whenTrialWriteSettled } = await import("./subscriptionService");
      await whenTrialWriteSettled(uid);
    } catch {
      /* nothing in flight */
    }
    return (opts.claim || claimGuestPurchases)();
  })()
    .then((claimed) => {
      if (claimed !== null) claimedThisSession.add(uid);
      // CHECKOUT-WHO-1: remember / announce the masked "also sign in with" for THIS uid (absent on every old-flow claim).
      const also = lastClaimAlso;
      lastClaimAlso = null;
      // PAY-ACCOUNT-1 - the account was made at payment, so THIS first sign-in is its sign-up. The server said so ONCE
      // (transaction-marked: never on a reload or a later sign-in, never for a client-made account) and, in that same
      // transaction, started the sign-up trial by activateTrial's rules (review LOW 5: a lost response cannot lose it).
      // Here: re-read the subscription so the trial shows, and keep the sign-up for AuthContext to count (once).
      const firstSignIn = lastClaimFirstSignIn;
      lastClaimFirstSignIn = null;
      if (firstSignIn) {
        pendingFirstSignIn = { uid, trialStarted: firstSignIn.trialStarted };
        if (firstSignIn.trialStarted) void showServerTrial(uid);
      }
      if (also) {
        pendingAlso = { uid, also };
        try {
          window.dispatchEvent(new CustomEvent(ALSO_SIGNIN_EVENT, { detail: also }));
        } catch {
          /* no window (tests / SSR) */
        }
      }
      if (claimed && claimed.length > 0) {
        const items: ClaimedItem[] = claimed.map((c) => ({ kind: c.kind, sku: c.sku, target: c.target, name: claimedItemName(c.kind, c.sku, c.target) }));
        recentClaim = { uid, items, at: elapsedNow() };
        try {
          const detail: GuestClaimedDetail = { count: claimed.length, items };
          window.dispatchEvent(new CustomEvent(GUEST_CLAIMED_EVENT, { detail }));
        } catch {
          /* no window (tests / SSR) */
        }
        // PACK-READY-1 - tell the buyer on any page except /packs (its own banner) and the sign-in page. Lazy: not in the entry chunk.
        void import("../components/packs/PackReadyToast")
          .then((m) => {
            // The import resolves later: in tests the DOM may already be torn down ("window is not defined").
            if (typeof window === "undefined" || typeof document === "undefined") return;
            m.showPackReadyToast(items, uid);
          })
          .catch(() => undefined);
      }
      return claimed;
    })
    .finally(() => inFlight.delete(uid));
  inFlight.set(uid, p);
  return p;
}

/** PAY-ACCOUNT-1 - the server started this account's sign-up trial: re-read it so it shows, and count it. Never throws. */
async function showServerTrial(uid: string): Promise<void> {
  try {
    const sub = await import("./subscriptionService");
    await sub.hydrateSubscriptionFromCloud(uid);
    const { trackNamedEvent } = await import("../analytics/analytics");
    trackNamedEvent("trial_start");
  } catch {
    /* the next hydration shows it */
  }
}

/**
 * PAY-ACCOUNT-1 - the first sign-in of an account made at payment, for THIS uid, ONCE (taking it clears it). AuthContext
 * counts it as the sign-up (sign_up, the visit source, the new-account landing), as a normal sign-up would.
 */
export function takeFirstSignIn(uid: string): { trialStarted: boolean } | null {
  if (!uid || !pendingFirstSignIn || pendingFirstSignIn.uid !== uid) return null;
  const taken = { trialStarted: pendingFirstSignIn.trialStarted };
  pendingFirstSignIn = null;
  return taken;
}

/** Test seam. */
export function resetGuestClaimSessionForTests(): void {
  claimedThisSession.clear();
  inFlight.clear();
  recentClaim = null;
  lastClaimAlso = null;
  lastClaimFirstSignIn = null;
  pendingFirstSignIn = null;
  pendingAlso = null;
}

/** Router state the sign-in page reads to open the phone step with this number (never a URL). */
export interface GuestSigninState {
  guestPayPhone?: string;
  phoneFirst?: boolean;
  /** GUEST-SIGNIN-RETURNING-1 - this sign-in follows a "this number already has an account" moment: open the phone step on "Already have an account". */
  guestPayExisting?: true;
}
