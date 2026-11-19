/**
 * PARENTS-V2-1 (owner, 12 Nov 2026) - the facts and the fixed copy of the rebuilt /for-parents sales page, in one place so the page,
 * its tests and the guards read the same strings. Prices and dates are NOT here: they come from `config/pricing.ts`.
 */

import { VALIDITY_LONG } from "./validity";

/**
 * The Google Business Profile line. UPDATE BY HAND from the Google profile; NEVER INVENT. Read 12 Nov 2026 (owner): 5.0 stars,
 * 3 Google reviews. Shown exactly, never rounded up, never more.
 */
export const GOOGLE_RATING = {
  stars: "5.0",
  reviews: 3,
  url: "https://share.google/pHP4n3fUwZumI5ZlD",
} as const;

export const FP_EYEBROW = "For parents · CBSE Class 10 · Maths and Science";
export const FP_H1 = "Your child’s answers, marked the way a CBSE examiner marks them.";
/** Owner copy change 12 Nov 10:04: "exam-preparation platform", no "on the phone". */
export const FP_LEAD =
  "LazyTopper is a Class 10 exam-preparation platform. Your child writes an answer on paper, takes a photo, and sees exactly where marks were lost, and how to win them back.";
export const FP_CHIPS = ["Built by a teacher", "IIT Kanpur graduate", "Tested with 1,500 students"] as const;
// VALIDITY-FEB27: the long form (config/validity.ts VALIDITY_LONG) + the no-auto-debit promise.
export const FP_ONE_PAYMENT = `${VALIDITY_LONG} No auto-debit.`;
export const FP_PAY_NOTE = "You choose who uses it after paying. No account needed.";
export const FP_FREE_CHECK_LINK = "See it work: check one answer free →";

export const FP_PROOF_TITLE = "See it on the live product";
export interface ProofCard {
  readonly id: "handwritten" | "steps" | "scorecard" | "tutor" | "swajeet";
  readonly caption: string;
  readonly detail: string;
}
export const FP_PROOF: readonly ProofCard[] = [
  { id: "handwritten", caption: "Your child writes on paper", detail: "Then takes one photo of the answer." },
  { id: "steps", caption: "Every step marked, like the board", detail: "½ marks, units, keywords, and how each mark was given." },
  { id: "scorecard", caption: "Knows why marks were lost", detail: "Careless slips apart from real gaps." },
  { id: "tutor", caption: "A tutor that knows the mistake", detail: "Opens on the exact question and explains it step by step." },
  { id: "swajeet", caption: "", detail: "" },
];
export const FP_STUDENT_QUOTE = "Not only were my objectives corrected instantly, but even my subjective answers were graded.";
export const FP_STUDENT_BY = "— Swajeet, Class 10";

export const FP_FOUNDER_EYEBROW = "Built by a teacher · One Size Fits One";
export const FP_FOUNDER_ALT = "Chetan Anand teaching Class 10 science at a whiteboard";
export const FP_FOUNDER_QUOTE =
  "When I taught, students didn’t need one more solution. They needed someone to check what went wrong in their own. They needed doubts cleared the moment they had them, not hours lost on the internet. And only a few could ever reach a teacher like me. LazyTopper is that platform, for every Class 10 student preparing for the boards, anywhere, any time.";
export const FP_FOUNDER_LINE = "Chetan Anand · IIT Kanpur graduate · 10+ years teaching · students to BITS, IITs and NITs";

export const FP_STUDENTS_TITLE = "Shaped by 1,500 students";
export const FP_STUDENTS_BODY = "For 8 months, 1,500 Class 10 students have used every feature. Every feature was improved on their feedback.";
export const FP_OSFO = "Every child gets practice and a tutor built on their own mistakes, not one plan for everyone.";

export const FP_HELPS_TITLE = "How it helps your child";
export const FP_HELPS: readonly { readonly title: string; readonly body: string }[] = [
  { title: "Answers marked like a CBSE examiner", body: "Step by step, with ½ marks, units and keywords." },
  { title: "Knows why marks were lost", body: "Careless slips are told apart from real gaps." },
  // Verified 12 Nov 2026: pages/tutor/TutorPage.tsx LANGUAGES = English, Hindi + 7 more (Tamil, Telugu, Bengali, Kannada, Marathi,
  // Malayalam, Gujarati); the question box invites English, Hindi or Hinglish.
  { title: "A personal tutor that knows your child", body: "English, Hindi, Hinglish or 7 more Indian languages." },
  // "10,000+" is BANK_QUESTIONS_CLAIM (lib/packs/packLabels.ts), pinned to the real bank by bankClaims.test.ts.
  { title: "Board practice, never the same twice", body: "{bank} questions with worked solutions, about half competency-based." },
  { title: "Built for the 2026-27 exam", body: "Follows the 2026-27 CBSE Class 10 syllabus." },
];
export const FP_PILLS = ["Pay once, no auto-debit", "GST invoice by email", "Works on phone or laptop", "Pre-boards start in December"] as const;

export const FP_CBQ_LINE = "Smaller budget? CBQ pack";
export const FP_CBQ_LINK = "See it →";

export const FP_FAQ_SIGNIN_Q = "How does my child sign in after I pay?";
export const FP_FAQ_SIGNIN_A =
  "After paying, choose ‘My child’ and type their WhatsApp number or email. They sign in with it — everything is already there.";
