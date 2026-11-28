// src/components/seo/faqContent.ts
//
// SEO-QUICK-1 — the visible FAQ on /check-your-answer and /cbq-class-10, and the FAQPage JSON-LD that
// mirrors it. ONE source: the page renders `items`, `faqPageJsonLd(items)` serialises the same strings,
// so the structured data can never say something the page does not (Google requires the markup to match
// visible content).
//
// ★ NO RUPEE FIGURE HERE. The price depends on today's date (founding offer ends 30 Nov), and static
//   markup must be number-free (see config/pricing.ts and prerenderPrice.guard.test.ts). The answers
//   point at /pricing for the current price instead.
// ★ NO REACT, NO SERVICES: imported by the node script scripts/seo/writeStaticHeads.ts.
// ★ Every sentence restates something the page itself (or CLAUDE.md §13 / CBSE's published pattern) says.

import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM, BUNDLE_NAME, CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM, MOCKS_PER_SUBJECT, REDOWNLOAD_UNTIL } from "../../lib/packs/packLabels";

export interface FaqItem {
  question: string;
  answer: string;
}

export const CHECK_ANSWER_FAQ: readonly FaqItem[] = [
  {
    question: "How does CBSE step marking work in Class 10?",
    answer:
      "A Class 10 board answer worth 2, 3 or 5 marks is not marked as simply right or wrong. The marking scheme breaks it into value points and each one carries part of the marks, so writing the correct formula usually earns a step mark even if a later step goes wrong. A mistake is charged once, and your own correct method is accepted.",
  },
  {
    question: "Can I check my own answer the way a CBSE examiner would?",
    answer:
      "Yes. Photograph or upload your written answer on LazyTopper and it shows the marks for every step and where marks were lost, so you know what to fix before the board exam.",
  },
  {
    question: "Is checking an answer free?",
    answer:
      "Your first check is free without an account. A new account also gets a 7-day Premium trial with no card needed. After that you can keep the free Basic plan, or pay once for the Board Pass, which is valid till 28 Feb 2027. The current price is on the pricing page.",
  },
  {
    question: "Which classes and subjects does LazyTopper cover?",
    answer: "CBSE Class 10 only, for Maths and Science.",
  },
  {
    question: "Is LazyTopper the official CBSE marking?",
    answer:
      "No. LazyTopper is an independent platform and is not affiliated with CBSE. The marking principles on this page come from the general instructions printed with CBSE's published marking schemes.",
  },
];

export const CBQ_HUB_FAQ: readonly FaqItem[] = [
  {
    question: "What is a competency-based question (CBQ) in CBSE Class 10?",
    answer:
      "A CBQ asks you to use what you know in a new or real-life situation, not to repeat a definition. It can be a 1-mark MCQ or assertion-reason question, a case study, or a short or long answer of up to 5 marks.",
  },
  {
    question: "How much of the Class 10 paper is competency-based?",
    answer:
      "CBSE's Class 10 paper pattern sets about 50% of the paper as competency-focused questions (CBSE Circular Acad-30/2024). That is why CBQs are worth practising in every chapter.",
  },
  {
    question: "Is every CBQ explained step by step?",
    answer:
      "Yes. Each chapter page shows sample CBQs with step-by-step explanations and marks, so you can try a question on paper first and then see how the marks are earned.",
  },
  {
    question: "Are the CBQs free?",
    answer:
      "The chapter pages and CBQ practice are free to use. The CBQ Packs, printable question banks with worked steps, are a paid one-time purchase.",
  },
  {
    question: "Which classes and subjects are covered?",
    answer: "CBSE Class 10 only, for Maths and Science.",
  },
];

// SEO-PAGES-1 — the FAQ on the three search-landing pages (src/components/seoPages/seoPages.ts). Number-free like the
// rest of this file: the pack prices are shown on the page from the pack helpers, never typed here.
export const MOCK_TEST_FAQ: readonly FaqItem[] = [
  {
    question: "What is a CBSE Class 10 mock test?",
    answer:
      "A mock test is a full practice paper in the board pattern, with the same sections and marks as the real paper, that you attempt in one sitting before the exam. LazyTopper has full mocks for Maths and for Science.",
  },
  {
    question: "Can I take a Class 10 mock test free on LazyTopper?",
    answer:
      "Yes. A few Test Series papers open free each week, with no payment. Your first test is free, marking included.",
  },
  {
    question: "Can I print the mock papers?",
    answer:
      "Yes. The Mock Pack is a printable PDF of eight board-pattern mock papers for one subject, with a marking guide. The Maths + Science Bundle adds every chapter question bank to the mocks for both subjects.",
  },
  {
    question: "How are my mock test answers marked?",
    answer:
      "Board answers are marked in steps, so the formula, the working, the final answer and the unit can each earn marks. The Answer Checker marks a photographed or uploaded handwritten answer step by step and shows where marks were lost.",
  },
  {
    question: "Can I practise CBSE Class 10 sample papers 2026-27 and get my answers checked?",
    answer:
      "Yes. Take a full board-pattern mock in Maths or Science, write your answers on paper, then upload a photo of a handwritten answer to the Answer Checker to see the marks for every step and where marks were lost. The first answer check is free without an account. CBSE publishes its own official sample papers on its website; LazyTopper's mocks are separate practice papers in the same pattern.",
  },
  {
    question: "Is this the real 2027 board paper?",
    answer:
      "No. A mock is practice in the board pattern, not the actual paper. LazyTopper is an independent platform and is not affiliated with CBSE.",
  },
];

