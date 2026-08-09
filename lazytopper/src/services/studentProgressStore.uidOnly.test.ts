/**
 * studentProgressStore — UID-ONLY PERSISTED-STORAGE GUARD
 * Pins CodeQL alerts #22 (`writeJson`, the generic snapshot/scope writer) and
 * #23 (`setActiveProgressUser`).
 *
 * ── WHY THESE ALERTS ARE FALSE POSITIVES ────────────────────────────────────
 * `js/clear-text-storage-of-sensitive-data` reports on both sinks:
 *   "This stores sensitive data returned by a call to
 *    createUserWithEmailAndPassword as clear text."
 * That names the TAINT SOURCE, not the stored value. CodeQL taints the whole
 * `UserCredential` returned in `AuthContext.tsx` and follows every value
 * reachable from it. The only one that arrives here is `uid`.
 *
 * Alert #23 is the purest demonstration in the whole set: the sink is literally
 *   window.localStorage.setItem(ACTIVE_UID_KEY, String(uid))
 * — the tainted value, stored alone, is a Firebase uid. A uid is an opaque
 * pseudonymous identifier, not a credential.
 *
 * ⚠ NOT A DPDP CLAIM. These payloads DO hold a child's progress on the device
 * (that is `STUDENT_DATA_MAP`'s `local-storage` entry, `mechanism:
 * "client-local"`, and it stays exactly as it is). What this test pins is the
 * narrower SECURITY claim the CodeQL rule makes: no credential and no direct
 * identifier is persisted here.
 *
 * ── WHAT THIS TEST PINS, AND WHY IT IS AN ALLOWLIST ─────────────────────────
 * Drives the REAL public paths and audits the bytes that reach `localStorage`
 * against three ALLOWLISTS: permitted storage keys, payload keys, payload
 * values. An allowlist, not a denylist of `email`/`phone`: a denylist fails
 * OPEN the day someone persists `guardianPhone`. An allowlist fails SAFE — a
 * new key must be DECLARED, which forces a human to look at it.
 *
 * ⚠ IF THIS TEST IS RED ON YOUR BRANCH, THAT IS PROBABLY IT WORKING.
 * Add the new key below and confirm it carries no direct identifier. Do not
 * delete the guard to go green.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Firestore off — this guard is about the localStorage sinks only.
vi.mock("./firebaseClient", () => ({ firestoreDb: null }));

import {
  setActiveProgressUser,
  getActiveProgressUser,
  saveLearnerProgress,
  hydrateLocalProgressFromCloud,
  type LearnerProgressSnapshot,
} from "./studentProgressStore";

// ── the audit kit (kept local so this guard is readable on its own) ──────────
type Rule = string | RegExp;
const permits = (v: string, rules: readonly Rule[]): boolean =>
  rules.some((r) => (typeof r === "string" ? r === v : r.test(v)));

/**
 * Walk a persisted payload, collecting every object KEY and every primitive
 * VALUE. A string carrying the `::` composite delimiter is recorded as its
 * SEGMENTS, so appending a component to a composite key shows up as an
 * undeclared atom instead of hiding inside one long string.
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
    if (!permits(w.key, allow.storageKeys)) undeclared.push(`storage key "${w.key}"`);
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
const UID = "uid-sentinel-9f3c4b";
const TOPIC = "real-numbers";
const AT = "2026-08-01T00:00:00.000Z";
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const PATCH = {
  statsByChapter: { [TOPIC]: { attempted: 4, correct: 3 } },
  attempts: [
    {
      id: "attempt-1",
      questionId: "RN-1",
      topicKey: TOPIC,
      subject: "maths",
      correct: true,
      marksScored: 1,
      marksAvailable: 1,
      mode: "mcq",
      timestamp: 1754006400000,
    },
  ],
  topicMasteryByTopic: { [TOPIC]: { level: 2, updatedAt: AT } },
  streak: 3,
  recentActivity: [{ kind: "practice", topicKey: TOPIC, at: AT }],
  badges: [{ id: "first-worksheet", earnedAt: AT }],
  journeyMilestones: [{ id: "milestone-1", label: "Started practising", date: "2026-08-01", icon: "spark" }],
} as unknown as Partial<LearnerProgressSnapshot>;

const ALLOW: Allow = {
  // Every localStorage key these paths are permitted to write. All are
  // uid-SCOPED, never uid-revealing beyond the uid itself.
  storageKeys: [
    "lazytopper.progress.active_uid.v1", //                    sink #23
    `lazytopper.progress.snapshot.v1:${UID}`, //               sink #22 (snapshot)
    `lazytopper.progress.scope.v1:smartLearning:${UID}`, //     sink #22 (scope)
    `lazytopper.progress.scope.v1:practiceInsights:${UID}`, //  sink #22 (scope)
    `lazytopper.progress.scope.v1:topicHubMastery:${UID}:${TOPIC}`, // sink #22
  ],
  // Every object key permitted inside those payloads. All are ACADEMIC
  // progress fields plus the uid — no identity fields.
  //
  // ⚠ `statsByChapter` and `topicMasteryByTopic` are MAPS KEYED BY TOPIC SLUG,
  //   so the slug appears as an object key. Declared explicitly rather than by
  //   a wide `/^[a-z-]+$/` pattern: a loose pattern here would fail OPEN and
  //   wave through a field genuinely named after a person.
  payloadKeys: [
    TOPIC, //                 a topic slug used as a MAP KEY, not a field name
    "uid", //                 THE UID. The only identity-adjacent value here.
    "statsByChapter",
    "attempted",
    "correct",
    "attempts",
    "id",
    "questionId",
    "topicKey",
    "subject",
    "marksScored",
    "marksAvailable",
    "mode",
    "timestamp",
    "topicMasteryByTopic",
    "level",
    "streak",
    "recentActivity",
    "kind",
    "at",
    "badges",
    "earnedAt",
    "journeyMilestones",
    "label",
    "date",
    "icon",
    "updatedAt",
  ],
  // Every primitive value permitted inside those payloads.
  atoms: [
    UID, //     the pseudonymous Firebase uid — the whole point of the guard
    TOPIC,
    "RN-1",
    "attempt-1",
    "maths",
    "mcq",
    "practice",
    "first-worksheet",
    "milestone-1",
    "Started practising",
    "spark",
    "2026-08-01",
    AT,
    ISO, //     generated timestamps (mergeSnapshots' updatedAt)
    /^\d+$/, // counts, marks, epoch ms
    /^(true|false)$/,
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
});

/** The real product sequence: AuthContext sets the active uid on login, then
 *  progress is saved and hydrated into the per-scope mirrors. */
