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
      return { __timestamp: ms, toMillis: () => ms };
    },
  };
  return { admin: { auth: () => auth, firestore }, verifyCalls, tsCalls, getUserCalls, erased };
}

function applyMerge(prev, data) {
  const out = { ...(prev || {}) };
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && '__increment' in v) {
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
  assert.equal(MAX_BODY_BYTES, 2048);
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
  assert.deepEqual(v, { ok: true, sections: { home: 2 }, events: { sign_up: 1 } });
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
