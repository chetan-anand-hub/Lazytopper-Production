import { useEffect, useState } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import { boardPassGstExclusive, displayPlusGst } from "../../config/pricing";

import { sendAnalyticsHit } from "../../analytics/analytics";
import { useAuth } from "../../context/AuthContext";
import { PACK_PRICE_INR } from "../../services/packs";
import { loadSubscription, onSubscriptionHydrated, type SubscriptionStatus } from "../../services/subscriptionService";
import { showPackLine } from "../limits/packLine";
import "./PackPromoCard.css";

/**
 * PackPromoCard - PACKS-VISIBLE-1. A clear card (not a link) for the printable PDF packs, mounted lazily
 * below the primary action on the practice hub, Quick Practice results, Home and /check-improve. The Board
 * Pass stays the first offer; this is the cheaper, less capable second option. Display only.
 */

export type PackPromoSurface = "practice_hub" | "quick_practice" | "home" | "check_improve";

/** Visible to a signed-out visitor and to a KNOWN non-paid student; never to paid Premium; nothing while unknown. */
export function showPackPromo(uid: string, status: Pick<SubscriptionStatus, "tier"> | null | undefined, known: boolean): boolean {
  if (!uid) return true;
  return showPackLine(status, known);
}

/** The chips, from the catalogue at runtime. The CBQ chip only exists when a `pack_cbq` SKU does. */
export function promoChips(prices: Readonly<Record<string, number>>): string[] {
  const values = Object.values(prices).filter((n) => Number.isFinite(n) && n > 0);
  const chips = ["Chapter tests & mock papers"];
  // GST-EXCL-1: "₹199 + GST" from 00:00 IST 5 Nov 2026 (read at render); before it, unchanged.
  const tag = (n: number): string => (boardPassGstExclusive(Date.now()) ? displayPlusGst(n) : `₹${n}`);
  if (typeof prices.pack_cbq === "number" && prices.pack_cbq > 0) chips.push(`Board CBQ Pack ${tag(prices.pack_cbq)}`);
  if (values.length > 0) chips.push(`From ${tag(Math.min(...values))}`);
  return chips;
}

export function useOptionalUid(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user } = useAuth();
    return user && !user.isLocalSession ? user.uid : "";
  } catch {
    return "";
  }
}

/** This device's cached record, then the app's shared hydration; no Firestore read of its own. */
export function useKnownStatus(uid: string): [SubscriptionStatus | null, boolean] {
  const [status, setStatus] = useState<SubscriptionStatus | null>(() => (uid ? loadSubscription(uid) : null));
  const [heard, setHeard] = useState(false);
  useEffect(() => {
    setStatus(uid ? loadSubscription(uid) : null);
    setHeard(false);
    if (!uid) return undefined;
    return onSubscriptionHydrated((hydratedFor, cloud) => {
      if (hydratedFor === uid) {
        setStatus(cloud);
        setHeard(true);
      }
    });
  }, [uid]);
  // An empty default cache could still be a paid student not hydrated yet: wait for the cloud (no flash).
  const known = Boolean(status) && (heard || status!.tier !== "free" || Boolean(status!.trialStartDate));
  return [status, known];
}

/**
 * Where "See the packs →" goes: /pricing#packs on every surface (LINKS-1, owner ruling 29 Oct 2026: every price link leads to the
 * one pricing page; it was /packs on the two ad landings).
 */
export function promoHref(_surface: PackPromoSurface): string {
  // LINKS-1: one destination for "See the packs" on every surface (the pricing page's packs strip).
  return "/pricing#packs";
}

export default function PackPromoCard({ surface }: { surface: PackPromoSurface }) {
  const uid = useOptionalUid();
  const [status, known] = useKnownStatus(uid);
  const inRouter = useInRouterContext();
  if (!showPackPromo(uid, status, known)) return null;
  const onTap = () => {
    try {
      sendAnalyticsHit("event", { name: "pack_entry_click", data: { from: `promo_${surface}` } });
    } catch {
      /* analytics must never break the page */
    }
  };
  const chips = promoChips(PACK_PRICE_INR);
  return (
    <section className="lt-pp" data-testid="pack-promo-card" data-surface={surface} aria-label="Printable board PDF packs">
      <h3 className="lt-pp__title">Printable board PDF packs</h3>
      <p className="lt-pp__sub">Important questions with CBSE step-marking keys, plus CBQs for the competency half of the paper. A cheaper step before the Board Pass.</p>
      <ul className="lt-pp__chips">
        {chips.map((c) => (
          <li key={c} className="lt-pp__chip">{c}</li>
        ))}
      </ul>
      {inRouter ? (
        <Link className="lt-pp__btn" to={promoHref(surface)} onClick={onTap} data-testid="pack-promo-cta">See the packs {"→"}</Link>
      ) : (
        <a className="lt-pp__btn" href={promoHref(surface)} onClick={onTap} data-testid="pack-promo-cta">See the packs {"→"}</a>
      )}
    </section>
  );
}
