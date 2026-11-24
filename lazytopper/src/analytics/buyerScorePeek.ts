import { ORDER_SOURCE_KEY, VISIT_SOURCE_KEY, parseStored, readLongKeep, sanitiseStored, type VisitSource } from "./visitSource";
import { applyExpiry, loadLocal } from "../services/subscriptionService";

/**
 * BUYER-SCORE-1 - the two read-only peeks the buyer score needs. They live HERE, in the lazily loaded buyer-score chunk, and not
 * in visitSource.ts / subscriptionService.ts (entry chunk), so the entry chunk stays inside its PERF-3 budget.
 */

/** The stored first touch (tab copy, else the 7-day tagged copy), re-cleaned. Writes nothing; readLongKeep may remove an EXPIRED 7-day key. Ignores the order-source kill switch. */
export function storedVisitSourceForScore(): VisitSource | null {
  try {
    for (const key of [ORDER_SOURCE_KEY, VISIT_SOURCE_KEY]) {
      const v = sanitiseStored(parseStored(window.sessionStorage.getItem(key)));
      if (v) return v;
    }
    return readLongKeep();
  } catch {
    return null;
  }
}

/** Strictly READ-ONLY "is the cached status a paid pass right now?" No save, no Firestore, no SDK load; never writes a downgrade back. */
export function peekPaidPremium(uid: string): boolean {
  const l = loadLocal(uid);
  return !!l && applyExpiry(l).tier === "premium";
}
