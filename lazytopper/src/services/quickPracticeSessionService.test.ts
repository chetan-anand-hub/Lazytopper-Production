// @vitest-environment node
//
// Quick Practice session plumbing — the PURE units: the seen-set reader, the session
// identity/idempotency scheme, and the response assembler's honesty rules. The write
// path itself (writeSessionRecord) is exercised by the sessionRecords suite; what is
// pinned here is everything a wrong answer would silently corrupt.

import { describe, it, expect } from "vitest";
import {
  buildQuickPracticeResponse,
  buildSeenQuestionIds,
  sessionRotationOffset,
  type QuickPracticeEntry,
} from "./quickPracticeSessionService";
import { quickPracticeCode, buildQuickPracticeSessionRecord } from "./sessionRecords";
import type { PracticeAttempt } from "./practiceInsights";
import type { CheckSolutionResponse } from "../ai/aiClient";

const attempt = (over: Partial<PracticeAttempt>): PracticeAttempt => ({
  id: "a1",
  questionId: "b1",
  topicKey: "real-numbers",
  subject: "maths",
  difficulty: "Medium",
  correct: true,
  timestamp: 1_700_000_000_000,
  ...over,
} as PracticeAttempt);

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
  } as CheckSolutionResponse);

describe("buildSeenQuestionIds — ONE canonical topic vocabulary", () => {
  it("collects bank ids attempted on the topic", () => {
    const seen = buildSeenQuestionIds(
      [attempt({ questionId: "b1" }), attempt({ questionId: "b2" })],
      "real-numbers",
    );
    expect([...seen].sort()).toEqual(["b1", "b2"]);
  });

  it("matches a LABEL-keyed attempt against a SLUG topic (the mismatch trap)", () => {
    // recordAttempt stores `resolveCanonicalSlug(...) || topicLabel`, so a legacy /
    // unresolved attempt carries a raw human label. Comparing raw strings would match
    // NOTHING and the seen-set would silently be empty forever
    // ([FU-PROG-TOPIC-KEY-MISMATCH]). Both sides must resolve through the ONE authority.
    const seen = buildSeenQuestionIds(
      [attempt({ questionId: "b9", topicKey: "Real Numbers" })],
      "real-numbers",
    );
    expect([...seen]).toEqual(["b9"]);
  });

  it("ignores other topics' attempts — a trig session never sees triangles", () => {
    const seen = buildSeenQuestionIds(
      [attempt({ questionId: "b1", topicKey: "triangles" }), attempt({ questionId: "b2", topicKey: "real-numbers" })],
      "real-numbers",
    );
    expect([...seen]).toEqual(["b2"]);
  });

  it("ignores attempts with no questionId (C&I uploads) and an empty topic", () => {
    expect(buildSeenQuestionIds([attempt({ questionId: "" })], "real-numbers").size).toBe(0);
    expect(buildSeenQuestionIds([attempt({})], "").size).toBe(0);
  });
});

describe("sessionRotationOffset / quickPracticeCode — the session identity", () => {
  const identity = {
    topicSlug: "real-numbers",
    filterSignature: "all|all|all|all|none|10",
    questionIds: ["b1", "b2"],
    startedAt: 1_700_000_000_000,
  };

  it("is DETERMINISTIC — same facts, same id (no clock, no counter, no randomness)", () => {
    expect(quickPracticeCode("maths", identity)).toBe(quickPracticeCode("maths", identity));
    expect(sessionRotationOffset("real-numbers", "f", 1)).toBe(sessionRotationOffset("real-numbers", "f", 1));
  });

  it("IDEMPOTENT: re-finishing the SAME set in the same visit reuses the id (→ overwrite)", () => {
    const again = { ...identity, questionIds: ["b1", "b2"] };
    expect(quickPracticeCode("maths", again)).toBe(quickPracticeCode("maths", identity));
  });

  it("a DIFFERENT set is a different session — filters, questions, or visit each change the id", () => {
    const base = quickPracticeCode("maths", identity);
    expect(quickPracticeCode("maths", { ...identity, filterSignature: "5|all|all|all|none|10" })).not.toBe(base);
    expect(quickPracticeCode("maths", { ...identity, questionIds: ["b1", "b3"] })).not.toBe(base);
    expect(quickPracticeCode("maths", { ...identity, startedAt: identity.startedAt + 1 })).not.toBe(base);
    expect(quickPracticeCode("science", identity)).not.toBe(base);
  });

  it("carries the surface + topic token so the code reads as one family with WS/CT/FM/CI", () => {
    expect(quickPracticeCode("maths", identity)).toMatch(/^QP-M-REAL-[0-9a-f]{8}$/);
    expect(quickPracticeCode("science", { ...identity, topicSlug: "life-processes" })).toMatch(/^QP-S-LIFE-[0-9a-f]{8}$/);
  });
});

