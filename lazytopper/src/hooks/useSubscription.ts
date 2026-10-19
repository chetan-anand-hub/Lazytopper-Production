import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  loadSubscription,
  getDaysLeftInTrial,
  isPremiumAccess,
  activateTrial,
  activatePremium,
  hydrateSubscriptionFromCloud,
  onSubscriptionHydrated,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "../services/subscriptionService";
import { checkPayStatus, readPayPending, statusChecksLeft } from "../services/checkout";

/* ── PAY-RECOVER-1 · refresh on return ─────────────────────────────────────────
 * A student who pays in a UPI app comes BACK to this tab; nothing remounts, so the hook
 * used to keep the pre-payment status until a reload. On `visibilitychange` (visible) and
 * `focus` the entitlement is re-read from the cloud — and if this tab holds a pending
 * order (checkout.ts `lazytopper.payPending`), the server is asked about it FIRST, so a
 * payment whose verify never landed is reconciled before the read.
 *
 * Bounded on purpose (Firestore reads; `/api/pay/status` shares the `payments` budget):
 *   - module-level SINGLE-FLIGHT per uid — every mounted instance hears the same event,
 *     but one refresh runs and the emitter hands its result to all of them;
 *   - at most one refresh per REFRESH_MIN_GAP_MS without a marker, per
 *     REFRESH_MIN_GAP_PENDING_MS with one;
 *   - a status call only while the order has budget left (MAX_STATUS_CHECKS_PER_ORDER).
 * Never activates a trial and never writes an entitlement: it only READS.
 */
export const REFRESH_MIN_GAP_MS = 60_000;
export const REFRESH_MIN_GAP_PENDING_MS = 15_000;

/**
 * The throttle runs on the MONOTONIC clock: it measures "how long since the last refresh",
 * not a calendar date, so a device clock change cannot open or jam it — and mounting this
 * hook never reads the wall clock (the marker's 30-minute expiry, in checkout.ts, does).
 */
function monoNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : 0;
}

interface RefreshSlot {
  inflight: Promise<void> | null;
  lastAt: number;
}

const refreshSlots = new Map<string, RefreshSlot>();

/** Test seam: forget every uid's refresh history. */
export function resetSubscriptionRefreshForTests(): void {
  refreshSlots.clear();
}

/** A mount hydration just read the cloud: a return event right after it need not re-read. */
function noteMountHydration(uid: string, now: number = monoNow()): void {
  const slot = refreshSlots.get(uid) ?? { inflight: null, lastAt: Number.NEGATIVE_INFINITY };
  slot.lastAt = Math.max(slot.lastAt, now);
  refreshSlots.set(uid, slot);
}

export function refreshSubscriptionOnReturn(uid: string, now: number = monoNow()): Promise<void> | null {
  if (!uid) return null;
  const slot = refreshSlots.get(uid) ?? { inflight: null, lastAt: Number.NEGATIVE_INFINITY };
  refreshSlots.set(uid, slot);
  if (slot.inflight) return slot.inflight;
  const marker = readPayPending();
  const gap = marker ? REFRESH_MIN_GAP_PENDING_MS : REFRESH_MIN_GAP_MS;
  if (now - slot.lastAt < gap) return null;
  slot.lastAt = now;
  const run = (async () => {
    try {
      if (marker && statusChecksLeft(marker.orderId) > 0) await checkPayStatus(marker.orderId);
    } catch {
      /* checkPayStatus never throws; belt and braces */
    }
    try {
      // The emitter hands the result to every mounted instance.
      await hydrateSubscriptionFromCloud(uid);
    } catch {
      /* offline: keep what we have */
    }
  })().finally(() => {
    slot.inflight = null;
  });
  slot.inflight = run;
  return run;
}

export interface UseSubscriptionResult {
  tier: SubscriptionTier;
  isPremium: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeftInTrial: number;
  status: SubscriptionStatus;
  /**
   * True once THIS uid's cloud hydration has resolved, so `status` is the reconciled
   * record rather than the local cache. FREE-CHECK-1b's R9 offer waits on it: offering
   * a trial off a stale cache could show a trial the rules then refuse (N15).
   */
  hydrated: boolean;
  startTrial: () => void;
  /** Payment/admin-only. Client upgrade UI should navigate to pricing. */
  upgradeToPremium: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const uid = user?.uid || "";

  const localStatus = useMemo(() => loadSubscription(uid), [uid]);
  const [status, setStatus] = useState<SubscriptionStatus>(localStatus);
  const [hydratedUid, setHydratedUid] = useState<string>("");

  useEffect(() => {
    setStatus(loadSubscription(uid));
    if (!uid) return;
    let cancelled = false;
    noteMountHydration(uid);
    hydrateSubscriptionFromCloud(uid).then((cloud) => {
      // READ the cloud status only — never activate a trial here. Trial activation is
      // user-initiated (startTrial) exclusively; auto-activating on hydration silently
      // burned a student's 7-day trial the moment any page mounted this hook, before
      // they did anything. hydrateSubscriptionFromCloud already returns the correct
      // status for every case: premium / active-trial / expired-trial resolve to the
      // cloud record, and a fresh user resolves to a free defaultStatus().
      // [FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT]
      if (!cancelled) {
        setStatus(cloud);
        setHydratedUid(uid);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [uid]);

  // PAY-RECOVER-1 — take every cloud-reconciled status for this uid, whichever instance ran it.
  useEffect(() => {
    if (!uid) return undefined;
    return onSubscriptionHydrated((hydratedFor, cloud) => {
      if (hydratedFor !== uid) return;
      setStatus(cloud);
      setHydratedUid(uid);
    });
  }, [uid]);

  // PAY-RECOVER-1 — refresh when the student comes back to this tab (e.g. from a UPI app).
  useEffect(() => {
    if (!uid || typeof window === "undefined") return undefined;
    const onReturn = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refreshSubscriptionOnReturn(uid);
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
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
    hydrated: Boolean(uid) && hydratedUid === uid,
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
