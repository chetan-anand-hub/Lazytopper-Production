/**
 * PARENTS-PAY-1 - /for-parents has real Pay buttons. The Board Pass Pay opens the shared "Who will use it?" sheet with the PARENT
 * wording (any number or email works); every pack card's Buy opens that pack's checkout through the shared pack shop; with the
 * checkout flag off the Pay uses the existing one-tap Board Pass link. Default sheet wording elsewhere is unchanged (CheckoutSheet.test).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ who: true }));
const shop = vi.hoisted(() => ({ owned: [] as { packId: string; sku: string; target: string; pricePaidInr: number; paidAt: number }[] }));
vi.mock("../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => flags.who,
}));
vi.mock("../services/packs", async (orig) => ({
  ...(await orig<typeof import("../services/packs")>()),
  isPacksClientEnabled: () => true,
  fetchMyPacks: vi.fn(async () => ({ packs: shop.owned, licensee: { name: "Asha", email: "a@b.in" } })),
  buyPack: vi.fn(async () => ({ status: "paid", grant: { sku: "pack_cbq" }, paymentId: "pay_x", amountInr: 199 })),
  checkPackOrder: vi.fn(),
}));
vi.mock("../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("./PackDialog", () => ({ default: () => null }));
vi.mock("../pages/PackDialog", () => ({ default: () => null }));

import ForParentsPage from "../pages/ForParentsPage";
import { WHO_FIELD_HELP, WHO_FIELD_LABEL, WHO_PARENT_FIELD_HELP, WHO_PARENT_FIELD_LABEL } from "../services/checkoutWho";

afterEach(() => {
  cleanup();
  auth.user = null;
  flags.who = true;
  shop.owned = [];
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

describe("PARENTS-PAY-1 - the parent copy", () => {
  it("is the owner's exact wording and differs from the student-side copy", () => {
    expect(WHO_PARENT_FIELD_LABEL).toBe("Mobile number or email your child will sign in with");
    expect(WHO_PARENT_FIELD_HELP).toBe("It can be your own number if your child uses your phone — they sign in with it. Or use an email.");
    expect(WHO_FIELD_LABEL).toBe("Student's mobile number or email");
    expect(WHO_FIELD_HELP).toMatch(/not yours/);
  });
});

describe("PARENTS-PAY-1 - Pay for my child opens the Board Pass checkout", () => {
  it("signed out: the hero Pay opens the sheet with the Board Pass and the PARENT wording", async () => {
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-hero"));
    const sheet = await screen.findByTestId("who-sheet");
    expect(within(sheet).getByText(/Board Pass/)).toBeTruthy();
    expect(within(sheet).getByText(WHO_PARENT_FIELD_LABEL)).toBeTruthy();
    expect(screen.getByTestId("who-help").textContent).toBe(WHO_PARENT_FIELD_HELP);
    expect(sheet.textContent).not.toContain("not yours");
    expect(sheet.textContent).not.toContain(WHO_FIELD_LABEL);
  });

  it("the price-section Pay opens the same sheet", async () => {
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-price"));
    expect(await screen.findByTestId("who-sheet")).toBeTruthy();
  });

  it("checkout flag off: Pay uses the existing one-tap Board Pass link on /pricing (no second checkout)", async () => {
    flags.who = false;
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-hero"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/pricing?buy=board_pass"));
  });

  it("signed in: the sheet offers 'For: you' (one tap into the existing one-tap start) and 'Buying for someone else?'", async () => {
    auth.user = { uid: "u1", email: "parent@example.com" };
    page();
    fireEvent.click(await screen.findByTestId("fp-pay-hero"));
    expect(await screen.findByTestId("who-self")).toBeTruthy();
    fireEvent.click(screen.getByTestId("who-pay-self"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/pricing?buy=board_pass"));
  });
});

describe("PARENTS-PAY-1 - every pack card has a Buy", () => {
  it("shows a Buy on each of the six cards: both CBQ, Subject, Mock, Chapter and the Bundle", async () => {
    page();
    const section = await screen.findByTestId("fp-packs");
    await waitFor(() => expect(within(section).getByTestId("fp-buy-pack_cbq-maths")).toBeTruthy());
    expect(within(section).getByTestId("fp-buy-pack_cbq-science")).toBeTruthy();
    for (const sku of ["pack_subject", "pack_mock", "pack_chapter", "pack_bundle"]) expect(within(section).getByTestId(`fp-buy-${sku}`)).toBeTruthy();
    // Subject / Mock ask Maths or Science; Chapter opens the picker; "See all packs" stays.
    expect(within(section).getByTestId("tile-buy-pack_subject-maths")).toBeTruthy();
    expect(within(section).getByTestId("tile-buy-pack_mock-science")).toBeTruthy();
    expect(within(section).getByTestId("tile-buy-pack_chapter")).toBeTruthy();
    expect(screen.getByTestId("fp-packs-band-link").textContent).toBe("See all packs");
  });

  it("a CBQ Buy opens the checkout for THAT pack with the parent wording", async () => {
    page();
    fireEvent.click(await screen.findByTestId("fp-buy-pack_cbq-science"));
    const sheet = await screen.findByTestId("who-sheet");
    expect(sheet.textContent).toMatch(/CBQ/);
    expect(sheet.textContent).toMatch(/Science/);
    expect(within(sheet).getByText(WHO_PARENT_FIELD_LABEL)).toBeTruthy();
  });

  it("the Bundle Buy opens the bundle checkout", async () => {
    page();
    fireEvent.click(await screen.findByTestId("tile-buy-pack_bundle"));
    const sheet = await screen.findByTestId("who-sheet");
    expect(sheet.textContent).toMatch(/Bundle|Maths \+ Science/);
  });
});

describe("PARENTS-PAY-1 review - owned and paid packs point to the downloads (My packs is hidden on this page)", () => {
  it("an owned CBQ pack shows 'Owned · Open My packs' linking /packs#my-packs, never a silent gap", async () => {
    auth.user = { uid: "u1", email: "p@example.com" };
    shop.owned = [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 199, paidAt: 1 }];
    page();
    const link = (await screen.findByTestId("fp-owned-link")) as HTMLAnchorElement;
    expect(link.textContent).toMatch(/Owned/);
    expect(link.getAttribute("href")).toBe("/packs#my-packs");
    expect(screen.queryByTestId("fp-buy-pack_cbq-maths")).toBeNull();
    expect(screen.getByTestId("fp-buy-pack_cbq-science")).toBeTruthy();
  });

  it("after a signed-in payment the status line is followed by 'Open My packs' to /packs#my-packs", async () => {
    auth.user = { uid: "u1", email: "p@example.com" };
    page();
    fireEvent.click(await screen.findByTestId("fp-buy-pack_cbq-science"));
    fireEvent.click(await screen.findByTestId("who-pay-self"));
    const open = (await screen.findByTestId("packs-open-my-packs")) as HTMLAnchorElement;
    expect(open.getAttribute("href")).toBe("/packs#my-packs");
    expect(screen.getByTestId("packs-status")).toBeTruthy();
  });
});
