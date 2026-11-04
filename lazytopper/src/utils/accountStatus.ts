import type { SubscriptionPlan, SubscriptionTier } from "../services/subscriptionService";

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
 * NAV-FIX-1 (4 Nov 2026): the desktop shell (`components/desktop/DesktopShell.tsx`)
 * now reads this helper too — its inline copy (which still said "Premium active") is
 * gone, closing [FU-DESKTOP-ACCOUNT-MENU-SHARE].
 */
export interface AccountStatusInput {
  tier: SubscriptionTier;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeftInTrial: number;
  /** NAV-1 — which paid access this is (server-written). Optional: callers that omit it get the generic label. */
  plan?: SubscriptionPlan | null;
  /** NAV-1 — when a paid pass ends (ISO, server-written). Shown as "till d MMM" on a month pass. */
  passEnd?: string | null;
}

/** "30 Nov" in India time; null when the ISO string does not parse. */
export function formatPassEndShort(iso: string | null | undefined): string | null {
  const t = Date.parse(iso || "");
  return Number.isNaN(t) ? null : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/**
 * NAV-1 (owner, 4 Nov 2026) — the paid-access chip names the pass the student actually holds, never "Premium":
 *   pass_till_boards -> "Board Pass";  pass_month -> "Month pass · till 30 Nov";
 *   pass_extension -> "Access extended · till 30 Nov";  anything else (a legacy owner grant) -> "Full access".
 */
export function paidAccessLabel(plan: SubscriptionPlan | null | undefined, passEnd: string | null | undefined): string {
  const till = formatPassEndShort(passEnd);
  if (plan === "pass_till_boards") return "Board Pass";
  if (plan === "pass_month") return till ? `Month pass · till ${till}` : "Month pass";
  if (plan === "pass_extension") return till ? `Access extended · till ${till}` : "Access extended";
  return "Full access";
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
  plan,
  passEnd,
}: AccountStatusInput): AccountStatusView {
  if (tier === "premium") {
    return {
      label: paidAccessLabel(plan, passEnd),
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
      detail: "Choose a plan to keep using the full tools.",
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
