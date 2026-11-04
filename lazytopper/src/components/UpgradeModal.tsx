import { useSubscription } from "../hooks/useSubscription";
import { lazySheet } from "../lib/lazySheet";
import type { UpgradeModalProps } from "./UpgradeModalSheet";

/**
 * UpgradeModal — the slot (PERF-TRIM-1). Same name, props and call sites as before; the modal's
 * body lives in UpgradeModalSheet.tsx and is fetched on first open, so it and its imports stay
 * out of the entry chunk (PERF-3 budget). `useSubscription()` is still called on every mount,
 * open or closed, exactly as the modal did before the split (same hydration read and listeners),
 * and its result is handed to the sheet. Type-only import above: the sheet is never statically
 * imported.
 */
const UpgradeModalSheet = lazySheet(() => import("./UpgradeModalSheet"));

export type { UpgradeModalProps };

export function UpgradeModal({ open, onClose, featureLabel }: UpgradeModalProps) {
  const subscription = useSubscription();
  if (!open) return null;
  return (
    <UpgradeModalSheet
      open={open}
      onClose={onClose}
      featureLabel={featureLabel}
      subscription={subscription}
      onFailed={onClose}
    />
  );
}
