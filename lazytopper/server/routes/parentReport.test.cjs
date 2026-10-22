// PARENT-REPORT-1 — a parent's read-only page for ONE result the student chose to share.
//
// Minors' data. Every test below is a reason a link is NOT made or NOT shown, or proof of what
// a parent can (and cannot) learn.
//
//   A* minting: auth, ownership (the VERIFIED uid's own record only), rate limit
//   T* the token: 256-bit, opaque, hashed at rest, in no stored field
//   E* expiry: 30 days, then 410 and the document is deleted
//   S* the snapshot: only the page's fields, numbers + enum keys, never answer text
//   P* privacy of the view: no uid / email / phone, first name letters only
//
// Run: node --test lazytopper/server/routes/parentReport.test.cjs

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const {
  createParentReportRoutes,
  firstNameOf,
  reportIdOf,
  PARENT_REPORT_LINK_PATH,
  PARENT_REPORT_VIEW_PATH,
  LINK_TTL_MS,
  MAX_LINKS_PER_UID_PER_DAY,
  TOKEN_PATTERN,
} = require('./parentReport.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');

const NOW = Date.parse('2026-10-22T12:00:00+05:30');
const ms = (v) => (v instanceof Date ? v.getTime() : v);

/* ── in-memory Firestore: nested docs, get / set / delete, top-level equality queries ── */
function memoryFirestore(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([k, v]) => [k, { ...v }]));
  const reads = [];
  function ref(key) {
    return {
      key,
      collection: (sub) => ({ doc: (id) => ref(`${key}/${sub}/${id}`) }),
      async get() {
        reads.push(key);
        const d = docs.get(key);
        return { exists: !!d, data: () => (d ? { ...d } : undefined) };
      },
      async set(data) { docs.set(key, { ...data }); },
      async delete() { docs.delete(key); },
    };
  }
  return {
    docs,
    reads,
    read: (key) => (docs.get(key) ? { ...docs.get(key) } : undefined),
    keys: (prefix) => [...docs.keys()].filter((k) => k.startsWith(prefix)),
    collection: (name) => ({
      doc: (id) => ref(`${name}/${id}`),
      where: (field, op, value) => ({
        async get() {
          const out = [];
          for (const [key, data] of docs) {
            const parts = key.split('/');
            if (parts.length === 2 && parts[0] === name && data[field] === value) out.push({ id: parts[1], ref: ref(key), data: () => ({ ...data }) });
          }
          return { docs: out, empty: out.length === 0, size: out.length };
        },
      }),
    }),
  };
}

const RESULT_ID = 'CI-M-QUAD-03';
const REF = `ci:${RESULT_ID}`;
const V2 = (o) => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...o });

function recordFor(over = {}) {
  return {
    id: RESULT_ID,
    worksheetId: REF,
    surface: 'check-improve',
    title: 'Quadratic Equations · Paper #3',
    subject: 'maths',
    topicKeys: ['quadratic-equations'],
    questionIds: [],
    marksAwarded: 6,
    marksTotal: 10,
    status: 'graded',
    fourType: { conceptual: 1, calculation: 1, silly: 0, presentation: 1 },
    marksLostByType: V2({ conceptual: 2, calculation: 1, presentation: 0.5, unattempted: 0.5 }),
    marksLostByTypeVersion: 1,
    sectionBreakdown: null,
    gradedAt: NOW - 60 * 60 * 1000,
    perQuestionRef: REF,
    dedupKey: `child1::${RESULT_ID}`,
    ...over,
  };
}
function payloadFor(results) {
  return {
    ref: REF,
    code: RESULT_ID,
    worksheetId: REF,
    surface: 'check-improve',
    gradedAt: NOW - 60 * 60 * 1000,
    response: { results },
  };
}
const WRITTEN_RESULTS = [
  { qNumber: 1, totalMarks: 3, marksAwarded: 1, mistakeSummary: { conceptual: 1 }, studentAnswer: 'x = 7 SECRET ANSWER', feedback: 'AI FEEDBACK TEXT', marksLostByType: V2({ conceptual: 2 }) },
  { qNumber: 2, totalMarks: 4, marksAwarded: 3, mistakeSummary: { calculation: 1 }, annotatedSteps: [{ status: 'incorrect', mistakeType: 'calculation', text: 'STEP TEXT' }] },
  { qNumber: 3, totalMarks: 3, marksAwarded: 2, mistakeSummary: { presentation: 1 } },
  { qNumber: 4, totalMarks: 1, marksAwarded: 1, objective: true },
  { qNumber: 5, totalMarks: 3, marksAwarded: 0, couldNotRead: true },
];

function seeded({ uid = 'child1', record = recordFor(), results = WRITTEN_RESULTS } = {}) {
  return {
    [`sessionRecords/${uid}/records/${RESULT_ID}`]: record,
    [`sessionRecords/${uid}/perQuestion/${REF}`]: payloadFor(results),
  };
}

