// src/components/cbq/cbqSeo.ts
//
// CBQ-SEO-1 — the pure model behind the public CBQ pages: /cbq-class-10 (hub) and
// /cbq-class-10/:chapterSlug (one page per chapter).
//
// ★ NO REACT, NO BANK, NO SERVICES. This module is imported by node scripts
//   (`scripts/seo/writeStaticHeads.ts`) and by `src/config/sitemapUrls.ts`, whose import graphs
//   must stay free of `.tsx` (see the long note in `scripts/generateSitemap.ts`) and light enough
//   not to drag the question bank into the entry chunk. It reads only `lib/desktop/topics`
//   (the registry the notes and topic-hub pages already resolve against) and `canonicalUrl`.
//
// ★ REAL ROWS ONLY. `pickCbqSamples` chooses among rows the CBQ pack already sells
//   (`isCbqPackRow`, src/lib/packs/packContent.ts) — the page never invents a question.

import { allDesktopTopics, type DesktopTopicSummary } from "../../lib/desktop/topics";
import { canonicalFor } from "../../config/canonicalUrl";

export const CBQ_HUB_PATH = "/cbq-class-10";

/** `/cbq-class-10/<slug>` */
export function cbqChapterPath(slug: string): string {
  return `${CBQ_HUB_PATH}/${slug}`;
}

/** The chapters that get a page: exactly the registry the notes and topic-hub pages use (Maths first, then Science). */
export function cbqChapterTopics(): DesktopTopicSummary[] {
  return allDesktopTopics();
}

/** The chapter slugs, registry order. Feeds the sitemap, the canonical family and the prerender set. */
export function cbqChapterSlugs(): string[] {
  return cbqChapterTopics().map((topic) => topic.slug);
}

export function cbqTopicBySlug(slug: string): DesktopTopicSummary | undefined {
  return cbqChapterTopics().find((topic) => topic.slug === slug);
}

/* ── head strings ─────────────────────────────────────────────────────────────────────────── */

/** The most characters a whole <title> may have (owner spec). */
export const CBQ_TITLE_CAP = 60;
/** The most characters a meta description may have (the site-wide cap). */
export const CBQ_DESCRIPTION_CAP = 155;

export const CBQ_HUB_H1 = "CBSE Class 10 CBQs 2027 — competency-based questions with solutions";

export const CBQ_HUB_HEAD = {
  title: "CBSE Class 10 CBQs 2027 with Solutions | LazyTopper",
  description:
    "Competency-based questions (CBQs) for CBSE Class 10 Maths and Science 2027, chapter by chapter, with step-wise solutions and marks.",
} as const;

/**
 * "<chapter> CBQs ... | LazyTopper", the first form that fits CBQ_TITLE_CAP in total; THROWS past the
 * last form (shorter text, never a cap exception). The chapter name is never cut.
 */
export function cbqChapterTitle(chapterName: string): string {
  const ladder = [
    `${chapterName} CBQs Class 10 (2027) | LazyTopper`,
    `${chapterName} Class 10 CBQs | LazyTopper`,
    `${chapterName} CBQs | LazyTopper`,
  ];
  const fit = ladder.find((candidate) => candidate.length <= CBQ_TITLE_CAP);
  if (!fit) {
    throw new Error(`cbqSeo: no title for "${chapterName}" fits ${CBQ_TITLE_CAP} characters.`);
  }
  return fit;
}

export function cbqChapterDescription(chapterName: string, subject: string): string {
  const text =
    `Real CBSE Class 10 ${subject} CBQs on ${chapterName} for 2027: sample questions with step-wise solutions and marks.`;
  if (text.length > CBQ_DESCRIPTION_CAP) {
    throw new Error(`cbqSeo: description for "${chapterName}" is ${text.length} characters, over ${CBQ_DESCRIPTION_CAP}.`);
  }
  return text;
}

export function cbqChapterH1(chapterName: string): string {
  return `${chapterName} CBQs — CBSE Class 10 (2027) with step-wise solutions`;
}

/** The head for any CBQ path, or null for a path that is not one. Used by writeStaticHeads. */
export function cbqHeadForPath(path: string): { title: string; description: string } | null {
  if (path === CBQ_HUB_PATH) return { ...CBQ_HUB_HEAD };
  if (!path.startsWith(`${CBQ_HUB_PATH}/`)) return null;
  const topic = cbqTopicBySlug(path.slice(CBQ_HUB_PATH.length + 1));
  if (!topic) return null;
  return { title: cbqChapterTitle(topic.name), description: cbqChapterDescription(topic.name, topic.subject) };
}

/**
 * JSON-LD for a CBQ page: a BreadcrumbList (Home › CBQs › chapter) and, on a chapter page, one
 * `LearningResource` — the same two types the notes pages already emit and validate
 * (`notesJsonLd`). No `Quiz`/`Question` markup: Google's practice-problems (Quiz) rich result is
 * deprecated (see `solutionsJsonLd`), and `FAQPage`/`QAPage` would misdescribe a study page.
 */
