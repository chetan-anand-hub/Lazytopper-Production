/**
 * PAY-RESCUE-1 - the pricing page's buy area: a CLOSED checkout (outcome `dismissed`) now shows the
 * "Can't pay yourself?" card; "Try again" re-opens the same pass; "Not now" hides it. Other outcomes do not show it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../services/progressReadModel", () => ({ readStudyModel: async () => ({ progress: { activity: { gradedAnswers: 0 } } }) }));
const mint = vi.hoisted(() => vi.fn());
vi.mock("../../services/parentPay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/parentPay")>()),
  mintParentLink: mint,
}));

import { PassCheckoutView, tillBoardsButtonLabel } from "./PassCheckout";
import type { BuyOutcome } from "../../services/checkout";

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-01T06:30:00.000Z"), toFake: ["Date"] });
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "true");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", "true");
  mint.mockResolvedValue({ token: "T".repeat(43), expiresAt: new Date(Date.now() + 72 * 3600e3).toISOString(), prices: { month: null, till_boards: 1917 } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function view(onBuy: (t: "month" | "till_boards") => Promise<BuyOutcome>) {
  return render(
    <MemoryRouter>
      <PassCheckoutView signedIn offerOpen activePassEnd={null} onSignIn={() => undefined} onBuy={onBuy} />
    </MemoryRouter>,
  );
}
const payButton = () => screen.getByRole("button", { name: tillBoardsButtonLabel() });

describe("PAY-RESCUE-1 · PassCheckoutView", () => {
  it("dismissed -> the rescue card appears (and no failure sentence); Try again re-opens the same pass", async () => {
    const onBuy = vi.fn(async (): Promise<BuyOutcome> => ({ status: "dismissed" }));
    view(onBuy);
    expect(screen.queryByTestId("pay-rescue")).toBeNull();
    fireEvent.click(payButton());
    expect(await screen.findByTestId("pay-rescue")).toBeTruthy();
    expect(screen.queryByTestId("pass-checkout-failed")).toBeNull();
    expect(onBuy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("pay-rescue-retry"));
    await waitFor(() => expect(onBuy).toHaveBeenCalledTimes(2));
    expect(onBuy).toHaveBeenLastCalledWith("till_boards");
  });

  it("dismissed after a failed payment (afterFailure) shows the same card", async () => {
    view(async () => ({ status: "dismissed", afterFailure: true }));
    fireEvent.click(payButton());
    expect(await screen.findByTestId("pay-rescue")).toBeTruthy();
  });

  it("Not now hides the card", async () => {
    view(async () => ({ status: "dismissed" }));
    fireEvent.click(payButton());
    fireEvent.click(await screen.findByTestId("pay-rescue-close"));
    expect(screen.queryByTestId("pay-rescue")).toBeNull();
  });

  it("failed / expired / paid outcomes never show the rescue card", async () => {
    for (const outcome of [{ status: "failed" }, { status: "expired" }, { status: "paid", passEnd: "2027-03-01T00:00:00.000Z" }] as BuyOutcome[]) {
      const r = view(async () => outcome);
      fireEvent.click(payButton());
      await waitFor(() => expect(screen.queryByRole("button", { name: /Opening|…/ })).toBeNull());
      await new Promise((res) => setTimeout(res, 0));
      expect(screen.queryByTestId("pay-rescue")).toBeNull();
      r.unmount();
    }
  });

  it("the card sits in the buy area's bottom full-width row (below the Pay buttons)", async () => {
    view(async () => ({ status: "dismissed" }));
    fireEvent.click(payButton());
    const holder = await screen.findByTestId("pass-checkout-rescue");
    expect(holder.className).toContain("lt-pricing-checkout-note--bottom");
  });
});
