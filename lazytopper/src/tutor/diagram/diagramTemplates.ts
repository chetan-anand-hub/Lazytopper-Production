import type { DiagramSpec } from "./diagramTypes";

type DiagramTemplateInput = {
  topicKey?: string | null;
  nodeId?: string | null;
  stepSlugOrTitle?: string | null;
  diagramType?: string | null;
};

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function cloneSpec(spec: DiagramSpec): DiagramSpec {
  return JSON.parse(JSON.stringify(spec)) as DiagramSpec;
}

const AA_SIMILARITY_VARIANTS: DiagramSpec[] = [
  {
    kind: "tutor_diagram_v1",
    width: 420,
    height: 220,
    title: "AA Similarity",
    caption: "Two pairs of equal angles imply similarity.",
    points: [
      { id: "A", x: 60, y: 170, label: "A" },
      { id: "B", x: 170, y: 170, label: "B" },
      { id: "C", x: 110, y: 50, label: "C" },
      { id: "P", x: 250, y: 170, label: "P" },
      { id: "Q", x: 360, y: 170, label: "Q" },
      { id: "R", x: 310, y: 70, label: "R" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
      { from: "P", to: "Q" },
      { from: "Q", to: "R" },
      { from: "R", to: "P" },
    ],
    angleMarks: [
      { at: "A", from: "B", to: "C", radius: 16, highlight: true },
      { at: "P", from: "Q", to: "R", radius: 16, highlight: true },
      { at: "B", from: "A", to: "C", radius: 20, double: true, highlight: true },
      { at: "Q", from: "P", to: "R", radius: 20, double: true, highlight: true },
    ],
  },
  {
    kind: "tutor_diagram_v1",
    width: 420,
    height: 220,
    title: "AA Similarity",
    caption: "Match equal angles to set correspondence.",
    points: [
      { id: "A", x: 70, y: 175, label: "A" },
      { id: "B", x: 190, y: 165, label: "B" },
      { id: "C", x: 120, y: 45, label: "C" },
      { id: "P", x: 245, y: 155, label: "P" },
      { id: "Q", x: 355, y: 185, label: "Q" },
      { id: "R", x: 320, y: 70, label: "R" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
      { from: "P", to: "Q" },
      { from: "Q", to: "R" },
      { from: "R", to: "P" },
    ],
    angleMarks: [
      { at: "A", from: "B", to: "C", radius: 14, highlight: true },
      { at: "P", from: "Q", to: "R", radius: 14, highlight: true },
      { at: "B", from: "A", to: "C", radius: 18, double: true, highlight: true },
      { at: "Q", from: "P", to: "R", radius: 18, double: true, highlight: true },
    ],
  },
  {
    kind: "tutor_diagram_v1",
    width: 420,
    height: 220,
    title: "AA Similarity",
    caption: "Use parallel lines or angle facts to show equality.",
    points: [
      { id: "A", x: 65, y: 165, label: "A" },
      { id: "B", x: 180, y: 180, label: "B" },
      { id: "C", x: 100, y: 55, label: "C" },
      { id: "P", x: 255, y: 175, label: "P" },
      { id: "Q", x: 360, y: 165, label: "Q" },
      { id: "R", x: 300, y: 75, label: "R" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
      { from: "P", to: "Q" },
      { from: "Q", to: "R" },
      { from: "R", to: "P" },
    ],
    angleMarks: [
      { at: "A", from: "B", to: "C", radius: 16, highlight: true },
      { at: "P", from: "Q", to: "R", radius: 16, highlight: true },
      { at: "B", from: "A", to: "C", radius: 20, double: true, highlight: true },
      { at: "Q", from: "P", to: "R", radius: 20, double: true, highlight: true },
    ],
  },
];

const GENERIC_SIMILARITY: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 220,
  title: "Similarity",
  caption: "Two triangles with corresponding angles and sides.",
  points: [
    { id: "A", x: 60, y: 170, label: "A" },
    { id: "B", x: 170, y: 170, label: "B" },
    { id: "C", x: 120, y: 55, label: "C" },
    { id: "P", x: 245, y: 170, label: "P" },
    { id: "Q", x: 355, y: 170, label: "Q" },
    { id: "R", x: 300, y: 70, label: "R" },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "A" },
    { from: "P", to: "Q" },
    { from: "Q", to: "R" },
    { from: "R", to: "P" },
  ],
};


const GENERIC_TRIGONOMETRIC_TRIANGLE: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 380,
  height: 240,
  title: "Right Triangle — Trigonometric Ratios",
  caption: "sin \u03B8 = Opp/Hyp, cos \u03B8 = Adj/Hyp, tan \u03B8 = Opp/Adj",
  points: [
    { id: "A", x: 70, y: 190, label: "A" },
    { id: "B", x: 70, y: 50, label: "B" },
    { id: "C", x: 290, y: 190, label: "C" },
    { id: "OppLabel", x: 42, y: 125, label: "Opp" },
    { id: "AdjLabel", x: 165, y: 210, label: "Adj" },
    { id: "HypLabel", x: 195, y: 108, label: "Hyp" },
  ],
  edges: [
    { from: "A", to: "B", highlight: true },
    { from: "B", to: "C" },
    { from: "C", to: "A" },
  ],
  angleMarks: [{ at: "C", from: "A", to: "B", radius: 22, highlight: true }],
  rightAngleMarks: [{ at: "A", alongA: "B", alongB: "C", size: 14 }],
};

