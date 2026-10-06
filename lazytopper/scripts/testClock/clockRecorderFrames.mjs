// Stack-frame attribution for clockRecorder.setup.mjs (CI-SPEED-1, D39). A separate module so
// plain node (ci_speed_acceptance.mjs) can test it without importing vitest.

export const RECORDER_FILE_MARK = "scripts/testClock/clockRecorder";

const BACKSLASH = String.fromCharCode(92);
const norm = (s) => String(s).split(BACKSLASH).join("/");

/**
 * A stack frame in REPO source that can own a clock read: under lazytopper/src/ or
 * lazytopper/server/, not node_modules, not the recorder itself, not the global setup file.
 */
export function isRepoFrame(line) {
  const l = norm(line);
  if (l.includes("/node_modules/")) return false;
  if (l.includes(RECORDER_FILE_MARK)) return false;
  if (/\/lazytopper\/src\/test\/setup\./.test(l)) return false;
  return /\/lazytopper\/(?:src|server)\//.test(l);
}

/** The first frame of `stack` that is not the recorder = the code that called Date. */
export function immediateCallerFrame(stack) {
  const frames = String(stack || "").split("\n").slice(1).map((s) => s.trim()).filter((s) => s.startsWith("at "));
  return frames.find((f) => !norm(f).includes(RECORDER_FILE_MARK)) || "";
}
