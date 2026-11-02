/**
 * CBQ-TUTOR-GATE-1 - does a non-Premium student get through the tutor's Premium gate on a CBQ Pack bonus?
 *
 * ★ SERVER TRUTH ONLY. Ownership and the remaining count come from GET /api/packs/mine (`tutorTaste`, present
 * only for an owner of `pack_cbq`; see server/routes/packs.cjs). Nothing is stored in the browser, and the
 * server still enforces the count on /api/tutor, so this only decides whether the page is SHOWN.
 * A failed or empty read is "denied" (the ordinary lock), never "allowed".
 */
import { useEffect, useState } from "react";
import { markCbqTutorBonusAsked, setCbqTutorBonus } from "../ai/cbqTutorBonus";

/** How long the tutor gate waits on the server / on subscription hydration before showing the ordinary lock. */
export const CBQ_GATE_WAIT_MS = 7000;

export type CbqTutorAllowance = "idle" | "loading" | "allowed" | "denied";

/** `enabled` is false for Premium/trial students, signed-out visitors and every non-tutor gate: no request is made. */
export function useCbqTutorAllowance(uid: string, enabled: boolean): CbqTutorAllowance {
  const [result, setResult] = useState<{ uid: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (!enabled || !uid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      let allowed = false;
      try {
        const { fetchMyPacks } = await import("../services/packs");
        // A stalled read must not hold the student on "Checking" forever: past the bound it is the ordinary lock.
        const timeout = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), CBQ_GATE_WAIT_MS);
        });
        const mine = await Promise.race([fetchMyPacks(), timeout]);
        const taste = mine ? mine.tutorTaste : undefined;
        if (taste) {
          allowed = taste.left > 0;
          if (!cancelled) {
            // Seed the banner's in-memory store so it does not ask the server a second time.
            markCbqTutorBonusAsked(uid);
            setCbqTutorBonus({ uid, left: taste.left, limit: taste.limit });
          }
        }
      } catch {
        allowed = false;
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (!cancelled) setResult({ uid, allowed });
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, enabled]);

  if (!enabled || !uid) return "idle";
  if (!result || result.uid !== uid) return "loading";
  return result.allowed ? "allowed" : "denied";
}
