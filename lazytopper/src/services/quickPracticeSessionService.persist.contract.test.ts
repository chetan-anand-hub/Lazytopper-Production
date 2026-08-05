// @vitest-environment node
//
// ════════════════════════════════════════════════════════════════════════════
// THE REPLACEMENT PROTECTION FOR THE LIFTED `quickPracticeSessionService.ts`
// FORBIDDEN-PATH BAN (Wave 5D lane FORBID-5).
// ════════════════════════════════════════════════════════════════════════════
//
// `quick_practice_overlay_additive_acceptance.mjs` carried
// `lazytopper/src/services/quickPracticeSessionService.ts` in its FORBIDDEN array under
// the comment `// persistQuickPracticeSession`, inside a section headed
// "engine, fetch-filter, persistence, grader, graded-read: zero diff". That entry was
// the file's ENTIRE protection in that gate — nothing else in it asserts one byte of
// this module's behaviour, and the existing `quickPracticeSessionService.test.ts` covers
// only the PURE units (`buildSeenQuestionIds`, `sessionRotationOffset`,
// `buildQuickPracticeResponse`, and `buildQuickPracticeSessionRecord` called directly).
// ★ `persistQuickPracticeSession` — the function the ban's own comment named — had ZERO
// executable coverage repo-wide. This file is that coverage.
//
// ★ WHAT IS PINNED HERE IS WHAT THE BAN WAS BUYING, NOT WHAT THE FILE HAPPENED TO DO
// TODAY. BATCH-1b legitimately EXTENDS this module (batch grading); every assertion below
// is an invariant that extension must not break, never a snapshot of current shape:
//
//   1. ONE graded set → ONE record + ONE payload. Two services (or one service called
//      twice inside a finish) writing the same session surface as DUPLICATED attempts in
//      Mistake Intelligence — the store the tutor reads.
//   2. The payload is BOUND to the record it belongs to. A drifting `ref`/`code`/
//      `worksheetId`/`gradedAt` orphans the graded sheet: "review my answers" opens nothing.
//   3. The doc id is a PURE function of the session's facts, so a re-finish OVERWRITES.
//      No counter, no clock at call time, no `Math.random()`.
//   4. The surface marker is the string `"quick-practice"` on BOTH the record and the
//      payload. Two surface vocabularies exist in this codebase and renaming the marker
//      silently unhooks the graded read.
//   5. Nothing attempted → NO write at all. No fabricated history.
//   6. Signed-out / local session → NO write. (CLAUDE.md §7: no Firestore write without
//      an auth check.)
//   7. A persistence failure is best-effort and NEVER surfaces — and never leaves a
//      record without its payload half-written past the failure point.
//   8. The record carries every DISPLAYED question id while the payload's response stays
//      sparse — attempted-vs-displayed is meaningful and must not be padded.
//
// DELIBERATELY NOT DUPLICATED HERE (covered elsewhere, verified before writing):
//   · the response assembler's honesty rules, the seen-set reader and the identity hash
//     → `quickPracticeSessionService.test.ts`;
//   · `topicSource` staying absent and the record's `fourType` sum
//     → `quickPracticeSessionService.test.ts`;
//   · that this module routes topic keys through `resolveCanonicalSlug` at all
//     → `scripts/ops/topickey_guard_acceptance.mjs` Guard D (token presence only — the
//       multi-topic CANONICALISATION behaviour below is not covered there);
//   · the write functions' own signed-out/local gating → `sessionRecords` suite. What is
//     pinned here is that THIS module refuses to CALL them, which is a different fact:
//     the callee's gate cannot be observed by a caller that never reaches it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CheckSolutionResponse } from "../ai/aiClient";
import type * as SessionRecordsModule from "./sessionRecords";

// ★ TYPED TO THE REAL SIGNATURES on purpose. An untyped `vi.fn()` gives `mock.calls` the type
// `[][]`, so every `calls.at(-1)![1]` read is a TS2493 empty-tuple error — green under
// tsconfig.app.json (which excludes test files) and RED in CI's separate typecheck:test step.
const writeSessionRecord = vi.fn<typeof SessionRecordsModule.writeSessionRecord>(() => "recorded");
const writeSessionPerQuestion = vi.fn<typeof SessionRecordsModule.writeSessionPerQuestion>();

