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
const { resetMemo } = require('../services/keyDisputes.cjs');

// ---- a tiny Firestore fake: root collections of docs; doc().create (fails if exists), update, collection().orderBy/where
function fakeFirestore() {
  const docs = new Map();
  const docRef = (path) => ({
    path,
    create: async (v) => { if (docs.has(path)) { const e = new Error('exists'); e.code = 6; throw e; } docs.set(path, v); },
    update: async (v) => { docs.set(path, { ...docs.get(path), ...v }); },
  });
  const inColl = (name) => [...docs.entries()].filter(([p]) => p.startsWith(`${name}/`));
  const snapOf = (entries) => ({
    size: entries.length,
    docs: entries.map(([p, v]) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => v })),
    forEach(fn) { this.docs.forEach(fn); },
  });
  const coll = (name) => ({
    doc: (id) => docRef(`${name}/${id}`),
    orderBy: (f, dir) => ({ limit: (k) => ({ get: async () => snapOf(inColl(name).sort((a, b) => (dir === 'desc' ? -1 : 1) * (a[1][f] - b[1][f])).slice(0, k)) }) }),
    where: (f, _op, val) => ({ get: async () => snapOf(inColl(name).filter(([, v]) => v[f] === val)) }),
  });
  return { docs, collection: coll };
}

const ANCHOR_OK = {
  id: 'CHEM-EXMPLR-1-MCQ-002', source: 'NCERT Exemplar Ex 1.1 Q2', questionText: 'Which is a redox reaction?',
  options: ['A. one', 'B. two', 'C. (i) and (iii)', 'D. four'], answer: '(i) and (iii)', answerLetter: 'C',
  solutionSteps: ['N is oxidised.', 'So the answer is (i) and (iii).'],
};
const ANCHOR_BAD = { ...ANCHOR_OK, id: 'X-MCQ-001', solutionSteps: ['Compare the options.', 'Hence the correct answer is B.'] };

function harness({ reply, uid = 'u1' } = {}) {
  resetMemo();
  const fs = fakeFirestore();
  const prompts = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (_m, contents) => { prompts.push(contents[0].parts[0].text); prompts.last = contents.map((c) => c.parts[0].text).join('\n'); return { text: reply, finishReason: 'STOP' }; },
    GEMINI_TUTOR_MODEL: 'g', GEMINI_MODEL: 'g', ACTIVE_PROVIDER: 'gemini', isStubMode: () => false,
    resolveVerifiedUid: async () => uid, adminFirestore: fs,
  });
  const ask = async (content, anchorQuestion, extra = {}) => {
    const res = {};
    await route.handleTutorRequest({ body: { subject: 'science', topicKey: 'chemical-reactions-and-equations', topicLabel: 'Chem', anchorQuestion, messages: [{ role: 'student', content }], ...extra } }, res);
    await route.flushDisputeLogs();
    return res;
  };
  return { fs, ask, prompts, route };
}
const reports = (fs) => [...fs.docs.entries()].filter(([p]) => p.startsWith('keyDisputeReports/'));

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
  assert.equal(r[0][0], `keyDisputeReports/u1_${r[0][1].day}_opinion_CHEM-EXMPLR-1-MCQ-002`);
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

test('admin list: counts by kind, sorted mismatch first; resolve marks reports resolved and a new report re-opens it', async () => {
  const h = harness({ reply: 'x\n[[keyflag:opinion:o]]' });
  await h.ask('the key is wrong', ANCHOR_OK); // opinion + challenge
  const route2 = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; }, readJson: async (r) => r.body,
    callGemini: async () => ({ text: 'm', finishReason: 'STOP' }), GEMINI_TUTOR_MODEL: 'g', GEMINI_MODEL: 'g', ACTIVE_PROVIDER: 'g', isStubMode: () => false,
    resolveVerifiedUid: async () => 'u2', adminFirestore: h.fs,
  });
  await route2.handleTutorRequest({ body: { subject: 'science', topicKey: 't', anchorQuestion: ANCHOR_BAD, messages: [{ role: 'student', content: 'hi' }] } }, {});
  await route2.flushDisputeLogs();
  const { route: admin } = adminHarness({ fs: h.fs });
  const res = {}; await admin.list({}, res);
  assert.equal(res.status, 200);
  assert.equal(res.body.items[0].questionId, 'X-MCQ-001');
  assert.equal(res.body.items[0].counts.mismatch, 1);
  const ok = res.body.items.find((i) => i.questionId === 'CHEM-EXMPLR-1-MCQ-002');
  assert.deepEqual(ok.counts, { mismatch: 0, opinion: 1, challenge: 1 });
  assert.equal(ok.source, 'NCERT Exemplar Ex 1.1 Q2');
  const r = {}; await admin.resolve({ body: { questionId: 'X-MCQ-001' } }, r);
  assert.equal(r.status, 200);
  const res2 = {}; await admin.list({}, res2);
  assert.equal(res2.body.items.find((i) => i.questionId === 'X-MCQ-001').resolved, true);
});

