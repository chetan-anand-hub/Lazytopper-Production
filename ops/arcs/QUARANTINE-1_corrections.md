# QUARANTINE-1 — corrections record (durable)

**What this document is.** The durable, tracked record of the corrections carried by
QUARANTINE-1 **v1.2**. It exists because the spec it corrects does not survive: the working spec
lives at `ops/.specs/QUARANTINE-1.md`, and **`ops/.specs/` is gitignored deliberately** —
`.gitignore` carries it beneath the comment *"Agent instruction files saved by lanes for the
premise gate. Never committed."* (landed by merged `#648`, rationale **OPS-1 decision D1**: an
untracked spec cannot be swept into a preservation commit). That rationale is untouched here.

**The ruling that resolves it:** **SPECS ARE EPHEMERAL in `ops/.specs/`; ARCS ARE DURABLE in
`ops/arcs/`.** Nothing is force-added, and `ops/.specs/**` is not touched.

⇒ **Therefore this document must stand alone without the spec.** The full v1.2 text is transcribed
verbatim below rather than referenced, because a pointer into an untracked, ephemeral file is a
pointer into nothing.

**Derived from:** `QUARANTINE-1_v1.2_CORRECTED.md`,
sha256 `b0eacbf10bb3c164a4ec3b2cf0f71e4d6ea4fda92c94f25ec8d2c4a055c91a98`, 15,861 bytes,
278 newline-terminated lines (an editor counting the phantom final empty line reads 279).
Verified before transcription; the body below is that file byte-for-byte.

**Supersedes v1.1** (`AB2B745AA338`, 8,978 bytes, 168 lines). Where the two disagree, **v1.2 is
authoritative** — v1.1's superseded claims are quoted in the body only so the correction is legible.

**The corrections, in the order that costs time if missed.** The v1.2 text enumerates **six**;
all six are in the body:

1. **FOUR pins move, not two** — v1.1's §4 named two. All four live in
   `publishability.guard.test.ts`. A lane following v1.1 literally would have shipped a suite with
   two reds it had been told could not exist.
2. **The ray-diagram control must be RE-EXPRESSED, never renumbered** — sourced from
   `RAW_CANONICAL_QUESTION_BANK`, the raw concatenation before withholding is applied. Renumbering
   keeps it green while halving the evidence it carries; repeated across batches it ends at
   `toHaveLength(0)`, a control that asserts nothing. Recorded as `[FU-PIN-ERODES-TO-VACUITY]`.
3. **The `garbled` tag is at `:1705`, not `:1708`** — `:1708` is a *continuation line* of the
   `garbled-options` sentence, sitting inside the comment block; ids inserted there would not
   parse. `WITHHELD_QUESTION_IDS` opens at `:1710`. ⇒ **Cite the tag by its text, not by a line
   number.**
4. **Trim trailing whitespace before the trailing-character test** — v1.1 never stated it, though
   its counts require it. Load-bearing for exactly one row (`SCQ-S-METAL-044`): untrimmed the set
   is 34 and the list is wrong by one; trimmed it is 35.
5. **esbuild's win32 binary is stripped like rollup's** — by the same `supportedArchitectures` pin
   in `pnpm-workspace.yaml`, so the published `npx esbuild` recipe is not runnable on Windows as
   written. Two fixes given; `#726` used `tsx`.
6. **29 rows carry a `pyqYear`, not 32** — narrative only, no gate moves.

**And the lesson the document ends on, which outlives the spec:** **a number quoted in conversation
carries no SHA, and the same quantity at two SHAs is two quantities** — the count was 31 at
`abfb1e81` and 35 at `ae1cad75`, and *nothing was wrong with either*. The set grows with every
merged step-marking batch. ⇒ §3's list must be **USED, NOT RE-DERIVED**, and any successor spec
must state the SHA its counts were measured at **in the same sentence as the number**.

---

*Everything below this line is the v1.2 source transcribed verbatim. Nothing is added, removed,
reordered or reworded; its own `#` heading opens the transcript.*

---

# QUARANTINE-1 — the damaged rows that step-marking made publishable

**v1.2 · 2026-09-04 · corrections measured on `#726` at merge base `ae1cad75`, re-verified after
merging trunk `a18fa645`** (both re-derived with `git ls-remote origin base/approved-thru-437`, not
copied from any document).

**v1.1 · 2026-09-03 · trunk `ae1cad7572ece63eaa3f55caf009b505298f887e`.**