const GENERIC_COORDINATE_PLANE: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 260,
  title: "Coordinate Geometry",
  caption: "Distance = \u221A[(x\u2082\u2013x\u2081)\u00B2 + (y\u2082\u2013y\u2081)\u00B2], Mid-point = ((x\u2081+x\u2082)/2, (y\u2081+y\u2082)/2)",
  points: [
    { id: "O", x: 70, y: 200, label: "O(0,0)" },
    { id: "X", x: 380, y: 200, label: "x" },
    { id: "Y", x: 70, y: 30, label: "y" },
    { id: "P", x: 180, y: 100, label: "P(x\u2081,y\u2081)", labelOffset: { x: -60, y: -8 } },
    { id: "Q", x: 320, y: 140, label: "Q(x\u2082,y\u2082)", labelOffset: { x: 8, y: -8 } },
    { id: "Px", x: 180, y: 200, label: "x\u2081" },
    { id: "Py", x: 70, y: 100, label: "y\u2081" },
    { id: "Qx", x: 320, y: 200, label: "x\u2082" },
    { id: "Qy", x: 70, y: 140, label: "y\u2082" },
  ],
  edges: [
    { from: "O", to: "X" },
    { from: "O", to: "Y" },
    { from: "P", to: "Px", dashed: true },
    { from: "P", to: "Py", dashed: true },
    { from: "Q", to: "Qx", dashed: true },
    { from: "Q", to: "Qy", dashed: true },
    { from: "P", to: "Q", highlight: true },
  ],
};

const GENERIC_CIRCUIT: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 240,
  title: "Series Circuit — Ohm\u2019s Law",
  caption: "V = IR. Current is same throughout a series circuit.",
  points: [
    { id: "A", x: 80, y: 60, label: "+" },
    { id: "B", x: 340, y: 60, label: "S (switch)" },
    { id: "C", x: 340, y: 180, label: "\u2013" },
    { id: "D", x: 80, y: 180, label: "Battery" },
    { id: "R", x: 210, y: 60, label: "R (\u03A9)" },
    { id: "Am", x: 340, y: 120, label: "A (ammeter)" },
    { id: "Vm1", x: 140, y: 30, label: "" },
    { id: "Vm2", x: 280, y: 30, label: "V (voltmeter)" },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "D" },
    { from: "D", to: "A" },
    { from: "Vm1", to: "Vm2", dashed: true },
  ],
  arrows: [
    { from: "A", to: "R", label: "I", highlight: true },
  ],
};

const GENERIC_MAGNETIC_FIELD: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 240,
  title: "Magnetic Field Sketch",
  caption: "Field representation around a current-carrying conductor.",
  points: [
    { id: "P", x: 210, y: 55, label: "Conductor" },
    { id: "Q", x: 210, y: 185, label: "" },
    { id: "A", x: 145, y: 85, label: "B1" },
    { id: "B", x: 275, y: 85, label: "" },
    { id: "C", x: 275, y: 155, label: "" },
    { id: "D", x: 145, y: 155, label: "" },
    { id: "E", x: 110, y: 65, label: "B2" },
    { id: "F", x: 310, y: 65, label: "" },
    { id: "G", x: 310, y: 175, label: "" },
    { id: "H", x: 110, y: 175, label: "" },
  ],
  edges: [
    { from: "P", to: "Q", highlight: true },
    { from: "A", to: "B", dashed: true },
    { from: "B", to: "C", dashed: true },
    { from: "C", to: "D", dashed: true },
    { from: "D", to: "A", dashed: true },
    { from: "E", to: "F", dashed: true },
    { from: "F", to: "G", dashed: true },
    { from: "G", to: "H", dashed: true },
    { from: "H", to: "E", dashed: true },
  ],
};

