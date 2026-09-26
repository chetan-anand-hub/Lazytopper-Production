import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { UserCredential } from "firebase/auth";

const { getAdditionalUserInfo } = vi.hoisted(() => ({
  getAdditionalUserInfo: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));

import { trackNamedEvent, trackPageview, trackSignUp, trackSignUpIfNew } from "./analytics";

const credential = {} as UserCredential;

/**
 * ★★ PINS THE CALL SHAPE, BECAUSE THE WRONG ONE DOES NOT FAIL — IT MISFILES.
 *
 * Read out of @vercel/analytics@2.0.1 dist/index.mjs:
 *   a page view    -> window.va("pageview", { route, path })   (line 227)
 *   a custom event -> window.va("event",    { name, data })    (track())
 *
 * Sending a page view through the `"event"` shape throws nothing and logs nothing. It
 * files every page view as a custom event — wrong dashboard section, counted against the
 * custom-event allowance. An integration written from memory lands there, and the only
 * way to notice is to look at the dashboard days later and find no page views at all.
 */
const originalLocation = window.location;

function setHostname(hostname: string): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname, href: `https://${hostname}/` },
  });
}

describe("the Vercel binding", () => {
  let calls: Array<[string, Record<string, unknown>]>;

  beforeEach(() => {
    calls = [];
    (window as unknown as { va?: unknown }).va = (
      kind: string,
      payload: Record<string, unknown>,
    ) => {
      calls.push([kind, payload]);
    };
    setHostname("www.lazytopper.com");
    Object.defineProperty(window.navigator, "webdriver", {
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    delete (window as unknown as { va?: unknown }).va;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it('sends a page view as "pageview", never as "event"', () => {
    trackPageview("/notes/electricity");
    expect(calls).toHaveLength(1);
    const [kind, payload] = calls[0];
    expect(kind).toBe("pageview");
    expect(kind).not.toBe("event");
    expect(payload).toEqual({
      route: "/notes/electricity",
      path: "/notes/electricity",
    });
  });

  it('sends a signup as "event" with the name, and NO identifier of any kind', () => {
    trackSignUp();
    expect(calls).toHaveLength(1);
    const [kind, payload] = calls[0];
    expect(kind).toBe("event");
    expect(payload).toEqual({ name: "sign_up" });
    // The ruling: a count, not an identity. No uid, no email, nothing that links this
    // visit to the next one.
    expect(JSON.stringify(payload)).not.toMatch(/uid|email|phone|name":\s*"[^s]/i);
  });

  it("★ redacts the QR capability token before it ever reaches the vendor", () => {
    const token = "c".repeat(64);
    trackPageview(`/u/${token}`);
    expect(calls[0][1]).toEqual({ route: "/u/:token", path: "/u/:token" });
    expect(JSON.stringify(calls)).not.toContain(token);
  });

  it("★ CONTROL — sends NOTHING from the capture's loopback origin", () => {
    setHostname("127.0.0.1");
    trackPageview("/notes/electricity");
    trackSignUp();
    expect(calls).toHaveLength(0);
  });

  it("★ CONTROL — a blocked vendor is silent, not fatal", () => {
    // An ad blocker means window.va never gets defined. The app must not notice.
    delete (window as unknown as { va?: unknown }).va;
    expect(() => trackPageview("/")).not.toThrow();
    expect(() => trackSignUp()).not.toThrow();
  });

  it("★★ a RETURNING Google/phone login is NOT counted as a signup", () => {
    // The flattering-direction bug: signInWithPopup is one call for both doors.
    getAdditionalUserInfo.mockReturnValue({ isNewUser: false });
    trackSignUpIfNew(credential);
    expect(calls).toHaveLength(0);
  });

  it("★★ CONTROL — a NEW account IS counted, so the gate is not simply closed", () => {
    getAdditionalUserInfo.mockReturnValue({ isNewUser: true });
    trackSignUpIfNew(credential);
    expect(calls).toEqual([["event", { name: "sign_up" }]]);
  });

  it("★★ the isNewUser gate can NEVER throw out of a login", () => {
    // This is the failure that turned 7 AuthContext.phoneName tests red when the gate
    // was written inline on the auth path. Here it must be swallowed.
    getAdditionalUserInfo.mockImplementation(() => {
      throw new Error("firebase/auth exploded");
    });
    expect(() => trackSignUpIfNew(credential)).not.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("★ CONTROL — a vendor that THROWS does not take the page down", () => {
    (window as unknown as { va?: unknown }).va = () => {
      throw new Error("vendor exploded");
    };
    expect(() => trackPageview("/")).not.toThrow();
    expect(() => trackSignUp()).not.toThrow();
  });

  /**
   * FREE-CHECK-1b (R10) — the free-check funnel is COUNTED, never identified. Each event
   * is `"event"` + `{ name }` and NOTHING ELSE: the payload is compared by deep equality
   * against the bare name, so any added key — a uid, a device id, a reason, a `data`
   * object — fails it. (The sign_up test's `name":"[^s]` regex is deliberately not
   * reused: every one of these names starts with "f", which that pattern would flag.)
   */
  it.each(["free_check_used_block", "free_check_signup", "free_check_trial_start"] as const)(
    "R10: %s is sent as a bare name — no identifier of any kind",
    (name) => {
      trackNamedEvent(name);
      expect(calls).toEqual([["event", { name }]]);
      expect(Object.keys(calls[0][1])).toEqual(["name"]);
      expect(JSON.stringify(calls[0][1])).not.toMatch(/uid|email|phone|device|data/i);
    },
  );

  it("R10 ★ CONTROL — the loopback capture origin sends nothing, a blocked vendor is silent", () => {
    setHostname("127.0.0.1");
    trackNamedEvent("free_check_signup");
    expect(calls).toHaveLength(0);
    delete (window as unknown as { va?: unknown }).va;
    setHostname("www.lazytopper.com");
    expect(() => trackNamedEvent("free_check_trial_start")).not.toThrow();
  });
});
