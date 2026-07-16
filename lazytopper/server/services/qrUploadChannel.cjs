/**
 * QR answer-handoff channel — the transport that carries ONE photo from a
 * student's phone into the desktop session they are already practising in.
 *
 * THE PROBLEM IT SOLVES: a student on a laptop solves on paper, then has to
 * photograph it, WhatsApp/email it to themselves, save it, and upload from the
 * laptop. The desktop shows a QR; the phone scans, shoots, sends; the image
 * lands in the SAME answer box the student would have used, and grades exactly
 * as today. This module is DELIVERY ONLY — it never grades, and it never
 * touches the grader.
 *
 * ── ARCHITECTURE (owner-decided 2026-07-15; see the pre-flight report) ────────
 * Firestore holds a small COORDINATION doc; Storage holds the BLOB. Both are
 * written SERVER-SIDE with firebase-admin. No client ever touches Firestore or
 * Storage on this path — the phone POSTs to a token-scoped endpoint and the
 * desktop pulls back through the backend.
 *
 * WHY NOT base64-in-Firestore: a 3MB photo is ~4MB of base64, over Firestore's
 * 1MB document limit. Storage is where files belong; it survives restarts and
 * works multi-replica.
 *
 * WHY NO RULES CHANGE (deliberate, do not "fix" this):
 *   firebase-admin BYPASSES both Firestore and Storage security rules. Because
 *   no client touches either surface here, the existing deny-all catch-alls
 *   (`firestore.rules` "Deny everything else"; the Storage `/{allPaths=**}`
 *   deny-all) are exactly right — they actively protect this path. Do NOT add a
 *   rule for `qrUploadSlots` or for `qr-uploads/`, and do NOT touch `ncert/`
 *   (it serves live student PDFs).
 *
 * ── THE TWO-TOKEN SPLIT (load-bearing security property) ─────────────────────
 * A single token would NOT be write-only: whoever held the QR could also read
 * the image back. So the capability is split at mint:
 *
 *   uploadToken  → travels in the QR, held by the PHONE.
 *                  Grants exactly: "write ONE image into ONE slot." Nothing else.
 *                  It can NEVER read the image back.
 *   pickupToken  → never leaves the desktop that minted it. Never in the QR.
 *                  Grants: read that one slot ONCE, which destroys it.
 *
 * So a leaked/guessed QR buys an attacker one thing: putting one image into one
 * slot for <=5 minutes — which the student SEES appear and can discard before
 * grading. Annoyance, not data theft, and no read of anyone's work.
 *
 * Token properties (all true by construction, not aspiration):
 *   - unguessable  : 256 bits of crypto.randomBytes
 *   - short-lived  : SLOT_TTL_MS (5 minutes), checked on EVERY access
 *   - single-use   : phone pending->ready (2nd upload rejected); desktop pickup
 *                    deletes the blob AND the doc
 *   - write-only   : see the split above
 *   - scoped       : one slot, one uid, one image
 *   - never logged : no payload, no base64, no token value in any log line
 *
 * Tokens are stored HASHED (sha256), never raw: the doc ID is sha256(uploadToken)
 * and `pickupHash` is sha256(pickupToken). A Firestore console/dump therefore
 * yields no usable token. sha256 is sufficient (not bcrypt) precisely because the
 * inputs are 256-bit random — there is no guessable pre-image to brute-force.
 *
 * MINT REQUIRES AUTH (owner-decided): every slot is tied to a real uid, so caps
 * are PER-UID. IP rate-limiting was explicitly rejected — our students sit behind
 * shared school wifi, coaching-centre networks and carrier NAT, where dozens to
 * hundreds share one IP; an IP limit would throttle a whole school while one kid
 * practises. UPLOAD is deliberately NOT authenticated: the phone is a different
 * device and a login wall mid-flow is the exact friction this feature removes.
 */

const crypto = require('crypto');
const { validateMentorImagePayload } = require('../mentorImageSupport.cjs');

const COLLECTION = 'qrUploadSlots';
const STORAGE_PREFIX = 'qr-uploads';

// 5 minutes. Long enough to unlock a phone, open the camera and shoot; short
// enough that a leaked token is near-worthless.
const SLOT_TTL_MS = 5 * 60 * 1000;

// Per-UID cap on live pending slots. Beyond it we evict the student's OWN oldest
// pending slot rather than refusing them — an abandoned QR of theirs is worth
// less than the one they are looking at right now. Their stale QR then reports
// "expired" honestly, which is true.
const MAX_PENDING_PER_UID = 5;

const STATUS_PENDING = 'pending';
const STATUS_READY = 'ready';

