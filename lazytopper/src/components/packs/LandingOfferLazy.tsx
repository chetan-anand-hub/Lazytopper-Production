import { lazy, Suspense, useEffect } from "react";

import { useAuth } from "../../context/AuthContext";
import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import { likelySignedIn, writeSignedInHint } from "../browse/signedInHint";
import type { LandingOfferVariant } from "./LandingOfferCard";
import "./LandingOfferSlot.css";

const loadCard = () => import("./LandingOfferCard");
const LandingOfferCard = lazy(loadCard);

/**
 * What the card is going to do, decided with the SAME rules as LandingOfferCard's `visible` so a held slot is never left empty:
 *   "none" - the card will not render (signed in, packs off for the CBQ variant, not a ?cbq=1 arrival): nothing is held.
 *   "hold" - auth is still loading for a visitor who is probably signed out: hold the space and start the chunk.
 *   "show" - signed out: the card renders as soon as its chunk lands; the Suspense fallback holds its space until then.
 * The CBQ variant holds only for the literal ?cbq=1 ad landing (the guide-intent arrival keeps today's behaviour, no slot).
 */
function offerState(variant: LandingOfferVariant, auth: { user: { isLocalSession?: boolean } | null; loading: boolean } | null): "none" | "hold" | "show" {
  try {
    if (!auth) return "none";
    if (variant === "practice-cbq") {
      if (!isPacksEntryEnabled()) return "none";
      if (new URLSearchParams(window.location.search).get("cbq") !== "1") return "none";
    }
    if (auth.loading) return likelySignedIn() ? "none" : "hold";
    return !auth.user || Boolean(auth.user.isLocalSession) ? "show" : "none";
  } catch {
    return "none";
  }
}

function useAuthOrNull() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAuth();
  } catch {
    return null; // rendered outside AuthProvider (tests): behave as before, no slot
  }
}

/** AD-LANDING-OFFER-1 - the ONE mount point; the card (and its pricing / guide reads) is its own lazy chunk (PERF-3). */
export default function LandingOffer({ variant }: { variant: LandingOfferVariant }) {
  const auth = useAuthOrNull();
  const state = offerState(variant, auth);
  const settled = auth !== null && !auth.loading;
  const signedIn = Boolean(auth?.user);
  useEffect(() => {
    // The same device hint /browse keeps ("signed in last time"): lets a returning student's page hold nothing while auth loads.
    if (settled) writeSignedInHint(signedIn);
  }, [settled, signedIn]);
  useEffect(() => {
    if (state === "hold") void loadCard().catch(() => undefined);
  }, [state]);
  const slot = <div className={`lt-lo-slot lt-lo-slot--${variant === "check" ? "check" : "cbq"}`} aria-hidden="true" data-testid="landing-offer-slot" />;
  if (state === "hold") return slot;
  return (
    <Suspense fallback={state === "show" ? slot : null}>
      <LandingOfferCard variant={variant} />
    </Suspense>
  );
}
