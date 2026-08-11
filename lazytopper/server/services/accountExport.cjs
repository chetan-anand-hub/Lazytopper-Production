/**
 * accountExport — walk STUDENT_DATA_MAP and hand a student back everything it names.
 *
 * ★★ THE FAILURE THIS MODULE EXISTS TO PREVENT, stated first because every design
 * choice below is downstream of it:
 *
 *     AN EXPORT THAT QUIETLY LEAVES SOMETHING OUT IS WORSE THAN NO EXPORT,
 *     BECAUSE IT LOOKS COMPLETE.
 *
 * LazyTopper's students are 14-16. India's DPDP Act treats them as children, so a
 * parent who asks for the data is owed all of it — and, where we cannot give it,
 * owed a plain statement of what is missing and why. A file that silently omits the
 * one location we cannot export tells a parent, by its silence, that the location
 * does not exist. So every location the map names appears in the output: as DATA
 * when we can read it, and as a DISCLOSURE when we cannot.
 *
 * ★★ THE MAP IS THE SPEC, AND THE WALKER IS ERASE-1'S. This module does not carry a
 * hand-written list and it does not carry a second copy of the traversal logic
 * either. `planErasure` / `classifyLocation` in `accountErasure.cjs` already derive,
 * for every location, WHICH SHAPE it is — a `{uid}`-scoped document tree, a
 * field-keyed collection, a storage prefix, the auth account, or something no server
 * can reach. That classification is about the SHAPE OF THE PATH, not about deletion,
 * so it is exactly as true for a read as for a delete. This module consumes it
 * unchanged and adds the one thing that IS export-specific: the `exportable` flag.
 * `accountErasure.cjs` is imported and NOT modified.
 *
 * ★ WHY REUSE MATTERED HERE SPECIFICALLY. A second walker would have to re-derive
 * the anti-catastrophe invariant that refuses an unscoped wildcard document segment
 * — the guard that stops a future map entry of the shape `someCollection/{docId}`
 * from ranging over EVERY student. Getting that wrong in an exporter does not delete
 * anyone's data; it hands one child another child's. One walker, one invariant.
 *
 * ★ WHAT THIS MODULE CANNOT DO, and says so in the file rather than pretending:
 *   - `exportable: false` (today: `third-party.gemini`). EXCLUDED from the data AND
 *     named in `disclosures`. This is the requirement, not a nicety: exclusion
 *     without disclosure is the dishonest option.
 *   - `mechanism: "third-party-unreachable"` (today: the same row). The answers that
 *     left the product for the AI provider are retained on that provider's terms,
 *     not ours. Disclosed with fixed copy that a test pins.
 *   - `mechanism: "client-local"` (today: `local-storage`). It lives in the
 *     student's own browser; no server reaches it. Disclosed, and it keeps
 *     `complete` false — which is the honest answer for a server-side export.
 *
 * ★ TODAY THE FIRST TWO ARE THE SAME SINGLE ROW. Re-derived from trunk: the map has
 * 29 locations, exactly ONE with `exportable: false` and exactly ONE with
 * `mechanism: "third-party-unreachable"`, AND THEY ARE THE SAME ENTRY
 * (`third-party.gemini`). That coincidence is not designed in anywhere below: the
 * two predicates are evaluated independently and a row can carry either, both, or
 * neither. `accountExport.test.cjs` proves it with a fixture map that splits them.
 *
 * ★ PARTIAL IS REPORTED, NEVER SWALLOWED — ERASE-1's contract, mirrored. A location
 * whose read throws is `failed` with its reason, the run continues, `ok` goes false,
 * and the route answers 207 rather than 200. An export that read 27 of 29 locations
 * must never render as "here is your data".
 *
 * ★★ WHY THIS WALK IS CONCURRENT AND TIME-BOUNDED — the defect EXPORT-PERF fixed.
 *
 * Owner-observed in production, on a real account:
 *
 *     request aborted · GET /api/account/export · res.statusCode: null · responseTime: 119978
 *
 * ~120 seconds, then the connection died under the api-server and the browser got a
 * 502. NOTHING CRASHED — the export was still reading. A student could not complete a
 * legally-required DPDP flow.
 *
 * ★★ AND THE DOMINANT COST WAS NOT THE 29 LOCATIONS. Measured against the previous
 * revision with an instrumented driver: MAX CONCURRENT I/O WAS 1, and the round-trip
 * count tracked DOCUMENTS, not locations — 300 seeded documents produced 327
 * sequential round trips. The critical path was O(documents), because the final read
 * in `readFirestoreDocTree` fetched one document per round trip in series. Making only
 * the 29-location walk concurrent would have left ~300 of those 327 round trips
 * exactly where they were. Both levels are concurrent here, and the per-document read
 * is the one that mattered.
 *
 * ★ THE BOUND IS EXPLICIT, because an unbounded `Promise.all` over a student's whole
 * tree is just a different way to hurt the gateway: `PLAN_CONCURRENCY` locations in
 * flight, `READ_CONCURRENCY` reads inside each — a stated ceiling of their product.
 *
 * ★ AND THE BUDGET REUSES THE CONTRACT THAT ALREADY EXISTED, rather than inventing a
 * second one beside it. A run that reaches `budgetMs` stops starting new work and
 * reports what it could not read through the SAME `omissions` / `failed` channel the
 * storage caps already used — which already drives `ok:false`, which the route already
 * turns into a 207. No new partial mechanism, no divergence hazard.
 *
 * ★ ORDER IS PRESERVED REGARDLESS OF COMPLETION ORDER. Rows, records and disclosures
 * are assembled by INDEX, never by whichever read finished first, so the file a parent
 * opens is byte-stable across runs. `accountExport.test.cjs` pins this.
 */

