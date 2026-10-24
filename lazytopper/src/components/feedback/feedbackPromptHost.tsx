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
 * FIRST-FEEDBACK-1: `first_graded` also needs a FIRST graded result (`firstResultState`
 * over the device's session records), and it neither checks nor sets step 2.
 *
 * FEEDBACK-2: after the first ask, "Was this useful?" returns as `after_graded` on a LATER graded result
 * (`firstResultState` = "not_first"): at most once per 7 days per student per device (the device
 * record, claimFeedbackMoment), never twice in one browser session (a this-tab flag), never while a
 * card is open, and, if the mascot budget has no slot left, as a PLAIN card (feedbackBudget.ts: the budget limits the character, not the question). The scorecard hands in
 * a context (`GradedFeedbackContextInput`: the router's navigate and the result's chapter / tutor hop),
 * so every answer can lead to a real page; the card itself has no router.
 * Every step is wrapped: nothing here can throw into the page that asked.
 */
import { createRoot, type Root } from "react-dom/client";
import { trackFeedbackEvent } from "../../analytics/analytics";
import { loadLocalSessionRecords } from "../../services/sessionRecords";
import { WRITTEN_GRADED_SURFACES, cloudHasWrittenGraded } from "../guide/moments/writtenGradedCloud";
import { anyMascotHost } from "../guide/mascotPresence";
import { isSidebarMascot } from "./feedbackMascots";
import { mascotsHidden } from "../guide/mascotsMute";
import { FeedbackPrompt } from "./FeedbackPrompt";
import {
  FIRST_GRADED_MOMENT,
  AFTER_GRADED_MOMENT,
  claimFeedbackMoment,
  firstResultState,
  isGradedMoment,
  type FeedbackMoment,
  type FeedbackStore,
} from "./feedbackPromptModel";
import type { GradedFeedbackContext, GradedFeedbackContextInput } from "./gradedFeedbackFlow";

export interface FeedbackRequest {
  /** The signed-in student's uid. Omitted -> read from Firebase Auth (paywall callers). */
  uid?: string | null;
  /** `trial_end` only: the trial's server-set start, the "which trial" key. */
  trialKey?: string | null;
  /** The graded moments only (FEEDBACK-2): what the scorecard handed in. */
  graded?: GradedFeedbackContextInput | null;
}

let shownThisLoad = false;
let mounted: { root: Root; el: HTMLElement; owner: object | null; handedOff: boolean } | null = null;

/**
 * FEEDBACK-2 — "never twice in one browser session". A this-tab flag (sessionStorage, registered in
 * services/studentDataMap.ts) plus a module flag for when storage is blocked. It is set when a graded
 * "Was this useful?" is SHOWN, so a destination page the student lands on never gets a second card.
 */
export const GRADED_ASKED_SESSION_KEY = "lazytopper.feedbackGradedAsked";
let gradedAskedInMemory = false;

function gradedAskedThisSession(): boolean {
  if (gradedAskedInMemory) return true;
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(GRADED_ASKED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markGradedAskedThisSession(): void {
  gradedAskedInMemory = true;
  try {
    window.sessionStorage.setItem(GRADED_ASKED_SESSION_KEY, "1");
  } catch {
    /* blocked storage: the module flag still holds for this page load */
  }
}

/** Has this account had a written answer graded? Local records first (no network), then one bounded server read. */
const WRITTEN_LOOKUP_MS = 1200;
async function writtenGradedEver(uid: string): Promise<boolean | null> {
  try {
    const written = new Set<string>(WRITTEN_GRADED_SURFACES);
    if (loadLocalSessionRecords(uid).some((r) => written.has(String(r.surface)))) return true;
    return await Promise.race<boolean | null>([
      cloudHasWrittenGraded(uid),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), WRITTEN_LOOKUP_MS)),
    ]);
  } catch {
    return null;
  }
}

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

/**
 * FEEDBACK-2 — the card dies with the scorecard that asked: that scorecard unmounted (or the route changed).
 * A card that has been handed off (it is naming where to tap on the page the scorecard opened) is left to
 * close itself.
 */
export function dismissFeedbackPromptFor(owner: object): void {
  if (mounted && mounted.owner === owner && !mounted.handedOff) unmount();
}

