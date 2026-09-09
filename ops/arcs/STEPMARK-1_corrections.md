# STEPMARK-1 — corrections record (durable)

**What this document is.** The durable, tracked record of **two corrections to the STEPMARK-1
spec**. It exists because the spec it corrects does not survive: the working spec lived at
`ops/.specs/STEPMARK-1.md`, and **`ops/.specs/` is gitignored deliberately** — `.gitignore`
carries it beneath the comment *"Agent instruction files saved by lanes for the premise gate.
Never committed."* (landed by merged `#648`, rationale **OPS-1 decision D1**: an untracked spec
cannot be swept into a preservation commit). That rationale is untouched here.

**The ruling that resolves it — owner, 2026-09-09 (Wave CONTENT-1, lane FOLLOWON-1):**
**SPECS ARE EPHEMERAL in `ops/.specs/`; ARCS ARE DURABLE in `ops/arcs/`.** A correction that must
outlive its lane goes here. Nothing is force-added, and `ops/.specs/**` is not touched.

⛔ **AND THIS DOCUMENT IS ALREADY THE ONLY COPY — WHICH IS THE RULING'S OWN EVIDENCE.**
Unlike `QUARANTINE-1_corrections.md`, this record **cannot** transcribe its source verbatim,
because **there is no source left to transcribe.** Verified on this machine at the time of
writing: `ls ops/.specs/` returns **19 files and STEPMARK-1 is not among them** — the spec these
corrections apply to has already been deleted, exactly as the owner's rule predicts. The brief for
this lane states the cost plainly: *"no correction to a spec has ever survived — three times this
wave that has cost something."*

⇒ **Therefore every claim below is stated in full and re-derived from the REPOSITORY, not quoted
from the spec.** Where the spec's original wording is needed to make a correction legible, it is
quoted from the brief that carried it forward, and **labelled as such** rather than presented as a
verified transcript.

**Supersedes:** the STEPMARK-1 spec's **§2** (batch procedure) and **§5** (framing of the damaged
rows), as they stood when batches 1-4 were executed. Where this document and any surviving copy of
the spec disagree, **this document is authoritative.**

**Measured at trunk `df6ab0ce6fe6c5e7e9f52ac9d86b98ecc15a28da`** (re-derived with
`git ls-remote origin base/approved-thru-437`, not copied from any document), except where a
number is explicitly attributed to another SHA. Per `QUARANTINE-1_corrections.md` §6 — **a number
quoted in conversation carries no SHA, and the same quantity at two SHAs is two quantities** —
every count below names the tree it was measured on **in the same sentence as the number**.

---

## CORRECTION 1 · §2 DOES NOT CARRY THE DAMAGE-DETECTOR SKIP THAT WAS RULED

**The correction.** A STEPMARK-1 batch must **SKIP AND REPORT** any row flagged as **unrepaired by
RECOVER-1 Phase A**. §2 as executed carries no such step: its only exclusion is
`!AI_GENERATED_QUESTION_IDS.has(id)`.

⚠ **WHY THIS IS NOT BOOKKEEPING. ANNOTATING A ROW WHOSE TEXT IS KNOWINGLY INCOMPLETE PRODUCES A
CORRECT-LOOKING MARK SCHEME ON A BROKEN STEM.** A step-marked row reads as finished work. It passes
`isPublishable`, it becomes eligible for a permanent, cached, screenshot-able page, and the mark
scheme lends the broken stem an authority it has not earned. The damage does not announce itself
once a plausible scheme sits beside it — that is precisely the state the quarantine exists to
prevent, re-created by the repair track.

★ This is the same rule `QUARANTINE-1_corrections.md` §5 already states — *"STEPMARK-1 must skip
and report any row failing the detector, instead of annotating it"* — and it is recorded **again,
here**, because it was written into a document about a **different** lane. A rule that governs
STEPMARK-1 must be findable from STEPMARK-1.

### The flagged set: 23 rows, and every id

