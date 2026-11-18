import { useEffect, useState } from "react";
import { stickyPassCopy } from "../pricing/pricingPlansCopy";
import "../pricing/stickyPassBar.css";

/** PACKS-MOBILE-1: a watched area counts as "in view" only when ALL of it is inside the viewport (a clipped button is not in view). */
export function isFullyInView(r: { top: number; bottom: number; height: number }, viewportHeight: number): boolean {
  return r.height > 0 && r.top >= 0 && r.bottom <= viewportHeight;
}
/** The default: any part of the area inside the viewport counts as on screen. */
export function isPartlyInView(r: { top: number; bottom: number; height: number }, viewportHeight: number): boolean {
  return r.height > 0 && r.bottom > 0 && r.top < viewportHeight;
}

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
  ignoreFooter = false,
  requireFullyVisible = false,
  copy,
  onGo,
  ariaLabel,
  testId,
  copyKey,
}: {
  watch: readonly string[];
  footerSelector?: string;
  /** /packs only: the footer on screen does NOT hide the bar (the page is short, so the footer is often in view; the page reserves room for the bar). Default off. */
  ignoreFooter?: boolean;
  /** /packs only (PACKS-MOBILE-1): the bar hides only while the watched Buy is FULLY on screen; a clipped button counts as not visible. Default off. */
  requireFullyVisible?: boolean;
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
      return isPartlyInView(el.getBoundingClientRect(), window.innerHeight);
    };
    const watchedInView = (el: Element | null): boolean => {
      if (!requireFullyVisible) return onScreen(el);
      if (!el) return false;
      return isFullyInView(el.getBoundingClientRect(), window.innerHeight);
    };
    let frame = 0;
    const check = () => {
      frame = 0;
      // The copy is re-read too (R1: the Pay amount follows the hero Pay, which names a pack credit once it has loaded).
      const next = copy();
      setText((was) => (was && next && was.label === next.label && was.button === next.button ? was : next));
      const anyPay = watch.some((id) => watchedInView(document.querySelector(`[data-testid="${id}"]`)));
      setHidden(anyPay || (!ignoreFooter && onScreen(document.querySelector(footerSelector))));
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
