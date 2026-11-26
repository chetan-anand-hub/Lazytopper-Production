/** PARENT-PAY-FIRST-1 - the signed-out panel, per product. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});

import ParentForwardGuest from "./ParentForwardGuest";
import { PARENT_FORWARD_LABEL, PARENT_FORWARD_QR_LABEL } from "./parentForward";

const ITEMS = [
  { product: "board_pass", item: { kind: "pass" as const, sku: "till_boards", label: "Board Pass" } },
  { product: "test_series", item: { kind: "pack" as const, sku: "test_series", label: "Test Series" } },
  { product: "pack", item: { kind: "pack" as const, sku: "pack_chapter", target: "jemh108", label: "Chapter Pack" } },
];

beforeEach(() => onboarding.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe.each(ITEMS)("guest hand-off · $product", ({ product, item }) => {
  it("shows once, leads with WhatsApp, and sends the tagged product page with no price", () => {
    const open = vi.fn(() => ({ opener: null }));
    render(<ParentForwardGuest item={item} flow="attach" origin="https://www.lazytopper.com" openWindow={open} />);
    expect(onboarding).toHaveBeenCalledWith("parent_forward_shown", { signed_in: "false", product });
    const send = screen.getByTestId("parent-forward-send");
    expect(send.textContent).toBe(PARENT_FORWARD_LABEL);
    // WhatsApp first, QR second
    const btns = screen.getAllByRole("button").map((b) => b.textContent);
    expect(btns[0]).toBe(PARENT_FORWARD_LABEL);
    expect(btns[1]).toBe(PARENT_FORWARD_QR_LABEL);
    fireEvent.click(send);
    expect(onboarding).toHaveBeenCalledWith("parent_forward_clicked", { signed_in: "false", product });
    const wa = decodeURIComponent(String((open.mock.calls[0] as unknown as [string])[0]));
    expect(wa).toContain("utm_source=parent_forward");
    expect(wa).toContain(item.label);
    expect(wa).not.toContain("₹");
    expect(wa).toContain("one-time payment");
  });

  it("QR encodes the same URL and fires qr_shown", async () => {
    const makeQr = vi.fn(async () => "data:image/png;base64,AAAA");
    render(<ParentForwardGuest item={item} flow="attach" origin="https://www.lazytopper.com" makeQr={makeQr} />);
    fireEvent.click(screen.getByTestId("parent-forward-qr"));
    await waitFor(() => expect(screen.getByTestId("parent-forward-qr-panel")).toBeTruthy());
    expect((makeQr.mock.calls[0] as unknown as [string])[0]).toContain("utm_source=parent_forward");
    expect(onboarding).toHaveBeenCalledWith("parent_forward_qr_shown", { signed_in: "false", product });
  });
});

describe("guest hand-off · edges", () => {
  it("a blocked popup shows a real WhatsApp link", () => {
    render(<ParentForwardGuest item={ITEMS[0].item} flow="attach" origin="https://www.lazytopper.com" openWindow={() => null} />);
    fireEvent.click(screen.getByTestId("parent-forward-send"));
    expect(screen.getByTestId("parent-forward-wa").getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  });
  it("a QR failure says so and the WhatsApp action still stands", async () => {
    render(<ParentForwardGuest item={ITEMS[0].item} flow="attach" origin="https://x.test" makeQr={async () => { throw new Error("no"); }} />);
    fireEvent.click(screen.getByTestId("parent-forward-qr"));
    await waitFor(() => expect(screen.getByTestId("parent-forward-qr-failed")).toBeTruthy());
    expect(screen.getByTestId("parent-forward-send")).toBeTruthy();
  });
  it("kill switch: renders nothing and fires nothing", () => {
    vi.stubEnv("VITE_PARENT_PAY_FIRST_DISABLED", "1");
    const { container } = render(<ParentForwardGuest item={ITEMS[0].item} flow="attach" />);
    expect(container.innerHTML).toBe("");
    expect(onboarding).not.toHaveBeenCalled();
  });
});
