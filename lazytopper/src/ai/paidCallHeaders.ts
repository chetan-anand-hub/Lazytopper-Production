/**
 * paidCallHeaders — identify the caller on every RATE-LIMITED endpoint.
 *
 * THE BUG THIS EXISTS TO FIX
 * The client never sent any caller identity. `resolveCaller` in
 * `server/services/rateLimiter.cjs` reads `x-lazytopper-uid`; with the header
 * absent it falls back to `ip:<addr>` and marks the call `anonymous: true`, and
 * the anonymous hard cap is THREE PER DAY. So every signed-in student was rate
 * limited as anonymous AND shared a single 3/day bucket with everyone behind the
 * same address — one household, one school, any NAT. Confirmed by grep (zero
 * occurrences of the header in src/) and by a production HAR capture of
 * /api/detect-question carrying neither header.
 *
 * WHY BOTH HEADERS, AND WHY NOT `X-User-ID`
 *  • `X-Lazytopper-Uid` is what the limiter reads TODAY. Without it nothing is
 *    fixed — `Authorization` alone would leave the 3/day classification exactly
 *    as it is while looking like a fix.
 *  • `Authorization: Bearer <idToken>` is VERIFIABLE. The server can derive the
 *    uid from it instead of trusting a client string, and sending it now means
 *    the server half can switch over without a second client change.
 *  • `X-User-ID` is deliberately NOT sent. `dbSyncService.authHeaders()` includes
 *    it and its comment blames "the Vercel->Railway proxy rewrite" for dropping
 *    it — that attribution is wrong. Our OWN gateway strips it:
 *    `artifacts/api-server/src/app.ts` lists `x-user-id` in
 *    STRIPPED_PROXY_HEADERS because it is a privileged header set by
 *    server-side code and must never be accepted from a browser. Mirroring
 *    authHeaders() verbatim would ship a header our own code discards.
 *    See [FU-DBSYNC-COMMENT-MISATTRIBUTED].
 *
 * `x-lazytopper-uid` is in the gateway's CORS allowlist (`server/index.cjs`) and
 * is absent from STRIPPED_PROXY_HEADERS, so unlike `X-User-ID` it survives.
 *
 * SIGNED-OUT CALLERS ARE LEFT ALONE, on purpose. Signed-out students can
 * legitimately reach some paid surfaces, and they SHOULD be classified
 * anonymous. Sending an empty or placeholder uid would hand every signed-out
 * visitor the same non-anonymous bucket — strictly worse than the bug.
 *
 * This module reads `authClient.currentUser` directly rather than taking the
 * uid as an argument: these call sites are plain async functions, not React
 * components, so there is no `useAuth()` to read, and a uid threaded through
 * nine call sites is nine chances to forget one.
 */

/** The header the rate limiter actually reads. */
export const UID_HEADER = "X-Lazytopper-Uid";

/**
 * ★ `firebaseClient` is imported LAZILY, inside the call, and that is required —
 * not a style choice.
 *
 * `firebaseClient` reads `import.meta.env` at module scope. A static import here
 * would put it on `aiClient`'s module graph, and `aiClient` is reachable from
 * code that the root guard matrix (`scripts/`) executes under plain Node via
 * tsx, where `import.meta.env` is undefined. A static import turned
 * `practiceSetGeneratorGuard.test.ts` red with
 * `Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')` —
 * three subtests that have nothing to do with auth, failing because of an edge
 * added two modules away.
 *
 * Deferring it means the edge only exists when a paid call is actually made,
 * which only ever happens in a browser. `paidCallHeaders.test.ts` pins this.
 */
async function currentFirebaseUser() {
  const { authClient } = await import("../services/firebaseClient");
  return authClient?.currentUser ?? null;
}

/** What a signed-in student reads when their sign-in could not be confirmed. */
export const SIGN_IN_AGAIN_MESSAGE =
  "We couldn't confirm you're signed in. Please sign in again, then try once more.";

/**
 * Thrown when a SIGNED-IN student's ID token could not be fetched after every retry.
 * Nothing about it is the student's fault, so the message is plain English and asks
 * for the one thing that fixes it. Callers render `err.message`; detect by `name`.
 */
export class SignInAgainError extends Error {
  constructor() {
    super(SIGN_IN_AGAIN_MESSAGE);
    this.name = "SignInAgainError";
  }
}

/**
 * Waits before attempts 2 and 3 — THREE attempts in all.
 *
 * Attempt 1 is the ordinary `getIdToken()`: served from cache when fresh, so a healthy
 * student pays nothing. Attempts 2 and 3 FORCE a refresh, because a failure there is
 * usually a refresh that did not complete (a network blip) or a cached token in a bad
 * state, and only a forced refresh replaces it. The waits cover a short connectivity
 * drop without keeping a student staring at a spinner: at most ~1.3s is added, and
 * only to a call that was about to be refused anyway.
 */
export const TOKEN_RETRY_DELAYS_MS: readonly number[] = [300, 1000];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchIdToken(user: { getIdToken: (forceRefresh?: boolean) => Promise<string> }) {
  for (let attempt = 0; attempt <= TOKEN_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await sleep(TOKEN_RETRY_DELAYS_MS[attempt - 1]);
    try {
      const token = attempt === 0 ? await user.getIdToken() : await user.getIdToken(true);
      if (token) return token;
    } catch {
      /* retried below; exhaustion is handled by the caller */
    }
  }
  return null;
}

/**
 * Headers identifying the signed-in caller, merged onto a paid request.
 *
 * A signed-out caller gets `{}`, as before. A signed-in caller gets the uid header
 * AND a bearer token, and NEVER the uid header alone.
 *
 * ★ THIS THROWS (UID-HEADER-CLOSE-1). It used to degrade to the uid header alone when
 * the token could not be fetched, and the server served that — which meant it served
 * any stranger who typed a uid. The server now refuses a uid with no token, so
 * sending one would only buy a Premium upgrade prompt shown to a student who may
 * well have paid. Instead, after every retry fails, this throws SignInAgainError
 * BEFORE the request is made, and the call site shows its message. This applies to
 * every paid call, ungated ones included, so a student meets the same "sign in
 * again" everywhere rather than being served on some surfaces and refused on others.
 */
export async function paidCallHeaders(): Promise<Record<string, string>> {
  const current = await currentFirebaseUser();
  if (!current?.uid) return {};

  const token = await fetchIdToken(current);
  if (!token) throw new SignInAgainError();

  return { [UID_HEADER]: current.uid, Authorization: `Bearer ${token}` };
}

/** Convenience: JSON content type plus caller identity, the shape most sites need. */
export async function paidJsonHeaders(): Promise<Record<string, string>> {
  return { "Content-Type": "application/json", ...(await paidCallHeaders()) };
}
