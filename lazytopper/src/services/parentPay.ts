/**
 * parentPay — the browser half of parent pay (ASK-PARENTS-PAY-1): the link a student sends
 * with "Share QR code" / "Forward link to parents" (PAYWALL-PAY-1), and the parent's page.
 *
 * ★★ DARK BY DEFAULT. `isParentPayClientEnabled()` is false unless BOTH build flags
 * `VITE_PAYMENTS_ENABLED` and `VITE_PARENT_PAY_ENABLED` are on. The server has its own pair.
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT MONEY, ACCESS OR WHOSE ACCOUNT IS PAID FOR.
 *   - The signed-in child asks the server for a link (`/api/pay/parent-link`). The server
 *     binds it to the child's VERIFIED uid and returns an opaque token plus the child's
 *     server prices, which the WhatsApp message quotes.
 *   - The parent's page sends only that token (and a pass TYPE). The server resolves the
 *     child from the token, prices the order from the child's record, and grants the pass
 *     to the child after verifying Razorpay's signed result. No uid is ever sent from here.
 *
 * ★ THE TOKEN TRAVELS IN THE URL FRAGMENT (`/pricing#pp=<token>`): a fragment is never sent
 * to a server, never appears in a Referer, and no analytics vendor receives it (GA4 and
 * Vercel get a redacted path; Meta sends nothing from an address with a hash).
 */
import { loadCheckoutScript, type PassType, type RazorpayConstructor, type RazorpaySuccess } from "./checkout";
import { formatInr } from "../config/pricing";

export const PARENT_LINK_ENDPOINT = "/api/pay/parent-link";
export const PARENT_VIEW_ENDPOINT = "/api/pay/parent/view";
export const PARENT_ORDER_ENDPOINT = "/api/pay/parent/order";
export const PARENT_VERIFY_ENDPOINT = "/api/pay/parent/verify";

/** The fragment key the parent's link carries. */
export const PARENT_PAY_HASH_KEY = "pp";
/** Mirror of server/routes/parentPay.cjs TOKEN_PATTERN: 32 random bytes, base64url. */
export const PARENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type ParentPayLang = "en" | "hi";

/** The child's SERVER prices in rupees, as the mint / view responses carry them. */
export interface ParentPrices {
  month: number | null;
  till_boards: number | null;
}

function readFlag(name: "payments" | "parent"): string {
  try {
    // Literal `import.meta.env.VITE_…` expressions, so Vite and Vitest both rewrite them.
    const raw: unknown =
      name === "payments" ? import.meta.env.VITE_PAYMENTS_ENABLED : import.meta.env.VITE_PARENT_PAY_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

export function isParentPayClientEnabled(): boolean {
  const on = (v: string) => /^(1|true|on|yes)$/i.test(v);
  return on(readFlag("payments")) && on(readFlag("parent"));
}

/** The token in a location hash (`#pp=<token>`), or null. Anything else is ignored. */
export function readParentPayToken(hash: string | null | undefined): string | null {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return null;
  for (const part of raw.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) !== PARENT_PAY_HASH_KEY) continue;
    const value = part.slice(eq + 1);
    return PARENT_TOKEN_PATTERN.test(value) ? value : null;
  }
  return null;
}

/** The link a parent opens: this site's /pricing page with the token in the FRAGMENT. */
export function parentPayUrl(token: string, origin: string, base = "/"): string {
  const b = base.endsWith("/") ? base : `${base}/`;
  return `${origin}${b}pricing#${PARENT_PAY_HASH_KEY}=${token}`;
}

/** Whole days a link has left, at least 1 (the message says "works for N days"). */
export function daysLeft(expiresAtIso: string, nowMs: number): number {
  const exp = Date.parse(expiresAtIso);
  if (!Number.isFinite(exp)) return 1;
  return Math.max(1, Math.round((exp - nowMs) / (24 * 60 * 60 * 1000)));
}

export interface AskParentMessageInput {
  lang: ParentPayLang;
  prices: ParentPrices;
  /** Answers graded in the last 30 days. 0 / null -> the line is LEFT OUT, never invented. */
  checkedCount: number | null;
  url: string;
  days: number;
}

