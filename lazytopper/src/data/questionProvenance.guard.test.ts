/**
 * questionProvenance.guard.test.ts — TIERMAP-1 provenance guard.
 *
 * Two optional fields landed on `CanonicalQuestion` (predictionTypes.ts):
 *   questionProvenance?: "transcribed" | "authored"
 *   shapedFrom?: string
 * ABSENT questionProvenance means legacy / unclassified — NOT "authored".
 *
 * What this guard holds, over the ASSEMBLED `canonicalQuestionBank`:
 *   - every "authored" row names its template (`shapedFrom` non-empty),
 *   - every "authored" row's steps are fully marked with a LEADING `[N mark]`
 *     prefix whose values sum exactly to `q.marks` — the mark parser is the
 *     shared `stepMarks` from scripts/seo/publishability.ts (imported, never
 *     copied) so this guard cannot drift from the SEO contract,
 *   - an "authored" row is never also an AI-pack row (authored is not AI pack),
 *   - any `shapedFrom` is either an id present in the bank or a citation
 *     string of at least 12 chars.
 *
 * POSITIVE CONTROLS: synthetic rows exercise the SAME predicate so the sweep
 * over the bank (0 authored rows today) can never be a vacuous green.
 */

import { describe, it, expect } from "vitest";

import { stepMarks } from "../../scripts/seo/publishability";
import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
} from "./canonicalQuestionBank";
import type { CanonicalQuestion } from "./predictionTypes";

export type ProvenanceVerdict = { ok: true } | { ok: false; reason: string };

/** Minimum length for a `shapedFrom` that is a citation rather than a bank id. */
export const MIN_CITATION_LENGTH = 12;

/**
 * Pure predicate. `aiIds` = AI_GENERATED_QUESTION_IDS (authored rows must not be
 * AI-pack rows). `bankIds`, when supplied, lets a `shapedFrom` resolve as a bank
 * id; otherwise it must be a citation string.
 */
