/**
 * CheckoutSheet — "Who will use it?" (CHECKOUT-WHO-1, owner 3 Nov 2026; prototype Checkout-Flow, three flows).
 *
 * ONE sheet behind every Board Pass and pack Pay / Buy while VITE_CHECKOUT_WHO_ENABLED is on (callers: PassCheckout and
 * the shared pack shop's buy, which every other Pay / Buy button already funnels into). Mounted lazily, never in the entry.
 *
 *   SIGNED IN      "For: you · <masked own email/phone>" + "Pay ₹X" -> the caller's EXISTING signed-in checkout (one tap,
 *                  same Razorpay, same events). "Buying for someone else?" opens the box below.
 *   SIGNED OUT     (CHECKOUT-SELF-2, owner 11 Nov 2026) "Buy for yourself": the price + one "Pay ₹X" -> Razorpay straight away; the server
 *                  reads the buyer's mobile / email from the VERIFIED payment (never from here) and the purchase waits on /
 *                  creates that account, so after paying: "sign in with that number / Google". "Buying for someone else?" is the
 *                  secondary link to the box below. /for-parents (audience="parent") and VITE_CHECKOUT_SELF_DISABLED keep the box first.
 *   SIGNED OUT /   "Who will use it?" - ONE box for a mobile number or an email (detected), "+ Add their email / mobile too
 *   SOMEONE ELSE   (optional)", and a Pay button that reads back exactly what was typed. Server-priced guest order with a
 *                  recipient -> Razorpay -> server verify -> "Sign in with <masked> — the Board Pass is already there."
 *
 * Nothing here grants anything. What the payer typed never goes into a URL, storage or an analytics event.
 */
import { VALIDITY_SHORT } from "../../config/validity";
import InAppPayRescue, { buyTargetFromItem } from "../payRescue/InAppPayRescue";
import ParentForwardGuest from "../payRescue/ParentForwardGuest";
import PayReturnHint from "../payReturn/PayReturnHint";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { newCheckoutAttemptId, trackNamedEvent } from "../../analytics/analytics";
import { trackGuestPurchase } from "../guestPay/GuestPaySheet";
import { tenDigits, type GuestItem } from "../../services/guestPay";
import { WHATSAPP_URL } from "../../config/socialProfiles";
import { CHECKOUT_OPENING_COPY, CHECKOUT_SLOW_COPY } from "../../services/checkoutTiming";
import { useCheckoutSlow } from "../../hooks/useCheckoutSlow";
import AttachFlow from "./AttachFlow";
import {
  ATTACH_BEFORE_PAY,
  alreadyHasLine,
  attachCloseConfirm,
  isSelfAttachClientEnabled,
  maskedIds as attachMaskedIds,
  storeReceiptProof,
  type AttachProof,
  SELF_HELP,
  SELF_PAID_NO_CONTACT,
  SELF_PAID_UNCONFIRMED,
  SELF_TITLE,
  SELF_TITLE_TEST_SERIES,
  buyForSelf,
  isCheckoutSelfClientEnabled,
  type SelfBuyOutcome,
  WHO_ADD_EMAIL,
  WHO_ADD_MOBILE,
  WHO_BAD_EMAIL,
  WHO_BAD_FIRST,
  WHO_BAD_MOBILE,
  WHO_CLOSED,
  WHO_EMAILED,
  WHO_FAILED,
  WHO_FIELD_HELP,
  WHO_FIELD_LABEL,
  WHO_HAVE_ACCOUNT,
  WHO_PARENT_FIELD_HELP,
  WHO_PARENT_FIELD_LABEL,
  WHO_SECOND_EMAIL_LABEL,
  WHO_SECOND_MOBILE_LABEL,
  WHO_SOMEONE_ELSE,
  WHO_TITLE,
  WHO_UNAVAILABLE,
  buyForRecipient,
  detectIdentifier,
  isPayAutoAccountClientEnabled,
  maskedIds,
  paidLine,
  payReadBack,
  readRecipient,
  selfLine,
  type Recipient,
  type WhoBuyOutcome,
} from "../../services/checkoutWho";
import "../guestPay/guestPaySheet.css";
import "./checkoutSheet.css";

