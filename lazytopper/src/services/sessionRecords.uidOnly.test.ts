/**
 * sessionRecords — UID-ONLY PERSISTED-STORAGE GUARD
 * Pins CodeQL alert #21 (`writeLocalSessionRecords`).
 *
 * ── WHY THIS ALERT IS A FALSE POSITIVE ──────────────────────────────────────
 * `js/clear-text-storage-of-sensitive-data` reports:
 *   "This stores sensitive data returned by a call to
 *    createUserWithEmailAndPassword as clear text."
 * That names the TAINT SOURCE, not the stored value. CodeQL taints the whole
 * `UserCredential` returned in `AuthContext.tsx` and follows everything
 * reachable from it. What actually arrives here is `user.uid`, and it is used
 * as the STORAGE KEY (`lazytopper.user.<uid>.sessionRecords.v1`) — the record
 * bodies are graded academic work. A Firebase uid is an opaque pseudonymous
 * identifier, not a credential.
 *
 * ⚠ NOT A DPDP CLAIM. This sink holds a child's real graded work on the
 * device. That is correctly enumerated as `STUDENT_DATA_MAP`'s `local-storage`
 * entry (`mechanism: "client-local"`), and this test does not touch it. What
 * is pinned here is only the narrower SECURITY claim the CodeQL rule makes: no
 * credential and no direct identifier is persisted.
 *
 * ── WHAT THIS TEST PINS, AND WHY IT IS AN ALLOWLIST ─────────────────────────
 * Drives the REAL public writer (`writeSessionRecord`) and audits the bytes
 * that reach `localStorage` against three ALLOWLISTS: permitted storage keys,
 * payload keys, payload values. An allowlist, not a denylist of
 * `email`/`phone`: a denylist fails OPEN the day someone persists
 * `guardianPhone`. An allowlist fails SAFE — a new key must be DECLARED.
 *
 * ⚠ IF THIS TEST IS RED ON YOUR BRANCH, THAT IS PROBABLY IT WORKING.
 * `SessionRecord` gains ADDITIVE OPTIONAL fields by design (`focus`,
 * `topicSource`, `topicCount` are all precedents). When you add the next one,
 * declare it below and confirm it carries no direct identifier. Do not delete
 * the guard to go green.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Firestore off, and no ambient active-uid — the localStorage mirror is the
// surface under test, driven purely by the uid passed to the writer.
vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));

import { writeSessionRecord, loadLocalSessionRecords, type SessionRecord } from "./sessionRecords";

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
const USER = { uid: UID, isLocalSession: false } as never;
const RECORDS_KEY = `lazytopper.user.${UID}.sessionRecords.v1`;

const RECORD: SessionRecord = {
  id: "WS-MA-RN-01",
  worksheetId: "ws-abc",
  surface: "worksheet",
  title: "Real Numbers — Mixed Worksheet",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: ["RN-1", "RN-2"],
  marksAwarded: 4,
  marksTotal: 6,
  status: "graded",
  fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 1754006400000,
  perQuestionRef: "ws-abc:WS-MA-RN-01",
  dedupKey: "ws-abc::graded",
};

const ALLOW: Allow = {
  // The ONLY localStorage key this writer is permitted to touch. The uid is in
  // the KEY — that is the tainted value CodeQL followed, and it is a uid.
  storageKeys: [RECORDS_KEY],
  // Every object key permitted inside a persisted SessionRecord. All are
  // academic/session metadata — no identity fields.
  payloadKeys: [
    "id",
    "worksheetId",
    "surface",
    "title",
    "subject",
    "topicKeys",
    "questionIds",
    "marksAwarded",
    "marksTotal",
    "status",
    "fourType",
    "conceptual",
    "calculation",
    "silly",
    "presentation",
    "sectionBreakdown",
    "gradedAt",
    "perQuestionRef",
    "dedupKey",
    // ADDITIVE OPTIONAL fields already on the type (absent from this fixture,
    // declared so adding one to the fixture does not read as a new leak):
    "focus",
    "topicSource",
    "topicCount",
  ],
  // Every primitive value permitted inside the payload.
  atoms: [
    "WS-MA-RN-01",
    "ws-abc",
    "worksheet",
    "Real Numbers — Mixed Worksheet",
    "maths",
    "real-numbers",
    "RN-1",
    "RN-2",
    "graded",
    "ws-abc:WS-MA-RN-01",
    /^\d+$/, // marks, epoch ms
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

describe("sessionRecords — only the uid reaches localStorage", () => {
  it("★ the real session writer persists nothing outside the declared allowlist", () => {
    expect(writeSessionRecord(USER, RECORD)).toBe("recorded");

    // LIVENESS — a guard that never saw a write cannot have checked one.
    expect(writes.length).toBeGreaterThan(0);

    expect(
      audit(writes, ALLOW),
      "A new key or value reached persisted storage. Declare it in ALLOW above, " +
        "deliberately, and confirm it is NOT a direct identifier (email, phone, " +
        "guardian contact, real name). Do not delete this guard to go green.",
    ).toEqual([]);
  });

  it("★ the uid is the STORAGE KEY and appears nowhere in the record body", () => {
    writeSessionRecord(USER, RECORD);

    const mirror = writes.filter((w) => w.key === RECORDS_KEY);
    expect(mirror).not.toHaveLength(0);

    // The uid scopes the key — this is the tainted value CodeQL followed.
    expect(RECORDS_KEY).toContain(UID);
    // ...and the persisted BODY does not carry it at all.
    expect(mirror[mirror.length - 1].value).not.toContain(UID);

    // The path really ran end-to-end.
    expect(loadLocalSessionRecords(UID).map((r) => r.id)).toEqual(["WS-MA-RN-01"]);
  });

  it("★ NEGATIVE CONTROL — a uid-only run is GREEN (the guard does not fail on everything)", () => {
    writeSessionRecord(USER, RECORD);
    expect(audit(writes, ALLOW)).toEqual([]);
  });

  it("★ CONTROL — the audit CAN fire: email, phone, and a denylist-evading field", () => {
    expect(
      audit([{ key: RECORDS_KEY, value: JSON.stringify([{ id: "WS-MA-RN-01", email: "a@b.test" }]) }], ALLOW),
    ).toEqual([
      `payload key "email" written to "${RECORDS_KEY}"`,
      `payload value "a@b.test" written to "${RECORDS_KEY}"`,
    ]);

    expect(
      audit([{ key: RECORDS_KEY, value: JSON.stringify([{ id: "WS-MA-RN-01", phoneNumber: "+910000000000" }]) }], ALLOW),
    ).toEqual([
      `payload key "phoneNumber" written to "${RECORDS_KEY}"`,
      `payload value "+910000000000" written to "${RECORDS_KEY}"`,
    ]);

    // ★ THE CASE A DENYLIST WOULD MISS — named neither `email` nor `phone`.
    expect(
      audit([{ key: RECORDS_KEY, value: JSON.stringify([{ id: "WS-MA-RN-01", guardianPhone: "+910000000000" }]) }], ALLOW),
    ).toEqual([
      `payload key "guardianPhone" written to "${RECORDS_KEY}"`,
      `payload value "+910000000000" written to "${RECORDS_KEY}"`,
    ]);

    // ★ AND AN ENTIRELY NEW STORAGE KEY.
    expect(audit([{ key: `lazytopper.user.${UID}.parentEmail.v1`, value: "[]" }], ALLOW)).toEqual([
      `storage key "lazytopper.user.${UID}.parentEmail.v1"`,
    ]);
  });
});
