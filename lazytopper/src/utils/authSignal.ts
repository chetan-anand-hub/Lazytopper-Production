import { trackOnboardingEvent } from "../analytics/analytics";
import { uaClass, type UaClass } from "./inAppBrowser";

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

/**
 * The error code as the analytics sender accepts it (a short slug): "auth/popup-blocked" ->
 * "popup-blocked", the timeout -> "popup-timeout", anything unrecognisable -> "unknown".
 */
export function telemetryErrorCode(err: unknown): string {
  const raw = authErrorCode(err);
  if (raw === GOOGLE_POPUP_TIMEOUT_CODE) return "popup-timeout";
  const slug = raw
    .replace(/^auth\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 64);
  return slug || "unknown";
}

export function currentUaClass(): UaClass {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { standalone?: boolean }) : null;
    return uaClass(nav ? nav.userAgent : "", nav?.standalone === true);
  } catch {
    return "other";
  }
}

export function trackLoginAttempt(method: LoginMethod): void {
  try {
    trackOnboardingEvent("login_attempt", { method, ua_class: currentUaClass() });
  } catch {
    /* analytics must never break a sign-in */
  }
}

export function trackLoginSuccess(method: LoginMethod): void {
  try {
    trackOnboardingEvent("login_success", { method, ua_class: currentUaClass() });
  } catch {
    /* analytics must never break a sign-in */
  }
}

export function trackLoginError(method: LoginMethod, err: unknown): void {
  try {
    trackOnboardingEvent("login_error", {
      method,
      ua_class: currentUaClass(),
      error_code: telemetryErrorCode(err),
    });
  } catch {
    /* analytics must never break a sign-in */
  }
}

const OTHER_WAYS = "use your phone number or email below";

export const POPUP_CLOSED_MESSAGE = `The Google window closed before sign-in finished. Tap Google to try again, or ${OTHER_WAYS}.`;
export const POPUP_BLOCKED_MESSAGE = `Your browser blocked the Google window. Allow pop-ups for this site and try again, or ${OTHER_WAYS}.`;
export const UNSUPPORTED_ENVIRONMENT_MESSAGE =
  `Google sign-in can't run in this browser. Open lazytopper.com in Chrome or Safari, or ${OTHER_WAYS}.`;
export const GOOGLE_TIMEOUT_MESSAGE =
  `Google sign-in is taking longer than usual. If a Google window is still open, finish there. Or ${OTHER_WAYS}.`;

export function describeAuthError(err: unknown): string {
  const code = authErrorCode(err);
  switch (code) {
    case "auth/cancelled-popup-request":
      return ""; // a second tap superseded the first popup: the newer attempt is live, say nothing
    case "auth/popup-closed-by-user":
      return POPUP_CLOSED_MESSAGE;
    case GOOGLE_POPUP_TIMEOUT_CODE:
      return GOOGLE_TIMEOUT_MESSAGE;
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
