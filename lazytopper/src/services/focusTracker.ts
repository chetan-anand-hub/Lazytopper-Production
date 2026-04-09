const FOCUS_ENABLED_KEY = "lazytopper.focus.enabled";
const FOCUS_DAILY_KEY = "lazytopper.focus.daily";
const HEARTBEAT_INTERVAL = 30_000;

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

let sessionStartTs = 0;
let focusedMs = 0;
let lastVisibleTs = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

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

function onVisibilityChange() {
  if (!running) return;
  const now = Date.now();
  if (isVisible()) {
    lastVisibleTs = now;
  } else if (lastVisibleTs > 0) {
    focusedMs += now - lastVisibleTs;
    lastVisibleTs = 0;
  }
}

function heartbeat() {
  if (!running) return;
  if (isVisible() && lastVisibleTs > 0) {
    const now = Date.now();
    focusedMs += now - lastVisibleTs;
    lastVisibleTs = now;
  }
}

export function startTracking(): void {
  if (!isFocusTrackingEnabled()) return;
  if (running) return;
  running = true;
  sessionStartTs = Date.now();
  focusedMs = 0;
  lastVisibleTs = isVisible() ? sessionStartTs : 0;

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
  persistDaily();
}

export function getSessionFocus(): FocusSnapshot {
  if (!running) {
    const total = sessionStartTs > 0 ? Date.now() - sessionStartTs : 0;
    const pct = total > 0 ? Math.round((focusedMs / total) * 100) : 0;
    return { focusedMs, totalMs: total, percent: pct };
  }
  heartbeat();
  const total = Date.now() - sessionStartTs;
  const pct = total > 0 ? Math.round((focusedMs / total) * 100) : 0;
  return { focusedMs, totalMs: total, percent: pct };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function persistDaily(): void {
  if (sessionStartTs === 0) return;
  const snap = getSessionFocus();
  if (snap.totalMs < 10_000) return;
  try {
    const raw = localStorage.getItem(FOCUS_DAILY_KEY);
    const records: DailyFocusRecord[] = raw ? JSON.parse(raw) : [];
    const today = todayKey();
    const existing = records.find((r) => r.date === today);
    if (existing) {
      existing.focusedMs += snap.focusedMs;
      existing.totalMs += snap.totalMs;
    } else {
      records.push({ date: today, focusedMs: snap.focusedMs, totalMs: snap.totalMs });
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
