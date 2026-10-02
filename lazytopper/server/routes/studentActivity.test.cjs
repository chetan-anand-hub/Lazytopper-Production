/**
 * studentActivity.test.cjs — STUDENT-ACTIVITY-1 PR-1 (recording), server half.
 *
 * Run: node --test lazytopper/server/routes/studentActivity.test.cjs
 * Wired into `lazytopper` test:matrix:all as test:server:student-activity.
 *
 * Every clock in this file is INJECTED (deps.now) from fixed instants, so it passes at
 * any LT_TEST_CLOCK. Two instants are used on purpose: mid-day IST, and 00:15 IST (the
 * UTC date is still the previous day there — the IST day key must not be).
 *
 * Spec mutations that turn THIS file red (one at a time):
 *   M1  take the uid from the body instead of the token  -> "the uid comes from the TOKEN"
 *   M2  record an unknown name                            -> "an unknown name refuses the WHOLE batch"
 *   D10 remove the post-write account re-check            -> "D10 ERASURE RACE"
 * (M3, "record for a signed-out visitor", is a CLIENT mutation: src/services/activityClient.test.ts.
 *  The server's own refusal of a token-less request is pinned here as well.)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const {
  createStudentActivityRoutes,
  validateBatch,
  expireAtMsForDay,
  ACTIVITY_SECTIONS,
  ACTIVITY_EVENTS,
  MAX_BODY_BYTES,
  MAX_COUNT_PER_NAME,
  MAX_BATCHES_PER_WINDOW,
  RETENTION_DAYS,
  ACTIVITY_DAYS_PATH_TEMPLATE,
} = require('./studentActivity.cjs');

const MID_DAY = Date.parse('2030-06-15T06:30:00.000Z'); // 12:00 IST, 2030-06-15
const IST_MIDNIGHT = Date.parse('2030-02-14T18:45:00.000Z'); // 00:15 IST, 2030-02-15

/* ── fakes ─────────────────────────────────────────────────────────────────── */

function makeAdmin(opts = {}) {
  const verifyCalls = [];
  const getUserCalls = [];
  // uids whose Auth account the "erasure" has deleted.
  const erased = new Set();
  const tokens = {
    'tok-u1': { uid: 'u1', firebase: { sign_in_provider: 'google.com' } },
    'tok-u2': { uid: 'u2', firebase: { sign_in_provider: 'password' } },
    'tok-anon': { uid: 'anon1', firebase: { sign_in_provider: 'anonymous' } },
  };
  const auth = {
    async getUser(uid) {
      getUserCalls.push(uid);
      if (erased.has(uid)) {
        const e = new Error('There is no user record corresponding to the provided identifier.');
        e.code = 'auth/user-not-found';
        throw e;
      }
      return { uid, disabled: false };
    },
    async verifyIdToken(token, checkRevoked) {
      verifyCalls.push({ token, checkRevoked });
      // A token for an account that has since been ERASED: still signature-valid, so
      // a plain verify accepts it. Only the revocation check (which looks the user
      // up) refuses it — exactly production's behaviour.
      if (token === 'tok-deleted') {
        if (checkRevoked === true) {
          const e = new Error('There is no user record corresponding to the provided identifier.');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return { uid: 'erased-student', firebase: { sign_in_provider: 'google.com' } };
      }
      if (token === 'tok-disabled') {
        if (checkRevoked === true) {
          const e = new Error('The user record is disabled.');
          e.code = 'auth/user-disabled';
          throw e;
        }
        return { uid: 'disabled-student', firebase: { sign_in_provider: 'google.com' } };
      }
      // D10: the token verifies (the account still exists at verify time), and the
      // erasure then completes, Auth account included, before the write lands.
      if (token === 'tok-race') {
        erased.add('racer');
        return { uid: 'racer', firebase: { sign_in_provider: 'google.com' } };
      }
      if (tokens[token]) return tokens[token];
      const e = new Error('Decoding Firebase ID token failed.');
      e.code = 'auth/argument-error';
      throw e;
    },
  };
  const tsCalls = [];
  const firestore = () => ({});
  firestore.FieldValue = { increment: (n) => ({ __increment: n }) };
  firestore.Timestamp = {
    fromMillis: (ms) => {
      tsCalls.push(ms);
      return { __timestamp: ms, toMillis: () => ms, toDate: () => new Date(ms) };
    },
  };
  return { admin: { auth: () => auth, firestore }, verifyCalls, tsCalls, getUserCalls, erased };
}

function applyMerge(prev, data) {
  const out = { ...(prev || {}) };
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      out[k] = v; // a merge REPLACES an array (Firestore semantics)
    } else if (v && typeof v === 'object' && '__increment' in v) {
      out[k] = (typeof out[k] === 'number' ? out[k] : 0) + v.__increment;
    } else if (v && typeof v === 'object' && !('__timestamp' in v)) {
      out[k] = applyMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function makeFirestore() {
  const docs = new Map();
  const sets = [];
  const deleted = [];
  function docRef(p) {
    return {
      path: p,
      id: p.split('/').pop(),
      collection: (n) => collRef(`${p}/${n}`),
      async delete() {
        deleted.push(p);
        docs.delete(p);
      },
    };
  }
  function collRef(p) {
    return { path: p, doc: (id) => docRef(`${p}/${id}`) };
  }
  return {
    docs,
    sets,
    deleted,
    collection: (n) => collRef(n),
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          return { exists: docs.has(ref.path), data: () => docs.get(ref.path) };
        },
        set(ref, data, options) {
          sets.push({ path: ref.path, data, options });
          docs.set(ref.path, options && options.merge ? applyMerge(docs.get(ref.path), data) : applyMerge({}, data));
        },
      };
      return fn(tx);
    },
  };
}

