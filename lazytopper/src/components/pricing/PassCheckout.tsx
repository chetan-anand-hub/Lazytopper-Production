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
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { hydrateSubscriptionFromCloud } from "../../services/subscriptionService";
import { withSigninRedirect } from "../../services/freeCheckClient";
import {
  boardPassPriceDisplay,
  foundingRateApplies,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_DISPLAY,
  PRICE_MONTHLY_LIST_INR,
  tillBoardsQuote,
} from "../../config/pricing";
import { BOARD_PASS_BUY_PARAM, BOARD_PASS_BUY_PATH, BOARD_PASS_BUY_VALUE, readBoardPassBuy } from "./boardPassBuy";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { fetchMyPacks, type BoardPassCredit } from "../../services/packs";
import { useMonthPassAvailable } from "./useMonthPassAvailable";
import PayRescueCard from "../payRescue/PayRescueCard";
import GuestPaySheet from "../guestPay/GuestPaySheet";
import { isGuestPayClientEnabled, maskIndianMobile, type GuestSigninState } from "../../services/guestPay";
import { isCheckoutWhoClientEnabled } from "../../services/checkoutWhoFlag";
import { maskEmail } from "../../services/checkoutWhoFlag";

/** CHECKOUT-WHO-1 - "Who will use it?": its own lazy chunk, loaded only when the flag is on and a Pay is tapped. */
const CheckoutSheet = lazy(() => import("../checkoutWho/CheckoutSheet"));

/**
 * CHECKOUT-WHO-1 - set ONLY while VITE_CHECKOUT_WHO_ENABLED is on. Then the Board Pass Pay (and the ?buy= one-tap start) opens
 * the shared "Who will use it?" sheet first: signed in, its "Pay" runs the unchanged checkout below; signed out / someone else,
 * the sheet pays as a recipient purchase. Absent (flag off): every path below is exactly as before.
 */
export interface PassWhoWiring {
  selfMasked: string | null;
  onSignIn: () => void;
  onSignInWithNumber: (tenDigitNumber: string) => void;
  onSignInWithEmail: () => void;
}
import "./passCheckoutRepay.css";
import {
  newCheckoutAttemptId,
  trackBeginCheckoutTap,
  trackNamedEvent,
  trackPurchase,
  type CheckoutDetails,
} from "../../analytics/analytics";
import {
  BOARD_PASS_CHECKOUT_DESCRIPTION,
  buyPass,
  checkPayStatus,
  formatPassDate,
  isPaymentsClientEnabled,
  onPaySettled,
  PAY_PENDING_TTL_MS,
  PAYMENT_CHECKING_COPY,
  PAYMENT_FAILED_COPY,
  ORDER_EXPIRED_COPY,
  PAYMENT_STILL_CONFIRMING_COPY,
  premiumActiveUntilCopy,
  premiumAlreadyActiveCopy,
  type BuyOutcome,
  type PassType,
  type PayStatusResult,
} from "../../services/checkout";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PASS_CHECKOUT_RETURN_PATH = "/pricing";

export { BOARD_PASS_BUY_PARAM, BOARD_PASS_BUY_PATH, BOARD_PASS_BUY_VALUE, readBoardPassBuy };

/** The monthly button's label, from the pricing module's display constants. */
export function monthButtonLabel(offerOpen: boolean): string {
  return `Pay ${offerOpen ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY} for a month`;
}

/** A function: the price follows the founding deadline, so the label is read at RENDER time. */
export const tillBoardsButtonLabel = (): string => `Pay ${boardPassPriceDisplay()} once till your boards`;
/** PAY-PHONE-1 (C) - the button that stays at the top after the Board Pass checkout was closed without paying. */
export const repayBoardPassLabel = (): string => `Pay ${boardPassPriceDisplay()}`;

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
 * PACK-CREDIT-1 - the Board Pass credit line. Every number is the SERVER's (`/api/packs/mine`): the
 * credit, the price the student then pays, and the day the credit lapses. The browser subtracts nothing.
 */
export function packCreditLine(credit: BoardPassCredit): string | null {
  const till = formatCreditDeadline(credit.expiresAtMs);
  if (!till) return null;
  return `Your pack credit: ₹${credit.creditInr} off — Board Pass ₹${credit.payInr} for you, till ${till}`;
}

