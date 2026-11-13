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
    expect(screen.getByTestId("pu-note").textContent).toMatch(/LazyTopper gives no refunds/);
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

describe("CHECKOUT-WHO-1 · the recipient line", () => {
  it("masked recipient, payer type, the uid it landed on and how, and the two-accounts note; nothing for other orders", async () => {
    const { whoLine } = await import("./PurchasesCard");
    expect(
      whoLine({
        recipient: { phoneMasked: "+91 98•••••948", emailMasked: "an••••@gmail.com" },
        payerType: "signed_in_other",
        claimedBy: "uKid",
        claimedVia: "existing_account",
        adminNote: "phone_and_email_on_different_accounts",
      }),
    ).toBe(
      "For +91 98•••••948 / an••••@gmail.com · paid by a signed-in account for someone else · on uKid (existing account) · NOTE: phone and email are two different accounts; the first-entered one got it",
    );
    expect(whoLine({ recipient: { emailMasked: "an••••@gmail.com" }, payerType: "signed_out", claimedBy: null })).toBe("For an••••@gmail.com · paid signed out");
    expect(whoLine({})).toBe("");
  });
});

describe("PAY-ACCOUNT-1 · how the purchase landed", () => {
  it("'account created at payment' vs 'existing account' vs 'account not created (waiting)', and the second-identifier note", async () => {
    const { whoLine } = await import("./PurchasesCard");
    const r = { recipient: { phoneMasked: "+91 98•••••948" }, payerType: "signed_out" as const };
    expect(whoLine({ ...r, claimedBy: "pay-0123456789abcdef01234567", claimedVia: "account_created", adminNote: null })).toBe(
      "For +91 98•••••948 · paid signed out · on pay-0123456789abcdef01234567 (account created at payment)",
    );
    expect(whoLine({ ...r, claimedBy: "uKid", claimedVia: "existing_account" })).toBe("For +91 98•••••948 · paid signed out · on uKid (existing account)");
    expect(whoLine({ ...r, claimedBy: null, adminNote: "account_not_created" })).toBe(
      "For +91 98•••••948 · paid signed out · account not created (waiting for the student's sign-in)",
    );
    expect(whoLine({ ...r, claimedBy: "uKid", claimedVia: "existing_account", adminNote: "second_identifier_not_linked" })).toContain(
      "the other was NOT linked to it",
    );
  });
});

describe("GUEST-ABANDON-1 · signed-out checkouts and unclaimed guest money", () => {
  it("abandoned guest rows show the MASKED recipient and a signed-out channel label; totals show the guest figure and its note", async () => {
    const ab = (over = {}) => ({
      orderId: "w1", createdAtMs: 1761890000000, uid: null, email: null, name: null, passType: "till_boards", packTarget: null,
      kind: "premium", amountInr: 1917, channel: "who", isAdminAccount: false,
      recipient: { phoneMasked: "+91 98•••••948", emailMasked: "an••••@gmail.com" }, payerType: "signed_out", ...over,
    });
    const base = resp([item()]);
    const withGuest = (w: ReturnType<typeof win>, c: number, i: number) => ({ ...w, guestUnclaimed: b(c, i) });
    stub({
      ...base,
      totals: { ...base.totals, last7: withGuest(base.totals.last7, 2, 1966), last30: withGuest(base.totals.last30, 2, 1966), guestUnclaimedKnown: true },
      abandoned: { items: [ab(), ab({ orderId: "g1", channel: "guest", recipient: { phoneMasked: "+91 70•••••678" } })] },
    });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned-list")).toBeTruthy());
    expect(screen.getByTestId("pu-ab-who-w1").textContent).toBe("+91 98•••••948 / an••••@gmail.com");
    expect(screen.getByTestId("pu-ab-channel-w1").textContent).toBe("Signed out · Who will use it?");
    expect(screen.getByTestId("pu-ab-who-g1").textContent).toBe("+91 70•••••678");
    expect(screen.getByTestId("pu-ab-channel-g1").textContent).toBe("Signed out · phone number");
    expect(screen.getByTestId("pu-totals").textContent).toMatch(/Last 7 days:.*Guest paid, not yet on an account 2 \(₹1,966\)/);
    expect(screen.getByTestId("pu-guest-note").textContent).toMatch(/never both/);
  });
  it("an unreadable guest figure says so; an older server shows no guest note", async () => {
    const base = resp([item()]);
    stub({ ...base, totals: { ...base.totals, guestUnclaimedKnown: false } });
    const r = render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-guest-note").textContent).toMatch(/could not be read/));
    r.unmount();
    stub(resp([item()]));
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-totals")).toBeTruthy());
    expect(screen.queryByTestId("pu-guest-note")).toBeNull();
    expect(screen.getByTestId("pu-totals").textContent).not.toMatch(/Guest paid/);
  });
});

