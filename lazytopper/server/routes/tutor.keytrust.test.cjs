/**
 * tutor.keytrust.test.cjs - TUTOR-KEY-TRUST-1. Run: node --test server/routes/tutor.keytrust.test.cjs
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTutorRoute } = require('./tutor.cjs');
const { extractKeyFlagTag, detectKeyMismatch } = require('../services/keyTrust.cjs');
const { buildTutorSystemPrompt } = require('../prompts/tutorSystemPrompt.cjs');
const { createAdminKeyDisputesRoutes } = require('./adminKeyDisputes.cjs');

// ---- a tiny Firestore fake: collections of docs, batch.create (fails if exists) + batch.set merge
function fakeFirestore() {
  const docs = new Map();
  const FieldValue = { increment: (n) => ({ __inc: n }) };
  const merge = (cur, patch) => {
    const out = { ...cur };
    for (const [k, v] of Object.entries(patch)) {
      if (v && v.__inc !== undefined) out[k] = (typeof out[k] === 'number' ? out[k] : 0) + v.__inc;
      else if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) out[k] = merge(out[k] || {}, v);
      else out[k] = v;
    }
    return out;
  };
  const ref = (path) => ({
    path,
    collection: (n) => coll(`${path}/${n}`),
  });
  const coll = (path) => ({
    doc: (id) => ref(`${path}/${id}`),
    limit: () => coll(path),
    orderBy: (f, dir) => ({ limit: (k) => ({ get: async () => snap([...docs.entries()].filter(([p]) => p.startsWith(`${path}/`) && p.split('/').length === path.split('/').length + 1).map(([p, v]) => [p, v]).sort((a, b) => (dir === 'desc' ? 1 : -1) * (a[1][f] - b[1][f])).slice(0, k)) }) }),
    get: async () => snap([...docs.entries()].filter(([p]) => p.startsWith(`${path}/`) && p.split('/').length === path.split('/').length + 1)),
  });
  const snap = (entries) => ({ forEach: (fn) => entries.forEach(([p, v]) => fn({ id: p.split('/').pop(), data: () => v })) });
  const fs = {
    docs, FieldValue,
    collection: (n) => coll(n),
    batch: () => {
      const ops = [];
      return {
        create: (r, v) => ops.push(() => { if (docs.has(r.path)) { const e = new Error('exists'); e.code = 6; throw e; } docs.set(r.path, v); }),
        set: (r, v, o) => ops.push(() => docs.set(r.path, o && o.merge ? merge(docs.get(r.path) || {}, v) : v)),
        commit: async () => { const snapshot = new Map(docs); try { ops.forEach((f) => f()); } catch (e) { docs.clear(); snapshot.forEach((v, k) => docs.set(k, v)); throw e; } },
      };
    },
  };
  // Doc .set for admin resolve
  const origColl = fs.collection;
  fs.collection = (n) => { const c = origColl(n); const d = c.doc; c.doc = (id) => { const r = d(id); r.set = async (v, o) => { docs.set(r.path, o && o.merge ? merge(docs.get(r.path) || {}, v) : v); }; return r; }; return c; };
  return fs;
}

const ANCHOR_OK = {
  id: 'CHEM-EXMPLR-1-MCQ-002', source: 'NCERT Exemplar Ex 1.1 Q2', questionText: 'Which is a redox reaction?',
  options: ['A. one', 'B. two', 'C. (i) and (iii)', 'D. four'], answer: '(i) and (iii)', answerLetter: 'C',
  solutionSteps: ['N is oxidised.', 'So the answer is (i) and (iii).'],
};
const ANCHOR_BAD = { ...ANCHOR_OK, id: 'X-MCQ-001', solutionSteps: ['Compare the options.', 'Hence the correct answer is B.'] };

function harness({ reply, uid = 'u1' } = {}) {
  const fs = fakeFirestore();
  const prompts = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (_m, contents) => { prompts.push(contents[0].parts[0].text); return { text: reply, finishReason: 'STOP' }; },
    GEMINI_TUTOR_MODEL: 'g', GEMINI_MODEL: 'g', ACTIVE_PROVIDER: 'gemini', isStubMode: () => false,
    resolveVerifiedUid: async () => uid, adminFirestore: fs, firebaseAdmin: { firestore: { FieldValue: fs.FieldValue } },
  });
  const ask = async (content, anchorQuestion, extra = {}) => {
    const res = {};
    await route.handleTutorRequest({ body: { subject: 'science', topicKey: 'chemical-reactions-and-equations', topicLabel: 'Chem', anchorQuestion, messages: [{ role: 'student', content }], ...extra } }, res);
    return res;
  };
  return { fs, ask, prompts };
}
const reports = (fs) => [...fs.docs.entries()].filter(([p]) => p.includes('/reports/'));

test('sentinel: stripped from the reply, even malformed; never returned', async () => {
  const h = harness({ reply: 'The key is C because N is oxidised.\n[[keyflag:opinion:model thinks (iii)]]' });
  const res = await h.ask('why?', ANCHOR_OK);
  assert.equal(res.body.reply, 'The key is C because N is oxidised.');
  assert.ok(!JSON.stringify(res.body).includes('keyflag'));
  const t = extractKeyFlagTag('Hello [[keyflag:mismatch:abc and no close');
  assert.equal(t.text, 'Hello');
  assert.deepEqual(extractKeyFlagTag('x\n[[keyflag:weird:zzz]]').keyFlag, null);
  assert.equal(extractKeyFlagTag('x [[KEYFLAG: mismatch : steps say B ]] y').keyFlag.reason, 'steps say B');
});

test('opinion flag writes ONE report per question/uid/day; second same-day flag adds nothing', async () => {
  const h = harness({ reply: 'Key is C.\n[[keyflag:opinion:differs]]' });
  await h.ask('why?', ANCHOR_OK);
  await h.ask('really?', ANCHOR_OK);
  const r = reports(h.fs);
  assert.equal(r.length, 1);
  assert.equal(r[0][1].kind, 'opinion');
  assert.equal(r[0][1].source, 'NCERT Exemplar Ex 1.1 Q2');
  assert.equal(r[0][1].uid, 'u1');
  assert.equal(h.fs.docs.get('keyDisputes/CHEM-EXMPLR-1-MCQ-002').counts.opinion, 1);
});

test('student challenge is recorded once a day even when the model emits no flag; reply untouched', async () => {
  const h = harness({ reply: 'The key is C.' });
  const res = await h.ask('I think the key is wrong, two are correct', ANCHOR_OK);
  await h.ask('no, the answer is wrong!', ANCHOR_OK);
  assert.equal(res.body.reply, 'The key is C.');
  const r = reports(h.fs);
  assert.equal(r.length, 1);
  assert.equal(r[0][1].kind, 'challenge');
  assert.match(r[0][1].studentChallenge, /key is wrong/);
});

test('a self-contradicting row (steps end at B, key C) carries mismatch evidence in the prompt and files a mismatch report', async () => {
  assert.match(detectKeyMismatch(ANCHOR_BAD).reason, /option B.*key is option C/);
  const h = harness({ reply: 'There is a mismatch in our key; the working supports B. Flagged for the team.' });
  await h.ask('which is right?', ANCHOR_BAD);
  assert.match(h.prompts[0], /ROW CHECK \(computed/);
  assert.match(h.prompts[0], /mismatch in our key/);
  const r = reports(h.fs);
  assert.equal(r.length, 1);
  assert.equal(r[0][1].kind, 'mismatch');
});

test('a self-consistent row (the ammonia case): explain-the-key rule, no ROW CHECK, no mismatch report', async () => {
  assert.equal(detectKeyMismatch(ANCHOR_OK), null);
  const h = harness({ reply: 'It is C.' });
  await h.ask('why not iii?', ANCHOR_OK);
  assert.doesNotMatch(h.prompts[0], /ROW CHECK \(computed/);
  assert.match(h.prompts[0], /the key stands: explain the bank answer/);
  assert.match(h.prompts[0], /Never tell the student the board or NCERT is wrong/);
  assert.match(h.prompts[0], /NCERT Exemplar Ex 1.1 Q2/);
  assert.equal(reports(h.fs).length, 0);
});

test('no verified uid (signed out): nothing is written', async () => {
  const h = harness({ reply: 'C.\n[[keyflag:opinion:x]]', uid: '' });
  await h.ask('the key is wrong', ANCHOR_OK);
  assert.equal(reports(h.fs).length, 0);
});

test('a key that names no option is mismatch evidence', () => {
  const r = detectKeyMismatch({ options: ['A. a', 'B. b'], answer: 'zzz' });
  assert.equal(r.kind, 'no-option');
});

test('item 0 server belt: a returnedWork about another question is dropped when an anchor is present; anchor still in the prompt', async () => {
  const h = harness({ reply: 'C.' });
  await h.ask('what is the right answer for this question', ANCHOR_OK, { returnedWork: { question: 'Assertion: zinc displaces copper', restored: true } });
  assert.doesNotMatch(h.prompts[0], /zinc displaces copper/);
  assert.match(h.prompts[0], /THE OFFICIAL ANSWER KEY \(CBSE\/NCERT\): option C/);
  const p = buildTutorSystemPrompt({ topicLabel: 'Chem', subject: 'science', anchorQuestion: ANCHOR_OK, returnedWork: { question: 'zinc q', restored: true } });
  assert.match(p, /AN EARLIER MARKED QUESTION/);
  assert.match(p, /THE QUESTION THE STUDENT OPENED THIS CHAT ABOUT/);
});

// ---- admin route
function adminHarness({ ok = true, fs = fakeFirestore() } = {}) {
  const route = createAdminKeyDisputesRoutes({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    adminFirestore: fs,
    requireAdmin: async () => (ok ? { ok: true, uid: 'admin1' } : { ok: false, status: 403, error: 'Forbidden' }),
  });
  return { route, fs };
}

test('admin route rejects a non-admin (403) on list and resolve, before touching Firestore', async () => {
  const { route, fs } = adminHarness({ ok: false });
  const a = {}; await route.list({}, a);
  const b = {}; await route.resolve({ body: { questionId: 'Q-1' } }, b);
  assert.equal(a.status, 403); assert.equal(b.status, 403);
  assert.equal(fs.docs.size, 0);
  const noGate = createAdminKeyDisputesRoutes({ sendJson: (r, s, b2) => { r.status = s; r.body = b2; }, adminFirestore: fs });
  const c = {}; await noGate.list({}, c);
  assert.equal(c.status, 503);
});

test('admin list: counts by kind, sorted mismatch first, resolve flips the flag', async () => {
  const h = harness({ reply: 'x\n[[keyflag:opinion:o]]' });
  await h.ask('the key is wrong', ANCHOR_OK); // opinion + challenge
  const h2 = { fs: h.fs };
  const bad = harness({ reply: 'mismatch' });
  // write a mismatch on another question into the SAME store
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; }, readJson: async (r) => r.body,
    callGemini: async () => ({ text: 'm', finishReason: 'STOP' }), GEMINI_TUTOR_MODEL: 'g', GEMINI_MODEL: 'g', ACTIVE_PROVIDER: 'g', isStubMode: () => false,
    resolveVerifiedUid: async () => 'u2', adminFirestore: h2.fs, firebaseAdmin: { firestore: { FieldValue: h2.fs.FieldValue } },
  });
  await route.handleTutorRequest({ body: { subject: 'science', topicKey: 't', anchorQuestion: ANCHOR_BAD, messages: [{ role: 'student', content: 'hi' }] } }, {});
  const { route: admin } = adminHarness({ fs: h2.fs });
  const res = {}; await admin.list({}, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.items[0].questionId, 'X-MCQ-001');
  assert.equal(res.body.items[0].counts.mismatch, 1);
  const ok = res.body.items.find((i) => i.questionId === 'CHEM-EXMPLR-1-MCQ-002');
  assert.deepEqual(ok.counts, { mismatch: 0, opinion: 1, challenge: 1 });
  assert.equal(ok.source, 'NCERT Exemplar Ex 1.1 Q2');
  const r = {}; await admin.resolve({ body: { questionId: 'X-MCQ-001' } }, r);
  assert.equal(r.status, 200);
  assert.equal(h2.fs.docs.get('keyDisputes/X-MCQ-001').resolved, true);
});
