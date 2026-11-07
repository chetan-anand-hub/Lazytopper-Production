/**
 * GST-INVOICE-1 - the tiny, import-free door the order functions use. With VITE_GST_STATE_FIELD off (the default) it
 * returns {} at once: no chunk is loaded, no request is made and the order body is byte-identical to before. On, it loads
 * the "Your state" dialog (./gstBuyer) on demand.
 */
import type { GstBuyer } from "./gstBuyer";

/** The client switch, read synchronously, so a call site with the flag off adds not even an await (timing is unchanged too). */
export function gstStateFieldOn(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_GST_STATE_FIELD;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** `{ gstBuyer }` for an order body ({} when off; a lazy `authHeaders` is then never called). Throws the dialog's cancel error when the buyer cancels. */
export async function gstBuyerOrderFields(
  authHeaders: Record<string, string> | (() => Promise<Record<string, string>>) | null = null,
): Promise<{ gstBuyer?: GstBuyer }> {
  if (!gstStateFieldOn()) return {};
  const headers = typeof authHeaders === "function" ? await authHeaders().catch(() => null) : authHeaders;
  const m = await import("./gstBuyer");
  return m.gstBuyerBody(await m.gstBuyerForOrder(headers));
}

/** True for the buyer closing the "Your state" dialog: every buy function treats it as "dismissed", never "failed". */
export function isGstBuyerCancelled(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { name?: unknown }).name === "GstBuyerCancelledError";
}