⚠ **WHAT CHANGED IN v1.2 — READ §4 FIRST.** Six corrections from QUARANTINE-1 Phase B, in the order
that costs time if missed: **§4 undercounted the moved pins — FOUR move, not two** · **§4's
ray-diagram control must be RE-EXPRESSED, never renumbered** · **§3's anchor `:1708` is wrong, it is
`:1705`** · **§2 never stated the trailing-whitespace trim its own counts require** · **§2's esbuild
recipe is not runnable on Windows as written** · **§1's "32 carry a `pyqYear`" is wrong, it is 29.**

⚠ **THE COUNT IS 35, NOT 31.** The 31 reported earlier was measured at `abfb1e81`. `#724`
(STEPMARK-1 batch 3, metals-and-non-metals) has merged since and added **four more**:
`PYQ-S-2024-METAL-001`, `PYQ-S-2025-METAL-005`, `PYQ-S-2026-METAL-010`, `PYQ-S-2026-METAL-011`.
**Use this list, not the earlier number.** The set grows with every step-marking batch, which is
the argument for holding STEPMARK-1 rather than chasing it.

---

## 1 · WHAT THIS LIST IS

Rows that are **glyph-damaged** AND **currently pass `isPublishable`** — i.e. eligible to be
emitted as a public, indexable page right now. Every one of them became publishable because
step-marking removed its last blocker; the damage was always there and was never what held them
back.

**29 of the 35 carry a `pyqYear`** *(v1.2 correction — v1.1 said 32)*, so each would publish a
destroyed question under a real CBSE board attribution. Measured by resolving each of the 35 ids to
its source object: **29 with `pyqYear`, 6 without.** The six: `CBE-S-MNM-B-006`, `SCQ-S-ACID-044`,
`SCQ-S-CHEM-026`, `SCQ-S-CHEM-039`, `SCQ-S-ELEC-037`, `SCQ-S-METAL-044`.

⚠ **`CBE-S-MNM-B-006` uses JSON-style quoted keys (`"id": "…"`) in `metals-and-non-metals.cbe.ts`,
so a scan for `id: "…"` misses it entirely.** Verified directly: its object contains no `pyqYear`.

★ **Narrative only — no gate moves, and the argument is unweakened: 29 destroyed questions under a
real CBSE board attribution is the same case as 32.**

**Worst specimen, owner-verified:** `PYQ-S-CHEM-002`, `pyqYear: "2023"`, options
`["2,", "2,", "2,", "4,"]` — three identical, all truncated to a digit and a comma. It is the only
row in the set with duplicate options, and it is unanswerable and ungradeable as printed.

## 2 · HOW TO RE-DERIVE IT — the recipe, beside the result

A list quoted without its recipe is a derived value nobody else can check. Bundle the assembled
bank and run the detector; do not text-scan the source files.

```bash
npx esbuild <script>.ts --bundle --platform=node --format=cjs --outfile=/tmp/q.cjs && node /tmp/q.cjs
```

⚠⚠ **PLATFORM NOTE (v1.2) — THE RECIPE ABOVE IS NOT RUNNABLE ON WINDOWS AS WRITTEN.** **esbuild's
win32 binary is stripped by the same `supportedArchitectures` pin in `pnpm-workspace.yaml` that
strips rollup's**, so `npx esbuild` fails with *"'esbuild' is not recognized"*. Two fixes, either
acceptable:

1. **Drop the binary**, exactly as `CLAUDE.md` §6 already documents for rollup — `npm pack
   @rollup/rollup-win32-x64-msvc@<version>` into
   `node_modules/.pnpm/rollup@<version>/node_modules/@rollup/`. (Required anyway for `vite build`
   and `vitest` on Windows.)
2. **Use `tsx`**, which carries its own esbuild and is present at `lazytopper/node_modules/.bin/tsx`.
   It performs the identical runtime import of the assembled bank. **This is what `#726` used.**

The recipe is otherwise correct and reproduced every number below.

The predicate is stated in full below. ⚠ **Do not go looking for
`handoff/CONTENT_TRACK_STATE.md` — it was written on 2 September and NEVER LANDED ON TRUNK.** This
section is the authority. It was written independently and then checked against that document's
§3: both produce **164 damaged rows · 162 non-AI · 387 damaged fields · Science 119 · Maths 45**,
and both agree on all ten of its named controls. Two implementations, one set of numbers.

