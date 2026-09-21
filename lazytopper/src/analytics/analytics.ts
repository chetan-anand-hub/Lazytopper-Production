import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";

/**
 * THE ONE ANALYTICS ENTRY POINT. Nothing else initialises a vendor, and nothing else
 * sends an event.
 *
 * This answers exactly two questions the owner asked — IS ANYONE HERE, and WHICH PAGES
 * ARE THEY USING — plus a signup count. It is deliberately not a data platform: there
 * are no funnels, no segments, no session stitching and no user identity of any kind.
 *
 * ★ COOKIELESS BY RULING. LazyTopper's users are fifteen-year-olds, and India's DPDP Act
 * requires verifiable parental consent to process a child's personal data and restricts
 * behavioural tracking of children. Cross-session identity is the one thing that turns
 * page counting into behavioural tracking of minors, so we do not have it: no cookie, no
 * localStorage key, no persistent id, no uid, nothing that links one visit to the next.
 * ⚠ DO NOT add an `identify()` call here. That is not a feature request, it is a
 * different legal posture, and it belongs to a lane with a consent design.
 */

/**
 * ★ WHY THE CAPTURE MUST NOT BE COUNTED, AND HOW WE KNOW IT ISN'T.
 *
 * `scripts/seo/captureStaticBodies.ts` drives a real Chromium over EVERY advertised page
 * to produce the prerendered bodies. It is a real browser in a real context, so anything
 * that fires on a page view fires for it too. Left alone it would inject dozens of
 * synthetic sessions on every capture run and the owner's first real numbers would be
 * noise.
 *
 * We cannot edit that script, so detection lives here. The capture serves the built
 * output from `http://127.0.0.1:<ephemeral port>` (captureStaticBodies.ts:289,698) — a
 * loopback origin it cannot avoid, because the whole point is to serve local files.
 * That is the signal we key on.
 *
 * ⚠ WHY NOT AN ALLOWLIST OF THE PRODUCTION HOSTNAME, which is the obvious first idea:
 * the acceptance suite runs against a Vercel PREVIEW, served from `*.vercel.app`, not
 * from the production domain. An allowlist would switch analytics off on the very
 * deployment being tested, and the "a page view is recorded" checks would then pass by
 * measuring nothing. Excluding loopback keeps previews live and still excludes the
 * capture.
 *
 * `navigator.webdriver` is belt-and-braces on top, not the mechanism — it is a property
 * an automated browser can be configured to hide, so it is never relied on alone.
 */
const LOOPBACK_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

export function isAutomatedContext(hostname: string, webdriver: boolean): boolean {
  if (LOOPBACK_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".local")) return true;
  return webdriver;
}

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    return !isAutomatedContext(
      window.location.hostname,
      window.navigator?.webdriver === true,
    );
  } catch {
    // A hostile or sandboxed context can throw on any of the above. Silence beats a
    // white screen — see the fail-open note on track() below.
    return false;
  }
}

/**
 * ★★ WHAT LEAVES THE PAGE IS A PATH, AND ONE PATH IS A LIVE CREDENTIAL.
 *
 * `/u/:token` (App.tsx:1235) is the phone half of the QR answer handoff, and its
 * `:token` is a **256-bit, 5-minute, single-use, write-only capability token**. Sending
 * the raw pathname would hand a working credential to an analytics vendor, in a URL, in
 * plain text. That is not a privacy nit — it is an auth leak, and it is the reason this
 * function exists rather than us passing `location.pathname` straight through.
 *
 * Everything else in the route table is content: grades, subjects, topic slugs, note
 * slugs. Those are what "which pages are they using" MEANS, so they are kept as-is.
 *
 * The query string and hash are dropped wholesale and unconditionally. They are where
 * Firebase's `oobCode`, `continueUrl` and friends live, none of which has any business
 * leaving the page.
 */
const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/u\/[^/]+.*$/, "/u/:token"],
];

const MAX_PATH_LENGTH = 200;

export function normalisePath(rawPath: string): string {
  let path = String(rawPath || "/").split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  for (const [pattern, replacement] of REDACTIONS) {
    if (pattern.test(path)) {
      path = path.replace(pattern, replacement);
      break;
    }
  }
  // Trailing slashes make `/pricing` and `/pricing/` two rows in the dashboard for one
  // page. The root keeps its slash.
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.length > MAX_PATH_LENGTH) path = path.slice(0, MAX_PATH_LENGTH);
  return path;
}

