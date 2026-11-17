/**
 * SAMPLE-DIALOG-BUY-1 - after a tap on the pack window's free sample, the "Liked the sample? Get the <Pack> · price" button
 * (SampleBuyNext, as on PackSampleLink's hosts) shows next to the WhatsApp opt-in, and runs the SAME action as the window's Buy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", async (orig) => ({ ...(await orig<typeof import("../../lib/packs/packAnalytics")>()), trackPackSampleDownload: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })),
    buyPack: vi.fn(),
    checkPackOrder: vi.fn(),
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));

import PackSampleButton from "./PackSampleButton";
import PackDialog from "../../pages/PackDialog";
import PacksShop from "./PacksShop";
import { sampleBuyLabel } from "./PackSampleLink";
import * as packs from "../../services/packs";

const SAMPLE_MOCK_SCIENCE = "pack-sample-lazytopper-sample-mock-science";
const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  auth.user = null;
  buyMock.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PackSampleButton - SAMPLE-DIALOG-BUY-1", () => {
  it("before a tap: only the sample + WhatsApp opt-in; after a tap: SampleBuyNext too, WhatsApp kept, and onBuy runs", () => {
    const onBuy = vi.fn();
    render(
      <MemoryRouter>
        <PackSampleButton sku="pack_mock" target="science" surface="packs_dialog" buy={{ onBuy }} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("sample-buy-pack_mock-science")).toBeNull();
    fireEvent.click(screen.getByTestId(SAMPLE_MOCK_SCIENCE));
    const next = screen.getByTestId("sample-buy-pack_mock-science");
    expect(next.textContent).toBe(sampleBuyLabel("pack_mock", "science"));
    expect(next.textContent).toMatch(/^Liked the sample\? Get the Science Mock Pack · /);
    expect(screen.getByTestId("wa-sample-open")).toBeTruthy();
    fireEvent.click(next);
    expect(onBuy).toHaveBeenCalledTimes(1);
  });

  it("an href buy renders the same one-tap link as PackSampleLink's hosts", () => {
    render(
      <MemoryRouter>
        <PackSampleButton sku="pack_bundle" target="maths" surface="packs_dialog" buy={{ href: "/packs?buy=pack_bundle&from=sample" }} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-bundle"));
    expect(screen.getByTestId("sample-buy-pack_bundle").getAttribute("href")).toBe("/packs?buy=pack_bundle&from=sample");
  });

  it("without a buy prop nothing is added (today's render), tap or not", () => {
    render(
      <MemoryRouter>
        <PackSampleButton sku="pack_mock" target="science" surface="packs_dialog" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId(SAMPLE_MOCK_SCIENCE));
    expect(screen.queryByTestId("sample-buy-pack_mock-science")).toBeNull();
  });

  it("kill switch VITE_SAMPLE_DIALOG_BUY_DISABLED=1 -> never shown", () => {
    vi.stubEnv("VITE_SAMPLE_DIALOG_BUY_DISABLED", "1");
    render(
      <MemoryRouter>
        <PackSampleButton sku="pack_mock" target="science" surface="packs_dialog" buy={{ onBuy: vi.fn() }} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId(SAMPLE_MOCK_SCIENCE));
    expect(screen.queryByTestId("sample-buy-pack_mock-science")).toBeNull();
    expect(screen.getByTestId("wa-sample-open")).toBeTruthy();
  });

  it("switching the subject hides the follow-up until THAT sample is tapped", () => {
    const view = (subject: "maths" | "science") => (
      <MemoryRouter>
        <PackSampleButton sku="pack_mock" target={subject} surface="packs_dialog" buy={{ onBuy: vi.fn() }} />
      </MemoryRouter>
    );
    const r = render(view("science"));
    fireEvent.click(screen.getByTestId(SAMPLE_MOCK_SCIENCE));
    expect(screen.getByTestId("sample-buy-pack_mock-science")).toBeTruthy();
    r.rerender(view("maths"));
    expect(screen.queryByTestId("sample-buy-pack_mock-maths")).toBeNull();
    expect(screen.queryByTestId("sample-buy-pack_mock-science")).toBeNull();
  });
});

describe("PackDialog - SAMPLE-DIALOG-BUY-1", () => {
  it("passes sampleBuy through to the sample button; no sampleBuy -> no follow-up", () => {
    const open = (sampleBuy?: { onBuy: () => void } | null) =>
      render(
        <MemoryRouter>
          <PackDialog sku="pack_mock" chapter="" subject="science" onChapter={() => {}} onSubject={() => {}} questions={null} buy={<button type="button">Buy</button>} onClose={() => {}} sampleBuy={sampleBuy} />
        </MemoryRouter>,
      );
    open({ onBuy: vi.fn() });
    fireEvent.click(screen.getByTestId(SAMPLE_MOCK_SCIENCE));
    expect(screen.getByTestId("sample-buy-pack_mock-science")).toBeTruthy();
    cleanup();
    open(null);
    fireEvent.click(screen.getByTestId(SAMPLE_MOCK_SCIENCE));
    expect(screen.queryByTestId("sample-buy-pack_mock-science")).toBeNull();
  });
});

describe("PacksShop - the real pop-up wires the Buy action", () => {
  it("sample tap -> 'Liked the sample?' -> the same buyPack as the pop-up's Buy (signed in)", async () => {
    auth.user = { uid: "u1" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    render(
      <MemoryRouter initialEntries={["/packs"]}>
        <PacksShop>
          {(api) => (
            <button type="button" onClick={() => api.openPack("pack_mock")}>
              open mock
            </button>
          )}
        </PacksShop>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("open mock"));
    await screen.findByTestId("packs-buy-pack_mock");
    const sample = await screen.findByTestId("pack-sample-lazytopper-sample-mock-maths");
    expect(screen.queryByTestId("sample-buy-pack_mock-maths")).toBeNull();
    fireEvent.click(sample);
    fireEvent.click(await screen.findByTestId("sample-buy-pack_mock-maths"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
  });
});
