/**
 * NAV-1 (owner, 4 Nov 2026) - the paid-access chip names the pass held, never "Premium".
 */
import { describe, expect, it } from "vitest";

import { deriveAccountStatus, formatPassEndShort, paidAccessLabel } from "./accountStatus";

const paid = { tier: "premium" as const, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0 };

describe("NAV-1 account status chip", () => {
  it("Board Pass", () => {
    expect(deriveAccountStatus({ ...paid, plan: "pass_till_boards", passEnd: "2027-03-31T18:29:59.000Z" }).label).toBe("Board Pass");
  });

  it("Month pass shows its end date in India time", () => {
    expect(deriveAccountStatus({ ...paid, plan: "pass_month", passEnd: "2026-11-30T12:00:00.000Z" }).label).toBe(
      "Month pass · till 30 Nov",
    );
    // 20:00 UTC on 30 Nov is 1 Dec in India.
    expect(formatPassEndShort("2026-11-30T20:00:00.000Z")).toBe("1 Dec");
    expect(paidAccessLabel("pass_month", null)).toBe("Month pass");
    expect(paidAccessLabel("pass_month", "not-a-date")).toBe("Month pass");
  });

  it("an admin extension and a legacy grant read truthfully, never 'Premium'", () => {
    expect(paidAccessLabel("pass_extension", "2026-12-15T00:00:00.000Z")).toBe("Access extended · till 15 Dec");
    expect(deriveAccountStatus({ ...paid, plan: "premium_monthly" }).label).toBe("Full access");
    expect(deriveAccountStatus(paid).label).toBe("Full access");
    for (const plan of ["pass_till_boards", "pass_month", "pass_extension", "premium_monthly", "premium_yearly", "none"] as const) {
      expect(paidAccessLabel(plan, "2026-12-15T00:00:00.000Z")).not.toMatch(/premium/i);
    }
  });

  it("trial labels unchanged", () => {
    expect(
      deriveAccountStatus({ tier: "trial", isTrialActive: true, isTrialExpired: false, daysLeftInTrial: 5, plan: "trial_7day" }).label,
    ).toBe("Trial active - 5 days left");
    expect(deriveAccountStatus({ tier: "trial", isTrialActive: true, isTrialExpired: false, daysLeftInTrial: 1 }).label).toBe(
      "Trial ends today",
    );
    expect(deriveAccountStatus({ tier: "free", isTrialActive: false, isTrialExpired: true, daysLeftInTrial: 0 }).label).toBe(
      "Trial ended - Choose plan",
    );
  });
});