export function checkProvenance(
  q: CanonicalQuestion,
  aiIds: ReadonlySet<string>,
  bankIds: ReadonlySet<string> = new Set(),
): ProvenanceVerdict {
  // Any row carrying shapedFrom is held to the shape rule, authored or not.
  if (q.shapedFrom !== undefined) {
    const sf = q.shapedFrom;
    if (typeof sf !== "string" || sf.trim().length === 0) {
      return { ok: false, reason: `shapedFrom-empty: ${q.id}` };
    }
    if (!bankIds.has(sf) && sf.trim().length < MIN_CITATION_LENGTH) {
      return {
        ok: false,
        reason: `shapedFrom-not-id-nor-citation: ${q.id} -> "${sf}"`,
      };
    }
  }

  if (q.questionProvenance !== "authored") return { ok: true };

  // ---- authored rows only from here ----
  if (aiIds.has(q.id)) {
    return { ok: false, reason: `authored-row-is-ai-pack: ${q.id}` };
  }
  if (typeof q.shapedFrom !== "string" || q.shapedFrom.trim().length === 0) {
    return { ok: false, reason: `authored-missing-shapedFrom: ${q.id}` };
  }
  const steps = q.solutionSteps ?? [];
  if (steps.length === 0) {
    return { ok: false, reason: `authored-no-solution-steps: ${q.id}` };
  }
  let total = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const m = stepMarks(step);
    // stepMarks accepts BOTH conventions (leading "[2 marks]" / trailing "[2]").
    // Authored rows are held to the LEADING form: the annotation must open the step.
    if (m === null || !step.trimStart().startsWith("[")) {
      return { ok: false, reason: `authored-unmarked-step: ${q.id} step ${i + 1}` };
    }
    total += m;
  }
  if (Math.abs(total - q.marks) > 1e-9) {
    return {
      ok: false,
      reason: `authored-marks-do-not-sum: ${q.id} ${total} vs ${q.marks}`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Positive controls — synthetic rows through the SAME predicate.
// ---------------------------------------------------------------------------

const AI = AI_GENERATED_QUESTION_IDS;
const BANK_IDS: ReadonlySet<string> = new Set(canonicalQuestionBank.map((q) => q.id));

// A real id from the assembled bank, used as a template reference. Throws if
// the bank is empty — a silently-skipped fixture is a green that asserts nothing.
const TEMPLATE_ID: string = (() => {
  const first = canonicalQuestionBank[0];
  if (!first) throw new Error("canonicalQuestionBank is empty — fixture cannot be built");
  return first.id;
})();

function authoredRow(overrides: Partial<CanonicalQuestion> = {}): CanonicalQuestion {
  return {
    id: "SYN-PROV-AUTHORED-001",
    subject: "Maths",
    topicKey: "synthetic",
    subtopic: "synthetic",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText: "Synthetic authored row for the provenance guard.",
    solutionSteps: [
      "[1 mark] State the formula.",
      "[1 mark] Substitute the given values.",
      "[1 mark] Final answer with unit.",
    ],
    questionProvenance: "authored",
    shapedFrom: TEMPLATE_ID,
    ...overrides,
  };
}

describe("checkProvenance — positive controls (the guard is never vacuous)", () => {
  it("a well-formed authored row passes", () => {
    expect(checkProvenance(authoredRow(), AI, BANK_IDS)).toEqual({ ok: true });
  });

  it("rejects an authored row WITHOUT shapedFrom", () => {
    const v = checkProvenance(authoredRow({ shapedFrom: undefined }), AI, BANK_IDS);
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/authored-missing-shapedFrom/);
  });

  it("rejects an authored row with UNMARKED steps", () => {
    const v = checkProvenance(
      authoredRow({ solutionSteps: ["State the formula.", "[2 marks] Solve."] }),
      AI,
      BANK_IDS,
    );
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/authored-unmarked-step: .* step 1$/);
  });

  it("rejects an authored row whose steps sum to marks - 1", () => {
    const v = checkProvenance(
      authoredRow({ solutionSteps: ["[1 mark] A.", "[1 mark] B."] }), // 2 vs marks 3
      AI,
      BANK_IDS,
    );
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/authored-marks-do-not-sum: .* 2 vs 3/);
  });

  it("rejects an authored row that uses only the TRAILING mark convention", () => {
    const v = checkProvenance(
      authoredRow({ solutionSteps: ["A. [1]", "B. [1]", "C. [1]"] }),
      AI,
      BANK_IDS,
    );
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/authored-unmarked-step/);
  });

  it("rejects an authored row with NO solution steps", () => {
    const v = checkProvenance(authoredRow({ solutionSteps: [] }), AI, BANK_IDS);
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/authored-no-solution-steps/);
  });

  it("rejects an authored row whose id is an AI-pack id (authored is not AI pack)", () => {
    const aiId = AI.values().next().value as string | undefined;
    if (!aiId) throw new Error("AI_GENERATED_QUESTION_IDS is empty — control cannot run");
    const v = checkProvenance(authoredRow({ id: aiId }), AI, BANK_IDS);
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/authored-row-is-ai-pack/);
  });

  it("rejects a shapedFrom that is neither a bank id nor a >= 12-char citation", () => {
    const v = checkProvenance(authoredRow({ shapedFrom: "short-ref" }), AI, BANK_IDS);
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/shapedFrom-not-id-nor-citation/);
  });

  it("accepts a shapedFrom that is a citation string of >= 12 chars", () => {
    const v = checkProvenance(
      authoredRow({ shapedFrom: "CBSE 2023 Board Paper 30/1/1 Q17" }),
      AI,
      BANK_IDS,
    );
    expect(v).toEqual({ ok: true });
  });

  it("a legacy row (no questionProvenance, no shapedFrom) is NOT treated as authored", () => {
    const v = checkProvenance(
      authoredRow({
        questionProvenance: undefined,
        shapedFrom: undefined,
        solutionSteps: ["Unmarked legacy step."],
      }),
      AI,
      BANK_IDS,
    );
    expect(v).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Bank sweep — the assembled `canonicalQuestionBank`.
// ---------------------------------------------------------------------------

describe("questionProvenance — assembled bank sweep", () => {
  it("every questionProvenance value present is one of the two literals", () => {
    const bad = canonicalQuestionBank
      .filter(
        (q) =>
          q.questionProvenance !== undefined &&
          q.questionProvenance !== "transcribed" &&
          q.questionProvenance !== "authored",
      )
      .map((q) => `${q.id}: ${String(q.questionProvenance)}`);
    expect(bad).toEqual([]);
  });

  it("every authored row and every row carrying shapedFrom passes checkProvenance", () => {
    const failures: string[] = [];
    for (const q of canonicalQuestionBank) {
      if (q.questionProvenance !== "authored" && q.shapedFrom === undefined) continue;
      const v = checkProvenance(q, AI, BANK_IDS);
      if (!v.ok) failures.push(v.reason);
    }
    expect(failures).toEqual([]);
  });

  it("reports the authored-row count (expected to GROW; never pinned exactly)", () => {
    const authored = canonicalQuestionBank.filter((q) => q.questionProvenance === "authored");
    // 0 at introduction (2026-09-11). This number is expected to rise as content
    // lanes author rows on authentic templates — assert only that it is a count.
    expect(authored.length).toBeGreaterThanOrEqual(0);
  });
});
