import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";
import { recordActivity } from "../services/activityClient";

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
 *
 * ★★ ONE OWNER-APPROVED EXCEPTION — GOOGLE ANALYTICS 4 (GA4-1, owner ruling 2026-09-29).
 * The owner chose GA4 to measure ad conversions, knowing it sets a persistent cookie id,
 * and by a second ruling the same day turned Google Signals and ad personalisation ON
 * (Google Ads remarketing). The rulings supersede the cookieless rule FOR THAT TAG ONLY,
 * and only with every security mitigation below: the tag is loaded by an inline block in
 * index.html that does nothing on a `/u/` hand-off link; automatic page views are off;
 * and every address and referrer Google receives is redacted
 * (`ga4PageLocation` / `ga4PageReferrer` below — the snippet mirrors them, and
 * indexHtml.guard.test.ts proves the two agree). What is sent is exactly what the Vercel
 * binding already sends — a redacted page view, or an event NAME — and nothing else: no
 * uid, no email, no question content, no other parameter. The Vercel binding is untouched.
 *
 * ★★ A SECOND, ON THE SAME TERMS — THE META PIXEL (META-PIXEL-1, owner request 2026-10-10).
 * Ad conversions and remarketing for Meta ads; it sets cookies, and the Privacy Policy
 * says so. Same mitigations as GA4 (nothing on `/u/`, no automatic page views, an event
 * NAME only, no advanced matching), except that Meta's address cannot be rewritten — so
 * from an address that would need redacting, nothing is sent at all (`sendToMeta`).
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

/**
 * FRICTION-FIX-1 · F6 — PERSONAL DATA IN A PATH SEGMENT.
 *
 * Two kinds of segment are an identifier, not content, and never leave the page:
 *   - any segment containing `@` (or its percent-encoded form `%40`)  -> `:email`
 *   - any segment of 20+ characters of [A-Za-z0-9_-]                  -> `:id`
 *     (a Firebase uid is 28 such characters: `/admin/students/<uid>` -> `/admin/students/:id`)
 *
 * ★ THE ONE CARVE-OUT, AND WHY. A lowercase kebab-case word slug (`areas-related-to-circles`,
 * `chemical-reactions-and-equations`) is also 20+ characters of that set — several of the
 * app's own chapter slugs are. Those are CONTENT ("which pages are they using"), and the
 * first-party activity log reads its page names out of this function's output
 * (activityPages.ts), so redacting them would file every long chapter under `other`. A
 * slug is lowercase words joined by single hyphens, starting with a letter; an opaque id
 * has capitals and digits (a 28-character base-62 uid with neither is a ~1-in-10^10
 * event). Pinned both ways by analytics.test.ts.
 *
 * Applied per segment, after the `/u/:token` rule, which is unchanged.
 */
const EMAIL_SEGMENT = /@|%40/i;
const OPAQUE_ID_SEGMENT = /^[A-Za-z0-9_-]{20,}$/;
const CONTENT_SLUG_SEGMENT = /^[a-z]+(?:-[a-z0-9]+)*$/;

function redactSegment(segment: string): string {
  if (EMAIL_SEGMENT.test(segment)) return ":email";
  if (OPAQUE_ID_SEGMENT.test(segment) && !CONTENT_SLUG_SEGMENT.test(segment)) return ":id";
  return segment;
}

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
  path = path.split("/").map(redactSegment).join("/");
  // Trailing slashes make `/pricing` and `/pricing/` two rows in the dashboard for one
  // page. The root keeps its slash.
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.length > MAX_PATH_LENGTH) path = path.slice(0, MAX_PATH_LENGTH);
  return path;
}

/**
 * THE VERCEL BINDING — with the GA4 binding below, the only vendor-aware lines in the app.
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
 * a Vercel deployment — this returns null and the Vercel half of every call below is a
 * no-op. That is §2.6.
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
    if (vendor) vendor(kind, payload);
  } catch {
    /* analytics must never break the page */
  }
  // A separate guard, so one vendor failing can never cost the other its hit.
  try {
    sendToGa4(kind, payload);
  } catch {
    /* analytics must never break the page */
  }
  try {
    sendToMeta(kind, payload);
  } catch {
    /* analytics must never break the page */
  }
  // ★ STUDENT-ACTIVITY-1 (owner ruling 2026-10-01) — the FIRST-PARTY activity log, and
  // the one place this module deals with a signed-in student. It is NOT a vendor and
  // NOT an identify(): nothing is added to what GA4 or Vercel receive (above, unchanged).
  // activityClient counts a section/event NAME for a signed-in student only and posts
  // it to our own server, which takes the uid from a verified token; a signed-out
  // visitor is never recorded and never linked to an account. Runs last, in its own
  // guard, so it can never cost either vendor its hit.
  try {
    recordActivity(kind, payload);
  } catch {
    /* analytics must never break the page */
  }
}

