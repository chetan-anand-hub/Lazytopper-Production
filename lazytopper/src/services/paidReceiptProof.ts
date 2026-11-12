/**
 * paidReceiptProof - PAID-SHOWS-1: this TAB's proof of a verified signed-out payment (Razorpay's checkout signature + the two ids; no
 * contact data). A reload of the paid screen finds it again so the purchase card can come back. Dependency-free on purpose: /packs
 * reads it at mount without loading the checkout service.
 */
export interface ReceiptProof {
  orderId: string;
  paymentId: string;
  signature: string;
}
const RECEIPT_STORE_KEY = "lt.paidReceipt.v1";

function safeSession(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function storeReceiptProof(proof: ReceiptProof, storage: Pick<Storage, "setItem"> | null = safeSession()): void {
  try {
    storage?.setItem(RECEIPT_STORE_KEY, JSON.stringify({ orderId: proof.orderId, paymentId: proof.paymentId, signature: proof.signature }));
  } catch {
    /* storage may be blocked: the card then simply does not survive a reload */
  }
}
export function readReceiptProof(storage: Pick<Storage, "getItem"> | null = safeSession()): ReceiptProof | null {
  try {
    const raw = storage?.getItem(RECEIPT_STORE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<ReceiptProof>;
    return typeof j.orderId === "string" && typeof j.paymentId === "string" && typeof j.signature === "string" && j.orderId && j.paymentId && j.signature
      ? { orderId: j.orderId, paymentId: j.paymentId, signature: j.signature }
      : null;
  } catch {
    return null;
  }
}
export function clearReceiptProof(storage: Pick<Storage, "removeItem"> | null = safeSession()): void {
  try {
    storage?.removeItem(RECEIPT_STORE_KEY);
  } catch {
    /* nothing to clear */
  }
}