/**
 * THE VENDOR BINDING — the only vendor-aware lines in the app.
 *
 * Vercel Web Analytics, installed as a plain `<script>` tag in index.html: cookieless,
 * no npm dependency, and no new data processor — Vercel already serves every request, so
 * nothing new learns anything about a student. It is served first-party from
 * `/_vercel/insights/*`, which ad blockers block far less than a third-party domain.
 *
 * ★★ THE TWO CALL SHAPES ARE NOT INTERCHANGEABLE, AND GUESSING COSTS YOU THE DATA.
 * Read out of the published package source (@vercel/analytics@2.0.1, dist/index.mjs):
 *
 *   a page view  ->  window.va("pageview", { route, path })      (line 227)
 *   a custom event -> window.va("event",    { name, data })      (track())
 *
 * Sending a page view through the `"event"` shape does not fail — it files every page
 * view as a CUSTOM EVENT, in the wrong dashboard section, against the custom-event
 * allowance. It would have looked like it worked.
 *
 * If `window.va` is absent — blocked by an ad blocker, failed to load, or simply not on
 * a Vercel deployment — this returns null and every call below is a no-op. That is §2.6.
 */
type VendorSend = (kind: "pageview" | "event", payload: Record<string, unknown>) => void;

function resolveVendor(): VendorSend | null {
  const w = window as unknown as {
    va?: (kind: string, payload: Record<string, unknown>) => void;
  };
  return typeof w.va === "function" ? w.va.bind(window) : null;
}

/**
 * ⚠ EVERY PATH OUT OF THIS MODULE IS WRAPPED. Analytics is the least important code in
 * the product and it sits on the hottest path in it — the router. An exception escaping
 * here would reach the error boundary and take the page down for a student, to protect a
 * page-view count. It never throws, and it never logs in production either: a blocked
 * vendor is the NORMAL case, not an error, and a console full of warnings is its own
 * kind of breakage.
 */
function send(kind: "pageview" | "event", payload: Record<string, unknown>): void {
  if (!analyticsEnabled()) return;
  try {
    const vendor = resolveVendor();
    if (!vendor) return;
    vendor(kind, payload);
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * ⚠ THE SCRIPT TAG CARRIES `data-disable-auto-track="1"`, AND THAT IS LOAD-BEARING.
 *
 * Left to itself the Vercel script sends its own page view the moment it loads, from
 * `window.location`, before a line of our code runs. That is two separate problems:
 * every first view would be counted twice (its own plus ours), and — far worse — on
 * `/u/<token>` it would transmit the raw capability token before `normalisePath` ever
 * saw it. Disabling auto-tracking means NO page view leaves this app that has not been
 * through the redactor below.
 *
 * `route` and `path` are both sent as the redacted path. We do not resolve React Router
 * patterns into `route`: that would need a second copy of App.tsx's route table, which
 * would drift. Per-path rows are what "which pages are they using" actually means here.
 */
export function trackPageview(path: string): void {
  const clean = normalisePath(path);
  send("pageview", { route: clean, path: clean });
}

/**
 * §2.5 — SIGNUPS, AND WHY THIS TAKES NO ARGUMENTS.
 *
 * The caller has a Firebase credential in hand at this point and it is tempting to pass
 * the uid "because it is already opaque". We do not. An opaque id is still an id: stored
 * once, it links this visit to the next one, which is precisely the cross-session
 * identity the ruling excludes. The owner asked whether visits become accounts — that is
 * a COUNT, and a count needs no identifier.
 *
 * ⚠ THE CALLER MUST GATE ON `getAdditionalUserInfo(credential).isNewUser`.
 * `signInWithPopup` fires identically for a brand-new account and a returning student,
 * so an ungated call counts every login as a signup — and it is wrong in the flattering
 * direction, which is the worst way for a number to be wrong.
 */
export function trackSignUp(): void {
  send("event", { name: "sign_up" });
}

/**
 * ★★ WHY THE `isNewUser` CHECK LIVES HERE AND NOT IN AuthContext.
 *
 * `signInWithPopup` and phone `confirm()` are each ONE call for both a brand-new account
 * and a returning student, so they must be gated on `isNewUser` or every login counts
 * as a signup. The obvious place for that gate is inline at the call site in
 * AuthContext — and that is exactly where it must NOT go.
 *
 * Inline, the `getAdditionalUserInfo(...)` evaluation runs on the AUTH HOT PATH,
 * OUTSIDE the try/catch that makes `send()` safe. Should it ever throw, it throws out of
 * `signInWithGoogle` / `verifyPhoneOtp` and a student cannot log in — analytics breaking
 * the single most important path in the product, to protect a signup count.
 *
 * This was not hypothetical: an inline gate turned 7 tests in
 * AuthContext.phoneName.test.tsx red, because that suite's `firebase/auth` mock has no
 * `getAdditionalUserInfo` and the access threw straight out of `verifyPhoneOtp`. The
 * suite was right. Here, the same throw is caught, the signup quietly goes uncounted,
 * and the login succeeds — which is the correct order of priorities.
 */
export function trackSignUpIfNew(credential: UserCredential): void {
  try {
    if (getAdditionalUserInfo(credential)?.isNewUser) trackSignUp();
  } catch {
    /* a signup count is never worth a failed login */
  }
}
