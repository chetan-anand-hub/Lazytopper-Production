/**
 * CBQ-PIN-1 - the Board CBQ Pack's SETS are pinned. A sold set (`PK-<M|S>-<TOPIC>-CBQ<k>`) keeps exactly its questions for good: the sets
 * are no longer dealt afresh from whatever the bank holds today (which shifted the whole chapter when a row was added by step-marking
 * or retired). The pack is still the COMPLETE pack: every eligible row is in exactly one set - the pinned sets, plus NEW sets appended
 * after the last one (new codes) for rows that became eligible later.
 *
 * packCbqSetIds.json: per chapter slug { sets: ids[][] (set k = index + 1, ids in printed order), parts: sizes of the PART files (the
 * delivery split, pinned too so a sold part file keeps its sets) }. Append-only: `LT_WRITE_CBQ_PINS=1` on cbqPins.test.ts appends
 * the new rows of each chapter as new sets (same size/shape rule as before: cbqSets over the new rows, cases never split) and never
 * alters an existing one; a guard test fails when an eligible row is in no pinned set (run the generator in the same PR as the bank edit).
 *
 * A pinned id is resolved from the eligible CBQ rows, then the served bank, then the RAW bank (a retired / withheld row stays in its
 * set); one absent everywhere is omitted, never swapped. Kill switch: VITE_CBQ_PIN_DISABLED -> today's positional dealing, byte-identical.
 */
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { selectBankQuestions } from "../../data/bankQuery";
import { loadRawBankRowsById } from "../testSeries/rawBankRows";
import { cbqSets } from "./cbqSets";
import { bankSubjectOf, cbqPackRows } from "./packContent";
import pins from "./packCbqSetIds.json";

export interface CbqChapterPins {
  sets: string[][];
  parts: number[];
}
const ALL = pins as unknown as Record<string, CbqChapterPins>;
export const allCbqPins = (): Record<string, CbqChapterPins> => ALL;

export function cbqPinDisabled(): boolean {
  const v = import.meta.env?.VITE_CBQ_PIN_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** The part split used today (CBQ_SETS_PER_PART = 3): near-equal parts. Kept here (not imported) so this module has no cycle with buildPackFiles. */
export const CBQ_SETS_PER_PART_PIN = 3;
export function partSizes(nSets: number): number[] {
  if (nSets <= 0) return [];
  const n = Math.ceil(nSets / CBQ_SETS_PER_PART_PIN);
  const out: number[] = [];
  let at = 0;
  for (let i = 0; i < n; i += 1) {
    const size = Math.ceil((nSets - at) / (n - i));
    out.push(size);
    at += size;
  }
  return out;
}

export interface CbqSetsFor {
  /** Each set with its number k (the code's number), its rows in printed order. */
  sets: Array<{ k: number; rows: CanonicalQuestion[] }>;
  /** The set numbers of each PART file, in order. */
  partKs: number[][];
  /** The total number of sets in the chapter's pack ("Set k of N"). */
  total: number;
}

/** The chapter's pack sets: pinned (+ appended) sets, or today's positional dealing under the kill switch. */
export async function cbqSetsFor(slug: string): Promise<CbqSetsFor> {
  const eligible = cbqPackRows(slug);
  if (cbqPinDisabled()) {
    const sets = cbqSets(eligible).map((rows, i) => ({ k: i + 1, rows }));
    let at = 0;
    const partKs = partSizes(sets.length).map((n) => {
      const ks = sets.slice(at, at + n).map((s) => s.k);
      at += n;
      return ks;
    });
    return { sets, partKs, total: sets.length };
  }
  const pin = ALL[slug];
  if (!pin || pin.sets.length === 0) return { sets: [], partKs: [], total: 0 };
  const byId = new Map<string, CanonicalQuestion>(eligible.map((q) => [String(q.id), q]));
  const wanted = new Set(pin.sets.flat());
  const needMore = [...wanted].filter((id) => !byId.has(id));
  if (needMore.length) {
    for (const q of selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] })) if (wanted.has(String(q.id)) && !byId.has(String(q.id))) byId.set(String(q.id), q);
    const still = needMore.filter((id) => !byId.has(id));
    if (still.length) for (const [id, q] of await loadRawBankRowsById(still)) byId.set(id, q);
  }
  const sets = pin.sets
    .map((ids, i) => ({ k: i + 1, rows: ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as CanonicalQuestion] : [])) }))
    .filter((s) => s.rows.length > 0);
  let at = 0;
  const partKs = pin.parts
    .map((n) => {
      const ks = Array.from({ length: n }, (_, j) => at + j + 1).filter((k) => sets.some((s) => s.k === k));
      at += n;
      return ks;
    })
    .filter((ks) => ks.length > 0);
  return { sets, partKs, total: pin.sets.length };
}
