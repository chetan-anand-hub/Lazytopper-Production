/**
 * PassOwnerOffer - PASS-OWNER-PACKS-1. ONE quiet pack offer for a Board Pass owner, at one of four fixed places (see
 * passOwnerOffersModel). Lives in its own lazy chunk (PassOwnerOfferLazy), never the entry.
 *
 * Shown only when ALL hold: packs are on; a signed-in (cloud) student; a paid Premium record (`isPaidPremium`, from this device's
 * cached record and the app's shared hydration - never a write, never a grant) OR the host's own server-verified Board Pass success
 * (`assumePaid`, the payment-success screen, where the cache has not caught up yet); no "Not now" in the last day; the SERVER's
 * owned-pack list has loaded (loading / failed -> nothing, "when unsure, never sell") and the offer is not already owned.
 *
 * A Buy tap sends `pack_checkout` (from = the placement) and opens the EXISTING central pack buy path: /packs?buy=<sku>&t=<target>
 * (PacksShop's sign-in-resume contract), which opens that pack's pop-up and its checkout - the shared "Who will use it?" sheet with
 * "For: you" + one-tap Pay while that is on. Prices are the pack constants; the server charges its own amount.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { trackPackCheckout, trackPackEvent } from "../../lib/packs/packAnalytics";
import { packChapterLabel } from "../../lib/packs/packLabels";
import { PACK_PRICE_INR, isPacksClientEnabled, packDescription } from "../../services/packs";
import { isPaidPremium, loadSubscription, onSubscriptionHydrated } from "../../services/subscriptionService";
import { useOwnedPacks } from "../packs/useOwnedPacks";
import {
  NOT_NOW_LABEL,
  passOffersSnoozed,
  passOfferBuyHref,
  pickPassOwnerOffer,
  snoozePassOffers,
  type PassOfferHint,
  type PassOfferItem,
  type PassOfferPlacement,
} from "./passOwnerOffersModel";
import "./passOwnerOffer.css";

export interface PassOwnerOfferProps {
  placement: PassOfferPlacement;
  hint?: PassOfferHint;
  /** The host has a SERVER-verified Board Pass payment in hand (the success screen). Only ever widens WHO sees an offer. */
  assumePaid?: boolean;
}

/** The signed-in cloud uid, or "" (signed out, a local session, or no AuthProvider at all). */
function useOptionalUid(): string {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user } = useAuth();
    return user && !user.isLocalSession ? user.uid : "";
  } catch {
    return "";
  }
}

/** Paid Premium for this uid, from the cached record and the shared hydration (no Firestore read of its own). */
function usePaidFor(uid: string): boolean {
  const read = (u: string): boolean => {
    if (!u) return false;
    try {
      return isPaidPremium(loadSubscription(u));
    } catch {
      return false;
    }
  };
  const [paid, setPaid] = useState<boolean>(() => read(uid));
  useEffect(() => {
    setPaid(read(uid));
    if (!uid) return undefined;
    return onSubscriptionHydrated((u, status) => {
      if (u === uid) setPaid(isPaidPremium(status));
    });
  }, [uid]);
  return !!uid && paid;
}

export default function PassOwnerOffer({ placement, hint = {}, assumePaid = false }: PassOwnerOfferProps) {
  const navigate = useNavigate();
  const uid = useOptionalUid();
  const paid = usePaidFor(uid);
  const [snoozed, setSnoozed] = useState<boolean>(() => passOffersSnoozed(Date.now()));
  const eligible = isPacksClientEnabled() && !!uid && (paid || assumePaid) && !snoozed;
  const owned = useOwnedPacks(uid, eligible);
  const offer = eligible && owned.phase === "ready" ? pickPassOwnerOffer(placement, hint, owned.packs) : null;

  // One `pack_view` per mount, when an offer is actually on screen.
  const viewed = useRef(false);
  const firstSku = offer?.items[0]?.sku;
  useEffect(() => {
    if (!firstSku || viewed.current) return;
    viewed.current = true;
    trackPackEvent("pack_view", firstSku, placement);
  }, [firstSku, placement]);

  if (!offer) return null;

  function buy(item: PassOfferItem) {
    const chapterName = item.sku === "pack_chapter" && item.target ? packChapterLabel(item.target) : undefined;
    trackPackCheckout(
      { sku: item.sku, itemName: packDescription(item.sku, item.target, chapterName), valueInr: PACK_PRICE_INR[item.sku] },
      { signedIn: true, from: placement },
    );
    navigate(passOfferBuyHref(item));
  }

  return (
    <aside className={`lt-po lt-po--${placement}`} aria-label="Printed practice packs" data-testid={`pass-offer-${placement}`}>
      <p className="lt-po__lead">{offer.lead}</p>
      <div className="lt-po__row">
        {offer.items.map((item) => (
          <button
            key={`${item.sku}:${item.target ?? "all"}`}
            type="button"
            className="lt-po__buy"
            onClick={() => buy(item)}
            data-testid={`pass-offer-buy-${item.sku}${item.target ? `-${item.target}` : ""}`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="lt-po__later"
          onClick={() => {
            snoozePassOffers(Date.now());
            setSnoozed(true);
          }}
          data-testid="pass-offer-not-now"
        >
          {NOT_NOW_LABEL}
        </button>
      </div>
    </aside>
  );
}
