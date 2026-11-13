/**
 * GST-AFTER-PAY-1 (owner 13 Nov 2026) - the buyer's state + PIN for the GST invoice, given AFTER paying (never before Razorpay).
 * Guest: POST /api/pay/guest/gst-details with the same proof as the receipt (order id, payment id, Razorpay's signature).
 * Signed in: POST /api/gst/order-details with the account's token (the server checks the account paid that order).
 * Never throws; every failure is a quiet result the block words. Nothing here grants or changes anything but the invoice details.
 */
import { GST_STATES, isGstStateCode, isValidPin, fetchGstCheckoutContext, type GstBuyer } from "./gstBuyer";
import type { AttachProof } from "./checkoutWho";

export const GST_GUEST_DETAILS_ENDPOINT = "/api/pay/guest/gst-details";
export const GST_ORDER_DETAILS_ENDPOINT = "/api/gst/order-details";

export type GstTarget = { kind: "guest"; proof: AttachProof } | { kind: "account"; orderId: string };
export type GstSaveResult = { status: "saved"; invoiced: boolean } | { status: "expired" } | { status: "not_paid" } | { status: "bad_input"; field: "state" | "pin" } | { status: "failed" };

export { GST_STATES };

/** PURE. The message for a form that cannot be sent yet, or null. */
export function gstAfterPayError(stateCode: string, pin: string): string | null {
  if (!isGstStateCode(stateCode)) return "Choose your state.";
  if (!isValidPin(pin)) return "PIN code must be 6 digits.";
  return null;
}

export async function saveGstDetails(target: GstTarget, buyer: Pick<GstBuyer, "stateCode" | "pin">, fetchImpl: typeof fetch = fetch): Promise<GstSaveResult> {
  try {
    let url = GST_GUEST_DETAILS_ENDPOINT;
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: Record<string, unknown> = { ...(target.kind === "guest" ? target.proof : { orderId: target.orderId }), stateCode: buyer.stateCode, pin: buyer.pin };
    if (target.kind === "account") {
      url = GST_ORDER_DETAILS_ENDPOINT;
      const { authHeaders } = await import("./checkout");
      headers = { ...headers, ...(await authHeaders()) };
    } else {
      body = { ...target.proof, stateCode: buyer.stateCode, pin: buyer.pin };
    }
    const res = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body) });
    let j: Record<string, unknown> | null = null;
    try {
      j = (await res.json()) as Record<string, unknown>;
    } catch {
      j = null;
    }
    if (res.ok && j && j.ok === true) return { status: "saved", invoiced: j.status === "invoiced" };
    if (res.ok && j && j.ok === false && j.reason === "expired") return { status: "expired" };
    // The payment is not recorded yet (the server has not confirmed it): the block waits and tries again.
    if (res.status === 409 && j && (j.error === "not_paid" || j.reason === "not_paid")) return { status: "not_paid" };
    if (res.status === 400 && j && j.error === "bad_input" && (j.field === "state" || j.field === "pin")) return { status: "bad_input", field: j.field };
    return { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

/**
 * The pre-fill hint: the signed-in account's remembered state + PIN, else the IP region's state (a hint the buyer sees and confirms;
 * never a default). `remembered` is true only when the ACCOUNT holds a complete, valid state + PIN: a returning buyer's details are
 * then sent once after payment with no tap, so no order waits for an invoice.
 */
export async function gstPrefill(headers: Record<string, string> = {}): Promise<{ stateCode: string; pin: string; remembered: boolean }> {
  const ctx = await fetchGstCheckoutContext(headers);
  if (ctx.remembered) {
    const pin = ctx.remembered.pin ?? "";
    return { stateCode: ctx.remembered.stateCode, pin, remembered: gstAfterPayError(ctx.remembered.stateCode, pin) === null };
  }
  return { stateCode: ctx.ipStateCode ?? "", pin: "", remembered: false };
}
