/**
 * checkout — the browser half of buying a pass (RAZORPAY-1).
 *
 * ★★ DARK BY DEFAULT (Z1). `isPaymentsClientEnabled()` is false unless the build env
 * `VITE_PAYMENTS_ENABLED` is on; while it is false nothing here runs and the pricing
 * page renders exactly as before.
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT MONEY OR ACCESS. It asks the server for an
 * order (the server prices it), hands Razorpay's own checkout the order the server
 * created, and sends Razorpay's signed result back to the server to verify. Premium is
 * shown as active ONLY from the `passEnd` the server's grant returns — there is no
 * client-side activation anywhere in this file.
 *
 * ★ checkout.js IS LOADED ONLY ON THE BUY CLICK (Z3), from Razorpay's own origin, once.
 */

/** The two passes the server sells (server/services/passGrant.cjs PASS_TYPES). */
export type PassType = "month" | "till_boards";

/** Razorpay's hosted checkout script. The only third-party script this flow loads. */
export const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export const PAY_ORDER_ENDPOINT = "/api/pay/order";
export const PAY_VERIFY_ENDPOINT = "/api/pay/verify";
/** PAY-STATUS-1 — "is my payment through?" for the caller's OWN order (auth required). */
export const PAY_STATUS_ENDPOINT = "/api/pay/status";

/** Z6 — the owner's failure sentence, word for word. */
export const PAYMENT_FAILED_COPY = "Payment didn't go through. You haven't been charged twice — try again.";

/** Z6 — shown after a verified grant, from the server's `passEnd`. */
export function premiumActiveUntilCopy(dateLabel: string): string {
  return `Premium is active until ${dateLabel}`;
}

/**
 * PAY-RECOVER-1 — shown while the server is asked about an order Razorpay already signed as
 * paid. Never the failure sentence once a signed success exists.
 */
export const PAYMENT_CHECKING_COPY = "Checking your payment…";

/**
 * PAY-RECOVER-1 (owner decision D4) — Razorpay signed a success but the server could not
 * confirm it yet. Premium still comes only from the server (verify, webhook or status).
 */
export const PAYMENT_STILL_CONFIRMING_COPY =
  "We're still confirming your payment with your bank. If money left your account, Premium turns on automatically — you won't be charged twice.";

/** Z10 — shown in the buy area first when a pass is already running. */
export function premiumAlreadyActiveCopy(dateLabel: string): string {
  return `Premium is already active until ${dateLabel}.`;
}

/**
 * ⚠ Read as a LITERAL `import.meta.env.VITE_…` expression, on purpose: Vite (build) and
 * Vitest (stubEnv) both rewrite that exact text; an aliased access would read undefined
 * in the production bundle. Under plain Node `import.meta.env` is undefined — "" here.
 */
function readPaymentsFlag(): string {
  try {
    const raw: unknown = import.meta.env.VITE_PAYMENTS_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

/** Z1 — the CLIENT switch. Same truthy grammar as the server's `PAYMENTS_ENABLED`. */
export function isPaymentsClientEnabled(): boolean {
  return /^(1|true|on|yes)$/i.test(readPaymentsFlag());
}

/** "27 October 2026" — the IST calendar date of an instant, or null if unreadable. */
export function formatPassDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export interface PayOrder {
  orderId: string;
  keyId: string;
  amountPaise: number;
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: "INR";
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open(): void;
}

export type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

type WindowWithRazorpay = Window & { Razorpay?: RazorpayConstructor };

let scriptPromise: Promise<RazorpayConstructor> | null = null;

/**
 * Z3 — inject checkout.js once and resolve Razorpay's constructor. Called only from the
 * buy click; a failed load is forgotten so the next click can retry.
 */
export function loadCheckoutScript(doc: Document = document): Promise<RazorpayConstructor> {
  const win = doc.defaultView as WindowWithRazorpay | null;
  if (win && typeof win.Razorpay === "function") return Promise.resolve(win.Razorpay);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const ctor = (doc.defaultView as WindowWithRazorpay | null)?.Razorpay;
      if (typeof ctor === "function") resolve(ctor);
      else reject(new Error("checkout.js loaded without Razorpay"));
    };
    script.onerror = () => reject(new Error("checkout.js failed to load"));
    doc.head.appendChild(script);
  }).catch((e: unknown) => {
    scriptPromise = null;
    throw e;
  });
  return scriptPromise;
}

/** Test seam: forget a loaded script promise. */
export function resetCheckoutScriptForTests(): void {
  scriptPromise = null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { authClient } = await import("./firebaseClient");
  const current = authClient?.currentUser ?? null;
  if (!current) throw new Error("signed-out");
  const token = await current.getIdToken().catch(() => null);
  if (!token) throw new Error("signed-out");
  return { Authorization: `Bearer ${token}` };
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (!res.ok || !parsed || parsed.ok !== true) throw new Error(`request failed: ${res.status}`);
  return parsed;
}

