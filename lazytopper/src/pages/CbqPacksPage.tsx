import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PacksShop, { type PacksShopApi } from "../components/packs/PacksShop";
import { PackCbqBuy, sampleBuyFor } from "../components/packs/PackTileBuy";
import CbqBand from "../components/pricing/CbqBand";
import { subjectFromSearch } from "../components/pricing/pricingPlansCopy";
import BoardsCountdownStrip from "../components/urgency/BoardsCountdownStrip";
import ParentReturnLink from "../components/parents/ParentReturnLink";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import SalesFaq from "../components/salesPages/SalesFaq";
import {
  BOARD_PASS_PAGE_PATH,
  CBQ_EYEBROW,
  CBQ_FAQ,
  CBQ_H1,
  CBQ_INSIDE,
  CBQ_INSIDE_TITLE,
  CBQ_LEDE,
  CBQ_MARKED_LINE,
  CBQ_OWNED_LINK,
  CBQ_PACKS_PAGE_PATH,
  CBQ_TILES,
  MY_PACKS_PATH,
  QUESTION_BANK_NAME,
  QUESTION_BANK_PAGE_PATH,
  questionBankFromPrice,
} from "../components/salesPages/salesPagesCopy";
import { subjectLabel, type PackSubject } from "../services/packs";
import "../components/salesPages/salesPages.css";
import "./cbqPacksPage.css";

/**
 * PRICING-PAGES-1 (owner, 11 Nov 2026) - /cbq-packs: the CBQ Packs' own page. Every Buy, sample, "See inside", `?buy=` deep link,
 * signed-out sheet and post-pay landing is the SAME shop code as /packs (PacksShop + the CBQ band's PackCbqBuy, unchanged), with
 * sign-in returning HERE (`returnPath`). My packs stays on /packs (the "It's for me" landing is /packs?from=pay#my-packs, as today).
 */
export default function CbqPacksPage() {
  const { search } = useLocation();
  // `?subject=maths|science` (and the one-tap `?buy=pack_cbq&t=science`) picks the switch in the FIRST render; default Maths.
  const [subject, setSubject] = useState<PackSubject>(() => subjectFromSearch(search) ?? "maths");
  return (
    <>
      <main className="lt-sp lt-cq" aria-label="LazyTopper CBQ Packs">
        <ParentReturnLink />
        <PacksShop returnPath={CBQ_PACKS_PAGE_PATH} hideMyPacks>
          {(api) => <CbqCatalogue api={api} subject={subject} onSubject={setSubject} />}
        </PacksShop>
        <div className="lt-sp__w">
          <SalesFaq items={CBQ_FAQ} headingId="cq-faq-h" testId="cq-faq" />
        </div>
      </main>
      <PublicLegalFooter packsHref={QUESTION_BANK_PAGE_PATH} />
    </>
  );
}

function CbqCatalogue({ api, subject, onSubject }: { api: PacksShopApi; subject: PackSubject; onSubject: (s: PackSubject) => void }) {
  // A Buy or deep link that targets the CBQ pack on a subject (the shop's own state) moves the switch to it (as /packs does).
  const openSku = api.openSku ?? null;
  const shopSubject = api.subject;
  useEffect(() => {
    if (openSku === "pack_cbq" && shopSubject) onSubject(shopSubject);
  }, [openSku, shopSubject, onSubject]);
  const owned = api.buyEnabled && api.ownsPack("pack_cbq", subject);
  return (
    <>
      <section className="lt-cq-hero" aria-labelledby="cq-h1">
        <div className="lt-sp__w">
          <p className="lt-sp-eyebrow lt-cq-hero__eyebrow">{CBQ_EYEBROW}</p>
          <h1 id="cq-h1" className="lt-cq-hero__h1">{CBQ_H1}</h1>
          <p className="lt-cq-hero__lede">{CBQ_LEDE}</p>
          <div className="lt-cq-tiles">
            {CBQ_TILES.map((t) => (
              <div key={t.id} className="lt-cq-tile" data-testid={`cq-tile-${t.id}`}>
                <span className="lt-cq-tile__figure">{t.figure}</span>
                <span className="lt-cq-tile__label">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="lt-sp__w lt-cq-band">
        <CbqBand
          variant="switch"
          subject={subject}
          onSubject={onSubject}
          headingId="cq-band-h"
          sampleSurface="packs_cbq"
          action={(s) => <PackCbqBuy subject={s} api={api} testPrefix="cq-card" />}
          sampleBuy={sampleBuyFor(api, "pack_cbq")}
        />
        {owned && (
          <p className="lt-cq-owned" role="status" data-testid="cq-owned">
            You own the {subjectLabel(subject)} CBQ Pack. <Link to={MY_PACKS_PATH} data-testid="cq-open-my-packs">{CBQ_OWNED_LINK}</Link>
          </p>
        )}
      </div>

      <div className="lt-sp__w lt-sp__strip">
        <BoardsCountdownStrip />
      </div>

      <section className="lt-sp__w" aria-labelledby="cq-inside-h">
        <h2 id="cq-inside-h" className="lt-sp-h2">{CBQ_INSIDE_TITLE}</h2>
        <ul className="lt-cq-inside" data-testid="cq-inside">
          {CBQ_INSIDE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="lt-sp__w" aria-label="Get your answers marked">
        <Link className="lt-cq-marked" to={BOARD_PASS_PAGE_PATH} data-testid="cq-link-board-pass">
          {CBQ_MARKED_LINE}
        </Link>
      </section>

      <section className="lt-sp__w" aria-label="More printed practice">
        <div className="lt-sp-links lt-sp-links--one">
          <Link className="lt-sp-link" to={QUESTION_BANK_PAGE_PATH} data-testid="cq-link-bank">
            <strong>{QUESTION_BANK_NAME}</strong>
            <span>{questionBankFromPrice()} &rarr;</span>
          </Link>
        </div>
      </section>
    </>
  );
}
