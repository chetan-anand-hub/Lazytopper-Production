const FOCUS_ENABLED_KEY = "lazytopper.focus.enabled";
const FOCUS_DAILY_KEY = "lazytopper.focus.daily";
const HEARTBEAT_INTERVAL = 30_000;
const GAP_THRESHOLD = HEARTBEAT_INTERVAL * 2;

export interface FocusSnapshot {
  focusedMs: number;
  totalMs: number;
  percent: number;
}

export interface DailyFocusRecord {
  date: string;
  focusedMs: number;
  totalMs: number;
}

let appStartTs = 0;
let appFocusedMs = 0;
let lastVisibleTs = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let running = false;
let persistedFocusedMs = 0;
let persistedTotalMs = 0;

let studySessionStartTs = 0;
let studySessionFocusedMs = 0;
let studySessionLastVisibleTs = 0;
let studySessionActive = false;

function isVisible(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible";
}

export function isFocusTrackingEnabled(): boolean {
  try {
    const v = localStorage.getItem(FOCUS_ENABLED_KEY);
    return v !== "false";
  } catch {
    return true;
  }
}

export function setFocusTrackingEnabled(on: boolean): void {
  try {
    localStorage.setItem(FOCUS_ENABLED_KEY, on ? "true" : "false");
  } catch {}
  if (!on && running) stopTracking();
  if (on && !running) startTracking();
}

function creditFocusedDelta(fromTs: number, now: number): number {
  const elapsed = now - fromTs;
  if (elapsed <= 0) return 0;
  if (elapsed > GAP_THRESHOLD) return GAP_THRESHOLD;
  return elapsed;
}

function flushVisible(now: number) {
  if (lastVisibleTs > 0) {
    appFocusedMs += creditFocusedDelta(lastVisibleTs, now);
  }
  if (studySessionActive && studySessionLastVisibleTs > 0) {
    studySessionFocusedMs += creditFocusedDelta(studySessionLastVisibleTs, now);
  }
}

function onVisibilityChange() {
  if (!running) return;
  const now = Date.now();
  if (isVisible()) {
    lastVisibleTs = now;
    if (studySessionActive) studySessionLastVisibleTs = now;
  } else {
    flushVisible(now);
    lastVisibleTs = 0;
    if (studySessionActive) studySessionLastVisibleTs = 0;
  }
}

let lastPersistTs = 0;
const PERSIST_INTERVAL = 5 * 60_000;

function heartbeat() {
  if (!running) return;
  if (isVisible() && lastVisibleTs > 0) {
    const now = Date.now();
    flushVisible(now);
    lastVisibleTs = now;
    if (studySessionActive) studySessionLastVisibleTs = now;
    if (now - lastPersistTs > PERSIST_INTERVAL) {
      persistDaily();
      lastPersistTs = now;
    }
  }
}

export function startTracking(): void {
  if (!isFocusTrackingEnabled()) return;
  if (running) return;
  running = true;
  appStartTs = Date.now();
  appFocusedMs = 0;
  persistedFocusedMs = 0;
  persistedTotalMs = 0;
  lastPersistTs = appStartTs;
  lastVisibleTs = isVisible() ? appStartTs : 0;

  document.addEventListener("visibilitychange", onVisibilityChange);
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
}

export function stopTracking(): void {
  if (!running) return;
  heartbeat();
  running = false;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  studySessionActive = false;
  studySessionLastVisibleTs = 0;
  lastVisibleTs = 0;
  persistDaily();
}

export function beginStudySession(): void {
  if (!running) return;
  heartbeat();
  studySessionActive = true;
  studySessionStartTs = Date.now();
  studySessionFocusedMs = 0;
  studySessionLastVisibleTs = isVisible() ? studySessionStartTs : 0;
}

export function endStudySession(): FocusSnapshot {
  if (!studySessionActive) {
    return { focusedMs: 0, totalMs: 0, percent: 0 };
  }
  heartbeat();
  studySessionActive = false;
  const total = Date.now() - studySessionStartTs;
  const focused = Math.min(studySessionFocusedMs, total);
  const pct = total > 0 ? Math.round((focused / total) * 100) : 0;
  const snap: FocusSnapshot = { focusedMs: focused, totalMs: total, percent: pct };
  studySessionLastVisibleTs = 0;
  return snap;
}

function snapshotAppFocus(): FocusSnapshot {
  const total = appStartTs > 0 ? Date.now() - appStartTs : 0;
  const focused = Math.min(appFocusedMs, total);
  const pct = total > 0 ? Math.round((focused / total) * 100) : 0;
  return { focusedMs: focused, totalMs: total, percent: pct };
}

export function getAppFocus(): FocusSnapshot {
  if (running) heartbeat();
  return snapshotAppFocus();
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function persistDaily(): void {
  if (appStartTs === 0) return;
  const snap = snapshotAppFocus();
  const deltaFocused = snap.focusedMs - persistedFocusedMs;
  const deltaTotal = snap.totalMs - persistedTotalMs;
  if (deltaTotal < 10_000) return;
  persistedFocusedMs = snap.focusedMs;
  persistedTotalMs = snap.totalMs;
  try {
    const raw = localStorage.getItem(FOCUS_DAILY_KEY);
    const records: DailyFocusRecord[] = raw ? JSON.parse(raw) : [];
    const today = todayKey();
    const existing = records.find((r) => r.date === today);
    if (existing) {
      existing.focusedMs += deltaFocused;
      existing.totalMs += deltaTotal;
    } else {
      records.push({ date: today, focusedMs: deltaFocused, totalMs: deltaTotal });
    }
    const recent = records.filter((r) => {
      const d = new Date(r.date);
      return Date.now() - d.getTime() < 60 * 86400_000;
    });
    localStorage.setItem(FOCUS_DAILY_KEY, JSON.stringify(recent));
  } catch {}
}

export function getTodayFocus(): DailyFocusRecord {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(FOCUS_DAILY_KEY);
    const records: DailyFocusRecord[] = raw ? JSON.parse(raw) : [];
    const rec = records.find((r) => r.date === today);
    if (rec) return rec;
  } catch {}
  return { date: today, focusedMs: 0, totalMs: 0 };
}

export function getWeeklyFocus(): DailyFocusRecord[] {
  const now = Date.now();
  const weekAgo = now - 7 * 86400_000;
  try {
    const raw = localStorage.getItem(FOCUS_DAILY_KEY);
    const records: DailyFocusRecord[] = raw ? JSON.parse(raw) : [];
    return records.filter((r) => new Date(r.date).getTime() >= weekAgo);
  } catch {
    return [];
  }
}

export function getFocusMessage(percent: number): string {
  if (percent >= 90) return "Outstanding focus!";
  if (percent >= 75) return "Great focus today!";
  if (percent >= 50) return "Good effort — try closing other tabs next time";
  if (percent > 0) return "Getting started — you'll build focus over time!";
  return "Start studying to track your focus";
}
