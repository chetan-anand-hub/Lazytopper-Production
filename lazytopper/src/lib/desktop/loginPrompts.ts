/**
 * Desktop Level 2 - Reason-aware login prompt copy.
 *
 * This pure mapping keeps the supported reason set easy to scan and
 * preserves the production URL contract: `?reason=...&redirect=...`.
 *
 * Unrecognised reasons fall back to the `login` copy so stale links
 * never produce empty headlines.
 */

export interface LoginPrompt {
  /** Short, reason-distinct chip shown above the headline. */
  chip: string;
  /** Headline rendered above the sign-in widget. */
  headline: string;
  /** One-line sub-copy describing why the user is being asked to sign in. */
  subCopy: string;
  /** Button label used on the primary "continue" affordance, when shown. */
  ctaLabel: string;
}

const PROMPTS: Record<string, LoginPrompt> = {
  "start-trial": {
    chip: "Free trial",
    headline: "Start with a real account",
    subCopy:
      "Sign in to begin the trial path and keep attempts, checked answers, progress, and Mistake Intelligence evidence tied to you.",
    ctaLabel: "Start free trial",
  },
  "login": {
    chip: "Welcome back",
    headline: "Welcome back",
    subCopy:
      "Sign in to return to saved attempts, checked answers, progress, and Mistake Intelligence evidence.",
    ctaLabel: "Resume LazyTopper",
  },
  "start-practice": {
    chip: "Practice",
    headline: "Sign in to start practice",
    subCopy:
      "Practice attempts can be saved and connected to Mistake Intelligence only after sign-in.",
    ctaLabel: "Start practice",
  },
  "start-focused-practice": {
    chip: "Focused practice",
    headline: "Sign in to start focused practice",
    subCopy:
      "Your attempt will be saved and connected to Mistake Intelligence " +
      "so your weak areas surface over time.",
    ctaLabel: "Start focused practice",
  },
  "save-worksheet": {
    chip: "Save worksheet",
    headline: "Save this worksheet",
    subCopy:
      "Sign in so this worksheet can stay connected to your account instead of this device only.",
    ctaLabel: "Save & continue",
  },
  "upload-answers": {
    chip: "Check & Improve",
    headline: "Upload your answers",
    subCopy:
      "Sign in before upload so checked answers can be saved to your learning record.",
    ctaLabel: "Upload & continue",
  },
  "grade-answer": {
    chip: "Check & Improve",
    headline: "Get this answer graded",
    subCopy:
      "Sign in so feedback and mistake evidence can stay connected to your account.",
    ctaLabel: "Grade & continue",
  },
  "check-answer": {
    chip: "Check & Improve",
    headline: "Check your answer",
    subCopy:
      "Sign in so checked answers can be saved as evidence for Mistake Intelligence.",
    ctaLabel: "Check answer",
  },
  "open-progress": {
    chip: "Me / Progress",
    headline: "Open your progress",
    subCopy:
      "Sign in to see progress that belongs to your account, not just this browser.",
    ctaLabel: "Open progress",
  },
  "mistake-aware": {
    chip: "Mistake-aware",
    headline: "Practise on your weak areas",
    subCopy: "Sign in so practice can use saved mistake evidence from your account.",
    ctaLabel: "Open practice",
  },
  "mistake-aware-worksheet": {
    chip: "Mistake-aware worksheet",
    headline: "Generate a mistake-aware worksheet",
    subCopy:
      "Sign in so worksheet generation can use saved mistake evidence from your account.",
    ctaLabel: "Generate worksheet",
  },
  "start-full-mock": {
    chip: "Full mock",
    headline: "Start a full 80-mark mock",
    subCopy:
      "Sign in to attempt and save a full board-style mock.",
    ctaLabel: "Start mock",
  },
  "open-check": {
    chip: "Check & Improve",
    headline: "Check your answer",
    subCopy: "Sign in so checked answers and feedback can be saved to your account.",
    ctaLabel: "Open Check & Improve",
  },
};

/** Default prompt used when `reason` is missing or unrecognised. */
export const DEFAULT_LOGIN_REASON = "login";

/** All reasons this map currently understands, in canonical order. */
export const KNOWN_LOGIN_REASONS: ReadonlyArray<string> = [
  "start-trial",
  "login",
  "start-practice",
  "start-focused-practice",
  "save-worksheet",
  "upload-answers",
  "grade-answer",
  "check-answer",
  "open-progress",
  "mistake-aware",
  "mistake-aware-worksheet",
  "start-full-mock",
  "open-check",
];

/**
 * Resolve reason -> prompt copy. Unknown / missing reasons fall back to
 * the `login` copy so stale links never produce empty UI.
 */
export function getLoginPrompt(reason: string | null | undefined): LoginPrompt {
  if (!reason) return PROMPTS[DEFAULT_LOGIN_REASON];
  return PROMPTS[reason] ?? PROMPTS[DEFAULT_LOGIN_REASON];
}
