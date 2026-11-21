import { Link } from "react-router-dom";
import {
  FREE_CHECK_COPY,
  FREE_CHECK_SIGNIN_PATH,
  freeCheckQuestionRange,
  markFreeCheckSigninIntent,
} from "../../services/freeCheckClient";

/**
 * FREECHECK-ONEQ-1 - the signed-out free check marked only the FIRST question. The rest of the page is
 * listed here, ungraded: question number + the question's own text (truncated) + one honest line and the
 * existing sign-up action. No mark, no score, no mistake chip is ever shown for a locked row - it was never
 * sent to the grader. Class-based styling (scoped <style>, the FreeCheckPanels convention).
 */

const CSS = `
.lt-fl { box-sizing: border-box; margin: 16px 0; padding: 16px 18px; background: #ffffff; border: 1px solid hsl(220, 18%, 90%);
  border-radius: 14px; color: hsl(220, 25%, 12%); font-family: inherit; }
.lt-fl__title { margin: 0 0 10px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: hsl(220, 15%, 42%); }
.lt-fl__list { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.lt-fl__row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px;
  border: 1px dashed hsl(220, 18%, 84%); background: hsl(220, 30%, 98%); min-width: 0; }
.lt-fl__q { flex: none; font-size: 0.85rem; font-weight: 800; color: hsl(220, 35%, 28%); }
.lt-fl__text { flex: 1; min-width: 0; font-size: 0.88rem; line-height: 1.45; overflow-wrap: anywhere; color: hsl(220, 20%, 25%); }
.lt-fl__chip { flex: none; display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
  background: hsl(220, 20%, 92%); color: hsl(220, 30%, 28%); }
.lt-fl__line { margin: 0 0 12px; font-size: 0.92rem; font-weight: 600; line-height: 1.5; }
.lt-fl__cta { display: inline-flex; align-items: center; min-height: 44px; padding: 0 18px; border-radius: 10px; font-weight: 700;
  background: hsl(152, 55%, 28%); color: #ffffff; text-decoration: none; }
.lt-fl__cta:focus-visible { outline: 3px solid hsl(152, 55%, 60%); outline-offset: 2px; }
@media (max-width: 480px) { .lt-fl__cta { width: 100%; justify-content: center; } }
`;

export interface LockedQuestion {
  questionNumber: number;
  questionText: string;
}

const MAX_TEXT = 140;
export function truncateQuestionText(text: string, max = MAX_TEXT): string {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function FreeCheckLockedRows({ rows }: { rows: LockedQuestion[] }) {
  if (rows.length === 0) return null;
  const range = freeCheckQuestionRange(rows.map((r) => r.questionNumber));
  return (
    <section className="lt-fl" data-testid="free-check-locked" aria-label={FREE_CHECK_COPY.lockedTitle}>
      <style>{CSS}</style>
      <h3 className="lt-fl__title">{FREE_CHECK_COPY.lockedTitle}</h3>
      <ul className="lt-fl__list">
        {rows.map((r, i) => (
          <li key={i} className="lt-fl__row" data-testid="free-check-locked-row" data-grade-state="not-graded">
            <span className="lt-fl__q">{`Q${r.questionNumber}`}</span>
            <span className="lt-fl__text">{truncateQuestionText(r.questionText)}</span>
            <span className="lt-fl__chip">{FREE_CHECK_COPY.lockedChip}</span>
          </li>
        ))}
      </ul>
      <p className="lt-fl__line" data-testid="free-check-locked-line">
        {FREE_CHECK_COPY.lockedLine(range, rows.length > 1)}
      </p>
      <Link className="lt-fl__cta" to={FREE_CHECK_SIGNIN_PATH} onClick={markFreeCheckSigninIntent} data-testid="free-check-locked-signup">
        {FREE_CHECK_COPY.signUpCta}
      </Link>
    </section>
  );
}

const LINE_CSS = `.lt-fl__pre { font-size: 12px; line-height: 1.5; color: hsl(220, 15%, 42%); }`;

/** FREECHECK-ONEQ-1 - the pre-grade notice, naming the question that WILL be marked. Class-based (CLAUDE.md 7). */
export function FreeCheckOneQuestionLine({ questionNumber }: { questionNumber: number }) {
  return (
    <>
      <style>{LINE_CSS}</style>
      <span data-testid="free-check-oneq-line" className="lt-fl__pre">
        {FREE_CHECK_COPY.oneQuestionPreGrade(questionNumber)}
      </span>
    </>
  );
}
