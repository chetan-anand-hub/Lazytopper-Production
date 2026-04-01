// src/data/class10MathTopicTrends.ts
//
// Clean, canonical topic-trends map for Class 10 Maths.
// NOTE: Keys are quoted to avoid accidental shorthand/identifier parsing and to prevent duplicates.
//
// This file is used to derive Class10TopicKey (keyof topics). Keep keys aligned with the question banks.

export type DifficultyKey = "Easy" | "Medium" | "Hard";

// Tier labels (aligned with TopicHub etc.)
export type TopicTier = "must-crack" | "high-roi" | "good-to-do";

// ---- Canonical subtopic keys (exported so other files can reuse) ----

// Pair of Linear Equations
export const PLE_SUBTOPIC_ALGEBRAIC = "Algebraic Solution Methods";
export const PLE_SUBTOPIC_WORD_APP = "Word & Application Problems";
export const PLE_SUBTOPIC_GRAPHICAL = "Graphical Solutions/Nature";

// Polynomials
export const POLY_SUBTOPIC_ZEROS = "Zeros & Factorisation";
export const POLY_SUBTOPIC_COEFF_ROOT = "Coefficient–root Relations";
export const POLY_SUBTOPIC_GRAPH_TYPE = "Graph & Type of Polynomial";

// Quadratic Equations
export const QE_SUBTOPIC_ALGEBRAIC = "Algebraic Solution";
export const QE_SUBTOPIC_NOR = "Nature of Roots (Discriminant)";
export const QE_SUBTOPIC_WORD_APP = "Word/Application Problems";

// Trigonometry
export const TRIG_SUBTOPIC_RATIOS = "Trig Ratios/Values";
export const TRIG_SUBTOPIC_IDENTITIES = "Trig Identities/Proofs";
export const TRIG_SUBTOPIC_APPLICATIONS = "Application/Heights & Distances";

// Triangles
export const TRI_SUBTOPIC_SIMILARITY = "Similarity Criteria";
export const TRI_SUBTOPIC_BPT = "BPT (Basic Proportionality Theorem)";
export const TRI_SUBTOPIC_AREA_RATIO = "Area Ratio in Similar Triangles";
export const TRI_SUBTOPIC_PYTH = "Pythagoras/Converse";

