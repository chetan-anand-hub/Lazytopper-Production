import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { getSessionRecordsFromCloud } from "../services/sessionRecords";
import { predictCbseExamDate } from "../services/cbseExamDate";
import { boardPassPriceDisplay, FOUNDING_OFFER_LAST_DAY_LABEL, foundingOfferOpen } from "../config/pricing";
import { isTestSeriesPackOffered, packPayLabel, packPriceLabel, testSeriesFoundingClause, testSeriesPriceLine, TEST_SERIES_CHECKS_PER_PAPER } from "../services/packs";
import { isPaidPremium } from "../services/subscriptionService";
import { useTestSeriesOwnership } from "../components/testSeries/testSeriesOwnership";
import { freeWrittenCheckDisabled } from "../lib/testSeries/seriesAccess";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { TestSeriesExaminerLine, TestSeriesPerTest } from "../components/packs/TestSeriesPerTest";
import { TsClockSlot } from "../components/packs/TestSeriesFoundingClause";
import PacksShop, { warmPacksCheckout, type PacksShopApi } from "../components/packs/PacksShop";
import { isCheckoutWarmDisabled } from "../lib/packs/packsMobilePreload";
import { isPaymentsClientEnabled } from "../services/checkout";
import { isParentPayClientEnabled } from "../services/parentPay";
import { ASK_PARENT_LABEL } from "../components/pricing/PaywallActions";
import { isCheckoutWhoClientEnabled } from "../services/checkoutWhoFlag";
import { buildParentSeriesShareMessage } from "../services/parentPayPack";
import { trackPaywallAction } from "../analytics/analytics";
import { openWhatsAppLink, type ShareNavigator } from "../components/results/share/shareScore";
import { whatsAppShareUrl } from "../components/results/share/shareCardModel";
import PayReturnResume from "../components/payReturn/PayReturnResume";
import { isParentPayFirstDisabled, trackParentForward } from "../components/payRescue/parentForward";
import TestSeriesPaperPicker from "../components/testSeries/TestSeriesPaperPicker";
import { TEST_SERIES_CHECKS_EXPLAINER, TEST_SERIES_VALIDITY_LONG, TEST_SERIES_WRITTEN_SECTIONS } from "../lib/packs/packLabels";
import {
  TEST_SERIES_BUY_FROM_PATH,
  TEST_SERIES_NAME,
  TEST_SERIES_PATH,
  currentScheduleRow,
  seriesChapterTests,
  seriesFullMocks,
  seriesMockRounds,
  seriesProgress,
  seriesSchedule,
  seriesTotals,
  type SeriesProgress,
  type SeriesScheduleRow,
  type SeriesSubject,
} from "../lib/testSeries/testSeries";
import { focusSetCount, focusSetProgress, focusSets as allFocusSets, tsFocusSetsDisabled, type FocusSetProgress } from "../lib/testSeries/focusSets";
import SalesFaq from "../components/salesPages/SalesFaq";
import { fairUseFaq } from "../components/salesPages/salesPagesCopy";
import "../components/salesPages/salesPages.css";
import "./testSeriesPage.css";

/**
 * TS-PARENT-FORWARD-2 - the pay-first "Who will use it?" gate, read here (not imported from services/checkoutWho, which would pull that
 * chunk into /test-series up front, nor moved into checkoutWhoFlag, which would grow the entry). MUST equal checkoutWho's
 * isSelfAttachClientEnabled - a test pins that.
 */
export function tsSelfAttachOn(): boolean {
  // Only isCheckoutWhoClientEnabled is borrowed from the entry chunk (it was already); the two kill switches are read here, so the
  // entry gains no new export (PERF-3 headroom is a few bytes).
  const off = (raw: unknown) => /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  try {
    return isCheckoutWhoClientEnabled() && !off(import.meta.env.VITE_CHECKOUT_SELF_DISABLED) && !off(import.meta.env.VITE_CHECKOUT_SELF_ATTACH_DISABLED);
  } catch {
    return false;
  }
}

// TS-PAYPATH-1 — the signed-out parent forward (WhatsApp + QR, PARENT-PAY-FIRST-1's own panel): its own chunk, fetched on the tap only.
const ParentForwardGuest = lazy(() => import("../components/payRescue/ParentForwardGuest"));

/** TS-PAYPATH-1: once the panel's chunk has drawn it, bring its WhatsApp + QR buttons onto a phone's screen (they open below the fold). */
function RevealPanel() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    ref.current?.parentElement?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, []);
  return <span ref={ref} hidden />;
}

// TS-ANALYSIS-1 — the Mistake notebook (signed-in only, its own chunk, opened from the progress line).
const MistakeNotebookSection = lazy(() => import("../components/testAnalysis/MistakeNotebookSection"));

