/**
 * topupBuy - TOPUP-GO-1: the whole purchase of one usage top-up: order -> Razorpay checkout -> server verify.
 *
 * ★ NO SECOND RAZORPAY INTEGRATION. It reuses services/checkout.ts (the pack order call `createPackOrder`, the one checkout.js
 *   loader, the pending-order marker, the server-price confirm, the UPI-first / prefill options). Only the VERIFY differs: a top-up's
 *   server answer is `{ ok, topup: true }`, not a pass or a pack, so `verifyPayment` / `verifyPackPayment` (which insist on a
 *   `passEnd` / a pack) cannot read it.
 * ★ THE BROWSER DECIDES NOTHING ABOUT MONEY. Only the pack KEY is sent; the server prices the order. The credit is believed only
 *   from the server's verify (or its status) answer, never from Razorpay's success callback alone.
 * Never throws: the outcome is a value.
 */
import {
  authHeaders,
  clearPayPending,
  createPackOrder,
  loadCheckoutScript,
  PAY_STATUS_ENDPOINT,
  PAY_VERIFY_ENDPOINT,
  PayOrderExpiredError,
  prefillOption,
  readCheckoutPrefill,
  watchPaymentFailed,
  writePayPending,
  type CheckoutPrefill,
  type PayOrder,
  type RazorpayConstructor,
  type RazorpaySuccess,
} from "../../services/checkout";
import { confirmServerPrice, razorpaySheetDescription } from "../../services/priceConfirm";
import { isGstBuyerCancelled } from "../../services/gstBuyerOrder";
import { razorpayUpiFirstOption } from "../../services/razorpayDisplay";
import { invalidateUsage } from "../../services/usageClient";
import { dedupeSignedInBuy } from "../../services/orderInFlight";
import type { TopupKey } from "../../config/topup";

export type TopupOutcome =
  | { status: "paid"; orderId: string }
  | { status: "dismissed" }
  /** Razorpay signed a success but the server could not confirm it yet: never "failed", never a second charge. */
  | { status: "pending"; orderId: string }
  | { status: "failed" };

export interface TopupBuyDeps {
  createOrder: (key: TopupKey) => Promise<PayOrder>;
  loadScript: () => Promise<RazorpayConstructor>;
  /** True when the server confirms the credit for this signed payment. */
  verify: (success: RazorpaySuccess) => Promise<boolean>;
  /** One "is it through?" read of the caller's own order; true only when the server says paid. */
  status: (orderId: string) => Promise<boolean>;
  prefill: () => Promise<CheckoutPrefill>;
  wait: (ms: number) => Promise<void>;
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown> | null> {
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
  if (!res.ok && parsed && parsed.reason === "order_expired") throw new PayOrderExpiredError();
  return res.ok && parsed && parsed.ok === true ? parsed : null;
}

const DEFAULT_DEPS: TopupBuyDeps = {
  createOrder: (key) => createPackOrder(key),
  loadScript: () => loadCheckoutScript(),
  verify: async (success) => {
    const json = await postJson(PAY_VERIFY_ENDPOINT, {
      orderId: success.razorpay_order_id,
      paymentId: success.razorpay_payment_id,
      signature: success.razorpay_signature,
    });
    return json !== null && json.topup === true;
  },
  status: async (orderId) => {
    const json = await postJson(PAY_STATUS_ENDPOINT, { orderId });
    return json !== null && json.state === "paid" && json.topup === true;
  },
  prefill: readCheckoutPrefill,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** What Razorpay shows inside its window. ASCII-safe through razorpaySheetDescription. */
export const TOPUP_CHECKOUT_DESCRIPTION = "Extra usage for your Board Pass, valid till your boards";

/** After a signed success whose verify errored: ask the server a few times before saying "still confirming". */
const STATUS_TRIES = 3;
const STATUS_GAP_MS = 2500;

export function buyTopup(key: TopupKey, deps: TopupBuyDeps = DEFAULT_DEPS): Promise<TopupOutcome> {
  // ORDER-DEDUP-2: a second tap on the same top-up while this buy is pending shares it: one order.
  return dedupeSignedInBuy(`topup|${key}`, deps, () => buyTopupOnce(key, deps));
}

async function buyTopupOnce(key: TopupKey, deps: TopupBuyDeps): Promise<TopupOutcome> {
  try {
    const [order, Razorpay, prefill] = await Promise.all([
      deps.createOrder(key),
      deps.loadScript(),
      deps.prefill().catch((): CheckoutPrefill => ({})),
    ]);
    // The server's total differs from what this device showed -> confirm it before Razorpay opens.
    if (!(await confirmServerPrice(order))) return { status: "dismissed" };
    writePayPending(order.orderId);
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise, // the SERVER's order amount - the checkout charges the order
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: razorpaySheetDescription(TOPUP_CHECKOUT_DESCRIPTION, order),
        handler: (response) => resolve(response),
        modal: { ondismiss: () => resolve(null) },
        ...razorpayUpiFirstOption(),
        ...prefillOption(prefill),
      });
      watchPaymentFailed(checkout, () => undefined);
      checkout.open();
    });
    if (!success) return { status: "dismissed" };
    let verified = false;
    try {
      verified = await deps.verify(success);
    } catch (e) {
      if (e instanceof PayOrderExpiredError) {
        clearPayPending(order.orderId);
        return { status: "failed" };
      }
    }
    if (!verified) {
      for (let i = 0; i < STATUS_TRIES && !verified; i += 1) {
        await deps.wait(STATUS_GAP_MS);
        verified = await deps.status(order.orderId).catch(() => false);
      }
    }
    if (!verified) return { status: "pending", orderId: order.orderId };
    clearPayPending(order.orderId);
    invalidateUsage(); // the usage numbers moved: the next read is fresh
    return { status: "paid", orderId: order.orderId };
  } catch (e) {
    if (isGstBuyerCancelled(e)) return { status: "dismissed" };
    return { status: "failed" };
  }
}
