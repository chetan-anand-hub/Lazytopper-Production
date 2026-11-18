/**
 * PaidCrossSell - PAID-XSELL-1 (owner ruling 19 Nov 2026). "Goes well with what you just bought" inside the "Payment received"
 * pop-up (PaidSheet), below the who-card. Up to three compact cards, best first (paidCrossSellModel). Lives in its own lazy chunk
 * (PaidCrossSellLazy), which loads only once the pop-up itself is open - never on first paint.
 *
 * Ownership is the SERVER's (`/api/packs/mine`, read once per pop-up) and the app's shared paid-Premium hydration (this device's
 * cached record, never a write). Until the owned list has loaded nothing is drawn; a failed read draws nothing (when unsure, never
 * sell). Each button leaves the pop-up for an EXISTING buy entry (a fixed internal path); no payment code lives here.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";

import { sendAnalyticsHit } from "../../analytics/analytics";
import { useAuth } from "../../context/AuthContext";
import { isPaymentsClientEnabled } from "../../services/checkout";
import { fetchMyPacks, isPacksClientEnabled, isTestSeriesPackOffered, type MyPacks } from "../../services/packs";
import { isPaidPremium, loadSubscription, onSubscriptionHydrated, type SubscriptionStatus } from "../../services/subscriptionService";
import { PAID_XSELL_HEADING, pickPaidCrossSell, type BoughtKind, type CrossSellItem } from "./paidCrossSellModel";
import "./paidCrossSell.css";

export interface PaidCrossSellProps {
  bought: BoughtKind | null;
  /** Which page opened the pop-up (analytics only). */
  surface: string;
  /** The host already shows the CBQ Packs offer below (the pass host's PassOwnerOffer): the CBQ card is not repeated. */
  hostOffersCbq?: boolean;
  /** Close the pop-up before leaving for a buy entry. */
  onLeave: () => void;
}

function useOptionalUid(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user } = useAuth();
    return user && !user.isLocalSession ? user.uid : "";
  } catch {
    return "";
  }
}

/** Paid Premium for this uid: true / false once KNOWN, null while not (same "known" rule as PackPromoCard's useKnownStatus). */
function usePaidPremiumKnown(uid: string): boolean | null {
  const [status, setStatus] = useState<SubscriptionStatus | null>(() => (uid ? safeLoad(uid) : null));
  const [heard, setHeard] = useState(false);
  useEffect(() => {
    setStatus(uid ? safeLoad(uid) : null);
    setHeard(false);
    if (!uid) return undefined;
    return onSubscriptionHydrated((u, cloud) => {
      if (u === uid) {
        setStatus(cloud);
        setHeard(true);
      }
    });
  }, [uid]);
  if (!status) return null;
  // An empty default cache could still be a paid student not hydrated yet: unknown until the cloud answers.
  const known = heard || status.tier !== "free" || Boolean(status.trialStartDate);
  return known ? isPaidPremium(status) : null;
}
function safeLoad(uid: string): SubscriptionStatus | null {
  try {
    return loadSubscription(uid);
  } catch {
    return null;
  }
}

type MineState = { phase: "loading" } | { phase: "error" } | { phase: "ready"; mine: MyPacks };

function useMine(uid: string, enabled: boolean): MineState {
  const [state, setState] = useState<MineState>({ phase: "loading" });
  useEffect(() => {
    setState({ phase: "loading" });
    if (!uid || !enabled) return undefined;
    let live = true;
    fetchMyPacks().then(
      (mine) => live && setState({ phase: "ready", mine }),
      () => live && setState({ phase: "error" }),
    );
    return () => {
      live = false;
    };
  }, [uid, enabled]);
  return state;
}

function send(name: "paid_xsell_view" | "paid_xsell_tap", data: Record<string, string>): void {
  try {
    sendAnalyticsHit("event", { name, data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

/** Leaves through the router when there is one, else a full navigation (the paths are fixed internal constants). */
function useGo(): (href: string) => void {
  const inRouter = useInRouterContext();
  return inRouter ? RoutedGo() : (href: string) => window.location.assign(href);
}
function RoutedGo(): (href: string) => void {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = useNavigate();
  return (href: string) => navigate(href);
}

export default function PaidCrossSell({ bought, surface, hostOffersCbq = false, onLeave }: PaidCrossSellProps) {
  const uid = useOptionalUid();
  const packsOn = isPacksClientEnabled();
  const mine = useMine(uid, Boolean(bought) && packsOn);
  const paidPremium = usePaidPremiumKnown(uid);
  const go = useGo();

  const items: CrossSellItem[] = useMemo(() => {
    if (!bought || mine.phase !== "ready") return [];
    const all = pickPaidCrossSell({
      bought,
      packs: mine.mine.packs,
      ...(mine.mine.ownsTestSeries ? { ownsTestSeriesFlag: true } : {}),
      // The pass host's own payment is server-verified: a pass buyer is paid whatever the cache says.
      paidPremium: bought === "pass" ? true : paidPremium,
      credit: mine.mine.boardPassCredit,
      packsOn,
      tsOffered: isTestSeriesPackOffered(),
      paymentsOn: isPaymentsClientEnabled(),
      now: Date.now(),
    });
    return hostOffersCbq ? all.filter((x) => x.id !== "cbq_packs") : all;
  }, [bought, mine, paidPremium, packsOn, hostOffersCbq]);

  const viewed = useRef(false);
  const ids = items.map((x) => x.id).join(",");
  useEffect(() => {
    if (!ids || viewed.current) return;
    viewed.current = true;
    send("paid_xsell_view", { surface, items: ids });
  }, [ids, surface]);

  if (items.length === 0) return null;

  return (
    <section className="lt-pxs" aria-labelledby="lt-pxs-h" data-testid="paid-xsell">
      <h3 className="lt-pxs__h" id="lt-pxs-h">{PAID_XSELL_HEADING}</h3>
      <ul className="lt-pxs__list">
        {items.map((item) => (
          <li key={item.id} className="lt-pxs__card" data-testid={`paid-xsell-${item.id}`}>
            <div className="lt-pxs__text">
              <p className="lt-pxs__title">{item.title}</p>
              <p className="lt-pxs__benefit">{item.benefit}</p>
              <p className="lt-pxs__price" data-testid={`paid-xsell-price-${item.id}`}>{item.price}</p>
            </div>
            <button
              type="button"
              className="lt-pxs__btn"
              data-testid={`paid-xsell-tap-${item.id}`}
              onClick={() => {
                send("paid_xsell_tap", { surface, item: item.id });
                onLeave();
                go(item.href);
              }}
            >
              {item.cta}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
