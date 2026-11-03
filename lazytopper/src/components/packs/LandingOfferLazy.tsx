import { lazy, Suspense } from "react";

import type { LandingOfferVariant } from "./LandingOfferCard";

const LandingOfferCard = lazy(() => import("./LandingOfferCard"));

/** AD-LANDING-OFFER-1 - the ONE mount point; the card (and its pricing / guide reads) is its own lazy chunk (PERF-3). */
export default function LandingOffer({ variant }: { variant: LandingOfferVariant }) {
  return (
    <Suspense fallback={null}>
      <LandingOfferCard variant={variant} />
    </Suspense>
  );
}
