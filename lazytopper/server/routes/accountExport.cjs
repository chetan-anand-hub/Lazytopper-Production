/**
 * Account export route — a student downloads their OWN data.
 *
 *   GET /api/account/export   (AUTH REQUIRED, OWNER-SCOPED)
 *
 * The read-side twin of `POST /api/account/erase` (ERASE-1, #638). Same identity
 * rule, same limiter pattern, same partial-is-not-success contract.
 *
 * ★★ THE UID COMES FROM THE VERIFIED TOKEN AND FROM NOWHERE ELSE. Not the body, not
 * a query parameter, not `X-Lazytopper-Uid`. A route that accepts a uid and returns
 * that account's data is the data-theft version of this feature, and it is worse
 * than the erasure equivalent in one way: it is SILENT. A wrongly-erased account is
 * noticed; a wrongly-exported one is not. `accountExport.test.cjs` sends a victim's
 * uid in all three attacker-controlled places at once and asserts only the token's
 * uid is ever read.
 *
 * ★ AUTH IS CONSUMED, NOT BUILT. `services/verifiedCaller.cjs` is already
 * fail-closed: no token, no admin SDK, unverified, expired, forged, network down —
 * every path returns `""`. This route adds the caller that REFUSES `""`. Nothing in
 * `verifiedCaller` changes.
 *
 * ★ WHY GET, WHEN ITS TWIN IS POST. Reading your own data is idempotent and
 * side-effect-free, so GET is the honest method. It has one consequence worth
 * writing down: `index.cjs` runs the global rate limiter inside an
 * `if (req.method === 'POST')` block, so a GET is invisible to it. That is why this
 * route holds its OWN limiter instance and calls it directly — exactly as ERASE-1
 * does — rather than relying on the edge.
 *
 * ★★ WHY THE SUCCESS BODY IS NOT SENT THROUGH `sendJson`, AND WHY THAT IS NOT A
 * SHORTCUT. `httpUtils.sendJson` runs `redactErrorDetails` over every body: it
 * replaces the VALUE of any key named `details`, `detail`, `stack`, `stackTrace`,
 * `trace` or `errorStack` with a fixed sentence, and it stops recursing past depth 8.
 * That is exactly right for an error body and exactly wrong for a data export, which
 * must return the student's own documents byte-for-byte. A student field called
 * `details` would come back as "Details omitted. See server logs." — and, because of
 * the depth cut-off, only SOME of them would, which is worse than all of them. No
 * such field exists in the product's persisted shapes today (checked); this is a
 * latent hazard the export must not sit on top of, and `accountExport.test.cjs`
 * demonstrates the corruption directly so nobody "tidies" this back onto sendJson.
 * ★ The stack-frame protection is NOT lost: the service passes every caught error
 * through the same `redactErrorDetails`, on the string, where it does the one thing
 * we want.
 *
 * ★ ERROR responses DO go through `sendJson` — they are exactly what its redaction
 * is for.
 */

const { createRateLimiter } = require('../services/rateLimiter.cjs');

/** The one path this route answers. Exported so index.cjs cannot drift from it. */
const ACCOUNT_EXPORT_PATH = '/api/account/export';

/** The limiter class this route bills against. Its own name, not a paid-LLM class. */
const EXPORT_CLASS = 'export';

/**
 * ★ A CAP THAT IS TIGHT ENOUGH TO STOP ABUSE AND LOOSE ENOUGH NOT TO DENY A RIGHT.
 * An export reads the student's entire tree and downloads their uploaded images, so
 * it is the most expensive read in the product — but it is also a legal entitlement,
 * and a person who is trying to get their data out and hits a wall has been refused
 * something they are owed. Five a day per VERIFIED uid: nobody legitimate needs a
 * sixth, and nobody legitimate is stopped. Soft fires at 2 so the owner sees the
 * pattern in telemetry before the ceiling is reached.
 */
const EXPORT_PAID_ENDPOINTS = Object.freeze({ [ACCOUNT_EXPORT_PATH]: EXPORT_CLASS });
const EXPORT_LIMITS = Object.freeze({
  [EXPORT_CLASS]: Object.freeze({
    soft: Number(process.env.LT_CAP_EXPORT_SOFT || 2),
    hard: Number(process.env.LT_CAP_EXPORT_HARD || 5),
  }),
});

/** `lazytopper-data-export-2026-08-09.json` — dated, and safe as a header value. */
function exportFilename(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `lazytopper-data-export-${d.toISOString().slice(0, 10)}.json`;
}

function createAccountExportRoutes(deps) {
  const { sendJson, verifiedCaller, accountExport, telemetry } = deps;
  const corsOrigin = deps.corsOrigin || '*';

  const rateLimiter =
    deps.rateLimiter ||
    createRateLimiter({
      telemetry,
      paidEndpoints: EXPORT_PAID_ENDPOINTS,
      limits: EXPORT_LIMITS,
    });

  /**
   * The export payload itself. Written directly rather than through `sendJson` — see
   * the module header for why that is a requirement and not a convenience.
   *
   * ★ PRETTY-PRINTED ON PURPOSE. A parent opening this in Notepad must be able to
   * read it. Two-space JSON is the cheapest legibility this file can buy, and the
   * `readme` block sits at the top of it.
   * ★ `Content-Disposition` is EXPOSED because a cross-origin `fetch` cannot read a
   * response header that is not in `Access-Control-Expose-Headers` — without it the
   * browser downloads the file under a generated name and the date is lost.
   */
  function sendExport(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFilename(new Date())}"`,
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Expose-Headers': 'Content-Disposition',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload, null, 2));
  }

  async function handleExport(req, res) {
    // ── 1. Identity. Fail closed. ────────────────────────────────────────────
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) {
      return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    }

    // ── 2. Cap, keyed on that verified uid only. ─────────────────────────────
    const verdict = rateLimiter.check(req, ACCOUNT_EXPORT_PATH, uid);
    if (!verdict.allowed) {
      return sendJson(res, verdict.status, verdict.body);
    }

    // ── 3. Honest unavailability, never a half-built file. ───────────────────
    if (!accountExport.isAvailable()) {
      return sendJson(res, 503, {
        ok: false,
        error: 'Data export is unavailable right now.',
        reason: accountExport.unavailableReason(),
      });
    }

    // ── 4. Walk the map. ─────────────────────────────────────────────────────
    let result;
    try {
      result = await accountExport.exportAccount(uid);
    } catch (e) {
      if (telemetry && typeof telemetry.increment === 'function') {
        telemetry.increment('account_export.run_failed', 1);
      }
      return sendJson(res, 500, {
        ok: false,
        error: 'Data export failed.',
        details: e && e.message ? e.message : String(e),
      });
    }

    if (telemetry && typeof telemetry.increment === 'function') {
      telemetry.increment(result.ok ? 'account_export.ok' : 'account_export.partial', 1);
    }

    // ★ A PARTIAL EXPORT IS NOT A 200. `ok:false` and `disclosures` name every
    // location that is missing and why, so a caller cannot render "here is all your
    // data" over a run that read 27 of 29. The payload is delivered either way —
    // withholding a partial export would deny the student the part we DID read.
    return sendExport(res, result.ok ? 200 : 207, result);
  }

  return { handleExport };
}

module.exports = {
  createAccountExportRoutes,
  ACCOUNT_EXPORT_PATH,
  EXPORT_CLASS,
  EXPORT_PAID_ENDPOINTS,
  EXPORT_LIMITS,
  exportFilename,
};
