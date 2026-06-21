import { MathText } from "../question/MathText";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";

/**
 * WorksheetPrintDoc — the worksheet rendered to the locked PDF design
 * (docs/design/worksheet_PDF_design_mockup_v1) using the app's EXISTING math
 * renderer (MathText / KaTeX) so symbols are REAL (√, ², θ, fractions).
 *
 * PR-E2a.2: this is now a CAPTURE-ready document. The PR-E2a.1 window.print() /
 * #print-area path was broken (print.css used visibility:hidden, which keeps the
 * whole app in the printed layout, and a printer-less browser prompted "install a
 * printer"). It is replaced by a real client-side PDF FILE download
 * (worksheetPdfExport.ts): this doc is rendered into a DETACHED offscreen host,
 * rasterised with html2canvas, and written into a jsPDF document — so the PDF
 * contains ONLY the worksheet (clean isolation by construction; never the app).
 *
 * Therefore this component is fully self-contained (no #print-area, no print.css
 * coupling — those stay reserved for notes/mocks): white page background, an
 * absolutely-positioned tiled watermark BEHIND the content (z-index), and NO
 * footer element (the per-page footer + "Page N of M" are drawn crisply by jsPDF
 * after rasterisation). Dark-green tokens keep it legible in black-and-white.
 *
 * Subject-agnostic / shared: every question / option / step / final answer flows
 * through <MathText>, so Maths √/², Physics units and Chemistry subscripts all
 * render consistently — no per-subject branching.
 */

