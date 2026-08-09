/**
 * accountExport.test.cjs — guards for the DPDP map-walking data export.
 *
 * Run: node --test lazytopper/server/services/accountExport.test.cjs
 *
 * ★★ THE PROPERTY THAT MATTERS MOST is not "data comes back". It is that EVERY
 * location the map names is accounted for in the output — as data when we can read
 * it, and as a DISCLOSURE when we cannot. A file that silently omits the one location
 * we cannot export tells a parent, by its silence, that the location does not exist.
 * Every disclosure assertion below exists for that one sentence.
 *
 * ★ THE SECOND PROPERTY: the list is the MAP, not a copy of it. The fixture-map
 * control below grows a fixture by one entry and demands the new entry appear. A
 * hardcoded list passes every other test in this file and fails that one.
 *
 * ★ CONTROLS RUN IN BOTH DIRECTIONS on the exclusion, because one direction is not
 * enough: there is a test that goes red if the excluded location LEAKS INTO THE DATA,
 * and a separate test that goes red if its DISCLOSURE GOES MISSING. Passing one while
 * failing the other is a real, shippable defect in each direction.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAccountExportService,
  toPlainJson,
  plainHolds,
  storagePrefixFor,
  EXPORT_STATUS,
  README_LINES,
  DISCLOSURE_THIRD_PARTY,
  DISCLOSURE_NOT_EXPORTABLE,
  DISCLOSURE_CLIENT_LOCAL,
  PLAN_CONCURRENCY,
  READ_CONCURRENCY,
  mapWithConcurrency,
} = require('./accountExport.cjs');

const { loadStudentDataMap } = require('./accountErasure.cjs');
const { redactErrorDetails } = require('./httpUtils.cjs');

/* ── in-memory Firestore, read-shaped ──────────────────────────────────────────
   Paths are the keys, exactly as Firestore addresses them, so an assertion can name
   `learnerProfiles/u1/sessions/s1/messages/m1` literally. `listDocuments()` returns
   ancestor paths that hold no fields of their own — real Firestore's "missing
   documents", the shape a `get()` cannot see.
   ─────────────────────────────────────────────────────────────────────────────── */
function makeFirestore(seed = {}, failOnGet = null) {
  const docs = new Map(Object.entries(seed));
  const queriedByField = [];
  const readPaths = [];

  function docRef(fullPath) {
    return {
      path: fullPath,
      id: fullPath.split('/').pop(),
      collection: (name) => collRef(`${fullPath}/${name}`),
      async get() {
        if (failOnGet && failOnGet === fullPath) throw new Error('simulated read failure');
        readPaths.push(fullPath);
        return { exists: docs.has(fullPath), id: this.id, ref: this, data: () => docs.get(fullPath) };
      },
    };
  }

  function childDocPaths(collPath) {
    const prefix = `${collPath}/`;
    const out = new Set();
    for (const p of docs.keys()) {
      if (!p.startsWith(prefix)) continue;
      out.add(prefix + p.slice(prefix.length).split('/')[0]);
    }
    return [...out];
  }

  function snapshotOf(paths) {
    return {
      empty: paths.length === 0,
      size: paths.length,
      docs: paths.map((p) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => docs.get(p) })),
    };
  }

  function collRef(collPath) {
    return {
      path: collPath,
      doc: (id) => docRef(`${collPath}/${id}`),
      async listDocuments() {
        return childDocPaths(collPath).map(docRef);
      },
      async get() {
        return snapshotOf(childDocPaths(collPath).filter((p) => docs.has(p)));
      },
      where(field, op, value) {
        queriedByField.push({ collection: collPath, field, op, value });
        return {
          async get() {
            return snapshotOf(
              childDocPaths(collPath).filter(
                (p) => docs.has(p) && op === '==' && docs.get(p) && docs.get(p)[field] === value
              )
            );
          },
        };
      },
    };
  }

  return { db: { collection: collRef }, docs, queriedByField, readPaths };
}

function makeBucket(files = []) {
  return {
    async getFiles({ prefix }) {
      return [
        files
          .filter((f) => f.name.startsWith(prefix))
          .map((f) => ({
            name: f.name,
            metadata: { size: f.size ?? f.body.length, contentType: f.contentType || 'image/jpeg', updated: '2026-08-09T00:00:00.000Z' },
            async download() {
              return [Buffer.from(f.body)];
            },
          })),
      ];
    },
  };
}

