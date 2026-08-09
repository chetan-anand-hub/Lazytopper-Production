/**
 * accountErasure — walk STUDENT_DATA_MAP and delete every location it names.
 *
 * ★★ THE FAILURE THIS MODULE EXISTS TO PREVENT, stated first because every design
 * choice below is downstream of it:
 *
 *     A DELETE THAT MATCHES NOTHING MUST NEVER REPORT SUCCESS.
 *
 * LazyTopper's students are 14-16. India's DPDP Act treats them as children, so a
 * parent who asks for erasure is owed a real one. `qrUploadSlots` keys the student's
 * uid as a FIELD, not as the document id — so `collection('qrUploadSlots').doc(uid)
 * .delete()` matches nothing, throws nothing, and returns cleanly. Ship that and the
 * product tells a parent the account was erased while the child's handwriting
 * photographs are still live. Every location therefore reports `deleted: N` **or**
 * `notFound`, and the caller can tell them apart.
 *
 * ★★ THE MAP IS THE SPEC. This module ITERATES `STUDENT_DATA_MAP`; it never carries
 * a hand-written list. A hardcoded list drifts the day someone adds a collection,
 * which is the exact failure `studentDataMap.test.ts` exists to prevent. The strategy
 * for each location is DERIVED from that location's own `mechanism`, `kind` and
 * `path` template — so a new entry is walked automatically, and an entry whose shape
 * this walker cannot safely handle is REFUSED loudly rather than skipped quietly.
 *
 * ★ FIRESTORE DOES NOT CASCADE. The map's own type comment says so: deleting
 * `a/{uid}` leaves `a/{uid}/sub/*` orphaned and still readable. Subcollections are
 * therefore deleted EXPLICITLY and DEEPEST-FIRST, and a parent whose descendant
 * failed is SKIPPED rather than deleted — removing the parent while a child survives
 * turns recoverable data into an unattributable orphan.
 *
 * ★ WHAT THIS MODULE CANNOT DO, and says so in its result rather than pretending:
 *   - `local-storage` (`mechanism: "client-local"`) lives in the student's browser.
 *     No server reaches it. Reported `notServerErasable`. The browser half is
 *     SETTINGS-1's (wave DPDP-B).
 *   - `third-party.gemini` (`mechanism: "third-party-unreachable"`) left the product.
 *     Reported `notDeletable`. Machine-readable only — student-facing copy is not
 *     written here.
 *   Both appear in `remaining`, so `complete` is false and the caller cannot
 *   accidentally claim a whole-account erasure.
 */

const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { createRequire } = require('module');

const { __internals: qrInternals } = require('./qrUploadChannel.cjs');

/**
 * ★ The field `qrUploadSlots` keys the student by. Named once, here, because the
 * doc-id assumption is the defect this whole module is shaped around.
 * `qrUploadChannel.cjs` writes and reads these slots with `where('uid','==',uid)`;
 * `planErasure` marks every field-keyed location with this field so the plan is
 * inspectable rather than implicit.
 */
const UID_FIELD = 'uid';

/** Where the map lives, relative to this file. Resolved once. */
const STUDENT_DATA_MAP_PATH = path.join(__dirname, '..', '..', 'src', 'services', 'studentDataMap.ts');

/** How a location is reached. Derived per location — never assigned by hand. */
const STRATEGY = Object.freeze({
  /** `a/{uid}` / `a/{uid}/b/{x}` — the uid IS a document id; traverse and delete leaves. */
  FIRESTORE_DOC_TREE: 'firestore-doc-tree',
  /** ★ No `{uid}` document segment: the uid is a FIELD. Query it. */
  FIRESTORE_FIELD_QUERY: 'firestore-field-query',
  STORAGE_PREFIX: 'storage-prefix',
  AUTH_ACCOUNT: 'auth-account',
  /** Reachable only from the student's own browser. */
  NOT_SERVER_ERASABLE: 'not-server-erasable',
  /** Left the product; retention is a third party's. */
  NOT_DELETABLE: 'not-deletable',
  /** ★ A shape this walker will not guess at. Refused, never silently skipped. */
  UNSUPPORTED: 'unsupported',
});

