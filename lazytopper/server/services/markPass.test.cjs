'use strict';
// MARK-ON-PHOTO-1 (owner ruling 25 Nov 2026): a mark on the photo re-uses the Answer Checker paper's own slot id,
// only with a server-signed pass for that uid, paper, slot and question (number AND text), and only for a body that
// is exactly that one mark.
const test = require('node:test');
const assert = require('node:assert/strict');
const mp = require('./markPass.cjs');

const env = { FAIR_USE_PAPER_SECRET: 'test-secret' };
const NOW = Date.UTC(2026, 10, 25, 15, 0, 0);
const QS = [{ qNumber: 6, questionText: 'Given 15 cot A = 8, find sin A.' }, { qNumber: 8, questionText: 'Given sin A = 3/5, find cos A.' }];
const issue = (o = {}) => mp.issueMarkPass({ env, uid: 'stu-1', worksheetId: 'ci:CI-M-TRIG-03', slot: 'slot-abc', questions: QS, nowMs: NOW, ...o });

test('issued only for a whole Answer Checker paper, with a uid, the secret, the paper slot and unread questions', () => {
  assert.ok(issue());
  assert.equal(issue({ env: {} }), null, 'no secret: no pass, today exactly');
  assert.equal(issue({ uid: '' }), null);
  assert.equal(issue({ slot: null }), null, 'the paper reserved no slot: no pass');
  assert.equal(issue({ questions: [] }), null, 'nothing unread');
  assert.equal(issue({ worksheetId: 'ci:CI-M-TRIG-03:mark:2' }), null, 'a mark never mints another pass');
  assert.equal(issue({ worksheetId: 'ws-123' }), null, 'another surface');
});

test('verifies for the same uid inside 24 h; refuses another uid, an old pass, a forged or widened one', () => {
  const t = issue();
  const v = mp.verifyMarkPass(t, { env, uid: 'stu-1', nowMs: NOW + 1000 });
  assert.deepEqual([v.paperKey, v.slot, v.items.map((i) => i[0])], ['ci:CI-M-TRIG-03', 'slot-abc', [6, 8]]);
  assert.equal(mp.verifyMarkPass(t, { env, uid: 'stu-2', nowMs: NOW }), null);
  assert.equal(mp.verifyMarkPass(t, { env, uid: 'stu-1', nowMs: NOW + mp.MARK_PASS_TTL_MS + 1 }), null);
  assert.equal(mp.verifyMarkPass(t, { env: { FAIR_USE_PAPER_SECRET: 'other' }, uid: 'stu-1', nowMs: NOW }), null);
  const [ver, at, , sig] = t.split('.');
  const widened = Buffer.from(JSON.stringify({ k: 'ci:CI-M-TRIG-03', s: 'slot-abc', q: [[1, mp.textHash('anything')], ...v.items] })).toString('base64url');
  assert.equal(mp.verifyMarkPass([ver, at, widened, sig].join('.'), { env, uid: 'stu-1', nowMs: NOW }), null, 'questions cannot be added');
  const otherSlot = Buffer.from(JSON.stringify({ k: 'ci:CI-M-TRIG-03', s: 'someone-elses-slot', q: v.items })).toString('base64url');
  assert.equal(mp.verifyMarkPass([ver, at, otherSlot, sig].join('.'), { env, uid: 'stu-1', nowMs: NOW }), null, 'the slot cannot be swapped');
  assert.equal(mp.verifyMarkPass([ver, String(NOW + 5000), t.split('.')[2], sig].join('.'), { env, uid: 'stu-1', nowMs: NOW + 6000 }), null, 'time cannot be moved');
  assert.equal(mp.verifyMarkPass('junk', { env, uid: 'stu-1', nowMs: NOW }), null);
});

test('the route refuses any body the pass does not allow — including a DIFFERENT question under an allowed number', () => {
  const req = { headers: { [mp.MARK_PASS_HEADER]: issue() } };
  const pass = mp.verifiedMarkPassOf(req, 'stu-1', env, NOW);
  assert.ok(pass);
  assert.equal(mp.acceptedMarkPassOf(req), pass);
  assert.equal(mp.acceptedMarkPassOf({ headers: {} }), null);
  const ok = { worksheetId: 'ci:CI-M-TRIG-03:mark:1', questions: [{ qNumber: 6, questionText: '  Given 15 cot A = 8, find sin A. ' }], uploads: [{ qNumber: 6 }], imageBase64: '' };
  assert.equal(mp.markBodyMismatch(pass, ok), null);
  assert.equal(mp.markBodyMismatch(pass, { ...ok, questions: [{ qNumber: 6, questionText: 'Prove that √2 is irrational.' }] }), 'number', 'any other question is refused');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, worksheetId: 'ci:CI-M-OTHER-01:mark:1' }), 'paper');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, worksheetId: 'ci:CI-M-TRIG-03' }), 'paper', 'a whole paper never rides');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, imageBase64: 'JVBER' }), 'document');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, questions: [QS[0], QS[1]] }), 'questions');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, uploads: [] }), 'uploads');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, questions: [{ qNumber: 7, questionText: QS[0].questionText }], uploads: [{ qNumber: 7 }] }), 'number');
});
