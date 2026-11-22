/**
 * META-IC-1 - Meta's InitiateCheckout fires when a Razorpay order has been CREATED, not at the Buy tap.
 *
 * Every product's order-create request (Board Pass / month pass `/api/pay/order`, pay-by-phone and pay-for-someone
 * `/api/pay/guest/order`, a parent's `/api/pay/parent/order`; packs, CBQ packs and the Test Series ride the same routes) builds its
 * body with `adSignalFields()`, which now carries a fresh checkout-attempt id (`adSignals.attemptId`). The server sends its
 * Conversions API InitiateCheckout with that id as event_id once it has created the order. This observer is the BROWSER half: it
 * watches those order-create POSTs and, when the response says `ok` and carries an `orderId`, sends the pixel InitiateCheckout with
 * `eventID` = the same attempt id, so Meta dedupes the pair to ONE event.
 *
 * It is a PASSIVE observer: the original `fetch` is called with the caller's own arguments and ITS promise is returned untouched
 * (the response body is read from a clone, in a separate chain whose every failure is swallowed). It never changes a request,
 * a response, a status or a timing the purchase depends on, and a failure in here can never reach the buyer.
 *
 * An "attempt" is ONE order-create call: a retry of the same request (same body, same id) is one event; a new order after a
 * failure is a new attempt with a new id. Tapping, the who-sheet, sign-in and a resumed link that creates no order send nothing.
 */
import { metaIcAtOrderDisabled } from "./metaIcFlag";
import { trackMetaInitiateCheckoutAtOrder } from "./analytics";

export const ORDER_IC_PATHS: readonly string[] = ["/api/pay/order", "/api/pay/guest/order", "/api/pay/parent/order"];

type FetchFn = typeof fetch;
type MarkedFetch = FetchFn & { __ltOrderIc?: true };

function pathOf(input: unknown): string {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input && typeof (input as { url?: unknown }).url === "string" ? (input as { url: string }).url : "";
    if (!raw) return "";
    return new URL(raw, "http://x.invalid").pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function readRequest(init: unknown): { attemptId: string; sku: string | null; viaParentPack: boolean } | null {
  try {
    const body = (init as { body?: unknown } | undefined)?.body;
    if (typeof body !== "string") return null;
    const json = JSON.parse(body) as Record<string, unknown>;
    const signals = json.adSignals as Record<string, unknown> | undefined;
    const attemptId = signals && typeof signals.attemptId === "string" ? signals.attemptId : "";
    if (!attemptId) return null;
    const sku = typeof json.passType === "string" ? json.passType : typeof json.sku === "string" ? json.sku : null;
    return { attemptId, sku, viaParentPack: json.product === "pack" };
  } catch {
    return null;
  }
}

async function observe(res: Response, request: { attemptId: string; sku: string | null; viaParentPack: boolean }): Promise<void> {
  try {
    if (!res || !res.ok || typeof res.clone !== "function") return;
    const json = (await res.clone().json()) as Record<string, unknown>;
    if (!json || json.ok !== true || typeof json.orderId !== "string" || !json.orderId) return;
    trackMetaInitiateCheckoutAtOrder({
      attemptId: request.attemptId,
      amountPaise: typeof json.amountPaise === "number" ? json.amountPaise : null,
      sku: request.viaParentPack ? null : request.sku,
    });
  } catch {
    /* analytics must never break the page */
  }
}

/** Idempotent. Called by `adSignalFields()`, i.e. only at the moment an order-create body is being built. */
export function installOrderIcObserver(): void {
  try {
    if (metaIcAtOrderDisabled()) return;
    const g = globalThis as unknown as { fetch?: MarkedFetch };
    const original = g.fetch;
    if (typeof original !== "function" || original.__ltOrderIc) return;
    const wrapped: MarkedFetch = function (this: unknown, ...args: Parameters<FetchFn>) {
      const promise = original.apply(this, args as never) as Promise<Response>;
      try {
        const init = args[1];
        const method = String((init as { method?: unknown } | undefined)?.method ?? "GET").toUpperCase();
        if (method === "POST" && ORDER_IC_PATHS.includes(pathOf(args[0]))) {
          const request = readRequest(init);
          if (request) void promise.then((res) => observe(res, request)).catch(() => undefined);
        }
      } catch {
        /* never reaches the caller */
      }
      return promise;
    } as MarkedFetch;
    wrapped.__ltOrderIc = true;
    g.fetch = wrapped;
  } catch {
    /* never reaches the buyer */
  }
}