- **PUA / U+FFFD** — codepoint arithmetic `0xE000..0xF8FF` or `0xFFFD`, across `questionText`,
  `answer`, `finalAnswer`, `explanation`, every `solutionSteps` entry and every `options` entry.
  ★ **Use `codePointAt`, never a regex `\uE000` escape** — that escape has been mangled in transit
  into a literal hyphen class, matching hyphens while reporting CLEAN.
- **TRAILING_OP** — a trailing `+ - * / = ^ ( − × ÷` in **`answer` and `options` only.** A
  *leading* sign is meaningful: `-d/a` is a real answer, and scanning for it produces false
  positives.
- **TRUNCATED_OPTION** — a trailing `, ; :` in **`options` only.**

⚠⚠ **TRIM TRAILING WHITESPACE BEFORE THE TRAILING-CHARACTER TEST (v1.2 — v1.1 never stated this,
though its counts require it).** It is load-bearing for **exactly one row**: `SCQ-S-METAL-044`'s
`answer` ends `"… NaCl Electrolysis N+ "` — last codepoint **32 (SPACE)**.

```
UNTRIMMED -> not flagged   =>  the set is 34, and §3's list is wrong by one
TRIMMED   -> flagged       =>  the set is 35, which is what §2/§3 assert
```

★ **Three independent implementations have now landed on the trimmed reading and reproduced
162 / 35.** The spec should not leave the next one to guess.

Then intersect with `isPublishable(q, AI_GENERATED_QUESTION_IDS).ok === true`.

★ **THE FIELD SCOPE IS THE RULING, NOT AN IMPLEMENTATION DETAIL.** Widening the trailing-operator
rule to `questionText` produces **58 false positives**: `POLY-E08` reads *"…then αβ ="* and ends in
`=` because the student supplies the answer. A trailing `=` in a stem is an invitation to complete,
not truncation. Likewise `+4 D` and `-0.8D` are valid answers — a **leading** sign is meaningful,
only a **trailing** one is truncation.

**Controls — all ten, before any clean result is trusted. A detector with no demonstrated positive
is not evidence.**

| MUST be flagged | why |
|---|---|
| `PYQ-M-QE-001` | every option lost its minus sign and `= 0` |
| `PYQ-M-QE-002` | options truncated at a comma |
| `PYQ-S-LIGHT-006` | PUA glyphs |
| `PYQ-S-CHEM-002` | every option destroyed |
| `PYQ-S-LIGHT-001` | nothing left but signs and commas |

| MUST NOT be flagged | why |
|---|---|
| `POLY-E08` | complete-the-statement stem ending in `=` |
| `CC2-005` | correct nomenclature ending in `-` |
| `LT2-048` | answer `"+4 D"` — a valid dioptre |
| `PL2-R12` | leading-sign answer |
| `LIGHT-NCERT-9-SA-006` | clean control |

**Expected at this trunk:** damaged non-AI = **162** · damaged AND publishable = **35** ·
bank length = **8,673** · publishable = **2,851**.

## 3 · THE 35 IDS — paste into `WITHHELD_QUESTION_IDS`

Add as one block in `lazytopper/src/data/canonicalQuestionBank.ts`, under the existing `garbled`
reason tag. **Data-only and fully reversible** — RECOVER-1 removes each id as it repairs the row from
source.

⚠⚠ **ANCHOR CORRECTION (v1.2): THE TAG IS AT `:1705`, NOT `:1708`.** v1.1 said `:1708`. Verified
against the pristine file at `ae1cad75`:

- `:1705` — `// missing entirely; garbled = expression scrambled beyond recovery;` ← **the actual tag**
- `:1707` — the `garbled-options` tag begins
- `:1708` — `// so no answer key can resolve to exactly one option; figure = …` ← a **continuation
  line** of the `garbled-options` sentence
- `:1710` — `export const WITHHELD_QUESTION_IDS` opens

**`:1708` sits INSIDE the comment block above the set opening, so id lines inserted there would not
parse.** ⇒ ★ **CITE THE TAG BY ITS TEXT, NOT BY A LINE NUMBER — line references are derived values,
and this wave has had anchors wrong three times.**

