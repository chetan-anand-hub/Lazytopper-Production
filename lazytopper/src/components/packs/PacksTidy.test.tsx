/**
 * PACKS-TIDY-1 (owner, 9 Nov 2026) - /packs as collapsible rows: the smaller packs are native <details> rows with a Maths / Science
 * switch where it applies; deep links open (and preselect) the matching row; My packs is ONE collapsed row per owned pack.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ packs: true, guest: false }));
vi.mock("../../services/guestPay", async (orig) => ({ ...(await orig<typeof import("../../services/guestPay")>()), isGuestPayClientEnabled: () => flags.guest }));
vi.mock("../guestPay/GuestPaySheet", () => ({ default: (p: { item: { sku: string; target?: string } }) => <div data-testid="guest-sheet" data-sku={p.item.sku} data-target={p.item.target ?? ""} /> }));
const owned = vi.hoisted(() => ({ packs: [] as Array<Record<string, unknown>> }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => flags.packs,
    fetchMyPacks: vi.fn(async () => ({ packs: owned.packs, licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null })),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
    checkPackOrder: vi.fn(),
  };
});
const track = vi.hoisted(() => ({ checkout: vi.fn(), sample: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", () => ({
  trackPackCheckout: (...a: unknown[]) => track.checkout(...a),
  trackPackSampleDownload: (...a: unknown[]) => track.sample(...a),
  trackPackPurchase: () => undefined,
  trackPackEvent: () => undefined,
}));
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({
  default: (p: { sku: string; focusPicker?: boolean; buy?: unknown }) => (
    <div data-testid="dialog" data-sku={p.sku} data-focus={String(Boolean(p.focusPicker))}>{p.buy as never}</div>
  ),
}));

import PacksPage from "../../pages/PacksPage";
import * as packs from "../../services/packs";

const mineMock = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;

function page(url = "/packs") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/packs" element={<PacksPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const row = (id: string) => screen.getByTestId(`packs-row-${id}`) as HTMLDetailsElement;

beforeEach(() => {
  auth.user = null;
  flags.packs = true;
  flags.guest = false;
  owned.packs = [];
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];
});
afterEach(() => cleanup());

describe("PACKS-TIDY-1 · signed out", () => {
  it("the smaller packs are collapsed native <details> rows; the page has one terms line and one samples note", () => {
    page();
    for (const id of ["subject", "mock", "chapter"]) {
      expect(row(id).tagName).toBe("DETAILS");
      expect(row(id).open, id).toBe(false);
      expect(row(id).querySelector("summary")?.textContent).toContain(packs.packPriceLabel(`pack_${id}` as packs.PackSku));
    }
    expect(document.body.textContent?.split("One-time payment · never renews").length).toBe(2);
    expect(screen.getByText("Free samples: one-page PDFs, no sign-up.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Every question. Worked solutions.");
  });

  it("Subject and Mock rows have a Maths / Science radiogroup; the Chapter row has none; the switch swaps Buy and sample together", () => {
    page();
    for (const id of ["subject", "mock"]) {
      const group = within(row(id)).getByRole("radiogroup");
      const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
      expect(radios.map((r) => r.value)).toEqual(["maths", "science"]);
      expect(radios[0].checked).toBe(true);
      expect(screen.getByTestId(`tile-buy-pack_${id}-maths`)).toBeTruthy();
      fireEvent.click(radios[1]);
      expect(radios[1].checked).toBe(true);
      expect(screen.getByTestId(`tile-buy-pack_${id}-science`)).toBeTruthy();
      expect(screen.queryByTestId(`tile-buy-pack_${id}-maths`)).toBeNull();
      expect(screen.getByTestId(`pack-sample-lazytopper-sample-${id}-science`)).toBeTruthy();
      expect(screen.queryByTestId(`pack-sample-lazytopper-sample-${id}-maths`)).toBeNull();
    }
    expect(within(row("chapter")).queryByRole("radiogroup")).toBeNull();
  });

  it("the CBQ card is ONE card with a switch; switching changes the name, Buy and sample together", () => {
    page();
    expect(screen.getAllByTestId(/^cbq-card-/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId("cbq-subject-science"));
    const card = screen.getByTestId("cbq-card-science");
    expect(card.textContent).toContain("Science CBQ Pack");
    expect(within(card).getByTestId("tile-buy-pack_cbq-science")).toBeTruthy();
    expect(within(card).getByTestId("pack-sample-lazytopper-sample-cbq-science")).toBeTruthy();
  });

  it("deep links open the matching row and preselect its subject: ?mock=science, ?pack=subject&subject=science, ?chapter=, ?pack=cbq&subject=science", async () => {
    page("/packs?mock=science");
    await screen.findByTestId("dialog");
    expect(row("mock").open).toBe(true);
    expect((within(row("mock")).getByRole("radio", { name: "Science" }) as HTMLInputElement).checked).toBe(true);
    expect(row("subject").open).toBe(false);
    cleanup();
    page("/packs?pack=subject&subject=science");
    await screen.findByTestId("dialog");
    expect(row("subject").open).toBe(true);
    expect((within(row("subject")).getByRole("radio", { name: "Science" }) as HTMLInputElement).checked).toBe(true);
    cleanup();
    page("/packs?chapter=triangles");
    await screen.findByTestId("dialog");
    expect(row("chapter").open).toBe(true);
    cleanup();
    page("/packs?pack=cbq&subject=science");
    await screen.findByTestId("dialog");
    expect(screen.getByTestId("cbq-card-science")).toBeTruthy();
  });

  it("See inside on a chosen subject opens the pop-up on THAT subject (the row does not flip back)", async () => {
    page();
    fireEvent.click(screen.getByTestId("packs-subject-mock-science"));
    fireEvent.click(screen.getByTestId("packs-card-mock"));
    await screen.findByTestId("dialog");
    expect((within(row("mock")).getByRole("radio", { name: "Science" }) as HTMLInputElement).checked).toBe(true);
  });

  it("a sign-in-then-pay Buy from an opened row keeps today's resume path", async () => {
    flags.guest = false;
    page();
    fireEvent.click(screen.getByTestId("packs-subject-subject-science"));
    expect(screen.getByTestId("tile-buy-pack_subject-science").textContent).toBe(`Buy Science ${packs.packPayLabel("pack_subject")}`);
  });
});

describe("PACKS-TIDY-1 · signed in", () => {
  it("My packs: ONE collapsed row per owned pack with its date; the first pack stays collapsed unless it is the ready/bought one", async () => {
    auth.user = { uid: "u1" };
    owned.packs = [
      { packId: "pack_subject:maths", sku: "pack_subject", target: "maths", pricePaidInr: 199, paidAt: 1_790_000_000_000, orderId: "o1" },
      { packId: "pack_mock:science", sku: "pack_mock", target: "science", pricePaidInr: 99, paidAt: 1_791_000_000_000, orderId: "o2" },
    ];
    page();
    await waitFor(() => expect(screen.getAllByTestId("packs-owned")).toHaveLength(2));
    for (const el of screen.getAllByTestId("packs-owned") as HTMLDetailsElement[]) {
      expect(el.tagName).toBe("DETAILS");
      expect(el.open).toBe(false);
      expect(el.querySelector("summary")?.textContent).toMatch(/Bought |\d+ papers? · \d+ marked/);
    }
    expect(screen.queryByRole("button", { name: "Show files" })).toBeNull();
    expect(mineMock).toHaveBeenCalled();
    // owned packs say so on the shop too (no second Buy)
    fireEvent.click(screen.getByTestId("packs-subject-mock-science"));
    expect(screen.getByTestId("tile-owned-pack_mock-science")).toBeTruthy();
  });
});
