// src/services/mistakeIntelligence.contract.test.ts
//
// ★★ THE REPLACEMENT PROTECTION FOR THE LIFTED `mistakeIntelligence.ts` BLANKET BAN
// (owner decision, Wave ME-A lane OPS-LIFT-1). Precedent and shape:
// `SolutionChecker.contract.test.tsx` (FORBID-1) and
// `ResultsScorecard.contract.test.tsx` (FORBID-6) —
// THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
//
// ══════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE PINS, AND WHAT IT DELIBERATELY DOES NOT
// ══════════════════════════════════════════════════════════════════════════════
//
// ⛔ THE MISTAKE THIS FILE EXISTS TO AVOID. FORBID-1's first replacement asserted
// that a CTA was ENABLED. That was true on the day it was written, was unrelated to
// anything the ban was buying, and it BLOCKED A LATER LANE FOUR DAYS ON for a reason
// nobody could act on. A replacement that pins an incidental present-day fact is
// WORSE than no replacement: it reads as protection and points at the wrong thing.
//
// ★ THEREFORE EVERY ASSERTION BELOW PINS THE MI *CONTRACT* — the invariants the
// blanket ban was actually buying — and NOT the current field list, the current
// builder shape, or anything a legitimate additive change to this module would move.
// Concretely, this suite NEVER asserts:
//   · the key set of a `MistakeLogEntry` (an additive field is exactly the change a
//     ban must not forbid — see the MI-CONCEPT-1 arc, whose new `concept`/`questionId`
//     keys must stay legal);
//   · the `RecordMistakeContext` field list;
//   · the dedup storage key's version suffix, or the shape of a dedup signature;
//   · which surfaces call the front door.
// Its `taxonomy identity` and `additive-shape openness` blocks are the positive proof
// of that openness.
//
// THE FIVE THINGS THE BAN WAS BUYING (owner-specified), each mutation-verified:
//   T1  `recordMistake` is the SINGLE WRITER into the mistake log. A second writer is
//       a DOUBLE-WRITE HAZARD into the store the tutor and /me read, and it is the one
//       failure a behavioural test can never catch — you cannot prove a negative
//       existential by calling a function. So T1 scans the tree.
//   T2  The mistake taxonomy is EXACTLY the four types — asserted by IDENTITY, in both
//       directions, never by a count. A count passes while the set is wrong.
//   T3  `marksLost` accounting: the deficit, clamped at zero, coerced from junk.
//   T4  ONE log entry per graded question — never one per mistake, never N.
//   T5  CARELESS MISTAKES NEVER SURFACE AS A TOPIC WEAKNESS. This is the moat: silly
//       and presentation must not reach the weak-area bridge, or a tidy student gets
//       told they do not understand a topic they understand fine.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ══════════════════════════════════════════════════════════════════════════
   MOCKS — the collaborators, so the front door's own policy is what is measured.
   `vi.mock` is a COMPLETE replacement: every value the module under test imports
   from these paths must be provided here.
   ══════════════════════════════════════════════════════════════════════════ */
const logMistakesMock = vi.fn();
const recordWrongAnswerMock = vi.fn();

vi.mock("./mistakeLogService", () => ({
  logMistakes: (...a: unknown[]) => logMistakesMock(...a),
}));
vi.mock("./mistakeInsightsService", () => ({
  // The real predicate only checks `timestamp` is a string and `mistakeCounts` is an
  // object. Held permissive on purpose so the safety gate cannot silently swallow an
  // entry and make a T3/T4 assertion vacuous.
  isSafeEntry: () => true,
}));
vi.mock("./adaptivePracticeEngine", () => ({
  recordWrongAnswer: (...a: unknown[]) => recordWrongAnswerMock(...a),
}));
vi.mock("../data/syllabus/canonicalTopicSlug", () => ({
  // Identity-ish: the bridge only needs a non-empty key. Slug policy is NOT this
  // ban's subject and pinning it here would be the FORBID-1 mistake.
  resolveCanonicalSlug: (t: string) => (t ? String(t).toLowerCase().replace(/\s+/g, "-") : ""),
}));

