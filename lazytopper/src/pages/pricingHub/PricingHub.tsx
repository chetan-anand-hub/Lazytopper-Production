import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import RestoredPurchaseCard from "../../components/checkoutWho/RestoredPurchaseCard";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BoardsCountdownStrip from "../../components/urgency/BoardsCountdownStrip";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { isPaidPremium } from "../../services/subscriptionService";
import { trackNamedEvent } from "../../analytics/analytics";
import ReturnContextBar from "../../components/ux/ReturnContextBar";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import { markFreeCheckSigninIntent, safeSigninRedirect, withSigninRedirect, isFreeCheckClientEnabled } from "../../services/freeCheckClient";
import { boardPassPayDisplay, boardPassPriceDisplay, foundingRateApplies, TUITION_ANCHOR, FOUNDING_LOCK_COPY } from "../../config/pricing";
import PassCheckout from "../../components/pricing/PassCheckout";
import PaywallActions, { trackPricingPayTap } from "../../components/pricing/PaywallActions";
import { isParentPayClientEnabled } from "../../services/parentPay";
import { COMPARE_BASIC_HEADER, COMPARE_FEATURE_HEADER, FAIR_USE_TITLE, compareSections, fairUseCopy, type CompareCell } from "../../config/pricingCompare";
import { isPaymentsClientEnabled } from "../../services/checkout";
import { isGuestPayClientEnabled } from "../../services/guestPay";
import { PACK_PAID_COPY, isTestSeriesPackOffered, packPayLabel, subjectLabel, type PackSku, type PackSubject } from "../../services/packs";
import ParentReturnLink from "../../components/parents/ParentReturnLink";
import { FOUNDER_BADGE_TEXT } from "../../components/brand/FounderBadge";
import { useMonthPassAvailable } from "../../components/pricing/useMonthPassAvailable";
import PricingProof from "../../components/marketing/PricingProof";
import PacksShop, { OTHER_PAYMENT_BUSY_COPY, type PacksShopApi } from "../../components/packs/PacksShop";
import { WhatYouGet, useHashLanding } from "../../components/pricing/PricingPacks";
import { PRICING_CSS } from "../../components/pricing/pricingPageCss";
import SalesStickyBar from "../../components/salesPages/SalesStickyBar";
import {
  BASIC_COMPARE_SUMMARY,
  basicLineRest,
  BASIC_LINE_STRONG,
  BOARD_PASS_OWNED_CELL,
  BUNDLE_BUY_LABEL,
  BUNDLE_NAME,
  COMPARE_BOARD_PASS_HEADER,
  FAQ_MORE_SUMMARY,
  FAQ_PAY_FOR_CHILD_Q,
  FAQ_SUBSCRIPTION,
  FAQ_TITLE,
  FAQ_WHY_BOTH,
  FORWARD_TO_PARENTS_LABEL,
  LAST_SUBJECT_KEY,
  OWNED_LABEL,
  PRICING_BRAND,
  PRICING_H1,
  PRICING_LOGIN_LABEL,
  SHARE_QR_LABEL,
  START_FREE_LABEL,
  START_HERE_BADGE,
  TRIAL_LINK_LABEL,
  asBoardPass,
  isCheckoutWhoCopyOn,
  payForChildAnswer,
  payLine,
  stickyCbqCopy,
  stickyPassCopy,
  subjectFromReferrer,
  subjectFromSearch,
  subjectFromStored,
} from "../../components/pricing/pricingPlansCopy";
import { BOARD_PASS_PAGE_PATH, CBQ_PACKS_PAGE_PATH, MY_PACKS_PATH, PRACTICE_PATH, QUESTION_BANK_PAGE_PATH } from "../../components/salesPages/salesPagesCopy";
import {
  BOARD_PASS_NAME,
  CBQ_PACKS_NAME,
  HUB_BANK_CLAIM_FIGURE,
  HUB_BANK_CLAIM_REST,
  HUB_BANK_HERO,
  HUB_BANK_PRICE_META,
  HUB_BANK_SEPARATE,
  HUB_BANK_TILES,
  HUB_CARD_ID,
  HUB_CARD_ORDER,
  HUB_CBQ_DETAILS,
  HUB_CBQ_HERO,
  HUB_CBQ_INSIDE_CHIPS,
  HUB_CBQ_INSIDE_LINES,
  HUB_CBQ_INSIDE_TITLE,
  HUB_CBQ_NOT_IN_BUNDLE,
  HUB_CBQ_PRICE_META,
  HUB_CBQ_TAG,
  HUB_CBQ_TICKS,
  HUB_CBQ_TILES,
  HUB_EYEBROW,
  HUB_FOLD_COMPARE,
  HUB_FOLD_VIDEO,
  HUB_OPEN_MY_PACKS,
  HUB_PASS_DETAILS,
  HUB_PASS_MINUTE_FIGURE,
  HUB_PASS_MINUTE_LINE,
  HUB_PASS_MINUTE_STRONG,
  HUB_PASS_MINUTE_UNIT,
  HUB_PASS_OWNED,
  HUB_PASS_OWNED_GO,
  HUB_PASS_TAG,
  HUB_PASS_TICKS,
  HUB_PASS_TILES,
  HUB_PASS_TUTOR_BODY,
  HUB_PASS_TUTOR_STRONG,
  HUB_TAB_NAME,
  HUB_TABS_CAPTION,
  HUB_TABS_LABEL,
  HUB_GROUPS,
  HUB_TS_DETAILS_PATH,
  HUB_TS_BUY,
  HUB_TS_CHECKS_LINE,
  HUB_TS_INSIDE_TITLE,
  HUB_TS_NEW,
  HUB_TS_OWNED,
  HUB_TS_PASS_GO,
  HUB_TS_PASS_INCLUDED,
  HUB_TS_PRICE_META,
  HUB_TS_TAG,
  HUB_TS_TICKS,
  HUB_TS_TRY_LINE,
  HUB_TS_UPSELL_GO,
  HUB_TS_UPSELL_Q,
  QUESTION_BANK_NAME,
  TEST_SERIES_CARD_NAME,
  hubTsBuyPath,
  hubTsDetails,
  hubTsHeadline,
  hubTsInsideRows,
  hubTsPrice,
  hubTsStickyCopy,
  hubBankDetails,
  hubBankPrice,
  hubBankRows,
  HUB_BANK_ROWS_TITLE,
  hubBankTag,
  hubBankTicks,
  hubBundleStickyCopy,
  hubCbqBuyAria,
  hubCbqBuyLabel,
  hubCbqPrice,
  hubPositionLine,
  hubTabPrice,
  type HubCardKey,
} from "./hubCopy";
import { HUB_CSS } from "./pricingHubCss";
import { seriesTotals } from "../../lib/testSeries/testSeries";
import { TestSeriesFoundingClause, TsClockSlot } from "../../components/packs/TestSeriesFoundingClause";
import { TestSeriesExaminerLine, TestSeriesPerTest } from "../../components/packs/TestSeriesPerTest";

/**
 * The legacy page's own private pieces the hub reuses UNCHANGED. PricingPage.tsx hands them over (it owns them; the hub never imports
 * PricingPage, so there is no import cycle and the legacy file keeps every line it had).
 */
