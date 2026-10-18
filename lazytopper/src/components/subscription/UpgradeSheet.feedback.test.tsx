import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const notifyPaywallDismissed = vi.hoisted(() => vi.fn());
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyPaywallDismissed }));

const sub = vi.hoisted(() => ({ isTrialExpired: true, daysLeftInTrial: 0, isTrialActive: false, tier: "free" }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => sub }));

import { UpgradeSheet } from "./UpgradeSheet";
import { UpgradeModal } from "../UpgradeModal";

/**
 * FEEDBACK-1 — the paywall moment is "closed WITHOUT going to plans". Every dismissal path
 * of both paywall components asks the host; "See plans" / "Choose plan" never does. The
 * component always closes FIRST (onClose before the ask), so nothing waits on the prompt.
 */
afterEach(() => cleanup());
beforeEach(() => notifyPaywallDismissed.mockClear());

function sheet() {
  const order: string[] = [];
  const onClose = vi.fn(() => order.push("close"));
  notifyPaywallDismissed.mockImplementation(() => order.push("ask"));
  render(
    <MemoryRouter>
      <UpgradeSheet featureLabel="Checking your answer" onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose, order };
}

function modal() {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <UpgradeModal open onClose={onClose} featureLabel="Full Access" />
    </MemoryRouter>,
  );
  return { onClose };
}

describe("UpgradeSheet — paywall moment", () => {
  it.each([
    ["Keep using Basic", () => fireEvent.click(screen.getByRole("button", { name: "Keep using Basic" }))],
    ["the backdrop", () => fireEvent.click(screen.getByTestId("upgrade-sheet-scrim"))],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("%s closes first, then asks once", (_l, act1) => {
    const { onClose, order } = sheet();
    act1();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notifyPaywallDismissed).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["close", "ask"]);
  });

  it("See plans is not a dismissal: no ask (control above asks)", () => {
    sheet();
    fireEvent.click(screen.getByRole("button", { name: "See plans" }));
    expect(notifyPaywallDismissed).not.toHaveBeenCalled();
  });
});

describe("UpgradeModal — paywall moment", () => {
  it("Keep using Basic, the corner close and the backdrop each close and ask once", () => {
    const { onClose } = modal();
    fireEvent.click(screen.getByTestId("upgrade-modal-keep-basic"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notifyPaywallDismissed).toHaveBeenCalledTimes(1);
    cleanup();
    notifyPaywallDismissed.mockClear();
    const m2 = modal();
    fireEvent.click(screen.getByText("✕"));
    expect(m2.onClose).toHaveBeenCalledTimes(1);
    expect(notifyPaywallDismissed).toHaveBeenCalledTimes(1);
  });

  it("Choose Plan is not a dismissal: no ask", () => {
    modal();
    fireEvent.click(screen.getByRole("button", { name: /choose plan|view plans/i }));
    expect(notifyPaywallDismissed).not.toHaveBeenCalled();
  });
});
