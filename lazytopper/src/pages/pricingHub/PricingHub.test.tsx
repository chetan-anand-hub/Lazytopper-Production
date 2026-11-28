/**
 * PRICING-HUB-1 (owner, 11 Nov 2026) - /pricing as three cards; four since PRICING-4CARD-1 (18 Nov 2026, Test Series second). Rendered through the REAL route component (PricingPage) with the kill
 * switch off (VITE_PRICING_HUB_DISABLED stubbed to ""), so these tests exercise exactly what production mounts.
 *
 * Proves: the kill switch; every account state the legacy page handles (§0a.3); every inbound link (§0a.4); every Buy goes through the
 * legacy page's own buy path (PassCheckout / the embedded PacksShop) with the legacy events; the copy rules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T12:00:00+05:30"));
});

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));

type Sub = {
  status: Record<string, unknown>;
  hydrated: boolean;
  isTrialActive: boolean;
  daysLeftInTrial: number;
  startTrial: ReturnType<typeof vi.fn>;
};
const sub = vi.hoisted(() => ({ value: null as unknown as Sub }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => sub.value }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  hydrateSubscriptionFromCloud: vi.fn(async () => ({})),
}));

const monthBuyer = vi.hoisted(() => ({ on: false }));
vi.mock("../../components/pricing/useMonthPassAvailable", () => ({
  useMonthPassAvailable: () => monthBuyer.on,
  fetchMonthPassAvailable: async () => monthBuyer.on,
  resetMonthPassAvailableForTests: () => undefined,
}));

const pay = vi.hoisted(() => ({ buyPass: vi.fn() }));
vi.mock("../../services/checkout", async (orig) => ({
  ...(await orig<typeof import("../../services/checkout")>()),
  buyPass: (...a: unknown[]) => pay.buyPass(...a),
  authHeaders: async () => ({ Authorization: "Bearer t" }),
}));

const owned = vi.hoisted(() => ({ packs: [] as Array<{ sku: string; target: string }> }));
const buyPack = vi.hoisted(() =>
  vi.fn(async (..._a: unknown[]): Promise<{ status: "dismissed" | "paid" | "pending"; orderId?: string }> => ({ status: "dismissed" })),
);
const packsOn = vi.hoisted(() => ({ on: true }));
/** PRICING-CTA-UP-1: the server's TS-UPGRADE-CREDIT-1 upgrade for a Test Series owner (null for everyone else). */
const tsUp = vi.hoisted(() => ({ value: null as null | { creditInr: number; fullBaseInr: number; baseInr: number; gstInr: number; payInr: number } }));
const checkOrder = vi.hoisted(() => vi.fn(async (..._a: unknown[]): Promise<{ state: string }> => ({ state: "pending" })));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => packsOn.on,
    fetchMyPacks: vi.fn(async () => ({
      packs: owned.packs.map((p, i) => ({ packId: `${p.sku}:${p.target}`, sku: p.sku, target: p.target, paidAt: 1_700_000_000_000 + i })),
      licensee: { name: "Asha", email: "a@b.in" },
      boardPassCredit: null,
      ...(tsUp.value ? { testSeriesUpgrade: tsUp.value } : {}),
    })),
    buyPack,
    checkPackOrder: (...a: unknown[]) => checkOrder(...a),
  };
});
const tracked = vi.hoisted(() => ({ checkout: vi.fn(), event: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", async (orig) => {
  const actual = await orig<typeof import("../../lib/packs/packAnalytics")>();
  return { ...actual, trackPackCheckout: tracked.checkout, trackPackEvent: tracked.event, trackPackPurchase: vi.fn() };
});
const analytics = vi.hoisted(() => ({ paywall: vi.fn(), named: vi.fn() }));
vi.mock("../../analytics/analytics", async (orig) => {
  const actual = await orig<typeof import("../../analytics/analytics")>();
  return { ...actual, trackPaywallAction: analytics.paywall, trackNamedEvent: analytics.named };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../PackDialog", () => ({
  default: (p: { sku: string; subject: string; chapter: string; buy: unknown; onClose: () => void }) => (
    <div role="dialog" data-testid="pack-dialog" data-sku={p.sku} data-subject={p.subject} data-chapter={p.chapter}>
      {p.buy as never}
      <button type="button" data-testid="pack-dialog-close" onClick={p.onClose}>Close</button>
    </div>
  ),
}));

import PricingPage from "../PricingPage";
import { cardForHash, hashCard, initialCard, nearestCard, savedCard, HUB_CARD_STATE_KEY } from "./PricingHub";
import { hubBankTag, hubPositionLine, hubTabPrice } from "./hubCopy";
import { HUB_CSS } from "./pricingHubCss";
import { stripAuthChrome, countResidualAuthNodes } from "../../../scripts/seo/captureStaticBodies";
import { REDOWNLOAD_UNTIL } from "../../lib/packs/packLabels";
import { CBQ_QUESTION_TYPES } from "../../lib/packs/cbqPackTypes";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM, BUNDLE_QUESTIONS_CLAIM, CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
import { boardPassPayDisplay, boardPassPriceDisplay } from "../../config/pricing";
import { PACK_PRICE_INR, isTestSeriesPackOffered, packPayLabel, packPriceLabel } from "../../services/packs";
import { FOUNDER_BADGE_TEXT } from "../../components/brand/FounderBadge";
import { PRICING_H1 } from "../../components/pricing/pricingPlansCopy";
import { SERIES_MOCKS_PER_SUBJECT, TEST_SERIES_BUY_PATH, seriesChapterTests, seriesTotals } from "../../lib/testSeries/testSeries";
import {
  HUB_CARD_ORDER,
  HUB_GROUPS,
  hubTsBuyPath,
  hubTsDetails,
  hubTsHeadlineText,
  hubTsInsideRows,
} from "./hubCopy";
import { WHAT_YOU_GET_COLUMNS, whatYouGetRows, whatYouGetRows4 } from "../../components/pricing/pricingPlansCopy";

