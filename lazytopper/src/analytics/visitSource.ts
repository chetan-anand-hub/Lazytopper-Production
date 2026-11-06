import { getAdditionalUserInfo, type UserCredential } from "firebase/auth";
import { normalisePath } from "./analytics";
import { START_HERE_SUBJECT_HINT_KEY, subjectHintFromLanding } from "../components/startHere/startHereModel";

/**
 * SOURCE-1 — WHERE DID THIS NEW STUDENT COME FROM? (this visit only)
 *
 * The owner pays for YouTube, Search and Meta ads and could not see which campaign each
 * student came from: `analytics.ts` filters gclid / utm_* per hit for GA4 and stores
 * nothing. This keeps the landing source of ONE visit on the device, in this tab, until a
 * NEW account is created, then sends it once to our own server.
 *
 * ★★ OWNER RULING, 12 Oct 2026 13:16 IST (DECISION 107c), recorded verbatim in
 * analytics.ts beside the cookieless ruling: "Source capture yes allowed" — a single-visit
 * source capture is allowed as a narrow exception to the cookieless rule. Its limits, and
 * this module is the only place they are kept:
 *   - tab-scoped `sessionStorage` ONLY — never localStorage, never a cookie, never across
 *     visits (closing the tab drops it);
 *   - coarse fields ONLY (below);
 *   - sent ONCE, at sign-up, to OUR server only (`/api/signup-source`);
 *   - NOTHING goes to any vendor.
 *
 * WHAT IS KEPT: the referrer HOSTNAME (cross-site only), four utm_* values (64 chars,
 * `[A-Za-z0-9_.\-{}]`), the landing PATH (via `normalisePath`: no query, no hash), and
 * booleans — was a `gclid` / `fbclid` / `gbraid` / `wbraid` present. NEVER a click-id VALUE,
 * a full URL, a query string, an email, a phone number, a uid or a device id.
 *
 * ★★ ATTRIB-1 (owner request, 4 Nov 2026): about half of YouTube-ad sign-ups showed as Direct.
 * Three causes, three fixes here:
 *   1. iOS app-campaign clicks carry `gbraid` / `wbraid`, not `gclid` -> kept as booleans too.
 *   2. The first landing in a tab won even when it was untagged (an ad click that bounced
 *      through a redirect, then a plain landing) -> TAGGED BEATS UNTAGGED: an untagged stored
 *      touch is replaced by a later tagged one; a tagged one is never replaced.
 *   3. The in-app browser (YouTube/Instagram) -> system browser hop and the Google sign-in
 *      redirect lose the tab's sessionStorage -> a TAGGED touch is also kept in localStorage
 *      (`LONG_KEEP_KEY`) for 7 days, first tagged touch wins, same allow-listed fields only,
 *      and read at sign-up when the tab has nothing tagged. Deleted when sign-up sends it.
 * The POST also retries once on a network failure or 5xx (never on a 4xx).
 */

/** The one sessionStorage key. Listed under the device-local entry in studentDataMap.ts. */
export const VISIT_SOURCE_KEY = "lazytopper.visitSource";

/** Our own first-party endpoint. */
export const SIGNUP_SOURCE_ENDPOINT = "/api/signup-source";

/**
 * ATTRIB-1: the 7-day localStorage copy of a TAGGED first touch ({ v: VisitSource, exp: ms }).
 * Same coarse fields as the tab copy, nothing else; listed with the device-local entries.
 */
export const LONG_KEEP_KEY = "lazytopper.visitSourceKeep";
export const LONG_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
/** ATTRIB-1: one retry after this pause on a network failure / 5xx. */
const RETRY_DELAY_MS = 1500;

