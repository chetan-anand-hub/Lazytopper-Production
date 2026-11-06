import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { TRIAL_DAYS } from "../services/subscriptionService";
import { trackNamedEvent } from "../analytics/analytics";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  markFreeCheckSigninIntent,
  safeSigninRedirect,
  withSigninRedirect,
} from "../services/freeCheckClient";
import {
  boardPassDeadlineLine,
  formatInr,
  boardPassFoundingLabel,
  boardPassPriceDisplay,
  FOUNDING_LOCK_COPY,
  FOUNDING_OFFER_BADGE,
  FOUNDING_OFFER_LIST_FROM_LABEL,
  TILL_BOARDS_AFTER_FOUNDING_INR,
  foundingRateApplies,
  PERIOD_MONTHLY_LABEL,
  PRICE_MONTHLY_FOUNDING_INR,
  displayPlusGst,
  PRICE_MONTHLY_LIST_INR,
  BOARD_PASS_NAME,
  TUITION_ANCHOR,
  tillBoardsQuote,
  type TillBoardsQuote,
} from "../config/pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";
import PassCheckout from "../components/pricing/PassCheckout";
import PaywallActions, { trackPricingPayTap } from "../components/pricing/PaywallActions";
import ParentPayPanel from "../components/pricing/ParentPayPanel";
import { isParentPayClientEnabled, readParentPayToken } from "../services/parentPay";
import {
  COMPARE_BASIC_HEADER,
  COMPARE_FEATURE_HEADER,
  FAIR_USE_TITLE,
  compareSections,
  fairUseCopy,
  type CompareCell,
} from "../config/pricingCompare";
import { isPaymentsClientEnabled } from "../services/checkout";
import { isGuestPayClientEnabled } from "../services/guestPay";
import { isFreeCheckClientEnabled } from "../services/freeCheckClient";
import type { PackSubject } from "../services/packs";
import ParentReturnLink from "../components/parents/ParentReturnLink";
import { FOUNDER_BADGE_TEXT } from "../components/brand/FounderBadge";
import StickyPassBar from "../components/pricing/StickyPassBar";
import { useMonthPassAvailable } from "../components/pricing/useMonthPassAvailable";
import PricingProof from "../components/marketing/PricingProof";
import PacksShop from "../components/packs/PacksShop";
import { CbqCard, PacksSection, WhatYouGet, useHashLanding } from "../components/pricing/PricingPacks";
import { PRICING_CSS } from "../components/pricing/pricingPageCss";
import {
  BASIC_COMPARE_SUMMARY,
  basicLineRest,
  BASIC_LINE_STRONG,
  BOARD_PASS_ONCE,
  BOARD_PASS_OWNED_CELL,
  BOARD_PASS_TICKS,
  COMPARE_BOARD_PASS_HEADER,
  FAQ_MORE_SUMMARY,
  FAQ_PAY_FOR_CHILD_Q,
  FAQ_SUBSCRIPTION,
  FAQ_TITLE,
  FAQ_WHY_BOTH,
  FORWARD_TO_PARENTS_LABEL,
  LAST_SUBJECT_KEY,
  PAPER_TOO_ASK,
  PAPER_TOO_LEAD,
  PAPER_TOO_REST,
  PRICING_BRAND,
  PRICING_H1,
  PRICING_LOGIN_LABEL,
  PROOF_TITLE,
  SHARE_QR_LABEL,
  START_FREE_LABEL,
  START_HERE_BADGE,
  TRIAL_LINK_LABEL,
  asBoardPass,
  isCheckoutWhoCopyOn,
  payForChildAnswer,
  payLine,
  subjectFromReferrer,
  subjectFromSearch,
  subjectFromStored,
} from "../components/pricing/pricingPlansCopy";

const WAITLIST_KEY = "lazytopper.waitlist.v1";

interface WaitlistEntry {
  contact: string;
  board: string;
  ts: string;
}

function saveWaitlistEntry(entry: WaitlistEntry): void {
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    const list: WaitlistEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
  } catch {}
}

const BOARDS_COMING = [
  { name: "ICSE Board", icon: "🏛️" },
  { name: "State Boards", icon: "🗺️" },
  { name: "Class 12 CBSE", icon: "🎓" },
];

// PRICING-B-1: the stylesheet lives in components/pricing/pricingPageCss.ts (still a string rendered in the page, so the
// prerendered body paints styled). Re-exported for the contrast test.
export { PRICING_CSS };

/**
 * The FAQ items under "More questions" (collapsed), after the three parents' questions. One product name: "Board Pass".
 * NO REFUND WORDING here or anywhere on the page.
 */
