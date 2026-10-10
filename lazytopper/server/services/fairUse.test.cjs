/**
 * fairUse.test.cjs — FAIR-USE-1 guards: fair limits on grading, decided on the server.
 *
 * Run: `node --test server/services/fairUse.test.cjs`
 * Wired into `lazytopper` test:matrix:all as `test:server:fair-use`.
 *
 * What is pinned (spec §2 U7), each test named for the clause it enforces:
 *   U2  every trial allowance: at the limit, over by N, and its IST reset boundary;
 *       a multi-question request over the limit -> 409 with `remaining`, nothing graded;
 *       checks are counted PER QUESTION; rolling 7 IST days for mock / worksheet.
 *   U1  a missing / unknown / not-believed surface is check-improve, per question.
 *   U3  each premium window cap (5 h, day, week) and its reset; caps come from env,
 *       never from the request.
 *   U4  premium at 85% of the global day -> served; trial at 85% -> shed; the global
 *       HARD ceiling still refuses premium; a header-only uid can never earn the exemption.
 *   U5  GET /api/usage/me shape — percentages only, never rupees.
 *   U8  both ways: FAIR_USE_ENFORCE unset -> served + `fair_use.would_refuse.<rule>`;
 *       FAIR_USE_ENFORCE=1 -> 409 / 429.
 *   U6  non-grading paths, the free check, unverified callers, free tier: untouched.
 *   WIRING  the REAL index.cjs over HTTP: 409 before Gemini, a served grade counted once
 *       per question after it is served, the body pre-read reaching the grader, U4 through
 *       the real limiter, /api/usage/me, and the dark default.
 *
 * MUTATIONS this file was verified against (each run alone, each restore verified):
 *   MUT-1  fairUse.cjs decide(): commit `{ checks: 1 }` per REQUEST instead of `need`
 *          -> "U2 · checks are counted PER QUESTION" RED.
 *   MUT-2  rateLimiter.cjs check(): shed premium at 80% like everyone else
 *          -> "U4 · premium at 85% of the global day is SERVED" RED.
 *   MUT-3  fairUse.cjs applyToRequest(): merge caps supplied by the request into the limits
 *          -> "U3 · the caps come from env ONLY" RED.
 *
 * FAIR-USE-3 (R5), each test named for its ruling:
 *   R1  an ungraded pass counts < 24 h and not at 24 h; a graded pass always counts; only
 *       a 2xx grade marks; OLD-FORMAT docs (plain issuedAtMs numbers + counters) keep
 *       counting exactly once and are never rewritten.
 *   R2  two tabs minting at once spend once — a REAL race against fakeFirestore, whose
 *       transactions are version-checked and re-run like Firestore's; a Firestore error
 *       in the mint is no worse than before (fail open, pass issued, spend recorded).
 *   R3  /api/usage/me carries the limits in force and they follow a changed env limit.
 *   FU3-MUT-1  fairUse.cjs passCounts(): count an ungraded pass forever -> R1 RED.
 *   FU3-MUT-2  fairUse.cjs handlePaperPass(): run mintBody on plain get/set instead of
 *              db.runTransaction -> both R2 race tests RED.
 *
 * No network, no Firestore: the ledger and the tier are injected in-process; the HTTP
 * tests boot index.cjs with firebase-admin and fetch swapped before it loads.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');

const {
  createFairUse,
  cachedReadJson,
  resolveSurface,
  verifyPaperPass,
  encodePaperPass,
  paperPassId,
  resolveLimits,
  isEnforced,
  windowDayKeys,
  DEFAULT_LIMITS,
  SURFACE_HEADER,
  CHECK_SOLUTION_PATH,
  GRADE_WORKSHEET_PATH,
  USAGE_PAPER_PATH,
  PAPER_HEADER,
  PAPER_PASS_TTL_MS,
  createGradingIdempotency,
  classifyIdempotencyRecord,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_TTL_MS,
  IDEMPOTENCY_PENDING_STALE_MS,
  IDEMPOTENCY_WAIT_MS,
  GRADING_IN_PROGRESS_BODY,
} = require('./fairUse.cjs');
const { createRateLimiter, istDayKey } = require('./rateLimiter.cjs');
const { setChargeableCount } = require('../grading/charge.cjs');

/* ── Harness ─────────────────────────────────────────────────────────────── */

// 2026-09-27 06:00 UTC = 2026-09-27 11:30 IST.
const NOW = Date.UTC(2026, 8, 27, 6, 0, 0);
const TODAY = '2026-09-27';
const NEXT_IST_MIDNIGHT = '2026-09-27T18:30:00.000Z';
const INR = 1e6; // micro-rupees per rupee — the ledger's unit

function recorder() {
  const events = [];
  return {
    events,
    increment: (event, value = 1) => events.push({ event, value }),
    count: (event) => events.filter((e) => e.event === event).length,
    startingWith: (prefix) => events.filter((e) => e.event.startsWith(prefix)).map((e) => e.event),
  };
}

/** A ledger over a plain object { dayKey: data }. Records every trial write. */
function fakeLedger(days = {}, { failRead = false } = {}) {
  const trialWrites = [];
  const reads = [];
  return {
    trialWrites,
    reads,
    async readDays(uid, keys) {
      reads.push({ uid, keys });
      if (failRead) throw new Error('ledger down');
      return new Map(keys.map((k) => [k, days[k] || {}]));
    },
    recordTrialUse(uid, counts) {
      trialWrites.push({ uid, counts });
      return Promise.resolve(true);
    },
  };
}

/**
 * FAIR-USE-3 — a Firestore over the SAME `days` object the fake ledger reads, honouring
 * TRANSACTIONS the way Firestore does: a transaction's reads are version-checked at commit
 * and, if any document it read was written meanwhile, the whole function is re-run on the
 * new data. Every get / set / commit yields (setImmediate), so two operations started
 * together really do interleave — a race here is a race.
 *
 * Plain `ref.get()` / `ref.set()` outside a transaction are applied with no check at all
 * (which is what the "mint without the transaction" mutation falls back to).
 */
function fakeFirestore(days, { failTx = false } = {}) {
  const versions = new Map();
  const writes = [];
  const txReads = [];
  let commits = 0;
  let retries = 0;
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  function deepMerge(target, src) {
    for (const [k, v] of Object.entries(src)) {
      if (isMap(v)) {
        if (!isMap(target[k])) target[k] = {};
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
  }
  function snapshotOf(dayKey) {
    const data = days[dayKey];
    return { exists: data !== undefined, data: () => clone(data) };
  }
  function apply(ref, data, opts) {
    writes.push({ uid: ref.uid, dayKey: ref.dayKey, data: clone(data), merge: !!(opts && opts.merge) });
    if (opts && opts.merge) {
      days[ref.dayKey] = days[ref.dayKey] || {};
      deepMerge(days[ref.dayKey], clone(data));
    } else {
      days[ref.dayKey] = clone(data);
    }
    versions.set(ref.dayKey, (versions.get(ref.dayKey) || 0) + 1);
  }
  function docRef(parts) {
    const ref = {
      path: parts.join('/'),
      uid: parts[1],
      dayKey: parts[3],
      collection: (name) => ({ doc: (id) => docRef([...parts, name, id]) }),
      async get() {
        await tick();
        return snapshotOf(ref.dayKey);
      },
      async set(data, opts) {
        await tick();
        apply(ref, data, opts);
      },
    };
    return ref;
  }
  const db = {
    collection: (name) => ({ doc: (id) => docRef([name, id]) }),
    async runTransaction(fn) {
      if (failTx) throw new Error('firestore unavailable');
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const seen = new Map();
        const queued = [];
        const read = [];
        const tx = {
          async get(ref) {
            await tick();
            seen.set(ref.dayKey, versions.get(ref.dayKey) || 0);
            read.push(ref.dayKey);
            return snapshotOf(ref.dayKey);
          },
          getAll(...refs) {
            return Promise.all(refs.map((r) => tx.get(r)));
          },
          set(ref, data, opts) {
            queued.push([ref, data, opts]);
            return tx;
          },
        };
        const result = await fn(tx);
        txReads.push(read);
        await tick();
        // Commit: atomic from here (no await) — check every read, then apply every write.
        const stale = [...seen].some(([key, v]) => (versions.get(key) || 0) !== v);
        if (stale) {
          retries += 1;
          continue;
        }
        for (const [ref, data, opts] of queued) apply(ref, data, opts);
        commits += 1;
        return result;
      }
      throw new Error('transaction contention');
    },
  };
  return {
    db,
    writes,
    txReads,
    stats: () => ({ commits, retries }),
    /** Every paperPasses entry written by a MINT (no gradedAtMs), in write order. */
    mintWrites: () => writes.flatMap((w) => Object.entries((w.data && w.data.paperPasses) || {})
      .filter(([, e]) => e && typeof e === 'object' && e.gradedAtMs === undefined)
      .map(([passId, e]) => ({ uid: w.uid, dayKey: w.dayKey, passId, issuedAtMs: e.issuedAtMs, surface: e.surface }))),
    /** Every graded mark written, in write order. */
    gradedWrites: () => writes.flatMap((w) => Object.entries((w.data && w.data.paperPasses) || {})
      .filter(([, e]) => e && typeof e === 'object' && e.gradedAtMs !== undefined)
      .map(([passId, e]) => ({ uid: w.uid, dayKey: w.dayKey, passId, ...e }))),
    /** Any write that touched a trial counter (FAIR-USE-3: a mint never does). */
    counterWrites: () => writes.filter((w) => Object.keys(w.data || {}).some((k) => /^trial/.test(k))),
  };
}

function fakeRes() {
  const res = new EventEmitter();
  res.statusCode = 0;
  res.sent = null;
  /** Simulate the route handler answering. */
  res.serve = (status = 200) => {
    res.statusCode = status;
    res.emit('finish');
  };
  return res;
}

function fakeReq({ surface, body, headers = {} } = {}) {
  const req = { headers: { ...headers } };
  if (surface !== undefined) req.headers[SURFACE_HEADER] = surface;
  req.__body = body;
  return req;
}

const rawReadJson = async (req) => req.__body || {};

/** A fair-use gate over an injected tier, ledger and clock. */
function rig({ tier = 'trial', days = {}, env = { FAIR_USE_ENFORCE: '1' }, now = NOW, failRead = false, tierOf } = {}) {
  const clock = { now };
  const ledger = fakeLedger(days, { failRead });
  // The mint transaction and the graded mark run on the SAME day objects the ledger reads.
  const fs = fakeFirestore(days, { failTx: failRead });
  const telemetry = recorder();
  const sent = [];
  let tierReads = 0;
  const gate = createFairUse({
    tierOf: tierOf || (async () => { tierReads += 1; return tier; }),
    ledger,
    telemetry,
    env,
    now: () => clock.now,
    readJson: rawReadJson,
    resolveFirestore: () => ({ db: fs.db }),
    sendJson: (res, status, body) => {
      sent.push({ status, body });
      res.sent = { status, body };
    },
    verifiedCaller: { resolveVerifiedUid: async (req) => (req.headers.authorization === 'Bearer ok' ? 'stu-1' : '') },
  });
  return { gate, ledger, fs, telemetry, sent, clock, days, tierReads: () => tierReads };
}

/** The surfaces of every mint write, in order. */
const mintedSurfaces = (r) => r.fs.mintWrites().map((w) => w.surface);

function questions(n) {
  return Array.from({ length: n }, (_, i) => ({ qNumber: i + 1, marks: 2, questionText: `Question ${i + 1}` }));
}

/** Run one request through the gate; if it was let through, the handler serves `status`. */
async function run(r, { path: reqPath = CHECK_SOLUTION_PATH, surface, body, headers, uid = 'stu-1', serve = 200, options } = {}) {
  const req = fakeReq({ surface, body, headers });
  const res = fakeRes();
  const answered = await r.gate.applyToRequest(req, res, reqPath, uid, options);
  if (!answered && serve) res.serve(serve);
  await new Promise((resolve) => setImmediate(resolve));
  return { answered, res, req };
}

const dayOf = (offsetDays) => istDayKey(NOW - offsetDays * 86400000);

/* ── Paper passes (FAIR-USE-2) ────────────────────────────────────────────── */

const SECRET = 'test-paper-secret';
/** Enforcing, with passes configured. */
const PASS_ENV = Object.freeze({ FAIR_USE_ENFORCE: '1', FAIR_USE_PAPER_SECRET: SECRET });
/** The ship state: dark, but with passes configured. */
const PASS_ENV_DARK = Object.freeze({ FAIR_USE_PAPER_SECRET: SECRET });

/** POST /api/usage/paper through the gate. Returns { status, body }. */
async function mint(r, { surface = 'chapter-test', paperKey = 'ct-1', headers = { authorization: 'Bearer ok' }, body } = {}) {
  const res = fakeRes();
  const req = { headers: { ...headers }, __body: body !== undefined ? body : { surface, paperKey } };
  await r.gate.handlePaperPass(req, res);
  return res.sent;
}

/** A grading request carrying a paper pass. */
function paperHeaders(token) {
  return { [PAPER_HEADER]: token };
}

/* ══════════════════════════════════════════════════════════════════════════
   U2 · TRIAL — 5 answer checks per IST day, counted PER QUESTION
   ══════════════════════════════════════════════════════════════════════════ */

test('U2 · trial checks AT the limit: a 1-question check is refused 409, nothing counted', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 5 } } });
  const out = await run(r, { surface: 'check-improve' });
  assert.equal(out.answered, true);
  assert.deepEqual(out.res.sent, {
    status: 409,
    body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT },
  });
  assert.equal(r.ledger.trialWrites.length, 0, 'a refused request must not be counted');
});

test('U2 · trial checks one UNDER the limit: served, and counted once it is served', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 4 } } });
  const out = await run(r, { surface: 'quick-practice' });
  assert.equal(out.answered, false);
  assert.equal(out.res.sent, null);
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 1 } }]);
});

test('U2 · multi-question over the limit by N -> 409 with `remaining`, NOTHING graded or counted', async () => {
  for (const surface of ['check-improve', 'quick-practice']) {
    const r = rig({ days: { [TODAY]: { trialChecks: 3 } } });
    const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface, body: { worksheetId: 'w', questions: questions(4) } });
    assert.equal(out.answered, true, `${surface}: must be refused`);
    assert.deepEqual(out.res.sent.body, { error: 'trial_limit', remaining: 2, resetAt: NEXT_IST_MIDNIGHT });
    assert.equal(out.res.sent.status, 409);
    assert.equal(r.ledger.trialWrites.length, 0);
  }
});

// MUTATION MUT-1 target.
test('U2 · checks are counted PER QUESTION — a 3-question grade spends 3 checks, not 1', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 2 } } });
  const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body: { worksheetId: 'w', questions: questions(3) } });
  assert.equal(out.answered, false, 'exactly the remaining 3 must be served');
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }]);

  // The count is what the grader will grade: entries its own filter drops are not counted.
  const r2 = rig({ days: {} });
  const body = { worksheetId: 'w', questions: [...questions(2), { qNumber: 0, questionText: 'x' }, { qNumber: 9, questionText: '  ' }] };
  await run(r2, { path: GRADE_WORKSHEET_PATH, surface: 'quick-practice', body });
  assert.deepEqual(r2.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 2 } }]);
});

test('U2 · a served grade is counted only on a 2xx — a failed or refused-downstream one costs nothing', async () => {
  const r = rig({ days: {} });
  await run(r, { serve: 500 });
  await run(r, { serve: 402 });
  assert.equal(r.ledger.trialWrites.length, 0);
  await run(r, { serve: 200 });
  assert.equal(r.ledger.trialWrites.length, 1);
});

