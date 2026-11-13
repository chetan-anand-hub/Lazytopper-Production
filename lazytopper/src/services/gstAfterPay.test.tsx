/**
 * GST-AFTER-PAY-1 (owner 13 Nov 2026): the state + PIN is asked AFTER payment, never before Razorpay.
 *  - every order function sends its order straight away: no "Your state" dialog, no state-context request, no `gstBuyer` in the body
 *    (the VITE_GST_STATE_FIELD flag is ON here, which is what used to open the dialog);
 *  - saveGstDetails: the right endpoint, body and auth per buyer kind, and quiet results;
 *  - PostPayGst: validation, the pre-fill, Save, and that it renders nothing with the flag off.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("./firebaseClient", () => ({
  authClient: { currentUser: { uid: "u1", getIdToken: async () => "tok" }, onAuthStateChanged: () => () => {} },
  firestoreDb: null,
  app: null,
}));

import { createGuestOrder } from "./guestPay";
import { createPayOrder, createPackOrder } from "./checkout";
import { createSelfOrder, createWhoOrder } from "./checkoutWho";
import { createParentPackOrder } from "./parentPayPack";
import { createParentOrder } from "./parentPay";
import { saveGstDetails, gstAfterPayError, GST_GUEST_DETAILS_ENDPOINT, GST_ORDER_DETAILS_ENDPOINT } from "./gstAfterPay";
import PostPayGst from "../components/gstInvoice/PostPayGst";

const PROOF = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };
let calls: Array<{ url: string; init: RequestInit }>;
const answer = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  calls = [];
  vi.stubEnv("VITE_GST_STATE_FIELD", "1");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return answer({ ok: false });
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/*
 * THE CALLER TABLE (coordinator ruling, 13 Nov): a caller may leave the state + PIN out of the pre-pay ONLY from a host that mounts the
 * paid-screen block (PostPayGst). Every other caller keeps the pre-pay "Your state" dialog, so no order is left without invoice details.
 */
const POST_PAY_HOSTS: Array<[string, () => Promise<unknown>]> = [
  ["CheckoutSheet attach/paid: signed-out who-order (createWhoOrder)", () => createWhoOrder({ kind: "pass", sku: "till_boards", target: null } as never, { phone: "9876543210" } as never, false)],
  ["CheckoutSheet paid: signed-in who-order (createWhoOrder)", () => createWhoOrder({ kind: "pass", sku: "till_boards", target: null } as never, { phone: "9876543210" } as never, true)],
  ["CheckoutSheet attach/paidSelf: self order (createSelfOrder)", () => createSelfOrder({ kind: "pass", sku: "till_boards", target: null } as never)],
  ["PaidSheet with an order id: Board Pass (createPayOrder postPay)", () => createPayOrder("till_boards", { postPay: true })],
  ["ParentPayPanel paid / pending screen: parent-pay pass link (createParentOrder)", () => createParentOrder("tok123", "till_boards" as never)],
  ["ParentPayPanel paid / pending screen: parent-pay pack link (createParentPackOrder)", () => createParentPackOrder("tok123")],
  ["PaidSheet with an order id: pack (createPackOrder postPay)", () => createPackOrder("pack_bundle", undefined, { postPay: true })],
];
const PRE_PAY_HOSTS: Array<[string, () => Promise<unknown>]> = [
  ["GuestPaySheet pay-by-phone (createGuestOrder)", () => createGuestOrder({ kind: "pass", sku: "till_boards", target: null } as never, "9876543210")],
  ["month pass / any host without the block (createPayOrder default)", () => createPayOrder("till_month" as never)],
  ["inline paid view / sheet off (createPackOrder default)", () => createPackOrder("pack_bundle")],
];

