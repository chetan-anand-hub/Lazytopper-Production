# WAVE 5A STATE — updated 2026-08-03 (controller pass 1, pre-dispatch)

> **This file, not the controller's context, is the source of truth.** A replacement controller
> takes over by reading this file and nothing else. Rewritten after every subagent returns.
>
> Dispatch + operating model + all four lane specs are on disk at **`C:\Projects\LT-wave5a\specs\`**
> (mirrored to `C:\Users\Chetan\OneDrive\Desktop\diff\final solution\wave 5 final\specs\`).
>
> ⚠ **UNTRACKED, and that is the ruling** — see DECISIONS §D1. Never appears in a product PR.
> At wave close it is committed ONCE as `handoff/WAVE_STATE_WAVE5_ARCHIVE.md`.
>
> ⚠ Wave 4's live state file was **preserved, not overwritten**, as
> `handoff/WAVE_STATE_WAVE4_LIVE.md` (also untracked; backup at `C:\Projects\LT-wave5a\`).

---

## TRUNK — RE-DERIVED, NOT REMEMBERED

```
TRUNK: c5570592fc00cf7959b1cbfb64ac79cf1bb0cfb1
```
Re-derived 2026-08-03 via `gh api .../git/ref/heads/base/approved-thru-437` — **not** from the
shared checkout, and **not** from the dispatch document (which offered it as a hypothesis).
→ **It MATCHES the dispatch's hypothesis.** Confirmed, not assumed.

`OPEN PRs: []` — **ZERO**, verified by `gh pr list --state open --json number,...`.
⇒ the six-file handoff lock is FREE and no lane-overlap collision exists at dispatch time.

---

## 🔚 WAVE 5A IS COMPLETE — ALL FIVE LANES MERGED AND LIVE-VERIFIED

**Trunk: `59ba4da2efc67041aa34a8ffafac0a9b19e364b4`** (controller-re-derived 2026-08-03; matches the
cofounder's close memo). Wave base was `c5570592…` and **did not move for the whole build phase.**

```
59ba4da  chore(ci): Dependabot version updates + CodeQL workflow (SUPPLY-1)  #579
cd0a6f0  feat(server): enforce entitlement on the paid AI endpoints (GATE-1) #580
8720849  feat(auth): one door, and a verified email (AUTH-3)                 #582
528abb1  chore(gates): replace the SolutionChecker blanket ban (FORBID-1)    #581
```
*(GATE-1b is not a separate PR — it is the CI-wiring commit `aeae3ebe` inside #580.)*

### ★★ LIVE-VERIFICATION — OWNER-RUN ON THE DEPLOYED PRODUCT, BOTH PASSED

**GATE-1 — the paywall is VERIFIED CLOSED.** Direct API calls against production, **same endpoint,
same empty body, identity the only variable** — a clean three-way discrimination:

| Account | Result |
|---|---|
| Free, trial elapsed | **402** `premium_required`, `trialEndedAt: 2026-07-17` |
| Premium | **400** `Missing question text` — handler reached |
| Mid-trial | **400** `Missing question text` — ★ **trial == premium confirmed live** |

★★ **The `trialEndedAt` came from that account's own backdated document, not a constant** ⇒ **proof
the gate really read Firestore**, and proof **G1-A's two-stage derivation works in BOTH directions.**
Also: `[entitlement] FAIL-OPEN` **absent** from Railway logs · `[firebase-admin] initialized …
credentials: explicit` on the running deploy · "Show steps" still free · Practice, Exam Trends, bank
and Progress untouched.

**AUTH-3 — VERIFIED.** D1 Google (no gate) · D2 phone (no gate) · D3 fresh email → gate → mail →
entry · D4 wrong password shows the right copy **with Firebase Console confirming NO second account
was created** · D5 reset still enumeration-safe · D6 the `from` round-trip · D7 name on `/sign-up`,
absent on `/login` · D8 existing accounts unaffected · E1/E2 the contrast fixes hold.

---

## 🛑🛑 THE DEPLOY INCIDENT — THE SINGLE MOST IMPORTANT THING THIS WAVE PRODUCED

**GATE-1 merged at 12:46. Vercel never built it. Railway did.** For ~2 hours the **server enforced a
rule the client had no code to explain**, and a free student pressing "Check my answer" saw the raw
string **`premium_required` in red** — **the exact defect GATE-1 §3D was written to prevent.**

> ★★ **§3D WAS CORRECT, WAS MERGED, AND HAD NOT SHIPPED.** Every gate was green. The code was on
> trunk. **The defect it prevents happened anyway.**

**Caught by fetching the live bundle and grepping it:** `premium_required` and `PremiumRequiredError`
**absent from all 65 deployed chunks.** Present after a forced rebuild.

### ⚠⚠ DOCTRINE — must appear VERBATIM in `CURRENT_STATE.md`
> **`MERGED` AND `DEPLOYED` ARE DIFFERENT STATES, AND THIS PRODUCT HAS TWO DEPLOY TARGETS THAT CAN
> DIVERGE.** Vercel (frontend) and Railway (backend) build independently from the same trunk. A merge
> confirms neither. **Any change spanning both must have BOTH deployments confirmed before it is
> called verified** — and the only trustworthy confirmation is asking the running system, not reading
> a dashboard.

**Two operational facts:** **Vercel "Redeploy" rebuilds the ORIGINAL commit, not the branch tip** — it
cannot pull in a newer merge and *it looks like it should.* And **branch protection means there is no
git-shaped way to trigger a deploy** (a direct push to trunk is correctly refused, `GH013`) ⇒ **the
standing remedy is a Vercel Deploy Hook**, created by the owner, to be rotated.
⇒ `[FU-DEPLOY-SPLIT-RAILWAY-VERCEL-DIVERGENCE]` · `[FU-DEPLOY-HOOK-IS-THE-ONLY-MANUAL-TRIGGER]`

★ **This generalises the wave's own theme one level up.** Every lane proved *"a green CI run is
evidence only about what it EXECUTED."* This proves the sequel: **a merge is evidence only about the
repository.** GATE-1b's grep asked the CI log what it ran; the fix here was to ask the **bundle** what
it shipped. **Same instrument, one layer out.**

---

## ★ CONTROLLER OBSERVATION 2026-08-03 — DEPENDABOT IS LIVE, AND IT ANSWERS AN OPEN UNKNOWN

`gh pr list` now returns **five Dependabot PRs, `#583`–`#587`**, opened after #579 merged.

⇒ ★★ **`[FU-SUPPLY1-DEPENDABOT-PARSE-CHECK]` is answered by OBSERVATION: the config PARSED.** A
malformed `dependabot.yml` fails **silently** and produces **nothing** — five PRs could not exist if
it had not parsed. **The one thing SUPPLY-1 was structurally unable to verify pre-merge is now
verified post-merge**, exactly as it predicted.
- ★ **The design is visibly working as specified:** `#585` is *"bump the npm-minor-and-patch group
  with **59 updates**"* — **grouping confirmed**; `#583` (node 24→26-slim) and `#584`
  (setup-node 4→7) are **majors, individually** — confirmed; **five open = the 3/1/1 cap**, confirmed.
- ⚠ **This does NOT close the audit item.** Version updates only. **Dependabot ALERTS and SECURITY
  UPDATES remain disabled toggles** — see the owner-action list.
- ⚠ **THEY ARE ALSO NOW THE PR-LIST NOISE SUPPLY-1's §1 WARNED ABOUT.** `lane-overlap` fails on a
  shared path against **every** open PR. **These five do not touch `handoff/**`, so the handoff PR is
  clear** *(controller-checked)* — but a future `package.json` or workflow lane **will** collide.
  ⇒ **Triage or close them before dispatching Wave 5B's `quality-gate.yml` lane.**

---

## ⚠ WHAT REMAINS — the handoff PR, and nothing else

**Lane `HANDOFF-W5` is dispatched** (see the ledger). Owner has authorised **commit, push AND
self-merge** for it: docs-only, zero product code. **Exactly SEVEN paths. ONE PR, never two** — the
six files are a single shared lock, and a forced UI merge can silently preserve stale content over
corrections with no gate objecting.

⚠⚠ **IT TAKES THE FULL CI BAR, DELIBERATELY.** `CI-DOCS` is not built, so no fast path exists — **and
even once it ships, this PR would still take the full bar by design.** A product PR's CI runs against
**its own base**, so lanes built in parallel are never compiled together until something merges both.
**The wave-closing handoff PR is this project's ONLY integration run**, and **this is the first run in
which all four lanes exist together.** *(Precedent: #574/#575 showed 1,091 and 1,088 tests and reached
production never having been tested together; the docs PR that followed showed **1,097** — a number
neither could produce.)* **Expect the count to move, and read it as signal rather than noise.**

