// src/lib/practice/hpqConceptAliases.ts
//
// QP-CONCEPT-2 (F1) — HPQ "More like this" sends the HPQ question's own `subtopic` as the concept hint.
// The HPQ file was authored with its own labels ("Mirror Formula & Diagrams", "Irrational Numbers
// Proofs", "Combined events"...), which match no concept name and no bank label, so Practice fell back
// to the raw label and served the chapter. This table maps each such HPQ label, per chapter, to the
// EXISTING concept(s) of that chapter (Exam Trends or tracking names from conceptLabelMap.ts, verbatim).
// Hand-mapped from the HPQ question each label belongs to; no concept is invented here. Read only by
// components/practice/conceptHintTiers.ts, after the verbatim and case-insensitive lookups.
//
// `HPQ_NO_BANK_CONCEPT` lists an HPQ label that names NO concept the bank has, with the reason; it is
// served as the raw label (honestly noted on the page). Empty today: every HPQ label resolves.
//
// Guarded by conceptHint.realBank.test.ts: every HPQ entry resolves to a concept (or is listed below),
// and every value here is a concept name of its chapter.

export const HPQ_CONCEPT_ALIASES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "real-numbers": {
    "Irrational Numbers Proofs": ["Irrationality Proofs"],
  },
  "pair-of-linear-equations": {
    // ple-hpq-105 — a pencils-and-pens sales word problem.
    "Application": ["Word & Application Problems"],
    // le-comp-01 — a case-based pens-and-pencils word problem (the HPQ label is the chapter name).
    "Pair of Linear Equations": ["Word & Application Problems"],
    // le-comp-02 — consistent / inconsistent systems (ratios a₁/a₂, b₁/b₂, c₁/c₂).
    "Consistency of System": ["Graphical Solutions/Nature"],
  },
  "trigonometry": {
    "Trig ratios": ["Trig Ratios/Values"],
    "Identities": ["Trig Identities/Proofs"],
    // trig-hpq-103 — how sin / cos values change as the angle grows (values of ratios).
    "Trigonometric functions": ["Trig Ratios/Values"],
  },
  "arithmetic-progression": {
    // math-ap-hpq-1 — identify an AP and its common difference (the bank files "Common Difference" under nth Term).
    // QP-CONCEPT-3: the Topic Hub card "Common difference … (test for an AP)" now maps the SAME way
    // (practiseConceptKeys ["nth Term"] + the same keywords), so the two entries agree.
    "Basics of AP": ["nth Term"],
  },
  "statistics": {
    // stats-comp-01 — a case on one grouped table asking mean, median and mode.
    "Mean, Median, Mode": ["Mean (Step Deviation)", "Median of Grouped Data", "Mode of Grouped Data"],
  },
  "probability": {
    "Single event": ["Single Event Probability"],
    // prob-hpq-103 — complementary events, P(E) + P(not E) = 1.
    "Probability axioms": ["Single Event Probability"],
    "Combined events": ["Combined/Word Problem Probability"],
  },
  "chemical-reactions-and-equations": {
    // sci-cre-hpq-3 — rusting of an iron gate as oxidation (the bank's redox rows sit in this concept).
    "Oxidation/Reduction": ["Balancing Equations & Types of Reactions"],
  },
  "acids-bases-and-salts": {
    "Indicators & pH": ["pH, Indicators & Strength"],
    "pH and Indicators": ["pH, Indicators & Strength"],
    "Reactions with Metals & Bases": ["Understanding the Chemical Properties of Acids and Bases"],
    "Salts & Their Uses": ["Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)"],
  },
  "metals-and-non-metals": {
    "Physical & Chemical Properties": [
      "Physical Properties of Metals and Non-metals",
      "Chemical Properties of Metals and Non-metals",
    ],
    "Ores & Extraction": ["Basic Metallurgical Processes"],
  },
  "carbon-and-its-compounds": {
    // sci-cic-hpq-4 — soap vs detergent in hard water (QP-CONCEPT-3: Soaps and Detergents only).
    "Important Reactions": ["Soaps and Detergents"],
  },
  "life-processes": {
    "Circulation": ["Transportation & Excretion in Humans"],
    // lp-hpq-101 — "powerhouse of the cell" (mitochondria, the site of respiration).
    "Cell organelles": ["Nutrition & Respiration (Human + Plants)"],
    "Nutrition in Plants": ["Nutrition & Respiration (Human + Plants)"],
  },
  "light-reflection-and-refraction": {
    "Mirror Formula & Diagrams": ["Mirror / Lens Formula & Ray Diagrams"],
    "Lens Formula & Diagrams": ["Mirror / Lens Formula & Ray Diagrams"],
    // sci-light-hpq-3 — ray diagram of refraction at a glass–air surface.
    "Refraction/Sign Convention": ["Refraction through Glass Slab / Prism"],
  },
  "human-eye-and-colourful-world": {
    "Defects & Correction": ["Structure & Defects of Vision"],
    "Structure of Eye": ["Structure & Defects of Vision"],
  },
  "electricity": {
    "Ohm’s Law & V–I Graph": ["Ohm’s Law & Circuit Numericals"],
    "Resistance in Series/Parallel": ["Ohm’s Law & Circuit Numericals"],
    // The concept is spelt with a curly apostrophe; these HPQ labels use a straight one.
    "Ohm's Law & Circuit Numericals": ["Ohm’s Law & Circuit Numericals"],
    "Ohm's Law and Circuits": ["Ohm’s Law & Circuit Numericals"],
  },
  "magnetic-effects-of-electric-current": {
    "Field Lines & Rules": ["Right-hand Rules & Field Lines"],
    "Electromagnet & Solenoid": ["Right-hand Rules & Field Lines"],
  },
  "control-and-coordination": {
    "Human nervous system": ["Nervous System & Reflex Actions"],
  },
  "heredity": {
    "Mendel’s experiments": ["Mendel's Experiments & Ratios"],
  },
  "our-environment": {
    "Food chains & webs": ["Food Chains, Trophic Levels & Energy Flow"],
  },
};

