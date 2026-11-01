/**
 * packs — the browser half of the printable PDF packs (PACKS-CLIENT-1, contract v1.0).
 *
 * ★★ DARK BY DEFAULT. `isPacksClientEnabled()` is false unless the build env `VITE_PACKS_ENABLED`
 * is "1". While it is false nothing here BUYS anything; `fetchMyPacks` always works, so a pack a
 * student already owns stays downloadable if the flag is ever turned off.
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT MONEY OR ACCESS. The server prices the order (the displayed
 * prices below are copy only, the checkout charges the SERVER order's amount) and a pack is shown as
 * owned ONLY from the server's `kind: "pack"` verify / status response or `/api/packs/mine`. There is
 * no client-side grant and no storage of ownership anywhere in this file.
 *
 * ★ Packs never touch the weekly download limit: nothing here calls the limited-download guard.
 *
 * Kept light on purpose: this module is imported by the pricing page's packs strip. The bank, jsPDF and
 * the PDF exporter live in src/lib/packs/** and are reached only through dynamic imports.
 */
import { ACTIVITY_TOPIC_SLUGS } from "./activityPages";
import {
  authHeaders,
  checkPackPayStatus,
  createPackOrder,
  loadCheckoutScript,
  PayAlreadyOwnedError,
  PayOrderExpiredError,
  prefillOption,
  readCheckoutPrefill,
  verifyPackPayment,
  watchPaymentFailed,
  type CheckoutPrefill,
  type PackGrant,
  type PackStatusResult,
  type PayOrder,
  type RazorpayConstructor,
  type RazorpaySuccess,
} from "./checkout";

/* ── catalogue ──────────────────────────────────────────────────────────────── */

export type PackSku = "pack_chapter" | "pack_mock" | "pack_subject" | "pack_bundle" | "pack_cbq";
export type PackSubject = "maths" | "science";

export const PACK_SKUS: readonly PackSku[] = ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq"];
export const PACK_SUBJECTS: readonly PackSubject[] = ["maths", "science"];

/** The 26 chapter slugs: the first 13 are Maths, the next 13 Science (topics.ts order; a test pins it). */
export const PACK_CHAPTER_SLUGS: readonly string[] = ACTIVITY_TOPIC_SLUGS;
const MATHS_CHAPTER_COUNT = 13;

export function subjectOfChapter(slug: string): PackSubject | null {
  const i = PACK_CHAPTER_SLUGS.indexOf(slug);
  if (i < 0) return null;
  return i < MATHS_CHAPTER_COUNT ? "maths" : "science";
}

export function chaptersOfSubject(subject: PackSubject): string[] {
  return PACK_CHAPTER_SLUGS.filter((slug) => subjectOfChapter(slug) === subject);
}

/**
 * Display prices, rupees. COPY ONLY: the server decides the charge (contract §1) and the checkout
 * charges the server's order amount. A test pins these against the contract table.
 */
export const PACK_PRICE_INR: Readonly<Record<PackSku, number>> = {
  pack_chapter: 49,
  pack_mock: 99,
  pack_subject: 199,
  pack_bundle: 299,
  pack_cbq: 199,
};

export function packPriceLabel(sku: PackSku): string {
  return `₹${PACK_PRICE_INR[sku]}`;
}

/** `"<sku>:<target>"` (the bundle is `"pack_bundle:all"`). */
export function packIdOf(sku: PackSku, target?: string): string {
  return `${sku}:${sku === "pack_bundle" ? "all" : target ?? ""}`;
}

export function subjectLabel(subject: PackSubject): string {
  return subject === "maths" ? "Maths" : "Science";
}

/** Is `target` a legal target for `sku`? (The server enforces the same; this keeps the UI honest.) */
export function isValidPackTarget(sku: PackSku, target: string | undefined): boolean {
  switch (sku) {
    case "pack_chapter":
      return typeof target === "string" && PACK_CHAPTER_SLUGS.includes(target);
    case "pack_mock":
    case "pack_subject":
    case "pack_cbq":
      return target === "maths" || target === "science";
    case "pack_bundle":
      return true;
  }
}

/* ── the client flag ────────────────────────────────────────────────────────── */

