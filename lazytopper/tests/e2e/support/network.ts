/**
 * UI-E2E-1 — the suite's network: HERMETIC by construction.
 *
 * Every request a page makes goes one of three ways, and nothing else reaches the internet:
 *
 *   1. Same-origin app files (the built bundle)          -> served by serveBuild.ts, untouched
 *      (except `/_vercel/*`, Vercel's analytics: stubbed, so a run is never counted as a visit).
 *   2. Same-origin `/api/*` and `/shared-api/*`          -> a recorded FIXTURE (below), or, if
 *      no fixture exists, a 404 and the call is recorded in `unmockedApi`; the spec fails on
 *      it by name. So no run reaches the production backend, spends an AI call, or depends
 *      on Railway being up.
 *   3. Any other host                                    -> a STUB for the three third parties
 *      the signed-out funnel loads (Razorpay checkout.js, reCAPTCHA Enterprise, the Firebase
 *      App Check token exchange), or BLOCKED and recorded in `blockedThirdParty`. Blocking
 *      is what keeps a third-party outage from failing a PR — and keeps test traffic out of
 *      Razorpay and any analytics.
 *
 * A spec can still override any of this with its own `page.route(...)`: page-level routes
 * take precedence over these context-level ones (the Answer Checker spec routes the two
 * grading calls that way).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, ConsoleMessage, Page, Route } from "@playwright/test";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "..", "fixtures");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));
}

/**
 * Recorded API responses, keyed `METHOD /path`. Each one is a real production response,
 * recorded on the date in its file's git history — not an invented shape.
 *   GET /api/cbse-exam-date — the landing's boards countdown (Welcome) and the pricing pages.
 */
const API_FIXTURES: Record<string, () => unknown> = {
  "GET /api/cbse-exam-date": () => fixture("cbse-exam-date.class-10.json"),
};

/**
 * reCAPTCHA Enterprise, stubbed. The App Check SDK (ReCaptchaEnterpriseProvider) loads
 * `enterprise.js?render=explicit`, calls `grecaptcha.enterprise.ready/render/execute`, and
 * requires the render `callback` to have fired before it exchanges the token. The real
 * script in a headless browser stalls on a challenge, so it is replaced by the four members
 * the SDK uses. The token it yields is only ever sent to the stubbed exchange below.
 */
const RECAPTCHA_STUB = `(function(){var opts=null;window.grecaptcha={enterprise:{
ready:function(cb){cb();},
render:function(_c,o){opts=o;return 0;},
execute:function(){if(opts&&opts.callback){opts.callback("ui-e2e");}return Promise.resolve("ui-e2e-recaptcha-token");}
}};})();`;

/** Razorpay's checkout.js, stubbed: /packs pre-warms it. No spec ever opens a payment. */
const RAZORPAY_STUB = `window.Razorpay=function UiE2eRazorpayStub(){this.open=function(){};this.on=function(){};};`;

export interface NetworkLog {
  /** `/api` calls that had no fixture (answered 404). A spec asserts this stays empty. */
  unmockedApi: string[];
  /** Third-party URLs the suite blocked (not stubbed). Informational; never a failure. */
  blockedThirdParty: string[];
}

function corsJson(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
    body: JSON.stringify(body),
  });
}

/** Install the hermetic network on a context. Call once per test, before the first goto. */
export async function installNetwork(context: BrowserContext, appOrigin: string): Promise<NetworkLog> {
  const log: NetworkLog = { unmockedApi: [], blockedThirdParty: [] };

  // Same-origin API calls.
  await context.route(
    (url) => url.origin === appOrigin && /^\/(?:shared-)?api(?:\/|$)/.test(url.pathname),
    async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const key = `${req.method()} ${url.pathname}`;
      const make = API_FIXTURES[key];
      if (make) return corsJson(route, make());
      log.unmockedApi.push(key);
      return corsJson(route, { ok: false, error: `ui-e2e: no fixture for ${key}` }, 404);
    },
  );

  // Vercel Web Analytics (`/_vercel/insights/script.js` in index.html, plus its beacons).
  // Vercel serves it in production; the local server has no such file, and a test run must
  // never count as a visit in the owner's analytics. A no-op script and an empty 204.
  await context.route(
    (url) => url.origin === appOrigin && url.pathname.startsWith("/_vercel/"),
    (route) =>
      route.request().resourceType() === "script"
        ? route.fulfill({ contentType: "text/javascript", body: "/* ui-e2e: Vercel analytics stubbed */" })
        : route.fulfill({ status: 204, body: "" }),
  );

  // Every other origin.
  await context.route(
    (url) => url.origin !== appOrigin && /^https?:$/.test(url.protocol),
    async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "www.google.com" && url.pathname.startsWith("/recaptcha/enterprise.js")) {
        return route.fulfill({ contentType: "text/javascript", body: RECAPTCHA_STUB });
      }
      if (url.hostname === "content-firebaseappcheck.googleapis.com") {
        // A fake limited-use App Check token. It is only ever sent to the routed /api calls.
        return corsJson(route, { token: "ui-e2e-app-check-token", ttl: "3600s" });
      }
      if (url.hostname === "checkout.razorpay.com" && url.pathname === "/v1/checkout.js") {
        return route.fulfill({ contentType: "text/javascript", body: RAZORPAY_STUB });
      }
      log.blockedThirdParty.push(url.href);
      return route.abort("blockedbyclient");
    },
  );

  return log;
}

/**
 * Console noise the suite accepts. EVERY entry says why; anything not matched here is a
 * failure. Add an entry only for noise this suite itself creates or that a real browser
 * on the live site also shows and that is not a product defect.
 */
const CONSOLE_ALLOWLIST: Array<{ why: string; test: (msg: ConsoleMessage, log: NetworkLog) => boolean }> = [
  {
    // The suite blocks third-party hosts (support/network.ts). Chromium logs each blocked
    // subresource as "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT". That is the
    // suite's own doing, not a page defect.
    why: "third-party request blocked by the suite",
    test: (msg, log) =>
      /net::ERR_BLOCKED_BY_CLIENT/.test(msg.text()) && log.blockedThirdParty.includes(msg.location().url),
  },
  {
    // An /api call without a fixture is answered 404 and is ALREADY reported, by name, as
    // its own failure (`unmockedApi`). Its "Failed to load resource: 404" line is not
    // reported twice.
    why: "unmocked /api call (reported separately)",
    test: (msg) => /Failed to load resource/.test(msg.text()) && /\/(?:shared-)?api\//.test(msg.location().url),
  },
];

export interface PageErrors {
  errors: string[];
}

/** Collect uncaught page errors and console errors, minus the allowlist above. */
export function collectPageErrors(page: Page, log: NetworkLog): PageErrors {
  const out: PageErrors = { errors: [] };
  page.on("pageerror", (err) => out.errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    if (CONSOLE_ALLOWLIST.some((entry) => entry.test(msg, log))) return;
    const where = msg.location().url ? ` (${msg.location().url})` : "";
    out.errors.push(`console.error: ${msg.text()}${where}`);
  });
  return out;
}