describe("GST caller table: post-pay only from a host that mounts the block (flag ON)", () => {
  const body = (c: { init: RequestInit }) => JSON.parse(String(c.init.body)) as Record<string, unknown>;
  it.each(POST_PAY_HOSTS)("%s: the order goes out at once with no gstBuyer; no dialog, no context request", async (_name, run) => {
    await run().catch(() => undefined);
    const order = calls.find((c) => /\/api\/(pay|parent)/.test(c.url) && c.init.method === "POST");
    expect(order).toBeTruthy();
    expect("gstBuyer" in body(order!)).toBe(false);
    expect(calls.some((c) => c.url.includes("/api/gst/checkout-context"))).toBe(false);
    expect(document.querySelector(".lt-gst")).toBeNull();
  });
  it.each(PRE_PAY_HOSTS)("%s: keeps the pre-pay dialog (it opens first; the order request waits)", async (_name, run) => {
    void run().catch(() => undefined);
    await waitFor(() => expect(document.querySelector(".lt-gst")).not.toBeNull());
    expect(calls.some((c) => /\/api\/(pay|parent)/.test(c.url) && c.init.method === "POST")).toBe(false);
  });

  it("every call site of the door in src/ is in this table: the files that pass { postPay: true } are exactly the proven hosts", () => {
    const root = path.resolve(__dirname, "..");
    const hits: Record<string, number> = {};
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) {
          const src = fs.readFileSync(f, "utf8");
          const n = (src.match(/postPay: true/g) ?? []).length;
          if (n > 0) hits[path.relative(root, f).split(path.sep).join("/")] = n;
        }
      }
    };
    walk(root);
    expect(Object.keys(hits).sort()).toEqual([
      "components/packs/PacksShop.tsx",
      "components/pricing/PassCheckout.tsx",
      "services/checkoutWho.ts",
      "services/parentPay.ts",
      "services/parentPayPack.ts",
      "services/packs.ts",
    ].concat(["services/gstBuyerOrder.ts"]).sort()); // (gstBuyerOrder.ts: the door's own doc comment)
    // the door's other caller (guest pay-by-phone) never passes it
    for (const f of ["services/guestPay.ts"]) {
      expect(fs.readFileSync(path.join(root, f), "utf8")).not.toMatch(/postPay/);
    }
  });
});

