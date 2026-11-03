import { useEffect, useState } from "react";
import { boardPassPriceDisplay } from "../../config/pricing";
import type { PackSubject } from "../../services/packs";
import { stickyCbqCopy, stickyPassCopy } from "./pricingPlansCopy";
import "./stickyPassBar.css";

/**
 * StickyPassBar - PRICING-B-1 (owner "Option B v3", 3 Nov 2026; first shipped as PRICING-LADDER-1). Phones only (CSS hides it from
 * 768 px). One slim bar at the foot of the screen that follows where the reader is:
 *
 *   - HIDDEN while the hero Pay area (`passWatchTestId`) is on screen - the real button is right there;
 *   - "<Subject> CBQ Pack ₹… · Buy ₹…" while the printed-practice section (`packsId`) is on screen, for the subject the packs follow
 *     (`cbq`; null when that CBQ pack is owned or cannot be bought, and then the Board Pass bar shows instead);
 *   - "Board Pass ₹… · Pay ₹…" everywhere else (`onPass`; `showPass` false - e.g. a student who has BOUGHT the pass - hides it);
 *   - HIDDEN over the footer (`footerSelector`).
 *
 * NEVER A PAYMENT PATH OF ITS OWN: `onPass` and `cbq.onBuy` are the page's central buy paths (the hero Pay button and the shared
 * pack shop), so analytics and checkout are exactly theirs.
 * MOUNTS AFTER HYDRATION: the first render returns null and the price is read in an effect, so the bar is never in the prerendered
 * HTML. Without IntersectionObserver (old browsers, tests) it never shows.
 */
export type StickyMode = "none" | "pass" | "cbq";

/** Pure: which bar shows for what is on screen. */
export function stickyMode(v: { payVisible: boolean; packsVisible: boolean; footerVisible: boolean; showPass: boolean; cbqAvailable: boolean }): StickyMode {
  if (v.footerVisible || v.payVisible) return "none";
  if (v.packsVisible && v.cbqAvailable) return "cbq";
  return v.showPass ? "pass" : "none";
}

function useOnScreen(find: () => Element | null, initial: boolean, enabled: boolean): boolean {
  const [visible, setVisible] = useState(initial);
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return undefined;
    const el = find();
    if (!el) {
      setVisible(false);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setVisible(entry.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
    // `find` is a fresh closure each render; the element ids it reads are fixed for the bar's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return visible;
}

export default function StickyPassBar({
  passWatchTestId,
  packsId,
  footerSelector = "footer.lt-public-legal",
  showPass,
  onPass,
  cbq,
}: {
  passWatchTestId: string;
  packsId: string;
  footerSelector?: string;
  showPass: boolean;
  onPass: () => void;
  cbq: { subject: PackSubject; onBuy: () => void; blocked?: boolean } | null;
}) {
  const [price, setPrice] = useState<string | null>(null);
  const [io, setIo] = useState(false);
  useEffect(() => {
    setPrice(boardPassPriceDisplay());
    setIo(typeof IntersectionObserver !== "undefined");
  }, []);
  // Until the observers have reported, the hero Pay counts as visible (no bar), so nothing flashes on load.
  const payVisible = useOnScreen(() => document.querySelector(`[data-testid="${passWatchTestId}"]`), true, io);
  const packsVisible = useOnScreen(() => document.getElementById(packsId), false, io);
  const footerVisible = useOnScreen(() => document.querySelector(footerSelector), false, io);

  if (!price || !io) return null;
  const mode = stickyMode({ payVisible, packsVisible, footerVisible, showPass, cbqAvailable: cbq !== null });
  if (mode === "none") return null;

  const copy = mode === "cbq" && cbq ? stickyCbqCopy(cbq.subject) : stickyPassCopy(price);
  const act = mode === "cbq" && cbq ? cbq.onBuy : onPass;
  return (
    <div className="lt-stickybar" data-testid="pricing-sticky-bar" data-mode={mode} role="region" aria-label={mode === "cbq" ? "CBQ Pack shortcut" : "Board Pass shortcut"}>
      <div className="lt-stickybar__row">
        <span className="lt-stickybar__label">{copy.label}</span>
        <button
          type="button"
          className="lt-stickybar__go"
          onClick={act}
          disabled={mode === "cbq" && cbq?.blocked === true}
          data-testid={mode === "cbq" ? "sticky-buy-cbq" : "sticky-pay-pass"}
        >
          {copy.button}
        </button>
      </div>
    </div>
  );
}
