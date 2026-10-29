// src/pages/tutor/tutorReturnMeta.ts
//
// TUTOR-MIND-1 (A) — the question context of a "return-result" opener survives a reload.
//
// The opener turn is persisted with the thread, but the question text the model was handed
// (`returnedWork`) lived only in an in-memory ref, so a reopened thread answered "I don't have the
// text of Q1". The opener now carries a small `meta` — the OUR-bank question id and, for a tap
// answer, the option text and whether it was right — and a reopened thread rebuilds `returnedWork`
// from that id through the same bank lookup. Ids and option text come from our bank, never free
// student text; every length is bounded. Pure helpers only; no store, no write.

import type { TutorReturnedWork, TutorTurn, TutorTurnMeta } from "../../ai/tutorClient";

export const MAX_META_Q = 120;
export const MAX_META_PICK = 200;

/** A bounded meta for an opener about bank question `q`, or undefined when there is no id. */
export function returnMetaOf(
  q: string | null | undefined,
  pick?: string | null,
  correct?: boolean | null,
): TutorTurnMeta | undefined {
  const id = String(q ?? "").trim().slice(0, MAX_META_Q);
  if (!id) return undefined;
  const p = String(pick ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_META_PICK);
  // A pick is stored only WITH its verdict; a pick whose verdict is unknown is stored as neither.
  return { q: id, ...(p && typeof correct === "boolean" ? { pick: p, correct } : {}) };
}

/** The meta of the NEWEST return-result turn, or null if that turn carries none (a newer opener
 *  without a question — e.g. a Check & Improve return — means the older question is stale). */
export function latestReturnMeta(messages: readonly TutorTurn[]): TutorTurnMeta | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.kind !== "return-result") continue;
    return m.meta && typeof m.meta.q === "string" && m.meta.q ? m.meta : null;
  }
  return null;
}

/** The opener turn as persisted: the text, the kind, and (when known) the question meta. */
export function returnResultTurn(text: string, meta?: TutorTurnMeta): TutorTurn {
  return { role: "tutor", content: text, kind: "return-result", ...(meta ? { meta } : {}) };
}

/** The returnedWork a restored thread hands the model: the bank question plus the stored tap, flagged
 *  `restored` so the prompt calls it an earlier marked question, never one "just" marked. */
export function restoredReturnedWork(base: TutorReturnedWork | null, meta: TutorTurnMeta): TutorReturnedWork | null {
  if (!base) return null;
  return {
    ...base,
    restored: true,
    ...(meta.pick && typeof meta.correct === "boolean" ? { pick: meta.pick, pickCorrect: meta.correct } : {}),
  };
}
