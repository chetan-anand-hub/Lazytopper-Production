/**
 * META-ATTRIB-1 — the Meta click id, kept in the first-party `_fbc` cookie.
 *
 * Meta's pixel writes `_fbc` itself from `?fbclid=`, but fbevents.js loads late and `/` -> `/welcome` drops the query, so the id
 * is often gone before the library looks. `trackPageview` calls this on the first page view of a load, which runs before any
 * redirect. Format is Meta's own: `fb.1.<creation ms>.<fbclid>`.
 *
 * Limits: only when the URL carries a well-formed `fbclid` and no `_fbc` exists (never overwritten); the value goes ONLY into
 * this cookie (path `/`, 90 days, SameSite=Lax, Secure, domain `.lazytopper.com` on that host, else host-only). Not sent
 * anywhere by this module; no uid, email or phone. NOTE: the 12 Oct 2026 "cookieless" ruling in analytics.ts predates this owner
 * request (Meta ads attribution); the cookie is advertising attribution only.
 */

const FBCLID = /^[A-Za-z0-9_-]{1,512}$/;
const NINETY_DAYS_S = 90 * 24 * 60 * 60;

function hasFbcCookie(): boolean {
  return /(?:^|;\s*)_fbc=/.test(document.cookie || "");
}

export function writeFbcCookieOnce(): void {
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (!fbclid || !FBCLID.test(fbclid) || hasFbcCookie()) return;
    const host = String(window.location.hostname || "").toLowerCase();
    const domain = host === "lazytopper.com" || host.endsWith(".lazytopper.com") ? "; domain=.lazytopper.com" : "";
    document.cookie = `_fbc=fb.1.${Date.now()}.${fbclid}; path=/; max-age=${NINETY_DAYS_S}; SameSite=Lax; Secure${domain}`;
  } catch {
    /* a cookie is never worth a broken page */
  }
}
