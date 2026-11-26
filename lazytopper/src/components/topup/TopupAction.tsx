/**
 * TopupAction - TOPUP-GO-1. The button a host drops where a Board Pass holder reaches a fair-use cap ("Top up to keep going") or in
 * Settings > Your limits ("Buy extra usage"). It opens TopupSheet, which is a LAZY chunk: this file is only the switch and the button.
 *
 * ★ DARK. Renders nothing (null, no wrapper) unless VITE_TOPUP_ENABLED and payments are on - the host is then byte-identical to before.
 * ★ The host must pass this only for a student the SERVER called Premium (a refusal's `tier`, the usage snapshot's `tier`); a trial or
 *   free student never sees it and the server would answer 403 anyway.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { fetchUsageMe } from "../../services/usageClient";
import { importWithRetry } from "../../lib/lazyWithRetry";
import { isTopupClientEnabled, TOPUP_ACTION_LIMIT, TOPUP_ACTION_MENU, TOPUP_ACTION_WARN } from "../../config/topup";
import type { TopupSheetProps } from "./TopupSheet";

const TopupSheetLazy = lazy(() =>
  importWithRetry<{ default: React.ComponentType<TopupSheetProps> }>(() => import("./TopupSheet")).catch(() => ({
    default: () => null,
  })),
);

export interface TopupActionProps {
  /** "limit": the fair-use message ("Top up to keep going"); "warn": the 90% banner ("Add extra usage"); "menu": Settings ("Buy extra usage"). */
  where: "limit" | "menu" | "warn";
  className?: string;
  /** When given, the button sits in a div of this class - drawn only while top-ups are on, so a dark host gains no node. */
  wrapperClassName?: string;
  onToppedUp?: () => void;
  /**
   * The host only knows the refusal's MAPPED tier (a 429 usage_limit reads "premium" even for a free Test Series owner), but the server
   * sells a top-up only to a real Board Pass subscription (403 otherwise). With this on, the button shows only once /api/usage/me
   * (the source UsageCard and UsageWarning use) says tier "premium". Reads nothing while the switch is off.
   */
  requireSnapshotPremium?: boolean;
}

export default function TopupAction({ where, className = "lt-usage__btn", wrapperClassName, onToppedUp, requireSnapshotPremium = false }: TopupActionProps) {
  const [open, setOpen] = useState(false);
  const paid = useRef(false);
  const enabled = isTopupClientEnabled();
  const [realPremium, setRealPremium] = useState(false);
  useEffect(() => {
    if (!enabled || !requireSnapshotPremium) return;
    let cancelled = false;
    void fetchUsageMe().then((snap) => {
      if (!cancelled) setRealPremium(Boolean(snap && snap.enforced === true && snap.tier === "premium"));
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, requireSnapshotPremium]);
  if (!enabled) return null;
  if (requireSnapshotPremium && !realPremium) return null;
  const body = (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid={`topup-open-${where}`}>
        {where === "limit" ? TOPUP_ACTION_LIMIT : where === "warn" ? TOPUP_ACTION_WARN : TOPUP_ACTION_MENU}
      </button>
      {open ? (
        <Suspense fallback={null}>
          <TopupSheetLazy
            onClose={() => {
              setOpen(false);
              // The host hears about a paid top-up when the student closes the sheet, so "Done" is read before the host re-renders.
              if (paid.current) {
                paid.current = false;
                onToppedUp?.();
              }
            }}
            onToppedUp={() => {
              paid.current = true;
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
  return wrapperClassName ? <div className={wrapperClassName}>{body}</div> : body;
}
