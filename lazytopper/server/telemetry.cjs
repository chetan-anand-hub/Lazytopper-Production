const counts = new Map();

function increment(event, value = 1) {
  if (!event) return;
  const current = counts.get(event) || 0;
  const next = current + (Number.isFinite(Number(value)) ? Number(value) : 1);
  counts.set(event, next);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[telemetry] ${event}=${next}`);
  }
}

function snapshot() {
  const result = {};
  counts.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/* ═════════════════════════════════════════════════════════════════════════════
   WORKLOAD SAMPLES — the distribution side of the cost question (TELEMETRY-1).

   ★★ WHY SAMPLES AND NOT JUST COUNTERS. The counters above give TOTALS, and a
   total divided by a call count is a MEAN. A mean says nothing about the tail a
   thinking budget has to survive: the single hand-taken measurement this project
   has (1,428 thinking tokens) came from a one-sentence answer and is a FLOOR, not
   a typical grade. Budgeting from it produced a call count that contradicted the
   owner's own account of his usage. p90 is the number that decision needs, and
   p90 cannot be recovered from a sum.

   ★ WHY IT LIVES HERE AND NOT IN THE GEMINI CLIENT. This module is the singleton
   both sides ALREADY hold: `geminiClient.cjs` resolves it as its telemetry sink,
   and `routes/adminTelemetry.cjs` receives it as a dep. Putting the store in the
   client's closure instead would have needed a new dep threaded through
   `index.cjs` — a file another lane owns this wave — and would have left the
   store unreadable, i.e. dead, until that wire landed.

   ⚠ IN-PROCESS ONLY, DELIBERATELY. Nothing here is persisted. Both maps reset to
   empty on restart, exactly like `counts`, and the endpoint's `uptimeSeconds`
   bounds the window. Adding a datastore would mean DATABASE_URL, which is
   deliberately unset pending WARM-GATE-1 — and re-provisioning it is what started
   the incident this instrumentation exists to make attributable.

   NO CONTENT EVER ENTERS THIS STORE. It holds numbers, keyed by a label from a
   closed set — same firewall as the record builder that feeds it.
   ═════════════════════════════════════════════════════════════════════════════ */

// Bounded PER KEY, not globally. A 312-combination warm-pool run must not be able
// to evict the grading samples the budget is meant to be set from — which one
// shared ring would do, and which is exactly how the 2026-08-05 warm-pool run
// became permanently unquantifiable after the fact.
const WORKLOAD_SAMPLE_LIMIT = 500;

const workloadTotals = new Map();
const workloadSamples = new Map();

function sampleKey(workloadClass, marksBand) {
  return marksBand ? `${workloadClass}|${marksBand}` : workloadClass;
}

/**
 * Nearest-rank percentile.
 *
 * ★ COMPUTED FROM THE RECORDED SAMPLES, NEVER FROM THE MEAN. Returns null for an
 * empty sample — an absent percentile, never a zero.
 */
function percentileOf(values, p) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil((Number(p) / 100) * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

/** p50/p90/p99 of one sample array, or null when there is nothing to report. */
function percentileTriple(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return {
    p50: percentileOf(values, 50),
    p90: percentileOf(values, 90),
    p99: percentileOf(values, 99),
  };
}

function toNonNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Record one call's numbers against its workload class, and against its
 * (class, marks-band) pair when the band is known.
 *
 * ★ THE BANDED VIEW IS A REFINEMENT, NOT A PARTITION. A call with no marks still
 * lands under its unbanded key, so nothing is lost just because the band was
 * unavailable — and no band is invented to hold it.
 *
 * Cannot throw: the caller's contract is that a telemetry failure never fails a
 * Gemini call, and the guard is repeated here rather than assumed.
 */
function recordWorkloadSample(record) {
  try {
    if (!record || typeof record !== 'object') return;
    const klass = typeof record.workloadClass === 'string' ? record.workloadClass : '';
    if (!klass) return;
    const band =
      typeof record.marksBand === 'string' && record.marksBand ? record.marksBand : null;

    const keys = [sampleKey(klass, null)];
    if (band) keys.push(sampleKey(klass, band));

    for (const key of keys) {
      let totals = workloadTotals.get(key);
      if (!totals) {
        totals = {
          calls: 0,
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          thoughtsTokenCount: 0,
          totalTokenCount: 0,
          latencyMsTotal: 0,
          retryCount: 0,
          fallbackCount: 0,
        };
        workloadTotals.set(key, totals);
      }
      // UNBOUNDED running sums — correct after any number of calls, which is what
      // a cost estimate has to be built from. The bounded arrays below are for
      // percentiles only, and the two must not be confused.
      totals.calls += 1;
      totals.promptTokenCount += toNonNegative(record.promptTokenCount);
      totals.candidatesTokenCount += toNonNegative(record.candidatesTokenCount);
      totals.thoughtsTokenCount += toNonNegative(record.thoughtsTokenCount);
      totals.totalTokenCount += toNonNegative(record.totalTokenCount);
      totals.latencyMsTotal += toNonNegative(record.latencyMs);
      if (record.retry) totals.retryCount += 1;
      if (record.usedFallback) totals.fallbackCount += 1;

      let samples = workloadSamples.get(key);
      if (!samples) {
        samples = { thoughts: [], latencyMs: [] };
        workloadSamples.set(key, samples);
      }
      samples.thoughts.push(toNonNegative(record.thoughtsTokenCount));
      samples.latencyMs.push(toNonNegative(record.latencyMs));
      while (samples.thoughts.length > WORKLOAD_SAMPLE_LIMIT) samples.thoughts.shift();
      while (samples.latencyMs.length > WORKLOAD_SAMPLE_LIMIT) samples.latencyMs.shift();
    }
  } catch {
    /* A telemetry failure must NEVER fail a Gemini call. */
  }
}

function statsFor(key) {
  const totals = workloadTotals.get(key);
  if (!totals) return null;
  const samples = workloadSamples.get(key) || { thoughts: [], latencyMs: [] };
  return {
    ...totals,
    // How much evidence is behind the percentiles below. Reported alongside them
    // on purpose: a p99 over four samples is not a p99, and a reader who cannot
    // see the sample size cannot know that.
    sampleSize: samples.thoughts.length,
    thoughtsPercentiles: percentileTriple(samples.thoughts),
    latencyMsPercentiles: percentileTriple(samples.latencyMs),
  };
}

/**
 * Per-workload aggregates and percentiles, plus the per-marks-band refinement.
 *
 * ★ `byMarksBand` contains a band ONLY where calls carrying that mark value were
 * actually observed. It is never pre-filled from a class x band grid, so a band
 * that is missing means "not measured" — which is the answer SERVER-2 needs to
 * hear when it is the true one. A zero-filled band would read as a measurement.
 */
function workloadStats() {
  const byWorkload = {};
  const byMarksBand = {};
  for (const key of workloadTotals.keys()) {
    const pipe = key.indexOf('|');
    if (pipe === -1) {
      byWorkload[key] = statsFor(key);
    } else {
      const klass = key.slice(0, pipe);
      const band = key.slice(pipe + 1);
      if (!byMarksBand[klass]) byMarksBand[klass] = {};
      byMarksBand[klass][band] = statsFor(key);
    }
  }
  return { byWorkload, byMarksBand, sampleLimitPerKey: WORKLOAD_SAMPLE_LIMIT };
}

/** Test-only reset. Never called by the server. */
function __resetWorkloadSamples() {
  workloadTotals.clear();
  workloadSamples.clear();
}

module.exports = {
  increment,
  snapshot,
  recordWorkloadSample,
  workloadStats,
  percentileOf,
  percentileTriple,
  WORKLOAD_SAMPLE_LIMIT,
  __resetWorkloadSamples,
};
