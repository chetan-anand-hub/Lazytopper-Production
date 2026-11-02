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
import {
  FEEDBACK_MOMENTS,
  FEEDBACK_NEXT_ACTIONS,
  FEEDBACK_REASONS,
  FIRST_GRADED_ANSWERS,
  GRADED_MOMENTS,
  feedbackActivityName,
  type FeedbackMoment,
  type FeedbackNextAction,
  type FeedbackReason,
} from "../../components/feedback/feedbackPromptModel";
import { guideVariantFor } from "../../components/guide/guideVariant";

const STATIC_PAGE_LABELS: Record<string, string> = {
  home: "Home",
  welcome: "Welcome page",
  browse: "Home (browse)",
  intent: "Getting started",
  pricing: "Pricing",
  packs: "PDF packs page",
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
  "check-improve": "Answer Checker",
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

/** FEEDBACK-1 — where the prompt was shown, in the owner's words. (Declared before
 *  EVENT_LABELS, which reads it while it is built.) */
export const FEEDBACK_MOMENT_LABELS: Record<FeedbackMoment, string> = {
  paywall: "after closing an upgrade screen",
  trial_end: "after the trial ended",
  first_graded: "after the first graded result",
  after_graded: "after a later graded result",
};

/** FEEDBACK-2 — what a student did next, in the owner's words (names only; the note's words are never here). */
export const FEEDBACK_NEXT_LABELS: Record<FeedbackNextAction, string> = {
  more: "Tapped “5 more” practice questions",
  harder: "Tapped “Try 5 harder ones”",
  easier: "Tapped “Try 5 easier ones”",
  tutor: "Tapped “Ask the tutor about it”",
  written: "Tapped “Check a written answer”",
  picker: "Went to choose a chapter",
  note_saved: "Sent a “Tell us more” note (the words are private to their account)",
};

/** FEEDBACK-1 — each reason code -> the exact words the student tapped (one source: the prompt's own list). */
export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = Object.fromEntries(
  [...FEEDBACK_REASONS, ...FIRST_GRADED_ANSWERS].map((r) => [r.code, r.label]),
) as Record<FeedbackReason, string>;

const EVENT_LABELS: Record<string, string> = {
  sign_up: "Signed up",
  free_check_used_block: "Was shown that the free check is used",
  free_check_signup: "Saved a free check to a new account",
  free_check_trial_start: "Started the free trial from a free check",
  free_check_result_restored: "Saw their saved free-check result after signing up",
  free_check_result_restored_buy_click: "Tapped the buy line under their saved free-check result",
  trial_start: "Started the free trial",
  check_question_read: "Read a question to check",
  check_answer_added: "Added an answer",
  check_graded: "Checked an answer",
  practice_graded: "Graded a practice set",
  testimonial_play: "Played the testimonial video",
  parent_share_click: "Tapped Send to my child",
  // SOLUTIONS-1 (lane G) — the public NCERT / Exemplar solutions pages.
  sol_hint: "Opened a solutions hint",
  sol_attempt_mcq: "Answered a solutions MCQ",
  sol_attempt_typed_right: "Typed a right answer (solutions)",
  sol_attempt_typed_wrong: "Typed a wrong answer (solutions)",
  sol_attempt_no_verdict: "Typed an answer (solutions, no verdict)",
  sol_unlock: "Unlocked a solution",
  sol_check_start: "Tapped Check my answer (solutions)",
  // TRACK-2 — checkout and onboarding.
  begin_checkout: "Opened checkout",
  purchase: "Paid for Premium",
  start_here_shown: "Saw Start here",
  start_here_start: "Started Start here",
  start_here_graded: "Finished Start here",
  start_here_dismissed: "Dismissed Start here",
  tutor_from_scorecard: "Opened the tutor from a scorecard",
  // TUTOR-FIX-2 T13.
  tutor_first_message: "Sent a first tutor message",
  trial_banner_shown: "Saw the trial-ending banner",
  trial_banner_click: "Tapped the trial-ending banner",
  trial_end_screen_shown: "Saw the trial-ended screen",
  trial_end_screen_pay: "Tapped Pay on the trial-ended screen",
  trial_end_screen_parent: "Sent the trial-ended offer to a parent",
  trial_end_screen_basic: "Chose Basic on the trial-ended screen",
  scorecard_upgrade_shown: "Saw the upgrade line on a scorecard",
  scorecard_upgrade_click: "Tapped the upgrade line on a scorecard",
  // FEEDBACK-1 — the "help us improve" prompt (shown / dismissed / answered), built below.
  ...feedbackEventLabels(),
  // GUIDE-1 — the stored name carries no arm (names only); guideTestGroupLabel(uid) derives it.
  guide_variant_assigned: "Was put in the guide test (A/B ended 22 Oct 2026 — all students on guide)",
  // PAYWALL-PAY-1 — the three paywall actions (any surface: lock, upgrade popup / sheet, limit, /pricing,
  // tutor, trial_paper, more_like_this).
  paywall_action_pay: "Tapped Pay on a paywall",
  paywall_action_qr: "Tapped Pay by QR code (for parents)",
  paywall_action_forward: "Tapped Forward link to parents",
  ask_parent_pay: "Tapped Ask a parent to pay",
  // PAY-RESCUE-1
  pay_rescue_shown: "Saw the \"Can't pay yourself?\" card after a payment sheet closed",
  pay_rescue_parent: "Tapped Ask a parent to pay on the \"Can't pay yourself?\" card",
  pay_rescue_retry: "Tapped Try again on the \"Can't pay yourself?\" card",
  // LIMITS-1 — paper downloads and the weekly download limit.
  download_start: "Started a paper download",
  download_blocked: "Was stopped by the weekly download limit",
  download_wall_shown: "Saw the download limit screen",
  grade_blocked: "Was stopped by the daily graded-practice limit",
  scorecard_lock_shown: "Saw the locked answer-by-answer breakdown",
  parent_report_shared: "Shared a result link with parents",
  // SHARE-CARD-1 — any surface, size (story / square) or channel (sheet, WhatsApp, Instagram, download).
  scorecard_share: "Shared a scorecard image",
  // CI-SOFT-1 — the Check & Improve "pick a board question, watch it get marked" card (display only).
  ci_demo_shown: "Saw the sample-marking card on Answer Checker",
  ci_demo_pick: "Picked a sample board question to watch marked",
  ci_demo_result: "Watched a sample answer get marked to the end",
  ci_demo_check_own: "Tapped Check my own answer after a sample",
  ci_demo_another: "Tapped Mark another question after a sample",
  ci_demo_close: "Closed the sample-marking card",
  one_min_tap_shown: "Saw the 1-tap board question (first-minute ladder)",
  one_min_tap_answered: "Tapped an answer on the 1-tap board question",
  one_min_type_shown: "Moved on to the typed 2-mark question",
  one_min_type_graded: "Got a typed 2-mark answer graded in the first-minute ladder",
  one_min_photo_cta: "Was offered to snap an answer on paper",
  one_min_more_practice: "Tapped 5 more like this after the first-minute ladder",
  first_action_shown: "Saw the first-action card (one question to try)",
  first_action_tap: "Tapped the first-action card",
  friend_challenge_share: "Shared a challenge question with a friend",
  friend_challenge_open: "Opened a friend's challenge link",
  engaged_10min: "Stayed 10 minutes (in one day)",
  engaged_5min: "Stayed 5 minutes (in one day)",
  // PACKS-CLIENT-1 — the printable PDF packs.
  pack_view: "Opened the PDF packs page",
  pack_checkout: "Opened checkout for a PDF pack",
  pack_purchase: "Bought a PDF pack",
  pack_download: "Downloaded a PDF from a pack",
  pack_sample_download: "Downloaded a free pack sample page",
  // PACKS-ENTRY-1
  pack_entry_click: "Tapped a PDF packs link",
  cbq_tutor_bonus_used: "Used a CBQ Pack tutor question",
  tutor_daily_fix_shown: "Saw the tutor's daily lost-marks card",
  tutor_daily_fix_tap: "Tapped the tutor's daily lost-marks card",
  tutor_check_shown: "Was offered a one-tap check by the tutor",
  tutor_check_correct: "Got the tutor's one-tap check right",
  trial_summary_shown: "Saw the trial-ending tutor summary",
  trial_summary_tap: "Tapped the trial-ending tutor summary",
  sale_moment_shown: "Was shown a pack / Board Pass line after a result",
  sale_moment_tap: "Tapped a pack / Board Pass line after a result",
  board_pass_direct_checkout: "Opened the Board Pass checkout straight from a Pay button",
  guest_pay_option_shown: "Was shown \"Pay now with your phone number\"",
  guest_pay_start: "Started paying with a phone number",
  guest_pay_paid: "Paid with a phone number (before signing in)",
  guest_pay_claimed: "Signed in and got a purchase paid with a phone number",
};

/* ── GUIDE-1 — the Byte-guide A/B ──────────────────────────────────────────── */

/** GUIDE-ALL-1 — appended to every historical test-group label (owner ruling 22 Oct 2026). */
export const GUIDE_AB_ENDED_NOTE = "A/B ended 22 Oct 2026 — all students on guide";

export const GUIDE_TEST_GROUP_LABELS = {
  guide: `Guide test group: Byte (${GUIDE_AB_ENDED_NOTE})`,
  control: `Guide test group: control (${GUIDE_AB_ENDED_NOTE})`,
} as const;

/**
 * The arm a student WAS in during the test. The activity store keeps NAMES only, so
 * `guide_variant_assigned` cannot carry the arm; but the arm was a pure function of the uid
 * (guideVariant.ts `guideVariantFor`), so the admin board derives it here — the same answer the
 * student's device computed. GUIDE-ALL-1: the device stopped sending `guide_variant_assigned` on
 * 22 Oct 2026, so every such row is pre-ruling and this label stays historically exact; the
 * suffix says the split is over (every student now gets the guide).
 */
export function guideTestGroupLabel(uid: string): string {
  return GUIDE_TEST_GROUP_LABELS[guideVariantFor(uid)];
}

/* ── FEEDBACK-1 — the "help us improve" prompt ─────────────────────────────── */

function feedbackEventLabels(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of FEEDBACK_MOMENTS) {
    out[feedbackActivityName("shown", m)] = `Was asked for feedback (${FEEDBACK_MOMENT_LABELS[m]})`;
    out[feedbackActivityName("dismissed", m)] = `Said No thanks to feedback (${FEEDBACK_MOMENT_LABELS[m]})`;
    out[feedbackActivityName("call_tap", m)] =
      `Opened WhatsApp for the 5-minute feedback call offer (${FEEDBACK_MOMENT_LABELS[m]})`;
    for (const r of FEEDBACK_REASONS) {
      out[feedbackActivityName("reason", m, r.code)] = `Feedback (${FEEDBACK_MOMENT_LABELS[m]}): “${r.label}”`;
    }
  }
  // FIRST-FEEDBACK-1 / FEEDBACK-2 — "Was this useful?" (no call offer, so no call-tap label).
  for (const g of GRADED_MOMENTS) {
    out[feedbackActivityName("shown", g)] = `Was asked “Was this useful?” (${FEEDBACK_MOMENT_LABELS[g]})`;
    out[feedbackActivityName("dismissed", g)] = `Closed “Was this useful?” without answering (${FEEDBACK_MOMENT_LABELS[g]})`;
    for (const a of FIRST_GRADED_ANSWERS) {
      out[feedbackActivityName("reason", g, a.code)] = `Feedback (${FEEDBACK_MOMENT_LABELS[g]}): “${a.label}”`;
    }
    for (const act of FEEDBACK_NEXT_ACTIONS) {
      out[feedbackActivityName("next", g, undefined, act)] = `After “Was this useful?” (${FEEDBACK_MOMENT_LABELS[g]}): ${FEEDBACK_NEXT_LABELS[act]}`;
    }
  }
  return out;
}

