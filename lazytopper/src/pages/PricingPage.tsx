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
  FOUNDING_LOCK_COPY,
  FOUNDING_OFFER_BADGE,
  FOUNDING_OFFER_OPEN,
  PERIOD_FREE_LABEL,
  PERIOD_MONTHLY_LABEL,
  PRICE_FREE_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
  TILL_BOARDS_LINE,
  TILL_BOARDS_SAVING_PERCENT,
  TUITION_ANCHOR,
  tillBoardsQuote,
  type TillBoardsQuote,
} from "../config/pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";
import PassCheckout from "../components/pricing/PassCheckout";
import AskParents from "../components/pricing/AskParents";
import ParentPayPanel from "../components/pricing/ParentPayPanel";
import { isParentPayClientEnabled, readParentPayToken } from "../services/parentPay";
import {
  BASIC_FOOTNOTE,
  BASIC_INCLUDES,
  BASIC_INCLUDES_HEAD,
  COMPARE_BASIC_HEADER,
  COMPARE_FEATURE_HEADER,
  COMPARE_TITLE,
  FAIR_USE_TITLE,
  PREMIUM_FOOTNOTE,
  PREMIUM_PLUS,
  PREMIUM_PLUS_HEAD,
  comparePremiumHeader,
  compareSections,
  fairUseCopy,
  type CompareCell,
  type PlanItem,
} from "../config/pricingCompare";
import { isPaymentsClientEnabled } from "../services/checkout";
import { isFreeCheckClientEnabled } from "../services/freeCheckClient";
import ParentReturnLink from "../components/parents/ParentReturnLink";

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

// PRICING-LIGHT-1 (owner ruling L4, Oct 2026) — both cards and the "Compare plans" table
// read src/config/pricingCompare.ts. That ruling SUPERSEDES the earlier rule that kept
// quota / fair-use wording off the cards (P5): the cards now say what each plan gives,
// and the fair-use box says what the trial includes.
//
// FREE_FEATURES (components/pricing/BasicFreeList.tsx) is NOT rendered here any more. It
// still feeds every Premium lock's "Free on Basic:" list, untouched.

const BOARDS_COMING = [
  { name: "ICSE Board", icon: "🏛️" },
  { name: "State Boards", icon: "🗺️" },
  { name: "Class 12 CBSE", icon: "🎓" },
];

