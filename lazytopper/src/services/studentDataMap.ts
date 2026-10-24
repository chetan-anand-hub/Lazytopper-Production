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
  /**
   * What account erasure does here. Absent means `"delete"`.
   * `"anonymise-uid"` (RAZORPAY-1 · Z7) KEEPS the documents and replaces their `uid`
   * FIELD with `"erased"` — for records the business must retain for accounting. Only
   * valid on a field-keyed (no `{uid}` segment) Firestore location; the erasure walker
   * refuses it anywhere else rather than guess.
   */
  readonly onErase?: "delete" | "anonymise-uid";
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
    holds:
      "Profile document: goals, preferences, learner metadata. Since ME-ENGINE-1 PR-2 also the " +
      "child's wrong-answer log (per chapter and concept: how many answers were wrong, when, and " +
      "the knowledge-gap marks lost) — the input to weak areas.",
    mechanism: "browser-sdk",
    exportable: true,
    notes:
      "ME-ENGINE-1 PR-2 (G11) added ONE FIELD to this existing document, no new location: " +
      "`wrongAnswerLog`, the synced copy of the device log (services/adaptivePracticeEngine.ts), so " +
      "a second device shows the same weak areas. Before PR-2 it lived only in the browser. Export " +
      "and erasure walk this path with the rest of the map. Rules: owner-only (firestore.rules), " +
      "pinned by the root Firestore rules suite (`test:firestore-rules`, cases 19-19b).",
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
      "store. The most detailed record of a named child's academic weaknesses. Since " +
      "ME-ENGINE-1 PR-1 an entry is never deleted when the mistake is fixed: it keeps " +
      "`resolvedAt` (when) and `resolvedBy` (a re-grade, or a later correct attempt) — the " +
      "child's history of marks won back.",
    mechanism: "browser-sdk",
    exportable: true,
    notes:
      "★ ME-ENGINE-1 PR-1 added two FIELDS to this existing document, no new location: " +
      "`resolvedAt` (ISO date) and `resolvedBy` (\"re-grade\" | \"re-grade-not-attempted\" | " +
      "\"later-correct-attempt\"). Export and erasure walk this path document-by-document " +
      "(server/services/accountExport.cjs, accountErasure.cjs iterate STUDENT_DATA_MAP), so the " +
      "fields are exported and erased with the entry they sit on. ★ Resolution means the " +
      "erasure has MORE to delete than before (entries are kept, not removed), never less. " +
      "Rules: `learnerProfiles/{uid}/mistakeLogs/{logId}` is owner-only read/write " +
      "(firestore.rules), pinned by the root Firestore rules suite (`test:firestore-rules`, cases 17-17c).",
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
  {
    // PENDING-UPLOAD-1 / AWAIT-1-PAPERS — the Chapter Test paper kept for "Upload later"
    // (chapterTestPaperStore.ts): the drawn questions + the Section A result. Text only.
    id: "sessionRecords.chapterTestPapers",
    kind: "firestore-subcollection",
    parentId: "sessionRecords",
    path: "sessionRecords/{uid}/chapterTestPapers/{code}",
    holds: "Generated chapter test papers held for the student, with their Section A result.",
    mechanism: "browser-sdk",
    exportable: true,
  },
  {
    // PENDING-UPLOAD-1 — the downloaded worksheet kept for "Upload later" (worksheetPaperStore.ts).
    id: "sessionRecords.worksheetPapers",
    kind: "firestore-subcollection",
    parentId: "sessionRecords",
    path: "sessionRecords/{uid}/worksheetPapers/{code}",
    holds: "Downloaded worksheet papers held for the student.",
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
    // FEEDBACK-2 (owner ruling 24 Oct 2026) - the optional "Tell us more" note after "Was this useful?".
    // Written ONLY by components/feedback/feedbackNotes.ts, under the student's own practiceInsights doc
    // (firestore.rules: owner read/write on practiceInsights/{uid}/**). Never sent to analytics.
    id: "practiceInsights.feedbackNotes",
    kind: "firestore-subcollection",
    parentId: "practiceInsights",
    path: "practiceInsights/{uid}/feedbackNotes/{noteId}",
    holds:
      "★ The optional free-text note a student typed after \"Was this useful?\" (text up to 500 " +
      "characters), which surface and chapter it was about, the app version and when it was sent. " +
      "Free text: the student's own words. Never sent to analytics or the activity log.",
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
    holds:
      "Tutor session container. Since ME-ENGINE-1 PR-2 it also holds when the child sent each " +
      "doubt to the tutor, per chapter and paper (times only — no message text, no grade).",
    mechanism: "browser-sdk",
    exportable: true,
    notes:
      "ME-ENGINE-1 PR-2 (G8) added ONE FIELD to this existing document, no new location: " +
      "`doubtsAt` — a map of \"<paper>:<chapter>\" to the send times (epoch ms) of the child's " +
      "doubts (services/tutorSessionStore.ts recordTutorTurn), read to count Tutor activity per " +
      "window (services/progressReadModel.ts). Export and erasure walk this path with the rest of " +
      "the map, so the field goes with the document. Rules: owner-only (firestore.rules), pinned " +
      "by the root Firestore rules suite (`test:firestore-rules`, cases 18-18c).",
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

  {
    id: "subscriptions.payments",
    kind: "firestore-subcollection",
    parentId: "subscriptions",
    path: "subscriptions/{uid}/payments/{paymentRef}",
    holds:
      "One record per pass payment applied to this account: the pass type, the price " +
      "paid in rupees, and when it was granted.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ RAZORPAY-1 · Z9 — payment-level idempotency. Written ONLY by " +
      "server/services/passGrant.cjs inside the grant transaction; its existence is what " +
      "makes a replayed payment a no-op. Erased with the account (the anonymised " +
      "`payOrders` keep the accounting record). No client rule matches it: the parent " +
      "document's rules block has no nested wildcard, so the path falls to the deny-all " +
      "catch-all.",
  },

  {
    id: "subscriptions.adminGrants",
    kind: "firestore-subcollection",
    parentId: "subscriptions",
    path: "subscriptions/{uid}/adminGrants/{requestId}",
    holds:
      "One record per free Premium extension an admin gave this account (e.g. the " +
      "feedback-call reward): days added, the reason, price 0, the end before and after, " +
      "which admin gave it, and when.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "ADMIN-EXTEND-1 — the admin audit entry AND the idempotency key of " +
      "POST /api/admin/extend-premium. Written ONLY by server/services/premiumExtension.cjs " +
      "inside the extension transaction. NOT a payment: kept apart from `payments` so it " +
      "never shows as a sale. Erased with the account. No client rule matches it: the " +
      "parent document's rules block has no nested wildcard, so the path falls to the " +
      "deny-all catch-all.",
  },

  // ── Firestore: payment orders (server-only, RAZORPAY-1) ──────────────────────────
  {
    id: "payOrders",
    kind: "firestore-collection",
    path: "payOrders/{orderId}",
    holds:
      "★ Checkout orders keyed by the Razorpay order id, with the student's `uid` as a " +
      "FIELD: pass type, amount in paise, offer, status (created / paid), payment id and " +
      "timestamps. No card or bank details — those never reach LazyTopper.",
    mechanism: "admin-sdk-required",
    exportable: true,
    onErase: "anonymise-uid",
    notes:
      "★★ KEPT ON ERASURE, NOT DELETED (owner ruling Z7): payment records are retained for " +
      "accounting, so erasure replaces the `uid` field with `\"erased\"` and keeps the " +
      "document. Written only by server/routes/payments.cjs and passGrant.cjs through the " +
      "Admin SDK; NOT declared in firestore.rules, so browsers fall to the deny-all " +
      "catch-all. ★ Field-keyed like `qrUploadSlots`: export and erasure must QUERY " +
      "`where('uid','==',uid)`.",
  },

  // ── Firestore: parent pay links (server-only, ASK-PARENTS-PAY-1) ─────────────────
  {
    id: "parentPayLinks",
    kind: "firestore-collection",
    path: "parentPayLinks/{linkId}",
    holds:
      "Links a student sent a parent so the parent can pay for the student's pass, keyed " +
      "by the SHA-256 of the link's token (the token itself is never stored), with the " +
      "student's `uid` as a FIELD: the student's first name, status (open / paid), created " +
      "and expiry times, and the ids of the payment orders the link started. Nothing about " +
      "the parent.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "Written only by server/routes/parentPay.cjs through the Admin SDK; NOT declared in " +
      "firestore.rules, so browsers fall to the deny-all catch-all. Field-keyed like " +
      "`qrUploadSlots`: export and erasure QUERY `where('uid','==',uid)`. Deleted on " +
      "erasure (a link is not an accounting record; the orders it started are kept, " +
      "anonymised, in `payOrders`).",
  },

  // ── Firestore: parent result links (server-only, PARENT-REPORT-1) ────────────────
  {
    id: "parentReports",
    kind: "firestore-collection",
    path: "parentReports/{reportId}",
    holds:
      "Links to ONE result that a student chose to share with a parent, keyed by the " +
      "SHA-256 of the link's token (the token itself is never stored), with the student's " +
      "`uid` as a FIELD: a copy of what the parent's page shows — the student's first name, " +
      "the subject and chapter, the date, the score, the marks lost by mistake type, up to " +
      "three question numbers with their marks and mistake type, and whether the result was " +
      "tap-only — plus created and expiry times (30 days). No answer text and nothing about " +
      "the parent.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "Written only by server/routes/parentReport.cjs through the Admin SDK, minted by the " +
      "signed-in student for one of their OWN session records; NOT declared in " +
      "firestore.rules, so browsers fall to the deny-all catch-all. Field-keyed like " +
      "`parentPayLinks`: export and erasure QUERY `where('uid','==',uid)`. Deleted on " +
      "erasure, so a parent's link stops working when the student deletes their account.",
  },

  // ── Firestore: AI usage ledger (server-only, METER-1) ────────────────────────────
  {
    id: "usageLedger",
    kind: "firestore-collection",
    path: "usageLedger/{uid}",
    holds:
      "Parent of the per-day AI usage records below. Never written itself; it exists " +
      "only as the path its day records live under.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ server/services/usageLedger.cjs writes ONLY the `days` subcollection, so this " +
      "document is a Firestore 'missing' parent. It is mapped anyway so the erasure walk " +
      "sweeps the whole tree rather than trusting that the parent is empty. ★ NOT declared " +
      "in firestore.rules: no client reads or writes it, so browsers fall through to the " +
      "deny-all catch-all and only the Admin SDK reaches it.",
  },
  {
    id: "usageLedger.days",
    kind: "firestore-subcollection",
    parentId: "usageLedger",
    path: "usageLedger/{uid}/days/{dayKey}",
    holds:
      "How much AI this student used each day (IST): number of model calls, prompt, " +
      "output and thinking token counts, and the cost in micro-rupees. Numbers only — " +
      "no question, answer or tutor text.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ Keyed on the VERIFIED uid of a signed-in student on a paid endpoint " +
      "(usageLedger.cjs bindRequestUid) — never a header, never a free check. Written " +
      "fire-and-forget with FieldValue.increment after each successful callGemini. " +
      "Student data: erased with the account and included in the export.",
  },

  // ── Firestore: extra-usage credit (server-only, TOPUP-1; dark until TOPUP_ENABLED) ───────────
  {
    id: "usageCredits",
    kind: "firestore-collection",
    path: "usageCredits/{uid}",
    holds:
      "How much extra AI usage this student has bought with a top-up pack and how much is " +
      "left: the balance, the total bought (base and any bonus, separately), the total spent, " +
      "any expired remainder, the date it lapses (their board exam day) and short-lived holds " +
      "for requests being served right now (each lapses within 15 minutes). Numbers only.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ server/services/usageCredit.cjs, Admin SDK only. NOT declared in firestore.rules: no " +
      "client reads or writes it, so browsers fall through to the deny-all catch-all; the " +
      "student sees a derived 'about N' figure through GET /api/usage/me, never rupees. " +
      "Written by a verified Razorpay payment (idempotent on the payment id) and by the " +
      "metered spend of a served call. Student data: erased with the account and included " +
      "in the export. Empty until the owner switches top-ups on.",
  },
  {
    id: "usageCredits.grants",
    kind: "firestore-subcollection",
    parentId: "usageCredits",
    path: "usageCredits/{uid}/grants/{paymentId}",
    holds:
      "One record per top-up payment: which pack, the price paid, the credit it added " +
      "(base and bonus separately) and when. It is also the idempotency record: a payment " +
      "already here is never credited twice.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ Doc id = the Razorpay payment id. Same accounting character as the payments ledger. " +
      "Student data: erased with the account and included in the export.",
  },

  // ── Firestore: per-student activity log (server-only, STUDENT-ACTIVITY-1) ──────────
  {
    id: "activityLog",
    kind: "firestore-collection",
    path: "activityLog/{uid}",
    holds:
      "Parent of the per-day activity records below. Never written itself; it exists " +
      "only as the path its day records live under.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ server/routes/studentActivity.cjs writes ONLY the `activityDays` subcollection, " +
      "so this document is a Firestore 'missing' parent — mapped anyway so erasure sweeps " +
      "the whole tree (the usageLedger pattern). NOT declared in firestore.rules: browsers " +
      "fall through to the deny-all catch-all; only the Admin SDK reaches it.",
  },
  {
    id: "activityLog.activityDays",
    kind: "firestore-subcollection",
    parentId: "activityLog",
    path: "activityLog/{uid}/activityDays/{dayKey}",
    holds:
      "Which parts of LazyTopper the student used each day (IST): first and last time " +
      "seen that day, a count per section (for example practice or notes) and a count " +
      "per named action (for example an answer check). Names and counts only — no " +
      "question, answer or other text. Kept for 90 days.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ Keyed on the VERIFIED uid of a signed-in student (studentActivity.cjs, " +
      "verifyIdToken with checkRevoked) — never a body field, never an anonymous visitor. " +
      "`expireAt` is a Firestore Timestamp (day start IST + 90 days) for the TTL policy on " +
      "collection group `activityDays`. Erased with the account and included in the export.",
  },

  // ── Firestore: where a new account came from (server-only, SOURCE-1) ───────────────
  {
    id: "signupSources",
    kind: "firestore-collection",
    path: "signupSources/{uid}",
    holds:
      "Where the student's visit that created this account came from, kept ONCE at " +
      "sign-up: the referring site's hostname (only if it was another site), up to four " +
      "ad-campaign tags (source, medium, campaign, content), the page they landed on " +
      "(no query), and whether an ad click id was present (yes or no only — never the id), " +
      "plus when it was recorded.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ Written ONLY by server/routes/signupSource.cjs (POST /api/signup-source) through " +
      "the Admin SDK: the VERIFIED uid, a create-only write, accepted only while the Auth " +
      "account is <= 15 minutes old. Owner ruling 12 Oct 2026 13:16 IST (DECISION 107c): a " +
      "single-visit source capture is a narrow exception to the cookieless rule. Read by the " +
      "admin Students page only. NOT declared in firestore.rules — browsers fall through to " +
      "the deny-all catch-all. Erased with the account and included in the export. The " +
      "device half of the same capture is the sessionStorage key listed under `local-storage`.",
  },

  // ── Firestore: the one trial-ending email (server-only, TRIAL-END-1) ─────────────
  {
    id: "trialEmails",
    kind: "firestore-collection",
    path: "trialEmails/{uid}",
    holds:
      "Whether the one 'your trial ends soon' service email was sent for this student's " +
      "trial: the trial start it was for, its state (claimed, sent, failed — or skipped, with " +
      "the reason: no email address, not an email sign-in, or an unverified address, and when " +
      "to look again), when, the email provider's message id, and — if the student used the " +
      "email's opt-out link — that they opted out and when. Never the email address or the " +
      "email's text.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ Written ONLY by server/services/trialEndingEmail.cjs through the Admin SDK: a " +
      "transactional claim BEFORE sending (so a restart or a second instance can never send " +
      "twice), then the outcome, or a skip marker; and by its opt-out link handler. Off unless the owner sets " +
      "TRIAL_EMAIL_ENABLED. NOT declared in firestore.rules — browsers fall through to the " +
      "deny-all catch-all. Erased with the account and included in the export.",
  },

  // ── Firestore: stored grading results for retries (server-only, LOW-END-1 R4) ──────
  {
    id: "gradingResults",
    kind: "firestore-collection",
    path: "gradingResults/{uid}",
    holds:
      "Parent of the short-lived grading results below. Never written itself; it exists " +
      "only as the path its records live under.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★ server/services/fairUse.cjs (createGradingIdempotency) writes ONLY the `attempts` " +
      "subcollection, so this document is a Firestore 'missing' parent — mapped anyway so " +
      "erasure sweeps the whole tree (the usageLedger pattern). NOT declared in " +
      "firestore.rules: browsers fall through to the deny-all catch-all.",
  },
  {
    id: "gradingResults.attempts",
    kind: "firestore-subcollection",
    parentId: "gradingResults",
    path: "gradingResults/{uid}/attempts/{attemptId}",
    holds:
      "The result of one answer check, kept for 24 hours so that if the connection drops " +
      "and the app sends the same check again, the student gets the same result back " +
      "instead of being graded and charged twice: the marks and feedback the grader " +
      "returned, and when it was graded.",
    mechanism: "admin-sdk-required",
    exportable: true,
    notes:
      "★★ Keyed on the VERIFIED uid of a signed-in student on /api/check-solution or " +
      "/api/grade-worksheet, and a hash of the endpoint + the device's Idempotency-Key — " +
      "never a free check. `expiresAtMs` is checked by the read path itself; `expiresAt` " +
      "is a Timestamp for a TTL policy on collection group `attempts` (an owner platform " +
      "action). Erased with the account and included in the export.",
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
    path: "localStorage['lazytopper.*']; sessionStorage['lazytopper.ci.draft.v1']; IndexedDB 'lazytopper.ciDraft'",
    holds:
      "★ Cached mistake logs, check results, attempt dedup keys, progress, streaks and " +
      "auth state mirrored on the device. ACTIVATION-1: plus an in-progress Check & Improve " +
      "question and answer (text in sessionStorage, photos in IndexedDB) held for THIS TAB " +
      "only, for at most 30 minutes, across a sign-in — cleared on restore, on submit and on " +
      "expiry, and never sent to any server before the student submits. Plus, in THIS TAB's " +
      "sessionStorage only (`lazytopper.visitSource`, SOURCE-1): the coarse source of the " +
      "current visit, held until sign-up sends it once to our server and deletes it, or until " +
      "the tab closes. TRACK-2: plus localStorage `lazytopper.internal` (the single character 1, " +
      "set when this device opens /admin, so analytics can tag the owner's own browsing as " +
      "internal traffic; it holds no id and never leaves the device) and, in THIS TAB's " +
      "sessionStorage, `lazytopper.purchaseSent` (up to 20 random per-attempt checkout ids, so a " +
      "reload cannot count one payment twice). START-HERE-1: plus, in THIS TAB's sessionStorage, " +
      "`lazytopper.startHereSubject` (one word, Maths or Science, read from the landing's ad tag so " +
      "the Start-here card can pre-pick a subject; never sent anywhere) and " +
      "`lazytopper.startHereDismissed` (the single character 1 after Not now, so the card stays " +
      "hidden for the rest of the session). QP-SCORECARD-2 E3: plus localStorage " +
      "`lazytopper.startHereFocusNotNow.<uid>` (1 or 2: how many times Not now was tapped on the " +
      "focused first-run Start-here surface, so it is offered at most twice) and, in THIS TAB's " +
      "sessionStorage, `lazytopper.startHereFocusClosed` (the single character 1 once the focused " +
      "surface was closed this visit; never the uid); neither is ever sent anywhere. " +
      "FOLLOWUPS-2 F2: plus, in THIS TAB's sessionStorage, `lazytopper.startHereShown.<surface>` " +
      "(the single character 1 once the Start-here card or focused surface was shown on that page " +
      "this visit, so the shown event is counted once per tab; never the uid, never sent anywhere). " +
      "LOGIN-HOME-1: plus, in THIS TAB's sessionStorage, `lazytopper.checkOneHandover` (the " +
      "single character 1, written when Byte's Check one answer opens Check & Improve from another " +
      "page, read and deleted once on that arrival so Byte does not ask again; never the uid, never " +
      "sent anywhere). " +
      " TUTOR-FIX-2 T12: plus, in THIS TAB's sessionStorage, `lazytopper.tutorSignupAsk.v1` (a " +
      "signed-out visitor's Quick Practice question id, its position and the option they picked, " +
      "stored only when they choose Sign up on a scorecard's tutor prompt; never the uid; read " +
      "and deleted once by the tutor for that question after sign-up, where it becomes the " +
      "opening line of that student's own tutor thread; dropped unread after an hour). " +
      "TUTOR-Q-1: plus, in THIS TAB's sessionStorage, `lazytopper.tutorPracticeAsk.v1` (the Quick " +
      "Practice question the student tapped Ask the tutor on: its bank question id, its position in " +
      "the set, and, if they answered it, the option text they picked and whether it was right; never " +
      "the uid, never their typed working; plus an opaque owner tag, an 8-hex hash of the uid that " +
      "cannot be reversed to it, so another account on the same tab drops it unread; written on that " +
      "tap, read and deleted once by the tutor for that question, where it becomes the opening line " +
      "of their own tutor thread; dropped unread after an hour) and `lazytopper.practiceReturn.v1` (written on the same tap so the tutor's back " +
      "arrow, or the browser back button, returns to the SAME set: the practice page's URL, the same " +
      "opaque owner tag (another account on the same tab never reads it; it is removed), the " +
      "set's bank question ids in order, the filters that built it, the MCQ picks and their right/wrong " +
      "verdicts, which questions had solution steps open with the step solutions the page had " +
      "already loaded, the question they were on, and any TYPED working they had saved - never a " +
      "photo, never the uid; read and deleted once when the practice page reopens at that same URL, " +
      "dropped unread after an hour or on any other URL; never sent anywhere). " +
      "TRIAL-END-1: plus localStorage `lazytopper.trialEndBannerHidden.<uid>` (the IST date, " +
      "YYYY-MM-DD, on which the student tapped Not today on the trial-ending banner, so it stays " +
      "hidden until the next day; dismissal state only, never trial state, never sent anywhere) " +
      "and, in THIS TAB's sessionStorage, `lazytopper.trialBannerShown` (the IST date the banner's " +
      "shown event was last counted in this tab; never the uid, never sent anywhere). " +
      "FEEDBACK-1: plus localStorage `lazytopper.feedbackAsk.<uid>` (when the \"help us improve\" " +
      "prompt was last shown after an upgrade screen, the start timestamp of the trial whose end " +
      "was already asked about, and when any such prompt was last shown, so each moment is asked " +
      "at most once; never the answer, never sent anywhere). " +
      "PAY-RECOVER-1: plus, in THIS TAB's sessionStorage, `lazytopper.payPending` (the Razorpay " +
      "order id of the checkout this tab last opened, when it was opened and how many payment " +
      "status checks it has used, so a payment whose confirmation was lost can be re-checked; " +
      "never a tier, trial or pass date, never the uid; removed once the payment is confirmed, " +
      "ignored and removed after 30 minutes; the order id is sent only to our own status check). " +
      "GUIDE-1: plus localStorage `lazytopper.guideVariant.<tag>` (the single character 1 once this " +
      "account's Byte-guide test group was reported from this device; <tag> is an 8-hex hash of the " +
      "uid, never the uid; the group itself is never stored) and, in THIS TAB's sessionStorage, " +
      "`lazytopper.guideChipClosed` (the single character 1 after the student hid the corner Byte " +
      "with its own close button; never the uid) and `lazytopper.guideIntent` (GUIDE-1 v1.1: the " +
      "landing PATH and the utm_content / utm_campaign tags of this visit, copied when the visit " +
      "source is captured, so Byte can order his options after sign-up; never a query string, a " +
      "click id or the uid; NOT cleared at sign-up, it ends with the tab), and localStorage `lazytopper.ziggyShown.<tag>` " +
      "(the single character 1 once Ziggy reacted to this account's first scorecard on this device; " +
      "<tag> is an 8-hex hash of the uid, never the uid). " +
      "GUIDE-PUBLIC-1: plus localStorage `lazytopper.guidePublicArm` (guide or control: this DEVICE's " +
      "group in the public-page Byte test, drawn once at random; a device key, NOT cleared at sign-out; " +
      "never the uid; the group alone is sent once, as an analytics user property, so the test can be " +
      "read) and, in THIS TAB's sessionStorage, `lazytopper.guidePublicPeek.<page>` (the single " +
      "character 1 once Byte peeked in on that page type, notes or topic_hub, in this tab) and a " +
      "`public_arm` field (that same group) added to the `lazytopper.guideIntent` record above. " +
      "Dev server only, never read by a production " +
      "build: localStorage `lazytopper.guideVariantOverride` (guide or control, to force a test " +
      "group while developing). PREVIEW-1: plus localStorage `lazytopper.guidePreview` (DEVICE " +
      "state, not student data: the test group, guide or control, and an expiry time 7 days ahead, " +
      "set only from the admin Students page so the LazyTopper team can preview Byte on this " +
      "browser; never the uid; deliberately NOT cleared at sign-out, removed by the admin's Off, " +
      "on expiry, or by the device erasure sweep). MOMENTS-1: plus localStorage " +
      "`lazytopper.mascotsHidden` (the single character 1 after the student tapped Hide mascots, so " +
      "Byte and Ziggy stay hidden on this device until they are turned back on; a DEVICE preference, " +
      "never premium or trial state, never the uid; removed when they are shown again) and " +
      "`lazytopper.m11Shown.<tag>` (the single character 1 once Byte's \"check a written answer\" " +
      "nudge showed on this account's first tap-only scorecard on this device; <tag> is an 8-hex hash " +
      "of the uid, never the uid). GUIDE-PAGES-1: plus localStorage " +
      "`lazytopper.pageGuideSeen.<id>.<step>` (the single character 1 once Byte's page helper — " +
      "Worksheet, Chapter Test, Full Mock or Exam Trends — opened by itself on this device, so it " +
      "opens only on request after that; a DEVICE key, never the uid). " +
      "COMPANION-1: plus localStorage `lazytopper.companion.<tag>` (which of Byte and Ziggy's companion " +
      "moments already showed for this account on this device, so each stays rare: the milestone ids " +
      "already celebrated, and the times the welcome-back, practice-rhythm and countdown moments and the " +
      "late-night note last showed, plus when this account last opened a page here and last opened " +
      "Home here, and today's board-exam-date read with the day it was read (so Home does not fetch it " +
      "again that day); <tag> is an 8-hex hash of the uid, never the uid; never a mark, a score or " +
      "premium or trial state) and, in THIS TAB's sessionStorage, `lazytopper.companionSession` (the " +
      "8-hex account tag and when this account's ACTIVE study session started and last saw a tap, key " +
      "or scroll, so the late-night note can wait for 30 active minutes; never the uid) and " +
      "`lazytopper.guideScene` (the name of the one two-character Byte and Ziggy scene this tab " +
      "already showed, so there is at most one per app session; never the uid). " +
      "GUIDE-FILTER-1: plus localStorage `lazytopper.filterHelpSeen` " +
      "(the single character 1 once the Quick Practice filter explainer opened by itself on this " +
      "device, so it opens on its own only once; a DEVICE flag, never the uid). " +
      "None is ever sent anywhere.",
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
  {
    id: "third-party.email-provider",
    kind: "third-party",
    path: "https://api.resend.com/emails",
    holds:
      "★ TRIAL-END-1 — only when the owner switches the trial-ending email on: the student's " +
      "sign-in email address and the text of that one service email (when their trial ends and " +
      "how many checks, tests and practice sets they did) are handed to the email provider to " +
      "deliver it.",
    mechanism: "third-party-unreachable",
    exportable: false,
    notes:
      "★★ CANNOT BE DELETED BY THE PRODUCT. The provider keeps its own delivery logs under its " +
      "own terms. Nothing is sent while TRIAL_EMAIL_ENABLED is off or TRIAL_EMAIL_DRY_RUN is on " +
      "(the default). Owner decision: the provider account, and saying so in the privacy policy " +
      "before switching it on.",
  },
];

/**
 * ★★ Firestore collections that hold NO student data, and so are deliberately NOT in
 * STUDENT_DATA_MAP. Each is a server-only, identifier-free aggregate: nothing in it
 * names, keys on or can be joined back to a student, so there is nothing to erase or
 * export, and it needs no erasure.
 *
 *   - `freeCheckDaily` (FREE-CHECK-1a, owner ruling OR-3): one document per IST day,
 *     id = the day key (`istDayKey`), holding ONLY three counters — `served`,
 *     `refused_quota`, `refused_budget` (owner ruling OR-13 removed `refused_appcheck`:
 *     App Check refusals are counted by telemetry only). No uid, no IP, no App Check
 *     app id. Written only by `server/services/freeCheck.cjs` through the Admin SDK; no
 *     client rule matches it, so browsers are denied by the catch-all.
 *
 *   - `trialEmailDaily` (TRIAL-END-1, review finding 1): one document per IST day, id = the
 *     day key, holding ONLY `count` (how many trial-ending emails were claimed that day, for the
 *     durable daily cap), the day key and a timestamp. No uid, no address, nothing joinable to a
 *     student. Written only by `server/services/trialEndingEmail.cjs` through the Admin SDK; no
 *     client rule matches it, so browsers are denied by the catch-all.
 *
 *   - `opsReports` (OPS-REPORT-1): one document per IST day, id = the day key, holding ONLY
 *     the day keys, a send status (`claimed` / `sent` / `released` / `failed`), timestamps and
 *     the provider's message id — the claim that keeps the owner's daily health email to one
 *     send per day. The report itself is never stored. No uid, no address, nothing joinable to
 *     a student. Written only by `server/services/opsReport.cjs` through the Admin SDK; no
 *     client rule matches it, so browsers are denied by the catch-all.
 *
 * ★ This list is an EXEMPTION, and exemptions are how a drift guard dies. It is exact,
 * it is pinned by `studentDataMap.test.ts`, and a name belongs here only with a reason
 * of the kind above. A collection that could hold anything about a student goes in the
 * map, never here. ErasureMechanism and erasure/export behaviour are unchanged by it.
 */
export const NON_STUDENT_COLLECTIONS: readonly string[] = Object.freeze(["freeCheckDaily", "trialEmailDaily", "opsReports"]);

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
