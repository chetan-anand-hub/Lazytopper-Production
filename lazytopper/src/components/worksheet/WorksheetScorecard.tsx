import { useEffect, useMemo } from "react";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

/**
 * WorksheetScorecard — PR-A: the auto scorecard popup shown the moment a grade
 * completes (the same auto-appear-on-state pattern as the Quick-Practice session
 * scorecard, rendered here as the LOCKED navy overlay). Reuses the worksheet
 * grammar: a self-contained component with scoped class-driven styling and a pure
 * CSS reflow at 1024px — desktop = centered modal, mobile = bottom sheet.
 *
 * It only PRESENTS the existing grade response: the four-type breakdown is
 * aggregated from `results[].mistakeSummary` over the LEGIBLE questions; pending
 * stays honest (amber strip, never folded into the score); the all-pending case
 * disables both actions. No numbers are invented here.
 */

interface WorksheetScorecardProps {
  name: string;
  code: string;
  response: WorksheetGradeResponse;
  onClose: () => void;
  onRead: () => void;
  onDownload: () => void;
  downloading?: boolean;
}

interface FourType {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}

function aggregateMistakes(response: WorksheetGradeResponse): FourType {
  const acc: FourType = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const r of response.results) {
    if (r.couldNotRead || !r.mistakeSummary) continue;
    acc.conceptual += Number(r.mistakeSummary.conceptual) || 0;
    acc.calculation += Number(r.mistakeSummary.calculation) || 0;
    acc.silly += Number(r.mistakeSummary.silly) || 0;
    acc.presentation += Number(r.mistakeSummary.presentation) || 0;
  }
  return acc;
}

export default function WorksheetScorecard({
  name,
  code,
  response,
  onClose,
  onRead,
  onDownload,
  downloading = false,
}: WorksheetScorecardProps) {
  const m = useMemo(() => aggregateMistakes(response), [response]);
  const allPending = response.gradedCount === 0;

  // Close on Escape — modal etiquette without a modal library.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="lt-sc__dim"
      role="dialog"
      aria-modal="true"
      aria-label="Worksheet scorecard"
      onClick={onClose}
    >
      <style>{SC_CSS}</style>
      <div className="lt-sc__card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-sc__grab" aria-hidden="true" />
        <div className="lt-sc__body">
          <div className="lt-sc__head">
            <div>
              <div className="lt-sc__nm">{name}</div>
              <div className="lt-sc__code">{code} · graded just now</div>
            </div>
            <button type="button" className="lt-sc__x" onClick={onClose} aria-label="Close">✕</button>
          </div>

          {allPending ? (
            <div className="lt-sc__allpend">
              <div className="lt-sc__allpend-t">We couldn’t read any answers</div>
              <p className="lt-sc__allpend-d">
                None of the pages could be read clearly — re-upload clearer photos and we’ll grade them.
                Nothing has been scored 0.
              </p>
            </div>
          ) : (
            <>
              <div className="lt-sc__top">
                <div className="lt-sc__big">
                  {response.gradedMarksAwarded}
                  <small> / {response.gradedMarksTotal}</small>
                </div>
                <div className="lt-sc__desc">
                  across {response.gradedCount} of {response.totalQuestions}<br />
                  question{response.totalQuestions === 1 ? "" : "s"} graded
                </div>
              </div>

              {response.pendingCount > 0 && (
                <div className="lt-sc__pend">
                  <b>
                    {response.pendingCount} question{response.pendingCount === 1 ? "" : "s"} couldn’t be read
                  </b>{" "}
                  — re-upload those pages to complete your score. Worksheet is worth{" "}
                  {response.worksheetTotalMarks} marks in total.
                </div>
              )}

              <div className="lt-sc__mbk">Where your marks went</div>
              <div className="lt-sc__groups">
                <div className="lt-sc__col lt-sc__col--know">
                  <div className="lt-sc__gh">Knowledge gaps — worth practising</div>
                  <div className="lt-sc__row">
                    <span className="lt-sc__sw lt-sc__sw--con" />Conceptual
                    <span className="lt-sc__ct">{m.conceptual}</span>
                  </div>
                  <div className="lt-sc__row">
                    <span className="lt-sc__sw lt-sc__sw--cal" />Calculation
                    <span className="lt-sc__ct">{m.calculation}</span>
                  </div>
                </div>
                <div className="lt-sc__col lt-sc__col--care">
                  <div className="lt-sc__gh">Careless mark-loss — not a weakness</div>
                  <div className="lt-sc__row">
                    <span className="lt-sc__sw lt-sc__sw--silly" />Silly
                    <span className="lt-sc__ct">{m.silly}</span>
                  </div>
                  <div className="lt-sc__row">
                    <span className="lt-sc__sw lt-sc__sw--pres" />Presentation
                    <span className="lt-sc__ct">{m.presentation}</span>
                  </div>
                  {(m.silly > 0 || m.presentation > 0) && (
                    <div className="lt-sc__care-note">
                      Slips on the final line / units — slow down, these aren’t weak topics.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lt-sc__actions">
          <button
            type="button"
            className="lt-sc__btn lt-sc__btn--ghost"
            onClick={onRead}
            disabled={allPending}
          >
            Read your graded worksheet
          </button>
          <button
            type="button"
            className="lt-sc__btn lt-sc__btn--primary"
            onClick={onDownload}
            disabled={allPending || downloading}
          >
            {downloading ? "Preparing PDF…" : "Download graded sheet"}
          </button>
        </div>
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

.lt-sc__pend {
  background: rgba(232, 183, 101, 0.12); border-left: 3px solid #e8b765; border-radius: 8px;
  padding: 11px 15px; font-size: 12.5px; color: #f0cf9a; margin-bottom: 26px; line-height: 1.55;
}
.lt-sc__pend b { color: #f6dcab; }

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
}
`;