const PRICING_CSS = `
  .lt-pricing-page,
  .lt-pricing-page * {
    box-sizing: border-box;
  }

  html:has(.lt-pricing-page),
  body:has(.lt-pricing-page),
  #root:has(.lt-pricing-page),
  #root > div:has(.lt-pricing-page) {
    background: #f7f9fc;
  }

  #root > div:has(.lt-pricing-page) {
    padding-bottom: 0 !important;
  }

  #root:has(.lt-pricing-page) > div[style*="position: fixed"][style*="bottom: 0px"] {
    display: none !important;
  }

  /* PRICING-LIGHT-1 (owner design "D") — a light page under a navy band. Every
     text and button pair here is measured against WCAG AA by
     PricingPage.pricing.test.tsx, which parses THIS string. */
  .lt-pricing-page {
    --lt-ground: #f7f9fc;
    --lt-surface: #ffffff;
    --lt-ink: #0b1b3a;
    --lt-ink-2: #4a5a73;
    --lt-ink-3: #6b778a;
    --lt-line: #e1e7ef;
    --lt-row-line: #e8edf3;
    --lt-section: #f1f5fa;
    --lt-band-sub: #c9d6e6;
    --lt-on-dark: #ffffff;
    --lt-on-band-green: #7fe0ae;
    --lt-mint: #eef8f2;
    --lt-mint-line: #16b96a;
    --lt-tile-line: #cfe8da;
    --lt-pill-line: #9ed9b9;
    --lt-green-deep: #0e7c47;

    min-height: 100svh;
    width: 100%;
    color: var(--lt-ink);
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--lt-ground);
    padding: 0;
  }

  .lt-pricing-inner {
    width: 100%;
  }

  .lt-pricing-page :focus-visible {
    outline: 3px solid var(--lt-green-deep);
    outline-offset: 2px;
  }

  .lt-pricing-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* ── Navy band ─────────────────────────────────────────────────────────── */
  .lt-pricing-band {
    background: var(--lt-ink);
    padding: 36px 24px 170px;
  }

  .lt-pricing-band-inner {
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .lt-pricing-band .ux-return-bar {
    margin: 0;
  }

  .lt-pricing-band .ux-return-bar__back {
    color: var(--lt-on-dark);
    background: transparent;
    border-color: rgba(255, 255, 255, 0.35);
  }

  .lt-pricing-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .lt-pricing-title {
    margin: 0;
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-size: 2.9rem;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--lt-on-dark);
  }

  .lt-pricing-subtitle {
    margin: 0 auto;
    max-width: 640px;
    color: var(--lt-band-sub);
    font-size: 1.1rem;
    line-height: 1.5;
    font-weight: 400;
  }

  /* ── Body: the cards overlap the band's bottom edge ─────────────────────── */
  .lt-pricing-body {
    position: relative;
    max-width: 1080px;
    margin: -130px auto 0;
    padding: 0 24px 96px;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  .lt-pricing-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    align-items: stretch;
  }

  .lt-pricing-card {
    position: relative;
    min-width: 0;
    padding: 32px 28px;
    border-radius: 22px;
    background: var(--lt-surface);
    border: 1px solid var(--lt-line);
    box-shadow: 0 14px 34px rgba(11, 27, 58, 0.08);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .lt-pricing-card--premium {
    background: var(--lt-mint);
    border: 2px solid var(--lt-mint-line);
    box-shadow: 0 22px 48px rgba(11, 27, 58, 0.16);
  }

  .lt-pricing-badge {
    position: absolute;
    top: -14px;
    right: 24px;
    padding: 6px 14px;
    border-radius: 999px;
    background: var(--lt-ink);
    color: var(--lt-on-dark);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .lt-pricing-premium-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .lt-pricing-plan-label {
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--lt-ink-2);
  }

  .lt-pricing-plan-label--premium {
    color: var(--lt-green-deep);
  }

  .lt-pricing-founding-flag {
    margin: 0;
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--lt-surface);
    border: 1px solid var(--lt-pill-line);
    color: var(--lt-ink);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .lt-pricing-price {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
  }

  .lt-pricing-amount {
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-size: 3.2rem;
    font-weight: 800;
    color: var(--lt-ink);
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .lt-pricing-period {
    font-size: 1.05rem;
    font-weight: 500;
    color: var(--lt-ink-2);
  }

  /* A struck LIST figure beside the price a founding member actually pays. */
  .lt-pricing-was {
    color: var(--lt-ink-3);
    font-size: 1rem;
    font-weight: 600;
  }

  .lt-pricing-plan-desc {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 1rem;
    line-height: 1.5;
  }

  .lt-pricing-list-head {
    margin-top: 6px;
    color: var(--lt-ink);
    font-size: 0.9rem;
    font-weight: 800;
  }

  .lt-pricing-features {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .lt-pricing-feature {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    color: var(--lt-ink);
    font-size: 1rem;
    line-height: 1.45;
  }

  .lt-pricing-feature-icon {
    color: var(--lt-green-deep);
    font-weight: 800;
  }

  .lt-pricing-feature a {
    color: var(--lt-green-deep);
    font-weight: 700;
  }

  .lt-pricing-card-end {
    margin-top: auto;
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .lt-pricing-card-foot {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .lt-pricing-founding-note {
    margin: 0;
    color: var(--lt-ink);
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.45;
  }

  /* ── Buttons ────────────────────────────────────────────────────────────── */
  .lt-pricing-cta {
    appearance: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 52px;
    padding: 12px 18px;
    border: 0;
    border-radius: 12px;
    font-family: inherit;
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: 0;
    text-align: center;
    text-decoration: none;
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .lt-pricing-cta:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .lt-pricing-cta:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(11, 27, 58, 0.18);
  }

  .lt-pricing-cta--primary {
    color: var(--lt-on-dark);
    background: var(--lt-ink);
  }

  .lt-pricing-cta--secondary {
    color: var(--lt-ink);
    background: var(--lt-surface);
    border: 1.5px solid var(--lt-ink);
  }

  /* The trial action sits under the pay tiles: an outline, so Pay stays the lead. */
  .lt-pricing-trial-slot .lt-pricing-cta--primary {
    color: var(--lt-ink);
    background: var(--lt-surface);
    border: 1.5px solid var(--lt-ink);
  }

  /* ── The two pass tiles (P23) ───────────────────────────────────────────
     One grid holds both tile heads AND PassCheckout's children: the checkout
     wrapper is display: contents, so its buttons and notices are placed by
     class into the tile they belong to. Two decorative boxes draw each tile
     behind its head + button rows. */
  .lt-pricing-passes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto auto auto auto;
    column-gap: 12px;
  }

  .lt-pricing-checkout {
    display: contents;
  }

  .lt-pricing-pass-bg {
    border-radius: 16px;
    background: var(--lt-surface);
  }

  .lt-pricing-pass-bg--month {
    grid-column: 1;
    grid-row: 2 / 4;
    border: 1px solid var(--lt-tile-line);
  }

  .lt-pricing-pass-bg--boards {
    grid-column: 2;
    grid-row: 2 / 4;
    border: 2px solid var(--lt-green-deep);
  }

  .lt-pricing-pass {
    position: relative;
    min-width: 0;
    padding: 18px 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lt-pricing-pass--month {
    grid-column: 1;
    grid-row: 2;
  }

  .lt-pricing-pass--boards {
    grid-column: 2;
    grid-row: 2;
  }

  .lt-pricing-pass-name {
    color: var(--lt-ink-2);
    font-size: 0.9rem;
    font-weight: 800;
  }

  .lt-pricing-pass .lt-pricing-amount {
    font-size: 2.4rem;
  }

  .lt-pricing-pass .lt-pricing-was {
    order: 2;
  }

  .lt-pricing-pass .lt-pricing-period {
    order: 3;
    flex-basis: 100%;
    font-size: 0.9rem;
  }

  .lt-pricing-price-alt {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .lt-pricing-price-alt::first-letter {
    text-transform: uppercase;
  }

  .lt-pricing-pay {
    width: auto;
    align-self: end;
    margin: 0 16px 16px;
    padding: 12px 10px;
  }

  .lt-pricing-pay--month {
    grid-column: 1;
    grid-row: 3;
    color: var(--lt-on-dark);
    background: var(--lt-ink);
  }

  .lt-pricing-pay--boards {
    grid-column: 2;
    grid-row: 3;
    color: var(--lt-on-dark);
    background: var(--lt-green-deep);
  }

  .lt-pricing-checkout-note {
    margin: 0;
    color: var(--lt-ink);
    font-weight: 700;
  }

  .lt-pricing-checkout-note--top {
    grid-column: 1 / -1;
    grid-row: 1;
    margin-bottom: 14px;
  }

  .lt-pricing-checkout-note--bottom,
  .lt-pricing-passes > .lt-pricing-plan-desc {
    grid-column: 1 / -1;
    grid-row: 4;
    margin-top: 14px;
  }

  /* Till boards — one payment until the first board paper. The number-free
     line is static; the figures are written only after mount and are stripped
     from the prerendered capture by their data-testid. The slot keeps their
     height reserved, so their arrival moves nothing (CLS). */
  .lt-pricing-tillboards {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lt-pricing-tillboards-slot {
    min-height: 5.6rem;
  }

  .lt-pricing-tillboards-line {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .lt-pricing-tillboards-price {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
  }

  .lt-pricing-tillboards-amount {
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-size: 2.4rem;
    font-weight: 800;
    color: var(--lt-ink);
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .lt-pricing-tillboards-meta {
    margin: 6px 0 0;
    color: var(--lt-ink-2);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .lt-pricing-save-tag {
    position: absolute;
    top: -11px;
    left: 16px;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--lt-green-deep);
    color: var(--lt-on-dark);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Compare plans ──────────────────────────────────────────────────────── */
  .lt-pricing-compare {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .lt-pricing-compare-title {
    margin: 0;
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-size: 2rem;
    line-height: 1.2;
    font-weight: 800;
    color: var(--lt-ink);
    text-align: center;
  }

  /* At phone width the TABLE scrolls sideways inside this box, never the page.
     position: relative makes this box the containing block of the cells'
     screen-reader text, so that text is clipped here too and cannot widen the page. */
  .lt-pricing-compare-scroll {
    position: relative;
    overflow-x: auto;
    background: var(--lt-surface);
    border: 1px solid var(--lt-line);
    border-radius: 18px;
  }

  .lt-pricing-compare-table {
    width: 100%;
    min-width: 620px;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .lt-pricing-compare-table thead th {
    padding: 16px 20px;
    background: var(--lt-ink);
    color: var(--lt-on-dark);
    text-align: left;
    font-weight: 800;
  }

  .lt-pricing-compare-table .lt-pricing-compare-col-feature {
    width: 46%;
  }

  .lt-pricing-compare-table .lt-pricing-compare-col-basic {
    width: 24%;
  }

  .lt-pricing-compare-table .lt-pricing-compare-col-premium {
    width: 30%;
    color: var(--lt-on-band-green);
  }

  .lt-pricing-compare-section th {
    padding: 12px 20px;
    background: var(--lt-section);
    color: var(--lt-ink-2);
    text-align: left;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .lt-pricing-compare-row {
    border-top: 1px solid var(--lt-row-line);
  }

  .lt-pricing-compare-row th {
    padding: 14px 20px;
    color: var(--lt-ink);
    text-align: left;
    font-weight: 500;
  }

  .lt-pricing-compare-row td {
    padding: 14px 20px;
    color: var(--lt-ink);
  }

  .lt-pricing-compare-row td.lt-pricing-cell--no {
    color: var(--lt-ink-3);
  }

  .lt-pricing-compare-row td.lt-pricing-cell--premium {
    color: var(--lt-green-deep);
    font-weight: 600;
  }

  .lt-pricing-fairuse {
    padding: 20px 22px;
    border-radius: 16px;
    background: var(--lt-surface);
    border: 1px solid var(--lt-line);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .lt-pricing-fairuse-title {
    margin: 0;
    color: var(--lt-ink);
    font-size: 1rem;
    font-weight: 800;
  }

  .lt-pricing-fairuse-text {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .lt-pricing-fine-print {
    margin: 0;
    text-align: center;
    color: var(--lt-ink-2);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  /* ── FAQ, Coming soon, waitlist (light) ─────────────────────────────────── */
  .lt-pricing-faq,
  .lt-pricing-coming,
  .lt-pricing-waitlist {
    padding: 36px 32px;
    border-radius: 20px;
    background: var(--lt-surface);
    border: 1px solid var(--lt-line);
  }

  .lt-pricing-coming {
    text-align: center;
  }

  .lt-pricing-faq-title,
  .lt-pricing-coming-title,
  .lt-pricing-waitlist-title {
    margin: 0 0 8px;
    font-family: "Fraunces", "Fraunces Fallback", Georgia, serif;
    font-size: 1.6rem;
    line-height: 1.2;
    font-weight: 800;
    color: var(--lt-ink);
    text-align: center;
  }

  .lt-pricing-faq-title {
    margin-bottom: 24px;
  }

  .lt-pricing-faq-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 720px;
    margin: 0 auto;
  }

  .lt-pricing-faq-item {
    padding: 16px 18px;
    border-radius: 14px;
    background: var(--lt-ground);
    border: 1px solid var(--lt-line);
  }

  .lt-pricing-faq-q {
    margin: 0 0 6px;
    color: var(--lt-ink);
    font-size: 0.98rem;
    font-weight: 800;
    line-height: 1.35;
  }

  .lt-pricing-faq-a {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .lt-pricing-coming-lede,
  .lt-pricing-waitlist-lede {
    margin: 0 auto 22px;
    max-width: 540px;
    color: var(--lt-ink-2);
    font-size: 0.92rem;
    line-height: 1.55;
    text-align: center;
  }

  .lt-pricing-coming-chips {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .lt-pricing-coming-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--lt-mint);
    border: 1px solid var(--lt-tile-line);
    color: var(--lt-ink);
    font-size: 0.88rem;
    font-weight: 700;
  }

  .lt-pricing-coming-chip-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .lt-pricing-waitlist-form {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 560px;
    margin: 0 auto;
  }

  .lt-pricing-waitlist-input,
  .lt-pricing-waitlist-select {
    font-family: inherit;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--lt-surface);
    border: 1px solid var(--lt-ink-3);
    color: var(--lt-ink);
    font-size: 0.92rem;
  }

  .lt-pricing-waitlist-input {
    flex: 1 1 220px;
    min-width: 0;
  }

  .lt-pricing-waitlist-select {
    flex: 0 1 160px;
    cursor: pointer;
  }

  .lt-pricing-waitlist-select option {
    background: var(--lt-surface);
    color: var(--lt-ink);
  }

  .lt-pricing-waitlist-input::placeholder {
    color: var(--lt-ink-3);
  }

  .lt-pricing-waitlist-cta {
    flex: 0 0 auto;
    appearance: none;
    cursor: pointer;
    padding: 12px 22px;
    border: 0;
    border-radius: 12px;
    background: var(--lt-ink);
    color: var(--lt-on-dark);
    font-family: inherit;
    font-size: 0.92rem;
    font-weight: 800;
  }

  .lt-pricing-waitlist-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px;
    max-width: 560px;
    margin: 0 auto;
    border-radius: 16px;
    background: var(--lt-mint);
    border: 1px solid var(--lt-tile-line);
    text-align: center;
  }

  .lt-pricing-waitlist-success-emoji {
    font-size: 1.6rem;
    line-height: 1;
  }

  .lt-pricing-waitlist-success-title {
    margin: 0;
    color: var(--lt-green-deep);
    font-size: 1rem;
    font-weight: 800;
  }

  .lt-pricing-waitlist-success-sub {
    margin: 0;
    color: var(--lt-ink-2);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  /* The pass tiles stack when the Premium card is narrow: side-by-side cards on a
     tablet, and every phone. */
  @media (min-width: 761px) and (max-width: 1023px), (max-width: 560px) {
    .lt-pricing-passes {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto auto 14px auto auto auto;
    }
    .lt-pricing-pass-bg--month {
      grid-column: 1;
      grid-row: 2 / 4;
    }
    .lt-pricing-pass-bg--boards {
      grid-column: 1;
      grid-row: 5 / 7;
    }
    .lt-pricing-pass--month {
      grid-column: 1;
      grid-row: 2;
    }
    .lt-pricing-pass--boards {
      grid-column: 1;
      grid-row: 5;
    }
    .lt-pricing-pay--month {
      grid-column: 1;
      grid-row: 3;
    }
    .lt-pricing-pay--boards {
      grid-column: 1;
      grid-row: 6;
    }
    .lt-pricing-checkout-note--bottom,
    .lt-pricing-passes > .lt-pricing-plan-desc {
      grid-row: 7;
    }
    .lt-pricing-tillboards-slot {
      min-height: 4.4rem;
    }
  }

  @media (max-width: 1023px) {
    .lt-pricing-title {
      font-size: 2.3rem;
    }
    .lt-pricing-card {
      padding: 28px 22px;
    }
  }

  /* Phones and small tablets — Basic first, then Premium. */
  @media (max-width: 760px) {
    .lt-pricing-band {
      padding: 24px 16px 120px;
    }
    .lt-pricing-band-inner {
      gap: 20px;
    }
    .lt-pricing-subtitle {
      font-size: 1rem;
    }
    .lt-pricing-body {
      margin-top: -92px;
      padding: 0 16px 72px;
      gap: 40px;
    }
    .lt-pricing-cards {
      grid-template-columns: minmax(0, 1fr);
      gap: 28px;
    }
    .lt-pricing-compare-title {
      font-size: 1.6rem;
    }
    .lt-pricing-faq-title,
    .lt-pricing-coming-title,
    .lt-pricing-waitlist-title {
      font-size: 1.3rem;
    }
  }

  @media (max-width: 520px) {
    .lt-pricing-title {
      font-size: 1.9rem;
    }
    .lt-pricing-card {
      padding: 26px 18px;
    }
    .lt-pricing-amount {
      font-size: 2.6rem;
    }
    .lt-pricing-faq,
    .lt-pricing-coming,
    .lt-pricing-waitlist {
      padding: 24px 18px;
    }
    .lt-pricing-waitlist-form {
      flex-direction: column;
    }
    .lt-pricing-waitlist-input,
    .lt-pricing-waitlist-select,
    .lt-pricing-waitlist-cta {
      flex: 1 1 auto;
      width: 100%;
    }
  }
`;