function makeReq({ token, body, raw, contentLength } = {}) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = '/api/activity';
  req.headers = {};
  if (token) req.headers['authorization'] = `Bearer ${token}`;
  const payload = raw !== undefined ? raw : body === undefined ? '' : JSON.stringify(body);
  if (contentLength !== undefined) req.headers['content-length'] = String(contentLength);
  req.bodyRead = false;
  const origOn = req.on.bind(req);
  req.on = (ev, fn) => {
    if (ev === 'data') req.bodyRead = true;
    return origOn(ev, fn);
  };
  setImmediate(() => {
    if (payload) req.emit('data', Buffer.from(payload));
    req.emit('end');
  });
  return req;
}

function makeRoutes(opts = {}) {
  const { admin, verifyCalls, tsCalls, getUserCalls } = makeAdmin();
  const db = makeFirestore();
  let nowMs = opts.now === undefined ? MID_DAY : opts.now;
  const sent = [];
  const sendJson = (res, status, body) => {
    sent.push({ status, body });
    res.status = status;
    res.body = body;
  };
  const routes = createStudentActivityRoutes({
    sendJson,
    firebaseAdmin: opts.noAdmin ? null : admin,
    adminFirestore: opts.noAdmin ? null : db,
    now: () => nowMs,
  });
  async function post(reqOpts) {
    const res = {};
    const req = makeReq(reqOpts);
    await routes.handleActivity(req, res);
    return { status: res.status, body: res.body, req };
  }
  return { post, db, verifyCalls, tsCalls, getUserCalls, setNow: (v) => { nowMs = v; } };
}

const dayPath = (uid, day) => `activityLog/${uid}/activityDays/${day}`;

/* ── identity ──────────────────────────────────────────────────────────────── */

test('★★ a signed-out visitor (no token) writes NOTHING — 401 before the body is read', async () => {
  const t = makeRoutes();
  const r = await t.post({ body: { sections: { home: 1 } } });
  assert.equal(r.status, 401);
  assert.equal(t.db.sets.length, 0, 'a signed-out visitor was recorded');
  assert.equal(t.db.docs.size, 0);
  assert.equal(r.req.bodyRead, false, 'the body of an unauthenticated request was read');
  assert.equal(t.verifyCalls.length, 0);
});

test('a token that does not verify is 401 and writes nothing', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'forged', body: { sections: { home: 1 } } });
  assert.equal(r.status, 401);
  assert.equal(t.db.sets.length, 0);
});

test('★★ M1: the uid comes from the TOKEN — a uid in the body is ignored, never written', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'tok-u1', body: { uid: 'victim', sections: { practice: 2 } } });
  assert.equal(r.status, 200);
  assert.deepEqual(t.db.sets.map((s) => s.path), [dayPath('u1', '2030-06-15')]);
  assert.deepEqual(
    [...t.db.docs.keys()].filter((p) => p.includes('victim')),
    [],
    'a uid taken from the request body reached Firestore'
  );
});

test('★★ D4 RESURRECTION: a batch from an ERASED account is refused (verifyIdToken checkRevoked=true) and recreates nothing', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'tok-deleted', body: { sections: { home: 1 } } });
  assert.equal(r.status, 401);
  assert.deepEqual(t.verifyCalls, [{ token: 'tok-deleted', checkRevoked: true }]);
  assert.equal(t.db.sets.length, 0);
  assert.deepEqual([...t.db.docs.keys()].filter((p) => p.startsWith('activityLog/')), [], 'activityLog/{uid} was re-created after erasure');
});

test('★ D4: a DISABLED account is refused the same way', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'tok-disabled', body: { sections: { home: 1 } } });
  assert.equal(r.status, 401);
  assert.equal(t.db.sets.length, 0);
});

test('every verify passes checkRevoked=true (no path verifies without it)', async () => {
  const t = makeRoutes();
  await t.post({ token: 'tok-u1', body: { sections: { home: 1 } } });
  await t.post({ token: 'forged', body: { sections: { home: 1 } } });
  assert.ok(t.verifyCalls.length === 2 && t.verifyCalls.every((c) => c.checkRevoked === true));
});

test('★ an ANONYMOUS Firebase session is not a signed-in student — 403, nothing written', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'tok-anon', body: { sections: { home: 1 } } });
  assert.equal(r.status, 403);
  assert.equal(t.db.sets.length, 0);
});

test('503 (never a write) when firebase-admin is not initialised', async () => {
  const t = makeRoutes({ noAdmin: true });
  const r = await t.post({ token: 'tok-u1', body: { sections: { home: 1 } } });
  assert.equal(r.status, 503);
});

test('★★ D10 ERASURE RACE: erasure completes between verify and write — the write is undone, no activity doc survives', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'tok-race', body: { sections: { practice: 2 }, events: { check_graded: 1 } } });
  // CONTROL: the write really happened (the race was reproduced, not avoided)...
  assert.deepEqual(t.db.sets.map((s) => s.path), [dayPath('racer', '2030-06-15')]);
  // ...and was then removed by the post-write account re-check.
  assert.deepEqual(t.getUserCalls, ['racer']);
  assert.deepEqual(
    [...t.db.docs.keys()].filter((p) => p.startsWith('activityLog/racer')),
    [],
    'an activity document survived an erasure that landed between verify and write'
  );
  assert.deepEqual(t.db.deleted, [dayPath('racer', '2030-06-15')]);
  assert.equal(r.status, 401);
});

