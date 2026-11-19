/**
 * PRICING-HUB-1 (owner, 11 Nov 2026) - every string the /pricing hub adds (four cards since PRICING-4CARD-1, 18 Nov 2026). The cards reuse the sales pages' and the
 * legacy page's own constants wherever the words already exist (one source each); only what is NEW to the hub lives here.
 *
 * ★ NO PRICE, COUNT OR DATE IS TYPED HERE. Prices come from src/config/pricing (the Board Pass) and services/packs (PACK_PRICE_INR,
 *   packPriceLabel / packPayLabel); counts from lib/packs/packLabels.ts (each pinned by a test on the real bank).
 * ★ Owner copy rules (11 Nov): "₹X + GST" with the total on the button; never "AI", "answer key", "optional", the word "ask" for the
 *   parent route, a refund promise, a crossed-out price or "save"; nothing that makes a card optional or pushes all three.
 * ★ PURE: no React, no services that pull checkout code.
 */
import { BOARD_PASS_NAME, formatInr, tillBoardsPriceInr } from "../../config/pricing";
import { PACK_PRICE_INR, isTestSeriesPackOffered, packBaseInr, packPayLabel, packPriceLabel, subjectLabel, type PackSubject } from "../../services/packs";
import { subjectPackRow } from "../../components/pricing/pricingPlansCopy";
import {
  BANK_CBQS_CLAIM,
  BANK_QUESTIONS_CLAIM,
  BUNDLE_CHAPTERS,
  BUNDLE_MOCKS,
  BUNDLE_QUESTIONS_CLAIM,
  CBQ_MIN_PER_CHAPTER,
  CBQ_SUBJECT_CLAIM,
  isPreboardsSeason,
  MOCKS_PER_SUBJECT,
  REDOWNLOAD_UNTIL,
} from "../../lib/packs/packLabels";
import { CBQ_QUESTION_TYPES } from "../../lib/packs/cbqPackTypes";
import { BP_MINUTE_LINE, BP_MINUTE_STRONG, BP_TUTOR_BODY, BP_TUTOR_TITLE, CBQ_PACKS_NAME, QUESTION_BANK_NAME } from "../../components/salesPages/salesPagesCopy";
import {
  SERIES_MOCKS_PER_SUBJECT,
  TEST_SERIES_BUY_PATH,
  TEST_SERIES_PATH,
  seriesTotals,
  type SeriesTotals,
} from "../../lib/testSeries/testSeries";
import { FREE_TESTS_ALLOWED } from "../../lib/testSeries/seriesAccess";

export { BOARD_PASS_NAME, CBQ_PACKS_NAME, QUESTION_BANK_NAME };

/** Header eyebrow (the H1 stays PRICING_H1, unchanged: SEO and ads). */
export const HUB_EYEBROW = "CBSE CLASS 10 · BOARDS 2027";

/** The Test Series card's name (the product is the "Pre-Boards Test Series"; the card, its tab and its buttons say "Test Series"). */
export const TEST_SERIES_CARD_NAME = "Test Series";

/**
 * The four cards, in the owner's order (PRICING-4CARD-1, owner 18 Nov 2026 22:02 IST: "4 cards, Test Series second"): the ONLINE pair
 * (Board Pass, Test Series), then the ON PAPER pair (CBQ Packs, Question Bank + Mocks). `id` is the card's element id - the three
 * legacy ids are kept (inbound links use them); the Test Series card is `#test-series`.
 */
