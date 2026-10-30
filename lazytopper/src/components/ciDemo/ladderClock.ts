/**
 * ONE-MINUTE-1 R4 - the ladder's own stopwatch for `one_min_type_graded`. Started the first time the tap step is shown
 * (when `one_min_tap_shown` fires), read when the typed answer is graded. performance.now() is monotonic and is not a
 * wall-clock read. Null when the ladder never showed in this page load.
 */
let startedAt: number | null = null;

export function markLadderStart(): void {
  if (startedAt !== null) return;
  try {
    startedAt = performance.now();
  } catch {
    startedAt = null;
  }
}

export function secondsSinceLadderStart(): number | null {
  if (startedAt === null) return null;
  try {
    return Math.max(0, Math.round((performance.now() - startedAt) / 1000));
  } catch {
    return null;
  }
}

export function resetLadderClockForTests(): void {
  startedAt = null;
}
