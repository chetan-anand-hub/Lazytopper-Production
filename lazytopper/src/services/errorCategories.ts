/**
 * Error diagnosis categories — the 6 fixed buckets the AI examiner classifies
 * a wrong answer into. These convert raw mistakes into actionable feedback.
 *
 * Used by:
 *   - /api/check-solution prompt (server)
 *   - SolutionChecker UI badge
 *   - MistakeLogEntry persistence
 *   - Practice session summary aggregation
 *   - Weekly Wrapped #1 issue surface
 */

export type ErrorCategory =
  | "Concept Gap"
  | "Careless Mistake"
  | "Formula Confusion"
  | "Recall Failure"
  | "Incomplete Step"
  | "Diagram/Drawing Error";

export const ERROR_CATEGORIES: ErrorCategory[] = [
  "Concept Gap",
  "Careless Mistake",
  "Formula Confusion",
  "Recall Failure",
  "Incomplete Step",
  "Diagram/Drawing Error",
];

export interface ErrorCategoryStyle {
  color: string;
  bg: string;
  border: string;
  emoji: string;
  shortLabel: string;
}

export const ERROR_CATEGORY_STYLE: Record<ErrorCategory, ErrorCategoryStyle> = {
  "Concept Gap": {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.3)",
    emoji: "🧩",
    shortLabel: "concept gap",
  },
  "Careless Mistake": {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "1px solid rgba(245,158,11,0.3)",
    emoji: "⚡",
    shortLabel: "careless mistake",
  },
  "Formula Confusion": {
    color: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.3)",
    emoji: "🧮",
    shortLabel: "formula confusion",
  },
  "Recall Failure": {
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    border: "1px solid rgba(217,119,6,0.3)",
    emoji: "🧠",
    shortLabel: "recall failure",
  },
  "Incomplete Step": {
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
    border: "1px solid rgba(14,165,233,0.3)",
    emoji: "✂️",
    shortLabel: "incomplete step",
  },
  "Diagram/Drawing Error": {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "1px solid rgba(168,85,247,0.3)",
    emoji: "📐",
    shortLabel: "diagram/drawing error",
  },
};

export function isErrorCategory(value: unknown): value is ErrorCategory {
  return typeof value === "string" && (ERROR_CATEGORIES as string[]).includes(value);
}

/**
 * Fallback inference when the AI did not return an explicit errorCategory.
 * Maps the 4 per-step mistakeType counts to the closest top-level category.
 */
export function deriveErrorCategoryFromCounts(counts: {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}): ErrorCategory | null {
  const total =
    counts.conceptual + counts.calculation + counts.silly + counts.presentation;
  if (total === 0) return null;

  const ranked: Array<[number, ErrorCategory]> = [
    [counts.conceptual, "Concept Gap"],
    [counts.silly, "Careless Mistake"],
    [counts.calculation, "Careless Mistake"],
    [counts.presentation, "Incomplete Step"],
  ];
  ranked.sort((a, b) => b[0] - a[0]);
  return ranked[0][0] > 0 ? ranked[0][1] : null;
}

/** Human-friendly plural label for the session summary line. */
export function pluralizeCategory(category: ErrorCategory, count: number): string {
  const base = ERROR_CATEGORY_STYLE[category].shortLabel;
  if (count === 1) return `1 ${base}`;
  // Pluralize the trailing word ("gap" -> "gaps", "mistake" -> "mistakes", etc.)
  if (base.endsWith("y")) return `${count} ${base.slice(0, -1)}ies`;
  if (base.endsWith("s")) return `${count} ${base}`;
  return `${count} ${base}s`;
}
