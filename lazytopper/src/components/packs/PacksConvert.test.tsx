/**
 * PACKS-CONVERT-1 (owner, 3 Nov 2026) - sample -> buy, the /packs order (Bundle, CBQ, Subject, Mock, Chapter) and the one-line
 * contents above each Buy. The download-limit wall's matching pack is pinned in components/limits/limits.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

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
import CbqBand from "../pricing/CbqBand";
import * as packs from "../../services/packs";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import { sampleBuyLabel } from "./PackSampleLink";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
const mineMock = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
const P = packs.PACK_PRICE_INR;

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
function page() {
  return render(
    <MemoryRouter initialEntries={["/packs"]}>
      <Where />
      <Routes>
        <Route path="/packs" element={<PacksPage />} />
        <Route path="/login" element={<p>LOGIN PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const sampleLink = (id: string) => screen.getByTestId(`pack-sample-lazytopper-sample-${id}`);

beforeEach(() => {
  auth.user = { uid: "u1" };
  flags.packs = true;
  flags.guest = false;
  owned.packs = [];
  buyMock.mockClear();
  track.checkout.mockClear();
  track.sample.mockClear();
});
afterEach(() => cleanup());

describe("PACKS-CONVERT-1 · /packs order", () => {
  it("DOM (= visual) order: Bundle, Maths CBQ, Science CBQ, Subject, Mock, Chapter", () => {
    page();
    const ids = ["packs-card-bundle", "cbq-card-maths", "cbq-card-science", "packs-card-subject", "packs-card-mock", "packs-card-chapter"];
    const els = ids.map((id) => screen.getByTestId(id));
    for (let i = 1; i < els.length; i++) {
      expect(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `${ids[i - 1]} before ${ids[i]}`).toBeTruthy();
    }
    // the Bundle keeps its season badge / line and the #cbq anchor still lands on the band
    expect(screen.getByTestId("cbq-band").id).toBe("cbq");
  });

  it("item 4: one line of contents above Buy, counts from the pack constants (the Bundle and CBQ cards already carry theirs)", () => {
    page();
    const maths = packs.chaptersOfSubject("maths").length;
    const science = packs.chaptersOfSubject("science").length;
    expect(screen.getByTestId("packs-contents-subject").textContent).toBe(`${maths} Maths or ${science} Science chapters · Sections A–E · with keys`);
    expect(screen.getByTestId("packs-contents-mock").textContent).toBe(`${MOCKS_PER_SUBJECT} full papers for Maths or Science · step-marking keys`);
    expect(screen.getByTestId("packs-contents-chapter").textContent).toBe("Sections A–E · chapter tests · a worksheet · with keys");
    expect(screen.getByTestId("packs-card-bundle").textContent).toContain(`${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS}`);
    // above the Buy
    const line = screen.getByTestId("packs-contents-mock");
    expect(line.compareDocumentPosition(screen.getByTestId("tile-buy-pack_mock-maths")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("PACKS-CONVERT-1 · sample -> buy", () => {
  it("no buy button before a sample tap", () => {
    page();
    expect(document.querySelector('[data-testid^="sample-buy-"]')).toBeNull();
  });

  it("signed in: Maths Mock sample -> 'Liked the sample? Get the Maths Mock Pack · ₹99' -> the same checkout, pack_checkout from: sample", async () => {
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    const before = document.querySelectorAll('[data-testid="pack-sample-lazytopper-sample-mock-maths"]');
    fireEvent.click(before[0]);
    expect(track.sample).toHaveBeenCalledWith("pack_mock:maths", "packs_tile");
    const btn = await screen.findByTestId("sample-buy-pack_mock-maths");
    expect(btn.textContent).toBe(`Liked the sample? Get the Maths Mock Pack · ₹${P.pack_mock}`);
    fireEvent.click(btn);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0].slice(0, 2)).toEqual(["pack_mock", "maths"]);
    expect(track.checkout).toHaveBeenCalledWith(expect.objectContaining({ sku: "pack_mock" }), expect.objectContaining({ signedIn: true, from: "sample" }));
  });

  it("the CBQ card: Science sample -> buy Science CBQ ₹199; the Bundle sample -> buy the Bundle ₹299", async () => {
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    fireEvent.click(sampleLink("cbq-science"));
    const cbq = await screen.findByTestId("sample-buy-pack_cbq-science");
    expect(cbq.textContent).toBe(`Liked the sample? Get the Science CBQ Pack · ₹${P.pack_cbq}`);
    fireEvent.click(cbq);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0].slice(0, 2)).toEqual(["pack_cbq", "science"]);
    fireEvent.click(sampleLink("bundle"));
    expect((await screen.findByTestId("sample-buy-pack_bundle")).textContent).toBe(sampleBuyLabel("pack_bundle"));
  });

  it("Chapter sample -> the chapter picker (the tile's own Buy), and its Buy then sends from: sample", async () => {
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    fireEvent.click(sampleLink("chapter-science"));
    const btn = await screen.findByTestId("sample-buy-pack_chapter");
    expect(btn.textContent).toBe(`Liked the sample? Get the Chapter Pack · ₹${P.pack_chapter}`);
    fireEvent.click(btn);
    const dialog = await screen.findByTestId("dialog");
    expect(dialog.getAttribute("data-sku")).toBe("pack_chapter");
    expect(dialog.getAttribute("data-focus")).toBe("true");
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("signed out with pay-by-phone on: the sample's buy opens the guest pay chooser (no sign-in redirect), checkout signed_in false + from sample", async () => {
    auth.user = null;
    flags.guest = true;
    page();
    fireEvent.click(sampleLink("cbq-maths"));
    fireEvent.click(await screen.findByTestId("sample-buy-pack_cbq-maths"));
    const sheet = await screen.findByTestId("guest-sheet");
    expect(sheet.getAttribute("data-sku")).toBe("pack_cbq");
    expect(sheet.getAttribute("data-target")).toBe("maths");
    expect(screen.getByTestId("where").textContent).toBe("/packs");
    expect(track.checkout).toHaveBeenCalledWith(expect.objectContaining({ sku: "pack_cbq" }), expect.objectContaining({ signedIn: false, from: "sample" }));
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("an owned pack shows no sample buy; packs dark shows none", async () => {
    owned.packs = [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 199, paidAt: 1, orderId: "o" }];
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    await screen.findByTestId("tile-owned-pack_cbq-maths");
    fireEvent.click(sampleLink("cbq-maths"));
    expect(screen.queryByTestId("sample-buy-pack_cbq-maths")).toBeNull();
    cleanup();
    owned.packs = [];
    flags.packs = false;
    page();
    fireEvent.click(sampleLink("mock-science"));
    expect(screen.queryByTestId("sample-buy-pack_mock-science")).toBeNull();
  });

  it("CbqBand without a shop (/cbq-class-10): the sample's buy is the one-tap checkout link, pack_checkout from: sample at the tap", async () => {
    render(
      <MemoryRouter initialEntries={["/cbq-class-10"]}>
        <Where />
        <Routes>
          <Route path="*" element={<CbqBand headingId="h" sampleSurface="cbq_hub" action={() => null} />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(sampleLink("cbq-maths"));
    const link = await screen.findByTestId("sample-buy-pack_cbq-maths");
    expect(link.getAttribute("href")).toBe("/packs?buy=pack_cbq&t=maths");
    fireEvent.click(link);
    expect(track.checkout).toHaveBeenCalledWith({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: P.pack_cbq }, { from: "sample" });
    expect(screen.getByTestId("where").textContent).toBe("/packs?buy=pack_cbq&t=maths");
  });
});