const STATUS = Object.freeze({
  DELETED: 'deleted',
  /** ★ The query ran and matched nothing. NOT the same as success. */
  NOT_FOUND: 'notFound',
  FAILED: 'failed',
  /** The plan refused this location's shape; nothing was attempted. */
  REFUSED: 'refused',
  /** A descendant failed, so deleting this parent would strand it. */
  SKIPPED: 'skipped',
  NOT_SERVER_ERASABLE: 'notServerErasable',
  NOT_DELETABLE: 'notDeletable',
});

/* ────────────────────────────────────────────────────────────────────────────
   Loading the map into a CommonJS server process
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Install a `require.extensions['.ts']` transpiler IF one is not already present.
 *
 * ★ IT NEVER REPLACES AN EXISTING HOOK. In production `server/index.cjs` installs
 * one at boot (it already `require`s `../src/prompts/grind/trianglesGrindContract.ts`
 * through it), so this is a no-op there and the gateway's own loader stays
 * authoritative. The shim exists so this module is self-sufficient: a test, a script
 * or a future caller can require it from a cold Node process without first booting
 * the gateway, and `accountErasure.test.cjs` proves the map really does load.
 */
function ensureTsRequireHook() {
  if (require.extensions['.ts']) return false;
  // Required lazily: `typescript` is a devDependency that the Dockerfile
  // deliberately keeps installed at runtime for exactly this mechanism.
  const ts = require('typescript');
  require.extensions['.ts'] = (mod, filename) => {
    const raw = fs.readFileSync(filename, 'utf8');
    const source = raw.replace(/\bimport\.meta\b/g, '({ env: process.env })');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: { module: 'CommonJS', target: 'ES2020', esModuleInterop: true },
      fileName: path.basename(filename),
    });
    const fn = vm.runInThisContext(
      '(function(exports, require, module, __filename, __dirname) {\n' +
        transpiled.outputText +
        '\n})',
      { filename, lineOffset: 0, displayErrors: true }
    );
    fn(mod.exports, createRequire(filename), mod, filename, path.dirname(filename));
  };
  return true;
}

/** The live `STUDENT_DATA_MAP`, loaded through the `.ts` hook. Throws if it cannot. */
function loadStudentDataMap() {
  ensureTsRequireHook();
  // eslint-disable-next-line global-require
  const mod = require(STUDENT_DATA_MAP_PATH);
  const locations = mod && mod.STUDENT_DATA_MAP;
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('studentDataMap loaded but STUDENT_DATA_MAP is empty or not an array');
  }
  return locations;
}

/* ────────────────────────────────────────────────────────────────────────────
   Planning — pure, and the auditable half of this module
   ──────────────────────────────────────────────────────────────────────────── */

function templateSegments(pathTemplate) {
  return String(pathTemplate || '')
    .split('/')
    .filter((s) => s.length > 0);
}

const isUidSegment = (seg) => seg === '{uid}';
const isPlaceholder = (seg) => /^\{.+\}$/.test(seg);

/**
 * Which strategy reaches this location, and why.
 *
 * ★ EVERY BRANCH IS DERIVED FROM THE LOCATION ITSELF. There is no id in this
 * function and there must never be one: the moment a strategy is keyed on
 * `id === "qrUploadSlots"` the walker stops being a map-walker.
 */
