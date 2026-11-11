/**
 * PRICING-PAGES-2 N1 - in-app navigation between the two sales pages keeps the ARRIVING page's surface. The leaving page's cleanup
 * runs after the arriving page set its own (first render), so it may clear only its own value. The pack shop is replaced by a stand-in
 * that records the surface at its mount effect - the moment the real PacksShop sends pack_view (child effects run before the page's).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

const seen = vi.hoisted(() => ({ packView: [] as Array<string | null> }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ status: { tier: "free", plan: "none", trialStartDate: null, passEnd: null }, hydrated: true, isTrialActive: false, daysLeftInTrial: 0, startTrial: vi.fn() }),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../components/pricing/PassCheckout", () => ({
  default: () => <button type="button" className="lt-pricing-cta lt-pricing-pay lt-pricing-pay--boards">Pay ₹N once till your boards</button>,
  tillBoardsButtonLabel: () => "Pay ₹N once till your boards",
}));
vi.mock("../components/pricing/PaywallActions", () => ({ default: () => null }));
vi.mock("../components/marketing/PricingProof", () => ({ default: () => null }));
vi.mock("../components/packs/PackSampleLink", () => ({ default: () => null, SampleBuyNext: () => null }));
vi.mock("../components/packs/PackTileBuy", () => ({ PackCbqBuy: () => <button type="button">Buy</button>, sampleBuyFor: () => () => null }));
vi.mock("../components/packs/PacksShop", async () => {
  const analytics = await import("../analytics/analytics");
  function Shop({ children }: { children: (api: unknown) => ReactNode }) {
    useEffect(() => {
      seen.packView.push(analytics.currentSalesPageSurface());
    }, []);
    return <>{children({ buyEnabled: true, ownsPack: () => false, blockedBy: () => false, openSku: null, subject: "maths" })}</>;
  }
  return { default: Shop, preloadBuyChunks: () => undefined };
});

import BoardPassPage from "./BoardPassPage";
import CbqPacksPage from "./CbqPacksPage";
import { currentSalesPageSurface } from "../analytics/analytics";

function Go() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/cbq-packs")}>to-cbq</button>
      <button type="button" onClick={() => navigate("/board-pass")}>to-bp</button>
      <button type="button" onClick={() => navigate("/pricing")}>to-pricing</button>
    </>
  );
}
function mount(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Go />
      <Routes>
        <Route path="/board-pass" element={<BoardPassPage />} />
        <Route path="/cbq-packs" element={<CbqPacksPage />} />
        <Route path="/pricing" element={<p>pricing</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
afterEach(() => {
  cleanup();
  seen.packView.length = 0;
});

describe("N1 - the surface survives a hop between the sales pages", () => {
  it("/board-pass -> /cbq-packs: the shop's pack_view sees cbq-packs, and the surface stays cbq-packs", async () => {
    mount("/board-pass");
    expect(currentSalesPageSurface()).toBe("board-pass");
    await act(async () => {
      fireEvent.click(screen.getByText("to-cbq"));
    });
    expect(seen.packView).toEqual(["cbq-packs"]);
    expect(currentSalesPageSurface()).toBe("cbq-packs");
  });

  it("/cbq-packs -> /board-pass: the surface is board-pass; leaving to /pricing clears it", async () => {
    mount("/cbq-packs");
    expect(seen.packView).toEqual(["cbq-packs"]);
    await act(async () => {
      fireEvent.click(screen.getByText("to-bp"));
    });
    expect(currentSalesPageSurface()).toBe("board-pass");
    await act(async () => {
      fireEvent.click(screen.getByText("to-pricing"));
    });
    expect(currentSalesPageSurface()).toBeNull();
  });
});
