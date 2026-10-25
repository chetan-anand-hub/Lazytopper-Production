import { Link } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";
import "./packsStrip.css";

/**
 * PacksStrip — the PDF packs, one line and four prices, below the pass cards on /pricing (PACKS-CLIENT-1).
 * Lazy-loaded by PricingPage (it is not needed on first paint). Prices are copy: the server charges.
 */
const ITEMS: ReadonlyArray<{ sku: PackSku; name: string; what: string }> = [
  { sku: "pack_chapter", name: "Chapter", what: "1 chapter" },
  { sku: "pack_mock", name: "Mocks", what: "5 papers" },
  { sku: "pack_subject", name: "Subject", what: "13 chapters + mocks" },
  { sku: "pack_bundle", name: "Bundle", what: "Maths + Science" },
];

export default function PacksStrip() {
  return (
    <section className="lt-pstrip" aria-label="PDF packs" data-testid="pricing-packs-strip">
      <div className="lt-pstrip__head">
        <h2 className="lt-pstrip__title">Just want printable question banks?</h2>
        <p className="lt-pstrip__sub">PDF packs with worked solutions. One-time payment, no subscription.</p>
      </div>
      <ul className="lt-pstrip__list">
        {ITEMS.map((i) => (
          <li key={i.sku} className="lt-pstrip__item" data-price={PACK_PRICE_INR[i.sku]}>
            <span className="lt-pstrip__name">{i.name}</span>
            <span className="lt-pstrip__price">{packPriceLabel(i.sku)}</span>
            <span className="lt-pstrip__what">{i.what}</span>
          </li>
        ))}
      </ul>
      <Link to="/packs" className="lt-pstrip__link">See what&rsquo;s inside &rarr;</Link>
    </section>
  );
}
