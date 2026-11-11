import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loadSubscription, onSubscriptionHydrated, type SubscriptionStatus } from "../services/subscriptionService";
import { formatPassDate } from "../services/checkout";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import FounderBadge from "../components/brand/FounderBadge";
import PacksShop, { PACKS_RETURN_PATH, PACK_SIGNIN_NOTE, ownedPackTitle, packsResumePath, readBuyResume } from "../components/packs/PacksShop";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT, PREBOARDS_PICK_BADGE, PREBOARDS_PICK_LINE, REDOWNLOAD_COPY, isPreboardsSeason, REDOWNLOAD_SHORT } from "../lib/packs/packLabels";
import { chaptersOfSubject, packPriceLabel, subjectLabel, type PackSku, type PackSubject } from "../services/packs";
import PackSampleLink, { PackSampleChoice, SampleBuyNext } from "../components/packs/PackSampleLink";
import SubjectSwitch from "../components/packs/SubjectSwitch";
import CbqBand from "../components/pricing/CbqBand";
import PackTileBuy, { PackCbqBuy, sampleBuyFor } from "../components/packs/PackTileBuy";
import type { PacksShopApi } from "../components/packs/PacksShop";
import "./packs.css";
import "./packsTrust.css";
import "./packsTidy.css";
import TestimonialVideo from "../components/marketing/TestimonialVideo";
// GST-INVOICE-1: the signed-in student's tax invoices (renders nothing unless VITE_GST_STATE_FIELD is on and there are some).
import MyInvoices from "../components/gstInvoice/MyInvoices";
import BoardsCountdownStrip from "../components/urgency/BoardsCountdownStrip";
import { PACK_PREBOARD_LINE, PACK_PREBOARD_LINE_SHORT } from "../components/urgency/boardsCountdown";

/** PRICING-ONE-1: the shop (My packs, pop-ups, Buy, buy-resume) moved to components/packs/PacksShop; these names stay importable from here. */
export { PACKS_RETURN_PATH, PACK_SIGNIN_NOTE, ownedPackTitle, packsResumePath, readBuyResume };

/** PARENT-PACKS-1 (owner, from #1540's report) - the one line a Board Pass (till boards) owner sees at the top of /packs. */
export const packsBoardPassLine = (dateLabel: string): string => `Your Board Pass is active until ${dateLabel}.`;

/** The running Board Pass's end date label, or null. PURE (the clock is an argument). */
export function boardPassOwnerLabel(status: SubscriptionStatus | null | undefined, nowMs: number): string | null {
  if (!status || status.tier !== "premium" || status.plan !== "pass_till_boards") return null;
  const end = status.passEnd ? Date.parse(status.passEnd) : NaN;
  if (!Number.isFinite(end) || end <= nowMs) return null;
  return formatPassDate(status.passEnd);
}

/**
 * The cached subscription (as usePaidPremium reads it: no network, no trial side effects), followed on hydration. Signed out -> null,
 * so the signed-out page (and the prerender) renders nothing here.
 */
function useBoardPassOwnerLabel(): string | null {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) {
      setLabel(null);
      return undefined;
    }
    try {
      setLabel(boardPassOwnerLabel(loadSubscription(uid), Date.now()));
    } catch {
      setLabel(null);
    }
    return onSubscriptionHydrated((u, status) => {
      if (u === uid) setLabel(boardPassOwnerLabel(status, Date.now()));
    });
  }, [uid]);
  return label;
}

function BoardPassOwnerLine() {
  const label = useBoardPassOwnerLabel();
  if (!label) return null;
  return (
    <p className="lt-packs__terms lt-packs__terms--hero" role="status" data-testid="packs-board-pass-active">
      {packsBoardPassLine(label)}
    </p>
  );
}

