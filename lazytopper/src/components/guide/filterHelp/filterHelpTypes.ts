/** GUIDE-FILTER-1 — the filter rows, shared by the eager door and the lazy chunk (tiny, no copy). */
export type FilterGroup = "marks" | "style" | "source" | "diff";

/** The row headings, as PracticeControls shows them. */
export const FILTER_GROUP_LABEL: Record<FilterGroup, string> = {
  marks: "Marks",
  style: "Style",
  source: "Source",
  diff: "Difficulty",
};
