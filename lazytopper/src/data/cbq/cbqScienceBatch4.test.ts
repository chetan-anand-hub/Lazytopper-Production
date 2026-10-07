/**
 * cbqScienceBatch4.test.ts — CBQ-1 (C2 PR-5): LazyTopper-generated Science CBQs for Metals and
 * Non-metals, Heredity and The Human Eye and the Colourful World (`*.b1.cbq.ltgen.ts`).
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

import { canonicalQuestionBank, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import type { CanonicalQuestion } from "../predictionTypes";
import { METALS_CBQ_B1_LT_GENERATED } from "../questionBanks/class10/science/metals-and-non-metals.b1.cbq.ltgen";
import { HEREDITY_CBQ_B1_LT_GENERATED } from "../questionBanks/class10/science/heredity.b1.cbq.ltgen";
import { HUMAN_EYE_CBQ_B1_LT_GENERATED } from "../questionBanks/class10/science/human-eye-and-colourful-world.b1.cbq.ltgen";

const PACKS = [
  { slug: "metals-and-non-metals", rows: METALS_CBQ_B1_LT_GENERATED, chapterFloor: 100 },
  // Each: 95 here + its official tags (C2 PR-1, #976, on trunk) >= 100.
  { slug: "heredity", rows: HEREDITY_CBQ_B1_LT_GENERATED, chapterFloor: 100 },
  { slug: "human-eye-and-colourful-world", rows: HUMAN_EYE_CBQ_B1_LT_GENERATED, chapterFloor: 100 },
] as const;

const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
// Owner DEC-12 (2026-10-07): persistence of vision is not in the 2026-27 Human Eye content list → withheld.
const PERSISTENCE_OF_VISION: readonly string[] = ["LTG-S-EYE-202", "LTG-S-EYE-207", "LTG-S-EYE-212", "LTG-S-EYE-215"];
// Owner ruling 2026-10-07 03:07Z (Option B): sex determination capped at 8 CBQs, no 5-mark rows → excess withheld;
// Heredity backfilled with LTG-S-HERED-301..306 (Mendel / expression of traits / variation) to stay >= 100.
const SEX_DETERMINATION_WITHHELD: readonly string[] = [
  "LTG-S-HERED-283", "LTG-S-HERED-286", "LTG-S-HERED-288", "LTG-S-HERED-289", "LTG-S-HERED-291", "LTG-S-HERED-292",
  "LTG-S-HERED-294", "LTG-S-HERED-295", "LTG-S-HERED-297", "LTG-S-HERED-298", "LTG-S-HERED-299",
];
// Owner ruling 10:25Z (cap = A): the cap of 8 covers every GENERATED row, so the two GEN-THIN sex-determination
// rows are withheld too; official CBSE sex-determination questions are not capped. Backfill 307/308 keeps 101.
const GEN_THIN_SEX_DETERMINATION: readonly string[] = ["LTG-S-HERED-102", "LTG-S-HERED-106"];
const WITHHELD_HERE = new Set([...PERSISTENCE_OF_VISION, ...SEX_DETERMINATION_WITHHELD]);
// C1's single classifier (lib/cbq/cbqClassification.ts, #977): isCbq = competencyVerified === true.

describe("CBQ-1 · C2 batch 4 (Metals, Heredity, Human Eye)", () => {
  it("owner DEC-12: the 4 persistence-of-vision rows are withheld (kept in the pack, not served)", () => {
    for (const id of PERSISTENCE_OF_VISION) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(served.has(id), id).toBe(false);
      expect(HUMAN_EYE_CBQ_B1_LT_GENERATED.some((q) => q.id === id), `${id} stays in the pack`).toBe(true);
    }
  });

  it("owner ruling 03:07Z (Option B): sex determination is capped at 8 served CBQs, none 5-mark; the excess is withheld", () => {
    for (const id of SEX_DETERMINATION_WITHHELD) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(served.has(id), id).toBe(false);
      expect(HEREDITY_CBQ_B1_LT_GENERATED.some((q) => q.id === id), `${id} stays in the pack`).toBe(true);
    }
    const sexDet = HEREDITY_CBQ_B1_LT_GENERATED.filter((q) => /^LTG-S-HERED-2(8\d|9\d)$/.test(q.id) && served.has(q.id));
    expect(sexDet.length).toBeLessThanOrEqual(8);
    expect(sexDet.filter((q) => q.marks === 5)).toEqual([]);
    // the backfill keeps Heredity at >= 100 and contains no sex determination
    const backfill = HEREDITY_CBQ_B1_LT_GENERATED.filter((q) => /-3\d\d$/.test(q.id));
    expect(backfill.length).toBe(8);
    for (const q of backfill) expect(/sex determination|X chromosome|Y chromosome|\bXX\b|\bXY\b/i.test(q.questionText), q.id).toBe(false);
  });

  it("owner ruling 10:25Z (cap = A): at most 8 SERVED generated rows on sex determination, across every generated pack", () => {
    for (const id of GEN_THIN_SEX_DETERMINATION) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(served.has(id), id).toBe(false);
    }
    const SEXDET = /sex determination|sex chromosome|\bX chromosome|\bY chromosome|\bXX\b|\bXY\b/i;
    const genSexDet = canonicalQuestionBank.filter(
      (q) => q.origin === "lt-generated" && q.topicKey === "heredity" && SEXDET.test(`${q.subtopic} ${q.questionText}`),
    );
    expect(genSexDet.map((q) => q.id).sort()).toEqual(
      ["LTG-S-HERED-281", "LTG-S-HERED-282", "LTG-S-HERED-284", "LTG-S-HERED-285", "LTG-S-HERED-287", "LTG-S-HERED-290", "LTG-S-HERED-293", "LTG-S-HERED-296"],
    );
    // controls: the pattern fires on sex-determination text and not on "every chromosome"
    expect(SEXDET.test("Sex Determination in Humans")).toBe(true);
    expect(SEXDET.test("a Y chromosome from the father")).toBe(true);
    expect(SEXDET.test("every chromosome in the cell")).toBe(false);
  });

  it("every other pack row is served, in its chapter, generated, and a CBQ", () => {
    for (const p of PACKS) {
      for (const q of p.rows) {
        if (WITHHELD_HERE.has(q.id)) continue;
        const s = served.get(q.id);
        expect(s, `${q.id} is not served`).toBeTruthy();
        expect(s?.topicKey, q.id).toBe(p.slug);
        expect(s?.origin, q.id).toBe("lt-generated");
        expect(isCbq(s!), q.id).toBe(true);
        expect(q.id, q.id).toMatch(/^LTG-S-[A-Z]+-[23]\d\d$/);
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

describe("CBQ-1 · C2 batch 4 · MCQ answer positions", () => {
  // Options render A–D in listed order (no shuffle), so a pack must not key most MCQs at one letter.
  it("each pack keys its MCQs evenly across A–D", () => {
    for (const p of PACKS) {
      const mcq = p.rows.filter((q) => q.format === "MCQ");
      const at = [0, 1, 2, 3].map((i) => mcq.filter((q) => q.options?.indexOf(q.answer ?? "") === i).length);
      expect(Math.max(...at) - Math.min(...at), `${p.slug} ${at.join("/")}`).toBeLessThanOrEqual(1);
    }
  });
});