const FAQ_ITEMS = [
  {
    q: "Is Basic really free?",
    a: `Yes. Basic is free forever: study, practise and open papers without paying. Checked answers, the AI tutor and Mistake Intelligence come with the ${BOARD_PASS_NAME}.`,
  },
  {
    // PRICE-FIXED-1 (owner, 31 Oct 2026): NO FIGURE here (the price sits in the post-mount figures node).
    q: "What is the Board Pass?",
    a: "The Board Pass is one payment that covers you until your first board paper. There are no renewals and nothing is charged automatically.",
  },
  {
    // PRICE-FIXED-1 (owner, 21:12 IST 31 Oct 2026): both figures imported from the pricing config (never typed); true on every date.
    q: "What happens when the founding offer ends?",
    a: `From ${FOUNDING_OFFER_LIST_FROM_LABEL} the Board Pass is ${formatInr(TILL_BOARDS_AFTER_FOUNDING_INR)} + GST. A pass you have already bought is never re-priced.`,
  },
  {
    q: "Are there any usage limits?",
    a: `Basic has daily limits on opening tests and mocks. The ${BOARD_PASS_NAME} has generous fair use: your usage bars show what is left and when it resets. The 7-day trial has daily and weekly limits, listed under "${BASIC_COMPARE_SUMMARY}".`,
  },
  {
    q: "What happens after the trial ends?",
    a: "You keep using the free plan. Nothing is charged automatically; you choose when to upgrade.",
  },
  {
    q: "Can I pay here?",
    a: `Not yet. Payment checkout is not connected in this build, so ${BOARD_PASS_NAME} activation stays manual.`,
  },
  {
    q: "Is this only for CBSE Class 10?",
    a: "Currently yes. We're expanding to ICSE, State Boards, and Class 12 soon!",
  },
];

// PAYCOPY-1 — the strings that follow the payments switch. Payments dark (VITE_PAYMENTS_ENABLED unset) -> *_PAYMENTS_OFF;
// payments on (production; the prerender is captured in that state) -> *_PAYMENTS_ON.
const FAQ_CAN_I_PAY_Q = "Can I pay here?";
const FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON = `Yes. Tap Pay, finish in Razorpay's secure checkout (UPI, card or netbanking), and the ${BOARD_PASS_NAME} turns on straight away.`;
export const PRICING_MANUAL_PAYMENTS_OFF = `Manual activation during beta. Payment checkout coming soon. The ${BOARD_PASS_NAME} is not activated automatically.`;
const PRICING_FINE_PRINT_PAYMENTS_OFF = `No credit card required. The ${BOARD_PASS_NAME} is not activated automatically.`;
const PRICING_FINE_PRINT_PAYMENTS_ON =
  "No credit card needed for the trial. Passes are one-time payments and never renew automatically.";

/** The collapsed FAQ as rendered: only the "Can I pay here?" answer follows the payments switch. */
export function faqItemsFor(paymentsOn: boolean): ReadonlyArray<{ q: string; a: string }> {
  if (!paymentsOn) return FAQ_ITEMS;
  return FAQ_ITEMS.map(item =>
    item.q === FAQ_CAN_I_PAY_Q ? { q: item.q, a: FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON } : item,
  );
}

/**
 * BACKNAV-1 — where "back" goes when the student arrived from the sign-in door. ★ ALLOWLIST, NOT A PASS-THROUGH: `source` is matched
 * against known values and mapped to a hardcoded path — the parameter never becomes the destination (no open redirect).
 */
const RETURN_TARGETS: Record<string, { backTo: string; backLabel: string }> = {
  login: { backTo: "/login", backLabel: "Back to sign in" },
};

// NAV-FIX-1: no `source` -> no page-level back link. The NAV-1 header row already gives "← Home" (or "← Back" after an
// in-app arrival), so the old "<- Back to home" here was the same link twice. Only the sign-in round trip keeps its own
// link, because it goes somewhere the header does not (/login WITH the carried redirect).

/**
 * PRICING-TB-1 · R1 — the month pass price, shown ONLY to an account the server says already bought a month pass (it renews here).
 * Offer state is a PROP so a test renders both states without mocking src/config.
 */
export function PremiumPriceHead({ offerOpen }: { offerOpen: boolean }) {
  return (
    <div className="lt-pricing-price" data-testid="pricing-monthly-price">
      <span className="lt-pricing-amount">
        {/* GST-EXCL-1: a price TAG ("+ GST" from 00:00 IST 7 Nov 2026); the total is on the Pay button. */}
        {displayPlusGst(offerOpen ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR)}
      </span>
      <span className="lt-pricing-period">{PERIOD_MONTHLY_LABEL}</span>
      {offerOpen && <s className="lt-pricing-was">{displayPlusGst(PRICE_MONTHLY_LIST_INR)}</s>}
    </div>
  );
}