/** Read as a LITERAL `import.meta.env.VITE_…` expression (Vite and Vitest rewrite that exact text). */
function readPacksFlag(): string {
  try {
    const raw: unknown = import.meta.env.VITE_PACKS_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

/** The CLIENT switch for BUYING. Only the string "1" turns it on (contract §7). */
export function isPacksClientEnabled(): boolean {
  return readPacksFlag() === "1";
}

/* ── ownership + coverage (contract §3 — the server has a copy with the same tests) ───────── */

export interface OwnedPack {
  packId: string;
  sku: string;
  target: string;
  pricePaidInr: number;
  paidAt: number;
  /** The order the pack was bought with, when the server sends it (the PDF footer's "Order" line). */
  orderId?: string;
}

export interface PackLicensee {
  name: string;
  email: string;
}

/**
 * PACK-CREDIT-1 - what the student's recent packs take off a Board Pass, as the SERVER computed it
 * (`/api/packs/mine`). `payInr` is the server's Board Pass quote less the credit. Display only: the
 * order route decides the amount actually charged. null when there is no credit.
 */
export interface BoardPassCredit {
  creditInr: number;
  expiresAtMs: number;
  payInr: number;
}

export interface MyPacks {
  packs: OwnedPack[];
  licensee: PackLicensee;
  boardPassCredit: BoardPassCredit | null;
  /** CBQ-TUTOR-TASTE-1 - the server's count of the 3 CBQ-Pack tutor questions; absent unless a CBQ Pack is owned. */
  tutorTaste?: { used: number; left: number; limit: number };
}

/** A credit only when every field is a sane server number; anything else is no credit. */
export function readBoardPassCredit(raw: unknown): BoardPassCredit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { creditInr?: unknown; expiresAtMs?: unknown; payInr?: unknown };
  const { creditInr, expiresAtMs, payInr } = r;
  if (typeof creditInr !== "number" || !Number.isInteger(creditInr) || creditInr <= 0) return null;
  if (typeof payInr !== "number" || !Number.isInteger(payInr) || payInr <= 0) return null;
  if (typeof expiresAtMs !== "number" || !Number.isFinite(expiresAtMs)) return null;
  return { creditInr, expiresAtMs, payInr };
}

type PackRef = string | { packId: string };

function idSet(packs: readonly PackRef[]): Set<string> {
  return new Set(packs.map((p) => (typeof p === "string" ? p : p.packId)));
}

/** `pack_chapter:<slug>`, `pack_subject:<subjectOf(slug)>` or `pack_bundle:all` is owned. */
export function ownsChapter(packs: readonly PackRef[], slug: string): boolean {
  const subject = subjectOfChapter(slug);
  if (!subject) return false;
  const ids = idSet(packs);
  return ids.has(`pack_chapter:${slug}`) || ids.has(`pack_subject:${subject}`) || ids.has("pack_bundle:all");
}

/** `pack_mock:<s>`, `pack_subject:<s>` or `pack_bundle:all` is owned. */
export function ownsMocks(packs: readonly PackRef[], subject: PackSubject): boolean {
  const ids = idSet(packs);
  return ids.has(`pack_mock:${subject}`) || ids.has(`pack_subject:${subject}`) || ids.has("pack_bundle:all");
}

/** CBQ-PACK-1: only `pack_cbq:<s>` itself; the Subject Pack and the Bundle do NOT include CBQs. */
export function ownsCbq(packs: readonly PackRef[], subject: PackSubject): boolean {
  return idSet(packs).has(`pack_cbq:${subject}`);
}

/** A request is `already_owned` when everything it would grant is already owned. */
export function isAlreadyOwned(packs: readonly PackRef[], sku: PackSku, target?: string): boolean {
  switch (sku) {
    case "pack_chapter":
      return typeof target === "string" && ownsChapter(packs, target);
    case "pack_mock":
      return (target === "maths" || target === "science") && ownsMocks(packs, target);
    case "pack_subject":
      return (
        (target === "maths" || target === "science") &&
        ownsMocks(packs, target) &&
        chaptersOfSubject(target).every((slug) => ownsChapter(packs, slug))
      );
    case "pack_cbq":
      return (target === "maths" || target === "science") && ownsCbq(packs, target);
    case "pack_bundle":
      return (
        PACK_SUBJECTS.every((s) => ownsMocks(packs, s)) && PACK_CHAPTER_SLUGS.every((slug) => ownsChapter(packs, slug))
      );
  }
}

/* ── GET /api/packs/mine ────────────────────────────────────────────────────── */

export const PACKS_MINE_ENDPOINT = "/api/packs/mine";

function readOwned(raw: unknown): OwnedPack | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.packId !== "string" || !r.packId || typeof r.sku !== "string") return null;
  return {
    packId: r.packId,
    sku: r.sku,
    target: typeof r.target === "string" ? r.target : "",
    pricePaidInr: typeof r.pricePaidInr === "number" ? r.pricePaidInr : 0,
    paidAt: typeof r.paidAt === "number" ? r.paidAt : 0,
    ...(typeof r.orderId === "string" && r.orderId ? { orderId: r.orderId } : {}),
  };
}

