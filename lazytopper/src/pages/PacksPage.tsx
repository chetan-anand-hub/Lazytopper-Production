import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loadSubscription, onSubscriptionHydrated, type SubscriptionStatus } from "../services/subscriptionService";
import { formatPassDate } from "../services/checkout";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import FounderBadge from "../components/brand/FounderBadge";
import PacksShop, { PACKS_RETURN_PATH, PACK_SIGNIN_NOTE, ownedPackTitle, packsResumePath, readBuyResume } from "../components/packs/PacksShop";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, CBQ_SUBJECT_CLAIM, MOCKS_PER_SUBJECT, PREBOARDS_PICK_BADGE, PREBOARDS_PICK_LINE, REDOWNLOAD_COPY, isPreboardsSeason, REDOWNLOAD_SHORT } from "../lib/packs/packLabels";
import { BUNDLE_QUESTIONS_CLAIM } from "../lib/packs/bundleClaim";
import { cbqRedirectTarget } from "../lib/packs/cbqRedirect";
import { chaptersOfSubject, packGstBreakdown, packPayLabel, packPriceLabel, subjectLabel, type PackSku, type PackSubject } from "../services/packs";
import PackSampleLink, { PackSampleChoice, SampleBuyNext } from "../components/packs/PackSampleLink";
import SubjectSwitch from "../components/packs/SubjectSwitch";
import PackTileBuy, { sampleBuyFor } from "../components/packs/PackTileBuy";
import type { PacksShopApi } from "../components/packs/PacksShop";
import { packsUrlSubject } from "../lib/packs/packsUrlSubject";
import { BOARD_PASS_NAME } from "../config/pricing";
import "./packs.css";
import "./packsTrust.css";
import "./packsTidy.css";
import "./packsHub.css";
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

/**
 * A2 (speed): the phone's Bundle bar is its own lazy chunk, fetched after the page is up (it is never in the first paint, and its module
 * brings the pricing page's copy with it).
 */
const SalesStickyBar = lazy(() => import("../components/salesPages/SalesStickyBar"));

/**
 * The sales pages' shared names, paths and the Board Pass line, word for word (salesPagesCopy.ts); kept here so /packs' first chunk does
 * not carry that module. PacksPage.test pins each one equal to salesPagesCopy's.
 */
export const QUESTION_BANK_NAME = "Question Bank + Mocks";
export const CBQ_PACKS_NAME = "CBQ Packs";
export const CBQ_PACKS_PAGE_PATH = "/cbq-packs";
export const BOARD_PASS_PAGE_PATH = "/board-pass";
export const CBQ_MARKED_LINE = `Solve on paper, then get your answers marked like a CBSE examiner with the ${BOARD_PASS_NAME} →`;

/** PACKS-TIDY-2 (owner, 11 Nov 2026): the page's product name, eyebrow and H1 (the ads' words: PDF packs, Class 10, worked solutions). */
export const PACKS_EYEBROW = `${QUESTION_BANK_NAME.toUpperCase()} · CBSE CLASS 10 · BOARDS 2027`;
export const PACKS_H1 = `${QUESTION_BANK_NAME}: Class 10 Maths and Science PDF packs`;
/**
 * A2 (speed): the H1 is drawn as three fixed lines, each short enough for ONE line at 320 px in Fraunces and in any fallback. Its line
 * count (so its height and the page below it) is then the same in every font, and with the first screen's font-display: block
 * (packsHub.css) the H1 is painted once, in Fraunces, and never grows into a new, later largest-contentful-paint when the app takes
 * over. Joined, the lines are PACKS_H1 exactly (the heading's text for crawlers and screen readers is unchanged).
 */
export const PACKS_H1_LINES: readonly string[] = [`${QUESTION_BANK_NAME}: `, "Class 10 Maths and ", "Science PDF packs"];
/**
 * The hero sentence. Owner 11 Nov 19:21 asked for "… Worked solutions as per the CBSE marking scheme." ONLY if every question sold here is
 * step-marked; measured 11 Nov on the real selections it is not (Bundle sheets 9,420 of 10,686 step-marked; mocks and CBQ packs 100%), so
 * the standing wording stays (owner ruling 25 Oct: no "every question step-marked" claim until the rest have step-wise solutions).
 */
