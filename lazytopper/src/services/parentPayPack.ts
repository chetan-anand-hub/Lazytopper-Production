/**
 * parentPayPack - PARENT-PACKS-1 (owner, 4 Nov 2026): the pack half of "Forward link to parents".
 *
 * Kept OUT of services/parentPay.ts on purpose: that module rides on the light paywall gate (the entry chunk), while
 * everything here is needed only once a pack's share sheet (the lazy PaywallActionsView chunk), the pack shop or the
 * parent's page is on screen. PURE: no network, no clock.
 *
 * ★ HONEST BY CONSTRUCTION. The message quotes the price the SERVER returned when the link was minted (never a typed
 * figure), names the one pack the link carries, and says nothing about the Board Pass or "Premium". No proof line: the
 * proof is about answers checked, which a PDF pack does not do.
 */
import { orderSourceFields } from "../analytics/visitSource";
import { adSignalFields, metaIcAfterOrder } from "../analytics/adSignals";
import { formatInr } from "../config/pricing";
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../config/syllabusUnits2026-27";
import { SERIES_MOCKS_PER_SUBJECT, SERIES_PAPERS_PER_CHAPTER } from "../lib/testSeries/seriesCounts";
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
  parentGstProofOf,
  type MintedParentLink,
  type ParentBuyOutcome,
  type ParentLinkReason,
  type ParentLinkView,
  type ParentPayLang,
} from "./parentPay";
import { loadCheckoutScript, watchPaymentFailed, type RazorpayConstructor, type RazorpaySuccess } from "./checkout";
import { confirmServerPrice, serverPriceFields, razorpaySheetDescription } from "./priceConfirm";
import { watchSheetForHang } from "./payReturn";
import { razorpayUpiFirstOption } from "./razorpayDisplay";
import { gstBuyerOrderFields, gstStateFieldOn, isGstBuyerCancelled } from "./gstBuyerOrder";

/** The pack a link carries, as the SERVER reports it (its price is the server table's). */
export interface ParentPackRef {
  sku: PackSku;
  target: string;
  priceInr: number;
  /** GST-EXCL-1: what the server CHARGES (base + 18% GST) and the GST, from 7 Nov 2026; absent before. */
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

const PARENT_PACK_SKUS: readonly string[] = ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq", "test_series"];

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
  const wantTarget = pack.sku === "pack_bundle" || pack.sku === "test_series" ? "all" : pack.target;
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
  // GST-INVOICE-1: the PARENT (the payer) confirms their state.
  const gst = gstStateFieldOn() ? await gstBuyerOrderFields(null, { postPay: true }) : {}; // host: ParentPayPanel's paid / pending screen mounts PostPayGst
  const signals = adSignalFields(); // META-IC-1
  const json = await postJson(PARENT_ORDER_ENDPOINT, { token, product: "pack", ...gst, ...orderSourceFields(), ...signals });
  const { orderId, keyId, amountPaise } = json;
  if (typeof orderId !== "string" || typeof keyId !== "string" || typeof amountPaise !== "number") throw new ParentLinkError("failed");
  metaIcAfterOrder(signals, json, null); // the server names the pack sku in its reply
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
      // PAY-HANG-1: the parent link has no status route and no ?buy= arrival -> the bar only says to finish or cancel in the UPI app (never a way to pay again).
      const hang = watchSheetForHang({ order: { orderId: order.orderId }, onClosed: () => resolve(null) });
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: razorpaySheetDescription(`${packName || "PDF pack"} (for your child)`, order),
        handler: (response) => {
          hang.stop();
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            hang.stop();
            resolve(null);
          },
        },
        ...razorpayUpiFirstOption(),
      });
      watchPaymentFailed(checkout, () => undefined);
      hang.attach(checkout);
      checkout.open();
    });
    if (!success) return { status: "dismissed" };
    let verified: { firstName: string; duplicate: boolean };
    try {
      verified = await deps.verify(token, success);
    } catch {
      // Razorpay SIGNED a success: never "didn't go through" from here (the webhook still grants the child's pack).
      return { status: "pending", ...parentGstProofOf(success) };
    }
    const paymentId = typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    const amountInr = Number.isFinite(order.amountPaise) && order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    return {
      status: "paid",
      passEnd: "",
      firstName: verified.firstName,
      orderId: order.orderId, // META-PURCHASE-DEDUP-1: the one id of the sale (analytics only)
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
      ...(verified.duplicate ? { duplicate: true } : {}),
      ...parentGstProofOf(success),
    };
  } catch (e) {
    if (isGstBuyerCancelled(e)) return { status: "dismissed" };
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
    case "test_series":
      return "Test Series Pack";
    default:
      return "PDF pack";
  }
}