// The REAL builders run (`buildQuickPracticeSessionRecord`, `quickPracticeCode`,
// `stableHash8`) — only the two WRITE seams are spied. Mocking the builders too would
// make every assertion below a test of the mock. `importOriginal` also keeps every other
// export present: `vi.mock` is a COMPLETE replacement and an omitted export throws.
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return { ...actual, writeSessionRecord, writeSessionPerQuestion };
});

// The REAL `quickPracticeCode` (the mock spreads `importOriginal`), so the identity
// assertion below compares against the shipped derivation, not a copy of it.
const { quickPracticeCode } = await import("./sessionRecords");
const { persistQuickPracticeSession } = await import("./quickPracticeSessionService");
type PersistArgs = Parameters<typeof persistQuickPracticeSession>[0];
type Entry = PersistArgs["entries"][number];

const USER = { uid: "u-real", isLocalSession: false } as unknown as PersistArgs["user"];

const graded = (over: Partial<CheckSolutionResponse> = {}): CheckSolutionResponse =>
  ({
    ok: true,
    totalMarks: 4,
    marksAwarded: 3,
    percentage: 75,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
    ...over,
  }) as CheckSolutionResponse;

const ENTRIES: Entry[] = [
  { questionId: "bank-1", marks: 4, graded: graded() },
  { questionId: "bank-2", marks: 1, mcq: "correct" },
  { questionId: "bank-3", marks: 3, graded: graded({ totalMarks: 3, marksAwarded: 3, percentage: 100 }) },
];

const ARGS: PersistArgs = {
  user: USER,
  title: "Real Numbers — Quick Practice",
  subject: "maths",
  topicSlug: "real-numbers",
  filterSignature: "medium|3q",
  startedAt: 1_700_000_000_000,
  entries: ENTRIES,
};

const run = (over: Partial<PersistArgs> = {}) => persistQuickPracticeSession({ ...ARGS, ...over });
const lastRecord = () => writeSessionRecord.mock.calls.at(-1)![1];
const lastPayload = () => writeSessionPerQuestion.mock.calls.at(-1)![1];

beforeEach(() => {
  writeSessionRecord.mockReset();
  writeSessionRecord.mockImplementation(() => "recorded");
  writeSessionPerQuestion.mockReset();
});

describe("persistQuickPracticeSession — ONE graded set writes ONE record set", () => {
  // ★ THE DOUBLE-WRITE HAZARD. Two writers on the same session surface as duplicated
  // attempts in Mistake Intelligence. Asserted POSITIVELY (the record that landed is the
  // right one), not merely as "did not throw".
  it("writes EXACTLY one SessionRecord and EXACTLY one perQuestion payload", () => {
    expect(run()).toBe("recorded");
    expect(writeSessionRecord).toHaveBeenCalledTimes(1);
    expect(writeSessionPerQuestion).toHaveBeenCalledTimes(1);
    const record = lastRecord();
    expect(record.id).toBeTruthy();
    expect(record.title).toBe("Real Numbers — Quick Practice");
    expect(record.status).toBe("graded");
    expect(record.questionIds).toEqual(["bank-1", "bank-2", "bank-3"]);
  });

  // ★ The payload half must belong to the record half. A drifting key here does not
  // throw and does not fail any type check — it silently orphans "review my answers".
  it("BINDS the payload to the record — ref, code, worksheetId and gradedAt all agree", () => {
    run();
    const record = lastRecord();
    const payload = lastPayload();
    expect(payload.ref).toBe(record.perQuestionRef);
    expect(payload.code).toBe(record.id);
    expect(payload.worksheetId).toBe(record.worksheetId);
    expect(payload.gradedAt).toBe(record.gradedAt);
  });

  // ★ Idempotence is what makes a re-finish an OVERWRITE rather than a duplicate.
  //
  // ⚠ THE EQUALITY HALF ALONE IS NOT ENOUGH, PROVEN BY MUTATION. Appending `Date.now()`
  // to the derived code passed a two-`run()` equality check 12/12 GREEN — both calls land
  // in the same millisecond, so a clock-contaminated id still compares equal. The
  // assertion that actually holds the invariant is the IDENTITY one below: the doc id IS
  // `quickPracticeCode()` of this session's own facts and nothing else, so no counter,
  // clock or random suffix can hide inside it.
  it("is IDEMPOTENT by doc id — the id IS the derived code, and a re-finish reuses it", () => {
    run();
    const first = lastRecord().id;
    run();
    const second = lastRecord().id;
    expect(writeSessionRecord).toHaveBeenCalledTimes(2);
    expect(second).toBe(first);
    expect(first).toBe(
      quickPracticeCode(ARGS.subject, {
        topicSlug: ARGS.topicSlug,
        filterSignature: ARGS.filterSignature,
        questionIds: ENTRIES.map((e) => e.questionId),
        startedAt: ARGS.startedAt,
      }),
    );
  });

  // ★ THE CONTROL for the assertion above: if the id were a constant (or empty), the
  // idempotence test would pass vacuously. A DIFFERENT set must produce a DIFFERENT id.
  it("CONTROL — a different question set is a different session id (id is not a constant)", () => {
    run();
    const first = lastRecord().id;
    run({ entries: [{ questionId: "bank-9", marks: 2, mcq: "wrong" }] });
    expect(lastRecord().id).not.toBe(first);
  });

  // ★ The marker string, on BOTH halves. Renaming it on one side is the exact shape of
  // the two-surface-vocabularies bug already recorded against this codebase.
  it("stamps the surface marker `quick-practice` on the record AND the payload", () => {
    run();
    expect(lastRecord().surface).toBe("quick-practice");
    expect(lastPayload().surface).toBe("quick-practice");
  });

  // ★ Attempted-vs-displayed. The record keeps every displayed id; the payload's response
  // stays sparse. Padding the response would be the fabrication.
  it("keeps every DISPLAYED id on the record while the payload's response stays sparse", () => {
    run({
      entries: [
        { questionId: "bank-1", marks: 4, graded: graded() },
        { questionId: "bank-2", marks: 4 }, // displayed, never attempted
        { questionId: "bank-3", marks: 1, mcq: "wrong" },
      ],
    });
    const record = lastRecord();
    const payload = lastPayload();
    expect(record.questionIds).toEqual(["bank-1", "bank-2", "bank-3"]);
    expect(payload.response.gradedCount).toBe(2);
    expect(payload.response.results.map((r) => r.qNumber)).toEqual([1, 3]);
    // Never a fabricated zero and never a fake "the grader could not read it".
    expect(payload.response.results.some((r) => r.couldNotRead)).toBe(false);
  });
});

