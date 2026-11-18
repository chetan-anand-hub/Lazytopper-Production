// TS-PACK-JOBFIX (review P0 #1) — the detail claim carries the paper's worksheet id (the SERVER keeps a Test Series Pack owner's
// series-paper breakdown open); without one the body is exactly as before.
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../ai/paidCallHeaders", async (orig) => ({
  ...(await orig<typeof import("../ai/paidCallHeaders")>()),
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "u1", Authorization: "Bearer t" }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("claimDetail · worksheetId", () => {
  it("sends { kind, resultKey, worksheetId } when given, { kind, resultKey } otherwise; reads unlocked", async () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return { status: 200, text: async () => JSON.stringify({ ok: true, unlocked: true, testSeries: true }) } as Response;
    });
    const { claimDetail } = await import("./limitsClient");
    expect(await claimDetail("full-mock", "FM-M-#04", true, "fm-ts1-m4--abc")).toBe(true);
    expect(await claimDetail("full-mock", "FM-M-#05", true)).toBe(true);
    expect(bodies).toEqual([
      { kind: "full-mock", resultKey: "FM-M-#04", worksheetId: "fm-ts1-m4--abc" },
      { kind: "full-mock", resultKey: "FM-M-#05" },
    ]);
  });
});
