/**
 * SOURCE-1 — the client half: capture the coarse source of a visit in THIS TAB's
 * sessionStorage, send it once at sign-up to our own server, delete the key.
 *
 * Owner ruling 12 Oct 2026 13:16 IST (DECISION 107c): tab-scoped sessionStorage only,
 * coarse fields only, sent once at sign-up to our server only, nothing to any vendor.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";

const { getAdditionalUserInfo } = vi.hoisted(() => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import RouteAnalytics from "./RouteAnalytics";
import {
  VISIT_SOURCE_KEY,
  SIGNUP_SOURCE_ENDPOINT,
  captureVisitSource,
  rememberVisitSourceOnce,
  resetVisitSourceAttempt,
  sendVisitSourceIfNewUser,
  sendVisitSourceOnSignUp,
} from "./visitSource";

const OWN = "www.lazytopper.com";
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetVisitSourceAttempt();
  getAdditionalUserInfo.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("captureVisitSource", () => {
  it("★ drops a same-site referrer: nothing but a same-site navigation -> null", () => {
    expect(captureVisitSource({ pathname: "/notes", search: "" }, "https://www.lazytopper.com/pricing", OWN)).toBeNull();
    expect(captureVisitSource({ pathname: "/notes", search: "" }, "https://lazytopper.com/", OWN)).toBeNull();
    expect(captureVisitSource({ pathname: "/notes", search: "" }, "https://app.lazytopper.com/x", OWN)).toBeNull();
  });

  it("★ a youtube.com referrer with utm_source=youtube -> the expected object", () => {
    const got = captureVisitSource(
      { pathname: "/", search: "?utm_source=youtube&utm_medium=paid&utm_campaign=test&utm_content=v1" },
      "https://www.youtube.com/watch?v=SECRET123&list=abc",
      OWN,
    );
    expect(got).toEqual({
      ref: "www.youtube.com",
      utm_source: "youtube",
      utm_medium: "paid",
      utm_campaign: "test",
      utm_content: "v1",
      landing: "/",
      gclid: false,
      fbclid: false,
    });
  });

  it("the referrer is a HOSTNAME only — never a path or query", () => {
    const got = captureVisitSource({ pathname: "/", search: "" }, "https://www.google.com/search?q=cbse+class+10", OWN);
    expect(got?.ref).toBe("www.google.com");
    expect(JSON.stringify(got)).not.toMatch(/search|q=|cbse/);
  });

  it("★ gclid and fbclid are BOOLEANS: the value never appears anywhere in the object", () => {
    const got = captureVisitSource(
      { pathname: "/pricing", search: "?gclid=EAIaIQobChMISECRETVALUE&fbclid=IwAR0SECRET2" },
      "",
      OWN,
    );
    expect(got?.gclid).toBe(true);
    expect(got?.fbclid).toBe(true);
    expect(JSON.stringify(got)).not.toMatch(/SECRET/);
    expect(captureVisitSource({ pathname: "/", search: "?gclid=" }, "", OWN)?.gclid).toBe(false);
  });

  it("a click id with a same-site referrer still counts as something (it is not a plain hop)", () => {
    expect(captureVisitSource({ pathname: "/", search: "?gclid=x" }, "https://www.lazytopper.com/", OWN)?.gclid).toBe(true);
  });

  it("a direct visit (no referrer, no tags) is a real 'Direct': an object with ref null", () => {
    expect(captureVisitSource({ pathname: "/", search: "" }, "", OWN)).toEqual({
      ref: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      landing: "/",
      gclid: false,
      fbclid: false,
    });
  });

  it("utm values: trimmed to 64 chars, charset [A-Za-z0-9_.-{}], else dropped", () => {
    const long = "a".repeat(80);
    const got = captureVisitSource(
      { pathname: "/", search: `?utm_source=${long}&utm_medium=pa%20id&utm_campaign=%7Bcampaignid%7D&utm_content=%3Cb%3E` },
      "",
      OWN,
    );
    expect(got?.utm_source).toBe("a".repeat(64));
    expect(got?.utm_medium).toBeNull();
    expect(got?.utm_campaign).toBe("{campaignid}");
    expect(got?.utm_content).toBeNull();
  });

  it("★ the landing is a normalised path: no query, no hash, identifiers redacted", () => {
    const got = captureVisitSource({ pathname: "/u/TOKEN12345678901234567890/x", search: "?utm_source=a" }, "", OWN);
    expect(got?.landing).toBe("/u/:token");
    expect(captureVisitSource({ pathname: "/notes/", search: "?a=1" }, "", OWN)?.landing).toBe("/notes");
  });

  it("junk or non-http referrers are ignored", () => {
    expect(captureVisitSource({ pathname: "/", search: "" }, "android-app://com.google.android.gm", OWN)?.ref).toBeNull();
    expect(captureVisitSource({ pathname: "/", search: "" }, "not a url", OWN)?.ref).toBeNull();
  });
});

describe("rememberVisitSourceOnce", () => {
  it("writes the key once per tab and never overwrites it", () => {
    rememberVisitSourceOnce({ pathname: "/", search: "?utm_source=youtube" }, "", OWN);
    const first = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    expect(JSON.parse(first as string).utm_source).toBe("youtube");
    resetVisitSourceAttempt(); // a reload in the same tab
    rememberVisitSourceOnce({ pathname: "/", search: "?utm_source=google" }, "", OWN);
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBe(first);
  });

  it("only the FIRST call of a document load looks (later SPA routes carry a stale referrer)", () => {
    rememberVisitSourceOnce({ pathname: "/", search: "" }, "https://www.lazytopper.com/", OWN); // same-site hop: nothing
    rememberVisitSourceOnce({ pathname: "/pricing", search: "?utm_source=meta" }, "", OWN);
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull();
  });

  it("★ the query string is never stored", () => {
    rememberVisitSourceOnce(
      { pathname: "/", search: "?utm_source=youtube&oobCode=SECRETCODE&email=kid@example.com&gclid=ABC" },
      "https://www.youtube.com/watch?v=VIDEOID",
      OWN,
    );
    const raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY) as string;
    expect(raw).not.toMatch(/SECRETCODE|kid@|example\.com|VIDEOID|ABC|\?|=/);
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(
      ["fbclid", "gclid", "landing", "ref", "utm_campaign", "utm_content", "utm_medium", "utm_source"],
    );
  });

  it("★ localStorage, cookies and any other store are untouched (a throwing localStorage proves it)", () => {
    const ls = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("localStorage must not be touched");
    });
    expect(() => rememberVisitSourceOnce({ pathname: "/", search: "?utm_source=youtube" }, "", OWN)).not.toThrow();
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).not.toBeNull();
    expect(ls).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });

  it("blocked storage never throws", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberVisitSourceOnce({ pathname: "/", search: "?utm_source=youtube" }, "", OWN)).not.toThrow();
  });
});

describe("sendVisitSourceOnSignUp", () => {
  const STORED = { ref: "www.youtube.com", utm_source: "youtube", utm_medium: "paid", utm_campaign: "test", utm_content: null, landing: "/", gclid: false, fbclid: false };

  it("★ POSTs the stored object once with the Bearer token to OUR endpoint, and the key is gone", async () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(STORED));
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    sendVisitSourceOnSignUp(async () => "TOKEN", fetchImpl);
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull();
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(SIGNUP_SOURCE_ENDPOINT);
    expect(url).toBe("/api/signup-source");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer TOKEN");
    expect(JSON.parse(init.body)).toEqual(STORED);
  });

  it("a second sign-up path in the same tab sends nothing (once)", async () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(STORED));
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    sendVisitSourceOnSignUp(async () => "T", fetchImpl);
    sendVisitSourceOnSignUp(async () => "T", fetchImpl);
    await flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("nothing stored -> nothing sent", async () => {
    const fetchImpl = vi.fn();
    sendVisitSourceOnSignUp(async () => "T", fetchImpl);
    await flush();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("★ fire-and-forget: a failing token or fetch never throws and never blocks sign-up", async () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(STORED));
    expect(() => sendVisitSourceOnSignUp(async () => { throw new Error("no token"); }, vi.fn())).not.toThrow();
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(STORED));
    expect(() => sendVisitSourceOnSignUp(async () => "T", vi.fn().mockRejectedValue(new Error("offline")))).not.toThrow();
    await flush();
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull();
  });

  it("sends nothing to any vendor: only our endpoint is ever fetched", async () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(STORED));
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    sendVisitSourceOnSignUp(async () => "T", fetchImpl);
    await flush();
    for (const [url] of fetchImpl.mock.calls) expect(String(url)).toMatch(/^\/api\//);
  });
});

describe("sendVisitSourceIfNewUser (Google / phone are both doors)", () => {
  const credential = { user: { getIdToken: vi.fn().mockResolvedValue("T") } } as never;

  it("a RETURNING student's login sends nothing and keeps the key", () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, "{}");
    getAdditionalUserInfo.mockReturnValue({ isNewUser: false });
    sendVisitSourceIfNewUser(credential);
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBe("{}");
  });

  it("a NEW account consumes the key", () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify({ ref: null }));
    getAdditionalUserInfo.mockReturnValue({ isNewUser: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    sendVisitSourceIfNewUser(credential);
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull();
    vi.unstubAllGlobals();
  });

  it("a throwing getAdditionalUserInfo can never fail a login", () => {
    getAdditionalUserInfo.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => sendVisitSourceIfNewUser(credential)).not.toThrow();
  });
});

describe("★ P13 — the landing query is captured BEFORE App's <Navigate> strips it", () => {
  it("/?utm_source=youtube redirected to /welcome still records the campaign, and the query is gone from the URL", () => {
    window.history.replaceState({}, "", "/?utm_source=youtube&utm_medium=paid&utm_campaign=test");
    render(
      <BrowserRouter>
        <RouteAnalytics />
        <Routes>
          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="/welcome" element={<div>welcome</div>} />
        </Routes>
      </BrowserRouter>,
    );
    // CONTROL: the redirect really happened and really dropped the query.
    expect(window.location.pathname).toBe("/welcome");
    expect(window.location.search).toBe("");
    const stored = JSON.parse(window.sessionStorage.getItem(VISIT_SOURCE_KEY) as string);
    expect(stored.utm_source).toBe("youtube");
    expect(stored.utm_campaign).toBe("test");
    expect(stored.landing).toBe("/");
  });
});

describe("AuthContext call sites", () => {
  it("★ every trackSignUp* call in AuthContext.tsx has a SOURCE-1 send beside it, and Login.tsx is untouched", () => {
    const src = readFileSync(path.join(__dirname, "..", "context", "AuthContext.tsx"), "utf8");
    const signUps = (src.match(/^\s*trackSignUp(IfNew)?\(/gm) ?? []).length;
    const sends = (src.match(/^\s*sendVisitSource(IfNewUser|OnSignUp)\(/gm) ?? []).length;
    expect(signUps).toBe(3);
    expect(sends).toBe(signUps);
    const login = readFileSync(path.join(__dirname, "..", "pages", "Login.tsx"), "utf8");
    expect(login).not.toMatch(/visitSource/);
  });
});
