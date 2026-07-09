import { useEffect } from "react";
import SurfaceHistory from "../results/SurfaceHistory";

/**
 * WorksheetHistoryPanel — Worksheet redesign FIX B: the OVERLAY container that
 * moves "Your worksheets" out of the page body and behind a header control. It is a
 * placement wrapper only: the rows, the four-type dot-strip, the pending pill, the
 * honest trend chip and the read-only <ResultsScorecard> re-open all still come from
 * <SurfaceHistory> (PR-3) unchanged — this component supplies the dim+blur backdrop,
 * the scrollable white panel and the header, nothing more.
 *
 * The page stays visible behind a semi-transparent dim; Escape / dim-click / ✕ all
 * close. `z-index` sits BELOW the scorecard (1000) so a tapped row's scorecard layers
 * on top of the panel. `pendingOnly` powers the banner's "See all N →" deep-link.
 */

interface WorksheetHistoryPanelProps {
  uid: string | null | undefined;
  /** Total saved worksheet records (for the header count). */
  count: number;
  /** Render only the ungraded (pending) rows — the banner's aggregate deep-link. */
  pendingOnly: boolean;
  onClose: () => void;
}

export default function WorksheetHistoryPanel({
  uid,
  count,
  pendingOnly,
  onClose,
}: WorksheetHistoryPanelProps) {
  // Escape closes — modal etiquette, mirroring ResultsScorecard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="lt-whp__dim"
      role="dialog"
      aria-modal="true"
      aria-label="Your worksheets"
      onClick={onClose}
    >
      <style>{WHP_CSS}</style>
      <div className="lt-whp__panel" onClick={(e) => e.stopPropagation()}>
        <div className="lt-whp__head">
          <div className="lt-whp__ht">
            <span className="lt-whp__htmain">Your worksheets</span>
            <span className="lt-whp__hsub">
              {pendingOnly ? "awaiting your answer sheet" : `${count} saved · newest first`}
            </span>
          </div>
          <button type="button" className="lt-whp__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="lt-whp__body">
          <SurfaceHistory surface="worksheet" uid={uid} embedded pendingOnly={pendingOnly} />
        </div>
      </div>
    </div>
  );
}

const WHP_CSS = `
.lt-whp__dim {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(20, 35, 58, 0.42);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
.lt-whp__panel {
  background: #fff; border-radius: 20px; width: 100%; max-width: 560px;
  max-height: 82vh; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 30px 80px rgba(20, 35, 58, 0.42);
  animation: lt-whp-pop 0.2s ease;
}
@keyframes lt-whp-pop { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.lt-whp__head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 18px 22px 14px; border-bottom: 1px solid hsl(220, 18%, 92%);
}
.lt-whp__ht { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.lt-whp__htmain { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 19px; color: #15233a; }
.lt-whp__hsub { font-size: 12px; color: hsl(220, 15%, 42%); }
.lt-whp__x {
  flex-shrink: 0; background: none; border: none; color: hsl(220, 12%, 55%);
  font-size: 17px; cursor: pointer; padding: 2px 6px; line-height: 1;
}
.lt-whp__x:hover { color: #15233a; }
.lt-whp__body { overflow-y: auto; padding: 16px 22px 22px; }

@media (max-width: 640px) {
  .lt-whp__dim { align-items: flex-end; padding: 0; }
  .lt-whp__panel { max-width: 100%; max-height: 90vh; border-radius: 22px 22px 0 0; }
}
`;