/**
 * TEST-SERIES-1 / TS-PAGE-2 (owner, 18 Nov 2026) — /test-series: the Pre-Boards Test Series as a sales page and a cockpit.
 * Every count comes from lib/testSeries (the syllabus keys and SERIES_MOCKS_PER_SUBJECT); progress only from the student's REAL
 * session records (signed in), never invented. Nothing here gates or grants anything: taking a test follows the Chapter Test /
 * Full Mock pages' own rules (`?series=1`, `?paper=n`, canCheckSeriesPapers, the one-test rule).
 *
 * TS-PAGE-2 layout: hero → calendar ribbon → the tests (two tabs; one accordion per subject; full-length tests grouped by the
 * calendar's rounds) → the offers (collapsed behind "Upgrade / other plans" for an owner) → how tests are marked.
 *
 * ★ PRERENDER + CLS 0 (the "flash", STUDENT_REVIEW §2). The capture strip (captureStaticBodies.ts rule 2) deletes the whole
 * enclosing <section> of any /login link — it used to delete this page's hero, so the static page had no H1 and the hero was
 * inserted on mount. So: NO /login link sits inside a <section> (the sign-in prompt is a <p> + <a> pair in the hero's reserved
 * `lt-ts-me` box, a <header>; the strip removes that pair and the box keeps its height). Clock-derived bits (the founding line,
 * the calendar's "Now") carry `data-lt-clock` and are written only after mount, so no build clock is baked into the file.
 * Everything that arrives after mount (prices, progress, owner CTA) changes text inside fixed-size boxes.
 */

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];
/** Owner ruling 18 Nov 2026, 19:31 IST — said plainly on the page. */
export const TEST_SERIES_ACCESS_LINE = "MCQs marked free · written answers checked with the Test Series or the Board Pass";

/**
 * TS-FREE-CHECK-1 (owner ruling 23 Nov 2026, 19:59 IST): the ONE free test includes written-answer marking. The page's three
 * free-test lines say so while the client flag is on (VITE_TS_FREE_WRITTEN_CHECK_DISABLED unset - the default, and what the static
 * capture renders); with the flag set, today's lines exactly. The server decides every grade (testSeriesChecks.cjs).
 */
export const TEST_SERIES_ACCESS_LINE_FREE_WRITTEN =
  "Your first test is free, written answers included · after that, written answers are checked with the Test Series or the Board Pass";
