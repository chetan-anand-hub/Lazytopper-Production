import { Link } from "react-router-dom";
import { PACK_PRICE_INR, subjectLabel, type PackSubject } from "../../services/packs";

/**
 * CBQ-SEO-1 — the two calls to action the public CBQ pages share, always in this order:
 * Premium (the step-by-step answer check, 7-day trial, no card), then the subject's CBQ Pack.
 * Both go to /pricing, which owns checkout; nothing on these pages sells or grants anything.
 * The trial wording is the site's own ("Try Premium free for 7 days — no card needed.",
 * BasicFreeList / PREMIUM_FOOTNOTE).
 */
export const CBQ_PREMIUM_HEADING = "Get your CBQ answers checked step by step";
export const CBQ_PREMIUM_BUTTON = "Try Premium free for 7 days";
export const CBQ_PREMIUM_NOTE = "No card needed. Write your answer, take a photo, and see the marks for each step.";
export const CBQ_PRICING_TO = "/pricing";
export const CBQ_PACK_TO = "/pricing#cbq";

export function CbqPremiumCta() {
  return (
    <section className="lt-cbqs__cta lt-cbqs__cta--premium" aria-labelledby="cbqs-premium" data-testid="cbq-cta-premium">
      <h2 id="cbqs-premium">{CBQ_PREMIUM_HEADING}</h2>
      <p>{CBQ_PREMIUM_NOTE}</p>
      <Link className="lt-cbqs__btn" to={CBQ_PRICING_TO} data-testid="cbq-cta-premium-link">
        {CBQ_PREMIUM_BUTTON}
      </Link>
    </section>
  );
}

/** One subject's pack line. The price is the pack's list price from PACK_PRICE_INR (copy only; the server prices the order). */
export function CbqPackCta({ subject }: { subject: PackSubject }) {
  const name = `${subjectLabel(subject)} CBQ Pack`;
  return (
    <section className="lt-cbqs__cta lt-cbqs__cta--pack" aria-labelledby="cbqs-pack" data-testid="cbq-cta-pack">
      <h2 id="cbqs-pack">Get every {subjectLabel(subject)} CBQ</h2>
      <p>{`${name} ₹${PACK_PRICE_INR.pack_cbq} · one-time payment, printable PDF with worked solutions.`}</p>
      <Link className="lt-cbqs__btn lt-cbqs__btn--ghost" to={CBQ_PACK_TO} data-testid="cbq-cta-pack-link">
        See the {name}
      </Link>
    </section>
  );
}