/**
 * PRICING-LADDER-1 - "≈ ₹N a day till your boards": N = ceil(price / whole IST days to the board date). Pure. Kept as a helper
 * (PRICING-B-1 no longer prints the line: the owner-approved card carries the price, its coverage and the founding line only).
 */
export function boardPassPerDay(now: Date, boardIso: string, priceInr: number): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(boardIso);
  if (!match || Number.isNaN(now.getTime()) || !Number.isFinite(priceInr)) return null;
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  const todayUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  const boardUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const days = Math.round((boardUtc - todayUtc) / 86_400_000);
  if (!Number.isFinite(days) || days < 1) return null;
  const perDay = Math.ceil(priceInr / days);
  return Number.isFinite(perDay) && perDay > 0 ? perDay : null;
}

/** "Founding member offer ends 30 November. From 1 December: ₹2,499." with the offer's name in bold. */
function DeadlineLine({ line }: { line: string }) {
  if (!line.startsWith(FOUNDING_OFFER_BADGE)) return <>{line}</>;
  return (
    <>
      <strong>{FOUNDING_OFFER_BADGE}</strong>
      {line.slice(FOUNDING_OFFER_BADGE.length)}
    </>
  );
}

/**
 * PRICING-TB-1 · R3/R4 — the Board Pass price on the card.
 *
 * ★ THE FIRST RENDER CARRIES NO FIGURE. Every figure is computed from the clock and the predicted board date inside the effect and
 * sits inside the ONE node carrying `data-testid="till-boards-figures"`, which `stripAuthChrome()` (scripts/seo/captureStaticBodies.ts)
 * removes from the prerendered capture by structural selector. The slot keeps the figures' height, so their arrival moves nothing.
 */
