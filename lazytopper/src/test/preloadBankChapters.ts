// BANK-SPLIT-1 PR-2 — test preload. In the app a route awaits its chapters before it reads
// the bank (data/bankChapters/loader). A test that calls the bank's synchronous APIs
// directly (selectBankQuestions, PredictionCore.*, drawChapterTest, buildUnionPool,
// planWorksheet, ...) imports this module first; its top-level await loads all 26 chapters
// before the test file's own code runs. Route tests that exercise the await itself must
// NOT import it.
import { ensureAllBankChapters } from "../data/bankChapters/loader";

await ensureAllBankChapters();

export {};
