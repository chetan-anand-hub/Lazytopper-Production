# WAVE 3 STATE — updated 2026-07-29 (controller pass 2, post-merge)

> **This file, not the controller's context, is the source of truth.** A replacement
> controller takes over by reading this file and nothing else. Rewritten after every
> subagent returns.
>
> Operating model: `C:\Users\Chetan\OneDrive\Desktop\diff\LazyTopper_Controller_Subagent_Model.md`

TRUNK: `25e995a795f6351fb6397d1c21585b696532ec61`
  ← re-derived `git ls-remote origin base/approved-thru-437`, 2026-07-29, after ALL Wave 3 merges.
  Base progression: `eb88bce0` → `5b4070ad` → `69a39e29` → `0a6a0bf0` (#562) → `25e995a7` (#563).

OPEN PRs: **`[]` — ZERO.** ⇒ the handoff lock is free.

**ALL SEVEN WAVE 3 PRs ARE ON TRUNK: #557 #558 #559 #560 #561 #562 #563.**

## ★ ALL THREE MERGED — verified by `gh pr view`, in the planned order

| PR | lane | merged | mergeCommit |
|----|------|--------|-------------|
| **#560** | GUARD-1 — scope:guard blind spot | 08:52:29Z | `8e89604db823a6f71f3cae2301f21897ea5a1bb1` |
| **#561** | SEC-PAIR PR-1 — Firestore rule | 09:01:55Z | `6bb5bb4f28f570e77b7041d884b6da87f6dd6ecb` |
| **#559** | C2 — `responseSchema` | 09:14:20Z | `69a39e29…` ← **is trunk** |

Owner verified from the repo, not the reports: `responseSchema` live at **three sites** in
`checkSolution.cjs`, and **both** server suites wired into the CI chain.

### ★ HISTORICAL — the pre-merge PR register (kept; the mapping is what this wave got wrong once)

| PR | lane | branch | draft | CI (at last check) |
|----|------|--------|-------|--------------------|
| **#559** | **C2** — `responseSchema` | `feat/desktop-pr-c2-response-schema` | YES | **✅ quality-gate PASS, PROVEN** — head `6591be92`, run `30433433185` derived from the pushed head. `test:server:check-solution` → `# tests 50 # pass 50 # fail 0 # skipped 0`; `test:server:token-instrumentation` → `# tests 29 # pass 29 # fail 0 # skipped 0` — both match local exactly. ★ `objective_dedup_acceptance.mjs` (unrunnable locally) **RAN and PASSED against the modified route module** — the objective exception survives the schema change. Root matrix `190/190`; vitest `1019 passed (1019)`. |
| **#560** | **GUARD-1** — scope:guard blind spot | `feat/guard-1-scope-cwd-blind-spot` | YES | **✅ quality-gate PASS · CLEAN — READY TO MERGE, FIRST IN ORDER.** Head `578ebe15`, run `30433514068` from the pushed head. `190/190`, `32/32`, `1019 passed (1019)`. Post-fix `scope:guard`: `inspected=5 untracked=1 anchor_frame_would_miss=0`. ★★ **The "not CI-gated" caveat is PROVEN, not asserted:** grepping the 4,076-line log for `blindspot\|repo_boundary\|agent3_uiux\|scopeGuard\|scope:guard` returns **0 matches** — CI executed **none** of the five changed files. Posted as evidence on the PR. |
| **#561** | **SEC-PAIR PR-1** — Firestore rule | `feat/desktop-pr-sec1rev-firestore-subscriptions` | YES | quality-gate **pending** · lane-overlap pass |

`mergeStateStatus BLOCKED` on #560/#561 is **pending checks**, not a fault — #559 shows `CLEAN`
with the same draft status once its gate finished.

**✔ `lane-overlap` passed on all three** — disjointness confirmed by the gate, not only by the
controller's lane map.

**★ MERGE ORDER (owner-accepted, and executed exactly): #560 → #561 → #559.**

---

## ★★ THE DEPLOY ALMOST SHIPPED NOTHING — the best lesson of the wave

**Merging #561 did not put the security fix in production.** A `firestore:rules` deploy run from
the **shared checkout** redeployed rules **six commits stale** and reported success.

```
[FU-DEPLOY-FROM-STALE-CHECKOUT] — CONFIRMED, not hypothetical. On 2026-07-29 a
firestore:rules deploy run from C:\Projects\Lazytopper-Production redeployed rules
six commits stale (checkout at 47d765db, trunk at 6bb5bb4f) and printed "latest
version already up to date, skipping upload" followed by "Deploy complete!". The
security fix was NOT in production despite a successful-looking deploy.
RULE: before any deploy, `git pull` and GREP THE LOCAL FILE for the expected new
content. "Deploy complete" is not evidence; "skipping upload" on a file you just
changed is evidence of the opposite. Verify in the Firebase Console afterwards —
it is the only authority on what is enforcing.
Fourth instance of the shared checkout producing a confident wrong result.

[FU-DEPLOYMENT-OUTSIDE-EVERY-GATE] — firestore.rules is the clearest case but not
the only one: nothing in CI can observe what is actually deployed. A merged rules
file, a Railway env var, a Firebase console setting — all of them can diverge from
trunk silently and indefinitely. The stale-checkout deploy above was invisible to
every gate this project has, and would have stayed invisible until an auditor or a
student found it. Any lane whose outcome depends on a deploy must carry an explicit
OWNER-ACTION line in its report AND must not be closed in WAVE_STATE.md until the
owner confirms the deployed state, not the merged state.
```

**`"skipping upload"` on a file you just changed is the tell.** It is the same shape as every other
silent no-op this wave — the operation reported success while inspecting nothing — except this one
lives *below* every gate the project owns. `6bb5bb4f` in that FU is **#561's own merge commit**:
the deploy ran minutes after the merge, from a checkout that had never seen it.

⇒ **`[FU-DEPLOYMENT-OUTSIDE-EVERY-GATE]` is now a standing closure rule for this file:**
**a lane whose outcome depends on a deploy closes on the DEPLOYED state, never the MERGED state.**

---

## ★ THE COFOUNDER'S OWN CORRECTION — a verification command that could not fire

> *"I gave the owner a broken verification command — two piped `Select-String`s requiring the same
> LINE to match both an invocation pattern and a result pattern, which can never match. It returned
> empty and looked like evidence that C2's suites had not run. They had."*

**Authored while writing the doctrine against exactly this.** A command that cannot match returns
nothing, and nothing reads as a finding. ⇒ **A verification command needs its own control:** run it
against a case you *know* matches before trusting an empty result. An empty result from an
unvalidated command is not evidence of absence — it is no evidence at all.

⚠ **PowerShell specifics worth keeping:** `node --test` prints the invocation (`> pnpm run x`) and
the result (`# pass N`) on **different lines**, so any filter demanding both on one line matches
zero. Use two separate greps, or `-Context`.

---

⚠ **The six handoff files are UNLOCKED** (no handoff PR is open) but the handoff still goes **LAST**,
after every lane is on trunk. Re-derive the tip and re-run `gh pr list --state open` before opening it.

---

## MERGED THIS WAVE — verified by `gh pr view`, not by report prose

| PR | lane | merged | mergeCommit |
|----|------|--------|-------------|
| #557 | **D1** — phone-linking nudge | 2026-07-29 02:53:34Z | `579b6953bfd55a452a4fb6fc10eba9e941e7365f` |
| #558 | **C1** — grader ban → targeted tests | 2026-07-29 02:59:40Z | `5b4070ad89af78f0890083e2e2a7e95a882dd095` ← **is trunk** |

### ★ PR-NUMBER MAPPING — AUTHORITATIVE. Never take it from an agent's report.
```
#557 = D1  →  feat/desktop-pr-d1-link-phone-nudge    →  LinkPhoneNudge + both Home pages
#558 = C1  →  feat/desktop-pr-c1-checksolution-tests →  both FORBIDDEN gates + stale comment
                                                         + grader test
```
**★ Both outgoing agents mislabelled their own PR number**, each reporting the other's, at ~4–7%
remaining context. **Neither was wrong about the work — only about which was theirs.** The
clearest evidence yet for the controller/subagent split: the failure was not competence, it was
an agent holding the plan while spending its last context on evidence. Any claim sourced from an
agent's final messages is re-derived from the repo before it is trusted.

### ⚠ TWO PROCESS FACTS, RECORDED WITHOUT LITIGATION
1. **Merge order ran opposite to the ruling.** The decision was #558 first; actual was #557
   (02:53) then #558 (02:59). No harm — they were file-disjoint and both landed green.
2. **★ Both merged BEFORE the verification lane returned.** The merge gate fired ahead of EV-1.
   The evidence turned out retrospectively clean, so nothing needs reverting — but the gap is
   real: *the evidence lane must close before the merge, or it is an audit, not a gate.*

---

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|-----|-------|
| C1 | grader FORBIDDEN amendment → targeted tests | `lazytopper/server/**`, `lazytopper/scripts/ops/**`, `lazytopper/package.json` | **✅ MERGED — ON TRUNK** | #558 | Declared deviation (`lazytopper/package.json`, to wire the test into `test:matrix:all`) shipped as-is. Self-policing: both gates assert the wiring. |
| D1 | F2 — one-time phone-linking nudge | `lazytopper/src/components/auth/LinkPhoneNudge.{tsx,test.tsx}`, `DesktopHome.tsx`, `MobileHome.tsx` | **✅ MERGED — ON TRUNK** | #557 | Screenshots delivered post-merge by EV-1. **No layout defects.** |
| EV-1 | pre-merge evidence (CI zero-skip + D1 screenshots) | read-only | **✅ COMPLETE — PASS** | — | Findings below. Delivered after the merges. |
| ~~SEC-1~~ | ~~Firestore rules, first attempt~~ | — | **⛔ SUPERSEDED — DO NOT MERGE, DO NOT REBASE** | — | Its §3 fix was proven **inert**. Work sits uncommitted at `C:/Projects/LT-worktrees/wave3-sec1` on stale base `eb88bce0`. **Abandon it** — its findings are inherited into the SEC-PAIR spec. Kept in the record because the *proof it was inert* is the most valuable artefact of the lane. |
| **SEC-PAIR PR-1** | SEC-1-REV — the Firestore rule | 6 files (see deviations) | **✅ MERGED AND DEPLOYED — LANE CLOSED.** Closed on the **DEPLOYED** state, not the merged one. Owner read the live rules from the **Firebase Console** (Firestore → Rules): the subscriptions block carries `clientWritableEntitlement()` with tier in `['free','trial']`, **no nested `{document=**}`**, and **no delete**. **Route A is genuinely enforcing in production.** A first deploy attempt had shipped stale rules — see the deploy FU. | **#561** | Worktree `C:/Projects/LT-worktrees/wave3-sec1rev`, branch `feat/desktop-pr-sec1rev-firestore-subscriptions`. Tests `# pass 14 # fail 0 # skipped 0 # todo 0` on a **real emulator** (portable Temurin JRE 21). Nested block **DELETED** — no subcollection writer exists repo-wide. Report: `report-sec1rev-firestore-rules-2026-07-29.md`. ★★ Found a **THIRD** route to premium — see below. |
| **SEC-2** | entitlement must not be forgeable — Routes **B and C** | `lazytopper/src/services/subscriptionService.ts`, **`firestore.rules` (again)**, PR-1's rules test, + client tests | **✅ PUSHED — DRAFT PR OPEN, CI GREEN, CLEAN. AWAITING BYTE-REVIEW + MERGE (SECOND).** Commit `7890a69d`, run `30462044343` from the pushed head. ★ Rules-emulator gate ran for real: `# tests 27 / # pass 27 / # fail 0 / # skipped 0`. Both changed client suites **provably ran, not merely collected**: `✓ subscriptionService.entitlement.test.ts (17 tests)`, `✓ useSubscription.autotrial.test.ts (5 tests)`; `Tests 1036 passed (1036)`. `scope:guard --mode mixed` → `SCOPE_GUARD_OK (mode=mixed, lanes=product+firestore)`, `inspected=5`. Exactly five files, zero D2 files, new test committed as `create mode 100644`. | **#563** | Spec: `SUBAGENT_SEC2_entitlement_not_forgeable.md`. ★★ **HELD DELIBERATELY: SEC-2's rules half EXTENDS PR-1's rules, so its base needs them GENUINELY IN PRODUCTION, not merely on trunk.** #561 is merged but the stale-checkout deploy means "merged" proved nothing. Dispatching early risks building against a state that does not exist. **Trigger = owner confirms the Firebase Console shows the new rule enforcing.** ✅ **§9 ANSWERED: Premium is activated MANUALLY VIA THE FIREBASE CONSOLE** — the Admin SDK path, which bypasses rules entirely. So PR-1 cannot break activation, and **any client-written premium is by definition forged.** No migration risk. Now carries **all three routes** under one principle. Allowlist includes `firestore.rules` **again** because the trial fix spans client and rules and they must stay consistent — that is why it sequences *after* PR-1 rather than beside it. |
| HANDOFF-PREP | consolidate the source docs into one handoff pack | read-only | **✅ COMPLETE** | — | All 6 sources read in full. Pack: **`C:\Users\Chetan\OneDrive\Desktop\diff\WAVE3_HANDOFF_SOURCE_PACK-2026-07-29.md`** (95,749 bytes — copied out of the session scratchpad, which is not durable). 13 sections mapped to the six handoff files; 19 FU ids; 24 spec premises proven wrong; a 14-item "only-here" register ranked by irrecoverability. |
| C2 | `responseSchema` — constrained decoding | `checkSolution.cjs`, `checkSolution.test.cjs`, `geminiClient.cjs`, `geminiClient.test.cjs` | **✅ MERGED AND LIVE-VERIFIED — LANE CLOSED.** Owner graded a real answer on production, **then a FULLY CORRECT answer specifically to exercise the null path**: full marks, **no spurious mistake type**. ★★ That was the failure mode to fear — a schema forcing `mistakeType` to a value would have made **Mistake Intelligence learn from noise**. The subagent's choice to make `mistakeType` **nullable with NO enum** is what prevented it, and it is now **verified rather than argued**. | **#559** | Worktree `C:/Projects/LT-worktrees/c2-response-schema`, branch `feat/desktop-pr-c2-response-schema`. 4 files, all in allowlist, zero deviations. `50 passed (50)` + `29 passed (29)`, skipped 0. **6 mutations RED**, incl. a silent-no-op one and a regex mutation that reproduced a literal `400 - Unknown name "responseSchema"` outage. `tutor.cjs` **deliberately left unconstrained** (F4). Report: `report-c2-response-schema-2026-07-29.md`. |
| GUARD-1 | the `scope:guard` blind spot, missing lanes, + `agent3_uiux_guard` | `lazytopper/scripts/scopeGuard.mjs`, `repo_boundary_policy.json`, `agent3_uiux_guard.mjs`, `repo_boundary_acceptance.mjs`, + a new blindspot acceptance suite | **✅ MERGED — LANE CLOSED.** Its protections are real but **unenforced** until `[FU-GUARD-1-B]`/`[FU-GUARD-1-C]` wire them (both need `lazytopper/package.json`). Owner merged on the local run with eyes open. | **#560** | Worktree `C:/Projects/LT-worktrees/guard1-scope-blindspot`, branch `feat/guard-1-scope-cwd-blind-spot`. 5 files, all in allowlist. blindspot 6/6, repo_boundary 5/5 (**was RED 2-failed/5 on trunk**). 17 top-level paths unclassifiable → **zero**. Report: `report-guard1-scope-blind-spot-2026-07-29.md`. Subagent at **~12%** — done, do not send it more work. |
| D2 | Client cleanup — three dead things | `lazytopper/src/pages/{Home,Login,WeakAreaPracticePage}.tsx`, `lazytopper/src/services/learningPathGenerator.ts` + tests | **✅ PUSHED — DRAFT PR OPEN, CI GREEN. AWAITING OWNER BYTE-REVIEW + MERGE (FIRST).** Head `b829859a`, 7 files, **+37/−1107**. Run `30461330050` from the pushed head: `Tests 1017 passed (1017)`, root matrix `190/190`, `Lane Overlap → success`. `scope:guard` `inspected=7 untracked=1` → `SCOPE_GUARD_OK (mode=product)`; the untracked new test staged as `A` and is in the commit. Deviation approved. **No live-verify owed.** | **#562** | Spec: `SUBAGENT_D2_client_cleanup.md`. ★ **REORDER, flagged for veto:** the D2↔SEC-2 constraint is **non-parallelism** in `lazytopper/src/`, not a dependency direction. SEC-2 is held on an owner action of unknown duration, so running D2 now uses the wait and leaves the tree free when SEC-2 unblocks. If the Console confirmation lands mid-run, SEC-2 waits for D2's merge — same serialisation, other order. ⚠ **Its spec's §D2a is STALE:** GUARD-1 (#560) already repaired `agent3_uiux_guard`. The subagent is told to **re-derive the current state rather than trust its spec OR the controller's summary.** |
| **HANDOFF** | Wave 3 handoff (was C3) | `handoff/**` incl. this file | **QUEUED — CONTROLLER-OWNED, LAST** | — | ★ **Now mine** — Agent C ran out before writing it. Six files per CLAUDE.md §10, exactly one `[CURRENT]`, `SESSION_LOG` prepended at TOP. Re-derive the tip and re-run `gh pr list --state open` immediately before opening. |

### ★★ THERE ARE THREE ROUTES TO PREMIUM, NOT TWO. THE PAIRED LANE CLOSES TWO OF THEM.

The spec framed this as two independent routes. **SEC-PAIR PR-1 found a third, and proved it green
on the real emulator (assertion 8).**

| Route | Mechanism | Closed by |
|---|---|---|
| **A — Firestore** | write `tier:"premium"` to `subscriptions/{uid}` | **PR-1 — built** |
| **B — localStorage** | `loadSubscription` reads only the local cache; Firestore never consulted | **PR-2 — not started** |
| **C — ★★ FORGED TRIAL** | `isPremiumAccess()` returns true for `tier:"trial"` **exactly as for `"premium"`** (surfaced as `isPremium` at **40 sites**). §3 correctly forbids blocking client trial writes, so the rule **must** permit `tier:"trial"` — and `trialEndDate` is a **client-supplied ISO string** that `applyExpiry` trusts. Write `{tier:"trial", plan:"trial_7day", trialEndDate:"3000-01-01"}` and hold permanent premium-equivalent access. | **NOTHING YET** |

## ★★ ALL THREE ROUTES ARE CLOSED **IN PRODUCTION** — not on trunk, in production.

The "one of three routes closed" caveat is **withdrawn**; it has been superseded by verification at
the deployed layer. Deploy printed **`uploading rules`**, not `skipping upload`. Live-verified with
a **fresh student**: trial started cleanly and survived a reload. The Firestore Console shows:

```
trialStartDate:  July 29, 2026 at 10:46:51 PM UTC+5:30   ← TIMESTAMP
updatedAt:       "2026-07-29T17:16:52.809Z"              ← string, quoted
```

★ **The type difference IS the fix.** `trialStartDate` is a real **server-set Timestamp the rules
can pin**; `updatedAt` beside it is still a quoted string, which is exactly what a client-forgeable
field looks like. **There is no `trialEndDate` field at all** — expiry is derived, not stored, so
there is nothing left to forge. `tier: "trial"` / `plan: "trial_7day"`, both inside the allowlist.

⚠ **Still open, and unchanged by any of this: server-side entitlement.** The API checks **rate
limits, not plan**. Paid features are protected **in the UI** — a real improvement, and **not** the
claim "paid features are protected." → `[FU-VERIFY-UID-ON-AI-ENDPOINTS]`.

### ★ THE OWNER VERIFIED ROUTE C INDEPENDENTLY, AND FOLDED IT INTO SEC-2 RATHER THAN SPLITTING IT
Not a separate lane, because the fix is **one coherent principle**:

> **★ ENTITLEMENT MUST DERIVE FROM DATA THE CLIENT CANNOT FORGE.**
> - `tier:"premium"` → **Admin SDK only** (PR-1, done)
> - `tier:"trial"` → the **START** is a server timestamp the rules pin to `request.time`; the
>   **DURATION** is a constant in code; therefore **the END is DERIVED — never stored, never trusted**
> - `localStorage` → a **cache**, never a grant (SEC-2)

**Storing `trialEndDate` at all is the defect.** Rules cannot parse an ISO string, which is why
every attempt to *validate* the stored date fails. **Remove the forgeable field rather than guarding
it.** ⚠ **Do NOT change `isPremiumAccess`** — trial granting premium is the product design (a 7-day
full trial) and is correct. The defect is that the trial's **LENGTH** is forgeable.

### ★★ A FOURTH FORM, FOUND BY THE COFOUNDER WHILE SPECCING SEC-2
**Pinning `trialStartedAt` to `request.time` is NOT sufficient alone.** If the client may write
`trialStartedAt == request.time` *whenever it likes*, a student re-triggers it daily and holds an
infinite trial — **Route C in a new costume.** The start must be set **ONCE and immutable**:
- **create:** `trialStartedAt` must equal `request.time`
- **update:** must equal the **existing** value (`resource.data.trialStartedAt`)
- **delete:** **DENIED** — or a student deletes the doc and re-creates to reset the clock

All three need **emulator proof, not reasoning**. → `[FU-TRIAL-ENDDATE-CLIENT-FORGEABLE]`

### ⚠ AND EVEN WITH A, B AND C CLOSED, ENTITLEMENT IS STILL CLIENT-SIDE ONLY
The server checks **rate limits, not plan**. A student calling the API directly with a valid Firebase
token still reaches paid endpoints regardless of tier. That is `[FU-VERIFY-UID-ON-AI-ENDPOINTS]`'s
remaining half — **a different lane.** After SEC-2, paid features are protected **in the UI**. That
is a real improvement and **not** the same claim as "paid features are protected."

---

## DISJOINTNESS

Current lane map (owner-assigned, controller-enforced):
```
SEC-PAIR PR-1   firestore.rules, a rules test, pnpm-lock.yaml, .github/workflows/quality-gate.yml
SEC-PAIR PR-2   lazytopper/src/services/subscriptionService.ts
C2              lazytopper/server/routes/{checkSolution,tutor}.cjs,
                lazytopper/server/services/geminiClient.cjs
GUARD-1         lazytopper/scripts/ops/, repo_boundary_policy.json
D2              lazytopper/src/pages/{Home,Login,WeakAreaPracticePage}.tsx,
                lazytopper/src/services/learningPathGenerator.ts
handoff         handoff/**   — controller only, queued, never parallel
```

**RUNNING CONCURRENTLY RIGHT NOW:** SEC-PAIR PR-1 · C2 · GUARD-1 · HANDOFF-PREP (read-only).
**QUEUED:** SEC-PAIR PR-2, then D2, then the handoff.

### ★ CROSS-LANE DEPENDENCY — TRACKED, NOT LEFT TO THE SUBAGENTS
**D2 deletes `lazytopper/src/pages/Home.tsx`. GUARD-1 repairs
`lazytopper/scripts/ops/agent3_uiux_guard.mjs`, which reads that file via a bare `readFileSync`
with NO existence guard** — so the deletion makes it throw.

**Defused twice over, both verified:** that check already fails today (its first pattern matches
`Home.tsx` **zero** times) and the script is wired into **no** workflow and not into
`test:matrix:all`. **Nothing goes red in either order.**

**But the order still matters for honesty of the record.** Whichever lands first, the other's
report must state the **actual state it found**, not the state its spec predicted. Both subagents
have been told this explicitly. D2 hands the repair to GUARD-1 rather than taking it — that
hand-off is written into both instruction files.

⚠ **Controller-added guard against a second collision:** GUARD-1 may want to wire
`agent3_uiux_guard.mjs` into CI, which would need `quality-gate.yml` (SEC-PAIR PR-1's this wave)
or `lazytopper/package.json` (not on its list). It is instructed to **state the decision and
report it as owed** rather than reach outside its allowlist.

**⚠ THE ONE SEQUENCING CONSTRAINT: SEC-PAIR PR-2 and D2 both touch `lazytopper/src/`.**
**Sequence them. Do not parallelise.** Note they are file-disjoint *within* `src/`
(`services/subscriptionService.ts` vs `pages/` + `services/learningPathGenerator.ts`) — but
file-disjoint is not lane-disjoint once branch protection forces rebases, and `lane-overlap`
reads lanes.

**Everything else above is disjoint and may run concurrently.** C2 and GUARD-1 are parallel-safe
with each other and with SEC-PAIR PR-1.

✔ Historical: the two merged PRs were verified disjoint from their actual changed-file lists, not
by assumption; `lane-overlap` passed on both.

⚠ **Collision intercepted before the first SEC dispatch:** the original spec allowed
*"package.json (root **or lazytopper**)"*. `lazytopper/package.json` is C-lane and was already
modified by #558. Overridden to root-only. The superseding SEC-PAIR spec avoids the manifest
entirely — it wires CI through `quality-gate.yml` instead.

---

## ★ EV-1 FINDINGS — the evidence, and four spec corrections

### The zero-skip proof (all read FROM THE LOG, none confirmed from a report)
| what | result |
|---|---|
| #558 `node --test server/routes/checkSolution.test.cjs` | `# tests 32 / # pass 32 / # fail 0 / # skipped 0 / # todo 0` |
| #558 `objective_dedup_acceptance.mjs` — **the one nobody could run locally** | **RAN.** 16 `✓` lines, 0 skips, `✅ objective-flag + attempt-dedup acceptance PASSED`. Exercises the REAL route module and carries two negative controls. Not `node --test`, so no four-counter block — its zero-skip proof is **structural**. |
| #558 convergence / overlay | `100/100 checks green` · `36/36 checks green` |
| root guard matrix (both runs) | `# tests 190 / # suites 28 / # pass 190 / # fail 0 / # skipped 0` |
| #557 vitest | `Test Files 89 passed (89)` · `Tests 1019 passed (1019)` |
| #557 `LinkPhoneNudge.test.tsx` | present as a **finished** suite — `✓ … (14 tests) 433ms` |

**★ Independent corroboration, not just a re-read:** #558's run (no D1 code) shows 88 files /
1005 tests; #557's shows 89 / 1019 — a delta of **exactly +1 file / +14 tests**. The suite is
proven to have run by arithmetic as well as by its own line.

### ★★ CORRECTION 1 — A CI RUN ID IS BOUND TO A COMMIT, NOT TO A PR
The run this controller handed EV-1 for #558 (`30417690715`) was **not #558's final head** — it
ran `06692469`, after which the branch took trunk-merge commit `24883eca`. EV-1 pulled run
`30418065085` on the real head and re-verified everything green there too.
**Had it trusted the assigned run, the merged head would have been unverified.** This is the
controller's error, caught by the subagent. **Standing rule: derive the run from the head you
actually care about; never carry a run id forward across a rebase or a trunk-merge.**

### ★★ CORRECTION 2 — 6 OF THE 12 SCREENSHOT CELLS ARE ARCHITECTURALLY UNREACHABLE
`useIsDesktop` is `(min-width:1024px)`. Below 1024, `/` redirects to `/browse` (MobileHome); at
≥1024, `/browse` redirects to `/` (DesktopHome). **DesktopHome cannot render at 768 or 390;
MobileHome cannot render at 1024.** Proven by live redirect probes, not by reading code.
The 12-cell matrix in the spec was never satisfiable. **8 shots captured:** the 6 real cells plus
DesktopHome @1440 present/dismissed, recovering the desktop coverage the matrix loses.

### ★ CORRECTION 3 — THE AUTO-SIGN-IN HAZARD DOES NOT APPLY ON A VERCEL PREVIEW
`shouldAutoAnonBootstrap()` requires `import.meta.env.DEV`, false on a Vercel production build.
The preview does **not** auto-sign-in, and the auto-created local user would be ineligible anyway
(`isLocalSession: true`). The standing "the dev app auto-signs-in every automated browser" note
is **dev-server-only** — it does not generalise to previews.

### ★ CORRECTION 4 — SUBAGENTS CANNOT WRITE INTO THE REPORTS DIRECTORY
The harness blocks subagent writes to `C:\Users\Chetan\OneDrive\Desktop\diff\`. **Future dispatch
files must send full reports to the subagent's scratchpad** and return the absolute path.
SEC-1 has been messaged with this correction mid-flight.

### Screenshots — VERDICT: NO LAYOUT DEFECTS
Zero horizontal overflow at 390 / 768 / 1024 / 1440. Buttons never wrapped to a second row.
Dismissed state collapses with **no residual gap** — the `spaced`-as-a-prop decision holds up in
the picture. Nudge box: 362×113 @390, 740×68 @768, 700×68 @1024, 1116×68 @1440. Presence asserted
by `data-testid` + visibility + exact copy, and count=0 in all four dismissed shots — not eyeballed.
Dir: `C:\Users\Chetan\OneDrive\Desktop\diff\screenshots-D1-2026-07-29\` (8 PNGs + 2 metadata JSON,
uncommitted).

### ⚠ The one thing the pictures do NOT prove
`providerIds` came from a **seeded local session**, not Firebase server truth (Firestore returned
`Missing or insufficient permissions` throughout, as expected). The render path, copy and
responsive layout are faithfully exercised; **`hasPhoneLinked` against a real phone-linked
Firebase account is unproven by picture** and rests on the 14 unit tests. A candidate for the
owner's live-verify pass.

---

## ★★ SEC-1 FINDINGS — THE SPEC'S OWN FIX WAS A NO-OP, AND THE DEFECT IS WIDER

### ★★ HEADLINE — the spec's §3 rule change closes NOTHING. Proven on the real emulator.
In `rules_version = '2'` a recursive wildcard matches **zero** or more segments, so the nested
`match /{document=**}` **also matches `/subscriptions/{uid}` itself** — and Firestore **ORs** its
match blocks. Leaving that nested block at `allow write: if isOwner(uid)` **re-grants the exact
write the parent rule denies.**

Two mutations, same suite, both verbatim from the run:
| mutation | result |
|---|---|
| **M1** — the ORIGINAL permissive rule | `# pass 5 # fail 3` — `a client must never be able to write the premium tier / expected: false / actual: true`, `plan premium_monthly must be denied`, `the nested wildcard must carry the same guard` |
| **M2** — **the spec's §3 fix, applied verbatim** | **IDENTICAL: `# pass 5 # fail 3`, same three assertions** |
| the delivered fix | `# pass 8 # fail 0 # skipped 0` |

**M2 is the finding.** A mutation battery run against the *spec* rather than only the code proved
the proposed fix inert before it could ship as a false close. §4(a) suspected a hole; it is real,
and it swallowed the whole remedy.

The delivered fix repeats the guard in the nested block **and** reads via
`request.resource.data.get('tier','')` rather than a bare field read — necessary because the
client writes with `setDoc(..., {merge:true})`, and a bare read of an **absent** field is a rules
*error* that would deny ordinary partial merges. Test 1b is the control that proves it.

### ★★ THE HIGH-SEVERITY DEFECT IS STILL OPEN AFTER THIS PR
**The rules fix alone does not close self-granted premium.** `loadSubscription` reads
**localStorage first**; `hydrateSubscriptionFromCloud` overrides it only when a cloud doc
*exists*. A student with **no** subscription document who sets
`lazytopper.subscription.v1:<uid>` to `{tier:"premium"}` gets premium UI **with Firestore never
consulted.** Closing it needs a `lazytopper/src/` change — **D-lane, forbidden to SEC-1.**
→ `[FU-SEC1-LOCALSTORAGE-PREMIUM]`. **This needs its own PR or the lane's stated goal is unmet.**

### §4(b) "where else?" — answered
All 12 rule collections grant `write: if isOwner(uid)`, but **only `subscriptions` is read as an
entitlement**; the rest are the student's own data. Not touched. Two adjacent finds, reported and
deliberately not fixed:
- **`users/{uid}` has NO rule at all** ⇒ `ensureLearnerAccountMetadata` writes have **always been
  silently denied**, swallowed by a bare `catch {}`. → `[FU-SEC1-USERS-COLLECTION-DENIED]`
- the free daily-practice quota is **localStorage-only**, so no rule can gate it.
  → `[FU-SEC1-DAILY-QUOTA-LOCALSTORAGE]`

### ⛔ WHY BLOCKED — and it is not the emulator
The emulator **can** run in CI (`ubuntu-latest` ships a JVM; `firebase-tools` is already a root
devDep). The blocker is that `@firebase/rules-unit-testing` must be added, which requires
**`pnpm-lock.yaml`** — outside the allowlist, and CI's `--frozen-lockfile` hard-fails without it.
Per CLAUDE.md §4 the subagent stopped rather than proceed. **No silent skip was shipped.**
`pnpm run test:rules` is already added to the root `package.json`.

### ★ TWO GATE DEFECTS FOUND — both are "the guard cannot fire" again
1. **`scope:guard` fails as `[unclassified] firestore.rules`.** The boundary policy contains
   **zero** `firestore` entries, so **no PR touching this file can ever pass it.** The C-lane spec
   said `[unclassified]` was fixed as of #556 and that a new instance was worth reporting — this
   is one. → `[FU-SEC1-SCOPEGUARD-NO-FIRESTORE-LANE]`
2. **`scope:guard` runs with `cwd=lazytopper`**, where `git ls-files --others` returns nothing —
   so an entire **new top-level directory was invisible to it** while modified root files were
   seen. **A new top-level directory can bypass the boundary check today.**
   → `[FU-SEC1-SCOPEGUARD-UNTRACKED-BLINDSPOT]`
3. `firestore-debug.log`, emitted at repo root by every emulator run, is not gitignored.
   → `[FU-SEC1-EMULATOR-LOG-UNIGNORED]`

### Trunk note
SEC-1 derived trunk as `579b6953` — correct at the moment it checked, but that was #557's merge
commit and **#558 landed after it**. Controller re-derived: trunk is `5b4070ad`. Both its base
(`eb88bce0`) and its derivation are now behind; the rebase is owed either way.

---

## ★★ SPEC-AUTHOR ERRORS CAUGHT BY EVIDENCE — carry these into the handoff

*A spec author's error caught by evidence is worth more in the record than a clean run.* Both of
these are the cofounder's own, self-reported.

1. **The SEC-1 §3 rules fix was a complete no-op.** The spec's own §4(a) told the subagent to check
   the nested wildcard, and the fix it then prescribed was swallowed whole by exactly that hole.
   **The only reason this is known is that the mutation against the proposed fix returned output
   IDENTICAL to the original permissive rule** — `# pass 5 # fail 3`, same three assertions.
   ⇒ **Mutation-verify the SPEC's proposed fix, not only the code.**
2. **The 12-cell screenshot matrix was never satisfiable.** `useIsDesktop` is `(min-width:1024px)`,
   so DesktopHome cannot render below 1024 and MobileHome cannot render at 1024. Six cells were
   architecturally impossible. EV-1 proved it with **live redirect probes** rather than submitting
   six pictures of nothing.
3. **(Controller's own)** A CI run id assigned from an earlier head verified a tree that was not
   the one being merged. Caught by EV-1, which re-derived the run on the real head.

---

## ★ C2 FINDINGS — three schemas, and two claims that cannot support their own weight

### THREE parsers ⇒ THREE schemas. C1's report said "two schemas, not one." It was still one short.
Gates: `Array.isArray(p.annotatedSteps)` · `if (!parsed)` · `Array.isArray(p.results)`.
**Schema C (worksheet) deliberately does NOT require `annotatedSteps`** — a `couldNotRead:true`
entry legitimately has none. **Reusing Schema A there would have forced the model to fabricate
steps for an unreadable answer** — a CLAUDE.md §5 "no invented content" breach shipped as a
performance optimisation.

### ★ F1 — THE COST CLAIM IS OVERSTATED, and it is written down elsewhere as fact
The dominant parse-miss cause documented in the grader itself is **truncation at
`maxOutputTokens`**, which constrained decoding **does not prevent**. This PR can only reduce the
shape-variance share. ⇒ **The `$2.95 / 48%` line in `LazyTopper_Cost_Pricing_Analysis_v1_1.md` is
NOT validated by this PR** and should not be cited as if it were. The **quality** argument stands
and is the sound reason to ship. → `[FU-C2-TRUNCATION-VS-SHAPE-SPLIT]`

### ★★ F2 — THE METRIC THE SPEC ASKED FOR A BASELINE ON CANNOT OBSERVE THIS CHANGE
`retryCount` counts `attempts > 1` **inside** a single `callGemini` (429 / mime / fallback only).
The grader's parse-miss retry is a **second `callGemini` invocation**, so it emits two records each
`attempts:1, retry:false`. **A before/after read will show no signal whatever happens.** The
subagent correctly did not add the counter (§5 said report, don't tune).
→ `[FU-C2-PARSE-MISS-NOT-COUNTED]`

### ★★ F3 — THE SPEC'S STATED MUTATION TARGET WAS INERT (the fourth this wave)
§2 said tightening the schema would redden C1's §5 assertions. **It does not** — that harness mocks
`callGemini`, so no schema ever touches its payloads, and C1's §5 pins the **parser**, which a
schema change cannot affect. **Had this been taken on trust, the lane's central guarantee would
have been unenforced while appearing enforced.** The subagent built the real gate: §5's own accepted
payloads re-run *through* the schema by a validator, with a control proving the validator can fail,
plus an anti-tightening sweep that **already caught a `required` it had missed itself.**

### F4 — `tutor.cjs` deliberately left unconstrained
It sends no `responseMimeType`, its reply is consumed as **prose**, and its only structure is
sentinels *stripped by regex*. Constraining it would mean deriving a schema from the prompt
(forbidden), flattening teaching prose into a JSON string, and breaking both extractors. It has no
parse-miss retry to fix. **A reported non-change with reasoning, exactly as the spec allowed.**

### ⚠ Near-miss worth keeping
A cosmetic parameter rename left two dangling references inside `runWithFallback` — **a
ReferenceError on every Gemini call.** Caught by the existing 23-test suite within one run. The
existing tests earned their keep on a change that looked cosmetic.

---

## ★★ SEC-2 FINDINGS — Routes B and C closed, and a self-inflicted silent no-op caught first

Worktree `C:/Projects/LT-worktrees/sec2-entitlement`, branch `feat/sec2-entitlement-not-forgeable`.
5 files, **1 declared deviation**. All four required mutations RED **on a real emulator** (a portable
Temurin 21 JRE was downloaded to run it — no Java on the box), plus **three more isolating one clause
each**. Rules `27 passed (27)`, client `27 passed (27)`, root matrix `190/190`.
Report: `report-sec2-entitlement-not-forgeable-2026-07-29.md`.

### ★★ THE CATCH THAT WAS NOT ASKED FOR — the fix would have silently broken ALL cloud writes
Applying the "where else?" rule, SEC-2 found that `saveCloud` **spreads `status`** into its payload.
That spread would have sent `trialEndDate` and a client-chosen `trialStartDate` — **both refused by
the new rules** — so **every cloud write would have failed SILENTLY inside the existing `catch {}`.**
The security fix would have quietly disabled subscription persistence. `saveCloud` now builds its
payload **field by field**, and tests 8a–8c pin the shape so the regression cannot land quietly.
⇒ **DOCTRINE — carry verbatim into the handoff:**
> **TIGHTENING A WRITE RULE BREAKS EVERY OVER-SENDING WRITER, SILENTLY.** Before changing what a
> store accepts, **enumerate every writer and check what each actually sends — not what it is
> supposed to send.** A spread into a payload sends fields nobody listed.

### ★★ THE DEVIATION IS THE FINDING — a test fixture that encoded the defect
`useSubscription.autotrial.test.ts` had `activeTrial(5) = {start: now, end: now+5d}`, asserting
`daysLeft === 5`. Under a **derived** end that is 7, so it went RED: *"expected 7 to be 5."*
★ **That fixture describes a 5-day trial that began today — a state the product cannot produce. It
was only expressible BECAUSE the length was a stored, writable field.** The fixture encoded the very
defect being closed. The helper now derives the start; intent and assertion preserved. Test-only,
1 file, zero product code, outside D2's tree. **Needs owner sign-off.**

### Other spec corrections
- **The field is `trialStartDate`, not `trialStartedAt`.** Renaming would have forced edits to
  `useSubscription.ts` and `lib/shared-data/src/types.ts`, both outside the allowlist. The existing
  field was pinned instead — **the security property is that the start is server-set and immutable;
  its name is not load-bearing.**
- **`trialEndDate` slot KEPT on the type** (`@deprecated`) — deleting it breaks compilation of two
  out-of-allowlist test files. Removed from every read and write; **rules additionally forbid
  introducing or moving it.** Belt-and-braces because *"the field being unread is a property of code
  that a future regression can undo silently, whereas the rule is enforced server-side."*
- **`pricing.ts` is NOT the right home for `TRIAL_DAYS`** — it is the pricing *display* surface,
  pinned by `pricing.guard.test.ts`, and outside the allowlist. The constant stays beside the only
  code that derives an expiry from it.
- **`loadCloud` returns `error`, not `absent`, when `firestoreDb` is null.** *"Absent is a positive
  claim and must never be inferred from a read that never ran."*

### ★ THE PRE-HYDRATION FLASH IS A DECISION, NOT AN ACCIDENT
`loadSubscription` stays synchronous and cache-first, so a forged localStorage entitlement **is**
briefly visible before hydration. Test 7 pins it **in both directions**: pre-hydration reads premium,
the same mount's hydration resolves free, and **the cache is EVICTED so the flash cannot recur.**
The alternative — everyone starts free — blanks real subscribers on every mount and breaks the
offline case. ★ And hydration on `absent` writes **nothing** to the cloud: *"uploading the cache
would launder a forgery into the record of truth."*

### ⚠ HONEST LIMITS THE SUBAGENT DECLARED RATHER THAN PAPERED OVER
- **Migration: PARTIAL VERIFICATION.** Production documents could not be enumerated without Console
  or Admin credentials, and **no claim was made about a check that was not run.** What *was* verified:
  `subscriptionService.ts` is the **sole writer** to `subscriptions` anywhere in the repo.
- **Mutation contamination, self-reported:** three rules variants also drop the `trialEndDate` clause,
  so test 13 reddens under them too — *"contamination, not evidence."* Each clause is pinned by the
  tests only it breaks.
- **The 7-day control is proven LINK BY LINK, not as one live run** ⇒ **owner live-verify owed.**

### ⚠ scope:guard — CONFIRMATION, plus one real gotcha
`firestore.rules` classified as `[firestore]`, not `[unclassified]` — GUARD-1's lane works.
**But it FAILS under `--mode product`**; `--mode mixed` is the correct invocation for a
product+firestore PR. Worth knowing before the next mixed lane.

---

## ★★ D2 FINDINGS — the spec's central safety claim was FALSE, and one fixture was missed

Worktree `C:/Projects/LT-worktrees/d2-client-cleanup`, branch `feat/desktop-pr-d2-client-cleanup`.
7 files, **1 declared deviation**. Mutation RED proven. Report:
`report-d2-client-cleanup-2026-07-29.md`.

### ★★ "Two verified mitigations mean nothing goes red" — FALSE
`lazytopper/src/config/pricing.guard.test.ts` asserts the price walk **reaches**
`src/pages/Home.tsx`. Deleting the file **fails it, and CI runs full vitest** — a hard CI-red that
**neither the spec nor GUARD-1 mentioned.** The spec analysed only the ops fixtures and concluded
the deletion was safe. It was not.
⇒ **A deadness analysis that enumerates only the fixtures you expected is not an enumeration.**

### ★★ GUARD-1 FIXED ONE FIXTURE, NOT BOTH — "WHERE ELSE?" again
`lazytopper/scripts/ops/ux_focus_acceptance.mjs:25` **still** reads `src/pages/Home.tsx` via a bare
`readText` with no existence guard. D2 confirmed GUARD-1's repair of `agent3_uiux_guard.mjs` is real
— and then found the second one, **corroborated independently by
`handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md:469`, which names BOTH files.** The record already knew.
**Impact today: zero** — no npm script, no workflow, no invoker anywhere.
→ `[FU-UX-FOCUS-ACCEPTANCE-HOME-FIXTURE]`, handed to GUARD-1's successor.

### ★ "zero importers" — FALSE
`Home.priceConsistency.test.tsx` imports it. **PR-B1 (#548), four commits before trunk, actively
updated Home.tsx's prices and wrote that 246-line suite.** A file can be unrouted and still be
under active maintenance by a guard that scans all of `src/`.

### ★ Test #4 named a suite that does not exist
"The existing `WeakAreaPracticePage` suite still passes" — **there was no existing suite** for
`WeakAreaPracticePage` or `learningPathGenerator`. D2 created one.

### ⚠ DECLARED DEVIATION — needs owner confirmation
`lazytopper/src/config/pricing.guard.test.ts` (+8/−2), **forced by the deletion**. The probe was
**repointed** to `src/pages/desktop/DesktopHome.tsx` rather than dropped — the probe's job is proving
the walk **recurses**, and Home.tsx sat directly in `src/pages/` beside `PricingPage.tsx`, so
deleting the line would leave no probe below the first level. ★ **That preserves the test's PURPOSE
rather than its letter** — dropping it would have left a green test that no longer checks recursion,
which is this wave's whole failure class. Revertible to a plain deletion on request.

### ⚠ A TRAP FOR THE LATER DEAD-CODE SWEEP
`scripts/ops/llm_path_audit_acceptance.mjs:41` **is CI-gated** and requires
`rg("generateMoreLikeThis|MENTOR_ENDPOINT") > 0`. Safe today because `generateMoreLikeThis` is live
and carries the check alone. **The sweep may delete `MENTOR_ENDPOINT` — but must not delete both.**

### NEW FU — a gate that matches strings and comments as if they were imports
`[FU-ENTITLEMENT-GATE-MATCHES-STRING-LITERALS]` — `entitlementGating.test.ts:139` tests its import
regex against **raw file text**, so it matches a module path inside a string literal *or a comment*.
It flagged D2's new test twice for `TopicHubHome`: once from a fixture string, **then again from the
comment explaining the first.** Also needs a path-boundary anchor so `PracticePage` cannot match
`WeakAreaPracticePage`. Blast radius: every future test that quotes a module path.

**Live-verify: NOT needed** — no auth/grading/persistence/routing round-trip changed; the change
removes a request that could only ever fail, and the rendered result is byte-identical to today's
fallback. **`scope:guard` (one day old) worked correctly** — `inspected=7`, classified all 7
including the untracked new test.

---

## ★ TWO CORRECTIONS OWED TO THE WRITTEN RECORD — the handoff PR must carry both

**1 · `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` states a saving this PR cannot deliver.**
It attributes **"$2.95 / 48%"** to `responseSchema`. The dominant parse-miss cause is **truncation
at `maxOutputTokens`**, which constrained decoding **does not prevent**. **Correct the line: the
saving is the shape-variance share only, and it is unquantified.**
★ **State explicitly, in the same breath, that the QUALITY argument stands and is the sound reason
to ship** — otherwise the correction reads as a reason not to. This is a live-document edit owed in
the handoff PR (the file sits in `handoff/`, which is the controller's lane and goes last).

**2 · `[FU-C2-PARSE-MISS-NOT-COUNTED]` is the metric that must exist before any parse-miss claim can
be tested.** `retryCount` counts `attempts > 1` inside one `callGemini`; the grader's parse-miss
retry is a **second invocation**, emitting two records each `attempts:1, retry:false`. Log it as a
prerequisite, not a nice-to-have — **without it, no before/after can be honest.**

---

## ★★ HANDOFF — THE SIX THINGS TO CARRY VERBATIM (owner-specified)

Opened by the **controller**, after D2 and SEC-2 are on trunk **and the deploy is Console-confirmed.**

1. **GUARD-1's generalisation** — *"a guard's output must name its subject, not just its verdict…
   a check that cannot be shown to have looked, and to be capable of failing, is not coverage — it
   is the appearance of coverage, which is worse, because it stops anyone looking."*
2. **A CI RUN ID IS BOUND TO A COMMIT, NOT A PR.**
3. **`[FU-DEPLOY-FROM-STALE-CHECKOUT]` in full**, with the **two-word difference** between
   *"skipping upload"* and *"uploading rules"*.
4. **The tightening-a-write-rule generalisation** (see the SEC-2 `saveCloud` finding).
5. **The autotrial fixture that encoded the defect** — `activeTrial(5) = {start: now, end: now+5d}`
   asserting `daysLeft === 5`: a five-day trial that began today, a state the product cannot produce,
   **expressible only because the length was a stored writable field.** ★ The cleanest possible proof
   SEC-2 fixed the right thing.
6. **The count of proposed mechanisms proven inert this wave** — with the note that **several were
   the spec author's own**, self-reported.

⚠ Plus the two corrections owed to the written record (below) and the `[FU-GUARD-1-A/B]` lane (O11).

---

## HANDOFF MATERIAL — collected, with three defects found in the record itself

**Source pack:** `C:\Users\Chetan\OneDrive\Desktop\diff\WAVE3_HANDOFF_SOURCE_PACK-2026-07-29.md`
**Companion:** `C:\Users\Chetan\OneDrive\Desktop\diff\LANE_C_FU_BODIES-2026-07-29.md`

⚠ The pack was written to a **session scratchpad**, which does not survive the session. It has
been **copied to the reports directory** — byte count verified identical. Work from the copy.

### ✅ GAP CLOSED — three FU bodies that were nearly lost
HANDOFF-PREP reported `[FU-FLEX-TIER-UNUSABLE]`, `[FU-MODEL-SWITCH-NOT-A-LEVER]` and
`[FU-2.5-FLASH-DEPRECATION-UNVERIFIED]` as **`BODY NOT FOUND`**: their source,
`AGENT_C_Wave3_server.md`, **does not exist on disk**, and the ids appear **zero times on trunk**.
It searched `Desktop/**`, `Downloads` and the git index, and **correctly refused to reconstruct
them** — the standing rule is that a plausible-but-wrong FU is harder to detect than a missing one.

**Resolved by the controller:** that spec was supplied in-session, so the bodies were transcribed
**verbatim** into `LANE_C_FU_BODIES-2026-07-29.md`. Transcription, not reconstruction; provenance
and the "if the real file turns up, it wins" caveat are recorded in that file.

### ⚠ TWO DEFECTS IN THE FU RECORD — fix while writing the handoff
1. **`[FU-LANDINGMEMORY-HASPROFILE-DEAD-KEY]` is a DANGLING CITATION.** A **merged source file on
   trunk** cites it (`LinkPhoneNudge.tsx`, by symbol) while it has **no entry on the FU board**.
   Its only body is in the Lane D payload. **The handoff must create the board entry**, or trunk
   permanently references an FU that does not exist.
2. **`[FU-DEAD-AI-LEARNING-PATH]` has TWO bodies.** The Lane D payload's `NOTE:` sentence — that
   `callMentor` has a second live caller in `DailyMixPage` — **is the claim the owner corrected**
   and is false. Both texts sit side by side at §6.4 of the pack so the exact sentence to drop is
   visible. **Do not merge the two bodies; drop that sentence.**

---

## ★★ THE FAILURE CLASS THIS WAVE KEEPS FINDING — a guard that reports success on work it did not inspect

**Now SIX instances — and GUARD-1 corrected two of the descriptions while adding a new one.**
1. A `FORBIDDEN` path entry missing its prefix — **could never match.**
2. `poolOptions.threads` under a `forks` pool — **the key was ignored.**
3. `agent3_uiux_guard` — ⚠ **CORRECTED: it was never "silently passing."** It exits 1 and scored
   **3/7 on trunk**. The silence is that **nothing runs it** — RED and unread through three
   redesigns. A different failure, not the one we recorded.
4. `scope:guard`'s `cwd` — ⚠ **CORRECTED and NARROWER: `git diff --name-only` was ALREADY
   root-framed and already fixed ([D47]/[D41]).** Only `git ls-files --others` is cwd-scoped, so
   only **untracked** files outside `lazytopper/` were unseen. **The spec's literal remedy would
   have been a no-op** — a green suite over an open hole.
5. The SEC-1 rules fix that *read* as a restriction while a permissive block still matched.
6. ★ **NEW, found by GUARD-1: `repo_boundary_acceptance.mjs`.** Runs `git ls-files` with
   `cwd=lazytopper/` — auditing **1 of 13 top-level trees** — *and* keeps a private **stale copy**
   of `classifyFile` missing `apiServer`/`docs`. Either bug alone shows red; **the blind spot
   masked the stale copy.** It reported green on a policy it never fully evaluated. Also absent
   from `test:matrix:all`. Was **RED on trunk (2 failed/5)**.

**And a seventh caught by the new meta-assertion:** `trends_cta_pressure_within_contract` asserts
`count <= 12` and was **passing with count = 0** — a ceiling check passing on nothing.

### ★★ THE DOCTRINE — GUARD-1's generalisation, in its words. Carry VERBATIM into the handoff.

> **A guard's output must name its subject, not just its verdict.** Every check states what it
> inspected — which files, which patterns, how many times each fired — and any check whose subject
> count or match count is **zero is a FAILURE, never a pass**. "Nothing to object to" and "nothing
> looked at" are the same output otherwise, and a guard is a device for telling those two apart.
>
> - **A guard may not verify itself against its own input.** `classified === all.length` proves
>   nothing when the bug shrank `all`. Self-checks need truth from *outside* the thing under test.
> - **Coverage is proven by the negative case.** A green run establishes only that the guard did
>   not object. Ship the mutation that makes it red, or the guard is decorative.
> - **A guard nothing runs is not a guard.** Reachability is part of the check, not packaging
>   around it.
>
> One line: **a check that cannot be shown to have looked, and to be capable of failing, is not
> coverage — it is the appearance of coverage, which is worse, because it stops anyone looking.**

### ★ THE CROSS-CHECK THAT WORKED
The controller relayed SEC-PAIR's `scope:guard` finding to GUARD-1 **with an explicit instruction
not to trust it**. GUARD-1 then proved it **half wrong** — `git diff` was already fixed. Had the
relay been accepted as established, GUARD-1 would have "fixed" a call path that was never broken
and shipped a green suite over the real hole. **Relay evidence between lanes; never relay it as
settled.**

---

## OWNER RULINGS RECEIVED — and how each is applied

| Ruling | Applied |
|---|---|
| **1 · Lockfile APPROVED** in the subagent's recommended shape — `pnpm-lock.yaml` + a **dedicated emulator step** in `quality-gate.yml`; **NOT** chained into `scripts/` `test:matrix:all`, which would couple an emulator dependency into the content-guard suite | In SEC-PAIR PR-1's allowlist. The subagent was right to refuse to ship the test unwired. |
| **2 · The localStorage fix is PR-2 of this lane, not a follow-up.** Owner verified the finding personally: `loadSubscription` reads ONLY localStorage, and `loadCloud` returns `null` for BOTH "no document" and "read failed" — collapsing those two is what created the hole | SEC-PAIR PR-2. Principle: *localStorage may CACHE a verified tier, never GRANT one.* |
| **3 · Deploy is the owner's.** `firebase deploy --only firestore:rules` after merge | ★ **The lane does NOT close in this file until the owner confirms the deploy has run.** A merged rules file never deployed is a silent no-op at the infrastructure layer — the one place no gate can see. |
| **4 · scope:guard — add the firestore lane, but the `cwd` finding is bigger and gets its own lane (GUARD-1)** | A boundary guard running with `cwd=lazytopper` cannot see a new top-level directory **at all** — a blind spot in the mechanism, same shape as the FORBIDDEN entry that could never match. GUARD-1 must carry a **mutation-verified** test proving a file OUTSIDE `lazytopper/` is classified. |

---

## DECISIONS MADE THIS WAVE (controller)

- **The old SEC-1 worktree is abandoned, not rebased.** Stale base, and its fix was proven inert.
- **SEC-1 may not touch `lazytopper/package.json`**, and its test lives outside `lazytopper/**`.
  Two open PRs on one manifest is the exact collision this role exists to prevent.
- **`firestore.rules` is explicitly scoped to SEC-1**, overriding CLAUDE.md §4's global ban.
  Recorded so no reviewer flags it as a scope breach.
- **SEC-1 finishes on base `eb88bce0` and rebases onto `5b4070ad` before merge** — its lane is
  disjoint from everything that landed, so mid-build rebasing would cost more than it buys.
- **Merges are sequenced, not batched.** Branch protection requires up-to-date branches; every
  merge forces the next PR to rebase and re-run CI (~5 min).
- **Never carry a CI run id across a rebase or trunk-merge** — see Correction 1.
- **Dispatch files now point subagent reports at the scratchpad**, not the reports directory.
- **D2a's ops-guard repair is not Lane D's.** Agent D correctly refused to write in the C-lane.

---

## FU ENTRIES COLLECTED

Bodies live in the payload files on disk — **never reconstruct an FU body from its ID.**

From `LANE_D_FU_PAYLOAD-2026-07-29.md`:
- `[FU-LANDINGMEMORY-HASPROFILE-DEAD-KEY]` — ★ NEW. `hasProfileFlag()` reads bare keys nothing
  writes; permanently false. Second instance of the class already cured in `Login.tsx`. Needs its
  own scoped PR with screenshots — it changes behaviour on two live Home pages.
- `[FU-NO-RETURNING-SESSION-SIGNAL]` — ★ NEW. No returning-visit signal exists at all. Add once,
  as a shared helper, not per-feature.
- `[FU-RETIRE-LEGACY-HOME]` — fabricated social proof in an unrouted file; ops-fixture pin real
  but defused twice over.
- `[FU-DEAD-AI-LEARNING-PATH]` — ⚠ the payload's `callMentor` second-caller claim was **corrected
  by the owner**; use the handover §4, not the payload body.
- `[FU-LOGIN-STALE-RECAPTCHA-COMMENTS]` — confirmed, count of two exact.

From `AGENT_C_Wave3_server.md` (verbatim bodies in the spec — copy, never rewrite):
- `[FU-EFF-THINKING-BUDGET]` · `[FU-FLEX-TIER-UNUSABLE]` · `[FU-MODEL-SWITCH-NOT-A-LEVER]` ·
  `[FU-2.5-FLASH-DEPRECATION-UNVERIFIED]`

From SEC-PAIR PR-1 (bodies in `report-sec1rev-firestore-rules-2026-07-29.md`):
- **`[FU-TRIAL-ENDDATE-CLIENT-FORGEABLE]`** — ★★ Route C. Pinned as an explicit **labelled
  characterisation test** rather than a fragile guard that would look like protection.
- `[FU-PREMIUMSINCE-UNREAD]` — `premiumSince` is read by no production code, only test fixtures;
  the rule deliberately does not constrain it (breakage risk, zero security).
- `[FU-SUBSCRIPTION-CLIENT-WRITABLE]` — existing; PR-1 closes only its Firestore half.

New, from the commit lanes:
- **`[FU-GITIGNORE-SHADOWS-TRACKED-POLICY]`** — `lazytopper/docs/project_memory/` is matched by root
  `.gitignore`, so plain `git add <path>` **refuses `repo_boundary_policy.json` even though the file
  is tracked**. `git add -u` works (ignore rules do not apply to tracked paths). Pre-existing, not
  introduced by GUARD-1. **This will bite the next agent who edits the boundary policy** — and it
  fails as a refusal, which at least is loud, unlike the silent class this wave has been chasing.

From C2 (bodies in `report-c2-response-schema-2026-07-29.md`):
- **`[FU-C2-MISTAKETYPE-NULL-LIVE-VERIFY]`** — C2 changes what the model is asked to return, so it
  **owes an owner live-verify**. Agent C's report §7 predicted this.
- `[FU-C2-TRUNCATION-VS-SHAPE-SPLIT]` — the parse-miss cause splits into truncation (unaffected by
  a schema) and shape variance (fixed by it); the cost projection conflates them.
- `[FU-C2-PARSE-MISS-NOT-COUNTED]` — the grader's parse-miss retry is invisible to `retryCount`.

From GUARD-1 (bodies in `report-guard1-scope-blind-spot-2026-07-29.md`):
- `[FU-GUARD-1-A]` *(High)* — `repo_boundary_acceptance.mjs`: enumerate from git root, import the
  real `classifyFile` instead of the drifted private copy, wire into the matrix.
- `[FU-GUARD-1-B]` *(High)* — wire the new blindspot acceptance suite into CI.
- `[FU-GUARD-1-C]` *(Medium)* — agent3: repair three rotted checks + the zero-passing ceiling, then
  wire green.
- `[FU-GUARD-1-D]` *(Medium, latent)* — **frame collision**: root vs `lazytopper/` paths are
  indistinguishable after `toPolicyFrame` for `docs/`, `scripts/`, `package.json`, `tsconfig.json`,
  `.github/`, `pnpm-lock.yaml`. Those six classify correctly **by accident**. Needs frame-tagged rules.
- `[FU-GUARD-1-E]` — `scope:guard` stays out of CI by design (§6a); the new acceptance suite has no
  such limit and would have caught this.

New, owed to the handoff:
- **`[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`** — the nudge's phone-linked suppression path is proven
  by unit test and by seeded session, never against a real Firebase phone-linked account.
- **`[FU-HOME-BREAKPOINT-EXCLUSIVITY]`** — DesktopHome and MobileHome are mutually unreachable
  across the 1024px boundary by redirect. Any future "both Home pages at width W" requirement is
  unsatisfiable for half its cells; write specs against the breakpoint, not against a grid.
From SEC-1 (bodies in the subagent's return message — **the harness blocked its report file**, so
that message is the only source; carry it into the handoff before it is lost):
- **`[FU-SEC1-LOCALSTORAGE-PREMIUM]`** — ★★ the lane's stated goal is **not met by the rules fix
  alone**; premium is still self-grantable via localStorage. Needs a D-lane PR.
- `[FU-SEC1-CI-LOCKFILE]` — the rules test cannot reach CI without `pnpm-lock.yaml`.
- `[FU-SEC1-TRIAL-SELF-EXTEND]` — `trialEndDate` is an ISO string; a rules-level bound is awkward.
  Logged deliberately, not attempted.
- `[FU-SEC1-USERS-COLLECTION-DENIED]` — `users/{uid}` has no rule; writes always silently denied.
- `[FU-SEC1-SCOPEGUARD-NO-FIRESTORE-LANE]` — no PR touching `firestore.rules` can pass scope:guard.
- `[FU-SEC1-SCOPEGUARD-UNTRACKED-BLINDSPOT]` — a new top-level directory is invisible to scope:guard.
- `[FU-SEC1-EMULATOR-LOG-UNIGNORED]` — `firestore-debug.log` not gitignored.
- `[FU-SEC1-DAILY-QUOTA-LOCALSTORAGE]` — free daily quota is localStorage-only; no rule can gate it.

---

## FINDINGS THAT CONTRADICTED A SPEC (what this wave learned)

- **C1:** the spec allowlisted ONE gate banning the grader. There were **two**.
- **C1:** "retry-once + 400-token headroom" was **two unrelated mechanisms** in two handlers.
- **C1:** "retry fires in both graders" is false — `normaliseStructuredResult` is a pure
  synchronous normaliser with no network path.
- **C1:** a mutation that ran GREEN was the **mutation's** bug, not the test's.
- **D1:** the returning-session signal the spec assumed existed **does not exist**.
- **D1/owner:** Daily Mix / Daily Mission / Study Plan / Dashboard are RETIRED — a reference to
  them is **evidence of deadness, never liveness.** Standing doctrine.
- **D2a:** an ops guard whose pattern matches **zero** times has been silently passing on nothing.
- **EV-1:** a CI run id is bound to a commit, not a PR (Correction 1).
- **EV-1:** the 12-cell screenshot matrix was never satisfiable (Correction 2).
- **EV-1:** the auto-sign-in hazard is dev-server-only (Correction 3).

---

## BLOCKED / OWNER DECISIONS OWED

### ▶ LIVE — what is actually owed right now

**O1 · ✅ DONE — Console confirmed, SEC-PAIR PR-1 closed.**
**O2 · ✅ DONE — C2 live-verified on production, closed.**

**O8 · ★★ TWO COMMITS AWAITING APPROVAL, EACH WITH ONE DECLARED TEST-ONLY DEVIATION.**
Both lanes are built, green, uncommitted, unpushed. Both deviations are **forced by the change**,
**test-only**, **zero product code**, and **mutually disjoint**.
- **D2** — `lazytopper/src/config/pricing.guard.test.ts` (+8/−2). Probe **repointed** to
  `DesktopHome.tsx` rather than dropped, to keep the probe proving the walk **recurses**.
- **SEC-2** — `lazytopper/src/hooks/useSubscription.autotrial.test.ts` (+11/−3). Fixture helper now
  **derives** the trial start; ★ the old fixture encoded a state the product cannot produce.
**Controller recommendation: accept both.** In each case the alternative — dropping the probe,
honouring the stored end — leaves a green test that no longer checks the thing it names, which is
this wave's entire failure class.

**O9 · ★ SEC-2 OWES AN OWNER LIVE-VERIFY.** The 7-day trial control is proven **link by link, not as
one live run**, and it touches auth + persistence. Sign in as a fresh student → click Start trial →
confirm in the Console that the doc carries a **Timestamp** `trialStartDate` → reload and confirm the
trial still reads active.

**O10 · PUSH ORDER — EXECUTED.** D2 pushed first as **#562** (`Lane Overlap → success`, so no
collision), then SEC-2's commit dispatched to a **fresh** agent (its own was at ~19%, below the
floor), given the captured report on disk rather than asked to rebuild. **Merge #562 first.**

**O13 · ⚠ A CONTROLLER ASSUMPTION THAT WAS WRONG — recorded because the same standard applies to me.**
I serialised the D2 and SEC-2 **pushes** on the belief that two open PRs in `lazytopper/src/` would
trip `lane-overlap`. **They did not.** `#562` and `#563` were open simultaneously and **lane-overlap
passed on both** — it evidently keys on genuine file collision, not on a shared tree.
⇒ **Push serialisation was not required on that ground.** It cost wall-clock, not correctness.
⇒ **Merge sequencing IS still required — by branch protection** (each merge forces the next branch
to update and re-run CI), which is a different mechanism from the one I cited.
★ The earlier scheduling rule stands but for a narrower reason: *subagents stopping before commit
makes build-parallelism free; **merge** order is what needs sequencing.*

**O12 · ⚠ A PRECISION NOTE D2 VOLUNTEERED, worth keeping as method.** It had called the unchanged
vitest total of 1017 "coincidental"; it then corrected itself: the deletion happened **before** its
first full local run, so **there is no pre-deletion baseline in evidence.** The number is consistent
across its runs and CI — it is **not** proof that the deleted suite's tests were replaced
one-for-one. ⇒ **A number that agrees with itself is not a measurement.** Nobody asked for that
correction; it qualified its own claim after the fact.

**O6 · ★★ THE DEPLOY LATCH — THIRD TIME, AND IT HAS ALREADY BITTEN ONCE. Exact procedure:**
```
1. git pull   in whatever checkout you deploy from
2. GREP the local firestore.rules for `trialStartImmutable` AND `allow delete: if false`
3. npx firebase-tools deploy --only firestore:rules --project lazzyy-topper
4. Confirm "uploading rules", NOT "skipping upload"
5. Read the deployed rules in the FIREBASE CONSOLE, not the repo file
```
★ **Step 2 is not optional.** Today a deploy from a six-commit-stale checkout printed
*"already up to date, skipping upload"* then *"Deploy complete!"* and shipped nothing.
★ **ROUTE C STAYS OPEN IN PRODUCTION UNTIL STEP 5 CONFIRMS.** Do not close SEC-2 on a merge, **or
even on a deploy** — only on the Console reading.
⇒ **The two-word difference between `skipping upload` and `uploading rules` is the whole signal.**

---

## ★★ SEC-2's LIVE-VERIFY CANNOT HAPPEN BEFORE MERGE — and that changes the risk

**Firestore rules deploy PROJECT-WIDE, not per-preview.** There is no environment where SEC-2's
rules can be exercised against the real client before they are live. So the sequence is necessarily:

> **merge → deploy → verify → roll back if wrong** — **not** verify-then-merge.

**Recorded so nobody reads the live-verify as a pre-merge gate that was skipped.** It was not
skipped; it was **unavailable**.

### ★ WHICH IS WHY THE EMULATOR PROOF CARRIES MORE WEIGHT HERE THAN USUAL
**27/27 rules tests plus four mutations RED on a real emulator is the pre-merge evidence, and it is
the ONLY pre-merge evidence available.** It has to be enough — and it is. Stating that explicitly
rather than letting it read as a formality: this is the one lane where the mutation battery is not
belt-and-braces over a live check, it is the check.

### ★★ A ROLLBACK ARTEFACT MUST BE PROVEN TO CONTAIN THE OLD STATE — caught before deploying
The owner's rollback backup was taken **after the merge had already been pulled**, so it captured
the **NEW** rules — **a useless rollback that looked like insurance.** Caught before deploying and
replaced with `git show <prev-sha>:firestore.rules`.

> **DOCTRINE — carry verbatim:** *A rollback artefact must be PROVEN to contain the old state.*
> **Grep it for the thing you are about to add; if the pattern is present, you backed up the wrong
> version.** Git is a better source than the working tree, because the working tree may already
> have moved.

⇒ Same family as everything else this wave: an artefact that **looked** like protection while
containing nothing of the kind — and only a **check of its contents** could tell the difference.

### ★ ROLLBACK PATH — know it BEFORE deploying
**Firebase Console → Firestore → Rules → the version dropdown.** A previous ruleset can be
republished **in one click**. If trial activation breaks after deploy, **that is the immediate
action — not a hotfix PR.**

### ⚠ THE FAILURE TO WATCH: A NEW STUDENT CANNOT START A TRIAL
That is the one thing the tightened rule could break **for every user at once** — and it is exactly
what the `saveCloud` finding was about. A write refused by a stricter rule dies inside an existing
`catch {}` with nothing on screen and nothing in a gate. Its rules half needs
`firebase deploy --only firestore:rules` after merge — run from a **PULLED** checkout, with the
local file **grepped** for the expected new content first, and confirmed in the **Console**.
**SEC-2 does not close on a merge.**

**O7 · ⚠ PUSH ORDER IS SERIALISED, BUILD ORDER IS NOT.** D2 and SEC-2 are both building in
`lazytopper/src/` and are **file-disjoint**, but two open PRs in one lane can trip `lane-overlap`.
Both are under instruction to **stop before commit AND before push**. The controller releases them
one at a time. ⇒ **Subagents stopping before commit makes build-parallelism free; only the push and
merge need sequencing.** Worth keeping as a scheduling rule.

**O3 · Correct the cost line** in `handoff/LazyTopper_Cost_Pricing_Analysis_v1_1.md` — owed in the
handoff PR, which is mine. `$2.95 / 48%` is not attributable to `responseSchema`; the saving is the
shape-variance share only, unquantified. **State the quality argument in the same breath.**

**O4 · ✅ Route C** is carried by SEC-2 — built and approved. Nothing is waiting on the cofounder.

**O11 · ★ A LANE NOBODY OWNS — QUEUE IT AFTER THE HANDOFF, and flag it in `NEXT_ACTION.md` so it
does not fall through a second time.** `[FU-GUARD-1-A]` and `[FU-GUARD-1-B]` came back **inside**
GUARD-1's report and went to the FU board rather than the queue. **Both are HIGH**, and both need
`lazytopper/package.json`, which **no lane's allowlist covered** — which is exactly how they slipped.
- **FU-A** — `repo_boundary_acceptance.mjs` still enumerates from `cwd=lazytopper` and keeps a stale
  private copy of `classifyFile`. **It audits 1 of 13 top-level trees.**
- **FU-B** — the new blindspot suite is **not wired into CI**. ★ **GUARD-1's protection is real but
  UNENFORCED until this lands** — which is instance #3 of its own doctrine: a guard nothing runs.
⇒ **One small combined lane: both files plus the `package.json` wiring.**

**O5 · Veto point:** D2 was dispatched **ahead of** SEC-2 rather than behind it. See its lane note.

---

### ▶ HISTORICAL — resolved this wave

0. ✅ **THREE COMMITS APPROVED, PUSHED, AND MERGED** in the planned order #560 → #561 → #559.
   GUARD-1's commit went to a **fresh** subagent (its own was at ~12%, below the floor); SEC-PAIR
   PR-1 and C2 were resumed (~55% each). Each was told, in capitals, **not to change a single line**
   — the approval attaches to those exact files. None did.

1. *(historical — the approval that unblocked item 0)* All three lanes were built, green, and
   **uncommitted** — nothing staged or pushed, `scope:guard` run pre-`git add` on each.
   - **SEC-PAIR PR-1** at `wave3-sec1rev` — ⚠ carries **two allowlist extensions**:
     root `package.json` (a lockfile entry cannot exist without a manifest entry) and `.gitignore`
     (the new gate writes `firestore-debug.log` to the repo root; unignored it dirties every
     working tree). Both are forced consequences of allowlisted work. **Yours to accept.**
   - **GUARD-1** at `guard1-scope-blindspot` — 5 files, all inside its allowlist, no deviations.
   - **C2** at `c2-response-schema` — 4 files, all inside its allowlist, no deviations.

   ### ★ RECOMMENDED MERGE ORDER — GUARD-1 → SEC-PAIR PR-1 → C2
   Branch protection requires up-to-date branches, so **each merge costs the next a rebase and a
   ~5-minute CI re-run.** Three pushes are not three merges.
   - **GUARD-1 first.** It adds the `firestore` and `repoRoot` lanes, so SEC-PAIR PR-1's local
     `scope:guard` becomes honestly green on rebase instead of needing a waiver.
   - **SEC-PAIR PR-1 second**, then the deploy (item 3).
   - **C2 last** — fully independent of both; it can go anywhere, so it absorbs the rebases.

   ⚠ **Caveat on GUARD-1: almost none of its work is CI-gated.** `scope:guard` is local by design
   (§6a), `repo_boundary_acceptance.mjs` is absent from `test:matrix:all`, `agent3_uiux_guard` is
   wired nowhere, and its new blindspot suite could not be wired without `lazytopper/package.json`.
   **Merging it means trusting the local run** — `[FU-GUARD-1-B]` is what closes that.
2. **★★ THE SECURITY ITEM STAYS OPEN — THERE ARE THREE ROUTES, AND THE PAIR CLOSES TWO.**
   After PR-1 the honest status is **"one of three routes closed."** After PR-1 **and** PR-2 it is
   **two of three** — the forged-trial path (Route C) remains. Do not mark it done at either point.
3. **★ `firebase deploy --only firestore:rules` — owner's, after PR-1 merges.** ⇒ **This lane is
   NOT closed in this file until the owner confirms the deploy has run.** Merged ≠ deployed.
   Note the repo also has `pnpm run deploy:firestore-rules` (`scripts/deploy-firestore-rules.mjs`,
   needs `FIREBASE_SERVICE_ACCOUNT_KEY` + `VITE_FIREBASE_PROJECT_ID`).
4. **★★ ROUTE C NEEDS A DECISION AND HAS NO OWNER.** `trialEndDate` is a client-supplied ISO
   **string** and `isPremiumAccess()` treats `trial` exactly as `premium`. Not closable in rules —
   no string→timestamp parser exists. Options: `Timestamp`-typed dates (PR-2 scope) or
   server-issued trials. **Currently unassigned.**
5. **⚠ POSSIBLE HARD STOP INSIDE SEC-PAIR PR-2 (§9), STILL UNANSWERED.** If manual beta Premium
   activation writes only to the student's browser and not to Firestore, then "absent → free"
   **revokes Premium from every existing paying student**, and the fix needs a migration first.
   PR-1's subagent did **not** investigate it — correctly, it belongs to PR-2. **It is a blocking
   precondition for dispatching PR-2.**
6. **GUARD-1 follow-ups that need `lazytopper/package.json`** (deliberately untouched):
   `[FU-GUARD-1-B]` wire the new blindspot suite into `test:matrix:all`, `[FU-GUARD-1-C]` wire
   `agent3_uiux_guard` once its rotted checks are repaired. **An unwired guard is instance #3.**
4. **Live-verify D1's phone-linked suppression** against a real phone-linked Firebase account —
   the one thing no picture and no unit test can settle (`[FU-D1-PROVIDERIDS-UNPROVEN-LIVE]`).
5. ~~Cofounder owes instruction files~~ — **ALL DELIVERED.** The queue is complete; nothing is
   waiting on the cofounder. Specs on disk: `SUBAGENT_SEC_premium_selfgrant_paired.md`,
   `SUBAGENT_C2_response_schema.md`, `SUBAGENT_GUARD1_scope_blind_spot.md`,
   `SUBAGENT_D2_client_cleanup.md`.
6. **Sequencing reminder for whoever dispatches D2:** it shares `lazytopper/src/` with SEC-PAIR
   PR-2. One at a time.
7. **Process:** should the evidence lane be a hard gate before merge rather than an audit after?
   Both Wave 3 PRs merged before EV-1 returned. The evidence was clean, so nothing needs
   reverting — but as it stands the evidence lane is an audit, not a gate.

---

## CONTROLLER DISCIPLINE — do not erode

The controller reads no product source, runs no builds, reads no CI logs, inspects no diffs.
The moment it does, it is a subagent with a plan attached and this model has collapsed back into
what it replaced. Everything above came from `git ls-remote`, `gh pr list`, `gh pr view`, and
bounded subagent reports.
