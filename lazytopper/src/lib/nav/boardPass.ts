/**
 * NAV-PRICING-1 — does this student hold the Board Pass (the paid till-boards pass)?
 *
 * Decides one thing only: whether the "Pricing" nav entry is shown. A holder keeps "Me" in the phone
 * bar's 5th slot and has no Pricing entry in the desktop panel; everyone else (signed out, Basic, trial,
 * a month pass, an extension) sees "Pricing". Trial and Basic are NOT holders.
 *
 * Reads the CACHED subscription for the signed-in uid (the same read as lib/packs/usePaidPremium) and
 * follows onSubscriptionHydrated; it never calls useSubscription() and never writes anything. Signed out,
 * or before hydration (the cache is the Basic default), it is false, so the visitor default is Pricing.
 * Lives outside the lazy pack chunk because the phone bar is in the entry.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { loadSubscription, onSubscriptionHydrated, type SubscriptionStatus } from "../../services/subscriptionService";

export function holdsBoardPass(status: Pick<SubscriptionStatus, "tier" | "plan"> | null | undefined): boolean {
  return status?.tier === "premium" && status.plan === "pass_till_boards";
}

function readHolds(uid: string): boolean {
  if (!uid) return false;
  try {
    return holdsBoardPass(loadSubscription(uid));
  } catch {
    return false;
  }
}

export function useHoldsBoardPass(): boolean {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [holds, setHolds] = useState<boolean>(() => readHolds(uid));
  useEffect(() => {
    setHolds(readHolds(uid));
    if (!uid) return;
    return onSubscriptionHydrated((u, status) => {
      if (u === uid) setHolds(holdsBoardPass(status));
    });
  }, [uid]);
  return !!uid && holds;
}
