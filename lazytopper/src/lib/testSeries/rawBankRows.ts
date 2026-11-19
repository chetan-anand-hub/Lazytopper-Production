/**
 * TS-PIN-1 - a pinned id that the SERVED bank no longer serves (a row WITHHELD or filtered after the paper was published) is looked
 * up in the RAW bank, so a series paper keeps its own question. LAZY: the raw aggregator is a heavy chunk, imported only when a
 * pinned id is actually unresolved (never on today's papers). Only if the id is absent from the raw bank too is it "truly absent".
 */
import type { CanonicalQuestion } from "../../data/predictionTypes";

export async function loadRawBankRowsById(ids: Iterable<string>): Promise<Map<string, CanonicalQuestion>> {
  const want = new Set(ids);
  const out = new Map<string, CanonicalQuestion>();
  if (want.size === 0) return out;
  const { RAW_CANONICAL_QUESTION_BANK } = await import("../../data/canonicalQuestionBank");
  for (const q of RAW_CANONICAL_QUESTION_BANK) {
    if (want.has(q.id) && !out.has(q.id)) out.set(q.id, q);
  }
  return out;
}
