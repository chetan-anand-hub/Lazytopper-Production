/**
 * mistakeIntelligence — UID-ONLY PERSISTED-STORAGE GUARD
 * Pins CodeQL alert #15 (`writeDedup`).
 *
 * ── WHY THIS ALERT IS A FALSE POSITIVE ──────────────────────────────────────
 * `js/clear-text-storage-of-sensitive-data` reports:
 *   "This stores sensitive data returned by a call to
 *    createUserWithEmailAndPassword as clear text."
 * That names the TAINT SOURCE, not the stored value. CodeQL taints the whole
 * `UserCredential` returned in `AuthContext.tsx` and follows every value
 * reachable from it into any `localStorage.setItem`. The only one that reaches
 * this sink is `user.uid`, as the FIRST SEGMENT of a `::`-joined dedup
 * signature. A Firebase uid is an opaque pseudonymous identifier, not a
 * credential.
 *
 * ── WHAT THIS TEST PINS, AND WHY IT IS AN ALLOWLIST ─────────────────────────
 * Drives the REAL front door (`recordMistake`) and audits the bytes that reach
 * `localStorage` against three ALLOWLISTS: permitted storage keys, payload
 * keys, and — because this payload is an array of composite STRINGS rather
 * than objects — permitted `::` SEGMENTS.
 *
 * An allowlist, not a denylist of `email`/`phone`: a denylist fails OPEN the
 * day someone folds `guardianPhone` into the signature. Segment-level
 * allowlisting also closes the variant a key-only allowlist would miss, since
 * this payload has no object keys at all.
 *
 * ⚠ IF THIS TEST IS RED ON YOUR BRANCH, THAT IS PROBABLY IT WORKING.
 * `dedupKey()` is a live design surface — adding a component to the signature
 * (a concept, a new score axis) is a legitimate change, and it lands here as
 * an undeclared segment. Declare the new segment below and confirm it carries
 * no direct identifier. Do not delete the guard to go green.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The three collaborators `recordMistake` fans out to, plus the canonical-slug
// resolver (mocked to keep the 10.7 MB syllabus data graph out of this suite).
const logMistakes = vi.fn(async () => {});
const recordWrongAnswer = vi.fn(() => {});
vi.mock("./mistakeLogService", () => ({ logMistakes: (...a: unknown[]) => logMistakes(...(a as [])) }));
vi.mock("./mistakeInsightsService", () => ({ isSafeEntry: () => true }));
vi.mock("./adaptivePracticeEngine", () => ({
  recordWrongAnswer: (...a: unknown[]) => recordWrongAnswer(...(a as [])),
}));
vi.mock("../data/syllabus/canonicalTopicSlug", () => ({
  resolveCanonicalSlug: (v: string) => v,
}));

import { recordMistake, type RecordMistakeContext } from "./mistakeIntelligence";
import type { CheckSolutionResponse } from "../ai/aiClient";
import type { AuthUser } from "../context/AuthContext";

// ── the audit kit (kept local so this guard is readable on its own) ──────────
type Rule = string | RegExp;
const permits = (v: string, rules: readonly Rule[]): boolean =>
  rules.some((r) => (typeof r === "string" ? r === v : r.test(v)));

/**
 * Walk a persisted payload, collecting every object KEY and every primitive
 * VALUE. A string carrying the `::` composite delimiter is recorded as its
 * SEGMENTS — that is what makes this guard able to see a new component
 * appended to a dedup signature instead of it hiding inside one long string.
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
      if (!permits(a, allow.atoms)) undeclared.push(`payload segment "${a}" written to "${w.key}"`);
    }
  }
  return undeclared;
}

// ── the declared surface ─────────────────────────────────────────────────────
const UID = "uid-sentinel-9f3c4b";
const QID = "RN-1";
const DEDUP_KEY = "lazytopper.mi.dedup.v1";

const USER = { uid: UID, isLocalSession: false } as unknown as AuthUser;

const CONTEXT: RecordMistakeContext = {
  subject: "Maths",
  topic: "Real Numbers",
  topicKey: "real-numbers",
  question: "Prove that root 5 is irrational.",
  questionId: QID,
  difficulty: "Medium",
};

const GRADE: CheckSolutionResponse = {
  ok: true,
  marksAwarded: 1,
  totalMarks: 3,
  annotatedSteps: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }],
} as unknown as CheckSolutionResponse;

const ALLOW: Allow = {
  // The ONLY localStorage key this path is permitted to write.
  storageKeys: [DEDUP_KEY],
  // The payload is a JSON array of STRINGS — there are no object keys at all.
  // Declared empty on purpose: introducing an object here is itself a change
  // that must be looked at.
  payloadKeys: [],
  // Every `::` segment permitted in a dedup signature. Mirrors `dedupKey()`:
  //   [uid, questionId, "<awarded>/<total>", "<c>-<c>-<c>-<c>"].join("::")
  atoms: [
    UID, //                      segment 1 — the pseudonymous Firebase uid
    QID, //                      segment 2 — a question id
    /^t:[a-z0-9]+$/, //          segment 2 variant — hashed free-typed question
    /^\d+\/\d+$/, //             segment 3 — marksAwarded / totalMarks
    /^\d+-\d+-\d+-\d+$/, //      segment 4 — the reconciled four-type counts
  ],
};

// ── harness ──────────────────────────────────────────────────────────────────
const realSetItem = Storage.prototype.setItem;
let writes: { key: string; value: string }[] = [];

beforeEach(() => {
  window.localStorage.clear();
  writes = [];
  logMistakes.mockClear();
  recordWrongAnswer.mockClear();
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

describe("mistakeIntelligence — only the uid reaches localStorage", () => {
  it("★ the real grading front door writes nothing outside the declared allowlist", async () => {
    const result = await recordMistake(USER, GRADE, CONTEXT);
    expect(result.outcome).toBe("logged");

    // LIVENESS — a guard that never saw a write cannot have checked one.
    expect(writes.length).toBeGreaterThan(0);

    expect(
      audit(writes, ALLOW),
      "A new segment or key reached persisted storage. Declare it in ALLOW " +
        "above, deliberately, and confirm it is NOT a direct identifier (email, " +
        "phone, guardian contact, real name). Do not delete this guard to go green.",
    ).toEqual([]);
  });

  it("★ the persisted signature carries the uid and exactly the declared components", async () => {
    await recordMistake(USER, GRADE, CONTEXT);

    const dedup = writes.filter((w) => w.key === DEDUP_KEY);
    expect(dedup).not.toHaveLength(0);

    const entries = JSON.parse(dedup[dedup.length - 1].value) as string[];
    expect(entries).toHaveLength(1);

    const segments = entries[0].split("::");
    // The uid IS persisted — this is the value CodeQL is complaining about.
    expect(segments[0]).toBe(UID);
    expect(segments[1]).toBe(QID);
    expect(segments[2]).toBe("1/3");
    expect(segments[3]).toBe("1-0-0-0");
  });

  it("★ NEGATIVE CONTROL — a uid-only run is GREEN (the guard does not fail on everything)", async () => {
    await recordMistake(USER, GRADE, CONTEXT);
    expect(audit(writes, ALLOW)).toEqual([]);

    // ...and a free-typed check (no questionId → hashed segment) is ALSO green,
    // so the guard tolerates the legitimate variant rather than only one shape.
    writes = [];
    window.localStorage.clear();
    const { questionId: _drop, ...freeTyped } = CONTEXT;
    await recordMistake(USER, GRADE, freeTyped);
    expect(writes.length).toBeGreaterThan(0);
    expect(audit(writes, ALLOW)).toEqual([]);
  });

  it("★ CONTROL — the audit CAN fire: an identifier folded into the signature", () => {
    // An email appended as a new segment.
    expect(
      audit([{ key: DEDUP_KEY, value: JSON.stringify([`${UID}::${QID}::1/3::1-0-0-0::a@b.test`]) }], ALLOW),
    ).toEqual([`payload segment "a@b.test" written to "${DEDUP_KEY}"`]);

    // A phone number appended as a new segment.
    expect(
      audit([{ key: DEDUP_KEY, value: JSON.stringify([`${UID}::${QID}::1/3::1-0-0-0::+910000000000`]) }], ALLOW),
    ).toEqual([`payload segment "+910000000000" written to "${DEDUP_KEY}"`]);

    // ★ AND THE VARIANT A SEGMENT-BLIND CHECK WOULD MISS — an identifier fused
    //   into an EXISTING segment rather than appended as a new one.
    expect(
      audit([{ key: DEDUP_KEY, value: JSON.stringify([`${UID}|a@b.test::${QID}::1/3::1-0-0-0`]) }], ALLOW),
    ).toEqual([`payload segment "${UID}|a@b.test" written to "${DEDUP_KEY}"`]);

    // ★ AND AN ENTIRELY NEW STORAGE KEY on this path.
    expect(audit([{ key: "lazytopper.mi.guardianPhone.v1", value: "[]" }], ALLOW)).toEqual([
      'storage key "lazytopper.mi.guardianPhone.v1"',
    ]);
  });
});