test('D10: a live account keeps its write (the re-check runs, and deletes nothing)', async () => {
  const t = makeRoutes();
  const r = await t.post({ token: 'tok-u1', body: { sections: { home: 1 } } });
  assert.equal(r.status, 200);
  assert.deepEqual(t.getUserCalls, ['u1']);
  assert.deepEqual(t.db.deleted, []);
  assert.ok(t.db.docs.has(dayPath('u1', '2030-06-15')));
});

test('D10: ACTIVITY_DAYS_PATH_TEMPLATE is the exact STUDENT_DATA_MAP path the erasure re-sweeps', () => {
  const { loadStudentDataMap } = require('../services/accountErasure.cjs');
  const days = loadStudentDataMap().find((l) => l.id === 'activityLog.activityDays');
  assert.ok(days, 'activityLog.activityDays missing from the map');
  assert.equal(days.path, ACTIVITY_DAYS_PATH_TEMPLATE);
});

/* ── the allowlist ─────────────────────────────────────────────────────────── */

test('★★ M2: an unknown name refuses the WHOLE batch — nothing is written', async () => {
  const t = makeRoutes();
  for (const body of [
    { sections: { home: 1, 'secret-page': 1 } },
    { events: { check_graded: 1, page_view: 1 } },
    { events: { 'what is ohms law?': 1 } },
    { sections: { check_graded: 1 } }, // an event name is not a section name
  ]) {
    const r = await t.post({ token: 'tok-u1', body });
    assert.equal(r.status, 400, `accepted ${JSON.stringify(body)}`);
  }
  assert.equal(t.db.sets.length, 0, 'an unknown name was recorded');
  assert.equal(t.db.docs.size, 0);
});

test('every allowlisted section and event IS accepted (the allowlist is not dead)', async () => {
  const t = makeRoutes();
  const sections = Object.fromEntries(ACTIVITY_SECTIONS.map((n) => [n, 1]));
  const events = Object.fromEntries(ACTIVITY_EVENTS.map((n) => [n, 1]));
  const r = await t.post({ token: 'tok-u1', body: { sections, events } });
  assert.equal(r.status, 200);
  const doc = t.db.docs.get(dayPath('u1', '2030-06-15'));
  assert.deepEqual(Object.keys(doc.sections).sort(), [...ACTIVITY_SECTIONS].sort());
  assert.deepEqual(Object.keys(doc.events).sort(), [...ACTIVITY_EVENTS].sort());
});

test('★ D7: a count must be an integer 1..MAX_COUNT_PER_NAME, else the whole batch is refused', async () => {
  assert.equal(MAX_COUNT_PER_NAME, 50);
  const t = makeRoutes();
  for (const bad of [0, -1, 1.5, MAX_COUNT_PER_NAME + 1, '3', null, true]) {
    const r = await t.post({ token: 'tok-u1', body: { sections: { home: 1, notes: bad } } });
    assert.equal(r.status, 400, `accepted count ${JSON.stringify(bad)}`);
  }
  assert.equal(t.db.sets.length, 0);
  const ok = await t.post({ token: 'tok-u1', body: { sections: { notes: MAX_COUNT_PER_NAME } } });
  assert.equal(ok.status, 200);
});

test('★ D7: an empty batch, a non-object body, or non-object sections/events are refused', async () => {
  const t = makeRoutes();
  for (const body of [{}, { sections: {} }, [], 'home', { sections: ['home'] }, { events: 'check_graded' }]) {
    const r = await t.post({ token: 'tok-u1', body });
    assert.equal(r.status, 400, `accepted ${JSON.stringify(body)}`);
  }
  const bad = await t.post({ token: 'tok-u1', raw: '{not json' });
  assert.equal(bad.status, 400);
  assert.equal(t.db.sets.length, 0);
});

test('★ D7: a body over MAX_BODY_BYTES is refused (413) and nothing is written', async () => {
  // ACTIVITY-DETAIL-1 raised this from 2048: a batch now also carries page counts and up
  // to MAX_FEED_PER_BATCH feed entries (the largest legal body is under 10 KB).
  assert.equal(MAX_BODY_BYTES, 16384);
  const t = makeRoutes();
  const big = JSON.stringify({ sections: { home: 1 }, pad: 'x'.repeat(MAX_BODY_BYTES) });
  const declared = await t.post({ token: 'tok-u1', raw: big, contentLength: Buffer.byteLength(big) });
  assert.equal(declared.status, 413);
  const undeclared = await t.post({ token: 'tok-u1', raw: big });
  assert.equal(undeclared.status, 413);
  assert.equal(t.db.sets.length, 0);
});

test('★ D7: more than MAX_BATCHES_PER_WINDOW batches from one uid in the window are refused (429)', async () => {
  assert.equal(MAX_BATCHES_PER_WINDOW, 40);
  const t = makeRoutes();
  for (let i = 0; i < MAX_BATCHES_PER_WINDOW; i += 1) {
    const r = await t.post({ token: 'tok-u1', body: { sections: { home: 1 } } });
    assert.equal(r.status, 200);
  }
  const over = await t.post({ token: 'tok-u1', body: { sections: { home: 1 } } });
  assert.equal(over.status, 429);
  // Another student is unaffected.
  assert.equal((await t.post({ token: 'tok-u2', body: { sections: { home: 1 } } })).status, 200);
  assert.equal(t.db.docs.get(dayPath('u1', '2030-06-15')).sections.home, MAX_BATCHES_PER_WINDOW);
});