export interface HubLegacyParts {
  TillBoardsOffer: ComponentType;
  PremiumPriceHead: ComponentType<{ offerOpen: boolean }>;
  CompareCellView: ComponentType<{ cell: CompareCell; plan: "basic" | "premium" }>;
  faqItemsFor: (paymentsOn: boolean) => ReadonlyArray<{ q: string; a: string }>;
  manualPaymentsOff: string;
  finePrintPaymentsOn: string;
  finePrintPaymentsOff: string;
  boardsComing: ReadonlyArray<{ name: string; icon: string }>;
  saveWaitlistEntry: (entry: { contact: string; board: string; ts: string }) => void;
  trialEndsOn: (trialStartDate: string | null) => string | null;
  returnTargets: Readonly<Record<string, { backTo: string; backLabel: string }>>;
}

const SUBJECTS: readonly PackSubject[] = ["maths", "science"];
/** The hero Pay area (legacy test id: the sticky bar, the pay-tap event and the tests find it by this). */
const PASS_PAY_TESTID = "pricing-passes";
const CBQ_BUY_TESTID = "hub-buy-cbq";
const TS_BUY_TESTID = "hub-buy-ts";
const BANK_BUY_TESTID = "hub-buy-bank";
/** PassCheckout's Test Series upgrade line (TS-UPGRADE-CREDIT-1): present only while the card's Pay names the server's upgrade total. */
const TS_UPGRADE_LINE_TESTID = "pass-checkout-ts-upgrade";
/** Each card's Pay / Buy area (the bar hides while the one(s) it watches are on screen). */
const CARD_BUY_TESTID: Readonly<Record<HubCardKey, string>> = { pass: PASS_PAY_TESTID, ts: TS_BUY_TESTID, cbq: CBQ_BUY_TESTID, bank: BANK_BUY_TESTID };
const ALL_BUY_TESTIDS: readonly string[] = [PASS_PAY_TESTID, TS_BUY_TESTID, CBQ_BUY_TESTID, BANK_BUY_TESTID];
/** PRICING-CTA-UP-1 §2.4 - the bar's words for a Test Series owner: "Board Pass upgrade" / "Pay ₹1,083" (the card's own figure). */
export const HUB_PASS_UPGRADE_LABEL = "Board Pass upgrade";
export function hubPassUpgradeStickyCopy(payFigure: string): { label: string; button: string } {
  return { label: HUB_PASS_UPGRADE_LABEL, button: `Pay ${payFigure}` };
}

/** The card a hash names: `#test-series` -> Test Series, `#cbq` -> CBQ Packs, `#packs` -> Question Bank, anything else -> the Board Pass. */
export function cardForHash(hash: string): number {
  return hashCard(hash) ?? 0;
}

/** The card a hash NAMES (`#lt-premium-card` / `#test-series` / `#cbq` / `#packs`), or null for no hash or any other hash. Pure. */
export function hashCard(hash: string): number | null {
  const h = hash.toLowerCase();
  const i = HUB_CARD_ORDER.findIndex((k) => h === `#${HUB_CARD_ID[k]}`);
  return i >= 0 ? i : null;
}

/**
 * PRICING-HUB-2 H2 - the card the visitor last had selected on THIS history entry, kept in `history.state` under its own key (merged
 * with React Router's own fields, so no new entry is pushed and the URL does not change). Back / Forward / a bfcache or reload restore
 * of the entry brings the same card back; a fresh visit has no such key and opens on the Board Pass. Pure.
 */
export const HUB_CARD_STATE_KEY = "ltPricingCard";
export function savedCard(state: unknown): number | null {
  if (!state || typeof state !== "object") return null;
  const v = (state as Record<string, unknown>)[HUB_CARD_STATE_KEY];
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < HUB_CARD_ORDER.length ? v : null;
}
/** The card to open on: a hash that names a card wins, then the saved card of this history entry, then the Board Pass. Pure. */
export function initialCard(hash: string, state: unknown): number {
  return hashCard(hash) ?? savedCard(state) ?? 0;
}
function readHistoryState(): unknown {
  try {
    return typeof window !== "undefined" ? window.history.state : null;
  } catch {
    return null;
  }
}

/**
 * Which card a swipe has brought into place. Pure. At the track's end the last card is selected even when it cannot reach the left
 * edge (wide phones and tablets show more than one card); otherwise the card whose start is nearest the scroll position.
 */