/** TS-PACK-1: the Test Series price is the `test_series` SKU's. */
const TEST_SERIES_PRICE_INR = PACK_PRICE_INR.test_series;
const DAY = 86_400_000;
const FREE = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null };
function setSub(status: Record<string, unknown>, extra: Partial<Sub> = {}) {
  sub.value = { status: { ...FREE, ...status }, hydrated: true, isTrialActive: false, daysLeftInTrial: 0, startTrial: vi.fn(), ...extra };
}

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}${l.hash}`}</div>;
}
async function renderAt(url: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/pricing" element={<><PricingPage /><Where /></>} />
          <Route path="/login" element={<Where />} />
          <Route path="/packs" element={<Where />} />
          <Route path="/for-parents" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
const where = () => screen.getByTestId("where").textContent ?? "";
const card = (k: "pass" | "ts" | "cbq" | "bank") => screen.getByTestId(`hub-card-${k}`);

Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.stubEnv("VITE_PRICING_HUB_DISABLED", "");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  auth.user = null;
  owned.packs = [];
  tsUp.value = null;
  packsOn.on = true;
  monthBuyer.on = false;
  setSub({}, { hydrated: false });
  pay.buyPass.mockReset();
  pay.buyPass.mockImplementation(() => new Promise(() => undefined));
  buyPack.mockClear();
  tracked.checkout.mockClear();
  tracked.event.mockClear();
  analytics.paywall.mockClear();
  analytics.named.mockClear();
  localStorage.clear();
  sessionStorage.clear();
  // H2 keeps the selected card in window.history.state; MemoryRouter does not reset jsdom's shared history between tests.
  window.history.replaceState(null, "");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("§0a.1 kill switch", () => {
  it("unset -> the hub; VITE_PRICING_HUB_DISABLED=1 -> the legacy page, unchanged; any other value -> the hub", async () => {
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-hub")).toBeInTheDocument();
    expect(screen.queryByTestId("pricing-board-pass")).toBeNull();
    cleanup();
    vi.stubEnv("VITE_PRICING_HUB_DISABLED", "true"); // only "1" kills it (the documented value)
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-hub")).toBeInTheDocument();
    cleanup();
    vi.stubEnv("VITE_PRICING_HUB_DISABLED", "1");
    await renderAt("/pricing");
    expect(screen.queryByTestId("pricing-hub")).toBeNull();
    expect(screen.getByTestId("pricing-board-pass")).toBeInTheDocument();
    // The comparison is written inline so the production build drops the page it does not render.
    const src = readFileSync(resolve(process.cwd(), "src/pages/PricingPage.tsx"), "utf8");
    expect(src).toContain('if (import.meta.env.VITE_PRICING_HUB_DISABLED !== "1") return <PricingHub');
  });
});

describe("the page, top to bottom (§2)", () => {
  it("header: eyebrow, the SAME H1, the founder badge; no subline; the countdown strip; four cards in the DOM in order", async () => {
    await renderAt("/pricing");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(PRICING_H1);
    expect(PRICING_H1).toBe("Plans and packs for the 2027 boards");
    expect(screen.getByText("CBSE CLASS 10 · BOARDS 2027")).toBeInTheDocument();
    expect(screen.getByTestId("founder-badge")).toHaveTextContent(FOUNDER_BADGE_TEXT);
    expect(screen.getByTestId("boards-countdown-slot")).toBeInTheDocument();
    const body = document.body.textContent ?? "";
    for (const gone of ["Pick where you want to start", "Three ways to prepare", "take them together", "take one"]) expect(body).not.toContain(gone);
    const cards = Array.from(screen.getByTestId("hub-cards").querySelectorAll(":scope > [data-card]")).map((c) => c.id);
    expect(cards).toEqual(["lt-premium-card", "cbq", "test-series", "packs"]);
  });

  it("Board Pass card: 1 MINUTE hero, the pinned bank claims, tutor, ticks, price from config, Pay, payline, trial, details link", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); the v1.1 face is pinned below.
    await renderAt("/pricing");
    const c = card("pass");
    expect(within(c).getByText("START HERE")).toBeInTheDocument();
    expect(within(c).getByTestId("hub-pass-minute")).toHaveTextContent("1MINUTE1 minute: CBSE-style marking of your answerPhotograph your handwritten answer. See the marks for every step, like a CBSE examiner.");
    expect(within(c).getByTestId("hub-pass-tile-questions")).toHaveTextContent(`${BANK_QUESTIONS_CLAIM}questions online, with solutions`);
    expect(within(c).getByTestId("hub-pass-tile-cbqs")).toHaveTextContent(`${BANK_CBQS_CLAIM}CBQs, every type`);
    expect(BANK_CBQS_CLAIM).toBe("2,800+");
    expect(within(c).getByTestId("hub-pass-tutor")).toHaveTextContent("Your personal tutor. Knows your mistakes and explains the exact step you got wrong, any time.");
    expect(c).toHaveTextContent("Chapter tests, full mocks and worksheets graded");
    expect(c).toHaveTextContent("Mistake Intelligence: shows the mistakes you repeat");
    expect(within(c).getByTestId("till-boards-figures")).toHaveTextContent(boardPassPriceDisplay());
    expect(within(c).queryByTestId("till-boards-deadline")).toBeNull(); // PRICE-HOLD-1: no deadline line
    const payBtn = c.querySelector(".lt-pricing-pay--boards") as HTMLButtonElement;
    expect(payBtn.textContent).toBe(`Pay ${boardPassPayDisplay()} once · valid till 28 Feb 2027`);
    expect(within(c).getByTestId("pricing-payline")).toHaveTextContent("One payment, not a subscription · UPI, card or netbanking");
    expect(within(c).getByTestId("pricing-trial")).toBeInTheDocument();
    expect(within(c).getByTestId("hub-pass-details")).toHaveAttribute("href", "/board-pass");
  });

  it("CBQ card: hero, claims, ticks, price + GST, two Buys naming the total, 'Not in the Bundle.', details link", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); the v1.1 face is pinned below.
    await renderAt("/pricing");
    const c = card("cbq");
    expect(c).toHaveTextContent("ON PAPER · MOST ASKED-FOR");
    expect(c).toHaveTextContent("Half your board paper is competency-based. Practise every type.");
    expect(within(c).getByTestId("hub-cbq-tile-subject")).toHaveTextContent(`${CBQ_SUBJECT_CLAIM}in each subject pack`);
    expect(within(c).getByTestId("hub-cbq-tile-chapter")).toHaveTextContent("100+in every chapter");
    expect(c).toHaveTextContent("Step-wise worked solutions");
    expect(c).toHaveTextContent("Printable PDF, your name on every page");
    expect(within(c).getByTestId("hub-cbq-price")).toHaveTextContent(packPriceLabel("pack_cbq"));
    expect(within(c).getByTestId("hub-buy-pack_cbq-maths")).toHaveTextContent(`Maths · ${packPayLabel("pack_cbq")}`);
    expect(within(c).getByTestId("hub-buy-pack_cbq-science")).toHaveTextContent(`Science · ${packPayLabel("pack_cbq")}`);
    expect(within(c).getByTestId("hub-cbq-not-in-bundle")).toHaveTextContent("Not in the Bundle.");
    expect(within(c).getByTestId("hub-cbq-details")).toHaveAttribute("href", "/cbq-packs");
  });

  it("Question Bank card: season tag, tiles, the pinned Bundle claim, ticks with config prices, Bundle Buy, separate line, details", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); the v1.1 face is pinned below.
    await renderAt("/pricing");
    const c = card("bank");
    expect(within(c).getByTestId("hub-bank-tag")).toHaveTextContent(hubBankTag());
    expect(hubBankTag(new Date("2026-12-01T00:00:00+05:30"))).toBe("ON PAPER · PRE-BOARDS PICK");
    expect(hubBankTag(new Date("2026-12-21T00:00:00+05:30"))).toBe("ON PAPER");
    expect(within(c).getByTestId("hub-bank-tile-chapters")).toHaveTextContent("26chapters, Maths + Science");
    expect(within(c).getByTestId("hub-bank-tile-mocks")).toHaveTextContent("16board-pattern mock papers");
    expect(within(c).getByTestId("hub-bank-claim")).toHaveTextContent(`${BUNDLE_QUESTIONS_CLAIM} questions to print in the Bundle`);
    expect(c).toHaveTextContent("Smaller packs: chapter ₹49 · mocks ₹99 · subject ₹199 (+ GST)");
    expect(within(c).getByTestId("hub-bank-price")).toHaveTextContent(packPriceLabel("pack_bundle"));
    expect(within(c).getByTestId("hub-buy-pack_bundle")).toHaveTextContent(`Buy the Bundle · ${packPayLabel("pack_bundle")}`);
    expect(within(c).getByTestId("hub-bank-separate")).toHaveTextContent("CBQ Packs are separate.");
    expect(within(c).getByTestId("hub-bank-details")).toHaveAttribute("href", "/packs");
  });

  it("tabs: four real buttons with aria-pressed; caption; pager '1 of 4 · next: CBQ Packs'; a tab tap selects its card", async () => {
    await renderAt("/pricing");
    const tabs = within(screen.getByTestId("hub-tabs")).getAllByRole("button");
    expect(tabs.map((t) => t.textContent)).toEqual([
      `Board Pass${hubTabPrice("pass")}`,
      `CBQ Packs${hubTabPrice("cbq")}`,
      `Test Series${hubTabPrice("ts")}`,
      `Question Bank${hubTabPrice("bank")}`,
    ]);
    expect(hubTabPrice("cbq")).toBe("₹199");
    expect(hubTabPrice("ts")).toBe(`₹${TEST_SERIES_PRICE_INR}`);
    expect(tabs.map((t) => t.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false"]);
    expect(tabs.map((t) => t.getAttribute("aria-controls"))).toEqual(["lt-premium-card", "cbq", "test-series", "packs"]);
    expect(screen.getByText("4 options · tap or swipe · all prices + GST")).toBeInTheDocument();
    expect(screen.getByTestId("hub-position")).toHaveTextContent("1 of 4 · next: CBQ Packs");
    fireEvent.click(tabs[1]);
    expect(screen.getByTestId("hub-position")).toHaveTextContent("2 of 4 · next: Test Series");
    fireEvent.click(tabs[3]);
    expect(tabs.map((t) => t.getAttribute("aria-pressed"))).toEqual(["false", "false", "false", "true"]);
    expect(screen.getByTestId("hub-position")).toHaveTextContent("4 of 4 · next: Board Pass");
    // Four dots, one per card.
    expect(screen.getByTestId("hub-pager").querySelectorAll(".lt-ph-dot")).toHaveLength(4);
  });

  it("folded rows: compare (table + Basic + fair use), the video (id pricing-video), the FAQ - all content in the DOM", async () => {
    await renderAt("/pricing");
    const compare = screen.getByTestId("hub-fold-compare");
    expect(compare.tagName).toBe("DETAILS");
    expect(within(compare).getByTestId("pricing-what-table")).toBeInTheDocument();
    expect(within(compare).getByTestId("pricing-compare")).toBeInTheDocument();
    expect(within(compare).getByTestId("pricing-fair-use")).toBeInTheDocument();
    expect(within(screen.getByTestId("hub-fold-video")).getByRole("heading", { name: "Where did his ½ mark go?" }).id).toBe("pricing-video");
    const faq = screen.getByTestId("pricing-faq");
    expect(faq).toHaveTextContent("Is it a subscription?");
    expect(within(faq).getByTestId("pricing-faq-more")).toHaveTextContent("Is Basic really free?");
    expect(screen.getByTestId("pricing-basic-line")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-otherboards")).toBeInTheDocument();
    expect(document.querySelector("footer.lt-public-legal")).not.toBeNull();
  });

  it("copy rules: no AI / answer key / optional / refund / save / strike-through inside the cards", async () => {
    await renderAt("/pricing");
    const text = screen.getByTestId("hub-cards").textContent ?? "";
    for (const bad of [/\bAI\b/, /answer key/i, /optional/i, /refund/i, /\bsave\b/i, /\bask\b/i]) expect(text).not.toMatch(bad);
    expect(screen.getByTestId("hub-cards").querySelector("s, del, strike")).toBeNull();
  });
});

describe("§0a.3 account states", () => {
  it("signed out: Log in, the trial carries the intent to sign-in, Start free; no parent share", async () => {
    await renderAt("/pricing");
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByTestId("pricing-parent-share")).toBeNull();
    fireEvent.click(screen.getByTestId("pricing-trial"));
    expect(where()).toBe(`/login?reason=start-trial&redirect=${encodeURIComponent("/pricing")}`);
  });

  it("signed in, trial eligible: one explicit tap starts it (trial_start), never on mount", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    expect(sub.value.startTrial).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("pricing-trial"));
    expect(sub.value.startTrial).toHaveBeenCalledTimes(1);
    expect(analytics.named).toHaveBeenCalledWith("trial_start");
    expect(screen.getByTestId("pricing-trial-state")).toHaveTextContent("Your 3-day trial has started");
  });

  it("trial active / trial used: the state line, no trial button", async () => {
    auth.user = { uid: "u1" };
    setSub({ tier: "trial", trialStartDate: new Date(Date.now() - DAY).toISOString() }, { isTrialActive: true, daysLeftInTrial: 6 });
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-trial-state")).toHaveTextContent("Your trial is active — 6 days left.");
    cleanup();
    setSub({ trialStartDate: new Date(Date.now() - 20 * DAY).toISOString() });
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-trial-state")).toHaveTextContent("You've used your free trial.");
    expect(screen.queryByTestId("pricing-trial")).toBeNull();
  });

  it("Basic, parent pay on: 'Forward link to parents' beside Pay", async () => {
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    auth.user = { uid: "u1" };
    setSub({ trialStartDate: new Date(Date.now() - 20 * DAY).toISOString() });
    await renderAt("/pricing");
    expect(within(card("pass")).getByTestId("pricing-parent-share")).toBeInTheDocument();
  });

  it("month-pass holder: the month block shows; ?buy=board_pass starts the upgrade checkout", async () => {
    auth.user = { uid: "u1" };
    monthBuyer.on = true;
    setSub({ tier: "premium", plan: "pass_month", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: new Date(Date.now() + 3 * DAY).toISOString() });
    await renderAt("/pricing?buy=board_pass");
    expect(within(card("pass")).getByText("Month pass")).toBeInTheDocument();
    expect(pay.buyPass).toHaveBeenCalledTimes(1);
    expect(where()).toBe("/pricing");
  });

  it("Board Pass owner: no price, no Pay, owned state + practice link; the pack cards still sell; no trial", async () => {
    auth.user = { uid: "u1" };
    setSub({ tier: "premium", plan: "pass_till_boards", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: "2027-02-17T18:29:59.999Z" });
    await renderAt("/pricing");
    const c = card("pass");
    expect(within(c).getByTestId("hub-pass-owned")).toHaveTextContent("You have the Board Pass");
    expect(within(c).getByTestId("hub-pass-owned-go")).toHaveAttribute("href", "/practice-hub");
    expect(within(c).queryByTestId("till-boards-figures")).toBeNull();
    expect(within(c).queryByTestId("pricing-payline")).toBeNull();
    expect(c.querySelector(".lt-pricing-pay--boards")).toBeNull();
    expect(within(c).queryByTestId("pricing-trial")).toBeNull();
    expect(screen.getByTestId("hub-buy-pack_cbq-maths")).toBeInTheDocument();
    expect(screen.getByTestId("hub-buy-pack_bundle")).toBeInTheDocument();
  });

  it("pack owner: the owned card says so + 'Open My packs'; the other subject still sells; no embedded My packs block", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    owned.packs = [{ sku: "pack_cbq", target: "maths" }];
    await renderAt("/pricing");
    expect(await screen.findByTestId("hub-buy-pack_cbq-maths-owned")).toHaveTextContent("Maths CBQ · You own this");
    expect(screen.getByTestId("hub-buy-pack_cbq-science")).toBeInTheDocument();
    expect(screen.getByTestId("hub-cbq-my-packs")).toHaveAttribute("href", "/packs#my-packs");
    expect(screen.queryByTestId("hub-bank-my-packs")).toBeNull();
    expect(screen.queryByTestId("packs-mine")).toBeNull();
    cleanup();
    owned.packs = [{ sku: "pack_bundle", target: "all" }];
    await renderAt("/pricing");
    expect(await screen.findByTestId("hub-buy-pack_bundle-owned")).toBeInTheDocument();
    expect(screen.getByTestId("hub-bank-my-packs")).toHaveAttribute("href", "/packs#my-packs");
  });

  it("payments off: the legacy manual line, no Pay, no payline, no phone bar", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "");
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-manual")).toHaveTextContent("Manual activation during beta.");
    expect(document.querySelector(".lt-pricing-pay--boards")).toBeNull();
    expect(screen.queryByTestId("pricing-payline")).toBeNull();
    expect(screen.queryByTestId("pricing-sticky-bar")).toBeNull();
  });

  it("packs dark: the pack Buys open the pop-up, never a checkout", async () => {
    packsOn.on = false;
    await renderAt("/pricing");
    fireEvent.click(screen.getByTestId("hub-buy-pack_cbq-science"));
    expect(await screen.findByTestId("pack-dialog")).toHaveAttribute("data-sku", "pack_cbq");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-subject", "science");
    expect(buyPack).not.toHaveBeenCalled();
  });

  it("?t= parent token (#pp=) -> ParentPayPanel, not the hub", async () => {
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    await renderAt(`/pricing#pp=${"a".repeat(43)}`);
    expect(screen.queryByTestId("pricing-hub")).toBeNull();
  });

  it("ReturnContextBar for source=login (with a carried redirect) and none for other sources; ParentReturnLink for from=for_parents", async () => {
    await renderAt("/pricing?source=login&redirect=%2Fcheck-improve");
    fireEvent.click(screen.getByRole("button", { name: /Back to sign in/ }));
    expect(where()).toBe(`/login?redirect=${encodeURIComponent("/check-improve")}`);
    cleanup();
    for (const s of ["bottom-nav", "account-menu", "trial-end", "sidebar", "lock", "upgrade-sheet"]) {
      await renderAt(`/pricing?source=${s}&returnTo=%2Fme`);
      expect(screen.queryByRole("button", { name: /Back to/ })).toBeNull();
      expect(screen.getByTestId("pricing-hub")).toBeInTheDocument();
      cleanup();
    }
    await renderAt("/pricing?from=for_parents");
    expect(screen.getByTestId("parent-return")).toHaveAttribute("href", "/for-parents");
    expect(screen.getByTestId("parent-return-cbq")).toBeInTheDocument();
    expect(screen.getByTestId("parent-return-packs")).toBeInTheDocument();
    expect(screen.getByTestId("hub-pass-details")).toHaveAttribute("href", "/board-pass?from=for_parents");
  });
});

