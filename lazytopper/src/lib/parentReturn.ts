/**
 * parentReturn — PARENTS-CTA-1 (owner ruling 2026-10-19).
 *
 * `/for-parents` links "Check one answer free" to
 * `/check-improve?from=for_parents&utm_source=for_parents`. A visitor who arrived that way
 * sees a "← Back to parents page" link on /check-improve; nobody else does.
 *
 * The flag is persisted in THIS TAB's sessionStorage, so it survives in-page navigation and
 * a reload that drops the query string (e.g. a sign-in round trip within the tab). It is
 * never written to localStorage and never leaves the device. Every storage access is
 * wrapped: a private window or blocked site data makes the accessor THROW, and then the
 * link simply follows the URL alone.
 *
 * PARENTS-NAV-1 (owner, 20 Oct 2026): EVERY internal link on /for-parents now carries the flag
 * (`withParentFlag`), and the same back link is shown on each page those links reach
 * (`components/parents/ParentReturnLink.tsx`), not only on /check-improve. The link's target is
 * the constant `PARENT_RETURN_TO`, never a URL read from the query.
 *
 * NAVIGATION ONLY. Nothing here reads or changes grading, marks, prompts or the free-check
 * flow.
 */

export const PARENT_RETURN_PARAM = "from";
export const PARENT_RETURN_VALUE = "for_parents";
/** sessionStorage key (this tab only). */
export const PARENT_RETURN_KEY = "lazytopper.parentReturn";
export const PARENT_RETURN_TO = "/for-parents";
export const PARENT_RETURN_LABEL = "← Back to parents page";

/** The two storage methods used; `window.sessionStorage` satisfies it. */
export type ParentReturnStorage = Pick<Storage, "getItem" | "setItem">;

/** `window.sessionStorage`, or null when absent or when merely reading it throws. */
export function tabStorage(): ParentReturnStorage | null {
  try {
    return typeof window !== "undefined" && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Does this query string carry `from=for_parents`? */
export function urlHasParentFlag(search: string): boolean {
  try {
    return new URLSearchParams(search).get(PARENT_RETURN_PARAM) === PARENT_RETURN_VALUE;
  } catch {
    return false;
  }
}

/** Was the flag stored earlier in this tab? False on any storage error. */
export function storedParentFlag(storage: ParentReturnStorage | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(PARENT_RETURN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember the flag for this tab. A storage error is swallowed (the URL still shows the link). */
export function persistParentFlag(storage: ParentReturnStorage | null): void {
  if (!storage) return;
  try {
    storage.setItem(PARENT_RETURN_KEY, "1");
  } catch {
    /* storage blocked: the link still shows while the URL carries the flag */
  }
}

/**
 * Should /check-improve show the back link? True when the URL carries the flag (and then
 * the flag is persisted for the tab), or when this tab stored it earlier.
 */
export function shouldShowParentReturn(search: string, storage: ParentReturnStorage | null): boolean {
  if (urlHasParentFlag(search)) {
    persistParentFlag(storage);
    return true;
  }
  return storedParentFlag(storage);
}

/**
 * PARENTS-NAV-1 — `to` with `from=for_parents` merged into its query string. An existing query
 * is kept (`/cbse/class-10?returnTo=%2Ffor-parents` → `…?returnTo=%2Ffor-parents&from=for_parents`),
 * an existing `from` is replaced rather than duplicated, and a `#hash` stays at the end.
 * For an internal path only; it never builds an absolute URL.
 */
export function withParentFlag(to: string): string {
  const hashAt = to.indexOf("#");
  const hash = hashAt >= 0 ? to.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? to.slice(0, hashAt) : to;
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const params = new URLSearchParams(queryAt >= 0 ? beforeHash.slice(queryAt + 1) : "");
  params.set(PARENT_RETURN_PARAM, PARENT_RETURN_VALUE);
  return `${path}?${params.toString()}${hash}`;
}
