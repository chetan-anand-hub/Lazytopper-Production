/**
 * OffersSummary - PRICING-DEDUPE-1 (owner ruling, 6 Nov 2026 ~23:30 IST): the Important Questions page's ONE buying block, at the END
 * of the list, collapsed by default to one summary row:
 *
 *   Board Pass · get every answer marked like a CBSE examiner · {price}   [Pay {amount}]   ▾
 *
 * Opening it shows the existing OffersBlock (Board Pass card + "Prefer practising on paper?" + the packs) unchanged.
 *
 * ★ PAY IS ONE TAP AWAY, ALWAYS. The row's Pay is `BoardPassPayLink` - the SAME component the card's Pay button is (same destination,
 *   same `payLabel` over `boardPassPayDisplay`, same `sale_moment_tap`), so it follows GST-EXCL-1 with no code here. It is a SIBLING of
 *   the <details>, placed over the row by CSS, never inside <summary>: a tap on it can never toggle the block, and it keeps its own tab
 *   stop (before the summary). The price on the row is `boardPassPriceNow()`, the card's own tag.
 * ★ NO CLS. The rules are a <style> rendered with the block (in the prerendered HTML, the practice row's pattern), the row has a fixed
 *   height, and it is collapsed on first paint. The OffersBlock inside is mounted (its `sale_moment_shown` still fires), only hidden.
 * ★ ANALYTICS. One vendor-only event, `offers_summary_open { surface }`, the first time the row is opened on this mount. No id, no text.
 *
 * Styles: `OFFERS_SUMMARY_CSS` (scoped `.lt-offsum`); no inline style objects.
 */
import { useEffect, useRef, type ReactNode } from "react";

import { sendAnalyticsHit } from "../../analytics/analytics";
import { boardPassPriceNow } from "../pricing/boardPassOffer";
import { BoardPassPayLink } from "./OffersBlock";

export const OFFERS_SUMMARY_BENEFIT = "get every answer marked like a CBSE examiner";

export const OFFERS_SUMMARY_CSS = `
.lt-offsum { position: relative; margin: 16px 0 0; font-family: Inter, system-ui, -apple-system, sans-serif; }
.lt-offsum__d { border: 1px solid hsl(152, 45%, 78%); border-radius: 14px; background: hsl(152, 50%, 97%); }
.lt-offsum__row {
  list-style: none; cursor: pointer; box-sizing: border-box; position: relative;
  height: 132px; padding: 12px 40px 0 14px; color: hsl(220, 45%, 14%);
}
.lt-offsum__row::-webkit-details-marker { display: none; }
.lt-offsum__row:focus-visible { outline: 2px solid hsl(152, 55%, 30%); outline-offset: 2px; border-radius: 14px; }
.lt-offsum__text { display: block; height: 56px; overflow: hidden; font-size: 13.5px; line-height: 1.35; }
.lt-offsum__name { font-weight: 800; }
.lt-offsum__price { font-weight: 700; white-space: nowrap; }
.lt-offsum__chev { position: absolute; top: 12px; right: 14px; font-size: 14px; color: hsl(220, 15%, 45%); transition: transform 160ms ease; }
.lt-offsum__d[open] .lt-offsum__chev { transform: rotate(180deg); }
.lt-offsum__pay {
  position: absolute; z-index: 1; top: 76px; left: 14px; right: 40px; height: 44px; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; border-radius: 999px;
  background: hsl(152, 55%, 38%); color: #fff; font-size: 15px; font-weight: 800; text-decoration: none; white-space: nowrap;
}
.lt-offsum__pay:hover { background: hsl(152, 57%, 32%); }
.lt-offsum__pay:focus-visible { outline: 2px solid hsl(220, 45%, 14%); outline-offset: 2px; }
.lt-offsum--nopay .lt-offsum__row { height: 64px; }
.lt-offsum__body { padding: 0 12px 12px; }
.lt-offsum__body .lt-offers { margin-top: 0; }
@media (min-width: 768px) {
  .lt-offsum__row { height: 64px; padding: 0 48px 0 18px; display: flex; align-items: center; }
  .lt-offsum__text { height: auto; padding-right: 168px; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lt-offsum--nopay .lt-offsum__text { padding-right: 0; }
  .lt-offsum__chev { top: 50%; margin-top: -10px; right: 18px; }
  .lt-offsum__pay { top: 10px; left: auto; right: 48px; width: 156px; height: 44px; }
}
`;

function trackOpen(surface: string): void {
  try {
    sendAnalyticsHit("event", { name: "offers_summary_open", data: { surface } }, { ga4: { surface } });
  } catch {
    /* analytics must never break the page */
  }
}

export default function OffersSummary({
  surface,
  showCard,
  children,
}: {
  /** The OffersBlock's own surface slug (the open event and the row's Pay tap carry it). */
  surface: string;
  /** Whether the Board Pass is offered (the same decision the inner OffersBlock gets); false = packs only, no Pay on the row. */
  showCard: boolean;
  /** The existing OffersBlock, shown unchanged when the row is opened. */
  children: ReactNode;
}) {
  const opened = useRef(false);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const price = showCard ? boardPassPriceNow() : null;
  // The native "toggle" event (it does not bubble), listened to on the element itself.
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onToggle = () => {
      if (el.open && !opened.current) {
        opened.current = true;
        trackOpen(surface);
      }
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, [surface]);
  return (
    <div className={`lt-offsum${showCard ? "" : " lt-offsum--nopay"}`} data-testid="offers-summary" data-surface={surface}>
      <style>{OFFERS_SUMMARY_CSS}</style>
      {showCard ? (
        <span
          className="lt-offsum__payslot"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <BoardPassPayLink className="lt-offsum__pay" testId="offers-summary-pay" surface={surface} />
        </span>
      ) : null}
      <details className="lt-offsum__d" ref={detailsRef}>
        <summary className="lt-offsum__row" data-testid="offers-summary-row">
          <span className="lt-offsum__text">
            {showCard ? (
              <>
                <span className="lt-offsum__name">Board Pass</span> · {OFFERS_SUMMARY_BENEFIT}
                {price ? (
                  <>
                    {" "}
                    · <span className="lt-offsum__price" data-testid="offers-summary-price">{price}</span>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <span className="lt-offsum__name">Prefer practising on paper?</span> · printable PDF packs
              </>
            )}
          </span>
          <span className="lt-offsum__chev" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="lt-offsum__body">{children}</div>
      </details>
    </div>
  );
}
