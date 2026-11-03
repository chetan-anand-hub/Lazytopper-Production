import { Link } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import { buyHrefFor } from "../packs/offersModel";

/**
 * CBQ-SEO-1 — the two calls to action the public CBQ pages share, always in this order:
 * Premium (step marking, 7-day trial, no card), then the subject's CBQ Pack.
 * BYTE-CBQ-1: the Premium button goes to /pricing; the pack buttons go straight to one-tap checkout
 * (`/packs?buy=pack_cbq&t=<subject>`, the OFFERS-V2 link PacksShop reads), not to the /pricing#cbq anchor.
 * Nothing on these pages grants anything; the server prices and verifies the order.
 * The trial wording is the site's own ("Try Premium free for 7 days — no card needed.",
 * BasicFreeList / PREMIUM_FOOTNOTE).
 */
export const CBQ_PREMIUM_HEADING = "Practise CBQs with step marking";
export const CBQ_PREMIUM_BUTTON = "Try Premium free for 7 days";
export const CBQ_PREMIUM_NOTE = "No card needed. Write your answer, take a photo, and see the marks for each step.";
export const CBQ_PRICING_TO = "/pricing";

/** The one-tap checkout link for a subject's CBQ Pack (same builder OFFERS-V2 uses; never typed by hand). */
export function cbqBuyHref(subject: PackSubject): string {
  return buyHrefFor("pack_cbq", subject);
}

/** "Buy Maths CBQ · ₹199" - the button label (price from the pack constants). */
export function cbqBuyLabel(subject: PackSubject): string {
  return `Buy ${subjectLabel(subject)} CBQ · ${packPriceLabel("pack_cbq")}`;
}

/**
 * BYTE-CBQ-1 - the price and the two buy buttons for the FIRST screen of /cbq-class-10 (under the H1), so a phone
 * shows what it costs and where to pay without scrolling. Copy avoids the words Google Ads policy bans on this page.
 */
export function CbqHeroBuy() {
  return (
    <div className="lt-cbqs__herobuy" data-testid="cbq-hero-buy">
      <p className="lt-cbqs__heroprice">
        {`CBQ Pack ${packPriceLabel("pack_cbq")} per subject · one-time payment · printable PDF with step-by-step explanations`}
      </p>
      <div className="lt-cbqs__herobtns">
        {(["maths", "science"] as const).map((s) => (
          <Link key={s} className="lt-cbqs__btn" to={cbqBuyHref(s)} data-testid={`cbq-hero-buy-${s}`}>
            {cbqBuyLabel(s)}
          </Link>
        ))}
      </div>
    </div>
  );
}

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
      <p>{`${name} ₹${PACK_PRICE_INR.pack_cbq} · one-time payment, printable PDF with worked steps.`}</p>
      <Link className="lt-cbqs__btn lt-cbqs__btn--ghost" to={cbqBuyHref(subject)} data-testid="cbq-cta-pack-link">
        {cbqBuyLabel(subject)}
      </Link>
    </section>
  );
}
