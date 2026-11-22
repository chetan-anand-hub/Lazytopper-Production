/**
 * PAY-HANG-1 - the resume view takes the bar's answer: paid / failed show the existing views with no second status call, Razorpay's
 * timeout close runs the usual resume once, and PAY-RETURN-1's resume on a reset page is unchanged (one run, no double calls).
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: vi.fn(), trackNamedEvent: vi.fn() };
});
vi.mock("../checkoutWho/PurchaseCard", () => ({ default: (p: { proof: { orderId: string } }) => <div data-testid="purchase-card-stub" data-order={p.proof.orderId} /> }));
vi.mock("../gstInvoice/PostPayGst", () => ({ default: () => <div data-testid="gst-stub" /> }));

import PayReturnResume from "./PayReturnResume";
import { PAY_HANG_EVENT, PAY_RETURN_FAILED, rememberPendingOrder, resetPayReturnForTests, type HangEventDetail } from "../../services/payReturn";

const PROOF = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const ITEM = { kind: "pack" as const, sku: "pack_cbq", target: "maths" };
const RECEIPT = { orderId: "order_A", paymentId: "pay_A", signature: "ab12" };
let fetchSpy: MockInstance<typeof fetch>;
const fire = (d: { kind: HangEventDetail["kind"]; [k: string]: unknown }) => {
  const detail = { handled: false, ...d } as HangEventDetail;
  act(() => {
    window.dispatchEvent(new CustomEvent(PAY_HANG_EVENT, { detail }));
  });
  return detail;
};
const entry = { orderId: "order_A", proof: PROOF, host: "packs", buy: { kind: "pack" as const, sku: "pack_cbq", target: "maths" }, startedAt: Date.now() };

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetPayReturnForTests();
  fetchSpy = vi.spyOn(globalThis, "fetch");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PAY-HANG-1 PayReturnResume", () => {
  it("paid from the bar: the existing purchase card, marked handled, no status call", async () => {
    render(<PayReturnResume />);
    await act(async () => undefined);
    const d = fire({ kind: "paid", receipt: RECEIPT });
    expect(d.handled).toBe(true);
    expect((await screen.findByTestId("purchase-card-stub")).getAttribute("data-order")).toBe("order_A");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("failed from the bar: the existing failed view with Try again (the same checkout), no status call", async () => {
    render(<PayReturnResume />);
    await act(async () => undefined);
    const d = fire({ kind: "failed", entry });
    expect(d.handled).toBe(true);
    expect((await screen.findByTestId("pay-return-failed")).textContent).toContain(PAY_RETURN_FAILED);
    expect(screen.getByTestId("pay-return-try-again").getAttribute("href")).toContain("buy=pack_cbq");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("Razorpay's timeout close ('resume'): one ordinary resume run on the kept note", async () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, Date.now() - 10_000);
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ ok: true, status: "failed", reason: "payment_timed_out" }), { status: 200 }));
    render(<PayReturnResume />);
    // the on-load run already asked once and showed the failed view; a second 'resume' inside the same return is the no-double-call guard
    await screen.findByTestId("pay-return-failed");
    const calls = fetchSpy.mock.calls.length;
    fire({ kind: "resume" });
    await act(async () => undefined);
    expect(fetchSpy.mock.calls.length).toBe(calls);
  });
  it("PAY-RETURN-1 is unchanged on a reset page: a note and no sheet -> exactly one status call on load", async () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, Date.now());
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ ok: true, status: "paid_unclaimed", receipt: RECEIPT }), { status: 200 }));
    render(<PayReturnResume />);
    await screen.findByTestId("purchase-card-stub");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
  it("a signed-in visitor: nothing listens (the plain bar answers instead)", async () => {
    auth.user = { uid: "u1" };
    render(<PayReturnResume />);
    await act(async () => undefined);
    expect(fire({ kind: "paid", receipt: RECEIPT }).handled).toBe(false);
  });
});