const {
  loadStudentDataMap,
  planErasure,
  templateSegments,
  STRATEGY,
  UID_FIELD,
} = require('./accountErasure.cjs');

const { __internals: qrInternals } = require('./qrUploadChannel.cjs');

/**
 * ★ Stack-frame stripping, reused from the response sink rather than re-written.
 *
 * On a STRING, `redactErrorDetails` does one thing: it removes V8 stack frames.
 * That is what we want on a caught error's text before it goes into a student-facing
 * file (CodeQL js/stack-trace-exposure — see httpUtils.cjs). We deliberately do NOT
 * run it over the exported DATA; see the note on `buildExport` below for why that
 * would corrupt the very thing this module exists to return.
 */
const { redactErrorDetails } = require('./httpUtils.cjs');

/* ────────────────────────────────────────────────────────────────────────────
   Status vocabulary
   ──────────────────────────────────────────────────────────────────────────── */

const EXPORT_STATUS = Object.freeze({
  /** Read succeeded and returned at least one record. */
  EXPORTED: 'exported',
  /** ★ The read RAN and there was nothing there. An honest empty, never a fabricated shell. */
  EMPTY: 'empty',
  /** ★ `exportable: false`. Deliberately withheld — and named in `disclosures`. */
  EXCLUDED: 'excluded',
  /** Lives in the student's own browser. */
  NOT_SERVER_EXPORTABLE: 'notServerExportable',
  /** Left the product; retention is a third party's. */
  NOT_EXPORTABLE: 'notExportable',
  /** ★ A shape the walker will not guess at. Refused loudly, never skipped quietly. */
  REFUSED: 'refused',
  /** The read threw. Reported with its reason; the run continues. */
  FAILED: 'failed',
});

/* ────────────────────────────────────────────────────────────────────────────
   DISCLOSURE COPY — a parent reads these sentences, so they are pinned by tests
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ★★ DO NOT SOFTEN THIS. It is the one sentence in the product that tells a parent
 * their child's work reached a company that is not us, and that we cannot get it
 * back. `accountExport.test.cjs` asserts this string is present verbatim.
 */
const DISCLOSURE_THIRD_PARTY =
  'Some of your work was sent to an outside AI service so it could be marked or explained. ' +
  'LazyTopper cannot export or delete what that service keeps: how long it is held is decided ' +
  'by that provider, not by LazyTopper.';

const DISCLOSURE_NOT_EXPORTABLE =
  'The contents of this location cannot be included in an export. It is listed here so that its ' +
  'absence is visible rather than silent.';

