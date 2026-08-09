/**
 * referralService — UID-ONLY PERSISTED-STORAGE GUARD
 * Pins CodeQL alerts #17 (`saveReferralData`), #18 (`publishToStore`),
 * #19 (`addReferralToCode`) and #20 (`creditPendingReferral`).
 *
 * ── WHY THESE ALERTS ARE FALSE POSITIVES ────────────────────────────────────
 * `js/clear-text-storage-of-sensitive-data` reports, on all four sinks:
 *   "This stores sensitive data returned by a call to
 *    createUserWithEmailAndPassword as clear text."
 * That message names the TAINT SOURCE, not the stored value. The source is
 * `AuthContext.tsx`'s `createUserWithEmailAndPassword(...)`, whose whole
 * `UserCredential` CodeQL taints as one unit. The only value that actually
 * travels from that credential into this file is `user.uid` — the sole
 * production caller is `Login.tsx`: `creditPendingReferral(user.uid)`. A
 * Firebase uid is an opaque pseudonymous identifier, not a credential.
 *
 * ── WHAT THIS TEST PINS, AND WHY IT IS AN ALLOWLIST ─────────────────────────
 * The false positive is only *safely* false for as long as it stays true that
 * nothing identifying reaches these sinks. This test drives the REAL public
 * path and audits the bytes that actually reach `localStorage` against three
 * ALLOWLISTS: permitted storage keys, permitted payload keys, permitted
 * payload values.
 *
 * An allowlist, deliberately — NOT a denylist of `email`/`phone`. A denylist
 * fails OPEN the day someone persists `guardianPhone` or `parentEmail`. An
 * allowlist fails SAFE: a new key or value simply has to be declared below,
 * which forces whoever adds it to look at it and confirm it is not
 * identifying.
 *
 * ⚠ IF THIS TEST IS RED ON YOUR BRANCH, THAT IS PROBABLY IT WORKING.
 * You have persisted something new. Do not delete the guard — add the new key
 * to the allowlist and satisfy yourself it carries no direct identifier.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  captureIncomingReferral,
  creditPendingReferral,
  getReferralData,
  getPendingReferralCode,
  getReferredByCode,
} from "./referralService";

// ── the audit kit (kept local so this guard is readable on its own) ──────────
type Rule = string | RegExp;
const permits = (v: string, rules: readonly Rule[]): boolean =>
  rules.some((r) => (typeof r === "string" ? r === v : r.test(v)));

/**
 * Walk a persisted payload, collecting every object KEY and every primitive
 * VALUE. A string carrying the `::` composite delimiter is recorded as its
 * SEGMENTS, so appending a new component to a composite key is visible as an
 * undeclared atom rather than hiding inside one long string.
 */
function scan(node: unknown, keys: Set<string>, atoms: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => scan(n, keys, atoms));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      keys.add(k);
      scan(v, keys, atoms);
    }
    return;
  }
  if (node === null || node === undefined) return;
  const s = String(node);
  if (s.includes("::")) s.split("::").forEach((seg) => atoms.add(seg));
  else atoms.add(s);
}

interface Allow {
  storageKeys: readonly Rule[];
  payloadKeys: readonly Rule[];
  atoms: readonly Rule[];
}

