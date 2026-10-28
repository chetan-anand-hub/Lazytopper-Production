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
  it("the Premium lock shows it, says 'Try Premium free', and not 'everything'", () => {
    render(<MemoryRouter><RequirePremium featureLabel="Tutor"><div>in</div></RequirePremium></MemoryRouter>);
    expect(screen.getByTestId("board-pass-line")).toBeInTheDocument();
    expect(screen.getByText(/Try Premium free for 7 days/)).toBeInTheDocument();
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
