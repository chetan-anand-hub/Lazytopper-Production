import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { isPaidPremium } from "../../services/subscriptionService";
import { fetchMyPacks } from "../../services/packs";
import { isCc27ClientEnabled } from "../../config/crashCourse";
import Cc27Rows from "./Cc27Rows";

/**
 * CC27-SITE-1 - the bonus download rows on the Board Pass / Test Series page, for HOLDERS only (same Cc27Rows as My packs).
 * It reads the server's own list (GET /api/packs/mine `cc27`), so the ladder is decided once, on the server. Renders nothing while
 * loading, signed out, not a holder, or when the read fails: the static prerender never contains it.
 *   holder="pass"   -> a paid Board Pass
 *   holder="series" -> the Test Series Pack (the server says so) or a paid Board Pass
 */
export default function Cc27HolderSection({ holder }: { holder: "pass" | "series" }) {
  const { user } = useAuth();
  const subscription = useSubscription();
  const paid = Boolean(user) && subscription.hydrated && isPaidPremium(subscription.status);
  const [keys, setKeys] = useState<string[] | null>(null);
  const [series, setSeries] = useState(false);
  const uid = user?.uid ?? "";
  useEffect(() => {
    if (!uid || !isCc27ClientEnabled()) return;
    let live = true;
    fetchMyPacks()
      .then((m) => {
        if (!live) return;
        setKeys(m.cc27 ?? []);
        setSeries(m.ownsTestSeries === true);
      })
      .catch(() => {
        if (live) setKeys(null);
      });
    return () => {
      live = false;
    };
  }, [uid]);
  const holds = holder === "pass" ? paid : paid || series;
  if (!holds || !keys) return null;
  return <Cc27Rows keys={keys} />;
}