test('U2 · trial checks reset on the IST day boundary, not the UTC one', async () => {
  const days = { [TODAY]: { trialChecks: 5 } };
  // 2026-09-27 18:29:59 UTC = 23:59:59 IST on the 27th -> still today, refused.
  const before = rig({ days, now: Date.UTC(2026, 8, 27, 18, 29, 59) });
  assert.equal((await run(before)).answered, true);
  // 2026-09-27 18:30:00 UTC = 00:00 IST on the 28th — the UTC date is STILL the 27th.
  const after = rig({ days, now: Date.UTC(2026, 8, 27, 18, 30, 0) });
  const out = await run(after);
  assert.equal(out.answered, false, 'a new IST day must restore the checks');
  assert.equal(after.ledger.reads[0].keys.at(-1), '2026-09-28');
});

/* ── 1 chapter test per IST day ───────────────────────────────────────────── */

test('U2 · chapter test: 1 per IST day — at the limit the MINT is 409, next IST day served, counted as ONE paper', async () => {
  const days = { [TODAY]: { trialChapterTests: 1 } };
  const body = { worksheetId: 'ct-1', questions: questions(8) };
  const at = rig({ days, env: PASS_ENV });
  assert.deepEqual(await mint(at, { surface: 'chapter-test', paperKey: 'ct-1' }), {
    status: 409,
    body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT },
  });
  assert.equal(at.fs.mintWrites().length, 0, 'a refused mint spends nothing');

  const next = rig({ days, env: PASS_ENV, now: Date.UTC(2026, 8, 27, 18, 30, 0) });
  const minted = await mint(next, { surface: 'chapter-test', paperKey: 'ct-1' });
  assert.equal(minted.status, 200);
  assert.deepEqual(mintedSurfaces(next), ['chapter-test']);
  assert.deepEqual(next.fs.counterWrites(), [], 'FAIR-USE-3 R1: the mint bumps no counter — the entry IS the spend');
  const served = await run(next, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body, headers: paperHeaders(minted.body.token) });
  assert.equal(served.answered, false);
  assert.deepEqual(next.ledger.trialWrites, [],
    'an 8-question chapter test is one chapter test (spent at the mint), and spends no answer checks');
});

/* ── 1 full mock and 1 worksheet grading per ROLLING 7 IST days ────────────── */

for (const [surface, field, counterKey] of [
  ['full-mock', 'trialMocks', 'mocks'],
  ['worksheet', 'trialWorksheets', 'worksheets'],
]) {
  test(`U2 · ${surface}: 1 per rolling 7 IST days — 6 days ago refused (reset when it leaves), 7 days ago served`, async () => {
    const paperKey = `${surface}-1`;
    // Used 6 IST days ago (2026-09-21): still inside [09-21 .. 09-27].
    const inside = rig({ env: PASS_ENV, days: { [dayOf(6)]: { [field]: 1 } } });
    const refused = await mint(inside, { surface, paperKey });
    assert.equal(refused.status, 409);
    // It leaves the window at the start of 09-28 IST = 2026-09-27T18:30Z.
    assert.deepEqual(refused.body, { error: 'trial_limit', remaining: 0, resetAt: '2026-09-27T18:30:00.000Z' });

    // Used 4 days ago: leaves at the start of 2026-09-30 IST.
    const mid = rig({ env: PASS_ENV, days: { [dayOf(4)]: { [field]: 1 } } });
    assert.equal((await mint(mid, { surface, paperKey })).body.resetAt, '2026-09-29T18:30:00.000Z');

    // Used 7 IST days ago (2026-09-20): outside the window.
    const outside = rig({ env: PASS_ENV, days: { [dayOf(7)]: { [field]: 1 } } });
    const served = await mint(outside, { surface, paperKey });
    assert.equal(served.status, 200);
    assert.deepEqual(mintedSurfaces(outside), [surface]);
    assert.deepEqual(outside.fs.txReads[0], windowDayKeys(NOW));
    assert.equal(outside.fs.txReads[0].length, 7);
    assert.ok(!outside.fs.txReads[0].includes(dayOf(7)));
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   U1 · THE SURFACE HEADER IS UNTRUSTED
   ══════════════════════════════════════════════════════════════════════════ */

test('U1 · missing / unknown surface -> check-improve, counted per question', async () => {
  for (const surface of [undefined, '', 'banana', 'CHAPTER TEST', 'full_mock']) {
    const r = rig({ days: {} });
    await run(r, { path: GRADE_WORKSHEET_PATH, surface, body: { worksheetId: 'w', questions: questions(3) } });
    assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }], `surface=${surface}`);
  }
});

test('U1 · a forged surface never buys a cheaper allowance than the fallback', async () => {
  // A paper surface on the single-question endpoint is not believed.
  const one = rig({ days: { [TODAY]: { trialChecks: 5 } } });
  assert.equal((await run(one, { surface: 'worksheet' })).answered, true, 'check-solution is always per question');

  // A paper surface on a C&I / Quick Practice id is not believed either.
  for (const worksheetId of ['ci:ABC123', 'qp:XYZ', 'CI:abc']) {
    const r = rig({ days: { [TODAY]: { trialChecks: 5 } } });
    const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'worksheet', body: { worksheetId, questions: questions(3) } });
    assert.equal(out.answered, true, `${worksheetId}: must fall back to per-question checks`);
    assert.equal(out.res.sent.body.remaining, 0);
  }
  assert.equal(resolveSurface({ headers: { [SURFACE_HEADER]: 'full-mock' } }, CHECK_SOLUTION_PATH, null), 'check-improve');
  // FAIR-USE-2: the header alone no longer makes a paper; with a verified pass for it, it does.
  assert.equal(resolveSurface({ headers: { [SURFACE_HEADER]: ' Full-Mock ' } }, GRADE_WORKSHEET_PATH, { worksheetId: 'fm-1' }), 'check-improve');
  assert.equal(resolveSurface({ headers: { [SURFACE_HEADER]: ' Full-Mock ' } }, GRADE_WORKSHEET_PATH, { worksheetId: 'fm-1' }, { surface: 'full-mock' }), 'full-mock');
  assert.equal(resolveSurface({ headers: { [SURFACE_HEADER]: 'full-mock' } }, GRADE_WORKSHEET_PATH, { worksheetId: 'fm-1' }, { surface: 'worksheet' }), 'check-improve',
    'a pass for ANOTHER paper surface does not make this one');
});

/* ══════════════════════════════════════════════════════════════════════════
   U3 · PREMIUM — real cost, three rolling windows
   ══════════════════════════════════════════════════════════════════════════ */

test('U3 · premium WEEK cap ₹84 over rolling 7 IST days -> 429 week, reset when enough leaves', async () => {
  const days = { [dayOf(3)]: { costMicroInr: 50 * INR }, [dayOf(1)]: { costMicroInr: 34 * INR } };
  const r = rig({ tier: 'premium', days });
  const out = await run(r);
  // 09-24's ₹50 leaves at the start of 10-01 IST = 2026-09-30T18:30Z, dropping the week to ₹34.
  assert.deepEqual(out.res.sent, {
    status: 429,
    body: { error: 'usage_limit', window: 'week', resetAt: '2026-09-30T18:30:00.000Z' },
  });
  // ₹83.99 in the week -> served.
  const under = rig({ tier: 'premium', days: { [dayOf(3)]: { costMicroInr: 50 * INR }, [dayOf(1)]: { costMicroInr: 33.99 * INR } } });
  assert.equal((await run(under)).answered, false);
  // Spend 7 days ago is outside the window.
  const old = rig({ tier: 'premium', days: { [dayOf(7)]: { costMicroInr: 500 * INR } } });
  assert.equal((await run(old)).answered, false);
});

test('U3 · premium DAY cap ₹38 per IST day -> 429 day, reset at the next IST midnight', async () => {
  const r = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 38 * INR } } });
  assert.deepEqual((await run(r)).res.sent, {
    status: 429,
    body: { error: 'usage_limit', window: 'day', resetAt: NEXT_IST_MIDNIGHT },
  });
  const under = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 37.99 * INR } } });
  assert.equal((await run(under)).answered, false);
  // Yesterday's ₹38 does not count toward today.
  const yday = rig({ tier: 'premium', days: { [dayOf(1)]: { costMicroInr: 38 * INR } } });
  assert.equal((await run(yday)).answered, false);
});

test('U3 · premium 5-HOUR cap ₹25 over rolling IST hour buckets -> 429 fiveHour, reset when the oldest leaves', async () => {
  // NOW is 11:30 IST: the window is hours 07..11.
  const r = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 25 * INR, hourCostMicroInr: { '08': 15 * INR, 11: 10 * INR } } } });
  // Hour 08 leaves at 13:00 IST = 07:30 UTC, dropping the window to ₹10.
  assert.deepEqual((await run(r)).res.sent, {
    status: 429,
    body: { error: 'usage_limit', window: 'fiveHour', resetAt: '2026-09-27T07:30:00.000Z' },
  });
  // Hour 06 is outside the window.
  const outside = rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 25 * INR, hourCostMicroInr: { '06': 15 * INR, 11: 10 * INR } } } });
  assert.equal((await run(outside)).answered, false);
  // Across IST midnight: 01:30 IST on the 28th reads hour 23 of the 27th's document.
  const late = Date.UTC(2026, 8, 27, 20, 0, 0);
  const cross = rig({
    tier: 'premium',
    now: late,
    days: { [TODAY]: { costMicroInr: 20 * INR, hourCostMicroInr: { 23: 20 * INR } }, '2026-09-28': { costMicroInr: 5 * INR, hourCostMicroInr: { '01': 5 * INR } } },
  });
  const out = await run(cross);
  assert.equal(out.res.sent.body.window, 'fiveHour');
  // Hour 23 of the 27th (17:30Z) leaves 5 h later = 22:30Z.
  assert.equal(out.res.sent.body.resetAt, '2026-09-27T22:30:00.000Z');
});

/* A-17 J1b METER-PRICE-1 (owner 2026-10-07): "grading must count its real cost against premium fair-use caps". */

/** A Firestore that APPLIES the ledger's merge increments (nested hour buckets too) and reads them back. */
function applyingFirestore() {
  const docs = new Map();
  const FieldValue = { increment: (n) => ({ __inc: n }) };
  const merge = (into, data) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && '__inc' in v) into[k] = (Number(into[k]) || 0) + v.__inc;
      else if (v && typeof v === 'object') merge((into[k] = into[k] && typeof into[k] === 'object' ? into[k] : {}), v);
      else into[k] = v;
    }
  };
  const docRef = (p) => ({
    collection: (name) => collRef(p + '/' + name),
    async set(data) { const d = docs.get(p) || {}; merge(d, data); docs.set(p, d); },
    async get() { const d = docs.get(p); return { exists: Boolean(d), data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; },
  });
  const collRef = (p) => ({ doc: (id) => docRef(p + '/' + id) });
  return { docs, resolve: () => ({ db: { collection: collRef }, FieldValue }) };
}

// MUTATION J1b-M1 (delete the gemini-3.8-flash price row) -> RED: four grading calls cost 0 and the 5th request is SERVED.
test('J1b (c) · a PREMIUM student driven past the 5-hour cap by gemini-3.8-flash GRADING calls is refused (429 fiveHour)', async () => {
  const ledgerLib = require('./usageLedger.cjs');
  // One grading call: 10,000 prompt + 20,000 thinking tokens on gemini-3.8-flash (Sept 2026 price):
  // (10000 * $0.75 + 20000 * $3.75) / 1M * 88 = Rs 7.26. Three calls = Rs 21.78 (< Rs 25); four = Rs 29.04 (>= Rs 25).
  const CALL = { model: 'gemini-3.8-flash', promptTokenCount: 10000, candidatesTokenCount: 0, thoughtsTokenCount: 20000 };
  assert.equal(ledgerLib.buildLedgerIncrement(CALL, { env: {}, nowMs: NOW }).increment.costMicroInr, 7.26 * INR);
  const store = applyingFirestore();
  const ledger = ledgerLib.createUsageLedger({ resolveFirestore: store.resolve, telemetry: { increment() {} }, env: {}, now: () => NOW });
  const sent = [];
  const gate = createFairUse({
    tierOf: async () => 'premium', ledger, telemetry: recorder(), env: { FAIR_USE_ENFORCE: '1' }, now: () => NOW,
    readJson: rawReadJson, resolveFirestore: () => ({ db: store.resolve().db }),
    sendJson: (res, status, body) => { sent.push({ status, body }); res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  /** One graded request: the grading core holds the call in a meter group and settles it at the graded share (1). */
  async function gradeOnce() {
    const req = fakeReq({ body: { question: 'Q', marks: 3 } });
    const res = fakeRes();
    const answered = await ledgerLib.runWithRequestContext(async () => {
      ledgerLib.bindRequestUid('stu-1', CHECK_SOLUTION_PATH);
      const refused = await gate.applyToRequest(req, res, CHECK_SOLUTION_PATH, 'stu-1');
      if (refused) return true;
      const group = ledgerLib.createMeterGroup();
      await ledgerLib.runInMeterGroup(group, async () => ledger.recordUsage(CALL)); // what geminiClient does
      ledgerLib.settleMeterGroup(group, 1); // every question graded
      res.serve(200);
      return false;
    });
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r));
    return { answered, res };
  }
  for (let i = 1; i <= 4; i += 1) assert.equal((await gradeOnce()).answered, false, 'grade ' + i + ' is served (the cap has not been reached before it)');
  const day = store.docs.get('usageLedger/stu-1/days/' + TODAY);
  assert.equal(day.costMicroInr, 4 * 7.26 * INR, 'the premium meter holds the real cost of the four grading calls');
  assert.equal(day.hourCostMicroInr['11'], 4 * 7.26 * INR, 'in the 11:00 IST bucket the 5-hour cap reads');
  assert.equal(day.providerSpendMicroInr, 4 * 7.26 * INR, 'and the real spend');
  const over = await gradeOnce();
  assert.equal(over.answered, true, 'the 5th grade is refused');
  assert.equal(over.res.sent.status, 429);
  assert.equal(over.res.sent.body.error, 'usage_limit');
  assert.equal(over.res.sent.body.window, 'fiveHour');
});

// MUTATION MUT-3 target.
test('U3 · the caps come from env ONLY — never from the request', async () => {
  const days = { [TODAY]: { costMicroInr: 38 * INR, trialChecks: 5 } };
  const lifted = Object.fromEntries(Object.values(require('./fairUse.cjs').LIMIT_ENV).map((k) => [k, '100000']));
  const headers = { 'x-fair-use-caps': JSON.stringify(lifted), 'x-fair-use-premium-day-inr': '100000' };
  const body = { worksheetId: 'w', questions: questions(1), caps: lifted, ...lifted };

  const premium = rig({ tier: 'premium', days });
  const p = await run(premium, { path: GRADE_WORKSHEET_PATH, headers, body });
  assert.equal(p.res.sent && p.res.sent.status, 429, 'a cap carried by the request must be ignored');

  const trial = rig({ tier: 'trial', days });
  const t = await run(trial, { path: GRADE_WORKSHEET_PATH, headers, body });
  assert.equal(t.res.sent && t.res.sent.status, 409, 'an allowance carried by the request must be ignored');

  // CONTROL: the SAME cap lifted through env is honoured — so the test can tell the two apart.
  const viaEnv = rig({ tier: 'premium', days, env: { FAIR_USE_ENFORCE: '1', FAIR_USE_PREMIUM_DAY_INR: '100' } });
  assert.equal((await run(viaEnv, { path: GRADE_WORKSHEET_PATH, headers, body })).answered, false);
  assert.equal(resolveLimits({}).premium.dayMicroInr, DEFAULT_LIMITS.premiumDayInr * INR);
  assert.equal(resolveLimits({ FAIR_USE_PREMIUM_DAY_INR: 'junk' }).premium.dayMicroInr, 38 * INR);
});

/* ══════════════════════════════════════════════════════════════════════════
   U8 · DARK BY DEFAULT — both ways
   ══════════════════════════════════════════════════════════════════════════ */

test('U8 · FAIR_USE_ENFORCE unset -> SERVED, counters still move, would_refuse telemetry emitted', async () => {
  const trial = rig({ env: {}, days: { [TODAY]: { trialChecks: 5 } } });
  const t = await run(trial, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body: { worksheetId: 'w', questions: questions(2) } });
  assert.equal(t.answered, false);
  assert.equal(t.res.sent, null, 'nothing may be refused while enforcement is dark');
  assert.equal(trial.telemetry.count('fair_use.would_refuse.trial_checks'), 1);
  assert.deepEqual(trial.telemetry.startingWith('fair_use.refused.'), []);
  assert.deepEqual(trial.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 2 } }], 'the honest count keeps moving');

  const premium = rig({ tier: 'premium', env: {}, days: { [TODAY]: { costMicroInr: 40 * INR } } });
  const p = await run(premium);
  assert.equal(p.answered, false);
  assert.equal(premium.telemetry.count('fair_use.would_refuse.premium_day'), 1);

  for (const value of ['0', 'true', 'yes', ' 2', '']) assert.equal(isEnforced({ FAIR_USE_ENFORCE: value }), false, value);
  assert.equal(isEnforced({}), false);
});

