# WAVE 5F STATE - opened 2026-08-06. Controller: new (Wave 5E stood down at 36%).
# Pass 13 - ROOT CAUSE CONFIRMED EXTERNALLY: GITHUB ACTIONS MAJOR OUTAGE.
# #621 is BLOCKED ON GITHUB, not on the repository. Nothing to fix. Do not touch the branch.
# Pass 14 - outage ONGOING (latest incident update 19:43Z, "capacity remains constrained").
# ** A WAVE-CLOSURE DECISION IS NOW OWED BY THE OWNER - see BLOCKED. **
# Pass 15 - THE EMPTY-COMMIT TEST RESULT: head 1010854 produced ZERO RUNS. Dispatch is dead
# REPO-WIDE. #621 is now READY (draft=false), mergeState=BLOCKED.
# Pass 16 - FENCE + CAP ANSWERS IN. Full Mock 400 = FALSE. Fence forgeable = TRUE, 1-file fix.
# ===== WAVE 5F CLOSED 2026-08-07. TRUNK `fbfb57faa4f6dacbd3cfac54d45d4910df92eb08`. =====
# Pass 23 (FINAL) - ALL SIX PRs MERGED AND VERIFIED ON TRUNK BY MERGE-COMMIT ANCESTRY.
# LIVE-VERIFY PASSED ON ALL THREE CHECKS INCLUDING THE CONTROL. Archive of this file follows.
# Pass 22 - TYPED-3 PASS (#627, DRAFT, CI green). IT DISPROVED BOTH VERSIONS OF THE SPEC CLAIM.
# Pass 21 - #626 MERGED (trunk a307cfc4). TYPED-3 DISPATCHED. Mobile 'full marks' CLOSED.
# Pass 20 - TYPED-2 PASS (#626, DRAFT, CI green). THE DEFECT WAS TWO LAYERS, NOT ONE.
# Pass 19 - !! #621 MERGED, AND TYPED WORKING IS STILL NOT GRADED IN PRODUCTION.
# ROOT CAUSE: the endpoint REFUSES a zero-upload request. TYPED-2 dispatched.
# Pass 18 - #621 was proven green on head 1010854 (that record stands).
# Pass 17 - DISPATCH RECOVERED. Head 1010854 has all THREE runs; Lane Overlap SUCCESS,
# Quality Gate + CodeQL in_progress. The empty-commit re-trigger WORKED once Actions came back.
# !! CORRECTION: pass 9 recorded #621 as "complete, awaiting CI". CI HAS SINCE COMPLETED AS FAILURE.
# !! PASS-8 CORRECTION: a DECISION line (the Drizzle record) was found MISSING from an earlier
# !! pass and has been restored below. See the LESSON at the end of DECISIONS.

> **This file, not the controller's context, is the source of truth.** Rewritten WHOLE after every
> subagent returns. UNTRACKED. Archive per RULE 0 as `handoff/WAVE_STATE_WAVE5F_ARCHIVE.md`.
> CONTROLLER NOTES inherited: (1) rewrite WHOLE - regex surgery duplicated it in 5D;
> (2) after a rewrite, diff the SECTION LIST against the previous pass - a uniqueness check is not
> a completeness check. SECTION LIST pass 4 == pass 3 (TRUNK / OPEN PRs / PRECONDITION / LANES /
> DISJOINTNESS / DECISIONS / FU ENTRIES / BLOCKED / NEW STANDING RULE / REPORTS), plus SEQUENCE and
> AFTER THIS WAVE. Nothing dropped.

