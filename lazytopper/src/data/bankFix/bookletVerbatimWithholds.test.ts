/**
 * BOOKLET-WITHHOLD-1 (owner, 2026-10-07): the 320 Science rows copied verbatim from third-party chapter-wise
 * booklets are withheld (kept in their packs, not served), and no Science chapter's CBQ count changes.
 * Reads no clock.
 */
import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank, RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { BOOKLET_VERBATIM_WITHHELD_IDS } from "./bookletVerbatimWithholds";

const SCIENCE_CHAPTERS = [
  "acids-bases-and-salts", "carbon-and-its-compounds", "chemical-reactions-and-equations", "control-and-coordination",
  "electricity", "heredity", "how-do-organisms-reproduce", "human-eye-and-colourful-world", "life-processes",
  "light-reflection-and-refraction", "magnetic-effects-of-electric-current", "metals-and-non-metals", "our-environment",
] as const;

describe("BOOKLET-WITHHOLD-1 · verbatim third-party booklet rows", () => {
  const raw = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
  const served = new Set(canonicalQuestionBank.map((q) => q.id));

  it("lists exactly 320 distinct chapter-wise Science rows, all in the raw bank", () => {
    expect(BOOKLET_VERBATIM_WITHHELD_IDS.length).toBe(320);
    expect(new Set(BOOKLET_VERBATIM_WITHHELD_IDS).size).toBe(320);
    for (const id of BOOKLET_VERBATIM_WITHHELD_IDS) {
      expect(id, id).toMatch(/^SC[OQ]-S-[A-Z]+-\d{3}$/);
      const q = raw.get(id);
      expect(q, `${id} is not in the raw bank`).toBeDefined();
      expect(q!.subject, id).toBe("Science");
    }
  });

  it("every one is withheld and not served", () => {
    for (const id of BOOKLET_VERBATIM_WITHHELD_IDS) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(served.has(id), id).toBe(false);
    }
  });

  it("none is a CBQ, so the CBQ chooser count of every Science chapter is unchanged and stays >= 100", () => {
    for (const id of BOOKLET_VERBATIM_WITHHELD_IDS) expect(isCbq(raw.get(id)!), id).toBe(false);
    for (const slug of SCIENCE_CHAPTERS) {
      const n = canonicalQuestionBank.filter((q) => q.topicKey === slug && isCbq(q)).length;
      expect(n, `${slug} served CBQs`).toBeGreaterThanOrEqual(100);
    }
  });

  it("CONTROL — a chapter-wise row NOT on the list is still served (the withhold is not the whole pack)", () => {
    const listed = new Set(BOOKLET_VERBATIM_WITHHELD_IDS);
    const others = RAW_CANONICAL_QUESTION_BANK.filter((q) => /^SC[OQ]-S-/.test(q.id) && !listed.has(q.id) && served.has(q.id));
    expect(others.length).toBeGreaterThan(0);
  });
});
