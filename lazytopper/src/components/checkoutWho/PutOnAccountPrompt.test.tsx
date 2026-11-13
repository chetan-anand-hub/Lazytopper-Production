import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { clearReceiptProof, readReceiptProof, storeReceiptProof } from "../../services/paidReceiptProof";

const PROOF = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };

describe("PutOnAccountPrompt (PUT-ON-THIS-ACCOUNT-1)", () => {
  beforeEach(() => {
    vi.doMock("../../services/checkout", async (orig) => ({ ...(await orig<typeof import("../../services/checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    vi.doMock("../../services/subscriptionService", async (orig) => ({ ...(await orig<typeof import("../../services/subscriptionService")>()), hydrateSubscriptionFromCloud: vi.fn(async () => undefined) }));
    clearReceiptProof();
  });
  afterEach(async () => {
    cleanup();
    (await import("./PutOnAccountPrompt")).closePutOnAccountPromptForTests();
    vi.doUnmock("../../services/checkout");
    vi.doUnmock("../../services/subscriptionService");
    vi.restoreAllMocks();
    clearReceiptProof();
    document.body.innerHTML = "";
  });

  it("asks with the masked paid-with contact; [Put it here] puts it, clears the proof, announces it", async () => {
    storeReceiptProof(PROOF);
    const mod = await import("./PutOnAccountPrompt");
    const calls: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      calls.push(body);
      return new Response(JSON.stringify(body.preview ? { ok: true, state: "can_put", item: { kind: "pass", label: "Board Pass", sku: "till_boards", target: null }, savedTo: "+91 96•••284" } : { ok: true, state: "put", item: { kind: "pass", label: "Board Pass", sku: "till_boards", target: null } }), { status: 200 });
    });
    const seen: unknown[] = [];
    window.addEventListener("lazytopper:guest-claimed", (e) => seen.push((e as CustomEvent).detail));
    mod.showPutOnAccountPrompt("uGoogle");
    const box = await screen.findByTestId("put-on-account");
    expect(box.textContent).toContain("Your Board Pass was paid with +91 96•••284. Put it on this account?");
    expect(box.textContent).toContain("Put it here");
    expect(box.textContent).toContain("No, keep it there");
    fireEvent.click(screen.getByText("Put it here"));
    expect((await screen.findByTestId("put-on-account-done")).textContent).toContain("Your Board Pass is on this account.");
    expect(readReceiptProof()).toBeNull();
    expect(calls).toHaveLength(2);
    expect(seen).toEqual([{ count: 1, items: [{ kind: "pass", sku: "till_boards", target: null, name: "Board Pass" }] }]);
  });

  it("[No, keep it there] clears the proof and closes without a second call; a server 'not available' shows nothing; no proof shows nothing", async () => {
    storeReceiptProof(PROOF);
    const mod = await import("./PutOnAccountPrompt");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, state: "can_put", item: { kind: "pack", label: "PDF pack", sku: "pack_cbq", target: "maths" }, savedTo: "" }), { status: 200 }));
    mod.showPutOnAccountPrompt("uG");
    expect((await screen.findByTestId("put-on-account")).textContent).toContain("Your PDF pack was paid for earlier.");
    fireEvent.click(screen.getByText("No, keep it there"));
    await waitFor(() => expect(document.querySelector('[data-testid="put-on-account"]')).toBeNull());
    expect(readReceiptProof()).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // not available
    storeReceiptProof(PROOF);
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: false, reason: "not_available" }), { status: 200 }));
    mod.showPutOnAccountPrompt("uG");
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(document.querySelector("[data-put-on-account-host]")).toBeNull());
    expect(document.querySelector('[data-testid="put-on-account"]')).toBeNull();
    // no proof: no root, no call
    clearReceiptProof();
    fetchSpy.mockClear();
    mod.showPutOnAccountPrompt("uG");
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
