// src/utils/buildUrl.ts
//
// Helper functions for constructing LazyTopper URLs.
// Mandatory identifiers (grade, subject) are placed in the path;
// optional filters are encoded as query parameters.

/**
 * Trends page
 * Example: /trends/10/Maths
 */
export function buildTrendsUrl(grade: string, subject: string): string {
  return `/trends/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`;
}

/**
 * TopicHub
 * Example: /topic-hub/10/Maths?topic=Quadratic%20Equations
 */
export function buildTopicHubUrl(
  grade: string,
  subject: string,
  topic?: string
): string {
  const base = `/topic-hub/${encodeURIComponent(grade)}/${encodeURIComponent(
    subject
  )}`;
  if (!topic) return base;
  // If the topic appears to be a slug (no spaces), embed it in the path for
  // cleaner URLs.  Otherwise fall back to a query parameter.  This helps
  // search engines index specific topic pages while maintaining
  // compatibility with existing links.
  const isSlug = !/\s/.test(topic);
  if (isSlug) {
    return `${base}/${encodeURIComponent(topic)}`;
  }
  const params = new URLSearchParams({ topic });
  return `${base}?${params.toString()}`;
}

/**
 * Highly Probable Questions (HPQ) hub
 * Example: /highly-probable/10/Maths?topic=Real%20Numbers&tier=must-crack
 */
export function buildHPQUrl(
  grade: string,
  subject: string,
  options: {
    topic?: string;
    tier?: string;
    difficulty?: string;
    stream?: string;
  } = {}
): string {
  const base = `/highly-probable/${encodeURIComponent(
    grade
  )}/${encodeURIComponent(subject)}`;
  const params = new URLSearchParams();
  if (options.topic) params.set("topic", options.topic);
  if (options.tier) params.set("tier", options.tier);
  if (options.difficulty) params.set("difficulty", options.difficulty);
  if (options.stream) params.set("stream", options.stream);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Mock Builder
 * Example: /mock-builder/10/Science?from=trends-topic&topic=Electricity
 */
export function buildMockBuilderUrl(
  grade: string,
  subject: string,
  options?: { from?: string; topic?: string }
): string {
  const base = `/mock-builder/${encodeURIComponent(
    grade
  )}/${encodeURIComponent(subject)}`;
  if (!options) return base;

  const params = new URLSearchParams();
  if (options.from) params.set("from", options.from);
  if (options.topic) params.set("topic", options.topic);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * AI Mentor page
 * Path only holds grade + subject; mode + payload are passed via
 * react-router `state` rather than query parameters.
 * Example: /ai-mentor/10/Maths
 */
export function buildAiMentorUrl(grade: string, subject: string): string {
  return `/ai-mentor/${encodeURIComponent(grade)}/${encodeURIComponent(
    subject
  )}`;
}

/**
 * Study Plan page
 * Example: /study-plan/10/Science
 * Extra planning data (daysLeft, targets, etc.) should go via `state`.
 */
export function buildStudyPlanUrl(grade: string, subject: string): string {
  return `/study-plan/${encodeURIComponent(grade)}/${encodeURIComponent(
    subject
  )}`;
}
