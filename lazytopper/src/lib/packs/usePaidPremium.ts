/**
 * usePaidPremium — PACKS-ENTRY-1 (owner ruling 25 Oct 19:54): a student who has BOUGHT Premium (a verified paid pass or
 * an admin grant: `isPaidPremium`, NOT the trial-inclusive `isPremiumAccess`) is shown no pack offers.
 *
 * Reads the CACHED subscription (loadSubscription for the signed-in uid) and follows onSubscriptionHydrated; it never
 * calls useSubscription(). Signed out, or not yet hydrated (the cache is the Basic default) -> false, so the offer shows
 * (the Basic / trial / visitor default). Lives in the lazy pack chunk, never the entry.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { isPaidPremium, loadSubscription, onSubscriptionHydrated } from "../../services/subscriptionService";

function readPaid(uid: string): boolean {
  if (!uid) return false;
  try {
    return isPaidPremium(loadSubscription(uid));
  } catch {
    return false;
  }
}

export function usePaidPremium(): boolean {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [paid, setPaid] = useState<boolean>(() => readPaid(uid));
  useEffect(() => {
    setPaid(readPaid(uid));
    if (!uid) return;
    return onSubscriptionHydrated((u, status) => {
      if (u === uid) setPaid(isPaidPremium(status));
    });
  }, [uid]);
  return !!uid && paid;
}
