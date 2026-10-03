// src/data/bankChapters/bankIdIndex.ts
//
// BANK-SPLIT-1 PR-2 (L2). Synchronous id -> {topicKey, subtopic, section} lookup over the
// SERVED bank, read from a generated artifact of ids and tags (no question content), so
// the progress, mistake and scorecard lookups resolve a bank id without loading the bank.
//
// Values are the bank row's raw fields (non-string subtopic/section stored as ""); each
// caller applies its own trim / case rule exactly as it did over the bank.
// bankChapters.guard.test.ts proves the artifact is what the generator derives from
// canonicalQuestionBank right now, byte for byte.

import {
  BANK_ID_INDEX_ROWS,
  BANK_ID_INDEX_SECTIONS,
  BANK_ID_INDEX_SUBTOPICS,
  BANK_ID_INDEX_TOPIC_KEYS,
} from "./bankIdIndex.generated";

export interface BankRowMeta {
  topicKey: string;
  subtopic: string;
  section: string;
}

let _byId: Map<string, BankRowMeta> | null = null;

function byId(): Map<string, BankRowMeta> {
  if (!_byId) {
    const map = new Map<string, BankRowMeta>();
    for (const [id, t, s, c] of BANK_ID_INDEX_ROWS) {
      map.set(id, {
        topicKey: BANK_ID_INDEX_TOPIC_KEYS[t],
        subtopic: BANK_ID_INDEX_SUBTOPICS[s],
        section: BANK_ID_INDEX_SECTIONS[c],
      });
    }
    _byId = map;
  }
  return _byId;
}

/** The served bank row's tags for `id`, or null when the id is not a served bank row. */
export function bankRowMeta(id: string | null | undefined): BankRowMeta | null {
  const key = String(id ?? "");
  if (!key) return null;
  return byId().get(key) ?? null;
}

/** Every served bank id with its tags, in aggregator order. */
export function* bankIndexEntries(): Generator<[string, BankRowMeta]> {
  for (const entry of byId()) yield entry;
}
