import type {
  HistoricalBloom,
  HistoricalCompetencyType,
  HistoricalFormat,
  HistoricalSourceType,
} from "./historicalDataset";

export interface CbseArchetypeEntry {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: HistoricalFormat;
  bloom: HistoricalBloom;
  competencyType: HistoricalCompetencyType;
  sourceYear: number;
  sourceType: HistoricalSourceType;
}

const B: HistoricalSourceType = "official_board";
const S: HistoricalSourceType = "official_sqp";

function m(
  topic: string,
  subtopic: string,
  marks: number,
  format: HistoricalFormat,
  bloom: HistoricalBloom,
  comp: HistoricalCompetencyType,
  year: number,
  src: HistoricalSourceType = B
): CbseArchetypeEntry {
  return { subject: "Maths", topic, subtopic, marks, format, bloom, competencyType: comp, sourceYear: year, sourceType: src };
}

function sc(
  topic: string,
  subtopic: string,
  marks: number,
  format: HistoricalFormat,
  bloom: HistoricalBloom,
  comp: HistoricalCompetencyType,
  year: number,
  src: HistoricalSourceType = B
): CbseArchetypeEntry {
  return { subject: "Science", topic, subtopic, marks, format, bloom, competencyType: comp, sourceYear: year, sourceType: src };
}

