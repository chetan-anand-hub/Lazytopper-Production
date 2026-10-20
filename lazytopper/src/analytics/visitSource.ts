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
 * `[A-Za-z0-9_.\-{}]`), the landing PATH (via `normalisePath`: no query, no hash), and two
 * booleans — was a `gclid` / `fbclid` present. NEVER a click-id VALUE, a full URL, a query
 * string, an email, a uid or a device id.
 */

/** The one sessionStorage key. Listed under the device-local entry in studentDataMap.ts. */
export const VISIT_SOURCE_KEY = "lazytopper.visitSource";

/** Our own first-party endpoint. */
export const SIGNUP_SOURCE_ENDPOINT = "/api/signup-source";

export interface VisitSource {
  ref: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing: string;
  gclid: boolean;
  fbclid: boolean;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const UTM_MAX = 64;
const UTM_CHARSET = /^[A-Za-z0-9_.\-{}]+$/;
const HOST_CHARSET = /^[a-z0-9.-]{1,253}$/;
// Must match the server's landing charset (server/routes/signupSource.cjs): a path outside
// it would be refused 400 and the account's whole source silently lost, so it falls back to "/".
const LANDING_CHARSET = /^\/[A-Za-z0-9_\-./:]*$/;

function cleanUtm(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim().slice(0, UTM_MAX);
  return value.length > 0 && UTM_CHARSET.test(value) ? value : null;
}

function cleanLanding(pathname: string): string {
  const path = normalisePath(pathname);
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
  const gclid = (params.get("gclid") ?? "") !== "";
  const fbclid = (params.get("fbclid") ?? "") !== "";
  const tagged = ref !== null || gclid || fbclid || Object.values(utm).some((v) => v !== null);
  if (referrerKind.kind === "same" && !tagged) return null;
  return { ref, ...utm, landing: cleanLanding(location.pathname), gclid, fbclid };
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
    if (window.sessionStorage.getItem(VISIT_SOURCE_KEY) !== null) return;
    const captured = captureVisitSource(location, referrer, ownHost);
    if (captured) {
      window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(captured));
      rememberGuideIntent(captured);
    }
  } catch {
    /* blocked storage: the source simply is not recorded */
  }
}

function takeStoredVisitSource(): string | null {
  try {
    const raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    // Delete BEFORE sending: "once" must hold even when two sign-up paths fire together.
    window.sessionStorage.removeItem(VISIT_SOURCE_KEY);
    return raw;
  } catch {
    return null;
  }
}

/**
 * POST the stored source once, with the new account's Bearer token, then the key is gone.
 * Fire-and-forget: a failure never blocks, delays or fails a sign-up. A tab with nothing
 * stored (an older tab, a same-site hop, blocked storage) sends nothing.
 */
export function sendVisitSourceOnSignUp(
  getIdToken: () => Promise<string>,
  fetchImpl: (url: string, init: RequestInit) => Promise<unknown> = (url, init) => fetch(url, init),
): void {
  try {
    const body = takeStoredVisitSource();
    if (body === null) return;
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        await fetchImpl(SIGNUP_SOURCE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body,
          keepalive: true,
        });
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
