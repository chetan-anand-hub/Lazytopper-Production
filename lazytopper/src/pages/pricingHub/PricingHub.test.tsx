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
    expect(cards).toEqual(["lt-premium-card", "test-series", "cbq", "packs"]);
  });

  it("Board Pass card: 1 MINUTE hero, the pinned bank claims, tutor, ticks, price from config, Pay, payline, trial, details link", async () => {
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
    expect(within(c).getByTestId("till-boards-deadline")).toBeInTheDocument();
    const payBtn = c.querySelector(".lt-pricing-pay--boards") as HTMLButtonElement;
    expect(payBtn.textContent).toBe(`Pay ${boardPassPayDisplay()} once till your boards`);
    expect(within(c).getByTestId("pricing-payline")).toHaveTextContent("One payment, not a subscription · UPI, card or netbanking");
    expect(within(c).getByTestId("pricing-trial")).toBeInTheDocument();
    expect(within(c).getByTestId("hub-pass-details")).toHaveAttribute("href", "/board-pass");
  });

  it("CBQ card: hero, claims, ticks, price + GST, two Buys naming the total, 'Not in the Bundle.', details link", async () => {
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

  it("tabs: four real buttons with aria-pressed; caption; pager '1 of 4 · next: Test Series'; a tab tap selects its card", async () => {
    await renderAt("/pricing");
    const tabs = within(screen.getByTestId("hub-tabs")).getAllByRole("button");
    expect(tabs.map((t) => t.textContent)).toEqual([
      `Board Pass${hubTabPrice("pass")}`,
      `Test Series${hubTabPrice("ts")}`,
      `CBQ Packs${hubTabPrice("cbq")}`,
      `Question Bank${hubTabPrice("bank")}`,
    ]);
    expect(hubTabPrice("cbq")).toBe("₹199");
    expect(hubTabPrice("ts")).toBe(`₹${TEST_SERIES_PRICE_INR}`);
    expect(tabs.map((t) => t.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false"]);
    expect(tabs.map((t) => t.getAttribute("aria-controls"))).toEqual(["lt-premium-card", "test-series", "cbq", "packs"]);
    expect(screen.getByText("4 options · tap or swipe · all prices + GST")).toBeInTheDocument();
    expect(screen.getByTestId("hub-position")).toHaveTextContent("1 of 4 · next: Test Series");
    fireEvent.click(tabs[1]);
    expect(screen.getByTestId("hub-position")).toHaveTextContent("2 of 4 · next: CBQ Packs");
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
    expect(screen.getByTestId("pricing-trial-state")).toHaveTextContent("Your 7-day trial has started");
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
    expect([cardForHash("#cbq"), cardForHash("#packs"), cardForHash("#lt-premium-card"), cardForHash(""), cardForHash("#pricing-video")]).toEqual([2, 3, 0, 0, 0]);
    expect(cardForHash("#test-series")).toBe(1);
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

  it("R4: the Basic line is the legacy one - 'limited practice' with the limits on", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    await renderAt("/pricing");
    expect(screen.getByTestId("pricing-basic-line")).toHaveTextContent("Basic: free forever, with notes, NCERT solutions and limited practice (1 graded set a day, 1 download a week)");
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
    // Legacy: the Board Pass Pay ("Pay ₹N once till your boards") beside the month renewal; Pay starts the Board Pass checkout
    // (the upgrade) straight away; ?buy=board_pass starts the same checkout once and strips `buy` (utm kept).
    expect(legacy.buttons.some((b) => /^Pay ₹[\d,]+ once till your boards$/.test(b))).toBe(true);
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
    expect(HUB_CARD_ORDER).toEqual(["pass", "ts", "cbq", "bank"]);
    expect(HUB_GROUPS.map((g) => [g.label, g.cards])).toEqual([["Online", ["pass", "ts"]], ["On paper", ["cbq", "bank"]]]);
    const track = screen.getByTestId("hub-cards");
    expect(Array.from(track.querySelectorAll(":scope > [data-card]")).map((c) => (c as HTMLElement).dataset.card)).toEqual(["pass", "ts", "cbq", "bank"]);
    expect(screen.getByTestId("hub-group-online")).toHaveTextContent("Online");
    expect(screen.getByTestId("hub-group-paper")).toHaveTextContent("On paper");
    expect(screen.getByTestId("hub-tabgroup-online")).toHaveTextContent("Online");
    expect(screen.getByTestId("hub-tabgroup-paper")).toHaveTextContent("On paper");
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
    expect(HUB_CSS).toMatch(/@media \(min-width: 768px\) \{[\s\S]*?grid-template-areas:\s*"go go"\s*"c1 c2"\s*"gp gp"\s*"c3 c4";/);
    expect(HUB_CSS).toMatch(/@media \(min-width: 1280px\) \{[\s\S]*?grid-template-areas:\s*"go go \. gp gp"\s*"c1 c2 dv c3 c4";/);
    expect(HUB_CSS).toMatch(/align-items: stretch;/);
  });

  it("Test Series card: headline counts from the series config, ticks, the Board Pass line, price + GST, Buy and 'See all N tests'", async () => {
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
    expect(within(c).getByTestId("hub-buy-test_series")).toHaveTextContent("Get the Test Series");
    expect(within(c).getByTestId("hub-buy-test_series")).toHaveAttribute("href", TEST_SERIES_BUY_PATH);
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
    const fake = { chapterTests: 7, chapterTestsPerSubject: { Maths: 3, Science: 4 }, fullMocks: 9, mocksPerSubject: 9, total: 16 };
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
    expect(within(card("ts")).getByTestId("hub-buy-test_series")).toHaveAttribute("href", "/packs?buy=test_series");
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
    expect(bar).toHaveTextContent("Get the Test Series");
    await act(async () => {
      fireEvent.click(screen.getByTestId("pricing-sticky-bar-go"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(where()).toBe("/packs?buy=test_series");
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
    expect([hashCard(""), hashCard("#cbq"), hashCard("#packs"), hashCard("#lt-premium-card"), hashCard("#pricing-video")]).toEqual([null, 2, 3, 0, null]);
    expect(hashCard("#test-series")).toBe(1);
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
      "1 of 4 · next: Test Series",
      "2 of 4 · next: CBQ Packs",
      "3 of 4 · next: Question Bank",
      "4 of 4 · next: Board Pass",
    ]);
  });
});
