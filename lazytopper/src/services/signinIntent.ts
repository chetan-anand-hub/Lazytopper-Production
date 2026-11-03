/**
 * GOOGLE-REDIRECT-1 — Google sign-in by FULL-PAGE REDIRECT, and the state that survives it.
 *
 * Why: the Google popup can be lost, blocked, closed, hidden behind the tab or time out (most
 * of all on phones). A full-page redirect cannot. Ships DARK behind `VITE_GOOGLE_SIGNIN_MODE`:
 *
 *   popup          (default, unset or anything unrecognised) — today's popup, unchanged
 *   redirect-test  redirect ONLY for a tab that opted in with `/login?gsignin=redirect`
 *                  (remembered in sessionStorage for that tab, so the return trip honours it)
 *   redirect       everyone redirects EXCEPT in-app browsers (YouTube / Instagram / webviews),
 *                  where Google refuses OAuth anyway: they keep phone-first + "Open in Chrome"
 *
 * A full-page redirect throws away React state and router state (`state.from`, the guest-pay
 * router state). So, just before leaving, the Login page writes ONE sessionStorage record — the
 * SIGN-IN INTENT — and reads it back when Google sends the student home.
 *
 * ★ PRIVACY. The intent carries NO phone number, email, name or uid. The guest-pay claim is a
 *   BOOLEAN ("force the claim after this sign-in"); the server reads the number from the verified
 *   ID token, never from the client (services/guestPay.ts).
 * ★ SAFE REDIRECTS. Every path stored or read back passes `isSafeInternalPath` (CLAUDE.md §5).
 * ★ EXPIRY. An intent older than 30 minutes is ignored by the Login page. Reading never deletes:
 *   only AuthContext's redirect-result handler (and Login after use / on a dead return) clears it,
 *   so a slow Google sign-in is never lost because the record aged out first.
 * ★ SAME HOST. A redirect is chosen only when the configured authDomain IS this page's host
 *   (the /__/auth reverse proxy is live). Otherwise Safari ITP / Chrome storage partitioning
 *   makes getRedirectResult come back empty, so those visits keep the popup.
 *
 * The redirect RESULT is read once, by AuthContext, on app load when an intent is present
 * (never on a normal page load), and handed to the Login page through the small outcome
 * channel at the bottom of this file. Nothing here imports Firebase.
 */
import { isSafeInternalPath } from "../utils/safeInternalPath";

export type GoogleSigninMode = "popup" | "redirect-test" | "redirect";
export type GoogleFlow = "popup" | "redirect";

export const SIGNIN_INTENT_KEY = "lt.signinIntent";
export const REDIRECT_OPT_IN_KEY = "lt.gsigninRedirect";
export const SIGNIN_INTENT_TTL_MS = 30 * 60 * 1000;

/** The build flag, read defensively: anything but the two redirect values is the popup. */
export function resolveGoogleSigninMode(raw: unknown): GoogleSigninMode {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return v === "redirect" || v === "redirect-test" ? v : "popup";
}

export function currentGoogleSigninMode(): GoogleSigninMode {
  try {
    return resolveGoogleSigninMode(import.meta.env.VITE_GOOGLE_SIGNIN_MODE);
  } catch {
    return "popup";
  }
}