test('review: no false mismatch on the four real rows the first cut mis-read', () => {
  const row = (steps, letter) => ({ options: ['A. a', 'B. b', 'C. c', 'D. d'], answer: 'x', answerLetter: letter, solutionSteps: steps });
  assert.equal(detectKeyMismatch(row(['Correct answer: C\u2099H\u2082\u2099\u208A\u2082'], 'A')), null); // CARB-E03
  assert.equal(detectKeyMismatch(row(['Correct answer: C\u2082H\u2084'], 'B')), null); // CARB-E09
  assert.equal(detectKeyMismatch(row(['Answer: A is false, R is true.'], 'D')), null); // PL2-R20
  assert.equal(detectKeyMismatch(row(['Answer: A is false, R is true.'], 'D')), null); // 2026-TRI-P1-A-011
  assert.ok(detectKeyMismatch(row(['Hence the correct answer is B.'], 'C')));
});

test('review: canFlag - the prompt claims "flagged" only when the server will really log', async () => {
  const signedIn = harness({ reply: 'ok' });
  await signedIn.ask('which?', ANCHOR_BAD);
  assert.match(signedIn.prompts[0], /Say it has been flagged for the LazyTopper team/);
  const anon = harness({ reply: 'ok', uid: '' });
  await anon.ask('which?', ANCHOR_BAD);
  assert.doesNotMatch(anon.prompts[0], /has been flagged/);
  assert.match(anon.prompts[0], /never claim it was flagged or reported/);
  assert.doesNotMatch(anon.prompts[0], /\[\[keyflag:/);
});

test('review: logging is fire-and-forget (the reply does not wait) and repeats short-circuit in memory', async () => {
  const h = harness({ reply: 'C.\n[[keyflag:opinion:x]]' });
  let release;
  const gate = new Promise((r) => { release = r; });
  const origColl = h.fs.collection;
  h.fs.collection = (n) => { const c = origColl(n); const d = c.doc; c.doc = (id) => { const ref = d(id); const cr = ref.create; ref.create = async (v) => { await gate; return cr(v); }; return ref; }; return c; };
  const res = {};
  await h.route.handleTutorRequest({ body: { subject: 'science', topicKey: 't', anchorQuestion: ANCHOR_OK, messages: [{ role: 'student', content: 'why' }] } }, res);
  assert.equal(res.status, 200); // replied while the write is still pending
  assert.equal(reports(h.fs).length, 0);
  release();
  await h.route.flushDisputeLogs();
  assert.equal(reports(h.fs).length, 1);
  let creates = 0;
  const c2 = h.fs.collection;
  h.fs.collection = (n) => { const c = c2(n); const d = c.doc; c.doc = (id) => { const ref = d(id); const cr = ref.create; ref.create = async (v) => { creates += 1; return cr(v); }; return ref; }; return c; };
  await h.ask('again', ANCHOR_OK);
  assert.equal(creates, 0, 'a repeat the same day must not even reach Firestore');
});

test('review: a per-uid daily cap bounds the reports', async () => {
  const h = harness({ reply: 'C.\n[[keyflag:opinion:x]]' });
  for (let i = 0; i < 15; i += 1) await h.ask('why', { ...ANCHOR_OK, id: `Q-${i}` });
  assert.equal(reports(h.fs).length, 10);
});

test('review: "what is my mistake" / "where did I go wrong" are NOT challenges; "the key is wrong" / "should be (b)" are', async () => {
  const { studentDisputesKey } = require('./tutor.cjs');
  for (const t of ["what's my mistake?", 'where did I go wrong', 'why is my answer incorrect', 'I made a silly mistake']) assert.equal(studentDisputesKey(t), false, t);
  for (const t of ['the answer is wrong', 'key is wrong', 'there are two correct options', 'both are correct', 'option B is also correct', 'it should be (b)']) assert.equal(studentDisputesKey(t), true, t);
});

// TUTOR-CHALLENGE-1
test('TUTOR-CHALLENGE-1: real-world challenge shapes are detected', () => {
  const { studentDisputesKey } = require('./tutor.cjs');
  const POS = ['(iii)', 'only (iii)', "it's (i) and (ii)", 'option 3', 'answer is B', "isn't it c?", "shouldn't it be (ii)",
    "I think it's (b)", 'I think the answer is only iii', 'my friend says only (iii)', 'my friend says it\'s (b)',
    'my teacher says the answer is wrong', 'sir said option c', "NCERT says (ii)", 'the book says it is (iv)',
    'answer galat hai', 'key galat hai', 'ye galat hai', 'sahi answer (b) hai', 'answer (iii) hona chahiye',
    'उत्तर गलत है', 'answer गलत है', 'key गलत लग रही है', 'pretty sure it is only (ii) and (iii)'];
  for (const t of POS) assert.equal(studentDisputesKey(t), true, t);
  const NEG = ['my answer was (b), why is it wrong', 'I chose (iii) but got it wrong', 'why is (b) wrong',
    'explain why option c is incorrect', 'is option b correct?', "what's the answer", 'I got it wrong',
    'mera answer galat kyun hai', 'teacher said I should practise more', 'my friend says this chapter is hard',
    "what's my mistake?", 'where did I go wrong', 'why is my answer incorrect', 'I made a silly mistake',
    'my answer is (b), is it right?', 'I think I got it wrong', 'it is 3 marks right?', 'is it (b)?', 'mera answer galat hai',
    'मेरा उत्तर गलत क्यों है', 'the answer is a bit confusing'];
  for (const t of NEG) assert.equal(studentDisputesKey(t), false, t);
});

test('TUTOR-CHALLENGE-1: PREV_OFFERED_CHECK_RE boundary (server mirror)', () => {
  const { detectOfferIntent } = require('./tutor.cjs');
  assert.equal(detectOfferIntent('yes', { prevTutor: 'Want to open the answercheckerx?' }), null);
  assert.equal(detectOfferIntent('yes', { prevTutor: 'Open the Answer Checker?' })?.offer, 'check-improve');
});

// TUTOR-CHALLENGE-1 review round 1
test('TUTOR-CHALLENGE-1 r1: Hinglish/third-party/both shapes are detected; learning-ask claims are not disputes', () => {
  const { studentDisputesKey } = require('./tutor.cjs');
  for (const t of ['teacher ne bola (ii) hai', 'book mein answer (b) hai', 'tum galat ho, answer b hai', 'nahi answer c hai',
    'both b and c are correct', 'both (i) and (iii) are right', 'ans is b but i think the key is wrong', 'the answer is c, why is the key wrong']) {
    assert.equal(studentDisputesKey(t), true, t);
  }
  for (const t of ["it's b because of valency", 'answer is c, how?', 'the answer is c, explain why', 'ans is b but i dont understand',
    'answer is c, samjhao', 'answer is b, samajh nahi aaya', 'mera answer b hai']) {
    assert.equal(studentDisputesKey(t), false, t);
  }
});

test('TUTOR-CHALLENGE-1 r1: the "key is final" note is skipped when the row has mismatch evidence', async () => {
  const ok = harness({ reply: 'It is C.' });
  await ok.ask('the answer is wrong', ANCHOR_OK);
  assert.match(ok.prompts.last, /The key is final/);
  const bad = harness({ reply: 'Mismatch.' });
  await bad.ask('the answer is wrong', ANCHOR_BAD);
  assert.doesNotMatch(bad.prompts.last, /The key is final/);
  assert.match(bad.prompts[0], /ROW CHECK/);
});
