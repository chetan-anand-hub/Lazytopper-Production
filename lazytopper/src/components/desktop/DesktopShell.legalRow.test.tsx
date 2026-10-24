import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

/**
 * DesktopShell account dropdown — the quiet legal row (Lane C).
 *
 * [FU-LEGAL-FOOTER-LINK]: the /legal/:slug policies had no inbound link a
 * signed-in user could reach. This pins the fix — Privacy · Terms · Refunds
 * below "Log out", each routing to its slug and closing the dropdown.
 *
 * Same hermetic mock surface as DesktopShell.test.tsx (auth/subscription/
 * MistakeIntelCard all mocked so this renders as a unit test).
 */
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string; email?: string },
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
vi.mock("./MistakeIntelCard", () => ({
  MistakeIntelCard: () => <div data-testid="mistake-intel-card" />,
}));

import { DesktopShell } from "./DesktopShell";

afterEach(() => {
  cleanup();
  authState.user = null;
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="pathname">{loc.pathname}</div>;
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <DesktopShell>
        <div data-testid="page-content">page</div>
      </DesktopShell>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function signInAndOpenMenu() {
  authState.user = { uid: "test-uid", displayName: "Asha Rao", email: "asha@example.com" };
  renderShell();
  fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
}

const LEGAL = [
  ["Privacy", "/legal/privacy"],
  ["Terms", "/legal/terms"],
  // COPY-2 · K6 (owner, 2026-09-27): matches the page tab and title.
  ["Cancellation & Refunds", "/legal/refund"],
] as const;

describe("DesktopShell account dropdown — legal row (Lane C)", () => {
  it("renders all three legal links below Log out", () => {
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
    // Closes on navigation (setAccountOpen(false)).
    expect(screen.queryByRole("menu", { name: "Account menu" })).toBeNull();
  });
});

describe("DesktopShell account dropdown — SETTINGS-1 · one Settings entry" , () => {
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
});