**After it merges: report the SHA and stand down. Dispatch nothing else.**

---

## FIRST ACTIONS — §1 OF THE DISPATCH, ALL FOUR DONE

| # | Action | Result |
|---|---|---|
| 1 | Re-derive trunk | ✅ `c5570592…` — matches hypothesis |
| 2 | `gh pr list --state open` | ✅ `[]` — zero. A real check |
| 3 | Read `handoff/NEXT_ACTION.md` | ✅ Read **from trunk via `gh api`**, not the stale checkout. **CONFIRMED MATERIALLY STALE** — still lists AUTH-3/BATCH-2/NAME+LINK as "specced and deliberately not started", and still carries the four-item owner live-verify queue the dispatch says is now empty. Read for context, not priority |
| 4 | `handoff/WAVE_STATE.md` conflict | ✅ Owner ruling adopted — see D1 |

---

## ⚠ CONTRADICTION RAISED, NOT SILENTLY RECONCILED — dispatch §8

**`STOP BEFORE COMMIT` vs. THE MANDATED REPORT.** Every lane spec's header says *"Stop before
commit, report, wait,"* and dispatch §8 repeats *"Subagents stop before commit."* **But every one of
the four report templates requires evidence that cannot exist without a commit and a push:**

- `PR: <#nnn>` — a PR number
- `CI: <run id from CURRENT head> — zero-skip proof: <quoted line>` — a CI run, which is bound to a commit
- *"VERIFY YOUR PR'S LANDED FILE LIST, not just your working tree"* — a landed list needs a push
- dispatch §3B: *"Its report must show `git diff` EMPTY on that path **before commit**"* — presupposes one
- dispatch §3A/§4: four lanes with **open PRs racing**, and a merge/rebase cascade
- model file §1: the subagent *"pushes as draft, reads the CI log"*

**And a third rule sits on trunk:** `CLAUDE.md` §3 — *"ASK before: git commit, git push."*

⇒ **Per dispatch §8's precedence rule (TRUNK WINS) this is the owner's to settle, and per the same
rule it is RAISED rather than reconciled.** Question put to the owner before any dispatch.
**STATUS: ANSWERED 2026-08-03 — see D2.**

> → **And per dispatch §8's other half — "when you fix one, record that it was wrong, don't just make
> it right."** The `stop before commit` line in all four lane specs and in dispatch §8 **was wrong as
> written**, not merely ambiguous: it is contradicted by six separate passages in the same documents.
> **The wave-close handoff must say the line was wrong**, not silently ship the corrected behaviour.
> A silently-correct value teaches nothing; the next spec author will write the same line again.

---

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| **GATE-1b** | Wire `entitlement.test.cjs` into CI — the amendment D6 authorised | `lazytopper/package.json` ONLY (two edits) | ★ **RETURNED PASS — #580 AMENDED, STILL DRAFT** | amends **#580** | new head `aeae3ebe`. **#580 now lands exactly SIX files** (remote-verified). ★★ **`grep -c "entitlement.test.cjs"` = 1 — with a BEFORE/AFTER and a CONTROL.** Tail-guard re-run 11/11 **with its own control case**. See G1b |
| **GATE-1** | P0 · Enforce entitlement on the SERVER | 5 files: `server/services/entitlement.{cjs,test.cjs}` (NEW) · `server/index.cjs` · `server/routes/stepSolution.cjs` · `src/ai/aiClient.ts` | ★ **RETURNED PASS-WITH-FOLLOW-UP — PUSHED, DRAFT #580.** ⚠ **TWO OWNER DECISIONS BEFORE MERGE** | **#580** | head `f6f27159`, CI `30781159084` PASS. **`checkSolution.cjs` and `tutor.cjs` NOT touched** — §3A's where-else check did not force them, so the allowlist came in UNDER budget. ⚠⚠ **It found §1 incomplete in a way that would have left the P0 OPEN — see G1 below** |
| **AUTH-3** | One door + blocking email verification | 10 files — `src/pages/{Login,SignUpPage}.tsx` · `src/context/AuthContext.tsx` · `src/components/auth/VerifyEmailGate.{tsx,test.tsx}` (NEW) + tests | ★ **RETURNED PASS — PUSHED, DRAFT #582.** ⚠ **LIVE-VERIFY OWED** | **#582** | head `f99bd26c`, CI `30782074788` PASS. ★★ **NO context key added ⇒ §4A stop NOT triggered ⇒ BATCH-2 is NOT resequenced.** **0 of the 25 `vi.mock` factories touched**, proven by a filtered `git diff -U0`. `App.tsx` diff ZERO. No `PracticePage.*` touched. ⚠ It **declined §6** — see A3 below |
| **SUPPLY-1** | Dependabot + CodeQL (half the audit item) | `.github/dependabot.yml` · `.github/workflows/codeql.yml` | ★ **RETURNED PASS — PUSHED, DRAFT #579. AWAITING OWNER MERGE, AND IT GOES LAST** | **#579** | 2 files, landed list verified on the **REMOTE** (`gh pr view 579 --json files`), not the working tree. `isDraft: true` after both pushes; `gh pr edit` never used. **CodeQL PROVEN to have run**, on the FINAL head. ⚠⚠ **IT PROVED ITS OWN SPEC'S §0 WRONG — see S1 below** |
| **FORBID-1** | Replace the `SolutionChecker` ban with targeted tests | 2 files: `scripts/ops/check_improve_convergence_acceptance.mjs` · `src/components/question/SolutionChecker.contract.test.tsx` (NEW) | ★ **RETURNED PASS — PUSHED, DRAFT #581** | **#581** | head `994b76b4`, CI `30781253342` PASS. ★ **`SolutionChecker.tsx` diff EMPTY — §3B's risk cleared.** 19 mutations (16 product + 3 gate) **ALL RED**, all restores verified. `ResultsScorecard` membership check **survives and is proven firing in CI**. Scope NOT widened |

---

## DISJOINTNESS — controller-verified from the DECLARED allowlists, 2026-08-03

```
GATE-1   : lazytopper/server/**  +  lazytopper/src/ai/aiClient.ts
AUTH-3   : lazytopper/src/pages/{Login,SignUpPage}.tsx,
           lazytopper/src/context/AuthContext.tsx,
           lazytopper/src/components/auth/VerifyEmailGate.*
SUPPLY-1 : .github/dependabot.yml, .github/workflows/codeql.yml
FORBID-1 : lazytopper/scripts/ops/check_improve_convergence_acceptance.mjs,
           lazytopper/src/components/question/SolutionChecker.contract.test.tsx
```
✔ **No path appears in two lanes.** `App.tsx` absent from all four. `lazytopper/package.json`
absent from all four (the recurring collision risk in waves 3–4 — clear this time).
⚠ **SUPPLY-1 must not touch `quality-gate.yml` / `lane-overlap.yml` / `state-board.yml`** — a shared
workflow reaches every other lane.

