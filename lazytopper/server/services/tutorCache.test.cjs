/**
 * tutorCache — the hit-count UPDATE must not be able to kill the process.
 *
 * WHY THIS FILE EXISTS (OPS-J). `findSimilarResponse` bumps `hit_count` on a cache HIT
 * with a deliberately fire-and-forget `void pool.query(...)`. The student is already
 * waiting on the cached answer, so that write must never be awaited. But a `void`ed
 * promise is OUTSIDE the enclosing `try` — the try cannot catch it — and Node 22
 * terminates the process on an unhandled rejection. A single transient DB blip on the
 * UPDATE (ECONNRESET, admin-terminated connection, pool exhaustion) therefore took the
 * whole API server down. The guard is a `.catch()` that logs and swallows.
 *
 * These tests pin BOTH halves, because either one alone can be satisfied by a wrong fix:
 *   1. no unhandled rejection, and the cache hit still returns its value
 *      (an `await ... .catch()` also passes this one)
 *   2. a hit-count UPDATE that NEVER SETTLES does not delay the cached answer
 *      (this is the half that fails if someone "fixes" it by awaiting)
 *
 * The fingerprint is not hardcoded — test 0 reads it back out of lookup() against an
 * empty table, so a change to the stemmer or the stopword list cannot silently turn
 * these tests into no-ops by making the HIT branch unreachable.
 */
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

// ---- pg stub, installed before tutorCache is required ------------------------------
const state = {
  rows: [],
  updateMode: 'resolve',   // 'resolve' | 'reject' | 'hang'
  updateAttempts: 0,
  selectMode: 'resolve',
};

class FakePool {
  on() {}
  query(sql) {
    if (/UPDATE tutor_cache SET hit_count/.test(sql)) {
      state.updateAttempts++;
      if (state.updateMode === 'hang') return new Promise(() => {});
      if (state.updateMode === 'reject') {
        return Promise.reject(new Error('ECONNRESET: terminating connection due to administrator command'));
      }
      return Promise.resolve({ rows: [] });
    }
    if (state.selectMode === 'reject') return Promise.reject(new Error('SELECT failed'));
    return Promise.resolve({ rows: state.rows });
  }
}

const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'pg') return { Pool: FakePool };
  return origLoad.apply(this, arguments);
};

process.env.DATABASE_URL = 'postgres://stub/stub';

const { createTutorCache } = require('./tutorCache.cjs');
const cache = createTutorCache({});

// ---- unhandled-rejection recorder --------------------------------------------------
const unhandled = [];
process.on('unhandledRejection', (reason) => {
  unhandled.push(reason && reason.message ? reason.message : String(reason));
});

const QUESTION = 'explain the refraction of light through a rectangular glass slab';
const RESPONSE = { answer: 'cached answer' };
const drain = () => new Promise((r) => setTimeout(r, 100));

let FINGERPRINT = null;

function armHit() {
  assert.ok(FINGERPRINT && FINGERPRINT.length > 0, 'fingerprint not calibrated');
  state.rows = [{ id: 4242, fingerprint: FINGERPRINT, response_json: RESPONSE }];
}

test('0 · calibration — an empty table yields a non-empty fingerprint to replay', async () => {
  state.rows = [];
  state.selectMode = 'resolve';
  const out = await cache.lookup('explain', QUESTION, 'Maths');
  assert.ok(out, 'lookup returned null on a cold cache');
  assert.ok(Array.isArray(out.fingerprint) && out.fingerprint.length > 0,
    'fingerprint is empty — the HIT branch would be unreachable and every test below vacuous');
  FINGERPRINT = out.fingerprint;
});

test('1 · the stub really does reach the cache-HIT branch', async () => {
  armHit();
  state.updateMode = 'resolve';
  state.updateAttempts = 0;
  const out = await cache.lookup('explain', QUESTION, 'Maths');
  assert.deepStrictEqual(out.response, RESPONSE, 'no cache hit — the tests below prove nothing');
  assert.strictEqual(state.updateAttempts, 1, 'the hit-count UPDATE was never issued');
});

test('2 · a REJECTING hit-count UPDATE does not produce an unhandled rejection', async () => {
  armHit();
  state.updateMode = 'reject';
  state.updateAttempts = 0;
  unhandled.length = 0;

  const out = await cache.lookup('explain', QUESTION, 'Maths');
  await drain();

  assert.strictEqual(state.updateAttempts, 1, 'the UPDATE never ran, so nothing was tested');
  assert.deepStrictEqual(unhandled, [],
    'the hit-count UPDATE floated its rejection — in production this terminates the Node process');
  assert.deepStrictEqual(out.response, RESPONSE,
    'a failed hit-count bump must not cost the student their cached answer');
});

test('3 · a hit-count UPDATE that NEVER SETTLES does not delay the cached answer', async () => {
  armHit();
  state.updateMode = 'hang';
  state.updateAttempts = 0;

  // If the guard is ever rewritten as `await pool.query(...).catch(...)`, this races
  // against a promise that never settles and the timeout wins.
  const answered = await Promise.race([
    cache.lookup('explain', QUESTION, 'Maths').then(() => 'answered'),
    new Promise((r) => setTimeout(() => r('blocked'), 2000)),
  ]);

  assert.strictEqual(state.updateAttempts, 1, 'the UPDATE never ran, so nothing was tested');
  assert.strictEqual(answered, 'answered',
    'lookup() waited on the fire-and-forget hit-count UPDATE — the void semantics were lost');
});

test('4 · a rejecting SELECT is still caught by the enclosing try', async () => {
  state.selectMode = 'reject';
  state.updateMode = 'resolve';
  unhandled.length = 0;

  const out = await cache.lookup('explain', QUESTION, 'Maths');
  await drain();

  assert.strictEqual(out.response, null, 'a failed lookup must degrade to a miss, not throw');
  assert.deepStrictEqual(unhandled, [], 'the awaited SELECT should be caught by the try');
  state.selectMode = 'resolve';
});
