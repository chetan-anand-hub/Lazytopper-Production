// SERVER-PDF-1 PR-B - stamped pack PDFs: ownership, the stamp itself, 15-minute links, ZIPs, the kill switch, the download feed.
// Run: node --test lazytopper/server/services/packPdf.test.cjs
// No Google, no network: the bucket and Firestore are in-memory fakes; the templates are tiny real PDFs made with pdf-lib and the
// fonts are the repo's real Inter files.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { PDFDocument, PDFName, PDFString, PDFDict, PDFArray } = require('pdf-lib');

const { createPackRoutes } = require('../routes/packs.cjs');
const { createPackPdfService } = require('./packPdfService.cjs');
const { stampTemplate, helveticaWidthMm, jspdfWidthMm, fitCoverLicence, licenseeLine, fitFooter, widthOf, fontOf, loadFonts, REPO_ROOT } = require('./packStamp.cjs');
const { buyerRefFor, templateIdForPackFile, fileIdFor } = require('./packCovering.cjs');
const { packDownloadedSince } = require('./moveToOther.cjs');
const { redownloadUntilFor } = require('./packTerms.cjs');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const NOW = Date.parse('2026-11-12T10:00:00+05:30');
const PAID = Date.parse('2026-11-10T10:00:00+05:30');
const A4 = [595.276, 841.89];

// ---- fixtures: fonts, marks, templates, bridge, manifest -------------------------------------------------------------------
const FONT_FILES = { 400: 'Inter-Regular.otf', 700: 'Inter-Bold.otf' };
const fontEntries = Object.entries(FONT_FILES).map(([weight, f]) => {
  const file = `lazytopper/scripts/packTemplates/fonts/${f}`;
  return { family: 'Inter', weight: Number(weight), file, sha256: sha(fs.readFileSync(path.join(REPO_ROOT, file))) };
});
const style = (over = {}) => ({ fontFamily: 'Inter, sans-serif', fontSizePx: 13, fontWeight: '400', color: 'rgb(42, 58, 82)', lineHeightPx: 19.5, letterSpacingPx: 0, textTransform: 'none', textAlign: 'start', ...over });
const box = (name, o) => ({ name, xPx: 0, yPx: 0, wPx: 0, hPx: 0, wMm: 0, hMm: 0, lines: 1, style: style(), ...o });
const COVER_STAMPS = (licH, licLines) => [
  box('textcol', { xMm: 24.068, yMm: 247.292, wMm: 138.829, hMm: 20.63, lines: 4 }),
  box('licence', { xMm: 24.068, yMm: 247.557, wMm: 129.651, hMm: licH, lines: licLines, style: style({ fontWeight: '700', color: 'rgb(21, 35, 58)' }) }),
  box('redownload', { xMm: 24.068, yMm: 262.764, wMm: 138.829, hMm: 5.157 }),
  box('edition', { xMm: 161.773, yMm: 280.088, wMm: 32.358, hMm: 4.232, anchor: 'right', rightEdgeMm: 194.131, style: style({ color: 'rgb(58, 74, 96)', lineHeightPx: 15.6 }) }),
];
const coverMarks = (licH, licLines) => ({ licenceFit: { maxLines: 2, shorten: 'fitLicensee' }, wPx: 794, hPx: 1123, mmPerPx: 0.26448362720403024, stamps: COVER_STAMPS(licH, licLines) });
const MARKS = {
  version: 1, pageWmm: 210, pageHmm: 297, pages: 7,
  cover: coverMarks(4.232, 1),
  cover2: coverMarks(9.389, 2),
  footer: { xMm: 12, baselineYMm: 273, maxWidthMm: 164, fontSizesPt: [10, 9.5, 9], colorRgb: [58, 74, 96], font: 'Helvetica', firstPage: 4, lastPage: 7, withQr: true },
  body: [box('generated', { page: 4, set: 0, xMm: 46.408, yMm: 45.542, wMm: 35.632, hMm: 5.48 })],
};

/** A template: `pages` body+cover pages, then the two-line cover as the LAST page (it is 600 pt wide so a test can tell which cover won). */
async function blankPdf(pages, marker, extraCover = true) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage(A4);
  if (extraCover) doc.addPage([600, A4[1]]);
  doc.setTitle(marker);
  return Buffer.from(await doc.save());
}
/** A 2-page "bridge" whose pages carry real link annotations, as the CI bridge pages do. */
async function bridgePdf(urls) {
  const doc = await PDFDocument.create();
  urls.forEach((url) => {
    const page = doc.addPage(A4);
    const link = doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [50, 50, 200, 80], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } });
    page.node.set(PDFName.of('Annots'), doc.context.obj([doc.context.register(link)]));
  });
  return Buffer.from(await doc.save());
}
const uriOf = (page) => {
  const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  return annots ? annots.asArray().map((r) => page.doc.context.lookup(r, PDFDict).lookup(PDFName.of('A'), PDFDict).lookup(PDFName.of('URI'), PDFString).decodeText()) : [];
};

