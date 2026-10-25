import { Link } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";
import { ALL_NCERT_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import "./packsStrip.css";

/**
 * PacksStrip — the PDF packs, one line and four prices, below the pass cards on /pricing (PACKS-CLIENT-1).
 * Lazy-loaded by PricingPage (it is not needed on first paint). Prices are copy: the server charges.
 */
const ITEMS: ReadonlyArray<{ sku: PackSku; name: string; what: string }> = [
  { sku: "pack_chapter", name: "Chapter", what: "1 chapter" },
  { sku: "pack_mock", name: "Mocks", what: `${MOCKS_PER_SUBJECT} papers` },
  { sku: "pack_subject", name: "Subject", what: "Every chapter + mocks" },
  { sku: "pack_bundle", name: BUNDLE_NAME, what: `All ${ALL_NCERT_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks` },
];

export default function PacksStrip() {
  return (
    <section className="lt-pstrip" aria-label="PDF packs" data-testid="pricing-packs-strip">
      <div className="lt-pstrip__head">
        <h2 className="lt-pstrip__title">Just want printable question banks?</h2>
        <p className="lt-pstrip__sub">PDF packs with worked solutions. One-time payment, never renews.</p>
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
