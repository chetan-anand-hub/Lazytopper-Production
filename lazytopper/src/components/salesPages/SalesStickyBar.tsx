import { useEffect, useState } from "react";
import { stickyPassCopy } from "../pricing/pricingPlansCopy";
import "../pricing/stickyPassBar.css";

/**
 * PRICING-PAGES-1 - the phone shortcut bar of a sales page, on StickyPassBar's rules (pricing/StickyPassBar.tsx): phones only (its
 * CSS hides it from 768 px); HIDDEN while ANY of the page's Pay areas (`watch`, test ids) is on screen and over the footer; mounted
 * after hydration (the first render is null, the label is read in an effect), so it is never in the prerendered HTML. NEVER A PAYMENT PATH OF ITS OWN: `onGo` is the page's hero Pay / Buy.
 *
 * Its own small component (not StickyPassBar) only because a sales page has TWO Pay areas and StickyPassBar watches one.
 */
export default function SalesStickyBar({
  watch,
  footerSelector = "footer.lt-public-legal",
  copy,
  onGo,
  ariaLabel,
  testId,
}: {
  watch: readonly string[];
  footerSelector?: string;
  /** Read after mount (the price follows the clock). null hides the bar. */
  copy: () => { label: string; button: string } | null;
  onGo: () => void;
  ariaLabel: string;
  testId: string;
}) {
  const [text, setText] = useState<{ label: string; button: string } | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setText(copy());
    // Measured on scroll / resize from the live elements (queried each time, so a node the island hands over to the app, or one
    // re-rendered by React, is never stale). An area counts as on screen while any of it is inside the viewport.
    const onScreen = (el: Element | null): boolean => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    };
    let frame = 0;
    const check = () => {
      frame = 0;
      const anyPay = watch.some((id) => onScreen(document.querySelector(`[data-testid="${id}"]`)));
      setHidden(anyPay || onScreen(document.querySelector(footerSelector)));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    const late = [window.setTimeout(check, 500), window.setTimeout(check, 1500)];
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      late.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
    // The ids and the copy reader are fixed for the bar's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!text || hidden) return null;
  return (
    <div className="lt-stickybar" data-testid={testId} data-mode="pass" role="region" aria-label={ariaLabel}>
      <div className="lt-stickybar__row">
        <span className="lt-stickybar__label">{text.label}</span>
        <button type="button" className="lt-stickybar__go" onClick={onGo} data-testid={`${testId}-go`}>
          {text.button}
        </button>
      </div>
    </div>
  );
}

/** The Board Pass bar's words: the same function /pricing's bar uses. */
export function boardPassStickyCopy(price: string, payPrice: string): { label: string; button: string } {
  return stickyPassCopy(price, payPrice);
}
