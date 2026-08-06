# WAVE 5E STATE - CLOSED 2026-08-06. Trunk `9cfcb09a`. Controller stood down after the handoff.

> **This file, not the controller's context, is the source of truth.** Rewritten WHOLE after every
> subagent returns. UNTRACKED. Archived per Rule 0 as `handoff/WAVE_STATE_WAVE5E_ARCHIVE.md`.
> CONTROLLER NOTES: (1) rewrite WHOLE - regex surgery duplicated it in 5D; (2) after a rewrite, diff
> the SECTION LIST against the previous pass - a uniqueness check is not a completeness check.

TRUNK: 9cfcb09a79c0e87d44b68184d1f073871fdee909   <- re-derived 12x. MOVED 5x: #611,#612,#613,#614,#617.
OPEN PRs: #612 fix(meta): point og:image at the path it is actually served from
          [fix/meta2-og-image-path] - OWNER-AUTHORED, `index.html` ONLY. Disjoint from WIRE-1.
          WIRE-1's PR will appear here once pushed.
MERGED THIS WAVE: #611 (BATCH-1b) at `1def94c8` - verified BY CONTENT (`gradeQuickPracticeBatch`
          present in quickPracticeSessionService.ts at that SHA), not by PR state.

## FIRST ACTIONS - DONE, VERIFIED NOT ASSUMED
- Trunk re-derived. ** DOCTRINE APPLIED ON ITS FIRST USE: a controller's first act is to check
  whether the state file it finds is its OWN. ** None present - 5D's was retired at 5D's close,
  precisely because 5D OPENED by finding Wave 5B's stale live state.
- ** handoff/ ON TRUNK DESCRIBES TRUNK ** (one-commit structural lag, verified by enumeration).
- All three Wave 5E documents written to disk BEFORE dispatch; the `wave 5e` dir did not exist.
- ** CORRECTION TO A STANDING NOTE: the `Write` tool DOES accept `.md` at that path for the
  CONTROLLER. It refused a SUBAGENT in 5D. Not a blanket path block. **

## LANES
| id | verdict | PR | note |
|----|---------|----|------|
| BATCH-1b | **PARTIAL - MERGED** | **#611** | 2 files. CI 31026652352 SUCCESS. `report-BATCH1b-2026-08-05.md` (13449 b). Returned at **3% context** - past the 25% floor |
| WIRE-1 | **BLOCKED, THEN SUPERSEDED - DO NOT DISPATCH** | none | ** owner-ruled option (a). ** Owns `PracticePage.tsx` + `SolutionChecker.tsx` ONLY. ** CANNOT START until #611 is ON TRUNK ** - must not stack |
| FORBID-6 | **PASS - MERGED** | **#614** | ** cheapest next unblock: independent, file-disjoint from everything ** (`scripts/ops/**`). Gates BATCH-2 |
| TELEMETRY-1 | SPEC OWED | - | Gates SERVER-2. Ask is **p90 PER MARKS-BAND** |
| WARM-GATE-1 | SPEC OWED | - | Gates `DATABASE_URL` returning |
| AUTH-1 | **REMOVED FROM MY WAVE 2026-08-06** | - | ALONE, only when every other PR is merged AND closed |

## ★★★ THE FINDING THAT DECIDES WHAT HAPPENS NEXT
** BATCH-1b SHIPPED A COMPLETE, FULLY TESTED, **UNCALLED** FUNCTION. **
`gradeQuickPracticeBatch` works and is proven by 25 new tests. ** NOTHING CALLS IT. ** Quick Practice
still issues one AI call per question. The trigger lives in `PracticePage.tsx` (+ `SolutionChecker.tsx`),
** outside its allowlist. **
★★ ** THIS IS `#578`'s FAILURE MODE REPEATING ONE LAYER UP - inside the lane whose stated subject was
MOUNT != LIVE. ** `#578` shipped a server capability on 1 August that nothing called for four days;
BATCH-1b has now shipped the client capability that nothing calls.
★ ** THE LANE DID THE RIGHT THING: ** it refused to build outside its allowlist, and it wrote the
warning ** into the module header, not only into its report ** - so the next reader of the code sees
it, not just the next reader of the handoff. That is the correct handling of a scope wall.
=> ** MERGING #611 ALONE ADDS A THIRD DEAD CAPABILITY TO THE CODEBASE. ** The wiring lane should be
specced and, ideally, land in the same wave. ** OWNER DECISION - see BLOCKED item 1. **

## BATCH-1b SUBSTANCE (report is the authority - do not work from this)
- ** `#578` LIVE-VERIFY: NOT DISCHARGED, AND NOT DISCHARGEABLE ON THIS BOX. ** No API key exists
  (only `server/.env.example`; no `GEMINI_*`/`GOOGLE_*` in env), and ** `isStubMode()` returns BEFORE
  `buildUploadParts` is reached, so a stub run never enters the interleave. ** Server half proven by
  `checkSolution.test.cjs` sec7 (`# pass 64 # fail 0 # skipped 0`); client half by 25 new tests
  against an injected grader. ** THE HTTP + GEMINI SEAM HAS STILL NEVER EXECUTED. STILL OWED. **
- THE SEAM: `POST /api/grade-worksheet` -> `handleGradeWorksheet` -> `gradeStructuredSet`
  (** module-internal, never exported; a guard forbids exporting it - the HTTP handler is the ONLY
  reachable entry **). Request `{ worksheetId, subject, questions[], imageBase64?, uploads[] }`;
  uploads keyed by `qNumber` ONLY, must name a known question, first-wins de-dup,
  ** cap `MAX_BATCH_UPLOADS=12` **. An uploads-only request IS legal. Reply identifies a question by
  `qNumber` alone; the server builds results by mapping the SENT set.
- `#578`'s `sha256(contents)` byte-identity test did NOT move (zero server files changed) - quoted.
- ** `#606`'s contract suite passes UNMODIFIED - zero edits, zero extensions. **
- Subset proof: 5 displayed / 2 photographed / 1 bare pick -> ONE record, ONE payload,
  `record.questionIds` = all 5, payload results = [1,3,4], `payload.code === record.id`.
- MCQ-with-working IN / without OUT tested BOTH directions, plus a test that flips
  section/format/qType/objective and asserts the disposition does NOT move (i.e. decided by WORKING,
  never by TYPE - which was the specified defect to avoid).
- EXACTLY ONE grade call proven with six photographed answers, each upload holding ITS OWN image
  (off-by-one asserted).
- M1-M4 all RED, and ** every one printed `ASSERT_OK: mutated-sha != baseline-sha` BEFORE the run **
  and `ASSERT_OK: restored-sha == baseline-sha` after. The applied-mutation protocol was used as
  specified. M4 reddened two of `#606`'s own assertions, as intended.

### SPEC CONTRADICTIONS FROM BATCH-1b (3)
1. ** TYPED answers CANNOT be batched. ** `WorksheetGradeQuestionInput` has NO `textAnswer` field.
   The server's own rule-1 clause "grade the typed answer given in its block" refers to something
   `blockFor()` never emits. Classified `typed-no-channel` and RETURNED, not silently dropped.
2. ** This lane cannot make batching live ** (above).
3. `gradeStructuredSet` is module-internal with a guard forbidding its export.

## DISJOINTNESS
BATCH-1b : `src/services/quickPracticeSessionService.ts` (+ contract test, untouched) - LANDED, 2 files
FORBID-6 : `lazytopper/scripts/ops/**`                  - disjoint from all of the above
WIRING    : `src/pages/PracticePage.tsx` + `src/components/.../SolutionChecker.tsx` - ** NOT YET A LANE **
AUTH-1   : `src/pages/Login.tsx` + auth - ALONE, blast radius unbounded pre-grep
LIMIT: I compare DECLARED allowlists; I cannot verify BLAST RADIUS. Parallelism is bounded by RAM
(7.8GB box), not file-disjointness.

## ★ META-2 RUNS IN PARALLEL, OUTSIDE THIS WAVE - NOT MINE, BUT IT SHARES THE PR SPACE
Owner-managed, dispatched outside my wave. ** Paths: `vercel.json` + `src/config/domain.guard.test.ts`. **
It will open a PR.
DISJOINTNESS vs my lanes - ** by DECLARED allowlist, which is the only thing I can compare: **
  FORBID-6            `lazytopper/scripts/ops/**` + new tests          -> disjoint
  combined WIRE/BATCH-2 `src/pages`, `src/services`, `src/components/results` -> disjoint
  META-2              `vercel.json`, `src/config/`                     -> disjoint from both
⚠⚠ ** OWNER INSTRUCTION: if `lane-overlap` ever flags META-2 against one of mine, THAT IS A REAL
SIGNAL, NOT THE PARALLELISM - tell him. ** The declared allowlists say they cannot overlap, so a flag
would mean one of us is wrong about what a lane actually TOUCHES. ★ That is exactly my stated limit:
** I compare DECLARED allowlists; I cannot verify BLAST RADIUS. **
⚠ ** MERGING ONE PR DOES NOT RE-TRIGGER CHECKS ON ANOTHER ** (the #593 lesson, re-proved by #608/#609
in Wave 5D). ** Whoever merges second needs a Lane Overlap re-run - that is a separate step, and it
applies ACROSS the wave boundary here, not just within my lanes. **
NOTE: `vercel.json` is CLAUDE.md section 4 globally-forbidden; META-2 carries explicit owner scoping.
Not my lane, recorded so nobody reads its diff as a scope breach.
★ FORBID-6 was dispatched being told "zero open PRs". ** Stale the moment META-2 opens one - relayed
to it mid-flight ** so it does not treat the appearance as a contradiction to report.

