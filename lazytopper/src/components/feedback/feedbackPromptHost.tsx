/**
 * feedbackPromptHost — shows FEEDBACK-1's prompt, at most once per moment.
 *
 * WHY A HOST OF ITS OWN. The paywall moment happens as an upgrade sheet CLOSES — and the
 * sheet's parent unmounts it in the same click, so the prompt cannot live inside the
 * sheet. The only always-mounted places in the tree are App.tsx and DesktopShell.tsx,
 * both forbidden for this lane. So the host renders the card into its own small React
 * root on `document.body`. The card needs nothing from the app's providers (no router, no
 * auth context): the uid is resolved here and the card is purely presentational.
 *
 * THE ORDER, EVERY TIME:
 *   1. a signed-in, non-anonymous student (uid) — otherwise nothing;
 *   2. nothing already shown in THIS page load;
 *   3. `claimFeedbackMoment` — the once-per-moment rule, recorded on the device BEFORE the
 *      card renders; a device that cannot store the record gets no prompt (fail closed);
 *   4. render, and count `feedback_shown`.
 * Every step is wrapped: nothing here can throw into the page that asked.
 */
import { createRoot, type Root } from "react-dom/client";
import { trackFeedbackEvent } from "../../analytics/analytics";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { claimFeedbackMoment, type FeedbackMoment, type FeedbackStore } from "./feedbackPromptModel";

export interface FeedbackRequest {
  /** The signed-in student's uid. Omitted -> read from Firebase Auth (paywall callers). */
  uid?: string | null;
  /** `trial_end` only: the trial's server-set start, the "which trial" key. */
  trialKey?: string | null;
}

let shownThisLoad = false;
let mounted: { root: Root; el: HTMLElement } | null = null;

function deviceStore(): FeedbackStore | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** The current signed-in student's uid from Firebase Auth, or null (signed out / anonymous / unconfigured). */
async function currentStudentUid(): Promise<string | null> {
  try {
    const { authClient } = await import("../../services/firebaseClient");
    const u = authClient?.currentUser ?? null;
    if (!u || u.isAnonymous || typeof u.uid !== "string" || !u.uid) return null;
    return u.uid;
  } catch {
    return null;
  }
}

function unmount(): void {
  const m = mounted;
  mounted = null;
  if (!m) return;
  try {
    m.root.unmount();
  } catch {
    /* already gone */
  }
  try {
    m.el.remove();
  } catch {
    /* already gone */
  }
}

/** Render the card for `moment`. Exported for tests; callers use requestFeedbackPrompt. */
export function renderFeedbackPrompt(moment: FeedbackMoment): void {
  if (typeof document === "undefined" || mounted) return;
  const el = document.createElement("div");
  el.setAttribute("data-lt-feedback-host", moment);
  document.body.appendChild(el);
  const root = createRoot(el);
  mounted = { root, el };
  root.render(
    <FeedbackPrompt
      onAnswer={(reason) => trackFeedbackEvent("reason", moment, reason)}
      onDismiss={() => trackFeedbackEvent("dismissed", moment)}
      onDone={unmount}
    />,
  );
  trackFeedbackEvent("shown", moment);
}

/**
 * Ask for the prompt at `moment`. Resolves true when it was shown. Never throws, never
 * blocks the caller (fire and forget: `void requestFeedbackPrompt(...)`).
 */
export async function requestFeedbackPrompt(moment: FeedbackMoment, req: FeedbackRequest = {}): Promise<boolean> {
  try {
    if (shownThisLoad || mounted) return false;
    const uid = req.uid ?? (await currentStudentUid());
    if (!uid) return false;
    if (shownThisLoad || mounted) return false; // re-check after the await
    if (!claimFeedbackMoment(deviceStore(), uid, moment, Date.now(), req.trialKey ?? null)) return false;
    shownThisLoad = true;
    renderFeedbackPrompt(moment);
    return true;
  } catch {
    return false;
  }
}

/** The paywall moment: an upgrade sheet/modal was closed WITHOUT going to plans. */
export function notifyPaywallDismissed(): void {
  void requestFeedbackPrompt("paywall");
}

/** Test seam: forget this page load's prompt and remove any card. */
export function __resetFeedbackHostForTests(): void {
  shownThisLoad = false;
  unmount();
}
