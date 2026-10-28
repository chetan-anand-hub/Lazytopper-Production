'use strict';
// server/grading/gradeTiming.cjs — GRADE-SPEED-1: ONE structured log line per grade request.
//
// WHY. A 3-mark typed Check & Improve grade took ~75 s live (28 Oct 2026) and nothing recorded
// where the time went: auth/limits, the solution-cache pre-phase, or one long model call. Every
// per-CALL latency already reaches /api/admin/token-telemetry (telemetry.cjs latencyMsPercentiles
// per workload class), but no END-TO-END duration existed anywhere. This line is that record.
//
// FORMAT (grep Railway logs for `[grade-timing]`; the rest of the line is one JSON object):
//   [grade-timing] {"route":"/api/check-solution","surface":"check-improve","status":200,
//     "preMs":412,"cacheMs":3100,"attempts":[{"n":1,"ms":41230,"finishReason":"STOP",
//     "thoughtsTokenCount":9120,"outputTokens":1840,"retryReason":null}],"totalMs":45120}
//   route          closed set: /api/check-solution | /api/grade-worksheet
//   mode           present only for a background grading job: "job"
//   surface        closed set (check-improve, worksheet, chapter-test, full-mock, quick-practice) or null
//   status         the HTTP status answered (absent for a job)
//   preMs          server entry -> handler entry (auth, idempotency, limiter, entitlement, fair use); null if unknown
//   cacheMs        the scheme-first solution-cache pre-phase; null when it did not run
//   attempts[]     one row per model call: n = 1 first / 2 retry, ms, finishReason, thoughtsTokenCount,
//                  outputTokens (candidatesTokenCount), retryReason (why a retry was made: timeout |
//                  http_<status> | unparseable | max_tokens; null on a first attempt)
//   totalMs        handler entry -> response finished
// CONTENT FIREWALL: only numbers and values from the closed sets above are ever written. No uid,
// email, IP, question text, answer text or model output (the users are minors).

const ROUTES = Object.freeze(['/api/check-solution', '/api/grade-worksheet']);
const SURFACES = Object.freeze(['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']);
const FINISH_REASONS = Object.freeze(['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'MALFORMED_FUNCTION_CALL', 'LANGUAGE', 'FINISH_REASON_UNSPECIFIED']);
const MAX_ATTEMPT_ROWS = 24;

const count = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

/** The sink gradeSet fills (input.timingSink). */
function createTimingSink() {
  return { cacheMs: null, attempts: [] };
}

/** retryReason for a retry of `first` (an attemptChunk outcome); null when there was no failure. */
function retryReasonOf(first) {
  if (!first) return null;
  if (first.error) {
    if (first.timedOut) return 'timeout';
    const status = Number(first.error && (first.error.status || first.error.statusCode));
    return Number.isFinite(status) && status > 0 ? 'http_' + Math.round(status) : 'error';
  }
  return first.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'unparseable';
}

/** One attempt row from a settled attemptChunk. Numbers and closed-set strings only. */
function attemptRow(n, outcome, retryReason) {
  const reply = outcome && outcome.reply;
  const raw = reply && reply.raw && typeof reply.raw === 'object' ? reply.raw : null;
  const usage = raw && raw.usageMetadata && typeof raw.usageMetadata === 'object' ? raw.usageMetadata : {};
  const fr = outcome && outcome.finishReason;
  return {
    n,
    ms: count(outcome && outcome.ms),
    finishReason: FINISH_REASONS.includes(fr) ? fr : null,
    thoughtsTokenCount: count(usage.thoughtsTokenCount),
    outputTokens: count(usage.candidatesTokenCount),
    retryReason: retryReason || null,
  };
}

function formatGradeTimingLine({ route, surface, status, mode, preMs, sink, totalMs }) {
  const s = sink && typeof sink === 'object' ? sink : createTimingSink();
  const rec = {
    route: ROUTES.includes(route) ? route : null,
    ...(mode === 'job' ? { mode: 'job' } : {}),
    surface: SURFACES.includes(surface) ? surface : null,
    ...(mode === 'job' ? {} : { status: count(status) }),
    preMs: count(preMs),
    cacheMs: count(s.cacheMs),
    attempts: (Array.isArray(s.attempts) ? s.attempts : []).slice(0, MAX_ATTEMPT_ROWS),
    totalMs: count(totalMs),
  };
  return '[grade-timing] ' + JSON.stringify(rec);
}

/**
 * Arm the per-request line: logs ONCE when the response finishes (or the socket closes first).
 * `enteredAtMs` is when the server pipeline began (index.cjs stamps req.__ltEnteredAtMs).
 * Never throws; a response object without events (a unit-test fake) is simply not armed.
 */
function armGradeTiming({ req, res, route, startedAt, now = () => Date.now(), log = (line) => console.log(line) }) {
  const sink = createTimingSink();
  let done = false;
  const emit = () => {
    if (done) return;
    done = true;
    try {
      const entered = Number(req && req.__ltEnteredAtMs);
      const surfaceHeader = req && req.headers ? String(req.headers['x-lazytopper-surface'] || '').trim().toLowerCase() : '';
      log(formatGradeTimingLine({
        route,
        surface: surfaceHeader,
        status: res && res.statusCode,
        preMs: Number.isFinite(entered) && entered > 0 ? startedAt - entered : null,
        sink,
        totalMs: now() - startedAt,
      }));
    } catch {
      /* a log line must never fail a request */
    }
  };
  if (res && typeof res.once === 'function') {
    res.once('finish', emit);
    res.once('close', emit);
  }
  return { sink, emit };
}

module.exports = { createTimingSink, retryReasonOf, attemptRow, formatGradeTimingLine, armGradeTiming, ROUTES, SURFACES };
