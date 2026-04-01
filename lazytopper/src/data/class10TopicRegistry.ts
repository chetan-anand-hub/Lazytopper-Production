// src/data/class10TopicRegistry.ts

import type { Class10TopicKey } from "./class10MathTopicTrends";

export type TopicTier = "must-crack" | "high-roi" | "good-to-do";

export interface TopicMeta {
  topicKey: Class10TopicKey;
  topicName: string;          // display label
  tier: TopicTier;            // must-crack | high-roi | good-to-do
  route: string;              // where Topic Hub will live
  approxWeightagePercent: number;
}

export const class10TopicRegistry: TopicMeta[] = [
  {
    topicKey: "Real Numbers",
    topicName: "Real Numbers",
    tier: "high-roi",
    route: "/class10/math/real-numbers",
    approxWeightagePercent: 7,
  },
  {
    topicKey: "Polynomials",
    topicName: "Polynomials",
    tier: "must-crack",
    route: "/class10/math/polynomials",
    approxWeightagePercent: 6,
  },
  {
    topicKey: "Pair of Linear Equations",
    topicName: "Pair of Linear Equations in Two Variables",
    tier: "must-crack",
    route: "/class10/math/pair-of-linear-equations",
    approxWeightagePercent: 11,
  },
  {
    topicKey: "Quadratic Equations",
    topicName: "Quadratic Equations",
    tier: "must-crack",
    route: "/class10/math/quadratic-equations",
    approxWeightagePercent: 8,
  },
  {
    topicKey: "Arithmetic Progression",
    topicName: "Arithmetic Progressions",
    tier: "must-crack",
    route: "/class10/math/arithmetic-progression",
    approxWeightagePercent: 7,
  },
  {
    topicKey: "Triangles",
    topicName: "Triangles",
    tier: "must-crack",
    route: "/class10/math/triangles",
    approxWeightagePercent: 10,
  },
  {
    topicKey: "Coordinate Geometry",
    topicName: "Coordinate Geometry",
    tier: "must-crack",
    route: "/class10/math/coordinate-geometry",
    approxWeightagePercent: 7,
  },
  {
    topicKey: "Trigonometry",
    topicName: "Introduction to Trigonometry & Applications",
    tier: "must-crack",
    route: "/class10/math/trigonometry",
    approxWeightagePercent: 10,
  },
  {
    topicKey: "Circles",
    topicName: "Circles",
    tier: "high-roi",
    route: "/class10/math/circles",
    approxWeightagePercent: 6,
  },
  {
    topicKey: "Constructions",
    topicName: "Constructions",
    tier: "good-to-do",
    route: "/class10/math/constructions",
    approxWeightagePercent: 4,
  },
  {
    topicKey: "Areas Related to Circles",
    topicName: "Areas Related to Circles",
    tier: "high-roi",
    route: "/class10/math/areas-related-to-circles",
    approxWeightagePercent: 4,
  },
  {
    topicKey: "Surface Areas and Volumes",
    topicName: "Surface Areas and Volumes",
    tier: "must-crack",
    route: "/class10/math/surface-areas-and-volumes",
    approxWeightagePercent: 7,
  },
  {
    topicKey: "Statistics",
    topicName: "Statistics",
    tier: "must-crack",
    route: "/class10/math/statistics",
    approxWeightagePercent: 7,
  },
  {
    topicKey: "Probability",
    topicName: "Probability",
    tier: "must-crack",
    route: "/class10/math/probability",
    approxWeightagePercent: 6,
  },
];

export const getTopicMeta = (key: Class10TopicKey) =>
  class10TopicRegistry.find((t) => t.topicKey === key);