const GENERIC_RAY_DIAGRAM: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 240,
  title: "Ray Diagram",
  caption: "Principal axis, lens/mirror anchor, and object-image rays.",
  points: [
    { id: "A1", x: 40, y: 130, label: "" },
    { id: "A2", x: 380, y: 130, label: "" },
    { id: "O1", x: 210, y: 50, label: "O" },
    { id: "O2", x: 210, y: 210, label: "" },
    { id: "F1", x: 145, y: 130, label: "F1" },
    { id: "F2", x: 275, y: 130, label: "F2" },
    { id: "P", x: 95, y: 75, label: "P" },
    { id: "P0", x: 95, y: 130, label: "" },
    { id: "H", x: 210, y: 75, label: "" },
    { id: "I", x: 305, y: 165, label: "I" },
    { id: "I0", x: 305, y: 130, label: "" },
  ],
  edges: [
    { from: "A1", to: "A2" },
    { from: "O1", to: "O2", highlight: true },
    { from: "P0", to: "P", highlight: true },
    { from: "I0", to: "I", dashed: true },
    { from: "P", to: "H", highlight: true },
    { from: "H", to: "I", highlight: true },
    { from: "P", to: "O1" },
    { from: "O1", to: "I" },
  ],
};

const GENERIC_MENSURATION_SOLID: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 240,
  title: "Mensuration Solid",
  caption: "Use labelled dimensions for area/volume derivations.",
  points: [
    { id: "A", x: 100, y: 150, label: "A" },
    { id: "B", x: 260, y: 150, label: "B" },
    { id: "C", x: 260, y: 70, label: "C" },
    { id: "D", x: 100, y: 70, label: "D" },
    { id: "E", x: 135, y: 185, label: "E" },
    { id: "F", x: 295, y: 185, label: "F" },
    { id: "G", x: 295, y: 105, label: "G" },
    { id: "H", x: 135, y: 105, label: "H" },
    { id: "R", x: 315, y: 145, label: "r" },
    { id: "L", x: 80, y: 115, label: "h" },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "D" },
    { from: "D", to: "A" },
    { from: "E", to: "F" },
    { from: "F", to: "G" },
    { from: "G", to: "H" },
    { from: "H", to: "E" },
    { from: "A", to: "E" },
    { from: "B", to: "F" },
    { from: "C", to: "G" },
    { from: "D", to: "H" },
  ],
};

const GENERIC_BIOLOGY_PROCESS: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 460,
  height: 240,
  title: "Life Process — Stepwise Flow",
  caption: "CBSE requires labelled stepwise diagrams for biological processes.",
  points: [
    { id: "A", x: 70, y: 120, label: "Intake" },
    { id: "B", x: 170, y: 120, label: "Breakdown" },
    { id: "C", x: 280, y: 120, label: "Absorption" },
    { id: "D", x: 390, y: 120, label: "Product" },
    { id: "E", x: 170, y: 55, label: "Enzyme/Hormone" },
    { id: "F", x: 280, y: 185, label: "Waste/By-product" },
  ],
  edges: [
    { from: "E", to: "B", dashed: true },
    { from: "C", to: "F", dashed: true },
  ],
  arrows: [
    { from: "A", to: "B", label: "", highlight: true },
    { from: "B", to: "C", label: "", highlight: true },
    { from: "C", to: "D", label: "", highlight: true },
  ],
};

const GENERIC_NUMBER_LINE: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 120,
  title: "Number Line",
  caption: "Use a number line to visualise real numbers, HCF/LCM, and irrational positions.",
  points: [
    { id: "L", x: 40, y: 70, label: "0" },
    { id: "M1", x: 120, y: 70, label: "1" },
    { id: "M2", x: 200, y: 70, label: "2" },
    { id: "M3", x: 280, y: 70, label: "3" },
    { id: "R", x: 380, y: 70, label: "" },
    { id: "S", x: 153, y: 70, label: "\u221A2" },
  ],
  edges: [
    { from: "L", to: "R" },
    { from: "S", to: "S", highlight: true },
  ],
};