## ★★ DO NOT STACK PRs
`lane_overlap.mjs` compares EVERY open PR against EVERY other, so a stacked PR and its base each see
the other and ** NEITHER CAN MERGE, in either order. ** Recovery without `--admin`: close the stacked
PR -> ** RE-RUN the base's check ** (closing does NOT re-trigger it) -> merge base -> reopen ->
`gh pr update-branch` -> merge.
⚠ ** THIS BINDS THE WIRING LANE: ** it must NOT branch from #611. Either #611 merges first, or the
wiring lane waits. ** Sequence, do not stack. **

## ★ `gh pr ready` IS THE OWNER'S STEP
#611 is a DRAFT and MERGEABLE-BUT-DRAFT. ** I must tell him it is ready; I must never mark it. **

## DECISIONS MADE THIS WAVE
- BATCH-1b dispatched ALONE; FORBID-6 is disjoint but unspecced, so there was nothing to parallelise.
- All wave documents written to disk before dispatch. Model doc COPIED from 5D and SHA-verified
  rather than retyped - retyping an 8KB brief is a transcription-error surface for zero benefit.
- ** I did NOT extend BATCH-1b's allowlist to cover the trigger. ** It returned at 3% context and is
  dead; and a scope extension mid-lane is how disjointness guarantees break. The wiring is a new lane.

## FU ENTRIES COLLECTED THIS WAVE
BATCH-1b: `FU-BATCH-TYPED-ANSWER-NO-CHANNEL` | `FU-BATCH-1B-UNCALLED-SEAM` |
`FU-578-LIVE-VERIFY-STILL-OWED` | `FU-BATCH-UPLOAD-CAP-12`
RESULTS-1: `[FU-SCORECARD-DESKTOP-SCROLL-CEILING]` (LATENT ON TRUNK) | `[FU-QP-DOUBLE-BACK-TAG]` |
`[FU-BATCH-TYPED-ANSWER-NO-CHANNEL]` (re-filed, canonical singular)
FORBID-6: `FU-FORBID6-MUTATION-RUNNER-SHELL` | `FU-FORBID6-DIRTY-MODULE-STATE-BASELINE` |
`FU-SCORECARD-ONRETURN-RECEIVES-EVENT` | `FU-CONV-GATE-SECTION-HEADERS-STALE`
WIRE-1: `[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]` | `[FU-BATCH-QP-DEFER-IS-A-UX-DECISION]` |
`[FU-BATCH-QP-MI-FEED-REHOMING]` | `[FU-WIRE1-ALLOWLIST-ONE-FILE-SHORT]`
Bodies live in `report-BATCH1b-2026-08-05.md`. ** NEVER reconstruct an FU body from its ID. **

## OWNER RULINGS CARRIED IN FROM WAVE 5D
- ** BRANCH CLEANUP: NO, AND NOT LATER. DO NOT RE-OFFER. ** `recovery/lost-trunk-42d82e8` is in that
  list - trunk was lost once and RECOVERED FROM A BRANCH. ** Old branches are the RECOVERY SURFACE. **
  The ~110 stale worktree registrations stay owner-run housekeeping, at session start before locks.
- ** ADD `handoff/MASTER_TRACKER.md` IN THIS WAVE'S HANDOFF ** - owner supplies the content; I write
  the file and must not invent the roadmap.
- ** DOCTRINE: A CONTROLLER'S FIRST ACT IS TO CHECK WHETHER THE STATE FILE IT FINDS IS ITS OWN. **
- The eighth handoff file in 5D was right; "seven paths" was a carried count.

## WIRE-1 - HISTORY ONLY. SUPERSEDED BY DECISION 1 = B. ** DO NOT DISPATCH. ** (kept for the record)
** OWNER RULING: option (a) - a WIRING lane, THIS WAVE. ** His reasoning, recorded because it is the
argument that should survive:
- ** (c) merge-as-dormant is how #578 and MentorSolveDrawer happened. ** A third dead seam is NOT a
  neutral outcome - it is ** the specific pathology this project keeps paying for. **
- ** (b) fold-into-BATCH-2 delays batching behind FORBID-6 for no benefit: ** the callee is PROVEN by
  25 tests, so the wiring is small and independent. ** Waiting buys nothing and grows the dead surface. **

SPEC ON DISK: `...\wave 5e\SUBAGENT_WIRE1_quick_practice_trigger.md` (controller-authored - ★ and it
says so in its own header, because a controller-authored brief is not a safer brief).

