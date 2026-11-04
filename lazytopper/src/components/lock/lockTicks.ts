/**
 * lockTicks - LOCK-SELL-1. The Board Pass card's star features and the price word, imported ONLY by the lazy BoardPassLockDetails so
 * they stay out of the entry chunk (PERF-3). Wording rules: see lockCopy.ts (true to the product; no "unlimited grading"; the tutor
 * tick avoids the word "ask"; no refund wording).
 */
/** The Board Pass's star features, Answer Checker FIRST. The name before the dash is bold (`strong`). */
export const LOCK_TICKS: ReadonlyArray<{ id: string; strong?: string; text: string }> = [
  { id: "checker", strong: "Answer Checker", text: " — every written answer marked step by step, like a CBSE examiner" },
  { id: "mi", strong: "Mistake Intelligence", text: " — see exactly why you lose marks, topic by topic" },
  { id: "tutor", strong: "AI tutor", text: " — clears your doubts on any question, any time" },
  { id: "graded", text: "Chapter tests, worksheets and full board mocks graded, not just downloaded" },
  { id: "papers", text: "Unlimited chapter tests and mocks to open or download" },
];

/** The word in front of "till your boards (Feb 2027)" beside the price (the same word /pricing uses). */
export const LOCK_ONCE = "once";

