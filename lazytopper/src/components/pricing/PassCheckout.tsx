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
import GstStateLine from "../gstInvoice/GstStateLine";
import { gstStateFieldOn } from "../../services/gstBuyerOrder";
import { focusPayWhenShown, hasRememberedGstBuyer } from "../packs/PacksShop";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { hydrateSubscriptionFromCloud } from "../../services/subscriptionService";
import { withSigninRedirect } from "../../services/freeCheckClient";
import {
  boardPassGstBreakdown,
  boardPassGstExclusive,
  boardPassPayDisplay,
  boardPassPriceDisplay,
  foundingRateApplies,
  formatInr,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_INR,
  payDisplay,
  tillBoardsQuote,
} from "../../config/pricing";
import { BOARD_PASS_BUY_PARAM, BOARD_PASS_BUY_PATH, BOARD_PASS_BUY_VALUE, readBoardPassBuy } from "./boardPassBuy";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { fetchMyPacks, type BoardPassCredit } from "../../services/packs";
import { useMonthPassAvailable } from "./useMonthPassAvailable";
import PayRescueCard from "../payRescue/PayRescueCard";
import SigninLinkCardLazy from "../signinLink/SigninLinkCardLazy";
import PaidSheetLazy, { paidSheetEnabled, paidSheetReceiptLine, preloadPaidSheet } from "../checkoutWho/PaidSheetLazy";
import { maskEmail as maskReceiptEmail } from "../../lib/maskContact";
import GuestPaySheet from "../guestPay/GuestPaySheet";
import { isGuestPayClientEnabled, maskIndianMobile, type GuestSigninState } from "../../services/guestPay";
import { isCheckoutWhoClientEnabled } from "../../services/checkoutWhoFlag";
import SomeoneElseLink from "../checkoutWho/SomeoneElseLink";
import { maskEmail } from "../../services/checkoutWhoFlag";

/** CHECKOUT-WHO-1 - "Who will use it?": its own lazy chunk, loaded only when the flag is on and a Pay is tapped. */
/** PREEXIST-FIX-1: the same specifier as the lazy() below (one chunk), for the ?buy= warm-up. */
const loadCheckoutSheet = () => import("../checkoutWho/CheckoutSheet");
const CheckoutSheet = lazy(() => import("../checkoutWho/CheckoutSheet"));
// PREEXIST-FIX-1: a direct landing on /pricing?buy=board_pass warms the sheet's chunk as soon as this module is evaluated (chunk only).
if (typeof window !== "undefined" && isCheckoutWhoClientEnabled() && readBoardPassBuy(window.location.search)) {
  void loadCheckoutSheet().catch(() => undefined);
}

/**
 * CHECKOUT-WHO-1 - set ONLY while VITE_CHECKOUT_WHO_ENABLED is on. Signed out, the Board Pass Pay (and the ?buy= one-tap start) opens
 * the shared "Who will use it?" sheet. CHECKOUT-SELF-1: signed in, the Pay button runs the unchanged checkout for the account itself,
 * and a secondary link opens the same sheet at the someone-else / mobile-or-email box (the sheet pays as a recipient purchase). Absent (flag off): every path below is exactly as before.
 */
export interface PassWhoWiring {
  selfMasked: string | null;
  onSignIn: () => void;
  onSignInWithNumber: (tenDigitNumber: string) => void;
  onSignInWithEmail: () => void;
  /** SELFPAY-ATTACH-1: the router's navigate, for the holder card's "Go to Home". */
  onGoTo?: (path: string) => void;
}
import "./passCheckoutRepay.css";
import PassOwnerOfferLazy from "../passOwnerOffers/PassOwnerOfferLazy";
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
  PASS_ALREADY_COVERED_COPY,
  PAYMENT_STILL_CONFIRMING_COPY,
  type BuyOutcome,
  type PassType,
  type PayStatusResult,
} from "../../services/checkout";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PASS_CHECKOUT_RETURN_PATH = "/pricing";

