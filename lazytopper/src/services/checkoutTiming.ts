/**
 * CHECKOUT-FAST-1 (part 4) - measure how long a Buy tap takes to reach Razorpay's sheet, and how a checkout ends.
 *
 * Four client events through the EXISTING onboarding/funnel sender (`trackOnboardingEvent`: GA4 + Vercel, coarse slugs and small
 * integers only - no id, no text, no phone, no email, no order id):
 *   checkout_open_ms         { ds, surface, warm }   tap -> Razorpay's iframe loaded (ds = tenths of a second; the sender caps a number at
 *                                                    1000, so 100 s). warm: 1 when checkout.js was already loaded at the tap.
 *   checkout_dismissed       { surface, ds }         the sheet was closed without paying (Razorpay `modal.ondismiss`); ds = open time.
 *   checkout_payment_failed  { surface, code }       Razorpay `payment.failed`; `code` is Razorpay's error CODE only (e.g. bad_request_error).
 *   checkout_open_abandoned  { surface, ds, stage }  the page was hidden / closed before the sheet opened; stage: order | sheet.
 * Each fires at most once per checkout attempt. Where to read them: GA4 -> Events -> <name> (custom parameters ds / surface / warm), or the
 * Vercel Analytics custom-events table. They are vendor events only (not in the first-party activity allow-list): nothing is stored on a student.
 *
 * HOW IT HOOKS IN WITHOUT TOUCHING THE SIX BUY FLOWS: every flow gets Razorpay's constructor from `loadCheckoutScript()` at the Buy tap
 * (in parallel with the order call). That call starts the attempt (`beginCheckoutAttempt`) and hands back an instrumented constructor
 * (`instrumentRazorpay`) that wraps `modal.ondismiss`, the success handler, `on("payment.failed")` and `open()`.
 */

import { trackOnboardingEvent } from "../analytics/analytics";

declare module "../analytics/analytics" {
  interface OnboardingEventParams {
    checkout_open_ms: { ds: number; surface: string; warm: number };
    checkout_dismissed: { surface: string; ds: number };
    checkout_payment_failed: { surface: string; code: string };
    checkout_open_abandoned: { surface: string; ds: number; stage: string };
  }
}

/** The pages that open a checkout, as a closed list of slugs (anything else is "other"). */
const SURFACES: Readonly<Record<string, string>> = {
  "/test-series": "test_series",
  "/packs": "packs",
  "/cbq-packs": "cbq_packs",
  "/board-pass": "board_pass",
  "/for-parents": "for_parents",
  "/pricing": "pricing",
};

export function checkoutSurface(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return SURFACES[p] ?? "other";
}

/** An attempt older than this is not "waiting for the sheet" any more (a failed order is not an abandonment an hour later). */
export const ATTEMPT_WINDOW_MS = 60_000;
/** A click within this long before the loader call is the tap that started the attempt. */
const TAP_LOOKBACK_MS = 1_500;
/** Stop looking for the sheet this long after open(). */
const SHEET_WATCH_MS = 45_000;
const SAFE_CODE = /^[a-z0-9_]{1,40}$/;

interface Attempt {
  startedAt: number;
  warm: boolean;
  surface: string;
  opened: boolean;
  openedAt: number;
  shown: boolean;
  done: boolean;
  failedSent: boolean;
  stopWatching: (() => void) | null;
}

let current: Attempt | null = null;
const shownListeners = new Set<() => void>();

/** CHECKOUT-FAST-1 (part 3): told when Razorpay's sheet is visible, so the "Still connecting" line stops. Returns the unsubscribe. */
export function onCheckoutSheetShown(listener: () => void): () => void {
  shownListeners.add(listener);
  return () => {
    shownListeners.delete(listener);
  };
}
let lastClickAt = -Infinity;
let clickTracking = false;
let cleanupLifecycle: (() => void) | null = null;

const clock = (): number => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());

function emitSafe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* measurement must never break a payment */
  }
}

/** Remember the time of the last click (capture phase, passive): the tap that starts an attempt. Installed once, by the first warm / tap. */
export function ensureTapTracking(doc: Document = document): void {
  if (clickTracking || typeof doc.addEventListener !== "function") return;
  clickTracking = true;
  doc.addEventListener("click", () => { lastClickAt = clock(); }, { capture: true, passive: true });
}

function finish(a: Attempt): void {
  a.done = true;
  a.stopWatching?.();
  a.stopWatching = null;
  cleanupLifecycle?.();
  cleanupLifecycle = null;
}

function ds(ms: number): number {
  return Math.max(0, Math.min(1000, Math.round(ms / 100)));
}

function watchLifecycle(a: Attempt): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const onLeave = () => {
    if (a.done || a.shown) return;
    const waited = clock() - a.startedAt;
    finish(a);
    if (waited > ATTEMPT_WINDOW_MS) return;
    emitSafe(() => trackOnboardingEvent("checkout_open_abandoned", { surface: a.surface, ds: ds(waited), stage: a.opened ? "sheet" : "order" }));
  };
  const onVis = () => {
    if (document.visibilityState === "hidden") onLeave();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onLeave);
  cleanupLifecycle = () => {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onLeave);
  };
}

/**
 * The Buy tap: called by `loadCheckoutScript()` (every buy flow calls it at the tap). Starts a fresh attempt unless one is already
 * waiting for its sheet. `warm`: checkout.js was already on the page.
 */