function classifyLocation(location) {
  if (location.mechanism === 'client-local') {
    return { strategy: STRATEGY.NOT_SERVER_ERASABLE, reason: 'lives in the student browser' };
  }
  if (location.mechanism === 'third-party-unreachable') {
    return { strategy: STRATEGY.NOT_DELETABLE, reason: 'retention governed by a third party' };
  }

  if (location.kind === 'auth-account') return { strategy: STRATEGY.AUTH_ACCOUNT };

  if (location.kind === 'storage-prefix') {
    const segs = templateSegments(location.path);
    if (!segs.some(isUidSegment)) {
      return { strategy: STRATEGY.UNSUPPORTED, reason: 'storage path has no {uid} segment to scope by' };
    }
    return { strategy: STRATEGY.STORAGE_PREFIX };
  }

  if (location.kind === 'firestore-collection' || location.kind === 'firestore-subcollection') {
    const segs = templateSegments(location.path);
    if (segs.length === 0 || segs.length % 2 !== 0) {
      return { strategy: STRATEGY.UNSUPPORTED, reason: 'firestore path is not collection/document pairs' };
    }

    const uidIndex = segs.findIndex(isUidSegment);

    // ★★ THE FIELD-KEYED CASE — the one that silently deletes nothing.
    // No `{uid}` anywhere in the template means the uid cannot be a document id,
    // so it must be a field. Querying is the ONLY correct read of this shape.
    //
    // ★ But ONLY for a top-level `collection/{docId}` path. A NESTED path with no
    // `{uid}` cannot be reached by a `where()` on its root collection — the student's
    // documents live further down — and there is no scoped traversal to fall back on.
    // Guessing would either miss the data or walk every student's tree, so refuse.
    if (uidIndex < 0) {
      if (segs.length === 2) return { strategy: STRATEGY.FIRESTORE_FIELD_QUERY, field: UID_FIELD };
      return {
        strategy: STRATEGY.UNSUPPORTED,
        reason: 'nested path with no {uid} segment — a root field query cannot reach it',
      };
    }

    // `{uid}` must sit at a DOCUMENT position (odd index) to be a document id.
    if (uidIndex % 2 === 0) {
      return { strategy: STRATEGY.UNSUPPORTED, reason: '{uid} appears at a collection position' };
    }

    // ★★ THE ANTI-CATASTROPHE INVARIANT. A wildcard document segment is enumerated
    // — every document in that collection is deleted. That is only ever safe when
    // the traversal is ALREADY scoped to this student, i.e. a `{uid}` segment came
    // first. Without this, a future map entry of the shape `someCollection/{docId}`
    // that reached this branch would erase EVERY student's documents.
    for (let i = 1; i < segs.length; i += 2) {
      if (!isUidSegment(segs[i]) && isPlaceholder(segs[i]) && !(uidIndex >= 0 && uidIndex < i)) {
        return {
          strategy: STRATEGY.UNSUPPORTED,
          reason: 'wildcard document segment is not scoped by an earlier {uid}',
        };
      }
    }

    return { strategy: STRATEGY.FIRESTORE_DOC_TREE };
  }

  return { strategy: STRATEGY.UNSUPPORTED, reason: `unhandled kind "${location.kind}"` };
}

/**
 * Order matters and it is not cosmetic.
 *
 *  1. Firestore, DEEPEST FIRST — Firestore does not cascade, so children must go
 *     before parents or a failure strands them under a deleted document.
 *  2. Storage — the handwriting images.
 *  3. The auth account LAST. Delete the identity before the data and a mid-run
 *     failure leaves data no one can attribute, claim, or retry against.
 *  4. The locations no server can reach — informational, ordered last.
 */
function orderRank(location, strategy) {
  if (strategy === STRATEGY.FIRESTORE_DOC_TREE || strategy === STRATEGY.FIRESTORE_FIELD_QUERY) return 0;
  if (strategy === STRATEGY.STORAGE_PREFIX) return 1;
  if (strategy === STRATEGY.AUTH_ACCOUNT) return 2;
  if (strategy === STRATEGY.UNSUPPORTED) return 3;
  return 4;
}

/**
 * The full, ordered walk of a map. Pure: no Firestore, no credentials, no uid.
 * Exported so a test can audit the classification of all 29 locations at once
 * rather than spot-checking the one location somebody happened to mention.
 */
