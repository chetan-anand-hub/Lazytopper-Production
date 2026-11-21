/**
 * PayReturnHint - PAY-RETURN-1: ONE line above a pay button, only inside an Instagram / Facebook / other in-app browser, where UPI apps
 * often cannot be reached from the payment sheet. Renders nothing in a normal browser and with VITE_PAY_RETURN_DISABLED=1.
 */
import { useState } from "react";
import { PAY_RETURN_HINT, isPayReturnDisabled, showPayReturnHint } from "../../services/payReturn";
import "./payReturn.css";

/** `inApp` is a test seam; production reads the browser. */
export default function PayReturnHint({ inApp }: { inApp?: boolean }) {
  const [show] = useState(() => (inApp === undefined ? showPayReturnHint() : inApp && !isPayReturnDisabled()));
  if (!show) return null;
  return (
    <p className="lt-prr__hint" data-testid="pay-return-hint">
      {PAY_RETURN_HINT}
    </p>
  );
}