import { recordMistake, isSavedOutcome } from "./mistakeIntelligence";

/* ══════════════════════════════════════════════════════════════════════════
   FIXTURES
   ══════════════════════════════════════════════════════════════════════════ */
const USER = { uid: "u-contract", isLocalSession: false } as never;

type StepInput = { n: number; type: string | null; deducted: number };

/** Build a graded response. Only the fields the front door reads are populated;
 *  everything else is filled with inert defaults so the shape typechecks. */
function graded(opts: {
  total: number;
  awarded: number;
  steps?: StepInput[];
  summary?: Partial<Record<string, number>>;
  ok?: boolean;
}) {
  const steps = (opts.steps ?? []).map((s) => ({
    stepNumber: s.n,
    description: `step ${s.n}`,
    studentWork: "",
    status: "incorrect",
    marksAwarded: 0,
    marksDeducted: s.deducted,
    teacherAnnotation: "",
    mistakeType: s.type,
    correctedWorking: null,
  }));
  return {
    ok: opts.ok ?? true,
    totalMarks: opts.total,
    marksAwarded: opts.awarded,
    percentage: 0,
    annotatedSteps: steps,
    mistakeSummary: {
      conceptual: 0,
      calculation: 0,
      silly: 0,
      presentation: 0,
      ...(opts.summary ?? {}),
    },
    teacherNote: "",
  } as never;
}

/** A fresh context each call — `question` is part of the dedup signature, so a
 *  unique question is how a test asks for a genuinely new graded item. */
let ctxSeq = 0;
function ctx(over: Record<string, unknown> = {}) {
  ctxSeq += 1;
  return {
    subject: "Maths",
    topic: "Real Numbers",
    question: `Q-${ctxSeq}-${Math.random().toString(36).slice(2)}`,
    ...over,
  } as never;
}

/** The single entry handed to the log store on the Nth `logMistakes` call. */
function loggedEntry(call = 0): Record<string, unknown> {
  return logMistakesMock.mock.calls[call]?.[1] as Record<string, unknown>;
}

beforeEach(() => {
  logMistakesMock.mockReset();
  logMistakesMock.mockResolvedValue(undefined);
  recordWrongAnswerMock.mockReset();
  window.localStorage.clear();
});

/* ══════════════════════════════════════════════════════════════════════════
   T1 · SINGLE WRITER — the double-write hazard the blanket ban really bought.
   ══════════════════════════════════════════════════════════════════════════

   WHY A TREE SCAN AND NOT A BEHAVIOURAL TEST. "Nothing else writes the log" is a
   NEGATIVE EXISTENTIAL over the whole app. Calling `recordMistake` can never
   establish it — the hazard is a module that never goes near the front door. The
   controller model records the exact near-miss this guards: a spec proposed a NEW
   `quickPracticeGradeService.ts` while `quickPracticeSessionService.ts` already
   wrote through the record path, and the corruption would have surfaced as
   duplicated attempts in Mistake Intelligence — the store the tutor reads.

   ★ THE SCANNER IS A PURE FUNCTION AND IT IS FIXTURE-TESTED BELOW. A parser only
   ever run over the real tree can be shown to ACCEPT and never to REJECT, so its
   green is worthless on its own. The fixtures prove it REJECTS each of the four
   ways a second writer could reach `logMistakes`.

   ★ IT IS DELIBERATELY CONSERVATIVE — it does not strip comments, so an import
   statement quoted inside a comment WOULD be counted. That over-detection is the
   FAIL-SAFE direction: it can only ever report more writers than exist (red, and a
   human looks), never fewer (green, and the hazard ships). A comment stripper is
   the opposite trade — one in this repo once silently ate twelve route entries. */

interface SourceFile {
  path: string;
  source: string;
}

