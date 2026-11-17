// src/components/freeMcq/freeMcqPages.ts
//
// SEO-MCQ-1 - the registry and pure model behind the public free-MCQ pages: /free-mcq-class-10 (hub) and /free-mcq-class-10/<slug> (one page per
// free chapter MCQ bank, 27 of them).
//
// ★ NO REACT, NO BANK, NO JSON (same rule as components/cbq/cbqSeo.ts and dailyQuestion/dailyQuestions.ts): node scripts (writeStaticHeads, the
//   sitemap) and the entry chunk's rewrite/sitemap helpers import this, so it must stay tiny. The question text lives in
//   src/content/freeMcq/freeMcqPreview.json, which only the PAGE loads (lazily); freeMcqPages.guard.test.ts pins every row here (manifest id,
//   subject, chapter name, question count) to that file, so the two cannot drift.
// ★ ONE PAGE PER MCQ BANK. Our chapter registry has 26 chapters; the MCQ banks split Trigonometry into two PDFs (Introduction to Trigonometry,
//   Heights and Distances), so "heights-and-distances" is the one page slug that is not itself a registry chapter: its `parentSlug` is
//   "trigonometry", where its notes and CBQ links point.

import { cbqTopicBySlug } from "../cbq/cbqSeo";
import { canonicalFor } from "../../config/canonicalUrl";

export const FREE_MCQ_HUB_PATH = "/free-mcq-class-10";
/** Where the free PDFs are downloaded (the signed-in free block on the CBSE page). */
export const FREE_MCQ_DOWNLOAD_PATH = "/cbse/class-10#free";

export interface FreeMcqChapter {
  /** One path segment, a closed set. */
  slug: string;
  /** The id of the chapter in freeMcqPreview.json. */
  manifestId: string;
  subject: "Maths" | "Science";
  /** The chapter name exactly as the free PDF names it (freeMcqPreview.json `chapter`). */
  chapter: string;
  /** The chapter registry slug whose notes and CBQ pages this bank belongs with. */
  parentSlug: string;
  /** How many questions the page shows (freeMcqPreview.json `questions.length`; pinned by the guard). */
  count: number;
}

