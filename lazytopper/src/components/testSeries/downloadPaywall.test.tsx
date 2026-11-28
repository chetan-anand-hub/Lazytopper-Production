import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DownloadPaywall, DownloadWithPlanLink, DOWNLOAD_PAYWALL_LINE, downloadPaywallOn } from "./WrittenCheckGate";
import { ACTIVITY_EVENTS } from "../../services/activityClient";

/**
 * FREE-TS-WEEKLY (owner addition 27 Nov 2026, 13:19 IST) - tapping Download on a Test Series paper (or its solutions) as Basic / trial /
 * signed out opens the Test Series + Board Pass offer (never a silent hide), and it is tracked through the product's analytics path:
 * Vercel Web Analytics (`window.va`, a script tag - no npm package) and GA4 / the first-party log through `send`.
 */
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;
const originalLocation = window.location;

beforeEach(() => {
  sent = [];
  (window as unknown as { va?: unknown }).va = (kind: string, payload: Record<string, unknown>) => {
    sent.push({ kind, payload });
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname: "www.lazytopper.com", href: "https://www.lazytopper.com/" },
  });
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
});
afterEach(() => {
  cleanup();
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
});

const events = (name: string) => sent.filter((s) => s.kind === "event" && s.payload.name === name);

describe("download paywall on a Test Series paper", () => {
  it("shows the message with BOTH pay buttons, each naming the total charged, and fires download_paywall_shown once", () => {
    render(
      <MemoryRouter initialEntries={["/chapter-test/10/Maths/real-numbers?series=1"]}>
        <DownloadPaywall paperCode="CT-M01" signedIn={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("download-paywall").textContent).toContain(DOWNLOAD_PAYWALL_LINE);
    expect(screen.getByTestId("download-paywall-ts-pay").textContent).toMatch(/^Pay ₹/);
    expect(screen.getByTestId("download-paywall-bp")).toBeTruthy();
    expect(DOWNLOAD_PAYWALL_LINE).not.toMatch(/\bAI\b|answer key|Check & Improve/i);
    const shown = events("download_paywall_shown");
    expect(shown).toHaveLength(1);
    expect(shown[0].payload.data).toEqual({ paper: "CT-M01", plan: "none", signed_in: false });
  });

  it("a tap on a pay button fires download_paywall_pay_tap with the paper code and the plan", () => {
    render(
      <MemoryRouter>
        <DownloadPaywall paperCode="FM-S2" signedIn onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("download-paywall-ts"));
    fireEvent.click(screen.getByTestId("download-paywall-bp"));
    const taps = events("download_paywall_pay_tap");
    expect(taps.map((t) => (t.payload.data as { plan: string }).plan)).toEqual(["test_series", "board_pass"]);
    expect(taps[0].payload.data).toEqual({ paper: "FM-S2", plan: "test_series", signed_in: true });
  });

  it("Not now closes it", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <DownloadPaywall paperCode="CT-M01" signedIn onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("download-paywall-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the Download control is a BUTTON that opens the paywall when the page passes onPaywall; without it, today's link", () => {
    const onPaywall = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <DownloadWithPlanLink onPaywall={onPaywall} />
      </MemoryRouter>,
    );
    const btn = screen.getByTestId("download-with-plan");
    expect(btn.tagName).toBe("BUTTON");
    fireEvent.click(btn);
    expect(onPaywall).toHaveBeenCalledTimes(1);
    rerender(
      <MemoryRouter>
        <DownloadWithPlanLink />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("download-with-plan").tagName).toBe("A");
  });

  it("both event names are in the first-party activity allow-list (the server's mirror is pinned by activityClient.test)", () => {
    expect(ACTIVITY_EVENTS).toContain("download_paywall_shown");
    expect(ACTIVITY_EVENTS).toContain("download_paywall_pay_tap");
  });

  it("the paywall is on by default and the kill switch VITE_FREE_TS_WEEKLY_DISABLED=1 turns it off", () => {
    expect(downloadPaywallOn()).toBe(true);
    vi.stubEnv("VITE_FREE_TS_WEEKLY_DISABLED", "1");
    expect(downloadPaywallOn()).toBe(false);
    vi.unstubAllEnvs();
  });
});
