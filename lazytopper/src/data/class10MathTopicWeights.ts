// src/data/class10MathTopicWeights.ts
// Canonical topic-wise weightage for CBSE Class 10 Maths (out of 100%)
// Source: your curated JSON. Used for trends, ranking, and question mix.

export type WeightTier = "must-crack" | "high-roi" | "good-to-do";

export interface Class10TopicWeight {
  id: string;              // slug, e.g. "real-numbers"
  name: string;            // display name, e.g. "Real Numbers"
  weightagePercent: number;
  tier: WeightTier;        // must-crack / high-roi / good-to-do
}

// Your JSON data, unchanged:
const rawTopicWeights: Record<string, { weightage_percent: number }> = {
  "Real Numbers": { weightage_percent: 7.5 },
  "Polynomials": { weightage_percent: 3.75 },
  "Pair of Linear Equations in Two Variables": { weightage_percent: 8.75 },
  "Quadratic Equations": { weightage_percent: 7.5 },
  "Arithmetic Progression": { weightage_percent: 5 },
  "Triangles": { weightage_percent: 11.25 },
  "Coordinate Geometry": { weightage_percent: 7.5 },
  "Introduction to Trigonometry": { weightage_percent: 15 },
  "Circles": { weightage_percent: 5 },
  "Constructions": { weightage_percent: 2.5 },
  "Areas Related to Circles": { weightage_percent: 5 },
  "Surface Areas and Volumes": { weightage_percent: 7.5 },
  "Statistics": { weightage_percent: 8.75 },
  "Probability": { weightage_percent: 5 },
};

// Simple tiering logic for the UI chips.
// Tweak thresholds any time without touching the data.
function tierFor(weight: number): WeightTier {
  if (weight >= 10) return "must-crack";
  if (weight >= 6) return "high-roi";
  return "good-to-do";
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Sorted array for charts / lists
export const class10MathTopicWeights: Class10TopicWeight[] = Object.entries(
  rawTopicWeights
)
  .map(([name, obj]) => {
    const weight = obj.weightage_percent;
    return {
      id: slugify(name),
      name,
      weightagePercent: weight,
      tier: tierFor(weight),
    };
  })
  .sort((a, b) => b.weightagePercent - a.weightagePercent);

// Quick lookup by id or name if needed elsewhere
export const class10TopicById: Record<string, Class10TopicWeight> =
  Object.fromEntries(
    class10MathTopicWeights.map((t) => [t.id, t])
  );

export const class10TopicByName: Record<string, Class10TopicWeight> =
  Object.fromEntries(
    class10MathTopicWeights.map((t) => [t.name, t])
  );
