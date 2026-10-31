import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import PurchasesCard, { productLabel } from "./PurchasesCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const b = (count = 0, inr = 0) => ({ count, inr });
const win = (p = b(), k = b()) => ({ premium: p, packs: k, topups: b() });
const item = (over = {}) => ({
  orderId: "order_1", paidAtMs: 1761890000000, uid: "u1", email: "s@x.in", name: "S", passType: "pack_subject", packTarget: "maths",
  kind: "pack", amountInr: 199, channel: "student", isAdminAccount: false, ...over,
});
const resp = (items: unknown[], complete = true) => ({
  ok: true, items, totals: { last7: win(b(1, 599), b(2, 248)), last30: win(b(1, 599), b(3, 447)), excludesAdminAccounts: true, complete },
});
const stub = (body: unknown, ok = true) =>
  vi.stubGlobal("fetch", vi.fn(async (..._a: unknown[]) => ({ ok, status: ok ? 200 : 500, json: async () => body })));

describe("PurchasesCard", () => {
  it("loads on request; shows rows, totals, and the ADMIN / TEST pill only on admin accounts", async () => {
    stub(resp([item(), item({ orderId: "order_2", isAdminAccount: true, channel: "parent" })]));
    render(<PurchasesCard getToken={async () => "tok"} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-list")).toBeTruthy());
    expect(screen.getByTestId("pu-totals").textContent).toMatch(/Last 7 days:.*Premium 1 \(₹599\).*Packs 2 \(₹248\)/);
    expect(screen.getByTestId("pu-totals").textContent).toMatch(/Excludes admin/);
    expect(screen.getByTestId("pu-note").textContent).toMatch(/Refunds are not shown here/);
    expect(screen.queryByTestId("pu-admin-order_1")).toBeNull();
    expect(screen.getByTestId("pu-admin-order_2").textContent).toBe("ADMIN / TEST");
    expect(screen.getByTestId("pu-row-order_1").textContent).toMatch(/Subject Pack · Maths/);
    expect(screen.getByTestId("pu-row-order_2").textContent).toMatch(/Parent pay link/);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ headers: { Authorization: "Bearer tok" } });
  });
  it("empty says 'No purchases yet.'; failure says so and can retry; incomplete totals are flagged", async () => {
    stub(resp([], false));
    const r = render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-empty").textContent).toBe("No purchases yet."));
    expect(screen.getByTestId("pu-totals").textContent).toMatch(/May be incomplete/);
    r.unmount();
    stub({}, false);
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-failed")).toBeTruthy());
  });
  it("labels products", () => {
    expect(productLabel({ passType: "till_boards", packTarget: null })).toBe("Premium · till boards");
    expect(productLabel({ passType: "pack_bundle", packTarget: "all" })).toMatch(/Bundle/);
  });
});
