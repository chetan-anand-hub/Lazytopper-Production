// FIRST-OFFER-1 - the shared Board Pass price line on the locks and walls that lacked it.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ hydrated: true, tier: "free", isPremium: false, isTrialExpired: false, isTrialActive: false, daysLeftInTrial: 0, status: { tier: "free", trialStartDate: null }, startTrial: vi.fn() }),
}));
vi.mock("./PaywallActions", () => ({ default: ({ fallback }: { fallback?: unknown }) => fallback ?? null }));

import BoardPassLine from "./BoardPassLine";
import { boardPassCtaLabel, boardPassPriceNow } from "./boardPassOffer";
import { RequirePremium } from "../auth/RequireAuth";
import { UpgradeModal } from "../UpgradeModal";
import LockedDetail from "../results/LockedDetail";

afterEach(cleanup);

describe("BoardPassLine and the label helpers", () => {
  it("names the Board Pass with the real price", () => {
    render(<BoardPassLine />);
    const price = boardPassPriceNow();
    expect(price).toMatch(/^₹/);
    expect(screen.getByTestId("board-pass-line")).toHaveTextContent(`Board Pass ${price}`);
    expect(boardPassCtaLabel()).toBe(`Board Pass ${price} →`);
    expect(boardPassCtaLabel(null)).toBe("Board Pass →");
  });
  // LOCK-SELL-1: the lock's Board Pass card carries the price now (the one-line BoardPassLine left the lock).
  it("the Premium lock shows the Board Pass price, says 'Try the Board Pass free', and not 'everything'", async () => {
    render(<MemoryRouter><RequirePremium featureLabel="Tutor"><div>in</div></RequirePremium></MemoryRouter>);
    expect(await screen.findByTestId("lock-amount")).toHaveTextContent(boardPassPriceNow()!);
    expect(screen.getByText(/Try the Board Pass free for 7 days/)).toBeInTheDocument();
    expect(screen.queryByText(/Try everything free/)).toBeNull();
  });
  it("the upgrade modal shows it", () => {
    render(<MemoryRouter><UpgradeModal open onClose={() => {}} featureLabel="X" /></MemoryRouter>);
    expect(screen.getByTestId("board-pass-line")).toHaveTextContent("Board Pass ₹");
  });
  it("the locked-detail button names the Board Pass price", () => {
    render(<MemoryRouter><LockedDetail scoreLine="7 of 10" /></MemoryRouter>);
    expect(screen.getByRole("button", { name: `Unlock with Board Pass ${boardPassPriceNow()}` })).toBeInTheDocument();
  });
});