/** Maths first, then Science, in the order of the free PDFs. */
export const FREE_MCQ_CHAPTERS: readonly FreeMcqChapter[] = [
  { slug: "real-numbers", manifestId: "mcq-maths-real-numbers", subject: "Maths", chapter: "Real Numbers", parentSlug: "real-numbers", count: 8 },
  { slug: "polynomials", manifestId: "mcq-maths-polynomials", subject: "Maths", chapter: "Polynomials", parentSlug: "polynomials", count: 5 },
  { slug: "pair-of-linear-equations", manifestId: "mcq-maths-linear-equations", subject: "Maths", chapter: "Linear Equations in Two Variables", parentSlug: "pair-of-linear-equations", count: 7 },
  { slug: "quadratic-equations", manifestId: "mcq-maths-quadratic-equations", subject: "Maths", chapter: "Quadratic Equations", parentSlug: "quadratic-equations", count: 7 },
  { slug: "arithmetic-progression", manifestId: "mcq-maths-arithmetic-progressions", subject: "Maths", chapter: "Arithmetic Progressions", parentSlug: "arithmetic-progression", count: 8 },
  { slug: "triangles", manifestId: "mcq-maths-triangles", subject: "Maths", chapter: "Triangles", parentSlug: "triangles", count: 4 },
  { slug: "coordinate-geometry", manifestId: "mcq-maths-coordinate-geometry", subject: "Maths", chapter: "Coordinate Geometry", parentSlug: "coordinate-geometry", count: 8 },
  { slug: "trigonometry", manifestId: "mcq-maths-trigonometry", subject: "Maths", chapter: "Introduction to Trigonometry", parentSlug: "trigonometry", count: 6 },
  { slug: "heights-and-distances", manifestId: "mcq-maths-heights-distances", subject: "Maths", chapter: "Heights and Distances", parentSlug: "trigonometry", count: 8 },
  { slug: "circles", manifestId: "mcq-maths-circles", subject: "Maths", chapter: "Circles", parentSlug: "circles", count: 3 },
  { slug: "areas-related-to-circles", manifestId: "mcq-maths-areas-circles", subject: "Maths", chapter: "Areas Related to Circles", parentSlug: "areas-related-to-circles", count: 6 },
  { slug: "surface-areas-and-volumes", manifestId: "mcq-maths-surface-areas-volumes", subject: "Maths", chapter: "Surface Areas and Volumes", parentSlug: "surface-areas-and-volumes", count: 8 },
  { slug: "statistics", manifestId: "mcq-maths-statistics", subject: "Maths", chapter: "Statistics", parentSlug: "statistics", count: 7 },
  { slug: "probability", manifestId: "mcq-maths-probability", subject: "Maths", chapter: "Probability", parentSlug: "probability", count: 7 },
  { slug: "chemical-reactions-and-equations", manifestId: "mcq-science-chemical-reactions", subject: "Science", chapter: "Chemical Reactions and Equations", parentSlug: "chemical-reactions-and-equations", count: 7 },
  { slug: "acids-bases-and-salts", manifestId: "mcq-science-acids-bases-salts", subject: "Science", chapter: "Acids, Bases and Salts", parentSlug: "acids-bases-and-salts", count: 5 },
  { slug: "metals-and-non-metals", manifestId: "mcq-science-metals-non-metals", subject: "Science", chapter: "Metals and Non-metals", parentSlug: "metals-and-non-metals", count: 6 },
  { slug: "carbon-and-its-compounds", manifestId: "mcq-science-carbon-compounds", subject: "Science", chapter: "Carbon and its Compounds", parentSlug: "carbon-and-its-compounds", count: 8 },
  { slug: "life-processes", manifestId: "mcq-science-life-processes", subject: "Science", chapter: "Life Processes", parentSlug: "life-processes", count: 7 },
  { slug: "control-and-coordination", manifestId: "mcq-science-control-coordination", subject: "Science", chapter: "Control and Coordination", parentSlug: "control-and-coordination", count: 7 },
  { slug: "how-do-organisms-reproduce", manifestId: "mcq-science-reproduction", subject: "Science", chapter: "How do Organisms Reproduce", parentSlug: "how-do-organisms-reproduce", count: 7 },
  { slug: "heredity", manifestId: "mcq-science-heredity", subject: "Science", chapter: "Heredity", parentSlug: "heredity", count: 4 },
  { slug: "light-reflection-and-refraction", manifestId: "mcq-science-light", subject: "Science", chapter: "Light: Reflection and Refraction", parentSlug: "light-reflection-and-refraction", count: 6 },
  { slug: "human-eye-and-colourful-world", manifestId: "mcq-science-human-eye", subject: "Science", chapter: "Human Eye and the Colourful World", parentSlug: "human-eye-and-colourful-world", count: 6 },
  { slug: "electricity", manifestId: "mcq-science-electricity", subject: "Science", chapter: "Electricity", parentSlug: "electricity", count: 7 },
  { slug: "magnetic-effects-of-electric-current", manifestId: "mcq-science-magnetic-effects", subject: "Science", chapter: "Magnetic Effects of Electric Current", parentSlug: "magnetic-effects-of-electric-current", count: 5 },
  { slug: "our-environment", manifestId: "mcq-science-our-environment", subject: "Science", chapter: "Our Environment", parentSlug: "our-environment", count: 6 },
];

/** The slugs, registry order. Feeds the sitemap, the canonical family, the rewrite and the prerender set. */
export function freeMcqSlugs(): string[] {
  return FREE_MCQ_CHAPTERS.map((c) => c.slug);
}

export function freeMcqBySlug(slug: string): FreeMcqChapter | undefined {
  return FREE_MCQ_CHAPTERS.find((c) => c.slug === slug);
}

export function freeMcqPath(slug: string): string {
  return `${FREE_MCQ_HUB_PATH}/${slug}`;
}

/** The MCQ banks that belong with one chapter-registry chapter (Trigonometry has two, every other chapter one). */
export function freeMcqForParent(parentSlug: string): FreeMcqChapter[] {
  return FREE_MCQ_CHAPTERS.filter((c) => c.parentSlug === parentSlug);
}

export function freeMcqTotalQuestions(): number {
  return FREE_MCQ_CHAPTERS.reduce((sum, c) => sum + c.count, 0);
}

/** The neighbours in registry order (either may be null). */
export function freeMcqNeighbours(slug: string): { prev: FreeMcqChapter | null; next: FreeMcqChapter | null } {
  const i = FREE_MCQ_CHAPTERS.findIndex((c) => c.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: FREE_MCQ_CHAPTERS[i - 1] ?? null, next: FREE_MCQ_CHAPTERS[i + 1] ?? null };
}

/** The name of the chapter-registry chapter a bank belongs with (its notes and CBQ pages). THROWS when the parent is not in the registry. */
export function freeMcqParentName(entry: FreeMcqChapter): string {
  const topic = cbqTopicBySlug(entry.parentSlug);
  if (!topic) throw new Error(`freeMcqPages: parent chapter "${entry.parentSlug}" of "${entry.slug}" is not in the chapter registry.`);
  return topic.name;
}