interface WriterScan {
  /** Modules declaring `logMistakes` — the store itself. */
  declarations: string[];
  /** Modules binding the `logMistakes` VALUE export by name. These are the writers. */
  namedImporters: string[];
  /** `import * as x from ".../mistakeLogService"` — reaches every export, so it
   *  bypasses a named-specifier scan. */
  namespaceImporters: string[];
  /** `await import(".../mistakeLogService")` / `require(...)` — same bypass, later. */
  dynamicImporters: string[];
  /** `export { logMistakes } from ".../mistakeLogService"` — an ALIAS module, which
   *  would let a writer import the store under a different path entirely. */
  reExporters: string[];
}

const MODULE_TAIL = "[^'\"]*mistakeLogService";

/** True when a `{ a, b as c }` specifier list binds `logMistakes` as a VALUE.
 *  A `type`-only specifier is erased at build time and can write nothing. */
function bindsLogMistakesValue(specifierList: string, wholeClauseIsTypeOnly: boolean): boolean {
  if (wholeClauseIsTypeOnly) return false;
  return specifierList
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((spec) => {
      if (/^type\s+/.test(spec)) return false;
      const imported = spec.split(/\s+as\s+/)[0].trim();
      return imported === "logMistakes";
    });
}

export function scanMistakeLogWriters(files: SourceFile[]): WriterScan {
  const scan: WriterScan = {
    declarations: [],
    namedImporters: [],
    namespaceImporters: [],
    dynamicImporters: [],
    reExporters: [],
  };
  for (const file of files) {
    const src = file.source;

    if (/export\s+(?:async\s+)?function\s+logMistakes\b/.test(src) ||
        /export\s+(?:const|let|var)\s+logMistakes\b/.test(src)) {
      scan.declarations.push(file.path);
    }

    const named = new RegExp(
      `import\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*['"](${MODULE_TAIL})['"]`,
      "g",
    );
    for (const m of src.matchAll(named)) {
      if (bindsLogMistakesValue(m[2], !!m[1])) {
        scan.namedImporters.push(file.path);
        break;
      }
    }

    if (new RegExp(`import\\s+\\*\\s*as\\s+\\w+\\s*from\\s*['"](${MODULE_TAIL})['"]`).test(src)) {
      scan.namespaceImporters.push(file.path);
    }
    if (new RegExp(`\\bimport\\s*\\(\\s*['"](${MODULE_TAIL})['"]`).test(src) ||
        new RegExp(`\\brequire\\s*\\(\\s*['"](${MODULE_TAIL})['"]`).test(src)) {
      scan.dynamicImporters.push(file.path);
    }
    if (new RegExp(`export\\s*\\{[^}]*\\}\\s*from\\s*['"](${MODULE_TAIL})['"]`).test(src)) {
      scan.reExporters.push(file.path);
    }
  }
  return scan;
}

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Every shipped module under `src/` — tests excluded, because a test that mocks or
 *  names the writer is not a writer, and #637-era suites do exactly that. */
function collectShippedSources(dir: string, out: SourceFile[] = []): SourceFile[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectShippedSources(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    out.push({
      path: path.relative(SRC_ROOT, full).split(path.sep).join("/"),
      source: readFileSync(full, "utf8"),
    });
  }
  return out;
}

