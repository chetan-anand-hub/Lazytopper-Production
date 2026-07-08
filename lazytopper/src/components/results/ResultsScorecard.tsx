import { useEffect } from "react";
import type { ScorecardVariant, ScorecardScore, ScorecardFourType } from "./scorecardVariants";

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
 * Two LIVE variants are wired (Quick Practice, Worksheet). Chapter Test + Full Mock are
 * defined-but-`deferred` config seams; a deferred variant is treated as a no-op here.
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
            <div className="lt-sc__care-note">
              Slips on the final line / units — slow down, these aren’t weak topics.
            </div>
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

              {variant.fourType && <FourTypeBlock ft={variant.fourType} />}
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
  .lt-sc__groups { flex-direction: column; gap: 18px; }
  .lt-sc__actions { flex-direction: column; gap: 10px; padding: 16px 20px 22px; }
  .lt-sc__btn--primary { order: 1; }
  .lt-sc__btn--ghost { order: 2; }
  .lt-sc__menu { padding: 16px 20px 22px; }
}
`;