export type HubCardKey = "pass" | "ts" | "cbq" | "bank";
export const HUB_CARD_ORDER: readonly HubCardKey[] = ["pass", "ts", "cbq", "bank"];
export const HUB_CARD_ID: Readonly<Record<HubCardKey, string>> = { pass: "lt-premium-card", ts: "test-series", cbq: "cbq", bank: "packs" };
export const HUB_CARD_NAME: Readonly<Record<HubCardKey, string>> = {
  pass: BOARD_PASS_NAME,
  ts: TEST_SERIES_CARD_NAME,
  cbq: CBQ_PACKS_NAME,
  bank: QUESTION_BANK_NAME,
};
/** The phone tabs' short names (two words each, so a tab may wrap to two lines at 320 px and never cuts a word). */
export const HUB_TAB_NAME: Readonly<Record<HubCardKey, string>> = { pass: BOARD_PASS_NAME, ts: TEST_SERIES_CARD_NAME, cbq: CBQ_PACKS_NAME, bank: "Question Bank" };

/** The two groups the cards fall into, shown as labels (tabs on phones, above each pair on tablet and desktop). */
export type HubGroupKey = "online" | "paper";
export const HUB_GROUPS: ReadonlyArray<{ key: HubGroupKey; label: string; cards: readonly HubCardKey[] }> = [
  { key: "online", label: "Online", cards: ["pass", "ts"] },
  { key: "paper", label: "On paper", cards: ["cbq", "bank"] },
];

/** The tab's price: the bare base figure (the caption says "+ GST"). The Board Pass figure follows the date: read after mount. */
export function hubTabPrice(key: HubCardKey, now: Date | number = Date.now()): string {
  if (key === "pass") return formatInr(tillBoardsPriceInr(now));
  if (key === "ts") return formatInr(packBaseInr("test_series", now));
  return formatInr(key === "cbq" ? PACK_PRICE_INR.pack_cbq : PACK_PRICE_INR.pack_bundle);
}
/** "4 options · tap or swipe · all prices + GST" - the count is the card list's own length. */
export const HUB_TABS_CAPTION = `${HUB_CARD_ORDER.length} options · tap or swipe · all prices + GST`;
export const HUB_TABS_LABEL = "Plans and packs";
/** "1 of 4 · next: Test Series →" (the last card names the first again, so the line never dead-ends). */
export function hubPositionLine(index: number): string {
  const total = HUB_CARD_ORDER.length;
  const next = HUB_CARD_ORDER[(index + 1) % total];
  return `${index + 1} of ${total} · next: ${HUB_TAB_NAME[next]}`;
}

/* ── Card 1: Board Pass ─────────────────────────────────────────────────── */

export const HUB_PASS_TAG = "ONLINE · EVERYTHING CHECKED";
export const HUB_PASS_MINUTE_FIGURE = "1";
export const HUB_PASS_MINUTE_UNIT = "MINUTE";
export { BP_MINUTE_STRONG as HUB_PASS_MINUTE_STRONG, BP_MINUTE_LINE as HUB_PASS_MINUTE_LINE };
/** Number tiles: the SAME pinned constants /board-pass uses (bankClaims.test.ts counts the real bank). */
export const HUB_PASS_TILES: ReadonlyArray<{ id: string; figure: string; label: string }> = [
  // PRICING-HUB-2 H1 (owner 11 Nov 23:14): the pass's bank reads as ONLINE practice, the Bundle's as print - two different things.
  { id: "questions", figure: BANK_QUESTIONS_CLAIM, label: "questions online, with solutions" },
  { id: "cbqs", figure: BANK_CBQS_CLAIM, label: "CBQs, every type" },
];
export const HUB_PASS_TUTOR_STRONG = `${BP_TUTOR_TITLE}.`;
export const HUB_PASS_TUTOR_BODY = BP_TUTOR_BODY;
export const HUB_PASS_TICKS: ReadonlyArray<{ id: string; strong?: string; text: string }> = [
  { id: "graded", text: "Chapter tests, full mocks and worksheets graded" },
  { id: "mi", strong: "Mistake Intelligence:", text: " shows the mistakes you repeat" },
];
export const HUB_PASS_DETAILS = `See everything in the ${BOARD_PASS_NAME} →`;
export const HUB_PASS_OWNED = `You have the ${BOARD_PASS_NAME}`;
export const HUB_PASS_OWNED_GO = "Go to practice →";

