// Firestore security-rules tests for `subscriptions/{uid}` — the premium self-grant route.
//
// WHY THIS FILE EXISTS
// --------------------
// `firestore.rules` used to carry `match /subscriptions/{uid} { allow read, write: if
// isOwner(uid); }`, so any signed-in student could open devtools and write
// tier:"premium" into their own document. Nothing else in the product enforces
// entitlement server-side, so that was a complete bypass of the paywall.
//
// The rule cannot simply deny all client writes: `subscriptionService.activateTrial`
// writes tier:"trial" from the browser and there is no server endpoint for it, so a
// blanket deny would break trial activation for every new student. The rule therefore
// allowlists the tier/plan pairs a browser may legitimately write, and this suite pins
// both halves of that: the paid values are refused, and the trial values still work.
//
// Run:  pnpm run test:firestore-rules      (starts the Firestore emulator via firebase-tools)
//
// ★ MUTATION HARNESS — see MUTATIONS below. A guard that cannot be shown to have fired
//   is not present, and the *previous* attempt at this fix was exactly that: a no-op that
//   read as a fix. `SEC1_MUTATION` rewrites the rules text IN MEMORY only (the file on
//   disk is never touched) so the proof is one command and can never be left committed.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.resolve(HERE, "..", "firestore.rules");

const STUDENT = "student-alice";
const OTHER = "student-bob";

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

/** The exact shape `subscriptionService.saveCloud` writes (minus `updatedAt`). */
const status = (over = {}) => ({
  tier: "free",
  plan: "none",
  trialStartDate: null,
  trialEndDate: null,
  premiumSince: null,
  ...over,
});

// ---------------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------------
// Each entry replaces the shipped `match /subscriptions/{uid} { ... }` block with a
// known-bad variant, to prove the assertions below can actually detect it.
//
//   permissive   the original rule this lane removes.
//   nested-noop  ★ the PREVIOUS spec's own "fix": parent restricted, nested
//                `{document=**}` left permissive. In rules_version '2' a recursive
//                wildcard matches ZERO or more segments, so the nested block also
//                matches the parent document path, and Firestore ORs its match
//                blocks — the nested block re-grants everything the parent denies.
//                A suite that stays green against this one is testing nothing.
const MUTATIONS = {
  permissive: `
    match /subscriptions/{uid} {
      allow read, write: if isOwner(uid);

      match /{document=**} {
        allow read, write: if isOwner(uid);
      }
    }`,
  "nested-noop": `
    match /subscriptions/{uid} {
      allow read: if isOwner(uid);
      allow create, update: if isOwner(uid)
        && request.resource.data.tier in ['free', 'trial']
        && request.resource.data.plan in ['none', 'trial_7day'];

      match /{document=**} {
        allow read, write: if isOwner(uid);
      }
    }`,
};

/** Replace the shipped subscriptions block with a mutation variant, in memory only. */
function loadRules() {
  const source = readFileSync(RULES_PATH, "utf8");
  const name = process.env.SEC1_MUTATION;
  if (!name) return source;

  const variant = MUTATIONS[name];
  if (!variant) {
    throw new Error(
      `Unknown SEC1_MUTATION "${name}". Known: ${Object.keys(MUTATIONS).join(", ")}`,
    );
  }

  // Splice by LINE, not by raw offset: firestore.rules is CRLF, and an anchor
  // written as "\n    }\n" silently fails to match it. Locate the block's opening
  // line, then its closing brace at the same indent. Anchored on the real text so
  // a rules edit that moves the block fails loudly instead of mutating nothing.
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const lines = source.split(eol);

  const open = lines.findIndex((l) => l.trim() === "match /subscriptions/{uid} {");
  if (open === -1) throw new Error("subscriptions block not found in firestore.rules");
  const indent = lines[open].slice(0, lines[open].indexOf("match"));

  let close = -1;
  for (let i = open + 1; i < lines.length; i++) {
    if (lines[i] === `${indent}}`) {
      close = i;
      break;
    }
  }
  if (close === -1) throw new Error("end of subscriptions block not found in firestore.rules");

  const replacement = variant.replace(/^\r?\n/, "").split("\n");
  const mutated = [...lines.slice(0, open), ...replacement, ...lines.slice(close + 1)].join(eol);

  assert.notEqual(mutated, source, "mutation did not change the rules text");
  assert.ok(
    mutated.includes("match /subscriptions/{uid} {"),
    "mutation destroyed the subscriptions block instead of replacing it",
  );
  console.log(`\n★★ SEC1_MUTATION=${name} ACTIVE — rules are deliberately broken for this run ★★\n`);
  return mutated;
}

let testEnv;

before(async () => {
  const hostPort = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const [host, port] = hostPort.split(":");
  testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || "demo-lazytopper-rules",
    firestore: { rules: loadRules(), host, port: Number(port) },
  });
  await testEnv.clearFirestore();
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

/** Firestore handle for a signed-in student. */
const asStudent = (uid = STUDENT) => testEnv.authenticatedContext(uid).firestore();
/** Firestore handle for a signed-out visitor. */
const asSignedOut = () => testEnv.unauthenticatedContext().firestore();

const subDoc = (db, uid = STUDENT) => doc(db, "subscriptions", uid);

