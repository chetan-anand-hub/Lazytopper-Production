# WAVE 5B STATE — updated 2026-08-03 (controller pass 1, DISPATCHED)

> **This file, not the controller's context, is the source of truth.** A replacement controller takes
> over by reading this file and nothing else. Rewritten after every subagent returns.
>
> All Wave 5B specs are consolidated on disk at **`C:\Projects\LT-wave5b\specs\`** (9 files:
> dispatch + operating model + FORBIDDEN MAP + 6 lane briefs).
> Owner's originals: `C:\Users\Chetan\OneDrive\Desktop\diff\final solution\wave 5 B\`.
>
> ⚠ **UNTRACKED, and that is the standing ruling** (Wave 5A D1). Never appears in a product PR.
> At wave close it is committed ONCE as **`handoff/WAVE_STATE_WAVE6_ARCHIVE.md`** — see D3.
>
> ⚠ Wave 5A's live state file was **preserved, not overwritten**, as
> `handoff/WAVE_STATE_WAVE5A_LIVE.md` (untracked; SHA-verified copy at
> `C:\Projects\LT-wave5b\WAVE_STATE_WAVE5A_LIVE.backup.md`). Wave 4's `WAVE_STATE_WAVE4_LIVE.md`
> also remains untracked and untouched.

---

## 🔚 ALL FOUR PRs MERGED 2026-08-04 — **OWNER LIVE-VERIFY IS THE ONLY REMAINING GATE**

```
TRUNK: 1adce6733572dd27330c0432cd66ff3e16e26fc4     <- re-derived after the last merge
WAVE BASE: d98ff4c8275a13156614e04257604656ed0acb63 <- did not move during the build phase
```

⚠⚠ **OWNER INSTRUCTION 2026-08-04 REVERSED THE ORDER: *"you merge them in the suggested order and
then i will live verify."*** The standing rule was *"the owner merges"* and *"owner live-verifies
BEFORE anything merges on top."* **He owns both rules and overrode them explicitly; the controller
merged.** ⚠ **The risk was stated once and is recorded here rather than silently absorbed: MERGED
MEANS LIVE with no staging tier, so all four are on production and a PG-1 boot failure would be
discovered with three merges stacked on it. LIVE-VERIFY IS STILL OWED — it was deferred, not waived.**

| order | PR | lane | squash commit | subject (checked: no leading `@`) |
|---|---|---|---|---|
| 1 | **#595** | PG-1 | `d7100a54` | `feat(server): delete the retired progress endpoints (PG-1) (#595)` |
| 2 | **#596** | SEC-1 | `31138c95` | `fix(security): the CodeQL findings on live server code (SEC-1) (#596)` |
| 3 | **#597** | META-1 | `429a7b9f` | `fix(seo): point the whole SEO surface at the owned domain, and guard it (META-1) (#597)` |
| 4 | **#598** | GATE-2 | `1adce673` | `feat(subscription): the upgrade sheet, and stop selling retired surfaces (GATE-2) (#598)` |

**Each merge forced the next to rebase and re-run** (`gh pr update-branch` → `BLOCKED` → CI → `CLEAN`),
exactly the four rounds branch protection predicted. **No branch was deleted** — never auto-approved.

### ✅ THE PREDICTION I OWED IS CONFIRMED
I retracted *"the rebase cost is unchanged"* as an inference and restated it as a prediction: **#598
would pass META-1's extended `pricing.guard.test.ts`** because GATE-2 renders from `MONTHLY_INLINE` and
adds nothing to `index.html`. **#598's REBASED head passed every required check and merged.**
⇒ **The prediction held — and it is reported from the rebased run, which is the evidence I said I
would wait for, not from the earlier run that could not have shown it.**

### ▶ CI-DOCS IS NOW RELEASED — **but deliberately NOT dispatched**
Its gate (*#595 and #596 merged AND closed*) **is met.** ⚠ **The cofounder ruled the outgoing
controller must NOT dispatch it** — *"dispatching a lane you cannot see through to a report is how a
lane gets stranded."* **A replacement controller dispatches it and writes the wave-closing handoff.**

⚠⚠ **AND IT NOW HAS A COLLISION THAT DID NOT EXIST AT DISPATCH TIME.**
```
OPEN PRs: #599  chore(deps): bump actions/checkout from 5 to 7   <- touches .github/workflows/**
```
**CI-DOCS owns `.github/workflows/quality-gate.yml`.** `lane-overlap` matches **exact file lists**, so
it collides **only if #599 touches `quality-gate.yml` itself** — **verify that before dispatching;
do not assume either way.** `NEXT_ACTION.md` already warned: *triage the Dependabot PRs before any
`package.json` or workflow lane.*
⇒ the six-file handoff lock is FREE. No pre-existing lane-overlap collision at dispatch time.
⇒ the five Dependabot PRs NEXT_ACTION.md §2 warned about (#583–#587) are **closed** — that warning
is discharged, and CI-DOCS' `lazytopper/package.json` edit is no longer blocked by them.

---

## LANES

| id | title | files (declared allowlist) | status | PR | notes |
|----|-------|---------------------------|--------|----|----|
| **GATE-2** | Client half of entitlement — the upgrade sheet | 4 files, `aiClient.ts` byte-identical to trunk | ⚠ **RETURNED PASS-WITH-DEFERRALS — DRAFT #598. NOT MERGE-READY** | **#598** | head `7821c1cb`. **CI unread, M1–M5 NOT FIRED, 0 screenshots.** ⚠⚠ **TWO items BLOCKED by FORBID-1's contract — owner decision** — see G2 |
| **GATE-2b** | Finish GATE-2's owed evidence on #598 | **ZERO commits, ZERO pushes** | ★ **RETURNED PASS** | #598 | head still `7821c1cb`. **M1/M3/M4/M5 RED, M2 honestly VOID.** 6 screenshots, no error-red. See G2b |
| **META-1b** | Apply the owner's two rulings to #597 | 4 files (subset of #597's 7) | ★ **RETURNED PASS — PUSHED** | #597 | head `519be58d`, CI `30829915411` SUCCESS, 98 files / 1165 tests. Both rulings applied, both caps pinned. See M1b |
| **META-1c** | Cofounder ruling 4a — the `llms.txt` capability line | **1 file, 1 line deleted, 0 added** | ★ **RETURNED PASS — PUSHED** | #597 | **CURRENT head `303ab2cb`**, CI `30834984984` SUCCESS. Premise verified independently. See M1c |
| **META-1** | Never-owned domain + metadata rewrite | 7 files | ★ **RETURNED PASS — PUSHED, DRAFT #597.** ⚠ **ONE OWNER COPY RULING OWED** | **#597** | head `f26fdbea`, CI `30824267781` SUCCESS, **98 files / 1162 tests, zero-skip**. Canonical now `lazytopper.com`. ⚠ **the supplied copy breaks the spec's OWN length caps** — see M1 |
| **PG-1** | Delete the retired progress endpoints | `server/routes/userProgress.cjs` (DELETE) · `server/index.cjs` (unwire) | ★ **RETURNED PASS — PUSHED, DRAFT #595.** ⚠ **OWNER LIVE-VERIFY OWED** | **#595** | head `a1d884bc`, CI `30823544229` PASS, 442/442 zero-skip. 2 files, LANDED == declared. ⚠ **§1 undercounted the unwire: FOUR sites, not two** — see P1 |
| **SEC-1** | CodeQL findings on live server code | 8 files | ★ **RETURNED PASS — PUSHED, DRAFT #596.** ⚠ **OWNER LIVE-VERIFY OWED** | **#596** | head `22549b57`, CI `30824197137` PASS 5m23s. M1–M4 all RED. ★ **It refused to claim its alerts cleared** — see E1 |
| **SCOUT-1** | Which workspace members are reachable | **NOTHING — zero files, no branch, no PR** | ★ **RETURNED COMPLETE** | N/A | All 9 members settled. `git status` clean, lockfile untouched. ⚠ **IT PROVED ITS OWN BRIEF'S §0 PREMISE WRONG** — see S1 |
| **CI-DOCS** | Fast path for docs-only PRs | `.github/workflows/quality-gate.yml` · `lazytopper/scripts/ops/ci_docs_lane_acceptance.mjs` (NEW) · `lazytopper/package.json` | **HELD** | – | v1.1. **Releases only when SEC-1 AND PG-1 are MERGED AND CLOSED** |

---

## ★★ COFOUNDER RULINGS + APPROVALS — 2026-08-03/04. **ALL FOUR PRs APPROVED FOR MERGE.**

**Reports read in full; the two demanded byte-reviews done.** Merge order stands
**#595 → #596 → #597 → #598.**

### ⛔ HIS OWN RETRACTION — and it is the model working in the other direction
He asserted *"the sheet exists and nothing opens it from a 402"* **as an inference from an absence**
(`#598` does not touch `aiClient.ts`) and withdrew it on reading the diff. **My correction stands; his
FU is not logged.** *A controller amplifies — and a retraction has to travel the distance the claim
did.*

### ★★ FORBID-3 — RULED AND APPROVED, BUT IT DOES **NOT** UNBLOCK THE LOCKED CTA
FORBID-1's contract asserts `expect(screen.getByRole("button", { name: "Check my answer" }))
.toBeInTheDocument()` **for a non-entitled student.**
> ⚠⚠ **THE GENERALISATION, worth more than the fix: a guard replacing a blanket ban should pin WHAT
> THE BAN PROTECTED, not WHAT THE FILE HAPPENED TO DO THAT DAY.** The second is easy to write, passes
> immediately, and **silently forbids the next intended change.** ★ *"FORBID-1 was excellent work and
> it still did this — which is why the rule is worth stating rather than treating as carelessness."*
> `[FU-CONTRACT-TESTS-OVERPIN-CURRENT-BEHAVIOUR]`

**FORBID-3 = replace that ONE assertion.** ⚠ **Do not weaken the `autoGrow`/`maxRows` assertions or
the payload shape.**
⚠⚠ **TWO OF GATE-2's THREE BLOCKS SURVIVE THE AMENDMENT:**
- **Block 2 stands** — `useSubscription` cannot be added under the current test setup (no global
  firebase mock; the mocked truthy `uid` fires `hydrateSubscriptionFromCloud` against real Firestore
  in jsdom). **A test-infrastructure change, not a contract amendment.**
- **Block 3 stands** — an `entitled` prop would have **no caller**; `MockViewGate`,
  `PracticeLimitGate`, `RequireAuth`, `TrialBanner` and `App.tsx` are other lanes' files.
  **That is MOUNT-NOT-LIVE** — the exact defect the owner caught with `MentorSolveDrawer`.

⇒ ★ **`GATE-3`, WAVE 5C, ONE LANE:** FORBID-3's amendment **+** the `useSubscription` test-setup change
**+** the prop **+ the parents that pass it.** **Shipping any subset produces a locked CTA nothing
renders.** ⚠ **DO NOT REOPEN `#598` FOR IT.**
⇒ ★ **GATE-2's honest half IS the correct shipping state** — but §1's *visible* layer did not get
built, **and the handoff must say so plainly.** What landed is the *explained* and *enforced* layers,
**and a blocked student now sees a sheet rather than a red box.**

### ★ THE APPROVALS, with what he verified himself
- **`#595` PG-1 — APPROVED.** He checked the thing he demanded: `createEntitlementGate` **required at
  `:172`, constructed at `:288`, applied at `:358` ahead of dispatch**, and **PG-1's diff touches zero
  entitlement lines. The paywall is intact.**
- **`#596` SEC-1 — APPROVED**, *"the strongest report of either wave."* Carry verbatim: it fixed the
  leak **at the SINK, not the source**, because the source is PG-1's `index.cjs` — *"a per-call-site
  fix is only ever as complete as the grep behind it,"* **and it is the better fix independent of the
  lane boundary**; it **mirrored** the limiter rather than importing or inventing one, **keying on the
  server-decoded `req.userId` rather than the spoofable header — strictly better than what it copied**;
  and it **refused to claim its own alerts cleared.**
  ⚠ **EXPECT `#26`–`#29` TO SURVIVE on trunk — CodeQL recognises named limiter packages and this one is
  hand-rolled. THAT IS NOT A FAILURE OF THE LANE.**
- **`#597` META-1 — APPROVED.** *"The `raw=158 / rendered=154 / cap=155` straddle is the best guard
  design I have seen here."*
- **`#598` GATE-2 — APPROVED**, with the §1 caveat recorded.

### ★★ GATE-2 CORRECTED THE SPEC TWICE, AND FIXED IT IN A BETTER PLACE
**§2a was wrong about Chapter Hub** — `/topic-hub` + 2 child routes are live; **it should never have
been on the retired list.** **And it undercounted: FIVE, not four** — `parent_dashboard` and
`predicted_questions` were missed. ★ **The lane enumerated `App.tsx`'s routes instead of trusting the
table — the instruction followed against its own author.**
⇒ ★★ **The fix location beats the spec's:** filtering inside **`getPremiumFeatureList()`** *also*
repairs **the live `UpgradeModal` the owner actually saw**, with no file outside the allowlist.
**One change, both surfaces, no scope creep — the difference between fixing an instance and fixing a
source.** **Gating provably unchanged:** `shipped` is read only by the sell list, `canAccessFeature`
never reads it, pinned by test; §5's *"do not fix `daily_mix` in a gating lane"* honoured exactly.

### ★ THREE CORRECTIONS HE ACCEPTED AGAINST HIS OWN BRIEFS
- **(a)** ⛔ **Shell writes to `Desktop\diff\` are NOT blocked** — META-1c wrote 355 lines there. The
  `Write`-tool `.md` refusal is real; the path block is not. **Keep copying until a second lane
  confirms, but STOP ASSERTING THE BLOCK IN DISPATCHES.** `[FU-SUBAGENT-DISK-WRITE-PATH-OK]`
- **(b)** ⛔ **The published FORBIDDEN MAP is STALE** — SEC-1 and GATE-2 re-derived independently and
  agree: **CONV no longer lists `SolutionChecker.tsx`**; every other row matches. **Both re-derived
  rather than trusting it, which is why it cost nothing.** ⇒ **REISSUE THE MAP AT CURRENT TRUNK IN THE
  HANDOFF, WITH THE DERIVATION SHA ON ITS FACE.**
- **(c)** ⛔ **`lane-overlap` compares FILE LISTS, not directory prefixes.** **Correct the
  `NEXT_ACTION.md` phrasing.** ⚠ **But it DOES gate — do not carry "it gates nothing" forward.**

---

## DISJOINTNESS — verified by the controller from DECLARED allowlists, 2026-08-03

**File-level: DISJOINT.** No file appears in two allowlists.

```
GATE-2   lazytopper/src/{services/featureGates.ts, components/subscription/**,
                          ai/aiClient.ts, components/question/SolutionChecker.tsx}
META-1   lazytopper/{index.html, public/**}, lazytopper/src/config/pricing.guard.test.ts
PG-1     lazytopper/server/{index.cjs, routes/userProgress.cjs}
SEC-1    artifacts/api-server/src/**, lazytopper/server/{sessionStore.cjs, services/httpUtils.cjs}
SCOUT-1  (none)
CI-DOCS  .github/workflows/, lazytopper/scripts/ops/, lazytopper/package.json   [HELD]
```

⚠ **THREE RESIDUAL RISKS THE FILE-LEVEL CHECK DOES NOT COVER — each is instructed into the dispatch:**

1. ⚠ **`lazytopper/server/` is shared at DIRECTORY level by PG-1 and SEC-1.** File-disjoint, but
   `lane-overlap` may classify at path-prefix granularity. **Both lanes are instructed to report
   their `lane-overlap` check result explicitly.** If it goes red, they sequence PG-1 → SEC-1
   (already the merge order) rather than parallelise. → see D4.
2. ⚠ **The unbounded `+ test files` clause.** Every brief carries one; PG-1's is `+ any test file
   that breaks as a result`. **Bounded in dispatch:** a lane may only touch a test file whose
   SUBJECT is inside its own allowlist. A shared `lazytopper/server/` test covering both
   `index.cjs` and `httpUtils.cjs` → **STOP AND REPORT**, do not edit.
3. ⚠ **NOT "DISCHARGED" — PREDICTED. See the RETRACTION in M1b.** META-1 **did** extend
   `pricing.guard.test.ts` (+70 lines, its §4 job). Its own characterisation — *"purely additive, zero
   existing assertions modified, `MONTHLY_INLINE` untouched, reads only `index.html`"* — supports the
   prediction that **META-1 → GATE-2 is safe, and that is a prediction to be confirmed by #598's
   REBASED run.** I earlier called this discharged on the strength of an unchanged test count; **a
   count is not a diff.**
   Residual, low-probability and self-raised: META-1's domain guard now scans
   `src/components/subscription/**` that GATE-2 creates — red only if GATE-2 writes `lazytopper.app`.

**META-1's §3 domain guard SCANS `lazytopper/src/` but EDITS nothing there** — a scan is not a
collision, and scanning GATE-2's new files after rebase is desirable, not a hazard.

---

## DECISIONS MADE THIS WAVE

- **D1 · CARRIED FORWARD FROM WAVE 5A [D2] — COMMIT + PUSH A DRAFT PR, STOP BEFORE MERGE.**
  Every brief header says *"Stop before commit, report, wait"* and dispatch §6 repeats it — **but
  every report template demands evidence that cannot exist without a push**: a PR number, a CI run
  id from the CURRENT head, a quoted zero-skip line, and `gh pr view <n> --json files` to reconcile
  the LANDED list. The owner ruled on this exact contradiction on 2026-08-03 (Wave 5A D2). **Not
  re-asked; carried.** Nobody marks ready for review. Nobody merges. The owner merges.
- **D2 · The two PG-1 filenames are ONE document.** Dispatch §3 names
  `SUBAGENT_PG1_delete_postgres_layer.md`; the received brief is
  `SUBAGENT_PG1_delete_retired_progress_endpoints.md`. **Byte-identical —
  `sha256 0340cda0011b7091167e7de607a0427bf8173fef6ccb790fa1eaf452d7c0ae48`.** No contradiction;
  the longer name is the accurate one (the brief's own banner: *"NOT the whole Postgres layer"*).
  Resolved by hashing, not by assuming.
- **D3 · The `WAVE6_ARCHIVE` name is deliberate, not an error.** Dispatch §1.4 says commit this file
  at wave close as `WAVE_STATE_WAVE6_ARCHIVE.md`. **Trunk already carries
  `handoff/WAVE_STATE_WAVE5_ARCHIVE.md`** (Wave 5A's) and `WAVE_STATE_WAVE3_ARCHIVE.md`. The `WAVE5`
  slot is taken, so Wave 5B archives as `WAVE6`. Verified by `git ls-tree` on trunk. **No owner
  question needed.**
- **D4 · `lane-overlap` is treated as BLOCKING, per trunk.** The CI-DOCS brief §7 calls it *"Lane
  Overlap (gates nothing)"*; **trunk's `NEXT_ACTION.md` says it *"fails on a shared path against
  every open PR."*** Standing rule: **where a brief contradicts trunk, TRUNK WINS until the owner
  rules.** → ✅ **FULLY CLOSED BY THREE INDEPENDENT RUNS. No owner ruling needed.**
  **The gate is REAL** (CI-DOCS' *"gates nothing"* is FALSE — it ran and reported in every case), **and
  it matches by EXACT FILE, not directory.** Source quoted by GATE-2b:
  `const shared = files.filter((f) => mineSet.has(f))` over full `.filename` strings — **no dirname,
  prefix or glob in the comparison.**
  | run | comparators | verdict |
  |---|---|---|
  | PG-1 `30823543854` | **0** — vacuous, and it said so | PASS |
  | SEC-1 `30824196932` | **1** | PASS |
  | GATE-2b `30824423554` | **3** | PASS |
  ⇒ **PG-1 and SEC-1 sharing `lazytopper/server/` was never a risk, and directory-sharing lanes may be
  parallelised in future waves.** `[FU-LANE-OVERLAP-FILE-EXACT-NOT-DIRECTORY]`
  ⚠⚠ **AND THE TRAP THAT WOULD HAVE RE-BROKEN THIS:** GATE-2b found `lane_overlap.mjs` **does** contain
  `path.startsWith(p)` — **but in `isGated()`, a non-fatal WARN, not the overlap test.** *"Grepping for
  `startsWith` here would wrongly suggest directory matching."* **A future lane that greps one symbol
  and stops will reach the opposite conclusion.**
- **D5 · Specs consolidated to `C:\Projects\LT-wave5b\specs\`** rather than re-transcribed from the
  attachments. The attachment copies carried mojibake from an encoding round-trip; **the owner's
  on-disk originals are clean**, so subagents read those. Re-typing eight documents would have
  burned the exact context this role exists to preserve.
- **D7 · ★ OWNER RULING 2026-08-03 — TRIM THE METADATA COPY, AND THE OWNER SUPPLIED IT HIMSELF.**
  META-1 flagged that §2d's supplied copy (title 61, description 175 rendered) violated §2d's own caps
  (≤60, ≤155) and **applied it verbatim rather than rewording on its own judgement — the correct call.**
  Owner: *"I wrote §2d's caps and then supplied copy at 61 and 174. My own spec's constraint
  contradicted my own spec's content, three sections apart… Don't ship verbatim. The truncated clause
  is the tutor differentiator, which §2a says is the description's entire job. And don't make a
  subagent invent replacement copy — positioning is a product decision."*
  ⇒ **Title (53):** `LazyTopper — CBSE Class 10 Prep That Finds Lost Marks`
  ⇒ **Description (154 rendered):** `Free CBSE Class 10 Maths &amp; Science prep. Every answer is
  diagnosed — conceptual, calculation or careless — and your AI tutor knows them before it teaches.`
  ⇒ **`og:*` and `twitter:*` UNCHANGED** — no Google truncation limit, different job.
  ⇒ ★ **BOTH CAPS PINNED IN THE TEST:** *"A character count in prose is a derived value with no test
  behind it — which is precisely how this happened."* **Applied by META-1b.**
- **D8 · ★ OWNER RULING 2026-08-03 — REMOVE ALL THREE DEAD SITEMAP ROUTES, AND DO NOT REPOINT.**
  `/dashboard`, `/predictive-papers`, `/trends/10/Maths` out of `sitemap.xml`; the 2 repeats out of
  `llms.txt`. **`/exam-trends` is NOT added**, though it is the live successor.
  Owner: *"§5 established this is a pure client-rendered SPA with no per-route metadata — every URL
  serves the identical title and description. So adding `/exam-trends` advertises another URL Google
  sees as a duplicate of home. That's the same defect the canonical fix just closed, relocated rather
  than removed… A shorter honest sitemap beats a longer one full of duplicates."*
  ★ **Recorded shape, worth keeping:** *"the 'repoint' option is the more helpful-looking answer and
  the wrong one, because it optimises a mechanism that isn't working yet."*
  ⇒ **The sitemap becomes worth expanding only once `[FU-SPA-NO-PER-ROUTE-METADATA]` is closed.**
- **D6 · Wave 5A's state file preserved, not overwritten** — `WAVE_STATE_WAVE5A_LIVE.md`, SHA-verified
  identical in two locations before the new file was written. Same precedent Wave 5A set for Wave 4.

---

## FU ENTRIES COLLECTED
*(ids only — bodies live in the lane briefs and the returned reports on disk)*

Carried into lane briefs at dispatch, not yet closed:
- `[FU-DBSYNC-CLIENT-CALLERS-DEAD]` — PG-1 logs it; client cleanup is a separate lane
- `[FU-SEC-DIAGRAMS-SANITISER]` — SEC-1 excludes `diagrams.cjs` (7 high findings) by design
- `[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]` · `[FU-UPGRADE-MODAL-NO-BASIC-EXIT]` ·
  `[FU-GATE-COPY-STILL-READS-AS-ERROR]` · `[FU-FEATUREGATES-DAILY-MIX-RETIRED]` — GATE-2
- `[FU-SPA-NO-PER-ROUTE-METADATA]` — META-1 reports, does not fix
- `[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]` · `[FU-DOCKERFILE-STALE-PM-COMMENT]` ·
  `[FU-CI-TWO-WORKFLOWS-PER-PR]` — CI-DOCS (HELD)

**RAISED BY THE COFOUNDER'S REVIEW / OWNED BY THE CONTROLLER:**
⛔ `[FU-CONTROLLER-TEST-COUNT-IS-NOT-A-DIFF]` — *my* error: an unchanged test count across two
POST-change runs read as an unchanged file. **A count is not a diff.**
⛔ ~~`[FU-GATE2-402-SHEET-UNWIRED]`~~ — **WITHDRAWN 2026-08-04, never carried to a handoff.** The
cofounder retracted the premise after byte-reviewing the diff: `SolutionChecker`'s catch detects
`err.name === "PremiumRequiredError"`, calls `setPremiumBlock({feature, trialEndedAt})` and renders
`<UpgradeSheet>` — **a free student pressing "Check my answer" GETS THE SHEET.** His own verdict:
*"GATE-2's design is better than the one my spec asked for — one opener, structurally incapable of
double-firing, instead of an emitter that could race the catch."*
⇒ **The residual (other paid surfaces have no sheet) was never in GATE-2's scope and is folded into
GATE-3, below. It is not a standalone defect and must not be logged as one.**
★ **New, from the cofounder's own retraction:** `[FU-CONTRACT-TESTS-OVERPIN-CURRENT-BEHAVIOUR]` ·
`[FU-SUBAGENT-DISK-WRITE-PATH-OK]`

**RETURNED BY SEC-1 (5):** ⚠ `[FU-SEC1-CI-WIRE-SERVER-TESTS]` *(its own tests are ungated in CI)* ·
`[FU-SEC1-RATE-LIMIT-WIRING-UNGUARDED]` · `[FU-SEC1-GATEWAY-ERROR-MESSAGE-LEAK]` ·
`[FU-SEC1-CODEQL-CUSTOM-LIMITER-NOT-RECOGNISED]` · `[FU-SEC-DIAGRAMS-SANITISER]`

**RETURNED BY GATE-2b (4):** ⚠ `[FU-AICLIENT-402-429-ORDER-UNPINNED]` *(the sharpest of the wave)* ·
`[FU-GATE2-ASSERTIONS-4-AND-11-UNTESTED]` · `[FU-402-INLINE-MESSAGE-ABSENCE-UNPINNED]` ·
`[FU-LANE-OVERLAP-RUN-ID-NOT-QG]`

**RETURNED BY META-1 (5) — TWO CLOSED BY META-1b:**
✅ `[FU-META-COPY-EXCEEDS-SERP-LIMITS]` **CLOSED** (D7) · ✅ `[FU-SITEMAP-THREE-DEAD-ROUTES]` **CLOSED** (D8) ·
⚠ `[FU-OG-IMAGE-PNG-REEXPORT]` **STILL OWED — OWNER, no agent can do it** ·
`[FU-SPA-NO-PER-ROUTE-METADATA]` · `[FU-FORBIDDEN-MAP-STALE-SOLUTIONCHECKER]` *(3 lanes confirmed it)*
**NEW from META-1b:** ✅ `[FU-LLMS-CAPABILITY-CLAIM-FOR-DISCONNECTED-SURFACE]` **CLOSED by META-1c**
**NEW from META-1c:** `[FU-PREDICTIVE-PAPERS-STRING-IN-TUTOR-DATA]` *(in `src/data/`, globally
forbidden — reported, not touched)*

**RETURNED BY GATE-2 (8):** `[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]` (closed by #598) ·
`[FU-UPGRADE-MODAL-NO-BASIC-EXIT]` (closed) · `[FU-GATE-COPY-STILL-READS-AS-ERROR]` (closed) ·
`[FU-FEATUREGATES-DAILY-MIX-RETIRED]` · ★ `[FU-FEATUREGATES-RETIRED-ENTRIES]` (five, not one) ·
⚠⚠ `[FU-GATE2-LOCKED-CTA-BLOCKED-BY-CONTRACT]` · ⚠ `[FU-AICLIENT-MOCK-APPEND-HOSTILE]` ·
`[FU-FREE-TIER-COUNTERS-CLIENT-RESETTABLE]`

**RETURNED BY PG-1 (4):** `[FU-DBSYNC-CLIENT-CALLERS-DEAD]` ·
`[FU-PG1-STALE-PROGRESS-PATHS-IN-RATELIMIT-TESTS]` · `[FU-APISERVER-WORKSPACE-DB-UNUSED-DEP]` ·
★ `[FU-LANE-OVERLAP-FILE-EXACT-NOT-DIRECTORY]`

**RETURNED BY SCOUT-1 (12) — bodies in its report on disk:**
`[FU-SCOUT1-APISERVER-UNUSED-DB-AND-DRIZZLE-DECLS]` · `[FU-SCOUT1-LIBDB-IS-SCHEMA-OF-RECORD]` ·
`[FU-SCOUT1-LZAPP-SHELL-DEAD-SCRIPTS]` · `[FU-SCOUT1-LZAPP-PUBLIC-ASSETS-UNSERVED]` ·
`[FU-SCOUT1-DEPLOYSMOKE-STALE-DIST-PATH]` · `[FU-SCOUT1-APISPEC-CODEGEN-UNINVOKED]` ·
⚠ `[FU-SCOUT1-VALIDATEBANKS-NOT-IN-CI]` · ⚠⚠ `[FU-SCOUT1-SHAREDDATA-BANNED-TOPIC-PACKS]` ·
⚠ `[FU-SCOUT1-ALERTS-ARE-NOT-A-WORKSPACE-PROBLEM]` · `[FU-SCOUT1-DOCKER-INSTALLS-ALL-DEVDEPS]` ·
`[FU-SCOUT1-LIBINTEGRATIONS-GLOB-DEAD]` · `[FU-SCOUT1-DEPENDABOT-COMMENT-STALE]`

---

## ★★ M1c · META-1c RETURNED — PASS. **#597 IS COMPLETE. Cofounder ruling 4a applied.**

**Full report (355 lines):** written to **BOTH** `…\wave 5 final\reports\report-META1c-llms-capability-2026-08-03.md`
and its scratchpad. #597 **still DRAFT**, head `303ab2cb`, **7 files unchanged** (`llms.txt` +4−6 → +4−7).
`scope:guard` PRE-`git add`: **`inspected=1`** — *the non-widening proof, in one number.*
mojibake `enforced_hits=0 report_only_hits=8` (all pre-existing `handoff/` specimens).
**CI `30834984984` SUCCESS**, 16 steps incl. the linux Build — `98 passed (98)` / `1165 passed (1165)`,
`# skipped 0` ×9. Lane-overlap `30834986020`, **3 comparators, PASS**.

### ★★ IT VERIFIED THE PREMISE INSTEAD OF TRUSTING THE RULING
> *"the strongest evidence turned out to be the ABSENCE of a route in the enumeration, not the
> DEFERRED-REVIVE comment. **A comment is a claim; the missing `<Route>` is the fact.**"*

`grep -n 'path="/predictive' App.tsx` → **zero matches across a full 47-route enumeration**; it falls
through `path="*"` to `HomeRedirect`. **`App.tsx` was READ, never edited.**

### ★ AND IT DID THE THING I FAILED AT — it explained why an UNCHANGED count is correct here
**`98/1165` is IDENTICAL to META-1b's**, and it said why that is the expected result rather than
banking it: *"this lane adds/deletes no test. **A changed count would have been the anomaly.**"* It
also noted `DOMAIN_GUARD_SCOPE scanned=1040` unchanged — **a line was removed, not a file.**
⇒ **The same measurement, used correctly, because the baseline was reasoned about.** Cf. the
retraction in M1b.

### ★ IT FOUND A FIFTH CAPABILITY LINE THE BRIEF DID NOT ANTICIPATE — and left it
All five checked against live routes: tutoring flow → `/tutor/:grade/:subject` **HONEST** *(premium-
GATED is not DEAD)* · Chapter-wise trends → `/exam-trends` **HONEST, KEPT** · HPQ →
`/highly-probable/:grade/:subject` **HONEST** · Predictive papers → **no route, REMOVED** ·
**"Learn→Grind→Practice→Master loop" → no route of its own, but HONEST** — it is a pedagogical framing
**the live app states itself** (`TopicHubHome.tsx:319` renders the same sentence) and its stages are
reachable. **Left alone, with the reasoning.**

★ **Reported, NOT removed:** `src/data/tutor/topics/trigonometryTutorPath.ts:193` — *"Predictive papers
are still metadata-first"*. **`src/data/` is globally forbidden, and it is tutor lesson content, not a
crawler-facing claim — a different defect class.** `[FU-PREDICTIVE-PAPERS-STRING-IN-TUTOR-DATA]`

★ **It checked BEFORE cutting whether any guard reads `llms.txt` CONTENT** — only
`domain.guard.test.ts:149` lists it in a must-reach corpus asserting the walk **reaches** the file, so
a line deletion cannot break it. **No `scripts/ops` fixture — it explicitly cleared the
`ops-gates-pin-dead-pages` trap** *(a page can be dead to users and load-bearing for CI at once)*.

★ **`pricing.guard.test.ts` confirmed still `+70−0` / 9 tests, untouched** — GATE-2's rebase target
intact, and stated as an observation of the file, not an inference from the count.

> ★ **Its own closing note, worth keeping:** *"META-1b's flag is what made this lane cheap. Because it
> recorded the thread it declined to pull WITH its reason and its evidence, this was a ten-minute
> one-line change against a verified premise instead of a re-investigation."*

⚠ **ONE COFOUNDER PREMISE DID NOT HOLD, evidenced:** §0 said *"the harness blocks SUBAGENT writes to
`Desktop\diff\`."* **META-1c wrote its report to that folder successfully, via the shell.** The
`Write`-tool refusal for `.md` is real; **a shell write to that path is not blocked** — at least not
today, on one observation. ⇒ **Future lanes may write there directly; I will keep copying as a
belt-and-braces until a second lane confirms it.**

---

## ★★ M1b · META-1b RETURNED — PASS. **BOTH OWNER RULINGS APPLIED. #597 IS COMPLETE.**

**Full report:** `…\OneDrive\Desktop\diff\report-META1b-owner-rulings-2026-08-03.md`.
#597 **still DRAFT** (`isDraft=true`, `gh pr edit` never called), new head `519be58d`, PR file count
unchanged at 7. `scope:guard` run **PRE-`git add`** → `inspected=4 untracked=0 … SCOPE_GUARD_OK`.
**CI `30829915411` SUCCESS**, all 16 steps including the linux Build — `Test Files 98 passed (98)` /
`Tests 1165 passed (1165)` (**= META-1's 1162 + its 3**), matrices printed `# skipped 0` ×9.
Guard present by name: `✓ src/config/domain.guard.test.ts (7 tests)`.
**Lane-overlap `30829915389` — 3 comparators, PASS.**

**D7 applied:** title **53** rendered, description **154** rendered — the owner's copy verbatim.
★ **`git diff` vs `f26fdbea` is exactly TWO hunks (title, description)** ⇒ `og:*`, `twitter:*` and
`keywords` provably untouched, as ruled.
**D8 applied:** `/trends/10/Maths`, `/predictive-papers`, `/dashboard` removed; **4 `<loc>` remain, each
verified against a live `Route` in `App.tsx`**; `llms.txt` 6 → 4 URLs. **`/exam-trends` NOT added** —
grep of `public/` returns none.

### ★★ THE CONTROL RUN IS ITSELF THE DECODE PROOF — and it was free
The shipped description is **raw 158 / rendered 154 against a 155 cap** — the two measurements
**straddle the cap.** ⇒ **A guard counting raw source would be RED right now. It is green.**
**Green is therefore the evidence that it decodes entities — a property no mutation could have shown.**
*(`decodeEntities()` handles hex/decimal/named and decodes `&amp;` LAST, or `&amp;lt;` → `<`
under-counts by 3.)*

**It names its subject, in CI too:**
`SERP_LENGTH_GUARD: field=description rendered=154 cap=155 raw=158 entities_decoded=yes value=…`

**Both mutations RED, and each isolated** (`1 failed | 6 passed (7)` with the other cap green):
- title → `expected 61 to be less than or equal to 60` ★ **using META-1's ACTUAL shipped 61-char
  title, so the guard is proven against the real defect, not a synthetic one.**
- description → `expected 156 to be less than or equal to 155` — **one char over, proving the cap is
  exactly 155.** Control `Tests 16 passed (16)` first; restores SHA-verified vs `100582ff…326c5e`.

### ⛔ RETRACTED 2026-08-03 — "`pricing.guard.test.ts` IS UNTOUCHED" WAS FALSE. **CONTROLLER ERROR.**
**I wrote:** *"`pricing.guard.test.ts` untouched — CI confirms it still reports 9 tests ⇒ GATE-2's
(#598) rebase cost is unchanged."* **Both halves are wrong.**

**The truth:** the cofounder's byte-review of #597 shows **`70 insertions(+)` in that file** — META-1's
§4 extension, exactly as specced and already recorded in **M1 above** (*"PRICE GUARD extension:
mutation red"*). **My own state file contained the contradiction and I did not see it.**

> ⚠⚠ **THE MECHANISM, TO CARRY FORWARD: A TEST COUNT IS NOT A DIFF, AND BOTH MY OBSERVATIONS SHARED
> THE WRONG BASELINE.** I saw `(9 tests)` in META-1's run `30824267781` **and** META-1b's run
> `30829915411`. **Both are POST-META-1 commits.** An unchanged count between two post-change
> observations says nothing about trunk — META-1 took it 7 → 9 by adding two `it`s inside an existing
> `describe`, which a count comparison across the wrong pair cannot see.
> **Same shape as `MOUNT ≠ LIVE` and `MERGED ≠ DEPLOYED`: a proxy standing in for the thing itself.**

**Provenance, stated plainly: I INFERRED — worse, I AMPLIFIED.** META-1b's return message carried the
parenthetical `(still 9 = untouched)`. **That was true of META-1b's own diff and false of the file.**
I relayed a subagent's inference as a controller fact. ***"The subagent reports X" is not "X"*** — the
one rule this role exists to keep, broken in the one direction that matters.

**⇒ RESTATED AS A PREDICTION, NOT A FACT:** #598 will rebase onto a `pricing.guard.test.ts` that now
asserts `index.html` carries no price literal. **GATE-2 renders from `MONTHLY_INLINE` and adds nothing
to `index.html`, so it SHOULD pass — but that is a prediction and it is confirmed only AFTER the
rebase, by the rebased run, not before.** `[FU-CONTROLLER-TEST-COUNT-IS-NOT-A-DIFF]`
★ **It re-measured the owner's character counts independently and confirmed them** rather than
trusting them.

### ⚠ THE ONE LOOSE THREAD IT DELIBERATELY DID NOT PULL
`llms.txt` still advertises **"Predictive papers for timed board-style rehearsal"** as a core
capability — **under the heading whose dead URL it just removed**, for a surface marked
`DEFERRED-REVIVE` in `App.tsx`. **It left it because D8 was scoped to URLs, and flagged it instead of
quietly widening.** ⇒ **A capability claim an AI crawler cannot reach — the same anti-fabrication class
as the paywall selling retired features.** `[FU-LLMS-CAPABILITY-CLAIM-FOR-DISCONNECTED-SURFACE]`
**One line, inside META-1's existing allowlist, #597 still draft — cheap to fold in if the owner rules.**

---

## ★★ E1 · SEC-1 RETURNED — PASS, DRAFT #596. **AND IT REFUSED TO CLAIM ITS OWN WIN.**

**Full report:** `…\scratchpad\report-sec1-codeql-live-code-2026-08-03.md`. 8 files, zero under `src/`,
`diagrams.cjs` untouched, **`index.cjs` and `userProgress.cjs` untouched (PG-1's)**.
`scope:guard` → `SCOPE_GUARD_OK (mode=mixed, lanes=product+apiServer) inspected=8 untracked=2`.
tsc app 0, tsc test 0, `artifacts/api-server typecheck: Done`, mojibake 0.
**CI `30824197137` PASS 5m23s @ head `22549b57`** — zero-skip quoted:
`# tests 19 # pass 19 # fail 0 # skipped 0` (api-server) and `# tests 190 # pass 190 # fail 0 # skipped 0`
(root guard matrix).

> ⚠ **NUMBER DISCREPANCY, LOGGED NOT RECONCILED.** SEC-1 quotes the root matrix at **190**; PG-1 quoted
> **47+103+36+41 = 227**. Both read from their own run. **Do not reconcile these from the armchair and
> do not carry either.** They may count different things (one chained total vs a sum across suites).
> ⇒ **This is precisely why CI-DOCS §5 must describe WHERE the number comes from rather than restate it.**

### ★★ IT WOULD NOT CLAIM ITS ALERTS CLEARED — the judgement of the wave
CodeQL Analyze **passed on its PR, but the ref-scoped query returned ZERO alerts TOTAL — including the
7 on `diagrams.cjs` it never touched.** Its conclusion: **"An empty result set is not a cleared set. I
CANNOT show my six cleared and am NOT claiming it."**
⇒ **The authoritative check is trunk AFTER merge.** *A lane that declines the flattering reading of its
own evidence is the behaviour this model exists to produce.*

### ★ THE FINDINGS — each established before being fixed
- **HELMET:** before `contentSecurityPolicy:false` (CSP null, HSTS null). Now
  `default-src 'none';frame-ancestors 'none'`. ★ **CORS change: NO.** ★ **Browser-observable: NO** — it
  verified every route ends in `res.json` or pipes gateway JSON, **no document is served, and CSP
  attaches to documents.** `useDefaults:false` deliberately keeps `upgrade-insecure-requests` out as a
  transport directive. **HSTS untouched — CodeQL never named it.**
- **RATE LIMITING:** `rateLimiter.cjs` existed **but is on the OTHER process (:3001)**, PAID_ENDPOINTS
  only, CommonJS, **spoofable-header key, and never sees `/shared-api`.** api-server had **no limiter
  and no dep.** ⇒ **MIRRORED, not invented, and NO DEPENDENCY ADDED.** Keyed on **verified
  `req.userId`**, one instance across 3 admin routes, **before `requireAdminRole`.**
- **SESSION IDS:** established as **a BEARER CREDENTIAL** — `getSession` is a bare `Map.get` with **no
  ownership check**. `Math.random` was fallback-only → `crypto.randomBytes`. **Do live sessions
  survive? Moot AND proven:** the store is a process-local `Map` (a deploy already wipes it) and
  `"sess_"` appears in exactly 2 places repo-wide, both inside `createSessionId`; **every read is an
  exact-string lookup that never parses the id.**
- ★★ **RESPONSE SHAPE PRESERVED — the paywall's copy is safe:** a 402 still carries
  `error:"premium_required"` + `message:"Check & Improve is part of LazyTopper Premium."` +
  `feature/tier/trialEndedAt`.

**M1–M4 ALL RED**, each quoted. ★ **Restores by `sha256` byte-compare — and the harness ABORTS if a
mutation does not change the SHA, so a no-op mutation cannot read as a pass.** *(That closes the D9
trap at the harness level rather than by discipline.)*

### ★ CONTRADICTIONS IT RAISED
1. **The stack-trace SOURCE is `index.cjs:447` — PG-1's file, untouchable.** It fixed **at the SINK
   instead, which is strictly better: 4 call sites emit that same `details:` shape today.**
2. **FORBIDDEN MAP stale — 3rd independent confirmation.** CONV no longer lists `SolutionChecker.tsx`.
3. ★ **`scope:guard` HAS an `apiServer` lane** — the standing Wave-2 note that `artifacts/**` falls to
   `[unclassified]` is **stale and should stop being repeated.**
4. ⚠ **Its two new `.cjs` suites are NOT in the CI chain** — wiring needs `lazytopper/package.json`,
   which is CI-DOCS'. **So #596's own tests are green locally and ungated in CI.**
   `[FU-SEC1-CI-WIRE-SERVER-TESTS]` → **CI-DOCS should wire them; recorded so it is not lost.**
- **WHERE ELSE (outside allowlist, reported not fixed):** `insecure-randomness` also at
  `sessionApi.ts:421` + `sessionLogger.ts:69`; `resource-exhaustion` `warmQuestionPool.cjs:246`;
  `incomplete-sanitization` `mentorStructured.ts` + `state_board.mjs`.
- **~40 alerts REMAIN OPEN BY DESIGN.** `diagrams.cjs` (7), clear-text-storage (8), `notes/` (18),
  `docs/`, `lib/`, `public/visuals`. **Nobody should read #596 as "CodeQL is clean."**

---

## ★★ G2b · GATE-2b RETURNED — PASS. **THE 51 TESTS ARE NO LONGER DECORATION.**

**Full report:** `…\scratchpad\report-GATE2b-2026-08-03.md`; 6 screenshots in `…\scratchpad\shots\`.
★ **ZERO commits, ZERO pushes** — head still `7821c1cb`, `git status --porcelain` empty, #598 still
DRAFT, `gh pr edit` never run, 4 files exact match. **It added no risk to close its gaps.**

**CI `30824424182`** — `Test Files 98 passed (98)` / `Tests 1187 passed (1187)`, **own suites present
as EXECUTED with counts**: `✓ UpgradeSheet.test.tsx (31 tests)` · `✓ SolutionChecker.contract.test.tsx
(20 tests)`.

★ **EMITTED CHUNK — it did not invent one.** There is **no `UpgradeSheet-*.js` chunk**; it ships inside
`assets/SolutionChecker-kl-qryP4.js 21.75 kB`. **Proof it is not tree-shaken:** trunk was
`SolutionChecker-B_PGAsmy.js 16.21 kB` → **+5.54 kB and the content hash CHANGED**, and the import is
static (a single-importer static edge is exactly what Rollup merges).

### ★ THE MUTATION PASS — the thing GATE-2 could not reach
| M | Result |
|---|---|
| **M1** trial non-premium | **RED** — `× a TRIAL student is entitled… expected false to be true` |
| **M2** locked CTA navigates | ★ **VOID, not faked** — no locked CTA exists, and **no test implements assertion 4.** Not substituted |
| **M3** remove "Keep using Basic" | **RED** — `Unable to find an accessible element with the role "button" and name "Keep using Basic"` |
| **M4** sheet on any non-200 | **RED** via assertion 9 — `× a 500 does NOT yield the sheet-opening type` |
| **M5** sell a retired surface | **RED** — `× does NOT sell the retired surface Smart Study Planner` |

**`sha256sum` baseline over 6 files, `sha256sum -c` after EVERY restore, all OK, one at a time. Final
re-run 51/51 green.**

### ⚠⚠ THE SHARPEST FINDING IN THE WAVE — a test that passes for the wrong reason
**Assertion 8 (429) survived M4 — correctly, but not for the reason the suite implies.** The 429 branch
sits at line 182, **BEFORE** the 402 at line 196, so `DailyLimitError` throws first.
⇒ **429 is protected by branch ORDERING, not by the 402 predicate.**
⇒ **Reordering those two branches is a change no test would catch.** `[FU-AICLIENT-402-429-ORDER-UNPINNED]`
*(It proved the assertion non-vacuous with its own control, then explained why it still does not pin
what it appears to pin. That is the difference between a green test and a understood one.)*

### ★ SCREENSHOTS — 3 at 1024, 3 at 390, audited programmatically not by eye alone
Every element **plus `::before`/`::after`**, computed colour/background/4 borders vs the five error-red
values: **NONE.** ★ **Green `rgb(22,185,106)` control present on every sheet shot, so the negative is
not vacuous.** Bottom sheet at 390, centred modal at 1024, only the 4 live features, `₹599/month` from
`MONTHLY_INLINE`, "Keep using Basic" a **full-width equal-weight button** — not a subdued text link.

⚠ **TWO SPECIFIED SHOTS DO NOT EXIST, and the second is a finding:**
- Locked CTA + trial-student unlocked CTA — **the locked affordance was never built** (FORBID-1's
  contract), so both would be the same image.
- ⚠ **The inline 402 message on the Practice page is VOID because it was DELETED, not restyled.** The
  catch sets `premiumBlock` and **never calls `setError`**, so nothing reaches the red box — which
  survives only for 429/500, correctly. ★ **But nothing pins that absence.**
  `[FU-402-INLINE-MESSAGE-ABSENCE-UNPINNED]` — **flag it for live-verify.**

**Also:** of the spec's 13 assertions, **4 and 11 have no test** (11 argued structurally only).
**My dispatch gave it two run IDs that were CodeQL + Quality Gate; lane-overlap is a THIRD run it had
to find itself** — my error, and it said so rather than quoting the wrong one.
★ It also declined a free win: *"the D9 premise has lapsed — those files are now COMMITTED, so git would
have caught drift. I used SHA anyway but will not claim it saved me from a blindness that ended."*

---

## ★★ M1 · META-1 RETURNED — PASS, DRAFT #597. **THE HIGHEST-LEVERAGE LINE IN THE REPO IS FIXED.**

**Full report:** `…\scratchpad\report-META1-domain-metadata-2026-08-03.md` (copy also at
`…\OneDrive\Desktop\diff\` per CLAUDE.md §9). 7 files, LANDED == declared.
`scope:guard` → `SCOPE_GUARD_SCOPE: inspected=7 untracked=1 anchor_frame_would_miss_untracked=0 /
SCOPE_GUARD_OK`. tsc app + test PASS, mojibake `enforced_hits=0`, 18 local tests.
**CI `30824267781` SUCCESS on head `f26fdbea`** — zero-skip: `Test Files 98 passed (98)` /
`Tests 1162 passed (1162)`, **and both new suites proven to have RUN by name**:
`OK src/config/domain.guard.test.ts (4 tests)` · `OK src/config/pricing.guard.test.ts (9 tests)`.

★ **`<link rel="canonical" href="https://lazytopper.com/" />`** — the line the brief called the
highest-leverage in the repo.
★ **Its own re-derivation found NOTHING §0 missed** — 18 product occurrences, exactly §0's set
(index.html 3 · llms.txt 6 · robots.txt 1 · sitemap.xml 7 · og-image.svg 1). The only survivor is
`LegalPage.repair.test.tsx:28`, where the string is **inside the existing test's NAME** — correctly
exempted. **6 left in `handoff/` by design; `docs/` and `artifacts/` had ZERO.**

### ★ BOTH GUARDS ARE REAL — control first, mutation red, restore by SHA
- **Domain guard names its subject: `1040 scanned files`.** Mutation red, quoted:
  `1 occurrence(s) across 1040 scanned files: index.html:7` — **and the positive-canonical assertion
  went red too (2 of 4 failed)**, so it pins the right value, not merely the absence of the wrong one.
  **Control green on the swept tree BEFORE any mutation.**
- **Price guard extension:** mutation red — `[A/rupee] + [C/bare-figure] index.html:18 … ₹599/month`.
  ★ **A SECOND mutation — `"Premium is 599 a month"` with no rupee sign — fired `[C/bare-figure]
  ALONE**, proving the new half is independently load-bearing rather than shadowed by the old one.
- **3 mutations fired, all RED, all restored, verified by `sha256` byte compare (D9), one at a time.**

### ⚠⚠ IT FOUND THE SPEC CONTRADICTING ITSELF — AND APPLIED THE COPY VERBATIM RATHER THAN SILENTLY REWORDING
§2d says **"APPLY EXACTLY"** and also **"Title ≤ 60 characters — the one above is 60. Count before
changing"** and **"Description ≤ 155."** The supplied copy is **title 61** and **description 175
rendered / 179 raw.**
⚠ **The clause Google truncates is the tutor differentiator — which §2a says is the description's
entire job.** ⇒ **OWNER COPY RULING OWED**, below. `[FU-META-COPY-EXCEEDS-SERP-LIMITS]`

### ★ §2e UNDERCOUNTED — three dead sitemap routes, not one, and it did NOT delete them
`/trends/10/Maths` · `/predictive-papers` · `/dashboard`. ⚠ **None 404s** — all fall through
`path="*"` to `HomeRedirect`, so **they serve duplicate home content**, which is a quieter SEO defect
than a 404, not a lesser one. **`llms.txt` repeats 2 of the 3**, which §2e never mentions.
*(`/trends`' live replacement is `/exam-trends`.)* **Listed for the owner, not deleted.**
`[FU-SITEMAP-THREE-DEAD-ROUTES]`

★ **§5 CONFIRMED by its own search, not repeated:** `helmet|prerender|vite-plugin-ssr|ssg|react-snap`
across both manifests + `vite.config.ts` → NONE; `document.title` across `src/` → NONE;
`Helmet|useHead|setAttribute(name/property)|createElement('meta')` → NONE. **Pure client-rendered SPA;
long-tail search is structurally unreachable today.** `[FU-SPA-NO-PER-ROUTE-METADATA]`
★ **§2c's two marketing claims BOTH re-verified end to end — no contradiction, copy not softened.**
★ **FORBIDDEN MAP stale, confirmed independently** (2nd lane to do so): `SolutionChecker.tsx` is out of
CONV, **which now asserts the inverse.** None of its 7 files is in any of the three arrays.

### ✅ IT ANSWERED MY SEQUENCING QUESTION — RESIDUAL RISK 3 IS DISCHARGED
*"My §4 extension does NOT change what GATE-2 must satisfy — purely additive `describe` block, zero
existing assertions modified, `MONTHLY_INLINE` untouched, and it reads only `index.html`.
**META-1 → GATE-2 is safe.**"* One low-probability note it raised itself: **its domain guard now scans
`src/components/subscription/**` that GATE-2 creates — red only if GATE-2 writes `lazytopper.app`.**

---

## ⚠⚠ G2 · GATE-2 RETURNED — PASS-WITH-DEFERRALS, DRAFT #598. **NOT MERGE-READY.**

**Full report:** `…\scratchpad\report-GATE2-2026-08-03.md`. Returned at **~2% context** — it ran out
before the evidence half. 4 files, LANDED == declared, `App.tsx` absent, `pricing.guard.test.ts`
untouched (META-1's), `AuthContext` untouched. `scope:guard` OK, tsc app + test PASS, mojibake PASS,
`Tests 51 passed (51)` locally.

### ✅ WHAT IT DID DELIVER, verified
- **Feature list derived from `featureGates.ts`, not from the old modal.** Kept: Unlimited Mock Tests ·
  Exam Simulation · Chapter Hub (AI Tutor) · Weak Area Practice. **Removed from sale: Predicted
  Questions, Smart Study Planner, Daily Focus Mix, Full Analytics Dashboard, Parent Dashboard.**
  **No retired surface is named on the sheet.**
- **"Keep using Basic" — `onClick={onClose}` only, zero navigation**, proven by a `LocationProbe` still
  at `/practice?topic=light`, with **"See plans" as the control that DOES navigate.** *(An "it does not
  navigate" assertion with a control that does — the right shape.)*
- **Nothing error-red**, asserted absent by hex AND rgb, **with a control that the green `22,185,106`
  IS present.**
- **Price from `MONTHLY_INLINE`**, no literal. **FORBID-1's 20 contract tests pass UNMODIFIED**; no
  `autoGrow`/`maxRows`.

### ⚠ THREE THINGS OWED — GATE-2b DISPATCHED TO CLOSE THEM
1. **CI never read** (runs `30824423402` + `30824424182`, head `7821c1cb`) ⇒ **no zero-skip proof, no
   emitted chunk for `UpgradeSheet`.**
2. ⚠⚠ **M1–M5 NOT FIRED.** Its own words: *"NONE is mutation-verified. Treat the suite as unproven
   until they are fired."* **51 green tests that have never been shown able to fail is exactly this
   project's silent-no-op class.** Honestly declared rather than implied — but it is the whole bar.
3. **0 screenshots**, at neither 1024 nor 390.

### ⚠⚠ 2026-08-03 · CORRECTING THE COFOUNDER'S STATED CONSEQUENCE — **IT IS WRONG IN BOTH DIRECTIONS**
He wrote: *"the upgrade sheet exists and nothing opens it from a 402. A free student pressing 'Check
my answer' still gets GATE-1's inline message; the sheet appears only via the locked CTA."*
**All three clauses are contradicted by the lanes' own verified evidence:**

1. ❌ *"nothing opens it from a 402"* — **the sheet DOES open from a 402.** GATE-1's `aiClient` branch
   already **throws `PremiumRequiredError`**, and `SolutionChecker`'s `handleCheck` **catch** opens the
   sheet. GATE-2: *"one opener structurally — handleCheck's catch, nothing else. No pre-check, no
   subscriber."*
2. ❌ *"the sheet appears only via the locked CTA"* — **there IS no locked CTA.** GATE-2b verified:
   *"no locked CTA exists (no 🔒, no `canAccessFeature`/`useSubscription` in SolutionChecker; only
   `disabled={loading}`)."* The catch is the **only** opener, not a fallback to one.
3. ❌ *"still gets GATE-1's inline message"* — **that message is GONE, by deletion.** GATE-2b: *"the
   catch sets `premiumBlock` and never calls `setError`, so nothing reaches the red box. The red box
   survives only for 429/500, which is correct."*

> ⇒ **THE ACCURATE HALF:** ★ **the 402 → sheet path WORKS, on the Check-my-answer surface only.**
> **What is missing is the CENTRAL emitter in `aiClient.ts`, so every OTHER paid surface —
> `/api/grade-worksheet`, `/api/tutor`, `/api/step-solution` — gets a typed error and NO sheet.**
> `[FU-GATE2-402-SHEET-UNWIRED]` **— and note the honest consequence is narrower and more favourable
> than the one asserted, which is exactly why it still had to be checked rather than accepted.**

### ⚠⚠ WHY `aiClient.ts` WAS LEFT OUT — **(a) A VERIFIED FINDING. NOT a FORBIDDEN gate.**
⚠ **The cofounder is RIGHT that `aiClient.ts` is in NO `FORBIDDEN` array** — not CONV, not CI-OVL, not
QP-OVL; #580 edited it eight hours earlier. **No lane ever claimed otherwise, and my own earlier
shorthand "blocked by FORBID-1's contract" invited that reading. It was imprecise and I withdraw the
phrasing.**

**The blocker is a MOCK, not a BAN — a different mechanism entirely.** GATE-2, verbatim:
> *"I built an `onPremiumRequired` emitter there; it reddened 19/20 of FORBID-1's contract tests
> because that suite mocks `aiClient` as a COMPLETE replacement exporting only `checkSolutionImage`.
> Reverted, SHA-verified."*

⇒ This is the standing rule **`vi.mock` IS A COMPLETE REPLACEMENT** firing — the GATE-2 brief warned
about it for `AuthContext`, and **it bit on a module nobody had flagged.** The only fix is to add the
export to that mock factory, i.e. **edit `SolutionChecker.contract.test.tsx` — which GATE-2 was
required to leave UNMODIFIED.** ⇒ **Blocked by the "unmodified" constraint, NOT by a ban.**
`[FU-AICLIENT-MOCK-APPEND-HOSTILE]`

### ⚠⚠ TWO THINGS BLOCKED — ONE ROOT CAUSE, AND IT IS AN OWNER DECISION
**Both trace to `SolutionChecker.contract.test.tsx` — the file FORBID-1 created to REPLACE the blanket
ban.** The amendment that unblocked this lane is now the thing constraining it.

- **(a) `aiClient.ts` is byte-identical to trunk — NEITHER EXTENDED NOR REPLACED.** §0's central
  instruction could not be carried out. It built the `onPremiumRequired` emitter, and **19 of 20
  contract tests went red: that suite mocks `aiClient` as a COMPLETE replacement exporting only
  `checkSolutionImage`, so an added export throws.** Reverted, SHA-verified.
  ★ **This is the `vi.mock` rule the brief warned about for `AuthContext`, firing on a module nobody
  flagged.** `[FU-AICLIENT-MOCK-APPEND-HOSTILE]`
  → **Mitigation, not a gap:** GATE-1's 402 branch already parses all four fields
  (`message/feature/tier/trialEndedAt`), so **§4's parse half was already complete on trunk** — only
  the consuming surface was missing, and the sheet now opens from `handleCheck`'s catch.
  ⇒ **DOUBLE-OPEN IS PREVENTED STRUCTURALLY: one opener, no pre-check, no subscriber.** *Removing the
  emitter eliminated the second path rather than de-duplicating after it.*
- **(b) §3's LOCKED CTA IS UNBUILDABLE INSIDE THIS ALLOWLIST.** **FORBID-1's contract test asserts a
  non-entitled student sees an ENABLED "Check my answer"** — the direct opposite of §3. `useSubscription`
  cannot be added there (unmocked, no global firebase mock, a truthy uid hits real Firestore in jsdom),
  and the parent components are out of allowlist, so an optional prop would have no caller.
  `[FU-GATE2-LOCKED-CTA-BLOCKED-BY-CONTRACT]`

### ★ IT CORRECTED ITS OWN SPEC TWICE
1. **§2a is WRONG that Chapter Hub is retired** — `/topic-hub` and two child routes are live. It is
   correctly still on the sheet.
2. **§2a UNDERCOUNTED: five severed surfaces were being sold, not four** — it also caught
   `parent_dashboard` and `predicted_questions`. `[FU-FEATUREGATES-RETIRED-ENTRIES]`

**FREE-TIER COUNTERS: DEFERRED, as §5 permits.** A server counter means `server/**` — PG-1's and
SEC-1's tree this wave. ★ **`rateLimiter.cjs` already tracks per-uid daily counts and `resolveCaller`
already yields a verified uid — the mechanism largely EXISTS; it is a re-point, not a build.**
⚠ **Free-tier limits remain resettable** (localStorage, practice 10/day, mocks 1).
`[FU-FREE-TIER-COUNTERS-CLIENT-RESETTABLE]`

---

## ★★ P1 · PG-1 RETURNED — PASS, DRAFT #595. **AND IT SETTLED D4 WITH EVIDENCE.**

**Full report:** `…\scratchpad\report-PG1-delete-retired-progress-2026-08-03.md` (502 lines).
2 files, LANDED == declared (`gh pr view 595 --json files`). `App.tsx` absent, zero files under `src/`.
`scope:guard` → `SCOPE_GUARD_OK (mode=product, lanes=product) inspected=2 untracked=0`. tsc app 0,
tsc test 0, mojibake 0. **CI `30823544229` success on head `a1d884bc`** — zero-skip quoted:
`# tests = 442 / # pass = 442 / # fail = 0 / # skipped = 0 / # todo = 0`.
★ **Root matrix reported 47+103+36+41 = 227 checks, READ FROM THE RUN, not hardcoded.** *(It was 190
a wave ago. The count grows — this is exactly why CLAUDE.md §6 forbids carrying the number.)*

### ⚠⚠ D4 IS RESOLVED — BOTH SOURCES WERE PARTLY RIGHT, AND THE ANSWER IS BETTER THAN EITHER
Lane-overlap run `30823543854`: *"PR #595 changes 2 file(s). Comparing against 0 other open PR(s).
PASS: no lane overlap with any other open PR."*

- **The CI-DOCS brief's "gates nothing" is FALSE** — it exits 1 on a hit. It is a real gate.
- **Trunk's "fails on a shared path" is TRUE but imprecise:** the mechanism is **EXACT FILE
  membership** (`files.filter(f => mineSet.has(f))`), **NOT directory prefix.**
- ⇒ **My directory-level worry about PG-1 and SEC-1 sharing `lazytopper/server/` is DISCHARGED.**
  File-disjoint is sufficient. **Directory-sharing lanes may be parallelised** — a standing planning
  fact I had wrong, and it widens what future waves can run at once. `[FU-LANE-OVERLAP-FILE-EXACT-NOT-DIRECTORY]`
- ⚠ **BUT PG-1's OWN RUN WAS VACUOUS — 0 comparators**, because it pushed first. **CI has not actually
  tested PG-1 against SEC-1.** ⇒ **SEC-1's lane-overlap run is the one that carries the real test**, and
  SEC-1 is already instructed to quote it. *A green check with nothing to compare against is the
  project's own silent-no-op class, and PG-1 named it rather than banking it.*

### ★ IT FOUND §1 INCOMPLETE — the "WHERE ELSE?" rule paying for itself
The brief named **two** `userProgress` sites in `index.cjs`. There are **FOUR**:
`:129` require *(named)* · `:267` `createUserProgressRoutes(routeDeps)` factory call **(MISSED)** ·
`:313-319` seven CORS-preflight OPTIONS path arms **(MISSED)** · `:507-527` dispatch *(named, and the
brief's `:489-507` was stale)*. **All 7 handlers removed:** `handleGet, handleSync, handleXP,
handleStreak, handleFocus, handleMastery, handleMission`.

### ★★ THE ENTITLEMENT GATE — byte-untouched, quoted, still ahead of dispatch
`const verdict = rateLimiter.check(req, reqPath, verifiedUid); if (!verdict.allowed) { … }` … `if (await
entitlementGate.applyToRequest(req, res, reqPath, verifiedUid)) return;` — **after the rate-limit caps,
~170 lines above the first route branch.** `/api/tutor`, `/api/check-solution`, `/api/grade-worksheet`,
`/api/step-solution` dispatch unchanged. **The removed `require` had no load-time side effects** (lazy
`getPool`) ⇒ no evaluation-order shift.

**Assertion 2 proven in CI, not locally asserted:** `ok 37 - CONTROL 1 · a REAL free caller gets a REAL
402 from the REAL /api/check-solution` + `ok 38 - CONTROL 1b · a REAL premium caller is SERVED by the
same real route`. **Boot proven by the already-wired `entitlement.test.cjs`, which spawns the REAL
`index.cjs`** — 43/43 local and CI.
★ **It deliberately added NO new test file, because wiring one needs `lazytopper/package.json` —
CI-DOCS' this wave. It avoided a collision the allowlist alone would not have caught.**

**MUTATION red, restore SHA-verified:** re-added the require with the module deleted →
`Error: Cannot find module './routes/userProgress.cjs' code: 'MODULE_NOT_FOUND'`, `# fail 3`, harness
`BOOT FAILED`. Restore `sha256 39124bad91…78827` before == after; re-run 43/43 green.

**`dbSyncService` on 404 vs 503: NO student-visible difference.** Every write is
`(async()=>{…})().catch(()=>{})` — **the status is never read**; the single read does `if (!res.ok)
return;` inside a catch. **§3's STOP condition did not fire; the client is untouched.**
⇒ **Say it plainly: the SERVER side is gone and the CLIENT still calls it. This is NOT "the Postgres
layer is removed."** `[FU-DBSYNC-CLIENT-CALLERS-DEAD]`

★ **FORBIDDEN MAP confirmed stale, as the dispatch warned** — FORBID-1 landed, `SolutionChecker.tsx` is
out of CONV, and CONV's unconditional membership check now pins `ResultsScorecard.tsx`. **PG-1
re-derived it: neither `index.cjs` nor `userProgress.cjs` is in any of the three arrays — lane clear.**
★ **`@workspace/db` — it independently reached SCOUT-1's answer** ("already unused, never reachable
from this lane's code"). **Two lanes, same conclusion, derived separately.** Reported, not acted on.

---

## ★★ S1 · SCOUT-1 RETURNED — COMPLETE. **IT PROVED ITS OWN BRIEF'S §0 PREMISE WRONG.**

**Full report:** `…\scratchpad\SCOUT1_workspace_reachability_report_2026-08-03.md` (subagent scratchpad).
Zero files changed, `git status` clean, `pnpm-lock.yaml` untouched, no `pnpm install` run. All **nine**
members settled — none left unexamined.

**Absence-claim control stated, as demanded:** an unfiltered `grep -rn "@workspace/" .` found the
guaranteed-present `api-server/src/routes/health.ts` → `@workspace/api-zod` import; a second
path-based control found `scripts/src/validateQuestionBanks.ts` joining `lib/shared-data/src/…` —
**the hit a `@workspace`-only grep CANNOT see, and the reason `lib/shared-data` was NOT called dead.**

### ⚠⚠ THE COST PREMISE WAS WRONG — this de-prioritises the whole deletion idea
The brief's §0 assumed *"a large share of ~100 alerts come from packages the deployed artefacts never
use — Hono, Drizzle, Morgan, `re2`."* **False.** Those 19 alerts resolve through the **ROOT** importer
via `firebase-tools@15.15.0` / `superstatic` / `@modelcontextprotocol/sdk` — **not through any
workspace member.**

> **Deleting every apparently-dead member removes 211 of 1,417 packages but only 4 of 103 alerts.**
> The real levers are `firebase-tools` (26 exclusive), lazytopper's own tree (31 exclusive), and the
> Dockerfile's deliberate no-prune full-workspace install.

⇒ **D7 · A workspace-deletion lane is NOT worth scheduling for supply-chain reasons.** The finding
that would have justified it is the finding that kills it. `[FU-SCOUT1-ALERTS-ARE-NOT-A-WORKSPACE-PROBLEM]`

### Q-A · `@workspace/db` — YES for the dependency LINE, NO for the package
Zero imports of `@workspace/db`, `drizzle-orm` or `pg` in any of api-server's 10 src files; esbuild
bundles from `src/index.ts` so none reach `dist/index.mjs`. `"drizzle-orm": "catalog:"` is equally
unused and must go in the same edit. **But `lib/db` cannot be deleted — its drizzle schema is the only
DDL definition of `step_solutions` / `tutor_cache` / `generated_questions`.**
★ **`stepSolution.cjs`'s KEPT cache does NOT go through it** — `require('pg')` + `new Pool(...)`, raw.
★★ **PG-1 LANDING CHANGES NOTHING HERE:** `user_progress` has no drizzle schema at all, so PG-1 removes
a table `lib/db` never described and leaves all three described tables in service.
⇒ **D8 · PG-1 told to cite this, not re-derive it** (controller message sent 2026-08-03).

### Q-B · `artifacts/lazytopper-app` — output shell CONFIRMED
`lazytopper/vite.config.ts` `build.outDir` → `../artifacts/lazytopper-app/dist/public/app`, read back by
`scripts/verify-production-build.mjs`. 11 tracked files, **no `src/`** ⇒ its `index.html` `src="/src/main.tsx"`
is dangling, its build/typecheck scripts cannot run and nothing invokes them, and
`serve-production.cjs` is referenced by nothing **and serves `dist/public`, not `…/app`** — it would not
even serve the app. Replit-era leftovers beside a directory the build fills.
**SPLIT VERDICT: `dist/public/app` LOAD-BEARING; the package shell APPARENTLY-DEAD.**

### ⚠ ALARMING, SEEN IN LANE-MATES' TREES — reported, nothing changed
- **(b) → PG-1, RELAYED:** `server/routes/questionReport.cjs` uses the same raw-pg pool and is **not in
  PG-1's scope**; SCOUT-1 counts **8** Postgres consumers, not the 2 the brief implies. PG-1 instructed
  to confirm it is left intact. *(This is the brief being incomplete, not PG-1 over-reaching.)*
- **(a) → META-1:** `artifacts/**/public/` assets (`opengraph.jpg`, `favicon.svg`) are **NOT served** —
  `lazytopper/public/` is. **Editing the artifacts copies would be a silent no-op.** META-1 is already
  scoped to `lazytopper/public/**` only, so no action; recorded so nobody "completes the sweep" later.
- **(g) → CI-DOCS:** independently confirms §5's stale `quality-gate.yml` count. **A second lane
  arrived at CI-DOCS' premise without being told it** — the premise is now evidenced, not asserted.
- **(c) ⚠ CI NEVER RUNS THE ROOT `pnpm run build`** ⇒ `validateQuestionBanks` and `syllabusGuard` are
  gated **only by the Railway Docker build**. A break there is **green in CI and red on deploy.**
- **(d) ⚠⚠ BANNED-TOPIC PACKS ON TRUNK:** `lib/shared-data` holds `heredity.pack{1,2}.ts` and
  `magneticEffects.pack{1,2}.ts` — **CLAUDE.md §5 names both as deleted/banned topics that must never
  appear** — inside the directory the banned-exercise validator scans. **Owner decision, own lane.**
- **(e)** `.github/dependabot.yml` (merged today, #579) asserts alerts *"VERIFIED DISABLED"*; the API
  returns **103 alerts, HTTP 200**. Its `[FU-SUPPLY1-STALE-NPM-LOCKFILE]` note is already closed by #593.
- **(f)** `pnpm-workspace.yaml` declares `lib/integrations/*` — **the directory does not exist.**

---

## BLOCKED / OWNER DECISIONS OWED

- ⚠ **RAISED — `lane-overlap`: gate or no gate?** Trunk's `NEXT_ACTION.md` and the CI-DOCS brief
  disagree (D4). Five concurrent PRs, two of them sharing `lazytopper/server/` at directory level.
  Proceeding on TRUNK's reading (blocking). **Owner ruling wanted only if a lane comes back red.**
- **OWNER GATES BEFORE MERGE — dispatch §4, none delegable:**
  - ⚠⚠ **PG-1 — #595 IS WAITING ON YOU NOW. It is first in the merge order.** Live-verify the backend
    still boots and the entitlement gate still answers **402/400**. Every gate PG-1 could run is green,
    including a real 402 through the real `/api/check-solution` in CI — **but merged means live and
    this PR edits the file that mounts the paywall, so a static gate is necessary and not sufficient.**
    ⚠ **Do NOT provision `DATABASE_URL` until #595 is merged AND live-verified.** Once it is, that
    variable powers only the step-solution cache — which is the whole point of the lane.
  - ⚠⚠ **SEC-1 — #596 IS READY, second in the order.** Live-verify; it changes live security
    middleware. ★ **Also re-check CodeQL ON TRUNK after merge** — SEC-1's PR-scoped query returned zero
    alerts *including ones it never touched*, so **it explicitly declined to claim its six cleared.
    Trunk is the authoritative check.** ⚠ Its 2 new `.cjs` suites are **ungated in CI** until CI-DOCS
    wires them (`lazytopper/package.json`).
  - **GATE-2** — live-verify the sheet, specifically that **"Keep using Basic" returns to the same
    page**.
  - **META-1 — #597 IS READY, third in the order.** Confirm the canonical is `lazytopper.com`.
    ⚠⚠ **PLUS ONE ACTION NO AGENT CAN DO: re-export `og-image.png`.** The SVG rendered the dead domain
    **as text inside the image**; the PNG (106,685 bytes) is untouched and **no text scan can verify a
    bitmap.** If it was exported from that SVG, **every share card still carries `lazytopper.app`.**
  - ✅ **DONE — the `llms.txt` capability line is removed** (cofounder ruling 4a, applied by META-1c,
    premise independently verified). **#597 needs nothing further from an agent.**
- ⚠⚠ **NEW, FROM GATE-2 — DOES FORBID-1's CONTRACT GET AMENDED? A REAL OWNER DECISION, AND IT BLOCKS
  HALF OF GATE-2's SPEC.** `SolutionChecker.contract.test.tsx` — created by FORBID-1 to *replace* the
  blanket ban — now blocks GATE-2 in **two independent ways**: it mocks `aiClient` as a complete
  replacement (so §0's 402 extension cannot be made), and it asserts a non-entitled student sees an
  **ENABLED** "Check my answer" (so §3's locked CTA cannot be built).
  **The amendment that unblocked this lane is the thing constraining it.** Per the FORBIDDEN MAP's own
  rules: *an amendment is its own reviewed PR, never folded into the lane that needs it*, and *it is an
  owner decision*. ⇒ **This is `FORBID-3`, and it should be written alongside the lane that needs it —
  not bolted onto Wave 5B.** ⚠ **Until it is ruled on, the student-facing boundary is REACTIVE only:
  the sheet opens after a 402, rather than the CTA reading `Premium` before the tap.** That is the
  inverse of the lane's stated principle — *"a student should learn the boundary BEFORE tapping"* —
  **so GATE-2 as merged is half the design, and it should be recorded as such.**
- ⚠⚠ **NEW, FROM SCOUT-1 — BANNED TOPICS ARE ON TRUNK.** `lib/shared-data` holds
  `heredity.pack{1,2}.ts` and `magneticEffects.pack{1,2}.ts`. **CLAUDE.md §5 names heredity-and-evolution
  and magnetic-effects as deleted/banned topics that "must never appear in question banks or topic
  lists."** They sit inside the directory the banned-exercise validator scans. **This is a product
  doctrine question, not a cleanup — owner rules on whether they are live content, fixtures, or
  deletions. Its own lane; NOT bolted onto Wave 5B.**
- ⚠ **NEW, FROM SCOUT-1 — A GATE THAT IS GREEN IN CI AND RED ON DEPLOY.** CI never runs the root
  `pnpm run build`, so `validateQuestionBanks` and `syllabusGuard` are gated **only by the Railway
  Docker build**. **Candidate for CI-DOCS' successor lane, not for CI-DOCS itself** — CI-DOCS is
  already the only lane changing what CI is, and widening it re-creates the risk it was held for.
- **NOT AN AGENT LANE, still open from Wave 5A:** `[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]` —
  verification mail lands in Spam; needs a Firebase custom action-handler domain on
  `lazytopper.com` + authenticated SMTP. **Pre-launch blocking.**
- **MERGE ORDER — PG-1 → SEC-1 → META-1 → GATE-2 → CI-DOCS last.** ⚠ Branch protection requires
  up-to-date branches: **every merge forces the rest to rebase and re-run, ~5 min each.** Five lanes
  is five rounds.
