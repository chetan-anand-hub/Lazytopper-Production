import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";
import { recordActivity } from "../services/activityClient";
import { rememberVisitSourceOnce } from "./visitSource";
import { startEngagedVisitWatch, type EngagedVisitTrigger } from "./engagedVisit";

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
 * ★ TRACK-2 — TWO DEVICE-LOCAL MARKERS, NEITHER AN IDENTITY, BOTH REGISTERED IN
 * studentDataMap.ts: `lazytopper.internal` (localStorage, the single character 1, set when
 * this device opens /admin so the owner's own browsing can be tagged `traffic_type:
 * "internal"` for GA4's filter) and `lazytopper.purchaseSent` (THIS TAB's sessionStorage, up
 * to 20 random per-attempt checkout ids, so one payment is never counted twice). Neither is a
 * uid, an email or anything that links a visit to a person, and neither is sent anywhere.
 *
 * ★★ A NARROW EXCEPTION TO "NO localStorage KEY" — SOURCE-1 (owner ruling 12 Oct 2026,
 * 13:16 IST, "Source capture yes allowed"; DECISION 107c): a SINGLE-VISIT SOURCE CAPTURE
 * is allowed as a narrow exception to the cookieless rule. Tab-scoped `sessionStorage`
 * only (never localStorage, never a cookie, never across visits); coarse fields only;
 * sent once, at sign-up, to OUR server only; nothing goes to any vendor. Everything it
 * keeps and every limit is in visitSource.ts — `trackPageview` below only asks it to look
 * at the landing, once per document load.
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
 *
 * (TRACK-2: the three vendor sends live in `sendToVendors`, each in its own guard, and
 * `send` skips them on an admin page.)
 */
/**
 * TRACK-2 — the parameters an event carries to GA4 and Meta, kept OUT of the Vercel
 * payload (which is sent as-is, `{ name, data }`). Only the TRACK-2 events have any.
 */
interface VendorParams {
  ga4?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/**
 * ★ TRACK-2 §1.3 — THE OWNER'S ADMIN VISITS ARE NOT TRAFFIC.
 *
 * On `/admin` (and anything under it) NO page view and NO event goes to Vercel, GA4 or
 * Meta. The first-party activity log below is unchanged. A page view is judged by the
 * path it carries (the page being entered), an event by the address it happened on.
 * Any admin visit also marks the device (`lazytopper.internal`, studentDataMap.ts), so
 * the owner's ordinary browsing from that device reaches GA4 as `traffic_type:
 * "internal"` — GA4's internal-traffic filter can then drop it, once the owner says so.
 */
const ADMIN_PATH = /^\/admin(?:\/|$)/;
export const INTERNAL_DEVICE_KEY = "lazytopper.internal";

function isAdminHit(kind: "pageview" | "event", payload: Record<string, unknown>): boolean {
  const routerPath =
    kind === "pageview" && typeof payload.path === "string"
      ? payload.path
      : routerPathOf(window.location.pathname);
  return ADMIN_PATH.test(routerPath);
}

function markInternalDevice(): void {
  try {
    window.localStorage.setItem(INTERNAL_DEVICE_KEY, "1");
  } catch {
    /* a blocked storage costs only the internal tag */
  }
}

export function isInternalDevice(): boolean {
  try {
    return window.localStorage.getItem(INTERNAL_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * `activityName` (FEEDBACK-1): the name the FIRST-PARTY log records instead of
 * `payload.name`, for an event whose vendor name is generic but whose first-party name
 * carries its codes. Only the name changes: the activity log is still handed nothing but
 * `{ name }`, and the vendors still get exactly `payload` / `params`.
 */
function send(
  kind: "pageview" | "event",
  payload: Record<string, unknown>,
  params: VendorParams = {},
  activityName?: NamedAnalyticsEvent,
): void {
  if (!analyticsEnabled()) return;
  let adminHit = false;
  try {
    adminHit = isAdminHit(kind, payload);
    if (adminHit) markInternalDevice();
  } catch {
    // Unreadable address: treat as admin, so nothing leaves for a vendor by accident.
    adminHit = true;
  }
  if (!adminHit) sendToVendors(kind, payload, params);
  // ★ STUDENT-ACTIVITY-1 (owner ruling 2026-10-01) — the FIRST-PARTY activity log, and
  // the one place this module deals with a signed-in student. It is NOT a vendor and
  // NOT an identify(): nothing is added to what GA4 or Vercel receive (above, unchanged).
  // activityClient counts a section/event NAME for a signed-in student only and posts
  // it to our own server, which takes the uid from a verified token; a signed-out
  // visitor is never recorded and never linked to an account. Runs last, in its own
  // guard, so it can never cost either vendor its hit.
  try {
    recordActivity(kind, activityName ? { name: activityName } : payload);
  } catch {
    /* analytics must never break the page */
  }
}

function sendToVendors(kind: "pageview" | "event", payload: Record<string, unknown>, params: VendorParams): void {
  try {
    const vendor = resolveVendor();
    if (vendor) vendor(kind, payload);
  } catch {
    /* analytics must never break the page */
  }
  // A separate guard, so one vendor failing can never cost the other its hit.
  try {
    sendToGa4(kind, payload, params.ga4);
  } catch {
    /* analytics must never break the page */
  }
  try {
    sendToMeta(kind, payload, params.meta);
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
function sendToGa4(
  kind: "pageview" | "event",
  payload: Record<string, unknown>,
  eventParams?: Record<string, unknown>,
): void {
  const gtag = resolveGtag();
  if (!gtag) return;
  const name = kind === "pageview" ? "page_view" : payload.name;
  if (typeof name !== "string" || !name) return;
  const loc = window.location;
  const routerPath =
    kind === "pageview" && typeof payload.path === "string"
      ? payload.path
      : routerPathOf(loc.pathname);
  const page: Record<string, string> = {
    page_location: ga4PageLocation(routerPath, loc.search, loc.origin),
    page_referrer: ga4PageReferrer(document.referrer),
  };
  // TRACK-2 §1.3 — a device that has opened /admin is the owner's: tag it, so GA4's
  // internal-traffic filter can drop it once the owner switches that filter on.
  if (isInternalDevice()) page.traffic_type = "internal";
  gtag("set", page);
  // TRACK-2 — only the checkout and onboarding events carry params (built and sanitised
  // by their own track functions below). The address keys are spread LAST so a param
  // can never overwrite the redacted address.
  gtag("event", name, { ...(eventParams ?? {}), ...page });
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

/**
 * A Meta call: method and standard event name, plus — for the two TRACK-2 checkout
 * events only — a third argument carrying `{ value, currency }` (and nothing else).
 */
type MetaCall =
  | readonly ["track" | "trackCustom", string]
  | readonly ["track" | "trackCustom", string, Record<string, unknown>];

export const META_EVENTS: Readonly<
  Partial<Record<"sign_up" | "first_graded" | NamedAnalyticsEvent, readonly ["track" | "trackCustom", string]>>
> = {
  sign_up: ["track", "CompleteRegistration"],
  trial_start: ["track", "StartTrial"],
  // TRACK-2 — the checkout funnel. Value + currency travel as the third argument.
  begin_checkout: ["track", "InitiateCheckout"],
  purchase: ["track", "Purchase"],
  // MEASURE-1 B — a custom event (Meta has no standard "activated"); the name only, no surface.
  first_graded: ["trackCustom", "FirstGraded"],
};

const META_PAGEVIEW: MetaCall = ["track", "PageView"];

/** `utm_*` and the ad click ids, plus `cbq` and `ct` — the CBQ and Chapter Test ad landings' boolean flags (META-CT-PARAM-1). Nothing else. */
const META_QUERY_KEEP = /^(?:utm_.*|fbclid|gclid|cbq|ct)$/;
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
 * hash, and only `utm_*` / `fbclid` / `gclid` / `cbq` / `ct` in the query. A same-site referrer
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
    for (const call of calls) fbq(...call);
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

function sendToMeta(
  kind: "pageview" | "event",
  payload: Record<string, unknown>,
  eventParams?: Record<string, unknown>,
): void {
  const fbq = resolveFbq();
  if (!fbq) return;
  if (!metaAddressIsClean(window.location, document.referrer)) {
    metaPending.length = 0;
    dropQueuedMetaEvents(fbq);
    return;
  }
  const name = payload.name;
  const mapped =
    kind === "pageview"
      ? META_PAGEVIEW
      : typeof name === "string" && Object.prototype.hasOwnProperty.call(META_EVENTS, name)
        ? META_EVENTS[name as keyof typeof META_EVENTS]
        : undefined;
  if (!mapped) return;
  const call: MetaCall = kind === "event" && eventParams ? [mapped[0], mapped[1], eventParams] : mapped;
  if (metaLibraryLoaded(fbq)) fbq(...call);
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
  // SOURCE-1 — the first page view of a document load is the one moment the landing URL
  // still has its query: RouteAnalytics' effect runs before App's `<Navigate>` redirects
  // (e.g. `/` -> `/welcome`, which drops it). Once per load; never throws; reads no vendor.
  try {
    rememberVisitSourceOnce({ pathname: path, search: window.location.search });
  } catch {
    /* a source is never worth a broken page view */
  }
  // MEASURE-1 A — start the engaged-visit watch on the first page view of the document (the
  // module's one per-load entry point; idempotent, so later route changes never re-arm it).
  // Not in an automated context: the prerender capture must not even be watched.
  try {
    if (analyticsEnabled()) startEngagedVisitWatch(trackEngagedVisit);
  } catch {
    /* analytics must never break the page */
  }
  const clean = normalisePath(path);
  send("pageview", { route: clean, path: clean });
}

/**
 * MEASURE-1 A — `engaged_visit`, sent by the watch in engagedVisit.ts at most once per document.
 * Data: the trigger and the REDACTED router path of the page it happened on — no id, no query,
 * nothing personal. Vendors only (Vercel custom event + GA4): NOT a Meta event (not in
 * META_EVENTS) and NOT in `NamedAnalyticsEvent`, so the first-party activity log drops it.
 * Returns whether it was sent: false in an automated context or on an /admin page (the watch
 * then keeps waiting for a later interaction instead of spending the visit).
 */
export function trackEngagedVisit(trigger: EngagedVisitTrigger): boolean {
  try {
    if (!analyticsEnabled()) return false;
    if (trigger !== "time" && trigger !== "interaction") return false;
    const routerPath = routerPathOf(window.location.pathname);
    if (ADMIN_PATH.test(routerPath)) return false;
    const data = { trigger, path: normalisePath(routerPath) };
    send("event", { name: "engaged_visit", data }, { ga4: data });
    return true;
  } catch {
    return false;
  }
}

/** MEASURE-1 B — the six graded surfaces (CLAUDE.md §4a), as `first_graded`'s one data field. */
export type FirstGradedSurface =
  | "check_improve_single"
  | "check_improve_multi"
  | "worksheet"
  | "chapter_test"
  | "full_mock"
  | "quick_practice";

const FIRST_GRADED_SURFACES: ReadonlySet<string> = new Set<FirstGradedSurface>([
  "check_improve_single",
  "check_improve_multi",
  "worksheet",
  "chapter_test",
  "full_mock",
  "quick_practice",
]);

/**
 * MEASURE-1 B — `first_graded`: the first graded result an account ever got. The once-per-account
 * rule lives in firstGraded.ts (`noteFirstGraded`), which is the only caller. Data: `{ surface }`
 * and nothing else (a closed set, checked here). Vercel + GA4 get `{ surface }`; Meta gets the bare
 * custom event `FirstGraded` (META_EVENTS), never a parameter. Not in `NamedAnalyticsEvent`, so
 * the first-party activity log drops it.
 */
export function trackFirstGraded(surface: FirstGradedSurface): void {
  try {
    if (!FIRST_GRADED_SURFACES.has(surface)) return;
    const data = { surface };
    send("event", { name: "first_graded", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
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
 *   practice_graded         ACTIVATION-1 · L4 — a Quick Practice / CBQ practice set was graded
 *                           (the bare name only; once per graded attempt via
 *                           trackPracticeGraded). The CBQ ad's landing is /practice-hub?cbq=1
 *                           and graded practice fired nothing, so that campaign's real use
 *                           was invisible next to check_graded.
 */
export type NamedAnalyticsEvent =
  | "free_check_used_block"
  | "free_check_signup"
  | "free_check_trial_start"
  | "trial_start"
  | "check_question_read"
  | "check_answer_added"
  | "check_graded"
  | "practice_graded"
  | "testimonial_play"
  | "parent_share_click"
  // SOLUTIONS-1 (lane G, D260) — the public NCERT / Exemplar solutions pages: a hint opened, an
  // attempt (an MCQ pick, or a typed answer judged right, wrong or not comparable), the solution
  // unlocked, and a tap on "Check my answer". Bare names, no id, no text, no answer.
  // (No semicolon in this comment: activityClient.test.ts reads this union up to the first one.)
  | "sol_hint"
  | "sol_attempt_mcq"
  | "sol_attempt_typed_right"
  | "sol_attempt_typed_wrong"
  | "sol_attempt_no_verdict"
  | "sol_unlock"
  | "sol_check_start"
  // TRACK-2 — the checkout funnel. Sent with their params by trackBeginCheckout and
  // trackPurchase below, never bare. purchase fires ONLY from PassCheckout's
  // server-verified paid branch.
  | "begin_checkout"
  | "purchase"
  // TRACK-2 — onboarding (Start here) and the scorecard-to-tutor hop, sent with coarse
  // params by trackOnboardingEvent below. No id, no text, no PII.
  | "start_here_shown"
  | "start_here_start"
  | "start_here_graded"
  | "start_here_dismissed"
  | "tutor_from_scorecard"
  // TUTOR-FIX-2 T13 — the first message a student sends in a tutor thread (once per thread).
  | "tutor_first_message"
  // TRIAL-END-1 — the trial-ending Home banner (trial days 5 to 7): shown (once per tab per IST
  // day) and a tap on one of its actions (a two-value cta, never an id or a count).
  | "trial_banner_shown"
  | "trial_banner_click"
  // FEEDBACK-1 — the "help us improve" prompt, FIRST-PARTY names only (moment and reason are
  // inside the name because the activity store keeps names only). Sent by trackFeedbackEvent,
  // which gives the vendors the generic feedback_shown / feedback_dismissed / feedback_reason
  // instead. Never free text.
  | "feedback_shown_paywall"
  | "feedback_dismissed_paywall"
  | "feedback_shown_trial_end"
  | "feedback_dismissed_trial_end"
  | "feedback_paywall_not_tried"
  | "feedback_paywall_ask_parents"
  | "feedback_paywall_price"
  | "feedback_paywall_not_enough_help"
  | "feedback_paywall_boards_far"
  | "feedback_paywall_other"
  | "feedback_trial_end_not_tried"
  | "feedback_trial_end_ask_parents"
  | "feedback_trial_end_price"
  | "feedback_trial_end_not_enough_help"
  | "feedback_trial_end_boards_far"
  | "feedback_trial_end_other"
  // FEEDBACK-1 — the student tapped the 5-minute feedback-call offer (opens WhatsApp only).
  | "feedback_call_tap_paywall"
  | "feedback_call_tap_trial_end"
  // FIRST-FEEDBACK-1 — "Was this useful?" after the first graded scorecard (no call offer).
  | "feedback_shown_first_graded"
  | "feedback_dismissed_first_graded"
  | "feedback_first_graded_yes"
  | "feedback_first_graded_not_really"
  | "feedback_first_graded_too_hard"
  // GUIDE-1 — the Byte-guide A/B: which arm this account is in, once per account per device.
  // The arm itself is a vendor param only (the first-party store keeps names, never values)
  | "guide_variant_assigned"
  // PAYWALL-PAY-1 — a tap on one of the three paywall actions (Pay, Share QR code, Forward
  // link to parents). The vendors get the generic `paywall_action { action, surface }`, the
  // first-party log one name per action (it keeps names only). Sent by trackPaywallAction
  | "paywall_action_pay"
  | "paywall_action_qr"
  | "paywall_action_forward"
  // PARENT-REPORT-1 — the student shared a link to ONE result with a parent. The vendors get
  // `parent_report_shared { kind, method }`, the first-party log the bare name. Sent by
  // trackParentReportShared
  | "parent_report_shared";

export function trackNamedEvent(name: NamedAnalyticsEvent): void {
  send("event", { name });
}

/* ------------------------------------------------------------------------- *
 * TRACK-2 §1.1 — THE CHECKOUT FUNNEL.
 *
 * `begin_checkout` on a signed-in pay tap, before Razorpay opens. `purchase` ONLY from
 * the server-verified `outcome.status === "paid"` branch in PassCheckout.tsx — never on
 * the tap, on Razorpay's callback before verify, on failure, on dismiss, or on an
 * "already active" pass. Once per transaction: a fired id is remembered in memory and
 * in THIS TAB's sessionStorage (`lazytopper.purchaseSent`, studentDataMap.ts), so a
 * reload of the same tab can never count it twice.
 *
 * GA4 gets its recommended ecommerce shape (`currency`, `value`, `items`, and on
 * purchase `transaction_id`); Meta gets `{ value, currency }` only; Vercel gets a flat
 * `{ currency, value, pass }` (custom-event data must be flat) — no transaction id.
 * ------------------------------------------------------------------------- */

export type CheckoutPassType = "month" | "till_boards";

export interface CheckoutDetails {
  passType: CheckoutPassType;
  itemName: string;
  /** Rupees. null when the price cannot be known on the client: the event is sent without a value. */
  valueInr: number | null;
  /**
   * ASK-PARENTS-PAY-1 — who is paying. Absent (every pre-existing call site) means the
   * student's own checkout and the payload is byte-for-byte as before; `"parent"` adds
   * `payer: "parent"` to the Vercel and GA4 params (never to Meta, which gets money only).
   */
  payer?: "parent";
}

const CHECKOUT_CURRENCY = "INR";

function checkoutParams(d: CheckoutDetails): { vercel: Record<string, unknown>; ga4: Record<string, unknown>; meta: Record<string, unknown> } {
  const value = typeof d.valueInr === "number" && Number.isFinite(d.valueInr) && d.valueInr > 0 ? d.valueInr : null;
  const money: Record<string, unknown> = value === null ? { currency: CHECKOUT_CURRENCY } : { currency: CHECKOUT_CURRENCY, value };
  const payer: Record<string, unknown> = d.payer === "parent" ? { payer: "parent" } : {};
  return {
    vercel: { ...money, pass: d.passType, ...payer },
    ga4: { ...money, items: [{ item_id: d.passType, item_name: d.itemName }], ...payer },
    meta: money,
  };
}

export function trackBeginCheckout(details: CheckoutDetails): void {
  try {
    const p = checkoutParams(details);
    send("event", { name: "begin_checkout", data: p.vercel }, { ga4: p.ga4, meta: p.meta });
  } catch {
    /* analytics must never break the page */
  }
}

export const PURCHASE_SENT_KEY = "lazytopper.purchaseSent";
const PURCHASE_SENT_CAP = 20;
const purchaseSentMemory = new Set<string>();

function readPurchaseSent(): string[] {
  try {
    const raw = window.sessionStorage.getItem(PURCHASE_SENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rememberPurchaseSent(transactionId: string): void {
  purchaseSentMemory.add(transactionId);
  try {
    const ids = readPurchaseSent().filter((id) => id !== transactionId);
    ids.push(transactionId);
    window.sessionStorage.setItem(PURCHASE_SENT_KEY, JSON.stringify(ids.slice(-PURCHASE_SENT_CAP)));
  } catch {
    /* the in-memory set still dedupes this page load */
  }
}

/** Once per `transactionId`, ever in this tab. Call ONLY from the server-verified paid branch. */
export function trackPurchase(details: CheckoutDetails & { transactionId: string }): void {
  try {
    const id = details.transactionId;
    if (!id || purchaseSentMemory.has(id) || readPurchaseSent().includes(id)) return;
    rememberPurchaseSent(id);
    const p = checkoutParams(details);
    send("event", { name: "purchase", data: p.vercel }, { ga4: { transaction_id: id, ...p.ga4 }, meta: p.meta });
  } catch {
    /* analytics must never break the page */
  }
}

/** Test seam: forget this page load's fired purchases (sessionStorage is left as it is, as a reload leaves it). */
export function __resetPurchaseMemoryForTests(): void {
  purchaseSentMemory.clear();
}

/**
 * A fresh id for one checkout attempt, made at the pay tap and used as `purchase`'s
 * `transaction_id` if that attempt is verified paid. (BuyOutcome in services/checkout.ts
 * carries neither the Razorpay payment id nor the order id, and that file is outside
 * this lane, so the id is minted here: unique per attempt, so it dedupes exactly.)
 */
export function newCheckoutAttemptId(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return `lt_${c.randomUUID()}`;
    if (c && typeof c.getRandomValues === "function") {
      const bytes = c.getRandomValues(new Uint8Array(16));
      return `lt_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
    }
  } catch {
    /* fall through */
  }
  return `lt_${Date.now().toString(36)}`;
}