const DISCLOSURE_CLIENT_LOCAL =
  'This is stored only on the device you used LazyTopper on, so a server cannot read it and it is ' +
  'not in this file. You can clear it from that device in the app settings.';

const DISCLOSURE_REFUSED =
  'LazyTopper could not work out how to read this location safely, so it did not try. Nothing was ' +
  'guessed at. This is a defect and is reported rather than hidden.';

const DISCLOSURE_FAILED =
  'LazyTopper tried to read this location and the read failed. The reason is recorded alongside ' +
  'this line. Your export is therefore incomplete.';

/**
 * ★ The plain-English header a parent reads BEFORE any data. Legibility is a real
 * requirement of this lane, not a nicety, and this is half of how it is met — the
 * other half is that every location row carries the map's own `holds` sentence.
 *
 * ★ NOTE WHAT IT DOES NOT SAY. It never says "this is everything". It says the file
 * lists every place LazyTopper knows about and names what is missing.
 */
const README_LINES = Object.freeze([
  'This file is your LazyTopper data export.',
  'It lists every place LazyTopper knows a student\'s data can be stored, and for each one it ' +
    'either includes what was found or explains why it could not be included.',
  'Read "locations" for your data. Each entry has a "holds" line in plain English saying what ' +
    'that place is for.',
  'Read "disclosures" for anything NOT included, and why. If that list is not empty, this export ' +
    'is not the whole picture — and it says so rather than letting you assume otherwise.',
  '"complete" is true only when nothing at all was left out.',
  'This file is JSON. It can be opened in any text editor and read by any program.',
]);

/* ────────────────────────────────────────────────────────────────────────────
   Serialisation — Firestore values a parent can actually read
   ──────────────────────────────────────────────────────────────────────────── */

/** Firestore caps nesting at 20 levels; 32 can only be reached by a cycle. */
const MAX_VALUE_DEPTH = 32;
const TOO_DEEP = '[not exported: value nested too deeply]';

/**
 * Firestore hands back Timestamps, GeoPoints, DocumentReferences and Buffers.
 * `JSON.stringify` turns a Timestamp into `{_seconds, _nanoseconds}`, which is
 * machine-readable and unreadable to a human. Convert to plain, legible values —
 * this is a rendering of the same information, never a filter on it.
 */
function toPlainJson(value, depth = 0) {
  if (depth > MAX_VALUE_DEPTH) return TOO_DEEP;
  if (value === null || value === undefined) return null;

  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') return Number.isFinite(value) ? value : String(value);
  if (t === 'bigint') return value.toString();
  if (t === 'function' || t === 'symbol') return null;

  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => toPlainJson(v, depth + 1));

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return { encoding: 'base64', bytes: value.length, data: value.toString('base64') };
  }
  if (value instanceof Uint8Array) {
    const buf = Buffer.from(value);
    return { encoding: 'base64', bytes: buf.length, data: buf.toString('base64') };
  }

  // Firestore Timestamp — the shape students see most, on every createdAt.
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      /* fall through to the generic object walk */
    }
  }
  if (typeof value._seconds === 'number' && typeof value._nanoseconds === 'number') {
    return new Date(value._seconds * 1000 + Math.round(value._nanoseconds / 1e6)).toISOString();
  }
  // GeoPoint.
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  // DocumentReference — a pointer, exported as the path it points at.
  if (typeof value.path === 'string' && value.firestore) return { reference: value.path };

  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = toPlainJson(v, depth + 1);
  return out;
}

/**
 * ★ The map's `holds` sentence, as a PARENT should read it.
 *
 * `holds` is written for two audiences at once. The prose is plain English and goes
 * straight into the export — but 9 of the 29 entries open with the repo's `★` /
 * `★★` engineering emphasis markers, which mean "an engineer should notice this" and
 * mean nothing at all to a parent. Only the LEADING markers are removed (verified:
 * no `holds` value carries one mid-sentence), so not one word of the sentence
 * changes. This is the one transformation applied to the map's own copy, and it is
 * here rather than in the map because the map's readers are engineers.
 */
function plainHolds(holds) {
  if (typeof holds !== 'string') return null;
  return holds.replace(/^[★\s]+/, '').trim() || null;
}

