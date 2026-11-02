/**
 * ACT-FREECHECK-1 — trackCheckGradedFirstPartyOnly: the converting free check's check_graded reaches the
 * first-party activity log (recordActivity) and NEITHER vendor (GA4 dataLayer, Vercel va). The signed-out grade
 * already sent the vendors their one check_graded.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/activityClient")>();
  return { ...actual, recordActivity: (...a: unknown[]) => recordActivity(...a) };
});

import { trackCheckGradedFirstPartyOnly, trackNamedEvent } from "./analytics";

type Win = { gtag?: unknown; dataLayer?: unknown[]; va?: unknown };
const w = window as unknown as Win;
const originalLocation = window.location;
let va: unknown[];

beforeEach(() => {
  recordActivity.mockReset();
  va = [];
  w.dataLayer = [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.va = (...a: unknown[]) => va.push(a);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  const url = new URL("/check-improve", "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: "", hash: "" },
  });
});
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  delete w.gtag;
  delete w.dataLayer;
  delete w.va;
});

describe("trackCheckGradedFirstPartyOnly", () => {
  it("records check_graded in the first-party log, name only, and sends no vendor hit", () => {
    trackCheckGradedFirstPartyOnly();
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "check_graded" });
    expect(w.dataLayer).toEqual([]);
    expect(va).toEqual([]);
  });

  it("control: the ordinary named event DOES reach the vendors", () => {
    trackNamedEvent("check_graded");
    expect(w.dataLayer!.length).toBeGreaterThan(0);
  });

  it("never throws if the activity log throws", () => {
    recordActivity.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => trackCheckGradedFirstPartyOnly()).not.toThrow();
  });
});