async function driveTheRealProgressPath(): Promise<void> {
  setActiveProgressUser(UID); //                      sink #23
  await saveLearnerProgress(UID, PATCH); //           sink #22 (snapshot)
  await hydrateLocalProgressFromCloud(UID); //        sink #22 (scope mirrors)
}

describe("studentProgressStore — only the uid reaches localStorage", () => {
  it("★ the real progress path writes nothing outside the declared allowlist", async () => {
    await driveTheRealProgressPath();

    // LIVENESS — a guard that never saw a write cannot have checked one.
    expect(writes.length).toBeGreaterThan(0);

    expect(
      audit(writes, ALLOW),
      "A new key or value reached persisted storage. Declare it in ALLOW above, " +
        "deliberately, and confirm it is NOT a direct identifier (email, phone, " +
        "guardian contact, real name). Do not delete this guard to go green.",
    ).toEqual([]);
  });

  it("★ sink #23 stores the uid ALONE — nothing else is in that value", async () => {
    setActiveProgressUser(UID);
    const active = writes.filter((w) => w.key === "lazytopper.progress.active_uid.v1");
    expect(active).toHaveLength(1);
    // The whole persisted value IS the uid. Not "contains" — equals.
    expect(active[0].value).toBe(UID);
    expect(getActiveProgressUser()).toBe(UID);
  });

  it("★ sink #22 was exercised on both the snapshot and the scope mirrors", async () => {
    await driveTheRealProgressPath();
    const keys = new Set(writes.map((w) => w.key));
    expect(keys.has(`lazytopper.progress.snapshot.v1:${UID}`)).toBe(true);
    expect(keys.has(`lazytopper.progress.scope.v1:smartLearning:${UID}`)).toBe(true);
    expect(keys.has(`lazytopper.progress.scope.v1:practiceInsights:${UID}`)).toBe(true);
    expect(keys.has(`lazytopper.progress.scope.v1:topicHubMastery:${UID}:${TOPIC}`)).toBe(true);

    // The uid IS persisted in the snapshot — proving the "and nothing else"
    // claim is about a payload that really carries the tainted value.
    const snap = writes.filter((w) => w.key === `lazytopper.progress.snapshot.v1:${UID}`);
    expect(snap).not.toHaveLength(0);
    expect(JSON.parse(snap[snap.length - 1].value).uid).toBe(UID);
  });

  it("★ NEGATIVE CONTROL — a uid-only run is GREEN (the guard does not fail on everything)", async () => {
    await driveTheRealProgressPath();
    expect(audit(writes, ALLOW)).toEqual([]);
  });

  it("★ CONTROL — the audit CAN fire: email, phone, and a denylist-evading field", () => {
    const key = `lazytopper.progress.snapshot.v1:${UID}`;

    expect(audit([{ key, value: JSON.stringify({ uid: UID, email: "a@b.test" }) }], ALLOW)).toEqual([
      `payload key "email" written to "${key}"`,
      `payload value "a@b.test" written to "${key}"`,
    ]);

    expect(audit([{ key, value: JSON.stringify({ uid: UID, phoneNumber: "+910000000000" }) }], ALLOW)).toEqual([
      `payload key "phoneNumber" written to "${key}"`,
      `payload value "+910000000000" written to "${key}"`,
    ]);

    // ★ THE CASE A DENYLIST WOULD MISS — named neither `email` nor `phone`.
    expect(audit([{ key, value: JSON.stringify({ uid: UID, guardianContact: "+910000000000" }) }], ALLOW)).toEqual([
      `payload key "guardianContact" written to "${key}"`,
      `payload value "+910000000000" written to "${key}"`,
    ]);

    // ★ AND AN ENTIRELY NEW STORAGE KEY.
    expect(audit([{ key: "lazytopper.progress.parentEmail.v1", value: JSON.stringify({ uid: UID }) }], ALLOW)).toEqual([
      'storage key "lazytopper.progress.parentEmail.v1"',
    ]);
  });
});
