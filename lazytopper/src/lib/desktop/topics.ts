import type { DesktopStream, DesktopSubject } from "./navigation";
import { getRuntimeTopicCandidates } from "../../data/syllabus/topicAliasMap";
import { SYLLABUS_2026_27, type SyllabusSubject } from "../../config/syllabus2026-27";

export type DesktopTrendTier = "high" | "medium" | "low";

export interface DesktopTopicSummary {
  slug: string;
  name: string;
  subject: DesktopSubject;
  stream: DesktopStream;
  trendTier: DesktopTrendTier;
  /**
   * Approximate marks for this chapter, DERIVED from CBSE's unit marks (SYLLABUS-FIX-CODE
   * F2) — never hand-typed. Each subject's chapters sum to exactly 80.
   */
  weight: number;
  /** The chip label for `weight`: "approx. N marks". */
  marks: string;
  blurb: string;
}

/**
 * A chapter as authored. `share` is LazyTopper's relative estimate of how a unit's marks
 * split between its chapters — it is NOT a marks figure. CBSE publishes marks per UNIT
 * only (src/config/syllabus2026-27.ts, Maths p3 / Science p4); `weight` and `marks` are
 * derived from those unit marks below.
 */
type AuthoredTopic = Omit<DesktopTopicSummary, "weight" | "marks"> & { share: number };

const AUTHORED_TOPICS: AuthoredTopic[] = [
  {
    slug: "real-numbers",
    name: "Real Numbers",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    share: 6,
    blurb: "The fundamental theorem of arithmetic and proofs of the irrationality of √2, √3 and √5.",
  },
  {
    slug: "polynomials",
    name: "Polynomials",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    share: 6,
    blurb: "Zeroes of a quadratic polynomial and the relationship between its zeroes and coefficients.",
  },
  {
    slug: "pair-of-linear-equations",
    name: "Pair of Linear Equations",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 6,
    blurb: "Solving pairs of linear equations by substitution and elimination, including word problems.",
  },
  {
    slug: "quadratic-equations",
    name: "Quadratic Equations",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 6,
    blurb: "Factorisation, quadratic formula, discriminant analysis, and applied word problems.",
  },
  {
    slug: "arithmetic-progression",
    name: "Arithmetic Progression",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 5,
    blurb: "nth term, sum of the first n terms, and AP-based application problems.",
  },
  {
    slug: "triangles",
    name: "Triangles",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 7,
    blurb: "Similarity criteria, basic proportionality theorem, and proofs based on similar triangles.",
  },
  {
    slug: "coordinate-geometry",
    name: "Coordinate Geometry",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 6,
    blurb: "Distance formula and section formula on the coordinate plane.",
  },
  {
    slug: "trigonometry",
    name: "Trigonometry",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 12,
    blurb: "Trigonometric ratios and identities together with heights and distances applications.",
  },
  {
    slug: "circles",
    name: "Circles",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 6,
    blurb: "Tangents to a circle, length of tangents from an external point, and related proofs.",
  },
  {
    slug: "areas-related-to-circles",
    name: "Areas Related to Circles",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    share: 4,
    blurb: "Area of sectors and segments.",
  },
  {
    slug: "surface-areas-and-volumes",
    name: "Surface Areas and Volumes",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    share: 7,
    blurb: "Surface area and volume of combinations of solids.",
  },
  {
    slug: "statistics",
    name: "Statistics",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    share: 6,
    blurb: "Mean, median and mode of grouped data.",
  },
  {
    slug: "probability",
    name: "Probability",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    share: 5,
    blurb: "Classical probability of simple events with cards, dice, and similar setups.",
  },

  {
    slug: "chemical-reactions-and-equations",
    name: "Chemical Reactions & Equations",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    share: 6,
    blurb: "Types of chemical reactions, balancing equations, and oxidation–reduction basics.",
  },
  {
    slug: "acids-bases-and-salts",
    name: "Acids Bases & Salts",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    share: 6,
    blurb: "Properties of acids and bases, the pH scale, and the chemistry of common salts.",
  },
  {
    slug: "metals-and-non-metals",
    name: "Metals & Non-metals",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    share: 6,
    blurb: "Physical and chemical properties, the reactivity series, and extraction of metals.",
  },
  {
    slug: "carbon-and-its-compounds",
    name: "Carbon & its Compounds",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "high",
    share: 7,
    blurb: "Covalent bonding in carbon, homologous series, functional groups, and key organic reactions.",
  },
  {
    slug: "light-reflection-and-refraction",
    name: "Light - Reflection & Refraction",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    share: 7,
    blurb: "Spherical mirrors, lenses, the mirror and lens formulae, and image formation by ray diagrams.",
  },
  {
    slug: "human-eye-and-colourful-world",
    name: "Human Eye & Colourful World",
    subject: "Science",
    stream: "Physics",
    trendTier: "medium",
    share: 5,
    blurb: "Structure of the human eye, defects of vision and their correction, plus dispersion and scattering of light.",
  },
  {
    slug: "electricity",
    name: "Electricity",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    share: 7,
    blurb: "Ohm's law, resistors in series and parallel, and electrical power and energy numericals.",
  },
  {
    slug: "magnetic-effects-of-electric-current",
    name: "Magnetic Effects of Electric Current",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    share: 6,
    blurb: "Magnetic field due to current-carrying conductors, the right-hand rule, and the force on a conductor in a magnetic field.",
  },
  {
    slug: "life-processes",
    name: "Life Processes",
    subject: "Science",
    stream: "Biology",
    trendTier: "high",
    share: 8,
    blurb: "Nutrition, respiration, transportation, and excretion in plants and animals.",
  },
  {
    slug: "control-and-coordination",
    name: "Control & Coordination",
    subject: "Science",
    stream: "Biology",
    trendTier: "high",
    share: 6,
    blurb: "Nervous and hormonal coordination in animals and tropic movements in plants.",
  },
  {
    slug: "how-do-organisms-reproduce",
    name: "How do Organisms Reproduce",
    subject: "Science",
    stream: "Biology",
    trendTier: "medium",
    share: 6,
    blurb: "Modes of asexual and sexual reproduction in plants and animals, including reproductive health.",
  },
  {
    slug: "heredity",
    name: "Heredity",
    subject: "Science",
    stream: "Biology",
    trendTier: "medium",
    share: 5,
    blurb: "Mendel's laws of inheritance, monohybrid and dihybrid crosses, and sex determination.",
  },
  {
    slug: "our-environment",
    name: "Our Environment",
    subject: "Science",
    stream: "Biology",
    trendTier: "low",
    share: 4,
    blurb: "Ecosystems, food chains and food webs, and impact of human activities on the environment.",
  },
];

