// src/services/progressBankIndex.ts
//
// PR-B — a PURE, READ-ONLY index over the served bank that resolves a bank
// questionId to its concept (subtopic) + CBSE section. This is the ONLY concept
// source for the progress concept/section rungs (progressStore.getWindowedProgress).
//
// HONEST-OR-SILENT, BY CONSTRUCTION:
//   • A question with no bank identity — an external Check & Improve upload (whose
//     SessionRecord carries `questionIds: []`), a free-typed check, or a
//     surface-scoped SYNTHETIC id (`ws:` / `ct:` / `fm:` attempt ids) — resolves to
//     null. Its concept stays UNKNOWABLE and is silently excluded, never fabricated.
//   • A "chapter-echo" subtopic (a placeholder equal to the chapter name, e.g.
//     "Chapter Practice — Life Processes", or the "General" PYQ catch-all) is treated
//     as UNRESOLVED for the concept rung — the rung must never present a whole-chapter
//     bucket as a distinct "concept" (that would fabricate granularity the data lacks).
//     Section is unaffected (A–E is always a real datum on a bank row).
//
// ★ BANK-SPLIT-1 PR-2 (L2): this module no longer imports the bank. It reads the generated
// id index (data/bankChapters/bankIdIndex — ids and tags of every SERVED row, no question
// content), so it stays synchronous and leaves the bank graph. progressStore and
// mistakeIntelligence still load it with `await import()` (BANK-LEAN-1); that is now a
// small chunk instead of the bank. The id→concept Map is built lazily.

import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";

// BANK-LEAN-1 (C4): the pure shape + predicates live in ./progressBankShape (bank-free),
// re-exported here so every existing importer and vi.mock of this module is unchanged.
import type { BankConcept } from "./progressBankShape";
export { isChapterEchoSubtopic, normalizeSection, type BankConcept } from "./progressBankShape";

let _index: Map<string, BankConcept> | null = null;

function buildIndex(): Map<string, BankConcept> {
  const map = new Map<string, BankConcept>();
  for (const [id, q] of bankIndexEntries()) {
    // `q.topicKey` is already a canonical topics.ts slug (Guard A enforces this on the
    // served bank); read it raw + lowercase for stable topic-scoped matching. Read via
    // String(...) so we never do a raw `.topicKey ===` compare (Guard B / bank-vs-chosen
    // matching is not what this is — it is a display/index build, not a topic decision).
    // The index stores a non-string subtopic/section as "", so the trims below give the
    // same values the bank rows gave.
    map.set(id, {
      subtopic: q.subtopic.trim(),
      section: q.section.trim(),
      topicKey: String(q.topicKey || "").trim().toLowerCase(),
    });
  }
  return map;
}

function index(): Map<string, BankConcept> {
  if (!_index) _index = buildIndex();
  return _index;
}

/**
 * Resolve a bank questionId → {subtopic, section}. Returns null when the id has no
 * bank row (unknowable concept — an honest gap, never fabricated). Synthetic
 * surface-scoped ids (`ws:`/`ct:`/`fm:`) and empty ids never resolve.
 */
export function conceptForQuestionId(id: string | null | undefined): BankConcept | null {
  const key = String(id || "").trim();
  if (!key) return null;
  return index().get(key) ?? null;
}

/** Test-only: reset the lazily-built index (so a fixture bank can be re-read). */
export function __resetProgressBankIndexForTest(): void {
  _index = null;
}
