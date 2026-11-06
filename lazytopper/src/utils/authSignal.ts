import { trackOnboardingEvent } from "../analytics/analytics";
import { inAppBrowser, uaClass, type UaClass } from "./inAppBrowser";

/**
 * AUTH-SIGNAL-1 — measure and bound sign-in, and say something useful when it fails.
 *
 * Why: most sign-ups arrive from YouTube ads on a phone, Google sign-in is a popup, and until
 * now nothing recorded how often it failed or hung, so the loss could not be sized. Pure
 * helpers plus one telemetry sender; nothing here touches Firebase or the trial.
 *
 * Privacy: the events carry the method, a coarse client class and a Firebase error code. Never
 * an email, a phone number, a uid, a name or the raw user agent.
 */

export type LoginMethod = "google" | "email" | "phone";

/** How long the Google popup may stay silent before the buttons come back. */
export const GOOGLE_POPUP_TIMEOUT_MS = 45_000;
/** Synthetic code (not a Firebase one) carried by the timeout rejection. */
export const GOOGLE_POPUP_TIMEOUT_CODE = "lt/google-popup-timeout";
/**
 * GOOGLE-REDIRECT-1 — synthetic code: the student came back from Google's page with a fresh
 * sign-in intent but getRedirectResult had no result. That is either Back on Google's page (no
 * bfcache) or a result lost to storage partitioning; the two cannot be told apart, so it is
 * treated as an error (telemetry + phone rescue), the safer of the two.
 */
export const GOOGLE_REDIRECT_NO_RESULT_CODE = "lt/redirect-no-result";

export function authErrorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code || "")
    : "";
}

/** Rejects with a coded error if `promise` has not settled within `ms`. The timer is always cleared. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error("Sign-in timed out"), { code: GOOGLE_POPUP_TIMEOUT_CODE }));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** LOGIN-FIX-1 — synthetic codes for the two phone failures our own code raises (they had none). */
export const RECAPTCHA_NOT_READY_CODE = "lt/recaptcha-not-ready";
export const OTP_NOT_REQUESTED_CODE = "lt/otp-not-requested";

/**
 * LOGIN-FIX-1 — a failure with NO Firebase code (6 Nov 2026: one desktop student's six phone
 * failures all arrived as "unknown"). The phone path can throw code-less errors from three places:
 * the reCAPTCHA library itself (grecaptcha throws plain Errors such as "reCAPTCHA has already been
 * rendered in this element" or "reCAPTCHA client element has been removed", and can reject with
 * null or a bare string such as "Timeout"), Firebase's script loader, and our own guards. Each is
 * mapped to a FIXED slug by pattern; the message itself is never sent (it could in principle carry
 * text we do not control), only the slug.
 */
export function codelessErrorSlug(err: unknown): string {
  if (err === null || err === undefined) return "no-error-value";
  const message =
    typeof err === "string"
      ? err
      : typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";
  if (/already been rendered/i.test(message)) return "recaptcha-already-rendered";
  if (/element has been removed|client element/i.test(message)) return "recaptcha-element-removed";
  if (/recaptcha is not ready/i.test(message)) return "recaptcha-not-ready";
  if (/request an otp|request a code/i.test(message)) return "otp-not-requested";
  if (/load external scripts|script/i.test(message)) return "script-load-failed";
  if (/not configured/i.test(message)) return "auth-not-configured";
  if (/time ?out/i.test(message)) return "timeout";
  if (/recaptcha/i.test(message)) return "recaptcha-other";
  if (typeof err !== "object") return "non-error-value";
  return "unknown";
}

/**
 * The error code as the analytics sender accepts it (a short slug): "auth/popup-blocked" ->
 * "popup-blocked", the timeout -> "popup-timeout", anything unrecognisable -> "unknown".
 */
export function telemetryErrorCode(err: unknown): string {
  const raw = authErrorCode(err);
  if (raw === GOOGLE_POPUP_TIMEOUT_CODE) return "popup-timeout";
  if (raw === GOOGLE_REDIRECT_NO_RESULT_CODE) return "redirect-no-result";
  if (raw === RECAPTCHA_NOT_READY_CODE) return "recaptcha-not-ready";
  if (raw === OTP_NOT_REQUESTED_CODE) return "otp-not-requested";
  if (!raw) return codelessErrorSlug(err);
  const slug = raw
    .replace(/^auth\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 64);
  return slug || "unknown";
}

/**
 * SIGNIN-RESCUE-1 — only an in-app browser / webview can truly hang on the Google popup (it opens
 * a window that never reports back). On desktop and in normal mobile Chrome/Safari a slow popup is
 * a student still choosing an account, so no timeout is armed there: the 45 s cap used to fire on
 * those and re-enabled the buttons under a student who was mid-sign-in.
 */
export function googlePopupMayHang(userAgent: string | null | undefined, standalone = false): boolean {
  return inAppBrowser(userAgent, standalone) !== null;
}