/** An HPQ label that names no concept the bank has: chapter -> label -> reason. */
export const HPQ_NO_BANK_CONCEPT: Readonly<Record<string, Readonly<Record<string, string>>>> = {};

/** The concept(s) an HPQ label stands for in `chapterSlug`, or undefined. Exact, then case-insensitive. */
export function hpqConceptAlias(chapterSlug: string, label: string): readonly string[] | undefined {
  const table = Object.prototype.hasOwnProperty.call(HPQ_CONCEPT_ALIASES, chapterSlug)
    ? HPQ_CONCEPT_ALIASES[chapterSlug]
    : undefined;
  if (!table) return undefined;
  const h = label.trim();
  if (Object.prototype.hasOwnProperty.call(table, h)) return table[h];
  const f = h.toLowerCase();
  const key = Object.keys(table).find((k) => k.toLowerCase() === f);
  return key ? table[key] : undefined;
}

// QP-CONCEPT-3 — an alias lands on a whole concept bucket (100–540 rows), so the first questions of
// e.g. "Lens Formula & Diagrams" were mirror questions. These keywords (lower-case substrings of the
// row's subtopic or question text, as on the Topic Hub cards) rank the HPQ question's OWN topic first
// inside the bucket. Chosen from phrases that occur in the bank (checked by conceptHint.realBank.test.ts:
// each label has keyword rows, and they lead its set).
const LENS_KEYWORDS = ["lens formula", "focal length of the lens", "1/v − 1/u", "1/f", "magnification produced by a lens", "convex lens", "concave lens"];
const MIRROR_KEYWORDS = ["mirror formula", "1/v + 1/u", "concave mirror", "convex mirror"];
export const AP_TEST_KEYWORDS = ["common difference", "is an ap", "are in ap", "an a.p.", "arithmetic progression"];

export const HPQ_ALIAS_KEYWORDS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "pair-of-linear-equations": {
    "Consistency of System": ["consistent", "inconsistent", "consistency", "no solution", "infinitely many", "unique solution", "coincident"],
  },
  "trigonometry": {
    "Trig ratios": ["acute angle", "right-angled", "right triangle"],
  },
  "arithmetic-progression": {
    "Basics of AP": AP_TEST_KEYWORDS,
  },
  "probability": {
    "Combined events": ["two dice", "two coins", "both", "sum of the numbers"],
    "Probability axioms": ["complement", "not ", "p(not"],
  },
  "chemical-reactions-and-equations": {
    "Oxidation/Reduction": ["oxidation", "reduction", "redox", "oxidis", "rust", "corros"],
  },
  "acids-bases-and-salts": {
    "Indicators & pH": ["indicator", "litmus", "ph "],
    "pH and Indicators": ["indicator", "litmus", "ph "],
  },
  "carbon-and-its-compounds": {
    "Important Reactions": ["soap", "detergent"],
  },
  "life-processes": {
    "Circulation": ["heart", "double circulation", "circulation"],
    "Cell organelles": ["mitochondri", "atp", "energy currency", "cell organelle"],
    "Nutrition in Plants": ["photosynthesis", "chlorophyll", "stomata"],
  },
  "light-reflection-and-refraction": {
    "Mirror Formula & Diagrams": MIRROR_KEYWORDS,
    "Lens Formula & Diagrams": LENS_KEYWORDS,
    "Refraction/Sign Convention": ["refraction", "glass slab", "ray diagram"],
  },
  "human-eye-and-colourful-world": {
    "Defects & Correction": ["myopia", "hypermetropia", "presbyopia", "defect"],
    "Structure of Eye": ["accommodation", "retina", "cornea", "iris", "pupil", "ciliary", "structure"],
  },
  "electricity": {
    "Ohm’s Law & V–I Graph": ["ohm's law", "ohm’s law", "v–i", "v-i", "v = ir"],
    "Resistance in Series/Parallel": ["series", "parallel", "equivalent resistance"],
  },
  "magnetic-effects-of-electric-current": {
    "Electromagnet & Solenoid": ["solenoid", "electromagnet"],
    "Field Lines & Rules": ["field line", "thumb", "right-hand"],
  },
};

/** The keywords of an HPQ label in `chapterSlug`, or undefined. Exact, then case-insensitive. */
export function hpqAliasKeywords(chapterSlug: string, label: string): readonly string[] | undefined {
  const table = Object.prototype.hasOwnProperty.call(HPQ_ALIAS_KEYWORDS, chapterSlug)
    ? HPQ_ALIAS_KEYWORDS[chapterSlug]
    : undefined;
  if (!table) return undefined;
  const h = label.trim();
  if (Object.prototype.hasOwnProperty.call(table, h)) return table[h];
  const key = Object.keys(table).find((k) => k.toLowerCase() === h.toLowerCase());
  return key ? table[key] : undefined;
}