const GENERIC_POLYNOMIAL_GRAPH: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 220,
  title: "Polynomial Graph",
  caption: "Identify zeroes where the curve crosses the x-axis.",
  points: [
    { id: "O", x: 60, y: 160, label: "O" },
    { id: "X", x: 380, y: 160, label: "x" },
    { id: "Y", x: 60, y: 30, label: "y" },
    { id: "Z1", x: 150, y: 160, label: "\u03B1" },
    { id: "Z2", x: 290, y: 160, label: "\u03B2" },
    { id: "V", x: 220, y: 60, label: "vertex" },
  ],
  edges: [
    { from: "O", to: "X" },
    { from: "O", to: "Y" },
    { from: "Z1", to: "V", highlight: true },
    { from: "V", to: "Z2", highlight: true },
  ],
};

const GENERIC_LINEAR_PAIR: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 220,
  title: "Pair of Linear Equations",
  caption: "Two lines on a plane: intersecting = unique solution, parallel = no solution.",
  points: [
    { id: "O", x: 60, y: 180, label: "O" },
    { id: "X", x: 380, y: 180, label: "x" },
    { id: "Y", x: 60, y: 30, label: "y" },
    { id: "A1", x: 100, y: 170, label: "" },
    { id: "A2", x: 340, y: 50, label: "L\u2081" },
    { id: "B1", x: 120, y: 40, label: "" },
    { id: "B2", x: 360, y: 140, label: "L\u2082" },
    { id: "P", x: 230, y: 100, label: "(x,y)" },
  ],
  edges: [
    { from: "O", to: "X" },
    { from: "O", to: "Y" },
    { from: "A1", to: "A2", highlight: true },
    { from: "B1", to: "B2", highlight: true },
  ],
};

const GENERIC_CIRCLE_TANGENT: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 240,
  title: "Tangent to a Circle",
  caption: "Tangent is perpendicular to the radius at the point of contact.",
  points: [
    { id: "O", x: 210, y: 120, label: "O" },
    { id: "P", x: 310, y: 120, label: "P" },
    { id: "T1", x: 310, y: 40, label: "" },
    { id: "T2", x: 310, y: 200, label: "" },
    { id: "A", x: 370, y: 80, label: "A" },
  ],
  edges: [
    { from: "O", to: "P", highlight: true },
    { from: "T1", to: "T2" },
    { from: "O", to: "A", dashed: true },
  ],
};

const GENERIC_AP_SEQUENCE: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 120,
  title: "Arithmetic Progression",
  caption: "Each term increases by common difference d.",
  points: [
    { id: "A1", x: 50, y: 60, label: "a" },
    { id: "A2", x: 140, y: 60, label: "a+d" },
    { id: "A3", x: 240, y: 60, label: "a+2d" },
    { id: "A4", x: 350, y: 60, label: "a+(n-1)d" },
  ],
  edges: [
    { from: "A1", to: "A2", highlight: true },
    { from: "A2", to: "A3", highlight: true },
    { from: "A3", to: "A4", dashed: true },
  ],
};

const GENERIC_SECTOR_DIAGRAM: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 240,
  title: "Sector of a Circle",
  caption: "Area = (\u03B8/360) \u00D7 \u03C0r\u00B2. Identify the sector angle and radius.",
  points: [
    { id: "O", x: 180, y: 140, label: "O" },
    { id: "A", x: 320, y: 140, label: "A" },
    { id: "B", x: 280, y: 50, label: "B" },
    { id: "R", x: 250, y: 145, label: "r" },
    { id: "T", x: 240, y: 80, label: "\u03B8" },
  ],
  edges: [
    { from: "O", to: "A", highlight: true },
    { from: "O", to: "B", highlight: true },
    { from: "A", to: "B", dashed: true },
  ],
};

const GENERIC_STATS_TABLE: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 200,
  title: "Frequency Distribution",
  caption: "Organise grouped data into class intervals and frequencies for mean/median/mode.",
  points: [
    { id: "H1", x: 60, y: 40, label: "CI" },
    { id: "H2", x: 160, y: 40, label: "f\u1D62" },
    { id: "H3", x: 260, y: 40, label: "cf" },
    { id: "H4", x: 350, y: 40, label: "f\u1D62x\u1D62" },
    { id: "R1", x: 60, y: 80, label: "10-20" },
    { id: "R2", x: 160, y: 80, label: "5" },
    { id: "R3", x: 260, y: 80, label: "5" },
    { id: "R4", x: 60, y: 120, label: "20-30" },
    { id: "R5", x: 160, y: 120, label: "8" },
    { id: "R6", x: 260, y: 120, label: "13" },
    { id: "R7", x: 60, y: 160, label: "30-40" },
    { id: "R8", x: 160, y: 160, label: "12" },
    { id: "R9", x: 260, y: 160, label: "25" },
  ],
  edges: [
    { from: "H1", to: "H4" },
  ],
};

