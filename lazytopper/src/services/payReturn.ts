/**
 * payReturn - PAY-RETURN-1: a buyer who paid in their UPI app and came back to a page that RESET (the in-app browser reloads the
 * page, so Razorpay's handler - and with it /verify - never ran) still gets "Payment received".
 *
 * ★ WHAT THIS HOLDS. When a signed-out checkout opens the Razorpay sheet it leaves a small entry in THIS device's localStorage:
 *   { orderId, proof, host, buy, startedAt }. `proof` is the per-order secret the server minted at order creation (never a payment
 *   id, a signature, a phone or an email). The entry lives 30 minutes, one per order, and is dropped the moment the sheet reports a
 *   result (a success or a dismissal): only a sheet that vanished WITHOUT reporting - the reset page - leaves one behind.
 * ★ WHAT IT DECIDES. Nothing about money. It asks the server (POST /api/pay/guest/order-status) what became of the order; the server
 *   asks Razorpay and records the payment through the same path verify / the webhook use. A paid answer carries the receipt proof the
 *   existing purchase card, files, ZIP, attach and GST routes already take.
 * Kill switch: build env VITE_PAY_RETURN_DISABLED=1 -> nothing is stored, nothing is asked, no hint is shown (today's behaviour).
 */
import type { InAppBuyTarget } from "../utils/inAppPay";
import { currentInAppPay } from "../utils/inAppPay";
import { storeReceiptProof, type ReceiptProof } from "./paidReceiptProof";

export const ORDER_STATUS_ENDPOINT = "/api/pay/guest/order-status";
export const PENDING_STORE_KEY = "lt.payReturn.v1";
/** One entry lives this long (the server's own window is longer: 2 h from the order). */
export const PENDING_TTL_MS = 30 * 60 * 1000;
/** A short poll right after the return: 3 tries over ~10 s. */
export const POLL_TRIES = 3;
export const POLL_GAP_MS = 5000;
/** Entries kept (one per order); a tab that never finishes cannot grow the store. */
const MAX_ENTRIES = 5;

export function isPayReturnDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_PAY_RETURN_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** The pre-pay hint, only inside an in-app browser and only while the switch is on. */
export const PAY_RETURN_HINT = "Paying inside Instagram/Facebook? If GPay doesn't open, tap ⋮ → Open in Chrome.";
export const PAY_RETURN_FAILED = "Your payment didn't complete.";
export const PAY_RETURN_TRY_AGAIN = "Try again";
export const PAY_RETURN_CHECKING = "Checking your payment…";
export const PAY_RETURN_PENDING = "Checking your payment… if money was taken it will show here within a few minutes.";
export const PAY_RETURN_DISMISS = "Dismiss";

export interface PendingOrder {
  orderId: string;
  proof: string;
  /** Coarse page slug (analytics only). */
  host: string;
  /** What reopens the same checkout (the `?buy=` arrival every host already reads). */
  buy?: InAppBuyTarget;
  startedAt: number;
}

const ID_RE = /^[A-Za-z0-9_]{1,64}$/;
const PROOF_RE = /^[A-Za-z0-9_-]{16,64}$/;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function parseEntry(raw: unknown): PendingOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.orderId !== "string" || !ID_RE.test(r.orderId) || typeof r.proof !== "string" || !PROOF_RE.test(r.proof)) return null;
  if (typeof r.startedAt !== "number" || !Number.isFinite(r.startedAt)) return null;
  const b = r.buy as { kind?: unknown; sku?: unknown; target?: unknown } | undefined;
  let buy: InAppBuyTarget | undefined;
  if (b && b.kind === "pass") buy = { kind: "pass" };
  else if (b && b.kind === "pack" && typeof b.sku === "string" && b.sku) buy = { kind: "pack", sku: b.sku, ...(typeof b.target === "string" && b.target ? { target: b.target } : {}) };
  return { orderId: r.orderId, proof: r.proof, host: typeof r.host === "string" && /^[a-z0-9_]{1,24}$/.test(r.host) ? r.host : "other", ...(buy ? { buy } : {}), startedAt: r.startedAt };
}

