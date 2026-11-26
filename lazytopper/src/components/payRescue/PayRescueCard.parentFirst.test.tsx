/** PARENT-PAY-FIRST-1 - the signed-in card: forward first, QR second, per product; kill switch = the old card. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding, trackNamedEvent: vi.fn(), trackPaywallAction: vi.fn() };
});
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "uid-pf-1" }, loading: false }) }));
const mint = vi.hoisted(() => vi.fn());
const mintPack = vi.hoisted(() => vi.fn());
vi.mock("../../services/parentPay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/parentPay")>();
  return { ...actual, mintParentLink: mint };
});
vi.mock("../../services/parentPayPack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/parentPayPack")>();
  return { ...actual, mintParentPackLink: mintPack };
});
vi.mock("../../services/progressReadModel", () => ({ readStudyModel: async () => ({ progress: { activity: { gradedAnswers: 0 } } }) }));

import PayRescueCard from "./PayRescueCard";
import { PARENT_FORWARD_LABEL, PARENT_FORWARD_QR_LABEL } from "./parentForward";

const TOKEN = "T".repeat(43);
beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-12-05T06:30:00.000Z"), toFake: ["Date"] });
  onboarding.mockReset();
  mint.mockReset();
  mintPack.mockReset();
  const link = { token: TOKEN, expiresAt: "2026-12-08T06:30:00.000Z", prices: { month: null, till_boards: 2499 } };
  mint.mockResolvedValue(link);
  mintPack.mockResolvedValue({ ...link, pack: { sku: "test_series", priceInr: 999, totalInr: 1179 } });
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "true");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", "true");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
const renderCard = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const noop = () => undefined;

describe("PARENT-PAY-FIRST-1 · signed-in card", () => {
  it("pass: forward is the first action, QR the second, Try again after; events carry signed_in true", async () => {
    renderCard(<PayRescueCard kind="pass" onRetry={noop} onClose={noop} />);
    const fwd = await screen.findByTestId("paywall-forward");
    expect(fwd.textContent).toBe(PARENT_FORWARD_LABEL);
    expect(screen.getByTestId("paywall-qr").textContent).toBe(PARENT_FORWARD_QR_LABEL);
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels.slice(0, 3)).toEqual([PARENT_FORWARD_LABEL, PARENT_FORWARD_QR_LABEL, "Try again"]);
    expect(onboarding).toHaveBeenCalledWith("parent_forward_shown", { signed_in: "true", product: "board_pass" });
    const share = vi.fn(async () => undefined);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: share });
    fireEvent.click(fwd);
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(onboarding).toHaveBeenCalledWith("parent_forward_clicked", { signed_in: "true", product: "board_pass" });
    expect(mint).toHaveBeenCalledTimes(1);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
  });

  it("pass: the QR tap fires parent_forward_qr_shown", async () => {
    renderCard(<PayRescueCard kind="pass" onRetry={noop} onClose={noop} />);
    fireEvent.click(await screen.findByTestId("paywall-qr"));
    await waitFor(() => expect(onboarding).toHaveBeenCalledWith("parent_forward_qr_shown", { signed_in: "true", product: "board_pass" }));
  });

  it("pack and Test Series with a product: the same minted-link hand-off (not the plain page share)", async () => {
    for (const [sku, name, want] of [["pack_chapter", "Chapter Pack", "pack"], ["test_series", "Test Series Pack", "test_series"]] as const) {
      cleanup();
      onboarding.mockReset();
      renderCard(<PayRescueCard kind="pack" onRetry={noop} onClose={noop} product={{ kind: "pack", sku, name }} />);
      expect((await screen.findByTestId("paywall-forward")).textContent).toBe(PARENT_FORWARD_LABEL);
      expect(screen.queryByTestId("pay-rescue-ask-pack")).toBeNull();
      expect(onboarding).toHaveBeenCalledWith("parent_forward_shown", { signed_in: "true", product: want });
    }
  });

  it("pack without a product keeps the plain page share (host that has not been updated)", () => {
    renderCard(<PayRescueCard kind="pack" onRetry={noop} onClose={noop} />);
    expect(screen.getByTestId("pay-rescue-ask-pack")).toBeTruthy();
    expect(onboarding).not.toHaveBeenCalledWith("parent_forward_shown", expect.anything());
  });

  it("kill switch: exactly the card from before (Forward link to parents only, no QR, plain pack share, no new events)", async () => {
    vi.stubEnv("VITE_PARENT_PAY_FIRST_DISABLED", "1");
    renderCard(<PayRescueCard kind="pass" onRetry={noop} onClose={noop} />);
    expect((await screen.findByTestId("paywall-forward")).textContent).toBe("Forward link to parents");
    expect(screen.queryByTestId("paywall-qr")).toBeNull();
    cleanup();
    renderCard(<PayRescueCard kind="pack" onRetry={noop} onClose={noop} product={{ kind: "pack", sku: "pack_chapter", name: "Chapter Pack" }} />);
    expect(screen.getByTestId("pay-rescue-ask-pack")).toBeTruthy();
    expect(onboarding).not.toHaveBeenCalledWith("parent_forward_shown", expect.anything());
  });
});
