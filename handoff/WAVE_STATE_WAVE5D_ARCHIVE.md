# WAVE 5D STATE - CLOSED 2026-08-05. Trunk `51f7712`. Four lanes + one scout, all four merged.

> **This file, not the controller's context, is the source of truth.** A replacement controller takes
> over by reading this file and nothing else. Rewritten WHOLE after every subagent returns.
> UNTRACKED by design. Archived per Rule 0 as `handoff/WAVE_STATE_WAVE5D_ARCHIVE.md` at wave close.
> CONTROLLER NOTE: rewrite this file WHOLE. Regex surgery on it duplicated it once already.

TRUNK AT CLOSE: 51f7712ab0b221e2efdfe2ce05cf14115aceec14 (was a895dbdb for the whole build phase).
OPEN PRs - ALL DRAFT, ALL AWAITING OWNER REVIEW + MERGE:
  #606 test(ops): lift the quickPracticeSessionService ban... (FORBID-5)   CI 30981712776 SUCCESS
  #607 test(api-server): pin the /api proxy's privileged-header strip (SERVER-1)  CI 30983309904 PASS
  #608 feat(legal): reach the policies from the public surfaces... (COPY-1)  CI 30983676738 success

BRIEFS + LEDGER: `C:\Users\Chetan\OneDrive\Desktop\diff\Wave 5D\`  (incl. the FU ledger, and
  `SUBAGENT_WELCOME1_landing_legal_footer.md` which I wrote from COPY-1's audit + owner authorization)
REPORTS (3 present): `C:\Users\Chetan\OneDrive\Desktop\diff\Wave 5D\report\`
  report-FORBID5 (22358) | report-SERVER1 (20724) | report-COPY1 (10259, SALVAGED BY ME from PR #608
  - the harness REFUSED the subagent's own .md write, though two other lanes wrote theirs fine. Cause
  unknown. Future briefs: put the durable record on the PR, controller salvages with
  `gh pr view --json body -q .body`.)

## LANES
| id | verdict | PR | note |
|----|---------|----|------|
| FORBID-5 | **PARTIAL** | #606 DRAFT | QP-service ban lifted + replaced. ResultsScorecard NOT attempted |
| SERVER-1 | **PASS** | #607 DRAFT | ** sec3 ONLY. TEST-ONLY PR. ** sec1 + sec2 both unshipped BY THIS PR |
| COPY-1 | **PASS** | #608 DRAFT | sec2 complete; sec1 done for 2 of 3 uncovered surfaces |
| WELCOME-1 | **PASS** | **#609 DRAFT** | ** STACKED ON #608 ** - 2 files, +172/-0. CI 30990616328 SUCCESS. Lane-Overlap red is STRUCTURAL to stacking |
| SCOUT (responseSchema) | **RETURNED - SHIPPED** | none - wrote NOTHING | sec1 was already on trunk (#559/PR-C2). SERVER-1 vindicated |
| BATCH-1b | SPEC OWED - NOW WRITEABLE | - | dispatch when #606 MERGES+CLOSES. DO NOT IMPROVISE |
| AUTH-1 | SPEC OWED | - | LAST and ALONE - requires ZERO other open PRs |

## ** CONTRADICTION RESOLVED 2026-08-05 - responseSchema IS SHIPPED. SERVER-1 WAS RIGHT. **
The owner stated that `responseSchema` (SERVER-1 sec1) remained UNSHIPPED and needed its own Wave 5E
lane. SERVER-1 reported it was already on trunk from #559/PR-C2. ** A read-only SCOUT settled it on
trunk with the chain quoted at EVERY hop, and a control run first. VERDICT: SHIPPED. **
- Constants, all `deepFreeze`d + exported in `server/routes/checkSolution.cjs`:
  `:167 GRADE_RESPONSE_SCHEMA` | `:212 DETECT_RESPONSE_SCHEMA` | `:266 WORKSHEET_RESPONSE_SCHEMA`.
  `:114 mistakeType: { type: 'STRING', nullable: true }` - nullable, NO enum, exactly as claimed.
- ** DEFINED *AND* WIRED ** - `:595` into `gradingGenConfig` -> `:599 callGemini`; `:888` inline ->
  `:873 callGemini`; `:1385` into `genConfig` -> `:1388 callGemini`. And past the config onto the wire:
  `services/geminiClient.cjs:392 body.generationConfig.responseSchema = config.responseSchema`.
- ** COMPLETE CALL-SITE ENUMERATION: ** `callGemini` appears 4x in the file - 1 destructured dep + 3
  call sites (handleCheckSolution / handleDetectQuestion / gradeStructuredSet, the last being the ONLY
  model call `handleGradeWorksheet` and the BATCH-1 path make). ** Every one carries a schema; there
  is no fourth unschema'd config. **
- 18 contract tests, `checkSolution.test.cjs` sec6.0-6.17. sec6.14 asserts it is SENT; sec6.16 asserts
  the RETRY carries it; `geminiClient.test.cjs` sec11 asserts it reaches the OUTGOING REQUEST BODY.
- Landed in `69a39e29 feat(server): constrain grader output with responseSchema (PR-C2) (#559)`.
  Only `c5570592` (BATCH-1 / #578) touched the file after.
- CONTROL: the same unanchored grep found the agreed-present `responseMimeType` at :588/:883/:1384,
  ruling out a CRLF/line-anchor miss before any absence claim was made.
** OWNER CONFIRMED 2026-08-05, having independently verified on trunk: "ITEM 5 WAS WRONG AND THE
SCOUT WAS RIGHT." ** => sec1 lane DELETED. sec3 shipped in #607. ** sec2 (the thinking budget) is the
ONLY remaining cost lever in SERVER-1's brief. **

### ** THE HANDOFF OWES AN EXPLICIT CORRECTION - NOT A SILENT DROP **
** RETIRE the "MI is built on noise" framing, in writing. ** Grading output has been CONSTRAINED
since #559/PR-C2. The owner: *"record that correction explicitly, since the wrong version reached
three of my documents."* He did not enumerate which three. ** VERIFIED BY ME: one is
`SUBAGENT_SERVER1_grader_and_header.md` sec0, which states "MI is currently built on noise" and sec1
"the grader sets `responseMimeType` and **nothing else**". ** The other two are NOT identified - do
NOT guess them; ask, or grep the brief set at handoff time. ** A retraction must travel as far as the
claim did. **

### ** NEW FU RAISED BY THE SCOUT - the one live risk it could not close **
`[FU-GRADER-SCHEMA-STRIP-RETRY-SILENT]` ** - NAME RATIFIED BY THE OWNER. ** -
`geminiClient`'s retry ladder gates `responseSchema` and `responseMimeType` TOGETHER on
`includeStructuredOutput`, so ** if the live backend ever rejects the schema, the retry SILENTLY
STRIPS BOTH and grading degrades to pre-PR-C2 unconstrained output with NO alarm. ** Shipping is
proven; whether the strip is FIRING IN PRODUCTION is a telemetry question and is NOT answerable from
a worktree. ** Same shape as SERVER-1 sec2 - both need the live admin telemetry endpoint. **
** OWNER ADDITION TO THE BODY: the strip is SILENT. A COUNTER OR WARNING ON THE DEGRADED PATH WOULD
MAKE IT OBSERVABLE - the same shape as GATE-1's fail-open witness, which exists precisely because
** A CORRECT FALLBACK THAT CANNOT BE SEEN FIRING IS INDISTINGUISHABLE FROM NO PROTECTION. ** 
## ** THE THREE DOCUMENTS FOUND - AND TRUNK CONTRADICTS ITSELF **
I grepped for the wrong version rather than ask. ** All three are in `handoff/` ON TRUNK, and the
handoff contradicts its OWN record. **
SHIPPED side: `CURRENT_STATE.md:973` + `:1099` and `IMPLEMENTATION_ROADMAP.md:76` all record
  ** #559/C2 as SHIPPED and OWNER LIVE-VERIFIED ** (incl. "6 mutations RED", "tutor.cjs deliberately
  left unconstrained", "mistakeType nullable with no enum").
STILL-OPEN side - `[FU-EFF-RESPONSE-SCHEMA]` carried as an OPEN, TOP-RANKED, UNSHIPPED lever in:
  1. `OPEN_QUESTIONS_AND_FOLLOWUPS.md:1682-1688` - "...built on noise. Highest quality-per-rupee item"
  2. `NEXT_ACTION.md:537` - same pitch + ** "Touches FORBIDDEN `checkSolution.cjs`" **
  3. `LazyTopper_Cost_Pricing_Analysis_v1_1.md:210` - "...so MI stops being built on noise."
** THAT IS THE MECHANISM OF THE OWNER''S ERROR: he read the OPEN FU, not the SHIPPED record. **
=> ** THE HANDOFF MUST CLOSE `[FU-EFF-RESPONSE-SCHEMA]` in OPEN_QUESTIONS, STRIKE IT FROM
NEXT_ACTION sec537, AND CORRECT THE COST-ANALYSIS LINE. ** Strike rather than delete, per this repo''s
own precedent at `Cost_Pricing_Analysis:105-110`, so anyone who cited it can see the change.
⚠ `NEXT_ACTION.md:537`''s ** "Touches FORBIDDEN `checkSolution.cjs`" is ALSO STALE ** - FORBID-5 proved
that ban was lifted in Wave 3 PR-C1. Two stale premises in one entry.
★ DOCTRINE: ** A CLOSED LANE THAT IS STILL PITCHED AS OPEN WILL BE RE-SCOPED. ** A shipped record and
an open FU for the SAME work, in one handoff, is a re-work generator - it cost a spec error and a
scout this wave. ** Closing an FU is part of shipping it, not bookkeeping afterwards. **

## ** TRUNK OVERRIDES THE BRIEF ON THE sec2 MEASUREMENT - RAISED, NOT RECONCILED **
`NEXT_ACTION.md:441` already rules on the thinking budget, ** more precisely than SERVER-1''s brief **:
- ** "p90 PER MARKS-BAND" ** - NOT the p50/p90/p99 the brief (and I) asked for. ** TRUNK WINS. **
- "DO NOT set a budget from the current sample - n=2 calls from one session is one paper, one student,
  one difficulty band. A week of real data, then p90 per marks-band."
- ★★ ** "Counters are PER-PROCESS AND RESET ON REDEPLOY, so a 'week' only accrues if nothing ships -
  capture a reading before each merge." **
=> ** THE MEASUREMENT PLAN COLLIDES WITH THIS WAVE''S MERGE SCHEDULE. ** Setting `ADMIN_FIREBASE_UIDS`
in Railway IS ITSELF A REDEPLOY and zeroes the counters; then #606/#607/#608/WELCOME-1 each zero them
again on merge. ** Set the env var now so it is in place, but the accrual window cannot start until
the wave stops shipping. ** Budget a week AFTER the last merge, and capture a reading before each one.
## ** OWNER RULINGS - 2026-08-05, SECOND BATCH **
1. ** `Welcome.tsx` AUTHORIZED, NARROWLY. ** CLAUDE.md:67's "unless explicitly scoped" - this is that.
   **Scope: the legal footer import ONLY. Nothing else in the file moves.** It is the signed-out front
   door and the DPDP exposure COPY-1 existed to close. => WELCOME-1 dispatched.
2. ** CLAUDE.md's "190" is NOT STALE - and I was wrong to relay that it was. ** The line reads
   "190 checks AS OF 2026-07-28 - the count GROWS; read it from the run." **Reading 196 is that
   instruction WORKING.** ** THIRD lane this session to flag that file and the THIRD to be wrong. **
   ** DO NOT EDIT CLAUDE.md. RECORD THE PATTERN INSTEAD. ** => a doctrine entry for the handoff:
   *a self-dating instruction is not a stale fact, and flagging it as one is itself the drift.*
   ⚠ CONTROLLER ERROR: I amplified COPY-1's framing ("196, not CLAUDE.md's 190") without checking it
   against what section 6 actually says. A controller amplifies; the retraction must travel as far.
3. ** #607's `artifacts/api-server/package.json` test-script line: RATIFIED. **
4. ** LANE COUNT RESOLVED: four PARALLEL lanes plus AUTH-1 alone. AUTH-1 was never a parallel slot. **
   Rule 1 is satisfied as briefed. (WELCOME-1 is a post-hoc narrow addition, owner-directed.)
5. ** ADD COPY-1's finding as a DOCTRINE entry: A GREP CONTROL IS NOT SUFFICIENT FOR A
   COMPOSITION-REACHABLE FEATURE. ** `/sign-up` scored 0 because its whole body is
   `import { AuthDoor } from "./Login"` - the inherited footer is grep-invisible. Re-check by
   component composition AND a live probe. ** The fifth absence-claim variant this wave. **

## ** TWO SCOPE FACTS THE HANDOFF MUST STATE PLAINLY (owner: I understated both) **
- ** #607 IS SERVER-1 sec3 ONLY. ** `checkSolution.cjs` is byte-identical to trunk. => the thinking
  budget (sec2) is unshipped, AND sec1 is unshipped *by this PR* - whether sec1 is shipped AT ALL on
  trunk is what the SCOUT is settling. ** sec1 is NOT blocked on measurement ** (unlike sec2); it is
  the grading-consistency fix MI depends on and needs its own dispatch once the scout reports.
- ** #606 UNBLOCKS BATCH-1b ONLY. ** `ResultsScorecard.tsx` is STILL BANNED, by BOTH C&I gates =>
  ** BATCH-2 needs a FURTHER amendment in Wave 5E ** - two gate amendments in ONE PR, plus a
  from-scratch component suite (no component test exists; `scorecardVariants.test.ts` tests the
  CONFIG module, not the component).

## ** FORBIDDEN MAP at a895dbdb - REISSUED IN THE HANDOFF, MUST BE RIGHT **
Exactly THREE `const FORBIDDEN = [` arrays repo-wide, all under `lazytopper/scripts/ops/`. Construct
in all three: array + FORBIDDEN(path) resolvability loop + UNCONDITIONAL FORBIDDEN(wired) membership
loop + `git diff --name-only <base>...HEAD` + includes().
  CONV   (6): mistakeIntelligence.ts | practiceInsights.ts | checkImproveGradeService.ts |
              MistakeIntelCard.tsx | l2/MistakeIntelligencePanel.tsx | ResultsScorecard.tsx
  OVL    (3): ResultsScorecard.tsx | sessionRecords.ts | checkImproveGradeService.ts
  QP-OVL (was 5, now 4): predictionDataService.ts | practiceSetGenerator.ts |
              [quickPracticeSessionService.ts LIFTED] | tutorRoundTrip.ts | sessionRecords.ts
** FORBID-5 derived it; SERVER-1 INDEPENDENTLY RE-ENUMERATED ALL THREE AND AGREES. **
`checkSolution.cjs` is NOT banned by any gate (lifted Wave 3 PR-C1), proven with a control.
INVERSE assertion added: `ok FORBIDDEN(lifted): quickPracticeSessionService.ts is NOT in the guarded set`

## ** DOCTRINE EARNED THIS WAVE - TEN ITEMS, ALL BELONG IN CURRENT_STATE.md (7 here + 8,9,10 below) **
1. ** A MUTATION MUST BE VERIFIED *APPLIED* BEFORE ITS RED/GREEN IS EVIDENCE. ** SERVER-1's first run
   reported ALL-GREEN with the mutation "applied": the file is CRLF and its perl pattern ended `\n`,
   so it **silently matched nothing**. Verifying only the RESTORE cannot catch this, and the failure
   mode ** ACCUSES A GOOD TEST OF BEING FAKE ** - you delete real coverage on its strength.
   Protocol: snapshot SHA -> mutate -> **assert mutated-sha != baseline** -> run -> restore -> assert
   sha == baseline. Relayed to COPY-1 in flight; it used it and reported SHAs for all three mutations.
2. ** A SELF-COMPARISON IS NOT AN IDENTITY CHECK. ** FORBID-5's idempotence test compared two run ids
   to each other and stayed green under clock contamination (same millisecond). Assert against the
   real generator, not another invocation of the thing under test.
3. ** A GREP CONTROL IS NOT SUFFICIENT FOR A COMPOSITION-REACHABLE FEATURE. ** (owner-directed, above)
4. ** THE PATH-BASED PROCESS SWEEP HAS A SECOND BLIND SPOT. ** COPY-1's sweep missed the vite dev
   server because its command line is RELATIVE - same class as the renamed-esbuild trap. Found and
   killed BY PORT. => `[FU-SUBAGENT-ORPHAN-NODE-PROCESSES]` needs a by-port step, not only by-path.
5. ** A SELF-DATING INSTRUCTION IS NOT A STALE FACT. ** CLAUDE.md section 6's "190 checks as of
   2026-07-28 - the count GROWS; read it from the run" is WORKING when a lane reads 196. Three lanes
   this session flagged that file; all three were wrong. Flagging it as stale IS the drift.
6. ** A MUTATION CAN CONVICT A WEAK TEST, NOT ONLY A MISSING ONE. ** COPY-1's M3 forced a rewrite:
   assertion 3 originally iterated a HARDCODED list and would have stayed green; it now harvests
   hrefs from the rendered component.

7. ** A SPEC IS WHERE AN ERROR COSTS MOST. ** Owner-authored, from his own error this wave:
   he read `responseMimeType` present WITHOUT a schema and inferred "not shipped" - ** one line read,
   twelve unread. ** The scout ran its CONTROL BEFORE claiming and ENUMERATED ALL FOUR `callGemini`
   sites rather than stopping at the first. ** A wrong spec makes a lane either build duplicate work
   or spend a round trip disproving its own author. ** (This wave: 4 spec errors in FORBID-5's brief,
   2 headline + 5 more in SERVER-1's, 7 in COPY-1's. The system caught every one - that is the
   property to preserve, not a reason to write briefs more confidently.)

## COPY-1 SUBSTANCE (report is the authority)
- LEGAL AUDIT before changing anything. ALREADY reachable: DesktopShell avatar row, MobileAccountMenu
  row, `/login`, `/sign-up` (via AuthDoor), `/legal/:slug`, `/browse`. NOT reachable: `/welcome`
  mobile, `/pricing`, and `/` + `/welcome` DESKTOP. Cause: `isPublicLandingRoute` suppresses the
  global navbar and none of those pages imports shared chrome. FIXED: MobileWelcome + PricingPage.
  ** DESKTOP `Welcome.tsx` REMAINED OPEN -> that is WELCOME-1. **
- ** Slugs `privacy`/`terms`/`refund` ALL render substantive content. NO empty slug exists, so NO
  policy text was written. The fabrication line never bound. **
- Both pre-existing footers are *signed-in avatar dropdowns* - could not be extended to a signed-out
  page. New `PublicLegalFooter` created. `Login.legalLinks.test.tsx` unmodified, used as a CONTROL.
- ** EVIDENCE FIGURE: the brief's three sites were ALL WRONG. ** Welcome's "last 5" was already fixed
  and pinned; there is **no "3-5" anywhere in `src/config/`**. Real drifts: HighlyProbableQuestions
  "**4** years", Intent "**9** years". Constant CREATED at `src/config/evidenceBase.ts`; dependency-
  free and mocked nowhere, so `vi.mock`-safe.
- `pages/app/Intent.tsx` is route-registered but ** UNREACHABLE ** (control: `/pricing` -> 1 inbound
  nav, `/intent` -> 0). A dead-surface decision for 5E, not a copy fix.

## ** WELCOME-1 (PASS, #609) - AND MY OWN BRIEF WAS THE DEFECT **
★★ ** MY INSTRUCTION "mount it exactly as COPY-1 did" WOULD HAVE SHIPPED A SILENT NO-OP. ** At
>=1180px this landing is `height:100vh` / `overflow:hidden` with `.lt-landing-stage display:contents`.
Mounted as last child of `<main>` - i.e. OUTSIDE the stage - the footer is ** CLIPPED, with no
scrollbar: present in the DOM, GREEN on every presence test, and INVISIBLE TO EVERY STUDENT. ** It
must sit INSIDE the stage to fill the unused 5th grid row. ** This is MOUNT != LIVE, and I authored
it. ** The lane found it, fixed it, and pinned it with its own test (M3, which reddens ONLY the
placement test and leaves the other 9 green).
★ ** MY SPECIFIED WIDTHS WOULD HAVE MISSED IT. ** I asked for 1024 and 390; the frozen grid starts at
** 1180 **. The lane added 1280/1440 on its own initiative. ** A capture width is a hypothesis about
where breakage lives, and mine was wrong. **
★ ** `Welcome.tsx` NEVER RENDERS BELOW 1024px. ** `RootEntry` redirects sub-1024 `/` to `/welcome`,
which renders `MobileWelcome`. So my 390px requirement was capturing COPY-1's page, not this lane's.
★ LIVE PROBE (not a presence assertion): `footer[aria-label="Legal"]` = 1 on `/` AND `/welcome`,
signed OUT, at 390/1024/1280/1440, with an `elementFromPoint` hit-test proving it is TOPMOST and
genuinely clickable. ** Auto-sign-in defeated by masking `navigator.webdriver` ** - before that, `/`
rendered the signed-IN cockpit, i.e. the wrong page entirely.
★ M1-M3 all proven APPLIED (`mutated-sha != baseline`, quoted both ways) and all restored EXACT.
★ ⚠ ** #609's Lane-Overlap CI check is RED and that is CORRECT. ** It "shares 9 path(s)", ALL of them
COPY-1's, because #609 is stacked on #608. ** Neither of WELCOME-1's two files is in the overlap
list. ** The lane PREDICTED this before pushing, then confirmed it. ** Do not read it as a defect;
it resolves when #608 merges. **

## ** #609 CSS - RULED 2026-08-05: KEEP IT. **
** OWNER: "The authorization was 'the import only'; the PURPOSE was reachability. A link at 1.42:1 on
hover and :focus-visible is not reachable - it vanishes the moment a keyboard user selects it.
Shipping the mount without it delivers a footer that passes every assertion and fails the student." **
★ ** That is the same defect the lane caught in my brief, one layer down. ** Bounded and confirmed by
the owner: #609 over #608 is exactly 2 files, +172/-0, zero deletions, zero existing lines changed,
only the new footer's selectors, via the documented `className` hook.
The lane used `PublicLegalFooter`'s documented `className` hook plus ~14 lines of SCOPED CSS
(zero existing lines changed). ** Why: MEASURED, the component's default hover / `:focus-visible`
colour scores 1.42:1 on this navy - the link VISUALLY DISAPPEARS when hovered or keyboard-focused. **
Now 6.59:1 / 17.84:1.
** This exceeds "the legal footer import ONLY", so it is the owner's call: keep it, or delete the
block and the `className` arg - the mount still stands either way. **
** RULED: #608 MERGES ANYWAY. ** Owner: "4.49:1 against 4.5:1 is not worth blocking a lane that
closes a DPDP exposure on three surfaces." ★ ** BUT FIX IT IN THE COMPONENT, NOT PER HOST ** -
WELCOME-1 already MEASURED working values (`#969ea9` -> 6.59:1 rest, 17.84:1 hover). Moving those into
`PublicLegalFooter`'s DEFAULT makes ** #609's override redundant and every FUTURE host compliant. **
Small lane, Wave 5E.
⚠ THE MEASUREMENT ITSELF:  the REST-state contrast measured 4.49:1,
just under the 4.5:1 WCAG AA threshold, ** on COPY-1's component - so it affects every surface #608
ships it to (`/pricing`, mobile `/welcome`), not only this landing. ** => `[FU-LEGAL-FOOTER-REST-CONTRAST]`

## MERGE ORDER
#606 -> #607 -> #608 -> ** WELCOME-1 (stacked on #608, must merge AFTER it) ** -> BATCH-1b -> AUTH-1
Branch protection requires up-to-date branches: each merge forces the rest to rebase + re-run (~5 min).
** #606 and #607 are TEST-ONLY - no live-verify. #608 + WELCOME-1 are UI/copy - worth eyes on. **
** AUTH-1 cannot start until ALL other PRs are merged AND closed. **

## ** DOCTRINE ITEM 9 - A CONTROLLER-AUTHORED BRIEF IS NOT A SAFER BRIEF **
I wrote WELCOME-1's brief myself and it contained ** two errors of exactly the class this system
exists to catch **: a mount instruction that would have produced a MOUNT != LIVE no-op, and capture
widths that could not have found it. I warned the lane my brief had had LESS scrutiny than the
cofounder's, and that was the right warning to give. ** Every brief this wave was disproved in part -
4 findings against FORBID-5's, 7 against SERVER-1's, 7 against COPY-1's, 4 against mine. The system
is the property; the briefs are not. **

## ** DOCTRINE ITEM 10 - A WHOLE-FILE REWRITE DROPS SECTIONS SILENTLY **
I adopted whole-file rewrites of THIS state file after regex surgery duplicated it. The rewrite then
** silently dropped `## DECISIONS MADE THIS WAVE` **, and I did not notice for two passes because I
was verifying that headers appeared ONCE, not that they still ALL appeared. ** A uniqueness check is
not a completeness check. ** Diff the section LIST against the previous pass after every rewrite.
(Restored below from conversation context - which is exactly the memory the file exists to replace.)

## DECISIONS MADE THIS WAVE
- Trunk re-derived before EVERY dispatch and every decision (7x this wave). Never carried from a
  brief, from memory, or from the handoff. It never moved: `a895dbdb`.
- Handoff-describes-trunk CONFIRMED by COMMIT ENUMERATION, not by the dispatch's prediction that the
  gap would be structural.
- Wave 5B's stale live state file renamed to `WAVE_STATE_WAVE5B_LIVE.md`, not deleted.
- ** CONTRADICTION RAISED, not silently reconciled: `NEXT_ACTION.md` sec0 on trunk scopes Wave 5D as
  ME-PROGRESS + NAME+LINK + BACKNAV + owner's pick ** - a DIFFERENT lane set from the dispatch, which
  scopes FORBID-5 / SERVER-1 / COPY-1 / BATCH-1b / AUTH-1 and defers ME-PROGRESS and BACKNAV-1 to 5E.
  The dispatch is newer and explicit; NAME+LINK survives folded into AUTH-1. PROCEEDED ON THE DISPATCH.
  ** THE WAVE-CLOSE HANDOFF MUST CORRECT NEXT_ACTION so trunk stops naming a lane set that never ran. **
- SERVER-1 dispatched WITHOUT waiting for #606 to merge: FORBID-5 established WITH A CONTROL that
  `checkSolution.cjs` is not banned, which satisfies SERVER-1's own sec0 precondition AS WRITTEN
  ("...FIRST **if** it finds checkSolution.cjs banned"). It was told to RE-VERIFY independently rather
  than take my relay on trust - ** a controller amplifying a claim is how wrong claims travel. ** It
  did, and agreed.
- `[FU-SUBAGENT-ORPHAN-NODE-PROCESSES]` retro-fitted to FORBID-5 MID-FLIGHT via SendMessage; in every
  dispatch since.
- The applied-mutation protocol was relayed to COPY-1 ** IN FLIGHT ** rather than held for the
  handoff - it landed in time and COPY-1 reported SHAs for all three of its mutations.
- COPY-1's report SALVAGED by me from PR #608 to the owner's report path, because the harness refused
  its `.md` write. The owner asked for reports at that path; a PR-only record would not have met it.
- A read-only SCOUT was dispatched to settle the `responseSchema` contradiction rather than have the
  owner or me assert it. ** It wrote nothing, and that was the correct outcome. **
- I grepped for the three documents carrying the wrong `responseSchema` framing rather than spend an
  owner round trip asking which they were - and found trunk contradicting itself.
## FU ENTRIES COLLECTED THIS WAVE
FORBID-5: `[FU-BATCH2-SCORECARD-BAN-STILL-LIVE]` `[FU-IDEMPOTENCE-TESTS-NEED-AN-IDENTITY-ASSERTION]`
          `[FU-FORBIDDEN-MAP-SHOULD-BE-MACHINE-READABLE]`
SERVER-1: `[FU-SERVER1-THINKING-BUDGET-TELEMETRY]` `[FU-APISERVER-TEST-WIRING-NOT-ENUMERATED]`
          `[FU-XUSERID-PROXY-STRIP]` (CLOSED by #607)
WELCOME-1: `[FU-LEGAL-FOOTER-REST-CONTRAST]` ** (implicates #608, still unmerged) **
COPY-1:   `[FU-LEGAL-WELCOME-LANDING-FOOTER]` ** (CLOSED by #609) **
          `[FU-EVIDENCE-BASE-INTENT-SURFACE-DEAD]`
Bodies live in the three reports. ** NEVER reconstruct an FU body from its ID. **

## OWNER RULINGS - FIRST BATCH
- **PUSH POLICY - DRAFT PR + OWN CI RUN.** Never `gh pr ready`, never merge, never push to trunk,
  never delete a branch. CI in_progress at return -> `CI: IN FLIGHT, not read`. A lane may STILL
  deliberately stop on a genuine blocker. **Deliberate != by default.** *(COPY-1's Welcome.tsx stop
  and SERVER-1's no-budget refusal were both exactly this, and both were right.)*
- **DOCTRINE CORRECTION OWED IN THE HANDOFF.** The operating model contradicts ITSELF: sec1 says a
  subagent PUSHES AS DRAFT and READS THE CI LOG; sec6 says SUBAGENTS STOP BEFORE COMMIT.
  **Sec1 is correct; sec6 should read "stop before MERGE."** Cofounder-acknowledged as his own error.

## SESSION FU + DOCTRINE LEDGER - ON DISK, HANDOFF UNBLOCKED
`...\Wave 5D\LazyTopper_Session_FU_Ledger_2026-08-04.md` (11381 bytes). **It is the authority; re-read
it AT handoff time. Do not work from any summary.** Every OPEN item ->
`handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md`; every DOCTRINE item -> `handoff/CURRENT_STATE.md`.
sec1 prediction (2 FUs) | sec2 never-recorded OPEN (11) | sec3 carried (29 OPEN + 7 CLOSED) |
sec4 DOCTRINE (10). Add this wave's SIX doctrine items above to that DOCTRINE set.

## ** THE HANDOFF - RULE 0. NOT STARTED. TWO GATES. **
** OWNER: "WRITE THE HANDOFF once the four are on trunk." ** Neither gate is met yet:
  GATE 1 - ** #606/#607/#608/#609 are still OPEN DRAFTS. ** None is on trunk. Merge order
           ** #606 -> #607 -> #608 -> #609 ** (owner-set; #609 stacked on #608).
  GATE 2 - ** CLEARED 2026-08-05. THE FU LEDGER. ** Owner says it "is coming in the next message" and to not start before
           I have it. ** I ALREADY HAVE A COPY ON DISK ** -
           `...\Wave 5D\LazyTopper_Session_FU_Ledger_2026-08-04.md`, 11381 bytes, received twice
           (found on disk 2026-08-05, then attached in-message; contents matched).
           ** UNRESOLVED: is that THE ledger, or is a NEWER one coming? ASKED. Do not start on the
           copy I hold until this is answered - starting early risks missing content that exists
           nowhere else; waiting for one already sent stalls the wave. **
           ** OWNER ANSWERED: THAT COPY *IS* THE LEDGER. No newer one is coming. GATE 2 IS CLEARED.
           Fold the 11381-byte file on disk; RE-READ IT, never work from my summary of it. **

### ** PR STATE AS OF 2026-08-05 (checked, not assumed) **
  #606 DRAFT MERGEABLE **CLEAN**   | #607 DRAFT MERGEABLE **CLEAN**  | #608 DRAFT MERGEABLE **CLEAN**
  #609 DRAFT MERGEABLE **BLOCKED** <- the PREDICTED Lane-Overlap red (a required check). It shares 9
       paths with #608 because it is STACKED on it. ** Expected to clear on its own once #608 merges
       and #609 is updated - the 9 shared paths will then be ON TRUNK. If it does NOT clear after
       that, THAT is a real signal. **
  ★★ ** ALL FOUR ARE DRAFTS AND GITHUB WILL NOT MERGE A DRAFT. The owner must mark each READY
  himself. `gh pr ready` is a HARD LINE for me and for every lane - none of us may run it. **

### WHAT THE HANDOFF MUST DO (assembled as the wave ran - do not re-derive from memory)
1. ** ARCHIVE THIS FILE FIRST AND ALONE ** as `handoff/WAVE_STATE_WAVE5D_ARCHIVE.md`, its own commit,
   before anything else. ** VERIFY BY SHA, never `git diff`. ** It is the only artefact nobody else
   can reconstruct.
2. ONE handoff PR. ** Exactly one `[CURRENT]` surviving. SESSION_LOG PREPENDED, never appended. **
   ⚠ PATH COUNT: the dispatch says SEVEN paths; CLAUDE.md sec10 names SIX handoff files. The 7th is
   probably the archive - but `LazyTopper_Cost_Pricing_Analysis_v1_1.md` ALSO needs correcting (below),
   which may make it eight. ** DETERMINE AT THE TIME. DO NOT ASSUME. **
3. ** CORRECT `NEXT_ACTION.md` sec0 ** - it scopes Wave 5D as ME-PROGRESS + NAME+LINK + BACKNAV +
   owner''s pick, ** a lane set that never ran. **
4. ** CLOSE `[FU-EFF-RESPONSE-SCHEMA]` ** in `OPEN_QUESTIONS_AND_FOLLOWUPS.md:1682-1688`, ** STRIKE it
   from `NEXT_ACTION.md:537` ** (whose "Touches FORBIDDEN checkSolution.cjs" is ALSO stale), and
   ** correct `LazyTopper_Cost_Pricing_Analysis_v1_1.md:210`. ** ** STRIKE, DO NOT DELETE ** - the
   repo''s own precedent at `Cost_Pricing_Analysis:105-110`.
5. ** RETIRE THE "MI IS BUILT ON NOISE" FRAMING EXPLICITLY. ** Grading has been constrained since
   #559/PR-C2. A retraction must travel as far as the claim did.
6. ** RECORD THE p90-PER-MARKS-BAND CORRECTION WITH ITS REASONING: ** n=2 from one session is one
   paper, one student, one difficulty band. (Owner accepted this over his own p50/p90/p99 ask.)
7. ** REISSUE THE FORBIDDEN MAP ** (above) - two lanes derived it independently and agree.
8. ** TEN DOCTRINE ITEMS -> `CURRENT_STATE.md`. ** The owner named THREE as "the wave''s real output":
   a closed lane still pitched as open will be re-scoped | a uniqueness check is not a completeness
   check | a controller-authored brief is not a safer brief. ★ The last is ** the property to
   preserve, not a failing. **
9. ** FOLD THE FU LEDGER ** - OPEN items -> `OPEN_QUESTIONS_AND_FOLLOWUPS.md`, DOCTRINE ->
   `CURRENT_STATE.md`. ** Re-read the file; never work from a summary. **
10. ** SURFACE_TRACKER: ** flip cells for every surface this wave moved (`/`, `/welcome` desktop+mobile,
   `/pricing`), or state explicitly that none moved.
11. ⚠ ** `[FU-HANDOFF-LANE-NO-LOCAL-GATES]`: a handoff lane cannot run local gates in a fresh worktree
   without a `pnpm install`, so CI IS ITS ONLY CHECK. Budget a real CI round. Do not self-merge on faith. **

## BLOCKED - OWNER
1. **REVIEW + MERGE #606, #607, #608, #609.** All CI-green drafts. ** #609 is STACKED on #608 and
   MUST merge after it; its Lane-Overlap red is structural to the stacking, not a defect. **
1a. ** RULE ON #609's ~14 lines of contrast CSS ** - keep, or strip to the bare mount (see above).
2. ** ONE TRIP UNBLOCKS BOTH REMAINING GRADER QUESTIONS. ** Owner-established:
   ** both answers come from `/api/admin/token-telemetry`, which is ADMIN-GATED - and
   `ADMIN_FIREBASE_UIDS` is UNSET in Railway. Set it alongside `DATABASE_URL` and both become
   pullable at once. **
     (a) the `thoughtsTokenCount` DISTRIBUTION (p50/p90/p99, NOT a mean) for the grading call class
         -> SERVER-1 sec2, the ONLY remaining cost lever. ~87% of grading cost, still unpulled.
         `[FU-SERVER1-THINKING-BUDGET-TELEMETRY]`
     (b) whether the schema-strip retry is FIRING IN PRODUCTION
         -> `[FU-GRADER-SCHEMA-STRIP-RETRY-SILENT]`
   Neither is answerable from a worktree. Both were correctly refused rather than guessed.
3. **BATCH-1b spec - owed by the cofounder. NOW WRITEABLE.** DO NOT IMPROVISE ONE.
4. **AUTH-1 spec - owed by the cofounder.**

## WAVE 5E - RECORD ONLY, DO NOT DISPATCH
** SERVER-1 sec1 responseSchema: LANE DELETED - the scout proved it SHIPPED in #559/PR-C2. ** |
** `[FU-GRADER-SCHEMA-STRIP-RETRY-SILENT]` - is the schema-strip retry firing in production? Needs the
live admin telemetry endpoint, same as sec2. ** |
** SERVER-1 sec2 thinking budget, once the telemetry distribution exists ** |
** `PublicLegalFooter` DEFAULT CONTRAST - small lane, owner-directed: move WELCOME-1's measured
`#969ea9` (6.59:1 rest / 17.84:1 hover) into the COMPONENT default, making #609's override redundant
and every future host compliant. `[FU-LEGAL-FOOTER-REST-CONTRAST]` ** |
BATCH-2 (** needs TWO gate amendments in one PR + a from-scratch ResultsScorecard component suite **) |
ME-PROGRESS | BACKNAV-1 | DPDP (erasure + export, folding in the 9
`js/clear-text-storage-of-sensitive-data` CodeQL alerts) |
`[FU-EVIDENCE-BASE-INTENT-SURFACE-DEAD]` - Intent.tsx route-registered but unreachable.
Owner-track, parallel, blocking nothing: `DATABASE_URL` + `WARM_POOL_TOP_UP_INTERVAL_MS=0` in Railway |
`ADMIN_FIREBASE_UIDS` | Razorpay test keys | Firebase custom action-handler domain | `og-image.png`
re-export | the ~50-student QA pass.










================================================================================
## ** WAVE CLOSED - VERIFIED BY CONTENT, NOT BY PR STATE (this repo SQUASH-merges) **
```
51f7712a  WELCOME-1  the signed-out desktop front door reaches the policies   #609
62ad6925  COPY-1     reach the policies from the public surfaces + one figure #608
1851559b  SERVER-1   pin the /api proxy's privileged-header strip             #607
2cd2e13d  FORBID-5   lift the quickPracticeSessionService ban                 #606
a895dbdb  <- the base every lane branched from
```
CONTENT CHECKS ON TRUNK (not merge-base, which is meaningless under squash):
  PRESENT `src/components/ux/PublicLegalFooter.tsx` | `src/config/evidenceBase.ts` |
          `src/services/quickPracticeSessionService.persist.contract.test.ts` |
          `artifacts/api-server/src/app.proxy-headers.test.ts`
  `FORBIDDEN(lifted)` inverse assertions live in 3 gate files. `quickPracticeSessionService` now
  appears in QP-OVL only in COMMENTS and the wired-check message - NOT in a guarded array.
Zero open PRs. ** ONE SCOUT RAN AND WROTE NOTHING - the correct outcome for it. **

## ★★ THE DEADLOCK - THE WAVE'S MOST TRANSFERABLE FINDING
** #608 and #609 COULD NOT MERGE, IN EITHER ORDER. ** `lane_overlap.mjs` compares every open PR
against every other, so a ** STACKED PR AND ITS BASE EACH SEE THE OTHER as an open PR sharing the
same nine paths. Both correct individually, neither mergeable. **
RESOLVED WITHOUT `--admin`: close #609 -> ** re-run #608's Lane Overlap ** *(closing a PR does NOT
re-trigger checks on another - same lesson as #593)* -> merge #608 -> reopen #609 ->
`gh pr update-branch` -> the nine paths are on trunk, the check reports 2 files -> merge.
=> `[FU-LANE-OVERLAP-SYMMETRIC-DEADLOCK-ON-STACKED-PRS]`
=> ★★ ** THE RULE: DO NOT STACK PRs IN THIS REPO. ** WELCOME-1 stacked because it needed
`PublicLegalFooter`, which was REASONABLE - and it still cost a close-reopen cycle. ** Either wait for
the base to merge, or scope the second lane so it does not need the first's files. **
=> ** `gh pr ready` IS THE OWNER'S STEP. ** The model says lanes push drafts and never mark ready; it
never said WHO does. Four PRs sat mergeable-but-draft. ** State it in NEXT_ACTION.md. **

## ★★ THE WARM-POOL INCIDENT - RECORD FULLY; IT NEARLY COST REAL MONEY
`DATABASE_URL` was provisioned, then removed within ten minutes.
`WARM_POOL_TOP_UP_INTERVAL_MS=0` was set FIRST, deliberately, as the brake. ** IT WAS NOT SUFFICIENT. **
```
[warm] Recurring pool top-up disabled (WARM_POOL_TOP_UP_INTERVAL_MS=0).
[warm] Scheduling background question pool pre-warm (60 s delay)...
[warm] Starting pool warm run: 312 combinations
       (13 maths + 13 science chapters x 4 marks x 3 difficulties) concurrency=5
```
★★ ** THE VARIABLE DISABLES THE RECURRING TOP-UP ONLY. A SEPARATE ONE-TIME STARTUP PRE-WARM IS
UNGATED. ** The cofounder asserted the variable would prevent warm-pool activity; it prevents ONE OF
TWO PATHS.
WHAT SAVED IT: `[warm] countInPool error: relation "generated_questions" does not exist` - the schema
had never been created, so every combination erred at the COUNT step. Owner's Google AI Studio spend
showed NO spike. ** LATENT, NOT REALISED - and with a POPULATED schema the count would SUCCEED and
generation would PROCEED. **
=> `[FU-WARM-POOL-STARTUP-PREWARM-NOT-GATED]` ** BLOCKS re-provisioning `DATABASE_URL`. ** Two things
first: gate the startup pre-warm, and create the schema. Wave 5E, ahead of any second attempt.
=> ★ ** `DATABASE_URL` IS NO LONGER AN OWNER TASK. IT IS A LANE. **
=> ALSO FROM THAT LOG: `[FU-RAILWAY-TSX-MODULE-NOT-FOUND]` - `Cannot find package 'tsx' imported from
   /app/lazytopper/` on every boot. A side process dies; the main server is unaffected.

## ★★ TELEMETRY MEASURED - AND IT DOES **NOT** UNBLOCK SERVER-1 sec2
`/api/admin/token-telemetry` answered. `uptimeSeconds: 485`, `calls: 84`:
  AVERAGE LATENCY ** 17.0 s ** (`1,413,343 ms / 83`) => ** the 17.3 s in the owner HAR was the NORM,
    not an outlier. **
  THINKING SHARE ** 80.9% ** of output-rate tokens (`261,808 / 323,856`).
  CLASSIFICATION ★★ ** 83 of 84 calls are `unclassified`. Only `tutor` is tagged. **
★ ** SERVER-1 sec2 CANNOT SHIP ON THIS DATA ** and the p90-per-marks-band ask STANDS:
  1. TOTALS, NOT A DISTRIBUTION - no p50/p90/p99. ** A mean tells you nothing about the tail. **
  2. ★ Grading, detect-question and worksheet are INDISTINGUISHABLE, and most of those 83 were
     warm-pool GENERATION. ** Budgeting the grader off this sample budgets the WRONG WORKLOAD. **
=> `[FU-TELEMETRY-NO-CALL-CLASS-NO-PERCENTILES]` - ** a small INSTRUMENTATION LANE MUST PRECEDE
   SERVER-1 sec2. ** Record that dependency explicitly.

## RAZORPAY PHASE 1 - DONE, AND IT CHANGES THE PAYMENT PLAN
Owner-completed and ** PROVEN, not merely configured **: test keys generated then ROTATED after being
exercised | webhook registered at `.../api/payments/webhook`, Enabled, 2 events, secret set |
`RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` in Railway | ★ ** verified by a live
`POST /v1/orders` ** - a real test order returned (`entity: order`, `status: created`, INR 1 in paise).
** Credentials work; not an assumption. **
★★ ** PAY-1 IS NOW BLOCKED ON ONE THING ONLY: the plan-shape decision ** (one-time "till boards" vs
recurring); owner taking a day. ★ ** If one-time: NO e-mandate, NO Razorpay Subscriptions, and PAY-1
is roughly HALF the originally-scoped build ** - create-order, a webhook with signature verification
and idempotency, and a firebase-admin write to `subscriptions/{uid}`.
★ `firestore.rules:117` already restricts browser writes to `tier in {free, trial}`, ** so only a
server write can grant Premium. The entitlement record needs no redesign. **

## ★★ [FU-LEGAL-CONSOLIDATE-UNDER-ONE-ROOF] - OWNER DESIGN CALL
He judges the public-landing footer HARMFUL to a designed page and prefers legal under ONE ROOF,
reached from the avatar and the door. ** Merged for now; he verifies live, then relocates. **
★ ** THE COMPLIANCE POINT IS THE COLLECTION POINT - the sign-up door, which already links and is
pinned by a test. ** The landing and pricing footers are belt-and-braces. ** Whatever the design
becomes, the policy must stay reachable from the door BEFORE the button is pressed. **

## WAVE 5E - FOUR LANES (owner-ruled)
`BATCH-1b` *(spec coming from the cofounder; #606 unblocked it)* | telemetry instrumentation
*(gates SERVER-1 sec2)* | warm-pool startup gate + schema *(gates `DATABASE_URL`)* | `AUTH-1` ALONE |
plus the `PublicLegalFooter` component contrast fix.
OWNER TRACK, remaining and small: rotate the Vercel deploy hook | re-export `og-image.png` | the
plan-shape decision | the ~50-student QA pass.
================================================================================