export function currentGooglePopupMayHang(): boolean {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { standalone?: boolean }) : null;
    return nav ? googlePopupMayHang(nav.userAgent, nav.standalone === true) : false;
  } catch {
    return false;
  }
}

/** The Login page's layout breakpoint (its mobile layout is `max-width: 1023px`). */
export const LOGIN_MOBILE_MAX_WIDTH_PX = 1023;

/** A phone client: a phone user agent, or the viewport is at the Login page's mobile layout width. */
export function isPhoneClient(): boolean {
  try {
    if (typeof navigator !== "undefined" && /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent || "")) return true;
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia(`(max-width: ${LOGIN_MOBILE_MAX_WIDTH_PX}px)`).matches;
    }
  } catch {
    /* fall through */
  }
  return false;
}

/**
 * LOGIN-FIX-1 — the student closed the Google window themselves. That is a cancel, not a failure:
 * no message, no jump to the phone step, the buttons simply come back. (It is still reported as a
 * login_error with its code, so the funnel keeps counting it.)
 */
export function isGoogleCancel(err: unknown): boolean {
  return authErrorCode(err) === "auth/popup-closed-by-user";
}

/**
 * SIGNIN-RESCUE-1 — a Google failure after which the phone step should open by itself: the popup was
 * closed / blocked / never answered, or this browser cannot run it. NOT a cancelled-popup-request (a
 * newer attempt is live) and not any other error.
 */
export function shouldRescueToPhone(err: unknown): boolean {
  switch (authErrorCode(err)) {
    case GOOGLE_POPUP_TIMEOUT_CODE:
    case GOOGLE_REDIRECT_NO_RESULT_CODE:
    case "auth/popup-blocked":
    case "auth/operation-not-supported-in-this-environment":
      return true;
    default:
      return false;
  }
}

export function currentUaClass(): UaClass {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { standalone?: boolean }) : null;
    return uaClass(nav ? nav.userAgent : "", nav?.standalone === true);
  } catch {
    return "other";
  }
}

/**
 * GOOGLE-REDIRECT-1 — which Google flow an attempt used. LOGIN-FIX-1 adds "chrome_handoff": the
 * Android in-app "Open in Chrome to continue with Google" tap (login_attempt only; the sign-in
 * itself then reports from Chrome as an ordinary popup attempt). Sent on Google events only (the caller
 * passes it); email / phone events carry no `flow`, exactly as before.
 */
export type LoginFlow = "popup" | "redirect" | "chrome_handoff";

function withFlow<T extends object>(params: T, flow: LoginFlow | undefined): T & { flow?: LoginFlow } {
  return flow === "popup" || flow === "redirect" || flow === "chrome_handoff" ? { ...params, flow } : params;
}

export function trackLoginAttempt(method: LoginMethod, flow?: LoginFlow): void {
  try {
    trackOnboardingEvent("login_attempt", withFlow({ method, ua_class: currentUaClass() }, flow));
  } catch {
    /* analytics must never break a sign-in */
  }
}

export function trackLoginSuccess(method: LoginMethod, flow?: LoginFlow): void {
  try {
    trackOnboardingEvent("login_success", withFlow({ method, ua_class: currentUaClass() }, flow));
  } catch {
    /* analytics must never break a sign-in */
  }
}

/**
 * LOGIN-FIX-1 — which phone step failed: sending the first code, checking it, or re-sending.
 * Sent on phone errors only (the caller passes it), so the six "unknown" failures of 6 Nov can be
 * told apart next time: a send that never leaves (reCAPTCHA) and a wrong code are different fixes.
 */
export type PhoneStep = "send" | "verify" | "resend";

export function trackLoginError(method: LoginMethod, err: unknown, flow?: LoginFlow, step?: PhoneStep): void {
  try {
    const params = withFlow({ method, ua_class: currentUaClass(), error_code: telemetryErrorCode(err) }, flow);
    trackOnboardingEvent(
      "login_error",
      method === "phone" && (step === "send" || step === "verify" || step === "resend") ? { ...params, step } : params,
    );
  } catch {
    /* analytics must never break a sign-in */
  }
}

const OTHER_WAYS = "use your phone number or email below";

export const POPUP_CLOSED_MESSAGE = `The Google window closed before sign-in finished. Tap Google to try again, or ${OTHER_WAYS}.`;
export const POPUP_BLOCKED_MESSAGE = `Your browser blocked the Google window. Allow pop-ups for this site and try again, or ${OTHER_WAYS}.`;
export const UNSUPPORTED_ENVIRONMENT_MESSAGE =
  `Google sign-in can't run in this browser. Open lazytopper.com in Chrome or Safari, or ${OTHER_WAYS}.`;
