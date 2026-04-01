// src/data/predictivePapers.ts

// NOTE: we no longer need PredictedQuestion here – the hub + MockPaper
// only use the predictive paper metadata + list of questionIds.
// import type { PredictedQuestion } from "./predictedQuestions";

export type SectionKey = "A" | "B" | "C" | "D" | "E";
export type SubjectKey = "Maths" | "Science";

export interface PredictivePaper {
  id: string;
  title: string;
  slug: string;
  vibe: string;
  tagline: string;
  markTotal: number;
  subject: SubjectKey; // NEW
  // Total marks per section (now includes E)
  sectionMarks: Record<SectionKey, number>;
  // List of PredictedQuestion.id values that belong to this paper.
  // Optional so that papers can still exist before we wire all questionIds.
  questionIds?: string[];
}

// NOTE: For now questionIds are left empty – MockPaper falls back
// to the full prediction bank if a paper has no ids yet.
// Later, we'll populate these to get a true 80-mark curated paper.

export const predictivePapers: PredictivePaper[] = [
  {
    id: "P1",
    title: "Predictive Paper 1",
    slug: "paper-1-balanced-core",
    vibe: "Balanced algebra + geometry mix",
    tagline: "Good first mock: near-board difficulty and coverage.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P2",
    title: "Predictive Paper 2",
    slug: "paper-2-algebra-heavy",
    vibe: "Algebra-heavy with some tricky graphs.",
    tagline: "Great if you want to stress-test equations + polynomials.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P3",
    title: "Predictive Paper 3",
    slug: "paper-3-geometry-focus",
    vibe: "Triangles, circles and constructions in focus.",
    tagline: "Perfect for a geometry-focused revision mock.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P4",
    title: "Predictive Paper 4",
    slug: "paper-4-stats-probability",
    vibe: "Statistics + probability leaning with core algebra backup.",
    tagline: "Use this when polishing last-unit topics.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P5",
    title: "Predictive Paper 5",
    slug: "paper-5-speed-run",
    vibe: "Many short questions to push speed and accuracy.",
    tagline: "Ideal for a fast Sunday sprint mock.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P6",
    title: "Predictive Paper 6",
    slug: "paper-6-mixed-bag",
    vibe: "Evenly spread across all chapters.",
    tagline: "Closest to a generic board paper pattern.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P7",
    title: "Predictive Paper 7",
    slug: "paper-7-tricky-concepts",
    vibe: "Includes more concept-twister questions.",
    tagline: "Attempt when you're comfortable with basics.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P8",
    title: "Predictive Paper 8",
    slug: "paper-8-algebra-geometry-stats",
    vibe: "Algebra + geometry + a dash of stats.",
    tagline: "Good mid-journey mock once syllabus is 70–80% done.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P9",
    title: "Predictive Paper 9",
    slug: "paper-9-board-style",
    vibe: "Very board-like in flavour and difficulty.",
    tagline: "Use this as a dress rehearsal before school prelims.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },
  {
    id: "P10",
    title: "Predictive Paper 10",
    slug: "paper-10-final-stress",
    vibe: "High intensity with some spicy 4-markers.",
    tagline: "Best attempted close to the boards as a final stress test.",
    markTotal: 80,
    subject: "Maths",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [],
  },

  // --- Starter Science predictive paper ---
  {
    id: "SciP1",
    title: "Science Predictive Paper 1",
    slug: "science-paper-1-balanced-core",
    vibe: "Balanced Physics + Chemistry + Biology mix.",
    tagline: "Good first full-length Science mock with NCERT-heavy flavour.",
    markTotal: 80,
    subject: "Science",
    sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
    questionIds: [], // will reuse the Science bank via engine for now
  },
];

