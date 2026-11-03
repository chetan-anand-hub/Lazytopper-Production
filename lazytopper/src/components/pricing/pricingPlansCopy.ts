/**
 * pricingPlansCopy - PRICING-B-1 (owner-approved "Option B v3", 3 Nov 2026): every user-visible string the rebuilt /pricing shows,
 * in ONE place. A parent wrote "Sir what do we subscribe to? Exact packages pl guide. There are too many I think to choose from.",
 * so the page names ONE plan ("Board Pass"), two print products up front (CBQ Packs, the Bundle) and the rest one tap away.
 *
 * ★ NO PRICE, COUNT OR DATE IS TYPED HERE. Prices come from config/pricing.ts (the Board Pass) and services/packs (PACK_PRICE_INR,
 *   via packPriceLabel); counts from lib/packs/packLabels.ts; the re-download date from REDOWNLOAD_UNTIL (lane PACK-TERMS-1 owns its
 *   value). The price-literal guard (config/pricing.guard.test.ts) scans this file.
 * ★ ONE PRODUCT NAME. Every visible mention of the paid plan reads BOARD_PASS_NAME; "Premium" survives only in code and analytics.
 * ★ NO REFUND WORDING, ever (the policy's label is "Cancellation Policy").
 * ★ PURE: no React, no services that pull checkout code - the page, its tests and the sticky bar all import it.
 */
import { BOARD_PASS_NAME } from "../../config/pricing";
import { chaptersOfSubject, packPriceLabel, subjectLabel, subjectOfChapter, type PackSubject } from "../../services/packs";
import {
  BUNDLE_CHAPTERS,
  BUNDLE_MOCKS,
  BUNDLE_NAME,
  CBQ_MIN_PER_SUBJECT,
  isPreboardsSeason,
  MOCKS_PER_SUBJECT,
  PREBOARDS_PICK_BADGE,
  REDOWNLOAD_UNTIL,
} from "../../lib/packs/packLabels";
import { isCheckoutWhoClientEnabled } from "../../services/checkoutWhoFlag";

export { BOARD_PASS_NAME };

/* ── Header ──────────────────────────────────────────────────────────────── */

export const PRICING_H1 = "Plans and packs for the 2027 boards";
export const PRICING_BRAND = "LazyTopper";
export const PRICING_LOGIN_LABEL = "Log in";

/* ── Board Pass card ─────────────────────────────────────────────────────── */

export const START_HERE_BADGE = "START HERE";

/** The four ticks. The first carries the Answer Checker name in bold (`strong`), then the rest of the line. */
export const BOARD_PASS_TICKS: ReadonlyArray<{ id: string; strong?: string; text: string }> = [
  { id: "checker", strong: "Answer Checker", text: ": handwritten answers marked step by step, like a CBSE examiner" },
  { id: "graded", text: "Chapter tests, full mocks and worksheets graded" },
  { id: "mi", text: "Mistake Intelligence and an AI tutor that knows your mistakes" },
  { id: "all", text: "Every question and solution, till your boards" },
];

/** The word in front of "till your boards (Feb 2027)" beside the price. */
export const BOARD_PASS_ONCE = "once";

/** The trial action's label (same action and states as before; owner wording). */
export const TRIAL_LINK_LABEL = `Try the ${BOARD_PASS_NAME} free for 7 days`;

/** The parent-pay actions' labels on /pricing (the same actions as every paywall; owner wording for this page). */
export const FORWARD_TO_PARENTS_LABEL = "Forward link to parents";
export const SHARE_QR_LABEL = "Share QR code";

/** The line that sends a reader who wants paper down to the packs. Rendered in three parts so the middle can be bold. */
export const PAPER_TOO_LEAD = "Every question is here online.";
export const PAPER_TOO_ASK = "Prefer paper too?";
export const PAPER_TOO_REST = "CBQ Packs and the Bundle put them in print";

/**
 * VITE_CHECKOUT_WHO_ENABLED (lane CHECKOUT-WHO-1 ships the new "Who will use it?" checkout dark behind it). Only the COPY on
 * this page follows it: every Pay / Buy here already goes through the central buy paths (PassCheckout, the PacksShop buy),
 * which open the new checkout by themselves. ONE reader of the flag: the checkout's own (services/checkoutWho).
 */
export function isCheckoutWhoCopyOn(): boolean {
  return isCheckoutWhoClientEnabled();
}

/**
 * The line under Pay. Each clause is said only while it is TRUE for the build:
 *  - checkout-who on: anyone can pay for themselves or a child without signing up;
 *  - off: "pay with just your phone number" only while paying by phone (guest pay) is on, else dropped.
 */
export function payLine({ checkoutWho, guestPay }: { checkoutWho: boolean; guestPay: boolean }): string {
  const base = "One payment, not a subscription · UPI, card or netbanking";
  if (checkoutWho) return `${base} · pay for yourself or your child, no sign-up`;
  return guestPay ? `${base} · pay with just your phone number` : base;
}

