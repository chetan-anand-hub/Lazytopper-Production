import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * NAV-PRICING-1 — the desktop panel gains "Pricing" (after Answer Checker, before Me / Progress) for everyone but a
 * Board Pass holder; Me / Progress is always there.
 */
const authState = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
const subState = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const track = vi.hoisted(() => vi.fn());
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, loading: authState.loading, logout: vi.fn(async () => {}) }),
}));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => subState.value }));
vi.mock("./MistakeIntelCard", () => ({ MistakeIntelCard: () => <div /> }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNavPricingTap: track };
});

import { DesktopShell } from "./DesktopShell";

const FREE = { tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0, status: { tier: "free", plan: "none" } };
const PASS = { tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0, status: { tier: "premium", plan: "pass_till_boards", passEnd: null } };
const TRIAL = { tier: "trial", isPremium: false, isTrialActive: true, isTrialExpired: false, daysLeftInTrial: 5, status: { tier: "trial", plan: "trial_7day" } };

afterEach(() => {
  cleanup();
  authState.user = null;
  authState.loading = false;
  track.mockClear();
});

function renderShell(path = "/browse") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DesktopShell>
        <div>page</div>
      </DesktopShell>
    </MemoryRouter>,
  );
}
const link = (name: string) => screen.queryByRole("link", { name }) as HTMLAnchorElement | null;

describe("DesktopShell — Pricing in the left panel", () => {
  it("★ signed out on /browse: Pricing is in the panel, links to /pricing?source=sidebar, between Answer Checker and Me / Progress", () => {
    subState.value = FREE;
    const { container } = renderShell("/browse");
    expect(link("Pricing")!.getAttribute("href")).toBe("/pricing?source=sidebar");
    const labels = Array.from(container.querySelectorAll("nav a, nav button")).map((el) => el.textContent);
    expect(labels.indexOf("Pricing")).toBe(labels.indexOf("Answer Checker") + 1);
    expect(labels.indexOf("Me / Progress")).toBe(labels.indexOf("Pricing") + 1);
    fireEvent.click(link("Pricing")!);
    expect(track).toHaveBeenCalledWith("sidebar");
  });

  it("trial student: Pricing and Me / Progress both present", () => {
    authState.user = { uid: "u1" };
    subState.value = TRIAL;
    renderShell("/");
    expect(link("Pricing")).not.toBeNull();
    expect(link("Me / Progress")).not.toBeNull();
  });

  it("Board Pass holder: no Pricing, Me / Progress stays", () => {
    authState.user = { uid: "u1" };
    subState.value = PASS;
    renderShell("/");
    expect(link("Pricing")).toBeNull();
    expect(link("Me / Progress")).not.toBeNull();
  });
});
