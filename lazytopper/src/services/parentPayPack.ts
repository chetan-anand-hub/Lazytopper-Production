/**
 * parentPayPack - PARENT-PACKS-1 (owner, 4 Nov 2026): the pack half of "Ask a parent to pay".
 *
 * Kept OUT of services/parentPay.ts on purpose: that module rides on the light paywall gate (the entry chunk), while
 * everything here is needed only once a pack's share sheet (the lazy PaywallActionsView chunk), the pack shop or the
 * parent's page is on screen. PURE: no network, no clock.
 *
 * ★ HONEST BY CONSTRUCTION. The message quotes the price the SERVER returned when the link was minted (never a typed
 * figure), names the one pack the link carries, and says nothing about the Board Pass or "Premium". No proof line: the
 * proof is about answers checked, which a PDF pack does not do.
 */
import { formatInr } from "../config/pricing";
import type { PackSku } from "./packs";
import {
  childAuthHeaders,
  ParentLinkError,
  PARENT_LINK_ENDPOINT,
  PARENT_ORDER_ENDPOINT,
  PARENT_TOKEN_PATTERN,
  PARENT_VERIFY_ENDPOINT,
  PARENT_VIEW_ENDPOINT,
  postJson,
  readPrices,
  readBoardPassGst,
  type MintedParentLink,
  type ParentBuyOutcome,
  type ParentLinkReason,
  type ParentLinkView,
  type ParentPayLang,
} from "./parentPay";
import { loadCheckoutScript, watchPaymentFailed, type RazorpayConstructor, type RazorpaySuccess } from "./checkout";
import { confirmServerPrice, serverPriceFields } from "./priceConfirm";

/** The pack a link carries, as the SERVER reports it (its price is the server table's). */
export interface ParentPackRef {
  sku: PackSku;
  target: string;
  priceInr: number;
  /** GST-EXCL-1: what the server CHARGES (base + 18% GST) and the GST, from 5 Nov 2026; absent before. */
  totalInr?: number;
  gstInr?: number;
}

/** The pack a child asks a parent to pay for (the share button's product). `name` is for display only. */
export interface ParentPayPackProduct {
  kind: "pack";
  sku: PackSku;
  /** The chapter slug / subject; absent for the Bundle. */
  target?: string;
  /** "Maths CBQ Pack", "Polynomials Chapter Pack", ... (parentPackName). */
  name: string;
}

const PARENT_PACK_SKUS: readonly string[] = ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq"];

/** A server pack reference, or undefined for anything malformed. */
export function readPack(v: unknown): ParentPackRef | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.sku !== "string" || !PARENT_PACK_SKUS.includes(o.sku)) return undefined;
  if (typeof o.target !== "string" || typeof o.priceInr !== "number" || !Number.isFinite(o.priceInr) || o.priceInr <= 0) return undefined;
  // GST-EXCL-1: from the cut-off the server adds what it CHARGES (base + GST) and the GST; kept only when they add up.
  const gst =
    typeof o.totalInr === "number" && typeof o.gstInr === "number" && Number.isInteger(o.totalInr) && Number.isInteger(o.gstInr) &&
    o.gstInr > 0 && o.priceInr + o.gstInr === o.totalInr
      ? { totalInr: o.totalInr, gstInr: o.gstInr }
      : {};
  return { sku: o.sku as PackSku, target: o.target, priceInr: o.priceInr, ...gst };
}

/**
 * The signed-in child mints a PACK link: the child's ID token + the pack's sku and target, which the server validates and fixes
 * on the link. The server's echoed pack (sku AND target - the Bundle's is "all") must match, or no message can quote a price.
 */
export async function mintParentPackLink(pack: { sku: PackSku; target?: string }): Promise<MintedParentLink> {
  const json = await postJson(PARENT_LINK_ENDPOINT, { pack: { sku: pack.sku, ...(pack.target ? { target: pack.target } : {}) } }, await childAuthHeaders());
  if (typeof json.token !== "string" || !PARENT_TOKEN_PATTERN.test(json.token) || typeof json.expiresAt !== "string") {
    throw new ParentLinkError("failed");
  }
  const ref = readPack(json.pack);
  const wantTarget = pack.sku === "pack_bundle" ? "all" : pack.target;
  if (!ref || ref.sku !== pack.sku || ref.target !== wantTarget) throw new ParentLinkError("failed");
  return { token: json.token, expiresAt: json.expiresAt, prices: readPrices(json.prices), pack: ref };
}

/** The parent's view with the pack VALIDATED (a malformed pack is dropped, so no Pay button can quote it). */
export function withValidPack(view: ParentLinkView): ParentLinkView {
  const { pack, ...rest } = view;
  const ok = readPack(pack);
  return ok ? { ...rest, pack: ok } : rest;
}

/** The parent's page: is the link live, whose first name, and - for a pack link - which pack at what SERVER price. */
export async function viewParentLinkWithPack(token: string): Promise<ParentLinkView> {
  const json = await postJson(PARENT_VIEW_ENDPOINT, { token });
  const pack = readPack(json.pack);
  return {
    firstName: typeof json.firstName === "string" ? json.firstName : "",
    prices: readPrices(json.prices),
    expiresAt: typeof json.expiresAt === "string" ? json.expiresAt : "",
    ...(pack ? { pack } : {}),
    ...(readBoardPassGst(json.boardPassGst) ? { boardPassGst: readBoardPassGst(json.boardPassGst) } : {}),
  };
}