export const class10MathTopicTrends = {
  difficultyDistributionPercent: {
    Easy: 40,
    Medium: 40,
    Hard: 20,
  } as Record<DifficultyKey, number>,

  // CBSE-style blueprint (80 marks total)
  // A: 20×1 = 20, B: 5×2 = 10, C: 6×3 = 18, D: 4×5 = 20, E: 3×4 = 12
  marksAllocation: {
    "Section A (MCQ/Assertion, 1 mark)": 20,
    "Section B (Short Answer, 2 marks)": 10,
    "Section C (Short Answer, 3 marks)": 18,
    "Section D (Long Answer, 5 marks)": 20,
    "Section E (Case-Based, 4 marks)": 12,
  } as Record<string, number>,

  topics: {
    "Real Numbers": {
      weightagePercent: 7,
      tier: "high-roi" as TopicTier,
      summary:
        "Euclid division lemma, HCF/LCM, irrationality proofs, decimal expansions—often 1 short + 1 MCQ.",
      conceptWeightage: {
        "Euclid Division Lemma": 30,
        "Fundamental Theorem of Arithmetic": 35,
        "Irrationality Proofs": 25,
        "Decimal Expansion": 10,
      },
    },

    "Polynomials": {
      weightagePercent: 5,
      tier: "high-roi" as TopicTier,
      summary:
        "Roots/zeroes, factor theorem, identities—frequently tested via quick MCQs/assertions and short items.",
      conceptWeightage: {
        [POLY_SUBTOPIC_COEFF_ROOT]: 45,
        [POLY_SUBTOPIC_ZEROS]: 35,
        [POLY_SUBTOPIC_GRAPH_TYPE]: 20,
      },
    },

    "Pair of Linear Equations": {
      weightagePercent: 11,
      tier: "must-crack" as TopicTier,
      summary:
        "Algebraic methods, consistency/nature of solutions, and word applications—high frequency across sections.",
      conceptWeightage: {
        [PLE_SUBTOPIC_ALGEBRAIC]: 40,
        [PLE_SUBTOPIC_WORD_APP]: 35,
        [PLE_SUBTOPIC_GRAPHICAL]: 25,
      },
    },

    "Quadratic Equations": {
      weightagePercent: 8,
      tier: "must-crack" as TopicTier,
      summary:
        "Solution methods + discriminant/nature of roots + word problems—very common in Section A/C.",
      conceptWeightage: {
        [QE_SUBTOPIC_ALGEBRAIC]: 40,
        [QE_SUBTOPIC_NOR]: 30,
        [QE_SUBTOPIC_WORD_APP]: 30,
      },
    },

    "Arithmetic Progression": {
      weightagePercent: 7,
      tier: "high-roi" as TopicTier,
      summary:
        "Nth term, sum, and word applications—usually one MCQ + one short/medium item.",
      conceptWeightage: {
        "nth Term": 35,
        "Sum of n Terms": 35,
        "Application Problems": 30,
      },
    },

    "Triangles": {
      weightagePercent: 9,
      tier: "must-crack" as TopicTier,
      summary:
        "Similarity/BPT/area ratio + Pythagoras—often proof + application, frequently appears every paper.",
      conceptWeightage: {
        [TRI_SUBTOPIC_SIMILARITY]: 35,
        [TRI_SUBTOPIC_BPT]: 30,
        [TRI_SUBTOPIC_AREA_RATIO]: 20,
        [TRI_SUBTOPIC_PYTH]: 15,
      },
    },

    "Coordinate Geometry": {
      weightagePercent: 7,
      tier: "high-roi" as TopicTier,
      summary:
        "Distance/section/area of triangle—direct scoring, recurring in Section A/B.",
      conceptWeightage: {
        "Distance Formula": 40,
        "Section Formula": 35,
        "Area of Triangle": 25,
      },
    },

    "Trigonometry": {
      weightagePercent: 10,
      tier: "must-crack" as TopicTier,
      summary:
        "Ratios/identities + heights & distances—high ROI; supports case-based real-life contexts.",
      conceptWeightage: {
        [TRIG_SUBTOPIC_RATIOS]: 35,
        [TRIG_SUBTOPIC_IDENTITIES]: 35,
        [TRIG_SUBTOPIC_APPLICATIONS]: 30,
      },
    },

    "Circles": {
      weightagePercent: 6,
      tier: "high-roi" as TopicTier,
      summary:
        "Tangent properties/theorems + short proofs/scenarios—typically short/medium items.",
      conceptWeightage: {
        "Tangent Properties": 45,
        "Tangent Theorems & Proofs": 35,
        "Number/Type of Tangents": 20,
      },
    },

    "Constructions": {
      weightagePercent: 3,
      tier: "good-to-do" as TopicTier,
      summary:
        "Procedural construction steps—lower weight but easy marks if practiced.",
      conceptWeightage: {
        "Divide Segment": 40,
        "Construct Tangent": 35,
        "Similar Triangle": 25,
      },
    },

    "Areas Related to Circles": {
      weightagePercent: 4,
      tier: "good-to-do" as TopicTier,
      summary:
        "Sector/segment and composite figures—usually direct application MCQ/shorts.",
      conceptWeightage: {
        "Sectors and Segments": 65,
        "Composite Figures": 35,
      },
    },

    "Surface Areas and Volumes": {
      weightagePercent: 8,
      tier: "high-roi" as TopicTier,
      summary:
        "Standard solids + combination problems + unit conversions—often one medium/long calculation.",
      conceptWeightage: {
        "Cylinder/Cone/Sphere": 60,
        "Combination/Transformation": 30,
        "Frustum": 10,
      },
    },

    "Statistics": {
      weightagePercent: 11,
      tier: "must-crack" as TopicTier,
      summary:
        "Grouped data mean/median/mode + ogive interpretation—high-frequency, scoring chapter.",
      conceptWeightage: {
        "Mean (Step Deviation)": 35,
        "Median of Grouped Data": 30,
        "Mode of Grouped Data": 25,
        "Graph/Ogive": 10,
      },
    },

    "Probability": {
      weightagePercent: 8,
      tier: "must-crack" as TopicTier,
      summary:
        "Single-event probability + complements/combined scenarios—regular direct questions.",
      conceptWeightage: {
        "Single Event Probability": 65,
        "Combined/Word Problem Probability": 35,
      },
    },
  },
} as const;

// Inferred types from the constant above
export type Class10MathTopicTrendsData = typeof class10MathTopicTrends;
export type Class10TopicKey = keyof Class10MathTopicTrendsData["topics"];

// ---- Normalized list for easy linking across the app ----

export interface TopicTrendEntry {
  topicKey: Class10TopicKey;
  weightagePercent: number;
  tier?: TopicTier;
  summary?: string;
  conceptWeightage: Record<string, number>;
}

export const class10TopicTrendList: TopicTrendEntry[] = Object.entries(
  class10MathTopicTrends.topics
).map(([key, value]) => ({
  topicKey: key as Class10TopicKey,
  weightagePercent: value.weightagePercent,
  tier: (value as any).tier,
  summary: (value as any).summary,
  conceptWeightage: value.conceptWeightage,
}));
