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
/** PACKS-TIDY-2: each row is a wrapper holding its native <details> (name, line, price; opened: the rest) and, outside it, its Buy. */
const row = (id: string) => screen.getByTestId(`packs-row-${id}`).querySelector("details") as HTMLDetailsElement;
const subjectRadio = (s: "maths" | "science") => screen.getByTestId(`packs-subject-${s}`) as HTMLInputElement;

beforeEach(() => {
  auth.user = null;
  flags.packs = true;
  flags.guest = false;
  owned.packs = [];
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];
});
afterEach(() => cleanup());

describe("PACKS-TIDY-1 · signed out", () => {
  it("the smaller packs are collapsed native <details> rows; the page has one terms line and one samples note", async () => {
    page();
    for (const id of ["subject", "mock", "chapter"]) {
      expect(row(id).tagName).toBe("DETAILS");
      expect(row(id).open, id).toBe(false);
      expect(row(id).querySelector("summary")?.textContent).toContain(packs.packPriceLabel(`pack_${id}` as packs.PackSku));
    }
    expect(document.body.textContent?.split("One-time payment · never renews").length).toBe(2);
    expect(document.body.textContent).toContain("Free samples: one-page PDFs, no sign-up.");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Question Bank + Mocks: Class 10 Maths and Science PDF packs");
    // PACKS-TIDY-2: each folded row already carries its Buy (outside the <details>, so it never folds the row); one row open at a time.
    for (const id of ["subject", "mock", "chapter"]) {
      expect(row(id).contains(screen.getByTestId(`pk-buy-${id}-box`)), id).toBe(false);
      expect(screen.getByTestId(`packs-row-${id}`).contains(screen.getByTestId(`pk-buy-${id}-box`)), id).toBe(true);
      expect(row(id).getAttribute("name")).toBe("lt-pk-rows");
    }
    row("subject").open = true;
    fireEvent(row("subject"), new Event("toggle"));
    await waitFor(() => expect(row("subject").open).toBe(true));
    row("mock").open = true;
    fireEvent(row("mock"), new Event("toggle"));
    await waitFor(() => expect(row("subject").open).toBe(false));
    expect(row("mock").open).toBe(true);
  });

  it("PACKS-TIDY-2: ONE Maths / Science switch above the rows swaps the Subject, Mock and Chapter Buys and samples together; the Bundle is unaffected", () => {
    page();
    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    const radios = within(screen.getByRole("radiogroup")).getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(["maths", "science"]);
    expect(radios[0].checked).toBe(true);
    const bundleBefore = screen.getByTestId("packs-cell-bundle").textContent;
    for (const id of ["subject", "mock"]) expect(screen.getByTestId(`tile-buy-pack_${id}-maths`)).toBeTruthy();
    fireEvent.click(radios[1]);
    expect(radios[1].checked).toBe(true);
    for (const id of ["subject", "mock"]) {
      expect(screen.getByTestId(`tile-buy-pack_${id}-science`)).toBeTruthy();
      expect(screen.queryByTestId(`tile-buy-pack_${id}-maths`)).toBeNull();
      expect(screen.getByTestId(`pack-sample-lazytopper-sample-${id}-science`)).toBeTruthy();
      expect(screen.queryByTestId(`pack-sample-lazytopper-sample-${id}-maths`)).toBeNull();
    }
    expect(screen.getByTestId("tile-buy-pack_chapter").textContent).toContain("Choose a Science chapter");
    expect(screen.getByTestId("packs-cell-bundle").textContent).toBe(bundleBefore);
    expect(screen.getByTestId("packs-cell-bundle").textContent).toContain("both subjects");
  });

  it("PACKS-TIDY-2: ?subject=science selects Science in the first render; the CBQ link keeps it", () => {
    page("/packs?subject=science&utm_source=google");
    expect(subjectRadio("science").checked).toBe(true);
    expect(screen.getByTestId("tile-buy-pack_subject-science")).toBeTruthy();
    expect(screen.getByTestId("packs-link-cbq").getAttribute("href")).toBe("/cbq-packs?subject=science");
  });

  it("deep links open the matching row and preselect its subject: ?mock=science, ?pack=subject&subject=science, ?chapter=, ?pack=cbq&subject=science", async () => {
    page("/packs?mock=science");
    await screen.findByTestId("dialog");
    expect(row("mock").open).toBe(true);
    expect(subjectRadio("science").checked).toBe(true);
    expect(row("subject").open).toBe(false);
    cleanup();
    page("/packs?pack=subject&subject=science");
    await screen.findByTestId("dialog");
    expect(row("subject").open).toBe(true);
    expect(subjectRadio("science").checked).toBe(true);
    cleanup();
    page("/packs?chapter=triangles");
    await screen.findByTestId("dialog");
    expect(row("chapter").open).toBe(true);
    cleanup();
    // PACKS-TIDY-2: the CBQ card left for /cbq-packs; its pop-up still opens here from the sitelink.
    page("/packs?pack=cbq&subject=science");
    expect((await screen.findByTestId("dialog")).getAttribute("data-sku")).toBe("pack_cbq");
  });

  it("See inside on a chosen subject opens the pop-up on THAT subject (the row does not flip back)", async () => {
    page();
    fireEvent.click(screen.getByTestId("packs-subject-science"));
    fireEvent.click(screen.getByTestId("packs-card-mock"));
    await screen.findByTestId("dialog");
    expect(subjectRadio("science").checked).toBe(true);
  });

  it("a sign-in-then-pay Buy from an opened row keeps today's resume path", async () => {
    flags.guest = false;
    page();
    fireEvent.click(screen.getByTestId("packs-subject-science"));
    expect(screen.getByTestId("tile-buy-pack_subject-science").textContent).toBe(`Buy Science ${packs.packPayLabel("pack_subject")}`);
  });
});

describe("PACKS-TIDY-2 · the phone's Bundle bar", () => {
  it("is never its own payment path: its button runs the Bundle's Buy (same pop-up, same buyPack); none while dark, owned or a pop-up is open", async () => {
    auth.user = { uid: "u1" };
    const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
    buyMock.mockClear();
    page();
    const bar = await screen.findByTestId("packs-sticky");
    expect(bar.textContent).toContain(packs.packPayLabel("pack_bundle"));
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("packs-sticky-go"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0].slice(0, 2)).toEqual(["pack_bundle", undefined]);
    expect(screen.getByTestId("dialog").getAttribute("data-sku")).toBe("pack_bundle");
    expect(screen.queryByTestId("packs-sticky")).toBeNull(); // a pop-up is open
    cleanup();
    flags.packs = false;
    page();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("packs-sticky")).toBeNull();
    cleanup();
    flags.packs = true;
    owned.packs = [{ packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 1, orderId: "o" }];
    page();
    await screen.findByTestId("tile-owned-pack_bundle");
    expect(screen.queryByTestId("packs-sticky")).toBeNull();
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
    fireEvent.click(screen.getByTestId("packs-subject-science"));
    expect(screen.getByTestId("tile-owned-pack_mock-science")).toBeTruthy();
    // PACKS-TIDY-2: My packs stays FIRST, above the hero.
    const mineEl = screen.getByTestId("packs-mine");
    expect(mineEl.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
