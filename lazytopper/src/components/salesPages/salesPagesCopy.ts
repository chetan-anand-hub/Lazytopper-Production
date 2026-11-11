/**
 * PRICING-PAGES-1 (owner, 11 Nov 2026) - the copy of the two dedicated sales pages, /board-pass and /cbq-packs. Step 1 of the
 * owner-approved pricing redesign: each package gets its own page (the /pricing hub and the ad landings come later).
 *
 * Standing rules this copy keeps (pinned by BoardPassPage.test.tsx and CbqPacksPage.test.tsx): prices read "₹X + GST" and the Pay / Buy button names the
 * total; every figure comes from src/config/pricing, services/packs or lib/packs/packLabels (never typed here); no "AI" in selling
 * copy; never "answer key"; never "optional"; the parent route says "Forward", never "ask"; no refund promise; no crossed-out price.
 */
import { BOARD_PASS_NAME } from "../../config/pricing";
import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM, BUNDLE_NAME, CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM, REDOWNLOAD_UNTIL } from "../../lib/packs/packLabels";
import { CBQ_QUESTION_TYPES } from "../../lib/packs/cbqPackTypes";
import { packPriceLabel } from "../../services/packs";

/** The two new routes. Constants: never read from a URL. */
export const BOARD_PASS_PAGE_PATH = "/board-pass";
export const CBQ_PACKS_PAGE_PATH = "/cbq-packs";
/** The written-practice shop (the Bundle, Subject, Mock and Chapter Packs) stays on /packs. */
export const QUESTION_BANK_PAGE_PATH = "/packs";
export const MY_PACKS_PATH = "/packs#my-packs";
export const PRACTICE_PATH = "/practice-hub";

/* ── /board-pass ─────────────────────────────────────────────────────────── */

export const BP_EYEBROW = "BOARD PASS · CBSE CLASS 10 · BOARDS 2027";
export const BP_H1 = `${BOARD_PASS_NAME}: your answers marked like a CBSE examiner`;
export const BP_MINUTE_TILE = "1 MINUTE";
export const BP_MINUTE_STRONG = "CBSE-style marking of your answer";
export const BP_MINUTE_LINE = "Photograph your handwritten answer. See the marks for every step, like a CBSE examiner.";

/** Payments dark: /pricing's manual line, word for word (PricingPage PRICING_MANUAL_PAYMENTS_OFF; a test pins the two equal). */
export const BP_MANUAL_PAYMENTS_OFF = `Manual activation during beta. Payment checkout coming soon. The ${BOARD_PASS_NAME} is not activated automatically.`;

/** The line under Pay. Each clause is said only while it is TRUE for the build (as pricingPlansCopy.payLine does). */
export function bpPayLine(checkoutWho: boolean): string {
  const base = "One payment · nothing renews · UPI, card or netbanking";
  return checkoutWho ? `${base} · pay for yourself or your child` : base;
}

/** The number tiles: floors of the real bank (bankClaims.test.ts pins them). */
export const BP_TILES: ReadonlyArray<{ id: string; figure: string; label: string }> = [
  { id: "questions", figure: BANK_QUESTIONS_CLAIM, label: "questions with solutions" },
  { id: "cbqs", figure: BANK_CBQS_CLAIM, label: "CBQs" },
];

export const BP_TUTOR_TITLE = "Your personal tutor";
export const BP_TUTOR_BODY = "Knows your mistakes and explains the exact step you got wrong, any time.";

export const BP_WHAT_TITLE = "What you get";
export const BP_WHAT_YOU_GET: ReadonlyArray<{ id: string; kicker?: string; title: string; body: string }> = [
  {
    id: "checker",
    kicker: "THE MAIN THING",
    title: "Answer Checker",
    body: "Write on paper, take a photo. Every step is marked the way CBSE marks it, so you see which step lost the ½ mark.",
  },
  {
    id: "tests",
    title: "Graded chapter tests, full mocks and worksheets",
    body: "Chapter tests and full board-pattern mocks, each with a scorecard by section and question type.",
  },
  {
    id: "mi",
    title: "Mistake Intelligence",
    body: "Tells a careless slip from a concept gap, and shows the mistakes you keep repeating.",
  },
  {
    id: "tutor",
    title: "Personal tutor",
    body: "Knows your mistakes and explains the exact step you got wrong.",
  },
  {
    id: "bank",
    title: "Every question and solution",
    body: `Maths and Science, ${BANK_QUESTIONS_CLAIM} questions including ${BANK_CBQS_CLAIM} CBQs, till your boards.`,
  },
];