export default function PacksPage() {
  return (
    <main className="lt-packs" aria-label="LazyTopper PDF packs">
      <PacksShop returnPath={PACKS_RETURN_PATH}>
        {(api) => (
          <>
      <section className="lt-packs__hero lt-pt__hero" aria-labelledby="packs-h1">
        <div className="lt-packs__w">
          <div className="lt-pt__copy">
            <p className="lt-packs__kicker">PDF packs · CBSE Board Exam 2027</p>
            <FounderBadge tone="dark" />
            <BoardPassOwnerLine />
            <h1 id="packs-h1">Every question. Worked solutions.</h1>
            <p className="lt-packs__lede">Printable Class 10 Maths and Science question banks. Solve with a pen, then check your work against the worked solutions.</p>
            <p className="lt-packs__terms lt-pt__terms">One-time payment · never renews · {REDOWNLOAD_SHORT}</p>
          </div>
        </div>
      </section>
      <div className="lt-packs__w"><BoardsCountdownStrip /></div>
      <Catalogue api={api} />
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

      <MyInvoices collapsible />

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

type Tile = { sku: PackSku; id: string; name: string; line: string; contents: string };

/**
 * PACKS-TIDY-1 (owner, 9 Nov 2026): the shop as ONE short page. The Bundle (featured, always open) and the CBQ Pack (one card, a
 * Maths / Science switch) first; then ONE group of collapsed rows for the smaller packs (Subject, Mock, Chapter). DOM order = visual
 * order at every width. Every Buy / sample / See inside below is the unchanged shop code, only placed differently.
 */
function Catalogue({ api }: { api: PacksShopApi }) {
  const [cbqSubject, setCbqSubject] = useState<PackSubject>("maths");
  const openSku = api.openSku ?? null;
  const shopSubject = api.subject;
  // A deep link (`?pack=cbq&subject=science`, `?buy=pack_cbq&t=science`) preselects the switch.
  useEffect(() => {
    if (openSku === "pack_cbq" && shopSubject) setCbqSubject(shopSubject);
  }, [openSku, shopSubject]);
  const season = isPreboardsSeason();
  // The tile line is evergreen copy and always in the markup (a date-gated line would make the committed prerender go stale on 16 Feb).
  const preboardLine = <PreboardTileLine />;
  return (
    <section className="lt-pt" aria-label="Choose a pack">
      <div className="lt-packs__w">
        <p className="lt-pt__samples">Free samples: one-page PDFs, no sign-up.</p>
        <div className="lt-pt__top">
          <div className="lt-pt__card lt-pt__card--best" data-testid="packs-cell-bundle">
            <span className="lt-pt__badge">{season ? PREBOARDS_PICK_BADGE : "Best value"}</span>
            <h2 className="lt-pt__name">{BUNDLE_NAME}</h2>
            <p className="lt-pt__price">{packPriceLabel("pack_bundle")}</p>
            <p className="lt-pt__line">{season ? PREBOARDS_PICK_LINE : `All ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks, one price`}</p>
            {preboardLine}
            <PackTileBuy sku="pack_bundle" api={api} />
            <button type="button" className="lt-ptb__see" onClick={() => api.openPack("pack_bundle")} aria-haspopup="dialog" data-testid="packs-card-bundle">
              See inside &rarr;
            </button>
            <PackSampleChoice sku="pack_bundle" surface="packs_tile" buy={sampleBuyFor(api, "pack_bundle")} />
          </div>
          <CbqBand
            variant="switch"
            subject={cbqSubject}
            onSubject={setCbqSubject}
            headingId="packs-cbq-h"
            sampleSurface="packs_cbq"
            action={(s) => <PackCbqBuy subject={s} api={api} testPrefix="packs-card-cbq" />}
            sampleBuy={sampleBuyFor(api, "pack_cbq")}
          />
        </div>
        <section className="lt-pt__more" aria-labelledby="packs-more-h">
          <h2 id="packs-more-h" className="lt-pt__morehd">Only need one subject, the mocks, or one chapter?</h2>
          <div className="lt-pt__rows">
            {SMALL_PACKS.map((t) => (
              <SmallPackRow key={t.sku} t={t} api={api} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

/** URGENCY-1: the one reinforcing line under a pack description (packs = self-check; Board Pass = CBSE-examiner marking). */
function PreboardTileLine({ testId = "packs-preboard-line-bundle" }: { testId?: string }) {
  return (
    <p className="lt-pt__preboard" data-testid={testId}>
      <span className="lt-pt__pb-long">{PACK_PREBOARD_LINE}</span>
      <span className="lt-pt__pb-short">{PACK_PREBOARD_LINE_SHORT}</span>
    </p>
  );
}

/** One smaller pack: collapsed = name, price, one line; open = contents, the subject switch (Subject / Mock), Buy, See inside, sample. */
function SmallPackRow({ t, api }: { t: Tile; api: PacksShopApi }) {
  const hasSubject = t.sku === "pack_subject" || t.sku === "pack_mock";
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<PackSubject>("maths");
  const [tapped, setTapped] = useState<PackSubject | null>(null);
  const ref = useRef<HTMLDetailsElement | null>(null);
  const openSku = api.openSku ?? null;
  const shopSubject = api.subject;
  // A deep link or a Buy that targets this pack (?chapter=, ?mock=, ?pack=, ?buy=): open its row, preselect the subject, bring it into view.
  const wasOpenSku = useRef<PackSku | null>(null);
  useEffect(() => {
    if (openSku !== t.sku) {
      wasOpenSku.current = openSku;
      return;
    }
    setOpen(true);
    if (hasSubject && shopSubject) setSubject(shopSubject);
    if (wasOpenSku.current !== t.sku) ref.current?.scrollIntoView?.({ block: "nearest" });
    wasOpenSku.current = openSku;
  }, [openSku, shopSubject, t.sku, hasSubject]);
  const next = tapped && hasSubject ? sampleBuyFor(api, t.sku)(tapped) : null;
  return (
    <details
      ref={ref}
      className="lt-pt__row"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      data-testid={`packs-row-${t.id}`}
    >
      <summary className="lt-pt__sum">
        <span className="lt-pt__sname">{t.name}</span>
        <span className="lt-pt__sprice">{packPriceLabel(t.sku)}</span>
        <span className="lt-pt__sline">{t.line}</span>
      </summary>
      <div className="lt-pt__body">
        <p className="lt-pt__contents" data-testid={`packs-contents-${t.id}`}>{t.contents}</p>
        {t.sku === "pack_mock" ? <PreboardTileLine testId="packs-preboard-line-mock" /> : null}
        {hasSubject && <SubjectSwitch value={subject} onChange={(s) => { setSubject(s); setTapped(null); }} label={`${t.name} subject`} testPrefix={`packs-subject-${t.id}`} />}
        <PackTileBuy sku={t.sku} api={api} subject={hasSubject ? subject : undefined} />
        <button
          type="button"
          className="lt-ptb__see"
          onClick={() => (hasSubject && api.openPackWith ? api.openPackWith(t.sku, subject) : api.openPack(t.sku))}
          aria-haspopup="dialog"
          data-testid={`packs-card-${t.id}`}
        >
          See inside &rarr;
        </button>
        {hasSubject ? (
          <>
            <PackSampleLink sku={t.sku} target={subject} surface="packs_tile" label={`Free sample (${subjectLabel(subject)})`} onTapped={() => setTapped(subject)} />
            {next && <SampleBuyNext sku={t.sku} subject={subject} buy={next} />}
          </>
        ) : (
          <PackSampleChoice sku={t.sku} surface="packs_tile" buy={sampleBuyFor(api, t.sku)} />
        )}
      </div>
    </details>
  );
}

const MATHS_PACK_CHAPTERS = chaptersOfSubject("maths").length;
const SCIENCE_PACK_CHAPTERS = chaptersOfSubject("science").length;

/** The smaller packs, price high to low (same order and the same pack constants as before). */
const SMALL_PACKS: ReadonlyArray<Tile> = [
  { sku: "pack_subject", id: "subject", name: "Subject Pack", line: "Every chapter, Maths or Science, 2026-27", contents: `${MATHS_PACK_CHAPTERS} Maths or ${SCIENCE_PACK_CHAPTERS} Science chapters · Sections A–E · with keys` },
  { sku: "pack_mock", id: "mock", name: "Mock Pack", line: "8 board-pattern mocks for 2027 + keys", contents: `${MOCKS_PER_SUBJECT} full papers for Maths or Science · step-marking keys` },
  { sku: "pack_chapter", id: "chapter", name: "Chapter Pack", line: "Important questions + step-marking key", contents: "Sections A–E · chapter tests · a worksheet · with keys" },
];
