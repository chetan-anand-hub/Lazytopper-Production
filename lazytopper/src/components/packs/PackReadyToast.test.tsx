/**
 * PACK-READY-1 - the global toast for an ALREADY-signed-in phone account whose claim lands silently (AuthContext / Login path):
 * "Your <pack> is ready - Open My packs" (Board Pass: "Your Board Pass is on"), off /packs, dismissible, no PII in analytics.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

const track = vi.hoisted(() => ({ ready: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/packAnalytics")>()),
  trackPackReadyShown: (...a: unknown[]) => track.ready(...a),
}));

import { claimOncePerSession, resetGuestClaimSessionForTests } from "../../services/guestPay";
import { closePackReadyToastForTests, readyText, toastVisibleOn } from "./PackReadyToast";

const bundle = async () => [{ orderId: "order_1", kind: "pack" as const, sku: "pack_bundle", target: null }];
const pass = async () => [{ orderId: "order_2", kind: "pass" as const, sku: "till_boards", target: null }];

beforeEach(() => {
  resetGuestClaimSessionForTests();
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

  it("a Board Pass claim says 'Your Board Pass is on' and has no pack link", async () => {
    await claimOncePerSession("u1", { claim: pass });
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