export const TS_HERO_FREE_LEDE = "try one test free";
export const TS_HERO_FREE_LEDE_WRITTEN = "your first test is free — written answers marked too";
export const TS_PLANS_LEDE = "Free and trial accounts can take one test, with its MCQs marked. Pick the plan that fits you.";
export const TS_PLANS_LEDE_WRITTEN = "Free and trial accounts can take one test, with its written answers marked too. Pick the plan that fits you.";
/** The page's free-test copy for the current client flag. */
export function testSeriesFreeCopy(): { heroLede: string; accessLine: string; plansLede: string } {
  return freeWrittenCheckDisabled()
    ? { heroLede: TS_HERO_FREE_LEDE, accessLine: TEST_SERIES_ACCESS_LINE, plansLede: TS_PLANS_LEDE }
    : { heroLede: TS_HERO_FREE_LEDE_WRITTEN, accessLine: TEST_SERIES_ACCESS_LINE_FREE_WRITTEN, plansLede: TS_PLANS_LEDE_WRITTEN };
}
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(TEST_SERIES_PATH)}`;

/**
 * TS-PARENT-FORWARD-1 (owner ruling 24 Nov 2026, ~21:35 IST: "both the options, for buying directly or forwarding link to parents").
 * Under each Test Series Buy, "Forward link to parents" (PaywallActions' own label and event, `surface: "test_series"`).
 * TS-PARENT-FORWARD-2 (owner, 25 Nov 2026 00:25: no sign-in in any pay path): signed out, the button opens the device's share sheet
 * (else WhatsApp) with a message and THIS page's link; the parent pays here signed out (pay-first) and "Who will use it?" puts the
 * series on the child's number after payment. VITE_TS_PARENT_FORWARD_DISABLED=1 -> the page exactly as before both lanes.
 */
export function tsParentForwardDisabled(): boolean {
  return import.meta.env?.VITE_TS_PARENT_FORWARD_DISABLED === "1";
}
/** The page the parent opens: this one, tagged as a parent share (the admin Students list reads `utm_source=parent_share`). */
export const TS_PARENT_SHARE_PATH = `${TEST_SERIES_PATH}?utm_source=parent_share&utm_medium=whatsapp&utm_campaign=test_series_forward`;
export const TS_PARENT_SHARE_FALLBACK = "Send it on WhatsApp";

/**
 * TS-PAYPATH-1 (24-26 Nov 2026: 22 Test Series checkouts, 0 payment attempts; 21 signed out, mostly a student who cannot pay). The
 * hero's parent action is an EQUAL action beside Buy, not a secondary link: "Ask Mummy/Papa to pay".
 *   Signed out -> opens PARENT-PAY-FIRST-1's own panel (ParentForwardGuest: WhatsApp first, then a QR the parent scans). Its message
 *                 names NO rupee figure (a page link outlives the 1 Dec price switch); the parent pays signed out, then "Who will use
 *                 it?" puts the series on the child's number.
 *   Signed in  -> the shop's per-account parent link in its parent-first layout (WhatsApp straight away, then the QR).
 * Events: parent_forward_clicked / parent_forward_qr_shown (+ _shown on the panel) with `surface: "ts_hero"`.
 * Also: the prerendered (static) Buy - the /packs fallback link, since the capture is built with packs off - points at THIS page's
 * own `?buy=test_series` (PacksShop's in-place resume opens the checkout here), so a tap before hydration never leaves the page.
 * VITE_TS_PARENT_HERO_DISABLED=1 -> today's hero exactly (the "Forward link to parents" button, the /packs fallback link).
 */
export function tsParentHeroDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_TS_PARENT_HERO_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}
export const TS_PARENT_HERO_LABEL = "Ask Mummy/Papa to pay";
export const TS_PARENT_HERO_SURFACE = "ts_hero";
/** The pre-hydration Buy: this page, with the in-place resume PacksShop honours (readBuyResume). Never /packs. */
export const TS_SELF_BUY_PATH = `${TEST_SERIES_PATH}?buy=test_series`;

function shareErrorName(e: unknown): string {
  return e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
}
const TESTS_ANCHOR = "ts-tests";
/** TS-HERO-1 (owner, 23 Nov 2026): the three steps under the headline. "Try one test free" = one free test (seriesAccess FREE_TESTS_ALLOWED); TS-FREE-CHECK-1: its written answers are marked too (testSeriesFreeCopy). */
const TS_HERO_STEPS: readonly string[] = ["Take the test", "Upload your answer sheet", "See marks for every step and where you lost them"];

function istToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

type Load = { state: "signed-out" } | { state: "loading" } | { state: "ready"; progress: SeriesProgress; focus?: Record<string, FocusSetProgress> };
function CalendarRibbon({ rows, current }: { rows: SeriesScheduleRow[]; current: SeriesScheduleRow["id"] | null }) {
  return (
    <ol className="lt-ts-cal" data-testid="ts-schedule">
      {rows.map((r, i) => (
        // The "Now" highlight is CSS on the row (:has the clock node), never a class: the capture strips the clock node, so the
        // static file never marks a row from the build machine's clock.
        <li key={r.id} className="lt-ts-cal__row" data-testid={`ts-cal-${r.id}`}>
          <span className="lt-ts-cal__dot" aria-hidden="true">
            {i + 1}
          </span>
          <span className="lt-ts-cal__when">
            {r.when}
            <span className="lt-ts-cal__now">{current === r.id ? <span data-lt-clock="" data-testid="ts-cal-now">Now</span> : null}</span>
          </span>
          <strong className="lt-ts-cal__title">{r.title}</strong>
          <span className="lt-ts-cal__body">{r.body}</span>
        </li>
      ))}
    </ol>
  );
}

function MockTrend({ load }: { load: Load }) {
  let body: ReactNode;
  if (load.state !== "ready") {
    body = (
      <p className="lt-ts-trend__empty">
        {load.state === "signed-out" ? "Sign in and take a full-length test to see your score trend here." : "Loading your scores…"}
      </p>
    );
  } else if (SUBJECTS.every((s) => load.progress.mockTrend[s].length === 0)) {
    body = <p className="lt-ts-trend__empty">Your score trend appears here once a full-length test is graded.</p>;
  } else {
    body = (
      <div className="lt-ts-trend__rows">
        {SUBJECTS.map((s) => (
          <div key={s} className="lt-ts-trend__row" data-testid={`ts-trend-${s}`}>
            <span className="lt-ts-trend__subj">{s}</span>
            <span className="lt-ts-trend__bars">
              {load.progress.mockTrend[s].length === 0 ? (
                <span className="lt-ts-trend__none">No graded test yet</span>
              ) : (
                load.progress.mockTrend[s].map((t) => (
                  <span key={t.code} className="lt-ts-trend__bar" title={`${t.code}: ${t.percent}%`}>
                    <progress max={100} value={t.percent} aria-label={`${t.code} ${t.percent}%`} />
                    <span className="lt-ts-trend__lbl">
                      M{t.n} · {t.percent}%
                    </span>
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="lt-ts-trend" data-testid="ts-trend">
      <p className="lt-ts-trend__title">Your full-length test score trend</p>
      {body}
    </div>
  );
}

export default function TestSeriesPage() {
  const { user, loading: authLoading } = useAuth();
  const subscription = useSubscription();
  const signedIn = Boolean(user?.uid) && !user?.isLocalSession;
  const totals = useMemo(() => seriesTotals(), []);
  const chapters = useMemo(() => seriesChapterTests(), []);
  const mocks = useMemo(() => seriesFullMocks(), []);
  const rounds = useMemo(() => seriesMockRounds(), []);
  // TS-THEMES-1: the BONUS focus sets (not in `totals`: the series' own counts and copy are unchanged). None under the kill switch.
  const focusSets = useMemo(() => (tsFocusSetsDisabled() ? [] : allFocusSets()), []);
  const schedule = useMemo(() => seriesSchedule(predictCbseExamDate("10")), []);

  // After mount only: today's schedule row, the founding line and the prices (the capture strips every price and clock node).
  const [current, setCurrent] = useState<SeriesScheduleRow["id"] | null>(null);
  const [prices, setPrices] = useState<{ ts: string; bp: string; founding: string | null } | null>(null);
  useEffect(() => {
    const now = new Date();
    if (schedule) setCurrent(currentScheduleRow(schedule, istToday(now)));
    // TS-PACK-1: the Test Series price is the `test_series` SKU's ("₹999 + GST"); the Board Pass price is date-driven (founding
    // price till 30 Nov, list price from 1 Dec). The founding line shows only while that offer is really open.
    setPrices({
      // TS-PRICE-2: while the founding offer is open the card says "₹999 + GST · founding price till 30 Nov, then ₹1,499 + GST"; after it "₹1,499 + GST".
      ts: testSeriesFoundingClause(now) ? testSeriesPriceLine(now) : packPriceLabel("test_series", now),
      bp: boardPassPriceDisplay(now),
      founding: foundingOfferOpen(now) ? `Founding season: the Board Pass is ${boardPassPriceDisplay(now)} till ${FOUNDING_OFFER_LAST_DAY_LABEL}` : null,
    });
  }, [schedule]);

  const [load, setLoad] = useState<Load>({ state: "signed-out" });
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [buyFrom, setBuyFrom] = useState<string | null>(null);
  const forwardOn = !tsParentForwardDisabled();
  // TS-PARENT-FORWARD-2: the wa.me link to show when neither the share sheet nor a WhatsApp window could open (a popup blocker).
  const [shareFallback, setShareFallback] = useState<{ testId: string; href: string } | null>(null);
  const parentHeroOn = !tsParentHeroDisabled();
  // TS-PAYPATH-1: the signed-out hero's parent panel, opened by "Ask Mummy/Papa to pay" (a tap: no first-paint shift).
  const [parentPanel, setParentPanel] = useState(false);

  // CHECKOUT-FAST-1: the Buy opens the checkout sheet / Razorpay. On INTENT only (the first touch, or the Buy scrolling into view; never on idle) fetch the
  // sheet chunk, open Razorpay's connections and load checkout.js - never at first paint, no order. VITE_CHECKOUT_WARM_DISABLED=1 = today's on-tap load.
  useEffect(() => {
    if (!isCheckoutWarmDisabled()) warmPacksCheckout({ intentOnly: true });
  }, []);

  // The section mounts on the tap, so the anchor jump happens once it exists.
  useEffect(() => {
    if (notebookOpen) document.getElementById("mistake-notebook")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [notebookOpen]);
  useEffect(() => {
    if (authLoading) return undefined;
    if (!signedIn || !user?.uid) {
      setLoad({ state: "signed-out" });
      return undefined;
    }
    let live = true;
    setLoad({ state: "loading" });
    getSessionRecordsFromCloud(user.uid)
      .then((records) => {
        if (live) setLoad({ state: "ready", progress: seriesProgress(records), focus: focusSetProgress(records) });
      })
      .catch(() => {
        if (live) setLoad({ state: "ready", progress: seriesProgress([]), focus: focusSetProgress([]) });
      });
    return () => {
      live = false;
    };
  }, [authLoading, signedIn, user?.uid]);

  const progress = load.state === "ready" ? load.progress : null;
  // Who owns what (server truth only): a Board Pass holder (paid premium), or a Test Series Pack owner (GET /api/packs/mine).
  const holdsPremium = signedIn && subscription.hydrated && isPaidPremium(subscription.status);
  const ownership = useTestSeriesOwnership(signedIn && subscription.hydrated && !holdsPremium ? user?.uid : null);
  const ownsSeries = signedIn && !holdsPremium && ownership.owns;
  const isOwner = holdsPremium || ownsSeries;
  // Not yet known (signed in, waiting for the subscription or the packs read): neither buy nor owner prompts, so an owner is
  // never told to buy what they own. A failed read stays unknown (the neutral CTA), never "owned".
  // MYPACKS-TS-1 (#1765) adds `phase` to the ownership hook; until it lands, the packs read is taken as answered once this page's
  // own records read has (same request moment). Only "ready" is known: "error" stays neutral, never a buy prompt.
  const phase = (ownership as { phase?: string }).phase;
  const ownershipKnown = phase !== undefined ? phase === "ready" : load.state === "ready";
  const ownerUnknown = signedIn && (!subscription.hydrated || (!holdsPremium && !ownershipKnown));

  /**
   * TS-PARENT-FORWARD-2 - signed out: share the message + this page's link. The share sheet first (Android / iOS: WhatsApp, SMS, any
   * app); a cancelled sheet is the student's choice. No sheet (desktop) or a refused one -> wa.me with the text in a new tab; if a
   * popup blocker stops that too, a real wa.me link appears under the button. Same event as the signed-in forward.
   */
  async function forwardSignedOut(testId: string) {
    trackPaywallAction("ask", "test_series");
    setShareFallback(null);
    const text = buildParentSeriesShareMessage({ lang: "en", price: packPayLabel("test_series"), url: `${window.location.origin}${TS_PARENT_SHARE_PATH}` });
    const nav = (typeof navigator !== "undefined" ? navigator : undefined) as ShareNavigator | undefined;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ text });
        return;
      } catch (e) {
        if (shareErrorName(e) === "AbortError") return;
      }
    }
    if (!openWhatsAppLink(text, (url, target) => window.open(url, target))) setShareFallback({ testId, href: whatsAppShareUrl(text) });
  }

  const allTests = useMemo(() => [...chapters, ...mocks], [chapters, mocks]);
  const nextTest = progress ? allTests.find((t) => (progress.byCode[t.code]?.status ?? "not-started") === "not-started") ?? null : null;

  // The Buy label: the TOTAL charged (packPayLabel, never typed here, so the 1 Dec switch flows through), written after mount like every
  // clock-derived figure (the prerender capture strips it; the reserved slot keeps the button's size).
  const buyLabel = (
    // One <span>: the button is an inline-flex box, which would otherwise swallow the space before the figure ("·₹1,179").
    <span>
      Get the Test Series · <TsClockSlot variant="amt">{packPayLabel("test_series")}</TsClockSlot>
    </span>
  );
  // ONE Buy per card, each its own button: in place (the shop's own checkout sheet opens HERE and closing it leaves the student on this
  // page) while packs are on and the series is offered; otherwise the old link to /packs, with `from` so closing it comes back here.
  const buyButton = (api: PacksShopApi, testId: string, className: string) =>
    api.buyEnabled && api.buyButton && isTestSeriesPackOffered() ? (
      api.buyButton("test_series", {
        label: buyLabel,
        className,
        testId,
        noteClass: "lt-ts-buynote",
        // Two Buy buttons share one purchase: only the tapped one shows the status lines (the hero's until a tap).
        onTap: () => setBuyFrom(testId),
        showStatus: (buyFrom ?? "ts-hero-buy") === testId,
      })
    ) : (
      <Link className={className} to={parentHeroOn ? TS_SELF_BUY_PATH : TEST_SERIES_BUY_FROM_PATH} data-testid={testId}>
        {buyLabel}
      </Link>
    );

  /**
   * TS-PARENT-FORWARD-1 - "Forward link to parents" under a Buy. Signed in: the shop's own parent action for the Test Series (null when
   * owned, paying, packs off or parent pay off), no QR (a tight card; the parent is on another phone). Signed out (TS-PARENT-FORWARD-2):
   * a button that shares this page (forwardSignedOut) - no sign-in. Only beside the in-place Buy (packs on, the series offered), while
   * payments are on, and - signed in - parent pay, or - signed out - pay-first "Who will use it?" (isSelfAttachClientEnabled: Who + self +
   * attach, all three - how a parent's payment reaches the child; any one off and the message's "pay, then enter my number" is untrue).
   * ★ CLS: the static capture is built with packs off (its Buy is the /packs link), so the SIGNED-OUT box is always rendered (a
   * reserved height, `--out`) and only its contents wait for the live flags: the first paint never moves when the button arrives.
   */
  const forwardArea = (api: PacksShopApi, hero: boolean) => {
    if (!forwardOn) return null;
    const inPlace = Boolean(api.buyEnabled && api.buyButton) && isTestSeriesPackOffered() && isPaymentsClientEnabled();
    const testId = hero ? "ts-hero-forward" : "ts-offer-forward";
    // TS-PAYPATH-1: the hero's equal-weight parent action (see tsParentHeroDisabled). The plan card below keeps today's button.
    if (hero && parentHeroOn) {
      if (signedIn) {
        return inPlace && isParentPayClientEnabled() ? (
          <div className="lt-ts-forward lt-ts-forward--hero" data-testid={testId}>
            {api.parentAsk("test_series", undefined, {
              surface: "test_series",
              parentFirst: true,
              forwardLabel: TS_PARENT_HERO_LABEL,
              onAsk: () => trackParentForward("clicked", true, "test_series", TS_PARENT_HERO_SURFACE),
              onQr: () => trackParentForward("qr_shown", true, "test_series", TS_PARENT_HERO_SURFACE),
            })}
          </div>
        ) : null;
      }
      const guestOn = inPlace && tsSelfAttachOn() && !isParentPayFirstDisabled();
      return (
        <div className="lt-ts-forward lt-ts-forward--out lt-ts-forward--hero" data-testid={testId}>
          {guestOn && (
            <>
              <button
                type="button"
                className="lt-ts-btn lt-ts-forward__btn lt-ts-forward__btn--hero"
                aria-expanded={parentPanel}
                data-testid="ts-hero-parent"
                onClick={() => setParentPanel((v) => !v)}
              >
                {TS_PARENT_HERO_LABEL}
              </button>
              {parentPanel && (
                <div className="lt-ts-forward__panel" data-testid="ts-hero-parent-panel">
                  <Suspense fallback={null}>
                    <ParentForwardGuest item={{ kind: "pack", sku: "test_series", label: "Test Series" }} flow="attach" surface={TS_PARENT_HERO_SURFACE} />
                    <RevealPanel />
                  </Suspense>
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    if (signedIn) {
      return inPlace && isParentPayClientEnabled() ? (
        <div className="lt-ts-forward" data-testid={testId}>
          {api.parentAsk("test_series", undefined, { noQr: true, surface: "test_series" })}
        </div>
      ) : null;
    }
    return (
      <div className="lt-ts-forward lt-ts-forward--out" data-testid={testId}>
        {inPlace && tsSelfAttachOn() && (
          <>
            <button type="button" className="lt-ts-btn lt-ts-forward__btn" data-testid={`${testId}-share`} onClick={() => void forwardSignedOut(testId)}>
              {ASK_PARENT_LABEL}
            </button>
            {shareFallback?.testId === testId && (
              <a className="lt-ts-forward__wa" href={shareFallback.href} target="_blank" rel="noopener noreferrer" data-testid={`${testId}-wa`}>
                {TS_PARENT_SHARE_FALLBACK}
              </a>
            )}
          </>
        )}
      </div>
    );
  };

  /** The Test Series offer card. `hero`: the compact one in the hero (price, validity, per-test, Buy, the checks line); else the full plan card. */
  const tsOffer = (api: PacksShopApi, hero: boolean) => (
    <div className={`lt-ts-offer lt-ts-offer--ts${hero ? " lt-ts-offer--hero" : ""}`} data-testid={hero ? "ts-hero-offer" : "ts-offer-ts"}>
      <p className="lt-ts-offer__tag">Pre-boards</p>
      <p className="lt-ts-offer__name">Test Series</p>
      <p className="lt-ts-offer__price">{prices && <span data-lt-clock="" data-testid={hero ? "ts-hero-price" : "till-boards-figures"}>{prices.ts}</span>}</p>
      <p className="lt-ts-offer__valid" data-testid={hero ? "ts-hero-valid" : "ts-offer-valid"}>
        {TEST_SERIES_VALIDITY_LONG}
      </p>
      <TestSeriesPerTest testId={hero ? "ts-hero-per-test" : "ts-offer-per-test"} />
      {!hero && <TestSeriesExaminerLine testId="ts-offer-examiner" />}
      {!hero && (
        <ul className="lt-ts-offer__list">
          <li>All {totals.total} tests: {totals.chapterTests} chapter tests + {totals.fullMocks} full-length board papers</li>
          <li>
            Written answers, {TEST_SERIES_WRITTEN_SECTIONS}, checked step by step: <strong>{TEST_SERIES_CHECKS_PER_PAPER} checks per paper</strong>
          </li>
          <li>Full scorecard and your graded answer sheet on screen</li>
          <li>After-test analysis: weakest chapters, time per question, mistake notebook</li>
          <li>Download and print every paper</li>
        </ul>
      )}
      {ownsSeries ? (
        <p className="lt-ts-offer__owner" data-testid="ts-cta-owner">
          You own the Test Series.
        </p>
      ) : holdsPremium ? (
        <p className="lt-ts-offer__owner" data-testid="ts-cta-owner">
          Your Board Pass already includes every test.
        </p>
      ) : ownerUnknown ? (
        <p className="lt-ts-offer__owner" data-testid="ts-cta-checking">
          Checking your plan…
        </p>
      ) : (
        <>
          {buyButton(api, hero ? "ts-hero-buy" : "ts-cta-buy", "lt-ts-btn lt-ts-btn--primary lt-ts-offer__btn")}
          {forwardArea(api, hero)}
        </>
      )}
      {!ownsSeries && !holdsPremium && !ownerUnknown && (
        <p className="lt-ts-offer__checks" data-testid={hero ? "ts-hero-checks" : "ts-offer-checks"}>
          {TEST_SERIES_CHECKS_EXPLAINER}
        </p>
      )}
    </div>
  );

  const offers = (api: PacksShopApi) => (
    <div className="lt-ts-offers" data-testid="ts-offers">
      {tsOffer(api, false)}
      <div className="lt-ts-offer lt-ts-offer--bp" data-testid="ts-offer-bp">
        <p className="lt-ts-offer__tag lt-ts-offer__tag--bp">Most complete</p>
        <p className="lt-ts-offer__name">Board Pass</p>
        <p className="lt-ts-offer__price">{prices && <span data-testid="till-boards-figures">{prices.bp}</span>}</p>
        <p className="lt-ts-offer__valid" data-testid="ts-offer-bp-valid">{TEST_SERIES_VALIDITY_LONG}</p>
        <ul className="lt-ts-offer__list">
          <li>Everything in the Test Series, plus:</li>
          <li>Every answer checked everywhere (Answer Checker, worksheets)</li>
          <li>Your personal tutor on every lost mark</li>
          <li>Mistake Intelligence across all your practice</li>
        </ul>
        <Link className="lt-ts-btn lt-ts-btn--ghost lt-ts-offer__btn" to="/board-pass" data-testid="ts-bp-link">
          {holdsPremium ? "Your Board Pass →" : "See the Board Pass →"}
        </Link>
      </div>
    </div>
  );

  const showOffer = !isOwner && !ownerUnknown;

  return (
    <>
      <main className="lt-sp lt-ts" aria-label={`LazyTopper ${TEST_SERIES_NAME}`}>
        {/* PAY-RETURN-1 (review N3): the Meta ad landing page; PacksShop is embedded here so it does not mount the resume itself. */}
        <PayReturnResume />
        <PacksShop embedded hideMyPacks skipView inPlace returnPath={TEST_SERIES_PATH}>
          {(api) => (
            <>
              <header className="lt-ts-hero" aria-labelledby="ts-h1">
                <div className="lt-sp__w lt-ts-hero__in">
                  <div className="lt-ts-hero__copy">
                    <h1 id="ts-h1" className="lt-ts-hero__h1">
                      {/* TS-H1-KEYWORD-1 (owner, 24 Nov 2026): the eyebrow lives INSIDE the h1 so the crawled/accessible heading starts with
                          "CBSE Class 10 Test Series" (Google Ads relevance); it is styled as the eyebrow (display:block, uppercase via CSS). */}
                      <span className="lt-sp-eyebrow lt-ts-hero__eyebrow">CBSE Class 10 Test Series · Maths &amp; Science</span>{" "}
                      {/* TS-HERO-1 (owner, 23 Nov 2026): the page leads with the promise. Two fixed lines from 768 px (Fraunces swapping in for its
                          fallback re-wrapped one line into two: a desktop shift). */}
                      <span className="lt-ts-hero__h1-l">Write on paper. Snap a photo.</span>{" "}
                      <span className="lt-ts-hero__h1-l">Get every step marked like a CBSE examiner — in minutes.</span>
                    </h1>
                    <ol className="lt-ts-hero__steps" data-testid="ts-hero-steps">
                      {TS_HERO_STEPS.map((t, i) => (
                        <li key={t} className="lt-ts-hero__step">
                          <span className="lt-ts-hero__stepn" aria-hidden="true">
                            {i + 1}
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="lt-ts-hero__lede" data-testid="ts-contents">
                      <strong>
                        {totals.chapterTests} chapter tests + {totals.fullMocks} full-length mock tests
                      </strong>{" "}
                      · {testSeriesFreeCopy().heroLede}
                    </p>
                  </div>
                  {/* Price + action beside the headline (desktop) / straight under it (phone): above the fold. */}
                  <div className="lt-ts-hero__side">
                    {showOffer ? (
                      tsOffer(api, true)
                    ) : (
                      <div className="lt-ts-hero__cta">
                        {isOwner ? (
                          nextTest ? (
                            <Link className="lt-ts-btn lt-ts-btn--primary" to={nextTest.href} data-testid="ts-continue">
                              Continue: {nextTest.code} →
                            </Link>
                          ) : (
                            <a className="lt-ts-btn lt-ts-btn--primary" href={`#${TESTS_ANCHOR}`} data-testid="ts-continue">
                              Continue your tests →
                            </a>
                          )
                        ) : (
                          <a className="lt-ts-btn lt-ts-btn--primary" href={`#${TESTS_ANCHOR}`} data-testid="ts-cta-tests">
                            See all {totals.total} tests ↓
                          </a>
                        )}
                      </div>
                    )}
                    {/* Signed-in-only box with a reserved height. Not a <section>: the capture strip removes the sign-in pair only. */}
                    <div className="lt-ts-me" data-testid="ts-progress">
                      {load.state === "signed-out" ? (
                        <>
                          <p className="lt-ts-me__txt">Track your progress through all {totals.total} tests.</p>
                          <a className="lt-ts-me__signin" href={LOGIN_HREF} data-testid="ts-signin">
                            Sign in
                          </a>
                        </>
                      ) : progress ? (
                        <>
                          <p className="lt-ts-me__txt" data-testid="ts-done">
                            <strong>
                              {progress.done} of {progress.total}
                            </strong>{" "}
                            tests done.
                          </p>
                          <progress className="lt-ts-me__bar" max={progress.total} value={progress.done} aria-label="Tests done" />
                          <a href="#mistake-notebook" className="lt-ts-me__nb" data-testid="ts-notebook-link" onClick={() => setNotebookOpen(true)}>
                            Open my mistake notebook
                          </a>
                        </>
                      ) : (
                        <p className="lt-ts-me__txt">Loading your progress…</p>
                      )}
                    </div>
                  </div>
                  <div className="lt-ts-hero__more">
                    <TestSeriesExaminerLine testId="ts-hero-examiner" />
                    <p className="lt-ts-hero__rule" data-testid="ts-rule">
                      {testSeriesFreeCopy().accessLine}
                    </p>
                  </div>
                </div>
              </header>

              <section className="lt-sp__w lt-ts-sec" id={TESTS_ANCHOR} aria-labelledby="ts-tests-h">
                <h2 id="ts-tests-h" className="lt-sp-h2">
                  Take a test
                </h2>
                <p className="lt-sp-lede" data-testid="ts-picker-lede">
                  {totals.papersPerChapter > 1 ? `${totals.papersPerChapter} board-pattern tests per chapter` : "One board-pattern test per chapter"}, plus{" "}
                  {totals.mocksPerSubject} full-length mock tests per subject. Pick one and start.
                </p>
                <TestSeriesPaperPicker
                  chapters={chapters}
                  mocks={mocks}
                  rounds={rounds}
                  progress={progress}
                  mocksPerSubject={totals.mocksPerSubject}
                  focusSets={focusSets}
                  focusProgress={load.state === "ready" ? load.focus ?? null : null}
                  focusCount={focusSets.length > 0 ? focusSetCount() : 0}
                />
                {load.state === "ready" && <MockTrend load={load} />}
              </section>

              <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-offers-h">
                {isOwner ? (
                  <div className="lt-ts-plans" data-testid="ts-plans">
                    <h2 id="ts-offers-h" className="lt-ts-plans__h">
                      <button
                        type="button"
                        className="lt-ts-acc__btn lt-ts-plans__btn"
                        aria-expanded={plansOpen}
                        aria-controls="ts-plans-panel"
                        onClick={() => setPlansOpen((v) => !v)}
                        data-testid="ts-plans-toggle"
                      >
                        <span className="lt-ts-acc__title">Upgrade / other plans</span>
                        <span className="lt-ts-acc__chev" aria-hidden="true" />
                      </button>
                    </h2>
                    <div id="ts-plans-panel" hidden={!plansOpen}>
                      {offers(api)}
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 id="ts-offers-h" className="lt-sp-h2">
                      Take all {totals.total} tests
                    </h2>
                    <p className="lt-sp-lede">{testSeriesFreeCopy().plansLede}</p>
                    {/* The Board Pass founding-price line sits here, beside the plan comparison (the products sell each other). Clock-derived:
                        written after mount and stripped from the capture. Not shown to anyone who already owns the series. */}
                    {!ownerUnknown && (
                      <p className="lt-ts-plans__urgency" data-testid="ts-urgency">
                        {prices?.founding ? <span data-lt-clock="">{prices.founding}</span> : null}
                      </p>
                    )}
                    {offers(api)}
                  </>
                )}
              </section>

              <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-how-h">
                <div className="lt-ts-how" data-testid="ts-how">
                  <h2 id="ts-how-h" className="lt-sp-h2">
                    How your tests are marked
                  </h2>
                  <ul className="lt-ts-how__list">
                    <li>Section A (the MCQs) is marked the moment you submit, free on every account.</li>
                    <li>
                      {TEST_SERIES_WRITTEN_SECTIONS}: write on paper and upload a photo. <strong>The Test Series checks every written
                      answer step by step</strong>, {TEST_SERIES_CHECKS_PER_PAPER} checks per paper, like a CBSE examiner, and shows where each
                      mark was lost.
                    </li>
                    <li>Downloading and printing these papers comes with the Test Series and the Board Pass.</li>
                  </ul>
                </div>
              </section>

              <div className="lt-sp__w lt-ts-sec">
                <SalesFaq items={[fairUseFaq()]} headingId="ts-faq-h" testId="ts-faq" />
              </div>

              {schedule && (
                <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-cal-h">
                  <h2 id="ts-cal-h" className="lt-sp-h2">
                    Your pre-boards calendar
                  </h2>
                  <p className="lt-sp-lede">A recommended plan, not a lock: take any test whenever you are ready.</p>
                  <CalendarRibbon rows={schedule} current={current} />
                </section>
              )}
              {/* TS-ANALYSIS-1 — last in the page, so opening it moves nothing above it. */}
              {notebookOpen && progress && user?.uid && (
                <section className="lt-sp__w" id="mistake-notebook" aria-label="Mistake notebook" data-testid="ts-notebook">
                  <Suspense fallback={null}>
                    <MistakeNotebookSection uid={user.uid} returnTo={TEST_SERIES_PATH} />
                  </Suspense>
                </section>
              )}
            </>
          )}
        </PacksShop>
      </main>
      {/* TS-UX-PAGE-1: footer links grow to >= 44 px tap targets on this page only. */}
      <div className="lt-ts-foot">
        <PublicLegalFooter />
      </div>
    </>
  );
}