> ⚠ **WHAT THIS CHECK CANNOT SEE — dispatch §8, recorded so it is not mistaken for more than it is.**
> A controller can compare **declared allowlists**. It cannot verify **blast radius** — that needs
> product source, which the role forbids. The two known below-the-path risks are §3B (FORBID-1
> mutating a forbidden file) and §3C (AUTH-3 growing via a context key into 25 mock factories,
> three of them in BATCH-2's allowlist). **Both are enforced in the dispatch text, not by this table.**

---

## DECISIONS MADE THIS WAVE

**D1 · The live state file stays UNTRACKED.** Owner ruling 2026-08-02, adopted. The Wave-5
methodology brief said "committed, not local"; trunk (`CURRENT_STATE.md`) said the opposite in two
places. **TRUNK WON; the brief was the error and is superseded.** Mid-wave durability is an
owner-pushed direct commit, never a PR. At wave close it is committed **once**, deliberately, as
`handoff/WAVE_STATE_WAVE5_ARCHIVE.md` — **the `_WAVE<n>_ARCHIVE` name is what marks it a decision
rather than a re-carry.**
→ **HANDOFF OBLIGATION (dispatch §1, four points).** The wave-close handoff must record all four
beside the existing rule in `CURRENT_STATE.md`, *including* point 4: that the cofounder's
methodology brief contradicted the trunk rule and lost. **Do not let the wave close without it.**

**D2 · OWNER RULING 2026-08-03 — COMMIT + PUSH A DRAFT PR, STOP BEFORE MERGE.** Each lane works in
its own worktree, runs all local gates, commits, pushes a **DRAFT** PR, reads its own CI log, and
stops. **Nobody marks a PR ready for review. Nobody merges. The owner merges.**
Rationale recorded because it settles a contradiction the next controller will meet again: it is the
only reading under which the mandated report is producible — PR number, CI run id bound to the
CURRENT head, quoted zero-skip proof, and the landed-file reconcile all require the push. It also
matches model file §1 (*"pushes as draft, reads the CI log"*) and dispatch §3A/§4, which assume four
open PRs racing through a rebase cascade.
⚠ Each dispatch was told `gh pr edit` SILENTLY UN-DRAFTS a draft PR (recover: `gh pr ready --undo`),
and to check the commit subject for a leading `@`.

**D3 · Wave 4's live state file was renamed, not overwritten.** `WAVE_STATE_WAVE4_LIVE.md`.
Precedent: Wave 3's was renamed the same way and became HANDOFF-W3's primary evidence.
⚠ Unlike Wave 3's, this one is **NOT** to be committed — `WAVE_STATE_WAVE3_ARCHIVE.md` reached trunk
**by accident** (swept in by #566), which is the very thing D1's naming rule exists to distinguish.

**D4 · Every dispatch carries the FORBIDDEN map by absolute path** (dispatch §2). Confirmed
per-lane in the DISPATCH LEDGER below — the dispatch requires this be recorded here, because all
three prior wrong FORBIDDEN claims came from a subagent grepping a filename instead of reading a map.

**D5 · Reports land in two places.** Subagents write to **their own scratchpad** (the harness blocks
subagent writes to `C:\Users\Chetan\OneDrive\Desktop\diff\`) and return the absolute path; **the
controller copies each into**
`C:\Users\Chetan\OneDrive\Desktop\diff\final solution\wave 5 final\reports\`, which is where the
owner asked for them. This satisfies the harness constraint and the owner's request at once.

---

**D6 · CI WIRING — ALLOWLIST EXTENDED, #580 AMENDED.** Cofounder ruling 2026-08-03, Decision 1.
`lazytopper/package.json` joins GATE-1's allowlist for **exactly two edits** — a
`test:server:entitlement` script and **one `&&` link** into `test:matrix:all` — **and nothing else in
that file.** Dispatched as lane **GATE-1b** onto the existing branch.
- **"Merge #580 as-is" was explicitly RULED OUT:** it would ship a P0 security fix whose entire
  43-test proof CI has never executed — *"perverse to reintroduce the silent-no-op class in the lane
  that closes the paywall."*
- **A separate one-line PR was rejected as strictly worse:** it must merge before #580 or #580 lands
  with unrun tests regardless; it adds a rebase round to a four-deep cascade; it puts a second PR on
  `package.json` while three drafts are open.
- ★★ **The subagent STOPPING rather than absorbing was reinforced, not corrected.** *"Extending an
  allowlist is an owner decision, and it has now been made — it was never the subagent's to take."*
- **Three conditions, all required:** (1) ⚠ **the proof of the gap becomes the proof of the fix** —
  re-run `grep -c "entitlement.test.cjs"` on the NEW CI log and require a **NON-ZERO** result,
  quoted; *"do not accept 'the script was added' as evidence."* (2) **re-run the tail-guard**
  (`repo_boundary_acceptance.mjs`) rather than trusting the arithmetic — *a derived value outlives
  the facts it came from.* (3) **two edits only**, landed list confirmed on the REMOTE.

**D7 · SEQUENCING — MERGE #580 ALONE. ⚠⚠ AND THIS IS NOT THE ESCAPE HATCH.**
Cofounder ruling 2026-08-03, Decision 2. **The pairing ruling's PREMISE no longer holds.**
§5.1 required GATE-1 and GATE-2 together because GATE-1 alone removes access from *"students who
liked the product enough to keep using it past trial."* → **Owner-confirmed 2026-08-03: those
students do not exist.** Every account past trial is the owner's own or one of 4–5 test students he
personally granted Premium. **Nobody is on a lapsed free tier.** And Gemini spend is **₹258.50 over
28 days ≈ ₹9/day**, so there is no cost clock either.
> ★★ **There is no goodwill to spend and no bleeding to stop. The ruling was correct reasoning
> applied to a user base that does not yet exist.** ⇒ **Record it as a dissolved premise, NOT as an
> escape hatch invoked** — the distinction matters, because the escape hatch implies a cost was
> accepted and here there was none.
- **GATE-2 keeps its Wave 5B place and MUST ship before the ~50-student QA pass** — that is the
  moment real free students first exist. **It is no longer a merge gate on GATE-1.**
- **"Pull GATE-2 forward, build without pushing" was REJECTED** — *"ingenious and the wrong risk: an
  unpushed lane gets no CI, and this project's whole discipline is that local green is not CI green.
  Building a large lane blind for days and then pushing it into a merge window is how a surprise
  happens."*
- ⚠ **The live-verify is a HARD GATE on #580, not a formality.** It needs a **free account whose
  trial has actually elapsed** — the owner's existing accounts are premium, so one must be made or
  aged. Two checks: a free-past-trial account sees the plain-English Premium message with **no error
  styling**; a premium or in-trial account is **completely unaffected**.

**D8 · ⚠ HANDOFF OBLIGATION — RECORD SUPPLY-1's §0 AS A *SPEC ERROR CORRECTED BY THE LANE*, NOT AS A
LANE FINDING.** Cofounder Ruling 3, and the distinction is explicit: *"the distinction is what stops
the wrong version being carried forward."* **This is the SECOND §0 of the cofounder's to be wrong on
a verifiable fact; both times the lane caught it.**
→ **And the distinction that must not be lost:** `dependabot.yml` configures **version** updates
(*"a newer release exists"*). It **cannot** configure **security** updates (*"a CVE was published
against what you use"*). ⇒ **merging #579 delivers routine bumps and NO vulnerability response
whatsoever. A green merge must not be recorded as closing the audit item.**

**D9 · ⚠⚠ HANDOFF OBLIGATION — GIT-BASED RESTORE VERIFICATION IS INVALID FOR A FILE THE PR IS ITSELF
ADDING.** Cofounder Ruling 4c, generalised from G1-C. `git checkout --` and `git diff --stat` are
**both no-ops on an untracked file**. **Use byte snapshots and SHA comparison.** *Every future
mutation lane on a new file inherits this trap* — and GATE-1b was dispatched carrying it.

**D10 · GATE-2's SPEC MUST CARRY G1-A VERBATIM.** Cofounder Ruling 4a: the two-stage derivation
(`repair` first, `expiry` second) is *"why the lane worked."* → **The client half must not re-derive
it differently.** Both directions are wrong: an elapsed `tier:"trial"` is effectively free, and an
unelapsed `{tier:"free", plan:"trial_7day"}` with a server-pinned start is effectively trial — **which
is exactly what the activation defect writes for every new signup.**

**D11 · The fail-open header-omission bypass is ACCEPTED POSTURE, not a defect.** Cofounder Ruling 4b:
implemented as ruled rather than quietly deviated from. **Containment verified** — such callers land
in the rate limiter's anonymous bucket capped at 3/day, and the browser has sent the bearer header on
every paid call since #552. `[FU-GATE1-ANON-FAILOPEN-BYPASS]` logged **so it is a conscious posture
and not a later discovery.**

**D12 · ⚠⚠ THE STALE-MATRIX-COUNT RULING WAS AIMED AT THE WRONG FILE — CONTROLLER-VERIFIED CORRECTION.**

Cofounder Ruling 5 says *"`CLAUDE.md §6a` says the root guard matrix is 175… fix it in the wave-close
handoff."* **That premise is FALSE on today's trunk.**

**Verified by the controller against trunk `c5570592` (`gh api …/contents/CLAUDE.md`, grepped for
`175|190|suites`):** the file contains **no `175` anywhere.** It reads
`6 suites (syllabus, deletion, reproduction, ops, practice-set, ai-tier-content-integrity)` and
`(SIX suites / 190 checks as of 2026-07-28 — the count GROWS; read it from the run, never hardcode
it…)`. ⇒ **`CLAUDE.md` was ALREADY CORRECTED — by Wave 4's #572, which is exactly what that PR was
for.** *(Two lanes reported "§6a says 175" from memory of the old text; the claim did not survive a
check against trunk.)*

★★ **GATE-1b found where the stale count ACTUALLY lives, and it is a file nobody had named:**
`.github/workflows/quality-gate.yml` carries `--- Root guard matrix: 5 suites, 175/175 ---`
**directly above the step that just reported 28 suites / 190 tests.** ⇒
`[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]`.

> ★★ **THIS IS THE MAP-FILE LESSON RECURRING.** Three lanes said "the stale count is in `CLAUDE.md`";
> **all three were remembering, not looking.** The one lane that actually enumerated found it
> somewhere else entirely. **A stale value's ban lives where you look for it, not where you remember
> it** — and #572 fixing one copy is *why* the remembered version persisted.

⚠ **CONSEQUENCE FOR THE WAVE-CLOSE HANDOFF — this is the operative change:**
- **Do NOT "fix" `CLAUDE.md`.** It is already right. Editing it would churn a correct file and, worse,
  record a correction that never happened.
- **`quality-gate.yml` CANNOT be fixed in the wave-close handoff PR** — that PR is `handoff/**`
  docs-only (§8: *docs-only PRs must contain zero product file changes*), and a workflow is not a doc.
  ⇒ **It needs its own small PR**, after **SUPPLY-1 (#579) is merged AND closed** (SUPPLY-1 was
  deliberately barred from `quality-gate.yml` because a shared workflow reaches every lane).
  **Natural home: alongside `CI-DOCS` in Wave 5B**, which already touches `.github/workflows/`.
- **The handoff still RECORDS all of it** — that the count was stale, that #572 fixed one copy, that a
  second copy survived in the workflow, and that three lanes then mis-cited the fixed file.
  *A silently-correct value teaches nothing; a correction aimed at the wrong file teaches worse.*

---

## DISPATCH LEDGER — what each subagent was actually handed

**All four dispatched IN PARALLEL, 2026-08-03.** Every dispatch pointed the subagent at its own
instruction file **and** at the FORBIDDEN map **by absolute path** (dispatch §2 requires this be
confirmed here — all three prior wrong FORBIDDEN claims came from a subagent grepping a filename
instead of reading a map).

| Lane | Instruction file (all under `C:\Projects\LT-wave5a\specs\`) | FORBIDDEN map by abs path? | Worktree / branch |
|---|---|---|---|
| GATE-1 | `SUBAGENT_GATE1_server_entitlement_v1.1.md` | ✅ YES | `LT-worktrees/gate1-entitlement` · `feat/desktop-pr-gate1-server-entitlement` |
| AUTH-3 | `SUBAGENT_AUTH3_one_door_verified_v1.1.md` **+** `LazyTopper_OneDoor_auth_prototype.html` | ✅ YES | `LT-worktrees/auth3-one-door` · `feat/desktop-pr-auth3-one-door` |
| SUPPLY-1 | `SUBAGENT_SUPPLY1_supply_chain.md` | ✅ YES | `LT-worktrees/supply1-scanning` · `chore/supply1-dependabot-codeql` |
| FORBID-1 | `SUBAGENT_FORBID1_solutionchecker_amendment.md` | ✅ YES | `LT-worktrees/forbid1-solutionchecker` · `chore/forbid1-solutionchecker-amendment` |

→ **FORBID-1 was additionally told to VERIFY the map rather than trust it** — its entire lane is an
amendment to one of the arrays the map is derived from, so it re-enumerates and reports if the map is
wrong. *A map is a derived value, and a derived value outlives the facts it came from.*

Every dispatch also carried, verbatim: worktree isolation + the never-touch-the-shared-checkout rule;
the D2 commit/push ruling; the other three lanes' allowlists; that `App.tsx` and
`lazytopper/package.json` are absent from all four; the report-to-disk mechanism **with the explicit
statement that the `Write` tool refuses `.md` for subagents and only the shell works**; the bounded
return template; and *"if the spec is wrong, your verified finding wins — a BLOCKED report that
writes zero code is a legitimate outcome."*

---

## MERGE ORDER — ★ UPDATED BY THE COFOUNDER MEMO 2026-08-03. **The owner merges; the controller does not.**

> ⚠ **NOTHING MERGES until the cofounder has byte-reviewed it AND the owner has live-verified #580.**

1. **FORBID-1 — `#581`** — when green. *(Moved to first: it no longer waits on GATE-1.)*
2. **GATE-1 — `#580`** — **after the GATE-1b CI wiring is amended in AND the owner live-verifies.**
   ⚠ Live-verify needs a **free account whose trial has actually elapsed** — one must be made or aged.
3. **AUTH-3 — `#582`** — merged **AND CLOSED** before BATCH-2 opens. ⚠ **also owes its own
   live-verify** (a live auth round-trip; see A3).
4. **SUPPLY-1 — `#579`** — **LAST**, confirmed by its own report: the moment it lands, CodeQL begins
   running on every other open PR in the wave, changing the CI surface mid-flight.

⚠ **Branch protection requires up-to-date branches: budget a rebase + ~5-min CI round after EACH
merge.** Four lanes = four rounds. **Do not push four PRs and expect four clean merges.**

⚠ **Branch protection requires up-to-date branches: budget four rebase+CI rounds (~5 min each).**
Build parallelism is free; **merge order is the thing that needs sequencing.**

---

## BLOCKED / OWNER DECISIONS OWED

1. **[D2] Commit/push authority** — the `stop before commit` vs. mandated-CI-evidence contradiction
   above. **Blocks dispatch.**
2. **GATE-1 §5.1 — GATE-1 removes paid-AI access free students past day 7 have today.** MERGED MEANS
   LIVE (Vercel + Railway build trunk on merge; no staging). GATE-1 and GATE-2 land in the same
   sitting, GATE-2 second, **never with GATE-1 held open as a pairing device** (they share
   `aiClient.ts`; a held-open GATE-1 would block GATE-2 on `lane-overlap`). **Escape hatch:** if
   GATE-2 slips beyond ~a day GATE-1 merges anyway — the security hole outranks the copy — **but the
   owner is told first, in plain words.** *Not blocking dispatch; blocking GATE-1's merge.*
3. ⚠⚠ **SUPPLY-1's other half is owner-only — AND THE LIST WAS WRONG. CORRECTED BY THE LANE ITSELF.**
   The spec said *secret scanning* + *push protection*. **The subagent reports both are already
   ENABLED.** The four actually disabled are **Dependabot alerts**, **Dependabot security updates**,
   secret-scanning non-provider patterns, and secret-scanning validity checks. **The first two are
   the ones that matter** — without them `#579` delivers version bumps and **no vulnerability
   response at all**. Settings → Code security.
   → **A green SUPPLY-1 is NOT "supply chain done."** *And the correction is recorded rather than
   silently applied, per dispatch §8: a checklist derived from memory is wrong in both directions,
   and the "already done" half is the more dangerous one because it reads as confirmation.*
4. ⚠ **After merging #579, open Insights → Dependency graph → Dependabot.** It is the only way to
   learn the config parsed — **a malformed `dependabot.yml` fails silently**, and the check is
   structurally impossible before merge because Dependabot reads only the default branch.

---

## ★★ S1 · SUPPLY-1 RETURNED — PASS, DRAFT #579. **IT PROVED ITS OWN SPEC'S §0 WRONG.**

Full report: `…\wave 5 final\reports\report-supply1-dependabot-codeql-2026-08-03.md`
*(Provenance: everything below is **the subagent's finding**, not the controller's — the controller
does not read source, gates or CI logs. Each claim is recorded with the evidence it cited.)*

### ⚠⚠ THE FINDING THAT CHANGES WHAT THE OWNER DOES — §0 WAS WRONG IN BOTH DIRECTIONS

The spec's §0 named **secret scanning** and **push protection** as the two outstanding owner toggles.
**The subagent reports both are ALREADY ENABLED**, and that the four actually disabled are:

| Setting | Reported state | Evidence it cited |
|---|---|---|
| **Dependabot ALERTS** | ⚠ **DISABLED** | `404 "Vulnerability alerts are disabled."` **and** `403 "Dependabot alerts are disabled for this repository."` — **two different endpoints**, so not a token-scope artifact |
| **Dependabot SECURITY UPDATES** | ⚠ **DISABLED** | verified |
| Secret scanning non-provider patterns | disabled | lower value |
| Secret scanning validity checks | disabled | lower value |

> ★★ **This is the failure mode the map file was written for, appearing in a different form.**
> Reporting §0 as written would have sent the owner to switch on two things that were already on,
> **while the four that were actually off went unmentioned.** A checklist derived from memory rather
> than from the live setting is wrong in *both* directions at once, and the "already done" half is
> the more dangerous one — it reads as confirmation.

→ **AND THE CONSEQUENCE IS THE POINT:** `dependabot.yml` delivers **VERSION updates only.** The
CVE-driven half — the reason this audit item exists — **needs those two toggles.** ⇒ **Merging #579
yields routine bumps and NO vulnerability response.** Do not let the merge read as "supply chain
done"; it is now *more* true than the spec knew, not less.

### TWO MORE SPEC CONTRADICTIONS, BOTH WITH EVIDENCE

- **§3 step 2 is NOT EXECUTABLE as written.** Dependabot reads `.github/dependabot.yml` from the
  **DEFAULT BRANCH only**, so the Dependabot tab has nothing to report on an unmerged PR. ⇒ that half
  is honestly reported **`UNVERIFIED`**, which is the correct outcome, not a gap. Mitigation done
  instead: PyYAML parse (**which caught a real defect — the first `codeql.yml` draft was missing the
  `schedule:` key above `- cron:`**), no BOM/CRLF, long-stable syntax only, `cooldown:` deliberately
  omitted as unverifiable.
  ⚠ **OWNER'S FIRST ACTION AFTER MERGING #579: open that tab. A malformed file fails SILENTLY** —
  no PR, no error in Actions, nothing.
- **§2's trigger set was incomplete.** With `schedule` + `pull_request` only, run `30780475666`
  warned: *"Please specify an on.push hook to analyze and see code scanning alerts from the default
  branch on the Security tab."* Without it **the Security tab stays empty — a guard that runs and
  displays nothing**, this project's exact silent-no-op class. `on.push` added in `86ac23f0`.
  ★ **Proven by CONTROL CASE, not by asserting the line was added: the annotation is ABSENT from the
  later run `30780696905`.**

### EVIDENCE QUALITY — what makes this report trustworthy
- **CodeQL proven to have RUN, not merely to exist:** runs `30780475666` (`72a2be1b`) and
  `30780696905` (final head `86ac23f0`), both `Analyze (javascript-typescript)` success.
  ★ **Re-verified on the FINAL head** — *a run id binds to a COMMIT, not a PR.*
  ★ **Proof it ANALYSED rather than merely started:** `results=0 rules=87 tool=CodeQL 2.26.2`.
- **`results=0` was NOT sold as a clean bill of health** — volunteered caveat: default query suite,
  `javascript-typescript` only.
- **Landed file list checked on the REMOTE**, not the working tree — the `#566` failure mode
  (declared 4, landed 13) explicitly guarded against.
- ★ **Root guard matrix reported 190/190 (fail 0, skipped 0) — read from the run.**
  ⚠ Confirms again that **`CLAUDE.md` §6a's "175" is STALE.** vitest `94 files / 1097 tests`.
  CONV 100/100 · CI-OVL 36/36 · QP-OVL 41/41.
- `scope:guard` run **PRE-`git add`** both times → `SCOPE_GUARD_OK (mode=auto:tooling,
  lanes=trackedTooling) inspected=2`. Note: `--mode product` **fails and should** — this is a tooling
  PR, so the bare auto-detect invocation is the correct one.
- **No existing test moved** — no source changed, exactly as §5 predicted.

### ECOSYSTEMS — found by globbing manifests, not assumed
`npm /` (pnpm-lock + 9 `package.json` across workspace members — ONE entry) · `github-actions /`
(4 workflows, all on floating major tags) · `docker /` (root Dockerfile, `node:24-slim`, the Railway
backend image). **Deliberately NOT configured:** `/lazytopper` — its tracked `package-lock.json` is a
**stale npm artefact in a pnpm-only workspace** ⇒ `[FU-SUPPLY1-STALE-NPM-LOCKFILE]`.

### CADENCE — and the reason is the wave-sequencing gate, not noise
Weekly, staggered Mon/Tue 06:00 IST; limits **3/1/1 = max 5 open**. Patch+minor grouped, majors
individual, **no automerge**. ★ **`target-branch` deliberately UNSET — setting it would SUPPRESS
Dependabot security updates.**

---

## ★★ G1 · GATE-1 RETURNED — PASS-WITH-FOLLOW-UP, DRAFT #580. **TWO OWNER DECISIONS.**

Full report: `…\wave 5 final\reports\report-GATE1-server-entitlement-2026-08-03.md`
*(Provenance: the subagent's findings, not the controller's.)*

### ⚠⚠⚠ G1-A · THE SPEC'S §1 WAS INCOMPLETE **IN A WAY THAT WOULD HAVE LEFT THE P0 OPEN**

> **The effective tier is NOT the stored `tier` field.** It is
> `applyExpiry(repairInterruptedTrial(...))`, **and the order is load-bearing.**

★★ **Reading the raw `tier` field — which is what §1 literally instructed — would have produced a
gate that serves EVERY EXPIRED TRIAL (the exact day-7 hole this lane exists to close) AND
simultaneously LOCKS OUT MID-TRIAL STUDENTS.** Both failure directions at once, from one plausible
reading of the spec.

★ **And note what this connects to:** `repairInterruptedTrial` is Wave 4's `#574` P0 fix — the trial
that downgraded during its own activation. **A server gate reading raw `tier` would have re-opened
that P0 on the server side**, in a component no client test covers. ⇒
`[FU-ENTITLEMENT-TIER-DERIVATION-DUPLICATED]`.

### ⚠⚠ G1-B · OWNER DECISION — THE 43 TESTS **NEVER RUN IN CI**, AND ITS ALLOWLIST FORBIDS THE FIX

**Proven, not suspected: a grep of the CI log for `entitlement.test.cjs` returns ZERO.** The suite
passes 43/43 locally and **is invisible to CI**, because the chain that invokes it lives in
`lazytopper/package.json` — **which is off-allowlist for all four lanes this wave.**

★ **The subagent STOPPED AND REPORTED rather than absorb it** — the §4A discipline applied to a file
it was never told about. It pre-checked the safety of the change it did not make:
- tail-guard stays green (chain 22→23; self-tests 19/20/21→20/21/22)
- **no lane-mate collision** — no other Wave 5A lane touches `lazytopper/package.json`
  *(controller-confirmed against the disjointness table above: absent from all four allowlists)*

> ★★ **This is a mutation-proof of the project's own doctrine: a green CI run is evidence only about
> what it EXECUTED.** #580's CI is green and says nothing whatever about the 43 tests that are the
> whole proof of the gate. **Merging as-is ships a P0 security fix whose test suite CI has never run.**
> ⇒ `[FU-GATE1-TEST-NOT-IN-CI]`. **STATUS: owner asked 2026-08-03.**

### ★★ G1-C · IT CAUGHT ITS OWN MUTATION HARNESS BEING A SILENT NO-OP

> Its first harness used `git checkout --` + `git diff` to restore and verify — **both are NO-OPS on
> an UNTRACKED file.** `entitlement.cjs` is new, therefore untracked. **M1–M3 silently ACCUMULATED
> while the harness printed `RESTORE VERIFIED: YES`.**

It caught this itself, rebuilt the harness on **byte snapshots + SHA-256**, and re-ran everything.
★ **The verification instrument was the silent no-op — not the code under test.** This is the eighth
inert mechanism this month and the first found *inside a restore-verifier*, i.e. inside the very
control the standing rule prescribes. ⇒ **the standing rule "verify the restore" is insufficient as
written: `git diff` cannot see an untracked file. Say HOW you verified, not that you did.**

### THE EVIDENCE THAT MAKES THE GATE REAL, NOT WIRED
- **§3A WHERE-ELSE, answered not assumed:** no handler has a second HTTP entry point. Every non-test
  reference is the single `index.cjs` dispatch, the `questions.cjs` factory, its own definition, a
  comment, or a test/ops script calling the handler directly. **`gradeStructuredSet` is
  module-internal and never exported.** ⇒ route gating is COMPLETE and `checkSolution.test.cjs`
  correctly stayed off the allowlist. **Its 64 tests: 64/64 green, `git diff` empty.**
- ★ **CONTROL 1 — a REAL 402 from a REAL request:** boots the **real `index.cjs` in a child
  process**, swapping firebase-admin via `Module._load` **before require** — so **no test seam was
  added to production code** — then a real HTTP POST. That is *mount ≠ live* satisfied properly.
- ★ **CONTROL 2 — credentials absent:** asserted on the **real child process's stderr** matching
  `/\[entitlement\] FAIL-OPEN/` and `/not being enforced/`.
- **Fail-open witness:** `console.warn` + **2 counters**, and it **split `no_uid` (token offered but
  did not verify = credentials broken) from `no_credential` (merely signed out)** — *otherwise
  routine signed-out traffic drowns the one signal that matters.* That distinction was not in the spec.
- **Copy register met — no underscore, not a fault:** *"Checking your answer is a Premium feature.
  You can unlock it whenever you're ready."* (per-feature variants for worksheet / tutor / step gen).
- **Cache:** 60s TTL, **ENTITLED decisions ONLY. A denial is never cached**, so an upgrade is honoured
  on the very next call. Pinned by test — §3E's constraint satisfied by construction, not by promise.
- **step-solution:** endpoint UNGATED (bank + cache serve any tier); only the generation branch gated,
  behind a **lazy resolver so free paths spend zero Firestore reads.**
- **M1–M6 all RED on target** (A3/A2/A4/A6/A8/A11), restores **SHA-256-verified** after each.
- Gates: `scope:guard` PRE-`git add` → `SCOPE_GUARD_OK (mode=mixed, lanes=product)` · tsc app · tsc
  test · mojibake `enforced_hits=0` · entitlement 43/43 · checkSolution 64/64 ·
  CI `30781159084` @ `f6f27159`: root matrix `190/190`, `Tests 1097 passed (1097)`, build `9.79s`.

### TWO MORE SPEC CONTRADICTIONS
- **§3C's fail-open is a header-omission bypass** — a caller who omits the header gets served.
  **Bounded by the rate limiter's 3/day anonymous cap**, so it is a leak and not a hole ⇒
  `[FU-GATE1-ANON-FAILOPEN-BYPASS]`. *This is the accepted cost of the fail-safe, not a defect in it.*
- **Minor citation error:** §4's *":456 is explicitly cache-gated"* points at
  `getOrCreateModelSolution` — **the GRADER's hook, not `handleStepSolution`'s path.** The ruling is
  unaffected; the citation was wrong. ★ *Third instance this wave of the rule that line references
  are derived values — cite by symbol.*

### ALIGNMENT WITH `featureGates.ts` — a DOCUMENTED duplication, and why
A shared import is **NOT feasible**: `subscriptionService.ts` imports the **browser** firebase SDK at
module scope, so it cannot be required from CJS. ⇒ documented duplication, which §1 explicitly
prefers to a silent one. **But see G1-A — the thing that must stay aligned is the DERIVATION, not the
field.**

---

## ★★ F1 · FORBID-1 RETURNED — PASS, DRAFT #581. **THE BAN WAS THE ENTIRE PROTECTION.**

Full report: `…\wave 5 final\reports\report-forbid1-solutionchecker-2026-08-03.md`

### ★★ THE §2 READING — and it is worse than the spec assumed
> **The array entry was the ENTIRE protection.** §7's `AUTOGROW` checks regex `EquationInput.tsx`'s
> **own source**; **nothing anywhere asserted one line of `SolutionChecker`'s behaviour.** The ban
> said *"something must not change"* and never said what — and there was nothing underneath it.

⇒ The amendment is a **strict increase** in protection, not a trade. That is the outcome §0 wanted
and could not assume.

**The `EquationInput`/`autoGrow` relationship, traced concretely** — `SolutionChecker` mounts
`EquationInput` with `rows={4}` and **no `autoGrow`, no `maxRows`**. Flip the shared default and,
with `SolutionChecker` unchanged: **(a)** the textarea gains `lt-eq__textarea--grow`, whose only rule
is `resize:none` — **the resize handle disappears**; **(b)** the clamp becomes
`[rows, maxRows ?? rows]` which **collapses to `[4,4]` — pinned at four rows, unable to ever grow.**

### ★★★ THE MUTATION THAT JUSTIFIES THE WHOLE DOCTRINE — M2b
> Renaming `--grow` made the **negative assertion go VACUOUS and still pass.**
> **Only the POSITIVE CONTROL caught it.**

★ That is *"every ABSENT assertion needs a control that renders the thing"* proven **on this wave's
own new test suite**, by its author, before shipping. **19 mutations total (16 product + 3 gate), ALL
RED, every restore verified.** M2 flipped `EquationInput`'s shared default with `SolutionChecker`
untouched → 2 red: **the ban's exact scenario, reproduced.** G1–G3 proved the new gate checks fire,
**including a silent re-add of the ban.**

### ⚠ ONE INCIDENT, DISCLOSED BY THE SUBAGENT ITSELF
M4b's first attempt **exited on the ambiguity guard BEFORE restoring**, leaving `SolutionChecker.tsx`
dirty — **exactly the §3B failure the dispatch named in advance.** Caught by the very next
`git status`, restored, verified, and **the restore was then moved into an EXIT trap** so it cannot
recur. **Final state: `SolutionChecker.tsx` byte-identical to trunk `c5570592`.**
★ *Self-disclosed. The dispatch predicted this exact hazard and the lane both hit it and caught it.*

### CONTRADICTIONS FOUND
1. ⚠⚠ **A green tick on this commit was NOT the gate.** Run `30781253355` is **"Lane Overlap", which
   gates nothing.** Two workflows fire per PR; the Quality Gate is `30781253342`. ⇒
   `[FU-CI-TWO-WORKFLOWS-PER-PR]` — **a controller reading "CI green" off the wrong run learns
   nothing.**
2. ⚠ **The CONV gate's own header claims CI does not run vitest — FALSE** since `quality-gate.yml`
   gained a required vitest step. **Load-bearing: it would tell a future reader the replacement
   protection is worthless.** Corrected at the new block, and the wiring **asserted rather than
   trusted** ⇒ `[FU-CONV-GATE-HEADER-STALE-VITEST-CLAIM]`.
3. **Every spec line cite had moved** (`:507-513`→`507-515`, `:525-527`→`520-530`, `:527`→`527-528`,
   `:525`→`525-526`). **The amendment cites by quote.** ★ *Fourth instance this wave.*
4. `SolutionCheckerProps` is **NOT exported** — tests use `ComponentProps<typeof SolutionChecker>`.
5. **No `package.json` wiring needed** — the vitest include glob auto-collects. ★ **The subagent
   named this as LUCK, not design**, since that file is in no lane's allowlist. **Contrast GATE-1,
   where the same question went the other way** — see G1-B.
6. `CLAUDE.md` §6a says 175 checks / "SIX suites"; **actual is 190 / 28.** *Third lane to report it.*

**Named-subject proof in CI:** `✓ src/components/question/SolutionChecker.contract.test.tsx
(20 tests) 1287ms` · `Test Files 95 passed (95)` / `Tests 1117 passed (1117)` · root matrix 190/190.
**`ResultsScorecard` still guarded, proven in the CI log:**
`ok  FORBIDDEN(wired): ResultsScorecard.tsx is in the guarded set` plus its zero-changes diff check.
**GATE-2 does NOT also need `ResultsScorecard`** — `SolutionChecker` has zero references to it and
renders its own inline result view. **Scope correctly not widened.**

---

## ★★ A3 · AUTH-3 RETURNED — PASS, DRAFT #582. **NO CONTEXT KEY ⇒ BATCH-2 IS NOT RESEQUENCED.**

Full report: `…\wave 5 final\reports\report-auth3-one-door-2026-08-03.md`

### ★★ THE §4A ANSWER THE CONTROLLER NEEDED ON FACT — and it is the good one
**NO `AuthContext` keys added.** The exact-equality pin passes untouched. State rides on an
**optional `emailVerified?: boolean` on `AuthUser`** — PR-B3's precedent applied one level down.
**0 of the 25 `vi.mock` factories touched**, proven by `git diff -U0` filtered to `useAuth`/`vi.mock`
lines coming back **empty**. `App.tsx` diff **ZERO**. **No `src/pages/PracticePage.*` touched.**
⇒ **AUTH-3's true reach stayed inside its allowlist. §3C's risk did not materialise. BATCH-2 is
unblocked as soon as #582 is merged AND closed.**
*(The repo now has 26 mockers; the 26th is this lane's own new `Login.oneDoor.test.tsx`.)*

### ⚠⚠ THREE CONTRADICTIONS — one is a REFUSAL TO FOLLOW §6, and it was right
1. ★★ **§6's "reduce `SignUpPage` to a thin render" would have DELETED the product's only name
   capture.** `FirstSession` **declines the name on trunk**, so `SignUpPage` is where it happens —
   and reducing it would have forced deleting **7 guard tests** and **re-opened PR-B2's one-way-door
   defect** (accounts with no name fall back to the raw email across six surfaces).
   ⇒ It **kept the name field on the create door** instead. **`App.tsx` still never moves**, which was
   §6's actual objective. ⚠ **`/login` can still make nameless accounts** ⇒ `[FU-AUTH-NAME-PROMPT]`.
2. **`providerIds` is forbidden by a repo-wide owner ruling** (`LinkSignInMethodModal.test.tsx` scans
   all of `src/`). It **restructured the predicate rather than weaken the guard.**
3. ⚠⚠ **THE GATE IS PAGE-SCOPED, NOT APP-WIDE.** `RequireAuth` and `App.tsx` are out of allowlist, so
   **a restored session bypasses the verification gate.** ⇒ `[FU-AUTH-VERIFY-NOT-APP-WIDE]`.
   ★ **Stated plainly rather than papered over** — this is a real limit on what shipped, and the
   honest framing is what makes it actionable.

### THE ANSWERS THE SPEC ASKED FOR
- **How the app learns verification succeeded:** explicit `reload()` on **three** triggers — window
  `focus`, a 5s poll (covers verifying on a phone), and a manual button (never a dead end).
  **Reasoned from the mechanism, not assumed:** the handler is Firebase-hosted in another tab and
  `reload()` mutates in place without re-emitting, so **`onAuthStateChanged` does NOT fire** — the
  same trap `AuthContext` already documents twice.
- ★ **`emailVerified` on a real Google sign-in: NOT MEASURED — and it refused to report reasoning as
  measurement.** It also named the risk it took: §5.2 forced the predicate onto `email` rather than
  `providerIds`, so a false value **would** gate Google users — bounded (an extra step, self-resolving;
  not a lockout) ⇒ `[FU-AUTH-GOOGLE-EMAILVERIFIED-LIVE]`. **This is the best judgement in the report.**
- **Phone-then-linked-email:** **UNREACHABLE today** — no email-link path exists, so no phone account
  can acquire one. Pinned by a test, with a revisit trigger recorded in code.
- **`verifyBeforeUpdateEmail`:** tested at the code path (not live) — re-authenticates with the
  just-typed password and retries **once**; a second failure reports; with no known password, one
  call and an honest message, no loop. **Built as a flow, not an error string** ⇒
  `[FU-AUTH-REAUTH-LIVE-UNVERIFIED]`.
- **DPDP room:** a 4th `DoorStep` ("consent") in the same `.lt-login-frame` switch, between method
  choice and the method form. **Nothing makes it expensive — the frame has no fixed height, proven by
  the verify gate dropping in with zero layout change.** Not built, as instructed.
- **Email-link path: CONFIRMED still absent.** The false *"link both later"* promise **is not
  shipped, and a test stops it returning.**

### SCREENSHOTS DID WHAT SCREENSHOTS DO
**16 captures (8 states × 1024/390), no horizontal overflow.** ★★ **TWO defects found and fixed, both
PRE-EXISTING and invisible to every assertion in the repo: white-on-white input text AND the primary
Google button in dark theme — measured `rgb(248,250,252)` on `rgb(255,255,255)`.**
Wrong-password at 390px is **one line** of red, not a block (PR-F1's defect checked, not assumed).
*"Verified-and-in" is not a state of this page* — honestly not staged; the create door captured instead.

**5 mutations, one at a time, all red**, restore verified after each; final `git status --porcelain`
empty at `f99bd26c`. CI `30782074788`: `Test Files 96 passed (96)` / `Tests 1136 passed (1136)`,
root matrix 190/190, **all 6 of its suites named in the log**, every counter `fail 0` / `skipped 0`.

> ⚠⚠ **LIVE-VERIFY OWED BEFORE "DONE"** (CLAUDE.md §6 — a live auth round-trip): Google sign-in shows
> **no** gate · a fresh email shows the gate, mail arrives, entry works · a wrong password says
> *"That password doesn't match"* and creates **NO second account** · phone shows **no** gate.

---

## ★★ G1b · GATE-1b RETURNED — PASS. **#580 IS NOW COMPLETE AND STILL DRAFT.**

Full report: `…\wave 5 final\reports\report-GATE1b-ci-wiring-2026-08-03.md`
New head `aeae3ebe`. **#580 lands exactly SIX files, confirmed on the REMOTE** (`gh pr view 580
--json files`): `package.json` · `server/index.cjs` · `server/routes/stepSolution.cjs` ·
`server/services/entitlement.cjs` · `server/services/entitlement.test.cjs` · `src/ai/aiClient.ts`.
`package.json` numstat **2 added / 1 modified, one file — no third change.**

### ★★★ CONDITION 1 SATISFIED, AND BETTER THAN ASKED — a BEFORE/AFTER *with a control*
```
grep -c "entitlement.test.cjs"   run 30781159084 (f6f27159) → 0     ← the gap
                                 run 30786131841 (aeae3ebe) → 1     ← the fix
> lazytopper@0.0.0 test:server:entitlement
> node --test server/services/entitlement.test.cjs
# tests 43  # pass 43  # fail 0  # skipped 0
```
★★ **The control is the part that matters:** it grepped the **already-wired sibling**
(`checkSolution` = 1) in the **same before-log**, *before editing anything.* ⇒ **the zero was a
missing link, not a log artefact or a grep that could never match.** That is the difference between
"the count changed" and "the count changed *because of my edit*" — and it is the specific check the
cofounder's condition was written to force. **Quality Gate `30786131841`, correctly distinguished
from Lane Overlap `30786131815`.**

### ★★ CONDITION 2 SATISFIED — and it, too, brought its own control
`Repo boundary acceptance PASSED (11/11)` **locally AND inside CI.** Computed: chain **23** steps,
`tailStart` **15**, self-tests at **20, 21, 22** — **GATE-1's arithmetic was correct as written**, and
is now measured rather than reasoned.
★ **CONTROL CASE:** front-loading `test:mojibake` turned the guard **RED** —
`FAILED (1/11). - guard_self_tests_run_at_matrix_tail: not in tail (or unwired): test:mojibake`
⇒ **the tail-guard is a live matcher, not decorative.**
★★ **Restored BY SHA, never by `git diff`** — `c0329f27 → ac729484 → c0329f27`. **D9 applied by the
first lane dispatched after it was written.**

**Chain placement, reasoned not arbitrary:** index **19 of 23**, immediately after
`test:server:check-solution` — keeps the six server suites contiguous and sits **before** the three
tail-pinned self-tests, so it can mask only those three (**the same relationship the existing
check-solution link already has**) and **none of the ~19 gates ahead of it.** *That answers the `&&`-chain
masking hazard rather than ignoring it.*

**Root matrix:** `# tests 190 / # suites 28 / # pass 190 / # fail 0 / # skipped 0`.
**lazytopper ops matrix:** exit 0, entitlement 43/43 inside it, chain ran to its last link
(`Mojibake acceptance PASSED (6/6)`). `scope:guard` PRE-`git add` → `SCOPE_GUARD_OK
(mode=auto:tooling, lanes=trackedTooling) inspected=1`. tsc app · tsc test · mojibake · diff --check.

### ★ ONE HONEST CAVEAT IT VOLUNTEERED
`checkSolution.test.cjs` is **unmodified** (empty diff vs trunk; absent from #580's file list) and ran
green **in-chain** — but it **did not isolate a `64/64` count line.** ⇒ *"green in the chain" is
recorded as weaker evidence than "64/64 quoted", which is the correct distinction to draw and the
kind most reports blur.*

**Contradictions with its own spec: NONE.** Its one new finding is `[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]`
— see **D12**, which it materially corrects.

---

## ★★ POST-MERGE FINDINGS — from the owner's live-verification. Full bodies in the CLOSE MEMO
`C:\Projects\LT-wave5a\specs\COFOUNDER_to_CONTROLLER_Wave5A_CLOSE_2026-08-03.md` §3.
*(Never reconstruct an FU body from its id — a plausible-but-wrong FU is harder to detect than a
missing one.)*

### 🛑 LAUNCH-BLOCKING — two, and neither was visible to any gate
- ⚠⚠ **`[FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]`** — the "Choose a Plan" modal sells **Smart Study
  Planner, Daily Focus Mix, Full Analytics Dashboard** and Chapter Hub. ★★ **Study Plan, Daily Mix and
  Dashboard are RETIRED SURFACES** — the standing rule is that a reference to them is evidence of
  **deadness, not liveness**. ⇒ **the paywall is selling four things the product no longer ships, to a
  student being asked for ₹599.** *The anti-fabrication doctrine applied to commerce.*
  **Fix belongs in GATE-2's spec — it replaces this modal — NOT a separate lane.**
- ⚠⚠ **`[FU-AUTH-VERIFY-EMAIL-DELIVERABILITY]`** — the verification mail landed in **Spam**, Gmail
  citing prior spam reports against `lazzyy-topper.firebaseapp.com`. ★★ **A domain-reputation problem
  sitting on a BLOCKING gate**: a new email student cannot enter until they click a link in a folder
  they will not open. **Google and phone bypass it, so it is invisible in owner testing while
  affecting every email student.** Fix = Firebase custom action-handler domain on `lazytopper.com` +
  authenticated SMTP. **Largely owner/DNS work, not an agent lane. Pre-launch blocking.**
  ★ *AUTH-3's spec predicted the spam risk and required the spam-folder prompt; the prompt shipped and
  the deliverability cause did not. The mitigation was right and insufficient.*

### FOR GATE-2's SPEC
- **`[FU-GATE-COPY-STILL-READS-AS-ERROR]`** — the 402 copy is **right** and renders in an **error-red
  box**. ★ **The words passed every wording assertion; the styling is the defect** — PR-F1's lesson
  recurring. Same in the modal's *"Your free trial has ended"*.
- **`[FU-UPGRADE-MODAL-NO-BASIC-EXIT]`** — only "Choose Plan"; **no "Keep using Basic"**. It tells a
  student the product is over rather than what they still have.

### CONFIRMED LIVE (previously inferred)
- **`[FU-PG-DEAD-ENDPOINT-LIVE-503]`** — `/api/user/progress` **503s on every real session** (production
  HAR). PG-1's target, now measured.
- **`[FU-META-CANONICAL-DEAD-DOMAIN]`** — `canonical → https://lazytopper.app/` **live right now**, a
  domain never owned. META-1's target, confirmed in the wild.
- **`[FU-MUTATION-RESTORE-GIT-BLIND-ON-UNTRACKED]`** — the generalised D9 rule. **GATE-1b applied it
  and it worked** ⇒ the doctrine has both a failure and a control.
- ✅ **`[FU-AUTH-GOOGLE-EMAILVERIFIED-LIVE]` — CLOSED.** Measured twice: a live Google ID token decoded
  to `email_verified: true`, and D1 passed in the browser. ★ *AUTH-3 refused to assert this without
  measurement; the measurement now exists and agrees.*

---

## WAVE 5B — THE PLAN. **NOT DISPATCHED.** (Cofounder close memo §6)
1. **GATE-2** — the upgrade sheet. Carries the three modal/copy FUs above. ⚠ **must EXTEND GATE-1's
   existing 402 branch in `aiClient.ts`, not add a second beside it**, or the second silently wins.
   **FORBID-1 has cleared its `SolutionChecker` blocker.**
2. **META-1** — the canonical tag is suppressing search presence **today**.
3. **PG-1** — delete the dead Postgres layer. Server-only; the `server/index.cjs` unwiring must be in
   the **same atomic PR** or the server fails to boot on `require`.
4. **`quality-gate.yml` stale counts** — own small PR. ⚠ **Do NOT touch `CLAUDE.md` — it is correct.**
5. **CI-DOCS** — now unblocked; SUPPLY-1 and FORBID-1 are both merged and closed.
⚠ **BATCH-1b remains BLOCKED** behind `FORBID-2` (QP-OVL bans `quickPracticeSessionService.ts`).
⚠ **Triage the five Dependabot PRs before any `package.json`/workflow lane** — see the observation above.

---

## FU ENTRIES COLLECTED

**GATE-1b (2)**
- ✅ `[FU-GATE1-TEST-NOT-IN-CI]` — **CLOSED**, by quoted before/after grep with a control
- ⚠ `[FU-CI-WORKFLOW-STALE-MATRIX-COUNT]` — NEW. `quality-gate.yml` says `5 suites, 175/175` above a
  step reporting 28/190. **Needs its own PR after #579 closes** — see D12

**AUTH-3 (5)** — bodies in its full report.
- ⚠ `[FU-AUTH-VERIFY-NOT-APP-WIDE]` — the gate is page-scoped; **a restored session bypasses it**
- `[FU-AUTH-GOOGLE-EMAILVERIFIED-LIVE]` — not measured, deliberately; needs a real Google sign-in
- `[FU-AUTH-NAME-PROMPT]` — `/login` can still create nameless accounts (carried from Wave 4)
- `[FU-AUTH-REAUTH-LIVE-UNVERIFIED]` — `requires-recent-login` tested at the code path, not live
- `[FU-AUTH-TWO-CALLS-PER-FAILED-SIGNIN]` — §1's predicted cost, confirmed

**FORBID-1 (5)** — bodies in its full report.
- ⚠ `[FU-CI-TWO-WORKFLOWS-PER-PR]` — **"Lane Overlap" gates nothing; reading it as CI-green is wrong**
- ⚠ `[FU-CONV-GATE-HEADER-STALE-VITEST-CLAIM]` — the header would tell a reader the new tests are worthless
- `[FU-SOLUTIONCHECKER-PROPS-NOT-EXPORTED]`
- `[FU-VITEST-CI-HEAP-CEILING]`
- `[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE]`

**GATE-1 (4)** — bodies in its full report.
- ⚠ `[FU-GATE1-TEST-NOT-IN-CI]` — the 43 entitlement tests are invisible to CI. **Owner decision open.**
- ⚠ `[FU-ENTITLEMENT-TIER-DERIVATION-DUPLICATED]` — the effective tier is a DERIVATION, not a field
- `[FU-GATE1-ANON-FAILOPEN-BYPASS]` — header omission, bounded by the 3/day anonymous cap
- `[FU-MORE-LIKE-THIS-DEAD]` — confirmed dead, as §2 predicted

**SUPPLY-1 (8)** — bodies in its full report; **never reconstruct an FU body from its id.**
- `[FU-SUPPLY1-OWNER-TOGGLES]` — the four actually-disabled settings above. **Highest value here.**
- `[FU-SUPPLY1-DEPENDABOT-PARSE-CHECK]` — the config cannot be validated until it is on the default branch
- `[FU-SUPPLY1-CODEQL-V3-DEPRECATION]`
- `[FU-SUPPLY1-CODEQL-ACTIONS-LANG]`
- `[FU-SUPPLY1-DEPENDABOT-COOLDOWN]` — omitted deliberately as unverifiable
- `[FU-SUPPLY1-STALE-NPM-LOCKFILE]` — `lazytopper/package-lock.json` in a pnpm-only workspace
- `[FU-SUPPLY1-PNPM-CATALOG-SUPPORT]`
- `[FU-SUPPLY1-CODEQL-QUERY-SUITE]` — `results=0` is the default suite only

---

## NOT IN THIS WAVE — dispatch §6. Known blockers, recorded so nobody re-derives them.

- **BATCH-1b — BLOCKED.** `quickPracticeSessionService.ts` is a zero-diff FORBIDDEN entry in QP-OVL.
  Needs `FORBID-2` first, deliberately written alongside it in Wave 5B — *lifting a ban a wave before
  the need is the same error as the blanket ban.*
- **GATE-2** — unblocked by FORBID-1. ⚠ GATE-1 §3D already puts a 402 branch in `aiClient.ts`;
  **GATE-2 must EXTEND it, not add a second beside it**, or the second silently wins.
- **BATCH-2** — needs `ResultsScorecard.tsx`: **two** amendments (CONV + CI-OVL), owner decision.
- **ME-PROGRESS** — a convergence lane, not a build lane. Needs `App.tsx`: **two** amendments.
- **PG-1** — deleting `userProgress.cjs` must unwire seven `server/index.cjs` handlers in the **same
  atomic PR** or the server fails to boot on `require`. Its `DATABASE_URL` half is owner infra.
- **CI-DOCS** — contested with **both** SUPPLY-1 and FORBID-1; runs only after both are merged AND
  closed. ⚠ **Never in Wave 5A.** And it **SPLITS, it does not TRIM**: the wave-closing docs PR is
  the project's ONLY integration run (#574 and #575 reached production having never been compiled
  together — 1,091 and 1,088 tests, then 1,097 on the docs PR, a number neither could produce).