export interface VisitSource {
  ref: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing: string;
  gclid: boolean;
  fbclid: boolean;
  /** ATTRIB-1: present (true) only when the landing carried one; absent otherwise so an older server never sees an unknown key on an untagged visit. */
  gbraid?: boolean;
  wbraid?: boolean;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const UTM_MAX = 64;
const UTM_CHARSET = /^[A-Za-z0-9_.\-{}]+$/;
const HOST_CHARSET = /^[a-z0-9.-]{1,253}$/;
// Must match the server's landing charset (server/routes/signupSource.cjs): a path outside
// it would be refused 400 and the account's whole source silently lost, so it falls back to "/".
const LANDING_CHARSET = /^\/[A-Za-z0-9_\-./:]*$/;

/**
 * ATTRIB-1 (M1, PII): an Indian-mobile-shaped run (10 digits starting 6-9, optionally +91 / 91) is
 * never kept — a parent who pastes a phone number into a tag or a path must not have it persist
 * for 7 days. Digit-bounded, so a 10-11 digit campaign id starting 1-5 is untouched.
 */
const MOBILE_SHAPE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/;

/** Test seam + shared guard: does this text contain a mobile-number-shaped run? */
export function looksLikeMobile(text: string): boolean {
  return MOBILE_SHAPE.test(text);
}

function cleanUtm(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim().slice(0, UTM_MAX);
  if (value.length === 0 || !UTM_CHARSET.test(value) || looksLikeMobile(value)) return null;
  return value;
}

/** A path segment shaped like a phone number becomes ":id" (the rest of the path is kept). */
function redactPhoneSegments(path: string): string {
  return path
    .split("/")
    .map((seg) => {
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        /* keep the raw segment */
      }
      return looksLikeMobile(decoded) || looksLikeMobile(seg) ? ":id" : seg;
    })
    .join("/");
}

function cleanLanding(pathname: string): string {
  const path = redactPhoneSegments(normalisePath(pathname));
  return LANDING_CHARSET.test(path) ? path : "/";
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * What the referrer says about the hop: its HOSTNAME when it is a different site
 * (`cross`), `same` for our own site, `none` for no referrer or one that is not an
 * http(s) address (an app, an email client, junk) — those are a Direct visit, not a hop.
 */
type ReferrerKind = { kind: "none" } | { kind: "same" } | { kind: "cross"; host: string };

function classifyReferrer(referrer: string, ownHost: string): ReferrerKind {
  let host = "";
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return { kind: "none" };
    host = url.hostname.toLowerCase();
  } catch {
    return { kind: "none" };
  }
  if (!HOST_CHARSET.test(host)) return { kind: "none" };
  const own = bareHost(ownHost);
  const theirs = bareHost(host);
  if (own && (theirs === own || theirs.endsWith(`.${own}`))) return { kind: "same" };
  return { kind: "cross", host };
}

/**
 * The coarse source of this landing, or null when there is NOTHING but a same-site
 * navigation (a cross-site referrer, a utm_*, a gclid or an fbclid is "something"; a
 * visit with an empty referrer and no tags is a real "Direct" and IS returned).
 */
export function captureVisitSource(
  location: { pathname: string; search: string },
  referrer: string,
  ownHost: string,
): VisitSource | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(location.search || "");
  } catch {
    params = new URLSearchParams();
  }
  const referrerKind = classifyReferrer(String(referrer || ""), ownHost);
  const ref = referrerKind.kind === "cross" ? referrerKind.host : null;
  const utm = {
    utm_source: cleanUtm(params.get(UTM_KEYS[0])),
    utm_medium: cleanUtm(params.get(UTM_KEYS[1])),
    utm_campaign: cleanUtm(params.get(UTM_KEYS[2])),
    utm_content: cleanUtm(params.get(UTM_KEYS[3])),
  };
  // LOGIN-FIX-1 — `lt_clk` is OUR flag list ("gclid,gbraid"), written only by the in-app ->
  // Chrome sign-in hand-off (handoffSourceParams below): the stored touch keeps click ids as
  // BOOLEANS, never values, so the hop carries the booleans, not a forged id.
  const carried = new Set((params.get(HANDOFF_CLICK_PARAM) ?? "").split(",").map((x) => x.trim()));
  const gclid = (params.get("gclid") ?? "") !== "" || carried.has("gclid");
  const fbclid = (params.get("fbclid") ?? "") !== "" || carried.has("fbclid");
  const gbraid = (params.get("gbraid") ?? "") !== "" || carried.has("gbraid");
  const wbraid = (params.get("wbraid") ?? "") !== "" || carried.has("wbraid");
  const tagged =
    ref !== null || gclid || fbclid || gbraid || wbraid || Object.values(utm).some((v) => v !== null);
  if (referrerKind.kind === "same" && !tagged) return null;
  return {
    ref,
    ...utm,
    landing: cleanLanding(location.pathname),
    gclid,
    fbclid,
    ...(gbraid ? { gbraid: true } : {}),
    ...(wbraid ? { wbraid: true } : {}),
  };
}

