/**
 * GRADING LIMITS — the batch grader's caps, readable by the client.
 *
 * ★ WHY THIS FILE EXISTS. `MAX_BATCH_UPLOADS` was enforced server-side only, in
 * `server/routes/checkSolution.cjs`. Nothing exported it, so the client could not
 * even LEARN the cap: a student who photographed a 13th answer got a bare HTTP 400
 * ("Too many answer photos in one grade — send at most 12.") at the end of a
 * session, with no way for the UI to have said so earlier.
 *
 * ★★ THIS IS A HINT, NEVER THE GUARD. The server keeps enforcing its own cap and
 * keeps returning 400 — a client that ignores this constant, or is stale, or is not
 * our client at all, is still refused. Removing the server check because the client
 * "already knows" would be the failure this comment exists to prevent.
 * `checkSolution.test.cjs` §7.13 pins the 400 and its boundary.
 *
 * ★★ WHY NOT `src/ai/aiClient.ts`, THE OBVIOUS HOME. Three suites `vi.mock` that
 * module with a PARTIAL factory —
 *   src/components/question/SolutionChecker.contract.test.tsx    (one symbol)
 *   src/components/question/SolutionChecker.entitlement.test.tsx (one symbol)
 *   src/services/worksheetGradeService.test.ts                   (one symbol)
 * — so a new VALUE export there is thrown away by the mock and any module reading it
 * under those suites gets `undefined`. An INTERFACE field is erased at runtime and is
 * safe (see `WorksheetGradeQuestionInput.textAnswer`); a runtime constant is not.
 * `src/config/` is mocked by nothing (`grep -rn "vi.mock(.*config/" src/` → 0 hits),
 * which is the whole reason the cap lives here.
 *
 * ⚠ TWO COPIES OF ONE NUMBER — and `gradingLimits.guard.test.ts` is what makes that
 * safe. It reads `checkSolution.cjs` and fails if the two ever disagree, so this
 * cannot drift into a client that promises a cap the server does not honour.
 * THE SERVER IS THE AUTHORITY. If they differ, change the server first.
 */

/**
 * The most per-question answer photos one `/api/grade-worksheet` call accepts.
 * Above this the server returns 400 and grades nothing — never a partial grade
 * presented as complete.
 *
 * ⚠ Mirrors `MAX_BATCH_UPLOADS` in `server/routes/checkSolution.cjs`. Pinned equal
 * by `gradingLimits.guard.test.ts`.
 */
export const MAX_BATCH_UPLOADS = 12;