/* ── Card 2: Test Series (PRICING-4CARD-1) ──────────────────────────────── */

/**
 * ★ Every count is the series config's own (lib/testSeries/testSeries.ts: the syllabus chapter keys and SERIES_MOCKS_PER_SUBJECT);
 *   the price is the `test_series` SKU's (TS-PACK-1: services/packs.ts PACK_PRICE_INR / packPriceLabel), shown exactly as the other
 *   pack cards show theirs ("₹999 + GST"). Nothing is typed here.
 * ★ Truth (owner rulings 18 Nov 19:38-19:44): the series is chapter tests + full mocks with written answers checked, the scorecard and
 *   after-test analysis, and the graded sheet to download; NO tutor and NO Answer Checker (both are the Board Pass's).
 */
export const HUB_TS_TAG = "ONLINE · TESTS CHECKED";
export const HUB_TS_NEW = "NEW";
export function hubTsHeadline(t: SeriesTotals = seriesTotals()): { chapter: string; full: string; rest: string } {
  return {
    chapter: `${t.chapterTests} chapter tests`,
    full: `${t.fullMocks} full-length board papers`,
    rest: " — your written answers checked step by step",
  };
}
/** The headline as one line ("130 chapter tests + 50 full-length board papers — your written answers checked step by step"). */
export function hubTsHeadlineText(t: SeriesTotals = seriesTotals()): string {
  const h = hubTsHeadline(t);
  return `${h.chapter} + ${h.full}${h.rest}`;
}
export const HUB_TS_TICKS: ReadonlyArray<{ id: string; text: string }> = [
  { id: "analysis", text: "Full scorecard and after-test analysis: weakest chapters, time per question, mistake notebook" },
  { id: "sheet", text: "Your graded answer sheet to download" },
  { id: "calendar", text: "Your pre-boards calendar" },
];
export const HUB_TS_UPSELL_Q = "Want the tutor and Answer Checker too?";
export const HUB_TS_UPSELL_GO = `${BOARD_PASS_NAME} →`;
export function hubTsPrice(): string {
  return packPriceLabel("test_series");
}
export const HUB_TS_PRICE_META = "till your boards · pay once";
export const HUB_TS_BUY = `Get the ${TEST_SERIES_CARD_NAME}`;
/** "See all 180 tests →" - the total is the config's. */
export function hubTsDetails(t: SeriesTotals = seriesTotals()): string {
  return `See all ${t.total} tests →`;
}
export const HUB_TS_DETAILS_PATH = TEST_SERIES_PATH;
/** A Board Pass holder already has every test: no Buy, a way in instead (the /test-series page says the same). */
export const HUB_TS_PASS_INCLUDED = "Included in your Board Pass";
export const HUB_TS_PASS_GO = `Open the ${TEST_SERIES_CARD_NAME} →`;
/** Desktop / tablet "What's inside" (the band beside the taller Board Pass card): per subject, from the config. */
export const HUB_TS_INSIDE_TITLE = "Inside the series";
export function hubTsInsideRows(t: SeriesTotals = seriesTotals()): ReadonlyArray<{ id: string; name: string; line: string }> {
  return (["Maths", "Science"] as const).map((s) => ({
    id: s.toLowerCase(),
    name: s,
    line: `${t.chapterTestsPerSubject[s]} chapter tests + ${SERIES_MOCKS_PER_SUBJECT} full-length papers`,
  }));
}
export const HUB_TS_TRY_LINE = `Try ${FREE_TESTS_ALLOWED === 1 ? "one test" : `${FREE_TESTS_ALLOWED} tests`} first: its MCQs are marked free.`;

/**
 * Where "Get the Test Series" goes: the same link /test-series uses, or - while TS-PACK-1's client kill switch is on
 * (VITE_TS_PACK_DISABLED=1, services/packs.ts isTestSeriesPackOffered) - the series page. The card itself always shows.
 */
