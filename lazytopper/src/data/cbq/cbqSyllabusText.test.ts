/**
 * cbqSyllabusText.test.ts — CBQ-1 (C2): the FULL TEXT of every LazyTopper-generated Science CBQ stays
 * inside the CBSE 2026-27 syllabus.
 *
 * ★ WHY. The root syllabus guard (scripts/src/syllabusGuard.ts) checks a served row's SUBTOPIC LABEL, so a
 * row filed under an IN label can still teach OUT content: LTG-S-CARB-224 / -231 / -236 shipped asking for
 * the IUPAC name of a carboxylic acid (owner ruling R6: naming carboxylic acids is OUT) under the labels
 * "Functional Groups" / "Nomenclature", and a PR-4 Chemical Reactions row taught rancidity (R5) under
 * "Oxidation and Reduction". This test reads the question, options, answer and steps.
 *
 * The guard's own `freeText` phrases are copied VERBATIM below (CLAUDE.md §5: copy the exact banned
 * keywords, never from memory), widened where the guard's phrase list missed real defects, and every
 * pattern carries a CONTROL pair: a sentence that teaches the OUT topic (must fire) and an IN sentence on
 * the same subject (must not fire). IN and deliberately NOT matched: ethanoic acid (properties and uses),
 * methanoic acid in an ant sting, "homologous series" (Carbon), corrosion (Metals), atmospheric refraction
 * timing at sunrise/sunset (Human Eye), variation (Heredity / Reproduction).
 */

import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import type { CanonicalQuestion } from "../predictionTypes";

interface OutPattern {
  readonly name: string;
  /** topicKeys the pattern applies to; "all" = every Science chapter (a whole-chapter OUT topic can stray anywhere). */
  readonly scope: readonly string[] | "all";
  readonly re: RegExp;
  /** CONTROL: teaches the OUT topic — must fire. */
  readonly outExample: string;
  /** CONTROL: IN content on the same subject — must not fire. */
  readonly inExample: string;
}

const DASH = "[-‐‑–—]"; // hyphen, unicode hyphens, en and em dash

const OUT_PATTERNS: readonly OutPattern[] = [
  {
    name: "R5 rancidity",
    scope: "all",
    // guard freeText (verbatim): prevent rancidity · prevention of rancidity · rancidity of food · corrosion and rancidity ·
    // become rancid · rancidity is · rusting and rancidity · rancidity of fats · rancidity or corrosion · rusting rancidity
    re: /\brancid|antioxidant|flushed with nitrogen|nitrogen[- ]flush/i,
    outExample: "Chips are packed in nitrogen so that the oil in them does not become rancid.",
    inExample: "Iron gates rust when exposed to moist air; painting prevents corrosion.",
  },
  {
    name: "R6 naming carboxylic acids",
    scope: "all",
    // guard freeText (verbatim): naming carboxylic acids · oic acid suffix · suffix oic acid
    re: new RegExp(
      `naming carboxylic acids|oic acid suffix|suffix oic acid|${DASH}oic\\b|'oic\\b|(prop|but|pent|hex|hept|oct|non|dec)anoic\\b|propionic|butyric`,
      "i",
    ),
    outExample: "Write the IUPAC name of CH3CH2COOH: propanoic acid.",
    inExample: "Ethanoic acid reacts with sodium hydrogencarbonate; an ant sting contains methanoic acid.",
  },
  {
    name: "Light: beyond-Class-X optics, mirror/lens formula derivation",
    scope: ["light-reflection-and-refraction", "human-eye-and-colourful-world"],
    re: /total internal reflection|critical angle|lens.?maker|apparent depth|deriv(e|ation of) the (mirror|lens) formula/i,
    outExample: "Light travelling from glass to air beyond the critical angle undergoes total internal reflection.",
    inExample: "Use the lens formula 1/v − 1/u = 1/f to find where the image forms.",
  },
  {
    name: "Human Eye: colour of the Sun at sunrise and sunset",
    scope: ["human-eye-and-colourful-world"],
    // guard freeText (verbatim): colour of the sun at sunrise · colour of the sun at sunset · reddening of the sun ·
    // sun appears red at sunrise · sun appears reddish · red colour of the sun
    re: /colour of the sun at (sunrise|sunset)|reddening of the sun|sun appears (red|reddish)|red colour of the sun|sun (looks|appears) (red|reddish|orange)/i,
    outExample: "Explain why the Sun appears reddish at sunrise.",
    inExample: "Atmospheric refraction makes the Sun visible about 2 minutes before it actually rises.",
  },
  {
    name: "Heredity: Evolution (formative only)",
    scope: ["heredity"],
    // guard freeText (verbatim): natural selection · homologous organs · analogous organs
    re: /natural selection|homologous organs?|analogous organs?|speciation|fossil|\bdarwin|acquired (and inherited )?traits?|theory of evolution|\bevolution\b|\bevolve/i,
    outExample: "Explain how natural selection led to the evolution of this beetle population.",
    inExample: "A tall pea plant crossed with a dwarf one gives all tall F1 plants; tallness is dominant.",
  },
  {
    name: "Magnetic Effects: motor, EMI, generator (formative only)",
    scope: ["magnetic-effects-of-electric-current"],
    // guard freeText (verbatim): electromagnetic induction · fleming's right hand rule · electric generator
    re: /electromagnetic induction|fleming'?s right[- ]hand rule|electric generator|electric motor|\b(ac|dc) generator|induced current/i,
    outExample: "In an electric generator, electromagnetic induction produces an induced current.",
    inExample: "Use Fleming's left-hand rule to find the direction of the force on the conductor.",
  },
  {
    name: "Periodic Classification (formative / not in 2026-27 Science)",
    scope: "all",
    re: /periodic table|mendeleev|newlands|d(ö|o)bereiner|periodic classification/i,
    outExample: "Mendeleev arranged the elements in his periodic table by atomic mass.",
    inExample: "Sodium is a metal that reacts vigorously with cold water.",
  },
  {
    name: "Sources of Energy / Management of Natural Resources (not in 2026-27 Science)",
    scope: "all",
    re: /sources of energy|conventional sources|non-conventional|management of natural resources|sustainable management|chipko|rainwater harvesting|\bthree r'?s\b/i,
    outExample: "List two non-conventional sources of energy and the Chipko movement's aim.",
    inExample: "Plastic bags are non-biodegradable, so they remain in the soil for many years.",
  },
];

