import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRequire } from "node:module";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/activityClient")>();
  return { ...actual, recordActivity };
});

import { trackScorecardShare } from "./analytics";
import { ACTIVITY_EVENTS } from "../services/activityClient";
import { activityEventLabel } from "../pages/admin/activityDetailModel";

/**
 * SHARE-CARD-1 — `scorecard_share { surface, size, channel }` to GA4 / Vercel; the bare name to
 * the first-party log, which the client AND server allowlists carry.
 */
const originalLocation = window.location;
type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;
let ga4: unknown[][];
let vercel: Array<[string, Record<string, unknown>]>;
const ADDRESS_KEYS = ["page_location", "page_referrer", "traffic_type"];

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  ga4 = [];
  vercel = [];
  w.gtag = (...args: unknown[]) => ga4.push(args);
  w.va = (kind: string, payload: Record<string, unknown>) => vercel.push([kind, payload]);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  Object.defineProperty(document, "referrer", { configurable: true, get: () => "" });
  const url = new URL("/worksheets", "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
  window.localStorage.clear();
  recordActivity.mockClear();
});

afterEach(() => {
  delete w.gtag;
  delete w.fbq;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
});

describe("SHARE-CARD-1 · trackScorecardShare", () => {
  it("ONE vendor event { surface, size, channel }; the bare name first-party", () => {
    trackScorecardShare("chapter_test", "story", "instagram");
    expect(vercel).toEqual([["event", { name: "scorecard_share", data: { surface: "chapter_test", size: "story", channel: "instagram" } }]]);
    const ev = ga4.filter((e) => e[0] === "event") as Array<[string, string, Record<string, unknown>]>;
    expect(ev).toHaveLength(1);
    expect(ev[0][1]).toBe("scorecard_share");
    const params = Object.fromEntries(Object.entries(ev[0][2]).filter(([k]) => !ADDRESS_KEYS.includes(k)));
    expect(params).toEqual({ surface: "chapter_test", size: "story", channel: "instagram" });
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "scorecard_share" });
  });

  it("the name is on BOTH allowlists and has an admin label", () => {
    const requireCjs = createRequire(import.meta.url);
    const server = requireCjs("../../server/routes/studentActivity.cjs") as { ACTIVITY_EVENTS: readonly string[] };
    expect(ACTIVITY_EVENTS as readonly string[]).toContain("scorecard_share");
    expect(server.ACTIVITY_EVENTS).toContain("scorecard_share");
    expect(activityEventLabel("scorecard_share")).toBe("Shared a scorecard image");
  });
});
