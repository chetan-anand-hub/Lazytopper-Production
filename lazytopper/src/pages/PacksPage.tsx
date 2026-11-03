import { Link } from "react-router-dom";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import FounderBadge from "../components/brand/FounderBadge";
import PacksShop, { PACKS_RETURN_PATH, PACK_SIGNIN_NOTE, ownedPackTitle, packsResumePath, readBuyResume } from "../components/packs/PacksShop";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT, PREBOARDS_PICK_BADGE, PREBOARDS_PICK_LINE, REDOWNLOAD_COPY, isPreboardsSeason, REDOWNLOAD_SHORT } from "../lib/packs/packLabels";
import { chaptersOfSubject, packPriceLabel, type PackSku } from "../services/packs";
import { PackSampleChoice } from "../components/packs/PackSampleLink";
import CbqBand from "../components/pricing/CbqBand";
import PackTileBuy, { PackCbqBuy, sampleBuyFor } from "../components/packs/PackTileBuy";
import type { PacksShopApi } from "../components/packs/PacksShop";
import "./packs.css";
import "./packsTrust.css";
import TestimonialVideo from "../components/marketing/TestimonialVideo";

/** PRICING-ONE-1: the shop (My packs, pop-ups, Buy, buy-resume) moved to components/packs/PacksShop; these names stay importable from here. */
export { PACKS_RETURN_PATH, PACK_SIGNIN_NOTE, ownedPackTitle, packsResumePath, readBuyResume };

