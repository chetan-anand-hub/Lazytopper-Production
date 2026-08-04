import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import type { Express, NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Edge security policy for the api-server — the FRONT DOOR.
 *
 * `railway.json:8` starts `artifacts/api-server/dist/index.mjs`; `vercel.json`
 * rewrites BOTH `/api/:path*` and `/shared-api/:path*` to that Railway service.
 * Everything below therefore sits in front of the `/shared-api` router AND the
 * `/api` gateway proxy — which is why it is applied at one place in `app.ts`
 * rather than per-router.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ★ THE CONSTRAINT THAT WOULD TAKE PRODUCTION DOWN IF IT WERE GOT WRONG
 * ────────────────────────────────────────────────────────────────────────────
 * The Vercel rewrite is SERVER-SIDE. A student's browser talks to
 * `lazytopper.com`; Vercel forwards to Railway. Legitimate production traffic
 * can therefore arrive here with NO `Origin` header at all:
 *
 *   - a same-origin GET/HEAD from the SPA — browsers do not send `Origin`;
 *   - a non-browser caller (the warmup script, Railway's healthcheck, curl,
 *     Postman, the owner's admin tooling) — nothing sends `Origin`;
 *   - anything reaching Railway's public hostname directly.
 *
 * A MISSING Origin is therefore ALLOWED, unconditionally. Only a PRESENT origin
 * that is not on the allowlist is refused. Note that "missing" and "refused"
 * must also be DISTINGUISHABLE from the outside, or the rule could regress
 * without any gate noticing — see `ALLOW_ANY_ORIGIN` below.
 */

/**
 * Comma-separated origins, e.g.
 * `https://www.lazytopper.com,https://lazytopper.com,...`.
 * Set as a Railway service variable.
 */
export const CORS_ALLOWLIST_ENV_VAR = "CORS_ALLOWED_ORIGINS";

/**
 * What the origin callback returns for a request that carries no `Origin`.
 *
 * ★ WHY `"*"` AND NOT `true`. Both allow the request. But the `cors` package
 * emits `Access-Control-Allow-Origin` by REFLECTING the request origin, so for
 * a request with no origin to reflect, `true` produces NO HEADER AT ALL — byte
 * for byte the same response a REFUSAL produces, because a refusal is also just
 * "no CORS headers" (see below). "Missing Origin is allowed" would then be
 * unobservable, and a future change that made it refuse would pass every test
 * that could be written against it. `"*"` makes the allow decision visible in
 * the response, so the guard can be mutation-verified.
 *
 * It is also not a widening: today's bare `cors()` already answers `*` to every
 * request, and `*` without credentials is what the browser ignores anyway for a
 * request that was never a CORS request in the first place.
 */
export const ALLOW_ANY_ORIGIN = "*";

export const UNSET_ALLOWLIST_WARNING =
  `[cors] ${CORS_ALLOWLIST_ENV_VAR} is not set — every browser origin is allowed. ` +
  `Set it to the comma-separated production origins to enable the allowlist.`;

/** Parse the env var into a clean origin list. Absent/blank → empty list. */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build the CORS options for a given allowlist.
 *
 * ★ REFUSAL IS `cb(null, false)`, NEVER `cb(new Error(...))`.
 * The error form is passed to `next(err)` by the `cors` package and lands in
 * Express's error handler as a 500. That would convert a browser-side POLICY
 * decision into a SERVER FAULT for every caller — including the non-browser
 * callers who never cared about CORS and who, thanks to the Vercel rewrite, are
 * the main path. `cb(null, false)` simply omits the CORS headers: browsers
 * enforce the refusal, everyone else is unaffected.
 *
 * ★ AN EMPTY ALLOWLIST ALLOWS EVERYTHING. A missing env var must never be able
 * to take production down; the caller warns at startup instead.
 */
export function buildCorsOptions(allowedOrigins: string[]): CorsOptions {
  const allowlist = new Set(allowedOrigins);
  return {
    origin(requestOrigin, callback) {
      // No Origin header — not a browser CORS request. Always allowed.
      if (!requestOrigin) return callback(null, ALLOW_ANY_ORIGIN);
      // Unconfigured: fail OPEN, exactly as before this middleware existed.
      if (allowlist.size === 0) return callback(null, ALLOW_ANY_ORIGIN);
      // Allowed: echo the exact origin (the cors package adds `Vary: Origin`).
      if (allowlist.has(requestOrigin)) return callback(null, requestOrigin);
      // Refused — headers omitted, request still served. NOT an Error.
      return callback(null, false);
    },
  };
}

/**
 * The Content-Security-Policy this service sends — the API form, not the app
 * form.
 *
 * ★ WHY IT IS ON NOW. It used to be `contentSecurityPolicy: false`, on the
 * reasoning that a CSP here governs nothing: CSP is enforced by the browser
 * against the DOCUMENT that carried the header, and this service never serves a
 * document. That reasoning is CORRECT and was RE-VERIFIED, not assumed — every
 * route reachable from `app.ts` (`/shared-api` → health, admin, questions) ends
 * in `res.json(...)`, and `/api` pipes the gateway's JSON straight through. No
 * HTML, no redirect to HTML, anywhere. The SPA is served by Vercel from
 * `/app/index.html` with its own headers.
 *
 * But "governs nothing" is an argument for the header being HARMLESS, not for
 * it being ABSENT, and CodeQL `js/insecure-helmet-configuration` flags the
 * explicit `false` because a disabled protection cannot be told apart from a
 * protection nobody thought about. So it is enabled, with the two directives
 * that are meaningful for a JSON endpoint and no others:
 *
 *   - `default-src 'none'`   — this origin serves no subresources at all.
 *   - `frame-ancestors 'none'` — nothing may frame an API response.
 *
 * ★ WHAT IS DELIBERATELY *NOT* IN IT, and why each omission is load-bearing:
 * helmet's DEFAULT CSP also emits `upgrade-insecure-requests`,
 * `style-src 'unsafe-inline'` and `form-action 'self'`. `upgrade-insecure-requests`
 * is a TRANSPORT directive, and transport policy belongs to the Vercel edge for
 * exactly the reason HSTS is off below — the rewrite is a pass-through, so a
 * directive set here surfaces on a `lazytopper.com` response. `useDefaults:
 * false` is therefore not tidiness; it is what keeps this a
 * content policy and not a second, accidental transport policy.
 *
 * ★ WHY THIS IS NOT A BROWSER-OBSERVABLE CHANGE FOR THE APP. A CSP header on a
 * `fetch()` response is not applied by any browser — CSP attaches to documents
 * and workers, and a JSON body parsed by `fetch()` is neither. The only request
 * that can ever see this policy is a human typing an `/api/...` URL into the
 * address bar, where it does nothing but forbid a JSON document from loading
 * subresources it does not have. **No CORS behaviour is touched.**
 *
 * ★ HSTS IS OFF, deliberately. Vercel already terminates TLS and owns the
 * edge's transport policy. Because the rewrite is a pass-through, an HSTS header
 * set HERE can surface on a `lazytopper.com` response and pin the APEX DOMAIN
 * AND EVERY SUBDOMAIN to HTTPS in every browser that saw it — a durable,
 * client-side, hard-to-reverse commitment made as a side effect of a proxy hop.
 * MEASURED, not assumed: with this option removed, helmet 8.3.0 emits
 * `max-age=31536000; includeSubDomains` — a FULL YEAR. Transport policy belongs
 * to the edge, on purpose, not to an origin behind a rewrite.
 *
 * Everything else is helmet's default, and the two that matter are:
 *   - `X-Content-Type-Options: nosniff`
 *   - removal of the `X-Powered-By: Express` banner
 * `Cross-Origin-Resource-Policy: same-origin` is kept: it constrains `no-cors`
 * subresource loads only, never a CORS-mode `fetch`, and in production every
 * call is same-origin through the rewrite anyway.
 *
 * These are asserted as OBSERVED RESPONSE HEADERS in the test, not as config
 * keys — helmet has renamed options across majors, and a key that no longer
 * exists is silently ignored rather than rejected.
 */
export const API_CSP_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'none'"],
  frameAncestors: ["'none'"],
};

export const HELMET_OPTIONS: Parameters<typeof helmet>[0] = {
  contentSecurityPolicy: {
    // Send EXACTLY the two directives above — see the note on
    // `upgrade-insecure-requests` for why helmet's defaults are not merged in.
    useDefaults: false,
    directives: API_CSP_DIRECTIVES,
  },
  strictTransportSecurity: false,
};

/* ────────────────────────────────────────────────────────────────────────────
   RATE LIMITING — CodeQL js/missing-rate-limiting on admin.ts ×3, questions.ts ×1
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * A per-caller fixed-window limiter for the routes this service handles ITSELF.
 *
 * ★ WHY THIS IS NOT `express-rate-limit`. All four build paths (Docker, CI,
 * Vercel, local) now install exactly what `pnpm-lock.yaml` pins, so a new
 * dependency is a four-surface change and is out of scope here. It is also not
 * needed: the mechanism below is the SAME one the product already runs.
 *
 * ★ WHAT ALREADY EXISTED, AND WHY THIS MIRRORS IT RATHER THAN REPLACING IT.
 * `lazytopper/server/services/rateLimiter.cjs` is a real, tested limiter — but
 * it is IN THE OTHER PROCESS (the AI gateway on 3001) and it limits only
 * `PAID_ENDPOINTS`, the LLM-backed paths, because the harm it addresses is a
 * Gemini bill. It is CommonJS in a different package and cannot be imported
 * here. It also would not cover these routes if it could: `/shared-api/admin/*`
 * and `/shared-api/questions/report` are answered by THIS process and never
 * reach that limiter. So this mirrors its three design choices deliberately —
 * a process-local Map, a caller key, and a refusal that names no internals —
 * and adds nothing novel.
 *
 * ★ THE KEY IS THE VERIFIED FIREBASE UID, NOT THE IP. Every route this is
 * mounted on runs `requireFirebaseAuth` FIRST, so `req.userId` is a uid the
 * server itself decoded — not a spoofable header, which is the one weakness the
 * gateway limiter documents about itself. `req.ip` is only a fallback for a
 * mount order that has no auth in front of it, and is never the primary key.
 *
 * ★ COUNTERS ARE PROCESS-LOCAL. A restart or a second instance resets them, so
 * the failure mode is "a caller gets more requests than the table says", never
 * "a caller is locked out". Same trade the gateway limiter makes, same reason.
 */
export const ADMIN_RATE_LIMIT = { windowMs: 60_000, max: 30 } as const;
export const REPORT_RATE_LIMIT = { windowMs: 60_000, max: 12 } as const;

/** The error CODE callers branch on. Never rendered to a student. */
export const RATE_LIMITED_ERROR = "rate_limited";

/**
 * The student-facing copy. A caller who is going too fast has not made a
 * mistake, so this reads as a pause, not as a refusal — no code, no "denied".
 */
export const RATE_LIMITED_MESSAGE =
  "That was a lot of requests in a row. Give it a few seconds and try again.";

/** Stop the counter Map growing without bound on a long-lived process. */
const MAX_TRACKED_CALLERS = 10_000;

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  now?: () => number;
}): RequestHandler {
  const { windowMs, max } = options;
  const now = options.now ?? Date.now;
  const windows = new Map<string, RateLimitWindow>();

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = req.userId ?? req.ip ?? "anonymous";
    const at = now();

    if (windows.size > MAX_TRACKED_CALLERS) {
      for (const [k, w] of windows) if (at >= w.resetAt) windows.delete(k);
    }

    const open = windows.get(key);
    if (!open || at >= open.resetAt) {
      windows.set(key, { count: 1, resetAt: at + windowMs });
      next();
      return;
    }

    open.count += 1;
    if (open.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((open.resetAt - at) / 1000)));
      res.status(429).json({
        ok: false,
        error: RATE_LIMITED_ERROR,
        message: RATE_LIMITED_MESSAGE,
      });
      return;
    }

    next();
  };
}

/**
 * Apply the edge security middleware, in order, to an Express app.
 *
 * Exported as ONE function so the test exercises the same wiring production
 * runs — the ordering, the startup warning and both middlewares — rather than
 * re-assembling an approximation of it.
 */
export function applySecurityMiddleware(
  app: Express,
  env: NodeJS.ProcessEnv,
  warn: (message: string) => void,
): void {
  const allowedOrigins = parseAllowedOrigins(env[CORS_ALLOWLIST_ENV_VAR]);
  if (allowedOrigins.length === 0) {
    warn(UNSET_ALLOWLIST_WARNING);
  }
  app.use(cors(buildCorsOptions(allowedOrigins)));
  app.use(helmet(HELMET_OPTIONS));
}
