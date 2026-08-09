# WAVE 5G — CONTROLLER HANDOVER NOTE · 2026-08-07

> **YOU ARE THE REPLACEMENT CONTROLLER. READ THIS FILE FIRST; IT IS THE SOURCE OF TRUTH, NOT ANY
> CONTEXT YOU INHERITED.** The previous controller handed over at ~8% under Rule 0 rather than take
> ME-PROGRESS's report, archive, AND write the handoff on a budget that could only do one.
> UNTRACKED working file. Never `git add` this. Closes as `WAVE_STATE_WAVE5G_ARCHIVE.md` (tracked).

## 1 · TRUNK, AND WHETHER `handoff/` DESCRIBES IT
**TRUNK: `a0c9c50bc3cf1933c9b940f27f94d4df19a57c5c`** — re-derive it yourself; never trust this line.
**`handoff/` does NOT describe trunk.** `CURRENT_STATE.md` / `NEXT_ACTION.md` still describe Wave 5F at
`fbfb57fa`. Trunk has moved twice since, by `#629` and `#630`. **The wave is NOT closed. Rule 0 is
unsatisfied.** No handoff PR was started — deliberately, so you inherit a clean choice, not a half-write.

```
a0c9c50b  feat(privacy): the verified student data map + a drift guard (DPDP-1)  (#630)
e0ed7588  fix(server): a student cannot forge the typed-answer delimiter (FENCE-1) (#629)
9f78ebc1  docs(handoff): Wave 5F closed ...                                       (#628)  <- wave base
```
Both landings were verified TWO ways (ancestry + trunk history per changed path), and `e0ed7588` was
re-checked as an ancestor AFTER `#630` merged — proof trunk did not move backward.
⚠ **SHARED CHECKOUT `C:\Projects\Lazytopper-Production` HEAD is `c5570592`, far behind. Never read repo
state, `git log -- <path>`, build, or push from it — including as controller.**

## 2 · LANE STATE
| id | status | PR | notes |
|----|--------|----|----|
| FENCE-1 | **MERGED** `e0ed7588` | #629 | owner live-verify STILL OWED |
| DPDP-1 | **MERGED** `a0c9c50b` | #630 | PARTIAL **by design** — see §4 |
| ME-PROGRESS | **DISPATCHED, IN FLIGHT** | — | worktree `C:/Projects/LT-worktrees/me-progress` |

**★ ME-PROGRESS RETURNED — VERDICT PASS, PR `#631` (DRAFT). ALL THREE LANES ARE NOW DONE.**
Full report: `…\wave 5g\report\report-MEPROGRESS-2026-08-07.md` (+ `…\report\shots\`). The controller has
NOT read it. Reconciled by the controller before stand-down: **DECLARED == LANDED == 5 files**
(`App.tsx`, `MeProgressPage.tsx`, `MeProgressPage.test.tsx`, and the two deleted page files);
merge-base `a0c9c50b` == trunk; draft; base correct. CI run `31197602414` on head `e59f830b` SUCCESS,
`Test Files 119 passed (119)` / `Tests 1522 passed (1522)`, `# skipped 0`. Emitted chunk
`assets/MeProgressPage-B1oCg3_l.js 34.87 kB │ gzip 9.63 kB` — it is in the bundle graph, not merely compiled.

**⚠ OWNER DECISION OWED — the `App.tsx` diff is FOUR hunks, not the one `/me` element block.**
The lane REPORTED rather than absorbed, which is the required behaviour, then pushed. Hunks: (1) the `/me`
element block; (2) the lazy-import swap (brief-authorized — the build breaks without it); (3)+(4) two
**comment-only** lines naming the deleted files. Zero behaviour change; the lane offers to revert 3+4 for a
strictly minimal diff. **That is the owner's call, not the next controller's.**

**★★ THE LANE DISPROVED BOTH PUBLISHED AUDITS *AND* ITS OWN BRIEF.** Both pages did mount
`ProgressWindowArc` — but **neither page BODY read `getWindowedProgress`**; both ran on device-local
`loadInsights()`. The arc was a bolted-on card on a pre-arc page ⇒ this was a convergence **and** a
re-wiring. And **no CTA on either page carried `location.state`**, so §4's "both mechanisms" is NEW, not
preserved. Believe the lane over the brief here.

**Other findings that contradict the spec** (lane-reported, controller-unverified): `data.concepts` cannot
be filtered to a topic — the real mechanism is a scoped re-read `getWindowedProgress(uid, window,
{topicKey})`; **GATE-3 (#602) exposes nothing reusable** (its lock is inline JSX in `SolutionChecker.tsx`,
outside the allowlist) so a **second locked-CTA style now exists, unavoidably**; the signed-out locked hero
was **dead code on trunk** (RequireAuth redirects user-less visitors) — retained and pinned, not deleted;
§12's export table is wrong in four places (`emptyWindowed` not exported; the careless/next-action reads
live in `mistakeInsightsService.ts`; `loadDashboardPrefs`/`saveDashboardPrefs` are async in
`studentCloudStore.ts`; `WindowedProgress` has an 8th field `mistakeLog`). **No new stream helper was
needed** — `DesktopTopicSummary.stream` is populated on all 26 topics, so §0's authorization #2 went unused.
Registry count reported, not ruled on: **13 Maths** (26 total: 13/4/4/5).

