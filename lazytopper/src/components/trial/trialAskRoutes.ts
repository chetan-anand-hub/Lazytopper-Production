/**
 * trialAskRoutes — ASK-FIX-1. ONE list of the routes where the trial-ended screen and the trial
 * countdown bar must stay out of the way. Both read it, so they cannot drift apart.
 *
 *   - the offer / auth / admin pages themselves;
 *   - the public legal and contact pages (/legal/*, /sign-up, /contact, /for-parents);
 *   - every BARE full-screen surface - a timed paper must never sit behind a cover. This mirrors
 *     `BARE_FULLSCREEN_PREFIXES` in App.tsx (forbidden to import from here); add a prefix in both.
 */
const OFFER_AND_PUBLIC_PREFIXES = [
  "/pricing",
  "/login",
  "/welcome",
  "/admin",
  "/legal",
  "/sign-up",
  "/contact",
  "/for-parents",
] as const;

/** Mirror of App.tsx BARE_FULLSCREEN_PREFIXES (chapter test, full mock, tutor, /u). */
export const BARE_FULLSCREEN_MIRROR = ["/chapter-test", "/full-mock", "/tutor", "/u"] as const;

const ALL_EXCLUDED: readonly string[] = [...OFFER_AND_PUBLIC_PREFIXES, ...BARE_FULLSCREEN_MIRROR];

/**
 * SELF-PAY-LAND-1 (owner 11 Nov 2026). The landing after a signed-out "Buy for yourself" payment + "It's for me" sign-in carries
 * `?from=pay` (services/checkoutWho landingPath). A buyer who just paid goes STRAIGHT to My packs: no trial-ended screen, no
 * countdown bar, no strip in between - even when the number already belonged to an older account whose free week had ended.
 * The hold lasts for this page load only; a later, ordinary visit follows today's rules unchanged. Reads the URL only; it never
 * touches trial or premium state.
 */
export const PAID_LANDING_PARAM = "from";
export const PAID_LANDING_VALUE = "pay";
export function isPaidLandingSearch(search: string | null | undefined): boolean {
  try {
    return new URLSearchParams(search || "").get(PAID_LANDING_PARAM) === PAID_LANDING_VALUE;
  } catch {
    return false;
  }
}
let paidLandingThisLoad = false;
/** Call with the current `location.search` on render (idempotent): remembers that this load arrived from a paid self-pay. */
export function notePaidLanding(search: string | null | undefined): void {
  if (isPaidLandingSearch(search)) paidLandingThisLoad = true;
}
/** Test seam. */
export function __resetPaidLandingForTests(): void {
  paidLandingThisLoad = false;
}
if (typeof window !== "undefined") notePaidLanding(window.location.search);

export function trialAskRouteAllowed(pathname: string): boolean {
  if (paidLandingThisLoad) return false;
  return !ALL_EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
