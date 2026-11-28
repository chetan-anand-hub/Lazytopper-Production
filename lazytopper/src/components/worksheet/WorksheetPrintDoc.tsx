import { MathText } from "../question/MathText";
import { stripOptionLabels, stripSourceTag } from "./worksheetPrintText";
import { PRINT_FIGURE_CSS, PrintQuestionFigures, type RenderSolutionFigure } from "./printFigures";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";
import { BRAND_MARK_SRC } from "../../config/brandMark";
import { STAMP_ATTR } from "./pdfTemplateMarks";
import { isObjectiveSteps, stripStepMarks } from "../../lib/marks/objectiveSteps";

const BRAND_WORDMARK_SRC = BRAND_MARK_SRC.replace(/[^/]+$/, "lazytopper-wordmark.png"); // public/brand/ - the owner's script wordmark

/**
 * WorksheetPrintDoc — the worksheet rendered to the locked PDF design
 * (docs/design/worksheet_PDF_design_mockup_v1) using the app's EXISTING math
 * renderer (MathText / KaTeX) so symbols are REAL (√, ², θ, fractions).
 *
 * PDF-REBRAND-1: restyled to the approved mock-up (slim header, Fraunces section headings with a short green
 * underline, source tags, green step-mark chips, a closing "check your own answer" box on every key). The page
 * chrome that is not part of the raster (green top rule, running header, footer, buyer line) is drawn by jsPDF.
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

const SECTION_MARK_HINT: Record<string, string> = {
  A: "1 mark each",
  B: "2 marks each",
  C: "3 marks each",
  D: "5 marks each",
  E: "4 marks each",
};
const SECTION_MARKS: Record<string, number> = { A: 1, B: 2, C: 3, D: 5, E: 4 };
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

/** The bank's optional board-source fields. The persisted worksheet row type does not declare them, so they are read
 *  through this widened shape: a row that carries them gets a source tag, a row that does not gets none. */
type SourcedQuestion = PersistedWorksheetQuestion & {
  pyqYear?: string | number;
  pyqSet?: string | number;
  sourceOverride?: string;
};

/** "Asked in CBSE Board 2023 · Set 1" for a past-board row; "Asked in CBSE Board 2023" when the set is unknown; "" for a row with no year or whose
 *  source could not be confirmed (`sourceOverride: "others"`) - never an invented source. */
export function sourceTagFor(q: PersistedWorksheetQuestion): string {
  const s = q as SourcedQuestion;
  if (s.sourceOverride === "others") return "";
  const year = String(s.pyqYear ?? "").trim();
  if (!year) return "";
  const set = String(s.pyqSet ?? "").trim();
  return set ? `Asked in CBSE Board ${year} \u00b7 Set ${set}` : `Asked in CBSE Board ${year}`;
}

/** The mark an authored step already carries, as the bank writes it: a leading "[1 mark]" or a trailing "[1]", "[1 mark]",
 *  "[1/2]" or "[\u00bd]". It becomes the chip and is cut out of the text; brackets elsewhere in a step are left alone. */
const MARK_NUM = String.raw`(\d+(?:\.\d+)?\s*\u00bd?|\u00bd|\d+\s*/\s*2)`;
const LEADING_MARK = new RegExp(String.raw`^\s*\[\s*${MARK_NUM}\s*marks?\s*\]\s*`, "i");
const TRAILING_MARK = new RegExp(String.raw`\s+\[\s*${MARK_NUM}\s*(?:marks?)?\s*\]\s*$`, "i");

