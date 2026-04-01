import { normalizeTopicSlug } from "./topicAliasMap";

export type CanonicalSubjectId = "maths" | "science";

export interface CanonicalUnit {
  unitId: string;
  subjectId: CanonicalSubjectId;
  name: string;
  marks: number;
}

export interface CanonicalChapter {
  chapterId: string;
  subjectId: CanonicalSubjectId;
  unitId: string;
  title: string;
  canonicalSlug: string;
  recommendedConceptPacks: number;
  visualMin: number;
}

export const CBSE10_CANONICAL_SNAPSHOT_ID = "cbse_class10_2025_26_v1";

export const canonicalUnits: CanonicalUnit[] = [
  { unitId: "M10_U1", subjectId: "maths", name: "Number Systems", marks: 6 },
  { unitId: "M10_U2", subjectId: "maths", name: "Algebra", marks: 20 },
  { unitId: "M10_U3", subjectId: "maths", name: "Coordinate Geometry", marks: 6 },
  { unitId: "M10_U4", subjectId: "maths", name: "Geometry", marks: 15 },
  { unitId: "M10_U5", subjectId: "maths", name: "Trigonometry", marks: 12 },
  { unitId: "M10_U6", subjectId: "maths", name: "Mensuration", marks: 10 },
  { unitId: "M10_U7", subjectId: "maths", name: "Statistics and Probability", marks: 11 },
  {
    unitId: "S10_U1",
    subjectId: "science",
    name: "Chemical Substances - Nature and Behaviour",
    marks: 25,
  },
  { unitId: "S10_U2", subjectId: "science", name: "World of Living", marks: 25 },
  { unitId: "S10_U3", subjectId: "science", name: "Natural Phenomena", marks: 12 },
  { unitId: "S10_U4", subjectId: "science", name: "Effects of Current", marks: 13 },
  { unitId: "S10_U5", subjectId: "science", name: "Natural Resources", marks: 5 },
];

