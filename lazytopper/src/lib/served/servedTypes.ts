// src/lib/served/servedTypes.ts
//
// SERVED-TYPES-1 — the ONE shape family for "questions already served to this student", shared
// by the two served-history modules (types only; no behaviour lives here):
//
//   lib/practice/servedHistory.ts (FRESH-SET-QP)  — Quick Practice, one entry per QUESTION
//     (per user per chapter, device + practiceInsights mirror).
//   lib/freshSet/servedHistory.ts (FRESH-SET-TESTS) — Chapter Test / Full Mock / Worksheet,
//     one entry per PAPER (device log beside the session records).
//
// Both stamp "when it was served" the same way (`at`, ms since epoch) and both key questions by
// the bank question id, so a question entry is exactly what a paper entry holds per id.

/** When something was served — ms since epoch (both modules). */
export interface ServedStamp {
  at: number;
}

/** One QUESTION served (Quick Practice). */
export interface ServedQuestionEntry extends ServedStamp {
  /** The bank question id. */
  id: string;
}

/** The paper surfaces whose sets must not repeat (Quick Practice keeps its own per-question log). */
export type ServedPaperSurface = "chapter-test" | "full-mock" | "worksheet";

/** One PAPER served (Chapter Test / Full Mock / Worksheet): its bank question ids, all at `at`. */
export interface ServedPaperEntry extends ServedStamp {
  surface: ServedPaperSurface;
  /** Chapter slug (Chapter Test / single-topic Worksheet), subject (Full Mock, multi-topic Worksheet). */
  scope: string;
  /** The bank question ids on the paper. */
  ids: string[];
}
