/**
 * boardQuestions — the published board questions, loaded from the GENERATED artifact.
 *
 * ★ DO NOT EDIT `boardQuestions.generated.json` BY HAND. Hand edits are destroyed on the
 * next regeneration, and `boardQuestions.guard.test.ts` fails the build the moment the
 * artifact disagrees with the live bank.
 *
 * REGENERATE (from `lazytopper/`):
 *     node --import tsx scripts/generateBoardQuestions.ts
 *
 * ★ WHY A COMMITTED ARTIFACT AND NOT A RUNTIME FILTER OVER THE BANK.
 * Importing `canonicalQuestionBank` here would pull `src/data/questionBanks/` — 11 MB
 * across 413 files — into the notes-page chunk, on all 26 prerendered pages. That is the
 * PERF-1 regression already on record in this repo (topic hubs froze 10.6 s on one
 * module-scope line; main chunk 9,988 kB), and it would land on the exact surface this
 * lane exists to make fast and crawlable. Verified on the built output: the Note chunk
 * imports NcertPageModal, index, katex and noteSpecRegistry — and NOT
 * canonicalQuestionBank, which stays in its own 6.3 MB chunk.
 *
 * ★ WHY THE ARTIFACT IS .json AND NOT .ts.
 * These are CBSE word problems and they legitimately contain rupee amounts (a probability
 * entry-fee question, an AP loan-repayment question). `src/config/pricing.guard.test.ts`
 * walks every .ts/.tsx under src/ and fails on a rupee literal — rightly, because four
 * surfaces once hard-coded a retired price and drifted apart. That guard already exempts
 * `src/data/**` on the grounds that question banks are exam content rather than product
 * prices; this artifact is the same kind of content. Emitting JSON keeps the questions
 * VERBATIM and keeps the guard at full strength, rather than mangling exam text or
 * opening an exemption hole.
 *
 * The glob loader is the pattern `noteSpecRegistry.ts` already uses to bring JSON into
 * the bundle, which avoids needing `resolveJsonModule` in the app tsconfig.
 */

import type { BoardQuestionArtifact } from "./selectionRule";

interface GeneratedPayload {
  _README: string;
  _rule: string;
  _counts: { topics: number; questions: number };
  topics: BoardQuestionArtifact;
}

const generated = import.meta.glob("./boardQuestions.generated.json", {
  eager: true,
  import: "default",
}) as Record<string, GeneratedPayload>;

const payload = Object.values(generated)[0];

/** The 3 published competency questions per topic, keyed by topicKey. */
export const BOARD_QUESTIONS: BoardQuestionArtifact = payload?.topics ?? {};