describe("buildQuickPracticeResponse — the honesty rules", () => {
  it("OMITS an unattempted question — never a fabricated 0, never a fake couldNotRead", () => {
    const entries: QuickPracticeEntry[] = [
      { questionId: "b1", marks: 4, graded: graded() },
      { questionId: "b2", marks: 3 }, // never attempted
    ];
    const r = buildQuickPracticeResponse(entries);
    expect(r.results).toHaveLength(1);
    expect(r.gradedCount).toBe(1);
    expect(r.results.some((x) => x.couldNotRead)).toBe(false);
    // "attempted vs displayed" is the meaning of the gap — it is not a bug to pad.
    expect(r.totalQuestions).toBe(2);
    // Marks are the GRADED subtotal only: the unreached 3-marker inflates nothing.
    expect(r.gradedMarksTotal).toBe(4);
    expect(r.gradedMarksAwarded).toBe(3);
  });

  it("qNumber indexes the DISPLAYED set, so sparse results still map to questionIds", () => {
    const entries: QuickPracticeEntry[] = [
      { questionId: "b1", marks: 4 },                    // skipped
      { questionId: "b2", marks: 4, graded: graded() },  // attempted — position 2
    ];
    const r = buildQuickPracticeResponse(entries);
    expect(r.results.map((x) => x.qNumber)).toEqual([2]);
  });

  it("a bare MCQ click carries NO working → no steps, no mistakeSummary (D-PROG-2)", () => {
    const r = buildQuickPracticeResponse([{ questionId: "b1", marks: 1, mcq: "wrong" }]);
    expect(r.results[0]).toMatchObject({ qNumber: 1, totalMarks: 1, marksAwarded: 0 });
    // No visible reasoning → nothing to classify. Never an EMPTY summary either: the
    // field is absent, so no reader can mistake it for "zero mistakes of each type".
    expect(r.results[0].mistakeSummary).toBeUndefined();
    expect(r.results[0].annotatedSteps).toBeUndefined();
  });

  it("a CORRECT MCQ scores full marks on its own mark value", () => {
    const r = buildQuickPracticeResponse([{ questionId: "b1", marks: 1, mcq: "correct" }]);
    expect(r.results[0]).toMatchObject({ marksAwarded: 1, totalMarks: 1, percentage: 100 });
  });

  it("written working for an MCQ WINS over the click — the working is real intel", () => {
    // The omission is keyed off the INTERACTION, never off `format === "mcq"`: a
    // student can submit working for an MCQ and that working is genuinely gradable.
    const r = buildQuickPracticeResponse([
      { questionId: "b1", marks: 1, mcq: "wrong", graded: graded({ totalMarks: 1, marksAwarded: 1, percentage: 100 }) },
    ]);
    expect(r.results[0]).toMatchObject({ marksAwarded: 1 });
    expect(r.results[0].mistakeSummary).toBeDefined();
  });

  it("nothing attempted → gradedCount 0 (the caller writes NO record)", () => {
    const r = buildQuickPracticeResponse([{ questionId: "b1", marks: 4 }]);
    expect(r.gradedCount).toBe(0);
    expect(r.results).toHaveLength(0);
  });
});

describe("buildQuickPracticeSessionRecord — the non-counting artifact", () => {
  const base = {
    code: "QP-M-REAL-abc12345",
    title: "Real Numbers · Practice set",
    subject: "maths" as const,
    topicSlug: "real-numbers",
    questionIds: ["b1", "b2"],
    startedAt: 1_700_000_000_000,
    uid: "u1",
  };

  it("is ALWAYS graded — QP has no upload cycle, so it can never hit the Home nudge", () => {
    const rec = buildQuickPracticeSessionRecord({
      ...base,
      response: buildQuickPracticeResponse([
        { questionId: "b1", marks: 4, graded: graded() },
        { questionId: "b2", marks: 4 }, // unattempted → a "partial"-looking session
      ]),
    });
    // getPendingSessions filters ["pending-upload","partial"] and nudges "upload your
    // answer sheet" — which would be a lie for a session with nothing to upload.
    expect(rec.status).toBe("graded");
  });

  it("carries the real bank questionIds (the seen-set) and the canonical topic", () => {
    const rec = buildQuickPracticeSessionRecord({
      ...base,
      response: buildQuickPracticeResponse([{ questionId: "b1", marks: 4, graded: graded() }]),
    });
    expect(rec.questionIds).toEqual(["b1", "b2"]);
    expect(rec.topicKeys).toEqual(["real-numbers"]);
    expect(rec.surface).toBe("quick-practice");
    expect(rec.id).toBe(base.code);
    expect(rec.perQuestionRef).toBe("qp:QP-M-REAL-abc12345");
  });

  it("emits NO topicSource — `bank-matched` stays RESERVED for a real matcher", () => {
    const rec = buildQuickPracticeSessionRecord({
      ...base,
      response: buildQuickPracticeResponse([{ questionId: "b1", marks: 4, graded: graded() }]),
    });
    // topicSource is C&I's PROVENANCE concept (how the AI resolved an uploaded paper's
    // topic). QP's topic is chosen by the student — nothing is inferred, so the honest
    // value is absent ("absent ≠ inferred").
    expect(rec.topicSource).toBeUndefined();
  });

  it("sums fourType from real per-question summaries only", () => {
    const rec = buildQuickPracticeSessionRecord({
      ...base,
      response: buildQuickPracticeResponse([
        { questionId: "b1", marks: 4, graded: graded() },          // conceptual: 1
        { questionId: "b2", marks: 1, mcq: "wrong" },              // no summary → contributes nothing
      ]),
    });
    expect(rec.fourType).toEqual({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
  });
});
