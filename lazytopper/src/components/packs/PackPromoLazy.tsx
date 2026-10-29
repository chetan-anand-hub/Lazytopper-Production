import { lazy, Suspense } from "react";

import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import type { PackPromoSurface } from "./PackPromoCard";

const PackPromoCard = lazy(() => import("./PackPromoCard"));

/** The ONE mount point: flag off renders and loads nothing; the card itself is a separate lazy chunk. */
export default function PackPromo({ surface }: { surface: PackPromoSurface }) {
  return isPacksEntryEnabled() ? (
    <Suspense fallback={null}>
      <PackPromoCard surface={surface} />
    </Suspense>
  ) : null;
}