export function TillBoardsOffer() {
  const [quote, setQuote] = useState<TillBoardsQuote | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [foundingLabel, setFoundingLabel] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    setDeadline(boardPassDeadlineLine(now));
    setFoundingLabel(boardPassFoundingLabel(now));
    setQuote(tillBoardsQuote(now, predictCbseExamDate("10")));
  }, []);

  return (
    <div className="lt-pricing-tillboards" data-testid="till-boards">
      <div className="lt-pricing-tillboards-slot">
        {quote && (
          <div className="lt-pricing-tillboards-figures" data-testid="till-boards-figures" data-founding={foundingLabel ? "open" : "closed"}>
            <p className="lt-pp-price">
              <span className="lt-pricing-tillboards-amount">{quote.priceDisplay}</span>
              <span className="lt-pricing-tillboards-meta">
                <span className="lt-pricing-tillboards-once">{BOARD_PASS_ONCE}</span>
                {" · "}
                <span className="lt-pricing-tillboards-until">{quote.untilLabel}</span>
              </span>
            </p>
            {deadline && (
              <p className="lt-pricing-tillboards-deadline" data-testid="till-boards-deadline">
                <DeadlineLine line={deadline} />
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "<d Month yyyy>" — the trial's end, DERIVED from the stored start plus TRIAL_DAYS (the end is never stored). Read at render.
 */
function trialEndsOn(trialStartDate: string | null): string | null {
  const startMs = trialStartDate ? new Date(trialStartDate).getTime() : NaN;
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + TRIAL_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** One cell of the folded Board Pass vs Basic table; a tick or a dash carries visually hidden words. */
function CompareCellView({ cell, plan }: { cell: CompareCell; plan: "basic" | "premium" }) {
  const planClass = plan === "premium" ? " lt-pricing-cell--premium" : "";
  if (cell.kind === "no") {
    return (
      <td className={`lt-pricing-cell--no${planClass}`}>
        <span aria-hidden="true">—</span>
        <span className="lt-pricing-sr">Not included</span>
      </td>
    );
  }
  if (cell.kind === "text") {
    return <td className={`lt-pricing-cell--text${planClass}`}>{asBoardPass(cell.text)}</td>;
  }
  return (
    <td className={`lt-pricing-cell--yes${planClass}`}>
      <span aria-hidden="true">✓</span>
      {cell.note ? ` ${asBoardPass(cell.note)}` : <span className="lt-pricing-sr">Included</span>}
    </td>
  );
}

/** Desktop layout (the Option B grid) from 1024 px. Read synchronously so the first render already places the video right. */
const DESKTOP_QUERY = "(min-width: 1024px)";
function readDesktop(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return false;
  }
}
function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(readDesktop);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return desktop;
}

/**
 * PRICING-B-1 — the subject the packs follow (chapter button, one-subject rows, CBQ "See inside", sticky bar, the SKU + target sent
 * to checkout). Default: the URL (?t= / ?subject= / ?mock= / ?chapter=) -> the page the visitor came from (same-site referrer) ->
 * the student's last-used subject (`lazytopper.lastSubjectContext`, read only) -> Maths. The URL is read in the first render (so
 * the prerender and deep links agree); the referrer and storage only after mount, and never over a choice the reader made.
 */
function usePricingSubject(search: string): [PackSubject, (s: PackSubject) => void] {
  const [subject, setSubject] = useState<PackSubject>(() => subjectFromSearch(search) ?? "maths");
  const decided = useRef(subjectFromSearch(search) !== null);
  useEffect(() => {
    if (decided.current) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LAST_SUBJECT_KEY);
    } catch {
      stored = null;
    }
    const hint =
      subjectFromReferrer(typeof document !== "undefined" ? document.referrer : "", typeof window !== "undefined" ? window.location.origin : "") ??
      subjectFromStored(stored);
    if (hint && !decided.current) setSubject(hint);
  }, []);
  const pick = (s: PackSubject) => {
    decided.current = true;
    setSubject(s);
  };
  return [subject, pick];
}

/**
 * ASK-PARENTS-PAY-1 — `/pricing#pp=<token>` is a parent's pay link: with parent pay switched on, the parent's page replaces the
 * plans. The token is read ONCE (latched). Without a valid token, or while parent pay is dark, this is the plans page.
 */
export default function PricingPage() {
  const { hash } = useLocation();
  const [parentToken] = useState(() => (isParentPayClientEnabled() ? readParentPayToken(hash) : null));
  if (parentToken) return <ParentPayPanel token={parentToken} />;
  return <PricingPlansPage />;
}

/**
 * PRICING-B-1 (owner-approved "Option B v3", 3 Nov 2026). One page for every account state (signed out, Basic, trial, paid):
 * 1. navy header; 2. the Board Pass card (START HERE; desktop: the testimonial in the same card); 3. CBQ Packs (#cbq);
 * 4. "More printed practice" (#packs): the Bundle, the Chapter Pack with the subject switch, "Only need one subject?";
 * 5. the phone sticky bar; 6. "What you get with each" + the folded Board Pass vs Basic table; 7. the testimonial (phone);
 * 8. "Questions parents ask"; 9. the Basic line. Every Pay / Buy is a central buy path (PassCheckout, the shared pack shop).
 */
function PricingPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const paymentsOn = isPaymentsClientEnabled();
  const checkoutWho = isCheckoutWhoCopyOn();
  const [searchParams] = useSearchParams();
  const returnTarget: { backTo: string; backLabel: string } | null =
    RETURN_TARGETS[(searchParams.get("source") || "").trim().toLowerCase()] ?? null;
  // FREECHECK-2 · F3 — the sign-in door's `?redirect=`: only handed BACK to /login, and only as a safe internal path.
  const carriedRedirect = safeSigninRedirect(searchParams.get("redirect"));
  const backTo =
    returnTarget?.backTo === "/login"
      ? withSigninRedirect("/login", carriedRedirect)
      : returnTarget?.backTo ?? "/";
  const toLogin = (path: string) => {
    if (carriedRedirect) markFreeCheckSigninIntent();
    navigate(path);
  };
  const [waitlistContact, setWaitlistContact] = useState("");
  const [waitlistBoard, setWaitlistBoard] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const desktop = useDesktop();
  const [subject, setSubject] = usePricingSubject(location.search);
  useHashLanding();

  // TRIAL-CTA-1 — the trial action is state-aware. Signed out it carries the trial intent to the sign-in door (Login.tsx honours it
  // once). Signed in, it starts the trial HERE through useSubscription().startTrial(), only once the record has hydrated and only
  // for an eligible account (not premium, no trialStartDate) — an explicit tap, never on mount.
  const { user, loading: authLoading } = useAuth();
  const subscription = useSubscription();
  const nowMs = Date.now();
  // PRICE-FIXED-1: `monthBuyer` is the SERVER's word that this account already has a paid month order (it renews here).
  const monthBuyer = useMonthPassAvailable();
  const foundingRate = foundingRateApplies(nowMs, subscription.status.foundingMember);
  const [trialStartedHere, setTrialStartedHere] = useState(false);
  const trialStartFired = useRef(false);
  const trialEligible =
    subscription.hydrated &&
    subscription.status.tier !== "premium" &&
    !subscription.status.trialStartDate;

  const handleStartTrial = () => {
    if (!user) {
      toLogin(`/login?reason=start-trial&redirect=${encodeURIComponent(carriedRedirect ?? "/pricing")}`);
      return;
    }
    if (!trialEligible || trialStartFired.current) return;
    trialStartFired.current = true;
    subscription.startTrial();
    trackNamedEvent("trial_start");
    setTrialStartedHere(true);
  };

  const startTrialButton = (
    <button
      type="button"
      className={paymentsOn ? "lt-pp-trial" : "lt-pricing-cta lt-pricing-cta--primary"}
      onClick={handleStartTrial}
      disabled={Boolean(user) && !subscription.hydrated}
      data-testid="pricing-trial"
    >
      {TRIAL_LINK_LABEL}
    </button>
  );
  const trialState = (message: string, practiseLink: boolean): ReactNode => (
    <div className="lt-pricing-trial-state" data-testid="pricing-trial-state">
      <p className="lt-pricing-trial-state-msg" role="status">
        {message}
      </p>
      {practiseLink && (
        <Link className="lt-pricing-cta lt-pricing-cta--primary" to="/practice-hub">
          Start practising
        </Link>
      )}
    </div>
  );
  let premiumTrialAction: ReactNode;
  if (!user || (!subscription.hydrated && !trialStartedHere)) {
    premiumTrialAction = startTrialButton;
  } else if (trialStartedHere) {
    const endsOn = trialEndsOn(subscription.status.trialStartDate);
    premiumTrialAction = trialState(
      endsOn ? `Your 7-day trial has started. It ends on ${endsOn}.` : "Your 7-day trial has started.",
      true,
    );
  } else if (subscription.status.tier === "premium") {
    // PARENT-PACKS-1 (owner live check): nothing here for ANY paid plan - the pass card's own line says which pass, until when.
    premiumTrialAction = null;
  } else if (subscription.isTrialActive) {
    const n = subscription.daysLeftInTrial;
    premiumTrialAction = trialState(`Your trial is active — ${n} ${n === 1 ? "day" : "days"} left.`, true);
  } else if (trialEligible) {
    premiumTrialAction = startTrialButton;
  } else {
    premiumTrialAction = trialState("You've used your free trial.", false);
  }

  const handleWaitlistSubmit = () => {
    if (!waitlistContact.trim()) return;
    saveWaitlistEntry({
      contact: waitlistContact.trim(),
      board: waitlistBoard || "not specified",
      ts: new Date().toISOString(),
    });
    setWaitlistSubmitted(true);
    setWaitlistContact("");
    setWaitlistBoard("");
  };

  // SEO-PAGES-1 (D) — the one free signed-out answer check (the folded table's Basic answer-checking cell follows it).
  const showFreeCheck = !authLoading && !user && isFreeCheckClientEnabled();
  const sections = compareSections({ freeCheck: showFreeCheck });
  const showParentActions =
    Boolean(user) && subscription.hydrated && subscription.status.tier !== "premium" && paymentsOn && isParentPayClientEnabled();
  // "Can I pay for my child?" is answered only while the answer is TRUE for this build: the new checkout (anyone pays, no sign-up),
  // or the parent-pay link a student forwards.
  const payForChild = paymentsOn && (checkoutWho || isParentPayClientEnabled()) ? payForChildAnswer(checkoutWho) : null;
  const boardPassPrice = boardPassPriceDisplay(nowMs);
  // PARENT-PACKS-1 (owner, from #1540's report) - a signed-in Board Pass (till boards) owner whose pass is running is shown no
  // Board Pass price, no pay line, and "You have it" in the table. Signed out (and so the prerender) this is false: unchanged.
  const passEndMs = subscription.status.passEnd ? Date.parse(subscription.status.passEnd) : NaN;
  const boardPassOwner =
    Boolean(user) &&
    subscription.hydrated &&
    subscription.status.tier === "premium" &&
    subscription.status.plan === "pass_till_boards" &&
    Number.isFinite(passEndMs) &&
    passEndMs > nowMs;
  // A running pass hides the month price block: a Board Pass owner, or a month pass outside its last 7 days (its renewal
  // button carries the price inside that window).
  const runningPassHidesMonth =
    boardPassOwner ||
    (Boolean(user) &&
      subscription.hydrated &&
      subscription.status.tier === "premium" &&
      Number.isFinite(passEndMs) &&
      passEndMs > nowMs &&
      passEndMs - nowMs > 7 * 86_400_000);

  /** The sticky bar's "Pay": the hero Pay button itself (PassCheckout + its tap event), else a scroll to the card. */
  const payFromSticky = () => {
    const card = document.getElementById("lt-premium-card");
    const pay = document.querySelector<HTMLButtonElement>('[data-testid="pricing-passes"] .lt-pricing-pay--boards');
    const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card?.scrollIntoView?.({ behavior: calm ? "auto" : "smooth", block: "start" });
    if (pay && !pay.disabled) pay.click();
  };

  const proof = (
    <PricingProof />
  );

  return (
    <main className="lt-pricing-page" aria-label="LazyTopper pricing">
      <style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />
      <div className="lt-pricing-inner">
        <div className="lt-pricing-band">
          <div className="lt-pricing-band-inner">
            <div className="lt-pp-topbar">
              {returnTarget && (carriedRedirect && backTo !== returnTarget.backTo ? (
                <div className="lt-pricing-return" onClickCapture={markFreeCheckSigninIntent}>
                  <ReturnContextBar backTo={backTo} backLabel={returnTarget.backLabel} />
                </div>
              ) : (
                <ReturnContextBar backTo={returnTarget.backTo} backLabel={returnTarget.backLabel} />
              ))}
              <span className="lt-pp-brand" aria-hidden="true">{PRICING_BRAND}</span>
              {!authLoading && !user && (
                <button type="button" className="lt-pp-login" onClick={() => toLogin(withSigninRedirect("/login", carriedRedirect))}>
                  {PRICING_LOGIN_LABEL}
                </button>
              )}
            </div>
            <ParentReturnLink />
            <h1 className="lt-pricing-title">{PRICING_H1}</h1>
            <p className="lt-pp-cred" data-testid="founder-badge">{FOUNDER_BADGE_TEXT}</p>
          </div>
        </div>

        <div className="lt-pricing-body">
          {/* The Board Pass card. A <div>, never a <section>: the prerender strip removes a whole <section> around any /login link. */}
          <div className="lt-pp-pass" id="lt-premium-card" data-testid="pricing-board-pass">
            <div className="lt-pp-pass__main">
              <div className="lt-pp-pass__head">
                <h2 className="lt-pp-pass__name">{BOARD_PASS_NAME}</h2>
                <span className="lt-pp-badge">{START_HERE_BADGE}</span>
              </div>
              <ul className="lt-pp-ticks" aria-label={`What the ${BOARD_PASS_NAME} gives`}>
                {BOARD_PASS_TICKS.map(t => (
                  <li key={t.id}>
                    <span className="lt-pp-tick" aria-hidden="true">✓</span>
                    <span>
                      {t.strong && <strong>{t.strong}</strong>}
                      {t.text}
                    </span>
                  </li>
                ))}
              </ul>
              {!boardPassOwner && <TillBoardsOffer />}

              {/* PAYWALL-PAY-1 — a tap on Pay is the "pay" paywall action (capture phase; PassCheckout is untouched). */}
              <div className="lt-pricing-passes" data-testid="pricing-passes" onClickCapture={trackPricingPayTap}>
                {monthBuyer && !runningPassHidesMonth && (
                  <div className="lt-pricing-month">
                    <span className="lt-pricing-month__name">Month pass</span>
                    <PremiumPriceHead offerOpen={foundingRate} />
                    <span className="lt-pricing-period">{TUITION_ANCHOR}</span>
                    {foundingRate && <p className="lt-pricing-founding-note">{FOUNDING_LOCK_COPY}</p>}
                  </div>
                )}
                {paymentsOn ? (
                  <PassCheckout />
                ) : (
                  <p className="lt-pricing-manual" data-testid="pricing-manual">{PRICING_MANUAL_PAYMENTS_OFF}</p>
                )}
                {/* ASK-PARENTS-PAY-1 / PAYWALL-PAY-1 — a signed-in, non-paid student can send a parent the pay link. Nothing while dark. */}
                {showParentActions && (
                  <div className="lt-parent-share lt-pp-parents" data-testid="pricing-parent-share">
                    <PaywallActions surface="pricing" forwardLabel={FORWARD_TO_PARENTS_LABEL} qrLabel={SHARE_QR_LABEL} />
                  </div>
                )}
              </div>
              {paymentsOn && !boardPassOwner && (
                <p className="lt-pp-payline" data-testid="pricing-payline">
                  {payLine({ checkoutWho, guestPay: isGuestPayClientEnabled() })}
                </p>
              )}
              <a className="lt-pp-paper" href="#packs" data-testid="pricing-paper-link">
                {PAPER_TOO_LEAD} <strong>{PAPER_TOO_ASK}</strong> {PAPER_TOO_REST}{" "}
                <span className="lt-pp-paper__arrow" aria-hidden="true">↓</span>
              </a>
              <div className="lt-pricing-trial-slot">{premiumTrialAction}</div>
            </div>
            {desktop && (
              <div className="lt-pp-pass__proof lt-pp-proof" data-testid="pricing-proof-hero">
                {proof}
              </div>
            )}
          </div>

          <PacksShop embedded returnPath="/pricing">
            {api => {
              const cbqOwned = api.buyEnabled && api.ownsPack("pack_cbq", subject);
              return (
                <>
                  <CbqCard api={api} subject={subject} />
                  <PacksSection api={api} subject={subject} onSubject={setSubject} desktop={desktop} />

                  <div className="lt-pp-lower">
                    <WhatYouGet boardPassPrice={boardPassOwner ? BOARD_PASS_OWNED_CELL : boardPassPrice}>
                      <details className="lt-pp-basic" data-testid="pricing-basic-details">
                        <summary>
                          {BASIC_COMPARE_SUMMARY}&nbsp;<span className="lt-pp-basic__arrow" aria-hidden="true">↓</span>
                        </summary>
                        <div className="lt-pp-basic__body">
                          <div className="lt-pricing-compare-scroll" role="region" aria-label="Board Pass and Basic compared" tabIndex={0}>
                            <table className="lt-pricing-compare-table" data-testid="pricing-compare">
                              <thead>
                                <tr>
                                  <th scope="col" className="lt-pricing-compare-col-feature">{COMPARE_FEATURE_HEADER}</th>
                                  <th scope="col" className="lt-pricing-compare-col-premium">{COMPARE_BOARD_PASS_HEADER}</th>
                                  <th scope="col" className="lt-pricing-compare-col-basic">{COMPARE_BASIC_HEADER}</th>
                                </tr>
                              </thead>
                              {sections.map(section => (
                                <tbody key={section.title}>
                                  <tr className="lt-pricing-compare-section">
                                    <th scope="rowgroup" colSpan={3}>{section.title}</th>
                                  </tr>
                                  {section.rows.map(row => (
                                    <tr key={row.label} className="lt-pricing-compare-row">
                                      <th scope="row">{asBoardPass(row.label)}</th>
                                      <CompareCellView cell={row.premium} plan="premium" />
                                      <CompareCellView cell={row.basic} plan="basic" />
                                    </tr>
                                  ))}
                                </tbody>
                              ))}
                            </table>
                          </div>
                          <div className="lt-pricing-fairuse" data-testid="pricing-fair-use">
                            <h3 className="lt-pricing-fairuse-title">{FAIR_USE_TITLE}</h3>
                            <p className="lt-pricing-fairuse-text">{asBoardPass(fairUseCopy())}</p>
                          </div>
                          <p className="lt-pricing-fine-print">
                            {paymentsOn ? PRICING_FINE_PRINT_PAYMENTS_ON : PRICING_FINE_PRINT_PAYMENTS_OFF}
                          </p>
                        </div>
                      </details>
                    </WhatYouGet>

                    {!desktop && (
                      <section className="lt-pp-section lt-pp-proof lt-pp-proof--phone" aria-labelledby="pricing-proof-h" data-testid="pricing-proof-phone">
                        <h2 className="lt-pp-h2" id="pricing-proof-h">{PROOF_TITLE}</h2>
                        {proof}
                      </section>
                    )}

                    <section className="lt-pp-section lt-pricing-faq" aria-labelledby="pricing-faq-h" data-testid="pricing-faq">
                      <h2 className="lt-pp-h2" id="pricing-faq-h">{FAQ_TITLE}</h2>
                      <div className="lt-pricing-faq-list">
                        {[FAQ_WHY_BOTH, FAQ_SUBSCRIPTION, ...(payForChild ? [{ q: FAQ_PAY_FOR_CHILD_Q, a: payForChild }] : [])].map(item => (
                          <div key={item.q} className="lt-pricing-faq-item">
                            <p className="lt-pricing-faq-q">{item.q}</p>
                            <p className="lt-pricing-faq-a">{item.a}</p>
                          </div>
                        ))}
                        <details className="lt-pp-more" data-testid="pricing-faq-more">
                          <summary>{FAQ_MORE_SUMMARY}</summary>
                          <div className="lt-pricing-faq-list">
                            {faqItemsFor(paymentsOn).map(item => (
                              <details key={item.q} className="lt-pricing-faq-item">
                                <summary className="lt-pricing-faq-q">{item.q}</summary>
                                <p className="lt-pricing-faq-a">{item.a}</p>
                              </details>
                            ))}
                          </div>
                          {/* PRIVACY-DPDP-1 (owner item, 24 Oct 2026): the public marking guide, a real link for crawlers. */}
                          <p className="lt-pricing-mark-guide">Wondering how answers are marked? <Link to="/check-your-answer">See how CBSE examiners mark Class 10 answers</Link>, with worked examples from past board papers.</p>
                        </details>
                      </div>
                    </section>
                  </div>

                  <div className="lt-pp-basicline" data-testid="pricing-basic-line">
                    <span>
                      <strong>{BASIC_LINE_STRONG}</strong>
                      {basicLineRest()}
                    </span>
                    {/* A signed-in student already has Basic: no sign-in button for them. */}
                    {!user && (
                      <button
                        type="button"
                        className="lt-pp-startfree"
                        onClick={() => toLogin(withSigninRedirect("/login", carriedRedirect))}
                      >
                        {START_FREE_LABEL}
                      </button>
                    )}
                  </div>

                  {/* TRUST-1 — other boards are not what a buyer came for: folded away at the very bottom. */}
                  <details className="lt-pricing-otherboards" data-testid="pricing-otherboards">
                    <summary className="lt-pricing-otherboards-summary">Other boards? Join the waitlist</summary>
                    <section className="lt-pricing-coming" aria-label="Boards and classes coming soon">
                      <h2 className="lt-pricing-coming-title">Coming Soon</h2>
                      <p className="lt-pricing-coming-lede">
                        We're expanding to more boards and classes. Join the waitlist to get early access.
                      </p>
                      <div className="lt-pricing-coming-chips">
                        {BOARDS_COMING.map(b => (
                          <span key={b.name} className="lt-pricing-coming-chip">
                            <span aria-hidden="true">{b.icon}</span>
                            <span>{b.name}</span>
                          </span>
                        ))}
                      </div>
                    </section>
                    <section className="lt-pricing-waitlist" aria-label="Early access waitlist">
                      {waitlistSubmitted ? (
                        <div className="lt-pricing-waitlist-success" role="status" aria-live="polite">
                          <p className="lt-pricing-waitlist-success-title">You're on the waitlist!</p>
                          <p className="lt-pricing-waitlist-success-sub">We'll notify you when we launch.</p>
                        </div>
                      ) : (
                        <>
                          <h2 className="lt-pricing-waitlist-title">Join the waitlist</h2>
                          <p className="lt-pricing-waitlist-lede">
                            Tell us where to reach you and which board you're hoping for. We'll let you know as soon as we open access.
                          </p>
                          <div className="lt-pricing-waitlist-form">
                            <input
                              type="text"
                              className="lt-pricing-waitlist-input"
                              value={waitlistContact}
                              onChange={e => setWaitlistContact(e.target.value)}
                              placeholder="Email or phone number"
                              aria-label="Email or phone number"
                            />
                            <select
                              className="lt-pricing-waitlist-select"
                              value={waitlistBoard}
                              onChange={e => setWaitlistBoard(e.target.value)}
                              aria-label="Board"
                            >
                              <option value="">Board...</option>
                              <option value="icse">ICSE</option>
                              <option value="state">State Board</option>
                              <option value="cbse12">CBSE Class 12</option>
                            </select>
                            <button type="button" className="lt-pricing-waitlist-cta" onClick={handleWaitlistSubmit}>
                              Join Waitlist
                            </button>
                          </div>
                        </>
                      )}
                    </section>
                  </details>

                  {/* The phone shortcut bar: mounted after hydration (never prerendered), only with payments on. */}
                  {paymentsOn && (
                    <StickyPassBar
                      passWatchTestId="pricing-passes"
                      packsId="packs"
                      showPass={subscription.status.tier !== "premium"}
                      onPass={payFromSticky}
                      cbq={
                        cbqOwned
                          ? null
                          : {
                              subject,
                              onBuy: () => (api.buyEnabled ? api.buyNow("pack_cbq", subject) : api.openCbq(subject)),
                              blocked: api.buyEnabled && api.blockedBy("pack_cbq", subject),
                            }
                      }
                    />
                  )}
                </>
              );
            }}
          </PacksShop>
        </div>
      </div>

      {/* [FU-LEGAL-FOOTER-LINK] — /pricing must reach the Cancellation Policy and Terms. */}
      <PublicLegalFooter />
    </main>
  );
}
