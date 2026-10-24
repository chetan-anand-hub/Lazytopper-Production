/**
 * SettingsModalSlot (SETTINGS-1) — a failed Settings chunk must not break the page.
 *
 * lazyWithRetry is replaced by a switchable loader so the first open can reject and the
 * second succeed. Pins: the surrounding shell stays rendered and nothing reaches an outer
 * (global-style) boundary; the slot calls onClose (the menu resets settingsOpen); a second
 * tap retries and shows the window (React.lazy would have replayed the cached rejection).
 */
import { useState, Component, lazy, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const loader = vi.hoisted(() => ({ fail: true, calls: 0 }));
vi.mock("../../lib/lazyWithRetry", () => ({
  lazyWithRetry: () =>
    lazy(() => {
      loader.calls += 1;
      return loader.fail
        ? Promise.reject(new Error("Importing a module script failed."))
        : Promise.resolve({ default: () => <div role="dialog" aria-label="Settings" /> });
    }),
}));

import SettingsModalSlot from "./SettingsModalSlot";

class Outer extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>Something went wrong</p> : this.props.children;
  }
}

function Menu() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        open settings
      </button>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      {open && (
        <SettingsModalSlot open onClose={() => setOpen(false)} onOpenSignInMethods={() => {}} />
      )}
    </div>
  );
}

afterEach(cleanup);

describe("SettingsModalSlot", () => {
  it("a rejected import leaves the shell usable, and a second tap retries", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Outer>
        <Menu />
      </Outer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "open settings" }));
    await vi.waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "open settings" })).toBeTruthy();

    loader.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "open settings" }));
    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeTruthy();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    spy.mockRestore();
  });
});