test('U8 · FAIR_USE_ENFORCE=1 -> 409 (trial) and 429 (premium), refused telemetry, no would_refuse', async () => {
  const trial = rig({ env: { FAIR_USE_ENFORCE: '1' }, days: { [TODAY]: { trialChecks: 5 } } });
  assert.equal((await run(trial)).res.sent.status, 409);
  assert.equal(trial.telemetry.count('fair_use.refused.trial_checks'), 1);
  assert.deepEqual(trial.telemetry.startingWith('fair_use.would_refuse.'), []);

  const premium = rig({ tier: 'premium', env: { FAIR_USE_ENFORCE: '1' }, days: { [TODAY]: { costMicroInr: 40 * INR } } });
  assert.equal((await run(premium)).res.sent.status, 429);
  assert.equal(premium.telemetry.count('fair_use.refused.premium_day'), 1);
});

/* ══════════════════════════════════════════════════════════════════════════
   U6 · UNTOUCHED — and FAIL-OPEN
   ══════════════════════════════════════════════════════════════════════════ */

test('U6 · non-grading paths, free checks, unverified callers and the free tier are never touched', async () => {
  const days = { [TODAY]: { trialChecks: 99, costMicroInr: 999 * INR } };
  for (const reqPath of ['/api/tutor', '/api/detect-question', '/api/step-solution', '/api/generate-visual']) {
    const r = rig({ days });
    assert.equal((await run(r, { path: reqPath })).answered, false, reqPath);
    assert.equal(r.tierReads(), 0, `${reqPath}: must not even read the tier`);
  }
  const free = rig({ days });
  assert.equal((await run(free, { options: { freeCheck: true } })).answered, false);
  assert.equal(free.tierReads(), 0, 'an admitted free check is not fair-use metered');
  const anon = rig({ days });
  assert.equal((await run(anon, { uid: '' })).answered, false);
  assert.equal(anon.tierReads(), 0, 'a header-only / anonymous caller is not fair-use metered');
  for (const tier of ['free', null, 'weird']) {
    const r = rig({ tier, days });
    const out = await run(r);
    assert.equal(out.answered, false, `tier=${tier}`);
    assert.equal(r.ledger.reads.length, 0);
    assert.equal(r.ledger.trialWrites.length, 0);
  }
});

test('U6 · FAIL-OPEN: an unreadable ledger or tier serves the request (a refusal needs a positive read)', async () => {
  const r = rig({ failRead: true });
  const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body: { worksheetId: 'w', questions: questions(9) } });
  assert.equal(out.answered, false);
  assert.equal(r.telemetry.count('fair_use.ledger_unreadable'), 1);
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 9 } }]);

  const t = rig({ tierOf: async () => { throw new Error('firestore down'); } });
  assert.equal((await run(t)).answered, false);
  assert.equal(t.telemetry.count('fair_use.tier_unknown'), 1);
});

test('U6 · the grade-worksheet body is read ONCE and the handler gets the SAME parse (or the same failure)', async () => {
  const r = rig({ days: {} });
  const body = { worksheetId: 'w', questions: questions(2) };
  const { req } = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'check-improve', body, serve: 0 });
  let rawCalls = 0;
  const handlerReadJson = cachedReadJson(async () => { rawCalls += 1; return { other: true }; });
  assert.equal(await handlerReadJson(req, 8 * 1024 * 1024), body, 'the handler must receive the pre-read parse');
  assert.equal(rawCalls, 0, 'the stream must not be read twice');

  // No pre-read -> the original readJson, untouched.
  assert.deepEqual(await handlerReadJson({ headers: {} }), { other: true });
  assert.equal(rawCalls, 1);

  // A body that fails to parse: fair use steps aside, the handler sees the SAME rejection.
  const bad = createFairUse({
    tierOf: async () => 'trial',
    ledger: fakeLedger(),
    env: { FAIR_USE_ENFORCE: '1' },
    readJson: async () => { throw new Error('Request body too large'); },
    sendJson: () => assert.fail('fair use must not answer a request it could not read'),
  });
  const badReq = { headers: {} };
  assert.equal(await bad.applyToRequest(badReq, fakeRes(), GRADE_WORKSHEET_PATH, 'stu-1'), false);
  await assert.rejects(cachedReadJson(async () => ({}))(badReq), /Request body too large/);
});

/* ══════════════════════════════════════════════════════════════════════════
   U4 · PAYING STUDENTS ARE NEVER PAUSED BY THE DAY'S BUDGET
   ══════════════════════════════════════════════════════════════════════════ */

const LIMITS_100 = Object.freeze({
  vision: { soft: 1000, hard: 1000 },
  tutor: { soft: 1000, hard: 1000 },
  practice: { soft: 1000, hard: 1000 },
  visual: { soft: 1000, hard: 1000 },
  anonymous: { soft: 1000, hard: 1000 },
  global: { soft: 1000, hard: 100 },
});

/** A limiter whose global day already holds `n` calls from OTHER students. */
function limiterAt(n) {
  const telemetry = recorder();
  const limiter = createRateLimiter({ now: () => NOW, telemetry, limits: LIMITS_100 });
  for (let i = 0; i < n; i += 1) {
    const v = limiter.check({ headers: {} }, '/api/tutor', `other-${i}`);
    assert.equal(v.allowed, true);
  }
  return { limiter, telemetry };
}

// MUTATION MUT-2 target.
test('U4 · premium at 85% of the global day is SERVED; trial at 85% is SHED exactly as before', async () => {
  const { limiter, telemetry } = limiterAt(85);
  assert.equal(limiter.wouldShed('/api/check-solution'), true, 'CONTROL: 85% is past the 80% shed line');
  assert.equal(limiter.wouldShed('/api/grade-worksheet'), true);
  assert.equal(limiter.wouldShed('/api/tutor'), false, 'only vision is ever shed');

  const premium = limiter.check({ headers: {} }, '/api/check-solution', 'premium-uid', { premium: true });
  assert.equal(premium.allowed, true, 'a paying student must not be paused by the day budget');
  assert.equal(telemetry.count('rate_limit.shed.vision.premium_exempt'), 1);

  const trial = limiter.check({ headers: {} }, '/api/check-solution', 'trial-uid');
  assert.equal(trial.allowed, false);
  assert.equal(trial.status, 429);
  assert.equal(trial.body.class, 'vision', 'the trial caller meets the P2 shed, unchanged');

  // A header-only (unverified) uid cannot earn the exemption, even if asked.
  const forged = limiter.check({ headers: { 'x-lazytopper-uid': 'premium-uid' } }, '/api/check-solution', '', { premium: true });
  assert.equal(forged.allowed, false);
  assert.equal(forged.body.class, 'vision');
});

test('U4 · below 80% nobody is shed and wouldShed() is false — no tier read is needed', () => {
  const { limiter } = limiterAt(10);
  assert.equal(limiter.wouldShed('/api/check-solution'), false);
  assert.equal(limiter.check({ headers: {} }, '/api/check-solution', 'trial-uid').allowed, true);
});

// FU-GLOBAL-SHED (owner P = 0.25): the global HARD ceiling no longer refuses a VERIFIED premium caller at
// 100% - it refuses past floor(hard x 1.25). A free / trial caller is refused at 100% exactly as before.
test('U4 / FU-GLOBAL-SHED · a premium caller rides the margin above the global HARD ceiling, and is refused only past it', () => {
  const { limiter, telemetry } = limiterAt(100);
  const hardFree = limiter.check({ headers: {} }, '/api/check-solution', 'trial-uid');
  assert.equal(hardFree.allowed, false, 'CONTROL: the free caller is refused at 100%');
  assert.equal(hardFree.body.error, 'busy_today');
  assert.equal(hardFree.body.class, 'global');
  assert.equal(hardFree.body.scope, 'free');

  const v = limiter.check({ headers: {} }, '/api/check-solution', 'premium-uid', { premium: true });
  assert.equal(v.allowed, true, 'a paying student is served past the ceiling');
  assert.equal(telemetry.count('rate_limit.global_overflow.premium'), 1);

  // fill the margin: 25 calls above 100 (101..125), then the 126th is refused for premium too
  for (let i = 1; i < 25; i += 1) {
    assert.equal(limiter.check({ headers: {} }, '/api/tutor', `p-${i}`, { premium: true }).allowed, true, `overflow call ${i + 1}`);
  }
  const past = limiter.check({ headers: {} }, '/api/tutor', 'p-last', { premium: true });
  assert.equal(past.allowed, false, 'past floor(hard x 1.25) even premium is refused');
  assert.equal(past.body.error, 'busy_today');
  assert.equal(past.body.scope, 'all', 'and is not told it is a free-account matter');
});

test('U4 / FU-GLOBAL-SHED · the premium margin needs a VERIFIED caller (a header-only uid cannot earn it)', () => {
  const { limiter } = limiterAt(100);
  const forged = limiter.check({ headers: { 'x-lazytopper-uid': 'premium-uid' } }, '/api/tutor', '', { premium: true });
  assert.equal(forged.allowed, false);
  assert.equal(forged.body.error, 'busy_today');
});

test('U4 / FU-GLOBAL-SHED · the tier is read for EVERY paid class at or past 80% (Gap 2), and for none below it', () => {
  const at85 = limiterAt(85).limiter;
  for (const path of ['/api/tutor', '/api/check-solution', '/api/grade-worksheet', '/api/generate-visual']) {
    assert.equal(at85.needsTierRead(path), true, path);
  }
  assert.equal(at85.needsTierRead('/api/health'), false, 'an unpaid path never needs a tier read');
  const at10 = limiterAt(10).limiter;
  assert.equal(at10.needsTierRead('/api/tutor'), false, 'below 80% nobody pays for a tier read');
});

test('U4 · isPremium is true only for a verified uid whose effective tier is premium', async () => {
  for (const [tier, want] of [['premium', true], ['trial', false], ['free', false], [null, false]]) {
    const { gate } = rig({ tier });
    assert.equal(await gate.isPremium('stu-1', { headers: {} }), want, `tier=${tier}`);
  }
  const { gate, tierReads } = rig({ tier: 'premium' });
  assert.equal(await gate.isPremium('', { headers: {} }), false);
  assert.equal(tierReads(), 0);
});

/* ══════════════════════════════════════════════════════════════════════════
   U5 · GET /api/usage/me — percentages only, never rupees
   ══════════════════════════════════════════════════════════════════════════ */

async function usageMe(r, headers = { authorization: 'Bearer ok' }) {
  const res = fakeRes();
  await r.gate.handleUsageMe({ headers }, res);
  return res.sent;
}

const NO_RUPEES = /inr|cost|micro|rupee|₹/i;

test('U5 · /api/usage/me — trial shape', async () => {
  const r = rig({ days: { [TODAY]: { trialChecks: 3, costMicroInr: 12 * INR }, [dayOf(2)]: { trialMocks: 1 } } });
  const out = await usageMe(r);
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, {
    tier: 'trial',
    trial: {
      checksLeftToday: 2,
      chapterTestsLeftToday: 1,
      mocksLeft: 0,
      worksheetsLeft: 1,
      resets: {
        checks: NEXT_IST_MIDNIGHT,
        chapterTests: NEXT_IST_MIDNIGHT,
        mocks: '2026-10-01T18:30:00.000Z',
        worksheets: null,
      },
      // FAIR-USE-3 R3: the limits in force (here the env defaults).
      limits: { checksPerDay: 5, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 },
    },
    premium: null,
    enforced: true,
  });
  assert.doesNotMatch(JSON.stringify(out.body), NO_RUPEES);
});

test('U5 · /api/usage/me — premium shape: whole percentages, clamped at 100, never rupees', async () => {
  const r = rig({
    tier: 'premium',
    days: {
      [TODAY]: { costMicroInr: 19 * INR, hourCostMicroInr: { 10: 5 * INR, 11: 5 * INR } },
      [dayOf(1)]: { costMicroInr: 23 * INR },
    },
  });
  const out = await usageMe(r);
  assert.equal(out.status, 200);
  assert.deepEqual(Object.keys(out.body).sort(), ['enforced', 'premium', 'tier', 'trial']);
  assert.equal(out.body.tier, 'premium');
  assert.equal(out.body.trial, null);
  assert.deepEqual(out.body.premium, {
    fiveHourPct: 40, // ₹10 of ₹25
    dayPct: 50, // ₹19 of ₹38
    weekPct: 50, // ₹42 of ₹84
    resets: {
      fiveHour: '2026-09-27T09:30:00.000Z', // hour 10 IST (04:30Z) + 5 h
      day: NEXT_IST_MIDNIGHT,
      week: '2026-10-02T18:30:00.000Z', // yesterday (09-26) leaves at 10-03 00:00 IST
    },
  });
  assert.doesNotMatch(JSON.stringify(out.body), NO_RUPEES);

  const over = await usageMe(rig({ tier: 'premium', days: { [TODAY]: { costMicroInr: 400 * INR } } }));
  assert.equal(over.body.premium.dayPct, 100);
  assert.equal(over.body.premium.weekPct, 100);
  for (const k of ['fiveHourPct', 'dayPct', 'weekPct']) assert.ok(Number.isInteger(over.body.premium[k]));
});

test('U5 · /api/usage/me — verified uid required; free / unknown tier are honest, never invented', async () => {
  assert.deepEqual(await usageMe(rig(), {}), { status: 401, body: { error: 'sign_in_required' } });
  assert.deepEqual(await usageMe(rig(), { 'x-lazytopper-uid': 'stu-1' }), { status: 401, body: { error: 'sign_in_required' } });
  assert.deepEqual(await usageMe(rig({ tier: 'free' })), { status: 200, body: { tier: 'free', trial: null, premium: null, enforced: true } });
  assert.deepEqual(await usageMe(rig({ tier: null })), { status: 503, body: { error: 'usage_unavailable' } });
  assert.deepEqual(await usageMe(rig({ failRead: true })), { status: 503, body: { error: 'usage_unavailable' } });
});

/* ══════════════════════════════════════════════════════════════════════════
   F6 · FAIR-USE-2 — ONLY A SERVER-ISSUED PASS MAKES A PAPER
   ══════════════════════════════════════════════════════════════════════════ */

const PAPER_BODY = (worksheetId, n = 3) => ({ worksheetId, questions: questions(n) });

