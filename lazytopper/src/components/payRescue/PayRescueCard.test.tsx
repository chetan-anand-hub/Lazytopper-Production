/**
 * PAY-RESCUE-1 - the "Can't pay yourself?" card.
 *
 * A closed checkout (pass or pack) now ends in the parent hand-off. Pass -> the EXISTING CHECKOUT-1 action
 * (`ask_parent_pay` + the same minted link); pack -> a share of the packs page (the parent link carries a pass only).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const named = vi.hoisted(() => vi.fn());
const paywall = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: named, trackPaywallAction: paywall };
});
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "uid-rescue-1" }, loading: false }) }));
const mint = vi.hoisted(() => vi.fn());
vi.mock("../../services/parentPay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/parentPay")>();
  return { ...actual, mintParentLink: mint };
});
vi.mock("../../services/progressReadModel", () => ({
  readStudyModel: async () => ({ progress: { activity: { gradedAnswers: 3 } } }),
}));

import PayRescueCard, {
  buildPackAskMessage,
  PAY_RESCUE_ASK_LABEL,
  PAY_RESCUE_CLOSE_LABEL,
  PAY_RESCUE_HEADING,
  PAY_RESCUE_LINE,
  PAY_RESCUE_RETRY_LABEL,
} from "./PayRescueCard";

const TOKEN = "T".repeat(43);

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-01T06:30:00.000Z"), toFake: ["Date"] });
  named.mockReset();
  paywall.mockReset();
  mint.mockReset();
  mint.mockResolvedValue({ token: TOKEN, expiresAt: new Date(Date.now() + 72 * 3600e3).toISOString(), prices: { month: null, till_boards: 1917 } });
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "true");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", "true");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const names = () => named.mock.calls.map((c) => c[0]);
const renderCard = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("PAY-RESCUE-1 · pass card", () => {
  it("shows the exact heading + line, fires pay_rescue_shown once, and offers Ask / Try again / Not now", async () => {
    renderCard(<PayRescueCard kind="pass" onRetry={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole("heading", { name: PAY_RESCUE_HEADING }).textContent).toBe("Can't pay yourself?");
    expect(PAY_RESCUE_LINE).toBe("Most parents pay for their child. Send them a link — they can pay on their phone.");
    expect(screen.getByText(PAY_RESCUE_LINE)).toBeTruthy();
    expect(await screen.findByTestId("paywall-forward")).toBeTruthy();
    expect(screen.getByTestId("paywall-forward").textContent).toBe(PAY_RESCUE_ASK_LABEL);
    expect(screen.getByTestId("pay-rescue-retry").textContent).toBe(PAY_RESCUE_RETRY_LABEL);
    expect(screen.getByTestId("pay-rescue-close").textContent).toBe(PAY_RESCUE_CLOSE_LABEL);
    // only the parent action: no Pay, no QR (those belong to the lock screens)
    expect(screen.queryByTestId("paywall-pay")).toBeNull();
    expect(screen.queryByTestId("paywall-qr")).toBeNull();
    expect(names().filter((n) => n === "pay_rescue_shown")).toHaveLength(1);
  });

  it("Forward link to parents reuses the existing action: ask_parent_pay (surface pay_rescue) + pay_rescue_parent + the minted link", async () => {
    const share = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: share });
    renderCard(<PayRescueCard kind="pass" onRetry={() => undefined} onClose={() => undefined} />);
    fireEvent.click(await screen.findByTestId("paywall-forward"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(paywall).toHaveBeenCalledWith("ask", "pay_rescue");
    expect(names()).toContain("pay_rescue_parent");
    expect(mint).toHaveBeenCalledTimes(1);
    expect((share.mock.calls[0] as unknown as [{ text: string }])[0].text).toContain(`#pp=${TOKEN}`);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
  });

  it("Try again calls onRetry and fires pay_rescue_retry; Not now calls onClose and fires nothing", () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();
    renderCard(<PayRescueCard kind="pass" onRetry={onRetry} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("pay-rescue-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(names()).toContain("pay_rescue_retry");
    fireEvent.click(screen.getByTestId("pay-rescue-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(names().filter((n) => n !== "pay_rescue_shown" && n !== "pay_rescue_retry")).toEqual([]);
  });

  it("with the parent-pay switch off there is no honest hand-off, so no card is shown", () => {
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "");
    renderCard(<PayRescueCard kind="pass" onRetry={() => undefined} onClose={() => undefined} />);
    expect(screen.queryByTestId("pay-rescue")).toBeNull();
    expect(names()).not.toContain("pay_rescue_shown");
  });
});

describe("PAY-RESCUE-1 · pack card", () => {
  it("Ask a parent shares the packs link as text (no order, no token) and fires both events", async () => {
    const share = vi.fn(async () => undefined);
    renderCard(
      <PayRescueCard
        kind="pack"
        packLabel="Chapter Pack · Triangles"
        origin="https://www.lazytopper.com"
        nav={{ share } as never}
        onRetry={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(PAY_RESCUE_HEADING)).toBeTruthy();
    fireEvent.click(screen.getByTestId("pay-rescue-ask-pack"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const text = (share.mock.calls[0] as unknown as [{ text: string }])[0].text;
    expect(text).toContain("https://www.lazytopper.com/pricing?from=for_parents#packs");
    expect(text).toContain("Chapter Pack · Triangles");
    expect(text).not.toMatch(/₹|Rs\.?\s?\d/); // no price is typed into the message
    expect(mint).not.toHaveBeenCalled();
    expect(paywall).toHaveBeenCalledWith("ask", "pay_rescue");
    expect(names()).toEqual(expect.arrayContaining(["pay_rescue_shown", "pay_rescue_parent"]));
  });

  it("with no share sheet it opens WhatsApp; a blocked popup is named", async () => {
    const openWindow = vi.fn(() => null);
    renderCard(
      <PayRescueCard kind="pack" origin="https://www.lazytopper.com" nav={{} as never} openWindow={openWindow} onRetry={() => undefined} onClose={() => undefined} />,
    );
    fireEvent.click(screen.getByTestId("pay-rescue-ask-pack"));
    await waitFor(() => expect(openWindow).toHaveBeenCalledTimes(1));
    expect((openWindow.mock.calls[0] as unknown as [string])[0]).toContain("https://wa.me/");
    expect((await screen.findByTestId("pay-rescue-notice")).textContent).toMatch(/WhatsApp didn't open/);
  });

  it("the pack message is plain and kind", () => {
    const m = buildPackAskMessage("https://x.test/p");
    expect(m).toContain("a practice PDF pack");
    expect(m).toContain("https://x.test/p");
  });
});
