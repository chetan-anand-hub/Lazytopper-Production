/**
 * PRICING-LIGHT-1 (owner ruling L4, Oct 2026): what each plan gives, in ONE place.
 *
 * The /pricing cards ("Basic includes:" and "Everything in Basic, plus:"), the "Compare
 * plans" table and the "Fair use, shown not hidden" box all read this module. It
 * supersedes the earlier rule that kept limit wording off the cards (P5): a plan that
 * hides its limits reads as less honest than one that shows them.
 *
 * ★ NO NUMBER IS RETYPED HERE THAT HAS A SOURCE ELSEWHERE.
 *   - Prices come from `pricing.ts` (the price-literal guard scans this file too).
 *   - Basic's daily paper opens come from `mockViewLimits.ts`, the constants
 *     MockViewGate enforces.
 *   - The trial's fair-use numbers below ARE a copy, because the source is server code
 *     (`server/services/fairUse.cjs` DEFAULT_LIMITS / AI_DEFAULT_LIMITS) that the client
 *     bundle must not import. `pricingCompare.parity.test.ts` re-reads the server values
 *     and turns red when the two disagree.
 *
 * ★ NO UNBACKED "LIMITED" (owner ruling on #1190, Oct 2026). P20 found no enforced free
 * limit on practice or worksheet generation, so Basic does not claim one: those rows are
 * ticks for both plans. A Basic "Limited" may only come back with a NUMBER interpolated
 * from a real, enforced constant (pinned by pricingCompare.test.ts).
 *
 * ⚠ NO RUPEE FIGURE IN THE FAIR-USE COPY, EVER. The server's premium windows are
 * measured in rupees of model cost; the student sees usage bars, never that unit.
 *
 * Keep this module import-light: the pricing page is a public, prerendered route.
 */
import {
  FOUNDING_OFFER_OPEN,
  PRICE_FREE_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
} from "./pricing";
import { ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT } from "./mockViewLimits";

/* ── The trial's fair-use allowances (mirror of the server defaults) ─────────── */

/**
 * Each key names the server constant it mirrors. Pinned by
 * pricingCompare.parity.test.ts against `fairUse.cjs`.
 */
export const TRIAL_FAIR_USE = Object.freeze({
  /** DEFAULT_LIMITS.trialChecksPerDay */
  checksPerDay: 5,
  /** DEFAULT_LIMITS.trialChapterTestsPerDay */
  chapterTestsPerDay: 1,
  /** AI_DEFAULT_LIMITS.trialTutorPerDay */
  tutorMessagesPerDay: 15,
  /** DEFAULT_LIMITS.trialMocksPerWeek */
  mocksPerWeek: 1,
  /** DEFAULT_LIMITS.trialWorksheetsPerWeek */
  worksheetGradingsPerWeek: 1,
});

export type TrialFairUse = { readonly [K in keyof typeof TRIAL_FAIR_USE]: number };

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const FAIR_USE_TITLE = "Fair use, shown not hidden";

/** The fair-use box sentence, composed from the allowances (a parameter so a test can feed a fixture). */
export function fairUseCopy(limits: TrialFairUse = TRIAL_FAIR_USE): string {
  return (
    "Premium has generous fair-use limits so the service stays fast for everyone. " +
    "Your usage bars show what is left and when each one resets — every 5 hours, every day and every week. " +
    `The 7-day trial includes, each day: ${count(limits.checksPerDay, "answer check", "answer checks")}, ` +
    `${count(limits.chapterTestsPerDay, "chapter test", "chapter tests")} and ` +
    `${count(limits.tutorMessagesPerDay, "tutor message", "tutor messages")}; and each week: ` +
    `${count(limits.mocksPerWeek, "full mock", "full mocks")} and ` +
    `${count(limits.worksheetGradingsPerWeek, "worksheet grading", "worksheet gradings")}.`
  );
}

/* ── The two plan cards ───────────────────────────────────────────────────────── */

export interface PlanItem {
  id: string;
  label: string;
  /** Shown only while the signed-out free answer check is on (today's free-check condition). */
  onlyWithFreeCheck?: boolean;
  /** A substring of `label` rendered as an internal link. */
  link?: { text: string; to: string };
}

export const BASIC_INCLUDES_HEAD = "Basic includes:";

export const BASIC_INCLUDES: readonly PlanItem[] = [
  { id: "trends", label: "Exam Trends — chapters ranked from ten years of papers" },
  { id: "notes", label: "Notes, formulae, NCERT books and solutions" },
  { id: "practice", label: "Practice sets and worksheet generation" },
  {
    id: "papers",
    label: `Open or download ${SIGNED_IN_DAILY_MOCK_LIMIT} chapter tests or mocks a day (${ANON_DAILY_MOCK_LIMIT} when signed out)`,
  },
  {
    id: "free-check",
    label: "Your first answer check free",
    onlyWithFreeCheck: true,
    link: { text: "answer check", to: "/check-improve" },
  },
  { id: "insights", label: "Basic topic insights" },
];