export const canonicalChapters: CanonicalChapter[] = [
  {
    chapterId: "M10_CH_REAL_NUM",
    subjectId: "maths",
    unitId: "M10_U1",
    title: "Real Numbers",
    canonicalSlug: "real-numbers",
    recommendedConceptPacks: 6,
    visualMin: 2,
  },
  {
    chapterId: "M10_CH_POLY",
    subjectId: "maths",
    unitId: "M10_U2",
    title: "Polynomials",
    canonicalSlug: "polynomials",
    recommendedConceptPacks: 7,
    visualMin: 3,
  },
  {
    chapterId: "M10_CH_PAIR_LINEAR",
    subjectId: "maths",
    unitId: "M10_U2",
    title: "Pair of Linear Equations in Two Variables",
    canonicalSlug: "pair-of-linear-equations-in-two-variables",
    recommendedConceptPacks: 10,
    visualMin: 3,
  },
  {
    chapterId: "M10_CH_QUADRATIC",
    subjectId: "maths",
    unitId: "M10_U2",
    title: "Quadratic Equations",
    canonicalSlug: "quadratic-equations",
    recommendedConceptPacks: 10,
    visualMin: 2,
  },
  {
    chapterId: "M10_CH_AP",
    subjectId: "maths",
    unitId: "M10_U2",
    title: "Arithmetic Progressions",
    canonicalSlug: "arithmetic-progressions",
    recommendedConceptPacks: 8,
    visualMin: 2,
  },
  {
    chapterId: "M10_CH_COORD_GEOM",
    subjectId: "maths",
    unitId: "M10_U3",
    title: "Coordinate Geometry",
    canonicalSlug: "coordinate-geometry",
    recommendedConceptPacks: 7,
    visualMin: 3,
  },
  {
    chapterId: "M10_CH_TRIANGLES",
    subjectId: "maths",
    unitId: "M10_U4",
    title: "Triangles",
    canonicalSlug: "triangles",
    recommendedConceptPacks: 14,
    visualMin: 5,
  },
  {
    chapterId: "M10_CH_CIRCLES",
    subjectId: "maths",
    unitId: "M10_U4",
    title: "Circles",
    canonicalSlug: "circles",
    recommendedConceptPacks: 8,
    visualMin: 4,
  },
  {
    chapterId: "M10_CH_TRIG",
    subjectId: "maths",
    unitId: "M10_U5",
    title: "Trigonometry",
    canonicalSlug: "trigonometry",
    recommendedConceptPacks: 14,
    visualMin: 5,
  },
  {
    chapterId: "M10_CH_AREA_CIRC",
    subjectId: "maths",
    unitId: "M10_U6",
    title: "Areas Related to Circles",
    canonicalSlug: "areas-related-to-circles",
    recommendedConceptPacks: 8,
    visualMin: 4,
  },
  {
    chapterId: "M10_CH_SA_VOLUMES",
    subjectId: "maths",
    unitId: "M10_U6",
    title: "Surface Areas and Volumes",
    canonicalSlug: "surface-areas-and-volumes",
    recommendedConceptPacks: 10,
    visualMin: 4,
  },
  {
    chapterId: "M10_CH_STATS",
    subjectId: "maths",
    unitId: "M10_U7",
    title: "Statistics",
    canonicalSlug: "statistics",
    recommendedConceptPacks: 10,
    visualMin: 4,
  },
  {
    chapterId: "M10_CH_PROB",
    subjectId: "maths",
    unitId: "M10_U7",
    title: "Probability",
    canonicalSlug: "probability",
    recommendedConceptPacks: 6,
    visualMin: 1,
  },
  {
    chapterId: "S10_CH_CHEM_REAC",
    subjectId: "science",
    unitId: "S10_U1",
    title: "Chemical Reactions and Equations",
    canonicalSlug: "chemical-reactions-and-equations",
    recommendedConceptPacks: 12,
    visualMin: 3,
  },
  {
    chapterId: "S10_CH_ACIDS_BASES",
    subjectId: "science",
    unitId: "S10_U1",
    title: "Acids, Bases and Salts",
    canonicalSlug: "acids-bases-and-salts",
    recommendedConceptPacks: 14,
    visualMin: 4,
  },
  {
    chapterId: "S10_CH_METALS",
    subjectId: "science",
    unitId: "S10_U1",
    title: "Metals and Non-metals",
    canonicalSlug: "metals-and-non-metals",
    recommendedConceptPacks: 14,
    visualMin: 4,
  },
  {
    chapterId: "S10_CH_CARBON",
    subjectId: "science",
    unitId: "S10_U1",
    title: "Carbon and its Compounds",
    canonicalSlug: "carbon-and-its-compounds",
    recommendedConceptPacks: 18,
    visualMin: 4,
  },
  {
    chapterId: "S10_CH_LIFE_PROC",
    subjectId: "science",
    unitId: "S10_U2",
    title: "Life Processes",
    canonicalSlug: "life-processes",
    recommendedConceptPacks: 18,
    visualMin: 5,
  },
  {
    chapterId: "S10_CH_CONTROL_COORD",
    subjectId: "science",
    unitId: "S10_U2",
    title: "Control and Co-ordination",
    canonicalSlug: "control-and-co-ordination",
    recommendedConceptPacks: 14,
    visualMin: 5,
  },
  {
    chapterId: "S10_CH_REPROD",
    subjectId: "science",
    unitId: "S10_U2",
    title: "Reproduction",
    canonicalSlug: "reproduction",
    recommendedConceptPacks: 14,
    visualMin: 4,
  },
  {
    chapterId: "S10_CH_HEREDITY_EVOL",
    subjectId: "science",
    unitId: "S10_U2",
    title: "Heredity and Evolution",
    canonicalSlug: "heredity-and-evolution",
    recommendedConceptPacks: 12,
    visualMin: 3,
  },
  {
    chapterId: "S10_CH_LIGHT",
    subjectId: "science",
    unitId: "S10_U3",
    title: "Light - Reflection and Refraction (incl. Human Eye, Prism)",
    canonicalSlug: "light-reflection-and-refraction-incl-human-eye-prism",
    recommendedConceptPacks: 20,
    visualMin: 8,
  },
  {
    chapterId: "S10_CH_ELECTRICITY",
    subjectId: "science",
    unitId: "S10_U4",
    title: "Electricity",
    canonicalSlug: "electricity",
    recommendedConceptPacks: 16,
    visualMin: 6,
  },
  {
    chapterId: "S10_CH_MAGNETISM",
    subjectId: "science",
    unitId: "S10_U4",
    title: "Magnetic Effects of Electric Current",
    canonicalSlug: "magnetic-effects-of-electric-current",
    recommendedConceptPacks: 16,
    visualMin: 6,
  },
  {
    chapterId: "S10_CH_ENV",
    subjectId: "science",
    unitId: "S10_U5",
    title: "Our Environment",
    canonicalSlug: "our-environment",
    recommendedConceptPacks: 10,
    visualMin: 3,
  },
];

const chapterBySlug = (() => {
  const map = new Map<string, CanonicalChapter>();
  canonicalChapters.forEach((chapter) => {
    map.set(normalizeTopicSlug(chapter.canonicalSlug), chapter);
  });
  return map;
})();

export function toCanonicalSubjectId(rawSubject: string): CanonicalSubjectId {
  return String(rawSubject || "").toLowerCase().includes("science")
    ? "science"
    : "maths";
}

export function getCanonicalUnits(subjectId?: CanonicalSubjectId): CanonicalUnit[] {
  if (!subjectId) return canonicalUnits.slice();
  return canonicalUnits.filter((unit) => unit.subjectId === subjectId);
}

export function getCanonicalChapters(subjectId?: CanonicalSubjectId): CanonicalChapter[] {
  if (!subjectId) return canonicalChapters.slice();
  return canonicalChapters.filter((chapter) => chapter.subjectId === subjectId);
}

export function getCanonicalChapterBySlug(rawTopicKey: string): CanonicalChapter | null {
  const slug = normalizeTopicSlug(rawTopicKey);
  if (!slug) return null;
  return chapterBySlug.get(slug) || null;
}
