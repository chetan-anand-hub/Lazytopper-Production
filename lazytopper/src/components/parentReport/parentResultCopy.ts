/**
 * PARENT-REPORT-1 — every string the parent's result page adds, in one place, plus the small
 * decisions (which Mummy line, the date label). Tiny and bank-free: the page imports it;
 * Mummy's drawing code stays in the lazily loaded guide/mummy/mummyChunk.
 *
 * Copy rules (owner, 22 Oct 2026; pinned by ParentResultPage.test.tsx): never the word "Ask",
 * never a price, no "₹".
 */
import type { ParentResultKind } from "./parentResultLink";

/**
 * The `/u/:token` segment that names the parent's result page. A QR hand-off token is 256 random
 * bits and is never this word, so QrAnswerUploadPage can hand this one segment to the page.
 * Kept here (no runtime imports) so the QR page's chunk gains nothing but this string.
 */
export const PARENT_RESULT_SEGMENT = "report";

/** The shared result was tap-only (MCQ / objective) — the owner's EXACT line. */
export const MUMMY_LINE_OBJECTIVE =
  "Have your child write one answer on paper. One photo — and you'll see every step marked the way a CBSE examiner does, and exactly where marks were lost.";

/** The shared result was a written, step-marked one — the owner's EXACT line. */
export const MUMMY_LINE_WRITTEN =
  "This is how a CBSE examiner marks your child's answer — step by step. Every mark lost has a reason your child can fix.";

export const PARENT_RESULT_CTA_LABEL = "See how LazyTopper works";
export const PARENT_RESULT_CTA_HREF = "/for-parents";

export function mummyLineFor(kind: ParentResultKind): string {
  return kind === "objective" ? MUMMY_LINE_OBJECTIVE : MUMMY_LINE_WRITTEN;
}

/** "22 Oct 2026", in India time. */
export function resultDateLabel(ms: number): string {
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(
      new Date(ms),
    );
  } catch {
    return "";
  }
}
