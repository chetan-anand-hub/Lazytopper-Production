import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import type { Express } from "express";

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
 * helmet options.
 *
 * ★ CSP IS OFF, and the usual reason given for turning it off here is WRONG.
 * A CSP header cannot break the app's Firebase or Gemini calls: CSP is enforced
 * by the browser against the DOCUMENT that carried the header, and no document
 * is ever served from here. The SPA is served by Vercel from `/app/index.html`
 * with its own headers; this service returns JSON to `fetch()`. So a CSP here
 * governs nothing — it is inert bytes on every API response, which is the
 * actual reason to leave it off. If a route ever returns HTML, turn it back on
 * and tune it then.
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
export const HELMET_OPTIONS: Parameters<typeof helmet>[0] = {
  contentSecurityPolicy: false,
  strictTransportSecurity: false,
};

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
