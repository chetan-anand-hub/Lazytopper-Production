/**
 * practiceInsights — UID-ONLY PERSISTED-STORAGE GUARD
 * Pins CodeQL alert #16 (`writeAttemptDedup`).
 *
 * ── WHY THIS ALERT IS A FALSE POSITIVE ──────────────────────────────────────
 * `js/clear-text-storage-of-sensitive-data` reports:
 *   "This stores sensitive data returned by a call to
 *    createUserWithEmailAndPassword as clear text."
 * That names the TAINT SOURCE, not the stored value. CodeQL taints the whole
 * `UserCredential` returned in `AuthContext.tsx` and follows every value
 * reachable from it into any `localStorage.setItem`. The only one that reaches
 * this sink is `user.uid`, as the FIRST SEGMENT of a `::`-joined idempotency
 * key (`attemptDedupKey`). A Firebase uid is an opaque pseudonymous
 * identifier, not a credential.
 *
 * ⚠ NOT A DPDP CLAIM. `recordAttempt` also mirrors the attempt itself to the
 * device (that is `STUDENT_DATA_MAP`'s `local-storage` entry, `mechanism:
 * "client-local"`, untouched here). What is pinned is the narrower SECURITY
 * claim the CodeQL rule makes: no credential, no direct identifier.
 *
 * ── WHAT THIS TEST PINS, AND WHY IT IS AN ALLOWLIST ─────────────────────────
 * Drives the REAL front door (`recordAttempt`) and audits EVERY byte that
 * reaches `localStorage` on that path — the dedup ring, the insights blob and
 * the progress mirrors it fans out to — against three ALLOWLISTS: permitted
 * storage keys, payload keys, and `::` segments.
 *
 * An allowlist, not a denylist of `email`/`phone`: a denylist fails OPEN the
 * day someone persists `guardianPhone`. An allowlist fails SAFE — a new key
 * must be DECLARED, which forces a human to look at it.
 *
 * ⚠ IF THIS TEST IS RED ON YOUR BRANCH, THAT IS PROBABLY IT WORKING.
 * Declare the new key/segment below and confirm it carries no direct
 * identifier. Do not delete the guard to go green.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Firestore off; the syllabus resolver stubbed to keep the 10.7 MB data graph
// out of this suite. `studentProgressStore` is deliberately NOT mocked — the
// real scope-key builder and the real progress fan-out are part of what this
// path persists, and therefore part of what must be audited.
vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../data/syllabus/canonicalTopicSlug", () => ({
  resolveCanonicalSlug: (v: string) => v,
  canonicalSlugMatches: (a: string, b: string) => a === b,
}));
vi.mock("./adaptivePracticeEngine", () => ({
  clearWrongAnswer: () => {},
  getWrongConceptsForTopic: () => [],
}));

import { recordAttempt, type RecordAttemptContext } from "./practiceInsights";
import { setActiveProgressUser } from "./studentProgressStore";
import type { AuthUser } from "../context/AuthContext";

// ── the audit kit (kept local so this guard is readable on its own) ──────────
type Rule = string | RegExp;
const permits = (v: string, rules: readonly Rule[]): boolean =>
  rules.some((r) => (typeof r === "string" ? r === v : r.test(v)));

/**
 * Walk a persisted payload, collecting every object KEY and every primitive
 * VALUE. A string carrying the `::` composite delimiter is recorded as its
 * SEGMENTS, so a component appended to an idempotency key is visible as an
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
const QID = "RN-1";
const TOPIC = "real-numbers";
const ATTEMPT_DEDUP_KEY = "lazytopper.attempt.dedup.v1";
const TS = 1754006400000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const USER = { uid: UID, isLocalSession: false } as unknown as AuthUser;

const CONTEXT: RecordAttemptContext = {
  subject: "maths",
  topic: TOPIC,
  topicKey: TOPIC,
  question: "Prove that root 5 is irrational.",
  questionId: QID,
  marksScored: 1,
  marksAvailable: 3,
  mode: "graded",
  difficulty: "Medium",
  timestamp: TS,
};

const ALLOW: Allow = {
  // Every localStorage key this path is permitted to write.
  storageKeys: [
    ATTEMPT_DEDUP_KEY, //                                      sink #16
    `lazytopper.progress.scope.v1:practiceInsights:${UID}`, //  the insights blob
    `lazytopper.progress.snapshot.v1:${UID}`, //                progress fan-out
    "lazytopper.progress.active_uid.v1", //                     set by the harness
  ],
  // Every object key permitted inside those payloads. All are academic attempt
  // fields plus the uid — no identity fields.
  payloadKeys: [
    "uid", //          THE UID. The only identity-adjacent value here.
    "attempts",
    "id",
    "questionId",
    "topicKey",
    "topicName",
    "subject",
    "difficulty",
    "bloomSkill",
    "correct",
    "marksScored",
    "marksAvailable",
    "mode",
    "marksSource",
    "detectionOverride",
    "timestamp",
    "updatedAt",
    // present on the merged progress snapshot, absent from this fixture:
    "statsByChapter",
    "topicMasteryByTopic",
    "streak",
    "recentActivity",
    "badges",
    "journeyMilestones",
  ],
  // Every primitive value / `::` segment permitted.
  atoms: [
    UID, //                  the pseudonymous Firebase uid
    QID,
    TOPIC,
    "maths",
    "graded",
    "Medium",
    /^\d+\/\d+$/, //         the dedup key's score segment
    /^t:[a-z0-9]+$/, //      hashed free-typed question (no questionId)
    // `appendAttempt`'s generated id: `${questionId}-${topicKey}-${base36 now}`.
    // Pinned to THIS fixture's question + topic rather than a loose
    // `/^[\w-]+$/`, which would fail OPEN and wave through arbitrary strings.
    new RegExp(`^${QID}-${TOPIC}-[a-z0-9]+$`),
    ISO,
    /^\d+$/, //              marks, epoch ms
    /^(true|false)$/,
  ],
};

// ── harness ──────────────────────────────────────────────────────────────────
const realSetItem = Storage.prototype.setItem;
let writes: { key: string; value: string }[] = [];

beforeEach(() => {
  window.localStorage.clear();
  setActiveProgressUser(UID); // the app does this on login; scopes the storage key
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

describe("practiceInsights — only the uid reaches localStorage", () => {
  it("★ the real attempt front door writes nothing outside the declared allowlist", () => {
    expect(recordAttempt(USER, CONTEXT)).toBe("recorded");

    // LIVENESS — a guard that never saw a write cannot have checked one.
    expect(writes.length).toBeGreaterThan(0);

    expect(
      audit(writes, ALLOW),
      "A new key or value reached persisted storage. Declare it in ALLOW above, " +
        "deliberately, and confirm it is NOT a direct identifier (email, phone, " +
        "guardian contact, real name). Do not delete this guard to go green.",
    ).toEqual([]);
  });

  it("★ sink #16 was exercised, and its signature is uid + question + score only", () => {
    recordAttempt(USER, CONTEXT);

    const dedup = writes.filter((w) => w.key === ATTEMPT_DEDUP_KEY);
    expect(dedup).not.toHaveLength(0);

    const entries = JSON.parse(dedup[dedup.length - 1].value) as string[];
    expect(entries).toHaveLength(1);

    const segments = entries[0].split("::");
    // The uid IS persisted — this is the value CodeQL is complaining about.
    expect(segments[0]).toBe(UID);
    expect(segments[1]).toBe(QID);
    expect(segments[2]).toBe("1/3");
    expect(segments).toHaveLength(3);
  });

  it("★ NEGATIVE CONTROL — a uid-only run is GREEN (the guard does not fail on everything)", () => {
    recordAttempt(USER, CONTEXT);
    expect(audit(writes, ALLOW)).toEqual([]);
  });

  it("★ CONTROL — the audit CAN fire: email, phone, and a denylist-evading field", () => {
    const blob = `lazytopper.progress.scope.v1:practiceInsights:${UID}`;

    expect(audit([{ key: blob, value: JSON.stringify({ attempts: [{ id: `${QID}-${TOPIC}-abc123`,email: "a@b.test" }] }) }], ALLOW)).toEqual([
      `payload key "email" written to "${blob}"`,
      `payload value "a@b.test" written to "${blob}"`,
    ]);

    // An identifier folded into the composite dedup key.
    expect(
      audit([{ key: ATTEMPT_DEDUP_KEY, value: JSON.stringify([`${UID}::${QID}::1/3::+910000000000`]) }], ALLOW),
    ).toEqual([`payload value "+910000000000" written to "${ATTEMPT_DEDUP_KEY}"`]);

    // ★ THE CASE A DENYLIST WOULD MISS — named neither `email` nor `phone`.
    expect(
      audit([{ key: blob, value: JSON.stringify({ attempts: [{ id: `${QID}-${TOPIC}-abc123`,guardianPhone: "+910000000000" }] }) }], ALLOW),
    ).toEqual([
      `payload key "guardianPhone" written to "${blob}"`,
      `payload value "+910000000000" written to "${blob}"`,
    ]);

    // ★ AND AN ENTIRELY NEW STORAGE KEY on this path.
    expect(audit([{ key: "lazytopper.attempt.parentEmail.v1", value: "[]" }], ALLOW)).toEqual([
      'storage key "lazytopper.attempt.parentEmail.v1"',
    ]);
  });
});
