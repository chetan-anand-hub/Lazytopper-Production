import type { ReactNode } from "react";
import { PACK_PRICE_INR, chaptersOfSubject, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import { CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
import "./cbqBand.css";

/**
 * CbqBand - the Maths CBQ Pack and the Science CBQ Pack (CBQ-PACK-1, owner rulings 29 Oct 2026): ONE full-width, visually distinct
 * band used at the top of /packs and on /pricing right after the Premium block. Two products side by side (one per subject), each
 * with its own price and its own buy action, stacked full-width on a phone. Never "₹199 for both": each pack is ₹199 on its own.
 * The counts are static FLOORS ("1,400+", "100+ in every chapter") pinned by a test on the real selection. `action` is the page's own button or link.
 */
export const CBQ_HEADLINE = "Half your board paper is competency-based.";

export interface CbqBandProps {
  action: (subject: PackSubject) => ReactNode;
  /** Heading level the page wants (the /packs hero already has an h1). */
  headingId: string;
}

export default function CbqBand({ action, headingId }: CbqBandProps) {
  const price = packPriceLabel("pack_cbq");
  return (
    <section
      className="lt-cbq"
      id="cbq"
      aria-labelledby={headingId}
      data-testid="cbq-band"
      data-price={PACK_PRICE_INR.pack_cbq}
    >
      <span className="lt-cbq__badge">NEW · CBQ</span>
      <h2 className="lt-cbq__title" id={headingId}>{CBQ_HEADLINE}</h2>
      <p className="lt-cbq__sub">Curated CBQs, chapter-wise and topic-wise — MCQ, assertion-reason, short, case study and long answer, Sections A to E. Maths CBQ Pack {price} · Science CBQ Pack {price}.</p>
      <div className="lt-cbq__grid">
        {(["maths", "science"] as const).map((s) => {
          return (
            <div key={s} className="lt-cbq__card" data-testid={`cbq-card-${s}`}>
              <h3 className="lt-cbq__name">{subjectLabel(s)} CBQ Pack</h3>
              <p className="lt-cbq__price">{price}</p>
              <p className="lt-cbq__count">
                {CBQ_SUBJECT_CLAIM} · every chapter · 1- to 5-mark questions · step-wise worked solutions
              </p>
              <ul className="lt-cbq__list">
                <li>{chaptersOfSubject(s).length} chapters, {CBQ_CHAPTER_CLAIM}</li>
                <li>MCQ · Assertion-Reason · Short answer · Case study · Long answer</li>
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
