/**
 * ORDER-DEDUP-1 - one in-flight buy per (path, product, target, buyer): a second tap while the first buy is still pending gets the SAME
 * promise (so one create-order request, one Razorpay sheet) instead of a second order. The key carries the product and the buyer, so a
 * different product / amount / number is a separate order; the entry is dropped when the buy settles (paid, dismissed or failed), so a
 * retry after a failure creates a fresh order. Memory only; nothing stored, no server contract touched.
 */
/** A buy older than this is never reused: a hung request / abandoned sheet must not leave a dead Pay button (a fresh tap starts a new order). */
export const ORDER_IN_FLIGHT_MAX_MS = 90_000;

const pending = new Map<string, { p: Promise<unknown>; at: number }>();

export function dedupeInFlight<T>(key: string, start: () => Promise<T>): Promise<T> {
  const running = pending.get(key);
  if (running && performance.now() - running.at < ORDER_IN_FLIGHT_MAX_MS) return running.p as Promise<T>;
  let p: Promise<T>;
  try {
    p = Promise.resolve(start());
  } catch (e) {
    p = Promise.reject(e); // a synchronous throw settles as a rejection and never occupies the key
  }
  const entry = { p: p as Promise<unknown>, at: performance.now() };
  const cleared = p.finally(() => {
    if (pending.get(key) === entry) pending.delete(key);
  });
  cleared.catch(() => undefined); // the caller owns the rejection; this branch only clears the key
  pending.set(key, entry);
  return p;
}

/** Test seam. */
export function __resetOrderInFlightForTests(): void {
  pending.clear();
}
export const resetOrderInFlight = __resetOrderInFlightForTests;
