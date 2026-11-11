import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { TRIAL_DAYS } from "../services/subscriptionService";
import { currentSalesPageSurface, setSalesPageSurface, trackNamedEvent, trackPaywallAction } from "../analytics/analytics";
import { isPaymentsClientEnabled } from "../services/checkout";
import { isParentPayClientEnabled } from "../services/parentPay";
import { isCheckoutWhoClientEnabled } from "../services/checkoutWhoFlag";
import { predictCbseExamDate } from "../services/cbseExamDate";
import {
  BOARD_PASS_NAME,
  FOUNDING_PRICE_LEAD,
  boardPassFoundingPriceLine,
  boardPassGstBreakdown,
  boardPassPayDisplay,
  boardPassPriceDisplay,
  tillBoardsQuote,
  type TillBoardsQuote,
} from "../config/pricing";
import PassCheckout, { tillBoardsButtonLabel } from "../components/pricing/PassCheckout";
import PaywallActions from "../components/pricing/PaywallActions";
import {
  BOARD_PASS_ONCE,
  FAQ_PAY_FOR_CHILD_Q,
  FAQ_SUBSCRIPTION,
  FORWARD_TO_PARENTS_LABEL,
  SHARE_QR_LABEL,
  TRIAL_LINK_LABEL,
  isCheckoutWhoCopyOn,
  payForChildAnswer,
} from "../components/pricing/pricingPlansCopy";
import PricingProof from "../components/marketing/PricingProof";
import BoardsCountdownStrip from "../components/urgency/BoardsCountdownStrip";
import ParentReturnLink from "../components/parents/ParentReturnLink";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import SalesFaq from "../components/salesPages/SalesFaq";
import SalesStickyBar, { boardPassStickyCopy } from "../components/salesPages/SalesStickyBar";
import { useDesktopLayout } from "../components/salesPages/useDesktopLayout";
import {
  BP_EYEBROW,
  BP_FAQ_BASIC,
  BP_H1,
  BP_MINUTE_LINE,
  BP_MINUTE_STRONG,
  BP_MINUTE_TILE,
  BP_OWNER_PRACTICE,
  BP_OWNER_TITLE,
  BP_TILES,
  BP_TUTOR_BODY,
  BP_TUTOR_TITLE,
  BP_WHAT_TITLE,
  BP_WHAT_YOU_GET,
  BOARD_PASS_PAGE_PATH,
  BP_MANUAL_PAYMENTS_OFF,
  CBQ_PACKS_NAME,
  CBQ_PACKS_PAGE_PATH,
  PAPER_LINE,
  PAPER_TITLE,
  PRACTICE_PATH,
  QUESTION_BANK_NAME,
  QUESTION_BANK_PAGE_PATH,
  bpPayLine,
  cbqPacksLinkPrice,
  questionBankLinkPrice,
  type SalesFaqItem,
} from "../components/salesPages/salesPagesCopy";
import "../components/salesPages/salesPages.css";
import "./boardPassPage.css";

/** The hero Pay area and the second one: the sticky bar hides while either is on screen. */
export const BP_PAY_HERO_TESTID = "bp-pay-hero";
export const BP_PAY_SECOND_TESTID = "bp-pay-second";

/**
 * "Founding price ends 30 November. From 1 December: ₹2,499 + GST." with the offer's name in bold (as /pricing's DeadlineLine).
 */
function DeadlineLine({ line }: { line: string }) {
  if (!line.startsWith(FOUNDING_PRICE_LEAD)) return <>{line}</>;
  return (
    <>
      <strong>{FOUNDING_PRICE_LEAD}</strong>
      {line.slice(FOUNDING_PRICE_LEAD.length)}
    </>
  );
}

/**
 * The Board Pass price, as /pricing's TillBoardsOffer renders it: "₹1,917 + GST · once · till your boards" and the date-driven
 * founding line. ★ THE FIRST RENDER CARRIES NO FIGURE: every figure is computed from the clock after mount, inside the ONE node
 * `data-testid="till-boards-figures"` that the prerender capture removes (captureStaticBodies strip rule 4). The slot keeps the
 * figures' height, so their arrival moves nothing.
 */
