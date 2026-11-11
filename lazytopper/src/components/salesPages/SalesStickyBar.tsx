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
  copyKey,
}: {
  watch: readonly string[];
  footerSelector?: string;
  /** Read after mount and on every visibility check (the price follows the clock and the hero Pay). null hides the bar. */
  copy: () => { label: string; button: string } | null;
  onGo: () => void;
  ariaLabel: string;
  testId: string;
  /** N5: changes whenever the copy's source changes (/board-pass: the hero Pay's label); the bar re-reads its copy at once. */
  copyKey?: string | null;
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
      // The copy is re-read too (R1: the Pay amount follows the hero Pay, which names a pack credit once it has loaded).
      const next = copy();
      setText((was) => (was && next && was.label === next.label && was.button === next.button ? was : next));
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
  // N5: the copy's source changed (a pack credit renamed the hero Pay): re-read now, not on the next scroll.
  useEffect(() => {
    const next = copy();
    setText((was) => (was && next && was.label === next.label && was.button === next.button ? was : next));
    // `copy` is a fresh closure each render; `copyKey` is what says its answer changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyKey]);
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