// MUTATION MUT-A target (trust the surface header again -> RED).
test('F6 · a forged paper surface WITHOUT a pass is counted per question as check-improve', async () => {
  for (const surface of ['chapter-test', 'full-mock', 'worksheet']) {
    // Room for the questions: served, and the grade spends CHECKS, not a paper.
    const r = rig({ env: PASS_ENV, days: {} });
    const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface, body: PAPER_BODY('paper-1', 3) });
    assert.equal(out.answered, false, surface);
    assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }], `${surface}: per question`);
    assert.equal(r.telemetry.count('fair_use.surface.check-improve'), 1, surface);
    assert.equal(r.telemetry.count(`fair_use.surface.${surface}`), 0, `${surface}: the header alone is not believed`);

    // No checks left: the forged paper meets the per-question refusal, not a paper allowance.
    const spent = rig({ env: PASS_ENV, days: { [TODAY]: { trialChecks: 5 } } });
    const refused = await run(spent, { path: GRADE_WORKSHEET_PATH, surface, body: PAPER_BODY('paper-1', 3) });
    assert.equal(refused.answered, true, surface);
    assert.deepEqual(refused.res.sent, { status: 409, body: { error: 'trial_limit', remaining: 0, resetAt: NEXT_IST_MIDNIGHT } });
  }
});

test('F6 · a valid pass makes a paper: graded as that paper, and nothing more is spent', async () => {
  const r = rig({ env: PASS_ENV, days: { [TODAY]: { trialChecks: 5 } } });
  const minted = await mint(r, { surface: 'chapter-test', paperKey: 'ct-7' });
  assert.equal(minted.status, 200);
  assert.equal(typeof minted.body.token, 'string');
  assert.equal(minted.body.surface, 'chapter-test');
  assert.equal(minted.body.reused, false);
  assert.equal(minted.body.issuedAt, new Date(NOW).toISOString());
  assert.equal(minted.body.expiresAt, new Date(NOW + PAPER_PASS_TTL_MS).toISOString());

  const out = await run(r, {
    path: GRADE_WORKSHEET_PATH,
    surface: 'chapter-test',
    body: PAPER_BODY('ct-7', 8),
    headers: paperHeaders(minted.body.token),
  });
  assert.equal(out.answered, false, 'no checks left, but this is a paid-for paper — it must be served');
  assert.deepEqual(r.ledger.trialWrites, [], 'grading a minted paper spends nothing more');
  assert.equal(r.telemetry.count('fair_use.surface.chapter-test'), 1);
  assert.equal(r.telemetry.count('fair_use.paper_pass.accepted'), 1);

  // Re-grading the same paper (a re-upload) inside the 24 h is still that paper.
  await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body: PAPER_BODY('ct-7', 8), headers: paperHeaders(minted.body.token) });
  assert.deepEqual(r.ledger.trialWrites, []);
  assert.deepEqual(mintedSurfaces(r), ['chapter-test'], 'spent exactly once, at the mint');
});

test('F6 · a pass for another uid / another surface / another paper, or expired -> per question', async () => {
  const minter = rig({ env: PASS_ENV, days: {} });
  const { token } = (await mint(minter, { surface: 'full-mock', paperKey: 'fm-1' })).body;

  const cases = [
    ['another uid', { uid: 'stu-2', surface: 'full-mock', body: PAPER_BODY('fm-1') }],
    ['another surface', { surface: 'worksheet', body: PAPER_BODY('fm-1') }],
    ['another paper', { surface: 'full-mock', body: PAPER_BODY('fm-2') }],
    ['expired (exactly 24 h)', { surface: 'full-mock', body: PAPER_BODY('fm-1'), now: NOW + PAPER_PASS_TTL_MS }],
  ];
  for (const [name, c] of cases) {
    const r = rig({ env: PASS_ENV, days: {}, now: c.now || NOW });
    await run(r, { path: GRADE_WORKSHEET_PATH, surface: c.surface, body: c.body, uid: c.uid, headers: paperHeaders(token) });
    const uid = c.uid || 'stu-1';
    assert.deepEqual(r.ledger.trialWrites, [{ uid, counts: { checks: 3 } }], `${name}: must be counted per question`);
    assert.equal(r.telemetry.count('fair_use.paper_pass.rejected'), 1, name);
  }

  // CONTROL: the same pass one millisecond inside its 24 h IS the paper.
  const inside = rig({ env: PASS_ENV, days: {}, now: NOW + PAPER_PASS_TTL_MS - 1 });
  await run(inside, { path: GRADE_WORKSHEET_PATH, surface: 'full-mock', body: PAPER_BODY('fm-1'), headers: paperHeaders(token) });
  assert.deepEqual(inside.ledger.trialWrites, [], 'CONTROL: a valid pass must be believed, or every case above proves nothing');
  assert.equal(inside.telemetry.count('fair_use.surface.full-mock'), 1);
});

test('F6 · a forged or malformed pass is per question — and never throws (no 500)', async () => {
  const minter = rig({ env: PASS_ENV, days: {} });
  const { token } = (await mint(minter, { surface: 'worksheet', paperKey: 'ws-1' })).body;
  const parts = token.split('.');
  const flip = (c) => (c === 'A' ? 'B' : 'A');
  const forged = [
    [...parts.slice(0, 4), parts[4].slice(0, -1) + flip(parts[4].slice(-1))].join('.'), // same length, one char off
    [parts[0], String(NOW - 1), ...parts.slice(2)].join('.'), // issuedAt edited
    encodePaperPass('another-secret', 'stu-1', 'worksheet', 'ws-1', NOW), // signed with the wrong key
  ];
  const malformed = ['', 'garbage', 'v1....', 'v2.' + parts.slice(1).join('.'), `${token}.extra`,
    'v1.notanumber.worksheet.d3MtMQ.sig', 'v1.1.worksheet.!!!.sig', 'x'.repeat(5000), `${parts.slice(0, 4).join('.')}.`];
  for (const bad of [...forged, ...malformed]) {
    const r = rig({ env: PASS_ENV, days: {} });
    const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'worksheet', body: PAPER_BODY('ws-1'), headers: paperHeaders(bad) });
    assert.equal(out.answered, false, `${bad.slice(0, 40)}: must be served`);
    assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }], `${bad.slice(0, 40)}: per question`);
  }
  for (const weird of [undefined, null, 42, {}, [], 'v1.1.2.3.4']) {
    assert.equal(verifyPaperPass(weird, { uid: 'stu-1', surface: 'worksheet', nowMs: NOW, secret: SECRET }), null);
  }
  assert.equal(verifyPaperPass(token, { uid: 'stu-1', surface: 'worksheet', nowMs: NOW, secret: '' }), null, 'no secret, no pass');
  assert.deepEqual(verifyPaperPass(token, { uid: 'stu-1', surface: 'worksheet', nowMs: NOW, secret: SECRET }),
    { surface: 'worksheet', paperKey: 'ws-1', issuedAt: NOW }, 'CONTROL: the genuine pass verifies');
});

test('F6 · the mint consumes ONCE; a re-mint of the same paper within 24 h is free and returns the SAME pass', async () => {
  const r = rig({ env: PASS_ENV, days: {} });
  const first = await mint(r, { surface: 'full-mock', paperKey: 'fm-9' });
  r.clock.now = NOW + 60 * 60 * 1000; // an hour later, e.g. after a page reload
  const again = await mint(r, { surface: 'full-mock', paperKey: 'fm-9' });
  assert.equal(first.status, 200);
  assert.equal(again.status, 200);
  assert.equal(again.body.token, first.body.token, 'the same paper gets the same pass');
  assert.equal(again.body.reused, true);
  assert.equal(r.fs.mintWrites().length, 1, 'no double charge');
  assert.equal(r.fs.mintWrites()[0].surface, 'full-mock');
  assert.equal(r.fs.mintWrites()[0].passId, paperPassId('full-mock', 'fm-9'));
  assert.doesNotMatch(JSON.stringify(r.days), /fm-9/, 'the ledger holds a hash, never the paper id');

  // A DIFFERENT paper is a different mock: 1 per rolling week is already spent -> 409.
  const other = await mint(r, { surface: 'full-mock', paperKey: 'fm-10' });
  assert.equal(other.status, 409);
  assert.equal(other.body.error, 'trial_limit');
  assert.equal(r.fs.mintWrites().length, 1);

  // 24 h after the first mint the pass has lapsed: minting it again is a new paper.
  const cr = rig({ env: PASS_ENV, days: {} });
  const ct = await mint(cr, { surface: 'chapter-test', paperKey: 'ct-1' });
  cr.clock.now = NOW + PAPER_PASS_TTL_MS;
  const later = await mint(cr, { surface: 'chapter-test', paperKey: 'ct-1' });
  assert.equal(later.status, 200);
  assert.equal(later.body.reused, false);
  assert.notEqual(later.body.token, ct.body.token);
  assert.equal(cr.fs.mintWrites().length, 2);
});

test('F6 · premium and the free check are unaffected by minting', async () => {
  const p = rig({ tier: 'premium', env: PASS_ENV, days: { [TODAY]: { costMicroInr: 40 * INR } } });
  const minted = await mint(p, { surface: 'full-mock', paperKey: 'fm-1' });
  assert.equal(minted.status, 200);
  assert.equal(p.fs.writes.length, 0, 'premium spends no trial allowance');
  assert.equal(p.ledger.reads.length, 0, 'premium minting reads no ledger');
  // Premium grading with the pass is still metered by COST, exactly as before.
  const graded = await run(p, { path: GRADE_WORKSHEET_PATH, surface: 'full-mock', body: PAPER_BODY('fm-1'), headers: paperHeaders(minted.body.token) });
  assert.equal(graded.res.sent.status, 429);
  assert.equal(graded.res.sent.body.error, 'usage_limit');

  const free = rig({ env: PASS_ENV, days: { [TODAY]: { trialChecks: 99 } } });
  const out = await run(free, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body: PAPER_BODY('ct-1'),
    headers: paperHeaders('v1.1.chapter-test.Y3QtMQ.x'), options: { freeCheck: true } });
  assert.equal(out.answered, false);
  assert.equal(free.tierReads(), 0, 'an admitted free check is not fair-use metered, pass or no pass');
});

test('F6 · FAIR_USE_PAPER_SECRET unset -> the mint is 503 and paper grades fall back to per-question counting', async () => {
  const r = rig({ env: { FAIR_USE_ENFORCE: '1' }, days: {} });
  assert.deepEqual(await mint(r, { surface: 'chapter-test', paperKey: 'ct-1' }), { status: 503, body: { error: 'paper_pass_unavailable' } });
  assert.equal(r.fs.writes.length, 0);
  assert.equal(r.telemetry.count('fair_use.paper_pass.unavailable'), 1);

  // A pass minted while the secret WAS set is not believed once it is gone.
  const minter = rig({ env: PASS_ENV, days: {} });
  const { token } = (await mint(minter, { surface: 'chapter-test', paperKey: 'ct-1' })).body;
  const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body: PAPER_BODY('ct-1'), headers: paperHeaders(token) });
  assert.equal(out.answered, false);
  assert.deepEqual(r.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 3 } }]);
});

test('F6 · DARK (FAIR_USE_ENFORCE unset): nobody is refused anything new — old clients, spent allowances, missing secret', async () => {
  // OR-LIVE: a client from before FAIR-USE-2 sends only the surface header. It is GRADED.
  for (const env of [{}, PASS_ENV_DARK]) {
    const old = rig({ env, days: { [TODAY]: { trialChecks: 5, trialChapterTests: 1 } } });
    const out = await run(old, { path: GRADE_WORKSHEET_PATH, surface: 'chapter-test', body: PAPER_BODY('ct-1', 8) });
    assert.equal(out.answered, false, 'dark: served');
    assert.equal(out.res.sent, null);
    assert.equal(old.telemetry.count('fair_use.would_refuse.trial_checks'), 1);
    assert.deepEqual(old.ledger.trialWrites, [{ uid: 'stu-1', counts: { checks: 8 } }], 'the honest count still moves');
  }
  // The mint 503s with no secret — and the paper is still graded.
  assert.equal((await mint(rig({ env: {} }))).status, 503);

  // A mint over the allowance is SERVED while dark, and the honest count still moves.
  const spent = rig({ env: PASS_ENV_DARK, days: { [TODAY]: { trialChapterTests: 1 } } });
  const minted = await mint(spent, { surface: 'chapter-test', paperKey: 'ct-2' });
  assert.equal(minted.status, 200);
  assert.equal(spent.telemetry.count('fair_use.would_refuse.trial_chapter_test'), 1);
  assert.deepEqual(spent.telemetry.startingWith('fair_use.refused.'), []);
  assert.deepEqual(mintedSurfaces(spent), ['chapter-test']);
});

test('F6 · the mint takes a VERIFIED uid, a paper surface and a paperKey — anything else 401 / 400, never a 500', async () => {
  const r = rig({ env: PASS_ENV, days: {} });
  assert.deepEqual(await mint(r, { headers: {} }), { status: 401, body: { error: 'sign_in_required' } });
  assert.deepEqual(await mint(r, { headers: { 'x-lazytopper-uid': 'stu-1' } }), { status: 401, body: { error: 'sign_in_required' } },
    'a header uid is never an identity');
  const bad = { status: 400, body: { error: 'invalid_paper_pass_request' } };
  for (const surface of ['check-improve', 'quick-practice', 'banana', '', undefined, 7]) {
    assert.deepEqual(await mint(r, { body: { surface, paperKey: 'p-1' } }), bad, `surface=${surface}`);
  }
  for (const paperKey of ['', '   ', undefined, 42, 'k'.repeat(201)]) {
    assert.deepEqual(await mint(r, { body: { surface: 'worksheet', paperKey } }), bad, `paperKey=${String(paperKey).slice(0, 10)}`);
  }
  assert.deepEqual(await mint(r, { body: null }), bad);
  let firestoreTouched = 0;
  const unreadable = createFairUse({
    tierOf: async () => 'trial',
    ledger: fakeLedger(),
    env: PASS_ENV,
    readJson: async () => { throw new Error('Unexpected token'); },
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
    resolveFirestore: () => { firestoreTouched += 1; return null; },
  });
  const res = fakeRes();
  await unreadable.handlePaperPass({ headers: {} }, res);
  assert.deepEqual(res.sent, bad);
  assert.equal(r.fs.writes.length, 0);
  assert.equal(firestoreTouched, 0, 'nothing may be read or written for a bad body');
});

test('F6 · FAIL-OPEN mint: an unreadable ledger still issues the pass and records the spend', async () => {
  const r = rig({ env: PASS_ENV, failRead: true });
  const out = await mint(r, { surface: 'worksheet', paperKey: 'ws-3' });
  assert.equal(out.status, 200);
  assert.equal(r.telemetry.count('fair_use.ledger_unreadable'), 1);
  assert.deepEqual(mintedSurfaces(r), ['worksheet'], 'the fail-open plain write still records the spend');
});

test('F5 · /api/usage/me `enforced` is true ONLY when FAIR_USE_ENFORCE=1', async () => {
  for (const [env, want] of [[{ FAIR_USE_ENFORCE: '1' }, true], [{}, false], [{ FAIR_USE_ENFORCE: 'true' }, false], [PASS_ENV_DARK, false]]) {
    for (const tier of ['trial', 'premium', 'free']) {
      const out = await usageMe(rig({ tier, env }));
      assert.equal(out.status, 200);
      assert.equal(out.body.enforced, want, `tier=${tier} env=${JSON.stringify(env)}`);
    }
  }
});