export default function PacksPage() {
  return (
    <main className="lt-packs" aria-label="LazyTopper PDF packs">
      <PacksShop returnPath={PACKS_RETURN_PATH}>
        {(api) => (
          <>
      <section className="lt-packs__hero" aria-labelledby="packs-h1">
        <div className="lt-packs__w lt-packs__herogrid">
          <div className="lt-packs__copy">
            <p className="lt-packs__kicker">PDF packs · CBSE Board Exam 2027</p>
            <FounderBadge tone="dark" />
            <h1 id="packs-h1">Every question. Worked solutions.</h1>
            <p className="lt-packs__lede">
              <span className="lt-packs__lede--long">Printable Class 10 Maths and Science question banks. Solve with a pen, then check your work against the worked solutions.</span>
              <span className="lt-packs__lede--short">Print, solve with a pen, check against worked solutions. Tap a pack to see inside.</span>
            </p>
            <p className="lt-packs__terms lt-packs__terms--hero">One-time payment · never renews · {REDOWNLOAD_SHORT}</p>
          </div>
          {/* PACKS-CONVERT-1 (owner, 3 Nov 2026): the order a visitor meets the packs - the Bundle ("Pre-boards pick") first, then the
              two CBQ packs (the most wanted samples), then Subject, Mock, Chapter. DOM order = visual order at every width, so the
              keyboard and screen-reader order match what is seen. */}
          <div className="lt-packs__shelf">
            <div className="lt-packs__tiles lt-packs__tiles--lead" role="list">
              {LEAD_TILES.map((t) => (
                <PackCell key={t.sku} t={t} api={api} />
              ))}
            </div>
          </div>
          <div className="lt-packs__cbqwrap">
            <CbqBand
              headingId="packs-cbq-h"
              sampleSurface="packs_cbq"
              action={(s) => <PackCbqBuy subject={s} api={api} testPrefix="packs-card-cbq" />}
              sampleBuy={sampleBuyFor(api, "pack_cbq")}
            />
          </div>
          <div className="lt-packs__more">
            <div className="lt-packs__tiles lt-packs__tiles--rest" role="list">
              {REST_TILES.map((t) => (
                <PackCell key={t.sku} t={t} api={api} />
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* TRUST-1: real student proof near the top, under the hero. Click-to-play; nothing loads from YouTube before the tap. */}
      <section className="lt-packs__proof" aria-labelledby="packs-video">
        <div className="lt-packs__w">
          <TestimonialVideo
            headingId="packs-video"
            heading="Where did his ½ mark go?"
            lede="A Class 10 student photographs his written answer and sees exactly where he lost ½ mark."
          />
        </div>
      </section>
          </>
        )}
      </PacksShop>

      <p className="lt-packs__terms lt-packs__terms--page">One-time payment · never renews · {REDOWNLOAD_SHORT}</p>

      <section aria-labelledby="packs-faq-h" className="lt-packs__faq">
        <div className="lt-packs__w">
          <h2 id="packs-faq-h" className="lt-packs__sr">Questions</h2>
          <div className="lt-packs__faqgrid">
            <details>
              <summary>What&rsquo;s inside a pack?</summary>
              <p>
                For each chapter: its questions grouped by CBSE section (A to E) with a matching answer key with worked solutions, two chapter
                tests and one worksheet (each with a key). Mock packs are eight full 80-mark papers per subject with keys. A few questions that depend on a
                diagram we can&rsquo;t print cleanly are left out, so every page can be solved on paper.
              </p>
            </details>
            <details>
              <summary>Can I download again later?</summary>
              <p>
                Yes. {REDOWNLOAD_COPY}: sign in, open My packs at the top of this page and download any file as often as you like. Packs are for your own
                use; each PDF carries your name, or your email or masked phone number, on every page, so please don&rsquo;t share the files.
              </p>
            </details>
            <details>
              <summary>Can I get my answers marked?</summary>
              <p>
                Chapter tests, worksheets and mock papers print a code (like PK-M-FULL-M1). After you solve one, upload your answers from the &ldquo;papers
                waiting for your answers&rdquo; row on Home and LazyTopper marks it. What marking you get there depends on your LazyTopper plan.
              </p>
            </details>
            <details>
              <summary>How is a pack different from the Board Pass?</summary>
              <p>
                Packs are one-time and never renew. The
                Board Pass adds what a PDF can&rsquo;t: your answers marked step by step, Mistake Intelligence, the tutor for doubts and online timed
                tests. <Link to="/pricing">Compare with the Board Pass</Link>.
              </p>
            </details>
            <details>
              <summary>What if a file doesn&rsquo;t open?</summary>
              <p>
                Download it again from My packs; PDFs open in any PDF reader or in your browser. Still stuck? <Link to="/contact">Contact us</Link>.
              </p>
            </details>
            <details>
              <summary>Can I cancel after buying?</summary>
              <p>
                All payments are final. LazyTopper does not give refunds. Read the <Link to="/legal/refund">Cancellation Policy</Link> before you buy.
              </p>
            </details>
          </div>
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}

type Tile = { sku: PackSku; id: string; kicker: string; name: string; lineLong: string; lineShort: string; contents?: string; best?: boolean };

/** One pack tile: the tile (opens "See inside"), its one-line contents, Buy, then the free samples (+ the buy that follows a sample). */
function PackCell({ t, api }: { t: Tile; api: PacksShopApi }) {
  const season = t.best && isPreboardsSeason();
  return (
    <div role="listitem" className={t.best ? "lt-packs__cell lt-packs__cell--best" : "lt-packs__cell"}>
      <button
        type="button"
        className={t.best ? "lt-packs__tile lt-packs__tile--best" : "lt-packs__tile"}
        onClick={() => api.openPack(t.sku)}
        aria-haspopup="dialog"
        data-testid={`packs-card-${t.id}`}
      >
        <span className="lt-packs__tkick">{season ? PREBOARDS_PICK_BADGE : t.kicker}</span>
        <span className="lt-packs__tname">{t.name}</span>
        <span className="lt-packs__tprice">{packPriceLabel(t.sku)}</span>
        <span className="lt-packs__tline lt-packs__tline--long">{season ? PREBOARDS_PICK_LINE : t.lineLong}</span>
        <span className="lt-packs__tline lt-packs__tline--short">{season ? PREBOARDS_PICK_LINE : t.lineShort}</span>
        <span className="lt-packs__topen">See inside →</span>
      </button>
      {/* PACKS-CONVERT-1 item 4: what is inside, in one line, right above Buy (counts only from the pack constants). */}
      {t.contents && (
        <p className="lt-packs__tcontents" data-testid={`packs-contents-${t.id}`}>
          {t.contents}
        </p>
      )}
      {/* PACKS-TILE-BUY-1: Buy right on the tile; "See inside" (the tile) and the sample stay secondary. PACK-SAMPLE-1: the sample
          link is a sibling of the tile button (a link cannot sit inside a button). PACKS-CONVERT-1: after a sample tap, the buy for
          that pack follows it right there. */}
      <PackTileBuy sku={t.sku} api={api} />
      <PackSampleChoice sku={t.sku} surface="packs_tile" buy={sampleBuyFor(api, t.sku)} />
    </div>
  );
}

const MATHS_PACK_CHAPTERS = chaptersOfSubject("maths").length;
const SCIENCE_PACK_CHAPTERS = chaptersOfSubject("science").length;

/** The Bundle leads (its tile already says "All 26 chapters + 16 board mocks", so it needs no extra contents line). */
const LEAD_TILES: ReadonlyArray<Tile> = [
  { sku: "pack_bundle", id: "bundle", kicker: "Best value", name: BUNDLE_NAME, lineLong: `Maths + Science: all ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks — the whole year at one price`, lineShort: `All ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks, one price`, best: true },
];

/** After the CBQ packs: price high to low. */
const REST_TILES: ReadonlyArray<Tile> = [
  { sku: "pack_subject", id: "subject", kicker: "Whole subject", name: "Subject Pack", lineLong: "Every chapter of Maths or Science — chapter-wise question bank 2026-27", lineShort: "Every chapter, Maths or Science, 2026-27", contents: `${MATHS_PACK_CHAPTERS} Maths or ${SCIENCE_PACK_CHAPTERS} Science chapters · Sections A–E · with keys` },
  { sku: "pack_mock", id: "mock", kicker: "Board papers", name: "Mock Pack", lineLong: "8 board-pattern mock papers for 2027, with step-marking keys", lineShort: "8 board-pattern mocks for 2027 + keys", contents: `${MOCKS_PER_SUBJECT} full papers for Maths or Science · step-marking keys` },
  { sku: "pack_chapter", id: "chapter", kicker: "One chapter", name: "Chapter Pack", lineLong: "Important questions for one chapter, with CBSE step-marking key", lineShort: "Important questions + step-marking key", contents: "Sections A–E · chapter tests · a worksheet · with keys" },
];
