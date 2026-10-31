/**
 * useMonthPassAvailable - PRICE-FIXED-1 (owner rulings, 31 Oct 2026).
 *
 * The month pass is hidden throughout the product. It is shown ONLY to an account that already has a PAID month
 * order, and only inside that account's own /pricing page and checkout (to renew). The answer is the SERVER's:
 * `POST /api/pay/status { offer: true }` -> `{ monthPassAvailable }`, derived from the server's own payment
 * records. The browser decides nothing: a signed-out visitor, a student the server has not answered yet, a failed
 * request and payments switched off are all `false` (the month option stays hidden - the safe default).
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authHeaders, isPaymentsClientEnabled, PAY_STATUS_ENDPOINT } from "../../services/checkout";

/** A FAILED answer (network error, 5xx, 429) is remembered this long, so a flaky server is not pinged on every mount. */
export const MONTH_PASS_FAILURE_TTL_MS = 5 * 60 * 1000;
let cached: { uid: string; value: boolean; until: number } | null = null;
const inflight = new Map<string, Promise<boolean>>();

/** TEST SEAM: forget the per-session answer. */
export function resetMonthPassAvailableForTests(): void {
  cached = null;
  inflight.clear();
}

/** Ask the server. Never throws: any failure is `false`. */
export async function fetchMonthPassAvailable(uid: string): Promise<boolean> {
  if (cached && cached.uid === uid && Date.now() < cached.until) return cached.value;
  const pending = inflight.get(uid);
  if (pending) return pending;
  const run = (async () => {
    try {
      const res = await fetch(PAY_STATUS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ offer: true }),
      });
      const json = (await res.json()) as { ok?: unknown; monthPassAvailable?: unknown };
      const answered = res.ok && json.ok === true && typeof json.monthPassAvailable === "boolean";
      const value = answered && json.monthPassAvailable === true;
      // A real answer lasts the session; a failed one (5xx, 429, malformed) is remembered for a few minutes.
      cached = { uid, value, until: answered ? Number.POSITIVE_INFINITY : Date.now() + MONTH_PASS_FAILURE_TTL_MS };
      return value;
    } catch {
      cached = { uid, value: false, until: Date.now() + MONTH_PASS_FAILURE_TTL_MS };
      return false;
    } finally {
      inflight.delete(uid);
    }
  })();
  inflight.set(uid, run);
  return run;
}

export function useMonthPassAvailable(): boolean {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const [available, setAvailable] = useState<boolean>(() => (cached && cached.uid === uid && Date.now() < cached.until ? cached.value : false));
  useEffect(() => {
    let cancelled = false;
    if (!uid || !isPaymentsClientEnabled()) {
      setAvailable(false);
      return undefined;
    }
    void fetchMonthPassAvailable(uid).then((v) => {
      if (!cancelled) setAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);
  return uid ? available : false;
}
