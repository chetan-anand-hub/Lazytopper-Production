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
  /** MCQ-KEY-TRUST-1 — where detect's key came from: "printed" in the document, or "derived". */
  answerSource?: "printed" | "derived" | null;
}

/**
 * MCQ-KEY-TRUST-1 — the detect key fields of a grade request, shared by BOTH Answer Checker paths
 * (single: buildSingleGradeRequest; multi: DesktopCheckImprovePage.gradeMultiQuestion). A key is
 * sent only for an objective question on a paid call (unchanged, #940 B9), and now always WITH its
 * source. A detect key with no label (a read from before this change) is sent as "derived": only a
 * key printed in the document may override the grader's verdict (server objectiveScoring).
 */
export function detectedKeyFields(
  q: DetectedObjective | null | undefined,
  freeCall: boolean,
): { answer?: string; answerSource?: "printed" | "derived" } {
  if (freeCall || q?.objective !== true || !q?.answer) return {};
  return { answer: q.answer, answerSource: q.answerSource === "printed" ? "printed" : "derived" };
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
    // PR-2 (B9) — the detected answer key for an objective question (paid calls only), with its
    // source (MCQ-KEY-TRUST-1: a "derived" key never overrides the grader's verdict).
    ...detectedKeyFields(firstDetected, freeCall),
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
