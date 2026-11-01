// CBQ-TUTOR-TASTE-1 - the CBQ Pack buyer's 3 tutor questions, as the browser sees them.
//
// ★ DISPLAY ONLY. The server decides ownership and the count (entitlement.cjs + cbqTutorTaste.cjs) and sends the
//   remaining number on GET /api/packs/mine and on each tutor reply. Nothing here grants, counts or stores
//   anything: the value is held in memory for the life of the page (never localStorage) and the 402 lock at 0 is
//   the SERVER's answer. A page that never hears from the server shows nothing.

import { sendAnalyticsHit } from "../analytics/analytics";

export const CBQ_TUTOR_BONUS_LIMIT = 3;

export interface CbqTutorBonus {
  uid: string;
  left: number;
  limit: number;
}

let current: CbqTutorBonus | null = null;
let askedUid: string | null = null;
const listeners = new Set<() => void>();

function whole(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

/** The wire object `{ used, left, limit }` -> a sane { left, limit }, or null. PURE. */
export function readCbqTutorBonus(raw: unknown): { left: number; limit: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { left?: unknown; limit?: unknown };
  const left = whole(r.left);
  const limit = whole(r.limit) ?? CBQ_TUTOR_BONUS_LIMIT;
  if (left === null || limit < 1) return null;
  return { left: Math.min(left, limit), limit };
}

/** "CBQ Pack bonus: 2 of 3 tutor questions left"; null when none are left (the Premium lock shows instead). */
export function cbqTutorBonusLine(left: number, limit: number = CBQ_TUTOR_BONUS_LIMIT): string | null {
  if (!(left > 0)) return null;
  return `CBQ Pack bonus: ${left} of ${limit} tutor questions left`;
}

export function setCbqTutorBonus(next: CbqTutorBonus | null): void {
  current = next;
  listeners.forEach((fn) => fn());
}

export function getCbqTutorBonus(uid: string): CbqTutorBonus | null {
  return current && current.uid === uid ? current : null;
}

/** True once the server has been asked for this student on this page load (so a non-owner costs one request, not one per visit). */
export function wasCbqTutorBonusAsked(uid: string): boolean {
  return askedUid === uid;
}

export function markCbqTutorBonusAsked(uid: string): void {
  askedUid = uid;
}

export function subscribeCbqTutorBonus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** A tutor reply (or the 402 lock) carried the server's remaining count. Fires the name-only event once per spent question. */
export function noteCbqTutorBonusFromServer(uid: string, raw: unknown, spent: boolean): void {
  const b = readCbqTutorBonus(raw);
  if (!uid || !b) return;
  setCbqTutorBonus({ uid, left: b.left, limit: b.limit });
  if (spent) {
    try {
      sendAnalyticsHit("event", { name: "cbq_tutor_bonus_used", data: { left: b.left } });
    } catch {
      /* analytics never blocks the tutor */
    }
  }
}

export function resetCbqTutorBonusForTests(): void {
  current = null;
  askedUid = null;
  listeners.clear();
}