async function startRoutes({ db = memoryFirestore(seeded()), clock, displayNames = { child1: 'Aarav Sharma', child2: 'Zoya Khan' } } = {}) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const telemetry = { increment: (e) => events.push(e) };
  const c = clock || { t: NOW };
  const verifiedCaller = {
    async resolveVerifiedUid(req) {
      const h = String(req.headers.authorization || '');
      return h.startsWith('Bearer uid:') ? h.slice('Bearer uid:'.length) : '';
    },
  };
  const routes = createParentReportRoutes({
    sendJson, verifiedCaller, adminFirestore: db, telemetry, now: () => c.t,
    getDisplayName: async (uid) => displayNames[uid] || '',
  });
  const table = { [PARENT_REPORT_LINK_PATH]: routes.handleMintLink, [PARENT_REPORT_VIEW_PATH]: routes.handleView };
  const server = http.createServer((req, res) => {
    const h = req.method === 'POST' ? table[String(req.url).split('?')[0]] : null;
    if (!h) return sendJson(res, 404, { error: 'Not Found' });
    return Promise.resolve(h(req, res)).catch((e) => sendJson(res, 500, { error: e.message }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, db, events, clock: c, close: () => new Promise((r) => server.close(r)) };
}

function request(port, urlPath, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body === undefined ? {} : body);
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
      (res) => {
        let text = '';
        res.on('data', (d) => { text += d; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}
const asUid = (uid) => ({ Authorization: `Bearer uid:${uid}` });
async function mint(srv, uid = 'child1', body = { resultId: RESULT_ID }) {
  return request(srv.port, PARENT_REPORT_LINK_PATH, { body, headers: asUid(uid) });
}
const view = (srv, token) => request(srv.port, PARENT_REPORT_VIEW_PATH, { body: { token } });

/* ══ A — minting ══════════════════════════════════════════════════════════════════ */

test('A · a signed-out caller cannot mint (401) and nothing is read or stored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const r = await request(srv.port, PARENT_REPORT_LINK_PATH, { body: { resultId: RESULT_ID } });
  assert.equal(r.status, 401);
  assert.equal(srv.db.keys('parentReports/').length, 0);
  assert.equal(srv.db.reads.length, 0);
});

test('A · ★★ ownership: another student cannot mint a link to this result — not found, nothing stored', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  // child2 asks for child1's result id, and also tries to name child1 in the body.
  const r = await mint(srv, 'child2', { resultId: RESULT_ID, uid: 'child1' });
  assert.equal(r.status, 404);
  assert.equal(srv.db.keys('parentReports/').length, 0);
  // It only ever looked under the VERIFIED uid.
  assert.ok(srv.db.reads.every((k) => !k.startsWith('sessionRecords/child1/')), srv.db.reads.join(','));
});

test('A · the owner mints a link to their own result; a missing or pending result is 404', async (t) => {
  const db = memoryFirestore({ ...seeded(), 'sessionRecords/child1/records/CI-M-PEND-01': recordFor({ id: 'CI-M-PEND-01', status: 'pending-upload' }) });
  const srv = await startRoutes({ db });
  t.after(srv.close);
  const ok = await mint(srv);
  assert.equal(ok.status, 200, ok.text);
  assert.match(ok.json.token, TOKEN_PATTERN);
  assert.equal(ok.json.kind, 'written');
  assert.ok(!('uid' in ok.json));
  assert.equal((await mint(srv, 'child1', { resultId: 'CI-M-NONE-09' })).status, 404);
  assert.equal((await mint(srv, 'child1', { resultId: 'CI-M-PEND-01' })).status, 404);
  assert.equal((await mint(srv, 'child1', { resultId: '../../users/x' })).status, 400);
  assert.equal(srv.db.keys('parentReports/').length, 1);
});

test('A · minting is rate-limited per verified uid per day', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  for (let i = 0; i < MAX_LINKS_PER_UID_PER_DAY; i += 1) assert.equal((await mint(srv)).status, 200);
  assert.equal((await mint(srv)).status, 429);
  assert.equal(srv.db.keys('parentReports/').length, MAX_LINKS_PER_UID_PER_DAY);
});

/* ══ T — the token ════════════════════════════════════════════════════════════════ */

test('T · ★★ the token is 256-bit and stored ONLY as its SHA-256 — in no key and no field', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { json } = await mint(srv);
  assert.equal(Buffer.from(json.token, 'base64url').length, 32);
  assert.deepEqual(srv.db.keys('parentReports/'), [`parentReports/${reportIdOf(json.token)}`]);
  assert.match(reportIdOf(json.token), /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify([...srv.db.docs]).includes(json.token), 'the raw token was stored');
  const decoded = Buffer.from(json.token, 'base64url').toString('latin1');
  assert.ok(!decoded.includes('child1') && !decoded.includes('Aarav'));
});

/* ══ S — the snapshot ═════════════════════════════════════════════════════════════ */

