/**
 * A same-origin, app-internal path — the only kind a `?redirect=` / `state.from` may carry.
 * Shared by the sign-in door (Login) and every entry point that links to it (App's mobile
 * header), so the rule has ONE definition. Rejects absolute URLs, protocol-relative `//x`,
 * and any backslash form a browser would normalise into one.
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  // LOGIN-FIX-1 (review) — no control character or whitespace ANYWHERE (e.g. "/\t/evil.com": browsers
  // strip tabs and newlines from URLs, which would turn it into "//evil.com"). A real in-app path
  // never needs a raw one; spaces in a query arrive percent-encoded.
  if (/[\x00-\x20\x7f]/.test(path)) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}
