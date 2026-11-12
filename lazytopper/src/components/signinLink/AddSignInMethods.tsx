/**
 * AddSignInMethods - LINK-SIGNIN-1: the two "add" paths (a phone number, a Google account) for the signed-in account.
 * Shared by the after-purchase card and the profile's "Ways to sign in". Linking only (never a sign-in that switches uid), and
 * never an auto-merge: a phone / Google account that already has its own LazyTopper account is refused with a WhatsApp line.
 *
 * Phone: the existing AuthContext.sendLinkPhoneOtp / confirmLinkPhoneOtp (linkWithPhoneNumber + the ONE invisible reCAPTCHA
 * lifecycle in initPhoneRecaptcha - reused, not duplicated). Google: services/linkSignInEmail.linkGoogleToCurrentAccount.
 */
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { authClient } from "../../services/firebaseClient";
import { normaliseTypedIndianMobile } from "../../utils/indianMobileInput";
import { maskPhone } from "../../lib/maskContact";
import { WHATSAPP_URL } from "../../config/socialProfiles";
import {
  BTN_ADD_GOOGLE,
  BTN_ADD_PHONE,
  currentSignInMasked,
  describeLinkError,
  entriesFromAuthUser,
  hasKind,
  listLinkedMethods,
  otpSentLine,
  successLine,
  type LinkError,
  type LinkedMethod,
} from "./signinLinkModel";
import { trackSigninLinkAdded, trackSigninLinkFailed } from "./signinLinkAnalytics";
import "./signinLink.css";

const RECAPTCHA_ID = "lt-signin-link-recaptcha";

export interface AddSignInMethodsProps {
  methods: readonly LinkedMethod[];
  onLinked: () => void;
  /** Extra button rendered beside the add buttons (the card's "No, just me"). */
  extra?: ReactNode;
}

export default function AddSignInMethods({ methods, onLinked, extra }: AddSignInMethodsProps) {
  const { user, sendLinkPhoneOtp, confirmLinkPhoneOtp } = useAuth();
  const [mode, setMode] = useState<"idle" | "number" | "otp">("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LinkError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /** The current sign-in as it was BEFORE this add, so the success line names both credentials. */
  const beforeRef = useRef("");

  const fail = (err: unknown) => {
    const e = describeLinkError(err);
    setError(e);
    trackSigninLinkFailed(e.code);
  };
  const freshMethods = (): LinkedMethod[] => {
    const live = authClient?.currentUser;
    const entries =
      live && Array.isArray(live.providerData) && live.providerData.length > 0
        ? live.providerData.map((p) => ({ providerId: p.providerId, email: p.email, phoneNumber: p.phoneNumber }))
        : user
          ? entriesFromAuthUser(user)
          : [];
    return listLinkedMethods(entries);
  };
  const finish = (kind: "phone" | "google") => {
    const after = freshMethods();
    const added = after.find((m) => m.kind === kind)?.masked ?? "";
    setDone(successLine(beforeRef.current, added));
    setMode("idle");
    setPhone("");
    setOtp("");
    trackSigninLinkAdded(kind);
    onLinked();
  };

  const startPhone = () => {
    beforeRef.current = currentSignInMasked(methods);
    setError(null);
    setMode("number");
  };

  const addGoogle = async () => {
    if (busy) return;
    beforeRef.current = currentSignInMasked(methods);
    setError(null);
    setBusy(true);
    try {
      const { linkGoogleToCurrentAccount } = await import("../../services/linkSignInEmail");
      await linkGoogleToCurrentAccount();
      finish("google");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mode === "number") {
      if (phone.length !== 10) {
        setError({ kind: "error", text: "Enter the 10-digit mobile number.", whatsapp: false, code: "lt/short-number" });
        return;
      }
      setBusy(true);
      try {
        await sendLinkPhoneOtp(`+91${phone}`, RECAPTCHA_ID);
        setMode("otp");
      } catch (err) {
        fail(err);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (otp.length !== 6) {
      setError({ kind: "error", text: "Enter the 6-digit code.", whatsapp: false, code: "lt/short-code" });
      return;
    }
    setBusy(true);
    try {
      await confirmLinkPhoneOtp(otp);
      finish("phone");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const showPhone = !hasKind(methods, "phone");
  const showGoogle = !hasKind(methods, "google");

  return (
    <div className="lt-sil" data-testid="signin-link-panel">
      {done && (
        <p className="lt-sil__done" role="status" data-testid="signin-link-done">
          {done}
        </p>
      )}

      {mode === "idle" && (showPhone || showGoogle || extra) && (
        <div className="lt-sil__row">
          {showPhone && (
            <button type="button" className="lt-sil__btn lt-sil__btn--primary" onClick={startPhone} disabled={busy} data-testid="signin-link-add-phone">
              {BTN_ADD_PHONE}
            </button>
          )}
          {showGoogle && (
            <button type="button" className="lt-sil__btn" onClick={() => void addGoogle()} disabled={busy} data-testid="signin-link-add-google">
              {BTN_ADD_GOOGLE}
            </button>
          )}
          {extra}
        </div>
      )}

      {mode !== "idle" && (
        <form onSubmit={submit} noValidate className="lt-sil__form">
          {mode === "number" ? (
            <>
              <label htmlFor="lt-sil-phone" className="lt-sil__label">
                Phone number
              </label>
              <div className="lt-sil__phone">
                <span className="lt-sil__cc" aria-hidden="true">
                  +91
                </span>
                <input
                  id="lt-sil-phone"
                  className="lt-sil__input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(normaliseTypedIndianMobile(e.target.value))}
                  data-testid="signin-link-phone"
                />
              </div>
            </>
          ) : (
            <>
              <p className="lt-sil__p" data-testid="signin-link-otp-sent">
                {otpSentLine(maskPhone(`+91${phone}`) || "+91 •••••")}
              </p>
              <label htmlFor="lt-sil-otp" className="lt-sil__label">
                6-digit code
              </label>
              <input
                id="lt-sil-otp"
                className="lt-sil__input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                data-testid="signin-link-otp"
              />
            </>
          )}
          <div className="lt-sil__row">
            <button type="submit" className="lt-sil__btn lt-sil__btn--primary" disabled={busy} data-testid="signin-link-submit">
              {mode === "number" ? (busy ? "Sending code..." : "Send code") : busy ? "Adding..." : "Add this number"}
            </button>
            <button
              type="button"
              className="lt-sil__btn"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setError(null);
                setOtp("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className={`lt-sil__err lt-sil__err--${error.kind}`} role="alert" data-testid="signin-link-error" data-code={error.code}>
          {error.text}
          {error.whatsapp && (
            <>
              {" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-testid="signin-link-whatsapp">
                Message us on WhatsApp
              </a>
            </>
          )}
        </p>
      )}

      {/* The ONE invisible reCAPTCHA host (AuthContext.initPhoneRecaptcha reuses / rebuilds it). */}
      <div id={RECAPTCHA_ID} />
    </div>
  );
}
