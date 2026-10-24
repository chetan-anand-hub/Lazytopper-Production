// @vitest-environment jsdom
/**
 * SETTINGS-USAGE-1 — fair use ("Your limits") lives in Settings.
 *
 * Pins: the card sits right after "Your pass" when the server enforces fair use (trial and premium)
 * and there is NO limits section at all when it does not (dark / free); "See usage" reaches the
 * mounted shell through the door and Settings opens scrolled to #usage, on the phone menu and the
 * desktop shell alike, and only ONE window opens.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const authState = vi.hoisted(() => ({
  user: { uid: "u-usage", displayName: "Asha", email: "asha@example.com" } as null | Record<string, string>,
  logout: vi.fn(async () => {}),
}));
const usage = vi.hoisted(() => ({ snap: null as unknown }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "premium", isTrialActive: false, isPremium: true, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
vi.mock("../desktop/MistakeIntelCard", () => ({ MistakeIntelCard: () => <div /> }));
vi.mock("../../services/usageClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/usageClient")>()),
  fetchUsageMe: vi.fn(async () => usage.snap),
}));

import SettingsModal from "./SettingsModal";
import { MobileAccountMenu } from "../mobile/MobileAccountMenu";
import { DesktopShell } from "../desktop/DesktopShell";
import UsageWarning from "../usage/UsageWarning";
import { __resetSettingsDoorForTests } from "./settingsDoor";
import type { UsageSnapshot } from "../../services/usageClient";

const premium = {
  enforced: true,
  tier: "premium",
  premium: { fiveHourPct: 10, dayPct: 80, weekPct: 10, thirtyDayPct: null, resets: { fiveHour: null, day: null, week: null, thirtyDay: null } },
} as unknown as UsageSnapshot;
const trial = { enforced: true, tier: "trial", trial: null } as unknown as UsageSnapshot;

let scroll: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse("2026-09-28T04:30:00Z"), toFake: ["Date"] });
  scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll as unknown as typeof Element.prototype.scrollIntoView;
  authState.user = { uid: "u-usage", displayName: "Asha", email: "asha@example.com" };
  usage.snap = premium;
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  __resetSettingsDoorForTests();
});

function modal(props: Partial<React.ComponentProps<typeof SettingsModal>> = {}) {
  return render(
    <MemoryRouter>
      <SettingsModal open onClose={() => {}} onOpenSignInMethods={() => {}} {...props} />
    </MemoryRouter>,
  );
}

describe("SettingsModal · Your limits", () => {
  it.each([["premium", premium], ["trial", trial]])("%s: the limits card sits right after Your pass, before Sign-in methods", async (_n, snap) => {
    usage.snap = snap;
    modal();
    const card = await screen.findByTestId("usage-card");
    const pass = screen.getByRole("heading", { name: "Your pass" });
    const signIn = screen.getAllByRole("heading", { name: "Sign-in methods" })[0];
    expect(pass.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.closest(".lt-usage-settings")).toBeTruthy();
    expect(screen.getByTestId("usage-always-works")).toBeTruthy();
  });

  it.each([
    ["not enforced", { enforced: false, tier: "premium" }],
    ["free", { enforced: true, tier: "free" }],
    ["unavailable", null],
  ])("%s: NO limits section, no frame, no heading", async (_n, snap) => {
    usage.snap = snap;
    modal();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your pass" })).toBeTruthy());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("usage-card")).toBeNull();
    expect(screen.queryByTestId("usage-always-works")).toBeNull();
    expect(document.querySelector(".lt-usage-settings")).toBeNull();
    expect(screen.queryByText("Your limits")).toBeNull();
  });

  it("section=usage scrolls the card into view once it renders; no section does not", async () => {
    modal({ section: "usage" });
    await screen.findByTestId("usage-card");
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    cleanup();
    scroll.mockClear();
    modal();
    await screen.findByTestId("usage-card");
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("See usage → Settings at the limits", () => {
  function seeUsage() {
    // 80% day → the premium warning shows its "See usage" action.
    return (
      <UsageWarning scope="practice" snapshot={premium} nowMs={Date.parse("2026-09-28T04:30:00Z")} />
    );
  }

  it("★ phone: the button opens the menu's Settings window scrolled to the limits", async () => {
    render(
      <MemoryRouter>
        <MobileAccountMenu />
        {seeUsage()}
      </MemoryRouter>,
    );
    const btn = screen.getByTestId("usage-warning-link");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.textContent).toBe("See usage");
    btn.focus();
    fireEvent.click(btn);
    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeTruthy();
    await screen.findByTestId("usage-card");
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(screen.getAllByRole("dialog", { name: "Settings" })).toHaveLength(1);
    // closing returns focus to the button that asked
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    await waitFor(() => expect(document.activeElement).toBe(btn));
  });

  it("★ desktop: same, through DesktopShell", async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <DesktopShell>{seeUsage()}</DesktopShell>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("usage-warning-link"));
    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeTruthy();
    await screen.findByTestId("usage-card");
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(screen.getAllByRole("dialog", { name: "Settings" })).toHaveLength(1);
  });

  it("with no shell mounted the button falls back to /me#usage instead of doing nothing", () => {
    function Where() {
      const l = useLocation();
      return <div data-testid="where">{`${l.pathname}${l.hash}`}</div>;
    }
    render(
      <MemoryRouter initialEntries={["/practice"]}>
        {seeUsage()}
        <Where />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("usage-warning-link"));
    expect(screen.getByTestId("where").textContent).toBe("/me#usage");
  });

  it("signed out: a request does not open a window", async () => {
    authState.user = null;
    render(
      <MemoryRouter>
        <MobileAccountMenu />
        {seeUsage()}
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("usage-warning-link"));
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
  });
});
