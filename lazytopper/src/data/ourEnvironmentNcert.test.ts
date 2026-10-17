/**
 * OUR-ENV-NCERT-1 (2026-10-17) — pins the NCERT Ch 13 Our Environment textbook file
 * (ourEnvironment.ncert.ts, source jesc113.pdf "Reprint 2026-27").
 *
 * - every row is served under the canonical slug and resolves through the generated id index;
 * - the questions are authentic but the worked solutions are authored, so the WHOLE array is in
 *   AI_GENERATED_SOLUTION_IDS (the decouple axis) and in none of the AI-pack question ids;
 * - every row is step-marked: leading [N mark] prefixes (shared `stepMarks` parser) sum to marks;
 * - each MCQ key is exactly one of its options;
 * - Exercise Q1 (non-unique key: (c) and (d) both list only biodegradable items) stays out.
 */
import { describe, it, expect } from "vitest";

import { stepMarks } from "../../scripts/seo/publishability";
import {
  canonicalQuestionBank,
  AI_GENERATED_SOLUTION_IDS,
  AI_GENERATED_QUESTION_IDS,
} from "./canonicalQuestionBank";
import { bankRowMeta } from "./bankChapters/bankIdIndex";
import { OE_TEXTBOOK } from "./questionBanks/class10/science/ourEnvironment.ncert";

describe("OUR-ENV-NCERT-1 · NCERT Ch 13 Our Environment", () => {
  it("holds the 15 in-syllabus textbook questions with well-formed unique ids", () => {
    expect(OE_TEXTBOOK).toHaveLength(15);
    const ids = OE_TEXTBOOK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^OE-NCERT-13-(SA|LA|MCQ)-\d{3}$/);
    expect(OE_TEXTBOOK.filter((q) => q.format === "MCQ")).toHaveLength(2);
  });

  it("every row is served as our-environment and resolves through bankIdIndex", () => {
    const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
    for (const q of OE_TEXTBOOK) {
      expect(q.topicKey).toBe("our-environment");
      expect(served.get(q.id)).toBe(q);
      expect(bankRowMeta(q.id)?.topicKey).toBe("our-environment");
    }
  });

  it("authored solutions are flagged: whole array in AI_GENERATED_SOLUTION_IDS, none an AI-pack question", () => {
    for (const q of OE_TEXTBOOK) {
      expect(AI_GENERATED_SOLUTION_IDS.has(q.id)).toBe(true);
      expect(AI_GENERATED_QUESTION_IDS.has(q.id)).toBe(false);
    }
  });

  it("every row is step-marked with leading [N mark] prefixes that sum to its marks", () => {
    for (const q of OE_TEXTBOOK) {
      const steps = q.solutionSteps ?? [];
      expect(steps.length).toBeGreaterThan(0);
      let total = 0;
      for (const s of steps) {
        expect(s.trimStart().startsWith("[")).toBe(true);
        const m = stepMarks(s);
        expect(m).not.toBeNull();
        total += m ?? 0;
      }
      expect(total).toBe(q.marks);
      expect(q.ncertRef && q.ncertRef.length > 0).toBe(true);
    }
  });

  it("each MCQ key is exactly one of its options; Exercise Q1 is not carried", () => {
    for (const q of OE_TEXTBOOK.filter((r) => r.format === "MCQ")) {
      expect((q.options ?? []).filter((o) => o === q.answer)).toHaveLength(1);
    }
    expect(OE_TEXTBOOK.some((q) => q.ncertRef === "Exercise Q1")).toBe(false);
  });
});
