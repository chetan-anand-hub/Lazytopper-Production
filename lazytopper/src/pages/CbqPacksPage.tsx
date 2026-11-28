import { useEffect, useState } from "react";
import Cc27DetailBlock from "../components/crashCourse/Cc27DetailBlock";
import Cc27Chip from "../components/crashCourse/Cc27Chip";
import RestoredPurchaseCard from "../components/checkoutWho/RestoredPurchaseCard";
import { currentSalesPageSurface, setSalesPageSurface } from "../analytics/analytics";
import { preloadBuyChunks, warmPacksCheckout } from "../components/packs/PacksShop";
import { Link, useLocation } from "react-router-dom";
import PacksShop, { type PacksShopApi } from "../components/packs/PacksShop";
import { PackCbqBuy, sampleBuyFor } from "../components/packs/PackTileBuy";
import SubjectSwitch from "../components/packs/SubjectSwitch";
import PackSampleLink, { SampleBuyNext } from "../components/packs/PackSampleLink";
import "../components/pricing/cbqBand.css";
import { subjectFromSearch } from "../components/pricing/pricingPlansCopy";
import BoardsCountdownStrip from "../components/urgency/BoardsCountdownStrip";
import ParentReturnLink from "../components/parents/ParentReturnLink";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import SeoFaq from "../components/seo/SeoFaq";
import { CBQ_PACKS_ANSWER_FAQ } from "../components/seo/faqContent";
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
import { PACK_PRICE_INR, chaptersOfSubject, isPacksClientEnabled, packPriceLabel, subjectLabel, type PackSubject } from "../services/packs";
import { CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM, REDOWNLOAD_UNTIL } from "../lib/packs/packLabels";
import "../components/salesPages/salesPages.css";
import "./cbqPacksPage.css";

/**
 * PRICING-PAGES-1 (owner, 11 Nov 2026) - /cbq-packs: the CBQ Packs' own page. Every Buy, sample, "See inside", `?buy=` deep link,
 * signed-out sheet and post-pay landing is the SAME shop code as /packs (PacksShop + the CBQ band's PackCbqBuy, unchanged), with
 * sign-in returning HERE (`returnPath`). My packs stays on /packs (the "It's for me" landing is /packs?from=pay#my-packs, as today).
 */
export default function CbqPacksPage() {
  // F4: name this page on pack_view / pack_checkout / pack_purchase. Set in the FIRST render, before PacksShop's mount effect sends
  // pack_view; cleared on leave.
  useState(() => {
    setSalesPageSurface("cbq-packs");
    return null;
  });
  useEffect(() => {
    setSalesPageSurface("cbq-packs");
    // F1: the Buy opens the pack pop-up and the checkout sheet, both lazy chunks: fetch them now (same specifiers, same chunks).
    if (isPacksClientEnabled()) preloadBuyChunks();
    // PACKS-MOBILE-1: after load + idle (or the first touch): connections, checkout.js. Once per page load (a no-op if the module did it).
    warmPacksCheckout();
    // N1: clear only our own value - on /cbq-packs -> /board-pass the arriving page has already set its own in its first render.
    return () => {
      if (currentSalesPageSurface() === "cbq-packs") setSalesPageSurface(null);
    };
  }, []);
  const { search } = useLocation();
  // `?subject=maths|science` (and the one-tap `?buy=pack_cbq&t=science`) picks the switch in the FIRST render; default Maths.
  const [subject, setSubject] = useState<PackSubject>(() => subjectFromSearch(search) ?? "maths");
  return (
    <>
      <main className="lt-sp lt-cq" aria-label="LazyTopper CBQ Packs">
        <ParentReturnLink />
        <RestoredPurchaseCard />
        <PacksShop returnPath={CBQ_PACKS_PAGE_PATH} hideMyPacks>
          {(api) => <CbqCatalogue api={api} subject={subject} onSubject={setSubject} />}
        </PacksShop>
        <div className="lt-sp__w">
          <Cc27DetailBlock product="cbq" />
          {/* SEO-LLM-2: always-visible quick answers (the FAQPage JSON-LD in the head is these same items). */}
          <SeoFaq headingId="cq-answers-h" heading="CBQ practice for Class 10: quick answers" items={CBQ_PACKS_ANSWER_FAQ} />
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
          <Cc27Chip product="cbq" />
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
        <CbqBuyCard api={api} subject={subject} onSubject={onSubject} />
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

/**
 * The CBQ Pack card: the shop's own pieces (SubjectSwitch, PackCbqBuy = the /packs Buy path, PackSampleLink + the "Liked the sample?"
 * step), in the CBQ band's look (cbqBand.css), ordered so the Buy is on the first screen at 360 x 640: switch, name + price, Buy,
 * then what is in it. (The shared CbqBand puts a headline and a paragraph above the switch, which pushes Buy below the fold here.)
 */
function CbqBuyCard({ api, subject, onSubject }: { api: PacksShopApi; subject: PackSubject; onSubject: (s: PackSubject) => void }) {
  const [tapped, setTapped] = useState<PackSubject | null>(null);
  const next = tapped === subject ? sampleBuyFor(api, "pack_cbq")(subject) : null;
  return (
    <section className="lt-cbq lt-cbq--switch lt-cq-card" id="cbq" aria-labelledby="cq-card-h" data-testid="cbq-band" data-price={PACK_PRICE_INR.pack_cbq}>
      <div className="lt-cbq__card" data-testid={`cbq-card-${subject}`}>
        <SubjectSwitch value={subject} onChange={(s) => { onSubject(s); setTapped(null); }} label="CBQ Pack subject" tone="on-dark" testPrefix="cbq-subject" />
        <div className="lt-cq-card__head">
          <h2 className="lt-cbq__name" id="cq-card-h">{subjectLabel(subject)} CBQ Pack</h2>
          <p className="lt-cbq__price lt-cq-card__price">{packPriceLabel("pack_cbq")}</p>
        </div>
        {/* R4: the shop's own button (packs off: /packs' neutral "<Subject> CBQ Pack · <price>"; on: Buy). F1: `data-lt-twin` lets
            the island replay a tap made on the static copy onto the app's button here even though their labels differ. */}
        <div className="lt-cq-card__buy" data-lt-twin={`cq-buy-${subject}`}>
          <PackCbqBuy subject={subject} api={api} testPrefix="cq-card" />
        </div>
        <p className="lt-cbq__count">{CBQ_SUBJECT_CLAIM} · {chaptersOfSubject(subject).length} chapters, {CBQ_CHAPTER_CLAIM} · 1- to 5-mark questions · step-wise worked solutions</p>
        <div className="lt-cbq__sample">
          <PackSampleLink sku="pack_cbq" target={subject} surface="packs_cbq" tone="on-dark" onTapped={() => setTapped(subject)} />
        </div>
        {next && <SampleBuyNext sku="pack_cbq" subject={subject} buy={next} tone="on-dark" />}
      </div>
      <p className="lt-cbq__foot">One-time {packPriceLabel("pack_cbq")} per pack, download till {REDOWNLOAD_UNTIL}</p>
    </section>
  );
}
