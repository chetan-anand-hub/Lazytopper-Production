// PACKS-SERVER-1 - the pack catalogue, targets and coverage (contract §0, §3).
// Run: node --test lazytopper/server/services/packProducts.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const P = require('./packProducts.cjs');

const TOPICS_TS = path.resolve(__dirname, '..', '..', 'src', 'lib', 'desktop', 'topics.ts');
const own = (...ids) => ids.map((packId) => ({ packId }));

test('prices and target kinds are the owner-confirmed table', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(P.PACK_PRODUCTS).map(([k, v]) => [k, [v.priceInr, v.needsTarget]])),
    { pack_chapter: [49, 'chapter'], pack_mock: [99, 'subject'], pack_subject: [199, 'subject'], pack_bundle: [299, null], pack_cbq: [199, 'subject'] },
  );
  assert.ok(Object.isFrozen(P.PACK_PRODUCTS) && Object.isFrozen(P.PACK_CHAPTERS));
});

test('isPackProduct: closed table, no prototype keys, no passes, no top-ups', () => {
  for (const k of ['pack_chapter', 'pack_mock', 'pack_subject', 'pack_bundle']) assert.equal(P.isPackProduct(k), true, k);
  for (const k of ['month', 'till_boards', 'topup_49', '__proto__', 'constructor', 'toString', '', undefined, null, 7, {}]) assert.equal(P.isPackProduct(k), false, String(k));
});

test('packsEnabled: only exactly "1" turns packs on', () => {
  assert.equal(P.packsEnabled({ PACKS_ENABLED: '1' }), true);
  assert.equal(P.packsEnabled({ PACKS_ENABLED: ' 1 ' }), true);
  for (const v of [undefined, '', '0', 'true', 'on', 'yes', '2']) assert.equal(P.packsEnabled({ PACKS_ENABLED: v }), false, String(v));
  assert.equal(P.packsEnabled({}), false);
});

test('validateTarget / packIdFor', () => {
  assert.equal(P.validateTarget('pack_chapter', 'triangles'), 'triangles');
  assert.equal(P.validateTarget('pack_chapter', 'maths'), null);
  assert.equal(P.validateTarget('pack_chapter', undefined), null);
  assert.equal(P.validateTarget('pack_chapter', '__proto__'), null);
  assert.equal(P.validateTarget('pack_chapter', 'constructor'), null);
  assert.equal(P.validateTarget('pack_mock', 'maths'), 'maths');
  assert.equal(P.validateTarget('pack_subject', 'science'), 'science');
  assert.equal(P.validateTarget('pack_subject', 'english'), null);
  assert.equal(P.validateTarget('pack_subject', 'Maths'), null);
  assert.equal(P.validateTarget('pack_mock', 'triangles'), null);
  assert.equal(P.validateTarget('pack_bundle', undefined), 'all');
  assert.equal(P.validateTarget('pack_bundle', 'maths'), 'all'); // ignored
  assert.equal(P.validateTarget('month', 'maths'), null);
  assert.equal(P.packIdFor('pack_chapter', 'heredity'), 'pack_chapter:heredity');
  assert.equal(P.packIdFor('pack_mock', 'maths'), 'pack_mock:maths');
  assert.equal(P.packIdFor('pack_subject', 'science'), 'pack_subject:science');
  assert.equal(P.packIdFor('pack_bundle'), 'pack_bundle:all');
  assert.equal(P.packIdFor('pack_chapter', 'nope'), null);
  assert.deepEqual(P.parsePackId('pack_bundle:all'), { sku: 'pack_bundle', target: 'all' });
  assert.deepEqual(P.parsePackId('pack_chapter:triangles'), { sku: 'pack_chapter', target: 'triangles' });
  assert.equal(P.parsePackId('pack_bundle:maths'), null);
  assert.equal(P.parsePackId('junk'), null);
});

test('ownsChapter / ownsMocks (contract §3)', () => {
  assert.equal(P.ownsChapter(own('pack_chapter:triangles'), 'triangles'), true);
  assert.equal(P.ownsChapter(own('pack_chapter:triangles'), 'circles'), false);
  assert.equal(P.ownsChapter(own('pack_subject:maths'), 'triangles'), true);
  assert.equal(P.ownsChapter(own('pack_subject:maths'), 'heredity'), false);
  assert.equal(P.ownsChapter(own('pack_bundle:all'), 'heredity'), true);
  assert.equal(P.ownsChapter(own('pack_mock:maths'), 'triangles'), false);
  assert.equal(P.ownsChapter([], 'triangles'), false);
  assert.equal(P.ownsChapter(own('pack_bundle:all'), 'not-a-slug'), false);
  assert.equal(P.ownsMocks(own('pack_mock:maths'), 'maths'), true);
  assert.equal(P.ownsMocks(own('pack_mock:maths'), 'science'), false);
  assert.equal(P.ownsMocks(own('pack_subject:science'), 'science'), true);
  assert.equal(P.ownsMocks(own('pack_bundle:all'), 'maths'), true);
  assert.equal(P.ownsMocks(own('pack_chapter:triangles'), 'maths'), false);
  assert.equal(P.ownsMocks(undefined, 'maths'), false);
});

