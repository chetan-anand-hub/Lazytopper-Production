# WAVE MI-INTEGRITY STATE — updated 2026-08-15, controller boot + first dispatch

TRUNK: `b3554a6f9a6150b40162c8ed7fe7b3fa70e6db48` — re-derived twice via
`git ls-remote origin base/approved-thru-437`, 2026-08-15. **Unmoved from the Base SHA the four
specs are anchored at.** No lane needs re-anchoring.

OPEN PRs at boot (`gh pr list --state open`):
- `#677` dependabot npm-minor-and-patch group (57 updates) — **not a handoff PR**, no lock conflict.
- **No handoff PR is open.** Per addendum §6 this controller writes the wave handoff.

## SPEC PROVENANCE — READ BEFORE TRUSTING ANY SPEC COPY

The four lane specs and the controller brief reached this controller's context as **chat
attachments that were transport-corrupted** (lossy cp1252 — 3-byte UTF-8 marker glyphs reduced to a
bare lead byte; the class documented in the provenance headers of both governing ops docs).

The controller began transcribing them to `ops/.specs/` and **flagged them as untrusted
transcriptions rather than using them silently**. The owner then placed clean, byte-intact copies
and the controller **discarded both transcriptions**. Two copies of one spec is the exact defect
this wave is repairing in the taxonomy.

**AUTHORITATIVE SOURCE — the only bytes any lane may use:**

    C:\Projects\LT-specs\MI-INTEGRITY\{TAX-1,GRD-1,SHEET-1,QR-1,CONTROLLER_WAVE_MI_INTEGRITY}.md

Verified by the controller 2026-08-15 with `Get-FileHash -Algorithm SHA256`, **five for five**:

| file | bytes | SHA-256 (first 12) |
|---|---|---|
| `CONTROLLER_WAVE_MI_INTEGRITY.md` | 8938 | `FA3CD2031312` |
| `GRD-1.md` | 11476 | `CEF2C0B64DF9` |
| `QR-1.md` | 8017 | `522E8EE4EBE7` |
| `SHEET-1.md` | 9572 | `1769F3AE852C` |
| `TAX-1.md` | 9279 | `682910B8736F` |

**Transport rule, binding on every lane:** copy with `Copy-Item -LiteralPath … -Force` only, then
re-hash with `Get-FileHash`. **Never a text cmdlet** — `Get-Content`/`Set-Content`/`Out-File` cross a
cp1252 boundary and reintroduce the corruption. **A copy in `ops/.specs/` that does not match its
hash above is a transport defect and the lane STOPS.**

The corruption never affected the gate: every anchor string, file path and line number in all four
`§0` ledgers is pure ASCII. `ops/.specs/` is gitignored (`.gitignore:107`), so no spec reaches a
commit or `check:mojibake`.

## LANES

| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| TAX-1 | Calculation leaves "Knowledge gaps" | 5 client files (see below) + tests | **BLOCKED at §0b — owner ruling owed** | — | gate exit 0, P1–P7 all OK; **P8 found a 4th definition + 9 more sites**; §2's file list cannot deliver §5's own live-verify |
| GRD-1 | Grader reconciliation + `ECF_POLICY_V1` | `server/routes/checkSolution{,.test}.cjs` | **PASS at §0b — owner ruling owed** | — | **defect (c)'s premise DISPROVED**; P1/P2 labels reversed; defect (b) has TWO scheme sites; P7 = no link field |
| QR-1 | Crop before upload (+ size-failure scout) | `qrUploadService.ts` + `QrAnswerUploadPage.tsx` | **PASS at §0b — owner ruling owed** | — | P5 = **branch (c)**; P6 = `QrAnswerUploadPage.tsx:99–113`, **no TAX-1 collision**; §3's named suites DO NOT EXIST |
| SHEET-1 | Graded-sheet uniformity + QP stored scorecard | `scorecardVariants.ts`, both print docs, `worksheetPdfExport.ts`, QP host | **BLOCKED — waits for TAX-1 MERGED** | — | may STOP on P7 |

**Cut order if context forces one: cut QR-1. Never GRD-1.** (Brief §1.)