export const GOOGLE_REDIRECT_NO_RESULT_MESSAGE =
  `Google sign-in didn't finish. Tap Google to try again, or ${OTHER_WAYS}.`;
export const GOOGLE_TIMEOUT_MESSAGE =
  `Google sign-in is taking longer than usual. If a Google window is still open, finish there. Or ${OTHER_WAYS}.`;

/**
 * LOGIN-FIX-1 — the phone step's messages, in a student's words. The three that matter most: the
 * code was wrong, there were too many tries, and the "are you a real person" check (reCAPTCHA)
 * did not go through. Anything else falls back to the shared messages.
 */
export const PHONE_WRONG_CODE_MESSAGE = "That code doesn't match. Check the latest SMS and type the 6 digits again.";
export const PHONE_CODE_EXPIRED_MESSAGE = "This code has expired. Tap Resend OTP to get a new one.";
export const PHONE_TOO_MANY_MESSAGE =
  "Too many tries for now. Wait a few minutes and try again, or go back and continue with Google or email.";
export const PHONE_SMS_LIMIT_MESSAGE =
  "We can't send more SMS codes right now. Please try again later, or go back and continue with Google or email.";
export const PHONE_HUMAN_CHECK_MESSAGE =
  "We couldn't confirm you're a real person (a quick security check). Please try again. If it keeps failing, turn off any ad-blocker or VPN, or go back and continue with Google or email.";
export const PHONE_NO_CODE_REQUESTED_MESSAGE = "Please ask for a new code: tap Resend OTP.";
export const PHONE_GENERIC_MESSAGE =
  "We couldn't send or check your code. Please try again, or go back and continue with Google or email.";

const HUMAN_CHECK_CODES = new Set([
  "auth/captcha-check-failed",
  "auth/invalid-app-credential",
  "auth/missing-app-credential",
  "auth/missing-recaptcha-token",
  "auth/invalid-recaptcha-token",
  "auth/invalid-recaptcha-action",
  "auth/recaptcha-not-enabled",
  "auth/missing-recaptcha-version",
  "auth/invalid-recaptcha-version",
  "auth/invalid-req-type",
  RECAPTCHA_NOT_READY_CODE,
]);

export function describePhoneError(err: unknown): string {
  const code = authErrorCode(err);
  switch (code) {
    case "auth/invalid-verification-code":
    case "auth/missing-verification-code":
      return PHONE_WRONG_CODE_MESSAGE;
    case "auth/code-expired":
    case "auth/session-expired":
    case "auth/invalid-verification-id":
    case "auth/missing-verification-id":
      return PHONE_CODE_EXPIRED_MESSAGE;
    case "auth/too-many-requests":
      return PHONE_TOO_MANY_MESSAGE;
    case "auth/quota-exceeded":
      return PHONE_SMS_LIMIT_MESSAGE;
    case OTP_NOT_REQUESTED_CODE:
      return PHONE_NO_CODE_REQUESTED_MESSAGE;
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
    case "auth/network-request-failed":
    case "auth/user-disabled":
    case "auth/operation-not-allowed":
      return describeAuthError(err);
    default:
      break;
  }
  if (HUMAN_CHECK_CODES.has(code)) return PHONE_HUMAN_CHECK_MESSAGE;
  if (!code) {
    // No Firebase code: the reCAPTCHA library or its script failed (see codelessErrorSlug).
    const slug = codelessErrorSlug(err);
    if (slug.startsWith("recaptcha-") || slug === "script-load-failed" || slug === "timeout") {
      return PHONE_HUMAN_CHECK_MESSAGE;
    }
    if (slug === "otp-not-requested") return PHONE_NO_CODE_REQUESTED_MESSAGE;
  }
  // "internal-error" during a send is, in practice, the reCAPTCHA script / site-key step failing.
  if (code === "auth/internal-error" || code === "auth/argument-error") return PHONE_HUMAN_CHECK_MESSAGE;
  return PHONE_GENERIC_MESSAGE;
}

export function describeAuthError(err: unknown): string {
  const code = authErrorCode(err);
  switch (code) {
    case "auth/cancelled-popup-request":
      return ""; // a second tap superseded the first popup: the newer attempt is live, say nothing
    case "auth/popup-closed-by-user":
      return POPUP_CLOSED_MESSAGE;
    case GOOGLE_POPUP_TIMEOUT_CODE:
      return GOOGLE_TIMEOUT_MESSAGE;
    case GOOGLE_REDIRECT_NO_RESULT_CODE:
      return GOOGLE_REDIRECT_NO_RESULT_MESSAGE;
    case "auth/operation-not-supported-in-this-environment":
    case "auth/web-storage-unsupported":
      return UNSUPPORTED_ENVIRONMENT_MESSAGE;
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/email-already-in-use":
      return "An account with this email already exists — sign in instead.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email sign-up is not enabled yet. Please try Google.";
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
      return POPUP_BLOCKED_MESSAGE;
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