async function world(over = {}) {
  const objects = new Map(); // path -> {bytes, metadata}
  const put = (p, bytes) => objects.set(p, { bytes: Buffer.from(bytes), metadata: {} });
  const files = {};
  const papers = {};
  const bridges = {};
  const mk = async (templateId, groupId, group, filename, codes, hasBridge) => {
    const bytes = await blankPdf(7, templateId);
    const p = `packs/files/${sha(bytes)}.pdf`;
    put(p, bytes);
    files[templateId] = { templateId, groupId, group, label: filename, filename, mode: 'questions', codes, hash: sha(bytes), path: p, bytes: bytes.length, sha256: sha(bytes), pages: 7, hasBridge, marks: MARKS };
  };
  await mk('real-numbers|ct1-questions', 'real-numbers', 'Real Numbers', 'LazyTopper - Real Numbers - Chapter Test 1.pdf', ['PK-M-RN-CT1'], true);
  await mk('real-numbers|ct1-answers', 'real-numbers', 'Real Numbers', 'LazyTopper - Real Numbers - Chapter Test 1 answers.pdf', [], true);
  await mk('real-numbers|ws-questions', 'real-numbers', 'Real Numbers', 'LazyTopper - Real Numbers - Worksheet.pdf', ['PK-M-RN-WS'], true);
  await mk('polynomials|ct1-questions', 'polynomials', 'Polynomials', 'LazyTopper - Polynomials - Chapter Test 1.pdf', [], true);
  await mk('mock-maths-1-questions', 'mocks-maths', 'Maths Full Mocks', 'LazyTopper - Maths Full Mock 1.pdf', [], true);
  for (const code of ['PK-M-RN-CT1', 'PK-M-RN-WS']) {
    const ws = Buffer.from(JSON.stringify({ title: code, createdAt: '2026-01-01T00:00:00.000Z', questions: [{ id: `${code}-q1` }] }));
    const p = `packs/ws/${sha(ws)}.json`;
    put(p, ws);
    papers[code] = { code, kind: 'chapter_test', name: `Paper ${code}`, subject: 'maths', topicKey: 'real-numbers', wsPath: p, wsSha256: sha(ws) };
  }
  const bNoCard = await bridgePdf(['https://www.lazytopper.com/packs#my-packs', 'https://www.lazytopper.com/media/sample.pdf']);
  const bCard = await bridgePdf(['https://www.lazytopper.com/pricing', 'https://www.lazytopper.com/packs#my-packs']);
  for (const [key, b, card] of [['nocard', bNoCard, false], ['card', bCard, true]]) {
    const p = `packs/bridge/${key}.pdf`;
    put(p, b);
    bridges[key] = { key, path: p, boardPassCard: card, bytes: b.length, sha256: sha(b) };
  }
  const bridgeFor = Object.fromEntries(Object.keys(files).map((id) => [id, { noCard: 'nocard', card: 'card' }]));
  const manifest = {
    version: 1, contentHash: 'c0ffee', rendererVersion: 'r', createdAt: 'x', commit: 'y', fonts: fontEntries, files, papers, bridges,
    packs: {
      'pack_chapter:real-numbers': { packId: 'pack_chapter:real-numbers', sku: 'pack_chapter', target: 'real-numbers', files: ['real-numbers|ct1-questions', 'real-numbers|ct1-answers', 'real-numbers|ws-questions'], groups: [{ groupId: 'real-numbers', group: 'Real Numbers', files: ['real-numbers|ct1-questions', 'real-numbers|ct1-answers', 'real-numbers|ws-questions'] }], bridge: bridgeFor },
      'pack_subject:maths': { packId: 'pack_subject:maths', sku: 'pack_subject', target: 'maths', files: ['real-numbers|ct1-questions', 'real-numbers|ct1-answers', 'real-numbers|ws-questions', 'polynomials|ct1-questions'], groups: [{ groupId: 'real-numbers', group: 'Real Numbers', files: ['real-numbers|ct1-questions', 'real-numbers|ct1-answers', 'real-numbers|ws-questions'] }, { groupId: 'polynomials', group: 'Polynomials', files: ['polynomials|ct1-questions'] }], bridge: bridgeFor },
      'pack_bundle:all': { packId: 'pack_bundle:all', sku: 'pack_bundle', target: 'all', files: ['real-numbers|ct1-questions', 'mock-maths-1-questions'], groups: [{ groupId: 'real-numbers', group: 'Real Numbers', files: ['real-numbers|ct1-questions'] }, { groupId: 'mocks-maths', group: 'Maths Full Mocks', files: ['mock-maths-1-questions'] }], bridge: bridgeFor },
    },
  };
  const mbytes = Buffer.from(JSON.stringify(manifest));
  put('packs/manifests/c0ffee.json', mbytes);
  put('packs/current.json', Buffer.from(JSON.stringify({ version: 1, contentHash: 'c0ffee', manifestPath: 'packs/manifests/c0ffee.json', createdAt: 'x' })));
  const signed = [];
  const writes = [];
  const delay = { ms: 0 };
  const bucket = {
    file: (p) => ({
      exists: async () => [objects.has(p)],
      download: async () => {
        if (delay.ms) await new Promise((r) => setTimeout(r, delay.ms));
        return [objects.get(p).bytes];
      },
      getMetadata: async () => [{ metadata: objects.get(p).metadata }],
      save: async (bytes, opts) => { writes.push(p); objects.set(p, { bytes: Buffer.from(bytes), metadata: (opts.metadata && opts.metadata.metadata) || {} }); },
      createWriteStream: (opts) => {
        const chunks = [];
        const { Writable } = require('node:stream');
        return new Writable({ write(c, _e, cb) { chunks.push(c); cb(); }, final(cb) { writes.push(p); objects.set(p, { bytes: Buffer.concat(chunks), metadata: (opts.metadata && opts.metadata.metadata) || {} }); cb(); } });
      },
      getSignedUrl: async (o) => { signed.push({ path: p, ...o }); return [`https://signed.example/${encodeURIComponent(p)}?X-Goog-Expires=900`]; },
    }),
  };
  return { objects, bucket, signed, writes, manifest, delay, ...over };
}

// ---- Firestore + request fakes ----------------------------------------------------------------------------------------------
function fakeFirestore(seed = {}) {
  const docs = new Map(Object.entries(seed));
  const ref = (p) => ({
    id: p.split('/').pop(), path: p,
    get: async () => ({ exists: docs.has(p), data: () => (docs.has(p) ? JSON.parse(JSON.stringify(docs.get(p))) : undefined) }),
    collection: (sub) => coll(`${p}/${sub}`),
  });
  const coll = (p) => ({
    doc: (id) => ref(`${p}/${id}`),
    get: async () => ({ docs: [...docs].filter(([k]) => k.startsWith(`${p}/`) && !k.slice(p.length + 1).includes('/')).map(([k, v]) => ({ id: k.slice(p.length + 1), data: () => ({ ...v }) })) }),
  });
  return {
    docs, collection: coll,
    runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, data, opts) => { const prev = opts && opts.merge ? docs.get(r.path) || {} : {}; const next = { ...prev, ...data }; if (data.events) next.events = { ...(prev.events || {}), ...Object.fromEntries(Object.entries(data.events).map(([k, v]) => [k, (((prev.events || {})[k]) || 0) + v.__inc])) }; docs.set(r.path, next); } }),
  };
}
const firestoreApi = { FieldValue: { increment: (n) => ({ __inc: n }) }, Timestamp: { fromMillis: (ms) => ({ ms }) } };
const entitlement = (uid, packId, extra = {}) => {
  const [sku, target] = packId.split(':');
  return [`packEntitlements/${uid}/packs/${packId.replace(':', '_')}`, { packId, sku, target, pricePaidInr: 49, paidAt: PAID, orderId: `order_${sku}`, ...extra }];
};

