/**
 * packSampleSeen - SAMPLE-FOLLOWUP-1 (owner approved 4 Nov 2026).
 *
 * Two small jobs for a free-sample tap, both safe to fail:
 *   1. `signedInHint()` - is a signed-in student tapping? true / false once Firebase Auth has loaded, `undefined` until then (so an
 *      early tap never records a wrong "false"). Used as `signed_in` on the `pack_sample_download` event (no person attached).
 *   2. `reportPackSampleSeen(pack)` - for a SIGNED-IN student only, tells OUR server which pack's sample was saved
 *      (POST /api/pack-sample-seen, Bearer token, body `{ pack }`), so one follow-up email can be considered ~24 h later.
 *      A signed-out visitor sends nothing: no email address is collected before sign-up.
 *
 * NO STATIC FIREBASE IMPORT (the activityClient pattern): firebaseClient is loaded on demand so this file never joins the entry chunk.
 */

export const PACK_SAMPLE_SEEN_ENDPOINT = "/api/pack-sample-seen";

interface AuthUser {
  uid?: string;
  isAnonymous?: boolean;
  getIdToken: () => Promise<string>;
}
interface AuthLike {
  currentUser: AuthUser | null;
  authStateReady?: () => Promise<void>;
}

let authHandle: AuthLike | null | undefined; // undefined = not loaded yet; null = no Firebase on this deploy
let loading: Promise<AuthLike | null> | null = null;

function loadAuth(): Promise<AuthLike | null> {
  if (!loading) {
    loading = import("../../services/firebaseClient")
      .then((m) => {
        authHandle = (m.authClient as unknown as AuthLike | null) ?? null;
        return authHandle;
      })
      .catch(() => {
        authHandle = null;
        return null;
      });
  }
  return loading;
}

function isSignedIn(u: AuthUser | null | undefined): u is AuthUser {
  return !!u && !u.isAnonymous && typeof u.uid === "string" && u.uid !== "";
}

/** true / false once auth has loaded (and, if it has a method to say so, restored the session); undefined before. */
export function signedInHint(): boolean | undefined {
  if (authHandle === undefined) {
    void loadAuth();
    return undefined;
  }
  return authHandle === null ? false : isSignedIn(authHandle.currentUser);
}

/** Fire-and-forget. Never throws, never blocks the download. */
export function reportPackSampleSeen(pack: string, fetchImpl: (url: string, init: RequestInit) => Promise<unknown> = (url, init) => fetch(url, init)): void {
  void (async () => {
    try {
      const auth = await loadAuth();
      if (!auth) return;
      try {
        await auth.authStateReady?.();
      } catch {
        /* fall through to whatever user there is */
      }
      const user = auth.currentUser;
      if (!isSignedIn(user)) return;
      const token = await user.getIdToken();
      if (!token) return;
      await fetchImpl(PACK_SAMPLE_SEEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pack }),
        keepalive: true,
      });
    } catch {
      /* a follow-up email is never worth a failed download */
    }
  })();
}

/** Test seam. */
export function __resetPackSampleSeenForTests(): void {
  authHandle = undefined;
  loading = null;
}
