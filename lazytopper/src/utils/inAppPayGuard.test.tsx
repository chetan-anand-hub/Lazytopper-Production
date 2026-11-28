/**
 * INAPP-GAP-1 - the guard before Razorpay opens inside an in-app browser with no working hop (iOS, YouTube / other webviews, a stuck
 * Android hop), the order's browser class + hop state, and the kill switch. Normal browsers / signed-in buyers are untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
vi.mock("../services/checkoutWhoFlag", async (orig) => ({ ...(await orig<typeof import("../services/checkoutWhoFlag")>()), isCheckoutWhoClientEnabled: () => true }));
vi.mock("../services/checkout", async (orig) => ({ ...(await orig<typeof import("../services/checkout")>()), isPaymentsClientEnabled: () => true, authHeaders: async () => ({ Authorization: "Bearer t" }) }));
const onboarding = vi.hoisted(() => vi.fn());
const hit = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
  sendAnalyticsHit: hit,
}));

import PacksShop from "../components/packs/PacksShop";
import { resetInAppPayChoiceShown } from "../components/payRescue/InAppPayChoice";
import { orderSourceForCheckout } from "../analytics/visitSource";
import { inAppHopState, resetInAppPayFirst } from "./inAppPayFirst";
import { inAppPayGuardNeeded, resetInAppGuard } from "./inAppPayGuard";

const UA = {
  igAndroid: "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android",
  fbIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.38.108;]",
  ytAndroid: "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 com.google.android.youtube/19.0",
  chrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

const realLocation = window.location;
let loc: { href: string; pathname: string; search: string; origin: string };
function fakeLocation(path: string) {
  const u = new URL(`https://www.lazytopper.com${path}`);
  loc = { href: u.toString(), pathname: u.pathname, search: u.search, origin: u.origin };
  Object.defineProperty(window, "location", { value: loc, configurable: true, writable: true });
}

beforeEach(() => {
  onboarding.mockReset();
  hit.mockReset();
  packs.buyPack.mockReset();
  packs.buyPack.mockResolvedValue({ status: "dismissed" });
  auth.user = null;
  resetInAppPayChoiceShown();
  resetInAppPayFirst();
  resetInAppGuard();
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "true");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  Object.defineProperty(window, "location", { value: realLocation, configurable: true, writable: true });
});

const checkoutHits = () => hit.mock.calls.filter((c) => (c[1] as { name?: string } | undefined)?.name === "pack_checkout");
const events = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);

function shop(path = "/test-series?utm_source=facebook") {
  fakeLocation(path);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PacksShop embedded hideMyPacks skipView inPlace returnPath="/test-series">
        {(api) => <div>{api.buyButton?.("test_series", { label: "Get the Test Series", className: "b", testId: "ts-buy", noteClass: "n" })}</div>}
      </PacksShop>
    </MemoryRouter>,
  );
}

describe("INAPP-GAP-1 · decision table", () => {
  it.each([
    ["Android Instagram (hop available)", UA.igAndroid, false, false],
    ["iPhone Facebook", UA.fbIos, false, true],
    ["YouTube webview", UA.ytAndroid, false, true],
    ["normal Chrome", UA.chrome, false, false],
    ["iPhone Facebook, signed in", UA.fbIos, true, false],
  ])("%s -> guard %s", (_n, ua, signedIn, want) => {
    setUa(ua);
    expect(inAppPayGuardNeeded(signedIn)).toBe(want);
  });
  it("kill switch VITE_INAPP_GAP_DISABLED=1 -> never", () => {
    setUa(UA.fbIos);
    vi.stubEnv("VITE_INAPP_GAP_DISABLED", "1");
    expect(inAppPayGuardNeeded(false)).toBe(false);
  });
});

describe("INAPP-GAP-1 · Test Series Buy", () => {
  it("iPhone Facebook: guard first (no order, no checkout), copy-link primary; Razorpay path only after 'Pay here anyway'", () => {
    setUa(UA.fbIos);
    shop();
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(screen.getByTestId("inapp-pay-guard")).toBeTruthy();
    expect(screen.getByTestId("inapp-pay-guard-copy").className).toContain("--primary");
    expect(checkoutHits()).toHaveLength(0);
    expect(events("inapp_pay_guard_shown")).toHaveLength(1);
    expect(events("inapp_pay_guard_shown")[0][1]).toEqual({ app: "facebook", platform: "ios", surface: "test_series" });
    fireEvent.click(screen.getByTestId("inapp-pay-guard-here"));
    expect(events("inapp_pay_guard_payhere")).toHaveLength(1);
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(checkoutHits()).toHaveLength(1); // the normal signed-out flow continued
    expect(inAppHopState()).toBe("bypass");
  });

  it("'Copy payment link' copies the ?buy=test_series link, fires the copy event and keeps the guard open", async () => {
    setUa(UA.fbIos);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    shop();
    fireEvent.click(screen.getByTestId("ts-buy"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("inapp-pay-guard-copy"));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String((writeText.mock.calls as unknown[][])[0][0])).toContain("buy=test_series");
    expect(events("inapp_pay_guard_copy")).toHaveLength(1);
    expect(screen.getByTestId("inapp-pay-guard")).toBeTruthy();
  });

  it("after 'Pay here anyway' the guard is not shown again on this page view", () => {
    setUa(UA.fbIos);
    shop();
    fireEvent.click(screen.getByTestId("ts-buy"));
    fireEvent.click(screen.getByTestId("inapp-pay-guard-here"));
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(events("inapp_pay_guard_shown")).toHaveLength(1);
  });

  it("Android Instagram: the hop runs and the guard does not show", () => {
    setUa(UA.igAndroid);
    shop();
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(loc.href.startsWith("intent://")).toBe(true);
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(events("inapp_pay_guard_shown")).toHaveLength(0);
  });

  it("Android Instagram 'Pay here instead' (explicit bypass) -> tapping Buy again shows no guard", () => {
    setUa(UA.igAndroid);
    shop();
    fireEvent.click(screen.getByTestId("inapp-pay-first-here"));
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(events("inapp_pay_guard_shown")).toHaveLength(0);
    expect(inAppHopState()).toBe("bypass");
    expect(loc.href.startsWith("intent://")).toBe(false);
  });

  it("Android Instagram, hop stuck -> the guard shows", () => {
    vi.useFakeTimers();
    setUa(UA.igAndroid);
    shop();
    const page = loc.href;
    fireEvent.click(screen.getByTestId("ts-buy"));
    loc.href = page;
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(inAppHopState()).toBe("stuck");
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(screen.getByTestId("inapp-pay-guard")).toBeTruthy();
  });

  it("normal Chrome, and iPhone Facebook with the kill switch: no guard, today's flow", () => {
    setUa(UA.chrome);
    shop();
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(checkoutHits()).toHaveLength(1);
    cleanup();
    setUa(UA.fbIos);
    vi.stubEnv("VITE_INAPP_GAP_DISABLED", "1");
    shop();
    fireEvent.click(screen.getByTestId("ts-buy"));
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(events("inapp_pay_guard_shown")).toHaveLength(0);
  });
});

describe("INAPP-GAP-1 · over the pack pop-up (B1) and keyboard / focus (N6)", () => {
  const cssZ = (file: string, selector: string): number => {
    const css = readFileSync(resolve(__dirname, file), "utf8");
    const re = new RegExp(`${selector.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`, "g");
    for (const m of css.matchAll(re)) {
      const z = /z-index:\s*(\d+)/.exec(m[1]);
      if (z) return Number(z[1]);
    }
    throw new Error(`no z-index for ${selector} in ${file}`);
  };

  it("the guard's z-index is above the pack pop-up's (an inequality, not a number)", () => {
    expect(cssZ("../components/payRescue/payRescue.css", ".lt-pay-guard")).toBeGreaterThan(cssZ("../pages/packsDialog.css", ".lt-pkd"));
  });

  it("Buy inside the OPEN pack pop-up (iPhone Facebook): the guard is portalled to body, on top; 'Pay here anyway' reaches checkout once", async () => {
    setUa(UA.fbIos);
    const path = "/test-series?utm_source=facebook";
    fakeLocation(path);
    const view = render(
      <MemoryRouter initialEntries={[path]}>
        <PacksShop embedded hideMyPacks skipView returnPath="/test-series">
          {(api) => (
            <div>
              <button type="button" data-testid="open-pop" onClick={() => api.openPack("test_series")}>open</button>
            </div>
          )}
        </PacksShop>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("open-pop"));
    const dialog = await screen.findByTestId("pack-dialog");
    const buy = await waitFor(() => {
      const b = dialog.querySelector('[data-testid="tile-buy-test_series"], .lt-pkd__foot button') as HTMLElement | null;
      if (!b) throw new Error("no buy yet");
      return b;
    });
    fireEvent.click(buy);
    const guard = screen.getByTestId("inapp-pay-guard");
    expect(guard.parentElement).toBe(document.body); // portalled: not inside the shop's tree, so no stacking-context surprise
    expect(view.container.contains(guard)).toBe(false);
    expect(checkoutHits()).toHaveLength(0);
    fireEvent.click(screen.getByTestId("inapp-pay-guard-here"));
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(checkoutHits()).toHaveLength(1);
  });

  it("focus moves into the sheet, Escape = 'Not now' (no checkout) and focus returns to the Buy", () => {
    setUa(UA.fbIos);
    shop();
    const buy = screen.getByTestId("ts-buy");
    buy.focus();
    fireEvent.click(buy);
    const guard = screen.getByTestId("inapp-pay-guard");
    expect(guard.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("inapp-pay-guard")).toBeNull();
    expect(document.activeElement).toBe(buy);
    expect(checkoutHits()).toHaveLength(0);
    expect(events("inapp_pay_guard_payhere")).toHaveLength(0);
  });

  it("a second host takes over when the first (leader) unmounts", () => {
    setUa(UA.fbIos);
    const a = render(<MemoryRouter><PacksShop embedded hideMyPacks skipView>{() => null}</PacksShop></MemoryRouter>);
    render(<MemoryRouter><PacksShop embedded hideMyPacks skipView>{(api) => <button type="button" data-testid="b2" onClick={() => api.buyNow("test_series")}>b</button>}</PacksShop></MemoryRouter>);
    a.unmount();
    fireEvent.click(screen.getByTestId("b2"));
    expect(screen.getAllByTestId("inapp-pay-guard")).toHaveLength(1);
  });
});

describe("INAPP-GAP-1 · order source carries the browser class", () => {
  it("ua is the coarse UaClass label only, hop the 4-value state; no raw user agent", () => {
    setUa(UA.fbIos);
    fakeLocation("/packs");
    const s = orderSourceForCheckout();
    expect(s?.ua).toBe("inapp_facebook");
    expect(s?.hop).toBe("none");
    expect(JSON.stringify(s)).not.toContain("Mozilla");
    fakeLocation("/packs?via=inapp");
    expect(orderSourceForCheckout()?.hop).toBe("hopped");
  });
});

describe("INAPP-GAP-1 · N3 storage failure", () => {
  it("sessionStorage throwing still yields { ua, hop }", () => {
    setUa(UA.fbIos);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(orderSourceForCheckout()).toEqual({ ua: "inapp_facebook", hop: "none" });
    } finally {
      spy.mockRestore();
    }
  });
});
