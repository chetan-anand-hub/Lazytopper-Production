import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetSettingsDoorForTests, requestOpenSettings, subscribeSettingsRequest } from "./settingsDoor";

afterEach(() => {
  __resetSettingsDoorForTests();
  vi.restoreAllMocks();
});

describe("settingsDoor", () => {
  it("tells a subscriber, and says so", () => {
    const fn = vi.fn();
    subscribeSettingsRequest(fn);
    expect(requestOpenSettings("usage")).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].section).toBe("usage");
  });

  it("unsubscribe stops delivery; with nobody listening the request reports false", () => {
    const fn = vi.fn();
    const off = subscribeSettingsRequest(fn);
    off();
    expect(requestOpenSettings("usage")).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it("only the most recently subscribed listener opens (never two windows)", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeSettingsRequest(a);
    const offB = subscribeSettingsRequest(b);
    requestOpenSettings();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    offB();
    requestOpenSettings();
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("a request made before any shell listens is delivered once to the next subscriber, if fresh", () => {
    expect(requestOpenSettings("usage")).toBe(false);
    const late = vi.fn();
    subscribeSettingsRequest(late);
    expect(late).toHaveBeenCalledTimes(1);
    const later = vi.fn();
    subscribeSettingsRequest(later);
    expect(later).not.toHaveBeenCalled();
  });

  it("a stale pending request is dropped", () => {
    // capture the drop timer and fire it by hand (no clock involved)
    const timers: Array<() => void> = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) => {
      timers.push(fn);
      return 0;
    }) as unknown as typeof setTimeout);
    requestOpenSettings("usage");
    expect(timers).toHaveLength(1);
    timers[0]();
    const fn = vi.fn();
    subscribeSettingsRequest(fn);
    expect(fn).not.toHaveBeenCalled();
  });
});