export { BOARD_PASS_BUY_PARAM, BOARD_PASS_BUY_PATH, BOARD_PASS_BUY_VALUE, readBoardPassBuy };

/** The monthly button's label, from the pricing module's display constants. */
export function monthButtonLabel(offerOpen: boolean): string {
  // GST-EXCL-1: the month pass is "+ GST" too from 00:00 IST 7 Nov 2026 (every paid product); a Pay button names the TOTAL.
  return `Pay ${payDisplay(offerOpen ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR)} for a month`;
}

/** A function: the price follows the founding deadline, so the label is read at RENDER time. */
/** GST-EXCL-1: a Pay button names the amount CHARGED (base + GST from 7 Nov 2026) - never the "+ GST" tag. */
export const tillBoardsButtonLabel = (): string => `Pay ${boardPassPayDisplay()} once till your boards`;
/** PAY-PHONE-1 (C) - the button that stays at the top after the Board Pass checkout was closed without paying. */
/** PASS-OWNER-PACKS-1: what a Board Pass owner reads where the Pay button would be. */
export const boardPassActiveUntilCopy = (dateLabel: string): string => `Your Board Pass is active until ${dateLabel}.`;

/**
 * PARENT-PACKS-1 (owner live check, 4 Nov 2026) - a RUNNING pass that is not the Board Pass. Never "Premium" in visible copy.
 * A month pass: "Your month pass is active until …", then the Board Pass upsell with ONE primary Pay; "Renew month pass" only in
 * the last RENEW_WINDOW_DAYS before it ends (owner ruling: existing monthly buyers keep monthly renewals). Any other running plan
 * (an admin grant with an end date): "Full access is active until …".
 */
export const RENEW_WINDOW_DAYS = 7;
export const monthPassActiveUntilCopy = (dateLabel: string): string => `Your month pass is active until ${dateLabel}.`;
export const fullAccessActiveUntilCopy = (dateLabel: string): string => `Full access is active until ${dateLabel}.`;
export const boardPassUpsellCopy = (): string => `Stay covered till your boards: Board Pass ${boardPassPriceDisplay()} once`;
export const renewMonthLabel = (offerOpen: boolean): string =>
  `Renew month pass · ${payDisplay(offerOpen ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR)}`; // GST-EXCL-1: the total charged
const MONTH_PLANS: readonly string[] = ["pass_month", "premium_monthly"];

/**
 * PARENT-PACKS-1 (owner, 4 Nov 2026) - the success line after a verified payment names WHAT was bought, never "Premium":
 * the Board Pass (till boards) -> "Your Board Pass is active until …"; a month pass -> "Your monthly pass is active until …".
 */
export const paidUntilCopy = (passType: PassType, dateLabel: string): string =>
  passType === "month" ? `Your monthly pass is active until ${dateLabel}.` : boardPassActiveUntilCopy(dateLabel);

/** PAID-SHEET-1: the Board Pass / month pass pop-up. "Start practising" goes Home; the Board Pass also carries the CBQ Packs offer below the who-card. */
function PassSheetHost(p: { receiptEmail?: string; onFail: () => void; itemName: string; onClose: () => void; moved: boolean; onMoved: () => void; onAnswered?: () => void; move?: { orderId: string; item: string } }) {
  return useInRouterContext() ? <PassSheetRouted {...p} /> : <PassSheetShell {...p} surface="pricing" go={() => window.location.assign("/")} />;
}
function PassSheetRouted(p: { receiptEmail?: string; onFail: () => void; itemName: string; onClose: () => void; moved: boolean; onMoved: () => void; onAnswered?: () => void; move?: { orderId: string; item: string } }) {
  const navigate = useNavigate();
  const location = useLocation();
  return <PassSheetShell {...p} surface={location.pathname.startsWith("/board-pass") ? "board_pass" : "pricing"} go={() => navigate("/")} />;
}
function PassSheetShell({ itemName, onClose, moved, onMoved, onAnswered, move, surface, go, receiptEmail, onFail }: { receiptEmail?: string; onFail: () => void; itemName: string; onClose: () => void; moved: boolean; onMoved: () => void; onAnswered?: () => void; move?: { orderId: string; item: string }; surface: string; go: () => void }) {
  return (
    <PaidSheetLazy
      surface={surface}
      itemKind="pass"
      itemName={itemName}
      primaryLabel="Start practising"
      {...(maskReceiptEmail(receiptEmail) ? { receiptLine: paidSheetReceiptLine(maskReceiptEmail(receiptEmail)) } : {})}
      onFail={onFail}
      onPrimary={() => { onClose(); go(); }}
      onClose={onClose}
      moved={moved}
      onMoved={onMoved}
      {...(onAnswered ? { onAnswered } : {})}
      {...(move ? { move } : {})}
      below={<PassOwnerOfferLazy placement="pass_success" assumePaid />}
    />
  );
}

