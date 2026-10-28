import { beforeEach, describe, expect, it, vi } from "vitest";

const inject = vi.fn();
vi.mock("@vercel/speed-insights", () => ({ injectSpeedInsights: inject }));

import { __resetSpeedInsightsForTests, scrubSpeedEvent, speedInsightsBlocked, startSpeedInsights } from "./speedInsights";

vi.mock("./analytics", async (orig) => {
  const real = await orig<typeof import("./analytics")>();
  return { ...real, analyticsEnabled: () => enabled };
});
let enabled = true;

describe("SPEED-1 speed insights", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    inject.mockClear();
    __resetSpeedInsightsForTests();
    enabled = true;
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  it("blocks /admin and /u/ hand-off paths only", () => {
    expect(speedInsightsBlocked("/admin")).toBe(true);
    expect(speedInsightsBlocked("/admin/students/x")).toBe(true);
    expect(speedInsightsBlocked("/u/abc123")).toBe(true);
    expect(speedInsightsBlocked("/notes/x")).toBe(false);
    expect(speedInsightsBlocked("/administrator")).toBe(false);
  });

  it("loads once, after a delay, on a normal page; not synchronously", async () => {
    startSpeedInsights("/welcome");
    startSpeedInsights("/notes");
    expect(inject).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(typeof inject.mock.calls[0][0].beforeSend).toBe("function");
  });

  it("never loads on admin, hand-off links or automated contexts", async () => {
    startSpeedInsights("/admin/x");
    startSpeedInsights("/u/tok");
    enabled = false;
    startSpeedInsights("/welcome");
    await vi.advanceTimersByTimeAsync(5000);
    expect(inject).not.toHaveBeenCalled();
  });

  it("scrubs the event URL (no query, no hash, ids masked) and drops admin and hand-off events", () => {
    const o = window.location.origin;
    const e = scrubSpeedEvent({ type: "vital", url: `${o}/notes/x?utm_source=a&email=b@c.com#h`, route: "/notes/[id]" });
    expect(e).toEqual({ type: "vital", url: `${o}/notes/x`, route: undefined });
    expect(scrubSpeedEvent({ type: "vital", url: `${o}/admin/students/1` })).toBeNull();
    expect(scrubSpeedEvent({ type: "vital", url: `${o}/u/secrettoken` })).toBeNull();
    expect(scrubSpeedEvent({ type: "vital", url: `${o}/p/aB3dE5gH7jK9mN1pQ3rS5tU7` })?.url).toBe(`${o}/p/:id`);
  });
});
