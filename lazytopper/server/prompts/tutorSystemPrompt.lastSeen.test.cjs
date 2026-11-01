'use strict';
// TUTOR-MEM-1 - "last practised" appears in the concept row only when a valid lastSeen is present, and the
// rest of the prompt is byte-identical without it. The clock is injected (nowMs), never read by the test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTutorSystemPrompt } = require('./tutorSystemPrompt.cjs');

const NOW = Date.UTC(2026, 10, 1, 4, 0); // 1 Nov 2026 09:30 IST
const brief = (concepts) => ({
  hasData: true, topic: {}, mistakes: {}, windowLabel: 'last 30 days',
  chapter: { name: 'Real Numbers', marksLost: 8, concepts },
});
const build = (concepts) =>
  buildTutorSystemPrompt({ topicLabel: 'Real Numbers', subject: 'maths', brief: brief(concepts), nowMs: NOW });
const base = [
  { name: "Euclid's division lemma", marksLost: 4, attempts: 7, trend: 'worsening' },
  { name: 'HCF and LCM', marksLost: 0, attempts: 2 },
];

test('no lastSeen anywhere: no "last practised" text and no date line', () => {
  const p = build(base);
  assert.doesNotMatch(p, /last practised/);
  assert.doesNotMatch(p, /Today's date/);
});

test('lastSeen present: the row says when, with days ago, and today (IST) is stated once', () => {
  const p = build([{ ...base[0], lastSeen: '2026-10-27' }, base[1]]);
  assert.match(p, /Euclid's division lemma \(4 marks lost, 7 graded questions, [^)]*last practised 2026-10-27, 5 days ago\)/);
  assert.match(p, /HCF and LCM \(0 marks lost, 2 graded questions\)/); // the concept without it says nothing
  assert.equal(p.split("Today's date (IST) is 2026-11-01").length, 2);
});

test('same-day and yesterday wording; a future or malformed date is dropped silently', () => {
  assert.match(build([{ ...base[0], lastSeen: '2026-11-01' }]), /last practised 2026-11-01, today/);
  assert.match(build([{ ...base[0], lastSeen: '2026-10-31' }]), /last practised 2026-10-31, yesterday/);
  for (const bad of ['2026-11-09', 'yesterday', '2026-1-1', 20261027, null]) {
    const p = build([{ ...base[0], lastSeen: bad }]);
    assert.doesNotMatch(p, /last practised|Today's date/);
  }
});

test('everything else is byte-identical with and without lastSeen', () => {
  const strip = (p) => p.replace(/, last practised [^)]*\)/g, ')').replace(/\n- Today's date \(IST\)[^\n]*/g, '');
  assert.equal(strip(build([{ ...base[0], lastSeen: '2026-10-27' }, base[1]])), build(base));
});
