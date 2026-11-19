/**
 * TS-PIN-1 - a pinned id that the SERVED bank no longer serves (a row WITHHELD or filtered after the paper was published) is looked
 * up in the RAW bank, so a series paper keeps its own question. Only if the id is absent from the raw bank too is it "truly absent".
 *
 * TS-MORE-1: the few such rows (5 today, on 4 chapter papers) are EMBEDDED in seriesRetiredRows.json, a small committed file next to the
 * pins, so opening those papers no longer fetches the heavy raw-bank chunk (~1 s). paperManifest.guard.test.ts pins every embedded
 * row EQUAL to its raw bank row, and every pinned id that the served bank does not serve to an embedded row, so the file cannot go
 * stale. The raw bank is still imported (lazily) for any id the file does not hold - nothing that resolved before stops resolving.
 */
import type { CanonicalQuestion } from "../../data/predictionTypes";
import retiredRows from "./seriesRetiredRows.json";

const EMBEDDED = retiredRows as unknown as Record<string, CanonicalQuestion>;

/** The embedded retired rows, by id (tests; the generator). */
export function embeddedRetiredRows(): Readonly<Record<string, CanonicalQuestion>> {
  return EMBEDDED;
}

export async function loadRawBankRowsById(ids: Iterable<string>): Promise<Map<string, CanonicalQuestion>> {
  const want = new Set(ids);
  const out = new Map<string, CanonicalQuestion>();
  for (const id of want) {
    const row = Object.prototype.hasOwnProperty.call(EMBEDDED, id) ? EMBEDDED[id] : undefined;
    if (row) {
      out.set(id, row);
      want.delete(id);
    }
  }
  if (want.size === 0) return out;
  const { RAW_CANONICAL_QUESTION_BANK } = await import("../../data/canonicalQuestionBank");
  for (const q of RAW_CANONICAL_QUESTION_BANK) {
    if (want.has(q.id) && !out.has(q.id)) out.set(q.id, q);
  }
  return out;
}