test('isAlreadyOwned: everything the request would grant must already be owned', () => {
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths'), 'pack_chapter', 'triangles'), true); // chapter under subject
  assert.equal(P.isAlreadyOwned(own('pack_bundle:all'), 'pack_chapter', 'heredity'), true); // chapter under bundle
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths'), 'pack_mock', 'maths'), true); // mock under subject
  assert.equal(P.isAlreadyOwned(own('pack_bundle:all'), 'pack_mock', 'science'), true);
  assert.equal(P.isAlreadyOwned(own('pack_bundle:all'), 'pack_subject', 'maths'), true); // subject under bundle
  assert.equal(P.isAlreadyOwned(own('pack_chapter:circles'), 'pack_chapter', 'circles'), true);
  assert.equal(P.isAlreadyOwned(own('pack_mock:maths'), 'pack_mock', 'maths'), true);
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths'), 'pack_subject', 'maths'), true);
  assert.equal(P.isAlreadyOwned(own('pack_bundle:all'), 'pack_bundle'), true);
  // NOT owned: something new would be granted.
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths'), 'pack_chapter', 'heredity'), false);
  assert.equal(P.isAlreadyOwned(own('pack_chapter:triangles'), 'pack_subject', 'maths'), false);
  assert.equal(P.isAlreadyOwned(own('pack_mock:maths'), 'pack_subject', 'maths'), false); // chapters missing
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths'), 'pack_bundle'), false);
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths', 'pack_subject:science'), 'pack_bundle'), true); // both halves
  assert.equal(P.isAlreadyOwned([], 'pack_bundle'), false);
  assert.equal(P.isAlreadyOwned(own('pack_bundle:all'), 'pack_chapter', 'bogus'), false); // invalid is never "owned"
  // every chapter + the mocks bought one by one also covers the subject
  const all13 = P.chaptersOf('maths').map((s) => ({ packId: `pack_chapter:${s}` }));
  assert.equal(all13.length, 13);
  assert.equal(P.isAlreadyOwned([...all13, { packId: 'pack_mock:maths' }], 'pack_subject', 'maths'), true);
  assert.equal(P.isAlreadyOwned(all13, 'pack_subject', 'maths'), false);
});

test('SLUG PARITY: PACK_CHAPTERS equals the 26 AUTHORED_TOPICS slugs + subjects of src/lib/desktop/topics.ts', () => {
  const text = fs.readFileSync(TOPICS_TS, 'utf8');
  const start = text.indexOf('const AUTHORED_TOPICS');
  assert.ok(start > 0, 'AUTHORED_TOPICS not found');
  const end = text.indexOf('\n];', start);
  assert.ok(end > start, 'end of AUTHORED_TOPICS not found');
  const block = text.slice(start, end);
  const found = {};
  const re = /slug:\s*"([^"]+)"[\s\S]*?subject:\s*"(Maths|Science)"/g;
  let m;
  let count = 0;
  while ((m = re.exec(block))) {
    found[m[1]] = m[2].toLowerCase();
    count += 1;
  }
  assert.equal(count, 26);
  assert.equal(Object.keys(found).length, 26);
  assert.deepEqual(found, { ...P.PACK_CHAPTERS });
  assert.equal(P.chaptersOf('maths').length, 13);
  assert.equal(P.chaptersOf('science').length, 13);
});

test('CBQ-PACK-1: pack_cbq is a separate product - not covered by the subject pack or bundle, and covers no chapters or mocks', () => {
  assert.equal(P.validateTarget('pack_cbq', 'maths'), 'maths');
  assert.equal(P.validateTarget('pack_cbq', 'triangles'), null);
  assert.equal(P.validateTarget('pack_cbq', 'all'), null);
  assert.equal(P.packIdFor('pack_cbq', 'science'), 'pack_cbq:science');
  assert.deepEqual(P.parsePackId('pack_cbq:maths'), { sku: 'pack_cbq', target: 'maths' });
  // the bundle and the subject pack do NOT own the CBQ pack
  assert.equal(P.isAlreadyOwned(own('pack_bundle:all'), 'pack_cbq', 'maths'), false);
  assert.equal(P.isAlreadyOwned(own('pack_subject:maths', 'pack_subject:science'), 'pack_cbq', 'science'), false);
  assert.equal(P.ownsCbq(own('pack_bundle:all'), 'maths'), false);
  // only itself, and only for its own subject
  assert.equal(P.isAlreadyOwned(own('pack_cbq:maths'), 'pack_cbq', 'maths'), true);
  assert.equal(P.isAlreadyOwned(own('pack_cbq:maths'), 'pack_cbq', 'science'), false);
  // and it does not cover chapters, mocks, the subject pack or the bundle
  const cbqBoth = own('pack_cbq:maths', 'pack_cbq:science');
  assert.equal(P.ownsChapter(cbqBoth, 'triangles'), false);
  assert.equal(P.ownsMocks(cbqBoth, 'maths'), false);
  assert.equal(P.isAlreadyOwned(cbqBoth, 'pack_subject', 'maths'), false);
  assert.equal(P.isAlreadyOwned(cbqBoth, 'pack_bundle'), false);
});
