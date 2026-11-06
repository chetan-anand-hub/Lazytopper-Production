/**
 * CheckoutSheet — "Who will use it?" (CHECKOUT-WHO-1, owner 3 Nov 2026; prototype Checkout-Flow, three flows).
 *
 * ONE sheet behind every Board Pass and pack Pay / Buy while VITE_CHECKOUT_WHO_ENABLED is on (callers: PassCheckout and
 * the shared pack shop's buy, which every other Pay / Buy button already funnels into). Mounted lazily, never in the entry.
 *
 *   SIGNED IN      "For: you · <masked own email/phone>" + "Pay ₹X" -> the caller's EXISTING signed-in checkout (one tap,
 *                  same Razorpay, same events). "Buying for someone else?" opens the box below.
 *   SIGNED OUT /   "Who will use it?" - ONE box for a mobile number or an email (detected), "+ Add their email / mobile too
 *   SOMEONE ELSE   (optional)", and a Pay button that reads back exactly what was typed. Server-priced guest order with a
 *                  recipient -> Razorpay -> server verify -> "Sign in with <masked> — the Board Pass is already there."
 *
 * Nothing here grants anything. What the payer typed never goes into a URL, storage or an analytics event.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { newCheckoutAttemptId, trackNamedEvent } from "../../analytics/analytics";
import { trackGuestPurchase } from "../guestPay/GuestPaySheet";
import { tenDigits, type GuestItem } from "../../services/guestPay";
import {
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
  alreadyCoveredLine,
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

/**
 * `priceDisplay` is the amount CHARGED (it is what the Pay button names). GST-EXCL-1: `priceBreakdown` is the GST breakup shown
 * on the sheet before Razorpay opens ("₹1,917 + ₹345 GST (18%) = ₹2,262"); null/absent = nothing to break up (a pack, or
 * before 7 Nov 2026).
 */
export type CheckoutSheetItem = GuestItem & { priceDisplay: string; priceBreakdown?: string | null };

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
  /** Test seam. */
  buy?: (item: GuestItem, recipient: Recipient, signedIn: boolean) => Promise<WhoBuyOutcome>;
}

type Step =
  | { name: "self" }
  | { name: "form"; error?: string; closed?: boolean }
  | { name: "busy" }
  | { name: "paid"; recipient: Recipient; confirmed: boolean }
  | { name: "covered" }
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
  buy = buyForRecipient,
}: CheckoutSheetProps) {
  const surfaceData = audience === "parent" ? ({ surface: "for_parents" } as const) : {};
  const [step, setStep] = useState<Step>(signedIn && startAt !== "other" ? { name: "self" } : { name: "form" });
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [showSecond, setShowSecond] = useState(false);
  const [touched, setTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackNamedEvent("guest_pay_option_shown", { recipient: signedIn && startAt !== "other" ? "self" : "other", ...surfaceData });
  // `startAt` is a mount-time choice (the sheet is mounted fresh per open); it must not re-fire the once-only event.
  }, [signedIn]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [step.name]);

  const busy = step.name === "busy";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

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

  let body;
  if (step.name === "self") {
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
        <button type="submit" className="lt-gps__primary lt-who__pay" disabled={busy || !recipient} data-testid="who-pay">
          {busy ? "Opening payment…" : payReadBack(item.priceDisplay, first)}
        </button>
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
    body = (
      <>
        <p className="lt-gps__line" role="status" data-testid="who-covered">{alreadyCoveredLine(item.kind)}</p>
        <button type="button" className="lt-gps__primary" onClick={onClose}>OK</button>
      </>
    );
  } else {
    body = (
      <>
        <p className="lt-gps__line" role="status" data-testid="who-unavailable">{WHO_UNAVAILABLE}</p>
        <button type="button" className="lt-gps__primary" onClick={onClose}>OK</button>
      </>
    );
  }

  const title = step.name === "paid" ? "Thank you" : step.name === "self" ? item.label : WHO_TITLE;

  return createPortal(
    <div className="lt-gps" data-testid="who-sheet" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="lt-gps__panel" role="dialog" aria-modal="true" aria-labelledby="lt-who-title" tabIndex={-1} ref={panelRef}>
        <div className="lt-gps__head">
          <div>
            <h2 className="lt-gps__title" id="lt-who-title">{title}</h2>
            {step.name !== "paid" && step.name !== "self" && (
              <p className="lt-gps__item">
                {item.label} · {item.priceDisplay}
              </p>
            )}
            {step.name === "self" && <p className="lt-gps__item">{selfPriceDisplay || item.priceDisplay}</p>}
            {step.name !== "paid" && (step.name === "self" && selfPriceDisplay ? selfPriceNote : item.priceBreakdown) && (
              <p className="lt-gps__fine" data-testid="who-gst-breakdown">
                {step.name === "self" && selfPriceDisplay ? selfPriceNote : item.priceBreakdown}
              </p>
            )}
          </div>
          <button type="button" className="lt-gps__close" onClick={onClose} disabled={busy} aria-label="Close">
            &times;
          </button>
        </div>
        {body}
      </div>
    </div>,
    document.body,
  );
}