describe("GUEST-ABANDON-1 review D4", () => {
  it("a capped guest read says so in the guest note, not as the 300-paid-orders warning", async () => {
    const base = resp([item()]);
    stub({ ...base, totals: { ...base.totals, guestUnclaimedKnown: true, guestTruncated: true } });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-guest-note").textContent).toMatch(/first 300 guest orders/));
    expect(screen.getByTestId("pu-totals").textContent).not.toMatch(/latest 300 paid orders/);
  });
});

describe("ADMIN-MOVE-1: Move to another account", () => {
  const load = async (items: unknown[]) => {
    stub(resp(items));
    render(<PurchasesCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-list")).toBeTruthy());
  };
  it("the button is on paid pack rows only (not on Premium rows)", async () => {
    await load([item(), item({ orderId: "order_p", passType: "till_boards", packTarget: null, kind: "premium" })]);
    expect(screen.getByTestId("pu-move-open-order_1")).toBeTruthy();
    expect(screen.queryByTestId("pu-move-open-order_p")).toBeNull();
  });
  it("form -> confirm shows item, MASKED holder and MASKED target; nothing is sent until Yes", async () => {
    await load([item()]);
    fireEvent.click(screen.getByTestId("pu-move-open-order_1"));
    fireEvent.change(screen.getByTestId("pu-move-input-order_1"), { target: { value: "priyapeehu06@gmail.com" } });
    fireEvent.click(screen.getByTestId("pu-move-review-order_1"));
    const t = screen.getByTestId("pu-move-confirm-order_1").textContent || "";
    expect(t).toBe("Move Subject Pack · Maths from s@••••@x.in to pr••••@gmail.com?".replace("s@••••@x.in", "s••••@x.in"));
    expect(t).not.toMatch(/priyapeehu06/);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1); // only the list load
  });
  it("Yes posts { orderId, toEmail } with the Bearer token and shows the result line", async () => {
    await load([item()]);
    fireEvent.click(screen.getByTestId("pu-move-open-order_1"));
    fireEvent.change(screen.getByTestId("pu-move-input-order_1"), { target: { value: "priyapeehu06@gmail.com" } });
    fireEvent.click(screen.getByTestId("pu-move-review-order_1"));
    stub({ ok: true, moved: true, packId: "pack_subject:maths" });
    fireEvent.click(screen.getByTestId("pu-move-yes-order_1"));
    await waitFor(() => expect(screen.getByTestId("pu-move-result-order_1").textContent).toMatch(/Moved/));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { method: string; body: string; headers: Record<string, string> }];
    expect(url).toBe("/api/admin/purchases/move");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ orderId: "order_1", toEmail: "priyapeehu06@gmail.com" });
  });
  it("a phone number is sent as toPhone; an invalid entry shows the error and never reaches confirm", async () => {
    await load([item()]);
    fireEvent.click(screen.getByTestId("pu-move-open-order_1"));
    fireEvent.change(screen.getByTestId("pu-move-input-order_1"), { target: { value: "12345" } });
    fireEvent.click(screen.getByTestId("pu-move-review-order_1"));
    expect(screen.getByTestId("pu-move-error-order_1").textContent).toMatch(/valid email/);
    fireEvent.change(screen.getByTestId("pu-move-input-order_1"), { target: { value: "96111 11555" } });
    fireEvent.click(screen.getByTestId("pu-move-review-order_1"));
    expect(screen.getByTestId("pu-move-confirm-order_1").textContent).toMatch(/to \+91 96•••••555\?$/);
    stub({ ok: true, moved: true });
    fireEvent.click(screen.getByTestId("pu-move-yes-order_1"));
    await waitFor(() => expect(screen.getByTestId("pu-move-result-order_1")).toBeTruthy());
    expect(JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toEqual({ orderId: "order_1", toPhone: "96111 11555" });
  });
  it("server errors (404 / 409) are shown as the server's words", async () => {
    await load([item()]);
    fireEvent.click(screen.getByTestId("pu-move-open-order_1"));
    fireEvent.change(screen.getByTestId("pu-move-input-order_1"), { target: { value: "ghost@gmail.com" } });
    fireEvent.click(screen.getByTestId("pu-move-review-order_1"));
    stub({ ok: false, error: "No LazyTopper account with that email/phone — ask them to sign in once first" }, false);
    fireEvent.click(screen.getByTestId("pu-move-yes-order_1"));
    await waitFor(() => expect(screen.getByTestId("pu-move-result-order_1").textContent).toMatch(/ask them to sign in once first/));
  });
});

