# WAVE ME-C STATE — updated 2026-08-09, after SCOUT-1 returned

TRUNK: `eeafb99b0c437998067478f603af66d32e431b58`  (re-derived via `git ls-remote`, matches brief)
OPEN PRs at 2026-08-09 dispatch: **`gh pr list --state open` → `[]` — NONE.**
  → #647, #649 and handoff #650 are all **MERGED**, not draft as earlier docs state. #650 IS trunk.
  → There is NO open handoff PR and NO open CLOSEOUT PR. Re-run the check before opening one.

CONTROLLER ARTEFACTS (my own extracts, not owner-authored sources — flagged per Addendum §5):
- `CONTROLLER_WAVE_ME_C.md` — my transcription of the attached brief + my ERRATA section. The
  attachment was the original; this file is my copy of it.
- `handoff/WAVE_STATE_ME_C_LIVE.md` — this file.
- `handoff/BRIEF_ME-2_v2.md` — the dispatched instruction file. MINE, not the owner's.
- `C:/Projects/LT-worktrees/mec-scout1-REPORT.md` — SCOUT-1's report (36,816 bytes). Owner-visible
  evidence for every correction below. **Not on trunk; untracked; outside any worktree.**

---

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| SCOUT-1 | ME-2 fact-finding | READ-ONLY, none | **COMPLETE** | — | report on disk; 12 stale claims found |
| ME-2 | The v7.1 /me page | see DISJOINTNESS | **PASS-WITH-FOLLOW-UP** | **#655 DRAFT** | awaiting owner review + merge |

### ME-2 RESULT — #655, head `8656cfb1`, NOT MERGED, NOT UN-DRAFTED
GATES: tsc app / tsc test / mojibake / scope:guard (pre-add) / build / verifier / lt matrix /
root matrix **196 checks, 29 suites, fail 0, skipped 0** / vitest **85 passed (85)**.
CI **31319847882 PASS**, zero-skip proof quoted: `Tests 1791 passed (1791)` / `Test Files 140 passed (140)`.
CHUNK: `assets/MeProgressPage-D36Ut9li.js` 57,562 bytes.
MUTATIONS: 5, one at a time, each proven applied (`mutated-sha ≠ baseline`), all restored by sha —
M1..M5 all RED. ★ **M5 leaked all SIX other builders at once** — the `addContext` hazard was real.
SCREENSHOTS: 1440 / 1023 / 390 / 360 → `C:/Projects/LT-worktrees/me-2-screenshots/` (20 files).

**CONTROLLER VERIFICATION (metadata only, run by me — not taken on trust):**
- `gh pr view --json files` **reconciles exactly** with `git diff --name-only <merge-base>..<head>`:
  5 files, identical lists. ★ This is the check the operating model says **nothing currently does**
  — the one that let `#566` author 4 files and land 13. Run here; clean.
- merge-base = `eeafb99b` = trunk. Trunk has NOT moved. No stale-base / revert-disappearance risk.
- `draft=true`, base `base/approved-thru-437`, `mergeable=MERGEABLE`.
- **`MeProgressPage.dpdpReach.test.tsx` is genuinely ABSENT from the diff** — the DPDP tests were
  passed unmodified, not rewritten to fit new markup. This is the strongest available evidence the
  compliance surface was preserved rather than reshaped.
- CI run `31319847882` is bound to `headSha=8656cfb1`, the CURRENT head — not a pre-rebase tree.
- Files are all within allowlist; `MeProgressPage.v7.test.tsx` is new and under
  `lazytopper/src/pages/`, which the allowlist explicitly permits. No forbidden file touched.

### ME-2b — OWNER RULING 1 APPLIED. #655 head `e2e8a793`. STILL DRAFT.
Owner unfroze `MISTAKE_TONE` (his freeze reason was false and he confirmed the disproof himself) and
ruled: **darken the segment tones to clear 4.5:1 with navy at normal size**, replacing the
large-text/≥18.66px/12%-floor workaround. All six rulings are recorded in
`handoff/BRIEF_ME-2_v2_ADDENDUM_OWNER_RULINGS.md`.

