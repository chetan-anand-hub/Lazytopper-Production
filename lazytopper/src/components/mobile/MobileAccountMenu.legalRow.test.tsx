import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

/**
 * MobileAccountMenu — the quiet legal row (Lane C), mobile parity with the
 * DesktopShell dropdown. [FU-LEGAL-FOOTER-LINK].
 */
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string; email?: string; phoneNumber?: string },
  logout: vi.fn(async () => {}),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
  }),
}));

import { MobileAccountMenu } from "./MobileAccountMenu";

afterEach(() => {
  cleanup();
  authState.user = null;
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="pathname">{loc.pathname}</div>;
}

function signInAndOpenMenu() {
  authState.user = { uid: "test-uid", displayName: "Asha Rao", email: "asha@example.com" };
  render(
    <MemoryRouter initialEntries={["/me"]}>
      <MobileAccountMenu />
      <LocationProbe />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
}

const LEGAL = [
  ["Privacy", "/legal/privacy"],
  ["Terms", "/legal/terms"],
  ["Refunds", "/legal/refund"],
] as const;

describe("MobileAccountMenu — legal row (Lane C)", () => {
  it("renders all three legal links inside the dropdown", () => {
    signInAndOpenMenu();
    const menu = screen.getByRole("menu", { name: "Account menu" });
    for (const [label] of LEGAL) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: label }).closest("[role='menu']")).toBe(menu);
    }
  });

  it.each(LEGAL)("routes %s to %s and closes the dropdown", (label, slug) => {
    signInAndOpenMenu();
    expect(screen.getByRole("menu", { name: "Account menu" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(screen.getByTestId("pathname").textContent).toBe(slug);
    expect(screen.queryByRole("menu", { name: "Account menu" })).toBeNull();
  });
});
