/**
 * INAPP-PAY-FIRST-1 - Instagram / Facebook on Android, SIGNED OUT: the Buy tap goes straight to the Chrome intent for that item
 * (no order, no checkout event); "Pay here instead" = today's flow; a hop that leaves the page visible after 2.5 s shows the choice;
 * signed-in / iOS / a normal browser / the kill switch are unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const packs = vi.hoisted(() => ({ buyPack: vi.fn() }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "A", email: "a@b.in" }, boardPassCredit: null })), buyPack: packs.buyPack, checkPackOrder: vi.fn() };
});
vi.mock("../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../pages/PackDialog", () => ({ default: () => null }));
vi.mock("../services/checkoutWhoFlag", async (orig) => ({ ...(await orig<typeof import("../services/checkoutWhoFlag")>()), isCheckoutWhoClientEnabled: () => true }));
vi.mock("../services/checkout", async (orig) => ({ ...(await orig<typeof import("../services/checkout")>()), isPaymentsClientEnabled: () => true, authHeaders: async () => ({ Authorization: "Bearer t" }) }));
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import PacksShop from "../components/packs/PacksShop";
import { PassCheckoutView } from "../components/pricing/PassCheckout";
import ForParentsPage from "../pages/ForParentsPage";
import { resetInAppPayChoiceShown } from "../components/payRescue/InAppPayChoice";
import { INAPP_PAY_FIRST_NOTE, INAPP_PAY_FIRST_HERE_LABEL, resetInAppPayFirst } from "./inAppPayFirst";

const UA = {
  igAndroid: "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android",
  fbAndroid: "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]",
  igIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 310.0.0.37.109",
  chrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

const realLocation = window.location;
let loc: { href: string; pathname: string; search: string; origin: string };
function fakeLocation(path: string) {
  const u = new URL(`https://www.lazytopper.com${path}`);
  loc = { href: u.toString(), pathname: u.pathname, search: u.search, origin: u.origin };
  Object.defineProperty(window, "location", { value: loc, configurable: true, writable: true });
  return u.toString();
}

beforeEach(() => {
  onboarding.mockReset();
  packs.buyPack.mockReset();
  auth.user = null;
  resetInAppPayChoiceShown();
  resetInAppPayFirst();
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "true");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  Object.defineProperty(window, "location", { value: realLocation, configurable: true, writable: true });
});

const hops = () => onboarding.mock.calls.filter((c) => c[0] === "inapp_pay_first_hop");
function shop(path = "/test-series?utm_source=instagram&fbclid=zz") {
  const start = fakeLocation(path);
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <PacksShop embedded hideMyPacks skipView inPlace returnPath="/test-series">
        {(api) => (
          <div>
            {api.buyButton?.("test_series", { label: "Get the Test Series", className: "b", testId: "ts-buy", noteClass: "n" })}
            <button type="button" data-testid="tile-buy" onClick={() => api.buyNow("pack_subject", "maths")}>tile</button>
          </div>
        )}
      </PacksShop>
    </MemoryRouter>,
  );
  return { view, start };
}
function pass(o: { signedIn?: boolean; onBuy?: () => Promise<{ status: "dismissed" }> } = {}) {
  fakeLocation("/board-pass?utm_source=instagram");
  const onBuy = vi.fn(o.onBuy ?? (async () => ({ status: "dismissed" as const })));
  const onSignIn = vi.fn();
  const view = render(
    <MemoryRouter>
      <PassCheckoutView signedIn={o.signedIn ?? false} inAppChoice={!o.signedIn} offerOpen activePassEnd={null} onSignIn={onSignIn} onBuy={onBuy as never} />
    </MemoryRouter>,
  );
  return { view, onBuy, onSignIn, pay: () => fireEvent.click(view.container.querySelector(".lt-pricing-pay--boards") as HTMLElement) };
}

describe("INAPP-PAY-FIRST-1 · Instagram / Facebook on Android, signed out", () => {
  it("shop Buy (Test Series) hops to the Chrome intent with ?buy=test_series; no order; one event; note + 'Pay here instead' under the button", () => {
    setUa(UA.igAndroid);
    shop();
    expect(screen.getByTestId("inapp-pay-first-note").textContent).toBe(INAPP_PAY_FIRST_NOTE);
    expect(screen.getByTestId("inapp-pay-first-here").textContent).toBe(INAPP_PAY_FIRST_HERE_LABEL);
    expect(screen.queryByTestId("inapp-pay-choice-chrome")).toBeNull();
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(loc.href.startsWith("intent://")).toBe(true);
    expect(decodeURIComponent(loc.href)).toContain("buy=test_series");
    expect(loc.href).toContain("fbclid");
    expect(packs.buyPack).not.toHaveBeenCalled();
    expect(onboarding.mock.calls.some((c) => c[0] === "pack_checkout")).toBe(false);
    expect(hops()).toEqual([["inapp_pay_first_hop", { surface: "test_series", sku: "test_series" }]]);
  });

  it("a tile / buyNow Buy (Subject Pack, Maths) hops with ?buy=pack_subject&t=maths", () => {
    setUa(UA.fbAndroid);
    shop("/packs?utm_source=facebook");
    fireEvent.click(screen.getByTestId("tile-buy"));
    const href = decodeURIComponent(loc.href);
    expect(href.startsWith("intent://")).toBe(true);
    expect(href).toContain("buy=pack_subject");
    expect(href).toContain("t=maths");
    expect(hops()[0][1]).toEqual({ surface: "packs", sku: "pack_subject" });
    expect(packs.buyPack).not.toHaveBeenCalled();
  });

  it("Board Pass Pay hops with ?buy=board_pass and never calls onBuy (no order)", () => {
    setUa(UA.igAndroid);
    const p = pass();
    p.pay();
    expect(decodeURIComponent(loc.href)).toContain("buy=board_pass");
    expect(p.onBuy).not.toHaveBeenCalled();
    expect(hops()[0][1]).toEqual({ surface: "board_pass", sku: "board_pass" });
  });

  it("/for-parents Pay hops to the page itself (no ?buy=); no checkout opens", async () => {
    setUa(UA.igAndroid);
    const start = fakeLocation("/for-parents?utm_source=instagram");
    await act(async () => {
      render(
        <MemoryRouter initialEntries={["/for-parents"]}>
          <Routes>
            <Route path="/for-parents" element={<ForParentsPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    fireEvent.click(screen.getByTestId("fp-pay-hero"));
    const href = decodeURIComponent(loc.href);
    expect(href.startsWith("intent://")).toBe(true);
    expect(href).toContain("/for-parents?");
    expect(href).not.toContain("buy=");
    expect(loc.href).not.toBe(start);
    expect(hops()[0][1]).toEqual({ surface: "for_parents", sku: "page" });
  });

  it("'Pay here instead' runs today's in-webview flow: no hop, and the existing Chrome option shows", () => {
    setUa(UA.igAndroid);
    const p = pass();
    const before = loc.href;
    fireEvent.click(screen.getByTestId("inapp-pay-first-here"));
    expect(p.onSignIn).toHaveBeenCalledTimes(1); // today's signed-out flow, unchanged
    expect(loc.href).toBe(before);
    expect(hops()).toHaveLength(0);
    p.pay();
    expect(p.onSignIn).toHaveBeenCalledTimes(2);
    expect(hops()).toHaveLength(0);
  });

  it("stuck: the page is still visible 2.5 s after the hop -> the existing choice options show and Buy works in the webview", () => {
    vi.useFakeTimers();
    setUa(UA.igAndroid);
    const p = pass();
    const page = loc.href;
    p.pay();
    expect(p.onBuy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("inapp-pay-choice-chrome")).toBeNull();
    loc.href = page; // a failed intent navigation leaves the page where it was
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByTestId("inapp-pay-choice-chrome").getAttribute("href")).toContain("intent://");
    p.pay();
    expect(p.onSignIn).toHaveBeenCalledTimes(1);
  });
});

describe("INAPP-PAY-FIRST-1 · everything else is unchanged", () => {
  it("signed in (Instagram Android): the Pay goes to today's flow, no hop, no note", () => {
    setUa(UA.igAndroid);
    auth.user = { uid: "u1" };
    const p = pass({ signedIn: true });
    expect(screen.queryByTestId("inapp-pay-first")).toBeNull();
    p.pay();
    expect((p.onBuy.mock.calls[0] as unknown[])[0]).toBe("till_boards");
    expect(hops()).toHaveLength(0);
  });
  it.each([["iOS Instagram", UA.igIos], ["normal Chrome", UA.chrome]])("%s: today's flow, no hop, no note", (_n, ua) => {
    setUa(ua);
    const p = pass();
    expect(screen.queryByTestId("inapp-pay-first")).toBeNull();
    p.pay();
    expect(p.onSignIn).toHaveBeenCalledTimes(1);
    expect(hops()).toHaveLength(0);
  });
  it("kill switch VITE_INAPP_PAY_FIRST_DISABLED=1: today exactly (choice option under Pay, Pay opens checkout, no hop)", () => {
    setUa(UA.igAndroid);
    vi.stubEnv("VITE_INAPP_PAY_FIRST_DISABLED", "1");
    const p = pass();
    expect(screen.queryByTestId("inapp-pay-first")).toBeNull();
    expect(screen.getByTestId("inapp-pay-choice-chrome")).toBeTruthy();
    p.pay();
    expect(p.onSignIn).toHaveBeenCalledTimes(1);
    expect(hops()).toHaveLength(0);
  });
});
