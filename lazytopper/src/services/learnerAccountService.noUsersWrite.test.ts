/**
 * learnerAccountService — pins that the module performs NO Firestore access at all.
 *
 * ★★ WHY THIS IS A BEHAVIOURAL TEST AND NOT A SOURCE GREP.
 * A test that scans this file for the string "users" proves nothing about what runs: the
 * word appears in the module's own header comment explaining why the write is gone, so a
 * string-absence test would be red on a correct tree and green on a tree that writes
 * through a constant. This suite instead CALLS the real function with a fully-populated
 * payload and asserts that the Firestore SDK is never touched.
 *
 * The write this replaces mirrored a child's direct identifiers into `users/{uid}` on
 * every login. It was never once issued (undeclared in firestore.rules => the preceding
 * read was denied and threw), nothing read it, and USERS-1 removed it. Restoring a body
 * to `ensureLearnerAccountMetadata` turns this suite RED — mutation-verified.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// The Firestore surface the retired write used. Spied so ANY use is observable.
//
// ★ `vi.hoisted` is REQUIRED here, not stylistic. `vi.mock` is hoisted above plain
// `const` declarations, so a factory closing over them hits the temporal dead zone the
// moment the SUT actually imports `firebase/firestore`. On the correct tree the module
// imports nothing, the factory never runs, and a plain `const` looks fine — it only
// explodes under the very mutation this suite exists to catch, turning a clean assertion
// failure into an unreadable collection error. Found by running that mutation.
const { doc, getDoc, setDoc, collection, updateDoc, deleteDoc } = vi.hoisted(() => ({
  doc: vi.fn(() => ({ __ref: true })),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  setDoc: vi.fn(async () => {}),
  collection: vi.fn(() => ({ __col: true })),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
}));

vi.mock("firebase/firestore", () => ({ doc, getDoc, setDoc, collection, updateDoc, deleteDoc }));
// A TRUTHY db: the retired code short-circuited on `!firestoreDb`, so a falsy stub would
// make this suite pass for the wrong reason even if the write came back.
vi.mock("./firebaseClient", () => ({ firestoreDb: { __db: true }, firebaseConfigured: true }));

import { ensureLearnerAccountMetadata } from "./learnerAccountService";

const FULL_PAYLOAD = {
  uid: "u-test-1",
  email: "learner@example.test",
  phoneNumber: "+910000000000",
  displayName: "Test Learner",
  authProvider: "firebase-email",
};

beforeEach(() => {
  doc.mockClear();
  getDoc.mockClear();
  setDoc.mockClear();
  collection.mockClear();
  updateDoc.mockClear();
  deleteDoc.mockClear();
});

describe("learnerAccountService — the `users` write is gone", () => {
  it("★ CONTROL: the Firestore spies are wired and DO record calls", async () => {
    // Without this, every "was not called" assertion below is indistinguishable from a
    // dead spy. Prove the mechanism fires before believing its silence.
    const mod = await import("firebase/firestore");
    mod.doc({} as never, "someCollection", "id");
    await mod.setDoc({} as never, { a: 1 });
    expect(doc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it("★★ touches no Firestore document — no doc(), no getDoc(), no setDoc()", async () => {
    await ensureLearnerAccountMetadata(FULL_PAYLOAD);

    expect(doc).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(collection).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(deleteDoc).not.toHaveBeenCalled();
  });

  it("★ no argument to any Firestore call names the `users` collection", async () => {
    await ensureLearnerAccountMetadata(FULL_PAYLOAD);
    // Path-shaped assertion rather than call-count, so a write routed through a constant
    // or a template literal is caught too.
    const everyArg = [...doc.mock.calls, ...collection.mock.calls]
      .flat()
      .map((a) => String(a));
    expect(everyArg.filter((a) => a.includes("users"))).toEqual([]);
  });

  it("★ still resolves for every caller shape, including empty identifiers", async () => {
    // The retired version returned early on a blank uid. Callers must not start throwing.
    await expect(ensureLearnerAccountMetadata(FULL_PAYLOAD)).resolves.toBeUndefined();
    await expect(
      ensureLearnerAccountMetadata({
        uid: "",
        email: null,
        phoneNumber: null,
        displayName: null,
        authProvider: "",
      })
    ).resolves.toBeUndefined();
    expect(setDoc).not.toHaveBeenCalled();
  });
});
