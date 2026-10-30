/**
 * ONE-MINUTE-1 — the single-question grade request, built in ONE place for both ways a Check & Improve
 * question becomes "confirmed": the AI's "Read the question" detect, and the ladder's bank seed
 * (a board row whose marks / subject / chapter are known, so the detect call is skipped).
 *
 * This is the object the page hands to `checkSolutionImage` (moved here verbatim from
 * DesktopCheckImprovePage.handleGrade; the keys, their order and their omission rules are unchanged).
 * ladderGradeRequest.test.ts builds the detect-confirmed and the bank-seeded request for the same
 * question and asserts every field the grader reads is equal.
 */
import { buildConfirmedDetection, type ConfirmedDetection } from "../../utils/checkImproveDetection";

export interface GradeAnswerPart {
  imageBase64?: string;
  imageMimeType?: string;
  textAnswer?: string;
}

export interface DetectedObjective {
  objective?: boolean;
  answer?: string | null;
}

export function buildSingleGradeRequest(args: {
  question: string;
  confirmed: Pick<ConfirmedDetection, "subject" | "topicName" | "marks">;
  /** `detectedQuestions?.[0]` — the detect step's read of question 1, absent for a bank seed. */
  firstDetected: DetectedObjective | null | undefined;
  /** True for the signed-out free check (the answer key is a paid-call field only). */
  freeCall: boolean;
  answerPart: GradeAnswerPart;
}) {
  const { question, confirmed, firstDetected, freeCall, answerPart } = args;
  return {
    question,
    subject: confirmed.subject,
    topic: confirmed.topicName,
    marks: confirmed.marks,
    // Keyless objective flag from the detect step — the grader clamps a ≤1-mark
    // objective question to 0/full off the model's binary verdict (never a
    // fraction). Omitted (non-objective) → grading is byte-identical to before.
    ...(firstDetected?.objective === true ? { objective: true } : {}),
    // PR-2 (B9) — the detected answer key for an objective question (paid calls only).
    ...(!freeCall && firstDetected?.objective === true && firstDetected?.answer ? { answer: firstDetected.answer } : {}),
    ...answerPart,
  };
}

/** What the ladder seeds as `confirmed` for a bank row: the SAME builder the detect path uses, fed the row's own metadata. */
export function seedConfirmedFromBank(row: { marks: number; subject: "Maths" | "Science"; topicKey: string; questionText: string }): ConfirmedDetection {
  return buildConfirmedDetection(
    { detectedMarks: row.marks, detectedSubject: row.subject, detectedTopic: row.topicKey, marksSource: "stated" },
    row.questionText,
  );
}
