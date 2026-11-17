// src/components/dailyQuestion/dailyQuestions.ts
//
// SEO-DAILY-1 - the registry and pure model behind the public "Important Question of the Day" pages:
// /important-question-of-the-day (hub) and /important-question-of-the-day/<slug> (one page per question).
//
// ★ NO REACT, NO BANK, NO SERVICES (same rule as components/cbq/cbqSeo.ts): node scripts (writeStaticHeads, the sitemap) import this.
// ★ THE QUESTION TEXT IS NEVER TYPED HERE. A row is a POINTER into the question bank (`bankId` + `chapterSlug`); the page reads the
//   question, options, step-marked solution and final answer from the bank row at render (useDailyQuestion). `marks` is metadata the
//   head and the H1 need without the bank; dailyQuestions.guard.test.ts pins it (and the subject, and the id) to the real bank row.
// ★ POSTED IN ORDER. `n` is the number the channel post carries; `date` is the IST day it is posted (display-free: the pages read no clock).

import { cbqTopicBySlug } from "../cbq/cbqSeo";
import { canonicalFor } from "../../config/canonicalUrl";

export const DAILY_HUB_PATH = "/important-question-of-the-day";

export interface DailyQuestionEntry {
  /** The number the channel post carries ("Important Question of the Day #n"). */
  n: number;
  /** IST day it is posted, YYYY-MM-DD. */
  date: string;
  /** One path segment, a closed set: <chapter>-<topic>-<marks>-mark(s). */
  slug: string;
  /** The question bank row id (src/data/bankChapters/<chapterSlug>). */
  bankId: string;
  subject: "Maths" | "Science";
  chapterSlug: string;
  /** The bank row's marks (pinned to the bank by the guard). */
  marks: number;
}

/**
 * Posted questions that have a real bank row. #2 (4 and 12 ohm in parallel on 6 V), #3 (sin A = 3/5: cos A and tan A), #4 (Zn + dilute
 * H2SO4 with state symbols) and #5 (AP 3, 7, 11: S20) have no near-identical bank row yet, so they have no page (never a page without a
 * real bank question behind it).
 */
export const DAILY_QUESTIONS: readonly DailyQuestionEntry[] = [
  { n: 1, date: "2026-11-16", slug: "quadratic-equations-find-roots-1-mark", bankId: "QE2-049", subject: "Maths", chapterSlug: "quadratic-equations", marks: 1 },
  { n: 6, date: "2026-11-21", slug: "light-concave-mirror-image-3-marks", bankId: "LT-M01", subject: "Science", chapterSlug: "light-reflection-and-refraction", marks: 3 },
  { n: 7, date: "2026-11-22", slug: "probability-prime-on-a-die-1-mark", bankId: "PB-M-1-PROB-A-001", subject: "Maths", chapterSlug: "probability", marks: 1 },
  { n: 8, date: "2026-11-23", slug: "life-processes-left-ventricle-wall-1-mark", bankId: "AR-LP-006", subject: "Science", chapterSlug: "life-processes", marks: 1 },
];

/** Newest first (the hub's order, and the order of `prev`/`next` neighbours). */
export function dailyQuestionsNewestFirst(): DailyQuestionEntry[] {
  return [...DAILY_QUESTIONS].sort((a, b) => b.n - a.n);
}

/** The slugs, registry order. Feeds the sitemap, the canonical family, the rewrite and the prerender set. */
export function dailyQuestionSlugs(): string[] {
  return DAILY_QUESTIONS.map((q) => q.slug);
}

export function dailyQuestionBySlug(slug: string): DailyQuestionEntry | undefined {
  return DAILY_QUESTIONS.find((q) => q.slug === slug);
}

export function dailyQuestionPath(slug: string): string {
  return `${DAILY_HUB_PATH}/${slug}`;
}

export function dailyChapterName(entry: DailyQuestionEntry): string {
  const topic = cbqTopicBySlug(entry.chapterSlug);
  if (!topic) throw new Error(`dailyQuestions: chapter "${entry.chapterSlug}" of #${entry.n} is not in the chapter registry.`);
  return topic.name;
}

export function marksLabel(marks: number): string {
  return `${marks} ${marks === 1 ? "mark" : "marks"}`;
}

/** The neighbours in posting order: `prev` is the question before this one, `next` the one after (either may be null). */
export function dailyNeighbours(slug: string): { prev: DailyQuestionEntry | null; next: DailyQuestionEntry | null } {
  const ordered = [...DAILY_QUESTIONS].sort((a, b) => a.n - b.n);
  const i = ordered.findIndex((q) => q.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: ordered[i - 1] ?? null, next: ordered[i + 1] ?? null };
}

