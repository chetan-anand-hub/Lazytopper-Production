import type { DesktopStream, DesktopSubject } from "./navigation";

export type DesktopTrendTier = "high" | "medium" | "low";

export interface DesktopTopicSummary {
  slug: string;
  name: string;
  subject: DesktopSubject;
  stream: DesktopStream;
  trendTier: DesktopTrendTier;
  weight: number;
  marks: string;
  blurb: string;
}

const TOPICS: DesktopTopicSummary[] = [
  {
    slug: "real-numbers",
    name: "Real Numbers",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 6,
    marks: "~6 marks",
    blurb: "Euclid's division lemma, the fundamental theorem of arithmetic, and rational vs irrational numbers.",
  },
  {
    slug: "polynomials",
    name: "Polynomials",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 6,
    marks: "~6 marks",
    blurb: "Zeroes of polynomials, relations between coefficients and zeroes, and the division algorithm.",
  },
  {
    slug: "pair-of-linear-equations",
    name: "Pair of Linear Equations",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Solving linear pairs by substitution, elimination, and cross-multiplication, including word problems.",
  },
  {
    slug: "quadratic-equations",
    name: "Quadratic Equations",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Factorisation, quadratic formula, discriminant analysis, and applied word problems.",
  },
  {
    slug: "arithmetic-progression",
    name: "Arithmetic Progression",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 5,
    marks: "~5 marks",
    blurb: "nth term, sum of the first n terms, and AP-based application problems.",
  },
  {
    slug: "triangles",
    name: "Triangles",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 7,
    marks: "~7 marks",
    blurb: "Similarity criteria, basic proportionality theorem, and proofs based on similar triangles.",
  },
  {
    slug: "coordinate-geometry",
    name: "Coordinate Geometry",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Distance formula, section formula, and area of a triangle from coordinates.",
  },
  {
    slug: "trigonometry",
    name: "Trigonometry",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 12,
    marks: "~12 marks",
    blurb: "Trigonometric ratios and identities together with heights and distances applications.",
  },
  {
    slug: "circles",
    name: "Circles",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Tangents to a circle, length of tangents from an external point, and related proofs.",
  },
  {
    slug: "areas-related-to-circles",
    name: "Areas Related to Circles",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 4,
    marks: "~4 marks",
    blurb: "Area of sectors and segments and combinations of plane figures involving circles.",
  },
  {
    slug: "surface-areas-and-volumes",
    name: "Surface Areas and Volumes",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 7,
    marks: "~7 marks",
    blurb: "Surface area and volume of combinations of solids and conversion of solids from one shape to another.",
  },
  {
    slug: "statistics",
    name: "Statistics",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 6,
    marks: "~6 marks",
    blurb: "Mean, median and mode of grouped data, plus cumulative frequency curves.",
  },
  {
    slug: "probability",
    name: "Probability",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 5,
    marks: "~5 marks",
    blurb: "Classical probability of simple events with cards, dice, and similar setups.",
  },

  {
    slug: "chemical-reactions-and-equations",
    name: "Chemical Reactions & Equations",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Types of chemical reactions, balancing equations, and oxidation–reduction basics.",
  },
  {
    slug: "acids-bases-and-salts",
    name: "Acids Bases & Salts",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Properties of acids and bases, the pH scale, and the chemistry of common salts.",
  },
  {
    slug: "metals-and-non-metals",
    name: "Metals & Non-metals",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Physical and chemical properties, the reactivity series, and extraction of metals.",
  },
  {
    slug: "carbon-and-its-compounds",
    name: "Carbon & its Compounds",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    weight: 7,
    marks: "~7 marks",
    blurb: "Covalent bonding in carbon, homologous series, functional groups, and key organic reactions.",
  },
  {
    slug: "light-reflection-and-refraction",
    name: "Light - Reflection & Refraction",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    weight: 7,
    marks: "~7 marks",
    blurb: "Spherical mirrors, lenses, the mirror and lens formulae, and image formation by ray diagrams.",
  },
  {
    slug: "human-eye-and-colourful-world",
    name: "Human Eye & Colourful World",
    subject: "Science",
    stream: "Physics",
    trendTier: "medium",
    weight: 5,
    marks: "~5 marks",
    blurb: "Structure of the human eye, defects of vision and their correction, plus dispersion and scattering of light.",
  },
  {
    slug: "electricity",
    name: "Electricity",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    weight: 7,
    marks: "~7 marks",
    blurb: "Ohm's law, resistors in series and parallel, and electrical power and energy numericals.",
  },
  {
    slug: "magnetic-effects-of-electric-current",
    name: "Magnetic Effects of Electric Current",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Magnetic field due to current-carrying conductors, the right-hand rule, and electromagnetic induction.",
  },
  {
    slug: "life-processes",
    name: "Life Processes",
    subject: "Science",
    stream: "Biology",
    trendTier: "high",
    weight: 8,
    marks: "~8 marks",
    blurb: "Nutrition, respiration, transportation, and excretion in plants and animals.",
  },
  {
    slug: "control-and-coordination",
    name: "Control & Coordination",
    subject: "Science",
    stream: "Biology",
    trendTier: "high",
    weight: 6,
    marks: "~6 marks",
    blurb: "Nervous and hormonal coordination in animals and tropic movements in plants.",
  },
  {
    slug: "how-do-organisms-reproduce",
    name: "How do Organisms Reproduce",
    subject: "Science",
    stream: "Biology",
    trendTier: "medium",
    weight: 6,
    marks: "~6 marks",
    blurb: "Modes of asexual and sexual reproduction in plants and animals, including reproductive health.",
  },
  {
    slug: "heredity",
    name: "Heredity",
    subject: "Science",
    stream: "Biology",
    trendTier: "medium",
    weight: 5,
    marks: "~5 marks",
    blurb: "Mendel's laws of inheritance, monohybrid and dihybrid crosses, and sex determination.",
  },
  {
    slug: "our-environment",
    name: "Our Environment",
    subject: "Science",
    stream: "Biology",
    trendTier: "low",
    weight: 4,
    marks: "~4 marks",
    blurb: "Ecosystems, food chains and food webs, and impact of human activities on the environment.",
  },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Backward-compatibility aliases. Keys are normalized (slug-style) forms of
// either older slugs or older display names. Values are the canonical slug
// in the TOPICS array. Existing inbound links and stored topic references
// must continue to resolve.
const TOPIC_ALIASES: Record<string, string> = {
  // Trigonometry — old slug + normalized old display name
  "trigonometry-heights-distances": "trigonometry",
  "trigonometry-heights": "trigonometry",
  "trigonometry-and-heights": "trigonometry",
  "trigonometric-identities": "trigonometry",

  // Light — old slug + normalized old display name (en-dash collapses to "-")
  "light-reflection-refraction": "light-reflection-and-refraction",
  "light-reflection": "light-reflection-and-refraction",

  // Acids, Bases & Salts — old slug + normalized old display name
  "acids-bases-salts": "acids-bases-and-salts",

  // Tolerate common variants of canonical names that normalize differently
  "areas-related-to-circle": "areas-related-to-circles",
  "surface-area-and-volume": "surface-areas-and-volumes",
  "surface-areas-volumes": "surface-areas-and-volumes",
  "linear-equations-in-two-variables": "pair-of-linear-equations",
  "pair-of-linear-equations-in-two-variables": "pair-of-linear-equations",
  "arithmetic-progressions": "arithmetic-progression",
  "ap": "arithmetic-progression",
  "metals-non-metals": "metals-and-non-metals",
  "metals-and-nonmetals": "metals-and-non-metals",
  "carbon-and-compounds": "carbon-and-its-compounds",
  "carbon-compounds": "carbon-and-its-compounds",
  "chemical-reactions-equations": "chemical-reactions-and-equations",
  "human-eye": "human-eye-and-colourful-world",
  "human-eye-and-colorful-world": "human-eye-and-colourful-world",
  "magnetic-effects": "magnetic-effects-of-electric-current",
  "magnetic-effects-of-current": "magnetic-effects-of-electric-current",
  "control-coordination": "control-and-coordination",
  "control-and-co-ordination": "control-and-coordination",
  "reproduction": "how-do-organisms-reproduce",
  "how-organisms-reproduce": "how-do-organisms-reproduce",
  "environment": "our-environment",
};

export const desktopTopicBySlug = (
  slug: string,
): DesktopTopicSummary | undefined => {
  if (!slug) return undefined;
  const key = normalize(slug);

  // 1. Direct match on canonical slug or normalized canonical name.
  const direct = TOPICS.find(
    (topic) => topic.slug === key || normalize(topic.name) === key,
  );
  if (direct) return direct;

  // 2. Alias fallback — old slugs and normalized old display names.
  const aliased = TOPIC_ALIASES[key];
  if (aliased) {
    return TOPICS.find((topic) => topic.slug === aliased);
  }

  return undefined;
};

export const desktopTopicsBySubject = (
  subject: DesktopSubject,
  stream: DesktopStream = "All",
): DesktopTopicSummary[] => {
  return TOPICS.filter((topic) => {
    if (topic.subject !== subject) return false;
    if (subject !== "Science" || stream === "All") return true;
    return topic.stream === stream;
  });
};

export const displayDesktopTopicNames = (slugs: string[]): string[] => {
  return slugs.map((slug) => desktopTopicBySlug(slug)?.name ?? slug);
};

export const desktopTopicSlugFromName = (name: string): string =>
  desktopTopicBySlug(name)?.slug ?? normalize(name);
