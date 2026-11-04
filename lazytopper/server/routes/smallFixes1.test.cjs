'use strict';
// SMALL-FIXES-1 - (1) `answerSource` is an Answer Checker field: the server drops it on every other
// surface and the Answer Checker's own requests keep it; bank-surface requests grade byte-identically.
// (2) the no-verdict counter: how often the grader states NO verdict on an objective question, by key
// source. Neither changes a mark.

const test = require('node:test');
const assert = require('node:assert/strict');
const telemetry = require('../telemetry.cjs');
const { clampObjectiveResult } = require('./objectiveScoring.cjs');
const { dropAnswerSourceUnlessAnswerChecker } = require('./questions.cjs');

const body = () => ({ answerSource: 'derived', questions: [{ qNumber: 1, answer: 'c', answerSource: 'derived' }, { qNumber: 2, answer: 'a' }] });
const req = (surface) => ({ headers: surface === undefined ? {} : { 'x-lazytopper-surface': surface } });

test('SF1.1 check-improve keeps answerSource (top level and per question)', () => {
  const b = dropAnswerSourceUnlessAnswerChecker(req('check-improve'), body());
  assert.deepEqual(b, body());
  assert.equal(dropAnswerSourceUnlessAnswerChecker(req(' Check-Improve '), body()).questions[0].answerSource, 'derived');
});

test('SF1.2 every other surface (and no header) loses answerSource, nothing else changes', () => {
  for (const s of ['worksheet', 'chapter-test', 'full-mock', 'quick-practice', 'bogus', '', undefined]) {
    const b = dropAnswerSourceUnlessAnswerChecker(req(s), body());
    assert.equal('answerSource' in b, false, String(s));
    assert.equal('answerSource' in b.questions[0], false, String(s));
    assert.deepEqual(b.questions.map((q) => q.answer), ['c', 'a']);
  }
});

test('SF1.3 a request without answerSource is untouched (byte-identical)', () => {
  const plain = { questions: [{ qNumber: 1, answer: 'b', options: ['x', 'y'] }], marks: 1 };
  const before = JSON.stringify(plain);
  assert.equal(JSON.stringify(dropAnswerSourceUnlessAnswerChecker(req('worksheet'), plain)), before);
});

test('SF1.4 a body that is not an object passes through', () => {
  assert.equal(dropAnswerSourceUnlessAnswerChecker(req('worksheet'), null), null);
});

const steps = () => [{ stepNumber: 1, studentWork: 'Option d - 2x2', status: 'correct', marksAwarded: 0 }];
const count = (k) => telemetry.snapshot()['grading.objective_no_verdict.' + k] || 0;

test('SF2.1 no stated verdict is counted by key source; a stated verdict is not', () => {
  const before = { derived: count('derived'), printed: count('printed'), bank: count('bank'), none: count('none') };
  clampObjectiveResult({ answer: 'd', answerSource: 'derived' }, steps(), 1, undefined);
  clampObjectiveResult({ answer: 'd', answerSource: 'printed' }, steps(), 1, null);
  clampObjectiveResult({ answer: 'd' }, steps(), 1, undefined);
  clampObjectiveResult({}, steps(), 1, undefined);
  assert.deepEqual(
    { derived: count('derived'), printed: count('printed'), bank: count('bank'), none: count('none') },
    { derived: before.derived + 1, printed: before.printed + 1, bank: before.bank + 1, none: before.none + 1 },
  );
  clampObjectiveResult({ answer: 'd', answerSource: 'derived' }, steps(), 1, true);
  clampObjectiveResult({ answer: 'd' }, steps(), 1, false);
  assert.equal(count('derived'), before.derived + 1);
  assert.equal(count('bank'), before.bank + 1);
});

test('SF2.2 counting never changes a verdict', () => {
  const v = clampObjectiveResult({ answer: 'd', answerSource: 'derived' }, steps(), 1, undefined);
  assert.deepEqual({ m: v.marksAwarded, c: v.correct, r: v.resolved }, { m: 1, c: true, r: true });
  const w = clampObjectiveResult({ answer: 'c', answerSource: 'derived' }, steps(), 1, true);
  assert.deepEqual({ m: w.marksAwarded, c: w.correct }, { m: 1, c: true });
});
