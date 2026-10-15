import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// START-HERE-1 §2.5 — the lock screen is the conversion moment. A student who tapped
// "Ask the tutor why I lost this mark" on a scorecard (source=scorecard) after the free week
// ended is told so, in the owner's words, and keeps the existing upgrade button. Copy only:
// the gate itself is unchanged. Same harness as RequireAuth.trialCta.test.tsx.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../UpgradeModal", () => ({
  UpgradeModal: ({ open }: { open: boolean }) => (open ? <div>PLANS_MODAL</div> : null),
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, activateTrial: vi.fn(), hydrateSubscriptionFromCloud: vi.fn() };
});

import { RequirePremium, SCORECARD_LOCK_COPY } from "./RequireAuth";
import * as svc from "../../services/subscriptionService";
import type { SubscriptionStatus } from "../../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const DAY = 24 * 60 * 60 * 1000;
const FREE: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
const EXPIRED: SubscriptionStatus = {
  tier: "free", plan: "none",
  trialStartDate: new Date(Date.now() - 10 * DAY).toISOString(),
  trialEndDate: new Date(Date.now() - 3 * DAY).toISOString(),
  premiumSince: null,
};

function gate(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <RequirePremium featureLabel="Ask the tutor">
        <div>UNLOCKED_CHILD</div>
      </RequirePremium>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  hydrate.mockReset();
});
afterEach(cleanup);

describe("RequirePremium — the scorecard lock line (START-HERE-1)", () => {
  it("★★ expired trial + source=scorecard: the owner's line, and the existing upgrade button is kept", async () => {
    hydrate.mockResolvedValue(EXPIRED);
    gate("/tutor/10/Maths/real-numbers?source=scorecard&from=QP-1&q=q-b");
    await screen.findByText(SCORECARD_LOCK_COPY);
    expect(SCORECARD_LOCK_COPY).toBe("Your free week has ended — upgrade to ask the tutor why you lost this mark.");
    expect(screen.queryByText(/is part of Premium\./)).toBeNull();
    fireEvent.click(screen.getByText("Unlock Full Access"));
    expect(screen.getByText("PLANS_MODAL")).toBeInTheDocument();
  });

  it("★ CONTROL: an expired trial arriving any other way keeps the ordinary line, byte for byte", async () => {
    hydrate.mockResolvedValue(EXPIRED);
    gate("/tutor/10/Maths/real-numbers?source=practice");
    await waitFor(() => expect(screen.queryByText("Start my free 7-day trial")).toBeNull());
    expect(screen.getByText(/Ask the tutor is part of Premium\./)).toBeInTheDocument();
    expect(screen.queryByText(SCORECARD_LOCK_COPY)).toBeNull();
  });

  it("★ a never-trialled student is never told their free week ended, even from a scorecard (they still get the trial offer)", async () => {
    hydrate.mockResolvedValue(FREE);
    gate("/tutor/10/Maths/real-numbers?source=scorecard");
    await screen.findByText("Start my free 7-day trial");
    expect(screen.queryByText(SCORECARD_LOCK_COPY)).toBeNull();
    expect(screen.getByText(/Ask the tutor is part of Premium\./)).toBeInTheDocument();
  });
});