export const PACKS_HERO_LINE = "Every question. Worked solutions.";
export const PACKS_LEDE = "Printable Class 10 Maths and Science question banks. Solve with a pen, then check your work against the worked solutions.";
export const PACKS_PART_HEADING = "Need only part of it?";
export const PACKS_CBQ_SEPARATE = "CBQ Packs are separate.";
export const PACKS_SAMPLES_NOTE = "Free samples: one-page PDFs, no sign-up.";

export default function PacksPage() {
  const location = useLocation();
  // PACKS-TIDY-2: the CBQ Packs' buy block lives on /cbq-packs now. `/packs#cbq` (ads, old links) lands there in ONE step (replace),
  // with the subject, ad ids / utm_* and `from` kept; nothing of /packs mounts first (no pack_view here). The island does the same on
  // the static page (contentIsland.ts boot), so this covers in-app navigation and a page served without the island.
  // Decided ONCE, on the URL the page mounted with: the shop's own `?buy=` resume later strips `buy` and keeps the hash
  // (`/packs?buy=pack_cbq&t=maths#cbq` -> `/packs#cbq`), and that must never send a running checkout away from this page.
  const [cbqTarget] = useState(() => cbqRedirectTarget(location));
  if (cbqTarget) return <Navigate to={cbqTarget} replace />;
  return <PacksPageBody />;
}