/* ------------------------------------------------------------------------- *
 * GOOGLE ANALYTICS 4 — the second vendor binding (GA4-1).
 *
 * `window.gtag` is defined ONLY by the inline block in index.html, and that block
 * does nothing on a `/u/` hand-off link or in an automated context. So on those pages
 * — and wherever an ad blocker stopped the tag — `resolveGtag()` is null and GA4 is a
 * silent no-op, exactly like a blocked Vercel script.
 * ------------------------------------------------------------------------- */

type Gtag = (...args: unknown[]) => void;

function resolveGtag(): Gtag | null {
  const w = window as unknown as { gtag?: Gtag };
  return typeof w.gtag === "function" ? w.gtag : null;
}

/** The router's basename (`/app`), from the same value main.tsx hands BrowserRouter. */
function appBasename(): string {
  return String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
}

/**
 * The ONLY query parameters GA4 ever receives: `gclid` (the Google Ads click id — the
 * conversion cannot be attributed without it) and `utm_*` (campaign tags). Everything
 * else — Firebase's `oobCode` / `continueUrl`, a search, anything a link carried — is
 * dropped. Kept parameters are passed through byte-for-byte, never re-encoded, so the
 * index.html snippet (which has no URLSearchParams guarantee to lean on) produces the
 * identical string.
 */
export function ga4AdParams(search: string): string {
  const kept: string[] = [];
  for (const part of String(search || "").replace(/^\?/, "").split("&")) {
    const key = part.split("=")[0];
    if (key === "gclid" || key.indexOf("utm_") === 0) kept.push(part);
  }
  return kept.length ? `?${kept.join("&")}` : "";
}

/**
 * ★ `page_location` FOR EVERY GA4 HIT: origin + basename + `normalisePath(routerPath)` +
 * only `gclid` / `utm_*`. `normalisePath` is what turns `/u/<token>` into `/u/:token`,
 * so the path handed in must be ROUTER-relative (basename stripped): `/app/u/<token>`
 * does not match its `^/u/` rule. The basename is put back afterwards so the address
 * Google records is the real, working URL.
 */
export function ga4PageLocation(
  routerPath: string,
  search: string,
  origin: string,
  basename: string = appBasename(),
): string {
  return `${origin}${basename}${normalisePath(routerPath)}${ga4AdParams(search)}`;
}

/** A full browser pathname (`/app/notes/x`) as the router sees it (`/notes/x`). */
export function routerPathOf(pathname: string, basename: string = appBasename()): string {
  const full = String(pathname || "/");
  if (basename && (full === basename || full.indexOf(`${basename}/`) === 0)) {
    return full.slice(basename.length) || "/";
  }
  return full;
}

/**
 * `page_referrer`: the referring ORIGIN only (`https://www.google.com/`). A referrer's
 * path and query can carry anything — including our own `/app/u/<token>` when a student
 * leaves the hand-off page — and the origin is all source attribution needs.
 * Credentials in the authority are dropped; anything that is not http(s) becomes "".
 */
