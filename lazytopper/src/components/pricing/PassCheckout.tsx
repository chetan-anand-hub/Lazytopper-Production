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
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { hydrateSubscriptionFromCloud } from "../../services/subscriptionService";
import { withSigninRedirect } from "../../services/freeCheckClient";
import {
  FOUNDING_OFFER_OPEN,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_DISPLAY,
  PRICE_MONTHLY_LIST_INR,
  tillBoardsQuote,
} from "../../config/pricing";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import {
  newCheckoutAttemptId,
  trackBeginCheckout,
  trackPurchase,
  type CheckoutDetails,
} from "../../analytics/analytics";
import {
  buyPass,
  checkPayStatus,
  formatPassDate,
  isPaymentsClientEnabled,
  onPaySettled,
  PAY_PENDING_TTL_MS,
  PAYMENT_CHECKING_COPY,
  PAYMENT_FAILED_COPY,
  PAYMENT_STILL_CONFIRMING_COPY,
  premiumActiveUntilCopy,
  premiumAlreadyActiveCopy,
  type BuyOutcome,
  type PassType,
  type PayStatusResult,
} from "../../services/checkout";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PASS_CHECKOUT_RETURN_PATH = "/pricing";

/** The monthly button's label, from the pricing module's display constants. */
export function monthButtonLabel(offerOpen: boolean): string {
  return `Pay ${offerOpen ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY} for a month`;
}

export const TILL_BOARDS_BUTTON_LABEL = "Pay once till your boards";

/**
 * PAY-RECOVER-1 — when (ms after the pending outcome) the server is asked about the order.
 * SPARSE on purpose: `/api/pay/status` shares the `payments` rate budget (20 soft / 60 hard a
 * day) with order and verify, and checkout.ts caps one order at MAX_STATUS_CHECKS_PER_ORDER
 * (6) status calls in a tab. Four polls leave two for "Check again" / the return-to-tab
 * refresh. (The spec's "about 0, 3, 8, 15, 30 s" thinned to four under the owner's budget.)
 */
export const PAY_STATUS_POLL_DELAYS_MS: readonly number[] = [0, 3_000, 10_000, 30_000];

export const CHECK_AGAIN_LABEL = "Check again";

/**
 * TRACK-2 — what the checkout events say was bought. The price is the SAME pricing-module
 * quote the server charges (month: the founding or list price; till boards: tillBoardsQuote
 * for today and the predicted board date). If the quote is unavailable the event carries no
 * value rather than an invented one.
 */
function checkoutEventDetails(passType: PassType, offerOpen: boolean): CheckoutDetails {
  if (passType === "month") {
    return {
      passType,
      itemName: "Premium pass for a month",
      valueInr: offerOpen ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR,
    };
  }
  const quote = tillBoardsQuote(new Date(), predictCbseExamDate("10"), offerOpen);
  return { passType, itemName: "Premium pass till your boards", valueInr: quote ? quote.priceInr : null };
}

export interface PassCheckoutViewProps {
  signedIn: boolean;
  offerOpen: boolean;
  /** The SERVER-written `passEnd` of a pass that is still running, else null. */
  activePassEnd: string | null;
  onSignIn: () => void;
  onBuy: (passType: PassType) => Promise<BuyOutcome>;
  /** PAY-RECOVER-1 — query the server about an order Razorpay signed as paid. Never throws. */
  onCheckStatus?: (orderId: string) => Promise<PayStatusResult>;
  /** Test seam: the poll schedule (ms from the pending outcome). */
  pollDelaysMs?: readonly number[];
  /**
   * Test seam: how long the Pay buttons stay held for an unresolved order. Default: the
   * pending marker's own life (30 min) — after that the order is forgotten and paying is
   * offered again.
   */
  pendingHoldMs?: number;
}

/**
 * Presentational half — every state the buy area can be in.
 *
 * PRICING-LIGHT-1 (P23): class names only. PricingPage lays the buy area out as two pass
 * tiles by making `.lt-pricing-checkout` `display: contents` inside its tile grid; these
 * class names place each child. Month button -> Month pass tile; till-boards button ->
 * Till-your-boards tile; the paid / already-active notices -> a full-width row above the
 * tiles; the failure alert -> a full-width row below. Nothing here decides a state.
 */
