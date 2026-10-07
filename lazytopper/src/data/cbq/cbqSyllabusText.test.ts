/**
 * cbqSyllabusText.test.ts — CBQ-1 (C2): the FULL TEXT of every LazyTopper-generated Science CBQ stays
 * inside the CBSE 2026-27 syllabus.
 *
 * ★ WHY. The root syllabus guard (scripts/src/syllabusGuard.ts) checks a served row's SUBTOPIC LABEL, so a
 * row filed under an IN label can still teach OUT content: LTG-S-CARB-224 / -231 / -236 shipped asking for
 * the IUPAC name of a carboxylic acid (owner ruling R6: naming carboxylic acids is OUT) under the labels
 * "Functional Groups" / "Nomenclature". This test reads the question, options, answer and steps.
 * IN and deliberately NOT matched: ethanoic acid (properties and uses), methanoic acid in an ant sting,
 * "homologous series" (Carbon), corrosion (Metals).
 */

import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import type { CanonicalQuestion } from "../predictionTypes";

// Per chapter: phrases that only appear when a row teaches 2026-27 OUT / formative-only content.
const OUT_TEXT: Record<string, RegExp> = {
  "chemical-reactions-and-equations": /\brancid|antioxidant|flushed with nitrogen/i, // R5 rancidity
  "carbon-and-its-compounds": /\b(propanoic|butanoic|pentanoic|hexanoic)\b|-oic acid/i, // R6 naming carboxylic acids
  "light-reflection-and-refraction": /total internal reflection|critical angle|lens.?maker|apparent depth/i,
  "human-eye-and-colourful-world": /colour of the sun at (sunrise|sunset)|reddening of the sun|total internal reflection|critical angle/i,
  heredity: /natural selection|speciation|fossil|homologous organ|analogous organ|theory of evolution/i,
  "magnetic-effects-of-electric-current": /electric motor|electromagnetic induction|electric generator|fleming'?s right/i,
};

const text = (q: CanonicalQuestion) =>
  [q.questionText, q.answer, q.finalAnswer, ...(q.solutionSteps ?? []), ...(q.options ?? [])].join("\n");

describe("CBQ-1 · generated Science CBQs: full text inside the 2026-27 syllabus", () => {
  const rows = canonicalQuestionBank.filter((q) => q.subject === "Science" && q.origin === "lt-generated" && isCbq(q));

  it("there are generated Science CBQs to check (control: the filter is not empty)", () => {
    expect(rows.length).toBeGreaterThan(500);
  });

  it("no generated Science CBQ teaches an OUT topic in its text, whatever its subtopic label", () => {
    const bad = rows.filter((q) => OUT_TEXT[q.topicKey]?.test(text(q))).map((q) => `${q.id} (${q.subtopic})`);
    expect(bad).toEqual([]);
  });

  it("control: each OUT pattern does fire on a sentence that teaches the OUT topic", () => {
    expect(OUT_TEXT["carbon-and-its-compounds"].test("Write the IUPAC name: propanoic acid")).toBe(true);
    expect(OUT_TEXT["carbon-and-its-compounds"].test("Ethanoic acid reacts with sodium hydrogencarbonate")).toBe(false);
    expect(OUT_TEXT["chemical-reactions-and-equations"].test("Chips become rancid when exposed to air")).toBe(true);
  });
});