// MUTATION MUT-B target (non-timing-safe compare -> RED). A STATIC pin: timing is not
// observable in a unit test, so the source of verifyPaperPass is read and checked.
test('F6 · static pin: the pass signature is compared with crypto.timingSafeEqual, never === / !==', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, 'fairUse.cjs'), 'utf8');
  const start = src.indexOf('function verifyPaperPass(');
  assert.ok(start > 0, 'verifyPaperPass must exist');
  const fnSrc = src.slice(start, src.indexOf('\n}\n', start));
  assert.match(fnSrc, /crypto\.timingSafeEqual\(\s*given\s*,\s*expected\s*\)/, 'the signature compare must be timingSafeEqual');
  // The one permitted equality is the LENGTH pre-check that timingSafeEqual itself requires.
  const rest = fnSrc
    .split('\n')
    .filter((l) => !/^\s*if \(given\.length !== expected\.length\) return null;\s*$/.test(l))
    .join('\n');
  assert.doesNotMatch(rest, /\b(sig|given|expected)\b[^;\n]*[!=]==|[!=]==[^;\n]*\b(sig|given|expected)\b/,
    'the signature must never be compared with === or !==');
});

/* ══════════════════════════════════════════════════════════════════════════
   FAIR-USE-3 · R1 LAZY REFUND · R2 ONE-TRANSACTION MINT · R3 LIMITS FROM THE SERVER
   ══════════════════════════════════════════════════════════════════════════ */

/** Let fire-and-forget work (the graded mark's transaction) land. */
async function settle(n = 30) {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

const HOUR = 60 * 60 * 1000;

/** Grade a paper WITH its pass through the gate; the handler answers `serve`. */
async function gradePaper(r, surface, paperKey, token, serve = 200) {
  const out = await run(r, { path: GRADE_WORKSHEET_PATH, surface, body: PAPER_BODY(paperKey), headers: paperHeaders(token), serve });
  await settle();
  return out;
}

// MUTATION FU3-MUT-1 target ("count ungraded passes forever" -> RED).
test('R1 · an UNGRADED pass counts while < 24 h old and stops counting at 24 h; a GRADED pass always counts', async () => {
  // ── Ungraded: counts at 23 h 59 m, lapses at exactly 24 h. ──
  const u = rig({ env: PASS_ENV, days: {} });
  const a = await mint(u, { surface: 'full-mock', paperKey: 'fm-a' });
  assert.equal(a.status, 200);
  u.clock.now = NOW + 24 * HOUR - 60 * 1000;
  const early = await mint(u, { surface: 'full-mock', paperKey: 'fm-b' });
  assert.equal(early.status, 409, 'an ungraded pass < 24 h old still counts');
  // The reset shown is when that ungraded pass lapses, not when its day leaves the week.
  assert.equal(early.body.resetAt, new Date(NOW + PAPER_PASS_TTL_MS).toISOString());
  const meEarly = await usageMe(u);
  assert.equal(meEarly.body.trial.mocksLeft, 0);
  assert.equal(meEarly.body.trial.resets.mocks, new Date(NOW + PAPER_PASS_TTL_MS).toISOString());
  u.clock.now = NOW + PAPER_PASS_TTL_MS;
  assert.equal((await usageMe(u)).body.trial.mocksLeft, 1, 'an ungraded pass >= 24 h old no longer counts');
  const lapsed = await mint(u, { surface: 'full-mock', paperKey: 'fm-b' });
  assert.equal(lapsed.status, 200, 'the lazy refund: no job ran, the allowance is simply back');
  assert.equal(u.telemetry.count('fair_use.refused.trial_full_mock'), 1);

  // ── Graded: the same timeline, but a grade landed on the first pass -> still counts. ──
  const g = rig({ env: PASS_ENV, days: {} });
  const ga = await mint(g, { surface: 'full-mock', paperKey: 'fm-a' });
  g.clock.now = NOW + 2 * HOUR;
  const graded = await gradePaper(g, 'full-mock', 'fm-a', ga.body.token);
  assert.equal(graded.answered, false);
  assert.equal(g.fs.gradedWrites().length, 1, 'the served grade marked the pass');
  assert.equal(g.fs.gradedWrites()[0].gradedAtMs, NOW + 2 * HOUR);
  assert.equal(g.fs.gradedWrites()[0].issuedAtMs, NOW);
  assert.equal(g.fs.gradedWrites()[0].dayKey, TODAY, 'marked on the pass\'s OWN day document');
  g.clock.now = NOW + PAPER_PASS_TTL_MS;
  const after = await mint(g, { surface: 'full-mock', paperKey: 'fm-b' });
  assert.equal(after.status, 409, 'a GRADED pass keeps counting after 24 h');
  g.clock.now = NOW + 6 * 24 * HOUR;
  assert.equal((await usageMe(g)).body.trial.mocksLeft, 0, 'graded: counted for the whole rolling week');
  assert.equal((await usageMe(g)).body.trial.resets.mocks, '2026-10-03T18:30:00.000Z', 'graded: resets when its IST day leaves the week');
  g.clock.now = NOW + 7 * 24 * HOUR;
  assert.equal((await usageMe(g)).body.trial.mocksLeft, 1, 'CONTROL: and leaves the window like any other use');

  // ── Only a SERVED (2xx) grade marks the pass; a failed grade leaves it to lapse. ──
  const f = rig({ env: PASS_ENV, days: {} });
  const fa = await mint(f, { surface: 'worksheet', paperKey: 'ws-a' });
  await gradePaper(f, 'worksheet', 'ws-a', fa.body.token, 500);
  assert.equal(f.fs.gradedWrites().length, 0, 'a 500 is not a grade that landed');
  f.clock.now = NOW + PAPER_PASS_TTL_MS;
  assert.equal((await mint(f, { surface: 'worksheet', paperKey: 'ws-b' })).status, 200);

  // ── The chapter test (per IST day) is unchanged by R1: an ungraded pass minted today
  //    always counts for the rest of today (it cannot reach 24 h before midnight). ──
  const c = rig({ env: PASS_ENV, days: {} });
  await mint(c, { surface: 'chapter-test', paperKey: 'ct-a' });
  c.clock.now = Date.UTC(2026, 8, 27, 18, 29, 0); // 23:59 IST, same day
  assert.equal((await mint(c, { surface: 'chapter-test', paperKey: 'ct-b' })).status, 409);
  c.clock.now = Date.UTC(2026, 8, 27, 18, 30, 0); // 00:00 IST, next day
  assert.equal((await mint(c, { surface: 'chapter-test', paperKey: 'ct-b' })).status, 200);
});

test('R1 · the graded mark: first grade kept, re-grades write nothing, a lost mint record is recorded graded', async () => {
  const r = rig({ env: PASS_ENV, days: {} });
  const m = await mint(r, { surface: 'full-mock', paperKey: 'fm-1' });
  r.clock.now = NOW + HOUR;
  await gradePaper(r, 'full-mock', 'fm-1', m.body.token);
  r.clock.now = NOW + 2 * HOUR;
  await gradePaper(r, 'full-mock', 'fm-1', m.body.token); // a re-upload
  assert.equal(r.fs.gradedWrites().length, 1, 'the re-grade writes nothing');
  const entry = r.days[TODAY].paperPasses[paperPassId('full-mock', 'fm-1')];
  assert.deepEqual(entry, { issuedAtMs: NOW, surface: 'full-mock', gradedAtMs: NOW + HOUR });
  assert.equal(r.telemetry.count('fair_use.paper_pass.graded_already'), 1);
  assert.deepEqual(r.ledger.trialWrites, [], 'grading a paper still spends no answer checks');

  // The mint's own record was lost (e.g. a failed fail-open write): the graded paper is
  // recorded whole, so a paper that was actually graded is never free.
  const lost = rig({ env: PASS_ENV, days: {} });
  const token = encodePaperPass(SECRET, 'stu-1', 'worksheet', 'ws-9', NOW);
  lost.clock.now = NOW + HOUR;
  await gradePaper(lost, 'worksheet', 'ws-9', token);
  assert.deepEqual(lost.days[TODAY].paperPasses[paperPassId('worksheet', 'ws-9')],
    { issuedAtMs: NOW, surface: 'worksheet', gradedAtMs: NOW + HOUR });
  assert.equal((await usageMe(lost)).body.trial.worksheetsLeft, 0);

  // A Firestore error on the mark is counted and swallowed — the grade was already served.
  const down = rig({ env: PASS_ENV, days: {}, failRead: true });
  const out = await gradePaper(down, 'worksheet', 'ws-9', token);
  assert.equal(out.answered, false);
  assert.equal(down.telemetry.count('fair_use.paper_pass.graded_record_failed'), 1);
});

test('R1 · OLD-FORMAT ledger docs keep working: legacy numbers + counters count as before, never twice, never rewritten', async () => {
  // A pre-FAIR-USE-3 mint two days ago: the plain issuedAtMs number AND the counter it bumped.
  const legacyIssued = NOW - 2 * 24 * HOUR;
  const legacyId = paperPassId('full-mock', 'fm-old');
  const env = { ...PASS_ENV, FAIR_USE_TRIAL_MOCKS_PER_WEEK: '2' }; // room for 2, so a double count is visible
  const r = rig({ env, days: { [dayOf(2)]: { trialMocks: 1, paperPasses: { [legacyId]: legacyIssued } } } });
  const me = await usageMe(r);
  assert.equal(me.body.trial.mocksLeft, 1, 'the legacy spend still counts — once (its counter), not also from the map');
  assert.equal(me.body.trial.resets.mocks, '2026-10-01T18:30:00.000Z', 'a legacy spend leaves with its day, as before');

  // A NEW-shape pass alongside it: 1 legacy + 1 new = the allowance of 2 spent.
  const fresh = await mint(r, { surface: 'full-mock', paperKey: 'fm-new' });
  assert.equal(fresh.status, 200);
  assert.equal((await usageMe(r)).body.trial.mocksLeft, 0, 'legacy and new uses add up');
  assert.equal((await mint(r, { surface: 'full-mock', paperKey: 'fm-third' })).status, 409);

  // Grading WITH a legacy pass (minted before this deploy, still < 24 h old) never rewrites
  // the legacy number — rewriting it into the new shape would count it a second time.
  const recent = NOW - 3 * HOUR;
  const recentId = paperPassId('worksheet', 'ws-old');
  const r2 = rig({ env: { ...PASS_ENV, FAIR_USE_TRIAL_WORKSHEETS_PER_WEEK: '2' }, days: { [TODAY]: { trialWorksheets: 1, paperPasses: { [recentId]: recent } } } });
  const reused = await mint(r2, { surface: 'worksheet', paperKey: 'ws-old' });
  assert.equal(reused.status, 200);
  assert.equal(reused.body.reused, true, 'a legacy pass < 24 h old is re-issued, not re-spent');
  assert.equal(reused.body.issuedAt, new Date(recent).toISOString());
  await gradePaper(r2, 'worksheet', 'ws-old', reused.body.token);
  assert.equal(r2.days[TODAY].paperPasses[recentId], recent, 'the legacy number is left exactly as it was');
  assert.equal(r2.fs.writes.length, 0, 'nothing written for a legacy pass — its counter already holds the spend');
  assert.equal(r2.telemetry.count('fair_use.paper_pass.graded_legacy'), 1);
  assert.equal((await usageMe(r2)).body.trial.worksheetsLeft, 1, 'still exactly one worksheet spent');

  // Malformed entries are ignored, never a crash and never a count.
  const junk = rig({ env: PASS_ENV, days: { [TODAY]: { paperPasses: { a: 'x', b: null, c: [], d: { surface: 'full-mock' }, e: 1.5 } } } });
  assert.equal((await usageMe(junk)).body.trial.mocksLeft, 1);
  assert.equal((await mint(junk, { surface: 'full-mock', paperKey: 'fm-1' })).status, 200);
});

// MUTATION FU3-MUT-2 target ("mint without the transaction" -> RED).
test('R2 · two tabs minting the SAME paper at once spend ONCE — one pass, one entry (a real race)', async () => {
  const r = rig({ env: PASS_ENV, days: {} });
  // Both requests are in flight together: their reads interleave before either commits.
  const [a, b] = await Promise.all([
    mint(r, { surface: 'full-mock', paperKey: 'fm-race' }),
    mint(r, { surface: 'full-mock', paperKey: 'fm-race' }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.deepEqual([a.body.reused, b.body.reused].sort(), [false, true], 'exactly one fresh mint; the other tab is handed the SAME pass');
  assert.equal(a.body.token, b.body.token, 'both tabs hold one and the same pass');
  assert.equal(r.fs.mintWrites().length, 1, 'one entry written — spent once');
  assert.equal(r.telemetry.count('fair_use.paper_pass.reused'), 1);
  assert.equal(r.fs.stats().retries >= 1, true, 'CONTROL: the two transactions really collided (one was re-run)');
});

test('R2 · two tabs minting DIFFERENT papers at once with ONE allowance left: enforced -> one 200 + one 409; dark -> both served, honestly counted', async () => {
  const r = rig({ env: PASS_ENV, days: {} });
  const [a, b] = await Promise.all([
    mint(r, { surface: 'worksheet', paperKey: 'ws-1' }),
    mint(r, { surface: 'worksheet', paperKey: 'ws-2' }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409], 'the transaction saw the other tab\'s spend');
  assert.equal(r.fs.mintWrites().length, 1);
  assert.ok(r.fs.stats().retries >= 1, 'CONTROL: the two transactions really collided');

  // Dark (the ship state): nobody is refused, and the second is counted as a would-refuse.
  const d = rig({ env: PASS_ENV_DARK, days: {} });
  const [x, y] = await Promise.all([
    mint(d, { surface: 'worksheet', paperKey: 'ws-1' }),
    mint(d, { surface: 'worksheet', paperKey: 'ws-2' }),
  ]);
  assert.deepEqual([x.status, y.status], [200, 200]);
  assert.equal(d.telemetry.count('fair_use.would_refuse.trial_worksheet'), 1);
  assert.deepEqual(d.telemetry.startingWith('fair_use.refused.'), []);
  assert.equal(d.fs.mintWrites().length, 2, 'dark: both served papers are counted');
});

test('R2 · a Firestore error in the mint transaction is NO WORSE than before: the pass is issued, nothing refused — even when enforcing', async () => {
  for (const env of [PASS_ENV_DARK, PASS_ENV]) {
    const r = rig({ env, days: { [TODAY]: { trialChapterTests: 1 } }, failRead: true });
    const out = await mint(r, { surface: 'chapter-test', paperKey: 'ct-9' });
    assert.equal(out.status, 200, `fail open (${JSON.stringify(env)}): a refusal needs a positive read`);
    assert.equal(out.body.reused, false);
    assert.equal(r.telemetry.count('fair_use.ledger_unreadable'), 1);
    assert.deepEqual(r.telemetry.startingWith('fair_use.refused.'), []);
    assert.deepEqual(mintedSurfaces(r), ['chapter-test'], 'the spend is still recorded (plain write), as before');
  }
  // No Firestore at all: the pass is still issued and the failed record is counted.
  const none = createFairUse({
    tierOf: async () => 'trial', ledger: fakeLedger(), env: PASS_ENV, now: () => NOW, readJson: rawReadJson,
    resolveFirestore: () => null, telemetry: recorder(),
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  const res = fakeRes();
  await none.handlePaperPass({ headers: {}, __body: { surface: 'worksheet', paperKey: 'w' } }, res);
  assert.equal(res.sent.status, 200);
});

test('R3 · /api/usage/me returns the limits in force, and they follow a CHANGED env limit', async () => {
  const env = {
    FAIR_USE_ENFORCE: '1',
    FAIR_USE_TRIAL_CHECKS_PER_DAY: '7',
    FAIR_USE_TRIAL_CHAPTER_TESTS_PER_DAY: '2',
    FAIR_USE_TRIAL_MOCKS_PER_WEEK: '3',
    FAIR_USE_TRIAL_WORKSHEETS_PER_WEEK: '4',
  };
  const out = await usageMe(rig({ env, days: { [TODAY]: { trialChecks: 3 } } }));
  assert.equal(out.status, 200);
  assert.deepEqual(out.body.trial.limits, { checksPerDay: 7, chapterTestsPerDay: 2, mocksPerWeek: 3, worksheetsPerWeek: 4 });
  assert.equal(out.body.trial.checksLeftToday, 4);
  // CONTROL: the defaults when unset — the numbers are env's, never the client's.
  assert.deepEqual((await usageMe(rig())).body.trial.limits, { checksPerDay: 5, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 });
  // Premium never receives trial limits (and never rupees); free receives nothing.
  const p = await usageMe(rig({ tier: 'premium' }));
  assert.equal(p.body.trial, null);
  assert.doesNotMatch(JSON.stringify(p.body), /limits|Per(Day|Week)/);
});

test('R1 · static pin: the mint writes no trial counter (the entry is the spend)', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, 'fairUse.cjs'), 'utf8');
  const start = src.indexOf('async function handlePaperPass(');
  assert.ok(start > 0);
  const fnSrc = src.slice(start, src.indexOf('\n  }\n', start));
  assert.doesNotMatch(fnSrc, /FieldValue|increment|TRIAL_COUNTER_FIELDS|recordTrialUse/);
  assert.match(fnSrc, /db\.runTransaction\(/, 'the mint runs in a Firestore transaction');
});

/* ══════════════════════════════════════════════════════════════════════════
   WIRING · THE REAL index.cjs, OVER HTTP
   A gate wired but never reached is a silent no-op. These boot the real server with
   firebase-admin and fetch swapped BEFORE index.cjs loads (no test seam in production
   code) and read every Gemini call and ledger write from its stdout.
   ══════════════════════════════════════════════════════════════════════════ */

const INDEX_CJS = path.resolve(__dirname, '..', 'index.cjs');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function bootServer(port, extraEnv, seed) {
  const launcher = `
    const Module = require('module');
    const SEED = JSON.parse(process.env.FAIR_USE_TEST_SEED || '{}');
    const TOKENS = { 'trial-token': 'trial-student', 'premium-token': 'premium-student' };
    const SUBS = {
      'trial-student': { tier: 'trial', trialStartDate: { seconds: Math.floor(Date.now() / 1000) - 86400 } },
      'premium-student': { tier: 'premium' },
    };
    const docRef = (p) => ({
      path: p,
      collection: (n) => collRef(p + '/' + n),
      get: async () => {
        if (p.startsWith('subscriptions/')) {
          const d = SUBS[p.split('/')[1]];
          return { exists: !!d, data: () => d };
        }
        const d = SEED[p];
        return { exists: !!d, data: () => d };
      },
      set: async (data) => {
        if (p.startsWith('usageLedger/')) console.log('LEDGER_SET ' + p + ' ' + JSON.stringify(data));
        // LOW-END-1 R4: the idempotency store really persists (and is logged), so a retry
        // can find what the first attempt stored.
        if (p.startsWith('gradingResults/')) {
          SEED[p] = JSON.parse(JSON.stringify(data));
          console.log('IDEM_SET ' + p + ' ' + data.state);
        }
      },
      delete: async () => {
        if (p.startsWith('gradingResults/')) { delete SEED[p]; console.log('IDEM_DELETE ' + p); }
      },
    });
    const collRef = (p) => ({ doc: (id) => docRef(p + '/' + id) });
    const firestore = () => ({
      collection: (n) => collRef(n),
      // FAIR-USE-3: a transaction runs on the same fake documents (its writes are logged too).
      runTransaction: async (fn) => fn({
        get: (ref) => ref.get(),
        getAll: (...refs) => Promise.all(refs.map((r) => r.get())),
        set(ref, data, opts) { ref.set(data, opts); return this; },
        delete(ref) { ref.delete(); return this; },
      }),
    });
    firestore.FieldValue = { increment: (n) => ({ increment: n }) };
    const fake = {
      apps: [],
      credential: { cert: () => ({}) },
      initializeApp() { fake.apps.push({}); },
      auth: () => ({
        verifyIdToken: async (t) => {
          if (TOKENS[t]) return { uid: TOKENS[t] };
          throw new Error('invalid token');
        },
      }),
      appCheck: () => ({ verifyToken: async () => ({ appId: 'app-1', alreadyConsumed: false }) }),
      firestore,
    };
    const orig = Module._load;
    Module._load = function (r) { return r === 'firebase-admin' ? fake : orig.apply(this, arguments); };
    // GRADER-CORE-1 PR-3 (C9): a served grade is charged only for what it actually GRADED, so
    // the stub answers with a real, parseable grade for questions 1..12 (the tutor still reads
    // its "reply"). FAIR_USE_TEST_GEMINI=unparseable restores the old reply — a 200 { ok:false }
    // "couldn't read the grading" — which is now stored but never charged.
    const GRADED_REPLY = JSON.stringify({ reply: 'ok', summary: 'ok', results: Array.from({ length: 12 }, (_, i) => ({
      qNumber: i + 1, couldNotRead: false, addressesQuestion: 'yes', teacherNote: 'ok',
      annotatedSteps: [{ description: 'Solves', studentWork: 'x = 1', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null }],
    })) });
    const MODEL_TEXT = process.env.FAIR_USE_TEST_GEMINI === 'unparseable' ? '{"reply":"ok"}' : GRADED_REPLY;
    globalThis.fetch = async (url) => {
      console.log('GEMINI_FETCH ' + String(url).split('?')[0].split('/').pop());
      return {
        ok: true, status: 200, statusText: 'OK', headers: { get: () => null },
        text: async () => JSON.stringify({
          candidates: [{ content: { parts: [{ text: MODEL_TEXT }] } }],
          usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800, totalTokenCount: 2000 },
        }),
      };
    };
    require(${JSON.stringify(INDEX_CJS)});
  `;
  const env = { ...process.env, PORT: String(port) };
  for (const k of Object.keys(env)) {
    // TEST-CLOCK-SWEEP: keep the test clock (LT_TEST_CLOCK, LT_TEST_CLOCK_ANCHOR). The LT_ strip
    // drops app config; dropping the clock put this child on the REAL clock while the test
    // computed `today` on the switched one (red at LT_TEST_CLOCK=2030-...).
    if (k.startsWith('LT_TEST_CLOCK')) continue;
    if (/^(AI_INTEGRATIONS_|GEMINI_|WARM_POOL_|LT_|FAIR_USE_)/.test(k)) delete env[k];
  }
  delete env.DATABASE_URL;
  delete env.FIREBASE_SERVICE_ACCOUNT_KEY;
  env.API_KEY = 'fake-gemini-key';
  env.AI_PROVIDER = 'gemini';
  env.VITE_FIREBASE_PROJECT_ID = 'demo-fair-use';
  env.FAIR_USE_TEST_SEED = JSON.stringify(seed || {});
  Object.assign(env, extraEnv || {});

  const child = spawn(process.execPath, ['-e', launcher], { env, cwd: path.dirname(INDEX_CJS) });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`server did not start:\n${out}`)), 60000);
    const tick = setInterval(() => {
      if (/running on port/.test(out)) { clearInterval(tick); clearTimeout(t); resolve(); }
      if (child.exitCode !== null) { clearInterval(tick); clearTimeout(t); reject(new Error(`server exited:\n${out}`)); }
    }, 100);
  });
  return { child, ready, log: () => out };
}

