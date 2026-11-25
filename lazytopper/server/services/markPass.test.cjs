'use strict';
// MARK-ON-PHOTO-1 (owner ruling 25 Nov 2026): a mark on the photo rides the Answer Checker paper's slot, only with
// a server-signed pass for that uid, paper and question, and only for a body that is exactly that one mark.
const test = require('node:test');
const assert = require('node:assert/strict');
const mp = require('./markPass.cjs');

const env = { FAIR_USE_PAPER_SECRET: 'test-secret' };
const NOW = Date.UTC(2026, 10, 25, 15, 0, 0);
const issue = (o = {}) => mp.issueMarkPass({ env, uid: 'stu-1', worksheetId: 'ci:CI-M-TRIG-03', numbers: [6, 8], nowMs: NOW, ...o });

test('issued only for a whole Answer Checker paper with unmarked questions, a uid and the secret', () => {
  assert.ok(issue());
  assert.equal(issue({ env: {} }), null, 'no secret: no pass, today exactly');
  assert.equal(issue({ uid: '' }), null);
  assert.equal(issue({ numbers: [] }), null, 'nothing unmarked');
  assert.equal(issue({ worksheetId: 'ci:CI-M-TRIG-03:mark:2' }), null, 'a mark never mints another pass');
  assert.equal(issue({ worksheetId: 'ws-123' }), null, 'another surface');
});

test('verifies for the same uid inside 24 h; refuses another uid, an old pass, a forged one', () => {
  const t = issue();
  assert.deepEqual(mp.verifyMarkPass(t, { env, uid: 'stu-1', nowMs: NOW + 1000 }), { paperKey: 'ci:CI-M-TRIG-03', numbers: [6, 8], issuedAt: NOW });
  assert.equal(mp.verifyMarkPass(t, { env, uid: 'stu-2', nowMs: NOW }), null);
  assert.equal(mp.verifyMarkPass(t, { env, uid: 'stu-1', nowMs: NOW + mp.MARK_PASS_TTL_MS + 1 }), null);
  assert.equal(mp.verifyMarkPass(t, { env: { FAIR_USE_PAPER_SECRET: 'other' }, uid: 'stu-1', nowMs: NOW }), null);
  const [v, at, body, sig] = t.split('.');
  const widened = Buffer.from(JSON.stringify({ k: 'ci:CI-M-TRIG-03', q: [1, 2, 3, 6, 8] })).toString('base64url');
  assert.equal(mp.verifyMarkPass([v, at, widened, sig].join('.'), { env, uid: 'stu-1', nowMs: NOW }), null, 'numbers cannot be widened');
  assert.equal(mp.verifyMarkPass([v, String(NOW + 5000), body, sig].join('.'), { env, uid: 'stu-1', nowMs: NOW + 6000 }), null, 'time cannot be moved');
  assert.equal(mp.verifyMarkPass('junk', { env, uid: 'stu-1', nowMs: NOW }), null);
});

test('the gate remembers the pass it accepted; the route refuses any body the pass does not allow', () => {
  const req = { headers: { [mp.MARK_PASS_HEADER]: issue() } };
  const pass = mp.verifiedMarkPassOf(req, 'stu-1', env, NOW);
  assert.ok(pass);
  assert.equal(mp.acceptedMarkPassOf(req), pass);
  assert.equal(mp.acceptedMarkPassOf({ headers: {} }), null);
  const ok = { worksheetId: 'ci:CI-M-TRIG-03:mark:1', questions: [{ qNumber: 6 }], uploads: [{ qNumber: 6 }], imageBase64: '' };
  assert.equal(mp.markBodyMismatch(pass, ok), null);
  assert.equal(mp.markBodyMismatch(pass, { ...ok, worksheetId: 'ci:CI-M-OTHER-01:mark:1' }), 'paper');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, worksheetId: 'ci:CI-M-TRIG-03' }), 'paper', 'a whole paper never rides');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, imageBase64: 'JVBER' }), 'document');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, questions: [{ qNumber: 6 }, { qNumber: 8 }] }), 'questions');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, uploads: [] }), 'uploads');
  assert.equal(mp.markBodyMismatch(pass, { ...ok, questions: [{ qNumber: 7 }], uploads: [{ qNumber: 7 }] }), 'number', 'a graded question cannot ride');
});