export const repayBoardPassLabel = (): string => `Pay ${boardPassPayDisplay()}`;

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
  // PARENT-PACKS-1 (owner, 4 Nov): rupees formatted like every other price on the page (₹1,868, not ₹1868).
  // GST-EXCL-1: from the GST cut-off the server's payInr is (base + GST) less the credit - say so.
  const gst = boardPassGstExclusive(Date.now()) ? " incl. GST" : "";
  return `Your pack credit: ${formatInr(credit.creditInr)} off — Board Pass ${formatInr(credit.payInr)}${gst} for you, till ${till}`;
}

/**
 * GST-EXCL-1 - the breakup a credited buyer reads on the checkout step before Razorpay opens:
 * "₹1,917 + ₹345 GST (18%) = ₹2,262, less your pack credit ₹199: you pay ₹2,063". Null before the GST cut-off.
 */
export function packCreditBreakdown(credit: BoardPassCredit): string | null {
  const b = boardPassGstBreakdown(Date.now());
  return b ? `${b}, less your pack credit ${formatInr(credit.creditInr)}: you pay ${formatInr(credit.payInr)}` : null;
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
  /**
   * PASS-OWNER-PACKS-1: the server-written plan of that running pass. "pass_till_boards" = a Board Pass owner: the buy area then
   * says only "Your Board Pass is active until …" (no Pay button, no Board Pass price - there is nothing left to buy). Any other
   * running plan (a month pass, an admin grant) keeps today's view, so the upgrade to the Board Pass stays one tap away.
   */
  activePlan?: string | null;
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
  /** SIGNED-IN-MOVE-1: the Board Pass was moved to the child's own account - re-read this account's entitlement. */
  onPassMoved?: () => void;
  /** PAID-SHEET-1: the signed-in account's email, for the pop-up's "Receipt sent to ..." line (absent for phone-only accounts). */
  receiptEmail?: string;
  /**
   * OFFERS-V2 A2 - start the Board Pass checkout ONCE, as if the Pay button was tapped. The connected half sets it only for a signed-in,
   * hydrated, non-Premium student who arrived on /pricing?buy=board_pass (and has already removed that param). Never repeats on re-render.
   */
  autoStart?: boolean;
  /** SELFPAY-ATTACH-1: a Board Pass holder arrived on /pricing?buy=board_pass - open "You already have the Board Pass" once. */
  holderAutoOpen?: boolean;
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
  activePlan = null,
  onSignIn,
  onBuy,
  onCheckStatus = checkPayStatus,
  pollDelaysMs = PAY_STATUS_POLL_DELAYS_MS,
  pendingHoldMs = PAY_PENDING_TTL_MS,
  packCredit = null,
  onPassMoved,
  receiptEmail,
  autoStart = false,
  holderAutoOpen = false,
  who,
}: PassCheckoutViewProps) {
  /** CHECKOUT-WHO-1 - the "Who will use it?" sheet is open (only ever with `who`). */
  const [whoOpen, setWhoOpen] = useState(false);
  // CHECKOUT-ONE-TAP-1: the signed-out sheet opened by a real Pay tap buys for yourself at once; a ?buy= link arrival (resumed) keeps the Pay step.
  const [whoTap, setWhoTap] = useState(false);
  /** SELFPAY-ATTACH-1 - a holder's "You already have the Board Pass" card (only ever with `who`). */
  const [holderOpen, setHolderOpen] = useState(false);
  useEffect(() => {
    if (holderAutoOpen && who) setHolderOpen(true);
  }, [holderAutoOpen, who]);
  const [busy, setBusy] = useState<PassType | null>(null);
  const [paidUntil, setPaidUntilState] = useState<{ label: string; passType: PassType; orderId?: string } | null>(null);
  // PAID-SHEET-1: a signed-in buyer's confirmed payment opens the "Payment received" pop-up (the inline paid line stays under it).
  const [paidSheetOpen, setPaidSheetOpen] = useState(false);
  const [whoAnswered, setWhoAnswered] = useState(false); // "Who will use this?" answered in the pop-up: no reopen button
  const [paidSheetFailed, setPaidSheetFailed] = useState(false); // the pop-up chunk did not load: the old inline paid screen
  const setPaidUntil = (label: string, passType: PassType, orderId?: string) => {
    setPaidUntilState({ label, passType, ...(orderId ? { orderId } : {}) });
    if (signedIn && paidSheetEnabled() && !paidSheetFailed) setPaidSheetOpen(true);
  };
  /** SIGNED-IN-MOVE-1: after a successful move the paid screen must not keep saying the pass is this account's. */
  const [movedAway, setMovedAway] = useState(false);
  const [failed, setFailed] = useState(false);
  /** PRICING-1 — the server refused the order as expired: "start again", never the pending copy. */
  const [expired, setExpired] = useState(false);
  /** MONEY-DUPGUARD-1 — the server refused the order: this account's pass already runs to the boards. */
  const [covered, setCovered] = useState(false);
  /** PAY-RECOVER-1 — "checking" while polls run; "confirming" once they ran out still pending. */
  const [recovery, setRecovery] = useState<null | "checking" | "confirming">(null);
  /** PAY-RESCUE-1 — the checkout sheet was closed: the pass whose "Can't pay yourself?" card is showing, else null. */
  const [rescue, setRescue] = useState<PassType | null>(null);
  const pendingRef = useRef<{ orderId: string; details: CheckoutDetails; attemptId: string; paymentId?: string } | null>(null);
  const pollRun = useRef(0);
  const mounted = useRef(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** GST-FU-1 F2: the Board Pass Pay button (an auto-start with a remembered state stops here, focused). */
  const boardsPayRef = useRef<HTMLButtonElement | null>(null);
  /** GST-FU-1 review B1: set (synchronously) once any checkout starts on this mount - a held auto-start then never starts a second. */
  const buyStartedRef = useRef(false);
  /** GST-FU-1 review F4: the auto-start stopped at Pay - the next Board Pass tap keeps the auto-start's `resumed` mark. */
  const heldResumeRef = useRef(false);

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
      // META-PURCHASE-DEDUP-1: the ORDER id (the pending order always has one), so this and the verify-time purchase are ONE id.
      transactionId: result.orderId || pending.orderId || result.paymentId || pending.paymentId || pending.attemptId,
    });
    setRecovery(null);
    const label = formatPassDate(result.passEnd);
    // An unreadable server date: no active copy is invented; the hydrated pass shows instead.
    if (label) setPaidUntil(label, pending.details.passType, result.orderId || pending.orderId);
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
    buyStartedRef.current = true;
    // GST-FU-1 review F4: the tap that completes a ?buy= link held at Pay is still that link's (resumed) start.
    const resumed = opts.resumed === true || (passType === "till_boards" && heldResumeRef.current);
    heldResumeRef.current = false;
    const details = checkoutEventDetails(passType, offerOpen);
    // BUY-PATH-1: `begin_checkout` at the TAP, signed in or not (a signed-out tap used to return before any event).
    // ONE call per tap: the signed-in path below no longer sends its own. (CHECKOUT-WHO-1: the sheet's own "Pay" is the
    // same tap continuing, so it sends none.)
    if (!opts.fromWho) trackBeginCheckoutTap(details, signedIn, resumed);
    // CHECKOUT-WHO-1 - flag on: the Board Pass Pay opens "Who will use it?" first (the month renewal stays as it was).
    // CHECKOUT-SELF-1: only a SIGNED-OUT tap opens the sheet; a signed-in student's Pay buys for their own account in one tap
    // (someone else / a mobile number is the secondary link below the button).
    if (who && passType === "till_boards" && !opts.fromWho && !signedIn) {
      setWhoTap(opts.resumed !== true);
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
    if (signedIn && paidSheetEnabled()) preloadPaidSheet(); // warm the post-payment pop-up chunk at the Pay tap
    const outcome = await onBuy(passType);
    setBusy(null);
    if (outcome.status === "paid") {
      // TRACK-2: the ONLY `purchase` call site — the server has verified this payment.
      // FOLLOWUPS-1 A4: Razorpay's payment id as transaction_id and the SERVER order's rupee
      // amount as value when the outcome carries them; else the per-attempt id / config quote.
      trackPurchase({
        ...details,
        ...(outcome.amountInr !== undefined ? { valueInr: outcome.amountInr } : {}),
        // META-PURCHASE-DEDUP-1: the ORDER id (a later status poll for the same order settles under the same id).
        transactionId: outcome.orderId || outcome.paymentId || attemptId,
      });
      const label = formatPassDate(outcome.passEnd);
      if (label) setPaidUntil(label, passType, outcome.orderId);
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
    } else if (outcome.status === "already_covered") {
      // MONEY-DUPGUARD-1 — no order was made and Razorpay never opened: say so calmly, offer nothing to pay.
      setCovered(true);
    } else if (outcome.status === "dismissed") {
      // PAY-RESCUE-1 — the sheet was closed (with or without a failed payment first): offer the parent hand-off.
      setRescue(passType);
    }
  }

  // OFFERS-V2 A2: the one-tap start. A ref makes it once per mount, so a re-render, a StrictMode re-run or a prop flicker never opens a second order.
  const autoStarted = useRef(false);
  // GST-FU-1 review B1: the auto-start may run AFTER an await (below); it calls the LATEST handleBuy (whose busy / recovery
  // guard sees a tap made meanwhile), never the copy captured when the effect ran - the same pattern as PacksShop's resume.
  const handleBuyRef = useRef(handleBuy);
  handleBuyRef.current = handleBuy;
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    const start = () => void handleBuyRef.current("till_boards", { resumed: true }); // the ?buy=board_pass auto-start, not a tap on this page
    // GST-FU-1 F2: flag off (or signed out: the sheet asks) -> exactly as before.
    if (!signedIn || !gstStateFieldOn()) {
      start();
      return;
    }
    // A remembered state + PIN would send the buyer straight into Razorpay, covering "State: X · Change". Stop at Pay instead
    // (the line and the total above it, focus on Pay): one tap to Razorpay. Nothing remembered -> start as today (the order
    // step asks state + PIN).
    void hasRememberedGstBuyer().then((remembered) => {
      // B1: the buyer tapped Pay (or any Pay) while this was read - that checkout IS the start; never a second one.
      if (!mounted.current || buyStartedRef.current) return;
      if (remembered) {
        heldResumeRef.current = true;
        focusPayWhenShown(() => boardsPayRef.current);
      } else start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  function handleCheckAgain() {
    if (recovery !== "confirming") return;
    void pollStatus([0]);
  }

  if (paidUntil) {
    const sheetOn = signedIn && paidSheetEnabled() && !paidSheetFailed;
    const isBoardPass = paidUntil.passType === "till_boards";
    const moveTarget = isBoardPass && paidUntil.orderId ? { move: { orderId: paidUntil.orderId, item: "the Board Pass" } } : {};
    return (
      <div className="lt-pricing-checkout" data-testid="pass-checkout">
        {!movedAway && (
          <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" role="status" data-testid="pass-checkout-paid">
            {paidUntilCopy(paidUntil.passType, paidUntil.label)}
          </p>
        )}
        {/* PASS-OWNER-PACKS-1 (owner 3 Nov): once, on the payment-success screen - the CBQ Packs, both subjects. Its own lazy chunk. */}
        {!sheetOn && !movedAway && <PassOwnerOfferLazy placement="pass_success" assumePaid />}
        {/* LINK-SIGNIN-1: a signed-in buyer is asked who else will sign in (own lazy chunk; below the purchase line, so nothing moves). */}
        {!sheetOn && <SigninLinkCardLazy signedIn={signedIn} onMoved={() => { setMovedAway(true); onPassMoved?.(); }} {...moveTarget} />}
        {/* PAID-SHEET-1: the same who-card (and, for the Board Pass, the CBQ Packs offer) inside the pop-up. */}
        {sheetOn && !paidSheetOpen && !movedAway && !whoAnswered && (
          <button type="button" className="lt-pricing-cta lt-pricing-cta--secondary" onClick={() => setPaidSheetOpen(true)} data-testid="paid-sheet-reopen">
            Who will use this?
          </button>
        )}
        {sheetOn && paidSheetOpen && (
          <PassSheetHost
            receiptEmail={receiptEmail}
            onFail={() => { setPaidSheetFailed(true); setPaidSheetOpen(false); }}
            itemName={isBoardPass ? "the Board Pass" : "the monthly pass"}
            onClose={() => setPaidSheetOpen(false)}
            moved={movedAway}
            onMoved={() => { setMovedAway(true); onPassMoved?.(); }}
            onAnswered={() => setWhoAnswered(true)}
            {...moveTarget}
          />
        )}
      </div>
    );
  }

  // MONEY-DUPGUARD-1: the SERVER says this account is already covered till the boards (e.g. bought on another device and
  // not yet hydrated here). The same calm notice as an owner's, and no Pay button to tap again.
  if (covered) {
    return (
      <div className="lt-pricing-checkout" data-testid="pass-checkout">
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" role="status" data-testid="pass-checkout-already-covered">
          {PASS_ALREADY_COVERED_COPY}
        </p>
      </div>
    );
  }

  // PASS-OWNER-PACKS-1: a Board Pass owner is told it is on, and is offered nothing to pay for here.
  if (activeLabel && activePlan === "pass_till_boards") {
    return (
      <div className="lt-pricing-checkout" data-testid="pass-checkout">
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" role="status" data-testid="pass-checkout-board-pass-active">
          {boardPassActiveUntilCopy(activeLabel)}
        </p>
        {/* SELFPAY-ATTACH-1: a holder is told so (never charged again) and can buy it for someone else. The card is the lazy sheet. */}
        {who && signedIn && (
          <button type="button" className="lt-pricing-cta lt-pricing-cta--secondary" onClick={() => setHolderOpen(true)} data-testid="pass-checkout-holder-buy">
            Buy for someone else
          </button>
        )}
        {who && signedIn && holderOpen && (
          <Suspense fallback={null}>
            <CheckoutSheet
              item={{ kind: "pass", sku: "till_boards", label: "Board Pass", description: BOARD_PASS_CHECKOUT_DESCRIPTION, priceDisplay: boardPassPayDisplay(), priceBreakdown: boardPassGstBreakdown() }}
              signedIn
              selfMasked={who.selfMasked}
              onPaySelf={() => undefined}
              onSignIn={who.onSignIn}
              onSignInWithNumber={who.onSignInWithNumber}
              onSignInWithEmail={who.onSignInWithEmail}
              onClose={() => setHolderOpen(false)}
              startAt="other"
              holder={{ until: activeLabel }}
              {...(who.onGoTo ? { onGoTo: who.onGoTo } : {})}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // PARENT-PACKS-1: a running month pass (or another running plan) - what it is, until when; the month button only to RENEW,
  // and only in its last RENEW_WINDOW_DAYS.
  const runningMonth = Boolean(activeLabel) && MONTH_PLANS.includes(activePlan || "");
  const endMs = activePassEnd ? Date.parse(activePassEnd) : NaN;
  const inRenewWindow = runningMonth && Number.isFinite(endMs) && endMs - Date.now() <= RENEW_WINDOW_DAYS * 86_400_000;
  const monthButton = showMonth && (!activeLabel || inRenewWindow);

  // PACK-CREDIT-1: signed in, no running Premium, nothing else in the notice slot (they share one grid row).
  const creditLine =
    signedIn && !activeLabel && packCredit && !failed && !expired && !recovery ? packCreditLine(packCredit) : null;
  // GST-EXCL-1: the breakup beside the Pay button, before Razorpay opens ("₹1,917 + ₹345 GST (18%) = ₹2,262"). Null before 7 Nov.
  // A credited buyer (the credit line is on screen, and the server takes the credit off the order) reads the credited breakup
  // ("…= ₹2,262, less your pack credit ₹49: you pay ₹2,213"), so the figures beside Pay add up to what Razorpay asks for.
  const gstBreakdown = creditLine && packCredit ? packCreditBreakdown(packCredit) : boardPassGstBreakdown(Date.now());

  // CHECKOUT-SELF-1: a signed-in student with a pack credit pays the server's credited total - the one Pay button names exactly that.
  const boardsLabel =
    who && signedIn && packCredit ? `Pay \u20B9${packCredit.payInr.toLocaleString("en-IN")} once till your boards` : tillBoardsButtonLabel();

  return (
    <div className="lt-pricing-checkout" data-testid="pass-checkout">
      {activeLabel && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" data-testid="pass-checkout-already-active">
          {runningMonth ? monthPassActiveUntilCopy(activeLabel) : fullAccessActiveUntilCopy(activeLabel)}
        </p>
      )}
      {activeLabel && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--top" data-testid="pass-checkout-upsell">
          {boardPassUpsellCopy()}
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
      {/* GST-INVOICE-1 (D4): a signed-in buyer's remembered state, shown above Pay (renders nothing while the flag is off).
          GST-FU-1 F1/F2: also above a running month pass's upgrade Pay (the Board Pass owner's view returned above). */}
      {signedIn && <GstStateLine />}
      {monthButton && !activeLabel && (
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
        ref={boardsPayRef}
        className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--boards"
        disabled={busy !== null || recovery !== null}
        onClick={() => void handleBuy("till_boards")}
      >
        {boardsLabel}
      </button>
      {gstBreakdown && !activeLabel && (
        <p className="lt-pricing-plan-desc lt-pricing-checkout-note lt-pricing-checkout-note--bottom" data-testid="pass-checkout-gst">
          {gstBreakdown}
        </p>
      )}
      {monthButton && Boolean(activeLabel) && (
        <button
          type="button"
          className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--month"
          disabled={busy !== null || recovery !== null}
          onClick={() => void handleBuy("month")}
          data-testid="pass-checkout-renew-month"
        >
          {renewMonthLabel(offerOpen)}
        </button>
      )}
      {who && signedIn && !activeLabel && (
        <SomeoneElseLink disabled={busy !== null || recovery !== null} onOpen={() => setWhoOpen(true)} />
      )}
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
            item={{ kind: "pass", sku: "till_boards", label: "Board Pass", description: BOARD_PASS_CHECKOUT_DESCRIPTION, priceDisplay: boardPassPayDisplay(), priceBreakdown: boardPassGstBreakdown() }}
            signedIn={signedIn}
            selfMasked={who.selfMasked}
            {...(signedIn && packCredit ? { selfPriceDisplay: `₹${packCredit.payInr.toLocaleString("en-IN")}`, selfPriceNote: packCreditBreakdown(packCredit) } : {})}
            onPaySelf={() => void handleBuy("till_boards", { fromWho: true })}
            onSignIn={who.onSignIn}
            onSignInWithNumber={who.onSignInWithNumber}
            onSignInWithEmail={who.onSignInWithEmail}
            onClose={() => setWhoOpen(false)}
            {...(signedIn ? { startAt: "other" as const } : {})}
            {...(!signedIn && whoTap ? { autoPaySelf: true } : {})}
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
  const [holderAuto, setHolderAuto] = useState(false);
  // PAY-PHONE-1 - "How do you want to pay?" for a signed-out visitor (only while paying-by-phone is on).
  const guestEnabled = isGuestPayClientEnabled();
  const [showGuest, setShowGuest] = useState(false);
  // CHECKOUT-WHO-1 - "Who will use it?" (dark unless VITE_CHECKOUT_WHO_ENABLED).
  const whoEnabled = isCheckoutWhoClientEnabled();
  const buyHandled = useRef(false);
  // PREEXIST-FIX-1 (7 Nov 2026): on /pricing?buy=board_pass signed out, the sheet's lazy chunk was fetched only after auth and the
  // param strip, so the clean /pricing showed first. Warm it at mount (chunk fetch only; no order, no checkout call).
  const sheetPreloaded = useRef(false);
  useEffect(() => {
    if (sheetPreloaded.current || !whoEnabled || !readBoardPassBuy(location.search)) return;
    sheetPreloaded.current = true;
    void loadCheckoutSheet().catch(() => undefined);
  }, [whoEnabled, location.search]);
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
    // GST-FU-1 F1 (owner, 8 Nov 2026: "1. Yes"): a RUNNING plan that is not the Board Pass (a month pass, an admin grant with an
    // end date) gets what its visible upgrade Pay does - the Board Pass checkout. A Board Pass holder (and Premium with no
    // readable end) does nothing, as before.
    if (status.tier === "premium") {
      const endMs = status.passEnd ? Date.parse(status.passEnd) : NaN;
      const upgradeable = Number.isFinite(endMs) && endMs > Date.now() && status.plan !== "pass_till_boards";
      if (!upgradeable) {
        // SELFPAY-ATTACH-1: a Board Pass holder (was: nothing happens) is told they have it, with "Buy for someone else".
        if (whoEnabled && Number.isFinite(endMs) && endMs > Date.now() && status.plan === "pass_till_boards") setHolderAuto(true);
        return;
      }
    }
    trackNamedEvent("board_pass_direct_checkout");
    setAutoStart(true);
  }, [authLoading, user, hydrated, status.tier, status.plan, status.passEnd, location.search, location.pathname, location.hash, navigate, guestEnabled, whoEnabled]);

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
      activePlan={activePassEnd ? status.plan : null}
      packCredit={packCredit}
      autoStart={autoStart}
      holderAutoOpen={holderAuto}
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
              onGoTo: (path: string) => navigate(path),
            },
          }
        : {})}
      receiptEmail={user?.email || undefined}
      onPassMoved={() => { if (uid) void hydrateSubscriptionFromCloud(uid).catch(() => undefined); }}
      onSignIn={() => (guestEnabled ? setShowGuest(true) : navigate(withSigninRedirect("/login", PASS_CHECKOUT_RETURN_PATH)))}
      onBuy={async (passType) => {
        const outcome = await buyPass(passType);
        // Refresh the cached entitlement from the SERVER record the grant just wrote.
        // MONEY-DUPGUARD-1: `already_covered` means the server holds a pass this tab has not loaded yet - load it too.
        if ((outcome.status === "paid" || outcome.status === "already_covered") && uid) void hydrateSubscriptionFromCloud(uid).catch(() => undefined);
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
