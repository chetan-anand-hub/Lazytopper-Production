import { MathText } from "../question/MathText";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";
import type {
  CheckSolutionAnnotatedStep,
  WorksheetGradeResponse,
  WorksheetQuestionGrade,
} from "../../ai/aiClient";

/**
 * WorksheetGradedPrintDoc — PR-A: the branded GRADED answer sheet, rendered for
 * both the on-screen "Read" view and the downloadable PDF (the PDF rasterises THIS
 * via the existing html2canvas → jsPDF path in worksheetPdfExport.ts — no new PDF
 * mechanism). Math renders through the shared <MathText> (KaTeX).
 *
 * HONESTY (hard, §2): every number here equals the grade RESPONSE already on
 * screen — this is a snapshot, never a re-grade. A `couldNotRead` question is
 * shown as "couldn’t read — not graded, not scored 0," never folded into a 0. No
 * invented numbers; the model column is the worksheet's own persisted scheme.
 */

const SECTION_LABEL: Record<string, string> = {
  A: "Section A · objective",
  B: "Section B · short answer",
  C: "Section C · short answer",
  D: "Section D · long answer",
  E: "Section E · case-based",
};
const SECTION_ORDER = ["A", "B", "C", "D", "E"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type Tone = "full" | "part" | "zero" | "pend";

function toneFor(g: WorksheetQuestionGrade): Tone {
  if (g.couldNotRead) return "pend";
  const awarded = Number(g.marksAwarded) || 0;
  const total = Number(g.totalMarks) || 0;
  if (total > 0 && awarded >= total) return "full";
  if (awarded <= 0) return "zero";
  return "part";
}

function markPill(g: WorksheetQuestionGrade): string {
  if (g.couldNotRead) return "pending";
  return `${g.marksAwarded ?? 0} / ${g.totalMarks}`;
}

/** Dominant mistake tag for the "Your result" line (knowledge gap vs careless). */
function mistakeTag(g: WorksheetQuestionGrade): { label: string; cls: string } | null {
  if (!g.mistakeSummary) return null;
  const { conceptual, calculation, silly, presentation } = g.mistakeSummary;
  if ((conceptual || 0) > 0) return { label: "Concept gap", cls: "con" };
  if ((calculation || 0) > 0) return { label: "Calculation", cls: "cal" };
  if ((silly || 0) > 0) return { label: "Careless slip", cls: "care" };
  if ((presentation || 0) > 0) return { label: "Presentation", cls: "care" };
  return null;
}

/** Step-status vocabulary — the SAME four strings `CheckImproveGradedPrintDoc` already
 *  renders (`STEP_TONE` / `STEP_LABEL` there). Mirrored verbatim, deliberately: this lane
 *  brings the worksheet sheet up to the C&I standard and must introduce NO new label or
 *  grouping vocabulary of its own. */
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

/** Identical strings to this file's own `mistakeTag` labels and to C&I's `MISTAKE_LABEL`
 *  — no new mistake-type name is introduced anywhere in this lane. */
const STEP_MISTAKE_LABEL: Record<string, string> = {
  conceptual: "Concept gap",
  calculation: "Calculation",
  silly: "Careless slip",
  presentation: "Presentation",
};

/** Render a mark without inventing precision: `2` stays `2`, `0.5` stays `0.5`.
 *  ★ Half-marks are real in CBSE step marking (CLAUDE.md §13 — a stated formula alone
 *  earns 0.5, a missing SI unit loses 0.5), so a fractional mark must render, never
 *  round and never throw. */
function formatMark(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

/** ★★ THE OBJECTIVE (MCQ / 1-mark) RULE — CBSE awards no method marks on a 1-marker, so
 *  such a question is scored 0 or its full mark and is NEVER step-marked. A student may
 *  still have uploaded working on one; that upload exists ONLY so the mistake can be
 *  diagnosed, and it never converts into a step tally. */
function isBinaryScored(g: WorksheetQuestionGrade, q?: PersistedWorksheetQuestion): boolean {
  if (g.objective) return true;
  return Number(q?.marks) === 1 || Number(g.totalMarks) === 1;
}

export interface WorksheetGradedPrintDocProps {
  ws: PersistedWorksheet;
  response: WorksheetGradeResponse;
  name: string;
  code: string;
  /** Coaching footer line (product-voice, derived from counts — never raw model prose). */
  coaching: string;
}

export function WorksheetGradedPrintDoc({ ws, response, name, code, coaching }: WorksheetGradedPrintDocProps) {
  const byNumber = new Map<number, PersistedWorksheetQuestion>(
    ws.questions.map((q) => [q.qNumber, q]),
  );

  // Aggregate the four types over legible questions for the header chips.
  const agg = response.results.reduce(
    (a, r) => {
      if (r.couldNotRead || !r.mistakeSummary) return a;
      a.conceptual += Number(r.mistakeSummary.conceptual) || 0;
      a.calculation += Number(r.mistakeSummary.calculation) || 0;
      a.silly += Number(r.mistakeSummary.silly) || 0;
      a.presentation += Number(r.mistakeSummary.presentation) || 0;
      return a;
    },
    { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  );
  const knowledge = agg.conceptual + agg.calculation;
  const careless = agg.silly + agg.presentation;

  // Group the per-question results by their worksheet section, A→E then other.
  const groups = new Map<string, WorksheetQuestionGrade[]>();
  for (const r of response.results) {
    const sec = String(byNumber.get(r.qNumber)?.section || "").toUpperCase();
    const key = SECTION_ORDER.includes(sec) ? sec : "?";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const orderedSecs = [...SECTION_ORDER.filter((s) => groups.has(s)), ...(groups.has("?") ? ["?"] : [])];

  return (
    <div className="lt-gp">
      <style>{GRADED_CSS}</style>

      <div className="lt-gp__head">
        <div className="lt-gp__brand">
          <span className="lt-gp__logo">LT</span>
          <span>
            <span className="lt-gp__nm">LazyTopper</span>
            <span className="lt-gp__tg">CBSE · CLASS 10</span>
          </span>
        </div>
        <div className="lt-gp__meta">
          <b>{name}</b>
          <span>{code}</span>
          <span>
            Worksheet · {ws.questions.length} question{ws.questions.length === 1 ? "" : "s"} · {ws.totalMarks} marks
          </span>
          <span>{formatDate(ws.createdAt)}</span>
        </div>
      </div>

      <div className="lt-gp__body">
        {/* Score hero */}
        <div className="lt-gp__hero">
          <div className="lt-gp__scorebox">
            <div className="lt-gp__scoren">
              {response.gradedMarksAwarded}
              <span className="lt-gp__scoreden"> / {response.gradedMarksTotal}</span>
            </div>
            <div className="lt-gp__scorel">MARKS GRADED</div>
          </div>
          <div className="lt-gp__heroright">
            {response.pendingCount > 0 ? (
              <div className="lt-gp__pending">
                <b>{response.pendingCount} {response.pendingCount === 1 ? "question" : "questions"} pending</b> —
                couldn’t be read clearly. <b>Not</b> graded and <b>not</b> scored 0. Re-upload a clearer photo to grade
                {response.pendingCount === 1 ? " it" : " them"}. Worksheet is worth {response.worksheetTotalMarks} marks in total.
              </div>
            ) : (
              <div className="lt-gp__pending lt-gp__pending--clean">
                All {response.gradedCount} question{response.gradedCount === 1 ? "" : "s"} read and graded.
              </div>
            )}
            {(knowledge > 0 || careless > 0) && (
              <div className="lt-gp__chips">
                {knowledge > 0 && (
                  <span className="lt-gp__chip lt-gp__chip--con">
                    {knowledge} {knowledge === 1 ? "knowledge gap" : "knowledge gaps"}
                  </span>
                )}
                {careless > 0 && (
                  <span className="lt-gp__chip lt-gp__chip--care">
                    {careless} careless {careless === 1 ? "slip" : "slips"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lt-gp__legend">
          <span><i className="lt-gp__dot lt-gp__dot--full" />full marks</span>
          <span><i className="lt-gp__dot lt-gp__dot--part" />partial</span>
          <span><i className="lt-gp__dot lt-gp__dot--zero" />lost</span>
          <span><i className="lt-gp__dot lt-gp__dot--pend" />pending</span>
        </div>

        {/* Per-question blocks by section */}
        {orderedSecs.map((sec) => (
          <div key={sec} className="lt-gp__qsec">
            <div className="lt-gp__qsech">{sec === "?" ? "Other questions" : SECTION_LABEL[sec] || `Section ${sec}`}</div>
            {groups.get(sec)!.map((r) => {
              const q = byNumber.get(r.qNumber);
              const tone = toneFor(r);
              if (r.couldNotRead) {
                return (
                  <div key={r.qNumber} className="lt-gp__q lt-gp__q--pending">
                    <div className="lt-gp__qtop">
                      <span className="lt-gp__qn">{r.qNumber}</span>
                      <span className="lt-gp__qmeta">{q ? `${q.marks} mark${q.marks === 1 ? "" : "s"}` : ""}</span>
                      <span className="lt-gp__qmk lt-gp__qmk--pend">pending</span>
                    </div>
                    {q?.questionText && (
                      <div className="lt-gp__qtext"><MathText text={q.questionText} /></div>
                    )}
                    <div className="lt-gp__pendnote">
                      ⚠ This page couldn’t be read clearly — <b>not graded, not scored 0</b>. Re-upload a clearer photo of Q{r.qNumber} to grade it.
                    </div>
                  </div>
                );
              }
              const tag = mistakeTag(r);
              const steps = (q?.solutionSteps ?? []).filter(Boolean);
              const finalAns = q?.finalAnswer || q?.answer || "";
              // The student's OWN marked working, already persisted on every graded
              // attempt (`WorksheetQuestionGrade.annotatedSteps`) and never rendered until
              // now — no migration, no schema change; past attempts light up too.
              const annSteps: CheckSolutionAnnotatedStep[] = (r.annotatedSteps ?? []).filter(Boolean);
              const binary = isBinaryScored(r, q);
              const binaryCorrect = Number(r.marksAwarded) > 0;
              return (
                <div key={r.qNumber} className="lt-gp__q">
                  <div className="lt-gp__qtop">
                    <span className="lt-gp__qn">{r.qNumber}</span>
                    <span className="lt-gp__qmeta">{q ? `${q.marks} mark${q.marks === 1 ? "" : "s"}` : ""}</span>
                    <span className={`lt-gp__qmk lt-gp__qmk--${tone}`}>{markPill(r)}</span>
                  </div>
                  {q?.questionText && (
                    <div className="lt-gp__qtext"><MathText text={q.questionText} /></div>
                  )}
                  <div className="lt-gp__qrow">
                    <div className="lt-gp__qbox">
                      <div className="lt-gp__bl">Your result</div>
                      {tag && <span className={`lt-gp__tag lt-gp__tag--${tag.cls}`}>{tag.label}</span>}

                      {binary ? (
                        <>
                          {/* RENDERING 2 & 3 — objective / 1-mark: a binary verdict, never a
                              step tally. CBSE awards no method marks on a 1-marker. */}
                          <div className={`lt-gp__bin lt-gp__bin--${binaryCorrect ? "yes" : "no"}`}>
                            {binaryCorrect ? "Correct" : "Not correct"}
                            <span className="lt-gp__binmk">
                              {formatMark(r.marksAwarded)} / {formatMark(r.totalMarks)}
                            </span>
                          </div>
                          {/* RENDERING 3 — working WAS uploaded on a 1-marker: show the
                              diagnosis so the student learns what went wrong. The mark above
                              stays binary regardless; no per-step marks are shown. */}
                          {annSteps.length > 0 && (
                            <div className="lt-gp__diag">
                              <div className="lt-gp__diagh">What went wrong in your working</div>
                              {annSteps.map((s, i) => (
                                <div key={i} className="lt-gp__diagrow">
                                  {s.studentWork && (
                                    <div className="lt-gp__stwork"><MathText text={s.studentWork} /></div>
                                  )}
                                  {s.teacherAnnotation && (
                                    <div className="lt-gp__stann">↳ <MathText text={s.teacherAnnotation} /></div>
                                  )}
                                  {s.correctedWorking && (
                                    <div className="lt-gp__stfix">✓ <MathText text={s.correctedWorking} /></div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {r.teacherNote && <span className="lt-gp__fb">{r.teacherNote}</span>}
                          {/* ★ RENDERING 2 ends here deliberately: NO step block and NO
                              placeholder. A bare correct click was never asked for working,
                              so implying it was missing would be dishonest. */}
                        </>
                      ) : annSteps.length > 0 ? (
                        /* RENDERING 1 — a written-response question that WAS step-marked:
                           the student's own writing, per step, with the marks awarded. */
                        <div className="lt-gp__steps">
                          {annSteps.map((s, i) => {
                            const stone = STEP_TONE[s.status] || "bad";
                            return (
                              <div key={i} className="lt-gp__stp">
                                <div className="lt-gp__stphead">
                                  <span className="lt-gp__stepn">Step {s.stepNumber}</span>
                                  <span className={`lt-gp__stbadge lt-gp__stbadge--${stone}`}>
                                    {STEP_LABEL[s.status] || "Incorrect"}
                                  </span>
                                  {s.mistakeType && STEP_MISTAKE_LABEL[s.mistakeType] && (
                                    <span className="lt-gp__sttag">{STEP_MISTAKE_LABEL[s.mistakeType]}</span>
                                  )}
                                  <span className="lt-gp__stmk">
                                    +{formatMark(s.marksAwarded)}
                                    {Number(s.marksDeducted) > 0 && (
                                      <span className="lt-gp__stmkd"> −{formatMark(s.marksDeducted)}</span>
                                    )}
                                  </span>
                                </div>
                                {s.description && (
                                  <div className="lt-gp__stdesc"><MathText text={s.description} /></div>
                                )}
                                {s.studentWork && (
                                  <div className="lt-gp__stwork"><MathText text={s.studentWork} /></div>
                                )}
                                {s.teacherAnnotation && (
                                  <div className="lt-gp__stann">↳ <MathText text={s.teacherAnnotation} /></div>
                                )}
                                {s.correctedWorking && (
                                  <div className="lt-gp__stfix">✓ <MathText text={s.correctedWorking} /></div>
                                )}
                              </div>
                            );
                          })}
                          {r.teacherNote && <span className="lt-gp__fb">{r.teacherNote}</span>}
                        </div>
                      ) : (
                        /* A written-response question with NO stored step annotation (older
                           attempts, or a grader that returned none). Unchanged behaviour —
                           the teacher note, exactly as before this lane. */
                        <span className="lt-gp__fb">{r.teacherNote || "Graded against the marking scheme."}</span>
                      )}
                    </div>
                    <div className="lt-gp__qbox">
                      <div className="lt-gp__bl">Model answer</div>
                      <div className="lt-gp__model">
                        {steps.length > 0 ? (
                          steps.map((s, i) => (
                            <div key={i} className="lt-gp__step"><MathText text={s} /></div>
                          ))
                        ) : (
                          <div className="lt-gp__step">Worked solution not available for this question.</div>
                        )}
                        {finalAns && (
                          <div className="lt-gp__final">Answer: <MathText text={finalAns} /></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Coaching footer */}
        <div className="lt-gp__coach">
          <div className="lt-gp__coachh">Where your marks went</div>
          <p>{coaching}</p>
        </div>
      </div>

      <div className="lt-gp__foot">
        <span>Generated by <b>LazyTopper</b> · lazytopper.com · {formatDate(ws.createdAt)}</span>
        <span>Marks shown match your on-screen result.</span>
      </div>
    </div>
  );
}

const GRADED_CSS = `
.lt-gp {
  --gp-green: hsl(152, 55%, 45%); --gp-green-d: hsl(152, 55%, 30%); --gp-green-bg: hsl(152, 55%, 96%);
  --gp-navy: #15233a; --gp-ink: #1d2735; --gp-muted: #5a6573; --gp-line: #e6ebf0;
  --gp-rose: #d9534f; --gp-rose-bg: #fdeeee; --gp-amber: #e8930c; --gp-amber-bg: #fef6e8;
  --gp-grey: #9aa4b2; --gp-grey-bg: #f1f4f7;
  --gp-fd: "Fraunces", Georgia, serif; --gp-fb: "Inter", ui-sans-serif, system-ui, sans-serif;
  position: relative; background: #fff; color: var(--gp-ink); font-family: var(--gp-fb); font-size: 12.5px; line-height: 1.5;
}
.lt-gp__head { background: var(--gp-navy); color: #fff; padding: 20px 28px; display: flex; align-items: center; justify-content: space-between; }
.lt-gp__brand { display: flex; align-items: center; gap: 12px; }
.lt-gp__logo { width: 38px; height: 38px; border-radius: 11px; background: var(--gp-green); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; color: #fff; }
.lt-gp__nm { font-family: var(--gp-fd); font-weight: 700; font-size: 19px; display: block; line-height: 1; }
.lt-gp__tg { font-size: 10.5px; color: #aab4c4; letter-spacing: 0.04em; }
.lt-gp__meta { text-align: right; font-size: 12px; color: #cfd7e2; line-height: 1.55; display: flex; flex-direction: column; }
.lt-gp__meta b { color: #fff; font-size: 14.5px; font-family: var(--gp-fd); }

.lt-gp__body { padding: 22px 28px 4px; }
.lt-gp__hero { display: flex; align-items: stretch; gap: 16px; margin-bottom: 10px; }
.lt-gp__scorebox { background: var(--gp-green-bg); border: 1px solid hsl(152, 40%, 85%); border-radius: 14px; padding: 14px 20px; text-align: center; min-width: 140px; display: flex; flex-direction: column; justify-content: center; }
.lt-gp__scoren { font-family: var(--gp-fd); font-size: 38px; font-weight: 700; color: var(--gp-green-d); line-height: 1; }
.lt-gp__scoreden { font-size: 22px; color: var(--gp-muted); }
.lt-gp__scorel { font-size: 11px; color: var(--gp-green-d); margin-top: 4px; font-weight: 600; letter-spacing: 0.03em; }
.lt-gp__heroright { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 9px; }
.lt-gp__pending { background: var(--gp-grey-bg); border-left: 4px solid var(--gp-grey); border-radius: 8px; padding: 9px 14px; font-size: 12.5px; color: #566; line-height: 1.5; }
.lt-gp__pending--clean { border-left-color: var(--gp-green); color: var(--gp-green-d); background: var(--gp-green-bg); }
.lt-gp__pending b { color: var(--gp-navy); }
.lt-gp__chips { display: flex; gap: 8px; flex-wrap: wrap; }
.lt-gp__chip { font-size: 11.5px; font-weight: 600; padding: 4px 11px; border-radius: 20px; }
.lt-gp__chip--con { background: var(--gp-rose-bg); color: var(--gp-rose); }
.lt-gp__chip--care { background: #eef0f7; color: #5b63b0; }

.lt-gp__legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11.5px; color: var(--gp-muted); margin: 8px 0 4px; }
.lt-gp__legend span { display: inline-flex; align-items: center; gap: 5px; }
.lt-gp__dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.lt-gp__dot--full { background: var(--gp-green); }
.lt-gp__dot--part { background: var(--gp-amber); }
.lt-gp__dot--zero { background: var(--gp-rose); }
.lt-gp__dot--pend { background: var(--gp-grey); }

.lt-gp__qsec { margin-top: 20px; }
.lt-gp__qsech { font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--gp-muted); margin-bottom: 10px; border-bottom: 1px solid var(--gp-line); padding-bottom: 6px; }
.lt-gp__q { border: 1px solid var(--gp-line); border-radius: 13px; padding: 14px 16px; margin-bottom: 12px; }
.lt-gp__q--pending { background: var(--gp-grey-bg); border-style: dashed; }
.lt-gp__qtop { display: flex; align-items: center; gap: 11px; margin-bottom: 9px; }
.lt-gp__qn { width: 26px; height: 26px; border-radius: 8px; background: var(--gp-navy); color: #fff; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lt-gp__qmeta { font-size: 11.5px; color: var(--gp-muted); }
.lt-gp__qmk { margin-left: auto; font-weight: 700; font-size: 13px; padding: 3px 11px; border-radius: 20px; }
.lt-gp__qmk--full { background: var(--gp-green-bg); color: var(--gp-green-d); }
.lt-gp__qmk--part { background: var(--gp-amber-bg); color: var(--gp-amber); }
.lt-gp__qmk--zero { background: var(--gp-rose-bg); color: var(--gp-rose); }
.lt-gp__qmk--pend { background: var(--gp-grey-bg); color: var(--gp-grey); }
.lt-gp__qtext { font-size: 13px; color: var(--gp-ink); margin-bottom: 11px; }
.lt-gp__qrow { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lt-gp__qbox { font-size: 12.5px; }
.lt-gp__bl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--gp-muted); margin-bottom: 4px; }
.lt-gp__tag { display: inline-block; font-weight: 700; font-size: 11px; padding: 1px 8px; border-radius: 20px; margin-right: 6px; }
.lt-gp__tag--con { background: var(--gp-rose-bg); color: var(--gp-rose); }
.lt-gp__tag--cal { background: var(--gp-amber-bg); color: var(--gp-amber); }
.lt-gp__tag--care { background: #eef0f7; color: #5b63b0; }
.lt-gp__fb { color: var(--gp-ink); display: block; margin-top: 6px; }

/* Binary verdict — objective / 1-mark questions (no step marking, by CBSE rule). */
.lt-gp__bin { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; padding: 7px 11px; border-radius: 9px; margin-top: 2px; }
.lt-gp__bin--yes { background: var(--gp-green-bg); color: var(--gp-green-d); }
.lt-gp__bin--no { background: var(--gp-rose-bg); color: var(--gp-rose); }
.lt-gp__binmk { margin-left: auto; font-size: 12.5px; font-weight: 700; }

/* Diagnosis on an objective question the student uploaded working for — advisory only,
   never a step-mark tally. */
.lt-gp__diag { margin-top: 8px; border-left: 3px solid var(--gp-line); padding-left: 10px; }
.lt-gp__diagh { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--gp-muted); margin-bottom: 5px; }
.lt-gp__diagrow { margin-bottom: 7px; }

/* The student's own marked working, per step (written-response questions). */
.lt-gp__steps { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
.lt-gp__stp { border: 1px solid var(--gp-line); border-radius: 9px; padding: 8px 10px; }
.lt-gp__stphead { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 5px; }
.lt-gp__stepn { font-size: 11px; font-weight: 700; color: var(--gp-navy); }
.lt-gp__stbadge { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 20px; }
.lt-gp__stbadge--ok { background: var(--gp-green-bg); color: var(--gp-green-d); }
.lt-gp__stbadge--part { background: var(--gp-amber-bg); color: var(--gp-amber); }
.lt-gp__stbadge--bad { background: var(--gp-rose-bg); color: var(--gp-rose); }
.lt-gp__sttag { font-size: 10.5px; font-weight: 600; padding: 1px 8px; border-radius: 20px; background: #eef0f7; color: #5b63b0; }
.lt-gp__stmk { margin-left: auto; font-size: 11.5px; font-weight: 700; color: var(--gp-green-d); }
.lt-gp__stmkd { color: var(--gp-rose); }
.lt-gp__stdesc { font-size: 12px; color: var(--gp-muted); margin-bottom: 4px; }
.lt-gp__stwork { font-family: var(--gp-fd); font-size: 12.5px; color: var(--gp-ink); background: #fff; border: 1px solid var(--gp-line); border-radius: 7px; padding: 6px 9px; margin-bottom: 4px; white-space: pre-wrap; word-break: break-word; }
.lt-gp__stann { font-size: 12px; color: #6b4e00; background: var(--gp-amber-bg); border-radius: 6px; padding: 4px 8px; margin-bottom: 4px; }
.lt-gp__stfix { font-size: 12px; color: var(--gp-green-d); background: var(--gp-green-bg); border-radius: 6px; padding: 4px 8px; }
.lt-gp__model { background: var(--gp-green-bg); border-radius: 9px; padding: 10px 12px; color: #234; }
.lt-gp__step { margin-bottom: 3px; }
.lt-gp__final { margin-top: 5px; font-weight: 600; color: var(--gp-green-d); }
.lt-gp__pendnote { font-size: 12.5px; color: #667; font-style: italic; }
.lt-gp__pendnote b { color: var(--gp-navy); font-style: normal; }

.lt-gp__coach { margin-top: 20px; background: linear-gradient(180deg, #fff, var(--gp-green-bg)); border: 1px solid hsl(152, 40%, 86%); border-radius: 13px; padding: 16px 18px; }
.lt-gp__coachh { font-family: var(--gp-fd); font-weight: 600; font-size: 15px; color: var(--gp-navy); margin-bottom: 5px; }
.lt-gp__coach p { font-size: 13px; color: #3c4654; line-height: 1.55; }

.lt-gp__foot { border-top: 1px solid var(--gp-line); margin-top: 16px; padding: 14px 28px; display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: var(--gp-grey); }
.lt-gp__foot b { color: var(--gp-muted); }
`;

export default WorksheetGradedPrintDoc;