/** One answer to the feedback prompt, as the admin detail lists it. */
export interface FeedbackAnswerRow {
  day: string;
  moment: FeedbackMoment;
  reason: FeedbackReason;
  label: string;
  count: number;
}

// FIRST-FEEDBACK-1 — widened: first_graded pairs ONLY with its three answers.
const FEEDBACK_REASON_NAME =
  /^feedback_(?:(paywall|trial_end)_(not_tried|ask_parents|price|not_enough_help|boards_far|other)|(first_graded|after_graded)_(yes|too_easy|not_really|too_hard))$/;

/**
 * FEEDBACK-1 — every answer this student gave, newest day first, read from the day
 * timeline's event COUNTS (exact even when a day's feed was truncated). Shown/dismissed
 * names are not answers and are left out. Read-only: nothing is stored or inferred.
 */
export function feedbackAnswers(
  timeline: ReadonlyArray<{ day: string; activity: { events: Record<string, number> } | null }>,
): FeedbackAnswerRow[] {
  const rows: FeedbackAnswerRow[] = [];
  for (const d of timeline) {
    const events = d.activity?.events ?? {};
    for (const [name, count] of Object.entries(events)) {
      const m = FEEDBACK_REASON_NAME.exec(name);
      if (!m || !(count > 0)) continue;
      const moment = (m[1] ?? m[3]) as FeedbackMoment;
      const reason = (m[2] ?? m[4]) as FeedbackReason;
      rows.push({ day: d.day, moment, reason, label: FEEDBACK_REASON_LABELS[reason], count });
    }
  }
  return rows.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : a.label.localeCompare(b.label)));
}

/** A recorded event name in plain words, e.g. "check_graded" -> "Checked an answer". */
export function activityEventLabel(name: string, uid?: string): string {
  // GUIDE-1 — with the student's uid in hand, name the arm ("Guide test group: Byte").
  if (name === "guide_variant_assigned" && uid) return guideTestGroupLabel(uid);
  return EVENT_LABELS[name] ?? name;
}

/** One feed line: "Opened Notes → Trigonometry" or "Checked an answer". */
export function feedItemLabel(item: ActivityFeedItem, uid?: string): string {
  return item.k === "page" ? `Opened ${pageLabel(item.n)}` : activityEventLabel(item.n, uid);
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