describe("persistQuickPracticeSession — the refusals write NOTHING", () => {
  it("nothing attempted → no record, no payload, `skipped-nothing-attempted`", () => {
    const outcome = run({ entries: [{ questionId: "bank-1", marks: 4 }, { questionId: "bank-2", marks: 4 }] });
    expect(outcome).toBe("skipped-nothing-attempted");
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(writeSessionPerQuestion).not.toHaveBeenCalled();
  });

  it("signed out → no record, no payload, `skipped-no-user`", () => {
    expect(run({ user: null })).toBe("skipped-no-user");
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(writeSessionPerQuestion).not.toHaveBeenCalled();
  });

  it("local session → no record, no payload, `skipped-no-user`", () => {
    expect(run({ user: { uid: "u-local", isLocalSession: true } as unknown as PersistArgs["user"] })).toBe("skipped-no-user");
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(writeSessionPerQuestion).not.toHaveBeenCalled();
  });

  // ★ Best-effort: a persistence miss is invisible to the student and must not throw.
  // It must ALSO not carry on and write an orphan payload for a record that never landed.
  it("a write failure returns `skipped-error`, never throws, and writes no orphan payload", () => {
    writeSessionRecord.mockImplementation(() => {
      throw new Error("firestore unavailable");
    });
    expect(run()).toBe("skipped-error");
    expect(writeSessionPerQuestion).not.toHaveBeenCalled();
  });
});

describe("persistQuickPracticeSession — the multi-topic record carries every real topic", () => {
  it("canonicalises and de-duplicates topicKeys onto the record", () => {
    run({
      topicSlug: "mixed:real-numbers+polynomials",
      topicKeys: ["Real Numbers", "real-numbers", "Polynomials"],
    });
    expect(lastRecord().topicKeys).toEqual(["real-numbers", "polynomials"]);
  });

  // ★ CONTROL — without `topicKeys` the record keeps the BUILDER's single-slug default.
  // Without this, the assertion above could pass while the override ran unconditionally.
  it("CONTROL — single-topic keeps the builder's own single-slug default", () => {
    run();
    expect(lastRecord().topicKeys).toEqual(["real-numbers"]);
  });
});
