/**
 * GuestPaySheet — "How do you want to pay?" for a SIGNED-OUT visitor who tapped a price (PAY-PHONE-1, owner 2 Nov 2026).
 *
 *   PRIMARY    "Pay now with your phone number" -> +91 field -> Razorpay with that number READ-ONLY -> success screen
 *              -> "Sign in with this number" (the existing phone sign-in, number prefilled via router state).
 *   SECONDARY  "Sign in with Google first" (today's flow, unchanged) and "Sign in with phone first".
 *
 * In an app's in-app browser (utils/inAppBrowser.ts), where Google sign-in fails, the phone options come first.
 * Mounted only by the callers while `isGuestPayClientEnabled()` is true and the visitor is signed out. Nothing here
 * grants anything: the purchase attaches when the account with this verified number signs in (services/guestPay.ts).
 * The number never goes into a URL, storage or an analytics event.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackNamedEvent } from "../../analytics/analytics";
import { inAppBrowser } from "../../utils/inAppBrowser";
import { buyAsGuest, maskIndianMobile, normaliseIndianMobile, tenDigits, type GuestBuyOutcome, type GuestItem } from "../../services/guestPay";
import "./guestPaySheet.css";
import { normaliseTypedIndianMobile, TYPED_MOBILE_MAX_LENGTH } from "../../utils/indianMobileInput";

export const GUEST_PAY_TITLE = "How do you want to pay?";
export const GUEST_PAY_PHONE_CTA = "Pay now with your phone number";
export const GUEST_PAY_GOOGLE_FIRST = "Sign in with Google first";
export const GUEST_PAY_PHONE_FIRST = "Sign in with phone first";
export const GUEST_PAY_SAME_NUMBER = "You'll use this same number to sign in and get your purchase.";
export const GUEST_PAY_BAD_NUMBER = "Enter a 10-digit Indian mobile number.";
export const GUEST_PAY_FAILED = "We couldn't start the payment. You have not been charged. Please try again.";
export const GUEST_PAY_SIGNIN_CTA = "Sign in with this number";
/** Owner ruling 2 Nov 2026: a number that already has an account signs in (nothing about what it owns is said). */
export const GUEST_PAY_ACCOUNT_EXISTS = "This number already has a LazyTopper account. Sign in with it to continue.";
/** The small line on the number step. */
export const GUEST_PAY_BOUGHT_BEFORE = "Bought from LazyTopper before? Sign in with that number instead.";
/** Review fix 4: generic - the same words whatever the reason, so nobody learns whether a number has a purchase. */
export const GUEST_PAY_UNAVAILABLE = "We couldn't start a payment for this number. If you have paid with it before, sign in with it to get your purchase.";

/** "Now sign in with +91 98•••••948 to download it." / "... to switch on Premium." */
export function guestPaidLine(kind: GuestItem["kind"], phoneMasked: string): string {
  return `Now sign in with ${phoneMasked} to ${kind === "pack" ? "download it" : "switch on Premium"}.`;
}

export function formatRupees(inr: number | undefined): string {
  return typeof inr === "number" && Number.isFinite(inr) && inr > 0 ? `₹${inr.toLocaleString("en-IN")}` : "";
}

export interface GuestPaySheetProps {
  item: GuestItem;
  /**
   * Signed-in "first" options: the caller's existing sign-in navigation (Google flow unchanged), returning to the
   * purchase. `tenDigits` (phone only) prefills the number - used when this number already has an account.
   */
  /** `existingAccount` (GUEST-SIGNIN-RETURNING-1): true when the student is already known to have an account (409 account_exists, or "bought before"), so /login opens on "Already have an account". */
  onSignInFirst: (method: "google" | "phone", tenDigits?: string, existingAccount?: boolean) => void;
  /** After payment: open the existing phone sign-in with this 10-digit number prefilled. */
  onSignInWithNumber: (tenDigitNumber: string) => void;
  onClose: () => void;
  /** Test seam. */
  buy?: (item: GuestItem, phone: string) => Promise<GuestBuyOutcome>;
  /** Test seam: the user agent (default navigator.userAgent). */
  userAgent?: string;
}

type Step =
  | { name: "choose" }
  | { name: "phone"; error?: string; closed?: boolean }
  | { name: "busy" }
  | { name: "paid"; phoneMasked: string; phone: string; amountInr?: number; confirmed: boolean }
  | { name: "already"; phoneMasked: string; phone: string }
  | { name: "exists"; phone: string };

function readUserAgent(): string {
  try {
    return typeof navigator !== "undefined" ? navigator.userAgent : "";
  } catch {
    return "";
  }
}

