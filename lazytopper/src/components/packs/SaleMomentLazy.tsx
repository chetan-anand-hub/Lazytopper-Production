import { lazy, Suspense } from "react";

import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import type { SaleMomentLineProps } from "./SaleMomentLine";

const SaleMomentLine = lazy(() => import("./SaleMomentLine"));

/** The ONE mount point for the buying line (SALE-MOMENT-1): flag off renders and loads nothing; the line is its own lazy chunk. */
export default function SaleMoment(props: SaleMomentLineProps) {
  return isPacksEntryEnabled() ? (
    <Suspense fallback={null}>
      <SaleMomentLine {...props} />
    </Suspense>
  ) : null;
}