/** Render the card for `moment`. Exported for tests; callers use requestFeedbackPrompt. */
export function renderFeedbackPrompt(
  moment: FeedbackMoment,
  opts: { flow?: GradedFeedbackContext | null; withZiggy?: boolean; uid?: string | null } = {},
): void {
  if (typeof document === "undefined" || mounted) return;
  const el = document.createElement("div");
  el.setAttribute("data-lt-feedback-host", moment);
  document.body.appendChild(el);
  const root = createRoot(el);
  const flow = opts.flow ?? null;
  mounted = { root, el, owner: flow?.owner ?? null, handedOff: false };
  root.render(
    <FeedbackPrompt
      moment={moment}
      flow={flow}
      withZiggy={opts.withZiggy !== false}
      onAnswer={(reason) => trackFeedbackEvent("reason", moment, reason)}
      onDismiss={() => trackFeedbackEvent("dismissed", moment)}
      onCallTap={() => trackFeedbackEvent("call_tap", moment)}
      onNext={(action) => trackFeedbackEvent("next", moment, undefined, action)}
      onSaveNote={async (kind, text) => {
        // The words go to the student's own account and NOWHERE else; only the NAME is counted.
        // (PERF-3: loaded only now - the notes writer and the Firestore bridge are not in the entry.)
        let ok = false;
        try {
          const { saveFeedbackNote } = await import("./feedbackNotes");
          ok = await saveFeedbackNote({
          uid: opts.uid ?? "",
          text,
          kind,
          surface: flow?.surface ?? "unknown",
          topicKey: flow?.topicKey ?? null,
          moment,
          });
        } catch {
          ok = false;
        }
        if (ok) trackFeedbackEvent("next", moment, undefined, "note_saved");
        return ok;
      }}
      onDone={unmount}
      onHandOff={() => {
        // The card is staying a moment past its scorecard (it is naming where to tap): do not remove it with that scorecard.
        if (mounted && mounted.root === root) mounted.handedOff = true;
      }}
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
    // FIRST-FEEDBACK-1 (ruling 0b.3): `first_graded` is once EVER, so it is exempt from the
    // one-per-page-load rule too — but never while another card is open (`mounted`).
    // FEEDBACK-2: the repeat ask is also exempt from the page-load rule (it has its own once-per-session flag).
    const graded = isGradedMoment(moment);
    const blocked = () =>
      mounted !== null ||
      (shownThisLoad && !graded) ||
      (moment === AFTER_GRADED_MOMENT && gradedAskedThisSession());
    if (blocked()) return false;
    // The address the ask started on: a slow check must not draw a card on a page the student has left.
    const startedAt = req.graded?.getAddress?.();
    const uid = req.uid ?? (await currentStudentUid());
    if (!uid) return false;
    if (blocked()) return false; // re-check after the await
    const nowMs = Date.now();
    // FIRST-FEEDBACK-1 (review fix 1): only on the student's FIRST graded result — an
    // existing student with an earlier graded record on this device is never asked, and
    // records that are missing or unreadable mean "unknown", so nothing is shown.
    if (moment === FIRST_GRADED_MOMENT && firstResultState(loadLocalSessionRecords(uid), nowMs) !== "first") return false;
    // FEEDBACK-2: the repeat ask needs a LATER graded result (the earlier one is on the device).
    if (moment === AFTER_GRADED_MOMENT && firstResultState(loadLocalSessionRecords(uid), nowMs) !== "not_first") return false;

    // FEEDBACK-2 — who is drawn. Hidden mascots: the plain card, not a mascot appearance, not counted.
    // Otherwise the H3 budget (feedbackBudget.ts) decides whether the card may appear AT ALL, and it is
    // asked BEFORE the device record is claimed so a "no" costs the student nothing. Another mascot
    // already on screen (Ziggy's own scorecard reaction): the card is plain, and not counted either.
    let withZiggy = false;
    let flow: GradedFeedbackContext | null = null;
    if (graded) {
      const hidden = mascotsHidden();
      // Another mascot on screen (the scorecard's own Ziggy / Byte) -> a plain card, which is better than not
      // asking. The sidebar's always-on voice row does not count.
      withZiggy = !hidden && !anyMascotHost((el) => !isSidebarMascot(el));
      if (req.graded) flow = { ...req.graded, writtenGradedEver: await writtenGradedEver(uid) };
      if (blocked()) return false; // re-check after the second await
      // The scorecard that asked may have been closed (or left) while the written-answer check ran.
      if (req.graded?.isAlive && !req.graded.isAlive()) return false;
      if (req.graded?.getAddress && req.graded.getAddress() !== startedAt) return false;
    }

    if (!claimFeedbackMoment(deviceStore(), uid, moment, nowMs, req.trialKey ?? null)) return false;
    // FIRST-FEEDBACK-1 (review fix 2): `first_graded` does not use up this page load's one
    // prompt, so a paywall or trial-end moment later in the load is still asked.
    if (!graded) shownThisLoad = true;
    if (graded) markGradedAskedThisSession();
    // The budget is told when Ziggy is actually DRAWN (the card calls back once), not when it is asked for:
    // he steps aside if another mascot turns up, and then nothing was spent.
    renderFeedbackPrompt(moment, { flow, withZiggy, uid });
    return true;
  } catch {
    return false;
  }
}

/** The paywall moment: an upgrade sheet/modal was closed WITHOUT going to plans. */
export function notifyPaywallDismissed(): void {
  void requestFeedbackPrompt("paywall");
}

/**
 * FIRST-FEEDBACK-1 / FEEDBACK-2 — a live graded scorecard has just been shown. Fire and forget;
 * signed-out / anonymous visitors get nothing (the uid comes from Firebase Auth).
 *
 *   the student's FIRST graded result  -> `first_graded` (once ever on the device);
 *   a LATER graded result              -> `after_graded` (at most once per 7 days, once per session);
 *   no readable record of this result -> nothing (fail closed).
 *
 * `context` is what the scorecard (inside the router) hands in so the card's buttons can navigate
 * with the router's own `navigate`. Without it the card still asks and says thanks.
 */
export function notifyFirstGradedResult(context?: GradedFeedbackContextInput | null): void {
  void (async () => {
    try {
      const uid = await currentStudentUid();
      if (!uid) return;
      const state = firstResultState(loadLocalSessionRecords(uid), Date.now());
      if (state === "first") await requestFeedbackPrompt(FIRST_GRADED_MOMENT, { uid, graded: context ?? null });
      else if (state === "not_first") await requestFeedbackPrompt(AFTER_GRADED_MOMENT, { uid, graded: context ?? null });
    } catch {
      /* never into the page that asked */
    }
  })();
}

/** Test seam: forget this page load's prompt and remove any card. */
export function __resetFeedbackHostForTests(): void {
  shownThisLoad = false;
  gradedAskedInMemory = false;
  try {
    window.sessionStorage.removeItem(GRADED_ASKED_SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
  unmount();
}