describe("§0a.4 inbound links", () => {
  it("#cbq / #packs / #lt-premium-card select their card (and the tab); the pure helpers agree", async () => {
    expect([cardForHash("#cbq"), cardForHash("#packs"), cardForHash("#lt-premium-card"), cardForHash(""), cardForHash("#pricing-video")]).toEqual([1, 3, 0, 0, 0]);
    expect(cardForHash("#test-series")).toBe(2);
    await renderAt("/pricing#cbq");
    expect(screen.getByTestId("hub-tab-cbq")).toHaveAttribute("aria-pressed", "true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    cleanup();
    await renderAt("/pricing?from=for_parents#packs");
    expect(screen.getByTestId("hub-tab-bank")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("parent-return-packs")).toBeInTheDocument();
    cleanup();
    await renderAt("/pricing?from=for_parents#cbq");
    expect(screen.getByTestId("hub-tab-cbq")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("parent-return-cbq")).toBeInTheDocument();
  });

  it("#my-packs -> /packs#my-packs (replace), utm kept", async () => {
    await renderAt("/pricing?utm_source=email#my-packs");
    expect(where()).toBe("/packs?utm_source=email#my-packs");
  });

  it("#pricing-video opens the video row", async () => {
    await renderAt("/pricing#pricing-video");
    expect((screen.getByTestId("hub-fold-video") as HTMLDetailsElement).open).toBe(true);
  });

  it("?chapter= / ?pack=cbq&subject= / ?mock= / ?pack=subject open the same pop-up on /pricing (one step from Buy)", async () => {
    await renderAt("/pricing?chapter=electricity");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-sku", "pack_chapter");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-chapter", "electricity");
    cleanup();
    await renderAt("/pricing?pack=cbq&subject=science");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-sku", "pack_cbq");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-subject", "science");
    cleanup();
    await renderAt("/pricing?mock=maths");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-sku", "pack_mock");
    cleanup();
    await renderAt("/pricing?pack=subject&subject=maths");
    expect(screen.getByTestId("pack-dialog")).toHaveAttribute("data-sku", "pack_subject");
  });

  it("signed-in ?buy=pack_cbq&t=science resumes the CBQ checkout and cleans the URL", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing?buy=pack_cbq&t=science&utm_source=google");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(buyPack).toHaveBeenCalledWith("pack_cbq", "science", expect.anything());
    expect(where()).not.toContain("buy=");
  });

  it("?buy=board_pass signed in (Basic) starts the Board Pass checkout once and cleans the URL, utm kept", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing?buy=board_pass&utm_source=google");
    expect(pay.buyPass).toHaveBeenCalledTimes(1);
    expect(where()).toBe("/pricing?utm_source=google");
  });
});

