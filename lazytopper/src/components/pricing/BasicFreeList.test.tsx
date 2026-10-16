/**
 * TRIAL-ON-SIGNUP-1 · T4 — the Basic list is ONE source, Pricing's wording is unchanged,
 * and the RequirePremium lock (every route that uses it) shows "Free on Basic:" under its
 * current message.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

describe("Pricing's Basic card reads the L4 list (signed out — the prerendered /pricing shape)", () => {
  it("renders BASIC_INCLUDES (free check off in this build), and none of the lock-only rows", () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PricingPage />
      </MemoryRouter>,
    );
    const list = screen.getByRole("list", { name: "Basic plan features" });
    const rows = Array.from(list.querySelectorAll("li")).map((li) => li.textContent);
    expect(rows).toEqual(BASIC_INCLUDES.filter((i) => !i.onlyWithFreeCheck).map((i) => `✓${i.label}`));
    // The lock list's EXCLUDED rows were a Pricing-only device; the card no longer lists them.
    for (const f of FREE_FEATURES.filter((x) => !x.included)) expect(list.textContent).not.toContain(f.label);
  });
});

describe("RequirePremium — 'Free on Basic:' under the current message, on every gated feature", () => {
  for (const featureLabel of ["Check & Improve", "Ask the tutor", "Exam Simulation", undefined]) {
    it(`${featureLabel ?? "(no label)"}: the message stays, the Basic list follows it`, () => {
      H.user = { uid: "u1" };
      const { container } = render(
        <MemoryRouter>
          <RequirePremium featureLabel={featureLabel}>
            <div>premium content</div>
          </RequirePremium>
        </MemoryRouter>,
      );
      expect(container.textContent).not.toContain("premium content");
      expect(container.textContent).toContain(`${featureLabel || "This feature"} is part of Premium.`);
      const list = screen.getByTestId("basic-free-list");
      expect(list.textContent).toContain("Free on Basic:");
      for (const label of BASIC_FREE_LABELS) expect(list.textContent).toContain(label);
      // only what is free — never a Premium row
      for (const f of FREE_FEATURES.filter((x) => !x.included)) expect(list.textContent).not.toContain(f.label);
      // order: the message paragraph comes BEFORE the list
      const msg = Array.from(container.querySelectorAll("p")).find((p) => p.textContent?.includes("is part of Premium"));
      expect(msg!.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  }

  it("a premium / trial student never sees the lock or the list", () => {
    H.user = { uid: "u1" };
    H.sub.isPremium = true;
    render(
      <MemoryRouter>
        <RequirePremium featureLabel="Check & Improve">
          <div>premium content</div>
        </RequirePremium>
      </MemoryRouter>,
    );
    expect(screen.getByText("premium content")).toBeInTheDocument();
    expect(screen.queryByTestId("basic-free-list")).toBeNull();
  });
});
