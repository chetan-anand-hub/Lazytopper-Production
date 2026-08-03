/**
 * sessionStore.test.cjs — session identifiers must not be guessable.
 *
 * CodeQL `js/insecure-randomness` flagged the `Math.random()` fallback in
 * `createSessionId`. A session id here is a BEARER CREDENTIAL: `getSession` is a
 * bare Map lookup with no ownership check, so anyone who can guess an id can
 * read that session's answers.
 *
 * ★ THE ASSERTION IS ON THE SOURCE, NOT THE OUTPUT. Output-shaped tests
 * ("the ids all differ", "they look random") pass perfectly against
 * `Math.random()` — that is exactly why the defect survived. So the test
 * INSTRUMENTS `Math.random` and asserts it is never consulted, on either
 * branch, including the fallback branch that only fires when
 * `crypto.randomUUID` throws.
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');

const { createSession, getSession } = require('./sessionStore.cjs');

const INPUT = { owner: 'uid-1', chapterId: '10-maths-triangles', subjectId: 'maths', vibe: 'high' };

/** Run `fn` with Math.random instrumented; report whether it was consulted. */
function withCountedRandom(fn) {
  const real = Math.random;
  let calls = 0;
  Math.random = () => { calls += 1; return real(); };
  try { return { value: fn(), calls }; } finally { Math.random = real; }
}

test('CONTROL: the instrument really does catch a Math.random() caller', () => {
  // Without this, `calls === 0` below would pass on a broken instrument — an
  // assertion that cannot fail is not an assertion.
  const { calls } = withCountedRandom(() => Math.floor(Math.random() * 100000));
  assert.equal(calls, 1, 'the counter must observe a real call');
});

test('the normal path mints a session id without touching Math.random', () => {
  const { value, calls } = withCountedRandom(() => createSession(INPUT));
  assert.equal(calls, 0, 'Math.random must never be a source of a session id');
  assert.match(value.sessionId, /^sess_[0-9a-f-]{36}$/, 'crypto.randomUUID shape');
});

test('★ the FALLBACK path is cryptographic too — the branch CodeQL flagged', () => {
  // The fallback only fires when crypto.randomUUID throws (old Node). Force it.
  const realUuid = crypto.randomUUID;
  crypto.randomUUID = () => { throw new Error('randomUUID unavailable'); };
  try {
    const { value, calls } = withCountedRandom(() => createSession(INPUT));
    assert.equal(calls, 0, 'the fallback must not reach for Math.random either');
    assert.match(value.sessionId, /^sess_[0-9a-f]{36}$/, 'crypto.randomBytes(18) hex');
    // Date.now() is public knowledge; an id must carry none of it.
    assert.ok(
      !value.sessionId.includes(String(Date.now()).slice(0, 8)),
      'no timestamp prefix may leak into the id',
    );
  } finally {
    crypto.randomUUID = realUuid;
  }
});

test('ids carry enough entropy to be unguessable', () => {
  const ids = new Set();
  for (let i = 0; i < 200; i += 1) ids.add(createSession(INPUT).sessionId);
  assert.equal(ids.size, 200, 'no collisions');
  // 36 hex chars / 36-char uuid — both far past the guessing threshold.
  for (const id of ids) assert.ok(id.length >= 40, `id too short: ${id}`);
});

test('an id is still the key that reads a session back', () => {
  // The fix must not change the lookup contract: ids are opaque strings and
  // every read path is an exact-match Map lookup that never parses them.
  const doc = createSession(INPUT);
  assert.equal(getSession(doc.sessionId).sessionId, doc.sessionId);
  assert.equal(getSession(`${doc.sessionId}x`), null);
  assert.equal(getSession(''), null);
});