async function harness({ owned = [], env = {}, now = NOW, subscription, noManifest = false, noBucket = false } = {}) {
  const w = await world();
  if (noManifest) w.objects.delete('packs/current.json');
  const firestore = fakeFirestore(Object.fromEntries([...owned.map((o) => entitlement(...o)), ...(subscription ? [['subscriptions/u1', subscription]] : [])]));
  const events = [];
  const clock = { now };
  const service = createPackPdfService({ bucket: noBucket ? () => null : w.bucket, now: () => clock.now, telemetry: { increment: (e) => events.push(e) }, firestore, firestoreApi });
  const routes = createPackRoutes({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    verifiedCaller: { resolveVerifiedUid: async (req) => req.uid || '' },
    adminFirestore: firestore,
    getLicensee: async () => ({ name: 'Test Student', email: 'test.student@gmail.com' }),
    telemetry: { increment: (e) => events.push(e) },
    now: () => clock.now,
    packPdf: service,
    env,
  });
  const call = async (handler, body, uid = 'u1') => {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);
    req.headers = { authorization: 'Bearer x' };
    req.uid = uid;
    const res = {};
    await routes[handler](req, res);
    return res;
  };
  return { ...w, firestore, events, clock, call, service, link: (b, uid) => call('handleFileLink', b, uid), zip: (b, uid) => call('handleZipLink', b, uid) };
}
const CH = 'pack_chapter:real-numbers';
const CT1 = `${CH}|real-numbers|ct1-questions`;

// ---- ownership -------------------------------------------------------------------------------------------------------------
test('file-link: a pack the caller does not own is refused (403 not_owned), and so is another buyer\'s pack', async () => {
  const h = await harness({ owned: [['u2', CH]] });
  assert.equal((await h.link({ packId: CH, fileId: CT1 })).status, 403);
  assert.equal((await h.link({ packId: CH, fileId: CT1 })).body.error, 'not_owned');
  assert.equal(h.signed.length, 0);
  assert.equal((await h.call('handleFileLink', { packId: CH, fileId: CT1 }, '')).status, 401);
});

test('file-link: after the re-download date the pack is no longer served (403 redownload_ended), by the SERVER clock', async () => {
  const h = await harness({ owned: [['u1', CH]], now: Date.parse('2027-06-02T12:00:00+05:30') });
  const r = await h.link({ packId: CH, fileId: CT1 });
  assert.equal(r.status, 403);
  assert.equal(r.body.error, 'redownload_ended');
  assert.equal(r.body.redownloadUntil, redownloadUntilFor(PAID));
  assert.equal(h.signed.length, 0);
  // the day itself is still open
  const open = await harness({ owned: [['u1', CH]], now: Date.parse('2027-03-31T23:00:00+05:30') });
  assert.equal((await open.link({ packId: CH, fileId: CT1 })).status, 200);
});

test('file-link: a file that is not in the pack, or a malformed id, is refused', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  assert.equal((await h.link({ packId: CH, fileId: `${CH}|polynomials|ct1-questions` })).status, 404);
  assert.equal((await h.link({ packId: CH, fileId: 'nonsense' })).status, 404);
  assert.equal((await h.link({ packId: 5, fileId: 'x' })).status, 400);
  assert.equal((await h.link({ packId: CH, fileId: 'x'.repeat(300) })).status, 400);
});

// ---- the link ----------------------------------------------------------------------------------------------------------------
test('file-link: a V4 signed URL that lives exactly 15 minutes, with the file name as today, plus the printed paper (R1)', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  const r = await h.link({ packId: CH, fileId: CT1 });
  assert.equal(r.status, 200);
  const s = h.signed[0];
  assert.equal(s.version, 'v4');
  assert.equal(s.action, 'read');
  assert.equal(s.expires - NOW, 15 * 60 * 1000);
  assert.equal(r.body.expiresAtMs, s.expires);
  assert.match(s.path, /^stamped\/u1\/c0ffee\//);
  assert.match(s.responseDisposition, /^attachment; filename="LazyTopper - Real Numbers - Chapter Test 1\.pdf"$/);
  assert.equal(s.responseType, 'application/pdf');
  assert.equal(r.body.filename, 'LazyTopper - Real Numbers - Chapter Test 1.pdf');
  // R1: the paper exactly as drawn, with its registration facts
  assert.equal(r.body.papers.length, 1);
  assert.equal(r.body.papers[0].code, 'PK-M-RN-CT1');
  assert.equal(r.body.papers[0].ws.createdAt, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(r.body.papers[0].reg, { kind: 'chapter_test', name: 'Paper PK-M-RN-CT1', subject: 'maths', topicKey: 'real-numbers' });
});

test('file-link: the stamped copy is kept and reused; a changed licensee, Board Pass or day restamps it', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  await h.link({ packId: CH, fileId: CT1 });
  assert.equal(h.writes.length, 1);
  await h.link({ packId: CH, fileId: CT1 });
  assert.equal(h.writes.length, 1, 'second request reuses the stored copy');
  h.clock.now += 24 * 3600 * 1000; // another day: the Edition date changes
  await h.link({ packId: CH, fileId: CT1 });
  assert.equal(h.writes.length, 2);
  h.firestore.docs.set('subscriptions/u1', { tier: 'premium', passType: 'till_boards', passEnd: new Date(NOW + 90 * 86400000) });
  await h.link({ packId: CH, fileId: CT1 });
  assert.equal(h.writes.length, 3, 'a Board Pass bought since drops the card page');
});

test('the stamped file: card page only for a buyer without a paid Board Pass; links kept', async () => {
  const noPass = await harness({ owned: [['u1', CH]] });
  await noPass.link({ packId: CH, fileId: CT1 });
  const [pathNo] = noPass.writes;
  const docNo = await PDFDocument.load(noPass.objects.get(pathNo).bytes);
  assert.equal(docNo.getPageCount(), 7);
  assert.deepEqual(uriOf(docNo.getPage(1)), ['https://www.lazytopper.com/pricing'], 'card variant on page 2');
  const paid = await harness({ owned: [['u1', CH]], subscription: { tier: 'premium', passType: 'till_boards', passEnd: new Date(NOW + 90 * 86400000) } });
  await paid.link({ packId: CH, fileId: CT1 });
  const docPaid = await PDFDocument.load(paid.objects.get(paid.writes[0]).bytes);
  assert.deepEqual(uriOf(docPaid.getPage(1)), ['https://www.lazytopper.com/packs#my-packs']);
  assert.deepEqual(uriOf(docPaid.getPage(2)), ['https://www.lazytopper.com/media/sample.pdf']);
});

// ---- kill switch / not ready ---------------------------------------------------------------------------------------------------
test('PACK_SERVER_PDF_DISABLED: both routes answer 404 before anything is read (the client falls back to its own build)', async () => {
  for (const v of ['1', 'true', 'on']) {
    const h = await harness({ owned: [['u1', CH]], env: { PACK_SERVER_PDF_DISABLED: v } });
    const a = await h.link({ packId: CH, fileId: CT1 });
    const b = await h.zip({ packId: CH, group: 'real-numbers' });
    assert.equal(a.status, 404);
    assert.equal(b.status, 404);
    assert.equal(h.signed.length, 0);
    assert.equal(h.writes.length, 0);
  }
  const off = await harness({ owned: [['u1', CH]], env: { PACK_SERVER_PDF_DISABLED: '0' } });
  assert.equal((await off.link({ packId: CH, fileId: CT1 })).status, 200);
});

