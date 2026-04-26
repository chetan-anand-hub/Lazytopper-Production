import type { DesktopActionSource, DesktopStream, DesktopSubject, DesktopPracticeMode } from "./navigation";

/**
 * Desktop Level 2 — mistake intelligence data adapter.
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/lib/mistakeData.ts
 *   chetan-anand-hub/topic-focus-lite — src/lib/types.ts (MistakeInsight, AttemptRecord)
 *
 * Pure data + lookup helpers. No React, no localStorage, no side effects.
 * Intended consumer: components/desktop/l2/MistakeIntelligencePanel.tsx
 * and any future Level 2 page that needs a mistake feed.
 */

export type DesktopMistakeType = "conceptual" | "calculation" | "silly" | "presentation";

export interface DesktopMistakeInsight {
  id: string;
  topicSlug: string;
  topicName: string;
  subject: DesktopSubject;
  stream: DesktopStream;
  mistakeType: DesktopMistakeType;
  mistakeLabel: string;
  detail: string;
  recommendedDrill: string;
  recommendedMode: DesktopPracticeMode;
  recommendedFilters: string[];
  recommendedTopicSlugs: string[];
  createdAt: string;
}

export interface DesktopAttemptRecord {
  id: string;
  topicSlug: string;
  topicName: string;
  subject: DesktopSubject;
  stream: DesktopStream;
  mode: DesktopPracticeMode;
  score: number;
  outOf: number;
  date: string;
  mistakes: string[];
  mistakeType?: DesktopMistakeType;
  source: DesktopActionSource;
}

const ISO_NOW = "2026-04-26T00:00:00.000Z";

export const DESKTOP_MISTAKE_LIBRARY: DesktopMistakeInsight[] = [
  {
    id: "dmi-quad-discriminant",
    topicSlug: "quadratic-equations",
    topicName: "Quadratic Equations",
    subject: "Maths",
    stream: "All",
    mistakeType: "calculation",
    mistakeLabel: "Discriminant sign error",
    detail:
      "Sign flips when computing b² - 4ac with negative b; nature-of-roots conclusion ends up reversed.",
    recommendedDrill: "Discriminant + nature-of-roots drill with sign-checking checkpoints.",
    recommendedMode: "practice-set",
    recommendedFilters: ["Section C", "Numerical"],
    recommendedTopicSlugs: ["quadratic-equations"],
    createdAt: ISO_NOW,
  },
  {
    id: "dmi-trig-identity",
    topicSlug: "trigonometry-heights-distances",
    topicName: "Trigonometry & Heights",
    subject: "Maths",
    stream: "All",
    mistakeType: "conceptual",
    mistakeLabel: "Identity proof — wrong substitution",
    detail:
      "Cross-substitution of tan ↔ sin/cos missed mid-proof; final RHS mismatch goes undetected.",
    recommendedDrill: "Identity-proof drill with stepwise verification.",
    recommendedMode: "practice-set",
    recommendedFilters: ["Section C", "Proof"],
    recommendedTopicSlugs: ["trigonometry-heights-distances"],
    createdAt: ISO_NOW,
  },
  {
    id: "dmi-elec-units",
    topicSlug: "electricity",
    topicName: "Electricity",
    subject: "Science",
    stream: "Physics",
    mistakeType: "calculation",
    mistakeLabel: "Unit conversion in equivalent resistance",
    detail:
      "mA ↔ A confusion; parallel combination formula not inverted at the end of the calculation.",
    recommendedDrill: "Ohm's law + resistor combination numericals with explicit unit-check.",
    recommendedMode: "timed",
    recommendedFilters: ["Section C", "Section D", "Numerical"],
    recommendedTopicSlugs: ["electricity"],
    createdAt: ISO_NOW,
  },
  {
    id: "dmi-light-rays",
    topicSlug: "light-reflection-refraction",
    topicName: "Light – Reflection & Refraction",
    subject: "Science",
    stream: "Physics",
    mistakeType: "presentation",
    mistakeLabel: "Ray-diagram label completeness",
    detail:
      "Convex / concave lens diagrams missing principal axis label or focal-point markers; image arrows direction unclear.",
    recommendedDrill: "Ray-diagram completeness worksheet with checklist of required labels.",
    recommendedMode: "worksheet",
    recommendedFilters: ["Section D", "Diagram"],
    recommendedTopicSlugs: ["light-reflection-refraction"],
    createdAt: ISO_NOW,
  },
  {
    id: "dmi-acids-balancing",
    topicSlug: "acids-bases-salts",
    topicName: "Acids, Bases & Salts",
    subject: "Science",
    stream: "Chemistry",
    mistakeType: "conceptual",
    mistakeLabel: "Equation balancing & state symbols",
    detail:
      "Atoms unbalanced on RHS for double-displacement reactions; missing (s)/(l)/(g)/(aq) state symbols.",
    recommendedDrill: "Balancing + reaction-type drill with state-symbol prompts.",
    recommendedMode: "practice-set",
    recommendedFilters: ["Section A", "Section B", "Section C"],
    recommendedTopicSlugs: ["acids-bases-salts"],
    createdAt: ISO_NOW,
  },
];

export const DESKTOP_SAMPLE_ATTEMPT: DesktopAttemptRecord = {
  id: "datt-sample-1",
  topicSlug: "trigonometry-heights-distances",
  topicName: "Trigonometry & Heights",
  subject: "Maths",
  stream: "All",
  mode: "practice-set",
  score: 7,
  outOf: 10,
  date: ISO_NOW,
  mistakes: ["Identity substitution skipped", "Final value not back-checked"],
  mistakeType: "calculation",
  source: "practice",
};

export const desktopMistakesByTopic = (slug: string): DesktopMistakeInsight[] => {
  return DESKTOP_MISTAKE_LIBRARY.filter((m) => m.topicSlug === slug);
};

export const desktopMistakesBySubject = (
  subject: DesktopSubject,
  stream: DesktopStream = "All",
): DesktopMistakeInsight[] => {
  return DESKTOP_MISTAKE_LIBRARY.filter((m) => {
    if (m.subject !== subject) return false;
    if (subject !== "Science" || stream === "All") return true;
    return m.stream === stream;
  });
};

export const desktopMistakeById = (id: string): DesktopMistakeInsight | undefined =>
  DESKTOP_MISTAKE_LIBRARY.find((m) => m.id === id);
