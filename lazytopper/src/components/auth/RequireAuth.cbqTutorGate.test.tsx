import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// CBQ-TUTOR-GATE-1 - a non-Premium CBQ Pack owner with bonus questions left reaches the tutor; everyone else is
// unchanged. Ownership/remaining come from the (mocked) server read fetchMyPacks().tutorTaste.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, activateTrial: vi.fn(), hydrateSubscriptionFromCloud: vi.fn() };
});
const fetchMyPacks = vi.fn();
vi.mock("../../services/packs", () => ({ fetchMyPacks: (...a: unknown[]) => fetchMyPacks(...a) }));

import { RequirePremium } from "./RequireAuth";
import { CBQ_GATE_WAIT_MS } from "../../hooks/useCbqTutorAllowance";
import * as svc from "../../services/subscriptionService";
import type { SubscriptionStatus } from "../../services/subscriptionService";
import { resetCbqTutorBonusForTests } from "../../ai/cbqTutorBonus";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const FREE: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
const PREMIUM: SubscriptionStatus = { tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: "2026-01-01T00:00:00.000Z" };

function gate(label = "Ask the tutor") {
  return render(
    <MemoryRouter initialEntries={["/tutor/10/Maths"]}>
      <RequirePremium featureLabel={label}>
        <div>TUTOR_CHILD</div>
      </RequirePremium>
    </MemoryRouter>,
  );
}
const packs = (tutorTaste?: { used: number; left: number; limit: number }) => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, ...(tutorTaste ? { tutorTaste } : {}) });

beforeEach(() => {
  localStorage.clear();
  hydrate.mockReset();
  fetchMyPacks.mockReset();
  resetCbqTutorBonusForTests();
});
afterEach(cleanup);

describe("RequirePremium tutor gate - CBQ Pack bonus (CBQ-TUTOR-GATE-1)", () => {
  it("pack owner with questions left reaches the tutor", async () => {
    hydrate.mockResolvedValue(FREE);
    fetchMyPacks.mockResolvedValue(packs({ used: 1, left: 2, limit: 3 }));
    gate();
    await screen.findByText("TUTOR_CHILD");
    expect(screen.queryByText(/comes with the Board Pass/)).toBeNull();
  });

  it("pack owner with 0 left sees the lock", async () => {
    hydrate.mockResolvedValue(FREE);
    fetchMyPacks.mockResolvedValue(packs({ used: 3, left: 0, limit: 3 }));
    gate();
    await screen.findByText(/comes with the Board Pass/);
    expect(screen.queryByText("TUTOR_CHILD")).toBeNull();
  });

  it("no CBQ pack (no tutorTaste) sees the lock", async () => {
    hydrate.mockResolvedValue(FREE);
    fetchMyPacks.mockResolvedValue(packs());
    gate();
    await screen.findByText(/comes with the Board Pass/);
    expect(screen.queryByText("TUTOR_CHILD")).toBeNull();
  });

  it("a failed server read sees the lock (never allowed)", async () => {
    hydrate.mockResolvedValue(FREE);
    fetchMyPacks.mockRejectedValue(new Error("boom"));
    gate();
    await screen.findByText(/comes with the Board Pass/);
  });

  it("premium reaches the tutor and makes no pack request", async () => {
    hydrate.mockResolvedValue(PREMIUM);
    gate();
    await screen.findByText("TUTOR_CHILD");
    expect(fetchMyPacks).not.toHaveBeenCalled();
  });

  it("while the server read is pending: checking state, no lock flash", async () => {
    hydrate.mockResolvedValue(FREE);
    fetchMyPacks.mockReturnValue(new Promise(() => {}));
    gate();
    await screen.findByText("Checking your session...");
    await waitFor(() => expect(fetchMyPacks).toHaveBeenCalled());
    expect(screen.queryByText(/comes with the Board Pass/)).toBeNull();
    expect(screen.queryByText("TUTOR_CHILD")).toBeNull();
  });

  it("a stalled server read falls back to the lock after the bound (no forever spinner)", async () => {
    vi.useFakeTimers();
    try {
      hydrate.mockResolvedValue(FREE);
      fetchMyPacks.mockReturnValue(new Promise(() => {}));
      gate();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByText("Checking your session...")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CBQ_GATE_WAIT_MS + 100);
      });
      expect(screen.getByText(/comes with the Board Pass/)).toBeInTheDocument();
      expect(screen.queryByText("TUTOR_CHILD")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("another gate label never consults the pack allowance", async () => {
    hydrate.mockResolvedValue(FREE);
    fetchMyPacks.mockResolvedValue(packs({ used: 0, left: 3, limit: 3 }));
    gate("Weak Area Practice");
    await screen.findByText(/comes with the Board Pass/);
    expect(fetchMyPacks).not.toHaveBeenCalled();
    expect(screen.queryByText("TUTOR_CHILD")).toBeNull();
  });
});