/**
 * Split CBSE's unit marks across the unit's chapters (SYLLABUS-FIX-CODE F2).
 *
 * THE RULE (deterministic): within each CBSE unit, the unit's marks are shared in
 * proportion to each chapter's authored `share`, by the largest-remainder method —
 * floor every proportional part, then hand the leftover marks one at a time to the
 * largest fractional parts; a tie goes to the chapter listed first in the CBSE unit
 * (F1 `units[].chapters` order). A one-chapter unit gets all of its unit's marks.
 * So every unit total is EXACT and each subject sums to exactly 80; only the split
 * inside a multi-chapter unit is an estimate, which is why the chip says "approx.".
 */
export function deriveChapterMarks(
  subject: SyllabusSubject,
  shareBySlug: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const unit of SYLLABUS_2026_27[subject].units) {
    const shares = unit.chapters.map((slug) => Math.max(0, shareBySlug.get(slug) ?? 0));
    const total = shares.reduce((a, b) => a + b, 0);
    const exact = shares.map((s) =>
      total > 0 ? (unit.marks * s) / total : unit.marks / unit.chapters.length,
    );
    const base = exact.map(Math.floor);
    let left = unit.marks - base.reduce((a, b) => a + b, 0);
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (let k = 0; left > 0; k = (k + 1) % order.length, left -= 1) base[order[k].i] += 1;
    unit.chapters.forEach((slug, i) => out.set(slug, base[i]));
  }
  return out;
}

const deriveTopics = (authored: AuthoredTopic[]): DesktopTopicSummary[] => {
  const marksBySlug = new Map<string, number>();
  for (const subject of ["maths", "science"] as const) {
    const label = subject === "maths" ? "Maths" : "Science";
    const shares = new Map(
      authored.filter((t) => t.subject === label).map((t) => [t.slug, t.share] as const),
    );
    for (const [slug, marks] of deriveChapterMarks(subject, shares)) marksBySlug.set(slug, marks);
  }
  return authored.map(({ share: _share, ...topic }) => {
    const weight = marksBySlug.get(topic.slug) ?? 0;
    return { ...topic, weight, marks: `approx. ${weight} marks` };
  });
};

