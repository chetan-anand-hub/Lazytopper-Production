/**
 * INAPP-PAY-FIRST-1b - no re-hop: an Instagram-Android visitor who ARRIVES on /pricing?buy=board_pass (the Chrome hand-over, or any
 * ?buy= link) gets the sheet, never another hop; the month pass never hops (?buy= only reopens the Board Pass).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
const mockSub = vi.hoisted(() => ({ status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>, hydrated: true }));
vi.mock("./useMonthPassAvailable", () => ({ useMonthPassAvailable: () => false, fetchMonthPassAvailable: vi.fn(async () => false), resetMonthPassAvailableForTests: () => undefined }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (orig) => ({ ...(await orig<typeof import("../../analytics/analytics")>()), trackOnboardingEvent: onboarding }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })) }));
vi.mock("../../services/checkout", async (orig) => ({ ...(await orig<typeof import("../../services/checkout")>()), isPaymentsClientEnabled: () => true, buyPass: vi.fn() }));
vi.mock("../../services/guestPay", async (orig) => ({ ...(await orig<typeof import("../../services/guestPay")>()), isGuestPayClientEnabled: () => false }));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({ ...(await orig<typeof import("../../services/checkoutWhoFlag")>()), isCheckoutWhoClientEnabled: () => true }));

import PassCheckout, { PassCheckoutView } from "./PassCheckout";
import { resetInAppPayFirst } from "../../utils/inAppPayFirst";
import { resetInAppPayChoiceShown } from "../payRescue/InAppPayChoice";

const IG_ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.109 Android";
const realLocation = window.location;
let loc: { href: string; pathname: string; search: string; origin: string };
beforeEach(() => {
  const u = new URL("https://www.lazytopper.com/pricing?buy=board_pass&via=inapp");
  loc = { href: u.toString(), pathname: u.pathname, search: u.search, origin: u.origin };
  Object.defineProperty(window, "location", { value: loc, configurable: true, writable: true });
  Object.defineProperty(navigator, "userAgent", { value: IG_ANDROID, configurable: true });
  mockAuth.user = null;
  onboarding.mockReset();
  resetInAppPayFirst();
  resetInAppPayChoiceShown();
});
afterEach(() => {
  cleanup();
  Object.defineProperty(window, "location", { value: realLocation, configurable: true, writable: true });
});
const hops = () => onboarding.mock.calls.filter((c) => c[0] === "inapp_pay_first_hop");

describe("INAPP-PAY-FIRST-1b · no re-hop", () => {
  it("signed-out ?buy=board_pass arrival in Instagram Android opens the sheet and does NOT hop (the auto-start is not a tap)", async () => {
    const start = loc.href;
    render(
      <MemoryRouter initialEntries={["/pricing?buy=board_pass"]}>
        <Routes>
          <Route path="/pricing" element={<PassCheckout />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("who-first")).toBeTruthy();
    expect(loc.href).toBe(start);
    expect(hops()).toHaveLength(0);
  });

  it("the month pass never hops (a ?buy= link only reopens the Board Pass): signed-out tap goes to today's sign-in", () => {
    const onSignIn = vi.fn();
    const start = loc.href;
    const view = render(
      <MemoryRouter>
        <PassCheckoutView signedIn={false} inAppChoice offerOpen showMonth activePassEnd={null} onSignIn={onSignIn} onBuy={vi.fn() as never} />
      </MemoryRouter>,
    );
    fireEvent.click(view.container.querySelector(".lt-pricing-pay--month") as HTMLElement);
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(loc.href).toBe(start);
    expect(hops()).toHaveLength(0);
  });
});
