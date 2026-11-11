import { Link } from "react-router-dom";
import type { SalesFaqItem } from "./salesPagesCopy";

/**
 * PRICING-PAGES-1 - the folded FAQ of /board-pass and /cbq-packs: native `<details>` (works before the app loads, and on the
 * island), one question per row, the answer only when opened.
 */
export default function SalesFaq({ items, headingId, title = "Questions", testId }: { items: ReadonlyArray<SalesFaqItem>; headingId: string; title?: string; testId: string }) {
  return (
    <section className="lt-sp-faq" aria-labelledby={headingId} data-testid={testId}>
      <h2 className="lt-sp-h2" id={headingId}>{title}</h2>
      <div className="lt-sp-faq__list">
        {items.map((item) => (
          <details key={item.q} className="lt-sp-faq__item">
            <summary className="lt-sp-faq__q">{item.q}</summary>
            <p className="lt-sp-faq__a">
              {item.a}
              {item.more && (
                <>
                  {" "}
                  <Link to={item.more.to}>{item.more.label}</Link>.
                </>
              )}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
