// src/pages/tutor/tutorErrorState.ts
// TUTOR-FIX-2 T7 — the tutor's failures as TYPED states, not one flattened line.
//
// `callTutor` already throws typed errors (tutorClient.ts): a Premium refusal
// (PremiumRequiredError), a fair-use refusal (FairUseLimitError: trial_limit / usage_limit),
// the site-wide ceiling (TutorBusyError: busy_today), a refused sign-in (SignInAgainError).
// The session used to keep only `e.message`; this maps the thrown error to the state the page
// renders: an upgrade card, a "back at <time>" line, an offline line, or the honest
// retryable line (today's behaviour). PURE apart from the IST formatter it reuses.

import { formatResetIst, isMidnightIst } from "../../components/usage/fairUseGate";

export type TutorErrorState =
  /** 402 premium_required → an upgrade card to the existing pricing entry (no retry). */
  | { kind: "premium"; message: string }
  /** 409 trial_limit / 429 usage_limit → today's messages are used up (no retry). */
  | { kind: "limit"; resetAt: string | null; window: string | null }
  /** 429 busy_today → the site-wide ceiling, same family as a limit (no retry). */
  | { kind: "busy"; resetAt: string | null; message: string; plans: boolean }
  /** The browser is offline / the request never reached the server → try again. */
  | { kind: "offline" }
  /** 401 the sign-in could not be refreshed → the existing sign-in-again line + try again. */
  | { kind: "reauth"; message: string }
  /** Any other failure (5xx, unreadable reply) → the honest line + try again (as today). */
  | { kind: "failed"; message: string };

const FALLBACK = "The tutor is unavailable right now.";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/** Map whatever `callTutor` threw to the state the page renders. `online` defaults to the
 *  browser's own flag. */
export function classifyTutorError(e: unknown, online: boolean = typeof navigator === "undefined" ? true : navigator.onLine !== false): TutorErrorState {
  const err = (e && typeof e === "object" ? e : {}) as { name?: unknown; message?: unknown; resetAt?: unknown; window?: unknown; cta?: unknown };
  const name = str(err.name);
  const message = str(err.message) || FALLBACK;
  if (name === "PremiumRequiredError") return { kind: "premium", message };
  if (name === "FairUseLimitError") return { kind: "limit", resetAt: str(err.resetAt), window: str(err.window) };
  if (name === "TutorBusyError") return { kind: "busy", resetAt: str(err.resetAt), message, plans: err.cta === "plans" };
  if (name === "SignInAgainError") return { kind: "reauth", message };
  // fetch() rejects with a TypeError when the request never reached the server.
  if (!online || (name === "TypeError" && /fetch|network|load failed/i.test(message))) return { kind: "offline" };
  return { kind: "failed", message };
}

/** "Back at 5:30 pm." when the reset is a real time; "Back tomorrow." for the IST-midnight reset
 *  or when the server sent none. Formatted in IST (the boundary the server uses). */
export function backAtLine(resetAt: string | null, nowMs: number = Date.now()): string {
  if (!resetAt || !Number.isFinite(Date.parse(resetAt))) return "Back tomorrow.";
  // The next IST midnight is "tomorrow"; a midnight days away (a weekly window) is named.
  if (isMidnightIst(resetAt) && Date.parse(resetAt) - nowMs <= 24 * 60 * 60 * 1000) return "Back tomorrow.";
  const when = formatResetIst(resetAt, nowMs);
  return when ? `Back at ${when}.` : "Back tomorrow.";
}

/** The one line a limit / busy state shows. */
export function limitHeadline(state: Extract<TutorErrorState, { kind: "limit" | "busy" }>): string {
  if (state.kind === "busy") return "The tutor is very busy today.";
  return state.window && state.window !== "day"
    ? "You've used your tutor messages for now."
    : "You've used today's tutor messages.";
}
