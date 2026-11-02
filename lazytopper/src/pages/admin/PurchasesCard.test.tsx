import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import PurchasesCard, { abandonedReason, productLabel } from "./PurchasesCard";

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
    // every row has the same cells (the flag cell is always rendered), so columns line up
    expect(screen.getByTestId("pu-row-order_1").children.length).toBe(screen.getByTestId("pu-row-order_2").children.length);
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
  it("CHECKOUT-1: lists abandoned checkouts read-only, with email, product, rupees, IST time and the ADMIN / TEST pill", async () => {
    const ab = (over = {}) => ({
      orderId: "ab_1", createdAtMs: 1761890000000, uid: "u9", email: "kid@x.in", name: null, passType: "till_boards", packTarget: null,
      kind: "premium", amountInr: 1917, channel: "student", isAdminAccount: false, ...over,
    });
    stub({ ...resp([item()]), abandoned: { items: [ab(), ab({ orderId: "ab_2", isAdminAccount: true, passType: "month", amountInr: 599 })] } });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned-list")).toBeTruthy());
    const row = screen.getByTestId("pu-ab-row-ab_1").textContent || "";
    expect(row).toMatch(/kid@x\.in/);
    expect(row).toMatch(/Premium · till boards/);
    expect(row).toMatch(/₹1,917/);
    expect(screen.queryByTestId("pu-ab-admin-ab_1")).toBeNull();
    expect(screen.getByTestId("pu-ab-admin-ab_2").textContent).toBe("ADMIN / TEST");
    // read-only: one GET, no buttons inside the abandoned list
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(screen.getByTestId("pu-abandoned-list").querySelectorAll("button").length).toBe(0);
  });
  it("CHECKOUT-1: abandoned empty / unavailable are honest", async () => {
    stub({ ...resp([item()]), abandoned: { items: [] } });
    const r = render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned-empty").textContent).toBe("No abandoned checkouts."));
    r.unmount();
    stub({ ...resp([item()]), abandoned: null });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned-unavailable")).toBeTruthy());
  });
});

describe("PAY-RESCUE-1 · abandoned checkouts show why", () => {
  const ab = (over = {}) => ({
    orderId: "order_a", createdAtMs: 1761890000000, uid: "u1", email: "s@x.in", name: "S", passType: "till_boards", packTarget: null,
    kind: "premium", amountInr: 1917, channel: "student", isAdminAccount: false, ...over,
  });
  it("abandonedReason: the stored Razorpay reason, else 'No payment attempted'", () => {
    expect(abandonedReason({})).toBe("No payment attempted");
    expect(abandonedReason({ attempted: false, lastFailure: null })).toBe("No payment attempted");
    expect(abandonedReason({ attempted: true, lastFailure: { code: "BAD_REQUEST_ERROR", reason: "payment_timeout", source: "customer", step: "payment_authorization", atMs: 1 } })).toBe(
      "Payment failed: payment_timeout",
    );
    expect(abandonedReason({ attempted: true, lastFailure: { code: "", reason: "", source: "", step: "", atMs: null } })).toBe("Payment failed");
  });
  it("renders the reason on each abandoned row", async () => {
    stub({
      ...resp([]),
      abandoned: {
        items: [
          ab({ orderId: "order_f", attempted: true, lastFailure: { code: "X", reason: "payment_timeout", source: "customer", step: "s", atMs: 1 } }),
          ab({ orderId: "order_n", attempted: false, lastFailure: null }),
          ab({ orderId: "order_old" }),
        ],
      },
    });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned-list")).toBeTruthy());
    expect(screen.getByTestId("pu-ab-reason-order_f").textContent).toBe("Payment failed: payment_timeout");
    expect(screen.getByTestId("pu-ab-reason-order_n").textContent).toBe("No payment attempted");
    expect(screen.getByTestId("pu-ab-reason-order_old").textContent).toBe("No payment attempted");
  });
});

describe("PAY-PHONE-1 · unclaimed guest payments", () => {
  it("lists masked phone, product, amount, payment id and age; empty and failed reads are honest; an older server shows nothing", async () => {
    const { UnclaimedGuestList, ageLabel } = await import("./PurchasesCard");
    const { render: r, screen: s, cleanup: c } = await import("@testing-library/react");
    r(
      <UnclaimedGuestList
        unclaimed={{
          items: [{ orderId: "o1", paymentId: "pay_1", phoneMasked: "+91 98•••••948", passType: "pack_mock", packTarget: "maths", kind: "pack", amountInr: 99, paidAtMs: 1, ageHours: 3 }],
        }}
      />,
    );
    const row = s.getByTestId("pu-uc-row-o1").textContent || "";
    expect(row).toContain("+91 98•••••948");
    expect(row).toContain("pay_1");
    expect(row).toContain("₹99");
    expect(row).toContain("3 h");
    c();
    r(<UnclaimedGuestList unclaimed={{ items: [] }} />);
    expect(s.getByTestId("pu-unclaimed-empty")).toBeTruthy();
    c();
    r(<UnclaimedGuestList unclaimed={null} />);
    expect(s.getByTestId("pu-unclaimed-unavailable")).toBeTruthy();
    c();
    const { container } = r(<UnclaimedGuestList unclaimed={undefined} />);
    expect(container.innerHTML).toBe("");
    expect(ageLabel(50)).toBe("2 d");
  });
});

describe("PAY-PHONE-1 review · phone payments that need the owner", () => {
  it("shows state, masked phone, payment id and reason", async () => {
    const { GuestAttentionList } = await import("./PurchasesCard");
    render(
      <GuestAttentionList
        attention={{
          items: [
            { orderId: "f1", state: "claimed, grant failed", reason: "grant_failed", paymentId: "pay_f1", phoneMasked: "+91 98•••••948", passType: "pack_mock", packTarget: "maths", kind: "pack", amountInr: 99, paidAtMs: 1, ageHours: 2 },
            { orderId: "e1", state: "Paid, account erased before sign-in", reason: null, paymentId: "pay_e1", phoneMasked: "", passType: "till_boards", packTarget: null, kind: "premium", amountInr: 1917, paidAtMs: 1, ageHours: 9 },
          ],
        }}
      />,
    );
    const f1 = screen.getByTestId("pu-at-row-f1").textContent || "";
    expect(f1).toContain("claimed, grant failed");
    expect(f1).toContain("+91 98•••••948");
    expect(f1).toContain("pay_f1");
    expect(screen.getByTestId("pu-at-row-e1").textContent).toContain("number erased");
  });
});
