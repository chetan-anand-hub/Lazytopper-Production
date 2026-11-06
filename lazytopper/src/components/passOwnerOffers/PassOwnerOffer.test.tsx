// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean } }));
const sub = vi.hoisted(() => ({ tier: "premium" as string }));
const mine = vi.hoisted(() => ({ packs: [] as Array<{ packId: string; sku: string; target: string }>, fail: false, pending: false }));
const track = vi.hoisted(() => ({ view: vi.fn(), checkout: vi.fn() }));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("../../services/subscriptionService", () => ({
  isPaidPremium: (s: { tier?: string } | null) => s?.tier === "premium",
  loadSubscription: () => ({ tier: sub.tier }),
  onSubscriptionHydrated: () => () => undefined,
}));
vi.mock("../../services/packs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/packs")>()),
  isPacksClientEnabled: () => true,
  fetchMyPacks: vi.fn(async () => {
    if (mine.pending) return new Promise(() => undefined);
    if (mine.fail) throw new Error("down");
    return { packs: mine.packs, licensee: { name: "", email: "a@b.c" }, boardPassCredit: { creditInr: 0, expiresAtMs: null, payInr: null } };
  }),
}));
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackEvent: track.view, trackPackCheckout: track.checkout }));

import PassOwnerOffer from "./PassOwnerOffer";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { PASS_OFFERS_SNOOZE_KEY } from "./passOwnerOffersModel";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPayLabel } from "../../services/packs";

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}
function ui(props: Parameters<typeof PassOwnerOffer>[0]) {
  return render(
    <MemoryRouter initialEntries={["/me"]}>
      <Routes>
        <Route path="/me" element={<PassOwnerOffer {...props} />} />
        <Route path="/packs" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1" };
  sub.tier = "premium";
  mine.packs = [];
  mine.fail = false;
  mine.pending = false;
  resetOwnedPacksCache();
  window.localStorage.clear();
  track.view.mockReset();
  track.checkout.mockReset();
});
afterEach(cleanup);

describe("PassOwnerOffer - who sees it", () => {
  it("a paid Board Pass owner sees ONE offer card with both CBQ subjects and Not now", async () => {
    ui({ placement: "pass_me" });
    expect(await screen.findByTestId("pass-offer-pass_me")).toBeTruthy();
    expect(screen.getAllByRole("complementary")).toHaveLength(1);
    expect(screen.getByTestId("pass-offer-buy-pack_cbq-maths").textContent).toBe(`Maths ${packPayLabel("pack_cbq")}`);
    expect(screen.getByTestId("pass-offer-buy-pack_cbq-science").textContent).toBe(`Science ${packPayLabel("pack_cbq")}`);
    expect(screen.getByTestId("pass-offer-not-now")).toBeTruthy();
    await waitFor(() => expect(track.view).toHaveBeenCalledWith("pack_view", "pack_cbq", "pass_me"));
    expect(track.view).toHaveBeenCalledTimes(1);
  });
  it("trial / Basic / signed out / a local session: nothing (and no owned-pack read)", async () => {
    for (const setup of [
      () => (sub.tier = "trial"),
      () => (sub.tier = "free"),
      () => (auth.user = null),
      () => (auth.user = { uid: "u1", isLocalSession: true }),
    ]) {
      sub.tier = "premium";
      auth.user = { uid: "u1" };
      setup();
      const { container, unmount } = ui({ placement: "pass_me" });
      await new Promise((r) => setTimeout(r, 0));
      expect(container.textContent).toBe("");
      unmount();
    }
  });
  it("the success screen's own server-verified payment (assumePaid) shows it before the cached record catches up", async () => {
    sub.tier = "free";
    ui({ placement: "pass_success", assumePaid: true });
    expect((await screen.findByTestId("pass-offer-pass_success")).textContent).toContain("Your Board Pass is on.");
  });
  it("owned-pack list loading or failed: nothing (when unsure, never sell)", async () => {
    mine.pending = true;
    const a = ui({ placement: "pass_me" });
    await new Promise((r) => setTimeout(r, 0));
    expect(a.container.textContent).toBe("");
    a.unmount();
    resetOwnedPacksCache();
    mine.pending = false;
    mine.fail = true;
    const b = ui({ placement: "pass_me" });
    await new Promise((r) => setTimeout(r, 10));
    expect(b.container.textContent).toBe("");
  });
  it("never an owned pack", async () => {
    mine.packs = [{ packId: "pack_mock:maths", sku: "pack_mock", target: "maths" }];
    const { container } = ui({ placement: "pass_mock", hint: { subject: "maths" } });
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe("");
  });
});

describe('PassOwnerOffer - "Not now" and Buy', () => {
  it("Not now hides it and every other offer for a day on this device", async () => {
    const a = ui({ placement: "pass_me" });
    fireEvent.click(await screen.findByTestId("pass-offer-not-now"));
    expect(a.container.textContent).toBe("");
    expect(Number(window.localStorage.getItem(PASS_OFFERS_SNOOZE_KEY))).toBeGreaterThan(Date.now());
    a.unmount();
    const b = ui({ placement: "pass_mock", hint: { subject: "science" } });
    await new Promise((r) => setTimeout(r, 10));
    expect(b.container.textContent).toBe("");
  });
  it("Buy sends pack_checkout (from = the placement, no PII) and opens the central /packs one-tap checkout", async () => {
    ui({ placement: "pass_mock", hint: { subject: "science" } });
    fireEvent.click(await screen.findByTestId("pass-offer-buy-pack_mock-science"));
    expect(track.checkout).toHaveBeenCalledWith({ sku: "pack_mock", itemName: expect.any(String), valueInr: 99 }, { signedIn: true, from: "pass_mock" });
    expect(screen.getByTestId("where").textContent).toBe("/packs?buy=pack_mock&t=science");
  });
});