function audit(writes: readonly { key: string; value: string }[], allow: Allow): string[] {
  const undeclared: string[] = [];
  for (const w of writes) {
    if (!permits(w.key, allow.storageKeys)) {
      undeclared.push(`storage key "${w.key}"`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(w.value);
    } catch {
      parsed = w.value; // a bare scalar write (not JSON) — audit it as-is
    }
    const keys = new Set<string>();
    const atoms = new Set<string>();
    scan(parsed, keys, atoms);
    for (const k of keys) {
      if (!permits(k, allow.payloadKeys)) undeclared.push(`payload key "${k}" written to "${w.key}"`);
    }
    for (const a of atoms) {
      if (!permits(a, allow.atoms)) undeclared.push(`payload value "${a}" written to "${w.key}"`);
    }
  }
  return undeclared;
}

// ── the declared surface ─────────────────────────────────────────────────────
/** The uid the "signed-in student" carries through the whole test. */
const UID = "uid-sentinel-9f3c4b";
/** The referrer's code arriving in the share link. */
const REFERRER_CODE = "LT-ABC234";

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
/** `generateCode()` mints `LT-` + 6 chars from a Crockford-ish alphabet. */
const REFERRAL_CODE = /^LT-[A-HJ-NP-Z2-9]{6}$/;

const ALLOW: Allow = {
  // Every localStorage key this path is permitted to write.
  storageKeys: [
    "lazytopper.referral.v1", //        the student's own ReferralData
    "lazytopper.pending_referral", //   the inbound code, pre-signup
    "lazytopper.referred_by", //        the code that credited this student
    "lazytopper.referral_credited", //  the one-shot credit receipt
    /^lazytopper\.refstore\.LT-[A-HJ-NP-Z2-9]{6}$/, // the per-code shared store
  ],
  // Every object key permitted inside any of those payloads.
  payloadKeys: [
    "code", //               a referral code — not a person
    "referrals", //          a list of referred UIDs (see atoms)
    "rewardWeeksEarned", //  a count
    "createdAt", //          ISO timestamp
    "referrerCode", //       a referral code
    "creditedAt", //         ISO timestamp
    "newUserId", //          THE UID. The only identity-adjacent value here.
  ],
  // Every primitive value permitted inside any of those payloads.
  atoms: [
    UID, //             the pseudonymous Firebase uid — the whole point of the guard
    REFERRER_CODE, //   a referral code
    REFERRAL_CODE, //   a minted referral code
    ISO, //             timestamps
    /^\d+$/, //         counts (rewardWeeksEarned)
  ],
};

// ── harness ──────────────────────────────────────────────────────────────────
const realSetItem = Storage.prototype.setItem;
let writes: { key: string; value: string }[] = [];

beforeEach(() => {
  window.localStorage.clear();
  writes = [];
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key: string,
    value: string,
  ) {
    writes.push({ key: String(key), value: String(value) });
    realSetItem.call(this, key, value);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

/** The real product sequence: App.tsx captures `?ref=`, Login.tsx credits the uid. */
function driveTheRealReferralPath(): void {
  window.history.replaceState({}, "", `/?ref=${REFERRER_CODE}`);
  captureIncomingReferral(); // → saveReferralData (#17) + publishToStore (#18)
  creditPendingReferral(UID); // → addReferralToCode (#19) + credit receipt (#20)
}

describe("referralService — only the uid reaches localStorage", () => {
  it("★ the real referral path writes nothing outside the declared allowlist", () => {
    driveTheRealReferralPath();

    // LIVENESS — a guard that never saw a write cannot have checked one.
    expect(writes.length).toBeGreaterThan(0);

    expect(
      audit(writes, ALLOW),
      "A new key or value reached persisted storage. Declare it in ALLOW above, " +
        "deliberately, and confirm it is NOT a direct identifier (email, phone, " +
        "guardian contact, real name). Do not delete this guard to go green.",
    ).toEqual([]);
  });

  it("★ all four flagged sinks were actually exercised, and each carried the uid", () => {
    driveTheRealReferralPath();

    const keys = writes.map((w) => w.key);
    // #17 saveReferralData
    expect(keys).toContain("lazytopper.referral.v1");
    // #18 publishToStore + #19 addReferralToCode — both are refstore.<code> writes
    expect(keys.filter((k) => k.startsWith("lazytopper.refstore."))).not.toHaveLength(0);
    // #20 creditPendingReferral
    expect(keys).toContain("lazytopper.referral_credited");

    // The uid IS persisted — this is the value CodeQL is complaining about, and
    // proving it is present is what makes the "and nothing else" claim meaningful.
    const credited = writes.filter((w) => w.key === "lazytopper.referral_credited");
    expect(credited).not.toHaveLength(0);
    expect(JSON.parse(credited[credited.length - 1].value).newUserId).toBe(UID);

    const referrerStore = writes.filter((w) => w.key === `lazytopper.refstore.${REFERRER_CODE}`);
    expect(referrerStore).not.toHaveLength(0);
    expect(JSON.parse(referrerStore[referrerStore.length - 1].value).referrals).toContain(UID);
  });

  it("★ NEGATIVE CONTROL — a uid-only run is GREEN (the guard does not fail on everything)", () => {
    driveTheRealReferralPath();
    expect(audit(writes, ALLOW)).toEqual([]);
    // and the surrounding reads still work, i.e. the path really ran
    expect(getPendingReferralCode()).toBeNull(); // consumed by the credit
    expect(getReferredByCode()).toBe(REFERRER_CODE);
    expect(getReferralData().code).toMatch(REFERRAL_CODE);
  });

  it("★ CONTROL — the audit CAN fire: an email or a phone in a payload is caught", () => {
    // Proves the matcher is alive. A zero from a matcher nobody proved can fire
    // is indistinguishable from a dead matcher.
    const withEmail = [
      { key: "lazytopper.referral.v1", value: JSON.stringify({ code: "LT-ABC234", email: "a@b.test" }) },
    ];
    expect(audit(withEmail, ALLOW)).toEqual([
      'payload key "email" written to "lazytopper.referral.v1"',
      'payload value "a@b.test" written to "lazytopper.referral.v1"',
    ]);

    // ★ AND THE CASE A DENYLIST WOULD MISS — a field named neither `email` nor
    //   `phone`. This is why the allowlist shape was chosen.
    const withGuardianPhone = [
      { key: "lazytopper.referral.v1", value: JSON.stringify({ guardianPhone: "+910000000000" }) },
    ];
    expect(audit(withGuardianPhone, ALLOW)).toEqual([
      'payload key "guardianPhone" written to "lazytopper.referral.v1"',
      'payload value "+910000000000" written to "lazytopper.referral.v1"',
    ]);

    // ★ AND AN ENTIRELY NEW STORAGE KEY on this path.
    const newSink = [{ key: "lazytopper.parentEmail.v1", value: JSON.stringify({ code: "LT-ABC234" }) }];
    expect(audit(newSink, ALLOW)).toEqual(['storage key "lazytopper.parentEmail.v1"']);
  });
});
