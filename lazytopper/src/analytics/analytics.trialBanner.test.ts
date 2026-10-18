// TRIAL-END-1 — `trial_banner_shown` (once per tab per IST day, bare name) and
// `trial_banner_click` (a two-value cta only): never a uid, a day number or a count.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TRIAL_BANNER_SHOWN_KEY, trackTrialBannerClick, trackTrialBannerShown } from "./analytics";
import { ACTIVITY_EVENTS } from "../services/activityClient";

const originalLocation = window.location;
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;

beforeEach(() => {
  sent = [];
  sessionStorage.clear();
  (window as unknown as { va?: unknown }).va = (kind: string, payload: Record<string, unknown>) => {
    sent.push({ kind, payload });
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname: "www.lazytopper.com", href: "https://www.lazytopper.com/" },
  });
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
});
afterEach(() => {
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
});

describe("trackTrialBannerShown", () => {
  it("sends the bare name once per tab per IST day key", () => {
    trackTrialBannerShown("2026-06-06");
    trackTrialBannerShown("2026-06-06");
    expect(sent).toEqual([{ kind: "event", payload: { name: "trial_banner_shown" } }]);
    expect(sessionStorage.getItem(TRIAL_BANNER_SHOWN_KEY)).toBe("2026-06-06");
    trackTrialBannerShown("2026-06-07");
    expect(sent).toHaveLength(2);
  });
});

describe("trackTrialBannerClick", () => {
  it("sends the cta as data, nothing else", () => {
    trackTrialBannerClick("plans");
    trackTrialBannerClick("check");
    expect(sent).toEqual([
      { kind: "event", payload: { name: "trial_banner_click", data: { cta: "plans" } } },
      { kind: "event", payload: { name: "trial_banner_click", data: { cta: "check" } } },
    ]);
  });

  it("both names are on the first-party activity allow-list (the server mirrors it)", () => {
    expect(ACTIVITY_EVENTS as readonly string[]).toContain("trial_banner_shown");
    expect(ACTIVITY_EVENTS as readonly string[]).toContain("trial_banner_click");
  });
});
