// @vitest-environment node
import { describe, expect, it } from "vitest";
import middleware, {
  advertisedPathsFrom,
  config,
  deploymentPinCookie,
  desktopVariantPath,
  deviceVariantFor,
  isDocumentRequest,
  pinAssetsToDeployment,
  serveRequest,
  type PinEnv,
} from "../../../middleware";
import { desktopVariantFile } from "../../scripts/seo/applyPrerendered";
import { sitemapPaths } from "../config/sitemapUrls";

/**
 * CHUNK-RESILIENCE-1 K3 — the repo-root Routing Middleware (middleware.ts).
 *
 * ★ WHY THIS FILE IS HERE AND NOT NEXT TO middleware.ts. The CI step "Vitest suites
 * (lazytopper)" runs `vitest run` with include `src/**` + `.test.{ts,tsx}`; a test at the
 * repo root would be picked up by NO runner — a test nobody runs is not a test. Importing
 * the root file from here also puts it inside `typecheck:test` (tsconfig.test.json).
 *
 * ROOT-URL-1 (M3): the app is served at the domain root, so documents are root paths and
 * the cookie is scoped `Path=/assets`. A request under the retired base is NEVER pinned —
 * vercel.json redirects it (308) before it is a document this deployment serves.
 */
const ID = "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3";
const ON: PinEnv = { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: ID };
const EXPECTED = `__vdpl=${ID}; Path=/assets; Max-Age=604800; Secure; HttpOnly; SameSite=Lax`;

const req = (path: string, init: RequestInit = {}) =>
  new Request(`https://www.lazytopper.com${path}`, init);
const run = (path: string, env: PinEnv = ON, init: RequestInit = {}) =>
  pinAssetsToDeployment(req(path, init), () => env);
const cookieOf = (res: Response | undefined) => (res ? res.headers.get("set-cookie") : null);

describe("K1 — a document request at the root gets exactly the pin cookie", () => {
  for (const path of ["/", "/pricing", "/notes/trigonometry", "/topic-hub/trigonometry", "/cbse/class-10", "/application"]) {
    it(`GET ${path}`, () => {
      expect(cookieOf(run(path))).toBe(EXPECTED);
    });
  }

  it("HEAD (curl -I) gets it too", () => {
    expect(cookieOf(run("/pricing", ON, { method: "HEAD" }))).toBe(EXPECTED);
  });

  it("a browser navigation (Sec-Fetch-Dest: document) gets it", () => {
    expect(cookieOf(run("/pricing", ON, { headers: { "sec-fetch-dest": "document" } }))).toBe(EXPECTED);
  });

  it("the response is a pass-through (x-middleware-next) that adds ONLY Set-Cookie", () => {
    const res = run("/pricing");
    expect(res).toBeInstanceOf(Response);
    const names = [...res!.headers.keys()].sort();
    expect(names).toEqual(["set-cookie", "x-middleware-next"]);
    expect(res!.headers.get("x-middleware-next")).toBe("1");
    expect(res!.status).toBe(200);
  });

  it("the cookie is scoped to /assets — NEVER Path=/ (that would pin page navigations)", () => {
    const cookie = deploymentPinCookie(ON)!;
    const paths = cookie
      .split(";")
      .map((part) => part.trim())
      .filter((part) => /^path=/i.test(part));
    expect(paths).toEqual(["Path=/assets"]);
    expect(cookie).not.toMatch(/Path=\/(;|$)/);
  });
});

describe("ROOT-URL-1 — a request under the retired /app base is NOT pinned (vercel.json 308s it)", () => {
  for (const path of ["/app", "/app/", "/app/pricing", "/app/check-improve", "/app/notes/trigonometry"]) {
    it(`GET ${path} -> no cookie, request untouched`, () => {
      expect(run(path)).toBeUndefined();
      expect(isDocumentRequest(req(path))).toBe(false);
    });
  }

  it("the matcher does not even invoke the middleware for them", () => {
    const patterns = config.matcher.map((m) => new RegExp(`^${m}$`));
    for (const path of ["/app", "/app/", "/app/pricing", "/app/assets/x.js"]) {
      expect(patterns.some((p) => p.test(path)), path).toBe(false);
    }
  });
});