// PAID-SHOWS-1: the purchase card is its own lazy chunk inside the sheet's.
const PurchaseCard = lazy(() => import("./PurchaseCard"));
// GST-AFTER-PAY-1: "For your GST invoice" on the paid screens (guest proof only; nothing renders with the flag off).
const PostPayGst = lazy(() => import("../gstInvoice/PostPayGst"));

/**
 * `priceDisplay` is the amount CHARGED (it is what the Pay button names). GST-EXCL-1: `priceBreakdown` is the GST breakup shown
 * on the sheet before Razorpay opens ("₹1,917 + ₹345 GST (18%) = ₹2,262"); null/absent = nothing to break up (a pack, or
 * before 7 Nov 2026).
 */
export type CheckoutSheetItem = GuestItem & {
  priceDisplay: string;
  priceBreakdown?: string | null;
  /** TS-PRICE-2: the Test Series founding line ("₹999 + GST · founding price till 30 Nov, then ₹1,499 + GST"); absent/null = none. */
  priceNote?: string | null;
};

/** PAY-ACCOUNT-1: the "account is ready" thank-you screen, lazy (it pulls the auth context's phone sign-in). */
const AccountReadyPanel = lazy(() => import("./AccountReadyPanel"));

export interface CheckoutSheetProps {
  item: CheckoutSheetItem;
  /** A real (cloud) signed-in account. */
  signedIn: boolean;
  /** The signed-in account's own email / phone, MASKED (for "For: you · …"), else null. */
  selfMasked: string | null;
  /** The price the signed-in buyer pays for themselves, when it differs from a new account's (a server credit); else item.priceDisplay. */
  selfPriceDisplay?: string;
  /** GST-EXCL-1: the breakup for `selfPriceDisplay` (base + GST less the credit), shown on the "self" step. */
  selfPriceNote?: string | null;
  /** Signed in, for themselves: run the caller's existing checkout (the sheet closes first). */
  onPaySelf: () => void;
  /** Signed out: "Have an account? Sign in first" (the caller's existing sign-in, returning to the purchase). */
  onSignIn: () => void;
  /** After a signed-out payment that named a mobile: the existing phone sign-in with that number prefilled (router state). */
  onSignInWithNumber: (tenDigitNumber: string) => void;
  /** After a signed-out payment that named only an email: the sign-in page. */
  onSignInWithEmail: () => void;
  onClose: () => void;
  /**
   * PARENTS-PAY-1: "parent" = opened FROM /for-parents: the box says any number or email works (many children have no phone of their
   * own) and the guest events carry `surface: "for_parents"`. Absent = the student-side copy, byte-identical to before.
   */
  audience?: "parent";
  /**
   * CHECKOUT-SELF-1: "other" = open straight at the someone-else / mobile-or-email box even when signed in (the secondary link under
   * a signed-in student's one Pay button). Absent = as before (signed in -> the "For: you" step).
   */
  startAt?: "other";
  /**
   * PARENTS-V2-1: "other" = the pay-first flow for a parent (/for-parents): a signed-out visitor goes straight to the one Pay button
   * (the "Buy for yourself" step, even with audience "parent"), and after the verified payment the "Who will use it?" step opens with
   * "My child / someone else" PRE-SELECTED. Absent = unchanged everywhere else.
   */
  attachPreselect?: "other";
  /** Test seam. */
  buy?: (item: GuestItem, recipient: Recipient, signedIn: boolean) => Promise<WhoBuyOutcome>;
  /**
   * SELFPAY-ATTACH-1 (signed in, a holder tapped Buy): open at "You already have it" with "Buy for someone else" and a way on. `until` is the
   * REAL end date label (Board Pass); absent -> no date is said.
   */
  holder?: { until?: string | null };
  /** Where "Go to Home" / "Open My packs" go (the caller's router); default a full navigation. */
  onGoTo?: (path: string) => void;
  /** SELFPAY-ATTACH-1 test seam: the attach switch (default: the build flag). */
  attachOn?: boolean;
  /** CHECKOUT-SELF-2 test seams: the "Buy for yourself" purchase, and the kill switch (default: the build flag). */
  buySelf?: (item: GuestItem) => Promise<SelfBuyOutcome>;
  selfFirst?: boolean;
  /**
   * CHECKOUT-ONE-TAP-1 (owner 13 Nov 2026, "first take the payment, then ask"): a SIGNED-OUT visitor's Buy / Pay tap opened this sheet, so
   * it runs the same buy-for-yourself action AT ONCE on mount (Razorpay opens; the pre-pay "Pay ₹X" step is never shown) and stays only as
   * the host for the after-pay states (the attach step, the thank-you). Honoured only when the self-first step AND the attach flow are on
   * (the after-pay "My child / someone else" choice is what replaces the pre-pay link) and never for audience "parent" (/for-parents keeps its
   * own pay-first path). A dismissed or failed payment falls back to the ordinary Pay step, so a retry is one tap. Hosts pass it only for a
   * real tap, never for a ?buy= link arrival.
   */
  autoPaySelf?: boolean;
}