function request(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port, path: urlPath, method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve({ status: res.statusCode, text, headers: res.headers }));
      }
    );
    req.on('error', reject);
    req.end(payload || undefined);
  });
}

const count = (log, re) => (log.match(re) || []).length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TRIAL = { authorization: 'Bearer trial-token' };
const PREMIUM = { authorization: 'Bearer premium-token' };
const typedBatch = (n, worksheetId = 'w-1') => ({
  worksheetId,
  subject: 'Maths',
  questions: Array.from({ length: n }, (_, i) => ({ qNumber: i + 1, marks: 2, questionText: `Solve x + ${i} = ${i + 1}`, textAnswer: 'x = 1' })),
});

test('WIRING · REAL index.cjs, FAIR_USE_ENFORCE=1: 409 before Gemini, counted per question once served, U4 through the real limiter, /api/usage/me',
  { timeout: 180000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    // Global hard 10 -> the vision shed line is floor(10 * 0.8) = 8.
    const srv = bootServer(port, { FAIR_USE_ENFORCE: '1', LT_CAP_GLOBAL_HARD: '10' }, {
      [`usageLedger/trial-student/days/${today}`]: { trialChecks: 4 },
    });
    t.after(() => srv.child.kill());
    await srv.ready;

    // ── (0) CORS: the surface header and the usage route are preflight-allowed. ──
    const pre = await request(port, 'OPTIONS', '/api/usage/me', undefined, { origin: 'http://x', 'access-control-request-headers': 'x-lazytopper-surface' });
    assert.equal(pre.status, 204);
    assert.match(String(pre.headers['access-control-allow-headers']), /X-Lazytopper-Surface/);

    // ── (1) Trial with 1 check left asks for 2 -> 409, and Gemini is NEVER called. ──   [global 1]
    let before = srv.log();
    let res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(2), { ...TRIAL, 'x-lazytopper-surface': 'check-improve' });
    await wait(300);
    let delta = srv.log().slice(before.length);
    assert.equal(res.status, 409, `${res.text}\n${delta}`);
    const refusal = JSON.parse(res.text);
    assert.equal(refusal.error, 'trial_limit');
    assert.equal(refusal.remaining, 1);
    assert.match(refusal.resetAt, /T18:30:00\.000Z$/, 'the reset is an IST midnight');
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, `a refused request reached the model\n${delta}`);
    assert.equal(count(delta, /trialChecks/g), 0, 'a refused request was counted');

    // ── (2) The same trial asks for exactly the 1 left -> graded, then counted as 1. ── [global 2]
    //        This also proves the pre-read body reaches the grader (it graded).
    before = srv.log();
    res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(1), { ...TRIAL, 'x-lazytopper-surface': 'check-improve' });
    for (let i = 0; i < 40 && !/trialChecks/.test(srv.log().slice(before.length)); i++) await wait(50);
    delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `${res.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `CONTROL: the served grade must reach the model\n${delta}`);
    assert.ok(delta.includes(`LEDGER_SET usageLedger/trial-student/days/${today} {"trialChecks":{"increment":1}}`),
      `the served grade must be counted once, per question\n${delta}`);

    // ── (3) /api/usage/me for the trial caller. ──
    res = await request(port, 'GET', '/api/usage/me', undefined, TRIAL);
    assert.equal(res.status, 200, res.text);
    const me = JSON.parse(res.text);
    assert.equal(me.tier, 'trial');
    assert.equal(me.premium, null);
    assert.deepEqual(Object.keys(me.trial).sort(), ['chapterTestsLeftToday', 'checksLeftToday', 'limits', 'mocksLeft', 'resets', 'worksheetsLeft']);
    assert.deepEqual(me.trial.limits, { checksPerDay: 5, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 }, 'R3: the limits in force reach the client');
    assert.doesNotMatch(res.text, NO_RUPEES);
    assert.equal((await request(port, 'GET', '/api/usage/me', undefined, {})).status, 401);

    // ── (4) U4 through the REAL limiter: push the global day to the shed line. ── [global 3..8]
    for (let i = 0; i < 6; i++) {
      const r = await request(port, 'POST', '/api/tutor',
        { topicLabel: 'Electricity', subject: 'science', messages: [{ role: 'user', content: 'what is ohm law' }] }, PREMIUM);
      assert.equal(r.status, 200, `tutor call ${i}: ${r.text}`);
    }
    // Premium at the shed line -> served.                                              [global 9]
    before = srv.log();
    res = await request(port, 'POST', CHECK_SOLUTION_PATH, { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' }, PREMIUM);
    await wait(300);
    delta = srv.log().slice(before.length);
    assert.notEqual(res.status, 429, `a premium student was paused by the day budget: ${res.text}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `CONTROL: the premium check must reach the model\n${delta}`);
    // Trial at the shed line -> shed, exactly as before.
    res = await request(port, 'POST', CHECK_SOLUTION_PATH, { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' }, TRIAL);
    assert.equal(res.status, 429, res.text);
    assert.equal(JSON.parse(res.text).class, 'vision');
  });

test('WIRING · REAL index.cjs, FAIR_USE_ENFORCE UNSET (the ship state): an over-limit trial grade is SERVED',
  { timeout: 120000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    const srv = bootServer(port, {}, {
      [`usageLedger/trial-student/days/${today}`]: { trialChecks: 5, trialChapterTests: 1 },
      [`usageLedger/premium-student/days/${today}`]: { costMicroInr: 500 * INR },
    });
    t.after(() => srv.child.kill());
    await srv.ready;

    // FAIR-USE-2: FAIR_USE_PAPER_SECRET is unset here too (the ship state) — the mint is 503.
    let res = await request(port, 'POST', USAGE_PAPER_PATH, { surface: 'chapter-test', paperKey: 'w-1' }, TRIAL);
    assert.equal(res.status, 503, res.text);
    assert.equal(JSON.parse(res.text).error, 'paper_pass_unavailable');

    // ...and a chapter test sent without a pass (every client, old or new, in this state) is
    // SERVED, counted per question — the honest count still moves, nothing is refused.
    let before = srv.log();
    res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(3), { ...TRIAL, 'x-lazytopper-surface': 'chapter-test' });
    for (let i = 0; i < 40 && !/trialChecks/.test(srv.log().slice(before.length)); i++) await wait(50);
    let delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `dark enforcement must not refuse: ${res.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `the over-limit grade must be SERVED\n${delta}`);
    assert.ok(delta.includes('{"trialChecks":{"increment":3}}'), `the honest count still moves, per question\n${delta}`);
    assert.ok(!delta.includes('trialChapterTests'), `a bare surface header must not spend a paper allowance\n${delta}`);

    before = srv.log();
    res = await request(port, 'POST', CHECK_SOLUTION_PATH, { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' }, PREMIUM);
    await wait(300);
    delta = srv.log().slice(before.length);
    assert.notEqual(res.status, 429, res.text);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `an over-cap premium check must be SERVED while dark\n${delta}`);
  });

test('WIRING · REAL index.cjs, FAIR_USE_PAPER_SECRET set, enforcement dark: mint -> pass -> graded as the paper; a bare header is per question',
  { timeout: 120000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    const srv = bootServer(port, { FAIR_USE_PAPER_SECRET: 'wiring-secret' }, {
      [`usageLedger/trial-student/days/${today}`]: { trialChecks: 0 },
    });
    t.after(() => srv.child.kill());
    await srv.ready;

    // ── (0) CORS: the mint is preflight-allowed and the pass header is an allowed header. ──
    const pre = await request(port, 'OPTIONS', USAGE_PAPER_PATH, undefined, { origin: 'http://x', 'access-control-request-headers': 'x-lazytopper-paper' });
    assert.equal(pre.status, 204);
    assert.match(String(pre.headers['access-control-allow-headers']), /X-Lazytopper-Paper/);

    // ── (1) The mint needs a VERIFIED caller. ──
    assert.equal((await request(port, 'POST', USAGE_PAPER_PATH, { surface: 'chapter-test', paperKey: 'ct-w' }, {})).status, 401);
    assert.equal((await request(port, 'POST', USAGE_PAPER_PATH, { surface: 'quick-practice', paperKey: 'ct-w' }, TRIAL)).status, 400);

    // ── (2) Mint: a pass, and ONE ledger write (inside the R2 transaction) holding the
    //        pass entry { issuedAtMs, surface } — FAIR-USE-3 R1: that entry IS the spend. ──
    let before = srv.log();
    let res = await request(port, 'POST', USAGE_PAPER_PATH, { surface: 'chapter-test', paperKey: 'ct-w' }, TRIAL);
    for (let i = 0; i < 40 && !/paperPasses/.test(srv.log().slice(before.length)); i++) await wait(50);
    let delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `${res.text}\n${delta}`);
    const pass = JSON.parse(res.text);
    assert.equal(pass.surface, 'chapter-test');
    assert.match(pass.token, /^v1\.\d+\.chapter-test\./);
    const mintWrite = delta.split('\n').find((l) => l.startsWith(`LEDGER_SET usageLedger/trial-student/days/${today} `) && l.includes('paperPasses'));
    assert.ok(mintWrite, `the mint must be recorded on the ledger day document\n${delta}`);
    assert.match(mintWrite, /"paperPasses":\{"[0-9a-f]{32}":\{"issuedAtMs":\d+,"surface":"chapter-test"\}\}/);
    assert.doesNotMatch(mintWrite, /trialChapterTests|increment/, 'FAIR-USE-3: the mint bumps no counter');
    assert.doesNotMatch(mintWrite, /ct-w/, 'the ledger holds a hash, never the paper id');
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, 'minting is not grading');

    // ── (3) Grade the paper WITH its pass -> served as the paper; no answer checks spent,
    //        and (R1, P7) the served grade marks the pass graded on its own day document. ──
    before = srv.log();
    res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(3, 'ct-w'),
      { ...TRIAL, 'x-lazytopper-surface': 'chapter-test', 'x-lazytopper-paper': pass.token });
    for (let i = 0; i < 40 && !/gradedAtMs/.test(srv.log().slice(before.length)); i++) await wait(50);
    delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, `${res.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `CONTROL: the paper must reach the grader\n${delta}`);
    assert.ok(!/trialChecks|trialChapterTests/.test(delta), `a minted paper must spend nothing more\n${delta}`);
    const gradedWrite = delta.split('\n').find((l) => l.startsWith(`LEDGER_SET usageLedger/trial-student/days/${today} `) && l.includes('gradedAtMs'));
    assert.ok(gradedWrite, `R1: the served paper grade must mark its pass graded\n${delta}`);
    assert.match(gradedWrite, /"paperPasses":\{"[0-9a-f]{32}":\{"issuedAtMs":\d+,"surface":"chapter-test","gradedAtMs":\d+\}\}/);

    // ── (4) The same request with the bare header and NO pass -> per question. ──
    before = srv.log();
    res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(3, 'ct-w'), { ...TRIAL, 'x-lazytopper-surface': 'chapter-test' });
    for (let i = 0; i < 40 && !/trialChecks/.test(srv.log().slice(before.length)); i++) await wait(50);
    delta = srv.log().slice(before.length);
    assert.equal(res.status, 200, res.text);
    assert.ok(delta.includes('{"trialChecks":{"increment":3}}'), `a forged / old-client paper is counted per question\n${delta}`);

    // ── (5) A malformed pass is never a 500. ──
    res = await request(port, 'POST', GRADE_WORKSHEET_PATH, typedBatch(1, 'ct-w'),
      { ...TRIAL, 'x-lazytopper-surface': 'chapter-test', 'x-lazytopper-paper': 'v1.garbage' });
    assert.equal(res.status, 200, res.text);
  });