test('no packs/current.json (CI has not published yet): 503 not_ready, nothing signed', async () => {
  const h = await harness({ owned: [['u1', CH]], noManifest: true });
  const a = await h.link({ packId: CH, fileId: CT1 });
  const b = await h.zip({ packId: CH, group: 'real-numbers' });
  assert.deepEqual([a.status, a.body.error], [503, 'not_ready']);
  assert.deepEqual([b.status, b.body.error], [503, 'not_ready']);
  assert.equal(h.signed.length, 0);
  const nb = await harness({ owned: [['u1', CH]], noBucket: true });
  assert.equal((await nb.link({ packId: CH, fileId: CT1 })).status, 503);
});

test('a template whose bytes do not match the manifest hash is never stamped (503 not_ready)', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  const f = h.manifest.files['real-numbers|ct1-questions'];
  h.objects.set(f.path, { bytes: Buffer.from('tampered'), metadata: {} });
  const r = await h.link({ packId: CH, fileId: CT1 });
  assert.equal(r.status, 503);
  assert.equal(h.signed.length, 0);
});

// ---- ZIP -----------------------------------------------------------------------------------------------------------------------
function zipEntries(buf) {
  const out = [];
  for (let i = 0; i + 30 < buf.length; ) {
    if (buf.readUInt32LE(i) !== 0x04034b50) { i += 1; continue; }
    const flags = buf.readUInt16LE(i + 6);
    const method = buf.readUInt16LE(i + 8);
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    out.push({ name: buf.slice(i + 30, i + 30 + nameLen).toString('utf8'), method, flags });
    i += 30 + nameLen + extraLen + (flags & 8 ? 0 : size);
  }
  return out;
}