** UNBLOCKED 2026-08-05: #611 merged at `1def94c8`. DISPATCHED. ** The rule that governed it:  The owner's own rule binds the
sequence: ** merge #611 first, THEN cut WIRE-1 from trunk. ** WIRE-1 must NEVER branch from #611 -
a stacked PR deadlocks with its own base (Wave 5D, #608/#609). ** The blocking step is the owner's:
`gh pr ready` then merge. **

### WHAT THE SPEC MAKES LOAD-BEARING
★★ ** THE HAZARD: adding the batch WITHOUT removing the per-question path is a NET REGRESSION. **
Spend up, latency up, and possibly two writes for one session. ** So the load-bearing assertion is
not "the batch fires" - it is "EXACTLY ONE call per session AND the per-question path no longer
fires at all", proven in BOTH directions. ** A test that only counts batch calls passes just as
happily when the old path still runs beside it.
★ It is told to grep EVERY per-question invocation before removing one ("the single choke point" was
once 11 invocations across 6 files here) and to say which sites it LEFT and why.
★★ ** WIRE-1 DISCHARGES #578's LIVE-VERIFY - five days owed. ** It is the first real trigger. NOT
dischargeable from a worktree: no API key on the box, and `isStubMode()` returns BEFORE
`buildUploadParts`, so a stub run never enters the interleave. The spec tells it to report exactly
what a real run needs (which env var, entry point, student action) and ** never to report a stub pass
as a live verify - that is precisely how #578 sat dead for five days while looking done. **

## ★ TWO OWNER ANSWERS TO BATCH-1b's QUESTIONS
- ** TYPED ANSWERS: `typed-no-channel` + RETURNING them is CORRECT ** - honest empty state over silent
  drop. The server needs a `textAnswer` field on `WorksheetGradeQuestionInput` before typed working can
  be batched, and ** that is a SERVER lane, not WIRE-1's. **
  ★★ ** UNTIL THEN, BATCHING COVERS PHOTO WORKING ONLY - SAY THAT PLAINLY IN THE HANDOFF so nobody
  records batching as complete. ** `[FU-BATCH-TYPED-ANSWERS-NO-CHANNEL]`
  ★ ID RESOLVED 2026-08-05, OWNER-RULED: ** the LANE's singular `[FU-BATCH-TYPED-ANSWER-NO-CHANNEL]`
  is CANONICAL ** - it filed first and its own report references it, so aliasing to the owner's plural
  would leave that id DANGLING. The plural is recorded as an ALIAS ONLY. ** ONE entry, not two. **
  Corrected in WIRE-1's spec before dispatch.
- ** `MAX_BATCH_UPLOADS=12`: CAP, DO NOT CHUNK. ** A 13th photo means working on 13 questions in one
  session, which is not the shape QP takes (5-10 questions). ★ ** Chunking reintroduces multiple calls
  - the exact thing batching exists to remove - and splitting a set breaks the cross-question pattern
  that IS the product win. ** Cap at 12, name the excluded questions to the student, let them grade
  the rest separately. ** BATCH-2 owns that copy; WIRE-1 only ensures the excluded set is nameable and
  that a 13-upload session does not 400. ** `[FU-BATCH-UPLOAD-CAP-12]`

## ★ CONTEXT-BUDGET RULE TIGHTENED (owner-ruled; now carried in FORBID-6's spec and every later one)
BATCH-1b returned at 3%. It delivered and wrote to disk first, so nothing was lost - but:
> ** At 30%: STOP TAKING NEW WORK. At 25%: WRITE THE REPORT AND RETURN, even mid-task. **
★★ ** THE REASON, recorded WITH the rule because the rule is weaker without it: A LANE AT 3% CANNOT
ANSWER A FOLLOW-UP. ** BATCH-1b delivered only because it wrote its report to disk FIRST. Had I needed
one clarification - which invocation it left, what a real run needs - there was no capacity to give it.
** The floor exists so a lane can be QUESTIONED, not merely finished. ** A partial lane that reports
well is worth more than a complete one that returns empty-handed.

## ★★ LIVE DEFECT FOUND BY THE OWNER - FOUR ROOT URLs 404. FOR META-2 AND THE HANDOFF.
Vite builds with `base:'/app/'`, so public assets serve under `/app/`. ** Four root URLs 404: **
```
/og-image.png   404   (/app/og-image.png  200)   <- #612 fixes this one
/sitemap.xml    404
/llms.txt       404
/favicon.svg    404
```
★★ ** GOOGLE HAS NEVER FETCHED THE SITEMAP. META-1's SEO work was correct and has been landing on
files no crawler can reach. **
⚠ ** MOVING THE REFERENCE IS NOT THE FIX for `sitemap.xml` / `llms.txt` - crawlers look at the ROOT
and always will. ** It needs a `vercel.json` rewrite, and ** `vercel.json` is a GLOBALLY FORBIDDEN
file requiring explicit owner scoping ** (CLAUDE.md section 4 class).
=> ** META-2, THIS WAVE, WITH THE GUARD THAT WOULD HAVE CAUGHT ALL FOUR: fetch every absolute asset
URL the app advertises and assert 200. ** Cofounder owes the spec.
★ This is the same shape as everything else this wave: ** work that is correct and unreachable. **
#578, BATCH-1b's caller, and now META-1's sitemap - three capabilities that exist and cannot be
reached. The guard is always the same: ** assert the thing is REACHABLE, not that it is PRESENT. **

## ★★★ WIRE-1 RETURNED **BLOCKED**, BUILT NOTHING, AND THAT IS THE RIGHT OUTCOME
Report: `...\wave 5e\report\report-WIRE1-2026-08-05.md` (230 lines; its section 7 carries a CORRECTED
buildable design). Worktree left clean at `1def94c8`, zero modifications, never pushed.
★ ** It also declined to run the gates, deliberately: ** zero files modified, so scope:guard / tsc /
mojibake / QP-overlay would be vacuous re-proofs of trunk. ** Reporting them PASS against an empty
diff would be the exact silent no-op this project keeps paying for. ** Correct.
★ It re-verified "still zero callers" rather than carrying my claim. Correct.
★ The `Write` tool refused ITS `.md` report (as it refused COPY-1 in 5D) - it used the shell fallback
and SAID SO. ** Confirms: the refusal is SUBAGENT-specific, not a path block, not a controller issue. **

## ★★★ FOUR FINDINGS AGAINST MY OWN SPEC - I AUTHORED IT, SO THESE ARE MY ERRORS
1. ** THE ALLOWLIST WAS ONE FILE SHORT. ** `PracticePage.tsx` and `SolutionChecker.tsx` are NOT
   adjacent. ** `PracticeQuestionCard.tsx` sits between them and is the ONLY conduit. **
   `SolutionChecker` holds `imageBase64` in LOCAL STATE and lifts only the graded result via
   `onResult`, which fires AFTER the call. ** No repo gate forbids that file - the allowlist can be
   widened by one file for free. ** `[FU-WIRE1-ALLOWLIST-ONE-FILE-SHORT]`
2. ★★ ** IT IS A PRODUCT/UX CHANGE, NOT WIRING - AND MY LOAD-BEARING ASSERTION ENCODED A PRODUCT
   DECISION NOBODY MADE. ** Today the student taps "Check my answer" per question and sees the grade
   ** INLINE, IMMEDIATELY. ** My "the per-question path proven silent" assertion ** DELETES THAT. **
   A lane told "no UI" cannot honestly implement it. ⇒ ** OWNER RULING NEEDED: exam-mode (grade only
   at Finish) vs batch only the answers the student did NOT already check. **
   `[FU-BATCH-QP-DEFER-IS-A-UX-DECISION]`
   ⚠ NOTE FOR THE RECORD: the owner endorsed that assertion as "stronger than mine". ** It was still
   wrong - not as a test-design choice, but because it presumed a product answer. ** Two of us agreed
   and the lane was right.
3. ★★ ** SHARPEST - `#611` SWALLOWS THE 402, AND `#611` IS ALREADY ON TRUNK. **
   `gradeWorksheet` -> `handleJsonResponse` throws `PremiumRequiredError` on 402;
   `gradeQuickPracticeBatch`'s catch is ** UNCONDITIONAL ** and converts it to `outcome:"skipped-error"`.
   ⇒ an unentitled student would finish a session with ** no grades, no UpgradeSheet, no explanation. **
   `SolutionChecker` already carries the comment ** "A LOCKED FEATURE IS NOT A FAULT" from this exact
   defect ** - wiring as specified re-introduces it SILENTLY.
   ⚠⚠ ** SEVERITY, STATED PRECISELY: LATENT, NOT LIVE. ** `gradeQuickPracticeBatch` has ZERO callers,
   so no student can reach it today. ** It goes live the moment any caller ships. ** (Recording it
   precisely because Wave 5C's controller amplified a latent server hole as a live one.)
   ⇒ Fixing it requires `quickPracticeSessionService.ts`, which my brief FORBADE.
   `[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]`
4. ** MI WOULD GO DARK. ** `recordMistake` + `recordAttempt` fire inside `handleCheck`. Deferring
   grading drops the Quick Practice feed into ** the store THE TUTOR READS **, plus
   `saveResult`/`loadSavedResult` caching. ** Entirely unscoped by my brief. **
   `[FU-BATCH-QP-MI-FEED-REHOMING]`
+ ** MY CAP INSTRUCTION WAS HALF WRONG: ** there is NO client-side count cap anywhere in
  `lazytopper/src` (`uploadLimits.ts` is BYTES only), `#611` sends `selection.batch` ** UNCAPPED **,
  and the server hard-400s at `if (uploads.length > MAX_BATCH_UPLOADS)`. And `QuickPracticeBatchResult`
  has ** no over-cap/excluded field **, so "nameable" must be COMPUTED in PracticePage, not read.

## THE PER-QUESTION PATH - ENUMERATED (the one thing my spec asked for that came back clean)
`checkSolutionImage` has EXACTLY TWO invocations:
  1. `SolutionChecker.tsx` `handleCheck` - the Quick Practice one (in scope)
  2. `DesktopCheckImprovePage.tsx` - ** LEFT, different surface **
`SolutionChecker` has TWO mounts: `PracticeQuestionCard.tsx` (Quick Practice) and
`HighlyProbableQuestions.tsx` - ** LEFT, different surface. **
★ NB the QP-overlay gate's four surviving FORBIDDEN entries are `predictionDataService.ts`,
`practiceSetGenerator.ts`, `tutorRoundTrip.ts`, `sessionRecords.ts` - ** `PracticeQuestionCard.tsx` is
NOT among them **, so widening the allowlist to it breaks no gate.

## ★★ `#578` LIVE-VERIFY - NOW SIX DAYS OWED, AND BLOCKED BEHIND A RULING
A real run needs: ** `GEMINI_API_KEY` on the API server ** (absent here; `isStubMode()` still returns
before `buildUploadParts`) - entry `POST /api/grade-worksheet` -> `gradeStructuredSet` with a
** NON-EMPTY `uploads` array ** - student action = Quick Practice, 2+ questions with photographed
working, then Finish. ** THAT ACTION DOES NOT YET EXIST. **
⇒ ** The live-verify is blocked behind the trigger, and the trigger is blocked behind an owner
ruling. ** No stub run is being passed off as one.

## ★★★ OWNER RULINGS 2026-08-05 - DECISION 1 = B, DECISION 2 = A. THEY RESHAPE THE WAVE.

### DECISION 1: ** OPTION B - QUICK PRACTICE BECOMES EXAM-SHAPED. **
Nothing grades per question. ** ONE batched call at Finish. **
★ ** MY OPTION-A RECOMMENDATION IS DISREGARDED IN FULL. ** It contradicted the owner's OWN LOCKED
DESIGN: the BATCH-2 spec's section 1 is headed ** "THE FLOW - owner-locked" ** and reads *"Each saved
answer is held in session state. NOTHING is graded yet."* ** Settled before this wave began. **

#### THE FLOW, AS RULED
TODAY: question -> tap "Check my answer" -> panel (Type my working / Upload a photo) -> tap green
"Check my answer" -> ~17 s wait -> grade inline.
AFTER: question -> tap panel open -> SAME two tabs, SAME upload zone, SAME QR scan-from-phone ->
tap ** "SAVE MY ANSWER" ** -> saved instantly. ** No wait, no AI call. **
★ ** THE SUB-LINE IS LOAD-BEARING (owner-locked copy): ** *"Your answer - upload or type your working,
  graded at the end of the session."* ** A student who taps Save expecting a grade will think it is
  broken. The words must say WHEN. **
★★ ** RELABEL THE OUTER TRIGGER. ** The button that OPENS the panel also reads "Check my answer" today
  and after this it ** checks nothing. ** "My answer" / "Answer this". BATCH-2 owns exact copy, but
  ** leaving it is the label-versus-content mismatch that has bitten this project four times. **
- After saving: a confirmed state per question with ** REPLACE and REMOVE. **
- ** "Show steps" still works INSTANTLY and stays FREE ** - immediate help is not lost.
AT FINISH:
  1. ** MCQs score INSTANTLY and FREE ** - browser-side, no AI. The student does not wait on the batch
     for the easy half.
  2. ** A confirmation step NAMES anything unanswered: ** `[ Grade my N answers ] [ Go back and add Q4, Q9 ]`
     ★ Batching means ONE shot; a forgotten question would otherwise cost a second call.
  3. ONE batched call -> the results.
★★ ** WHAT THE STUDENT GETS - NOT A REDUCTION: ** per written answer, the same board-style depth C&I
gives TODAY (marks awarded over available, verdict, examiner note saying WHERE marks went, corrected
working, mistake type) ** PLUS what C&I cannot give: a SCORECARD ACROSS THE SET ** - total, section
breakdown, paper-level read.
⇒ ** Batching changes WHEN and HOW MANY CALLS, not WHAT A STUDENT GETS PER ANSWER. **
★★ IN THE BATCH - ** BY WORKING, NEVER BY TYPE: ** MCQ option only -> NOT batched (local, free) |
MCQ + working -> BATCHED (0/1 always, never step-marked, plus a mistake type) | Subjective -> BATCHED |
Skipped -> NOT batched, ** named at the confirmation step. ** Test BOTH directions; deciding by type
is the defect. ★ Section-A 1-markers are 0/1 binary always - working there serves ** mistake diagnosis
only, never the mark. **

### ★★ RETRACTION - A CLAIM THAT TRAVELLED THROUGH BOTH OUR DOCUMENTS
The claim: *batching produces "one artefact showing three consecutive answers lost marks on units,
which five separate checks never produced".* ** FALSE. **
** Mistake Intelligence reads the STORE. Five records from five calls look identical to MI as five
from one. The cross-question pattern is an MI-LAYER property, not a grader-call property. **
⇒ ** Batching buys COST and LATENCY ** (thinking is 80.9% of output-rate spend; 17.0 s average)
** and a coherent RESULTS SURFACE. ** Nothing else.
It reached three cofounder documents ** and two of mine ** - WIRE-1's spec section 2b and this state
file's cap ruling, ** both now corrected. ** ⚠ The ** cap-not-chunk RULING SURVIVES ** on its other
grounds (a 13th photo is not QP's shape; chunking reintroduces calls = cost); ** only this
justification is void. ** A retraction travels as far as the claim did.

### DECISION 2: ** OPTION A - WIDEN THE ALLOWLIST. My reasoning for B is VOID. **
I argued 1A kept the 402 latent because the inline path still surfaces it. ★ ** UNDER B THERE IS NO
INLINE PATH. ** The batched call is the ONLY paid call in Quick Practice, so a free-past-trial student
pressing Finish gets a 402 - and if `quickPracticeSessionService` swallows it, they get ** SILENCE:
no grades, no explanation. ** ⇒ ** The 402 fix is MANDATORY IN THE SAME PR. **
COMBINED-LANE ALLOWLIST: `PracticePage.tsx`, `PracticeQuestionCard.tsx`, `SolutionChecker.tsx`,
`quickPracticeSessionService.ts`, `ResultsScorecard.tsx` + tests.
★ `PracticeQuestionCard.tsx` confirmed as the only conduit - my WIRE-1 spec missed it.
★ ** `#606`'s contract test may be EXTENDED, never weakened. **

### ★★ A REQUIREMENT NEITHER OPTION NAMED - IT GOES IN THE COMBINED BRIEF
Checked answers feed MI via `handleCheck` -> `recordMistake`. Batched answers write a `SessionRecord`.
** DIFFERENT PATHS. Under B the per-question path is GONE, so if the batched path does not also record
mistakes, MISTAKE INTELLIGENCE STOPS BEING FED BY QUICK PRACTICE ENTIRELY ** - the moat going dark,
silently, on the product's highest-traffic surface. ** The lane must PROVE the batched path feeds MI,
with a test AND a mutation. **

## ⚠⚠ MY INSTRUCTION CAUSED AN OVER-BROAD PROCESS KILL - CONTROLLER ERROR, RECORDED IN FULL
FORBID-6's stand-down force-killed ** every process whose Path matched `*LT-worktrees*` **, not just
its own worktree's. ** That glob is MINE - I wrote it into the dispatch. **
★ ** IN WAVE 5D I HAD THIS RIGHT ** and said *"Leave processes belonging to other paths alone - one is
COPY-1's, running concurrently."* ** I dropped that qualifier for FORBID-6 because there were no
lane-mates AT DISPATCH TIME. ** META-2 started afterwards.
=> ★★ ** THE LESSON: A "NO LANE-MATES" ASSUMPTION BAKED INTO AN INSTRUCTION GOES STALE THE MOMENT A
PARALLEL LANE STARTS. Scope the blast radius to the lane's OWN worktree ALWAYS, never to the shared
parent - the safety must not depend on who else happens to be running. **
OBSERVED, and stated as observation not proof:
  - ** META-2 completed and MERGED as `#613` ** - it was not interrupted.
  - A process under a DIFFERENT worktree (`name1-capture`) is alive right now.
  ⇒ ** No harm is visible. "No harm visible" is not "no harm" - I cannot prove nothing was killed. **
** FIX, APPLIED TO EVERY FUTURE DISPATCH: ** scope by the lane's own path, e.g.
`Get-Process | Where-Object { $_.Path -like "*LT-worktrees\<lane>\*" }`, and keep the explicit
"leave other paths alone" sentence ** unconditionally, not only when a lane-mate is known. **

## ★★ FORBID-6 (PASS) - #614 DRAFT. THE ARC IS UNBLOCKED.
CI 31033090325 SUCCESS - `Tests 1310 passed (1310)` / `Test Files 107 passed (107)`, ops matrix
`# skipped 0` x8. ** Lane Overlap 31033091415 SUCCESS - NO flag against META-2 ** (the disjointness
held under the real check, not just on declared allowlists).
`ResultsScorecard.tsx` diff EMPTY, verified by SHA (`992d3734bf88...6317b73`), never `git diff`.
- ** MAP AT `9717248c`: EXACTLY THREE `const FORBIDDEN = [` arrays ** - #606's count STILL TRUE.
  CONV carried ResultsScorecard (+5 others), OVL carried it (+2), QP-overlay did NOT (4 entries).
  ** BOTH carrying gates amended IN ONE PR ** - the both-or-neither rule satisfied.
  Swept FROZEN / ZERO_DIFF / "shows zero changes" / "must not change" across `lazytopper/scripts/**`:
  ** no other zero-diff construct exists. **
- ★★ ** WHAT THE BAN WAS ACTUALLY BUYING - AND IT WAS NOT WHAT ANYONE ASSUMED: NEITHER GATE ASSERTED
  ONE BYTE OF RENDERED BEHAVIOUR. ** CONV is source regexes; OVL's HUNK C checks the page BUILDS a
  returnTicket, never that the scorecard RENDERS it; `scorecardVariants.test.ts` covers the BUILDERS,
  not the shell. ⇒ the entries were the ENTIRE protection for: (a) ** the return ticket reaching a
  clickable button in BOTH footer layouts - drop an action, drop onClick, or reorder and the tutor
  overlay is IMPOSSIBLE TO CLOSE with nothing red **; (b) Escape/close/dim behaviour and listener
  cleanup; (c) ** honest numbers ** - no deflated 0 behind allPending, no fabricated "across G of T
  graded", no invented 0/0 MCQ line, attempts never rendered as marks; (d) the deferred guard;
  (e) purity, which is WHY a Practice-side variant cannot alter C&I.
- ★★ ** DOES THE REPLACEMENT FORBID ADDING A VARIANT? NO ** - quoted:
  `it("an UNRECOGNISED future surface renders the full shell, unchanged", ...)`. Nothing enumerates
  `ScorecardSurface`; `scorecardVariants` imported ** TYPE-ONLY **. Both gates assert the openness
  block still exists. ** The over-pin trap was avoided deliberately. **
- C&I-unchanged proven DIFFERENTIALLY (C&I-after-C&I vs C&I-after-Practice-variant, innerHTML
  equality, 3 controls). 10 component mutations + 6 gate mutations, ALL RED, all restored by SHA.
- CONV's unconditional membership check ** named ResultsScorecard and NOTHING ELSE ** - deleting it
  would have cost the gate its only unconditional guarantee, so it was ** replaced by a loop over the
  five survivors. ** OVL's hardcoded 3-item loop had only its ResultsScorecard line removed.
- INVERSE assertions added to BOTH gates, proven RED by G1/G2.
### FORBID-6's FINDINGS AGAINST ITS OWN SPEC (4) - two are against ME
1. ** `returnTicket` does NOT live in `ResultsScorecard.tsx` ** - it is defined in
   `scorecardVariants.ts` (unbanned). The banned file's half is rendering `variant.actions`
   faithfully, which is what it pinned instead.
2. ★★ ** MY SPEC'S section 3 ROW 3 ("each existing variant still renders its documented states")
   WOULD HAVE PINNED THE VARIANT SET - the exact trap my own section 2 warned against. ** It pinned
   the shell's rendering rules instead. ** I wrote the warning and then wrote the violation two
   paragraphs later. **
3. ** Its own first mutation run reported ALL-10-RED FALSELY ** - `execSync` used cmd.exe so
   `./node_modules/.bin/vitest` never ran. Caught; re-run via `node vitest.mjs` behind a hard
   ** "VITEST NEVER RAN" ** guard. *(Same class as the CRLF no-op: the runner, not the test, was the
   silent failure.)*
4. ** Its own first draft of the C&I-identity test was a SILENT NO-OP ** - M10 survived green because
   earlier tests had dirtied module state so both captures carried the leak equally. Fixed to a
   differential assertion ** before the ban was lifted. **
### ★ STILL BANNED AFTER THIS LANE - the combined lane must know
`sessionRecords.ts` is in TWO gates (OVL + QP-overlay). `checkImproveGradeService.ts` is in TWO
(CONV + OVL). ** If the combined lane needs either, the same both-or-neither rule applies. **

## ★★ #614 MERGED 2026-08-06 - THE ARC IS UNBLOCKED. NEXT = THE COMBINED LANE.
Owner APPROVED and instructed me to `gh pr ready` + merge. ⚠ ** I did it on his EXPLICIT instruction,
departing from the standing "the owner merges product PRs" default. ** Recorded so the default is not
read as having changed: it has not. Remote diff verified first - exactly the 3 declared files, and
`ResultsScorecard.tsx` ABSENT (the lane changed the PROTECTION, never the FILE).
⚠ ** #614 came back BEHIND ** because META-2 (#613) merged after FORBID-6 branched -> `gh pr
update-branch` -> full CI re-run (quality-gate 5m37s, lane-overlap 12s, all green) -> merged.
** That is the predicted cost: each merge forces the rest to rebase and re-run. **
★ ** HOW THE LIFT WAS VERIFIED, precisely: ** `ResultsScorecard` still appears 11x in CONV and 9x in
OVL - ** but that is the TOKEN, not array MEMBERSHIP ** (extended comment blocks + the inverse
assertion mention the name). ** The proof is that `FORBIDDEN(lifted): ResultsScorecard.tsx is NOT in
the guarded set` is present in BOTH gates and CI PASSED - a passing inverse assertion is
machine-checked evidence the entry is gone. ** I did not read gate source to confirm it.

## ★★ DOCTRINE ADDED 2026-08-06 - OWNER-NAMED
** A WARNING IN YOUR OWN BRIEF DOES NOT PROTECT YOU FROM THE THING IT WARNS ABOUT. **
FORBID-6's spec section 2 warned in bold against pinning what the file happens to do today - and my
section 3 row 3, ** two paragraphs later **, told the lane to pin that each existing variant renders
its documented states, which is exactly the variant-set over-pin. ★ ** Same shape as the CLAUDE.md
error: the discipline was PRESENT and applied SELECTIVELY. **
=> ** PROCESS CHANGE, APPLIES TO EVERY BRIEF I WRITE FROM NOW: re-read the acceptance criteria
against my own section-2 warnings BEFORE dispatch. ** The warning and the criteria are written
minutes apart and never checked against each other.

## ★★ `[FU-FORBIDDEN-BANS-MASK-ABSENT-COVERAGE]` - BIGGER THAN THE LANE
FORBID-6's central finding: ** NEITHER gate asserted one byte of rendered behaviour. ** Those
FORBIDDEN entries were the ENTIRE protection for the return ticket reaching a clickable button - drop
an action or its `onClick` and ** the tutor overlay becomes impossible to close, with nothing red. **
=> ** EVERY REMAINING ZERO-DIFF BAN MAY BE PROTECTING SOMETHING NO TEST COVERS. When the next ban
lifts, expect to WRITE the coverage, not find it. ** Budget the lane accordingly.
Remaining zero-diff entries after #614: CONV 5 | OVL 2 | QP-overlay 4.

## ★ CORRECTIONS CARRIED TO THE COMBINED LANE
- ** `returnTicket` does NOT live in `ResultsScorecard.tsx` ** - it is defined in
  `scorecardVariants.ts`, which was NEVER banned. The banned file's half of the contract is rendering
  `variant.actions` faithfully. ** A straight correction to the cofounder's spec; carry it. **
- ** `sessionRecords.ts` is in TWO gates (OVL + QP-overlay); `checkImproveGradeService.ts` is in TWO
  (CONV + OVL). BOTH-OR-NEITHER if the combined lane needs either. **
- ** The replacement contract does NOT forbid adding a variant ** - quoted and proven. The combined
  lane may add its Quick Practice variant.
- ** The over-broad process-kill glob was the COFOUNDER's, in every standalone spec issued 2026-08-05
  (META-2, NAME-1, META-3); my dispatch inherited it. He has corrected NAME-1 mid-flight. ** My fix
  stands and is now unconditional: scope by the lane's OWN worktree path, and keep "leave other paths
  alone" ** whether or not a lane-mate is known to exist. **

## ★★★ THE COMBINED LANE IS SPLIT - OWNER-RULED 2026-08-06. NOTHING DISPATCHES UNTIL BOTH BRIEFS LAND.
```
RESULTS-1  --merged & closed-->  WIRE-2
```
- ** RESULTS-1 ** - the Quick Practice variant + per-answer board-style rendering, ** FIXTURE-DRIVEN. **
  No wiring, no trigger change. ** Testable and screenshot-able in isolation. **
- ** WIRE-2 ** - flip the trigger, collect, confirm, ONE batched call, ** feed MI, surface the 402. **
  Small, ** because the results surface already exists by then. **

### ★ WHY THE SPLIT - AND THE FLOOR DIAGNOSIS THAT CAUSED IT
I proposed a HARD 25% CHECKPOINT after three lanes returned at 3%, 6% and 3%. ** Approved - but the
owner correctly identified it is NOT the cause. ** The cause is ** SPEC SIZE **: 250 lines, ten
assertions, four SHA-verified mutations, screenshots and a live probe ** cannot be finished honestly
at 25%. A fourth restatement of the rule would not work. **
★ ** I was treating a CAPACITY problem as a COMPLIANCE problem. ** Recorded because it is the more
useful lesson: ** when a rule is breached three times by three competent lanes, suspect the WORK, not
the wording. ** The checkpoint stays as a backstop; the split is the actual fix.

### ★★ RESULTS-1 SHIPS DORMANT, DELIBERATELY - AND THE SAFEGUARD IS EXPLICIT
By the letter this is a FOURTH dormant capability. ** The owner's distinction, which holds: the
dead-capability failures (#578, BATCH-1b's caller, MentorSolveDrawer) were lanes FORGOTTEN ACROSS
WAVES. WIRE-2's brief is written BEFORE RESULTS-1 dispatches, so there is no gap. **
★★ ** And it is better regardless: the owner rules on the graded sheet BEFORE the loop changes under
students, rather than discovering at live-verify that it reads wrong with the trigger already
flipped. **
⇒ ** MY SAFEGUARD, because what failed for #578 was that NOTHING TRACKED IT: if this wave closes with
RESULTS-1 merged and WIRE-2 not, the handoff MUST say plainly, in `[CURRENT]` and `NEXT_ACTION`, that
the Quick Practice results surface is BUILT AND UNREACHABLE, and name WIRE-2 as the only thing that
makes it live. ** That sentence is the artefact whose absence cost five days on #578.

### SEQUENCING - THEY CANNOT RUN IN PARALLEL, EVEN THOUGH THE FILES ARE DISJOINT
RESULTS-1 : `src/components/results/**` (ResultsScorecard.tsx - ** UNBANNED by #614 ** - + variants + tests)
WIRE-2    : `src/pages/PracticePage.tsx`, `PracticeQuestionCard.tsx`, `SolutionChecker.tsx`,
            `quickPracticeSessionService.ts`
★ ** File-disjoint, but LOGICALLY dependent: ** WIRE-2 must pass data into the variant RESULTS-1
defines, so it would have to code against a shape not yet on trunk - which means STACKING, and
** a stacked PR deadlocks with its own base. ** ⇒ ** STRICTLY SEQUENTIAL: RESULTS-1 merges and closes,
then WIRE-2 is cut FROM TRUNK. **

### WHAT RESULTS-1 MUST CARRY (corrections already established - do not re-derive)
- ** `returnTicket` is defined in `scorecardVariants.ts`, NOT in `ResultsScorecard.tsx`. ** The banned
  file's half was rendering `variant.actions` faithfully.
- ** #614's replacement contract does NOT forbid adding a variant ** - proven and quoted. It asserts
  an UNRECOGNISED future surface renders the full shell, and imports `scorecardVariants` TYPE-ONLY.
  ** RESULTS-1 may add its variant; it must not make that openness test enumerate surfaces. **
- ** `[FU-FORBIDDEN-BANS-MASK-ABSENT-COVERAGE]`: ** the lifted ban was the ENTIRE protection for the
  return ticket reaching a clickable button in BOTH footer layouts, close/Escape/dim behaviour,
  listener cleanup, and ** honest numbers ** (no deflated 0 behind allPending, no fabricated
  "across G of T graded", attempts never rendered as marks). ** RESULTS-1 must not regress any of it -
  #614's contract test now covers them, so it will go red rather than silent. **
- ** `sessionRecords.ts` (OVL + QP-overlay) and `checkImproveGradeService.ts` (CONV + OVL) are each
  still in TWO gates. Both-or-neither if either lane needs them. **

### WHAT WIRE-2 MUST CARRY
- ** The 402: ** `gradeQuickPracticeBatch`'s catch is UNCONDITIONAL and converts `PremiumRequiredError`
  into `skipped-error`. Under exam-shape the batched call is the ONLY paid call, so a free-past-trial
  student pressing Finish gets ** SILENCE - no grades, no UpgradeSheet, no explanation. **
  ** MANDATORY in WIRE-2's PR. ** `[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]`
- ** MI: ** checked answers fed MI via `handleCheck` -> `recordMistake`; batched answers write a
  `SessionRecord`. ** DIFFERENT PATHS. Under exam-shape the per-question path is GONE, so if the
  batched path does not record mistakes, Quick Practice stops feeding Mistake Intelligence entirely -
  the moat going dark, silently, on the highest-traffic surface. PROVE it with a test AND a mutation. **
- ** `#578`'s live-verify discharges here ** - seven days owed, first real student trigger, NOT
  dischargeable from a worktree (`isStubMode()` returns before `buildUploadParts`).
- ** The outer trigger still reads "Check my answer" and will check nothing ** - relabel, or it is the
  label-versus-content mismatch that has bitten four times.

## ★★ BOTH BRIEFS + THE PROTOTYPE RECEIVED AND ON DISK. RESULTS-1 DISPATCHED 2026-08-06.
All three written to disk BEFORE dispatch (`an attached document is not a file`):
  `SUBAGENT_RESULTS1_quick_practice_graded_sheet.md` | `SUBAGENT_WIRE2_flip_quick_practice_to_batch.md`
  `LazyTopper_QuickPractice_BatchGrading_prototype_v2.html` (26673 b)
⚠ ** THE PROTOTYPE ARRIVED MOJIBAKE-ENCODED and I repaired the obvious characters ** (minus signs,
multiplication sign, ellipsis, tick, arrow, middot, half). ** It is the VISUAL authority, so the owner
should eyeball it once. ** RESULTS-1 was told: if a glyph looks wrong in a sample question that is my
transcription, not a design instruction - flag it and use the brief's text, which is authoritative.
** DISPATCH ORDER: RESULTS-1 -> merged AND closed -> WIRE-2 cut from TRUNK. Strictly sequential. **
WIRE-2 passes data into the variant RESULTS-1 defines, so running them together means stacking.

### ★★ THE TWO RISKIEST ASSERTIONS - both relayed to the lane as such
1. ** RESULTS-1, THE OPENNESS TEST. ** `#614` wrote `it("an UNRECOGNISED future surface renders the
   full shell, unchanged", ...)` PRECISELY so a variant could be added. ** The natural instinct when
   adding one is to LIST it there - converting an openness guarantee into a CLOSED SET and forbidding
   the next variant. ** Mutation 4 catches it. ** The owner says it is the first thing he will read. **
2. ** WIRE-2, THE MI FEED. ** Mistakes reach MI via `handleCheck` -> `recordMistake`, and ** that path
   is GONE after WIRE-2. ** If the batched path does not also record mistakes, ** Mistake Intelligence
   stops being fed by Quick Practice ENTIRELY - the moat going dark, silently, on the highest-traffic
   surface. ** Test AND mutation required.

### ★ THE DORMANCY SAFEGUARD IS NOW IN BOTH BRIEFS AND BOTH REPORTS
** If this wave closes with RESULTS-1 merged and WIRE-2 not, the handoff MUST say plainly in
`[CURRENT]` and `NEXT_ACTION` that the Quick Practice results surface is BUILT AND UNREACHABLE, naming
WIRE-2 as the only thing that makes it live. ** Each lane is also told to say it in its own report, so
it reaches me and the handoff independently. ** That sentence is the artefact whose absence cost five
days on #578. **

### ★ PRODUCT DETAIL THAT MUST SURVIVE - RESULTS-1 §1c, verbatim from the prototype
An MCQ with working renders ** 0/1 ** with *"Whole mark or nothing - MCQs are never step-marked"*
AND a diagnosis from the working. ** The mark is binary; the working still produces a mistake type. **
That is the 1-marker ruling as student copy and ** the clearest expression of the product's thesis
anywhere in the design. Do not soften it into partial credit. **

### OWNER-RULED COPY - verbatim in WIRE-2 §2
outer trigger -> ** "Answer this question" ** (it currently says "Check my answer" and checks nothing)
inside panel -> ** "Save my answer" ** | ★ on save -> ** "Saved. Graded when you finish." ** (NEW -
fires at the moment of doubt; a sub-line read once is not four words at the point of action)
-> "Finish session" | "Grade my N answers" | "Go back and add Q4, Q9"

## ★ AUTH-1 IS NO LONGER MINE - REMOVED 2026-08-06
The owner has taken the name/link work to a NEW COFOUNDER SESSION. ** NAME-1 (#616) is his to
live-verify and merge. DO NOT QUEUE AUTH-1 AND DO NOT WAIT ON IT. **
Open owner-run PRs at this dispatch: ** #615 (META-3, sitemap/canonical) ** and ** #616 (NAME-1) ** -
both disjoint from `src/components/results/**`. RESULTS-1 told: a lane-overlap flag against either is
a REAL SIGNAL, not the parallelism.

## ★ ON THE FLOOR - THE OWNER TOOK THE DIAGNOSIS, NOT JUST THE RULE
Both briefs are materially SHORTER than the ones that produced 3%, 6% and 3% returns, and the
checkpoint is stated as HARD. ★★ RESULTS-1 carries: ** "This brief is deliberately smaller. If it
still runs long, that is a finding and I want it reported." ** If it comes back long anyway, the cause
is something other than brief size. ** "When a rule is breached three times by three competent lanes,
suspect the work, not the wording" is the adopted formulation. **

## ★★ RESULTS-1 (PASS) - #617 DRAFT. Report: `report-RESULTS1-2026-08-06.md` (316 lines) + 20 screenshots
CI 31068724403 SUCCESS - `# pass 196 / # fail 0 / # skipped 0 / # todo 0`, `Test Files 110 passed (110)`,
`Tests 1351 passed (1351)`. ** Lane Overlap 31068724401 SUCCESS - no flag against #615 or #616 ** (the
declared disjointness held under the real check). 4 files, `#614`'s contract file ABSENT from the diff.

### ★★ THE OPENNESS TEST - AND A SECOND WAY TO KILL IT THAT NOBODY ANTICIPATED
It did NOT enumerate surfaces: `expect(countSurfaceLiterals(opennessBlock)).toEqual(["check-improve"])`,
with a CONTROL proving the detector fires on an enumeration.
★★ ** THE FINDING THE BRIEF DID NOT ANTICIPATE: `#614`'s openness test proves itself using the literal
`"quick-practice-batch"`. Had this lane CLAIMED that name for its variant, the test would have kept
PASSING while silently ceasing to test an UNRECOGNISED surface. ** ⇒ the lane added ** NO new
`ScorecardSurface` member at all - closed by construction. **
★ ** GENERALISED: a test that proves openness with a SPECIFIC placeholder name is only open until
someone takes that name. The guard and its own fixture can collide. ** Worth carrying to any future
openness guard.

### ★ THE MCQ RULING IS ENFORCED, NOT HOPED
`expect(scoreTextFor("Question 5")).toBe("0 / 1")` plus *"NO rendered objective mark is ever a
fraction"* - and the builder ** THROWS `ObjectiveMarkNotBinaryError` on a fractional objective mark
rather than clamping it into partial credit. ** The 1-marker ruling is now structurally impossible to
soften, not merely asserted.

### ★ typed-no-channel COPY, as a student sees it
*"Not graded - your typed working couldn't be sent. Only photographed answers reach the examiner
today. Nothing has been scored 0 - photograph this answer to have it marked."*
★ ** No mark element EXISTS for that card ** - not a blank, not a dash. Honest empty state.

### ★★ TWO REAL DEFECTS FOUND BY SCREENSHOTS, BOTH INVISIBLE TO TESTS
1. ⚠⚠ ** LATENT ON TRUNK RIGHT NOW: ** the desktop card had `max-height` only BELOW 1024px while the
   dim is `position:fixed` ⇒ ** the graded sheet's own head AND footer - return ticket included - were
   UNREACHABLE, with nothing to scroll. ** Fixed here; ** a no-op for short variants, but it affects
   ANY long variant on trunk today. ** `[FU-SCORECARD-DESKTOP-SCROLL-CEILING]`
2. The return ticket and *"Keep practising this set"* were ** BOTH tagged "Back" ** - the new row moved
   to "Set". `[FU-QP-DOUBLE-BACK-TAG]`
★ ** This is the third wave running in which screenshots caught what every assertion passed. **

### FINDINGS AGAINST THE SPEC (4)
1. ** section 3's "reuse `ProgressWindowArc`'s honesty copy by IMPORT" is IMPOSSIBLE ** - it exports no
   copy constant, and importing it would ** drag Firestore into a pure presentational shell. ** Done
   instead: one module constant read by BOTH renderers, both inside `ResultsScorecard.tsx`.
2. ⚠ ** OWNER DECISION: section 1a's "Ready to grade" is PRE-GRADE copy on a POST-GRADE sheet. ** The
   prototype's own results frame says *"Diagnosed from your working"*. ** Shipped verbatim as
   instructed, and flagged. **
3. section 3's `typed-no-channel` premise CONFIRMED (`WorksheetGradeQuestionInput` has no `textAnswer`).
4. Process: a backtick in a CSS comment inside the `SC_CSS` template literal broke the component at
   runtime. ** `tsc` DOES catch it - the error was running gates BEFORE the last edit. **

### ★★ THE FLOOR EXPERIMENT - ANSWERED
Returned at ** ~22% ** (vs 3%, 6%, 3%). Its own diagnosis: ** "the brief was correctly sized; the
overrun was ENVIRONMENT (Windows vitest bring-up, mutation-runner entry), not brief length." **
⇒ ** Shorter briefs helped materially, but the residual cost is ENVIRONMENT, not spec size. ** The
mutation harness now parses the `Test Files` line and totals - ** its first attempt spawned the `.bin`
shell wrapper and reported `ran:false`, i.e. it hit the silent-runner trap and detected it. **

### ★★ DORMANCY STATED, AS REQUIRED
** "This surface is UNREACHABLE until WIRE-2 wires it." `quickPracticeGradedScorecardVariant` has
exactly ONE caller in the repo - its own test file. ** In the lane's report, in this file, and owed in
the handoff if the wave closes before WIRE-2.

## ★★ OWNER RULINGS 2026-08-06 ON RESULTS-1 - AND TWO OWNERSHIP GAPS I AM RAISING
`#617` merged at `9cfcb09a` on explicit owner instruction (byte-reviewed: 4 files, 3 deletions, and
the openness claim verified - ** `surface: "quick-practice"` is DATA, not a new `ScorecardSurface`
member **). Dormancy re-verified BY CONTENT on trunk: `quickPracticeGradedScorecardVariant` appears in
exactly two places, its definition and its own test. ** No caller. **

### ⚠⚠ GAP 1 - THE RULED COPY CHANGE CURRENTLY HAS NO OWNER
** DECISION 1: "Ready to grade" -> "Diagnosed from your working" ** (pairs with "Marked instantly ·
free"). Owner-acknowledged as HIS error, lifted from the Finish screen where it IS correct.
⚠ ** That copy lives in `ResultsScorecard.tsx`. RESULTS-1 is merged and dead. WIRE-2's brief
EXPLICITLY FORBIDS that file ("ResultsScorecard.tsx is RESULTS-1's - do not touch it"). **
⇒ ** UNLESS WIRE-2'S AMENDMENT GRANTS `ResultsScorecard.tsx`, THIS RULED CHANGE HAS NO LANE. **
That is precisely a forgotten-item generator. ** RAISED, not silently assigned. **

### ⚠⚠ GAP 2 - THE ROUTE NEEDS `App.tsx`, WHICH IS DOUBLY GATED
** DECISION 2: ROUTE, NOT MODAL. ** 1,877px inside a 540px card settles it, and the second reason is
better: ** a graded paper is something a student COMES BACK TO. A modal cannot be linked, bookmarked
or reached from history ** - and Quick Practice sessions should appear in `SurfaceHistory` as Chapter
Test and Full Mock already do.
⚠ ** A route means `App.tsx`: CLAUDE.md section 4 GLOBALLY FORBIDDEN **, and separately held under
OWNER REVIEW by `lane_overlap`'s `GATED_FILES` (`[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]` - the
FORBID-4 lift changed the PROTECTION, not the REVIEW).
⇒ ** WIRE-2's amendment must carry an EXPLICIT, NARROW owner authorization for `App.tsx`, in the same
shape as WELCOME-1's for `Welcome.tsx`. Without it the lane will correctly STOP. **
★ Owner's pointer: ** read BATCH-2's original spec section 4 before writing it - `SurfaceHistory` is
GENERIC, takes a `SessionSurface`, and mounts on the surface's OWN page. Adding Quick Practice may be
nearly free. **

### ★★ DOCTRINE ADDED 2026-08-06
1. ** A TEST THAT PROVES OPENNESS WITH A SPECIFIC PLACEHOLDER NAME IS ONLY OPEN UNTIL SOMEONE TAKES
   THAT NAME. THE GUARD AND ITS OWN FIXTURE CAN COLLIDE. ** `#614`'s openness test proves itself with
   the literal `"quick-practice-batch"`; claiming that name would have kept it GREEN while it silently
   stopped testing an unrecognised surface. ★ ** No mutation could have caught this - the lane found
   it by reading the guard, and it is better than the mutation I specced. **
2. ** ASSERTIONS TEST WHAT A COMPONENT RENDERS; SCREENSHOTS TEST WHETHER A STUDENT CAN REACH IT. **
   ★ Third wave running where screenshots caught what every assertion passed.
3. ** THROWING BEATS CLAMPING. ** `ObjectiveMarkNotBinaryError` makes the 1-marker ruling
   structurally impossible to soften, not merely tested against.

### ★ FU LEDGER ADDITIONS
- ** `[FU-SCORECARD-DESKTOP-SCROLL-CEILING]` AFFECTS TRUNK TODAY, not just this lane. ** `max-height`
  below 1024px against a `position:fixed` dim ⇒ ** a long variant's head and footer, return ticket
  included, are unreachable with nothing to scroll. ** Logged as a trunk defect.
- ** `[FU-WINDOWS-VITEST-BRINGUP-COST]` ** - the residual context cost is ENVIRONMENT (Windows vitest
  bring-up, mutation-runner entry), ** not a discipline problem. ** Keep briefs at RESULTS-1's size.

### ★ ACCEPTED CORRECTIONS TO THE COFOUNDER'S SPEC
- `ProgressWindowArc` exports no copy constant and importing it would drag Firestore into a
  presentational shell. ** One module constant read by both renderers is the right answer. **
- ★ ** "You were right to ship my wording verbatim and flag it rather than improvise. Keep doing
  that." ** - standing instruction for every lane: ** ship the spec, flag the doubt, do not silently
  improve. **

## ★★ THE DEPENDENCY CHAIN
```
FORBID-6  --merged & closed-->  ONE COMBINED LANE (WIRE + BATCH-2)
```
1. ** WIRE-1 IS HELD AND SUPERSEDED. DO NOT DISPATCH IT. ** Specced for Option A; its
   per-question-silence assertion is moot because under B there IS no per-question path. Its brief on
   disk now carries a SUPERSEDED banner and the retraction, kept unedited below it for the record.
2. ** `#611` IS MERGED AND ITS FUNCTION IS STILL UNCALLED. ** `gradeQuickPracticeBatch`, proven by 25
   tests, zero callers. ★ ** THIRD DEAD CAPABILITY IN THIS ARC ** (#578's server half, BATCH-1b's
   client half, MentorSolveDrawer before them). ** The combined lane is what makes it live. **
3. ** FORBID-6 IS THE GATE ON EVERYTHING. ** Under B the student MUST see grades at Finish and that
   surface is `ResultsScorecard.tsx`, still FORBIDDEN. ★ Without the lift the wiring lane would remove
   per-question feedback with ** nowhere to show results - a BROKEN LOOP, worse than a dead
   capability, and student-visible. ** ⚠ Two gates historically: ** both or neither. **
   ★ Watch the over-pin: the combined lane will ADD a variant; a replacement pinning the current
   variant SET forbids the very change the lift permits. Its report must answer that directly.
4. ★★ ** THE COMBINED LANE FOLLOWS THESE RULINGS AS WRITTEN ** - not FORBID-6's report, not WIRE-1's
   spec, not my Option-A reasoning. ** FORBID-6 changes only what is PERMITTED; it changes nothing
   about the FLOW. If its report suggests otherwise, RAISE IT rather than reconciling silently. **
   ⚠ Cut it from TRUNK, never stacked on FORBID-6.
5. ** `#578`'s live-verify discharges in the combined lane ** - six days owed, the first real student
   trigger, ** not dischargeable from a worktree ** (`isStubMode()` returns before `buildUploadParts`).

## BLOCKED / OWNER DECISIONS OWED
1. ** RESOLVED 2026-08-05: #611 marked ready and MERGED by the owner; WIRE-1 dispatched. **
   Kept for the record - WHO WIRES THE TRIGGER? `gradeQuickPracticeBatch` is complete and uncalled. Options:
   (a) a small WIRING lane owning `PracticePage.tsx` + `SolutionChecker.tsx`, landing this wave;
   (b) fold it into `BATCH-2` (which needs `FORBID-6` first, so batching stays dead until then);
   (c) merge #611 as a dormant capability and accept a third dead seam.
   ** My read: (a). ** (c) is how `#578` and `MentorSolveDrawer` happened, and the lane has already
   proven the callee works. ** Owner's call - I will not spec it unasked. **
2. ** `MAX_BATCH_UPLOADS=12`: does BATCH-2 SPLIT or CAP? ** A 13th photo is a hard 400 and no client
   chunking exists. Raised by the lane.
3. ** `#578`'s live-verify is STILL OWED and needs a real API key + a real trigger. ** Not
   dischargeable from a worktree. It is the owner's, after (1) lands.
4. ** FORBID-6, TELEMETRY-1, WARM-GATE-1, AUTH-1 specs - owed by the cofounder. ASK, DO NOT IMPROVISE. **
   FORBID-6 is the cheapest next unblock.
5. ** MASTER_TRACKER.md content - owner-supplied. **
6. ** BATCH-1b's live-verify is the owner's ** - it changes how Quick Practice grades; Railway/Vercel
   rebuild from trunk with no staging tier.

## WAVE 5F+ - RECORD ONLY, DO NOT DISPATCH
BATCH-2 (graded answer sheet - needs FORBID-6) | SERVER-2 thinking budget (needs TELEMETRY-1) |
`DATABASE_URL` re-provisioning (needs WARM-GATE-1) | ME-PROGRESS | BACKNAV-1 | DPDP erasure + export
(+ the 9 `js/clear-text-storage-of-sensitive-data` CodeQL alerts) | `PublicLegalFooter` component
contrast `[FU-LEGAL-FOOTER-REST-CONTRAST]` | `[FU-LEGAL-CONSOLIDATE-UNDER-ONE-ROOF]` relocation |
`[FU-EVIDENCE-BASE-INTENT-SURFACE-DEAD]`.
OWNER TRACK: the plan-shape decision (gates PAY-1) | rotate the Vercel deploy hook | re-export
`og-image.png` | the ~50-student QA pass.

================================================================================
## ★★★ WAVE 5E CLOSED 2026-08-06 - trunk `9cfcb09a`, and the controller STOOD DOWN
** Owner ruling: do NOT dispatch WIRE-2. Close the wave, write the handoff, hand over. **
A fresh controller opens Wave 5F with ** WIRE-2 as its first lane. **

### ★★ WHY WE STOPPED AT 36% - THE ARITHMETIC, NOT CAUTION
** Rule 0's binding constraint is the HANDOFF budget, NOT the dispatch floor. **
WIRE-2 + its bounded report costs ~5% at the measured rate, leaving ~31% for ** the largest handoff of
the wave ** - the whole batch arc, two scoped authorizations, the route decision, five doctrine items,
and a live cost investigation.
★★ ** A controller that runs dry MID-HANDOFF leaves the wave half-closed - the exact failure Rule 0
exists to prevent, and worse than any handover. ** Here a handover is cheap: `handoff/` describes
trunk, this file is current, and it has already proven sufficient twice this wave.
★ ** A WAVE CLOSES WHEN `handoff/` DESCRIBES TRUNK. IT DOES NOT REQUIRE EVERY LANE TO BE DONE. **

### WHAT WAVE 5E DELIVERED
```
#611  BATCH-1b   gradeQuickPracticeBatch, 25 tests        -> DORMANT, no caller
#612  META-1b    og:image pointed at a 404 path           (owner-authored)
#613  META-2     robots/sitemap/llms/favicon 404 at root  -> Google had NEVER fetched the sitemap
#614  FORBID-6   the ResultsScorecard ban lifted, BOTH gates
#617  RESULTS-1  the graded answer sheet                  -> DORMANT by design
```
OPEN, NOT MERGED, and ** the owner's **: `#615` META-3 (sitemap + canonical) | `#616` NAME-1 v2
(the login door rework). ** NAME-1 goes to a new cofounder session. AUTH-1 is NOT queued. **

### ★★★ THE SENTENCE THAT MUST SURVIVE - it goes in `[CURRENT]` AND `NEXT_ACTION` sec0
> ** The Quick Practice results surface is BUILT AND UNREACHABLE. `RESULTS-1` (`#617`) is merged and
> dormant by design. `WIRE-2` is the ONLY thing that makes it live. **
★★ ** THIS WAVE NOW CARRIES THREE DORMANT CAPABILITIES - `#578`, `#611`, `#617` - AND THEY MUST BE
NAMED TOGETHER, IN ONE PLACE, WITH WIRE-2 AS THE SINGLE LANE THAT ENDS IT. **
The absence of exactly that sentence cost five days on `#578`.

### ★★ THE AI COST INVESTIGATION - RECORD AS **OPEN**, CAUSE **NOT ESTABLISHED**
** INR 586.96 for 31 July - 5 Aug, against ~INR 10 the prior week. **
** 98% is ONE SKU: OUTPUT TOKENS - and thinking bills at the OUTPUT rate. **
The forecast has returned to ** INR 13.33 **, so ** nothing unattended is running. **
⚠⚠ ** THE CAUSE IS NOT ESTABLISHED. THREE CONCLUSIONS WERE REACHED AND RETRACTED IN NINETY MINUTES. **
Full account: `LazyTopper_AI_Cost_Investigation_2026-08-06.md`, ** which the OWNER holds ** - it is
not in the repo and must not be reconstructed from memory.
★ ** `TELEMETRY-1` IS WHAT ENDS THE GUESSING. NOTHING SHOULD BE CAPPED BEFORE IT. **

### ★★ DOCTRINE - SIX ITEMS, ALL FOR `CURRENT_STATE.md`
1. ** A TEST THAT PROVES OPENNESS WITH A SPECIFIC PLACEHOLDER NAME IS ONLY OPEN UNTIL SOMEONE TAKES
   THAT NAME. THE GUARD AND ITS OWN FIXTURE CAN COLLIDE. ** `#614`'s openness test proves itself with
   the literal `"quick-practice-batch"`; RESULTS-1 found that CLAIMING that name would keep the test
   GREEN while it silently stopped testing anything. ★ ** No mutation could have caught it - it was
   found by READING the guard. **
2. ** ASSERTIONS TEST WHAT A COMPONENT RENDERS; SCREENSHOTS TEST WHETHER A STUDENT CAN REACH IT. **
   ★ Third consecutive wave where screenshots caught what every assertion passed.
3. ** THROWING BEATS CLAMPING. ** `ObjectiveMarkNotBinaryError` makes the 1-marker ruling structurally
   impossible to soften, not merely tested against.
4. ** SHIP THE SPEC, FLAG THE DOUBT, DO NOT SILENTLY IMPROVE. ** It turned a cofounder copy error into
   a DECISION rather than a drift.
5. ** A WARNING IN YOUR OWN BRIEF DOES NOT PROTECT YOU FROM THE THING IT WARNS ABOUT. **
6. ** WHEN A RULE IS BREACHED THREE TIMES BY THREE COMPETENT LANES, SUSPECT THE WORK, NOT THE
   WORDING. ** RESULTS-1 returned at 22% against 3/6/3% - shorter briefs worked, and the residual is
   ENVIRONMENT, not discipline.

### FU LEDGER - WAVE 5E
- ⚠ ** `[FU-SCORECARD-DESKTOP-SCROLL-CEILING]` - LATENT ON TRUNK TODAY **, not only in the lane.
  `max-height` below 1024px against a `position:fixed` dim ⇒ a long variant's head and footer,
  ** return ticket included, are unreachable with nothing to scroll. **
- `[FU-WINDOWS-VITEST-BRINGUP-COST]` - environment, not discipline.
- `[FU-FORBIDDEN-BANS-MASK-ABSENT-COVERAGE]` - remaining zero-diff entries: ** CONV 5 · OVL 2 ·
  QP-overlay 4. ** ★ ** When the next one lifts, expect to WRITE the coverage, not find it. **
- `[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]` - ★ ** WIRE-2 will trip it DELIBERATELY; the warning
  is INTENDED, not a defect. **
- `[FU-BATCH-402-SWALLOWED-BY-HONEST-FAILURE]` `[FU-BATCH-QP-MI-FEED-REHOMING]`
  `[FU-BATCH-TYPED-ANSWER-NO-CHANNEL]` `[FU-BATCH-UPLOAD-CAP-12]` `[FU-QP-DOUBLE-BACK-TAG]`
  `[FU-BATCH-1B-UNCALLED-SEAM]` `[FU-578-LIVE-VERIFY-STILL-OWED]` `[FU-WIRE1-ALLOWLIST-ONE-FILE-SHORT]`
  `[FU-BATCH-QP-DEFER-IS-A-UX-DECISION]` `[FU-FORBID6-MUTATION-RUNNER-SHELL]`
  `[FU-FORBID6-DIRTY-MODULE-STATE-BASELINE]` `[FU-SCORECARD-ONRETURN-RECEIVES-EVENT]`
  `[FU-CONV-GATE-SECTION-HEADERS-STALE]`
  ** Bodies live in the four lane reports under `...\wave 5e\report\`. NEVER reconstruct one from its ID. **

### ★★ THE HANDOVER NOTE - five things, each stated explicitly
1. ** `handoff/` DESCRIBES TRUNK ** at the SHA recorded in the handoff PR. A one-commit lag is
   STRUCTURAL - a handoff PR cannot name its own merge commit.
2. ★★ ** `WIRE-2 v1.1` IS SPECCED, ON DISK, AND NOT DISPATCHED ** -
   `...\wave 5e\SUBAGENT_WIRE2_flip_quick_practice_to_batch.md`, with BOTH scoped authorizations
   granted: ** sec9a `ResultsScorecard.tsx`, ONE COPY LINE ONLY; sec9b `App.tsx`, ROUTE REGISTRATION
   ONLY. ** ** It is Wave 5F's first lane. ** *(v1.0's allowlist had nowhere for either ruling to
   land - the two gaps the controller raised before a lane hit them.)*
3. ** `#617` is MERGED and DORMANT ** - see the sentence above; it is repeated verbatim in the handoff.
4. ** STILL OWED BY THE COFOUNDER: `TELEMETRY-1`, `WARM-GATE-1`, `MASTER_TRACKER.md`. **
5. ** `#615` and `#616` are OPEN and the OWNER's ** to review and merge. ** `AUTH-1` is not queued **
   - the name/link work moved to a new cofounder session.

### ★ FOR THE RECORD - what the controller role bought this wave
Two owner rulings were made ** with no lane to land in ** - the copy change and the route - and both
were caught ** before a lane hit them. ** That is a round trip saved on the biggest lane of the wave.
★ ** Holding the plan closely enough to see where a decision has no owner is the role working. **
================================================================================