/* ── what is stored ────────────────────────────────────────────────────────── */

test('★★ R1: the day document holds EXACTLY firstSeenMs, lastSeenMs, sections, events, expireAt — nothing from the body beyond names + counts', async () => {
  const t = makeRoutes();
  const r = await t.post({
    token: 'tok-u1',
    body: {
      sections: { practice: 2, notes: 1 },
      events: { check_graded: 1 },
      path: '/notes/ohms-law',
      question: 'What is the SI unit of resistance?',
      answer: 'ohm',
      userAgent: 'Mozilla/5.0',
      ip: '10.0.0.1',
      score: 17,
    },
  });
  assert.equal(r.status, 200);
  const doc = t.db.docs.get(dayPath('u1', '2030-06-15'));
  assert.deepEqual(Object.keys(doc).sort(), ['events', 'expireAt', 'firstSeenMs', 'lastSeenMs', 'sections']);
  assert.deepEqual(doc.sections, { practice: 2, notes: 1 });
  assert.deepEqual(doc.events, { check_graded: 1 });
  const stored = JSON.stringify(doc);
  for (const leak of ['ohms-law', 'resistance', '"ohm"', 'Mozilla', '10.0.0.1', '17']) {
    assert.ok(!stored.includes(leak), `${leak} reached Firestore`);
  }
});

test('★ R2: ONE merge write per batch, with FieldValue.increment counters', async () => {
  const t = makeRoutes();
  await t.post({ token: 'tok-u1', body: { sections: { home: 1, practice: 3, notes: 2 }, events: { check_graded: 1, check_question_read: 2 } } });
  assert.equal(t.db.sets.length, 1, 'a batch must be exactly one write');
  const { data, options } = t.db.sets[0];
  assert.deepEqual(options, { merge: true });
  assert.deepEqual(data.sections, { home: { __increment: 1 }, practice: { __increment: 3 }, notes: { __increment: 2 } });
  assert.deepEqual(data.events, { check_graded: { __increment: 1 }, check_question_read: { __increment: 2 } });
});

test('★ firstSeenMs is set once per day (server time); lastSeenMs moves; counts add up', async () => {
  const t = makeRoutes();
  await t.post({ token: 'tok-u1', body: { sections: { practice: 2 } } });
  t.setNow(MID_DAY + 45_000);
  await t.post({ token: 'tok-u1', body: { sections: { practice: 1, notes: 1 }, events: { check_graded: 1 } } });
  const doc = t.db.docs.get(dayPath('u1', '2030-06-15'));
  assert.equal(doc.firstSeenMs, MID_DAY);
  assert.equal(doc.lastSeenMs, MID_DAY + 45_000);
  assert.deepEqual(doc.sections, { practice: 3, notes: 1 });
  assert.deepEqual(doc.events, { check_graded: 1 });
  assert.ok(!('firstSeenMs' in t.db.sets[1].data), 'the second batch overwrote firstSeenMs');
});

test('★★ R1: expireAt is a Firestore TIMESTAMP of the IST day start + 90 days — at two clock instants', async () => {
  assert.equal(RETENTION_DAYS, 90);
  for (const [nowMs, day, expectedIso] of [
    [MID_DAY, '2030-06-15', '2030-09-12T18:30:00.000Z'],
    // 00:15 IST: the UTC date is still 2030-02-14, the IST day is 2030-02-15.
    [IST_MIDNIGHT, '2030-02-15', '2030-05-15T18:30:00.000Z'],
  ]) {
    const t = makeRoutes({ now: nowMs });
    await t.post({ token: 'tok-u1', body: { sections: { home: 1 } } });
    const doc = t.db.docs.get(dayPath('u1', day));
    assert.ok(doc, `no document at the IST day ${day}`);
    assert.ok(doc.expireAt && typeof doc.expireAt.toMillis === 'function', 'expireAt is not a Timestamp');
    assert.equal(typeof doc.expireAt, 'object', 'expireAt must never be a plain number (TTL ignores it)');
    assert.equal(new Date(doc.expireAt.toMillis()).toISOString(), expectedIso);
    assert.equal(expireAtMsForDay(day), Date.parse(expectedIso));
  }
});

test('validateBatch reads only sections/events (pure)', () => {
  const v = validateBatch({ uid: 'x', sections: { home: 2 }, events: { sign_up: 1 }, other: 1 });
  assert.deepEqual(v, { ok: true, sections: { home: 2 }, events: { sign_up: 1 }, pages: {}, feed: [], feedTruncated: false });
});

/* ══ ACTIVITY-DETAIL-1 — pages visited + the ordered daily feed ═══════════════
   Spec mutations that turn THIS file red (one at a time):
     MUT-RAW  store a raw path (skip the page allowlist)  -> "★★ F1 RAW PATH"
     MUT-CAP  drop the 300-entry day cap                  -> "★★ F2 DAY CAP"
   Every test below runs at BOTH pinned instants (mid-day IST and 00:15 IST). */

const {
  ACTIVITY_PAGE_KEYS,
  ACTIVITY_PAGE_NAMES,
  encodePageKey,
  decodePageKey,
  MAX_FEED_PER_DAY,
  MAX_FEED_PER_BATCH,
} = require('./studentActivity.cjs');

const INSTANTS = [
  [MID_DAY, '2030-06-15'],
  [IST_MIDNIGHT, '2030-02-15'],
];
const dayStartOf = (day) => Date.parse(`${day}T00:00:00.000+05:30`);
const feedOf = (n, base, name = 'notes~trigonometry') =>
  Array.from({ length: n }, (_, i) => ({ t: base + i, k: 'page', n: name }));