const REFERRER_ORIGIN = /^(https?:\/\/)(?:[^/?#@]*@)?([^/?#@]+)/i;

export function ga4PageReferrer(referrer: string): string {
  const match = REFERRER_ORIGIN.exec(String(referrer || ""));
  return match ? `${match[1]}${match[2]}/` : "";
}

/**
 * ★ G2 — THE REDACTED ADDRESS GOES ON EVERY HIT, TWICE.
 *
 * `gtag('set', …)` first, as the ruling specifies. It is ALSO passed on the event itself,
 * because gtag's documented precedence is event > config > set: the `page_location` the
 * index.html snippet put on `config` (the LANDING address) would otherwise outrank the
 * `set` on every later hit, and every page view would be filed against the landing page.
 * Both values are the same redacted string; nothing new is sent.
 */
function sendToGa4(kind: "pageview" | "event", payload: Record<string, unknown>): void {
  const gtag = resolveGtag();
  if (!gtag) return;
  const name = kind === "pageview" ? "page_view" : payload.name;
  if (typeof name !== "string" || !name) return;
  const loc = window.location;
  const routerPath =
    kind === "pageview" && typeof payload.path === "string"
      ? payload.path
      : routerPathOf(loc.pathname);
  const page = {
    page_location: ga4PageLocation(routerPath, loc.search, loc.origin),
    page_referrer: ga4PageReferrer(document.referrer),
  };
  gtag("set", page);
  gtag("event", name, { ...page });
}

/* ------------------------------------------------------------------------- *
 * META (FACEBOOK) PIXEL — the third vendor binding (META-PIXEL-1, owner request
 * 2026-10-10).
 *
 * `window.fbq` is defined ONLY by the inline block in index.html, which does nothing on
 * a `/u/` hand-off link or in an automated context, so there — and wherever an ad
 * blocker stopped it — this is a silent no-op, like GA4.
 *
 * ★★ NOTHING CAN BE REDACTED FOR META, SO NOTHING IS SENT FROM AN ADDRESS THAT NEEDS IT.
 * Read out of the published fbevents.js: every request carries `dl` = `location.href`
 * (read when the request is made, query and hash included) and `rl` =
 * `document.referrer`, and there is no documented per-event override. GA4 gets a
 * rewritten `page_location`; Meta cannot. So `sendToMeta` sends ONLY while the address
 * is already exactly what the redactor would produce (`metaAddressIsClean`), and while
 * a same-site referrer is too (a full navigation away from `/u/<token>` leaves that URL
 * in `document.referrer`). Otherwise it sends nothing, AND it removes any `track` call
 * still waiting in the stub queue: fbevents replays that queue with the address at the
 * moment it arrives, which may no longer be the page the call was made on.
 *
 * What is sent is an event NAME, never a parameter: `PageView`, or the standard event
 * `META_EVENTS` maps an app event to. No uid, no email, no advanced matching (the users
 * are fifteen-year-olds). Any other app event is not sent to Meta.
 * ------------------------------------------------------------------------- */

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown };

function resolveFbq(): Fbq | null {
  const w = window as unknown as { fbq?: Fbq };
  return typeof w.fbq === "function" ? w.fbq : null;
}

type MetaCall = readonly ["track" | "trackCustom", string];

export const META_EVENTS: Readonly<Partial<Record<"sign_up" | NamedAnalyticsEvent, MetaCall>>> = {
  sign_up: ["track", "CompleteRegistration"],
  trial_start: ["track", "StartTrial"],
};

const META_PAGEVIEW: MetaCall = ["track", "PageView"];

/** `utm_*` and the ad click ids, plus `cbq` — the ad landing's boolean flag. Nothing else. */
const META_QUERY_KEEP = /^(?:utm_.*|fbclid|gclid|cbq)$/;
const HANDOFF_PATH = /^(?:\/app)?\/u(?:\/|$)/;

function metaQueryAndHashAreClean(search: string, hash: string): boolean {
  if (hash && hash !== "#") return false;
  for (const part of String(search || "").replace(/^\?/, "").split("&")) {
    if (part && !META_QUERY_KEEP.test(part.split("=")[0])) return false;
  }
  return true;
}

function metaPathIsClean(pathname: string, basename: string): boolean {
  const full = String(pathname || "/");
  if (HANDOFF_PATH.test(full)) return false;
  const routerPath = routerPathOf(full, basename);
  return normalisePath(routerPath) === routerPath;
}

const siteOf = (host: string): string => String(host || "").toLowerCase().replace(/^www\./, "");

/**
 * The address is CLEAN when redaction would not change it: not a hand-off path,
 * `normalisePath(path) === path` (no email or opaque-id segment, no trailing slash), no
 * hash, and only `utm_*` / `fbclid` / `gclid` / `cbq` in the query. A same-site referrer
 * (`www.` ignored) must pass the same test; a cross-site one may carry no other query
 * parameter and no hash. An unparseable referrer is not clean.
 */
export function metaAddressIsClean(
  loc: { pathname: string; search: string; hash: string; hostname: string },
  referrer: string,
  basename: string = appBasename(),
): boolean {
  if (!metaPathIsClean(loc.pathname, basename) || !metaQueryAndHashAreClean(loc.search, loc.hash)) {
    return false;
  }
  const ref = String(referrer || "");
  if (!ref) return true;
  let url: URL;
  try {
    url = new URL(ref);
  } catch {
    return false;
  }
  if (!metaQueryAndHashAreClean(url.search, url.hash)) return false;
  return siteOf(url.hostname) !== siteOf(loc.hostname) || metaPathIsClean(url.pathname, basename);
}

function dropQueuedMetaEvents(fbq: Fbq): void {
  const queue = fbq.queue;
  if (!Array.isArray(queue)) return;
  for (let i = queue.length - 1; i >= 0; i--) {
    const method = (queue[i] as ArrayLike<unknown> | undefined)?.[0];
    if (method === "track" || method === "trackCustom") queue.splice(i, 1);
  }
}

/**
 * ★ BEFORE fbevents.js ARRIVES, A CALL WAITS HERE, NOT IN THE STUB QUEUE. The library
 * replays its queue with the address at the moment it arrives, and the address can change
 * with no route change (a query or hash), which never reaches this module. So a call made
 * before the library loads is held, and sent on `lt:fbq-ready` (dispatched by the script
 * tag's onload in index.html) only if the address is clean THEN; otherwise it is dropped.
 * The library has loaded once it has put `callMethod` on the stub.
 */
const META_PENDING_CAP = 20;
const metaPending: MetaCall[] = [];
let metaReadyListening = false;

function metaLibraryLoaded(fbq: Fbq): boolean {
  return typeof (fbq as { callMethod?: unknown }).callMethod === "function";
}

function flushMetaPending(): void {
  const calls = metaPending.splice(0);
  try {
    const fbq = resolveFbq();
    if (!fbq || !metaAddressIsClean(window.location, document.referrer)) return;
    for (const call of calls) fbq(call[0], call[1]);
  } catch {
    /* analytics must never break the page */
  }
}

function holdMetaCall(call: MetaCall): void {
  metaPending.push(call);
  if (metaPending.length > META_PENDING_CAP) metaPending.shift();
  if (!metaReadyListening) {
    metaReadyListening = true;
    window.addEventListener("lt:fbq-ready", flushMetaPending);
  }
}

function sendToMeta(kind: "pageview" | "event", payload: Record<string, unknown>): void {
  const fbq = resolveFbq();
  if (!fbq) return;
  if (!metaAddressIsClean(window.location, document.referrer)) {
    metaPending.length = 0;
    dropQueuedMetaEvents(fbq);
    return;
  }
  const name = payload.name;
  const call =
    kind === "pageview"
      ? META_PAGEVIEW
      : typeof name === "string" && Object.prototype.hasOwnProperty.call(META_EVENTS, name)
        ? META_EVENTS[name as keyof typeof META_EVENTS]
        : undefined;
  if (!call) return;
  if (metaLibraryLoaded(fbq)) fbq(call[0], call[1]);
  else holdMetaCall(call);
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
 * FREE-CHECK-1b (R10) — the free-check funnel, as COUNTS.
 *
 * Exactly the same rule as `trackSignUp` above, for the same reason (DPDP §9(3)): the
 * payload is the event NAME and nothing else. No uid, no device id, no result, no
 * reason code, no timestamp of ours — a count needs no identifier, and an opaque one is
 * still an identifier. The name is a closed union, so a caller cannot smuggle a value
 * into it either.
 *
 *   free_check_used_block   a browser that already used its free check was shown "used"
 *   free_check_signup       a free result was saved to a new sign-in (the R8 replay)
 *   free_check_trial_start  the student tapped "Start my free trial" in the R9 offer
 *   trial_start             TRIAL-CTA-1 — a user action started the 7-day trial (Pricing, the
 *                           sign-in door's trial intent, the RequirePremium lock, the C&I
 *                           offer). Fired ONLY where the call site's eligibility guard held, so
 *                           a repeated or ineligible tap is never counted. The ads conversion.
 */
export type NamedAnalyticsEvent =
  | "free_check_used_block"
  | "free_check_signup"
  | "free_check_trial_start"
  | "trial_start"
  | "check_question_read"
  | "check_answer_added"
  | "check_graded";

export function trackNamedEvent(name: NamedAnalyticsEvent): void {
  send("event", { name });
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
