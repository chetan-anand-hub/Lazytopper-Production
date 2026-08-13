# WAVE OPS-1 STATE — updated 2026-08-13 (controller: ops session)
(ARCHIVED 2026-08-13 by lane OPS-CLOSEOUT — wave CLOSED at trunk 6de74d3ff799f2faa60cbd3e82664c7e43619701. Content below is verbatim from handoff/WAVE_STATE_OPS_1_LIVE.md, sha256 70697af5d6378639b481203d14ce03776b3a16f277557f1c0f8eec82133a474f.)

TRUNK: `a09653676a299bd2e0ccd2d7fd7672d9138d1d0f` — OPS-A/B/C/E are ON IT.
  — re-derived via `git ls-remote origin base/approved-thru-437` before EVERY dispatch.
    Wave opened at `267f26b0` → `3da2f66c` (A/B/C/E merged) → `a0965367` (#667, docs(legal),
    not this wave). **Ancestry checked, not assumed:** `git merge-base --is-ancestor 3da2f66c
    a0965367` exit 0 ⇒ trunk moved FORWARD. Every OPS-D anchor re-verified at the new tip and
    all hold at identical line numbers.
  — **Verified BY CONTENT, not by merge status** (this repo squash-merges, and GitHub's
    MERGED + a `mergeCommit` SHA have both been wrong about trunk before):
      `ops/AGENT_STANDING_RULES.md` = 206 lines ✔
      `ops/agent-spec/SKILL.md` dead `templates/` refs = 0 ✔
      `ops/CONTROLLER_SUBAGENT_MODEL.md` = 24,313 bytes · 423 lines · `U+2014`×92 ·
        `U+2605`×37 · `REPAIRED` header present · **0 mojibake indicators** ✔
        — byte-for-byte the file the owner supplied. The operating manual is preserved clean.
      `ops/` tree = AGENT_SPEC_TEMPLATE, AGENT_STANDING_RULES, CONTROLLER_SUBAGENT_MODEL,
        agent-spec/SKILL.md, arcs/{DPDP_Arc, WAVE_CLOSEOUT, WAVE_DPDP_B, WAVE_ME_C} ✔
      the two lossy docs = **ABSENT** ⇒ the exposure below is live ✔
  — MUST be re-derived again before any further dispatch. Never read it from this file.

⚠ **LANE-ID COLLISION, RESOLVED — read this before citing "OPS-E" anywhere.**
An earlier revision of this file registered `OPS-E` as *the lossy-document repair lane*. A
**different** `OPS-E` was run and merged by the owner — an `ops/agent-spec/` lane. To stop a
future reader concluding the lossy documents are preserved because "OPS-E landed":
  - **OPS-E** = the agent-spec lane. **MERGED**, on trunk at `3da2f66c`.
  - **OPS-F** = the lossy-document repair lane. **NOT DISPATCHED. NOT BUILT.**
The exposure section below is the authority on what remains unpreserved.

OPEN PRs (`gh pr list --state open`, 2026-08-13):
```
#663 draft=true  docs/ops-1-correct-stale-doctrine        (OPS-C)
#662 draft=true  docs/ops-1-preserve-lane-reports         (OPS-B) [ci-full]
#659 draft=false dependabot @testing-library/jest-dom 7.0.1   — not this wave
#658 draft=false dependabot jsdom 30.0.1                      — not this wave
```

CONTROLLER INPUTS WRITTEN TO DISK ON RECEIPT (§5 "AN ATTACHED DOCUMENT IS NOT A FILE"):
  - `CONTROLLER_BRIEF_WAVE_OPS-1.md`                    (repo root, untracked)
  - `LazyTopper_Controller_Subagent_Model.md`           (repo root, untracked, OWNER-SUPPLIED
    repaired copy — see D2. The controller's attachment-derived copy was DELETED per owner
    ruling; the attachment channel is the corruption source.)
  - Instruction files: `ops/.specs/OPS-{A,B,C}.md` — gitignored at `.gitignore:107`, so they
    cannot be swept into OPS-A's `ops/**` commit.

---

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|-------|
| OPS-A | preserve the **clean** governing documents (5 of 7) | `ops/**` (new files only) | **MERGED** | #665 | v1.0 BLOCKED/unpushed; v2.0 PASS, all 6 premises held |
| OPS-B | preserve the lane reports and rulings | `handoff/BRIEF_*.md` (new files only) | **MERGED** | #662 | founding premise INVERTED — see F-B1 |
| OPS-C | correct the two stale doctrine files | `cofounder-skill/SKILL.md`, `ops/AGENT_STANDING_RULES.md` | **MERGED** | #663 | CODEOWNERS-gated |
| OPS-E | agent-spec lane (owner-run) | `ops/agent-spec/**` | **MERGED** | — | ⚠ NOT the repair lane — see the collision note above |
| OPS-D | delete the dead Drizzle stack | +`artifacts/api-server/tsconfig.json`, root `tsconfig.json`, `pnpm-workspace.yaml:46` | AWAITING OWNER REVIEW | #669 (DRAFT) | v2.0 PASS, 13 files, all 9 premises OK. ⚠ Lane Overlap RED vs dependabot — see MERGE ORDER |
| OPS-H | preserve the DDL of record for `step_solutions` + `tutor_cache` | `lazytopper/server/db/POSTGRES_SCHEMA_REFERENCE.md` (new) | AWAITING OWNER REVIEW | #670 (DRAFT) | PASS. Owner ruling D12. **MUST MERGE BEFORE #669** |
| OPS-G | file two accepted rulings into doctrine | `ops/AGENT_STANDING_RULES.md`, `ops/agent-spec/SKILL.md` | AWAITING OWNER REVIEW | #668 (DRAFT) | PASS. Standing rules 206→265 lines, headings set-diff EMPTY |
| OPS-F | repair the 2 lossily-corrupted governing docs | `ops/CONTROLLER_ADDENDUM_Context_Safeguards.md`, `ops/arcs/CONTROLLER_MeProgress_v7_Arc.md` (both new) | DISPATCHED (v2.0) | — | **HIGHEST PRIORITY.** v1.0 BLOCKED at the gate on a controller ledger defect, zero files written; pre-flight results preserved and folded into v2.0's Q3 |
| OPS-J | close the tutorCache unhandled-rejection crash path | `lazytopper/server/services/tutorCache.cjs`, `…/tutorCache.test.cjs`, `lazytopper/package.json` | AWAITING OWNER REVIEW | #671 (DRAFT) | PASS, 3 files. **MERGES BEFORE #669.** ⚠ **OWNER LIVE-VERIFY OWED BEFORE UNDRAFTING** |

---

## DISJOINTNESS

```
OPS-A: ops/**                    (NEW FILES ONLY; not ops/AGENT_STANDING_RULES.md,
                                  not ops/AGENT_SPEC_TEMPLATE.md — both already on trunk)
OPS-B: handoff/BRIEF_*.md        (new files only)
OPS-C: cofounder-skill/SKILL.md, ops/AGENT_STANDING_RULES.md
OPS-D: lib/db/**, artifacts/api-server/package.json, pnpm-lock.yaml
```

— verified disjoint 2026-08-13 by the controller before each dispatch.

⚠ ONE NEAR-COLLISION, ruled: OPS-A owns `ops/**` and OPS-C owns `ops/AGENT_STANDING_RULES.md`,
which sits inside it. The brief's table calls this "none", which is wrong on a literal
reading. It is disjoint in fact only because OPS-A is **new files only** and the OPS-C file
already exists on trunk (`git ls-tree -r origin/base/approved-thru-437 -- ops/` returns
`ops/AGENT_SPEC_TEMPLATE.md` and `ops/AGENT_STANDING_RULES.md`). Both specs state the
carve-out explicitly so neither lane has to infer it.