test('F1: the page allowlist is the encoded name list, strict charset, and round-trips', () => {
  assert.equal(ACTIVITY_PAGE_KEYS.length, ACTIVITY_PAGE_NAMES.length);
  assert.equal(new Set(ACTIVITY_PAGE_KEYS).size, ACTIVITY_PAGE_KEYS.length, 'duplicate page key');
  for (const name of ACTIVITY_PAGE_NAMES) {
    const key = encodePageKey(name);
    assert.match(key, /^[a-z0-9-]+(~[a-z0-9-]+)*$/, `unsafe map key ${key}`);
    assert.ok(!key.includes('/') && !key.includes('.'), `${key} is not a safe Firestore map key`);
    assert.equal(decodePageKey(key), name, `round trip failed for ${name}`);
  }
  // The examples the owner named are on it.
  for (const n of ['notes/trigonometry', 'topic-hub/electricity', 'practice-hub', 'check-improve', 'pricing']) {
    assert.ok(ACTIVITY_PAGE_NAMES.includes(n), `${n} missing`);
  }
});

test('★★ F1 RAW PATH: a raw path, an unknown page, an id/token/email in a name, or a bad feed name refuses the WHOLE batch', async () => {
  for (const [nowMs] of INSTANTS) {
    const t = makeRoutes({ now: nowMs });
    const bad = [
      { sections: { notes: 1 }, pages: { '/notes/trigonometry': 1 } }, // a raw path
      { sections: { notes: 1 }, pages: { 'notes/trigonometry': 1 } }, // unencoded
      { sections: { notes: 1 }, pages: { 'notes~ohms-law': 1 } }, // not a chapter
      { sections: { notes: 1 }, pages: { 'notes~student@example.com': 1 } },
      { sections: { other: 1 }, pages: { 'u~3f9a0c1b2d4e5f60718293a4b5c6d7e8': 1 } }, // a QR token
      { sections: { 'me-progress': 1 }, pages: { 'me~Ab3dEf9GhIjKlMnOpQrStUvWxYz1': 1 } }, // a uid
      { sections: { practice: 1 }, pages: { 'practice~maths?topic=real-numbers': 1 } }, // a query string
      { sections: { notes: 1 }, pages: { 'notes.trigonometry': 1 } },
      { sections: { notes: 1 }, pages: { home: 1, 'secret-page': 1 } }, // one bad among good
      { sections: { notes: 1 }, feed: [{ t: nowMs, k: 'page', n: '/notes/trigonometry' }] },
      { sections: { notes: 1 }, feed: [{ t: nowMs, k: 'page', n: 'notes~trigonometry' }, { t: nowMs, k: 'event', n: 'what is ohms law?' }] },
      { sections: { notes: 1 }, feed: [{ t: nowMs, k: 'question', n: 'home' }] },
    ];
    for (const body of bad) {
      const r = await t.post({ token: 'tok-u1', body });
      assert.equal(r.status, 400, `accepted ${JSON.stringify(body)}`);
    }
    assert.equal(t.db.sets.length, 0, 'a raw or unknown page name was recorded');
    assert.equal(t.db.docs.size, 0);
  }
});

test('F1: EVERY allowlisted page key is accepted and stored as a pages count (the allowlist is not dead)', async () => {
  const t = makeRoutes();
  for (let i = 0; i < ACTIVITY_PAGE_KEYS.length; i += 50) {
    const chunk = ACTIVITY_PAGE_KEYS.slice(i, i + 50);
    const r = await t.post({ token: 'tok-u1', body: { sections: { home: 1 }, pages: Object.fromEntries(chunk.map((k) => [k, 1])) } });
    assert.equal(r.status, 200);
  }
  const doc = t.db.docs.get(dayPath('u1', '2030-06-15'));
  assert.deepEqual(Object.keys(doc.pages).sort(), [...ACTIVITY_PAGE_KEYS].sort());
});

test('★★ F1: nothing but {t,k,n} and allowlisted names is stored — extra fields on a feed entry and in the body never reach Firestore', async () => {
  for (const [nowMs, day] of INSTANTS) {
    const t = makeRoutes({ now: nowMs });
    const r = await t.post({
      token: 'tok-u1',
      body: {
        sections: { notes: 1 },
        events: { check_graded: 1 },
        pages: { 'notes~trigonometry': 1 },
        feed: [
          { t: nowMs - 2000, k: 'page', n: 'notes~trigonometry', path: '/notes/trigonometry?oobCode=SECRET', uid: 'victim' },
          { t: nowMs - 1000, k: 'event', n: 'check_graded', question: 'What is the SI unit of power?', answer: 'watt' },
        ],
        path: '/u/3f9a0c1b2d4e5f60',
        userAgent: 'Mozilla/5.0',
      },
    });
    assert.equal(r.status, 200);
    const doc = t.db.docs.get(dayPath('u1', day));
    assert.deepEqual(Object.keys(doc).sort(), ['events', 'expireAt', 'feed', 'firstSeenMs', 'lastSeenMs', 'pages', 'sections']);
    assert.deepEqual(doc.feed, [
      { t: nowMs - 2000, k: 'page', n: 'notes~trigonometry' },
      { t: nowMs - 1000, k: 'event', n: 'check_graded' },
    ]);
    for (const e of doc.feed) assert.deepEqual(Object.keys(e).sort(), ['k', 'n', 't']);
    const stored = JSON.stringify(doc);
    for (const leak of ['oobCode', 'SECRET', 'victim', 'SI unit', 'watt', '3f9a0c1b', 'Mozilla', '/notes', '?']) {
      assert.ok(!stored.includes(leak), `${leak} reached Firestore`);
    }
  }
});