function PacksPageBody() {
  const { search } = useLocation();
  // `?subject=` (and `?t=`, `?mock=`, `?chapter=`) picks the ONE Maths / Science switch in the first render; default Maths.
  const [subject, setSubject] = useState<PackSubject>(() => packsUrlSubject(search) ?? "maths");
  return (
    <main className="lt-packs lt-pk" aria-label="LazyTopper PDF packs">
      <PacksShop returnPath={PACKS_RETURN_PATH}>
        {(api) => (
          <>
            <Hero api={api} />
            <div className="lt-packs__w lt-pk__strip"><BoardsCountdownStrip /></div>
            <PartPacks api={api} subject={subject} onSubject={setSubject} />
            <section className="lt-packs__w lt-pk__links" aria-label="More from LazyTopper">
              <Link className="lt-pk-cbq" to={`${CBQ_PACKS_PAGE_PATH}?subject=${subject}`} data-testid="packs-link-cbq">
                <span className="lt-pk-cbq__kicker">NEW · CBQ</span>
                <span className="lt-pk-cbq__main">
                  {CBQ_PACKS_NAME} · {CBQ_SUBJECT_CLAIM} per subject · {packPriceLabel("pack_cbq")} &rarr;
                </span>
                <span className="lt-pk-cbq__sub">Half your board paper is competency-based. Every CBQ type, chapter-wise, with step-wise worked solutions.</span>
              </Link>
              <Link className="lt-pk-bp" to={BOARD_PASS_PAGE_PATH} data-testid="packs-link-board-pass">
                {CBQ_MARKED_LINE}
              </Link>
            </section>
            {/* TRUST-1: real student proof. Click-to-play; nothing loads from YouTube before the tap. */}
            <section className="lt-packs__proof" aria-labelledby="packs-video">
              <div className="lt-packs__w">
                <TestimonialVideo
                  headingId="packs-video"
                  heading="Where did his ½ mark go?"
                  lede="A Class 10 student photographs his written answer and sees exactly where he lost ½ mark."
                />
              </div>
            </section>
            <BundleStickyBar api={api} />
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
                For each chapter: its questions grouped by CBSE section (A to E) with matching step-by-step worked solutions, two chapter
                tests and one worksheet (each with a marking guide). Mock packs are eight full 80-mark papers per subject with marking guides. A few questions that depend on a
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
              <summary>What are CBQ Packs?</summary>
              <p>
                Competency-based questions (case study, assertion-reason, MCQ, short and long answer), {CBQ_SUBJECT_CLAIM} per subject, chapter-wise with
                step-wise worked solutions. They are sold on their own page, {packPriceLabel("pack_cbq")} per subject:{" "}
                <Link to={CBQ_PACKS_PAGE_PATH}>see the CBQ Packs</Link>.
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

/**
 * The navy hero with the Bundle's buy block in it (phone: below the copy, Buy on the first screen at 360 x 640; desktop >= 1024: beside it).
 * ONE h1. The Bundle's Buy is the shop's own (PackTileBuy -> buyNow -> handleBuy).
 */
function Hero({ api }: { api: PacksShopApi }) {
  const season = isPreboardsSeason();
  return (
    <section className="lt-pk-hero" aria-labelledby="packs-h1">
      <div className="lt-packs__w lt-pk-hero__grid">
        <div className="lt-pk-hero__copy">
          <p className="lt-pk-hero__eyebrow">{PACKS_EYEBROW}</p>
          <h1 id="packs-h1" className="lt-pk-hero__h1">
            {PACKS_H1_LINES.map((line) => (
              <span key={line} className="lt-pk-hero__l">{line}</span>
            ))}
          </h1>
          <p className="lt-pk-hero__line">{PACKS_HERO_LINE}</p>
          <BoardPassOwnerLine />
          <FounderBadge tone="dark" />
          <p className="lt-pk-hero__terms">One-time payment · never renews · {REDOWNLOAD_SHORT}</p>
        </div>
        <div className="lt-pk-bundle" data-testid="packs-cell-bundle">
          <span className="lt-pk-bundle__badge">{season ? PREBOARDS_PICK_BADGE : "Best value"}</span>
          <h2 className="lt-pk-bundle__name">{BUNDLE_NAME}</h2>
          <ul className="lt-pk-tiles" aria-label="What the Bundle holds">
            <li className="lt-pk-tile" data-testid="packs-tile-chapters"><span className="lt-pk-tile__fig">{BUNDLE_CHAPTERS}</span><span className="lt-pk-tile__lbl">chapters</span></li>
            <li className="lt-pk-tile" data-testid="packs-tile-mocks"><span className="lt-pk-tile__fig">{BUNDLE_MOCKS}</span><span className="lt-pk-tile__lbl">board-pattern mock papers</span></li>
            <li className="lt-pk-tile" data-testid="packs-tile-questions"><span className="lt-pk-tile__fig">{BUNDLE_QUESTIONS_CLAIM}</span><span className="lt-pk-tile__lbl">questions</span></li>
          </ul>
          <p className="lt-pk-bundle__price">
            <span className="lt-pk-bundle__amt">{packPriceLabel("pack_bundle")}</span>
            <span className="lt-pk-bundle__per"> · both subjects · pay once</span>
          </p>
          <BuyBox twin="pk-buy-bundle" api={api} neutral={`${BUNDLE_NAME} · ${packPriceLabel("pack_bundle")}`} gstSku="pack_bundle" onNeutral={() => api.openPack("pack_bundle")}>
            <PackTileBuy sku="pack_bundle" api={api} />
          </BuyBox>
          <button type="button" className="lt-ptb__see" onClick={() => api.openPack("pack_bundle")} aria-haspopup="dialog" data-testid="packs-card-bundle">
            See inside &rarr;
          </button>
          <PackSampleChoice sku="pack_bundle" surface="packs_tile" buy={sampleBuyFor(api, "pack_bundle")} />
          <p className="lt-pk-bundle__line">
            {season ? PREBOARDS_PICK_LINE : `All ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks, one price`}. {PACKS_LEDE}
          </p>
          <PreboardTileLine />
          <p className="lt-pk-bundle__small">{PACKS_SAMPLES_NOTE} {PACKS_CBQ_SEPARATE}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * PACKS-TIDY-2 - a Buy area that paints the SAME box in the static page and in the app. The prerender is captured with packs dark, so
 * the static copy has no Buy: it shows a neutral button (opens the pack's pop-up, as /packs' dark CBQ button did) and the GST line, in
 * a `data-lt-twin` box whose key does not depend on the subject. A tap on it before the app arrives is held by the island (pressed at
 * once) and replayed on the app's first button in the same box: the Buy of the pack and subject the visitor sees. Packs on: the
 * shop's own Buy (children). Same height both ways (button + GST line), so nothing moves when the app takes over.
 */
function BuyBox({ twin, api, neutral, gstSku, onNeutral, children }: { twin: string; api: PacksShopApi; neutral: string; gstSku: PackSku; onNeutral: () => void; children: ReactNode }) {
  return (
    <div className="lt-pk-buy" data-lt-twin={twin} data-testid={`${twin}-box`}>
      {api.buyEnabled ? (
        children
      ) : (
        <div className="lt-ptb">
          <button type="button" className="lt-ptb__btn" onClick={onNeutral} aria-haspopup="dialog" data-testid={`${twin}-neutral`}>
            {neutral}
          </button>
          {packGstBreakdown(gstSku) && <span className="lt-ptb__gst">{packGstBreakdown(gstSku)}</span>}
        </div>
      )}
    </div>
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

type Tile = { sku: PackSku; id: string; name: string; line: string; contents: string; excludes: string };

/**
 * "Need only part of it?" - ONE Maths / Science switch over THREE rows (Subject, Mock, Chapter). A row's collapsed state already shows
 * its name, one line, price and its Buy (the Buy sits outside the <details>, so it is never inside the tap target that folds the row);
 * opened: what it includes and leaves out, See inside, the free sample. One row open at a time (`name` makes the native rows exclusive
 * on the static page too). The Bundle is unaffected by the switch (it is both subjects).
 */
function PartPacks({ api, subject, onSubject }: { api: PacksShopApi; subject: PackSubject; onSubject: (s: PackSubject) => void }) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const openSku = api.openSku ?? null;
  const shopSubject = api.subject;
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // A deep link or a Buy that targets one of these packs (?chapter=, ?mock=, ?pack=, ?buy=): open its row, move the switch to the
  // shop's subject (Subject / Mock), bring it into view once.
  const wasOpenSku = useRef<PackSku | null>(null);
  useEffect(() => {
    const t = PART_PACKS.find((p) => p.sku === openSku);
    if (!t) {
      wasOpenSku.current = openSku;
      return;
    }
    setOpenRow(t.id);
    if ((t.sku === "pack_subject" || t.sku === "pack_mock") && shopSubject) onSubject(shopSubject);
    if (wasOpenSku.current !== t.sku) rowRefs.current[t.id]?.scrollIntoView?.({ block: "nearest" });
    wasOpenSku.current = openSku;
  }, [openSku, shopSubject, onSubject]);
  const onToggle = useCallback((id: string, open: boolean) => setOpenRow((cur) => (open ? id : cur === id ? null : cur)), []);
  return (
    <section className="lt-pk-part" aria-labelledby="packs-more-h">
      <div className="lt-packs__w">
        <h2 id="packs-more-h" className="lt-pk-part__h">{PACKS_PART_HEADING}</h2>
        <div className="lt-pk-part__switch" data-lt-radio-replay="">
          <SubjectSwitch value={subject} onChange={onSubject} label="Subject for the packs below" testPrefix="packs-subject" />
        </div>
        <div className="lt-pk-rows">
          {PART_PACKS.map((t) => (
            <PartRow
              key={t.sku}
              t={t}
              api={api}
              subject={subject}
              open={openRow === t.id}
              onToggle={onToggle}
              rowRef={(el) => {
                rowRefs.current[t.id] = el;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PartRow({ t, api, subject, open, onToggle, rowRef }: { t: Tile; api: PacksShopApi; subject: PackSubject; open: boolean; onToggle: (id: string, open: boolean) => void; rowRef: (el: HTMLDivElement | null) => void }) {
  const hasSubject = t.sku === "pack_subject" || t.sku === "pack_mock";
  const [tapped, setTapped] = useState<PackSubject | null>(null);
  const next = tapped && tapped === subject && hasSubject ? sampleBuyFor(api, t.sku)(tapped) : null;
  const subj = subjectLabel(subject);
  const neutral = t.sku === "pack_chapter" ? `Choose a ${subj} chapter · ${packPriceLabel(t.sku)}` : `${subj} ${t.name} · ${packPriceLabel(t.sku)}`;
  const onNeutral = () => (t.sku === "pack_chapter" ? api.chooseChapter({ subject }) : api.openPackWith ? api.openPackWith(t.sku, subject) : api.openPack(t.sku));
  return (
    <div className="lt-pk-row" ref={rowRef} data-testid={`packs-row-${t.id}`} data-open={open ? "" : undefined}>
      <details className="lt-pk-row__d" name="lt-pk-rows" open={open} onToggle={(e) => onToggle(t.id, e.currentTarget.open)}>
        <summary className="lt-pk-row__sum">
          <span className="lt-pk-row__name">{t.name}</span>
          <span className="lt-pk-row__price">{packPriceLabel(t.sku)}</span>
          <span className="lt-pk-row__line">{t.line}</span>
        </summary>
        <div className="lt-pk-row__body">
          <p className="lt-pt__contents" data-testid={`packs-contents-${t.id}`}>{t.contents}</p>
          <p className="lt-pk-row__excl">{t.excludes}</p>
          {t.sku === "pack_mock" ? <PreboardTileLine testId="packs-preboard-line-mock" /> : null}
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
              <PackSampleLink sku={t.sku} target={subject} surface="packs_tile" label={`Free sample (${subj})`} onTapped={() => setTapped(subject)} />
              {next && <SampleBuyNext sku={t.sku} subject={subject} buy={next} />}
            </>
          ) : (
            <PackSampleChoice sku={t.sku} surface="packs_tile" buy={sampleBuyFor(api, t.sku)} />
          )}
        </div>
      </details>
      <BuyBox twin={`pk-buy-${t.id}`} api={api} neutral={neutral} gstSku={t.sku} onNeutral={onNeutral}>
        {t.sku === "pack_chapter" ? <ChapterBuy api={api} subject={subject} /> : <PackTileBuy sku={t.sku} api={api} subject={subject} />}
      </BuyBox>
    </div>
  );
}

/**
 * The Chapter Pack's Buy on the switch's subject: "Choose a <Subject> chapter · <total>" opens the shop's EXISTING chapter chooser
 * (api.chooseChapter, PRICING-B-1: the picker lists only that subject's chapters), whose Buy is the shop's own. Mirrors PackTileBuy's
 * chapter button (same classes, the GST line, the busy note).
 */
function ChapterBuy({ api, subject }: { api: PacksShopApi; subject: PackSubject }) {
  const blocked = api.blockedBy("pack_chapter");
  const gst = packGstBreakdown("pack_chapter");
  return (
    <div className="lt-ptb">
      <button
        type="button"
        className="lt-ptb__btn"
        onClick={() => api.chooseChapter({ subject })}
        disabled={blocked}
        aria-disabled={blocked}
        aria-haspopup="dialog"
        data-testid="tile-buy-pack_chapter"
      >
        {`Choose a ${subjectLabel(subject)} chapter · ${packPayLabel("pack_chapter")}`}
      </button>
      {gst && <span className="lt-ptb__gst" data-testid="tile-gst-pack_chapter">{gst}</span>}
      {blocked && <span className="lt-ptb__busy" role="status">Finishing your other payment…</span>}
    </div>
  );
}

/**
 * The phone's Bundle bar (SalesStickyBar: phones only, hidden while ANY Buy on the page or the footer is on screen, never in the
 * prerender). NEVER a payment path of its own: its button is the Bundle's Buy (the shop's buyNow -> handleBuy). Not shown while packs
 * are dark, while the account owns the Bundle, or while a pack pop-up is open.
 */
const STICKY_WATCH = ["pk-buy-bundle-box", "pk-buy-subject-box", "pk-buy-mock-box", "pk-buy-chapter-box"] as const;
function BundleStickyBar({ api }: { api: PacksShopApi }) {
  const show = api.buyEnabled && !api.ownsPack("pack_bundle") && !api.openSku;
  if (!show) return null;
  return (
    <Suspense fallback={null}>
    <SalesStickyBar
      watch={STICKY_WATCH}
      copy={() => ({ label: `${BUNDLE_NAME} · ${packPriceLabel("pack_bundle")}`, button: `Buy · ${packPayLabel("pack_bundle")}` })}
      onGo={() => api.buyNow("pack_bundle")}
      ariaLabel="Buy the Maths + Science Bundle"
      testId="packs-sticky"
    />
    </Suspense>
  );
}

const MATHS_PACK_CHAPTERS = chaptersOfSubject("maths").length;
const SCIENCE_PACK_CHAPTERS = chaptersOfSubject("science").length;

/** The smaller packs, price high to low (same order, names, lines and pack constants as before). */
const PART_PACKS: ReadonlyArray<Tile> = [
  {
    sku: "pack_subject",
    id: "subject",
    name: "Subject Pack",
    line: `${MATHS_PACK_CHAPTERS} chapters + ${MOCKS_PER_SUBJECT} mocks · every chapter, Maths or Science, 2026-27`,
    contents: `${MATHS_PACK_CHAPTERS} Maths or ${SCIENCE_PACK_CHAPTERS} Science chapters · Sections A–E · with marking guide`,
    excludes: "One subject only (the Bundle has both). CBQ Packs are separate.",
  },
  {
    sku: "pack_mock",
    id: "mock",
    name: "Mock Pack",
    line: `${MOCKS_PER_SUBJECT} board-pattern mocks for 2027, with marking guide`,
    contents: `${MOCKS_PER_SUBJECT} full papers for Maths or Science · marking guide`,
    excludes: "Mock papers only, one subject (no chapter question sheets).",
  },
  {
    sku: "pack_chapter",
    id: "chapter",
    name: "Chapter Pack",
    line: "Important questions + marking guide",
    contents: "Sections A–E · chapter tests · a worksheet · with marking guide",
    excludes: "One chapter only (no mock papers).",
  },
];