type Step =
  | { name: "self" }
  | { name: "selfOut"; error?: string; closed?: boolean }
  | { name: "selfBusy" }
  | { name: "paidSelf"; confirmed: boolean }
  | { name: "form"; error?: string; closed?: boolean }
  | { name: "busy" }
  | { name: "paid"; recipient: Recipient; confirmed: boolean }
  | { name: "covered" }
  | { name: "holder" }
  | { name: "attach"; proof: AttachProof; contact: Recipient | null }
  | { name: "unavailable" };

export default function CheckoutSheet({
  item,
  signedIn,
  selfMasked,
  selfPriceDisplay,
  selfPriceNote,
  onPaySelf,
  onSignIn,
  onSignInWithNumber,
  onSignInWithEmail,
  onClose,
  audience,
  startAt,
  attachPreselect,
  buy = buyForRecipient,
  buySelf = buyForSelf,
  selfFirst,
  autoPaySelf,
  holder,
  onGoTo,
  attachOn,
}: CheckoutSheetProps) {
  const surfaceData = audience === "parent" ? ({ surface: "for_parents" } as const) : {};
  // PARENTS-V2-1 review F3: the /for-parents pay-first path reports recipient "other" exactly as before (a parent pays for the child); it
  // would say "self" only if the buyer actually picks "me" (that choice is made after payment and sends no guest_pay_* event).
  const parentPayFirst = audience === "parent" && attachPreselect === "other";
  const selfRecipient = parentPayFirst ? "other" : "self";
  // CHECKOUT-SELF-2: signed out, student-side, not asked to open at the box -> "Buy for yourself" first.
  const [selfOutFirst] = useState(() => !signedIn && startAt !== "other" && (audience !== "parent" || attachPreselect === "other") && (selfFirst ?? isCheckoutSelfClientEnabled()));
  const [step, setStep] = useState<Step>(holder && signedIn ? { name: "holder" } : selfOutFirst ? { name: "selfOut" } : signedIn && startAt !== "other" ? { name: "self" } : { name: "form" });
  const showAttach = attachOn ?? isSelfAttachClientEnabled();
  // CHECKOUT-ONE-TAP-1: decided once at mount (like selfOutFirst).
  const [autoSelf] = useState(() => autoPaySelf === true && selfOutFirst && showAttach && audience !== "parent" && !holder);
  const autoRan = useRef(false);
  const goTo = onGoTo || ((path: string) => window.location.assign(path));
  // SELFPAY-ATTACH-1: the title the after-payment flow wants, and whether closing now needs the "your payment is safe" line.
  const [attachTitle, setAttachTitle] = useState("");
  const [attachSettled, setAttachSettled] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [meNow, setMeNow] = useState(0);
  // PAID-SHOWS-1: Razorpay's signed proof of a VERIFIED signed-out payment -> the purchase card, first on the paid screen.
  const [receipt, setReceipt] = useState<AttachProof | null>(null);
  const [receiptHidden, setReceiptHidden] = useState(false);
  // GST-AFTER-PAY-1: a SIGNED-IN payer buying for someone else has no receipt proof; the account route takes the verified order id.
  const [gstProof, setGstProof] = useState<AttachProof | null>(null); // the signed-out payer's proof for the GST block, kept even when /verify failed
  const [accountGstOrder, setAccountGstOrder] = useState<string | null>(null);
  const onAttachTitle = useCallback((t: string) => setAttachTitle(t), []);
  const onAttachSettled = useCallback((v: boolean) => setAttachSettled(v), []);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [showSecond, setShowSecond] = useState(false);
  const [touched, setTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackNamedEvent("guest_pay_option_shown", { recipient: ((signedIn && startAt !== "other") || selfOutFirst) && !parentPayFirst ? "self" : "other", ...surfaceData });
  // `startAt` is a mount-time choice (the sheet is mounted fresh per open); it must not re-fire the once-only event.
  }, [signedIn]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [step.name]);

  // CHECKOUT-ONE-TAP-1: the tap that opened the sheet IS the Pay tap. Once per mount (StrictMode / re-render safe).
  useEffect(() => {
    if (!autoSelf || autoRan.current) return;
    autoRan.current = true;
    void paySelf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = step.name === "busy" || step.name === "selfBusy";
  // CHECKOUT-FAST-1: ~6 s without Razorpay's sheet -> one honest second line.
  const slowOpen = useCheckoutSlow(busy);
  // SELFPAY-ATTACH-1: closing before choosing who it is for asks first (one line; the payment is already safe).
  const attachPending = step.name === "attach" && !attachSettled;
  const attachContactMasked = step.name === "attach" && step.contact ? attachMaskedIds(step.contact)[0] || "" : "";
  const requestClose = useCallback(() => {
    if (attachPending) setConfirmClose(true);
    else onClose();
  }, [attachPending, onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose, busy]);

  const a = detectIdentifier(first);
  const b = detectIdentifier(second);
  const otherKind = a.kind === "email" ? "phone" : "email";
  const recipient = readRecipient(first, showSecond ? second : "");
  const firstError = touched && first.trim() && !a.value ? WHO_BAD_FIRST : null;
  const secondError =
    showSecond && second.trim() && (b.kind !== otherKind || !b.value) ? (otherKind === "email" ? WHO_BAD_EMAIL : WHO_BAD_MOBILE) : null;

  async function pay() {
    setTouched(true);
    if (!recipient || busy) return;
    trackNamedEvent("guest_pay_start", { recipient: "other", ...surfaceData });
    setStep({ name: "busy" });
    const attemptId = newCheckoutAttemptId();
    const outcome = await buy(item, recipient, signedIn);
    if (outcome.status === "paid") {
      trackNamedEvent("guest_pay_paid", { recipient: "other", ...surfaceData });
      // The sale itself, only once the SERVER verified it (the same helper and event names as pay-by-phone).
      if (outcome.confirmed) trackGuestPurchase(item, outcome, attemptId);
      if (outcome.receipt && !signedIn) {
        storeReceiptProof(outcome.receipt);
        setReceipt(outcome.receipt);
      }
      if (signedIn && outcome.orderId) setAccountGstOrder(outcome.orderId);
      if (!signedIn && outcome.gstProof) setGstProof(outcome.gstProof);
      setStep({ name: "paid", recipient, confirmed: outcome.confirmed });
    } else if (outcome.status === "already_covered") {
      setStep({ name: "covered" });
    } else if (outcome.status === "unavailable") {
      setStep({ name: "unavailable" });
    } else if (outcome.status === "invalid") {
      setStep({ name: "form", error: WHO_BAD_FIRST });
    } else if (outcome.status === "dismissed") {
      setStep({ name: "form", closed: true });
    } else {
      setStep({ name: "form", error: WHO_FAILED });
    }
  }

  async function paySelf() {
    if (busy) return;
    // The funnel stays comparable: guest_pay_start fires for BOTH paths (recipient "self" here, "other" for the box); the new
    // event marks the new primary tap. Names + the path only - nothing about the buyer.
    if (!parentPayFirst) trackNamedEvent("guest_pay_self_start", { recipient: "self", ...surfaceData });
    trackNamedEvent("guest_pay_start", { recipient: selfRecipient, ...surfaceData });
    setStep({ name: "selfBusy" });
    const attemptId = newCheckoutAttemptId();
    const outcome = await buySelf(item);
    if (outcome.status === "paid") {
      trackNamedEvent("guest_pay_paid", { recipient: selfRecipient, ...surfaceData });
      if (outcome.confirmed) trackGuestPurchase(item, outcome, attemptId);
      if (outcome.receipt) {
        storeReceiptProof(outcome.receipt);
        setReceipt(outcome.receipt);
      }
      if (outcome.gstProof) setGstProof(outcome.gstProof);
      // SELFPAY-ATTACH-1: the server holds this order until the payer says who it is for.
      if (outcome.attach && outcome.confirmed && showAttach) setStep({ name: "attach", proof: outcome.attach, contact: outcome.contact });
      else setStep(outcome.contact ? { name: "paid", recipient: outcome.contact, confirmed: outcome.confirmed } : { name: "paidSelf", confirmed: outcome.confirmed });
    } else if (outcome.status === "unavailable") {
      setStep({ name: "unavailable" });
    } else if (outcome.status === "dismissed") {
      setStep({ name: "selfOut", closed: true });
    } else {
      setStep({ name: "selfOut", error: WHO_FAILED });
    }
  }

  let body;
  if (autoSelf && (step.name === "selfBusy" || (step.name === "selfOut" && !step.error && !step.closed))) {
    // CHECKOUT-ONE-TAP-1: no pre-pay step - just the status while Razorpay opens. After a dismissal / failure the ordinary Pay step shows.
    body = (
      <>
        <p className="lt-gps__fine" role="status" data-testid="who-auto-opening">{CHECKOUT_OPENING_COPY}</p>
        {slowOpen && <p className="lt-gps__fine" role="status" data-testid="who-slow-open">{CHECKOUT_SLOW_COPY}</p>}
      </>
    );
  } else if (step.name === "selfOut" || step.name === "selfBusy") {
    const selfError = step.name === "selfOut" ? step.error : undefined;
    body = (
      <>
        {/* SELFPAY-ATTACH-1c (owner 12 Nov): with the pay-first flow the choice comes AFTER payment, so the old "Pay first. Then sign
            in…" line and the pre-payment "Buying for someone else?" link are dropped; both stay when the attach flow is switched off. */}
        {!showAttach && <p className="lt-gps__fine" data-testid="who-self-help">{SELF_HELP}</p>}
        {selfError && <p className="lt-gps__error" role="alert">{selfError}</p>}
        {step.name === "selfOut" && step.closed && <p className="lt-gps__fine" role="status">{WHO_CLOSED}</p>}
        {step.name === "selfOut" && step.closed && <InAppPayRescue buy={buyTargetFromItem(item)} />}
        {/* PARENT-PAY-FIRST-1: signed out, pay-first (the parent pays, then enters the child's number): the closed sheet leads with "Send to Mummy/Papa". */}
        {step.name === "selfOut" && (step.closed || step.error) && !signedIn && showAttach && audience !== "parent" && (
          <ParentForwardGuest item={{ kind: item.kind, sku: item.sku, ...(item.kind === "pack" && item.target ? { target: item.target } : {}), label: item.label }} flow="attach" />
        )}
        {/* PAY-RETURN-1: one line, in-app browsers only. */}
        <PayReturnHint />
        <button type="button" className="lt-gps__primary" disabled={busy} data-testid="who-pay-self-out" onClick={() => void paySelf()}>
          {busy ? CHECKOUT_OPENING_COPY : payReadBack(item.priceDisplay, "")}
        </button>
        {busy && slowOpen && <p className="lt-gps__fine" role="status" data-testid="who-slow-open">{CHECKOUT_SLOW_COPY}</p>}
        {showAttach && <p className="lt-gps__fine" data-testid="who-attach-before">{ATTACH_BEFORE_PAY}</p>}
        {!showAttach && (
          <button type="button" className="lt-gps__textlink" disabled={busy} data-testid="who-someone-else" onClick={() => setStep({ name: "form" })}>
            {WHO_SOMEONE_ELSE}
          </button>
        )}
        <button type="button" className="lt-gps__textlink" disabled={busy} onClick={onSignIn} data-testid="who-sign-in-first">
          {WHO_HAVE_ACCOUNT}
        </button>
      </>
    );
  } else if (step.name === "paidSelf") {
    body = (
      <>
        <p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {item.label}</p>
        {step.confirmed ? (
          <>
            <p className="lt-gps__line" data-testid="who-paid-no-contact">{SELF_PAID_NO_CONTACT}</p>
            <a className="lt-gps__primary" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-testid="who-paid-whatsapp">Message us on WhatsApp</a>
          </>
        ) : (
          <>
            <p className="lt-gps__line" data-testid="who-paid-unconfirmed">{SELF_PAID_UNCONFIRMED}</p>
            <button type="button" className="lt-gps__primary" onClick={onSignInWithEmail} data-testid="who-signin">Sign in</button>
          </>
        )}
      </>
    );
  } else if (step.name === "self") {
    body = (
      <>
        <p className="lt-gps__line" data-testid="who-self">{selfLine(selfMasked)}</p>
        <button
          type="button"
          className="lt-gps__primary"
          data-testid="who-pay-self"
          onClick={() => {
            onClose();
            onPaySelf();
          }}
        >
          {payReadBack(selfPriceDisplay || item.priceDisplay, "")}
        </button>
        <button type="button" className="lt-gps__textlink" data-testid="who-someone-else" onClick={() => setStep({ name: "form" })}>
          {WHO_SOMEONE_ELSE}
        </button>
      </>
    );
  } else if (step.name === "form" || step.name === "busy") {
    const error = step.name === "form" ? step.error : undefined;
    body = (
      <form
        className="lt-gps__panel-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void pay();
        }}
      >
        <label className="lt-gps__label" htmlFor="lt-who-first">{audience === "parent" ? WHO_PARENT_FIELD_LABEL : WHO_FIELD_LABEL}</label>
        <p className="lt-gps__fine lt-who__help" id="lt-who-help" data-testid="who-help">{audience === "parent" ? WHO_PARENT_FIELD_HELP : WHO_FIELD_HELP}</p>
        <div className="lt-gps__field">
          <input
            id="lt-who-first"
            className="lt-gps__input lt-who__input"
            type="text"
            inputMode={a.kind === "email" ? "email" : "text"}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            value={first}
            disabled={busy}
            onChange={(e) => setFirst(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={firstError ? true : undefined}
            aria-describedby="lt-who-help"
            data-testid="who-first"
          />
        </div>
        {a.kind && <p className="lt-gps__fine" data-testid="who-kind">{a.kind === "phone" ? "✓ Mobile number" : "✓ Email"}</p>}
        {firstError && <p className="lt-gps__error" role="alert" data-testid="who-first-error">{firstError}</p>}
        {!showSecond ? (
          <button type="button" className="lt-gps__textlink" disabled={busy} onClick={() => setShowSecond(true)} data-testid="who-add-second">
            {a.kind === "email" ? WHO_ADD_MOBILE : WHO_ADD_EMAIL}
          </button>
        ) : (
          <>
          <label className="lt-gps__label" htmlFor="lt-who-second" data-testid="who-second-label">
            {otherKind === "email" ? WHO_SECOND_EMAIL_LABEL : WHO_SECOND_MOBILE_LABEL}
          </label>
          <div className="lt-gps__field">
            <input
              id="lt-who-second"
              className="lt-gps__input lt-who__input"
              type={otherKind === "email" ? "email" : "tel"}
              inputMode={otherKind === "email" ? "email" : "numeric"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              placeholder={otherKind === "email" ? WHO_SECOND_EMAIL_LABEL : WHO_SECOND_MOBILE_LABEL}
              value={second}
              disabled={busy}
              onChange={(e) => setSecond(e.target.value)}
              data-testid="who-second"
            />
          </div>
          </>
        )}
        {secondError && <p className="lt-gps__error" role="alert" data-testid="who-second-error">{secondError}</p>}
        {error && <p className="lt-gps__error" role="alert">{error}</p>}
        {step.name === "form" && step.closed && <p className="lt-gps__fine" role="status">{WHO_CLOSED}</p>}
        {step.name === "form" && step.closed && <InAppPayRescue buy={buyTargetFromItem(item)} />}
        {!signedIn && <PayReturnHint />}
        <button type="submit" className="lt-gps__primary lt-who__pay" disabled={busy || !recipient} data-testid="who-pay">
          {busy ? CHECKOUT_OPENING_COPY : payReadBack(item.priceDisplay, first)}
        </button>
        {busy && slowOpen && <p className="lt-gps__fine" role="status" data-testid="who-slow-open">{CHECKOUT_SLOW_COPY}</p>}
        {!signedIn && (
          <button type="button" className="lt-gps__textlink" disabled={busy} onClick={onSignIn} data-testid="who-sign-in-first">
            {WHO_HAVE_ACCOUNT}
          </button>
        )}
      </form>
    );
  } else if (step.name === "paid" && step.confirmed && isPayAutoAccountClientEnabled()) {
    // PAY-ACCOUNT-1: the account is made at payment -> open it now, or send it to the child. (Unconfirmed: the screen below.)
    body = (
      <Suspense fallback={<p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {item.label}</p>}>
        <AccountReadyPanel item={item} recipient={step.recipient} payerSignedIn={signedIn} onClose={onClose} />
      </Suspense>
    );
  } else if (step.name === "paid") {
    const ids = maskedIds(step.recipient);
    const r = step.recipient;
    body = (
      <>
        <p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {item.label}</p>
        <p className="lt-gps__line" data-testid="who-paid-line">{paidLine(item.kind, ids)}</p>
        {r.email && <p className="lt-gps__fine">{WHO_EMAILED}</p>}
        {!step.confirmed && <p className="lt-gps__fine">We are still confirming it with the payment provider. It will be ready when they sign in.</p>}
        {signedIn ? (
          <button type="button" className="lt-gps__primary" onClick={onClose} data-testid="who-done">Done</button>
        ) : (
          <button
            type="button"
            className="lt-gps__primary"
            data-testid="who-signin"
            onClick={() => (r.phone ? onSignInWithNumber(tenDigits(r.phone)) : onSignInWithEmail())}
          >
            Sign in
          </button>
        )}
      </>
    );
  } else if (step.name === "covered") {
    // SELFPAY-ATTACH-1 (owner 12 Nov): said plainly, and the box stays one tap away for another number or email. Nothing was charged.
    body = (
      <>
        <p className="lt-who__warn" role="status" data-testid="who-covered">{alreadyHasLine(item.kind, a.kind === "email")}</p>
        <button type="button" className="lt-gps__primary" onClick={() => setStep({ name: "form" })} data-testid="who-covered-another">Use another number or email</button>
        <button type="button" className="lt-gps__textlink" onClick={onClose}>OK</button>
      </>
    );
  } else if (step.name === "holder") {
    // SELFPAY-ATTACH-1 (D): a signed-in holder is told, never charged again, and offered the someone-else box.
    const isPack = item.kind === "pack";
    body = (
      <>
        <span className="lt-who__tag" data-testid="who-holder-tag">{isPack ? "You own this" : "You have it"}</span>
        <p className="lt-gps__line" data-testid="who-holder-title"><strong>{isPack ? `You already own the ${item.label}` : "You already have the Board Pass"}</strong></p>
        <p className="lt-gps__line" data-testid="who-holder-line">
          {isPack
            ? item.sku === "test_series"
              ? "Your Test Series is ready. Start it from My packs."
              : "Your files are in My packs, ready to download."
            : `It's active, ${holder?.until ? `valid till ${holder.until}` : VALIDITY_SHORT}. There's nothing more to pay.`}
        </p>
        <button type="button" className="lt-gps__primary" onClick={() => setStep({ name: "form" })} data-testid="who-holder-other">Buy for someone else</button>
        <button
          type="button"
          className="lt-who__secondary"
          onClick={() => {
            onClose();
            goTo(isPack ? "/packs#my-packs" : "/");
          }}
          data-testid="who-holder-go"
        >
          {isPack ? "Open My packs" : "Go to Home"}
        </button>
      </>
    );
  } else if (step.name === "attach") {
    body = <AttachFlow item={item} proof={step.proof} contact={step.contact} onTitle={onAttachTitle} onClose={onClose} onSettled={onAttachSettled} meNow={meNow} {...(attachPreselect ? { preselect: attachPreselect } : {})} />;
  } else {
    body = (
      <>
        <p className="lt-gps__line" role="status" data-testid="who-unavailable">{WHO_UNAVAILABLE}</p>
        <button type="button" className="lt-gps__primary" onClick={onClose}>OK</button>
      </>
    );
  }

  const showReceipt = !receiptHidden && (step.name === "attach" || step.name === "paid" || step.name === "paidSelf");
  const title = step.name === "attach" ? attachTitle || "Thank you" : step.name === "holder" ? item.label : step.name === "paid" || step.name === "paidSelf" ? "Thank you" : step.name === "self" ? item.label : step.name === "selfOut" || step.name === "selfBusy" ? (item.kind === "pack" && item.sku === "test_series" ? SELF_TITLE_TEST_SERIES : SELF_TITLE) : WHO_TITLE;

  return createPortal(
    <div className="lt-gps" data-testid="who-sheet" onClick={(e) => e.target === e.currentTarget && !busy && requestClose()}>
      <div className="lt-gps__panel" role="dialog" aria-modal="true" aria-labelledby="lt-who-title" tabIndex={-1} ref={panelRef}>
        <div className="lt-gps__head">
          <div>
            <h2 className="lt-gps__title" id="lt-who-title">{title}</h2>
            {step.name !== "paid" && step.name !== "paidSelf" && step.name !== "self" && step.name !== "attach" && step.name !== "holder" && (
              <p className="lt-gps__item">
                {item.label} · {item.priceDisplay}
              </p>
            )}
            {step.name === "self" && <p className="lt-gps__item">{selfPriceDisplay || item.priceDisplay}</p>}
            {step.name !== "paid" && step.name !== "paidSelf" && step.name !== "attach" && step.name !== "holder" && (step.name === "self" && selfPriceDisplay ? selfPriceNote : item.priceBreakdown) && (
              <p className="lt-gps__fine" data-testid="who-gst-breakdown">
                {step.name === "self" && selfPriceDisplay ? selfPriceNote : item.priceBreakdown}
              </p>
            )}
            {item.priceNote && step.name !== "paid" && step.name !== "paidSelf" && step.name !== "attach" && step.name !== "holder" && (
              <p className="lt-gps__fine" data-testid="who-founding-line">{item.priceNote}</p>
            )}
          </div>
          <button type="button" className="lt-gps__close" onClick={requestClose} disabled={busy} aria-label="Close">
            &times;
          </button>
        </div>
        {confirmClose && attachPending ? (
          <div className="lt-who__stack" data-testid="who-close-confirm">
            <p className="lt-who__note" role="alert">{attachContactMasked ? attachCloseConfirm(attachContactMasked) : "Your payment is safe. Sign in with the number or email you paid with to use it."}</p>
            {attachContactMasked && (
              <button type="button" className="lt-gps__primary" onClick={() => { setConfirmClose(false); setMeNow((n) => n + 1); }} data-testid="who-close-me-now">
                {`Put it on ${attachContactMasked} now`}
              </button>
            )}
            <button type="button" className={attachContactMasked ? "lt-who__secondary" : "lt-gps__primary"} onClick={() => setConfirmClose(false)} data-testid="who-close-stay">Keep choosing</button>
            <button type="button" className="lt-who__secondary" onClick={onClose} data-testid="who-close-anyway">Close</button>
          </div>
        ) : null}
        {/* The flow stays mounted behind the confirm so "Keep choosing" returns to where the payer was. */}
        <div className="lt-who__stack" hidden={confirmClose && attachPending}>
          {showReceipt && receipt && step.name !== "attach" && (
            <Suspense fallback={null}>
              <PurchaseCard proof={receipt} onHide={() => setReceiptHidden(true)} />
            </Suspense>
          )}
          {body}
          {showReceipt && receipt && step.name === "attach" && (
            <Suspense fallback={null}>
              <PurchaseCard proof={receipt} onHide={() => setReceiptHidden(true)} hidePaymentLine filesFolded={!attachSettled} />
            </Suspense>
          )}
          {(step.name === "attach" || step.name === "paid" || step.name === "paidSelf") && gstProof && (
            <Suspense fallback={null}>
              <PostPayGst target={{ kind: "guest", proof: gstProof }} />
            </Suspense>
          )}
          {step.name === "paid" && accountGstOrder && (
            <Suspense fallback={null}>
              <PostPayGst target={{ kind: "account", orderId: accountGstOrder }} />
            </Suspense>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