export function beginCheckoutAttempt(warm: boolean): void {
  emitSafe(() => {
    ensureTapTracking();
    const now = clock();
    if (current && !current.done && !current.shown && now - current.startedAt < ATTEMPT_WINDOW_MS) return;
    const tapAt = now - lastClickAt <= TAP_LOOKBACK_MS ? lastClickAt : now;
    const a: Attempt = {
      startedAt: tapAt,
      warm,
      surface: typeof window !== "undefined" ? checkoutSurface(window.location.pathname) : "other",
      opened: false,
      openedAt: 0,
      shown: false,
      done: false,
      failedSent: false,
      stopWatching: null,
    };
    cleanupLifecycle?.();
    current = a;
    watchLifecycle(a);
  });
}

/** Watch for Razorpay's iframe after open(): the sheet is "visible" when its iframe has loaded. */
function watchForSheet(a: Attempt): void {
  if (typeof document === "undefined" || !document.body) return;
  let observer: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const stop = () => {
    observer?.disconnect();
    observer = null;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  a.stopWatching = stop;
  const shown = () => {
    if (a.shown || a.done) return;
    a.shown = true;
    const ms = clock() - a.startedAt;
    stop();
    cleanupLifecycle?.();
    cleanupLifecycle = null;
    emitSafe(() => trackOnboardingEvent("checkout_open_ms", { ds: ds(ms), surface: a.surface, warm: a.warm ? 1 : 0 }));
    for (const l of Array.from(shownListeners)) emitSafe(l);
  };
  const attach = (): boolean => {
    const frame = document.querySelector<HTMLIFrameElement>(".razorpay-container iframe, iframe.razorpay-checkout-frame");
    if (!frame) return false;
    frame.addEventListener("load", shown, { once: true });
    return true;
  };
  if (!attach()) {
    observer = new MutationObserver(() => {
      if (attach()) {
        observer?.disconnect();
        observer = null;
      }
    });
    observer.observe(document.body, { childList: true });
  }
  timer = setTimeout(stop, SHEET_WATCH_MS);
}

type AnyOptions = {
  handler?: (response: unknown) => void;
  modal?: { ondismiss?: () => void } & Record<string, unknown>;
} & Record<string, unknown>;
type AnyInstance = { open: () => void; on?: (event: string, cb: (response: unknown) => void) => void };
type AnyCtor = new (options: never) => AnyInstance;

const wrapped = new WeakMap<object, unknown>();

/** Razorpay's `payment.failed` payload -> its error CODE only, as a lowercase slug (never the description, source or metadata). */
function failureCode(response: unknown): string {
  const code = (response as { error?: { code?: unknown } } | null)?.error?.code;
  const slug = typeof code === "string" ? code.trim().toLowerCase() : "";
  return SAFE_CODE.test(slug) ? slug : "unknown";
}

/**
 * Wrap Razorpay's constructor: same options in, same instance out, with the four measurements hooked on. Memoised per constructor, so
 * the same one comes back every time. Nothing in the options is read except `handler` / `modal.ondismiss`, which are wrapped to still run.
 */
export function instrumentRazorpay<C>(Ctor: C): C {
  const cached = wrapped.get(Ctor as unknown as object);
  if (cached) return cached as C;
  const Raw = Ctor as unknown as AnyCtor;
  const Wrapped = function (this: unknown, options: AnyOptions): AnyInstance {
    let a = current && !current.done ? current : null;
    if (!a) {
      beginCheckoutAttempt(true);
      a = current;
    }
    const attempt = a as Attempt | null;
    const patched: AnyOptions = { ...options };
    if (attempt) {
      const userHandler = options.handler;
      patched.handler = (response: unknown) => {
        finish(attempt);
        userHandler?.(response);
      };
      const userDismiss = options.modal?.ondismiss;
      patched.modal = {
        ...(options.modal ?? {}),
        ondismiss: () => {
          if (!attempt.done) {
            const openMs = attempt.openedAt ? clock() - attempt.openedAt : 0;
            finish(attempt);
            emitSafe(() => trackOnboardingEvent("checkout_dismissed", { surface: attempt.surface, ds: ds(openMs) }));
          }
          userDismiss?.();
        },
      };
    }
    const instance = new Raw(patched as never);
    if (attempt) {
      const callbacks: Array<(r: unknown) => void> = [];
      let registered = false;
      const fan = (response: unknown) => {
        if (!attempt.failedSent) {
          attempt.failedSent = true;
          emitSafe(() => trackOnboardingEvent("checkout_payment_failed", { surface: attempt.surface, code: failureCode(response) }));
        }
        for (const cb of callbacks) {
          try {
            cb(response);
          } catch {
            /* one listener must not starve the others */
          }
        }
      };
      const originalOn = typeof instance.on === "function" ? instance.on.bind(instance) : null;
      const register = () => {
        if (registered || !originalOn) return;
        registered = true;
        try {
          originalOn("payment.failed", fan);
        } catch {
          /* a missing / throwing hook must never break checkout */
        }
      };
      if (originalOn) {
        try {
          instance.on = (event: string, cb: (response: unknown) => void) => {
            if (event === "payment.failed") {
              callbacks.push(cb);
              register();
            } else originalOn(event, cb);
          };
        } catch {
          /* a frozen instance: the failure event is simply not measured */
        }
      }
      const originalOpen = instance.open.bind(instance);
      instance.open = () => {
        register();
        attempt.opened = true;
        attempt.openedAt = clock();
        emitSafe(() => watchForSheet(attempt));
        originalOpen();
      };
    }
    return instance;
  } as unknown as C;
  wrapped.set(Ctor as unknown as object, Wrapped);
  return Wrapped;
}

/** Test seam: forget the current attempt and click tracking state. */
export function resetCheckoutTimingForTests(): void {
  current?.stopWatching?.();
  cleanupLifecycle?.();
  cleanupLifecycle = null;
  current = null;
  lastClickAt = -Infinity;
}
