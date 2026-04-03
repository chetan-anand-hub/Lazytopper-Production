export type SubscriptionTier = "free" | "trial" | "premium";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  trialStartDate: string | null;
  trialEndDate: string | null;
  premiumSince: string | null;
}

const STORAGE_KEY = "lazytopper.subscription.v1";
const TRIAL_DAYS = 7;

function defaultStatus(): SubscriptionStatus {
  return { tier: "free", trialStartDate: null, trialEndDate: null, premiumSince: null };
}

export function loadSubscription(uid: string): SubscriptionStatus {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${uid}`);
    if (!raw) return defaultStatus();
    const parsed = JSON.parse(raw) as SubscriptionStatus;
    if (parsed.tier === "trial" && parsed.trialEndDate) {
      if (new Date(parsed.trialEndDate).getTime() < Date.now()) {
        const expired: SubscriptionStatus = { ...parsed, tier: "free" };
        saveSubscription(uid, expired);
        return expired;
      }
    }
    return parsed;
  } catch {
    return defaultStatus();
  }
}

export function saveSubscription(uid: string, status: SubscriptionStatus): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${uid}`, JSON.stringify(status));
  } catch {}
}

export function activateTrial(uid: string): SubscriptionStatus {
  const existing = loadSubscription(uid);
  if (existing.tier === "premium") return existing;
  if (existing.trialStartDate) return existing;

  const now = new Date();
  const end = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const status: SubscriptionStatus = {
    tier: "trial",
    trialStartDate: now.toISOString(),
    trialEndDate: end.toISOString(),
    premiumSince: null,
  };
  saveSubscription(uid, status);
  return status;
}

export function activatePremium(uid: string): SubscriptionStatus {
  const existing = loadSubscription(uid);
  const status: SubscriptionStatus = {
    ...existing,
    tier: "premium",
    premiumSince: new Date().toISOString(),
  };
  saveSubscription(uid, status);
  return status;
}

export function getDaysLeftInTrial(status: SubscriptionStatus): number {
  if (!status.trialEndDate) return 0;
  const diff = new Date(status.trialEndDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function isPremiumAccess(status: SubscriptionStatus): boolean {
  return status.tier === "premium" || status.tier === "trial";
}
