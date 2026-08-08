/**
 * accountErasure.test.cjs — guards for the DPDP map-walking account erasure.
 *
 * Run: node --test lazytopper/server/services/accountErasure.test.cjs
 * Wired into `lazytopper` test:matrix:all, which CI gates on every PR. A test that
 * nothing executes is not a gate — and `ci_docs_lane_acceptance.mjs` enumerates every
 * server/**\/*.test.cjs from disk and fails when one is missing from that chain.
 *
 * ★★ THE PROPERTY THAT MATTERS MOST is not "documents get deleted". It is that a
 * delete which matched NOTHING is reported as `notFound` and never as success.
 * `qrUploadSlots` keys the student's uid as a FIELD, so a doc-id delete against it
 * matches nothing, throws nothing, and returns cleanly. Ship that and a parent is
 * told the account was erased while the child's handwriting photographs are live.
 * Every zero-match assertion below exists for that one sentence.
 *
 * ★ THE SECOND PROPERTY: subcollections are targeted by their OWN path. Firestore
 * does not cascade, so asserting the parent was deleted proves nothing about the
 * orphan underneath it. Every subcollection assertion here names the CHILD path.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAccountErasureService,
  ensureTsRequireHook,
  loadStudentDataMap,
  planErasure,
  classifyLocation,
  storagePrefixFor,
  templateSegments,
  STRATEGY,
  STATUS,
  UID_FIELD,
} = require('./accountErasure.cjs');

/* ── in-memory Firestore ───────────────────────────────────────────────────────
   Paths are the keys, exactly as Firestore addresses them, so an assertion can name
   `learnerProfiles/u1/sessions/s1/messages/m1` literally rather than through a mock
   object graph. `listDocuments()` returns ancestor paths that hold no fields of
   their own — real Firestore's "missing documents", and the shape that hides
   orphaned subcollections from a `get()`.
   ─────────────────────────────────────────────────────────────────────────────── */