/* ══════════════════════════════════════════════════════════════════════════
   LOW-END-1 R4 · IDEMPOTENT GRADING — a retried check is never graded or charged twice

   Pins (spec §2 R4): same key twice -> ONE grade, ONE charge, an IDENTICAL body;
   different keys -> two; no key -> unchanged (nothing stored); a CONCURRENT duplicate ->
   one grade; a stored result lapses at 24 h (the read path checks expiry itself); a failed
   grade is neither stored nor charged. The pipeline below runs the steps in index.cjs's
   order — idempotency FIRST, then fair use, then the handler — over a Firestore whose
   transactions are version-checked and re-run, so a race here is a race.

   MUTATIONS (each run alone, each restore verified by an empty `git diff`):
     M1  begin(): skip the read (always claim)          -> "same key twice" + "concurrent" RED
     M2  index.cjs: idempotency AFTER fair use           -> WIRING "same key twice" RED (a 2nd charge)
     M6  classifyIdempotencyRecord(): ignore expiresAtMs -> "24 h" RED
     M7  claimOrRead(): no pending marker                -> "concurrent duplicate" RED
   ══════════════════════════════════════════════════════════════════════════ */

/** A path-keyed Firestore honouring transactions like Firestore (version check + re-run). */
function idemFirestore({ failTx = false } = {}) {
  const docs = new Map();
  const versions = new Map();
  let writes = 0;
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const bump = (p) => versions.set(p, (versions.get(p) || 0) + 1);
  function ref(parts) {
    const p = parts.join('/');
    return {
      path: p,
      collection: (name) => ({ doc: (id) => ref([...parts, name, id]) }),
      async get() { await tick(); return { exists: docs.has(p), data: () => clone(docs.get(p)) }; },
    };
  }
  const db = {
    collection: (name) => ({ doc: (id) => ref([name, id]) }),
    async runTransaction(fn) {
      if (failTx) throw new Error('firestore unavailable');
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const seen = new Map();
        const queued = [];
        const tx = {
          async get(r) {
            await tick();
            seen.set(r.path, versions.get(r.path) || 0);
            return { exists: docs.has(r.path), data: () => clone(docs.get(r.path)) };
          },
          set(r, data) { queued.push(['set', r, data]); return tx; },
          delete(r) { queued.push(['delete', r]); return tx; },
        };
        const result = await fn(tx);
        await tick();
        if ([...seen].some(([p, v]) => (versions.get(p) || 0) !== v)) continue;
        for (const [op, r, data] of queued) {
          if (op === 'set') docs.set(r.path, clone(data));
          else docs.delete(r.path);
          bump(r.path);
          writes += 1;
        }
        return result;
      }
      throw new Error('transaction contention');
    },
  };
  return { db, docs, writes: () => writes };
}

/** A response the pipeline can hook: writeHead + end, `finish` on end (as Node's does). */
function idemRes() {
  const res = new EventEmitter();
  res.statusCode = 0;
  res.headers = {};
  res.body = null;
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = { ...(headers || {}) }; };
  res.end = function end(chunk) {
    res.body = chunk === undefined ? null : String(chunk);
    setImmediate(() => res.emit('finish'));
  };
  return res;
}

const KEY_A = '7f9c2ba4-e88f-4d21-9a3b-1c2d3e4f5a6b';
const KEY_B = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

/**
 * index.cjs's order, in-process: idempotency -> fair use (trial, charge on a 2xx finish)
 * -> the handler. `handler(n)` returns { status, body } for the n-th REAL grade, and may
 * await `gate` (a promise) to hold that grade in flight.
 */
function idemPipeline({ now = NOW, waitMs = 75000, failTx = false } = {}) {
  const fs = idemFirestore({ failTx });
  const clock = { now };
  const telemetry = recorder();
  const ledger = fakeLedger({});
  let grades = 0;
  const idem = createGradingIdempotency({
    resolveFirestore: () => ({ db: fs.db }),
    telemetry,
    corsOrigin: 'https://www.lazytopper.com',
    now: () => clock.now,
    // A poll yields to the event loop and advances the clock one poll — a real wait,
    // compressed: the first attempt really does progress while the duplicate polls.
    sleep: async (ms) => { await new Promise((r) => setImmediate(r)); clock.now += ms; },
    waitMs,
  });
  const fairUse = createFairUse({
    tierOf: async () => 'trial',
    ledger,
    env: { FAIR_USE_ENFORCE: '1' },
    now: () => clock.now,
    readJson: rawReadJson,
    resolveFirestore: () => null,
    sendJson: (res, status, body) => { res.writeHead(status, {}); res.end(JSON.stringify(body)); },
  });
  async function send({ key, uid = 'stu-1', path: reqPath = CHECK_SOLUTION_PATH, handler, body } = {}) {
    const req = fakeReq({ surface: 'check-improve', headers: key ? { [IDEMPOTENCY_HEADER]: key } : {}, body });
    const res = idemRes();
    const step = await idem.begin(req, res, reqPath, uid);
    if (step && step.replay) {
      idem.replay(res, step.replay);
    } else if (step && step.busy) {
      res.writeHead(503, {});
      res.end(JSON.stringify(GRADING_IN_PROGRESS_BODY));
    } else if (!(await fairUse.applyToRequest(req, res, reqPath, uid))) {
      grades += 1;
      const out = await handler(grades);
      // GRADER-CORE-1 PR-3 (C9): like the real grading handlers, a handler may report how many
      // questions it actually graded (the non-enumerable count fair use commits).
      if (out.charged !== undefined) setChargeableCount(res, out.charged);
      res.writeHead(out.status, { 'Content-Type': 'application/json' });
      res.end(out.body);
    }
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    return res;
  }
  const settle = async () => { for (let i = 0; i < 20; i += 1) await new Promise((r) => setImmediate(r)); };
  return { send, settle, fs, clock, telemetry, ledger, grades: () => grades, charges: () => ledger.trialWrites.length };
}

const gradedBody = (n) => JSON.stringify({ ok: true, totalMarks: 3, marksAwarded: n, percentage: 33 * n, annotatedSteps: [], teacherNote: `grade #${n}` });
const okHandler = async (n) => ({ status: 200, body: gradedBody(n) });

test('R4 · ★ same key twice -> ONE grade, ONE charge, and the IDENTICAL body (replayed, not regraded)', async () => {
  const p = idemPipeline();
  const first = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  const second = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(p.grades(), 1, 'the retry was graded a second time');
  assert.equal(p.charges(), 1, `the retry was charged a second time: ${JSON.stringify(p.ledger.trialWrites)}`);
  assert.deepEqual(p.ledger.trialWrites[0].counts, { checks: 1 });
  assert.equal(second.body, first.body, 'the replay must be byte-identical to the first answer');
  assert.equal(second.headers['Idempotent-Replayed'], 'true');
  assert.equal(second.headers['Access-Control-Allow-Origin'], 'https://www.lazytopper.com');
  assert.equal(p.telemetry.count('idempotency.replay'), 1);
  // The record is uid-scoped and holds a HASH of path|key, never the key itself.
  const paths = [...p.fs.docs.keys()];
  assert.equal(paths.length, 1);
  assert.match(paths[0], /^gradingResults\/stu-1\/attempts\/[0-9a-f]{40}$/);
  assert.ok(!paths[0].includes(KEY_A));
  const rec = p.fs.docs.get(paths[0]);
  assert.equal(rec.state, 'done');
  assert.equal(rec.expiresAtMs, NOW + IDEMPOTENCY_TTL_MS, 'the 24 h runs from the first attempt');
  assert.ok(rec.expiresAt, 'a Timestamp-able expiry field for the TTL policy');
});

test('R4 · different keys -> two grades, two charges (a new attempt is a new check)', async () => {
  const p = idemPipeline();
  const a = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  const b = await p.send({ key: KEY_B, handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 2);
  assert.equal(p.charges(), 2);
  assert.notEqual(a.body, b.body);
});

test('R4 · NO key -> exactly as before: every request graded and charged, nothing stored, Firestore untouched', async () => {
  const p = idemPipeline();
  await p.send({ handler: okHandler });
  await p.settle();
  await p.send({ handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 2);
  assert.equal(p.charges(), 2);
  assert.equal(p.fs.writes(), 0, 'a keyless request must not touch the idempotency store');
  assert.equal(p.telemetry.startingWith('idempotency.').length, 0);
});

test('R4 · the same key on the OTHER grading endpoint is a different record (path is part of the id)', async () => {
  const p = idemPipeline();
  await p.send({ key: KEY_A, path: CHECK_SOLUTION_PATH, handler: okHandler });
  await p.settle();
  await p.send({ key: KEY_A, path: GRADE_WORKSHEET_PATH, handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 2);
  assert.equal(p.fs.docs.size, 2);
});

test('R4 · ★ CONCURRENT duplicate (the lost-reply retry while the first is still grading) -> ONE grade', async () => {
  const p = idemPipeline();
  let release;
  const gate = new Promise((r) => { release = r; });
  const slowHandler = async (n) => { await gate; return { status: 200, body: gradedBody(n) }; };
  const first = p.send({ key: KEY_A, handler: slowHandler });
  // Let the first claim its marker and enter the grader.
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setImmediate(r));
  const second = p.send({ key: KEY_A, handler: slowHandler });
  for (let i = 0; i < 30; i += 1) await new Promise((r) => setImmediate(r));
  assert.equal(p.grades(), 1, 'the duplicate started a second grade instead of waiting');
  release();
  const [r1, r2] = await Promise.all([first, second]);
  await p.settle();
  assert.equal(p.grades(), 1, 'exactly one grade for one key');
  assert.equal(p.charges(), 1, 'exactly one charge for one key');
  assert.equal(r1.statusCode, 200);
  assert.equal(r2.statusCode, 200);
  assert.equal(r2.body, r1.body, 'the waiting duplicate returns the first result');
  assert.equal(p.telemetry.count('idempotency.replay_after_wait'), 1);
});

test('R4 · a duplicate still waiting at the end of its bounded wait gets 503 grading_in_progress — and grades nothing', async () => {
  const p = idemPipeline({ waitMs: 5000 });
  const never = new Promise(() => {});
  p.send({ key: KEY_A, handler: async () => { await never; } });
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setImmediate(r));
  const dup = await p.send({ key: KEY_A, handler: okHandler });
  assert.equal(dup.statusCode, 503);
  assert.equal(JSON.parse(dup.body).code, 'grading_in_progress');
  assert.equal(p.grades(), 1);
  assert.equal(p.charges(), 0);
});

test('R4 · ★ 24 h: the stored result is replayed just inside 24 h and NOT at 24 h — the read path checks expiry itself', async () => {
  const p = idemPipeline();
  await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  p.clock.now = NOW + IDEMPOTENCY_TTL_MS - 1;
  const inside = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 1, 'inside 24 h the result must be replayed');
  assert.equal(inside.headers['Idempotent-Replayed'], 'true');
  // The document is still there (no TTL policy has fired) — only the read path can lapse it.
  p.clock.now = NOW + IDEMPOTENCY_TTL_MS;
  assert.equal(p.fs.docs.size, 1);
  const after = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 2, 'at 24 h the stored result must have lapsed');
  assert.equal(p.charges(), 2);
  assert.equal(after.headers['Idempotent-Replayed'], undefined);
});

test('R4 · a FAILED grade is neither stored nor charged; the retry grades afresh and is charged once', async () => {
  const p = idemPipeline();
  const failed = await p.send({ key: KEY_A, handler: async () => ({ status: 500, body: JSON.stringify({ ok: false, error: 'Failed to evaluate solution. Please try again.' }) }) });
  await p.settle();
  assert.equal(failed.statusCode, 500);
  assert.equal(p.charges(), 0, 'a failed grade must cost nothing');
  assert.equal(p.fs.docs.size, 0, 'a failed grade must not be stored (the marker is released)');
  assert.equal(p.telemetry.count('idempotency.released'), 1);
  const retry = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(retry.statusCode, 200);
  assert.equal(p.grades(), 2);
  assert.equal(p.charges(), 1);
  assert.equal(p.fs.docs.get([...p.fs.docs.keys()][0]).state, 'done');
});

test('R4 · a fair-use REFUSAL (409) is not stored: the marker is released and nothing is graded', async () => {
  const p = idemPipeline();
  // Spend the day's 5 checks with five distinct attempts.
  for (const k of ['a', 'b', 'c', 'd', 'e']) {
    await p.send({ key: `${k.repeat(8)}-0000-4000-8000-000000000000`, handler: okHandler });
    await p.settle();
  }
  assert.equal(p.charges(), 5);
  // fakeLedger reads a static object, so seed the spent day for the 6th.
  p.ledger.readDays = async (uid, keys) => new Map(keys.map((k) => [k, k === TODAY ? { trialChecks: 5 } : {}]));
  const refused = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(refused.statusCode, 409);
  assert.equal(p.grades(), 5);
  const recs = [...p.fs.docs.values()];
  assert.equal(recs.length, 5, 'the refusal left no record behind');
  assert.ok(recs.every((r) => r.state === 'done'));
});