const FAQ_ITEMS = [
  {
    q: "Is Basic really free?",
    // Owner ruling on #1190 (Oct 2026): no unbacked "limited" — P20 found no enforced free limit.
    a: "Yes. Basic is free forever: study, practise and open papers without paying. Checked answers, the AI tutor and Mistake Intelligence come with Premium.",
  },
  {
    // PRICING-TB-1 (owner ruling): NO FIGURE HERE. The till-boards price
    // depends on today's date, and this answer is in the prerendered page, so a
    // number here would be baked at capture time and go stale the next month.
    q: "Should I pay monthly or till my boards?",
    a: `Till boards is one payment that covers every month until your first board paper, at ${TILL_BOARDS_SAVING_PERCENT}% less than paying monthly. The price shrinks each month as the boards get closer.`,
  },
  {
    // The offer's honesty rests entirely on this answer, so it states the close
    // condition and the lock in the same breath. If a future edit drops either
    // half, the founding framing stops being true.
    //
    // ⚠ THE PROMISE IS SCOPED TO THE STUDENT'S OWN PASSES, deliberately.
    // (PRICING-TB-1 · OR-P7, owner 2026-09-26: billing is one-time passes, so the
    // lock is worded per pass, never "an active subscription".)
    // An earlier draft said "we do not raise anyone's price". That is a claim
    // about PUBLISHED prices, and it is broader than this product can support —
    // a fixed board-year price moved between #539 and #548, one day apart
    // (that plan was later retired by PRICING-TB-1).
    // What can be supported without qualification is narrower and is the thing
    // a founding member actually cares about: the price of your own passes never
    // moves. Do not widen this back out. The broad version is
    // precisely the sentence a student who saw an older published price would
    // quote back.
    //
    // PARENTS-CTA-1 (owner ruling 2026-10-19): NO seat count and NO deadline in the
    // question or the answer — the "first N students" wording was withdrawn.
    q: "What happens when the founding offer ends?",
    a: `When it ends, new members join at the regular price — ${PRICE_MONTHLY_LIST_DISPLAY} ${PERIOD_MONTHLY_LABEL}, or ${TILL_BOARDS_SAVING_PERCENT}% off when you pay once till your boards, which is what we publish today alongside the founding rate. Your rate is locked. Once you buy a pass as a founding member, every pass you buy after that stays at the founding price. We never raise the price of a pass you have already bought.`,
  },
  {
    q: "Are there any usage limits?",
    // PRICING-LIGHT-1 · L5 (owner, Oct 2026) — the limits are shown on the page now.
    a: "Basic has daily limits on opening tests and mocks. Premium has generous fair use: your usage bars show what is left and when it resets. The 7-day trial has daily and weekly limits, listed above.",
  },
  {
    q: "What happens after the trial ends?",
    a: "You keep using the free plan. Nothing is charged automatically; you choose when to upgrade.",
  },
  {
    q: "Can I pay here?",
    a: "Not yet. Payment checkout is not connected in this build, so Premium activation stays manual.",
  },
  {
    q: "Is this only for CBSE Class 10?",
    a: "Currently yes. We're expanding to ICSE, State Boards, and Class 12 soon!",
  },
];