/**
 * What the HOST SURFACE actually wants — carried on the slot so the PHONE can say it.
 *
 *   'document' — Chapter Test / Full Mock / Worksheet want ONE multi-page PDF of a
 *                whole paper. A single photo captures ONE PAGE, so camera-first copy
 *                here actively misleads: the student photographs page 1 of a
 *                20-question mock and believes they are done.
 *   'photo'    — a single handwritten answer (Check & Improve / SolutionChecker),
 *                where one photo genuinely IS the whole answer.
 *
 * This rides on the SLOT rather than the QR URL because the phone page is reached by
 * token alone and would otherwise have no idea which surface minted it. It carries NO
 * student content — only which words to show — so the token stays write-only.
 */
const VARIANT_DOCUMENT = 'document';
const VARIANT_PHOTO = 'photo';
const VARIANTS = new Set([VARIANT_DOCUMENT, VARIANT_PHOTO]);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function mintToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function extensionFor(mimeType) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
}

/**
 * The bucket name. `initializeApp` in server/index.cjs passes NO storageBucket,
 * so `admin.storage().bucket()` with no argument would throw "Bucket name not
 * specified" — the name MUST be passed explicitly.
 *
 * Deliberately requires NO new Railway env var: VITE_FIREBASE_STORAGE_BUCKET is
 * used when present, otherwise the default bucket is derived from the project id
 * (VITE_FIREBASE_PROJECT_ID is proven set in production — it is what makes
 * firebase-admin initialise at all). For `lazzyy-topper` this resolves to
 * `lazzyy-topper.firebasestorage.app`, the live bucket.
 */
