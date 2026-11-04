/**
 * GRADE-MARKS-1 — the Answer Checker's whole-paper confirm step: every detected question's marks,
 * each editable BEFORE "Grade my answer". The value shown is the value sent: an edit replaces the
 * question's marks in the grade request (DesktopCheckImprovePage `detectedQuestions`). A mark the
 * read guessed (no printed or section-header mark) is flagged "Check: we guessed N" so the student
 * compares it with the paper. Display + the student's own correction only — never a grade.
 *
 * ★ §13: an OBJECTIVE question (MCQ / Assertion-Reason) is read-only — it is a 1-mark, 0-or-full
 * question, and the grader keeps that clamp only while its marks are ≤ 1.
 *
 * Styling is class-based (a scoped <style> block, the FreeCheckPanels convention) — no inline
 * style objects (CLAUDE.md §7). Wraps to any width from 360 px up.
 */
import { useState } from "react";
import type { DetectedQuestion } from "../../ai/aiClient";

/** The range a student can set one question's marks to (whole marks). */
export const PAPER_MARKS_MIN = 1;
export const PAPER_MARKS_MAX = 10;

/** True for an MCQ / Assertion-Reason question: its marks are not editable (§13). */
export function isLockedObjective(q: Pick<DetectedQuestion, "objective">): boolean {
  return q.objective === true;
}

/** The marks this row is graded at: 1 for an objective question (what the server grades), else its own. */
export function gradedMarksOf(q: Pick<DetectedQuestion, "objective" | "marks">): number {
  return isLockedObjective(q) ? 1 : Number(q.marks) || 0;
}

/** True when the read GUESSED this question's marks (nothing printed on it or in its section header). */
export function isGuessedMarks(q: Pick<DetectedQuestion, "marksSource" | "objective">): boolean {
  if (isLockedObjective(q)) return false; // nothing for the student to check or change
  return q.marksSource === "inferred" || q.marksSource === "fallback";
}

/** A typed value as a whole mark in range, else null (the last good value then stands). */
export function parsePaperMarks(raw: string): number | null {
  if (!/^\s*\d+\s*$/.test(raw)) return null;
  const n = Number(raw);
  return n >= PAPER_MARKS_MIN && n <= PAPER_MARKS_MAX ? n : null;
}

const PME_CSS = `
.lt-pme { margin-top: 8px; }
.lt-pme__lead { margin: 0 0 8px; font-size: 12.5px; line-height: 1.5; color: hsl(220, 15%, 42%); }
.lt-pme__list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 6px 10px;
}
.lt-pme__row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px;
  min-width: 0; padding: 4px 6px; border-radius: 8px;
}
.lt-pme__row--guess { background: hsl(40, 90%, 94%); }
.lt-pme__q { font-size: 12.5px; font-weight: 700; color: hsl(220, 25%, 12%); min-width: 30px; }
.lt-pme__input {
  box-sizing: border-box; width: 52px; height: 32px; padding: 0 6px;
  border: 1px solid hsl(220, 18%, 85%); border-radius: 8px; background: #ffffff;
  font: inherit; font-size: 13px; color: hsl(220, 25%, 12%);
}
.lt-pme__input:focus { outline: 2px solid hsl(152, 55%, 45%); outline-offset: 1px; }
.lt-pme__fixed { display: inline-block; width: 52px; font-size: 13px; color: hsl(220, 25%, 12%); }
.lt-pme__unit { font-size: 12px; color: hsl(220, 15%, 42%); }
.lt-pme__flag { flex-basis: 100%; font-size: 11.5px; font-weight: 600; color: hsl(32, 80%, 32%); }
.lt-pme__total { margin: 8px 0 0; font-size: 12.5px; color: hsl(220, 25%, 12%); }
`;

export interface PaperMarksEditorProps {
  questions: DetectedQuestion[];
  /** A valid edit of question `index` (position in `questions`) to `marks`. */
  onMarksChange: (index: number, marks: number) => void;
}

export default function PaperMarksEditor({ questions, onMarksChange }: PaperMarksEditorProps) {
  // What the student is typing, per row, until it is a valid mark (then it is committed upward).
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const total = questions.reduce((s, q) => s + gradedMarksOf(q), 0);
  const guessed = questions.filter(isGuessedMarks).length;
  return (
    <div className="lt-pme" data-testid="paper-marks-editor">
      <style>{PME_CSS}</style>
      <p className="lt-pme__lead">
        Check each question&rsquo;s marks against your paper and change any that are wrong before grading.
        {guessed > 0 ? ` We guessed ${guessed === 1 ? "one" : guessed} where the paper did not show the marks.` : ""}
      </p>
      <ul className="lt-pme__list">
        {questions.map((q, qi) => {
          const guess = isGuessedMarks(q);
          const id = `lt-pme-${qi}`;
          return (
            <li key={`${q.questionNumber}-${qi}`} className={guess ? "lt-pme__row lt-pme__row--guess" : "lt-pme__row"}>
              {isLockedObjective(q) ? (
                <>
                  <span className="lt-pme__q">Q{q.questionNumber}</span>
                  <span className="lt-pme__fixed" data-testid={`paper-marks-fixed-${qi}`}>1</span>
                  <span className="lt-pme__unit">mark · MCQ</span>
                </>
              ) : (
              <>
              <label className="lt-pme__q" htmlFor={id}>Q{q.questionNumber}</label>
              <input
                id={id}
                className="lt-pme__input"
                type="number"
                inputMode="numeric"
                min={PAPER_MARKS_MIN}
                max={PAPER_MARKS_MAX}
                step={1}
                aria-label={`Marks for Q${q.questionNumber}`}
                value={drafts[qi] ?? String(q.marks)}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDrafts((d) => ({ ...d, [qi]: raw }));
                  const n = parsePaperMarks(raw);
                  if (n !== null) onMarksChange(qi, n);
                }}
                onBlur={() =>
                  setDrafts((d) => {
                    const next = { ...d };
                    delete next[qi];
                    return next;
                  })
                }
              />
              <span className="lt-pme__unit">{q.marks === 1 ? "mark" : "marks"}</span>
              </>
              )}
              {guess ? <span className="lt-pme__flag">Check: we guessed {q.marks}</span> : null}
            </li>
          );
        })}
      </ul>
      <p className="lt-pme__total">
        Total: <strong>{total}</strong> {total === 1 ? "mark" : "marks"}
      </p>
    </div>
  );
}
