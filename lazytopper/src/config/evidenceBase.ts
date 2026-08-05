/**
 * evidenceBase — the AUTHORITATIVE size of LazyTopper's board-paper evidence base.
 *
 * [FU-EVIDENCE-BASE-CLAIM-INCONSISTENT] — the product used to tell students three
 * different things about the same corpus: "Ten years of real CBSE papers" on Exam
 * Trends, "drawn from 4 years of papers" on Predicted Questions, and "9 years of
 * board data visualised" on the intent screen. Exam Trends and Predicted Questions
 * BOTH rest on this corpus, so two numbers on two surfaces is a student learning
 * that the product does not know its own evidence.
 *
 * ★ OWNER RULING: TEN IS AUTHORITATIVE. Every student-facing surface reads from
 * here — never a literal. Fixing literals into agreement is three future drifts.
 *
 * Guarded by `evidenceBase.guard.test.ts`, which scans the rendered source of
 * `src/pages` and `src/components` for any competing figure.
 *
 * ⚠ This module is intentionally dependency-free and is NOT mocked anywhere, so it
 * is safe for any surface to import (see the `vi.mock` complete-replacement rule).
 */

/** Number of years of real CBSE board papers behind Exam Trends / Predicted Questions. */
export const EVIDENCE_BASE_YEARS = 10;

/**
 * Word form, capitalised, for sentence-initial prose ("Ten years of real CBSE papers").
 * Kept beside the numeral so the two can never drift apart.
 */
export const EVIDENCE_BASE_YEARS_WORD = "Ten";
