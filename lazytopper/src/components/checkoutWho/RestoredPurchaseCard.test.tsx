/** FU-RELOAD-CARD-PACKS-ONLY: the purchase card comes back after a reload on /cbq-packs, /pricing and /board-pass too (not only /packs). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), isPacksClientEnabled: () => true }));
vi.mock("./PurchaseCard", () => ({
  default: (p: { proof: { orderId: string }; onHide?: () => void }) => (
    <div data-testid="purchase-card-stub" data-order={p.proof.orderId}>
      <button type="button" data-testid="stub-hide" onClick={() => p.onHide?.()}>hide</button>
    </div>
  ),
}));

import RestoredPurchaseCard from "./RestoredPurchaseCard";
import { readReceiptProof, storeReceiptProof } from "../../services/paidReceiptProof";

const PROOF = { orderId: "order_R1", paymentId: "pay_R1", signature: "sig" };
beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  window.sessionStorage.clear();
});
afterEach(cleanup);

describe("RestoredPurchaseCard", () => {
  it("signed out with this tab's proof: the card is shown for that order", async () => {
    storeReceiptProof(PROOF);
    render(<RestoredPurchaseCard />);
    expect((await screen.findByTestId("purchase-card-stub")).getAttribute("data-order")).toBe("order_R1");
  });
  it("no proof, a signed-in visitor, or auth still loading: nothing", () => {
    render(<RestoredPurchaseCard />);
    expect(screen.queryByTestId("restored-purchase-card")).toBeNull();
    cleanup();
    storeReceiptProof(PROOF);
    auth.user = { uid: "u1" };
    render(<RestoredPurchaseCard />);
    expect(screen.queryByTestId("restored-purchase-card")).toBeNull();
    cleanup();
    auth.user = null;
    auth.loading = true;
    render(<RestoredPurchaseCard />);
    expect(screen.queryByTestId("restored-purchase-card")).toBeNull();
  });
  it("Hide clears the stored proof, so a second reload shows nothing", async () => {
    storeReceiptProof(PROOF);
    render(<RestoredPurchaseCard />);
    fireEvent.click(await screen.findByTestId("stub-hide"));
    expect(screen.queryByTestId("restored-purchase-card")).toBeNull();
    expect(readReceiptProof()).toBeNull();
  });
  it("is mounted on /cbq-packs, /board-pass, the /pricing hub and the legacy pricing page (source wiring)", () => {
    const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
    for (const f of ["src/pages/CbqPacksPage.tsx", "src/pages/BoardPassPage.tsx", "src/pages/pricingHub/PricingHub.tsx", "src/pages/PricingPage.tsx"]) {
      expect(read(f), f).toMatch(/<RestoredPurchaseCard \/>/);
    }
  });
});
