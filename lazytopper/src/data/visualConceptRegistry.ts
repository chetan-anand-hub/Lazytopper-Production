export interface VisualConcept {
  id: string;
  title: string;
  chapter: string;
  subject: "maths" | "science";
  filePath: string;
  keywords: string[];
  isInteractive: boolean;
}

export interface ChapterVisuals {
  chapterKey: string;
  chapterName: string;
  subject: "maths" | "science";
  concepts: VisualConcept[];
}

function makeId(subject: string, chapter: string, concept: string): string {
  return `${subject}-${chapter}-${concept}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makePath(subject: string, chapter: string, concept: string): string {
  const s = subject.toLowerCase();
  const ch = chapter.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const co = concept.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `/visuals/${s}/${ch}/${co}.html`;
}

function c(subject: "maths" | "science", chapter: string, concept: string, keywords: string[], isInteractive = true): VisualConcept {
  return {
    id: makeId(subject, chapter, concept),
    title: concept,
    chapter,
    subject,
    filePath: makePath(subject, chapter, concept),
    keywords,
    isInteractive,
  };
}

export const MATHS_VISUALS: ChapterVisuals[] = [
  {
    chapterKey: "Real Numbers",
    chapterName: "Real Numbers",
    subject: "maths",
    concepts: [
      c("maths", "real-numbers", "Fundamental Theorem of Arithmetic", ["prime", "factorisation", "unique", "fundamental", "hcf", "lcm", "factors", "composite"]),
      c("maths", "real-numbers", "HCF and LCM using Prime Factorisation", ["hcf", "lcm", "prime", "factors"]),
      c("maths", "real-numbers", "Irrational Numbers Proof", ["irrational", "proof", "contradiction", "sqrt2", "sqrt3", "sqrt5"]),
      c("maths", "real-numbers", "Decimal Expansions", ["decimal", "terminating", "non-terminating", "repeating", "rational"]),
    ],
  },
  {
    chapterKey: "Polynomials",
    chapterName: "Polynomials",
    subject: "maths",
    concepts: [
      c("maths", "polynomials", "Zeroes of a Polynomial", ["zeroes", "roots", "graph", "x-axis"]),
      c("maths", "polynomials", "Relationship between Zeroes and Coefficients", ["sum", "product", "zeroes", "coefficients", "vieta"]),
      c("maths", "polynomials", "Graphical Meaning of Zeroes", ["parabola", "graph", "intersection", "quadratic"]),
    ],
  },
  {
    chapterKey: "Pair of Linear Equations",
    chapterName: "Pair of Linear Equations in Two Variables",
    subject: "maths",
    concepts: [
      c("maths", "linear-equations", "Graphical Method", ["graph", "intersection", "lines", "solution"]),
      c("maths", "linear-equations", "Substitution Method", ["substitution", "solve", "variable", "replace"]),
      c("maths", "linear-equations", "Elimination Method", ["elimination", "add", "subtract", "cancel"]),
      c("maths", "linear-equations", "Consistency of Equations", ["consistent", "inconsistent", "parallel", "coincident", "ratios"]),
    ],
  },
  {
    chapterKey: "Quadratic Equations",
    chapterName: "Quadratic Equations",
    subject: "maths",
    concepts: [
      c("maths", "quadratic-equations", "Standard Form and Roots", ["ax2+bx+c", "roots", "standard", "quadratic"]),
      c("maths", "quadratic-equations", "Factorisation Method", ["splitting", "middle", "term", "factors"]),
      c("maths", "quadratic-equations", "Quadratic Formula", ["formula", "discriminant", "b2-4ac", "shridharacharya"]),
      c("maths", "quadratic-equations", "Nature of Roots using Discriminant", ["discriminant", "real", "equal", "distinct", "imaginary"]),
    ],
  },
  {
    chapterKey: "Arithmetic Progression",
    chapterName: "Arithmetic Progressions",
    subject: "maths",
    concepts: [
      c("maths", "arithmetic-progression", "AP Definition and Common Difference", ["ap", "common", "difference", "sequence", "d"]),
      c("maths", "arithmetic-progression", "nth Term Formula", ["nth", "term", "an", "formula", "a+(n-1)d"]),
      c("maths", "arithmetic-progression", "Sum of n Terms", ["sum", "sn", "formula", "n/2"]),
      c("maths", "arithmetic-progression", "AP Number Line Visualization", ["number", "line", "equal", "spacing", "visualization"]),
    ],
  },
  {
    chapterKey: "Triangles",
    chapterName: "Triangles",
    subject: "maths",
    concepts: [
      c("maths", "triangles", "Similar Triangles and Criteria", ["similar", "AA", "SSS", "SAS", "criteria"]),
      c("maths", "triangles", "Basic Proportionality Theorem", ["BPT", "thales", "parallel", "ratio", "proportionality"]),
      c("maths", "triangles", "Pythagoras Theorem Visual Proof", ["pythagoras", "right", "triangle", "hypotenuse", "proof"]),
      c("maths", "triangles", "Areas of Similar Triangles", ["area", "ratio", "square", "sides", "similar"]),
    ],
  },
  {
    chapterKey: "Coordinate Geometry",
    chapterName: "Coordinate Geometry",
    subject: "maths",
    concepts: [
      c("maths", "coordinate-geometry", "Distance Formula", ["distance", "formula", "two", "points", "sqrt"]),
      c("maths", "coordinate-geometry", "Section Formula", ["section", "ratio", "midpoint", "internal", "division"]),
      c("maths", "coordinate-geometry", "Coordinate Plane Plotter", ["plot", "axes", "quadrant", "point"]),
      c("maths", "coordinate-geometry", "Collinearity Condition", ["collinear", "collinearity", "area", "triangle", "zero", "three", "points", "condition"]),
    ],
  },
  {
    chapterKey: "Trigonometry",
    chapterName: "Introduction to Trigonometry & Applications",
    subject: "maths",
    concepts: [
      c("maths", "trigonometry", "Trigonometric Ratios", ["sin", "cos", "tan", "ratio", "right", "triangle"]),
      c("maths", "trigonometry", "Trigonometric Ratios of Standard Angles", ["0", "30", "45", "60", "90", "table"]),
      c("maths", "trigonometry", "Trigonometric Identities", ["sin2+cos2=1", "identity", "prove"]),
      c("maths", "trigonometry", "Height and Distance Problems", ["height", "distance", "angle", "elevation", "depression"]),
    ],
  },
  {
    chapterKey: "Circles",
    chapterName: "Circles",
    subject: "maths",
    concepts: [
      c("maths", "circles", "Tangent to a Circle", ["tangent", "point", "contact", "perpendicular", "radius"]),
      c("maths", "circles", "Number of Tangents from External Point", ["two", "tangents", "external", "equal", "length"]),
      c("maths", "circles", "Tangent Properties", ["tangent", "radius", "perpendicular", "theorem"]),
    ],
  },
  {
    chapterKey: "Areas Related to Circles",
    chapterName: "Areas Related to Circles",
    subject: "maths",
    concepts: [
      c("maths", "areas-circles", "Sector and Segment", ["sector", "segment", "arc", "angle", "area"]),
      c("maths", "areas-circles", "Area of Sector Formula", ["area", "sector", "theta", "360", "formula"]),
      c("maths", "areas-circles", "Combined Figures Area", ["combined", "shaded", "region", "subtract"]),
    ],
  },
  {
    chapterKey: "Surface Areas and Volumes",
    chapterName: "Surface Areas and Volumes",
    subject: "maths",
    concepts: [
      c("maths", "surface-areas-volumes", "Combination of Solids", ["combination", "cone", "cylinder", "hemisphere"]),
      c("maths", "surface-areas-volumes", "Conversion of Solids", ["melt", "recast", "volume", "conservation"]),
      c("maths", "surface-areas-volumes", "Surface Area Formulas", ["total", "curved", "surface", "area", "CSA", "TSA", "cylinder", "cone", "sphere", "hemisphere"]),
    ],
  },
  {
    chapterKey: "Statistics",
    chapterName: "Statistics",
    subject: "maths",
    concepts: [
      c("maths", "statistics", "Mean of Grouped Data", ["mean", "assumed", "direct", "step", "deviation"]),
      c("maths", "statistics", "Median of Grouped Data", ["median", "cumulative", "frequency", "class"]),
      c("maths", "statistics", "Mode of Grouped Data", ["mode", "modal", "class", "frequency"]),
      c("maths", "statistics", "Frequency Distribution Table", ["frequency", "distribution", "table", "tally", "class", "interval", "cumulative", "grouped"]),
      c("maths", "statistics", "Central Tendency Comparison", ["mean", "median", "mode", "central", "tendency", "choosing", "right", "measure", "skewed", "outlier", "empirical"]),
    ],
  },
  {
    chapterKey: "Probability",
    chapterName: "Probability",
    subject: "maths",
    concepts: [
      c("maths", "probability", "Classical Probability", ["classical", "equally", "likely", "outcomes", "events"]),
      c("maths", "probability", "Complementary Events", ["complementary", "P(not E)", "1-P(E)"]),
      c("maths", "probability", "Dice and Cards Sample Space", ["dice", "cards", "sample", "space", "outcomes"]),
      c("maths", "probability", "Favourable Outcomes", ["favourable", "favorable", "n(E)", "count", "identify", "desired", "satisfy"]),
      c("maths", "probability", "Sample Space for Compound Events", ["compound", "two coins", "two dice", "ordered pair", "simultaneously", "combined", "at least one", "head", "tail", "joint"]),
      c("maths", "probability", "Experimental Probability", ["experimental", "frequency", "trials", "relative", "observed", "survey", "data", "empirical", "repeated"]),
    ],
  },
];

export const SCIENCE_VISUALS: ChapterVisuals[] = [
  {
    chapterKey: "Chemical Reactions and Equations",
    chapterName: "Chemical Reactions and Equations",
    subject: "science",
    concepts: [
      c("science", "chemical-reactions", "Types of Chemical Reactions", ["combination", "decomposition", "displacement", "double"]),
      c("science", "chemical-reactions", "Balancing Chemical Equations", ["balance", "atoms", "reactants", "products"]),
      c("science", "chemical-reactions", "Oxidation and Reduction", ["oxidation", "reduction", "redox", "gain", "loss"]),
      c("science", "chemical-reactions", "Corrosion and Rancidity", ["corrosion", "rancidity", "iron", "rust"]),
    ],
  },
  {
    chapterKey: "Acids Bases and Salts",
    chapterName: "Acids, Bases and Salts",
    subject: "science",
    concepts: [
      c("science", "acids-bases-salts", "pH Scale", ["pH", "acidic", "basic", "neutral", "indicator"]),
      c("science", "acids-bases-salts", "Acid Base Reactions", ["neutralisation", "salt", "water", "reaction"]),
      c("science", "acids-bases-salts", "Common Salt and its Products", ["NaCl", "bleaching", "baking", "washing", "soda"]),
    ],
  },
  {
    chapterKey: "Metals and Non-Metals",
    chapterName: "Metals and Non-Metals",
    subject: "science",
    concepts: [
      c("science", "metals-nonmetals", "Physical Properties of Metals", ["lustre", "malleable", "ductile", "conductor"]),
      c("science", "metals-nonmetals", "Reactivity Series", ["reactivity", "series", "displacement", "order"]),
      c("science", "metals-nonmetals", "Ionic Bonding", ["ionic", "bond", "transfer", "electron", "NaCl"]),
      c("science", "metals-nonmetals", "Extraction of Metals", ["extraction", "ore", "roasting", "calcination", "electrolysis"]),
    ],
  },
  {
    chapterKey: "Carbon and its Compounds",
    chapterName: "Carbon and its Compounds",
    subject: "science",
    concepts: [
      c("science", "carbon-compounds", "Covalent Bonding in Carbon", ["covalent", "sharing", "electron", "tetravalent"]),
      c("science", "carbon-compounds", "Homologous Series", ["homologous", "CH2", "series", "properties"]),
      c("science", "carbon-compounds", "Functional Groups", ["alcohol", "aldehyde", "ketone", "carboxylic", "functional"]),
      c("science", "carbon-compounds", "Carbon Chain Structures", ["straight", "branched", "cyclic", "isomers"]),
      c("science", "carbon-compounds", "Soaps and Detergents", ["soap", "detergent", "cleansing", "action", "micelle", "hydrophilic", "hydrophobic", "saponification", "hard", "water"]),
    ],
  },
  {
    chapterKey: "Life Processes",
    chapterName: "Life Processes",
    subject: "science",
    concepts: [
      c("science", "life-processes", "Nutrition in Humans", ["digestion", "stomach", "intestine", "enzyme", "alimentary"]),
      c("science", "life-processes", "Photosynthesis", ["chlorophyll", "sunlight", "CO2", "glucose", "oxygen"]),
      c("science", "life-processes", "Human Heart and Blood Circulation", ["heart", "atrium", "ventricle", "circulation", "double"]),
      c("science", "life-processes", "Respiration and Excretion", ["aerobic", "anaerobic", "kidney", "nephron"]),
    ],
  },
  {
    chapterKey: "Control and Coordination",
    chapterName: "Control and Coordination",
    subject: "science",
    concepts: [
      c("science", "control-coordination", "Nervous System", ["brain", "spinal", "cord", "neuron", "reflex"]),
      c("science", "control-coordination", "Reflex Arc", ["reflex", "arc", "stimulus", "response", "involuntary"]),
      c("science", "control-coordination", "Plant Hormones and Tropisms", ["auxin", "phototropism", "geotropism", "hormone"]),
    ],
  },
  {
    chapterKey: "How do Organisms Reproduce",
    chapterName: "How do Organisms Reproduce?",
    subject: "science",
    concepts: [
      c("science", "reproduction", "Types of Asexual Reproduction", ["binary", "fission", "budding", "fragmentation", "spore"]),
      c("science", "reproduction", "Human Reproductive System", ["male", "female", "reproductive", "organs"]),
      c("science", "reproduction", "Flower Structure and Pollination", ["stamen", "pistil", "pollen", "pollination"]),
    ],
  },
  {
    chapterKey: "Heredity",
    chapterName: "Heredity",
    subject: "science",
    concepts: [
      c("science", "heredity-evolution", "Mendels Laws of Inheritance", ["mendel", "dominant", "recessive", "F1", "F2"]),
      c("science", "heredity-evolution", "Sex Determination", ["XX", "XY", "sex", "chromosome", "determination"]),
    ],
  },
  {
    chapterKey: "Light Reflection and Refraction",
    chapterName: "Light – Reflection and Refraction",
    subject: "science",
    concepts: [
      c("science", "light", "Reflection of Light", ["reflection", "mirror", "concave", "convex", "image"]),
      c("science", "light", "Mirror Formula and Magnification", ["mirror", "formula", "1/v+1/u=1/f", "magnification"]),
      c("science", "light", "Refraction of Light", ["refraction", "snell", "bending", "medium", "speed"]),
      c("science", "light", "Lens Formula and Ray Diagrams", ["lens", "convex", "concave", "ray", "diagram", "focus"]),
    ],
  },
  {
    chapterKey: "Human Eye and Colourful World",
    chapterName: "The Human Eye and the Colourful World",
    subject: "science",
    concepts: [
      c("science", "human-eye", "Structure of Human Eye", ["cornea", "lens", "retina", "pupil", "iris"]),
      c("science", "human-eye", "Defects of Vision and Correction", ["myopia", "hypermetropia", "presbyopia", "lens"]),
      c("science", "human-eye", "Dispersion of Light and Rainbow", ["prism", "dispersion", "spectrum", "rainbow", "VIBGYOR"]),
    ],
  },
  {
    chapterKey: "Electricity",
    chapterName: "Electricity",
    subject: "science",
    concepts: [
      c("science", "electricity", "Ohms Law", ["ohm", "V=IR", "current", "voltage", "resistance"]),
      c("science", "electricity", "Series and Parallel Circuits", ["series", "parallel", "circuit", "resistor", "combination"]),
      c("science", "electricity", "Electric Power and Energy", ["power", "P=VI", "energy", "kWh", "watt"]),
      c("science", "electricity", "Circuit Diagram Builder", ["circuit", "ammeter", "voltmeter", "battery", "switch"]),
      c("science", "electricity", "Resistivity", ["resistivity", "rho", "R=rhoL/A", "length", "area", "conductor", "specific", "resistance", "intrinsic"]),
    ],
  },
  {
    chapterKey: "Magnetic Effects of Electric Current",
    chapterName: "Magnetic Effects of Electric Current",
    subject: "science",
    concepts: [
      c("science", "magnetic-effects", "Magnetic Field Lines", ["field", "lines", "bar", "magnet", "direction"]),
      c("science", "magnetic-effects", "Electromagnet and Solenoid", ["electromagnet", "solenoid", "coil", "current"]),
      c("science", "magnetic-effects", "Flemings Left Hand Rule", ["fleming", "force", "motor", "conductor", "magnetic"]),
      c("science", "magnetic-effects", "Electric Motor and Generator", ["motor", "generator", "AC", "DC", "electromagnetic"]),
    ],
  },
];

export const ALL_VISUALS: ChapterVisuals[] = [...MATHS_VISUALS, ...SCIENCE_VISUALS];

import { class10TopicRegistry } from "./class10TopicRegistry";

const topicKeyToChapterMap: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const entry of class10TopicRegistry) {
    const routeParts = entry.route.split("/").filter(Boolean);
    const routeSlug = routeParts[routeParts.length - 1] || "";
    const chapterMatch = ALL_VISUALS.find((ch) => {
      const chSlug = ch.chapterKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return chSlug === routeSlug || ch.chapterKey === entry.topicKey || ch.chapterKey === entry.topicName;
    });
    map[entry.topicKey] = chapterMatch?.chapterKey || entry.topicKey;
  }

  const scienceTopicKeys: Record<string, string> = {
    // Pretty names
    "Chemical Reactions and Equations": "Chemical Reactions and Equations",
    "Acids Bases and Salts": "Acids Bases and Salts",
    "Metals and Non-Metals": "Metals and Non-Metals",
    "Carbon and its Compounds": "Carbon and its Compounds",
    "Life Processes": "Life Processes",
    "Control and Coordination": "Control and Coordination",
    "How do Organisms Reproduce": "How do Organisms Reproduce",
    "Heredity": "Heredity",
    "Light Reflection and Refraction": "Light Reflection and Refraction",
    "Human Eye and Colourful World": "Human Eye and Colourful World",
    "Electricity": "Electricity",
    "Magnetic Effects of Electric Current": "Magnetic Effects of Electric Current",
    // Canonical slugs (as used in URL routing and TopicHub topicKey)
    "chemical-reactions-and-equations": "Chemical Reactions and Equations",
    "acids-bases-and-salts": "Acids Bases and Salts",
    "metals-and-non-metals": "Metals and Non-Metals",
    "carbon-and-its-compounds": "Carbon and its Compounds",
    "life-processes": "Life Processes",
    "control-and-co-ordination": "Control and Coordination",
    "control-and-coordination": "Control and Coordination",
    "reproduction": "How do Organisms Reproduce",
    "how-do-organisms-reproduce": "How do Organisms Reproduce",
    "heredity-and-evolution": "Heredity",
    "light-reflection-and-refraction": "Light Reflection and Refraction",
    "light-reflection-and-refraction-incl-human-eye-prism": "Light Reflection and Refraction",
    "human-eye-and-colourful-world": "Human Eye and Colourful World",
    "human-eye": "Human Eye and Colourful World",
    "electricity": "Electricity",
    "magnetic-effects-of-electric-current": "Magnetic Effects of Electric Current",
    "magnetic-effects": "Magnetic Effects of Electric Current",
    // Maths canonical slug aliases (for slugs that differ from topicKey pretty names)
    "pair-of-linear-equations": "Pair of Linear Equations",
    "pair-of-linear-equations-in-two-variables": "Pair of Linear Equations",
    "arithmetic-progressions": "Arithmetic Progression",
    "arithmetic-progression": "Arithmetic Progression",
    "areas-related-to-circles": "Areas Related to Circles",
    "surface-areas-and-volumes": "Surface Areas and Volumes",
  };
  for (const [key, val] of Object.entries(scienceTopicKeys)) {
    if (!map[key]) map[key] = val;
  }
  return map;
})();

export function getVisualsForTopicKey(topicKey: string): VisualConcept[] {
  const chapterKey = topicKeyToChapterMap[topicKey] || topicKey;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const subj = MATHS_VISUALS.some(
    (ch) => norm(ch.chapterKey) === norm(chapterKey)
  ) ? "maths" : "science";
  return getVisualsForChapter(subj, chapterKey);
}

export function findVisualForQuestion(
  questionText: string,
  topicKey?: string,
  subject?: string,
): VisualConcept | null {
  const terms = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (topicKey) {
    const chapterVisuals = getVisualsForTopicKey(topicKey);
    if (chapterVisuals.length > 0) {
      let bestMatch: VisualConcept | null = null;
      let bestScore = 0;
      for (const concept of chapterVisuals) {
        let score = 0;
        const titleLower = concept.title.toLowerCase();
        const allKeywords = [...concept.keywords, ...titleLower.split(/\s+/)];
        for (const term of terms) {
          if (titleLower.includes(term)) score += 3;
          for (const kw of allKeywords) {
            if (kw.includes(term) || term.includes(kw)) score += 1;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = concept;
        }
      }
      if (bestMatch && bestScore > 2) return bestMatch;
      return chapterVisuals[0];
    }
  }

  const subjectNorm = subject?.toLowerCase().includes("sci") ? "science" : "maths";
  const chapters = subjectNorm === "science" ? SCIENCE_VISUALS : MATHS_VISUALS;
  let bestMatch: VisualConcept | null = null;
  let bestScore = 0;

  for (const chapter of chapters) {
    for (const concept of chapter.concepts) {
      let score = 0;
      const titleLower = concept.title.toLowerCase();
      const allKeywords = [...concept.keywords, ...titleLower.split(/\s+/)];
      for (const term of terms) {
        if (titleLower.includes(term)) score += 3;
        for (const kw of allKeywords) {
          if (kw.includes(term) || term.includes(kw)) score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = concept;
      }
    }
  }

  return bestScore > 3 ? bestMatch : null;
}

export function findVisualForConcept(
  subject: string,
  chapterKey: string,
  searchTerms: string[]
): VisualConcept | null {
  const subjectNorm = subject.toLowerCase().includes("sci") ? "science" : "maths";
  const chapters = subjectNorm === "science" ? SCIENCE_VISUALS : MATHS_VISUALS;

  // Resolve canonical slugs and aliases through the lookup map before normalization
  const resolvedKey = topicKeyToChapterMap[chapterKey] ?? chapterKey;
  const chapterNorm = resolvedKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const chapter = chapters.find((ch) => {
    const k = ch.chapterKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return k === chapterNorm || k.includes(chapterNorm) || chapterNorm.includes(k);
  });

  if (!chapter) return null;

  const terms = searchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (terms.length === 0) return chapter.concepts[0] || null;

  let bestMatch: VisualConcept | null = null;
  let bestScore = 0;

  for (const concept of chapter.concepts) {
    let score = 0;
    const titleLower = concept.title.toLowerCase();
    const allKeywords = [...concept.keywords, ...titleLower.split(/\s+/)];

    for (const term of terms) {
      if (titleLower.includes(term)) score += 3;
      for (const kw of allKeywords) {
        if (kw.includes(term) || term.includes(kw)) score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = concept;
    }
  }

  // Always return at least the first concept when the chapter resolved correctly
  // — ensures every valid chapter shows a visual, even when search terms don't
  // match any specific keyword (e.g. generic "trigonometry" or "statistics" slugs)
  return bestMatch ?? chapter.concepts[0] ?? null;
}

export function getVisualsForChapter(
  subject: string,
  chapterKey: string
): VisualConcept[] {
  const subjectNorm = subject.toLowerCase().includes("sci") ? "science" : "maths";
  const chapters = subjectNorm === "science" ? SCIENCE_VISUALS : MATHS_VISUALS;
  const chapterNorm = chapterKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const chapter = chapters.find((ch) => {
    const k = ch.chapterKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return k === chapterNorm || k.includes(chapterNorm) || chapterNorm.includes(k);
  });

  return chapter?.concepts || [];
}

export function getAllConceptsList(): VisualConcept[] {
  return ALL_VISUALS.flatMap((ch) => ch.concepts);
}