export interface ParentPackBuyDeps {
  createOrder: (token: string) => Promise<{ orderId: string; keyId: string; amountPaise: number }>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (token: string, success: RazorpaySuccess) => Promise<{ firstName: string; duplicate: boolean }>;
}

/** The pack order names NO pack: the server takes sku, target, child and amount from the link. */
export async function createParentPackOrder(token: string) {
  const json = await postJson(PARENT_ORDER_ENDPOINT, { token, product: "pack" });
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") throw new ParentLinkError("failed");
  return { orderId, keyId, amountPaise, ...serverPriceFields(json) };
}

/** Believed only when the server says `kind: "pack"`; `duplicate` = the child already had it (review M2). */
export async function verifyParentPackPayment(token: string, success: RazorpaySuccess) {
  const json = await postJson(PARENT_VERIFY_ENDPOINT, {
    token,
    orderId: success.razorpay_order_id,
    paymentId: success.razorpay_payment_id,
    signature: success.razorpay_signature,
  });
  if (json.kind !== "pack") throw new ParentLinkError("failed");
  return { firstName: typeof json.firstName === "string" ? json.firstName : "", duplicate: json.duplicate === true };
}

const PACK_DEPS: ParentPackBuyDeps = { createOrder: createParentPackOrder, loadScript: () => loadCheckoutScript(), verify: verifyParentPackPayment };

/** The parent's pack purchase: order (bound by the server to the link) -> Razorpay -> server verify. Never throws. */
export async function buyPackAsParent(token: string, packName: string, deps: ParentPackBuyDeps = PACK_DEPS): Promise<ParentBuyOutcome> {
  try {
    const [order, Razorpay] = await Promise.all([deps.createOrder(token), deps.loadScript()]);
    // GST-EXCL-1 (review G2): the server's price differs from what this device showed -> confirm it before Razorpay opens.
    if (!(await confirmServerPrice(order))) return { status: "dismissed" };
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: `${packName || "PDF pack"} (for your child)`,
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
      });
      watchPaymentFailed(checkout, () => undefined);
      checkout.open();
    });
    if (!success) return { status: "dismissed" };
    let verified: { firstName: string; duplicate: boolean };
    try {
      verified = await deps.verify(token, success);
    } catch {
      // Razorpay SIGNED a success: never "didn't go through" from here (the webhook still grants the child's pack).
      return { status: "pending" };
    }
    const paymentId = typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    const amountInr = Number.isFinite(order.amountPaise) && order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    return {
      status: "paid",
      passEnd: "",
      firstName: verified.firstName,
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
      ...(verified.duplicate ? { duplicate: true } : {}),
    };
  } catch (e) {
    if (e instanceof ParentLinkError && e.reason !== "failed") return { status: "failed", reason: e.reason as Exclude<ParentLinkReason, "failed"> };
    return { status: "failed" };
  }
}

function subjectName(target: string | undefined): string {
  return target === "science" ? "Science" : "Maths";
}

/** The pack's name in a parent message / on the parent page. The caller passes the chapter's display name for a Chapter Pack. */
export function parentPackName(sku: PackSku, target: string | undefined, chapterName?: string): string {
  switch (sku) {
    case "pack_chapter":
      return chapterName ? `${chapterName} Chapter Pack` : "Chapter Pack";
    case "pack_mock":
      return `${subjectName(target)} Mock Pack`;
    case "pack_subject":
      return `${subjectName(target)} Subject Pack`;
    case "pack_cbq":
      return `${subjectName(target)} CBQ Pack`;
    case "pack_bundle":
      return "Maths + Science Bundle";
    default:
      return "PDF pack";
  }
}

export interface AskParentPackMessageInput {
  lang: ParentPayLang;
  /** "Maths CBQ Pack" (parentPackName). */
  name: string;
  /** The SERVER's price from the mint response, rupees. */
  priceInr: number;
  url: string;
  days: number;
}

/** The child's message to a parent for ONE pack: the pack, its one-time price, the link and how long it works. */
export function buildAskParentPackMessage({ lang, name, priceInr, url, days }: AskParentPackMessageInput): string {
  const price = formatInr(priceInr);
  if (lang === "hi") {
    return [
      `मम्मी/पापा, क्या आप मुझे LazyTopper पर ${name} दिला देंगे? यह एक बार का ${price} है — मेरी CBSE कक्षा 10 बोर्ड की तैयारी के लिए प्रिंट करने वाली PDF।`,
      "यह लिंक सिर्फ़ मेरे अकाउंट के लिए है — आपको कोई अकाउंट बनाने या पासवर्ड बताने की ज़रूरत नहीं:",
      url,
      `(यह लिंक ${days} दिन तक चलेगा।)`,
    ].join("\n\n");
  }
  return [
    `Hi Mummy/Papa, can you get me the ${name} on LazyTopper? It's ${price}, one time — printable PDFs for my CBSE Class 10 board prep.`,
    "This link is only for my account — you don't need to sign up or share any password:",
    url,
    `(The link works for ${days} ${days === 1 ? "day" : "days"}.)`,
  ].join("\n\n");
}