test('zip-link: one group = one store-only ZIP of that group\'s stamped files, signed 15 min, cached', async () => {
  const h = await harness({ owned: [['u1', 'pack_subject:maths']] });
  const r = await h.zip({ packId: 'pack_subject:maths', group: 'real-numbers' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.files.map((f) => f.fileId), ['pack_subject:maths|real-numbers|ct1-questions', 'pack_subject:maths|real-numbers|ct1-answers', 'pack_subject:maths|real-numbers|ws-questions']);
  const zipPath = h.signed[0].path;
  assert.match(zipPath, /^stamped\/u1\/c0ffee\/zip\//);
  assert.equal(h.signed[0].expires - NOW, 15 * 60 * 1000);
  assert.equal(h.signed[0].responseType, 'application/zip');
  assert.equal(r.body.filename, 'lazytopper-real-numbers.zip');
  const entries = zipEntries(h.objects.get(zipPath).bytes);
  assert.deepEqual(entries.map((e) => e.name), ['LazyTopper - Real Numbers - Chapter Test 1.pdf', 'LazyTopper - Real Numbers - Chapter Test 1 answers.pdf', 'LazyTopper - Real Numbers - Worksheet.pdf']);
  assert.ok(entries.every((e) => e.method === 0), 'store-only: PDFs are already compressed');
  // the other group is not in it
  assert.ok(!entries.some((e) => /Polynomials/.test(e.name)));
  // R1 for every paper in the group
  assert.deepEqual(r.body.papers.map((p) => p.code).sort(), ['PK-M-RN-CT1', 'PK-M-RN-WS']);
  const before = h.writes.length;
  await h.zip({ packId: 'pack_subject:maths', group: 'real-numbers' });
  assert.equal(h.writes.length, before, 'the second request builds nothing');
  assert.equal((await h.zip({ packId: 'pack_subject:maths', group: 'nope' })).status, 404);
  assert.equal((await h.zip({ packId: CH, group: 'real-numbers' })).body.error, 'not_owned');
});

test('zip-link GUEST-ZIP-1: the internal "__all__" group is EVERY file of the pack in one ZIP, named for the pack; a real group is unchanged', async () => {
  const h = await harness({ owned: [['u1', 'pack_subject:maths']] });
  const r = await h.zip({ packId: 'pack_subject:maths', group: '__all__' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.files.length, 4, 'both chapters: real-numbers (3) + polynomials (1)');
  assert.equal(r.body.filename, 'lazytopper-pack-subject-maths.zip');
  const entries = zipEntries(h.objects.get(h.signed[0].path).bytes);
  assert.equal(entries.length, 4);
  assert.ok(entries.some((e) => /Polynomials/.test(e.name)) && entries.some((e) => /Real Numbers/.test(e.name)));
  assert.equal((await h.zip({ packId: CH, group: '__all__' })).body.error, 'not_owned', 'still only a pack the caller owns');
  assert.equal((await h.zip({ packId: 'pack_subject:maths', group: 'real-numbers' })).body.files.length, 3);
});

// ---- the download feed -----------------------------------------------------------------------------------------------------------
test('download feed: one pack_download entry per file served (a ZIP: one per file), in the shape moveToOther reads', async () => {
  const h = await harness({ owned: [['u1', 'pack_subject:maths']] });
  const day = '2026-11-12';
  const feed = () => (h.firestore.docs.get(`activityLog/u1/activityDays/${day}`) || {}).feed || [];
  assert.equal(await packDownloadedSince(h.firestore, 'u1', PAID, NOW), false);
  await h.link({ packId: 'pack_subject:maths', fileId: 'pack_subject:maths|real-numbers|ct1-questions' });
  assert.equal(feed().length, 1);
  assert.deepEqual(Object.keys(feed()[0]).sort(), ['k', 'n', 't']);
  assert.deepEqual([feed()[0].k, feed()[0].n, feed()[0].t], ['event', 'pack_download', NOW]);
  assert.equal(await packDownloadedSince(h.firestore, 'u1', PAID, NOW), true, 'a move after a download is refused, as for the client event');
  await h.zip({ packId: 'pack_subject:maths', group: 'real-numbers' });
  assert.equal(feed().length, 1 + 3);
  assert.equal(h.firestore.docs.get(`activityLog/u1/activityDays/${day}`).events.pack_download, 4);
  // a refused request records nothing
  await h.link({ packId: 'pack_subject:maths', fileId: 'pack_subject:maths|nope' });
  assert.equal(feed().length, 4);
});

// ---- the stamp ---------------------------------------------------------------------------------------------------------------------
const fonts = () => loadFonts(fontEntries);
const text = async (doc, i) => {
  const page = doc.getPage(i);
  const c = page.node.lookupMaybe(PDFName.of('Contents'), PDFArray, require('pdf-lib').PDFRawStream, require('pdf-lib').PDFStream);
  if (!c) return '';
  const streams = c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r)) : [c];
  return streams.map((s) => { const raw = Buffer.from(s.getContents ? s.getContents() : s.contents); try { return require('node:zlib').inflateSync(raw).toString('latin1'); } catch { return raw.toString('latin1'); } }).join('\n');
};

test('stamp: the footer licence line is on every body page and only those; the cover and bridge pages carry none', async () => {
  const bytes = await stampTemplate({
    templateBytes: await blankPdf(7, 't'), marks: MARKS, fonts: fonts(), nowMs: NOW,
    buyer: { name: 'Test Student', contact: 'test.student@gmail.com', orderId: 'order_TEST123', paidAtMs: PAID },
  });
  const doc = await PDFDocument.load(bytes);
  const has = async (i) => /Tj/.test(await text(doc, i)) && (await text(doc, i)).toUpperCase().includes('4F72646572'); // "Order"
  for (const i of [0, 1, 2]) assert.equal(await has(i), false, `page ${i + 1} carries no licence line`);
  for (const i of [3, 4, 5, 6]) assert.equal(await has(i), true, `page ${i + 1} carries it`);
  // the cover got ink (licence, re-download date, Edition as outlines), pages 2-3 did not
  assert.ok((await text(doc, 0)).length > (await text(await PDFDocument.load(await blankPdf(7, 't')), 0)).length);
  // "Generated <date>" lands on the recorded page only
  assert.ok((await text(doc, 3)).length > (await text(doc, 4)).length);
});

const BUYER = { name: 'A', contact: 'a@b.in', orderId: 'o', paidAtMs: PAID };
const stampWith = async (over = {}, templatePages = 7) =>
  stampTemplate({ templateBytes: await blankPdf(templatePages, 't'), marks: MARKS, fonts: fonts(), nowMs: NOW, buyer: BUYER, ...over });
const notReady = (re = /not_ready/) => (e) => e.code === 'not_ready' && re.test(e.message);

test('fail closed: a template that lacks any mark the stamp needs is never returned (not_ready)', async () => {
  await assert.rejects(stampWith({ marks: { ...MARKS, footer: undefined } }), notReady());
  await assert.rejects(stampWith({ marks: { ...MARKS, cover: undefined } }), notReady());
  await assert.rejects(stampWith({ marks: { ...MARKS, cover2: undefined } }), notReady());
  for (const name of ['licence', 'textcol', 'redownload', 'edition']) {
    const bad = { ...MARKS, cover: { ...MARKS.cover, stamps: MARKS.cover.stamps.filter((x) => x.name !== name) } };
    await assert.rejects(stampWith({ marks: bad }), notReady(new RegExp(name)), `cover without ${name}`);
  }
  // a footer range that points past the file, or a generated-date mark on a page that is not there
  await assert.rejects(stampWith({ marks: { ...MARKS, footer: { ...MARKS.footer, lastPage: 9 } } }), notReady());
  await assert.rejects(stampWith({ marks: { ...MARKS, body: [{ ...MARKS.body[0], page: 40 }] } }), notReady());
  // the template does not have the page count its marks say (no two-line cover appended, or extra pages)
  await assert.rejects(stampWith({}, 6), notReady());
  await assert.rejects(stampTemplate({ templateBytes: await blankPdf(7, 't', false), marks: MARKS, fonts: fonts(), nowMs: NOW, buyer: BUYER }), notReady());
  // a font the cover needs is missing
  await assert.rejects(stampWith({ fonts: {} }), notReady(/font/));
});

test('fail closed: bridge pages that are required but absent or the wrong size are never replaced by the template\'s blank ones', async () => {
  await assert.rejects(stampWith({ requireBridge: true }), notReady(/bridge/));
  await assert.rejects(stampWith({ requireBridge: true, bridgeBytes: await blankPdf(1, 'b', false) }), notReady(/bridge/));
  await assert.rejects(stampWith({ bridgeBytes: await blankPdf(3, 'b', false) }), notReady(/bridge/));
  const ok = await stampWith({ requireBridge: true, bridgeBytes: await bridgePdf(['https://x.in/a', 'https://x.in/b']) });
  assert.equal((await PDFDocument.load(ok)).getPageCount(), 7);
});

test('the right cover: a one-line licence keeps the one-line cover; a two-line one moves the two-line cover to page 1', async () => {
  const w0 = async (buyer) => (await PDFDocument.load(await stampWith({ buyer }))).getPage(0).getWidth();
  assert.ok(Math.abs((await w0({ name: 'Asha', contact: 'a@x.in', orderId: 'order_1', paidAtMs: PAID })) - A4[0]) < 0.01, 'one-line cover');
  assert.equal(await w0({ name: 'Priya Venkataraman', contact: 'priya.venkataraman.10b@gmail.com', orderId: 'order_RxkLm3ab9QzP1x', paidAtMs: PAID }), 600, 'two-line cover');
  const doc = await PDFDocument.load(await stampWith({ buyer: { name: 'Priya Venkataraman', contact: 'priya.venkataraman.10b@gmail.com', orderId: 'order_RxkLm3ab9QzP1x', paidAtMs: PAID } }));
  assert.equal(doc.getPageCount(), 7, 'the unused cover is gone either way');
  assert.ok(doc.getPages().slice(1).every((p) => Math.abs(p.getWidth() - A4[0]) < 0.01));
});

test('stamp: the bridge swap keeps its link annotations on pages 2 and 3 and leaves the other pages alone', async () => {
  const bridge = await bridgePdf(['https://www.lazytopper.com/pricing', 'https://www.lazytopper.com/packs#my-packs']);
  const template = await blankPdf(7, 't');
  const bytes = await stampTemplate({ templateBytes: template, marks: MARKS, fonts: fonts(), nowMs: NOW, bridgeBytes: bridge, buyer: { name: 'A', contact: 'a@b.in', orderId: 'o', paidAtMs: PAID } });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 7);
  assert.deepEqual(uriOf(doc.getPage(1)), ['https://www.lazytopper.com/pricing']);
  assert.deepEqual(uriOf(doc.getPage(2)), ['https://www.lazytopper.com/packs#my-packs']);
  for (const i of [0, 3, 4, 5, 6]) assert.deepEqual(uriOf(doc.getPage(i)), []);
});

