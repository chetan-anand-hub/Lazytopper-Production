/** INAPP-PAY-CHOICE-1 - page call sites: /for-parents (link = the page itself, no ?buy=) and the /cbq-packs CBQ card; signed-out only. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => true,
}));
vi.mock("../services/checkout", async (orig) => ({
  ...(await orig<typeof import("../services/checkout")>()),
  isPaymentsClientEnabled: () => true,
  authHeaders: async () => ({ Authorization: "Bearer t" }),
}));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "A", email: "a@b.in" }, boardPassCredit: null })), buyPack: vi.fn(), checkPackOrder: vi.fn() };
});
vi.mock("../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("./PackDialog", () => ({ default: () => null }));

import ForParentsPage from "./ForParentsPage";
import CbqPacksPage from "./CbqPacksPage";
import { resetInAppPayChoiceShown } from "../components/payRescue/InAppPayChoice";

const UA = {
  igAndroid: "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android",
  chrome: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};
const setUa = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  resetInAppPayChoiceShown();
  window.history.pushState({}, "", "/for-parents?utm_source=instagram&fbclid=zz");
});
afterEach(() => cleanup());

async function mount(path: string, el: JSX.Element) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path.split("?")[0]} element={el} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

describe("INAPP-PAY-CHOICE-1 /for-parents", () => {
  it("in-app, signed out: option under the Pay; the link is /for-parents itself with attribution and NO ?buy=", async () => {
    setUa(UA.igAndroid);
    await mount("/for-parents", <ForParentsPage />);
    const a = (await screen.findAllByTestId("inapp-pay-choice-chrome"))[0];
    const href = a.getAttribute("href")!;
    expect(href).toContain("intent://");
    expect(href).toContain("/for-parents?");
    expect(href).not.toContain("/board-pass");
    expect(href).not.toContain("buy=");
    expect(href).toContain("fbclid=zz");
    expect(href).toContain("via=inapp");
    expect(screen.getByTestId("fp-pay-hero")).toBeTruthy();
  });
  it("signed in: nothing; normal browser: nothing", async () => {
    setUa(UA.igAndroid);
    auth.user = { uid: "u1" };
    await mount("/for-parents", <ForParentsPage />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
    cleanup();
    auth.user = null;
    setUa(UA.chrome);
    await mount("/for-parents", <ForParentsPage />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
});

describe("INAPP-PAY-CHOICE-1 /cbq-packs CBQ card", () => {
  it("in-app, signed out: option with ?buy=pack_cbq&t=maths; signed in: nothing", async () => {
    setUa(UA.igAndroid);
    window.history.pushState({}, "", "/cbq-packs?utm_source=instagram");
    await mount("/cbq-packs", <CbqPacksPage />);
    const a = (await screen.findAllByTestId("inapp-pay-choice-chrome"))[0];
    expect(a.getAttribute("href")).toContain("buy=pack_cbq");
    expect(a.getAttribute("href")).toContain("t=maths");
    cleanup();
    auth.user = { uid: "u1" };
    await mount("/cbq-packs", <CbqPacksPage />);
    expect(screen.queryByTestId("inapp-pay-choice")).toBeNull();
  });
});