export function BoardPassPrice() {
  const [quote, setQuote] = useState<TillBoardsQuote | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setDeadline(boardPassFoundingPriceLine(now));
    setQuote(tillBoardsQuote(now, predictCbseExamDate("10")));
  }, []);
  return (
    <div className="lt-bp-price" data-testid="bp-price">
      {quote && (
        <div className="lt-bp-price__figures" data-testid="till-boards-figures">
          <p className="lt-bp-price__line">
            <span className="lt-bp-price__amount">{quote.priceDisplay}</span>
            <span className="lt-bp-price__meta">
              {BOARD_PASS_ONCE} · {quote.untilLabel}
            </span>
          </p>
          {deadline && (
            <p className="lt-bp-price__deadline" data-testid="bp-price-deadline">
              <DeadlineLine line={deadline} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PRICING-PAGES-2 R1 - the hero Pay button's own label, as PassCheckout renders it (it names the credited total for a student with a
 * pack credit: "Pay ₹2,213"). The second Pay and the phone bar MIRROR it, so every Pay on the page names the amount the checkout
 * charges. Read from the live button (PassCheckout is unchanged and is the one place that knows the credit); null until it renders.
 */
export function useHeroPayLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const area = document.querySelector(`[data-testid="${BP_PAY_HERO_TESTID}"]`);
    if (!area) return undefined;
    const read = () => {
      const text = area.querySelector(".lt-pricing-pay--boards")?.textContent?.trim() || null;
      setLabel((was) => (was === text ? was : text));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(area, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return label;
}

/** "Pay ₹2,213" from the hero label ("Pay ₹2,213 once till your boards" or a credited "Pay ₹2,213"); null when it names no amount. */
export function payAmountOf(label: string | null): string | null {
  const m = label ? /₹[\d,]+/.exec(label) : null;
  return m ? m[0] : null;
}

/**
 * The GST breakup under the second Pay ("₹1,917 + ₹345 GST (18%) = ₹2,262"), after mount (clock-derived); the slot keeps its line.
 * R1: shown only while the hero Pay names that same total (no pack credit). With a credit the breakup would not add up to the Pay,
 * so it is left out (PassCheckout's own credit line sits by the hero Pay).
 */
function GstBreakdownLine({ heroLabel }: { heroLabel: string | null }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => setLine(boardPassGstBreakdown()), []);
  const total = payAmountOf(line ? line.slice(line.lastIndexOf("=")) : null);
  const matches = heroLabel === null || (total !== null && payAmountOf(heroLabel) === total);
  return (
    <p className="lt-bp-second__gst" data-testid="bp-gst-slot">
      {line && matches && <span data-testid="till-boards-figures">{line}</span>}
    </p>
  );
}

/** F4: a tap on the hero Pay (PassCheckout's `.lt-pricing-pay`) is `paywall_action {pay, board-pass}` (capture phase, as /pricing's). */
function trackBoardPassPayTap(e: { target: EventTarget | null }): void {
  const el = e.target as Element | null;
  if (el && typeof el.closest === "function" && el.closest(".lt-pricing-pay")) trackPaywallAction("pay", "board-pass");
}

/** "<d Month yyyy>" - the trial's end, derived from the stored start plus TRIAL_DAYS (as /pricing). */
function trialEndsOn(trialStartDate: string | null): string | null {
  const startMs = trialStartDate ? new Date(trialStartDate).getTime() : NaN;
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + TRIAL_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** The hero Pay's label right now (for the phone bar, which reads its copy when it mounts). */
function heroPayLabelNow(): string | null {
  return document.querySelector(`[data-testid="${BP_PAY_HERO_TESTID}"] .lt-pricing-pay--boards`)?.textContent?.trim() || null;
}

/** Clicks the hero Pay (PassCheckout's own button, so its events and checkout are exactly /pricing's); else scrolls to it. */
export function payFromHero(): void {
  const area = document.querySelector(`[data-testid="${BP_PAY_HERO_TESTID}"]`);
  const pay = area?.querySelector<HTMLButtonElement>(".lt-pricing-pay--boards") ?? null;
  const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  area?.scrollIntoView?.({ behavior: calm ? "auto" : "smooth", block: "center" });
  if (pay && !pay.disabled) pay.click();
}

/**
 * PRICING-PAGES-1 (owner, 11 Nov 2026) - /board-pass: the Board Pass's own page. Every Pay is the SAME checkout entry as /pricing
 * (PassCheckout, unchanged, with /pricing's tap event); the second Pay and the phone bar click that one button. Nothing here writes
 * an entitlement, starts a trial on mount, or prices anything: figures come from src/config/pricing and the bank-claim constants.
 */
export default function BoardPassPage() {
  // F4: name this page on the checkout / purchase events. Set in the FIRST render (before any child's mount effect), cleared on leave.
  useState(() => {
    setSalesPageSurface("board-pass");
    return null;
  });
  useEffect(() => {
    setSalesPageSurface("board-pass");
    // F1: a signed-out Pay opens the "Buy for yourself" sheet, a lazy chunk fetched only at the tap. Fetch it as the page mounts
    // (the same specifier PassCheckout's lazy() uses, so the same chunk, once). Nothing is opened or ordered.
    if (isPaymentsClientEnabled() && isCheckoutWhoClientEnabled()) void import("../components/checkoutWho/CheckoutSheet").catch(() => undefined);
    // N1: clear only our own value - on /board-pass -> /cbq-packs the arriving page has already set its own in its first render.
    return () => {
      if (currentSalesPageSurface() === "board-pass") setSalesPageSurface(null);
    };
  }, []);
  const heroPayLabel = useHeroPayLabel();
  const navigate = useNavigate();
  const desktop = useDesktopLayout();
  const paymentsOn = isPaymentsClientEnabled();
  const checkoutWho = isCheckoutWhoCopyOn();
  const { user } = useAuth();
  const subscription = useSubscription();
  const nowMs = Date.now();

  // A running Board Pass (till boards): no price, no Pay; "You have the Board Pass". Signed out (and so the prerender) false.
  const passEndMs = subscription.status.passEnd ? Date.parse(subscription.status.passEnd) : NaN;
  const owner =
    Boolean(user) &&
    subscription.hydrated &&
    subscription.status.tier === "premium" &&
    subscription.status.plan === "pass_till_boards" &&
    Number.isFinite(passEndMs) &&
    passEndMs > nowMs;
  const showParentActions = Boolean(user) && subscription.hydrated && subscription.status.tier !== "premium" && paymentsOn && isParentPayClientEnabled();

  // TRIAL - state-aware, exactly /pricing's rules (TRIAL-CTA-1): signed out carries the intent to sign-in; signed in starts it HERE
  // through useSubscription().startTrial(), only once hydrated, only for an eligible account, only on an explicit tap.
  const [trialStartedHere, setTrialStartedHere] = useState(false);
  const trialStartFired = useRef(false);
  const trialEligible = subscription.hydrated && subscription.status.tier !== "premium" && !subscription.status.trialStartDate;
  const handleStartTrial = () => {
    if (!user) {
      navigate(`/login?reason=start-trial&redirect=${encodeURIComponent(BOARD_PASS_PAGE_PATH)}`);
      return;
    }
    if (!trialEligible || trialStartFired.current) return;
    trialStartFired.current = true;
    subscription.startTrial();
    trackNamedEvent("trial_start");
    setTrialStartedHere(true);
  };
  const trialButton = (
    <button type="button" className="lt-bp-second__btn" onClick={handleStartTrial} disabled={Boolean(user) && !subscription.hydrated} data-testid="bp-trial">
      {TRIAL_LINK_LABEL}
    </button>
  );
  const trialState = (message: string, practise: boolean): ReactNode => (
    <div className="lt-bp-trialstate" data-testid="bp-trial-state">
      <p role="status">{message}</p>
      {practise && <Link to={PRACTICE_PATH}>Start practising</Link>}
    </div>
  );
  let trialAction: ReactNode;
  if (!user || (!subscription.hydrated && !trialStartedHere)) trialAction = trialButton;
  else if (trialStartedHere) {
    const endsOn = trialEndsOn(subscription.status.trialStartDate);
    trialAction = trialState(endsOn ? `Your 7-day trial has started. It ends on ${endsOn}.` : "Your 7-day trial has started.", true);
  } else if (subscription.status.tier === "premium") trialAction = null;
  else if (subscription.isTrialActive) {
    const n = subscription.daysLeftInTrial;
    trialAction = trialState(`Your trial is active — ${n} ${n === 1 ? "day" : "days"} left.`, true);
  } else if (trialEligible) trialAction = trialButton;
  else trialAction = trialState("You've used your free trial.", false);

  const payForChild = paymentsOn && (checkoutWho || isParentPayClientEnabled()) ? payForChildAnswer(checkoutWho) : null;
  const faq: SalesFaqItem[] = [FAQ_SUBSCRIPTION, ...(payForChild ? [{ q: FAQ_PAY_FOR_CHILD_Q, a: payForChild }] : []), BP_FAQ_BASIC];

  const video = <PricingProof />;

  return (
    <>
      <main className="lt-sp lt-bp" aria-label={`LazyTopper ${BOARD_PASS_NAME}`}>
        <ParentReturnLink />
        <section className="lt-bp-hero" aria-labelledby="bp-h1">
          <div className="lt-sp__w lt-bp-hero__grid">
            <div className="lt-bp-hero__copy">
              <p className="lt-sp-eyebrow lt-bp-hero__eyebrow">{BP_EYEBROW}</p>
              <h1 id="bp-h1" className="lt-bp-hero__h1">{BP_H1}</h1>
              <div className="lt-bp-minute">
                <span className="lt-bp-minute__tile">{BP_MINUTE_TILE}</span>
                <p className="lt-bp-minute__text">
                  <strong className="lt-bp-minute__strong">{BP_MINUTE_STRONG}</strong>
                  <span className="lt-bp-minute__line">{BP_MINUTE_LINE}</span>
                </p>
              </div>
              {owner ? (
                <div className="lt-bp-owner" data-testid="bp-owner">
                  <p className="lt-bp-owner__title">{BP_OWNER_TITLE}</p>
                  <Link className="lt-bp-owner__go" to={PRACTICE_PATH} data-testid="bp-owner-practice">
                    {BP_OWNER_PRACTICE}
                  </Link>
                </div>
              ) : (
                <BoardPassPrice />
              )}
              {/* The SAME checkout entry as /pricing: PassCheckout unchanged, its Pay tap reported as /pricing's (capture phase). */}
              <div className="lt-bp-pay" data-testid={BP_PAY_HERO_TESTID} onClickCapture={trackBoardPassPayTap}>
                {paymentsOn ? <PassCheckout /> : <p className="lt-bp-manual" data-testid="bp-manual">{BP_MANUAL_PAYMENTS_OFF}</p>}
              </div>
              {paymentsOn && !owner && (
                <p className="lt-bp-payline" data-testid="bp-payline">
                  {bpPayLine(checkoutWho)}
                </p>
              )}
            </div>
            {desktop && (
              <div className="lt-bp-hero__video" data-testid="bp-video-hero">
                {video}
              </div>
            )}
          </div>
        </section>

        <div className="lt-sp__w lt-sp__strip">
          <BoardsCountdownStrip />
        </div>

        <section className="lt-sp__w lt-bp-tiles" aria-label="How much practice">
          {BP_TILES.map((t) => (
            <div key={t.id} className="lt-bp-tile" data-testid={`bp-tile-${t.id}`}>
              <span className="lt-bp-tile__figure">{t.figure}</span>
              <span className="lt-bp-tile__label">{t.label}</span>
            </div>
          ))}
        </section>

        <section className="lt-sp__w" aria-labelledby="bp-tutor-h">
          <div className="lt-bp-tutor" data-testid="bp-tutor">
            <h2 id="bp-tutor-h" className="lt-bp-tutor__title">{BP_TUTOR_TITLE}</h2>
            <p className="lt-bp-tutor__body">{BP_TUTOR_BODY}</p>
          </div>
        </section>

        {!desktop && (
          <section className="lt-sp__w lt-bp-video" data-testid="bp-video-phone" aria-label="Student video">
            {video}
          </section>
        )}

        <section className="lt-sp__w" aria-labelledby="bp-what-h">
          <h2 id="bp-what-h" className="lt-sp-h2">{BP_WHAT_TITLE}</h2>
          <div className="lt-bp-what">
            {BP_WHAT_YOU_GET.map((w) => (
              <div key={w.id} className="lt-bp-what__card" data-testid={`bp-what-${w.id}`}>
                {w.kicker && <p className="lt-bp-what__kicker">{w.kicker}</p>}
                <h3 className="lt-bp-what__title">{w.title}</h3>
                <p className="lt-bp-what__body">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {!owner && (
          <section className="lt-sp__w" aria-label={`Get the ${BOARD_PASS_NAME}`}>
            <div className="lt-bp-second" data-testid={BP_PAY_SECOND_TESTID}>
              {paymentsOn ? (
                <>
                  <button type="button" className="lt-bp-second__pay" onClick={payFromHero} data-testid="bp-pay-second-btn">
                    {heroPayLabel ?? tillBoardsButtonLabel()}
                  </button>
                  <GstBreakdownLine heroLabel={heroPayLabel} />
                </>
              ) : (
                <p className="lt-bp-manual">{BP_MANUAL_PAYMENTS_OFF}</p>
              )}
              <div className="lt-bp-second__row">
                <div className="lt-bp-second__trial">{trialAction}</div>
                {showParentActions && (
                  <div className="lt-bp-second__parents" data-testid="bp-parent-share">
                    <PaywallActions surface="pricing" forwardLabel={FORWARD_TO_PARENTS_LABEL} qrLabel={SHARE_QR_LABEL} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="lt-sp__w" aria-labelledby="bp-paper-h">
          <h2 id="bp-paper-h" className="lt-sp-h2">{PAPER_TITLE}</h2>
          <p className="lt-sp-lede">{PAPER_LINE}</p>
          <div className="lt-sp-links">
            <Link className="lt-sp-link lt-sp-link--cbq" to={CBQ_PACKS_PAGE_PATH} data-testid="bp-link-cbq">
              <strong>{CBQ_PACKS_NAME}</strong>
              <span>{cbqPacksLinkPrice()} &rarr;</span>
            </Link>
            <Link className="lt-sp-link" to={QUESTION_BANK_PAGE_PATH} data-testid="bp-link-bank">
              <strong>{QUESTION_BANK_NAME}</strong>
              <span>{questionBankLinkPrice()} &rarr;</span>
            </Link>
          </div>
        </section>

        <div className="lt-sp__w">
          <SalesFaq items={faq} headingId="bp-faq-h" testId="bp-faq" />
        </div>

        {paymentsOn && !owner && subscription.status.tier !== "premium" && (
          <SalesStickyBar
            watch={[BP_PAY_HERO_TESTID, BP_PAY_SECOND_TESTID]}
            copy={() => boardPassStickyCopy(boardPassPriceDisplay(), payAmountOf(heroPayLabelNow()) ?? boardPassPayDisplay())}
            onGo={payFromHero}
            copyKey={heroPayLabel}
            ariaLabel={`${BOARD_PASS_NAME} shortcut`}
            testId="bp-sticky"
          />
        )}
      </main>
      <PublicLegalFooter />
    </>
  );
}
