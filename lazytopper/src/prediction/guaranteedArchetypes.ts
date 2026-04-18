export interface GuaranteedArchetype {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  description: string;
  minMarks: number;
  maxMarks: number;
  typicalFormats: string[];
  appearsEveryYear: boolean;
  historicalRate: number;
}

export const GUARANTEED_MATHS_ARCHETYPES: GuaranteedArchetype[] = [
  {
    subject: "Maths",
    topic: "Triangles",
    subtopic: "BPT (Basic Proportionality Theorem)",
    description: "BPT proof or converse application",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Triangles",
    subtopic: "Pythagoras/Converse",
    description: "Pythagoras theorem application or proof",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long", "Case-Based"],
    appearsEveryYear: true,
    historicalRate: 0.89,
  },
  {
    subject: "Maths",
    topic: "Trigonometry",
    subtopic: "Trig Identities/Proofs",
    description: "Trigonometric identity proof or simplification",
    minMarks: 2,
    maxMarks: 3,
    typicalFormats: ["Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Trigonometry",
    subtopic: "Application/Heights & Distances",
    description: "Heights and distances application problem",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Long", "Case-Based"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Circles",
    subtopic: "Tangent Theorems & Proofs",
    description: "Tangent construction or property proof",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Arithmetic Progression",
    subtopic: "Sum of n Terms",
    description: "AP sum or nth term problem",
    minMarks: 2,
    maxMarks: 3,
    typicalFormats: ["Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Statistics",
    subtopic: "Mean (Step Deviation)",
    description: "Mean or median calculation for grouped data",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Coordinate Geometry",
    subtopic: "Distance Formula",
    description: "Distance or section formula application",
    minMarks: 1,
    maxMarks: 3,
    typicalFormats: ["MCQ", "Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Surface Areas and Volumes",
    subtopic: "Cylinder/Cone/Sphere",
    description: "Surface area or volume calculation",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Probability",
    subtopic: "Single Event Probability",
    description: "Single event probability problem",
    minMarks: 1,
    maxMarks: 3,
    typicalFormats: ["MCQ", "Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Quadratic Equations",
    subtopic: "Nature of Roots (Discriminant)",
    description: "Discriminant-based nature of roots",
    minMarks: 1,
    maxMarks: 3,
    typicalFormats: ["MCQ", "Assertion-Reasoning", "Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Maths",
    topic: "Real Numbers",
    subtopic: "Fundamental Theorem of Arithmetic",
    description: "HCF/LCM using prime factorisation",
    minMarks: 1,
    maxMarks: 2,
    typicalFormats: ["MCQ", "Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
];

export const GUARANTEED_SCIENCE_ARCHETYPES: GuaranteedArchetype[] = [
  {
    subject: "Science",
    topic: "Electricity",
    subtopic: "Ohm's Law & Circuit Numericals",
    description: "Ohm's law numerical with series/parallel circuits",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Science",
    topic: "Light – Reflection & Refraction",
    subtopic: "Mirror / Lens Formula & Ray Diagrams",
    description: "Ray diagram + mirror/lens formula numerical",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Science",
    topic: "Chemical Reactions & Equations",
    subtopic: "Balancing Equations & Types of Reactions",
    description: "Chemical equation balancing and reaction types",
    minMarks: 2,
    maxMarks: 3,
    typicalFormats: ["Short"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Science",
    topic: "Life Processes",
    subtopic: "Nutrition & Respiration (Human + Plants)",
    description: "Life processes diagram-based question",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Science",
    topic: "How do Organisms Reproduce?",
    subtopic: "Sexual Reproduction in Humans & Plants",
    description: "Reproduction diagram or process explanation",
    minMarks: 3,
    maxMarks: 5,
    typicalFormats: ["Short", "Long"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
  {
    subject: "Science",
    topic: "Heredity",
    subtopic: "Mendel's Experiments & Ratios",
    description: "Monohybrid/dihybrid cross with ratios",
    minMarks: 2,
    maxMarks: 3,
    typicalFormats: ["Short"],
    appearsEveryYear: true,
    historicalRate: 0.89,
  },
  {
    subject: "Science",
    topic: "Carbon & its Compounds",
    subtopic: "Properties of Ethanol & Ethanoic Acid",
    description: "Carbon compound properties and reactions",
    minMarks: 2,
    maxMarks: 3,
    typicalFormats: ["Short", "Case-Based"],
    appearsEveryYear: true,
    historicalRate: 0.89,
  },
  {
    subject: "Science",
    topic: "Acids, Bases & Salts",
    subtopic: "pH, Indicators & Strength",
    description: "pH scale, indicators, acid-base properties",
    minMarks: 1,
    maxMarks: 3,
    typicalFormats: ["MCQ", "Short", "Assertion-Reasoning"],
    appearsEveryYear: true,
    historicalRate: 1.0,
  },
];

function norm(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

export function isGuaranteedArchetype(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string
): GuaranteedArchetype | null {
  const archetypes = subject === "Maths"
    ? GUARANTEED_MATHS_ARCHETYPES
    : GUARANTEED_SCIENCE_ARCHETYPES;

  for (const arch of archetypes) {
    if (fuzzyMatch(arch.topic, topic) && fuzzyMatch(arch.subtopic, subtopic)) {
      return arch;
    }
  }
  return null;
}

export function getGuaranteedArchetypes(subject: "Maths" | "Science"): GuaranteedArchetype[] {
  return subject === "Maths"
    ? [...GUARANTEED_MATHS_ARCHETYPES]
    : [...GUARANTEED_SCIENCE_ARCHETYPES];
}

export function getGuaranteedBoost(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string
): number {
  const arch = isGuaranteedArchetype(subject, topic, subtopic);
  if (!arch) return 0;
  return arch.appearsEveryYear ? 0.20 : arch.historicalRate * 0.15;
}
