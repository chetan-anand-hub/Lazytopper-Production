// src/data/concepts/trackingConcepts.ts
//
// CONCEPT-MAP-FILL-1 — TRACKING CONCEPTS: a SEPARATE, reviewed vocabulary for bank labels whose chapter's
// Exam Trends list has no concept for them (the audit's `concept-gap` labels).
//
// WHY SEPARATE. Every Exam Trends concept carries a student-facing `sharePercent`, and predictions,
// worksheets and blueprints read class10MathTopicTrends / class10ScienceTopicTrends. A concept added
// there would need a share we do not have and would move predictions. So these concepts live HERE:
//   - no share %, never shown on the Exam Trends page, never read by prediction code;
//   - read only through conceptForSubtopic / conceptKindOf (conceptLabelMap.ts), i.e. by the
//     concept rows on Me, the Tutor brief, Weak Area Practice and the Topic Hub concept cards.
//   - the Exam Trends files are NOT edited by this lane.
//
// NAMES follow the CBSE 2026-27 syllabus wording, the NCERT section heading, or the NCERT notes-spec
// section titles (notes/specs/<chapter>.json, "NCERT Reprint 2026-27"); each carries its citation in
// TRACKING_CONCEPT_SOURCES. A chapter has at most 8; a name never repeats an Exam Trends name in the
// same chapter (conceptLabelMap.guard.test.ts asserts both, and that each appears exactly once).

import type { BankChapterSlug } from "../bankChapters/chapterRegistry.generated";

export const TRACKING_CONCEPT_SOURCES: Readonly<
  Record<BankChapterSlug, Readonly<Record<string, string>>>
