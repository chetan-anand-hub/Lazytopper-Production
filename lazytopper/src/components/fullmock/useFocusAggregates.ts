// src/components/fullmock/useFocusAggregates.ts
//
// §8b FOCUS / ON-SCREEN TIME — a MEASUREMENT of how much of the exam the student
// actually spent on the exam screen. NOT anti-cheat, and never framed as such:
// `visibilitychange` + window blur/focus can detect a backgrounded tab; they
// CANNOT detect a second device, a book, or another person — we never overclaim.
//
// Rules honoured here (spec §8b):
//   1. The exam clock NEVER pauses — this hook measures, the wall-clock decides.
//   2. AGGREGATES ONLY: activeMs / awayMs / awayEventCount / longestAwayMs.
//      No event log, no keystrokes, no screenshots — these are minors.
//   3. On return, ONE neutral line ("You were away 4:12. The clock kept
//      running.") — no scolding.
//   7. An explicit PAUSE records intent (an incoming call is normal on a phone)
//      — it counts as away time and still does NOT stop the exam clock.
//
// Timed test surfaces only — this hook lives in the fullmock component folder on
// purpose; it must not creep site-wide (§8b.8). Distinct from the legacy
// site-wide `services/focusTracker.ts` daily store, which is untouched.
//
// The aggregates persist through `onPersist` on every transition + a heartbeat,
// so an interrupted session resumes with its history intact (≤ heartbeat lost).

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionFocusAggregates } from "../../services/sessionRecords";

const HEARTBEAT_MS = 15_000;

export const EMPTY_FOCUS: SessionFocusAggregates = {
  activeMs: 0,
  awayMs: 0,
  awayEventCount: 0,
  longestAwayMs: 0,
};

function formatAway(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export interface FocusAggregatesController {
  /** Snapshot INCLUDING the in-flight active stretch — for the scorecard line. */
  snapshot: () => SessionFocusAggregates;
  /** The one neutral on-return line, or null. */
  awayNotice: string | null;
  dismissAwayNotice: () => void;
  /** Explicit pause (§8b.7) — records intent; the exam clock keeps running. */
  paused: boolean;
  pause: () => void;
  resumeFromPause: () => void;
}

/**
 * Measure on-screen aggregates while `active`. `initial` seeds a resumed
 * session's history; `onPersist` receives the latest aggregates on every
 * transition and heartbeat (the caller autosaves them with the session state).
 */
export function useFocusAggregates(
  active: boolean,
  initial: SessionFocusAggregates,
  onPersist: (focus: SessionFocusAggregates) => void,
): FocusAggregatesController {
  const agg = useRef<SessionFocusAggregates>({ ...EMPTY_FOCUS, ...initial });
  const initialRef = useRef(initial);
  const activeSince = useRef<number | null>(null);
  const awaySince = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const persistRef = useRef(onPersist);
  const [awayNotice, setAwayNotice] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    persistRef.current = onPersist;
  }, [onPersist]);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  const flushActive = useCallback((now: number) => {
    if (activeSince.current != null) {
      agg.current.activeMs += Math.max(0, now - activeSince.current);
      activeSince.current = null;
    }
  }, []);

  const goAway = useCallback(
    (now: number) => {
      if (awaySince.current != null) return; // already away — blur + hidden double-fire
      flushActive(now);
      awaySince.current = now;
      agg.current.awayEventCount += 1;
      persistRef.current({ ...agg.current });
    },
    [flushActive],
  );

  const comeBack = useCallback((now: number) => {
    if (awaySince.current == null) return;
    const awayFor = Math.max(0, now - awaySince.current);
    agg.current.awayMs += awayFor;
    agg.current.longestAwayMs = Math.max(agg.current.longestAwayMs, awayFor);
    awaySince.current = null;
    activeSince.current = now;
    // One neutral line (§8b.3) — only worth saying past a blink.
    if (awayFor >= 5_000) {
      setAwayNotice(`You were away ${formatAway(awayFor)}. The clock kept running.`);
    }
    persistRef.current({ ...agg.current });
  }, []);

  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    // (Re)seed on activation: a resumed session carries its persisted history in
    // `initial`; a fresh session carries EMPTY_FOCUS. The seed is read HERE (not
    // at first render) so resuming after mount still restores correctly.
    agg.current = { ...EMPTY_FOCUS, ...initialRef.current };
    activeSince.current = document.visibilityState === "visible" ? Date.now() : null;
    if (activeSince.current == null) awaySince.current = Date.now();

    const onVisibility = () => {
      if (pausedRef.current) return; // an explicit pause already owns the away stretch
      const now = Date.now();
      if (document.visibilityState === "visible") comeBack(now);
      else goAway(now);
    };
    const onBlur = () => {
      if (pausedRef.current) return;
      // Window blur without hidden (e.g. split screen) still counts as away —
      // but only when the tab is genuinely not visible-focused is ambiguous;
      // we count it: the board hall has no second window either.
      goAway(Date.now());
    };
    const onFocus = () => {
      if (pausedRef.current) return;
      comeBack(Date.now());
    };
    const heartbeat = window.setInterval(() => {
      const now = Date.now();
      if (activeSince.current != null) {
        // Roll the in-flight stretch into the aggregate so a killed tab loses
        // at most one heartbeat of activeMs.
        flushActive(now);
        activeSince.current = now;
        persistRef.current({ ...agg.current });
      }
    }, HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      const now = Date.now();
      if (awaySince.current != null) comeBack(now);
      flushActive(now);
      persistRef.current({ ...agg.current });
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const snapshot = useCallback((): SessionFocusAggregates => {
    const now = Date.now();
    const out = { ...agg.current };
    if (activeSince.current != null) out.activeMs += Math.max(0, now - activeSince.current);
    if (awaySince.current != null) {
      const awayFor = Math.max(0, now - awaySince.current);
      out.awayMs += awayFor;
      out.longestAwayMs = Math.max(out.longestAwayMs, awayFor);
    }
    return out;
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
    goAway(Date.now());
  }, [goAway]);

  const resumeFromPause = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    comeBack(Date.now());
  }, [comeBack]);

  return {
    snapshot,
    awayNotice,
    dismissAwayNotice: useCallback(() => setAwayNotice(null), []),
    paused,
    pause,
    resumeFromPause,
  };
}