/**
 * LOGIN-FIX-1 — the first-party param that carries click-id PRESENCE across the in-app ->
 * Chrome sign-in hop. Not `gclid=` itself: a forged value would be forwarded to GA4 / Google Ads
 * (analytics.ts keeps `gclid` on page_location) and poison their click matching.
 */
export const HANDOFF_CLICK_PARAM = "lt_clk";

/**
 * LOGIN-FIX-1 — the stored first touch, as plain query params for the Chrome hand-off link.
 *
 * Chrome has its own storage, so a sign-up that hops out of the YouTube / Instagram in-app
 * browser arrived "Direct". This returns what this module ALREADY keeps (the tab copy if it is
 * tagged, else the 7-day tagged copy), re-cleaned through the same allow-list: the four utm_*
 * values and the click-id booleans as one `lt_clk` list. On arrival Chrome's own
 * `rememberVisitSourceOnce` captures them like any tagged landing. Nothing else: no referrer
 * host, no landing path, never a click-id value, never anything typed. Empty when nothing is
 * tagged. (`utm_term` is not kept by this module, so it cannot be carried.)
 */
export function handoffSourceParams(): Array<[string, string]> {
  let source: VisitSource | null = null;
  try {
    const tab = sanitiseStored(parseStored(window.sessionStorage.getItem(VISIT_SOURCE_KEY)));
    source = tab && isTaggedSource(tab) ? tab : null;
  } catch {
    source = null;
  }
  if (!source) source = readLongKeep();
  if (!source) return [];
  const out: Array<[string, string]> = [];
  for (const key of UTM_KEYS) {
    const value = cleanUtm(source[key]);
    if (value) out.push([key, value]);
  }
  const clicks = (["gclid", "gbraid", "wbraid", "fbclid"] as const).filter((k) => source![k] === true);
  if (clicks.length) out.push([HANDOFF_CLICK_PARAM, clicks.join(",")]);
  return out;
}

/**
 * ATTRIB-1: is this touch TAGGED — a utm_* or an ad click id? A bare referrer host is NOT a tag
 * (a plain Google/YouTube organic hop, or an in-app browser, still leaves the sign-up "Direct"-ish),
 * so it may be replaced by a later tagged landing in the same tab.
 */
export function isTaggedSource(source: Partial<VisitSource> | null | undefined): boolean {
  if (!source || typeof source !== "object") return false;
  return (
    [source.utm_source, source.utm_medium, source.utm_campaign, source.utm_content].some(
      (v) => typeof v === "string" && v !== "",
    ) ||
    source.gclid === true ||
    source.fbclid === true ||
    source.gbraid === true ||
    source.wbraid === true
  );
}

function parseStored(raw: string | null): VisitSource | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as VisitSource) : null;
  } catch {
    return null;
  }
}