export const QUESTION_BANK_FAQ: readonly FaqItem[] = [
  {
    question: "What is in the LazyTopper Class 10 question bank?",
    answer:
      "Chapter-wise questions for every CBSE Class 10 Maths and Science chapter in the 2026-27 syllabus, with solutions, competency-based questions (CBQs) and chapter notes. Each chapter has its own pages.",
  },
  {
    question: "Is the Class 10 question bank free?",
    answer:
      "Chapter notes, CBQ pages, NCERT and Exemplar solutions and a free practice allowance are open without payment. The printable Chapter, Subject and Bundle packs are one-time paid PDFs.",
  },
  {
    question: "Are the questions chapter-wise?",
    answer:
      "Yes. Pick a chapter from the list on the page to open its notes, its CBQs and its NCERT solutions, or start practice for that chapter from the Practice hub.",
  },
  {
    question: "Is there a chapter-wise CBSE Class 10 question bank PDF?",
    answer:
      "Yes. The printable question bank packs put the chapter-wise Maths and Science question bank in PDF form with worked solutions: a Chapter Pack for one chapter, a Subject Pack for one whole subject, and a Maths + Science Bundle for both. They are one-time purchases and never renew; the price is shown on the PDF packs page.",
  },
  {
    question: "Does it cover the 2026-27 syllabus only?",
    answer:
      "Yes. Questions and chapters follow the CBSE 2026-27 Class 10 syllabus for Maths and Science, and topics removed from that syllabus are not included.",
  },
  {
    question: "Are the questions the real board questions?",
    answer:
      "The bank is practice material built around the CBSE pattern and past papers. LazyTopper is an independent platform and is not affiliated with CBSE.",
  },
];

export const MARKING_SCHEME_FAQ: readonly FaqItem[] = [
  {
    question: "How are CBSE Class 10 answers marked?",
    answer:
      "Every answer is marked against value points. A 1-mark MCQ is right or wrong on the answer alone, while a 2, 3 or 5-mark answer earns marks step by step: the formula, the working and the final answer are credited separately.",
  },
  {
    question: "What is error carried forward in CBSE marking?",
    answer:
      "If a step contains a calculation error but the later steps follow the correct method from that wrong value, the later steps still earn their marks. A mistake is charged once.",
  },
  {
    question: "Do I lose marks for a missing unit?",
    answer:
      "Yes. A final numerical answer without its SI unit loses half a mark.",
  },
  {
    question: "Are diagrams and chemical equations marked separately?",
    answer:
      "Yes. In Science a diagram's accuracy and its labels are marked separately, and a balanced chemical equation and its state symbols or catalyst can each earn half a mark.",
  },
  {
    question: "Where is the official CBSE marking scheme?",
    answer:
      "CBSE publishes its marking schemes on its website, cbse.gov.in. LazyTopper is an independent platform and is not affiliated with CBSE; this page explains the marking principles in plain words.",
  },
];

// SEO-LLM-2 (18 Nov 2026) — answer-first FAQs for the pages AI assistants and Google should name for "question bank PDF",
// "CBQ practice" and "important questions". Rendered with SeoFaq (always visible), serialised by faqPageJsonLd. Number-free
// except the pinned bank / CBQ claims: prices are shown on the pages from the pack helpers.
export const PACKS_ANSWER_FAQ: readonly FaqItem[] = [
  {
    question: "Is there a chapter-wise CBSE Class 10 question bank PDF?",
    answer: `Yes. LazyTopper covers CBSE Class 10 only (Maths and Science, 2027 boards), and its PDF packs are printable Class 10 question banks, chapter-wise, with a worked solution for every question. The bank has ${BANK_QUESTIONS_CLAIM} questions, including ${BANK_CBQS_CLAIM} competency-based questions. A Chapter Pack covers one chapter, a Subject Pack covers every chapter of one subject, and the ${BUNDLE_NAME} covers both subjects with the mock papers.`,
  },
  {
    question: "What does a PDF pack cost?",
    answer:
      "Each pack is a one-time payment, shown as the price plus GST on this page, and it never renews. A Chapter Pack is the smallest and cheapest; the Maths + Science Bundle covers everything. The CBQ Packs are sold separately, one per subject.",
  },
  {
    question: "What is free?",
    answer:
      "Each pack has a free one-page sample PDF with no sign-up. Chapter notes, NCERT solutions, free practice and a first answer check are also free, and every new account gets a 7-day free trial.",
  },
  {
    question: "Are there full mock papers in the PDF packs?",
    answer: `Yes. The Mock Pack has ${MOCKS_PER_SUBJECT} full board-pattern mock papers for one subject with marking guides, and the ${BUNDLE_NAME} has the mocks for both subjects.`,
  },
  {
    question: "Can I download the PDFs again?",
    answer: `Yes. Owned packs can be downloaded again from My packs until ${REDOWNLOAD_UNTIL}. Each file carries the buyer's name or contact on every page, so it is for your own use.`,
  },
];