```ts
  // ---- garbled: glyph damage that step-marking made publishable (QUARANTINE-1, 2026-09-03) ----
  // Withheld pending RECOVER-1. Each row's damage class is stated. Remove an id when its
  // row is repaired from the source paper — NEVER when a gate merely goes green.
  // -- acids-bases-and-salts --
  "SCQ-S-ACID-044",              // garbled: trailing-op
  // -- arithmetic-progression --
  "PYQ-M-AP-007",                // garbled: pua
  // -- chemical-reactions-and-equations --
  "PYQ-S-2024-CHEMRXN-006",      // garbled: pua
  "PYQ-S-2024-CHEMRXN-007",      // garbled: pua+trailing-op
  "PYQ-S-2024-CHEMRXN-012",      // garbled: pua
  "PYQ-S-2024-CHEMRXN-014",      // garbled: trailing-op
  "PYQ-S-2024-CHEMRXN-015",      // garbled: pua+trailing-op
  "PYQ-S-2024-CHEMRXN-016",      // garbled: pua
  "PYQ-S-2024-CHEMRXN-017",      // garbled: pua
  "PYQ-S-2025-CHEMRXN-010",      // garbled: pua+trailing-op
  "PYQ-S-2025-CHEMRXN-018",      // garbled: pua
  "PYQ-S-2025-CHEMRXN-019",      // garbled: pua
  "PYQ-S-CHEM-002",              // garbled: truncated-options
  "PYQ-S-CHEM-006",              // garbled: pua
  "PYQ-S-CHEM-013",              // garbled: pua
  "PYQ-S-CHEM-016",              // garbled: trailing-op
  "SCQ-S-CHEM-026",              // garbled: trailing-op
  "SCQ-S-CHEM-039",              // garbled: trailing-op
  // -- electricity --
  "PYQ-S-ELEC-005",              // garbled: pua
  "SCQ-S-ELEC-037",              // garbled: trailing-op
  // -- life-processes --
  "PYQ-S-2025-LIFEP-004",        // garbled: pua
  "PYQ-S-2026-LIFEP-006",        // garbled: pua
  "PYQ-S-LIFE-010",              // garbled: trailing-op
  "PYQ-S-LIFE-015",              // garbled: pua+trailing-op
  "PYQ-S-LIFE-016",              // garbled: pua+trailing-op
  "PYQ-S-LIFE-017",              // garbled: trailing-op
  // -- light-reflection-and-refraction --
  "PYQ-S-LIGHT-011",             // garbled: pua
  "PYQ-S-LIGHT-012",             // garbled: pua
  "PYQ-S-LIGHT-013",             // garbled: pua
  // -- metals-and-non-metals --
  "CBE-S-MNM-B-006",             // garbled: trailing-op
  "PYQ-S-2024-METAL-001",        // garbled: pua
  "PYQ-S-2025-METAL-005",        // garbled: pua
  "PYQ-S-2026-METAL-010",        // garbled: pua+trailing-op
  "PYQ-S-2026-METAL-011",        // garbled: pua
  "SCQ-S-METAL-044",             // garbled: trailing-op
```

## 4 · WHAT MOVES, AND WHAT MUST NOT

⚠⚠⚠ **v1.2 — FOUR PINS MOVE, NOT TWO. v1.1 SAID TWO AND THAT IS THE CORRECTION THAT COSTS TIME;
MAKE IT FIRST.** All four live in `lazytopper/src/config/publishability.guard.test.ts`.

| pin | before | after | was it in v1.1's §4? |
|---|---|---|---|
| `expect(canonicalQuestionBank).toHaveLength(…)` | 8673 | 8638 | YES |
| `expect(publishable).toHaveLength(…)` | 2851 | 2816 | YES |
| `publishes the four 2023 'draw a ray diagram' rows` | 4 (+ 4 ids) | **see below — DO NOT RENUMBER** | **NO** |
| `publishable + addressable − held` | 5244 | 5209 | **NO** |
| `publishable + addressable − excluded` | 4822 | 4787 | **NO** |

All are −35-consistent; none indicated a wrong list. **But a lane following v1.1's §4 literally would
have restated two, believed itself complete, and shipped a suite with two reds it had been told could
not exist.**

**TRIPWIRES — THESE MUST NOT MOVE, AND DID NOT.** Verified green on `#726`:
`held + cannotSum − excluded === 24`, `cannotSum === 446`, `cannotSum − 24 === 422`. **If a future
withholding batch moves either, it hit rows it should not have. STOP; do not restate them.**

★★ **AND THE RAY-DIAGRAM PIN MUST BE RE-EXPRESSED, NEVER RENUMBERED.** The naive fix is
`toHaveLength(4)` → `(2)` with two ids dropped. **Do not.** That control exists because a naive filter
banning `"diagram"` once deleted every genuine 2023 board question while all gates stayed green. Two
of its four rows leave the *filtered* bank for a reason with **nothing to do with the figure rule** —
glyph damage. Renumbering keeps it green while **halving the evidence it carries**, and repeated
across batches it ends at `toHaveLength(0)`: **a control that asserts nothing.**

