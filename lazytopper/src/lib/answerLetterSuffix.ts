/**
 * TUTOR-KEYS-1 appended " Answer: (X)" to the last solution step of MCQ / assertion-reason rows so the
 * tutor's key-trust check can verify the key. A HINT shown before the student answers must not carry
 * that letter, so pre-answer surfaces strip it.
 */
export function stripAnswerLetter(step: string): string {
  return step.replace(/\s*Answer:\s*\([A-Za-z]\)\s*$/, "");
}
