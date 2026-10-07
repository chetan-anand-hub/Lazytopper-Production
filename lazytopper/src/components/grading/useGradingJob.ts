// src/components/grading/useGradingJob.ts
//
// GRADING-JOBS-1 J2 — the page-side state of ONE background grade: the rows that have landed
// (`progress`), and an interruption waiting for "grade the remaining N" (`interrupted`).
// Errors are read by NAME (several suites mock aiClient whole).

import { useCallback, useState } from "react";
import type { GradingJobInterruptedError, GradingJobProgress } from "../../ai/gradingJobs";

export function isGradingJobInterrupted(err: unknown): err is GradingJobInterruptedError {
  return !!err && typeof err === "object" && (err as { name?: unknown }).name === "GradingJobInterruptedError";
}

export function isGradingJobGone(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { name?: unknown }).name === "GradingJobGoneError";
}

export interface GradingJobUi {
  progress: GradingJobProgress | null;
  interrupted: GradingJobInterruptedError | null;
  /** Pass as `job.onProgress`. */
  onProgress: (p: GradingJobProgress) => void;
  /** In a catch: true (and kept) when the error is an interruption. */
  captureInterrupted: (err: unknown) => boolean;
  reset: () => void;
}

export function useGradingJob(): GradingJobUi {
  const [progress, setProgress] = useState<GradingJobProgress | null>(null);
  const [interrupted, setInterrupted] = useState<GradingJobInterruptedError | null>(null);
  const onProgress = useCallback((p: GradingJobProgress) => setProgress(p), []);
  const captureInterrupted = useCallback((err: unknown) => {
    if (!isGradingJobInterrupted(err)) return false;
    setInterrupted(err);
    setProgress(null);
    return true;
  }, []);
  const reset = useCallback(() => {
    setProgress(null);
    setInterrupted(null);
  }, []);
  return { progress, interrupted, onProgress, captureInterrupted, reset };
}
