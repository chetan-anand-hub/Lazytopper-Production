/**
 * PAYWALL-PAY-1 review M1 — the actions chunk fails to load (offline, blocked, deploy-skew
 * 404). The surface's old control must stay on screen and nothing may throw to an error
 * boundary (the tutor page, or the global "Something went wrong").
 *
 * A separate file because the chunk is mocked to REJECT for every import here, which the
 * other PaywallActions tests (they import ./PaywallActionsView directly) cannot share.
 */
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Every import of the chunk rejects. (Vitest wraps a throwing mock factory in its own "error
// when mocking a module" error, so this reaches the final catch directly; the retry itself is
// covered by lazyWithRetry's own tests.)
vi.mock("./PaywallActionsView", () => {
  throw new Error("Importing a module script failed.");
});

import PaywallActions from "./PaywallActions";

class Boundary extends Component<{ onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? <p>Something went wrong</p> : this.props.children;
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("M1 — a failed actions chunk falls back to the old control", () => {
  it("the import rejects: the fallback is still rendered and no error reaches a boundary", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    const onError = vi.fn();
    render(
      <MemoryRouter>
        <Boundary onError={onError}>
          <PaywallActions surface="tutor" payTo="/pricing" fallback={<a href="/pricing">See Premium</a>} />
        </Boundary>
      </MemoryRouter>,
    );
    // Past the retry's 300 ms wait, the load has settled on the old control.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(await screen.findByRole("link", { name: "See Premium" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.queryByTestId("paywall-actions")).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
