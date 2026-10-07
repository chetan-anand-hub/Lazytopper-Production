'use strict';
// server/services/gracefulDrain.cjs — A REDEPLOY LOSES NO GRADING WORK (GRACEFUL-DEPLOY, owner 2026-10-07).
//
// WHAT HAPPENS ON A RAILWAY REDEPLOY. The new deployment passes its healthcheck and takes the traffic;
// then (after `deploy.overlapSeconds`) the OLD one gets SIGTERM, and SIGKILL `deploy.drainingSeconds`
// later (railway.json). This process is the AI gateway, a CHILD of artifacts/api-server, which now
// forwards SIGTERM to it (artifacts/api-server/src/lib/gracefulShutdown.ts). On that signal it DRAINS:
//   1. NEW requests are refused with an honest, retryable 503 (`server_restarting`, Retry-After,
//      Connection: close). A refused submit started nothing and charged nothing, so trying again — which
//      reaches the new deployment — is always safe. The listener is closed too.
//   2. Requests already being served run to the end, and background grading jobs keep grading: each one
//      writes its rows as they settle and ends `done` (charged once, for graded questions only) through
//      its own code path in grading/jobs.cjs, which this file does not change.
//   3. When nothing is left in flight the process exits 0. If work is still running at the deadline
//      (DRAIN_DEADLINE_MS, inside Railway's draining window), every job still live is ended as
//      `interrupted` — final rows kept and charged, the rest "not graded" and never charged — and the
//      process exits. That is jobs.cjs's own interruptAll, the same honest ending as before.
// It replaces the old best-effort hook (interrupt everything at once, then re-raise SIGTERM), which
// could only ever end running work early.
//
// Every timer is injected, so the tests drive time without reading a clock.

/** The child's drain budget. Railway sends SIGKILL `drainingSeconds` (120) after SIGTERM, and the
 *  parent allows itself PARENT_DRAIN_DEADLINE_MS (115 s); this leaves room for the interrupt writes. */
const DRAIN_DEADLINE_MS = 110000;
/** How often the drain looks at "is anything still in flight". */
const DRAIN_POLL_MS = 500;
/** The longest the deadline's interruptAll may take before the process exits regardless. */
const INTERRUPT_GUARD_MS = 4000;
/** What a client is told to wait before trying again (the new deployment is already serving). */
const RETRY_AFTER_SECONDS = 5;
const SERVER_RESTARTING_BODY = Object.freeze({
  ok: false,
  error: 'server_restarting',
  retryable: true,
  retryAfterMs: RETRY_AFTER_SECONDS * 1000,
  message: 'The server is restarting for an update. Nothing was started or charged — please try again in a few seconds.',
});

/**
 * @param deps.jobs        { stats(): { live:number }, interruptAll(reason): Promise<number> } | null
 * @param deps.exit        (code) => void — process.exit in production
 * @param deps.corsOrigin  the Access-Control-Allow-Origin the gateway answers with
 * @param deps.setTimeout / clearTimeout / setInterval / clearInterval — injected timers (tests)
 * @param deps.log         (line) => void
 * @param deps.drainDeadlineMs, deps.pollMs, deps.interruptGuardMs — overrides (tests)
 */
function createGracefulDrain(deps = {}) {
  const jobs = deps.jobs || null;
  const exit = typeof deps.exit === 'function' ? deps.exit : (code) => process.exit(code);
  const log = typeof deps.log === 'function' ? deps.log : () => {};
  const corsOrigin = deps.corsOrigin || '*';
  const setT = deps.setTimeout || setTimeout;
  const clearT = deps.clearTimeout || clearTimeout;
  const setI = deps.setInterval || setInterval;
  const clearI = deps.clearInterval || clearInterval;
  const deadlineMs = Number.isFinite(deps.drainDeadlineMs) && deps.drainDeadlineMs > 0 ? deps.drainDeadlineMs : DRAIN_DEADLINE_MS;
  const pollMs = Number.isFinite(deps.pollMs) && deps.pollMs > 0 ? deps.pollMs : DRAIN_POLL_MS;
  const guardMs = Number.isFinite(deps.interruptGuardMs) && deps.interruptGuardMs > 0 ? deps.interruptGuardMs : INTERRUPT_GUARD_MS;

  let draining = false;
  let ended = false;
  let inFlight = 0;
  let server = null;
  let poller = null;
  let deadline = null;
  /** Resolves with how the drain ended: { ending: 'drained' | 'deadline', interrupted }. */
  let resolveDone = () => {};
  const done = new Promise((r) => { resolveDone = r; });

  function liveJobs() {
    try {
      const s = jobs && typeof jobs.stats === 'function' ? jobs.stats() : null;
      return s && Number(s.live) > 0 ? Number(s.live) : 0;
    } catch {
      return 0;
    }
  }

  function refuse(res) {
    try {
      res.writeHead(503, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
        'Retry-After': String(RETRY_AFTER_SECONDS),
        'Cache-Control': 'no-store',
        Connection: 'close',
      });
      res.end(JSON.stringify(SERVER_RESTARTING_BODY));
    } catch { /* the socket is already gone */ }
  }

  /** The request handler wrapper: counts what is in flight; refuses new work once draining. */
  function wrap(handler) {
    return (req, res) => {
      if (draining) return refuse(res);
      inFlight += 1;
      let counted = true;
      const release = () => {
        if (!counted) return;
        counted = false;
        inFlight -= 1;
      };
      res.once('finish', release);
      res.once('close', release);
      return handler(req, res);
    };
  }

  function finish(ending, interrupted) {
    if (ended) return;
    ended = true;
    if (poller) clearI(poller);
    if (deadline) clearT(deadline);
    log(`[graceful-drain] ${ending}: exiting (${interrupted} job(s) interrupted)`);
    resolveDone({ ending, interrupted });
    exit(0);
  }

  function check() {
    if (ended) return;
    if (inFlight === 0 && liveJobs() === 0) finish('drained', 0);
  }

  function onDeadline() {
    if (ended) return;
    log(`[graceful-drain] deadline after ${deadlineMs} ms: ${inFlight} request(s), ${liveJobs()} job(s) still running — ending live jobs as interrupted`);
    let settled = false;
    const guard = setT(() => { if (!settled) { settled = true; finish('deadline', -1); } }, guardMs);
    const p = jobs && typeof jobs.interruptAll === 'function' ? jobs.interruptAll('shutdown') : Promise.resolve(0);
    Promise.resolve(p).catch(() => 0).then((n) => {
      if (settled) return;
      settled = true;
      clearT(guard);
      finish('deadline', Number(n) || 0);
    });
  }

  /** Begin draining (SIGTERM). Idempotent. Returns a promise of how the drain ended. */
  function begin(reason = 'SIGTERM') {
    if (draining) return done;
    draining = true;
    log(`[graceful-drain] ${reason}: refusing new requests; ${inFlight} request(s) and ${liveJobs()} job(s) in flight; deadline ${deadlineMs} ms`);
    if (server && typeof server.close === 'function') {
      try { server.close(); } catch { /* not listening */ }
    }
    deadline = setT(onDeadline, deadlineMs);
    poller = setI(check, pollMs);
    check();
    return done;
  }

  return {
    wrap,
    begin,
    refuse,
    attach(s) { server = s; return s; },
    isDraining: () => draining,
    inFlight: () => inFlight,
  };
}

module.exports = {
  createGracefulDrain,
  DRAIN_DEADLINE_MS,
  DRAIN_POLL_MS,
  INTERRUPT_GUARD_MS,
  RETRY_AFTER_SECONDS,
  SERVER_RESTARTING_BODY,
};
