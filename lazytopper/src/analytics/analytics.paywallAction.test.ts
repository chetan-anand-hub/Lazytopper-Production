import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRequire } from "node:module";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/activityClient")>();
  return { ...actual, recordActivity };
});

import { trackPaywallAction, type PaywallAction, type PaywallSurface } from "./analytics";
import { ACTIVITY_EVENTS } from "../services/activityClient";
import { activityEventLabel } from "../pages/admin/activityDetailModel";

/**
 * PAYWALL-PAY-1 — `paywall_action { action, surface }`: one event per tap on Pay / Share QR
 * code / Forward link to parents. Vendors get the action + surface only; the first-party log
 * (names only) gets `paywall_action_<action>`, which the client AND server allowlists carry.
 */
const originalLocation = window.location;
type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;
let ga4: unknown[][];
let meta: unknown[][];
let vercel: Array<[string, Record<string, unknown>]>;
const ADDRESS_KEYS = ["page_location", "page_referrer", "traffic_type"];

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  ga4 = [];
  meta = [];
  vercel = [];
  w.gtag = (...args: unknown[]) => ga4.push(args);
  const fbq = (...args: unknown[]) => meta.push(args);
  (fbq as unknown as { callMethod: unknown }).callMethod = () => undefined;
  w.fbq = fbq;
  w.va = (kind: string, payload: Record<string, unknown>) => vercel.push([kind, payload]);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  Object.defineProperty(document, "referrer", { configurable: true, get: () => "" });
  const url = new URL("/tutor", "https://www.lazytopper.com");
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

const ga4Events = () => ga4.filter((e) => e[0] === "event") as Array<[string, string, Record<string, unknown>]>;

describe("PAYWALL-PAY-1 · trackPaywallAction", () => {
  it.each<[PaywallAction, PaywallSurface]>([
    ["pay", "lock"],
    ["qr", "upgrade_sheet"],
    ["forward", "usage_limit"],
  ])("%s on %s: ONE vendor event { action, surface }, and paywall_action_<action> first-party", (action, surface) => {
    trackPaywallAction(action, surface);
    expect(vercel).toEqual([["event", { name: "paywall_action", data: { action, surface } }]]);
    const ev = ga4Events();
    expect(ev).toHaveLength(1);
    expect(ev[0][1]).toBe("paywall_action");
    const params = Object.fromEntries(Object.entries(ev[0][2]).filter(([k]) => !ADDRESS_KEYS.includes(k)));
    expect(params).toEqual({ action, surface });
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: `paywall_action_${action}` });
    expect(meta).toEqual([]);
  });

  it("the three first-party names are on BOTH allowlists and have admin labels", () => {
    const requireCjs = createRequire(import.meta.url);
    const server = requireCjs("../../server/routes/studentActivity.cjs") as { ACTIVITY_EVENTS: readonly string[] };
    for (const n of ["paywall_action_pay", "paywall_action_qr", "paywall_action_forward"]) {
      expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
      expect(server.ACTIVITY_EVENTS).toContain(n);
      expect(activityEventLabel(n)).not.toBe(n);
      expect(activityEventLabel(n)).not.toMatch(/\bask\b/i);
    }
  });
});
