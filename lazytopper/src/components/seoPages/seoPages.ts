// src/components/seoPages/seoPages.ts
//
// SEO-PAGES-1 — the pure model behind the three public search-landing pages:
//   /mock-test-class-10            CBSE Class 10 Mock Test 2027 (Maths & Science)
//   /question-bank-class-10        CBSE Class 10 Question Bank 2027, chapter-wise
//   /cbse-marking-scheme-class-10  CBSE Class 10 Marking Scheme 2027, how step marks are given
//
// ★ NO REACT, NO BANK, NO SERVICES. Imported by node scripts (`scripts/seo/writeStaticHeads.ts`) and by
//   `config/canonicalUrl.ts`, so it reads only the topic registry, the solutions page list and canonicalUrl.
// ★ NO PRICE HERE. A price is read at render time from the pack helpers (`packPriceLabel`), never typed
//   and never in a head string or in structured data (static markup stays number-free; see faqContent.ts).

import { freeMcqForParent, freeMcqPath } from "../freeMcq/freeMcqPages";
import { allDesktopTopics, type DesktopTopicSummary } from "../../lib/desktop/topics";
import { canonicalFor } from "../../config/canonicalUrl";
import { SOLUTIONS_PAGES, solutionsPath } from "../../config/solutionsPages";

export const MOCK_TEST_PATH = "/mock-test-class-10";
export const QUESTION_BANK_PATH = "/question-bank-class-10";
export const MARKING_SCHEME_PATH = "/cbse-marking-scheme-class-10";
/** CC27-SITE-1: the Crash Course 2027 landing. It shares the shell, head and breadcrumb model but is NOT one of the three cross-linked pages. */
export const CRASH_COURSE_PATH = "/class-10-crash-course-2027";
/**
 * SEO-SELL-3 (owner, 28 Nov 2026): the sample-paper search landing, "class 10 maths sample paper". It has a spec (so its head, breadcrumb
 * and prerender come from this model like the three above) but is NOT in SEO_PAGES_PATHS: that list is the three pages' own cross-link
 * set. SeoLandingShell links it from "More for Class 10" separately.
 */
export const SAMPLE_PAPER_PATH = "/sample-paper-class-10";

/** The three paths, in the order the cross-links list them. */
export const SEO_PAGES_PATHS: readonly string[] = [MOCK_TEST_PATH, QUESTION_BANK_PATH, MARKING_SCHEME_PATH];

/** CBSE's own marking-scheme page, where each cited scheme is published (the same URL /check-your-answer cites). */
export const CBSE_MARKING_SCHEME_SOURCE_URL = "https://www.cbse.gov.in/cbsenew/marking-scheme.html";

/** The most characters a whole <title> may have, and a meta description (the site-wide caps). */
export const SEO_PAGE_TITLE_CAP = 60;
export const SEO_PAGE_DESCRIPTION_CAP = 155;

export interface SeoPageSpec {
  readonly path: string;
  /** The visible breadcrumb / BreadcrumbList name. */
  readonly crumb: string;
  readonly h1: string;
  readonly title: string;
  readonly description: string;
  /** The link text other pages use for this page. */
  readonly linkLabel: string;
}

export const SEO_PAGE_SPECS: Readonly<Record<string, SeoPageSpec>> = {
  [MOCK_TEST_PATH]: {
    path: MOCK_TEST_PATH,
    crumb: "Class 10 Mock Test",
    h1: "CBSE Class 10 Mock Test 2027 (Maths & Science)",
    // SEO-SELL-1: "Sample Paper 2026-27" is the searched phrase; no "free" on a page that sells (meta only, the body is unchanged).
    title: "Class 10 Mock Test 2027 & Sample Paper 2026-27 | LazyTopper",
    description:
      "CBSE Class 10 sample paper 2026-27 and mock test for Maths and Science: full board-pattern papers, eight mock papers per subject with a marking guide.",
    linkLabel: "Class 10 mock tests",
  },
  [QUESTION_BANK_PATH]: {
    path: QUESTION_BANK_PATH,
    crumb: "Class 10 Question Bank",
    h1: "CBSE Class 10 Question Bank 2027 — chapter-wise Maths & Science",
    title: "CBSE Class 10 Question Bank 2027: Chapter-wise | LazyTopper",
    // SEO-SELL-1: chapter-wise, CBSE pattern, step-marked worked solutions; no "free" on a page that sells (meta only).
    description:
      "CBSE Class 10 question bank 2027, chapter-wise for Maths and Science: CBSE pattern, step-marked worked solutions, CBQs and printable packs.",
    linkLabel: "Class 10 question bank",
  },
  [SAMPLE_PAPER_PATH]: {
    path: SAMPLE_PAPER_PATH,
    crumb: "Class 10 Sample Paper",
    h1: "CBSE Class 10 Sample Paper 2026-27 \u2014 Maths & Science (2027 Boards)",
    title: "Class 10 Sample Paper 2026-27: Maths & Science | LazyTopper",
    description:
      "CBSE Class 10 sample papers 2026-27 for Maths and Science: 80-mark board-pattern papers, sections A to E, marked step by step like a CBSE examiner.",
    linkLabel: "Class 10 sample papers",
  },
  [MARKING_SCHEME_PATH]: {
    path: MARKING_SCHEME_PATH,
    crumb: "Class 10 Marking Scheme",
    h1: "CBSE Class 10 Marking Scheme 2027 — how step marks are given",
    title: "CBSE Class 10 Marking Scheme 2027: Step Marks | LazyTopper",
    description:
      "How CBSE Class 10 marking works for 2027: marks by section, step marking, error carried forward, units and diagrams, with the official source.",
    linkLabel: "CBSE marking scheme",
  },
  // CC27-SITE-1: no price, no "free" in the head (a bonus inside paid products).
  [CRASH_COURSE_PATH]: {
    path: CRASH_COURSE_PATH,
    crumb: "Class 10 Crash Course 2027",
    h1: "Class 10 Crash Course 2027 — PYQs & Important Questions",
    title: "Class 10 Crash Course 2027: PYQs & Important Questions",
    description:
      "Class 10 Crash Course 2027 for CBSE Maths and Science: 1-page chapter revision, NCERT diagrams, most-asked board questions and a 75-day plan.",
    linkLabel: "Class 10 Crash Course 2027",
  },
};

