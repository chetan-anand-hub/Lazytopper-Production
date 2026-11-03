// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
const sub = vi.hoisted(() => ({ status: { tier: "free", trialStartDate: null } as { tier: string; trialStartDate: string | null } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("../../services/subscriptionService", () => ({
  loadSubscription: () => sub.status,
  onSubscriptionHydrated: (cb: (uid: string, s: unknown) => void) => {
    cb("u1", sub.status);
    return () => undefined;
  },
}));

import PackPromoCard, { promoChips, promoHref, showPackPromo } from "./PackPromoCard";

describe("showPackPromo visibility rule", () => {
  it("signed-out yes", () => expect(showPackPromo("", null, false)).toBe(true));
  it("trial yes", () => expect(showPackPromo("u", { tier: "trial" }, true)).toBe(true));
  it("Basic yes", () => expect(showPackPromo("u", { tier: "free" }, true)).toBe(true));
  it("Premium no", () => expect(showPackPromo("u", { tier: "premium" }, true)).toBe(false));
  it("unknown no", () => {
    expect(showPackPromo("u", { tier: "free" }, false)).toBe(false);
    expect(showPackPromo("u", null, false)).toBe(false);
  });
});

describe("promoChips", () => {
  it("omits the CBQ chip without a pack_cbq SKU and uses the cheapest price", () => {
    expect(promoChips({ pack_chapter: 49, pack_mock: 99 })).toEqual(["Chapter tests & mock papers", "From ₹49"]);
  });
  it("adds the CBQ chip when the SKU exists", () => {
    expect(promoChips({ pack_chapter: 49, pack_cbq: 199 })).toContain("Board CBQ Pack ₹199");
  });
});

describe("PackPromoCard render", () => {
  const ui = () => render(<MemoryRouter><PackPromoCard surface="home" /></MemoryRouter>);
  it("shows for signed-out", () => {
    auth.user = null;
    ui();
    expect(screen.getByTestId("pack-promo-card")).toBeTruthy();
    expect(screen.getByTestId("pack-promo-cta").getAttribute("href")).toBe("/pricing#packs");
  });
  it("shows for Basic, hides for Premium", () => {
    auth.user = { uid: "u1" };
    sub.status = { tier: "free", trialStartDate: null };
    const a = ui();
    expect(screen.queryByTestId("pack-promo-card")).toBeTruthy();
    a.unmount();
    sub.status = { tier: "premium", trialStartDate: null };
    ui();
    expect(screen.queryByTestId("pack-promo-card")).toBeNull();
  });
});

describe("promoHref (AD-LANDING-OFFER-1)", () => {
  it("every surface goes to /pricing#packs (LINKS-1)", () => {
    expect(promoHref("practice_hub")).toBe("/pricing#packs");
    expect(promoHref("check_improve")).toBe("/pricing#packs");
    expect(promoHref("home")).toBe("/pricing#packs");
    expect(promoHref("quick_practice")).toBe("/pricing#packs");
  });
});
