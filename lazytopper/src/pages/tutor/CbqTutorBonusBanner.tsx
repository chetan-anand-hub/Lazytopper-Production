/**
 * CbqTutorBonusBanner - CBQ-TUTOR-TASTE-1. A student who has paid for a CBQ Pack and is not Premium gets 3 tutor
 * questions in total; this is the small honest line that says how many are left.
 *
 * ★ DISPLAY ONLY. The count comes from the server (GET /api/packs/mine, then each tutor reply) and is held in
 * memory; nothing is stored or decided here. Premium and trial students never see it, a student without a CBQ
 * Pack never sees it, and at 0 left it renders nothing so the normal Premium card (Board Pass offer, Ask a
 * parent) is the only thing on screen.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  cbqTutorBonusLine,
  getCbqTutorBonus,
  markCbqTutorBonusAsked,
  setCbqTutorBonus,
  subscribeCbqTutorBonus,
  wasCbqTutorBonusAsked,
} from "../../ai/cbqTutorBonus";

export default function CbqTutorBonusBanner() {
  const { user } = useAuth();
  const { isPremium, hydrated } = useSubscription();
  const uid = user?.uid || "";
  const [, bump] = useState(0);

  useEffect(() => subscribeCbqTutorBonus(() => bump((n) => n + 1)), []);

  // One read per page, only for a signed-in student we know is not Premium. A failed read shows nothing.
  useEffect(() => {
    if (!uid || !hydrated || isPremium || wasCbqTutorBonusAsked(uid)) return;
    markCbqTutorBonusAsked(uid);
    void (async () => {
      try {
        const { fetchMyPacks } = await import("../../services/packs");
        const mine = await fetchMyPacks();
        if (mine.tutorTaste) setCbqTutorBonus({ uid, left: mine.tutorTaste.left, limit: mine.tutorTaste.limit });
      } catch {
        /* unknown is not shown */
      }
    })();
  }, [uid, hydrated, isPremium]);

  if (!uid || isPremium) return null;
  const bonus = getCbqTutorBonus(uid);
  const line = bonus ? cbqTutorBonusLine(bonus.left, bonus.limit) : null;
  if (!line) return null;
  return (
    <p className="lt-tutor__bonus" role="status" data-testid="tutor-cbq-bonus">
      {line}
    </p>
  );
}