test('★ F2: the feed keeps ORDER and DUPLICATES across batches (one transactional write per batch)', async () => {
  for (const [nowMs, day] of INSTANTS) {
    const t = makeRoutes({ now: nowMs });
    const a = [
      { t: nowMs - 3000, k: 'page', n: 'home' },
      { t: nowMs - 2000, k: 'page', n: 'notes~trigonometry' },
      { t: nowMs - 2000, k: 'page', n: 'notes~trigonometry' }, // an exact duplicate: kept
    ];
    await t.post({ token: 'tok-u1', body: { sections: { home: 1, notes: 2 }, pages: { home: 1, 'notes~trigonometry': 2 }, feed: a } });
    t.setNow(nowMs + 30_000);
    const b = [
      { t: nowMs + 10_000, k: 'page', n: 'check-improve' },
      { t: nowMs + 20_000, k: 'event', n: 'check_graded' },
    ];
    await t.post({ token: 'tok-u1', body: { sections: { 'check-improve': 1 }, events: { check_graded: 1 }, pages: { 'check-improve': 1 }, feed: b } });
    assert.equal(t.db.sets.length, 2, 'one write per batch');
    for (const s of t.db.sets) assert.deepEqual(s.options, { merge: true });
    const doc = t.db.docs.get(dayPath('u1', day));
    assert.deepEqual(doc.feed, [...a, ...b]);
    assert.deepEqual(doc.pages, { home: 1, 'notes~trigonometry': 2, 'check-improve': 1 });
    assert.equal(doc.feedTruncated, undefined, 'not truncated below the cap');
  }
});

test('★ F2: a feed time is clamped into the batch\'s server-day window — never trusted as is', async () => {
  for (const [nowMs, day] of INSTANTS) {
    const t = makeRoutes({ now: nowMs });
    const r = await t.post({
      token: 'tok-u1',
      body: {
        sections: { home: 3 },
        feed: [
          { t: 1, k: 'page', n: 'home' }, // far past -> the IST day's start
          { t: nowMs - 5, k: 'page', n: 'home' }, // inside -> kept
          { t: nowMs + 365 * 86_400_000, k: 'page', n: 'home' }, // far future -> server now
        ],
      },
    });
    assert.equal(r.status, 200);
    const doc = t.db.docs.get(dayPath('u1', day));
    assert.deepEqual(doc.feed.map((e) => e.t), [dayStartOf(day), nowMs - 5, nowMs]);
  }
});

test('★ F2: a malformed feed refuses the whole batch (non-array, too long, bad time)', async () => {
  const t = makeRoutes();
  assert.equal(MAX_FEED_PER_BATCH, 100);
  for (const feed of [
    'home',
    { 0: { t: MID_DAY, k: 'page', n: 'home' } },
    feedOf(MAX_FEED_PER_BATCH + 1, MID_DAY - 500, 'home'),
    [{ t: '1790000000000', k: 'page', n: 'home' }],
    [{ t: -5, k: 'page', n: 'home' }],
    [{ t: 1.5, k: 'page', n: 'home' }],
    [{ k: 'page', n: 'home' }],
    ['home'],
  ]) {
    const r = await t.post({ token: 'tok-u1', body: { sections: { home: 1 }, feed } });
    assert.equal(r.status, 400, `accepted feed ${JSON.stringify(feed).slice(0, 80)}`);
  }
  assert.equal(t.db.sets.length, 0);
  // A feed with nothing counted is an empty batch.
  assert.equal((await t.post({ token: 'tok-u1', body: { feed: [{ t: MID_DAY, k: 'page', n: 'home' }] } })).status, 400);
});

test('★★ F2 DAY CAP: the feed stops at 300 entries per student per day — SERVER-side — with feedTruncated: true, and counts stay exact', async () => {
  assert.equal(MAX_FEED_PER_DAY, 300);
  for (const [nowMs, day] of INSTANTS) {
    const t = makeRoutes({ now: nowMs });
    // Four batches of 90 = 360 entries offered; each batch counts 90 page views.
    for (let b = 0; b < 4; b += 1) {
      t.setNow(nowMs + b * 30_000);
      const r = await t.post({
        token: 'tok-u1',
        body: {
          sections: { notes: 45, practice: 45 },
          pages: { 'notes~trigonometry': 45, 'practice~maths': 45 },
          feed: feedOf(90, nowMs - 1000 + b, b % 2 ? 'practice~maths' : 'notes~trigonometry'),
        },
      });
      assert.equal(r.status, 200);
    }
    const doc = t.db.docs.get(dayPath('u1', day));
    assert.equal(doc.feed.length, MAX_FEED_PER_DAY, 'the day feed exceeded its cap');
    assert.equal(doc.feedTruncated, true);
    // The first 300 offered entries, in order: batches 0..2 whole, then 30 of batch 3.
    assert.deepEqual(doc.feed.slice(270).map((e) => e.n), Array(30).fill('practice~maths'));
    // Counts are EXACT beyond the cap.
    assert.deepEqual(doc.sections, { notes: 180, practice: 180 });
    assert.deepEqual(doc.pages, { 'notes~trigonometry': 180, 'practice~maths': 180 });
    // A further batch on a full day changes no entry and still counts.
    const before = JSON.stringify(doc.feed);
    await t.post({ token: 'tok-u1', body: { sections: { home: 1 }, pages: { home: 1 }, feed: feedOf(1, nowMs, 'home') } });
    const after = t.db.docs.get(dayPath('u1', day));
    assert.equal(JSON.stringify(after.feed), before);
    assert.equal(after.pages.home, 1);
    assert.equal(after.feedTruncated, true);
  }
});

