import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { creditPendingReferral } from "../services/referralService";

type LocationState = { from?: string };

function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

const LOGIN_CSS = `
  .lt-login-page,
  .lt-login-page * {
    box-sizing: border-box;
  }

  html:has(.lt-login-page),
  body:has(.lt-login-page),
  #root:has(.lt-login-page),
  #root > div:has(.lt-login-page) {
    background: var(--lt-login-bg);
  }

  #root > div:has(.lt-login-page) {
    padding-bottom: 0 !important;
  }

  #root:has(.lt-login-page) > div[style*="position: fixed"][style*="bottom: 0px"] {
    display: none !important;
  }

  .lt-login-page {
    --lt-navy: #071a3d;
    --lt-navy-2: #092858;
    --lt-green: #16b96a;
    --lt-green-dark: #0b8f50;
    --lt-ink: #071a3d;
    --lt-muted: #49627f;
    --lt-soft: #f6fbff;
    --lt-line: rgba(7, 26, 61, 0.12);
    --lt-card: rgba(255, 255, 255, 0.94);
    --lt-login-bg: #f7fbff;

    min-height: 100vh;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(460px, 0.95fr);
    overflow-x: hidden;
    color: var(--lt-ink);
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.12) 0, rgba(22, 185, 106, 0) 24%),
      radial-gradient(circle at 18% 26%, rgba(125, 220, 255, 0.20) 0, rgba(125, 220, 255, 0) 23%),
      linear-gradient(180deg, #fbfdff 0%, #f6fbff 62%, #eef7ff 100%);
  }

  .lt-login-page[data-login-theme="dark"] {
    --lt-ink: #f8fafc;
    --lt-muted: #b8c6d8;
    --lt-soft: #0b203a;
    --lt-card: rgba(10, 31, 55, 0.92);
    --lt-line: rgba(255, 255, 255, 0.14);
    --lt-login-bg: #051733;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.12) 0, rgba(22, 185, 106, 0) 24%),
      linear-gradient(180deg, #071a3d 0%, #051733 100%);
  }

  .lt-login-brand-panel {
    position: relative;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 44px;
    padding: 42px 56px 36px;
    overflow: hidden;
    color: #f8fafc;
    background:
      radial-gradient(circle at 22% 24%, rgba(53, 242, 160, 0.18) 0, rgba(53, 242, 160, 0) 22%),
      radial-gradient(circle at 82% 33%, rgba(125, 220, 255, 0.18) 0, rgba(125, 220, 255, 0) 24%),
      linear-gradient(145deg, #082958 0%, #071a3d 54%, #051733 100%);
  }

  .lt-login-brand-panel:after {
    content: "";
    position: absolute;
    left: 56px;
    right: 56px;
    bottom: 118px;
    height: 1px;
    background: linear-gradient(90deg, rgba(53, 242, 160, 0), rgba(53, 242, 160, 0.55), rgba(125, 220, 255, 0));
    opacity: 0.72;
  }

  .lt-login-home-link,
  .lt-login-mobile-brand,
  .lt-login-back-link {
    text-decoration: none;
  }

  .lt-login-home-link {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    align-self: flex-start;
    color: #f8fafc;
  }

  .lt-login-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 12px;
    background: var(--lt-green);
    color: #06281b;
    font-weight: 900;
    box-shadow: 0 18px 38px rgba(22, 185, 106, 0.28);
  }

  .lt-login-wordmark {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0;
  }

  .lt-login-promise {
    position: relative;
    z-index: 1;
    max-width: 610px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .lt-login-kicker {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    color: #dffff0;
    background: rgba(22, 185, 106, 0.13);
    border: 1px solid rgba(53, 242, 160, 0.24);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lt-login-title {
    margin: 0;
    color: #ffffff;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 3.7rem;
    line-height: 1.02;
    font-weight: 700;
    letter-spacing: 0;
    max-width: 650px;
  }

  .lt-login-lede {
    max-width: 560px;
    margin: 0;
    color: #d8e4ef;
    font-size: 1.02rem;
    line-height: 1.6;
    font-weight: 500;
  }

  .lt-login-benefits {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    max-width: 580px;
    margin-top: 8px;
  }

  .lt-login-benefit {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.08);
    color: #edf7ff;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
  }

  .lt-login-benefit-dot {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--lt-green);
    box-shadow: 0 0 0 5px rgba(22, 185, 106, 0.14);
  }

  .lt-login-loop {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: #adc1d5;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .lt-login-loop span {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    border-radius: 999px;
    padding: 0 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .lt-login-loop strong {
    color: #dffff0;
    font-weight: 900;
  }

  .lt-login-auth-panel {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 34px 48px;
  }

  .lt-login-gate {
    width: 100%;
    max-width: 470px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lt-login-mobile-brand {
    display: none;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    color: var(--lt-ink);
  }

  .lt-login-mobile-brand-sub {
    display: block;
    margin-top: 2px;
    color: var(--lt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lt-login-prompt {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .lt-login-reason-chip {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 11px;
    border-radius: 999px;
    color: var(--lt-green-dark);
    background: rgba(22, 185, 106, 0.12);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lt-login-heading {
    margin: 0;
    color: var(--lt-ink);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2rem;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: 0;
  }

  .lt-login-subcopy {
    margin: 0;
    color: var(--lt-muted);
    font-size: 0.96rem;
    line-height: 1.55;
    font-weight: 500;
  }

  .lt-login-frame {
    width: 100%;
    padding: 22px;
    border-radius: 18px;
    border: 1px solid var(--lt-line);
    background: var(--lt-card);
    box-shadow: 0 24px 80px rgba(7, 26, 61, 0.12);
    backdrop-filter: blur(18px);
  }

  .lt-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    background: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 12px;
    padding: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--lt-ink);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .lt-google:hover:not(:disabled) {
    border-color: #bcc9dc;
    background: #fafcff;
  }

  .lt-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .lt-gmark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }

  .lt-onetap {
    margin: 8px 0 0;
    font-size: 0.78rem;
    color: var(--lt-muted);
    text-align: center;
  }

  .lt-or {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 18px 0 16px;
    color: rgba(7, 26, 61, 0.4);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .lt-or:before,
  .lt-or:after {
    content: "";
    height: 1px;
    flex: 1;
    background: var(--lt-line);
  }

  .lt-toggle {
    display: flex;
    background: #eef2f8;
    border-radius: 11px;
    padding: 4px;
    margin-bottom: 16px;
  }

  .lt-toggle button {
    flex: 1;
    border: 0;
    background: transparent;
    border-radius: 8px;
    padding: 9px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: rgba(7, 26, 61, 0.55);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .lt-toggle button.active {
    background: #ffffff;
    color: var(--lt-ink);
    box-shadow: 0 1px 2px rgba(7, 26, 61, 0.1);
  }

  .lt-login-page[data-login-theme="dark"] .lt-toggle {
    background: rgba(255, 255, 255, 0.08);
  }

  .lt-field-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--lt-ink);
    margin: 0 0 7px;
  }

  .lt-field-label + .lt-field {
    margin-bottom: 12px;
  }

  .lt-field {
    display: flex;
    align-items: center;
    border: 1px solid var(--lt-line);
    border-radius: 12px;
    background: #ffffff;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .lt-field:focus-within {
    border-color: var(--lt-green);
    box-shadow: 0 0 0 3px rgba(22, 185, 106, 0.15);
  }

  .lt-prefix {
    padding: 0 12px;
    align-self: stretch;
    display: flex;
    align-items: center;
    font-size: 0.95rem;
    font-weight: 700;
    color: rgba(7, 26, 61, 0.6);
    background: #f6f9fd;
    border-right: 1px solid var(--lt-line);
  }

  .lt-field input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 13px 14px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.95rem;
    color: var(--lt-ink);
    background: transparent;
  }

  .lt-field input::placeholder {
    color: rgba(7, 26, 61, 0.35);
  }

  .lt-field input:disabled {
    color: rgba(7, 26, 61, 0.4);
    cursor: not-allowed;
  }

  .lt-login-error {
    margin: 2px 0 0;
    color: #c0362c;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .lt-login-note {
    margin: 2px 0 0;
    color: var(--lt-muted);
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .lt-continue {
    width: 100%;
    margin-top: 16px;
    background: var(--lt-navy);
    color: #ffffff;
    border: 0;
    border-radius: 12px;
    padding: 14px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.98rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s, transform 0.05s;
  }

  .lt-continue:hover:not(:disabled) {
    background: #0a2452;
  }

  .lt-continue:active:not(:disabled) {
    transform: scale(0.99);
  }

  .lt-continue:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .lt-signup {
    text-align: center;
    margin: 14px 0 0;
    font-size: 0.86rem;
    color: var(--lt-muted);
  }

  .lt-signup a {
    color: var(--lt-ink);
    font-weight: 800;
    text-decoration: none;
  }

  .lt-signup a:hover {
    color: var(--lt-green-dark);
  }

  .lt-login-linkbtn {
    border: 0;
    background: transparent;
    padding: 0;
    font: inherit;
    color: var(--lt-ink);
    font-weight: 800;
    cursor: pointer;
  }

  .lt-login-linkbtn:hover:not(:disabled) {
    color: var(--lt-green-dark);
  }

  .lt-login-linkbtn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .lt-login-helper {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 11px;
    align-items: start;
    padding: 13px 14px;
    border-radius: 14px;
    color: var(--lt-muted);
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--lt-line);
    font-size: 0.84rem;
    line-height: 1.45;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-login-helper {
    background: rgba(255, 255, 255, 0.08);
  }

  .lt-login-helper-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    color: #06281b;
    background: #c9f4df;
    font-weight: 900;
  }

  .lt-login-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    color: var(--lt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lt-login-back-link {
    color: var(--lt-muted);
    font-weight: 800;
    white-space: nowrap;
  }

  .lt-login-terms {
    text-align: right;
    line-height: 1.35;
  }

  @media (max-width: 1180px) {
    .lt-login-page {
      grid-template-columns: minmax(0, 0.95fr) minmax(430px, 1.05fr);
    }

    .lt-login-brand-panel {
      padding: 38px 40px 34px;
    }

    .lt-login-brand-panel:after {
      left: 40px;
      right: 40px;
    }

    .lt-login-title {
      font-size: 3.05rem;
    }

    .lt-login-auth-panel {
      padding: 36px 34px;
    }
  }

  @media (min-width: 1024px) and (max-height: 820px) {
    .lt-login-brand-panel {
      gap: 28px;
      padding-top: 30px;
      padding-bottom: 26px;
    }

    .lt-login-brand-panel:after {
      bottom: 92px;
    }

    .lt-login-promise {
      gap: 13px;
    }

    .lt-login-title {
      font-size: 3rem;
    }

    .lt-login-lede {
      font-size: 0.95rem;
      line-height: 1.48;
    }

    .lt-login-benefit {
      min-height: 44px;
      padding: 8px 11px;
      font-size: 0.8rem;
    }

    .lt-login-loop span {
      min-height: 28px;
    }

    .lt-login-auth-panel {
      padding-top: 24px;
      padding-bottom: 24px;
    }

    .lt-login-gate {
      gap: 12px;
    }

    .lt-login-heading {
      font-size: 1.72rem;
    }

    .lt-login-subcopy {
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .lt-login-frame {
      padding: 16px;
    }

    .lt-login-helper {
      padding: 10px 12px;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 1023px) {
    .lt-login-page {
      min-height: 100svh;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 20px;
      background:
        radial-gradient(circle at 18% 12%, rgba(125, 220, 255, 0.22) 0, rgba(125, 220, 255, 0) 28%),
        radial-gradient(circle at 86% 20%, rgba(22, 185, 106, 0.14) 0, rgba(22, 185, 106, 0) 28%),
        linear-gradient(180deg, #fbfdff 0%, #eef7ff 100%);
    }

    .lt-login-page[data-login-theme="dark"] {
      background: linear-gradient(180deg, #071a3d 0%, #051733 100%);
    }

    .lt-login-brand-panel {
      display: none;
    }

    .lt-login-auth-panel {
      width: 100%;
      padding: 0;
      align-items: center;
    }

    .lt-login-gate {
      max-width: 500px;
      gap: 16px;
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--lt-line);
      background: var(--lt-card);
      box-shadow: 0 22px 70px rgba(7, 26, 61, 0.13);
      backdrop-filter: blur(18px);
    }

    .lt-login-mobile-brand {
      display: inline-flex;
    }

    .lt-login-heading {
      font-size: 1.55rem;
    }

    .lt-login-subcopy {
      font-size: 0.92rem;
    }

    .lt-login-frame {
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }
  }

  @media (max-width: 520px) {
    .lt-login-page {
      padding: 14px;
    }

    .lt-login-gate {
      padding: 20px 16px;
      border-radius: 18px;
    }

    .lt-login-foot {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .lt-login-terms {
      text-align: center;
    }
  }
`;

