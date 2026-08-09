/**
 * studentDataMap — the enumerated set of every location a student's data lives.
 *
 * ★★ WHY THIS FILE EXISTS, AND WHY IT IS NOT AN ERASURE SERVICE.
 *
 * LazyTopper's users are CBSE Class 10 students, 14-16 years old. India's DPDP Act
 * treats every under-18 as a child, so the product owes a parent both an export and a
 * real deletion. Neither exists today.
 *
 * The DPDP-1 lane established that an erasure that actually RUNS cannot be built
 * without files this lane does not own (see LIMITS below). What it CAN do — and what
 * every later lane depends on — is fix the enumeration, because:
 *
 *   ★★ A MISSED COLLECTION MEANS DATA SURVIVES A DELETION THAT REPORTED SUCCESS.
 *
 * A map written as prose rots the moment someone adds a collection, and then the
 * deletion built on it lies. So the map is CODE, and `studentDataMap.test.ts` re-derives
 * the collection set from the source tree on every CI run and fails if anything here
 * drifts. The guard, not this list, is the durable deliverable.
 *
 * ★ HOW THIS LIST WAS DERIVED (and controlled). Two independent enumerations were
 * set-differenced against each other:
 *   1. every `collection()`/`doc()` call site in `src/**` and `server/**`
 *   2. every `match /<name>/{uid}` block in `firestore.rules`
 * (1) minus (2) originally found `users` and `qrUploadSlots`. (2) minus (1) was EMPTY —
 * which is the CONTROL: the code scan demonstrably finds every collection the rules file
 * knows about, so its extras are real findings and not scan noise.
 *
 * ★ (1) minus (2) is now just `qrUploadSlots`, because USERS-1 removed the product's only
 * `users` write (see that entry's notes). `users` REMAINS mapped below — the map is the
 * set of places a child's data COULD live, not the set the code currently writes.
 *
 * ★ LIMITS — deliberately NOT built here, because a half-working deletion is worse
 * than none:
 *   - No erasure is performed. FIVE of the locations below are provably unreachable
 *     from a browser (`mechanism: "admin-sdk-required"` — `auth-account`, `users`,
 *     `subscriptions`, `qrUploadSlots`, `storage.qr-uploads`), so a client-side deletion
 *     would report success while leaving a child's identity, subscription and
 *     handwriting behind.
 *     ★ Re-derive this count from `mechanism` before citing it; there is no
 *     `adminSdkRequired` field, and an earlier version of this comment said "Three"
 *     and named exactly that non-existent field. Use `adminOnlyLocations()`.
 *     [FU-DPDP-MAP-HEADER-COUNT-DRIFT, closed by USERS-1]
 *   - Registering an admin-credential route needs `server/index.cjs`; a settings screen
 *     needs `src/pages/**` + `App.tsx`. Both were outside DPDP-1's allowlist.
 */

/** How a location can actually be erased — the property that decides the architecture. */
export type ErasureMechanism =
  /** Firebase Web SDK, signed in as the owner. `firestore.rules` permits the delete. */
  | "browser-sdk"
  /** ★ Browser delete is REFUSED or undeclared. Needs firebase-admin server credentials. */
  | "admin-sdk-required"
  /** Lives only on the student's own device. */
  | "client-local"
  /** ★ Left the product. We cannot delete it and must say so. */
  | "third-party-unreachable";

export interface StudentDataLocation {
  /** Stable id — what tests and later erasure code refer to. */
  readonly id: string;
  readonly kind:
    | "firestore-collection"
    | "firestore-subcollection"
    | "storage-prefix"
    | "local-storage"
    | "auth-account"
    | "third-party";
  /** Concrete path, `{uid}` where the student's uid is substituted. */
  readonly path: string;
  /** Plain-language description of what a parent would find here. */
  readonly holds: string;
  readonly mechanism: ErasureMechanism;
  /**
   * ★ Firestore does NOT cascade: deleting `a/{uid}` leaves `a/{uid}/sub/*` orphaned
   * and still readable. Any subcollection listed here must be deleted EXPLICITLY.
   */
  readonly parentId?: string;
  /** Can its contents be included in a data export? */
  readonly exportable: boolean;
  readonly notes?: string;
}

