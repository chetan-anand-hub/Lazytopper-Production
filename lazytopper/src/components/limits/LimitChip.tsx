/**
 * LimitChip — LIMITS-1: "1 of 2 downloads left this week", beside a download button.
 * Renders nothing while VITE_LIMITS_ENABLED is off, for Premium, or when the server has not
 * told us a metered count. Signed-out visitors see the sign-up invitation.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  getLimitsSummary,
  isLimitsClientEnabled,
  refreshLimitsSummary,
  subscribeLimitsSummary,
  type LimitsSummary,
} from "../../services/limitsClient";
import { chipText, SIGNED_OUT_CHIP } from "./limitsCopy";
import "./limits.css";

/** The gate: with the flag off this renders nothing and touches no context (a dark build is byte-for-byte as before). */
export default function LimitChip() {
  return isLimitsClientEnabled() ? <LimitChipLive /> : null;
}

function LimitChipLive() {
  const enabled = true;
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const uid = user?.uid || "";
  const [summary, setSummary] = useState<LimitsSummary | null>(getLimitsSummary());

  useEffect(() => {
    if (!enabled || !uid || isPremium) return undefined;
    setSummary(getLimitsSummary());
    const off = subscribeLimitsSummary(() => setSummary(getLimitsSummary()));
    void refreshLimitsSummary();
    return off;
  }, [enabled, uid, isPremium]);

  if (!enabled || isPremium) return null;
  const text = uid ? chipText(summary?.tier ?? null, summary?.download ?? null) : SIGNED_OUT_CHIP;
  if (!text) return null;
  const spent = Boolean(uid) && summary?.download?.remaining === 0 && !summary?.download?.firstFreeAvailable;
  return (
    <span className={`lt-limit-chip${spent ? " lt-limit-chip--warn" : ""}`} data-testid="limit-chip">
      {text}
    </span>
  );
}