/**
 * The server could not read the buyer's name / email (HTTP 503 `{ error: "licensee_unavailable" }`). No PDF may be
 * built without a licensee email, so callers show PACK_DETAILS_UNAVAILABLE_COPY with a Retry and build nothing.
 */
export class PacksLicenseeUnavailableError extends Error {
  constructor() {
    super("licensee_unavailable");
    this.name = "PacksLicenseeUnavailableError";
  }
}

/** True when a licensee carries an email: the ONLY condition under which a pack PDF may be produced. */
export function hasLicenseeEmail(licensee: PackLicensee | null | undefined): boolean {
  return !!licensee && typeof licensee.email === "string" && licensee.email.trim().length > 0;
}

/** The signed-in student's packs and the name / email the PDFs are licensed to. Throws when signed out or on a failed request. */
export async function fetchMyPacks(): Promise<MyPacks> {
  const res = await fetch(PACKS_MINE_ENDPOINT, { headers: { ...(await authHeaders()) } });
  if (!res.ok) {
    if (res.status === 503) {
      let body: { error?: unknown } | null = null;
      try {
        body = (await res.json()) as { error?: unknown };
      } catch {
        body = null;
      }
      if (body && body.error === "licensee_unavailable") throw new PacksLicenseeUnavailableError();
    }
    throw new Error(`request failed: ${res.status}`);
  }
  const json = (await res.json()) as { packs?: unknown; licensee?: { name?: unknown; email?: unknown }; boardPassCredit?: unknown; tutorTaste?: unknown };
  const packs = Array.isArray(json.packs) ? json.packs.map(readOwned).filter((p): p is OwnedPack => p !== null) : [];
  const licensee: PackLicensee = {
    name: typeof json.licensee?.name === "string" ? json.licensee.name : "",
    email: typeof json.licensee?.email === "string" ? json.licensee.email : "",
  };
  const taste = json.tutorTaste && typeof json.tutorTaste === "object" ? (json.tutorTaste as { used?: unknown; left?: unknown; limit?: unknown }) : null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const tutorTaste =
    taste && num(taste.left) !== null && num(taste.limit) !== null
      ? { used: num(taste.used) ?? 0, left: num(taste.left) as number, limit: num(taste.limit) as number }
      : undefined;
  return { packs, licensee, boardPassCredit: readBoardPassCredit(json.boardPassCredit), ...(tutorTaste ? { tutorTaste } : {}) };
}

/* ── buying ─────────────────────────────────────────────────────────────────── */

/** "Chapter Pack · Real Numbers" — the Razorpay sheet's description. */
export function packDescription(sku: PackSku, target: string | undefined, chapterName?: string): string {
  switch (sku) {
    case "pack_chapter":
      return `Chapter Pack · ${chapterName || target || "1 chapter"}`;
    case "pack_mock":
      return `Mock Pack · ${target ? subjectLabel(target as PackSubject) : "5 board mocks"}`;
    case "pack_subject":
      return `Subject Pack · ${target ? subjectLabel(target as PackSubject) : "all chapters"}`;
    case "pack_cbq":
      return target ? `${subjectLabel(target as PackSubject)} CBQ Pack` : "CBQ Pack";
    case "pack_bundle":
      return "Maths + Science Bundle";
  }
}