// ★ AMENDED by GRADER-CORE-1 PR-3 (spec C9, controller decision D25). Before PR-3 this pinned
// "a 200 { ok:false } IS stored — it is exactly what fair use charged (2xx)". A response that
// graded nothing is still STORED (a retry of the same press gets the same answer) but is no
// longer CHARGED: the handler reports 0 graded questions. Stored no longer implies charged.
test('R4 · a 200 { ok:false } ("couldn\'t read the grading") IS stored — and, since C9, NOT charged (nothing was graded)', async () => {
  const p = idemPipeline();
  const okFalse = JSON.stringify({ ok: false, error: "We couldn't read the grading this time — please try again." });
  await p.send({ key: KEY_A, handler: async () => ({ status: 200, body: okFalse, charged: 0 }) });
  await p.settle();
  const again = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(p.charges(), 0, 'a 2xx that graded nothing costs nothing — on the attempt or its replay');
  assert.equal(p.grades(), 1);
  assert.equal(again.body, okFalse, 'still stored and replayed byte-for-byte');
  assert.equal(again.headers['Idempotent-Replayed'], 'true');
});

/* ── C9 × R4 (GRADER-CORE-1 PR-3): idempotency keeps "charged once, for what was graded" ── */

test('C9·(i) same key twice -> ONE grade, ONE charge for the graded question, the replay charges nothing', async () => {
  const p = idemPipeline();
  const first = await p.send({ key: KEY_A, handler: async (n) => ({ status: 200, body: gradedBody(n), charged: 1 }) });
  await p.settle();
  const second = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 1);
  assert.deepEqual(p.ledger.trialWrites.map((w) => w.counts), [{ checks: 1 }]);
  assert.equal(second.body, first.body);
});

test('C9·(ii) same key, FIRST ATTEMPT FAILED -> no charge on either: a stored "not graded" 2xx replays free; a 500 is released and only a real grade is charged', async () => {
  // (a) the first attempt is a served "nothing graded" (couldNotRead / timed out): stored, 0 charged, replay 0.
  const a = idemPipeline();
  const cnr = JSON.stringify({ ok: false, error: "We couldn't read your answer clearly enough to mark it — please retake the photo in good light, or type your answer, and check again." });
  await a.send({ key: KEY_A, handler: async () => ({ status: 200, body: cnr, charged: 0 }) });
  await a.settle();
  const replay = await a.send({ key: KEY_A, handler: okHandler });
  await a.settle();
  assert.deepEqual([a.grades(), a.charges(), replay.body], [1, 0, cnr]);
  // (b) the first attempt is a 500 (every chunk failed): not stored, not charged; the retry with
  //     the same key grades afresh and is charged once — for what IT graded.
  const b = idemPipeline();
  const failed = await b.send({ key: KEY_A, handler: async () => ({ status: 500, body: JSON.stringify({ ok: false, error: 'Failed to evaluate solution. Please try again.' }) }) });
  await b.settle();
  assert.deepEqual([failed.statusCode, b.charges(), b.fs.docs.size], [500, 0, 0]);
  await b.send({ key: KEY_A, handler: async (n) => ({ status: 200, body: gradedBody(n), charged: 1 }) });
  await b.settle();
  assert.deepEqual([b.grades(), b.ledger.trialWrites.map((w) => w.counts)], [2, [{ checks: 1 }]]);
});

test('C9·(iii) a PARTIAL paper replayed -> charged ONCE, for the graded questions only', async () => {
  const p = idemPipeline();
  const body = { worksheetId: 'ci:abc', questions: [1, 2, 3, 4].map((n) => ({ qNumber: n, questionText: 'Q' + n })) };
  const partial = JSON.stringify({ ok: true, gradedCount: 2, pendingCount: 2 });
  await p.send({ key: KEY_A, path: GRADE_WORKSHEET_PATH, body, handler: async () => ({ status: 200, body: partial, charged: 2 }) });
  await p.settle();
  const again = await p.send({ key: KEY_A, path: GRADE_WORKSHEET_PATH, body, handler: okHandler });
  await p.settle();
  assert.equal(p.grades(), 1);
  assert.deepEqual(p.ledger.trialWrites.map((w) => w.counts), [{ checks: 2 }], '4 requested, 2 graded → 2 checks, once');
  assert.equal(again.body, partial);
  // CONTROL: a handler that reports nothing (any non-grading path) keeps the requested count.
  const legacy = idemPipeline();
  await legacy.send({ key: KEY_B, path: GRADE_WORKSHEET_PATH, body, handler: async () => ({ status: 200, body: partial }) });
  await legacy.settle();
  assert.deepEqual(legacy.ledger.trialWrites.map((w) => w.counts), [{ checks: 4 }]);
});

test('R4 · a dead attempt\'s marker (older than 5 min) may be re-claimed; a fresh one may not', async () => {
  const p = idemPipeline({ waitMs: 1000 });
  const never = new Promise(() => {});
  p.send({ key: KEY_A, handler: async () => { await never; } });
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setImmediate(r));
  p.clock.now = NOW + IDEMPOTENCY_PENDING_STALE_MS + 1;
  const r = await p.send({ key: KEY_A, handler: okHandler });
  await p.settle();
  assert.equal(r.statusCode, 200);
  assert.equal(p.grades(), 2, 'a stale marker must not block the student forever');
});

test('R4 · malformed key, no verified uid, a non-grading path, no Firestore, a Firestore error -> null (as before)', async () => {
  const fs = idemFirestore();
  const mk = (extra = {}) => createGradingIdempotency({ resolveFirestore: () => ({ db: fs.db }), ...extra });
  const req = (key) => fakeReq({ headers: key === undefined ? {} : { [IDEMPOTENCY_HEADER]: key } });
  assert.equal(await mk().begin(req('short'), idemRes(), CHECK_SOLUTION_PATH, 'stu-1'), null);
  assert.equal(await mk().begin(req('has spaces in it, nope!!'), idemRes(), CHECK_SOLUTION_PATH, 'stu-1'), null);
  assert.equal(await mk().begin(req(KEY_A), idemRes(), CHECK_SOLUTION_PATH, ''), null, 'the free check / anonymous');
  assert.equal(await mk().begin(req(KEY_A), idemRes(), '/api/detect-question', 'stu-1'), null);
  assert.equal(await mk().begin(req(undefined), idemRes(), CHECK_SOLUTION_PATH, 'stu-1'), null);
  assert.equal(await createGradingIdempotency({ resolveFirestore: () => null }).begin(req(KEY_A), idemRes(), CHECK_SOLUTION_PATH, 'stu-1'), null);
  const broken = idemFirestore({ failTx: true });
  assert.equal(await createGradingIdempotency({ resolveFirestore: () => ({ db: broken.db }) }).begin(req(KEY_A), idemRes(), CHECK_SOLUTION_PATH, 'stu-1'), null, 'fail OPEN');
  assert.equal(fs.writes(), 0);
  // CONTROL: the same rig with a valid key and uid DOES claim.
  assert.deepEqual(await mk().begin(req(KEY_A), idemRes(), CHECK_SOLUTION_PATH, 'stu-1'), { claimed: true });
});

test('R4 · classifyIdempotencyRecord: expiry, staleness and malformed records', () => {
  const t = NOW;
  const live = t + 1000;
  assert.equal(classifyIdempotencyRecord(null, t), 'free');
  assert.equal(classifyIdempotencyRecord({ state: 'done', status: 200, body: '{}', expiresAtMs: live }, t), 'done');
  assert.equal(classifyIdempotencyRecord({ state: 'done', status: 200, body: '{}', expiresAtMs: t }, t), 'free');
  assert.equal(classifyIdempotencyRecord({ state: 'done', status: 200, expiresAtMs: live }, t), 'free', 'no body');
  assert.equal(classifyIdempotencyRecord({ state: 'pending', claimedAtMs: t - 1000, expiresAtMs: live }, t), 'pending');
  assert.equal(classifyIdempotencyRecord({ state: 'pending', claimedAtMs: t - IDEMPOTENCY_PENDING_STALE_MS, expiresAtMs: live }, t), 'free');
  assert.equal(classifyIdempotencyRecord({ state: 'done', status: 200, body: '{}' }, t), 'free', 'no expiry is no record');
});

test('R4 · the duplicate wait stays inside the client\'s 90 s timeout', () => {
  assert.ok(IDEMPOTENCY_WAIT_MS < 90000, `wait ${IDEMPOTENCY_WAIT_MS} ms must be < the client's 90 s`);
  assert.ok(IDEMPOTENCY_PENDING_STALE_MS > 90000 * 3, 'a live grade (up to 3 client attempts) must never look dead');
});

test('WIRING · REAL index.cjs, R4: same Idempotency-Key twice -> one Gemini grade, one charge, identical body; no key -> two of each',
  { timeout: 180000 }, async (t) => {
    const today = istDayKey(Date.now());
    const port = await freePort();
    const srv = bootServer(port, {}, {});
    t.after(() => srv.child.kill());
    await srv.ready;

    // ── (0) CORS: the key is preflight-allowed. ──
    const pre = await request(port, 'OPTIONS', CHECK_SOLUTION_PATH, undefined, { origin: 'http://x', 'access-control-request-headers': 'idempotency-key' });
    assert.equal(pre.status, 204);
    assert.match(String(pre.headers['access-control-allow-headers']), /Idempotency-Key/);

    const body = { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' };
    const keyed = { ...TRIAL, 'x-lazytopper-surface': 'check-improve', 'idempotency-key': KEY_A };
    const settleLedger = async (from) => {
      for (let i = 0; i < 40 && !/trialChecks/.test(srv.log().slice(from)); i++) await wait(50);
      await wait(200);
    };

    // ── (1) First attempt: graded and charged once. ──
    let before = srv.log().length;
    const first = await request(port, 'POST', CHECK_SOLUTION_PATH, body, keyed);
    await settleLedger(before);
    let delta = srv.log().slice(before);
    assert.equal(first.status, 200, `${first.text}\n${delta}`);
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `CONTROL: the first attempt must reach the model\n${delta}`);
    assert.equal(count(delta, /trialChecks/g), 1, `the first attempt is charged once\n${delta}`);
    assert.ok(delta.includes('IDEM_SET gradingResults/trial-student/attempts/'), `the served grade must be stored\n${delta}`);

    // ── (2) The retry with the SAME key: not graded, not charged, the same bytes. ──
    before = srv.log().length;
    const retry = await request(port, 'POST', CHECK_SOLUTION_PATH, body, keyed);
    await wait(600);
    delta = srv.log().slice(before);
    assert.equal(retry.status, 200, retry.text);
    assert.equal(retry.text, first.text, 'the retry must return the identical body');
    assert.equal(retry.headers['idempotent-replayed'], 'true');
    assert.equal(count(delta, /GEMINI_FETCH/g), 0, `the retry reached the model\n${delta}`);
    assert.equal(count(delta, /trialChecks/g), 0, `the retry was charged again\n${delta}`);

    // ── (3) No key, twice: exactly as before — graded and charged each time. ──
    const plain = { ...TRIAL, 'x-lazytopper-surface': 'check-improve' };
    for (let i = 0; i < 2; i += 1) {
      before = srv.log().length;
      const r = await request(port, 'POST', CHECK_SOLUTION_PATH, body, plain);
      await settleLedger(before);
      delta = srv.log().slice(before);
      assert.equal(r.status, 200, r.text);
      assert.ok(count(delta, /GEMINI_FETCH/g) >= 1, `keyless request ${i} must be graded\n${delta}`);
      assert.equal(count(delta, /trialChecks/g), 1, `keyless request ${i} must be charged\n${delta}`);
      assert.equal(count(delta, /IDEM_SET/g), 0, `a keyless request must store nothing\n${delta}`);
      assert.ok(!r.headers['idempotent-replayed']);
    }
    assert.ok(today);
  });

test('C9·(iv) a paper grade that delivered NOTHING does not mark its pass graded (it lapses at 24 h); one graded question does', async () => {
  for (const [charged, want] of [[0, 0], [1, 1], [undefined, 1]]) {
    const r = rig({ env: PASS_ENV, days: {} });
    const m = await mint(r, { surface: 'worksheet', paperKey: 'ws-a' });
    const req = fakeReq({ surface: 'worksheet', body: PAPER_BODY('ws-a'), headers: paperHeaders(m.body.token) });
    const res = fakeRes();
    assert.equal(await r.gate.applyToRequest(req, res, GRADE_WORKSHEET_PATH, 'stu-1'), false);
    if (charged !== undefined) setChargeableCount(res, charged); // what the grading handler reports
    res.serve(200);
    await settle();
    assert.equal(r.fs.gradedWrites().length, want, 'charged=' + charged + ' (undefined = no grading handler: as before)');
  }
});

test('C9·(v) a per-question surface spends only the GRADED questions; nothing graded spends nothing; a non-2xx never spends', async () => {
  for (const [charged, serve, want] of [[2, 200, [{ checks: 2 }]], [0, 200, []], [3, 200, [{ checks: 3 }]], [9, 200, [{ checks: 3 }]], [3, 500, []]]) {
    const r = rig({ days: {} });
    const req = fakeReq({ surface: 'check-improve', body: { worksheetId: 'ci:x', questions: questions(3) } });
    const res = fakeRes();
    assert.equal(await r.gate.applyToRequest(req, res, GRADE_WORKSHEET_PATH, 'stu-1'), false);
    setChargeableCount(res, charged);
    res.serve(serve);
    await settle();
    assert.deepEqual(r.ledger.trialWrites.map((w) => w.counts), want, 'charged=' + charged + ' status=' + serve);
  }
});

test('WIRING · REAL index.cjs, C9: a 200 that graded NOTHING is stored and replayed but never charged (the graded case: the R4 WIRING test above)',
  { timeout: 180000 }, async (t) => {
    const port = await freePort();
    const srv = bootServer(port, { FAIR_USE_TEST_GEMINI: 'unparseable' }, {});
    t.after(() => srv.child.kill());
    await srv.ready;
    const body = { question: 'Solve x + 1 = 2', marks: 1, textAnswer: 'x = 1' };
    const keyed = { ...TRIAL, 'x-lazytopper-surface': 'check-improve', 'idempotency-key': KEY_A };
    let before = srv.log().length;
    const first = await request(port, 'POST', CHECK_SOLUTION_PATH, body, keyed);
    for (let i = 0; i < 40 && !/IDEM_SET/.test(srv.log().slice(before)); i++) await wait(50);
    await wait(400);
    let delta = srv.log().slice(before);
    assert.equal(first.status, 200, `${first.text}\n${delta}`);
    assert.equal(JSON.parse(first.text).ok, false, 'the unparseable reply is the honest 200 { ok:false }');
    assert.ok(count(delta, /GEMINI_FETCH/g) >= 2, `CONTROL: the grade was attempted (and retried once)\n${delta}`);
    assert.ok(delta.includes('IDEM_SET gradingResults/trial-student/attempts/'), `still STORED (a retry of this press gets the same answer)\n${delta}`);
    assert.equal(count(delta, /trialChecks/g), 0, `C9: nothing graded, nothing charged\n${delta}`);
    before = srv.log().length;
    const retry = await request(port, 'POST', CHECK_SOLUTION_PATH, body, keyed);
    await wait(600);
    delta = srv.log().slice(before);
    assert.deepEqual([retry.status, retry.text, retry.headers['idempotent-replayed']], [200, first.text, 'true']);
    assert.equal(count(delta, /GEMINI_FETCH|trialChecks/g), 0, `the replay is neither graded nor charged\n${delta}`);
  });
