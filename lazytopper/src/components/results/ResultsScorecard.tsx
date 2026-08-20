import { useEffect } from "react";
import type { CheckSolutionAnnotatedStep } from "../../ai/aiClient";
import type {
  ScorecardVariant,
  ScorecardScore,
  ScorecardFourType,
  ScorecardGradedAnswer,
  ScorecardMistakeKind,
  ScorecardSplit,
  ScorecardSplitRow,
} from "./scorecardVariants";

/**
 * ResultsScorecard — Progress-Journey ARC · PR-2: the ONE Universal <ResultsScorecard>,
 * extracted from the shipped WorksheetScorecard (PR-A). It is the shared SHELL — the
 * navy `#15233a` body + white footer, the responsive centered modal (~540px) on desktop
 * that reflows to a grab-handled bottom sheet on mobile at 1024px, Escape / ✕ / dim /
 * action all close (a summary, not a gate) — and it renders a per-surface VARIANT
 * (scorecardVariants.ts) for the four flex-points: score model, framing line, the MI
 * four-type block, and the actions.
 *
 * It only PRESENTS a variant: no numbers are invented here, pending stays honest (never
 * a deflated 0), the four-type block renders only when typed mistakes exist, and a
 * 0-attempted quick-practice session shows an honest empty state. The durable session
 * record is written UPSTREAM by the grading service (worksheets) — Quick Practice writes
 * none (LOCKED §1a) — so this component performs no writes.
 *
 * All FOUR LIVE variants are wired: Quick Practice, Worksheet, Chapter Test (#374/#380)
 * and Full Mock (#387). The legacy `deferred` stubs remain defined in
 * scorecardVariants.ts; a deferred variant is still treated as a no-op here (the guard).
 */

interface ResultsScorecardProps {
  variant: ScorecardVariant;
  onClose: () => void;
}