TRUNK: b48d6e3823f2ebc906c77ce1ca494c4b95b5a6ed   <- re-derived 2026-08-06. This IS #625's
       mergeCommit. TYPED-1 confirmed on trunk BY CONTENT:
       `git show b48d6e38:lazytopper/src/config/gradingLimits.ts` returns the file.
       MOVED SIX TIMES THIS WAVE: c54f7f92 (#615) -> 1b477e5f (#616) -> ecacdfed (#622 docs)
       -> c3c9de18 (#619) -> 6783850b (#620) -> b48d6e38 (#625).
       ** RE-DERIVE BEFORE EVERY DISPATCH. Proven six times in one wave. **

OPEN PRs (read 2026-08-06, after #625 merged):
       #621 WIRE-2   OPEN, DRAFT - THE ONLY OPEN PR AND THE LAST OF THE WAVE.
       AMEND-621 amends its EXISTING branch `feat/wave5f-wire2-batch-grading` - NOT a new PR,
       so `lane_overlap` has nothing to compare it against.

PRECONDITION VERIFIED: `RESULTS-1` (#617) MERGED, mergeCommit `9cfcb09a`, ancestor of trunk.
  Re-verified BY CONTENT on trunk by WIRE-2, not by PR state - this repo squash-merges.

## LANES - three dispatched and returned; a FOURTH created by the owner's ruling

| id | title | verdict | PR | notes |
|----|-------|---------|----|----|
| WARM-GATE-1 | gate the startup pre-warm, then the schema | **MERGED + LIVE-VERIFIED IN PRODUCTION** | #619 | trunk `c3c9de18`. Gate proven live - see LIVE-VERIFY below. CLOSED. |
| TELEMETRY-1 | attribute the AI spend by workload | **MERGED** | #620 | trunk `6783850b`. CLOSED. Its output is what SERVER-2 will be scoped from. |
| TYPED-1 | typed-working channel + exported upload cap | **MERGED** | #625 | ** NOT DISPATCHED: its allowlist includes `checkSolution.cjs`, which #620 ALSO edits. Dispatching beside #620 would put two open PRs on one file -> lane_overlap red, neither merges. ** trunk `b48d6e38`, verified BY CONTENT. CLOSED. Was a capability with no caller; AMEND-621 supplies the caller. |
| AMEND-621 | delete the typed-no-channel hinge, read the cap | **PASS LOCALLY, RED IN CI** | #621 (amended, head `ceb1b7d7`) | 4 files. Merged trunk in at `e783544e` - NO FORCE-PUSH, controller ruling held. 12 screenshots. ** ALL THREE CI GATES FAILED - see CI STATUS below. ** |
| CI-FIX-621 | diagnose + fix #621's three red gates | **CONFIRMED INFRA** | #621 (unchanged) | ** ZERO LINES CHANGED. ** Lane Overlap now SUCCESS on the same head - the control that proves it. Quality Gate + CodeQL re-queued again. |
| WIRE-2 | flip Quick Practice to collect-and-batch | **PASS-WITH-FOLLOW-UP** | #621 | HELD until the server lane lands. Screenshots owed before it merges. |

SCOUT RETURNED 2026-08-06 (read-only, no PR, no commits, no gates run). ALL FOUR FACTS SETTLED
FROM SOURCE - "NOT ESTABLISHED: NONE". Full answers: `scout-FOUR-FACTS-2026-08-06.md`.

## SERVER LANE - THE FOUR FACTS, SETTLED (this is what the spec is built from)

**1 - `WorksheetGradeQuestionInput` has NO student-work field of any kind.** 12 fields, ALL
describing the question or its ANSWER KEY: qNumber, marks, topic?, topicLabel?, questionText,
section?, answer?, options?, correctOption?, objective?, solutionSteps?, finalAnswer?. Declared in
`lazytopper/src/ai/aiClient.ts` as `export interface WorksheetGradeQuestionInput`.
`blockFor()` emits inside `gradeStructuredSet` in `lazytopper/server/routes/checkSolution.cjs`, at
TWO call sites: `questions.map(blockFor).join(...)` (no-uploads path) and
`p.push({text:'
'+blockFor(q)})` inside `buildUploadParts` (the BATCH-1 interleave). The block
emits ONLY qNumber, marks, topicLabel|topic, questionText, marking-scheme steps, final answer.

**2 - ** NEVER EMITTED, NOT REMOVED. THE LANE *ADDS* A FIELD; IT DOES NOT RESTORE ONE. **
The rule-1 clause lives in the `rule1` constant (hasUploads branch) of `checkSolution.cjs`:
"A question with no image following it has no photographed answer - grade the typed answer given in
its block IF ONE IS SHOWN."  Evidence that decided it:
  (a) `git log -S "typed answer given in its block"` and `git log -S "blockFor"` return the SAME
      single commit `c5570592` (BATCH-1, #578) - the clause and `blockFor` were BORN TOGETHER;
      pre-#578 rule 1 was the PDF-locate wording with no typed clause at all.
  (b) The interface arrived in `60c5bf98` (#291) with 7 fields; today's 12 are ALL ADDITIONS.
      `git log -S` for typedAnswer/answerText/studentText/typedWorking/studentTyped/typedText
      returns ZERO commits on both files. NOTHING WAS EVER DELETED.
  (c) `textAnswer` DOES exist - but only on the SINGLE-question path (`checkSolutionImage` req type
      in aiClient.ts; `payload.textAnswer` in `handleCheckSolution`), added in `57224f49`, never
      removed, still live. It has never been on the batch path.
  ** The clause's "if one is shown" guard is WHY THIS NEVER PRODUCED A VISIBLE DEFECT - the
  condition is simply never met. ** => the lane adds ONE optional student-typed-work field to
  `WorksheetGradeQuestionInput` and emits it from `blockFor` (BOTH call sites inherit it).
  ** THE PROMPT NEEDS NO CHANGE - rule 1 already instructs the model. ** The image-pairing invariant
  is untouched: a typed block still has no image following it.

**3 - What #621 renders for typed today - THREE surfaces, and the client change is a DELETION.**
  (a) save time: heading "Saved. Graded when you finish." + sub-line "Your typed working is saved."
      - `SolutionChecker.tsx`, `savedAnswer` block, sub-line branches on `savedAnswer.kind==="typed"`.
      !! THE HEADING IS KIND-INDEPENDENT and is the ONE DISHONEST STRING in the flow - a typed
      answer is currently told it will be graded. ** Ruling 1A makes it TRUE before any student sees
      it; it would have been a live doctrine breach under 1B. **
  (b) confirmation: heading "Saved - not gradeable yet"; row "Q<N>" + "Typed - photograph this
      working and it will be marked with the rest." - `PracticePage.tsx`,
      `{batchSelection.typedNoChannel.length > 0 && (...)}`. These rows sit OUTSIDE "Ready to grade"
      and are NOT counted in "Grade my N answers".
  (c) graded sheet: bold "Typed working is not graded yet" + "Photograph your working for this one
      and it will be marked with the rest." - `PracticePage.tsx` pushes
      `{ungraded:{reason:"typed-no-channel",...}}`, rendered by `GradedAnswerCard` in
      `ResultsScorecard.tsx`, NO mark shown (hasMark false -> tone "none").
  ** THE SINGLE CLIENT HINGE: `if (nonEmpty(answer.textAnswer)) return "typed-no-channel";` in
  `classifyQuickPracticeAnswer`. Closing the channel makes (b) and (c) DEAD BRANCHES and (a) TRUE.
  The client half of the lane is a DELETION, not a rewrite. **

**4 - `MAX_BATCH_UPLOADS` is PURELY SERVER-SIDE. YES.** THREE sites, all in
`lazytopper/server/routes/checkSolution.cjs`: the `const MAX_BATCH_UPLOADS = 12;` declaration, the
`if (uploads.length > MAX_BATCH_UPLOADS)` hard-400 guard, and the 400 body string. ZERO client
sites; #621 changes no server file and adds no count cap. `uploadLimits.ts` is per-file BYTE size -
a different concern. ** THE CLIENT CANNOT EVEN LEARN THE CAP - nothing is exported to import. **
So ruling 2A needs a shared/exported constant or an endpoint, not merely a client `if`.

## TYPED-1 RESULT - WHAT AMEND-621 NEEDS, AND THE TRAP THAT DID NOT FIRE AS SPECCED

** THE CAP EXPORT LIVES IN `lazytopper/src/config/gradingLimits.ts`. ** That is AMEND-621's import
path - it no longer has to be guessed. Safety proven WITH A CONTROL: `grep -rn "vi.mock(.*config/"
src/` returns 0 hits, and the guard test re-runs that scan but must FIRST find the three
one-symbol `aiClient` mocks - otherwise its zero would mean nothing.

** !! THE SPEC'S MUTATION 4 DOES NOT GO RED AS WRITTEN, AND THAT MATTERS FOR AMEND-621. **
A VALUE export added to `aiClient.ts` ALONE leaves FORBID-1 at 20/20, exit 0. Reason: `vi.mock`
replaces a module FOR ITS IMPORTERS - an export that nothing imports is INERT. The trap fires ONE
STEP LATER: with a consumer importing it (M4b) it reds with
`Error: [vitest] No "MAX_BATCH_UPLOADS" export is defined on the "../../ai/aiClient" mock.`
=> ** THE SECTION 4 RULING IS RIGHT; ITS STATED REASON WAS INCOMPLETE. ** And the consequence is
specific: ** A LANE THAT RAN ONLY THE SPECCED M4, SAW GREEN, AND CONCLUDED "NO TRAP" WOULD HAVE
DETONATED INSIDE AMEND-621 ** - because AMEND-621 IS the consumer that imports the cap.
This is the same shape as the wave's other three: the signal reads as its own opposite.

OTHER TYPED-1 RESULTS, verified:
- `#578`'s `sha256(contents)` test UNMODIFIED and passing; the pin never appears in the diff.
  A PRESENT typed answer MOVES the hash (asserted, correct); an ABSENT one does NOT - pinned for
  empty string, whitespace-only AND null, on BOTH prompt paths.
- `blockFor` has exactly TWO call sites; no third. The only other repo hit is a COMMENT in
  `quickPracticeSessionService.ts` - #621's file, untouched.
- Image-pairing invariant proven POSITIVELY: Q1+Q3 typed, Q2 not, all three photographed ->
  `parts.length === 8` (typed text added NO part) and each Q{n} still followed by its own IMG{n}.
  Mutation M2 reds it, so the assertion is not vacuous.
- Precedent matched (`57224f49`): same field NAME, same `String(x || '').trim()` coercion, same
  sentence, same fence, same position after the marking scheme. NO second convention invented.
- PROMPT UNCHANGED, as the spec predicted.
- Spec count stale: 71 pre-existing `checkSolution` tests, not 64. All 71 pass unmodified; 79 now.

** TYPED WORKING IS NOT GRADED END-TO-END UNTIL AMEND-621 LANDS. ** The hinge
`if (nonEmpty(answer.textAnswer)) return "typed-no-channel";` is #621's file and still
short-circuits. #625 is a CAPABILITY WITH NO CALLER: merging it changes nothing live, because no
client sends the field and the no-typed path is byte-identical.

## AMEND-621 RESULT - TWO RULINGS OWED, AND THE BRIEF'S CENTRAL CLAIM WAS WRONG

** 1 - THE FENCE GATE: THE LANE PROCEEDED, AND ESCALATED. OWNER MUST RATIFY OR REVERSE. **
[FU-TYPED1-FENCE-IS-NOT-ESCAPING] is CORRECT: a student typing the fence delimiter closes it early;
a fence is a delimiter, not escaping. ** BUT THE BRIEF'S PREMISE WAS FALSE. ** The brief said "until
this merges, no student-typed text has ever reached the grading prompt." IT ALREADY DOES - LIVE,
from SolutionChecker.tsx and DesktopCheckImprovePage.tsx, through the IDENTICAL fence, and
identically on the single-question path since 57224f49.
=> ** This lane EXTENDS an existing injection surface; it does not create one. **
The lane therefore did NOT write section 2's requested assertion - ** it would have been FALSE ** -
and asserted the TRUE property instead: the delimiter is carried VERBATIM (the client neither
mangles nor escapes it). ** Escaping is ONE SHARED SERVER DECISION, outside this allowlist. **
!! THE NEW RISK IS NOT THE SURFACE, IT IS THE BLAST RADIUS: batching puts many answers in ONE call,
so one injected answer can reach the grading of OTHER questions in the same request.
   -> [FU-AMEND621-BATCH-WIDENS-INJECTION-BLAST-RADIUS] and [FU-AMEND621-FENCE-ESCAPE-IS-SERVER-SIDE]
** THE OWNER IS THE REVIEWER. Ratify proceeding, or rule that server-side escaping lands first. **

** 2 - CI HAD NOT COMPLETED. ** Run 31121805438 on head ceb1b7d7 was QUEUED behind CodeQL; the
controller re-checked and quality-gate, lane-overlap AND Analyze were ALL still pending, only Vercel
green. ** THERE IS NO ZERO-SKIP LINE TO QUOTE YET. Do not merge on it. **
!! ANOTHER "SIGNAL READS AS ITS OPPOSITE": the two EARLIER conclusions on this head were
CANCELLATIONS (JOB quality-gate => cancelled) - the RUN-LEVEL field renders a concurrency cancel as
`failure`. READ THE JOB, NOT THE RUN. Controller has armed a watch for the terminal state.

** THE BRIEF'S CENTRAL CLAIM - "the client half is a DELETION, not a rewrite" - WAS WRONG. **
Deleting the hinge ALONE would have been a SILENT NO-OP. Two lines the brief missed:
  (a) buildBatchQuestionInput had NO textAnswer passthrough - the field never left the client;
  (b) `uploads` had to be FILTERED, or a typed-only answer sends imageBase64: "undefined" and
      ** SHIFTS EVERY LATER PHOTO ** - destroying exactly the pairing invariant TYPED-1 protected.
The hinge became: if (nonEmpty(imageBase64) || nonEmpty(textAnswer)) return "batch";

ALLOWLIST EXCEPTION, JUSTIFIED: quickPracticeSessionService.batch.test.ts is a TRUNK file whose
section 6 ** PINNED THE DEFECT ** (toBe("typed-no-channel")). Deleting the hinge reds it BY
CONSTRUCTION. Section 6 inverted; nothing else in the file touched. SolutionChecker.tsx needed no
change at all.

** SCREENSHOTS CHANGED CODE AGAIN - THIRD CONSECUTIVE WAVE - AND CAUGHT ONE OF #621's OWN. **
A \uXXXX escape decodes in a string or template literal but a JSX TEXT NODE renders it LITERALLY.
Both "Saved \u00b7 not in this grade" (AMEND-621's) and ** "Marked now \u00b7 free" (#621's, ALREADY
SHIPPED ON THE BRANCH) ** were on screen as literal escape text. Proven by hex. Both fixed, plus a
rendered-text guard, mutation-verified. -> [FU-AMEND621-JSX-TEXT-UNICODE-ESCAPE]
  !! THE CONTROLLER HIT THE SAME CLASS OF BUG WRITING THIS VERY ENTRY - a \uXXXX sequence in a
  non-raw Python string aborted the state write. The defect class is live in TOOLING too, not just
  in JSX. It fails loudly in Python and SILENTLY in JSX, which is why only a screenshot found it.

** M0 CONTROL EARNED ITS PLACE - a fourth instance of the same shape. ** The first mutation harness
used execSync (stdout only) and ** vitest writes to stderr **, so it reported "RAN? NO" for a suite
that HAD run. Rebuilt on spawnSync before trusting any red.

MOUNT != LIVE, ANSWERED PROPERLY: a REAL intercepted request body shows textAnswer present with
uploads: [], and a 14-photo session sends EXACTLY 12 with Q13/Q14 NAMED and no 400.

## CI STATUS ON #621 - READ AT THE TIME 2026-08-06, AND IT IS RED

** ALL THREE GATES COMPLETED AS FAILURE ON HEAD `ceb1b7d7`: **
    Quality Gate  run 31121805438  completed/failure
    CodeQL        run 31121805432  completed/failure   (check "Analyze (javascript-typescript)")
    Lane Overlap  run 31121805441  completed/failure
  Previous head `a6debac7`: Lane Overlap failure, Quality Gate failure, CodeQL SUCCESS.
  ** LAST FULLY GREEN HEAD: `0800304c` - WIRE-2 BEFORE AMEND-621's changes. **
  Vercel is green; Vercel green is NOT the gate.

!! ** THE CORRECTION, AND IT IS THE CONTROLLER'S TO OWN. ** AMEND-621 returned VERDICT: PASS with
all LOCAL gates green, and reported CI as merely "queued behind CodeQL", noting that earlier
conclusions on the head were CANCELLATIONS rendered as `failure` at run level. ** That was true of
the moment it looked, and it is NO LONGER TRUE. ** The runs have since COMPLETED as failures.
Pass 9 of this file, and the controller's report to the owner, recorded #621 as "complete, awaiting
CI". ** IT IS NOT COMPLETE. IT IS RED. **
  -> LESSON: ** A LANE'S CI CLAIM IS A READING TAKEN AT ONE MOMENT, AND A LANE DIES BEFORE THE RUN
     FINISHES. THE CONTROLLER MUST RE-READ THE TERMINAL STATE ITSELF, NOT INHERIT THE LANE'S. **
     This is the same class as everything else this wave: the signal read as its own opposite -
     here, "cancelled, will be fine" was the LAST thing observed before it became "failed".

** TWO THINGS THE FIX LANE IS FORBIDDEN TO DO, AND WHY: **
  1. CodeQL passed on `a6debac7` and FAILS on `ceb1b7d7` - the head that OPENS a channel carrying
     student free text into an LLM grading prompt. ** IF CodeQL IS REPORTING A GENUINE FINDING THAT
     IS A STOP. It must not be suppressed, baselined or excluded to get green. **
  2. Lane Overlap failing is SUSPICIOUS: #621 is the ONLY open PR, so there is nothing to overlap
     against. Either a GATED_FILES condition is now FAILING rather than WARNING - itself a finding,
     since it is documented as a warning - or the tool errored. Diagnose, never guess.

## THE THREE RED GATES WERE GITHUB ACTIONS INFRASTRUCTURE - DIAGNOSED, NOT ASSUMED

** VERDICT: NO CODE DEFECT. ZERO LINES CHANGED. NOTHING SUPPRESSED, BASELINED OR WEAKENED. **
The worktree was byte-clean at `ceb1b7d7`; the three runs were simply RE-RUN on the SAME head.

** CodeQL (31121805432) - NOT A SECURITY FINDING. ** The only step is `Set up job = failure`:
`Failed to resolve action download info. Error: Service Unavailable` x3, then `##[error]Service
Unavailable`. ** THE ANALYSIS NEVER RAN ** - no checkout, no database, no queries. Independently
confirmed: all 20 code-scanning alerts carry `ref = refs/heads/base/approved-thru-437` and NONE
names a file in #621's diff.
  -> The controller flagged this as possibly a real finding on the head that opens a student-typed
     text channel into an LLM prompt. ** THE CAUTION WAS CORRECT TO HOLD; THE ANSWER IS INFRA. **
     The fence question (see AMEND-621 RESULT) is UNAFFECTED and STILL OWED - CodeQL was never
     going to answer it, and now demonstrably did not run at all.

** Lane Overlap (31121805441) - THE JOB PASSED. ** Every step `success`, and the log contains
`PASS: no lane overlap with any other open PR.` The job then sat 45 MINUTES after its cleanup line
before the SERVICE marked it `failure`. ** BOTH CONTROLLER HYPOTHESES DISPROVEN: ** `GATED` appears
NOWHERE in the log, and the source documents that path as "WARNS (never fails)" with `process.exit(0)`.
  -> Recorded because the controller guessed two causes and BOTH were wrong. Diagnose, never guess.

** Quality Gate (31121805438) - QUEUE EXPIRY. ** Conclusion `cancelled`, ZERO steps, empty runner
name, log not found. ** FOUR independent runs show an IDENTICAL 15m02s expiry - INCLUDING ONE ON
TRUNK `b48d6e38` ITSELF, which contains none of #621's diff. ** That trunk run is the CONTROL that
settles it: the failure cannot be caused by #621's content.

TWO THINGS THE LANE VERIFIED RATHER THAN CARRIED:
  - The `ResultsScorecard.tsx` ban was LIFTED on 2026-08-05 by FORBID-6; its replacement
    `ResultsScorecard.contract.test.tsx` is present and UNTOUCHED by #621.
  - `gh pr view --json files` reconciles EXACTLY with `git diff --name-only <merge-base>..HEAD`
    (10 files; merge-base IS trunk) - so there is no squash-merge drift in the file list.

## THE CONTROL THAT PROVES IT WAS INFRASTRUCTURE

Re-run on head `ceb1b7d7`, ** ZERO code changes between the two runs **:

    Lane Overlap   failure  ->  SUCCESS      <- THE CONTROL. Same head, same tree, same commit.
    Quality Gate   failure  ->  failure      (check state CANCELLED - queue expiry again)
    CodeQL         failure  ->  failure      (check state CANCELLED - queue expiry again)

** A GATE THAT FLIPS FROM FAILURE TO SUCCESS WITH NO CODE CHANGE CANNOT HAVE BEEN FAILING ON THE
CODE. ** That single flip is worth more than the three log diagnoses, because it is a CONTROL rather
than an interpretation - and it independently corroborates all three of them.

The two that expired again are the HEAVY jobs (the full matrix, and CodeQL's analysis); Lane Overlap
is small and got a runner. Consistent with a runner-capacity problem, not with anything in the diff.
Controller re-ran both again and armed a watch.

!! ** THIS IS AN AVAILABILITY PROBLEM TO WAIT OUT, NOT A DEFECT TO FIX IN THE BRANCH. ** Nobody
should "fix" #621 in response to these. The only correct action is to re-run until GitHub's capacity
returns. ** If a lane is ever dispatched at this, its brief must say so - or it will change code to
chase a green that was never about the code. **

## ROOT CAUSE, CONFIRMED BY AN EXTERNAL SOURCE - GITHUB ACTIONS MAJOR OUTAGE

    githubstatus.com/api/v2  ->  Actions = major_outage   Pages = major_outage
    Incident "Incident with Actions" - status: investigating, impact: CRITICAL
    created 2026-08-06T15:22:49Z   last update 2026-08-06T18:46:37Z

Quoted from the incident: ** "Workflow runs are still failing, and jobs may remain queued for an
extended period before starting or may time out. Jobs using GitHub-hosted runners are particularly
affected while capacity is constrained." **

** THE TIMELINE IS THE PROOF: the incident opened 15:22:49Z. #621's first failing run started
17:00:53Z - AN HOUR AND A HALF INTO A CRITICAL ACTIONS OUTAGE. ** The earlier `a6debac7` runs at
16:45 were also inside it. Every symptom this wave chased matches the incident text exactly:
runs failing, jobs queued for extended periods, jobs timing out, hosted runners worst affected.

** CURRENT STATE: Quality Gate and CodeQL have sat `queued` with NO RUNNER for ~55 minutes and
never started. Lane Overlap, which did get a runner, passed in 12 SECONDS. **

=> ** THE THREE CONVERGING LINES OF EVIDENCE, IN ASCENDING ORDER OF STRENGTH: **
   1. The logs (Service Unavailable / zero steps / job passed then service-marked failure).
   2. THE CONTROL: Lane Overlap flipped failure -> SUCCESS on the same head, zero code changes.
   3. AN EXTERNAL, INDEPENDENT SOURCE saying GitHub Actions is in a critical outage.
   ** No hypothesis about #621's code survives any one of these, let alone all three. **

!! ** DO NOT TOUCH #621's BRANCH. ** Its content is unchanged since AMEND-621, every local gate was
green, and the one CI gate that obtained a runner passes. ** There is nothing here to fix, and
editing code to chase this green is how a real regression gets introduced while cleaning up a
phantom. ** The correct action is to WAIT for GitHub and re-run. Controller has armed a watch on
the STATUS PAGE (the real gating signal), not on the stuck runs.

## THE EMPTY-COMMIT TEST, AND A DOCTRINE THE CONTROLLER GOT WRONG

** OWNER'S CORRECTION, AND IT IS RIGHT: **
** A WATCH THAT POLLS FOR JOB COMPLETION CANNOT SEE A JOB THAT WAS NEVER CREATED. **
"Waiting for the outage" and "no run exists" look IDENTICAL from outside, and the check the
controller specced could not tell them apart. It polled `gh pr checks` / run conclusions - both of
which are silent when there is nothing to conclude. ** BEFORE WAITING ON CI, CONFIRM A RUN EXISTS,
not merely that the PR is BLOCKED. ** Watch stopped. Replacement watch polls for RUN EXISTENCE on
the specific head - the correctly-specified condition.
  -> This is the same shape as the wave's other findings: the signal read as its own opposite.
     Fifth instance. And this one was the CONTROLLER's instrument, not a lane's.

** THE TEST RESULT - the owner pushed an empty commit `ceb1b7d7 -> 1010854` to re-trigger: **
    ** ZERO WORKFLOW RUNS WERE CREATED FOR HEAD `1010854`. Not Quality Gate, not CodeQL, and NOT
    Lane Overlap - the very job that had completed in 12 SECONDS on the previous head. **
    Only Vercel reports (a separate integration, not GitHub Actions).

** AND IT IS REPO-WIDE, NOT #621's: the most recent workflow run ANYWHERE in this repository, on
ANY branch, is still the `ceb1b7d7` set from 2026-08-06T17:00:53Z. Nothing has dispatched since. **

=> ** THE OWNER'S INFERENCE ("Lane Overlap ran in 12s, so the repo can dispatch; the outage may not
be the cause") WAS CORRECT FOR 17:00Z AND HAS SINCE BEEN OVERTAKEN. ** Dispatch worked then and does
not work now. The empty-commit test is what established that - a real experiment with a clean
negative result. GitHub's incident (still `major_outage`, updated 2026-08-06T22:18Z) now reads:
"We have deployed a fix that addresses runners being assigned jobs that are no longer valid... For
workflow runs that are STARTING, success rat[es]..." - i.e. some runs are not starting at all.

** PR STATE CHANGED: `#621` is NO LONGER A DRAFT (`draft=false`) - the owner has readied it.
mergeState=BLOCKED, because required checks have NO RESULT (no run exists to produce one).
BLOCKED here does NOT mean a gate failed. It means nothing ran. **

** RESOLUTION 2026-08-07: DISPATCH RECOVERED. ** Head `1010854` now has all THREE runs -
Lane Overlap `completed/success`, Quality Gate and CodeQL `in_progress`. ** The owner's empty commit
was the right experiment and it worked; it simply needed Actions to come back first. ** The
correctly-specified watch (does a RUN EXIST for this head?) is what detected it - the completion
watch it replaced would have stayed silent through this exact transition.

!! STILL TRUE, AND UNCHANGED BY ANY OF THIS: ** DO NOT TOUCH #621's BRANCH. ** Its content is
unchanged since AMEND-621 apart from an empty commit. Nothing here is a code defect.

## FENCE + CAP - ANSWERED FROM SOURCE (scout, 2026-08-07). THE OWNER RULES ON THESE.

** F1 - THE FENCE IS `\"\"\"` ON BOTH PATHS. ** Batch (`blockFor`): `The student's typed answer is:`
then a 5-space-indented `\"\"\"` fence. Single (`handleCheckSolution`): same 3-char token, no indent.
Same delimiter; the literals are not byte-identical.

** F2 - FORGEABLE: YES. ** Any line whose content is `\"\"\"`. Chain: client `String(textAnswer).trim()`
-> `JSON.stringify` -> server `String(q.textAnswer || '').trim()` -> RAW CONCATENATION.
** No escape, no filter, no truncation. ** No `.slice()` or length check exists on either path; the
only bound is `readJson(req, 8*1024*1024)` - ~8MB of student-controlled prompt text. Repo-wide grep
for sanitiz/injection/escapePrompt/promptGuard over `server/**` finds only an OUTPUT-side helper in
an orphaned module. ** Only the student's FIRST line inherits the 5-space indent, so a forged fence
lands at column 0. **

** F3 - BLAST RADIUS: YES, Q3's TEXT CAN REACH Q7's GRADING. ** One `callGemini`, one `contents`, one
user turn carrying the system prompt, EVERY question block, EVERY marking scheme INCLUDING other
questions' `Final answer:` keys, EVERY typed answer, up to 12 image parts, and the shared schema+rules
tail. ** N runs to 20 (`COUNT_PRESETS = [5,10,15,20]`); the 12-cap bounds `uploads[]`, NEVER
`questions[]`. **

** F4 - WHAT SURVIVES AN INJECTION, AND WHAT DOES NOT. ** `responseSchema` IS on this path
(`WORKSHEET_RESPONSE_SCHEMA`, distinct from the single-question one).
  SURVIVE: schema shape/type (no value bounds) - parse gate + one retry - ** qNumber reconciliation **
  (unknown qNumbers DROPPED; omitted -> `couldNotRead`, NEVER a silent zero) - ** per-question mark
  ceiling ** `Math.min(totalAwarded, totalMarks)` with `totalMarks` from the REQUEST, not the model -
  per-step half-mark rounding - ** keyed objective 0/full clamp ** (`clampObjectiveResult` OVERRIDES
  the model) - `status`/`mistakeType` allowlists - the no-working honesty guard.
  ** DO NOT SURVIVE: the SUBJECTIVE MARK ITSELF ** - nothing compares it to the work, so an injection
  can drive every subjective question to full marks - plus `couldNotRead`, every free-text field shown
  to the student (`teacherNote`, `note`, `summary`, `teacherAnnotation`, `studentWork`,
  `correctedWorking`), MI `mistakeSummary` counts, and the ** KEYLESS ** `flaggedObjective` <=1-mark
  verdict (shape survives; the verdict is the model's).
  ** PRIVILEGE BOUNDARY HOLDS: ** entitlement and rate limiting are pre-handler and prompt-independent.
  ** The damage is SELF-INFLICTED grade inflation and a polluted OWN MI. Not another student's. **

** F5 - THE FENCE FIX IS A SINGLE CHOKE POINT: 2 SITES, 1 FILE ** - `handleCheckSolution` and
`blockFor`, both in `checkSolution.cjs` (`blockFor` has exactly 2 invocations, both inside
`gradeStructuredSet`). ** NO CLIENT CHANGE NEEDED. **
  !! BUT THE WIDER SURFACE IS 19 SITES ACROSS 6 SERVER FILES. `textAnswer` is 2 of 19.
  ** `/api/tutor` is 9 of them - a LARGER, OLDER free-text surface ** - plus `/api/check-solution` x3,
  `/api/grade-worksheet` x2, and one each for detect-question, step-solution, generate-diagram,
  generate-visual, more-like-this. ** `figures[].label` and `brief.*` reach the SYSTEM prompt,
  uncapped and unvalidated. **
  AMEND-621's claim VERIFIED AND COMPLETE for `textAnswer`: `SolutionChecker.tsx` and
  `DesktopCheckImprovePage.tsx` are the ONLY two senders; no third exists.

** C1 - ONE server invocation ** (`handleGradeWorksheet`, route `POST /api/grade-worksheet`).
FIVE client callers: Worksheet, Chapter Test, Full Mock, Check & Improve, Quick Practice.

** C2 - QUICK PRACTICE IS THE ONLY `uploads[]` SENDER. ** Worksheet / Chapter Test / Full Mock / C&I
send ONE `imageBase64` PDF each and NO `uploads[]`, so `uploads` is `[]` and cannot exceed 12.
  !! ** ON TRUNK, QP's builder is UNCAPPED and presets go to 20 - a LATENT 400, inert ONLY because
  nothing calls it. #621 adds both the trigger AND the client cap. THEREFORE #621 MUST NOT BE SPLIT:
  a trigger merged without the cap re-opens exactly this. **

** C3 - FULL MOCK SILENT 400: FALSE. ** The cap counts ANSWER PHOTOS in `uploads[]`, not questions.
Full Mock's `gradeWorksheet({...})` literal has NO `uploads` key, so `uploads` is `[]` and `0 > 12` is
false. "A CBSE mock has far more than 12 questions" is TRUE BUT IRRELEVANT - nothing bounds
`questions.length` (only `=== 0` is rejected). ** Student sees UNCHANGED behaviour: the single PDF
grades, results reconcile by `qNumber`, unreadable answers return honest-pending, never a silent
zero. NO 400. **
  (Full Mock does carry a DIFFERENT real risk on that surface: truncation at `maxOutputTokens: 32000`
  -> one retry -> `{ok:false}`. Already flagged in-code as `[FU-ASYNC-GRADING]`. Not the cap.)

** NOT ESTABLISHED (2): **
  1. ** Whether a real Gemini model actually OBEYS a forged fence. ** Nobody has run it live -
     AMEND-621 says so explicitly and the scout did not attempt it either.
  2. ** Whether the two `/admin/diagram-*` pages are blocked SERVER-side. ** They are reported as the
     only `/admin/*` routes NOT wrapped in `<RequireAuth>`, and they post a free-text textarea to
     `/api/generate-diagram`. ** The one plausible UNAUTHENTICATED free-text path to Gemini in the
     enumeration. ** Outside the fence question; `entitlement.cjs` / `verifiedCaller.cjs` were not
     opened for that route. -> NEEDS ITS OWN CHECK. Cost AND abuse exposure if unauthenticated.

## #621 ZERO-SKIP PROOF - PROVEN GREEN, NOT MERELY TICKED (head 1010854)

Runs: Quality Gate 31129699417 - CodeQL 31129699416 - Lane Overlap 31129699435. All headSha
`10108548...`, all conclusion=success. PR state: draft=false, mergeState=CLEAN, mergeable=MERGEABLE.

  ROOT GUARD MATRIX  "# tests 196  # suites 29  # pass 196  # fail 0  # skipped 0  # todo 0"
                     (read from THIS run - the count GROWS; never compare to a remembered number)
  VITEST             "Test Files 117 passed (117)" / "Tests 1463 passed (1463)" - passed == total.
                     The lane's own new suites are visibly present in the run.
  OPS MATRIX         27 sub-suites in an &&-chain, so NO single aggregate line exists. Proof that it
                     did not abort early = ** THE LAST LINK RAN ** ("Mojibake acceptance PASSED (6/6)").
                     Nine node:test sub-suites each printed `# fail 0 # skipped 0 # todo 0`.
  MOJIBAKE           "enforced_hits=0 report_only_hits=8" - the 8 are PRE-EXISTING handoff specimens
                     (deliberate mojibake quoted in lessons ABOUT mojibake), none in #621's change set.
  BUILD              "vite v7.3.1 ... 1121 modules transformed ... built in 9.94s"
  LANE OVERLAP       "PR #621 changes 10 file(s). Comparing against 0 other open PR(s).
                      PASS: no lane overlap with any other open PR."
  ** CODEQL GENUINELY RAN THIS TIME ** - unlike the previous head, where its only step was
                     `Set up job = failure`. Evidence: extractor loaded, ** database BUILT **
                     (`codeql database finalize`, TRAP import), ** ~45 QUERIES EXECUTED **
                     (js/sql-injection, js/path-injection, js/clear-text-logging, js/redos, ...),
                     SARIF exported and uploaded. ** ZERO open code-scanning alerts on the branch. **
                     -> The security question the controller raised is now answered by an analysis
                        that ACTUALLY EXECUTED, not by a tick.

** THE ONE SKIPPED STEP IS THE PROOF THE FULL BAR RAN. ** Quality Gate step 10 "Docs-lane classifier
acceptance (fast path)" = skipped, gated by "CI_DOCS_LANE_VERDICT: FULL BAR - 10 non-docs path(s)
changed" and the receipt "CI_DOCS_LANE_PATH_FULL_BAR_RAN: true". That same acceptance ran anyway
inside the ops matrix ("CI docs-lane acceptance PASSED - 18/18"). Every other step succeeded; none
skipped. No `##[error]` anywhere; logs complete, not truncated.

!! ** STANDING CI GAP FOUND - NOT a #621 defect, and NOT a blocker: **
`node scripts/verify-production-build.mjs` - the post-build bundle verifier REQUIRED BY CLAUDE.md
section 6 - is ** ABSENT FROM CI **. The string "verify-production-build" appears ZERO times in the
Quality Gate log; the Build step is `vite build` alone. ** CI HAS NEVER RUN IT. **
  -> [FU-CI-VERIFY-PRODUCTION-BUILD-NOT-WIRED]. A gate named in our own standing instructions that
     no run executes is the definition of a silent no-op, one level up from the code.

Also present and worth the receipt (not listed in section 6): Firestore rules tests (27/27), edge
security tests (24/24, 8 suites), root `typecheck` (scripts + artifacts/api-server), and lazytopper
`typecheck:test` against tsconfig.test.json - clean.

## !! THE LIVE DEFECT #621 DID NOT FIX - AND THE FIFTH "SIGNAL READS AS ITS OPPOSITE"

** TRUNK IS NOW `d03550e1b4069ecd40dd1047ef32f054f849fcf3` ** - `#621` MERGED 2026-08-06T23:17:25Z.
Zero open PRs. The WIRE-2 arc (#578 -> #611 -> #617 -> #621) is fully on trunk.

** THE OWNER LIVE-VERIFIED ON MOBILE AND TYPED ANSWERS ARE STILL NOT GRADED. **

    POST /api/grade-worksheet  ->  400
    { ok: false, error: 'Upload one PDF of your answers to grade.' }

** ROOT CAUSE (found by the OWNER, not by any gate): `handleGradeWorksheet` REFUSES A ZERO-UPLOAD
REQUEST. ** The guard PREDATES batch grading - written for the worksheet flow, where a PDF was always
present. A typed-only batch has no uploads, so it is refused AT THE FRONT DOOR and `#625`'s
`blockFor()` typed emission is NEVER REACHED.
  It explains every symptom exactly: the client classifier works, the payload builder works,
  `textAnswer` IS sent, MCQs are unaffected (they never touch the server), and it fails EVERY time
  rather than intermittently.

** ★★ THE DOCTRINE - AND IT IS A GAP IN THE COFOUNDER'S OWN TYPED-1 SPEC, which he named himself: **
   TYPED-1's brief said "blockFor emits the typed working when present" and ** NEVER ASKED WHETHER A
   REQUEST CARRYING ONLY TYPED ANSWERS IS ADMITTED. ** The lane did exactly what it was told; the
   endpoint refused the call one layer up.
   ** A FIELD REACHING THE EMITTER IS NOT THE SAME AS THE REQUEST REACHING THE EMITTER. **
   Same family as MOUNT != LIVE, one layer out. FIFTH instance this wave.

** ★★ AND THE SCOREBOARD THAT MATTERS: FOUR LANES GREEN, CI GREEN ON ALL FOUR, #621 PROVEN GREEN
WITH A FULL ZERO-SKIP RECEIPT - AND A TYPED ANSWER HAD NEVER ONCE BEEN GRADED IN PRODUCTION.
FOURTH CONSECUTIVE WAVE IN WHICH THE OWNER'S DEPLOYED-PRODUCT CHECK FOUND WHAT THE SUITE COULD NOT. **

** A CONTROLLER TRAP AVOIDED, WORTH RECORDING: ** the report of this defect noted "2 hits for
`typed-no-channel` still on trunk". ** BOTH HITS ARE COMMENTS ** - a doc block and an inline note
that exist BECAUSE the hinge was deleted, explaining what replaced it. The live code on trunk is
`if (nonEmpty(answer.imageBase64) || nonEmpty(answer.textAnswer)) return "batch";` and
`typed-no-channel` is gone from the union type itself. ** A GREP HIT IS NOT LIVE CODE. ** Checking
by content took one command and prevented re-dispatching a lane that had already merged.

## LANE: TYPED-2 - DISPATCHED 2026-08-07, cut from trunk `d03550e1`, zero open PRs
Server-only: `checkSolution.cjs` + tests. Admit a zero-upload request WHEN >=1 question carries typed
working; ** NARROW the guard, never delete it ** (no uploads AND no typed is still an error, and its
message must say what is actually missing rather than "upload one PDF" to a student who typed);
ENUMERATE where else this guard shape exists and REPORT ONLY; `#578`'s sha256 pin must not move.
Assertion 2 is the CONTROL for assertion 1.

## TYPED-2 RESULT (#626) - THE DEFECT WAS TWO LAYERS, AND THE SPEC ONLY NAMED ONE

PR #626, DRAFT, mergeState=CLEAN, 2 files (`checkSolution.cjs` + its test). ONLY open PR.
CI run 31134012262 SUCCESS on head `c4475034`. Zero-skip: check-solution `# pass 86 # fail 0
# skipped 0`; vitest `Test Files 117 passed (117)` / `Tests 1463 passed (1463)`. No manifest edit
needed - no new test FILE, and `a15` already enumerates `test:server:check-solution`.

** ★★ FINDING 1 - ADMISSION ALONE WAS NOT SUFFICIENT. THE COFOUNDER'S ROOT CAUSE WAS HALF THE BUG. **
The no-uploads PROMPT BRANCH is itself written for a worksheet PDF: it states *"the attached PDF
contains the student's handwritten answers"* and appends `buildGeminiImagePart({ base64: imageBase64 })`
** UNCONDITIONALLY **. So a typed-only request that got PAST the guard would still send an ** EMPTY
IMAGE PART ** and describe a document the student never sent.
  Fixed with `hasDocument` / `perQuestionParts = hasUploads || !hasDocument` at FOUR branch sites.
  The PER-QUESTION branch was already correct - its rule 1 says *"a question with no image following
  it has no photographed answer - grade the typed answer given in its block."* Pinned by §10.7.
  -> ** Admitting the request and building a coherent prompt for it are TWO different things. The
  brief named the door and not the room behind it. **

** ★★ FINDING 2 - WHY EVERY GATE MISSED THE ORIGINAL DEFECT, AND IT IS A NEW DOCTRINE ITEM. **
The existing test `§9.7 "a typed answer alone reaches the model - the free-tier path is not a 400"`
** SENDS `imageBase64: 'PDFB64'` **. It never exercised a zero-upload request at all.
  ** A TEST TITLE THAT DESCRIBES AN ASSERTION THE TEST DOES NOT MAKE. ** The title reads as exactly
  the coverage that was missing, so every reader - four lanes and the cofounder - saw the path as
  covered. Sibling of "a test with a data guard passes while asserting NOTHING": here the FIXTURE,
  not the guard, is what hollowed it out. -> [FU-TYPED2-SUITE-TITLE-VS-FIXTURE]

** WHERE ELSE (report-only, nothing fixed): A SINGLE SITE. ** `handleCheckSolution`'s
`if (!hasImage && !hasText)` ALREADY admits typed-only - it is the COUNTER-EXAMPLE the fix follows.
`handleDetectQuestion`'s `if (!question && !hasImage)` is about the QUESTION, not the answer.
`readJson`'s body-cap message names a PDF as the only payload (cosmetic -> FU). `questions.length === 0`,
`MAX_BATCH_UPLOADS` and `qrUpload.cjs` are orthogonal. `grade-worksheet` elsewhere is a route NAME only.

** THE NEW STUDENT-FACING MESSAGE: ** `Nothing to grade yet - type your answer or add a photo of your
working, then try again.` (replaces `Upload one PDF of your answers to grade.`, which was FALSE copy
for a student who typed).

** #578's sha256 pin DID NOT MOVE. ** `§7.1` unmodified; `NO_UPLOADS_CONTENTS_SHA256` absent from the
diff; `§10.5` re-asserts it independently. All four no-uploads surfaces post one `imageBase64`, so the
new selector evaluates to exactly `hasUploads` for them.
** GUARD NARROWED, NOT DELETED: ** `§10.2` is the CONTROL - no PDF, no photos AND no typing is still
refused (missing key / `''` / whitespace), `h.calls.length === 0`.
** M1-M4 all RED ** one at a time, `spawnSync` capturing BOTH streams, `mutated-sha != baseline`
proven each time, `RESTORED? true` x4 by SHA, post-restore `86 fail 0`. Nothing committed while the
harness ran.

** ★★ WHAT REMAINS UNPROVEN UNTIL THE OWNER RUNS IT: ** that the CLIENT actually posts a typed-only
batch with a non-empty `textAnswer`; that Gemini grades typed working WELL (`callGemini` is stubbed in
every test); and that the result PERSISTS to history/MI.
  LIVE-VERIFY: mobile, signed-in student ** with existing history (not incognito) ** -> Quick Practice,
  a subjective question -> TYPE the working, ** no photo anywhere in the session ** -> Finish.
  Expect: the typed question GRADED (marks, teacher note, mistake type) and the session in history.
  Then the NEGATIVE control (Finish with nothing typed and no photo -> the new calm refusal) and the
  REGRESSION control (one PDF worksheet grade, unchanged).

## MOBILE "FULL MARKS" - RESOLVED AND CLOSED (not a defect)

The owner's first mobile test ran ** BEFORE `#626` REACHED RAILWAY **. The same session now grades
correctly on BOTH surfaces. => ** NOT a mobile defect, NOT non-deterministic - a pre-`#626`
failed-request path. ** Closed. Recorded so nobody re-opens it as a device-specific bug.

## LANE: TYPED-3 - DISPATCHED 2026-08-07, cut from trunk `a307cfc4`, zero open PRs

`#626` is MERGED; trunk `a307cfc4` IS its mergeCommit, verified BY CONTENT (the new copy
`Nothing to grade yet - ...` is present; the old `Upload one PDF...` is gone).
Server-only: `checkSolution.cjs` + `checkSolution.test.cjs`. TWO defects, both captured in REAL
PRODUCTION TRAFFIC:

** DEFECT A - THE GRADER TELLS A TYPED STUDENT THEIR HANDWRITING WAS ILLEGIBLE. ** Gemini received
perfectly readable text (`"textAnswer": "aksjdhakjdhakjdads"`) and returned
`couldNotRead: true` with *"re-upload this page"*, plus a summary advising the student to be
*"clear and legible"*. ** `#626` fixed the TRANSPORT; the PROMPT still frames the task as reading a
photograph. ** A student who types a WRONG answer is told their WRITING was unclear - wrong
diagnosis, and it teaches the wrong lesson. And "re-upload this page" is incoherent: no page exists.
  -> A typed answer must be graded as TEXT. `couldNotRead` NARROWED to the image path, ** never made
  unreachable ** - a genuinely unreadable photo must still return it (that is assertion 3, the
  CONTROL without which assertion 1 is vacuous).

** DEFECT B - THE RESPONSE SHAPE INVITES A FALSE FULL-MARKS READING. ** When `couldNotRead` is true
the entry carries `totalMarks: 4` and OMITS `marksAwarded`, leaving marks-AVAILABLE as the only
number in the object. ** `totalMarks` MEANS MARKS AVAILABLE AND READS AS MARKS SCORED. ** That is
what a renderer displayed as 4/4 with "outstanding work" pre-`#626`.
  -> Either always emit `marksAwarded` (0 when not graded, never omitted) OR rename. ** Prefer
  whichever makes the wrong reading IMPOSSIBLE rather than merely unlikely. ** A rename is a CONTRACT
  change - grep every reader of `totalMarks` FIRST.

** COFOUNDER'S CORRECTION TO HIS OWN ANALYSIS, CARRIED INTO THE SPEC SO NO LANE INHERITS THE ERROR: **
he had told the owner *"there is no `marksAwarded` field"*. ** WRONG - it EXISTS and is listed in the
response schema's REQUIRED set; it is OMITTED when `couldNotRead` is true, not absent. **
  ⚠ CONTROLLER ADDITION: the spec cites it by LINE NUMBER (`:283`). ** LINE REFERENCES ARE DERIVED
  VALUES NOTHING RE-CHECKS. ** The lane is told to re-locate it BY SYMBOL and to verify the claim
  itself from source rather than inherit EITHER version on faith.

** THE §9.7 FINDING IS CARRIED AS A HARD INSTRUCTION: ** a test titled *"a typed answer alone reaches
the model - not a 400"* that SENT `imageBase64: 'PDFB64'`. ** A TITLE IS NOT AN ASSERTION. ** Every
new test's own FIXTURE must be quoted in the report and checked against its title.

** THE LIMIT, STATED IN THE BRIEF: ** `callGemini` is stubbed in every test, so the lane can prove
what the PROMPT SAYS and NOT what the MODEL DOES. ** All three acceptance behaviours are
owner-live-verify only: ** a typed WRONG answer -> 0 with a reason (not "unreadable"); a typed
CORRECT answer -> marks awarded; a genuinely blurry photo -> `couldNotRead` still works.

## ★★ THE WAVE'S BEST FINDING - CARRY IT FORWARD

** FOUR GREEN LANES. 1,463 TESTS. FOUR CLEAN CI RUNS. A FULL ZERO-SKIP RECEIPT ON `#621`.
AND TYPED GRADING HAD NEVER ONCE WORKED IN PRODUCTION. THE OWNER FOUND IT ON HIS PHONE. **
  -> That sentence is the argument for the ~50-student QA pass, and it is the fourth consecutive
  wave in which the deployed-product check found what the suite could not.

## TYPED-3 RESULT (#627) - THE LANE DISPROVED THE SPEC *AND* ITS CORRECTION

PR #627, DRAFT, mergeState=CLEAN, 2 files (`checkSolution.cjs` + its test). ONLY open PR.
CI run 31139641415 SUCCESS on head `59a0a273`. Zero-skip: `1..92 / # pass 92 / # fail 0 /
# skipped 0 / # todo 0` (86 on trunk); vitest `Test Files 117 passed (117)` / `Tests 1463 passed (1463)`.

** ★★ FINDING 1 - `:283` IS `propertyOrdering`, NOT `required`. ** `required` is `['qNumber']` ALONE.
** BOTH the cofounder's original claim ("there is no marksAwarded field") AND his correction ("it is
in the required set") ARE WRONG ON MECHANISM. ** The omission is the ** SERVER's hand-built early
return **, not the model's.
  -> This is exactly what the controller's "do not inherit EITHER version on faith" instruction was
  for, and it is the second time this wave that a superseding correction was itself wrong. ** A
  CORRECTION IS NOT EVIDENCE. It is a newer claim. **

** FINDING 2 - THE SPEC NAMED THE WRONG BRANCH. ** The typed-only path was NOT on the PDF-framed
prompt - `#626` already closed that. It was on the ** photograph-per-question branch **, whose
`systemPrompt` says *"Each question below is followed IMMEDIATELY by the image of the student's
handwritten answer"* (FALSE - no images exist) and whose `rule6Head` (*"if you CANNOT confidently READ
the image supplied for a question, set couldNotRead"*) is ** THE VERDICT-MAKER **.
  `rule1`'s second sentence was ALREADY CORRECT and is retained VERBATIM, as instructed.

** FINDING 3 - THE DEFECT ALSO HIT THE TYPED HALF OF A MIXED BATCH ** - unnamed by the spec. Fixed
via `hasAnyTyped`, asserted in §11.3, mutation-proven by M4.

** FINDING 4 - A THIRD DEFECT, FOUND NOT SPECCED: ** the pending note said *"re-upload this page"* to
a student who uploaded NOTHING. Fixed honestly, plus a guard against a model note that advises
photography.

** FINDING 5 - AN EXISTING GREEN TEST PINNED DEFECT B. ** `§5.11` asserted `marksAwarded === undefined`.
Fixing the shape REQUIRED changing it; intent re-asserted POSITIVELY. (Same family as `#490`'s
`Login.oneDoor.test.tsx` pinning the defect it was meant to prevent.)

** ★★ THE MUTATION CAUGHT A HOLE IN THE TEST, NOT THE CODE - AND THAT IS THE POINT OF MUTATIONS. **
M3 went ** GREEN ** first: `§11.3` asserted a FRAGMENT, and a prepended *"NEVER set couldNotRead."*
survived it. Re-anchored to the WHOLE rule-6 head, then red. ** The hole was in the test. ** A lane
that had recorded M3 as "no trap" would have shipped an assertion that could not fail.

** DEFECT B RESOLVED AS EMIT-ALWAYS (`marksAwarded: 0`), NOT RENAME. ** `totalMarks` is read by FIVE
sites - `aiClient.ts`, `CheckImproveGradedPrintDoc.tsx`, `SolutionChecker.tsx`,
`PracticeQuestionCard.tsx`, `scorecardVariants.ts`/`WorksheetGradePanel.tsx`. A rename breaks all five
and `src/` was off-limits. ** The contract grep is what decided it, exactly as the brief required. **
`gradedMarksAwarded`/`gradedMarksTotal` do NOT share the ambiguity (symmetric pair) - ** but
`worksheetTotalMarks` vs `gradedMarksTotal` is a WRONG-DENOMINATOR hazard, the same shape as `#501`. **
Reported, not widened -> [FU-TYPED3-GRADED-DENOMINATOR-PAIRING].

** EVERY NEW FIXTURE QUOTED ** in §6 of the report; all six exercise their titles - each typed case
posts NO `imageBase64` and NO `uploads`, with the `§9.7` trap checked EXPLICITLY.
** `couldNotRead` STILL REACHABLE FOR AN IMAGE: ** `§11.3` control asserts the head verbatim on a photo
batch AND that `couldNotRead:true` survives to the body with `pendingCount 1` and the "re-upload this
page" copy. ** #578's pin UNMODIFIED. ** M1-M4 all red, restored by byte-snapshot SHA, post-restore 92/92.

** ★★ UNPROVABLE PRE-MERGE (`callGemini` stubbed everywhere), ALL THREE OWNER-LIVE-VERIFY: ** that the
model grades wrong typed text as 0-with-a-reason; that it awards marks for correct typed text; that a
blurry photo still returns `couldNotRead`. On mobile, in a session WITH EXISTING HISTORY.

## ===== WAVE 5F CLOSED - THE FINAL RECORD =====

** TRUNK: `fbfb57faa4f6dacbd3cfac54d45d4910df92eb08`. ZERO OPEN PRs. **
All six merge commits verified ON TRUNK by ancestry, not by PR state (this repo squash-merges):

    #619  c3c9de18  WARM-GATE-1  gate the startup pre-warm, then the schema
    #620  6783850b  TELEMETRY-1  attribute the AI spend by workload
    #625  b48d6e38  TYPED-1      a channel for typed working + an exported upload cap
    #621  d03550e1  WIRE-2       flip Quick Practice to collect-and-batch grading
    #626  a307cfc4  TYPED-2      admit a typed-only batch at the grading endpoint
    #627  fbfb57fa  TYPED-3      a typed answer is text, not an unreadable photograph

** ★★ THE OWNER'S LIVE-VERIFY PASSED ON ALL THREE, INCLUDING THE CONTROL: **
   · typed WRONG   -> 0 with a REASON, not "unreadable"
   · typed CORRECT -> marks AWARDED
   · blurry PHOTO  -> `couldNotRead` STILL FIRES   <- the control; the fix narrowed, did not delete
** TYPED GRADING NOW WORKS END TO END. `#578`'s seam has executed against real Gemini. **

## ★★ THE SENTENCE THAT DEFINES THIS WAVE

** SIX PRs. FOUR LANES. 1,400+ TESTS. SIX GREEN CI RUNS. AND TYPED GRADING HAD NEVER ONCE WORKED IN
PRODUCTION UNTIL THE OWNER TRIED IT ON HIS PHONE. NO GATE FOUND IT. **
  -> That is the argument for the ~50-student QA pass, in one sentence. Fourth consecutive wave in
     which the deployed-product check found what the suite could not.

## THREE NEW FUs FROM THE LIVE-VERIFY - none blocking the wave

** [FU-UPLOAD-LIMIT-BLOCKS-PHONE-PHOTOS] - ★ PRE-LAUNCH BLOCKING. ** A normal phone photo (3 MB+)
EXCEEDS the limit; the owner had to photograph, convert to PDF, then upload. ** A photo-grading
product that rejects phone photos is broken for its primary use case - and this is the FREE-TIER
path. ** Fix: raise images to ~10 MB AND add client-side downscale (~2000px long edge, ~85% quality
- a 4 MB photo becomes ~600 KB with no loss of legibility, and it cuts input tokens too).
⚠ ** CHECK THE SERVER CAP TOO, or raising the client yields a 413 instead of a friendly refusal -
the same shape as the `MAX_BATCH_UPLOADS` 400 this wave already paid for. **

** [FU-QP-GRADED-SHEET-NO-STEPWISE-MARKING] ** - the graded sheet shows annotated working but only
two lines naming where marks were lost. ** A TEACHER MARKS STEP BY STEP. ** Without that the tutor
receives a score and a mistake type, not a diagnosis it can teach from - and `RESULTS-1` §1b promised
*"the same board-style depth Check & Improve gives today"*. Owner-observed. Its own lane.

** [FU-GRADING-CONSISTENCY-UNMEASURED] ** - temperature is ALREADY 0.05 on grading and
`responseSchema` shipped in `#559`, so ** the easy determinism levers are spent. ** The remaining
variance is judgement on ambiguous inputs, and ** nobody has MEASURED it: ** grade the same answer
ten times and compare. A HARNESS, not a fix. ** It gates any rubric or thinking-budget work
(including `SERVER-2`). **

## ★★ DOCTRINE EARNED - three from the TYPED-3 lane alone

** 1. A CORRECTION IS NOT EVIDENCE - IT IS A NEWER CLAIM. ** Verify BOTH versions rather than
trusting the later one. TWICE this wave a superseding correction was itself wrong, and both were the
cofounder's. `:283` is `propertyOrdering`, not `required` - a grep hit read without reading the two
lines around it, ** the same mechanism as the `typed-no-channel` comments twelve hours earlier. **

** 2. A MUTATION THAT GOES GREEN MAY BE A HOLE IN THE TEST, NOT THE ABSENCE OF A TRAP. ** M3 passed
because `§11.3` asserted a FRAGMENT; re-anchored to the whole rule-6 head, it reddened.

** 3. AN EXISTING GREEN TEST CAN PIN THE DEFECT IT WAS MEANT TO PREVENT. ** `§5.11` asserted
`marksAwarded === undefined`. Same family as `#490`'s `Login.oneDoor.test.tsx`.

  (And the wave's other five, recorded in their own sections above: a field reaching the emitter is
  not the request reaching the emitter · a title is not an assertion · a grep hit is not live code ·
  a watch that polls for completion cannot see a job never created · a logger's severity is about
  the status code, not about whether anything went wrong.)

## CARRIED UNRULED INTO WAVE 5G - the owner's decision, deliberately deferred

** THE FENCE ** - `[FU-TYPED1-FENCE-IS-NOT-ESCAPING]` / `[FU-AMEND621-FENCE-ESCAPE-IS-SERVER-SIDE]` /
`[FU-AMEND621-BATCH-WIDENS-INJECTION-BLAST-RADIUS]`. ★ ** PRODUCT-WIDE AND LIVE TODAY ON CHECK &
IMPROVE ** - AMEND-621 established the surface was ALREADY OPEN on two client paths before this arc.
Its own lane, covering ALL THREE call sites. Facts are settled in the FENCE + CAP section above:
forgeable YES; blast radius reaches other questions in the same call; the SUBJECTIVE MARK is what an
injection can inflate; ** the privilege boundary HOLDS and the damage is self-inflicted; ** the fence
fix is 2 sites in 1 server file, but the WIDER free-text surface is 19 sites across 6 files, of which
`/api/tutor` is 9.

** `/admin/diagram-*` AUTHENTICATION ** - reported as the only `/admin/*` routes NOT wrapped in
`<RequireAuth>`, posting a free-text textarea to `/api/generate-diagram`. ** The one plausible
UNAUTHENTICATED free-text path to Gemini. ** NOT ESTABLISHED whether it is blocked server-side;
`entitlement.cjs` / `verifiedCaller.cjs` were never opened for that route. ** The owner will not rule
from a name - this needs the finding first. **

## DISJOINTNESS
WARM-GATE-1 (#619): lazytopper/package.json, server/db/ensureGeneratedQuestionsTable.cjs,
                    server/index.cjs, server/services/warmQuestionPool{,.test}.cjs
TELEMETRY-1 (#620): server/routes/adminTelemetry{,.test}.cjs, server/routes/checkSolution{,.test}.cjs,
                    server/services/geminiClient{,.test}.cjs, server/telemetry.cjs
WIRE-2      (#621): src/components/practice/PracticeQuestion{Card,List}.tsx,
                    src/components/question/SolutionChecker.tsx,
                    src/components/results/ResultsScorecard{,.gradedSheet.test}.tsx,
                    src/pages/PracticePage{,.batchGrading.test}.tsx,
                    src/services/quickPracticeSessionService{,.wire.test}.ts

*** ALL THREE VERIFIED MUTUALLY DISJOINT BY THE CONTROLLER - ACTUAL PR file lists compared, not
    declared allowlists. ZERO shared paths. ***

*** App.tsx WAS NEVER TOUCHED. Section 9b's authorization went UNUSED and, per ruling 3A, STAYS
    GRANTED for the future graded-sheet route lane. No `GATED path` warning will fire on #621. ***

!! THE SERVER LANE WILL OVERLAP #620's `checkSolution.cjs` IF IT TOUCHES IT. It must be cut AFTER
   #620 merges, never beside it. #619 and #620 must both be on trunk before the server lane cuts.

*** THE SHARED LOCK THAT ALMOST BIT ***
`lazytopper/package.json` IS a shared lock in principle: root guard-matrix check `a15`
(`test:ci:docs-lane`) ENUMERATES `server/**/*.test.cjs` FROM DISK and reddens the matrix if one is
unwired. WARM-GATE-1 added a NEW server test and HAD to edit the manifest; TELEMETRY-1 did not.
  !! THE NEW SERVER LANE MUST EXPECT THIS SAME LOCK if it adds a server .cjs test.
  LESSON: a DECLARED-allowlist comparison cannot see a lock created by a gate that enumerates from
  disk. ACTUAL PR file lists ARE checkable, and that check is the controller's job, not the lane's.

MERGE ORDER: #619 DONE -> #620 DONE -> #625 DONE -> AMEND-621 (in flight) -> #621 LAST.
NEVER STACK. A stacked PR deadlocks with its own base in `lane_overlap` (#608/#609, Wave 5D).

## DECISIONS MADE THIS WAVE
- 2026-08-06 Corrected the dispatch's trunk SHA `9cfcb09a` -> `0a9c9f97` BEFORE dispatching, and
  stamped the live SHA into all three briefs. The count rule applies to a commit: a SHA is read at
  the time, never carried. (Trunk moved twice more within the wave - `ecacdfed`. Rule earned twice.)
- 2026-08-06 Corrected WIRE-2 section 7's report path from the `wave 5e` dir to `wave 5f`.
- 2026-08-06 Retired the stale Wave 5E `WAVE_STATE.md` to `WAVE_STATE_WAVE5E_LIVE.md`. Dispatch
  section 2.4 predicted 5E had ALREADY retired its own. It had NOT. CHECK; never assume.
- 2026-08-06 Did NOT rewrite the briefs from the mojibake'd copies in controller context; the
  ON-DISK copies are clean UTF-8 and authoritative. Only surgical, hash-verified edits.
- 2026-08-06 ACCEPTED WARM-GATE-1's `lazytopper/package.json` edit as REQUIRED, not scope creep.
- 2026-08-06 ACCEPTED TELEMETRY-1's edit of `geminiClient.cjs` + `telemetry.cjs`: the brief named
  `tokenTelemetry.cjs`, WHICH DOES NOT EXIST.
- 2026-08-06 ACCEPTED TELEMETRY-1's SECOND ORTHOGONAL AXIS over widening `CALL_CLASSES`, which is
  pinned equal to rateLimiter.PAID_ENDPOINTS so the datasets JOIN.
- 2026-08-06 ACCEPTED WIRE-2's addition of `PracticeQuestionList.tsx`: the ONLY edge between page
  and card, pure pass-through, flagged. The brief's allowlist was WRONG (PracticeQuestionCard is
  under `components/practice/`, not `components/question/`) AND INCOMPLETE.
- 2026-08-06 HELD screenshots pending decisions 1 and 3. Ruling 3A settles the surface =>
  SCHEDULE THE CAPTURE PASS AFTER THE SERVER LANE, BEFORE #621 MERGES.
- 2026-08-06 **OWNER RULING 1A** - the server field lands BEFORE #621 merges. Typed working is the
  FREE-TIER path: a student without a camera, or on a laptop, types. Regressing it hits the students
  LEAST able to work around it, and "a later lane will fix it" is exactly how #578 sat dead for
  eight days. 1C rejected STRUCTURALLY: it breaks the "exactly one call per session" invariant that
  the whole lane rests on. WIRE-2 was RIGHT not to reach for server/** - the allowlist working.
- 2026-08-06 **OWNER RULING 2A** - the client-side upload cap folds into the same server lane. A
  hard 400 with no explanation is the silent failure this project keeps paying for, and it is
  nearly free to fix while a server lane runs anyway.
- 2026-08-06 **OWNER RULING 3A - THE OWNER REVERSED HIS OWN RULING.** He ruled "route, not modal"
  partly on 1,877px of content inside a 540px card. RESULTS-1 (#617) had ALREADY fixed that overflow
  with max-height + scroll. ** HE RULED ON A MEASUREMENT THAT WAS SUPERSEDED BEFORE THE LANE OPENED
  - THE COUNT RULE APPLIED TO A LAYOUT. ** His remaining reason (a graded paper is something a
  student RETURNS to) still stands but does NOT justify bolting a top-level branch onto
  PracticePage.tsx, whose GUARD 3 pins `<PracticePage />` PROPLESS and which has a production-break
  history. He recorded the lane's reasoning as better than his own.
- 2026-08-06 [RESTORED IN PASS 8] Drizzle finding RECORDED, NOT DISPATCHED - outside every current
  allowlist, belongs to a later wave. Do not let a lane absorb it.
- 2026-08-06 ** CONTROLLER RULING: MERGE TRUNK IN, DO NOT REBASE #621's BRANCH. ** AMEND-621's brief
  said "rebase #621's branch onto trunk". That branch is ALREADY PUSHED, so a rebase would require
  `git push --force`, which `CLAUDE.md` section 3 lists as NEVER auto-approved. A `git merge
  origin/base/approved-thru-437` resolves the import identically, and because this repo
  SQUASH-merges the branch's intermediate history collapses at merge and never reaches trunk - a
  rebase buys nothing. The lane is told to STOP AND REPORT if it believes a force-push is genuinely
  required: that is the OWNER's call. ** A brief instructing a never-auto-approved operation is a
  spec error the controller must catch BEFORE dispatch, not a permission to grant quietly. **
- 2026-08-06 Told AMEND-621 explicitly NOT to "clean up" `16dd9506` (the fixed-forward mutation
  commit) in #621's history - known, deliberate, harmless under squash-merge, and tidying it would
  mean a force-push for no benefit.

** !! LESSON, PASS 8 - A SECTION-LIST DIFF IS NOT A COMPLETENESS CHECK EITHER. **
The controller note says to diff the SECTION LIST after every rewrite. I did, every pass, and it
passed every time - while a DECISION LINE inside a section went missing. ** A section-list diff
catches dropped SECTIONS, not dropped LINES. ** It is the same failure the note itself describes
one level down: a uniqueness check is not a completeness check, and neither is a section check.
=> ALSO diff the LINE COUNT per section, or grep for a known-load-bearing token from each section,
before writing. The FU entry survived, which is why this was recoverable at all.

## FU ENTRIES COLLECTED
- [FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]  <- ** THE SERIOUS ONE. READ BEFORE ANY drizzle-kit push **
  A SECOND migration mechanism exists (Drizzle, `lib/db/src/schema/generatedQuestions.ts`) whose
  `generated_questions` OMITS answer/solution_steps/final_answer AND the unique index that
  `saveToPool`'s ON CONFLICT requires. `drizzle-kit push` alone would create a table the live server
  CANNOT WRITE TO - and IT WOULD LOOK LIKE SUCCESS. Outside allowlist, not fixed.
- [FU-QP-GRADED-SHEET-NOT-A-ROUTE]  <- ** LOGGED WITH TEETH BY THE OWNER: DEFERRED, NOT RESOLVED **
  The graded sheet is NOT linkable, NOT bookmarkable, NOT reachable from history, and Quick Practice
  sessions will therefore NOT appear in SurfaceHistory alongside Chapter Test and Full Mock.
  Section 9b's App.tsx authorization is UNUSED and STAYS GRANTED for that future lane.
- [FU-BATCH-TYPED-ANSWER-NO-CHANNEL]  -> being CLOSED by the new server lane (ruling 1A)
- [FU-QP-BATCH-CAP-13-UPLOADS-400]    -> being CLOSED by the same lane (ruling 2A)
- [FU-WARMGATE-ADMIN-ENDPOINT-UNGATED-BY-MASTER], [FU-WARMGATE-PACKAGEJSON-SHARED-LOCK],
  [FU-WARMGATE-ENV-EXAMPLE]
- [FU-TELEMETRY1-WARM-TRIGGER-UNSPLIT], [FU-TELEMETRY1-OFFLINE-SCRIPTS-UNMEASURED],
  [FU-TELEMETRY1-MENTOR-BUILDER-DEAD] (`mentorResponseBuilder.cjs` is an ORPHAN - 10 of the 26
  callGemini invocations live in it and never run), [FU-TELEMETRY1-STREAM-UNINSTRUMENTED],
  [FU-TELEMETRY1-RATE-FROM-ENV], [FU-TELEMETRY1-SAMPLES-VOLATILE]
- [FU-TYPED1-AMEND621-DELETE-HINGE], [FU-TYPED1-CAP-HAS-NO-CLIENT-READER],
  [FU-TYPED1-FENCE-IS-NOT-ESCAPING] <- ** owner's eye: read its BODY in the TYPED-1 report; do NOT
  reconstruct it from the id **, [FU-TYPED1-LIVE-VERIFY-OWED]
- [FU-TYPED3-GRADED-DENOMINATOR-PAIRING] <- wrong-denominator hazard, same shape as #501
- [FU-TYPED3-AICLIENT-DOC-COMMENT-STALE], [FU-TYPED3-STUB-COULDNOTREAD-COPY],
  [FU-TYPED3-MODEL-BEHAVIOUR-UNMEASURED]
- [FU-TYPED2-SUITE-TITLE-VS-FIXTURE] <- a test whose TITLE names the coverage its FIXTURE omits
- [FU-TYPED2-WORKLOAD-CLASS-TYPED-ONLY], [FU-TYPED2-BODY-CAP-COPY]
- [FU-CI-VERIFY-PRODUCTION-BUILD-NOT-WIRED]  <- a CLAUDE.md section 6 gate that CI never runs
- [FU-QP-HISTORY-RAIL], [FU-QP-GATE3-COLLECT-MODE-PREMIUM-PREVIEW],
  [FU-QP-OBJECTIVE-NONBINARY-FROM-SERVER], [FU-QP-BATCH-FAILURE-NO-RECORD],
  [FU-RESULTS1-SPLIT-HEADING-COMMENT-STALE], [FU-WIRE2-ALLOWLIST-MISSING-QUESTIONLIST],
  [FU-MUTATION-HARNESS-RACES-COMMIT]
- (bodies live in the lane report files on disk; ids only here)

## SEQUENCE - agreed with the owner 2026-08-06, updated pass 6
  #619 -> #620 -> #625 -> #621 -> #626 ALL MERGED. TYPED-3 in flight.
  THEN: owner merges TYPED-3 -> owner LIVE-VERIFIES -> ** WAVE 5F HANDOFF (closure option A) **
  covering #619, #620, #625, #621, #626 and TYPED-3's PR -> controller stands down.
  [superseded sequence line kept below for the record]
  #619 DONE -> #620 DONE -> #625 DONE -> AMEND-621 DONE -> ** #621 IS THE LAST PR **:
  CI IS RED -> CI-FIX-621 must make it green (or prove a gate is right) -> the owner rules on the
  FENCE -> `gh pr ready` + merge -> LIVE-VERIFY. ** NOTHING MERGES ON RED. **
  ** #621 DOES NOT MERGE UNTIL TYPED-1 AND AMEND-621 LAND. ** That is the point of 1A: the typed
  regression - and the dishonest "Saved. Graded when you finish." heading - never reach a student.
  ** That final live-verify is where #578's seam executes against real Gemini FOR THE FIRST TIME.
     NINE DAYS OWED. **
  Screenshots for #621: after AMEND-621, before #621 merges. Surface settled by 3A.

## BLOCKED / OWNER DECISIONS OWED

** WAVE-CLOSURE DECISION, NEW AND OWED - raised 2026-08-07 **
`#621` cannot merge while GitHub Actions is in a critical outage of indefinite length. Three of the
wave's four PRs (`#619`, `#620`, `#625`) ARE on trunk. RULE 0 says a wave closes when `handoff/`
describes trunk, and the model says the handoff is written only after EVERY lane is on trunk.
Those two now conflict, through no fault of the repository. THE OPTIONS:
  A. ** HOLD. ** Wait out the outage, merge `#621`, then write one Wave 5F handoff covering all four.
     Cleanest record; open-ended, because the outage has no ETA.
  B. ** CLOSE THREE, CARRY ONE. ** Write the Wave 5F handoff now for `#619`/`#620`/`#625` - which DO
     describe trunk - and carry `#621` + the fence ruling into Wave 5G as its first item.
     ** The risk to name: a docs PR left open while trunk moves goes BEHIND and can silently REVERT
     another lane - so a handoff written now must be rebased and its diff re-verified before merge. **
     ** And a handoff PR needs the same CI that is currently down. **
  C. ** HOLD THE HANDOFF, OPEN WAVE 5G ANYWAY ** on lanes that do not touch `#621`'s files.
     ** Violates "handoff before the next product PR" and is how stale-base reverts happen. **
CONTROLLER RECOMMENDATION: ** A while the outage is hours old; B if it runs past a working day. **
Do NOT choose C.


- **`gh pr ready` + merge on #619, then #620.** The controller does not un-draft and does not merge.
- ** #619's REAL-BOOT LIVE-VERIFY: DISCHARGED 2026-08-06. THE GATE IS PROVEN IN PRODUCTION. **
  With `DATABASE_URL=set` - the EXACT configuration that started 312 Gemini combinations on 5 Aug -
  the boot log read: `[warm] gate WARM_POOL_ENABLED=(unset) | DATABASE_URL=set | STUB_MODE=off`,
  then `startup-prewarm ... DISABLED - WARM_POOL_ENABLED is not set to a truthy value`,
  `recurring-top-up ... DISABLED - same reason`, `admin-endpoint ... DISABLED`, and
  `[warm] no unattended question generation is scheduled`.
  ** THE STARTUP PRE-WARM IS DISABLED BY THE GATE, NOT BY A MISSING DATABASE. ** That is the
  sentence the lane existed to make true, and it had never been testable before. Probed live:
  `/api/health` 200; `POST /api/admin/warm-question-pool` 503 in 5ms WITHOUT touching Gemini.
  The lane's own caveat - every assertion had run against a fake Postgres, and nothing proved
  Railway passed the variable through - IS NOW DISCHARGED. It does.
  ** `WARM_POOL_ENABLED` was deliberately NOT SET. Absent already means off; adding a variable to
  achieve a state you already have is a change for no reason. RECORD IT AS UNSET. **

- ** !! NO `drizzle-kit push` ** until [FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT] is resolved.
- **SERVER-2 IS DECIDABLE, NOT DISPATCHED.** Marks ARE available at the grade-single call site, so
  the thinking budget CAN be banded - ONE BAND PER MARK VALUE, never the coarse "23" bucket that
  fuses 2- and 3-mark questions. Nothing capped until #620 is live and has collected samples.
- **The Rs 586.96 stays unattributable FOREVER.** #620 makes the NEXT spike attributable only.
- **#578's SEAM IS STILL NOT PROVEN.** WIRE-2 proved the client BUILDS and SENDS the uploads array
  and issues exactly one call, but `isStubMode()` returns before `buildUploadParts`, so CORRECT
  PER-QUESTION PAIRING FROM A REAL MODEL REMAINS UNPROVEN. Only the owner's live-verify closes it:
  one session, photos on 2+ questions (one an MCQ), one left empty, at 390px, from the tutor
  overlay. NOTHING MERGES ON TOP OF #621 BEFORE HE RUNS IT.
- **STILL OWED BY THE OWNER:** the server lane spec · ME-PROGRESS's two amendments · MASTER_TRACKER.md

## NEW STANDING RULES EARNED THIS WAVE
** NEVER COMMIT WHILE A MUTATION HARNESS IS RUNNING. ** WIRE-2's commit `16dd9506` captured mutation
M3 (one call PER QUESTION) because the commit RACED a background mutation harness. The restore was
byte-perfect; the COMMIT was the bad snapshot. The only signal is a "modified" file that reads like
noise. Caught, fixed FORWARD in `0800304c` (no force-push), and M1/M2/M4/M5 proven not to have
leaked BY GREPPING THE COMMITTED BLOBS. This repo SQUASH-merges so the bad intermediate cannot reach
trunk - on a merge-commit repo it would have.

** A LOGGER'S SEVERITY IS ABOUT THE STATUS CODE, NOT ABOUT WHETHER ANYTHING WENT WRONG. **
Recorded by the owner from #619's live-verify - and it was the THIRD instance in a single day:
  1. `[warm] Recurring pool top-up disabled` ... while 312 combinations STARTED (5 Aug).
  2. `[warm] Skipping pool pre-warm` ... meaning the OLD code was deployed, not that a gate held.
  3. `pino-http` logged the DELIBERATE 503 refusal as "request errored" WITH A STACK TRACE - of
     pino's own frames, not the application's. The guard HELD; the log said "errored".
** READ THE FIELDS, NOT THE WORD. ** A log line that announces one thing while another is true is
how this project has repeatedly paid money and lost time. This is the same failure mode as
[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT] ("it would look like success") and as the mutation-harness race
above ("reads like noise"): ** the signal is present, and it reads as its own opposite. **

## AFTER THIS WAVE - record, do not dispatch
- **ME-PROGRESS is WAVE 5G's FIRST lane.** It could NOT run this wave because it edits App.tsx's
  `/me` route while WIRE-2 held section 9b - and **3A does NOT free it**, because the graded-sheet
  route lane will need the same file. TWO AMENDMENTS OWED BY THE OWNER BEFORE IT DISPATCHES:
  (1) its section 5 gate-CTA paragraph is STALE - GATE-3 shipped the locked Premium treatment, so
  `/me`'s premium CTAs must MATCH it, not the July prototype; (2) it must EXPECT `lane_overlap`'s
  GATED_FILES owner-review warning.
- **SERVER-2** - scoped from #620's OUTPUT, never from a document.
- **DPDP** (launch blocker - erasure + export, plus the 9 clear-text-storage CodeQL alerts).
- **SEO-1** (per-route metadata).
- **[FU-SCORECARD-DESKTOP-SCROLL-CEILING]** - live on trunk TODAY.
- **The graded-sheet route lane** - carries [FU-QP-GRADED-SHEET-NOT-A-ROUTE] and the still-granted
  section 9b App.tsx authorization.
- **AUTH-1** (email/Google link direction - a phone-first student gets a SECOND account, and split
  accounts are unrecoverable). Note #616 merged and phone-first students are STILL NAMELESS.
- **FORBID-7 + BATCH-2 history.**

## REPORTS ON DISK
Report dir: Desktop\diff\wave 5f\report\
  - report-WARMGATE1-2026-08-06.md                        (WARM-GATE-1, PASS, #619)
  - report-TELEMETRY1-attribute-ai-spend-2026-08-06.md    (TELEMETRY-1, PASS, #620)
  - report-WIRE2-2026-08-06.md                            (WIRE-2, PASS-WITH-FOLLOW-UP, #621)
  - scout-FOUR-FACTS-2026-08-06.md                        (scout, FOUR FACTS SETTLED, no gaps)
  - report-TYPED1-typed-working-channel-2026-08-06.md     (TYPED-1, PASS, #625)
Briefs + authorities: Desktop\diff\wave 5f\