★★ **THE LANE DISPROVED THE RULING IT WAS GIVEN — "DARKEN" IS THE WRONG DIRECTION.**
`--me-navy` is the **TEXT** colour, so darkening a segment **LOWERS** the ratio. A segment needs
luminance ≥ 0.3238; the two failing segments sat at 0.2426 / 0.2607. **The lane built LIGHTER**,
measured the literal darken route as well (white numerals would need L ≤ 0.1833, taking
`unclassified` from 72% → 48% and abandoning the ruling's own criterion), and **reported instead of
building around it.** ⚠ **Owner must confirm the lighter direction — the shipped code does the
OPPOSITE of the literal instruction, for a measured reason.**

CONTRAST, live alpha-composited off the rendered DOM (navy on tone):
`careless 3.509 → 4.819` · `gaps 3.729 → 4.835` · `presentation 3.49 → 4.91` ·
`secured 4.672` and `unclassified 6.153` and `calculation 6.24` already passed and were NOT touched.
THRESHOLD: `0.12 flat → 0.053 PER CHARACTER` (1ch 5.3% / 2ch 10.6% / 3ch 15.9%), derived at 360px
from a measured 9.2035px digit advance in a 248px bar. ★ A flat floor could not simply be lowered —
11% flat clips a 3-digit numeral into **a different, wrong number** under `overflow:hidden`.
360px RESULT: before printed `46/18` only; after prints `46/18/9/7`, DOM-verified.

★★ **AND THE WORKAROUND IT REPLACED WAS NEVER VALID.** The 18.66px large-text premise the entire
original ruling rested on **was never true below 1024px** — `.lt-me--mobile .lt-me__seg` renders
**16px/700**, which does not qualify as large text. So at 360/390/1023 those numerals were normal
text at 3.51/3.73 **with no exemption at all**. The ruling was right for a stronger reason than the
one given. **Fourth wrong contrast figure in this arc** (`BRIEF_ME-2_v2.md` §6's white-on-conceptual
cell says 4.03; it measures 3.38 — the navy column reproduced exactly).

**CONTROLLER VERIFICATION of the amended PR (metadata only):** head `e2e8a793`, draft, base
`base/approved-thru-437`, merge-base `e9ec4e0a` (trunk WAS merged in and re-installed after #654
changed `package.json`/`pnpm-lock.yaml`). `gh pr view --json files` **reconciles identically** with
`git diff <merge-base>..<head>` — still exactly 5 files. **`dpdpReach.test.tsx` still absent from
the diff.** CI `31329859746` bound to `headSha=e2e8a793`, PASS,
`Tests 1800 passed (1800)` / `Test Files 140 passed (140)`, root matrix `196 / 0 skipped`.
Browser fixtures were injected into `progressStore.ts` / `mistakeLogService.ts` and **restored with
SHA verification** (`00842e7d…` / `1f0d7f2d…`); the commit contains exactly one file.

### ✅ ALL THREE ME-2b DECISIONS RULED — 2026-08-11
1. **LIGHTER CONFIRMED. The owner's "darken" ruling was backwards and he withdrew it himself:**
   contrast is `(L_lighter + 0.05) / (L_darker + 0.05)` and **navy is the darker surface**, so raising
   the ratio means raising the SEGMENT's luminance. He independently recomputed the lane's
   `L ≥ 0.3238` threshold and the `0.2426 / 0.2607` baselines and **they match to four decimals.**
   **Ship the lighter tones. Do NOT go white.**
2. **Per-character threshold APPROVED** — *"a flat floor clipping a three-digit numeral into a
   different number under `overflow:hidden` is a correctness bug, not a cosmetic one."*
3. `[FU-ME-LEGEND-SWATCH-NONTEXT-CONTRAST]` — **ACCEPTABLE, NO FIX.** The swatches are `aria-hidden`
   and the adjacent label carries the meaning, so **WCAG 1.4.11's 3:1 does not bind.** Owner: add a
   `1px --line` border *"if it's free"*.
   ⚠ **CONTROLLER NOTE: it is no longer free.** #655's base is already updated and CI is running on
   the merged head; another push costs a full CI cycle and delays the merge. **Deferred to the
   follow-up, not shipped in #655.** Flagged so the owner can overrule if he wants it in this PR.

### ★★ THE MECHANISM BEHIND ALL FOUR WRONG CONTRAST FIGURES — owner-identified, for the handoff
> *"Every contrast number I've been wrong about in this arc was **arithmetic I did rather than
> measured**."*

This is the finding, not the four corrections. Four figures were wrong across this arc — the login
page's `#071a3d` substituted for `--me-navy`; the `4.03` white-on-conceptual cell that measures
`3.38`; the "darken" direction; and the `18.66px` large-text premise that **was never true below
1024px** because mobile renders those numerals at `16px/700`. **Every one was computed, and every one
that was later measured moved.** The lane's live alpha-compositing probe off the rendered DOM
disagreed with hand-arithmetic in all four cases and was right in all four.
→ **RULE: a contrast figure is measured off the rendered DOM with alpha compositing, or it is not a
figure.** Do not publish a computed ratio. `[FU-CONTRAST-FIGURES-MUST-BE-MEASURED]`

### ⚠ SUPERSEDED — NEW OWNER DECISIONS OWED (from ME-2b), ALL NOW RULED ABOVE
1. **Confirm the LIGHTER direction**, or rule that numerals go white and the criterion changes.
2. **Confirm the per-character render threshold** — it is more than a bare constant swap.
3. `[FU-ME-LEGEND-SWATCH-NONTEXT-CONTRAST]` — legend swatches must match the segments, so
   swatch-vs-card drops to 2.62 / 2.61 (secured 2.70 and unclassified 2.05 already failed).
   They are `aria-hidden` and redundant with adjacent text. Accept, or authorise a hairline border?

### ⚠ THE WAVE'S OWN PREMISE, SCORED HONESTLY
ME-2 was dispatched to end THREE dormancies. It ended **two** and **created one**:
- ✅ `mistakeRetry.ts` — now consumed. Proven by a **trunk-baseline differential build**: the strings
  `"Re-do that one"` / `"Try one like it"` appear in **no chunk at `eeafb99b`** and in
  `MeProgressPage-*.js` here.
- ✅ `?concept=` — now emitted. `set("concept"` absent from trunk's navigation chunk, present in
  this one; live browser emitted `?concept=Tetravalency+and+catenation+of+carbon` (exact
  `boardEssentials` name, URI-encoded — the label, not a slug).
- ❌ **`expectedMarks` is STILL DORMANT.** The wave brief's Rule 0 said "ME-2 ends two dormancies —
  `expectedMarks`, and `#647`'s dead-consumer status. Record both." **Only the second happened.**
  `[FU-EXPECTEDMARKS-STILL-DORMANT]`.
- ⚠ **NEW dormancy created:** `ProgressWindowArc` was unmounted (it renders `%` at 8 sites and `/me`
  was its ONLY mount — "marks, never percentages" and mounting it cannot both hold).
  `[FU-ME-PROGRESSWINDOWARC-DORMANT]`.

### ME-2 RUN LOG
- **Run 1 — KILLED by an API error mid-stream** ("Response stalled"), after ~180k subagent tokens
  and 27 tool uses, at the moment it announced *"Now the rebuild. Writing the new page."*
  Disk state after the crash, verified: worktree `C:/Projects/LT-worktrees/me-2` intact on
  `feat/desktop-pr-me-2-v7-progress-page`, HEAD still `eeafb99b`, **zero commits**, nothing pushed,
  **no report file written**, exactly ONE file modified — `lazytopper/src/lib/desktop/navigation.ts`
  (the `?concept=` emitter). The page rebuild had not begun.
- **Run 2 — RESUMED via SendMessage** on the same agentId, preserving its 180k of context. It was
  instructed to (1) state context remaining BEFORE anything else, (2) checkpoint a report + commit
  BEFORE building further, (3) branch: continue only above ~35%, otherwise finish the `navigation.ts`
  half properly and return BLOCKED with the page listed as not-started.
- ⚠ **LESSON (new, and it nearly cost the lane):** the standing rule says write the report to disk
  *after gates pass, before composing the return message*. **A mid-run crash lands EARLIER than
  that**, so the rule as written has a window in which everything is lost. A long lane must
  checkpoint DURING the build, not at the end of it.
- ⚠ Harness note on run 1: *"the safety classifier was unavailable when reviewing this subagent's
  work"* — its output warrants an extra verification pass at review.

### ⚠ CLOSEOUT CONTROLLER — #651 IS OPEN
`#651` (DRAFT) `docs/wave-closeout-handoff-catchup` — touches ONLY
`handoff/{CURRENT_STATE,IMPLEMENTATION_ROADMAP,NEXT_ACTION,OPEN_QUESTIONS_AND_FOLLOWUPS,SESSION_LOG,SURFACE_TRACKER}.md`
and `handoff/WAVE_STATE_WAVE_DPDP_B_ARCHIVE.md`.
→ **Exact-path disjoint from ME-2** (`lazytopper/src/**`). Dispatch was clear.
→ **It IS the open handoff PR.** Per Addendum §6, **ME-C does NOT open a second one.** My close-out
  (the HANDOFF DRAFT below) goes to #651's controller. My wave closes when my content is in ITS PR.

## DISJOINTNESS

ME-2 (the only product lane):
```
lazytopper/src/pages/MeProgressPage.tsx
lazytopper/src/lib/desktop/navigation.ts
lazytopper/src/pages/MeProgressPage.test.tsx
lazytopper/src/pages/MeProgressPage.dpdpReach.test.tsx
lazytopper/src/lib/desktop/navigation.test.ts
(+ new test files under lazytopper/src/pages/)
```
CLOSEOUT controller (parallel, per owner): `handoff/`, `.github/`, manifests, `Dockerfile`,
`server/services/accountExport.cjs`. → **Exact-path disjoint. Verified 2026-08-09.**
⚠ The one shared surface is `handoff/` — handoff PRs QUEUE, they never race.

---

## DECISIONS MADE THIS WAVE — each with its reason

- **D1 · `DesktopRouteContext` must NOT gain a `concept` field.** SCOUT-1: `addContext` is shared by
  all SEVEN builders (`buildDesktopConceptPracticePath`, `…PracticePath`, `…WorksheetPath`,
  `…ChapterTestPath`, `…TopicHubPath`, `…CheckPath`, `…MePath`). A field on the shared type would
  silently let six unrelated URLs emit `concept`. → Dedicated OPTIONAL third argument instead. The
  spec's framing ("DesktopRouteContext is {source, returnTo} only") reads as an invitation to widen
  it; that is the hazard, not the fix.
- **D2 · The allowlist is ONE navigation file**, `lazytopper/src/lib/desktop/navigation.ts`. The
  type and the builder are in the SAME file, so `?concept=` is a one-file change. My pre-scout
  fear that the type lived elsewhere was WRONG. Also: my errata said three files share the basename
  `navigation.ts`; only TWO do (`practiceNavigation.ts` has a different basename). My error.
- **D3 · `<AccountDataControls />` is PRESERVED, last section, copy verbatim.** Not an owner
  question — the ME-C brief already rules it. Additionally SCOUT-1 found it renders through a
  `document.body` portal that is **load-bearing** against the transformed `<main>`; the rebuild must
  not "tidy" the portal away or the confirm button becomes unreachable (the exact defect the DPDP
  screenshots caught last wave).
- **D4 · `handoff/BRIEF_ME-2.md` is SUPERSEDED and must NOT be handed to the lane as authority.**
  It is UNTRACKED, absent from trunk, never reviewed, never CI-exposed — and its page spec
  enumerates EIGHT sections omitting the DPDP controls entirely. A lane following it literally
  **deletes a minor's legally-required export and erasure controls and reds 9 tests.** Its ten
  genuinely-unique specifications are folded into `BRIEF_ME-2_v2.md`; the file itself is marked
  DO-NOT-FOLLOW.
- **D5 · "Do not repaint `MISTAKE_TONE`" is carried forward as a DESIGN CHOICE, with its stated
  reason WITHDRAWN.** The spec's reason — "used verbatim across the scorecard, MI card and history"
  — is FALSE: it is declared inside `MeProgressPage.tsx`, is not exported, and has exactly ONE
  consumer (the same file). The scorecard uses CSS classes; the MI panel has a separate `TYPE_TONE`
  with different values. Reason fixed, not just the outcome — a lane that verifies a false reason
  concludes the whole rule is void. → Corollary: **`MISTAKE_TONE` is page-local, so ME-2 owns it
  outright and a rebuild that forgets to carry it forward loses it silently.**
- **D6 · `components/topichub/**` and `DesktopTopicHubPage.tsx` stay OFF the allowlist — on new
  grounds.** The inherited reason (open-PR collision with #647) has EXPIRED; #647 is merged. The
  live reason is disjointness plus the fact that #647's reader is merged, tested and correct:
  ME-2 is the PRODUCER and needs no consumer edit. If the lane finds the consumer broken, its
  verified finding wins and it reports rather than edits.
- **D7 · Copy must be DE-MOJIBAKED before it enters the repo.** The locked prototype HTML is
  transport-corrupted (151× `â`-sequences; its own `<title>` reads "Me / Progress â v7.1 FINAL").
  `check:mojibake` is a gate. The lane takes COPY from the corrected text in `BRIEF_ME-2_v2.md`,
  never by transcribing the HTML.
- **D8 · `ResultsScorecard.tsx` is READ-ONLY for this lane, and its ban must NEVER be re-added.**
  FORBID-6 LIFTED the blanket ban in BOTH ops gates on 2026-08-05 and both now assert the INVERSE
  (`!FORBIDDEN.includes(...)`). Re-adding it turns CI RED. ME-2 only needs to READ it to mirror the
  grouping.
- **D9 · Inline styles:** data-driven values (segment width, segment colour) MAY use an inline
  style object; all static styling goes in the page's CSS classes. `CLAUDE.md` §7 bans inline styles
  "in new components" and a full rebuild arguably makes this new. Ruled rather than left to guess.
  → Flagged to owner as a doctrine-adjacent ruling, not blocking.
- **D11 · ⚠⚠ THE "LOCKED FINAL" PROTOTYPE ON DISK WAS THE WRONG VERSION — I rebuilt v7.1.**
  `LazyTopper_MeProgress_v7_FINAL.html` on disk is **v7**, not v7.1: zero hits for `ydata`,
  `yourData`, "Download my data", "Delete my account" or the string `v7.1`, and its `render()` called
  `deeper(d) + pickerSheet()` with no DPDP section in the pipeline at all. **v7.1 existed only as a
  chat attachment.** Had ME-2 been dispatched at the file bearing the LOCKED/FINAL name, it would
  have received the prototype WITHOUT the DPDP section and read the absence as a deletion — **the
  precise harm the wave brief spends a paragraph warning against.**
  → I built `LazyTopper_MeProgress_v7.1_FINAL.html` = byte-identical locked v7 **plus** the three
  attachment additions (`.ydata` CSS, `yourData()`, and its call in `render()`).
  Verified: `sha256[:16] = cead874ff631c316`, 39,676 bytes, all six markers present, both added
  sentences clean UTF-8. **v7 left untouched at `sha256[:16] = bdd8c818bb43fa1b`, 37,416 bytes.**
  → ⚠ **NEW STANDING LESSON — the existing rule is not sufficient.** "AN ATTACHED DOCUMENT IS NOT A
  FILE" says write attachments to disk on receipt. It does **not** say *verify that the file already
  sitting there under the same name is the same version.* **A file with the right name is not the
  right file.** I only caught this because I checked the prototype for on-disk mojibake and noticed
  the `<title>` said `v7` while the attachment said `v7.1`. Log as
  `[FU-LOCKED-ARTEFACT-VERSION-UNVERIFIED]`.
- **D12 · Git Bash on Windows mangles backslashes in command arguments.** Three separate
  `sed`/`perl` one-liners each ate a different part of a `—` sequence while reporting success;
  a `grep -c '\\u'` returned 39,970 because the pattern collapsed to a bare `u`. Fixed by moving the
  transform into a script FILE run through PowerShell. → Passed to the lane in §9 of its brief.
  **A grep is only as good as its pattern, and on this platform the shell rewrites the pattern.**
- **D10 · Line references are not carried.** Both inherited documents disagree with each other and
  with trunk. `ResultsScorecard :308/:319` is the correct pair (`:301` is a JSDoc line) but is still
  cited by heading string. `--me-navy` is `:1010` not `:1001`; "Careless mark-loss" is `:743` not
  `:739`; `savedWorksheets.ts:82` points at a COMMENT; `homeDestinations.tsx` `TutorPickerModal` is
  `:313` not `:344`. All shifted by #646.

## FU ENTRIES COLLECTED
- `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` — live server-side defect; grader deducts on a step carrying
  no `mistakeType`, feeding the `unclassified` segment. **Not ME-2's to fix** (`server/**`).
- `[FU-BRIEF-UNTRACKED-AUTHORITY]` — NEW. A lane brief written to `handoff/` but never committed has
  no provenance, no review, no CI exposure, and is invisible from every worktree — yet it was
  dispatched as authority and its omission would have deleted a legal-compliance surface.
- `[FU-TOPICHUBPATH-ZERO-TEST-COVERAGE]` — NEW. `navigation.test.ts` exists but does not reference
  `buildDesktopTopicHubPath` at all. ME-2 closes this.
- `[FU-MISTAKE-TONE-FREEZE-RATIONALE-FALSE]` — NEW. The freeze's stated cross-surface reason is
  disproved; the freeze is retained as a design choice pending owner ruling.

## BLOCKED / OWNER DECISIONS OWED
- **Non-blocking, ruled meanwhile (D5):** is `MISTAKE_TONE` still frozen now that its stated reason
  is disproved? It is page-local; retoning affects nothing outside the page.
- **Non-blocking, ruled meanwhile (D9):** inline `style={{ background: MISTAKE_TONE[...] }}` under
  `CLAUDE.md` §7 in a rebuilt page.
- Nothing is BLOCKING. ME-2 proceeds.

---

## HANDOFF DRAFT — prose, ready to paste

### [CURRENT] Wave ME-C — the lane that turns three merged-but-inert lanes on
Wave ME-C ran ONE product lane, ME-2, the rebuild of `/me` onto the locked v7.1 prototype. Three
capabilities were sitting on trunk merged, tested and completely inert — `#647`'s `?concept=` reader
with no producer, `#649`'s `mistakeRetry.ts` with no consumer, and `expectedMarks` with no UI
reference at all. All three were independently re-verified dormant by SCOUT-1 before the lane began.

A student on `/me` now sees the marks they lost, grouped in the same four words the graded scorecard
already uses, with the biggest three worth fixing first — and tapping one opens the Topic Hub on the
exact concept, or re-serves the exact question when the bank can still produce it. Two capabilities
that had been sitting on trunk merged, tested and unreachable are now actually reachable by a
student. A third, `expectedMarks`, is not — and one more, `ProgressWindowArc`, went dormant to keep
the page in marks rather than percentages.

### Lanes
| lane | PR | what it changed | what it disproved |
|---|---|---|---|
| SCOUT-1 | — (read-only) | nothing | 12 stale claims across two inherited briefs — incl. a brief whose page spec omitted the DPDP controls entirely |
| ME-2 | **#655 DRAFT** | `/me` rebuilt on v7.1; emits `?concept=`; consumes `mistakeRetry` | 6 further spec premises (below) |

### ★ What ME-2 disproved — six, on top of SCOUT-1's twelve
1. **The prototype's "wiring gap 3" is FALSE.** `marksScored`/`marksAvailable` are ALREADY on
   `RungTrend` at trunk, doc-commented as being for this exact page. **The marks hero was buildable
   all along** — the gap list said it could not exist.
2. **`ProgressWindowArc` renders `%` at 8 sites and `/me` was its ONLY mount.** "Marks, never
   percentages" and mounting it cannot both hold. Removed.
3. **"Journey — +N marks a paper" is a PERFORMANCE PROJECTION** (a percentage delta × an 80-mark
   paper the student has not sat). **NOT BUILT** — honest raw-marks movement shipped instead.
   ★ This is `CLAUDE.md` §5 "no fake data" catching a line in the owner-approved prototype.
4. **The prototype's first-run example ships the exact tag/subtext contradiction the brief warns
   about** — "Conceptual gap" against dropped state symbols, which are Presentation. The brief
   predicted this defect in the abstract; it was live in the locked artefact. Fixed.
5. **Screenshots found 3 defects every assertion passed:** the remainder row and chapter CTAs
   rendered ONE LETTER PER LINE at mobile, and a returning student could see another student's
   example sheet for a beat. ★ *Screenshots change code* — third wave running.
6. **Two `<h1>` exist on `/me` below 1024px — PRE-EXISTING**, from `MobileShell.tsx`, invisible to
   the suite because tests mount the page without the app shell.

### FU ids — new / closed / kept open
NEW from ME-2: `[FU-ME-PROGRESSWINDOWARC-DORMANT]` · `[FU-EXPECTEDMARKS-STILL-DORMANT]` ·
`[FU-ME-HISTORY-DEVICE-LOCAL]` · `[FU-ME-FULLMOCK-ENTRY-POINT]` · `[FU-ME-DUPLICATE-H1-AT-MOBILE]` ·
`[FU-ME-STREAM-FILTER-REMOVED]` · `[FU-ME-CROSS-STREAM-SPLIT-SKEW]`.
NEW from the controller: `[FU-LOCKED-ARTEFACT-VERSION-UNVERIFIED]` ·
`[FU-BRIEF-UNTRACKED-AUTHORITY]` · `[FU-TOPICHUBPATH-ZERO-TEST-COVERAGE]` (closed by ME-2) ·
`[FU-MISTAKE-TONE-FREEZE-RATIONALE-FALSE]`.
KEPT OPEN: `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` (server-side, out of ME-2's scope).

### ⚠ OWNER DECISIONS OWED — #655 should not merge until these are ruled
1. `ProgressWindowArc` is now unmounted — retire, re-home, or overrule marks-only on `/me`?
2. Accept the non-projected journey line, or rule that "+N marks a paper" is allowed?
3. `/full-mock` lost its `/me` entry point (the section is absent from the prototype AND both
   briefs) — confirm that is intended.
4. The device-local attempt-history seam now has no rendered statement anywhere.
5. (controller) Is `MISTAKE_TONE` still frozen now its stated reason is disproved? It is page-local.
6. (controller) Inline `style={{}}` for data-driven values under `CLAUDE.md` §7 in a rebuilt page.

### Decisions made, with the reason
D1–D12 above, verbatim.

### ★ CARRY FORWARD VERBATIM
- The WIRE-2 dormancy block in `CURRENT_STATE.md` — must survive every prepend AND be RESTATED in
  the new `[CURRENT]`. Its absence once cost five days.
- **`<AccountDataControls />` ships inside `MeProgressPage.tsx` and is a legal-compliance surface.**
  Any future lane rebuilding that page must preserve it, last, with its copy and its
  `document.body` portal intact. This is the second wave running in which a document handed to a
  lane omitted it.
- **A brief written to `handoff/` but never committed is not a repo artefact.** Commit it or do not
  cite it as authority.
- ★★ **A FILE WITH THE RIGHT NAME IS NOT THE RIGHT FILE.** "An attached document is not a file" tells
  you to write attachments to disk; it does not tell you to check that the file *already sitting
  there under that name* is the same version. `LazyTopper_MeProgress_v7_FINAL.html` — named LOCKED and
  FINAL — was **v7**, and v7.1 existed only as a chat attachment. The artefact created specifically to
  prevent the DPDP deletion would have caused it. **Verify the version, not the filename.**
- ★★ **A CONTRAST FIGURE IS MEASURED OFF THE RENDERED DOM WITH ALPHA COMPOSITING, OR IT IS NOT A
  FIGURE.** Four were wrong in this arc; every one was computed, and every one that was later measured
  moved. Do not publish a computed ratio.
- ★★ **A COMPONENT WITH ZERO MOUNTS AND A LIVE TEST SUITE IS THE `MentorSolveDrawer` SHAPE** — the
  thing that read as LIVE across six handoff documents. `ProgressWindowArc` is now in exactly that
  state. **A green suite on an unreachable component is the evidence that misleads the next reader.**
  Decide delete-or-keep; do not let it sit unmounted-but-tested.
- ⚠ **`expectedMarks` is STILL DORMANT.** The ME-C brief said ME-2 would end two dormancies; it ended
  `?concept=` and `mistakeRetry` and **did not reach `expectedMarks`.** Do not let the next document
  inherit the claim that it was wired.
