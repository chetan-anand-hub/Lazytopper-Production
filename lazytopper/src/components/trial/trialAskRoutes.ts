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

export function trialAskRouteAllowed(pathname: string): boolean {
  return !ALL_EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