> = {
  "real-numbers": {},
  "polynomials": {},
  "pair-of-linear-equations": {},
  "quadratic-equations": {},
  "arithmetic-progression": {},
  "triangles": {
    "Right-Triangle Lengths (a² + b² = c² as a tool)":
      "Owner ruling 1 (scripts/src/syllabusGuard.ts:503: Pythagoras used only as a numerical tool is IN); the label is the bank's own",
  },
  "coordinate-geometry": {},
  "trigonometry": {},
  "circles": {},
  "areas-related-to-circles": {},
  "surface-areas-and-volumes": {},
  "statistics": {
    "Empirical Relationship between Mean, Median and Mode":
      "NCERT Mathematics Ch13 Remark p.197 (3 Median = Mode + 2 Mean)",
  },
  "probability": {},
  "chemical-reactions-and-equations": {},
  "acids-bases-and-salts": {
    "Understanding the Chemical Properties of Acids and Bases":
      "NCERT Sc Ch2 s2.1 pp.18-22 (metals Activity 2.3 p.20, neutralisation Activity 2.6 p.21, carbonates p.22)",
    "What All Acids and All Bases Have in Common":
      "NCERT Sc Ch2 s2.2 pp.22-24 (ions in water, conductivity, dilution p.24)",
    "Examples and Uses of Acids and Bases":
      "CBSE Sc (086) 2026-27 Unit 1 'Acids, bases and salts: ... General properties, examples and uses'",
  },
  "metals-and-non-metals": {
    "Physical Properties of Metals and Non-metals":
      "NCERT Sc Ch3 'Physical Properties' pp.37-40 (lustre p.37, malleability/ductility p.38, sonorous p.39)",
    "Chemical Properties of Metals and Non-metals":
      "NCERT Sc Ch3 'Chemical Properties' pp.40-45 (oxygen/amphoteric oxides p.41, water p.43, acids p.44)",
    "Formation and Properties of Ionic Compounds":
      "NCERT Sc Ch3 pp.46-48 (Fig 3.5 p.47); CBSE Sc 2026-27 Unit 1 'formation and properties of ionic compounds'",
    "Basic Metallurgical Processes":
      "CBSE Sc (086) 2026-27 Unit 1 'basic metallurgical processes'; NCERT Sc Ch3 'Occurrence of Metals' pp.49-53 (minerals/ores p.49, roasting/calcination p.51, thermit p.52)",
    "Refining of Metals":
      "NCERT Sc Ch3 'Refining of Metals' pp.53-54 (Fig 3.13 p.53)",
    "Alloys":
      "NCERT Sc Ch3 'Alloys' p.54",
  },
  "carbon-and-its-compounds": {
    "Bonding in Carbon: The Covalent Bond":
      "NCERT Sc Ch4 s4.1 pp.60-62 (covalent bond p.60, Fig 4.5 p.61)",
    "Versatile Nature of Carbon":
      "NCERT Sc Ch4 s4.2 pp.62-64 (catenation p.62)",
    "Saturated and Unsaturated Carbon Compounds":
      "NCERT Sc Ch4 s4.2.1 pp.62-65 (saturated/unsaturated p.62, hydrocarbons p.65)",
    "Chains, Branches and Rings":
      "NCERT Sc Ch4 s4.2.2 pp.64-65 (structural isomers p.65)",
    "Chemical Properties of Carbon Compounds":
      "NCERT Sc Ch4 s4.3 pp.69-71 (combustion, oxidation, addition, substitution)",
    "Soaps and Detergents":
      "NCERT Sc Ch4 s4.5 pp.73-76 (saponification p.73, micelle p.75, detergents p.76)",
  },
  "light-reflection-and-refraction": {
    "Reflection of Light":
      "NCERT Sc Ch9 s9.1 pp.134-135 (laws of reflection p.135)",
  },
  "human-eye-and-colourful-world": {
    "Refraction of Light through a Prism":
      "NCERT Sc Ch10 pp.165-166 (angle of deviation p.166)",
    "Dispersion of White Light by a Glass Prism":
      "NCERT Sc Ch10 p.167 (dispersion, spectrum, Fig 10.5 p.167; rainbow)",
  },
  "electricity": {
    "Electric Current and Circuit":
      "NCERT Sc Ch11 s11.1 pp.171-172 (ampere p.172)",
    "Electric Potential and Potential Difference":
      "NCERT Sc Ch11 s11.2 pp.172-173 (volt, work done to move a charge p.173)",
    "Factors on Which the Resistance of a Conductor Depends":
      "NCERT Sc Ch11 s11.5 pp.178-179 (resistivity p.178)",
  },
  "magnetic-effects-of-electric-current": {
    "Force on a Current-carrying Conductor in a Magnetic Field":
      "NCERT Sc Ch12 pp.201-203 (Fleming's left-hand rule p.203)",
    "Domestic Electric Circuits":
      "NCERT Sc Ch12 pp.204-205 (live/neutral/earth p.204, overloading/short circuit/fuse p.205)",
    "Direct Current and Alternating Current":
      "CBSE Sc (086) 2026-27 Unit 3 'Direct current. Alternating current: frequency of AC. Advantage of AC over DC'; NCERT Sc Ch12 p.206 (AC supply 220 V, 50 Hz)",
  },
  "life-processes": {
    "Transportation in Plants":
      "NCERT Sc Ch5 s5.4.2 pp.94-96 (xylem, phloem p.94; transpiration pull Fig 5.12)",
    "Excretion in Plants":
      "NCERT Sc Ch5 s5.5.2 p.97",
  },
  "control-and-coordination": {
    "Hormones in Animals":
      "NCERT Sc Ch6 'Hormones in Animals' pp.108-111 (adrenaline p.109, thyroxin/insulin p.110, feedback p.111)",
  },
  "how-do-organisms-reproduce": {
    "Do Organisms Create Exact Copies of Themselves?":
      "NCERT Sc Ch7 s7.1 and s7.1.1 'The Importance of Variation' pp.113-115 (DNA copy p.113, variation p.114)",
  },
  "heredity": {
    "Accumulation of Variation during Reproduction":
      "NCERT Sc Ch8 s8.1 pp.128-129",
    "How Traits Get Expressed":
      "NCERT Sc Ch8 s8.2.3 p.131 (genes control characteristics; chromosome p.132)",
  },
  "our-environment": {
    "Ecosystem and Its Components":
      "NCERT Sc Ch13 s13.1 pp.208-209 (producers, consumers, decomposers p.209)",
  },
};

/** Tracking concept names per bank chapter, in NCERT order (the keys of TRACKING_CONCEPT_SOURCES). */
export const TRACKING_CONCEPTS: Readonly<Record<BankChapterSlug, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    Object.entries(TRACKING_CONCEPT_SOURCES).map(([slug, byName]) => [slug, Object.freeze(Object.keys(byName))]),
  ) as Record<BankChapterSlug, readonly string[]>,
);