## DISJOINTNESS — verified by the controller, not taken from the brief's table

Verified 2026-08-15 with `git ls-tree -r --name-only origin/base/approved-thru-437 -- <path>`.
**All eight named paths resolve on trunk**; the three parallel allowlists are set-disjoint:

- **TAX-1** — `lazytopper/src/components/results/scorecardVariants.ts` ·
  `lazytopper/src/pages/MeProgressPage.tsx` · `lazytopper/src/services/mistakeInsightsService.ts` ·
  `lazytopper/src/components/checkimprove/CheckImproveGradedPrintDoc.tsx` ·
  `lazytopper/src/components/worksheet/WorksheetGradedPrintDoc.tsx` (+ their test files)
- **GRD-1** — `lazytopper/server/routes/checkSolution.cjs` ·
  `lazytopper/server/routes/checkSolution.test.cjs`
- **QR-1** — `lazytopper/src/services/qrUploadService.ts` (+ its test file) · **plus the phone
  capture page that P6 identifies, which is NOT YET KNOWN**

**The disjointness is enforced twice over, by each spec's own FORBIDDEN list — stronger than the
controller's inspection:**
- GRD-1 forbids **all of `lazytopper/src/`**; TAX-1 and QR-1 forbid **all of `lazytopper/server/`**.
  Client and server cannot collide in either direction.
- TAX-1 requires **every service under `lazytopper/src/services/` except `mistakeInsightsService.ts`
  to stay byte-identical** — which forbids TAX-1 from touching `qrUploadService.ts` by its own spec.

**⚠ THE ONE UNRESOLVED EDGE — QR-1's P6.** QR-1's second authorized file is not named in its spec;
it is whatever P6 turns out to be. Until P6 answers, disjointness with TAX-1 is **asserted, not
proven**. Mitigation carried in QR-1's dispatch as a hard STOP: **if P6 resolves to any of TAX-1's
five files or their tests, QR-1 stops and reports before touching it.** QR-1 must in any case report
P6 and wait for owner confirmation before editing it.

**⚠ SHEET-1 is sequenced, not parallel.** It edits `scorecardVariants.ts`,
`WorksheetGradedPrintDoc.tsx` and `CheckImproveGradedPrintDoc.tsx` — a **three-file overlap with
TAX-1**. Not negotiable; the lane-overlap gate compares exact paths and two lanes finishing close
together collide silently.

**⚠ `lane_overlap.mjs` COUNTS DRAFTS.** Three concurrent draft PRs are expected in this wave. If a
lane's overlap check fails against a sibling lane's draft, the lane **reports and stops** — it does
not force past it.

## DECISIONS MADE THIS WAVE

- **Controller transcriptions of the specs were discarded, not used.** A file with the right name is
  not the right file. The owner's placed copies are the only authoritative bytes, hash-verified.
- **The premise gate is NOT run by the controller and NOT run in the shared checkout.**
  `C:\Projects\Lazytopper-Production` runs arbitrarily far behind trunk, so `--worktree` there would
  resolve anchors against stale code and could produce a **FALSE RED on a sound spec**. The gate
  belongs in each subagent's own fresh worktree at a freshly derived SHA — that is §0c.0 and needs
  no separate controller step.
- **TAX-1 / GRD-1 / QR-1 dispatched in parallel** on controller-verified disjointness (above), not
  on the brief's table.
- **SHEET-1 held** until TAX-1 is merged, on the three-file overlap.

## DECISIONS INHERITED — D1–D8, do not re-open

D1 calculation leaves knowledge gaps · D2 four categories · D3 `ECF_POLICY_V1` · D4 C&I is the
reference implementation · D5 one scorecard shape, one graded-sheet renderer, **no inline step
expansion** · D6 QP gets the full treatment · D7 presentation is a learnable gap, not tidiness ·
D8 `delete_branch_on_merge=true` is repo-level — **never pass `--delete-branch`**; automatic
deletion is not a violation.

## FU IDS THIS WAVE OPENED — to be recorded in the handoff

