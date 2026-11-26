/**
 * TS-PAYPATH-1 - the hero's "Ask Mummy/Papa to pay": an equal action beside the Test Series Buy, reusing PARENT-PAY-FIRST-1's
 * machinery (signed out: ParentForwardGuest - WhatsApp, then a QR; signed in: the shop's parent link, parent-first). The forwarded
 * message never names a rupee figure. The fallback (prerendered) Buy stays on this page. VITE_TS_PARENT_HERO_DISABLED=1: today's hero.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-26T21:00:00+05:30"));
});

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({ status: { tier: "free" } as Record<string, unknown>, hydrated: true }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../components/testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => ({ owns: false, status: null, phase: uid ? "ready" : "idle" }),
}));
vi.mock("../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => []),
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
}));
const shop = vi.hoisted(() => ({ on: true }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => shop.on,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
  };
});
vi.mock("../lib/packs/packAnalytics", async (orig) => {
  const actual = await orig<typeof import("../lib/packs/packAnalytics")>();
  return { ...actual, trackPackCheckout: vi.fn(), trackPackEvent: vi.fn(), trackPackPurchase: vi.fn() };
});
vi.mock("./PackDialog", () => ({ default: () => <div role="dialog" data-testid="pack-dialog" /> }));
// Signed in, the parent action is PaywallActions' (its own tests pin the sheet); a probe records what the hero asks it for.
vi.mock("../components/pricing/PaywallActions", async (orig) => {
  const actual = await orig<typeof import("../components/pricing/PaywallActions")>();
  return {
    ...actual,
    default: (p: { forwardLabel?: string; parentFirst?: boolean; surface: string; onAsk?: () => void; onQr?: () => void }) => (
      <div data-testid="ask-parent" data-first={String(Boolean(p.parentFirst))} data-surface={p.surface}>
        <button type="button" data-testid="paywall-forward" onClick={() => p.onAsk?.()}>
          {p.forwardLabel ?? actual.ASK_PARENT_LABEL}
        </button>
        <button type="button" data-testid="paywall-qr" onClick={() => p.onQr?.()}>
          QR
        </button>
      </div>
    ),
  };
});
vi.mock("../services/referralService", () => ({ generateQRDataUrl: vi.fn(async () => "data:image/png;base64,AAAA") }));

import TestSeriesPage, { TS_PARENT_HERO_LABEL, TS_SELF_BUY_PATH } from "./TestSeriesPage";
import { TEST_SERIES_BUY_FROM_PATH } from "../lib/testSeries/testSeries";
import * as analytics from "../analytics/analytics";
import { packPayLabel } from "../services/packs";
import { PARENT_FORWARD_LABEL, PARENT_FORWARD_QR_LABEL } from "../components/payRescue/parentForward";

function LocProbe() {
  const l = useLocation();
  return <p data-testid="loc">{l.pathname + l.search}</p>;
}
async function mount() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/test-series"]}>
        <Routes>
          <Route path="/test-series" element={<TestSeriesPage />} />
          <Route path="*" element={<LocProbe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
const hero = () => within(screen.getByTestId("ts-hero-offer"));

let open: ReturnType<typeof vi.fn>;
let track: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  mockAuth.user = null;
  mockSub.status = { tier: "free" };
  mockSub.hydrated = true;
  shop.on = true;
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
  vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
  open = vi.fn(() => ({ opener: null }));
  vi.spyOn(window, "open").mockImplementation(open as unknown as typeof window.open);
  track = vi.spyOn(analytics, "trackOnboardingEvent");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("TS-PAYPATH-1 · signed out", () => {
  it("the hero shows 'Ask Mummy/Papa to pay' right after the Buy (the Buy unchanged); the plan card keeps today's button", async () => {
    await mount();
    const buy = hero().getByTestId("ts-hero-buy");
    expect(buy.textContent).toBe(`Get the Test Series · ${packPayLabel("test_series")}`);
    const ask = hero().getByTestId("ts-hero-parent");
    expect(ask.textContent).toBe(TS_PARENT_HERO_LABEL);
    expect(ask.className).toContain("lt-ts-forward__btn--hero");
    expect(buy.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByTestId("ts-offer-ts")).queryByTestId("ts-hero-parent")).toBeNull();
    expect(within(screen.getByTestId("ts-offer-ts")).getByTestId("ts-offer-forward-share")).toBeTruthy();
  });

  it("a tap opens the existing forward panel (WhatsApp + QR), tagged ts_hero; the message names no rupee figure", async () => {
    await mount();
    await act(async () => void fireEvent.click(hero().getByTestId("ts-hero-parent")));
    const panel = await screen.findByTestId("parent-forward");
    expect(panel.getAttribute("data-product")).toBe("test_series");
    expect(track).toHaveBeenCalledWith("parent_forward_shown", { signed_in: "false", product: "test_series", surface: "ts_hero" });
    await act(async () => void fireEvent.click(within(panel).getByText(PARENT_FORWARD_LABEL)));
    expect(track).toHaveBeenCalledWith("parent_forward_clicked", { signed_in: "false", product: "test_series", surface: "ts_hero" });
    expect(open).toHaveBeenCalledTimes(1);
    const url = String(open.mock.calls[0][0]);
    const text = decodeURIComponent(url.slice(url.indexOf("text=") + 5));
    expect(text).toContain("Test Series");
    expect(text).toContain("/test-series?utm_source=parent_forward");
    expect(text).not.toMatch(/₹|Rs\.?\s*\d|\d[\d,]*\s*\+\s*GST/);
    await act(async () => void fireEvent.click(within(panel).getByText(PARENT_FORWARD_QR_LABEL)));
    await waitFor(() => expect(screen.getByTestId("parent-forward-qr-panel")).toBeTruthy());
    expect(track).toHaveBeenCalledWith("parent_forward_qr_shown", { signed_in: "false", product: "test_series", surface: "ts_hero" });
  });

  it("the fallback (prerendered, packs off) Buy points at this page's own ?buy=, never /packs; the reserved box stays", async () => {
    shop.on = false;
    await mount();
    const href = hero().getByTestId("ts-hero-buy").getAttribute("href") ?? "";
    expect(href).toBe(TS_SELF_BUY_PATH);
    expect(href).not.toContain("/packs");
    expect(screen.getByTestId("ts-cta-buy").getAttribute("href")).toBe(TS_SELF_BUY_PATH);
    expect(screen.getByTestId("ts-hero-forward").className).toContain("lt-ts-forward--out");
    expect(screen.getByTestId("ts-hero-forward").childElementCount).toBe(0);
  });

  it("#1896 nit: LIVE with packs off, the fallback Buy (href still this page's ?buy=) goes to the /packs fallback instead of reloading here", async () => {
    shop.on = false;
    await mount();
    const buy = hero().getByTestId("ts-hero-buy");
    expect(buy.getAttribute("href")).toBe(TS_SELF_BUY_PATH);
    await act(async () => void fireEvent.click(buy));
    expect(screen.getByTestId("loc").textContent).toBe(TEST_SERIES_BUY_FROM_PATH);
  });

  it("#1896 nit: the Test Series not offered (VITE_TS_PACK_DISABLED=1) -> the Buy is the previous /packs link, never the self link", async () => {
    vi.stubEnv("VITE_TS_PACK_DISABLED", "1");
    shop.on = false;
    await mount();
    expect(hero().getByTestId("ts-hero-buy").getAttribute("href")).toBe(TEST_SERIES_BUY_FROM_PATH);
  });

  it("CONTROL: packs on and the series offered -> the in-place Buy (a button, no link, no navigation)", async () => {
    await mount();
    const buy = hero().getByTestId("ts-hero-buy");
    expect(buy.tagName).toBe("BUTTON");
    expect(buy.getAttribute("href")).toBeNull();
  });

  it("#1896 nit: the hero's signed-out 'Ask Mummy/Papa to pay' sends paywall_action {ask, test_series} once per opening tap, never on close", async () => {
    const pay = vi.spyOn(analytics, "trackPaywallAction");
    await mount();
    const ask = hero().getByTestId("ts-hero-parent");
    await act(async () => void fireEvent.click(ask));
    expect(pay).toHaveBeenCalledTimes(1);
    expect(pay).toHaveBeenCalledWith("ask", "test_series");
    await screen.findByTestId("parent-forward");
    expect(track).toHaveBeenCalledWith("parent_forward_shown", { signed_in: "false", product: "test_series", surface: "ts_hero" });
    // the panel's WhatsApp tap is parent_forward_clicked only - no second paywall_action
    await act(async () => void fireEvent.click(within(screen.getByTestId("parent-forward")).getByText(PARENT_FORWARD_LABEL)));
    expect(pay).toHaveBeenCalledTimes(1);
    await act(async () => void fireEvent.click(ask)); // close
    expect(pay).toHaveBeenCalledTimes(1);
    await act(async () => void fireEvent.click(ask)); // open again: a new ask
    expect(pay).toHaveBeenCalledTimes(2);
  });

  it("the plan card's 'Forward link to parents' message names the Test Series but never an amount (before and after 1 Dec)", async () => {
    await mount();
    await act(async () => void fireEvent.click(screen.getByTestId("ts-offer-forward-share")));
    const url = String(open.mock.calls.at(-1)?.[0] ?? "");
    const text = decodeURIComponent(url.slice(url.indexOf("text=") + 5));
    expect(text).toContain("Test Series");
    expect(text).toContain("one-time payment");
    expect(text).not.toMatch(/₹|\bRs\.?\s*\d|\d[\d,]*\s*\+\s*GST/);
    cleanup();
    open.mockClear();
    vi.setSystemTime(new Date("2026-12-02T10:00:00+05:30"));
    try {
      await mount();
      await act(async () => void fireEvent.click(screen.getByTestId("ts-offer-forward-share")));
      const after = String(open.mock.calls.at(-1)?.[0] ?? "");
      expect(decodeURIComponent(after.slice(after.indexOf("text=") + 5))).not.toMatch(/₹|\bRs\.?\s*\d|\d[\d,]*\s*\+\s*GST/);
    } finally {
      vi.setSystemTime(new Date("2026-11-26T21:00:00+05:30"));
    }
  });

  it("VITE_TS_PARENT_HERO_DISABLED=1 restores today's hero: 'Forward link to parents' and the /packs fallback link", async () => {
    vi.stubEnv("VITE_TS_PARENT_HERO_DISABLED", "1");
    await mount();
    expect(screen.queryByTestId("ts-hero-parent")).toBeNull();
    expect(hero().getByTestId("ts-hero-forward-share")).toBeTruthy();
    cleanup();
    shop.on = false;
    await mount();
    expect(hero().getByTestId("ts-hero-buy").getAttribute("href")).toContain("/packs?buy=test_series");
  });
});

describe("TS-PAYPATH-1 · signed in, not an owner", () => {
  it("the hero's parent action is the shop's parent link, parent-first, labelled 'Ask Mummy/Papa to pay', events tagged ts_hero", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    const probe = await waitFor(() => within(screen.getByTestId("ts-hero-forward")).getByTestId("ask-parent"));
    expect(probe.getAttribute("data-first")).toBe("true");
    expect(probe.getAttribute("data-surface")).toBe("test_series");
    const btn = within(probe).getByTestId("paywall-forward");
    expect(btn.textContent).toBe(TS_PARENT_HERO_LABEL);
    fireEvent.click(btn);
    expect(track).toHaveBeenCalledWith("parent_forward_clicked", { signed_in: "true", product: "test_series", surface: "ts_hero" });
    fireEvent.click(within(probe).getByTestId("paywall-qr"));
    expect(track).toHaveBeenCalledWith("parent_forward_qr_shown", { signed_in: "true", product: "test_series", surface: "ts_hero" });
    // The plan card below keeps its own (non parent-first) forward.
    expect(within(within(screen.getByTestId("ts-offer-ts")).getByTestId("ask-parent")).getByTestId("paywall-forward").textContent).not.toBe(TS_PARENT_HERO_LABEL);
  });
});
