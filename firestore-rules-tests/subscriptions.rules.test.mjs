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
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.resolve(HERE, "..", "firestore.rules");

const STUDENT = "student-alice";
const OTHER = "student-bob";

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

/**
 * A full document body, including the two date fields. After SEC-2 the client no
 * longer SENDS these — see `clientWrite` — so this helper is now mainly how a FORGERY
 * is expressed: it is what devtools would put on the wire.
 */
const status = (over = {}) => ({
  tier: "free",
  plan: "none",
  trialStartDate: null,
  trialEndDate: null,
  premiumSince: null,
  ...over,
});

/**
 * The exact shape `subscriptionService.saveCloud` writes (minus `updatedAt`).
 *
 * ★ It omits BOTH date fields. `trialEndDate` is gone for good; `trialStartDate` is
 * sent only by `activateTrial`, as `serverTimestamp()`, and omitting it on every other
 * write is what lets the merge preserve the pinned value — which is precisely what the
 * rules' immutability clause demands. Any test that writes a hand-picked date here is
 * testing a forgery, not the product.
 */
const clientWrite = (over = {}) => ({ tier: "free", plan: "none", premiumSince: null, ...over });

const merge = { merge: true };

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
//
// SEC-2 adds four more, one per clause of the "set ONCE and immutable" property.
// Pinning the start to request.time is NOT sufficient on its own, and each of these
// isolates one of the ways that turns out to be true:
//
//   start-unpinned  the client picks its own trialStartDate on create — the trial's
//                   length is forgeable again, just from the other end.
//   start-movable   ★★ THE INFINITE-TRIAL MUTATION. The start is pinned to
//                   request.time but may be RE-pinned on every update, so a student
//                   re-runs activateTrial daily and never expires.
//   delete-allowed  the start is pinned and immutable, but the document may be
//                   deleted and re-created — the same reset, one step around.
//   endDate-allowed a client may re-introduce the forgeable trialEndDate field.
//
// ★ READ THE RED LIST, NOT JUST THE RED COUNT. The first three variants also drop the
// trialEndDate clause, so test 13 reddens under them as well — that is contamination,
// not evidence. Each clause is pinned by the tests only IT breaks:
//   start-unpinned  -> 9b, 9c        (the start is server-set)
//   start-movable   -> 10, 10b, 10c  (★★ the start never moves — the infinite trial)
//   delete-allowed  -> 7c, 12        (the document cannot be dropped and re-created)
//   endDate-allowed -> 13 ALONE      (the forgeable field cannot come back)
// start-movable additionally reddens 7 and 11b, and that is worth knowing rather than
// tidying away: the naive "pin the start on every write" rule does not merely fail to
// secure the trial, it BREAKS the legitimate expiry write-back at the same time.
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
  "start-unpinned": `
    match /subscriptions/{uid} {
      function ok() {
        return request.resource.data.tier in ['free', 'trial']
            && request.resource.data.plan in ['none', 'trial_7day'];
      }
      function unset(d) { return !('trialStartDate' in d) || d.trialStartDate == null; }
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && ok();
      allow update: if isOwner(uid) && ok()
                    && (unset(resource.data)
                        || request.resource.data.trialStartDate == resource.data.trialStartDate);
      allow delete: if false;
    }`,
  "start-movable": `
    match /subscriptions/{uid} {
      function ok() {
        return request.resource.data.tier in ['free', 'trial']
            && request.resource.data.plan in ['none', 'trial_7day'];
      }
      function unset(d) { return !('trialStartDate' in d) || d.trialStartDate == null; }
      function pinned() {
        return unset(request.resource.data)
            || request.resource.data.trialStartDate == request.time;
      }
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && ok() && pinned();
      allow update: if isOwner(uid) && ok() && pinned();
      allow delete: if false;
    }`,
  "delete-allowed": `
    match /subscriptions/{uid} {
      function ok() {
        return request.resource.data.tier in ['free', 'trial']
            && request.resource.data.plan in ['none', 'trial_7day'];
      }
      function unset(d) { return !('trialStartDate' in d) || d.trialStartDate == null; }
      function pinned() {
        return unset(request.resource.data)
            || request.resource.data.trialStartDate == request.time;
      }
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && ok() && pinned();
      allow update: if isOwner(uid) && ok()
                    && (unset(resource.data)
                        ? pinned()
                        : request.resource.data.trialStartDate == resource.data.trialStartDate);
      allow delete: if isOwner(uid);
    }`,
  "endDate-allowed": `
    match /subscriptions/{uid} {
      function ok() {
        return request.resource.data.tier in ['free', 'trial']
            && request.resource.data.plan in ['none', 'trial_7day'];
      }
      function unset(d) { return !('trialStartDate' in d) || d.trialStartDate == null; }
      function pinned() {
        return unset(request.resource.data)
            || request.resource.data.trialStartDate == request.time;
      }
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && ok() && pinned();
      allow update: if isOwner(uid) && ok()
                    && (unset(resource.data)
                        ? pinned()
                        : request.resource.data.trialStartDate == resource.data.trialStartDate);
      allow delete: if false;
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
  await assertSucceeds(
    setDoc(
      subDoc(asStudent()),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: serverTimestamp() }),
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
  // The real write: a MERGE that carries neither date field, so the pinned start
  // written by test 1 rides through untouched.
  await assertSucceeds(
    setDoc(subDoc(asStudent()), clientWrite({ tier: "free", plan: "trial_7day" }), merge),
  );
});

test("7b CONTROL — student CAN read their own subscription doc", async () => {
  await assertSucceeds(getDoc(subDoc(asStudent())));
});

test("7c student CANNOT delete their own subscription doc", async () => {
  await assertFails(deleteDoc(subDoc(asStudent())));
});

// ===========================================================================
// 8 — ★★ [FU-TRIAL-ENDDATE-CLIENT-FORGEABLE] — CLOSED BY SEC-2.
//
//     PR-1 left this open and asserted so deliberately: the previous version of
//     test 8 required that a forged far-future trialEndDate STILL be accepted,
//     so that PR-1 could not be mistaken for having closed it. That test has now
//     gone red on purpose and is replaced by its inverse.
//
//     The end date is no longer stored at all — the trial's END is derived from a
//     server-pinned START plus the TRIAL_DAYS constant in subscriptionService. The
//     rules therefore have nothing to parse, which is why every earlier attempt to
//     *validate* the ISO string failed: the field had to go, not be guarded.
// ===========================================================================
test("8  a forged far-future trialEndDate is now REFUSED at the door", async () => {
  await assertFails(
    setDoc(
      subDoc(asStudent()),
      status({ tier: "trial", plan: "trial_7day", trialEndDate: "3000-01-01T00:00:00.000Z" }),
    ),
  );
});

// ===========================================================================
// 9 — ★ THE START IS SERVER-PINNED. request.time is set by the server; a client
//     using serverTimestamp() produces exactly it, and a client picking its own
//     value produces something else. This is what makes the trial's LENGTH
//     unforgeable from the near end.
//     Reddens against SEC1_MUTATION=start-unpinned.
// ===========================================================================
const CAROL = "student-carol";

test("9  CONTROL — create with serverTimestamp() as the start is ALLOWED", async () => {
  await assertSucceeds(
    setDoc(
      subDoc(asStudent(CAROL), CAROL),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: serverTimestamp() }),
    ),
  );
});

test("9b ★ create with a client-CHOSEN start is DENIED", async () => {
  const dave = "student-dave";
  await assertFails(
    setDoc(
      subDoc(asStudent(dave), dave),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() + 300 * DAY) }),
    ),
  );
});

test("9c ★ a start backdated into the PAST is DENIED too — any chosen value, not just future ones", async () => {
  const erin = "student-erin";
  await assertFails(
    setDoc(
      subDoc(asStudent(erin), erin),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - 30 * DAY) }),
    ),
  );
});

// ===========================================================================
// 10 — ★★ THE FOURTH FORM. Pinning the start to request.time is NOT sufficient
//      on its own. If the client may write trialStartDate == request.time
//      WHENEVER IT LIKES, a student re-triggers activateTrial daily and holds an
//      infinite trial — the same forged length wearing a new costume.
//
//      This is the assertion that reddens against SEC1_MUTATION=start-movable,
//      and it is the one that would otherwise have been missed: the mutation
//      passes every other test in this file.
// ===========================================================================
test("10 ★★ an update that MOVES the pinned start is DENIED (the infinite trial)", async () => {
  // Carol already has a start pinned by test 9. Re-running the exact write that
  // legitimately created it must NOT be allowed to re-pin the clock.
  await assertFails(
    setDoc(
      subDoc(asStudent(CAROL), CAROL),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: serverTimestamp() }),
      merge,
    ),
  );
});

test("10b an update that replaces the start with a chosen value is DENIED", async () => {
  await assertFails(
    setDoc(
      subDoc(asStudent(CAROL), CAROL),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() + 300 * DAY) }),
      merge,
    ),
  );
});

test("10c an update that ERASES the start is DENIED — nulling it would un-expire the trial", async () => {
  await assertFails(
    setDoc(
      subDoc(asStudent(CAROL), CAROL),
      clientWrite({ tier: "trial", plan: "trial_7day", trialStartDate: null }),
      merge,
    ),
  );
});

// ===========================================================================
// 11 — CONTROL. The everyday write must still work, or the fix has broken trial
//      activation and the expiry write-back instead of securing them.
// ===========================================================================
test("11 CONTROL — an update that PRESERVES the start (omits it under merge) is ALLOWED", async () => {
  await assertSucceeds(
    setDoc(subDoc(asStudent(CAROL), CAROL), clientWrite({ tier: "free", plan: "trial_7day" }), merge),
  );
});

test("11b CONTROL — the start survived that update unchanged", async () => {
  let stored;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), "subscriptions", CAROL));
    stored = snap.data();
  });
  // ★ NAME THE SUBJECT, not just the verdict: assert the document really carries a
  // server-set Timestamp, so this control cannot pass by looking at nothing.
  assert.ok(stored, "carol's subscription document is missing");
  assert.ok(stored.trialStartDate, "carol's trialStartDate was erased by the downgrade write");
  assert.equal(
    typeof stored.trialStartDate.toDate,
    "function",
    "trialStartDate is not a Firestore Timestamp — a client-chosen string got through",
  );
  const startMs = stored.trialStartDate.toDate().getTime();
  assert.ok(
    Math.abs(Date.now() - startMs) < 10 * 60 * 1000,
    `trialStartDate is not the server clock (${new Date(startMs).toISOString()})`,
  );
});

// ===========================================================================
// 12 — ★ DELETE. With the start pinned and immutable, deleting the document and
//      re-creating it is the last way to reset the clock. (7c already covers the
//      shipped path; this pins the same property under the mutation harness, where
//      SEC1_MUTATION=delete-allowed grants delete and everything else stays sound.)
// ===========================================================================
test("12 ★ a student CANNOT delete their own subscription doc to reset the trial clock", async () => {
  await assertFails(deleteDoc(subDoc(asStudent(CAROL), CAROL)));
});

test("12b ...and the document is still there afterwards", async () => {
  await assertSucceeds(getDoc(subDoc(asStudent(CAROL), CAROL)));
});

// ===========================================================================
// 13 — trialEndDate cannot be re-introduced. The client no longer writes it, so
//      this is defence in depth against a regression that starts writing it again.
//      Reddens against SEC1_MUTATION=endDate-allowed.
// ===========================================================================
test("13 ★ a client cannot INTRODUCE trialEndDate on an existing document", async () => {
  await assertFails(
    setDoc(
      subDoc(asStudent(CAROL), CAROL),
      { tier: "free", plan: "trial_7day", trialEndDate: "3000-01-01T00:00:00.000Z" },
      merge,
    ),
  );
});

test("13b CONTROL — an explicit null trialEndDate is harmless and stays allowed", async () => {
  await assertSucceeds(
    setDoc(subDoc(asStudent(CAROL), CAROL), { tier: "free", plan: "trial_7day", trialEndDate: null }, merge),
  );
});

// ===========================================================================
// 14 — REGRESSION. PR-1's premium assertions must still hold for a student who
//      has been through the whole trial lifecycle above, not only for a fresh doc.
// ===========================================================================
test("14 REGRESSION — carol still cannot self-grant premium after all of the above", async () => {
  await assertFails(
    setDoc(subDoc(asStudent(CAROL), CAROL), clientWrite({ tier: "premium", plan: "premium_monthly" }), merge),
  );
  await assertFails(
    setDoc(doc(asStudent(CAROL), "subscriptions", CAROL, "override", "x"), { tier: "premium" }),
  );
});