export function PassCheckoutView({
  signedIn,
  offerOpen,
  activePassEnd,
  onSignIn,
  onBuy,
  onCheckStatus = checkPayStatus,
  pollDelaysMs = PAY_STATUS_POLL_DELAYS_MS,
  pendingHoldMs = PAY_PENDING_TTL_MS,
}: PassCheckoutViewProps) {
  const [busy, setBusy] = useState<PassType | null>(null);
  const [paidUntil, setPaidUntil] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** PAY-RECOVER-1 — "checking" while polls run; "confirming" once they ran out still pending. */
  const [recovery, setRecovery] = useState<null | "checking" | "confirming">(null);
  const pendingRef = useRef<{ orderId: string; details: CheckoutDetails; attemptId: string; paymentId?: string } | null>(null);
  const pollRun = useRef(0);
  const mounted = useRef(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHold() {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pollRun.current += 1; // cancels any running poll loop
      clearHold();
    };
  }, []);

  // PAY-RECOVER-1 — a server `paid` for THIS order may arrive through the return-to-tab
  // refresh (useSubscription) rather than our own polls; settle the same way either way.
  const settleRef = useRef<(result: Extract<PayStatusResult, { state: "paid" }>) => void>(() => undefined);
  useEffect(
    () =>
      onPaySettled((orderId, result) => {
        if (pendingRef.current && pendingRef.current.orderId === orderId) settleRef.current(result);
      }),
    [],
  );

  const activeLabel = formatPassDate(activePassEnd);

  /** A SERVER `paid` for the pending order: the same active copy and the one `purchase`. */
  function settlePaid(result: Extract<PayStatusResult, { state: "paid" }>) {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    pollRun.current += 1; // stops any poll loop still running for this order
    clearHold();
    // trackPurchase dedupes per transaction id in this tab (P9), so a payment the verify
    // DID record before its response was lost is still counted once.
    trackPurchase({
      ...pending.details,
      ...(result.amountInr !== undefined ? { valueInr: result.amountInr } : {}),
      transactionId: result.paymentId || pending.paymentId || pending.attemptId,
    });
    setRecovery(null);
    const label = formatPassDate(result.passEnd);
    // An unreadable server date: no active copy is invented; the hydrated pass shows instead.
    if (label) setPaidUntil(label);
  }

  settleRef.current = settlePaid;

  /** Query the server at each delay; stop on paid, on unmount, or on a newer run. */
  async function pollStatus(delays: readonly number[]) {
    const pending = pendingRef.current;
    if (!pending) return;
    const run = ++pollRun.current;
    setRecovery("checking");
    let elapsed = 0;
    for (const at of delays) {
      const wait = Math.max(0, at - elapsed);
      elapsed = Math.max(elapsed, at);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (!mounted.current || run !== pollRun.current) return;
      const result = await onCheckStatus(pending.orderId).catch((): PayStatusResult => ({ state: "unknown" }));
      if (!mounted.current || run !== pollRun.current) return;
      if (result.state === "paid") {
        settlePaid(result);
        return;
      }
    }
    setRecovery("confirming");
  }

  async function handleBuy(passType: PassType) {
    if (busy || recovery !== null) return;
    if (!signedIn) {
      onSignIn();
      return;
    }
    setBusy(passType);
    setFailed(false);
    setRecovery(null);
    pendingRef.current = null;
    clearHold();
    const details = checkoutEventDetails(passType, offerOpen);
    const attemptId = newCheckoutAttemptId();
    trackBeginCheckout(details);
    const outcome = await onBuy(passType);
    setBusy(null);
    if (outcome.status === "paid") {
      // TRACK-2: the ONLY `purchase` call site — the server has verified this payment.
      // FOLLOWUPS-1 A4: Razorpay's payment id as transaction_id and the SERVER order's rupee
      // amount as value when the outcome carries them; else the per-attempt id / config quote.
      trackPurchase({
        ...details,
        ...(outcome.amountInr !== undefined ? { valueInr: outcome.amountInr } : {}),
        transactionId: outcome.paymentId || attemptId,
      });
      const label = formatPassDate(outcome.passEnd);
      if (label) setPaidUntil(label);
      else setFailed(true);
    } else if (outcome.status === "pending") {
      // PAY-RECOVER-1 — Razorpay signed a success; never the failure sentence from here on.
      pendingRef.current = {
        orderId: outcome.orderId,
        details,
        attemptId,
        ...(outcome.paymentId ? { paymentId: outcome.paymentId } : {}),
      };
      // MONEY: the Pay buttons stay held while this order is unresolved, so a student who
      // was charged is never invited to pay a second time. They come back only when the
      // order is forgotten — the pending marker's 30-minute life.
      clearHold();
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        if (!mounted.current) return;
        pendingRef.current = null;
        pollRun.current += 1;
        setRecovery(null);
      }, pendingHoldMs);
      await pollStatus(pollDelaysMs);
    } else if (outcome.status === "failed") {
      setFailed(true);
    }
  }

  function handleCheckAgain() {
    if (recovery !== "confirming") return;
    void pollStatus([0]);
  }

  if (paidUntil) {
    return (
      <div className="lt-pricing-checkout" data-testid="pass-checkout">
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" role="status" data-testid="pass-checkout-paid">
          {premiumActiveUntilCopy(paidUntil)}
        </p>
      </div>
    );
  }

  return (
    <div className="lt-pricing-checkout" data-testid="pass-checkout">
      {activeLabel && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" data-testid="pass-checkout-already-active">
          {premiumAlreadyActiveCopy(activeLabel)}
        </p>
      )}
      <button
        type="button"
        className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--month"
        disabled={busy !== null || recovery !== null}
        onClick={() => void handleBuy("month")}
      >
        {monthButtonLabel(offerOpen)}
      </button>
      <button
        type="button"
        className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--boards"
        disabled={busy !== null || recovery !== null}
        onClick={() => void handleBuy("till_boards")}
      >
        {TILL_BOARDS_BUTTON_LABEL}
      </button>
      {failed && !recovery && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom" role="alert" data-testid="pass-checkout-failed">
          {PAYMENT_FAILED_COPY}
        </p>
      )}
      {recovery === "checking" && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom" role="status" data-testid="pass-checkout-checking">
          {PAYMENT_CHECKING_COPY}
        </p>
      )}
      {recovery === "confirming" && (
        <div className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom" role="status" data-testid="pass-checkout-confirming">
          <p>{PAYMENT_STILL_CONFIRMING_COPY}</p>
          <button type="button" className="lt-pricing-cta lt-pricing-cta--secondary lt-pricing-check-again" onClick={handleCheckAgain}>
            {CHECK_AGAIN_LABEL}
          </button>
        </div>
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
      onCheckStatus={async (orderId) => {
        const result = await checkPayStatus(orderId);
        // PAY-RECOVER-1 — a server `paid` wrote the pass: re-read it (the emitter updates the shell).
        if (result.state === "paid" && uid) void hydrateSubscriptionFromCloud(uid).catch(() => undefined);
        return result;
      }}
    />
  );
}

/** Mounted by PricingPage. Renders nothing — and calls no hook — while payments are dark. */
export default function PassCheckout() {
  if (!isPaymentsClientEnabled()) return null;
  return <PassCheckoutConnected />;
}
