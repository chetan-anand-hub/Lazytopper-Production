# J3 — background grading ON: the live check, and how to turn it off

Owner order 2026-10-07 06:14Z (board, Controller A). #1002 sets the `GRADING_JOBS` default to ON, and its cofounder audit covers the switch only.
This file records how the switch is proven live. It also says what an operator does if jobs must be turned off.

## Kill switch (operators)
- Set the Railway variable `GRADING_JOBS` to `0`, `off` or `false` (trimmed, any case) and redeploy. Paper and worksheet grading then returns to the
  synchronous path, byte-identical to before J3.
- **Deleting the variable turns jobs ON**, because the default is ON. An unrecognised value also turns them ON, and the boot log notes it.
- Until the FU-GRADING-ABORTS PR lands, the comment at `lazytopper/server/index.cjs` ("DARK unless GRADING_JOBS=1") is out of date. This file is the
  correct description.

## Who is affected
- Only requests that opt in with `Prefer: respond-async` and the v2 shape. These are the J2 clients: Check & Improve multi-page papers, chapter tests,
  full mocks, worksheets and multi-question practice.
- Single checks (`/api/check-solution`), HPQ and older clients take the synchronous path unchanged.

## Live check rows (run after the #1002 merge)
| row | what | pass |
|---|---|---|
| R0 | an opt-in submit to the deployed backend | 202 + jobId, so the live server is in jobs mode, not merely configured for it |
| R1 | no charge at submit | the usage counter is unchanged immediately after the 202 |
| R2 | charge = graded | after done, the counter moves by graded questions only |
| R3 | a 38-question paper, 3 times (COMPOSITE paper, labelled as such; answers are not real pen handwriting) | 0 "not graded" in each run |
| R4 | a redeploy while a job runs | the job ends honestly: unfinished questions show "not graded" / "interrupted", are not charged, and "grade the remaining" works |
| R5 | single checks | sync 200, unchanged |
| R8 | kill switch | owner only (Railway variable) |

The redeploy for R4 is triggered by merging a docs-only PR. Railway redeploys on every trunk push; the measured time from push to live is about 2 min.
Any regression against production: a revert PR for #1002, merged on green, immediately.
