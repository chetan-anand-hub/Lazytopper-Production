/**
 * ASK-PARENTS-PAY-1 — the parent's page. Shows only the child's first name and the server's
 * prices; Premium is shown active ONLY from the server's grant; purchase fires once, from the
 * verified branch, tagged payer "parent"; the token leaves the address bar before checkout.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackBeginCheckout: vi.fn(), trackPurchase: vi.fn(), trackParentPayPageView: vi.fn() };
});

import { ParentPayPanelView } from "./ParentPayPanel";
import * as analytics from "../../analytics/analytics";
import { ParentLinkError, type ParentBuyOutcome, type ParentLinkView } from "../../services/parentPay";

const begin = analytics.trackBeginCheckout as unknown as ReturnType<typeof vi.fn>;
const purchase = analytics.trackPurchase as unknown as ReturnType<typeof vi.fn>;
const pageView = analytics.trackParentPayPageView as unknown as ReturnType<typeof vi.fn>;

const TOKEN = "P".repeat(43);
const VIEW: ParentLinkView = { firstName: "Aarav", prices: { month: 599, till_boards: 2396 }, expiresAt: "2026-10-21T10:00:00.000Z" };

async function renderPanel(over: Partial<Parameters<typeof ParentPayPanelView>[0]> = {}) {
  const props = {
    token: TOKEN,
    view: vi.fn(async () => VIEW),
    buy: vi.fn(async (): Promise<ParentBuyOutcome> => ({ status: "paid", passEnd: "2026-11-18T06:30:00.000Z", firstName: "Aarav", paymentId: "pay_9", amountInr: 599 })),
    scrubAddress: vi.fn(),
    ...over,
  };
  await act(async () => {
    render(<ParentPayPanelView {...props} />);
  });
  return props;
}

beforeEach(() => {
  begin.mockClear();
  purchase.mockClear();
  pageView.mockClear();
});
afterEach(cleanup);

describe("ParentPayPanel", () => {
  it("a live link: the child's FIRST name, the server's prices, who the pass is for, what Razorpay sees", async () => {
    const p = await renderPanel();
    expect(p.view).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pay for Aarav's LazyTopper Premium");
    expect(screen.getByRole("button", { name: "Pay ₹599 for a month" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pay ₹2,396 once, till the boards" })).toBeEnabled();
    const page = document.body.textContent || "";
    expect(page).toContain("goes to Aarav's account, not yours");
    expect(page).toContain("never sees your card, UPI or bank details");
    expect(page).toContain("one payment");
    expect(page).not.toContain(TOKEN);
    expect(pageView).toHaveBeenCalledTimes(1);
  });

  it("no name on the account: it says 'your child', never an invented name", async () => {
    await renderPanel({ view: vi.fn(async () => ({ ...VIEW, firstName: "" })) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pay for your child's LazyTopper Premium");
  });

  it.each([
    ["expired", "This link has expired"],
    ["used", "already been used"],
    ["invalid", "isn't valid"],
    ["failed", "couldn't open this link"],
  ] as const)("a refused link (%s) shows why, and NO pay button", async (reason, text) => {
    await renderPanel({ view: vi.fn(async () => { throw new ParentLinkError(reason); }) });
    expect(screen.getByTestId("parent-pay-refused")).toHaveTextContent(text);
    expect(screen.queryByRole("button", { name: /Pay ₹/ })).toBeNull();
    expect(pageView).not.toHaveBeenCalled();
  });

  it("pay: the token leaves the address bar BEFORE checkout; Premium shown only from the server's passEnd", async () => {
    const order: string[] = [];
    const scrubAddress = vi.fn(() => order.push("scrub"));
    const buy = vi.fn(async (): Promise<ParentBuyOutcome> => {
      order.push("buy");
      return { status: "paid", passEnd: "2026-11-18T06:30:00.000Z", firstName: "Aarav", paymentId: "pay_9", amountInr: 599 };
    });
    await renderPanel({ scrubAddress, buy });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pay ₹599 for a month" }));
    });
    expect(order).toEqual(["scrub", "buy"]);
    expect(buy).toHaveBeenCalledWith(TOKEN, "month");
    expect(screen.getByTestId("parent-pay-paid")).toHaveTextContent("Aarav's Premium is active until 18 November 2026");
    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ passType: "month", valueInr: 599, payer: "parent" }));
    expect(purchase).toHaveBeenCalledTimes(1);
    expect(purchase).toHaveBeenCalledWith(expect.objectContaining({ payer: "parent", transactionId: "pay_9", valueInr: 599 }));
  });

  it("dismissed or failed: no purchase event, no 'active' claim", async () => {
    await renderPanel({ buy: vi.fn(async (): Promise<ParentBuyOutcome> => ({ status: "failed" })) });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pay ₹2,396 once, till the boards" }));
    });
    expect(screen.getByTestId("parent-pay-failed")).toHaveTextContent("You haven't been charged twice");
    expect(screen.queryByTestId("parent-pay-paid")).toBeNull();
    expect(purchase).not.toHaveBeenCalled();
    cleanup();
    await renderPanel({ buy: vi.fn(async (): Promise<ParentBuyOutcome> => ({ status: "dismissed" })) });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pay ₹599 for a month" }));
    });
    expect(screen.queryByTestId("parent-pay-paid")).toBeNull();
    expect(screen.queryByTestId("parent-pay-failed")).toBeNull();
    expect(purchase).not.toHaveBeenCalled();
  });

  it("a link spent while the page was open (paid by the webhook) turns into the 'used' message", async () => {
    await renderPanel({ buy: vi.fn(async (): Promise<ParentBuyOutcome> => ({ status: "failed", reason: "used" })) });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pay ₹599 for a month" }));
    });
    expect(screen.getByTestId("parent-pay-refused")).toHaveTextContent("already been used");
  });

  it("हिंदी: the whole page switches, same prices", async () => {
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Aarav के LazyTopper Premium का भुगतान करें");
    expect(screen.getByRole("button", { name: "एक महीने के लिए ₹599 दें" })).toBeInTheDocument();
  });

  it("a server price that is missing hides that button — never a guessed price", async () => {
    await renderPanel({ view: vi.fn(async () => ({ ...VIEW, prices: { month: 599, till_boards: null } })) });
    expect(screen.queryByRole("button", { name: /till the boards/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Pay ₹599 for a month" })).toBeInTheDocument();
  });
});
