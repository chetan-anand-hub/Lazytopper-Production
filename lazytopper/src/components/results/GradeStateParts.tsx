/**
 * GradeStateParts — SCORECARD-MI-1 PR-2 (B7/B8). The small, shared pieces every graded surface
 * shows the same way, so one truth reads the same wherever a student meets it:
 *
 *   - `GradeStateNotice`  — a question that was NOT graded says so in the owner's words
 *                           (could not read · option unread · answer does not match). No mark.
 *   - `RubricBlock`       — "How this was marked": the grader's validated value points, shown
 *                           apart from the teacher note (never inside it).
 *   - `WithdrawnWorkBlock`— crossed-out attempts, shown APART and struck, never merged into the
 *                           answer, never marked, never typed.
 *   - `MarksLostLines`    — "Where your marks went" in MARKS for one question or a paper: the
 *                           owner's three groups, then "Not attempted" (never a mistake), then
 *                           "Marks lost, reason not recorded" — parts that sum to the loss.
 *
 * Every word and every decision comes from lib/mistakeDisplay; this file only lays it out.
 * Styling is by class (`lt-gsp__*`), carried in the component's own stylesheet.
 */
import { MathText } from "../question/MathText";
import {
  MARKS_HEADING,
  NOT_ATTEMPTED,
  RUBRIC_HEADING,
  UNTYPED_MARKS_LABEL,
  WITHDRAWN_HEADING,
  gradeStateCopy,
  gradeStateOf,
  marksGroupRows,
  marksWithUnit,
  readRubric,
  splitWithdrawnSteps,
  type GradedQuestionLike,
  type MarksLostByType,
} from "../../lib/mistakeDisplay";

interface StruckStep {
  stepNumber?: number;
  studentWork?: string | null;
  status?: string | null;
  part?: string | null;
}

const GSP_CSS = `
.lt-gsp__state { margin: 8px 0 0; padding: 9px 12px; border-radius: 9px; border-left: 4px solid #9aa4b2; background: #f1f4f7; color: #15233a; font-size: 13px; line-height: 1.5; font-weight: 600; }
.lt-gsp__state--answer-mismatch { border-left-color: #e8930c; background: #fef6e8; }
.lt-gsp__rubric, .lt-gsp__struck, .lt-gsp__marks, .lt-gsp__ng { margin: 10px 0 0; }
.lt-gsp__h { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #5a6573; margin: 0 0 6px; }
.lt-gsp__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.lt-gsp__row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 13px; color: #1d2735; line-height: 1.45; }
.lt-gsp__row--sub { font-size: 12px; color: #5a6573; padding-left: 14px; }
.lt-gsp__row--na, .lt-gsp__row--untyped { color: #4b5563; }
.lt-gsp__mk { white-space: nowrap; font-weight: 600; color: #15233a; }
.lt-gsp__struckwork { font-size: 13px; color: #6b7280; text-decoration: line-through; text-decoration-thickness: 1.5px; }
.lt-gsp__part { font-size: 11px; font-weight: 700; color: #5a6573; margin-right: 6px; text-decoration: none; display: inline-block; }
.lt-gsp__note { font-size: 12px; color: #5a6573; margin: 6px 0 0; }
.lt-gsp__grp { font-size: 12px; color: #5a6573; font-weight: 400; }
/* On a dark (navy) host — the results scorecard. */
.lt-gsp--dark .lt-gsp__h, .lt-gsp--dark .lt-gsp__note, .lt-gsp--dark .lt-gsp__grp, .lt-gsp--dark .lt-gsp__part { color: #8294ad; }
.lt-gsp--dark .lt-gsp__row { color: #e3e9f1; }
.lt-gsp--dark .lt-gsp__row--sub, .lt-gsp--dark .lt-gsp__row--na, .lt-gsp--dark .lt-gsp__row--untyped { color: #a9b8cc; }
.lt-gsp--dark .lt-gsp__mk { color: #fff; }
.lt-gsp--dark .lt-gsp__struckwork { color: #a9b6c8; }
.lt-gsp--dark.lt-gsp__state { background: rgba(148, 163, 184, 0.14); color: #f1f5f9; border-left-color: #8695ac; }
.lt-gsp--dark.lt-gsp__state--answer-mismatch { background: rgba(232, 147, 12, 0.14); border-left-color: #e8b765; }
`;

/** The honest not-graded line for one question, or nothing when it was graded. */
export function GradeStateNotice({ question, dark = false }: { question: GradedQuestionLike | null | undefined; dark?: boolean }) {
  const copy = gradeStateCopy(question);
  if (!copy) return null;
  const state = gradeStateOf(question);
  return (
    <>
      <style>{GSP_CSS}</style>
      <p className={`lt-gsp__state lt-gsp__state--${state}${dark ? " lt-gsp--dark" : ""}`} data-grade-state={state} role="status">
        {copy}
      </p>
    </>
  );
}