const TOPICS: DesktopTopicSummary[] = deriveTopics(AUTHORED_TOPICS);

/**
 * THE WHOLE TOPIC REGISTRY, ENUMERABLE.
 *
 * ★ WHY THIS EXISTS. `desktopTopicsBySubject` can only be asked about a subject
 * a caller already knows the name of, so enumerating "every topic" through it
 * means restating the `DesktopSubject` union at the call site — a SECOND source
 * of truth that goes stale the day a third subject is added. `public/sitemap.xml`
 * is generated from this list (`src/config/sitemapUrls.ts`), and a sitemap that
 * quietly stops advertising a whole subject is exactly the silent-drop this
 * export removes.
 *
 * A COPY, not the array itself: `TOPICS` stays private and immutable to callers.
 */
export const allDesktopTopics = (): DesktopTopicSummary[] => [...TOPICS];

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

  // topicKey-duplication audit (2026-06-16): the bank also stores PascalCase
  // Science abbreviations (predictedQuestionsScience.ts + class10ScienceTopicTrends)
  // and a couple of `science_*` keys. Those have NO internal separator, so the
  // slug-style `normalize` above collapses them to a single lowercase blob that
  // missed every slug / display-name / alias — and the Me weak-area row then fell
  // back to /exam-trends. These map each failing normalized blob to its canonical.
  "light": "light-reflection-and-refraction",
  "lifeprocesses": "life-processes",
  "acidsbasessalts": "acids-bases-and-salts",
  "humaneyeandcolourfulworld": "human-eye-and-colourful-world",
  "carboncompounds": "carbon-and-its-compounds",
  "controlandcoordination": "control-and-coordination",
  "metalsnonmetals": "metals-and-non-metals",
  "chemicalreactions": "chemical-reactions-and-equations",
  "magneticeffects": "magnetic-effects-of-electric-current",
  "heredityevolution": "heredity",
  "ourenvironment": "our-environment",
  "science-light-reflection-refraction": "light-reflection-and-refraction",
  "science-reproduction": "how-do-organisms-reproduce",

  // P0 [FU-TOPICKEY-UNIVERSAL] owner-approved mappings (2026-07-11). The bank DATA is
  // migrated to canonical slugs (Commit 2), so these no longer appear as bank keys — but
  // they may still arrive from a stored MI record, a URL param, or a legacy link, so the
  // runtime resolver covers them too. `desktopTopicBySlug` normalizes before lookup, so the
  // keys are the normalized ("the" included) spellings of the approved variants.
  "introduction-to-trigonometry": "trigonometry",
  "applications-of-trigonometry": "trigonometry",
  "human-eye-and-the-colourful-world": "human-eye-and-colourful-world",
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

// Weak-area / attribution resolver (topicKey-duplication audit, 2026-06-16).
//
// Attempts and mistakes are stored under the RAW topic label (recordAttempt /
// recordMistake never canonicalise), so a stored key can be any of the bank's
// variant spellings. `desktopTopicBySlug` alone handles kebab / Title-Case /
// en-dash, and (with the aliases above) the known PascalCase Science blobs — but
// it does NOT camelCase-split, so it cannot generalise to arbitrary variants.
//
// This wraps it with the SAME strong resolver the serving surfaces already use
// (`getRuntimeTopicCandidates` — camelCase split + the canonical alias map): try
// the raw key first, then each runtime candidate spelling. Reuses the existing
// resolver; introduces no fourth normaliser. Genuinely-unknown topics still
// return undefined, so the Me row keeps its honest /exam-trends fallback.
export const desktopTopicForWeakAreaKey = (
  rawKey: string,
): DesktopTopicSummary | undefined => {
  const direct = desktopTopicBySlug(rawKey);
  if (direct) return direct;
  for (const candidate of getRuntimeTopicCandidates(rawKey)) {
    const viaCandidate = desktopTopicBySlug(candidate);
    if (viaCandidate) return viaCandidate;
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
