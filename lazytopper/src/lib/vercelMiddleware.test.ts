// @vitest-environment node
import { describe, expect, it } from "vitest";
import middleware, {
  config,
  deploymentPinCookie,
  isDocumentRequest,
  pinAssetsToDeployment,
  type PinEnv,
} from "../../../middleware";

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
