/**
 * learnerAccountService — RETAINED BUT INERT. It writes nothing, and must stay that way.
 *
 * ★★ WHAT WAS HERE, AND WHY IT IS GONE.
 *
 * This module used to mirror the Firebase Auth account record into a Firestore
 * `users/{uid}` document on every login — a signup / last-seen roster carrying the
 * child's DIRECT IDENTIFIERS: uid, email, phoneNumber, displayName, authProvider,
 * lastLoginAt, updatedAt and a first-write createdAt. It arrived in PR #78
 * ("PR-K2H-3: Auth/session shell hardening", `0addba3f`, merged 2026-05-16), whose body
 * described it as "safe learner account metadata sync without storing credentials".
 *
 * ★ IT NEVER ONCE SUCCEEDED, AND THE FAILURE WAS SWALLOWED TWICE.
 * `users/{uid}` has never appeared in `firestore.rules` in this repository's entire
 * history, so it fell through to the deny-all `match /{document=**}` catch-all. The
 * preceding `getDoc` was therefore denied and threw BEFORE the payload was built, an
 * empty `catch` swallowed the rejection, and the caller's `Promise.allSettled` discarded
 * it again — so the `setDoc` was never even issued. That ran on every authenticated
 * session for ~85 days, across an entire Clerk-to-Firebase migration, with no signal of
 * any kind. The owner confirmed in the Firebase Console that no `users` collection
 * exists. Nothing anywhere was ever built to READ it, so nothing degraded.
 *
 * ★★ DO NOT "FIX" THIS BY ADDING A `users` BLOCK TO `firestore.rules`.
 * Every field the write carried already lives in Firebase Auth's own account record,
 * mapped as `auth-account` in `studentDataMap.ts`. Making the write succeed would newly
 * begin storing a SECOND copy of a child's direct identifiers, in a collection nothing
 * reads, creating a second erasure target for zero product benefit. A dead write that
 * fails invisibly is precisely what someone later "fixes" with a rules block; removing
 * it closes that door permanently. [USERS-1, wave DPDP-A]
 *
 * ★ `users` DELIBERATELY REMAINS LISTED in `studentDataMap.ts`. De-listing a path is the
 * one move that could make a future erasure lie about its coverage; erasing a path that
 * was never written is a harmless no-op. See that entry's notes.
 *
 * ★ WHY THIS FILE STILL EXISTS. Nothing in the product calls it any more — its sole
 * caller, `AuthContext`'s post-login hydration effect, was unwired by the same PR. The
 * module is retained only because SEVEN test files `vi.mock` this exact module path, and
 * two of them (`pages/Login.forgotPassword.test.tsx`,
 * `components/mobile/MobileAccountMenu.persistedSession.test.tsx`) are outside the
 * USERS-1 allowlist. Deleting the module is a controller decision, not this lane's.
 * Its inertness is pinned behaviourally by `learnerAccountService.noUsersWrite.test.ts`.
 */

/**
 * The shape the retired write used to carry. Retained so the module's export surface is
 * unchanged for the seven suites that mock it — NOT because anything consumes it.
 */
export interface LearnerAccountMetadata {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  authProvider: string;
}

/**
 * ★ INTENTIONALLY DOES NOTHING. Reads no Firestore document and writes none.
 *
 * Read the file header before restoring a body here. This is not an unfinished stub: it
 * is a deliberately closed identity sink, and re-opening it needs an owner decision, not
 * a bug fix.
 */
export async function ensureLearnerAccountMetadata(
  _input: LearnerAccountMetadata
): Promise<void> {
  // No-op by design. See the file header.
}