/* ── CBQ Packs card ──────────────────────────────────────────────────────── */

export const CBQ_KICKER = "ON PAPER · MOST ASKED-FOR";
export const CBQ_TITLE = "CBQ Packs";
export const PER_SUBJECT = "per subject";
export const CBQ_BODY = `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ competency-based questions per subject (about half the board paper): case study, assertion-reason, source-based and more, with full solutions.`;
export const CBQ_NOT_IN_BUNDLE = "Not in the Bundle.";
export const SEE_INSIDE_LABEL = "See inside + free sample page";

export function cbqBuyLabel(s: PackSubject): string {
  return `${subjectLabel(s)} CBQ · ${packPriceLabel("pack_cbq")}`;
}

/* ── More printed practice (#packs) ──────────────────────────────────────── */

export const PACKS_TITLE = "More printed practice";
export const PACKS_SUB = `PDF packs · pay once · download till ${REDOWNLOAD_UNTIL}`;

/** "Pre-boards pick · both subjects" until the pre-board season ends (PREBOARDS_PICK_UNTIL), then the plain "Both subjects". */
export function bundleBadge(now: Date | number = Date.now()): string {
  return isPreboardsSeason(now) ? `${PREBOARDS_PICK_BADGE} · both subjects` : "Both subjects";
}
export const BUNDLE_BODY = `Both Subject Packs: all ${BUNDLE_CHAPTERS} chapters of chapter-wise questions + all ${BUNDLE_MOCKS} board mock papers. CBQ Packs are separate.`;
export const BUNDLE_BUY_LABEL = `Buy the Bundle · ${packPriceLabel("pack_bundle")}`;
export { BUNDLE_NAME };

export const CHAPTER_TITLE = "Chapter Pack";
export const CHAPTER_BODY = "One weak chapter: its important questions with the marking key.";
export function chapterBuyLabel(s: PackSubject): string {
  return `Choose a ${subjectLabel(s)} chapter · ${packPriceLabel("pack_chapter")}`;
}

export const ONE_SUBJECT_TITLE = "Only need one subject?";
export const ONE_SUBJECT_PRICES = `Subject ${packPriceLabel("pack_subject")} · Mock ${packPriceLabel("pack_mock")}`;
/** "For Maths (switch above)" on a phone; desktop names the card the switch is in. */
export function oneSubjectFor(s: PackSubject, desktop: boolean): string {
  return `For ${subjectLabel(s)} (${desktop ? "switch in the Chapter Pack card" : "switch above"})`;
}
export function subjectPackRow(s: PackSubject): { name: string; line: string; lineShort: string } {
  return {
    name: `${subjectLabel(s)} Subject Pack · ${packPriceLabel("pack_subject")}`,
    line: `${chaptersOfSubject(s).length} chapters of chapter-wise questions + ${MOCKS_PER_SUBJECT} mocks`,
    lineShort: `${chaptersOfSubject(s).length} chapters + ${MOCKS_PER_SUBJECT} mocks`,
  };
}
export function mockPackRow(s: PackSubject): { name: string; line: string; lineShort: string } {
  return {
    name: `${subjectLabel(s)} Mock Pack · ${packPriceLabel("pack_mock")}`,
    line: `${MOCKS_PER_SUBJECT} board-pattern mocks for 2027, with marking keys`,
    lineShort: `${MOCKS_PER_SUBJECT} board-pattern mocks for 2027`,
  };
}
export const ROW_BUY_LABEL = "Buy";
export const OWNED_LABEL = "You own this";
export const SUBJECT_SWITCH_LABEL = "Subject";

/* ── What you get with each ──────────────────────────────────────────────── */

export const WHAT_YOU_GET_TITLE = "What you get with each";
export const WHAT_YOU_GET_COLUMNS = [BOARD_PASS_NAME, "CBQ Pack", "Bundle"] as const;

export type WhatCell = { kind: "yes" } | { kind: "no" } | { kind: "text"; text: string } | { kind: "price"; text: string };