/** A caught error, reduced to one line with no stack frames and no absolute paths. */
function safeReason(e) {
  const raw = e && e.message ? String(e.message) : String(e);
  return String(redactErrorDetails(raw)).split('\n')[0].slice(0, 300);
}

/* ────────────────────────────────────────────────────────────────────────────
   Concurrency and the time budget — see the header for why both exist
   ──────────────────────────────────────────────────────────────────────────── */

/** Locations read at once. */
const PLAN_CONCURRENCY = 6;
/** Documents or files read at once WITHIN one location. */
const READ_CONCURRENCY = 8;
/**
 * ★ The wall-clock ceiling on a single export.
 *
 * Production died at ~120s against an upstream that had already given up. This sits
 * far enough below that the run still has time to serialise and send what it DID
 * read — a 207 naming the gap is a usable answer, an aborted connection is not.
 */
const DEFAULT_BUDGET_MS = 45_000;

/**
 * Run `fn` over `items` with at most `limit` in flight, RESULTS IN INPUT ORDER.
 *
 * ★ A worker pool, deliberately not `Promise.all` over a mapped array: the pool never
 * materialises more than `limit` in-flight operations, so a student with twenty
 * thousand documents does not create twenty thousand live promises at once. Order is
 * carried by writing into `out[i]`, so nothing downstream depends on completion order.
 */