export type PackBuyOutcome =
  | { status: "paid"; grant: PackGrant; paymentId?: string; amountInr?: number }
  /** `afterFailure`: Razorpay reported a failed payment before the sheet was closed (PAY-RESCUE-1). */
  | { status: "dismissed"; afterFailure?: boolean }
  /** The server says the student already owns everything this would grant: nothing was charged. */
  | { status: "already_owned" }
  | { status: "expired" }
  /** Razorpay signed a success but the server could not confirm it yet — never "failed". */
  | { status: "pending"; orderId: string; paymentId?: string }
  | { status: "failed" };

export interface PackBuyDeps {
  createOrder: (sku: PackSku, target?: string) => Promise<PayOrder>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (success: RazorpaySuccess) => Promise<PackGrant>;
  /** PAY-RESCUE-1 - optional; absent in injected test deps. */
  prefill?: () => Promise<CheckoutPrefill>;
}

const DEFAULT_BUY_DEPS: PackBuyDeps = {
  createOrder: createPackOrder,
  loadScript: () => loadCheckoutScript(),
  verify: verifyPackPayment,
  prefill: readCheckoutPrefill,
};

/**
 * order -> Razorpay's checkout -> server verify. Never throws. The amount charged is the SERVER order's.
 * `chapterName` only words the Razorpay sheet's description.
 */
export async function buyPack(
  sku: PackSku,
  target?: string,
  options: { chapterName?: string; deps?: PackBuyDeps } = {},
): Promise<PackBuyOutcome> {
  const deps = options.deps ?? DEFAULT_BUY_DEPS;
  if (!isValidPackTarget(sku, target)) return { status: "failed" };
  try {
    const sendTarget = sku === "pack_bundle" ? undefined : target;
    const [order, Razorpay, prefill] = await Promise.all([
      deps.createOrder(sku, sendTarget),
      deps.loadScript(),
      deps.prefill ? deps.prefill().catch((): CheckoutPrefill => ({})) : Promise.resolve<CheckoutPrefill>({}),
    ]);
    let sawFailure = false;
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: packDescription(sku, target, options.chapterName),
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
        ...prefillOption(prefill),
      });
      watchPaymentFailed(checkout, () => {
        sawFailure = true;
      });
      checkout.open();
    });
    if (!success) return sawFailure ? { status: "dismissed", afterFailure: true } : { status: "dismissed" };
    const paymentId =
      typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    let grant: PackGrant;
    try {
      grant = await deps.verify(success);
    } catch (verifyError) {
      if (verifyError instanceof PayOrderExpiredError) return { status: "expired" };
      return { status: "pending", orderId: order.orderId, ...(paymentId !== undefined ? { paymentId } : {}) };
    }
    const amountInr = Number.isFinite(order.amountPaise) && order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    return {
      status: "paid",
      grant,
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
    };
  } catch (e) {
    if (e instanceof PayAlreadyOwnedError) return { status: "already_owned" };
    return { status: "failed" };
  }
}

/** Ask the server about a pack order Razorpay already signed as paid. Never throws. */
export function checkPackOrder(orderId: string): Promise<PackStatusResult> {
  return checkPackPayStatus(orderId).catch((): PackStatusResult => ({ state: "unknown" }));
}

/* ── copy ───────────────────────────────────────────────────────────────────── */

export const PACK_DETAILS_UNAVAILABLE_COPY = "We couldn't load your pack details. Please try again in a minute.";
export const PACK_PAID_COPY = "Payment received. Your pack is ready to download.";
export const PACK_FAILED_COPY = "Payment didn't go through. You haven't been charged twice — try again.";
export const PACK_CHECKING_COPY = "Checking your payment…";
export const PACK_STILL_CONFIRMING_COPY =
  "We're still confirming your payment with your bank. If money left your account, your pack appears under My packs automatically — you won't be charged twice.";
export const PACK_ALREADY_OWNED_COPY = "You already own this — find it under My packs.";
export const PACK_EXPIRED_COPY = "This order expired — start again.";