/** The rows, exactly as the prototype. `boardPassPrice` is the config's display price, read at render. */
export function whatYouGetRows(boardPassPrice: string): ReadonlyArray<{ label: string; cells: readonly [WhatCell, WhatCell, WhatCell] }> {
  const Y: WhatCell = { kind: "yes" };
  const N: WhatCell = { kind: "no" };
  return [
    { label: "Answers checked like a CBSE examiner", cells: [Y, N, N] },
    { label: "Graded tests, mocks, AI tutor", cells: [Y, N, N] },
    { label: "Practise on paper, offline", cells: [N, Y, Y] },
    {
      label: "What's inside",
      cells: [
        { kind: "text", text: "Everything, online" },
        { kind: "text", text: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+ CBQs, one subject` },
        { kind: "text", text: `${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks` },
      ],
    },
    {
      label: "Price",
      cells: [
        { kind: "price", text: boardPassPrice },
        { kind: "price", text: packPriceLabel("pack_cbq") },
        { kind: "price", text: packPriceLabel("pack_bundle") },
      ],
    },
  ];
}

export const BASIC_COMPARE_SUMMARY = "What's free on Basic?";
/** The folded Board Pass vs Basic table's plan column header (never "Premium"). */
export const COMPARE_BOARD_PASS_HEADER = BOARD_PASS_NAME;

/** Visible copy on this page never says "Premium": a shared compare/fair-use string that does is shown with the one name. */
export function asBoardPass(text: string): string {
  return text.replace(/\bPremium\b/g, BOARD_PASS_NAME);
}

/* ── Proof, FAQ, Basic ───────────────────────────────────────────────────── */

export const PROOF_TITLE = "See the Answer Checker at work";
export const FAQ_TITLE = "Questions parents ask";
export const FAQ_MORE_SUMMARY = "More questions";

export const FAQ_WHY_BOTH = {
  q: "Why both?",
  a: `They do different jobs. The ${BOARD_PASS_NAME} marks your child's written answers like a CBSE examiner. Packs are the same questions organised to print, for practice away from the screen.`,
} as const;
export const FAQ_SUBSCRIPTION = { q: "Is it a subscription?", a: "No. You pay once. Nothing renews." } as const;
export const FAQ_PAY_FOR_CHILD_Q = "Can I pay for my child?";
export function payForChildAnswer(checkoutWho: boolean): string {
  return checkoutWho
    ? "Yes. Tap any Pay or Buy button and enter the mobile number or email your child signs in with. No sign-up needed."
    : `Yes. Your child taps "${FORWARD_TO_PARENTS_LABEL}" on this page and sends you the link. You pay from it, with no sign-in, and the ${BOARD_PASS_NAME} goes straight onto their account.`;
}

export const BASIC_LINE_STRONG = "Basic: free forever";
/**
 * The prototype read "… and limited practice". Not shipped as typed: Basic's practice sets and worksheets are NOT limited (the
 * folded table on this page ticks them for Basic, and owner ruling #1190 bans an unbacked "limited" - pricingCompare.test.ts).
 * Flagged to the owner in the PR.
 */
export const BASIC_LINE_REST = ", with notes, NCERT solutions and practice sets";
export const START_FREE_LABEL = "Start free";

/* ── Sticky bar (phones) ─────────────────────────────────────────────────── */

export function stickyPassCopy(price: string): { label: string; button: string } {
  return { label: `${BOARD_PASS_NAME} ${price}`, button: `Pay ${price}` };
}
export function stickyCbqCopy(s: PackSubject): { label: string; button: string } {
  return { label: `${subjectLabel(s)} CBQ Pack ${packPriceLabel("pack_cbq")}`, button: `Buy ${packPriceLabel("pack_cbq")}` };
}

/* ── The subject the packs follow ────────────────────────────────────────── */

function onlyOne(q: URLSearchParams, key: string): string | null {
  const all = q.getAll(key);
  return all.length === 1 ? all[0] : null;
}

function asSubject(v: string | null | undefined): PackSubject | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s === "maths" || s === "math" || s === "mathematics") return "maths";
  if (s === "science") return "science";
  return subjectOfChapter(v.trim());
}

/**
 * The subject the URL names, or null. Order: `t` (the one-tap / resume target: a subject or a chapter), `subject`, `mock`,
 * `chapter` (its subject). Unknown or repeated values count as absent. utm_* and everything else are ignored.
 */
export function subjectFromSearch(search: string): PackSubject | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    return null;
  }
  for (const key of ["t", "subject", "mock", "chapter"]) {
    const s = asSubject(onlyOne(q, key));
    if (s) return s;
  }
  return null;
}

/**
 * The subject of the page the visitor came from (same-site referrer only): a `/maths/` or `/science/` path segment (any case,
 * e.g. /cbq-class-10/science/…, /highly-probable/10/Science) or a chapter slug (/notes/<chapter>). Null for anything else.
 */
export function subjectFromReferrer(referrer: string, origin: string): PackSubject | null {
  if (!referrer || !origin) return null;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  for (const seg of url.pathname.split("/").filter(Boolean)) {
    let decoded = seg;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      continue; // a malformed %-escape is not a subject
    }
    const s = asSubject(decoded);
    if (s) return s;
  }
  return null;
}

/** The student's last-used subject as the app stores it (`lazytopper.lastSubjectContext`, read only), or null. */
export function subjectFromStored(raw: string | null): PackSubject | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { subject?: unknown };
    return typeof parsed?.subject === "string" ? asSubject(parsed.subject) : null;
  } catch {
    return null;
  }
}

export const LAST_SUBJECT_KEY = "lazytopper.lastSubjectContext";