test('cover licence: the FULL line is tried on one line, then on two lines; only then is it shortened (never before)', async () => {
  const f = fonts();
  const font = fontOf(f['Inter-700']);
  const k = MARKS.cover.mmPerPx;
  const widthPx = MARKS.cover.stamps[0].wMm / k;
  const measure = (t) => (widthOf(font, t, 13 * k * (72 / 25.4)) * (25.4 / 72)) / k;
  const fitOf = (l) => fitCoverLicence(l, widthPx, measure);
  const real = (name, email, orderId) => ({ name, email, orderId });
  // short: one line, full text
  const one = fitOf(real('Asha', 'asha@x.in', 'order_1'));
  assert.equal(one.variant, 1);
  assert.equal(one.lines.join(' '), 'Licensed to Asha \u00b7 asha@x.in \u00b7 Order order_1 \u2014 personal use only');
  // REAL-length buyers (full masked e-mail, order_ + 14 chars): two lines, the FULL name and e-mail survive
  for (const [name, email] of [['Aarav Sharma', 'fu\u2022\u2022\u2022@gmail.com'], ['Priya Venkataraman', 'priya.venkataraman.10b@gmail.com'], ['Aarav Sharma', 'aarav.sharma2010@gmail.com'], ['Ishita Gupta', 'ishitagupta@gmail.com']]) {
    const fit = fitOf(real(name, email, 'order_Pq7XyZ12AbCdEf'));
    assert.ok(fit.variant === 1 || fit.variant === 2, name);
    const joined = fit.lines.join(' ');
    assert.ok(joined.includes(name), `${name}: the full name survives`);
    assert.ok(joined.includes(email), `${name}: the full e-mail survives`);
    assert.ok(!joined.includes('...'), `${name}: nothing is cut`);
    assert.ok(fit.lines.every((x) => measure(x) <= widthPx + 0.01));
  }
  // a line that is THREE lines at 13px is shortened (name, then e-mail) until it is two - and the order id is never cut
  const long = real('Venkata Subramanian Raghunathan Iyer', 'venkata.subramanian.raghunathan.iyer@example-school.edu.in', 'order_PlaceholderOrder0000');
  assert.ok(measure(`Licensed to ${long.name} \u00b7 ${long.email} \u00b7 Order ${long.orderId} \u2014 personal use only`) > 2 * widthPx, 'more than two lines at 13px');
  const fit = fitOf(long);
  assert.equal(fit.variant, 2);
  assert.match(fit.lines.join(' '), /\.\.\./);
  assert.match(fit.lines.join(' '), /Order order_PlaceholderOrder0000 \u2014 personal use only$/);
  // wrapping is at spaces, like the CSS: the lines rejoin into the original text
  const real2 = fitOf(real('Priya Venkataraman', 'priya.venkataraman.10b@gmail.com', 'order_RxkLm3ab9QzP1x'));
  assert.equal(real2.lines.join(' '), 'Licensed to Priya Venkataraman \u00b7 priya.venkataraman.10b@gmail.com \u00b7 Order order_RxkLm3ab9QzP1x \u2014 personal use only');
  // absurd inputs still end at two lines, a masked phone included
  assert.ok(fitOf(real('N'.repeat(120), `${'e'.repeat(120)}@x.in`, 'order_1')).lines.length <= 2);
  assert.ok(fitOf(real('', '+91 98\u2022\u2022\u2022\u2022\u2022948', 'order_1')).lines.length <= 2);
});

test('cover licence wraps like today\'s CSS (R1): breaks after "-" and "/", inside a too-long token as a last resort, BEFORE any shortening', async () => {
  const f = fonts();
  const font = fontOf(f['Inter-700']);
  const k = MARKS.cover.mmPerPx;
  const widthPx = MARKS.cover.stamps[0].wMm / k;
  const measure = (t) => (widthOf(font, t, 13 * k * (72 / 25.4)) * (25.4 / 72)) / k;
  const fitOf = (l) => fitCoverLicence(l, widthPx, measure);
  const squash = (t) => t.replace(/\s+/g, '');
  const full = (l) => licenseeLine(l);
  // the 7 cases of the PR-B review
  const cases = [
    [{ name: 'Aarav Sharma', email: 'fu\u2022\u2022\u2022@gmail.com', orderId: 'order_Qx7LmN2pRt9Vb3' }, 2],
    [{ name: 'Priya Venkataraman', email: 'pr\u2022\u2022\u2022@gmail.com', orderId: 'order_Kd4HsW8cYz1Ne6' }, 2],
    [{ name: 'Asha', email: 'asha@x.in', orderId: 'order_1' }, 1],
    [{ name: '', email: '+91 98\u2022\u2022\u2022\u2022\u2022948', orderId: 'order_1' }, 1],
    [{ name: 'Ananya Rao', email: 'ananya-rao-class10b-section-a@gmail.com', orderId: 'order_Qx7LmN2pRt9Vb3' }, 2],
    [{ name: 'Mohammed Abdul Rahman Siddiqui Khan', email: 'mohammed.abdul.rahman.siddiqui.khan.2010@school.in', orderId: 'order_Qx7LmN2pRt9Vb3' }, 'shortened'],
    [{ name: 'Ananya K', email: 'ananya.krishnamurthy-venkatasubramanian-class-ten-b-section@gmail.com', orderId: 'order_Qx7LmN2pRt9Vb3' }, 2],
  ];
  for (const [l, want] of cases) {
    const fit = fitOf(l);
    assert.ok(fit.lines.length <= 2 && fit.lines.every((x) => measure(x) <= widthPx + 0.01), l.email);
    assert.match(fit.lines.join(' '), /personal use only$/);
    assert.ok(fit.lines.join(' ').includes(l.orderId), 'order id intact');
    if (want === 'shortened') assert.match(fit.lines.join(' '), /\.\.\./);
    else {
      assert.equal(fit.variant, want, l.email);
      assert.equal(squash(fit.lines.join('')), squash(full(l)), `${l.email}: nothing cut`);
    }
  }
  // the ~70-char hyphenated e-mail keeps its FULL name and e-mail on two lines (today's browser shows the full line on two lines)
  const long = cases[6][0];
  const fit = fitOf(long);
  assert.equal(fit.variant, 2);
  assert.ok(!fit.lines.join('').includes('...'));
  assert.ok(fit.lines[0].includes('Licensed to Ananya K'));
  // a break after "-" is allowed, "/" too, but not before a digit
  const narrow = (t) => fitCoverLicence({ name: 'A', email: t, orderId: 'o' }, widthPx, measure);
  assert.equal(squash(narrow('a-b/c-d@x.in').lines.join('')), squash(full({ name: 'A', email: 'a-b/c-d@x.in', orderId: 'o' })));
  // a token wider than a whole line breaks inside as a last resort (overflow-wrap) - nothing is shortened while it fits two lines
  const tok = 'x'.repeat(60);
  const t = fitOf({ name: 'Al', email: `${tok}@gmail.com`, orderId: 'order_1' });
  assert.ok(t.lines.length <= 2);
  assert.ok(t.lines.every((x) => measure(x) <= widthPx + 0.01));
});

