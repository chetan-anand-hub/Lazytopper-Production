'use strict';
// MARK-ON-PHOTO-2 (owner ruling 25 Nov 2026, 21:30 IST "Same paper, no new slot"): a "Mark it on your photo" on a Chapter Test,
// Full Mock or Worksheet is graded under the paper's OWN worksheetId with the paper's OWN fair-use paper pass. This file proves the
// FAIR-USE half of that (the LIMITS half is in limits.test.cjs, "MARK-ON-PHOTO-2"): for a trial student a verified pass on a paper
// surface spends nothing more on a grade (the paper allowance was spent when the pass was minted), and only when the body's
// worksheetId IS the pass's paperKey — a mark sent under any other id would be counted per question as an Answer Checker grade.
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  createFairUse,
  encodePaperPass,
  PAPER_HEADER,
  SURFACE_HEADER,
  GRADE_WORKSHEET_PATH,
} = require('./fairUse.cjs');
const { setChargeableCount } = require('../grading/charge.cjs');

const NOW = Date.UTC(2026, 10, 25, 15, 0, 0);
const SECRET = 'mark-bank-secret';

function rig({ tier = 'trial' } = {}) {
  const trialWrites = [];
  const reads = [];
  const events = [];
  const gate = createFairUse({
    tierOf: async () => tier,
    ledger: {
      async readDays(uid, keys) {
        reads.push(keys);
        return new Map(keys.map((k) => [k, {}]));
      },
      recordTrialUse(uid, counts) {
        trialWrites.push(counts);
        return Promise.resolve(true);
      },
    },
    telemetry: { increment: (event) => events.push(event) },
    env: { FAIR_USE_ENFORCE: '1', FAIR_USE_PAPER_SECRET: SECRET },
    now: () => NOW,
    readJson: async (req) => req.__body || {},
    resolveFirestore: () => null,
    sendJson: (res, status, body) => { res.sent = { status, body }; },
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  return { gate, trialWrites, reads, events };
}

async function grade(r, { surface, worksheetId, pass }) {
  const req = {
    headers: { [SURFACE_HEADER]: surface, ...(pass ? { [PAPER_HEADER]: pass } : {}) },
    __body: { worksheetId, questions: [{ qNumber: 7, marks: 3, questionText: 'Prove that the tangents from an external point are equal.' }], uploads: [{ qNumber: 7, imageBase64: 'x' }] },
  };
  const res = new EventEmitter();
  res.statusCode = 0;
  const answered = await r.gate.applyToRequest(req, res, GRADE_WORKSHEET_PATH, 'stu-1');
  setChargeableCount(res, 1);
  res.statusCode = 200;
  res.emit('finish');
  await new Promise((resolve) => setImmediate(resolve));
  return answered;
}

for (const surface of ['chapter-test', 'full-mock', 'worksheet']) {
  test(`MARK-ON-PHOTO-2 (${surface}): a mark under the paper's own id and pass spends nothing more of a trial's allowance`, async () => {
    const r = rig();
    const paperKey = `${surface}-paper-1`;
    const pass = encodePaperPass(SECRET, 'stu-1', surface, paperKey, NOW - 60 * 1000);
    assert.equal(await grade(r, { surface, worksheetId: paperKey, pass }), false, 'served');
    assert.deepEqual(r.trialWrites, [], 'no per-question trial use recorded');
    assert.deepEqual(r.reads, [], 'not even a ledger read: the paper allowance was spent at mint');
    assert.ok(r.events.includes('fair_use.paper_pass.accepted'));
    assert.ok(r.events.includes(`fair_use.surface.${surface}`));
  });

  test(`MARK-ON-PHOTO-2 (${surface}) CONTROL: the same mark under ANY other id is counted per question as an Answer Checker grade`, async () => {
    const r = rig();
    const paperKey = `${surface}-paper-1`;
    const pass = encodePaperPass(SECRET, 'stu-1', surface, paperKey, NOW - 60 * 1000);
    assert.equal(await grade(r, { surface, worksheetId: `${paperKey}:mark:6`, pass }), false);
    assert.ok(r.events.includes('fair_use.paper_pass.rejected'));
    assert.ok(r.events.includes('fair_use.surface.check-improve'));
    assert.equal(r.trialWrites.length, 1, 'counted, which is why the client sends the paper id itself');
  });
}
