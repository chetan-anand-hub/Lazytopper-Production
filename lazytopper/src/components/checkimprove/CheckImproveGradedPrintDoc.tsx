import { MathText } from "../question/MathText";
import type {
  CheckSolutionAnnotatedStep,
  CheckSolutionMistakeSummary,
} from "../../ai/aiClient";

/**
 * CheckImproveGradedPrintDoc — the branded GRADED solution sheet for Check &
 * Improve, rendered for BOTH the on-screen "Read on screen" view and the
 * downloadable PDF (the PDF rasterises THIS via the shared html2canvas → jsPDF
 * path in worksheetPdfExport.ts — no new PDF mechanism). Math renders through the
 * shared <MathText> (KaTeX), matching WorksheetGradedPrintDoc.
 *
 * WHY a C&I-specific doc (not WorksheetGradedPrintDoc): the worksheet doc needs a
 * PersistedWorksheet and prints the BANK model answer. Check & Improve has no bank
 * — the questions are detected from the student's own uploaded paper — so this doc
 * prints the STUDENT'S per-step annotation + the corrected working the grader
 * produced (annotatedSteps[].correctedWorking), which IS the corrected solution.
 *
 * HONESTY (hard): every number equals the grade already on screen — a snapshot,
 * never a re-grade. A couldNotRead question is shown "couldn't read — not graded,
 * not scored 0," never folded into a 0.
 *
 * Normalised shape: single-question C&I passes ONE question; multi-question passes
 * one per detected question. Both feed the same doc so the two paths stay
 * consistent (a bridge toward the Universal <ResultsScorecard>).
 */

export interface CiGradedQuestion {
  /** Present for a multi-question paper; omitted for a single-question grade. */
  qNumber?: number;
  questionText?: string;
  totalMarks: number;
  marksAwarded?: number;
  couldNotRead?: boolean;
  annotatedSteps?: CheckSolutionAnnotatedStep[];
  mistakeSummary?: CheckSolutionMistakeSummary;
  teacherNote?: string;
  /** Objective verdict echo — when true the printed per-step mark chip is suppressed
   *  (the marks were zeroed by design; the whole mark is at answer level). */
  objective?: boolean;
}

export interface CheckImproveGradedPrintDocProps {
  /** Nomenclature code — CI-{S}-{TOPIC}-{NN}. */
  code: string;
  /** Friendly title, e.g. "Real Numbers · Check & Improve". */
  name: string;
  /** Sub-line under the title, e.g. "Check & Improve · 3 questions · 12 marks". */
  metaLine?: string;
  questions: CiGradedQuestion[];
  gradedMarksAwarded: number;
  gradedMarksTotal: number;
  pendingCount: number;
  /** Product-voice coaching footer (derived from counts — never raw model prose). */
  coaching: string;
}

type Tone = "full" | "part" | "zero" | "pend";

function toneFor(q: CiGradedQuestion): Tone {
  if (q.couldNotRead) return "pend";
  const awarded = Number(q.marksAwarded) || 0;
  const total = Number(q.totalMarks) || 0;
  if (total > 0 && awarded >= total) return "full";
  if (awarded <= 0) return "zero";
  return "part";
}

function markPill(q: CiGradedQuestion): string {
  if (q.couldNotRead) return "pending";
  return `${q.marksAwarded ?? 0} / ${q.totalMarks}`;
}

const STEP_TONE: Record<string, string> = {
  correct: "ok",
  partial: "part",
  incorrect: "bad",
  missing: "bad",
};

const STEP_LABEL: Record<string, string> = {
  correct: "Correct",
  partial: "Partial",
  incorrect: "Incorrect",
  missing: "Missing",
};

const MISTAKE_LABEL: Record<string, string> = {
  conceptual: "Concept gap",
  calculation: "Calculation",
  silly: "Careless slip",
  presentation: "Presentation",
};