function parseMarkValue(raw: string): number {
  const t = raw.replace(/\s+/g, "");
  if (t === "\u00bd" || t === "1/2") return 0.5;
  if (t.endsWith("\u00bd")) return Number(t.slice(0, -1)) + 0.5;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function markLabel(n: number): string {
  return `${n} mark${n === 1 ? "" : "s"}`;
}

/** Options go four across when they are all short, two across when medium, else one per line. */
function optionsLayout(opts: readonly string[]): "four" | "two" | "stack" {
  const longest = opts.reduce((m, o) => Math.max(m, String(o).length), 0);
  if (longest <= 14) return "four";
  if (longest <= 34) return "two";
  return "stack";
}

export interface WorksheetPrintDocProps {
  ws: PersistedWorksheet;
  kind: "questions" | "answers";
  /** PR-1 - the durable session code (`WS-{S}-{TOPIC}-{NN}`) printed on the sheet so
   *  each solved worksheet carries its ID (the same id it will be graded under).
   *  Optional/read-guarded: honest-empty when absent (never a fabricated placeholder). */
  code?: string;
  /** FIGURES-ALL-SURFACES-1 PR-2 - draws a question's solution figure in the answer key. Injected by the PDF exporter
   *  (loaded on demand) so the diagrams registry is not part of this chunk; absent = no solution figures. */
  renderSolutionFigure?: RenderSolutionFigure;
  /** PDF-REBRAND-1 - draw the tiled "LazyTopper" watermark. Default true (today's behaviour); a licensed copy turns it
   *  off because the buyer's name and email are printed in every page footer instead. */
  watermark?: boolean;
  /** BRIDGE-PDF-1 - a purchased pack file: its instruction line points to where a pack paper is uploaded (Home), not Worksheets. */
  packFile?: boolean;
  /**
   * SERVER-PDF-1 - render the TEMPLATE of a pack paper: the "Generated <date>" text (the buyer's download day) keeps its place but is
   * not painted, and is tagged so the generator can measure it. Never set on a buyer's device; absent -> markup exactly as before.
   */
  templateMode?: boolean;
}

/** Template render: the blanked text keeps its box (visibility only - nothing reflows). */
const TEMPLATE_CSS = `.lt-wsp [${STAMP_ATTR}="generated"] { visibility: hidden; }`;

export function WorksheetPrintDoc({ ws, kind, code, renderSolutionFigure, watermark = true, packFile = false, templateMode = false }: WorksheetPrintDocProps) {
  const isAnswers = kind === "answers";
  const groups = groupBySection(ws.questions);
  // Enough watermark tiles to cover a multi-page worksheet (overflow clips extras).
  const wmCount = Math.min(300, Math.max(45, ws.questions.length * 6));
  const secOf = new Map<number, string>(ws.questions.map((q) => [q.qNumber, String(q.section || "").toUpperCase()]));

  return (
    <div className="lt-wsp" data-kind={kind} data-question-count={ws.questions.length}>
      <style>{PRINT_CSS + PRINT_FIGURE_CSS}</style>
      {templateMode ? <style>{TEMPLATE_CSS}</style> : null}

      {/* Subtle tiled diagonal watermark - absolute, BEHIND content (z-index 0). Omitted on a licensed copy. */}
      {watermark && (
        <div className={`lt-wsp__wm ${isAnswers ? "lt-wsp__wm--key" : "lt-wsp__wm--light"}`} aria-hidden="true">
          {Array.from({ length: wmCount }).map((_, i) => (
            <span key={i}>LazyTopper</span>
          ))}
        </div>
      )}

      <div className="lt-wsp__content">
        {/* Slim header */}
        <header className="lt-wsp__mast">
          <span className="lt-wsp__brand">
            <img className="lt-wsp__logo" src={BRAND_MARK_SRC} alt="" aria-hidden="true" />
            <img className="lt-wsp__wmk" src={BRAND_WORDMARK_SRC} alt="LazyTopper" />
          </span>
          <span className="lt-wsp__right">
            {ws.subject} &middot; {ws.title} &middot; {isAnswers ? "Answer key" : "Questions"}
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
              {ws.questions.length} questions &middot; {ws.totalMarks} marks &middot; {ws.sectionFilter}
            </span>
          )}
        </div>
        {(code || ws.createdAt) && (
          <div className="lt-wsp__sub">
            {code && <span className="lt-wsp__code">{code}</span>}
            {formatDate(ws.createdAt) && (templateMode ? <span {...{ [STAMP_ATTR]: "generated" }}>Generated {formatDate(ws.createdAt)}</span> : <span>Generated {formatDate(ws.createdAt)}</span>)}
          </div>
        )}

        {/* Instruction (questions) / note (answers) */}
        {isAnswers ? (
          <p className="lt-wsp__instr">
            Answers and worked solutions. The mark in each green box is what an examiner awards for that step. Open this{" "}
            <b>after</b> you&rsquo;ve attempted the worksheet &mdash; try first, then check.
          </p>
        ) : (
          <p className="lt-wsp__instr">
            <b>Instructions:</b> Solve on this sheet or separate paper.{" "}
            <b>Label each answer with its question number (Q1, Q2 &hellip;).</b>{" "}
            {/* BRIDGE-PDF-1: a PACK file said "Worksheets -> Upload answers", but a pack paper is not on the Worksheets page: it is marked
                from My packs or Home -> "Papers waiting for your answers" (the same route page 2 gives). A pack question bank has no code
                of its own, so it points to the pack's coded papers (as page 2 does) and to the Answer Checker for single answers. In-app
                sheets keep their line (their Worksheets page does take uploads). */}
            {!packFile ? (
              <>
                When done, upload one PDF of all your answers to get it graded with full solutions. Upload your answers at lazytopper.com
                &rarr; Worksheets &rarr; Upload answers{code ? <> (code {code})</> : null}.
              </>
            ) : code ? (
              <>
                When done, upload your answers to get them marked: lazytopper.com &rarr; My packs, or Home &rarr; Papers waiting for your
                answers (code <span className="lt-wsp__nowrap">{code}</span>).
              </>
            ) : (
              <>
                The papers in your pack each carry a paper code: get them marked at lazytopper.com &rarr; My packs, or Home &rarr; Papers
                waiting for your answers. Any single answer from this bank can be checked in the Answer
                Checker at lazytopper.com/check-improve.
              </>
            )}
          </p>
        )}

        {/* Sections */}
        {groups.map(([sec, qs]) => (
          <section key={sec} className="lt-wsp__section">
            <div className="lt-wsp__sechead">
              <div className="lt-wsp__sechrow">
                <span className="lt-wsp__sectitle">{sec === "?" ? "Other questions" : `Section ${sec}`}</span>
                {sec !== "?" && <span className="lt-wsp__sechint">{SECTION_MARK_HINT[sec]}</span>}
              </div>
              <span className="lt-wsp__secrule" />
            </div>

            {qs.map((q) =>
              isAnswers ? (
                <AnswerBlock key={q.qNumber} q={q} section={secOf.get(q.qNumber) ?? ""} renderSolutionFigure={renderSolutionFigure} />
              ) : (
                <QuestionBlock key={q.qNumber} q={q} />
              ),
            )}
          </section>
        ))}

        {isAnswers && (
          <div className="lt-wsp__cta">
            <div className="lt-wsp__ctatext">
              <div className="lt-wsp__ctah">{code ? "Want an examiner to mark this?" : "Self-check done?"}</div>
              <div className="lt-wsp__ctas">
                {code
                  ? `Upload your answers in the LazyTopper app \u2014 your first one is free. Find it on Home under \u201cPapers waiting for your answers\u201d. Paper code: ${code}`
                  : "Each pack has chapter tests too \u2014 take one and get it marked in the LazyTopper app. Your first one is free."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({ q }: { q: PersistedWorksheetQuestion }) {
  const marks = Number(q.marks) || 1;
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  const rules = hasOptions ? 0 : Math.max(2, Math.min(6, marks));
  const optionTexts = hasOptions ? stripOptionLabels(q.options!) : [];
  const source = sourceTagFor(q);
  const sec = String(q.section || "").toUpperCase();
  const oddMarks = SECTION_MARKS[sec] !== undefined && SECTION_MARKS[sec] !== marks;
  return (
    <div className="lt-wsp__q">
      <span className="lt-wsp__qn">Q{q.qNumber}.</span>
      <div className="lt-wsp__qbody">
        <div className="lt-wsp__qtext">
          <MathText text={stripSourceTag(q.questionText)} />
          {oddMarks && <span className="lt-wsp__qmarks">[{marks}]</span>}
        </div>
        <PrintQuestionFigures questionId={q.id} />
        {hasOptions ? (
          <ol className={`lt-wsp__opts lt-wsp__opts--${optionsLayout(optionTexts)}`}>
            {optionTexts.map((opt, oi) => (
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
        {source && <div className="lt-wsp__src">{source}</div>}
      </div>
    </div>
  );
}

/** Index of the option an answer names: a leading "(d)" / "d)" letter, else the option whose text the answer contains; -1 when unknown. */
export function correctOptionIndex(answer: string, options: readonly string[]): number {
  const a = String(answer ?? "").trim();
  const m = /^\(?([a-e])\)?(?:[\s.:]|$)/i.exec(a);
  if (m) {
    const i = m[1].toLowerCase().charCodeAt(0) - 97;
    if (i < options.length) return i;
  }
  const norm = (x: string) => x.replace(/^\s*\(?[a-e]\)\s*/i, "").trim().toLowerCase();
  const na = norm(a);
  return na ? options.findIndex((o) => norm(o) === na) : -1;
}

function AnswerBlock({ q, section, renderSolutionFigure }: { q: PersistedWorksheetQuestion; section: string; renderSolutionFigure?: RenderSolutionFigure }) {
  const marks = Number(q.marks) || 1;
  const steps = Array.isArray(q.solutionSteps) ? q.solutionSteps.filter(Boolean) : [];
  const finalAns = q.finalAnswer || q.answer || "";
  const stepMarks = perStepMarks(marks, steps.length);
  const isObjective = Array.isArray(q.options) && q.options.length > 0;
  // OBJ-NO-STEPMARK-1: an objective question (MCQ / A-R / 1 mark) is 0 or full on the answer alone - ONE chip, no step marks.
  const objectiveKey = isObjectiveSteps(q);
  // An objective question shows its answer at the right of the heading (as in the mock-up); everything else shows
  // its marks there and the "Answer:" line under the steps.
  const answerInHead = isObjective && Boolean(finalAns);
  // Options listed compactly on the key so "(d)" means something; the correct one is marked.
  const keyOptions = isObjective ? stripOptionLabels(q.options!) : [];
  const correctIdx = correctOptionIndex(finalAns, keyOptions);
  return (
    <div className="lt-wsp__sol">
      <div className="lt-wsp__solhead">
        <span className="lt-wsp__sqn">
          Q{q.qNumber}
          {section ? ` \u00b7 Section ${section}` : ""}
        </span>
        <span className="lt-wsp__solmk">{markLabel(marks)}</span>
      </div>
      {answerInHead ? (
        <div className="lt-wsp__ansline" data-testid="key-answer-line">
          Answer: <MathText text={stripSourceTag(finalAns)} />
        </div>
      ) : null}
      {keyOptions.length > 0 && (
        <ol className="lt-wsp__keyopts" data-testid="key-options">
          {keyOptions.map((opt, oi) => (
            <li key={oi} className={oi === correctIdx ? "lt-wsp__keyopt lt-wsp__keyopt--ok" : "lt-wsp__keyopt"} {...(oi === correctIdx ? { "data-correct": "true" } : {})}>
              <span className="lt-wsp__optl">({OPTION_LETTERS[oi] ?? oi + 1})</span> <MathText text={opt} />
              {oi === correctIdx ? <span className="lt-wsp__tick" aria-label="correct answer"> {"\u2713"}</span> : null}
            </li>
          ))}
        </ol>
      )}
      {steps.length > 0 && objectiveKey && (
        <div className="lt-wsp__steps">
          <div className="lt-wsp__step">
            {marks === 1 ? <span className="lt-wsp__chip">{markLabel(1)}</span> : <span className="lt-wsp__chip lt-wsp__chip--none" />}
            <span className="lt-wsp__steptext">
              {steps.map((s, si) => (
                <div key={si} className="lt-wsp__expl">
                  <MathText text={stripSourceTag(stripStepMarks(s))} />
                </div>
              ))}
            </span>
          </div>
        </div>
      )}
      {steps.length > 0 && !objectiveKey && (
        <div className="lt-wsp__steps">
          {steps.map((s, si) => {
            const lead = LEADING_MARK.exec(s);
            const trail = lead ? null : TRAILING_MARK.exec(s);
            const authored = lead ?? trail;
            const body = stripSourceTag(lead ? s.slice(lead[0].length) : trail ? s.slice(0, trail.index) : s);
            const hasOwnMark = /\[\s*[\d\u00bd]/.test(s);
            // A step that works out to 0 marks gets no chip.
            const splitOk = marks > 1 ? true : steps.length === 1;
            const share = stepMarks[si];
            const chip = authored ? markLabel(parseMarkValue(authored[1])) : hasOwnMark || !splitOk || !(share > 0) ? "" : markLabel(share);
            return (
              <div key={si} className="lt-wsp__step">
                {chip ? <span className="lt-wsp__chip">{chip}</span> : <span className="lt-wsp__chip lt-wsp__chip--none" />}
                <span className="lt-wsp__steptext">
                  <MathText text={body} />
                </span>
              </div>
            );
          })}
        </div>
      )}
      {renderSolutionFigure?.(q.id)}
      {finalAns && !answerInHead ? (
        <div className="lt-wsp__final">
          Answer: <MathText text={stripSourceTag(finalAns)} />
        </div>
      ) : !finalAns && steps.length === 0 ? (
        <div className="lt-wsp__nosol">Worked solution not available for this question.</div>
      ) : null}
    </div>
  );
}

const PRINT_CSS = `
.lt-wsp {
  --p-accent: #3fbf82;
  --p-navy: #15233a;
  --p-ink: #0f1b2d;
  --p-body: #0f1b2d;
  --p-muted: #3a4a60;
  --p-line: #c9d1dc;
  --p-line2: #dde3ea;
  --p-chip-bg: #e3f5ec;
  --p-chip-fg: #14573a;
  --p-green: hsl(152, 55%, 30%);
  --p-fd: "Fraunces", Georgia, serif;
  --p-fb: "Inter", ui-sans-serif, system-ui, sans-serif;
  position: relative;
  background: #ffffff;
  color: var(--p-ink);
  font-family: var(--p-fb);
  font-size: 17px;
  line-height: 1.6;
  padding: 0 22px 18px;
  overflow: hidden;
}
.lt-wsp__content { position: relative; z-index: 1; }

.lt-wsp__wm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  display: grid; grid-template-columns: repeat(3, 1fr); align-content: start; gap: 64px 0; padding-top: 70px; }
.lt-wsp__wm span { font-family: var(--p-fd); font-weight: 600; font-size: 30px; color: var(--p-green);
  transform: rotate(-30deg); text-align: center; letter-spacing: 0.05em; white-space: nowrap; }
.lt-wsp__wm--light span { opacity: 0.05; }
.lt-wsp__wm--key span { opacity: 0.10; }

.lt-wsp__mast { display: flex; align-items: center; justify-content: space-between; gap: 14px;
  border-bottom: 1px solid var(--p-line); padding-bottom: 12px; margin-bottom: 4px; }
.lt-wsp__brand { display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0; }
.lt-wsp__logo { width: 32px; height: 32px; border-radius: 8px; display: block; }
.lt-wsp__wmk { height: 30px; width: auto; display: block; }
.lt-wsp__right { font-size: 14px; color: var(--p-muted); text-align: right; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.lt-wsp__titlerow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 18px 0 2px; flex-wrap: wrap; }
.lt-wsp__title { font-family: var(--p-fd); font-weight: 600; font-size: 26px; line-height: 1.2; margin: 0; color: var(--p-ink); }
.lt-wsp__meta { font-size: 14px; color: var(--p-muted); }
.lt-wsp__badge { display: inline-block; background: var(--p-chip-bg); color: var(--p-chip-fg); font-size: 14px;
  font-weight: 600; padding: 2px 10px; border-radius: 6px; }
.lt-wsp__sub { display: flex; gap: 14px; font-size: 14px; color: var(--p-muted); margin-bottom: 2px; }
.lt-wsp__code { font-weight: 600; letter-spacing: 0.06em; }
.lt-wsp__instr { font-size: 15px; color: var(--p-ink); border-radius: 8px;
  padding: 10px 14px; margin: 10px 0 8px; background: #eef1f5; }
.lt-wsp__instr b { color: var(--p-ink); }
.lt-wsp__nowrap { white-space: nowrap; }

.lt-wsp__sechead { margin: 32px 0 18px; }
.lt-wsp__sechrow { display: flex; align-items: baseline; justify-content: space-between; }
.lt-wsp__sectitle { font-family: var(--p-fd); font-weight: 600; font-size: 29px; line-height: 1.2; color: var(--p-ink); }
.lt-wsp__sechint { font-size: 15px; color: var(--p-muted); font-weight: 500; }
.lt-wsp__secrule { display: block; margin-top: 4px; height: 3px; width: 56px; background: var(--p-accent); }

.lt-wsp__q { display: flex; gap: 15px; margin-bottom: 30px; }
.lt-wsp__qn { font-weight: 600; flex-shrink: 0; min-width: 36px; }
.lt-wsp__qbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.lt-wsp__qtext { font-size: 17px; }
.lt-wsp__qmarks { color: var(--p-muted); font-size: 14px; white-space: nowrap; float: right; margin-left: 10px; }
.lt-wsp__opts { list-style: none; margin: 0; padding: 0; color: var(--p-body); display: grid; gap: 6px 9px; }
.lt-wsp__opts--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.lt-wsp__opts--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.lt-wsp__opts--stack { grid-template-columns: minmax(0, 1fr); gap: 5px; }
.lt-wsp__opts li { font-size: 17px; }
.lt-wsp__optl { color: var(--p-body); }
.lt-wsp__ans { display: flex; flex-direction: column; gap: 16px; margin-top: 4px; }
.lt-wsp__rule { display: block; border-bottom: 1px dotted #9aa6b6; height: 0; }
.lt-wsp__src { font-size: 14px; color: var(--p-muted); }

.lt-wsp__sol { margin-bottom: 22px; padding-bottom: 20px; border-bottom: 1px solid var(--p-line2); font-size: 16px; }
.lt-wsp__solhead { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-weight: 600; margin-bottom: 9px; }
.lt-wsp__sqn { color: var(--p-ink); }
.lt-wsp__sqn { white-space: nowrap; }
.lt-wsp__solmk { color: var(--p-ink); text-align: right; white-space: nowrap; }
.lt-wsp__ansline { font-weight: 600; color: var(--p-ink); margin: 0 0 9px; text-align: left; }
.lt-wsp__keyopts { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 3px 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); font-size: 15px; }
.lt-wsp__keyopt--ok { font-weight: 700; color: var(--p-chip-fg); background: var(--p-chip-bg); border-radius: 5px; padding: 0 6px; }
.lt-wsp__expl + .lt-wsp__expl { margin-top: 3px; }
.lt-wsp__steps { display: flex; flex-direction: column; gap: 9px; }
.lt-wsp__step { display: flex; gap: 12px; align-items: flex-start; }
.lt-wsp__chip { flex-shrink: 0; width: 86px; box-sizing: border-box; text-align: center; padding: 1px 8px; border-radius: 6px;
  background: var(--p-chip-bg); color: var(--p-chip-fg); font-weight: 600; font-size: 14px; line-height: 1.6; white-space: nowrap; }
.lt-wsp__chip--none { background: transparent; padding: 0; width: 0; margin-right: -12px; }
.lt-wsp__steptext { min-width: 0; flex: 1; }
.lt-wsp__final { margin-top: 9px; font-weight: 600; color: var(--p-ink); font-size: 16px; }
.lt-wsp__nosol { margin-top: 4px; font-size: 15px; color: var(--p-muted); }

.lt-wsp__cta { margin-top: 28px; padding: 18px 20px; border-radius: 12px; background: var(--p-navy); color: #ffffff;
  display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.lt-wsp__ctatext { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.lt-wsp__ctah { font-weight: 600; font-size: 17px; }
.lt-wsp__ctas { font-size: 15px; color: #e9eef5; }
`;

export default WorksheetPrintDoc;