// PAYCOPY-1 (owner rulings K1-K3, 2026-09-28) — the three strings outside the P7 buy
// area that would go stale once payments are on. Payments dark (isPaymentsClientEnabled()
// false — VITE_PAYMENTS_ENABLED unset, the production state) -> each *_PAYMENTS_OFF
// string, byte-identical to the copy this page shipped before; the prerendered page
// is captured in that state. Payments on -> the owner's K wording, word for word.
const PRICING_SUBTITLE_PAYMENTS_OFF =
  "Browse first. Sign in for a 7-day trial. Choose Premium when you need checked answers, Mistake Intelligence, and full mock workflows. Payment checkout is not automated yet.";
const PRICING_SUBTITLE_PAYMENTS_ON =
  "Browse first. Sign in for a 7-day trial. Choose Premium when you need checked answers, Mistake Intelligence, and full mock workflows — pay securely with UPI, card or netbanking.";
const FAQ_CAN_I_PAY_Q = "Can I pay here?";
const FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON =
  "Yes. Tap Pay, finish in Razorpay's secure checkout (UPI, card or netbanking), and Premium turns on straight away.";
const PRICING_FINE_PRINT_PAYMENTS_OFF =
  "No credit card required. Premium is not activated automatically.";
const PRICING_FINE_PRINT_PAYMENTS_ON =
  "No credit card needed for the trial. Passes are one-time payments and never renew automatically.";

