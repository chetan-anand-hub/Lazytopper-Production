/**
 * AC-TYPED-1 - the Answer Checker's Grade gate, as pure functions.
 *
 * Old gate: a typed answer needed >= 10 characters, and Grade stayed disabled until the student tapped
 * "Read the question". New gate: any non-empty typed answer counts, and Grade is tappable once there is a
 * question (typed or uploaded) and an answer - an unread question is read first, in the same tap.
 *
 * Kill switch: VITE_AC_TYPED_AUTOREAD_DISABLED=1 restores the old gate (build-time env).
 */

export function isAcTypedAutoreadDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_AC_TYPED_AUTOREAD_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** Does a typed answer count as an answer? */
export function typedAnswerCounts(textAnswer: string): boolean {
  const n = textAnswer.trim().length;
  return isAcTypedAutoreadDisabled() ? n >= 10 : n > 0;
}

/** The exact thing missing when Grade is disabled; null when nothing is missing. */
export function gradeHint(input: {
  confirmed: boolean;
  hasQuestion: boolean;
  hasAnswer: boolean;
  isMultiQuestion: boolean;
  questionCount: number;
  hasAnswerPhoto: boolean;
  hasTypedAnswer: boolean;
  singleQuestionTextMissing: boolean;
}): string | null {
  const disabledSwitch = isAcTypedAutoreadDisabled();
  if (disabledSwitch) {
    if (!input.confirmed) return "Read the question first (step 1)";
    if (!input.isMultiQuestion && input.singleQuestionTextMissing) {
      return "We couldn't read the question's text — type it in step 1 so it can be marked against the right question";
    }
    return "Add an answer (image or text) to continue";
  }
  if (!input.hasQuestion) return "Add the question in step 1 — type it or upload a photo of it";
  if (input.confirmed && input.isMultiQuestion && !input.hasAnswerPhoto) {
    return `This page has ${input.questionCount} questions — upload a photo of your answers to mark them all.`;
  }
  if (input.confirmed && !input.isMultiQuestion && input.singleQuestionTextMissing) {
    return "We couldn't read the question's text — type it in step 1 so it can be marked against the right question";
  }
  if (!input.hasAnswer) return "Add your answer in step 2 — type it or upload a photo";
  return null;
}