test('F2: a client that dropped feed entries (feedTruncated: true) marks the day truncated; anything else in that field is ignored', async () => {
  const t = makeRoutes();
  await t.post({ token: 'tok-u1', body: { sections: { home: 1 }, feedTruncated: 'yes' } });
  assert.equal(t.db.docs.get(dayPath('u1', '2030-06-15')).feedTruncated, undefined);
  await t.post({ token: 'tok-u1', body: { sections: { home: 1 }, feed: feedOf(1, MID_DAY, 'home'), feedTruncated: true } });
  assert.equal(t.db.docs.get(dayPath('u1', '2030-06-15')).feedTruncated, true);
});

test('★★ OLD SHAPE: a day written by B-7 (no pages, no feed) merges correctly when a new batch arrives', async () => {
  for (const [nowMs, day] of INSTANTS) {
    const t = makeRoutes({ now: nowMs });
    const path0 = dayPath('u1', day);
    const oldExpire = { __timestamp: expireAtMsForDay(day), toMillis: () => expireAtMsForDay(day) };
    // Exactly what STUDENT-ACTIVITY-1 wrote: no pages, no feed, no feedTruncated.
    t.db.docs.set(path0, {
      firstSeenMs: nowMs - 60_000,
      lastSeenMs: nowMs - 30_000,
      sections: { home: 2, practice: 1 },
      events: { check_graded: 1 },
      expireAt: oldExpire,
    });
    const r = await t.post({
      token: 'tok-u1',
      body: {
        sections: { home: 1, notes: 1 },
        events: { check_graded: 1 },
        pages: { home: 1, 'notes~electricity': 1 },
        feed: [
          { t: nowMs - 2000, k: 'page', n: 'home' },
          { t: nowMs - 1000, k: 'page', n: 'notes~electricity' },
          { t: nowMs - 500, k: 'event', n: 'check_graded' },
        ],
      },
    });
    assert.equal(r.status, 200);
    const doc = t.db.docs.get(path0);
    assert.equal(doc.firstSeenMs, nowMs - 60_000, 'firstSeenMs of an old-shape day was overwritten');
    assert.equal(doc.lastSeenMs, nowMs);
    assert.deepEqual(doc.sections, { home: 3, practice: 1, notes: 1 });
    assert.deepEqual(doc.events, { check_graded: 2 });
    assert.deepEqual(doc.pages, { home: 1, 'notes~electricity': 1 });
    assert.deepEqual(doc.feed.map((e) => e.n), ['home', 'notes~electricity', 'check_graded']);
    // TTL unchanged: the same Timestamp value, IST day start + 90 days.
    assert.equal(doc.expireAt.toMillis(), expireAtMsForDay(day));
  }
});

test('F4: a B-7-shaped batch (sections/events only) still writes exactly the B-7 fields — no pages, no feed', async () => {
  const t = makeRoutes();
  await t.post({ token: 'tok-u1', body: { sections: { practice: 1 }, events: { check_graded: 1 } } });
  const doc = t.db.docs.get(dayPath('u1', '2030-06-15'));
  assert.deepEqual(Object.keys(doc).sort(), ['events', 'expireAt', 'firstSeenMs', 'lastSeenMs', 'sections']);
});

test('D10 still holds with the feed: an erasure racing a detail batch leaves no day document', async () => {
  const t = makeRoutes();
  const r = await t.post({
    token: 'tok-race',
    body: { sections: { notes: 1 }, pages: { 'notes~trigonometry': 1 }, feed: feedOf(1, MID_DAY, 'notes~trigonometry') },
  });
  assert.equal(r.status, 401);
  assert.deepEqual([...t.db.docs.keys()].filter((p) => p.startsWith('activityLog/racer')), []);
});

/* ── ERASURE + EXPORT, unchanged, cover the new fields (proof, not a change) ────
   The day document produced by THIS route (pages + feed) is handed to the REAL
   map-driven erasure and export services, loaded from the REAL studentDataMap.ts.
   Neither file is modified by ACTIVITY-DETAIL-1. */

function makeServiceFirestore(seed) {
  const docs = new Map(Object.entries(seed));
  const deleted = [];
  function docRef(p) {
    return {
      path: p,
      id: p.split('/').pop(),
      collection: (n) => collRef(`${p}/${n}`),
      async get() {
        return { exists: docs.has(p), id: p.split('/').pop(), ref: this, data: () => docs.get(p) };
      },
      async delete() {
        deleted.push(p);
        docs.delete(p);
      },
      async update(fields) {
        if (!docs.has(p)) throw new Error('NOT_FOUND');
        docs.set(p, { ...docs.get(p), ...fields });
      },
    };
  }
  function children(collPath) {
    const prefix = `${collPath}/`;
    const out = [];
    for (const p of docs.keys()) {
      if (!p.startsWith(prefix)) continue;
      const child = prefix + p.slice(prefix.length).split('/')[0];
      if (!out.includes(child)) out.push(child);
    }
    return out;
  }
  function snap(paths) {
    return { empty: paths.length === 0, size: paths.length, docs: paths.map((p) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => docs.get(p) })) };
  }
  function collRef(p) {
    return {
      path: p,
      doc: (id) => docRef(`${p}/${id}`),
      async listDocuments() {
        return children(p).map(docRef);
      },
      async get() {
        return snap(children(p).filter((c) => docs.has(c)));
      },
      where(field, op, value) {
        return { async get() { return snap(children(p).filter((c) => docs.has(c) && op === '==' && docs.get(c)[field] === value)); } };
      },
    };
  }
  return { db: { collection: collRef }, docs, deleted };
}