/** The FAQ as rendered: only the "Can I pay here?" answer follows the payments switch. */
function faqItemsFor(paymentsOn: boolean): ReadonlyArray<{ q: string; a: string }> {
  if (!paymentsOn) return FAQ_ITEMS;
  return FAQ_ITEMS.map(item =>
    item.q === FAQ_CAN_I_PAY_Q ? { q: item.q, a: FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON } : item,
  );
}

/**
 * BACKNAV-1 — where "back" goes when the student arrived from the sign-in door.
 *
 * The login page's offer block links to `/pricing?source=login`, and this page
 * ignored the parameter entirely: `backTo` was the literal "/". A student who
 * tapped "See plans" mid-signup to check what they were joining was returned to
 * Home instead of the door, losing the form they had already started.
 *
 * ★ ALLOWLIST, NOT A PASS-THROUGH. `source` is matched against known values and
 * mapped to a hardcoded path — the parameter never becomes the destination. A
 * `?source=` that carried a URL would otherwise be an open redirect on a page
 * anyone can link to, and Login.tsx already refuses external redirects for the
 * same reason. An unknown value falls back to Home, which is the safe side.
 */
const RETURN_TARGETS: Record<string, { backTo: string; backLabel: string }> = {
  login: { backTo: "/login", backLabel: "Back to sign in" },
};

const DEFAULT_RETURN = { backTo: "/", backLabel: "Back to home" };

/**
 * PRICING-TB-1 · R1 — the Premium headline is the MONTHLY price.
 *
 * Takes the offer state as a PROP (the pattern of Welcome's `PaidPlanHead`) so a
 * test can render both states without mocking src/config, which the repo forbids.
 * Open: the founding rate leads, with the list rate struck beside it. The list
 * price is struck because it is not what a founding member pays — NOT because
 * it is retired; it is live and charged from student 201. `<s>` carries that
 * meaning natively. Closed: the list rate stands alone, nothing struck.
 */
export function PremiumPriceHead({ offerOpen }: { offerOpen: boolean }) {
  return (
    <div className="lt-pricing-price" data-testid="pricing-monthly-price">
      <span className="lt-pricing-amount">
        {offerOpen ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY}
      </span>
      <span className="lt-pricing-period">{PERIOD_MONTHLY_LABEL}</span>
      {offerOpen && <s className="lt-pricing-was">{PRICE_MONTHLY_LIST_DISPLAY}</s>}
    </div>
  );
}

/**
 * PRICING-TB-1 · R3/R4 — the till-boards offer.
 *
 * ★ THE FIRST RENDER CARRIES NO FIGURE. The number-free line is static; the
 * figures are computed from the clock and the predicted board date inside the
 * effect, so they do not exist until the page has mounted in a browser.
 *
 * ⚠ AN EFFECT IS NOT BY ITSELF A DEFENCE. The prerender capture waits for the
 * page to settle, so it WOULD see the figures. What keeps them out of
 * `prerendered/pricing.html` is the pairing: every figure sits inside the one
 * node carrying `data-testid="till-boards-figures"`, and
 * `stripAuthChrome()` in scripts/seo/captureStaticBodies.ts removes that node BY
 * STRUCTURAL SELECTOR (and `countResidualAuthNodes()` fails the capture if one
 * survives). Keep EVERY clock-derived figure inside that node, and keep the
 * number-free line OUTSIDE it so the static page still says the offer exists.
 *
 * Both clock reads — `new Date()` and `predictCbseExamDate()` (which reads the
 * clock itself) — live in the effect, never at module scope, so nothing is
 * baked at build time either.
 */