**The fix, adopted on `#726`:** source it from **`RAW_CANONICAL_QUESTION_BANK`** — the raw
concatenation, **before** `WITHHELD_QUESTION_IDS` is applied. All four rows still **exist**; only
their eligibility to be *published* changed. The count stays **4** and the id list stays
`PYQ-S-LIGHT-006 / -011 / -013 / -015`, **immune to both quarantine and RECOVER-1**.
`RAW_CANONICAL_QUESTION_BANK` is now **exported** from `canonicalQuestionBank.ts` for exactly this
purpose. ⚠ **It is for guards and tooling ONLY — product code must keep importing
`canonicalQuestionBank`, or withheld rows stop being withheld.**

**Mutation-proven on `#726`:** pointing the control back at the filtered bank fails with *"expected
[ …(2) ] to have a length of 4 but got 2"*, with the mutation shown applied (`0af2e4c7` →
`5eb0d82f`) and the restore hash-verified. **The re-expression is load-bearing, not cosmetic.**

★★★ **THE GENERAL RULE, WORTH CARRYING BEYOND THIS SPEC: A CONTROL THAT PROVES A RULE IS NOT
OVER-BROAD MUST BE ASSERTED AGAINST THE UNFILTERED POPULATION.** Coupling it to a publication filter
lets an unrelated decision silently drain its evidence while it reports green. *(Recorded on the
follow-ups board as `[FU-PIN-ERODES-TO-VACUITY]`.)*

The two pins v1.1 did name, restated in full:

- `expect(canonicalQuestionBank).toHaveLength(8673)` → **8,638** (−35)
- `expect(publishable).toHaveLength(2851)` → **2,816** (−35, since all 35 currently publish)

⚠ **The −35 must be identical on both.** If the publishable delta is smaller than the bank delta,
some withheld row was not publishable and this list is wrong — STOP rather than adjusting a number.

`expect(AI.size).toBe(2952)` and `expect(aiWithBadSteps).toHaveLength(2102)` **must not move at
all.** None of the 35 is an AI-pack row.

⛔ **AND ONE GATE WILL GO RED. THAT IS CORRECT — DO NOT REVERT AND DO NOT EDIT IT.**
`seoGenerator.guard.test.ts:73` looks up every id found in the emitted HTML and asserts it exists
in the canonical bank. **Seven of the 35 are in the committed pages** — `PYQ-M-AP-007`;
`PYQ-S-2024-CHEMRXN-006`, `-007`, `-014`, `-017`; `PYQ-S-LIGHT-011`, `-012` — so it will fail on
them with *"emitted question id X is not in the canonical bank"*. That is the guard catching the
bank↔page drift ENGINE-1's regeneration exists to close, and it goes green when those three pages
are regenerated. ⚠ Trunk is **already** red from the same class on `FND-L-BD-07`. **Demonstrate
that pre-existing red BEFORE the first edit**, so the record separates what was inherited from what
was caused.

## 5 · WHAT THIS DOES NOT FIX

This is quarantine, not repair. **It unlocks nothing and publishes nothing** — its entire value is
that a destroyed board question stops being eligible for a permanent, cached, screenshot-able page.
The repair is RECOVER-1, from the source papers, with a paper-and-page citation per row.

★ And the rule that prevents a rerun: **STEPMARK-1 must skip and report any row failing the
detector, instead of annotating it.** Its filter today is `!AI_GENERATED_QUESTION_IDS.has(id)` and
nothing else, which is why this set exists and why it grew by four between two readings.

---

## 6 · ★★ A LESSON THE OWNER ENDORSED — CARRY IT INTO EVERY SUCCESSOR SPEC (v1.2)

**A NUMBER QUOTED IN CONVERSATION CARRIES NO SHA, AND THE SAME QUANTITY AT TWO SHAs IS TWO
QUANTITIES.** The count was **31 at `abfb1e81`** and **35 at `ae1cad75`**. **Nothing was wrong with
either** — they measured different trees.

⇒ This set **grows with every merged step-marking batch**, which is why **§3's list must be USED, NOT
RE-DERIVED**, and why **any successor spec must state the SHA its counts were measured at, in the
same sentence as the number.**
