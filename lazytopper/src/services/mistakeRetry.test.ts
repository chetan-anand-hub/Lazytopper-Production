import { describe, it, expect, vi, afterEach } from "vitest";

// RETRY-1 — the classifier behind the mistake log's retry affordance.
//
// This suite runs against the REAL canonical question bank and the REAL HPQ data,
// because the property under test is a property OF THE DATA: whether an id a grading
// surface actually persisted can be served again. A fixture bank would let the suite
// agree with the implementation while both were wrong about the shipped content.
//
// The one exception is the "never looks up a synthetic id" test, which MUST observe a
// call that does not happen — so it, and only it, mocks the index.

import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { highlyProbableQuestions } from "../data/highlyProbableQuestions";
import { isChapterEchoSubtopic } from "./progressBankIndex";
import {
  planMistakeRetry,
  retryCopyFor,
  isSyntheticAttemptId,
  RETRY_COPY,
  SYNTHETIC_ATTEMPT_ID_PREFIXES,
  type MistakeRetryInput,
} from "./mistakeRetry";
import type { MistakeLogEntry } from "./mistakeLogService";

/** Bank rows keyed by id — the LAST row wins, mirroring the index's Map build. */
const lastRowById = new Map<string, { id: string; subtopic: string }>();
for (const q of canonicalQuestionBank) {
  if (!q || typeof q.id !== "string" || !q.id) continue;
  lastRowById.set(q.id, { id: q.id, subtopic: String(q.subtopic ?? "") });
}

/** A real bank row whose subtopic is a USABLE concept (not a chapter echo). */
const REAL_ROW = [...lastRowById.values()].find(
  (r) => r.subtopic && !isChapterEchoSubtopic(r.subtopic),
);

/** A real bank row whose subtopic IS a chapter echo — re-servable, but unlabellable. */
const ECHO_ROW = [...lastRowById.values()].find((r) => isChapterEchoSubtopic(r.subtopic));

/** Every HPQ question id, enumerated — never sampled. */
const HPQ_IDS: string[] = [];
for (const bucket of highlyProbableQuestions) {
  for (const q of bucket.questions ?? []) {
    if (q?.id) HPQ_IDS.push(String(q.id));
  }
}