/** Z2 — the server prices and creates the order. Only the pass TYPE is sent. */
export async function createPayOrder(passType: PassType): Promise<PayOrder> {
  const json = await postJson(PAY_ORDER_ENDPOINT, { passType });
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") {
    throw new Error("malformed order");
  }
  return { orderId, keyId, amountPaise };
}

/** Z4 — the server verifies and grants. Returns the grant's `passEnd`. */
export async function verifyPayment(success: RazorpaySuccess): Promise<{ passEnd: string }> {
  const json = await postJson(PAY_VERIFY_ENDPOINT, {
    orderId: success.razorpay_order_id,
    paymentId: success.razorpay_payment_id,
    signature: success.razorpay_signature,
  });
  if (typeof json.passEnd !== "string") throw new Error("verified without a passEnd");
  return { passEnd: json.passEnd };
}

export type BuyOutcome =
  | {
      status: "paid";
      passEnd: string;
      /** FOLLOWUPS-1 A4 — Razorpay's payment id (from its signed result). Analytics only. */
      paymentId?: string;
      /** FOLLOWUPS-1 A4 — the SERVER order's amount in rupees (amountPaise / 100). Analytics only. */
      amountInr?: number;
    }
  | { status: "dismissed" }
  /**
   * PAY-RECOVER-1 — Razorpay's handler returned a SIGNED success but the server's verify
   * errored (network, timeout, 5xx, a rejection). The money may well have left the account,
   * so this is never `failed`: the caller asks `checkPayStatus(orderId)` instead.
   */
  | { status: "pending"; orderId: string; paymentId?: string }
  | { status: "failed" };

export interface BuyDeps {
  createOrder: typeof createPayOrder;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: typeof verifyPayment;
}

const DEFAULT_DEPS: BuyDeps = {
  createOrder: createPayOrder,
  loadScript: () => loadCheckoutScript(),
  verify: verifyPayment,
};

/**
 * The whole purchase: order -> Razorpay's checkout -> server verify. Never throws.
 * Order-creation / script-load failures are `{ status: "failed" }`; closing the checkout is
 * `dismissed`; a verify error AFTER Razorpay's signed success is `pending` (PAY-RECOVER-1).
 */
export async function buyPass(passType: PassType, deps: BuyDeps = DEFAULT_DEPS): Promise<BuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(passType), deps.loadScript()]);
    // PAY-RECOVER-1 — remember THIS tab's open order (an order id, never premium state).
    writePayPending(order.orderId);
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        // The amount is the SERVER's order amount — the checkout charges the order.
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: passType === "month" ? "Premium pass for a month" : "Premium pass till your boards",
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
      });
      checkout.open();
    });
    // PAY-RECOVER-1 — the marker is KEPT on dismiss: a UPI app can finish after the sheet closes.
    if (!success) return { status: "dismissed" };
    // FOLLOWUPS-1 A4 — additive, read AFTER the verify: neither value is sent anywhere here.
    const paymentId = typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    let passEnd: string;
    try {
      ({ passEnd } = await deps.verify(success));
    } catch {
      // PAY-RECOVER-1 — past this line Razorpay has SIGNED a success: whatever the verify
      // error, the honest state is "still checking", never "didn't go through".
      return { status: "pending", orderId: order.orderId, ...(paymentId !== undefined ? { paymentId } : {}) };
    }
    clearPayPending(order.orderId);
    const amountInr = Number.isFinite(order.amountPaise) && order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    return {
      status: "paid",
      passEnd,
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
    };
  } catch {
    return { status: "failed" };
  }
}

/* ── PAY-RECOVER-1 · the pending-order marker and the status check ───────────── */

/**
 * sessionStorage key: `{ orderId, at, checks }` for the order THIS tab last opened a checkout
 * for. An order id and a counter — never a tier, a trial or a passEnd. Registered in
 * studentDataMap.ts. Cleared on paid / a server `paid`, and ignored (and removed) after 30 min.
 */
export const PAY_PENDING_KEY = "lazytopper.payPending";

/** The marker is forgotten after this long. */
export const PAY_PENDING_TTL_MS = 30 * 60 * 1000;

/**
 * `/api/pay/status` shares the `payments` rate budget (20 soft / 60 hard a day) with order
 * and verify, so ONE order may cost at most this many status calls in this tab — across
 * the post-checkout polls, "Check again" and the return-to-tab refresh together.
 */
export const MAX_STATUS_CHECKS_PER_ORDER = 6;

