/**
 * freeResources.test.cjs - FREE-RES-1. The free-resources routes, driven with a fake bucket and a fake verifier.
 * Run: node --test lazytopper/server/routes/freeResources.test.cjs   (wired as test:server:free-resources)
 * The clock is INJECTED (deps.now), so this passes at any LT_TEST_CLOCK.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createFreeResourceRoutes, parseCurrent } = require('./freeResources.cjs');

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_Z = 'c'.repeat(64);
const T0 = Date.parse('2030-06-15T06:30:00.000Z');

const current = {
  version: 1,
  resources: [
    { id: 'mcq-maths-real-numbers', kind: 'mcq_bank', subject: 'Maths', chapter: 'Real Numbers', title: 'Real Numbers · MCQ Practice Bank', path: `free/files/${SHA_A}.pdf`, filename: 'LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf', bytes: 1000, sha256: SHA_A, pages: 12, questions: 40 },
    { id: 'mcq-science-light', kind: 'mcq_bank', subject: 'Science', chapter: 'Light', title: 'Light · MCQ Practice Bank', path: `free/files/${SHA_B}.pdf`, filename: 'LazyTopper-Free-MCQ-Bank-Science-Light.pdf', bytes: 2000, sha256: SHA_B, pages: 9, questions: null },
  ],
  zips: [{ id: 'zip-maths', group: 'maths', path: `free/zips/${SHA_Z}/maths.zip`, bytes: 1500, count: 1, filename: 'LazyTopper-Maths-Free-Resources.zip' }],
};

function makeBucket(files, signed) {
  return {
    file(p) {
      return {
        async exists() {
          return [Object.prototype.hasOwnProperty.call(files, p)];
        },
        async download() {
          return [Buffer.from(files[p])];
        },
        async getSignedUrl(opts) {
          signed.push({ path: p, opts });
          return [`https://storage.googleapis.com/fake/${encodeURIComponent(p)}?X-Goog-Signature=sig`];
        },
      };
    },
  };
}

function makeReq(body, token = 'tok-u1') {
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}
const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.body = body;
};

function world({ files = { 'free/current.json': JSON.stringify(current) }, clock = { t: T0 } } = {}) {
  const signed = [];
  const counters = {};
  const verifiedCaller = {
    async resolveVerifiedUid(req) {
      const h = String(req.headers.authorization || '');
      return h === 'Bearer tok-u1' ? 'u1' : h === 'Bearer tok-u2' ? 'u2' : '';
    },
  };
  const routes = createFreeResourceRoutes({
    sendJson,
    verifiedCaller,
    bucket: makeBucket(files, signed),
    telemetry: { increment: (k, n) => (counters[k] = (counters[k] || 0) + n) },
    now: () => clock.t,
  });
  return { routes, signed, counters, clock };
}
const call = async (fn, req) => {
  const res = {};
  await fn(req, res);
  return res;
};

test('GET list: the resources and zips, and no storage path anywhere', async () => {
  const w = world();
  const res = await call(w.routes.handleList, makeReq(undefined, null));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.resources.length, 2);
  assert.equal(res.body.zips.length, 1);
  assert.deepEqual(Object.keys(res.body.resources[0]).sort(), ['bytes', 'chapter', 'id', 'kind', 'pages', 'questions', 'subject', 'title']);
  assert.deepEqual(Object.keys(res.body.zips[0]).sort(), ['bytes', 'count', 'group', 'id']);
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes('free/'), 'a storage path leaked into the public list');
  assert.ok(!text.includes(SHA_A), 'a content hash leaked into the public list');
  assert.ok(!text.includes('filename'));
});

test('GET list: manifest absent -> an honest empty list (and no error)', async () => {
  const w = world({ files: {} });
  const res = await call(w.routes.handleList, makeReq(undefined, null));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, resources: [], zips: [] });
});

test('GET list: an unreadable or wrong-shaped manifest is also the empty list', async () => {
  for (const bad of ['not json', JSON.stringify({ version: 2, resources: [] }), JSON.stringify([1, 2])]) {
    const w = world({ files: { 'free/current.json': bad } });
    const res = await call(w.routes.handleList, makeReq(undefined, null));
    assert.deepEqual(res.body, { ok: true, resources: [], zips: [] }, bad);
  }
});

test('GET list: the manifest is cached for 10 minutes, then re-read', async () => {
  const files = { 'free/current.json': JSON.stringify(current) };
  const w = world({ files });
  assert.equal((await call(w.routes.handleList, makeReq(undefined, null))).body.resources.length, 2);
  files['free/current.json'] = JSON.stringify({ ...current, resources: [current.resources[0]] });
  w.clock.t += 9 * 60 * 1000;
  assert.equal((await call(w.routes.handleList, makeReq(undefined, null))).body.resources.length, 2, 'still cached at 9 min');
  w.clock.t += 2 * 60 * 1000;
  assert.equal((await call(w.routes.handleList, makeReq(undefined, null))).body.resources.length, 1, 're-read after 10 min');
});

test('parseCurrent drops an entry whose path is not exactly a free/ object (a hand-edited manifest cannot make the server sign another file)', () => {
  const evil = { ...current, resources: [{ ...current.resources[0], path: 'packs/current.json' }, { ...current.resources[1], path: `free/files/../../packs/x.pdf` }, current.resources[1]] };
  const out = parseCurrent(evil);
  assert.equal(out.resources.length, 1);
  assert.equal(out.resources[0].id, 'mcq-science-light');
  assert.equal(parseCurrent({ ...current, zips: [{ ...current.zips[0], path: `free/zips/${SHA_Z}/other.zip` }] }).zips.length, 0);
  assert.equal(parseCurrent({ ...current, resources: [current.resources[0], current.resources[0]] }).resources.length, 1, 'duplicate id');
  assert.equal(parseCurrent({ ...current, resources: [{ ...current.resources[0], kind: 'answer_key' }] }).resources.length, 0, 'unknown kind');
});

test('POST link: no token -> 401, and nothing is signed', async () => {
  const w = world();
  const res = await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }, null));
  assert.equal(res.statusCode, 401);
  assert.equal(w.signed.length, 0);
  assert.equal(w.counters['free.link.unauth'], 1);
});

test('POST link: a bad token -> 401', async () => {
  const w = world();
  const res = await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }, 'nope'));
  assert.equal(res.statusCode, 401);
  assert.equal(w.signed.length, 0);
});

test('POST link: unknown id -> 404 (and counted)', async () => {
  const w = world();
  const res = await call(w.routes.handleLink, makeReq({ id: 'does-not-exist' }));
  assert.equal(res.statusCode, 404);
  assert.equal(w.signed.length, 0);
  assert.equal(w.counters['free.link.unknown'], 1);
});

test('POST link: a path or storage name as the id is just an unknown id', async () => {
  const w = world();
  for (const id of [`free/files/${SHA_A}.pdf`, '../packs/current.json', SHA_A]) {
    const res = await call(w.routes.handleLink, makeReq({ id }));
    assert.equal(res.statusCode, 404, id);
  }
  assert.equal(w.signed.length, 0);
});

test('POST link: malformed bodies -> 400', async () => {
  const w = world();
  assert.equal((await call(w.routes.handleLink, makeReq('{nope'))).statusCode, 400);
  assert.equal((await call(w.routes.handleLink, makeReq({ id: 7 }))).statusCode, 400);
  assert.equal((await call(w.routes.handleLink, makeReq({}))).statusCode, 400);
  assert.equal(w.signed.length, 0);
});

test('POST link: a file -> a 15-minute v4 signed URL served as an attachment with a LazyTopper filename', async () => {
  const w = world();
  const res = await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.match(res.body.url, /^https:\/\//);
  assert.equal(res.body.filename, 'LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf');
  assert.equal(res.body.expiresAtMs, T0 + 15 * 60 * 1000);
  assert.equal(w.signed.length, 1);
  assert.equal(w.signed[0].path, `free/files/${SHA_A}.pdf`);
  const o = w.signed[0].opts;
  assert.equal(o.version, 'v4');
  assert.equal(o.action, 'read');
  assert.equal(o.expires, T0 + 15 * 60 * 1000);
  assert.equal(o.responseDisposition, 'attachment; filename="LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf"');
  assert.equal(o.responseType, 'application/pdf');
  assert.equal(w.counters['free.link.ok'], 1);
  // the response carries the signed URL but never the raw storage path as a field of its own
  assert.ok(!Object.keys(res.body).includes('path'));
});

test('POST link: a zip -> a signed zip URL, counted as free.zip.ok', async () => {
  const w = world();
  const res = await call(w.routes.handleLink, makeReq({ id: 'zip-maths' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.kind, 'zip');
  assert.equal(w.signed[0].path, `free/zips/${SHA_Z}/maths.zip`);
  assert.equal(w.signed[0].opts.responseType, 'application/zip');
  assert.equal(w.signed[0].opts.responseDisposition, 'attachment; filename="LazyTopper-Maths-Free-Resources.zip"');
  assert.equal(w.counters['free.zip.ok'], 1);
  assert.equal(w.counters['free.link.ok'], undefined);
});

test('POST link: manifest absent -> every id is unknown (404), nothing signed', async () => {
  const w = world({ files: {} });
  const res = await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }));
  assert.equal(res.statusCode, 404);
  assert.equal(w.signed.length, 0);
});

test('POST link: 60 file links an hour per uid, 6 zip links an hour per uid, per user, and the window slides', async () => {
  const w = world();
  for (let i = 0; i < 60; i += 1) assert.equal((await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }))).statusCode, 200, `link ${i + 1}`);
  assert.equal((await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }))).statusCode, 429);
  assert.equal((await call(w.routes.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }, 'tok-u2'))).statusCode, 200, 'another uid is unaffected');
  for (let i = 0; i < 6; i += 1) assert.equal((await call(w.routes.handleLink, makeReq({ id: 'zip-maths' }))).statusCode, 200, `zip ${i + 1}`);
  assert.equal((await call(w.routes.handleLink, makeReq({ id: 'zip-maths' }))).statusCode, 429);
  w.clock.t += 61 * 60 * 1000;
  assert.equal((await call(w.routes.handleLink, makeReq({ id: 'zip-maths' }))).statusCode, 200, 'a new hour');
});

test('POST link: a signing failure is a 500 that says nothing about the bucket', async () => {
  const w = world();
  const bad = createFreeResourceRoutes({
    sendJson,
    verifiedCaller: { resolveVerifiedUid: async () => 'u1' },
    bucket: { file: (p) => ({ exists: async () => [true], download: async () => [Buffer.from(JSON.stringify(current))], getSignedUrl: async () => { throw new Error('boom: secret detail'); } }) },
    telemetry: null,
    now: () => T0,
  });
  const res = await call(bad.handleLink, makeReq({ id: 'mcq-maths-real-numbers' }));
  assert.equal(res.statusCode, 500);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
  void w;
});

const withKit = {
  ...current,
  resources: [
    ...current.resources,
    { id: 'kit-boards-2027', kind: 'kit', subject: 'All', chapter: 'Boards 2027 Excellence Kit', title: 'Boards 2027 Excellence Kit', path: `free/files/${'d'.repeat(64)}.pdf`, filename: 'LazyTopper-Boards-2027-Excellence-Kit.pdf', bytes: 3000, sha256: 'd'.repeat(64), pages: 30, questions: null },
  ],
};

test('kit: listed publicly (no path); a kit with subject All is only valid as a kit', async () => {
  const w = world({ files: { 'free/current.json': JSON.stringify(withKit) } });
  const res = await call(w.routes.handleList, makeReq(undefined, null));
  const kit = res.body.resources.find((r) => r.kind === 'kit');
  assert.ok(kit);
  assert.ok(!JSON.stringify(res.body).includes('free/'));
  assert.equal(parseCurrent({ ...current, resources: [{ ...current.resources[0], subject: 'All' }] }).resources.length, 0);
});

test('kit: the link is 401 when signed out (nothing signed), and a normal signed link when signed in', async () => {
  const w = world({ files: { 'free/current.json': JSON.stringify(withKit) } });
  const out = await call(w.routes.handleLink, makeReq({ id: 'kit-boards-2027' }, null));
  assert.equal(out.statusCode, 401);
  assert.equal(w.signed.length, 0);
  const inn = await call(w.routes.handleLink, makeReq({ id: 'kit-boards-2027' }));
  assert.equal(inn.statusCode, 200);
  assert.equal(inn.body.filename, 'LazyTopper-Boards-2027-Excellence-Kit.pdf');
  assert.equal(w.signed[0].opts.responseType, 'application/pdf');
});
