/**
 * PRICING-HUB-1 (owner, 11 Nov 2026) - every string the three-card /pricing hub adds. The cards reuse the sales pages' and the
 * legacy page's own constants wherever the words already exist (one source each); only what is NEW to the hub lives here.
 *
 * ★ NO PRICE, COUNT OR DATE IS TYPED HERE. Prices come from src/config/pricing (the Board Pass) and services/packs (PACK_PRICE_INR,
 *   packPriceLabel / packPayLabel); counts from lib/packs/packLabels.ts (each pinned by a test on the real bank).
 * ★ Owner copy rules (11 Nov): "₹X + GST" with the total on the button; never "AI", "answer key", "optional", the word "ask" for the
 *   parent route, a refund promise, a crossed-out price or "save"; nothing that makes a card optional or pushes all three.
 * ★ PURE: no React, no services that pull checkout code.
 */
import { BOARD_PASS_NAME, formatInr, tillBoardsPriceInr } from "../../config/pricing";
import { PACK_PRICE_INR, packPayLabel, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import {
  BANK_CBQS_CLAIM,
  BANK_QUESTIONS_CLAIM,
  BUNDLE_CHAPTERS,
  BUNDLE_MOCKS,
  BUNDLE_QUESTIONS_CLAIM,
  CBQ_MIN_PER_CHAPTER,
  CBQ_SUBJECT_CLAIM,
  isPreboardsSeason,
} from "../../lib/packs/packLabels";
import { CBQ_QUESTION_TYPES } from "../../lib/packs/cbqPackTypes";
import { BP_MINUTE_LINE, BP_MINUTE_STRONG, BP_TUTOR_BODY, BP_TUTOR_TITLE, CBQ_PACKS_NAME, QUESTION_BANK_NAME } from "../../components/salesPages/salesPagesCopy";

export { BOARD_PASS_NAME, CBQ_PACKS_NAME, QUESTION_BANK_NAME };

/** Header eyebrow (the H1 stays PRICING_H1, unchanged: SEO and ads). */
export const HUB_EYEBROW = "CBSE CLASS 10 · BOARDS 2027";

/** The three cards, in the owner's order. `id` is the card's element id (kept from the legacy page: inbound links use them). */
export type HubCardKey = "pass" | "cbq" | "bank";
export const HUB_CARD_ORDER: readonly HubCardKey[] = ["pass", "cbq", "bank"];
export const HUB_CARD_ID: Readonly<Record<HubCardKey, string>> = { pass: "lt-premium-card", cbq: "cbq", bank: "packs" };
export const HUB_CARD_NAME: Readonly<Record<HubCardKey, string>> = { pass: BOARD_PASS_NAME, cbq: CBQ_PACKS_NAME, bank: QUESTION_BANK_NAME };
/** The phone tabs' short names ("Question Bank" fits a 104 px tab at 320 px). */
export const HUB_TAB_NAME: Readonly<Record<HubCardKey, string>> = { pass: BOARD_PASS_NAME, cbq: CBQ_PACKS_NAME, bank: "Question Bank" };

/** The tab's price: the bare base figure (the caption says "+ GST"). The Board Pass figure follows the date: read after mount. */
export function hubTabPrice(key: HubCardKey, now: Date | number = Date.now()): string {
  if (key === "pass") return formatInr(tillBoardsPriceInr(now));
  return formatInr(key === "cbq" ? PACK_PRICE_INR.pack_cbq : PACK_PRICE_INR.pack_bundle);
}
export const HUB_TABS_CAPTION = "3 options · tap or swipe · all prices + GST";
export const HUB_TABS_LABEL = "Plans and packs";
/** "1 of 3 · next: CBQ Packs →" (the last card names the first again, so the line never dead-ends). */
export function hubPositionLine(index: number): string {
  const total = HUB_CARD_ORDER.length;
  const next = HUB_CARD_ORDER[(index + 1) % total];
  return `${index + 1} of ${total} · next: ${HUB_TAB_NAME[next]}`;
}

/* ── Card 1: Board Pass ─────────────────────────────────────────────────── */

export const HUB_PASS_TAG = "ONLINE · ANSWERS MARKED";
export const HUB_PASS_MINUTE_FIGURE = "1";
export const HUB_PASS_MINUTE_UNIT = "MINUTE";
export { BP_MINUTE_STRONG as HUB_PASS_MINUTE_STRONG, BP_MINUTE_LINE as HUB_PASS_MINUTE_LINE };
/** Number tiles: the SAME pinned constants /board-pass uses (bankClaims.test.ts counts the real bank). */
export const HUB_PASS_TILES: ReadonlyArray<{ id: string; figure: string; label: string }> = [
  { id: "questions", figure: BANK_QUESTIONS_CLAIM, label: "questions with solutions" },
  { id: "cbqs", figure: BANK_CBQS_CLAIM, label: "CBQs, every type" },
];
export const HUB_PASS_TUTOR_STRONG = `${BP_TUTOR_TITLE}.`;
export const HUB_PASS_TUTOR_BODY = BP_TUTOR_BODY;
export const HUB_PASS_TICKS: ReadonlyArray<{ id: string; strong?: string; text: string }> = [
  { id: "graded", text: "Chapter tests, full mocks and worksheets graded" },
  { id: "mi", strong: "Mistake Intelligence:", text: " shows the mistakes you repeat" },
];
/** Under the Pay button (owner wording, 11 Nov). */
export const HUB_PASS_PAYLINE = "One payment · nothing renews · UPI, card or netbanking";
export const HUB_PASS_DETAILS = `See everything in the ${BOARD_PASS_NAME} →`;
export const HUB_PASS_OWNED = `You have the ${BOARD_PASS_NAME}`;
export const HUB_PASS_OWNED_GO = "Go to practice →";

/* ── Card 2: CBQ Packs ──────────────────────────────────────────────────── */

export const HUB_CBQ_TAG = "ON PAPER · MOST ASKED-FOR";
export const HUB_CBQ_HERO = "Half your board paper is competency-based. Practise every type.";
export const HUB_CBQ_TILES: ReadonlyArray<{ id: string; figure: string; label: string }> = [
  { id: "subject", figure: CBQ_SUBJECT_CLAIM, label: "in each subject pack" },
  { id: "chapter", figure: `${CBQ_MIN_PER_CHAPTER}+`, label: "in every chapter" },
];
export const HUB_CBQ_TICKS: readonly string[] = [
  `Every type: ${CBQ_QUESTION_TYPES.join(", ")}`,
  "Step-wise worked solutions",
  "Printable PDF, your name on every page",
];
export function hubCbqPrice(): string {
  return packPriceLabel("pack_cbq");
}
export const HUB_CBQ_PRICE_META = "per subject · pay once";
/** "Maths · ₹235" - the button names the total charged; the aria-label names the pack. */
export function hubCbqBuyLabel(s: PackSubject): string {
  return `${subjectLabel(s)} · ${packPayLabel("pack_cbq")}`;
}
export function hubCbqBuyAria(s: PackSubject): string {
  return `Buy ${subjectLabel(s)} CBQ Pack, ${packPayLabel("pack_cbq")}`;
}
export const HUB_CBQ_NOT_IN_BUNDLE = "Not in the Bundle.";
export const HUB_CBQ_DETAILS = "See inside + free sample page →";

/* ── Card 3: Question Bank + Mocks ──────────────────────────────────────── */

/** "ON PAPER · PRE-BOARDS PICK" while the pre-boards season constant is on, then "ON PAPER". */
export function hubBankTag(now: Date | number = Date.now()): string {
  return isPreboardsSeason(now) ? "ON PAPER · PRE-BOARDS PICK" : "ON PAPER";
}
export const HUB_BANK_HERO = "Every chapter and full board papers, ready to print.";
export const HUB_BANK_TILES: ReadonlyArray<{ id: string; figure: string; label: string }> = [
  { id: "chapters", figure: String(BUNDLE_CHAPTERS), label: "chapters, Maths + Science" },
  { id: "mocks", figure: String(BUNDLE_MOCKS), label: "board-pattern mock papers" },
];
export const HUB_BANK_CLAIM_FIGURE = BUNDLE_QUESTIONS_CLAIM;
export const HUB_BANK_CLAIM_REST = " questions in the Bundle";
export function hubBankTicks(): readonly string[] {
  return [
    "Sit a full paper before your pre-board, with the marking guide",
    "Worked solutions, step by step",
    `Smaller packs: chapter ${formatInr(PACK_PRICE_INR.pack_chapter)} · mocks ${formatInr(PACK_PRICE_INR.pack_mock)} · subject ${formatInr(PACK_PRICE_INR.pack_subject)} (+ GST)`,
  ];
}
export function hubBankPrice(): string {
  return packPriceLabel("pack_bundle");
}
export const HUB_BANK_PRICE_META = "Bundle, both subjects · pay once";
export const HUB_BANK_SEPARATE = "CBQ Packs are separate.";
export function hubBankDetails(): string {
  return `See all packs, from ${formatInr(PACK_PRICE_INR.pack_chapter)} →`;
}

/** A pack owner's way to the downloads (the hub hides the embedded My packs block; /packs#my-packs is where they live). */
export const HUB_OPEN_MY_PACKS = "Open My packs →";

/* ── Folded rows ────────────────────────────────────────────────────────── */

export const HUB_FOLD_COMPARE = "Compare all three";
export const HUB_FOLD_VIDEO = "See the Answer Checker at work";

/* ── Phone bar ──────────────────────────────────────────────────────────── */

/** The Bundle bar's words ("Maths + Science Bundle ₹299 + GST" / "Buy ₹353"). */
export function hubBundleStickyCopy(name: string): { label: string; button: string } {
  return { label: `${name} ${packPriceLabel("pack_bundle")}`, button: `Buy ${packPayLabel("pack_bundle")}` };
}