export function TillBoardsOffer({ offerOpen }: { offerOpen: boolean }) {
  const [quote, setQuote] = useState<TillBoardsQuote | null>(null);
  useEffect(() => {
    setQuote(tillBoardsQuote(new Date(), predictCbseExamDate("10"), offerOpen));
  }, [offerOpen]);

  return (
    <div className="lt-pricing-tillboards" data-testid="till-boards">
      {/* PRICING-LIGHT-1 — the slot is ALWAYS rendered and holds the figures' height, so
          their arrival after mount shifts nothing. The slot itself carries no figure;
          the "save" tag is inside the figures node, so it is stripped with them. */}
      <div className="lt-pricing-tillboards-slot">
        {quote && (
          <div className="lt-pricing-tillboards-figures" data-testid="till-boards-figures">
            <span className="lt-pricing-save-tag">{quote.savingLabel}</span>
            <p className="lt-pricing-tillboards-price">
              <span className="lt-pricing-tillboards-amount">{quote.priceDisplay}</span>
              <s className="lt-pricing-was">{quote.fullDisplay}</s>
            </p>
            <p className="lt-pricing-tillboards-meta">
              <span className="lt-pricing-tillboards-once">one-time</span>
              {" · "}
              <span className="lt-pricing-tillboards-until">{quote.untilLabel}</span>
            </p>
          </div>
        )}
      </div>
      <p className="lt-pricing-tillboards-line">{TILL_BOARDS_LINE}</p>
    </div>
  );
}

/**
 * TRIAL-CTA-1 — the Premium card's signed-in trial states. Rendered ONLY inside a
 * signed-in state (a sibling <style>, never PRICING_CSS), so the signed-out page —
 * and so prerendered/pricing.html — is byte-for-byte what it was.
 */
const PRICING_TRIAL_STATE_CSS = `
  .lt-pricing-trial-state .lt-pricing-trial-state-msg {
    margin: 0 0 12px;
    color: var(--lt-ink);
    font-weight: 700;
  }
  .lt-pricing-trial-state .lt-pricing-cta {
    text-decoration: none;
  }
`;

/**
 * "<d Month yyyy>" — the trial's end, DERIVED from the stored start plus the
 * TRIAL_DAYS constant (the end is never stored; see subscriptionService). Read at
 * render, never at module scope, so nothing is baked into a build.
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

/** One row of a plan card's list: a tick, then the label (with its optional internal link). */
function PlanRow({ item, testId }: { item: PlanItem; testId?: string }) {
  let body: ReactNode = item.label;
  if (item.link) {
    const at = item.label.indexOf(item.link.text);
    if (at >= 0) {
      body = (
        <>
          {item.label.slice(0, at)}
          <Link to={item.link.to}>{item.link.text}</Link>
          {item.label.slice(at + item.link.text.length)}
        </>
      );
    }
  }
  return (
    <li className="lt-pricing-feature" data-testid={testId}>
      <span className="lt-pricing-feature-icon" aria-hidden="true">✓</span>
      <span>{body}</span>
    </li>
  );
}

/**
 * One cell of the compare table. A tick or a dash is a glyph a screen reader may skip or
 * misread, so each carries visually hidden words ("Included" / "Not included").
 */
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
    return <td className={`lt-pricing-cell--text${planClass}`}>{cell.text}</td>;
  }
  return (
    <td className={`lt-pricing-cell--yes${planClass}`}>
      <span aria-hidden="true">✓</span>
      {cell.note ? ` ${cell.note}` : <span className="lt-pricing-sr">Included</span>}
    </td>
  );
}

/**
 * ASK-PARENTS-PAY-1 — `/pricing#pp=<token>` is a parent's pay link: with parent pay switched
 * on, the parent's page replaces the plans. The token is read ONCE (latched), so taking it
 * out of the address bar on mount does not swap the page back. Without a valid
 * token, or while parent pay is dark, this is exactly the plans page as before.
 */
export default function PricingPage() {
  const { hash } = useLocation();
  const [parentToken] = useState(() => (isParentPayClientEnabled() ? readParentPayToken(hash) : null));
  if (parentToken) return <ParentPayPanel token={parentToken} />;
  return <PricingPlansPage />;
}