export interface PayPendingMarker {
  orderId: string;
  at: number;
  checks: number;
}

function sessionStore(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function writeMarker(marker: PayPendingMarker): void {
  try {
    sessionStore()?.setItem(PAY_PENDING_KEY, JSON.stringify(marker));
  } catch {
    /* storage blocked: recovery falls back to the webhook + the next hydrate */
  }
}

export function writePayPending(orderId: string, now: number = Date.now()): void {
  writeMarker({ orderId, at: now, checks: 0 });
}

/** The live marker, or null. An expired or unreadable marker is removed. */
export function readPayPending(nowMs?: number): PayPendingMarker | null {
  const store = sessionStore();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(PAY_PENDING_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  // The wall clock is read only when a marker exists (its expiry is a wall-clock 30 minutes).
  const now = nowMs ?? Date.now();
  try {
    const parsed = JSON.parse(raw) as Partial<PayPendingMarker>;
    const ok =
      typeof parsed.orderId === "string" &&
      parsed.orderId.length > 0 &&
      typeof parsed.at === "number" &&
      Number.isFinite(parsed.at) &&
      now - parsed.at <= PAY_PENDING_TTL_MS &&
      parsed.at <= now + 60_000;
    if (ok) {
      const checks = typeof parsed.checks === "number" && Number.isFinite(parsed.checks) ? parsed.checks : 0;
      return { orderId: parsed.orderId as string, at: parsed.at as number, checks };
    }
  } catch {
    /* fall through: remove */
  }
  clearPayPending();
  return null;
}

/** Remove the marker — only when it is for `orderId`, if one is given. */
export function clearPayPending(orderId?: string): void {
  const store = sessionStore();
  if (!store) return;
  try {
    if (orderId !== undefined) {
      const raw = store.getItem(PAY_PENDING_KEY);
      if (raw) {
        try {
          if ((JSON.parse(raw) as { orderId?: unknown }).orderId !== orderId) return;
        } catch {
          /* unreadable: remove it */
        }
      }
    }
    store.removeItem(PAY_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export type PayStatusResult =
  | { state: "paid"; passEnd: string; paymentId?: string; amountInr?: number }
  | { state: "pending" }
  /** Razorpay unreachable, the request failed, or this tab's status budget is spent. */
  | { state: "unknown" };

/**
 * Spend one of the order's status calls. False once MAX_STATUS_CHECKS_PER_ORDER are spent.
 * An order with no live marker (expired, other tab) gets a fresh in-memory count of one.
 */
function takeStatusCheck(orderId: string): boolean {
  const marker = readPayPending();
  if (!marker || marker.orderId !== orderId) return true;
  if (marker.checks >= MAX_STATUS_CHECKS_PER_ORDER) return false;
  writeMarker({ ...marker, checks: marker.checks + 1 });
  return true;
}

/** How many status calls this order still has in this tab. */
export function statusChecksLeft(orderId: string): number {
  const marker = readPayPending();
  if (!marker || marker.orderId !== orderId) return MAX_STATUS_CHECKS_PER_ORDER;
  return Math.max(0, MAX_STATUS_CHECKS_PER_ORDER - marker.checks);
}

export interface PayStatusDeps {
  post: (url: string, body: unknown) => Promise<Record<string, unknown>>;
}

const DEFAULT_STATUS_DEPS: PayStatusDeps = { post: postJson };

/**
 * PAY-STATUS-1 route: `POST /api/pay/status { orderId }` ->
 * `{ ok, state: "paid", passEnd, paymentId, amountInr } | { ok, state: "pending" } | { ok, state: "unknown" }`.
 * Never throws. Premium is believed only from the server's `passEnd` (CLAUDE.md §5).
 */
export async function checkPayStatus(orderId: string, deps: PayStatusDeps = DEFAULT_STATUS_DEPS): Promise<PayStatusResult> {
  if (!orderId) return { state: "unknown" };
  if (!takeStatusCheck(orderId)) return { state: "unknown" };
  let json: Record<string, unknown>;
  try {
    json = await deps.post(PAY_STATUS_ENDPOINT, { orderId });
  } catch {
    return { state: "unknown" };
  }
  if (json.state === "paid" && typeof json.passEnd === "string" && json.passEnd) {
    clearPayPending(orderId);
    const paymentId = typeof json.paymentId === "string" && json.paymentId ? json.paymentId : undefined;
    const amountInr = typeof json.amountInr === "number" && Number.isFinite(json.amountInr) && json.amountInr > 0 ? json.amountInr : undefined;
    return {
      state: "paid",
      passEnd: json.passEnd,
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
    };
  }
  if (json.state === "pending") return { state: "pending" };
  return { state: "unknown" };
}
