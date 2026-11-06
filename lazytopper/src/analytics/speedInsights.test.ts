import { beforeEach, describe, expect, it, vi } from "vitest";

const inject = vi.fn();
vi.mock("@vercel/speed-insights", () => ({ injectSpeedInsights: inject }));

import { SPEED_SAMPLE_RATE, __resetSpeedInsightsForTests, scrubSpeedEvent, speedInsightsBlocked, speedRouteFor, startSpeedInsights } from "./speedInsights";

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
    // SPEED-INSIGHTS-ROUTE-1: the event now carries its route FAMILY (was undefined: every page showed as "Unknown").
    expect(e).toEqual({ type: "vital", url: `${o}/notes/x`, route: "/notes/[chapter]" });
    expect(scrubSpeedEvent({ type: "vital", url: `${o}/admin/students/1` })).toBeNull();
    expect(scrubSpeedEvent({ type: "vital", url: `${o}/u/secrettoken` })).toBeNull();
    expect(scrubSpeedEvent({ type: "vital", url: `${o}/p/aB3dE5gH7jK9mN1pQ3rS5tU7` })?.url).toBe(`${o}/p/:id`);
  });

  it("SPEED-INSIGHTS-ROUTE-1: route families collapse content slugs and keep single pages as they are", () => {
    expect(speedRouteFor("/")).toBe("/");
    expect(speedRouteFor("/pricing")).toBe("/pricing");
    expect(speedRouteFor("/check-improve")).toBe("/check-improve");
    expect(speedRouteFor("/notes/real-numbers")).toBe("/notes/[chapter]");
    expect(speedRouteFor("/cbq-class-10/heredity")).toBe("/cbq-class-10/[chapter]");
    expect(speedRouteFor("/cbq-class-10")).toBe("/cbq-class-10");
    expect(speedRouteFor("/topic-hub/real-numbers")).toBe("/topic-hub/[chapter]");
    expect(speedRouteFor("/topic-hub/10/Maths")).toBe("/topic-hub/[grade]/[subject]");
    expect(speedRouteFor("/topic-hub/10/Maths/triangles")).toBe("/topic-hub/[grade]/[subject]/[topic]");
    // Review of #1603: unknown single segments and unknown families never become a route.
    expect(speedRouteFor("/9876543210")).toBe("/[other]");
    expect(speedRouteFor("/somebody-typed-this")).toBe("/[other]");
    expect(speedRouteFor("/random/deep/path")).toBe("/[other]");
    expect(speedRouteFor("/chapter-test/10/Maths/triangles")).toBe("/chapter-test/[…]");
    expect(speedRouteFor("/highly-probable/10/Science")).toBe("/highly-probable/[grade]/[subject]");
    expect(speedRouteFor("/practice/10/Maths")).toBe("/practice/[grade]/[subject]");
    expect(speedRouteFor("/cbse/class-10")).toBe("/cbse/class-10");
    expect(speedRouteFor("/practice/worksheets")).toBe("/practice/worksheets");
    expect(speedRouteFor("/ncert-solutions/maths/real-numbers")).toBe("/ncert-solutions/[…]");
    // Privacy: whatever normalisePath masks stays masked (never a raw email or token in a route).
    expect(speedRouteFor("/p/a@b.com")).not.toContain("@");
    expect(speedRouteFor("/notes/x?email=a@b.com")).toBe("/notes/[chapter]");
  });

  it("SPEED-INSIGHTS-ROUTE-1: injects with sampleRate 0.5 and the landing's route family", async () => {
    startSpeedInsights("/notes/real-numbers");
    await vi.advanceTimersByTimeAsync(3000);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(SPEED_SAMPLE_RATE).toBe(0.5);
    expect(inject.mock.calls[0][0].sampleRate).toBe(0.5);
    expect(inject.mock.calls[0][0].route).toBe("/notes/[chapter]");
  });
});