export const BP_OWNER_TITLE = `You have the ${BOARD_PASS_NAME}`;
export const BP_OWNER_PRACTICE = "Go to practice →";

export const PAPER_TITLE = "Add practice on paper";
export const PAPER_LINE = "The same questions, organised to print. Packs are bought separately.";
export const CBQ_PACKS_NAME = "CBQ Packs";
export const QUESTION_BANK_NAME = "Question Bank + Mocks";
/** "CBQ Packs · ₹199 + GST per subject →" - the price from the pack config. */
export function cbqPacksLinkPrice(): string {
  return `${packPriceLabel("pack_cbq")} per subject`;
}
/** "Bundle ₹299 + GST" - the price from the pack config. */
export function questionBankLinkPrice(): string {
  return `Bundle ${packPriceLabel("pack_bundle")}`;
}

/** /pricing's own answers, word for word (PricingPage FAQ_ITEMS "Is Basic really free?", pricingPlansCopy FAQ_SUBSCRIPTION). */
export const BP_FAQ_BASIC = {
  q: "What's free on Basic?",
  a: `Basic is free forever: study, practise and open papers without paying. Checked answers, your personal tutor and Mistake Intelligence come with the ${BOARD_PASS_NAME}.`,
} as const;

/* ── /cbq-packs ──────────────────────────────────────────────────────────── */

export const CBQ_EYEBROW = "CBQ PACKS · CBSE CLASS 10 · BOARDS 2027";
export const CBQ_H1 = "CBQ Packs: competency-based questions for Class 10 Maths and Science";
export const CBQ_LEDE = "Half your board paper is competency-based. Practise every type on paper.";
export const CBQ_TILES: ReadonlyArray<{ id: string; figure: string; label: string }> = [
  { id: "subject", figure: CBQ_SUBJECT_CLAIM, label: "in each subject pack" },
  { id: "chapter", figure: CBQ_CHAPTER_CLAIM, label: "chapter-wise and topic-wise" },
];
export const CBQ_INSIDE_TITLE = "What's inside";
export const CBQ_INSIDE: readonly string[] = [
  `Every question type: ${CBQ_QUESTION_TYPES.join(", ")}`,
  "Chapter-wise and topic-wise, Sections A to E",
  "Step-wise worked solutions, the way CBSE marks them",
  "A printable PDF with your name on every page",
  `Download again any time until ${REDOWNLOAD_UNTIL}`,
];
export const CBQ_MARKED_LINE = `Solve on paper, then get your answers marked like a CBSE examiner with the ${BOARD_PASS_NAME} →`;
/** "Question Bank + Mocks · from ₹49 + GST →" - the cheapest pack's price from the pack config. */
export function questionBankFromPrice(): string {
  return `from ${packPriceLabel("pack_chapter")}`;
}
export const CBQ_OWNED_LINK = "Open My packs →";
export { BUNDLE_NAME };

/** /packs' answers that apply to a CBQ pack, word for word (PacksPage.tsx FAQ). */
export interface SalesFaqItem {
  q: string;
  a: string;
  /** An internal link after the answer (the /packs answer's own link). */
  more?: { to: string; label: string };
}

export const CBQ_FAQ: ReadonlyArray<SalesFaqItem> = [
  {
    q: "Can I download again later?",
    a: `Yes. Download again any time until ${REDOWNLOAD_UNTIL}: sign in, open My packs and download any file as often as you like. Packs are for your own use; each PDF carries your name, or your email or masked phone number, on every page, so please don't share the files.`,
  },
  {
    q: "How is a pack different from the Board Pass?",
    a: `Packs are one-time and never renew. The ${BOARD_PASS_NAME} adds what a PDF can't: your answers marked step by step, Mistake Intelligence, the tutor for doubts and online timed tests.`,
  },
  {
    q: "What if a file doesn't open?",
    a: "Download it again from My packs; PDFs open in any PDF reader or in your browser.",
    more: { to: "/contact", label: "Still stuck? Contact us" },
  },
  {
    q: "Can I cancel after buying?",
    a: "All payments are final. LazyTopper does not give refunds.",
    more: { to: "/legal/refund", label: "Read the Cancellation Policy before you buy" },
  },
];
