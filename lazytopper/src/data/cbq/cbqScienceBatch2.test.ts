/**
 * cbqScienceBatch2.test.ts — CBQ-1 (C2 PR-3): LazyTopper-generated Science CBQs for Life
 * Processes, Acids, Bases and Salts and Carbon and its Compounds (`*.b1.cbq.ltgen.ts`).
 *
 * ★ WHY (owner rulings 4 + 5, 2026-10-07). Every chapter needs ≥ 100 served CBQs spread across
 * mark values (≈ 30 one-mark incl. assertion–reason, 30 two/three-mark, 30 four-mark case, 10
 * five-mark), Magnetic Effects first (its chooser count unblocks the CBQ ad). A CBQ is a row with
 * `competencyVerified === true` (C1's classification contract). Every row here was blind-solved:
 * an independent solver reproduced each part's answer and marks before the row was written.
 * Provenance, shape and engine-pool reachability are pinned for ALL generated rows by
 * ltGenerated.guard.test.ts; this file pins the batch's counts and spread.
 */

import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import type { CanonicalQuestion } from "../predictionTypes";
import { LIFE_PROCESSES_CBQ_B1_LT_GENERATED } from "../questionBanks/class10/science/life-processes.b1.cbq.ltgen";
import { ACIDS_CBQ_B1_LT_GENERATED } from "../questionBanks/class10/science/acids-bases-and-salts.b1.cbq.ltgen";
import { CARBON_CBQ_B1_LT_GENERATED } from "../questionBanks/class10/science/carbon-and-its-compounds.b1.cbq.ltgen";

const PACKS = [
  { slug: "life-processes", rows: LIFE_PROCESSES_CBQ_B1_LT_GENERATED, chapterFloor: 100 },
  // Acids and Carbon: 76 here + their official tags (C2 PR-1, #976, on trunk) >= 100.
  { slug: "acids-bases-and-salts", rows: ACIDS_CBQ_B1_LT_GENERATED, chapterFloor: 100 },
  { slug: "carbon-and-its-compounds", rows: CARBON_CBQ_B1_LT_GENERATED, chapterFloor: 100 },
] as const;

const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const isCbq = (q: CanonicalQuestion) => q.competencyVerified === true;

describe("CBQ-1 · C2 batch 2 (Life Processes, Acids, Carbon)", () => {
  it("every pack row is served, in its chapter, generated, and a CBQ", () => {
    for (const p of PACKS) {
      for (const q of p.rows) {
        const s = served.get(q.id);
        expect(s, `${q.id} is not served`).toBeTruthy();
        expect(s?.topicKey, q.id).toBe(p.slug);
        expect(s?.origin, q.id).toBe("lt-generated");
        expect(isCbq(s!), q.id).toBe(true);
        expect(q.id, q.id).toMatch(/^LTG-S-[A-Z]+-2\d\d$/);
      }
    }
  });

  it("each chapter serves at least its CBQ floor (all three ≥ 100)", () => {
    for (const p of PACKS) {
      const n = canonicalQuestionBank.filter((q) => q.topicKey === p.slug && isCbq(q)).length;
      expect(n, `${p.slug} served CBQs`).toBeGreaterThanOrEqual(p.chapterFloor);
    }
  });

  it("each pack spreads across every mark value (owner ruling 4 shape, scaled to the pack)", () => {
    for (const p of PACKS) {
      const n = (f: (q: CanonicalQuestion) => boolean) => p.rows.filter(f).length;
      const total = p.rows.length;
      expect(n((q) => q.marks === 1) / total, `${p.slug} 1-mark share`).toBeGreaterThanOrEqual(0.25);
      expect(n((q) => q.format === "Assertion-Reasoning"), `${p.slug} A-R`).toBeGreaterThanOrEqual(8);
      expect(n((q) => q.marks === 2 || q.marks === 3) / total, `${p.slug} 2/3-mark share`).toBeGreaterThanOrEqual(0.25);
      expect(n((q) => q.marks === 4 && q.format === "Case-Based") / total, `${p.slug} case share`).toBeGreaterThanOrEqual(0.2);
      expect(n((q) => q.marks === 5), `${p.slug} 5-mark`).toBeGreaterThanOrEqual(8);
    }
  });

  it("no two batch rows share a question stem, and none repeats a served non-batch row", () => {
    const batch = new Set(PACKS.flatMap((p) => p.rows.map((q) => q.id)));
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const others = new Set(canonicalQuestionBank.filter((q) => !batch.has(q.id)).map((q) => norm(q.questionText)));
    const seen = new Set<string>();
    for (const q of PACKS.flatMap((p) => p.rows)) {
      const t = norm(q.questionText);
      expect(seen.has(t), `${q.id} duplicates another batch stem`).toBe(false);
      expect(others.has(t), `${q.id} duplicates a served row`).toBe(false);
      seen.add(t);
    }
  });
});

describe("CBQ-1 · C2 batch 2 · MCQ answer positions", () => {
  // Options render A–D in listed order (no shuffle), so a pack must not key most MCQs at one letter.
  it("each pack keys its MCQs evenly across A–D", () => {
    for (const p of PACKS) {
      const mcq = p.rows.filter((q) => q.format === "MCQ");
      const at = [0, 1, 2, 3].map((i) => mcq.filter((q) => q.options?.indexOf(q.answer ?? "") === i).length);
      expect(Math.max(...at) - Math.min(...at), `${p.slug} ${at.join("/")}`).toBeLessThanOrEqual(1);
    }
  });
});
