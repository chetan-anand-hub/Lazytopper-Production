// PRICE-FIXED-1 - the browser asks the server ONCE whether this account may see the month pass.
// A real answer lasts the session; a FAILED answer (5xx, 429, network) is remembered for a few minutes so a
// flaky or rate-limited server is not pinged on every mount.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/checkout", () => ({
  PAY_STATUS_ENDPOINT: "/api/pay/status",
  authHeaders: async () => ({ Authorization: "Bearer t" }),
  isPaymentsClientEnabled: () => true,
}));

import { fetchMonthPassAvailable, MONTH_PASS_FAILURE_TTL_MS, resetMonthPassAvailableForTests } from "./useMonthPassAvailable";

const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
  resetMonthPassAvailableForTests();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00+05:30"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchMonthPassAvailable", () => {
  it("asks with { offer: true } and trusts only a real boolean answer", async () => {
    const f = vi.fn(async () => reply(200, { ok: true, state: "offer", monthPassAvailable: true }));
    vi.stubGlobal("fetch", f);
    expect(await fetchMonthPassAvailable("u1")).toBe(true);
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ offer: true });
  });

  it("a real answer is cached for the session: one request however many mounts", async () => {
    const f = vi.fn(async () => reply(200, { ok: true, monthPassAvailable: false }));
    vi.stubGlobal("fetch", f);
    for (let i = 0; i < 5; i += 1) expect(await fetchMonthPassAvailable("u1")).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a 500", () => reply(500, { ok: false })],
    ["a 429", () => reply(429, { ok: false })],
    ["a malformed body", () => reply(200, { ok: true })],
  ])("%s is hidden (false) AND remembered, so mounts do not re-ping; it is re-asked after the TTL", async (_n, make) => {
    const f = vi.fn(async () => make());
    vi.stubGlobal("fetch", f);
    for (let i = 0; i < 5; i += 1) expect(await fetchMonthPassAvailable("u1")).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + MONTH_PASS_FAILURE_TTL_MS + 1);
    await fetchMonthPassAvailable("u1");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("a thrown network error is hidden and remembered too", async () => {
    const f = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", f);
    expect(await fetchMonthPassAvailable("u1")).toBe(false);
    expect(await fetchMonthPassAvailable("u1")).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
