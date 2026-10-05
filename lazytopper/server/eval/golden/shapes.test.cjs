'use strict';
// shapes.test.cjs — G2: today's response SHAPE per P15 call site, pinned. Zero model calls.
// PR-2 (GRADER-CORE-1) must keep every snapshot byte-shape identical for requests that do
// NOT send `acceptsV2: true` — "every existing client keeps working unchanged".

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { computeAll, shapeOf, firstDiff, SHAPES_DIR } = require('./lib/shape.cjs');

const snapshot = JSON.parse(fs.readFileSync(path.join(SHAPES_DIR, 'snapshot.json'), 'utf8')).shapes;
const callSites = JSON.parse(fs.readFileSync(path.join(SHAPES_DIR, 'callsites.json'), 'utf8')).callSites;

let current = null;
test.before(async () => {
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {}; console.error = () => {};
  try { current = await computeAll(); } finally { console.warn = quiet.warn; console.error = quiet.error; }
});

test('§1 every P15 call site has a snapshot, and every snapshot is a P15 call site', () => {
  assert.ok(callSites.length >= 11, 'CONTROL: fewer than the 11 tabled call sites (' + callSites.length + ')');
  assert.deepStrictEqual(Object.keys(snapshot).sort(), callSites.map((c) => c.id).sort());
});

for (const site of callSites) {
  test('§2 shape unchanged — ' + site.id, () => {
    const want = snapshot[site.id];
    const got = current[site.id];
    assert.ok(want && got, 'missing shape for ' + site.id);
    for (const outcome of ['success', 'parseMiss', 'timeout']) {
      const d = firstDiff(want[outcome], got[outcome]);
      assert.strictEqual(d, null, 'G2 SHAPE CHANGED for call site "' + site.id + '" (' + outcome + '): ' + d);
    }
    assert.deepStrictEqual(got.requestKeys, want.requestKeys, 'the request shape for ' + site.id + ' changed');
  });
}

test('§3 the pinned requests send NO acceptsV2 (G2 pins the without-flag shape)', () => {
  for (const [id, s] of Object.entries(snapshot)) assert.ok(!s.requestKeys.includes('acceptsV2'), id + ' request carries acceptsV2');
});

test('§4 CONTROL — the shape guard can fail: an added or renamed field moves the shape', () => {
  const body = { ok: true, marksAwarded: 1, annotatedSteps: [{ status: 'correct' }] };
  const base = shapeOf(body);
  assert.notStrictEqual(firstDiff(base, shapeOf({ ...body, couldNotRead: false })), null, 'an ADDED field must move the shape');
  assert.notStrictEqual(firstDiff(base, shapeOf({ ok: true, marks: 1, annotatedSteps: [{ status: 'correct' }] })), null, 'a RENAMED field must move the shape');
  assert.notStrictEqual(firstDiff(base, shapeOf({ ...body, marksAwarded: '1' })), null, 'a TYPE change must move the shape');
  assert.strictEqual(firstDiff(base, shapeOf({ ok: false, marksAwarded: 3, annotatedSteps: [{ status: 'partial' }] })), null, 'a VALUE change must NOT move the shape');
});
