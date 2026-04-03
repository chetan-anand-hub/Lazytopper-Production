import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "./AuthContext";
import type { SubscriptionStatus } from "@/data/types";

const TRIAL_DAYS = 7;
function storageKey(uid: string) {
  return `lt_subscription_${uid}`;
}

function createDefaultStatus(): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null };
}

function applyExpiry(status: SubscriptionStatus): SubscriptionStatus {
  if (status.tier === "trial" && status.trialEndDate) {
    if (new Date() > new Date(status.trialEndDate)) {
      return { ...status, tier: "free", plan: "none" };
    }
  }
  return status;
}

function getDaysLeft(status: SubscriptionStatus): number {
  if (status.tier !== "trial" || !status.trialEndDate) return 0;
  const diff = new Date(status.trialEndDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

interface SubscriptionContextType {
  tier: SubscriptionStatus["tier"];
  isPremium: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeftInTrial: number;
  startTrial: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "free",
  isPremium: false,
  isTrialActive: false,
  isTrialExpired: false,
  daysLeftInTrial: 0,
  startTrial: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(createDefaultStatus());

  useEffect(() => {
    if (!user) {
      setStatus(createDefaultStatus());
      return;
    }
    const key = storageKey(user.uid);
    AsyncStorage.getItem(key).then((stored) => {
      if (stored) {
        try {
          const parsed = applyExpiry(JSON.parse(stored));
          setStatus(parsed);
          AsyncStorage.setItem(key, JSON.stringify(parsed));
        } catch {
          setStatus(createDefaultStatus());
        }
      } else {
        setStatus(createDefaultStatus());
      }
    });
  }, [user?.uid]);

  const startTrial = useCallback(async () => {
    if (!user) return;
    if (status.tier === "trial" || status.tier === "premium") return;
    if (status.trialStartDate) return;
    const now = new Date();
    const end = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const updated: SubscriptionStatus = {
      tier: "trial",
      plan: "trial_7day",
      trialStartDate: now.toISOString(),
      trialEndDate: end.toISOString(),
    };
    setStatus(updated);
    await AsyncStorage.setItem(storageKey(user.uid), JSON.stringify(updated));
  }, [status, user]);

  const isPremium = status.tier === "trial" || status.tier === "premium";
  const isTrialActive = status.tier === "trial";
  const isTrialExpired = status.tier === "free" && status.trialStartDate !== null;
  const daysLeftInTrial = getDaysLeft(status);

  return (
    <SubscriptionContext.Provider
      value={{ tier: status.tier, isPremium, isTrialActive, isTrialExpired, daysLeftInTrial, startTrial }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
