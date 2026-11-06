import { trackOnboardingEvent } from "../analytics/analytics";
import { currentUaClass } from "./authSignal";

/**
 * LOGIN-FIX-2 — WHY AND WHERE A STUDENT LEFT A SIGN-IN THEY HAD STARTED.
 *
 * LOGIN-FIX-1's funnel (6 Nov 2026): 36 visitors fired `login_attempt`, 30 `login_success`, 4
 * `login_error`, and about 2 left with NO event at all. Owner ruling 6 Nov 2026: new events may
 * be added to size that silent loss.
 *
 *   login_abandon  once per attempt, when the page goes away (or the student leaves /login inside
 *                  the app) after `login_attempt` and before `login_success` / `login_error`.
 *   login_step     each phone step the student reaches (otp_sent, otp_entered), so the funnel
 *                  attempt -> otp_sent -> otp_entered -> success is visible.
 *
 * Every property is from a closed set: method, step, a time bucket, the coarse ua_class, why the
 * event fired (`trigger`) and whether the page was EXPECTED to go away (`leave`). No email, phone,
 * uid, code, name or raw user agent. Same onboarding sender as every login_* event (GA4 + Vercel).
 *
 * ★ WHEN IT FIRES — pagehide / freeze / leaving the route, and NEVER on visibilitychange alone.
 * "Hidden" is the NORMAL state of a live sign-in on a phone: the student switches to the SMS app
 * to read the OTP, and a Google popup on Android opens as a new tab in front of /login. Firing on
 * hidden would count both as abandonment. Instead:
 *   - `pagehide`   the document itself is going away: tab or window closed, reload, a link out,
 *                  the Google redirect. A switch to the SMS app and back never fires it.
 *   - `freeze`     Chrome's Page Lifecycle signal that a HIDDEN tab has been frozen (Android does
 *                  this after minutes in the background, or before discarding it). This is the
 *                  "hidden for long and never came back" case the phone OS would otherwise kill
 *                  silently. It is tagged trigger=freeze, so a rare frozen-then-resumed student
 *                  can be read apart from a closed tab.
 *   - `route`      /login unmounted inside the app (e.g. "Back to home") with an attempt still open.
 * Both page listeners are registered in the CAPTURE phase, so they run before a vendor's own
 * unload flush (GA4 batches hits and flushes them on pagehide). The vendors' own transports already
 * survive unload: Vercel's insights script posts with `fetch(..., { keepalive: true })` (read from
 * the served /_vercel/insights/script.js, 6 Nov 2026) and GA4 flushes with sendBeacon.
 *
 * ★ NOT ABANDONMENT — the Google redirect and the Chrome hand-off unload the page on purpose. They
 * are still recorded (so they can be counted), with their own steps (`google_redirect_started`,
 * `chrome_handoff_tapped`) and `leave: "expected"`; a real abandonment is `leave: "abandon"`.
 */

export type AbandonMethod = "google" | "email" | "phone" | "chrome_handoff";

export type LoginStepName =
  | "google_popup_open"
  | "google_redirect_started"
  | "chrome_handoff_tapped"
  | "email_entered"
  | "phone_entered_number"
  | "phone_otp_sent"
  | "phone_otp_entered";

/** Steps reported by `login_step` (the phone funnel between attempt and success). */
export type FunnelStepName = "phone_otp_sent" | "phone_otp_entered";

export type MsBucket = "lt10s" | "10to30s" | "30to120s" | "gt120s";
export type AbandonTrigger = "pagehide" | "freeze" | "route";

/** Steps where the page unloads ON PURPOSE: recorded, but as `leave: "expected"`. */
const EXPECTED_UNLOAD: ReadonlySet<LoginStepName> = new Set(["google_redirect_started", "chrome_handoff_tapped"]);
const FUNNEL_STEPS: ReadonlySet<LoginStepName> = new Set(["phone_otp_sent", "phone_otp_entered"]);

export function msBucket(ms: number): MsBucket {
  if (!Number.isFinite(ms) || ms < 10_000) return "lt10s";
  if (ms < 30_000) return "10to30s";
  if (ms < 120_000) return "30to120s";
  return "gt120s";
}

interface LiveAttempt {
  method: AbandonMethod;
  step: LoginStepName;
  startedAt: number;
  stepsSent: Set<LoginStepName>;
}

export interface LoginAbandonTracker {
  /** A `login_attempt` was just sent: this attempt is now open, at `step`. Replaces any open one. */
  start(method: AbandonMethod, step: LoginStepName): void;
  /** The open attempt moved on. A no-op when none is open. Phone funnel steps also send `login_step`. */
  step(step: LoginStepName): void;
  /** `login_success` or `login_error` was sent (or the student is signed in): nothing to report. */
  end(): void;
  /** The page / route is going away: report the open attempt, once, and close it. */
  flush(trigger: AbandonTrigger): void;
  /** Listen for pagehide (window) and freeze (document). Returns the remover. */
  install(win?: Window): () => void;
  /** Test seam. */
  isOpen(): boolean;
}

/**
 * Elapsed time only, so a MONOTONIC clock: `performance.now()` cannot jump with a device clock
 * change, and the wall-clock date is never read (nothing here depends on what day it is).
 */
function monotonicNow(): number {
  try {
    return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : 0;
  } catch {
    return 0;
  }
}

export function createLoginAbandonTracker(now: () => number = monotonicNow): LoginAbandonTracker {
  let live: LiveAttempt | null = null;

  const sendStep = (attempt: LiveAttempt, step: LoginStepName) => {
    if (!FUNNEL_STEPS.has(step) || attempt.stepsSent.has(step) || attempt.method !== "phone") return;
    attempt.stepsSent.add(step);
    try {
      trackOnboardingEvent("login_step", {
        method: "phone",
        step: step as FunnelStepName,
        ua_class: currentUaClass(),
      });
    } catch {
      /* analytics must never break a sign-in */
    }
  };

  const tracker: LoginAbandonTracker = {
    start(method, step) {
      live = { method, step, startedAt: now(), stepsSent: new Set() };
    },
    step(step) {
      if (!live) return;
      live.step = step;
      sendStep(live, step);
    },
    end() {
      live = null;
    },
    flush(trigger) {
      const attempt = live;
      if (!attempt) return;
      live = null; // once per attempt, whatever happens below
      try {
        trackOnboardingEvent("login_abandon", {
          method: attempt.method,
          step: attempt.step,
          ms_since_attempt: msBucket(now() - attempt.startedAt),
          ua_class: currentUaClass(),
          leave: EXPECTED_UNLOAD.has(attempt.step) ? "expected" : "abandon",
          trigger,
        });
      } catch {
        /* analytics must never break the page */
      }
    },
    install(win = typeof window !== "undefined" ? window : (undefined as unknown as Window)) {
      if (!win) return () => {};
      const onPageHide = () => tracker.flush("pagehide");
      const onFreeze = () => tracker.flush("freeze");
      const doc = win.document;
      try {
        win.addEventListener("pagehide", onPageHide, { capture: true });
        doc?.addEventListener("freeze", onFreeze, { capture: true });
      } catch {
        return () => {};
      }
      return () => {
        try {
          win.removeEventListener("pagehide", onPageHide, { capture: true });
          doc?.removeEventListener("freeze", onFreeze, { capture: true });
        } catch {
          /* already gone */
        }
      };
    },
    isOpen() {
      return live !== null;
    },
  };
  return tracker;
}
