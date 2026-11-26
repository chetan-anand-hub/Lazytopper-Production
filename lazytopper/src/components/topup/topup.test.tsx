// @vitest-environment jsdom
// TOPUP-GO-1 - the sheet, the two entry points, and the switch-off parity.
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import TopupAction from "./TopupAction";
import TopupSheet from "./TopupSheet";
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import { UsageCardView } from "../usage/UsageCard";
import UsageWarning from "../usage/UsageWarning";
import { parseUsageMe } from "../../services/usageClient";
import * as usageClient from "../../services/usageClient";
import type { LimitState } from "../usage/fairUseGate";
import type { TopupBuyDeps } from "./topupBuy";
import { TOPUP_PACKS, topupLines, topupLineText } from "../../config/topup";

const NOW = Date.parse("2026-11-26T12:00:00+05:30");
const PREMIUM_LIMIT: LimitState = { tier: "premium", scope: "full-mock", resetAt: "2026-12-10T00:00:00.000Z", window: "thirtyDay" };
const TRIAL_LIMIT: LimitState = { tier: "trial", scope: "worksheet", resetAt: "2026-12-01T00:00:00.000Z", window: "week" };

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const on = () => {
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  vi.stubEnv("VITE_TOPUP_ENABLED", "1");
};

const premiumCard = () =>
  parseUsageMe({ enforced: true, tier: "premium", trial: null, premium: { fiveHourPct: null, dayPct: 10, weekPct: null, thirtyDayPct: 100, resets: { fiveHour: null, day: null, week: null, thirtyDay: null } } });

describe("TopupSheet", () => {
  it("shows both packs: price '₹X + GST', the plain 'about N' lines from config, and a Pay button naming the TOTAL", () => {
    render(<TopupSheet onClose={() => undefined} nowMs={NOW} />);
    expect(screen.getByTestId("topup-price-topup_49").textContent).toBe("₹49 + GST");
    expect(screen.getByTestId("topup-price-topup_149").textContent).toBe("₹149 + GST");
    expect(screen.getByTestId("topup-pay-topup_49").textContent).toBe("Pay ₹58");
    expect(screen.getByTestId("topup-pay-topup_149").textContent).toBe("Pay ₹176");
    expect(screen.getByTestId("topup-gst-topup_49").textContent).toBe("₹49 + ₹9 GST (18%) = ₹58");
    for (const p of TOPUP_PACKS) {
      for (const line of topupLines(p)) expect(screen.getByTestId(`topup-pack-${p.key}`).textContent).toContain(topupLineText(line));
    }
    const text = screen.getByTestId("topup-sheet").textContent ?? "";
    expect(text).toContain("about 13 full mocks marked");
    expect(text).toMatch(/estimates/);
    // owner copy rules: no "AI", no "answer key", no refund talk, no Check & Improve, no credit rupees
    expect(text).not.toMatch(/\bAI\b|answer key|refund|Check & Improve|credit/i);
    expect(text).not.toMatch(/₹35|₹110/);
  });

  it("a Pay tap buys that pack; when the server confirms, the sheet says so and tells the host on close", async () => {
    const buyDeps: TopupBuyDeps = {
      createOrder: vi.fn(async () => ({ orderId: "order_T1", keyId: "k", amountPaise: 5800 })),
      loadScript: async () =>
        class {
          options: Record<string, unknown>;
          constructor(o: Record<string, unknown>) { this.options = o; }
          open() { (this.options.handler as (r: unknown) => void)({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_T1", razorpay_signature: "abc" }); }
          on() {}
        } as never,
      verify: vi.fn(async () => true),
      status: vi.fn(async () => false),
      prefill: async () => ({}),
      wait: async () => undefined,
    };
    const toppedUp = vi.fn();
    render(<TopupSheet onClose={() => undefined} onToppedUp={toppedUp} buyDeps={buyDeps} nowMs={NOW} />);
    fireEvent.click(screen.getByTestId("topup-pay-topup_49"));
    await waitFor(() => expect(screen.getByTestId("topup-paid")).toBeTruthy());
    expect(buyDeps.createOrder).toHaveBeenCalledWith("topup_49");
    expect(toppedUp).toHaveBeenCalledTimes(1);
  });
});

describe("TopupAction + hosts", () => {
  it("★★ switch OFF: TopupAction renders nothing at all (no wrapper node)", () => {
    const { container } = render(<TopupAction where="limit" wrapperClassName="lt-usage__actions" />);
    expect(container.innerHTML).toBe("");
  });

  it("★★ switch OFF: the premium limit panel and the usage card are byte-identical to a build without the action", () => {
    const panel = render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} /></MemoryRouter>);
    expect(panel.container.querySelector('[data-testid^="topup-"]')).toBeNull();
    const html = panel.container.innerHTML;
    panel.unmount();
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1"); // payments alone is not the top-up switch
    const again = render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} /></MemoryRouter>);
    expect(again.container.querySelector('[data-testid^="topup-"]')).toBeNull();
    expect(again.container.innerHTML.replace(/<div class="lt-usage__actions">[\s\S]*?<\/div>/g, "")).toBe(html.replace(/<div class="lt-usage__actions">[\s\S]*?<\/div>/g, ""));
    again.unmount();
    const card = render(<UsageCardView snapshot={premiumCard()} />);
    expect(card.container.querySelector('[data-testid^="topup-"]')).toBeNull();
  });

  it("switch ON: a PREMIUM refusal shows 'Top up to keep going', which opens the sheet", async () => {
    on();
    vi.spyOn(usageClient, "fetchUsageMe").mockResolvedValue(premiumCard());
    render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} /></MemoryRouter>);
    const btn = await screen.findByTestId("topup-open-limit");
    expect(btn.textContent).toBe("Top up to keep going");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("topup-sheet")).toBeTruthy());
    expect(screen.getByTestId("topup-pay-topup_49").textContent).toBe("Pay ₹58");
    fireEvent.click(screen.getByTestId("topup-close"));
    expect(screen.queryByTestId("topup-sheet")).toBeNull();
  });

  it("★ switch ON: a TRIAL refusal never shows a top-up (the student sees the normal upgrade wall)", () => {
    on();
    render(<MemoryRouter><FairUseLimitPanel limit={TRIAL_LIMIT} /></MemoryRouter>);
    expect(screen.queryByTestId("topup-open-limit")).toBeNull();
  });

  it("switch ON: the Premium usage card (Settings) offers 'Buy extra usage'; the trial card does not", () => {
    on();
    const { unmount } = render(<UsageCardView snapshot={premiumCard()} inSettings />);
    expect(screen.getByTestId("topup-open-menu").textContent).toBe("Buy extra usage");
    unmount();
    const trial = parseUsageMe({
      enforced: true,
      tier: "trial",
      trial: { checksLeftToday: 1, chapterTestsLeftToday: 1, mocksLeft: 1, worksheetsLeft: 1, resets: {}, limits: {} },
      premium: null,
    });
    render(<UsageCardView snapshot={trial} inSettings />);
    expect(screen.queryByTestId("topup-open-menu")).toBeNull();
  });
});

