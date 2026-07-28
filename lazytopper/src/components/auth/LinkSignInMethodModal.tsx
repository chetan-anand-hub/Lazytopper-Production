import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPhoneLinked } from "../../lib/signInMethods";

/**
 * LinkSignInMethodModal — add a phone number as a second way to sign in.
 *
 * WHY THIS EXISTS
 * Firebase issues a SEPARATE UID per sign-in method. A student who signs up with
 * Google on a laptop and later uses phone OTP on their handset gets a brand-new
 * account: zero progress, empty Mistake Intelligence, no attempt history. From
 * the student's side the app lost their work. It also degrades the moat — MI is
 * built on accumulated attempts, so a split account halves the signal.
 *
 * The scope is narrower than it looks: the Firebase project has "link accounts
 * that use the same email" enabled, so Google + email/password on one address
 * already merge. The split is PHONE-OTP versus everything else, because a phone
 * account has no email to match on.
 *
 * ★ LINKING IS OPTIONAL, ABSOLUTELY. A student with no phone number must be
 * able to use the product forever with email only. Nothing here gates a
 * feature, blocks a route, or interrupts a login, and no copy implies an
 * account is incomplete without a number.
 *
 * A MODAL, NOT A ROUTE: App.tsx is frozen to zero-diff by the overlay
 * acceptance gates, so a new route cannot merge.
 */

const RECAPTCHA_CONTAINER_ID = "lt-link-recaptcha";

/**
 * ALLOWLIST, not a denylist — the same shape as the password-reset copy.
 *
 * An unrecognised future Firebase code falls through to the neutral message
 * rather than surfacing a raw error string to a student. Fails SAFE: adding a
 * code is a deliberate act, and forgetting one costs clarity, never disclosure.
 */
/**
 * Each entry carries a TONE as well as text.
 *
 * `credential-already-in-use` is not a validation failure — the student did
 * nothing wrong, and it is the moment they learn their work sits in two places.
 * Rendered in error-red it reads as a shouted rejection no matter how careful
 * the words are (the screenshots at 390px made that obvious). It renders as a
 * NOTICE instead: same prominence, none of the blame. Genuine input mistakes —
 * a short number, a wrong code — stay red, because those the student can and
 * should correct.
 */
type Tone = "error" | "notice";
const SURFACEABLE: Record<string, { text: string; tone: Tone }> = {
  // ★ NOT AN EDGE CASE — this is the path EVERY already-split student takes,
  // and it is the moment they learn their work is in two places and we cannot
  // join them yet. It must not read like a validation error.
  "auth/credential-already-in-use": {
    text: "That number is already registered to another account. You can sign in with it instead, or use a different number here. Your work on each account stays where it is — we can't join them together yet.",
    tone: "notice",
  },
  "auth/account-exists-with-different-credential": {
    text: "That number is already registered to another account. You can sign in with it instead, or use a different number here. Your work on each account stays where it is — we can't join them together yet.",
    tone: "notice",
  },
  "auth/invalid-phone-number": {
    text: "That doesn't look like a valid mobile number.",
    tone: "error",
  },
  "auth/invalid-verification-code": {
    text: "That code isn't right. Check the SMS and try again.",
    tone: "error",
  },
  "auth/code-expired": { text: "That code has expired. Send a new one.", tone: "error" },
  "auth/too-many-requests": {
    text: "Too many attempts. Wait a few minutes and try again.",
    tone: "error",
  },
  // ★ UNPROVEN that this ever fires for `linkWithPhoneNumber`. Firebase reserves
  // it for updateEmail / updatePassword / delete / unlink, and no run in this
  // lane produced it here. Kept anyway: handling costs nothing, while omitting
  // it would show the neutral message for something the student could actually
  // fix. Do not treat its presence as evidence the case occurs.
  "auth/requires-recent-login": {
    text: "For your security, sign out and sign in again before adding a number.",
    tone: "notice",
  },
};

const NEUTRAL = {
  text: "Couldn't add that number just now. Please try again.",
  tone: "error" as Tone,
};

function describeLinkError(err: unknown): { text: string; tone: Tone } {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  return SURFACEABLE[code] || NEUTRAL;
}