/* ------------------------------------------------------------------------- *
 * TRACK-2 §1.2 — ONBOARDING EVENTS (the Start-here lane builds on these names).
 *
 * Coarse params only: a surface, a subject, a board chapter slug, a question type, and
 * two small counts. No id, no text, no PII. Every string is checked against a short
 * slug pattern and dropped if it does not fit, so free text cannot ride along.
 * ------------------------------------------------------------------------- */

export type StartHereSurface = "home" | "practice_hub" | "check_improve";
/** QP-SCORECARD-2 E5 — the FOCUSED first-run surface on a page: same event names, `<page>_focus`. */
export type StartHereFocusSurface = "home_focus" | "practice_hub_focus" | "check_improve_focus";
export type ScorecardSurface = "quick_practice" | "check_improve" | "chapter_test" | "full_mock" | "worksheet";
/** HOME-PENDING-1 — the paper surfaces with an answer upload still waiting. */
export type PendingUploadSurface = "worksheet" | "chapter_test" | "full_mock" | "quick_practice";
/** HOME-PENDING-1 — where the pending list was: the Home action strip or the header bell. */
export type PendingPlacement = "strip" | "bell";

/** ACTIVATION-2 A — which focused first-run surface was shown: absent = the practice picker
 *  (every page before), "check_one" = Check & Improve's "Check one answer" takeover. */