export function hubTsBuyPath(): string {
  return isTestSeriesPackOffered() ? TEST_SERIES_BUY_PATH : TEST_SERIES_PATH;
}
export const HUB_TS_OWNED = `${TEST_SERIES_CARD_NAME} · You own this`;
/** The phone bar's words for the Test Series card. */
export function hubTsStickyCopy(): { label: string; button: string } {
  return { label: `${TEST_SERIES_CARD_NAME} ${hubTsPrice()}`, button: HUB_TS_BUY };
}

/* ── Card 3: CBQ Packs ──────────────────────────────────────────────────── */

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
/**
 * Desktop "What's inside" (the band beside the taller Board Pass card): every line is existing, already-true copy - the question
 * types (cbqPackTypes), "chapter-wise and topic-wise" + "1- to 5-mark questions" (CbqBand.tsx / CbqPacksPage.tsx) and the
 * re-download date (REDOWNLOAD_UNTIL).
 */
export const HUB_CBQ_INSIDE_TITLE = "What's inside";
export const HUB_CBQ_INSIDE_CHIPS: readonly string[] = CBQ_QUESTION_TYPES;
export const HUB_CBQ_INSIDE_LINES: readonly string[] = [
  "Chapter-wise and topic-wise · 1- to 5-mark questions",
  `Download again any time until ${REDOWNLOAD_UNTIL}`,
];
export const HUB_CBQ_DETAILS = "See inside + free sample page →";

/* ── Card 4: Question Bank + Mocks ──────────────────────────────────────── */

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
export const HUB_BANK_CLAIM_REST = " questions to print in the Bundle";
export function hubBankTicks(): readonly string[] {
  return [
    "Sit a full paper before your pre-board, with the marking guide",
    "Worked solutions, step by step",
    `Smaller packs: chapter ${formatInr(PACK_PRICE_INR.pack_chapter)} · mocks ${formatInr(PACK_PRICE_INR.pack_mock)} · subject ${formatInr(PACK_PRICE_INR.pack_subject)} (+ GST)`,
  ];
}
/**
 * Desktop "Smaller packs" rows (the band beside the taller Board Pass card): links to the matching /packs pop-up (packEntry.ts
 * contract: ?pack=subject&subject=, ?mock=, ?pack=chapter), never a buy path of their own. Prices from the pack config, counts from
 * the pack constants. The name and the price sit in separate spans (the prerender price guard reads "<Pack name> ₹" as a claim).
 */
export function hubBankRows(s: PackSubject): ReadonlyArray<{ id: string; name: string; price: string; line: string; to: string }> {
  return [
    { id: "subject", name: "Subject Pack", price: packPriceLabel("pack_subject"), line: subjectPackRow(s).lineShort, to: `/packs?pack=subject&subject=${s}` },
    { id: "mock", name: "Mock Pack", price: packPriceLabel("pack_mock"), line: `${MOCKS_PER_SUBJECT} board-pattern mocks`, to: `/packs?mock=${s}` },
    { id: "chapter", name: "Chapter Pack", price: packPriceLabel("pack_chapter"), line: "one chapter", to: "/packs?pack=chapter" },
  ];
}
export const HUB_BANK_ROWS_TITLE = "Smaller packs";

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

export const HUB_FOLD_COMPARE = `Compare all ${["one", "two", "three", "four", "five"][HUB_CARD_ORDER.length - 1] ?? HUB_CARD_ORDER.length}`;
export const HUB_FOLD_VIDEO = "See the Answer Checker at work";

/* ── Phone bar ──────────────────────────────────────────────────────────── */

/** The Bundle bar's words ("Maths + Science Bundle ₹299 + GST" / "Buy ₹353"). */
export function hubBundleStickyCopy(name: string): { label: string; button: string } {
  return { label: `${name} ${packPriceLabel("pack_bundle")}`, button: `Buy ${packPayLabel("pack_bundle")}` };
}