/** Live entries only (30 min), newest first. Expired and malformed ones are removed as they are found. Never throws. */
export function readPendingOrders(now: number = Date.now(), store: Storage | null = storage()): PendingOrder[] {
  if (isPayReturnDisabled() || !store) return [];
  try {
    const raw = store.getItem(PENDING_STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    const live = list.map(parseEntry).filter((e): e is PendingOrder => e !== null && now - e.startedAt >= 0 && now - e.startedAt <= PENDING_TTL_MS);
    if (live.length !== list.length) writeAll(live, store);
    return live.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

function writeAll(list: PendingOrder[], store: Storage | null): void {
  try {
    if (!store) return;
    if (list.length === 0) store.removeItem(PENDING_STORE_KEY);
    else store.setItem(PENDING_STORE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage may be blocked or full: the resume then simply does not exist */
  }
}

/** Coarse page slug for analytics, from the path (never the query). */
export function hostSlug(pathname: string): string {
  const p = (pathname || "").toLowerCase().replace(/\/+$/, "");
  if (p === "/packs" || p.startsWith("/packs/")) return "packs";
  if (p === "/cbq-packs") return "cbq_packs";
  if (p === "/pricing") return "pricing";
  if (p === "/board-pass") return "board_pass";
  if (p === "/for-parents") return "for_parents";
  if (p === "/test-series") return "test_series";
  return "other";
}

/** What a checkout's item reopens (pure: no React). */
export function buyTargetOf(item: { kind: "pass" | "pack"; sku?: string; target?: string }): InAppBuyTarget | undefined {
  if (item.kind === "pass") return { kind: "pass" };
  return item.sku ? { kind: "pack", sku: item.sku, ...(item.target ? { target: item.target } : {}) } : undefined;
}

/** One entry per order: replaces the same order's entry, drops expired ones. Never throws. */
export function rememberPendingOrder(entry: { orderId: string; proof: string; item: { kind: "pass" | "pack"; sku?: string; target?: string } }, now: number = Date.now(), store: Storage | null = storage()): void {
  if (isPayReturnDisabled() || !store) return;
  if (!ID_RE.test(entry.orderId) || !PROOF_RE.test(entry.proof)) return;
  const buy = buyTargetOf(entry.item);
  const host = typeof window !== "undefined" ? hostSlug(window.location.pathname) : "other";
  const next: PendingOrder = { orderId: entry.orderId, proof: entry.proof, host, ...(buy ? { buy } : {}), startedAt: now };
  const others = readPendingOrders(now, store).filter((e) => e.orderId !== entry.orderId);
  writeAll([next, ...others], store);
}

export function forgetPendingOrder(orderId: string, store: Storage | null = storage()): void {
  if (!store) return;
  try {
    const raw = store.getItem(PENDING_STORE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    const list = (Array.isArray(parsed) ? parsed : []).map(parseEntry).filter((e): e is PendingOrder => e !== null && e.orderId !== orderId);
    writeAll(list, store);
  } catch {
    /* nothing to forget */
  }
}

/* ── "a Razorpay sheet is open in THIS page": no resume while it is ──────────────────────────────────────────────────────── */

let openSheets = 0;
export function isCheckoutSheetOpen(): boolean {
  return openSheets > 0;
}

/**
 * Called by a checkout around `checkout.open()`. `settle()` runs when the sheet reports a result (handler) or is closed by the buyer
 * (ondismiss): the sheet is no longer open and the order's entry is dropped. Idempotent. `remember: false` (a signed-in payer, or an
 * order the server gave no proof for) only tracks the open sheet.
 */
export function beginPendingCheckout(
  order: { orderId: string; statusProof?: string },
  item: { kind: "pass" | "pack"; sku?: string; target?: string },
  remember = true,
): { settle: () => void } {
  openSheets += 1;
  if (remember && order.statusProof) rememberPendingOrder({ orderId: order.orderId, proof: order.statusProof, item });
  let settled = false;
  return {
    settle: () => {
      if (settled) return;
      settled = true;
      openSheets = Math.max(0, openSheets - 1);
      forgetPendingOrder(order.orderId);
    },
  };
}

/** Test seam. */
export function resetPayReturnForTests(): void {
  openSheets = 0;
}

/* ── asking the server ──────────────────────────────────────────────────────────────────────────────────────────────────── */

export type OrderStatusOutcome =
  | { kind: "paid"; receipt: ReceiptProof }
  | { kind: "failed"; reason: string }
  | { kind: "pending"; reason: string }
  /** The server no longer knows this order / proof (expired, switched off, not ours): drop the entry quietly. */
  | { kind: "gone" }
  /** A network / server hiccup: try again later; the entry stays. */
  | { kind: "error" };

function readReceipt(raw: unknown): ReceiptProof | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return typeof r.orderId === "string" && r.orderId && typeof r.paymentId === "string" && r.paymentId && typeof r.signature === "string" && r.signature
    ? { orderId: r.orderId, paymentId: r.paymentId, signature: r.signature }
    : null;
}

export async function fetchOrderStatus(entry: Pick<PendingOrder, "orderId" | "proof">, fetchImpl: typeof fetch = fetch): Promise<OrderStatusOutcome> {
  try {
    const res = await fetchImpl(ORDER_STATUS_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: entry.orderId, proof: entry.proof }) });
    let j: Record<string, unknown> | null = null;
    try {
      j = (await res.json()) as Record<string, unknown>;
    } catch {
      j = null;
    }
    if (res.status === 404 || res.status === 403 || res.status === 410) return { kind: "gone" };
    if (!res.ok || !j || j.ok !== true) return { kind: "error" };
    if (j.status === "failed") return { kind: "failed", reason: typeof j.reason === "string" ? j.reason : "failed" };
    if (j.status === "pending") return { kind: "pending", reason: typeof j.reason === "string" ? j.reason : "pending" };
    const receipt = readReceipt(j.receipt);
    // Any other status is verify's own success body (paid_unclaimed) - the money is in; without a usable proof treat it as still recording.
    return receipt ? { kind: "paid", receipt } : { kind: "pending", reason: "recording" };
  } catch {
    return { kind: "error" };
  }
}

export interface ResumeDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  store?: Storage | null;
  /** Stop polling when this returns true (the page unmounted / a sheet opened). */
  cancelled?: () => boolean;
}

