/** INAPP-PAY-CHOICE-1 - the up-front option under the shop's own Buy (in place, as /test-series) and under the pass Pay (PassCheckoutView). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(), buyPack: vi.fn(), checkPackOrder: vi.fn() };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: () => null }));

import PacksShop from "./PacksShop";
import { PassCheckoutView } from "../pricing/PassCheckout";

const IG_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android";
const CHROME = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

beforeEach(() => {
  window.history.pushState({}, "", "/test-series?utm_source=instagram&fbclid=zz");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "true");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function shop() {
  return render(
    <MemoryRouter initialEntries={["/test-series?utm_source=instagram&fbclid=zz"]}>
      <PacksShop embedded hideMyPacks skipView inPlace returnPath="/test-series">
        {(api) => <div>{api.buyButton?.("test_series", { label: "Get the Test Series", className: "b", testId: "ts-buy", noteClass: "n" })}</div>}
      </PacksShop>
    </MemoryRouter>,
  );
}
function pass() {
  return render(
    <MemoryRouter>
      <PassCheckoutView signedIn offerOpen activePassEnd={null} onSignIn={() => undefined} onBuy={async () => ({ status: "dismissed" })} />
    </MemoryRouter>,
  );
}

describe("INAPP-PAY-CHOICE-1 call sites", () => {
  it("in-app: the Test Series Buy keeps its button and gets the option under it, for this item", () => {
    setUa(IG_ANDROID);
    shop();
    expect(screen.getByTestId("ts-buy")).toBeTruthy();
    const a = screen.getByTestId("inapp-pay-choice-chrome");
    expect(a.getAttribute("href")).toContain("buy=test_series");
    expect(a.getAttribute("href")).toContain("fbclid");
  });
  it("in-app: the Board Pass Pay keeps its button and gets the option (?buy=board_pass)", () => {
    setUa(IG_ANDROID);
    pass();
    expect(screen.getByTestId("inapp-pay-choice-chrome").getAttribute("href")).toContain("buy=board_pass");
  });
  it("normal browser: neither shows the option", () => {
    setUa(CHROME);
    shop();
    pass();
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
  it("kill switch: no option even in-app", () => {
    setUa(IG_ANDROID);
    vi.stubEnv("VITE_INAPP_PAY_CHOICE_DISABLED", "1");
    shop();
    pass();
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
});
