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
  // COPY-2 · K6 (owner, 2026-09-27): matches the page tab and title.
  ["Cancellation & Refunds", "/legal/refund"],
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

describe("MobileAccountMenu account dropdown — SETTINGS-1 · one Settings entry" , () => {
  it("lists exactly Me / Progress, Settings, Log out, in that order", () => {
    signInAndOpenMenu();
    const menu = screen.getByRole("menu", { name: "Account menu" });
    const names = Array.from(menu.querySelectorAll("[role='menuitem']")).map((n) => n.textContent);
    expect(names).toEqual(["Me / Progress", "Settings", "Log out"]);
    expect(menu.textContent).not.toMatch(/subscription/i);
  });

  it("Settings closes the menu and opens the Settings window", () => {
    signInAndOpenMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(screen.queryByRole("menu", { name: "Account menu" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
  });

  it("Settings -> Sign-in methods swaps to the existing linking modal (one modal at a time)", () => {
    signInAndOpenMenu();
    // the real modal reads providerIds off the auth user
    (authState.user as unknown as { providerIds: string[] }).providerIds = ["google.com"];
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Sign-in methods" })[0]);
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Sign-in methods" })).toBeTruthy();
  });
});
