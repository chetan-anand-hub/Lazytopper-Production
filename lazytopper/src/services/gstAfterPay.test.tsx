/**
 * GST-AFTER-PAY-1 (owner 13 Nov 2026): the state + PIN is asked AFTER payment, never before Razorpay.
 *  - every order function sends its order straight away: no "Your state" dialog, no state-context request, no `gstBuyer` in the body
 *    (the VITE_GST_STATE_FIELD flag is ON here, which is what used to open the dialog);
 *  - saveGstDetails: the right endpoint, body and auth per buyer kind, and quiet results;
 *  - PostPayGst: validation, the pre-fill, Save, and that it renders nothing with the flag off.
 */
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

describe("no state + PIN step before Razorpay, on every checkout (flag ON)", () => {
  const body = (c: { init: RequestInit }) => JSON.parse(String(c.init.body)) as Record<string, unknown>;
  const cases: Array<[string, () => Promise<unknown>]> = [
    ["guest pack / Board Pass (createGuestOrder)", () => createGuestOrder({ kind: "pass", sku: "till_boards", target: null } as never, "9876543210")],
    ["who-order, signed out (createWhoOrder)", () => createWhoOrder({ kind: "pass", sku: "till_boards", target: null } as never, { phone: "9876543210" } as never, false)],
    ["self order (createSelfOrder)", () => createSelfOrder({ kind: "pass", sku: "till_boards", target: null } as never)],
    ["signed-in Board Pass (createPayOrder)", () => createPayOrder("till_boards")],
    ["signed-in pack (createPackOrder)", () => createPackOrder("pack_bundle")],
    ["parent-pay pack (createParentPackOrder)", () => createParentPackOrder("tok123")],
  ];
  it.each(cases)("%s: the order request goes out at once with no gstBuyer, and nothing asks for a state", async (_name, run) => {
    await run().catch(() => undefined);
    const order = calls.find((c) => /\/api\/(pay|parent)/.test(c.url) && c.init.method === "POST");
    expect(order).toBeTruthy();
    expect("gstBuyer" in body(order!)).toBe(false);
    expect(calls.some((c) => c.url.includes("/api/gst/checkout-context"))).toBe(false);
    expect(document.querySelector('[data-testid="gst-state-select"]')).toBeNull();
    expect(document.querySelector(".lt-gst")).toBeNull();
  });
});

describe("saveGstDetails", () => {
  it("guest: POSTs the receipt proof + state + PIN to the guest route, no auth header", async () => {
    const f = vi.fn(async () => answer({ ok: true, status: "invoiced" }));
    expect(await saveGstDetails({ kind: "guest", proof: PROOF }, { stateCode: "29", pin: "560001" }, f as never)).toEqual({ status: "saved" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GST_GUEST_DETAILS_ENDPOINT);
    expect(JSON.parse(String(init.body))).toEqual({ ...PROOF, stateCode: "29", pin: "560001" });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
  it("signed in: POSTs the order id + state + PIN with the account's token", async () => {
    const f = vi.fn(async () => answer({ ok: true, status: "details_saved" }));
    expect(await saveGstDetails({ kind: "account", orderId: "order_9" }, { stateCode: "27", pin: "400001" }, f as never)).toEqual({ status: "saved" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GST_ORDER_DETAILS_ENDPOINT);
    expect(JSON.parse(String(init.body))).toEqual({ orderId: "order_9", stateCode: "27", pin: "400001" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
  it("expired, a field error, any other refusal and a network failure each give a quiet result", async () => {
    const t = { kind: "guest", proof: PROOF } as const;
    const b = { stateCode: "29", pin: "560001" };
    expect(await saveGstDetails(t, b, (async () => answer({ ok: false, reason: "expired" })) as never)).toEqual({ status: "expired" });
    expect(await saveGstDetails(t, b, (async () => answer({ ok: false, error: "bad_input", field: "pin" }, 400)) as never)).toEqual({ status: "bad_input", field: "pin" });
    expect(await saveGstDetails(t, b, (async () => answer({ ok: false }, 500)) as never)).toEqual({ status: "failed" });
    expect(await saveGstDetails(t, b, (async () => { throw new Error("net"); }) as never)).toEqual({ status: "failed" });
  });
  it("gstAfterPayError: state and a 6-digit PIN (format only) are required", () => {
    expect(gstAfterPayError("", "560001")).toBe("Choose your state.");
    expect(gstAfterPayError("29", "5600")).toBe("PIN code must be 6 digits.");
    expect(gstAfterPayError("29", "060001")).toBe("PIN code must be 6 digits.");
    expect(gstAfterPayError("29", "560001")).toBeNull();
    expect(gstAfterPayError("32", "400001")).toBeNull();
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
    const save = vi.fn(async () => ({ status: "saved" as const }));
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
});