describe("K1 — nothing else gets a cookie", () => {
  for (const path of [
    "/assets/DesktopNotesPage-AbC123.js",
    "/assets/index-XyZ.css",
    "/assets",
    "/api/grade",
    "/api/",
    "/api",
    "/shared-api/tutor",
    "/_vercel/insights/script.js",
    "/_vercel/insights/view",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/favicon.svg",
    "/version.json",
    "/og-image.png",
  ]) {
    it(`GET ${path} -> no cookie, request untouched`, () => {
      expect(run(path)).toBeUndefined();
    });
  }

  it("a script / style / image fetch (Sec-Fetch-Dest not document) -> none", () => {
    for (const dest of ["script", "style", "image", "empty"]) {
      expect(run("/pricing", ON, { headers: { "sec-fetch-dest": dest } })).toBeUndefined();
    }
  });

  it("a POST -> none", () => {
    expect(run("/pricing", ON, { method: "POST", body: "x" })).toBeUndefined();
  });

  it("Skew Protection flag off / absent -> none", () => {
    expect(run("/pricing", { VERCEL_DEPLOYMENT_ID: ID })).toBeUndefined();
    expect(run("/pricing", { VERCEL_DEPLOYMENT_ID: ID, VERCEL_SKEW_PROTECTION_ENABLED: "0" })).toBeUndefined();
    expect(run("/pricing", { VERCEL_DEPLOYMENT_ID: ID, VERCEL_SKEW_PROTECTION_ENABLED: "" })).toBeUndefined();
  });

  it("deployment id missing / empty / malformed -> none", () => {
    expect(run("/pricing", { VERCEL_SKEW_PROTECTION_ENABLED: "1" })).toBeUndefined();
    expect(run("/pricing", { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: "" })).toBeUndefined();
    expect(
      run("/pricing", { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: "dpl_x; Path=/" }),
    ).toBeUndefined();
  });
});

