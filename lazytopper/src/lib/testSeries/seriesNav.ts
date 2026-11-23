/**
 * TS-NAV-1 (owner, 19 Nov 2026) — a student who goes /test-series -> a series paper -> its scorecard -> anywhere else must be
 * able to walk back UP the same chain: child -> the paper / scorecard -> /test-series. Owner rule: every page has a child->parent
 * "Back" plus Home.
 *
 * PURE and light (no bank, no services): the pages, the analysis panel, the upgrade walls and the global Back row (RouteNavBar)
 * all read the same rules from here.
 *
 *   - A SERIES PAPER is `/chapter-test/<grade>/<subject>/<topic>?series=1`, `/full-mock/<grade>/<subject>?paper=<n>` or a focus set
 *     `/full-mock/<grade>/<subject>?focus=FS-M-LA-1` (TS-THEMES-1).
 *   - A link that LEAVES a series paper carries `from=test-series` and `returnTo=<the paper's own path>` (the existing
 *     return-ticket convention). RouteNavBar reads the pair on the page it lands on and points "Back" at that paper.
 *   - On the paper itself Back goes to /test-series.
 *
 * Kill switch: VITE_TS_NAV_DISABLED (any value but "", "0", "false") -> every helper here is inert and today's behaviour returns,
 * byte for byte. NAVIGATION ONLY: nothing here touches grading, pricing, payment or the trial. Safe redirects only: every target
 * is an internal path (one leading slash, no scheme, no "//").
 */
export const TEST_SERIES_NAV_PATH = "/test-series";
export const TS_FROM_PARAM = "from";
export const TS_FROM_VALUE = "test-series";

export function tsNavDisabled(): boolean {
  const v = import.meta.env?.VITE_TS_NAV_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** An internal path only: one leading slash, no scheme, no protocol-relative "//", no backslash or line break. */
export function isSafeInternalPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\r\n]/.test(path);
}

/** Is `pathname` + `search` a Test Series paper (the shape only; the pages decide with their own, stricter checks)? */
export function isSeriesPaperLocation(pathname: string, search: string): boolean {
  if (tsNavDisabled()) return false;
  if (import.meta.env?.VITE_TEST_SERIES_DISABLED === "1") return false;
  const sp = new URLSearchParams(search);
  if (/^\/chapter-test\/[^/]+\/[^/]+\/[^/]+\/?$/.test(pathname)) return sp.get("series") === "1";
  // TS-THEMES-1: a focus set (`?focus=FS-M-LA-1`) is a series paper too (its kill switch is the page's own check).
  if (/^\/full-mock\/[^/]+\/[^/]+\/?$/.test(pathname)) return /^\d{1,2}$/.test(sp.get("paper") ?? "") || /^FS-[MS]-[A-Z]{2}-\d$/.test(sp.get("focus") ?? "");
  return false;
}

/** The paper's own URL (path + query) with the one-shot `review` / `upload` params dropped. */
export function seriesPaperPath(pathname: string, search: string): string {
  const sp = new URLSearchParams(search);
  sp.delete("review");
  sp.delete("upload");
  const q = sp.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/**
 * `to` with `from=test-series` and `returnTo=<paperPath>` merged into its query. An existing `from` or `returnTo` is kept (a page that
 * already names its own way back wins). A non-internal `to` is returned untouched. Inert when the kill switch is set.
 */
export function withSeriesReturn(to: string, paperPath: string): string {
  if (tsNavDisabled() || !isSafeInternalPath(to) || !isSafeInternalPath(paperPath)) return to;
  const hashAt = to.indexOf("#");
  const hash = hashAt >= 0 ? to.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? to.slice(0, hashAt) : to;
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const params = new URLSearchParams(queryAt >= 0 ? beforeHash.slice(queryAt + 1) : "");
  if (!params.has(TS_FROM_PARAM)) params.set(TS_FROM_PARAM, TS_FROM_VALUE);
  if (!params.has("returnTo")) params.set("returnTo", paperPath);
  return `${path}?${params.toString()}${hash}`;
}

/** Tag `to` only when the page the student is on (`pathname` + `search`) is a series paper; otherwise `to` unchanged. */
export function tagWhenSeriesPaper(to: string, pathname: string, search: string): string {
  return isSeriesPaperLocation(pathname, search) ? withSeriesReturn(to, seriesPaperPath(pathname, search)) : to;
}

export interface SeriesBackTarget {
  readonly to: string;
  readonly label: string;
}

/** `/chapter-test/...`, `/full-mock/...` or `/test-series` only: a series return never points anywhere else. */
const SERIES_RETURN_OK = /^\/(chapter-test|full-mock|test-series)(\/|\?|#|$)/;

/**
 * Where Back goes on a page the student reached FROM a series paper (`from=test-series`): the paper in `returnTo` (when it is a
 * safe internal series-side path), else /test-series. Null when the page was not reached that way, or the kill switch is set.
 */
export function seriesBackFromSearch(search: string): SeriesBackTarget | null {
  if (tsNavDisabled()) return null;
  const sp = new URLSearchParams(search);
  if (sp.get(TS_FROM_PARAM) !== TS_FROM_VALUE) return null;
  const raw = sp.get("returnTo");
  if (raw && isSafeInternalPath(raw) && SERIES_RETURN_OK.test(raw)) {
    return raw.startsWith(TEST_SERIES_NAV_PATH) ? { to: raw, label: "Test Series" } : { to: raw, label: "Test paper" };
  }
  return { to: TEST_SERIES_NAV_PATH, label: "Test Series" };
}

/** Where a Practice-hub chooser sends the student back to from a paper it opened (the only non-series return a paper honours). */
export const PRACTICE_HUB_PATH = "/practice-hub";

/**
 * TS-UX-SCORE-1 - `href` with `returnTo=<returnTo>` merged into its query, only when `returnTo` is a safe internal path (an unsafe one
 * returns `href` untouched). An existing `returnTo` on `href` is kept. Used by the Practice-hub chooser so a paper it opens can offer
 * Back to the hub. Navigation only.
 */
export function withReturnTo(href: string, returnTo: unknown): string {
  if (!isSafeInternalPath(returnTo) || !isSafeInternalPath(href)) return href;
  const hashAt = href.indexOf("#");
  const hash = hashAt >= 0 ? href.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const params = new URLSearchParams(queryAt >= 0 ? beforeHash.slice(queryAt + 1) : "");
  if (!params.has("returnTo")) params.set("returnTo", returnTo);
  return `${path}?${params.toString()}${hash}`;
}

/**
 * TS-UX-SCORE-1 - the Back row ON a series paper: a safe internal `returnTo` (a paper opened from the Practice hub) wins, else
 * /test-series as today. The label is the word the pages show after the arrow ("Practice" / "Test Series"). Unsafe or absent -> /test-series.
 */
export function seriesPaperBackTarget(search: string): { to: string; word: string } {
  const raw = new URLSearchParams(search).get("returnTo");
  if (raw && isSafeInternalPath(raw)) {
    if (raw === PRACTICE_HUB_PATH || raw.startsWith(`${PRACTICE_HUB_PATH}?`) || raw.startsWith(`${PRACTICE_HUB_PATH}#`)) return { to: raw, word: "Practice" };
    if (raw === TEST_SERIES_NAV_PATH || raw.startsWith(`${TEST_SERIES_NAV_PATH}?`)) return { to: raw, word: "Test Series" };
  }
  return { to: TEST_SERIES_NAV_PATH, word: "Test Series" };
}
