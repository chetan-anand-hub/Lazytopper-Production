/**
 * SHARE-CARD-1 - the ONE table of words on the share image: the mascots' lines and the labels.
 *
 * Owner rules (22 Oct 2026): each line is 14 words or fewer, never shaming, light Hinglish is
 * allowed, and no "½" glyph (a half mark is written "0.5" / "2.5", from marksWithUnit). A
 * `{marks}` slot is filled with the scorecard's OWN figure ("3 marks"); a `{count}` slot with
 * its own count; `{label}` with the product's mistake-type label (lib/mistakeDisplay). Nothing
 * else is ever interpolated, so no line can carry a number the scorecard does not show.
 *
 * Pure data. Pasted into the PR body; `shareCopy.test.ts` pins the rules over every row.
 */
import type { Pose } from "../../guide/rig";

export type ZiggyMood = "great" | "mixed" | "keepgoing" | "oops" | "hide";

/** Ziggy (the student) sits with the SCORE. His pose and line follow the result - and how much
 *  of the set was graded ("keepgoing": a good score on a partly graded set). */
export const ZIGGY_LINES: Readonly<Record<ZiggyMood, { pose: Pose; line: string }>> = {
  great: { pose: "excited", line: "Board-ready vibes! Full josh." },
  mixed: { pose: "determined", line: "Good going! A few marks to grab back." },
  keepgoing: { pose: "determined", line: "Good start! Finish the rest to see your full score." },
  oops: { pose: "oops", line: "Oops! Every mark lost here can be won back." },
  hide: { pose: "hide", line: "Some answers left blank. Next time, attempt them all!" },
};

/** Byte (the guide) sits with the TIP on the biggest loss. Keys: the four stored mistake
 *  types, the not-attempted bucket, and the honest fall-backs. */
export type ByteTipKey =
  | "conceptual"
  | "calculation"
  | "silly"
  | "presentation"
  | "unattempted"
  | "counts"
  | "clean"
  | "objective-wrong"
  | "objective-clean"
  | "none";

export const BYTE_TIPS: Readonly<Record<ByteTipKey, { pose: Pose; line: string }>> = {
  conceptual: { pose: "explain", line: "Concept gaps cost {marks}. Revise the idea, then try again!" },
  calculation: { pose: "explain", line: "Calculation slips cost {marks}. Check every step again, yaar!" },
  silly: { pose: "explain", line: "Silly slips cost {marks}. Check signs and copying again!" },
  presentation: { pose: "technique", line: "Presentation cost {marks}. Units, labels and the final line - always!" },
  unattempted: { pose: "point", line: "Blank answers cost {marks}. Even the right formula earns marks!" },
  counts: { pose: "explain", line: "Most mistakes: {label} ({count}). Fix these first!" },
  clean: { pose: "cheer", line: "Zero marks lost to mistakes. Bas, keep this streak going!" },
  "objective-wrong": { pose: "explain", line: "Tap answers show what you chose, not why. Check a written one!" },
  "objective-clean": { pose: "cheer", line: "Every tap answer right! Ab ek written answer try karo." },
  none: { pose: "explain", line: "Check a written answer to see where your marks go." },
};

/** Fixed labels on the image. */
export const SHARE_LABELS = {
  brandTag: "CBSE Class 10",
  miHeading: "Mistake Intelligence",
  miSub: "Mistakes found, and marks lost to each",
  biggest: "Biggest loss",
  noMistakeLoss: "No marks lost to mistakes",
  coverageOne: "question graded",
  coverageMany: "questions graded",
  notAttempted: "Not attempted (not a mistake)",
  untyped: "Marks lost, reason not recorded",
  objectiveRight: "Right",
  objectiveWrong: "Wrong",
  objectiveHeading: "Tap answers",
  tipFallback: "Tip",
  marksWord: "marks",
  footLead: "Check your own answers free",
  footSite: "lazytopper.com",
  nameSuffix: "'s result",
} as const;

/** Labels in the share sheet (the student's controls, not the image). */
export const SHARE_PANEL_LABELS = {
  button: "Share result",
  title: "Share your result",
  sizeStory: "Story (Instagram, WhatsApp status)",
  sizeSquare: "Square post",
  mascots: "Show Byte & Ziggy",
  name: "Add my first name",
  share: "Share",
  whatsapp: "WhatsApp",
  instagram: "Instagram story",
  saveStory: "Save story image",
  download: "Download image",
  making: "Making your image...",
  failed: "Couldn't make the image just now. Try again.",
  instagramHint: "Saved. Open Instagram, add to your Story and pick this image.",
  whatsappHint: "Image saved - attach it in WhatsApp.",
  tapAgain: "Tap again to share.",
  close: "Close",
} as const;

/** Every row of the copy table, flattened (tests + the PR body). */
export function shareCopyRows(): Array<{ who: string; key: string; text: string }> {
  const rows: Array<{ who: string; key: string; text: string }> = [];
  for (const [k, v] of Object.entries(ZIGGY_LINES)) rows.push({ who: "Ziggy", key: k, text: v.line });
  for (const [k, v] of Object.entries(BYTE_TIPS)) rows.push({ who: "Byte", key: k, text: v.line });
  for (const [k, v] of Object.entries(SHARE_LABELS)) rows.push({ who: "label", key: k, text: v });
  for (const [k, v] of Object.entries(SHARE_PANEL_LABELS)) rows.push({ who: "panel", key: k, text: v });
  return rows;
}

/** Fill `{marks}` / `{count}` / `{label}` - the only slots a line has. */
export function fillLine(line: string, slots: { marks?: string; count?: string; label?: string }): string {
  return line
    .replace("{marks}", slots.marks ?? "")
    .replace("{count}", slots.count ?? "")
    .replace("{label}", slots.label ?? "");
}