describe("OR-C2 — FAIL OPEN: an internal error passes the request through unchanged, with no cookie", () => {
  it("a throwing environment accessor -> undefined, does not throw", () => {
    const throwingEnv = () => {
      throw new Error("injected fault: env unavailable");
    };
    expect(() => pinAssetsToDeployment(req("/pricing"), throwingEnv)).not.toThrow();
    expect(pinAssetsToDeployment(req("/pricing"), throwingEnv)).toBeUndefined();
  });

  it("a throwing property getter on the env -> undefined", () => {
    const env = {
      VERCEL_SKEW_PROTECTION_ENABLED: "1",
      get VERCEL_DEPLOYMENT_ID(): string {
        throw new Error("injected fault: getter");
      },
    };
    expect(pinAssetsToDeployment(req("/pricing"), () => env)).toBeUndefined();
  });

  it("a request whose url accessor throws -> undefined", () => {
    const broken = new Proxy(req("/pricing"), {
      get(target, prop) {
        if (prop === "url") throw new Error("injected fault: url");
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Request;
    expect(pinAssetsToDeployment(broken, () => ON)).toBeUndefined();
  });

  it("the default export never throws either (reads process.env inside the guard)", () => {
    expect(() => middleware(req("/pricing"))).not.toThrow();
  });
});

describe("config — invocation limited to pages", () => {
  it("one matcher: every path except assets, the API proxies, /_vercel/ and the retired base", () => {
    expect(config.matcher).toEqual(["/((?!assets/|api/|shared-api/|_vercel/|app/|app$).*)"]);
    expect(config.runtime).toBe("nodejs");
  });

  it("isDocumentRequest agrees with the path rules", () => {
    expect(isDocumentRequest(req("/notes/trigonometry"))).toBe(true);
    expect(isDocumentRequest(req("/assets/x.js"))).toBe(false);
  });

  it("document-only: never /assets/*, /api/*, /shared-api/*, /_vercel/* (matcher AND code path)", () => {
    // Every matcher entry, anchored ("/" needs no escape inside new RegExp).
    const patterns = config.matcher.map((m) => new RegExp(`^${m}$`));
    const matched = (path: string) => patterns.some((p) => p.test(path));
    for (const path of ["/", "/pricing", "/notes/trigonometry", "/application", "/apps"]) {
      expect(matched(path), path).toBe(true);
    }
    for (const path of ["/assets/x.js", "/api/grade", "/api/", "/shared-api/tutor", "/_vercel/insights/script.js"]) {
      expect(matched(path), path).toBe(false);
      expect(isDocumentRequest(req(path)), path).toBe(false);
    }
  });
});

/**
 * SEO-5 PR-2 (D2) — DEVICE SERVING. Pin (b): a desktop client (Sec-CH-UA-Mobile: ?0, else a
 * non-mobile UA) is rewritten to the 1280-px variant; mobile, unknown and a thrown error get
 * the page's own 390-px file. `Vary` on both. Canonical unchanged = the URL never changes
 * (a rewrite, never a redirect).
 *
 * ★ EVERY CASE NAMES THE VARIANT IT EXPECTS, NEVER JUST "NOT DESKTOP". A rewrite carries
 * `x-middleware-rewrite` (the destination); the mobile file is a pass-through carrying
 * `x-middleware-next`. Asserting the destination per case is what makes a desktop client
 * silently served mobile go RED (the mutation), rather than read as "some response".
 */
describe("SEO-5 PR-2 (D2) — each device gets its own capture of an advertised page", () => {
  const UA = {
    googlebotSmartphone:
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.71 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    googlebotDesktop:
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/129.0.6668.71 Safari/537.36",
    chromeDesktop:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    safariMac:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    chromeAndroid:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    safariIphone:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    androidTablet:
      "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
  const ADVERTISED = new Set(["/", "/notes/trigonometry", "/topic-hub/trigonometry", "/exam-trends", "/pricing"]);
  const serve = (path: string, headers: Record<string, string> = {}, env: PinEnv = {}) =>
    serveRequest(req(path, { headers }), () => env, ADVERTISED);
  /** "desktop" when rewritten to the variant, "mobile" when the page's own file passes through. */
  const variantOf = (res: Response | undefined): { variant: string; to: string | null } => {
    if (!res) return { variant: "mobile(untouched)", to: null };
    const to = res.headers.get("x-middleware-rewrite");
    if (to) return { variant: "desktop", to: new URL(to).pathname };
    return { variant: res.headers.get("x-middleware-next") === "1" ? "mobile" : "unknown", to: null };
  };

  const CASES: Array<[string, Record<string, string>, "mobile" | "desktop"]> = [
    ["Googlebot smartphone", { "user-agent": UA.googlebotSmartphone }, "mobile"],
    ["Googlebot desktop", { "user-agent": UA.googlebotDesktop }, "desktop"],
    ["Chrome desktop UA, no hint", { "user-agent": UA.chromeDesktop }, "desktop"],
    ["Safari macOS", { "user-agent": UA.safariMac }, "desktop"],
    ["Chrome Android", { "user-agent": UA.chromeAndroid }, "mobile"],
    ["Safari iPhone", { "user-agent": UA.safariIphone }, "mobile"],
    ["Android tablet, no Mobile token", { "user-agent": UA.androidTablet }, "mobile"],
    ["hint ?0 wins over a mobile UA", { "sec-ch-ua-mobile": "?0", "user-agent": UA.chromeAndroid }, "desktop"],
    ["hint ?1 wins over a desktop UA", { "sec-ch-ua-mobile": "?1", "user-agent": UA.chromeDesktop }, "mobile"],
    ["hint ?0 and no UA", { "sec-ch-ua-mobile": "?0" }, "desktop"],
    ["malformed hint, the UA decides", { "sec-ch-ua-mobile": "yes", "user-agent": UA.chromeDesktop }, "desktop"],
    ["no UA and no hint (unknown client)", {}, "mobile"],
    ["blank UA (unknown client)", { "user-agent": "   " }, "mobile"],
  ];

  it.each(CASES)("%s -> %s", (_label, headers, expected) => {
    const res = serve("/notes/trigonometry", headers);
    const { variant, to } = variantOf(res);
    expect(variant).toBe(expected);
    expect(to).toBe(expected === "desktop" ? "/__desktop/notes/trigonometry.html" : null);
    expect(res?.headers.get("vary")).toBe("User-Agent, Sec-CH-UA-Mobile");
  });

  it("deviceVariantFor agrees with the table (the pure classifier)", () => {
    expect(deviceVariantFor(new Headers({ "user-agent": UA.googlebotDesktop }))).toBe("desktop");
    expect(deviceVariantFor(new Headers({ "user-agent": UA.googlebotSmartphone }))).toBe("mobile");
    expect(deviceVariantFor(new Headers())).toBe("mobile");
  });

  it("the root's desktop variant is /__desktop/index.html; a trailing slash is the same page", () => {
    expect(variantOf(serve("/", { "user-agent": UA.chromeDesktop })).to).toBe("/__desktop/index.html");
    expect(variantOf(serve("/exam-trends/", { "user-agent": UA.chromeDesktop })).to).toBe("/__desktop/exam-trends.html");
  });

  it("the rewrite keeps the query string, and the URL the reader sees never changes (no redirect)", () => {
    const res = serve("/pricing?source=x", { "user-agent": UA.chromeDesktop });
    expect(res?.status).toBe(200);
    expect(res?.headers.get("location")).toBeNull();
    expect(new URL(res?.headers.get("x-middleware-rewrite") ?? "").search).toBe("?source=x");
  });

  it("a non-advertised document (/me, an unknown URL) is NOT device-served: no rewrite, no Vary", () => {
    for (const path of ["/me", "/login", "/notes/does-not-exist", "/welcome"]) {
      expect(serve(path, { "user-agent": UA.chromeDesktop }), path).toBeUndefined();
    }
  });

  it("non-documents are untouched: assets, api, a static file, a script fetch, a POST", () => {
    expect(serve("/assets/index-AbCdEfGh.js", { "user-agent": UA.chromeDesktop })).toBeUndefined();
    expect(serve("/api/grade", { "user-agent": UA.chromeDesktop })).toBeUndefined();
    expect(serve("/robots.txt", { "user-agent": UA.chromeDesktop })).toBeUndefined();
    expect(serve("/notes/trigonometry", { "user-agent": UA.chromeDesktop, "sec-fetch-dest": "script" })).toBeUndefined();
    const post = req("/notes/trigonometry", { method: "POST", body: "x", headers: { "user-agent": UA.chromeDesktop } });
    expect(serveRequest(post, () => ({}), ADVERTISED)).toBeUndefined();
  });

  it("the K1 pin cookie survives on BOTH variants (Path=/assets, unchanged)", () => {
    const desktop = serve("/notes/trigonometry", { "user-agent": UA.chromeDesktop }, ON);
    const mobile = serve("/notes/trigonometry", { "user-agent": UA.chromeAndroid }, ON);
    expect(desktop?.headers.get("set-cookie")).toBe(EXPECTED);
    expect(mobile?.headers.get("set-cookie")).toBe(EXPECTED);
    // ...and a non-advertised document still gets exactly the cookie, as before this change.
    const me = serve("/me", { "user-agent": UA.chromeDesktop }, ON);
    expect([...(me?.headers.keys() ?? [])].sort()).toEqual(["set-cookie", "x-middleware-next"]);
  });

  it("a DIRECT request for a /__desktop/ URL is noindex (and never rewritten again)", () => {
    for (const path of ["/__desktop/notes/trigonometry.html", "/__desktop/index.html", "/__desktop"]) {
      const res = serve(path, { "user-agent": UA.googlebotDesktop });
      expect(res?.headers.get("x-robots-tag"), path).toBe("noindex");
      expect(res?.headers.get("x-middleware-rewrite") ?? null, path).toBeNull();
    }
    // CONTROL — the real URL, served the SAME variant file, carries no noindex.
    const real = serve("/notes/trigonometry", { "user-agent": UA.googlebotDesktop });
    expect(real?.headers.get("x-robots-tag")).toBeNull();
    expect(variantOf(real).variant).toBe("desktop");
  });

  it("FAIL OPEN TO MOBILE — a thrown error in device serving gives the page's own file", () => {
    const broken = new Proxy(req("/notes/trigonometry", { headers: { "user-agent": UA.chromeDesktop } }), {
      get(target, prop) {
        if (prop === "headers") throw new Error("injected fault: headers");
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Request;
    let res: Response | undefined;
    expect(() => {
      res = serveRequest(broken, () => ({}), ADVERTISED);
    }).not.toThrow();
    expect(res?.headers.get("x-middleware-rewrite") ?? null).toBeNull();
    // CONTROL — the same request without the fault IS rewritten, so the fault is what decided.
    expect(variantOf(serve("/notes/trigonometry", { "user-agent": UA.chromeDesktop })).variant).toBe("desktop");
  });

  it("FAIL OPEN TO MOBILE — a malformed manifest means no desktop paths at all", () => {
    expect(advertisedPathsFrom(null).size).toBe(0);
    expect(advertisedPathsFrom({ paths: "nope" }).size).toBe(0);
    expect(advertisedPathsFrom({ paths: ["/ok", 3, null, "no-slash"] })).toEqual(new Set(["/ok"]));
  });

  it("the default export reads the COMMITTED manifest: every advertised page is device-served", () => {
    const paths = sitemapPaths();
    expect(paths.length).toBeGreaterThan(50);
    for (const path of paths) {
      const res = middleware(req(path, { headers: { "user-agent": UA.chromeDesktop } }));
      expect(variantOf(res).to, path).toBe(desktopVariantPath(path));
    }
  });

  it("middleware's desktopVariantPath and applyPrerendered's desktopVariantFile agree for every advertised path", () => {
    for (const path of sitemapPaths()) {
      expect(desktopVariantPath(path)).toBe(`/${desktopVariantFile(path)}`);
    }
  });
});
