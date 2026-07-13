import type { SubscriptionTier } from "../services/subscriptionService";

/**
 * deriveAccountStatus — the single source of truth for the account-menu status
 * chip (label / detail / colours) shown in the DesktopShell dropdown and, from
 * this PR, the MobileShell avatar dropdown.
 *
 * Pure + presentation-only: it READS the already-resolved subscription flags and
 * returns display strings/colours. It NEVER activates or mutates subscription
 * state (no trial activation) — callers pass values straight from
 * `useSubscription()`, reading only.
 *
 * The colour values are deliberately verbatim-shared with the desktop dropdown so
 * both surfaces render an identical status chip. The translucent tints read on
 * both the light desktop card and the dark mobile card.
 *
 * NOTE — the desktop shell (`components/desktop/DesktopShell.tsx`) still holds an
 * inline copy of this exact derivation today; migrating it onto this helper is the
 * tracked follow-up [FU-DESKTOP-ACCOUNT-MENU-SHARE] (DesktopShell is a locked
 * sacred file, out of scope for this chrome PR).
 */
export interface AccountStatusInput {
  tier: SubscriptionTier;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeftInTrial: number;
}

export interface AccountStatusView {
  label: string;
  detail: string;
  color: string;
  bg: string;
  border: string;
  /**
   * True only for the trial-EXPIRED (non-premium) state — the one status that is
   * a call to action (choose a plan). Callers surface an actionable affordance
   * (route to pricing) rather than leaving it purely informational.
   */
  isActionable: boolean;
}

export function deriveAccountStatus({
  tier,
  isTrialActive,
  isTrialExpired,
  daysLeftInTrial,
}: AccountStatusInput): AccountStatusView {
  if (tier === "premium") {
    return {
      label: "Premium active",
      detail: "Full access is active on this account.",
      color: "hsl(152, 55%, 28%)",
      bg: "hsla(152,55%,45%,0.12)",
      border: "hsla(152,55%,45%,0.25)",
      isActionable: false,
    };
  }

  if (isTrialActive) {
    const urgent = daysLeftInTrial <= 2;
    return {
      label:
        daysLeftInTrial <= 1
          ? "Trial ends today"
          : `Trial active - ${daysLeftInTrial} days left`,
      detail: "Your 7-day trial is tied to this account.",
      color: urgent ? "hsl(32, 95%, 38%)" : "hsl(152, 55%, 30%)",
      bg: urgent ? "hsla(32,95%,50%,0.12)" : "hsla(152,55%,45%,0.12)",
      border: urgent ? "hsla(32,95%,50%,0.28)" : "hsla(152,55%,45%,0.25)",
      isActionable: false,
    };
  }

  if (isTrialExpired) {
    return {
      label: "Trial ended - Choose plan",
      detail: "Choose a plan to continue premium tools.",
      color: "hsl(0, 72%, 45%)",
      bg: "hsla(0,72%,50%,0.10)",
      border: "hsla(0,72%,50%,0.22)",
      isActionable: true,
    };
  }

  return {
    label: "Free account",
    detail: "No active trial is recorded for this account.",
    color: "hsl(220, 15%, 45%)",
    bg: "hsl(215, 28%, 95%)",
    border: "hsl(215, 25%, 90%)",
    isActionable: false,
  };
}
