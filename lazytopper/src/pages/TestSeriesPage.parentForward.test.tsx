/**
 * TS-PARENT-FORWARD-1 (owner ruling 24 Nov 2026) - two ways forward on each Test Series offer card: the Buy (unchanged) and
 * "Forward link to parents" under it. Signed in, not an owner: the shop's own parent action for the Test Series (no QR, surface
 * "test_series"). Signed out: a button to sign-in that returns to /test-series?parent=1, where the forward button is focused.
 * Owners and "Checking your plan…": neither. VITE_TS_PARENT_FORWARD_DISABLED=1: the page as before.
 * The share sheet itself is PaywallActions' own (PaywallActions.test.tsx); here: WHERE it appears and WHAT it carries.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-24T21:00:00+05:30"));
});

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({ status: { tier: "free" } as Record<string, unknown>, hydrated: true }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
const mockOwn = vi.hoisted(() => ({ owns: false, known: true }));
vi.mock("../components/testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => ({
    owns: Boolean(uid) && mockOwn.owns,
    status: null,
    phase: !uid ? "idle" : mockOwn.known ? "ready" : "loading",
  }),
}));
vi.mock("../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => []),
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
}));
const shop = vi.hoisted(() => ({ on: true, owned: false }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => shop.on,
    fetchMyPacks: vi.fn(async () => ({
      packs: shop.owned ? [{ packId: "test_series:all", sku: "test_series", target: "all", pricePaidInr: 1179, paidAt: 1 }] : [],
      licensee: { name: "", email: "" },
      boardPassCredit: null,
    })),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
  };
});
vi.mock("../lib/packs/packAnalytics", async (orig) => {
  const actual = await orig<typeof import("../lib/packs/packAnalytics")>();
  return { ...actual, trackPackCheckout: vi.fn(), trackPackEvent: vi.fn(), trackPackPurchase: vi.fn() };
});
vi.mock("./PackDialog", () => ({ default: () => <div role="dialog" data-testid="pack-dialog" /> }));
// The parent action is PaywallActions' (its own tests pin the sheet); a probe records what this page asks it for.
vi.mock("../components/pricing/PaywallActions", async (orig) => {
  const actual = await orig<typeof import("../components/pricing/PaywallActions")>();
  return {
    ...actual,
    default: (p: { product?: unknown; noQr?: boolean; surface: string }) => (
      <div data-testid="ask-parent" data-product={JSON.stringify(p.product)} data-noqr={String(Boolean(p.noQr))} data-surface={p.surface}>
        <button type="button" data-testid="paywall-forward">
          {actual.ASK_PARENT_LABEL}
        </button>
      </div>
    ),
  };
});

import TestSeriesPage, { TS_PARENT_FORWARD_LOGIN_HREF, TS_PARENT_FORWARD_SIGNIN_NOTE } from "./TestSeriesPage";
import { packPayLabel } from "../services/packs";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}`}</div>;
}

async function mount(url = "/test-series") {
  let utils: ReturnType<typeof render> | undefined;
  await act(async () => {
    utils = render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/test-series" element={<><TestSeriesPage /><Where /></>} />
          <Route path="/login" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return utils as ReturnType<typeof render>;
}

const card = (id: "ts-hero-offer" | "ts-offer-ts") => within(screen.getByTestId(id));
/** The Buy, exactly as at the base SHA: its test id, its label (the TOTAL charged) and its class. */
function expectBuyUnchanged() {
  for (const [offer, id] of [["ts-hero-offer", "ts-hero-buy"], ["ts-offer-ts", "ts-cta-buy"]] as const) {
    const buy = card(offer).getByTestId(id);
    expect(buy.textContent).toBe(`Get the Test Series · ${packPayLabel("test_series")}`);
    expect(buy.className).toContain("lt-ts-btn lt-ts-btn--primary lt-ts-offer__btn");
  }
}
/** Every element under each offer card, in order: the forward option must sit BELOW the Buy. */
function below(offer: "ts-hero-offer" | "ts-offer-ts", buyId: string, fwdId: string) {
  const root = screen.getByTestId(offer);
  const buy = within(root).getByTestId(buyId);
  const fwd = within(root).getByTestId(fwdId);
  return Boolean(buy.compareDocumentPosition(fwd) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  mockAuth.user = null;
  mockAuth.loading = false;
  mockSub.status = { tier: "free" };
  mockSub.hydrated = true;
  mockOwn.owns = false;
  mockOwn.known = true;
  shop.on = true;
  shop.owned = false;
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TS-PARENT-FORWARD-1 · signed in, not an owner", () => {
  it("each card: the Buy (unchanged), then 'Forward link to parents' for the Test Series - no QR, surface test_series", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    await waitFor(() => expect(screen.getAllByTestId("ask-parent")).toHaveLength(2));
    expectBuyUnchanged();
    for (const [offer, buy, fwd] of [["ts-hero-offer", "ts-hero-buy", "ts-hero-forward"], ["ts-offer-ts", "ts-cta-buy", "ts-offer-forward"]] as const) {
      const probe = within(card(offer).getByTestId(fwd)).getByTestId("ask-parent");
      expect(JSON.parse(probe.getAttribute("data-product") || "null")).toEqual({ kind: "pack", sku: "test_series", name: "Test Series Pack" });
      expect(probe.getAttribute("data-noqr")).toBe("true");
      expect(probe.getAttribute("data-surface")).toBe("test_series");
      expect(card(offer).getByTestId("paywall-forward").textContent).toBe("Forward link to parents");
      expect(below(offer, buy, fwd)).toBe(true);
    }
    expect(screen.queryByTestId("ts-hero-forward-signin")).toBeNull();
    expect(document.body.textContent).not.toMatch(/\bAsk\b/);
  });

  it("back from sign-in with ?parent=1: the hero's forward button is scrolled into view and focused (no share is started)", async () => {
    mockAuth.user = { uid: "u1" };
    const scroll = vi.fn();
    const proto = HTMLElement.prototype as unknown as { scrollIntoView?: unknown };
    const had = proto.scrollIntoView;
    proto.scrollIntoView = scroll;
    try {
      await mount("/test-series?parent=1");
      const heroFwd = await waitFor(() => within(screen.getByTestId("ts-hero-forward")).getByTestId("paywall-forward"));
      await waitFor(() => expect(document.activeElement).toBe(heroFwd));
      expect(scroll).toHaveBeenCalled();
    } finally {
      proto.scrollIntoView = had;
    }
  });

  it("without ?parent=1 nothing is focused", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    await waitFor(() => expect(screen.getAllByTestId("ask-parent")).toHaveLength(2));
    expect(document.activeElement).toBe(document.body);
  });
});

