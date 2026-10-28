import { useEffect, useState } from "react";
import { BOARD_PASS_NAME, tillBoardsQuote } from "../../config/pricing";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import "./stickyPassBar.css";

/**
 * StickyPassBar - PRICING-LADDER-1 (owner ruling 28 Oct 2026). On a phone, once the Premium card's pass tiles (and so the Pay buttons)
 * have scrolled out of view UPWARD, a slim bar at the foot of the screen keeps the lead offer in reach: "Board Pass ₹{price} · Get it".
 * It hides again as soon as the tiles are visible, and it never exists at 768px and wider (CSS).
 *
 * - NOT a payment button: a tap only scrolls smoothly back to the Premium card (`targetId`), where the real Pay buttons are.
 * - MOUNT AFTER HYDRATION: the first render returns null and the bar only exists after an effect has run, so it is never in the prerendered
 *   HTML. The price is the page's own till-boards quote (the same `tillBoardsQuote` + `predictCbseExamDate("10")` the card uses), computed in
 *   that effect from the real clock; no price, no bar.
 * - `hidden` (a student who has BOUGHT Premium) renders nothing at all.
 */
export default function StickyPassBar({
  watchTestId,
  targetId,
  foundingRate,
  hidden = false,
}: {
  /** data-testid of the element whose upward exit shows the bar (the pass tiles, which hold the Pay buttons). */
  watchTestId: string;
  /** id of the element a tap scrolls to (the Premium card). */
  targetId: string;
  /** The rate THIS visitor is charged - the same flag the card's quote uses. */
  foundingRate: boolean;
  hidden?: boolean;
}) {
  const [price, setPrice] = useState<string | null>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const quote = tillBoardsQuote(new Date(), predictCbseExamDate("10"), foundingRate);
    setPrice(quote ? quote.priceDisplay : null);
  }, [foundingRate]);

  useEffect(() => {
    if (hidden || typeof IntersectionObserver === "undefined") return;
    const watched = document.querySelector(`[data-testid="${watchTestId}"]`);
    if (!watched) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      // Shown only when the tiles are out of view AND above the viewport (scrolled past), never while they are still below the fold.
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(watched);
    return () => observer.disconnect();
  }, [watchTestId, hidden]);

  if (hidden || !price || !past) return null;

  const goToCard = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="lt-stickybar" data-testid="pricing-sticky-bar" role="region" aria-label={`${BOARD_PASS_NAME} shortcut`}>
      <button type="button" className="lt-stickybar__btn" onClick={goToCard}>
        <span className="lt-stickybar__label">
          {BOARD_PASS_NAME} <strong className="lt-stickybar__price">{price}</strong>
        </span>
        {" "}
        <span className="lt-stickybar__go">Get it</span>
      </button>
    </div>
  );
}