/** Rebuild a stored touch from allow-listed fields only, through the same cleaners as a fresh capture. */
function sanitiseStored(v: unknown): VisitSource | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : null);
  const ref = str(o.ref);
  const landing = str(o.landing);
  return {
    ref: ref !== null && HOST_CHARSET.test(ref) ? ref : null,
    utm_source: cleanUtm(str(o.utm_source)),
    utm_medium: cleanUtm(str(o.utm_medium)),
    utm_campaign: cleanUtm(str(o.utm_campaign)),
    utm_content: cleanUtm(str(o.utm_content)),
    landing: landing !== null && landing.length <= 200 && LANDING_CHARSET.test(landing)
        ? redactPhoneSegments(landing)
        : "/",
    gclid: o.gclid === true,
    fbclid: o.fbclid === true,
    ...(o.gbraid === true ? { gbraid: true } : {}),
    ...(o.wbraid === true ? { wbraid: true } : {}),
  };
}

/** The unexpired 7-day copy, or null. Never throws. Expired entries are removed. */
function readLongKeep(): VisitSource | null {
  try {
    const raw = window.localStorage.getItem(LONG_KEEP_KEY);
    if (raw === null) return null; // no clock read unless a copy exists
    const nowMs = Date.now();
    const entry = JSON.parse(raw) as { v?: unknown; exp?: unknown } | null;
    const exp = entry && typeof entry.exp === "number" ? entry.exp : 0;
    if (!entry || exp <= nowMs || exp > nowMs + LONG_KEEP_MS + 60_000) {
      window.localStorage.removeItem(LONG_KEEP_KEY);
      return null;
    }
    const clean = sanitiseStored(entry.v);
    return clean && isTaggedSource(clean) ? clean : null;
  } catch {
    return null;
  }
}

/** First tagged touch wins for the 7 days: an unexpired tagged copy is never overwritten. */
function rememberLongKeep(captured: VisitSource): void {
  try {
    if (!isTaggedSource(captured)) return;
    if (readLongKeep()) return;
    const nowMs = Date.now();
    window.localStorage.setItem(LONG_KEEP_KEY, JSON.stringify({ v: captured, exp: nowMs + LONG_KEEP_MS }));
  } catch {
    /* blocked storage: the tab copy still works */
  }
}

function clearLongKeep(): void {
  try {
    window.localStorage.removeItem(LONG_KEEP_KEY);
  } catch {
    /* ditto */
  }
}

/**
 * ONE attempt per document load. `document.referrer` does not change as the SPA routes
 * around, so a second attempt after a client-side navigation would pair the landing's
 * referrer with a later page and a query that is long gone.
 */
let attempted = false;

/** Test seam: forget that this document load already tried. */
export function resetVisitSourceAttempt(): void {
  attempted = false;
}

/**
 * START-HERE-1 (D-S1-3) — which subject the landing's ad was about, kept for the "Start here"
 * card's subject pre-pick. SEPARATE from the visit source because that one is deleted at
 * sign-up and its landing is path-only (no query), so it cannot say "cbq=1" or carry a
 * `utm_content` once the account exists. ONE word ("Maths" / "Science"), tab-scoped
 * sessionStorage, written once from the landing (the first hint wins), never sent anywhere.
 * Unknown landing → nothing stored → the card asks.
 */
function rememberStartHereSubjectHint(search: string): void {
  try {
    if (window.sessionStorage.getItem(START_HERE_SUBJECT_HINT_KEY) !== null) return;
    const hint = subjectHintFromLanding(cleanUtm(new URLSearchParams(search || "").get("utm_content")), search);
    if (hint) window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, hint);
  } catch {
    /* blocked storage: the card just asks */
  }
}

/**
 * GUIDE-1 v1.1 (controller ruling) — the landing INTENT Byte orders his options by. A separate
 * tab-scoped key because VISIT_SOURCE_KEY is deleted at sign-up, exactly when a brand-new
 * student first meets Byte. It holds three coarse fields copied from the capture above — the
 * landing PATH (already path-only: no query, no hash) and two utm values — and NEVER a click id,
 * a referrer, a uid or anything typed. Sign-up does not clear it; it ends with the tab. Never sent.
 */
export const GUIDE_INTENT_KEY = "lazytopper.guideIntent";