/* ── head strings ─────────────────────────────────────────────────────────────────────────── */

export const DAILY_TITLE_CAP = 60;
export const DAILY_DESCRIPTION_CAP = 155;

export const DAILY_HUB_H1 = "Important Question of the Day: CBSE Class 10 (2027)";

export const DAILY_HUB_HEAD = {
  title: "Important Question of the Day | Class 10 2027 | LazyTopper",
  description:
    "A new CBSE Class 10 Maths or Science important question every day, from the board-pattern bank, with the step-marking answer and marks.",
} as const;

export function dailyQuestionH1(entry: DailyQuestionEntry): string {
  return `Important Question of the Day #${entry.n}: ${dailyChapterName(entry)} (${marksLabel(entry.marks)})`;
}

/** The first form that fits DAILY_TITLE_CAP in total, always with "Class 10" and "2027"; THROWS past the last form. */
export function dailyQuestionTitle(entry: DailyQuestionEntry): string {
  const ch = dailyChapterName(entry);
  const ladder = [
    `Important Question #${entry.n}: ${ch} | Class 10 2027 | LazyTopper`,
    `Important Question #${entry.n}: ${ch} | Class 10 2027`,
    `Question of the Day #${entry.n}: ${ch} Class 10 2027`,
    `Question #${entry.n}: ${ch} Class 10 2027`,
  ];
  const fit = ladder.find((candidate) => candidate.length <= DAILY_TITLE_CAP);
  if (!fit) throw new Error(`dailyQuestions: no title for #${entry.n} "${ch}" fits ${DAILY_TITLE_CAP} characters.`);
  return fit;
}

export function dailyQuestionDescription(entry: DailyQuestionEntry): string {
  const text = `CBSE Class 10 ${entry.subject} important question on ${dailyChapterName(entry)} (${marksLabel(entry.marks)}) for 2027, with the step-marking answer.`;
  if (text.length > DAILY_DESCRIPTION_CAP) {
    throw new Error(`dailyQuestions: description for #${entry.n} is ${text.length} characters, over ${DAILY_DESCRIPTION_CAP}.`);
  }
  return text;
}

/** The head for a daily-question path, or null for a path that is not one. Used by writeStaticHeads. */
export function dailyHeadForPath(path: string): { title: string; description: string } | null {
  if (path === DAILY_HUB_PATH) return { ...DAILY_HUB_HEAD };
  if (!path.startsWith(`${DAILY_HUB_PATH}/`)) return null;
  const entry = dailyQuestionBySlug(path.slice(DAILY_HUB_PATH.length + 1));
  if (!entry) return null;
  return { title: dailyQuestionTitle(entry), description: dailyQuestionDescription(entry) };
}

/**
 * JSON-LD: a BreadcrumbList (Home > Important Question of the Day > question) and, on a question page, one `LearningResource` (the same
 * two types cbqJsonLd emits). No Quiz / Question markup: the practice-problems rich result is deprecated and the answer is not a QAPage.
 */
export function dailyJsonLd(path: string, basename: string): Record<string, unknown> | null {
  const home = canonicalFor("/", basename);
  const hub = canonicalFor(DAILY_HUB_PATH, basename);
  if (path === DAILY_HUB_PATH) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: home },
        { "@type": "ListItem", position: 2, name: "Important Question of the Day", item: hub },
      ],
    };
  }
  if (!path.startsWith(`${DAILY_HUB_PATH}/`)) return null;
  const entry = dailyQuestionBySlug(path.slice(DAILY_HUB_PATH.length + 1));
  if (!entry) return null;
  const url = canonicalFor(path, basename);
  const chapter = dailyChapterName(entry);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: home },
          { "@type": "ListItem", position: 2, name: "Important Question of the Day", item: hub },
          { "@type": "ListItem", position: 3, name: `#${entry.n}: ${chapter}`, item: url },
        ],
      },
      {
        "@type": "LearningResource",
        name: `Important Question of the Day #${entry.n}: ${chapter} (${marksLabel(entry.marks)}) with the step-marking answer`,
        url,
        educationalLevel: "Class 10",
        learningResourceType: "Practice question",
        about: [
          { "@type": "Thing", name: chapter },
          { "@type": "Thing", name: entry.subject === "Maths" ? "Mathematics" : entry.subject },
        ],
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: "LazyTopper", url: home },
        provider: { "@type": "Organization", name: "LazyTopper", url: home },
      },
    ],
  };
}