export const BASIC_FOOTNOTE = "Written answers on tests and mocks are not checked on Basic.";

export const PREMIUM_PLUS_HEAD = "Everything in Basic, plus:";

export const PREMIUM_PLUS: readonly PlanItem[] = [
  {
    id: "check-improve",
    label: "Check & Improve — photograph your handwritten answer, marked step by step like a board examiner",
  },
  { id: "graded", label: "Chapter tests, full mocks and worksheets graded, not just downloaded" },
  { id: "tutor", label: "Your AI tutor that knows your chapters, your mistakes, your pace" },
  { id: "mi", label: "Mistake Intelligence — why you lose marks, not just where" },
  // Opens are uncapped for Premium (MockViewGate: "Premium is unlimited and never reaches
  // this."). Fair use limits GRADING, not opening, so this one claim is true as worded.
  { id: "papers", label: "Unlimited chapter tests and mocks to open or download" },
  { id: "progress", label: "Progress that tells you what to fix next" },
];

export const PREMIUM_FOOTNOTE = "Not sure yet? Sign in and Premium is free for 7 days — no card needed.";

/* ── The "Compare plans" table ────────────────────────────────────────────────── */

export const COMPARE_TITLE = "Compare plans";
export const COMPARE_FEATURE_HEADER = "What you get";
export const COMPARE_BASIC_HEADER = `Basic · ${PRICE_FREE_DISPLAY}`;

/** "Premium · from ₹599" — follows the founding switch, so it is never a stale figure. */
export function comparePremiumHeader(offerOpen: boolean = FOUNDING_OFFER_OPEN): string {
  return `Premium · from ${offerOpen ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY}`;
}

/**
 * A cell: "yes" renders a tick (with optional words after it, "✓ Full"); "no" renders a
 * dash; "text" renders the words alone.
 */
export type CompareCell =
  | { kind: "yes"; note?: string }
  | { kind: "no" }
  | { kind: "text"; text: string };

export interface CompareRow {
  label: string;
  basic: CompareCell;
  premium: CompareCell;
}

export interface CompareSection {
  title: string;
  rows: readonly CompareRow[];
}

const YES: CompareCell = { kind: "yes" };
const NO: CompareCell = { kind: "no" };
const text = (t: string): CompareCell => ({ kind: "text", text: t });
const yesNote = (note: string): CompareCell => ({ kind: "yes", note });

/**
 * The table, resolved for one render. `freeCheck` is the same condition as the Basic
 * card's free-check row: when the signed-out free answer check is not on for this
 * visitor, Basic's answer-checking cell is a dash, never a promise they cannot use.
 */
export function compareSections({ freeCheck }: { freeCheck: boolean }): readonly CompareSection[] {
  return [
    {
      title: "Study",
      rows: [
        { label: "Exam Trends — chapters ranked from ten years of papers", basic: YES, premium: YES },
        { label: "Notes, formulae, NCERT books and solutions", basic: YES, premium: YES },
        { label: "CBSE 2027 papers and circulars", basic: YES, premium: YES },
      ],
    },
    {
      title: "Practice",
      rows: [
        { label: "Practice sets with model answers", basic: YES, premium: YES },
        { label: "Worksheets built from your chosen topics", basic: YES, premium: YES },
        { label: "New questions like the one you got wrong", basic: NO, premium: YES },
      ],
    },
    {
      title: "Tests & papers",
      rows: [
        {
          label: "Open or download chapter tests and full mocks",
          basic: text(`${SIGNED_IN_DAILY_MOCK_LIMIT} a day (${ANON_DAILY_MOCK_LIMIT} signed out)`),
          premium: yesNote("Unlimited"),
        },
        { label: "Chapter tests, mocks and worksheets graded", basic: NO, premium: YES },
      ],
    },
    {
      title: "Answer checking",
      rows: [
        {
          label: "Photograph your handwritten answer and get it marked",
          basic: freeCheck ? text("First check free") : NO,
          premium: YES,
        },
        { label: "Step marks, CBSE keywords and units, the way examiners mark", basic: NO, premium: YES },
        { label: "Read questions straight from your photo", basic: NO, premium: YES },
      ],
    },
    {
      title: "Coaching",
      rows: [
        { label: "AI tutor that knows your chapters and mistakes", basic: NO, premium: YES },
        { label: "Mistake Intelligence — why you lose marks", basic: NO, premium: YES },
        { label: "Progress and what to fix next", basic: text("Basic insights"), premium: yesNote("Full") },
      ],
    },
    {
      title: "Limits",
      rows: [
        {
          label: "Fair use",
          basic: NO,
          premium: text("Usage bars · reset every 5 hours, day and week"),
        },
      ],
    },
  ];
}