export const CBQ_PACKS_ANSWER_FAQ: readonly FaqItem[] = [
  {
    question: "What are CBQ Packs?",
    answer: `CBQ Packs are printable PDFs of competency-based questions (CBQs) for CBSE Class 10 only (Maths and Science, 2027 boards), one pack for Maths and one for Science, with ${CBQ_SUBJECT_CLAIM} per subject. They cover every chapter, ${CBQ_CHAPTER_CLAIM}, with step-wise worked solutions.`,
  },
  {
    question: "Which question types are in a CBQ Pack?",
    answer:
      "MCQs, assertion-reason questions, short answer, case-study and long-answer questions, from 1 mark to 5 marks, so every section A to E of the board paper is covered.",
  },
  {
    question: "Why practise CBQs for the Class 10 boards?",
    answer:
      "CBSE sets about half of the 2026-27 Class 10 paper as competency-based questions, so regular CBQ practice matters for both Maths and Science.",
  },
  {
    question: "Is there a free CBQ sample?",
    answer:
      "Yes. Each CBQ Pack has a free sample, and every chapter's notes include free competency-based questions. The price of a pack is shown on this page as the price plus GST, a one-time payment.",
  },
  {
    question: "Are the Maths and Science CBQ Packs sold together?",
    answer:
      "No. Each subject has its own CBQ Pack, sold separately, and the CBQ Packs are not included in the Subject Pack or the Maths + Science Bundle.",
  },
];

/** The important-questions pages, one FAQ per subject (the page text and the JSON-LD both read this). */
export function importantQuestionsFaq(subject: "Maths" | "Science"): readonly FaqItem[] {
  return [
    {
      question: `What are Class 10 ${subject} important questions?`,
      answer: `Chapter-wise board-pattern ${subject} questions for the 2027 boards, written by LazyTopper and chosen by its prediction model from past CBSE paper trends and the 2026-27 syllabus. They are a guide to what to practise first, not the actual paper.`,
    },
    {
      question: `Are the ${subject} important questions chapter-wise?`,
      answer: `Yes. Pick a chapter on the page to practise that chapter's important questions, in the CBSE sections from 1-mark MCQs to 5-mark answers.`,
    },
    {
      question: "Will these questions come in the board exam?",
      answer:
        "Nobody can promise that. LazyTopper does not claim to know the questions of any upcoming exam; the questions are chosen from exam trends to help you spend your time on what matters most.",
    },
    {
      question: "Can I check my answers?",
      answer:
        "Yes. Try a question first, then see its step-wise solution. To have a handwritten answer marked step by step, use the Answer Checker; the first check is free without an account.",
    },
    {
      question: `Where can I get a Class 10 ${subject} question bank PDF?`,
      answer: `The printable question bank packs have every ${subject} chapter with worked solutions, as a one-time purchase. See the PDF packs page for the price plus GST.`,
    },
  ];
}

/** A schema.org FAQPage for exactly these items. */
export function faqPageJsonLd(items: readonly FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** The FAQ for a public path, or null. The path list is the whole set of pages that render an FAQ. */
export function faqItemsForPath(path: string): readonly FaqItem[] | null {
  if (path === "/check-your-answer") return CHECK_ANSWER_FAQ;
  if (path === "/cbq-class-10") return CBQ_HUB_FAQ;
  // SEO-PAGES-1 — the three search-landing pages.
  if (path === "/mock-test-class-10") return MOCK_TEST_FAQ;
  if (path === "/question-bank-class-10") return QUESTION_BANK_FAQ;
  if (path === "/cbse-marking-scheme-class-10") return MARKING_SCHEME_FAQ;
  // SEO-LLM-2 — the pack pages and the two important-questions pages.
  if (path === "/packs") return PACKS_ANSWER_FAQ;
  if (path === "/cbq-packs") return CBQ_PACKS_ANSWER_FAQ;
  if (path === "/highly-probable/10/Maths") return importantQuestionsFaq("Maths");
  if (path === "/highly-probable/10/Science") return importantQuestionsFaq("Science");
  return null;
}

/** FAQPage JSON-LD for a path that renders an FAQ, else null. */
export function faqJsonLdForPath(path: string): Record<string, unknown> | null {
  const items = faqItemsForPath(path);
  return items ? faqPageJsonLd(items) : null;
}
