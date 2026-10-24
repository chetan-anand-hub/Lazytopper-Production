// src/services/newAccountLanding.ts
//
// LOGIN-HOME-1 (owner ruling, 24 Oct 2026, superseding ACTIVATION-2 C) — where a brand-new
// account lands after sign-up when nothing asked for a destination: HOME ("/"), where Byte
// waits with "Check one answer" first. Reason: Byte exists to make a new student try Check &
// Improve, see its value, and buy; dropping them straight into an empty Check & Improve page
// gave Byte no chance to introduce it. "Nothing asked for a destination" now also covers the
// Me page (/me, /profile): a signed-out tap on Me sends a new account there, but a brand-new
// account has no progress to show, so Home is the honest first stop. Any OTHER target (a
// practice set, a paper, a free check, /pricing, the tutor) is the student's own and still wins,
// so no work is lost. A RETURNING login is unchanged: it goes back where it came from, /me included.
//
// The "new" signal is EXACTLY the one the `sign_up` event uses (analytics.ts trackSignUpIfNew:
// `getAdditionalUserInfo(credential).isNewUser` for Google / phone; the email create call is
// itself the sign-up). AuthContext marks it at those three call sites; Login takes it once, at
// its one successful-auth exit, and an explicit `?redirect=` / `state.from` always wins.
//
// In memory only (this tab's JS heap): never stored, never sent. It expires after a few
// minutes, so a mark that was never taken cannot redirect a much later login. The age is
// measured on the page's MONOTONIC clock (performance.now), not the wall clock: it is an
// elapsed time, and a device clock change must not stretch or cut it.

import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";

export const NEW_ACCOUNT_LANDING_PATH = "/";
export const NEW_ACCOUNT_LANDING_TTL_MS = 5 * 60 * 1000;

let markedAt: number | null = null;

const elapsedNow = (): number => performance.now();

/** This sign-in CREATED the account (the email create call). */
export function markNewAccountLanding(now: number = elapsedNow()): void {
  markedAt = now;
}

/** Google / phone: mark only when the SDK says the account is new. Never throws. */
export function markNewAccountLandingIfNew(credential: UserCredential): void {
  try {
    if (credential && getAdditionalUserInfo(credential)?.isNewUser) markNewAccountLanding();
  } catch {
    /* an unreadable credential is not a new account */
  }
}

/**
 * The targets that only mean "Home" (cofounder ruling on #1224): no target, "/" (Welcome.tsx and
 * DesktopShell.tsx pass `redirect=%2F` as their default) and "/browse" (the mobile Home a
 * signed-in student on "/" is routed to; the mobile header passes the current path).
 */
const DEFAULT_HOME_TARGETS: ReadonlySet<string> = new Set(["", "/", "/browse"]);
export function isDefaultHomeTarget(target: string | null | undefined): boolean {
  return DEFAULT_HOME_TARGETS.has(String(target ?? "").trim());
}

/** The Me page, with or without a query string / hash (RequireAuth keeps the query in `state.from`). */
const ME_PATHS: ReadonlySet<string> = new Set(["/me", "/profile"]);
export function isMeTarget(target: string | null | undefined): boolean {
  const path = String(target ?? "").trim().split(/[?#]/)[0].replace(/\/+$/, "");
  return ME_PATHS.has(path);
}

/**
 * A NEW account with one of these targets lands on Home (NEW_ACCOUNT_LANDING_PATH): the default
 * Home targets and the Me page. Any other target is the student's own.
 */
export function newAccountGoesHome(target: string | null | undefined): boolean {
  return isDefaultHomeTarget(target) || isMeTarget(target);
}

/** True once, for a fresh mark; the mark is cleared either way. */
export function takeNewAccountLanding(now: number = elapsedNow()): boolean {
  const at = markedAt;
  markedAt = null;
  return at !== null && now - at >= 0 && now - at <= NEW_ACCOUNT_LANDING_TTL_MS;
}