async function detailDayFromRoute() {
  const t = makeRoutes();
  const r = await t.post({
    token: 'tok-u1',
    body: {
      sections: { notes: 1 },
      events: { check_graded: 1 },
      pages: { 'notes~trigonometry': 1 },
      feed: [
        { t: MID_DAY - 2000, k: 'page', n: 'notes~trigonometry' },
        { t: MID_DAY - 1000, k: 'event', n: 'check_graded' },
      ],
    },
  });
  assert.equal(r.status, 200);
  const p = dayPath('u1', '2030-06-15');
  const doc = t.db.docs.get(p);
  assert.ok(Array.isArray(doc.feed) && doc.pages, 'CONTROL: the day really carries pages + feed');
  return { path: p, doc };
}

test('★★ ERASURE (unchanged) deletes a day carrying pages + feed', async () => {
  const { createAccountErasureService, STATUS } = require('../services/accountErasure.cjs');
  const { path: p, doc } = await detailDayFromRoute();
  const other = 'activityLog/u2/activityDays/2030-06-15';
  const store = makeServiceFirestore({ [p]: doc, [other]: { sections: { home: 1 }, pages: { home: 1 } } });
  const users = new Set(['u1', 'u2']);
  const admin = {
    auth: () => ({
      async deleteUser(uid) {
        if (!users.has(uid)) {
          const e = new Error('no user');
          e.code = 'auth/user-not-found';
          throw e;
        }
        users.delete(uid);
      },
    }),
    storage: () => ({ bucket: () => ({ async getFiles() { return [[]]; } }) }),
  };
  const service = createAccountErasureService({ firebaseAdmin: admin, adminFirestore: store.db, resolveBucketName: () => 'b' });
  const result = await service.eraseAccount('u1');
  const row = result.locations.find((l) => l.id === 'activityLog.activityDays');
  assert.equal(row.status, STATUS.DELETED);
  assert.ok(store.deleted.includes(p));
  assert.equal(store.docs.has(p), false, 'a day with pages + feed survived erasure');
  assert.equal(store.docs.has(other), true, "another student's day was erased");
});

test('★★ EXPORT (unchanged) includes a day carrying pages + feed, every field', async () => {
  const { createAccountExportService, EXPORT_STATUS } = require('../services/accountExport.cjs');
  const { path: p, doc } = await detailDayFromRoute();
  const store = makeServiceFirestore({ [p]: doc });
  const admin = {
    auth: () => ({ async getUser(uid) { return { uid }; } }),
    storage: () => ({ bucket: () => ({ async getFiles() { return [[]]; } }) }),
  };
  const service = createAccountExportService({ firebaseAdmin: admin, adminFirestore: store.db, resolveBucketName: () => 'b' });
  const result = await service.exportAccount('u1');
  const row = result.locations.find((l) => l.id === 'activityLog.activityDays');
  assert.equal(row.status, EXPORT_STATUS.EXPORTED);
  assert.equal(row.records.length, 1);
  const data = row.records[0].data;
  assert.deepEqual(data.pages, { 'notes~trigonometry': 1 });
  assert.deepEqual(data.feed, [
    { t: MID_DAY - 2000, k: 'page', n: 'notes~trigonometry' },
    { t: MID_DAY - 1000, k: 'event', n: 'check_graded' },
  ]);
  assert.deepEqual(data.sections, { notes: 1 });
  assert.equal(data.expireAt, new Date(expireAtMsForDay('2030-06-15')).toISOString());
});

test('the erasure/export services and the data map are NOT modified by this change (byte-pinned by git, asserted here by path)', () => {
  // The map entry that drives both is unchanged in path; the sweep template matches.
  const { loadStudentDataMap } = require('../services/accountErasure.cjs');
  const days = loadStudentDataMap().find((l) => l.id === 'activityLog.activityDays');
  assert.equal(days.path, ACTIVITY_DAYS_PATH_TEMPLATE);
  assert.equal(days.exportable, true);
});

/* ── mount + first-party ───────────────────────────────────────────────────── */

test('★ the route is mounted by ONE line in server/index.cjs, POST only, after the export route', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  const lines = src.split(/\r?\n/).filter((l) => l.includes('studentActivity.cjs'));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /req\.method === 'POST' && reqPath === '\/api\/activity'\) return require\('\.\/routes\/studentActivity\.cjs'\)\.handleStudentActivity\(req, res, \{ sendJson, firebaseAdmin, adminFirestore \}\)/);
  assert.ok(src.indexOf("handleStudentActivity") > src.indexOf('accountExportRoutes.handleExport(req, res)'));
});

test('★ FIRST-PARTY ONLY: the route module requires nothing but the IST day helper, and calls out to nobody', () => {
  const src = fs.readFileSync(path.join(__dirname, 'studentActivity.cjs'), 'utf8');
  const requires = [...src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  assert.deepEqual(requires, ['../services/rateLimiter.cjs']);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(code, /adminFirestore/, 'CONTROL: the comment strip left the code in place');
  assert.doesNotMatch(code, /fetch\(|https?:\/\/|googleapis|gtag|vercel/i);
});
