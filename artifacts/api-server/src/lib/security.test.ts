import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { describe, it } from "node:test";
import express from "express";

import {
  ALLOW_ANY_ORIGIN,
  CORS_ALLOWLIST_ENV_VAR,
  RATE_LIMITED_ERROR,
  RATE_LIMITED_MESSAGE,
  UNSET_ALLOWLIST_WARNING,
  applySecurityMiddleware,
  createRateLimiter,
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

      // ★ CSP is ON, and is the API form: exactly two directives, in helmet's
      // canonical order. Asserted as the WHOLE header string, not with
      // `.includes`, because the two things that would hurt here are EXTRA
      // directives, and `includes` cannot see an extra.
      assert.equal(
        res.headers.get("content-security-policy"),
        "default-src 'none';frame-ancestors 'none'",
      );

      // ★ THE OMISSION THAT MATTERS. helmet's DEFAULT CSP carries
      // `upgrade-insecure-requests`, a TRANSPORT directive, which the Vercel
      // rewrite would surface on a lazytopper.com response. `useDefaults:
      // false` is what keeps it out, and a future edit that drops that flag
      // would reintroduce it silently — so it is asserted by name.
      assert.ok(
        !res.headers.get("content-security-policy")?.includes("upgrade-insecure-requests"),
        "transport policy belongs to the Vercel edge, not to this origin",
      );

      // HSTS stays off — see HELMET_OPTIONS. Asserted as a HEADER because
      // helmet silently ignores an option key it does not recognise, so the
      // key alone proves nothing.
      assert.equal(res.headers.get("strict-transport-security"), null);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   RATE LIMITING — CodeQL js/missing-rate-limiting (admin.ts x3, questions.ts)
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Exercised through a REAL Express app on a REAL socket, with the limiter in a
 * REAL handler chain behind a stand-in for `requireFirebaseAuth`, because the
 * property under test is not "the function returns 429" — it is "a caller who
 * is over the limit does not reach the handler". A unit call on the middleware
 * could not tell those apart.
 */
async function startLimited(options: {
  windowMs: number;
  max: number;
  now?: () => number;
}): Promise<{ url: string; handlerHits: number; close: () => Promise<void> }> {
  const app = express();
  const state = { handlerHits: 0 };

  // Stand-in for requireFirebaseAuth: puts a VERIFIED uid on the request, which
  // is what the limiter keys on. `x-test-uid` exists only in this harness.
  app.use((req, _res, next) => {
    req.userId = (req.headers["x-test-uid"] as string) || "uid-default";
    next();
  });
  app.get("/guarded", createRateLimiter(options), (_req, res) => {
    state.handlerHits += 1;
    res.json({ ok: true });
  });

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/guarded`,
    get handlerHits() { return state.handlerHits; },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

describe("rate limiting", () => {
  it("serves an under-limit caller and refuses the one over it", async () => {
    const h = await startLimited({ windowMs: 60_000, max: 3 });
    try {
      // CONTROL: the first `max` requests must ALL be served. Without this the
      // 429 assertion below would pass just as happily on a limiter that
      // refused everything, which is not a rate limiter — it is an outage.
      for (let i = 1; i <= 3; i += 1) {
        const res = await fetch(h.url, { headers: { "x-test-uid": "alice" } });
        assert.equal(res.status, 200, `request ${i} of 3 must be served`);
      }
      assert.equal(h.handlerHits, 3, "all three under-limit calls reach the handler");

      const over = await fetch(h.url, { headers: { "x-test-uid": "alice" } });
      assert.equal(over.status, 429);
      assert.equal(
        h.handlerHits,
        3,
        "the refused call must NOT reach the handler — a 429 logged after the " +
          "work is done would rate-limit nothing",
      );

      // Retry-After is what makes the refusal actionable rather than opaque.
      assert.ok(Number(over.headers.get("retry-after")) > 0);

      // The refusal carries the SAME { error, message } contract as every
      // other error body: a code to branch on, and copy fit to show a student.
      const body = (await over.json()) as { error: string; message: string };
      assert.equal(body.error, RATE_LIMITED_ERROR);
      assert.equal(body.message, RATE_LIMITED_MESSAGE);
      assert.ok(!/denied|unauthor|forbidden/i.test(body.message));
    } finally {
      await h.close();
    }
  });

  it("counts per caller, so one hot caller cannot lock everyone else out", async () => {
    const h = await startLimited({ windowMs: 60_000, max: 2 });
    try {
      for (let i = 0; i < 3; i += 1) await fetch(h.url, { headers: { "x-test-uid": "alice" } });
      const bob = await fetch(h.url, { headers: { "x-test-uid": "bob" } });
      assert.equal(bob.status, 200, "bob's budget is his own");
    } finally {
      await h.close();
    }
  });

  it("reopens the window once it has elapsed", async () => {
    let clock = 1_000_000;
    const h = await startLimited({ windowMs: 1_000, max: 1, now: () => clock });
    try {
      assert.equal((await fetch(h.url, { headers: { "x-test-uid": "carol" } })).status, 200);
      assert.equal((await fetch(h.url, { headers: { "x-test-uid": "carol" } })).status, 429);
      clock += 1_001; // window elapses
      assert.equal(
        (await fetch(h.url, { headers: { "x-test-uid": "carol" } })).status,
        200,
        "a limiter that never reopens is a ban, not a limit",
      );
    } finally {
      await h.close();
    }
  });
});