const SECTION_LABEL: Record<string, string> = {
  A: "Section A · MCQ / Assertion-Reason",
  B: "Section B · Short Answer I",
  C: "Section C · Short Answer II",
  D: "Section D · Long Answer",
  E: "Section E · Case-based",
};
const SECTION_MARK_HINT: Record<string, string> = {
  A: "1 mark each",
  B: "2 marks each",
  C: "3 marks each",
  D: "5 marks each",
  E: "4 marks each",
};
const SECTION_ORDER = ["A", "B", "C", "D", "E"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function groupBySection(
  questions: PersistedWorksheetQuestion[],
): Array<[string, PersistedWorksheetQuestion[]]> {
  const groups = new Map<string, PersistedWorksheetQuestion[]>();
  for (const q of questions) {
    const sec = String(q.section || "").toUpperCase();
    const key = SECTION_ORDER.includes(sec) ? sec : "?";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(q);
  }
  const out: Array<[string, PersistedWorksheetQuestion[]]> = [];
  for (const sec of SECTION_ORDER) if (groups.has(sec)) out.push([sec, groups.get(sec)!]);
  if (groups.has("?")) out.push(["?", groups.get("?")!]);
  return out;
}

// Even per-step mark distribution (0.5 steps, summing to total) — mirrors CBSE
// step-marking where each authored step carries roughly equal weight.
function perStepMarks(total: number, n: number): number[] {
  if (n <= 0) return [];
  const out: number[] = [];
  let remaining = total;
  for (let i = 0; i < n; i += 1) {
    if (i === n - 1) out.push(Math.max(0, Math.round(remaining * 2) / 2));
    else {
      const share = Math.round((total / n) * 2) / 2;
      out.push(share);
      remaining -= share;
    }
  }
  return out;
}

const OPTION_LETTERS = ["a", "b", "c", "d", "e"];

export interface WorksheetPrintDocProps {
  ws: PersistedWorksheet;
  kind: "questions" | "answers";
}

export function WorksheetPrintDoc({ ws, kind }: WorksheetPrintDocProps) {
  const isAnswers = kind === "answers";
  const groups = groupBySection(ws.questions);
  // Enough watermark tiles to cover a multi-page worksheet (overflow clips extras).
  const wmCount = Math.min(300, Math.max(45, ws.questions.length * 6));

  return (
    <div className="lt-wsp" data-kind={kind} data-question-count={ws.questions.length}>
      <style>{PRINT_CSS}</style>

      {/* Subtle tiled diagonal watermark — absolute, BEHIND content (z-index 0). */}
      <div className={`lt-wsp__wm ${isAnswers ? "lt-wsp__wm--key" : "lt-wsp__wm--light"}`} aria-hidden="true">
        {Array.from({ length: wmCount }).map((_, i) => (
          <span key={i}>LazyTopper</span>
        ))}
      </div>

      <div className="lt-wsp__content">
        {/* Masthead */}
        <header className="lt-wsp__mast">
          <span className="lt-wsp__logo">LT</span>
          <span className="lt-wsp__brand">
            <span className="lt-wsp__name">LazyTopper</span>
            <span className="lt-wsp__tag">CBSE Class 10 · Board-exam practice</span>
          </span>
          <span className="lt-wsp__right">
            <span className="lt-wsp__subj">{ws.subject}</span>
            <span className="lt-wsp__date">Generated {formatDate(ws.createdAt)}</span>
          </span>
        </header>

        {/* Title + meta / badge */}
        <div className="lt-wsp__titlerow">
          <h1 className="lt-wsp__title">
            <MathText text={ws.title} />
          </h1>
          {isAnswers ? (
            <span className="lt-wsp__badge">Answer key &amp; solutions</span>
          ) : (
            <span className="lt-wsp__meta">
              {ws.questions.length} questions · {ws.totalMarks} marks · {ws.sectionFilter}
            </span>
          )}
        </div>

        {/* Instruction (questions) / note (answers) */}
        {isAnswers ? (
          <p className="lt-wsp__instr">
            Step-by-step solutions with CBSE step-marking. Open this <b>after</b> you&rsquo;ve attempted
            the worksheet — try first, then check.
          </p>
        ) : (
          <p className="lt-wsp__instr">
            <b>Instructions:</b> Solve on this sheet or separate paper.{" "}
            <b>Label each answer with its question number (Q1, Q2 …).</b> When done, upload one PDF of
            all your answers on LazyTopper to get it graded with full solutions.
          </p>
        )}

        {/* Sections */}
        {groups.map(([sec, qs]) => (
          <section key={sec} className="lt-wsp__section">
            <div className="lt-wsp__sechead">
              <span>{sec === "?" ? "Other questions" : SECTION_LABEL[sec]}</span>
              {sec !== "?" && <span className="lt-wsp__sechint">{SECTION_MARK_HINT[sec]}</span>}
            </div>

            {qs.map((q) =>
              isAnswers ? (
                <AnswerBlock key={q.qNumber} q={q} />
              ) : (
                <QuestionBlock key={q.qNumber} q={q} />
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function QuestionBlock({ q }: { q: PersistedWorksheetQuestion }) {
  const marks = Number(q.marks) || 1;
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  const rules = hasOptions ? 0 : Math.max(2, Math.min(6, marks));
  return (
    <div className="lt-wsp__q">
      <span className="lt-wsp__qn">Q{q.qNumber}.</span>
      <div className="lt-wsp__qbody">
        <div className="lt-wsp__qtext">
          <MathText text={q.questionText} />
          <span className="lt-wsp__qmarks">[{marks}]</span>
        </div>
        {hasOptions ? (
          <ol className="lt-wsp__opts">
            {q.options!.map((opt, oi) => (
              <li key={oi}>
                <span className="lt-wsp__optl">({OPTION_LETTERS[oi] ?? oi + 1})</span>{" "}
                <MathText text={opt} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="lt-wsp__ans">
            {Array.from({ length: rules }).map((_, r) => (
              <span key={r} className="lt-wsp__rule" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerBlock({ q }: { q: PersistedWorksheetQuestion }) {
  const marks = Number(q.marks) || 1;
  const steps = Array.isArray(q.solutionSteps) ? q.solutionSteps.filter(Boolean) : [];
  const finalAns = q.finalAnswer || q.answer || "";
  const stepMarks = perStepMarks(marks, steps.length);
  return (
    <div className="lt-wsp__sol">
      <div className="lt-wsp__solhead">
        <span className="lt-wsp__sqn">Q{q.qNumber}.</span>
        <span className="lt-wsp__solmk">[{marks} mark{marks === 1 ? "" : "s"}]</span>
      </div>
      {steps.length > 0 && (
        <ol className="lt-wsp__steps">
          {steps.map((s, si) => {
            const hasOwnMark = /\[\s*\d/.test(s);
            return (
              <li key={si} className="lt-wsp__step">
                <MathText text={s} />
                {!hasOwnMark && (
                  <span className="lt-wsp__stepmk">
                    {" "}
                    [{stepMarks[si]} mark{stepMarks[si] === 1 ? "" : "s"}]
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {finalAns ? (
        <div className="lt-wsp__final">
          Answer: <MathText text={finalAns} />
        </div>
      ) : steps.length === 0 ? (
        <div className="lt-wsp__nosol">Worked solution not available for this question.</div>
      ) : null}
    </div>
  );
}

const PRINT_CSS = `
.lt-wsp {
  --p-green: hsl(152, 55%, 30%);
  --p-green-d: hsl(152, 55%, 22%);
  --p-ink: #1a1a1a;
  --p-muted: #555;
  --p-line: #d8d8d8;
  --p-fd: "Fraunces", Georgia, serif;
  --p-fb: "Inter", ui-sans-serif, system-ui, sans-serif;
  position: relative;
  background: #ffffff;
  color: var(--p-ink);
  font-family: var(--p-fb);
  font-size: 12px;
  line-height: 1.5;
  padding: 24px 26px;
  overflow: hidden;
}
.lt-wsp__content { position: relative; z-index: 1; }

.lt-wsp__wm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  display: grid; grid-template-columns: repeat(3, 1fr); align-content: start; gap: 64px 0; padding-top: 70px; }
.lt-wsp__wm span { font-family: var(--p-fd); font-weight: 600; font-size: 30px; color: var(--p-green);
  transform: rotate(-30deg); text-align: center; letter-spacing: 0.05em; white-space: nowrap; }
.lt-wsp__wm--light span { opacity: 0.05; }
.lt-wsp__wm--key span { opacity: 0.10; }

.lt-wsp__mast { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid var(--p-green);
  padding-bottom: 10px; margin-bottom: 8px; }
.lt-wsp__logo { width: 30px; height: 30px; border-radius: 7px; background: var(--p-green); color: #fff;
  display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.lt-wsp__brand { display: flex; flex-direction: column; }
.lt-wsp__name { font-family: var(--p-fd); font-weight: 600; font-size: 16px; color: var(--p-ink); }
.lt-wsp__tag { font-size: 9.5px; color: var(--p-muted); }
.lt-wsp__right { margin-left: auto; text-align: right; display: flex; flex-direction: column; }
.lt-wsp__subj { font-size: 11px; font-weight: 700; color: var(--p-green-d); }
.lt-wsp__date { font-size: 9px; color: var(--p-muted); }

.lt-wsp__titlerow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 12px 0 4px; flex-wrap: wrap; }
.lt-wsp__title { font-family: var(--p-fd); font-weight: 600; font-size: 18px; margin: 0; color: var(--p-ink); }
.lt-wsp__meta { font-size: 11px; color: var(--p-muted); }
.lt-wsp__badge { display: inline-block; background: var(--p-green-d); color: #fff; font-size: 9.5px;
  font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 9px; border-radius: 4px; }
.lt-wsp__instr { font-size: 10.5px; color: var(--p-muted); border: 1px solid var(--p-line); border-radius: 6px;
  padding: 7px 10px; margin: 8px 0 14px; background: #fafafa; }
.lt-wsp__instr b { color: var(--p-ink); }

.lt-wsp__sechead { font-family: var(--p-fd); font-weight: 600; font-size: 12.5px; color: var(--p-green-d);
  border-bottom: 1px solid var(--p-line); padding-bottom: 3px; margin: 14px 0 10px;
  display: flex; justify-content: space-between; }
.lt-wsp__sechint { font-family: var(--p-fb); font-size: 10px; font-weight: 500; color: var(--p-muted); }

.lt-wsp__q { display: flex; gap: 9px; margin-bottom: 11px; }
.lt-wsp__qn { font-weight: 700; flex-shrink: 0; min-width: 24px; }
.lt-wsp__qbody { flex: 1; min-width: 0; }
.lt-wsp__qtext { font-size: 12px; }
.lt-wsp__qmarks { color: var(--p-muted); font-size: 10px; white-space: nowrap; float: right; }
.lt-wsp__opts { list-style: none; margin: 5px 0 0; padding: 0 0 0 6px; }
.lt-wsp__opts li { font-size: 11.5px; margin-bottom: 2px; }
.lt-wsp__optl { color: var(--p-muted); }
.lt-wsp__ans { margin-top: 5px; display: flex; flex-direction: column; gap: 8px; }
.lt-wsp__rule { display: block; border-bottom: 1px dotted var(--p-line); height: 0; }

.lt-wsp__sol { margin-bottom: 12px; }
.lt-wsp__solhead { display: flex; justify-content: space-between; align-items: baseline; }
.lt-wsp__sqn { font-weight: 700; color: var(--p-green-d); }
.lt-wsp__solmk { font-size: 10px; color: var(--p-muted); }
.lt-wsp__steps { margin: 4px 0 0; padding: 0 0 0 18px; }
.lt-wsp__step { font-size: 11.5px; margin-bottom: 3px; padding-left: 4px; }
.lt-wsp__stepmk { color: var(--p-muted); font-size: 10px; }
.lt-wsp__final { margin-top: 4px; font-weight: 600; color: var(--p-green-d); font-size: 12px; }
.lt-wsp__nosol { margin-top: 4px; font-size: 11px; color: var(--p-muted); }
`;

export default WorksheetPrintDoc;