/** "1 Nov, 9:20 pm IST" — the exact instant the credit lapses, in IST. */
function formatCreditDeadline(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  const parts = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("day");
  const month = get("month");
  const hour = get("hour");
  const minute = get("minute");
  const period = get("dayPeriod").toLowerCase();
  if (!day || !month || !hour || !minute || !period) return null;
  return `${day} ${month}, ${hour}:${minute} ${period} IST`;
}

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
  /**
   * PRICE-FIXED-1: show the month button. TRUE ONLY for an account the server says already has a paid month order
   * (they renew here). Default false: the month pass is hidden from everyone else.
   */
  showMonth?: boolean;
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
  /** PACK-CREDIT-1 - the server's Board Pass credit for this student, or null. Hidden when signed out or Premium is active. */
  packCredit?: BoardPassCredit | null;
  /**
   * OFFERS-V2 A2 - start the Board Pass checkout ONCE, as if the Pay button was tapped. The connected half sets it only for a signed-in,
   * hydrated, non-Premium student who arrived on /pricing?buy=board_pass (and has already removed that param). Never repeats on re-render.
   */
  autoStart?: boolean;
  /** CHECKOUT-WHO-1 - see PassWhoWiring. Undefined = today's flow. */
  who?: PassWhoWiring;
}

/**
 * Presentational half — every state the buy area can be in.
 *
 * PRICE-FIXED-1 (owner, 31 Oct 2026): the Board Pass button is the only one, EXCEPT for a prior month buyer
 * (`showMonth`), who also gets the month button to renew. Payment logic below is untouched.
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
  showMonth = false,
  activePassEnd,
  onSignIn,
  onBuy,
  onCheckStatus = checkPayStatus,
  pollDelaysMs = PAY_STATUS_POLL_DELAYS_MS,
  pendingHoldMs = PAY_PENDING_TTL_MS,
  packCredit = null,
  autoStart = false,
  who,
}: PassCheckoutViewProps) {
  /** CHECKOUT-WHO-1 - the "Who will use it?" sheet is open (only ever with `who`). */
  const [whoOpen, setWhoOpen] = useState(false);
  const [busy, setBusy] = useState<PassType | null>(null);
  const [paidUntil, setPaidUntil] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** PRICING-1 — the server refused the order as expired: "start again", never the pending copy. */
  const [expired, setExpired] = useState(false);
  /** PAY-RECOVER-1 — "checking" while polls run; "confirming" once they ran out still pending. */
  const [recovery, setRecovery] = useState<null | "checking" | "confirming">(null);
  /** PAY-RESCUE-1 — the checkout sheet was closed: the pass whose "Can't pay yourself?" card is showing, else null. */
  const [rescue, setRescue] = useState<PassType | null>(null);
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
      if (result.state === "expired") {
        pendingRef.current = null;
        pollRun.current += 1;
        clearHold();
        setRecovery(null);
        setExpired(true);
        return;
      }
    }
    setRecovery("confirming");
  }

  async function handleBuy(passType: PassType, opts: { resumed?: boolean; fromWho?: boolean } = {}) {
    if (busy || recovery !== null) return;
    const details = checkoutEventDetails(passType, offerOpen);
    // BUY-PATH-1: `begin_checkout` at the TAP, signed in or not (a signed-out tap used to return before any event).
    // ONE call per tap: the signed-in path below no longer sends its own. (CHECKOUT-WHO-1: the sheet's own "Pay" is the
    // same tap continuing, so it sends none.)
    if (!opts.fromWho) trackBeginCheckoutTap(details, signedIn, opts.resumed === true);
    // CHECKOUT-WHO-1 - flag on: the Board Pass Pay opens "Who will use it?" first (the month renewal stays as it was).
    if (who && passType === "till_boards" && !opts.fromWho) {
      setWhoOpen(true);
      return;
    }
    if (!signedIn) {
      onSignIn();
      return;
    }
    setBusy(passType);
    setFailed(false);
    setExpired(false);
    setRescue(null);
    setRecovery(null);
    pendingRef.current = null;
    clearHold();
    const attemptId = newCheckoutAttemptId();
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
    } else if (outcome.status === "expired") {
      setExpired(true);
    } else if (outcome.status === "dismissed") {
      // PAY-RESCUE-1 — the sheet was closed (with or without a failed payment first): offer the parent hand-off.
      setRescue(passType);
    }
  }

  // OFFERS-V2 A2: the one-tap start. A ref makes it once per mount, so a re-render, a StrictMode re-run or a prop flicker never opens a second order.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void handleBuy("till_boards", { resumed: true }); // the ?buy=board_pass auto-start, not a tap on this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

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

  // PACK-CREDIT-1: signed in, no running Premium, nothing else in the notice slot (they share one grid row).
  const creditLine =
    signedIn && !activeLabel && packCredit && !failed && !expired && !recovery ? packCreditLine(packCredit) : null;

  return (
    <div className="lt-pricing-checkout" data-testid="pass-checkout">
      {activeLabel && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" data-testid="pass-checkout-already-active">
          {premiumAlreadyActiveCopy(activeLabel)}
        </p>
      )}
      {rescue === "till_boards" && !recovery && !activeLabel && (
        <div className="lt-pricing-checkout-note lt-pricing-checkout-note--top lt-pricing-repay" data-testid="pass-checkout-repay">
          <span>Checkout closed. Your Board Pass is one tap away.</span>
          <button
            type="button"
            className="lt-pricing-cta lt-pricing-repay__btn"
            disabled={busy !== null}
            onClick={() => {
              setRescue(null);
              void handleBuy("till_boards");
            }}
          >
            {repayBoardPassLabel()}
          </button>
        </div>
      )}
      {showMonth && (
        <button
          type="button"
          className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--month"
          disabled={busy !== null || recovery !== null}
          onClick={() => void handleBuy("month")}
        >
          {monthButtonLabel(offerOpen)}
        </button>
      )}
      <button
        type="button"
        className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--boards"
        disabled={busy !== null || recovery !== null}
        onClick={() => void handleBuy("till_boards")}
      >
        {tillBoardsButtonLabel()}
      </button>
      {creditLine && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom lt-pack-credit-note" data-testid="pass-checkout-pack-credit">
          {creditLine}
        </p>
      )}
      {rescue && !recovery && (
        <div className="lt-pricing-checkout-note lt-pricing-checkout-note--bottom" data-testid="pass-checkout-rescue">
          <PayRescueCard
            kind="pass"
            onRetry={() => {
              const again = rescue;
              setRescue(null);
              void handleBuy(again);
            }}
            onClose={() => setRescue(null)}
          />
        </div>
      )}
      {failed && !recovery && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom" role="alert" data-testid="pass-checkout-failed">
          {PAYMENT_FAILED_COPY}
        </p>
      )}
      {expired && !recovery && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom" role="alert" data-testid="pass-checkout-expired">
          {ORDER_EXPIRED_COPY}
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
      {who && whoOpen && (
        <Suspense fallback={null}>
          <CheckoutSheet
            item={{ kind: "pass", sku: "till_boards", label: "Board Pass", description: BOARD_PASS_CHECKOUT_DESCRIPTION, priceDisplay: boardPassPriceDisplay() }}
            signedIn={signedIn}
            selfMasked={who.selfMasked}
            {...(signedIn && packCredit ? { selfPriceDisplay: `₹${packCredit.payInr.toLocaleString("en-IN")}` } : {})}
            onPaySelf={() => void handleBuy("till_boards", { fromWho: true })}
            onSignIn={who.onSignIn}
            onSignInWithNumber={who.onSignInWithNumber}
            onSignInWithEmail={who.onSignInWithEmail}
            onClose={() => setWhoOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

/** Connected half — identity, the server-written pass, and the purchase. */
function PassCheckoutConnected() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { status, hydrated } = useSubscription();
  const uid = user?.uid ?? "";
  const showMonth = useMonthPassAvailable();

  // OFFERS-V2 A2 - /pricing?buy=board_pass. Once the account and its record are known: remove the param FIRST (replace, so reload and Back never
  // re-trigger), then start the existing Board Pass checkout once. Premium (a pass or an admin grant) does nothing. Signed out goes to sign-in
  // with this fixed internal path as the return, so the same link resumes. Payments dark: this component is not mounted, nothing starts.
  const [autoStart, setAutoStart] = useState(false);
  // PAY-PHONE-1 - "How do you want to pay?" for a signed-out visitor (only while paying-by-phone is on).
  const guestEnabled = isGuestPayClientEnabled();
  const [showGuest, setShowGuest] = useState(false);
  // CHECKOUT-WHO-1 - "Who will use it?" (dark unless VITE_CHECKOUT_WHO_ENABLED).
  const whoEnabled = isCheckoutWhoClientEnabled();
  const buyHandled = useRef(false);
  useEffect(() => {
    if (buyHandled.current || authLoading || !readBoardPassBuy(location.search)) return;
    if (!user || user.isLocalSession) {
      buyHandled.current = true;
      if (whoEnabled) {
        // CHECKOUT-WHO-1: strip the param first, then the shared sheet ("Who will use it?") opens through the Pay path.
        const rest = new URLSearchParams(location.search);
        rest.delete(BOARD_PASS_BUY_PARAM);
        const search = rest.toString();
        navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
        setAutoStart(true);
        return;
      }
      if (guestEnabled) {
        // Strip the param first (reload / Back never re-open it), then ask how they want to pay.
        const rest = new URLSearchParams(location.search);
        rest.delete(BOARD_PASS_BUY_PARAM);
        const search = rest.toString();
        navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
        setShowGuest(true);
        return;
      }
      navigate(withSigninRedirect("/login", BOARD_PASS_BUY_PATH), { replace: true });
      return;
    }
    if (!hydrated) return;
    buyHandled.current = true;
    const rest = new URLSearchParams(location.search);
    rest.delete(BOARD_PASS_BUY_PARAM);
    const search = rest.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
    if (status.tier === "premium") return;
    trackNamedEvent("board_pass_direct_checkout");
    setAutoStart(true);
  }, [authLoading, user, hydrated, status.tier, location.search, location.pathname, location.hash, navigate, guestEnabled, whoEnabled]);

  // PACK-CREDIT-1: the server's credit for this student. A failed read is simply no credit line.
  const [packCredit, setPackCredit] = useState<BoardPassCredit | null>(null);
  useEffect(() => {
    let cancelled = false;
    setPackCredit(null);
    if (!uid) return undefined;
    fetchMyPacks()
      .then((mine) => {
        if (!cancelled) setPackCredit(mine.boardPassCredit);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const passEndMs = status.passEnd ? Date.parse(status.passEnd) : NaN;
  const activePassEnd =
    hydrated && status.tier === "premium" && Number.isFinite(passEndMs) && passEndMs > Date.now()
      ? (status.passEnd as string)
      : null;

  return (
    <>
    <PassCheckoutView
      signedIn={Boolean(uid)}
      offerOpen={foundingRateApplies(Date.now(), status.foundingMember)}
      showMonth={showMonth}
      activePassEnd={activePassEnd}
      packCredit={packCredit}
      autoStart={autoStart}
      {...(whoEnabled
        ? {
            who: {
              selfMasked: uid ? maskEmail(user?.email) || maskIndianMobile(user?.phoneNumber) || null : null,
              onSignIn: () => navigate(withSigninRedirect("/login", BOARD_PASS_BUY_PATH)),
              onSignInWithNumber: (digits: string) => {
                const state: GuestSigninState = { guestPayPhone: digits };
                navigate(withSigninRedirect("/login", "/"), { state });
              },
              onSignInWithEmail: () => navigate(withSigninRedirect("/login", "/")),
            },
          }
        : {})}
      onSignIn={() => (guestEnabled ? setShowGuest(true) : navigate(withSigninRedirect("/login", PASS_CHECKOUT_RETURN_PATH)))}
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
    {showGuest && (!uid || user?.isLocalSession === true) && (
      <GuestPaySheet
        item={{ kind: "pass", sku: "till_boards", label: "Board Pass", description: BOARD_PASS_CHECKOUT_DESCRIPTION }}
        onClose={() => setShowGuest(false)}
        onSignInFirst={(method, digits, existingAccount) => {
          const state: GuestSigninState | undefined = method === "phone" ? { ...(digits ? { guestPayPhone: digits } : { phoneFirst: true }), ...(existingAccount ? { guestPayExisting: true as const } : {}) } : undefined;
          navigate(withSigninRedirect("/login", BOARD_PASS_BUY_PATH), state ? { state } : undefined);
        }}
        onSignInWithNumber={(digits) => {
          const state: GuestSigninState = { guestPayPhone: digits };
          navigate(withSigninRedirect("/login", "/"), { state });
        }}
      />
    )}
    </>
  );
}

/** Mounted by PricingPage. Renders nothing — and calls no hook — while payments are dark. */
export default function PassCheckout() {
  if (!isPaymentsClientEnabled()) return null;
  return <PassCheckoutConnected />;
}
