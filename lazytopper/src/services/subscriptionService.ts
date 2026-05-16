import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";

export type SubscriptionTier = "free" | "trial" | "premium";

export type SubscriptionPlan = "none" | "trial_7day" | "premium_monthly" | "premium_yearly";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  trialStartDate: string | null;
  trialEndDate: string | null;
  premiumSince: string | null;
}

const STORAGE_KEY = "lazytopper.subscription.v1";
const TRIAL_DAYS = 7;
const FIRESTORE_COLLECTION = "subscriptions";

function defaultStatus(): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
}

function applyExpiry(status: SubscriptionStatus): SubscriptionStatus {
  if (status.tier === "trial" && status.trialEndDate) {
    if (new Date(status.trialEndDate).getTime() < Date.now()) {
      return { ...status, tier: "free" };
    }
  }
  return status;
}

function saveLocal(uid: string, status: SubscriptionStatus): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${uid}`, JSON.stringify(status));
  } catch {}
}

function loadLocal(uid: string): SubscriptionStatus | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.plan) parsed.plan = parsed.tier === "trial" ? "trial_7day" : parsed.tier === "premium" ? "premium_monthly" : "none";
    return parsed as SubscriptionStatus;
  } catch {
    return null;
  }
}

async function saveCloud(uid: string, status: SubscriptionStatus): Promise<void> {
  if (!firestoreDb) return;
  try {
    const ref = doc(firestoreDb, FIRESTORE_COLLECTION, uid);
    await setDoc(ref, { ...status, updatedAt: new Date().toISOString() }, { merge: true });
  } catch {}
}

async function loadCloud(uid: string): Promise<SubscriptionStatus | null> {
  if (!firestoreDb) return null;
  try {
    const ref = doc(firestoreDb, FIRESTORE_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as SubscriptionStatus;
    if (!data.plan) data.plan = data.tier === "trial" ? "trial_7day" : data.tier === "premium" ? "premium_monthly" : "none";
    return data;
  } catch {
    return null;
  }
}

export function loadSubscription(uid: string): SubscriptionStatus {
  const local = loadLocal(uid);
  if (!local) return defaultStatus();
  const resolved = applyExpiry(local);
  if (resolved.tier !== local.tier) {
    saveSubscription(uid, resolved);
  }
  return resolved;
}

export function saveSubscription(uid: string, status: SubscriptionStatus): void {
  saveLocal(uid, status);
  void saveCloud(uid, status);
}

export async function hydrateSubscriptionFromCloud(uid: string): Promise<SubscriptionStatus> {
  const cloud = await loadCloud(uid);
  const local = loadLocal(uid);

  if (cloud) {
    const resolved = applyExpiry(cloud);
    saveLocal(uid, resolved);
    return resolved;
  }
  if (local) {
    const resolved = applyExpiry(local);
    void saveCloud(uid, resolved);
    return resolved;
  }
  return defaultStatus();
}

export function activateTrial(uid: string): SubscriptionStatus {
  const existing = loadSubscription(uid);
  if (existing.tier === "premium") return existing;
  if (existing.trialStartDate) return existing;

  const now = new Date();
  const end = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const status: SubscriptionStatus = {
    tier: "trial",
    plan: "trial_7day",
    trialStartDate: now.toISOString(),
    trialEndDate: end.toISOString(),
    premiumSince: null,
  };
  saveSubscription(uid, status);
  return status;
}

export function activatePremium(uid: string): SubscriptionStatus {
  // Payment/admin-only helper. Normal client UI must route to pricing and
  // must not call this directly unless a verified payment/admin path exists.
  const existing = loadSubscription(uid);
  const status: SubscriptionStatus = {
    ...existing,
    tier: "premium",
    plan: "premium_monthly",
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
