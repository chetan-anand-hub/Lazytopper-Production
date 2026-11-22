import { useEffect, useState } from "react";
import { CHECKOUT_SLOW_AFTER_MS } from "../services/checkout";
import { onCheckoutSheetShown } from "../services/checkoutTiming";

/**
 * CHECKOUT-FAST-1 - true once `active` has been true for `afterMs` (default 6 s) WITHOUT Razorpay's sheet becoming visible: the buy is still
 * waiting for Razorpay, so the button adds "Still connecting to Razorpay". Resets when `active` goes false; stops the moment the sheet shows.
 * A timer and a listener only: nothing is read or sent.
 */
export function useCheckoutSlow(active: boolean, afterMs: number = CHECKOUT_SLOW_AFTER_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const t = window.setTimeout(() => setSlow(true), afterMs);
    const off = onCheckoutSheetShown(() => {
      window.clearTimeout(t);
      setSlow(false);
    });
    return () => {
      window.clearTimeout(t);
      off();
    };
  }, [active, afterMs]);
  return active && slow;
}