describe("TS-PARENT-FORWARD-1 · signed out", () => {
  it("each card: the Buy (unchanged), then a 'Forward link to parents' BUTTON (never a /login link) and the sign-in line", async () => {
    await mount();
    expectBuyUnchanged();
    for (const [offer, buy, fwd] of [["ts-hero-offer", "ts-hero-buy", "ts-hero-forward"], ["ts-offer-ts", "ts-cta-buy", "ts-offer-forward"]] as const) {
      const btn = card(offer).getByTestId(`${fwd}-signin`);
      expect(btn.tagName).toBe("BUTTON");
      expect(btn.textContent).toBe("Forward link to parents");
      expect(card(offer).getByTestId(fwd).textContent).toContain(TS_PARENT_FORWARD_SIGNIN_NOTE);
      expect(below(offer, buy, fwd)).toBe(true);
      // The capture strip deletes the <section> around any /login link: the plan card must carry none.
      expect(screen.getByTestId(fwd).querySelector('a[href*="/login"]')).toBeNull();
    }
    expect(TS_PARENT_FORWARD_SIGNIN_NOTE).toBe("Sign in first (7-day free trial), then send the link to a parent.");
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });

  it("the button goes to sign-in, which returns to /test-series?parent=1", async () => {
    await mount();
    await act(async () => void fireEvent.click(screen.getByTestId("ts-offer-forward-signin")));
    expect(screen.getByTestId("where").textContent).toBe(TS_PARENT_FORWARD_LOGIN_HREF);
    expect(new URLSearchParams(TS_PARENT_FORWARD_LOGIN_HREF.split("?")[1]).get("redirect")).toBe("/test-series?parent=1");
  });

  it("parent pay off, or packs off (the Buy falls back to /packs): the reserved box stays (static page = live page), empty", async () => {
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "");
    await mount();
    expect(screen.getByTestId("ts-hero-forward").childElementCount).toBe(0);
    expect(screen.queryByTestId("ts-hero-forward-signin")).toBeNull();
    cleanup();
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    shop.on = false;
    await mount();
    expect(screen.getByTestId("ts-hero-buy").getAttribute("href")).toContain("/packs");
    expect(screen.getByTestId("ts-hero-forward").childElementCount).toBe(0);
    expect(screen.getByTestId("ts-offer-forward").childElementCount).toBe(0);
  });

  it("signed in with parent pay off: no box at all", async () => {
    mockAuth.user = { uid: "u1" };
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "");
    await mount();
    await waitFor(() => expect(screen.getAllByTestId("ts-hero-buy")).toHaveLength(1));
    expect(screen.queryByTestId("ts-hero-forward")).toBeNull();
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });
});

