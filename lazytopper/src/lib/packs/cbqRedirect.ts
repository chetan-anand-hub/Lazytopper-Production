/**
 * PACKS-TIDY-2 (owner, 11 Nov 2026) - the CBQ Packs' buy block left /packs for its own page, /cbq-packs. A link whose target was
 * that block (`/packs#cbq`: Google Ads, old pricing links) must land on the CBQ offer in ONE step: a client redirect (replace) to
 * /cbq-packs that keeps the subject, the ad click ids / utm_* and `from`. PURE and import-free: the island (contentIsland.ts) and
 * the app (PacksPage) both call it, so the static page and the app redirect the same way.
 */
export const CBQ_REDIRECT_PATH = "/cbq-packs";

/** Query params carried to /cbq-packs (everything else is dropped: /cbq-packs reads nothing else). */
const KEEP = /^(utm_[a-z_]{1,32}|gclid|gbraid|wbraid|fbclid|msclkid|from)$/;

/**
 * The /cbq-packs URL for a /packs location whose hash is `#cbq`, or null (any other path or hash: no redirect). The subject is
 * `?subject=` or `?t=` when it is "maths" / "science" (else none: /cbq-packs shows Maths). Values are re-encoded, never trusted;
 * the result is always a same-site path (no scheme, no host).
 */
export function cbqRedirectTarget(loc: { pathname: string; search: string; hash: string }): string | null {
  if (loc.pathname !== "/packs" || loc.hash.toLowerCase() !== "#cbq") return null;
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(loc.search);
  } catch {
    q = new URLSearchParams();
  }
  const out = new URLSearchParams();
  const subject = [q.get("subject"), q.get("t")].find((s) => s === "maths" || s === "science");
  if (subject) out.set("subject", subject);
  q.forEach((value, key) => {
    if (KEEP.test(key) && !out.has(key) && value.length <= 200) out.set(key, value);
  });
  const search = out.toString();
  return `${CBQ_REDIRECT_PATH}${search ? `?${search}` : ""}`;
}