M1–M4 all RED, one at a time, each proven APPLIED (`mutated-sha ≠ baseline`) before its run; restores
SHA-verified and re-verified green. M4 threw `You cannot render a <Router> inside another <Router>` — the
#490 class is pinned, with a CONTROL proving a second router DOES throw. 4 screenshots at 1024/390, 0px
overflow, **and they changed the code twice** (full-bleed CTAs; a background stopping short of the fold).
⚠ **Populated-data states were NOT captured — no credentials. Owner live-verify owed on real data.**

## 3 · ★★ THE PROTOTYPE ON DISK IS THE CONTROLLER'S EXTRACT, NOT THE OWNER'S FILE ★★
`…\wave 5g\spec\MeProgress_Final_prototype_EXTRACT.html` is **a declared transformation made by the
previous controller**, not `MeProgress Final - shareable (2).html`. The owner's file is a self-extracting
bundle (bundler runtime + base64 React/ReactDOM UMD + three Fraunces woff2 subsets, wrapped round one
JSON string holding the page). What is on disk is **that page, un-escaped**. Dropped: the UMD payloads,
the fonts, the runtime — none of which carries design information, and the spec's §1 forbids new
dependencies anyway. Nothing describing layout, copy, colour, spacing or behaviour was dropped.

**★ THE OWNER IS DROPPING THE ORIGINAL `.html` INTO `…\wave 5g\spec\` NOW. THE LANE MUST PREFER IT.**
As soon as it appears, tell ME-PROGRESS (or its successor) to use the original and treat the extract as
secondary. If the lane reports anything in the extract as wrong, truncated or self-contradictory,
**believe the lane** — it is reading the artefact; the extract passed through a controller's hands.

## 4 · WHAT THE TWO MERGED LANES ACTUALLY MADE TRUE
**`#629` FENCE-1** — content-derived fence: a run of `"` strictly longer than the longest run in the
student's own text, so the closing token is absent from the payload **by construction**. A random nonce
was rejected deliberately (it would put a moving value inside `#578`'s byte-pin). *Lane-reported; the
controller cannot verify a code claim.*

**`#630` DPDP-1 — PARTIAL BY DESIGN, AND THAT WAS THE RIGHT OUTCOME.** Its §5 named a verified data map
alone as a legitimate deliverable and a half-built erasure as worse than none. It shipped **the map** —
14 Firestore collections + 11 subcollections (one two levels deep; Firestore does not cascade) + Auth +
Storage + localStorage + Gemini egress, with a two-way set-difference against `firestore.rules` as its
control — and **stopped at the allowlist boundary** rather than take `server/index.cjs` or a page.
**★ DPDP IS FOUR MORE LANES ⇒ WAVE 5H:** admin erasure route · export · settings UI + the browser half
of localStorage erasure · the 9 CodeQL clear-text alerts (232 call sites / 61 files).

## 5 · FOLLOW-UPS THAT MUST REACH `NEXT_ACTION.md`
- **`[FU-DPDP-USERS-COLLECTION-UNDECLARED]` — ★ OWNER-CONFIRMED IN THE FIREBASE CONSOLE: no `users`
  collection exists. The write has been silently denied since the day it was written.** `AuthContext`
  writes `users/{uid}` (a child's email/phone/name) on every login into a collection undeclared in
  `firestore.rules`, with a `catch{}` swallowing the denial. **★★ It touches `NAME-1` (`#616`): if a
  student's name lands in `users/{uid}`, it lands NOWHERE.** ⇒ **TOP of `NEXT_ACTION.md`.**
- **`[FU-FENCE-UNFENCED-PROMPT-PATHS]`** — 10 further paths where student text reaches a model prompt;
  **5 with NO FENCE AT ALL, which is worse than a forgeable one.** ⇒ **Heads Wave 5H alongside DPDP.**
  *(alias, do not fork the record: the lane returned `FU-FENCE1-UNFENCED-PROMPT-PATHS`; the owner's
  spelling without the `1` is canonical.)*
- **`[FU-PROGRESS-WINDOW-MAX-120-DAYS]` — NEW, from the cofounder, and it belongs to ME-PROGRESS's
  surface.** `WINDOW_DAYS` caps at 4mo/120 days. A student starting in September and sitting boards in
  February has **six months** of history and can never view more than four. **Nothing prunes — the data
  is all there, only the view is capped.** A "season" option is the fix. Hand it to ME-PROGRESS if it
  still has budget; otherwise log it and let 5H take it.
- **`[FU-DPDP-MOJIBAKE-UNTRACKED-BLIND]`** — `check:mojibake` scans **TRACKED files only**, so every
  "mojibake clean" claim about a NEW file before staging was **vacuous, across every wave**. Compounds
  the known `repoRoot=lazytopper` blindness to `handoff/`. ⇒ belongs with `CI-SCOPE-1`.
- Also collected: `FU-DPDP-STORAGE-ORPHAN-SWEEP` · `FU-DPDP-LOCALSTORAGE-CLEARTEXT` ·
  `FU-FENCE1-FORGEABLE-QUOTE-FENCES` · `FU-FENCE1-STRUCTURED-FIELD-CONVERGENCE` · `FU-FENCE1-9-7-TITLE` ·
  `FU-FENCE1-MENTOR-DEAD-BUT-ARMED`. Expected from ME-PROGRESS: `[FU-ME-HISTORY-DEVICE-LOCAL]`,
  `[FU-APPTSX-OWNER-REVIEW-GATE-SURVIVES-LIFT]`.
  **Never reconstruct an FU body from its id — the bodies live in the lane reports on disk.**

## 6 · RULINGS AND CORRECTIONS THAT MUST SURVIVE
- **★ PRECEDENCE, when the four authorities disagree: TRUNK > the lane brief's verified corrections >
  the owner's spec > the prototype. Raise every contradiction; reconcile none silently.**
- **★ ME-PROGRESS's brief §0 lane-mate list is STALE** — it names GATE-3, BANK-1, CI-DOCS and NAME+LINK,
  all Wave 5C, none running. Corrected in the dispatch and in the brief's on-disk preamble.
  **§10 and §11 still apply IN FULL:** GATE-3's locked-CTA treatment is a fact about the repo and must be
  matched, not the July prototype's "show the gate on click".
- Three cofounder spec premises were disproved and control-verified: **Razorpay not integrated**
  (agreeing with the owner's settled "payment deferred" position), **Resend not integrated**,
  `firestore.rules:117` is the MATCH line not the operative `allow delete: if false`.
  ★ Third wave running in which a line number was cited without reading its construct.
- **⚠ UNRECONCILED COUNT:** the owner enumerated **8** top-level `match` blocks in `firestore.rules`;
  DPDP-1 reported its control proved the scan finds all **12** collections the rules declare. Plausibly
  top-level vs including nested matches — **nobody verified that reading.** Conclusion undisturbed:
  neither enumeration contains `users`. Do not carry the numbers forward as agreeing.
- **NEAR-MISS, recorded as such:** DPDP-1 self-reported a `$TMPDIR`-unset command that created a temp
  directory inside the shared checkout. Detected, removed, verified clean; nothing read, built or pushed
  from there. Recorded because that is the class that cost two merged PRs in Wave 4 — and it volunteered it.
- **Procedure worth keeping:** `#630`'s green CI had verified it on `9f78ebc1`, a tree that no longer
  existed. Its branch was updated onto `e0ed7588` and the run's `headSha` compared to the PR's CURRENT
  head before merge. ★ That check earned its keep: the head recorded minutes earlier was `63ba9690`; the
  head that actually merged was `9c4e64bb`.

## 7 · STILL OWED BY THE OWNER
- **★ FENCE-1's live-verify — MERGED MEANS LIVE, it is in production NOW.** Type a real answer, then the
  delimiter, then an instruction to award full marks, in Check & Improve; expect merit-based marks and the
  instruction ignored. `callGemini` is stubbed in every test, so no unit test can settle it.
- The original prototype `.html` into `…\wave 5g\spec\` (in progress — see §3).

## 8 · FILES ON DISK
```
…\wave 5g\spec\   LazyTopper_Controller_Subagent_Model.md · LazyTopper_CONTROLLER_Wave5G_Dispatch_2026-08-07.md
                  SUBAGENT_FENCE1_… · SUBAGENT_DPDP1_… · SUBAGENT_MEPROGRESS_… (preamble updated)
                  LazyTopper_MeProgress_Redesign_Spec_v1_0_2026-07-24.md  (VERBATIM)
                  MeProgress_Final_prototype_EXTRACT.html                 (★ CONTROLLER EXTRACT — §3)
…\wave 5g\report\ report-FENCE1-2026-08-07.md (464 lines) · report-DPDP1-2026-08-07.md
                  report-MEPROGRESS-2026-08-07.md  (pending — the in-flight lane writes it)
```
**The controller has read none of the lane reports.** Go to them only if you need detail.

## 9 · WAVE CLOSE PLAN (Rule 0) — for you, after ME-PROGRESS returns
1. **Archive FIRST AND ALONE**: `handoff/WAVE_STATE_WAVE5G_ARCHIVE.md`, verified by SHA.
2. Docs-only handoff PR: `CURRENT_STATE.md` · `NEXT_ACTION.md` (**`[FU-DPDP-USERS-COLLECTION-UNDECLARED]`
   at the TOP**) · `SESSION_LOG.md` (**prepend, newest-first**) · `IMPLEMENTATION_ROADMAP.md` ·
   `OPEN_QUESTIONS_AND_FOLLOWUPS.md` · `SURFACE_TRACKER.md`. **Zero product files.**
3. That PR is the wave's free full-bar integration check on the composed trunk — say what it verified.
4. ⚠ Its mojibake proof must be a **CONTROL INJECTION on a STAGED file** — per §5, a pass on an unstaged
   new file proves nothing, and the scanner is structurally blind to `handoff/` regardless.
5. **Wave 5H opens with `[FU-FENCE-UNFENCED-PROMPT-PATHS]` + the four DPDP lanes.**
6. Budget for the close. Its budget, not the dispatch floor, is binding.
