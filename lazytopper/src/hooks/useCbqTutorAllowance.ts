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

export type CbqTutorAllowance = "idle" | "loading" | "allowed" | "denied";

/** `enabled` is false for Premium/trial students, signed-out visitors and every non-tutor gate: no request is made. */
export function useCbqTutorAllowance(uid: string, enabled: boolean): CbqTutorAllowance {
  const [result, setResult] = useState<{ uid: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (!enabled || !uid) return;
    let cancelled = false;
    void (async () => {
      let allowed = false;
      try {
        const { fetchMyPacks } = await import("../services/packs");
        const mine = await fetchMyPacks();
        const taste = mine.tutorTaste;
        if (taste) {
          allowed = taste.left > 0;
          // Seed the banner's in-memory store so it does not ask the server a second time.
          markCbqTutorBonusAsked(uid);
          setCbqTutorBonus({ uid, left: taste.left, limit: taste.limit });
        }
      } catch {
        allowed = false;
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
