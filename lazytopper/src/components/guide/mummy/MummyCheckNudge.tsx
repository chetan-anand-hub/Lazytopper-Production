/**
 * MOMENTS-1 M11b — Mummy's "one written answer" line on /for-parents, beside the page's OWN
 * free-check action (passed in by the page, exactly as MummyJourney's beat 4 takes its actions:
 * the same href, never a new flow).
 *
 * ★ THE TEXT IS PLAIN HTML, MUMMY IS NOT (MummyJourney's rule): the line and the action are in the
 * DOM, so the prerendered /for-parents carries them for a crawler; Mummy's SVG is drawn client-side
 * after idle, from the same lazy chunk, into a fixed-size slot (no layout shift).
 * ★ EVERYONE on /for-parents sees it: the page is not an A/B surface (MummyJourney has no arm), and
 *   this is marketing copy. "Hide mascots" on this device hides the whole moment (the plain page
 *   stays); prefers-reduced-motion → the rig's still pose (BlobCharacter's own rule).
 * Parent copy rules: "your child", no "Ask", no price.
 */
import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";
import "./mummyJourney.css";
import { shouldDrawMummy } from "./mummyModel";
import type { MummyFigureProps } from "./mummyChunk";
import { useMascotsHidden } from "../mascotsMute";
import { hideMascotsWithUndo, MASCOTS_TOAST_COPY } from "../moments/mascotsToast";

export const MUMMY_CHECK_LINE =
  "Have your child write one answer on paper. One photo — and you'll see every step marked the way a CBSE examiner does, and exactly where marks were lost.";

const NoFigure: ComponentType<MummyFigureProps> = () => null;
const LazyMummyFigure = lazy(() =>
  import("./mummyChunk").then(
    (m) => ({ default: m.MummyFigure }),
    () => ({ default: NoFigure }),
  ),
);

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (h: number) => void;
};

function useDrawAfterIdle(): boolean {
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    if (!shouldDrawMummy()) return;
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const h = w.requestIdleCallback(() => setDraw(true), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = setTimeout(() => setDraw(true), 1);
    return () => clearTimeout(t);
  }, []);
  return draw;
}

export default function MummyCheckNudge({ action }: { action: ReactNode }) {
  const hidden = useMascotsHidden();
  const draw = useDrawAfterIdle();
  if (hidden) return null;
  return (
    <section className="lt-mj lt-mcn" data-testid="mummy-check-nudge" aria-label="Mummy on checking one written answer">
      <div className="lt-mcn__stage">
        <div className="lt-mj__fig lt-mcn__fig" aria-hidden="true">
          {draw ? (
            <Suspense fallback={null}>
              <LazyMummyFigure pose="mproud" onTap={() => {}} />
            </Suspense>
          ) : null}
        </div>
        <p className="lt-mj__say lt-mcn__say" data-testid="mummy-check-line">
          {MUMMY_CHECK_LINE}
        </p>
        <div className="lt-mcn__act">{action}</div>
        <button type="button" className="lt-mcn__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
          {MASCOTS_TOAST_COPY.hide}
        </button>
      </div>
    </section>
  );
}