test('footer fit: the browser build\'s ladder (10 -> 9 pt, then name, then e-mail shortened; Latin-1 only; bullets become "*")', async () => {
  const w = jspdfWidthMm; // the browser build's own metrics
  const a = fitFooter({ name: 'Asha Rao', email: 'asha@example.in', orderId: 'order_1' }, 164, [10, 9.5, 9], w);
  assert.equal(a.size, 10);
  assert.equal(a.text, 'Licensed to Asha Rao · asha@example.in · Order order_1 — personal use only');
  const phone = fitFooter({ name: '', email: '+91 98•••••948', orderId: 'order_1' }, 164, [10, 9.5, 9], w);
  assert.match(phone.text, /\+91 98\*\*\*\*\*948/);
  const long = fitFooter({ name: 'Venkata Subramanian Raghunathan Iyer', email: 'venkata.subramanian.raghunathan.iyer@example-school.edu.in', orderId: 'order_PlaceholderOrder0000' }, 164, [10, 9.5, 9], w);
  assert.ok(w(long.text, long.size) <= 164);
  assert.match(long.text, /Order order_PlaceholderOrder0000 — personal use only$/);
  assert.equal(fitFooter({ name: 'Zoë नमस्ते', email: 'z@x.in', orderId: 'o' }, 164, [10], w).text, 'Licensed to Zoë · z@x.in · Order o — personal use only');
});

// ---- covering pack -----------------------------------------------------------------------------------------------------------------
test('covering pack: the most specific owned pack names the order and the paid date', async () => {
  const w = await world();
  const own = (id, o = {}) => ({ packId: id, sku: id.split(':')[0], target: id.split(':')[1], paidAt: PAID, orderId: `order_${id}`, ...o });
  const pick = (owned, packId, tid) => buyerRefFor(w.manifest, owned, packId, tid);
  // a chapter pack + the subject pack: the chapter pack wins for its chapter, the subject pack covers the rest
  const both = [own(CH, { paidAt: 1 }), own('pack_subject:maths', { paidAt: 2 })];
  assert.deepEqual(pick(both, 'pack_subject:maths', 'real-numbers|ct1-questions'), { orderId: `order_${CH}`, paidAtMs: 1 });
  assert.deepEqual(pick(both, 'pack_subject:maths', 'polynomials|ct1-questions'), { orderId: 'order_pack_subject:maths', paidAtMs: 2 });
  // the bundle covers a mock when nothing narrower is owned; a mock pack wins over it
  assert.equal(pick([own('pack_bundle:all')], 'pack_bundle:all', 'mock-maths-1-questions').orderId, 'order_pack_bundle:all');
  assert.equal(pick([own('pack_bundle:all'), own('pack_mock:maths')], 'pack_bundle:all', 'mock-maths-1-questions').orderId, 'order_pack_mock:maths');
  // no order id on the entitlement: the pack id is printed; an unknown paid time stays unknown
  assert.deepEqual(pick([own(CH, { orderId: undefined, paidAt: undefined })], CH, 'real-numbers|ct1-questions'), { orderId: CH, paidAtMs: undefined });
  assert.equal(templateIdForPackFile('pack_cbq:maths', 'pack_cbq:maths|intro'), 'cbq-maths|intro');
  assert.equal(fileIdFor('pack_cbq:maths', 'cbq-maths|intro'), 'pack_cbq:maths|intro');
  assert.equal(templateIdForPackFile(CH, 'pack_chapter:other|x'), null);
});

test('footer run: printed as wide as the browser build measured it (character spacing makes up the ~1% metric difference)', async () => {
  const { StandardFonts } = require('pdf-lib');
  const probe = await PDFDocument.create();
  const helv = await probe.embedFont(StandardFonts.Helvetica);
  const buyer = { name: 'Test Student', contact: 'test.student@gmail.com', orderId: 'order_TEST123', paidAtMs: PAID };
  const bytes = await stampTemplate({ templateBytes: await blankPdf(7, 't'), marks: MARKS, fonts: fonts(), nowMs: NOW, buyer });
  const doc = await PDFDocument.load(bytes);
  const stream = await text(doc, 3);
  const tc = Number(/([-\d.]+) Tc/.exec(stream)[1]);
  const line = 'Licensed to Test Student \u00b7 test.student@gmail.com \u00b7 Order order_TEST123 \u2014 personal use only';
  const drawnMm = helveticaWidthMm(helv, line, 10) + (Array.from(line).length * tc) * (25.4 / 72);
  assert.ok(Math.abs(drawnMm - jspdfWidthMm(line, 10)) < 0.01, `${drawnMm} vs ${jspdfWidthMm(line, 10)}`);
  assert.match(stream, /q\n/, 'inside its own graphics state: the spacing never leaks to other text');
});

// ---- fail closed, at the route ------------------------------------------------------------------------------------------------------
const editManifest = (h, fn) => {
  const m = JSON.parse(h.objects.get('packs/manifests/c0ffee.json').bytes.toString('utf8'));
  fn(m);
  h.objects.set('packs/manifests/c0ffee.json', { bytes: Buffer.from(JSON.stringify(m)), metadata: {} });
};
const refused = (r) => assert.deepEqual([r.status, r.body.error], [503, 'not_ready']);

test('route: a template without footer marks, or with a mark missing, answers 503 not_ready - nothing saved, signed or counted', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  editManifest(h, (m) => { delete m.files['real-numbers|ct1-questions'].marks.footer; });
  refused(await h.link({ packId: CH, fileId: CT1 }));
  assert.equal(h.writes.length, 0);
  assert.equal(h.signed.length, 0);
  assert.equal(h.firestore.docs.has('activityLog/u1/activityDays/2026-11-12'), false, 'no download recorded');
  const z = await h.zip({ packId: CH, group: 'real-numbers' });
  refused(z);
  assert.equal(h.signed.length, 0);
});

test('route: a file with bridge pages but no bridge variants in the manifest is never stamped with blank pages 2-3', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  editManifest(h, (m) => { delete m.packs[CH].bridge['real-numbers|ct1-questions']; });
  refused(await h.link({ packId: CH, fileId: CT1 }));
  const h2 = await harness({ owned: [['u1', CH]] });
  editManifest(h2, (m) => { delete m.bridges.card; });
  refused(await h2.link({ packId: CH, fileId: CT1 }));
  assert.equal(h.writes.length + h2.writes.length, 0);
});

test('route: a font file that does not match the manifest is 503 not_ready, not a 500', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  editManifest(h, (m) => { m.fonts[0].sha256 = '0'.repeat(64); });
  refused(await h.link({ packId: CH, fileId: CT1 }));
  const h2 = await harness({ owned: [['u1', CH]] });
  editManifest(h2, (m) => { m.fonts[0].file = 'lazytopper/scripts/packTemplates/fonts/nope.otf'; });
  refused(await h2.link({ packId: CH, fileId: CT1 }));
});