function PricingPlansPage() {
  const navigate = useNavigate();
  // PAYCOPY-1 — read once per render; drives the subtitle, the pay FAQ and the fine print.
  const paymentsOn = isPaymentsClientEnabled();
  const [searchParams] = useSearchParams();
  const returnTarget =
    RETURN_TARGETS[(searchParams.get("source") || "").trim().toLowerCase()] ?? DEFAULT_RETURN;
  // FREECHECK-2 · F3 — the sign-in door's `?redirect=`, carried here by its offer links.
  // It is never a destination on this page: it is only handed BACK to /login by the
  // links below, and only as a safe internal path. Those clicks write the free-check
  // sign-in marker exactly as the free-check panel's link does (it writes nothing
  // unless this tab produced a waiting free result).
  const carriedRedirect = safeSigninRedirect(searchParams.get("redirect"));
  const backTo =
    returnTarget.backTo === "/login"
      ? withSigninRedirect("/login", carriedRedirect)
      : returnTarget.backTo;
  const toLogin = (path: string) => {
    if (carriedRedirect) markFreeCheckSigninIntent();
    navigate(path);
  };
  const [waitlistContact, setWaitlistContact] = useState("");
  const [waitlistBoard, setWaitlistBoard] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  // TRIAL-CTA-1 — the Premium button is state-aware. Signed out it is exactly the old
  // button (the prerendered page must not change): it carries the trial intent to the
  // sign-in door, which honours it once (Login.tsx). Signed in, it starts the trial
  // HERE through the one existing API, useSubscription().startTrial().
  //
  // ★ ELIGIBILITY IS THE EXISTING RULE, GUARDED AT THE CALL SITE (useSubscription.ts
  // is not touched). activateTrial writes only for a status that is not premium and
  // has no trialStartDate — but it reads the LOCAL cache, so the call waits for
  // `hydrated` (a fresh device's empty cache would otherwise "start" a used trial the
  // rules then refuse). The eligibility MEANING is unchanged. startTrial() returns
  // nothing, so this guard is the whole evidence that the call takes effect, and so
  // it is what gates trial_start.
  const { user, loading: authLoading } = useAuth();
  const subscription = useSubscription();
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
      className="lt-pricing-cta lt-pricing-cta--primary"
      onClick={handleStartTrial}
      disabled={Boolean(user) && !subscription.hydrated}
    >
      Start 7-day trial
    </button>
  );
  const trialState = (message: string, practiseLink: boolean): ReactNode => (
    <div className="lt-pricing-trial-state" data-testid="pricing-trial-state">
      <style dangerouslySetInnerHTML={{ __html: PRICING_TRIAL_STATE_CSS }} />
      <p className="lt-pricing-plan-desc lt-pricing-trial-state-msg" role="status">
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
    // Signed out (and while the session resolves): the unchanged button. Signed in
    // but not yet hydrated: the same button, disabled until the record is known.
    premiumTrialAction = startTrialButton;
  } else if (trialStartedHere) {
    const endsOn = trialEndsOn(subscription.status.trialStartDate);
    premiumTrialAction = trialState(
      endsOn ? `Your 7-day trial has started. It ends on ${endsOn}.` : "Your 7-day trial has started.",
      true,
    );
  } else if (subscription.status.tier === "premium") {
    premiumTrialAction = trialState("Premium is active.", false);
  } else if (subscription.isTrialActive) {
    const n = subscription.daysLeftInTrial;
    premiumTrialAction = trialState(`Your trial is active — ${n} ${n === 1 ? "day" : "days"} left.`, true);
  } else if (trialEligible) {
    premiumTrialAction = startTrialButton;
  } else {
    // Hydrated, not premium, not in a trial, not eligible => a trialStartDate exists.
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

  // SEO-PAGES-1 (D) — the one free signed-out answer check. Only for a signed-out visitor,
  // only while this build has the free check on, and only once auth has resolved (while it
  // loads `user` is null even for a signed-in student, and the row would flash).
  // PRICING-LIGHT-1: the Basic card's "Your first answer check free" row and the table's
  // Basic answer-checking cell both follow this ONE condition.
  const showFreeCheck = !authLoading && !user && isFreeCheckClientEnabled();
  // "Premium is free for 7 days" is only true for someone who can still start the trial:
  // signed out, still resolving, or signed in and eligible. A student who has used the
  // trial, or already has Premium, is not told it.
  const showTrialFootnote = !user || !subscription.hydrated || trialEligible;
  const sections = compareSections({ freeCheck: showFreeCheck });

  return (
    <main className="lt-pricing-page" aria-label="LazyTopper pricing">
      <style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />
      <div className="lt-pricing-inner">
        <div className="lt-pricing-band">
          <div className="lt-pricing-band-inner">
            <ParentReturnLink />
            {carriedRedirect && backTo !== returnTarget.backTo ? (
              // Wrapped only when a redirect is carried, so the page's markup without one
              // (and so the prerendered /pricing) is unchanged. The capture runs before the
              // bar's own click navigates.
              <div className="lt-pricing-return" onClickCapture={markFreeCheckSigninIntent}>
                <ReturnContextBar backTo={backTo} backLabel={returnTarget.backLabel} />
              </div>
            ) : (
              <ReturnContextBar backTo={returnTarget.backTo} backLabel={returnTarget.backLabel} />
            )}

            <section className="lt-pricing-header">
              <h1 className="lt-pricing-title">Simple, Student-Friendly Plans</h1>
              <p className="lt-pricing-subtitle">
                {paymentsOn ? PRICING_SUBTITLE_PAYMENTS_ON : PRICING_SUBTITLE_PAYMENTS_OFF}
              </p>
            </section>
          </div>
        </div>

        <div className="lt-pricing-body">
          {/* L2 — Basic LEFT, Premium RIGHT; stacked, Basic first (DOM order). The cards
              are <div>s, never <section>s: the prerender strip removes a whole <section>
              around any /login link, and a card must never be collateral. */}
          <div className="lt-pricing-cards">
            <div className="lt-pricing-card lt-pricing-card--basic">
              <div className="lt-pricing-plan-label">Basic</div>
              <div className="lt-pricing-price">
                <span className="lt-pricing-amount">{PRICE_FREE_DISPLAY}</span>
                <span className="lt-pricing-period">{PERIOD_FREE_LABEL}</span>
              </div>
              <p className="lt-pricing-plan-desc">For browsing, revising and practising on your own.</p>
              <button
                type="button"
                className="lt-pricing-cta lt-pricing-cta--secondary"
                onClick={() => toLogin(withSigninRedirect("/login", carriedRedirect))}
              >
                Start free
              </button>
              <div className="lt-pricing-list-head">{BASIC_INCLUDES_HEAD}</div>
              <ul className="lt-pricing-features" aria-label="Basic plan features">
                {BASIC_INCLUDES.filter(item => showFreeCheck || !item.onlyWithFreeCheck).map(item => (
                  <PlanRow
                    key={item.id}
                    item={item}
                    testId={item.onlyWithFreeCheck ? "pricing-free-check-line" : undefined}
                  />
                ))}
              </ul>
              <div className="lt-pricing-card-end">
                <p className="lt-pricing-card-foot">{BASIC_FOOTNOTE}</p>
              </div>
            </div>

            <div className="lt-pricing-card lt-pricing-card--premium">
              <span className="lt-pricing-badge">Most Popular</span>
              <div className="lt-pricing-premium-top">
                <div className="lt-pricing-plan-label lt-pricing-plan-label--premium">Premium</div>
                {FOUNDING_OFFER_OPEN && (
                  <p className="lt-pricing-founding-flag">
                    {FOUNDING_OFFER_BADGE}
                  </p>
                )}
              </div>

              {/* The two pass tiles. Payments on: PassCheckout's buttons and notices are
                  placed into the tiles by class (P23). Payments dark (VITE_PAYMENTS_ENABLED
                  unset): the tiles carry the prices only, and the exact manual-activation
                  paragraph (RAZORPAY-1 · P7) stands where the Pay buttons would be. */}
              <div className="lt-pricing-passes" data-testid="pricing-passes">
                <div className="lt-pricing-pass-bg lt-pricing-pass-bg--month" aria-hidden="true" />
                <div className="lt-pricing-pass-bg lt-pricing-pass-bg--boards" aria-hidden="true" />
                <div className="lt-pricing-pass lt-pricing-pass--month">
                  <div className="lt-pricing-pass-name">Month pass</div>
                  <PremiumPriceHead offerOpen={FOUNDING_OFFER_OPEN} />
                  <p className="lt-pricing-price-alt">{TUITION_ANCHOR}</p>
                </div>
                <div className="lt-pricing-pass lt-pricing-pass--boards">
                  <div className="lt-pricing-pass-name">Till your boards</div>
                  <TillBoardsOffer offerOpen={FOUNDING_OFFER_OPEN} />
                </div>
                {paymentsOn ? (
                  <PassCheckout />
                ) : (
                  <p className="lt-pricing-plan-desc">
                    Manual activation during beta. Payment checkout coming soon.
                    Premium is not activated automatically.
                  </p>
                )}
              </div>

              {FOUNDING_OFFER_OPEN && (
                <p className="lt-pricing-founding-note">{FOUNDING_LOCK_COPY}</p>
              )}
              <div className="lt-pricing-list-head">{PREMIUM_PLUS_HEAD}</div>
              <ul className="lt-pricing-features" aria-label="Premium plan features">
                {PREMIUM_PLUS.map(item => (
                  <PlanRow key={item.id} item={item} />
                ))}
              </ul>
              <div className="lt-pricing-card-end">
                {showTrialFootnote && <p className="lt-pricing-card-foot">{PREMIUM_FOOTNOTE}</p>}
                {/* L2 — the P17 trial states, below the tiles. */}
                <div className="lt-pricing-trial-slot">{premiumTrialAction}</div>
                {/* ASK-PARENTS-PAY-1 — a signed-in student on a trial or Basic (never Premium)
                    can send a parent a pay link. Renders nothing while parent pay is dark. */}
                {user && subscription.hydrated && subscription.status.tier !== "premium" && <AskParents />}
              </div>
            </div>
          </div>

          <section className="lt-pricing-compare" aria-labelledby="lt-pricing-compare-title">
            <h2 className="lt-pricing-compare-title" id="lt-pricing-compare-title">{COMPARE_TITLE}</h2>
            <div
              className="lt-pricing-compare-scroll"
              role="region"
              aria-label="Compare plans table"
              tabIndex={0}
            >
              <table className="lt-pricing-compare-table" data-testid="pricing-compare">
                <thead>
                  <tr>
                    <th scope="col" className="lt-pricing-compare-col-feature">{COMPARE_FEATURE_HEADER}</th>
                    <th scope="col" className="lt-pricing-compare-col-basic">{COMPARE_BASIC_HEADER}</th>
                    <th scope="col" className="lt-pricing-compare-col-premium">
                      {comparePremiumHeader(FOUNDING_OFFER_OPEN)}
                    </th>
                  </tr>
                </thead>
                {sections.map(section => (
                  <tbody key={section.title}>
                    <tr className="lt-pricing-compare-section">
                      <th scope="rowgroup" colSpan={3}>{section.title}</th>
                    </tr>
                    {section.rows.map(row => (
                      <tr key={row.label} className="lt-pricing-compare-row">
                        <th scope="row">{row.label}</th>
                        <CompareCellView cell={row.basic} plan="basic" />
                        <CompareCellView cell={row.premium} plan="premium" />
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>

            <div className="lt-pricing-fairuse" data-testid="pricing-fair-use">
              <h3 className="lt-pricing-fairuse-title">{FAIR_USE_TITLE}</h3>
              <p className="lt-pricing-fairuse-text">{fairUseCopy()}</p>
            </div>
            <p className="lt-pricing-fine-print">
              {paymentsOn ? PRICING_FINE_PRINT_PAYMENTS_ON : PRICING_FINE_PRINT_PAYMENTS_OFF}
            </p>
          </section>

          <section className="lt-pricing-faq" aria-label="Pricing frequently asked questions">
            <h2 className="lt-pricing-faq-title">Frequently Asked Questions</h2>
            <div className="lt-pricing-faq-list">
              {faqItemsFor(paymentsOn).map(item => (
                <div key={item.q} className="lt-pricing-faq-item">
                  <div className="lt-pricing-faq-q">{item.q}</div>
                  <div className="lt-pricing-faq-a">{item.a}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="lt-pricing-coming" aria-label="Boards and classes coming soon">
            <h2 className="lt-pricing-coming-title">Coming Soon</h2>
            <p className="lt-pricing-coming-lede">
              We're expanding to more boards and classes. Join the waitlist to get early access.
            </p>
            <div className="lt-pricing-coming-chips">
              {BOARDS_COMING.map(b => (
                <span key={b.name} className="lt-pricing-coming-chip">
                  <span className="lt-pricing-coming-chip-icon" aria-hidden="true">{b.icon}</span>
                  <span>{b.name}</span>
                </span>
              ))}
            </div>
          </section>

          <section className="lt-pricing-waitlist" aria-label="Early access waitlist">
            {waitlistSubmitted ? (
              <div className="lt-pricing-waitlist-success" role="status" aria-live="polite">
                <span className="lt-pricing-waitlist-success-emoji" aria-hidden="true">🎉</span>
                <p className="lt-pricing-waitlist-success-title">You're on the waitlist!</p>
                <p className="lt-pricing-waitlist-success-sub">We'll notify you when we launch.</p>
              </div>
            ) : (
              <>
                <h2 className="lt-pricing-waitlist-title">Join the waitlist</h2>
                <p className="lt-pricing-waitlist-lede">
                  Tell us where to reach you and which board you're hoping for.
                  We'll let you know as soon as we open access.
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
                  <button
                    type="button"
                    className="lt-pricing-waitlist-cta"
                    onClick={handleWaitlistSubmit}
                  >
                    Join Waitlist
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* [FU-LEGAL-FOOTER-LINK] — /pricing is a public route with the global navbar
          suppressed (isPublicLandingRoute), so it had no route to the policies. A
          pricing surface in particular must reach Refunds and Terms. */}
      <PublicLegalFooter />
    </main>
  );
}
