/**
 * PARENTS-V2-1 - every Pay on /for-parents opens the pay-first checkout (CheckoutSheet, signed out, "My child / someone else" pre-selected
 * for the who step); signed in (a buyer or a Board Pass holder) goes to today's Board Pass checkout on /pricing; checkout off: the same link.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ who: true, pay: true }));
vi.mock("../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => flags.who,
  isCheckoutSelfClientEnabled: () => flags.who,
  isSelfAttachClientEnabled: () => flags.who,
}));
vi.mock("../services/checkout", async (orig) => ({
  ...(await orig<typeof import("../services/checkout")>()),
  isPaymentsClientEnabled: () => flags.pay,
}));
const analytics = vi.hoisted(() => ({ begin: vi.fn() }));
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackBeginCheckoutTap: analytics.begin,
}));

import ForParentsPage from "../pages/ForParentsPage";

afterEach(() => {
  cleanup();
  auth.user = null;
  flags.who = true;
  flags.pay = true;
  vi.clearAllMocks();
});

function Where() {
  const l = useLocation();
  return <p data-testid="where">{`${l.pathname}${l.search}`}</p>;
}
function page() {
  return render(
    <MemoryRouter initialEntries={["/for-parents"]}>
      <Routes>
        <Route path="/for-parents" element={<ForParentsPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PARENTS-V2-1 - Pay for my child", () => {
  it("signed out: the hero Pay opens the sheet at the ONE Pay (pay first), with the Board Pass and its total", async () => {
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-hero"));
    const sheet = await screen.findByTestId("who-sheet");
    expect(sheet.textContent).toMatch(/Board Pass/);
    expect(await screen.findByTestId("who-pay-self-out")).toBeTruthy();
    expect(screen.queryByTestId("who-first")).toBeNull();
    expect(analytics.begin).toHaveBeenCalledTimes(1);
    expect(analytics.begin.mock.calls[0][0]).toMatchObject({ passType: "till_boards", surface: "for_parents" });
  });

  it("the second Pay opens the same sheet", async () => {
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-second"));
    expect(await screen.findByTestId("who-sheet")).toBeTruthy();
  });

  it("checkout flag off: Pay uses the existing one-tap Board Pass link on /pricing (no second checkout)", async () => {
    flags.who = false;
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-hero"));
    expect((await screen.findByTestId("where")).textContent).toBe("/pricing?buy=board_pass");
  });

  it("signed in (a buyer or a holder): today's Board Pass checkout, unchanged - the one-tap link on /pricing", async () => {
    auth.user = { uid: "u1", email: "parent@example.com" };
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-hero"));
    expect((await screen.findByTestId("where")).textContent).toBe("/pricing?buy=board_pass");
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });
});

describe("PARENTS-V2-1 - the phone bar", () => {
  it("is a region named for the Board Pass with the price and the Pay; absent while a sheet is open", async () => {
    page();
    const bar = await screen.findByTestId("fp-sticky");
    expect(bar.textContent).toMatch(/Board Pass ₹[\d,]+( \+ GST)? · valid till 28 Feb 2027/);
    expect(screen.getByTestId("fp-sticky-go").textContent).toMatch(/^Pay ₹[\d,]+$/);
    fireEvent.click(screen.getByTestId("fp-sticky-go"));
    expect(await screen.findByTestId("who-sheet")).toBeTruthy();
    expect(screen.queryByTestId("fp-sticky")).toBeNull();
  });
});
