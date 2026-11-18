// src/pages/tutor/tutorLegacyName.ts
// TUTOR-FIX-1 - the student-facing name of the /check-improve page is "Answer Checker" (owner ruling
// 30 Oct 2026). Tutor replies saved BEFORE the rename still carry the old name in the student's persisted
// thread; this pure rewrite is applied when a tutor turn is DISPLAYED (the stored thread is not touched).
// Same rule as `renameLegacyToolName` in server/routes/tutor.cjs (which cleans text going to / coming from
// the model). Code identifiers, the /check-improve URL and analytics names contain no spaces or ampersand,
// so they are never matched.

export function renameLegacyToolName(text: string): string {
  if (!text) return text;
  return text
    .replace(/\bcheck\s*(?:&amp;|&|and)\s*improve\b/gi, "Answer Checker")
    .replace(/\bC\s?&\s?I\b/g, "Answer Checker");
}