/** "How this was marked" — rendered only when the grader returned a valid rubric. */
export function RubricBlock({ rubric, dark = false }: { rubric: unknown; dark?: boolean }) {
  const points = readRubric(rubric);
  if (!points) return null;
  return (
    <div className={`lt-gsp__rubric${dark ? " lt-gsp--dark" : ""}`} data-testid="grade-rubric">
      <style>{GSP_CSS}</style>
      <div className="lt-gsp__h">{RUBRIC_HEADING}</div>
      <ul className="lt-gsp__list">
        {points.map((p, i) => (
          <li key={i} className="lt-gsp__row">
            <span>
              <MathText text={p.point} />
            </span>
            <span className="lt-gsp__mk">{marksWithUnit(p.marks)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Crossed-out attempts, apart and struck. Renders nothing when there are none (every legacy
 *  grade). Pass the question's FULL step list; only the withdrawn ones are drawn here. */
export function WithdrawnWorkBlock({ steps, dark = false }: { steps: ReadonlyArray<StruckStep> | null | undefined; dark?: boolean }) {
  const { withdrawn } = splitWithdrawnSteps(steps ?? []);
  const shown = withdrawn.filter((s) => String(s.studentWork ?? "").trim());
  if (shown.length === 0) return null;
  return (
    <div className={`lt-gsp__struck${dark ? " lt-gsp--dark" : ""}`} data-testid="grade-withdrawn">
      <style>{GSP_CSS}</style>
      <div className="lt-gsp__h">{WITHDRAWN_HEADING}</div>
      <ul className="lt-gsp__list">
        {shown.map((s, i) => (
          <li key={i} className="lt-gsp__row" data-status="withdrawn">
            <span>
              {s.part ? <span className="lt-gsp__part">({s.part})</span> : null}
              <s className="lt-gsp__struckwork">
                <MathText text={String(s.studentWork)} />
              </s>
            </span>
          </li>
        ))}
      </ul>
      <p className="lt-gsp__note">You crossed this out, so it was not marked and is not counted against you.</p>
    </div>
  );
}

/**
 * "Where your marks went", in marks. Each group shows its marks and its member types; then
 * "Not attempted" and "Marks lost, reason not recorded" when they are non-zero. Nothing renders
 * when nothing was lost. `heading` is false where the host already titles the block.
 */
export function MarksLostLines({ marks, heading = true, dark = false }: { marks: MarksLostByType; heading?: boolean; dark?: boolean }) {
  const rows = marksGroupRows(marks).filter((r) => r.marks > 0);
  const anything = rows.length > 0 || marks.unattempted > 0 || marks.untyped > 0;
  if (!anything) return null;
  return (
    <div className={`lt-gsp__marks${dark ? " lt-gsp--dark" : ""}`} data-testid="grade-marks-lost">
      <style>{GSP_CSS}</style>
      {heading && <div className="lt-gsp__h">{MARKS_HEADING}</div>}
      <ul className="lt-gsp__list">
        {rows.map((r) => (
          <li key={r.group.key} data-group={r.group.key}>
            <div className="lt-gsp__row">
              <span>
                {r.group.heading} <span className="lt-gsp__grp">· {r.group.label}</span>
              </span>
              <span className="lt-gsp__mk">{marksWithUnit(r.marks)}</span>
            </div>
            {r.types
              .filter((t) => t.marks > 0)
              .map((t) => (
                <div key={t.type} className="lt-gsp__row lt-gsp__row--sub">
                  <span>{t.label}</span>
                  <span>{marksWithUnit(t.marks)}</span>
                </div>
              ))}
          </li>
        ))}
        {marks.unattempted > 0 && (
          <li className="lt-gsp__row lt-gsp__row--na" data-group="not-attempted">
            <span>{NOT_ATTEMPTED.label} — not a mistake</span>
            <span className="lt-gsp__mk">{marksWithUnit(marks.unattempted)}</span>
          </li>
        )}
        {marks.untyped > 0 && (
          <li className="lt-gsp__row lt-gsp__row--untyped" data-group="untyped">
            <span>{UNTYPED_MARKS_LABEL}</span>
            <span className="lt-gsp__mk">{marksWithUnit(marks.untyped)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * "X of Y graded", with every question that was NOT graded listed by number and its honest
 * state (controller ruling: never folded into the score). Renders nothing when every question
 * was graded.
 */
export function NotGradedList({
  results,
  dark = false,
}: {
  results: ReadonlyArray<GradedQuestionLike & { qNumber: number }>;
  dark?: boolean;
}) {
  const notGraded = results.filter((r) => gradeStateOf(r) !== "graded");
  if (notGraded.length === 0) return null;
  const graded = results.length - notGraded.length;
  return (
    <div className={`lt-gsp__ng${dark ? " lt-gsp--dark" : ""}`} data-testid="not-graded-list">
      <style>{GSP_CSS}</style>
      <div className="lt-gsp__h">
        {graded} of {results.length} graded — the rest are not marked and not scored 0
      </div>
      <ul className="lt-gsp__list">
        {notGraded.map((r, i) => (
          <li key={`${r.qNumber}-${i}`} className="lt-gsp__row" data-grade-state={gradeStateOf(r)}>
            <span>
              <b>Q{r.qNumber}:</b> {gradeStateCopy(r)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
