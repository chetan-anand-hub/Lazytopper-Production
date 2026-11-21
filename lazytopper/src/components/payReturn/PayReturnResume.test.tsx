/**
 * PAY-RETURN-1 - the resume banner: load / pageshow / visibility trigger it, paid shows the EXISTING purchase card + GST block, failed
 * offers Try again (+ the in-app rescue at once), pending says so and keeps the note, signed-in / killed / sheet-open render nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding, trackNamedEvent: vi.fn() };
});
vi.mock("../checkoutWho/PurchaseCard", () => ({
  default: (p: { proof: { orderId: string; paymentId: string; signature: string }; onHide?: () => void }) => (
    <div data-testid="purchase-card-stub" data-order={p.proof.orderId} data-sig={p.proof.signature}>
      <button type="button" data-testid="stub-hide" onClick={() => p.onHide?.()}>hide</button>
    </div>
  ),
}));
vi.mock("../gstInvoice/PostPayGst", () => ({ default: (p: { target: { kind: string } }) => <div data-testid="gst-stub" data-kind={p.target.kind} /> }));

import PayReturnResume, { tryAgainHref } from "./PayReturnResume";
import PayReturnHint from "./PayReturnHint";
import { PAY_RETURN_CHECKING, PAY_RETURN_FAILED, PAY_RETURN_HINT, PAY_RETURN_PENDING, PAY_RETURN_PENDING_FINAL, PENDING_STORE_KEY, beginPendingCheckout, readPendingOrders, rememberPendingOrder, resetPayReturnForTests } from "../../services/payReturn";
import { readReceiptProof } from "../../services/paidReceiptProof";

const PROOF = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const ITEM = { kind: "pack" as const, sku: "pack_cbq", target: "maths" };
const RECEIPT = { orderId: "order_A", paymentId: "pay_A", signature: "ab12" };
const ANSWER = {
  paid: { ok: true, status: "paid_unclaimed", receipt: RECEIPT },
  failed: { ok: true, status: "failed", reason: "payment_timed_out" },
  pending: { ok: true, status: "pending", reason: "in_progress" },
};
let fetchSpy: MockInstance<typeof fetch>;
const answer = (...bodies: unknown[]) => {
  fetchSpy.mockReset();
  for (const b of bodies.slice(0, -1)) fetchSpy.mockImplementationOnce(async () => new Response(JSON.stringify(b), { status: 200 }));
  fetchSpy.mockImplementation(async () => new Response(JSON.stringify(bodies[bodies.length - 1]), { status: 200 }));
};
const note = () => rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, Date.now());

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetPayReturnForTests();
  onboarding.mockReset();
  fetchSpy = vi.spyOn(globalThis, "fetch");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PAY-RETURN-1 PayReturnResume", () => {
  it("no note: renders nothing and asks nothing", async () => {
    render(<PayReturnResume />);
    await act(async () => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pay-return-paid")).toBeNull();
  });

  it("PAID on load: the existing purchase card with the server's receipt proof + the GST block; receipt kept for this tab; note dropped; event fired (vendor + host only)", async () => {
    note();
    answer(ANSWER.paid);
    render(<PayReturnResume />);
    const card = await screen.findByTestId("purchase-card-stub");
    expect(card.getAttribute("data-order")).toBe("order_A");
    expect(card.getAttribute("data-sig")).toBe("ab12");
    expect(screen.getByTestId("gst-stub").getAttribute("data-kind")).toBe("guest");
    expect(readReceiptProof()).toEqual(RECEIPT);
    expect(readPendingOrders()).toEqual([]);
    expect(onboarding).toHaveBeenCalledWith("pay_return_resume_paid", { host: "other", in_app: "none" });
    // Hide clears the stored proof, like the restored card
    fireEvent.click(screen.getByTestId("stub-hide"));
    expect(screen.queryByTestId("pay-return-paid")).toBeNull();
    expect(readReceiptProof()).toBeNull();
  });

  it("shows 'Checking your payment…' while it asks", async () => {
    note();
    let release: (r: Response) => void = () => undefined;
    fetchSpy.mockImplementation(() => new Promise<Response>((r) => { release = r; }));
    render(<PayReturnResume />);
    expect(await screen.findByText(PAY_RETURN_CHECKING)).toBeTruthy();
    await act(async () => release(new Response(JSON.stringify(ANSWER.paid), { status: 200 })));
    expect(await screen.findByTestId("purchase-card-stub")).toBeTruthy();
  });

  it("FAILED: 'Your payment didn't complete.' + Try again reopening the SAME checkout via ?buy= (same page, query kept) + Dismiss; the note is gone", async () => {
    note();
    window.history.pushState({}, "", "/packs?utm_source=instagram&fbclid=zz");
    answer(ANSWER.failed);
    render(<PayReturnResume />);
    expect(await screen.findByText(PAY_RETURN_FAILED)).toBeTruthy();
    const a = screen.getByTestId("pay-return-try-again") as HTMLAnchorElement;
    expect(a.getAttribute("href")).toBe("/packs?utm_source=instagram&fbclid=zz&buy=pack_cbq&t=maths");
    expect(readPendingOrders()).toEqual([]);
    expect(onboarding).toHaveBeenCalledWith("pay_return_resume_failed", { host: "other", in_app: "none" });
    fireEvent.click(screen.getByTestId("pay-return-dismiss"));
    expect(screen.queryByTestId("pay-return-failed")).toBeNull();
    window.history.pushState({}, "", "/");
  });

  it("FAILED inside Instagram: the INAPP-PAY-1 rescue actions show immediately", async () => {
    const ua = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Instagram 300.0.0.0.0 Android");
    note();
    answer(ANSWER.failed);
    render(<PayReturnResume />);
    expect(await screen.findByTestId("inapp-pay-rescue")).toBeTruthy();
    expect(screen.getByTestId("pay-rescue-open-chrome")).toBeTruthy();
    expect(onboarding).toHaveBeenCalledWith("pay_return_resume_failed", { host: "other", in_app: "instagram" });
    ua.mockRestore();
  });

  it("PENDING after the short poll: 'Checking your payment… it will show here within a few minutes', the note stays; a later visibility change resumes it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    note();
    answer(ANSWER.pending);
    render(<PayReturnResume />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });
    expect(await screen.findByText(PAY_RETURN_PENDING)).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(readPendingOrders()).toHaveLength(1);
    expect(onboarding).toHaveBeenCalledWith("pay_return_resume_pending", { host: "other", in_app: "none" });
    // the money arrives; the buyer switches back to the tab
    answer(ANSWER.paid);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await act(async () => {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await screen.findByTestId("purchase-card-stub")).toBeTruthy();
  });

  it("PENDING re-checks every 30 s with ONE call each, stops after 10 re-checks even though each flips the view to checking and back, then shows the final line", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    note();
    answer(ANSWER.pending);
    render(<PayReturnResume />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });
    expect(await screen.findByText(PAY_RETURN_PENDING)).toBeTruthy();
    const pendings = () => onboarding.mock.calls.filter((c: unknown[]) => c[0] === "pay_return_resume_pending").length;
    expect(pendings()).toBe(1);
    const firstFetches = fetchSpy.mock.calls.length;
    // One second per act(), so each re-check's "checking" view really renders between "pending"s, as it does in a browser
    // (a single long act() batches checking -> pending into one render and hides the effect re-run this test is about).
    const tick = async (seconds: number) => {
      for (let i = 0; i < seconds; i += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }
    };
    await tick(45);
    expect(pendings()).toBe(2);
    // 15 minutes, well past 10 re-checks (each 30 s apart, one call each) but inside the 30-minute note TTL
    await tick(900);
    expect(pendings()).toBe(11);
    // review N1: each slow re-check is ONE status call, so a stuck page costs 3 + 10 calls, far inside the per-order budget
    expect(fetchSpy.mock.calls.length).toBe(firstFetches + 10);
    // review N2: once nothing is checking any more, the page says so
    expect(screen.getByText(PAY_RETURN_PENDING_FINAL)).toBeTruthy();
    expect(screen.queryByText(PAY_RETURN_PENDING)).toBeNull();
  });

  it("a page opened with no note, then a real pending return, shows the CHECKING line (not the final line); after the note expires it shows the final line", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PayReturnResume />);
    await act(async () => undefined);
    // a tab switch BEFORE paying: a check runs with no note while the page is idle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    note();
    answer(ANSWER.pending);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(11_000);
    });
    expect(await screen.findByText(PAY_RETURN_PENDING)).toBeTruthy();
    expect(screen.queryByText(PAY_RETURN_PENDING_FINAL)).toBeNull();
    // the note goes away (expiry / another tab); the next re-check finds nothing to check
    window.localStorage.removeItem(PENDING_STORE_KEY);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    expect(screen.getByText(PAY_RETURN_PENDING_FINAL)).toBeTruthy();
  });

  it("pageshow (a bfcache / reload return) resumes too", async () => {
    render(<PayReturnResume />);
    await act(async () => undefined);
    note();
    answer(ANSWER.paid);
    await act(async () => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(await screen.findByTestId("purchase-card-stub")).toBeTruthy();
  });

  it("no resume while a Razorpay sheet is open in this page", async () => {
    note();
    answer(ANSWER.paid);
    const open = beginPendingCheckout({ orderId: "order_B" }, ITEM, false);
    render(<PayReturnResume />);
    await act(async () => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    open.settle();
  });

  it("an expired note (30 min) is not asked about", async () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, Date.now() - 31 * 60 * 1000);
    answer(ANSWER.paid);
    render(<PayReturnResume />);
    await act(async () => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(PENDING_STORE_KEY)).toBeNull();
  });

  it("signed-in or still-loading visitor: nothing, no request", async () => {
    note();
    answer(ANSWER.paid);
    auth.user = { uid: "u1" };
    render(<PayReturnResume />);
    await act(async () => undefined);
    cleanup();
    auth.user = null;
    auth.loading = true;
    render(<PayReturnResume />);
    await act(async () => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readPendingOrders()).toHaveLength(1);
  });

  it("kill switch VITE_PAY_RETURN_DISABLED=1: nothing rendered, nothing asked", async () => {
    note();
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    answer(ANSWER.paid);
    render(<PayReturnResume />);
    await act(async () => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pay-return-paid")).toBeNull();
  });

  it("two mounts on one page (the restored card + the shop): ONE asks and ONE renders", async () => {
    note();
    answer(ANSWER.paid);
    render(
      <>
        <PayReturnResume />
        <PayReturnResume />
      </>,
    );
    await waitFor(() => expect(screen.getAllByTestId("purchase-card-stub")).toHaveLength(1));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("tryAgainHref: the pass reopens via /board-pass?buy=board_pass; nothing external", () => {
    const entry = { orderId: "order_A", proof: PROOF, host: "pricing", buy: { kind: "pass" as const }, startedAt: 1 };
    expect(tryAgainHref(entry, "https://www.lazytopper.com/for-parents?utm_source=ig")).toBe("/board-pass?utm_source=ig&buy=board_pass");
    expect(tryAgainHref(entry, "javascript:alert(1)")).toBeNull();
  });
});

describe("PAY-RETURN-1 PayReturnHint", () => {
  it("one line, only inside an in-app browser", () => {
    render(<PayReturnHint inApp />);
    expect(screen.getByTestId("pay-return-hint").textContent).toBe(PAY_RETURN_HINT);
    cleanup();
    render(<PayReturnHint inApp={false} />);
    expect(screen.queryByTestId("pay-return-hint")).toBeNull();
  });
  it("detects the in-app browser itself (Instagram UA) and is silent in a normal browser", () => {
    const ua = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0.0.0");
    render(<PayReturnHint />);
    expect(screen.getByTestId("pay-return-hint")).toBeTruthy();
    cleanup();
    ua.mockReturnValue("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
    render(<PayReturnHint />);
    expect(screen.queryByTestId("pay-return-hint")).toBeNull();
    ua.mockRestore();
  });
  it("kill switch: silent even in-app", () => {
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    render(<PayReturnHint inApp />);
    expect(screen.queryByTestId("pay-return-hint")).toBeNull();
  });
  it("the hint copy has no 'AI' and names the way out", () => {
    expect(PAY_RETURN_HINT).toBe("Paying inside an app (Instagram, Facebook, YouTube)? If GPay doesn't open, tap ⋮ → Open in Chrome.");
    expect(/\bAI\b/.test(PAY_RETURN_HINT)).toBe(false);
  });
});
