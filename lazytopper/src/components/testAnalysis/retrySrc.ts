// src/components/testAnalysis/retrySrc.ts
//
// TS-ANALYSIS-1 — the `src` tag a test re-attempt link carries. Kept in its own tiny module so
// Quick Practice (PracticePage) can read it without pulling the analysis model into its chunk.

export const TS_RETRY_SRC = "ts-retry";

/** Quick Practice's count floor for a link: 1 for a re-attempt set (an exact id set of the 1+
 *  questions the student lost marks on), else the caller's floor, unchanged. */
export function retryCountFloor(src: string | null, fallback: number): number {
  return src === TS_RETRY_SRC ? 1 : fallback;
}