describe("ADMIN-MOVE-1: Merge into another account", () => {
  it("shows only on rows whose account was created at payment; confirm is masked; posts { fromUid, toEmail } to the merge endpoint", async () => {
    stub(resp([item({ orderId: "o_pay", uid: "pay-2f777cbb", email: null }), item({ orderId: "o_real" })]));
    render(<PurchasesCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-list")).toBeTruthy());
    expect(screen.queryByTestId("pu-merge-open-o_real")).toBeNull();
    fireEvent.click(screen.getByTestId("pu-merge-open-o_pay"));
    fireEvent.change(screen.getByTestId("pu-merge-input-o_pay"), { target: { value: "priyapeehu06@gmail.com" } });
    fireEvent.click(screen.getByTestId("pu-merge-review-o_pay"));
    const t = screen.getByTestId("pu-merge-confirm-o_pay").textContent || "";
    expect(t).toMatch(/Merge account …777cbb into pr••••@gmail\.com\?/);
    expect(t).not.toMatch(/priyapeehu06/);
    stub({ ok: true, merged: true });
    fireEvent.click(screen.getByTestId("pu-merge-yes-o_pay"));
    await waitFor(() => expect(screen.getByTestId("pu-merge-result-o_pay").textContent).toMatch(/Merged/));
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/admin/accounts/merge");
    expect(JSON.parse(init.body)).toEqual({ fromUid: "pay-2f777cbb", toEmail: "priyapeehu06@gmail.com" });
  });
  it("shows the server's 409 reason", async () => {
    stub(resp([item({ orderId: "o_pay", uid: "pay-1" })]));
    render(<PurchasesCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-list")).toBeTruthy());
    fireEvent.click(screen.getByTestId("pu-merge-open-o_pay"));
    fireEvent.change(screen.getByTestId("pu-merge-input-o_pay"), { target: { value: "9611111555" } });
    fireEvent.click(screen.getByTestId("pu-merge-review-o_pay"));
    stub({ ok: false, error: "The target account already has a different phone number" }, false);
    fireEvent.click(screen.getByTestId("pu-merge-yes-o_pay"));
    await waitFor(() => expect(screen.getByTestId("pu-merge-result-o_pay").textContent).toMatch(/different phone/));
  });
});

describe("WHATSAPP-OPTIN-1 · WhatsApp opt-ins on the card", () => {
  const ab = (over = {}) => ({
    orderId: "order_x", createdAtMs: 1761890000000, uid: null, email: null, name: null, passType: "pack_cbq", packTarget: "maths", kind: "pack",
    amountInr: 99, channel: "who", isAdminAccount: false, recipient: {}, ...over,
  });
  const wa = { phoneMasked: "+91 98•••••948", phone: "+919876543948", consentAtMs: 1761890000000, source: "checkout" };
  it("abandoned rows with an opt-in show 'WhatsApp ✓ <masked>' with a per-row Reveal / Hide; rows without one show nothing", async () => {
    stub({ ...resp([]), abandoned: { items: [ab({ orderId: "order_wa", waOptIn: wa }), ab({ orderId: "order_no" })] } });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned-list")).toBeTruthy());
    expect(screen.getByTestId("pu-ab-wa-order_wa-text").textContent).toBe("WhatsApp ✓ +91 98•••••948");
    expect(screen.queryByTestId("pu-ab-wa-order_no")).toBeNull();
    // masked until pressed: the full number is not in the page text
    expect(document.body.textContent).not.toContain("9876543948");
    fireEvent.click(screen.getByTestId("pu-ab-wa-order_wa-toggle"));
    expect(screen.getByTestId("pu-ab-wa-order_wa-text").textContent).toBe("WhatsApp ✓ +919876543948");
    fireEvent.click(screen.getByTestId("pu-ab-wa-order_wa-toggle"));
    expect(screen.getByTestId("pu-ab-wa-order_wa-text").textContent).toBe("WhatsApp ✓ +91 98•••••948");
  });

  it("PAID rows with an opt-in show 'WhatsApp ✓ <masked>' with Reveal / Hide; paid rows without one show nothing", async () => {
    stub(resp([item({ orderId: "order_p1", waOptIn: wa }), item({ orderId: "order_p2" })]));
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-row-order_p1")).toBeTruthy());
    expect(screen.getByTestId("pu-wa-order_p1-text").textContent).toBe("WhatsApp ✓ +91 98•••••948");
    expect(screen.queryByTestId("pu-wa-order_p2")).toBeNull();
    expect(document.body.textContent).not.toContain("9876543948");
    fireEvent.click(screen.getByTestId("pu-wa-order_p1-toggle"));
    expect(screen.getByTestId("pu-wa-order_p1-text").textContent).toBe("WhatsApp ✓ +919876543948");
  });

  it("sample opt-ins: read-only list, masked + Reveal per row; empty / failed reads are honest; an older server shows nothing", async () => {
    stub({
      ...resp([]),
      waSampleOptIns: { items: [{ phoneMasked: "+91 70•••••678", phone: "+917012345678", packIds: ["pack_cbq:maths"], lastAtMs: 1761890000000, firstAtMs: 1761890000000 }, { phoneMasked: "+91 98•••••948", phone: "+919876543948", packIds: [], lastAtMs: 1761800000000, firstAtMs: null }] },
    });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-wa-samples-list")).toBeTruthy());
    expect(screen.getByTestId("pu-wa-num-0-text").textContent).toBe("WhatsApp ✓ +91 70•••••678");
    expect(document.body.textContent).not.toContain("7012345678");
    fireEvent.click(screen.getByTestId("pu-wa-num-0-toggle"));
    expect(screen.getByTestId("pu-wa-num-0-text").textContent).toBe("WhatsApp ✓ +917012345678");
    expect(screen.getByTestId("pu-wa-num-1-text").textContent).toBe("WhatsApp ✓ +91 98•••••948"); // per row
    cleanup();
    stub({ ...resp([]), waSampleOptIns: { items: [] } });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-wa-samples-empty")).toBeTruthy());
    cleanup();
    stub({ ...resp([]), waSampleOptIns: null });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-wa-samples-unavailable")).toBeTruthy());
    cleanup();
    stub({ ...resp([]) });
    render(<PurchasesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("pu-load"));
    await waitFor(() => expect(screen.getByTestId("pu-abandoned")).toBeTruthy());
    expect(screen.queryByTestId("pu-wa-samples")).toBeNull();
  });
});