describe("TS-PARENT-FORWARD-1 · owners and the unknown state see neither", () => {
  it("a Board Pass holder", async () => {
    mockAuth.user = { uid: "u1" };
    mockSub.status = { tier: "premium", plan: "till_boards", passEnd: "2027-02-28T23:59:59+05:30", source: "razorpay" };
    await mount();
    expect(screen.queryByTestId("ts-hero-forward")).toBeNull();
    expect(screen.queryByTestId("ts-offer-forward")).toBeNull();
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });

  it("a Test Series owner", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.owns = true;
    await mount();
    expect(screen.queryByTestId("ts-hero-forward")).toBeNull();
    expect(screen.queryByTestId("ts-offer-forward")).toBeNull();
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });

  it("'Checking your plan…'", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.known = false;
    await mount();
    expect(screen.getAllByTestId("ts-cta-checking").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("ts-hero-forward")).toBeNull();
    expect(screen.queryByTestId("ts-offer-forward")).toBeNull();
  });
});

describe("TS-PARENT-FORWARD-1 · kill switch", () => {
  it("VITE_TS_PARENT_FORWARD_DISABLED=1 renders exactly the page without the forward option (signed out and signed in)", async () => {
    for (const signedIn of [false, true]) {
      mockAuth.user = signedIn ? { uid: "u1" } : null;
      vi.stubEnv("VITE_TS_PARENT_FORWARD_DISABLED", "1");
      const off = await mount("/test-series?parent=1");
      if (signedIn) await waitFor(() => expect(screen.getAllByTestId("ts-hero-buy").length).toBe(1));
      const offHtml = off.container.innerHTML;
      expect(screen.queryByTestId("ts-hero-forward")).toBeNull();
      expect(screen.queryByTestId("ts-offer-forward")).toBeNull();
      expect(screen.queryByTestId("ask-parent")).toBeNull();
      expect(document.activeElement).toBe(document.body);
      cleanup();
      // The same page with the feature ON, its forward boxes removed, is byte-identical: nothing else moved.
      vi.stubEnv("VITE_TS_PARENT_FORWARD_DISABLED", "");
      const on = await mount("/test-series?parent=1");
      if (signedIn) await waitFor(() => expect(screen.getAllByTestId("ask-parent")).toHaveLength(2));
      for (const el of Array.from(on.container.querySelectorAll('[data-testid="ts-hero-forward"], [data-testid="ts-offer-forward"]'))) el.remove();
      expect(on.container.innerHTML).toBe(offHtml);
      cleanup();
    }
  });
});
