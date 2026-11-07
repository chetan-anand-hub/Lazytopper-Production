/** SPEED-CLS-2: split out of browseVisitorCardModel.ts (which re-exports it) so the landing-offer slot can read the hint without pulling the browse card's pricing copy. */
/**
 * PREEXIST-FIX-1 - "this device was signed in last time we looked", kept by THIS mount (set when auth settles with a user,
 * cleared when it settles signed out). Not account or premium state: it only decides whether to hold the card's space while
 * auth loads. Firebase's own localStorage / sessionStorage records (used when IndexedDB is unavailable) count too.
 */
export const BROWSE_SIGNED_IN_HINT_KEY = "lt.browse.signedInHint.v1";
const FIREBASE_USER_PREFIX = "firebase:authUser:";
const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";

export function likelySignedIn(): boolean {
  try {
    if (window.localStorage.getItem(BROWSE_SIGNED_IN_HINT_KEY) === "1") return true;
    if (window.localStorage.getItem(LOCAL_AUTH_KEY)) return true;
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < store.length; i++) if (String(store.key(i)).startsWith(FIREBASE_USER_PREFIX)) return true;
    }
    return false;
  } catch {
    return true; // unreadable storage: behave as before (nothing while auth loads)
  }
}

export function writeSignedInHint(signedIn: boolean): void {
  try {
    if (signedIn) window.localStorage.setItem(BROWSE_SIGNED_IN_HINT_KEY, "1");
    else window.localStorage.removeItem(BROWSE_SIGNED_IN_HINT_KEY);
  } catch {
    /* storage blocked: the hint is only an optimisation */
  }
}
