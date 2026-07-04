export interface VisualConcept {
  id: string;
  title: string;
  chapter: string;
  subject: "maths" | "science";
  filePath: string;
  keywords: string[];
  isInteractive: boolean;
  // Set on RASTER source figures (extracted exam diagrams/tables/photos). When
  // present, this concept belongs to a specific question and is resolved by
  // questionId (see getFiguresForQuestion), not by keyword heuristics. A raster
  // figure has isInteractive:false and a non-".html" filePath (e.g. ".webp").
  questionId?: string;
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

// =============================================================================
// RASTER SOURCE FIGURES — extracted exam diagrams/tables/photos, one or more per
// question, bound by questionId (NOT keyword heuristics). These are deliberately
// kept OUT of MATHS_VISUALS/concepts so they never pollute the interactive-
// explainer keyword scoring; resolve them only via getFiguresForQuestion().
// filePath points at a committed raster under public/visuals; isInteractive:false.
// Source: Z3 Competency bank (see questionBanks/.../competency.z3.ts). The render
// surface (QuestionVisualAid) shows these as <img>, in source order.
// =============================================================================
export const MATHS_FIGURE_VISUALS: VisualConcept[] = [
  { id: "maths-real-numbers-fig-z3-rn-003", title: "Source figure", chapter: "Real Numbers", subject: "maths", filePath: "/visuals/maths/real-numbers/z3-rn-003.webp", keywords: [], isInteractive: false, questionId: "Z3-RN-003" },
  { id: "maths-real-numbers-fig-z3-rn-004", title: "Source figure", chapter: "Real Numbers", subject: "maths", filePath: "/visuals/maths/real-numbers/z3-rn-004.webp", keywords: [], isInteractive: false, questionId: "Z3-RN-004" },
  { id: "maths-linear-equations-fig-z3-ple-001", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-001.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-001" },
  { id: "maths-linear-equations-fig-z3-ple-002", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-002.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-002" },
  { id: "maths-linear-equations-fig-z3-ple-003", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-003.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-003" },
  { id: "maths-linear-equations-fig-z3-ple-004", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-004.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-004" },
  { id: "maths-linear-equations-fig-z3-ple-005", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-005.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-005" },
  { id: "maths-linear-equations-fig-z3-ple-006", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-006.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-006" },
  { id: "maths-linear-equations-fig-z3-ple-007", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-007.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-007" },
  { id: "maths-linear-equations-fig-z3-ple-008", title: "Source figure 1", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-008.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-008" },
  { id: "maths-linear-equations-fig-z3-ple-008-2", title: "Source figure 2", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-008-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-008" },
  { id: "maths-linear-equations-fig-z3-ple-009", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-009.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-009" },
  { id: "maths-linear-equations-fig-z3-ple-010", title: "Source figure", chapter: "Pair of Linear Equations", subject: "maths", filePath: "/visuals/maths/linear-equations/z3-ple-010.webp", keywords: [], isInteractive: false, questionId: "Z3-PLE-010" },
  { id: "maths-quadratic-equations-fig-z3-qe-001", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-001.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-001" },
  { id: "maths-quadratic-equations-fig-z3-qe-002", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-002.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-002" },
  { id: "maths-quadratic-equations-fig-z3-qe-003", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-003.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-003" },
  { id: "maths-quadratic-equations-fig-z3-qe-004", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-004.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-004" },
  { id: "maths-quadratic-equations-fig-z3-qe-005", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-005.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-005" },
  { id: "maths-quadratic-equations-fig-z3-qe-006", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-006.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-006" },
  { id: "maths-quadratic-equations-fig-z3-qe-007", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-007.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-007" },
  { id: "maths-quadratic-equations-fig-z3-qe-008", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-008.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-008" },
  { id: "maths-quadratic-equations-fig-z3-qe-009", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-009.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-009" },
  { id: "maths-quadratic-equations-fig-z3-qe-010", title: "Source figure", chapter: "Quadratic Equations", subject: "maths", filePath: "/visuals/maths/quadratic-equations/z3-qe-010.webp", keywords: [], isInteractive: false, questionId: "Z3-QE-010" },
  { id: "maths-arithmetic-progression-fig-z3-ap-001", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-001.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-001" },
  { id: "maths-arithmetic-progression-fig-z3-ap-002", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-002.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-002" },
  { id: "maths-arithmetic-progression-fig-z3-ap-003", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-003.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-003" },
  { id: "maths-arithmetic-progression-fig-z3-ap-004", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-004.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-004" },
  { id: "maths-arithmetic-progression-fig-z3-ap-005", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-005.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-005" },
  { id: "maths-arithmetic-progression-fig-z3-ap-006", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-006.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-006" },
  { id: "maths-arithmetic-progression-fig-z3-ap-007", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-007.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-007" },
  { id: "maths-arithmetic-progression-fig-z3-ap-008", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-008.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-008" },
  { id: "maths-arithmetic-progression-fig-z3-ap-009", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-009.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-009" },
  { id: "maths-arithmetic-progression-fig-z3-ap-010", title: "Source figure", chapter: "Arithmetic Progression", subject: "maths", filePath: "/visuals/maths/arithmetic-progression/z3-ap-010.webp", keywords: [], isInteractive: false, questionId: "Z3-AP-010" },
  { id: "maths-triangles-fig-z3-tr-001", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-001.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-001" },
  { id: "maths-triangles-fig-z3-tr-002", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-002.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-002" },
  { id: "maths-triangles-fig-z3-tr-003", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-003.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-003" },
  { id: "maths-triangles-fig-z3-tr-004", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-004.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-004" },
  { id: "maths-triangles-fig-z3-tr-005", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-005.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-005" },
  { id: "maths-triangles-fig-z3-tr-006", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-006.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-006" },
  { id: "maths-triangles-fig-z3-tr-007", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-007.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-007" },
  { id: "maths-triangles-fig-z3-tr-008", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-008.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-008" },
  { id: "maths-triangles-fig-z3-tr-009", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-009.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-009" },
  { id: "maths-triangles-fig-z3-tr-010", title: "Source figure", chapter: "Triangles", subject: "maths", filePath: "/visuals/maths/triangles/z3-tr-010.webp", keywords: [], isInteractive: false, questionId: "Z3-TR-010" },
  { id: "maths-coordinate-geometry-fig-z3-cg-001", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-001.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-001" },
  { id: "maths-coordinate-geometry-fig-z3-cg-002", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-002.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-002" },
  { id: "maths-coordinate-geometry-fig-z3-cg-002-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-002-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-002" },
  { id: "maths-coordinate-geometry-fig-z3-cg-003", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-003.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-003" },
  { id: "maths-coordinate-geometry-fig-z3-cg-004", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-004.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-004" },
  { id: "maths-coordinate-geometry-fig-z3-cg-004-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-004-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-004" },
  { id: "maths-coordinate-geometry-fig-z3-cg-005", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-005.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-005" },
  { id: "maths-coordinate-geometry-fig-z3-cg-006", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-006.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-006" },
  { id: "maths-coordinate-geometry-fig-z3-cg-006-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-006-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-006" },
  { id: "maths-coordinate-geometry-fig-z3-cg-007", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-007.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-007" },
  { id: "maths-coordinate-geometry-fig-z3-cg-008", title: "Source figure 1", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-008.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-008" },
  { id: "maths-coordinate-geometry-fig-z3-cg-008-2", title: "Source figure 2", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-008-2.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-008" },
  { id: "maths-coordinate-geometry-fig-z3-cg-009", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-009.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-009" },
  { id: "maths-coordinate-geometry-fig-z3-cg-010", title: "Source figure", chapter: "Coordinate Geometry", subject: "maths", filePath: "/visuals/maths/coordinate-geometry/z3-cg-010.webp", keywords: [], isInteractive: false, questionId: "Z3-CG-010" },
  { id: "maths-trigonometry-fig-z3-tg-001", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-001.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-001" },
  { id: "maths-trigonometry-fig-z3-tg-003", title: "Source figure 1", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-003.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-003" },
  { id: "maths-trigonometry-fig-z3-tg-003-2", title: "Source figure 2", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-003-2.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-003" },
  { id: "maths-trigonometry-fig-z3-tg-004", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-004.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-004" },
  { id: "maths-trigonometry-fig-z3-tg-005", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-005.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-005" },
  { id: "maths-trigonometry-fig-z3-tg-006", title: "Source figure 1", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-006.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-006" },
  { id: "maths-trigonometry-fig-z3-tg-006-2", title: "Source figure 2", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-006-2.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-006" },
  { id: "maths-trigonometry-fig-z3-tg-007", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-007.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-007" },
  { id: "maths-trigonometry-fig-z3-tg-008", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-008.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-008" },
  { id: "maths-trigonometry-fig-z3-tg-009", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-009.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-009" },
  { id: "maths-trigonometry-fig-z3-tg-010", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-010.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-010" },
  { id: "maths-trigonometry-fig-z3-tg-101", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-101.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-101" },
  { id: "maths-trigonometry-fig-z3-tg-102", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-102.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-102" },
  { id: "maths-trigonometry-fig-z3-tg-103", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-103.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-103" },
  { id: "maths-trigonometry-fig-z3-tg-104", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-104.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-104" },
  { id: "maths-trigonometry-fig-z3-tg-105", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-105.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-105" },
  { id: "maths-trigonometry-fig-z3-tg-106", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-106.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-106" },
  { id: "maths-trigonometry-fig-z3-tg-108", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-108.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-108" },
  { id: "maths-trigonometry-fig-z3-tg-109", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-109.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-109" },
  { id: "maths-trigonometry-fig-z3-tg-110", title: "Source figure", chapter: "Trigonometry", subject: "maths", filePath: "/visuals/maths/trigonometry/z3-tg-110.webp", keywords: [], isInteractive: false, questionId: "Z3-TG-110" },
  { id: "maths-circles-fig-z3-ci-001", title: "Source figure", chapter: "Circles", subject: "maths", filePath: "/visuals/maths/circles/z3-ci-001.webp", keywords: [], isInteractive: false, questionId: "Z3-CI-001" },
  { id: "maths-areas-circles-fig-z3-arc-001", title: "Source figure 1", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-001.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-001" },
  { id: "maths-areas-circles-fig-z3-arc-001-2", title: "Source figure 2", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-001-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-001" },
  { id: "maths-areas-circles-fig-z3-arc-002", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-002.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-002" },
  { id: "maths-areas-circles-fig-z3-arc-003", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-003.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-003" },
  { id: "maths-areas-circles-fig-z3-arc-004", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-004.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-004" },
  { id: "maths-areas-circles-fig-z3-arc-005", title: "Source figure", chapter: "Areas Related to Circles", subject: "maths", filePath: "/visuals/maths/areas-circles/z3-arc-005.webp", keywords: [], isInteractive: false, questionId: "Z3-ARC-005" },
  { id: "maths-surface-areas-volumes-fig-z3-sav-004", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/visuals/maths/surface-areas-volumes/z3-sav-004.webp", keywords: [], isInteractive: false, questionId: "Z3-SAV-004" },
  { id: "maths-surface-areas-volumes-fig-z3-sav-005", title: "Source figure 1", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/visuals/maths/surface-areas-volumes/z3-sav-005.webp", keywords: [], isInteractive: false, questionId: "Z3-SAV-005" },
  { id: "maths-surface-areas-volumes-fig-z3-sav-005-2", title: "Source figure 2", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/visuals/maths/surface-areas-volumes/z3-sav-005-2.webp", keywords: [], isInteractive: false, questionId: "Z3-SAV-005" },
  { id: "maths-surface-areas-volumes-fig-z3-sav-006", title: "Source figure", chapter: "Surface Areas and Volumes", subject: "maths", filePath: "/visuals/maths/surface-areas-volumes/z3-sav-006.webp", keywords: [], isInteractive: false, questionId: "Z3-SAV-006" },
  { id: "maths-statistics-fig-z3-st-002", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-002.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-002" },
  { id: "maths-statistics-fig-z3-st-002-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-002-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-002" },
  { id: "maths-statistics-fig-z3-st-003", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-003.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-003" },
  { id: "maths-statistics-fig-z3-st-003-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-003-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-003" },
  { id: "maths-statistics-fig-z3-st-004", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-004.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-004" },
  { id: "maths-statistics-fig-z3-st-004-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-004-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-004" },
  { id: "maths-statistics-fig-z3-st-005", title: "Source figure 1", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-statistics-fig-z3-st-005-2", title: "Source figure 2", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005-2.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-statistics-fig-z3-st-005-3", title: "Source figure 3", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005-3.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-statistics-fig-z3-st-005-4", title: "Source figure 4", chapter: "Statistics", subject: "maths", filePath: "/visuals/maths/statistics/z3-st-005-4.webp", keywords: [], isInteractive: false, questionId: "Z3-ST-005" },
  { id: "maths-probability-fig-z3-pr-001", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-001.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-001" },
  { id: "maths-probability-fig-z3-pr-001-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-001-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-001" },
  { id: "maths-probability-fig-z3-pr-002", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-002.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-002" },
  { id: "maths-probability-fig-z3-pr-002-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-002-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-002" },
  { id: "maths-probability-fig-z3-pr-003", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-003.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-003" },
  { id: "maths-probability-fig-z3-pr-004", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-004.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-004" },
  { id: "maths-probability-fig-z3-pr-005", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-005.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-005" },
  { id: "maths-probability-fig-z3-pr-006", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-006.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-006" },
  { id: "maths-probability-fig-z3-pr-007", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-007.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-007" },
  { id: "maths-probability-fig-z3-pr-007-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-007-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-007" },
  { id: "maths-probability-fig-z3-pr-008", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-008.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-008" },
  { id: "maths-probability-fig-z3-pr-008-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-008-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-008" },
  { id: "maths-probability-fig-z3-pr-009", title: "Source figure", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-009.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-009" },
  { id: "maths-probability-fig-z3-pr-010", title: "Source figure 1", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-010.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-010" },
  { id: "maths-probability-fig-z3-pr-010-2", title: "Source figure 2", chapter: "Probability", subject: "maths", filePath: "/visuals/maths/probability/z3-pr-010-2.webp", keywords: [], isInteractive: false, questionId: "Z3-PR-010" },
];

// Raster source figures for SCIENCE questions — same contract as
// MATHS_FIGURE_VISUALS above (id-keyed via questionId, isInteractive:false,
// deliberately outside SCIENCE_VISUALS/concepts so keyword-heuristic explainer
// scoring never sees them). Light figures: Foundation-pack extraction PILOT
// (2026-07-03), every binding eye-confirmed against its question.
export const SCIENCE_FIGURE_VISUALS: VisualConcept[] = [
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-002", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-002.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-002" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-004", title: "Source figure 1", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-004.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-004" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-004-2", title: "Source figure 2", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-004-2.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-004" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-025", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-025.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-025" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-029", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-029.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-029" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-030", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-030.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-030" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-042", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-042.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-042" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-043", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-043.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-043" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-057", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-057.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-057" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-086", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-086.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-086" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-090", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-090.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-090" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-093", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-093.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-093" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-098", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-098.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-098" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-106", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-106.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-106" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-107", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-107.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-107" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-157", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-157.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-157" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-bd-01", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-bd-01.webp", keywords: [], isInteractive: false, questionId: "FND-L-BD-01" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-bd-06", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-bd-06.webp", keywords: [], isInteractive: false, questionId: "FND-L-BD-06" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-spx-005", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-spx-005.webp", keywords: [], isInteractive: false, questionId: "FND-L-SPX-005" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-117", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-117.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-117" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-150", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-150.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-150" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-160", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-160.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-160" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-171", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-171.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-171" },
  { id: "science-light-reflection-and-refraction-fig-fnd-l-qb-175", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/fnd-l-qb-175.webp", keywords: [], isInteractive: false, questionId: "FND-L-QB-175" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-003", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-003.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-003" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-004", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-004.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-004" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-005", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-004.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-005" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-006", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-006.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-006" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-009", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-009.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-009" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-014", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-014.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-014" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-015", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-015.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-015" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-017", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-017.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-017" },
  { id: "science-light-reflection-and-refraction-fig-cfpq-s-lght-018", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/cfpq-s-lght-018.webp", keywords: [], isInteractive: false, questionId: "CFPQ-S-LGHT-018" },
  { id: "science-light-reflection-and-refraction-fig-sqp-s-2025-lght-033", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/sqp-s-2025-lght-033.webp", keywords: [], isInteractive: false, questionId: "SQP-S-2025-LGHT-033" },
  { id: "science-light-reflection-and-refraction-fig-sqp-s-2025-lght-038", title: "Source figure", chapter: "Light - Reflection & Refraction", subject: "science", filePath: "/visuals/science/light-reflection-and-refraction/sqp-s-2025-lght-038.webp", keywords: [], isInteractive: false, questionId: "SQP-S-2025-LGHT-038" },
];

/**
 * Resolve the RASTER source figure(s) bound to a specific question id, in source
 * order. Returns [] when the question has no bound figure (the common case for
 * the 6,500+ questions that carry none) — callers fall back to their existing
 * heuristic visual. Exact, id-keyed, and never heuristic: a wrong figure is
 * worse than none.
 */
export function getFiguresForQuestion(questionId: string | undefined | null): VisualConcept[] {
  if (!questionId) return [];
  return [...MATHS_FIGURE_VISUALS, ...SCIENCE_FIGURE_VISUALS].filter(
    (f) => f.questionId === questionId
  );
}

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

export interface QuestionMatchResult {
  concept: VisualConcept | null;
  score: number;
  isFallback: boolean;
}

export function findVisualForQuestionWithScore(
  questionText: string,
  topicKey?: string,
  subject?: string,
): QuestionMatchResult {
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
      const isFallback = !bestMatch || bestScore <= 2;
      return {
        concept: isFallback ? chapterVisuals[0] : bestMatch,
        score: bestScore,
        isFallback,
      };
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

  const isFallback = bestScore <= 3;
  return {
    concept: isFallback ? null : bestMatch,
    score: bestScore,
    isFallback,
  };
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
  // No usable search terms → we cannot confidently identify the concept. Return NO
  // visual rather than silently serving concepts[0] (an UNRELATED interactive — e.g.
  // always "Similar Triangles" for any Triangles concept). Anti-fabrication applied
  // to visuals: a missing interactive is honest; a wrong one is not. (PR-C)
  if (terms.length === 0) return null;

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

  // Below the confidence threshold (a weak/fallback match) → return NO visual rather
  // than concepts[0]. A low-scoring match would surface an unrelated interactive
  // (e.g. a generic "trigonometry"/"statistics" slug with no concept hit). The
  // threshold mirrors the fallback semantics of the sibling resolver above
  // (score <= 3 == fallback → null). The correct-match path (score > threshold) is
  // unchanged. (PR-C — earned-reveal anti-fabrication: no visual beats the wrong one.)
  const CONFIDENCE_THRESHOLD = 3;
  if (!bestMatch || bestScore <= CONFIDENCE_THRESHOLD) return null;
  return bestMatch;
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

export interface ConceptMatchResult {
  concept: VisualConcept | null;
  score: number;
  isFallback: boolean;
}

export function findVisualForConceptWithScore(
  subject: string,
  chapterKey: string,
  searchTerms: string[]
): ConceptMatchResult {
  const subjectNorm = subject.toLowerCase().includes("sci") ? "science" : "maths";
  const chapters = subjectNorm === "science" ? SCIENCE_VISUALS : MATHS_VISUALS;

  const resolvedKey = topicKeyToChapterMap[chapterKey] ?? chapterKey;
  const chapterNorm = resolvedKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const chapter = chapters.find((ch) => {
    const k = ch.chapterKey.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return k === chapterNorm || k.includes(chapterNorm) || chapterNorm.includes(k);
  });

  if (!chapter) return { concept: null, score: 0, isFallback: true };

  const terms = searchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (terms.length === 0) {
    return { concept: chapter.concepts[0] ?? null, score: 0, isFallback: true };
  }

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

  const isFallback = bestScore === 0;
  const result = bestMatch ?? chapter.concepts[0] ?? null;
  return { concept: result, score: bestScore, isFallback };
}

export function tokenizeForVisualSearch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function scoreConceptFull(concept: VisualConcept, terms: string[]): number {
  let score = 0;
  const titleLower = concept.title.toLowerCase();
  const allKeywords = [...concept.keywords, ...titleLower.split(/\s+/)];
  for (const term of terms) {
    if (titleLower.includes(term)) score += 3;
    for (const kw of allKeywords) {
      if (kw.includes(term) || term.includes(kw)) score += 1;
    }
  }
  return score;
}

export function scoreConceptByKeywordsOnly(concept: VisualConcept, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    for (const kw of concept.keywords) {
      if (kw.toLowerCase().includes(term) || term.includes(kw.toLowerCase())) score += 1;
    }
  }
  return score;
}