export type StartHereVariant = "check_one";

export interface OnboardingEventParams {
  start_here_shown: { surface: StartHereSurface | StartHereFocusSurface; variant?: StartHereVariant };
  /** START-HERE-ONE-TAP-1 — `mode`: "one_tap" (the ready state's subject button) or "picker"
   *  (the full picker's go). Optional in the type only so older callers stay valid; the card always sends it. */
  start_here_start: { subject: string; chapter: string; qtype: string; mode?: "one_tap" | "picker" };
  start_here_graded: { subject: string; correct: number; total: number };
  start_here_dismissed: { surface: StartHereSurface | StartHereFocusSurface; variant?: StartHereVariant };
  /** HOME-PENDING-1 — the pending-answers list was shown (once per tab per placement: the Home
   *  strip rendered / the header bell's popover opened), with the number waiting. No code, no id. */
  pending_card_shown: { count: number; placement: PendingPlacement };
  /** HOME-PENDING-1 — "Upload answers" tapped: the paper's surface and where, only. */
  pending_upload_tap: { surface: PendingUploadSurface; placement: PendingPlacement };
  tutor_from_scorecard: { surface: ScorecardSurface };
  /** TUTOR-FIX-2 T13 — once per tutor thread: the subject and the board chapter slug only. */
  tutor_first_message: { subject: string; chapter: string };
}

