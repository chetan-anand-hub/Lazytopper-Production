import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { describe, it } from "node:test";
import express from "express";

import {
  ALLOW_ANY_ORIGIN,
  CORS_ALLOWLIST_ENV_VAR,
  UNSET_ALLOWLIST_WARNING,
  applySecurityMiddleware,
  parseAllowedOrigins,
} from "./security";

/**
 * Edge security tests for the api-server front door.
 *
 * These are BEHAVIOURAL on purpose: every assertion is made against a real
 * response from a real listening Express app running the real middleware stack,
 * never against a config key. Two reasons:
 *
 *  1. helmet has renamed options across majors and IGNORES an unknown key
 *     silently, so `strictTransportSecurity: false` is only worth anything if
 *     the header is observed to be gone.
 *  2. A CORS refusal is the ABSENCE of headers, not an error status, so the
 *     allow and refuse paths are only distinguishable by inspecting headers.
 *
 * `applySecurityMiddleware` is the same function `app.ts` calls, so the
 * ordering, the startup warning and both middlewares are exercised as wired.
 */

/** The production origins carried by CORS_ALLOWED_ORIGINS (Railway service var). */
const PRODUCTION_ORIGINS = [
  "https://www.lazytopper.com",
  "https://lazytopper.com",
  "https://www.lazytopper.in",
  "https://lazytopper.in",
  "https://lazytopper-production-desktop.vercel.app",
];

interface Harness {
  url: string;
  warnings: string[];
  close: () => Promise<void>;
}

async function startApp(env: NodeJS.ProcessEnv): Promise<Harness> {
  const app = express();
  const warnings: string[] = [];
  applySecurityMiddleware(app, env, (message) => warnings.push(message));
  app.get("/probe", (_req, res) => {
    res.json({ ok: true });
  });

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/probe`,
    warnings,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function withApp(
  env: NodeJS.ProcessEnv,
  fn: (h: Harness) => Promise<void>,
): Promise<void> {
  const h = await startApp(env);
  try {
    await fn(h);
  } finally {
    await h.close();
  }
}

const CONFIGURED: NodeJS.ProcessEnv = {
  [CORS_ALLOWLIST_ENV_VAR]: PRODUCTION_ORIGINS.join(","),
};

describe("parseAllowedOrigins", () => {
  it("splits, trims and drops blanks", () => {
    assert.deepEqual(
      parseAllowedOrigins(" https://a.com , https://b.com ,, "),
      ["https://a.com", "https://b.com"],
    );
  });

  it("treats an absent or blank variable as an empty allowlist", () => {
    assert.deepEqual(parseAllowedOrigins(undefined), []);
    assert.deepEqual(parseAllowedOrigins(""), []);
    assert.deepEqual(parseAllowedOrigins("  ,  ,"), []);
  });
});

describe("CORS · a MISSING Origin is always allowed", () => {
  // ★ THE PRODUCTION-DOWN CASE. vercel.json rewrites /api/:path* to Railway
  // SERVER-SIDE, so legitimate production traffic — same-origin GETs, the
  // healthcheck, the warmup script, the owner's admin tooling — arrives with no
  // Origin header. If this ever starts refusing, the API is dead in production
  // while every static gate stays green.
  it("serves a no-Origin request and marks it allowed", async () => {
    await withApp(CONFIGURED, async ({ url }) => {
      const res = await fetch(url);
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        ALLOW_ANY_ORIGIN,
        "a request with no Origin must be ALLOWED — see security.ts",
      );
    });
  });

  it("allows a no-Origin request when the allowlist is unset too", async () => {
    await withApp({}, async ({ url }) => {
      const res = await fetch(url);
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        ALLOW_ANY_ORIGIN,
      );
    });
  });
});

describe("CORS · every allowlisted origin is echoed", () => {
  for (const origin of PRODUCTION_ORIGINS) {
    it(`allows ${origin}`, async () => {
      await withApp(CONFIGURED, async ({ url }) => {
        const res = await fetch(url, { headers: { origin } });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("access-control-allow-origin"), origin);
        assert.match(
          String(res.headers.get("vary") ?? ""),
          /Origin/,
          "an echoed origin must be accompanied by Vary: Origin",
        );
      });
    });
  }

  it("answers an allowed preflight with the echoed origin", async () => {
    await withApp(CONFIGURED, async ({ url }) => {
      const res = await fetch(url, {
        method: "OPTIONS",
        headers: {
          origin: "https://www.lazytopper.com",
          "access-control-request-method": "POST",
        },
      });
      assert.equal(res.status, 204);
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        "https://www.lazytopper.com",
      );
    });
  });
});

describe("CORS · a disallowed origin is refused WITHOUT a server error", () => {
  // ★ Refusal must be `cb(null, false)`. The `cb(new Error(...))` form is passed
  // to next(err) and becomes a 500 — turning a browser policy decision into a
  // server fault for the non-browser callers who are the main path here.
  it("omits the CORS headers but still serves the request", async () => {
    await withApp(CONFIGURED, async ({ url }) => {
      const res = await fetch(url, { headers: { origin: "https://evil.com" } });
      assert.notEqual(res.status, 500, "a refusal must not be a server error");
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("access-control-allow-origin"), null);
    });
  });

  it("refuses a disallowed preflight without a 500", async () => {
    await withApp(CONFIGURED, async ({ url }) => {
      const res = await fetch(url, {
        method: "OPTIONS",
        headers: {
          origin: "https://evil.com",
          "access-control-request-method": "POST",
        },
      });
      assert.notEqual(res.status, 500);
      assert.equal(res.headers.get("access-control-allow-origin"), null);
    });
  });

  it("refuses a lookalike origin (substring / suffix are not membership)", async () => {
    await withApp(CONFIGURED, async ({ url }) => {
      for (const origin of [
        "https://lazytopper.com.evil.com",
        "https://evil-lazytopper.com",
        "http://lazytopper.com",
      ]) {
        const res = await fetch(url, { headers: { origin } });
        assert.equal(
          res.headers.get("access-control-allow-origin"),
          null,
          `${origin} must not be allowed`,
        );
      }
    });
  });
});

describe("CORS · an unset allowlist warns and FAILS OPEN", () => {
  // A missing env var must never take production down.
  it("warns exactly once at startup and allows any origin", async () => {
    await withApp({}, async ({ url, warnings }) => {
      assert.deepEqual(warnings, [UNSET_ALLOWLIST_WARNING]);
      const res = await fetch(url, { headers: { origin: "https://evil.com" } });
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get("access-control-allow-origin"),
        ALLOW_ANY_ORIGIN,
      );
    });
  });

  it("does not warn when the allowlist IS configured", async () => {
    await withApp(CONFIGURED, async ({ warnings }) => {
      assert.deepEqual(warnings, []);
    });
  });
});

describe("helmet · observed response headers", () => {
  it("sets nosniff, drops X-Powered-By, and omits CSP and HSTS", async () => {
    await withApp(CONFIGURED, async ({ url }) => {
      const res = await fetch(url);

      // Proves helmet is actually mounted. Without this the two "absent"
      // assertions below would pass vacuously on an app with no helmet at all.
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(
        res.headers.get("x-powered-by"),
        null,
        "helmet must remove the Express banner",
      );

      // Both are deliberately disabled — see HELMET_OPTIONS in security.ts.
      // Asserted as HEADERS because helmet silently ignores an option key it
      // does not recognise, so the key alone proves nothing.
      assert.equal(res.headers.get("content-security-policy"), null);
      assert.equal(res.headers.get("strict-transport-security"), null);
    });
  });
});
