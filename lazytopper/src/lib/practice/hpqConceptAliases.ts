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
    // sci-cic-hpq-4 — soap vs detergent in hard water.
    "Important Reactions": ["Soaps and Detergents", "Chemical Properties of Carbon Compounds"],
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