/** Product-voice coaching line, derived from the counts already on screen. */
export function buildCiCoaching(args: {
  gradedMarksAwarded: number;
  gradedMarksTotal: number;
  knowledge: number;
  careless: number;
  pendingCount: number;
}): string {
  const { gradedMarksAwarded, gradedMarksTotal, knowledge, careless, pendingCount } = args;
  const parts: string[] = [];
  if (gradedMarksTotal > 0) {
    parts.push(`You scored ${gradedMarksAwarded} of ${gradedMarksTotal} on the work we could read.`);
  }
  // NOTE: `knowledge`/`careless` are COUNTS of flagged mistakes (not marks) — they
  // must never be phrased as "N marks" (that would invent an accuracy figure). Match
  // the header chips ("N knowledge gaps" / "N careless slips").
  if (knowledge > 0 && careless > 0) {
    parts.push(
      `${knowledge} knowledge gap${knowledge === 1 ? "" : "s"} (revise the method) and ${careless} careless slip${careless === 1 ? "" : "s"} (slow down and show every step) cost you marks.`,
    );
  } else if (knowledge > 0) {
    parts.push(
      `${knowledge} knowledge gap${knowledge === 1 ? "" : "s"} cost you marks — revise the underlying method, then re-attempt.`,
    );
  } else if (careless > 0) {
    parts.push(
      `${careless} careless slip${careless === 1 ? "" : "s"} cost you marks — the method is there; show every step and check the final line.`,
    );
  } else {
    parts.push("Clean work — keep showing every step so an examiner can award full method marks.");
  }
  if (pendingCount > 0) {
    parts.push(
      `${pendingCount} page${pendingCount === 1 ? "" : "s"} couldn't be read — re-upload a clearer photo for a complete picture.`,
    );
  }
  return parts.join(" ");
}

