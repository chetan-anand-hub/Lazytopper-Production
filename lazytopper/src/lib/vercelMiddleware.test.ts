// @vitest-environment node
import { describe, expect, it } from "vitest";
import middleware, {
  config,
  deploymentPinCookie,
  isAppDocumentRequest,
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
 */
const ID = "dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3";
const ON: PinEnv = { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: ID };
const EXPECTED = `__vdpl=${ID}; Path=/app/assets; Max-Age=604800; Secure; HttpOnly; SameSite=Lax`;

const req = (path: string, init: RequestInit = {}) =>
  new Request(`https://www.lazytopper.com${path}`, init);
const run = (path: string, env: PinEnv = ON, init: RequestInit = {}) =>
  pinAssetsToDeployment(req(path, init), () => env);
const cookieOf = (res: Response | undefined) => (res ? res.headers.get("set-cookie") : null);

describe("K1 — a document request under /app/ gets exactly the pin cookie", () => {
  for (const path of ["/app/", "/app/pricing", "/app/notes/trigonometry", "/app/topic-hub/trigonometry", "/app/cbse/class-10", "/app"]) {
    it(`GET ${path}`, () => {
      expect(cookieOf(run(path))).toBe(EXPECTED);
    });
  }

  it("HEAD (curl -I) gets it too", () => {
    expect(cookieOf(run("/app/pricing", ON, { method: "HEAD" }))).toBe(EXPECTED);
  });

  it("a browser navigation (Sec-Fetch-Dest: document) gets it", () => {
    expect(cookieOf(run("/app/pricing", ON, { headers: { "sec-fetch-dest": "document" } }))).toBe(EXPECTED);
  });

  it("the response is a pass-through (x-middleware-next) that adds ONLY Set-Cookie", () => {
    const res = run("/app/pricing");
    expect(res).toBeInstanceOf(Response);
    const names = [...res!.headers.keys()].sort();
    expect(names).toEqual(["set-cookie", "x-middleware-next"]);
    expect(res!.headers.get("x-middleware-next")).toBe("1");
    expect(res!.status).toBe(200);
  });

  it("the cookie is scoped to /app/assets — NEVER Path=/ or Path=/app (that would pin page navigations)", () => {
    const cookie = deploymentPinCookie(ON)!;
    const paths = cookie
      .split(";")
      .map((part) => part.trim())
      .filter((part) => /^path=/i.test(part));
    expect(paths).toEqual(["Path=/app/assets"]);
    expect(cookie).not.toMatch(/Path=\/(;|$)/);
    expect(cookie).not.toMatch(/Path=\/app(;|$)/);
  });
});

describe("K1 — nothing else gets a cookie", () => {
  for (const path of [
    "/app/assets/DesktopNotesPage-AbC123.js",
    "/app/assets/index-XyZ.css",
    "/app/assets",
    "/api/grade",
    "/api/",
    "/shared-api/tutor",
    "/",
    "/pricing",
    "/application",
    "/app/robots.txt",
    "/app/sitemap.xml",
    "/app/og-image.png",
  ]) {
    it(`GET ${path} -> no cookie, request untouched`, () => {
      expect(run(path)).toBeUndefined();
    });
  }

  it("a script / style / image fetch under /app/ (Sec-Fetch-Dest not document) -> none", () => {
    for (const dest of ["script", "style", "image", "empty"]) {
      expect(run("/app/pricing", ON, { headers: { "sec-fetch-dest": dest } })).toBeUndefined();
    }
  });

  it("a POST -> none", () => {
    expect(run("/app/pricing", ON, { method: "POST", body: "x" })).toBeUndefined();
  });

  it("Skew Protection flag off / absent -> none", () => {
    expect(run("/app/pricing", { VERCEL_DEPLOYMENT_ID: ID })).toBeUndefined();
    expect(run("/app/pricing", { VERCEL_DEPLOYMENT_ID: ID, VERCEL_SKEW_PROTECTION_ENABLED: "0" })).toBeUndefined();
    expect(run("/app/pricing", { VERCEL_DEPLOYMENT_ID: ID, VERCEL_SKEW_PROTECTION_ENABLED: "" })).toBeUndefined();
  });

  it("deployment id missing / empty / malformed -> none", () => {
    expect(run("/app/pricing", { VERCEL_SKEW_PROTECTION_ENABLED: "1" })).toBeUndefined();
    expect(run("/app/pricing", { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: "" })).toBeUndefined();
    expect(
      run("/app/pricing", { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: "dpl_x; Path=/" }),
    ).toBeUndefined();
  });
});

describe("OR-C2 — FAIL OPEN: an internal error passes the request through unchanged, with no cookie", () => {
  it("a throwing environment accessor -> undefined, does not throw", () => {
    const throwingEnv = () => {
      throw new Error("injected fault: env unavailable");
    };
    expect(() => pinAssetsToDeployment(req("/app/pricing"), throwingEnv)).not.toThrow();
    expect(pinAssetsToDeployment(req("/app/pricing"), throwingEnv)).toBeUndefined();
  });

  it("a throwing property getter on the env -> undefined", () => {
    const env = {
      VERCEL_SKEW_PROTECTION_ENABLED: "1",
      get VERCEL_DEPLOYMENT_ID(): string {
        throw new Error("injected fault: getter");
      },
    };
    expect(pinAssetsToDeployment(req("/app/pricing"), () => env)).toBeUndefined();
  });

  it("a request whose url accessor throws -> undefined", () => {
    const broken = new Proxy(req("/app/pricing"), {
      get(target, prop) {
        if (prop === "url") throw new Error("injected fault: url");
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Request;
    expect(pinAssetsToDeployment(broken, () => ON)).toBeUndefined();
  });

  it("the default export never throws either (reads process.env inside the guard)", () => {
    expect(() => middleware(req("/app/pricing"))).not.toThrow();
  });
});

describe("config — invocation limited to /app pages", () => {
  it("matcher targets /app and /app/* except /app/assets/", () => {
    expect(config.matcher).toEqual(["/app", "/app/((?!assets/).*)"]);
    expect(config.runtime).toBe("nodejs");
    const pattern = new RegExp(`^${config.matcher[1].replace("/app/", "\\/app\\/")}$`);
    expect(pattern.test("/app/pricing")).toBe(true);
    expect(pattern.test("/app/")).toBe(true);
    expect(pattern.test("/app/assets/x.js")).toBe(false);
  });

  it("isAppDocumentRequest agrees with the path rules", () => {
    expect(isAppDocumentRequest(req("/app/notes/trigonometry"))).toBe(true);
    expect(isAppDocumentRequest(req("/app/assets/x.js"))).toBe(false);
  });
});
