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
//   cacheHit       GRADE-SPEED-1 S6: true when every scheme this request needed was already stored (or none was
//                  needed); false when a generation was awaited or did not arrive; null when the cache hook did not run
//   schemeHash     GRADE-SPEED-1b: first 8 hex of the scheme's question hash (matches [scheme-prewarm] hash=); null if none
//   schemeJoined   GRADE-SPEED-1b: true when this grade WAITED for an in-flight scheme generation (cacheHit is then false)
//   transport      GRADE-SPEED-1 S6: closed set typedOnly | perQuestionParts | document; null before a call is built
//   marks          GRADE-SPEED-1 S6: the question's marks for a one-question request; null for a paper
//   attempts[]     one row per model call: n = 1 first / 2 retry, ms, finishReason, thoughtsTokenCount,
//                  outputTokens (candidatesTokenCount), promptTokens (promptTokenCount), parseMiss (a reply
//                  arrived but held no results; its finishReason is the row's finishReason), retryReason (why a retry was made: timeout |
//                  http_<status> | unparseable | max_tokens; null on a first attempt)
//   totalMs        handler entry -> response finished
//   outcomes       GRADE-MISS-1: per-paper result counts, present once a grade produced results:
//                  { q: questions, graded, notFound (page check: no answer for its number anywhere),
//                    noWork (listed, but its quoted first line is not in its own working),
//                    schemeCopy (zeroed: the "working" reproduced the scheme), blank (listed as left blank or
//                    no answer given), mismatch (answer to another question), unread (model could not read),
//                    notGraded (its call timed out / failed), other, inv (1 = a page inventory was used) }
//                  counted AFTER the second look (below), so it is what the student was shown
//   secondLook     GRADE-SECOND-LOOK-1: present only when a paper had questions to look at again:
//                  { asked: questions revisited, rescued: questions it graded, skipped: 1 = too little time left }
//                  (its model call is also an `attempts` row)
// CONTENT FIREWALL: only numbers and values from the closed sets above are ever written. No uid,
// email, IP, question text, answer text or model output (the users are minors).

const ROUTES = Object.freeze(['/api/check-solution', '/api/grade-worksheet']);
const SURFACES = Object.freeze(['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']);
const FINISH_REASONS = Object.freeze(['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'MALFORMED_FUNCTION_CALL', 'LANGUAGE', 'FINISH_REASON_UNSPECIFIED']);
// GRADE-SPEED-1 S6: the closed set of transports a grade is sent on (prompt.cjs transportOf).
const TRANSPORTS = Object.freeze(['typedOnly', 'perQuestionParts', 'document']);
const MAX_ATTEMPT_ROWS = 24;

const count = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

/** The sink gradeSet fills (input.timingSink). */
function createTimingSink() {
  return { cacheMs: null, cacheHit: null, schemeHash: null, schemeJoined: null, transport: null, marks: null, attempts: [], outcomes: null, secondLook: null };
}

/** GRADE-MISS-1 — count a graded set's results by why each landed where it did (the non-enumerable
 *  `_reason` postprocess sets). Numbers only. Telemetry: never read by grading or charging. */
function outcomeCounts(results, { inventory = false } = {}) {
  const c = { q: 0, graded: 0, notFound: 0, noWork: 0, schemeCopy: 0, blank: 0, mismatch: 0, unread: 0, notGraded: 0, other: 0, inv: inventory ? 1 : 0 };
  for (const r of Array.isArray(results) ? results : []) {
    if (!r || typeof r !== 'object') continue;
    c.q += 1;
    const why = r._reason;
    if (why === 'graded') c.graded += 1;
    else if (why === 'notInInventory') c.notFound += 1;
    else if (why === 'firstLineNotInWork') c.noWork += 1;
    else if (r._schemeCopy === true) c.schemeCopy += 1;
    else if (why === 'blankInInventory' || why === 'unattempted') c.blank += 1;
    else if (why === 'answerMismatch') c.mismatch += 1;
    else if (why === 'timeout' || why === 'failed') c.notGraded += 1;
    else if (why === 'couldNotRead') c.unread += 1;
    else c.other += 1;
  }
  return c;
}
const OUTCOME_KEYS = Object.freeze(['q', 'graded', 'notFound', 'noWork', 'schemeCopy', 'blank', 'mismatch', 'unread', 'notGraded', 'other', 'inv']);

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
    // GRADE-SPEED-1 S6: the prompt's size (separates "long thinking" from "big prompt") and, for a reply
    // that did not parse (a reply arrived, no results), the closed-set finishReason above is the reason.
    promptTokens: count(usage.promptTokenCount),
    parseMiss: Boolean(outcome && outcome.reply && !outcome.error && !outcome.results),
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
    cacheHit: typeof s.cacheHit === 'boolean' ? s.cacheHit : null,
    // GRADE-SPEED-1b: the scheme's question-hash prefix (8 hex, closed shape) and whether this grade joined an in-flight generation.
    schemeHash: typeof s.schemeHash === 'string' && /^[0-9a-f]{8}$/.test(s.schemeHash) ? s.schemeHash : null,
    schemeJoined: typeof s.schemeJoined === 'boolean' ? s.schemeJoined : null,
    transport: TRANSPORTS.includes(s.transport) ? s.transport : null,
    marks: count(s.marks),
    attempts: (Array.isArray(s.attempts) ? s.attempts : []).slice(0, MAX_ATTEMPT_ROWS),
    totalMs: count(totalMs),
  };
  if (s.outcomes && typeof s.outcomes === 'object') {
    const o = {};
    for (const k of OUTCOME_KEYS) o[k] = count(s.outcomes[k]);
    rec.outcomes = o;
  }
  if (s.secondLook && typeof s.secondLook === 'object') {
    rec.secondLook = { asked: count(s.secondLook.asked), rescued: count(s.secondLook.rescued), skipped: count(s.secondLook.skipped) };
  }
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

module.exports = { TRANSPORTS, createTimingSink, outcomeCounts, OUTCOME_KEYS, retryReasonOf, attemptRow, formatGradeTimingLine, armGradeTiming, ROUTES, SURFACES };
