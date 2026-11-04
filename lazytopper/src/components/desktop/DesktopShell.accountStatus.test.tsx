import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * NAV-FIX-1 — the desktop account menu reads its status chip from the shared
 * `deriveAccountStatus` helper, so it says exactly what the mobile menu says
 * ("Board Pass", "Month pass · till 30 Nov", trial, Free) and never "Premium".
 */
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string; email?: string },
  logout: vi.fn(async () => {}),
}));
const subState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => subState.value,
}));
vi.mock("./MistakeIntelCard", () => ({
  MistakeIntelCard: () => <div data-testid="mistake-intel-card" />,
}));

import { DesktopShell } from "./DesktopShell";
import { MobileAccountMenu } from "../mobile/MobileAccountMenu";

afterEach(() => {
  cleanup();
  authState.user = null;
});

type Case = {
  name: string;
  sub: Record<string, unknown>;
  label: string;
};

const CASES: Case[] = [
  {
    name: "Board Pass owner",
    sub: {
      tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
      status: { tier: "premium", plan: "pass_till_boards", passEnd: "2027-03-31T18:29:59.000Z" },
    },
    label: "Board Pass",
  },
  {
    name: "month pass with its end date",
    sub: {
      tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
      status: { tier: "premium", plan: "pass_month", passEnd: "2026-11-30T12:00:00.000Z" },
    },
    label: "Month pass · till 30 Nov",
  },
  {
    name: "trial",
    sub: {
      tier: "trial", isPremium: false, isTrialActive: true, isTrialExpired: false, daysLeftInTrial: 5,
      status: { tier: "trial", plan: "trial_7day", passEnd: null },
    },
    label: "Trial active - 5 days left",
  },
  {
    name: "Basic (free)",
    sub: {
      tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
      status: { tier: "free", plan: "none", passEnd: null },
    },
    label: "Free account",
  },
];

function signIn() {
  authState.user = { uid: "test-uid", displayName: "Asha Rao", email: "asha@example.com" };
}

function desktopMenuText(): string {
  render(
    <MemoryRouter>
      <DesktopShell>
        <div>page</div>
      </DesktopShell>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
  const text = screen.getByRole("menu", { name: "Account menu" }).textContent ?? "";
  cleanup();
  return text;
}

function mobileMenuText(): string {
  render(
    <MemoryRouter initialEntries={["/me"]}>
      <MobileAccountMenu />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
  const text = screen.getByRole("menu", { name: "Account menu" }).textContent ?? "";
  cleanup();
  return text;
}

describe("NAV-FIX-1 desktop account menu status = mobile status", () => {
  it.each(CASES)("$name: desktop chip + menu read '$label', same as mobile, never Premium", ({ sub, label }) => {
    subState.value = sub;
    signIn();

    const desktop = desktopMenuText();
    const mobile = mobileMenuText();

    expect(desktop).toContain(label);
    expect(mobile).toContain(label);
    expect(desktop).not.toMatch(/premium/i);

    // The header chip beside the avatar carries the same label.
    render(
      <MemoryRouter>
        <DesktopShell>
          <div>page</div>
        </DesktopShell>
      </MemoryRouter>,
    );
    const header = document.querySelector("header") ?? document.body;
    expect(within(header as HTMLElement).getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("expired trial: no 'premium' wording in the chip detail either", () => {
    subState.value = {
      tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: true, daysLeftInTrial: 0,
      status: { tier: "free", plan: "trial_7day", passEnd: null },
    };
    signIn();
    render(
      <MemoryRouter>
        <DesktopShell>
          <div>page</div>
        </DesktopShell>
      </MemoryRouter>,
    );
    const chip = screen.getByRole("button", { name: "Trial ended - Choose plan" });
    expect(chip.getAttribute("title") ?? "").not.toMatch(/premium/i);
  });
});