/** A complete, current-shape entry; override one field per test. */
function entry(over: Partial<MistakeLogEntry> = {}): MistakeLogEntry {
  return {
    id: "e1",
    timestamp: new Date().toISOString(),
    questionText: "Solve for x.",
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 3,
    marksLost: 1,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    ...over,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE INTEGRITY — not a data guard. These assert the fixtures below are real,
// so an empty bank / empty HPQ file can never turn the whole suite into a silent
// pass. Every count is read HERE, at run time, and never carried from a document.
// ─────────────────────────────────────────────────────────────────────────────
describe("fixture integrity", () => {
  it("the real bank, a usable row, a chapter-echo row and the HPQ set all exist", () => {
    expect(canonicalQuestionBank.length).toBeGreaterThan(1000);
    expect(lastRowById.size).toBeGreaterThan(1000);
    expect(REAL_ROW).toBeDefined();
    expect(REAL_ROW!.subtopic.length).toBeGreaterThan(0);
    expect(ECHO_ROW).toBeDefined();
    expect(HPQ_IDS.length).toBeGreaterThan(0);
  });
});

describe("planMistakeRetry — the four outcomes", () => {
  it("a real bank id that resolves → exact, and the copy is 'Re-do that one'", () => {
    const plan = planMistakeRetry(entry({ questionId: REAL_ROW!.id, concept: REAL_ROW!.subtopic }));
    expect(plan.kind).toBe("exact");
    if (plan.kind !== "exact") throw new Error("unreachable");
    expect(plan.bankQuestionId).toBe(REAL_ROW!.id);
    expect(plan.concept).toBe(REAL_ROW!.subtopic);
    expect(plan.marks).toBe(3);
    expect(retryCopyFor(plan)).toBe("Re-do that one");
  });

  // ★ THE HEADLINE FINDING, PINNED. The wave spec asserted HPQ re-serves the exact
  // question. It does not: HPQ ids are not bank rows. If HPQ content is ever merged
  // INTO the bank, this test flips to red and the copy must be revisited — which is
  // exactly the signal we want, not a silent behaviour change.
  it("★ every HPQ id → similar (not exact): HPQ ids are not bank rows", () => {
    const exactOnes: string[] = [];
    let checked = 0;
    for (const id of HPQ_IDS) {
      const plan = planMistakeRetry(entry({ questionId: id, topic: "Real Numbers" }));
      checked += 1;
      if (plan.kind !== "similar" || plan.reason !== "unresolved-question-id") {
        exactOnes.push(`${id} → ${plan.kind}`);
      }
    }
    // Prove the loop actually ran over the whole set rather than zero ids.
    expect(checked).toBe(HPQ_IDS.length);
    expect(checked).toBeGreaterThan(100);
    expect(exactOnes).toEqual([]);
    // And independently: none of them is in the bank at all.
    expect(HPQ_IDS.filter((id) => lastRowById.has(id))).toEqual([]);
  });

  it("an HPQ entry is labelled 'Try one like it'", () => {
    const plan = planMistakeRetry(entry({ questionId: HPQ_IDS[0] }));
    expect(retryCopyFor(plan)).toBe("Try one like it");
  });

  // ★ CONTROL — the entry with no identity renders NOTHING.
  it("★ CONTROL — no questionId → none, and no copy at all", () => {
    const plan = planMistakeRetry(entry({ questionId: undefined }));
    expect(plan).toEqual({ kind: "none", reason: "no-question-id" });
    expect(retryCopyFor(plan)).toBeNull();
  });

  it("★ CONTROL — an empty / whitespace questionId is treated as absent", () => {
    expect(planMistakeRetry(entry({ questionId: "" })).kind).toBe("none");
    expect(planMistakeRetry(entry({ questionId: "   " })).kind).toBe("none");
  });

  // ★ CONTROL — the LEGACY shape. Written before MI-CONCEPT-1 shipped: no concept,
  // no questionId. Tested from the old shape, never from clean current state.
  it("★ CONTROL — a LEGACY entry (no concept, no questionId) → none, without throwing", () => {
    const legacy = {
      id: "legacy-1",
      timestamp: "2026-01-02T03:04:05.000Z",
      questionText: "An old question.",
      topic: "Light",
      subject: "Science",
      totalMarks: 5,
      marksLost: 2,
      mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
      stepDetails: [],
    } as MistakeLogEntry;
    expect("questionId" in legacy).toBe(false);
    expect("concept" in legacy).toBe(false);
    let plan!: ReturnType<typeof planMistakeRetry>;
    expect(() => {
      plan = planMistakeRetry(legacy);
    }).not.toThrow();
    expect(plan).toEqual({ kind: "none", reason: "no-question-id" });
    expect(retryCopyFor(plan)).toBeNull();
  });

  it("never throws on malformed / null input", () => {
    expect(() => planMistakeRetry(null)).not.toThrow();
    expect(() => planMistakeRetry(undefined)).not.toThrow();
    expect(planMistakeRetry(null).kind).toBe("none");
    expect(planMistakeRetry({} as MistakeRetryInput).kind).toBe("none");
    const junk = { questionId: 42, topic: null, totalMarks: "x" } as unknown as MistakeRetryInput;
    expect(() => planMistakeRetry(junk)).not.toThrow();
    expect(planMistakeRetry(junk).kind).toBe("none");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHETIC IDS — enumerated, never sampled.
// ─────────────────────────────────────────────────────────────────────────────
describe("synthetic attempt ids", () => {
  const EXAMPLES: Record<string, string> = {
    "ws:": "ws:ws-abc:q2", // worksheetQuestionId
    "fm:": "fm:fm-abc:q2", // fullMockQuestionId
    "ct:": "ct:ct-abc:q2", // chapterTestQuestionId
    "ci:": "ci:CI-1:q2", // multi-question Check & Improve
  };

  it("★ the prefix set is exactly the four the writers emit", () => {
    expect([...SYNTHETIC_ATTEMPT_ID_PREFIXES]).toEqual(["ws:", "fm:", "ct:", "ci:"]);
    // `qp:` is a SessionRecord id, never a mistake-log questionId. If it were listed
    // here, every Quick Practice entry would be demoted to "Try one like it".
    expect(SYNTHETIC_ATTEMPT_ID_PREFIXES).not.toContain("qp:");
    expect(isSyntheticAttemptId("qp:QP-1:q2")).toBe(false);
  });

  it("★ EVERY synthetic prefix → similar / synthetic-attempt-id, never exact", () => {
    let checked = 0;
    for (const prefix of SYNTHETIC_ATTEMPT_ID_PREFIXES) {
      const id = EXAMPLES[prefix];
      // Fails loudly if a prefix is added without an example, rather than skipping it.
      expect(id, `no example id for prefix ${prefix}`).toBeDefined();
      expect(isSyntheticAttemptId(id)).toBe(true);
      const plan = planMistakeRetry(entry({ questionId: id, concept: "Refraction" }));
      expect(plan.kind, `${id} must not be exact`).toBe("similar");
      if (plan.kind !== "similar") throw new Error("unreachable");
      expect(plan.reason).toBe("synthetic-attempt-id");
      expect(plan.concept).toBe("Refraction");
      expect(retryCopyFor(plan)).toBe("Try one like it");
      checked += 1;
    }
    expect(checked).toBe(SYNTHETIC_ATTEMPT_ID_PREFIXES.length);
    expect(checked).toBe(4);
  });

  it("a `ci:` entry carries no concept — Check & Improve never resolves one", () => {
    const plan = planMistakeRetry(entry({ questionId: "ci:CI-1:q2", concept: undefined }));
    expect(plan.kind).toBe("similar");
    if (plan.kind !== "similar") throw new Error("unreachable");
    expect(plan.concept).toBeNull();
    // The topic is the honest fallback ME-2 renders when there is no concept.
    expect(plan.topic).toBe("Real Numbers");
  });

  it("prefix matching is case-sensitive and anchored at the start", () => {
    expect(isSyntheticAttemptId("WS:ws-abc:q2")).toBe(false);
    expect(isSyntheticAttemptId("x-ws:ws-abc:q2")).toBe(false);
    expect(isSyntheticAttemptId("ws")).toBe(false);
    expect(isSyntheticAttemptId(null)).toBe(false);
    expect(isSyntheticAttemptId(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ★ THE RESOLVER-DIVERGENCE GUARD.
// `conceptForBankQuestionId` suppresses chapter-echo subtopics, so it is NOT an
// existence test. A chapter-echo row is a real bank row and IS exactly re-servable.
// ─────────────────────────────────────────────────────────────────────────────
describe("★ chapter-echo rows are re-servable but unlabellable", () => {
  it("a chapter-echo bank id → exact, with concept null (never the echo label)", () => {
    const plan = planMistakeRetry(entry({ questionId: ECHO_ROW!.id, concept: undefined }));
    expect(isChapterEchoSubtopic(ECHO_ROW!.subtopic)).toBe(true);
    expect(plan.kind, "a chapter-echo row must NOT be demoted to similar").toBe("exact");
    if (plan.kind !== "exact") throw new Error("unreachable");
    expect(plan.bankQuestionId).toBe(ECHO_ROW!.id);
    expect(plan.concept).toBeNull();
    expect(plan.concept).not.toBe(ECHO_ROW!.subtopic);
    expect(retryCopyFor(plan)).toBe("Re-do that one");
  });

  it("the divergence is real across the whole bank, not a one-row curiosity", () => {
    const echoRows = [...lastRowById.values()].filter((r) => isChapterEchoSubtopic(r.subtopic));
    // Read now, never carried: if this ever drops to zero the guard above is vacuous.
    expect(echoRows.length).toBeGreaterThan(0);
    for (const r of echoRows.slice(0, 50)) {
      expect(planMistakeRetry(entry({ questionId: r.id })).kind).toBe("exact");
    }
  });
});

describe("concept back-fill and marks", () => {
  it("a legacy entry WITH a bank id back-fills its concept from the bank", () => {
    const plan = planMistakeRetry(entry({ questionId: REAL_ROW!.id, concept: undefined }));
    expect(plan.kind).toBe("exact");
    if (plan.kind !== "exact") throw new Error("unreachable");
    expect(plan.concept).toBe(REAL_ROW!.subtopic);
  });

  it("a persisted concept is returned VERBATIM and never re-derived", () => {
    const odd = "  Nature of solutions  ";
    const plan = planMistakeRetry(entry({ questionId: REAL_ROW!.id, concept: odd }));
    if (plan.kind !== "exact") throw new Error("unreachable");
    // Trimmed for emptiness detection only — the inner bytes are untouched.
    expect(plan.concept).toBe("Nature of solutions");
  });

  it("marks are the NUMERIC value, and null when unusable", () => {
    /** Marks off a plan that must NOT be the no-affordance kind. */
    const marksFor = (totalMarks: number): number | null => {
      const plan = planMistakeRetry(entry({ questionId: REAL_ROW!.id, totalMarks }));
      if (plan.kind === "none") throw new Error("expected an affordance, got none");
      return plan.marks;
    };
    expect(marksFor(5)).toBe(5);
    // 2 and 3 stay distinguishable — the coarse "23" bucket would fuse them.
    expect(marksFor(2)).toBe(2);
    expect(marksFor(3)).toBe(3);
    expect(marksFor(0)).toBeNull();
    expect(marksFor(NaN)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ★ OBSERVATION, NOT INSPECTION. Proves a synthetic id never reaches the bank
// index — by watching a call that must not happen, rather than by re-reading the
// implementation back to itself.
// ─────────────────────────────────────────────────────────────────────────────
describe("★ a synthetic id never routes to a bank lookup", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("./progressBankIndex");
  });

  async function loadWithSpy() {
    vi.resetModules();
    const lookup = vi.fn(() => null);
    vi.doMock("./progressBankIndex", () => ({
      conceptForQuestionId: lookup,
      isChapterEchoSubtopic: () => false,
      normalizeSection: (s: string) => s,
      __resetProgressBankIndexForTest: () => {},
    }));
    const mod = await import("./mistakeRetry");
    return { lookup, mod };
  }

  it("the index is NOT consulted for any of the four synthetic prefixes", async () => {
    const { lookup, mod } = await loadWithSpy();
    for (const prefix of mod.SYNTHETIC_ATTEMPT_ID_PREFIXES) {
      const plan = mod.planMistakeRetry(entry({ questionId: `${prefix}abc:q1` }));
      expect(plan.kind).toBe("similar");
    }
    expect(lookup).not.toHaveBeenCalled();
  });

  it("the index is NOT consulted when there is no questionId", async () => {
    const { lookup, mod } = await loadWithSpy();
    mod.planMistakeRetry(entry({ questionId: undefined }));
    expect(lookup).not.toHaveBeenCalled();
  });

  // ⭐ THE CONTROL FOR THE TWO ABOVE. Without this, `not.toHaveBeenCalled()` would
  // also pass if the spy were wired to nothing at all.
  it("⭐ CONTROL — the index IS consulted for a non-synthetic id", async () => {
    const { lookup, mod } = await loadWithSpy();
    mod.planMistakeRetry(entry({ questionId: "some-real-looking-id" }));
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("some-real-looking-id");
  });
});

describe("copy contract", () => {
  it("exposes exactly the two strings ME-2 renders", () => {
    expect(RETRY_COPY.exact).toBe("Re-do that one");
    expect(RETRY_COPY.similar).toBe("Try one like it");
  });

  it("retryCopyFor is total over every plan kind", () => {
    expect(retryCopyFor({ kind: "none", reason: "no-question-id" })).toBeNull();
    expect(
      retryCopyFor({
        kind: "similar",
        reason: "unresolved-question-id",
        concept: null,
        topic: "t",
        marks: 1,
      }),
    ).toBe(RETRY_COPY.similar);
    expect(
      retryCopyFor({ kind: "exact", bankQuestionId: "x", concept: null, topic: "t", marks: 1 }),
    ).toBe(RETRY_COPY.exact);
  });
});
