/**
 * PassCheckout — the pricing page's buy area once payments are switched on (RAZORPAY-1).
 *
 * ★★ DARK BY DEFAULT (Z1). With `VITE_PAYMENTS_ENABLED` unset, the default export
 * renders NOTHING and calls no hook, so PricingPage keeps its manual-activation copy and
 * renders byte-for-byte as before (pinned by PassCheckout.test.tsx).
 *
 * ★★ NO CLIENT-SIDE PREMIUM. "Premium is active until …" is rendered ONLY from the
 * `passEnd` the server's grant returned; the "already active" notice (Z10) only from the
 * cloud-hydrated, server-written `passEnd`. Nothing here writes an entitlement.
 *
 * ★ SIGNED-OUT -> SIGN IN FIRST (Z3), returning to a FIXED internal path (/pricing) —
 * no caller-supplied destination ever reaches the redirect.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { hydrateSubscriptionFromCloud } from "../../services/subscriptionService";
import { withSigninRedirect } from "../../services/freeCheckClient";
import {
  FOUNDING_OFFER_OPEN,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
} from "../../config/pricing";
import {
  buyPass,
  formatPassDate,
  isPaymentsClientEnabled,
  PAYMENT_FAILED_COPY,
  premiumActiveUntilCopy,
  premiumAlreadyActiveCopy,
  type BuyOutcome,
  type PassType,
} from "../../services/checkout";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PASS_CHECKOUT_RETURN_PATH = "/pricing";

/** The monthly button's label, from the pricing module's display constants. */
export function monthButtonLabel(offerOpen: boolean): string {
  return `Pay ${offerOpen ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY} for a month`;
}

export const TILL_BOARDS_BUTTON_LABEL = "Pay once till your boards";

export interface PassCheckoutViewProps {
  signedIn: boolean;
  offerOpen: boolean;
  /** The SERVER-written `passEnd` of a pass that is still running, else null. */
  activePassEnd: string | null;
  onSignIn: () => void;
  onBuy: (passType: PassType) => Promise<BuyOutcome>;
}

/** Presentational half — every state the buy area can be in. */
export function PassCheckoutView({ signedIn, offerOpen, activePassEnd, onSignIn, onBuy }: PassCheckoutViewProps) {
  const [busy, setBusy] = useState<PassType | null>(null);
  const [paidUntil, setPaidUntil] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const activeLabel = formatPassDate(activePassEnd);

  async function handleBuy(passType: PassType) {
    if (busy) return;
    if (!signedIn) {
      onSignIn();
      return;
    }
    setBusy(passType);
    setFailed(false);
    const outcome = await onBuy(passType);
    setBusy(null);
    if (outcome.status === "paid") {
      const label = formatPassDate(outcome.passEnd);
      if (label) setPaidUntil(label);
      else setFailed(true);
    } else if (outcome.status === "failed") {
      setFailed(true);
    }
  }

  if (paidUntil) {
    return (
      <div className="lt-pricing-checkout" data-testid="pass-checkout">
        <p className="lt-pricing-plan-desc" role="status" data-testid="pass-checkout-paid">
          {premiumActiveUntilCopy(paidUntil)}
        </p>
      </div>
    );
  }

  return (
    <div className="lt-pricing-checkout" data-testid="pass-checkout">
      {activeLabel && (
        <p className="lt-pricing-plan-desc" data-testid="pass-checkout-already-active">
          {premiumAlreadyActiveCopy(activeLabel)}
        </p>
      )}
      <button
        type="button"
        className="lt-pricing-cta lt-pricing-cta--primary"
        disabled={busy !== null}
        onClick={() => void handleBuy("month")}
      >
        {monthButtonLabel(offerOpen)}
      </button>
      <button
        type="button"
        className="lt-pricing-cta lt-pricing-cta--secondary"
        disabled={busy !== null}
        onClick={() => void handleBuy("till_boards")}
      >
        {TILL_BOARDS_BUTTON_LABEL}
      </button>
      {failed && (
        <p className="lt-pricing-plan-desc" role="alert" data-testid="pass-checkout-failed">
          {PAYMENT_FAILED_COPY}
        </p>
      )}
    </div>
  );
}

/** Connected half — identity, the server-written pass, and the purchase. */
function PassCheckoutConnected() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, hydrated } = useSubscription();
  const uid = user?.uid ?? "";

  const passEndMs = status.passEnd ? Date.parse(status.passEnd) : NaN;
  const activePassEnd =
    hydrated && status.tier === "premium" && Number.isFinite(passEndMs) && passEndMs > Date.now()
      ? (status.passEnd as string)
      : null;

  return (
    <PassCheckoutView
      signedIn={Boolean(uid)}
      offerOpen={FOUNDING_OFFER_OPEN}
      activePassEnd={activePassEnd}
      onSignIn={() => navigate(withSigninRedirect("/login", PASS_CHECKOUT_RETURN_PATH))}
      onBuy={async (passType) => {
        const outcome = await buyPass(passType);
        // Refresh the cached entitlement from the SERVER record the grant just wrote.
        if (outcome.status === "paid" && uid) void hydrateSubscriptionFromCloud(uid).catch(() => undefined);
        return outcome;
      }}
    />
  );
}

/** Mounted by PricingPage. Renders nothing — and calls no hook — while payments are dark. */
export default function PassCheckout() {
  if (!isPaymentsClientEnabled()) return null;
  return <PassCheckoutConnected />;
}
