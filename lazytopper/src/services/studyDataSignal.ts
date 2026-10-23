/**
 * MI-CONSISTENCY-1 — the in-tab "study data changed" signal.
 *
 * WHY: the desktop sidebar's Mistake Intelligence card lives in the always-mounted shell, while
 * Home remounts on every visit. Without a signal, after a clean drill Home re-reads and shows the
 * new figures while the sidebar, on the SAME screen, keeps the old ones until a reload. Every
 * write that can move a Mistake Intelligence figure calls `noteStudyDataChanged()`:
 *   - an attempt (practiceInsights.recordAttempt),
 *   - a mistake-log write or resolution (mistakeLogService),
 *   - a session record / per-question payload (sessionRecords),
 *   - the wrong-answer log (adaptivePracticeEngine.saveWrongAnswerLog).
 * The shared Me/Home read (services/meHomeSummary) keys its memo on `studyDataVersion()`, and the
 * cards re-read and re-select when it moves, so every card on the page agrees.
 *
 * A NOTIFICATION ONLY: it carries no data, writes nothing and stores nothing.
 */

let version = 0;
const listeners = new Set<() => void>();

/** Something a Mistake Intelligence figure reads was written on this device. */
export function noteStudyDataChanged(): void {
  version += 1;
  for (const l of [...listeners]) {
    try {
      l();
    } catch {
      /* a listener's failure never blocks a write */
    }
  }
}

/** The current version (bumps on every change; starts at 0). */
export function studyDataVersion(): number {
  return version;
}

/** Subscribe to changes (useSyncExternalStore-compatible); returns the unsubscribe. */
export function subscribeStudyData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