function session(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * `/login?gsignin=redirect` opts THIS TAB in (redirect-test); `?gsignin=popup` opts it out.
 * Safe to call on every Login mount; never throws.
 */
export function noteRedirectOptIn(search: string): void {
  try {
    const value = new URLSearchParams(search).get("gsignin");
    const store = session();
    if (!store || value === null) return;
    if (value === "redirect") store.setItem(REDIRECT_OPT_IN_KEY, "1");
    else if (value === "popup") store.removeItem(REDIRECT_OPT_IN_KEY);
  } catch {
    /* an opt-in is a test convenience; it must never break the page */
  }
}

export function hasRedirectOptIn(): boolean {
  try {
    return session()?.getItem(REDIRECT_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Whether Firebase's authDomain is this page's own host — the precondition for a redirect that
 * survives third-party-storage partitioning. Case-insensitive; an empty value never matches.
 */
export function authDomainIsThisHost(authDomain: unknown, host: unknown): boolean {
  const a = typeof authDomain === "string" ? authDomain.trim().toLowerCase() : "";
  const h = typeof host === "string" ? host.trim().toLowerCase() : "";
  return a !== "" && a === h;
}

export function currentAuthDomainIsThisHost(): boolean {
  try {
    return authDomainIsThisHost(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, window.location.host);
  } catch {
    return false;
  }
}

/**
 * Pure: which Google flow this tap uses. In-app browsers never redirect, and nor does a page
 * whose authDomain is another host (`sameHost` false), where the result would be lost.
 */
export function chooseGoogleFlow(input: {
  mode: GoogleSigninMode;
  optedIn: boolean;
  inApp: boolean;
  sameHost: boolean;
}): GoogleFlow {
  if (input.inApp || !input.sameHost) return "popup";
  if (input.mode === "redirect") return "redirect";
  if (input.mode === "redirect-test" && input.optedIn) return "redirect";
  return "popup";
}

/* ------------------------------------------------------------------------- *
 * THE SIGN-IN INTENT
 * ------------------------------------------------------------------------- */

export interface SigninIntent {
  v: 1;
  method: "google";
  /** The resolved post-login path (always same-origin). */
  target: string;
  /** `?redirect=` or `state.from` as the page saw it (for the new-account landing rule), or null. */
  explicitTarget: string | null;
  /** `state.from`, if the page had one (same-origin), else null. */
  from: string | null;
  /** `?reason=start-trial` was on the page. */
  startTrial: boolean;
  /** A guest-pay claim should be forced after this sign-in. A FLAG ONLY — never the number. */
  guestPayClaim: boolean;
  /** The guest-pay "this number already has an account" state was on the page. */
  guestPayExisting: boolean;
  /** Epoch ms when written. */
  at: number;
}

export type SigninIntentInput = Omit<SigninIntent, "v" | "method" | "at">;

function safeOrNull(path: unknown): string | null {
  return typeof path === "string" && isSafeInternalPath(path) ? path : null;
}

/**
 * Write the intent. Returns false if it could not be written (no / full / blocked storage):
 * the caller then uses the popup instead, because a redirect without its intent would lose
 * the student's target.
 */
export function saveSigninIntent(input: SigninIntentInput, now: number = Date.now()): boolean {
  const store = session();
  if (!store) return false;
  // Built field by field from the allow-list above, so nothing else (a phone number in a
  // spread object, say) can ever ride along.
  const intent: SigninIntent = {
    v: 1,
    method: "google",
    target: safeOrNull(input.target) ?? "/",
    explicitTarget: input.explicitTarget === null ? null : (safeOrNull(input.explicitTarget) ?? "/"),
    from: safeOrNull(input.from),
    startTrial: input.startTrial === true,
    guestPayClaim: input.guestPayClaim === true,
    guestPayExisting: input.guestPayExisting === true,
    at: now,
  };
  try {
    store.setItem(SIGNIN_INTENT_KEY, JSON.stringify(intent));
    return store.getItem(SIGNIN_INTENT_KEY) !== null;
  } catch {
    return false;
  }
}

/** Whether ANY intent record exists (expired or not) — the cue to read the redirect result. */
export function hasSigninIntent(): boolean {
  try {
    return session()?.getItem(SIGNIN_INTENT_KEY) != null;
  } catch {
    return false;
  }
}

/**
 * The intent if present, well-formed and under 30 minutes old; otherwise null.
 * ★ NEVER DELETES (review of #1505): Login reads this while rendering, BEFORE AuthContext's effect
 * decides whether to read the redirect result; deleting here would lose that sign-in.
 */
export function readSigninIntent(nowMs?: number): SigninIntent | null {
  const store = session();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(SIGNIN_INTENT_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  // The clock is read only when a record exists: an ordinary Login mount reads no time at all.
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  try {
    const p = JSON.parse(raw) as Partial<SigninIntent> | null;
    const at = typeof p?.at === "number" ? p.at : NaN;
    if (!p || p.v !== 1 || p.method !== "google" || !Number.isFinite(at) || now - at > SIGNIN_INTENT_TTL_MS || at - now > 60_000) {
      return null;
    }
    return {
      v: 1,
      method: "google",
      target: safeOrNull(p.target) ?? "/",
      explicitTarget: p.explicitTarget == null ? null : (safeOrNull(p.explicitTarget) ?? "/"),
      from: safeOrNull(p.from),
      startTrial: p.startTrial === true,
      guestPayClaim: p.guestPayClaim === true,
      guestPayExisting: p.guestPayExisting === true,
      at,
    };
  } catch {
    return null;
  }
}

export function clearSigninIntent(): void {
  try {
    session()?.removeItem(SIGNIN_INTENT_KEY);
  } catch {
    /* nothing to do */
  }
}

/* ------------------------------------------------------------------------- *
 * THE REDIRECT OUTCOME — AuthContext (which reads getRedirectResult) -> Login.
 *
 * A module channel rather than a context key: AuthContext's key set is pinned by exact equality
 * and ~25 suites replace that module with full mock factories (see AuthContext.tsx).
 * ------------------------------------------------------------------------- */

export type RedirectOutcome =
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "none" }
  | { kind: "error"; error: unknown };

let outcome: RedirectOutcome | null = null;
const listeners = new Set<(o: RedirectOutcome) => void>();

export function setRedirectOutcome(next: RedirectOutcome): void {
  outcome = next;
  for (const l of Array.from(listeners)) {
    try {
      l(next);
    } catch {
      /* one listener must not stop the others */
    }
  }
}

export function peekRedirectOutcome(): RedirectOutcome | null {
  return outcome;
}

/** Calls `cb` now with the current outcome (if any) and on every change. Returns unsubscribe. */
export function subscribeRedirectOutcome(cb: (o: RedirectOutcome) => void): () => void {
  listeners.add(cb);
  if (outcome) cb(outcome);
  return () => {
    listeners.delete(cb);
  };
}

/** Test seam / after use: forget the outcome so a later visit starts clean. */
export function resetRedirectOutcome(): void {
  outcome = null;
}
