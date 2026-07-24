/**
 * Guard for router redirect targets that must stay INSIDE the app.
 *
 * Extracted verbatim from Login.tsx's private `isSafeInternalPath` so /sign-up can
 * apply the identical semantics ([FU-SIGNUP-UNSAFE-REDIRECT]). Login.tsx,
 * HighlyProbableQuestions.tsx and BackToParent.tsx still hold their own copies;
 * consolidating those is tracked separately as [FU-SAFEPATH-DUPLICATION].
 *
 * A path is safe only when it is a plain app-internal absolute path: it must start
 * with "/", and must NOT be protocol-relative ("//"), a backslash variant, or carry
 * any URL scheme ("http:", "javascript:", etc.). Anything else resolves to no-redirect
 * at the call site.
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}