function rememberGuideIntent(captured: VisitSource): void {
  try {
    const intent = { landing: captured.landing, utm_content: captured.utm_content, utm_campaign: captured.utm_campaign };
    window.sessionStorage.setItem(GUIDE_INTENT_KEY, JSON.stringify(intent));
  } catch {
    /* blocked storage: Byte falls back to his default order */
  }
}

/**
 * Write `sessionStorage[VISIT_SOURCE_KEY]` only if the tab has not captured already.
 * Never throws; storage can be blocked. Defaults read the live page.
 */
export function rememberVisitSourceOnce(
  location: { pathname: string; search: string } = window.location,
  referrer: string = typeof document === "undefined" ? "" : document.referrer,
  ownHost: string = window.location.hostname,
): void {
  if (attempted) return;
  attempted = true;
  rememberStartHereSubjectHint(location.search);
  try {
    const captured = captureVisitSource(location, referrer, ownHost);
    const raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    // A tagged first touch is never replaced. An untagged one (or an unreadable one) yields to a tagged landing.
    const keepStored = raw !== null && isTaggedSource(parseStored(raw));
    if (captured && !keepStored && (raw === null || isTaggedSource(captured))) {
      window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(captured));
      rememberGuideIntent(captured);
    }
    if (captured) rememberLongKeep(captured);
  } catch {
    /* blocked storage: the source simply is not recorded */
  }
}

function takeStoredVisitSource(): string | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    // Delete BEFORE sending: "once" must hold even when two sign-up paths fire together.
    window.sessionStorage.removeItem(VISIT_SOURCE_KEY);
  } catch {
    raw = null;
  }
  // ATTRIB-1: the tab has nothing TAGGED (empty, or an untagged Direct from the return trip) ->
  // fall back to the 7-day copy. Either way the long copy is consumed with the sign-up.
  const long = readLongKeep();
  clearLongKeep();
  if (long && !isTaggedSource(parseStored(raw))) return JSON.stringify(long);
  return raw;
}

function isServerFailure(res: unknown): boolean {
  const status = res && typeof res === "object" ? (res as { status?: unknown }).status : undefined;
  return typeof status === "number" && status >= 500;
}

/**
 * POST the stored source once, with the new account's Bearer token, then the key is gone.
 * Fire-and-forget: a failure never blocks, delays or fails a sign-up. A tab with nothing
 * stored (an older tab, a same-site hop, blocked storage) sends nothing.
 * ATTRIB-1: ONE retry after `retryDelayMs` on a network failure or a 5xx; a 4xx (400/401/409/429)
 * is final and never retried (the server is create-once, so a retry after a lost 204 is harmless).
 */
export function sendVisitSourceOnSignUp(
  getIdToken: () => Promise<string>,
  fetchImpl: (url: string, init: RequestInit) => Promise<unknown> = (url, init) => fetch(url, init),
  retryDelayMs: number = RETRY_DELAY_MS,
): void {
  try {
    const body = takeStoredVisitSource();
    if (body === null) return;
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const init: RequestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body,
          keepalive: true,
        };
        let retry = false;
        try {
          retry = isServerFailure(await fetchImpl(SIGNUP_SOURCE_ENDPOINT, init));
        } catch {
          retry = true;
        }
        if (!retry) return;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        await fetchImpl(SIGNUP_SOURCE_ENDPOINT, init);
      } catch {
        /* a source is never worth a failed sign-up */
      }
    })();
  } catch {
    /* ditto */
  }
}

/**
 * Google / phone sign-in is BOTH doors (new and returning), so this sends only for
 * `isNewUser`. The gate lives in here, wrapped, for the reason trackSignUpIfNew's does:
 * it must never throw out of a login.
 */
export function sendVisitSourceIfNewUser(credential: UserCredential): void {
  try {
    if (getAdditionalUserInfo(credential)?.isNewUser) {
      sendVisitSourceOnSignUp(() => credential.user.getIdToken());
    }
  } catch {
    /* ditto */
  }
}