function resolveBucketName() {
  const explicit = String(process.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
  if (explicit) return explicit.replace(/^gs:\/\//, '');
  const projectId = String(process.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  return projectId ? `${projectId}.firebasestorage.app` : '';
}

function createQrUploadChannel(deps) {
  const { firebaseAdmin, adminFirestore } = deps || {};

  // Availability is checked per-call rather than cached at module load: the route
  // layer turns a missing dependency into an HONEST error, never a silent hang.
  function isAvailable() {
    return Boolean(firebaseAdmin && adminFirestore && resolveBucketName());
  }

  function bucket() {
    return firebaseAdmin.storage().bucket(resolveBucketName());
  }

  function collection() {
    return adminFirestore.collection(COLLECTION);
  }

  function isExpired(data, now) {
    return !data || Number(data.expiresAt || 0) <= now;
  }

  /**
   * Best-effort removal of a slot's blob + doc. Used by pickup (the primary
   * retention control: the image is deleted the moment the desktop has it), by
   * expiry sweeps, and by the per-uid cap. Never throws — a failed cleanup must
   * not fail the student's action; the Storage lifecycle rule is the backstop.
   */
  async function destroySlot(docRef, storagePath) {
    if (storagePath) {
      try {
        await bucket().file(storagePath).delete({ ignoreNotFound: true });
      } catch (_e) {
        // Swallowed deliberately — see above. Nothing student-facing depends on it.
      }
    }
    try {
      await docRef.delete();
    } catch (_e) {
      // Same.
    }
  }

  /**
   * Sweep this uid's dead slots, then enforce the per-uid cap. Runs on mint, so
   * abandoned slots are reaped by ordinary use with no cron and no scheduler.
   */
  async function sweepForUid(uid, now) {
    let snap;
    try {
      snap = await collection().where('uid', '==', uid).get();
    } catch (_e) {
      return; // A failed sweep must never block a mint.
    }

    const live = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      if (isExpired(data, now)) {
        await destroySlot(doc.ref, data && data.storagePath);
      } else {
        live.push({ ref: doc.ref, data });
      }
    }

    // Cap: evict this student's OWN oldest slots first.
    if (live.length >= MAX_PENDING_PER_UID) {
      live.sort((a, b) => Number(a.data.createdAt || 0) - Number(b.data.createdAt || 0));
      const excess = live.slice(0, live.length - MAX_PENDING_PER_UID + 1);
      for (const entry of excess) {
        await destroySlot(entry.ref, entry.data && entry.data.storagePath);
      }
    }
  }

  /**
   * mintSlot — the DESKTOP asks for a slot. Requires an authenticated uid.
   * Returns both tokens; ONLY uploadToken may be put in the QR.
   */
  async function mintSlot(uid, variant) {
    const now = Date.now();
    await sweepForUid(uid, now);

    const uploadToken = mintToken();
    const pickupToken = mintToken();
    const expiresAt = now + SLOT_TTL_MS;
    // Unknown/absent -> 'document'. Both live hosts (Chapter Test / Full Mock /
    // Worksheet) want a PDF, and over-promising "just photograph it" is precisely the
    // failure this variant exists to prevent — so the safer wording is the default.
    const slotVariant = VARIANTS.has(variant) ? variant : VARIANT_DOCUMENT;

    await collection().doc(sha256(uploadToken)).set({
      uid,
      pickupHash: sha256(pickupToken),
      status: STATUS_PENDING,
      variant: slotVariant,
      storagePath: null,
      imageMimeType: null,
      createdAt: now,
      expiresAt,
    });

    return { uploadToken, pickupToken, expiresAt, variant: slotVariant };
  }

  /**
   * peekSlot — the PHONE checks the code is still good on page load, BEFORE the
   * student photographs 3MB only to be told it expired. Returns liveness only:
   * no image, no uid, no student content of any kind.
   */
  async function peekSlot(uploadToken) {
    const ref = collection().doc(sha256(uploadToken));
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, reason: 'expired' };

    const data = snap.data();
    const now = Date.now();
    if (isExpired(data, now)) {
      await destroySlot(ref, data && data.storagePath);
      return { ok: false, reason: 'expired' };
    }
    if (data.status !== STATUS_PENDING) return { ok: false, reason: 'used' };
    // `variant` is the ONLY thing this returns beyond liveness — which words to show,
    // never any student content. Legacy slots minted before the variant existed read
    // as 'document', the safer wording.
    return { ok: true, state: STATUS_PENDING, variant: data.variant || VARIANT_DOCUMENT };
  }

  /**
   * putBlob — the PHONE sends its one image. Token-as-capability: no login.
   *
   * Validation reuses validateMentorImagePayload — the app's EXISTING hardened
   * image gate (jpeg/png/pdf, 3MB decoded, raw base64 with no data: prefix). The
   * QR path is therefore governed by the SAME rule as the desktop upload path;
   * no second validation surface to drift.
   */
  async function putBlob(uploadToken, payload) {
    const ref = collection().doc(sha256(uploadToken));
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, reason: 'expired' };

    const data = snap.data();
    const now = Date.now();
    if (isExpired(data, now)) {
      await destroySlot(ref, data && data.storagePath);
      return { ok: false, reason: 'expired' };
    }
    // Single-use on the write side: a slot accepts exactly one image.
    if (data.status !== STATUS_PENDING) return { ok: false, reason: 'used' };

    const check = validateMentorImagePayload(payload);
    if (!check || !check.ok) {
      return { ok: false, reason: 'invalid', error: check ? check.error : 'Invalid image' };
    }

    const mimeType = String(payload.imageMimeType || '').trim().toLowerCase();
    const storagePath = `${STORAGE_PREFIX}/${data.uid}/${snap.id}.${extensionFor(mimeType)}`;
    const buffer = Buffer.from(String(payload.imageBase64), 'base64');

    await bucket().file(storagePath).save(buffer, {
      contentType: mimeType,
      resumable: false,
      metadata: {
        // Bound the blob's life even if every code path fails: the object is
        // deleted on pickup, and a bucket lifecycle rule is the backstop.
        cacheControl: 'no-store',
      },
    });

    await ref.update({ status: STATUS_READY, storagePath, imageMimeType: mimeType });
    return { ok: true };
  }

  /**
   * consumeSlot — the DESKTOP polls with its pickupToken (which never left the
   * browser). On success the blob and the doc are destroyed immediately: that
   * delete-on-pickup IS the primary retention control for a minor's handwritten
   * work. Read once, then gone.
   */
  async function consumeSlot(pickupToken) {
    let snap;
    try {
      snap = await collection().where('pickupHash', '==', sha256(pickupToken)).limit(1).get();
    } catch (_e) {
      return { ok: false, reason: 'error' };
    }
    if (snap.empty) return { ok: false, reason: 'expired' };

    const doc = snap.docs[0];
    const data = doc.data();
    const now = Date.now();
    if (isExpired(data, now)) {
      await destroySlot(doc.ref, data && data.storagePath);
      return { ok: false, reason: 'expired' };
    }
    if (data.status !== STATUS_READY) return { ok: false, reason: 'waiting' };

    const [buffer] = await bucket().file(data.storagePath).download();
    const imageBase64 = buffer.toString('base64');

    await destroySlot(doc.ref, data.storagePath);

    return { ok: true, imageBase64, imageMimeType: data.imageMimeType || 'image/jpeg' };
  }

  return { isAvailable, mintSlot, peekSlot, putBlob, consumeSlot };
}

module.exports = {
  createQrUploadChannel,
  SLOT_TTL_MS,
  MAX_PENDING_PER_UID,
  VARIANT_DOCUMENT,
  VARIANT_PHOTO,
  VARIANTS,
  // Exported for tests only — production code never calls these directly.
  __internals: { sha256, resolveBucketName, extensionFor },
};
