/**
 * GRADE-MARKS-1 — the paper summary never states a number that can disagree with the marks.
 *
 * The grader's `summary` is written by the model in the SAME reply as the per-question grades —
 * before the server's objective clamp and every other post-step (grading/core.cjs). So a sentence
 * like "You scored 4 out of 7 marks on these objective questions" can contradict the final, clamped
 * marks shown above it (live 4 Nov 2026: the clamped objective marks were 7/13).
 *
 * Rule (display only; the grade is untouched): every sentence of the model summary that makes a
 * numeric score/count claim is removed, and — only when one was removed — replaced by sentences
 * built from the FINAL marks (the response totals and the final per-question rows). A summary with
 * no such claim is returned exactly as written.
 *
 * Used by every surface that renders the model summary: Answer Checker (whole paper) and Worksheet.
 */
import { isGradedQuestion, type GradedQuestionLike } from "../../lib/mistakeDisplay";

/** The final per-question fields this needs (WorksheetQuestionGrade satisfies it). */
export type FinalMarksRow = GradedQuestionLike & {
  totalMarks: number;
  marksAwarded?: number;
  objective?: boolean;
};

export interface FinalMarksSummaryInput {
  summary?: string | null;
  results: FinalMarksRow[];
  gradedMarksAwarded: number;
  gradedMarksTotal: number;
}

const NUMBER_WORD =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|half|all|none|both";
/** A quantity: a digit, or a number word. */
const QUANTITY = new RegExp(`\\d|\\b(?:${NUMBER_WORD})\\b`, "i");
/** A score or count cue. */
const SCORE_CUE =
  /\b(?:marks?|scored?|scoring|out of|points?|percent|correct(?:ly)?|right|wrong|got|lost|earned|secured|full)\b|%|\d\s*\/\s*\d/i;

/** True when a sentence claims a score or a count (a number together with a score cue). */
export function claimsAScore(sentence: string): boolean {
  return QUANTITY.test(sentence) && SCORE_CUE.test(sentence);
}

/** Split into sentences, keeping each sentence's own end punctuation. */
function sentencesOf(text: string): string[] {
  return text.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

const fmt = (n: number) => String(Math.round(n * 2) / 2);
const marksWord = (n: number) => (n === 1 ? "mark" : "marks");

/** The summary to render: the model's prose without any score claim, plus the final marks in words. */
export function finalMarksSummary(input: FinalMarksSummaryInput): string {
  const text = String(input.summary ?? "").trim();
  if (!text) return "";
  const sentences = sentencesOf(text);
  const kept = sentences.filter((s) => !claimsAScore(s));
  if (kept.length === sentences.length) return text;

  const facts: string[] = [];
  if (input.gradedMarksTotal > 0) {
    facts.push(
      `You scored ${fmt(input.gradedMarksAwarded)} out of ${fmt(input.gradedMarksTotal)} ${marksWord(input.gradedMarksTotal)} on the questions we graded.`,
    );
  }
  const objective = input.results.filter((r) => r.objective === true && isGradedQuestion(r));
  if (objective.length > 0) {
    const got = objective.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0);
    const of = objective.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);
    facts.push(`On the objective questions: ${fmt(got)} out of ${fmt(of)} ${marksWord(of)}.`);
  }
  return [...facts, ...kept].join(" ");
}