function makeFirestore(seed = {}, failOnDelete = null) {
  const docs = new Map(Object.entries(seed));
  const deleted = [];
  const queriedByField = [];

  function docRef(fullPath) {
    return {
      path: fullPath,
      id: fullPath.split('/').pop(),
      collection: (name) => collRef(`${fullPath}/${name}`),
      async get() {
        return { exists: docs.has(fullPath), id: this.id, ref: this, data: () => docs.get(fullPath) };
      },
      async delete() {
        if (failOnDelete && failOnDelete === fullPath) throw new Error(`simulated delete failure`);
        deleted.push(fullPath);
        docs.delete(fullPath);
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

  return { db: { collection: collRef }, docs, deleted, queriedByField };
}

function makeBucket(names = []) {
  let live = [...names];
  const deleted = [];
  return {
    async getFiles({ prefix }) {
      return [
        live
          .filter((n) => n.startsWith(prefix))
          .map((name) => ({
            name,
            async delete() {
              deleted.push(name);
              live = live.filter((x) => x !== name);
            },
          })),
      ];
    },
    deleted,
    get live() {
      return live;
    },
  };
}

function makeAdmin(bucket, existingUsers = []) {
  const users = new Set(existingUsers);
  const authDeleted = [];
  return {
    authDeleted,
    auth: () => ({
      async deleteUser(uid) {
        if (!users.has(uid)) {
          const e = new Error('There is no user record corresponding to the provided identifier.');
          e.code = 'auth/user-not-found';
          throw e;
        }
        users.delete(uid);
        authDeleted.push(uid);
      },
    }),
    storage: () => ({ bucket: () => bucket }),
  };
}

const UID = 'student-uid-1';
const OTHER = 'other-student-uid';

/** A seed that puts at least one document under every erasable real-map location. */
function realSeed(uid = UID) {
  return {
    [`users/${uid}`]: { email: 'x' },
    [`learnerProfiles/${uid}`]: { goal: 'x' },
    [`learnerProfiles/${uid}/sessions/s1`]: { t: 1 },
    [`learnerProfiles/${uid}/sessions/s1/messages/m1`]: { text: 'x' },
    [`learnerProfiles/${uid}/sessions/s1/messages/m2`]: { text: 'y' },
    [`learnerProfiles/${uid}/mistakeLogs/l1`]: {},
    [`learnerProfiles/${uid}/savedWorksheets/w1`]: {},
    [`learnerProfiles/${uid}/worksheetActivity/a1`]: {},
    [`sessionRecords/${uid}`]: {},
    [`sessionRecords/${uid}/records/r1`]: {},
    [`sessionRecords/${uid}/perQuestion/q1`]: {},
    [`sessionRecords/${uid}/fullMockPapers/p1`]: {},
    [`practiceInsights/${uid}`]: {},
    [`practiceInsights/${uid}/attempts/at1`]: {},
    [`mockScoreHistory/${uid}`]: {},
    [`mockScoreHistory/${uid}/entries/e1`]: {},
    [`weakAreaSummary/${uid}`]: {},
    [`topicMastery/${uid}`]: {},
    [`learnerProgress/${uid}`]: {},
    [`srSchedules/${uid}`]: {},
    [`learningPaths/${uid}`]: {},
    [`dashboardPrefs/${uid}`]: {},
    [`tutorSessions/${uid}`]: {},
    [`tutorSessions/${uid}/topics/electricity`]: {},
    [`subscriptions/${uid}`]: {},
    // ★ FIELD-KEYED. The doc id is sha256(uploadToken); the student is a `uid` FIELD.
    'qrUploadSlots/sha-aaa': { uid, storagePath: `qr-uploads/${uid}/sha-aaa.jpg` },
    'qrUploadSlots/sha-bbb': { uid, storagePath: `qr-uploads/${uid}/sha-bbb.jpg` },
    // Another student's slot — must survive.
    'qrUploadSlots/sha-zzz': { uid: OTHER, storagePath: `qr-uploads/${OTHER}/sha-zzz.jpg` },
  };
}

function makeService(opts = {}) {
  const store = makeFirestore(opts.seed || realSeed(), opts.failOnDelete || null);
  const bucket = makeBucket(
    opts.files || [`qr-uploads/${UID}/sha-aaa.jpg`, `qr-uploads/${UID}/sha-bbb.jpg`, `qr-uploads/${OTHER}/sha-zzz.jpg`]
  );
  const admin = makeAdmin(bucket, opts.users === undefined ? [UID, OTHER] : opts.users);
  const service = createAccountErasureService({
    firebaseAdmin: admin,
    adminFirestore: store.db,
    locations: opts.locations,
    resolveBucketName: () => 'test-bucket',
  });
  return { service, store, bucket, admin };
}

const byId = (result, id) => result.locations.find((r) => r.id === id);

/* ══════════════════════════════════════════════════════════════════════════════
   1 · THE MAP IMPORT SMOKE TEST  —  [FU-DPDP-MAP-SERVER-IMPORT-SMOKE]
   ★ EXECUTED, NOT INFERRED. SCOUT-1 could only reason that a server process can
   require studentDataMap.ts (a scout worktree has no node_modules). This runs it.
   ══════════════════════════════════════════════════════════════════════════════ */

test('SMOKE: a server process really can require studentDataMap.ts and read a non-empty map', () => {
  const locations = loadStudentDataMap();
  assert.ok(Array.isArray(locations), 'STUDENT_DATA_MAP must load as an array');
  assert.ok(locations.length > 0, 'the map must not be empty');
  // Structural, not a carried count: every entry must carry the four fields the
  // walker derives a strategy from, or the walk is guessing.
  for (const l of locations) {
    assert.equal(typeof l.id, 'string', `${l.id}: id`);
    assert.equal(typeof l.kind, 'string', `${l.id}: kind`);
    assert.equal(typeof l.path, 'string', `${l.id}: path`);
    assert.equal(typeof l.mechanism, 'string', `${l.id}: mechanism`);
  }
  // The partitions must account for every row — a count read from the run, never
  // carried from a brief.
  const kinds = new Map();
  for (const l of locations) kinds.set(l.kind, (kinds.get(l.kind) || 0) + 1);
  assert.equal(
    [...kinds.values()].reduce((a, b) => a + b, 0),
    locations.length,
    'kind partition must sum to the total'
  );
});

test('SMOKE: the .ts hook shim NEVER replaces a hook that is already installed', () => {
  const original = require.extensions['.ts'];
  const sentinel = () => {
    throw new Error('sentinel must not be called');
  };
  require.extensions['.ts'] = sentinel;
  try {
    const installed = ensureTsRequireHook();
    assert.equal(installed, false, 'must report that it installed nothing');
    assert.equal(require.extensions['.ts'], sentinel, "the gateway's own hook must stay authoritative");
  } finally {
    require.extensions['.ts'] = original;
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · THE FULL AUDIT — every location classified, none spot-checked
   ══════════════════════════════════════════════════════════════════════════════ */

test('AUDIT: every location in the real map gets a supported strategy', () => {
  const plan = planErasure(loadStudentDataMap());
  const refused = plan.filter((p) => p.strategy === STRATEGY.UNSUPPORTED);
  assert.deepEqual(
    refused.map((p) => `${p.id}: ${p.reason}`),
    [],
    'a location the walker cannot classify would be silently un-erased'
  );
  assert.equal(plan.length, loadStudentDataMap().length, 'the plan must cover the whole map');
});

test('AUDIT: field-keyed is decided by the PATH, and matches every location with no {uid} segment', () => {
  const locations = loadStudentDataMap();
  const plan = planErasure(locations);

  // Independently re-derived from the map, NOT from the classifier under test.
  const expectedFieldKeyed = locations
    .filter(
      (l) =>
        (l.kind === 'firestore-collection' || l.kind === 'firestore-subcollection') &&
        !templateSegments(l.path).includes('{uid}')
    )
    .map((l) => l.id)
    .sort();

  const actualFieldKeyed = plan
    .filter((p) => p.strategy === STRATEGY.FIRESTORE_FIELD_QUERY)
    .map((p) => p.id)
    .sort();

  assert.deepEqual(actualFieldKeyed, expectedFieldKeyed);
  assert.ok(actualFieldKeyed.length > 0, 'if this is ever empty the field-keyed guard has gone dark');
  for (const p of plan.filter((x) => x.strategy === STRATEGY.FIRESTORE_FIELD_QUERY)) {
    assert.equal(p.field, UID_FIELD, `${p.id} must name the field it queries`);
  }
});

test('AUDIT: every firestore-subcollection is walked, and ordered before its parent', () => {
  const locations = loadStudentDataMap();
  const plan = planErasure(locations);
  const subs = locations.filter((l) => l.kind === 'firestore-subcollection');
  assert.ok(subs.length > 0);

  const indexOf = new Map(plan.map((p, i) => [p.id, i]));
  for (const sub of subs) {
    const step = plan.find((p) => p.id === sub.id);
    assert.equal(step.strategy, STRATEGY.FIRESTORE_DOC_TREE, `${sub.id} must be walked as a document tree`);
    assert.ok(
      indexOf.get(sub.id) < indexOf.get(sub.parentId),
      `${sub.id} must be erased BEFORE ${sub.parentId} — Firestore does not cascade`
    );
  }
});

test('AUDIT: the auth account is erased LAST of everything that is actually erased', () => {
  const plan = planErasure(loadStudentDataMap());
  const erasable = plan.filter((p) =>
    [STRATEGY.FIRESTORE_DOC_TREE, STRATEGY.FIRESTORE_FIELD_QUERY, STRATEGY.STORAGE_PREFIX, STRATEGY.AUTH_ACCOUNT].includes(
      p.strategy
    )
  );
  assert.equal(
    erasable[erasable.length - 1].strategy,
    STRATEGY.AUTH_ACCOUNT,
    'deleting the identity first would leave any surviving data unattributable'
  );
});

test('AUDIT: an unscoped wildcard collection is REFUSED, never enumerated', () => {
  // The catastrophe these guards prevent: a future map entry of either shape would,
  // without them, delete EVERY student's documents in that collection.
  const shape = (path) =>
    classifyLocation({ id: 'hypothetical', kind: 'firestore-collection', path, mechanism: 'admin-sdk-required' });

  // (a) a wildcard document segment that no earlier {uid} scopes.
  const unscopedWildcard = shape('outer/{outerId}/inner/{uid}');
  assert.equal(unscopedWildcard.strategy, STRATEGY.UNSUPPORTED);
  assert.match(unscopedWildcard.reason, /not scoped by an earlier \{uid\}/);

  // (b) a NESTED path with no {uid} at all. A root `where()` cannot reach the
  //     student's documents here, so field-querying it would be a silent miss.
  const nestedNoUid = shape('someCollection/{docId}/inner/{innerId}');
  assert.equal(nestedNoUid.strategy, STRATEGY.UNSUPPORTED);
  assert.match(nestedNoUid.reason, /nested path with no \{uid\}/);

  // CONTROL: the same shapes, properly scoped, are accepted — so the two refusals
  // above are the guards firing and not the classifier rejecting everything.
  assert.equal(shape('someCollection/{uid}/inner/{innerId}').strategy, STRATEGY.FIRESTORE_DOC_TREE);
  assert.equal(shape('someCollection/{docId}').strategy, STRATEGY.FIRESTORE_FIELD_QUERY);
});

test('AUDIT: storagePrefixFor scopes to the student and nothing above them', () => {
  assert.equal(storagePrefixFor('qr-uploads/{uid}/{slotId}.{ext}', 'u1'), 'qr-uploads/u1/');
  assert.equal(storagePrefixFor('qr-uploads/{slotId}', 'u1'), null);
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · THE FIELD-KEYED DELETE — the failure this lane exists to prevent
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ FIXTURE INTEGRITY: a doc-id lookup on the field-keyed collection matches ZERO documents', async () => {
  // Without this, the fixture could quietly make a doc-id delete "work" and every
  // assertion below would be testing a hazard that is not present.
  const { store } = makeService();
  const docIdShape = await store.db.collection('qrUploadSlots').doc(UID).get();
  assert.equal(docIdShape.exists, false, 'the uid is a FIELD here — there is no document at that id');
  const fieldShape = await store.db.collection('qrUploadSlots').where('uid', '==', UID).get();
  assert.equal(fieldShape.size, 2, 'while the field query finds the student\'s slots');
});

test('★★ the field-keyed location is queried BY FIELD, not by document id', async () => {
  const { service, store } = makeService();
  await service.eraseAccount(UID);
  const query = store.queriedByField.find((q) => q.collection === 'qrUploadSlots');
  assert.ok(query, 'qrUploadSlots must be reached by a where() query');
  assert.deepEqual(
    { field: query.field, op: query.op, value: query.value },
    { field: 'uid', op: '==', value: UID }
  );
});

test('★★ the field-keyed location DELETES the student\'s documents — a doc-id delete finds none', async () => {
  // ★ Stated as an OUTCOME, with no query-shape assertion in front of it, so that
  // pointing this location back at a doc-id delete fails HERE and fails with the
  // real reason: zero documents matched, so the status is notFound, not deleted.
  const { service, store } = makeService();
  const result = await service.eraseAccount(UID);

  const row = byId(result, 'qrUploadSlots');
  assert.equal(row.status, STATUS.DELETED, 'zero matched would report notFound — that is the defect');
  assert.equal(row.deleted, 2);
  assert.ok(store.deleted.includes('qrUploadSlots/sha-aaa'));
  assert.ok(store.deleted.includes('qrUploadSlots/sha-bbb'));

  // ★ The doc-id path is a document that never existed. It must never be targeted.
  assert.ok(
    !store.deleted.includes(`qrUploadSlots/${UID}`),
    'a doc-id delete here matches nothing and is the whole defect'
  );
  // ★ Another student's slot must survive a per-student erasure.
  assert.ok(!store.deleted.includes('qrUploadSlots/sha-zzz'));
  assert.ok(store.docs.has('qrUploadSlots/sha-zzz'));
});

test('★★ a field-keyed delete that matches NOTHING reports notFound, not success', async () => {
  // Only the OTHER student has a slot, so the query is live and returns empty.
  const seed = realSeed();
  delete seed['qrUploadSlots/sha-aaa'];
  delete seed['qrUploadSlots/sha-bbb'];
  const { service } = makeService({ seed });

  const result = await service.eraseAccount(UID);
  const row = byId(result, 'qrUploadSlots');
  assert.equal(row.status, STATUS.NOT_FOUND, 'zero matched must NOT be reported as deleted');
  assert.equal(row.deleted, 0);
  assert.notEqual(row.status, STATUS.DELETED);
  // A zero-match is not a failure either — erasure stays idempotent.
  assert.equal(result.ok, true);
});

test('the caller can tell "erased N documents" from "matched nothing" for EVERY location', async () => {
  const { service } = makeService();
  const result = await service.eraseAccount(UID);
  for (const row of result.locations) {
    assert.ok(typeof row.status === 'string' && row.status.length > 0, `${row.id} must carry a status`);
    if (row.status === STATUS.DELETED) assert.ok(row.deleted > 0, `${row.id} deleted must be > 0`);
    if (row.status === STATUS.NOT_FOUND) assert.equal(row.deleted, 0, `${row.id} notFound must be 0`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   4 · SUBCOLLECTIONS — assert the CHILD path, never the parent
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ subcollections are deleted EXPLICITLY, by their own child path', async () => {
  const { service, store } = makeService();
  await service.eraseAccount(UID);

  const mustBeDeleted = [
    `learnerProfiles/${UID}/sessions/s1/messages/m1`,
    `learnerProfiles/${UID}/sessions/s1/messages/m2`,
    `learnerProfiles/${UID}/sessions/s1`,
    `learnerProfiles/${UID}/mistakeLogs/l1`,
    `learnerProfiles/${UID}/savedWorksheets/w1`,
    `learnerProfiles/${UID}/worksheetActivity/a1`,
    `sessionRecords/${UID}/records/r1`,
    `sessionRecords/${UID}/perQuestion/q1`,
    `sessionRecords/${UID}/fullMockPapers/p1`,
    `practiceInsights/${UID}/attempts/at1`,
    `mockScoreHistory/${UID}/entries/e1`,
    `tutorSessions/${UID}/topics/electricity`,
  ];
  for (const p of mustBeDeleted) {
    assert.ok(store.deleted.includes(p), `child path never targeted: ${p}`);
    assert.equal(store.docs.has(p), false, `still readable after erasure: ${p}`);
  }
  // Nothing is left under the student anywhere.
  const survivors = [...store.docs.keys()].filter((p) => p.includes(UID));
  assert.deepEqual(survivors, [], 'an orphan under a deleted parent is still readable');
});

test('★ a two-level-deep subcollection is reached, and reached BEFORE its parent', async () => {
  const { service, store } = makeService();
  await service.eraseAccount(UID);
  const msg = store.deleted.indexOf(`learnerProfiles/${UID}/sessions/s1/messages/m1`);
  const session = store.deleted.indexOf(`learnerProfiles/${UID}/sessions/s1`);
  const profile = store.deleted.indexOf(`learnerProfiles/${UID}`);
  assert.ok(msg >= 0 && session >= 0 && profile >= 0);
  assert.ok(msg < session, 'messages must go before their session');
  assert.ok(session < profile, 'sessions must go before the profile document');
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · THE MAP IS THE SPEC — coverage, and the fixture-map CONTROL
   ══════════════════════════════════════════════════════════════════════════════ */

test('every entry in the map is visited', async () => {
  const locations = loadStudentDataMap();
  const { service } = makeService();
  const result = await service.eraseAccount(UID);
  assert.deepEqual(
    result.locations.map((r) => r.id).sort(),
    locations.map((l) => l.id).sort(),
    'a location present in the map but absent from the result was never attempted'
  );
});

test('★ CONTROL: an entry added to a FIXTURE map is visited too (the list is not hardcoded)', async () => {
  const fixture = [
    { id: 'fixture.alpha', kind: 'firestore-collection', path: 'alpha/{uid}', mechanism: 'browser-sdk', exportable: true },
    { id: 'fixture.gemini', kind: 'third-party', path: 'https://example', mechanism: 'third-party-unreachable', exportable: false },
  ];
  const baseline = await makeService({ locations: fixture, seed: { [`alpha/${UID}`]: {} } }).service.eraseAccount(UID);
  assert.deepEqual(baseline.locations.map((r) => r.id).sort(), ['fixture.alpha', 'fixture.gemini']);

  // ★ The control: the map grew by one. A walker that reads the map picks it up; a
  // walker with a hardcoded list does not, and this assertion goes red.
  const grown = fixture.concat([
    { id: 'fixture.brand-new', kind: 'firestore-collection', path: 'brandNew/{uid}', mechanism: 'browser-sdk', exportable: true },
  ]);
  const after = await makeService({
    locations: grown,
    seed: { [`alpha/${UID}`]: {}, [`brandNew/${UID}`]: {} },
  }).service.eraseAccount(UID);

  assert.deepEqual(
    after.locations.map((r) => r.id).sort(),
    ['fixture.alpha', 'fixture.brand-new', 'fixture.gemini'],
    'the new fixture entry was not walked — the location list is hardcoded somewhere'
  );
  assert.equal(byId(after, 'fixture.brand-new').status, STATUS.DELETED);
});

/* ══════════════════════════════════════════════════════════════════════════════
   6 · HONESTY — what the server cannot reach
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the third-party-unreachable location is reported as NOT deleted, never skipped silently', async () => {
  const { service } = makeService();
  const result = await service.eraseAccount(UID);
  const unreachable = result.locations.filter((r) => r.mechanism === 'third-party-unreachable');
  assert.ok(unreachable.length > 0, 'the map must still carry an unreachable location');
  for (const row of unreachable) {
    assert.equal(row.status, STATUS.NOT_DELETABLE);
    assert.equal(row.deleted, 0);
    assert.ok(result.remaining.some((r) => r.id === row.id), `${row.id} must appear in remaining`);
  }
});

test('★ the client-local location is reported as NOT server-erasable, and blocks "complete"', async () => {
  const { service } = makeService();
  const result = await service.eraseAccount(UID);
  const local = result.locations.filter((r) => r.mechanism === 'client-local');
  assert.ok(local.length > 0);
  for (const row of local) {
    assert.equal(row.status, STATUS.NOT_SERVER_ERASABLE);
    assert.ok(result.remaining.some((r) => r.id === row.id));
  }
  assert.equal(
    result.complete,
    false,
    'a server-only erasure is provably incomplete and must never claim otherwise'
  );
});

/* ══════════════════════════════════════════════════════════════════════════════
   7 · IDEMPOTENCE, STORAGE, AUTH, PARTIAL FAILURE
   ══════════════════════════════════════════════════════════════════════════════ */

test('a second erasure succeeds and deletes nothing', async () => {
  const { service, store, bucket } = makeService();
  const first = await service.eraseAccount(UID);
  assert.ok(first.summary.documentsDeleted > 0);
  const deletedAfterFirst = store.deleted.length;
  const bucketAfterFirst = bucket.deleted.length;

  const second = await service.eraseAccount(UID);
  assert.equal(second.ok, true);
  assert.equal(second.summary.documentsDeleted, 0, 'the second run must delete nothing');
  assert.equal(store.deleted.length, deletedAfterFirst);
  assert.equal(bucket.deleted.length, bucketAfterFirst);
  for (const row of second.locations) {
    assert.notEqual(row.status, STATUS.DELETED, `${row.id} reported a delete on an already-erased account`);
    assert.notEqual(row.status, STATUS.FAILED, `${row.id}: ${row.error}`);
  }
});

test('the handwriting images are deleted by storage prefix, and only this student\'s', async () => {
  const { service, bucket } = makeService();
  const result = await service.eraseAccount(UID);
  const row = result.locations.find((r) => r.kind === 'storage-prefix');
  assert.equal(row.status, STATUS.DELETED);
  assert.equal(row.deleted, 2);
  assert.deepEqual(bucket.deleted.sort(), [`qr-uploads/${UID}/sha-aaa.jpg`, `qr-uploads/${UID}/sha-bbb.jpg`]);
  assert.deepEqual(bucket.live, [`qr-uploads/${OTHER}/sha-zzz.jpg`]);
});

test('an empty storage prefix reports notFound, not a delete', async () => {
  const { service } = makeService({ files: [`qr-uploads/${OTHER}/sha-zzz.jpg`] });
  const result = await service.eraseAccount(UID);
  const row = result.locations.find((r) => r.kind === 'storage-prefix');
  assert.equal(row.status, STATUS.NOT_FOUND);
  assert.equal(row.deleted, 0);
});

test('the auth account is deleted, and an absent one is notFound rather than a failure', async () => {
  const present = makeService();
  const r1 = await present.service.eraseAccount(UID);
  assert.equal(byId(r1, 'auth-account').status, STATUS.DELETED);
  assert.deepEqual(present.admin.authDeleted, [UID]);

  const absent = makeService({ users: [] });
  const r2 = await absent.service.eraseAccount(UID);
  assert.equal(byId(r2, 'auth-account').status, STATUS.NOT_FOUND);
  assert.equal(r2.ok, true);
});

test('★ a mid-run failure is surfaced with the REMAINING locations, and the run continues', async () => {
  const { service, store } = makeService({ failOnDelete: `learnerProfiles/${UID}/sessions/s1/messages/m1` });
  const result = await service.eraseAccount(UID);

  assert.equal(result.ok, false, 'a partial run must never report ok');
  assert.equal(byId(result, 'learnerProfiles.sessions.messages').status, STATUS.FAILED);

  // ★ The parent is SKIPPED, not deleted: removing it would strand the message that
  // survived, leaving it orphaned and still readable — the map's own warning.
  assert.equal(byId(result, 'learnerProfiles.sessions').status, STATUS.SKIPPED);
  assert.equal(byId(result, 'learnerProfiles').status, STATUS.SKIPPED);
  assert.ok(store.docs.has(`learnerProfiles/${UID}`), 'the ancestor must survive with its stranded child');

  const remainingIds = result.remaining.map((r) => r.id);
  for (const id of ['learnerProfiles.sessions.messages', 'learnerProfiles.sessions', 'learnerProfiles']) {
    assert.ok(remainingIds.includes(id), `${id} must be named in remaining`);
  }

  // ...and everything unrelated was still erased. A failure must not abort the run.
  assert.equal(byId(result, 'topicMastery').status, STATUS.DELETED);
  assert.equal(byId(result, 'qrUploadSlots').status, STATUS.DELETED);
  assert.equal(byId(result, 'auth-account').status, STATUS.DELETED);
});

/* ══════════════════════════════════════════════════════════════════════════════
   8 · AVAILABILITY — honest 503 inputs, never a silent partial run
   ══════════════════════════════════════════════════════════════════════════════ */

test('isAvailable is false, with a reason, when a dependency is missing', () => {
  const noAdmin = createAccountErasureService({ adminFirestore: {}, resolveBucketName: () => 'b' });
  assert.equal(noAdmin.isAvailable(), false);
  assert.match(noAdmin.unavailableReason(), /firebase-admin/);

  const noBucket = createAccountErasureService({
    firebaseAdmin: {},
    adminFirestore: {},
    resolveBucketName: () => '',
  });
  assert.equal(noBucket.isAvailable(), false);
  assert.match(noBucket.unavailableReason(), /bucket/);
});

test('eraseAccount refuses an empty uid rather than walking the map against ""', async () => {
  const { service } = makeService();
  await assert.rejects(() => service.eraseAccount(''), /requires a uid/);
  await assert.rejects(() => service.eraseAccount('   '), /requires a uid/);
  await assert.rejects(() => service.eraseAccount(undefined), /requires a uid/);
});