/** The score hero + descriptor — marks (worksheet/tests) or attempts (quick practice). */
function ScoreHero({ score }: { score: ScorecardScore }) {
  if (score.kind === "marks") {
    // The "across G of T graded" descriptor renders only when both counts are present
    // (the LIVE worksheet variant always passes them; a stored re-open may omit them to
    // avoid a fabricated count — honest-or-silent).
    const hasCounts = score.gradedCount != null && score.totalQuestions != null;
    return (
      <div className="lt-sc__top">
        <div className="lt-sc__big">
          {score.awarded}
          <small> / {score.total}</small>
        </div>
        {hasCounts && (
          <div className="lt-sc__desc">
            across {score.gradedCount} of {score.totalQuestions}
            <br />
            question{score.totalQuestions === 1 ? "" : "s"} graded
          </div>
        )}
      </div>
    );
  }
  // attempts — "X of N attempted" (never marks/total, D-PROG-2).
  const accuracy = score.mcqAnswered > 0 ? Math.round((score.mcqCorrect / score.mcqAnswered) * 100) : null;
  return (
    <div className="lt-sc__top">
      <div className="lt-sc__big">
        {score.attempted}
        <small> of {score.ofN}</small>
      </div>
      <div className="lt-sc__desc">
        question{score.ofN === 1 ? "" : "s"}
        <br />
        attempted
        {score.mcqAnswered > 0 && (
          <>
            <br />
            <span className="lt-sc__mcq">
              {score.mcqCorrect}/{score.mcqAnswered} MCQ{score.mcqAnswered === 1 ? "" : "s"} correct
              {accuracy !== null ? ` · ${accuracy}% accuracy` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** One row of a scorecard lens (by-section A–D, or by-concept subtopics). */
interface LensRow {
  id: string;
  label: string;
  awarded: number;
  total: number;
}

/** A scorecard lens block — the shared "label · awarded/total" grid used by BOTH the
 *  chapter-test BY-SECTION lens (spec §5) and the BY-CONCEPT lens ([FU-CT-CONCEPT-LENS]).
 *  Derived at render (D3); presentational only, writes nothing. */
function LensBlock({ heading, rows }: { heading: string; rows: LensRow[] }) {
  return (
    <>
      <div className="lt-sc__mbk">{heading}</div>
      <div className="lt-sc__seclens">
        {rows.map((r) => (
          <div className="lt-sc__seclens-row" key={r.id}>
            <span className="lt-sc__seclens-lbl">{r.label}</span>
            <span className="lt-sc__seclens-mk">
              {r.awarded}/{r.total}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** The full-mock BY-CHAPTER lens (spec §5): per-chapter score BARS + the one
 *  honest sentence ("Trigonometry cost you 9 marks — the biggest loss"). Fully
 *  class-driven (§7 — no inline style objects): the fill width is the real
 *  awarded/total ratio quantised to 5% width classes (visually lossless on a
 *  6px bar), the tone by the same ratio. Derived upstream; renders only what it
 *  is given. */
function ChapterLensBlock({
  rows,
  note,
}: {
  rows: Array<{ id: string; label: string; awarded: number; total: number }>;
  note?: string | null;
}) {
  return (
    <>
      <div className="lt-sc__mbk">
        By chapter <span className="lt-sc__mbk-soft">· where the paper hurt</span>
      </div>
      <div className="lt-sc__chlens">
        {rows.map((r) => {
          const ratio = r.total > 0 ? Math.max(0, Math.min(1, r.awarded / r.total)) : 0;
          const tone = ratio < 0.5 ? "low" : ratio < 0.75 ? "mid" : "good";
          const step = Math.round(ratio * 20) * 5; // 0..100 in 5% steps
          return (
            <div className="lt-sc__chb" key={r.id}>
              <div className="lt-sc__chb-hd">
                <span>{r.label}</span>
                <b>
                  {r.awarded}/{r.total}
                </b>
              </div>
              <div className="lt-sc__chtrack">
                <i className={`lt-sc__chfill lt-sc__chfill--${tone} lt-sc__chw-${step}`} />
              </div>
            </div>
          );
        })}
      </div>
      {note && <div className="lt-sc__chnote">{note}</div>}
    </>
  );
}

/**
 * ★★ THE ONE CARELESS SENTENCE, DEFINED ONCE.
 *
 * `silly` and `presentation` are careless mark-loss — a slip on the final line, a missing
 * unit, a step used but never stated. They are NEVER a topic weakness, and this component
 * now says so in TWO places: the four-type block's careless column and the graded answer
 * sheet. Duplicated copy drifts, and the drift that matters here is a student being told
 * a slip means they are weak at a topic — so both renderers read the same constant.
 *
 * ★ THE SPEC ASKED FOR `ProgressWindowArc`'s honesty copy BY IMPORT. It exports none —
 * its only careless line lives inside its JSX, and it is a Firestore-backed component
 * whose import would drag `studentCloudStore` into this shell. The anti-drift move that
 * was actually available is this one: the two renderers that share the claim live in
 * THIS file, so the constant does too.
 */
const CARELESS_NOT_A_WEAKNESS = "Slips on the final line / units — slow down, these aren’t weak topics.";

/** The two MI kinds that are carelessness rather than a knowledge gap. */
const CARELESS_KINDS: ScorecardMistakeKind[] = ["silly", "presentation"];
const isCareless = (kind: ScorecardMistakeKind | null | undefined) =>
  kind != null && CARELESS_KINDS.includes(kind);

/** One line of the set scorecard's MCQ/written split. */
function SplitRow({ row }: { row: ScorecardSplitRow }) {
  return (
    <div className={`lt-sc__splitrow lt-sc__splitrow--${row.tone}`}>
      <span className="lt-sc__splittag">{row.tag}</span>
      <span className="lt-sc__splitdet">{row.detail}</span>
    </div>
  );
}

/**
 * BATCH-2 · the MCQ/written split. ★ The two headings are the prototype's, verbatim:
 * MCQs are scored locally and cost the student nothing, written working is what the one
 * batch call reads. Each half renders only when it has rows — an empty group is silence,
 * never an empty heading.
 */
function SplitBlock({ split }: { split: ScorecardSplit }) {
  return (
    <>
      {split.markedNow.length > 0 && (
        <>
          <div className="lt-sc__mbk">Marked now · free</div>
          <div className="lt-sc__splitlist">
            {split.markedNow.map((r) => (
              <SplitRow key={`now-${r.tag}`} row={r} />
            ))}
          </div>
        </>
      )}
      {split.readyToGrade.length > 0 && (
        <>
          <div className="lt-sc__mbk">Diagnosed from your working</div>
          <div className="lt-sc__splitlist">
            {split.readyToGrade.map((r) => (
              <SplitRow key={`grade-${r.tag}`} row={r} />
            ))}
          </div>
        </>
      )}
      {split.nothingSavedNote && <p className="lt-sc__splitnote">{split.nothingSavedNote}</p>}
    </>
  );
}

/**
 * BATCH-2 · ONE answer on the graded sheet — the same depth Check & Improve gives today.
 *
 * ★★ THE MARK IS RENDERED ONLY WHEN BOTH FIGURES ARE REAL NUMBERS. There is no
 * placeholder branch, no "—", and no `?? 0`: a question the batch could not grade shows
 * its honest ungraded state and NO mark at all (CLAUDE.md §5 — no fake data).
 *
 * ★ An OBJECTIVE question is whole-mark-or-nothing whatever its working shows — and it
 * still carries a mistake type, because the working is read for DIAGNOSIS. Both facts
 * render together here; the builder is what makes a fraction impossible.
 */
/**
 * GRADED-STEP-BLOCK - the student's own marked working, step by step.
 *
 * SHAPE REUSED, NOT REINVENTED: `CheckSolutionAnnotatedStep` (src/ai/aiClient.ts), the same
 * shape `StepRow` (worksheet) and `AnnotatedStepRow` (C&I) already consume. The status ->
 * tone mapping and the objective mark-chip suppression are deliberately IDENTICAL to
 * `StepRow`'s, so one truth reads the same way wherever a student meets it.
 *
 * ONE DELIBERATE ADDITION over `StepRow`: this renders `studentWork`. The whole point of the
 * block on a Chapter Test / Full Mock scorecard is that the student sees WHAT THEY WROTE
 * beside the mark it earned; the worksheet panel shows it in the page around the steps.
 *
 * ONE DELIBERATE OMISSION: no per-step mistake-type tag. `StepRow` renders one via a label
 * map local to the worksheet panel, and importing that map here would couple the universal
 * shell to a worksheet component for a chip the card already shows at answer level.
 *
 * HALF MARKS ARE REAL and render as halves - CBSE awards 0.5 for a correct formula alone.
 * No rounding, anywhere in this block.
 */
function GradedStepRow({ step, objective }: { step: CheckSolutionAnnotatedStep; objective?: boolean }) {
  const tone =
    step.status === "correct"
      ? "ok"
      : step.status === "incorrect"
        ? "bad"
        : step.status === "missing"
          ? "miss"
          : "part";
  return (
    <li className={`lt-sc__gst lt-sc__gst--${tone}`}>
      <div className="lt-sc__gst-head">
        <span className="lt-sc__gst-n">Step {step.stepNumber}</span>
        <span className="lt-sc__gst-desc">{step.description}</span>
        {/* Objective question -> per-step marks are zeroed BY DESIGN (the whole mark lives
            at answer level), so the "0" chip would be misleading. Suppress the chip, keep
            every annotation. Same rule as `StepRow`. */}
        {!objective && (
          <span className="lt-sc__gst-mk">
            {step.marksAwarded > 0
              ? `+${step.marksAwarded}`
              : step.marksDeducted > 0
                ? `−${step.marksDeducted}`
                : "0"}
          </span>
        )}
      </div>
      {step.studentWork && <div className="lt-sc__gst-work">{step.studentWork}</div>}
      {step.teacherAnnotation && <div className="lt-sc__gst-note">{step.teacherAnnotation}</div>}
      {step.correctedWorking && (
        <div className="lt-sc__gst-fix">Should be: {step.correctedWorking}</div>
      )}
    </li>
  );
}

/** HONEST EMPTY STATE. No steps -> this renders NOTHING AT ALL: no heading, no panel, no
 *  zeros. Absent means unknowable, and a surface that supplies no steps looks exactly as it
 *  did before the field existed. */
function GradedStepBlock({ answer }: { answer: ScorecardGradedAnswer }) {
  if (!Array.isArray(answer.steps) || answer.steps.length === 0) return null;
  return (
    <div className="lt-sc__gsteps">
      <div className="lt-sc__gst-hd">Your working, step by step</div>
      <ol className="lt-sc__gstlist">
        {answer.steps.map((s) => (
          <GradedStepRow key={s.stepNumber} step={s} objective={answer.objective} />
        ))}
      </ol>
    </div>
  );
}

function GradedAnswerCard({ answer }: { answer: ScorecardGradedAnswer }) {
  const hasMark = typeof answer.awarded === "number" && typeof answer.available === "number";
  const tone = !hasMark
    ? "none"
    : answer.awarded === 0
      ? "zero"
      : answer.awarded === answer.available
        ? "full"
        : "part";
  const careless = isCareless(answer.mistakeKind);
  return (
    <div className="lt-sc__ga">
      <div className="lt-sc__ga-top">
        <span className="lt-sc__ga-n">
          {answer.label}
          {answer.descriptor ? ` · ${answer.descriptor}` : ""}
        </span>
        {hasMark && (
          <span className={`lt-sc__ga-score lt-sc__ga-score--${tone}`}>
            {answer.awarded} / {answer.available}
          </span>
        )}
      </div>
      {answer.verdict && <p className="lt-sc__ga-verdict">{answer.verdict}</p>}
      {answer.ungraded && (
        <div className="lt-sc__ga-ungraded">
          <b>{answer.ungraded.title}</b> {answer.ungraded.detail}
        </div>
      )}
      {answer.lostDetail && (
        <div className="lt-sc__ga-lost">
          {answer.lostLabel && <b>{answer.lostLabel}</b>}
          {answer.lostLabel ? " " : ""}
          {answer.lostDetail}
        </div>
      )}
      <GradedStepBlock answer={answer} />
      {answer.mistakeType && (
        <div
          className={`lt-sc__ga-mtype lt-sc__ga-mtype--${careless ? "careless" : "gap"}`}
          data-mistake-kind={answer.mistakeKind ?? undefined}
        >
          {answer.mistakeType}
        </div>
      )}
    </div>
  );
}

/**
 * The id the "Read my graded answer sheet" action scrolls to.
 *
 * WHY AN ANCHOR AND NOT A STATE FLAG: the sheet is ALREADY rendered inside the scorecard
 * whenever the surface supplies graded answers. The affordance was never asking for the
 * sheet to be BUILT - it was asking to be TAKEN there. Scrolling is therefore the whole
 * job, and it keeps the student inside the panel they were reading.
 */
export const GRADED_SHEET_ANCHOR_ID = "lt-sc-graded-sheet";

/**
 * Take the student to their graded answer sheet inside the open scorecard.
 *
 * ⚠ THIS REPLACES A `setScorecardOpen(false)` CALL ON CHAPTER TEST AND FULL MOCK. That call
 * was never a "dead" handler: on Check & Improve the identical call is CORRECT, because C&I
 * renders a bespoke graded view in the page body underneath and closing the modal is how a
 * student reaches it (see DesktopCheckImprovePage.tsx, "the bespoke graded views below stay
 * byte-intact underneath"). Chapter Test and Full Mock have no such view underneath, so the
 * same call dropped the student onto a summary card whose only primary action reopened the
 * panel they had just left. A WORKING PATTERN WITH NO DESTINATION, not a dead call.
 */
export function revealGradedSheet(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(GRADED_SHEET_ANCHOR_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** The graded answer sheet. The careless sentence renders ONCE, under the sheet, and
 *  only when a careless mistake type actually appeared — an honest footnote rather than
 *  a per-card refrain. */
function GradedSheetBlock({ answers }: { answers: ScorecardGradedAnswer[] }) {
  const anyCareless = answers.some((a) => isCareless(a.mistakeKind));
  return (
    <>
      <div id={GRADED_SHEET_ANCHOR_ID} className="lt-sc__mbk lt-sc__mbk--sheet">Your graded answers</div>
      <div className="lt-sc__galist">
        {answers.map((a) => (
          <GradedAnswerCard key={a.label} answer={a} />
        ))}
      </div>
      {anyCareless && <p className="lt-sc__ga-carenote">{CARELESS_NOT_A_WEAKNESS}</p>}
    </>
  );
}

/** The MI four-type block — "Where your marks went" (Knowledge gaps vs Careless). */
function FourTypeBlock({ ft }: { ft: ScorecardFourType }) {
  return (
    <>
      <div className="lt-sc__mbk">Where your marks went</div>
      <div className="lt-sc__groups">
        <div className="lt-sc__col lt-sc__col--know">
          <div className="lt-sc__gh">Knowledge gaps — worth practising</div>
          <div className="lt-sc__row">
            <span className="lt-sc__sw lt-sc__sw--con" />Conceptual
            <span className="lt-sc__ct">{ft.conceptual}</span>
          </div>
          <div className="lt-sc__row">
            <span className="lt-sc__sw lt-sc__sw--cal" />Calculation
            <span className="lt-sc__ct">{ft.calculation}</span>
          </div>
        </div>
        <div className="lt-sc__col lt-sc__col--care">
          <div className="lt-sc__gh">Careless mark-loss — not a weakness</div>
          <div className="lt-sc__row">
            <span className="lt-sc__sw lt-sc__sw--silly" />Silly
            <span className="lt-sc__ct">{ft.silly}</span>
          </div>
          <div className="lt-sc__row">
            <span className="lt-sc__sw lt-sc__sw--pres" />Presentation
            <span className="lt-sc__ct">{ft.presentation}</span>
          </div>
          {(ft.silly > 0 || ft.presentation > 0) && (
            <div className="lt-sc__care-note">{CARELESS_NOT_A_WEAKNESS}</div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ResultsScorecard({ variant, onClose }: ResultsScorecardProps) {
  // Close on Escape — modal etiquette without a modal library.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Guard: a deferred (chapter-test / full-mock) config seam is never rendered live.
  if (variant.deferred) return null;

  const allPending = variant.allPending;
  const ariaLabel = variant.surface === "worksheet" ? "Worksheet scorecard" : "Session scorecard";

  return (
    <div
      className="lt-sc__dim"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <style>{SC_CSS}</style>
      <div className="lt-sc__card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-sc__grab" aria-hidden="true" />
        <div className="lt-sc__body">
          <div className="lt-sc__head">
            <div>
              <div className="lt-sc__nm">{variant.title}</div>
              <div className="lt-sc__code">{variant.subtitle}</div>
            </div>
            <button type="button" className="lt-sc__x" onClick={onClose} aria-label="Close">✕</button>
          </div>

          {allPending ? (
            <div className="lt-sc__allpend">
              <div className="lt-sc__allpend-t">{allPending.title}</div>
              <p className="lt-sc__allpend-d">{allPending.detail}</p>
            </div>
          ) : (
            <>
              <ScoreHero score={variant.score} />

              {variant.pending && (
                <div className="lt-sc__pend">
                  <b>
                    {variant.pending.count} question{variant.pending.count === 1 ? "" : "s"} couldn’t be read
                  </b>{" "}
                  — re-upload those pages to complete your score. Worksheet is worth{" "}
                  {variant.pending.worksheetTotalMarks} marks in total.
                </div>
              )}

              {variant.message && <p className="lt-sc__msg">{variant.message}</p>}
              {variant.note && <p className="lt-sc__note">{variant.note}</p>}

              {variant.sectionLens && variant.sectionLens.length > 0 && (
                <LensBlock
                  heading="By section"
                  rows={variant.sectionLens.map((r) => ({
                    id: r.section,
                    label: r.label,
                    awarded: r.awarded,
                    total: r.total,
                  }))}
                />
              )}
              {variant.chapterLens && variant.chapterLens.length > 0 && (
                <ChapterLensBlock
                  rows={variant.chapterLens.map((r) => ({
                    id: r.key,
                    label: r.label,
                    awarded: r.awarded,
                    total: r.total,
                  }))}
                  note={variant.chapterLensNote}
                />
              )}
              {variant.conceptLens && variant.conceptLens.length > 0 && (
                <LensBlock
                  heading="By concept"
                  rows={variant.conceptLens.map((r) => ({
                    id: r.key,
                    label: r.label,
                    awarded: r.awarded,
                    total: r.total,
                  }))}
                />
              )}
              {variant.split && <SplitBlock split={variant.split} />}
              {variant.fourType && <FourTypeBlock ft={variant.fourType} />}
              {variant.gradedAnswers && variant.gradedAnswers.length > 0 && (
                <GradedSheetBlock answers={variant.gradedAnswers} />
              )}
            </>
          )}
        </div>

        {variant.stackActions ? (
          <div className="lt-sc__menu">
            {variant.actionsHeading && <div className="lt-sc__what">{variant.actionsHeading}</div>}
            <div className="lt-sc__menulist">
              {variant.actions.map((a, i) => (
                <button
                  key={`${a.label}-${i}`}
                  type="button"
                  className={`lt-sc__mi ${a.tone === "primary" ? "lt-sc__mi--primary" : "lt-sc__mi--plain"}`}
                  onClick={a.onClick}
                  disabled={a.disabled || a.busy}
                >
                  {a.tag && <span className="lt-sc__mitag">{a.tag}</span>}
                  <span className="lt-sc__milbl">{a.busy ? a.busyLabel : a.label}</span>
                </button>
              ))}
            </div>
            {variant.footnote && <p className="lt-sc__foot">{variant.footnote}</p>}
          </div>
        ) : (
          <div className="lt-sc__actions">
            {variant.actions.map((a, i) => (
              <button
                key={`${a.label}-${i}`}
                type="button"
                className={`lt-sc__btn ${a.tone === "primary" ? "lt-sc__btn--primary" : "lt-sc__btn--ghost"}`}
                onClick={a.onClick}
                disabled={a.disabled || a.busy}
              >
                {a.busy ? a.busyLabel : a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SC_CSS = `
.lt-sc__dim {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(20, 35, 58, 0.5);
  -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
.lt-sc__card {
  background: #fff; border-radius: 22px; width: 100%; max-width: 540px;
  box-shadow: 0 30px 80px rgba(20, 35, 58, 0.5); overflow: hidden;
  animation: lt-sc-pop 0.22s ease;
  /* ★ DESKTOP SCROLL CEILING. The dim is position:fixed, so a card taller than the
     viewport put its own head AND its footer out of reach with nothing to scroll — found
     by a 1024px screenshot of the graded answer sheet, which is the first variant long
     enough to hit it. A no-op for every short variant (a ceiling only bites when the
     content reaches it), and the mobile bottom-sheet rules below still override. The dim
     padding is 24px a side, hence the 48px. */
  max-height: calc(100vh - 48px); overflow-y: auto;
}
@keyframes lt-sc-pop { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.lt-sc__grab { display: none; }

.lt-sc__body { background: #15233a; color: #fff; padding: 30px 34px 28px; }
.lt-sc__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 12px; }
.lt-sc__nm { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 18px; }
.lt-sc__code { font-size: 11.5px; color: #9fb0c6; letter-spacing: 0.05em; margin-top: 5px; }
.lt-sc__x { color: #8090a6; font-size: 18px; cursor: pointer; padding: 2px 6px; background: none; border: none; flex-shrink: 0; }

.lt-sc__top { display: flex; align-items: baseline; gap: 16px; margin-bottom: 14px; }
.lt-sc__big { font-family: "Fraunces", Georgia, serif; font-size: 58px; font-weight: 700; line-height: 0.95; }
.lt-sc__big small { font-size: 28px; color: #8294ad; }
.lt-sc__desc { font-size: 14px; color: #cfd7e2; padding-bottom: 6px; line-height: 1.3; }
.lt-sc__mcq { color: #9fb0c6; }

.lt-sc__pend {
  background: rgba(232, 183, 101, 0.12); border-left: 3px solid #e8b765; border-radius: 8px;
  padding: 11px 15px; font-size: 12.5px; color: #f0cf9a; margin-bottom: 26px; line-height: 1.55;
}
.lt-sc__pend b { color: #f6dcab; }

/* Quick-practice honest framing + nudge (navy body). */
.lt-sc__msg { font-size: 13.5px; color: #e3e9f1; margin: 0 0 10px; line-height: 1.55; font-weight: 600; }
.lt-sc__note { font-size: 13px; color: #cfd7e2; margin: 0 0 4px; line-height: 1.55; }

.lt-sc__mbk { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #8294ad; margin-bottom: 16px; }

/* Chapter-test by-section lens (A–D). */
.lt-sc__seclens { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 22px; margin-bottom: 24px; }
.lt-sc__seclens-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.lt-sc__seclens-lbl { font-size: 13.5px; color: #cfd7e2; }
.lt-sc__seclens-mk { font-weight: 700; color: #fff; font-size: 15px; font-variant-numeric: tabular-nums; }

/* Full-mock by-chapter lens — score bars (§7: fully class-driven; 5% width steps). */
.lt-sc__mbk-soft { font-weight: 500; text-transform: none; letter-spacing: 0; }
.lt-sc__chlens { margin-bottom: 8px; }
.lt-sc__chb { margin-bottom: 11px; }
.lt-sc__chb-hd { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 12.5px; color: #c7d0dd; margin-bottom: 5px; }
.lt-sc__chb-hd b { color: #fff; font-variant-numeric: tabular-nums; }
.lt-sc__chtrack { height: 6px; background: rgba(255,255,255,.12); border-radius: 4px; overflow: hidden; }
.lt-sc__chfill { display: block; height: 100%; border-radius: 4px; }
.lt-sc__chfill--good { background: #34c78a; }
.lt-sc__chfill--mid { background: #e0912f; }
.lt-sc__chfill--low { background: #e0495f; }
.lt-sc__chw-0 { width: 0%; } .lt-sc__chw-5 { width: 5%; } .lt-sc__chw-10 { width: 10%; }
.lt-sc__chw-15 { width: 15%; } .lt-sc__chw-20 { width: 20%; } .lt-sc__chw-25 { width: 25%; }
.lt-sc__chw-30 { width: 30%; } .lt-sc__chw-35 { width: 35%; } .lt-sc__chw-40 { width: 40%; }
.lt-sc__chw-45 { width: 45%; } .lt-sc__chw-50 { width: 50%; } .lt-sc__chw-55 { width: 55%; }
.lt-sc__chw-60 { width: 60%; } .lt-sc__chw-65 { width: 65%; } .lt-sc__chw-70 { width: 70%; }
.lt-sc__chw-75 { width: 75%; } .lt-sc__chw-80 { width: 80%; } .lt-sc__chw-85 { width: 85%; }
.lt-sc__chw-90 { width: 90%; } .lt-sc__chw-95 { width: 95%; } .lt-sc__chw-100 { width: 100%; }
.lt-sc__chnote { font-size: 11.5px; color: #8695ac; font-style: italic; margin: 2px 0 22px; line-height: 1.5; }

.lt-sc__groups { display: flex; gap: 34px; }
.lt-sc__col { flex: 1; min-width: 0; }
.lt-sc__gh { font-size: 12.5px; font-weight: 700; margin-bottom: 13px; }
.lt-sc__col--know .lt-sc__gh { color: #ff9d9d; }
.lt-sc__col--care .lt-sc__gh { color: #ffd28a; }
.lt-sc__row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #e3e9f1; margin-bottom: 11px; }
.lt-sc__sw { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }
.lt-sc__sw--con { background: #ef4444; }
.lt-sc__sw--cal { background: #e8930c; }
.lt-sc__sw--silly { background: #f97316; }
.lt-sc__sw--pres { background: #3b82f6; }
.lt-sc__ct { margin-left: auto; font-weight: 700; color: #fff; font-size: 15px; }
.lt-sc__care-note { font-size: 11px; color: #8294ad; font-style: italic; margin-top: 8px; line-height: 1.5; }

/* ── BATCH-2 · the MCQ/written split (navy body; the shell's own grammar, not the
      mockup's white cards — the prototype draws these on paper, the product does not). ── */
.lt-sc__splitlist { margin-bottom: 22px; }
.lt-sc__splitrow {
  display: flex; align-items: flex-start; gap: 11px; padding: 9px 12px; margin-bottom: 7px;
  border-radius: 9px; font-size: 13px; line-height: 1.45; color: #e3e9f1;
  background: rgba(255, 255, 255, 0.05); border-left: 3px solid #4a5c78;
}
.lt-sc__splitrow--good { background: rgba(52, 199, 138, 0.11); border-left-color: #34c78a; }
.lt-sc__splitrow--miss { background: rgba(224, 73, 95, 0.12); border-left-color: #e0495f; }
.lt-sc__splitrow--pending { background: rgba(232, 183, 101, 0.12); border-left-color: #e8b765; }
.lt-sc__splitrow--diagnose { background: rgba(139, 122, 237, 0.14); border-left-color: #8b7aed; }
.lt-sc__splittag {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;
  color: #9fb0c6; min-width: 26px; flex-shrink: 0; padding-top: 1px;
}
.lt-sc__splitdet { flex: 1; min-width: 0; }
.lt-sc__splitnote { font-size: 11.5px; color: #8695ac; font-style: italic; margin: -12px 0 22px; line-height: 1.5; }

/* ── BATCH-2 · the graded answer sheet ── */
/* The four-type block's careless note is the last thing in its right-hand column, so the
   sheet heading rode up beside it (1024px screenshot). Modifier only — no existing
   element carries it, so every other block keeps its current spacing exactly. */
.lt-sc__mbk--sheet { margin-top: 26px; }
.lt-sc__galist { margin-bottom: 6px; }
.lt-sc__ga {
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 11px; padding: 13px 15px; margin-bottom: 10px;
}
.lt-sc__ga-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.lt-sc__ga-n {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: #9fb0c6;
}
.lt-sc__ga-score {
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 17px;
  font-variant-numeric: tabular-nums; flex-shrink: 0; white-space: nowrap;
}
.lt-sc__ga-score--full { color: #4fd6a0; }
.lt-sc__ga-score--part { color: #f0b45e; }
.lt-sc__ga-score--zero { color: #ff8a9c; }
.lt-sc__ga-verdict { font-size: 13.5px; color: #e3e9f1; margin: 0; line-height: 1.5; }
.lt-sc__ga-lost {
  background: rgba(224, 73, 95, 0.12); border-left: 3px solid #e0495f; border-radius: 0 8px 8px 0;
  padding: 9px 12px; margin-top: 9px; font-size: 12.5px; color: #f2d3d8; line-height: 1.55;
}
.lt-sc__ga-lost b { color: #ff9aa8; }
.lt-sc__ga-ungraded {
  background: rgba(232, 183, 101, 0.12); border-left: 3px solid #e8b765; border-radius: 0 8px 8px 0;
  padding: 9px 12px; margin-top: 9px; font-size: 12.5px; color: #f0cf9a; line-height: 1.55;
}
.lt-sc__ga-ungraded b { color: #f6dcab; }
.lt-sc__ga-mtype {
  display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.02em;
  padding: 3px 9px; border-radius: 6px; margin-top: 9px;
}
.lt-sc__ga-mtype--gap { background: rgba(239, 68, 68, 0.16); color: #ffb3b3; }
.lt-sc__ga-mtype--careless { background: rgba(232, 147, 12, 0.16); color: #ffd28a; }
.lt-sc__ga-carenote { font-size: 11.5px; color: #8695ac; font-style: italic; margin: 4px 0 0; line-height: 1.5; }
/* GRADED-STEP-BLOCK - the student's own marked working inside a graded answer card.
   Tones mirror the worksheet panel's step states so one truth reads the same everywhere.
   No rule here renders when steps is absent: the block returns null before any of it.
   (No backticks in this comment - the whole stylesheet is a template literal.) */
.lt-sc__gsteps { margin-top: 9px; }
.lt-sc__gst-hd {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  color: #9fb0c6; margin-bottom: 6px;
}
.lt-sc__gstlist { list-style: none; margin: 0; padding: 0; }
.lt-sc__gst {
  border-left: 2px solid rgba(255, 255, 255, 0.14);
  padding: 6px 0 6px 10px; margin-bottom: 7px;
}
.lt-sc__gst--ok { border-left-color: #4fd6a0; }
.lt-sc__gst--part { border-left-color: #f2c879; }
.lt-sc__gst--bad { border-left-color: #ef8686; }
.lt-sc__gst--miss { border-left-color: #8695ac; }
.lt-sc__gst-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.lt-sc__gst-n {
  font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase;
  color: #8695ac; flex-shrink: 0;
}
.lt-sc__gst-desc { font-size: 12.5px; color: #d7e0ec; line-height: 1.45; flex: 1 1 auto; }
.lt-sc__gst-mk {
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 13px;
  font-variant-numeric: tabular-nums; color: #cfd9e6; flex-shrink: 0; white-space: nowrap;
}
.lt-sc__gst-work {
  font-family: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px; color: #eaf1f8; background: rgba(255, 255, 255, 0.05);
  border-radius: 7px; padding: 6px 9px; margin-top: 5px; line-height: 1.5;
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.lt-sc__gst-note { font-size: 12px; color: #a9b8cc; margin-top: 5px; line-height: 1.5; }
.lt-sc__gst-fix { font-size: 12px; color: #9ee6c4; margin-top: 4px; line-height: 1.5; }

/* The step block reflows with the sheet on the mobile bottom-sheet breakpoint - the mark
   chip drops under the description rather than squeezing it to one word per line. */
@media (max-width: 1023px) {
  .lt-sc__gst-head { gap: 6px; }
  .lt-sc__gst-desc { flex: 1 1 100%; order: 3; }
}


.lt-sc__allpend { padding: 8px 0 18px; }
.lt-sc__allpend-t { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 22px; margin-bottom: 8px; }
.lt-sc__allpend-d { font-size: 13.5px; color: #cfd7e2; line-height: 1.55; }

.lt-sc__actions { display: flex; gap: 13px; padding: 20px 26px; background: #fff; }
.lt-sc__btn {
  flex: 1; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 600; font-size: 14.5px;
  border-radius: 13px; padding: 15px 16px; cursor: pointer; border: none; text-align: center;
}
.lt-sc__btn--ghost { background: #fff; color: #15233a; border: 1.5px solid hsl(152, 55%, 45%); }
.lt-sc__btn--primary { background: hsl(152, 55%, 45%); color: #fff; box-shadow: 0 4px 12px hsla(152, 55%, 45%, 0.32); }
.lt-sc__btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

/* Quick-practice what-next menu (white footer). */
.lt-sc__menu { padding: 20px 26px 22px; background: #fff; }
.lt-sc__what { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #6b7a90; margin-bottom: 12px; }
.lt-sc__menulist { display: flex; flex-direction: column; gap: 10px; }
.lt-sc__mi {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 600; font-size: 14px;
  border-radius: 12px; padding: 13px 15px;
}
.lt-sc__mi--plain { background: #f2f5f9; color: #15233a; border: 1px solid #e4e9f0; }
.lt-sc__mi--primary { background: hsl(152, 55%, 45%); color: #fff; border: none; box-shadow: 0 4px 12px hsla(152, 55%, 45%, 0.28); }
.lt-sc__mi:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.lt-sc__mitag { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; min-width: 34px; opacity: 0.7; }
.lt-sc__mi--primary .lt-sc__mitag { opacity: 0.85; }
.lt-sc__milbl { flex: 1; }
.lt-sc__foot { font-size: 11.5px; color: #6b7a90; margin: 14px 0 0; line-height: 1.5; }

/* ── Mobile: bottom sheet + stacked groups/buttons (reflow at 1024px) ── */
@media (max-width: 1023px) {
  .lt-sc__dim { align-items: flex-end; padding: 0; }
  .lt-sc__card { max-width: 100%; border-radius: 24px 24px 0 0; max-height: 92%; overflow-y: auto; animation: lt-sc-up 0.28s ease; }
  @keyframes lt-sc-up { from { transform: translateY(40px); opacity: 0.4; } to { transform: translateY(0); opacity: 1; } }
  .lt-sc__grab { display: block; width: 38px; height: 4px; background: rgba(255, 255, 255, 0.3); border-radius: 99px; margin: 10px auto 0; }
  .lt-sc__body { padding: 8px 24px 24px; }
  .lt-sc__head { margin: 14px 0 18px; }
  .lt-sc__big { font-size: 50px; }
  .lt-sc__big small { font-size: 24px; }
  .lt-sc__seclens { grid-template-columns: 1fr; gap: 8px; }
  .lt-sc__groups { flex-direction: column; gap: 18px; }
  .lt-sc__actions { flex-direction: column; gap: 10px; padding: 16px 20px 22px; }
  .lt-sc__btn--primary { order: 1; }
  .lt-sc__btn--ghost { order: 2; }
  .lt-sc__menu { padding: 16px 20px 22px; }
}
`;