const text = (q: CanonicalQuestion) =>
  [q.questionText, q.answer, q.finalAnswer, ...(q.solutionSteps ?? []), ...(q.options ?? [])].join("\n");
const applies = (p: OutPattern, topicKey: string) => p.scope === "all" || p.scope.includes(topicKey);

describe("CBQ-1 · generated Science CBQs: full text inside the 2026-27 syllabus", () => {
  const rows = canonicalQuestionBank.filter((q) => q.subject === "Science" && q.origin === "lt-generated" && isCbq(q));

  it("there are generated Science CBQs to check, in every chapter (control: the filter is not empty)", () => {
    expect(rows.length).toBeGreaterThan(1000);
    expect(new Set(rows.map((q) => q.topicKey)).size).toBe(13);
  });

  it("no generated Science CBQ teaches an OUT topic in its text, whatever its subtopic label", () => {
    const bad = rows.flatMap((q) =>
      OUT_PATTERNS.filter((p) => applies(p, q.topicKey) && p.re.test(text(q))).map((p) => `${q.id} (${q.subtopic}): ${p.name}`),
    );
    expect(bad).toEqual([]);
  });

  it("control: every OUT pattern fires on a sentence that teaches its OUT topic, and not on an IN one", () => {
    for (const p of OUT_PATTERNS) {
      expect(p.re.test(p.outExample), `${p.name} must fire on: ${p.outExample}`).toBe(true);
      expect(p.re.test(p.inExample), `${p.name} must NOT fire on: ${p.inExample}`).toBe(false);
    }
  });

  it("control: the carboxylic-acid pattern catches prefixed names and dash variants the guard's phrases miss", () => {
    const r6 = OUT_PATTERNS.find((p) => p.name.startsWith("R6"))!.re;
    for (const s of ["2-methylpropanoic acid", "the –oic acid ending", "butyric acid", "the suffix '-oic'"]) expect(r6.test(s), s).toBe(true);
    for (const s of ["ethanoic acid", "methanoic acid in an ant sting", "sodium ethanoate", "ethyl ethanoate"]) expect(r6.test(s), s).toBe(false);
  });
});
