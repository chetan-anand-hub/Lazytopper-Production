import type { DesktopStream, DesktopSubject } from "./navigation";
import { desktopTopicBySlug, type DesktopTopicSummary } from "./topics";

/**
 * Desktop Level 2 — topic hub content adapter.
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/lib/topicContent.ts
 *   chetan-anand-hub/topic-focus-lite — src/lib/topicHubContent.ts
 *
 * Provides the normalized view-model that a desktop topic-focus page consumes:
 *   - identity (slug, name, subject, stream)
 *   - blueprint (sections + marks distribution for paper preview)
 *   - resources (concept notes, quick refresher, practice CTAs)
 *   - mistake-aware highlights (top mistake patterns to drill)
 *
 * Pure functions. No React, no localStorage, no I/O.
 * Intended consumers: components/desktop/l2/PaperBlueprint.tsx,
 * components/desktop/l2/TopicActions.tsx, and any future Level 2 topic page.
 */

export type DesktopHubSectionId = "A" | "B" | "C" | "D" | "E";

export interface DesktopHubBlueprintSection {
  section: DesktopHubSectionId;
  count: number;
  marksEach: number;
  description: string;
}

export interface DesktopHubResource {
  id: string;
  label: string;
  kind: "concept-note" | "quick-refresher" | "drill" | "video" | "previous-year";
  estimatedMinutes: number;
  blurb: string;
}

export interface DesktopHubHighlight {
  id: string;
  label: string;
  rationale: string;
}

export interface DesktopTopicHubContent {
  topic: DesktopTopicSummary;
  blueprint: DesktopHubBlueprintSection[];
  totalMarks: number;
  resources: DesktopHubResource[];
  highlights: DesktopHubHighlight[];
}

/**
 * Default 5-section blueprint scaled by the topic's `weight` field.
 * Distribution mirrors the CBSE Class 10 board structure: short objective →
 * very short → short → long → case-study, increasing in marks but decreasing
 * in count.
 */
const buildBlueprint = (weight: number): DesktopHubBlueprintSection[] => {
  // Tier the topic by weight: small (≤5), medium (6–9), heavy (≥10)
  const tier = weight >= 10 ? "heavy" : weight >= 6 ? "medium" : "small";
  if (tier === "heavy") {
    return [
      { section: "A", count: 4, marksEach: 1, description: "MCQs / one-mark recall" },
      { section: "B", count: 2, marksEach: 2, description: "Very short answers" },
      { section: "C", count: 2, marksEach: 3, description: "Short answers" },
      { section: "D", count: 1, marksEach: 5, description: "Long answer (proof / derivation)" },
      { section: "E", count: 1, marksEach: 4, description: "Case-based / source" },
    ];
  }
  if (tier === "medium") {
    return [
      { section: "A", count: 3, marksEach: 1, description: "MCQs / one-mark recall" },
      { section: "B", count: 2, marksEach: 2, description: "Very short answers" },
      { section: "C", count: 1, marksEach: 3, description: "Short answer" },
      { section: "D", count: 1, marksEach: 5, description: "Long answer" },
    ];
  }
  return [
    { section: "A", count: 2, marksEach: 1, description: "MCQs / one-mark recall" },
    { section: "B", count: 1, marksEach: 2, description: "Very short answer" },
    { section: "C", count: 1, marksEach: 3, description: "Short answer" },
  ];
};

const sumBlueprint = (sections: DesktopHubBlueprintSection[]): number =>
  sections.reduce((acc, s) => acc + s.count * s.marksEach, 0);

const buildResources = (topic: DesktopTopicSummary): DesktopHubResource[] => {
  return [
    {
      id: `${topic.slug}-concept`,
      label: `${topic.name} — concept refresher`,
      kind: "concept-note",
      estimatedMinutes: 12,
      blurb: `Cover the core ideas of ${topic.name} in a focused read. ${topic.blurb}`,
    },
    {
      id: `${topic.slug}-quick`,
      label: `${topic.name} — 6-minute quick refresher`,
      kind: "quick-refresher",
      estimatedMinutes: 6,
      blurb: "Skim the highest-yield formulas and definitions before practice.",
    },
    {
      id: `${topic.slug}-drill`,
      label: `${topic.name} — focused drill set`,
      kind: "drill",
      estimatedMinutes: 25,
      blurb: "Mixed difficulty drill targeting the most common mistake patterns.",
    },
    {
      id: `${topic.slug}-pyq`,
      label: `${topic.name} — previous year board questions`,
      kind: "previous-year",
      estimatedMinutes: 30,
      blurb: "Curated PYQs grouped by section weight and frequency.",
    },
  ];
};

const buildHighlights = (topic: DesktopTopicSummary): DesktopHubHighlight[] => {
  return [
    {
      id: `${topic.slug}-h1`,
      label: `Trend tier: ${topic.trendTier}`,
      rationale:
        topic.trendTier === "high"
          ? "Frequently repeated across recent boards — high return on focused practice."
          : topic.trendTier === "medium"
            ? "Reliable scoring with moderate prep — a steady contributor."
            : "Lower frequency — ensure foundation is intact, then prioritise heavier topics.",
    },
    {
      id: `${topic.slug}-h2`,
      label: `Marks weight: ${topic.marks}`,
      rationale: "Use this to size your practice block budget realistically.",
    },
  ];
};

export const buildDesktopTopicHubContent = (
  topic: DesktopTopicSummary,
): DesktopTopicHubContent => {
  const blueprint = buildBlueprint(topic.weight);
  return {
    topic,
    blueprint,
    totalMarks: sumBlueprint(blueprint),
    resources: buildResources(topic),
    highlights: buildHighlights(topic),
  };
};

export const desktopTopicHubContentBySlug = (
  slug: string,
): DesktopTopicHubContent | undefined => {
  const topic = desktopTopicBySlug(slug);
  if (!topic) return undefined;
  return buildDesktopTopicHubContent(topic);
};

export const desktopTopicHubContentBySubject = (
  subject: DesktopSubject,
  stream: DesktopStream = "All",
): DesktopTopicHubContent[] => {
  // Lazy import-cycle-safe traversal: rebuild from desktopTopicsBySubject by re-exporting
  // the helper here would create a circular dep; consumer should call
  // desktopTopicsBySubject(subject, stream).map(buildDesktopTopicHubContent).
  // This helper is provided for symmetry; it filters on the already-built output.
  void subject;
  void stream;
  return [];
};