/* ── head strings ─────────────────────────────────────────────────────────────────────────── */

export const FREE_MCQ_TITLE_CAP = 60;
export const FREE_MCQ_DESCRIPTION_CAP = 155;

export const FREE_MCQ_HUB_H1 = "Free MCQs for CBSE Class 10 Maths and Science (2026-27)";

export const FREE_MCQ_HUB_HEAD = {
  title: "Free MCQs Class 10 with Answers 2027 | LazyTopper",
  description: "Free CBSE Class 10 Maths and Science MCQs for 2027, chapter by chapter, with the answer and a short explanation for every question.",
} as const;

export function freeMcqH1(entry: FreeMcqChapter): string {
  return `${entry.chapter} MCQs Class 10 with Answers (CBSE 2026-27)`;
}

/** The first form that fits FREE_MCQ_TITLE_CAP in total, always with "Class 10" and "2027"; THROWS past the last form. */
export function freeMcqTitle(entry: FreeMcqChapter): string {
  const ch = entry.chapter;
  const ladder = [`${ch} MCQs Class 10 (2027) | LazyTopper`, `${ch} MCQs Class 10 2027 | LazyTopper`, `${ch} MCQs Class 10 2027`];
  const fit = ladder.find((candidate) => candidate.length <= FREE_MCQ_TITLE_CAP);
  if (!fit) throw new Error(`freeMcqPages: no title for "${ch}" fits ${FREE_MCQ_TITLE_CAP} characters.`);
  return fit;
}

export function freeMcqDescription(entry: FreeMcqChapter): string {
  const text = `Free CBSE Class 10 ${entry.subject} MCQs on ${entry.chapter} for 2027: ${entry.count} questions with answers and short explanations.`;
  if (text.length > FREE_MCQ_DESCRIPTION_CAP) {
    throw new Error(`freeMcqPages: description for "${entry.slug}" is ${text.length} characters, over ${FREE_MCQ_DESCRIPTION_CAP}.`);
  }
  return text;
}

/** The head for a free-MCQ path, or null for a path that is not one. Used by writeStaticHeads. */
export function freeMcqHeadForPath(path: string): { title: string; description: string } | null {
  if (path === FREE_MCQ_HUB_PATH) return { ...FREE_MCQ_HUB_HEAD };
  if (!path.startsWith(`${FREE_MCQ_HUB_PATH}/`)) return null;
  const entry = freeMcqBySlug(path.slice(FREE_MCQ_HUB_PATH.length + 1));
  if (!entry) return null;
  return { title: freeMcqTitle(entry), description: freeMcqDescription(entry) };
}

/**
 * JSON-LD: a BreadcrumbList (Home > Free MCQs > chapter) and, on a chapter page, one `LearningResource` (the type cbqJsonLd and dailyJsonLd emit).
 * No Quiz / Question / acceptedAnswer markup: Google's Quiz rich result is documented for flashcards only (the practice-problems result is
 * retired), so multiple-choice items would be marked up as something they are not. The `name` repeats the visible H1.
 */
export function freeMcqJsonLd(path: string, basename: string): Record<string, unknown> | null {
  const home = canonicalFor("/", basename);
  const hub = canonicalFor(FREE_MCQ_HUB_PATH, basename);
  if (path === FREE_MCQ_HUB_PATH) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: home },
        { "@type": "ListItem", position: 2, name: "Free MCQs Class 10", item: hub },
      ],
    };
  }
  if (!path.startsWith(`${FREE_MCQ_HUB_PATH}/`)) return null;
  const entry = freeMcqBySlug(path.slice(FREE_MCQ_HUB_PATH.length + 1));
  if (!entry) return null;
  const url = canonicalFor(path, basename);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: home },
          { "@type": "ListItem", position: 2, name: "Free MCQs Class 10", item: hub },
          { "@type": "ListItem", position: 3, name: entry.chapter, item: url },
        ],
      },
      {
        "@type": "LearningResource",
        name: freeMcqH1(entry),
        url,
        educationalLevel: "Class 10",
        learningResourceType: "Practice questions",
        about: [
          { "@type": "Thing", name: entry.chapter },
          { "@type": "Thing", name: entry.subject === "Maths" ? "Mathematics" : entry.subject },
        ],
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: "LazyTopper", url: home },
        provider: { "@type": "Organization", name: "LazyTopper", url: home },
      },
    ],
  };
}