describe("every Buy is the legacy buy path, with the legacy events (§3)", () => {
  it("Pay tap = paywall_action {pay, pricing}; pack_view is sent once with surface 'pricing'", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    expect(tracked.event).toHaveBeenCalledWith("pack_view", undefined, "pricing");
    fireEvent.click(document.querySelector(".lt-pricing-pay--boards") as HTMLButtonElement);
    expect(analytics.paywall).toHaveBeenCalledWith("pay", "pricing");
  });

  it.each([
    ["hub-buy-pack_cbq-maths", "pack_cbq", "maths"],
    ["hub-buy-pack_cbq-science", "pack_cbq", "science"],
    ["hub-buy-pack_bundle", "pack_bundle", undefined],
  ] as const)("signed in: %s -> buyPack(%s, %s)", async (id, sku, target) => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    await act(async () => {
      fireEvent.click(screen.getByTestId(id));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(buyPack).toHaveBeenCalledWith(sku, target, expect.anything());
    expect(tracked.checkout).toHaveBeenCalled();
  });

  it.each([
    ["hub-buy-pack_cbq-science", "/pricing?buy=pack_cbq&t=science"],
    ["hub-buy-pack_bundle", "/pricing?buy=pack_bundle"],
  ] as const)("signed out (checkout sheet off): %s -> sign in, then resume %s", async (id, resume) => {
    await renderAt("/pricing");
    await act(async () => {
      fireEvent.click(screen.getByTestId(id));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(buyPack).not.toHaveBeenCalled();
    const w = where();
    expect(w.startsWith("/login")).toBe(true);
    expect(decodeURIComponent(new URLSearchParams(w.split("?")[1]).get("redirect") ?? "")).toBe(resume);
  });

  it("the phone bar follows the selected card: Board Pass -> CBQ (the subject the page follows) -> Bundle; it taps the card's own Buy", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing?subject=science");
    // On screen from hydration, no scroll needed (round 2 R2).
    const bar = () => screen.getByTestId("pricing-sticky-bar");
    expect(bar()).toHaveTextContent(`Board Pass ${boardPassPriceDisplay()}`);
    fireEvent.click(screen.getByTestId("hub-tab-cbq"));
    expect(bar()).toHaveTextContent(`Science CBQ Pack ${packPriceLabel("pack_cbq")}`);
    await act(async () => {
      fireEvent.click(screen.getByTestId("pricing-sticky-bar-go"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(buyPack).toHaveBeenCalledWith("pack_cbq", "science", expect.anything());
    fireEvent.click(screen.getByTestId("hub-tab-bank"));
    expect(bar()).toHaveTextContent(`Buy ${packPayLabel("pack_bundle")}`);
  });
});

describe("round 2", () => {
  it("R2: the phone bar is never in the prerender - the capture's strip removes it (clock-figure wrapper)", async () => {
    await renderAt("/pricing");
    const main = screen.getByTestId("pricing-hub");
    expect(within(main).getByTestId("pricing-sticky-bar")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-sticky-bar").closest('[data-testid="till-boards-figures"]')).not.toBeNull();
    stripAuthChrome(main);
    expect(within(main).queryByTestId("pricing-sticky-bar")).toBeNull();
    expect(countResidualAuthNodes(main)).toBe(0);
    // The cards and their Buys survive the strip.
    expect(within(main).getByTestId("hub-buy-pack_cbq-maths")).toBeInTheDocument();
  });

  it("R1: desktop extras - CBQ 'What's inside' and the smaller-pack rows linking to their /packs pop-ups (no buy path)", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); the v1.1 face is pinned below.
    await renderAt("/pricing?subject=science&from=for_parents");
    const inside = screen.getByTestId("hub-cbq-inside");
    expect(inside).toHaveTextContent("What's inside");
    expect(inside).toHaveTextContent("Chapter-wise and topic-wise · 1- to 5-mark questions");
    expect(inside).toHaveTextContent(`Download again any time until ${REDOWNLOAD_UNTIL}`);
    expect(Array.from(inside.querySelectorAll("li")).map((li) => li.textContent)).toEqual([...CBQ_QUESTION_TYPES]);
    const rows = screen.getByTestId("hub-bank-rows");
    expect(within(rows).getByTestId("hub-bank-row-subject")).toHaveTextContent(`Subject Pack${packPriceLabel("pack_subject")}13 chapters + 8 mocks`);
    expect(within(rows).getByTestId("hub-bank-row-subject")).toHaveAttribute("href", "/packs?pack=subject&subject=science&from=for_parents");
    expect(within(rows).getByTestId("hub-bank-row-mock")).toHaveTextContent(`Mock Pack${packPriceLabel("pack_mock")}8 board-pattern mocks`);
    expect(within(rows).getByTestId("hub-bank-row-mock")).toHaveAttribute("href", "/packs?mock=science&from=for_parents");
    expect(within(rows).getByTestId("hub-bank-row-chapter")).toHaveTextContent(`Chapter Pack${packPriceLabel("pack_chapter")}one chapter`);
    expect(within(rows).getByTestId("hub-bank-row-chapter")).toHaveAttribute("href", "/packs?pack=chapter&from=for_parents");
    expect(rows.querySelector("button")).toBeNull();
    // Desktop-only by CSS (phones would push Buy down); the duplicate "Smaller packs" tick is phone-only.
    expect(HUB_CSS).toMatch(/\.lt-ph-extra \{\s*display: none;/);
    expect(document.querySelectorAll('[data-testid="hub-card-bank"] .lt-ph-phone-only')).toHaveLength(1);
  });

  it("R3: the WhatsApp button is moved clear of the cards on hub phones (page-level rule)", () => {
    expect(HUB_CSS).toMatch(/body:has\(\.lt-ph\) \.lt-wa-fab \{\s*width: 44px;\s*height: 44px;\s*right: 4px;/);
  });

  it("R4 / GUEST-WALL: the Basic line, limits on, states no download and no checking (owner ruling 26 Nov 2026)", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    await renderAt("/pricing");
    const line = screen.getByTestId("pricing-basic-line");
    expect(line).toHaveTextContent("Basic: free forever, with notes, NCERT solutions and practice sets");
    expect(line.textContent).not.toMatch(/download|marking|limited/i);
  });
});

describe("PRICING-HUB-2 H5 - the hub itself (production default) for the page-level rules", () => {
  it("the legal footer is on the hub, with the policies and Contact", async () => {
    await renderAt("/pricing");
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    for (const [label, href] of [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["Cancellation Policy", "/legal/refund"], ["Contact", "/contact"]]) {
      expect(within(foot).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("the inbound ids are on their cards (the three legacy ids kept; the Test Series card is #test-series)", async () => {
    await renderAt("/pricing");
    expect(document.getElementById("lt-premium-card")).toBe(card("pass"));
    expect(document.getElementById("test-series")).toBe(card("ts"));
    expect(document.getElementById("cbq")).toBe(card("cbq"));
    expect(document.getElementById("packs")).toBe(card("bank"));
  });

  /** What one page does for a month-pass holder: the Pay buttons it shows, what its Board Pass Pay starts, what ?buy= starts. */
  async function monthPassRun(kill: "1" | ""): Promise<{ buttons: string[]; payCall: unknown[]; buyCall: unknown[]; buyCalls: number; url: string }> {
    vi.stubEnv("VITE_PRICING_HUB_DISABLED", kill);
    auth.user = { uid: "u1" };
    monthBuyer.on = true;
    setSub({ tier: "premium", plan: "pass_month", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: new Date(Date.now() + 3 * DAY).toISOString() });
    pay.buyPass.mockClear();
    await renderAt("/pricing");
    const area = screen.getByTestId("pricing-passes");
    const buttons = Array.from(area.querySelectorAll("button")).map((b) => (b.textContent ?? "").trim()).filter(Boolean);
    await act(async () => {
      fireEvent.click(area.querySelector(".lt-pricing-pay--boards") as HTMLButtonElement);
      await new Promise((r) => setTimeout(r, 0));
    });
    const payCall = pay.buyPass.mock.calls[0] ?? [];
    cleanup();
    pay.buyPass.mockClear();
    await renderAt("/pricing?buy=board_pass&utm_source=google");
    const out = { buttons, payCall, buyCall: pay.buyPass.mock.calls[0] ?? [], buyCalls: pay.buyPass.mock.calls.length, url: where() };
    cleanup();
    return out;
  }

  it("month-pass holder: the hub's Pay and /pricing?buy=board_pass do exactly what the legacy page does", async () => {
    const legacy = await monthPassRun("1");
    const hub = await monthPassRun("");
    // Legacy: the Board Pass Pay ("Pay ₹N once · valid till 28 Feb 2027") beside the month renewal; Pay starts the Board Pass checkout
    // (the upgrade) straight away; ?buy=board_pass starts the same checkout once and strips `buy` (utm kept).
    expect(legacy.buttons.some((b) => /^Pay ₹[\d,]+ once · valid till 28 Feb 2027$/.test(b))).toBe(true);
    expect(legacy.payCall.length).toBeGreaterThan(0);
    expect(legacy.buyCalls).toBe(1);
    expect(legacy.url).toBe("/pricing?utm_source=google");
    expect(hub).toEqual(legacy);
  });
});

describe("PRICING-4CARD-1 - four cards, Test Series second (owner 18 Nov 2026 22:02 IST)", () => {
  const series = seriesTotals();
  const tsCell = (row: HTMLElement, i: number) => row.querySelectorAll("td")[i];

  it("the online pair, then the paper pair: card order, group labels on the tabs and in the grid, tags", async () => {
    await renderAt("/pricing");
    expect(HUB_CARD_ORDER).toEqual(["pass", "cbq", "ts", "bank"]);
    expect(HUB_GROUPS).toEqual([]);
    const track = screen.getByTestId("hub-cards");
    expect(Array.from(track.querySelectorAll(":scope > [data-card]")).map((c) => (c as HTMLElement).dataset.card)).toEqual(["pass", "cbq", "ts", "bank"]);
    expect(screen.queryByTestId("hub-group-online")).toBeNull();
    expect(screen.queryByTestId("hub-tabgroup-paper")).toBeNull();
    expect(card("pass")).toHaveTextContent("ONLINE · EVERYTHING CHECKED");
    expect(card("ts")).toHaveTextContent("ONLINE · TESTS CHECKED");
    expect(card("cbq")).toHaveTextContent("ON PAPER");
    expect(within(card("bank")).getByTestId("hub-bank-tag").textContent).toMatch(/^ON PAPER/);
    // The Board Pass card is still the strong one: the only START HERE chip, the 1 MINUTE hero, the tutor.
    expect(within(card("pass")).getByText("START HERE")).toBeInTheDocument();
    expect(within(card("ts")).queryByText("START HERE")).toBeNull();
    expect(within(card("pass")).getByTestId("hub-pass-minute")).toBeInTheDocument();
  });

  it("the layout CSS: phones a carousel with a peek, 768-1279 px a 2x2 grid, 1280 px four across with a divider", () => {
    expect(HUB_CSS).toContain("flex: 0 0 min(340px, calc(100% - 36px));");
    expect(HUB_CSS).toMatch(/@media \(min-width: 768px\) \{[\s\S]*?grid-template-areas:\s*"c1 c2"\s*"c3 c4";/);
    expect(HUB_CSS).toMatch(/@media \(min-width: 1280px\) \{[\s\S]*?grid-template-areas:\s*"c1 c2 c3 c4";/);
    expect(HUB_CSS).toMatch(/align-items: stretch;/);
  });

  it("Test Series card: headline counts from the series config, ticks, the Board Pass line, price + GST, Buy and 'See all N tests'", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); the v1.1 face is pinned below.
    await renderAt("/pricing");
    const c = card("ts");
    expect(within(c).getByRole("heading", { level: 2 })).toHaveTextContent("Test Series");
    expect(within(c).getByText("NEW")).toBeInTheDocument();
    expect(within(c).getByTestId("hub-ts-headline").textContent).toBe(hubTsHeadlineText(series));
    expect(hubTsHeadlineText(series)).toBe(
      `${series.chapterTests} chapter tests + ${series.fullMocks} full-length board papers — your written answers checked step by step`,
    );
    expect(c).toHaveTextContent("Full scorecard and after-test analysis: weakest chapters, time per question, mistake notebook");
    expect(c).toHaveTextContent("Your graded answer sheet to download");
    expect(c).toHaveTextContent("Your pre-boards calendar");
    expect(within(c).getByTestId("hub-ts-upsell")).toHaveTextContent("Want the tutor and Answer Checker too? Board Pass →");
    expect(within(c).getByTestId("hub-ts-price")).toHaveTextContent(packPriceLabel("test_series"));
    expect(packPriceLabel("test_series")).toBe(`₹${TEST_SERIES_PRICE_INR} + GST`);
    expect(TEST_SERIES_PRICE_INR).toBe(999);
    // TS-UX-PAGE-1: its own Buy button (in place, not a link to /packs) carrying the TOTAL charged, and the "2 checks per paper" explainer.
    expect(within(c).getByTestId("hub-buy-test_series")).toHaveTextContent(`Get the Test Series · ${packPayLabel("test_series")}`);
    expect(within(c).getByTestId("hub-buy-test_series").tagName).toBe("BUTTON");
    expect(within(c).getByTestId("hub-buy-test_series")).not.toHaveAttribute("href");
    expect(within(c).getByTestId("hub-ts-checks")).toHaveTextContent("Each paper can be checked twice: upload your answers, see your marks, then fix and upload once more. If we can't read your photo, that check isn't counted.");
    expect(c).toHaveTextContent("valid till 28 Feb 2027");
    expect(c).not.toHaveTextContent(/twice per paper/);
    // TS-UX-PAGE-1: no stray leading "·" on the price sub-line.
    const found = within(c).queryByTestId("hub-ts-founding");
    if (found) expect((found.textContent ?? "").trim().startsWith("\u00b7")).toBe(false);
    expect(TEST_SERIES_BUY_PATH).toBe("/packs?buy=test_series");
    expect(within(c).getByTestId("hub-ts-details")).toHaveTextContent(`See all ${series.total} tests →`);
    expect(within(c).getByTestId("hub-ts-details")).toHaveAttribute("href", "/test-series");
    // No tutor and no Answer Checker are sold on this card (they are the Board Pass's).
    const ticks = within(c).getByRole("list", { name: "What the Test Series gives" }).textContent ?? "";
    expect(ticks).not.toMatch(/tutor|Answer Checker/i);
  });

  it("counts come from the config, never typed: the helpers follow whatever totals they are given; the copy file has no figure", () => {
    expect(series.chapterTests).toBe(seriesChapterTests().length);
    expect(series.fullMocks).toBe(2 * SERIES_MOCKS_PER_SUBJECT);
    expect(series.total).toBe(series.chapterTests + series.fullMocks);
    const fake = { chapterTests: 7, chapterTestsPerSubject: { Maths: 3, Science: 4 }, fullMocks: 9, mocksPerSubject: 9, total: 16, chapters: 7, chaptersPerSubject: { Maths: 3, Science: 4 }, papersPerChapter: 1 };
    expect(hubTsHeadlineText(fake)).toBe("7 chapter tests + 9 full-length board papers — your written answers checked step by step");
    expect(hubTsDetails(fake)).toBe("See all 16 tests →");
    expect(hubTsInsideRows(fake).map((r) => r.line)).toEqual([
      `3 chapter tests + ${SERIES_MOCKS_PER_SUBJECT} full-length papers`,
      `4 chapter tests + ${SERIES_MOCKS_PER_SUBJECT} full-length papers`,
    ]);
    const src = readFileSync(resolve(process.cwd(), "src/pages/pricingHub/hubCopy.ts"), "utf8");
    // The code of the Test Series block, comments removed (they quote example figures).
    const tsBlock = src
      .slice(src.indexOf("Card 2: Test Series"), src.indexOf("Card 3: CBQ Packs"))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(tsBlock).toContain("hubTsHeadline");
    expect(tsBlock).not.toMatch(/\b(26|40|66|13|20|999)\b/);
  });

  it("'Want the tutor and Answer Checker too? -> Board Pass' brings the Board Pass card in", async () => {
    await renderAt("/pricing");
    fireEvent.click(screen.getByTestId("hub-tab-ts"));
    expect(screen.getByTestId("hub-tab-ts")).toHaveAttribute("aria-pressed", "true");
    (Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(screen.getByTestId("hub-ts-upsell-go"));
    expect(screen.getByTestId("hub-tab-pass")).toHaveAttribute("aria-pressed", "true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("kill switch VITE_TS_PACK_DISABLED: unset -> the /packs buy path; 1 / true -> the card still shows, its Buy goes to /test-series", async () => {
    expect(isTestSeriesPackOffered()).toBe(true);
    expect(hubTsBuyPath()).toBe("/packs?buy=test_series");
    for (const v of ["1", "true"]) {
      vi.stubEnv("VITE_TS_PACK_DISABLED", v);
      expect(isTestSeriesPackOffered()).toBe(false);
      await renderAt("/pricing");
      expect(card("ts")).toBeInTheDocument();
      expect(screen.getByTestId("hub-buy-test_series")).toHaveAttribute("href", "/test-series");
      expect(screen.getByTestId("hub-buy-test_series")).toHaveTextContent("Get the Test Series");
      cleanup();
    }
    vi.stubEnv("VITE_TS_PACK_DISABLED", "0");
    expect(isTestSeriesPackOffered()).toBe(true);
  });

  it("a parent's visit keeps ?from=for_parents on the Test Series links", async () => {
    await renderAt("/pricing?from=for_parents");
    expect(screen.getByTestId("hub-buy-test_series")).toHaveAttribute("href", "/packs?buy=test_series&from=for_parents");
    expect(screen.getByTestId("hub-ts-details")).toHaveAttribute("href", "/test-series?from=for_parents");
  });

  it("a Board Pass holder is not sold the series: 'Included in your Board Pass' and a way in", async () => {
    auth.user = { uid: "u1" };
    setSub({ tier: "premium", plan: "pass_till_boards", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: new Date(Date.now() + 90 * DAY).toISOString() });
    await renderAt("/pricing");
    const c = card("ts");
    expect(within(c).queryByTestId("hub-buy-test_series")).toBeNull();
    expect(within(c).getByTestId("hub-ts-included")).toHaveTextContent("Included in your Board Pass");
    expect(within(c).getByTestId("hub-ts-open")).toHaveAttribute("href", "/test-series");
    cleanup();
    // A month-pass holder is paid premium too (seriesAccess checks their papers): same state.
    setSub({ tier: "premium", plan: "pass_month", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: new Date(Date.now() + 20 * DAY).toISOString() });
    await renderAt("/pricing");
    expect(within(card("ts")).getByTestId("hub-ts-included")).toHaveTextContent("Included in your Board Pass");
    cleanup();
    // A trial is not paid: it is still offered the series.
    setSub({ tier: "trial", trialStartDate: new Date(Date.now() - DAY).toISOString() }, { isTrialActive: true, daysLeftInTrial: 6 });
    await renderAt("/pricing");
    expect(within(card("ts")).queryByTestId("hub-ts-included")).toBeNull();
    expect(within(card("ts")).getByTestId("hub-buy-test_series")).toHaveTextContent("Get the Test Series");
  });

  it("a Test Series Pack owner is not sold it again: the owned pill and a way in", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    owned.packs = [{ sku: "test_series", target: "all" }];
    await renderAt("/pricing");
    expect(await screen.findByTestId("hub-ts-owned")).toHaveTextContent("Test Series · You own this");
    expect(within(card("ts")).queryByTestId("hub-buy-test_series")).toBeNull();
    expect(within(card("ts")).getByTestId("hub-ts-open")).toHaveAttribute("href", "/test-series");
  });

  it("the phone bar on the Test Series card names it and goes to its buy path", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    fireEvent.click(screen.getByTestId("hub-tab-ts"));
    const bar = screen.getByTestId("pricing-sticky-bar");
    expect(bar).toHaveTextContent(`Test Series ₹${TEST_SERIES_PRICE_INR} + GST`);
    expect(bar).toHaveTextContent(`Get the Test Series · ${packPayLabel("test_series")}`);
    await act(async () => {
      fireEvent.click(screen.getByTestId("pricing-sticky-bar-go"));
      await new Promise((r) => setTimeout(r, 0));
    });
    // TS-UX-PAGE-1: in place - the bar buys here (signed in: the pack checkout), it does not navigate to /packs.
    expect(where()).toBe("/pricing");
    expect(buyPack).toHaveBeenCalledWith("test_series", undefined, expect.anything());
    expect(analytics.named).toHaveBeenCalledWith("pricing_ts_buy_tap");
  });

  it("PRICE-HOLD-1: from 1 Dec the card's Buy and the phone bar STILL carry the 999 total (₹1,179) - no switch to 1,499 / ₹1,769", async () => {
    vi.setSystemTime(new Date("2026-12-02T12:00:00+05:30"));
    try {
      auth.user = { uid: "u1" };
      setSub({});
      await renderAt("/pricing");
      expect(packPayLabel("test_series")).toContain("1,179");
      expect(screen.getByTestId("hub-buy-test_series")).toHaveTextContent("Get the Test Series · ₹1,179");
      fireEvent.click(screen.getByTestId("hub-tab-ts"));
      expect(screen.getByTestId("pricing-sticky-bar")).toHaveTextContent("Get the Test Series · ₹1,179");
      expect(document.body.textContent).not.toContain("1,769");
    } finally {
      vi.setSystemTime(new Date("2026-11-11T12:00:00+05:30"));
    }
  });

  it("a tap on the card's 'Get the Test Series' records pricing_ts_buy_tap (name only)", async () => {
    await renderAt("/pricing");
    fireEvent.click(screen.getByTestId("hub-buy-test_series"));
    expect(analytics.named).toHaveBeenCalledWith("pricing_ts_buy_tap");
    // In place: signed out (checkout sheet flag off here) the shop's own sign-in-then-pay resume comes back to /pricing, never to /packs.
    expect(where()).toBe("/login?redirect=%2Fpricing%3Fbuy%3Dtest_series");
    expect(where()).not.toContain("/packs");
  });

  it("inbound links: #test-series selects its card; #cbq / #packs keep theirs; ?plan= and utm leave the page on the Board Pass", async () => {
    await renderAt("/pricing#test-series");
    expect(screen.getByTestId("hub-tab-ts")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    await renderAt("/pricing?utm_source=google&gclid=x#cbq");
    expect(screen.getByTestId("hub-tab-cbq")).toHaveAttribute("aria-pressed", "true");
    expect(where()).toBe("/pricing?utm_source=google&gclid=x#cbq");
    cleanup();
    await renderAt("/pricing?utm_source=youtube#packs");
    expect(screen.getByTestId("hub-tab-bank")).toHaveAttribute("aria-pressed", "true");
    expect(document.getElementById("packs")).toBe(card("bank"));
    cleanup();
    for (const plan of ["board_pass", "test_series", "cbq", "anything"]) {
      window.history.replaceState(null, ""); // a fresh visit (the hash visits above remembered their card on this shared entry)
      await renderAt(`/pricing?plan=${plan}&utm_source=google`);
      expect(screen.getByTestId("pricing-hub")).toBeInTheDocument();
      expect(screen.getByTestId("hub-tab-pass")).toHaveAttribute("aria-pressed", "true");
      expect(where()).toBe(`/pricing?plan=${plan}&utm_source=google`);
      cleanup();
    }
  });

  it("'Compare all four': a Test Series column, and every row is true", async () => {
    await renderAt("/pricing");
    const fold = screen.getByTestId("hub-fold-compare");
    expect(fold.querySelector("summary h2")).toHaveTextContent("Compare all four");
    const table = within(fold).getByTestId("pricing-what-table");
    expect(Array.from(table.querySelectorAll("thead th")).map((t) => t.textContent)).toEqual(["Feature", "Board Pass", "Test Series", "CBQ Pack", "Bundle"]);
    const rows = Array.from(table.querySelectorAll("tbody tr")) as HTMLElement[];
    const mark = (td: Element) => (td.classList.contains("lt-pp-yes") ? "Y" : td.classList.contains("lt-pp-no") ? "N" : (td.textContent ?? ""));
    const grid = Object.fromEntries(rows.map((r) => [r.querySelector("th")!.textContent, Array.from(r.querySelectorAll("td")).map(mark)]));
    expect(grid).toEqual({
      "Chapter tests and full mocks, written answers checked": ["Y", "Y", "N", "N"],
      "Download the paper and your graded sheet": ["Y", "Y", "N", "N"],
      "Answer Checker: any answer, checked like a CBSE examiner": ["Y", "N", "N", "N"],
      "Personal tutor": ["Y", "N", "N", "N"],
      "Printable PDF packs, to practise on paper": ["N", "N", "Y", "Y"],
      "What's inside": [
        "Everything, online",
        `${series.chapterTests} chapter tests + ${series.fullMocks} full-length papers`,
        expect.stringContaining("CBQs, one subject"),
        expect.stringContaining("chapters +"),
      ],
      Price: [boardPassPriceDisplay(), `₹${TEST_SERIES_PRICE_INR} + GST`, packPriceLabel("pack_cbq"), packPriceLabel("pack_bundle")],
    });
    // The Test Series column's ✓ / — carry the column name for a screen reader.
    expect(tsCell(rows[0], 1)).toHaveTextContent("Test Series: included");
    expect(tsCell(rows[2], 1)).toHaveTextContent("Test Series: not included");
  });

  it("the four-column rows agree with today's three-column rows for the Board Pass, CBQ Pack and Bundle", () => {
    const three = Object.fromEntries(whatYouGetRows("₹X").map((r) => [r.label, r.cells.map((c) => c.kind)]));
    const four = Object.fromEntries(whatYouGetRows4("₹X", { price: "₹Y", inside: "Z" }).map((r) => [r.label, r.cells.map((c) => c.kind)]));
    const drop = (cells: string[]) => [cells[0], cells[2], cells[3]];
    // "Answers checked like a CBSE examiner" (Y N N) is the Answer Checker row; "Graded tests, mocks, personal tutor" (Y N N) is split into
    // the tests row and the tutor row; "Practise on paper, offline" (N Y Y) is the printable PDF packs row.
    expect(drop(four["Answer Checker: any answer, checked like a CBSE examiner"])).toEqual(three["Answers checked like a CBSE examiner"]);
    expect(drop(four["Chapter tests and full mocks, written answers checked"])).toEqual(three["Graded tests, mocks, personal tutor"]);
    expect(drop(four["Personal tutor"])).toEqual(three["Graded tests, mocks, personal tutor"]);
    expect(drop(four["Printable PDF packs, to practise on paper"])).toEqual(three["Practise on paper, offline"]);
    // The legacy page (kill switch on) keeps its three columns.
    expect(WHAT_YOU_GET_COLUMNS).toEqual(["Board Pass", "CBQ Pack", "Bundle"]);
  });

  it("the legacy page (VITE_PRICING_HUB_DISABLED=1) keeps 'What you get with each' at three columns", async () => {
    vi.stubEnv("VITE_PRICING_HUB_DISABLED", "1");
    await renderAt("/pricing");
    const table = screen.getByTestId("pricing-what-table");
    expect(Array.from(table.querySelectorAll("thead th")).map((t) => t.textContent)).toEqual(["Feature", "Board Pass", "CBQ Pack", "Bundle"]);
    expect(screen.queryByTestId("hub-card-ts")).toBeNull();
  });
});

describe("PRICING-HUB-2 H1 - the two 10,000+ claims read as two different things", () => {
  it("Board Pass: questions ONLINE with solutions; Question Bank: questions to PRINT in the Bundle; each from its pinned constant", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); the v1.1 face is pinned below.
    await renderAt("/pricing");
    const pass = screen.getByTestId("hub-pass-tile-questions").textContent ?? "";
    const bank = screen.getByTestId("hub-bank-claim").textContent ?? "";
    expect(pass).toBe(`${BANK_QUESTIONS_CLAIM}questions online, with solutions`);
    expect(bank).toBe(`${BUNDLE_QUESTIONS_CLAIM} questions to print in the Bundle`);
    expect(pass.replace(/[\d,+\s]/g, "")).not.toBe(bank.replace(/[\d,+\s]/g, ""));
  });
});

describe("PRICING-HUB-2 H2 - Back restores the card the visitor left", () => {
  it("pure: a card-naming hash wins, then the saved card of this history entry, then the Board Pass", () => {
    expect([hashCard(""), hashCard("#cbq"), hashCard("#packs"), hashCard("#lt-premium-card"), hashCard("#pricing-video")]).toEqual([null, 1, 3, 0, null]);
    expect(hashCard("#test-series")).toBe(2);
    expect(savedCard({ [HUB_CARD_STATE_KEY]: 2, idx: 3 })).toBe(2);
    expect([savedCard(null), savedCard({}), savedCard({ [HUB_CARD_STATE_KEY]: 7 }), savedCard({ [HUB_CARD_STATE_KEY]: "1" })]).toEqual([null, null, null, null]);
    expect(initialCard("", { [HUB_CARD_STATE_KEY]: 1 })).toBe(1);
    expect(initialCard("#packs", { [HUB_CARD_STATE_KEY]: 1 })).toBe(3);
    expect(initialCard("", null)).toBe(0);
  });

  it("selecting a card is remembered on THIS entry (merged state, no new entry, URL unchanged); coming back restores it", async () => {
    window.history.replaceState({ usr: null, key: "k1", idx: 4 }, "");
    const entries = window.history.length;
    const url = window.location.href;
    await renderAt("/pricing");
    fireEvent.click(screen.getByTestId("hub-tab-bank"));
    expect(window.history.state).toEqual({ usr: null, key: "k1", idx: 4, [HUB_CARD_STATE_KEY]: 3 });
    expect(window.history.length).toBe(entries);
    expect(window.location.href).toBe(url);
    cleanup();
    // Back to this entry (SPA pop, or a bfcache / reload restore of it): the same card is selected.
    await renderAt("/pricing");
    expect(screen.getByTestId("hub-tab-bank")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("hub-position")).toHaveTextContent("4 of 4");
  });

  it("a fresh visit opens on the Board Pass; a hash still wins over a remembered card; ?buy= is unchanged", async () => {
    await renderAt("/pricing");
    expect(screen.getByTestId("hub-tab-pass")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    window.history.replaceState({ [HUB_CARD_STATE_KEY]: 3 }, "");
    await renderAt("/pricing#cbq");
    expect(screen.getByTestId("hub-tab-cbq")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    window.history.replaceState(null, "");
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing?buy=board_pass&utm_source=google");
    expect(pay.buyPass).toHaveBeenCalledTimes(1);
    expect(where()).toBe("/pricing?utm_source=google");
    expect(screen.getByTestId("hub-tab-pass")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("PRICING-HUB-2 H3 - a VERIFIED pack payment on the hub gets the legacy page's inline My packs block", () => {
  async function buyScience() {
    await act(async () => {
      fireEvent.click(screen.getByTestId("hub-buy-pack_cbq-science"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(buyPack).toHaveBeenCalledWith("pack_cbq", "science", expect.anything());
  }
  /** The student closes the pack pop-up if it is still open (after a verified payment the shop may already have closed it). */
  async function closePopUp() {
    await act(async () => {
      const close = screen.queryByTestId("pack-dialog-close");
      if (close) fireEvent.click(close);
      await new Promise((r) => setTimeout(r, 0));
    });
  }

  it("paid (server-verified): after the pop-up closes, the shop's own My packs block shows and comes into view", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    buyPack.mockImplementationOnce(async () => {
      owned.packs = [{ sku: "pack_cbq", target: "science" }];
      return { status: "paid" as const };
    });
    await renderAt("/pricing");
    expect(screen.queryByTestId("packs-mine")).toBeNull();
    await buyScience();
    await closePopUp();
    // PAID-SHEET-1: a signed-in buyer's confirmed payment opens the "Payment received" pop-up first; closing it lands on My packs.
    expect(await screen.findByTestId("paid-sheet")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId("paid-sheet-close"));
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(await screen.findByTestId("packs-mine")).toBeInTheDocument();
    expect(screen.queryByTestId("packs-open-my-packs")).toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("checking -> still confirming: NO My packs block, and the shop's own 'Open My packs' link stays (review F1)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], now: new Date("2026-11-11T12:00:00+05:30") });
    try {
      auth.user = { uid: "u1" };
      setSub({});
      buyPack.mockImplementationOnce(async () => ({ status: "pending" as const, orderId: "order_p" }));
      checkOrder.mockImplementation(async () => ({ state: "pending" }));
      await renderAt("/pricing");
      await buyScience();
      await closePopUp();
      expect(screen.getByTestId("packs-status").textContent).toMatch(/Checking your payment/);
      expect(screen.getByTestId("packs-open-my-packs")).toHaveAttribute("href", "/packs#my-packs");
      expect(screen.queryByTestId("packs-mine")).toBeNull();
      // Every poll answers "pending": the shop ends on "still confirming". Still no block; the link is still there.
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(screen.getByTestId("packs-status").textContent).not.toMatch(/Payment received/);
      expect(screen.getByTestId("packs-open-my-packs")).toBeInTheDocument();
      expect(screen.queryByTestId("packs-mine")).toBeNull();
    } finally {
      checkOrder.mockReset();
      vi.useRealTimers();
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-11T12:00:00+05:30"));
    }
  });

  it("checking -> expired: no block ever shows (review F2: only verified ownership opens it)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], now: new Date("2026-11-11T12:00:00+05:30") });
    try {
      auth.user = { uid: "u1" };
      setSub({});
      owned.packs = [{ sku: "pack_bundle", target: "all" }];
      buyPack.mockImplementationOnce(async () => ({ status: "pending" as const, orderId: "order_e" }));
      checkOrder.mockImplementation(async () => ({ state: "expired" }));
      checkOrder.mockImplementationOnce(async () => ({ state: "pending" })); // the first check is still pending
      await renderAt("/pricing");
      await buyScience();
      await closePopUp();
      // CONTROL: the payment really is being checked (the status line the hub watches is there) - and that alone opens nothing.
      expect(screen.getByTestId("packs-status").textContent).toMatch(/Checking your payment/);
      expect(screen.queryByTestId("packs-mine")).toBeNull();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(screen.queryByTestId("packs-mine")).toBeNull();
      expect(screen.queryByText(/Payment received/)).toBeNull();
    } finally {
      checkOrder.mockReset();
      vi.useRealTimers();
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-11T12:00:00+05:30"));
    }
  });

  it("an owner who did not buy on this visit still sees the quiet card state, not the block", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    owned.packs = [{ sku: "pack_cbq", target: "maths" }];
    await renderAt("/pricing");
    expect(await screen.findByTestId("hub-buy-pack_cbq-maths-owned")).toBeInTheDocument();
    expect(screen.queryByTestId("packs-mine")).toBeNull();
  });
});

describe("PRICING-HUB-2 H6 - the parent-share actions sit in one row under the pack Buys", () => {
  it("signed in, nothing owned: the CBQ row holds both subjects' actions, the Bundle row its own; both rows sit after the Buys", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1"); // PRICING-CTA-UP-1: pins TODAY's card (the kill switch); v1.1 keeps the rows in the details panel.
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    const cbqRow = screen.getByTestId("hub-cbq-share");
    const pair = screen.getByTestId("hub-buy-cbq");
    expect(pair.compareDocumentPosition(cbqRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pair.querySelector(".lt-paywall-actions")).toBeNull();
    expect(cbqRow.className).toContain("lt-ph-share--pair");
    const bankRow = screen.getByTestId("hub-bank-share");
    expect(screen.getByTestId("hub-buy-bank").compareDocumentPosition(bankRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("pure helpers", () => {
  it("nearestCard picks the card whose start is nearest the scroll position (the last card wins at max scroll)", () => {
    const starts = [0, 312, 624];
    expect(nearestCard(0, starts)).toBe(0);
    expect(nearestCard(150, starts)).toBe(0);
    expect(nearestCard(170, starts)).toBe(1);
    expect(nearestCard(596, starts)).toBe(2);
    expect(nearestCard(0, [])).toBe(0);
    // A tablet: the last card cannot reach the left edge; at the end of the track it is still the selected one.
    expect(nearestCard(308, [0, 352, 704], 308)).toBe(2);
    expect(nearestCard(200, [0, 352, 704], 308)).toBe(1);
  });
  it("hubPositionLine names the next card and wraps", () => {
    expect([0, 1, 2, 3].map(hubPositionLine)).toEqual([
      "1 of 4 · next: CBQ Packs",
      "2 of 4 · next: Test Series",
      "3 of 4 · next: Question Bank",
      "4 of 4 · next: Board Pass",
    ]);
  });
});

describe("PRICING-CTA-UP-1 - price + Buy near the top of every card; an honest bar for a Test Series owner", () => {
  const FOLLOWS = Node.DOCUMENT_POSITION_FOLLOWING;
  /** a comes before b in the document. */
  const before = (a: Element, b: Element) => expect(a.compareDocumentPosition(b) & FOLLOWS).toBeTruthy();
  const q = (root: Element, sel: string) => {
    const el = root.querySelector(sel);
    expect(el, sel).not.toBeNull();
    return el as Element;
  };
  /** Per card: its hero line, its price (or Buy-area first line), its Buy, a feature (ticks / tiles) and its details link. */
  const parts = (k: "pass" | "ts" | "cbq" | "bank") => {
    const c = card(k);
    const hero = { pass: '[data-testid="hub-pass-minute"]', ts: '[data-testid="hub-ts-headline"]', cbq: ".lt-ph-hero", bank: ".lt-ph-hero" }[k];
    const price = { pass: '[data-testid="pricing-passes"]', ts: '[data-testid="hub-ts-price"]', cbq: '[data-testid="hub-cbq-price"]', bank: '[data-testid="hub-bank-price"]' }[k];
    const buy = { pass: ".lt-pricing-pay--boards", ts: '[data-testid="hub-buy-test_series"]', cbq: '[data-testid="hub-buy-pack_cbq-maths"]', bank: '[data-testid="hub-buy-pack_bundle"]' }[k];
    const feature = { pass: '[data-testid="hub-pass-tutor"]', ts: ".lt-ph-ticks", cbq: ".lt-ph-tiles", bank: ".lt-ph-tiles" }[k];
    return {
      c,
      tag: q(c, ".lt-ph-tag"),
      name: q(c, ".lt-ph-name"),
      hero: q(c, hero),
      price: q(c, price),
      buy: q(c, buy),
      feature: q(c, feature),
      ticks: q(c, ".lt-ph-ticks"),
      details: q(c, ".lt-ph-details"),
      foot: q(c, ".lt-ph-foot"),
    };
  };

  /** v1.1 - the card's face (one link), its foot (price + Buy) and its folded row. */
  const v11 = (k: "pass" | "ts" | "cbq" | "bank") => {
    const c = card(k);
    return { c, face: q(c, ".lt-ph-face"), foot: q(c, ".lt-ph-foot"), more: c.querySelector(".lt-ph-panel") as HTMLElement | null };
  };
  const PAGE = { pass: "/board-pass", ts: "/test-series", cbq: "/cbq-packs", bank: "/packs" } as const;
  const NAME = { pass: "Board Pass", ts: "Test Series", cbq: "CBQ Packs", bank: "Question Bank + Mocks" } as const;

  it("v1.1 face: tag · name (ONE link to the product page, 'Details ›') · hook · at most 3 ticks · price · the Buy, then a closed fold", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    expect(screen.getByTestId("hub-cards")).toHaveClass("lt-ph-cards--up");
    for (const k of ["pass", "ts", "cbq", "bank"] as const) {
      const { c, face, foot, more } = v11(k);
      // The face holds exactly one interactive control: the name's link, stretched over the top area. The Buy is outside it.
      const controls = face.querySelectorAll("a, button, input, select, textarea, summary");
      expect(controls).toHaveLength(1);
      const link = controls[0] as HTMLAnchorElement;
      expect(link).toHaveClass("lt-ph-open");
      expect(link).toHaveAttribute("href", PAGE[k]);
      expect(link).toHaveAttribute("aria-label", `${NAME[k]} details`);
      expect(link).toHaveTextContent("Details ›");
      // The heading keeps the product's own name (the link is not inside it, so it does not rename it).
      expect(link.closest("h2")).toBeNull();
      expect(within(face as HTMLElement).getByRole("heading", { level: 2 })).toHaveAccessibleName(NAME[k]);
      expect(face.querySelectorAll(".lt-ph-ticks li").length).toBeLessThanOrEqual(3);
      before(q(face, ".lt-ph-tag"), q(face, "h2"));
      // Order: [face + its details panel] (the stage) -> foot (price, Buy) -> "…and more"; the panel starts hidden, over the face only.
      expect(foot.parentElement).toBe(c);
      expect(more).not.toBeNull();
      const stage = q(c, ".lt-ph-stage");
      expect(stage.contains(face) && stage.contains(more as Element)).toBe(true);
      before(stage, foot);
      expect((more as HTMLElement).hidden).toBe(true);
      expect(more).toHaveAttribute("role", "region");
      const btn = q(c, ".lt-ph-morebtn");
      before(foot, btn);
      expect(btn).toHaveAttribute("aria-expanded", "false");
      expect(btn).toHaveAttribute("aria-controls", (more as HTMLElement).id);
      expect(face.contains(foot)).toBe(false);
    }
    // ONE Buy per face (the CBQ card's Buy is its per-subject pair).
    expect(v11("pass").foot.querySelectorAll("button")).toHaveLength(1);
    expect(v11("pass").foot.querySelector(".lt-pricing-pay--boards")).not.toBeNull();
    expect(v11("ts").foot.querySelectorAll("button, a")).toHaveLength(1);
    expect(v11("cbq").foot.querySelectorAll("button")).toHaveLength(2);
    expect(v11("bank").foot.querySelectorAll("button, a")).toHaveLength(1);
    // Nothing else on the Board Pass face: no WhatsApp box, no GST breakup, no "Buying for someone else?", no trial, no payline.
    const passFoot = v11("pass").foot;
    for (const id of ["pass-checkout-gst", "pricing-trial", "pricing-payline", "pricing-parent-share"]) {
      expect(passFoot.querySelector(`[data-testid="${id}"]`), id).toBeNull();
    }
    expect(passFoot.querySelector("input")).toBeNull();
    // ... they sit in its fold instead (the trial: owner 24 Nov, "inside the card after the click, in details").
    const passMore = v11("pass").more as HTMLElement;
    expect(within(passMore).getByTestId("pricing-trial")).toHaveTextContent("Try the Board Pass free for 3 days");
    expect(within(passMore).getByTestId("pricing-payline")).toBeInTheDocument();
    expect(within(passMore).getByTestId("hub-pass-validity")).toHaveTextContent("valid till 28 Feb 2027");
  });

  it("review nit (a): 'Buying for someone else?' sits INSIDE the Board Pass details (signed in, Who on) and opens /board-pass; never on the face", async () => {
    const { SOMEONE_ELSE_LINK } = await import("../../components/checkoutWho/SomeoneElseLink");
    const { HUB_PASS_SOMEONE_ELSE } = await import("./hubCopy");
    expect(HUB_PASS_SOMEONE_ELSE).toBe(SOMEONE_ELSE_LINK);
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    auth.user = { uid: "u1" };
    await renderAt("/pricing");
    const { foot, more } = v11("pass");
    expect(foot.querySelector('[data-testid="hub-pass-someone-else"]')).toBeNull();
    const link = within(more as HTMLElement).getByTestId("hub-pass-someone-else");
    expect(link).toHaveTextContent("Buying for someone else?");
    expect(link.getAttribute("href")).toBe("/board-pass");
    cleanup();
    auth.user = null;
    await renderAt("/pricing");
    expect(screen.queryByTestId("hub-pass-someone-else")).toBeNull();
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "");
  });

  it("v1.1 Board Pass face: the 1 MINUTE hook, three ticks from the pinned constants (ONLINE questions), the price from config, Pay total", async () => {
    await renderAt("/pricing");
    const { face, foot, more } = v11("pass");
    expect(within(face as HTMLElement).getByText("START HERE")).toBeInTheDocument();
    expect(within(face as HTMLElement).getByTestId("hub-pass-minute")).toHaveTextContent("1MINUTE1 minute: CBSE-style marking of your answer");
    expect(Array.from(face.querySelectorAll(".lt-ph-ticks li")).map((li) => li.textContent)).toEqual([
      `✓${BANK_QUESTIONS_CLAIM} questions online · ${BANK_CBQS_CLAIM} CBQs, every type`,
      "✓Personal tutor: explains the step you got wrong",
      "✓Graded tests, mocks + Mistake Intelligence",
    ]);
    expect(within(foot as HTMLElement).getByTestId("till-boards-figures")).toHaveTextContent(boardPassPriceDisplay());
    expect((foot.querySelector(".lt-pricing-pay--boards") as HTMLElement).textContent).toBe(`Pay ${boardPassPayDisplay()} once · valid till 28 Feb 2027`);
    expect(more).not.toBeNull();
  });

  it("v1.1 Test Series face: counts from the series config, the founding clause by the price, the Buy total; the fold keeps the rest", async () => {
    const series = seriesTotals();
    await renderAt("/pricing?from=for_parents");
    const { face, foot, more } = v11("ts");
    expect(within(face as HTMLElement).getByTestId("hub-ts-headline").textContent).toBe(`${series.chapterTests} chapter tests + ${series.fullMocks} full-length board papers`);
    expect(within(face as HTMLElement).getByTestId("hub-ts-details")).toHaveAttribute("href", "/test-series?from=for_parents");
    expect(Array.from(face.querySelectorAll(".lt-ph-ticks li")).map((li) => li.textContent)).toEqual([
      "✓Written answers marked step by step",
      "✓Scorecard and graded answer sheet",
      "✓Your pre-boards calendar",
    ]);
    expect(face.textContent).not.toMatch(/tutor|Answer Checker/i);
    expect(within(foot as HTMLElement).getByTestId("hub-ts-price")).toHaveTextContent(packPriceLabel("test_series"));
    expect(within(foot as HTMLElement).getByTestId("hub-buy-test_series")).toHaveTextContent(`Get the Test Series · ${packPayLabel("test_series")}`);
    const m = more as HTMLElement;
    expect(within(m).getByTestId("hub-ts-checks")).toHaveTextContent("Each paper can be checked twice");
    expect(within(m).getByTestId("hub-ts-try")).toHaveTextContent("Your first test is free, written answers marked too.");
    expect(within(m).getByTestId("hub-ts-analysis")).toHaveTextContent("after-test analysis: weakest chapters, time per question, mistake notebook");
    expect(within(m).getByTestId("hub-ts-inside-maths")).toHaveTextContent(`${series.chapterTestsPerSubject.Maths} chapter tests`);
    expect(within(m).getByTestId("hub-ts-upsell")).toHaveTextContent("Want the tutor and Answer Checker too? Board Pass →");
    expect(document.body.textContent).not.toContain("its MCQs are marked free");
    cleanup();
    // While the free written check is switched off (as on /test-series), the line says only what is true.
    vi.stubEnv("VITE_TS_FREE_WRITTEN_CHECK_DISABLED", "1");
    await renderAt("/pricing");
    expect(within(v11("ts").more as HTMLElement).getByTestId("hub-ts-try")).toHaveTextContent("Try one test first: its MCQs are marked free.");
    // The hub reads the flag inline (entry budget); it must agree with /test-series' own reader for every value.
    const { freeWrittenCheckDisabled } = await import("../../lib/testSeries/seriesAccess");
    const { hubTsTryLine } = await import("./PricingHub");
    for (const v of ["1", "", "0", "true"]) {
      vi.stubEnv("VITE_TS_FREE_WRITTEN_CHECK_DISABLED", v);
      expect(hubTsTryLine().includes("MCQs"), v).toBe(freeWrittenCheckDisabled());
    }
  });

  it("v1.1 CBQ + Question Bank faces: ticks from the pinned constants, 'Not in the Bundle.' / 'CBQ Packs are separate.' in the details, smaller packs in the fold", async () => {
    await renderAt("/pricing?subject=science&from=for_parents");
    const cbq = v11("cbq");
    expect(cbq.face).toHaveTextContent("Half your board paper is competency-based. Practise every type.");
    expect(Array.from(cbq.face.querySelectorAll(".lt-ph-ticks li")).map((li) => li.textContent)).toEqual([
      `✓${CBQ_SUBJECT_CLAIM} per subject, 100+ per chapter`,
      `✓Every type: ${CBQ_QUESTION_TYPES.join(", ")}`,
      "✓Printable PDF, step-wise solutions",
    ]);
    // Owner (25 Nov 00:57): "Not in the Bundle." is off the CBQ face, kept in its details panel.
    expect(within(cbq.foot as HTMLElement).queryByTestId("hub-cbq-not-in-bundle")).toBeNull();
    expect(within(cbq.more as HTMLElement).getByTestId("hub-cbq-not-in-bundle")).toHaveTextContent("Not in the Bundle.");
    expect(within(cbq.more as HTMLElement).getByTestId("hub-cbq-inside")).toHaveTextContent(`Download again any time until ${REDOWNLOAD_UNTIL}`);
    const bank = v11("bank");
    expect(within(bank.face as HTMLElement).getByTestId("hub-bank-tile-chapters")).toHaveTextContent("26chapters, Maths + Science");
    expect(Array.from(bank.face.querySelectorAll(".lt-ph-ticks li")).map((li) => li.textContent)).toEqual([
      `✓${BUNDLE_QUESTIONS_CLAIM} questions to print`,
      "✓Full board papers with the marking guide",
      "✓Worked solutions, step by step",
    ]);
    // Owner (25 Nov 05:25, "keep them aligned"): off the Bundle face too, so the four Buys line up; kept in its details panel.
    expect(within(bank.foot as HTMLElement).queryByTestId("hub-bank-separate")).toBeNull();
    expect(within(bank.more as HTMLElement).getByTestId("hub-bank-separate")).toHaveTextContent("CBQ Packs are separate.");
    // The smaller packs stay reachable from /pricing at every size (no desktop-only class), as links to their /packs pop-ups.
    const m = bank.more as HTMLElement;
    expect(m.querySelector(".lt-ph-panel__title")).toHaveTextContent(`Smaller packs from ₹${PACK_PRICE_INR.pack_chapter} + GST and more`);
    expect(screen.getByTestId("hub-bank-more-open")).toHaveTextContent(`Smaller packs from ₹${PACK_PRICE_INR.pack_chapter} + GST and more`);
    const rows = within(m).getByTestId("hub-bank-rows");
    expect(rows).not.toHaveClass("lt-ph-extra");
    expect(within(rows).getByTestId("hub-bank-row-subject")).toHaveAttribute("href", "/packs?pack=subject&subject=science&from=for_parents");
    expect(within(rows).getByTestId("hub-bank-row-mock")).toHaveAttribute("href", "/packs?mock=science&from=for_parents");
    expect(within(rows).getByTestId("hub-bank-row-chapter")).toHaveAttribute("href", "/packs?pack=chapter&from=for_parents");
    expect(rows.querySelector("button")).toBeNull();
  });

  it("v1.1 parent share rows sit in the details panels; the ad anchors are on their cards", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    const cbq = v11("cbq");
    // In the card's details panel (not on the face, not inside the Buy row).
    const share = within(cbq.more as HTMLElement).getByTestId("hub-cbq-share");
    expect(cbq.foot.contains(share)).toBe(false);
    expect(within(v11("bank").more as HTMLElement).getByTestId("hub-bank-share")).toBeInTheDocument();
    expect(card("pass").id).toBe("lt-premium-card");
    expect(card("ts").id).toBe("test-series");
    expect(card("cbq").id).toBe("cbq");
    expect(card("bank").id).toBe("packs");
  });

  it("v1.1 details panel: '…and more' opens it inside the card (focus to ✕), ✕ and Esc close it (focus back), one panel at a time, Buy outside it", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    const ts = v11("ts");
    const btn = screen.getByTestId("hub-ts-more-open");
    const panel = ts.more as HTMLElement;
    expect(panel.hidden).toBe(true);
    fireEvent.click(btn);
    expect(panel.hidden).toBe(false);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toBe(screen.getByTestId("hub-ts-more-close"));
    expect(panel).toHaveAccessibleName(/Test Series/);
    // The Buy is not inside the panel, so it stays visible below it.
    expect(panel.contains(screen.getByTestId("hub-buy-test_series"))).toBe(false);
    // Opening another card's panel closes this one.
    fireEvent.click(screen.getByTestId("hub-bank-more-open"));
    expect(panel.hidden).toBe(true);
    expect((v11("bank").more as HTMLElement).hidden).toBe(false);
    fireEvent.click(screen.getByTestId("hub-bank-more-close"));
    expect((v11("bank").more as HTMLElement).hidden).toBe(true);
    expect(document.activeElement).toBe(screen.getByTestId("hub-bank-more-open"));
    // Esc inside the panel closes it and returns focus to its trigger.
    fireEvent.click(btn);
    fireEvent.keyDown(screen.getByTestId("hub-ts-more-close"), { key: "Escape" });
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(btn);
    // The trial (owner 24 Nov: "inside the card after the click") is in the Board Pass panel.
    expect(within(v11("pass").more as HTMLElement).getByTestId("pricing-trial")).toBeInTheDocument();
  });

  it("CSS v1.1: the face link is stretched over the top area; equal-size cards; the details panel overlays the card", () => {
    expect(HUB_CSS).toMatch(/\.lt-ph-face \{\s*position: relative;/);
    expect(HUB_CSS).toMatch(/\.lt-ph-open::after \{\s*content: "";\s*position: absolute;/);
    expect(HUB_CSS).toMatch(/\.lt-ph-card--face \.lt-ph-foot \{\s*margin-top: 0;/);
    // Equal size: every card in a row stretches (phones: the carousel track too); 768-1279 px both card rows share one height.
    expect(HUB_CSS).toMatch(/\.lt-ph-cards--up \{\s*align-items: stretch;/);
    expect(HUB_CSS).toMatch(/@media \(min-width: 768px\) \{\s*\.lt-ph-cards--up \{\s*grid-template-rows: auto 1fr auto 1fr;/);
    expect(HUB_CSS).toMatch(/@media \(min-width: 1280px\) \{\s*\.lt-ph-cards--up \{\s*grid-template-rows: auto 1fr;/);
    // The details panel overlays the card's own top area (absolute, scrollable): opening it never changes the card's size.
    expect(HUB_CSS).toMatch(/\.lt-ph-stage \{\s*position: relative;/);
    expect(HUB_CSS).toMatch(/\.lt-ph-panel \{\s*position: absolute;[\s\S]*?overflow-y: auto;/);
    // Today's pinned foot is still the rule the kill switch falls back to.
    expect(HUB_CSS).toMatch(/\.lt-ph-foot \{\s*margin-top: auto;/);
  });

  it("kill switch VITE_PRICING_CTA_UP_DISABLED=1: today's layout exactly - features first, the Buy area (with the details link) at the foot", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1");
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    expect(screen.getByTestId("hub-cards")).not.toHaveClass("lt-ph-cards--up");
    for (const k of ["pass", "ts", "cbq", "bank"] as const) {
      const p = parts(k);
      before(p.hero, p.feature);
      before(p.ticks, p.price);
      before(p.price, p.buy);
      expect(p.foot.contains(p.details)).toBe(true);
      expect(p.c.lastElementChild).toBe(p.foot);
    }
    cleanup();
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "true"); // only "1" switches it off (the documented value)
    await renderAt("/pricing");
    expect(screen.getByTestId("hub-cards")).toHaveClass("lt-ph-cards--up");
  });

  it("signed out, trial, Board Pass owner, pack owner, Test Series owner: every card renders, and nothing owned is sold again", async () => {
    await renderAt("/pricing");
    for (const k of ["pass", "ts", "cbq", "bank"] as const) expect(card(k)).toBeInTheDocument();
    expect(within(card("pass")).getByTestId("pricing-passes")).toBeInTheDocument();
    cleanup();
    auth.user = { uid: "u1" };
    setSub({ tier: "premium", plan: "pass_till_boards", passEnd: new Date(Date.now() + 60 * DAY).toISOString() });
    await renderAt("/pricing");
    expect(within(card("pass")).getByTestId("hub-pass-owned")).toBeInTheDocument();
    expect(within(card("pass")).queryByTestId("pricing-payline")).toBeNull();
    expect(within(card("ts")).getByTestId("hub-ts-included")).toBeInTheDocument();
    expect(within(card("ts")).queryByTestId("hub-buy-test_series")).toBeNull();
    cleanup();
    setSub({});
    owned.packs = [{ sku: "test_series", target: "all" }, { sku: "pack_bundle", target: "all" }];
    await renderAt("/pricing");
    expect(await screen.findByTestId("hub-ts-owned")).toBeInTheDocument();
    expect(within(card("ts")).queryByTestId("hub-buy-test_series")).toBeNull();
    expect(await screen.findByTestId("hub-buy-pack_bundle-owned")).toBeInTheDocument();
    // The owned states sit where the Buy sat: in the card's foot, under its face.
    expect((card("ts").querySelector(".lt-ph-foot") as Element).contains(screen.getByTestId("hub-ts-owned"))).toBe(true);
  });

  it("§2.4 a Test Series owner: the bar says 'Board Pass upgrade' / the card's own Pay ₹1,083, never the list total - also while Pay opens", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    owned.packs = [{ sku: "test_series", target: "all" }];
    tsUp.value = { creditInr: 999, fullBaseInr: 1917, baseInr: 918, gstInr: 165, payInr: 1083 };
    await renderAt("/pricing");
    expect(await screen.findByTestId("pass-checkout-ts-upgrade")).toBeInTheDocument();
    const payBtn = card("pass").querySelector(".lt-pricing-pay--boards") as HTMLButtonElement;
    expect(payBtn).toHaveTextContent("Pay ₹1,083");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const bar = () => screen.getByTestId("pricing-sticky-bar");
    expect(bar()).toHaveTextContent("Board Pass upgrade");
    expect(screen.getByTestId("pricing-sticky-bar-go")).toHaveTextContent("Pay ₹1,083");
    expect(bar().textContent).not.toContain(boardPassPayDisplay());
    // The card's Pay now reads "Opening secure payment…" (no figure): the bar keeps the last figure, never the list total.
    await act(async () => {
      fireEvent.click(payBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(payBtn.textContent).not.toMatch(/₹/);
    expect(screen.getByTestId("pricing-sticky-bar-go")).toHaveTextContent("Pay ₹1,083");
    expect(bar().textContent).not.toContain(boardPassPayDisplay());
  });

  it("§2.4 kill switch on: the bar is trunk's exactly for a Test Series owner (the hero figure; no upgrade wording)", async () => {
    vi.stubEnv("VITE_PRICING_CTA_UP_DISABLED", "1");
    auth.user = { uid: "u1" };
    setSub({});
    owned.packs = [{ sku: "test_series", target: "all" }];
    tsUp.value = { creditInr: 999, fullBaseInr: 1917, baseInr: 918, gstInr: 165, payInr: 1083 };
    await renderAt("/pricing");
    expect(await screen.findByTestId("pass-checkout-ts-upgrade")).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("resize"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId("pricing-sticky-bar")).toHaveTextContent(`Board Pass ${boardPassPriceDisplay()}`);
    expect(screen.getByTestId("pricing-sticky-bar")).not.toHaveTextContent("upgrade");
  });

  it("§2.4 everyone else: the bar is today's ('Board Pass <price>' / the card's Pay total)", async () => {
    auth.user = { uid: "u1" };
    setSub({});
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-sticky-bar")).toHaveTextContent(`Board Pass ${boardPassPriceDisplay()}`);
    expect(screen.getByTestId("pricing-sticky-bar-go")).toHaveTextContent(`Pay ${boardPassPayDisplay()}`);
    expect(screen.getByTestId("pricing-sticky-bar")).not.toHaveTextContent("upgrade");
  });
});
