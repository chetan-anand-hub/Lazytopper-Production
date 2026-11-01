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
      "Your first check is free without an account. A new account also gets a 7-day Premium trial with no card needed. After that you can keep the free Basic plan, or pay once for the Board Pass, which lasts till your board exam. The current price is on the pricing page.",
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
    question: "Do the CBQs come with solutions?",
    answer:
      "Yes. Each chapter page shows sample CBQs with the step-wise solution and marks, so you can try a question on paper first and then see how the marks are earned.",
  },
  {
    question: "Are the CBQs free?",
    answer:
      "The chapter pages and CBQ practice are free to use. The CBQ Packs, printable question banks with worked solutions, are a paid one-time purchase.",
  },
  {
    question: "Which classes and subjects are covered?",
    answer: "CBSE Class 10 only, for Maths and Science.",
  },
];

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
  return null;
}

/** FAQPage JSON-LD for a path that renders an FAQ, else null. */
export function faqJsonLdForPath(path: string): Record<string, unknown> | null {
  const items = faqItemsForPath(path);
  return items ? faqPageJsonLd(items) : null;
}