function makeAdmin(bucket, users = {}) {
  return {
    auth: () => ({
      async getUser(uid) {
        if (!Object.prototype.hasOwnProperty.call(users, uid)) {
          const e = new Error('There is no user record corresponding to the provided identifier.');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return users[uid];
      },
    }),
    storage: () => ({ bucket: () => bucket }),
  };
}

const UID = 'student-uid-1';
const OTHER = 'other-student-uid';

/** A seed that puts at least one document under every readable real-map location. */
function realSeed(uid = UID) {
  return {
    [`users/${uid}`]: { email: 'child@example.test' },
    [`learnerProfiles/${uid}`]: { goal: 'board exam' },
    [`learnerProfiles/${uid}/sessions/s1`]: { startedAt: 1 },
    [`learnerProfiles/${uid}/sessions/s1/messages/m1`]: { text: 'why is this wrong?' },
    [`learnerProfiles/${uid}/sessions/s1/messages/m2`]: { text: 'thanks' },
    [`learnerProfiles/${uid}/mistakeLogs/l1`]: { concept: 'ohms-law' },
    [`learnerProfiles/${uid}/savedWorksheets/w1`]: {},
    [`learnerProfiles/${uid}/worksheetActivity/a1`]: {},
    [`sessionRecords/${uid}`]: {},
    [`sessionRecords/${uid}/records/r1`]: { score: 17 },
    [`sessionRecords/${uid}/perQuestion/q1`]: { typed: 'V = IR' },
    [`sessionRecords/${uid}/fullMockPapers/p1`]: {},
    [`practiceInsights/${uid}`]: {},
    [`practiceInsights/${uid}/attempts/at1`]: { correct: false },
    [`mockScoreHistory/${uid}`]: {},
    [`mockScoreHistory/${uid}/entries/e1`]: { score: 61 },
    [`weakAreaSummary/${uid}`]: {},
    [`topicMastery/${uid}`]: {},
    [`learnerProgress/${uid}`]: {},
    [`srSchedules/${uid}`]: {},
    [`learningPaths/${uid}`]: {},
    [`dashboardPrefs/${uid}`]: {},
    [`tutorSessions/${uid}`]: {},
    [`tutorSessions/${uid}/topics/electricity`]: {},
    [`subscriptions/${uid}`]: { tier: 'free' },
    // ★ FIELD-KEYED. The doc id is sha256(uploadToken); the student is a `uid` FIELD.
    'qrUploadSlots/sha-aaa': { uid, storagePath: `qr-uploads/${uid}/sha-aaa.jpg` },
    'qrUploadSlots/sha-bbb': { uid, storagePath: `qr-uploads/${uid}/sha-bbb.jpg` },
    // Another student's slot — must never appear in this student's export.
    'qrUploadSlots/sha-zzz': { uid: OTHER, storagePath: `qr-uploads/${OTHER}/sha-zzz.jpg` },
  };
}

function makeService(opts = {}) {
  const store = makeFirestore(opts.seed === undefined ? realSeed() : opts.seed, opts.failOnGet || null);
  const bucket = makeBucket(
    opts.files === undefined
      ? [
          { name: `qr-uploads/${UID}/sha-aaa.jpg`, body: 'AAA-image-bytes' },
          { name: `qr-uploads/${UID}/sha-bbb.jpg`, body: 'BBB-image-bytes' },
          { name: `qr-uploads/${OTHER}/sha-zzz.jpg`, body: 'ZZZ-image-bytes' },
        ]
      : opts.files
  );
  const admin = makeAdmin(
    bucket,
    opts.users === undefined
      ? { [UID]: { uid: UID, email: 'child@example.test', displayName: 'A Student' } }
      : opts.users
  );
  const service = createAccountExportService({
    firebaseAdmin: admin,
    adminFirestore: store.db,
    locations: opts.locations,
    resolveBucketName: () => 'test-bucket',
    maxFileBytes: opts.maxFileBytes,
    maxTotalFileBytes: opts.maxTotalFileBytes,
  });
  return { service, store, bucket, admin };
}

const byId = (result, id) => result.locations.find((r) => r.id === id);
const disclosureFor = (result, id) => result.disclosures.find((d) => d.id === id);

/* ══════════════════════════════════════════════════════════════════════════════
   1 · THE MAP FIGURES — read at the time, never carried
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the map partitions the way this module assumes — re-derived, not carried', () => {
  const L = loadStudentDataMap();
  const notExportable = L.filter((l) => l.exportable === false);
  const thirdParty = L.filter((l) => l.mechanism === 'third-party-unreachable');
  const clientLocal = L.filter((l) => l.mechanism === 'client-local');

  assert.ok(L.length > 0, 'the map must not be empty');
  assert.ok(notExportable.length > 0, 'if this is ever zero the exclusion path has gone dark');
  assert.ok(thirdParty.length > 0, 'if this is ever zero the third-party disclosure has gone dark');
  assert.ok(clientLocal.length > 0, 'if this is ever zero the device disclosure has gone dark');

  // Every row carries the flag this module branches on. A row with `exportable`
  // undefined would fall through to being READ, which is the wrong default.
  for (const l of L) {
    assert.equal(typeof l.exportable, 'boolean', `${l.id}: exportable must be an explicit boolean`);
    assert.equal(typeof l.holds, 'string', `${l.id}: holds is what a parent reads — it must exist`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · EVERY EXPORTABLE LOCATION APPEARS — driven by iterating the map
   ══════════════════════════════════════════════════════════════════════════════ */

test('every entry in the map is accounted for in the output', async () => {
  const locations = loadStudentDataMap();
  const { service } = makeService();
  const result = await service.exportAccount(UID);
  assert.deepEqual(
    result.locations.map((r) => r.id).sort(),
    locations.map((l) => l.id).sort(),
    'a location present in the map but absent from the output was never even considered'
  );
});

test('★★ EVERY exportable:true location the server can reach carries data, driven by the map', async () => {
  const locations = loadStudentDataMap();
  const { service } = makeService();
  const result = await service.exportAccount(UID);

  // Independently re-derived FROM THE MAP, not from the module under test: the rows
  // that are exportable and are reachable by a server at all.
  const expected = locations
    .filter((l) => l.exportable === true && l.mechanism !== 'client-local' && l.mechanism !== 'third-party-unreachable')
    .map((l) => l.id)
    .sort();
  assert.ok(expected.length > 0, 'the expectation itself must not be vacuous');

  for (const id of expected) {
    const row = byId(result, id);
    assert.ok(row, `${id} is exportable but missing from the export entirely`);
    assert.equal(
      row.status,
      EXPORT_STATUS.EXPORTED,
      `${id} is exportable, seeded with data, and came back "${row.status}"`
    );
    assert.ok(row.recordCount > 0, `${id} reported exported with no records`);
  }
});

test('★ CONTROL: an entry added to a FIXTURE map is exported too (the list is not hardcoded)', async () => {
  const fixture = [
    { id: 'fixture.alpha', kind: 'firestore-collection', path: 'alpha/{uid}', holds: 'Alpha.', mechanism: 'browser-sdk', exportable: true },
    { id: 'fixture.gemini', kind: 'third-party', path: 'https://example', holds: 'Third party.', mechanism: 'third-party-unreachable', exportable: false },
  ];
  const baseline = await makeService({
    locations: fixture,
    seed: { [`alpha/${UID}`]: { a: 1 } },
    files: [],
    users: {},
  }).service.exportAccount(UID);
  assert.deepEqual(baseline.locations.map((r) => r.id).sort(), ['fixture.alpha', 'fixture.gemini']);

  // ★ The control: the map grew by one. A walker that reads the map picks it up; a
  // walker with a hardcoded list does not, and this assertion goes red.
  const grown = fixture.concat([
    { id: 'fixture.brand-new', kind: 'firestore-collection', path: 'brandNew/{uid}', holds: 'Brand new.', mechanism: 'browser-sdk', exportable: true },
  ]);
  const after = await makeService({
    locations: grown,
    seed: { [`alpha/${UID}`]: { a: 1 }, [`brandNew/${UID}`]: { b: 2 } },
    files: [],
    users: {},
  }).service.exportAccount(UID);

  assert.deepEqual(
    after.locations.map((r) => r.id).sort(),
    ['fixture.alpha', 'fixture.brand-new', 'fixture.gemini'],
    'the new fixture entry was not exported — the location list is hardcoded somewhere'
  );
  assert.equal(byId(after, 'fixture.brand-new').status, EXPORT_STATUS.EXPORTED);
  assert.equal(byId(after, 'fixture.brand-new').records[0].data.b, 2);
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · THE EXCLUSION — CONTROLLED IN BOTH DIRECTIONS
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ DIRECTION 1 — the exportable:false location contributes NO DATA anywhere', async () => {
  const locations = loadStudentDataMap();
  const excluded = locations.filter((l) => l.exportable === false);
  assert.ok(excluded.length > 0, 'the map must still carry a non-exportable location');

  const { service } = makeService();
  const result = await service.exportAccount(UID);

  for (const l of excluded) {
    const row = byId(result, l.id);
    assert.ok(row, `${l.id} must still be LISTED — excluding it from the listing is the dishonest option`);
    assert.equal(row.status, EXPORT_STATUS.EXCLUDED, `${l.id} must be marked excluded`);
    assert.equal(row.recordCount, 0, `${l.id} leaked ${row.recordCount} record(s) into the export`);
    assert.deepEqual(row.records, [], `${l.id} leaked data into the export`);
  }

  // ★ And nothing in the whole file carries a record sourced from an excluded row.
  const excludedIds = new Set(excluded.map((l) => l.id));
  for (const row of result.locations) {
    if (!excludedIds.has(row.id)) continue;
    assert.equal(
      JSON.stringify(row.records),
      '[]',
      `${row.id}: an excluded location must never be read, let alone rendered`
    );
  }
});

test('★★ DIRECTION 1b — an excluded location\'s CONTENTS never reach the file, stated as an OUTCOME', async () => {
  // ★ THIS ASSERTION STANDS ALONE ON PURPOSE, with no status check in front of it.
  // The first version of DIRECTION 1 asserted `status === excluded` first, so when
  // the exclusion was mutated away the test went red on the STATUS and the leak
  // assertion never ran — a red for a weaker reason than the one claimed. Here the
  // only thing asserted is the outcome that actually matters: the bytes are absent.
  const fixture = [
    { id: 'fx.excluded', kind: 'firestore-collection', path: 'excl/{uid}', holds: 'Excluded.', mechanism: 'browser-sdk', exportable: false },
    { id: 'fx.readable', kind: 'firestore-collection', path: 'ok/{uid}', holds: 'Readable.', mechanism: 'browser-sdk', exportable: true },
  ];
  const { service } = makeService({
    locations: fixture,
    seed: {
      [`excl/${UID}`]: { secret: 'EXCLUDED-CONTENT-MUST-NOT-APPEAR' },
      [`ok/${UID}`]: { fine: 'EXPORTABLE-CONTENT-MUST-APPEAR' },
    },
    files: [],
    users: {},
  });
  const serialised = JSON.stringify(await service.exportAccount(UID));

  assert.ok(
    !serialised.includes('EXCLUDED-CONTENT-MUST-NOT-APPEAR'),
    'the exportable:false location was READ and its contents reached the exported file'
  );
  // ★ CONTROL: the harness CAN carry content through to the file, so the absence
  // above is the exclusion working and not a fixture that reads nothing.
  assert.ok(
    serialised.includes('EXPORTABLE-CONTENT-MUST-APPEAR'),
    'control failed: nothing at all reached the file, so the absence above proves nothing'
  );
});

test('★★ DIRECTION 2 — the exportable:false location IS DISCLOSED, by name and with a reason', async () => {
  const locations = loadStudentDataMap();
  const excluded = locations.filter((l) => l.exportable === false);

  const { service } = makeService();
  const result = await service.exportAccount(UID);

  for (const l of excluded) {
    const d = disclosureFor(result, l.id);
    assert.ok(d, `${l.id} was excluded and NOT disclosed — a silent omission is the defect`);
    assert.equal(d.status, EXPORT_STATUS.EXCLUDED);
    assert.equal(d.path, l.path, 'the disclosure must name the real location, not a placeholder');
    assert.equal(d.holds, plainHolds(l.holds), 'the disclosure must say what the student is not getting');
    assert.ok(
      d.reasons.includes(DISCLOSURE_NOT_EXPORTABLE),
      `${l.id}: the disclosure carries no reason`
    );
  }

  // ★ The exclusion also has to be VISIBLE at the top level, or a reader who does not
  // scroll believes the file is everything.
  assert.equal(result.complete, false, 'an export with disclosures must never claim completeness');
});

test('★★ THE TWO PREDICATES ARE INDEPENDENT — proven on a fixture map that SPLITS them', async () => {
  // On the real map today, the one exportable:false row and the one
  // third-party-unreachable row ARE THE SAME ROW. That coincidence must not be what
  // makes this module work. Here they are separated, and a row carries neither,
  // either, or both.
  const fixture = [
    { id: 'fx.plain', kind: 'firestore-collection', path: 'plain/{uid}', holds: 'Plain.', mechanism: 'browser-sdk', exportable: true },
    // exportable:false but NOT third-party.
    { id: 'fx.excluded-only', kind: 'firestore-collection', path: 'excl/{uid}', holds: 'Excluded only.', mechanism: 'browser-sdk', exportable: false },
    // third-party but exportable:true — unreachable in fact, not withheld by policy.
    { id: 'fx.thirdparty-only', kind: 'third-party', path: 'https://vendor.example', holds: 'Vendor.', mechanism: 'third-party-unreachable', exportable: true },
    // Both, i.e. today's real shape.
    { id: 'fx.both', kind: 'third-party', path: 'https://vendor2.example', holds: 'Vendor two.', mechanism: 'third-party-unreachable', exportable: false },
  ];
  const { service } = makeService({
    locations: fixture,
    seed: { [`plain/${UID}`]: { p: 1 }, [`excl/${UID}`]: { secret: 'must never appear' } },
    files: [],
    users: {},
  });
  const result = await service.exportAccount(UID);

  assert.equal(byId(result, 'fx.plain').status, EXPORT_STATUS.EXPORTED);

  // Excluded-only: no data, disclosed, and NOT carrying the third-party sentence.
  const exclOnly = byId(result, 'fx.excluded-only');
  assert.equal(exclOnly.status, EXPORT_STATUS.EXCLUDED);
  assert.deepEqual(exclOnly.records, []);
  const dExcl = disclosureFor(result, 'fx.excluded-only');
  assert.ok(dExcl.reasons.includes(DISCLOSURE_NOT_EXPORTABLE));
  assert.ok(
    !dExcl.reasons.includes(DISCLOSURE_THIRD_PARTY),
    'a non-exportable location that never left the product must not be described as a third party'
  );
  assert.ok(
    !JSON.stringify(result).includes('must never appear'),
    'the excluded location was READ and its contents reached the file'
  );

  // Third-party-only: unreachable, disclosed with the third-party sentence.
  const tpOnly = byId(result, 'fx.thirdparty-only');
  assert.equal(tpOnly.status, EXPORT_STATUS.NOT_EXPORTABLE);
  assert.ok(disclosureFor(result, 'fx.thirdparty-only').reasons.includes(DISCLOSURE_THIRD_PARTY));

  // Both: excluded status, and BOTH sentences.
  const both = byId(result, 'fx.both');
  assert.equal(both.status, EXPORT_STATUS.EXCLUDED);
  const dBoth = disclosureFor(result, 'fx.both');
  assert.ok(dBoth.reasons.includes(DISCLOSURE_NOT_EXPORTABLE));
  assert.ok(dBoth.reasons.includes(DISCLOSURE_THIRD_PARTY));
});

/* ══════════════════════════════════════════════════════════════════════════════
   4 · THE DISCLOSURE COPY — pinned, because a parent reads it
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the third-party disclosure is present VERBATIM in the exported file', async () => {
  const { service } = makeService();
  const result = await service.exportAccount(UID);

  const serialised = JSON.stringify(result);
  assert.ok(
    serialised.includes(DISCLOSURE_THIRD_PARTY),
    'the third-party sentence is not in the file a parent opens'
  );

  // Pin the words themselves. Softening this copy is the failure mode — a reworded
  // version that no longer says the provider decides retention is a different
  // promise, and would pass a mere "some string is present" check.
  assert.match(DISCLOSURE_THIRD_PARTY, /outside AI service/);
  assert.match(DISCLOSURE_THIRD_PARTY, /cannot export or delete/);
  assert.match(DISCLOSURE_THIRD_PARTY, /decided\s+by that provider, not by LazyTopper/);

  const tp = loadStudentDataMap().filter((l) => l.mechanism === 'third-party-unreachable');
  for (const l of tp) {
    const d = disclosureFor(result, l.id);
    assert.ok(d, `${l.id}: the third-party location is not disclosed at all`);
    assert.ok(d.reasons.includes(DISCLOSURE_THIRD_PARTY), `${l.id}: disclosed without the sentence`);
  }
});

test('★ the device-only location is disclosed, and keeps the export from claiming completeness', async () => {
  const { service } = makeService();
  const result = await service.exportAccount(UID);
  const local = loadStudentDataMap().filter((l) => l.mechanism === 'client-local');
  assert.ok(local.length > 0);
  for (const l of local) {
    const row = byId(result, l.id);
    assert.equal(row.status, EXPORT_STATUS.NOT_SERVER_EXPORTABLE);
    const d = disclosureFor(result, l.id);
    assert.ok(d, `${l.id} is unreachable from a server and was not disclosed`);
    assert.ok(d.reasons.includes(DISCLOSURE_CLIENT_LOCAL));
  }
  assert.equal(result.complete, false, 'a server-side export is provably incomplete and must say so');
});

test('★ the file is legible before it is machine-readable: a readme, and holds on every row', async () => {
  const { service } = makeService();
  const result = await service.exportAccount(UID);

  assert.deepEqual(result.readme, [...README_LINES]);
  assert.ok(result.readme.length >= 4, 'a one-line readme is not an explanation');
  assert.ok(
    result.readme.some((l) => /disclosures/.test(l)),
    'the readme must send the reader to what is MISSING, not only to what is present'
  );
  assert.ok(
    !result.readme.some((l) => /this is everything|complete copy/i.test(l)),
    'the readme must never claim the file is everything'
  );

  // ★ Legibility that cannot rot separately from the map, because it IS the map —
  // minus the repo's leading ★ emphasis markers, which mean nothing to a parent.
  const holdsById = new Map(loadStudentDataMap().map((l) => [l.id, l.holds]));
  let starred = 0;
  for (const row of result.locations) {
    const source = holdsById.get(row.id);
    assert.equal(row.holds, plainHolds(source), `${row.id}: holds must come from the map`);
    // ★ NOT ONE WORD MAY CHANGE. Only the leading markers are removed.
    assert.ok(
      source.endsWith(row.holds),
      `${row.id}: stripping the marker altered the sentence itself`
    );
    if (source !== row.holds) starred += 1;
  }
  // CONTROL: the strip demonstrably DID something on this map, so the assertions
  // above are the transformation working rather than a no-op nobody would notice.
  assert.ok(starred > 0, 'control failed: no holds value carried a marker, so nothing was proven');
  assert.ok(
    !result.locations.some((r) => /★/.test(r.holds || '')),
    'an engineering emphasis marker reached a file a parent reads'
  );
});

test('plainHolds removes only the leading marker, never a word', () => {
  assert.equal(plainHolds('★★ PHOTOGRAPHS OF THE HANDWRITING — the most sensitive artefact.'),
    'PHOTOGRAPHS OF THE HANDWRITING — the most sensitive artefact.');
  assert.equal(plainHolds('Profile document: goals, preferences.'), 'Profile document: goals, preferences.');
  assert.equal(plainHolds(undefined), null);
  assert.equal(plainHolds('★  '), null);
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · AN EMPTY ACCOUNT — honest empty, not an error and not a fabricated shell
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ an account with nothing in it exports a VALID, HONEST, EMPTY file', async () => {
  const { service } = makeService({ seed: {}, files: [], users: {} });
  const result = await service.exportAccount(UID);

  // It is a file, not an error.
  assert.equal(result.ok, true, 'having no data is not a failure');
  assert.equal(result.format, 'lazytopper.data-export');
  assert.equal(result.account.uid, UID);
  assert.ok(result.readme.length > 0);

  // It is still a full accounting of every location.
  assert.equal(result.locations.length, loadStudentDataMap().length);

  // ★ NOTHING IS INVENTED. Every readable location says "empty" and carries no rows.
  const readable = result.locations.filter(
    (r) => r.status === EXPORT_STATUS.EXPORTED || r.status === EXPORT_STATUS.EMPTY
  );
  assert.ok(readable.length > 0, 'the expectation must not be vacuous');
  for (const row of readable) {
    assert.equal(row.status, EXPORT_STATUS.EMPTY, `${row.id} fabricated content for an empty account`);
    assert.equal(row.recordCount, 0);
    assert.deepEqual(row.records, []);
  }
  assert.equal(result.summary.recordsExported, 0);

  // ★ And it is still honest about the exclusions — an empty account does not make
  // the third-party retention disappear.
  assert.equal(result.complete, false);
  assert.ok(JSON.stringify(result).includes(DISCLOSURE_THIRD_PARTY));

  // Round-trips as JSON, which is the whole point of "valid".
  assert.deepEqual(JSON.parse(JSON.stringify(result)).summary, result.summary);
});

/* ══════════════════════════════════════════════════════════════════════════════
   6 · READING THE SHAPES — the field-keyed collection and the nested subcollection
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ the field-keyed location is read BY FIELD, and returns only this student\'s slots', async () => {
  const { service, store } = makeService();
  const result = await service.exportAccount(UID);

  const query = store.queriedByField.find((q) => q.collection === 'qrUploadSlots');
  assert.ok(query, 'qrUploadSlots must be reached by a where() query');
  assert.deepEqual(
    { field: query.field, op: query.op, value: query.value },
    { field: 'uid', op: '==', value: UID }
  );

  // ★ Stated as an OUTCOME too, so pointing this back at a doc-id read fails HERE
  // with the real reason: zero matched, so the section reads "empty" — an honest
  // empty that is actually a lie.
  const row = byId(result, 'qrUploadSlots');
  assert.equal(row.status, EXPORT_STATUS.EXPORTED, 'a doc-id read matches nothing and reports empty');
  assert.equal(row.recordCount, 2);
  assert.deepEqual(row.records.map((r) => r.path).sort(), ['qrUploadSlots/sha-aaa', 'qrUploadSlots/sha-bbb']);

  // ★★ AND NOT ANOTHER STUDENT'S. This is the read-side catastrophe.
  assert.ok(!JSON.stringify(result).includes(OTHER), "another student's data reached this export");
});

test('★ a two-level-deep subcollection is reached by its OWN path, not inferred from its parent', async () => {
  const { service } = makeService();
  const result = await service.exportAccount(UID);

  const messages = byId(result, 'learnerProfiles.sessions.messages');
  assert.equal(messages.status, EXPORT_STATUS.EXPORTED);
  assert.deepEqual(
    messages.records.map((r) => r.path).sort(),
    [
      `learnerProfiles/${UID}/sessions/s1/messages/m1`,
      `learnerProfiles/${UID}/sessions/s1/messages/m2`,
    ]
  );
  assert.equal(
    messages.records.find((r) => r.path.endsWith('m1')).data.text,
    'why is this wrong?',
    'the child\'s actual words must survive the export'
  );

  // The parent is its own row, addressed by its own path — asserting the parent
  // proves nothing about the orphan underneath it.
  assert.equal(byId(result, 'learnerProfiles.sessions').records[0].path, `learnerProfiles/${UID}/sessions/s1`);
});

test('the auth account is exported, and an absent one is EMPTY rather than a failure', async () => {
  const present = await makeService().service.exportAccount(UID);
  const row = byId(present, 'auth-account');
  assert.equal(row.status, EXPORT_STATUS.EXPORTED);
  assert.equal(row.records[0].data.email, 'child@example.test');

  const absent = await makeService({ users: {} }).service.exportAccount(UID);
  assert.equal(byId(absent, 'auth-account').status, EXPORT_STATUS.EMPTY);
  assert.equal(absent.ok, true, 'a missing auth record is not an export failure');
});

test('the handwriting images are exported with their BYTES, and only this student\'s', async () => {
  const { service } = makeService();
  const result = await service.exportAccount(UID);
  const row = result.locations.find((r) => r.kind === 'storage-prefix');
  assert.equal(row.status, EXPORT_STATUS.EXPORTED);
  assert.equal(row.recordCount, 2);
  const aaa = row.records.find((r) => r.path.endsWith('sha-aaa.jpg'));
  assert.equal(aaa.data.encoding, 'base64');
  assert.equal(
    Buffer.from(aaa.data.content, 'base64').toString('utf8'),
    'AAA-image-bytes',
    'a list of filenames is not a portable copy of a photograph'
  );
  assert.ok(!JSON.stringify(row).includes(OTHER));
});

test('★ a file over the size cap keeps its metadata, is marked omitted, and is DISCLOSED', async () => {
  const { service } = makeService({
    maxFileBytes: 8,
    files: [
      { name: `qr-uploads/${UID}/small.jpg`, body: 'tiny' },
      { name: `qr-uploads/${UID}/huge.jpg`, body: 'this-one-is-way-over-the-cap' },
    ],
  });
  const result = await service.exportAccount(UID);
  const row = result.locations.find((r) => r.kind === 'storage-prefix');

  const small = row.records.find((r) => r.path.endsWith('small.jpg'));
  assert.equal(Buffer.from(small.data.content, 'base64').toString('utf8'), 'tiny');

  const huge = row.records.find((r) => r.path.endsWith('huge.jpg'));
  assert.equal(huge.data.contentOmitted, true);
  assert.equal(huge.data.content, undefined, 'the bytes must not be there if we say they are not');
  assert.match(huge.data.contentOmittedReason, /per-file export limit/);

  // ★ A cap we do not announce is a silent omission — the exact defect this lane
  // exists to prevent, wearing a different hat.
  assert.equal(row.partial, true);
  const d = disclosureFor(result, row.id);
  assert.ok(d, 'a partially-exported location must be disclosed');
  assert.ok(d.reasons.some((r) => /huge\.jpg/.test(r)), 'the disclosure must name the file');
  assert.equal(result.ok, false, 'a partial export must never report ok');
});

/* ══════════════════════════════════════════════════════════════════════════════
   7 · PARTIAL FAILURE IS REPORTED, NOT SWALLOWED
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ a mid-run read failure is surfaced by name, and the run continues', async () => {
  const { service } = makeService({ failOnGet: `topicMastery/${UID}` });
  const result = await service.exportAccount(UID);

  assert.equal(result.ok, false, 'an export that could not read everything must never report ok');
  const row = byId(result, 'topicMastery');
  assert.equal(row.status, EXPORT_STATUS.FAILED);
  assert.match(row.reason, /simulated read failure/);

  const d = disclosureFor(result, 'topicMastery');
  assert.ok(d, 'a failed location must be disclosed, not left as a gap the reader must notice');
  assert.match(d.detailReason, /simulated read failure/);

  // ...and everything unrelated was still exported. A failure must not abort the run.
  assert.equal(byId(result, 'learnerProfiles').status, EXPORT_STATUS.EXPORTED);
  assert.equal(byId(result, 'qrUploadSlots').status, EXPORT_STATUS.EXPORTED);
  assert.equal(byId(result, 'auth-account').status, EXPORT_STATUS.EXPORTED);
});

test('★ a location shape the walker refuses is REFUSED and disclosed, never silently skipped', async () => {
  // The shape the shared walker will not guess at: a wildcard document segment that
  // no earlier {uid} scopes. Exporting it would hand this student every student's rows.
  const fixture = [
    { id: 'fx.unscoped', kind: 'firestore-collection', path: 'outer/{outerId}/inner/{uid}', holds: 'Unscoped.', mechanism: 'browser-sdk', exportable: true },
  ];
  const { service } = makeService({ locations: fixture, seed: {}, files: [], users: {} });
  const result = await service.exportAccount(UID);

  const row = byId(result, 'fx.unscoped');
  assert.equal(row.status, EXPORT_STATUS.REFUSED);
  assert.equal(row.recordCount, 0);
  assert.match(row.reason, /not scoped by an earlier \{uid\}/);
  assert.ok(disclosureFor(result, 'fx.unscoped'), 'a refusal that is not disclosed is a silent gap');
  assert.equal(result.ok, false);
});

/* ══════════════════════════════════════════════════════════════════════════════
   8 · IDENTITY AND SERIALISATION
   ══════════════════════════════════════════════════════════════════════════════ */

test('exportAccount refuses an empty uid rather than walking the map against ""', async () => {
  const { service } = makeService();
  await assert.rejects(() => service.exportAccount(''), /requires a uid/);
  await assert.rejects(() => service.exportAccount('   '), /requires a uid/);
  await assert.rejects(() => service.exportAccount(undefined), /requires a uid/);
});

test('isAvailable is false, with a reason, when a dependency is missing', () => {
  const noAdmin = createAccountExportService({ adminFirestore: {}, resolveBucketName: () => 'b' });
  assert.equal(noAdmin.isAvailable(), false);
  assert.match(noAdmin.unavailableReason(), /firebase-admin/);

  const noBucket = createAccountExportService({
    firebaseAdmin: {},
    adminFirestore: {},
    resolveBucketName: () => '',
  });
  assert.equal(noBucket.isAvailable(), false);
  assert.match(noBucket.unavailableReason(), /bucket/);
});

test('Firestore values a parent cannot read are rendered, never dropped', () => {
  const ts = { toDate: () => new Date('2026-08-09T10:11:12.000Z') };
  const out = toPlainJson({
    when: ts,
    raw: { _seconds: 1780000000, _nanoseconds: 500000000 },
    where: { latitude: 12.5, longitude: 77.5 },
    ref: { path: 'learnerProfiles/u1', firestore: {} },
    blob: Buffer.from('hi'),
    nested: { list: [1, 'two', true, null] },
  });
  assert.equal(out.when, '2026-08-09T10:11:12.000Z');
  assert.equal(out.raw, new Date(1780000000 * 1000 + 500).toISOString());
  assert.deepEqual(out.where, { latitude: 12.5, longitude: 77.5 });
  assert.deepEqual(out.ref, { reference: 'learnerProfiles/u1' });
  assert.equal(out.blob.data, Buffer.from('hi').toString('base64'));
  assert.deepEqual(out.nested.list, [1, 'two', true, null]);
});

test('storagePrefixFor scopes to the student and nothing above them', () => {
  assert.equal(storagePrefixFor('qr-uploads/{uid}/{slotId}.{ext}', 'u1'), 'qr-uploads/u1/');
  assert.equal(storagePrefixFor('qr-uploads/{slotId}', 'u1'), null);
});

/* ══════════════════════════════════════════════════════════════════════════════
   9 · WHY THE ROUTE DOES NOT SEND THIS THROUGH `sendJson`
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ DEMONSTRATION: the standard JSON sink would CORRUPT a student\'s own fields', () => {
  // `sendJson` runs `redactErrorDetails` over every body. It rewrites the VALUE of
  // any key named `details`/`detail`/`stack`/`trace`/... and stops recursing past
  // depth 8. That is right for an error body and catastrophic for a data export.
  //
  // No persisted student shape carries such a field TODAY (checked across
  // lazytopper/src). This test exists so that fact is not load-bearing: the hazard is
  // demonstrated here, so nobody "tidies" the export route back onto sendJson later.
  const studentDocument = { concept: 'ohms-law', details: 'I confused V and I', trace: 'my working' };
  const throughTheSink = redactErrorDetails(studentDocument);

  assert.notEqual(
    throughTheSink.details,
    studentDocument.details,
    'CONTROL FAILED: the sink no longer rewrites `details`, so this hazard may be gone — ' +
      're-check the export route before relying on that'
  );
  assert.equal(throughTheSink.concept, 'ohms-law', 'and it leaves ordinary fields alone');
  assert.notEqual(throughTheSink.trace, studentDocument.trace);
});

test('★ the export payload keeps student fields the sink would have rewritten', async () => {
  const { service } = makeService({
    seed: { [`learnerProfiles/${UID}/mistakeLogs/l1`]: { details: 'I confused V and I' } },
    files: [],
    users: {},
  });
  const result = await service.exportAccount(UID);
  const row = byId(result, 'learnerProfiles.mistakeLogs');
  assert.equal(
    row.records[0].data.details,
    'I confused V and I',
    'the export must return the student\'s own words, not a redaction of them'
  );
});

/* ══════════════════════════════════════════════════════════════════════════════
   10 · EXPORT-PERF — THE WALK IS CONCURRENT, BOUNDED, ORDERED AND TIME-BUDGETED

   ★★ THE DEFECT THESE GUARD. In production this route ran ~120 s and the connection
   died under the api-server; the browser got a 502 and a student could not complete a
   legally-required DPDP flow. Nothing had crashed — the export was still reading, one
   document at a time.

   ★★ AND THE 29 LOCATIONS WERE NOT THE DOMINANT COST. Measured against the previous
   revision: MAX CONCURRENT I/O WAS 1 and the round-trip count tracked DOCUMENTS, not
   locations. The assertions below are therefore written against DOCUMENT-level
   concurrency, because a fix that only fanned out the 29 locations would leave the
   real critical path untouched AND WOULD PASS A LOCATION-LEVEL TEST.
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * A driver that records how many reads are in flight at once.
 *
 * ★ Every simulated read yields to the event loop, so overlap is a property of the
 * CODE UNDER TEST rather than of timing luck: a sequential walker can never show more
 * than one in flight here, whatever the machine is doing.
 */
function makeInstrumented({ seed = {}, files = [], users = {}, delayMs = 0, ...opts } = {}) {
  const stats = { ops: 0, maxInFlight: 0, inFlight: 0, order: [] };

  async function io(label) {
    stats.ops += 1;
    stats.inFlight += 1;
    if (stats.inFlight > stats.maxInFlight) stats.maxInFlight = stats.inFlight;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    else await new Promise((r) => setImmediate(r));
    stats.inFlight -= 1;
    stats.order.push(label);
  }

  const docs = new Map(Object.entries(seed));

  function docRef(fullPath) {
    return {
      path: fullPath,
      id: fullPath.split('/').pop(),
      collection: (name) => collRef(`${fullPath}/${name}`),
      async get() {
        await io(fullPath);
        return { exists: docs.has(fullPath), id: this.id, ref: this, data: () => docs.get(fullPath) };
      },
    };
  }
  function childDocPaths(collPath) {
    const prefix = `${collPath}/`;
    const out = new Set();
    for (const p of docs.keys()) {
      if (!p.startsWith(prefix)) continue;
      out.add(prefix + p.slice(prefix.length).split('/')[0]);
    }
    return [...out];
  }
  function snapshotOf(paths) {
    return {
      empty: paths.length === 0,
      size: paths.length,
      docs: paths.map((p) => ({ id: p.split('/').pop(), ref: docRef(p), data: () => docs.get(p) })),
    };
  }
  function collRef(collPath) {
    return {
      path: collPath,
      doc: (id) => docRef(`${collPath}/${id}`),
      async listDocuments() {
        await io(`list:${collPath}`);
        return childDocPaths(collPath).map(docRef);
      },
      async get() {
        await io(`get:${collPath}`);
        return snapshotOf(childDocPaths(collPath).filter((p) => docs.has(p)));
      },
      where(field, op, value) {
        return {
          async get() {
            await io(`where:${collPath}`);
            return snapshotOf(
              childDocPaths(collPath).filter(
                (p) => docs.has(p) && op === '==' && docs.get(p) && docs.get(p)[field] === value
              )
            );
          },
        };
      },
    };
  }

  const bucket = {
    async getFiles({ prefix }) {
      await io(`storage:${prefix}`);
      return [
        files
          .filter((f) => f.name.startsWith(prefix))
          .map((f) => ({
            name: f.name,
            metadata: {
              size: f.size ?? f.body.length,
              contentType: 'image/jpeg',
              updated: '2026-08-09T00:00:00.000Z',
            },
            async download() {
              stats.ops += 1;
              stats.inFlight += 1;
              if (stats.inFlight > stats.maxInFlight) stats.maxInFlight = stats.inFlight;
              await new Promise((r) => setTimeout(r, f.downloadMs ?? 0));
              stats.inFlight -= 1;
              stats.order.push(`download:${f.name}`);
              return [Buffer.from(f.body)];
            },
          })),
      ];
    },
  };

  const admin = {
    auth: () => ({
      async getUser(uid) {
        await io(`auth:${uid}`);
        if (!Object.prototype.hasOwnProperty.call(users, uid)) {
          const e = new Error('no user');
          e.code = 'auth/user-not-found';
          throw e;
        }
        return users[uid];
      },
    }),
    storage: () => ({ bucket: () => bucket }),
  };

  const service = createAccountExportService({
    firebaseAdmin: admin,
    adminFirestore: { collection: collRef },
    resolveBucketName: () => 'test-bucket',
    ...opts,
  });
  return { service, stats };
}

/** A student whose documents live in ONE collection — the real production shape. */
function manyDocsSeed(n, uid = UID) {
  const seed = { [`sessionRecords/${uid}`]: {} };
  for (let i = 0; i < n; i += 1) seed[`sessionRecords/${uid}/perQuestion/q${i}`] = { typed: `answer ${i}` };
  return seed;
}

const DEEP_FIXTURE = [
  {
    id: 'fx.records',
    kind: 'firestore-collection',
    path: 'sessionRecords/{uid}/perQuestion/{questionId}',
    holds: 'Per-question answers.',
    mechanism: 'browser-sdk',
    exportable: true,
  },
];

test('★★ THE HEADLINE — documents within ONE location are read CONCURRENTLY, not one at a time', async () => {
  const N = 40;
  const { service, stats } = makeInstrumented({
    locations: DEEP_FIXTURE,
    seed: manyDocsSeed(N),
  });
  const result = await service.exportAccount(UID);

  // CONTROL: the work actually happened, so a low concurrency number below could not
  // be "nothing ran". All N documents came back.
  assert.equal(byId(result, 'fx.records').recordCount, N, 'control failed: the documents were not read at all');
  assert.ok(stats.ops > N, `control failed: only ${stats.ops} reads were issued for ${N} documents`);

  // ★★ THE ASSERTION THAT GOES RED ON THE PREVIOUS REVISION. Its per-document read was
  // a plain `for … await`, so maxInFlight was EXACTLY 1 for any number of documents.
  assert.ok(
    stats.maxInFlight > 1,
    `the per-document read is still sequential: max ${stats.maxInFlight} read(s) in flight across ${N} documents`
  );
});

test('★ the concurrency is BOUNDED — an unbounded fan-out is a different way to hurt the gateway', async () => {
  const N = 300;
  const { service, stats } = makeInstrumented({
    locations: DEEP_FIXTURE,
    seed: manyDocsSeed(N),
  });
  await service.exportAccount(UID);

  const ceiling = PLAN_CONCURRENCY * READ_CONCURRENCY;
  assert.ok(
    stats.maxInFlight <= ceiling,
    `${stats.maxInFlight} reads were in flight at once, over the stated ceiling of ${ceiling}`
  );

  // ★★ AND AN ABSOLUTE NUMBER, because the assertion above is written in terms of the
  // very constants it guards: raise READ_CONCURRENCY to 500 and the "ceiling" rises
  // with it, so that check alone can never fail. A literal is what actually holds the
  // fan-out down to something a gateway survives.
  const ABSOLUTE_CEILING = 64;
  assert.ok(
    ceiling <= ABSOLUTE_CEILING,
    `the configured ceiling is ${ceiling}, above the ${ABSOLUTE_CEILING} this module is willing to aim at a gateway`
  );
  assert.ok(
    stats.maxInFlight <= ABSOLUTE_CEILING,
    `${stats.maxInFlight} reads were in flight at once, over the absolute ceiling of ${ABSOLUTE_CEILING}`
  );
  // CONTROL: with 300 documents the pool must actually have filled, or the bound above
  // is satisfied by a walk that never parallelised at all.
  assert.ok(stats.maxInFlight > 1, 'control failed: nothing ran concurrently, so no bound was tested');
});

test('★ the whole-map walk runs locations concurrently too', async () => {
  const { service, stats } = makeInstrumented({
    locations: loadStudentDataMap(),
    seed: realSeed(),
    users: { [UID]: { uid: UID, toJSON: () => ({ uid: UID }) } },
  });
  await service.exportAccount(UID);
  assert.ok(stats.maxInFlight > 1, 'the 29-location walk is still sequential');
});

test('★★ ORDER SURVIVES CONCURRENCY — rows, records and disclosures are assembled by INDEX', async () => {
  // ★ Reads finish in an order nobody controls once they overlap. A file a parent opens
  // must still be byte-stable, so ordering is asserted against the MAP, not against a
  // previous run of the same code.
  const locations = loadStudentDataMap();
  const opts = {
    locations,
    seed: realSeed(),
    users: { [UID]: { uid: UID, toJSON: () => ({ uid: UID }) } },
    files: [{ name: `qr-uploads/${UID}/a.jpg`, body: 'AAA' }],
  };

  const first = await makeInstrumented(opts).service.exportAccount(UID);
  const second = await makeInstrumented(opts).service.exportAccount(UID);

  assert.deepEqual(
    first.locations.map((r) => r.id),
    locations.map((l) => l.id),
    'the rows are no longer in map order — the file a parent reads has been reshuffled'
  );
  assert.deepEqual(
    first.locations.map((r) => r.id),
    second.locations.map((r) => r.id),
    'two runs of the same account produced different row orders'
  );
  assert.deepEqual(
    first.disclosures.map((d) => d.id),
    second.disclosures.map((d) => d.id),
    'the disclosures are ordered by whichever read finished first'
  );

  // ★ Records WITHIN a location keep their order too.
  const msgs = byId(first, 'learnerProfiles.sessions.messages').records.map((r) => r.path);
  assert.deepEqual(
    msgs,
    byId(second, 'learnerProfiles.sessions.messages').records.map((r) => r.path),
    'records inside a location come back in completion order'
  );
  assert.deepEqual(msgs, [...msgs].sort(), 'the records are not in a stable path order');
});

/* ── the time budget, answered through the contract that already existed ──────── */

test('★★ OVER BUDGET — unread locations are FAILED BY NAME and the run reports ok:false (a 207)', async () => {
  // Each read costs 20ms against a 5ms budget, so the deadline passes during the first
  // location and every later one is refused a start. planConcurrency 1 makes that crisp.
  const { service } = makeInstrumented({
    locations: loadStudentDataMap(),
    seed: realSeed(),
    users: { [UID]: { uid: UID, toJSON: () => ({ uid: UID }) } },
    delayMs: 20,
    budgetMs: 5,
    planConcurrency: 1,
    readConcurrency: 1,
  });
  const result = await service.exportAccount(UID);

  const starved = result.locations.filter(
    (r) => r.status === EXPORT_STATUS.FAILED && /time budget/.test(r.reason || '')
  );
  assert.ok(starved.length > 0, 'the budget never fired — nothing was reported as unread');

  // ★★ REUSE, NOT A SECOND MECHANISM. `ok:false` is what `routes/accountExport.cjs`
  // already turns into a 207, and the disclosure list is the same one the storage caps
  // populate. A budget that invented its own partial channel would be a divergence
  // hazard, not redundancy.
  assert.equal(result.ok, false, 'an export that could not read everything must never report ok');
  for (const row of starved) {
    const d = disclosureFor(result, row.id);
    assert.ok(d, `${row.id} was not read and was NOT disclosed — a silent omission is the defect`);
    assert.match(d.detailReason, /time budget/);
  }

  // ★ And it is still a usable file: what WAS read is returned, not thrown away.
  assert.ok(
    result.locations.some((r) => r.status === EXPORT_STATUS.EXPORTED),
    'the budget discarded everything, which denies the student the part we did read'
  );
});

test('★ a generous budget changes nothing — the budget is a ceiling, not a filter', async () => {
  const { service } = makeInstrumented({
    locations: loadStudentDataMap(),
    seed: realSeed(),
    users: { [UID]: { uid: UID, toJSON: () => ({ uid: UID }) } },
    budgetMs: 600_000,
  });
  const result = await service.exportAccount(UID);
  assert.ok(
    !result.locations.some((r) => /time budget/.test(r.reason || '')),
    'a run well inside its budget reported budget omissions'
  );
  assert.equal(byId(result, 'learnerProfiles').status, EXPORT_STATUS.EXPORTED);
});

/* ── the storage caps stay DETERMINISTIC once downloads overlap ───────────────── */

test('★★ WHICH FILE IS OMITTED DOES NOT DEPEND ON WHICH DOWNLOAD FINISHES FIRST', async () => {
  // ★ The hazard concurrency introduces here: the old walk accumulated the total
  // against bytes AS THEY ARRIVED, so overlapping downloads would decide the cap by
  // completion order. Same account, same files, downloads timed in OPPOSITE orders —
  // the exported file must be identical.
  const files = (fastFirst) => [
    { name: `qr-uploads/${UID}/one.jpg`, body: 'aaaaaaaaaa', downloadMs: fastFirst ? 0 : 30 },
    { name: `qr-uploads/${UID}/two.jpg`, body: 'bbbbbbbbbb', downloadMs: fastFirst ? 30 : 0 },
    { name: `qr-uploads/${UID}/three.jpg`, body: 'cccccccccc', downloadMs: 0 },
  ];
  const opts = { locations: loadStudentDataMap(), seed: {}, users: {}, maxTotalFileBytes: 15 };

  const a = await makeInstrumented({ ...opts, files: files(true) }).service.exportAccount(UID);
  const b = await makeInstrumented({ ...opts, files: files(false) }).service.exportAccount(UID);

  const rowOf = (r) => r.locations.find((x) => x.kind === 'storage-prefix');
  const omittedOf = (r) => rowOf(r).records.filter((x) => x.data.contentOmitted).map((x) => x.path);

  // CONTROL: the cap must actually have bitten, or "identical" proves nothing.
  assert.ok(omittedOf(a).length > 0, 'control failed: the total cap never fired');
  assert.deepEqual(
    omittedOf(a),
    omittedOf(b),
    'the omitted file changed when the download timings changed — the cap is completion-order dependent'
  );
  assert.deepEqual(
    rowOf(a).records.map((x) => x.path),
    rowOf(b).records.map((x) => x.path),
    'the file listing order changed with download timing'
  );
  assert.deepEqual(rowOf(a).omissions, rowOf(b).omissions, 'the disclosures changed with download timing');
});

test('★ the images still download CONCURRENTLY', async () => {
  const { service, stats } = makeInstrumented({
    locations: loadStudentDataMap(),
    seed: {},
    users: {},
    files: Array.from({ length: 10 }, (_, i) => ({
      name: `qr-uploads/${UID}/f${i}.jpg`,
      body: `image-${i}`,
      downloadMs: 15,
    })),
  });
  const result = await service.exportAccount(UID);
  assert.equal(result.locations.find((r) => r.kind === 'storage-prefix').recordCount, 10);
  assert.ok(stats.maxInFlight > 1, 'the handwriting photos are still downloaded one at a time');
});

/* ── the pool itself ──────────────────────────────────────────────────────────── */

test('mapWithConcurrency preserves input order and respects its limit', async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 25 }, (_, i) => i);
  const out = await mapWithConcurrency(items, 4, async (n) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, n % 3));
    inFlight -= 1;
    return n * 2;
  });
  assert.deepEqual(out, items.map((n) => n * 2), 'results came back out of order');
  assert.ok(peak > 1, 'control failed: nothing overlapped, so the limit was never exercised');
  assert.ok(peak <= 4, `the limit was exceeded: ${peak} in flight`);
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), [], 'an empty input must not hang');
});
