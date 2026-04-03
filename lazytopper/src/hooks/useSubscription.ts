import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  loadSubscription,
  getDaysLeftInTrial,
  isPremiumAccess,
  activateTrial,
  activatePremium,
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

  const status = useMemo(() => loadSubscription(uid), [uid]);

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
      if (uid) activateTrial(uid);
    },
    upgradeToPremium: () => {
      if (uid) activatePremium(uid);
    },
  };
}