export function CheckImproveGradedPrintDoc({
  code,
  name,
  metaLine,
  questions,
  gradedMarksAwarded,
  gradedMarksTotal,
  pendingCount,
  coaching,
}: CheckImproveGradedPrintDocProps) {
  const agg = questions.reduce(
    (a, q) => {
      if (q.couldNotRead || !q.mistakeSummary) return a;
      a.conceptual += Number(q.mistakeSummary.conceptual) || 0;
      a.calculation += Number(q.mistakeSummary.calculation) || 0;
      a.silly += Number(q.mistakeSummary.silly) || 0;
      a.presentation += Number(q.mistakeSummary.presentation) || 0;
      return a;
    },
    { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  );
  const knowledge = agg.conceptual + agg.calculation;
  const careless = agg.silly + agg.presentation;

  return (
    <div className="lt-cigp">
      <style>{CIGP_CSS}</style>

      <div className="lt-cigp__head">
        <div className="lt-cigp__brand">
          <span className="lt-cigp__logo">LT</span>
          <span>
            <span className="lt-cigp__nm">LazyTopper</span>
            <span className="lt-cigp__tg">CBSE · CLASS 10 · CHECK &amp; IMPROVE</span>
          </span>
        </div>
        <div className="lt-cigp__meta">
          <b>{name}</b>
          <span>{code}</span>
          {metaLine && <span>{metaLine}</span>}
        </div>
      </div>

      <div className="lt-cigp__body">
        {/* Score hero */}
        <div className="lt-cigp__hero">
          <div className="lt-cigp__scorebox">
            <div className="lt-cigp__scoren">
              {gradedMarksAwarded}
              <span className="lt-cigp__scoreden"> / {gradedMarksTotal}</span>
            </div>
            <div className="lt-cigp__scorel">MARKS GRADED</div>
          </div>
          <div className="lt-cigp__heroright">
            {pendingCount > 0 ? (
              <div className="lt-cigp__pending">
                <b>{pendingCount} {pendingCount === 1 ? "page" : "pages"} pending</b> — couldn&rsquo;t be read
                clearly. <b>Not</b> graded and <b>not</b> scored 0. Re-upload a clearer photo to grade
                {pendingCount === 1 ? " it" : " them"}.
              </div>
            ) : (
              <div className="lt-cigp__pending lt-cigp__pending--clean">
                All answers read and graded.
              </div>
            )}
            {(knowledge > 0 || careless > 0) && (
              <div className="lt-cigp__chips">
                {knowledge > 0 && (
                  <span className="lt-cigp__chip lt-cigp__chip--con">
                    {knowledge} {knowledge === 1 ? "knowledge gap" : "knowledge gaps"}
                  </span>
                )}
                {careless > 0 && (
                  <span className="lt-cigp__chip lt-cigp__chip--care">
                    {careless} careless {careless === 1 ? "slip" : "slips"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lt-cigp__legend">
          <span><i className="lt-cigp__dot lt-cigp__dot--ok" />correct</span>
          <span><i className="lt-cigp__dot lt-cigp__dot--part" />partial</span>
          <span><i className="lt-cigp__dot lt-cigp__dot--bad" />lost</span>
          <span><i className="lt-cigp__dot lt-cigp__dot--pend" />pending</span>
        </div>

        {/* Per-question blocks */}
        {questions.map((q, qi) => {
          const tone = toneFor(q);
          const label = q.qNumber != null ? `Q${q.qNumber}` : "Q";
          if (q.couldNotRead) {
            return (
              <div key={qi} className="lt-cigp__q lt-cigp__q--pending">
                <div className="lt-cigp__qtop">
                  <span className="lt-cigp__qn">{q.qNumber ?? "–"}</span>
                  <span className="lt-cigp__qmeta">{q.totalMarks} mark{q.totalMarks === 1 ? "" : "s"}</span>
                  <span className="lt-cigp__qmk lt-cigp__qmk--pend">pending</span>
                </div>
                {q.questionText && (
                  <div className="lt-cigp__qtext"><MathText text={q.questionText} /></div>
                )}
                <div className="lt-cigp__pendnote">
                  ⚠ This page couldn&rsquo;t be read clearly — <b>not graded, not scored 0</b>. Re-upload a clearer photo of {label} to grade it.
                </div>
              </div>
            );
          }
          const steps = q.annotatedSteps ?? [];
          return (
            <div key={qi} className="lt-cigp__q">
              <div className="lt-cigp__qtop">
                <span className="lt-cigp__qn">{q.qNumber ?? "–"}</span>
                <span className="lt-cigp__qmeta">{q.totalMarks} mark{q.totalMarks === 1 ? "" : "s"}</span>
                <span className={`lt-cigp__qmk lt-cigp__qmk--${tone}`}>{markPill(q)}</span>
              </div>
              {q.questionText && (
                <div className="lt-cigp__qtext"><MathText text={q.questionText} /></div>
              )}

              {steps.length === 0 ? (
                <div className="lt-cigp__nosteps">No step-level annotation was returned for this answer.</div>
              ) : (
                <div className="lt-cigp__steps">
                  {steps.map((s, si) => {
                    const stone = STEP_TONE[s.status] || "bad";
                    return (
                      <div key={si} className="lt-cigp__step">
                        <div className="lt-cigp__stephead">
                          <span className="lt-cigp__stepn">Step {s.stepNumber}</span>
                          <span className={`lt-cigp__stbadge lt-cigp__stbadge--${stone}`}>
                            {STEP_LABEL[s.status] || "Incorrect"}
                          </span>
                          {s.mistakeType && MISTAKE_LABEL[s.mistakeType] && (
                            <span className="lt-cigp__sttag">{MISTAKE_LABEL[s.mistakeType]}</span>
                          )}
                          {/* Objective → per-step marks zeroed by design; suppress the
                              misleading "+0" chip, keep the status + annotation. */}
                          {!q.objective && (
                            <span className="lt-cigp__stmk">
                              +{s.marksAwarded}
                              {s.marksDeducted > 0 && <span className="lt-cigp__stmkd"> −{s.marksDeducted}</span>}
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <div className="lt-cigp__stdesc"><MathText text={s.description} /></div>
                        )}
                        {s.studentWork && (
                          <div className="lt-cigp__stwork"><MathText text={s.studentWork} /></div>
                        )}
                        {s.teacherAnnotation && (
                          <div className="lt-cigp__stann">↳ <MathText text={s.teacherAnnotation} /></div>
                        )}
                        {s.correctedWorking && (
                          <div className="lt-cigp__stfix">✓ <MathText text={s.correctedWorking} /></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {q.teacherNote && (
                <div className="lt-cigp__note">
                  <span className="lt-cigp__notel">Examiner note</span>
                  <span className="lt-cigp__notet">{q.teacherNote}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Coaching footer */}
        <div className="lt-cigp__coach">
          <div className="lt-cigp__coachh">Where your marks went</div>
          <p>{coaching}</p>
        </div>
      </div>

      <div className="lt-cigp__foot">
        <span>Generated by <b>LazyTopper</b> · lazytopper.com</span>
        <span>Marks shown match your on-screen result.</span>
      </div>
    </div>
  );
}

const CIGP_CSS = `
.lt-cigp {
  --cg-green: hsl(152, 55%, 45%); --cg-green-d: hsl(152, 55%, 30%); --cg-green-bg: hsl(152, 55%, 96%);
  --cg-navy: #15233a; --cg-ink: #1d2735; --cg-muted: #5a6573; --cg-line: #e6ebf0;
  --cg-rose: #d9534f; --cg-rose-bg: #fdeeee; --cg-amber: #e8930c; --cg-amber-bg: #fef6e8;
  --cg-grey: #9aa4b2; --cg-grey-bg: #f1f4f7;
  --cg-fd: "Fraunces", Georgia, serif; --cg-fb: "Inter", ui-sans-serif, system-ui, sans-serif;
  position: relative; background: #fff; color: var(--cg-ink); font-family: var(--cg-fb); font-size: 12.5px; line-height: 1.5;
}
.lt-cigp__head { background: var(--cg-navy); color: #fff; padding: 20px 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.lt-cigp__brand { display: flex; align-items: center; gap: 12px; }
.lt-cigp__logo { width: 38px; height: 38px; border-radius: 11px; background: var(--cg-green); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; color: #fff; }
.lt-cigp__nm { font-family: var(--cg-fd); font-weight: 700; font-size: 19px; display: block; line-height: 1; }
.lt-cigp__tg { font-size: 10px; color: #aab4c4; letter-spacing: 0.04em; }
.lt-cigp__meta { text-align: right; font-size: 12px; color: #cfd7e2; line-height: 1.55; display: flex; flex-direction: column; }
.lt-cigp__meta b { color: #fff; font-size: 14.5px; font-family: var(--cg-fd); }

.lt-cigp__body { padding: 22px 28px 4px; }
.lt-cigp__hero { display: flex; align-items: stretch; gap: 16px; margin-bottom: 10px; }
.lt-cigp__scorebox { background: var(--cg-green-bg); border: 1px solid hsl(152, 40%, 85%); border-radius: 14px; padding: 14px 20px; text-align: center; min-width: 140px; display: flex; flex-direction: column; justify-content: center; }
.lt-cigp__scoren { font-family: var(--cg-fd); font-size: 38px; font-weight: 700; color: var(--cg-green-d); line-height: 1; }
.lt-cigp__scoreden { font-size: 22px; color: var(--cg-muted); }
.lt-cigp__scorel { font-size: 11px; color: var(--cg-green-d); margin-top: 4px; font-weight: 600; letter-spacing: 0.03em; }
.lt-cigp__heroright { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 9px; }
.lt-cigp__pending { background: var(--cg-grey-bg); border-left: 4px solid var(--cg-grey); border-radius: 8px; padding: 9px 14px; font-size: 12.5px; color: #566; line-height: 1.5; }
.lt-cigp__pending--clean { border-left-color: var(--cg-green); color: var(--cg-green-d); background: var(--cg-green-bg); }
.lt-cigp__pending b { color: var(--cg-navy); }
.lt-cigp__chips { display: flex; gap: 8px; flex-wrap: wrap; }
.lt-cigp__chip { font-size: 11.5px; font-weight: 600; padding: 4px 11px; border-radius: 20px; }
.lt-cigp__chip--con { background: var(--cg-rose-bg); color: var(--cg-rose); }
.lt-cigp__chip--care { background: #eef0f7; color: #5b63b0; }

.lt-cigp__legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11.5px; color: var(--cg-muted); margin: 8px 0 4px; }
.lt-cigp__legend span { display: inline-flex; align-items: center; gap: 5px; }
.lt-cigp__dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.lt-cigp__dot--ok { background: var(--cg-green); }
.lt-cigp__dot--part { background: var(--cg-amber); }
.lt-cigp__dot--bad { background: var(--cg-rose); }
.lt-cigp__dot--pend { background: var(--cg-grey); }

.lt-cigp__q { border: 1px solid var(--cg-line); border-radius: 13px; padding: 14px 16px; margin-top: 12px; }
.lt-cigp__q--pending { background: var(--cg-grey-bg); border-style: dashed; }
.lt-cigp__qtop { display: flex; align-items: center; gap: 11px; margin-bottom: 9px; }
.lt-cigp__qn { width: 26px; height: 26px; border-radius: 8px; background: var(--cg-navy); color: #fff; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lt-cigp__qmeta { font-size: 11.5px; color: var(--cg-muted); }
.lt-cigp__qmk { margin-left: auto; font-weight: 700; font-size: 13px; padding: 3px 11px; border-radius: 20px; }
.lt-cigp__qmk--full { background: var(--cg-green-bg); color: var(--cg-green-d); }
.lt-cigp__qmk--part { background: var(--cg-amber-bg); color: var(--cg-amber); }
.lt-cigp__qmk--zero { background: var(--cg-rose-bg); color: var(--cg-rose); }
.lt-cigp__qmk--pend { background: var(--cg-grey-bg); color: var(--cg-grey); }
.lt-cigp__qtext { font-size: 13px; color: var(--cg-ink); margin-bottom: 11px; }

.lt-cigp__steps { display: flex; flex-direction: column; gap: 8px; }
.lt-cigp__step { border: 1px solid var(--cg-line); border-radius: 10px; padding: 10px 12px; background: #fbfcfd; }
.lt-cigp__stephead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
.lt-cigp__stepn { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cg-muted); }
.lt-cigp__stbadge { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 20px; }
.lt-cigp__stbadge--ok { background: var(--cg-green-bg); color: var(--cg-green-d); }
.lt-cigp__stbadge--part { background: var(--cg-amber-bg); color: var(--cg-amber); }
.lt-cigp__stbadge--bad { background: var(--cg-rose-bg); color: var(--cg-rose); }
.lt-cigp__sttag { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 20px; background: #eef0f7; color: #5b63b0; }
.lt-cigp__stmk { margin-left: auto; font-size: 11.5px; font-weight: 700; color: var(--cg-green-d); }
.lt-cigp__stmkd { color: var(--cg-rose); }
.lt-cigp__stdesc { font-size: 12.5px; font-weight: 600; color: var(--cg-ink); margin-bottom: 4px; }
.lt-cigp__stwork { font-family: var(--cg-fd); font-size: 12.5px; color: var(--cg-ink); background: #fff; border: 1px solid var(--cg-line); border-radius: 7px; padding: 6px 9px; margin-bottom: 4px; white-space: pre-wrap; word-break: break-word; }
.lt-cigp__stann { font-size: 11.5px; font-style: italic; color: var(--cg-muted); margin-bottom: 4px; }
.lt-cigp__stfix { font-size: 12px; color: var(--cg-green-d); background: var(--cg-green-bg); border-radius: 7px; padding: 6px 9px; white-space: pre-wrap; word-break: break-word; }
.lt-cigp__nosteps { font-size: 12.5px; color: var(--cg-muted); font-style: italic; }

.lt-cigp__note { margin-top: 10px; background: var(--cg-grey-bg); border-radius: 9px; padding: 9px 12px; }
.lt-cigp__notel { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--cg-muted); margin-bottom: 3px; }
.lt-cigp__notet { font-size: 12.5px; color: var(--cg-ink); line-height: 1.5; }

.lt-cigp__coach { margin-top: 20px; background: linear-gradient(180deg, #fff, var(--cg-green-bg)); border: 1px solid hsl(152, 40%, 86%); border-radius: 13px; padding: 16px 18px; }
.lt-cigp__coachh { font-family: var(--cg-fd); font-weight: 600; font-size: 15px; color: var(--cg-navy); margin-bottom: 5px; }
.lt-cigp__coach p { font-size: 13px; color: #3c4654; line-height: 1.55; }
.lt-cigp__pendnote { font-size: 12.5px; color: #667; font-style: italic; }
.lt-cigp__pendnote b { color: var(--cg-navy); font-style: normal; }

.lt-cigp__foot { border-top: 1px solid var(--cg-line); margin-top: 16px; padding: 14px 28px; display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: var(--cg-grey); }
.lt-cigp__foot b { color: var(--cg-muted); }
`;

export default CheckImproveGradedPrintDoc;