export default function GuestPaySheet({ item, onSignInFirst, onSignInWithNumber, onClose, buy = buyAsGuest, userAgent }: GuestPaySheetProps) {
  const [step, setStep] = useState<Step>({ name: "choose" });
  const [digits, setDigits] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inApp = inAppBrowser(userAgent ?? readUserAgent()) !== null;
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackNamedEvent("guest_pay_option_shown");
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, [step.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step.name !== "busy") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step.name]);

  const valid = normaliseIndianMobile(digits) !== null && digits.length === 10;

  async function pay() {
    if (!valid || step.name === "busy") {
      if (!valid) setStep({ name: "phone", error: GUEST_PAY_BAD_NUMBER });
      return;
    }
    trackNamedEvent("guest_pay_start");
    setStep({ name: "busy" });
    const outcome = await buy(item, digits);
    if (outcome.status === "paid") {
      trackNamedEvent("guest_pay_paid");
      setStep({ name: "paid", phoneMasked: outcome.phoneMasked, phone: outcome.phone, amountInr: outcome.amountInr, confirmed: outcome.confirmed });
    } else if (outcome.status === "already_paid") {
      setStep({ name: "already", phoneMasked: outcome.phoneMasked, phone: outcome.phone });
    } else if (outcome.status === "account_exists") {
      setStep({ name: "exists", phone: outcome.phone });
    } else if (outcome.status === "invalid_phone") {
      setStep({ name: "phone", error: GUEST_PAY_BAD_NUMBER });
    } else if (outcome.status === "dismissed") {
      setStep({ name: "phone", closed: true });
    } else {
      setStep({ name: "phone", error: GUEST_PAY_FAILED });
    }
  }

  const secondary = inApp ? (["phone", "google"] as const) : (["google", "phone"] as const);
  const busy = step.name === "busy";

  let body;
  if (step.name === "choose") {
    body = (
      <>
        <button type="button" className="lt-gps__primary" onClick={() => setStep({ name: "phone" })} data-testid="guest-pay-phone">
          {GUEST_PAY_PHONE_CTA}
        </button>
        <p className="lt-gps__or">or</p>
        {secondary.map((m) => (
          <button key={m} type="button" className="lt-gps__secondary" onClick={() => onSignInFirst(m)} data-testid={`guest-pay-first-${m}`}>
            {m === "google" ? GUEST_PAY_GOOGLE_FIRST : GUEST_PAY_PHONE_FIRST}
          </button>
        ))}
      </>
    );
  } else if (step.name === "phone" || step.name === "busy") {
    const error = step.name === "phone" ? step.error : undefined;
    body = (
      <form
        className="lt-gps__panel-form"
        onSubmit={(e) => {
          e.preventDefault();
          void pay();
        }}
      >
        <label className="lt-gps__label" htmlFor="lt-gps-phone">Your mobile number</label>
        <div className="lt-gps__field">
          <span className="lt-gps__cc" aria-hidden="true">+91</span>
          <input
            id="lt-gps-phone"
            className="lt-gps__input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={TYPED_MOBILE_MAX_LENGTH}
            value={digits}
            disabled={busy}
            onChange={(e) => setDigits(normaliseTypedIndianMobile(e.target.value))}
            aria-describedby="lt-gps-hint"
            data-testid="guest-pay-input"
          />
        </div>
        <p className="lt-gps__hint" id="lt-gps-hint">{GUEST_PAY_SAME_NUMBER}</p>
        <p className="lt-gps__fine">
          <button type="button" className="lt-gps__textlink" onClick={() => onSignInFirst("phone", undefined, true)} disabled={busy} data-testid="guest-pay-bought-before">
            {GUEST_PAY_BOUGHT_BEFORE}
          </button>
        </p>
        {error && <p className="lt-gps__error" role="alert">{error}</p>}
        {step.name === "phone" && step.closed && <p className="lt-gps__fine" role="status">Payment window closed. Tap Continue to try again.</p>}
        <button type="submit" className="lt-gps__primary" disabled={busy || !valid} data-testid="guest-pay-continue">
          {busy ? "Opening payment…" : "Continue"}
        </button>
      </form>
    );
  } else if (step.name === "paid") {
    const amount = formatRupees(step.amountInr);
    body = (
      <>
        <p className="lt-gps__ok" role="status" data-testid="guest-pay-paid">
          Payment received ✓ {amount ? `${amount} · ` : ""}{item.label}
        </p>
        <p className="lt-gps__line">{guestPaidLine(item.kind, step.phoneMasked)}</p>
        {!step.confirmed && <p className="lt-gps__fine">We are still confirming it with the payment provider. It will be ready when you sign in.</p>}
        <button type="button" className="lt-gps__primary" onClick={() => onSignInWithNumber(tenDigits(step.phone))} data-testid="guest-pay-signin">
          {GUEST_PAY_SIGNIN_CTA}
        </button>
        <p className="lt-gps__fine">Use the same number. A different number won&rsquo;t find this purchase.</p>
      </>
    );
  } else if (step.name === "exists") {
    body = (
      <>
        <p className="lt-gps__line" role="status" data-testid="guest-pay-exists">{GUEST_PAY_ACCOUNT_EXISTS}</p>
        <button type="button" className="lt-gps__primary" onClick={() => onSignInFirst("phone", tenDigits(step.phone), true)} data-testid="guest-pay-exists-signin">
          {GUEST_PAY_SIGNIN_CTA}
        </button>
      </>
    );
  } else {
    body = (
      <>
        <p className="lt-gps__line" role="status" data-testid="guest-pay-already">
          {GUEST_PAY_UNAVAILABLE}
        </p>
        <button type="button" className="lt-gps__primary" onClick={() => onSignInWithNumber(tenDigits(step.phone))}>
          {GUEST_PAY_SIGNIN_CTA}
        </button>
      </>
    );
  }

  const title = step.name === "paid" ? "Thank you" : step.name === "choose" ? GUEST_PAY_TITLE : "Pay with your phone number";

  return createPortal(
    <div className="lt-gps" data-testid="guest-pay-sheet" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="lt-gps__panel" role="dialog" aria-modal="true" aria-labelledby="lt-gps-title" tabIndex={-1} ref={panelRef}>
        <div className="lt-gps__head">
          <div>
            <h2 className="lt-gps__title" id="lt-gps-title">{title}</h2>
            {step.name !== "paid" && <p className="lt-gps__item">{item.label}</p>}
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

/** Re-export for callers that show the masked number elsewhere. */
export { maskIndianMobile };