async function mapWithConcurrency(items, limit, fn) {
  const list = Array.isArray(items) ? items : [...items];
  const out = new Array(list.length);
  if (list.length === 0) return out;

  let cursor = 0;
  const workers = new Array(Math.max(1, Math.min(limit, list.length))).fill(null).map(async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= list.length) return;
      out[i] = await fn(list[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Has the run used up its wall-clock budget? A null deadline means "no budget". */
function pastDeadline(deadline) {
  return typeof deadline === 'number' && Date.now() >= deadline;
}

/* ────────────────────────────────────────────────────────────────────────────
   Readers — one per strategy the shared walker can produce
   ──────────────────────────────────────────────────────────────────────────── */

const isUidSegment = (seg) => seg === '{uid}';

/**
 * Document refs in a collection.
 *
 * `listDocuments()` also returns MISSING documents — ancestors that hold
 * subcollections but carry no fields. They export as nothing (there is nothing in
 * them), and their children are reached by the map's own deeper entry, so a missing
 * ancestor never hides data from this export.
 */
async function listCollectionDocRefs(coll) {
  if (typeof coll.listDocuments === 'function') return (await coll.listDocuments()) || [];
  const snap = await coll.get();
  return snap && Array.isArray(snap.docs) ? snap.docs.map((d) => d.ref) : [];
}

/**
 * Read every document a `{uid}`-scoped template resolves to.
 *
 * The traversal is deliberately the same walk `deleteFirestoreDocTree` performs, for
 * the property that matters: WHAT AN ERASURE DELETES AND WHAT AN EXPORT RETURNS MUST
 * BE THE SAME SET. If they diverge, a student can be handed a file that omits
 * something erasure will still destroy, or shown data erasure will leave behind.
 */
async function readFirestoreDocTree(db, pathTemplate, uid, opts = {}) {
  const { concurrency = READ_CONCURRENCY, deadline = null } = opts;
  const segs = templateSegments(pathTemplate);
  const omissions = [];
  let level = [null];

  for (let i = 0; i < segs.length; i += 2) {
    const collectionName = segs[i];
    const docSegment = segs[i + 1];
    const collFor = (parent) =>
      parent ? parent.collection(collectionName) : db.collection(collectionName);

    if (isUidSegment(docSegment)) {
      // No I/O: a `{uid}` segment names exactly one document per parent.
      level = level.map((parent) => collFor(parent).doc(uid));
    } else {
      if (pastDeadline(deadline)) {
        omissions.push(
          `the export time budget was reached before the "${collectionName}" collection could be listed`
        );
        level = [];
        break;
      }
      // ★ Each parent's listing is an independent round trip; they fan out.
      const listed = await mapWithConcurrency(level, concurrency, (parent) =>
        listCollectionDocRefs(collFor(parent))
      );
      level = listed.flat();
    }
    if (level.length === 0) break;
  }

  // ★★ THE READ THAT DOMINATED THE 120-SECOND RUN. One round trip per document, and
  // it used to be a plain `for … await`. The pool keeps it bounded; `out[i]` keeps the
  // records in path order whatever order the reads land in.
  const results = await mapWithConcurrency(level, concurrency, async (ref) => {
    if (pastDeadline(deadline)) return { overBudget: true };
    const snap = await ref.get();
    if (!snap || !snap.exists) return null;
    return { record: { path: ref.path || null, id: ref.id || null, data: toPlainJson(snap.data()) } };
  });

  const records = [];
  let overBudget = 0;
  for (const r of results) {
    if (!r) continue;
    if (r.overBudget) overBudget += 1;
    else records.push(r.record);
  }
  if (overBudget > 0) {
    omissions.push(
      `${overBudget} document(s) under "${pathTemplate}" were not read: the export time budget was reached`
    );
  }

  return { records, omissions };
}

/**
 * ★★ THE FIELD-KEYED READ. `qrUploadSlots` documents are keyed by
 * `sha256(uploadToken)`; the student is a `uid` FIELD on each one. A doc-id read here
 * matches nothing, throws nothing, and would export an empty section that looks like
 * an honest "you have none" — the read-side twin of ERASE-1's headline defect.
 */
async function readFirestoreByField(db, pathTemplate, uid, field) {
  const segs = templateSegments(pathTemplate);
  const snap = await db.collection(segs[0]).where(field, '==', uid).get();
  const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
  return docs.map((d) => ({
    path: (d.ref && d.ref.path) || null,
    id: d.id || null,
    data: toPlainJson(d.data()),
  }));
}

/** `qr-uploads/{uid}/{slotId}.{ext}` -> `qr-uploads/<uid>/`. */
function storagePrefixFor(pathTemplate, uid) {
  const segs = templateSegments(pathTemplate);
  const idx = segs.findIndex(isUidSegment);
  if (idx < 0) return null;
  return `${segs.slice(0, idx + 1).map((s) => (isUidSegment(s) ? uid : s)).join('/')}/`;
}

/**
 * The handwriting photographs.
 *
 * ★ THE BYTES ARE THE DATA. A list of filenames is not a portable copy of a
 * photograph of your own handwriting, so the file contents are included, base64.
 *
 * ★ AND THE CAPS ARE DISCLOSED, NOT SILENT. A single response is built in memory, so
 * an unbounded download is a way for a student to take the gateway down by accident.
 * A file that exceeds a cap keeps its metadata, is marked `contentOmitted` with the
 * reason, and its location reports `partial` — the same rule as everywhere else here:
 * we may leave something out, we may never leave it out quietly.
 */
async function readStoragePrefix(bucket, pathTemplate, uid, caps, opts = {}) {
  const { concurrency = READ_CONCURRENCY, deadline = null } = opts;
  const prefix = storagePrefixFor(pathTemplate, uid);
  if (!prefix) throw new Error('storage location has no {uid} segment');
  const result = await bucket.getFiles({ prefix });
  const files = (Array.isArray(result) ? result[0] : result) || [];

  /* ── Pass 1 · admission, decided from METADATA ALONE, in listing order.
     ★★ THIS PASS IS WHY THE DOWNLOADS CAN SAFELY RUN AT ONCE. The old code accumulated
     the total against bytes AS THEY ARRIVED, so once downloads overlap, WHICH file is
     omitted depends on which download happens to finish first. On a legal artefact
     that is not acceptable: the same account must export the same file twice running.
     Sizes are known before any transfer, so the whole decision is made here, in order,
     and the transfer below cannot influence it. */
  const planned = [];
  let projectedBytes = 0;

  for (const file of files) {
    const meta = file.metadata || {};
    const size = Number(meta.size || 0);
    const record = {
      path: file.name || null,
      id: file.name || null,
      data: {
        name: file.name || null,
        contentType: meta.contentType || null,
        sizeBytes: Number.isFinite(size) && size > 0 ? size : null,
        updated: meta.updated || null,
      },
    };

    let omitted = null;
    if (Number.isFinite(size) && size > caps.maxFileBytes) {
      omitted = `file is ${size} bytes, over the ${caps.maxFileBytes}-byte per-file export limit`;
    } else if (projectedBytes >= caps.maxTotalBytes) {
      omitted = `the ${caps.maxTotalBytes}-byte total export limit for files was already reached`;
    }

    if (omitted) {
      record.data.contentOmitted = true;
      record.data.contentOmittedReason = omitted;
      planned.push({ record, file, admitted: false, omitted });
    } else {
      if (Number.isFinite(size) && size > 0) projectedBytes += size;
      planned.push({ record, file, admitted: true, omitted: null });
    }
  }

  /* ── Pass 2 · the admitted files transfer concurrently. */
  await mapWithConcurrency(
    planned.filter((p) => p.admitted),
    concurrency,
    async (p) => {
      if (pastDeadline(deadline)) {
        p.omitted = 'the export time budget was reached before this file could be downloaded';
        p.record.data.contentOmitted = true;
        p.record.data.contentOmittedReason = p.omitted;
        return;
      }
      const downloaded = await p.file.download();
      const buf = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded[0]);
      p.record.data.encoding = 'base64';
      p.record.data.content = buf.toString('base64');
      if (p.record.data.sizeBytes === null) p.record.data.sizeBytes = buf.length;
    }
  );

  /* ── Pass 3 · disclosures collected IN LISTING ORDER, not completion order. */
  const omissions = [];
  for (const p of planned) {
    if (p.omitted) omissions.push(`${p.record.path}: ${p.omitted}`);
  }

  return { records: planned.map((p) => p.record), omissions };
}

/**
 * The account itself. `auth/user-not-found` is EMPTY, not a failure — the same
 * idempotence ERASE-1 gives a second erasure.
 */
async function readAuthAccount(firebaseAdmin, uid) {
  let user;
  try {
    user = await firebaseAdmin.auth().getUser(uid);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') return [];
    throw e;
  }
  if (!user) return [];
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return [{ path: `firebase-auth/users/${uid}`, id: uid, data: toPlainJson(plain) }];
}

/* ────────────────────────────────────────────────────────────────────────────
   The service
   ──────────────────────────────────────────────────────────────────────────── */

/** Per-file and total ceilings on binary content. Overridable for tests. */
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_FILE_BYTES = 25 * 1024 * 1024;

function createAccountExportService(deps = {}) {
  const {
    firebaseAdmin,
    adminFirestore,
    /** Test seam: a FIXTURE map. Production always loads the real one. */
    locations: injectedLocations,
    /** ★ Reused from qrUploadChannel exactly as ERASE-1 does — a second copy drifts. */
    resolveBucketName = qrInternals.resolveBucketName,
    maxFileBytes = DEFAULT_MAX_FILE_BYTES,
    maxTotalFileBytes = DEFAULT_MAX_TOTAL_FILE_BYTES,
    now = () => new Date(),
    /** Wall-clock ceiling for one export. `0` disables the budget. */
    budgetMs = Number(process.env.LT_EXPORT_BUDGET_MS || DEFAULT_BUDGET_MS),
    planConcurrency = PLAN_CONCURRENCY,
    readConcurrency = READ_CONCURRENCY,
  } = deps;

  const caps = { maxFileBytes, maxTotalBytes: maxTotalFileBytes };

  let mapLoadError = null;
  let locations = injectedLocations || null;
  if (!locations) {
    try {
      locations = loadStudentDataMap();
    } catch (e) {
      // ★ Never kill the gateway at boot over this — ERASE-1's rule, and the reason
      // the erasure route can answer 503 instead of the product being down.
      mapLoadError = e && e.message ? e.message : String(e);
      locations = [];
    }
  }

  function isAvailable() {
    return Boolean(firebaseAdmin && adminFirestore && locations.length > 0 && resolveBucketName());
  }

  function unavailableReason() {
    if (mapLoadError) return `student data map unavailable: ${mapLoadError}`;
    if (!firebaseAdmin || !adminFirestore) return 'firebase-admin is not initialised';
    if (!resolveBucketName()) return 'storage bucket name is not resolvable';
    return null;
  }

  function bucket() {
    return firebaseAdmin.storage().bucket(resolveBucketName());
  }

  /**
   * ★ THE PLAN IS ERASE-1'S, RE-ORDERED FOR A READER.
   *
   * `planErasure` sorts deepest-first because Firestore does not cascade and a
   * delete must not strand a child. An export has no such constraint, and
   * deepest-first would open the file on `.../sessions/{id}/messages/{id}` — so the
   * rows are restored to MAP ORDER, which is the curated, section-commented order a
   * human wrote. `index` is carried on every plan row for exactly this.
   */
  function plan() {
    return planErasure(locations).slice().sort((a, b) => a.index - b.index);
  }

  async function readOne(step, uid, ctx) {
    switch (step.strategy) {
      case STRATEGY.FIRESTORE_DOC_TREE:
        return readFirestoreDocTree(adminFirestore, step.path, uid, ctx);
      case STRATEGY.FIRESTORE_FIELD_QUERY:
        return {
          records: await readFirestoreByField(adminFirestore, step.path, uid, step.field || UID_FIELD),
        };
      case STRATEGY.STORAGE_PREFIX:
        return readStoragePrefix(bucket(), step.path, uid, caps, ctx);
      case STRATEGY.AUTH_ACCOUNT:
        return { records: await readAuthAccount(firebaseAdmin, uid) };
      default:
        throw new Error(`no reader for strategy "${step.strategy}"`);
    }
  }

  /**
   * Export everything the map names for `uid`.
   *
   * ★ `uid` is the caller's OWN, taken from a verified token by the route. There is
   * no "export uid X" parameter on this module's surface and adding one would make
   * it the data-theft version of this feature — the read-side twin of the rule
   * ERASE-1 states about its own uid.
   */
  async function exportAccount(uid) {
    const trimmed = typeof uid === 'string' ? uid.trim() : '';
    if (!trimmed) throw new Error('exportAccount requires a uid');

    const byId = new Map(locations.map((l) => [l.id, l]));

    // ★ ONE DEADLINE FOR THE WHOLE RUN, fixed before any read starts, so every
    // location is measured against the same clock rather than against its own start.
    const deadline = budgetMs > 0 ? Date.now() + budgetMs : null;
    const ctx = { concurrency: readConcurrency, deadline };

    /** One location → its row and, if it owes the reader an explanation, its disclosure. */
    async function walkStep(step) {
      const location = byId.get(step.id) || {};
      const row = {
        id: step.id,
        kind: step.kind,
        path: step.path,
        // ★ The map's OWN plain-language sentence. Legibility that cannot rot
        // separately from the map, because it IS the map.
        holds: plainHolds(location.holds),
        status: null,
        recordCount: 0,
        records: [],
      };
      const disclose = (extra) => ({
        id: step.id, kind: step.kind, path: step.path, holds: row.holds,
        status: row.status, ...extra,
      });

      // ★★ THE EXPORTABLE FLAG IS CHECKED FIRST AND ON ITS OWN. It is a property of
      // the location, not of its mechanism, and the two must never be conflated:
      // today one row happens to carry both, and a map where they diverge must still
      // behave. Excluded means NO DATA IS READ AT ALL — not read-then-filtered.
      if (location.exportable === false) {
        row.status = EXPORT_STATUS.EXCLUDED;
        const reasons = [DISCLOSURE_NOT_EXPORTABLE];
        if (step.mechanism === 'third-party-unreachable') reasons.push(DISCLOSURE_THIRD_PARTY);
        return { row, disclosure: disclose({ reasons }) };
      }

      if (step.strategy === STRATEGY.NOT_DELETABLE) {
        // Exportable in principle, unreachable in fact: it left the product.
        row.status = EXPORT_STATUS.NOT_EXPORTABLE;
        return { row, disclosure: disclose({ reasons: [DISCLOSURE_THIRD_PARTY] }) };
      }
      if (step.strategy === STRATEGY.NOT_SERVER_ERASABLE) {
        row.status = EXPORT_STATUS.NOT_SERVER_EXPORTABLE;
        return { row, disclosure: disclose({ reasons: [DISCLOSURE_CLIENT_LOCAL] }) };
      }
      if (step.strategy === STRATEGY.UNSUPPORTED) {
        row.status = EXPORT_STATUS.REFUSED;
        row.reason = step.reason;
        return {
          row,
          disclosure: disclose({ reasons: [DISCLOSURE_REFUSED], detailReason: step.reason }),
        };
      }

      // ★ A location the budget ran out on before it was even started is FAILED with
      // that reason — the same channel a thrown read uses, so it reaches the student
      // through the contract that already exists rather than a second one.
      if (pastDeadline(deadline)) {
        row.status = EXPORT_STATUS.FAILED;
        row.reason = `not read: the ${budgetMs}ms export time budget was reached before this location was started`;
        return {
          row,
          disclosure: disclose({ reasons: [DISCLOSURE_FAILED], detailReason: row.reason }),
        };
      }

      try {
        const { records, omissions } = await readOne(step, trimmed, ctx);
        row.records = records;
        row.recordCount = records.length;
        // ★★ AN EMPTY ACCOUNT IS AN HONEST EMPTY, NOT AN ERROR AND NOT A SHELL.
        row.status = records.length > 0 ? EXPORT_STATUS.EXPORTED : EXPORT_STATUS.EMPTY;
        if (omissions && omissions.length) {
          row.partial = true;
          row.omissions = omissions;
          return {
            row,
            disclosure: disclose({
              partial: true,
              reasons: omissions.map((o) => `Part of this location was not included — ${o}`),
            }),
          };
        }
        return { row, disclosure: null };
      } catch (e) {
        // Swallowing this is the defect class the dead `users` write shipped with:
        // it failed for months and nothing noticed. Record it, keep going, and let
        // the caller see an incomplete export as incomplete.
        row.status = EXPORT_STATUS.FAILED;
        row.reason = safeReason(e);
        return {
          row,
          disclosure: disclose({ reasons: [DISCLOSURE_FAILED], detailReason: row.reason }),
        };
      }
    }

    // ★ Locations run concurrently; the results come back IN MAP ORDER, so `rows` and
    // `disclosures` below are assembled by index and never by who finished first.
    const outcomes = await mapWithConcurrency(plan(), planConcurrency, walkStep);

    const rows = [];
    const disclosures = [];
    for (const outcome of outcomes) {
      rows.push(outcome.row);
      if (outcome.disclosure) disclosures.push(outcome.disclosure);
    }

    const summary = { total: rows.length, recordsExported: 0 };
    for (const value of Object.values(EXPORT_STATUS)) {
      summary[value] = rows.filter((r) => r.status === value).length;
    }
    summary.recordsExported = rows.reduce((n, r) => n + (r.recordCount || 0), 0);

    const broken = rows.filter(
      (r) => r.status === EXPORT_STATUS.FAILED || r.status === EXPORT_STATUS.REFUSED || r.partial
    );

    return {
      format: 'lazytopper.data-export',
      formatVersion: 1,
      generatedAt: now().toISOString(),
      account: { uid: trimmed },
      readme: [...README_LINES],
      // `ok` — nothing went wrong. `complete` — nothing was left out. They are
      // different questions and a server-side export can only ever answer the first
      // one yes, which is why both are printed.
      ok: broken.length === 0,
      complete: disclosures.length === 0,
      summary,
      disclosures,
      locations: rows,
    };
  }

  return { isAvailable, unavailableReason, exportAccount, plan };
}

module.exports = {
  createAccountExportService,
  toPlainJson,
  plainHolds,
  storagePrefixFor,
  safeReason,
  EXPORT_STATUS,
  README_LINES,
  DISCLOSURE_THIRD_PARTY,
  DISCLOSURE_NOT_EXPORTABLE,
  DISCLOSURE_CLIENT_LOCAL,
  DISCLOSURE_REFUSED,
  DISCLOSURE_FAILED,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_TOTAL_FILE_BYTES,
  PLAN_CONCURRENCY,
  READ_CONCURRENCY,
  DEFAULT_BUDGET_MS,
  mapWithConcurrency,
};
