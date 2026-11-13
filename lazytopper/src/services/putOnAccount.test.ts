import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storeReceiptProof, clearReceiptProof } from "./paidReceiptProof";

const PROOF = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };

describe("putOnAccount (PUT-ON-THIS-ACCOUNT-1)", () => {
  beforeEach(() => {
    vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    clearReceiptProof();
  });
  afterEach(() => {
    vi.doUnmock("./checkout");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    clearReceiptProof();
  });

  it("sends only ids + the signature (+ preview for the preview); reads the item and the masked contact", async () => {
    const mod = await import("./putOnAccount");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, state: "can_put", item: { kind: "pass", label: "Board Pass", sku: "till_boards", target: null }, savedTo: "+91 96•••284" }), { status: 200 }));
    const p = await mod.previewPutOnAccount(PROOF);
    expect(p).toEqual({ state: "can_put", item: { kind: "pass", label: "Board Pass", sku: "till_boards", target: null }, savedTo: "+91 96•••284" });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pay/guest/claim-with-proof");
    expect(JSON.parse(String(init.body))).toEqual({ orderId: "order_1", paymentId: "pay_1", signature: PROOF.signature, preview: true });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, state: "put", item: { kind: "pack", label: "PDF pack", sku: "pack_cbq", target: "maths" } }), { status: 200 }));
    expect(await mod.putOnAccount(PROOF)).toEqual({ state: "put", item: { kind: "pack", label: "PDF pack", sku: "pack_cbq", target: "maths" } });
    expect(JSON.parse(String((fetchSpy.mock.calls[1][1] as RequestInit).body)).preview).toBeUndefined();
  });

  it("a refusal, a failure or a malformed answer is null; no proof means no call; the kill switch means no call", async () => {
    const mod = await import("./putOnAccount");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false, reason: "not_available" }), { status: 200 }));
    expect(await mod.previewPutOnAccount(PROOF)).toBeNull();
    expect(await mod.putOnAccount(PROOF)).toBeNull();
    fetchSpy.mockResolvedValue(new Response("{}", { status: 500 }));
    expect(await mod.putOnAccount(PROOF)).toBeNull();
    fetchSpy.mockRejectedValue(new Error("offline"));
    expect(await mod.putOnAccount(PROOF)).toBeNull();
    fetchSpy.mockClear();
    expect(await mod.previewPutOnAccount(null)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    storeReceiptProof(PROOF);
    vi.stubEnv("VITE_PUT_ON_ACCOUNT_DISABLED", "1");
    expect(mod.isPutOnAccountEnabled()).toBe(false);
    expect(await mod.previewPutOnAccount()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
