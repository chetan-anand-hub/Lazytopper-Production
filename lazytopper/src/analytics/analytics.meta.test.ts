import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { getAdditionalUserInfo } = vi.hoisted(() => ({
  getAdditionalUserInfo: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import { META_EVENTS, metaAddressIsClean, trackNamedEvent, trackPageview, trackSignUp } from "./analytics";
import type { NamedAnalyticsEvent } from "./analytics";

/** The retired base (ROOT-URL-1), read from vercel.json's redirect to the root so this file holds no literal of it. */
const RETIRED_BASE: string = (
  JSON.parse(readFileSync(resolve(__dirname, "../../../vercel.json"), "utf-8")) as {
    redirects: Array<{ source: string; destination: string }>;
  }
).redirects.find((r) => r.destination === "/")!.source;

/**
 * META-PIXEL-1 PR-1 — the Meta half of `send()`. Pins the decision that Meta receives only
 * PageView / CompleteRegistration / StartTrial, always with exactly two arguments (never a
 * path), and nothing at all (queue purged of track entries) while the address is not clean.
 * `window.fbq` is stubbed as index.html's pre-load stub: it pushes `arguments` onto `queue`.
 */
const PIXEL = "2018097265518900";
const originalLocation = window.location;

function setLocation(pathAndQuery: string, hostname = "www.lazytopper.com"): void {
  const url = new URL(pathAndQuery, `https://${hostname}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      href: url.href,
      origin: url.origin,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    },
  });
}

function setReferrer(referrer: string): void {
  Object.defineProperty(document, "referrer", { configurable: true, get: () => referrer });
}

type Fbq = { (...args: unknown[]): void; queue: unknown[]; callMethod?: (...a: unknown[]) => void };
type Win = { fbq?: unknown; gtag?: unknown; va?: unknown };
const w = window as unknown as Win;

let calls: unknown[][];

function installFbq(loaded = true): void {
  calls = [];
  const fbq = function () {
    // eslint-disable-next-line prefer-rest-params
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments as unknown as unknown[]);
    // eslint-disable-next-line prefer-rest-params
    else fbq.queue.push(arguments);
  } as Fbq;
  fbq.queue = [["set", "autoConfig", false, PIXEL], ["init", PIXEL]];
  if (loaded) setLoaded(fbq);
  w.fbq = fbq;
}

function setLoaded(fbq: Fbq = w.fbq as Fbq): void {
  fbq.callMethod = (...a: unknown[]) => void calls.push(a);
}

function ready(): void {
  window.dispatchEvent(new Event("lt:fbq-ready"));
}

function queue(): unknown[][] {
  return (w.fbq as Fbq).queue.map((e) => Array.from(e as ArrayLike<unknown>));
}

function added(): unknown[][] {
  return calls;
}

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  installFbq();
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  setLocation("/practice-hub");
  setReferrer("");
});

afterEach(() => {
  delete w.fbq;
  ready();
  delete w.gtag;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  setReferrer("");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Meta — page views", () => {
  it("sends exactly ['track','PageView'] on a clean address with allowed query keys", () => {
    setLocation("/practice-hub?cbq=1&utm_source=fb&fbclid=x");
    trackPageview("/practice-hub");
    expect(added()).toEqual([["track", "PageView"]]);
  });

  it("sends one two-argument PageView per route change", () => {
    setLocation("/practice-hub");
    trackPageview("/practice-hub");
    setLocation("/pricing");
    trackPageview("/pricing");
    const views = added();
    expect(views).toEqual([["track", "PageView"], ["track", "PageView"]]);
    expect(views.every((e) => e.length === 2)).toBe(true);
  });

  it.each([
    "/login?oobCode=x",
    "/admin/students/AbCdEfGhIjKlMnOpQrStUvWx12Yz",
    "/u/abc",
    `${RETIRED_BASE}/u/abc`,
    "/notes/circles#t=1",
    "/pricing?next=%2Fhome",
    "/me/a@b.com",
    // META-CT-PARAM-1 (DECISION 33): `ct` is allowed, but it does not launder another parameter.
    "/practice-hub?ct=1&x=1",
  ])("skips the current address %s", (address) => {
    setLocation(address);
    trackPageview(new URL(address, "https://x.test").pathname);
    expect(added().filter((e) => e[0] === "track")).toEqual([]);
  });

  it.each([
    "/",
    "/practice-hub?cbq=1&utm_source=fb&fbclid=x",
    "/pricing?gclid=G1",
    "/notes/areas-related-to-circles",
    // META-CT-PARAM-1 (DECISION 33): the Chapter Test ad landing (#1043's `?ct=1`, a boolean flag like cbq).
    "/practice-hub?ct=1",
    "/practice-hub?ct=1&utm_source=fb&fbclid=x",
  ])(
    "sends for the current address %s",
    (address) => {
      setLocation(address);
      trackPageview(new URL(address, "https://x.test").pathname);
      expect(added()).toEqual([["track", "PageView"]]);
    },
  );
});

describe("Meta — referrer", () => {
  it.each([
    "https://www.lazytopper.com/u/TOKEN123",
    "https://lazytopper.com/login?oobCode=x",
    "https://lazytopper.firebaseapp.com/__/auth/handler?apiKey=k&mode=signIn",
  ])("skips for referrer %s", (referrer) => {
    setReferrer(referrer);
    trackPageview("/practice-hub");
    expect(added()).toEqual([]);
  });

  it.each(["", "https://www.lazytopper.com/practice-hub", "https://www.google.com/", "https://l.facebook.com/"])(
    "sends for referrer %j",
    (referrer) => {
      setReferrer(referrer);
      trackPageview("/practice-hub");
      expect(added()).toEqual([["track", "PageView"]]);
    },
  );
});

describe("Meta — purge on an unclean address", () => {
  it("removes queued track entries but keeps set + init in order", () => {
    (w.fbq as Fbq).queue.push(["track", "PageView"] as unknown as ArrayLike<unknown>);
    setLocation("/login?next=x");
    trackPageview("/login");
    expect(queue()).toEqual([
      ["set", "autoConfig", false, PIXEL],
      ["init", PIXEL],
    ]);
    expect(added()).toEqual([]);
  });
});

describe("Meta — before the library loads", () => {
  beforeEach(() => installFbq(false));

  it("holds a clean call out of the queue, then sends it on lt:fbq-ready", () => {
    trackPageview("/practice-hub");
    expect(queue().filter((e) => e[0] === "track")).toEqual([]);
    setLoaded();
    ready();
    expect(calls).toEqual([["track", "PageView"]]);
  });

  it("★ discards pending calls if the address became unclean before ready", () => {
    trackPageview("/practice-hub");
    setLocation("/practice-hub?x=1");
    setLoaded();
    ready();
    expect(calls).toEqual([]);
  });

  it("an unclean call empties the pending list", () => {
    trackPageview("/practice-hub");
    setLocation("/login?next=x");
    trackPageview("/login");
    setLocation("/practice-hub");
    setLoaded();
    ready();
    expect(calls).toEqual([]);
  });

  it("holds sign_up and sends CompleteRegistration on ready", () => {
    trackSignUp();
    setLoaded();
    ready();
    expect(calls).toEqual([["track", "CompleteRegistration"]]);
  });
});

describe("Meta — named events", () => {
  it("maps exactly the two PR-1 events", () => {
    expect(Object.keys(META_EVENTS).sort()).toEqual(["sign_up", "trial_start"]);
  });

  it.each(Object.entries(META_EVENTS))("fires %s as one two-argument entry", (name, [method, metaName]) => {
    if (name === "sign_up") trackSignUp();
    else trackNamedEvent(name as NamedAnalyticsEvent);
    const entries = added();
    expect(entries).toEqual([[method, metaName]]);
    expect(entries[0]).toHaveLength(2);
  });

  it.each([
    "free_check_used_block",
    "free_check_signup",
    "free_check_trial_start",
    "check_question_read",
    "check_answer_added",
    "check_graded",
  ] as NamedAnalyticsEvent[])("sends nothing to Meta for %s", (name) => {
    trackNamedEvent(name);
    expect(added()).toEqual([]);
  });
});

describe("Meta — gating and plumbing", () => {
  it("sends nothing in an automated context", () => {
    setLocation("/practice-hub", "127.0.0.1");
    trackPageview("/practice-hub");
    expect(added()).toEqual([]);
  });

  it("a throwing fbq neither throws nor stops gtag", () => {
    const gtag = vi.fn();
    w.gtag = gtag;
    w.fbq = () => {
      throw new Error("boom");
    };
    expect(() => trackPageview("/practice-hub")).not.toThrow();
    expect(gtag.mock.calls.some((c) => c[1] === "page_view")).toBe(true);
  });
});

describe("metaAddressIsClean", () => {
  const loc = (pathname: string, search = "", hash = "", hostname = "www.lazytopper.com") => ({
    pathname,
    search,
    hash,
    hostname,
  });
  it.each([
    [loc("/pricing"), "", true],
    [loc("/pricing/"), "", false],
    [loc("/pricing", "", "#x"), "", false],
    [loc("/pricing", "?utm_source=a&cbq=1"), "", true],
    [loc("/pricing", "?next=%2Fhome"), "", false],
    [loc("/pricing"), "https://www.google.com/search?q=a#h", false],
  ])("%j with referrer %j -> %s", (location, referrer, expected) => {
    expect(metaAddressIsClean(location, referrer)).toBe(expected);
  });
});
