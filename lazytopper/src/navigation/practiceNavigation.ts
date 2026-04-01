// src/navigation/practiceNavigation.ts
import type { NavigateFunction } from "react-router-dom";

export type PracticeDifficultyPreset = "All" | "Easy" | "Medium" | "Hard";
export type PracticeSectionFilter = "A" | "B" | "C" | "D" | "E";

export interface PracticeNavRequest {
  grade: string; // e.g. "10"
  subject: "Maths" | "Science";
  topicKey?: string; // canonical topic key, usually the Trends/HPQ topic key
  topicName?: string; // pretty display name for header
  backPath?: string; // where "Back to ..." should return
  backLabel?: string; // label for back button
  subtopicHint?: string; // e.g. bucket.topic, concept tag
  sectionFilter?: PracticeSectionFilter; // CBSE board section/pattern filter
  focusBankIds?: string[]; // HPQ / predictive engine IDs to bias sampling from
  strictFocus?: boolean; // if true, treat focusBankIds as strict-first filter
  recommendedCount?: number; // suggested number of questions (UI can override)
  difficultyPreset?: PracticeDifficultyPreset;
  source?: string;
}

/**
 * Central helper to navigate into Practice page from HPQ / Trends / TopicHub.
 * It ALWAYS goes to `/practice/:grade/:subject` and passes all filters
 * via query string + location.state.
 *
 * This is the only place that should "know" the exact URL shape.
 */
export function navigateToPractice(
  navigate: NavigateFunction,
  request: PracticeNavRequest
) {
  const {
    grade,
    subject,
    topicKey,
    topicName,
    backPath,
    backLabel,
    subtopicHint,
    sectionFilter,
    focusBankIds,
    strictFocus = false,
    recommendedCount,
    difficultyPreset = "All",
    source = "hpq",
  } = request;

  const search = new URLSearchParams();

  // Topic key drives which topic's practice engine to use
  if (topicKey) {
    search.set("topic", topicKey);
  }

  // Optional subtopic / concept hint (for later finer filters)
  if (subtopicHint) {
    search.set("subtopicHint", subtopicHint);
  }
  if (sectionFilter) {
    search.set("section", sectionFilter);
  }

  // HPQ / predictive IDs to bias sampling from
  if (focusBankIds && focusBankIds.length > 0) {
    search.set("focusBankIds", focusBankIds.join(","));
  }
  if (strictFocus) {
    search.set("strictFocus", "true");
  }

  // Recommended question count - UI slider on Practice can override
  if (typeof recommendedCount === "number" && recommendedCount > 0) {
    search.set("count", String(recommendedCount));
  }

  // Difficulty preset - "All" means no extra filter
  if (difficultyPreset && difficultyPreset !== "All") {
    search.set("difficulty", difficultyPreset);
  }

  const searchStr = search.toString();
  const url = `/practice/${grade}/${subject}${
    searchStr ? `?${searchStr}` : ""
  }`;

  navigate(url, {
    state: {
      back: backPath,
      backLabel: backLabel ?? "Back",
      topicName: topicName ?? topicKey,
      source, // so PracticePage knows where this came from
      practiceFilters: {
        subtopicHint,
        focusBankIds,
        strictFocus,
        recommendedCount,
        difficultyPreset,
      },
      ...(sectionFilter ? { sectionFilter } : {}),
    },
  });
}
