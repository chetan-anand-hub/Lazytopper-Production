/**
 * activityDetailModel — plain-words labels for the admin "Pages visited" table and the
 * "Activity" feed (ACTIVITY-DETAIL-1, owner ruling 2026-10-02, F3).
 *
 * The admin API returns page names in their STORED form ("notes~trigonometry", see
 * src/services/activityPages.ts) and event names as recorded ("check_graded"). This file
 * is the one place that decodes a key ("~" -> "/") and turns it into words:
 *   notes~trigonometry -> "Notes → Trigonometry"     check_graded -> "Checked an answer"
 * A name it does not know is shown decoded, as is — never hidden, never invented.
 */
import { decodePageKey } from "../../services/activityPages";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import type { ActivityFeedItem } from "./studentsAdminModel";

const STATIC_PAGE_LABELS: Record<string, string> = {
  home: "Home",
  welcome: "Welcome page",
  browse: "Home (browse)",
  intent: "Getting started",
  pricing: "Pricing",
  "cbse/class-10": "CBSE Class 10 page",
  teacher: "Teacher dashboard",
  onboarding: "Onboarding",
  "topic-hub": "Topic Hub",
  "highly-probable": "Predicted questions",
  "exam-simulation": "Exam simulation",
  "practice-hub": "Practice",
  "practice/worksheets": "Worksheets",
  "practice/worksheets/ready": "Worksheets (ready)",
  "weak-area-practice": "Weak-area practice",
  "check-improve": "Check & Improve",
  "exam-trends": "Exam Trends",
  me: "Me / Progress",
  "mock-paper/other": "Mock paper",
};

const SECTION_PREFIX_LABELS: Record<string, string> = {
  "topic-hub": "Topic Hub",
  notes: "Notes",
  "chapter-test": "Chapter test",
  tutor: "Tutor",
  "full-mock": "Full mock",
  "highly-probable": "Predicted questions",
  practice: "Quick practice",
  legal: "Legal",
};

const VALUE_LABELS: Record<string, string> = {
  maths: "Maths",
  science: "Science",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  refund: "Cancellation & Refunds",
  other: "(another page)",
};

function valueLabel(value: string): string {
  if (value in VALUE_LABELS) return VALUE_LABELS[value];
  return desktopTopicBySlug(value)?.name ?? value;
}

/** A stored page key in plain words, e.g. "notes~trigonometry" -> "Notes → Trigonometry". */
export function pageLabel(key: string): string {
  const name = decodePageKey(key);
  if (name in STATIC_PAGE_LABELS) return STATIC_PAGE_LABELS[name];
  const slash = name.indexOf("/");
  if (slash > 0) {
    const prefix = name.slice(0, slash);
    const value = name.slice(slash + 1);
    if (prefix in SECTION_PREFIX_LABELS && !value.includes("/")) {
      return `${SECTION_PREFIX_LABELS[prefix]} → ${valueLabel(value)}`;
    }
  }
  return name;
}

const EVENT_LABELS: Record<string, string> = {
  sign_up: "Signed up",
  free_check_used_block: "Was shown that the free check is used",
  free_check_signup: "Saved a free check to a new account",
  free_check_trial_start: "Started the free trial from a free check",
  trial_start: "Started the free trial",
  check_question_read: "Read a question to check",
  check_answer_added: "Added an answer",
  check_graded: "Checked an answer",
};

/** A recorded event name in plain words, e.g. "check_graded" -> "Checked an answer". */
export function activityEventLabel(name: string): string {
  return EVENT_LABELS[name] ?? name;
}

/** One feed line: "Opened Notes → Trigonometry" or "Checked an answer". */
export function feedItemLabel(item: ActivityFeedItem): string {
  return item.k === "page" ? `Opened ${pageLabel(item.n)}` : activityEventLabel(item.n);
}

/** The "Pages visited" rows: most visits first; ties in label order. */
export function pageRows(pages: Record<string, number>): { key: string; label: string; visits: number }[] {
  return Object.entries(pages)
    .filter(([, n]) => n > 0)
    .map(([key, visits]) => ({ key, label: pageLabel(key), visits }))
    .sort((a, b) => b.visits - a.visits || a.label.localeCompare(b.label));
}

/** The feed in time order. Stable: entries with the same time keep their stored order. */
export function orderedFeed(feed: ActivityFeedItem[]): ActivityFeedItem[] {
  return feed
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.t - b.item.t || a.i - b.i)
    .map(({ item }) => item);
}
