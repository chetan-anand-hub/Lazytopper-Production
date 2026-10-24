/**
 * SettingsModal (SETTINGS-1) — the one Settings window behind the avatar button.
 *
 * Pins: the four sections in order; "Manage your pass" goes exactly where the old menu item
 * went; "Sign-in methods" hands over (this window does not stay open under the linking modal);
 * Esc and the x close it and focus returns to the avatar; the Mascots switch still flips the
 * device key; "Your data" buttons are present and the delete confirmation still opens.
 * The component is mounted in a MemoryRouter at /practice-hub?x=1 so returnTo is observable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const authState = vi.hoisted(() => ({ logout: vi.fn(async () => {}) }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-settings", displayName: "Asha" }, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: true,
    daysLeftInTrial: 0,
  }),
}));

import SettingsModal from "./SettingsModal";
import { MASCOTS_HIDDEN_KEY, __resetMascotsForTests, hideMascots } from "../guide/mascotsMute";

function Probe() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
}

function mount(props: Partial<React.ComponentProps<typeof SettingsModal>> = {}) {
  const onClose = vi.fn();
  const onOpenSignInMethods = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={["/practice-hub?x=1"]}>
      <button type="button" data-testid="avatar">
        avatar
      </button>
      <SettingsModal open onClose={onClose} onOpenSignInMethods={onOpenSignInMethods} {...props} />
      <Probe />
    </MemoryRouter>,
  );
  return { onClose, onOpenSignInMethods, ...utils };
}

beforeEach(() => {
  localStorage.clear();
  __resetMascotsForTests();
});
afterEach(cleanup);

describe("SettingsModal", () => {
  it("is a labelled dialog titled Settings, portalled to document.body", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.closest("body")).toBe(document.body);
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it("renders nothing when closed", () => {
    mount({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the four sections in order: pass, sign-in methods, mascots (when shown), your data", () => {
    // Mascots hidden on this device => MascotsSetting always renders (the way back).
    hideMascots();
    mount();
    const nodes = [
      screen.getByRole("heading", { name: "Your pass" }),
      screen.getAllByRole("heading", { name: "Sign-in methods" })[0],
      screen.getByRole("heading", { name: "Mascots" }),
      screen.getByRole("region", { name: "Your data and your account" }),
    ];
    for (let i = 0; i < nodes.length - 1; i++) {
      expect(nodes[i].compareDocumentPosition(nodes[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("Your pass shows the shared status text and Manage your pass goes to the same URL the menu used", () => {
    mount();
    expect(screen.getByTestId("settings-pass-status").textContent).toContain("Trial ended - Choose plan");
    fireEvent.click(screen.getByRole("button", { name: "Manage your pass" }));
    expect(screen.getByTestId("where").textContent).toBe(
      `/pricing?source=account-menu&returnTo=${encodeURIComponent("/practice-hub?x=1")}`,
    );
  });

  it("Manage your pass closes the window and carries returnTo", () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Manage your pass" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Sign-in methods hands over to the existing modal via the callback", () => {
    const { onOpenSignInMethods } = mount();
    fireEvent.click(screen.getAllByRole("button", { name: "Sign-in methods" })[0]);
    expect(onOpenSignInMethods).toHaveBeenCalledTimes(1);
  });

  it("Esc closes; the x closes; a click on the scrim closes", () => {
    const a = mount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(a.onClose).toHaveBeenCalledTimes(1);
    cleanup();

    const b = mount();
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(b.onClose).toHaveBeenCalledTimes(1);
    cleanup();

    const c = mount();
    fireEvent.mouseDown(screen.getByRole("dialog", { name: "Settings" }).parentElement as HTMLElement);
    expect(c.onClose).toHaveBeenCalledTimes(1);
  });

  it("focus goes into the dialog on open and returns to the avatar on close", () => {
    const avatar = document.createElement("button");
    document.body.appendChild(avatar);
    const ref = { current: avatar };
    const view = mount({ returnFocusRef: ref });
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    view.rerender(
      <MemoryRouter initialEntries={["/practice-hub?x=1"]}>
        <SettingsModal open={false} onClose={() => {}} onOpenSignInMethods={() => {}} returnFocusRef={ref} />
      </MemoryRouter>,
    );
    expect(document.activeElement).toBe(avatar);
    avatar.remove();
  });

  it("Tab wraps inside the dialog", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    const buttons = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("the Mascots switch still flips the device key", () => {
    hideMascots();
    mount();
    expect(localStorage.getItem(MASCOTS_HIDDEN_KEY)).toBe("1");
    fireEvent.click(screen.getByTestId("mascots-switch"));
    expect(localStorage.getItem(MASCOTS_HIDDEN_KEY)).toBeNull();
  });

  it("Your data: Download and Delete my account are present, and Delete opens its confirm step (portal intact)", () => {
    mount();
    expect(screen.getByRole("button", { name: /^download$/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /delete my account/i }));
    expect(screen.getByRole("dialog", { name: /delete your account\?/i })).toBeTruthy();
  });

  it("Esc does not close Settings out from under the delete confirmation", () => {
    const { onClose } = mount();
    fireEvent.click(screen.getByRole("button", { name: /delete my account/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
