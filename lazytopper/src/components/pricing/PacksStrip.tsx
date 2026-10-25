import { Link } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";
import { ALL_NCERT_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import "./packsStrip.css";

/**
 * PacksStrip - the PDF packs as a real offer right under the pass cards on /pricing (PACKS-CLIENT-1, redesigned PACKS-UX-1 on
 * the owner's ruling that pack offers must be clearly visible). A section heading, the four packs as compact tiles with their
 * price, and a clear secondary button to /packs. Lazy-loaded by PricingPage (not needed on first paint). Prices are copy: the
 * server charges.
 */
const ITEMS: ReadonlyArray<{ sku: PackSku; name: string; what: string; best?: boolean }> = [
  { sku: "pack_chapter", name: "Chapter Pack", what: "Every question of 1 chapter, with a step-marked key" },
  { sku: "pack_mock", name: "Mock Pack", what: `${MOCKS_PER_SUBJECT} full board-pattern papers` },
  { sku: "pack_subject", name: "Subject Pack", what: "Every chapter of a subject + its mocks" },
  { sku: "pack_bundle", name: BUNDLE_NAME, what: `All ${ALL_NCERT_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks`, best: true },
];

/** The lowest pack price, for the heading ("from ₹49"). */
const FROM_PRICE = Math.min(...ITEMS.map((i) => PACK_PRICE_INR[i.sku]));

export default function PacksStrip() {
  return (
    <section className="lt-packoffer" aria-labelledby="lt-packoffer-h" data-testid="pricing-packs-strip">
      <div className="lt-packoffer__head">
        <h2 className="lt-packoffer__title" id="lt-packoffer-h">Prefer printed practice? PDF packs from &#8377;{FROM_PRICE}</h2>
        <p className="lt-packoffer__sub">Every question with an answer key that shows the marks for every step. One-time payment, never renews.</p>
      </div>
      <ul className="lt-packoffer__list">
        {ITEMS.map((i) => (
          <li key={i.sku} className={i.best ? "lt-packoffer__item lt-packoffer__item--best" : "lt-packoffer__item"} data-price={PACK_PRICE_INR[i.sku]}>
            <span className="lt-packoffer__name">{i.name}</span>
            <span className="lt-packoffer__price">{packPriceLabel(i.sku)}</span>
            <span className="lt-packoffer__what">{i.what}</span>
          </li>
        ))}
      </ul>
      <Link to="/packs" className="lt-packoffer__link">See all PDF packs</Link>
    </section>
  );
}
