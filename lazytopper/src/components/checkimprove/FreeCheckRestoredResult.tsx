import { useEffect } from "react";
import { Link } from "react-router-dom";
import { trackNamedEvent } from "../../analytics/analytics";
import { boardPassFoundingLabel, boardPassPriceDisplay } from "../../config/pricing";
import { PACK_PRICE_INR } from "../../services/packs";
import type { PendingFreeCheck } from "../../services/freeCheckClient";
import type { CheckSolutionResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import {
  MISTAKE_TYPE_LABEL,
  effectiveTypeCounts,
  gradeStateCopy,
  groupRows,
  isGradedQuestion,
  splitWithdrawnSteps,
  stepDisplay,
  stepForDisplay,
} from "../../lib/mistakeDisplay";
import { EquationRender } from "../equation";
import { StepAnnotation } from "../results/StepAnnotation";
import { isPacksEntryEnabled } from "../../lib/packs/packEntry";
import { cbqPackHref } from "../../lib/packs/packLinks";

/**
 * ACT-FREECHECK-1 — a signed-out visitor's free answer was graded, they signed up "to keep
 * this", and it was written to their new account (freeCheckReplay). This is the PAYOFF: the
 * same graded result, shown again, read-only, exactly as the grader returned it (marks, the
 * step marking, the mistake types, the examiner note). Nothing here re-grades, estimates or
 * invents: every number and word comes from the stored grade; a part the grade does not carry
 * is left out. Then one honest line to buy, then (by the caller) the next action.
 *
 * Styling is class-based (a scoped <style> block, the FreeCheckPanels convention).
 */

const CSS = `
.lt-fr { box-sizing: border-box; max-width: 640px; margin: 16px auto; padding: 18px 20px; background: #ffffff;
  border: 1px solid hsl(220, 18%, 90%); border-radius: 16px; color: hsl(220, 25%, 12%); font-family: inherit; }
.lt-fr__saved { margin: 0 0 12px; font-size: 0.92rem; font-weight: 700; color: hsl(152, 55%, 28%); }
.lt-fr__head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; }
.lt-fr__score { font-size: 1.3rem; font-weight: 800; color: hsl(220, 45%, 18%); }
.lt-fr__tag { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 0.82rem;
  font-weight: 700; background: hsl(220, 30%, 95%); color: hsl(220, 35%, 28%); border: 1px solid hsl(220, 20%, 88%); }
.lt-fr__q { margin: 14px 0 6px; font-size: 0.95rem; font-weight: 800; }
.lt-fr__eyebrow { margin: 14px 0 6px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: hsl(220, 15%, 42%); }
.lt-fr__steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lt-fr__step { padding: 12px; border-radius: 10px; border: 1px solid hsl(220, 18%, 90%); background: hsl(220, 30%, 98%);
  display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.lt-fr__steprow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.lt-fr__stepno { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: hsl(220, 15%, 42%); }
.lt-fr__chip { display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
  background: hsl(220, 20%, 92%); color: hsl(220, 30%, 28%); }
.lt-fr__chip--ok { background: hsl(150, 40%, 92%); color: hsl(152, 55%, 24%); }
.lt-fr__chip--part { background: hsl(40, 90%, 91%); color: hsl(35, 80%, 26%); }
.lt-fr__chip--bad { background: hsl(0, 80%, 94%); color: hsl(0, 60%, 36%); }
.lt-fr__marks { margin-left: auto; font-size: 0.82rem; color: hsl(220, 15%, 42%); }
.lt-fr__desc { font-size: 0.88rem; font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; }
.lt-fr__work { font-size: 0.9rem; line-height: 1.5; padding: 8px 10px; background: #ffffff; border: 1px solid hsl(220, 18%, 90%);
  border-radius: 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
.lt-fr__fix { font-size: 0.86rem; line-height: 1.5; padding: 8px 10px; background: hsl(150, 35%, 96%); border-radius: 8px;
  white-space: pre-wrap; overflow-wrap: anywhere; }
.lt-fr__note { margin: 0; font-size: 0.9rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.lt-fr__muted { margin: 0; font-size: 0.9rem; line-height: 1.5; color: hsl(220, 15%, 42%); }
.lt-fr__buy { margin-top: 16px; padding-top: 14px; border-top: 1px solid hsl(220, 18%, 90%); display: flex; flex-direction: column; gap: 10px; }
.lt-fr__buyline { margin: 0; font-size: 0.88rem; line-height: 1.5; }
.lt-fr__buylink { display: inline-flex; align-items: center; min-height: 44px; font-weight: 700; color: hsl(152, 55%, 28%);
  text-decoration: none; }
.lt-fr__buylink:hover { text-decoration: underline; }
.lt-fr__buylink:focus-visible { outline: 3px solid hsl(152, 55%, 60%); outline-offset: 2px; }
@media (max-width: 480px) { .lt-fr { margin: 12px 16px; padding: 16px; } .lt-fr__buylink { width: 100%; } }
`;

/** The honest sentence under the result. */
export const FREE_CHECK_RESTORED_COPY = {
  saved: "Saved to your account. This is the same result you just got.",
  /** The stored result could not be read back on this screen (the answer itself is saved). */
  unavailable: "Your answer is saved to your account, but we can't show it again on this screen. Check your next answer below.",
  examinerNote: "Examiner note",
  steps: "Step-by-step marking",
  noSteps: "The grader did not return any step marking for this answer.",
} as const;

/** "₹199" and "₹1,917" come from the catalogue and pricing config, never from literals here. */
export function freeCheckBuyCopy(now: Date | number = Date.now(), packsOn: boolean = isPacksEntryEnabled()) {
  const founding = boardPassFoundingLabel(now);
  return {
    boardPassLine: `To keep every answer marked like this till your boards: Board Pass ${boardPassPriceDisplay(now)}, one payment.${
      founding ? ` ${founding}.` : ""
    }`,
    boardPassLink: `Board Pass ${boardPassPriceDisplay(now)} →`,
    packLine: packsOn
      ? `Want printed practice? Board CBQ Pack ₹${PACK_PRICE_INR.pack_cbq}: a PDF with answer keys, no marking.`
      : null,
    packLink: packsOn ? `CBQ Pack ₹${PACK_PRICE_INR.pack_cbq} →` : null,
  };
}

function marksText(awarded: unknown, total: unknown): string | null {
  const a = Number(awarded);
  const t = Number(total);
  if (!Number.isFinite(a) || !Number.isFinite(t) || t <= 0 || a < 0 || a > t) return null;
  return `${a}/${t} marks`;
}

function StepRows({ grade }: { grade: CheckSolutionResponse | WorksheetQuestionGrade }) {
  const steps = splitWithdrawnSteps(grade.annotatedSteps ?? []).marked;
  if (steps.length === 0) return <p className="lt-fr__muted">{FREE_CHECK_RESTORED_COPY.noSteps}</p>;
  return (
    <ul className="lt-fr__steps">
      {steps.map((raw) => {
        const step = stepForDisplay(raw, grade);
        const display = stepDisplay(step.status, step.mistakeType);
        return (
          <li key={step.stepNumber} className="lt-fr__step" data-testid="free-check-restored-step">
            <div className="lt-fr__steprow">
              <span className="lt-fr__stepno">Step {step.stepNumber}</span>
              <span className={`lt-fr__chip lt-fr__chip--${display.tone}`}>{display.label}</span>
              {step.mistakeType && MISTAKE_TYPE_LABEL[step.mistakeType] && (
                <span className="lt-fr__chip">{MISTAKE_TYPE_LABEL[step.mistakeType]}</span>
              )}
              {!grade.objective && (
                <span className="lt-fr__marks">
                  +{step.marksAwarded}
                  {step.marksDeducted > 0 && display.showDeduction ? ` / −${step.marksDeducted}` : ""}
                </span>
              )}
            </div>
            {step.description && (
              <div className="lt-fr__desc">
                <EquationRender text={step.description} />
              </div>
            )}
            {step.studentWork && (
              <div className="lt-fr__work">
                <EquationRender text={step.studentWork} />
              </div>
            )}
            {step.teacherAnnotation && (
              <StepAnnotation tone={display.tone} consequentialOf={step.consequentialOf} className="lt-stann--screen">
                <EquationRender text={step.teacherAnnotation} />
              </StepAnnotation>
            )}
            {step.correctedWorking && (
              <div className="lt-fr__fix">
                {"✓ "}
                <EquationRender text={step.correctedWorking} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TagRow({ grade }: { grade: CheckSolutionResponse | WorksheetQuestionGrade }) {
  const tags = groupRows(effectiveTypeCounts(grade))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map((t) => (
        <span key={t.group.key} className="lt-fr__tag">{`${t.group.label} ×${t.count}`}</span>
      ))}
    </>
  );
}

function OneQuestion({
  grade,
  title,
}: {
  grade: CheckSolutionResponse | WorksheetQuestionGrade;
  title?: string;
}) {
  const state = gradeStateCopy(grade);
  const marks = marksText(grade.marksAwarded, grade.totalMarks);
  return (
    <section data-testid="free-check-restored-question">
      {title && <h3 className="lt-fr__q">{title}</h3>}
      {!isGradedQuestion(grade) ? (
        <p className="lt-fr__muted">{state ?? FREE_CHECK_RESTORED_COPY.noSteps}</p>
      ) : (
        <>
          <div className="lt-fr__head">
            {marks && <span className="lt-fr__score">{marks}</span>}
            <TagRow grade={grade} />
          </div>
          <div className="lt-fr__eyebrow">{FREE_CHECK_RESTORED_COPY.steps}</div>
          <StepRows grade={grade} />
          {grade.teacherNote && (
            <>
              <div className="lt-fr__eyebrow">{FREE_CHECK_RESTORED_COPY.examinerNote}</div>
              <p className="lt-fr__note">
                <EquationRender text={grade.teacherNote} />
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}

function BuyLine({ subject }: { subject: string | null | undefined }) {
  const copy = freeCheckBuyCopy();
  const onTap = () => trackNamedEvent("free_check_result_restored_buy_click");
  return (
    <div className="lt-fr__buy" data-testid="free-check-restored-buy">
      <p className="lt-fr__buyline">{copy.boardPassLine}</p>
      <Link className="lt-fr__buylink" to="/pricing" onClick={onTap} data-testid="free-check-restored-buy-pass">
        {copy.boardPassLink}
      </Link>
      {copy.packLine && copy.packLink && (
        <>
          <p className="lt-fr__buyline">{copy.packLine}</p>
          <Link className="lt-fr__buylink" to={cbqPackHref(subject)} onClick={onTap} data-testid="free-check-restored-buy-pack">
            {copy.packLink}
          </Link>
        </>
      )}
    </div>
  );
}

/**
 * The saved result, the "it is saved" line and the purchase line. `result` is the grade the
 * replay just wrote (null when it cannot be recovered: then it says so, honestly, and the
 * caller's next action still follows). `showBuy` is false for a student who already holds a
 * paid pass.
 */
export function FreeCheckRestoredResult({ result, showBuy }: { result: PendingFreeCheck | null; showBuy: boolean }) {
  const shown = result !== null;
  useEffect(() => {
    if (shown) trackNamedEvent("free_check_result_restored");
  }, [shown]);

  if (!result) {
    return (
      <div className="lt-fr" data-testid="free-check-restored-unavailable" role="status">
        <style>{CSS}</style>
        <p className="lt-fr__muted">{FREE_CHECK_RESTORED_COPY.unavailable}</p>
      </div>
    );
  }
  return (
    <div className="lt-fr" data-testid="free-check-restored">
      <style>{CSS}</style>
      <p className="lt-fr__saved" role="status">{FREE_CHECK_RESTORED_COPY.saved}</p>
      {result.kind === "single" ? (
        <OneQuestion grade={result.graded} />
      ) : (
        <>
          {marksText(result.response.gradedMarksAwarded, result.response.gradedMarksTotal) && (
            <div className="lt-fr__head">
              <span className="lt-fr__score">
                {marksText(result.response.gradedMarksAwarded, result.response.gradedMarksTotal)}
              </span>
            </div>
          )}
          {(result.response.results ?? []).map((g) => (
            <OneQuestion key={g.qNumber} grade={g} title={`Question ${g.qNumber}`} />
          ))}
        </>
      )}
      {showBuy && <BuyLine subject={result?.subject} />}
    </div>
  );
}