/**
 * The child's WhatsApp message to a parent. Honest and short: what LazyTopper is, a real
 * count only if there is one, the SERVER prices (a price the server could not quote is left
 * out), and the link. No pressure language, no fake urgency, no claims about results.
 */
export function buildAskParentMessage({ lang, prices, checkedCount, url, days }: AskParentMessageInput): string {
  const n = typeof checkedCount === "number" && Number.isInteger(checkedCount) && checkedCount > 0 ? checkedCount : 0;
  const month = typeof prices.month === "number" && prices.month > 0 ? formatInr(prices.month) : null;
  const boards = typeof prices.till_boards === "number" && prices.till_boards > 0 ? formatInr(prices.till_boards) : null;

  if (lang === "hi") {
    const lines = [
      "मम्मी/पापा, मैं CBSE कक्षा 10 बोर्ड की तैयारी के लिए LazyTopper इस्तेमाल करता/करती हूँ। यह मेरे लिखे उत्तरों को CBSE परीक्षक की तरह स्टेप-बाय-स्टेप जाँचता है और बताता है कि मेरे नंबर कहाँ कटते हैं।",
    ];
    if (n > 0) lines.push(`पिछले 30 दिनों में इस पर मेरे ${n} उत्तर जाँचे गए हैं।`);
    if (month && boards) lines.push(`Premium एक महीने के लिए ${month} है, या बोर्ड परीक्षा तक के लिए एक बार ${boards}।`);
    else if (month) lines.push(`Premium एक महीने के लिए ${month} है।`);
    else if (boards) lines.push(`Premium बोर्ड परीक्षा तक के लिए एक बार ${boards} है।`);
    lines.push(
      "क्या आप इसका भुगतान कर देंगे? यह लिंक सिर्फ़ मेरे अकाउंट के लिए है — आपको कोई अकाउंट बनाने या पासवर्ड बताने की ज़रूरत नहीं:",
    );
    lines.push(url);
    lines.push(`(यह लिंक ${days} दिन तक चलेगा।)`);
    return lines.join("\n\n");
  }

  const lines = [
    "Hi Mummy/Papa, I'm using LazyTopper for my CBSE Class 10 board prep. It checks my written answers step by step, the way a CBSE examiner marks them, and shows me exactly where I lose marks.",
  ];
  if (n > 0) lines.push(`I've had ${n} ${n === 1 ? "answer" : "answers"} checked on it in the last 30 days.`);
  if (month && boards) lines.push(`Premium is ${month} for a month, or ${boards} once for everything till my boards.`);
  else if (month) lines.push(`Premium is ${month} for a month.`);
  else if (boards) lines.push(`Premium is ${boards} once for everything till my boards.`);
  lines.push("Could you pay for it? This link is only for my account — you don't need to sign up or share any password:");
  lines.push(url);
  lines.push(`(The link works for ${days} ${days === 1 ? "day" : "days"}.)`);
  return lines.join("\n\n");
}

/* ── network ─────────────────────────────────────────────────────────────── */

async function childAuthHeaders(): Promise<Record<string, string>> {
  const { authClient } = await import("./firebaseClient");
  const current = authClient?.currentUser ?? null;
  if (!current) throw new Error("signed-out");
  const token = await current.getIdToken().catch(() => null);
  if (!token) throw new Error("signed-out");
  return { Authorization: `Bearer ${token}` };
}

export type ParentLinkReason = "invalid" | "expired" | "used" | "covered" | "failed";

export class ParentLinkError extends Error {
  readonly reason: ParentLinkReason;
  constructor(reason: ParentLinkReason) {
    super(reason);
    this.name = "ParentLinkError";
    this.reason = reason;
  }
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (res.ok && parsed && parsed.ok === true) return parsed;
  const reason = parsed && typeof parsed.reason === "string" ? parsed.reason : "";
  if (reason === "invalid" || reason === "expired" || reason === "used" || reason === "covered") throw new ParentLinkError(reason);
  throw new ParentLinkError("failed");
}