export function nearestCard(scrollLeft: number, starts: readonly number[], maxScroll = Infinity): number {
  if (starts.length > 1 && maxScroll > 0 && scrollLeft >= maxScroll - 2) return starts.length - 1;
  let best = 0;
  let bestGap = Infinity;
  starts.forEach((start, i) => {
    const gap = Math.abs(start - scrollLeft);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

function prefersCalm(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The phone carousel: the selected card follows the swipe (scroll position), a tab tap scrolls the track to its card (horizontally only:
 * the page never moves vertically and is never trapped). From 1024 px the track is a grid and does not scroll, so nothing changes.
 */
function useCarousel(initial: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(initial);
  const starts = useCallback((): number[] => {
    const track = trackRef.current;
    if (!track) return [];
    // PRICING-4CARD-1: the track also holds the group labels (and the desktop divider); only the cards count.
    const cards = Array.from(track.children).filter((c) => (c as HTMLElement).dataset?.card) as HTMLElement[];
    const base = cards[0]?.offsetLeft ?? 0;
    return cards.map((c) => c.offsetLeft - base);
  }, []);
  /** A tapped tab owns the selection while the track travels to (or rests at) its card, even where the scroll clamps short of it. */
  const pinned = useRef<{ index: number; until: number } | null>(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const s = starts();
        if (!s.length) return;
        const max = track.scrollWidth - track.clientWidth;
        const pin = pinned.current;
        if (pin) {
          const target = Math.min(Math.max(s[pin.index] ?? 0, 0), max);
          if (Math.abs(track.scrollLeft - target) <= 2 || Date.now() < pin.until) return;
          pinned.current = null;
        }
        setIndex(nearestCard(track.scrollLeft, s, max));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [starts]);
  const goTo = (i: number, instant = false) => {
    setIndex(i);
    const track = trackRef.current;
    const s = starts();
    if (!track || s[i] === undefined || track.scrollWidth <= track.clientWidth) return;
    pinned.current = { index: i, until: Date.now() + 900 };
    if (typeof track.scrollTo === "function") track.scrollTo({ left: s[i], behavior: instant || prefersCalm() ? "auto" : "smooth" });
    else track.scrollLeft = s[i];
  };
  return { trackRef, index, goTo };
}

/** The subject the CBQ phone bar follows: the URL, else the same-site referrer, else the last-used subject, else Maths (as legacy). */
function useHubSubject(search: string): PackSubject {
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
    if (hint) setSubject(hint);
  }, []);
  return subject;
}

/** The Board Pass tab's price: the date decides it, so it is read after mount (the prerender capture removes this node). */
function PassTabPrice() {
  const [price, setPrice] = useState<string | null>(null);
  useEffect(() => setPrice(hubTabPrice("pass")), []);
  return <span className="lt-ph-tab__price">{price && <span data-testid="till-boards-figures">{price}</span>}</span>;
}

/** One pack Buy, exactly the legacy card's rules: owned -> the pill; packs dark -> the pop-up; else the shop's one-tap buy. */
function HubPackBuy({ api, sku, target, label, ariaLabel, testId, ownedLabel }: {
  api: PacksShopApi;
  sku: PackSku;
  target?: PackSubject;
  label: string;
  ariaLabel?: string;
  testId: string;
  ownedLabel: string;
}) {
  if (api.buyEnabled && api.ownsPack(sku, target)) {
    return (
      <span className="lt-ph-owned-pill" data-testid={`${testId}-owned`}>
        <span aria-hidden="true">&#10003;</span>
        {`${ownedLabel} · ${OWNED_LABEL}`}
      </span>
    );
  }
  const blocked = api.buyEnabled && api.blockedBy(sku, target);
  const onClick = () => {
    if (!api.buyEnabled) {
      if (sku === "pack_cbq" && target) api.openCbq(target);
      else api.openPack(sku);
      return;
    }
    api.buyNow(sku, target);
  };
  return (
    <>
      <button
        type="button"
        className="lt-ph-buy"
        onClick={onClick}
        disabled={blocked}
        aria-disabled={blocked}
        aria-label={ariaLabel}
        data-testid={testId}
        data-sku={sku}
        data-target={target ?? ""}
      >
        {label}
      </button>
      {blocked && (
        <p className="lt-ph-busy" role="status">
          {OTHER_PAYMENT_BUSY_COPY}
        </p>
      )}
    </>
  );
}

function Tiles({ tiles, testPrefix }: { tiles: ReadonlyArray<{ id: string; figure: string; label: string }>; testPrefix: string }) {
  return (
    <div className="lt-ph-tiles">
      {tiles.map((t) => (
        <div key={t.id} className="lt-ph-tile" data-testid={`${testPrefix}-${t.id}`}>
          <span className="lt-ph-tile__fig">{t.figure}</span>
          <span className="lt-ph-tile__lbl">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function Ticks({ items, label }: { items: ReadonlyArray<{ id: string; strong?: string; text: string; phoneOnly?: boolean }>; label: string }) {
  return (
    <ul className="lt-ph-ticks" aria-label={label}>
      {items.map((t) => (
        <li key={t.id} className={t.phoneOnly ? "lt-ph-phone-only" : undefined}>
          <span className="lt-ph-tick" aria-hidden="true">✓</span>
          <span>
            {t.strong && <strong>{t.strong}</strong>}
            {t.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * PRICING-HUB-1 (owner, 11 Nov 2026) - /pricing as three cards: Board Pass, CBQ Packs, Question Bank + Mocks. Every Pay / Buy is the
 * SAME central buy path as the legacy page (PassCheckout for the Board Pass with the legacy pay-tap event; the embedded PacksShop's
 * one-tap buy for the CBQ Packs and the Bundle); every account state the legacy page handles is handled here. Nothing here writes an
 * entitlement, starts a trial on mount, or prices anything: figures come from src/config/pricing, services/packs and packLabels.
 */
export default function PricingHub({ parts }: { parts: HubLegacyParts }) {
  const { TillBoardsOffer, PremiumPriceHead, CompareCellView } = parts;
  const navigate = useNavigate();
  const location = useLocation();
  const paymentsOn = isPaymentsClientEnabled();
  const checkoutWho = isCheckoutWhoCopyOn();
  const [searchParams] = useSearchParams();
  // BACKNAV-1 / FREECHECK-2 · F3 - exactly the legacy rules: `source` is matched against an allowlist; `redirect` only goes back to /login.
  const returnTarget = parts.returnTargets[(searchParams.get("source") || "").trim().toLowerCase()] ?? null;
  const carriedRedirect = safeSigninRedirect(searchParams.get("redirect"));
  const backTo = returnTarget?.backTo === "/login" ? withSigninRedirect("/login", carriedRedirect) : returnTarget?.backTo ?? "/";
  const toLogin = (path: string) => {
    if (carriedRedirect) markFreeCheckSigninIntent();
    navigate(path);
  };
  const fromParents = searchParams.get("from") === "for_parents";
  const withFrom = (path: string) => (fromParents ? `${path}${path.includes("?") ? "&" : "?"}from=for_parents` : path);
  const [waitlistContact, setWaitlistContact] = useState("");
  const [waitlistBoard, setWaitlistBoard] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const subject = useHubSubject(location.search);
  useHashLanding();
  // H2: a card restored from this history entry (Back / Forward / bfcache / reload), when no hash names one.
  const [restoredCard] = useState(() => (hashCard(location.hash) === null ? savedCard(readHistoryState()) : null));
  const { trackRef, index, goTo } = useCarousel(initialCard(location.hash, readHistoryState()));
  // Remember the selected card on this history entry (replaceState, merged: no new entry, no URL change).
  useEffect(() => {
    try {
      const st = window.history.state;
      if ((savedCard(st) ?? 0) === index) return;
      window.history.replaceState({ ...(st && typeof st === "object" ? st : {}), [HUB_CARD_STATE_KEY]: index }, "");
    } catch {
      /* history unavailable: nothing to remember */
    }
  }, [index]);
  // H3 (+ review F1/F2) - once a pack payment made on this page is VERIFIED (the shop's own status line reads PACK_PAID_COPY, which
  // it shows only for a server-verified payment), the legacy page's inline My packs block (the shop's own, with its downloads) shows
  // and comes into view, as on the legacy page. While a payment is checking / confirming, or after it expired, nothing changes: the
  // shop keeps its own "Open My packs ->" status link (hideMyPacks) and each card's quiet owned state.
  const [boughtHere, setBoughtHere] = useState(false);
  useEffect(() => {
    if (boughtHere || typeof MutationObserver === "undefined") return undefined;
    const wrap = document.querySelector('[data-testid="pricing-hub"] .lt-packs--embedded');
    if (!wrap) return undefined;
    const check = () => {
      const status = wrap.querySelector('[data-testid="packs-status"]');
      if (status && (status.textContent ?? "").startsWith(PACK_PAID_COPY)) setBoughtHere(true);
    };
    check();
    const mo = new MutationObserver(check);
    mo.observe(wrap, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [boughtHere]);
  useEffect(() => {
    if (!boughtHere || typeof MutationObserver === "undefined") return undefined;
    let done = false;
    const go = () => {
      const mine = document.getElementById("my-packs");
      if (done || !mine) return;
      done = true;
      mine.scrollIntoView?.({ behavior: prefersCalm() ? "auto" : "smooth", block: "start" });
    };
    go();
    const mo = new MutationObserver(go);
    mo.observe(document.body, { childList: true, subtree: true });
    const stop = window.setTimeout(() => mo.disconnect(), 15000);
    return () => {
      mo.disconnect();
      window.clearTimeout(stop);
    };
  }, [boughtHere]);

  // Restoring: put the track on that card at once, then (after the browser's own scroll restore) bring it into view if it is not.
  useEffect(() => {
    if (restoredCard === null || restoredCard === 0) return undefined;
    goTo(restoredCard, true);
    const t = window.setTimeout(() => {
      const card = document.getElementById(HUB_CARD_ID[HUB_CARD_ORDER[restoredCard]]);
      const r = card?.getBoundingClientRect();
      if (card && r && (r.bottom < 80 || r.top > window.innerHeight - 80)) card.scrollIntoView?.({ block: "start" });
    }, 350);
    return () => window.clearTimeout(t);
    // Once, on mount: the restored card is fixed for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selected: HubCardKey = HUB_CARD_ORDER[index] ?? "pass";

  // `#pricing-video` (old links): the video now sits in a folded row - open it and bring it into view.
  const videoFoldRef = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    if (location.hash.toLowerCase() !== "#pricing-video") return;
    const fold = videoFoldRef.current;
    if (!fold) return;
    fold.open = true;
    document.getElementById("pricing-video")?.scrollIntoView?.({ block: "start" });
  }, [location.hash]);

  // TRIAL-CTA-1 - the legacy page's state-aware trial action, rule for rule (never on mount; one explicit tap; hydrated + eligible).
  const { user, loading: authLoading } = useAuth();
  const subscription = useSubscription();
  const nowMs = Date.now();
  const monthBuyer = useMonthPassAvailable();
  const foundingRate = foundingRateApplies(nowMs, subscription.status.foundingMember);
  const [trialStartedHere, setTrialStartedHere] = useState(false);
  const trialStartFired = useRef(false);
  const trialEligible = subscription.hydrated && subscription.status.tier !== "premium" && !subscription.status.trialStartDate;
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
  let trialAction: ReactNode;
  if (!user || (!subscription.hydrated && !trialStartedHere)) trialAction = startTrialButton;
  else if (trialStartedHere) {
    const endsOn = parts.trialEndsOn(subscription.status.trialStartDate);
    trialAction = trialState(endsOn ? `Your 7-day trial has started. It ends on ${endsOn}.` : "Your 7-day trial has started.", true);
  } else if (subscription.status.tier === "premium") trialAction = null;
  else if (subscription.isTrialActive) {
    const n = subscription.daysLeftInTrial;
    trialAction = trialState(`Your trial is active — ${n} ${n === 1 ? "day" : "days"} left.`, true);
  } else if (trialEligible) trialAction = startTrialButton;
  else trialAction = trialState("You've used your free trial.", false);

  const handleWaitlistSubmit = () => {
    if (!waitlistContact.trim()) return;
    parts.saveWaitlistEntry({ contact: waitlistContact.trim(), board: waitlistBoard || "not specified", ts: new Date().toISOString() });
    setWaitlistSubmitted(true);
    setWaitlistContact("");
    setWaitlistBoard("");
  };

  const showFreeCheck = !authLoading && !user && isFreeCheckClientEnabled();
  const sections = compareSections({ freeCheck: showFreeCheck });
  const showParentActions =
    Boolean(user) && subscription.hydrated && subscription.status.tier !== "premium" && paymentsOn && isParentPayClientEnabled();
  const payForChild = paymentsOn && (checkoutWho || isParentPayClientEnabled()) ? payForChildAnswer(checkoutWho) : null;
  const boardPassPrice = boardPassPriceDisplay(nowMs);
  // PARENT-PACKS-1 - a running Board Pass (till boards): no price, no pay line, "You have it". Signed out (the prerender) false.
  const passEndMs = subscription.status.passEnd ? Date.parse(subscription.status.passEnd) : NaN;
  const boardPassOwner =
    Boolean(user) &&
    subscription.hydrated &&
    subscription.status.tier === "premium" &&
    subscription.status.plan === "pass_till_boards" &&
    Number.isFinite(passEndMs) &&
    passEndMs > nowMs;
  const runningPassHidesMonth =
    boardPassOwner ||
    (Boolean(user) &&
      subscription.hydrated &&
      subscription.status.tier === "premium" &&
      Number.isFinite(passEndMs) &&
      passEndMs > nowMs &&
      passEndMs - nowMs > 7 * 86_400_000);

  // PRICING-CTA-UP-1 (owner, 24 Nov 2026) - each card reads tag · name · its hero line · price · Buy area, THEN its features, "what's
  // inside" and the details link; the Buy area is no longer pinned to the card's foot. The SAME elements, test ids, handlers and Buy-area
  // order - only their place in the card moves. Kill switch: VITE_PRICING_CTA_UP_DISABLED=1 (build-time; set in Vercel and redeploy)
  // restores today's layout exactly (the Buy area at the bottom, the details link inside it).
  const ctaUp = import.meta.env.VITE_PRICING_CTA_UP_DISABLED !== "1";
  /** One card's inside, in the order the switch says. `buy` is the card's Buy area (its `.lt-ph-foot` contents minus the details link). */
  const cardInside = (head: ReactNode, body: ReactNode, buy: ReactNode, details: ReactNode): ReactNode =>
    ctaUp ? (
      <>
        {head}
        <div className="lt-ph-foot">{buy}</div>
        {body}
        {details}
      </>
    ) : (
      <>
        {head}
        {body}
        <div className="lt-ph-foot">
          {buy}
          {details}
        </div>
      </>
    );

  // PRICING-CTA-UP-1 §2.4 - the bar's Board Pass words follow the card's own Pay button. A MutationObserver re-reads that button (and
  // whether the card shows the Test Series upgrade line) whenever it changes, so the bar's copy changes the moment the server's
  // upgrade figure arrives (the key goes into copyKey) - no extra request; PassCheckout is untouched.
  const hubRef = useRef<HTMLElement | null>(null);
  const [passPayKey, setPassPayKey] = useState("");
  useEffect(() => {
    const root = hubRef.current;
    if (!root || typeof MutationObserver === "undefined") return undefined;
    const read = () => {
      const pay = root.querySelector(`[data-testid="${PASS_PAY_TESTID}"] .lt-pricing-pay--boards`)?.textContent ?? "";
      const upgrade = root.querySelector(`[data-testid="${PASS_PAY_TESTID}"] [data-testid="${TS_UPGRADE_LINE_TESTID}"]`) ? "u" : "";
      setPassPayKey(`${pay}|${upgrade}`);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, []);
  // PRICING-CTA-UP-1 - on phones the cards are a carousel: only the SELECTED card is on screen, but SalesStickyBar measures its watched
  // Buy rows vertically only, so the other cards' Buy rows (now high in their cards, off to the side) would hide the bar on the first
  // screen. Below 768 px the bar watches the selected card's own Pay / Buy (re-keyed when the card changes); from 768 px every card is
  // on screen and it watches all four, as today. Kill switch on: all four, exactly as today.
  const [phoneTrack, setPhoneTrack] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhoneTrack(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  const barWatch: readonly string[] = ctaUp && phoneTrack ? [CARD_BUY_TESTID[selected]] : ALL_BUY_TESTIDS;
  /** The last ₹ figure the card's Pay button named: kept while the button reads "Opening…", so the bar never falls back to the list total. */
  const lastPassPay = useRef<string | null>(null);

  // The phone bar reads the CURRENT card and shop through refs (its scroll handler keeps the reader it mounted with).
  const selectedRef = useRef<HubCardKey>(selected);
  selectedRef.current = selected;
  const apiRef = useRef<PacksShopApi | null>(null);
  const premium = subscription.status.tier === "premium";
  const premiumRef = useRef(premium);
  premiumRef.current = premium;
  const subjectRef = useRef(subject);
  subjectRef.current = subject;

  /** The bar's Board Pass "Pay": the hero Pay button itself (PassCheckout + its tap event), as the legacy bar does. */
  const payFromBar = () => {
    const card = document.getElementById(HUB_CARD_ID.pass);
    const pay = document.querySelector<HTMLButtonElement>(`[data-testid="${PASS_PAY_TESTID}"] .lt-pricing-pay--boards`);
    goTo(0);
    card?.scrollIntoView?.({ behavior: prefersCalm() ? "auto" : "smooth", block: "start" });
    if (pay && !pay.disabled) pay.click();
  };
  /** Which bar shows: the selected pack card's own Buy while it can be bought, else the Board Pass (hidden for a paid account). */
  const barMode = (): HubCardKey | null => {
    const api = apiRef.current;
    const card = selectedRef.current;
    const packOpen = (sku: PackSku, target?: PackSubject) => api !== null && !(api.buyEnabled && (api.ownsPack(sku, target) || api.blockedBy(sku, target)));
    if (card === "ts" && !premiumRef.current && !(api?.buyEnabled && api.ownsPack("test_series"))) return "ts";
    if (card === "cbq" && packOpen("pack_cbq", subjectRef.current)) return "cbq";
    if (card === "bank" && packOpen("pack_bundle")) return "bank";
    return premiumRef.current ? null : "pass";
  };
  const barCopy = (): { label: string; button: string } | null => {
    const mode = barMode();
    if (mode === "ts") return hubTsStickyCopy();
    if (mode === "cbq") return stickyCbqCopy(subjectRef.current);
    if (mode === "bank") return hubBundleStickyCopy(BUNDLE_NAME);
    if (mode === "pass") {
      const hero = document.querySelector(`[data-testid="${PASS_PAY_TESTID}"] .lt-pricing-pay--boards`)?.textContent ?? "";
      const seen = /₹[\d,]+/.exec(hero)?.[0];
      if (seen) lastPassPay.current = seen;
      const amount = seen ?? lastPassPay.current;
      // A Test Series owner's card shows the server's upgrade line and its Pay names the upgrade total: the bar says the same.
      const upgrade = document.querySelector(`[data-testid="${PASS_PAY_TESTID}"] [data-testid="${TS_UPGRADE_LINE_TESTID}"]`) !== null;
      if (upgrade && amount) return hubPassUpgradeStickyCopy(amount);
      return stickyPassCopy(boardPassPriceDisplay(), amount ?? boardPassPayDisplay());
    }
    return null;
  };
  const barGo = () => {
    const mode = barMode();
    const api = apiRef.current;
    if (mode === "ts") {
      trackNamedEvent("pricing_ts_buy_tap");
      // TS-UX-PAGE-1: in place (the checkout opens here, no pack pop-up), as the card's own Buy; the link only while packs are dark.
      if (api && api.buyEnabled && isTestSeriesPackOffered() && !fromParents) api.buyNow("test_series", undefined, { inPlace: true });
      else navigate(withFrom(hubTsBuyPath()));
    } else if (mode === "cbq" && api) {
      if (api.buyEnabled) api.buyNow("pack_cbq", subjectRef.current);
      else api.openCbq(subjectRef.current);
    } else if (mode === "bank" && api) {
      if (api.buyEnabled) api.buyNow("pack_bundle");
      else api.openPack("pack_bundle");
    } else payFromBar();
  };

  const passCard = (
    <div className="lt-ph-card lt-ph-card--pass" id={HUB_CARD_ID.pass} data-testid="hub-card-pass" data-card="pass">
      {cardInside(
        <>
          <div className="lt-ph-card__top">
            <p className="lt-ph-tag">{HUB_PASS_TAG}</p>
            <span className="lt-ph-chip">{START_HERE_BADGE}</span>
          </div>
          <h2 className="lt-ph-name">{BOARD_PASS_NAME}</h2>
          <div className="lt-ph-minute" data-testid="hub-pass-minute">
            <span className="lt-ph-minute__fig" aria-hidden="true">
              <span className="lt-ph-minute__num">{HUB_PASS_MINUTE_FIGURE}</span>
              <span className="lt-ph-minute__unit">{HUB_PASS_MINUTE_UNIT}</span>
            </span>
            <p className="lt-ph-minute__text">
              <span className="lt-pricing-sr">{`${HUB_PASS_MINUTE_FIGURE} ${HUB_PASS_MINUTE_UNIT.toLowerCase()}: `}</span>
              <strong className="lt-ph-minute__strong">{HUB_PASS_MINUTE_STRONG}</strong>
              <span>{HUB_PASS_MINUTE_LINE}</span>
            </p>
          </div>
        </>,
        <>
          <Tiles tiles={HUB_PASS_TILES} testPrefix="hub-pass-tile" />
          <p className="lt-ph-tutor" data-testid="hub-pass-tutor">
            <strong>{HUB_PASS_TUTOR_STRONG}</strong> {HUB_PASS_TUTOR_BODY}
          </p>
          <Ticks items={HUB_PASS_TICKS} label={`What the ${BOARD_PASS_NAME} gives`} />
        </>,
        <>
          {boardPassOwner ? (
            <p className="lt-ph-owned" data-testid="hub-pass-owned">
              {HUB_PASS_OWNED}
              <Link to={PRACTICE_PATH} data-testid="hub-pass-owned-go">{HUB_PASS_OWNED_GO}</Link>
            </p>
          ) : (
            <TillBoardsOffer />
          )}
          {/* PAYWALL-PAY-1 - a tap on Pay is the "pay" paywall action (capture phase; PassCheckout is untouched). */}
          <div className="lt-pricing-passes" data-testid={PASS_PAY_TESTID} onClickCapture={trackPricingPayTap}>
            {monthBuyer && !runningPassHidesMonth && (
              <div className="lt-pricing-month">
                <span className="lt-pricing-month__name">Month pass</span>
                <PremiumPriceHead offerOpen={foundingRate} />
                <span className="lt-pricing-period">{TUITION_ANCHOR}</span>
                {foundingRate && <p className="lt-pricing-founding-note">{FOUNDING_LOCK_COPY}</p>}
              </div>
            )}
            {paymentsOn ? <PassCheckout /> : <p className="lt-pricing-manual" data-testid="pricing-manual">{parts.manualPaymentsOff}</p>}
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
          {trialAction && <div className="lt-ph-trial lt-pricing-trial-slot">{trialAction}</div>}
        </>,
        <Link className="lt-ph-details" to={withFrom(BOARD_PASS_PAGE_PATH)} data-testid="hub-pass-details">
          {HUB_PASS_DETAILS}
        </Link>,
      )}
    </div>
  );

  /** The Board Pass card brought into view (the Test Series card's "Want the tutor and Answer Checker too?" line). */
  const showPassCard = () => {
    goTo(0);
    document.getElementById(HUB_CARD_ID.pass)?.scrollIntoView?.({ behavior: prefersCalm() ? "auto" : "smooth", block: "start" });
  };
  const series = seriesTotals();
  const tsHead = hubTsHeadline(series);
  /** TS-UX-PAGE-1: "Get the Test Series · ₹1,179" - the total CHARGED (packPayLabel), written after mount like every clock figure. */
  const tsBuyLabel = (
    <span>
      {HUB_TS_BUY} · <TsClockSlot variant="amt">{packPayLabel("test_series")}</TsClockSlot>
    </span>
  );
  const tsCard = (api: PacksShopApi) => {
    // TS-PACK-1: a Test Series Pack owner (the shop's own /api/packs/mine read) is not sold it again.
    const ownsSeries = api.buyEnabled && api.ownsPack("test_series");
    // Review (18 Nov): a paid pass already includes every test (seriesAccess: paid premium checks series papers; a trial does not).
    const seriesIncluded = Boolean(user) && subscription.hydrated && isPaidPremium(subscription.status);
    return (
    <div className="lt-ph-card lt-ph-card--ts" id={HUB_CARD_ID.ts} data-testid="hub-card-ts" data-card="ts">
      {cardInside(
        <>
          <div className="lt-ph-card__top">
            <p className="lt-ph-tag">{HUB_TS_TAG}</p>
            <span className="lt-ph-chip lt-ph-chip--new">{HUB_TS_NEW}</span>
          </div>
          <h2 className="lt-ph-name">{TEST_SERIES_CARD_NAME}</h2>
          <p className="lt-ph-hero lt-ph-ts-head" data-testid="hub-ts-headline">
            <strong>{tsHead.chapter}</strong> + <strong>{tsHead.full}</strong>
            {tsHead.rest}
          </p>
          <TestSeriesPerTest testId="hub-ts-per-test" />
        </>,
        <>
          <TestSeriesExaminerLine testId="hub-ts-examiner" />
          <Ticks items={HUB_TS_TICKS} label={`What the ${TEST_SERIES_CARD_NAME} gives`} />
          <p className="lt-ph-upsell" data-testid="hub-ts-upsell">
            <span>{HUB_TS_UPSELL_Q}</span>{" "}
            <button type="button" className="lt-ph-upsell__go" onClick={showPassCard} data-testid="hub-ts-upsell-go">
              {HUB_TS_UPSELL_GO}
            </button>
          </p>
          {/* Tablet / desktop only (CSS): fills the band beside the taller Board Pass card. Counts from the series config. */}
          <div className="lt-ph-extra" data-testid="hub-ts-inside">
            <h3 className="lt-ph-extra__title">{HUB_TS_INSIDE_TITLE}</h3>
            {hubTsInsideRows(series).map((r) => (
              <p key={r.id} className="lt-ph-tsrow" data-testid={`hub-ts-inside-${r.id}`}>
                <span className="lt-ph-tsrow__name">{r.name}</span>
                <span className="lt-ph-tsrow__line">{r.line}</span>
              </p>
            ))}
            <p className="lt-ph-extra__line">{HUB_TS_TRY_LINE}</p>
          </div>
        </>,
        ownsSeries ? (
          <>
            <span className="lt-ph-owned-pill" data-testid="hub-ts-owned">
              <span aria-hidden="true">&#10003;</span>
              {HUB_TS_OWNED}
            </span>
            <Link className="lt-ph-buy lt-ph-buy--link" to={HUB_TS_DETAILS_PATH} data-testid="hub-ts-open">
              {HUB_TS_PASS_GO}
            </Link>
          </>
        ) : seriesIncluded ? (
          <>
            <p className="lt-ph-sep" data-testid="hub-ts-included">{HUB_TS_PASS_INCLUDED}</p>
            <Link className="lt-ph-buy lt-ph-buy--link" to={HUB_TS_DETAILS_PATH} data-testid="hub-ts-open">
              {HUB_TS_PASS_GO}
            </Link>
          </>
        ) : (
          <>
            <p className="lt-ph-price">
              <span className="lt-ph-price__amt" data-testid="hub-ts-price">
                <TsClockSlot variant="tag">{hubTsPrice()}</TsClockSlot>
              </span>
              <TestSeriesFoundingClause className="lt-ph-price__meta" testId="hub-ts-founding" />
              <span className="lt-ph-price__meta">{HUB_TS_PRICE_META}</span>
            </p>
            {/* TS-UX-PAGE-1: the card's own Buy, with the total on it. In place (the shop's checkout opens HERE, no pack pop-up behind it)
                while packs are on and the series is offered (a parent's ?from=for_parents visit keeps the /packs link, as before); otherwise the same link, still showing the total. */}
            <p className="lt-ph-note" data-testid="hub-ts-checks">{HUB_TS_CHECKS_LINE}</p>
            <div data-testid={TS_BUY_TESTID}>
              {api.buyEnabled && api.buyButton && isTestSeriesPackOffered() && !fromParents ? (
                api.buyButton("test_series", {
                  label: tsBuyLabel,
                  className: "lt-ph-buy",
                  noteClass: "lt-ph-note",
                  testId: "hub-buy-test_series",
                  onTap: () => trackNamedEvent("pricing_ts_buy_tap"),
                })
              ) : (
                <Link
                  className="lt-ph-buy lt-ph-buy--link"
                  to={withFrom(hubTsBuyPath())}
                  onClick={() => trackNamedEvent("pricing_ts_buy_tap")}
                  data-testid="hub-buy-test_series"
                >
                  {tsBuyLabel}
                </Link>
              )}
            </div>
          </>
        ),
        <Link className="lt-ph-details" to={withFrom(HUB_TS_DETAILS_PATH)} data-testid="hub-ts-details">
          {hubTsDetails(series)}
        </Link>,
      )}
    </div>
    );
  };

  const cbqCard = (api: PacksShopApi) => {
    const ownsAny = api.buyEnabled && SUBJECTS.some((s) => api.ownsPack("pack_cbq", s));
    return (
      <div className="lt-ph-card lt-ph-card--cbq" id={HUB_CARD_ID.cbq} data-testid="hub-card-cbq" data-card="cbq">
        {cardInside(
          <>
            <ParentReturnLink testId="parent-return-cbq" />
            <div className="lt-ph-card__top">
              <p className="lt-ph-tag">{HUB_CBQ_TAG}</p>
            </div>
            <h2 className="lt-ph-name">{CBQ_PACKS_NAME}</h2>
            <p className="lt-ph-hero">{HUB_CBQ_HERO}</p>
          </>,
          <>
            <Tiles tiles={HUB_CBQ_TILES} testPrefix="hub-cbq-tile" />
            <Ticks items={HUB_CBQ_TICKS.map((text, i) => ({ id: String(i), text }))} label={`What the ${CBQ_PACKS_NAME} give`} />
            {/* Desktop only (CSS): fills the band beside the taller Board Pass card; on phones it would push Buy down. */}
            <div className="lt-ph-extra" data-testid="hub-cbq-inside">
              <h3 className="lt-ph-extra__title">{HUB_CBQ_INSIDE_TITLE}</h3>
              <ul className="lt-ph-chips" aria-label="Question types">
                {HUB_CBQ_INSIDE_CHIPS.map((c) => (
                  <li key={c} className="lt-ph-chip2">{c}</li>
                ))}
              </ul>
              {HUB_CBQ_INSIDE_LINES.map((l) => (
                <p key={l} className="lt-ph-extra__line">{l}</p>
              ))}
            </div>
          </>,
          <>
            <p className="lt-ph-price">
              <span className="lt-ph-price__amt" data-testid="hub-cbq-price">{hubCbqPrice()}</span>
              <span className="lt-ph-price__meta">{HUB_CBQ_PRICE_META}</span>
            </p>
            <div className="lt-ph-pair" data-testid={CBQ_BUY_TESTID}>
              {SUBJECTS.map((s) => (
                <div key={s} className="lt-ph-pair__one">
                  <HubPackBuy
                    api={api}
                    sku="pack_cbq"
                    target={s}
                    label={hubCbqBuyLabel(s)}
                    ariaLabel={hubCbqBuyAria(s)}
                    testId={`hub-buy-pack_cbq-${s}`}
                    ownedLabel={`${subjectLabel(s)} CBQ`}
                  />
                </div>
              ))}
            </div>
            {/* PARENT-PACKS-1: per subject, a link that carries THAT subject's CBQ Pack only (signed in; nothing otherwise). H6: one quiet
                row under the Buys - two side by side (Maths left, Science right, under their Buys), or one centred when one is owned. */}
            <div className="lt-ph-share lt-ph-share--pair" data-testid="hub-cbq-share">
              {SUBJECTS.map((s) => api.parentAsk("pack_cbq", s, { noQr: true }))}
            </div>
            <p className="lt-ph-sep" data-testid="hub-cbq-not-in-bundle">{HUB_CBQ_NOT_IN_BUNDLE}</p>
            {ownsAny && (
              <Link className="lt-ph-mypacks" to={MY_PACKS_PATH} data-testid="hub-cbq-my-packs">
                {HUB_OPEN_MY_PACKS}
              </Link>
            )}
          </>,
          <Link className="lt-ph-details" to={withFrom(CBQ_PACKS_PAGE_PATH)} data-testid="hub-cbq-details">
            {HUB_CBQ_DETAILS}
          </Link>,
        )}
      </div>
    );
  };

  const bankCard = (api: PacksShopApi) => {
    const ownsBundle = api.buyEnabled && api.ownsPack("pack_bundle");
    return (
      <div className="lt-ph-card lt-ph-card--bank" id={HUB_CARD_ID.bank} data-testid="hub-card-bank" data-card="bank">
        {cardInside(
          <>
            <ParentReturnLink testId="parent-return-packs" />
            <div className="lt-ph-card__top">
              <p className="lt-ph-tag" data-testid="hub-bank-tag">{hubBankTag()}</p>
            </div>
            <h2 className="lt-ph-name">{QUESTION_BANK_NAME}</h2>
            <p className="lt-ph-hero">{HUB_BANK_HERO}</p>
          </>,
          <>
            <Tiles tiles={HUB_BANK_TILES} testPrefix="hub-bank-tile" />
            <p className="lt-ph-claim" data-testid="hub-bank-claim">
              <strong>{HUB_BANK_CLAIM_FIGURE}</strong>
              {HUB_BANK_CLAIM_REST}
            </p>
            <Ticks items={hubBankTicks().map((text, i) => ({ id: String(i), text, phoneOnly: i === 2 }))} label={`What ${QUESTION_BANK_NAME} gives`} />
            {/* Desktop only (CSS): the smaller packs as links to their /packs pop-ups (never a buy path here). */}
            <div className="lt-ph-extra" data-testid="hub-bank-rows">
              <h3 className="lt-ph-extra__title">{HUB_BANK_ROWS_TITLE}</h3>
              {hubBankRows(subject).map((r) => (
                <Link key={r.id} className="lt-ph-row" to={withFrom(r.to)} data-testid={`hub-bank-row-${r.id}`}>
                  <span className="lt-ph-row__top">
                    <span className="lt-ph-row__name">{r.name}</span>
                    <span className="lt-ph-row__price">{r.price}</span>
                  </span>
                  <span className="lt-ph-row__line">{r.line} &rarr;</span>
                </Link>
              ))}
            </div>
          </>,
          <>
            <p className="lt-ph-price">
              <span className="lt-ph-price__amt" data-testid="hub-bank-price">{hubBankPrice()}</span>
              <span className="lt-ph-price__meta">{HUB_BANK_PRICE_META}</span>
            </p>
            <div data-testid={BANK_BUY_TESTID}>
              <HubPackBuy api={api} sku="pack_bundle" label={BUNDLE_BUY_LABEL} testId="hub-buy-pack_bundle" ownedLabel="Bundle" />
            </div>
            {/* PARENT-PACKS-1: "Forward link to parents" + QR for the Bundle (signed in; nothing otherwise). H6: one quiet row. */}
            <div className="lt-ph-share" data-testid="hub-bank-share">
              {api.parentAsk("pack_bundle")}
            </div>
            <p className="lt-ph-sep" data-testid="hub-bank-separate">{HUB_BANK_SEPARATE}</p>
            {ownsBundle && (
              <Link className="lt-ph-mypacks" to={MY_PACKS_PATH} data-testid="hub-bank-my-packs">
                {HUB_OPEN_MY_PACKS}
              </Link>
            )}
          </>,
          <Link className="lt-ph-details" to={withFrom(QUESTION_BANK_PAGE_PATH)} data-testid="hub-bank-details">
            {hubBankDetails()}
          </Link>,
        )}
      </div>
    );
  };

  return (
    <main ref={hubRef} className="lt-pricing-page lt-ph" aria-label="LazyTopper pricing" data-testid="pricing-hub">
      <RestoredPurchaseCard />
      <style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />
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
            <p className="lt-ph-eyebrow">{HUB_EYEBROW}</p>
            <h1 className="lt-pricing-title">{PRICING_H1}</h1>
            <p className="lt-pp-cred" data-testid="founder-badge">{FOUNDER_BADGE_TEXT}</p>
          </div>
        </div>

        <div className="lt-ph-body">
          <BoardsCountdownStrip />
          <PacksShop embedded hideMyPacks={!boughtHere} returnPath="/pricing">
            {(shopApi) => {
              const api = shopApi;
              apiRef.current = api;
              return (
                <>
                  <div className="lt-ph-tabs" role="group" aria-label={HUB_TABS_LABEL} data-testid="hub-tabs">
                    {/* PRICING-4CARD-1: the online pair, then the paper pair - each pair under its own small label. */}
                    {HUB_GROUPS.map((g) => (
                      <span key={g.key} className={`lt-ph-tabgroup lt-ph-tabgroup--${g.key}`} aria-hidden="true" data-testid={`hub-tabgroup-${g.key}`}>
                        {g.label}
                      </span>
                    ))}
                    {HUB_CARD_ORDER.map((key, i) => (
                      <button
                        key={key}
                        type="button"
                        className={`lt-ph-tab lt-ph-tab--${key}`}
                        aria-pressed={index === i}
                        aria-controls={HUB_CARD_ID[key]}
                        onClick={() => goTo(i)}
                        data-testid={`hub-tab-${key}`}
                      >
                        <span className="lt-ph-tab__name">{HUB_TAB_NAME[key]}</span>
                        {key === "pass" ? <PassTabPrice /> : <span className="lt-ph-tab__price">{key === "ts" ? <TsClockSlot variant="amt">{hubTabPrice(key)}</TsClockSlot> : hubTabPrice(key)}</span>}
                      </button>
                    ))}
                  </div>
                  <p className="lt-ph-caption">{HUB_TABS_CAPTION}</p>

                  <div className={ctaUp ? "lt-ph-cards lt-ph-cards--up" : "lt-ph-cards"} ref={trackRef} data-testid="hub-cards" data-cta-up={ctaUp ? "1" : undefined}>
                    {/* Group labels + the desktop divider: grid items placed by CSS (hidden on phones, where the tabs carry the groups). */}
                    {HUB_GROUPS.map((g) => (
                      <p key={g.key} className={`lt-ph-group lt-ph-group--${g.key}`} data-testid={`hub-group-${g.key}`}>
                        {g.label}
                      </p>
                    ))}
                    <span className="lt-ph-divider" aria-hidden="true" />
                    {passCard}
                    {tsCard(api)}
                    {cbqCard(api)}
                    {bankCard(api)}
                  </div>
                  <div className="lt-ph-pager" aria-hidden="true" data-testid="hub-pager">
                    <span className="lt-ph-dots">
                      {HUB_CARD_ORDER.map((key, i) => (
                        <span key={key} className={`lt-ph-dot lt-ph-dot--${key}${index === i ? " is-on" : ""}`} />
                      ))}
                    </span>
                    <p className="lt-ph-pos" data-testid="hub-position">
                      {hubPositionLine(index)} &rarr;
                    </p>
                  </div>

                  <div className="lt-ph-folds">
                    <details className="lt-ph-fold" data-testid="hub-fold-compare">
                      <summary>
                        <h2 className="lt-ph-fold__title">{HUB_FOLD_COMPARE}</h2>
                      </summary>
                      <div className="lt-ph-fold__body">
                        <WhatYouGet
                          boardPassPrice={boardPassOwner ? BOARD_PASS_OWNED_CELL : boardPassPrice}
                          testSeries={{ price: hubTsPrice(), inside: `${series.chapterTests} chapter tests + ${series.fullMocks} full-length papers` }}
                        >
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
                                  {sections.map((section) => (
                                    <tbody key={section.title}>
                                      <tr className="lt-pricing-compare-section">
                                        <th scope="rowgroup" colSpan={3}>{section.title}</th>
                                      </tr>
                                      {section.rows.map((row) => (
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
                              <p className="lt-pricing-fine-print">{paymentsOn ? parts.finePrintPaymentsOn : parts.finePrintPaymentsOff}</p>
                            </div>
                          </details>
                        </WhatYouGet>
                      </div>
                    </details>

                    <details className="lt-ph-fold" data-testid="hub-fold-video" ref={videoFoldRef}>
                      <summary>
                        <h2 className="lt-ph-fold__title">{HUB_FOLD_VIDEO}</h2>
                      </summary>
                      <div className="lt-ph-fold__body lt-pp-proof" data-testid="pricing-proof-hub">
                        <PricingProof />
                      </div>
                    </details>

                    <details className="lt-ph-fold" data-testid="pricing-faq">
                      <summary>
                        <h2 className="lt-ph-fold__title">{FAQ_TITLE}</h2>
                      </summary>
                      <div className="lt-ph-fold__body lt-pricing-faq">
                        <div className="lt-pricing-faq-list">
                          {[FAQ_WHY_BOTH, FAQ_SUBSCRIPTION, ...(payForChild ? [{ q: FAQ_PAY_FOR_CHILD_Q, a: payForChild }] : [])].map((item) => (
                            <div key={item.q} className="lt-pricing-faq-item">
                              <p className="lt-pricing-faq-q">{item.q}</p>
                              <p className="lt-pricing-faq-a">{item.a}</p>
                            </div>
                          ))}
                          <details className="lt-pp-more" data-testid="pricing-faq-more">
                            <summary>{FAQ_MORE_SUMMARY}</summary>
                            <div className="lt-pricing-faq-list">
                              {parts.faqItemsFor(paymentsOn).map((item) => (
                                <details key={item.q} className="lt-pricing-faq-item">
                                  <summary className="lt-pricing-faq-q">{item.q}</summary>
                                  <p className="lt-pricing-faq-a">{item.a}</p>
                                </details>
                              ))}
                            </div>
                            <p className="lt-pricing-mark-guide">Wondering how answers are marked? <Link to="/check-your-answer">See how CBSE examiners mark Class 10 answers</Link>, with worked examples from past board papers.</p>
                          </details>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="lt-pp-basicline" data-testid="pricing-basic-line">
                    <span>
                      <strong>{BASIC_LINE_STRONG}</strong>
                      {basicLineRest()}
                    </span>
                    {!user && (
                      <button type="button" className="lt-pp-startfree" onClick={() => toLogin(withSigninRedirect("/login", carriedRedirect))}>
                        {START_FREE_LABEL}
                      </button>
                    )}
                  </div>

                  <details className="lt-pricing-otherboards" data-testid="pricing-otherboards">
                    <summary className="lt-pricing-otherboards-summary">Other boards? Join the waitlist</summary>
                    <section className="lt-pricing-coming" aria-label="Boards and classes coming soon">
                      <h2 className="lt-pricing-coming-title">Coming Soon</h2>
                      <p className="lt-pricing-coming-lede">We're expanding to more boards and classes. Join the waitlist to get early access.</p>
                      <div className="lt-pricing-coming-chips">
                        {parts.boardsComing.map((b) => (
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
                              onChange={(e) => setWaitlistContact(e.target.value)}
                              placeholder="Email or phone number"
                              aria-label="Email or phone number"
                            />
                            <select className="lt-pricing-waitlist-select" value={waitlistBoard} onChange={(e) => setWaitlistBoard(e.target.value)} aria-label="Board">
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

                  {/* The phone bar (StickyPassBar's rules via the sales pages' bar): hidden while any Pay / Buy row is on screen and over
                      the footer; mounted after hydration; never a payment path of its own (it taps the card's own Pay / Buy). */}
                  {paymentsOn && (
                    // From hydration (no scroll needed). The wrapper carries the capture's clock-figure test id, so the prerender
                    // capture strips the bar (captureStaticBodies strip rule 4): it shows the date-driven Board Pass price anyway.
                    <div className="lt-ph-barwrap" data-testid="till-boards-figures">
                    <SalesStickyBar
                      key={barWatch.join("|")}
                      watch={barWatch}
                      copy={barCopy}
                      onGo={barGo}
                      copyKey={`${selected}|${subject}|${premium ? 1 : 0}|${passPayKey}`}
                      ariaLabel={`${HUB_TAB_NAME[selected]} shortcut`}
                      testId="pricing-sticky-bar"
                    />
                    </div>
                  )}
                </>
              );
            }}
          </PacksShop>
        </div>
      </div>

      {/* [FU-LEGAL-FOOTER-LINK] - /pricing must reach the Cancellation Policy and Terms. */}
      <PublicLegalFooter />
    </main>
  );
}