export function isSeoPagePath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEO_PAGE_SPECS, path);
}

/** The head for one of the three paths, or null for any other path. Used by writeStaticHeads. */
export function seoPageHeadForPath(path: string): { title: string; description: string } | null {
  if (!isSeoPagePath(path)) return null;
  const { title, description } = SEO_PAGE_SPECS[path];
  return { title, description };
}

/** A BreadcrumbList (Home › this page) with canonical URLs only. `null` for any other path. */
export function seoPageJsonLd(path: string, basename: string): Record<string, unknown> | null {
  if (!isSeoPagePath(path)) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalFor("/", basename) },
      { "@type": "ListItem", position: 2, name: SEO_PAGE_SPECS[path].crumb, item: canonicalFor(path, basename) },
    ],
  };
}

/** One chapter's existing pages. `solutions` lists only the NCERT / Exemplar solutions pages that are published. */
export interface ChapterLinks {
  readonly topic: DesktopTopicSummary;
  readonly notes: string;
  readonly cbq: string;
  /** SEO-MCQ-1: the free MCQ page(s) of this chapter (Trigonometry has two banks, every other chapter one). */
  readonly mcq: ReadonlyArray<{ readonly label: string; readonly href: string }>;
  readonly solutions: ReadonlyArray<{ readonly label: string; readonly href: string }>;
}

/** Our `trigonometry` chapter covers two NCERT chapters, each with its own solutions page. */
const TRIGONOMETRY_SOLUTION_SLUGS = ["introduction-to-trigonometry", "some-applications-of-trigonometry"] as const;

function solutionSlugsOf(topicSlug: string): readonly string[] {
  return topicSlug === "trigonometry" ? TRIGONOMETRY_SOLUTION_SLUGS : [topicSlug];
}

/** Every chapter, registry order (Maths first), with the pages that really exist for it. */
export function chapterLinks(): ChapterLinks[] {
  return allDesktopTopics().map((topic) => {
    const solutions: Array<{ label: string; href: string }> = [];
    for (const slug of solutionSlugsOf(topic.slug)) {
      const page = SOLUTIONS_PAGES.find((candidate) => candidate.slug === slug);
      if (!page) continue;
      const twoParts = topic.slug === "trigonometry";
      const part = twoParts ? (slug === TRIGONOMETRY_SOLUTION_SLUGS[0] ? " (Ch 8)" : " (Ch 9)") : "";
      if (page.books.includes("ncert")) solutions.push({ label: `NCERT solutions${part}`, href: solutionsPath("ncert", slug) });
      if (page.books.includes("exemplar")) solutions.push({ label: `Exemplar solutions${part}`, href: solutionsPath("exemplar", slug) });
    }
    const mcq = freeMcqForParent(topic.slug).map((bank) => ({
      label: freeMcqForParent(topic.slug).length > 1 ? `${bank.chapter} MCQs` : `${topic.name} MCQs`,
      href: freeMcqPath(bank.slug),
    }));
    return { topic, notes: `/notes/${topic.slug}`, cbq: `/cbq-class-10/${topic.slug}`, mcq, solutions };
  });
}

/**
 * The CBSE paper sections as LazyTopper's step-marking pattern states them (CLAUDE.md §13, aligned with the
 * CBSE 2026-27 step-marking scheme): the section, the question type and the marks each question carries.
 */
export const PAPER_SECTIONS: ReadonlyArray<{ section: string; kind: string; marks: string }> = [
  { section: "A", kind: "MCQ and assertion-reason", marks: "1 mark" },
  { section: "B", kind: "Very short answer", marks: "2 marks" },
  { section: "C", kind: "Short answer", marks: "3 marks" },
  { section: "D", kind: "Long answer", marks: "5 marks" },
  { section: "E", kind: "Case-based, with parts", marks: "4 marks" },
];
