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
    { pack_chapter: [49, 'chapter'], pack_mock: [99, 'subject'], pack_subject: [199, 'subject'], pack_bundle: [299, null], pack_cbq: [199, 'subject'], test_series: [999, null] },
  );
  assert.ok(Object.isFrozen(P.PACK_PRODUCTS) && Object.isFrozen(P.PACK_CHAPTERS));
});

/* ── TS-PACK-1 · the Test Series Pack ───────────────────────────────────────── */

test('TS-PACK-1: test_series is Rs 999, one packId `test_series:all`, covered by nothing but itself, covering nothing', () => {
  assert.equal(P.isPackProduct('test_series'), true);
  assert.equal(P.PACK_PRODUCTS.test_series.priceInr, 999);
  assert.equal(P.validateTarget('test_series', 'maths'), 'all');
  assert.equal(P.packIdFor('test_series'), 'test_series:all');
  assert.deepEqual(P.parsePackId('test_series:all'), { sku: 'test_series', target: 'all' });
  assert.equal(P.parsePackId('test_series:maths'), null);
  // it is NOT the bundle: owning every PDF pack does not own it, and owning it owns no PDF pack
  const everyPdf = own('pack_bundle:all', 'pack_cbq:maths', 'pack_cbq:science', 'pack_subject:maths', 'pack_subject:science');
  assert.equal(P.isAlreadyOwned(everyPdf, 'test_series', 'all'), false);
  assert.equal(P.isAlreadyOwned(own('test_series:all'), 'test_series', 'all'), true);
  for (const [sku, t] of [['pack_bundle', 'all'], ['pack_chapter', 'triangles'], ['pack_mock', 'maths'], ['pack_cbq', 'science'], ['pack_subject', 'maths']]) {
    assert.equal(P.isAlreadyOwned(own('test_series:all'), sku, t), false, sku);
  }
  assert.equal(P.ownsTestSeries(own('test_series:all')), true);
  assert.equal(P.ownsTestSeries(own('pack_bundle:all')), false);
  const { coveringPackIds } = require('./packGrant.cjs');
  if (typeof coveringPackIds === 'function') assert.deepEqual(coveringPackIds('test_series', 'all'), ['test_series:all']);
});

test('TS-PACK-1 kill switch: TS_PACK_DISABLED takes the Test Series Pack off sale and touches no other pack', () => {
  const on = { PACKS_ENABLED: '1' };
  assert.equal(P.isPackOnSale('test_series', on), true);
  for (const v of ['1', 'true', 'on', 'yes', ' 1 ']) {
    assert.equal(P.isPackOnSale('test_series', { ...on, TS_PACK_DISABLED: v }), false, v);
    for (const sku of ['pack_chapter', 'pack_mock', 'pack_subject', 'pack_bundle', 'pack_cbq']) assert.equal(P.isPackOnSale(sku, { ...on, TS_PACK_DISABLED: v }), true, sku);
  }
  for (const v of ['0', '', 'off']) assert.equal(P.isPackOnSale('test_series', { ...on, TS_PACK_DISABLED: v }), true, v);
  assert.equal(P.isPackOnSale('test_series', {}), false, 'PACKS_ENABLED off -> no pack is on sale');
  assert.equal(P.isPackOnSale('month', on), false);
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

test('TS-PACK-1 source pin: EVERY order-creating route asks isPackOnSale (so TS_PACK_DISABLED reaches signed-in, guest, self and parent checkout)', () => {
  const fs = require('node:fs');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');
  const pay = read('payments.cjs');
  assert.match(pay, /const isPack = isPackOnSale\(passType, env\);/);
  const guest = read('guestPay.cjs');
  assert.equal((guest.match(/const isPack = isPackOnSale\(sku, env\);/g) || []).length, 3, 'guest order, self order, guest pass/pack order');
  assert.doesNotMatch(guest, /isPackProduct\(sku\) && packsEnabled\(env\)/);
  const parent = read('parentPay.cjs');
  assert.equal((parent.match(/if \(!isPackOnSale\(pack\.sku, env\)\) return unavailable\(res\);/g) || []).length, 2, 'parent link view + order');
  assert.match(parent, /isPackProduct\(wanted\.sku\) && !isPackOnSale\(wanted\.sku, env\)/);
});

/* ── TS-PRICE-2 · the Test Series base is time-dependent: 999 founding, 1,499 from the Board Pass founding cut-off ─────────── */
test('PRICE-HOLD-1 · packBaseInrAt: the Test Series stays 999 forever (no 1 Dec switch); other packs unchanged', () => {
  const { packBaseInrAt, packAcceptedBasesInr, TEST_SERIES_FOUNDING_INR, TEST_SERIES_LIST_INR, PACK_PRODUCTS } = require('./packProducts.cjs');
  const { FOUNDING_OFFER_CLOSES_AT_MS } = require('./passPricing.cjs');
  assert.equal(FOUNDING_OFFER_CLOSES_AT_MS, Infinity, 'the SAME (non-)deadline the Board Pass founding offer uses: none');
  const D1 = Date.parse('2026-12-01T00:00:00+05:30');
  for (const t of [Date.parse('2026-11-19T08:23:00+05:30'), D1 - 1, D1, Date.parse('2026-12-01T00:00:01+05:30'), Date.parse('2027-02-01T12:00:00+05:30'), D1 + 365 * 86400000]) {
    assert.equal(packBaseInrAt('test_series', t), 999, new Date(t).toISOString());
  }
  assert.equal(TEST_SERIES_FOUNDING_INR, 999);
  assert.equal(TEST_SERIES_LIST_INR, 1499);
  for (const sku of ['pack_chapter', 'pack_mock', 'pack_subject', 'pack_bundle', 'pack_cbq']) {
    assert.equal(packBaseInrAt(sku, D1 - 1), PACK_PRODUCTS[sku].priceInr);
    assert.equal(packBaseInrAt(sku, D1), PACK_PRODUCTS[sku].priceInr);
    assert.deepEqual(packAcceptedBasesInr(sku), [PACK_PRODUCTS[sku].priceInr]);
  }
  assert.deepEqual(packAcceptedBasesInr('test_series'), [999, 1499]);
  assert.equal(packBaseInrAt('nope', 0), null);
  assert.deepEqual(packAcceptedBasesInr('nope'), []);
});

test('TS-PRICE-2 · GUARD: no server file reads PACK_PRODUCTS[..].priceInr for an amount (a read would charge the founding 999 forever)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full); continue; }
      if (!/\.cjs$/.test(e.name) || /\.test\.cjs$|\.suite\.cjs$/.test(e.name)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return;
        if (/PACK_PRODUCTS\s*\[[^\]]*\]\s*\.priceInr/.test(line) || /PACK_PRODUCTS\.(?!pack_chapter\b)[a-z_]+\.priceInr/.test(line)) offenders.push(`${path.relative(root, full)}:${i + 1}`);
      });
    }
  };
  walk(root);
  // Only packProducts.cjs itself (packBaseInrAt / packAcceptedBasesInr) may read it; the fixed-price Chapter Pack copy reads are exempted by the pattern.
  const allowed = offenders.filter((o) => !o.startsWith(`services${path.sep}packProducts.cjs`));
  assert.deepEqual(allowed, []);
});