describe("PostPayGst", () => {
  it("renders nothing and asks nothing with the flag off", async () => {
    vi.stubEnv("VITE_GST_STATE_FIELD", "");
    const { container } = render(<PostPayGst target={{ kind: "guest", proof: PROOF }} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe("");
    expect(calls.length).toBe(0);
  });

  it("an empty / bad form shows the message and sends nothing; a good one Saves once and says so", async () => {
    const save = vi.fn(async () => ({ status: "saved" as const, invoiced: false }));
    render(<PostPayGst target={{ kind: "guest", proof: PROOF }} saveImpl={save as never} />);
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    expect(screen.getByTestId("postpay-gst-error").textContent).toBe("Choose your state.");
    fireEvent.change(screen.getByTestId("postpay-gst-state"), { target: { value: "29" } });
    fireEvent.change(screen.getByTestId("postpay-gst-pin"), { target: { value: "56" } });
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    expect(screen.getByTestId("postpay-gst-error").textContent).toBe("PIN code must be 6 digits.");
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("postpay-gst-pin"), { target: { value: "560001" } });
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    await waitFor(() => expect(screen.getByTestId("postpay-gst-saved")).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ kind: "guest", proof: PROOF }, { stateCode: "29", pin: "560001" });
  });

  it("pre-fills an empty form from the IP region's state (a hint the buyer sees), never a default state", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return answer({ ok: true, ipStateCode: "32", remembered: null });
    });
    render(<PostPayGst target={{ kind: "guest", proof: PROOF }} saveImpl={vi.fn() as never} />);
    await waitFor(() => expect((screen.getByTestId("postpay-gst-state") as HTMLSelectElement).value).toBe("32"));
    expect((screen.getByTestId("postpay-gst-pin") as HTMLInputElement).value).toBe("");
  });

  it("a state with no IP hint starts unselected; expired and failed are worded, and 'failed' can be retried", async () => {
    const save = vi.fn().mockResolvedValueOnce({ status: "failed" }).mockResolvedValueOnce({ status: "expired" });
    render(<PostPayGst target={{ kind: "guest", proof: PROOF }} saveImpl={save as never} />);
    expect((screen.getByTestId("postpay-gst-state") as HTMLSelectElement).value).toBe("");
    fireEvent.change(screen.getByTestId("postpay-gst-state"), { target: { value: "27" } });
    fireEvent.change(screen.getByTestId("postpay-gst-pin"), { target: { value: "400001" } });
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    await waitFor(() => expect(screen.getByTestId("postpay-gst-error").textContent).toBe("That did not save. Try again."));
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    await waitFor(() => expect(screen.getByTestId("postpay-gst-expired")).toBeTruthy());
  });

  const rememberedFetch = () =>
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return answer({ ok: true, ipStateCode: null, remembered: { stateCode: "29", pin: "560001" } });
    });

  it("a signed-in buyer with a remembered state + PIN is sent it ONCE after payment, no tap, and sees 'Saved ✓ · Change'", async () => {
    rememberedFetch();
    const save = vi.fn(async () => ({ status: "saved" as const, invoiced: false }));
    render(<PostPayGst target={{ kind: "account", orderId: "order_1" }} saveImpl={save as never} />);
    await waitFor(() => expect(screen.getByTestId("postpay-gst-saved")).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ kind: "account", orderId: "order_1" }, { stateCode: "29", pin: "560001" });
    expect(screen.getByTestId("postpay-gst-saved").textContent).toBe("Saved ✓ · Change");
    fireEvent.click(screen.getByTestId("postpay-gst-change"));
    expect((screen.getByTestId("postpay-gst-state") as HTMLSelectElement).value).toBe("29");
  });

  it("no 'Change' once the invoice is already issued (it could not take effect)", async () => {
    rememberedFetch();
    const save = vi.fn(async () => ({ status: "saved" as const, invoiced: true }));
    render(<PostPayGst target={{ kind: "account", orderId: "order_1" }} saveImpl={save as never} />);
    await waitFor(() => expect(screen.getByTestId("postpay-gst-saved")).toBeTruthy());
    expect(screen.queryByTestId("postpay-gst-change")).toBeNull();
  });

  it("an auto-send that fails leaves the pre-filled form for one tap; a guest never auto-sends", async () => {
    rememberedFetch();
    const save = vi.fn(async () => ({ status: "failed" as const }));
    render(<PostPayGst target={{ kind: "account", orderId: "order_1" }} saveImpl={save as never} />);
    await waitFor(() => expect(screen.getByTestId("postpay-gst-save")).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(1);
    cleanup();
    const save2 = vi.fn();
    render(<PostPayGst target={{ kind: "guest", proof: PROOF }} saveImpl={save2 as never} />);
    await waitFor(() => expect((screen.getByTestId("postpay-gst-state") as HTMLSelectElement).value).toBe("29"));
    expect(save2).not.toHaveBeenCalled();
  });

  it("not_paid: shows 'Confirming your payment…', tries again, and saves when the payment is recorded", async () => {
    const save = vi.fn().mockResolvedValueOnce({ status: "not_paid" }).mockResolvedValueOnce({ status: "not_paid" }).mockResolvedValueOnce({ status: "saved", invoiced: false });
    render(<PostPayGst target={{ kind: "guest", proof: PROOF }} saveImpl={save as never} retryWaitMs={5} />);
    fireEvent.change(screen.getByTestId("postpay-gst-state"), { target: { value: "29" } });
    fireEvent.change(screen.getByTestId("postpay-gst-pin"), { target: { value: "560001" } });
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    await waitFor(() => expect(screen.getByTestId("postpay-gst-confirming").textContent).toBe("Confirming your payment…"));
    await waitFor(() => expect(screen.getByTestId("postpay-gst-saved")).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(3);
  });

  it("not_paid on every try: 3 tries, then the form stays with Save enabled", async () => {
    const save = vi.fn(async () => ({ status: "not_paid" as const }));
    render(<PostPayGst target={{ kind: "guest", proof: PROOF }} saveImpl={save as never} retryWaitMs={5} />);
    fireEvent.change(screen.getByTestId("postpay-gst-state"), { target: { value: "29" } });
    fireEvent.change(screen.getByTestId("postpay-gst-pin"), { target: { value: "560001" } });
    fireEvent.click(screen.getByTestId("postpay-gst-save"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
    await waitFor(() => expect((screen.getByTestId("postpay-gst-save") as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByTestId("postpay-gst-saved")).toBeNull();
  });

  it("saveGstDetails: a 409 not_paid (account route or guest route) is { status: 'not_paid' }", async () => {
    const acct = vi.fn(async () => answer({ ok: false, error: "not_paid" }, 409));
    expect(await saveGstDetails({ kind: "account", orderId: "o" }, { stateCode: "29", pin: "560001" }, acct as never)).toEqual({ status: "not_paid" });
    const guest = vi.fn(async () => answer({ ok: false, error: "payment_rejected", reason: "not_paid" }, 409));
    expect(await saveGstDetails({ kind: "guest", proof: PROOF }, { stateCode: "29", pin: "560001" }, guest as never)).toEqual({ status: "not_paid" });
  });
});