export type ResumeOutcome =
  | { kind: "none" }
  | { kind: "paid"; entry: PendingOrder; receipt: ReceiptProof }
  | { kind: "failed"; entry: PendingOrder; reason: string }
  | { kind: "pending"; entry: PendingOrder };

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Resolve the newest live entry: ask, and while the answer is "pending" (or a hiccup) ask again - POLL_TRIES tries POLL_GAP_MS apart.
 * Paid: the receipt proof is stored for this tab (the existing purchase card reads it on a reload) and the entry is dropped.
 * Failed / gone: the entry is dropped (failed is returned so the page can say so). Pending after the last try: the entry STAYS.
 * Does nothing while a Razorpay sheet is open in this page.
 */
export async function resumePendingPayment(deps: ResumeDeps = {}): Promise<ResumeOutcome> {
  const { fetchImpl = fetch, sleep = realSleep, now = () => Date.now(), store = storage(), cancelled = () => false } = deps;
  if (isPayReturnDisabled() || isCheckoutSheetOpen()) return { kind: "none" };
  const entry = readPendingOrders(now(), store)[0];
  if (!entry) return { kind: "none" };
  for (let i = 0; i < POLL_TRIES; i += 1) {
    if (cancelled() || isCheckoutSheetOpen()) return { kind: "none" };
    const out = await fetchOrderStatus(entry, fetchImpl);
    if (cancelled()) return { kind: "none" };
    if (out.kind === "paid") {
      storeReceiptProof(out.receipt);
      forgetPendingOrder(entry.orderId, store);
      return { kind: "paid", entry, receipt: out.receipt };
    }
    if (out.kind === "failed") {
      forgetPendingOrder(entry.orderId, store);
      return { kind: "failed", entry, reason: out.reason };
    }
    if (out.kind === "gone") {
      forgetPendingOrder(entry.orderId, store);
      return { kind: "none" };
    }
    if (i < POLL_TRIES - 1) await sleep(POLL_GAP_MS);
  }
  return { kind: "pending", entry };
}

/** The in-app slug for analytics: a vendor name or "none". */
export function inAppSlug(): "instagram" | "facebook" | "youtube" | "other" | "none" {
  return currentInAppPay()?.app ?? "none";
}

/** Whether the pre-pay hint shows: only inside an in-app browser, only with the switch on. */
export function showPayReturnHint(): boolean {
  return !isPayReturnDisabled() && currentInAppPay() !== null;
}

