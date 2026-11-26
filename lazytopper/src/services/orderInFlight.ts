/**
 * ORDER-DEDUP-1 - one in-flight buy per (path, product, target, buyer): a second tap while the first buy is still pending gets the SAME
 * promise (so one create-order request, one Razorpay sheet) instead of a second order. The key carries the product and the buyer, so a
 * different product / amount / number is a separate order; the entry is dropped when the buy settles (paid, dismissed or failed), so a
 * retry after a failure creates a fresh order. Memory only; nothing stored, no server contract touched.
 */
const pending = new Map<string, Promise<unknown>>();

export function dedupeInFlight<T>(key: string, start: () => Promise<T>): Promise<T> {
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const p = start().finally(() => {
    if (pending.get(key) === p) pending.delete(key);
  });
  pending.set(key, p);
  return p;
}

/** Test seam. */
export function resetOrderInFlight(): void {
  pending.clear();
}
