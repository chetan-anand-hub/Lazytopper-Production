import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  loadSubscription,
  getDaysLeftInTrial,
  isPremiumAccess,
  activateTrial,
  activatePremium,
  hydrateSubscriptionFromCloud,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "../services/subscriptionService";

export interface UseSubscriptionResult {
  tier: SubscriptionTier;
  isPremium: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeftInTrial: number;
  status: SubscriptionStatus;
  startTrial: () => void;
  upgradeToPremium: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const uid = user?.uid || "";

  const localStatus = useMemo(() => loadSubscription(uid), [uid]);
  const [status, setStatus] = useState<SubscriptionStatus>(localStatus);

  useEffect(() => {
    setStatus(loadSubscription(uid));
    if (!uid) return;
    let cancelled = false;
    hydrateSubscriptionFromCloud(uid).then((cloud) => {
      if (!cancelled) setStatus(cloud);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [uid]);

  const daysLeft = getDaysLeftInTrial(status);
  const isTrialActive = status.tier === "trial" && daysLeft > 0;
  const isTrialExpired = !!status.trialStartDate && status.tier === "free";

  return {
    tier: status.tier,
    isPremium: isPremiumAccess(status),
    isTrialActive,
    isTrialExpired,
    daysLeftInTrial: daysLeft,
    status,
    startTrial: () => {
      if (uid) {
        const updated = activateTrial(uid);
        setStatus(updated);
      }
    },
    upgradeToPremium: () => {
      if (uid) {
        const updated = activatePremium(uid);
        setStatus(updated);
      }
    },
  };
}