describe("TOPUP-GO-1 the existing 90% usage banner", () => {
  const snap = (pct: number) =>
    parseUsageMe({ enforced: true, tier: "premium", trial: null, premium: { fiveHourPct: null, dayPct: null, weekPct: null, thirtyDayPct: pct, resets: { fiveHour: null, day: null, week: null, thirtyDay: null } } });
  const bar = (pct: number) => render(<MemoryRouter><UsageWarning scope="full-mock" snapshot={snap(pct)} nowMs={NOW} /></MemoryRouter>);

  it("switch ON: the 90% warning of a Board Pass holder gets 'Add extra usage', and the banner copy is unchanged", () => {
    on();
    bar(92);
    expect(screen.getByTestId("usage-warning").getAttribute("data-level")).toBe("90");
    expect(screen.getByTestId("topup-open-warn").textContent).toBe("Add extra usage");
  });
  it("switch ON: the 75% warning has no top-up action (only 90%)", () => {
    on();
    bar(80);
    expect(screen.getByTestId("usage-warning").getAttribute("data-level")).toBe("75");
    expect(screen.queryByTestId("topup-open-warn")).toBeNull();
  });
  it("★★ switch OFF: the 90% banner is exactly what it was (no top-up node)", () => {
    const { container } = bar(92);
    expect(container.querySelector('[data-testid^="topup-"]')).toBeNull();
    expect(container.querySelectorAll("button").length).toBe(2); // the See-usage button and the dismiss x, as before
  });
});

describe("TOPUP-GO-1 the limit action follows the REAL subscription tier, not the 429's mapped tier", () => {
  const freeTsOwner = () => parseUsageMe({ enforced: true, tier: "free", trial: null, premium: null });
  it("★ a Test-Series-only (free-tier) owner at a 429 limit sees NO top-up action", async () => {
    on();
    const spy = vi.spyOn(usageClient, "fetchUsageMe").mockResolvedValue(freeTsOwner());
    render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} tsOwner /></MemoryRouter>);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("topup-open-limit")).toBeNull();
  });
  it("a Board Pass owner sees it, with or without the Test Series", async () => {
    on();
    vi.spyOn(usageClient, "fetchUsageMe").mockResolvedValue(premiumCard());
    const a = render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} /></MemoryRouter>);
    expect(await screen.findByTestId("topup-open-limit")).toBeTruthy();
    a.unmount();
    render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} tsOwner /></MemoryRouter>);
    expect(await screen.findByTestId("topup-open-limit")).toBeTruthy();
  });
  it("★★ switch OFF: the usage endpoint is not even read", () => {
    const spy = vi.spyOn(usageClient, "fetchUsageMe").mockResolvedValue(premiumCard());
    render(<MemoryRouter><FairUseLimitPanel limit={PREMIUM_LIMIT} /></MemoryRouter>);
    expect(spy).not.toHaveBeenCalled();
  });
});
