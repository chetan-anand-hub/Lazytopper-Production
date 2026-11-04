/**
 * TRIAL-ON-SIGNUP-1 · T4 — the Basic list is ONE source, Pricing's wording is unchanged,
 * and (LOCK-SELL-1) the RequirePremium lock no longer shows the "Free on Basic:" list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const H = vi.hoisted(() => ({
  user: null as null | { uid: string },
  sub: {
    isPremium: false,
    isTrialExpired: false,
    hydrated: true,
    startTrial: vi.fn(),
    status: { tier: "free", plan: "none", trialStartDate: null as string | null, trialEndDate: null, premiumSince: null },
  },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: H.user, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
// CBQ-TUTOR-GATE-1: the tutor gate reads the pack allowance first; this student owns no CBQ Pack.
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) };
});

import { BASIC_FREE_LABELS, FREE_FEATURES } from "./BasicFreeList";
import { RequirePremium } from "../auth/RequireAuth";
import PricingPage from "../../pages/PricingPage";
import { BASIC_INCLUDES } from "../../config/pricingCompare";

beforeEach(() => {
  H.user = null;
  H.sub.isPremium = false;
  H.sub.isTrialExpired = false;
  H.sub.status = { ...H.sub.status, trialStartDate: null };
});
afterEach(() => cleanup());

describe("one source", () => {
  // PRICING-LIGHT-1 (owner ruling L4, Oct 2026): the pricing page's Basic card now reads
  // config/pricingCompare.ts. FREE_FEATURES stays the ONE source for every Premium lock's
  // "Free on Basic:" list (pinned below) — the page simply no longer renders it.
  it("PricingPage neither declares nor renders FREE_FEATURES any more (L4); the locks still read it", () => {
    const src = readFileSync(resolve(process.cwd(), "src/pages/PricingPage.tsx"), "utf8");
    expect(src).not.toMatch(/const\s+FREE_FEATURES\s*=/);
    expect(src).not.toMatch(/\bFREE_FEATURES\.map\b/);
    expect(src).toMatch(/from "\.\.\/config\/pricingCompare";/);
  });

  it("the lock list is exactly Pricing's INCLUDED rows, in order", () => {
    expect(BASIC_FREE_LABELS).toEqual(FREE_FEATURES.filter((f) => f.included).map((f) => f.label));
    expect(BASIC_FREE_LABELS).toHaveLength(5);
  });
});

describe("Pricing's Basic line (PRICING-B-1: the separate Basic card is gone; Basic is one line + the folded table)", () => {
  it("renders the Basic line and none of the lock-only rows; BASIC_INCLUDES still feeds the compare module", () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PricingPage />
      </MemoryRouter>,
    );
    const line = screen.getByTestId("pricing-basic-line");
    expect(line.textContent).toContain("Basic: free forever");
    expect(screen.queryByRole("list", { name: "Basic plan features" })).toBeNull();
    for (const f of FREE_FEATURES.filter((x) => !x.included)) expect(line.textContent).not.toContain(f.label);
    expect(BASIC_INCLUDES.length).toBeGreaterThanOrEqual(5);
  });
});

// LOCK-SELL-1 (owner, 4 Nov 2026): the full-page lock sells the Board Pass; it no longer lists what is free on Basic.
describe("RequirePremium — no 'Free on Basic:' list, on every gated feature (LOCK-SELL-1)", () => {
  for (const featureLabel of ["Answer Checker", "Ask the tutor", "Exam Simulation", undefined]) {
    it(`${featureLabel ?? "(no label)"}: the Board Pass headline, no Basic list, one quiet 'Continue with Basic'`, async () => {
      H.user = { uid: "u1" };
      const { container } = render(
        <MemoryRouter>
          <RequirePremium featureLabel={featureLabel}>
            <div>premium content</div>
          </RequirePremium>
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.getByTestId("lock-title").textContent).toMatch(/comes with the Board Pass$/));
      expect(container.textContent).not.toContain("premium content");
      expect(screen.queryByTestId("basic-free-list")).toBeNull();
      expect(container.textContent).not.toContain("Free on Basic");
      for (const label of BASIC_FREE_LABELS) expect(container.textContent).not.toContain(label);
      expect(screen.getByTestId("lock-continue-basic").textContent).toBe("Continue with Basic");
    });
  }

  it("a premium / trial student never sees the lock or the list", () => {
    H.user = { uid: "u1" };
    H.sub.isPremium = true;
    render(
      <MemoryRouter>
        <RequirePremium featureLabel="Answer Checker">
          <div>premium content</div>
        </RequirePremium>
      </MemoryRouter>,
    );
    expect(screen.getByText("premium content")).toBeInTheDocument();
    expect(screen.queryByTestId("basic-free-list")).toBeNull();
  });
});