test('route: at most 3 requests of one buyer run at once (429 for the rest); another buyer is not blocked', async () => {
  const h = await harness({ owned: [['u1', CH], ['u2', CH]] });
  h.delay.ms = 40;
  const rs = await Promise.all([1, 2, 3, 4].map(() => h.link({ packId: CH, fileId: CT1 })));
  assert.equal(rs.filter((r) => r.status === 429).length, 1);
  assert.equal(rs.filter((r) => r.status === 200).length, 3);
  assert.equal((await h.link({ packId: CH, fileId: CT1 }, 'u2')).status, 200);
});

test('Board Pass card rule is the entitlement gate\'s: a stray passEnd on a free document keeps the card; a running paid pass drops it', async () => {
  const stray = await harness({ owned: [['u1', CH]], subscription: { tier: 'free', passEnd: new Date(NOW + 90 * 86400000) } });
  await stray.link({ packId: CH, fileId: CT1 });
  assert.deepEqual(uriOf((await PDFDocument.load(stray.objects.get(stray.writes[0]).bytes)).getPage(1)), ['https://www.lazytopper.com/pricing'], 'card');
  const ended = await harness({ owned: [['u1', CH]], subscription: { tier: 'premium', passType: 'till_boards', passEnd: new Date(NOW - 86400000) } });
  await ended.link({ packId: CH, fileId: CT1 });
  assert.deepEqual(uriOf((await PDFDocument.load(ended.objects.get(ended.writes[0]).bytes)).getPage(1)), ['https://www.lazytopper.com/pricing'], 'an ended pass shows the card');
});

test('rate limit: a full table evicts the oldest buyers only; everyone else keeps their count', async () => {
  const h = await harness({ owned: [['u1', CH]] });
  // 240 links an hour per buyer: the 241st is refused ...
  for (let i = 0; i < 240; i += 1) assert.equal((await h.link({ packId: CH, fileId: CT1 })).status, 200);
  assert.equal((await h.link({ packId: CH, fileId: CT1 })).status, 429);
  // ... and 6000 other buyers hitting the route (refused as not owned, but counted by uid only after ownership) do not reset u1
  for (let i = 0; i < 6; i += 1) await h.link({ packId: CH, fileId: CT1 }, `other${i}`);
  assert.equal((await h.link({ packId: CH, fileId: CT1 })).status, 429);
});

// ---- BONUS-BOOK-1: the CBQ Pack's complete-book bonus PDF ------------------------------------------------------------------
const CBQ_M = 'pack_cbq:maths';
const BONUS_M = 'packs/bonus/cbq-maths-complete-book.pdf';
async function bonusHarness(opts = {}, upload = true) {
  const h = await harness(opts);
  if (upload) h.objects.set(BONUS_M, { bytes: Buffer.from('%PDF-1.4 book'), metadata: {} });
  return { ...h, bonus: (b, uid) => h.call('handleBonusLink', b, uid), mine: (uid) => h.call('handleMine', {}, uid) };
}

test('bonus-link: a Maths CBQ Pack owner gets a signed link to the uploaded Maths book (one download recorded)', async () => {
  const h = await bonusHarness({ owned: [['u1', CBQ_M]] });
  const r = await h.bonus({ packId: CBQ_M });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.filename, 'LazyTopper-CBQ-Maths-Complete-Book.pdf');
  assert.deepEqual(r.body.papers, []);
  assert.equal(h.signed.length, 1);
  assert.equal(h.signed[0].path, BONUS_M);
  assert.ok(h.events.includes('packs.bonus_link.issued'));
  const feed = [...h.firestore.docs].filter(([k]) => k.includes('/activityDays/')).map(([, v]) => v.events && v.events.pack_download);
  assert.deepEqual(feed, [1]); // one pack_download feed entry, like any pack file
  assert.equal(h.writes.length, 0); // nothing stamped or written to the bucket
});

test('bonus-link: same entitlement as every pack file - not owned 403, signed out 401, other subject 403, non-CBQ pack 404, window ended 403', async () => {
  const h = await bonusHarness({ owned: [['u2', CBQ_M], ['u1', 'pack_subject:maths'], ['u1', 'pack_bundle:all']] });
  assert.equal((await h.bonus({ packId: CBQ_M })).body.error, 'not_owned');
  assert.equal((await h.bonus({ packId: CBQ_M }, '')).status, 401);
  assert.equal((await h.bonus({ packId: 'pack_cbq:science' })).status, 403);
  assert.equal((await h.bonus({ packId: 'pack_subject:maths' })).status, 404);
  assert.equal((await h.bonus({ packId: 'pack_bundle:all' })).status, 404);
  assert.equal((await h.bonus({ packId: 42 })).status, 400);
  assert.equal(h.signed.length, 0);
  const late = await bonusHarness({ owned: [['u1', CBQ_M]], now: Date.parse('2027-06-02T12:00:00+05:30') });
  assert.equal((await late.bonus({ packId: CBQ_M })).body.error, 'redownload_ended');
  assert.equal(late.signed.length, 0);
});

test('bonus-link: not uploaded yet -> 503 not_ready and nothing signed; kill switches -> 404', async () => {
  const h = await bonusHarness({ owned: [['u1', CBQ_M]] }, false);
  assert.equal((await h.bonus({ packId: CBQ_M })).status, 503);
  assert.equal(h.signed.length, 0);
  for (const env of [{ BONUS_BOOK_DISABLED: '1' }, { PACK_SERVER_PDF_DISABLED: 'true' }]) {
    const off = await bonusHarness({ owned: [['u1', CBQ_M]], env });
    assert.equal((await off.bonus({ packId: CBQ_M })).status, 404);
    assert.equal(off.signed.length, 0);
  }
});

test('/mine bonusBooks: listed only for an owned CBQ Pack whose book is uploaded; absent otherwise (row hidden)', async () => {
  const yes = await bonusHarness({ owned: [['u1', CBQ_M], ['u1', 'pack_cbq:science']] });
  assert.deepEqual((await yes.mine()).body.bonusBooks, [CBQ_M]); // the Science book is not uploaded
  const notUp = await bonusHarness({ owned: [['u1', CBQ_M]] }, false);
  assert.equal('bonusBooks' in (await notUp.mine()).body, false);
  const nonCbq = await bonusHarness({ owned: [['u1', 'pack_subject:maths']] });
  assert.equal('bonusBooks' in (await nonCbq.mine()).body, false);
  const off = await bonusHarness({ owned: [['u1', CBQ_M]], env: { BONUS_BOOK_DISABLED: 'on' } });
  assert.equal('bonusBooks' in (await off.mine()).body, false);
});
