/**
 * GST-INVOICE-1 (review D4) - "State: Karnataka · Change", shown just above Pay for a SIGNED-IN buyer whose state is
 * already on record, so a remembered state is never applied silently. No tap is added: Pay uses the state shown;
 * "Change" opens the same "Your state" dialog and the new choice is used for this page's order.
 * With VITE_GST_STATE_FIELD off it renders nothing and loads nothing (no hook runs, no chunk, no request).
 */
import { lazy, Suspense } from "react";
import { gstStateFieldOn } from "../../services/gstBuyerOrder";

const Inner = lazy(() => import("./GstStateLineInner"));

export default function GstStateLine() {
  if (!gstStateFieldOn()) return null;
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