export type OnboardingEvent = keyof OnboardingEventParams;

const ONBOARDING_SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const ONBOARDING_MAX_COUNT = 1000;

function onboardingData(params: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && ONBOARDING_SLUG.test(value)) out[key] = value;
    else if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= ONBOARDING_MAX_COUNT) {
      out[key] = value;
    }
  }
  return out;
}

export function trackOnboardingEvent<E extends OnboardingEvent>(name: E, params: OnboardingEventParams[E]): void {
  // PREVIEW-1 (guide section below): an admin preview session adds nothing to the Start-here funnel.
  if (String(name).startsWith("start_here_") && guidePreviewOnDevice()) return;
  try {
    const data = onboardingData(params as unknown as Record<string, unknown>);
    send("event", { name, data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/* ------------------------------------------------------------------------- *
 * GUIDE-1 — THE BYTE GUIDE A/B (owner ruling 20 Oct 2026).
 *
 * Half of new accounts see Byte in place of the Start-here card (components/guide/
 * guideVariant.ts decides, deterministically per account). The events reuse the onboarding
 * sender above (`trackOnboardingEvent`: coarse slugs and small counts only, no id, no text);
 * their names are declared here by interface merging, so the onboarding section is untouched.
 * None of them is a first-party activity name except `guide_variant_assigned`.
 *
 *   guide_shown     { surface, variant, intent }  — BOTH arms, at the moment Start-here (control)
 *                                                    or Byte (guide) is shown, so both count alike
 *   guide_option    { option, rank, surface }      — a guide option was tapped (rank from 1)
 *   guide_dismissed { surface }                    — the guide was closed (today's dismiss keys)
 *   guide_reopened  { surface }                    — the corner chip reopened it
 *   ziggy_reaction  { band }                       — Ziggy reacted on the first scorecard
 *   mi_voice_shown  { state }                      — MI-VOICE-1: Ziggy/Byte voiced the sidebar
 *                                                    Mistake Intel card (guide arm; once per tab
 *                                                    per state; never under the admin preview)
 *
 * GUIDE-PUBLIC-1 — Byte peeks in on the public notes / topic-hub pages (components/guide/public/).
 * Signed-out visitors are split per DEVICE (localStorage `lazytopper.guidePublicArm`); signed-in
 * students reuse their account arm. Same sanitiser, same rule: coarse slugs only.
 *
 *   guide_public_shown     { page, arm, chapter, signed_in } — BOTH arms, at the same trigger
 *                          moment (trackGuidePublicShown: the sanitiser keeps slugs + counts only,
 *                          so the one boolean is added back explicitly)
 *   guide_public_option    { option, page }       — a peek option was tapped
 *   guide_public_dismissed { page }               — the peek was closed with its ×
 *   GA4 user property `guide_public_arm` + vendor event `guide_public_arm_assigned` once per device
 *   (trackGuidePublicArmAssigned below). All of it is suppressed under the admin preview.
 * ------------------------------------------------------------------------- */

export type GuideVariant = "guide" | "control";

/**
 * PREVIEW-1 — the owner's per-browser guide preview (set only from /admin/students; the reader
 * and writer live in components/guide/guideVariant.ts, which also drops every guide_* event,
 * ziggy_reaction and the arm report). Checked HERE so that EVERY `start_here_*` event — the
 * card's, Byte's quick actions', and `start_here_graded` from the Practice page — is dropped too:
 * a preview session adds nothing to any Start-here funnel. Valid = `{ arm, until }` with `until`
 * in the future; the clock is read only when the key exists. Never removes anything (the guide
 * module owns the key). The literal is pinned equal to GUIDE_PREVIEW_KEY by guidePreview.test.ts.
 */
export const GUIDE_PREVIEW_STORAGE_KEY = "lazytopper.guidePreview";

export function guidePreviewOnDevice(): boolean {
  try {
    const raw = window.localStorage.getItem(GUIDE_PREVIEW_STORAGE_KEY);
    if (raw === null) return false;
    const v = JSON.parse(raw) as { arm?: unknown; until?: unknown } | null;
    return (
      !!v &&
      (v.arm === "guide" || v.arm === "control") &&
      typeof v.until === "number" &&
      Number.isFinite(v.until) &&
      v.until > Date.now()
    );
  } catch {
    return false;
  }
}
export type GuideIntentParam = "cbq" | "chapter" | "important" | "papers" | "check_improve" | "default";
export type ZiggyBand = "full" | "half_plus" | "under_half";
/** MI-VOICE-1 — which Mistake Intel moment the character voiced (components/guide/mi). */
export type MiVoiceState = "no_data" | "thin" | "untyped" | "careless" | "knowledge" | "technique";

export interface OnboardingEventParams {
  guide_shown: { surface: StartHereSurface | StartHereFocusSurface; variant: GuideVariant; intent: GuideIntentParam };
  guide_option: { option: string; rank: number; surface: StartHereSurface | StartHereFocusSurface };
  guide_dismissed: { surface: StartHereSurface | StartHereFocusSurface };
  guide_reopened: { surface: StartHereSurface };
  ziggy_reaction: { band: ZiggyBand };
  mi_voice_shown: { state: MiVoiceState };
  guide_public_shown: { page: GuidePublicPage; arm: GuideVariant; chapter: string; signed_in: boolean };
  guide_public_option: { option: GuidePublicOption; page: GuidePublicPage };
  guide_public_dismissed: { page: GuidePublicPage };
}

/** GUIDE-PUBLIC-1 — the public page Byte peeked in on, and the options of his panel. */
export type GuidePublicPage = "notes" | "topic_hub";
export type GuidePublicOption = "important" | "check_one" | "quick";

/**
 * Once per account per device (guideVariant.ts holds the device marker): the GA4 user property
 * `guide_variant`, then `guide_variant_assigned { variant }` to the vendors and the bare name to
 * the first-party activity log (names only). Never throws.
 */
export function trackGuideVariantAssigned(variant: GuideVariant): void {
  try {
    if (variant !== "guide" && variant !== "control") return;
    if (analyticsEnabled() && !window.location.pathname.startsWith("/admin")) {
      const gtag = resolveGtag();
      if (gtag) gtag("set", "user_properties", { guide_variant: variant });
    }
    const data = { variant };
    send("event", { name: "guide_variant_assigned", data }, { ga4: data }, "guide_variant_assigned");
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * GUIDE-PUBLIC-1 (review F8) — `guide_public_shown { page, arm, chapter, signed_in }`. The three
 * strings ride the onboarding sanitiser exactly as every guide event does; `signed_in` is a
 * boolean, which that sanitiser would drop, so it is re-added here as a real boolean (nothing
 * else can ride along). The caller suppresses it under the admin preview. Never throws.
 */
export function trackGuidePublicShown(params: OnboardingEventParams["guide_public_shown"]): void {
  try {
    const { signed_in, ...rest } = params;
    const data: Record<string, string | number | boolean> = {
      ...onboardingData(rest as unknown as Record<string, unknown>),
      signed_in: signed_in === true,
    };
    send("event", { name: "guide_public_shown", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * GUIDE-PUBLIC-1 — once per DEVICE (the caller fires it only when the device's arm is first
 * assigned): the GA4 user property `guide_public_arm`, then `guide_public_arm_assigned { arm }`
 * to the vendors and the bare name first-party (names only). Never throws.
 */
export function trackGuidePublicArmAssigned(arm: GuideVariant): void {
  try {
    if (arm !== "guide" && arm !== "control") return;
    // PREVIEW-1: a preview session never reports an arm (the caller also checks; belt and braces).
    if (guidePreviewOnDevice()) return;
    if (analyticsEnabled() && !window.location.pathname.startsWith("/admin")) {
      const gtag = resolveGtag();
      if (gtag) gtag("set", "user_properties", { guide_public_arm: arm });
    }
    // NOT a named (first-party) event: that list must equal activityClient's ACTIVITY_EVENTS and
    // the server's (activityClient.test.ts), files outside this lane — and the device arm is set
    // for signed-out visitors, whom the first-party log never records anyway. Vendors only.
    const data = { arm };
    send("event", { name: "guide_public_arm_assigned", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/* ------------------------------------------------------------------------- *
 * MUMMY-1 — Mummy's journey on /for-parents (components/guide/mummy). Same onboarding sender
 * (coarse slugs and small counts only), declared by interface merging like GUIDE-1's names.
 * Vendors only (GA4, Vercel): NOT first-party activity names — that list is mirrored by
 * services/activityClient.ts and the server allowlist, and a signed-out parent is never
 * recorded there anyway. Suppressed under the guide preview (mummyModel.mummyPreviewActive).
 *
 *   mummy_beat { beat }  — a visitor moved the story to beat 1..4 (once per beat per page load)
 *   mummy_tap  {}        — a visitor tapped Mummy
 *   mummy_seen { beat }  — the section first entered the viewport (beat 1; once per page load)
 * ------------------------------------------------------------------------- */

export type MummyBeatNumber = 1 | 2 | 3 | 4;

export interface OnboardingEventParams {
  mummy_beat: { beat: MummyBeatNumber };
  mummy_tap: Record<string, never>;
  mummy_seen: { beat: 1 };
}

/* ------------------------------------------------------------------------- *
 * MOMENTS-1 — Byte & Ziggy moments around the first graded result (components/guide/moments) and
 * the device-wide "Hide mascots" switch (components/guide/mascotsMute.ts). Same onboarding sender,
 * declared by interface merging. Vendors only (GA4, Vercel): NOT first-party activity names (the
 * activityClient list and the server allowlist are untouched). Suppressed under the admin preview
 * (guideVariant.trackGuideEvent).
 *
 *   guide_moment_shown { moment }  — a moment was shown (m2…m11; guide arm only)
 *   guide_moment_click { moment }  — a moment's own button was tapped (M11 "Check a written answer")
 *   mascots_hidden     {}          — "Hide mascots" tapped on this device
 *   mascots_shown      {}          — Undo, or the setting turned them back on
 * ------------------------------------------------------------------------- */

export type GuideMomentId = "m2" | "m3" | "m4" | "m5" | "m6" | "m8" | "m9" | "m10" | "m11";

export interface OnboardingEventParams {
  guide_moment_shown: { moment: GuideMomentId };
  guide_moment_click: { moment: GuideMomentId };
  mascots_hidden: Record<string, never>;
  mascots_shown: Record<string, never>;
}

/** Where on /for-parents the share button was tapped (MUMMY-1 added "journey": beat 4 of Mummy's story). */
export type ParentSharePlacement = "hero" | "footer" | "journey";

/**
 * PARENTS-1 — `parent_share_click`: a parent tapped "Send LazyTopper to my child". The
 * payload is the event name plus a two-value placement, never an id, text or contact.
 * The placement travels as `data`, the shape Vercel's custom events read (see the call
 * shapes above); a top-level `placement` would be dropped. GA4 and the first-party log
 * take the name only (`sendToGa4`, `recordActivity`), and a signed-out parent is never
 * recorded by the latter.
 */
export function trackParentShareClick(placement: ParentSharePlacement): void {
  send("event", { name: "parent_share_click", data: { placement } });
}

/** TRIAL-END-1 — which action on the trial-ending banner was tapped. */
export type TrialBannerCta = "plans" | "check";

/** TRIAL-END-1 — sessionStorage key: the IST day key on which `trial_banner_shown` was last sent in THIS tab. */
export const TRIAL_BANNER_SHOWN_KEY = "lazytopper.trialBannerShown";

/**
 * TRIAL-END-1 — `trial_banner_shown`, at most ONCE per tab per IST day (`dayKey`, from the
 * banner's own IST helper), so a re-render or a reload of the same tab never counts it twice.
 * The payload is the bare event name: no uid, no day number, no counts.
 */
export function trackTrialBannerShown(dayKey: string): void {
  try {
    if (window.sessionStorage.getItem(TRIAL_BANNER_SHOWN_KEY) === dayKey) return;
    window.sessionStorage.setItem(TRIAL_BANNER_SHOWN_KEY, dayKey);
  } catch {
    /* storage blocked: still count it once for this render */
  }
  trackNamedEvent("trial_banner_shown");
}

/**
 * TRIAL-END-1 — `trial_banner_click`: "See plans" or "Check an answer" on the banner. Name plus
 * a two-value cta (the `parent_share_click` shape) — Vercel reads `data`, GA4 its params, and the
 * first-party log takes the name only.
 */
export function trackTrialBannerClick(cta: TrialBannerCta): void {
  try {
    send("event", { name: "trial_banner_click", data: { cta } }, { ga4: { cta } });
  } catch {
    /* analytics must never break the page */
  }
}

/** WA-CONTACT-1 — which WhatsApp contact link was tapped. */
export type WhatsAppContactPlacement = "fab" | "contact_page";

/**
 * WA-CONTACT-1 — `whatsapp_contact_tap`: a visitor tapped a "message us on WhatsApp" link
 * (the floating button, or the /contact page). Name plus a two-value placement, the same
 * shape as `parent_share_click`; never the message, a page id or a contact. Deliberately
 * NOT in `NamedAnalyticsEvent`: it goes to the vendors only, and the first-party activity
 * log (whose allow-list is mirrored by the server) drops it, so no server change is needed.
 */
export function trackWhatsAppContactTap(placement: WhatsAppContactPlacement): void {
  send("event", { name: "whatsapp_contact_tap", data: { placement } });
}

/** PAYWALL-PAY-1 — which of the three paywall actions was tapped. */
export type PaywallAction = "pay" | "qr" | "forward";
/**
 * PAYWALL-PAY-1 — where it was tapped: the Premium lock screen (RequirePremium), the upgrade
 * popup (UpgradeModal), the upgrade sheet (UpgradeSheet), the fair-use limit panel, /pricing,
 * the tutor's server-side Premium / busy card (TutorPage), the trial-paper note
 * (TrialPaperNote) and the More-like-this Premium note (MoreLikeThisPremiumNote).
 */
export type PaywallSurface =
  | "lock"
  | "upgrade_modal"
  | "upgrade_sheet"
  | "usage_limit"
  | "pricing"
  | "tutor"
  | "trial_paper"
  | "more_like_this";

const PAYWALL_ACTIVITY_NAME: Record<PaywallAction, NamedAnalyticsEvent> = {
  pay: "paywall_action_pay",
  qr: "paywall_action_qr",
  forward: "paywall_action_forward",
};

/**
 * PAYWALL-PAY-1 — `paywall_action { action, surface }`: ONE event per tap on "Pay", "Share QR
 * code" or "Forward link to parents". Action + surface ONLY: never the message, the link, its
 * token, a count or a contact. The vendors read `data` (Vercel) / the params (GA4); the
 * first-party log, which keeps names only, records `paywall_action_<action>` (the
 * `activityName` mechanism FEEDBACK-1 added), so the admin board can tell the three apart.
 */
export function trackPaywallAction(action: PaywallAction, surface: PaywallSurface): void {
  try {
    const data = { action, surface };
    send("event", { name: "paywall_action", data }, { ga4: data }, PAYWALL_ACTIVITY_NAME[action]);
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * ASK-PARENTS-PAY-1 — `parent_pay_page_view`: a parent opened a LIVE pay link (the server
 * accepted it). The name plus a one-value surface, never an id or the token. Vendors only
 * (a parent is signed out, so the first-party log never records it, and
 * the name is deliberately NOT in `NamedAnalyticsEvent`). The page's address carries the
 * token in its FRAGMENT, which no vendor receives: GA4 and Vercel get the redacted path
 * (`/pricing`), and Meta sends nothing at all from an address with a hash
 * (`metaAddressIsClean`).
 */
export function trackParentPayPageView(): void {
  try {
    const data = { surface: "pricing" };
    send("event", { name: "parent_pay_page_view", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/** AWAIT-1-PAPERS — the paper surface a reminder was set from, and how. */
export type PaperReminderSurface = "chapter_test" | "full_mock" | "worksheet";
export type PaperReminderKind = "calendar" | "whatsapp";

/**
 * AWAIT-1-PAPERS — `paper_reminder`: a student set a reminder to come back and upload the
 * answers for a downloaded paper (an .ics file, or a WhatsApp self-send link). Surface + kind
 * ONLY: never the paper code, a question id, the deep link or a number. Vendor-only (GA4 /
 * Vercel), like `whatsapp_contact_tap`: NOT in `NamedAnalyticsEvent`, so the first-party
 * activity log drops it and no server change is needed.
 */
export function trackPaperReminder(surface: PaperReminderSurface, kind: PaperReminderKind): void {
  send("event", { name: "paper_reminder", data: { surface, kind } });
}

/** Attempts already counted in THIS page load — a graded attempt is counted once. */
const practiceGradedSent = new Set<string>();

/**
 * ACTIVATION-1 · L4 — `practice_graded`, ONCE per graded practice attempt (the same
 * at-most-once-per-attempt rule as the Check & Improve funnel). `attemptKey` is the set's
 * own id and stays here: the payload is the bare event name, no id, no text, no marks.
 */
export function trackPracticeGraded(attemptKey: string): void {
  if (!attemptKey || practiceGradedSent.has(attemptKey)) return;
  practiceGradedSent.add(attemptKey);
  trackNamedEvent("practice_graded");
}

/** Test seam: forget which attempts were counted. */
export function __resetPracticeGradedForTests(): void {
  practiceGradedSent.clear();
}

/** SHARE-SCORE-1 — how a scorecard was shared: the OS share sheet, or the desktop wa.me link. */
export type ScoreShareMethod = "native" | "whatsapp_link";

/**
 * SHARE-SCORE-1 — `score_share`: a student shared a scorecard image. The surface and the
 * method only; never the score, a code, an id or any text. Vendors only (GA4 / Vercel), like
 * `whatsapp_contact_tap`: deliberately NOT in `NamedAnalyticsEvent`, so the first-party log
 * drops it and no server allow-list change is needed.
 */
export function trackScoreShare(surface: ScorecardSurface, method: ScoreShareMethod): void {
  try {
    const data = { surface, method };
    send("event", { name: "score_share", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/** PARENT-REPORT-1 — where the "Share with parents" button was. */
export type ParentReportPlacement = "me" | "home" | "check_improve";
/** PARENT-REPORT-1 — which honest state the card was in (never a figure). */
export type ParentReportState = "empty" | "activity" | "pattern";

/**
 * PARENT-REPORT-1 — `parent_report_shown`: the weekly parent report card was shown to the
 * student (once per open). Placement + state ONLY: never a number, a name, a chapter or any
 * text. Vendors only (GA4 / Vercel), like `score_share`: NOT in `NamedAnalyticsEvent`, so the
 * first-party log drops it and no server allow-list change is needed.
 */
export function trackParentReportShown(placement: ParentReportPlacement, state: ParentReportState): void {
  try {
    const data = { placement, state };
    send("event", { name: "parent_report_shown", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * PARENT-REPORT-1 — `parent_report_share`: the student actually shared the card (the OS sheet
 * completed, or wa.me opened). Placement + method ONLY, never a cancel or a failure.
 */
export function trackParentReportShare(placement: ParentReportPlacement, method: ScoreShareMethod): void {
  try {
    const data = { placement, method };
    send("event", { name: "parent_report_share", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/** PARENT-REPORT-1 (result link) — was the shared result tap-only or written (never a figure). */
export type ParentResultKind = "objective" | "written";

/**
 * PARENT-REPORT-1 — `parent_report_shared`: the student shared a message that carried a link
 * to ONE result (the OS sheet completed, or wa.me opened). Kind + method ONLY: never the link,
 * its token, a score, a name or any text. Vendors get `{ kind, method }`; the first-party log
 * (signed-in student only) records the bare name — it is in `NamedAnalyticsEvent` and in both
 * activity allowlists.
 */
export function trackParentReportShared(kind: ParentResultKind, method: ScoreShareMethod): void {
  try {
    const data = { kind, method };
    send("event", { name: "parent_report_shared", data }, { ga4: data }, "parent_report_shared");
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * PARENT-REPORT-1 — `parent_report_viewed`: a parent opened a LIVE result link (the server
 * accepted it). Coarse: the kind only, never an id, the token, a score or a name. Vendors only:
 * a parent is signed out, so it is deliberately NOT in `NamedAnalyticsEvent` (the first-party
 * log never records it). The address carries the token in its FRAGMENT, which no vendor
 * receives (GA4 / Vercel get `/u/:token`; Meta sends nothing from an address with a hash).
 */
export function trackParentReportViewed(kind: ParentResultKind): void {
  try {
    const data = { kind };
    send("event", { name: "parent_report_viewed", data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/** FEEDBACK-1 — the two moments the "help us improve" prompt can appear at, plus
 *  FIRST-FEEDBACK-1's `first_graded` ("Was this useful?" after the first graded result). */
export type FeedbackPromptMoment = "paywall" | "trial_end" | "first_graded";
/** FEEDBACK-1 — the six one-tap reason codes, plus FIRST-FEEDBACK-1's three answers. */
export type FeedbackPromptReason =
  | "not_tried"
  | "ask_parents"
  | "price"
  | "not_enough_help"
  | "boards_far"
  | "other"
  | "yes"
  | "not_really"
  | "too_hard";

const FEEDBACK_MOMENT_SET: ReadonlySet<string> = new Set<FeedbackPromptMoment>(["paywall", "trial_end", "first_graded"]);
const FEEDBACK_REASON_SET: ReadonlySet<string> = new Set<FeedbackPromptReason>([
  "not_tried",
  "ask_parents",
  "price",
  "not_enough_help",
  "boards_far",
  "other",
]);
/** FIRST-FEEDBACK-1 — `first_graded` takes ONLY these; the other moments ONLY the six above. */
const FIRST_GRADED_ANSWER_SET: ReadonlySet<string> = new Set<FeedbackPromptReason>(["yes", "not_really", "too_hard"]);

/**
 * FEEDBACK-1 (owner ruling 18 Oct 2026) — the "help us improve" prompt was shown,
 * dismissed, or answered.
 *
 *   Vercel + GA4: `feedback_shown` / `feedback_dismissed` / `feedback_reason`, with data
 *                 `{ moment }` or `{ moment, reason }` — two closed codes, nothing else.
 *   First-party:  one allow-listed NAME carrying both codes (`feedback_shown_paywall`,
 *                 `feedback_trial_end_price`, ...), so the owner can read answers per student.
 *   Meta:         nothing (not in META_EVENTS).
 *
 * ★ TAKES NO TEXT. There is no string parameter a caller could put a student's words in:
 * the moment and reason are checked against closed sets and the call is dropped if either
 * does not match. Free text never reaches a vendor, and the activity store takes none.
 */
export function trackFeedbackEvent(
  kind: "shown" | "dismissed" | "reason" | "call_tap",
  moment: FeedbackPromptMoment,
  reason?: FeedbackPromptReason,
): void {
  try {
    if (!FEEDBACK_MOMENT_SET.has(moment)) return;
    const answers = moment === "first_graded" ? FIRST_GRADED_ANSWER_SET : FEEDBACK_REASON_SET;
    if (kind === "reason" && (!reason || !answers.has(reason))) return;
    // FIRST-FEEDBACK-1 — "Was this useful?" has no call offer, so it has no call_tap name.
    if (kind === "call_tap" && moment === "first_graded") return;
    const data: Record<string, string> = kind === "reason" && reason ? { moment, reason } : { moment };
    // `call_tap`: the student tapped the 5-minute feedback-call offer. Vendors get
    // `feedback_call_tap` + `{ moment }`; first-party gets `feedback_call_tap_<moment>`.
    const vendorName =
      kind === "call_tap"
        ? "feedback_call_tap"
        : kind === "reason"
          ? "feedback_reason"
          : kind === "shown"
            ? "feedback_shown"
            : "feedback_dismissed";
    const activityName = (kind === "reason" ? `feedback_${moment}_${reason}` : `feedback_${kind}_${moment}`) as NamedAnalyticsEvent;
    send("event", { name: vendorName, data }, { ga4: data }, activityName);
  } catch {
    /* analytics must never break the page */
  }
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