function readPrices(v: unknown): ParentPrices {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null);
  return { month: num(o.month), till_boards: num(o.till_boards) };
}

export interface MintedParentLink {
  token: string;
  expiresAt: string;
  prices: ParentPrices;
}

/** The signed-in child mints a link. Sends NOTHING but the child's own ID token. */
export async function mintParentLink(): Promise<MintedParentLink> {
  const json = await postJson(PARENT_LINK_ENDPOINT, {}, await childAuthHeaders());
  if (typeof json.token !== "string" || !PARENT_TOKEN_PATTERN.test(json.token) || typeof json.expiresAt !== "string") {
    throw new ParentLinkError("failed");
  }
  return { token: json.token, expiresAt: json.expiresAt, prices: readPrices(json.prices) };
}

export interface ParentLinkView {
  firstName: string;
  prices: ParentPrices;
  expiresAt: string;
}

/** The parent's page: is the link live, whose first name, what the server charges. */
export async function viewParentLink(token: string): Promise<ParentLinkView> {
  const json = await postJson(PARENT_VIEW_ENDPOINT, { token });
  return {
    firstName: typeof json.firstName === "string" ? json.firstName : "",
    prices: readPrices(json.prices),
    expiresAt: typeof json.expiresAt === "string" ? json.expiresAt : "",
  };
}

export type ParentBuyOutcome =
  | { status: "paid"; passEnd: string; firstName: string; paymentId?: string; amountInr?: number }
  | { status: "dismissed" }
  /** PAY-RECOVER-1 — a verify error AFTER Razorpay's signed success. Never shown as a failure. */
  | { status: "pending" }
  | { status: "failed"; reason?: Exclude<ParentLinkReason, "failed"> };

export interface ParentBuyDeps {
  createOrder: (token: string, passType: PassType) => Promise<{ orderId: string; keyId: string; amountPaise: number }>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (token: string, success: RazorpaySuccess) => Promise<{ passEnd: string; firstName: string }>;
}

async function createParentOrder(token: string, passType: PassType) {
  const json = await postJson(PARENT_ORDER_ENDPOINT, { token, passType });
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") {
    throw new ParentLinkError("failed");
  }
  return { orderId, keyId, amountPaise };
}

async function verifyParentPayment(token: string, success: RazorpaySuccess) {
  const json = await postJson(PARENT_VERIFY_ENDPOINT, {
    token,
    orderId: success.razorpay_order_id,
    paymentId: success.razorpay_payment_id,
    signature: success.razorpay_signature,
  });
  if (typeof json.passEnd !== "string") throw new ParentLinkError("failed");
  return { passEnd: json.passEnd, firstName: typeof json.firstName === "string" ? json.firstName : "" };
}

const DEFAULT_DEPS: ParentBuyDeps = {
  createOrder: createParentOrder,
  loadScript: () => loadCheckoutScript(),
  verify: verifyParentPayment,
};

/**
 * The parent's purchase: order (bound by the server to the child) -> Razorpay's checkout ->
 * server verify (grant to the child). Never throws.
 */
export async function buyPassAsParent(
  token: string,
  passType: PassType,
  deps: ParentBuyDeps = DEFAULT_DEPS,
): Promise<ParentBuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(token, passType), deps.loadScript()]);
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: passType === "month" ? "Premium pass for a month (for your child)" : "Premium pass till boards (for your child)",
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
      });
      checkout.open();
    });
    if (!success) return { status: "dismissed" };
    let verified: { passEnd: string; firstName: string };
    try {
      verified = await deps.verify(token, success);
    } catch {
      // PAY-RECOVER-1 — Razorpay has SIGNED a success: never "didn't go through" from here.
      // The webhook still grants the child's pass; the parent route has no auth, so no poll.
      return { status: "pending" };
    }
    const { passEnd, firstName } = verified;
    const paymentId = typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    const amountInr = Number.isFinite(order.amountPaise) && order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    return {
      status: "paid",
      passEnd,
      firstName,
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
    };
  } catch (e) {
    if (e instanceof ParentLinkError && e.reason !== "failed") return { status: "failed", reason: e.reason };
    return { status: "failed" };
  }
}
