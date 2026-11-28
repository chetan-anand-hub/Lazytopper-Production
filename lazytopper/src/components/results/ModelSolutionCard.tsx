/**
 * ModelSolutionCard — AC-SOLUTION-1. "Complete correct solution" on the Answer Checker result.
 *
 * DISPLAY ONLY. It renders the step-marked solution the server already had (`modelSolution`);
 * it never feeds the grade. Honest empty: no `modelSolution` (or no usable step) -> renders
 * nothing, no placeholder.
 *
 * Open when the student lost marks on a graded answer; collapsed ("See the full solution") otherwise.
 *
 * Per-step outcomes (right / wrong) are NOT shown: the grader's annotated steps carry no index or
 * label that points at a step of this solution, and guessing a mapping would be invented data.
 * Instead, when marks were lost, "Your answer vs the full solution" lists the steps the grader
 * itself marked as not fully correct, in the grader's own words.
 */
import { MathText } from "../question/MathText";
import { isGradedQuestion, marksWithUnit, type GradedQuestionLike } from "../../lib/mistakeDisplay";

export interface ModelSolutionStep {
  description?: string;
  working?: string;
  marks?: number;
}

export interface ModelSolutionData {
  steps?: ModelSolutionStep[] | null;
  totalMarks?: number;
}

interface LostStepLike {
  stepNumber?: number;
  description?: string;
  status?: string | null;
  marksDeducted?: number | null;
  teacherAnnotation?: string | null;
  correctedWorking?: string | null;
}

const CSS = `
.lt-msol { margin: 0; border: 1px solid #d5dde8; border-radius: 12px; background: #fff; color: #15233a; min-width: 0; }
.lt-msol > summary { cursor: pointer; padding: 12px 14px; font-weight: 700; font-size: 14px; line-height: 1.4; list-style-position: inside; }
.lt-msol__body { padding: 0 14px 14px; min-width: 0; }
.lt-msol__vs { margin: 0 0 12px; padding: 10px 12px; border-radius: 9px; background: #fef6e8; border-left: 4px solid #e8930c; font-size: 13px; line-height: 1.5; }
.lt-msol__h { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #5a6573; margin: 0 0 6px; }
.lt-msol__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lt-msol__step { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; font-size: 13.5px; line-height: 1.5; min-width: 0; }
.lt-msol__txt { min-width: 0; overflow-wrap: anywhere; }
.lt-msol__desc { font-weight: 600; }
.lt-msol__work { margin-top: 2px; }
.lt-msol__mk { white-space: nowrap; font-weight: 700; color: #0b6b3a; }
.lt-msol__total { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid #e3e9f1; font-weight: 700; font-size: 14px; }
`;

function cleanSteps(m: ModelSolutionData | null | undefined) {
  return (Array.isArray(m?.steps) ? m!.steps! : []).filter(
    (s) => s && (String(s.working ?? "").trim() || String(s.description ?? "").trim()),
  );
}

export function ModelSolutionCard({
  modelSolution,
  question,
  steps: answerSteps,
}: {
  modelSolution: ModelSolutionData | null | undefined;
  /** The graded question (for its marks and grade state). */
  question: GradedQuestionLike & { marksAwarded?: number | null; totalMarks?: number | null };
  /** The grader's annotated steps for this question (read-only; used only for the "where you lost marks" summary). */
  steps?: ReadonlyArray<LostStepLike> | null;
}) {
  const steps = cleanSteps(modelSolution);
  if (steps.length === 0) return null;
  const total = Number(modelSolution?.totalMarks) || steps.reduce((t, s) => t + (Number(s.marks) || 0), 0);
  const lost = isGradedQuestion(question) && (Number(question.marksAwarded) || 0) < (Number(question.totalMarks) || 0);
  const lostSteps = lost
    ? (answerSteps ?? []).filter((s) => s && s.status && s.status !== "correct" && s.status !== "withdrawn")
    : [];
  return (
    <details className="lt-msol" open={lost} data-testid="model-solution" data-open={lost ? "true" : "false"}>
      <style>{CSS}</style>
      <summary>{lost ? "Complete correct solution" : "See the full solution"}</summary>
      <div className="lt-msol__body">
        {lostSteps.length > 0 && (
          <div className="lt-msol__vs" data-testid="model-solution-vs">
            <div className="lt-msol__h">Your answer vs the full solution</div>
            <ul className="lt-msol__list">
              {lostSteps.map((s, i) => (
                <li key={i}>
                  {s.description ? <MathText text={String(s.description)} /> : null}
                  {s.teacherAnnotation ? <> — <MathText text={String(s.teacherAnnotation)} /></> : null}
                  {Number(s.marksDeducted) > 0 ? <> ({marksWithUnit(Number(s.marksDeducted))} lost)</> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ol className="lt-msol__list">
          {steps.map((s, i) => (
            <li key={i} className="lt-msol__step" data-testid="model-solution-step">
              <div className="lt-msol__txt">
                {s.description ? <div className="lt-msol__desc"><MathText text={String(s.description)} /></div> : null}
                {s.working ? <div className="lt-msol__work"><MathText text={String(s.working)} /></div> : null}
              </div>
              <span className="lt-msol__mk">[{marksWithUnit(Number(s.marks) || 0)}]</span>
            </li>
          ))}
        </ol>
        <p className="lt-msol__total">Total: {marksWithUnit(total)}</p>
      </div>
    </details>
  );
}
