/**
 * generateBoardQuestions — emits `src/lib/boardQuestions/boardQuestions.generated.json`.
 *
 * Runs the deterministic rule in `src/lib/boardQuestions/selectionRule.ts` against the
 * LIVE canonical bank and writes the 26-topic artifact the notes pages publish.
 *
 * REGENERATE WITH (from `lazytopper/`):
 *
 *     node --import tsx scripts/generateBoardQuestions.ts
 *
 * Then run the guard to confirm the artifact matches the live bank:
 *
 *     pnpm exec vitest run src/lib/boardQuestions/boardQuestions.guard.test.ts
 *
 * This script is tooling: it is NOT imported by the app and never ships.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
  WITHHELD_QUESTION_IDS,
} from "../src/data/canonicalQuestionBank";
import {
  BOARD_QUESTION_COUNT,
  selectBoardQuestions,
} from "../src/lib/boardQuestions/selectionRule";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/lib/boardQuestions/boardQuestions.generated.json");

// Throws, naming the topic, if any topic cannot be filled (§2.5).
const artifact = selectBoardQuestions(
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
  WITHHELD_QUESTION_IDS,
);

const topics = Object.keys(artifact);
const rows = topics.reduce((n, t) => n + artifact[t].questions.length, 0);

// ⚠ JSON, NOT .ts, AND DELIBERATELY SO. These are CBSE word problems, and they
// legitimately contain rupee amounts ("the entry fee is Rs 5", an AP loan-repayment
// question). `src/config/pricing.guard.test.ts` walks every .ts/.tsx under src/ and
// fails on a rupee literal, because four surfaces once hard-coded a retired price and
// drifted. That guard is right, and this content is exam material rather than a product
// price — the guard already exempts `src/data/**` for exactly this reason. Emitting JSON
// keeps the content verbatim AND keeps the guard at full strength, instead of mangling
// questions or punching an exemption hole. See boardQuestions.ts for the loader.
const payload = {
  _README:
    "GENERATED FILE - DO NOT EDIT BY HAND. Hand edits are destroyed on the next " +
    "regeneration, and boardQuestions.guard.test.ts fails the build the moment this " +
    "file disagrees with the live bank. Regenerate from lazytopper/ with: " +
    "node --import tsx scripts/generateBoardQuestions.ts",
  _rule:
    "src/lib/boardQuestions/selectionRule.ts - competency + publishable + not AI-question " +
    "+ not withheld, sorted by id in CODEPOINT order (never localeCompare), first " +
    String(BOARD_QUESTION_COUNT) + " per topic.",
  _counts: { topics: topics.length, questions: rows },
  topics: artifact,
};

// JSON.stringify preserves key order (the rule fixed it to codepoint order) and escapes
// every string correctly, including half-mark glyphs and LaTeX backslashes.
writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");

console.log(
  `boardQuestions.generated.json written: ${topics.length} topics, ${rows} questions.`,
);
