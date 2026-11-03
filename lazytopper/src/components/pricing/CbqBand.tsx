import { useState, type ReactNode } from "react";
import { PACK_PRICE_INR, chaptersOfSubject, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import { CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
import PackSampleLink, { SampleBuyNext, type SampleBuy } from "../packs/PackSampleLink";
import { buyHrefFor } from "../packs/offersModel";
import type { PackSampleSurface } from "../../lib/packs/packSamples";
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
  /** PACK-SAMPLE-1: which page the band is on; each card gets a "Free sample page" link under its action (secondary to the buy action). */
  sampleSurface: PackSampleSurface;
  /**
   * PACKS-CONVERT-1: the buy step shown under a card's sample link after the tap ("Liked the sample? Get the Maths CBQ Pack · ₹199").
   * A page with the shop passes its one-tap buy (hidden when owned / packs dark); left out (the /cbq-class-10 hub, which has no shop
   * and no ownership read), it is always the one-tap checkout link `/packs?buy=…&from=sample` - /packs then handles an owned pack.
   */
  sampleBuy?: (subject: PackSubject) => SampleBuy | null;
}

/** Review fix 2: `from=sample` rides on the one-tap link; /packs adds it to the ONE pack_checkout it sends on that resume. */
const hrefBuy = (s: PackSubject): SampleBuy => ({ href: `${buyHrefFor("pack_cbq", s)}&from=sample` });

export default function CbqBand({ action, headingId, sampleSurface, sampleBuy = hrefBuy }: CbqBandProps) {
  const price = packPriceLabel("pack_cbq");
  const [tapped, setTapped] = useState<PackSubject | null>(null);
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
              <div className="lt-cbq__sample">
                <PackSampleLink sku="pack_cbq" target={s} surface={sampleSurface} tone="on-dark" onTapped={() => setTapped(s)} />
              </div>
              {tapped === s && <SampleNext subject={s} buy={sampleBuy(s)} />}
            </div>
          );
        })}
      </div>
      <p className="lt-cbq__foot">One-time {price} per pack, download till May 2027 · Made by an IITian (IIT Kanpur)</p>
    </section>
  );
}

function SampleNext({ subject, buy }: { subject: PackSubject; buy: SampleBuy | null }) {
  return buy ? <SampleBuyNext sku="pack_cbq" subject={subject} buy={buy} tone="on-dark" /> : null;
}