- `[FU-GRADER-CROSS-SURFACE-DIVERGENCE]` — same photo, two surfaces, two marks and two diagnoses.
  **Demonstrated, not suspected.**
- `[FU-GRADER-FULL-MARKS-WRONG-ANSWER]` — naked step-sum reached 2/2 on an unfinished, wrong answer.
- `[FU-GRADER-UNANCHORED-STEP-INVENTION]` — with no `[N mark]` scheme the model invents its own split.
- `[FU-BANK-MARKING-SCHEME-COVERAGE]` — 207 of 401 bank files carry `[N mark]` steps; **~half the
  bank is unanchored.** Authoring work, not code.
- `[FU-QR-CROP-UNBUILT]` — no crop between capture and upload.
- `[FU-TUTOR-STEP-BLIND]` — tutor gets mistake *type* but not the step. Closed by SHEET-1 + GRD-1
  together.
- `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` — GRD-1 defect (d); a deduction with no `mistakeType` and an
  empty summary currently passes the parse gate.

## BLOCKED / OWNER DECISIONS OWED

- **Every lane stops at §0c.1 for owner confirmation before building.** That is the specs' design.
- QR-1's P6 file needs owner confirmation before it is edited.
- SHEET-1's P8 QP-results host needs owner confirmation before it is edited.
- Collected, **not blocking** (brief §5): cross-surface QP mistake-weighting · whether students want
  a QP graded PDF · `container-boot` as a required check · should C&I derive a CBSE section from
  marks · `[FU-DPDP-GUARDIAN-CONSENT]` (legal, launch-blocking, no agent can settle it).

## HANDOFF DRAFT — prose, ready to paste

