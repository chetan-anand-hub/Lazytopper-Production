/**
 * WHATSAPP-OPTIN-1 - the client half: the exact label (and its match with the server's), the number reader, the pending opt-in that
 * order-create bodies carry (valid + ticked only), and the free-sample POST.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WA_OPTIN_ENDPOINT, WA_OPTIN_LABEL, WA_OPTIN_VERSION, postSampleOptIn, setPendingWaOptIn, waOptInOrderFields, waTenDigits } from "./waOptIn";
import { createSelfOrder } from "./checkoutWho";
import { createPackOrder, createPayOrder } from "./checkout";

vi.mock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));

afterEach(() => {
  setPendingWaOptIn(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubFetch(json: unknown = { ok: true, orderId: "o1", keyId: "k", amountPaise: 100 }) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => json } as Response;
  });
  return calls;
}

describe("label + version", () => {
  it("are the owner-approved strings, and the server stores byte-identical ones", () => {
    expect(WA_OPTIN_LABEL).toBe("Send me updates on WhatsApp");
    expect(WA_OPTIN_VERSION).toBe("wa-optin-v1");
    const server = readFileSync(join(process.cwd(), "server", "services", "waOptIn.cjs"), "utf8");
    expect(server).toContain(`const WA_OPTIN_LABEL = '${WA_OPTIN_LABEL}';`);
    expect(server).toContain(`const WA_OPTIN_VERSION = '${WA_OPTIN_VERSION}';`);
  });
});

describe("waTenDigits", () => {
  it("reads the usual Indian forms, rejects the rest", () => {
    for (const ok of ["9876543210", "98765 43210", "+91 98765 43210", "919876543210", "09876543210", "98765-43210"]) expect(waTenDigits(ok)).toBe("9876543210");
    for (const bad of ["", "12345", "5876543210", "98765432101", "+44 9876543210", "abcdefghij", "98765 4321a"]) expect(waTenDigits(bad)).toBeNull();
  });
});

describe("the pending opt-in on order-create bodies", () => {
  it("nothing pending -> no waOptIn key anywhere (pass, pack, self order)", async () => {
    const calls = stubFetch();
    await createPayOrder("till_boards");
    await createPackOrder("pack_cbq", "maths");
    await createSelfOrder({ kind: "pack", sku: "pack_cbq", target: "maths", label: "x", description: "x" });
    expect(calls).toHaveLength(3);
    for (const c of calls) expect("waOptIn" in c.body).toBe(false);
  });

  it("valid + ticked -> every order path carries { phone, consent: true } and nothing else about it", async () => {
    setPendingWaOptIn("9876543210");
    expect(waOptInOrderFields()).toEqual({ waOptIn: { phone: "9876543210", consent: true } });
    const calls = stubFetch();
    await createPayOrder("till_boards");
    await createPackOrder("pack_cbq", "maths");
    await createSelfOrder({ kind: "pack", sku: "pack_cbq", target: "maths", label: "x", description: "x" });
    expect(calls.map((c) => c.url)).toEqual(["/api/pay/order", "/api/pay/order", "/api/pay/guest/order"]);
    for (const c of calls) expect(c.body.waOptIn).toEqual({ phone: "9876543210", consent: true });
  });

  it("cleared -> back to nothing; it is memory only (no storage keys written)", () => {
    setPendingWaOptIn("9876543210");
    setPendingWaOptIn(null);
    expect(waOptInOrderFields()).toEqual({});
    expect(JSON.stringify({ ...localStorage })).not.toContain("9876543210");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("9876543210");
  });
});

describe("postSampleOptIn", () => {
  it("POSTs { phone, consent: true, packId, consentVersion } to the opt-in route; true only on 2xx; never throws", async () => {
    const calls = stubFetch({ ok: true });
    expect(await postSampleOptIn("9876543210", "pack_cbq:maths")).toBe(true);
    expect(calls[0].url).toBe(WA_OPTIN_ENDPOINT);
    expect(calls[0].body).toEqual({ phone: "9876543210", consent: true, packId: "pack_cbq:maths", consentVersion: "wa-optin-v1" });
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 400 }) as Response);
    expect(await postSampleOptIn("9876543210", "pack_cbq:maths")).toBe(false);
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });
    expect(await postSampleOptIn("9876543210", "pack_cbq:maths")).toBe(false);
  });
});