test('S · ★★ the snapshot holds ONLY the page fields (+ uid for erasure) — no answer, feedback or step text', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { json } = await mint(srv);
  const doc = srv.db.read(`parentReports/${reportIdOf(json.token)}`);
  assert.deepEqual(Object.keys(doc).sort(), [
    'awarded', 'chapters', 'createdAt', 'expiresAt', 'firstName', 'fourType', 'gradedAt', 'kind', 'marksLost', 'slips', 'subject', 'total', 'uid', 'v',
  ]);
  assert.equal(doc.uid, 'child1');
  assert.equal(doc.firstName, 'Aarav', 'first name only — never the surname');
  assert.equal(doc.subject, 'maths');
  assert.deepEqual(doc.chapters, ['quadratic-equations']);
  assert.equal(doc.awarded, 6);
  assert.equal(doc.total, 10);
  assert.deepEqual(doc.slips, [
    { q: 1, awarded: 1, available: 3, type: 'conceptual' },
    { q: 2, awarded: 3, available: 4, type: 'calculation' },
    { q: 3, awarded: 2, available: 3, type: 'presentation' },
  ]);
  const all = JSON.stringify(doc);
  for (const banned of ['SECRET ANSWER', 'AI FEEDBACK', 'STEP TEXT', 'Paper #3', 'dedupKey', RESULT_ID]) assert.ok(!all.includes(banned), banned);
});

test('S · tap-only result → kind "objective"; no per-question payload → no slips, never invented', async (t) => {
  const objective = [
    { qNumber: 1, totalMarks: 1, marksAwarded: 0, objective: true },
    { qNumber: 2, totalMarks: 1, marksAwarded: 1, objective: true },
  ];
  const db1 = memoryFirestore(seeded({ results: objective }));
  const s1 = await startRoutes({ db: db1 });
  t.after(s1.close);
  const a = await mint(s1);
  assert.equal(a.json.kind, 'objective');
  assert.deepEqual(db1.read(`parentReports/${reportIdOf(a.json.token)}`).slips, [{ q: 1, awarded: 0, available: 1, type: null }]);

  const db2 = memoryFirestore({ [`sessionRecords/child1/records/${RESULT_ID}`]: recordFor({ marksLostByType: undefined, marksLostByTypeVersion: undefined }) });
  const s2 = await startRoutes({ db: db2 });
  t.after(s2.close);
  const b = await mint(s2);
  const doc = db2.read(`parentReports/${reportIdOf(b.json.token)}`);
  assert.deepEqual(doc.slips, []);
  assert.equal(doc.marksLost, null, 'a count-only record is never given marks');
  assert.deepEqual(doc.fourType, { conceptual: 1, calculation: 1, silly: 0, presentation: 1 });
});

/* ══ P — what the parent sees ═════════════════════════════════════════════════════ */

test('P · ★★ view returns the page fields only — never the uid, an email or a phone', async (t) => {
  const srv = await startRoutes({ displayNames: { child1: 'Aarav Sharma' } });
  t.after(srv.close);
  const { json } = await mint(srv);
  const r = await view(srv, json.token);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), [
    'awarded', 'chapters', 'expiresAt', 'firstName', 'fourType', 'gradedAt', 'kind', 'marksLost', 'ok', 'slips', 'subject', 'total',
  ]);
  assert.ok(!r.text.includes('child1'));
  assert.ok(!r.text.includes('@'));
  assert.ok(!r.text.includes('Sharma'));
  assert.equal(r.json.firstName, 'Aarav');
});

test('P · first name: letters only, else empty', () => {
  assert.equal(firstNameOf('Aarav Sharma'), 'Aarav');
  assert.equal(firstNameOf('आरव शर्मा'), 'आरव');
  assert.equal(firstNameOf('aarav.s@gmail.com'), '');
  assert.equal(firstNameOf("D'Souza"), '');
  assert.equal(firstNameOf('Student123'), '');
  assert.equal(firstNameOf(''), '');
  assert.equal(firstNameOf('A'.repeat(25)), '');
});

test('P · a malformed, unknown or erased token is 404 and says nothing else', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  assert.equal((await view(srv, 'short')).status, 404);
  assert.equal((await view(srv, 'Z'.repeat(43))).status, 404);
  const { json } = await mint(srv);
  srv.db.docs.get(`parentReports/${reportIdOf(json.token)}`).uid = 'erased';
  const r = await view(srv, json.token);
  assert.equal(r.status, 404);
  assert.deepEqual(r.json, { ok: false, error: 'link_unavailable', reason: 'invalid' });
});

/* ══ E — expiry ═══════════════════════════════════════════════════════════════════ */

test('E · ★★ a link answers for 30 days, then 410 — and the expired snapshot is deleted', async (t) => {
  const srv = await startRoutes();
  t.after(srv.close);
  const { json } = await mint(srv);
  const key = `parentReports/${reportIdOf(json.token)}`;
  const doc = srv.db.read(key);
  assert.equal(LINK_TTL_MS, 30 * 24 * 60 * 60 * 1000);
  assert.equal(ms(doc.expiresAt) - ms(doc.createdAt), LINK_TTL_MS);
  srv.clock.t = NOW + LINK_TTL_MS - 1;
  assert.equal((await view(srv, json.token)).status, 200);
  srv.clock.t = NOW + LINK_TTL_MS;
  const r = await view(srv, json.token);
  assert.equal(r.status, 410);
  assert.equal(r.json.reason, 'expired');
  assert.equal(srv.db.read(key), undefined, 'the expired snapshot survived');
});
