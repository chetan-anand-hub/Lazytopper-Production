import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { UserCredential } from "firebase/auth";

const { getAdditionalUserInfo } = vi.hoisted(() => ({
  getAdditionalUserInfo: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));

import {
  ga4AdParams,
  ga4PageLocation,
  ga4PageReferrer,
  routerPathOf,
  trackNamedEvent,
  trackPageview,
  trackSignUp,
  trackSignUpIfNew,
} from "./analytics";

/**
 * GA4-1 — the GA4 half of `send()` (owner ruling 2026-09-29, spec §2 G2/G3/G5).
 *
 * `window.gtag` is stubbed exactly as the index.html block defines it — every call is
 * pushed onto `window.dataLayer` — so what these tests read IS the dataLayer gtag.js
 * would consume. The basename is stubbed to the production value (`/base/`, vite.config.ts)
 * because the redaction depends on it: `/base/u/<token>` only matches normalisePath's
 * `^/u/` rule once the basename is stripped.
 *
 * ★ Mutation M3 (optional) — stop keeping `gclid` in ga4AdParams -> this file goes red.
 */
const ORIGIN = "https://www.lazytopper.com";
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

type Win = { gtag?: unknown; dataLayer?: Array<ArrayLike<unknown>>; va?: unknown };
const w = window as unknown as Win;

function dataLayer(): unknown[][] {
  return (w.dataLayer ?? []).map((entry) => Array.from(entry));
}

function events(): unknown[][] {
  return dataLayer().filter((e) => e[0] === "event");
}

let vercel: Array<[string, Record<string, unknown>]>;

beforeEach(() => {
  // A stubbed, NON-EMPTY base exercises the basename stripping; production's base is "/"
  // (empty basename) since ROOT-URL-1, where routerPathOf is the identity.
  vi.stubEnv("BASE_URL", "/base/");
  w.dataLayer = [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  vercel = [];
  w.va = (kind: string, payload: Record<string, unknown>) => vercel.push([kind, payload]);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  setLocation("/base/notes/electricity?gclid=Cj0-G1&utm_source=google&oobCode=SECRET&email=a%40b.c");
  setReferrer("https://www.google.com/search?q=private+words");
});

afterEach(() => {
  delete w.gtag;
  delete w.dataLayer;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  setReferrer("");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GA4 — the precondition these tests stand on", () => {
  it("the stubbed basename is the one routerPathOf/ga4PageLocation read", () => {
    expect(import.meta.env.BASE_URL).toBe("/base/");
    expect(routerPathOf("/base/u/abc")).toBe("/u/abc");
    expect(ga4PageLocation("/", "", ORIGIN)).toBe(`${ORIGIN}/base/`);
  });
});

describe("GA4 — page views (G2 + G3)", () => {
  it("★ sends gtag('set', …) FIRST, then event 'page_view', both with the redacted address", () => {
    trackPageview("/notes/electricity");
    const layer = dataLayer();
    expect(layer.map((e) => e[0])).toEqual(["set", "event"]);
    const expected = {
      page_location: `${ORIGIN}/base/notes/electricity?gclid=Cj0-G1&utm_source=google`,
      page_referrer: "https://www.google.com/",
    };
    expect(layer[0]).toEqual(["set", expected]);
    expect(layer[1]).toEqual(["event", "page_view", expected]);
  });

  it("★ every hit keeps gclid and utm_*, and nothing else from the query or the hash", () => {
    setLocation("/base/pricing?utm_medium=cpc&oobCode=SECRET&gclid=G2&continueUrl=x#frag");
    trackPageview("/pricing");
    trackSignUp();
    const hits = dataLayer();
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      const params = hit[hit.length - 1] as Record<string, string>;
      expect(params.page_location).toBe(`${ORIGIN}/base/pricing?utm_medium=cpc&gclid=G2`);
      expect(params.page_location).toContain("gclid=G2");
    }
    const sent = JSON.stringify(hits);
    for (const secret of ["SECRET", "oobCode", "continueUrl", "frag", "private"]) {
      expect(sent).not.toContain(secret);
    }
  });

  it("★★ a navigation to /u/<token> produces NO dataLayer entry containing the token", () => {
    const token = "e".repeat(64);
    setLocation(`/base/u/${token}`);
    setReferrer(`${ORIGIN}/base/u/${token}`);
    trackPageview(`/u/${token}`);
    trackSignUp();
    const sent = JSON.stringify(dataLayer());
    expect(sent).not.toContain(token);
    // CONTROL — hits WERE sent, so the absence of the token is not the absence of data.
    expect(events()).toHaveLength(2);
    expect(sent).toContain(`${ORIGIN}/base/u/:token`);
  });

  it("the Vercel binding is unchanged by GA4 (same call, same payload)", () => {
    trackPageview("/notes/electricity");
    expect(vercel).toEqual([["pageview", { route: "/notes/electricity", path: "/notes/electricity" }]]);
  });
});

describe("GA4 — events (G3)", () => {
  it("★ sign_up goes to GA4 as the recommended 'sign_up' event, ONCE, with no identifier", () => {
    trackSignUp();
    const ev = events();
    expect(ev).toHaveLength(1);
    expect(ev[0][1]).toBe("sign_up");
    expect(Object.keys(ev[0][2] as object).sort()).toEqual(["page_location", "page_referrer"]);
    expect(JSON.stringify(dataLayer())).not.toMatch(/uid|email|phone|question/i);
  });

  it("★ a NEW account fires sign_up once; a returning login fires nothing (CONTROL)", () => {
    getAdditionalUserInfo.mockReturnValue({ isNewUser: false });
    trackSignUpIfNew({} as UserCredential);
    expect(events()).toHaveLength(0);
    getAdditionalUserInfo.mockReturnValue({ isNewUser: true });
    trackSignUpIfNew({} as UserCredential);
    expect(events().map((e) => e[1])).toEqual(["sign_up"]);
  });

  it.each(["free_check_used_block", "free_check_signup", "free_check_trial_start", "trial_start"] as const)(
    "named event %s is forwarded by name, with only the redacted address",
    (name) => {
      trackNamedEvent(name);
      const ev = events();
      expect(ev).toHaveLength(1);
      expect(ev[0][1]).toBe(name);
      expect(Object.keys(ev[0][2] as object).sort()).toEqual(["page_location", "page_referrer"]);
    },
  );
});

describe("GA4 — never breaks the page, never runs where it must not", () => {
  it("★ gtag ABSENT (a /u/ page, a blocked script): nothing throws, and Vercel still counts", () => {
    delete w.gtag;
    expect(() => trackPageview("/")).not.toThrow();
    expect(() => trackSignUp()).not.toThrow();
    expect(vercel.map(([k]) => k)).toEqual(["pageview", "event"]);
  });

  it("gtag THROWING does not throw, and does not cost Vercel its hit", () => {
    w.gtag = () => {
      throw new Error("gtag exploded");
    };
    expect(() => trackPageview("/notes/electricity")).not.toThrow();
    expect(vercel).toHaveLength(1);
  });

  it("CONTROL — the loopback capture origin sends GA4 nothing", () => {
    setLocation("/base/", "127.0.0.1");
    trackPageview("/");
    trackSignUp();
    expect(dataLayer()).toEqual([]);
  });
});

describe("GA4 — the pure redaction functions", () => {
  it("ga4AdParams keeps only gclid and utm_* (byte-for-byte), drops look-alikes", () => {
    expect(ga4AdParams("?gclid=A&utm_source=g&utm_campaign=board%20prep&q=x")).toBe(
      "?gclid=A&utm_source=g&utm_campaign=board%20prep",
    );
    expect(ga4AdParams("?gclidx=1&xutm_source=2&GCLID=3")).toBe("");
    expect(ga4AdParams("")).toBe("");
  });

  it("ga4PageReferrer keeps the origin only, drops credentials, and blanks non-http referrers", () => {
    expect(ga4PageReferrer("https://www.google.com/search?q=x")).toBe("https://www.google.com/");
    expect(ga4PageReferrer("https://user:pw@evil.example:8443/p")).toBe("https://evil.example:8443/");
    expect(ga4PageReferrer(`${ORIGIN}/base/u/${"f".repeat(64)}`)).toBe(`${ORIGIN}/`);
    expect(ga4PageReferrer("android-app://com.google.android.gm/")).toBe("");
    expect(ga4PageReferrer("")).toBe("");
  });

  it("routerPathOf strips only a real basename segment", () => {
    expect(routerPathOf("/base", "/base")).toBe("/");
    expect(routerPathOf("/base/", "/base")).toBe("/");
    expect(routerPathOf("/basement/x", "/base")).toBe("/basement/x");
    expect(routerPathOf("/u/tok", "/base")).toBe("/u/tok");
  });
});