// ===========================================================================
// 1 — CONTROL. The client-legitimate trial write must keep working.
//     §3 of the task: `activateTrial` is client-only, there is no server
//     endpoint, so a blanket deny would break every new student.
// ===========================================================================
test("1  student CAN write tier:trial / plan:trial_7day to their own doc", async () => {
  const now = Date.now();
  await assertSucceeds(
    setDoc(
      subDoc(asStudent()),
      status({
        tier: "trial",
        plan: "trial_7day",
        trialStartDate: iso(now),
        trialEndDate: iso(now + 7 * DAY),
      }),
    ),
  );
});

// ===========================================================================
// 2 — ★ THE DEFECT. Writing tier:"premium" is the self-grant.
// ===========================================================================
test("2  student CANNOT write tier:premium to their own doc", async () => {
  await assertFails(
    setDoc(subDoc(asStudent()), status({ tier: "premium", plan: "premium_monthly", premiumSince: iso(Date.now()) })),
  );
});

test("2b student CANNOT sneak tier:premium in under an otherwise-free plan", async () => {
  await assertFails(setDoc(subDoc(asStudent()), status({ tier: "premium", plan: "none" })));
});

// ===========================================================================
// 3 — ★ The paid PLANS are refused independently of the tier, so neither field
//     alone is a way in.
// ===========================================================================
test("3  student CANNOT write plan:premium_monthly", async () => {
  await assertFails(setDoc(subDoc(asStudent()), status({ tier: "free", plan: "premium_monthly" })));
});

test("3b student CANNOT write plan:premium_yearly", async () => {
  await assertFails(setDoc(subDoc(asStudent()), status({ tier: "free", plan: "premium_yearly" })));
});

// ===========================================================================
// 4 — ★★ THE HOLE THE PREVIOUS FIX LEFT. A recursive-wildcard block under this
//     document also matches the document itself, so a permissive nested block
//     re-grants everything the parent denies. This assertion is the one that
//     reddens against `SEC1_MUTATION=nested-noop`.
// ===========================================================================
test("4  student CANNOT reach premium through a subcollection write", async () => {
  const db = asStudent();
  await assertFails(
    setDoc(doc(db, "subscriptions", STUDENT, "override", "entitlement"), { tier: "premium" }),
  );
});

test("4b student CANNOT write a DEEPLY nested path under their subscription doc", async () => {
  const db = asStudent();
  await assertFails(
    setDoc(doc(db, "subscriptions", STUDENT, "a", "b", "c", "d"), { tier: "premium" }),
  );
});

test("4c student CANNOT read a subcollection under their subscription doc", async () => {
  const db = asStudent();
  await assertFails(getDoc(doc(db, "subscriptions", STUDENT, "override", "entitlement")));
});

// ===========================================================================
// 5 — Cross-account isolation.
// ===========================================================================
test("5  student cannot read or write ANOTHER student's subscription doc", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "subscriptions", OTHER), status({ tier: "premium", plan: "premium_monthly" }));
  });
  const db = asStudent();
  await assertFails(getDoc(subDoc(db, OTHER)));
  await assertFails(setDoc(subDoc(db, OTHER), status({ tier: "trial", plan: "trial_7day" })));
});

// ===========================================================================
// 6 — Signed-out callers.
// ===========================================================================
test("6  signed-out caller can neither read nor write a subscription doc", async () => {
  const db = asSignedOut();
  await assertFails(getDoc(subDoc(db)));
  await assertFails(setDoc(subDoc(db), status({ tier: "trial", plan: "trial_7day" })));
});

// ===========================================================================
// 7 — CONTROL. The expiry write-back. `loadSubscription` -> `applyExpiry` returns
//     {...status, tier:"free"} and KEEPS plan:"trial_7day", then saves it. A rule
//     written as `tier=='trial' && plan=='trial_7day'` would silently break this
//     real client write, so it is pinned.
// ===========================================================================
test("7  student CAN write the expired-trial downgrade (tier:free, plan:trial_7day)", async () => {
  const now = Date.now();
  await assertSucceeds(
    setDoc(
      subDoc(asStudent()),
      status({
        tier: "free",
        plan: "trial_7day",
        trialStartDate: iso(now - 10 * DAY),
        trialEndDate: iso(now - 3 * DAY),
      }),
    ),
  );
});

test("7b CONTROL — student CAN read their own subscription doc", async () => {
  await assertSucceeds(getDoc(subDoc(asStudent())));
});

test("7c student CANNOT delete their own subscription doc", async () => {
  await assertFails(deleteDoc(subDoc(asStudent())));
});

// ===========================================================================
// 8 — ★★ KNOWN RESIDUAL, NOT A PASS. [FU-TRIAL-ENDDATE-CLIENT-FORGEABLE]
//
//     isPremiumAccess() returns true for tier "trial" just as it does for
//     "premium", and trialEndDate is a client-supplied ISO *string* that
//     applyExpiry trusts. Rules have no string-to-timestamp parser, so
//     request.time cannot bound it here — closing this needs Timestamp-typed
//     dates (subscriptionService) or server-issued trials.
//
//     This test asserts the hole is STILL OPEN, deliberately, so that neither
//     PR-1 nor PR-2 can be mistaken for having closed premium self-grant. When
//     someone does close it, this test goes red — which is the prompt to update
//     the docs and delete it.
// ===========================================================================
test("8  KNOWN RESIDUAL — a forged far-future trialEndDate is still accepted", async () => {
  await assertSucceeds(
    setDoc(
      subDoc(asStudent()),
      status({
        tier: "trial",
        plan: "trial_7day",
        trialStartDate: iso(Date.now()),
        trialEndDate: "3000-01-01T00:00:00.000Z",
      }),
    ),
  );
});
