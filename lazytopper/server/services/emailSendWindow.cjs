'use strict';
/**
 * EMAIL-SEND-WINDOW-1 - one shared clock window for BATCH student emails (nudges, trial-ending, concierge,
 * comeback, pack nudges). Default: 08:00 <= IST time < 21:00. Override with env EMAIL_SEND_WINDOW_IST,
 * e.g. "8-21" (whole hours, 0 <= start < end <= 24). An invalid value falls back to the default and is
 * logged ONCE per process; it never disables sending.
 *
 * NOT for transactional mail (payment receipt, verification, reset): those answer a request and are never windowed.
 * PURE apart from the one-time log.
 */
const MINUTE_MS = 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * MINUTE_MS;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 21;

/** Whole hours (0-23) and minutes of the IST clock at `nowMs`. */
function istClock(nowMs) {
  const d = new Date(nowMs + IST_OFFSET_MS);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
function istHour(nowMs) {
  return istClock(nowMs).hour;
}

/** Parse "8-21" -> { startHour, endHour, valid }. Anything else -> default with valid=false (unset -> valid). */
function parseSendWindow(raw) {
  const fallback = { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, valid: true };
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const m = /^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/.exec(String(raw));
  if (m) {
    const startHour = Number(m[1]);
    const endHour = Number(m[2]);
    if (startHour >= 0 && endHour <= 24 && startHour < endHour) return { startHour, endHour, valid: true };
  }
  return { ...fallback, valid: false };
}

const warned = new Set();

/** Resolve the window from env. Logs once per bad value. Returns { startHour, endHour, label, contains(nowMs) }. */
function resolveSendWindow(env = process.env, log = (l) => console.log(l)) {
  const raw = env && env.EMAIL_SEND_WINDOW_IST;
  const parsed = parseSendWindow(raw);
  if (!parsed.valid && !warned.has(String(raw))) {
    warned.add(String(raw));
    log(`[email-window] invalid EMAIL_SEND_WINDOW_IST=${JSON.stringify(String(raw))} - using the default ${DEFAULT_START_HOUR}-${DEFAULT_END_HOUR} IST (sending is NOT disabled).`);
  }
  const { startHour, endHour } = parsed;
  return {
    startHour,
    endHour,
    label: `${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00 IST`,
    contains: (nowMs) => isWithinSendWindow(nowMs, { startHour, endHour }),
  };
}

/** True when the IST clock at `nowMs` is in [startHour:00, endHour:00). Default 08:00 <= t < 21:00. */
function isWithinSendWindow(nowMs, win = {}) {
  const startHour = win.startHour === undefined ? DEFAULT_START_HOUR : win.startHour;
  const endHour = win.endHour === undefined ? DEFAULT_END_HOUR : win.endHour;
  const { hour, minute } = istClock(nowMs);
  const mins = hour * 60 + minute;
  return mins >= startHour * 60 && mins < endHour * 60;
}

module.exports = { isWithinSendWindow, istHour, istClock, parseSendWindow, resolveSendWindow, DEFAULT_START_HOUR, DEFAULT_END_HOUR };