*(Appended after every lane returns, before the next dispatch. Addendum §2: the controller may not
dispatch the next lane until the previous lane's paragraph is written here.)*

### [CURRENT] Wave MI-INTEGRITY — three lanes stopped before a file was edited, and the wave's founding diagnosis was disproved by the lane sent to act on it

**No product code changed. That is the result, not the absence of one.** Four lanes were specced to
repair Mistake Intelligence integrity. Three dispatched in parallel, **all three passed their premise
gate at exit 0, and all three then contradicted their own spec** at §0c.1 — before a single file was
edited, committed or pushed. The fourth (SHEET-1) was never dispatched: it waits on TAX-1, and TAX-1
cannot proceed as written.

**What a student would have got from building these specs as authored:** a taxonomy fix that changes
nothing they see (TAX-1's "shared" predicate has zero consumers), a crop feature bolted onto an
upload path whose real defect is a guard refusing images the compressor could already have saved
(QR-1), and a grader clamp aimed by a ledger whose surface labels are reversed, fixing a prompt
divergence that **is not what made the same photograph score 2/2 and 1/2** (GRD-1).

**The owner's evidence stands entirely.** Two Firestore documents, one photograph, two marks and two
diagnoses — real, reproduced, and still unexplained by the mechanism the wave attributed to them.
**A demonstrated symptom is not a demonstrated cause.** Wave **MI-INTEGRITY-2** takes it, with a
fresh controller and rewritten specs.

⚠ **CARRIED FORWARD, RESTATED IN FULL — THE WIRE-2 DORMANCY BLOCK.** WIRE-2 ended the three-dormant
block and shipped as `#621`. Its dormancy statement must survive every prepend and be restated in
each new `[CURRENT]`; **its absence once cost five days.** Nothing in Wave MI-INTEGRITY touched it,
and it is reproduced verbatim from the previous `[CURRENT]` in this prepend.

### TAX-1 — BLOCKED at §0b, 2026-08-15. Nothing built, nothing pushed, working tree clean.

**All provenance below is the lane's, not the controller's. The controller has read no product
source and cannot verify any of it. Treat every claim as "the TAX-1 lane reports X", flagged
UNVERIFIED, and pass it to the next lane at the confidence it arrived with.**

TAX-1 ran its premise gate to **exit 0** on a hash-verified spec (`682910B8736F`) at trunk
`b3554a6f`, confirmed **P1–P7 all OK** — locating each by text-grep and comparing against the cited
line rather than trusting the number — and then **P8 ended the lane before a single file was
edited.** This is the premise gate doing exactly what it was built for: **eight specs were once
authored in one day with the checker run on none of them, and every wrong premise that day was
caught by a lane rather than by its author.**

**What P8 found.** The lane reports a **FOURTH** independent careless definition at
`ResultsScorecard.tsx:176-178`, and — the finding that decides the lane — that the **"Where your
marks went" grouping which §5 live-verifies as item 1 is HARDCODED at `ResultsScorecard.tsx:308-317`**,
pairing Conceptual+Calculation under *"Knowledge gaps — worth practising"*. **That file is not in
§2.** Beyond it the lane enumerates **nine further sites** deciding knowledge=conceptual+calculation
independently: `SurfaceHistory.tsx:87` · `WorksheetGradePanel.tsx:83` · `FullMockPage.tsx:112` ·
`ChapterTestPage.tsx:91` · `DesktopCheckImprovePage.tsx:1210,2681,2731` · `SolutionChecker.tsx:710` ·
`ChapterTestHistoryRail.tsx:31-35` · `ProgressWindowArc.tsx:211` ·
`MeProgressPage.tsx:358,415,441,447`.

**★ Three spec premises contradicted, and the first is the one that matters.** (1) P1's *"shared
predicate"* **is shared by nobody** — the lane reports `isCarelessMistakeKind` has **zero production
consumers**, its only importer being its own test at `scorecardVariants.gradedSheet.test.ts:4`, so
**§2 steps 1 and 2 executed exactly as written would change nothing a student ever sees.** This is
the house `MOUNT ≠ LIVE` shape one level down: a predicate that exists, compiles, is tested, and is
consumed by no one. (2) **§2's file list cannot satisfy §5's own live-verify items 1 and 2**, because
that surface lives in an out-of-scope file — a spec whose acceptance criteria its allowlist cannot
reach. (3) P2 names only the careless Set and **omits its knowledge-side twin** `KNOWLEDGE_TYPES`
(`MeProgressPage.tsx:116`, consumed `:268`) plus two further `CARELESS_TYPES` consumers (`:389`,
`:727`), so deleting only the careless Set leaves the defect standing in the same file.

**★★ The deeper finding, and it is an owner question this wave cannot settle by itself.** The lane
reports `mistakeIntelligence.ts:272-277` counts calculation as a knowledge gap **and bridges the
topic into weak-areas**, while `tutorRoundTrip.ts:274/357/513` groups it as *"method"* — and **§2
forbids touching either.** Executed as specced, calculation would **read** as recoverable technique
on every surface a student sees **while still routing that student to practise the topic as a
weakness.** That is the precise outcome D1 exists to prevent, arrived at through a file the spec
put out of bounds. **A presentation-layer regrouping cannot fix a routing decision made in a
service.**

**What this disproved about the wave's shape:** the taxonomy defect is not three homes for one
truth. On the lane's enumeration it is **at least thirteen**, one of which is the live-verify
surface itself and two of which sit behind the scope wall.

### QR-1 — PASS at §0b, 2026-08-15. Nothing built, nothing pushed, working tree clean.

**Again the lane's provenance, not the controller's. UNVERIFIED; pass it on at that confidence.**

QR-1 ran its gate to **exit 0** on a hash-verified spec (`522E8EE4EBE7`), confirmed **P1–P3 OK** by
text-locating each anchor and comparing to the cited line, and answered all three open premises.

**★★ P5 — the scout question — resolves to BRANCH (c), and the wave's founding assumption about it
was wrong in the useful direction.** The spec's own §0b already forbade the obvious mistake
(*"the owner's size failure is NOT 'compression is missing'"*), and the lane confirms compression
exists and works. What it found instead: the observed "3 MB" refusal is producible by **exactly one
code path** — `checkUploadFile`'s **picker guard, which refuses an oversized image BEFORE the
existing compressor is ever allowed to run.** ⚠ **The lane explicitly flags branch (c) as loosely
worded for what it found:** this is **not a forgotten call**. It is a **pre-emptive size guard
rejecting a perfectly downscalable image, using the very constant the compressor exists to satisfy.**
`uploadLimits.ts:38` calls that constant *"a target, not a wall"* — **true everywhere except the QR
path, where it is exactly a wall.** A comment that is true of the code it sits in and false of one
caller is the same class as a predicate nobody consumes.

**★ P4 — "the single choke point" was not one.** `prepareQrImage` has **one** caller
(`QrAnswerUploadPage.tsx:113`), but the lane enumerates **five OTHER upload entry points across four
files that read a `File` and never call it** — found by running **four distinct search shapes**, not
one grep. The repo's standing lesson ("the single choke point" was once 11 invocations across 6
files) held again.

**★ A spec defect that would have made §3 unsatisfiable.** §3 orders *"run the scoped suites for
`qrUploadService` and the capture page"* — **those suites do not exist.** The lane reports the entire
QR path has **zero vitest coverage**, so §3's **required mutation cannot be performed until the lane
authors the first assertion in it.** This is the error-path class one level up: a gate instruction
that has never been executed reads identically to one that passes.

**P6 answered, and it closes the wave's one open disjointness edge.** The capture page is
`lazytopper/src/pages/QrAnswerUploadPage.tsx:99–113`, with the crop insertable between file-pick and
`prepareQrImage`. **It is NOT one of TAX-1's five files.** The controller's asserted-not-proven edge
is now **proven disjoint**, by the lane rather than by the controller.

⚠ **One NEW overlap the lane surfaced, recorded here so it is not discovered late:** a full branch-(c)
fix spans **five files, one of which is `WorksheetGradePanel.tsx` — adjacent to SHEET-1's surface
this wave.** The crop itself (2 files) has **zero collisions**. This is why the lane's first owner
question is whether to split them.

⚠ `qr_upload_channel_acceptance.mjs` does **not** freeze the capture page — crop is gate-safe — but
**will go red on any `uploadLimits.ts` constant change (line 300).** Any branch-(c) fix that moves a
constant must expect that gate.

### GRD-1 — PASS at §0b, 2026-08-15. Nothing built, nothing pushed, working tree clean.

**The lane's provenance, not the controller's. UNVERIFIED. This paragraph carries the wave's most
consequential finding and it must travel with its confidence label intact.**

GRD-1 ran its gate to **exit 0** on a hash-verified spec (`CEF2C0B64DF9`), confirmed **P1–P4 OK** —
all four anchors found by text-grep at exactly the cited lines, the shared P1/P2 anchor confirmed at
**both** occurrences independently, and the surrounding blocks read rather than the strings alone.

**★★★ DEFECT (c)'s PREMISE IS DISPROVED — the wave's founding diagnosis does not survive the lane
sent to act on it.** The brief opens on the finding that *"a student's mark and diagnosis depend on
which button they pressed"*, and attributes it to two divergent prompts. The lane reports **both
owner artifacts went through the SAME path and the SAME prompt**: `ct:` ids are built at
`chapterTestGradeService.ts:47` → `gradeWorksheet:248`; `ci:` ids are built **only** in the
`gradeWorksheet` branch at `DesktopCheckImprovePage.tsx:1389/:1473`. **Prompt de-duplication cannot
explain the 2/2-vs-1/2 divergence and would not have prevented it.** The lane's surviving candidate
cause is **scheme PRESENCE** — Chapter Test forwards bank `solutionSteps`
(`chapterTestGradeService.ts:260`) while C&I pasted questions have none — **i.e. defect (b)**, plus
temperature `0.05` non-determinism. ⇒ **Defect (b), not (c), is the lane's load-bearing fix.**
This is the same shape as Wave DPDP-B, whose founding diagnosis was also disproved by its own lane:
**a demonstrated symptom is not a demonstrated cause.** The owner's two Firestore documents remain
entirely real; only the mechanism attributed to them was wrong.

**★★ P5 — no third path, but the ledger's surface LABELS ARE REVERSED, which inverts the blast
radius.** `792` is the **single-question** `/api/check-solution` path; `1208` is the
**worksheet/structured** path — the opposite of what P1 and P2 say. So **P2, not P1, serves four of
five surfaces**: Quick Practice (`quickPracticeSessionService.ts:590`), Chapter Test
(`chapterTestGradeService.ts:248`), Worksheet (`worksheetGradeService.ts:100`), Full Mock
(`fullMockGradeService.ts:148`) and C&I multi-question (`DesktopCheckImprovePage.tsx:1388`) all reach
`/api/grade-worksheet`; only C&I single-question (`:1534`) and `SolutionChecker.tsx:559` reach
`/api/check-solution`. **A clamp aimed by the ledger's labels would have been aimed at the minority
path.**

**★★ Defect (b) has TWO scheme sites and the ledger anchors ONE.** The structured path builds its own
scheme block at `cjs:1469`, concatenated at `cjs:1482`. **Clamping only 623/638 leaves Quick
Practice, Chapter Test, Worksheet and Full Mock unanchored** — the four surfaces that matter most,
and precisely the ones the disproved defect (c) was supposed to have covered.

**★★ P7 — NO SUCH FIELD, and it is worse than absent.** `annotatedStepSchema` (`cjs:103-127`) has
nine keys, none linking a step to the step it consumed; zero hits for `derivedFrom`/`dependsOn`/
`sourceStep`. **And `cjs:1156` overwrites `stepNumber` with the array index `i + 1`**, so even the
ordering the spec falls back on is synthesised rather than model-reported. ⇒ **`ECF_POLICY_V1` rule 2
can only ever be implemented as POSITIONAL ADJACENCY**, which will produce false positives on
case-study sub-parts that are genuinely independent. **The owner must be told that is what it is** —
the spec's own §0b anticipated exactly this answer and required it be said plainly.

**P6 — DIFFERENT, so the literal STOP did not fire.** Block A (`cjs:531-543`, rich, carrying both
worked examples) vs Block B `STRUCTURED_MISTAKE_TAXONOMY` (`cjs:1085-1091`, abridged) — and **Block
B, the materially weaker one, drives four of five surfaces.** Unifying them is still worth doing on
its own merits; what it is not is a fix for the demonstrated divergence.

**Controller's own error, recorded:** the dispatch told GRD-1 that *"TAX-1 and QR-1 own the client"*
where §1 of its spec says *"TAX-1 and SHEET-1"*. Both are true at different points in the wave — the
dispatch named the lanes running concurrently, the spec named the wave's eventual client owners —
but the two statements were not reconciled and the lane had to flag the discrepancy itself.

### Lanes
| lane | PR | what it changed | what it disproved |
| TAX-1 | — | nothing — blocked at §0b before any edit | "three homes for one truth" is ~13; the shared predicate has zero consumers; §2 cannot reach §5's own live-verify |
| QR-1 | — | nothing — passed §0b, awaiting owner ruling | compression was never the defect; a picker guard refuses images the compressor could have saved; §3 names suites that do not exist |
| GRD-1 | — | nothing — passed §0b, awaiting owner ruling | **defect (c) cannot explain the divergence — both artifacts shared one path and one prompt**; P1/P2 labels reversed; defect (b) has two scheme sites; no step-link field exists |

### ★★ THE WAVE-LEVEL FINDING — three lanes, one class of defect

**All three lanes passed their premise gate at exit 0 and all three then contradicted their spec.**
The gate proves a ledger is well-formed and that anchors resolve; **it cannot prove a claim is true**,
and §0c.1 caught in every lane what §0c.0 structurally could not:

- **TAX-1** — the predicate the spec calls "shared" has **zero consumers**.
- **QR-1** — the capability the spec was written to add **already exists**; a guard prevents it running.
- **GRD-1** — the **cause** the wave attributes to a real symptom **is not the cause**.

⇒ **Each spec named a mechanism the author had inferred rather than executed.** Every anchor was
correct, every line number resolved, every quoted string was really there — and the *sentences built
on them* were wrong in all three lanes. **`--strict-anchor` verifies citations, never reasoning.**
This is the strongest available argument that §0c.1 must never be collapsed into §0c.0, and that a
lane's `STOP and report` is the wave's most valuable output, not its least.
| GRD-1 | — | *pending* | *pending* |
| QR-1 | — | *pending* | *pending* |
| SHEET-1 | — | *pending* | *pending* |

### FU ids — RETRACTED / new / kept open

**⚠ RETRACTED AS A MECHANISM — `[FU-GRADER-CROSS-SURFACE-DIVERGENCE]`.** Owner-ruled 2026-08-15.
**The SYMPTOM stands and is not retracted:** one photograph, two surfaces, two marks and two
diagnoses, both documents in Firestore. **What is withdrawn is the CAUSE.** The id was filed as
*"the two grading prompts diverge"*; GRD-1 established that **both owner artifacts traversed the same
path and the same prompt**, so prompt divergence cannot explain the observation and de-duplicating
the prompts would not have prevented it. The two taxonomy blocks **are** genuinely different
(`cjs:531-543` rich vs `cjs:1085-1091` abridged, the weaker one driving 4 of 5 surfaces) and
unifying them remains worth doing **on its own merits** — but it must never again be recorded as the
fix for the demonstrated divergence. **Re-open the cause under scheme presence (defect b) and
temperature non-determinism.**

★★ **This retraction is the record correcting itself, and the reason matters more than the outcome.**
A future lane reading the original id would have unified two prompts, watched the divergence persist,
and had no idea why. **Fix the reason, not just the verdict — the reason is what the next lane
inherits, and it travels further than the change did.**

**NEW THIS WAVE:**

| ID | One line |
|---|---|
| `[FU-GRADER-NONDETERMINISTIC-TEMPERATURE]` | The grader runs at temperature `0.05`, not `0`. **Identical input can produce different marks and different `mistakeType`s on repeat submission** — a surviving candidate cause for the owner's 2/2-vs-1/2, and one that no clamp fixes. Any reproduction attempt must run the same photograph N times before concluding anything from a single pair |
| `[FU-QR-PATH-ZERO-COVERAGE]` | The entire QR upload path has **zero vitest coverage**. QR-1 §3 ordered "run the scoped suites" for files that have none, making its required mutation unsatisfiable. **A gate instruction that has never executed reads identically to one that passes** |
| `[FU-CALCULATION-KNOWLEDGE-BRIDGE]` | `mistakeIntelligence.ts:272-277` counts calculation as a knowledge gap **and bridges the topic into weak-areas**; `tutorRoundTrip.ts:274/357/513` groups it as "method". **A presentation-layer regrouping cannot undo a routing decision made in a service** — D1 is not deliverable from TAX-1's file list alone |

**KEPT OPEN, unchanged:** `[FU-GRADER-FULL-MARKS-WRONG-ANSWER]` (**now the lane's load-bearing
defect**, with the correction that its clamp must be aimed at `1208`, not `792`) ·
`[FU-GRADER-UNANCHORED-STEP-INVENTION]` (**widened: TWO scheme sites, `623/638` AND `1469/1482`;
clamping one leaves four surfaces unanchored**) · `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]` ·
`[FU-BANK-MARKING-SCHEME-COVERAGE]` (~half the bank unanchored; authoring work, not code) ·
`[FU-QR-CROP-UNBUILT]` · `[FU-TUTOR-STEP-BLIND]`.

### ★★ TWO NEW GATE LINES — owner-ruled 2026-08-15, binding on every future spec author

**1 · ENUMERATE THE CONSUMERS, NOT THE DEFINITIONS.** Before a spec calls anything "shared",
"the single source of truth", or "the choke point", it must enumerate **who consumes it** and put
that count in the ledger. TAX-1's P1 named a "shared predicate" with **zero production consumers** —
its only importer was its own test — so §2 steps 1 and 2 would have changed nothing a student sees.
QR-1's `prepareQrImage` had **one** caller and **five other entry points that bypass it**. ⇒ **A
definition's existence is not its reach.** `MOUNT ≠ LIVE`, one level down: a symbol can exist,
compile, be tested, and be consumed by nobody. **Same family as the alert list is not the set** —
importers are what a grep matches; consumers are the claim.

**2 · CITE THE ENCLOSING FUNCTION, NOT THE LINE.** Every `file:line` in a ledger must name the
function or block it sits inside. GRD-1's P1 and P2 cited **the same anchor string at two different
lines and labelled the two surfaces backwards** — `792` is the single-question path, `1208` the
structured one serving four of five surfaces. Both anchors resolved. `--strict-anchor` passed. **A
clamp aimed by those labels would have hit the minority path.** ⇒ Extends the standing rule that
*line references are derived values*: the enclosing function is the part a reader can re-check, and
it is what distinguishes two identical lines from one another.

### Decisions made, with the reason

- **D1–D8 inherited unchanged.** None were re-opened.
- **Controller transcriptions of the four specs were discarded, not used** — they arrived
  transport-corrupted and a file with the right name is not the right file. The owner placed clean
  copies; all five hash-verified SHA-256 before dispatch.
- **The premise gate was NOT run by the controller and NOT in the shared checkout** — that tree runs
  behind trunk, so `--worktree` there could produce a **FALSE RED on a sound spec**. Each lane ran it
  in its own fresh worktree at a freshly derived SHA.
- **All three lanes dispatched as §0c-only premise phases**, stopping before any edit. **This is what
  produced the wave's entire return.** Had they been dispatched to build, three wrong mechanisms
  would have reached PRs and two would have passed every gate.
- **`[FU-GRADER-CROSS-SURFACE-DIVERGENCE]` retracted as a mechanism**, symptom retained — reason
  above.
- **Wave closed without product changes and handed to MI-INTEGRITY-2 with a fresh controller** —
  per addendum §1, one controller per wave; rewritten specs are a new wave, not a continuation.

### ⚠ WHAT MI-INTEGRITY-2 MUST FIX IN THE SPECS BEFORE DISPATCHING ANYTHING

- **TAX-1** — add `ResultsScorecard.tsx` (§5's own live-verify surface is hardcoded there and is
  currently out of scope); rule on the nine further grouping sites; decide whether
  `[FU-CALCULATION-KNOWLEDGE-BRIDGE]` is a sequenced follow-on lane or part of TAX-1 (a
  presentation-only lane cannot deliver it either way).
- **GRD-1** — swap the P1/P2 surface labels; widen defect (b) to **both** scheme sites; re-aim
  defect (c) as a merits-only cleanup; rule on `ECF_POLICY_V1` rule 2 running on **positional
  adjacency alone**, with its false positives on independent case-study sub-parts, since
  `cjs:1156` overwrites `stepNumber` with the array index and no link field exists.
- **QR-1** — the crop (2 files, zero collisions) is buildable as specced; the branch-(c) fix spans
  five files, one adjacent to SHEET-1, and should be split out. Confirm the observed failure
  message's wording — **if it carried no byte count, branch (b) reopens.** §3 must not order suites
  that do not exist.
- **SHEET-1** — never dispatched; its P7 (does `annotatedSteps` populate on `qp:` documents?) is
  still unanswered and still capable of making that lane materially larger.
- **⚠ THE OWNERSHIP TABLE CHANGES SHAPE BETWEEN PHASES AND NO ARTEFACT SAID SO.** Owner-ruled root
  cause, 2026-08-15. The controller's dispatch told GRD-1 that *"TAX-1 and QR-1 own the client"*
  while its spec said *"TAX-1 and SHEET-1"* — both true, at different points in the same wave, and
  the lane had to flag the discrepancy itself. **A wave with a sequenced lane has more than one
  ownership table, and the spec must say which phase each one describes.**

### ★ CARRY FORWARD VERBATIM
- **The WIRE-2 dormancy block in `CURRENT_STATE.md` must survive the prepend AND be restated in the
  new `[CURRENT]`.** Its absence once cost five days.
- Exactly one un-superseded `[CURRENT]`; the previous one **demoted, not deleted**.
- The prepend is proven by a **per-file heading census** — **uniqueness is not completeness.**
- The spec-provenance finding above (transport corruption in the delivery path, hash-verified
  placement, the `Copy-Item`-never-a-text-cmdlet rule).