/**
 * ★★ EVERY location a student's data lives. Adding a new Firestore collection to the
 * product without adding it here fails `studentDataMap.test.ts` by design.
 */
export const STUDENT_DATA_MAP: readonly StudentDataLocation[] = [
  // ── Firebase Auth ────────────────────────────────────────────────────────────────
  {
    id: "auth-account",
    kind: "auth-account",
    path: "firebase-auth/users/{uid}",
    holds: "The account itself: email, phone number, display name, provider linkage.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ deleteUser() from the Web SDK requires a RECENT login and throws " +
      "auth/requires-recent-login otherwise, so a reliable erasure uses the Admin SDK.",
  },

  // ── Firestore: identity ──────────────────────────────────────────────────────────
  {
    id: "users",
    kind: "firestore-collection",
    path: "users/{uid}",
    holds:
      "The child's DIRECT IDENTIFIERS: email, phoneNumber, displayName, authProvider, " +
      "createdAt, lastLoginAt.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ NOTHING IN THE PRODUCT WRITES THIS ANY MORE, AND THE ENTRY STAYS ANYWAY. " +
      "learnerAccountService.ensureLearnerAccountMetadata mirrored the child's direct " +
      "identifiers here on every login from PR #78 (0addba3f, 2026-05-16) until USERS-1 " +
      "removed it. It NEVER ONCE SUCCEEDED: `users` has never been declared in " +
      "firestore.rules in the repo's entire history, so it fell through to the deny-all " +
      "`match /{document=**}` catch-all; the read preceding the write was denied and threw, " +
      "an empty catch and the caller's Promise.allSettled swallowed it twice, and the write " +
      "was never issued. Nothing was ever built to read it. Owner confirmed in the Firebase " +
      "Console that no `users` collection exists. " +
      "★★ KEPT LISTED DELIBERATELY (owner ruling, pinned by studentDataMap.test.ts): " +
      "de-listing is the one move that could make a future erasure LIE about its coverage, " +
      "whereas erasing a path that was never written is a harmless no-op. The committed " +
      "rules are not the DEPLOYED rules, so an erasure must still sweep this path and must " +
      "not treat its absence from the code as proof prod is empty. " +
      "★★ DO NOT re-enable by adding a `users` rules block — every field it carried already " +
      "lives in the `auth-account` entry above, so it would only create a SECOND copy of a " +
      "child's identity to erase. See [FU-DPDP-USERS-COLLECTION-UNDECLARED] (closed by " +
      "USERS-1) and [FU-DPDP-USERS-WRITE-DEAD-BOTH-DIRECTIONS].",
  },

  // ── Firestore: learner profile tree ──────────────────────────────────────────────
  {
    id: "learnerProfiles",
    kind: "firestore-collection",
    path: "learnerProfiles/{uid}",
    holds: "Profile document: goals, preferences, learner metadata.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "learnerProfiles.sessions",
    kind: "firestore-subcollection",
    parentId: "learnerProfiles",
    path: "learnerProfiles/{uid}/sessions/{sessionId}",
    holds: "Tutor session records.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "learnerProfiles.sessions.messages",
    kind: "firestore-subcollection",
    parentId: "learnerProfiles.sessions",
    path: "learnerProfiles/{uid}/sessions/{sessionId}/messages/{messageId}",
    holds: "★ Every message the child exchanged with the tutor. Two levels deep.",
    mechanism: "browser-sdk",
    exportable: true,
    notes:
      "★★ Requires a nested traversal: enumerate sessions, then messages per session. " +
      "A one-level delete leaves these behind, readable and orphaned.",
  },
  {
    id: "learnerProfiles.mistakeLogs",
    kind: "firestore-subcollection",
    parentId: "learnerProfiles",
    path: "learnerProfiles/{uid}/mistakeLogs/{logId}",
    holds:
      "★ Every mistake the child made, classified by type — the Mistake Intelligence " +
      "store. The most detailed record of a named child's academic weaknesses.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "learnerProfiles.savedWorksheets",
    kind: "firestore-subcollection",
    parentId: "learnerProfiles",
    path: "learnerProfiles/{uid}/savedWorksheets/{recordId}",
    holds: "Worksheets the student saved.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "learnerProfiles.worksheetActivity",
    kind: "firestore-subcollection",
    parentId: "learnerProfiles",
    path: "learnerProfiles/{uid}/worksheetActivity/{recordId}",
    holds: "Worksheet attempt activity.",
    mechanism: "browser-sdk",
    exportable: true,
  },

  // ── Firestore: session records tree ──────────────────────────────────────────────
  {
    id: "sessionRecords",
    kind: "firestore-collection",
    path: "sessionRecords/{uid}",
    holds: "Practice/mock session container document.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "sessionRecords.records",
    kind: "firestore-subcollection",
    parentId: "sessionRecords",
    path: "sessionRecords/{uid}/records/{recordId}",
    holds: "Each graded session: score, timing, per-session outcome.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "sessionRecords.perQuestion",
    kind: "firestore-subcollection",
    parentId: "sessionRecords",
    path: "sessionRecords/{uid}/perQuestion/{ref}",
    holds:
      "★ Per-question graded work — the answer the child typed and the grade awarded.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "sessionRecords.fullMockPapers",
    kind: "firestore-subcollection",
    parentId: "sessionRecords",
    path: "sessionRecords/{uid}/fullMockPapers/{code}",
    holds: "Generated full mock papers held for the student.",
    mechanism: "browser-sdk",
    exportable: true,
  },

  // ── Firestore: derived analytics ─────────────────────────────────────────────────
  {
    id: "practiceInsights",
    kind: "firestore-collection",
    path: "practiceInsights/{uid}",
    holds: "Aggregate practice insight blob.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "practiceInsights.attempts",
    kind: "firestore-subcollection",
    parentId: "practiceInsights",
    path: "practiceInsights/{uid}/attempts/{attemptId}",
    holds: "★ Individual question attempts with correctness.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "mockScoreHistory",
    kind: "firestore-collection",
    path: "mockScoreHistory/{uid}",
    holds: "Mock score history blob.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "mockScoreHistory.entries",
    kind: "firestore-subcollection",
    parentId: "mockScoreHistory",
    path: "mockScoreHistory/{uid}/entries/{entryId}",
    holds: "Each recorded mock score over time.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "weakAreaSummary",
    kind: "firestore-collection",
    path: "weakAreaSummary/{uid}",
    holds: "★ Computed weak areas — an explicit ranking of the child's weaknesses.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "topicMastery",
    kind: "firestore-collection",
    path: "topicMastery/{uid}",
    holds: "Per-topic mastery estimates.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "learnerProgress",
    kind: "firestore-collection",
    path: "learnerProgress/{uid}",
    holds: "Progress over time.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "srSchedules",
    kind: "firestore-collection",
    path: "srSchedules/{uid}",
    holds: "Spaced-repetition schedule.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "learningPaths",
    kind: "firestore-collection",
    path: "learningPaths/{uid}",
    holds: "Generated learning path.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "dashboardPrefs",
    kind: "firestore-collection",
    path: "dashboardPrefs/{uid}",
    holds: "Dashboard preferences.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "tutorSessions",
    kind: "firestore-collection",
    path: "tutorSessions/{uid}",
    holds: "Tutor session container.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    id: "tutorSessions.topics",
    kind: "firestore-subcollection",
    parentId: "tutorSessions",
    path: "tutorSessions/{uid}/topics/{topicKey}",
    holds: "Per-topic tutor session state.",
    mechanism: "browser-sdk",
    exportable: true,
  },

  // ── Firestore: entitlement ───────────────────────────────────────────────────────
  {
    id: "subscriptions",
    kind: "firestore-collection",
    path: "subscriptions/{uid}",
    holds: "Subscription/trial state: tier, plan, trialStartDate.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ firestore.rules pins `allow delete: if false;` on this document — an EXPLICIT, " +
      "deliberate refusal (it stops a student dropping and re-creating the doc to reset " +
      "the trial clock). A browser therefore CANNOT erase it. This single rule is why " +
      "account erasure requires an admin-credential server path.",
  },

  // ── Firestore: QR upload slots (server-only) ─────────────────────────────────────
  {
    id: "qrUploadSlots",
    kind: "firestore-collection",
    path: "qrUploadSlots/{slotId}",
    holds:
      "★ Upload slots keyed by a `uid` FIELD (not the doc id): status, storagePath, " +
      "expiresAt.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ NOT declared in firestore.rules (deny-all catch-all) and written only by " +
      "server/services/qrUploadChannel.cjs via firebase-admin. ★ Erasure must query " +
      "`where('uid','==',uid)` — the uid is a FIELD here, so a doc-id delete finds nothing.",
  },

  // ── Firebase Storage ─────────────────────────────────────────────────────────────
  {
    id: "storage.qr-uploads",
    kind: "storage-prefix",
    path: "qr-uploads/{uid}/{slotId}.{ext}",
    holds:
      "★★ PHOTOGRAPHS OF THE CHILD'S HANDWRITING — answers uploaded from a phone. " +
      "The most sensitive artefact in the product.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ Written by qrUploadChannel.cjs `bucket().file(storagePath).save(...)` under the " +
      "admin bucket; there is no storage.rules file in the repo and no `storage` key in " +
      "firebase.json, so the browser has no delete path. ★ The channel already self-cleans: " +
      "SLOT_TTL_MS is 5 minutes and consumeSlot() calls destroySlot() on pickup, so the " +
      "steady-state residue is small — but 'usually empty' is NOT 'erased', and an " +
      "abandoned upload persists until a sweep it may never receive. " +
      "See [FU-DPDP-STORAGE-ORPHAN-SWEEP].",
  },

  // ── Device ───────────────────────────────────────────────────────────────────────
  {
    id: "local-storage",
    kind: "local-storage",
    path: "localStorage['lazytopper.*']",
    holds:
      "★ Cached mistake logs, check results, attempt dedup keys, progress, streaks and " +
      "auth state mirrored on the device.",
    mechanism: "client-local",
    exportable: true,
    notes:
      "★★ 232 call sites across 61 files under a `lazytopper.` prefix. Erasure MUST run " +
      "in the browser — a server-side delete cannot reach the device, so a server-only " +
      "erasure leaves the child's cached record intact on the machine they used. " +
      "This is where the 9 CodeQL js/clear-text-storage-of-sensitive-data alerts live. " +
      "See [FU-DPDP-LOCALSTORAGE-CLEARTEXT].",
  },

  // ── Third parties ────────────────────────────────────────────────────────────────
  {
    id: "third-party.gemini",
    kind: "third-party",
    path: "https://generativelanguage.googleapis.com/v1beta/models/",
    holds:
      "★ Every answer sent for grading or tutoring — including uploaded handwriting " +
      "images — leaves the product to Google's Gemini API.",
    mechanism: "third-party-unreachable",
    exportable: false,
    notes:
      "★★ CANNOT BE DELETED BY THE PRODUCT. Retention is governed by Google's API terms, " +
      "not by us. The export and the privacy policy must SAY this rather than let the " +
      "owner discover it. Owner decision: which Gemini tier/terms apply.",
  },
];

/** ★ Locations no browser can erase — the proof that erasure needs a server path. */
export function adminOnlyLocations(): readonly StudentDataLocation[] {
  return STUDENT_DATA_MAP.filter((l) => l.mechanism === "admin-sdk-required");
}

/** ★ What an export must DISCLOSE it does not contain. */
export function unreachableLocations(): readonly StudentDataLocation[] {
  return STUDENT_DATA_MAP.filter((l) => l.mechanism === "third-party-unreachable");
}

/** Top-level Firestore collection names, for the drift guard and for erasure planning. */
export function firestoreCollectionNames(): readonly string[] {
  return STUDENT_DATA_MAP.filter((l) => l.kind === "firestore-collection").map(
    (l) => l.path.split("/")[0]
  );
}

/**
 * ★ Firestore does not cascade. Every subcollection must be deleted explicitly, and
 * deepest-first so a failure never strands children under a deleted parent.
 */
export function subcollectionsOf(parentId: string): readonly StudentDataLocation[] {
  return STUDENT_DATA_MAP.filter((l) => l.parentId === parentId);
}
