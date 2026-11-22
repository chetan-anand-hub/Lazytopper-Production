// UNPAID-ORDERS-LIST-1 — the "Ordered, not paid" admin card.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import UnpaidOrdersCard from "./UnpaidOrdersCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const T = Date.parse("2026-11-22T10:00:00Z");
const masked = {
  orderId: "order_m", createdAtMs: T, product: { name: "Maths Mock Pack", passType: "pack_mock", packTarget: "maths" }, amountInr: 117,
  buyerType: "guest", consent: false, contacts: [{ kind: "phone", source: "checkout", masked: "+91 98•••••948" }],
};
const full = {
  orderId: "order_f", createdAtMs: T - 3600000, product: { name: "Board Pass", passType: "till_boards", packTarget: null }, amountInr: 1917,
  buyerType: "signed_in", consent: true,
  contacts: [{ kind: "email", source: "account", masked: "me••••@gmail.com" }, { kind: "phone", source: "whatsapp", masked: "+91 70•••••678", full: "+917012345678" }],
};
const body = (over = {}) => ({ ok: true, days: 1, sinceMs: T - 86400000, generatedAtMs: T, items: [masked, full], hiddenPaidLater: 2, excludedAdminTest: 1, truncated: false, ...over });

describe("UnpaidOrdersCard", () => {
  it("loads the 24 h list with the admin token; masked rows show masks only, consented rows show only the WhatsApp number in full", async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true, status: 200, json: async () => body() }));
    vi.stubGlobal("fetch", fetchMock);
    render(<UnpaidOrdersCard getToken={async () => "tok"} />);
    expect(fetchMock).not.toHaveBeenCalled(); // loads on request only
    fireEvent.click(screen.getByTestId("uo-24h"));
    await waitFor(() => expect(screen.getByTestId("uo-table")).toBeTruthy());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/unpaid-orders");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: "Bearer tok" } });
    expect(screen.getByTestId("uo-contact-order_m").textContent).toBe("+91 98•••••948 (checkout)");
    expect(screen.getByTestId("uo-consent-order_m").textContent).toBe("✗");
    expect(screen.getByTestId("uo-contact-order_f").textContent).toBe("me••••@gmail.com (account)+917012345678 (WhatsApp)");
    expect(screen.getByTestId("uo-consent-order_f").textContent).toBe("✓");
    expect(screen.getByTestId("uo-row-order_m").textContent).toContain("Maths Mock Pack");
    expect(screen.getByTestId("uo-row-order_m").textContent).toContain("pack_mock:maths");
    expect(screen.getByTestId("uo-row-order_m").textContent).toContain("₹117");
    expect(screen.getByTestId("uo-row-order_m").textContent).toContain("Guest (signed out)");
    expect(screen.getByTestId("uo-hidden").textContent).toContain("2 hidden");
    // Read-only: no export / download / email control.
    expect(screen.queryByText(/export|download|csv|email this/i)).toBeNull();
  });

  it("the 7-day toggle asks for ?days=7", async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true, status: 200, json: async () => body() }));
    vi.stubGlobal("fetch", fetchMock);
    render(<UnpaidOrdersCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("uo-24h"));
    await waitFor(() => expect(screen.getByTestId("uo-table")).toBeTruthy());
    fireEvent.click(screen.getByTestId("uo-7d"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/unpaid-orders?days=7");
    await waitFor(() => expect(screen.getByText(/Ordered, not paid \(last 7 days\)/)).toBeTruthy());
  });

  it("kill switch: a 404 hides the whole section", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ ok: false }) })));
    const { container } = render(<UnpaidOrdersCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("uo-24h"));
    await waitFor(() => expect(container.querySelector('[data-testid="unpaid-orders"]')).toBeNull());
  });

  it("an empty list and a failed read each say so", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => body({ items: [], hiddenPaidLater: 0 }) })));
    const r = render(<UnpaidOrdersCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("uo-24h"));
    await waitFor(() => expect(screen.getByTestId("uo-empty")).toBeTruthy());
    r.unmount();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<UnpaidOrdersCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("uo-24h"));
    await waitFor(() => expect(screen.getByTestId("uo-failed")).toBeTruthy());
  });

  it("the card never unmasks on its own: it renders `full` only as the server sent it", () => {
    const src = readFileSync(path.join(process.cwd(), "src", "pages", "admin", "UnpaidOrdersCard.tsx"), "utf8");
    expect(src).toMatch(/c\.full \?\? c\.masked/);
    expect(src).not.toMatch(/style=\{\{/);
    expect(src).not.toMatch(/localStorage|navigator\.clipboard|mailto:/);
  });
});
