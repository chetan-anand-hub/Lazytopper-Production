import { useEffect, useMemo, useRef } from "react";

import { trackSaleMoment } from "../../analytics/analytics";
import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import OfferLink from "./OfferLink";
import { offerRows, rowInsideSlug, rowOfferSlug, unownedRows, type OfferContext, type OfferRow } from "./offersModel";
import { useOwnedPacks } from "./useOwnedPacks";

/**
 * OfferRows - OFFERS-V2. The "Prefer practising on paper?" half of the buying block: the PDF-pack rows for this surface, highest price
 * first, each with its name, one honest line, a "What's inside" link (the existing pop-up, no buy) and a green price button that goes to
 * `/packs?buy=<sku>&t=<target>` (one tap to payment). Its own lazy chunk: it carries the pack catalogue.
 *
 * A row the student already owns is hidden; an ownership read that is loading or failed hides EVERY row (when unsure, never sell); a
 * signed-out visitor owns nothing and triggers no read. Fires `sale_moment_shown` once per row (offer = the pack SKU, rank = its place
 * in the block, the Board Pass card being 1).
 */
export default function OfferRows({ surface, ctx, uid }: { surface: string; ctx: OfferContext; uid: string }) {
  const enabled = isPacksEntryEnabled();
  const signedOut = !uid;
  const ownedRead = useOwnedPacks(uid, enabled && !signedOut);
  const all = useMemo(() => offerRows(ctx), [ctx.kind, ctx.subject, ctx.chapterSlug, ctx.chapterName]); // eslint-disable-line react-hooks/exhaustive-deps
  const owned = signedOut ? [] : ownedRead.phase === "ready" ? ownedRead.packs : null;
  const rows: OfferRow[] = enabled && owned ? unownedRows(all, owned) : [];
  const told = useRef(new Set<string>());

  useEffect(() => {
    rows.forEach((r, i) => {
      if (told.current.has(r.sku)) return;
      told.current.add(r.sku);
      trackSaleMoment("sale_moment_shown", { surface, offer: rowOfferSlug(r), rank: i + 2 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => r.sku).join("|")]);

  if (rows.length === 0) return null;
  return (
    <section className="lt-offers__packs" data-testid="offers-packs" aria-label="PDF packs">
      <p className="lt-offers__packs-head">Prefer practising on paper?</p>
      {rows.map((r, i) => (
        <div key={r.sku + r.target} className={`lt-offers__row${r.badge ? " lt-offers__row--best" : ""}`} data-testid={`offers-row-${r.sku}`}>
          <div className="lt-offers__row-main">
            <span className="lt-offers__row-name">
              {r.name}
              {r.badge ? <span className="lt-offers__best">{r.badge}</span> : null}
            </span>
            <span className="lt-offers__row-line">{r.line}</span>
            <OfferLink
              className="lt-offers__link"
              to={r.insideHref}
              testId={`offers-inside-${r.sku}`}
              onClick={() => trackSaleMoment("sale_moment_tap", { surface, offer: rowInsideSlug(r), rank: i + 2 })}
            >
              What&rsquo;s inside
            </OfferLink>
          </div>
          <OfferLink
            className="lt-offers__buy"
            to={r.buyHref}
            testId={`offers-buy-${r.sku}`}
            label={`Buy ${r.name} for ${r.payPrice}`}
            onClick={() => trackSaleMoment("sale_moment_tap", { surface, offer: rowOfferSlug(r), rank: i + 2 })}
          >
            {r.payPrice}
          </OfferLink>
        </div>
      ))}
    </section>
  );
}
