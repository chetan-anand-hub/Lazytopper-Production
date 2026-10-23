import { Suspense, lazy, useCallback, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import type { ScorecardVariant } from "../scorecardVariants";
import { importWithRetry } from "../../../lib/lazyWithRetry";

/**
 * SHARE-CARD-1 - "Share result" on every graded scorecard (the ONE shared ResultsScorecard
 * shell mounts it when canShareScore(variant) holds, so all six grading surfaces reach it:
 * Check & Improve single + multi, Worksheet, Chapter Test, Full Mock, Quick Practice).
 *
 * PERF: this button is the ONLY share code in the scorecard's bundle. The share sheet - the
 * card, the mascot rig, html-to-image, qrcode - is a separate chunk imported on the tap
 * (through importWithRetry; a failed chunk shows an honest line, never a broken page).
 *
 * Display only (CLAUDE.md 4a): it reads the built variant; no grade, mark or prompt is touched.
 */
export const SHARE_RESULT_LABEL = "Share result";

type SheetProps = { variant: ScorecardVariant; onClose: () => void };

function ChunkFailed({ onClose }: SheetProps) {
  return (
    <div className="lt-ss__dim" role="dialog" aria-modal="true" aria-label={SHARE_RESULT_LABEL} onClick={onClose}>
      <div className="lt-ss__fail" role="status">
        Couldn&rsquo;t open sharing just now. Check your connection and try again.
      </div>
    </div>
  );
}

const ShareSheet = lazy(
  (): Promise<{ default: ComponentType<SheetProps> }> =>
    importWithRetry(() => import("./ShareSheet")).catch(() => ({ default: ChunkFailed })),
);

export default function ShareScoreButton({ variant }: { variant: ScorecardVariant }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="lt-ss">
      <style>{SS_CSS}</style>
      <button
        type="button"
        className="lt-ss__btn"
        data-testid="sc-share-score"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <svg className="lt-ss__ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .09.73L8.6 8.04a3 3 0 1 0 0 3.92l6.49 3.31A3 3 0 1 0 16 13.5a3 3 0 0 0-.4.03L9 10.2a3 3 0 0 0 0-.4l6.6-3.37A3 3 0 0 0 18 8Z" />
        </svg>
        {SHARE_RESULT_LABEL}
      </button>
      {/* Portalled to <body>: the scorecard is a fixed, transformed overlay. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Suspense fallback={null}>
            <ShareSheet variant={variant} onClose={close} />
          </Suspense>,
          document.body,
        )}
    </div>
  );
}

const SS_CSS = `
.lt-ss { margin: 4px 0 22px; }
.lt-ss__btn {
  display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 13.5px;
  padding: 10px 16px; border-radius: 999px; color: #fff;
  background: rgba(52, 199, 138, 0.14); border: 1.5px solid hsl(152, 55%, 45%);
}
.lt-ss__btn:hover { background: rgba(52, 199, 138, 0.24); }
.lt-ss__ic { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
.lt-ss__dim { position: fixed; inset: 0; z-index: 2147483000; background: rgba(6, 12, 24, 0.72); display: flex; align-items: center; justify-content: center; padding: 16px; }
.lt-ss__fail { background: #15233a; color: #f0cf9a; border-radius: 14px; padding: 18px 20px; font: 600 14px/1.4 "Inter", ui-sans-serif, system-ui, sans-serif; max-width: 360px; }
@media (max-width: 1023px) {
  .lt-ss__btn { width: 100%; justify-content: center; padding: 12px 16px; }
}
`;
