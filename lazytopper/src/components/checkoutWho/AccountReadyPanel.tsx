/**
 * AccountReadyPanel — the thank-you screen of "pay first, the account is made for them" (PAY-ACCOUNT-1, owner 4 Nov 2026).
 *
 * Shown by CheckoutSheet after a CONFIRMED recipient payment while VITE_PAY_AUTO_ACCOUNT_ENABLED is on (the server made the
 * recipient's account at payment, or it already existed - the screen is the same either way: nothing here says which).
 *
 *   "Payment received ✓ <product>." + "It goes onto the student's LazyTopper account." (the same true words whether the
 *   account was made, already existed, or is still waiting, and whichever identifier's account received it)
 *   a. "It's for me — open it now" (signed-out payer only):
 *        mobile -> the EXISTING phone OTP sign-in (AuthContext sendPhoneOtp / verifyPhoneOtp), number already filled in:
 *                  only the code to type; then My packs (pack) / Home (Board Pass).
 *        email  -> "Send me the sign-in link" (Firebase sendSignInLinkToEmail) + "Check your inbox".
 *   b. "Send it to my child": the Web Share API with a message that names WHAT to sign in with, never the value; fallback a
 *      WhatsApp share of ONLY that text (no number in any URL) + "Copy message".
 *
 * What the payer typed lives in memory only: never a URL, storage or an analytics event.
 */
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CHECK_INBOX,
  COPY_MESSAGE,
  MESSAGE_COPIED,
  OPEN_FOR_ME,
  SEND_ME_LINK,
  SEND_TO_CHILD,
  ACCOUNT_LINE,
  childShareText,
  landingPath,
  whatsappShareUrl,
  type Recipient,
} from "../../services/checkoutWho";
import type { GuestItem } from "../../services/guestPay";

const RECAPTCHA_ID = "lt-who-recaptcha";

export interface AccountReadyPanelProps {
  item: GuestItem & { label: string };
  recipient: Recipient;
  /** The PAYER is signed in (bought for someone else): no "It's for me". */
  payerSignedIn: boolean;
  onClose: () => void;
  /** Test seams. */
  go?: (path: string) => void;
  sendEmailLink?: (email: string, landing: string) => Promise<void>;
}

type Me = { phase: "idle" } | { phase: "sending" } | { phase: "code"; error?: string } | { phase: "verifying" } | { phase: "link-sent" } | { phase: "error"; message: string };

async function defaultSendEmailLink(email: string, landing: string): Promise<void> {
  const m = await import("../../services/linkSignInEmail");
  await m.sendSignInLinkForEmail(email, landing);
}

export default function AccountReadyPanel({ item, recipient, payerSignedIn, onClose, go, sendEmailLink = defaultSendEmailLink }: AccountReadyPanelProps) {
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [me, setMe] = useState<Me>({ phase: "idle" });
  const [code, setCode] = useState("");
  const [shareFallback, setShareFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareText = childShareText(item.label, recipient);
  const viaPhone = !!recipient.phone && (recipient.first === "phone" || !recipient.email);
  const navigate = go || ((path: string) => window.location.assign(path));

  async function openForMe() {
    if (viaPhone && recipient.phone) {
      setMe({ phase: "sending" });
      try {
        await sendPhoneOtp(recipient.phone, RECAPTCHA_ID);
        setMe({ phase: "code" });
      } catch {
        setMe({ phase: "error", message: "We couldn't send the code just now. Please try again." });
      }
      return;
    }
    if (recipient.email) {
      setMe({ phase: "sending" });
      try {
        await sendEmailLink(recipient.email, landingPath(item.kind));
        setMe({ phase: "link-sent" });
      } catch {
        setMe({ phase: "error", message: "We couldn't send the link just now. Please try again." });
      }
    }
  }

  async function verify() {
    const c = code.replace(/\D/g, "");
    if (c.length !== 6) {
      setMe({ phase: "code", error: "Enter the 6-digit code from the SMS." });
      return;
    }
    setMe({ phase: "verifying" });
    try {
      await verifyPhoneOtp(c);
      navigate(landingPath(item.kind));
    } catch {
      setMe({ phase: "code", error: "That code didn't work. Check it and try again." });
    }
  }

  async function sendToChild() {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ text: shareText });
        return;
      } catch (e) {
        // The payer closed the share sheet: nothing to do. Anything else: offer the fallback.
        if (e && typeof e === "object" && (e as { name?: string }).name === "AbortError") return;
      }
    }
    setShareFallback(true);
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const busy = me.phase === "sending" || me.phase === "verifying";
  return (
    <>
      <p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {item.label}</p>
      <p className="lt-gps__line" data-testid="who-account-ready">{ACCOUNT_LINE}</p>

      {me.phase === "code" || me.phase === "verifying" ? (
        <form
          className="lt-gps__panel-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <label className="lt-gps__label" htmlFor="lt-who-otp">Enter the 6-digit code we sent by SMS</label>
          <div className="lt-gps__field">
            <input
              id="lt-who-otp"
              className="lt-gps__input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              disabled={me.phase === "verifying"}
              onChange={(e) => setCode(e.target.value)}
              data-testid="who-otp"
            />
          </div>
          {me.phase === "code" && me.error && <p className="lt-gps__error" role="alert">{me.error}</p>}
          <button type="submit" className="lt-gps__primary" disabled={me.phase === "verifying"} data-testid="who-otp-verify">
            {me.phase === "verifying" ? "Opening…" : "Open LazyTopper"}
          </button>
        </form>
      ) : me.phase === "link-sent" ? (
        <p className="lt-gps__line" role="status" data-testid="who-link-sent">{CHECK_INBOX}</p>
      ) : (
        !payerSignedIn && (
          <button type="button" className="lt-gps__primary" disabled={busy} onClick={() => void openForMe()} data-testid="who-open-me">
            {busy ? "Please wait…" : viaPhone ? OPEN_FOR_ME : SEND_ME_LINK}
          </button>
        )
      )}
      {!payerSignedIn && !viaPhone && me.phase === "idle" && <p className="lt-gps__fine">For you? We email a one-tap sign-in link to that address.</p>}
      {me.phase === "error" && <p className="lt-gps__error" role="alert">{me.message}</p>}

      <button type="button" className={payerSignedIn ? "lt-gps__primary" : "lt-who__secondary"} onClick={() => void sendToChild()} data-testid="who-send-child">
        {SEND_TO_CHILD}
      </button>
      {shareFallback && (
        <div className="lt-who__share" data-testid="who-share-fallback">
          <p className="lt-gps__fine lt-who__share-text">{shareText}</p>
          <a className="lt-who__secondary" href={whatsappShareUrl(shareText)} target="_blank" rel="noopener noreferrer" data-testid="who-share-whatsapp">
            Send on WhatsApp
          </a>
          <button type="button" className="lt-gps__textlink" onClick={() => void copyMessage()} data-testid="who-share-copy">
            {copied ? MESSAGE_COPIED : COPY_MESSAGE}
          </button>
        </div>
      )}
      {payerSignedIn && (
        <button type="button" className="lt-gps__textlink" onClick={onClose} data-testid="who-done">Done</button>
      )}
      <div id={RECAPTCHA_ID} />
    </>
  );
}