export const CBSE_HISTORICAL_ARCHETYPES: CbseArchetypeEntry[] = [

  // ═══════════════════════════════════════════
  //  2017 CBSE Board entries (pre-NEP)
  // ═══════════════════════════════════════════
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Polynomials", "Coefficient–root Relations", 2, "Short", "Applying", "procedural", 2017),
  m("Polynomials", "Zeros & Factorisation", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 3, "Short", "Applying", "procedural", 2017),
  m("Pair of Linear Equations", "Word & Application Problems", 5, "Long", "Applying", "application", 2017),
  m("Quadratic Equations", "Algebraic Solution", 3, "Short", "Applying", "procedural", 2017),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Quadratic Equations", "Word/Application Problems", 5, "Long", "Applying", "application", 2017),
  m("Arithmetic Progression", "nth Term", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Arithmetic Progression", "Sum of n Terms", 3, "Short", "Applying", "procedural", 2017),
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 5, "Long", "Applying", "procedural", 2017),
  m("Triangles", "Pythagoras/Converse", 3, "Short", "Applying", "procedural", 2017),
  m("Coordinate Geometry", "Distance Formula", 2, "Short", "Applying", "procedural", 2017),
  m("Coordinate Geometry", "Section Formula", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2017),
  m("Trigonometry", "Application/Heights & Distances", 5, "Long", "Applying", "application", 2017),
  m("Circles", "Tangent Properties", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Circles", "Tangent Theorems & Proofs", 5, "Long", "Applying", "procedural", 2017),
  m("Areas Related to Circles", "Sectors and Segments", 3, "Short", "Applying", "procedural", 2017),
  m("Areas Related to Circles", "Composite Figures", 1, "MCQ", "Applying", "procedural", 2017),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 3, "Short", "Applying", "procedural", 2017),
  m("Surface Areas and Volumes", "Combination/Transformation", 5, "Long", "Applying", "application", 2017),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2017),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2017),
  m("Statistics", "Mode of Grouped Data", 1, "MCQ", "Applying", "procedural", 2017),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2017),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2017),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 3, "Short", "Applying", "procedural", 2017),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 2, "Short", "Understanding", "conceptual", 2017),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 1, "MCQ", "Remembering", "conceptual", 2017),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 3, "Short", "Applying", "procedural", 2017),
  sc("Metals & Non-metals", "Corrosion & Prevention", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 2, "Short", "Understanding", "conceptual", 2017),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 3, "Short", "Understanding", "conceptual", 2017),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2017),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 3, "Short", "Understanding", "diagram", 2017),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Remembering", "conceptual", 2017),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2017),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Understanding", "conceptual", 2017),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Remembering", "conceptual", 2017),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 5, "Long", "Applying", "diagram", 2017),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 3, "Short", "Understanding", "conceptual", 2017),
  sc("The Human Eye & the Colourful World", "Atmospheric Refraction Phenomena", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 5, "Long", "Applying", "procedural", 2017),
  sc("Electricity", "Heating Effect & Power Calculations", 1, "MCQ", "Applying", "procedural", 2017),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2017),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2017),
  sc("Our Environment / Sources of Energy", "Conventional vs Non-conventional Energy", 2, "Short", "Understanding", "conceptual", 2017),

  // ═══════════════════════════════════════════
  //  MATHS — Real Numbers
  // ═══════════════════════════════════════════
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 2, "Short", "Applying", "procedural", 2018),
  m("Real Numbers", "Irrationality Proofs", 3, "Short", "Applying", "procedural", 2018),
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 2, "Short", "Applying", "procedural", 2019),
  m("Real Numbers", "Irrationality Proofs", 3, "Short", "Applying", "procedural", 2020),
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Real Numbers", "Irrationality Proofs", 2, "Short", "Applying", "procedural", 2022),
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 2, "Short", "Applying", "procedural", 2023),
  m("Real Numbers", "Irrationality Proofs", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 1, "MCQ", "Understanding", "conceptual", 2024),
  m("Real Numbers", "Irrationality Proofs", 2, "Short", "Applying", "procedural", 2024),
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  m("Real Numbers", "Irrationality Proofs", 2, "Short", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Polynomials
  // ═══════════════════════════════════════════
  m("Polynomials", "Coefficient–root Relations", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Polynomials", "Zeros & Factorisation", 2, "Short", "Applying", "procedural", 2018),
  m("Polynomials", "Graph & Type of Polynomial", 1, "MCQ", "Understanding", "conceptual", 2019),
  m("Polynomials", "Coefficient–root Relations", 2, "Short", "Applying", "procedural", 2019),
  m("Polynomials", "Coefficient–root Relations", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Polynomials", "Zeros & Factorisation", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Polynomials", "Coefficient–root Relations", 1, "MCQ", "Applying", "conceptual", 2022),
  m("Polynomials", "Graph & Type of Polynomial", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Polynomials", "Coefficient–root Relations", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Polynomials", "Zeros & Factorisation", 2, "Short", "Applying", "procedural", 2023),
  m("Polynomials", "Coefficient–root Relations", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  m("Polynomials", "Zeros & Factorisation", 1, "MCQ", "Understanding", "conceptual", 2024),
  m("Polynomials", "Coefficient–root Relations", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  m("Polynomials", "Zeros & Factorisation", 2, "Short", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Pair of Linear Equations
  // ═══════════════════════════════════════════
  m("Pair of Linear Equations", "Algebraic Solution Methods", 3, "Short", "Applying", "procedural", 2018),
  m("Pair of Linear Equations", "Word & Application Problems", 5, "Long", "Applying", "application", 2018),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 2, "Short", "Applying", "procedural", 2019),
  m("Pair of Linear Equations", "Word & Application Problems", 3, "Short", "Applying", "application", 2019),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 1, "MCQ", "Understanding", "conceptual", 2019),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 3, "Short", "Applying", "procedural", 2020),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 5, "Long", "Analysing", "application", 2020),
  m("Pair of Linear Equations", "Word & Application Problems", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 3, "Short", "Applying", "procedural", 2022),
  m("Pair of Linear Equations", "Word & Application Problems", 5, "Long", "Applying", "application", 2022),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Pair of Linear Equations", "Word & Application Problems", 3, "Short", "Applying", "application", 2023),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  m("Pair of Linear Equations", "Word & Application Problems", 4, "Case-Based", "Applying", "case-based", 2023),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 2, "Short", "Applying", "procedural", 2024),
  m("Pair of Linear Equations", "Word & Application Problems", 4, "Case-Based", "Applying", "case-based", 2024),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 1, "MCQ", "Understanding", "conceptual", 2024),
  m("Pair of Linear Equations", "Word & Application Problems", 4, "Case-Based", "Analysing", "case-based", 2025, S),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 3, "Short", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Quadratic Equations
  // ═══════════════════════════════════════════
  m("Quadratic Equations", "Algebraic Solution", 3, "Short", "Applying", "procedural", 2018),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Quadratic Equations", "Word/Application Problems", 5, "Long", "Applying", "application", 2018),
  m("Quadratic Equations", "Algebraic Solution", 2, "Short", "Applying", "procedural", 2019),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Remembering", "conceptual", 2019),
  m("Quadratic Equations", "Algebraic Solution", 3, "Short", "Applying", "procedural", 2020),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 2, "Short", "Applying", "procedural", 2020),
  m("Quadratic Equations", "Word/Application Problems", 3, "Short", "Applying", "application", 2020),
  m("Quadratic Equations", "Algebraic Solution", 2, "Short", "Applying", "procedural", 2022),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Quadratic Equations", "Word/Application Problems", 5, "Long", "Analysing", "application", 2022),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Quadratic Equations", "Word/Application Problems", 4, "Case-Based", "Applying", "case-based", 2023),
  m("Quadratic Equations", "Algebraic Solution", 3, "Short", "Applying", "procedural", 2023),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  m("Quadratic Equations", "Word/Application Problems", 4, "Case-Based", "Applying", "case-based", 2024),
  m("Quadratic Equations", "Algebraic Solution", 2, "Short", "Applying", "procedural", 2024),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  m("Quadratic Equations", "Word/Application Problems", 4, "Case-Based", "Applying", "case-based", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Arithmetic Progression
  // ═══════════════════════════════════════════
  m("Arithmetic Progression", "nth Term", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Arithmetic Progression", "Sum of n Terms", 3, "Short", "Applying", "procedural", 2018),
  m("Arithmetic Progression", "Application Problems", 5, "Long", "Applying", "application", 2019),
  m("Arithmetic Progression", "nth Term", 2, "Short", "Applying", "procedural", 2019),
  m("Arithmetic Progression", "Sum of n Terms", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Arithmetic Progression", "Application Problems", 3, "Short", "Applying", "application", 2020),
  m("Arithmetic Progression", "nth Term", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Arithmetic Progression", "Sum of n Terms", 3, "Short", "Applying", "procedural", 2022),
  m("Arithmetic Progression", "nth Term", 1, "MCQ", "Applying", "conceptual", 2023),
  m("Arithmetic Progression", "Sum of n Terms", 2, "Short", "Applying", "procedural", 2023),
  m("Arithmetic Progression", "Application Problems", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  m("Arithmetic Progression", "Sum of n Terms", 3, "Short", "Applying", "procedural", 2024),
  m("Arithmetic Progression", "nth Term", 1, "MCQ", "Understanding", "conceptual", 2024),
  m("Arithmetic Progression", "Sum of n Terms", 2, "Short", "Applying", "procedural", 2025, S),
  m("Arithmetic Progression", "Application Problems", 4, "Case-Based", "Applying", "case-based", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Triangles
  // ═══════════════════════════════════════════
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 3, "Short", "Applying", "procedural", 2018),
  m("Triangles", "Pythagoras/Converse", 5, "Long", "Applying", "procedural", 2018),
  m("Triangles", "Similarity Criteria", 2, "Short", "Applying", "procedural", 2019),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 5, "Long", "Applying", "procedural", 2019),
  m("Triangles", "Area Ratio in Similar Triangles", 1, "MCQ", "Understanding", "conceptual", 2019),
  m("Triangles", "Pythagoras/Converse", 3, "Short", "Applying", "procedural", 2020),
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 2, "Short", "Applying", "procedural", 2020),
  m("Triangles", "Area Ratio in Similar Triangles", 3, "Short", "Applying", "procedural", 2022),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 5, "Long", "Applying", "procedural", 2022),
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 3, "Short", "Applying", "procedural", 2023),
  m("Triangles", "Pythagoras/Converse", 5, "Long", "Applying", "procedural", 2023),
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Triangles", "Area Ratio in Similar Triangles", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  m("Triangles", "Pythagoras/Converse", 4, "Case-Based", "Analysing", "case-based", 2024),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 3, "Short", "Applying", "procedural", 2024),
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2024),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 5, "Long", "Applying", "procedural", 2025, S),
  m("Triangles", "Pythagoras/Converse", 1, "MCQ", "Applying", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Coordinate Geometry
  // ═══════════════════════════════════════════
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2018),
  m("Coordinate Geometry", "Section Formula", 2, "Short", "Applying", "procedural", 2018),
  m("Coordinate Geometry", "Area of Triangle", 3, "Short", "Applying", "procedural", 2018),
  m("Coordinate Geometry", "Distance Formula", 2, "Short", "Applying", "procedural", 2019),
  m("Coordinate Geometry", "Section Formula", 1, "MCQ", "Understanding", "conceptual", 2019),
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2020),
  m("Coordinate Geometry", "Area of Triangle", 2, "Short", "Applying", "procedural", 2020),
  m("Coordinate Geometry", "Section Formula", 3, "Short", "Applying", "procedural", 2022),
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2022),
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2023),
  m("Coordinate Geometry", "Section Formula", 2, "Short", "Applying", "procedural", 2023),
  m("Coordinate Geometry", "Area of Triangle", 3, "Short", "Applying", "procedural", 2023),
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2024),
  m("Coordinate Geometry", "Section Formula", 2, "Short", "Applying", "procedural", 2024),
  m("Coordinate Geometry", "Area of Triangle", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  m("Coordinate Geometry", "Section Formula", 2, "Short", "Applying", "procedural", 2025, S),
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Trigonometry (incl. Heights & Distances)
  // ═══════════════════════════════════════════
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Remembering", "conceptual", 2018),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2018),
  m("Trigonometry", "Application/Heights & Distances", 5, "Long", "Applying", "application", 2018),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2019),
  m("Trigonometry", "Trig Identities/Proofs", 2, "Short", "Applying", "procedural", 2019),
  m("Trigonometry", "Application/Heights & Distances", 3, "Short", "Applying", "application", 2019),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2020),
  m("Trigonometry", "Application/Heights & Distances", 5, "Long", "Applying", "application", 2020),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2022),
  m("Trigonometry", "Application/Heights & Distances", 5, "Long", "Applying", "application", 2022),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2023),
  m("Trigonometry", "Application/Heights & Distances", 4, "Case-Based", "Applying", "case-based", 2023),
  m("Trigonometry", "Trig Ratios/Values", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2024),
  m("Trigonometry", "Application/Heights & Distances", 4, "Case-Based", "Applying", "case-based", 2024),
  m("Trigonometry", "Trig Identities/Proofs", 2, "Short", "Applying", "procedural", 2025, S),
  m("Trigonometry", "Application/Heights & Distances", 4, "Case-Based", "Applying", "case-based", 2025, S),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Circles
  // ═══════════════════════════════════════════
  m("Circles", "Tangent Properties", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Circles", "Tangent Theorems & Proofs", 3, "Short", "Applying", "procedural", 2018),
  m("Circles", "Tangent Properties", 2, "Short", "Understanding", "conceptual", 2019),
  m("Circles", "Tangent Theorems & Proofs", 5, "Long", "Applying", "procedural", 2019),
  m("Circles", "Number/Type of Tangents", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Circles", "Tangent Theorems & Proofs", 3, "Short", "Applying", "procedural", 2020),
  m("Circles", "Tangent Properties", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Circles", "Tangent Theorems & Proofs", 3, "Short", "Applying", "procedural", 2022),
  m("Circles", "Tangent Properties", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Circles", "Tangent Theorems & Proofs", 3, "Short", "Applying", "procedural", 2023),
  m("Circles", "Number/Type of Tangents", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  m("Circles", "Tangent Theorems & Proofs", 3, "Short", "Applying", "procedural", 2024),
  m("Circles", "Tangent Properties", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Areas Related to Circles
  // ═══════════════════════════════════════════
  m("Areas Related to Circles", "Sectors and Segments", 1, "MCQ", "Applying", "procedural", 2018),
  m("Areas Related to Circles", "Composite Figures", 3, "Short", "Applying", "procedural", 2018),
  m("Areas Related to Circles", "Sectors and Segments", 2, "Short", "Applying", "procedural", 2019),
  m("Areas Related to Circles", "Composite Figures", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Areas Related to Circles", "Sectors and Segments", 3, "Short", "Applying", "procedural", 2020),
  m("Areas Related to Circles", "Sectors and Segments", 1, "MCQ", "Applying", "procedural", 2022),
  m("Areas Related to Circles", "Composite Figures", 3, "Short", "Applying", "procedural", 2022),
  m("Areas Related to Circles", "Sectors and Segments", 2, "Short", "Applying", "procedural", 2023),
  m("Areas Related to Circles", "Composite Figures", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  m("Areas Related to Circles", "Sectors and Segments", 2, "Short", "Applying", "procedural", 2024),
  m("Areas Related to Circles", "Sectors and Segments", 1, "MCQ", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Surface Areas and Volumes
  // ═══════════════════════════════════════════
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 1, "MCQ", "Applying", "procedural", 2018),
  m("Surface Areas and Volumes", "Combination/Transformation", 5, "Long", "Applying", "application", 2018),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 3, "Short", "Applying", "procedural", 2019),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 1, "MCQ", "Applying", "procedural", 2020),
  m("Surface Areas and Volumes", "Combination/Transformation", 3, "Short", "Applying", "application", 2020),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 3, "Short", "Applying", "procedural", 2022),
  m("Surface Areas and Volumes", "Combination/Transformation", 5, "Long", "Applying", "application", 2022),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 1, "MCQ", "Applying", "procedural", 2023),
  m("Surface Areas and Volumes", "Combination/Transformation", 3, "Short", "Applying", "application", 2023),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 3, "Short", "Applying", "procedural", 2024),
  m("Surface Areas and Volumes", "Combination/Transformation", 4, "Case-Based", "Applying", "case-based", 2024),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 1, "MCQ", "Applying", "procedural", 2025, S),
  m("Surface Areas and Volumes", "Combination/Transformation", 4, "Case-Based", "Applying", "case-based", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Statistics
  // ═══════════════════════════════════════════
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2018),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2018),
  m("Statistics", "Mode of Grouped Data", 1, "MCQ", "Applying", "procedural", 2018),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2019),
  m("Statistics", "Mode of Grouped Data", 2, "Short", "Applying", "procedural", 2019),
  m("Statistics", "Median of Grouped Data", 3, "Short", "Applying", "procedural", 2020),
  m("Statistics", "Mean (Step Deviation)", 5, "Long", "Applying", "procedural", 2020),
  m("Statistics", "Mode of Grouped Data", 1, "MCQ", "Applying", "procedural", 2020),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2022),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2022),
  m("Statistics", "Mode of Grouped Data", 1, "MCQ", "Applying", "procedural", 2022),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2023),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2023),
  m("Statistics", "Mode of Grouped Data", 1, "MCQ", "Applying", "procedural", 2023),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2024),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2024),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2025, S),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  MATHS — Probability
  // ═══════════════════════════════════════════
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2018),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2018),
  m("Probability", "Single Event Probability", 2, "Short", "Applying", "procedural", 2019),
  m("Probability", "Combined/Word Problem Probability", 1, "MCQ", "Applying", "conceptual", 2019),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2020),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2020),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2022),
  m("Probability", "Combined/Word Problem Probability", 2, "Short", "Applying", "application", 2022),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2023),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2023),
  m("Probability", "Single Event Probability", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2024),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2024),
  m("Probability", "Combined/Word Problem Probability", 4, "Case-Based", "Analysing", "case-based", 2024),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Chemical Reactions & Equations
  // ═══════════════════════════════════════════
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 3, "Short", "Applying", "procedural", 2018),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 2, "Short", "Applying", "application", 2018),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "MCQ", "Remembering", "conceptual", 2019),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 3, "Short", "Applying", "application", 2019),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 2, "Short", "Applying", "procedural", 2020),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 3, "Short", "Applying", "application", 2022),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "MCQ", "Understanding", "conceptual", 2023),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 4, "Case-Based", "Analysing", "case-based", 2023),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 2, "Short", "Applying", "procedural", 2023),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 4, "Case-Based", "Analysing", "case-based", 2024),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 2, "Short", "Applying", "procedural", 2024),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 4, "Case-Based", "Analysing", "case-based", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Acids, Bases & Salts
  // ═══════════════════════════════════════════
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 3, "Short", "Understanding", "conceptual", 2018),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 2, "Short", "Understanding", "conceptual", 2019),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 1, "MCQ", "Remembering", "conceptual", 2019),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 3, "Short", "Understanding", "conceptual", 2020),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 3, "Short", "Understanding", "application", 2022),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 4, "Case-Based", "Analysing", "case-based", 2023),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 4, "Case-Based", "Analysing", "case-based", 2024),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 3, "Short", "Applying", "application", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Metals & Non-metals
  // ═══════════════════════════════════════════
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Metals & Non-metals", "Corrosion & Prevention", 2, "Short", "Understanding", "conceptual", 2018),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 3, "Short", "Applying", "procedural", 2019),
  sc("Metals & Non-metals", "Corrosion & Prevention", 1, "MCQ", "Remembering", "conceptual", 2019),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Metals & Non-metals", "Corrosion & Prevention", 3, "Short", "Understanding", "conceptual", 2020),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 2, "Short", "Applying", "procedural", 2022),
  sc("Metals & Non-metals", "Corrosion & Prevention", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Metals & Non-metals", "Corrosion & Prevention", 2, "Short", "Understanding", "conceptual", 2023),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Metals & Non-metals", "Corrosion & Prevention", 3, "Short", "Understanding", "conceptual", 2024),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Carbon & its Compounds
  // ═══════════════════════════════════════════
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 3, "Short", "Understanding", "conceptual", 2018),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 2, "Short", "Understanding", "conceptual", 2019),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 1, "MCQ", "Remembering", "conceptual", 2019),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 3, "Short", "Applying", "application", 2020),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 3, "Short", "Applying", "application", 2022),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 4, "Case-Based", "Analysing", "case-based", 2023),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 3, "Short", "Applying", "application", 2024),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 4, "Case-Based", "Analysing", "case-based", 2025, S),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Life Processes
  // ═══════════════════════════════════════════
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 3, "Short", "Understanding", "conceptual", 2018),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2018),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 5, "Long", "Understanding", "diagram", 2019),
  sc("Life Processes", "Transportation & Excretion in Humans", 3, "Short", "Understanding", "conceptual", 2019),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2020),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 3, "Short", "Understanding", "conceptual", 2020),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 3, "Short", "Understanding", "conceptual", 2022),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2022),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 1, "MCQ", "Understanding", "conceptual", 2023),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Applying", "diagram", 2023),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 4, "Case-Based", "Analysing", "case-based", 2023),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2024),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 4, "Case-Based", "Analysing", "case-based", 2024),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Control & Coordination
  // ═══════════════════════════════════════════
  sc("Control & Coordination", "Nervous System & Reflex Actions", 3, "Short", "Understanding", "diagram", 2018),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Remembering", "conceptual", 2018),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 1, "MCQ", "Understanding", "conceptual", 2019),
  sc("Control & Coordination", "Plant Hormones & Movements", 2, "Short", "Understanding", "conceptual", 2019),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 5, "Long", "Understanding", "diagram", 2020),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 3, "Short", "Understanding", "diagram", 2022),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Control & Coordination", "Plant Hormones & Movements", 3, "Short", "Understanding", "conceptual", 2023),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 3, "Short", "Understanding", "diagram", 2024),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 3, "Short", "Understanding", "diagram", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Reproduction
  // ═══════════════════════════════════════════
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2018),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 3, "Short", "Understanding", "diagram", 2019),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 1, "MCQ", "Understanding", "conceptual", 2019),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2020),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 2, "Short", "Understanding", "diagram", 2022),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 3, "Short", "Understanding", "conceptual", 2022),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2023),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2023),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2024),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 4, "Case-Based", "Analysing", "case-based", 2024),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2025, S),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Heredity & Evolution
  // ═══════════════════════════════════════════
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Understanding", "conceptual", 2018),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Remembering", "conceptual", 2018),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 1, "MCQ", "Understanding", "conceptual", 2019),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 3, "Short", "Understanding", "conceptual", 2019),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Understanding", "conceptual", 2020),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 2, "Short", "Understanding", "conceptual", 2022),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Understanding", "conceptual", 2023),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Applying", "application", 2024),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Understanding", "conceptual", 2025, S),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Light
  // ═══════════════════════════════════════════
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 3, "Short", "Applying", "procedural", 2018),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 5, "Long", "Applying", "diagram", 2018),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 1, "MCQ", "Applying", "procedural", 2019),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 3, "Short", "Understanding", "conceptual", 2019),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 5, "Long", "Applying", "diagram", 2019),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 3, "Short", "Applying", "procedural", 2020),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 5, "Long", "Applying", "diagram", 2020),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 3, "Short", "Applying", "procedural", 2022),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 1, "MCQ", "Applying", "procedural", 2023),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 3, "Short", "Applying", "application", 2023),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 4, "Case-Based", "Analysing", "case-based", 2023),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 4, "Case-Based", "Analysing", "case-based", 2024),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 2, "Short", "Understanding", "conceptual", 2024),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 1, "MCQ", "Applying", "procedural", 2025, S),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 4, "Case-Based", "Analysing", "case-based", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Human Eye & Colourful World
  // ═══════════════════════════════════════════
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("The Human Eye & the Colourful World", "Atmospheric Refraction Phenomena", 2, "Short", "Understanding", "conceptual", 2018),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 3, "Short", "Understanding", "conceptual", 2019),
  sc("The Human Eye & the Colourful World", "Atmospheric Refraction Phenomena", 1, "MCQ", "Understanding", "conceptual", 2019),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("The Human Eye & the Colourful World", "Atmospheric Refraction Phenomena", 2, "Short", "Understanding", "conceptual", 2020),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 2, "Short", "Understanding", "conceptual", 2022),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 1, "MCQ", "Understanding", "conceptual", 2023),
  sc("The Human Eye & the Colourful World", "Atmospheric Refraction Phenomena", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 2, "Short", "Understanding", "conceptual", 2024),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Electricity
  // ═══════════════════════════════════════════
  sc("Electricity", "Ohm's Law & Circuit Numericals", 3, "Short", "Applying", "procedural", 2018),
  sc("Electricity", "Heating Effect & Power Calculations", 1, "MCQ", "Applying", "procedural", 2018),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 5, "Long", "Applying", "procedural", 2018),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 1, "MCQ", "Applying", "procedural", 2019),
  sc("Electricity", "Heating Effect & Power Calculations", 3, "Short", "Applying", "procedural", 2019),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 5, "Long", "Applying", "procedural", 2019),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 3, "Short", "Applying", "procedural", 2020),
  sc("Electricity", "Heating Effect & Power Calculations", 1, "MCQ", "Applying", "procedural", 2020),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 5, "Long", "Applying", "procedural", 2020),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 3, "Short", "Applying", "procedural", 2022),
  sc("Electricity", "Heating Effect & Power Calculations", 5, "Long", "Applying", "procedural", 2022),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 1, "MCQ", "Applying", "procedural", 2022),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 3, "Short", "Applying", "procedural", 2023),
  sc("Electricity", "Heating Effect & Power Calculations", 1, "MCQ", "Applying", "procedural", 2023),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 4, "Case-Based", "Analysing", "case-based", 2023),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2024),
  sc("Electricity", "Heating Effect & Power Calculations", 3, "Short", "Applying", "procedural", 2024),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 4, "Case-Based", "Analysing", "case-based", 2024),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 1, "MCQ", "Applying", "procedural", 2025, S),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 4, "Case-Based", "Analysing", "case-based", 2025, S),
  sc("Electricity", "Heating Effect & Power Calculations", 3, "Short", "Applying", "procedural", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Magnetic Effects of Electric Current
  // ═══════════════════════════════════════════
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2018),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 3, "Short", "Understanding", "diagram", 2019),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 5, "Long", "Understanding", "diagram", 2019),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2020),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2022),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2023),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 5, "Long", "Understanding", "diagram", 2024),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2025, S),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  SCIENCE — Our Environment / Sources of Energy
  // ═══════════════════════════════════════════
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2018),
  sc("Our Environment / Sources of Energy", "Conventional vs Non-conventional Energy", 2, "Short", "Understanding", "conceptual", 2018),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 2, "Short", "Understanding", "conceptual", 2019),
  sc("Our Environment / Sources of Energy", "Conventional vs Non-conventional Energy", 1, "MCQ", "Understanding", "conceptual", 2019),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2020),
  sc("Our Environment / Sources of Energy", "Conventional vs Non-conventional Energy", 2, "Short", "Understanding", "conceptual", 2020),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2022),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2023),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "Assertion-Reasoning", "Analysing", "assertion-reasoning", 2023),
  sc("Our Environment / Sources of Energy", "Conventional vs Non-conventional Energy", 2, "Short", "Understanding", "conceptual", 2024),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2024),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2025, S),

  // ═══════════════════════════════════════════
  //  2021 entries (COVID term-based SQP papers)
  // ═══════════════════════════════════════════
  m("Real Numbers", "Fundamental Theorem of Arithmetic", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Real Numbers", "Irrationality Proofs", 2, "Short", "Applying", "procedural", 2021, S),
  m("Polynomials", "Coefficient–root Relations", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Polynomials", "Zeros & Factorisation", 2, "Short", "Applying", "procedural", 2021, S),
  m("Pair of Linear Equations", "Algebraic Solution Methods", 3, "Short", "Applying", "procedural", 2021, S),
  m("Pair of Linear Equations", "Graphical Solutions/Nature", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Quadratic Equations", "Algebraic Solution", 3, "Short", "Applying", "procedural", 2021, S),
  m("Quadratic Equations", "Nature of Roots (Discriminant)", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Arithmetic Progression", "Sum of n Terms", 3, "Short", "Applying", "procedural", 2021, S),
  m("Arithmetic Progression", "nth Term", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Triangles", "BPT (Basic Proportionality Theorem)", 3, "Short", "Applying", "procedural", 2021, S),
  m("Triangles", "Similarity Criteria", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Coordinate Geometry", "Distance Formula", 1, "MCQ", "Applying", "procedural", 2021, S),
  m("Coordinate Geometry", "Section Formula", 2, "Short", "Applying", "procedural", 2021, S),
  m("Trigonometry", "Trig Ratios/Values", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Trigonometry", "Trig Identities/Proofs", 3, "Short", "Applying", "procedural", 2021, S),
  m("Trigonometry", "Application/Heights & Distances", 5, "Long", "Applying", "application", 2021, S),
  m("Circles", "Tangent Properties", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Circles", "Tangent Theorems & Proofs", 3, "Short", "Applying", "procedural", 2021, S),
  m("Areas Related to Circles", "Sectors and Segments", 2, "Short", "Applying", "procedural", 2021, S),
  m("Surface Areas and Volumes", "Cylinder/Cone/Sphere", 3, "Short", "Applying", "procedural", 2021, S),
  m("Surface Areas and Volumes", "Combination/Transformation", 5, "Long", "Applying", "application", 2021, S),
  m("Statistics", "Mean (Step Deviation)", 3, "Short", "Applying", "procedural", 2021, S),
  m("Statistics", "Median of Grouped Data", 5, "Long", "Applying", "procedural", 2021, S),
  m("Probability", "Single Event Probability", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  m("Probability", "Combined/Word Problem Probability", 3, "Short", "Applying", "application", 2021, S),
  sc("Chemical Reactions & Equations", "Balancing Equations & Types of Reactions", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Chemical Reactions & Equations", "Applications & Daily-life Context", 3, "Short", "Applying", "application", 2021, S),
  sc("Acids, Bases & Salts", "pH, Indicators & Strength", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Acids, Bases & Salts", "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)", 3, "Short", "Understanding", "conceptual", 2021, S),
  sc("Metals & Non-metals", "Reactivity Series & Displacement", 2, "Short", "Applying", "procedural", 2021, S),
  sc("Metals & Non-metals", "Corrosion & Prevention", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Carbon & its Compounds", "Homologous Series & Nomenclature", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Carbon & its Compounds", "Properties of Ethanol & Ethanoic Acid", 3, "Short", "Applying", "application", 2021, S),
  sc("Life Processes", "Nutrition & Respiration (Human + Plants)", 3, "Short", "Understanding", "conceptual", 2021, S),
  sc("Life Processes", "Transportation & Excretion in Humans", 5, "Long", "Understanding", "diagram", 2021, S),
  sc("Control & Coordination", "Nervous System & Reflex Actions", 3, "Short", "Understanding", "diagram", 2021, S),
  sc("Control & Coordination", "Plant Hormones & Movements", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("How do Organisms Reproduce?", "Asexual Reproduction & Diagrams", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("How do Organisms Reproduce?", "Sexual Reproduction in Humans & Plants", 5, "Long", "Understanding", "conceptual", 2021, S),
  sc("Heredity & Evolution", "Mendel's Experiments & Ratios", 3, "Short", "Understanding", "conceptual", 2021, S),
  sc("Heredity & Evolution", "Basic Ideas of Evolution", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Light – Reflection & Refraction", "Mirror / Lens Formula & Ray Diagrams", 3, "Short", "Applying", "procedural", 2021, S),
  sc("Light – Reflection & Refraction", "Refraction through Glass Slab / Prism", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("The Human Eye & the Colourful World", "Structure & Defects of Vision", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("The Human Eye & the Colourful World", "Atmospheric Refraction Phenomena", 2, "Short", "Understanding", "conceptual", 2021, S),
  sc("Electricity", "Ohm's Law & Circuit Numericals", 3, "Short", "Applying", "procedural", 2021, S),
  sc("Electricity", "Heating Effect & Power Calculations", 1, "MCQ", "Applying", "procedural", 2021, S),
  sc("Magnetic Effects of Electric Current", "Right-hand Rules & Field Lines", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Magnetic Effects of Electric Current", "Electric Motor & Electromagnetic Induction", 3, "Short", "Understanding", "diagram", 2021, S),
  sc("Our Environment / Sources of Energy", "Food Chains & Trophic Levels", 1, "MCQ", "Understanding", "conceptual", 2021, S),
  sc("Our Environment / Sources of Energy", "Conventional vs Non-conventional Energy", 2, "Short", "Understanding", "conceptual", 2021, S),
];

// ─────────────────────────────────────────────────────────────────────────────
// 2026-27 CBSE Maths syllabus deletions
//
// CBSE has historically trimmed the Maths syllabus (e.g. Constructions was
// removed in earlier rationalisation rounds; Statistics / Probability scope
// has been narrowed at various points).  No topics are deleted for 2026-27 as
// of the current confirmed syllabus.  The config object below intentionally
// starts empty so that adding a future deletion requires ONLY editing this
// object — no changes to the scoring logic are needed.
//
// How to add a deletion when CBSE announces one:
//   • Full chapter removed  → add the chapter name to `deletedTopics`.
//   • Partial removal       → add keyword fragment(s) to
//                             `deletedSubtopicKeywords` (matched as
//                             case-insensitive substrings of the subtopic).
// ─────────────────────────────────────────────────────────────────────────────
export const MATHS_DELETED_CHAPTERS_2026_27 = {
  effectiveFromYear: 2026,

  /** Full Maths chapters removed entirely (none confirmed for 2026-27). */
  deletedTopics: [] as string[],

  /**
   * Subtopic-level keyword fragments deleted from otherwise-retained Maths
   * chapters (none confirmed for 2026-27).  Matched as case-insensitive
   * substrings against the normalised subtopic name.
   */
  deletedSubtopicKeywords: [] as string[],
} as const;

/**
 * Returns true when the given topic (and optional subtopic) corresponds to
 * content deleted from the CBSE Class 10 Maths syllabus for 2026-27.
 * Historical archetype data is preserved; use this guard before generating
 * any prediction, weighting, or recommendation for targetYear >= 2026.
 *
 * Logic mirrors isScienceDeletedFor2026_27:
 *  1. Full-chapter deletions: match the topic name alone.
 *  2. Partial-chapter deletions: match the subtopic name against deleted
 *     keyword fragments so that sibling subtopics are NOT excluded.
 */
export function isMathsDeletedFor2026_27(topic: string, subtopic?: string): boolean {
  const normTopic = normStr(topic);
  const normSub = normStr(subtopic ?? "");

  for (const dt of MATHS_DELETED_CHAPTERS_2026_27.deletedTopics) {
    const normDT = normStr(dt);
    if (normTopic.includes(normDT) || normDT.includes(normTopic)) return true;
  }

  if (normSub) {
    for (const kw of MATHS_DELETED_CHAPTERS_2026_27.deletedSubtopicKeywords) {
      const normKW = normStr(kw);
      if (normSub.includes(normKW)) return true;
    }
  }

  return false;
}

/**
 * Year-gated wrapper around isMathsDeletedFor2026_27.
 * Returns true only when targetYear >= effectiveFromYear AND the topic/subtopic
 * matches a deleted Maths chapter or subtopic keyword.
 *
 * Prefer this function at call sites so the year gate is part of the guard
 * itself rather than scattered inline across the codebase.
 */
export function isMathsDeletedForYear(
  topic: string,
  subtopic: string | undefined,
  targetYear: number
): boolean {
  if (targetYear < MATHS_DELETED_CHAPTERS_2026_27.effectiveFromYear) return false;
  return isMathsDeletedFor2026_27(topic, subtopic);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2026-27 CBSE Science syllabus deletions
//
// Historical entries above are preserved for trend analysis but the prediction
// engine must NOT surface these topics in any 2026-27 (or later) output.
//
// Deleted FULL chapters:
//   • Periodic Classification of Elements
//   • Management of Natural Resources
//
// Deleted content within chapters that otherwise remain:
//   • Evolution section of "Heredity & Evolution" — Mendel / genetics stays.
//     Subtopics to exclude: anything evolution-related (fossils, homologous /
//     analogous organs, speciation, natural selection, evolutionary evidence).
//   • Sources of Energy section of "Our Environment / Sources of Energy" —
//     ecology (food chains, pollution, waste management) stays.
// ─────────────────────────────────────────────────────────────────────────────
export const SCIENCE_DELETED_CHAPTERS_2026_27 = {
  effectiveFromYear: 2026,

  /** Full chapters removed entirely. */
  deletedTopics: [
    "Periodic Classification of Elements",
    "Periodic Classification",
    "Management of Natural Resources",
  ] as const,

  /**
   * Subtopic-level keyword fragments deleted from otherwise-retained chapters.
   * Matched as substrings (case-insensitive) against the normalised subtopic name.
   */
  deletedSubtopicKeywords: [
    // Heredity & Evolution — evolution portion removed
    "evolution",
    "fossil",
    "homologous organ",
    "analogous organ",
    "speciation",
    "natural selection",
    // Our Environment / Sources of Energy — energy portion removed
    "sources of energy",
    "conventional",
    "non conventional",
    "nonconventional",
    // How do Organisms Reproduce? — reproductive health (contraception, STIs, family planning) removed
    "reproductive health",
    "contraception",
    "family planning",
  ] as const,
} as const;

function normStr(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

/**
 * Returns true when the given topic (and optional subtopic) corresponds to
 * content deleted from the CBSE Class 10 Science syllabus for 2026-27.
 * Historical archetype data is preserved; use this guard before generating
 * any prediction, weighting, or recommendation for targetYear >= 2026.
 *
 * Logic:
 *  1. Full-chapter deletions: match the topic name alone.
 *  2. Partial-chapter deletions (Evolution, Sources of Energy): match the
 *     subtopic name against deleted keyword fragments so that sibling subtopics
 *     (Mendel's experiments, food chains, etc.) are NOT excluded.
 */
export function isScienceDeletedFor2026_27(topic: string, subtopic?: string): boolean {
  const normTopic = normStr(topic);
  const normSub = normStr(subtopic ?? "");

  // 1. Full chapter deletions — matched on topic name only.
  for (const dt of SCIENCE_DELETED_CHAPTERS_2026_27.deletedTopics) {
    const normDT = normStr(dt);
    if (normTopic.includes(normDT) || normDT.includes(normTopic)) return true;
  }

  // 2. Subtopic-level deletions — only relevant when a subtopic is supplied.
  if (normSub) {
    for (const kw of SCIENCE_DELETED_CHAPTERS_2026_27.deletedSubtopicKeywords) {
      const normKW = normStr(kw);
      if (normSub.includes(normKW)) return true;
    }
  }

  return false;
}
