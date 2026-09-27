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

/** Z6 — the owner's failure sentence, word for word. */
export const PAYMENT_FAILED_COPY = "Payment didn't go through. You haven't been charged twice — try again.";

/** Z6 — shown after a verified grant, from the server's `passEnd`. */
export function premiumActiveUntilCopy(dateLabel: string): string {
  return `Premium is active until ${dateLabel}`;
}

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
  | { status: "paid"; passEnd: string }
  | { status: "dismissed" }
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
 * The whole purchase: order -> Razorpay's checkout -> server verify. Never throws;
 * every failure is `{ status: "failed" }`, and closing the checkout is `dismissed`.
 */
export async function buyPass(passType: PassType, deps: BuyDeps = DEFAULT_DEPS): Promise<BuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(passType), deps.loadScript()]);
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
    if (!success) return { status: "dismissed" };
    const { passEnd } = await deps.verify(success);
    return { status: "paid", passEnd };
  } catch {
    return { status: "failed" };
  }
}
