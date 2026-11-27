import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../ai/paidCallHeaders", () => ({
  paidJsonHeaders: vi.fn(async () => ({ "X-Lazytopper-Uid": "u1", "Content-Type": "application/json" })),
}));
import { mintOpen, LIMITS_OPEN_ENDPOINT } from "./limitsClient";
import { paidJsonHeaders } from "../ai/paidCallHeaders";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  vi.mocked(paidJsonHeaders).mockResolvedValue({ "X-Lazytopper-Uid": "u1" });
});

const reply = (status: number, body: unknown) => vi.fn(async () => ({ status, ok: status < 400, text: async () => JSON.stringify(body) }) as unknown as Response);

describe("FREE-TS-WEEKLY mintOpen (client half of POST /api/usage/limits/open)", () => {
  it("409 open_limit is a refusal with the server's resetAt", async () => {
    const f = reply(409, { error: "open_limit", resetAt: "2026-12-04T00:00:00.000Z" });
    globalThis.fetch = f as unknown as typeof fetch;
    expect(await mintOpen("TS-CT-M01")).toEqual({ refused: true, resetAt: "2026-12-04T00:00:00.000Z" });
    expect(f).toHaveBeenCalledWith(LIMITS_OPEN_ENDPOINT, expect.objectContaining({ method: "POST", body: JSON.stringify({ paperKey: "TS-CT-M01" }) }));
  });

  it("200, a 500, a network failure, unreadable JSON and no uid all fail OPEN", async () => {
    globalThis.fetch = reply(200, { ok: true }) as unknown as typeof fetch;
    expect((await mintOpen("k")).refused).toBe(false);
    globalThis.fetch = reply(500, {}) as unknown as typeof fetch;
    expect((await mintOpen("k")).refused).toBe(false);
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect((await mintOpen("k")).refused).toBe(false);
    globalThis.fetch = vi.fn(async () => ({ status: 409, ok: false, text: async () => "<html>" }) as unknown as Response) as unknown as typeof fetch;
    expect((await mintOpen("k")).refused).toBe(false);
    vi.mocked(paidJsonHeaders).mockResolvedValue({});
    const f = vi.fn();
    globalThis.fetch = f as unknown as typeof fetch;
    expect((await mintOpen("k")).refused).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
