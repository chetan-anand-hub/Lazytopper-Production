/**
 * trialEnsure.cjs — POST /api/trial/ensure-signup (TRIAL-SAVE-1)
 *
 * A NEW account's 7-day trial is started by the browser at sign-up (activateTrial ->
 * subscriptionService.saveCloud). That write can fail (flaky network, a rules/App-Check
 * hiccup) and the browser swallowed the failure: the next load read "no document", wrote the
 * free default over the local trial and the student sat on Basic with no trial and no retry.
 *
 * This is the SERVER-side safety net for that one lost write. firestore.rules make it
 * impossible for the browser to re-issue "the same date" (a client may only write
 * `trialStartDate == request.time`), so only the Admin SDK can restore the sign-up trial.
 *
 * Limits (all enforced here, none trusted from the client):
 *   - the uid comes ONLY from the verified ID token (shared verifiedCaller); the body is
 *     never read;
 *   - the Auth account must have been created < 24 h ago (Auth metadata `creationTime`);
 *     an older account -> 409 and NOTHING is written (no trial on login or reload);
 *   - CREATE-ONLY inside a Firestore transaction: if `subscriptions/{uid}` already exists in
 *     ANY shape (a trial, a pass, a free default, a grant) nothing is touched -> 200
 *     `{created:false}`. An existing trial is never moved or recreated;
 *   - the start is the account's own `creationTime` (clamped to now), i.e. the sign-up
 *     instant the browser would have pinned, so retrying cannot buy extra days;
 *   - 5 calls / 10 min / uid (in-memory, per server process: a restart or a second instance
 *     resets it; the create-only transaction is what makes repeats harmless).
 *
 * KNOWN RESIDUAL (erasure ordering): accountErasure deletes Firestore BEFORE the Auth account
 * and writes no in-progress marker. A call that lands between the two deletes sees a live Auth
 * account and could create a doc after erasure cleared Firestore; the post-write re-check only
 * catches an Auth account already gone. The window is milliseconds, needs the student to call
 * this endpoint during their own erasure, and the doc holds only a tier/plan/start (no
 * profile data). Closing it needs an erasure marker, which does not exist today.
 *
 * Document shape = exactly what the browser's activation write produces
 * ({tier:'trial', plan:'trial_7day', premiumSince:null, trialStartDate:<Timestamp>,
 * updatedAt}). The collection is already mapped in studentDataMap.ts (subscriptions).
 */

const TRIAL_ENSURE_PATH = '/api/trial/ensure-signup';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

/** An account older than this can no longer have a sign-up trial restored. */
const MAX_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CALLS_PER_WINDOW = 5;
const CALL_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_UIDS = 10000;

function createTrialEnsureRoutes(deps = {}) {
  const { sendJson, verifiedCaller, firebaseAdmin, adminFirestore } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const callsByUid = new Map();

  function overCap(uid, nowMs) {
    let entry = callsByUid.get(uid);
    if (!entry || nowMs - entry.start >= CALL_WINDOW_MS) {
      if (!entry && callsByUid.size >= MAX_TRACKED_UIDS) {
        for (const [k, v] of callsByUid) {
          if (nowMs - v.start >= CALL_WINDOW_MS) callsByUid.delete(k);
        }
        if (callsByUid.size >= MAX_TRACKED_UIDS) callsByUid.clear();
      }
      entry = { start: nowMs, count: 0 };
      callsByUid.set(uid, entry);
    }
    entry.count += 1;
    return entry.count > MAX_CALLS_PER_WINDOW;
  }

  /** The Auth account was erased while the write was in flight: delete what was just created. */
  async function undoIfAccountErased(uid, ref) {
    try {
      await firebaseAdmin.auth().getUser(uid);
    } catch (e) {
      if (!e || e.code !== 'auth/user-not-found') return;
      await ref.delete();
    }
  }

  async function handleEnsureSignupTrial(req, res) {
    try {
      if (!verifiedCaller || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function' || !adminFirestore) {
        return sendJson(res, 503, { ok: false, error: 'trial restore unavailable' });
      }
      const verification = await verifiedCaller.resolveVerifiedCaller(req);
      const uid = verification && typeof verification.uid === 'string' ? verification.uid.trim() : '';
      if (!uid) return sendJson(res, 401, { ok: false, error: 'Unauthorized: valid ID token required' });

      const nowMs = now();
      if (overCap(uid, nowMs)) return sendJson(res, 429, { ok: false, error: 'too many requests' });

      // THE AGE CHECK — what stops an old account getting a trial on login or reload.
      let createdMs = NaN;
      try {
        const user = await firebaseAdmin.auth().getUser(uid);
        createdMs = Date.parse(user && user.metadata && user.metadata.creationTime);
      } catch {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: account not found' });
      }
      const age = nowMs - createdMs;
      if (!Number.isFinite(age) || age > MAX_ACCOUNT_AGE_MS) {
        return sendJson(res, 409, { ok: false, error: 'account too old for a sign-up trial' });
      }

      const Timestamp = firebaseAdmin.firestore && firebaseAdmin.firestore.Timestamp;
      if (!Timestamp || typeof Timestamp.fromMillis !== 'function') throw new Error('firestore Timestamp unavailable');
      const startMs = Math.min(createdMs, nowMs);
      const ref = adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid);

      const created = await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        // ANY existing document wins, whatever its shape. Never moved, never recreated.
        if (snap && snap.exists) return false;
        tx.create(ref, {
          tier: 'trial',
          plan: 'trial_7day',
          premiumSince: null,
          trialStartDate: Timestamp.fromMillis(startMs),
          updatedAt: new Date(nowMs).toISOString(),
        });
        return true;
      });
      if (created) await undoIfAccountErased(uid, ref);
      return sendJson(res, 200, { ok: true, created });
    } catch {
      return sendJson(res, 500, { ok: false, error: 'trial not restored' });
    }
  }

  return { handleEnsureSignupTrial };
}

/** The ONE-LINE mount used by server/index.cjs; built once, on the first request. */
let mounted = null;
function handleEnsureSignupTrialRequest(req, res, deps) {
  if (!mounted) mounted = createTrialEnsureRoutes(deps);
  return mounted.handleEnsureSignupTrial(req, res);
}

module.exports = {
  createTrialEnsureRoutes,
  handleEnsureSignupTrialRequest,
  TRIAL_ENSURE_PATH,
  SUBSCRIPTIONS_COLLECTION,
  MAX_ACCOUNT_AGE_MS,
  MAX_CALLS_PER_WINDOW,
};
