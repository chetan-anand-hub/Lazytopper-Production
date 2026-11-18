// src/components/testAnalysis/questionTimes.ts
//
// TS-ANALYSIS-1 (feature 2) — time on screen per question, measured while a Chapter Test or
// Full Mock is being taken. DEVICE-LOCAL ONLY (no server write): localStorage
// `lazytopper.questionTimes.v1` = { [worksheetId]: { at, ms: { [qNumber]: milliseconds } } },
// pruned to the newest MAX_PAPERS papers. Registered in services/studentDataMap.ts.
// A paper sat on paper, on another device, or with storage blocked has no entry → the
// results show "—" for every question (honest unknown, never an estimate).

import { useEffect, useRef } from "react";

export const QUESTION_TIMES_KEY = "lazytopper.questionTimes.v1";
export const MAX_PAPERS = 40;

type Store = Record<string, { at: number; ms: Record<string, number> }>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(QUESTION_TIMES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

/** The stored per-question milliseconds for a paper, or null when none were measured. */
export function loadQuestionTimes(worksheetId: string | null | undefined): Record<number, number> | null {
  if (!worksheetId) return null;
  const entry = readStore()[worksheetId];
  if (!entry || typeof entry.ms !== "object") return null;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(entry.ms)) {
    const n = Number(k);
    if (Number.isFinite(n) && typeof v === "number" && v > 0) out[n] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** Add `deltaMs` to one question's total for a paper (pure merge exported for tests). */
export function mergeQuestionTime(store: Store, worksheetId: string, qNumber: number, deltaMs: number, now: number): Store {
  if (!worksheetId || !(deltaMs > 0) || !(qNumber > 0)) return store;
  const entry = store[worksheetId] ?? { at: now, ms: {} };
  const ms = { ...entry.ms, [String(qNumber)]: (entry.ms[String(qNumber)] ?? 0) + deltaMs };
  const next: Store = { ...store, [worksheetId]: { at: now, ms } };
  const ids = Object.keys(next);
  if (ids.length > MAX_PAPERS) {
    ids
      .sort((a, b) => (next[b].at ?? 0) - (next[a].at ?? 0))
      .slice(MAX_PAPERS)
      .forEach((id) => delete next[id]);
  }
  return next;
}

function addQuestionTime(worksheetId: string, qNumber: number, deltaMs: number): void {
  try {
    const next = mergeQuestionTime(readStore(), worksheetId, qNumber, deltaMs, Date.now());
    localStorage.setItem(QUESTION_TIMES_KEY, JSON.stringify(next));
  } catch {
    /* storage full / blocked: that stretch is simply not measured */
  }
}

/** Gaps longer than this (a sleeping phone, a frozen tab) are not counted as time on a question. */
const MAX_STRETCH_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 15_000;

/**
 * Measure visible time on `currentQNumber` while `active`. Flushes on question change, on the tab
 * going hidden, on deactivation and on a 15 s heartbeat, so a reload loses at most one heartbeat.
 */
export function useQuestionTimes(worksheetId: string | null | undefined, active: boolean, currentQNumber: number): void {
  const since = useRef<number | null>(null);
  const qRef = useRef(currentQNumber);

  useEffect(() => {
    if (!active || !worksheetId) return;
    const flush = () => {
      if (since.current === null) return;
      const now = Date.now();
      const delta = now - since.current;
      since.current = document.visibilityState === "visible" ? now : null;
      if (delta > 0 && delta <= MAX_STRETCH_MS) addQuestionTime(worksheetId, qRef.current, delta);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (since.current === null) since.current = Date.now();
      } else {
        flush();
        since.current = null;
      }
    };
    since.current = document.visibilityState === "visible" ? Date.now() : null;
    qRef.current = currentQNumber;
    const beat = setInterval(flush, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      since.current = null;
      clearInterval(beat);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, worksheetId, currentQNumber]);
}
