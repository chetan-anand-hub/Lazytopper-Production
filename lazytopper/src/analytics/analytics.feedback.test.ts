import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", () => ({ recordActivity }));

import { trackFeedbackEvent, type FeedbackPromptReason } from "./analytics";

/**
 * FEEDBACK-1 — what each destination receives for the "help us improve" prompt.
 *   Vercel: { name: feedback_*, data: { moment[, reason] } }
 *   GA4:    the same two codes plus the redacted address keys — nothing else
 *   Meta:   nothing
 *   First-party: { name: feedback_<...> } only — one allow-listed name carrying both codes.
 * And no free text can travel: there is no parameter for it, and junk codes are dropped.
 */
const originalLocation = window.location;
type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;
let ga4: unknown[][];
let meta: unknown[][];
let vercel: Array<[string, Record<string, unknown>]>;

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
  const url = new URL("/practice-hub", "https://www.lazytopper.com");
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
const ADDRESS_KEYS = ["page_location", "page_referrer", "traffic_type"];

describe("FEEDBACK-1 · trackFeedbackEvent payloads", () => {
  it("reason: Vercel and GA4 get only moment + reason; first-party gets the composed name only; Meta nothing", () => {
    trackFeedbackEvent("reason", "paywall", "ask_parents");
    expect(vercel).toEqual([["event", { name: "feedback_reason", data: { moment: "paywall", reason: "ask_parents" } }]]);
    const [, name, params] = ga4Events()[0];
    expect(name).toBe("feedback_reason");
    const nonAddress = Object.keys(params).filter((k) => !ADDRESS_KEYS.includes(k)).sort();
    expect(nonAddress).toEqual(["moment", "reason"]);
    expect(params).toMatchObject({ moment: "paywall", reason: "ask_parents" });
    expect(meta).toEqual([]);
    expect(recordActivity.mock.calls).toEqual([["event", { name: "feedback_paywall_ask_parents" }]]);
  });

  it("shown / dismissed carry the moment only", () => {
    trackFeedbackEvent("shown", "trial_end");
    trackFeedbackEvent("dismissed", "trial_end");
    expect(vercel.map((v) => v[1])).toEqual([
      { name: "feedback_shown", data: { moment: "trial_end" } },
      { name: "feedback_dismissed", data: { moment: "trial_end" } },
    ]);
    expect(recordActivity.mock.calls.map((c) => c[1])).toEqual([
      { name: "feedback_shown_trial_end" },
      { name: "feedback_dismissed_trial_end" },
    ]);
  });

  it("call_tap (5-minute call offer): vendors get feedback_call_tap + moment only; first-party the composed name; Meta nothing", () => {
    trackFeedbackEvent("call_tap", "paywall");
    expect(vercel).toEqual([["event", { name: "feedback_call_tap", data: { moment: "paywall" } }]]);
    const [, name, params] = ga4Events()[0];
    expect(name).toBe("feedback_call_tap");
    expect(Object.keys(params).filter((k) => !ADDRESS_KEYS.includes(k))).toEqual(["moment"]);
    expect(meta).toEqual([]);
    expect(recordActivity.mock.calls).toEqual([["event", { name: "feedback_call_tap_paywall" }]]);
  });

  it("★ no free text can ride along: a non-code reason is DROPPED everywhere (control: a real code is sent)", () => {
    const words = "my phone is 9876543210 call me" as unknown as FeedbackPromptReason;
    trackFeedbackEvent("reason", "paywall", words);
    trackFeedbackEvent("reason", "paywall");
    trackFeedbackEvent("reason", "nope" as unknown as "paywall", "price");
    expect(vercel).toEqual([]);
    expect(ga4Events()).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
    trackFeedbackEvent("reason", "trial_end", "price");
    expect(vercel).toHaveLength(1);
    expect(JSON.stringify([vercel, ga4, recordActivity.mock.calls])).not.toContain("9876543210");
  });

  it("FIRST-FEEDBACK-1: first_graded records its five names; answers never cross moments; no call tap", () => {
    trackFeedbackEvent("shown", "first_graded");
    trackFeedbackEvent("reason", "first_graded", "not_really");
    trackFeedbackEvent("dismissed", "first_graded");
    expect(recordActivity.mock.calls.map((c) => c[1])).toEqual([
      { name: "feedback_shown_first_graded" },
      { name: "feedback_first_graded_not_really" },
      { name: "feedback_dismissed_first_graded" },
    ]);
    expect(vercel[1][1]).toEqual({ name: "feedback_reason", data: { moment: "first_graded", reason: "not_really" } });
    expect(meta).toEqual([]);
    recordActivity.mockClear();
    vercel.length = 0;
    trackFeedbackEvent("reason", "first_graded", "price");
    trackFeedbackEvent("reason", "paywall", "yes");
    trackFeedbackEvent("call_tap", "first_graded");
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