**8 bracket rows + 15 `U+F09F` rows = 23.** Both halves are RECOVER-1 Phase A outputs (`#735`,
commit `5d9c65e8`) and are independently confirmed in tracked code at
`lazytopper/src/config/publishability.guard.test.ts`, which reads: *"NO row flagged by RECOVER-1
(#735) was annotated: the 8 bracket rows and the 15 U+F09F rows are knowingly incomplete text, and
a mark scheme on a broken stem is the defect the quarantine exists to stop."*

**BRACKET ROWS (8)** — `symbol_font_decode.mjs` removed multi-part bracket pieces from these and
flagged each for owner review. The pieces could not be collapsed back into `(` and `)`: every
bracket run in this bank interleaves left and right pieces and sits *after* the expression it
enclosed, so recovering `(1/a + 1/b)` is **inference, not decoding**.

```
PYQ-M-POLY-004   PYQ-M-TRIG-004   PYQ-M-TRIG-006   PYQ-M-TRIG-007
PYQ-S-ELEC-007   PYQ-S-2025-ELEC-009   PYQ-S-2025-REPR-010   PYQ-S-LIGHT-009
```

**`U+F09F` ROWS (15)** — left **entirely** untouched by Phase A. Symbol code `0x9F` is
**unassigned** in the published Adobe Symbol Set Encoding. It reads unmistakably as a list bullet
in context, *and that is exactly why it is dangerous*: a plausible reading is still a guess.

```
PYQ-S-CHEM-006   PYQ-S-CHEM-013   PYQ-S-CTRL-007   PYQ-S-CTRL-008   PYQ-S-ELEC-001
PYQ-S-REPR-006   PYQ-S-LIFE-015   PYQ-S-LIFE-016   PYQ-S-LIGHT-004  PYQ-S-LIGHT-011
PYQ-S-LIGHT-012  PYQ-S-MAG-007    PYQ-S-MAG-009    PYQ-S-ENV-001    PYQ-S-ENV-005
```

**HOW TO RE-DERIVE THE 15 — the recipe, beside the result.** The list is not a historical artefact;
the tool still prints it, because those rows are still undecoded:

```bash
cd lazytopper && node scripts/ops/symbol_font_decode.mjs
#   rows LEFT UNTOUCHED (uncited codepoint) : 15
#     PYQ-S-CHEM-006 PYQ-S-CHEM-013 ... PYQ-S-ENV-005
```

⚠ **THE 8 BRACKET ROWS CANNOT BE RE-DERIVED THAT WAY, AND A LANE THAT TRIES WILL READ ZERO.** The
same command reports `rows -> OWNER REVIEW (bracket pieces removed): 0` at trunk, because `#735`
**already removed the pieces** — the detector is looking for evidence its own fix deleted. The set
is recoverable only from the **pre-decode** tree:

```bash
git archive 5d9c65e8^ lazytopper/src/data/questionBanks | tar -x -C <scratch>
# then scan for codepoints in U+F0E6..U+F0FE and U+F8E5..U+F8FE, attributing each to its row id
```

★ **A DETECTOR THAT HAS ALREADY BEEN RUN NO LONGER DETECTS. USE THE LIST, DO NOT RE-DERIVE IT** —
the same rule `QUARANTINE-1_corrections.md` §3 states for its own 35 ids, arrived at independently
here for a different reason.

### When it becomes load-bearing: batch 5 onward

**14 of the 23 are addressable at `df6ab0ce`. The other 9 are not in the filtered bank at all** —
QUARANTINE-1 withheld them, so they are filtered at assembly and no batch can reach them. **The
skip therefore protects exactly 14 rows, and every one of them is still ahead of the track.**

Measured at `df6ab0ce` by resolving each of the 23 ids against `canonicalQuestionBank` and applying
the `addressable` predicate from `publishability.guard.test.ts` verbatim
(`!AI.has(id) && !isPublishable(q, AI).ok && reason in {unmarked-step, no-solution-steps}`):

| topic | addressable flagged rows | ids |
|---|---|---|
| `electricity` | 3 | `PYQ-S-ELEC-007`, `PYQ-S-2025-ELEC-009`, `PYQ-S-ELEC-001` |
| `control-and-coordination` | 2 | `PYQ-S-CTRL-007`, `PYQ-S-CTRL-008` |
| `light-reflection-and-refraction` | 2 | `PYQ-S-LIGHT-009`, `PYQ-S-LIGHT-004` |
| `magnetic-effects-of-electric-current` | 2 | `PYQ-S-MAG-007`, `PYQ-S-MAG-009` |
| `our-environment` | 2 | `PYQ-S-ENV-001`, `PYQ-S-ENV-005` |
| `how-do-organisms-reproduce` | 1 | `PYQ-S-REPR-006` |
| `polynomials` | 1 | `PYQ-M-POLY-004` |
| `trigonometry` | 1 | `PYQ-M-TRIG-004` |
| **total** | **14** | across **8 topics** |

⚠⚠ **CORRECTION TO THE CORRECTION — IT IS EIGHT TOPICS, NOT SIX.** The instruction that produced
this document said *"14 of those 23 rows are addressable in six of the next nine topics."* **The
count 14 is exactly right and reproduces; the topic count does not.** Measured at `df6ab0ce` the 14
rows are spread across **EIGHT** distinct `topicKey`s, enumerated above. Recorded rather than
quietly fixed, because the *shape* of the claim is what a batch lane acts on: a lane told "six
topics" that finds flagged rows in a seventh has been given a reason to doubt the whole list at the
moment it most needs to trust it.

★ **AND NONE OF THE 8 TOPICS HAS BEEN BATCHED YET, WHICH IS THE ACTIONABLE POINT.** Batches 1-4 were
`life-processes`, `chemical-reactions-and-equations`, `metals-and-non-metals` and
`acids-bases-and-salts` (read from the annotated backlog ledger in `publishability.guard.test.ts`).
**Zero of the 14 sit in those four topics** — which is why the missing §2 step has cost nothing so
far, and why that is not evidence the step is unnecessary. `#739`'s own commit body records the
skip being honoured by hand for batch 4 (*"ZERO of the 23 sit in this topic (measured)"*). **A rule
kept by hand in four batches, in a document that does not state it, is a rule that survives exactly
as long as the person who remembers it.** From **batch 5 onward the skip is load-bearing** the first
time the track reaches any of the eight topics above.

---

## CORRECTION 2 · §5's "THE 164 DAMAGED ROWS" IS WRONG WORDING, AND `#735` DISPROVED IT

**The correction.** §5 refers to *"the 164 damaged rows"*. **They were never damaged.** They carried
**Adobe Symbol font glyph codes that nobody decoded** — the PDF extractor emitted each as
`0xF000 + <Symbol character code>`, and every downstream reader treated the result as corruption.
`R = 35 Ω` was stored with the ohm sign written as `U+F057`. **The information was never lost; it
was written in a font whose glyph codes nobody read.**

`#735` (commit `5d9c65e8`, *"decode the Adobe Symbol glyph codes — 926 characters across 98 rows
were never damaged"*) settled it by **decoding** rather than re-extracting: 926 codepoints across
98 rows in 33 files, through a 34-entry table cited to the **Adobe Symbol Set Encoding Vector**
(PostScript Language Reference Manual, 3rd ed., Appendix E). The evidence is that **the equations
balance**: `2Cu + O2 -> 2CuO`, `BaCl2 + Na2SO4 -> BaSO4 + 2NaCl`, and `15 V / 30 Ω = 0.5 A`.

⚠ **WHY THE WORDING MATTERS ENOUGH TO CORRECT.** "Damaged" names a row as **unrecoverable** and
sends the next lane to the source PDF — or to withhold the row permanently. "Undecoded" names it as
**a pending read of data already in hand**, which is a repair any lane can perform offline from a
published encoding table. **The word chose the wrong remedy for 98 rows.** It also mis-set the
prior for the residue: the rows that genuinely cannot be resolved are the ones where the encoding
is *silent* (`U+F09F` is unassigned), not the ones where it is merely unread.

### The census, with its recipe and its SHA

Measured on the **pre-decode** tree — `fe5c55e71d076210910d45ad8332a5c545bd8427`, the parent of
`5d9c65e8` — by codepoint arithmetic over every `.ts` file under
`lazytopper/src/data/questionBanks`, counting `cp >= 0xE000 && cp <= 0xF8FF`:

```
files scanned          : 412
files carrying PUA     : 39
total PUA occurrences  : 1,147
distinct codepoints    : 53
  in U+F020..U+F0FF    : 1,141
  in U+F8E5..U+F8FE    : 6
  outside both blocks  : 0
```

★ **THE LOAD-BEARING RESULT IS THE LAST LINE: `outside both blocks = 0`.** Every one of the 1,147
characters sits inside **Symbol's two private-use blocks**. That is what makes "a font nobody
decoded" a *measurement* rather than a story — random corruption does not confine itself to the
encoding ranges of one specific typeface.

⚠⚠ **AND TWO NUMBERS IN THE INSTRUCTION THAT PRODUCED THIS DOCUMENT DO NOT REPRODUCE.** It said
*"52 distinct codepoints across 996 occurrences."* Measured at `fe5c55e7` the figures are
**53 distinct codepoints across 1,147 occurrences**. The `#735` commit body's own accounting is
consistent with the larger number and not with 996: **926 decoded + 138 bracket pieces removed +
78 `U+F09F` + 5 further codepoints on the untouched rows = 1,147.** `52` is plausibly `53` minus the
one **uncited** codepoint (`U+F09F`); `996` is not reconstructible from any grouping found here.

⇒ ★★ **THE SUBSTANCE OF THE CORRECTION IS UNAFFECTED AND THE ARGUMENT IS UNWEAKENED** — *not
damaged, undecoded, all inside Symbol's private-use blocks* is fully verified. **Only the two
counts are withdrawn and restated.** Per `QUARANTINE-1_corrections.md` §6: keep the conclusion,
re-derive the number, and state the SHA in the same sentence as the count.

### What "164" actually counted, so the number is not lost with the wording

**164 is not the PUA population**, and dropping the word "damaged" should not drop the figure. The
164 came from QUARANTINE-1 §2's three-class detector — **PUA/`U+FFFD`**, **TRAILING_OP** (a trailing
`+ - * / = ^ ( − × ÷` in `answer` and `options` **only**) and **TRUNCATED_OPTION** (a trailing
`, ; :` in `options` **only**) — which together flagged **164 rows · 162 non-AI · 387 fields**.

Only the **first** of those three classes is what `#735` re-read as a font encoding. Measured at
`fe5c55e7`, **113 rows carried PUA** (`98` repaired by `#735` + `15` left untouched). The remaining
rows in the 164 were flagged for **trailing-character** reasons that have nothing to do with Symbol
and are **not** addressed by decoding.

⇒ **The correct restatement of §5 is narrower than the sentence it replaces:** *of the 164 flagged
rows, the 113 carrying private-use codepoints were never damaged — they were undecoded Adobe Symbol
glyph codes, and 98 of them are now repaired.* Saying "the 164 damaged rows" over-claims in both
directions at once: it calls 98 repairable rows destroyed, and it lends the *genuinely* truncated
rows the same single label, which is how a mixed set gets one remedy.

---

## ★★ THE LESSON THIS DOCUMENT ENDS ON — the one that outlives both corrections

**A GREEN GATE IS EVIDENCE ABOUT WHAT THE GATE LOOKS AT, AND NOTHING ELSE.**

This defect survived every gate for months, and the reason is worth carrying into every successor
spec: **`scripts/ops/mojibake_acceptance.mjs` matches `U+FFFD` and a set of UTF-8 lead bytes. It has
NO PRIVATE-USE RANGE AT ALL.** A green `check:mojibake` was never evidence about these 1,147
characters in either direction — it had no opinion to give. 1,147 characters of undecoded font sat
in the shipped question bank underneath a gate that ran on every commit and could not see them.

⇒ Before citing a gate's green as evidence for a property, **read the gate and confirm it tests that
property.** `check:mojibake` proves nothing here. The same trap is recorded independently against
`syllabusGuard.ts` (it matches the `subtopic:` field as an exact full string, so it cannot see a
content exclusion) — **two guards, one failure class: a pass that was never about the question
being asked.**