Reported clean by both returned lanes: OPS-B `FILES: 1`, OPS-C `FILES: 2 — exactly the 2
allowed, nothing new under ops/`. No lane crossed into another's paths.

---

## DECISIONS MADE THIS WAVE

- **D1.** Instruction files placed in gitignored `ops/.specs/`, not `ops/` proper, so an
  untracked spec cannot be swept into OPS-A's preservation commit.
- **D2 (OWNER, 2026-08-13).** OPS-A commits `LazyTopper_Controller_Subagent_Model.md` from
  the **repo-root path**, not from the controller's attachment. Owner verified that file by
  byte-level read; the controller independently re-measured it: 24,313 bytes / 423 lines /
  `U+2014`×92 / `U+2605`×37 / zero mojibake indicators. The controller's attachment-derived
  copy was deleted. **The attachment channel is what corrupts this file** — it has now been
  mangled three times across three sessions. Confirmed from both ends.
- **D3.** OPS-A was HELD, not dispatched, while D2 was outstanding. Dispatching a lane
  against an instruction the controller had already disproved would have wasted the lane and
  produced a report that had to be discarded.
- **D4.** OPS-A's spec was written against `ops/AGENT_SPEC_TEMPLATE.md` with a real §0
  PREMISE LEDGER, in response to OPS-C's finding F-C1 below. OPS-B's and OPS-C's specs were
  NOT ledgered — that is a controller defect, see OWNER DECISION 1.
- **D6 (OWNER, 2026-08-13).** OPS-A ships the **5 clean files only**. The 2 lossily-corrupted
  files stay untracked and go to a new lane OPS-E: **rule-based repair performed in-repo from
  the on-disk bytes, with a documented rule table, per-rule counts, and a provenance header
  separating mechanical recovery from contextual inference.**
  - ⛔ **Do NOT use `lazytopper/scripts/ops/mojibake_cleaner.mjs`** — owner-ruled. Its table
    deletes `Ã` and maps `Ã¢`→`•`, which guesses wrong on lossy lead-byte corruption and
    would produce **a green gate over wrong content.**
  - ⛔ **Do NOT extend `REPORT_ONLY_PREFIXES`** (`lazytopper/scripts/check-mojibake.cjs:60`,
    currently `['handoff/']`). Owner: *"that exemption is why 608 mojibake lines survived on
    trunk for months. Do not extend it to `ops/`."*
  - Owner assessment: clean originals for those two **probably do not exist**.
- **D7.** OPS-A v1.0 was 255 lines against the premise gate's 250-line budget and was
  rejected before doing any work. **Controller defect.** v2.0 measured at 249 before dispatch.
  The lane correctly stopped rather than trimming someone else's spec.
- **D15 (OWNER, 2026-08-13) — SEQUENCING CORRECTED. Controller error.** OPS-F was named as
  outranking the whole queue and then **four PRs were built ahead of it.** Owner: *"Everything
  in #670/#668/#669 is recoverable from git; those two are not. You named it as outranking
  everything above and then dispatched everything above it anyway."* OPS-F dispatched
  immediately, **in parallel with the merges** — it is file-disjoint from all four.
  ⚠ **The failure was not analysis, it was ordering: the risk was correctly identified in
  writing and then not acted on.** A stated priority that does not change dispatch order is
  not a priority; it is a note.
- **D16 (OWNER, 2026-08-13).** `[FU-TUTORCACHE-VOID-QUERY-UNHANDLED-REJECTION]` gets **its own
  lane BEFORE OPS-D, not after** — *"the only item in this window with a production crash path,
  and it is one line."* Lane OPS-J.
