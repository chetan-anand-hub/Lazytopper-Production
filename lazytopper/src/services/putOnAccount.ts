/**
 * putOnAccount - PUT-ON-THIS-ACCOUNT-1: a buyer paid SIGNED OUT, then signed in with a DIFFERENT login than the paid-with contact, so the
 * sign-in claim found nothing. This tab still holds the receipt proof (paidReceiptProof). Two calls to POST /api/pay/guest/claim-with-proof:
 * `previewPutOnAccount` (writes nothing; says what a tap would do and the MASKED paid-with contact) and `putOnAccount` (does it).
 * The browser decides nothing: the server checks the signed-in uid, Razorpay's signature, the order and the 24 h window.
 * Never throws. Kill switch: build env VITE_PUT_ON_ACCOUNT_DISABLED = "1".
 */
import { readReceiptProof, type ReceiptProof } from "./paidReceiptProof";

export const PUT_ON_ACCOUNT_ENDPOINT = "/api/pay/guest/claim-with-proof";

/** Read as a LITERAL `import.meta.env.VITE_…` expression (Vite and Vitest rewrite that exact text). */
export function isPutOnAccountEnabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_PUT_ON_ACCOUNT_DISABLED;
    return (raw === undefined || raw === null ? "" : String(raw).trim()) !== "1";
  } catch {
    return true;
  }
}

export interface PutOnAccountItem {
  kind: "pack" | "pass";
  label: string;
  sku: string;
  target: string | null;
}
export type PutPreview = { state: "can_put"; item: PutOnAccountItem; savedTo: string } | null;
export type PutResult = { state: "put" | "duplicate" | "yours"; item: PutOnAccountItem } | null;

function readItem(raw: unknown): PutOnAccountItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if ((r.kind !== "pack" && r.kind !== "pass") || typeof r.label !== "string" || typeof r.sku !== "string") return null;
  return { kind: r.kind, label: r.label, sku: r.sku, target: typeof r.target === "string" ? r.target : null };
}

async function call(proof: ReceiptProof, preview: boolean): Promise<Record<string, unknown> | null> {
  try {
    const { authHeaders } = await import("./checkout");
    const res = await fetch(PUT_ON_ACCOUNT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ orderId: proof.orderId, paymentId: proof.paymentId, signature: proof.signature, ...(preview ? { preview: true } : {}) }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function previewPutOnAccount(proof: ReceiptProof | null = readReceiptProof()): Promise<PutPreview> {
  if (!proof || !isPutOnAccountEnabled()) return null;
  const j = await call(proof, true);
  const item = j && j.ok === true && j.state === "can_put" ? readItem(j.item) : null;
  return item ? { state: "can_put", item, savedTo: typeof j?.savedTo === "string" ? j.savedTo : "" } : null;
}

export async function putOnAccount(proof: ReceiptProof | null = readReceiptProof()): Promise<PutResult> {
  if (!proof || !isPutOnAccountEnabled()) return null;
  const j = await call(proof, false);
  const item = j && j.ok === true ? readItem(j.item) : null;
  const state = j && (j.state === "put" || j.state === "duplicate" || j.state === "yours") ? j.state : null;
  return item && state ? { state, item } : null;
}
