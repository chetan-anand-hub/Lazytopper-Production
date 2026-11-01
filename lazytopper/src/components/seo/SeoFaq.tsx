import type { FaqItem } from "./faqContent";
import "./seoFaq.css";

/**
 * SEO-QUICK-1 — a plain, always-visible FAQ (question as h3, answer as p) so the text is in the
 * prerendered HTML and matches the FAQPage JSON-LD built from the same items.
 */
export default function SeoFaq({ headingId, heading, items }: { headingId: string; heading: string; items: readonly FaqItem[] }) {
  return (
    <section className="lt-seofaq" aria-labelledby={headingId} data-testid="seo-faq">
      <h2 id={headingId}>{heading}</h2>
      {items.map((item) => (
        <div key={item.question} className="lt-seofaq__item">
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </section>
  );
}
