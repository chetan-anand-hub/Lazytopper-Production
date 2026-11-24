/** INAPP-PAY-CHOICE-1 - the /packs page-tile Buy buttons: the extra option in-app, signed-out only; steps aside for the rescue card. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "A", email: "a@b.in" }, boardPassCredit: null })), buyPack: vi.fn(), checkPackOrder: vi.fn() };
});
vi.mock("../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("./PackDialog", () => ({ default: () => null }));

import PacksPage from "./PacksPage";
import PackTileBuy, { PackCbqBuy } from "../components/packs/PackTileBuy";
import { resetInAppPayChoiceShown } from "../components/payRescue/InAppPayChoice";
import type { PacksShopApi } from "../components/packs/PacksShop";

const IG_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android";
const CHROME = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

beforeEach(() => {
  vi.stubEnv("VITE_INAPP_PAY_FIRST_DISABLED", "1"); // these assert the PAY-CHOICE-1 option under Buy; the pay-first hop (INAPP-PAY-FIRST-1) has its own tests
  auth.user = null;
  resetInAppPayChoiceShown();
  window.history.pushState({}, "", "/packs?utm_source=instagram&fbclid=zz");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

async function mountPage() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/packs"]}>
        <Routes>
          <Route path="/packs" element={<PacksPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

describe("INAPP-PAY-CHOICE-1 /packs tiles (the real page)", () => {
  it("in-app, signed out: tile Buys keep their buttons and get the option (Bundle, Test Series, Subject / Mock rows)", async () => {
    setUa(IG_ANDROID);
    await mountPage();
    const hrefs = screen.getAllByTestId("inapp-pay-choice-chrome").map((a) => decodeURIComponent(a.getAttribute("href")!));
    expect(hrefs.length).toBeGreaterThan(1);
    expect(hrefs.some((h) => h.includes("buy=pack_bundle"))).toBe(true);
    expect(hrefs.some((h) => h.includes("buy=test_series"))).toBe(true);
    expect(hrefs.some((h) => /buy=pack_subject.*t=(maths|science)/.test(h))).toBe(true);
    expect(hrefs.every((h) => h.includes("fbclid=zz") && h.includes("via=inapp"))).toBe(true);
    expect(screen.getByTestId("tile-buy-pack_bundle")).toBeTruthy();
  });
  it("signed in: nothing. Normal browser: nothing", async () => {
    setUa(IG_ANDROID);
    auth.user = { uid: "u1" };
    await mountPage();
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
    cleanup();
    auth.user = null;
    setUa(CHROME);
    await mountPage();
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
  it("inapp_pay_choice_shown rides once per page view however many tiles", async () => {
    setUa(IG_ANDROID);
    const analytics = await import("../analytics/analytics");
    const spy = vi.spyOn(analytics, "trackOnboardingEvent");
    await mountPage();
    expect(spy.mock.calls.filter((c) => c[0] === "inapp_pay_choice_shown")).toHaveLength(1);
    spy.mockRestore();
  });
});

describe("INAPP-PAY-CHOICE-1 tile steps aside", () => {
  const api = (o: Partial<PacksShopApi>): PacksShopApi => ({
    openPack: () => undefined,
    openCbq: () => undefined,
    buyNow: () => undefined,
    chooseChapter: () => undefined,
    ownsPack: () => false,
    buyEnabled: true,
    blockedBy: () => false,
    parentAsk: () => null,
    openSku: null,
    subject: "maths",
    signedOut: true,
    ...o,
  } as PacksShopApi);
  it("shows with a signed-out api; hidden while this pack's rescue card shows, while blocked, when not signed out", () => {
    setUa(IG_ANDROID);
    const r = render(<PackTileBuy sku="pack_bundle" api={api({})} />);
    expect(screen.getByTestId("inapp-pay-choice")).toBeTruthy();
    r.unmount();
    render(<PackTileBuy sku="pack_bundle" api={api({ rescueShowing: () => true })} />).unmount();
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
    render(<PackTileBuy sku="pack_bundle" api={api({ signedOut: false })} />).unmount();
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
    render(<PackTileBuy sku="pack_bundle" api={api({ blockedBy: () => true })} />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
  it("the CBQ card Buy (PackCbqBuy) gets the option with ?buy=pack_cbq&t=science", () => {
    setUa(IG_ANDROID);
    render(<PackCbqBuy subject="science" api={api({})} testPrefix="x" />);
    expect(decodeURIComponent(screen.getByTestId("inapp-pay-choice-chrome").getAttribute("href")!)).toMatch(/buy=pack_cbq.*t=science/);
  });
});
