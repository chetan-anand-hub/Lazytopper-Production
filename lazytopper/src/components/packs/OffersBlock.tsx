import { Suspense, lazy, useEffect, useRef, type ReactNode } from "react";

import { trackSaleMoment } from "../../analytics/analytics";
import { boardPassFoundingLabel, boardPassFromLine } from "../../config/pricing";
import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import { isPaymentsClientEnabled } from "../../services/checkout";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { boardPassPriceNow } from "../pricing/boardPassOffer";
import OfferLink from "./OfferLink";
import type { OfferContext } from "./offersModel";
import "./OffersBlock.css";

const OfferRows = lazy(() => import("./OfferRows"));

/**
 * OffersBlock - OFFERS-V2. THE one buying block after a result (the six grading surfaces and the ladder) and at a paper wall, for a student
 * who has not paid. Top to bottom: an optional plain headline from the result's own numbers, an optional lead (the free-week button for an
 * account that never had a trial), the Board Pass card (price, the founding label only while it is open, one benefit line, a Pay button that
 * goes straight to checkout, the later price from config/pricing), then - when the host says the student's status is KNOWN and not paid -
 * "Prefer practising on paper?" and the PDF-pack rows from the highest price down (OfferRows, its own lazy chunk).
 *
 * The HOST decides who sees it (Premium never; unknown status never for the pack rows) and passes `showCard` / `showPacks`; this part draws.
 * Display only: no mark, price, checkout or entitlement is touched. Every price is read from the catalogue at render time.
 */
export interface OffersBlockProps {
  /** Coarse analytics slug: ladder | check-improve | worksheet | chapter-test | full-mock | quick-practice | wall-<kind>. */
  surface: string;
  ctx: OfferContext;
  /** The signed-in uid, or "" for a signed-out visitor (the ladder): they own nothing, no ownership read is made. */
  uid: string;
  /** The Board Pass card. False hides it (the host has not established that the student is not paid). */
  showCard?: boolean;
  /** The pack rows. The host passes true only for a KNOWN non-paid student (or a signed-out visitor). */
  showPacks: boolean;
  /** Plain headline lines from the result's own numbers; absent on a wall (it has its own title). */
  headline?: readonly string[];
  /** Drawn between the headline and the card: the free-week lead for a never-trialled account. */
  lead?: ReactNode;
  benefit: string;
  /** "Pay" on a result; "Get it for" on a wall. */
  payVerb?: "Pay" | "Get it for";
  /** The small "What you get" link under the card (results). A wall shows its parent links instead. */
  whatYouGet?: boolean;
  /** Drawn inside the card, under the price line (a wall's "Forward link to parents" / QR links). */
  cardExtras?: ReactNode;
  /** The host's own counting of a Pay tap (e.g. the scorecard's upgrade click). */
  onPayTap?: () => void;
}

/** The Pay button's words. Payments dark: no "Pay" promise - the link then only shows the plan on /pricing. */
export function payLabel(verb: "Pay" | "Get it for", price: string | null, paymentsOn: boolean): string {
  if (!paymentsOn) return price ? `See Board Pass ${price}` : "See the Board Pass";
  return price ? `${verb} ${price}` : "Get the Board Pass";
}

export default function OffersBlock({ surface, ctx, uid, showCard = true, showPacks, headline, lead, benefit, payVerb = "Pay", whatYouGet = true, cardExtras, onPayTap }: OffersBlockProps) {
  const price = boardPassPriceNow();
  const founding = boardPassFoundingLabel();
  const paymentsOn = isPaymentsClientEnabled();
  const shown = useRef(false);

  useEffect(() => {
    if (!showCard || shown.current) return;
    shown.current = true;
    trackSaleMoment("sale_moment_shown", { surface, offer: "board_pass", rank: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCard]);

  if (!showCard && !showPacks) return null;
  const to = paymentsOn ? BOARD_PASS_BUY_PATH : "/pricing";
  return (
    <div className="lt-offers" data-testid="offers-block" data-surface={surface}>
      {headline && headline.length > 0 ? (
        <h2 className="lt-offers__head" data-testid="offers-headline">
          {headline.map((l, i) => (
            <span key={i} className="lt-offers__head-line">
              {l}
            </span>
          ))}
        </h2>
      ) : null}
      {lead}
      {showCard ? (
        <section className="lt-offers__card" data-testid="offers-board-pass" aria-label="Board Pass">
          <div className="lt-offers__cardhead">
            <span className="lt-offers__cardname">Board Pass</span>
            {founding ? (
              <span className="lt-offers__badge" data-testid="offers-founding">
                {founding}
              </span>
            ) : null}
          </div>
          <p className="lt-offers__benefit">{benefit}</p>
          <OfferLink
            className="lt-offers__pay"
            to={to}
            testId="offers-pay"
            onClick={() => {
              trackSaleMoment("sale_moment_tap", { surface, offer: "board_pass", rank: 1 });
              onPayTap?.();
            }}
          >
            {payLabel(payVerb, price, paymentsOn)}
          </OfferLink>
          <div className="lt-offers__fine">
            <span data-testid="offers-from-line">{boardPassFromLine()}</span>
            {whatYouGet ? (
              <OfferLink className="lt-offers__link" to="/pricing" testId="offers-what-you-get">
                What you get
              </OfferLink>
            ) : null}
          </div>
          {cardExtras}
        </section>
      ) : null}
      {showPacks && isPacksEntryEnabled() ? (
        <Suspense fallback={null}>
          <OfferRows surface={surface} ctx={ctx} uid={uid} />
        </Suspense>
      ) : null}
    </div>
  );
}
