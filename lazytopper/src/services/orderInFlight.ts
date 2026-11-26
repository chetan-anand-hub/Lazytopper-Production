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

/**
 * ORDER-DEDUP-2 - client kill switch for the SIGNED-IN paths only (Board Pass `buyPass`, packs `buyPack`, top-ups `buyTopup`):
 * VITE_ORDER_DEDUP2_DISABLED=1 restores the pre-ORDER-DEDUP-2 behaviour there (every call starts its own order). The guest /
 * pay-first paths of ORDER-DEDUP-1 are not affected.
 */
export function isOrderDedup2Enabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_ORDER_DEDUP2_DISABLED;
    return !/^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return true;
  }
}

/** A stable small number per deps object: production always passes the one default deps object, so its key never changes;
 *  a test's own injected deps get their own key (no buy leaks between tests through a shared key). */
const depsIds = new WeakMap<object, number>();
let nextDepsId = 1;
function depsId(deps: object): number {
  let id = depsIds.get(deps);
  if (id === undefined) {
    id = nextDepsId++;
    depsIds.set(deps, id);
  }
  return id;
}

/** ORDER-DEDUP-2 - the signed-in paths: the SAME mechanism as ORDER-DEDUP-1 (`dedupeInFlight`), behind its own kill switch. */
export function dedupeSignedInBuy<T>(key: string, deps: object, start: () => Promise<T>): Promise<T> {
  if (!isOrderDedup2Enabled()) return start();
  return dedupeInFlight(`in|${key}|d${depsId(deps)}`, start);
}

/** Test seam. */
export function __resetOrderInFlightForTests(): void {
  pending.clear();
}
export const resetOrderInFlight = __resetOrderInFlightForTests;
