import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";
import { ALL_NCERT_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import { usePaidPremium } from "../../lib/packs/usePaidPremium";
import type { PacksQueryPack } from "../../lib/packs/packEntry";
import "./packsStrip.css";

/**
 * PRICING-LADDER-1 - flipped to true once PACK-CREDIT-1 (the server credit that takes a pack's price off the Board Pass when it
 * is bought within 7 days) ships - it merged on trunk (48baf3c6), so this is true. If it is ever false the ladder line is NOT rendered: the
 * page must never promise a credit the server does not give. PacksStrip takes a `creditLive` prop that defaults to this constant, so a test renders both states without mocking the module.
 */
export const PACK_CREDIT_LIVE = true;

/** The ladder line, word for word (owner design, 28 Oct 2026). */
export const PACK_CREDIT_LINE = "Take the Board Pass within 7 days and the pack price comes off.";

/**
 * PacksStrip - the PDF packs as the LADDER to Premium on /pricing (PACKS-CLIENT-1, PACKS-UX-1, rebuilt by PRICING-LADDER-1 on the owner's
 * ruling of 28 Oct 2026: Premium first, the packs second - visible, not loud - and Basic last). A quiet section directly after the Premium
 * card: a heading, the four packs as links into /packs (the `?pack=` query contract of packEntry.ts), and a secondary link to /packs.
 * Lazy-loaded by PricingPage (not needed on first paint). Prices are copy: the server charges.
 */
const ITEMS: ReadonlyArray<{ sku: PackSku; query: PacksQueryPack; name: string; what: string; best?: boolean }> = [
  { sku: "pack_chapter", query: "chapter", name: "Chapter Pack", what: "Every question of 1 chapter, with worked solutions" },
  { sku: "pack_mock", query: "mock", name: "Mock Pack", what: `${MOCKS_PER_SUBJECT} full board-pattern papers` },
  { sku: "pack_subject", query: "subject", name: "Subject Pack", what: "Every chapter of a subject + its mocks" },
  { sku: "pack_bundle", query: "bundle", name: BUNDLE_NAME, what: `All ${ALL_NCERT_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks`, best: true },
];

/** The lowest pack price, for the sub line ("from ₹49"). */
const FROM_PRICE = Math.min(...ITEMS.map((i) => PACK_PRICE_INR[i.sku]));

export default function PacksStrip({ creditLive = PACK_CREDIT_LIVE }: { creditLive?: boolean } = {}) {
  // Owner ruling 25 Oct: a student who has BOUGHT Premium (cached read; signed out / not yet hydrated -> shown) is shown no pack offers.
  const paid = usePaidPremium();
  // PACK-BASIC-ONLY-1 - the walls link to /pricing#packs. This strip mounts after first paint (lazy), so the
  // browser's own hash scroll has already missed it: scroll it into view ourselves, minimally ("nearest"), so the
  // Board Pass card just above stays on screen.
  const { hash } = useLocation();
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (hash !== "#packs" || paid) return undefined;
    const id = window.requestAnimationFrame(() => ref.current?.scrollIntoView?.({ block: "nearest" }));
    return () => window.cancelAnimationFrame(id);
  }, [hash, paid]);
  if (paid) return null;
  return (
    <section id="packs" ref={ref} className="lt-packoffer" aria-labelledby="lt-packoffer-h" data-testid="pricing-packs-strip">
      <div className="lt-packoffer__head">
        <h2 className="lt-packoffer__title" id="lt-packoffer-h">Not ready for Premium yet? Start with a PDF pack</h2>
        <p className="lt-packoffer__sub">Printed practice from &#8377;{FROM_PRICE} &middot; one-time &middot; never renews</p>
      </div>
      <ul className="lt-packoffer__list">
        {ITEMS.map((i) => (
          <li key={i.sku} className="lt-packoffer__cell" data-price={PACK_PRICE_INR[i.sku]}>
            <Link
              to={`/packs?pack=${i.query}`}
              className={i.best ? "lt-packoffer__item lt-packoffer__item--best" : "lt-packoffer__item"}
              data-pack={i.query}
            >
              <span className="lt-packoffer__name">{i.name}</span>
              <span className="lt-packoffer__price">{packPriceLabel(i.sku)}</span>
              <span className="lt-packoffer__what">{i.what}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="lt-packoffer__foot">
        {creditLive && <p className="lt-packoffer__credit" data-testid="pricing-pack-credit">{PACK_CREDIT_LINE}</p>}
        <Link to="/packs" className="lt-packoffer__link">See all PDF packs</Link>
      </div>
    </section>
  );
}