describe("T1 · recordMistake is the SINGLE writer into the mistake log", () => {
  const files = collectShippedSources(SRC_ROOT);
  const scan = scanMistakeLogWriters(files);

  it("the scan actually inspected a real tree (non-vacuous)", () => {
    // A scanner pointed at an empty list reports a perfectly clean result.
    expect(files.length).toBeGreaterThan(200);
    expect(files.some((f) => f.path === "services/mistakeIntelligence.ts")).toBe(true);
    expect(files.some((f) => f.path === "services/mistakeLogService.ts")).toBe(true);
  });

  it("exactly ONE module writes the log, and it is the MI front door", () => {
    // IDENTITY, not a count — a count of 1 passes while the one is the wrong one.
    expect(scan.namedImporters).toEqual(["services/mistakeIntelligence.ts"]);
  });

  it("the log store is declared in exactly one place", () => {
    expect(scan.declarations).toEqual(["services/mistakeLogService.ts"]);
  });

  it("no module reaches the store by a route that bypasses the named-import scan", () => {
    // Namespace, dynamic and re-export are the three ways to hold `logMistakes`
    // without a named specifier. All three must stay empty or the assertion above
    // is measuring a subset of reality.
    expect(scan.namespaceImporters).toEqual([]);
    expect(scan.dynamicImporters).toEqual([]);
    expect(scan.reExporters).toEqual([]);
  });

  describe("the scanner REJECTS, not merely accepts (fixtures — it is a pure function)", () => {
    it("catches a second writer added as a named import", () => {
      const s = scanMistakeLogWriters([
        { path: "services/newGradeService.ts", source: 'import { logMistakes } from "./mistakeLogService";\nlogMistakes(uid, e);' },
      ]);
      expect(s.namedImporters).toEqual(["services/newGradeService.ts"]);
    });

    it("catches a second writer added under an alias", () => {
      const s = scanMistakeLogWriters([
        { path: "services/x.ts", source: 'import { logMistakes as write } from "../services/mistakeLogService";' },
      ]);
      expect(s.namedImporters).toEqual(["services/x.ts"]);
    });

    it("catches a namespace import, a dynamic import and a re-export", () => {
      expect(scanMistakeLogWriters([
        { path: "a.ts", source: 'import * as log from "./mistakeLogService";' },
      ]).namespaceImporters).toEqual(["a.ts"]);
      expect(scanMistakeLogWriters([
        { path: "b.ts", source: 'const m = await import("../../services/mistakeLogService");' },
      ]).dynamicImporters).toEqual(["b.ts"]);
      expect(scanMistakeLogWriters([
        { path: "c.ts", source: 'export { logMistakes } from "./mistakeLogService";' },
      ]).reExporters).toEqual(["c.ts"]);
    });

    it("does NOT count a reader, a type-only import, or prose that names the writer", () => {
      // The distinction that makes the real-tree assertion meaningful: several
      // modules legitimately import mistakeLogService to READ. AuthContext takes
      // `hydrateMistakeLogsFromCloud`; MeProgressPage and progressStore take
      // `getMistakeLogs`. None of them may be flagged as writers.
      const s = scanMistakeLogWriters([
        { path: "reader.ts", source: 'import { getMistakeLogs, hydrateMistakeLogsFromCloud } from "./mistakeLogService";' },
        { path: "typeonly.ts", source: 'import type { logMistakes } from "./mistakeLogService";' },
        { path: "typespec.ts", source: 'import { type logMistakes, getMistakeLogs } from "./mistakeLogService";' },
        { path: "prose.tsx", source: "// the old `logMistakes` bypass is removed; see logMistakes(user.uid, entry)" },
      ]);
      expect(s.namedImporters).toEqual([]);
      expect(s.declarations).toEqual([]);
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   T2 · THE TAXONOMY IS EXACTLY FOUR — asserted by IDENTITY, both directions.
   ══════════════════════════════════════════════════════════════════════════ */
describe("T2 · the mistake taxonomy is exactly the four types", () => {
  const FOUR = ["calculation", "conceptual", "presentation", "silly"];

  it("the persisted breakdown carries those four keys and no others", async () => {
    await recordMistake(USER, graded({ total: 5, awarded: 2, summary: { conceptual: 1 } }), ctx());
    const counts = loggedEntry().mistakeCounts as Record<string, number>;
    // IDENTITY. `Object.keys(...).length === 4` passes while one of them is
    // "carelessness" — an honest-looking green over a wrong set.
    expect(Object.keys(counts).sort()).toEqual(FOUR);
  });

  it.each(["conceptual", "calculation", "silly", "presentation"])(
    "a step typed %s is counted under exactly that key (the set is not SMALLER)",
    async (type) => {
      await recordMistake(USER, graded({ total: 5, awarded: 4, steps: [{ n: 1, type, deducted: 1 }] }), ctx());
      const counts = loggedEntry().mistakeCounts as Record<string, number>;
      expect(counts[type]).toBe(1);
      for (const other of FOUR.filter((t) => t !== type)) expect(counts[other]).toBe(0);
    },
  );

  it("a FIFTH type is admitted nowhere (the set is not LARGER)", async () => {
    await recordMistake(
      USER,
      graded({ total: 5, awarded: 3, steps: [{ n: 1, type: "guesswork", deducted: 2 }] }),
      ctx(),
    );
    const entry = loggedEntry();
    const counts = entry.mistakeCounts as Record<string, number>;
    expect(Object.keys(counts).sort()).toEqual(FOUR);
    expect(Object.values(counts)).toEqual([0, 0, 0, 0]);
    // ...and it does not sneak in through the weak-area bridge either.
    expect(recordWrongAnswerMock).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   T3 · `marksLost` ACCOUNTING.
   ══════════════════════════════════════════════════════════════════════════ */
describe("T3 · marksLost accounting", () => {
  it("is the deficit between the total and what was awarded", async () => {
    await recordMistake(USER, graded({ total: 5, awarded: 2 }), ctx());
    expect(loggedEntry().marksLost).toBe(3);
    expect(loggedEntry().totalMarks).toBe(5);
  });

  it("is CLAMPED AT ZERO — an over-award never becomes negative marks lost", async () => {
    // A negative would propagate into every /me and hotspot aggregate as a CREDIT,
    // silently cancelling real mark loss on another entry.
    await recordMistake(
      USER,
      graded({ total: 3, awarded: 5, steps: [{ n: 1, type: "silly", deducted: 1 }] }),
      ctx(),
    );
    expect(loggedEntry().marksLost).toBe(0);
  });

  it("coerces a junk score to zero rather than persisting NaN", async () => {
    const junk = graded({ total: 4, awarded: 1, steps: [{ n: 1, type: "conceptual", deducted: 1 }] }) as unknown as Record<string, unknown>;
    junk.totalMarks = "not-a-number";
    junk.marksAwarded = null;
    await recordMistake(USER, junk as never, ctx());
    expect(loggedEntry().marksLost).toBe(0);
    expect(loggedEntry().totalMarks).toBe(0);
    expect(Number.isNaN(loggedEntry().marksLost)).toBe(false);
  });

  it("logs a full-marks answer that still carries a typed step (mark loss is not the only signal)", async () => {
    const r = await recordMistake(
      USER,
      graded({ total: 4, awarded: 4, steps: [{ n: 1, type: "presentation", deducted: 0 }] }),
      ctx(),
    );
    expect(r.outcome).toBe("logged");
    expect(loggedEntry().marksLost).toBe(0);
  });

  it("a clean full-marks answer with no typed step is not logged at all", async () => {
    const r = await recordMistake(USER, graded({ total: 4, awarded: 4 }), ctx());
    expect(r.outcome).toBe("skipped-clean");
    expect(logMistakesMock).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   T4 · ONE ENTRY PER GRADED QUESTION — never one per mistake, never N.
   ══════════════════════════════════════════════════════════════════════════ */
describe("T4 · one entry per graded question", () => {
  const MANY = graded({
    total: 10,
    awarded: 1,
    summary: { conceptual: 2, calculation: 3, silly: 1, presentation: 1 },
    steps: [
      { n: 1, type: "conceptual", deducted: 2 },
      { n: 2, type: "calculation", deducted: 3 },
      { n: 3, type: "silly", deducted: 1 },
      { n: 4, type: "presentation", deducted: 1 },
    ],
  });

  it("seven mistakes across four steps still produce exactly ONE log write", async () => {
    await recordMistake(USER, MANY, ctx({ questionId: "bank-q-1" }));
    expect(logMistakesMock).toHaveBeenCalledTimes(1);
    // ...and ONE entry object, not an array of per-mistake entries.
    expect(Array.isArray(logMistakesMock.mock.calls[0][1])).toBe(false);
    const counts = loggedEntry().mistakeCounts as Record<string, number>;
    expect(counts.conceptual + counts.calculation + counts.silly + counts.presentation).toBe(7);
    // The per-step breakdown rides INSIDE the one entry — that is where N lives.
    expect((loggedEntry().stepDetails as unknown[]).length).toBe(4);
  });

  it("the weak-area bridge fires ONCE per graded check, not once per mistake", async () => {
    await recordMistake(USER, MANY, ctx({ questionId: "bank-q-2" }));
    expect(recordWrongAnswerMock).toHaveBeenCalledTimes(1);
  });

  it("re-recording the SAME graded result adds nothing (cache-restore dedup)", async () => {
    const c = ctx({ questionId: "bank-q-3" });
    const first = await recordMistake(USER, MANY, c);
    const second = await recordMistake(USER, MANY, c);
    expect(first.outcome).toBe("logged");
    expect(second.outcome).toBe("duplicate");
    expect(logMistakesMock).toHaveBeenCalledTimes(1);
    expect(recordWrongAnswerMock).toHaveBeenCalledTimes(1);
    // Both are "saved" to the student — a duplicate is not an error state.
    expect(isSavedOutcome(first.outcome)).toBe(true);
    expect(isSavedOutcome(second.outcome)).toBe(true);
  });

  it("a genuinely DIFFERENT outcome on the same question logs again (dedup is not a lock)", async () => {
    // CONTROL for the test above — without this, dedup could be a permanent
    // one-entry-ever block and the assertion above would still be green.
    const c = ctx({ questionId: "bank-q-4" });
    await recordMistake(USER, MANY, c);
    await recordMistake(
      USER,
      graded({ total: 10, awarded: 7, summary: { calculation: 1 }, steps: [{ n: 1, type: "calculation", deducted: 3 }] }),
      c,
    );
    expect(logMistakesMock).toHaveBeenCalledTimes(2);
  });

  it("a failed log write is NOT marked seen — the retry can still land", async () => {
    const c = ctx({ questionId: "bank-q-5" });
    logMistakesMock.mockRejectedValueOnce(new Error("offline"));
    expect((await recordMistake(USER, MANY, c)).outcome).toBe("error");
    expect((await recordMistake(USER, MANY, c)).outcome).toBe("logged");
    expect(logMistakesMock).toHaveBeenCalledTimes(2);
  });

  it("writes nothing at all for a signed-out or local/browse session", async () => {
    expect((await recordMistake(null, MANY, ctx())).outcome).toBe("skipped-no-user");
    expect((await recordMistake({ uid: "u", isLocalSession: true } as never, MANY, ctx())).outcome)
      .toBe("skipped-local");
    expect(logMistakesMock).not.toHaveBeenCalled();
    expect(recordWrongAnswerMock).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   T5 · CARELESS MISTAKES NEVER SURFACE AS A TOPIC WEAKNESS — THE MOAT.
   ══════════════════════════════════════════════════════════════════════════
   silly + presentation are mark loss on a topic the student UNDERSTANDS. Bridging
   them into the weak-area stream would rank that topic as a knowledge gap and send
   the student back to re-learn something they already know. They are surfaced
   separately, as a careless-mark-loss insight. */
describe("T5 · careless mistakes never become a topic weakness", () => {
  it.each([
    ["silly", { silly: 2 }],
    ["presentation", { presentation: 2 }],
  ])("a %s-only mistake is LOGGED but never bridged to weak areas", async (type, summary) => {
    const r = await recordMistake(
      USER,
      graded({ total: 5, awarded: 3, summary, steps: [{ n: 1, type, deducted: 2 }] }),
      ctx({ questionId: `careless-${type}` }),
    );
    expect(r.outcome).toBe("logged");
    expect(r.bridged).toBe(false);
    expect(logMistakesMock).toHaveBeenCalledTimes(1);
    expect(recordWrongAnswerMock).not.toHaveBeenCalled();
  });

  it("silly AND presentation together still do not reach the weak-area stream", async () => {
    const r = await recordMistake(
      USER,
      graded({
        total: 8,
        awarded: 1,
        summary: { silly: 3, presentation: 4 },
        steps: [{ n: 1, type: "silly", deducted: 4 }, { n: 2, type: "presentation", deducted: 3 }],
      }),
      ctx({ questionId: "careless-both" }),
    );
    expect(r.bridged).toBe(false);
    expect(recordWrongAnswerMock).not.toHaveBeenCalled();
  });

  it.each(["conceptual", "calculation"])(
    "CONTROL — a %s mistake DOES bridge (without this the moat could be a dead bridge)",
    async (type) => {
      const r = await recordMistake(
        USER,
        graded({ total: 5, awarded: 2, steps: [{ n: 1, type, deducted: 3 }] }),
        ctx({ topic: "Polynomials", questionId: `gap-${type}` }),
      );
      expect(r.bridged).toBe(true);
      expect(recordWrongAnswerMock).toHaveBeenCalledTimes(1);
    },
  );

  it("a MIXED answer bridges on the knowledge gap, and bridges exactly once", async () => {
    const r = await recordMistake(
      USER,
      graded({
        total: 9,
        awarded: 2,
        summary: { conceptual: 1, silly: 2 },
        steps: [{ n: 1, type: "conceptual", deducted: 4 }, { n: 2, type: "silly", deducted: 3 }],
      }),
      ctx({ questionId: "mixed-1" }),
    );
    expect(r.bridged).toBe(true);
    expect(recordWrongAnswerMock).toHaveBeenCalledTimes(1);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   ADDITIVE-SHAPE OPENNESS — the positive proof that this suite is a CONTRACT
   guard and not a freeze in disguise.
   ══════════════════════════════════════════════════════════════════════════
   ★ This block exists because the lifted ban must not be re-imposed by the back
   door. Lanes are queued that ADD to the persisted entry and to the context (the
   MI-CONCEPT-1 arc adds `concept` and `questionId`; retry/arrival lanes will add
   more). A replacement suite that pinned today's key set would forbid exactly the
   changes this lift exists to permit — the FORBID-1 failure, repeated. */
describe("additive-shape openness — this suite must NOT freeze the entry shape", () => {
  it("asserts named invariants on the entry, never its full key set", async () => {
    await recordMistake(USER, graded({ total: 4, awarded: 1, summary: { conceptual: 1 } }), ctx());
    const entry = loggedEntry();
    for (const required of ["timestamp", "questionText", "topic", "subject", "totalMarks", "marksLost", "mistakeCounts", "stepDetails"]) {
      expect(entry).toHaveProperty(required);
    }
    // An added key is LEGAL. This is the assertion that stays true when a future
    // lane extends the entry, and it is the reason this file cannot become a freeze.
    const extended = { ...entry, someFutureField: "x" };
    for (const required of ["timestamp", "marksLost", "mistakeCounts"]) {
      expect(extended).toHaveProperty(required);
    }
    expect(Object.keys(entry).length).toBeGreaterThanOrEqual(8);
  });

  it("accepts an unknown extra context field without changing any pinned invariant", async () => {
    await recordMistake(
      USER,
      graded({ total: 6, awarded: 2, summary: { calculation: 1 } }),
      ctx({ questionId: "open-1", someFutureContextField: "ignored", difficulty: "Hard" }),
    );
    expect(logMistakesMock).toHaveBeenCalledTimes(1);
    expect(loggedEntry().marksLost).toBe(4);
    expect(Object.keys(loggedEntry().mistakeCounts as object).sort())
      .toEqual(["calculation", "conceptual", "presentation", "silly"]);
  });
});
