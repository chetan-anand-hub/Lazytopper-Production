import type { ReactNode } from "react";
import { PACK_PRICE_INR, chaptersOfSubject, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import type { CbqTotals } from "../../lib/packs/useCbqTotals";
import "./cbqBand.css";

/**
 * CbqBand - the Maths CBQ Pack and the Science CBQ Pack (CBQ-PACK-1, owner rulings 29 Oct 2026): ONE full-width, visually distinct
 * band used at the top of /packs and on /pricing right after the Premium block. Two products side by side (one per subject), each
 * with its own price and its own buy action, stacked full-width on a phone. Never "₹199 for both": each pack is ₹199 on its own.
 * The counts are computed from the bank (null = not loaded yet: words, no number). `action` is the page's own button or link.
 */
export const CBQ_HEADLINE = "Half your board paper is competency-based.";

export interface CbqBandProps {
  totals: CbqTotals;
  action: (subject: PackSubject) => ReactNode;
  /** Pointer / focus / touch on the band: the page may start loading the counts. */
  onTouch?: () => void;
  /** Heading level the page wants (the /packs hero already has an h1). */
  headingId: string;
}

export default function CbqBand({ totals, action, onTouch, headingId }: CbqBandProps) {
  const price = packPriceLabel("pack_cbq");
  return (
    <section
      className="lt-cbq"
      id="cbq"
      aria-labelledby={headingId}
      data-testid="cbq-band"
      data-price={PACK_PRICE_INR.pack_cbq}
      onPointerEnter={onTouch}
      onFocusCapture={onTouch}
      onTouchStart={onTouch}
    >
      <span className="lt-cbq__badge">NEW · CBQ</span>
      <h2 className="lt-cbq__title" id={headingId}>{CBQ_HEADLINE}</h2>
      <p className="lt-cbq__sub">Every chapter, every mark value, step-wise solutions. Maths CBQ Pack {price} · Science CBQ Pack {price}.</p>
      <div className="lt-cbq__grid">
        {(["maths", "science"] as const).map((s) => {
          const n = totals[s];
          return (
            <div key={s} className="lt-cbq__card" data-testid={`cbq-card-${s}`}>
              <h3 className="lt-cbq__name">{subjectLabel(s)} CBQ Pack</h3>
              <p className="lt-cbq__price">{price}</p>
              <p className="lt-cbq__count">
                {n !== null ? `${n.toLocaleString("en-IN")} CBQs` : "Every competency question"} · every chapter · every mark value 1–5 · step-wise solutions
              </p>
              <ul className="lt-cbq__list">
                <li>{chaptersOfSubject(s).length} chapters</li>
                <li>MCQ · Assertion-Reason · Case study · Long answer</li>
                <li>Your name on every page</li>
              </ul>
              {action(s)}
            </div>
          );
        })}
      </div>
      <p className="lt-cbq__foot">One-time {price} per pack, download till May 2027 · Made by an IITian (IIT Kanpur)</p>
    </section>
  );
}