const GENERIC_HEIGHT_DISTANCE: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 420,
  height: 260,
  title: "Height and Distance",
  caption: "tan \u03B8 = height/distance. Draw the right triangle from the observation point.",
  points: [
    { id: "A", x: 60, y: 220, label: "Observer (A)" },
    { id: "B", x: 340, y: 220, label: "B (base)" },
    { id: "C", x: 340, y: 50, label: "C (top)" },
    { id: "dLabel", x: 190, y: 240, label: "d (distance)" },
    { id: "hLabel", x: 355, y: 140, label: "h (height)" },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "A", to: "C", highlight: true, dashed: true },
  ],
  angleMarks: [{ at: "A", from: "B", to: "C", radius: 28, highlight: true }],
  rightAngleMarks: [{ at: "B", alongA: "A", alongB: "C", size: 14 }],
};

const GENERIC_PYTHAGORAS: DiagramSpec = {
  kind: "tutor_diagram_v1",
  width: 380,
  height: 240,
  title: "Pythagoras Theorem",
  caption: "In a right triangle: a\u00B2 + b\u00B2 = c\u00B2 (hypotenuse\u00B2)",
  points: [
    { id: "A", x: 60, y: 200, label: "A" },
    { id: "B", x: 300, y: 200, label: "B" },
    { id: "C", x: 300, y: 50, label: "C" },
    { id: "aLabel", x: 170, y: 218, label: "a (base)" },
    { id: "bLabel", x: 315, y: 130, label: "b" },
    { id: "cLabel", x: 155, y: 110, label: "c (hyp)" },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "A", to: "C", highlight: true },
  ],
  rightAngleMarks: [{ at: "B", alongA: "A", alongB: "C", size: 14 }],
};

const NO_DIAGRAM_TOPICS = new Set([
  "probability",
  "chemical reactions and equations",
  "acids bases and salts",
  "metals and non metals",
  "carbon and its compounds",
  "periodic classification of elements",
  "management of natural resources",
  "sources of energy",
]);

function topicNeedsNoDiagram(topicKey: string): boolean {
  const lower = String(topicKey || "").toLowerCase().replace(/[-_]+/g, " ").trim();
  return NO_DIAGRAM_TOPICS.has(lower);
}

function pickAaVariant(seed: string): DiagramSpec {
  const idx = hashSeed(seed) % AA_SIMILARITY_VARIANTS.length;
  return cloneSpec(AA_SIMILARITY_VARIANTS[idx]);
}

function isAaSimilaritySeed(seed: string, nodeId?: string | null) {
  const lower = seed.toLowerCase();
  if (nodeId && nodeId.toLowerCase().includes("aa")) return true;
  if (/\baa\b/.test(lower) && lower.includes("similar")) return true;
  if (lower.includes("aa similarity")) return true;
  return false;
}

function normalizeSeed(input: DiagramTemplateInput) {
  return [input.topicKey, input.nodeId, input.stepSlugOrTitle, input.diagramType]
    .filter(Boolean)
    .join("|");
}