/**
 * Login page (`/login`).
 *
 * Production responsibilities preserved:
 * - Native Firebase Auth widget drives sign-in: Google (popup) + email/password.
 *   The Phone (SMS-OTP) pane is present but its handler is wired in PR-4.
 * - Redirect priority stays `?redirect`, `location.state.from`, then
 *   profile/onboarding fallback.
 * - The page stays standalone, without DesktopShell/sidebar chrome.
 * - No guest CTA or fake trial activation is exposed from Login.
 */
function describeAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return ""; // user dismissed the Google popup — nothing to surface
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Enter a valid 10-digit mobile number.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Check the SMS and try again.";
    case "auth/code-expired":
      return "This code has expired. Request a new one.";
    case "auth/quota-exceeded":
      return "SMS limit reached. Please try again later.";
    case "auth/captcha-check-failed":
      return "Verification check failed. Please try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    user,
    signInWithGoogle,
    signInWithEmailPassword,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();

  const [isLight, setIsLight] = useState(
    () => document.documentElement.getAttribute("data-theme") === "light"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const reason = searchParams.get("reason");
  const isStartTrial = reason === "start-trial";

  const nextPath = useMemo(() => {
    if (searchParams.has("redirect")) {
      const explicitRedirect = searchParams.get("redirect");
      return isSafeInternalPath(explicitRedirect) ? explicitRedirect : "/";
    }
    const st = (location.state || {}) as LocationState;
    if (st.from) return isSafeInternalPath(st.from) ? st.from : "/";
    const hasProfile =
      typeof window !== "undefined" && !!window.localStorage.getItem("lazytopper.profile.v2");
    // SEVER PR: post-login fallback re-pointed off the retired /dashboard to "/"
    // (RootEntry routes to the live home per viewport). ?redirect= / state.from
    // remain isSafeInternalPath-guarded; a stale severed target now resolves via
    // the catch-all to "/" (home), never stranding the user.
    return hasProfile ? "/" : "/onboarding";
  }, [location.state, searchParams]);

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneStep, setPhoneStep] = useState<"number" | "otp">("number");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const RECAPTCHA_CONTAINER_ID = "lt-login-recaptcha";

  useEffect(() => {
    trackUxEvent("login_start", "login", {
      reason: reason ?? "unspecified",
    });
  }, [reason]);

  useEffect(() => {
    if (user) {
      trackUxEvent("login_complete", "login", {
        reason: reason ?? "unspecified",
      });
      // Referral crediting — relocated here from the retired Onboarding page, which
      // was its only caller. Capture still happens at App.tsx (`?ref=` -> pending key);
      // this is the first authenticated moment on every Login path (Google / email /
      // phone OTP all land in this one effect). Self-idempotent: creditPendingReferral
      // no-ops when there is no pending code and again once REFERRAL_CREDITED_KEY is
      // set, so it credits at most once ever. Keyed on the real Firebase uid — a
      // stable identifier the `addReferralToCode` dedup can actually match (the old
      // `user_${Date.now()}` was fresh on every call and defeated that dedup).
      creditPendingReferral(user.uid);
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate, reason]);

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // Navigation is handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailPassword(trimmedEmail, password);
      // Navigation is handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  const handlePhoneSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (phoneStep === "number") {
      if (phone.length !== 10) {
        setError("Enter your 10-digit mobile number.");
        return;
      }
      setBusy(true);
      try {
        await sendPhoneOtp(`+91${phone}`, RECAPTCHA_CONTAINER_ID);
        setPhoneStep("otp");
      } catch (err) {
        setError(describeAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }
    // phoneStep === "otp"
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    try {
      await verifyPhoneOtp(otp);
      // Navigation is handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  // Re-send: the prior invisible verifier is spent, so AuthContext rebuilds a
  // fresh one inside sendPhoneOtp. Reset the OTP field and re-request.
  const handleResendOtp = async () => {
    if (busy) return;
    setError(null);
    setOtp("");
    setBusy(true);
    try {
      await sendPhoneOtp(`+91${phone}`, RECAPTCHA_CONTAINER_ID);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleChangeNumber = () => {
    if (busy) return;
    setError(null);
    setOtp("");
    setPhoneStep("number");
  };

  // Warm the invisible reCAPTCHA when the Phone tab opens so the first "Send
  // OTP" doesn't pay the Google script-load latency (sendPhoneOtp rebuilds a
  // fresh verifier each time). The bottom-right badge is expected (left for launch).
  useEffect(() => {
    if (method !== "phone") return;
    void initPhoneRecaptcha(RECAPTCHA_CONTAINER_ID).catch(() => {
      // Surfaced on the actual send attempt; no honest state to show pre-action.
    });
  }, [method, initPhoneRecaptcha]);

  const themeVars = {
    "--lt-login-bg": isLight ? "#f7fbff" : "#051733",
  } as CSSProperties;

  const mark = (size: number, fontSize: number) => (
    <span
      className="lt-login-mark"
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      L
    </span>
  );

  return (
    <main
      className="lt-login-page"
      data-login-theme={isLight ? "light" : "dark"}
      style={themeVars}
      aria-label="LazyTopper sign in"
    >
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />

      <section className="lt-login-brand-panel" aria-label="LazyTopper exam companion">
        <Link to="/" aria-label="Back to LazyTopper home" className="lt-login-home-link">
          {mark(42, 17)}
          <span className="lt-login-wordmark">LazyTopper</span>
        </Link>

        <div className="lt-login-promise">
          <span className="lt-login-kicker">CBSE Class 10 study cockpit</span>
          <h1 className="lt-login-title">Sign in when your work needs saving.</h1>
          <p className="lt-login-lede">
            LazyTopper can keep attempts, checked answers, progress, and Mistake
            Intelligence evidence connected to your account only after real sign-in.
          </p>

          <div className="lt-login-benefits" aria-label="What sign-in protects">
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Saved practice attempts
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Checked-answer history
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Progress tied to account
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Mistake Intelligence evidence
            </div>
          </div>
        </div>

        <div className="lt-login-loop" aria-label="LazyTopper product loop">
          <span>Exam Trends</span>
          <strong>to</strong>
          <span>Practice</span>
          <strong>to</strong>
          <span>Check & Improve</span>
          <strong>to</strong>
          <span>Me / Progress</span>
        </div>
      </section>

      <section className="lt-login-auth-panel" aria-label="Sign in">
        <div className="lt-login-gate">
          <Link to="/" aria-label="Back to LazyTopper home" className="lt-login-mobile-brand">
            {mark(42, 17)}
            <span>
              <span className="lt-login-wordmark">LazyTopper</span>
              <span className="lt-login-mobile-brand-sub">CBSE Class 10 Board Exam Prep</span>
            </span>
          </Link>

          <div className="lt-login-frame">
            <button
              type="button"
              className="lt-google"
              onClick={handleGoogle}
              disabled={busy}
            >
              <span className="lt-gmark" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              </span>
              Continue with Google
            </button>
            <p className="lt-onetap">Uses the Google account already signed in to your browser</p>

            <div className="lt-or">or</div>

            <div className="lt-toggle" role="tablist" aria-label="Sign-in method">
              <button
                type="button"
                role="tab"
                aria-selected={method === "email"}
                className={method === "email" ? "active" : ""}
                onClick={() => {
                  setMethod("email");
                  setError(null);
                  setPhoneStep("number");
                  setOtp("");
                }}
              >
                Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === "phone"}
                className={method === "phone" ? "active" : ""}
                onClick={() => {
                  setMethod("phone");
                  setError(null);
                }}
              >
                Phone
              </button>
            </div>

            {method === "email" ? (
              <form onSubmit={handleEmailSubmit} noValidate>
                <label className="lt-field-label" htmlFor="lt-login-email">
                  Email address
                </label>
                <div className="lt-field">
                  <input
                    id="lt-login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <label className="lt-field-label" htmlFor="lt-login-password">
                  Password
                </label>
                <div className="lt-field">
                  <input
                    id="lt-login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error ? (
                  <p className="lt-login-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button className="lt-continue" type="submit" disabled={busy}>
                  {busy ? "Signing in..." : "Continue"} <span aria-hidden="true">{"→"}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneSubmit} noValidate>
                {phoneStep === "number" ? (
                  <>
                    <label className="lt-field-label" htmlFor="lt-login-phone">
                      Mobile number
                    </label>
                    <div className="lt-field">
                      <span className="lt-prefix">+91</span>
                      <input
                        id="lt-login-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <p className="lt-login-note">
                      We'll text a 6-digit code to verify this number.
                    </p>
                    {error ? (
                      <p className="lt-login-error" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <button className="lt-continue" type="submit" disabled={busy}>
                      {busy ? "Sending code..." : "Send OTP"}{" "}
                      <span aria-hidden="true">{"→"}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <label className="lt-field-label" htmlFor="lt-login-otp">
                      Enter the 6-digit code
                    </label>
                    <div className="lt-field">
                      <input
                        id="lt-login-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                    <p className="lt-login-note">
                      Code sent to +91 {phone}.{" "}
                      <button
                        type="button"
                        className="lt-login-linkbtn"
                        onClick={handleChangeNumber}
                        disabled={busy}
                      >
                        Change number
                      </button>
                    </p>
                    {error ? (
                      <p className="lt-login-error" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <button className="lt-continue" type="submit" disabled={busy}>
                      {busy ? "Verifying..." : "Verify & continue"}{" "}
                      <span aria-hidden="true">{"→"}</span>
                    </button>
                    <p className="lt-signup">
                      Didn't get it?{" "}
                      <button
                        type="button"
                        className="lt-login-linkbtn"
                        onClick={handleResendOtp}
                        disabled={busy}
                      >
                        Resend OTP
                      </button>
                    </p>
                  </>
                )}
              </form>
            )}

            <p className="lt-signup">
              Don't have an account? <Link to="/sign-up">Sign up</Link>
            </p>
          </div>

          {/*
            Invisible reCAPTCHA host — always mounted (NOT inside the conditional
            phone form), so toggling Email/Phone never unmounts the container out
            from under a live verifier. The bottom-right badge is expected.
          */}
          <div id={RECAPTCHA_CONTAINER_ID} />

          <div className="lt-login-helper">
            <span className="lt-login-helper-icon" aria-hidden="true">
              i
            </span>
            <span>
              Use the same Google, email, or phone account you want LazyTopper to
              remember. Sign-in is required for saved learning actions.
            </span>
          </div>

          <div className="lt-login-foot">
            <Link to="/" className="lt-login-back-link">
              {isStartTrial ? "<- Back to landing" : "<- Back to home"}
            </Link>
            <span className="lt-login-terms">By signing in, you agree to our Terms of Service</span>
          </div>
        </div>
      </section>
    </main>
  );
}