export function cbqJsonLd(path: string, basename: string): Record<string, unknown> | null {
  const home = canonicalFor("/", basename);
  const hub = canonicalFor(CBQ_HUB_PATH, basename);
  if (path === CBQ_HUB_PATH) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: home },
        { "@type": "ListItem", position: 2, name: "Class 10 CBQs", item: hub },
      ],
    };
  }
  if (!path.startsWith(`${CBQ_HUB_PATH}/`)) return null;
  const topic = cbqTopicBySlug(path.slice(CBQ_HUB_PATH.length + 1));
  if (!topic) return null;
  const url = canonicalFor(path, basename);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: home },
          { "@type": "ListItem", position: 2, name: "Class 10 CBQs", item: hub },
          { "@type": "ListItem", position: 3, name: topic.name, item: url },
        ],
      },
      {
        "@type": "LearningResource",
        name: `${topic.name} — Class 10 CBQs with solutions`,
        url,
        educationalLevel: "Class 10",
        learningResourceType: "Practice questions",
        about: [
          { "@type": "Thing", name: topic.name },
          { "@type": "Thing", name: topic.subject === "Maths" ? "Mathematics" : topic.subject },
        ],
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: "LazyTopper", url: home },
        provider: { "@type": "Organization", name: "LazyTopper", url: home },
      },
    ],
  };
}

/* ── the deterministic sample selector ───────────────────────────────────────────────────── */

/** How many sample CBQs a chapter page shows. */
export const CBQ_SAMPLE_COUNT = 5;

/** The slots a chapter page tries to fill, in this order: one question per format where the bank has one. */
export const CBQ_SAMPLE_FORMAT_ORDER = ["MCQ", "Assertion-Reasoning", "Short", "Case-Based", "Long"] as const;

/** The structural slice of a bank row the selector reads (a `CanonicalQuestion` fits). */
export interface CbqSampleRow {
  id: string;
  format?: string;
  marks: number | string;
  questionText?: string;
  options?: readonly string[];
  solutionSteps?: readonly string[];
  finalAnswer?: string;
}

/**
 * True when anything the sample would PRINT contains a rupee sign. The prerender price guard
 * (prerenderPrice.guard.test.ts) fails on any "₹" token it did not recognise as a price on a priced page,
 * so a money word problem in a sample would be indistinguishable from a price in the static HTML. Those rows
 * are skipped for the sample (they stay in the bank, the pack and the practice route).
 */
export function showsRupeeSign(q: CbqSampleRow): boolean {
  const parts = [q.questionText, q.finalAnswer, ...(q.options ?? []), ...(q.solutionSteps ?? [])];
  return parts.some((part) => typeof part === "string" && part.includes("\u20B9"));
}

/** The page's format slot for a row: VSA (2-mark) and Short (3-mark) share the "Short" slot. */
export function cbqFormatSlot(format: string | undefined): string {
  return format === "VSA" ? "Short" : String(format ?? "");
}

/** Plain label printed on a sample ("MCQ", "Assertion-Reason", "Case study", "Short answer", "Long answer"). */
export function cbqFormatLabel(format: string | undefined): string {
  switch (cbqFormatSlot(format)) {
    case "MCQ":
      return "MCQ";
    case "Assertion-Reasoning":
      return "Assertion-Reason";
    case "Case-Based":
      return "Case study";
    case "Short":
      return "Short answer";
    case "Long":
      return "Long answer";
    default:
      return "Question";
  }
}

const byId = (a: CbqSampleRow, b: CbqSampleRow): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Up to `count` sample rows for a chapter page. PURE and DETERMINISTIC (no Math.random — CLAUDE.md §7):
 *   1. keep only rows that have a stored step-wise solution and print no rupee sign (showsRupeeSign);
 *   2. stable-sort by id;
 *   3. take the lowest-id row of each format slot in CBQ_SAMPLE_FORMAT_ORDER;
 *   4. if slots are missing, top up with the next lowest-id unused rows, cycling the formats.
 * The caller passes rows that are already `isCbqPackRow` (and figure-safe); this never adds a row of its own.
 * The result is in format order, so the page reads MCQ first and long answer last.
 */
export function pickCbqSamples<T extends CbqSampleRow>(rows: readonly T[], count: number = CBQ_SAMPLE_COUNT): T[] {
  const usable = rows
    .filter((q) => Array.isArray(q.solutionSteps) && q.solutionSteps.filter(Boolean).length > 0 && !showsRupeeSign(q))
    .sort(byId);
  const chosen: T[] = [];
  const used = new Set<string>();
  for (const slot of CBQ_SAMPLE_FORMAT_ORDER) {
    if (chosen.length >= count) break;
    const hit = usable.find((q) => cbqFormatSlot(q.format) === slot);
    if (hit) {
      chosen.push(hit);
      used.add(hit.id);
    }
  }
  // Top-up: round-robin over the slots, lowest id first, so a chapter with few formats still shows several questions.
  for (let guard = 0; chosen.length < count && guard < usable.length; guard += 1) {
    for (const slot of CBQ_SAMPLE_FORMAT_ORDER) {
      if (chosen.length >= count) break;
      const hit = usable.find((q) => cbqFormatSlot(q.format) === slot && !used.has(q.id));
      if (hit) {
        chosen.push(hit);
        used.add(hit.id);
      }
    }
  }
  const rank = (q: CbqSampleRow): number => CBQ_SAMPLE_FORMAT_ORDER.indexOf(cbqFormatSlot(q.format) as (typeof CBQ_SAMPLE_FORMAT_ORDER)[number]);
  // Stable: Array.prototype.sort is stable; ties keep selection order (which is id order within a slot).
  return chosen.sort((a, b) => rank(a) - rank(b));
}
