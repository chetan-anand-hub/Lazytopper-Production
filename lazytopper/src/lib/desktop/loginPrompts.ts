/**
 * Desktop Level 2 — Reason-aware login prompt copy.
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/LoginGate.tsx
 *   (`REASON_TEXT` map + `?reason=...&redirect=...` URL contract).
 *
 * This is a tiny, pure mapping. Kept separate from `Login.tsx` so the
 * supported reason set is easy to scan in one place and is trivially
 * unit-testable by importing this module.
 *
 * Reasons mirror the canonical list documented in the QA addendum:
 *   start-trial, login, save-worksheet, upload-answers, grade-answer,
 *   open-progress, mistake-aware, mistake-aware-worksheet,
 *   start-full-mock, open-check.
 *
 * Unrecognised reasons fall back to the `login` copy so stale links
 * never produce empty headlines.
 */

export interface LoginPrompt {
  /** Short, reason-distinct chip shown above the headline. */
  chip: string;
  /** Headline rendered above the Clerk sign-in widget. */
  headline: string;
  /** One-line sub-copy describing why the user is being asked to sign in. */
  subCopy: string;
  /** Button label used on the primary "continue" affordance, when shown. */
  ctaLabel: string;
}

const PROMPTS: Record<string, LoginPrompt> = {
  "start-trial": {
    chip: "Free trial",
    headline: "Sign in / Start trial",
    subCopy:
      "Start your free trial to unlock saved attempts and mistake-aware practice.",
    ctaLabel: "Start free trial",
  },
  "login": {
    chip: "Welcome back",
    headline: "Welcome back",
    subCopy: "Sign in to pick up where you left off.",
    ctaLabel: "Resume LazyTopper",
  },
  "save-worksheet": {
    chip: "Save worksheet",
    headline: "Save this worksheet",
    subCopy:
      "Sign in to save and resume worksheets across devices.",
    ctaLabel: "Save & continue",
  },
  "upload-answers": {
    chip: "Check & Improve",
    headline: "Upload your answers",
    subCopy:
      "Sign in to submit a handwritten answer for checking.",
    ctaLabel: "Upload & continue",
  },
  "grade-answer": {
    chip: "Check & Improve",
    headline: "Get this answer graded",
    subCopy:
      "Sign in to receive feedback and a mistake tag.",
    ctaLabel: "Grade & continue",
  },
  "open-progress": {
    chip: "Me · Progress",
    headline: "Open your progress",
    subCopy:
      "Sign in to see your saved attempts and weak areas.",
    ctaLabel: "Open progress",
  },
  "mistake-aware": {
    chip: "Mistake-aware",
    headline: "Practise on your weak areas",
    subCopy: "Sign in to unlock mistake-aware practice.",
    ctaLabel: "Open practice",
  },
  "mistake-aware-worksheet": {
    chip: "Mistake-aware worksheet",
    headline: "Generate a mistake-aware worksheet",
    subCopy:
      "Sign in to build a worksheet from your weak areas.",
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
    subCopy: "Sign in to use Check & Improve.",
    ctaLabel: "Open Check & Improve",
  },
};

/** Default prompt used when `reason` is missing or unrecognised. */
export const DEFAULT_LOGIN_REASON = "login";

/** All reasons this map currently understands, in canonical order. */
export const KNOWN_LOGIN_REASONS: ReadonlyArray<string> = [
  "start-trial",
  "login",
  "save-worksheet",
  "upload-answers",
  "grade-answer",
  "open-progress",
  "mistake-aware",
  "mistake-aware-worksheet",
  "start-full-mock",
  "open-check",
];

/**
 * Resolve reason → prompt copy. Unknown / missing reasons fall back to
 * the `login` copy so stale links never produce empty UI.
 */
export function getLoginPrompt(reason: string | null | undefined): LoginPrompt {
  if (!reason) return PROMPTS[DEFAULT_LOGIN_REASON];
  return PROMPTS[reason] ?? PROMPTS[DEFAULT_LOGIN_REASON];
}