export function getDiagramTemplate(
  topicKey?: string | null,
  nodeId?: string | null,
  stepSlugOrTitle?: string | null,
  diagramType?: string | null
): DiagramSpec | null {
  const seed = normalizeSeed({ topicKey, nodeId, stepSlugOrTitle, diagramType });
  const lower = seed.toLowerCase();
  const typeHint = String(diagramType || "").toLowerCase();
  const hint = `${typeHint} ${lower}`.replace(/[_-]+/g, " ");
  const topicLower = String(topicKey || "").toLowerCase().replace(/[-_]+/g, " ").trim();
  const hasTrigWord = /\b(trigonometry|trigonometric|sin|cos|tan|sine|cosine|tangent|theta)\b/.test(hint);
  const isTriangles = lower.includes("triangle");

  if (topicNeedsNoDiagram(topicLower)) return null;

  if (
    hint.includes("height and distance") ||
    hint.includes("angle of elevation") ||
    hint.includes("angle of depression") ||
    hint.includes("tower") ||
    hint.includes("building") && hint.includes("shadow")
  ) {
    return cloneSpec(GENERIC_HEIGHT_DISTANCE);
  }
  if (
    hint.includes("pythagoras") ||
    hint.includes("pythagorean") ||
    hint.includes("hypotenuse")
  ) {
    return cloneSpec(GENERIC_PYTHAGORAS);
  }
  if (topicLower.includes("real number") || topicLower === "real numbers") {
    return cloneSpec(GENERIC_NUMBER_LINE);
  }
  if (topicLower.includes("polynomial")) {
    return cloneSpec(GENERIC_POLYNOMIAL_GRAPH);
  }
  if (topicLower.includes("pair of linear") || topicLower.includes("linear equation")) {
    return cloneSpec(GENERIC_LINEAR_PAIR);
  }
  if (topicLower.includes("quadratic equation")) {
    return cloneSpec(GENERIC_POLYNOMIAL_GRAPH);
  }
  if (topicLower.includes("arithmetic progression")) {
    return cloneSpec(GENERIC_AP_SEQUENCE);
  }
  if (topicLower === "circles" || topicLower.includes("tangent")) {
    return cloneSpec(GENERIC_CIRCLE_TANGENT);
  }
  if (topicLower.includes("areas related to circles") || topicLower.includes("sector")) {
    return cloneSpec(GENERIC_SECTOR_DIAGRAM);
  }
  if (topicLower.includes("statistics") || topicLower.includes("frequency")) {
    return cloneSpec(GENERIC_STATS_TABLE);
  }
  if (
    hint.includes("magnetic_field") ||
    hint.includes("magnetic") ||
    hint.includes("magnet") ||
    hint.includes("solenoid") ||
    hint.includes("field")
  ) {
    return cloneSpec(GENERIC_MAGNETIC_FIELD);
  }
  if (
    hint.includes("ray_diagram") ||
    hint.includes("reflection") ||
    hint.includes("refraction") ||
    hint.includes("lens") ||
    hint.includes("mirror") ||
    hint.includes("light")
  ) {
    return cloneSpec(GENERIC_RAY_DIAGRAM);
  }
  if (
    hint.includes("biology_process") ||
    hint.includes("life process") ||
    hint.includes("nutrition") ||
    hint.includes("respiration") ||
    hint.includes("excretion") ||
    hint.includes("stomata") ||
    hint.includes("nephron") ||
    hint.includes("heart") ||
    hint.includes("control and coordination") ||
    hint.includes("neuron") ||
    hint.includes("reflex") ||
    hint.includes("reproduction") ||
    hint.includes("heredity") ||
    hint.includes("evolution") ||
    hint.includes("food chain") ||
    hint.includes("trophic")
  ) {
    return cloneSpec(GENERIC_BIOLOGY_PROCESS);
  }
  if (
    hint.includes("circuit") ||
    hint.includes("electricity") ||
    hint.includes("electric") ||
    hint.includes("current") ||
    hint.includes("resistance")
  ) {
    return cloneSpec(GENERIC_CIRCUIT);
  }
  if (
    hint.includes("coordinate_plane") ||
    hint.includes("coordinate") ||
    hint.includes("cartesian") ||
    hint.includes("graph")
  ) {
    return cloneSpec(GENERIC_COORDINATE_PLANE);
  }
  if (
    hint.includes("mensuration_solid") ||
    hint.includes("mensuration") ||
    hint.includes("surface area") ||
    hint.includes("volume") ||
    hint.includes("cone") ||
    hint.includes("cylinder") ||
    hint.includes("sphere") ||
    hint.includes("cuboid")
  ) {
    return cloneSpec(GENERIC_MENSURATION_SOLID);
  }
  if (
    hint.includes("trigonometric_triangle") ||
    hint.includes("trigon") ||
    hasTrigWord
  ) {
    return cloneSpec(GENERIC_TRIGONOMETRIC_TRIANGLE);
  }
  if (isAaSimilaritySeed(lower, nodeId)) return pickAaVariant(seed);
  if (isTriangles && lower.includes("similar")) return pickAaVariant(seed);
  if (isTriangles) return cloneSpec(GENERIC_SIMILARITY);
  return null;
}

export function isDiagramTemplateSpec(value: unknown): value is DiagramSpec {
  if (!value || typeof value !== "object") return false;
  const v = value as DiagramSpec;
  return v.kind === "tutor_diagram_v1" && Array.isArray(v.points) && Array.isArray(v.edges);
}