- **MERGE ORDER, REVISED (supersedes D14's sequence, keeps its reasoning):**
  **#670 (OPS-H) → #668 (OPS-G) → OPS-J → #669 (OPS-D) → dependabot #658/#659 rebase.**
  **OPS-F merges whenever it is ready** — it blocks nothing and nothing blocks it.
  Verify each by CONTENT and by ancestry, never by GitHub's MERGED status.
- **D12 (OWNER, 2026-08-13) — the DDL of record.** `step_solutions` and `tutor_cache` have no
  `CREATE TABLE` anywhere except the directory #669 deletes. **Capture both as a documented
  in-repo DDL reference BEFORE merging #669** (lane OPS-H). Owner: *"That is precisely the
  failure this wave exists to fix — records living outside the tracked surface get lost…
  Accepting a pointer in a follow-up entry means relying on a future agent trusting a SHA in a
  doc, which is the same shape as the wave-state files that sat on one laptop for months."*
  **Explicitly NOT the duplicate-declaration problem** — neither table has competing DDL.
  Owner also asked, and OPS-H must answer: *what happens today when `tutorCache.cjs` runs
  against a database with no `tutor_cache` table?* If it throws on a live path that is a bug
  independent of this lane.
- **D13 (OWNER, 2026-08-13).** `pnpm-workspace.yaml:149` (`@esbuild-kit/esm-loader`, orphaned
  once drizzle-kit goes) — **leave it; separate lane.** Owner: *"Removing a security override
  deserves its own diff and its own review, not an append to a merged-green PR. An orphaned
  override is inert; the risk of removing one carelessly is not."*
  ⚠ **`:150` esbuild MUST STAY** — api-server declares esbuild directly.
  Disposal: `[FU-OPSD-ESBUILD-KIT-OVERRIDE-ORPHANED]`.
- **D14 (OWNER, 2026-08-13) — MERGE ORDER.** `#669` merges **before** dependabot `#658`/`#659`;
  the bot regenerates its own lockfile free on rebase, whereas reversing the order forces a
  human to redo the lockfile for a large deliberate deletion. Do **not** close the dependabot
  PRs. Full order: **OPS-H → #668 → #669 → dependabot rebases → collective handoff PR.**
- **D8 (OWNER, 2026-08-13).** `[FU-SPEC-GUARD-MIS-SUMMARISES-WHAT-IT-GUARDS]` **ACCEPTED**,
  proposed rule stands **as written**: *"a STOP condition must quote the text it guards, never
  paraphrase it."* Filed by OPS-G as **its own class** in `ops/AGENT_STANDING_RULES.md` —
  *"a false RED originating in the spec, with no faulty instrument anywhere. Every prior
  instance was a tool misreporting; this one was the author."* That contrast is the entry.
- **D9 (OWNER, 2026-08-13).** `[FU-OPS-E-SKILL-CITES-A-BLIND-GREP]` — **fix, low priority.**
  The claim is true; the citation misses `scripts/package.json:20` →
  `test:matrix:all` → `.github/workflows/quality-gate.yml:180`. Controller verified all three
  links on trunk before dispatch. Folded into OPS-G, which is the next lane touching
  `ops/agent-spec/`, as the ruling directed.
- **D10.** OPS-D is forbidden from editing `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md` even
  though the wave brief instructs it to flip `[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]` there.
  **Controller override:** that file is a shared lock and a product PR carrying a handoff edit
  breaches `CLAUDE.md` §8. OPS-D returns the wording; the collective handoff lands it.
- **D11.** OPS-D's ledger replaced the brief's `~line 130` / `~line 466` approximations with
  anchored citations verified on trunk before dispatch — `:130`, `:134-135`, `:466`, `:1412`,
  plus `artifacts/api-server/package.json:15,18` and `pnpm-workspace.yaml:30-32`. Both of the
  brief's approximations were correct; **`pnpm-workspace.yaml:32` declares `- lib/*`, so
  `lib/db` is a workspace member by GLOB, not by name** — the brief did not mention this and
  it is most of Q2 answered before the lane started.
- **D5.** OPS-A's spec carries OPS-C's measured correction to the mojibake scope
  (`REPORT_ONLY_PREFIXES = ['handoff/']` only ⇒ `ops/` is ENFORCED) and OPS-B's measured
  correction to the docs-PR CI path (`[ci-full]` required). Both are attributed to their
  lanes in the spec, not restated as the controller's own claims.

---

## FINDINGS — provenance intact

**Controller-verified (I measured these myself):**

- **F-0.** The brief's OPS-A premise *"the repaired one has 0 mojibake"* was true of the
  owner's file and NOT true of the copy that reached the controller as an attachment.
  Superseded by D2; recorded because the brief still contains the original wording.

- **F-0b.** The 2 excluded governing docs are **lossily** corrupted, same failure mode as the
  model file was: `CONTROLLER_ADDENDUM_Context_Safeguards.md` (`Ã`×84 `¢`×83) survives one
  cp1252→utf-8 pass then dies on a bare `0xE2` with its continuation bytes gone;
  `CONTROLLER_MeProgress_v7_Arc.md` (`Ã`×212 `¢`×211) fails on the first pass. **Neither is
  mechanically recoverable** — which is why OPS-E is a *rule-based repair with a provenance
  header*, not a cleanup.

**Reported by lane OPS-A v1.0 (BLOCKED, nothing pushed) — the subagent's findings:**

- **F-A1.** *OPS-A reports* **the spec's P4 was FALSE.** Only 2 of the 6 non-model files carry
  mojibake; 3 have literally **zero** non-ASCII bytes and `CONTROLLER_WAVE_ME_C.md` has 3, all
  legitimate `U+00A7`. Controller-authored premise, lane was right. This finding is the only
  reason a partial ship exists as an option.
- **F-A2.** *OPS-A reports* `check:mojibake` enumerates via `git ls-files`, so with the copies
  present but **untracked** it returned `enforced_hits=0, exit 0`. **A pre-stage run on new
  files is a false pass**; only `git add` made it red (218 hits = 65+153 exactly). Folded into
  v2.0 as a required pre-stage/post-stage pair.
- **F-A3.** *OPS-A reports* P3 reproduced **exactly** — all 11 numbers on the model file — and
  that `ops/CONTROLLER_SUBAGENT_MODEL.md` hashed byte-identical to the root original under
  `autocrlf=true` (source is pure LF, so normalisation is a no-op; raw sha256 and
  `git hash-object` agree). No `Get-Content` was used anywhere in the lane.
- **F-A4.** *OPS-A reports* P5's worry was unfounded: `"ops/"` is a **prefix** rule in the docs
  lane of `repo_boundary_policy.json`, so `ops/arcs/**` needs no policy entry. `unknown=0`.
- **F-A5.** *OPS-A reports* the corruption in the 2 dirty files is **double-encoded**, so a
  one-pass cleaner will half-fix and look like progress. Independently confirmed by the
  controller as F-0b, and it is the direct reason for D6's ban on the existing cleaner.

**Reported by lane OPS-F (#673, PASS) — the highest-value findings of the wave:**

- **F-F1 — ★★ A CORRECT DECODE THAT WAS THE WRONG CONTENT, and it was labelled MECHANICAL.**
  *OPS-F reports* Q3's proposed `Ã§ → U+00E7 (MECHANICAL)` decodes correctly and **would have
  shipped** *"ç2 applies regardless of who opens the PR"*. **It is a SECTION SIGN.** Reclassified
  R4, INFERRED. ⇒ **"Mechanically recoverable" describes the bytes, not the meaning.** A label
  of MECHANICAL asserts certainty the byte arithmetic cannot supply.
- **F-F2 — a THIRD non-uniformity the controller never named.** The solitary `U+00C3` is a
  **MULTIPLICATION SIGN** — *"mean marks when it appeared × appearance rate"*. **The em-dash
  default would have inverted a formula.**
- **F-F3.** The ellipsis run is **not** mechanical: its surviving `0xA6` pins `E2 xx A6` but the
  middle byte is gone; `U+2026` comes from context. Reclassified INFERRED.
- **F-F4.** The 9-marker run is a **box-drawing brace**, confirmed by **column arithmetic**
  (corner col 16 / horizontal cols 10–18 / corner col 16) *and* by the observation that junction
  glyphs have third bytes above `0xA0` and **would have survived**. Not nine em dashes.
- **F-F5 — ⚠ A DEFECT IN A FILE ALREADY ON TRUNK.** *OPS-F reports* the frozen sibling
  `ops/CONTROLLER_SUBAGENT_MODEL.md` records *"3x marker + wide gap → double arrow"* — but **a
  wide gap can only come from an A0-tailed glyph, and a double arrow (`E2 87 92`) has none.
  Those three are probably WARNING SIGNS.** Out of scope, not touched, logged as
  `[FU-SIBLING-WIDE-GAP-CLASS]`. **The operating manual we preserved carries three glyphs that
  are probably wrong** — its own header says a human should spot-check the inferred set, and
  this is the first time anyone has.
- **F-F6 — ★★ TWO RULE DEFECTS WERE CAUGHT ONLY BY READING THE RENDERED OUTPUT.** Not by any
  gate, and **not by the byte-identity proof**: a closing `**` read as line-start scaffolding
  (turning five mid-sentence em dashes into stars), and a generalised en-dash rule mis-firing on
  `**[marker]**` in the phrase *"the two ★ lines"*, where the sentence names its own subject.
  **Both passed every mechanical check while being wrong.** ⇒ The ASCII-stripped diff proves no
  WORD moved; it is blind to whether the right GLYPH was chosen. That gap is the argument for
  publishing the rule table.
- **Output:** 18 rules (2 MECHANICAL / 15 INFERRED / 1 AMBIGUOUS-MARKER), published **inside
  both files**. ADDENDUM 10,223 → 15,558 B, 90 substitutions; MeProgress 22,786 → 30,053 B,
  225 substitutions. ASCII-stripped diff **EMPTY** for both (9,807 and 21,736 chars identical).
  **4 genuinely ambiguous glyphs left marked `U+2047`** and named in each header. Post-stage
  mojibake green with an injected control proving the matcher fires. Both root originals
  byte-unchanged (`74676dfd`, `e19c5625`).

**Reported by lane OPS-K (#672, PASS) — FINDINGS THAT CONTRADICT THE SPEC: NONE.**

- **F-K1.** *OPS-K reports* it re-checked header 1's five clauses **one by one rather than
  inheriting the correction**, and confirms the earlier *"could not be located"* wording would
  have been FALSE. `BRIEF_ME-2_v2.md`: 22,795 B, untracked, first line
  `# BRIEF — ME-2 v2 · REBUILD /me ON THE v7.1 PROTOTYPE` ⇒ INSTRUCTION. Left untracked and
  unmodified (`sha 9c74de18`, status `??`).
- **F-K2 — byte-identity proven on the COMMITTED BLOB, not the working file.** Committed blob
  minus the first 15 lines hashes `e38bacef…` == the original. It notes `core.autocrlf=true`
  here, which is why it proved it on `git cat-file -p HEAD:…` rather than on disk.
- **F-K3 — the blank line 15.** The header block is 14 quoted lines **plus one blank
  separator**: without it, CommonMark **lazy continuation folds the addendum's own title into
  header 2's blockquote.** So "strip the header block and nothing else" means exactly the first
  15 lines, and that is what the byte-identity proof strips.
- **F-K4 — it corrected its own off-by-one and said so.** `ADDED_LINES` read 100 on the first
  pass; `split('\n')` counts a phantom trailing element after the final newline. 99 matches the
  PR's own `additions`. Recorded rather than left unexplained.
- **F-K5 — the mojibake pass was correctly treated as no evidence.** *"CI's `handoff/` pass
  proves nothing: the same run printed `handoff/: 13 non-enforced hits across 5 files` and
  still went green; my file is absent from that list."* Control injected and detected.
  34 of 99 added lines carry legitimate non-ASCII, all preserved.

**Reported by lane OPS-J (#671, PASS) — the subagent's findings:**

- **F-J1 — ★★ THE SCANNER THAT LOOKED FINE AND WAS UNSOUND.** *OPS-J reports* its v1 floating-
  promise scanner had no regex-literal state, so a `.split(/[\s,;:?.!()\[\]{}"']+/)` **in the
  target file itself** opened a bogus string and blanked the rest — **v1 silently MISSED
  `:146`, the one site already known to exist, while reporting 27 confident candidates.** It
  rebuilt with a compiled-in **tripwire** asserting all three known `void` sites classify as
  expected, exiting non-zero otherwise. Its formulation, which belongs in the standing rules:
  **"a 'nothing else found' from a scanner with no known-positive is worth nothing."**
- **F-J2 — Q1 answered at scale.** 73 files / 28,748 LOC, four passes (literal `void`; a
  paren/brace-aware statement scanner over comment/string/template/**regex**-blanked source
  against the 116 async names defined in `server/**`; the same names in any position; and
  async callbacks into `setTimeout`/`forEach`/`.on`/`new Promise` — zero hits).
  **`tutorCache.cjs:146` is the only unguarded site.** P6 confirmed TRUE.
- **F-J3.** *OPS-J reports* `stepSolution.cjs:559` is SAFE **verified by reading, not by
  trusting OPS-H** — `saveSolution:53` wraps its only await; the sole statement outside is
  `getPool():4`, itself fully try/caught. Left byte-identical.
- **F-J4 — `package.json` was MANDATORY, not convenience, and it proved it by mutation.**
  Unwiring the test reds `a15_every_server_test_cjs_is_wired_into_the_matrix_chain` (1/18
  FAILED). **a15 now reads 15, was 14.** Registered as `test:server:tutor-cache`; vitest does
  **not** collect `.cjs`.
- **F-J5 — ★ EXIT CODE IS NOT A HANG DETECTOR.** Mutation B (`void`→`await`) **exited 0, not
  timeout-124** — Node parks forever on a never-settling promise, finds an empty loop, and
  exits 0. **The regression showed only in MISSING output.** The committed test asserts on
  completion via `Promise.race`.
- **F-J6 — both halves of the assertion are independently load-bearing.** Mutation A (remove
  `.catch`) reds only test 2; B reds only test 3. *"A suite with just the 'no unhandled
  rejection' assertion would accept an `await` and put a DB round-trip in front of every cached
  tutor answer."* Control-of-control run too: a rejecting SELECT is caught (0 unhandled, exit
  0) and an all-success run is green — the harness is neither always-red nor blind.
- **F-J7 — MY SEVENTH DISPROVED PREMISE, and the third UNSATISFIABLE thing I have written.**
  §4's `scope:guard --mode product` is unsatisfiable given §1's own allowlist: `package.json`
  classifies as **trackedTooling**, and `product` maps to the product lane alone. `--mode mixed`
  is the sanctioned combination per `repo_boundary_policy.json` and `CLAUDE.md` §6; bare
  auto-detect independently picks `auto:mixed`. **Declared policy, not a workaround.**
  Prior two: the OPS-D allowlist, and the OPS-A §0c step ordering.
- **F-J8.** *OPS-J reports* `CLAUDE.md` §6 still names **"6 suites"** for the root matrix; the
  chain now runs **seven** test files (`premiseLedgerGuard.test.ts` unlisted) and reports
  **30 suites / 202 checks**. The file's own warning about that number going stale has gone
  stale again.
- **F-J9.** Lane Overlap red is against **dependabot #658/#659** over `lazytopper/package.json`
  — #670/#668/#669 are genuinely disjoint. **Expected; clears on the dependabot rebase.** No
  workaround attempted, correctly.

**Reported by lane OPS-H (#670, PASS) — the subagent's findings:**

- **F-H1 — THE OWNER'S QUESTION, ANSWERED.** *OPS-H reports* `tutorCache.cjs` with no
  `tutor_cache` table is a **silent no-op — a permanent cache miss.** Pool null-guarded at
  `:52` (env check before the `_pool` memo) and again at every call site `:116, :166,
  :188/:197`; every query in a try/catch at `:119/158, :167/182, :198/228`, with a **second**
  layer on the public entry points `:238/244` and `:253/255`. A 42P01 surfaces nowhere
  user-facing — caught, warned, returned as the miss value.
- **F-H2 — ⚠ A LIVE DEFECT FOUND ON THE WAY.** *OPS-H reports* `tutorCache.cjs:146-149` does
  `void pool.query('UPDATE tutor_cache SET hit_count…')` — **a floating promise with no
  `.catch()`. The enclosing `try` CANNOT catch it, and Node 22 kills the process on an
  unhandled rejection.** Not the Q2 path (it needs a cache hit, which needs the table), but
  **live.** `stepSolution.cjs:559` has the same shape and is SAFE because `saveSolution`
  catches internally — **the asymmetry is real.** Raised as
  `[FU-TUTORCACHE-VOID-QUERY-UNHANDLED-REJECTION]`, not fixed. **Needs its own lane.**
- **F-H3 — *OPS-H flags a SHAPE, explicitly not a cause*,** and it is passed on at that
  confidence: *"an unhandled rejection kills a Node process without failing a healthcheck
  first, which is the shape of failure that [the #638 rollback] mystery has been missing. I am
  flagging the shape, not claiming the cause."* Per `wave-dpdp-b`, #638's rollback cause is
  **still unknown**, and two lanes cleared the gateway on the reasoning that a gateway crash
  cannot fail the healthcheck. **UNVERIFIED. Route it to whoever owns #638; do not promote it
  to a diagnosis on the way.**
- **F-H4 — my §2c suspicion was WRONG.** *OPS-H reports* the `ON CONFLICT` worry is not borne
  out: the Drizzle declaration carries `text("question_hash").primaryKey()`, and the PK
  supplies the index. All four upserts valid. **No defect there.** Sixth controller premise
  disproved this wave.
- **F-H5.** *OPS-H reports* my §2c query surface was incomplete — 4 more call sites in
  `lazytopper/scripts/pregen-step-solutions.mjs` and `warmup-solution-cache.mjs`. No new
  columns; verdict unchanged. Cross-check result: **no column used by any query is missing from
  either schema.**
- **F-H6.** *OPS-H reports* P6 is true **but not by symmetry** with `stepSolution.cjs` — *"the
  one place the files differ is exactly where `tutorCache.cjs` has a defect `stepSolution.cjs`
  doesn't. Assuming symmetry would have got both answers wrong."* This is why the spec forbade
  the symmetry shortcut, at the owner's instruction.
- **F-H7 — ENVIRONMENT DEFECT.** *OPS-H reports* the shared checkout's `node_modules`
  top-level links point into `LT-worktrees/pr1-signup-redirect`, **a worktree that no longer
  exists**, so `typescript` is a dangling link there — and `ops-a`, `ops-c`, `ops-g` are in the
  same state. It junctioned to `me-2` (healthy install, `pnpm-lock.yaml` blob byte-identical
  to base at `e08e3e32`), ran both typechecks, then removed the junctions with `rmdir` (link
  only) and re-verified `me-2` intact. **`pnpm install` was never run; the lockfile never
  written.** `[FU-SHARED-CHECKOUT-NODE-MODULES-DANGLING]`.

**Reported by lane OPS-D v2.0 (#669, PASS) — the subagent's findings:**

- **F-D6 — A PRIOR LANE CONCLUDED THE OPPOSITE.** *OPS-D reports*
  `WAVE_STATE_WAVE5B_ARCHIVE.md:827-828` reads *"But `lib/db` cannot be deleted — its drizzle
  schema is the only DDL definition of step_solutions / tutor_cache / generated_questions."*
  Its verdict: **partly still true.** `generated_questions` has real runtime DDL
  (`ensureGeneratedQuestionsTable.cjs:64`) so Drizzle was a wrong duplicate there; **the other
  two have no CREATE TABLE anywhere.** Not a crash risk — both consumers return null without
  `DATABASE_URL` and try/catch every query — but a real loss. Resolved by D12/OPS-H.
  ⚠ *"The §0 ledger never mentions `tutor_cache`"* — controller omission.
- **F-D7 — MY "only lane touching pnpm-lock.yaml" CLAIM WAS FALSE** and turned CI red.
  Non-draft dependabot `#658`/`#659` both touch it; Lane Overlap says sequence, do not
  parallelize. OPS-G `#668` **is** disjoint, so that half held. The lane did not rebase anyone.
  **Fourth controller defect this wave.** Resolved by D14.
- **F-D8.** *OPS-D reports* my Q5 anchor was off by one — `:148` is the comment; the overrides
  are `:149`/`:150` — **and the answer splits.** `:149` `@esbuild-kit/esm-loader` IS orphaned
  (sole consumer `drizzle-kit@0.31.9`, declared only in `lib/db/package.json:23`); `:150`
  esbuild is NOT (api-server declares it directly, plus vite/tsx). Both left in place. D13.
- **F-D9.** *OPS-D reports* a fresh-worktree prerequisite the spec omitted: api-server
  `typecheck` fails **TS6305 before any change** until root `tsc --build` runs — **it mimics a
  deletion-caused failure, and only the control run distinguished them.**
- **F-D10.** *OPS-D reports* §0c.0 ("first command") and §0c.1.2 (which creates the worktree)
  were unsatisfiable in the stated order. Fixed in the OPS-H spec.
- **F-D11 — the acceptance gate passed on its own terms.** api-server typecheck 0 / build 0 /
  test 24 pass 0 fail 0 skipped, **identical to a pre-removal CONTROL**, and `dist/index.mjs`
  contains **zero** occurrences of `drizzle`. Container Boot PASS with
  `CONTAINER_BOOT_SKIPPED: false` — image built, booted, healthcheck asserted.
- **F-D12.** *OPS-D reports* Q1 clean across **1829 tracked files**, all 96 hits resolved
  individually; api-server's 14 `src` files import only `@workspace/api-zod`. Q2: exactly two
  config refs, both allowlisted, **no third** — Dockerfiles, `.dockerignore`, `railway.json`,
  `vercel.json`, `build.mjs`, `tsconfig.base.json` and all 5 workflows swept clean.

**Reported by lane OPS-G (#668, PASS) — the subagent's findings:**

- **F-G1 — WHERE ELSE? fired.** *OPS-G reports* the same blind grep also sat in
  `ops/AGENT_STANDING_RULES.md`, there supporting a sentence that is **FALSE**: *"No workflow,
  no npm script, no hook invokes `scripts/premise_ledger_check.mjs`."* It does —
  `premiseLedgerGuard.test.ts:53` spawnSyncs it, `scripts/package.json:20` lists that test in
  `test:matrix:all`, `quality-gate.yml:180` runs it. Executed proof `# pass 6 # fail 0
  # skipped 0`. Fixed in place — inside the allowlist, **beyond §2b's letter.**
  ⚠ **OWNER CONFIRMATION OWED:** the lane asks whether that extra correction is wanted, or
  whether to strip #668 back to `SKILL.md` alone. Controller recommendation: **keep it.** A
  false sentence in a doctrine file, inside the lane's own allowlist, found by the enumeration
  the rule it was filing demands. Stripping it would leave a known-false claim on trunk.
- **F-G2.** *OPS-G reports* Q1 resolved: `premiseLedgerGuard.test.ts` exercises checker
  **behaviour only, never a real spec** — inputs are `ops/AGENT_SPEC_TEMPLATE.md` and throwaway
  `mkdtempSync` fixtures. Decisive fact: `git ls-files 'ops/.specs/'` returns nothing, so the
  claim it was preserving HOLDS and the task did not change shape.
- **F-G3.** *OPS-G reports* §2b's clause *"rather than pretending the chain does not exist"*
  was inaccurate — `SKILL.md`'s next sentence already named `premiseLedgerGuard.test.ts`. Only
  the CITATION was blind. **The owner's ruling was exactly right and my spec overstated it.**
- **F-G4.** *OPS-G agrees* the lane is an instance of the class it filed — a citation
  under-describing its evidence is the same author-side substitution of summary for source, one
  level down. Cross-referenced inside the new class. Proposes
  `[FU-BLIND-CITATION-NARROWER-THAN-ITS-CLAIM]`; owner decision whether it earns its own class.
- **F-G5.** *OPS-G reports* the mojibake control was end-to-end, not in-memory: injecting into
  the real file drove `enforced_hits=1` naming `ops/AGENT_STANDING_RULES.md:230`, independently
  re-confirming OPS-C's finding that `ops/` is ENFORCED. Restore verified by hash under a
  stated `core.autocrlf=true`.
- **F-G6.** *OPS-G reports* it protected OPS-D: `corepack pnpm install` was never run and the
  lockfile is untouched. All three gates were plain `node`; the guard test ran via
  `node --experimental-strip-types` rather than `tsx`. Lane Overlap CI passed on its head.

**Reported by lane OPS-D v1.0 (BLOCKED, nothing pushed) — the subagent's findings:**

- **F-D1 — THE CONTROLLER'S ALLOWLIST WAS UNSATISFIABLE.** *OPS-D reports* `lib/db` is named
  in **two TypeScript project-reference arrays** — `artifacts/api-server/tsconfig.json:11`
  (`"path": "../../lib/db"`) and root `tsconfig.json:7` (`"path": "./lib/db"`) — both outside
  the lane's allowlist. Deleting the directory without removing them fails
  `npm run typecheck` with **TS6053**. The lane **could not both obey §1 and pass §3.**
  It proved the break with a finding/control pair at TypeScript 5.9.3 (control exit 0,
  finding exit 2 / TS6053) and notes its *first* attempt at that pair was invalid because
  both arms failed identically on a bad `tsc` path — **the control is what caught it.**
  ⚠ Second unsatisfiable allowlist this project has produced (see `wave-dpdp-b`). Controller
  defect, and the third of this wave.
- **F-D2.** *OPS-D reports* the deletion is **semantically correct** — Q1 is genuinely clean
  (0 importers; `git grep` whole-tree, 3 passes, every hit resolved rather than counted; the
  only `import` statements are 4 inside `lib/db/` itself), all six premises true, and the
  8-file inventory matches. **What blocks it is build wiring, not liveness.**
- **F-D3.** *OPS-D reports* my P5 reasoning was incomplete: **glob workspace membership and
  the tsconfig `references` graph are two different graphs**, and the spec checked only one.
- **F-D4 — THE PREMISE GATE MISDIAGNOSED ITS OWN FAILURES AS ROT.** *OPS-D reports* both
  flagged claims are TRUE at base SHA (P6 at exactly `:1412`). P4 was rejected for the
  comma-list citation form `path:15,18`; **P6's anchor contained markdown-escaped backticks,
  so the gate searched for a literal string containing backslashes that can never match.**
  **Any future anchor containing a backtick false-fails the same way** — a checker bug, not a
  spec bug, and the gate reports it as "The premise has ROTTED", which is the wrong diagnosis.
  New: `[FU-PREMISE-ANCHOR-BACKTICK-ESCAPE]`, `[FU-TSCONFIG-PROJECT-REFS-ARE-A-SECOND-GRAPH]`.
- **F-D5.** *OPS-D reports* Q4 as instructed and did **not** resolve it:
  `ensureGeneratedQuestionsTable.cjs:9` says `DATABASE_URL` was provisioned on Railway
  2026-08-05; `OQF:5653` says it is unset and not to provision one. Does not block deletion.
- ⚠ **Controller note on process:** the spec said exit non-zero at §0c.0 → STOP. The lane
  reported the failure but continued into Q1/Q2 verification. It stopped before **editing**,
  which is what the rule protects, and the extra work is the only reason we know the deletion
  is semantically safe. Recorded rather than waved through: the STOP was exceeded.
- ⚠ **`[FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT]` MUST NOT BE FLIPPED.** *OPS-D's explicit
  instruction to the controller:* the deletion did not happen; the entry stays OPEN with an
  added note. The handoff payload's §5a is updated accordingly.

**Reported by lane OPS-A v2.0 (#665, PASS) — the subagent's findings:**

- **F-A6.** *OPS-A reports* the `git ls-files` blindness is **not unique to `check:mojibake`**
  — `test:repo-boundary` enumerates identically and its pre-stage run was equally meaningless.
  It ran both gates on both sides of `git add`. Generalise: **any tracked-enumerating gate is
  vacuous on new files until they are staged.** Evidence it was not vacuous post-stage:
  mojibake `tracked=1821→1826, scanned=1552→1557`; repo-boundary docs `168→173`.
- **F-A7.** *OPS-A reports* `core.autocrlf=true` on this box, so the spec's `git hash-object`
  caution was live rather than hypothetical. It computed the **unfiltered** sha1 in Python as
  well and got identity both ways — genuine byte-identity, not a normalisation artefact.
- **F-A8 — THIRD CORRUPTION MECHANISM, and the most dangerous one.** *OPS-A reports* its first
  analysis run died with `UnicodeEncodeError: charmap can't encode '★'` — **Python's
  stdout is cp1252 on this box.** The file was perfect. *It hypothesises* this is the same
  mechanism that mangled the model three times.
  **Controller's qualification, because the comfortable reading is wrong:** this does NOT
  explain the two corruptions measured this wave. The disk file at wave open was genuinely a
  different, genuinely damaged file (23,965 bytes / 410 lines / `Ã¢`×134 / no REPAIRED header
  — counts computed in Python from a successful UTF-8 decode, not read off a screen), and the
  attachment copy genuinely differed byte-wise from disk. **Three distinct mechanisms are now
  established: an older damaged generation on disk, a lossy attachment channel, and a cp1252
  console that makes a clean file *look* damaged.** The third is the worst because it invites
  a well-meaning agent to "repair" a file that is already correct.

**Reported by lane OPS-C (#663) — the subagent's findings, not the controller's:**

- **F-C1.** *OPS-C reports* its own instruction file had no §0 PREMISE LEDGER, that
  `premise_ledger_check.mjs` returns `0/1 specs passed` exit 1 on it, and that trunk's
  standing rule (landed by #661, one commit before dispatch) says STOP. It did not stop; it
  flagged and proceeded on the grounds that the spec's §3a was a stronger hand-rolled ledger
  and every premise verified TRUE. **Controller's position: the defect is mine, not the
  lane's.** See OWNER DECISION 1.
- **F-C2.** *OPS-C reports* `check:mojibake` has `REPORT_ONLY_PREFIXES = ['handoff/']` only;
  its own two paths are ENFORCED, proven by injection driving exit 1. **The controller's
  spec said report-only and was wrong.**
- **F-C3.** *OPS-C reports* the CRLF measurement differs from the brief: `false`→CR=0,
  `input`→CR=0, `true`→**CR=78** (brief said 0/3). Same shape, different magnitude, and the
  brief omitted the `input` column.
- **F-C4.** *OPS-C reports* `grep -c $'\r'` returns 0 on a CRLF file under Git-Bash (same
  file = 643 CR bytes in Node). **grep is not a CRLF detector.**
- **F-C5.** *OPS-C reports* CI classifies its two files as code/FULL BAR while
  `scope:guard --mode docs` calls them docs — the two "docs" classifiers disagree.
- **F-C6.** *OPS-C reports* the stale claim was at line 287 after all — the anchor had NOT
  rotted. Located by text as instructed; recorded so the record is right for the right reason.

**Reported by lane OPS-B (#662) — the subagent's findings, not the controller's:**

- **F-B1.** *OPS-B reports the lane's founding premise is inverted.* `handoff/BRIEF_*` are
  controller **DISPATCHES**, not lane reports: 0 REPORT / 1 RULING / 21 INSTRUCTION /
  1 UNCLASSIFIED across 23 files. The actual reports live outside version control, because
  `CLAUDE.md` §9/§11 sends them there. **There was nothing to preserve**; the classification
  record is the deliverable.
- **F-B2.** *OPS-B reports* zero `BRIEF_*.md` at the repo root — all 23 are in `handoff/`;
  the root holds 8 `CONTROLLER_*.md`. And `BRIEF_GATE-1.md`, cited by the brief as the
  REPORT exemplar, **is not in the repo at all** — it is in the OneDrive handover folder.
- **F-B3.** *OPS-B reports* a docs-only PR does **NOT** run the full bar by default: its
  first run was green with `CI_DOCS_LANE_PATH_FULL_BAR_RAN: false`, nine gates skipped, only
  mojibake ran. It closed the hole by adding `[ci-full]` to the PR title. **This contradicts
  §5 of the controller model** — the document OPS-A is committing verbatim.
- **F-B4.** *OPS-B reports* spec §5 (commit the report to `handoff/`) conflicts with
  `CLAUDE.md` §11 (*"Never write output files into `handoff/`"*). Controller defect.
- **F-B5.** *OPS-B reports* a marker grep would have inverted the classification table:
  every instruction file embeds the return-message template it demands, so `^LANE:`/`^VERDICT:`
  score hits on nearly every one. The "first 15 lines" rule is what saves it.
- **F-B6.** *OPS-B reports* the mojibake corpus is 1 hit in 4,599 lines and is **not a
  defect** — a deliberate specimen in `BRIEF_ME-2_v2.md`. No cleanup lane is owed.
- **F-B7.** *OPS-B reports* stale lore: the lazytopper vitest suite is now **140 files /
  1800 tests**, not 112 / 1387. OPS-C's run independently agrees (140/1800), and OPS-C also
  reports the root guard matrix at **202 checks / 30 suites**, not 190 or 196.

---

## ⛔ WAVE OPS-1 IS CLOSING — NO NEW LANES

**Owner direction, 2026-08-13, stated as a direction rather than a preference:** *"stop opening
new lanes… The wave has expanded from four lanes to at least eight, and the owner has had no
product time for five days. Finish what is open, land it, write the collective handoff, and
close Wave OPS-1. Anything remaining goes into the state file as a queued lane for a future
wave, not a lane dispatched now."*

**TRUNK IS NOW `cf092cf5d2776d853ac240886c516845fb91baee`.** Ancestry checked, not assumed:
`a0965367` is an ancestor ⇒ moved FORWARD. **Three lanes merged and VERIFIED BY CONTENT:**
- **#669 (OPS-D)** — `lib/db` files on trunk: **0**; drizzle refs in the api-server manifest:
  **0**; `drizzle-orm` catalog entries: **0**; root `tsconfig.json` `lib/db` refs: **0**.
- **#668 (OPS-G)** — `ops/AGENT_STANDING_RULES.md` is **265 lines** (was 206).
- **#670 (OPS-H)** — `lazytopper/server/db/POSTGRES_SCHEMA_REFERENCE.md` present, blob `aac2e946`.

**#671 ACCEPTANCE CHANGED (owner, 2026-08-13):** the **committed unit test with a rejecting
stub pool IS the acceptance** — deterministic, exercises the branch, mutation-provable. It
already exists in the PR (`tutorCache.test.cjs`, 5 tests in CI, both halves mutation-proved).
**The live-verify demotes to a smoke check** that the tutor still answers. Nothing re-dispatched.

⚠ **PRODUCTION IS NOT EXERCISING THE NEW `.catch`** — controller correction to an owner
inference. `:146` sits inside `if (bestScore >= SIMILARITY_THRESHOLD && bestRow)` (lines 145-148,
read directly), and `bestRow` comes from the `SELECT` at `:121`. When that SELECT 42P01s it is
caught by the **pre-existing** try/catch at `:119/158`; `bestRow` is never assigned; the branch
cannot be entered. **The repeated 42P01s in the deploy log are the SELECT, not the UPDATE.**
The log still matters — it confirms the table is absent and the cache is dead — but it is not
a live test of the branch #671 fixes.

**`DATABASE_URL` IS SET** (owner, from the boot log: `DATABASE_URL=set`,
`[gen-q-schema] generated_questions ready`). A 42P01 requires a successful connection —
Postgres cannot report a missing relation without connecting. **The pool works; the table
does not exist.**

⚠⚠ **#671's LIVE-VERIFY CANNOT RUN, AND THE CRASH IS UNREACHABLE IN PRODUCTION TODAY.**
Controller-verified on trunk `cf092cf5`: **nothing creates `tutor_cache` at runtime.** The only
`CREATE TABLE IF NOT EXISTS tutor_cache` in the repo is at
`lazytopper/server/db/POSTGRES_SCHEMA_REFERENCE.md:150` — the **non-executable reference** #670
just landed, whose own line 263 states there is *"no boot-time CREATE TABLE for either one,
anywhere in this repository."* By contrast `generated_questions` has
`ensureGeneratedQuestionsTable.cjs:64` and `question_reports` is created on first call at
`questionReport.cjs:40`. **`tutor_cache` and `step_solutions` have neither.**
⇒ Unless the table was created out-of-band, the `SELECT` at `tutorCache.cjs:121` 42P01s, is
caught, and returns a miss **every time**. A cache HIT is unreachable ⇒ `:146` never fires ⇒
**the acceptance as written cannot execute, and the crash path cannot be triggered in
production while the table is absent.**
⚠ **This corrects my own framing**, repeated twice: I called #671 *"the only production crash
path in the window."* It is a **latent** crash path, conditional on the table existing. Correct
to land; **lower urgency than I stated.** Only the owner can check Railway for
`DATABASE_URL` and the table's actual presence.
⇒ Second-order finding, queued: **if the table is absent, the entire tutor cache is dead in
production** — a failed SELECT on every cacheable request, never a hit.

⚠ **THE CRASH PATH IS STILL LIVE ON TRUNK.** The sequenced order was
`#670 → #668 → #671 → #669`; **#669 merged and #671 did not.** `tutorCache.cjs:146` on trunk is
still `void pool.query(`. This is **not** a technical problem — #671 has no dependency on #669
and merges cleanly after it — but the item with the only production crash path in the wave is
the one still unlanded, and it is blocked on **owner live-verify before undrafting**.

**IN FLIGHT — the complete and final set. Nothing may be added to it.**
| item | state |
|---|---|
| OPS-F v2.0 | running — the lossy-document repair, highest priority |
| OPS-J | running — the tutorCache crash path |
| OPS-K | **DONE — #672 DRAFT, PASS.** The ME-2 addendum + its correction. The last lane. |
| #670 · #668 · #669 | green DRAFTS awaiting owner merge |

**Then:** merges land → collective handoff PR (payload already written at
`ops/.specs/HANDOFF_PAYLOAD_OPS-1.md`) → **wave closed.**

### QUEUED FOR A FUTURE WAVE — NOT DISPATCHED, NOT TO BE DISPATCHED IN OPS-1

1. **`SIGNAL_*` gitignore entry** — owner-ruled; needs one `.gitignore` line.
2. **`[FU-OPSD-ESBUILD-KIT-OVERRIDE-ORPHANED]`** — remove `pnpm-workspace.yaml:149`
   (`@esbuild-kit/esm-loader`). ⚠ **`:150` esbuild MUST STAY.** Owner-ruled: own diff, own review.
3. **`[FU-PREMISE-ANCHOR-BACKTICK-ESCAPE]`** — `premise_ledger_check.mjs` reports a TRUE premise
   as ROTTED when its anchor holds escaped backticks, and rejects comma-list citations the same
   way. **The misdiagnosis is the bug**, not the rejection.
4. **`[FU-SHARED-CHECKOUT-NODE-MODULES-DANGLING]`** — four checkouts have top-level
   `node_modules` links into a **deleted** worktree; `tsc` cannot run in the repo root.
5. **Amend `ops/AGENT_STANDING_RULES.md`** with the unledgered-spec ruling below.
6. **`[FU-OPS-DOCS-PR-IS-NOT-A-FULL-BAR-CHECK]`** — §5 of `ops/CONTROLLER_SUBAGENT_MODEL.md`
   says a docs-only PR is "the cheapest full-bar check available". **Measured false.** The
   document was committed verbatim by design; the correction has no home yet.
7. **`[FU-TUTORCACHE-VOID-QUERY-UNHANDLED-REJECTION]` → OWNER LIVE-VERIFY** once OPS-J lands.
8. **`[FU-638-UNHANDLED-REJECTION-SHAPE]`** — route to whoever owns #638, **at the confidence it
   arrived with**. A shape with a mechanism, not a diagnosis.
9. **Whatever OPS-F, OPS-J and OPS-K return** that is not already in scope. From OPS-J:
   - **`[FU-OPS-J-NO-STANDING-GUARD-AGAINST-NEW-FLOATING-PROMISES]` — the durable fix.** #671
     is a POINT fix; **nothing stops number two, and no gate would see it** — `tsc` does not
     check `.cjs` and this workspace has no `no-floating-promises` lint. OPS-J's tripwired
     scanner exists and works; it is not wired into anything.
   - `[FU-OPS-J-SCOPE-GUARD-MODE-IN-SPEC-TEMPLATE]` · `[FU-OPS-J-EXIT-CODE-IS-NOT-A-HANG-DETECTOR]`
   - `[FU-OPS-J-CLAUDEMD-ROOT-MATRIX-SUITE-LIST-STALE]` — §6 says 6 suites; it is 7 files /
     30 suites / 202 checks.
10. **Where lane reports live** — owner will rule from the memo; #664 is real counter-evidence
    to the strict reading of `CLAUDE.md` §11.

## OWNER DECISIONS — full evidence memo at
`"C:\Users\Chetan\OneDrive\Desktop\diff\report-ops1-open-decisions-2026-08-13.md"`

**RULED 2026-08-13 — THE UNLEDGERED-SPEC STOP. Owner's ruling, controller's recommendation
discounted as requested:**

> *"The rule applies to controller briefs as it does to lane instructions. My OPS-1 brief
> shipped without a §0 ledger one day after the mechanism landed, and that failure is already
> on trunk in `ops/AGENT_STANDING_RULES.md`. Authors are not exempt."*

Controller's reading, flagged as a reading: this settles the **rule** — the STOP is
unconditional and binds authors, including the owner and the controller. It does **not**
instruct re-running `#662`/`#663`, which are merged, and the closing directive forecloses it.
Queued item 5 carries the amendment. **If re-running those two was intended, say so** — I have
not assumed it either way.

**RULED — BRIEF_GATE-1.md hash discrepancy, RESOLVED BY THE CONTROLLER, item closed:**
Diffed rather than closed on "doesn't change the ruling". **Trunk is later.** Trunk (20,948 B,
468 lines) records `#661 — MERGED to trunk at 267f26b0` plus a post-merge note; the OneDrive
copy (19,957 B, 454 lines) said `#661 — DRAFT, not merged`. The only two lines unique to the
local copy were those stale draft claims. **The GATE-1 agent did not edit it post-write — the
reverse: trunk was updated afterwards by `#664`.** Local copy **deleted** per owner
instruction; trunk copy verified intact (blob `4c8913d6`).
⚠ **A trap worth keeping:** the OneDrive copy's **mtime was NEWER** (2026-08-13 06:33) while its
**content was OLDER**. mtime tracked a copy operation, not an edit. **mtime is not evidence of
content recency.**

**RULED 2026-08-13 (ME-C session):**
- **`SIGNAL_*` → gitignore it.** Transient by construction; no fifth class needed. Owner: the
  dependency and its clearing are already in the DPDP-B and ME-B archives. *(Controller has not
  independently verified those archives; recorded as the owner's statement.)*
- **`BRIEF_GATE-1.md` → verify and close.** Verified: it **is** on trunk
  (`git ls-tree` → blob `4c8913d6`, 20,948 B), landed by **#664**. OPS-B's finding was true at
  its base SHA and went stale. My state file's "import" meant **commit the file**, not fold it
  into `CURRENT_STATE.md`. ⚠ The OneDrive copy hashes `14433e7a` — **the two diverge**; not
  diffed, does not change the ruling.
- **ME-2 paired authority → land the addendum ALONE with two header lines.** Lane OPS-K.
  ⛔ **Do NOT paraphrase the addendum's contents into this file or the handoff** — owner
  instruction. Quote verbatim with the file cited, or not at all. The addendum is the only
  verbatim record; it is committed as-is beneath the headers, not rewritten.
  ⚠ **BLOCKED: header line 1 is FALSE as worded.** `handoff/BRIEF_ME-2_v2.md` **exists**
  (22,795 B, on disk, untracked) — it was not lost. What is true: it is an **INSTRUCTION** and
  is deliberately not committed. Correct outcome, wrong reason. Corrected wording proposed in
  the memo; awaiting one word from the owner.
  Header line 2 verified: `handoff/WAVE_STATE_ME_C_ARCHIVE.md` is on trunk and `:47-58` records
  the disproof and reversal exactly as the owner describes.

## STILL OPEN — OWNER DECISIONS OWED

1. **Is the unledgered-spec STOP unconditional?** *(raised by OPS-C; the defect is the
   controller's)* OPS-B and OPS-C both ran on specs with no §0 PREMISE LEDGER. OPS-C flagged
   it and proceeded; both verified every premise in-band and both returned PASS with green
   full-bar CI. If the STOP is unconditional, #662 and #663 should be closed and both lanes
   re-dispatched with ledgered specs. If an in-band verification protocol substitutes, the
   standing rule must say so — **it currently does not**. Controller recommendation: accept
   both PRs on their evidence and amend the standing rule, rather than re-run two lanes that
   verified everything the ledger would have forced. OPS-A was dispatched ledgered either way.

2. **Where do lane reports live?** *(F-B1/F-B4)* Every other OPS-B decision follows from it.
   `CLAUDE.md` §9/§11 says outside the repo; this wave's specs said `handoff/`.

3. **The paired-authority stop fired for real.** *(OPS-B §3b)*
   `BRIEF_ME-2_v2_ADDENDUM_OWNER_RULINGS.md` classifies RULING but its pair
   `BRIEF_ME-2_v2.md` classifies INSTRUCTION. Spec said both-or-neither, so **neither
   landed and six owner rulings remain untracked.**

4. **Durable records no OPS-1 allowlist reaches.** *(F-B5→ partially resolved)* OPS-A covers
   7 of the 8 root `CONTROLLER_*.md`. **Not covered by any lane:** the five
   `handoff/WAVE_STATE_*_LIVE.md` files, and this state file. Widen scope or accept.

5. **A fifth classification class for `SIGNAL_*`?** *(OPS-B)* It holds verified evidence
   found nowhere else and will not classify as REPORT/INSTRUCTION/RULING.

6. **Import the out-of-repo `BRIEF_GATE-1.md` into `handoff/`?** *(F-B2)*

---

## FU ENTRIES COLLECTED

From OPS-C: `[FU-OPSC-PREMISE-LEDGER-UNENFORCED-AND-UNLEDGERED-DISPATCH]` ·
`[FU-OPSC-TWO-HOMES-FU-STILL-OPEN-IN-HANDOFF]` · `[FU-OPSC-MOJIBAKE-SCOPE-MISSTATED-IN-SPECS]` ·
`[FU-OPSC-GREP-IS-NOT-A-CRLF-DETECTOR]` · `[FU-OPSC-DOCS-CLASSIFIER-DISAGREEMENT]`

From OPS-B: `[FU-OPS-LANE-REPORTS-LIVE-OUTSIDE-THE-REPO]` ·
`[FU-OPS-HANDOFF-BRIEFS-ARE-INSTRUCTIONS-NOT-REPORTS]` ·
`[FU-OPS-CLAUDEMD-S11-VS-HANDOFF-REPORT-PATH]` ·
`[FU-OPS-WAVE-STATE-AND-CONTROLLER-DOCS-UNPRESERVED]` ·
`[FU-OPS-INSTRUCTION-TEMPLATE-DEFEATS-MARKER-GREP]` ·
`[FU-OPS-ME2V2-PAIRED-AUTHORITY-UNRESOLVED]` · `[FU-OPS-DOCS-PR-IS-NOT-A-FULL-BAR-CHECK]`

Bodies live in `handoff/BRIEF_OPS-B.md` and `handoff/BRIEF_OPS-C.md`, with copies in
`"C:\Users\Chetan\OneDrive\Desktop\diff\handover\Ops Session\"`.

**Controller-owned sweep at close-out** (raised by OPS-C): `[FU-DOCS-STANDING-RULES-TWO-HOMES]`
is discharged in the two doctrine files, but its `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md`
entry still carries the identical false claim and five more handoff files reference it.

---

## ⚠ LIVE EXPOSURE — NOT A RESOLVED ITEM

**Two governing documents exist on exactly one laptop, untracked, and will stay that way
until OPS-E lands.** Owner-recorded as a live exposure, 2026-08-13:

- `CONTROLLER_ADDENDUM_Context_Safeguards.md` — 10,223 bytes, 65 offending lines
- `CONTROLLER_MeProgress_v7_Arc.md` — 22,786 bytes, 153 offending lines

They are lossily corrupted (F-0b / F-A5) and cannot be preserved verbatim without turning
the enforced mojibake gate red, which the owner declined to work around. **Do not treat the
OPS-A merge as closing the preservation problem — it closes 5 of 7.** If this laptop is lost
before OPS-E lands, both documents are gone.

## BLOCKED / SEQUENCED

- **OPS-A** — built. #665 DRAFT, awaiting owner review. Not blocked.
- **OPS-E** — not dispatched. Sequence **after OPS-A is on trunk**: both lanes create new
  files under `ops/`, so running them together breaks disjointness. Its spec must be ledgered
  and under 250 lines (D7).

**All three parallel lanes are BUILT and NONE are on trunk.** #662, #663, #665 are green
drafts awaiting owner review and merge. Per §4 the controller does not merge. Nothing further
can be dispatched until they land:
- **OPS-D** needs A/B/C **on trunk** (not merely built) — it is the only lane touching
  `pnpm-lock.yaml` and merging it earlier forces every other branch to rebase.
- **OPS-E** needs OPS-A on trunk.
- **Wave close-out** — ONE collective handoff PR, controller-written, after all lanes are on
  trunk and verified by content. Per §4: handoff PRs queue, product PRs may race.

⚠ **Verify by ancestry, not by GitHub's MERGED status**, before building on any of these:
`git merge-base --is-ancestor <mergeCommit> origin/base/approved-thru-437`, and independently
`git log origin/base/... -- <a path that PR changed>`. This repo squash-merges.
- **OPS-D** — held by design until A/B/C are on trunk. It is the only lane touching
  `pnpm-lock.yaml`; merging it early forces every other branch to rebase. Not blocked,
  sequenced. Re-derive trunk before dispatching it.
- **Wave close-out** — one collective handoff PR, written by the controller only after all
  four lanes are on trunk and verified by content. Per §4: handoff PRs queue, product PRs
  may race.
