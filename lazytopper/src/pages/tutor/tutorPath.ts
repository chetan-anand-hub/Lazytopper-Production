// src/pages/tutor/tutorPath.ts
// Path builder for the fresh /tutor route. Kept in the tutor's OWN module (not
// lib/desktop/**, which is forbidden to edit) but mirrors the exact grade/subject/
// topicKey encoding used by lib/desktop/navigation.ts so the route table stays
// consistent: `/tutor/${grade}/${subject}/${encodeURIComponent(topicKey)}` with an
// optional `?concept=` (per-row "Stuck?") + source/returnTo for back-nav.

export interface TutorPathInput {
  /** "Maths" | "Science" — the URL subject segment (matches the other desktop routes). */
  subject: "Maths" | "Science";
  /** Topic slug (topics.ts). The tutor page canonicalizes it via resolveCanonicalSlug. */
  topicKey: string;
  /** Defaults to "10" — mirrors navigation.ts. */
  grade?: string;
  /** Sub-topic the student is stuck on (per-row "Stuck?") — pre-loads the tutor. */
  concept?: string;
  /** Origin marker, e.g. "topicHub". */
  source?: string;
  /** Safe in-app URL to return to on "back" (validated by the caller). */
  returnTo?: string;
}

export function buildTutorPath(input: TutorPathInput): string {
  const grade = input.grade || "10";
  const params = new URLSearchParams();
  if (input.concept) params.set("concept", input.concept);
  if (input.source) params.set("source", input.source);
  if (input.returnTo) params.set("returnTo", input.returnTo);
  const query = params.toString();
  const path = `/tutor/${grade}/${encodeURIComponent(input.subject)}/${encodeURIComponent(input.topicKey)}`;
  return query ? `${path}?${query}` : path;
}

/**
 * Reject any non-relative / protocol-bearing redirect (safe-redirect doctrine —
 * mirrors DesktopTopicHubPage.safeInternalReturnTo). Returns the value only when it
 * is a plain in-app path.
 */
export function safeInternalReturnTo(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  return value;
}