export interface AskParentPackMessageInput {
  lang: ParentPayLang;
  /** "Maths CBQ Pack" (parentPackName). */
  name: string;
  /** TS-PARENT-FORWARD-1 (review A): the pack's SKU - picks the message (the Test Series has its own), never the name. */
  sku: PackSku;
  /** The SERVER's price from the mint response, rupees. */
  priceInr: number;
  url: string;
  days: number;
}

/** The child's message to a parent for ONE pack: the pack, its one-time price, the link and how long it works. */
export function buildAskParentPackMessage({ lang, name, sku, priceInr, url, days }: AskParentPackMessageInput): string {
  const price = formatInr(priceInr);
  // TS-PARENT-FORWARD-1 (owner ruling 18 Nov 2026): the Test Series is taken online (its papers can be printed) and is never presented
  // like a PDF pack. Chosen by SKU (review A), so renaming parentPackName can never send the Test Series the PDF-pack message.
  if (sku === "test_series") return buildAskParentSeriesMessage(lang, price, url, days);
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

/**
 * TS-PARENT-FORWARD-1 - the child's message for the Test Series: the tests (online or printed) and the step-by-step marking, never "PDFs". The price is
 * the SERVER's (the mint's total); the test count is parentSeriesTestCount() (never typed). The link / no-password / validity lines are the
 * pack message's own.
 */
/**
 * The Test Series' test count WITHOUT lib/testSeries/testSeries.ts (review: that module put ~5 KB gz on every paywall surface's
 * PaywallActionsView). Same arithmetic as hubTsFlag's hub card: board chapters x papers per chapter + full-length per subject x 2.
 * A test pins it equal to seriesTotals().total.
 */
export function parentSeriesTestCount(): number {
  const chapters = BOARD_CHAPTER_KEYS.filter((k) => chapterUnit(k) !== null && chapterUnit(k) !== undefined).length;
  return chapters * SERIES_PAPERS_PER_CHAPTER + SERIES_MOCKS_PER_SUBJECT * 2;
}

/** The Test Series' opening sentence (price + tests + marking): ONE copy for the per-account link and the signed-out share. */
function seriesAskLine(lang: ParentPayLang, price: string): string {
  const tests = parentSeriesTestCount();
  return lang === "hi"
    ? `मम्मी/पापा, क्या आप मुझे LazyTopper पर Test Series दिला देंगे? यह एक बार का ${price} है और मेरे बोर्ड तक चलेगी: ${tests} बोर्ड-पैटर्न टेस्ट, जिन्हें मैं ऑनलाइन दे सकता/सकती हूँ या प्रिंट कर सकता/सकती हूँ, और मेरे लिखे उत्तर CBSE परीक्षक की तरह स्टेप-बाय-स्टेप जाँचे जाते हैं।`
    : `Hi Mummy/Papa, can you get me the Test Series on LazyTopper? It's ${price}, one time, valid till my boards: ${tests} board-pattern tests I can take online or print, and my written answers are marked step by step like a CBSE examiner.`;
}

function buildAskParentSeriesMessage(lang: ParentPayLang, price: string, url: string, days: number): string {
  if (lang === "hi") {
    return [
      seriesAskLine(lang, price),
      "यह लिंक सिर्फ़ मेरे अकाउंट के लिए है — आपको कोई अकाउंट बनाने या पासवर्ड बताने की ज़रूरत नहीं:",
      url,
      `(यह लिंक ${days} दिन तक चलेगा।)`,
    ].join("\n\n");
  }
  return [
    seriesAskLine(lang, price),
    "This link is only for my account — you don't need to sign up or share any password:",
    url,
    `(The link works for ${days} ${days === 1 ? "day" : "days"}.)`,
  ].join("\n\n");
}

/**
 * TS-PARENT-FORWARD-2 (owner, 25 Nov 2026: no sign-in in any pay path) - a SIGNED-OUT student's message to a parent. No per-account
 * link exists without an account, so it sends the public /test-series page: the parent pays there signed out (pay-first) and, after
 * paying, "Who will use it?" puts the series on the child's number. `price` is the Buy's own total (packPayLabel), never typed.
 */
export function buildParentSeriesShareMessage({ lang, price, url }: { lang: ParentPayLang; price: string; url: string }): string {
  const pay = lang === "hi" ? "यहाँ भुगतान करें, फिर मेरा नंबर डालें ताकि यह मेरे अकाउंट पर खुल जाए:" : "Pay here, then enter my number so it opens on my account:";
  return `${seriesAskLine(lang, price)} ${pay} ${url}`;
}
