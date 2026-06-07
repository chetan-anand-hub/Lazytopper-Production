## 2026-06-07 — Post-PR #204 (de-Replit COMPLETE; infra arc closed)

### RESOLVED — D40 (de-Replit PR-B) + D26-arc Replit removal
PR-B merged as **#204** (`5441060`): `@replit/*` packages + `@replit/connectors-sdk` + the 3 non-product
stubs removed atomically with the lockfile regen. Repo is fully `@replit`-free. De-Replit is COMPLETE
(PR-A #199 + PR-B #204). The only Replit-adjacent work left is INFRA-4b (runtime AI-proxy rewiring), tracked
under NEXT_ACTION / the backend deploy — NOT scaffold cleanup.

### STILL OPEN — carry these forward (do NOT lose)
- **[D42, HIGH-VALUE]** add `"packageManager": "pnpm@10.32.1"` to root `package.json` so Corepack enforces ONE
  pnpm everywhere (root cause of the version churn). Small separate PR. Coupled with D43.
- **[D43]** root `preinstall` guard trips on pnpm 11's empty `npm_config_user_agent` on linux — fix before any
  pnpm 11 move.
- **[D44]** ops audits assume `rg` (ripgrep) with no fallback (CI installs it; off-runner they're fragile).
- **[D45]** `feature_file_matrix.mjs` hardcodes owner-local Windows Desktop paths (not CI-portable).
- **[D46, NEW]** `actions/setup-node@v4` uses Node 20 (deprecation track) — bump when convenient.
- **[D31]** `syllabusGuard` generic-phrase blind-spot (polynomials division-algorithm leak) — content debt.
- **Domain** `lazytopper.in` (owner-confirmed) vs the earlier `.app` references — reconcile remaining `.app`
  mentions before the deploy; verify DNS in Vercel before INFRA-4.

## 2026-06-07 — Post-PR #198 (CI activated)

### RESOLVED — D39 (CI relocation + expansion)
CI is now LIVE: `.github/workflows/quality-gate.yml` at the repo root gates the full bar (pnpm frozen
install → root matrix 175/175 → mojibake → linux build → ops matrix) on every PR into trunk + push to it.
Old mislocated `lazytopper/.github/workflows/mojibake-guardrail.yml` deleted. Proven to run AND gate
(probe PR #202 → red on a planted mojibake). Closed by #198 (`9d772cb`).

### UPDATE — D40 (de-Replit PR-B) now UNBLOCKED
PR-B was blocked behind "the #198 lockfile regen". That regen landed as **#201**, and #198's CI proves a
clean `pnpm install --frozen-lockfile` on linux. PR-B is now doable — regen the lockfile in the same linux/
Codespace path #201 used, on **pnpm 10.32.1** (match what CI pins, NOT pnpm 11), and let CI verify. Scope
unchanged (see the #199 section below).

### OPEN — add a `packageManager` pin to root package.json (HIGH-VALUE) [D42]
Root `package.json` declares no `packageManager` field, so different environments resolve different pnpm
versions — the root cause of the #198 pnpm-version churn (Codespace regen used 10.32.1; corepack default
was 11.0.8; pnpm 9/11 mis-handle the lockfile/preinstall guard). Adding `"packageManager": "pnpm@10.32.1"`
makes Corepack enforce ONE version everywhere (CI, Codespace, local). Touches `package.json` (product lane)
→ separate PR. Until then, CI explicitly pins `corepack prepare pnpm@10.32.1`.

### OPEN — root `preinstall` guard is incompatible with pnpm 11 on linux [D43]
The guard `case "$npm_config_user_agent" in pnpm/*)` exits 1 under pnpm 11 on the linux runner because pnpm
11 leaves `npm_config_user_agent` EMPTY for the workspace-root lifecycle script (verified: pnpm 10.32.1 sets
it correctly; pnpm 11 does on Windows-standalone but not linux-workspace-root). Fix the guard (e.g. also
accept an empty agent, or detect pnpm another way) BEFORE any move to pnpm 11. Coupled with D42.

### OPEN — ops acceptance scripts depend on `rg` with no fallback [D44]
`bsre_spike` / `trig_legacy_retire` / `llm_path_audit` / `prediction_bank_health` shell out to `rg` (ripgrep)
and treat "binary missing" identically to "no match" (`(res.status ?? 1) === 1 → []`), silently passing or
failing depending on the check's polarity. CI now installs ripgrep so this is masked, but a node/git-grep
fallback (or an explicit "rg required" assertion) would make them robust off the runner. Low priority.

### OPEN — `feature_file_matrix.mjs` hardcodes absolute Windows Desktop paths [D45]
Lines 11-13 reference `c:\Users\Chetan\OneDrive\Desktop\…\*.docx` — an owner-local `.docx` analysis tool
(`test:feature:file-matrix`) that can only run on the owner's machine; NOT in the CI matrix. If it should
ever be portable/CI-able, make it skip-if-missing or relocate the inputs into the repo. Not blocking.

### OPEN — bump `actions/setup-node@v4` (Node-20 deprecation annotation) [D46]
The CI workflow emits a non-fatal annotation: Node-20 actions are deprecated (forced to Node 24 on
2026-06-16). Bump the action when convenient; not urgent (still runs).

## 2026-06-06 — Post-PR #199 (de-Replit PR-A)

### OPEN — de-Replit PR-B (lockfile-coupled removals) — BLOCKED behind the #198 lockfile regen [D40]
PR-A (#199) removed the lockfile-SAFE Replit scaffold + the dead `lazytopper-app/src` stub. The remainder is
lockfile-coupled and cannot land until the `pnpm-lock.yaml` regen (the #198 blocker) happens in the
linux/Replit env on pnpm 11.x — every item below changes a lockfile input and breaks `pnpm install
--frozen-lockfile` (already red on trunk vs `lazytopper/package.json`; confirmed live during PR-A). PR-B scope:
1. Delete whole workspace packages (all lockfile importers): `artifacts/lazytopper-video/`,
   `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (owner-confirmed non-product Expo native path).
2. Remove `@replit/vite-plugin-*` packages + edit the 3 stub `vite.config.ts` (drop `runtimeErrorOverlay()`
   import/call + the gated cartographer/dev-banner dynamic imports) + drop the 3 `catalog:` entries.
3. `pnpm-workspace.yaml` allowlist cleanup: `stripe-replit-sync` line + `@replit/*` in `minimumReleaseAgeExclude`.
4. Remove the now-orphaned root dep `@replit/connectors-sdk` (its only consumer, `backup-to-drive.mjs`, was
   deleted in PR-A).
5. Reconcile the root `typecheck` (`--filter "./artifacts/**"` still globs the src-less lazytopper-app).
KEEP `artifacts/api-server/` (owner-confirmed real backend). The server Replit AI proxy (Gemini fallback +
the entire Claude path) is a SEPARATE migration (API keys + backend deploy), NOT part of PR-B. Sequencing:
do the #198 lockfile regen first, then PR-B atomic (configs + manifests + lockfile in one).

### OPEN — scope:guard has no lane for infra / `artifacts/**` deletes (coverage gap) [D41]
PR-A's deletes (root scaffold, `artifacts/lazytopper-app/src/**`) all classified `[unclassified]` →
`SCOPE_GUARD_FAIL`, because the boundary policy lanes (`repo_boundary_policy.json`) are anchored to the
`lazytopper/` frame and model no root-level or `artifacts/**` paths. Not a breach (manually verified), but it
means infra/scaffold PRs can't be guard-validated. Follow-up: add an `infra`/`artifacts` lane (or an explicit
`infra` mode) so de-Replit PR-B (and similar) get real classification rather than a blanket FAIL. Governance
JSON deliberately left untouched in PR-A (separate decision).

## 2026-06-06 — Post-PR #196 (3 pre-existing test reds resolved)

### OPEN — CI relocation + EXPANSION (mojibake guardrail mislocated → never runs; activate + gate everything) [D39]
**Finding (corrected twice).** A mojibake guardrail workflow FILE exists at
`lazytopper/.github/workflows/mojibake-guardrail.yml`, but GitHub Actions only runs workflows at the
**repo-root** `.github/workflows/` — this one is in a SUBDIRECTORY, so it has **never executed**
(`gh workflow list --all` and `gh run list` are BOTH empty: zero workflows registered, zero runs ever). It
is dormant. AND even if relocated it ran `npm run check:mojibake` — the 50-capped checker the local gate
also used (now un-capped in #196). So the corruption shipped for TWO independent reasons: CI mislocated
(never runs) + checker blind (cap). The full **test matrix + scope-guard are also not CI-gated** at all.
**This is the right outcome corrected:** the earlier "no CI exists" note was effectively right in OUTCOME,
just because the file is mislocated rather than absent.
**Tracked as its own PR (do NOT slip into a product PR) — relocating activates whole-repo CI gating for the
first time ever, a deliberate infra change with side effects.** That PR should:
1. **First verify the uncapped checker passes clean across ALL of trunk** (it now scans everything for the
   first time — might surface latent corruption anywhere in the repo, not just the two fixed files).
2. **Decide the trigger scope** — the current `on: push: {}` + `pull_request: {}` has no branch filter;
   choose PRs-to-trunk vs all pushes deliberately.
3. **EXPAND, don't just relocate** — since CI is being turned on anyway, gate the full **`test:matrix:all`
   + `scope:guard`** (not only mojibake). Gate everything that matters in one workflow.
Owner-directed scope (2026-06-06).

### RESOLVED — pre-existing test reds fixed (#196) [D38]
The three suites tracked below as D38 are FIXED and GREEN: `test:mojibake` 1/3→3/3 (re-encoded
`circles.proof.ts` + the second corrupted file `maths.caseBased.ts` the diagnosis missed; checker cap
removed so neither stays hidden), `test:prediction:bank-health` 2/4→4/4 (stale → retirement guard + orphan
dead-compute deleted), `test:canonical:generator` 2/4→4/4 (re-pointed to the relocated
`practiceQuestionBuilder.ts`). See CURRENT_STATE / SESSION_LOG (#196) and the residual CI gap in **D39**.

## 2026-06-05 — Post-PR #194 (HPQ Phase 1 — consistency + honesty)

### OPEN — HPQ PHASE 2: content authoring (HIGH; gated `src/data/`, PYQ-sourced, owner-validated) [D36]
Phase 1 (#194) RE-BADGED only — it did NOT add/rebalance content. Phase 2 is the tracked next HPQ task.
Author from real PYQ sources, owner-validated; gated `src/data/` lane (`scope:guard --mode product` + owner
auth). Worklist (from `report-hpq-refinement-audit-2026-06-05.md` §1b/§4/§6 P1+P4):
1. **Missing every-year 5-mk Section-D Long-Answer marquee shapes** — the deepest "same story" gap (Maths
   has effectively ZERO valid 5-mk LA HPQs): Trig Heights & Distances 5-mk LA; Surface Areas
   combination-of-solids 5-mk LA; Statistics grouped-median 5-mk LA; Triangles similarity/BPT proof
   (Section D); Acids/Bases 5-mk LA; Chemical Reactions 3-mk displacement SA.
2. **Distribution re-weight toward must-crack** — lift Circles (2) + Heredity (4) to adequate; trim/re-tier
   the over-stacked sets (Pair of Linear 8, AP 6, Metals 12) so volume over-indexes must-crack and tapers.
3. **`rn-hpq-4` Section-D/4-mark mislabel** — Section D = 5-mk LA in CBSE; the only Maths "Section D" item
   is tagged 4 marks (why Maths reads as zero valid 5-mk LA). Fix label/marks/steps.
4. **Backfill 49 competency `solutionSteps`** — the `*-comp-*` entries carry answer+explanation but no
   step-marked working; bring to §13 CBSE step-marking minimums per section.

### OPEN — HPQ confidence model reconciliation (DEFERRED until a confidence UI is designed) [D37]
P2 (#194) RETIRED the dead `deriveHPQConfidence` call (page shows no confidence UI) but KEPT
`prediction/hpqConfidence.ts` + the optional `confidenceScore?/Band?/Rationale?` type fields. The model is
a format/recency-driven 5-signal score with NO blueprint-weight / tier input, so its bands can contradict
the locked tiers (audit §2: Quadratic/Real-Numbers high-roi out-score must-crack Circles/Polynomials at
0% high). BEFORE any confidence badge ships, re-base `compute5SignalScore` on the Exam-Trends axes
(blueprint-weight + 4-year frequency + §4 sub-pattern recurrence) so a band can never contradict a tier.
Do NOT surface any confidence UI until reconciled. No code wired today, so this is latent, not live.

### NOTE — pre-existing test reds surfaced while validating #194 (unrelated; not introduced) [D38] → RESOLVED in #196
While running the HPQ gates, three acceptance suites were already RED on base (verified absent-on-base /
not in the #194 diff), tracked so they aren't mistaken for HPQ regressions: `test:prediction:bank-health`
2/4 (`HighlyProbableQuestions.tsx` never imported `../prediction/bankHealth` / `buildTopicKeySources` — the
test expects a bank-health summary the page doesn't compute); `test:canonical:generator` 2/4 (PracticePage
unified-generator import/fallback checks); `test:mojibake` 1/3 (mojibake in
`src/data/questionBanks/class10/maths/circles.proof.ts`). **RESOLVED in #196** — see the dated
"Post-PR #196" RESOLVED [D38] entry at the top of this file (mojibake was actually TWO files; the residual
CI-gating gap is now tracked as [D39]).

### RESOLVED — scopeGuard monorepo path-prefix bug FIXED (#192) [D32]
The monorepo path-frame bug (see the #190 block below, "scopeGuard broken by the monorepo move") is FIXED.
Root cause: `.git` at repo root + guard run from `lazytopper/` → `git diff` emits `lazytopper/src/...`
while policy rules are lazytopper-relative (`src/`) → every product edit `[unclassified]` → FAIL.
**Fix (Option A, owner-approved):** `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/−6; policy JSON
untouched) — `detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd;
`toPolicyFrame()` strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the
anchor keep their full git-root path and are STILL classified (real lane, or `unknown` → visible FAIL);
no-blind-spot invariant (fails if classified-count ≠ changed-count); coupled `git show HEAD:./package.json`
(cwd-relative) fix for the scripts-only package.json check.
**⚠️ The `--relative` suggestion was REJECTED:** `git diff --relative` emits only files under cwd → silently
drops tracked changes OUTSIDE `lazytopper/` = a false-PASS blind spot (worse than a false-FAIL). The correct
fix normalizes the classification *frame*, never narrows what the guard sees. Proven FAIL→OK on a product
edit; tracked out-of-tree file still seen+flagged; unclassified → visible FAIL. Gates: tsc 0;
`test:matrix:all` 175/175; build 0; verifier PASS. Trunk `318c6b6`. Follow-ups: D33–D35 below.

### OPEN — scopeGuard: untracked files OUTSIDE `lazytopper/` are invisible (LOW; pre-existing) [D33]
`git diff` (tracked changes) spans the whole repo, so the #192 fix DOES see tracked out-of-tree changes
(exactly the thing `--relative` would have hidden — confirmed in the PR's no-blind-spot proof). BUT
`git ls-files --others --exclude-standard` is **cwd-scoped** by git's design, so **untracked** files
outside `lazytopper/` (e.g. a new file dropped at the repo root) are NOT listed and so not classified.
**Deliberately NOT widened to git-root scope in #192**, because the repo carries an untracked root-level
`.claude/` directory with no policy lane → widening (`git -C <root> ls-files …`) would classify it
`unknown` → a NEW false-FAIL on every run. Trading one false-FAIL for another is not a fix. Revisit only if
root-level untracked lanes are formalized (e.g. add `.claude/` to `localOnly`, THEN widen the ls-files scope).

### OPEN — add scopeGuard unit coverage to the test matrix (LOW; tooling) [D34]
`scopeGuard.mjs` has no automated test in `cd scripts && npm run test:matrix:all` (175/175). It runs
`main()` on import, so a unit test needs an export refactor (guard `main()` behind an `if (import.meta.url
=== ...)` entry check, then export `detectAnchorPrefix`/`toPolicyFrame`/`classifyFile` for testing). #192
relied on live FAIL→OK evidence instead. Add coverage in a future tracked-tooling PR to regression-proof
the path-frame logic.

### OPEN — CLAUDE.md §6 references a stale verifier name (LOW; docs) [D35]
CLAUDE.md §6 validation steps list `node scripts/verify-build.mjs`, which does not exist. The real verifier
is `lazytopper/scripts/verify-production-build.mjs` (used and PASS in #192). Correct CLAUDE.md §6 (and any
agent instructions) to the actual filename so future sessions don't chase a missing gate. (Same gap noted
in the #174/#175/#176 backlog — consolidate.)

## 2026-06-05 — Post-PR #190 (Exam Trends band redesign — 3 collapsible priority bands)

### RESOLVED (by #192 — see Post-PR #192 block above, D32) — scopeGuard broken by the monorepo move
The repo is now a pnpm monorepo (`workspace`) with `.git` at the repo root and `lazytopper/` nested.
`lazytopper/scripts/scopeGuard.mjs` runs `git diff --name-only` (no `--relative`), so git emits
`lazytopper/src/...` while the `product` lane rule in `repo_boundary_policy.json` is `src/`. Result:
EVERY `lazytopper/src/**` product edit is classified `[unclassified]` and the guard FAILs — it currently
green-lights nothing and reds everything in `lazytopper/src`, so it is not a real gate. Observed on #188
and again on #190; both manually verified as non-breaches. ~~Fix (tracked-tooling PR): either pass
`--relative` to the git invocations in `scopeGuard.mjs`, or prefix the policy `product`/`trackedTooling`
lane rules with `lazytopper/`.~~ **FIXED in #192 via path-frame normalization (Option A); the `--relative`
half of this suggestion was REJECTED as a false-PASS blind spot.**

### RESOLVED — re-derive Exam Trends priorities FRESH (was D27) → owner-locked tiers
~~Topic-level priority data stale/untraceable; re-derive tier/trend/marks before the band redesign.~~
DONE: the owner-signed-off `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` (composite model +
2 teacher overrides) is the fresh, traceable basis. Consumed by #190. D27 CLOSED.

### RESOLVED — Exam Trends band-threshold definition → not a computed threshold
~~The band redesign needs explicit numeric/qualitative thresholds mapping tier/trend/marks to a band.~~
RESOLVED by design: bands are owner-signed-off DATA (the locked doc), transcribed verbatim and keyed by
slug — there is NO computed threshold, and nothing is banded on stale data. Closed by #190.

### CARRIED — HPQ-count recheck (MEDIUM)
#190 kept the existing honest HPQ matching (`getHighlyProbableQuestions`, canonical-name match) unchanged;
the locked tiers doc did not alter HPQ data. Counts were not separately re-validated against the new
tiering — still open as a small data-quality recheck. Bundle with any future Exam Trends data pass.

### CARRIED — Exam Trends band screenshots (LOW; PR evidence)
The 360/768/desktop × Maths/Science band-state screenshots specified by the task were deferred (owner
declined for now). Capture on request to complete the #190 evidence packet.

### OPEN — Exam Trends proof tag (LOW; product decision) — carried
The locked prototype's optional "⟨proofs⟩" tag is still omitted (no real `proof` field; inventing it =
fabrication). To add it: add a real `proof` flag to topic data (gated `src/lib/desktop/` lane → explicit
scope) or drop it from the spec.

## 2026-06-04 — Post-PR #188 (content sweep merged; gating syllabusGuard GREEN)

### OPEN — syllabusGuard generic-phrase blind-spot + polynomials teach-contract leak (MEDIUM; follow-up) [D31]
The board-prep surface scan omits bare generics (e.g. "Division Algorithm") to stay false-positive-free,
so out-of-scope content named only by a generic term is not flagged. Concrete leak left untouched by the
#188 sweep (out of the 93-item worklist): the `polynomials` tutor contract in
`src/tutor/topicTeachContracts.ts` (~:79/:87/:91) still teaches the polynomial **division algorithm**
(out of the QUADRATIC-only Polynomials scope for 2026-27). Follow-up: (a) add a precise phrase like
"division algorithm for polynomials"/"polynomial long division" to `SURFACE_BANNED_PHRASES` (carefully,
no over-match), then (b) sweep the polynomials contract. See DISCOVERIES D31.

### RESOLVED — CONTENT SWEEP: the 93-item worklist (DONE #188) [D26/D28 → CLOSED]
~~The CONTENT cleanup remains — the gating guard is RED on a 93-item worklist.~~ **DONE in #188.**
Deleted/rewrote all 93 items: banks Conversion of Solids ×46 (canonical 6520→6474, spreads intact);
surfaces EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/competency/config/trends/topics/
topicHubContent + the tutor contracts. DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate;
marked in-syllabus teach-steps where the `keyIdeas` 4-tuple required them. Gating `syllabusGuard` exits
0, `test:matrix:all` 175/175 (incl. #19). `syllabusGuard.ts`/`predictionTypes.ts` untouched. Trunk
`e0395fc`. D26 (verify → correct guard → sweep) is fully CLOSED. Residual generic-phrase gap → D31 above.

### OPEN — PYQ `solutionSteps` data-quality cleanup (MEDIUM) [D30]
Some PYQ questions carry truncated/garbled `solutionSteps`. Independent of the syllabus sweep — a
later data-quality pass; do NOT bundle into the content sweep. See DISCOVERIES D30.

### OPEN — Notes/Formula template sign-off (product) — carried
The TopicHub concept-spine + Formula Sheet / NCERT Notes rollout needs owner sign-off on the template
BEFORE generation: (a) notes structure; (b) granularity (per-[Concept] vs per-topic); (c) 1 vs 3
worked examples per concept. Define before the Formula/Notes content-generation PR.

### OPEN — stale-branch cleanup (housekeeping) — carried
Delete merged/abandoned remote branches: `feat/syllabus-guard-correct-and-extend` (merged via #186),
`feat/438-mobile-parity`, `feat/desktop-phase-3`, `feat/desktop-pr-e`, + the ~7 stragglers from #180.
(CLAUDE.md forbids auto branch deletion — owner-side cleanup.)

### OPEN — clean banned syllabus content from unguarded files + extend syllabusGuard (SUPERSEDED by #186) [D26]
~~`syllabusGuard` scans the question bank only; banned terms survive in `topicTeachContracts.ts`,
`topics.ts`, `class10ContentConfig.ts`, `practiceFilters.ts`.~~ The EXTEND-guard half is DONE (#186) —
the guard now scans these surfaces. The CONTENT cleanup is the sweep above. See DISCOVERIES D26/D28.

### OPEN — re-derive Exam Trends priorities FRESH (tier + trend + marks) [D27]
Topic-level priority data is stale/untraceable (old 10-yr data + pre-revision syllabus). Re-derive
must-crack/high-roi/good-to-do tier + trend + ~marks against the CURRENT CBSE syllabus + recent paper
pattern (scientific basis) BEFORE the band redesign. See DISCOVERIES D27.

### OPEN — HPQ-count recheck (MEDIUM)
The Exam Trends HPQ counts (from `getHighlyProbableQuestions`, matched by canonical topic name) are
rendered honestly but were not re-validated against the fresh tiering. Re-check counts when the
priority data is re-derived (bundle with D27).

### OPEN — Exam Trends band-threshold definition (after fresh tiering)
The planned Must-crack / High-ROI / Good-to-do BAND redesign needs explicit numeric/qualitative
thresholds that map a topic's (re-derived) tier/trend/marks to exactly one band. Define AFTER the
fresh tiering (D27) lands — do not band on the stale data. See DECISION_LOG (2026-06-03 #184).

### OPEN — Exam Trends proof tag (LOW; product decision)
The locked prototype's optional "⟨proofs⟩" tag was omitted in #184 (no real `proof` field in topic
data; inventing it = fabrication). To add it: either add a real `proof` flag to the topic data
(forbidden `src/data/`/`src/lib/desktop/` lane → explicit scope) or drop it from the spec.

### RESOLVED (by #192, D32) — scopeGuard ergonomics for product PRs (LOW; tooling)
`npm run scope:guard` defaults to `--mode tooling`; product PRs need `--mode product`. ~~Latent path
quirk: `git diff` is repo-root-relative (`lazytopper/...`) while `git ls-files` is cwd-relative
(`src/...`) and the policy lanes are unprefixed (`src/`), so product PRs only classify cleanly with a
cwd-relative diff.~~ The path quirk is FIXED in #192 (`toPolicyFrame` normalizes BOTH `git diff` and
`git ls-files` output into the policy frame). `--mode product` now classifies `lazytopper/src/**` cleanly
without any `diff.relative` workaround. The stale-verifier note (`verify-build.mjs` → real name is
`verify-production-build.mjs`) is now tracked as its own follow-up [D35] above.

### CARRIED FORWARD (unchanged from below)
interactive-handoff wrong-visual fix; mobile concept-tutor wiring; Formula Sheet + NCERT Notes
generation + correctness pass; AI cost/rate-limit hardening (D25); Daily Mix keep/cut; Dashboard→
Home/Me consolidation; 3/19 backlog_1_19 known-red-by-decision; stale-branch triage (PR #180 parked);
check-solution T4 boundary case; #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts`
lane). See sections below.

---

## 2026-06-03 — Post-PR #182 (tutor visible + teaching LOCKED)

### RESOLVED — tutor teaching quality (#181 wiring + #182 LOCKED style)
Teaching is now direct/no-fluff/on-concept with a step-marking offer; on "yes" it self-solves with
per-step `[½/1 mark]` CBSE marking (math verified). Owner live-verified. See DECISION_LOG / D24.

### OPEN — interactive-handoff returns the WRONG visual (MEDIUM; separate PR)
`findVisualForConcept` returned a Height-&-Distance visual when "standard angles" was opened. Must
return the visual for the OPENED concept or NOTHING. B2 already stopped the teach prompt from
narrating "the interactive" — but the visual-selection bug itself is unfixed. Its own PR.

### OPEN — mobile concept-tutor not wired (MEDIUM; separate PR)
Mobile `src/pages/app/TopicHub.tsx` "Learn" is a placeholder routing to Check & Improve — it is NOT
wired to the concept_teach drawer (only desktop is, via #181). The teach PROMPT (#182) already covers
mobile once wired (shared backend). Wire mobile "Learn" → ConceptTeachDrawer in a follow-up.

### OPEN — Formula Sheet + NCERT Notes generation + correctness pass (NEW direction)
Per-topic static Formula Sheet + NCERT-based summary Notes (pre-generated) to right-size the tutor.
Needs a content-correctness pass before shipping. Sequenced into the TopicHub redesign.

### OPEN — AI cost / rate-limit hardening (launch gate) [D25]
Gemini 429 "prepayment credits depleted" hit during testing. Before the student link: add rate
limiting on the gateway, leaner call patterns, and a cost ceiling. Bundle with the Railway deploy.

### CARRIED FORWARD (unchanged)
Daily Mix keep/cut; Dashboard→Home/Me consolidation (3 hardcoded `/dashboard` landings); 3/19
backlog_1_19 known-red-by-decision; stale-branch triage (PR #180, still parked); check-solution T4
boundary case (eval-set note); #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts`
lane). See sections below.

---

## 2026-06-02 — Post-PR #178 (grading-prompt tightening)

### RESOLVED — check-solution over-classifies as "conceptual" (#178) [D21]
Grading prompt tightened + measured 6/9→8/9 on the T1–T9 matrix; D21/T1 robustly fixed
(silly, never conceptual×2), T7 (missing→null) + T8 (unbalanced→presentation) also fixed,
T2 stays conceptual. See DECISION_LOG (2026-06-02 #178) and DISCOVERIES.md D21.

### OPEN — check-solution T4 boundary case (LOW; eval-set note)
When a student writes the verification VALUES but omits the −b/a comparison, the grader is
~50/50 between `presentation` (attempted-but-format-short) and `missing` (step omitted), even
at temp 0.15 — both defensible; marks always 2.5/3; NEVER conceptual. Accepted as Option 1
(documented). Track in the 40–60-answer eval set; revisit only if it causes student confusion.

### CARRIED FORWARD (unchanged) from post-#176
Daily Mix keep/cut; Dashboard→Home/Me consolidation (SES-04/PRG-03); Mistake Intelligence
wiring; #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts` lane); the
3/19 backlog_1_19 reds (known-red-by-decision). See entries below.

---

## 2026-06-02 — Post-PR #176 (scope:guard re-armed)

### OPEN — Daily Mix keep/cut (owner decision pending)
Daily Mix is alive + premium-gated (`/daily-mix/:grade/:subject`), a daily-habit PRACTICE
surface (streak/resume/mastery) — NOT one of the four hooks and NOT mistake/spaced-repetition-
driven. Candidate to retire like the session-player was. Owner KEEP/CUT decision needed.

### OPEN — Dashboard→Home/Me-Progress consolidation (Track A) — 3 hardcoded /dashboard landings
The product has NO Dashboard (retired → Home + Me/Progress), but the repo still hardcodes
`/dashboard` as the post-login landing in 3 places (`Login.tsx` fallback ~L594, `HomeRedirect`,
`RootEntry` mobile). Desktop `/` is correct; login-fallback + mobile still go to `/dashboard`.
Fix all three in the consolidation. (The `?redirect=`/`from` priority is already correct — only
the bare-login FALLBACK is wrong.) SES-04 + PRG-03 resolve here.

### OPEN — Mistake Intelligence not yet wired to Me/Progress (future PR)
"Me/Progress shows real memory-intelligence data" is the INTENDED state, not current. Separate
future PR; do not present it as done.

### OPEN — Backlog from #176 (gate hygiene)
- `test:repo-boundary` 1/5: `vitest.config.ts` is tracked but matches no policy lane
  (`all_tracked_files_classified`). Add it to the `product`/`trackedTooling` lane (or fix the
  rule) — deferred.
- `verify-build.mjs` missing from this checkout (CLAUDE.md §6 references it; stale — same gap
  flagged in #174/#175).
- `ci:smoke` downstream steps (build / tutor:eval / lint:ci) unevaluated in #176 (out of scope).
- **Wire `ci:smoke` into CI** so a broken gate fails loudly — the deeper fix (D23); today it runs
  only locally, which is exactly why `2081003` broke a live gate silently.

### CLOSED — 3/19 acceptance reds = known-red-by-decision (do NOT re-investigate)
All 3 are intentional product changes: SES-04 (session-player deleted `b891597` → `/daily-mix`),
PRG-03 (Dashboard rebuilt `c1afcd3` → `TopicMasteryGrid`), PRG-02 (dropped in 8025→700 rewrite
`428e3ac`; TopicHub is the Track A target). SES-04 + PRG-03 resolve in the Dashboard→Home/
Me-Progress consolidation; PRG-02 in the Track A TopicHub redesign. See DECISION_LOG 2026-06-02.

### NOTE — Locked specs are owner/architect-held, NOT in repo
`LazyTopper_Learn_Flow_Spec_LOCKED.md`, `LazyTopper_TrackA_PR_Breakdown.md`,
`LazyTopper_Mistake_Scenario_Map.md` are referenced but not committed here — referenced, not
fabricated. Commit under `handoff/` if the next session needs them as source of truth.

---

## 2026-06-01 — AI gateway live (local) + PR #174 (check-solution parse fix)

### OPEN — check-solution OVER-classifies mistakes as "conceptual" (MEDIUM → PR B) [D21]
Real repro `sol2.jpeg`: a sign-misread from a correctly-factored expression (`(x−4)(x+2)`,
root read as −4 not +4) was tagged CONCEPTUAL — should be SILLY (method understood). The
propagated downstream error (wrong sum-verification) was double-counted as a SECOND
conceptual mistake instead of attributed to the single root-cause slip. Fix = PR B
grading-prompt tightening, MEASURED vs a mistake-scenario matrix. Do NOT hand students a
live link until classification is trustworthy. See DISCOVERIES.md D21.

### RESOLVED — check-solution "could not evaluate" parse bug (PR #174) [D20]
gemini-2.5-flash truncated/wrapped its JSON under maxOutputTokens:2500 with no JSON mime →
unparseable → misleading "clearer image" fallback. Fixed: responseMimeType:'application/json'
+ token cap 2500→8000 + warn-log + honest message. Measured before/after on real images.

### RESOLVED — local dev AI features looked broken (proxy port) [D19]
Vite proxies /api to API_SERVER_PORT||8080, not the gateway's :3001. Start Vite as
`API_SERVER_PORT=3001 npx vite`. Gateway + Vite run separately; nothing auto-spawns the
gateway. See DISCOVERIES.md D19.

### OPEN — verify-build.mjs / "137 guards" referenced but absent in this checkout (LOW)
CLAUDE.md §6 and the A2 instruction reference `node scripts/verify-build.mjs` and a "137
guards" verifier; neither exists at those paths in this checkout. The real build gate is
`npm run build` (Vercel command), which passes. Reconcile CLAUDE.md with the actual repo, or
restore the verifier, so future sessions don't chase a missing gate.

### OPEN — LOCKED specs referenced but not committed to the repo (LOW)
LazyTopper_Learn_Flow_Spec_LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md (and any
New-Session-Brief / Master-Knowledge index) are owner/architect-held and NOT in this repo.
This handoff references them but cannot link to in-repo copies. Commit them under handoff/ if
the next session needs them as the source of truth for Track A/B.

### OPEN — Clerk pk_test_→pk_live_, DPDP/consent for minors, charge path (at student-link time)
Surfaced by the owner clarifications. Resolve before the public student link, alongside the
Railway deploy. Not blockers for PR B (local).

---

## 2026-06-01 — Post-PR #172 (mobile Home polish)

### RESOLVED — mobile /browse was the plain PR-#168 layout, not the locked polish (PR #172)
Rebuilt MobileHome to the owner-locked design (illustrated gradient SVG icons, orient-
before-act order, persistent hints, inspiring SAMPLE Mistake-Intel panel, honest CTA).
Real data only; signed-in Mistake-Intel uses an honest empty state (no invented counts).

### RESOLVED — green browser-chrome banner + near-black 3-tab BottomNav (PR #172)
theme-color #58cc02→navy #0f1b33; BottomNav recoloured to light grammar + 3→5 tabs.

### RESOLVED — double brand bar on signed-out mobile (PR #172 addendum, Option A)
Global public navbar now suppressed on mobile /browse + /welcome via
isMobileSelfChromedRoute (!isDesktop-gated). Each mobile page shows ONE brand bar.

### ACCEPTED CONSEQUENCE — Search dropped from mobile Home (owner-approved)
The global navbar carried Search + Log in; suppressing it on mobile /browse removes the
Search box from mobile Home. Owner approved; NOT re-added. Search remains inside the
product. Revisit only if mobile users need top-level search on Home.

### OPEN — legacy/superseded routes flagged for a deprecation PR (MEDIUM)
From the #172 §D audit (flag-only, nothing deleted): /dashboard→/me, /trends→/exam-trends,
/practice/:g/:s→/practice-hub still resolve to real legacy pages and remain live signed-in
entry points (RootEntry/HomeRedirect send signed-in users to /dashboard). /profile,
/ai-mentor, /mentor, /topic-mock already redirect. /predictive-papers + /highly-probable
= candidate canonical home for a future dedicated Predicted destination (currently routed
via /exam-trends). Separate future PR after owner review.

### OPEN — legacy #58cc02 brand palette (LOW, separate colour-migration PR)
styles.css (~50 hits), styles/tokens.css (--lt-brand-*), favicon.svg, og-image.svg still
use the Duolingo-green #58cc02; the new grammar green is hsl(152,55%,45%). Large blast
radius — deprecate as a dedicated colour-migration PR, not mid-polish.

### OPEN — Predicted card shares the /exam-trends route with "What scores most" (LOW)
Per the canonical-routes constraint, both the trends card and the Predicted card route to
/exam-trends (where the predicted breakdown lives). A future dedicated Predicted page
(/predictive-papers) would split them. Honest today (no fake data); noted for awareness.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-31 — Post-PR #170 (mobile landing)

### RESOLVED — /welcome landing had no mobile layout (PR #170)
Added MobileWelcome (swipe carousel, frozen v4 art) + a viewport switch at /welcome.
Welcome.tsx untouched. Honest trial copy enforced (test asserts "then paid" absent).

### PROCESS — "frozen design" file referenced but absent (carry-forward lesson)
The PR-C prompt pointed at PR_C_mobile_landing.md + carousel_cards_v4_genz.html, which
were not on disk. Correct handling = STOP and request the file; do NOT invent locked
art. Owner supplied PR_C_frozen_carousel_art.md; used verbatim. Apply to future
"frozen design" PRs.

### OPEN — MobileWelcome dot indicator relies on scroll (LOW)
Active-dot tracking uses an onScroll handler (jsdom has no layout, so the test asserts
the scroll-snap CSS contract + 4 dots, not pixel position). Fine on real devices;
noted for awareness.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-31 — Post-PR #168 (mobile Home)

### RESOLVED — /browse cockpit squeezed on mobile (PR #168)
DesktopHome rendered at /browse at all widths with non-reflowing grids. PR #168 added
MobileHome (single-column, on the PR-A primitives) and a viewport switch at /browse.
Desktop render byte-identical. First grammar-primitive consumer (resolves the
"primitives not yet wired into any page" item from #166).

### OPEN — Other DesktopHome grids still desktop-only on mobile-reachable routes? (LOW)
MobileHome covers the /browse Home cockpit. If any OTHER signed-in mobile route ends
up rendering DesktopHome (it currently doesn't — RootEntry redirects mobile), it would
need the same treatment. No action now; flagged for awareness.

### OPEN — Quick-generate fallback derivation duplicated in MobileHome (LOW)
MobileHome re-derives fallbackGrade/fallbackSubject with the same logic as DesktopHome
(a few lines; uses the same real landingMemory). If it grows, lift into a shared hook
(candidate for the PR C usePracticeHub-style extraction pattern). Not fake data.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #166 (grammar primitives)

### RESOLVED — No shared responsive primitives for the mobile work (PR #166)
Pages hand-rolled inline-styled grids with no mobile reflow. PR #166 added
`src/components/grammar/` (Card, TileRow, Pill, SectionHeader) so page reflows (PR B+)
reuse one consistent contract. TileRow reflow is pure CSS (@media max-width:1023px).
Wired into no page yet.

### OPEN — Grammar primitives not yet wired into any page (expected; PR B+)
The primitives exist and are tested but unused. PR B (Mobile Home) is the first
consumer. Until pages adopt them, the live mobile squeeze (e.g. DesktopHome 4-card
row) persists. Tracked in the staged UI roadmap.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #164 (blackbox decommission)

### RESOLVED — Dead blackbox/tracker/pmem tooling removed (PR #164)
The entire dead "memory blackbox" experiment (blackbox + contextpack + tracker
family + pmem-runner + the project-memory-blackbox-ext stub + blackbox.yml + 20 npm
scripts) was removed. No live import existed in src/server/ops. Repo-wide refs now 0.

### RESOLVED — False-green `npx tsc --noEmit` in start:quick / precommit:check (PR #164)
start:quick now runs `npx tsc -p tsconfig.app.json --noEmit && npm run build`;
precommit:check removed; startSafe.mjs fixed to the same real typecheck. The bare
`npx tsc --noEmit` (always exit 0 because root tsconfig has `files: []`) is gone from
the convenience scripts.

### OPEN — Two hook dirs coexist (LOW, cosmetic)
Repo has both root `.githooks/pre-commit` (Windows-metadata cleaner) and
`scripts/githooks/pre-commit` (now lint-only after #164). `hooks:enable` points to
`scripts/githooks`. Consider consolidating to one hook dir in a future cleanup.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #162 (production-build hotfix)

### RESOLVED — Test files swept into the production app compile (PR #162)
PR #160's render-test files (src/test/*) import dev-only packages. tsconfig.app.json
had no `exclude`, so `tsc -b` (Vercel's build) compiled them. Green locally (devDeps
present) but breaks on Vercel where devDeps are pruned (TS2305). Fixed by adding an
`exclude` array to tsconfig.app.json. Vercel preview + production deploy both GREEN.
Lesson locked: gate UI/build PRs on the REAL `npm run build`, not bare
`tsc -p ... --noEmit`; and Vercel preview check is a valid pre-merge prod-build gate.

### OPEN — False-green `npx tsc --noEmit` in start:quick / precommit:check (MEDIUM → scheduled)
Still present. NOW SCHEDULED as part of PR 0.5 (blackbox decommission): rewrite
`start:quick` to `npx tsc -p tsconfig.app.json --noEmit && npm run build`, and drop
the dead blackbox/contextpack chain from both scripts. See NEXT_ACTION.md.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #160 (render-test infrastructure)

### RESOLVED — No render-test mechanism in lazytopper/ (PR #160)
The app package had no Vitest/Jest, no Testing Library, no jsdom, no `*.test.tsx`,
no `test` script. PR #160 installed it (Vitest 3.2.4 + Testing Library + jsdom),
scoped `vitest.config.ts` `include` to `src/` so the scripts/ guard suite is never
touched, polyfilled `window.matchMedia` in `src/test/setup.ts`, and proved it with
one green smoke test. Future UI PRs can now ship real proof-of-work render tests.

### OPEN — False-green `npx tsc --noEmit` in start:quick / precommit:check (MEDIUM)
`start:quick` and `precommit:check` call bare `npx tsc --noEmit`, which always
exits 0 (false pass) in this repo. Real app typecheck is
`npx tsc -p tsconfig.app.json --noEmit`. Deliberately left as-is in #160 (out of
scope); slated for the blackbox-decommission PR.

### OPEN — Test-tooling adds dev-dependency tree (LOW, informational)
`npm install` for #160 added 717 packages; `npm audit` reports pre-existing
vulnerabilities in the wider dev tree (none introduced by #160 are actionable in
scope — dev-only test tooling, not shipped to the app bundle).

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it. Add
to `.gitignore` in a future docs-only PR.

---

## 2026-05-26 — Post-PR #150 + #151 (PYQ 2024 Maths re-run + permanent tagging/filter/step-marks fix)

### CLOSED — ISSUE-001 Practice type filters broken (PR #151)
Symptoms (pre-fix):
  - Competency chip returned 0 questions
  - Proof chip returned only 2 questions out of 70+ proof items in bank
Root causes:
  - `isCompetencyBased` not forwarded in CanonicalQuestion → PracticeQuestion mapping
  - Proof predicate matched `fmt.includes("proof")` but format strings are
    "Long"/"Short" since PR #112 (field value "Proof" was retired)
Fix (PR #151):
  - Added `isCompetencyBased: (q as { isCompetencyBased?: boolean }).isCompetencyBased`
    to the mapping in practiceQuestionBuilder.ts:268
  - Broadened Proof predicate at L2 and L3: PRF IDs + `prove that` / `show that` /
    `derive ` anchored text + subtopic regex (proof|identit|tangent.propert|
    geometric.proof) + Long/Short + Analysing + Section C/D safety net
  - Added Section A + Remembering override (3 sites) so recall questions
    never qualify as Competency
  - L2 soft fallback removed — honest empty state when no questions match

### CLOSED — ISSUE-002 Step marks hidden for canonical bank questions (PR #151)
Symptom: "Step marks are hidden because this solution is a guide" banner
showed for all multi-step bank questions, hiding per-step CBSE marks.
Root cause: hasUnsafeWrittenStepMarks fired whenever step marks didn't sum
to the question total, including for valid bank questions.
Fix (PR #151): Added `isCanonicalBankQuestion` boolean
(id present + not "ai-" prefix + solutionSteps non-empty + marks > 1) and
short-circuited hasUnsafeWrittenStepMarks to false for canonical questions.
AI question safety net preserved (still fires for AI questions with mismatched step marks).

### RESOLVED — ISSUE-003 Mojibake in NCERT/Exemplar files
Probe scan (PR #151 session) of all *.ncert.ts + *.exemplar.ts files in
maths/ and science/ returned **0 mojibake hits**. Files were already clean
(likely fixed by a prior PR before this session). No action needed.

### NEW OPEN — ISSUE-006 Hindi PYQ garbled question in bank (P0 — must fix before launch)
Symptom (from PR #151 smoke test on Vercel preview): one PYQ question
renders garbled Devanagari script transliterated to ASCII patterns
(`OgHo$`, `_mZ`, `H$m`, `bE 2 sin`).
Root cause: Hindi-medium PYQ paper extracted without language detection;
Devanagari mojibake'd to ASCII.
Priority: P0 — renders broken text to students
Fix (next small PR — combine with ISSUE-007):
  - Branch: fix/remove-hindi-garbled-pyq
  - Search command:
    Select-String -Recurse -Path "lazytopper\src\data\questionBanks\class10" `
      -Include "*.ts" -Pattern "OgHo|_mZ|H\$m|bE 2 sin"
  - Identify question ID, remove from source pack file

### NEW OPEN — ISSUE-007 Proof filter catches Section A conceptual questions (P0)
Symptom (from PR #151 smoke test): "In a proof, from which side do you start?"
(a Section A recall MCQ about proof technique) appears in Proof filter results.
Root cause: PR #151's broadened Proof predicate matches subtopic keywords
("proof"/"identit"/"tangent.propert") even when the question itself is a
Section A recall MCQ ABOUT proofs, not a proof exercise.
Priority: P0 — pollutes Proof filter with recall questions
Fix (one line each in two files — combine with ISSUE-006 in same small PR):
  Add at TOP of Proof branch in practiceQuestionBuilder.ts (~line 485) and
  PracticePage.tsx (~line 290):
    const qSection = String((q as { section?: unknown }).section ?? "");
    if (qSection === "A") return false;
Branch: fix/remove-hindi-garbled-pyq (combined PR)

### NEW OPEN — ISSUE-008 VSA-format doctrine decision (P1)
96 questions in the bank use `format: "VSA"`:
  - 90 in Section B + 2 marks
  - 6 in Section A + 1 mark
These aren't covered by the 7 section×format migration rules in PR #151.
"VSA" (Very Short Answer) is a legitimate CBSE format but doesn't map cleanly
to the current filter chips. Decisions needed:
  - Should VSA questions appear under "Short" in filter chips, or as a separate chip?
  - Should A+VSA+1mk be retagged to A+MCQ+1mk + force options? (only if options exist)
Defer until post-launch UX review.

### Session learnings (carry forward)

- **Smoke test on Vercel preview is mandatory** for filter/UI changes before merge.
  Several violations only surfaced in real usage that audits missed.
- **Section A excluded from Proof predicate**: conceptual questions about a
  technique should never match the technique's own filter.
- **Pack builder group-default section assignment** is the root cause of
  wrong-section questions, not filter code.
- **Hindi-medium PYQ files** can contain garbled Devanagari script —
  extraction scripts must detect and skip non-English content.
- **stash → rebase → pop** is the correct sequence when base advances during agent work.
- **Section×format migration** (Option B Rule 7) is repeatable for future audits;
  script at C:\Users\Chetan\OneDrive\Desktop\diff\fix_section_format_migration.mjs

### Decisions recorded this session

1. **Filter system redesign (next sprint)**: 2-layer default/advanced
   ("Competency" → "Application & Scenario", Section labels → Mark labels,
   Difficulty moves to advanced panel, Source filter added,
   Section A excluded from Proof)

2. **Pack quality strategy (launch)**: Option B — remove structural outliers
   for launch (Section D + Remembering recall questions, Section A + Short
   without MCQ options), regenerate from stricter prompts post-launch

3. **Academic calendar alignment (confirmed)**: Launch first week of June 2026.
   Primary use case at launch: chapter-by-chapter practice + worksheet generation.
   Filter complexity not needed until September (PT1 season). Full timed mock +
   advanced filter system needed before October (half-yearly).

4. **Tagging doctrine for future content**:
   `isCompetencyBased: true` ONLY if real-world context OR AR/Case format OR
   Analysing+ Bloom — NOT just "Bloom ≥ Applying".
   Proof filter: Section A questions NEVER qualify regardless of subtopic.
   Section assignment: must be per-question editorial judgment, not group default.

---

## 2026-05-25 — Post-PR #137 (P4-S PYQ Science 111 Qs; **P4 phase complete: 214 board PYQs**)

### RESOLVED — P4-S PYQ Science extraction (PR #137)
13 new `science/{topic}.pyq.ts` files + canonicalQuestionBank.ts registration.
111 verbatim CBSE 2022-23 board questions across 9 text-extractable QPs
(31/2/x, 31/4/x, 31/5/x) + 4 matching MS files (X_086_31_x_MS_UNSIGNED_ALL SETS,
each covering all 3 sets — split by Paper Code: 31/x/y marker). Section A=37 /
B=23 / C=29 / D=15 / E=7; competency 85.8% avg (range 56-100%); engine
isPYQQuestion() recognises 111/111 via `pyqYear: "2023"` path. Authentic
2,587 → 2,698; spreads 189 → 202; bank 5,415 → 5,526.

### RESOLVED — P4 PYQ phase complete (PR #135 + PR #137)
**214 verbatim CBSE 2022-23 board PYQs across all 26 retained Class 10
topicKeys** (13 Maths + 13 Science). All 214 engine-recognised as PYQ via
populated `pyqYear` path. Authentic progress: 2,484 → 2,698 = **60.0% of
4,500-Q retirement threshold**.

### LOCKED — Pipeline scripts reusable for P4 continuation
P4-M (`p4_*.py`) and P4-S (`p4s_*.py`) pipeline scripts kept in `diff\`.
Reusable for P4 continuation years (2023-24, 2024-25, 2025-26). Key adaptations
locked in P4-S that carry forward:
  - MS "ALL SETS" bundle splitting by Paper Code marker
  - MCQ answer fallback (look up option value from QP when MS gives only letter)
  - Science page footer (`H N H`) stripping
  - Deleted-topic filter coverage (Periodic Classification, Evolution, Sources
    of Energy, Mgmt Natural Resources, Motor/EMI/Generator)

### LOCKED — Permanent PYQ Science source decisions (do not re-evaluate)
P4-S session probed and PERMANENTLY documented:
  - **2022-23 Science USED**: 9 QPs extracted (31/2/x, 31/4/x, 31/5/x)
  - **2022-23 Science skipped — require OCR**: 31/1/1, 31/1/2, 31/1/3, 31/6/1,
    31/6/2, 31/6/3 (scanned image-only PDFs, 0 chars).
  - **Within-paper losses (unavoidable without OCR)**: ~60 questions with
    Hindi-only body, ~50 truncated bodies, 3 broken-option MCQs.

### NEW — `final MS` folder unlocks P4 continuation (HIGH priority, multiple years)
Path: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS`
Contains: official CBSE marking schemes for 2022-2026 (all years).
Unlocks P4 continuation passes for years previously stalled on missing MS.

  - **2023-24 Maths** (13 QPs) + **Science** (7 QPs) — ~230 Qs potential
    Fresh branches: `content/p4-pyq-maths-2024`, `content/p4-pyq-science-2024`
    pyqYear: "2024"
  - **2024-25 Maths** (9 QPs) + **Science** (9 QPs) — ~200 Qs potential
    Fresh branches: `content/p4-pyq-maths-2025`, `content/p4-pyq-science-2025`
    pyqYear: "2025"
  - **2025-26 Maths** (23 QPs) + **Science** (13 QPs) — ~300 Qs potential
    Fresh branches: `content/p4-pyq-maths-2026`, `content/p4-pyq-science-2026`
    pyqYear: "2026"

After typical filter rate (~30-40%): **300-400 more verbatim PYQs estimated**.
Pre-req: probe `final MS` folder first to verify file naming convention and
QP→MS pairing (may differ from 2022-23 series).

### OPEN — K2H-8f-c add `isPYQ?: boolean` to CanonicalQuestion type (LOW, **next active**)
Adds `isPYQ?: boolean` to `predictionTypes.ts`. Small PR (one line in the type
+ one-line backfill script setting `isPYQ: true` on all 214 P4-M + P4-S
questions). Once landed, engine isPYQQuestion() recognises PYQs via BOTH the
field AND the pyqYear path (redundant but explicit). Not blocking content
extraction (engine already recognises 214/214 via pyqYear).

### OPEN — K2H-8f UI wire-up (LOW-MEDIUM, **next active**)
Branch `fix/k2h-8f-ui-wire`. File: `practiceQuestionBuilder.ts`. Add
`pyqOnly?: boolean` to builder argument type, pass through to engine's
`generatePracticeSet({ ..., pyqOnly })`. Engine accepts since PR #133; bridge
currently doesn't pass it. Required before PYQ filter chip is end-to-end
usable in practice surface.

## 2026-05-25 — Post-PR #135 (P4-M PYQ Maths 103 Qs)

### RESOLVED — P4-M PYQ Maths extraction (PR #135)
13 new `maths/{topic}.pyq.ts` files + canonicalQuestionBank.ts registration.
103 verbatim CBSE 2022-23 board questions across 9 text-extractable QPs
(30/2/x, 30/4/x, 30/5/x) + matching MS 041_30-x-x marking schemes.
Section A=48 / B=15 / C=22 / D=15 / E=3; competency 100%; engine isPYQQuestion()
recognises 103/103 via `pyqYear: "2023"` path. Authentic 2,484 → 2,587;
spreads 176 → 189; bank 5,281 → 5,415.

### LOCKED — `isPYQ` field omission via pyqYear path (P4-M doctrine, also for P4-S)
P4-M instruction Section 3 said "isPYQ: true on ALL". The `CanonicalQuestion`
type in `predictionTypes.ts` does NOT include `isPYQ?: boolean` yet, and that
file is globally forbidden per CLAUDE.md §4. Resolution locked: **omit `isPYQ`
field entirely; populate `pyqYear: "2023"` (or appropriate year) instead**.
PR #133's `isPYQQuestion(q)` helper recognises both paths — 103/103 verified.
**Apply this approach to P4-S Science extraction too.** Once K2H-8f-c follow-up
adds `isPYQ: true` to the type, a one-line script can backfill it across all
P4-M + P4-S files. Don't fight the type system.

### LOCKED — Permanent PYQ Maths source decisions (do not re-evaluate)
P4-M session probed and PERMANENTLY documented these source-availability facts:
  - **2022-23 Maths used**: 9/16 QPs extracted (30/2/x, 30/4/x, 30/5/x).
  - **2022-23 Maths skipped — require OCR**: 30/1/x, 30/6/x, 30-B-5 (scanned
    image-only PDFs; pymupdf returns 0 chars).
  - **2023-24 Maths deferred — MS download needed**: `24 math 1/2/3.pdf` series
    exists locally but no matching MS on disk. Download MS from cbse.gov.in,
    then resume as P4-M continuation.
  - **Within-paper losses (unavoidable without OCR)**: 48 questions where pymupdf
    returned only Hindi-script body; 41 questions with math-symbol-heavy truncated
    bodies; 18 MCQs with broken option sets (duplicates from lost minus signs).
    Total 107 of 342 raw question instances skipped to preserve anti-fabrication.

### OPEN — P4-S PYQ Science extraction (HIGH, **next active task**)
Fresh branch `content/p4-pyq-science`. Sources: `31_x_x.pdf` Science QPs +
`X_086_31_x_MS` marking schemes (confirmed on disk in
`...\CBSE Previous papers\2022-2023\SCIENCE\`). ~150-200 Qs expected after
similar quality filters. ID prefix `PYQ-S-2023-{TOPIC}-{NNN}`. File naming
`science/{topic-slug}.pyq.ts`. Pipeline scripts in `diff\` are reusable:
swap Maths topic classifier for Science; update ID prefix and topic-short
table in `p4_generate_ts.py`; probe FIRST to identify scanned-PDF skips.
Same doctrine as P4-M (pyqYear via isPYQQuestion; pyqSet "1"/"2"/"3";
Section E one-row case-based; anti-fabrication; broken-MCQ filter; skip
deleted topics — Periodic Classification, Evolution, Sources of Energy,
Management of Natural Resources, Motor/EMI/Generator).

### OPEN — 2023-24 Maths MS download then P4-M continuation (LOW)
Manual step: download missing 2023-24 Maths marking schemes from cbse.gov.in.
Once on disk, extract another ~50-100 Qs from the `24 math 1/2/3.pdf` series
as P4-M continuation (separate fresh branch).

### OPEN — K2H-8f-c add `isPYQ?: boolean` to CanonicalQuestion type
Adds `isPYQ?: boolean` to `predictionTypes.ts`. Small PR (one line). Unblocks
setting `isPYQ: true` on P4-M + P4-S files via one-line backfill script. Not
blocking content extraction (engine already recognises via pyqYear).

## 2026-05-25 — Post-PR #132 + #133 (P3 Science chapter-wise; K2H-8f PYQ engine fix)

### RESOLVED — P3 Science chapter-wise extraction (PR #132)
13 new `science/{topic}.chapterwise.ts` files + canonicalQuestionBank.ts
registration. 552 questions (252 MCQ from cbjescco + 300 PYQ-style from
cbjesccq). Sources: www.cbse.online / rava.org.in. All 13 retained Class 10
Science topics covered; ch05/14/16 skipped per 2026-27 doctrine. ID prefixes
SCO-S-*/SCQ-S-*. Authentic 1,932 → 2,484; spreads 163 → 176; bank 4,729 → 5,281.

### RESOLVED — K2H-8f PYQ engine filter (PR #133)
Engine-layer hard pyqOnly filter landed; `isPYQQuestion(q)` helper honours
both explicit `isPYQ: true` and populated `pyqYear`. 435 pyqYear-tagged
questions now correctly returned. Test matrix 125 → **134/134 PASS**.
**P4 PYQ extraction unblocked at engine layer.**

### LOCKED — MCQ competency doctrine (CBSE 2026-27)
PR #132 locks this: MCQ defaults to `isCompetencyBased: true` because option
discrimination requires concept application above pure recall (CBSE 2026-27
doctrine). Pure-recall MCQs starting with Define/Name the/List the/Recall/
Match the stay false. Use for all future MCQ extractions.

### LOCKED — Permanent source decisions (recorded in CURRENT_STATE.md)
P3 session probed and PERMANENTLY SKIPPED these sources (anti-fabrication
or quality blockers). Future sessions should NOT re-evaluate:
  - Meridian (no marking-scheme PDFs)
  - NODIA (MS hosted externally on URL)
  - cbjemacq (Sinhala glyph corruption confirmed by probe)
  - Maths Basic 430-x-x (out-of-Standard scope)
  - Chapterwise SOL Aakash (scanned, needs OCR — deferred phase)
  - Old\ folder (superseded duplicates)

### OPEN — K2H-8f UI wiring follow-ups (MEDIUM, 3 small PRs)
PR #133 fixed the engine layer; three UI-side connections remain. Each
independent — can ship separately or bundled.
  a. Wire `pyqOnly` through `practiceQuestionBuilder.ts` (UI-engine bridge)
  b. Fix engine-to-UI mapping that strips `pyqYear`/`isPYQ` fields
  c. Add `isPYQ?: boolean` to `CanonicalQuestion` in `predictionTypes.ts`
Until these land, the engine filter works but the UI chip can't reach it
cleanly. Not blocking P4 content extraction.

### RESOLVED — P4-M PYQ Maths extraction (now PR #135 — see above)
Was OPEN; closed by PR #135 (2026-05-25). 103 verbatim Qs extracted from
9 text-extractable QPs. See top of this file for details and P4-M source
decisions locked.

### OPEN — P4-S PYQ Science extraction — see top of this file
Now the next active task. Same doctrine as P4-M (pyqYear via isPYQQuestion).

### OPEN — Pre-launch quick wins (carry-over from PR #130 cycle)
Still queued, unchanged:
  1. strategyHint Hint button in PracticeQuestionCard (Small)
  2. "Show visual" wiring fix in TopicHub right rail (~20 lines)
  3. Formula sheet tab on TopicHub for 14 seeded topics (Medium)
  4. API gateway fix — vercel.json /api/* rewrite + Railway deploy (High)

### OPEN — Maths chapter-wise (LOW priority, future phase)
`cbjemaco` series (MCQ-only, clean per earlier probe) available but would
add mostly Section A density. Defer unless B/C/D/E coverage from P4 PYQs
proves insufficient.

### OPEN — Chemistry `$` arrow rendering in chapter-wise files (LOW, cleanup)
PR #132 caveat: pymupdf renders `→` as `$` in cbjescco/cbjesccq source
(e.g. `Cu(s) + 2AgNO3(aq) $ Cu(NO3)2(aq) + 2Ag(s)`). Content verbatim from
PDF — anti-fabrication preserved. Optional future cleanup pass could
substitute `$` → `→` where safe, but risks corrupting valid `$` uses.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~135 cumulative questions tagged (PRs #126 + #128 + #130 + #132). Plan
unchanged: Option B (placeholder images) at launch; Option A (SVG renders)
post-launch. PR #132 added ~70 to the backlog from chapter-wise heuristic.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, UNBLOCKED)
P2 APQ + P3 Science chapter-wise complete; AR density pass unblocked.
Target: 2-3 AR per topic for Maths + Science. Source: existing CBSE PDFs
with AR coverage not yet extracted.

### OPEN — Our Environment density (LOW, healthy now)
48 Qs in bank: PR #128 seeded 4 + PR #130 added 4 + PR #132 added 40
chapter-wise. Density now reasonable; no urgent extraction needed.

### OPEN — TopicHub seeded coverage backfill (MEDIUM, content)
11/25 TopicHub topics still on sample-preview. Pre-launch content work.

### OPEN — Branch fix-up incident lesson (LOW, process)
PR #132 session had a silent mid-session branch switch (P3 commit landed
on wrong branch initially, recovered with `git branch -f`). Cause unclear
(possibly VSCode auto-switch). Lesson: verify `git branch --show-current`
before each commit when multiple branches are in flight.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1"). P4 PYQ
extraction should use the same convention; cleanup pass deferred to P5.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked `.claude/` shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

---

## 2026-05-25 — Post-PR #130 (P2 APQ Science-PQ2; P2 APQ COMPLETE) open items

### RESOLVED — P2 APQ Science-PQ2 extraction (PR #130)
13 Science topic files APPENDED with Science-PQ2 (+49 Qs). 10 OR-pairs as
separate rows; 13 REQUIRES-FIGURE tags. Section breakdown A=20 B=8 C=9 D=6 E=6;
competency 81.6%. No new files; canonicalQuestionBank.ts untouched. Authentic
count 1,883 → 1,932. Bank total (engine-confirmed) 4,729.

### RESOLVED — P2 APQ phase COMPLETE
PRs #119 + #126 + #128 + #130 together extract **284 authentic Qs across 5
official CBSE practice papers** (SQP, PQ1, PQ2, PQ_2022, Science-PQ, Science-PQ2).
All 13 retained Maths topicKeys and all 13 retained Science topicKeys now have
APQ content.

### RESOLVED — content/additional-pq-sqp-2024 branch DELETED (remote + local)
Branch had been squash-merged 4 times (PRs #119, #126, #128, #130), each cycle
requiring a `--force-with-lease` push after rebase onto the new base. Branch
deleted permanently. **Doctrine update applied:** future extraction phases use a
fresh branch name per phase (e.g. `content/p3-meridian`, `content/p4-cbjemaco`).
This eliminates the force-push requirement permanently.

### RECORDED — Tutor / content audit findings (read-only report)
Report: `diff\report-tutor-content-audit-2026-05-24.md`. Key findings now
recorded as new product-PR follow-ups (below).

### OPEN — strategyHint never rendered on any surface (LOW, quick win — promoted)
75 question banks contain authored `strategyHint` content (including all 65
REQUIRES-FIGURE descriptions). No UI surface displays them. Add a "Hint" toggle
in `PracticeQuestionCard` (or equivalent) that reveals `q.strategyHint` when
present. Small product PR.

### OPEN — "Show visual" button broken in TopicHub right rail (LOW, quick win)
Button currently a no-op or routes incorrectly. Wire to the existing visualiser
surface for the active topic. ≈20 lines product PR.

### OPEN — No formula sheet surface (MEDIUM, quick win)
14 topics have seeded formula data in archetypes/predictions but no UI renders
it. Add a "Formulas" tab beside Notes/Practice on TopicHub for those 14 topics.
Medium product PR.

### OPEN — API gateway gap in vercel.json (HIGH, production blocker)
No `/api/*` rewrite in `vercel.json`. AI features return 404 in production. Fix
requires Vercel rewrite + Railway deploy of the backend. High-effort product PR.

### OPEN — P3 Meridian extraction (HIGH, next content task)
~475 Qs across Meridian worksheets + Maths QB (both on disk in gdrive copy).
**New fresh branch:** `content/p3-meridian` (no reuse — per branch-management
doctrine update above). First step: pymupdf cid probe on Meridian PDFs
(3rd-party publisher; cid behaviour not yet tested). Split across 2 agents
(Maths topics / Science topics). ID prefixes: `MRD-*`, `MQB-*`. Same OR-pair +
REQUIRES-FIGURE doctrine as P2 APQ.

### OPEN — TopicHub seeded coverage backfill (MEDIUM, content)
11/25 TopicHub topics still on sample-preview (1 additional topic seeded since
PR #128 noted 12). Pre-launch content work.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~65 cumulative APQ questions (PR #126 + #128 + #130) tagged REQUIRES-FIGURE.
Plan: Option B (placeholder images) at launch; Option A (SVG renders)
post-launch.

### OPEN — Our Environment density (LOW, future extraction)
8 Qs in bank (PR #128 seeded 4 + PR #130 added 4 more). Approaching reasonable
density; future extractions should add more.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, now UNBLOCKED)
P2 APQ phase complete, so the dedicated `.assertionReasoning.ts` extraction
pass is unblocked. Target: 2-3 AR per topic for both Maths and Science.

### OPEN — Content + product deliberation (MEDIUM, pre-launch planning)
Continued from PR #128 cycle: Notes per chapter, Formula sheets (now partially
addressed by quick-win above), Proof library, Tutor drawer audit
(MentorSolveDrawer / ConceptTeachDrawer / TutorDrawerV2). Pre-launch decisions
required.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1"). Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked `.claude/` shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

---

## 2026-05-25 — Post-PR #128 (P2 APQ continuation) open items

### RESOLVED — P2 APQ continuation (Maths PQ_2022 + Science-PQ) (PR #128)
13 Maths topic files updated with PQ_2022 (+44 Qs). 13 new Science topic files
created from Science-PQ (+46 Qs). All 13 retained Science topicKeys now
have APQ content. Authentic count 1,793 → 1,883.

### RESOLVED — Our Environment had 0 questions in question bank (PR #128)
Carry-over since PR #122 noted Our Environment was registered in topics.ts
but had no bank content. PR #128 added 4 Our Environment questions (3 Section
A + 1 Section B) from Science-PQ. Topic is now seeded; future passes can add
more density.

### CONFIRMED — B/C/D/E density doctrine works (PR #128)
PR #126 (PQ1+PQ2) had B=10, C=12, D=8, E=6 = 36 non-A questions. PR #128
applied the BOTH-OR-variants rule and got B=15, C=15, D=10, E=6 = 46 non-A
questions for similar paper volume. ~28% improvement. Doctrine working —
apply to all future extractions.

### OPEN — Science-PQ2 deferred (HIGH, next session)
P2 APQ finale paper. ~39 Qs + OR variants ≈ 45-50 Qs. Will APPEND to the 13
existing Science topic files (per "one file per topic, combined across papers"
spec). Same branch `content/additional-pq-sqp-2024`, rebase first onto
028d51d3... Text pre-extracted to `diff/_apq_text/`. Agent instruction file
`LazyTopper_Agent_P2_APQ_SciencePQ2_Instruction.md` ready; SHA placeholder
needs updating to current base before upload.

### OPEN — Content + product deliberation (MEDIUM, pre-launch planning)
New deliberation opened in PR #128 cycle — these are pre-launch product
decisions, not content extractions:
  - Notes per chapter (beyond exam tips) — no current surface
  - Formula sheets per topic — data exists in archetypes, no render surface
  - Proof library — proofs exist in P0/P0.5 packs, no dedicated surface
  - Tutor drawer audit — MentorSolveDrawer / ConceptTeachDrawer /
    TutorDrawerV2 don't receive student attempt data; decide keep / repurpose
    / remove before launch
Schedule planning session before next product PR.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~52 cumulative APQ questions (PR #126 + #128) tagged REQUIRES-FIGURE in
strategyHint. Plan: Option B (placeholder images) at launch; Option A (SVG
renders) post-launch.

### OPEN — Our Environment density (LOW, future extraction)
4 Qs is a starting density. Future extractions should add more. Sources
available: NCERT Ch 13 (renamed from Ch 15), Exemplar, future PYQs.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
Unchanged. AR coverage still thin across both Maths and Science. Dedicated
`.assertionReasoning.ts` extraction pass scheduled after P2 APQ completes
(Science-PQ2). Target: 2-3 AR per topic.

### OPEN — TopicHub SEEDED 13/25 only (MEDIUM, content authoring)
Unchanged. 12 topicKeys with bank content do not yet have curated TopicHub
pages. Pre-launch decision required.

### OPEN — strategyHint not rendered on any surface (LOW, quick win)
Unchanged. Many questions have valuable strategyHints (especially REQUIRES-
FIGURE descriptions and CBSE step-marking guidance) but no UI surface renders
them. Quick UI win pre-launch.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix
before P5 PYQ extraction.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1") rather
than short form. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production.

---

## 2026-05-25 — Post-PR #126 (P2 APQ Maths PQ1+PQ2) open items

### RESOLVED — P2 APQ Maths PQ1+PQ2 extraction (PR #126)
13 new `.additionalPQ.ts` files (one per Maths topic) created with 76 questions
combined from Mathematics-PQ1.pdf + Mathematics-PQ2.pdf. All 13 retained Maths
topicKeys covered. Anti-fabrication maintained; isPYQ false on all 76; pyqSet
omitted; Section E case-based as one row marks=4. Authentic count 1,717 → 1,793.

### LOCKED — Pack retirement threshold REVISED (4,500 from 6,000)
New decision in PR #126 cycle. Rationale: 5,000+ authentic is sufficient for
CBSE Class 10 prep. At 4,500 authentic, retire all AI packs (~2,815 Qs). Bank
becomes 100% authentic + 100% routable. No OCR phase needed.
Current progress: 1,793 / 4,500 = 39.8%.

### LOCKED — REQUIRES-FIGURE doctrine (PR #126)
Questions referencing PDF diagrams/tables/graphs that don't render in text
tag with `strategyHint: "REQUIRES-FIGURE: [description]"`. ~22 questions in
PR #126 carry this tag. Resolution path: Option B (placeholder image) at
launch, Option A (SVG render) post-launch.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~22 Maths APQ questions in PR #126 + likely many more in upcoming Science APQ
extraction. Plan: enumerate post-launch, batch-resolve via either placeholder
images (faster) or SVG renders (higher quality). Track in a dedicated
follow-up issue when count grows.

### OPEN — B/C/D/E density gap (MEDIUM, doctrine-blocking)
Section A (MCQ/AR) over-represented across all extractions to date. PR #126
showed 40:36 A:non-A split. Future extractions MUST extract BOTH OR variants
for B/C/D/E sections to double non-MCQ density. Bake into all future
extraction agent instructions starting with P2 APQ continuation
(PQ_2022 + Science).

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
AR coverage thin across all extractions. Dedicated `.assertionReasoning.ts`
extraction pass scheduled after P2 APQ completes. Target: 2-3 AR questions
per topic for both Maths and Science. Source: NCERT/Exemplar/APQ/SQP PDFs
with AR coverage we haven't extracted yet.

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Unchanged since PR #124. Our Environment chapter is in scope (Unit V, 5 marks);
topicKey `our-environment` is registered in topics.ts; but question bank has
0 questions tagged to this topicKey. Needs future content extraction covering
food chains, trophic levels, ecosystem interactions, pollution, waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post syllabusGuard 2026-27 doctrine fix (PR #124) open items

### RESOLVED — syllabusGuard incorrectly banned Our Environment subtopics (PR #124)
14 Our Environment ecology strings (Our Environment, Ecosystem, Food Chain,
Food Web, Biodegradable, Non-Biodegradable, Ozone Depletion, Ozone Layer,
Biological Magnification, Energy Flow, Trophic Levels, Trophic Level, Waste
Management, Environmental Problems) removed from Science banned list. Our
Environment is RETAINED in 2026-27 (Unit V, 5 marks, ecology scope).

### RESOLVED — syllabusGuard incorrectly banned Contraception/STDs (PR #124)
12 reproductive-health strings (Reproductive Health, Contraception, Family
Planning, STI, STDs, Sexually Transmitted Infections/Diseases, Barrier
Contraception, Contraception Methods, Reasons for Contraception,
Contraceptive Methods, Birth Control Methods) removed from Science banned
list. Reproductive health is RETAINED in 2026-27 (Ch 8 board scope).

### RESOLVED — 18 reproduction questions wrongly removed in PR #121 (PR #124)
All 18 questions restored from git history at pre-PR #121 commit `0222917e`.
Subtopics retagged to 2026-27-compliant values:
  - "Safe Sex and HIV/AIDS" for STD/HIV/safe-sex content
  - "Family Planning" for contraception/family-planning content
  - "Reproductive Health" for general reproductive-health content

### RESOLVED — Motor/Generator/EMI not tracked in archetypes (PR #124)
New `SCIENCE_DELETED_CHAPTERS_2026_27.formativeOnlyTopics` array added with
["Electric Motor", "Electromagnetic Induction", "Electric Generator"]. These
topics are taught in 2026-27 but not assessed in the year-end board exam
(Science_SecP1_2026-27.pdf Note for Teachers). Tracked in the prediction
engine; NOT banned in question bank (preserves the 36 formative practice
questions in magneticEffects.exemplar/pack1/pack2).

### RESOLVED — Sources of Energy doctrine cleanup (PR #124)
Sources of Energy was previously matched only as a subtopic-keyword fallback
under Our Environment. PR #124 promoted it to a proper `deletedTopics` entry
in cbseHistoricalArchetypes (Ch 14 is fully deleted from board scope). The
subtopic-keyword fallback was retained as a belt-and-suspenders measure for
any legacy questions still tagged with topic="Our Environment".

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Our Environment chapter is in scope (Unit V, 5 marks), the topicKey
`our-environment` is registered in topics.ts with weight 4, but the question
bank currently has 0 questions tagged to this topicKey. Needs future content
extraction (NCERT Ch 13 of the new numbering, or Ch 15 of legacy numbering)
covering food chains, trophic levels, ecosystem interactions, pollution, and
waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public
launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post-PR #121 open items

### RESOLVED — Reproduction bank syllabusGuard violations (PR #121)
The long-running V1 validation failure carried across PRs #117, #119, #120 is now fixed.
Removed 18 questions across the 3 reproduction banks (4 exemplar + 3 ncert + 11 pack2)
covering deleted Ch8 sub-topics (Reproductive Health, Contraception, STDs).

### RESOLVED — syllabusGuard compound-variant gap (PR #121)
3 questions used compound subtopics ("Barrier Contraception", "Contraception Methods",
"Reasons for Contraception") that slipped past the exact-match guard despite being
entirely about banned topics. Guard extended with these 5 strings (3 actual + 2 defensive
forward-looking variants: "Contraceptive Methods", "Birth Control Methods").

### RESOLVED — Reproduction bank regression coverage (PR #121)
35-test regression suite added at `scripts/src/reproductionBankGuard.test.ts`
(banned variants flagged + retained subtopics clean + substring safety +
multi-banned counted + repo-file regression lock). Wired into both `test:reproduction`
standalone and `test:matrix:all` (now 3 test files, 74 tests total).

### OPEN — ops/ acceptance test: Our Environment chapter assertion (MEDIUM, carry forward)
Unchanged since PR #117. `lazytopper/scripts/ops/cbse_registry_2026_27_acceptance.mjs`
(lines 26-30 EXCLUDED_CHAPTER_TITLES; lines 208-218 our_environment_chapter_present_in_scope
assertion) and `lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts` (lines 226-249
"food chains under Our Environment NOT zeroed") still contradict the doctrine that
Our Environment is fully deleted per CBSE 2025-26. Now the highest-priority follow-up.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged questions;
PYQ filter returns 0 results when `pyqOnly===true`. Must fix before P5 PYQ extraction.
Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet rather than
the short form ("1"|"2"|"3"). Non-blocking — field is string | undefined. Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore in a future
docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
AI features return 404 in production because vercel.json has no /api/* rewrite.

---

## 2026-05-23 — Post-PR #114 open items

### OPEN — Mojibake in P0.5 case-based + circles proof files (HIGH priority, UI render broken)
Files affected:
  lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts
  lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts
  lazytopper/src/data/questionBanks/class10/maths/circles.proof.ts
Symptom: UTF-8 multibyte sequences rendered as Latin-1 garbage in questionText,
solutionSteps, answer, finalAnswer, explanation, strategyHint. Examples:
`â–³` (should be `△`), `âˆ¥` (`∥`), `âˆš` (`√`), `Â²` (`²`), `Î©` (`Ω`),
`â‚‚` (`₂`), `â†’` (`→`), `Â°` (`°`), `âˆ ` (`∠`), `â‚¹` (`₹`).
Origin: inherited from diff/ source pack files; not introduced by P0.5 merge script.
Action: PRE-P1 byte-level replacement pass. Branch `content/fix-p05-symbol-restoration`,
Low mode, data-only, ~30 min. Must merge BEFORE P1-M (Practise Papers extraction will
produce the same class of garbage if the recipe isn't established first).
Reference: NEXT_ACTION.md has the full replacement table.

### OPEN — pyqSet format inconsistency (LOW priority, carries forward from PR #112)
Still applies. The P0.5 case-based + circles proof files also use full CBSE set codes
(e.g. "30/1/1") in pyqSet rather than the short form ("1"|"2"|"3") that will be used
in P5 PYQ extraction. Non-blocking — field is string | undefined. Normalise during P5
cleanup pass across:
  triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts (P0)
  triangles.proof.ts, trigonometry.proof.ts (P0)
  science.assertionReasoning.ts (P0)
  maths.caseBased.ts, science.caseBased.ts, circles.proof.ts (P0.5)

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
Unchanged from post-PR #112. practiceSetGenerator.ts does not bias pool toward
pyqYear-tagged questions; PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction. Branch: fix/pyq-engine-bias | Mode: Medium.

### OPEN — .claude/ folder not in .gitignore (LOW priority)
Unchanged. Add to .gitignore in a future docs-only PR. Do NOT stage it for any commit.

### RESOLVED — P0.5 pack registration (PR #114)
21 questions registered from 3 diff/ pack files:
  maths.caseBased.ts: 6 Section E case sets (4 marks each; merged from 18 split sub-rows)
  science.caseBased.ts: 5 Section E case sets (4 marks each; merged from 15 split sub-rows)
  circles.proof.ts: 10 (5 Section C Short 3-mark + 5 Section D Long 5-mark)
topicKey normalisation complete (8 keys across 3 files).
"format": "Proof" → "Short"/"Long" applied to circles.proof.ts only (case-based files
use format="Case-Based" which is valid).
Mid-flight V2 blocker (33 mark/section mismatches) resolved via Option 2 restructure:
each split 3-row case set merged into one 4-mark Section E row. Owner-directed.
All 6 validations PASS. Merged as PR #114.
Authentic total: 1,609 → 1,630.

---

## 2026-05-23 — Post-PR #112 open items

### OPEN — P0.5 probe pending (LOW priority, quick win)
Three diff/ pack files not yet probed or registered:
  maths_case_based_pack.ts (~23.8 KB)
  science_case_based_pack.ts (~24.8 KB)
  circles_proof_pack.ts (~18.5 KB)
Expected pattern: same topicKey title-case issue as P0. Same fix.
Expected yield: ~30-80 questions (Section E case-based + circles proofs).
Action: Low mode agent, branch content/register-diff-packs-p05.

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
practiceSetGenerator.ts does not bias pool toward pyqYear-tagged questions.
PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction — otherwise PYQ questions won't surface
via the PYQ filter even after extraction.
Branch: fix/pyq-engine-bias | Mode: Medium

### OPEN — pyqSet format inconsistency (LOW priority, cleanup)
AR files registered in PR #112 use full CBSE set codes ("30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3") that will be used in P5 PYQ extraction.
Non-blocking — field is string | undefined. Normalise during P5 cleanup pass.
Files: triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts

### OPEN — .claude/ folder not in .gitignore (LOW priority)
The .claude/ IDE state folder is untracked (shows in git status).
Add to .gitignore in a future docs-only PR.
Do NOT stage it for any content commit.

### RESOLVED — Pass 1C gdrive unprobed folders
All 6 unprobed gdrive subfolders assessed. Key findings:
  Science/Chapter-wise/: ~1,422 net new Qs — added as P4b to extraction queue
  cbse-papers/PYQ/: 26 READY papers, ~784 net new Qs
  Science/NCERT Examplers 2020/: 100% duplicate — permanently skip
  misc/: English literature only — permanently skip
  Maths/PYQs/: all Basic — permanently skip
  Sample+Preboard: ~199 PDF-extractable Qs — added as P6

### RESOLVED — P0 pack registration (PR #112)
62 questions registered from 4 diff/ pack files.
topicKey normalisation complete.
"format": "Proof" schema issue found and fixed (→ "Short"/"Long").
All 6 validations PASS. Merged as PR #112.

## 2026-05-23 — Post-PR #109 open items

### OPEN — Pack quality audit required (HIGH)
~2,470 existing pack1/pack2/pack3 questions are AI-generated without
source PDF verification. quality-assessment-report.md (in diff folder)
has full details. Decision needed: keep/fix/replace strategy.

### OPEN — PYQ extraction pending
87 text-extractable CBSE papers available (2023/2024/2025).
extraction-report.md documents 220 Triangles+Trig questions already
extracted with symbol stripping issues.
Separate sessions needed: Maths PYQ + Science PYQ.

### OPEN — assertion_reason_pack.ts not yet registered
File exists at C:\Users\Chetan\OneDrive\Desktop\diff\assertion_reason_pack.ts
Needs schema validation and canonicalQuestionBank.ts registration.

### OPEN — K2H-8f PYQ filter engine fix
practiceSetGenerator.ts does not bias pool toward pyqYear questions.
PYQ filter returns 0 results. Fix after PYQ extraction completes.

### RESOLVED — Maths ch1-14 NCERT+Exemplar extraction
643 questions across 26 files. All wired into engine. PR #109 merged.

### RESOLVED — PR #108 deletionGuard test fix
3 broken assertions fixed. All 29 tests passing.

---

## 2026-05-22 — PR #106 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — re-extracted from correct PDF, but extra eyeball wise)
Priority: **Medium**

### OPEN — PR numbering correction

Handoff previously recorded Science ch8-12 as PR #104.
Actual GitHub PR numbers: **#106** (content) and **#105** (handoff docs).
Priority: **Low** (documentation only)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted, wired, and engine-reachability verified.
PRs #105 (docs) and #106 (content) merged. Base SHA: `dfbf725a362b11a4113ec63f4ecebbaa792848a3`.

---

## 2026-05-22 — PR #104 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Owner should verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — original agent generated 27 questions from training data before mislabelled source was caught; file deleted and re-extracted from correct PDF, but extra eyeball is wise)
Priority: **Medium** (pre-merge)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted across 10 files and wired into `canonicalQuestionBank`. All 5 topicMatches() routing simulations pass against actual topics.ts slugs. Engine reachability live-import test: 296/296 PASS.

### RESOLVED — Ch 13 "Our Environment" inclusion question

Confirmed deleted from CBSE 2026-27. Not extracted. Existing legacy `ourEnvironment.pack1.ts` / `.pack2.ts` retained but not added to.

### RESOLVED — Slug mapping in original Ch8-13 prompt

Original prompt proposed `heredity-and-evolution` and a shared `light-reflection-and-refraction-incl-human-eye-prism` slug for Ch9+Ch10. Neither exists in `topics.ts`. Per Rule 2 (use topics.ts verbatim), all new files use the actual canonical slugs: `heredity`, `light-reflection-and-refraction`, `human-eye-and-colourful-world`, `electricity`, `magnetic-effects-of-electric-current`. Engine routes correctly.

---

## 2026-05-22 — PR #101 + #102 follow-ups

### OPEN — `deletionGuard.test.ts` needs updating

3 assertions in `scripts/src/deletionGuard.test.ts` (lines 110-130) now fail after PR #102 populated `MATHS_DELETED_CHAPTERS_2026_27`. Fix in next small PR before any `pnpm test` run.
Priority: **High** (blocks clean CI)

### OPEN — CI not using pnpm (syllabusGuard never runs in CI)

Both GH Actions workflows use npm; root `preinstall` rejects npm. `syllabusGuard` only runs on manual `pnpm build` locally.
Fix: update workflow yml to use pnpm setup + `pnpm build`.
Priority: **Medium** (post-launch)

### RESOLVED — Clerk OAuth 404 on Vercel preview deployments

Fixed by PR #101. `forceRedirectUrl` now uses full absolute URL with BASE_PATH prefix. Verified working on Vercel after merge.

### RESOLVED — 608 Science ch1-7 questions invisible to engine

Fixed by PR #102. All 608 questions now wired into the canonical bank.

### RESOLVED — topicKey mismatch for Control & Coordination and Reproduction

Fixed by PR #102. Both files retagged to canonical `topics.ts` slugs.

### RESOLVED — Maths syllabus guard missing Constructions chapter

Fixed by PR #102. `syllabusGuard.ts` and `cbseHistoricalArchetypes.ts` both updated and now in sync.

---

## 2026-05-22 — PR #100 follow-ups (post engine wiring + topicKey fixes + syllabus guard patch)

### OPEN — Maths question bank empty (no NCERT/Exemplar extraction yet)

All 13 Maths topics have only pack1/pack2/pack3 questions. NCERT + Exemplar extraction pending (`content/question-bank-expansion-03`).
Priority: **High** (pre-launch content depth)

---

## 2026-05-17 - PR #82 Login polish follow-ups and PR-K2H-6 next stage

Status:
Active follow-ups after PR-K2H-5 / PR #82 merge.

Observation:
PR #82 passed validation and owner Vercel preview QA for the production Login gate. Login now better aligns with the frozen landing and Lovable/topic-focus-lite LoginGate visual/composition direction while preserving real Clerk SignIn, reason-aware prompts, redirect priority, safe redirects, no guest CTA, and no app shell/sidebar/bottom nav.

Action:
- Production launch still requires Clerk production instance / `pk_live` env configuration. Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture a Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control and should not be described as fixed by app UI polish.
- PR-K2H-6 is the recommended next implementation stage: Home/cockpit learning order + Continue repair.
- K2H-6 should make Home/browse cockpit order match Exam Trends -> Practice -> Worksheets -> Check & Improve.
- K2H-6 should repair "Continue where you left off" so it never routes to TopicHub "Topic not found"; if the topic is not curated, hide the continue card or route safely to Practice Hub / Exam Trends with honest state.
- Do not touch landing, Login, pricing, Practice internals, HPQ, or TopicHub content unless a future K2H-6 prompt explicitly scopes it.
- Do not start PR-K2H-6 until this docs-only handoff update is merged.
- Future product prompts must use `base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

Parked PRs:
- PR #69 solution provenance / student notices remains open draft and must not be mixed.
- PR #17 diagnostic categories remains open draft preservation-only and must not be mixed.
- Old mobile PRs #1/#2 remain outside the desktop K2H lane unless separately audited.

Operating model:
- Codex should be used for code edits, local validation, screenshots, source diff/report only.
- Owner will use VS Code PowerShell for commit, push, and PR creation/update unless explicitly overridden.
- GPT remains prompt writer, source/PR auditor, and merge recommender.

## 2026-05-16 - PR #80 follow-ups after frozen landing merge

Status:
Active follow-ups after PR-K2H-4 / PR #80 merge.

Observation:
PR #80 passed QA and implemented the frozen landing page plus Explore-first `/browse` entry. Landing should not be redesigned casually. The next highest-priority visible gap is Login visual parity / auth gate polish.

Action:
- Login visual parity / auth gate polish is the recommended next implementation PR. It must keep real Clerk auth, no guest mode, reason/redirect handling, safe redirects, Explore/sign-in funnel behavior, and improve visual match to the calm split login prototype. Do not alter payment/pricing/practice/HPQ in the same PR.
- Clerk friction / auth strategy remains an open product question. Observed flow can include LazyTopper login -> Google account chooser -> Clerk consent/continuation screen -> product. Short-term: polish Login around Clerk. Long-term: evaluate whether Clerk should remain or whether direct Firebase/Google/phone OTP is better for launch. Do not remove Clerk without a dedicated auth architecture PR.
- Home/cockpit card order follow-up remains. Owner noted logical learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve. Sidebar already better reflects the learning order. Home cards may still need reordering in DesktopHome in a future PR. Do not mix with Login PR unless explicitly approved.
- Pricing visual redesign remains pending. Pricing is functionally safer after PR #78 but visually not aligned with final product grammar.
- Continue where you left off route repair remains pending. It can still route to TopicHub "Topic not found." Future small PR may hide the card when saved topic is not curated, route to Practice Hub/Exam Trends, or map to safe topic slug.
- `/profile` direct-reference cleanup remains pending. PR #78 protects `/profile` via redirect/login handling, but future route-hardening can replace direct `/profile` references with `/me` where appropriate.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified. Normal client UI must never mark premium directly.

Landing doctrine after PR #80:
- Public landing is frozen.
- One primary CTA only: Explore.
- No Start free trial on landing.
- No Explore as Guest on landing.
- Explore opens browse mode for product inspection only; it must not create a fake guest learner.
- Real actions remain action-gated through auth/trial gate where already implemented.

## 2026-05-16 - PR #78 QA follow-ups and frozen landing target

Status:
Active follow-ups after PR-K2H-3 / PR #78 merge.

Observation:
PR #78 passed QA with follow-up. Login/auth/session behavior is safer and functionally correct, but visual and route/content polish remains.

Action:
- Login visual parity remains a follow-up. The right-side Clerk/auth panel should be polished while preserving real Clerk auth, reason/redirect behavior, split layout, and no guest CTA.
- Pricing visual redesign remains a follow-up. Pricing is honest but not yet aligned with final LazyTopper product/landing design grammar.
- Home "Continue where you left off" can route to TopicHub "Topic not found"; hide the card when the saved topic is not curated, route to Practice Hub/Exam Trends, or map to a safe topic slug.
- Remaining direct `/profile` references can be cleaned later; PR #78 protects them through `/profile` -> `/me` redirect.
- Payment gateway is parked. Future payment activation must be server/admin verified; client UI must never mark premium directly.

Historical frozen landing page target before PR #80:
- Superseded by PR #80 implementation. Current doctrine is one primary CTA text `Explore`, CTA below the four cards and above Mistake Intelligence, no Start free trial, no Explore as Guest, and no casual redesign unless owner explicitly reopens landing design.
- No left sidebar on landing.
- One primary CTA only: Explore LazyTopper. Historical note: PR #80 final CTA text is `Explore`.
- Top-right secondary CTA: Sign in.
- Hero headline: Study smarter for CBSE Class 10.
- Visual storyboard over wall of text.
- Product loop shown visually: Exam Trends -> Practice -> Check & Improve -> Mistake Intelligence -> Me / Progress.
- Mistake Intelligence is the emotional/product centerpiece.
- Me / Progress is shown as the connected dashboard.
- Final composition uses layout/style/color/CTA/sign-in treatment from final option and card content/story richness from option 7.
- Landing must stay in sync with overall LazyTopper design grammar: deep navy, soft white, green accent, elegant cards, calm premium CBSE Class 10 study cockpit.

## 2026-05-13 - PR #75 merged; post-K2H-1 follow-ups

Status:
Active follow-ups after PR-K2H-1 / PR #75 merge.

Observation:
PR #75 hardened Practice checked-evidence states and allowed trusted wrong MCQ attempts to feed existing mistake-history evidence for eligible signed-in non-local-session learners. It did not add a broad durable attempt-log model, advanced Practice filters, route/context repairs, sign-in/trial enforcement audit, Mock detail finalisation, or HPQ quality repair.

Action:
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- HPQ -> Build mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Sign-in/trial enforcement pass across learning surfaces so Firestore-backed Me / Progress and Mistake Intelligence can work reliably.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

Data-honesty rules:
- MCQ click is a real answer attempt.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history remains deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence should be introduced.

PR #69 / K2D warning:
PR #69 / K2D remains separate. Do not merge blindly. Do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12 - PR #73 K2H follow-up seed; superseded by PR #75

Status:
Historical follow-up seed. Current active implementation after PR #75 / PR-K2H-1 is PR-K2H-2 route/context repair.

Observation:
PR #75 / PR-K2H-1 is merged. Next active implementation is PR-K2H-2 route/context repair. PR #75 completed the first checked-evidence hardening slice, but durable Practice evidence, routing, filtering, sign-in/trial, step-solution, Mock, and HPQ quality follow-ups remain.

Action:
- PR-K2H-2 route/context repair:
  - HPQ Build Mock back navigation should return to HPQ, not old Exam Trends.
  - TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Durable MCQ answer-attempt model for correct and wrong attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- Sign-in/trial enforcement pass across learning surfaces.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

## 2026-05-08 - PR #72 final GPT audit pending

Status:
Active before PR #72 review/merge.

Observation:
PR #72 has Vercel preview evidence and manual authenticated HPQ QA recorded, but final GPT owner audit of the GitHub diff and scope is still pending.

Action:
Owner should audit PR #72 diff, validation, QA evidence, and changed-file scope before marking ready for review or merge.

## 2026-05-08 - PR #72 HPQ Browser QA auth/paywall blocked; manual QA substituted

Status:
Recorded QA limitation.

Observation:
Browser Agent verified Practice visual grammar, but HPQ / Exam Trends Browser QA was blocked by the Premium Feature interstitial in guest state. Browser Agent cannot complete magic-link authenticated QA. Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.

Action:
Treat HPQ Browser QA as inconclusive due to auth/paywall limitation, not as product failure. Preserve manual QA evidence in handoff and proceed to final GPT audit.

## 2026-05-08 - Practice Level-3 detail finalisation after PR #72

Status:
Next implementation stage after PR #72 merge.

Observation:
PR #72 handles broad Practice + HPQ visual grammar alignment. Practice still needs a detail pass focused on execution/detail states, CTA hierarchy, question interaction, option interactivity if needed, source/return behavior, responsive polish, and honest unavailable states.

Action:
Start Practice detail finalisation after PR #72 is merged and base advancement is verified.

## 2026-05-08 - Mock pages Level-3 detail finalisation after Practice details

Status:
Post-Practice follow-up.

Observation:
Mock builder / mock attempt / mock review pages need Level-3 desktop grammar and clear lifecycle wording.

Action:
Run Mock page detail finalisation after Practice detail stage. Do not claim mock performance feeds Mistake Intelligence until real graded mock evidence exists.

## 2026-05-08 - HPQ question / solution quality later

Status:
Deferred until after Practice and Mock detail stages unless the product owner reprioritises.

Observation:
Manual authenticated QA found remaining HPQ question, solution, diagram, and completeness issues. These are content/data/quality issues, not PR #72 visual grammar issues.

Action:
Sequence this as audit report first, then data-only structured options normalization, then solution/diagram/cache quality repair.

## 2026-05-08 - PR #72 Vercel / Browser QA state

Status:
Active follow-up before PR #72 merge.

Observation:
PR #72 has a Vercel preview at `https://lazytopper-production-desktop-ja96piv2q.vercel.app/app/`. Browser Agent verified Practice visual grammar but could not complete HPQ / Exam Trends QA because guest state hit the Premium Feature interstitial. Product owner manually verified authenticated HPQ on preview.

Action:
Proceed to final GPT owner audit. Do not claim PR #72 is merge-ready until that audit passes.

## 2026-05-08 - Science / Maths HPQ MCQ structured options normalization

Status:
Future data-only PR.

Observation:
Codex read-only Science audit found 29 Science MCQ / AssertionReason items. Structured `options` / `aROptions` exist for 14, and `correctOption` exists for 14. Missing structured option examples include `mnm-hpq-101`, `lp-hpq-101`, `sci-cre-hpq-1`, `sci-abs-hpq-1`, `2026-MNM-01b`, and `sci-light-hpq-1`.

Action:
Create a separate data-only normalization PR for Science and Maths MCQ / Assertion-Reason structured options. Do not invent options in UI and do not modify grading/checking APIs.

## 2026-05-08 - Local gateway and env requirements for HPQ step-solution QA

Status:
Document for future QA.

Observation:
Frontend Vite proxies `/api` to `API_SERVER_PORT`, using `8080` locally. If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`. Running `npx --yes pnpm@10.23.0 run dev:gateway` with `PORT=8080` starts the LazyTopper AI server. Without `DATABASE_URL` and provider API keys, cache/generation may be limited or stubbed.

Action:
Future local QA for HPQ solution logic must start both frontend and backend gateway and must not treat missing local env as production proof.

## 2026-05-08 - Mock grading to Mistake Intelligence and Me / Progress

Status:
Future product work.

Observation:
PR #72 keeps Add to mock as basket/planning-only. Actual written-and-graded mocks should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Action:
Plan a later evidence-path PR for mock grading output to Mistake Intelligence and Me / Progress. Do not claim this in PR #72.

## 2026-05-08 - PR #69 / K2D remains separate

Status:
Still draft/open/not merged unless live GitHub verification later says otherwise.

Observation:
PR #69 / K2D remains separate from PR #72 and must not be merged blindly. PR #72 must not cherry-pick or absorb K2D code unless explicitly approved.

Action:
Verify live GitHub state before acting on PR #69. Rebase/update and audit separately if it is revived.

## 2026-05-06T00:00:00Z - K2D normalization after K2C

Status:
K2D is the next stage after post-K2C handoff repair and Vercel-Codex setup.

Observation:
K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Action:
Do not start K2D until Vercel setup is complete and /app/ deployment is verified on base d9d0d5df1e9de45df4e555b186903070e7b0e873.
# LazyTopper Open Questions and Follow-ups

This file tracks unresolved items so they do not get buried in session logs.

Newest items should be added at the top with UTC timestamp.

## 2026-05-07 Ã¢— Practice and HPQ Level-3 design grammar alignment

Status:
Active follow-up before desktop graduation sign-off.

Observation:
During manual 7-day trial QA, Practice and HPQ old-format pages were confirmed functional but visually outdated. They do not echo the Level-3 / desktop design grammar of the overall LazyTopper site. While functionally correct, this visual/design parity gap is a key item for pre-graduation review.

Action:
Plan a future scoped PR (likely PR-K2F or equivalent) to align Practice and HPQ surfaces with the upgraded Level-3 desktop design grammar. Do not block trial entitlement. Add to implementation roadmap for post-K2E stage.

## 2026-05-07 Ã¢— Browser Agent cannot complete magic-link auth without inbox access

Status:
Permanent QA caution for trial entitlement testing.

Observation:
Browser Agent could not automate the magic-link email login flow because it lacks access to the email inbox. This blocked Browser Agent from completing full trial entitlement QA for trial/expired/premium states. Manual human QA substituted successfully after signing in with a real magic link.

Action:
For future Browser Agent trial entitlement testing, either: (1) set up a passwordless or test-account-based QA flow for Browser Agent, or (2) document that manual QA is required for magic-link-gated trial testing.

## Active follow-ups after K1B / K1C / handoff setup

### K1B Practice query polish

Status:
Follow-up only.

Observation:
Browser QA reported that one K1B query route may sometimes require one click on the Trigonometry chip before the context bar reflects Trigonometry.

Action:
Re-check later during route/context hardening. Do not block K2A.

### /app/me shell consistency

Status:
Follow-up only.

Observation:
K1C QA noted /app/me sometimes rendered without DesktopShell when directly loaded, while still honest and usable.

Action:
Track for later shell-route consistency pass. Do not block K2A.

### Codespaces Browser Agent access

Status:
Permanent QA caution.

Observation:
Browser Agent can sometimes access Codespaces previews, but can also fail due to certificate, forwarding, port, login, or safe-browsing issues.

Action:
Prefer deployed public preview for Browser Agent. Use manual human QA for Codespaces-only URLs when needed.

### Revised Level 3 improvement prototype

Status:
No canonical finalized prototype.

Observation:
The revised Level 3 improvement prototype could not be finalized. Some experimental prototypes were discarded or considered non-canonical.

Action:
For K2 onward, use product-native specs and QA gates. Use Level 1/2 references for visual grammar and historical Level 3 for behaviour inspiration only.

### AI fallback solution

Status:
Future PR-K2D.

Observation:
A student should not feel a solution availability gap. If stored solution is missing, product should generate a board-style solution through AI, matching the stored solution format.

Action:
Do not implement in K2A. Plan as a separate later PR.

### Tutor and examiner quality polish

Status:
Future K6.

Observation:
Product should be useful from student, tutor, and CBSE board examiner lenses.

Action:
Add tutor/examiner wording and quality checks later, after real worksheet/check/progress paths are grounded.
---

## PR-K2H-6 Continue Repair Decision — Option B

Owner-approved decision: use Option B for the K2H-6 “Continue where you left off” repair.

Saved worksheet memory:
- CTA label: `Continue worksheet plan`
- Route: `/practice/worksheets`
- Preserve `source=home` and `returnTo=/`

Grade + subject memory only:
- CTA label: `Resume with Exam Trends`
- Route: `/exam-trends?subject=<subject>`
- Preserve `source=home` and `returnTo=/`

Profile-only memory:
- Do not show a Continue CTA.

No broad grade/subject-only memory should route to TopicHub.
TopicHub should only be used for resume in a future PR if there is a verified curated topic key or safe topic mapping.

Home primary cards should be ordered:
`Exam Trends -> Practice -> Worksheets -> Check & Improve`

Likely K2H-6 product scope:
- `lazytopper/src/pages/desktop/DesktopHome.tsx`
- `lazytopper/src/lib/desktop/landingMemory.ts`

Read-only inspect:
- `lazytopper/src/App.tsx`
- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
- `lazytopper/src/lib/desktop/topics.ts`

K2H-6 non-goals:
- Do not touch landing, Login, pricing, Practice internals, HPQ, Mock, TopicHub content, docs/handoff, package/server/env/data in the product PR unless explicitly rescoped.
- Do not redesign Home.
- Do not create fake memory, fake topic history, fake attempts, or fake personalization.
- Do not change `/browse` behavior unless source audit proves it is necessary.
- Do not route to old `/trends/:grade/:subject`.
- Do not hard-code `/app` routes in source.

---

## Post-PR #85 / PR-K2H-6 handoff update

PR #85 / PR-K2H-6 — Home cockpit order + safe Continue repair is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #85: `c5515abf5cf616137391dc02f5e673ecc098baac`
- PR #85 head SHA: `f490a59bb97857e6be484fa288872eb625d69fd6`
- PR #85 merge commit / new base: `a0e540a837cebe21ffdb8537b9da241537f42fd9`

What PR #85 changed:
- Reordered Home cockpit primary cards to: `Exam Trends -> Practice -> Worksheets -> Check & Improve`
- Implemented K2H-6 Option B for Continue/resume behavior:
  - saved worksheet memory -> `Continue worksheet plan` -> `/practice/worksheets`
  - grade + subject memory -> `Resume with Exam Trends` -> `/exam-trends?subject=<subject>`
  - profile-only memory -> no Continue CTA
- Removed broad grade/subject memory routing to TopicHub to avoid TopicHub "Topic not found" risk.
- Preserved `/browse` behavior, no guest mode, no fake memory, and no fake personalization.

Files changed by PR #85:
- `lazytopper/src/lib/desktop/landingMemory.ts`
- `lazytopper/src/pages/desktop/DesktopHome.tsx`

Validation and QA:
- TypeScript passed.
- Production build passed with `NODE_ENV=production` and `BASE_PATH=/app/`.
- Production verifier passed: `8 passed, 0 failed`.
- `git diff --check` passed.
- Local `/app/browse` visual QA passed.
- Vercel `/app/browse` visual QA passed.
- Confirmed card order: `Exam Trends -> Practice -> Worksheets -> Check & Improve`.
- Local `/api/cbse-exam-date?class=10` proxy error remains a non-blocking local backend issue unrelated to PR #85.

Next recommended product stage:
- Pricing visual redesign, no payment gateway yet.

Pricing next-stage doctrine:
- Redesign Pricing so it visually matches the frozen landing, Login, and desktop cockpit grammar.
- Keep pricing honest: manual activation/payment not automated yet.
- Do not add fake checkout.
- Do not add fake premium unlock.
- Do not mark premium from normal client UI.
- Do not implement payment gateway in the visual redesign PR.
- Payment gateway / UPI / manual activation remains a later launch-readiness stage requiring server/admin verification.

Future implementation prompts must start from:
`base/approved-thru-437 @ a0e540a837cebe21ffdb8537b9da241537f42fd9`