function planErasure(locations) {
  const planned = locations.map((location, index) => {
    const classified = classifyLocation(location);
    const depth = templateSegments(location.path).length;
    return {
      id: location.id,
      kind: location.kind,
      mechanism: location.mechanism,
      path: location.path,
      parentId: location.parentId,
      strategy: classified.strategy,
      field: classified.field,
      reason: classified.reason,
      depth,
      index,
    };
  });

  return planned.sort((a, b) => {
    const rank = orderRank(a, a.strategy) - orderRank(b, b.strategy);
    if (rank !== 0) return rank;
    if (a.depth !== b.depth) return b.depth - a.depth; // deepest first
    return a.index - b.index;
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Execution
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Document references in a collection.
 *
 * `listDocuments()` is preferred over `get()` because it also returns MISSING
 * documents — ones that hold subcollections but carry no fields of their own. A
 * `get()` cannot see those, and the subcollections beneath them are exactly the
 * orphans this module exists to prevent.
 */
async function listCollectionDocRefs(coll) {
  if (typeof coll.listDocuments === 'function') return (await coll.listDocuments()) || [];
  const snap = await coll.get();
  return snap && Array.isArray(snap.docs) ? snap.docs.map((d) => d.ref) : [];
}

/** Delete every leaf document a `{uid}`-scoped template resolves to. Returns the count. */
async function deleteFirestoreDocTree(db, pathTemplate, uid) {
  const segs = templateSegments(pathTemplate);
  let level = [null]; // null = the database root
  let enumerated = false;

  for (let i = 0; i < segs.length; i += 2) {
    const collectionName = segs[i];
    const docSegment = segs[i + 1];
    const next = [];
    for (const parent of level) {
      const coll = parent ? parent.collection(collectionName) : db.collection(collectionName);
      if (isUidSegment(docSegment)) {
        next.push(coll.doc(uid));
        continue;
      }
      enumerated = true;
      for (const ref of await listCollectionDocRefs(coll)) next.push(ref);
    }
    level = next;
    if (level.length === 0) break;
  }

  if (!enumerated) {
    // A single deterministic document. Its existence is the ONLY thing that can
    // distinguish "erased" from "there was nothing here", so read before deleting.
    let count = 0;
    for (const ref of level) {
      const snap = await ref.get();
      if (snap && snap.exists) {
        await ref.delete();
        count += 1;
      }
    }
    return count;
  }

  for (const ref of level) await ref.delete();
  return level.length;
}

/**
 * ★★ THE FIELD-KEYED DELETE. `qrUploadSlots` documents are keyed by
 * `sha256(uploadToken)`; the student is a `uid` FIELD on each one. A doc-id delete
 * here matches nothing and reports success — see this file's header.
 */
async function deleteFirestoreByField(db, pathTemplate, uid, field) {
  const segs = templateSegments(pathTemplate);
  const snap = await db.collection(segs[0]).where(field, '==', uid).get();
  const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
  for (const doc of docs) await doc.ref.delete();
  return docs.length;
}

/** `qr-uploads/{uid}/{slotId}.{ext}` -> `qr-uploads/<uid>/`. */
function storagePrefixFor(pathTemplate, uid) {
  const segs = templateSegments(pathTemplate);
  const idx = segs.findIndex(isUidSegment);
  if (idx < 0) return null;
  return `${segs.slice(0, idx + 1).map((s) => (isUidSegment(s) ? uid : s)).join('/')}/`;
}

async function deleteStoragePrefix(bucket, pathTemplate, uid) {
  const prefix = storagePrefixFor(pathTemplate, uid);
  if (!prefix) throw new Error('storage location has no {uid} segment');
  const result = await bucket.getFiles({ prefix });
  const files = (Array.isArray(result) ? result[0] : result) || [];
  for (const file of files) await file.delete();
  return files.length;
}

async function deleteAuthAccount(firebaseAdmin, uid) {
  try {
    await firebaseAdmin.auth().deleteUser(uid);
    return 1;
  } catch (e) {
    // An already-deleted account is `notFound`, not a failure — erasure is idempotent.
    if (e && e.code === 'auth/user-not-found') return 0;
    throw e;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   The service
   ──────────────────────────────────────────────────────────────────────────── */

function createAccountErasureService(deps = {}) {
  const {
    firebaseAdmin,
    adminFirestore,
    /** Test seam: a FIXTURE map. Production always loads the real one. */
    locations: injectedLocations,
    /**
     * ★ Reused from qrUploadChannel rather than copied. A second copy of the
     * bucket-name resolution would drift, and a drifted bucket name means erasure
     * quietly sweeps a bucket the handwriting images are not in — this module's
     * headline failure, wearing a different hat.
     */
    resolveBucketName = qrInternals.resolveBucketName,
  } = deps;

  let mapLoadError = null;
  let locations = injectedLocations || null;
  if (!locations) {
    try {
      locations = loadStudentDataMap();
    } catch (e) {
      // ★ Never kill the gateway at boot over this. `isAvailable()` goes false and
      // the route answers 503 with the reason, which is observable; a throw here
      // would take the whole product down.
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

  async function runOne(step, uid) {
    switch (step.strategy) {
      case STRATEGY.FIRESTORE_DOC_TREE:
        return deleteFirestoreDocTree(adminFirestore, step.path, uid);
      case STRATEGY.FIRESTORE_FIELD_QUERY:
        return deleteFirestoreByField(adminFirestore, step.path, uid, step.field || UID_FIELD);
      case STRATEGY.STORAGE_PREFIX:
        return deleteStoragePrefix(bucket(), step.path, uid);
      case STRATEGY.AUTH_ACCOUNT:
        return deleteAuthAccount(firebaseAdmin, uid);
      default:
        throw new Error(`no executor for strategy "${step.strategy}"`);
    }
  }

  /**
   * Erase everything the map names for `uid`.
   *
   * ★ `uid` is the caller's OWN, taken from a verified token by the route. There is
   * no "erase uid X" parameter anywhere in this module's surface, and adding one
   * would make it the account-takeover version of this feature.
   */
  async function eraseAccount(uid) {
    const trimmed = typeof uid === 'string' ? uid.trim() : '';
    if (!trimmed) throw new Error('eraseAccount requires a uid');

    const plan = planErasure(locations);
    const statuses = new Map();
    const childrenByParent = new Map();
    for (const step of plan) {
      if (!step.parentId) continue;
      if (!childrenByParent.has(step.parentId)) childrenByParent.set(step.parentId, []);
      childrenByParent.get(step.parentId).push(step);
    }

    const STRANDING = new Set([STATUS.FAILED, STATUS.REFUSED, STATUS.SKIPPED]);
    const hasStrandedDescendant = (step) => {
      for (const child of childrenByParent.get(step.id) || []) {
        if (STRANDING.has(statuses.get(child.id))) return true;
        if (hasStrandedDescendant(child)) return true;
      }
      return false;
    };

    const results = [];
    for (const step of plan) {
      const row = {
        id: step.id,
        kind: step.kind,
        mechanism: step.mechanism,
        path: step.path,
        strategy: step.strategy,
        status: null,
        deleted: 0,
      };

      if (step.strategy === STRATEGY.NOT_SERVER_ERASABLE) {
        row.status = STATUS.NOT_SERVER_ERASABLE;
        row.reason = step.reason;
      } else if (step.strategy === STRATEGY.NOT_DELETABLE) {
        row.status = STATUS.NOT_DELETABLE;
        row.reason = step.reason;
      } else if (step.strategy === STRATEGY.UNSUPPORTED) {
        row.status = STATUS.REFUSED;
        row.reason = step.reason;
      } else if (hasStrandedDescendant(step)) {
        // Deleting this parent now would leave its surviving children orphaned and
        // still readable — the map's own warning, applied to the failure case.
        row.status = STATUS.SKIPPED;
        row.reason = 'a descendant location was not erased; deleting this would orphan it';
      } else {
        try {
          const count = await runOne(step, trimmed);
          // ★★ ZERO MATCHED IS NOT SUCCESS.
          row.status = count > 0 ? STATUS.DELETED : STATUS.NOT_FOUND;
          row.deleted = count;
        } catch (e) {
          // Swallowing this is the same defect class the `users` write shipped with:
          // it failed for three months and nothing noticed. Record and keep going,
          // so the run erases what it can AND names what it could not.
          row.status = STATUS.FAILED;
          row.error = e && e.message ? e.message : String(e);
        }
      }

      statuses.set(step.id, row.status);
      results.push(row);
    }

    const summary = {
      total: results.length,
      documentsDeleted: results.reduce((n, r) => n + (r.deleted || 0), 0),
    };
    for (const value of Object.values(STATUS)) {
      summary[value] = results.filter((r) => r.status === value).length;
    }

    // Anything the server did not erase, whatever the reason. `local-storage` and
    // `third-party.gemini` are always here, so `complete` is always false — which
    // is the honest answer for a server-only erasure and must stay visible.
    const remaining = results
      .filter((r) => r.status !== STATUS.DELETED && r.status !== STATUS.NOT_FOUND)
      .map((r) => ({ id: r.id, status: r.status, reason: r.reason || r.error }));

    const failed = results.filter(
      (r) => r.status === STATUS.FAILED || r.status === STATUS.REFUSED || r.status === STATUS.SKIPPED
    );

    return {
      ok: failed.length === 0,
      complete: remaining.length === 0,
      locations: results,
      summary,
      remaining,
    };
  }

  return { isAvailable, unavailableReason, eraseAccount, plan: () => planErasure(locations) };
}

module.exports = {
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
  STUDENT_DATA_MAP_PATH,
};
