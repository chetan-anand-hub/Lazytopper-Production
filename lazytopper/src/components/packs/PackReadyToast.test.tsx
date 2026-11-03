/**
 * PACK-READY-1 - the global toast for an ALREADY-signed-in phone account whose claim lands silently (AuthContext / Login path):
 * "Your <pack> is ready - Open My packs" (Board Pass: "Your Board Pass is on"), off /packs, dismissible, no PII in analytics.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// (the subscription is mocked below: a Board Pass is announced only when the server-backed entitlement says paid)
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

const track = vi.hoisted(() => ({ ready: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/packAnalytics")>()),
  trackPackReadyShown: (...a: unknown[]) => track.ready(...a),
}));

const sub = vi.hoisted(() => ({ paid: false, hydrated: [] as Array<(u: string, s: unknown) => void> }));
vi.mock("../../services/subscriptionService", () => ({
  loadSubscription: () => ({}),
  isPaidPremium: (s: unknown) => (s as { paid?: boolean })?.paid === true || sub.paid,
  onSubscriptionHydrated: (cb: (u: string, s: unknown) => void) => {
    sub.hydrated.push(cb);
    return () => {
      sub.hydrated = sub.hydrated.filter((x) => x !== cb);
    };
  },
  whenTrialWriteSettled: async () => undefined,
}));

import { claimOncePerSession, resetGuestClaimSessionForTests } from "../../services/guestPay";
import { closePackReadyToastForTests, readyText, toastVisibleOn } from "./PackReadyToast";
import { registerReadyBanner } from "./packReadyBus";

const bundle = async () => [{ orderId: "order_1", kind: "pack" as const, sku: "pack_bundle", target: null }];
const pass = async () => [{ orderId: "order_2", kind: "pass" as const, sku: "till_boards", target: null }];

beforeEach(() => {
  resetGuestClaimSessionForTests();
  sub.paid = false;
  track.ready.mockReset();
  window.history.replaceState({}, "", "/");
});
afterEach(() => {
  cleanup();
  closePackReadyToastForTests();
});

describe("PACK-READY-1 · toast for a silent signed-in claim", () => {
  it("a claim shows 'Your <pack> is ready' with an Open My packs link to /packs#my-packs; one analytics event, no PII", async () => {
    await claimOncePerSession("u1", { claim: bundle });
    const toast = await screen.findByTestId("pack-ready-toast");
    expect(toast.textContent).toContain("Your Maths + Science Bundle is ready");
    const link = screen.getByText("Open My packs") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/packs#my-packs");
    expect(track.ready).toHaveBeenCalledTimes(1);
    expect(track.ready).toHaveBeenCalledWith("pack_bundle", "toast");
    expect(JSON.stringify(track.ready.mock.calls)).not.toMatch(/order_|\+91|\d{10}/);
  });

  it("tapping Open My packs goes in-app (pushState, no reload) and closes the toast; Dismiss closes it too", async () => {
    await claimOncePerSession("u1", { claim: bundle });
    const pop = vi.fn();
    window.addEventListener("popstate", pop);
    fireEvent.click(await screen.findByText("Open My packs"));
    expect(window.location.pathname + window.location.hash).toBe("/packs#my-packs");
    expect(pop).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId("pack-ready-toast")).toBeNull());
    window.removeEventListener("popstate", pop);

    window.history.replaceState({}, "", "/");
    resetGuestClaimSessionForTests();
    await claimOncePerSession("u1", { claim: bundle });
    fireEvent.click(await screen.findByLabelText("Dismiss"));
    expect(screen.queryByTestId("pack-ready-toast")).toBeNull();
  });

  it("a Board Pass claim is announced only after the subscription confirms it; then 'Your Board Pass is on', no pack link", async () => {
    await claimOncePerSession("u1", { claim: pass });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.queryByTestId("pack-ready-toast")).toBeNull(); // not confirmed: nothing claimed on the client's word
    expect(track.ready).not.toHaveBeenCalled();
    act(() => {
      sub.hydrated.forEach((cb) => cb("u1", { paid: true }));
    });
    const toast = await screen.findByTestId("pack-ready-toast");
    expect(toast.textContent).toContain("Your Board Pass is on");
    expect(screen.queryByText("Open My packs")).toBeNull();
    expect(track.ready).toHaveBeenCalledWith("board_pass", "toast");
  });

  it("nothing claimed -> no toast; on /packs the page's own banner is used (no toast)", async () => {
    await claimOncePerSession("u1", { claim: async () => [] });
    expect(screen.queryByTestId("pack-ready-toast")).toBeNull();
    window.history.replaceState({}, "", "/packs#my-packs");
    await claimOncePerSession("u2", { claim: bundle });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });
    expect(screen.queryByTestId("pack-ready-toast")).toBeNull();
    expect(track.ready).not.toHaveBeenCalled();
  });

  it("reaching /packs by in-app navigation closes the toast and leaks no root; fired once per claim", async () => {
    await claimOncePerSession("u1", { claim: bundle });
    await screen.findByTestId("pack-ready-toast");
    expect(track.ready).toHaveBeenCalledTimes(1);
    act(() => {
      window.history.pushState({}, "", "/practice");
    });
    await waitFor(() => expect(track.ready).toHaveBeenCalledTimes(1));
    act(() => {
      window.history.pushState({}, "", "/packs#my-packs");
    });
    await waitFor(() => expect(document.querySelector("[data-pack-ready-host]")).toBeNull());
    expect(screen.queryByTestId("pack-ready-toast")).toBeNull();
    expect(track.ready).toHaveBeenCalledTimes(1);
  });

  it("hides while a PacksShop banner is mounted and comes back (without a second analytics event) when it goes", async () => {
    await claimOncePerSession("u1", { claim: bundle });
    await screen.findByTestId("pack-ready-toast");
    expect(track.ready).toHaveBeenCalledTimes(1);
    let off: () => void = () => undefined;
    act(() => {
      off = registerReadyBanner();
    });
    await waitFor(() => expect(screen.queryByTestId("pack-ready-toast")).toBeNull());
    act(() => off());
    expect(await screen.findByTestId("pack-ready-toast")).toBeTruthy();
    expect(track.ready).toHaveBeenCalledTimes(1);
  });

  it("history is restored when the toast closes", async () => {
    const before = window.history.pushState;
    await claimOncePerSession("u1", { claim: bundle });
    await screen.findByTestId("pack-ready-toast");
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(window.history.pushState).toBe(before);
  });

  it("pure helpers: text and where the toast may show", () => {
    expect(readyText([{ kind: "pack", sku: "pack_chapter", target: "trigonometry", name: "Chapter Pack" }])).toBe("Your Chapter Pack · Trigonometry (Ch 8 + Ch 9) is ready");
    expect(readyText([{ kind: "pack", sku: "pack_bundle", target: null, name: "Maths + Science Bundle" }, { kind: "pack", sku: "pack_mock", target: "maths", name: "Mock Pack" }])).toBe("Your Maths + Science Bundle and 1 more pack are ready");
    expect(toastVisibleOn("/")).toBe(true);
    expect(toastVisibleOn("/practice")).toBe(true);
    expect(toastVisibleOn("/pricing")).toBe(true);
    expect(toastVisibleOn("/packs")).toBe(false);
    expect(toastVisibleOn("/login")).toBe(false);
  });
});