export default function LinkSignInMethodModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, sendLinkPhoneOtp, confirmLinkPhoneOtp } = useAuth();
  const [step, setStep] = useState<"number" | "otp">("number");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; tone: Tone } | null>(null);

  const phoneLinked = hasPhoneLinked(user);

  // Reset on close so reopening never resumes a half-finished attempt with a
  // stale code on screen.
  useEffect(() => {
    if (open) return;
    setStep("number");
    setPhone("");
    setOtp("");
    setError(null);
    setBusy(false);
  }, [open]);

  if (!open || !user) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (step === "number") {
      if (phone.length !== 10) {
        setError({ text: "Enter your 10-digit mobile number.", tone: "error" });
        return;
      }
      setBusy(true);
      try {
        await sendLinkPhoneOtp(`+91${phone}`, RECAPTCHA_CONTAINER_ID);
        setStep("otp");
      } catch (err) {
        setError(describeLinkError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (otp.length !== 6) {
      setError({ text: "Enter the 6-digit code from the SMS.", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      await confirmLinkPhoneOtp(otp);
      // `providerIds` is re-synced by the context, so the linked state below
      // renders without a reload.
    } catch (err) {
      setError(describeLinkError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign-in methods"
      style={backdropStyle}
      onClick={onClose}
    >
      <div style={cardStyle} onClick={e => e.stopPropagation()}>
        <h2 style={titleStyle}>Sign-in methods</h2>
        <p style={ledeStyle}>
          These are the ways you can sign in to this account.
        </p>

        <ul style={listStyle} aria-label="Linked sign-in methods">
          {user.providerIds.length === 0 ? (
            <li style={rowStyle}>
              <span>No linked provider</span>
            </li>
          ) : (
            user.providerIds.map(id => (
              <li key={id} style={rowStyle}>
                <span>{PROVIDER_LABELS[id] || id}</span>
                <span style={linkedPillStyle}>Linked</span>
              </li>
            ))
          )}
        </ul>

        {phoneLinked ? (
          <p style={doneStyle} role="status">
            Your phone number is linked. You can sign in with it or with your
            other method — either works.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p style={ledeStyle}>
              Add your phone number so you can sign in either way. This is
              optional — your account works exactly the same without it.
            </p>

            {step === "number" ? (
              <>
                <label htmlFor="lt-link-phone" style={labelStyle}>
                  Mobile number
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ ...fieldStyle, width: "auto", fontWeight: 700 }} aria-hidden="true">
                    +91
                  </span>
                  <input
                    id="lt-link-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    style={fieldStyle}
                  />
                </div>
              </>
            ) : (
              <>
                <label htmlFor="lt-link-otp" style={labelStyle}>
                  Enter the 6-digit code
                </label>
                <input
                  id="lt-link-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  style={fieldStyle}
                />
                <p style={sentStyle}>{`Sent to +91${phone}`}</p>
              </>
            )}

            {error ? (
              <p
                style={error.tone === "notice" ? noticeStyle : errorStyle}
                data-tone={error.tone}
                role="alert"
              >
                {error.text}
              </p>
            ) : null}

            <button type="submit" disabled={busy} style={primaryBtnStyle(busy)}>
              {step === "number"
                ? busy
                  ? "Sending code..."
                  : "Send code"
                : busy
                  ? "Adding..."
                  : "Add my number"}
            </button>
          </form>
        )}

        {/* The invisible reCAPTCHA renders here. The id is distinct from
            Login's and /sign-up's; AuthContext tracks which container the live
            verifier was rendered into and rebuilds when it is not this one. */}
        <div id={RECAPTCHA_CONTAINER_ID} />

        <button type="button" onClick={onClose} style={closeBtnStyle}>
          Close
        </button>
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  "google.com": "Google",
  password: "Email and password",
  phone: "Phone number",
};

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(3, 12, 28, 0.62)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const cardStyle: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--bg-card-border)",
  borderRadius: 18,
  padding: "26px 24px",
  width: "100%",
  maxWidth: 420,
  maxHeight: "90vh",
  overflowY: "auto",
};

const titleStyle: CSSProperties = {
  margin: "0 0 6px",
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "1.25rem",
  fontWeight: 800,
  color: "var(--text)",
};

const ledeStyle: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "0.88rem",
  lineHeight: 1.5,
  color: "var(--text-muted)",
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: "0 0 18px",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--bg-card-border)",
  fontSize: "0.88rem",
  color: "var(--text)",
};

const linkedPillStyle: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  color: "#16b96a",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: 7,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  border: "1px solid var(--bg-card-border)",
  borderRadius: 12,
  background: "var(--bg-card)",
  color: "var(--text)",
  padding: "12px 14px",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: "0.95rem",
  outline: "none",
  display: "inline-flex",
  alignItems: "center",
};

const sentStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "0.8rem",
  color: "var(--text-muted)",
};

const errorStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#c0362c",
  fontSize: "0.82rem",
  fontWeight: 600,
  lineHeight: 1.45,
};

/**
 * NOTICE tone — for outcomes that are not the student's mistake. Same
 * prominence as an error (bordered, called out) without the blame of red.
 */
const noticeStyle: CSSProperties = {
  margin: "10px 0 0",
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(22, 185, 106, 0.08)",
  border: "1px solid rgba(22, 185, 106, 0.28)",
  color: "var(--text)",
  fontSize: "0.82rem",
  fontWeight: 600,
  lineHeight: 1.5,
};

const doneStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "0.88rem",
  lineHeight: 1.5,
  color: "var(--text)",
};

function primaryBtnStyle(busy: boolean): CSSProperties {
  return {
    width: "100%",
    marginTop: 16,
    background: "#071a3d",
    color: "#ffffff",
    border: 0,
    borderRadius: 12,
    padding: 14,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: "0.95rem",
    fontWeight: 800,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.55 : 1,
  };
}

const closeBtnStyle: CSSProperties = {
  width: "100%",
  marginTop: 10,
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--bg-card-border)",
  borderRadius: 12,
  padding: 12,
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: "0.88rem",
  fontWeight: 700,
  cursor: "pointer",
};
