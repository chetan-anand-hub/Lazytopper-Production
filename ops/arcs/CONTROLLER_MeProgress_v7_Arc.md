<!--
PROVENANCE — read this before treating any glyph in this file as authoritative.

THIS FILE IS A REPAIR, NOT THE ORIGINAL. It is a rule-based restoration of an untracked
owner-supplied document that reached disk transport-corrupted. It is committed to git for the
first time on 2026-08-13 by lane OPS-F, because until now it existed as a SINGLE UNTRACKED COPY
on one laptop and nothing could recover it.

SOURCE (read-only, unmodified by this lane):
  path   CONTROLLER_MeProgress_v7_Arc.md
  bytes  22786
  sha256 e19c562506a470b77f6bb54aa33a021ff8538d5f36272546f3c5dca0396b0bb4

HOW THE CORRUPTION WORKS, and why most of it is NOT reversible.
The text was decoded as cp1252, then re-encoded to a Latin-1-only target with unmappable
characters DROPPED, then mojibake'd a second time. A 3-byte UTF-8 marker such as an em dash
(E2 80 94) lost both continuation bytes, because cp1252 maps 0x80 to 0x9F onto characters that
do not exist in Latin-1; only the bare 0xE2 lead byte survived. That lead byte is shared by the
em dash, the star, the arrows, the box-drawing set and many more, so decoding CANNOT tell them
apart. Every such restoration below is an INFERENCE FROM CONTEXT, not a decode.
Two consequences worth knowing:
  a) a glyph whose THIRD byte is 0xA0 or above kept that byte, which narrows the candidates
     sharply. The ellipsis rule below is recovered that way.
  b) the warning sign is such a glyph (E2 9A A0). Its surviving 0xA0 was later normalised from
     a no-break space to an ordinary space, which is why every restored warning sign is followed
     by TWO spaces. THAT SECOND SPACE IS THE CORPSE OF THE GLYPH'S OWN THIRD BYTE. It is ASCII,
     so it was LEFT UNTOUCHED rather than tidied away — see the no-words-changed proof below.

THE RULE TABLE. Damaged sequences are written as CODEPOINTS, never as the damaged characters
themselves, so that this header does not itself trip the mojibake gate. Every substitution in
this file is one of these rules; a reader can audit any glyph without re-deriving the analysis.
Counts are OCCURRENCES OF THE RULE, so R6 x3 means three separate three-star runs, not three stars.

  R1   x46   U+00C2 U+00B7                                  -> · middle dot             MECHANICAL  cp1252 decode of C2 B7 is exact; nothing was lost
  R2   x2    U+00C2 U+00A7                                  -> § section sign           MECHANICAL  cp1252 decode of C2 A7 is exact; nothing was lost
  R3   x2    U+00C3 U+00A2 U+00C2 U+00A6                    -> … ellipsis               INFERRED    the third byte A6 SURVIVED, pinning the sequence to E2 xx A6; context ('params.set("section", ...)' and 'tsc ... | head') settles the middle byte. NOT an em dash
  R5   x4    U+00C3 U+00A2 between two alphanumerics, no spaces -> – en dash                INFERRED    a closed range or a paired label
  R6   x1    U+00C3 U+00A2 x3                               -> ★★★                      INFERRED    the house emphasis ladder; this file itself calls them 'the starred lines'
  R7   x16   U+00C3 U+00A2 x2                               -> ★★                       INFERRED    same ladder, two-star tier
  R8   x2    U+00C3 U+00A2 immediately before a digit       -> − minus sign             INFERRED    signed line counts
  R9   x12   U+00C3 U+00A2 followed by TWO spaces           -> ⚠ warning sign           INFERRED    see (b) above: the doubled space is the surviving 0xA0 third byte. Every instance introduces a caution
  R10  x29   U+00C3 U+00A2, single, in line-start position  -> ★ star                   INFERRED    scaffolding only to its left (heading, bullet, blockquote, table cell, bold-open)
  R11  x93   U+00C3 U+00A2, single, mid-line                -> — em dash                INFERRED    the dominant original use; this is the DEFAULT and therefore the least certain large class
  R12  x6    U+00C3 U+00A2 runs inside the section 2 wave diagram -> box drawing and arrows   INFERRED    reconstructed from COLUMN ARITHMETIC, not from prose. See the diagram note below
  R13  x1    U+00C3 U+00A2 followed by TWO spaces, in 'MOUNT _ LIVE' -> ≠ not equal              INFERRED    the known house phrase 'MOUNT != LIVE'; also an A0-tailed glyph, consistent with rule R9's mechanism
  R14  x3    U+00C3 U+00A2, single, immediately after another marker -> ⁇ left visible           AMBIGUOUS   a marker directly following another marker; context does not settle it
  R15  x1    U+00C3 (solitary lead byte)                    -> × multiplication sign    INFERRED    NOT the em-dash family at all: the surviving C3 pins a Latin-1-supplement character, and the text reads 'mean marks when it appeared x appearance rate'
  R16  x6    U+00C3 U+00A2, single, after a sentence-final '. ' -> ★ star                   INFERRED    the author opens a new emphasised statement here, not a clause join
  R17  x1    U+00C3 U+00A2, single, after an opening parenthesis -> ★ star                   INFERRED    same
  TOTAL 225 substitutions — 48 MECHANICAL, 174 INFERRED, 3 LEFT MARKED AS AMBIGUOUS

WHAT WAS MECHANICAL (byte-recoverable, certain):
  R1   x46   -> · middle dot
  R2   x2    -> § section sign

WHAT WAS INFERRED FROM CONTEXT (a human should spot-check these):
  R3   x2    -> … ellipsis
  R5   x4    -> – en dash
  R6   x1    -> ★★★
  R7   x16   -> ★★
  R8   x2    -> − minus sign
  R9   x12   -> ⚠ warning sign
  R10  x29   -> ★ star
  R11  x93   -> — em dash
  R12  x6    -> box drawing and arrows
  R13  x1    -> ≠ not equal
  R15  x1    -> × multiplication sign
  R16  x6    -> ★ star
  R17  x1    -> ★ star

AMBIGUOUS, DELIBERATELY LEFT VISIBLE AS ⁇ (rule R14) — the context does not settle
which glyph was lost, and guessing silently would hide that:
  section 3 heading, 'LANE MI-CONCEPT-1 [em dash] [?] DISPATCH FIRST'.
  section 5 item 1, 'routed through resolveCanonicalSlug [em dash] [?] this retires the ...'.
  section 10 blockquote, '[?] [two stars] TWO CONTROLLERS ARE RUNNING'.
THE SECTION 2 WAVE DIAGRAM (rule R12) is the most speculative repair in this file and is called
out separately. Nine adjacent markers on the MARKS-1 line are NOT nine em dashes. The three lane
lines carry 2, 9 and 1 lost glyphs at columns that line up exactly: a corner at column 16 above,
a horizontal run spanning columns 10 to 18 through it, and a closing corner at column 16 below.
Every glyph of the light box-drawing set drops to a bare lead byte under this corruption, and a
junction character would NOT have (its third byte is above 0xA0 and would have survived), so the
brace was drawn with plain horizontals. The two lone markers between wave blocks are restored as
downward arrows and the three-marker run between ARRIVAL-1 and RETRY-1 as a rightward arrow.
The WORDS in the diagram are untouched. Only the connectors are reconstructed.

NO WORDS WERE ADDED, REMOVED, OR REORDERED. Only marker glyphs were restored.
PROVEN, not asserted: every non-ASCII character was stripped from the source and from this
file's body, and the two results were compared. They are BYTE-IDENTICAL
(21736 ASCII characters each). Every rule above replaces a non-ASCII run with a
non-ASCII glyph, so no ASCII byte anywhere in the document could move. This header is the only
text added, and it is confined to this comment block.

If the owner still holds the original attachment, replace this file with it and delete this
note. Until then this is the best available copy, and it says so.
—— lane OPS-F, wave OPS-1, base a09653676a299bd2e0ccd2d7fd7672d9138d1d0f
-->

<!--
CONTROLLER PREAMBLE (added by the ME-A controller on receipt, 2026-08-08).
- This arrived as an ATTACHMENT and was NOT on disk. Written here verbatim before any dispatch.
- Some emphasis markers arrived transport-corrupted (stray "a-hat" sequences). DECORATIVE ONLY.
  Read the words, ignore the marker glyphs.
- Nothing in the body was reworded, reordered, or removed.
- SUPERSEDED IN ONE PLACE: Section 10's claim that "YOU write the handoff for BOTH arcs" is
  replaced by the POSITIONAL rule in CONTROLLER_ADDENDUM_Context_Safeguards.md v1.1 section 6.
  Whoever CLOSES A WAVE writes the handoff, after running `gh pr list --state open`.
- FACT CORRECTION, verified 2026-08-08: section 1 says "#631 is NOT on trunk." IT IS NOW.
  #631 merged at 2026-08-08T13:26:12Z; its mergeCommit oid IS trunk head 6c94d8f0;
  MeProgressPage.tsx present, DesktopMePage.tsx and MobileMePage.tsx both absent.
  Section 1 is therefore HISTORY, not a live decision. The DEFECT it names (the MobileSelfChrome
  nesting) is still open and is folded into ME-2.
-->

# CONTROLLER — THE ME / PROGRESS ARC (v7)

**v1.0 · 2026-08-08 · trunk `7786878d` at authoring — RE-DERIVE IT.**
Companion prototype: **`LazyTopper_MeProgress_v7_FINAL.html` — LOCKED.**
Read `LazyTopper_Controller_Subagent_Model.md` first.

> ★ **THE RULE THAT MATTERS: you never read product source, never run builds, never inspect diffs.**
> The moment you "just check" a file you are a subagent with a plan attached.

---

## 0 · ★★★ THE ONE THING THAT DECIDES THE ORDER

**Six wiring gaps stand between the engine and the page. Every one was verified against trunk; each
line cite below resolved at `a0c9c50b`/`7786878d`. Re-verify before dispatch — line numbers move.**

| # | Gap | Evidence | Lane |
|---|---|---|---|
| 1 | Mistake log records no **concept** | `MistakeLogEntry` = `{id,timestamp,questionText,topic,subject,totalMarks,marksLost,mistakeCounts,stepDetails}` — no concept field | **MI-CONCEPT-1** |
| 2 | Mistake log drops **questionId** | ★ `RecordMistakeContext.questionId` EXISTS (`mistakeIntelligence.ts:46-48`); `buildEntry` writes `questionText: ctx.question` and never the id | **MI-CONCEPT-1** |
| 3 | `RungTrend` carries **no marks** | `marksPercentOf` computes `scored` and `available` (`progressStore.ts:197-198`) then returns only `{pct, sample}`; `sample += 1` counts POINTS not marks | **MARKS-1** |
| 4 | Tutor doesn't know **why** the student came | `useTutorSession.ts:350` calls `assembleTutorBrief({uid,topicKey,subject})` — the URL `concept` (`TutorPage.tsx:78`) never enters the brief | **ARRIVAL-1** |
| 5 | TopicHub reads **no query params** | `grep useSearchParams DesktopTopicHubPage.tsx` — 0. CONTROL: same grep finds 2 in `HighlyProbableQuestions.tsx` | **ARRIVAL-1** |
| 6 | No **marks-weighted** exam signal | `computeHistoricalFrequencySignal` measures PRESENCE. A subtopic asked yearly as a 1-marker scores identically to one asked yearly as a 5-marker | **TRENDS-MARKS-1** |

> ★★ **GAP 1 IS A WRITE-PATH CHANGE AND IT COMPOUNDS.** Every mistake logged before it ships is
> logged without a concept and **can never be re-attributed**. It is load-bearing in three separate
> places in v7 — the concept ranking, the chapter drill, and the tutor's arrival block.
> **Dispatch it first, regardless of everything else on this page.**

★ **The good news, all verified:** `CanonicalQuestion.subtopic: string` is **required**, so every one
of the 8 write sites already holds `q.subtopic`. `RecordMistakeContext.questionId` already exists.
`marksPercentOf` already computes both marks numbers. **Gaps 1–3 are field-plumbing, not new
aggregation.**

---

## 1 · ★★ WHAT TO DO WITH `#631` — the owner's call, with the evidence

**`#631` is NOT on trunk.** `DesktopMePage.tsx` and `MobileMePage.tsx` both still exist;
`MeProgressPage.tsx` does not. It is a draft at `e59f830b`, base `a0c9c50b`, 5 files,
+1,602 / −2,381.

### KEEP — harvest into ME-2, do not rebuild
- ★ **The convergence itself.** One responsive `MeProgressPage.tsx` at `/me` for all widths, the two
  old pages deleted. **−779 net lines.**
- ★ **The back-nav contract** — every CTA carries BOTH `?source=me&returnTo=/me` AND
  `state:{back,backLabel}`. The lane found **no CTA on either old page carried `location.state`**, so
  this is new code worth keeping.
- ★ **The moat test** — careless buckets deliberately supplied to the read and asserted absent from
  the topic list. **Keep verbatim.**
- ★ **The 15-test suite shape**, five with explicit CONTROLs.
- ★ **The `useIsDesktop()` split** and the `App.tsx` route wiring.
- ★★ **Its two findings, which disproved both prior audits:** neither old page read
  `getWindowedProgress` — both ran on device-local `loadInsights()`; and concept rungs are keyed by
  subtopic with no topic reference, forcing a scoped re-read.

### REJECT — v7 replaces it
The entire presentation and information architecture: the Overall–By-topic hero toggle, arcs, rings,
sparklines, the seven-section layout, **percentage denomination**, the absence of a subject split,
topic-level-only drill, and the missing first-run state.

### ⚠  ONE DEFECT IN IT, unresolved
`App.tsx` nests `<MobileSelfChrome>` **inside** `<RequireAuth>` for `/me`. All eight other usages put
it **outside** the gate (`:894` wraps `RequirePremium`). The new comment claims the chrome is applied
*"so the RequireAuth blocked state carries it too"* — which the nesting contradicts. **Fix the
nesting or the comment; do not carry a fresh comment that is already false.**
★ `MobileSelfChrome` IS a genuine no-op at desktop (`:257` `if (isDesktop) return <>{children}</>`).

### ★ THE OWNER'S DECISION, and the honest trade

| | Merge `#631` now, then ME-2 rewrites | Close `#631`, ME-2 harvests |
|---|---|---|
| Owner cost | **2 merges, 2 live-verifies** | 1 merge, 1 live-verify |
| Students get | Cloud-backed `/me` in days | Device-local `/me` until the arc lands (weeks) |
| Risk | 1,143 lines merged that get replaced | The harvest must read a closed branch |

★★ **DECIDED — MERGE `#631`.** Not for its code, for the defect. **Verified on trunk `7786878d`,
not taken from the lane's report:**

```
$ git show 7786878d:lazytopper/src/pages/desktop/DesktopMePage.tsx | grep -nE "getWindowedProgress|loadInsights"
5:  loadInsights,
696:      const insights = loadInsights();          — ZERO hits for getWindowedProgress
$ git show 7786878d:lazytopper/src/pages/mobile/MobileMePage.tsx | grep -n "loadInsights"
177:      const insights = loadInsights();
  :23  "loadInsights() - device-local saved attempts"      — the file says so itself
CONTROL $ git show e59f830b:lazytopper/src/pages/MeProgressPage.tsx | grep -c getWindowedProgress
6
```

★ **`/me` on production today runs on DEVICE-LOCAL data.** A student who practises on a phone and
opens `/me` on a laptop sees a different, emptier page. **That is a live defect and `#631` fixes it.**
The branch is behind base — update it, mark Ready, squash.

---

## 2 · THE ARC — THREE WAVES, DEPENDENCY-ORDERED

```
WAVE ME-A  (3 lanes, parallel, file-disjoint)     ⚠  DPDP-1..3 parallel
  MI-CONCEPT-1 ─┐
  MARKS-1 ───────── all three on trunk
  TRENDS-MARKS-1┘
                     ↓
WAVE ME-B  (2 lanes, sequential)
  ARRIVAL-1 ──→ RETRY-1
                     ↓
WAVE ME-C  (1 lane, ALONE — it is large)
  ME-2  — the v7 page
```

★ **Disjointness is verified by EXACT PATH.** `lane_overlap.mjs:112` is
`files.filter((f) => mineSet.has(f))` — exact membership, not prefix. Confirm with
`gh pr list --state open` before every dispatch.

⚠  **DPDP-4** ("settings UI + the browser half of `localStorage` erasure") **must queue behind
MI-CONCEPT-1** — both touch local mistake storage. DPDP-1..3 are disjoint and may run parallel.

---

## 3 · LANE MI-CONCEPT-1 — ⁇ DISPATCH FIRST

**Allowlist**
```
lazytopper/src/services/mistakeIntelligence.ts
lazytopper/src/services/mistakeLogService.ts
+ the 8 recordMistake call sites (RE-DERIVE the list; do not trust this brief)
+ new test files
```

**Build**
1. `MistakeLogEntry` gains `concept?: string` and `questionId?: string`. **Both optional** — old
   entries have neither and must keep parsing.
2. `RecordMistakeContext` gains `concept?: string`. ★ **`questionId` is already there** — `buildEntry`
   simply writes it through.
3. Each call site passes `q.subtopic` as `concept`. ★ `CanonicalQuestion.subtopic: string` is
   **required**, so it is in hand everywhere.
4. ⚠  **Check & Improve free-typed answers are not bank questions** — no subtopic, no id. Both fields
   stay absent there. `mistakeIntelligence.ts:46-48` already documents this for `questionId`.

**Tests** — a written entry carries concept and questionId · a C&I entry carries neither and still
persists · an entry written **before** this change still parses (fixture with neither field) ·
CONTROL: the same read returns a populated concept for a bank-sourced entry.
**Mutations** — drop `concept` at one call site — red · drop `questionId` in `buildEntry` — red ·
make either field required — the legacy-fixture test red.

★ **DO NOT change what a mistake means, how types are assigned, or any existing count.** This lane
adds two fields and nothing else.

---

## 4 · LANE MARKS-1 — the marks that already exist

**Allowlist:** `lazytopper/src/services/progressStore.ts` + new tests.

**Build** — carry `marksScored` and `marksAvailable` through
`marksPercentOf` — `SplitTrend` — `RungTrend` — `ProgressTrend`. **Both are already computed at
`:197-198` and discarded.** — **Add fields; change no existing field.** `before`/`now` stay
percentages, `sampleBefore`/`sampleNow` stay point counts.

**Why it is load-bearing:** without it the 80-mark bar, "51 secured", "7 of 12 lost" and every
per-concept mark figure in v7 **cannot exist**. The page would ship in percentages — which is the
page it replaces.

**Tests** — a rung's `marksScored`/`marksAvailable` match the underlying payloads · `sampleNow` is
unchanged and still counts points, **not** marks (CONTROL against conflating them) · an empty window
still returns honest empties.
**Mutation** — return `sample` as marks — the control test red.

---

## 5 · LANE TRENDS-MARKS-1 — two signals, one primitive

**Allowlist:** `lazytopper/src/prediction/**` + new tests. **Nothing under `src/pages/`.**

**Build**
1. Extract the shared primitive: **appearances-per-subtopic-per-year**, from `getFilteredItems`,
   with every topic/subtopic routed through **`resolveCanonicalSlug`** — ⁇ this retires the
   `fuzzyMatch` string-drift risk for **both** signals at once.
2. `computeHistoricalFrequencySignal` **keeps its behaviour and keeps serving HPQ** — *what will be
   asked*. It now consumes the primitive.
3. **New:** `expectedMarks(subject, topic, subtopic)` = mean marks when it appeared × appearance
   rate, Laplace-smoothed as today. ★ `cbse5SignalScoring.ts:49` confirms the corpus item carries
   `marks: number`.

**Tests** — both signals agree on the shared appearance input · `expectedMarks` distinguishes a
1-marker from a 5-marker at identical frequency (★ the whole point) · Laplace bounds hold · a
canonicalised label matches where the raw string would have missed.
**Mutation** — point one signal at a different corpus — the agreement test red.

⚠  **HPQ's prediction output must not move.** Pin it: an HPQ ranking snapshot before and after is
identical. If it moves, **STOP AND REPORT.**

---

## 6 · LANE ARRIVAL-1 — one payload, three consumers

**Depends on MI-CONCEPT-1 being on trunk.**

**Allowlist**
```
lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx
lazytopper/src/pages/tutor/tutorContextBrief.ts
lazytopper/src/pages/tutor/useTutorSession.ts
lazytopper/src/lib/desktop/navigation.ts
+ tests
```

**Build**
1. **TopicHub reads `?concept=`** — resolve via `resolveCanonicalSlug`, expand and scroll that spine
   row, mark it as *why you're here*. ★ **Honest fallback:** unresolved — open the topic at the top.
   Never a broken anchor. ⚠  Query param, **not `location.state`** — state is dropped by a bare
   `<a href>` and does not survive reload.
2. **`TutorBrief` gains an `arrival` block** — `{concept, marksLost, dominantType}` — and
   `assembleTutorBrief` gains `concept?`. `useTutorSession:350` passes it through.
   ★★ **`hasData:false` honesty is inherited**: no MI behind the arrival concept — the tutor
   references no performance and invents nothing.
3. **Practice already works** — `buildDesktopConceptPracticePath` accepts `focus` and `markBand`
   (`navigation.ts:20,92,123`). Pass both.

> ★★ **THE PRODUCT RULE, OWNER-RULED, NON-NEGOTIABLE:** `arrival` selects the tutor's **first worked
> example**. It NEVER appears in the tutor's words. *"Let's do one of these — watch the sign in the
> middle step"* uses it. *"You've lost 6 marks here"* recites it, and that is a report card wearing a
> tutor's face. **MI is the soul, never the face.**

**Tests** — TopicHub opens the named concept · an unresolved concept falls back without error ·
the brief carries `arrival` when a concept is supplied and omits it otherwise (CONTROL both ways) ·
`hasData:false` still suppresses performance references.
**Mutation** — surface `arrival` verbatim in the tutor's opening line — a copy test red.

---

## 7 · LANE RETRY-1

**Depends on MI-CONCEPT-1.** A retry route that re-serves the exact question by `questionId`.
⚠  **Entries without an id (Check & Improve) get no retry affordance** — the button renders only when
the entry can back it. ★ **If the exact question cannot be re-served, the copy must not say "Re-do
that one."** Rename to *"Try one like it"* and report, rather than shipping a button that lies.

---

## 8 · LANE ME-2 — the v7 page, ALONE

**Depends on MI-CONCEPT-1 + MARKS-1 + TRENDS-MARKS-1 on trunk.**

**The prototype is authoritative for FLOW, STRUCTURE, COPY and INFORMATION ORDER. The repo is
authoritative for VISUAL TOKENS.** Where they disagree on colour, type or spacing, **the repo wins**.

### The page, top to bottom
1. **Paper switch** — Maths / Science, each showing its own marks-on-the-table. ★★ **Two separate
   80-mark exams. Nothing below the switch may mix them.** This is a correctness rule, not a
   preference.
2. **Hero** — *"there are N marks on the table"*, then the paper as a **four-segment bar**: secured ·
   careless slips · conceptual gaps · **unclassified**, with a full legend.
   ★★ **The unclassified segment is an honesty device, not decoration.** Section A grades 0/1 binary
   with no step marking (owner ruling), so those marks carry no type. **They get their own segment
   and their own sentence. Never fold them into another bucket.**
3. **Easy marks** — careless total, ONE CTA (*"Take these marks back"*) opening a picker sheet:
   slip-fixing worksheet **or** quick practice. ★ Mirror `TutorPickerModal` (`homeDestinations.tsx:344`,
   `role="dialog"` + `aria-modal`). The worksheet option is
   `buildDesktopWorksheetPath({scope:"full-subject", mistakeAware:true})` — `mistakeAware=1` is read
   by `studyContext.ts:99` and mapped by `savedWorksheets.ts:82`, so it spans every affected topic.
4. **Start here** — one card, ranked candidates, **top 3 + Show more / Show less**.
   ★ **One card per chapter** (breadth, not a wall of one topic) · **suppress what is already
   improving** · **decay** anything unseen ~30 days · **per-candidate confidence floor** — one wrong
   answer is not a pattern · ★★ **stable between visits, recomputed on new graded data, never
   reshuffled** — a list that reshuffles cannot be finished.
   **The verb comes from the candidate's own dominant type:** conceptual — **Learn** · calculation
   and careless — **Practise** · a specific question with an id — **Re-do**.
5. **Journey** — one line, `+N marks a paper`, with the trend icon.
6. **Deeper analysis** — **one slicer, one action per row**: By concept (Practise) · By chapter
   (expand, single-open accordion, *"Learn this chapter"* only inside an open one) · By CBSE section
   (Practise, section-filtered via `params.set("section", …)`).
7. **First run** — a **named example student**, dashed frame, explicit *"Example — not your marks"*,
   plus the 0-of-5 unlock strip. ★★ **Owner-ratified**, superseding
   `MeProgress_Redesign_Spec §5`'s prohibition. **Never the student's own name on invented numbers.**
8. **Recent work is REMOVED** — nothing on it was actionable and C&I, Chapter Test and Full Mock each
   own their own history.

### Non-negotiable rules
- ★★ **Honest-or-silent at SENTENCE level.** The explanatory line under each action card renders
  **only when `stepDetails` supports it**. A card claiming *"lost the sign in step 3"* when step 3 was
  fine is worse than a card that says nothing.
- ★★ **The tag and the subtext must agree.** A sign slip is a **Silly slip**, never a Conceptual gap.
  *(v6 shipped this contradiction; v7 fixed it. Do not reintroduce it.)*
- ★★ **Product vocabulary matches the graded scorecard exactly** — `Conceptual`, `Calculation`,
  `Silly`, `Presentation`. **Verified on trunk.** No invented synonyms.
- ★★ **Never surface silly/presentation as a topic weakness.** The moat. Keep `#631`'s test verbatim.
- ★ **Marks, never percentages**, everywhere on the page.
- ★ **No internal vocabulary on screen** — no "Mistake Intelligence", "hotspot", "rung", "window".
  **Test: could a student who has never used the product parse this sentence?**
- ★ **ONE responsive design.** `useIsDesktop()` at 1024. Swipe rails are **mobile-only** — the
  container query turns a stacked grid into a snap rail (mirror `MobileHome.tsx:122-140`). ⚠  **v6 got
  this wrong by applying `display:flex` at all widths; desktop inherited a rail it should not have.**
- ★ **Bar numerals are NAVY, not white.** White on those tones measures 2.5–2.9:1 and **fails AA**;
  navy measures 5.7–6.7:1. **Verify with an alpha-compositing probe — a probe that does not composite
  alpha returns numbers that are simply wrong.**
- ★ **Every CTA carries BOTH nav mechanisms** (`#631`'s §3 contract) — and now also the **why**:
  `concept` for TopicHub and the tutor, `focus`+`markBand` for practice.

**Tests** — harvest `#631`'s 15 and add: subject purity (no Maths row under Science, both directions,
with a CONTROL) · the unclassified segment renders when untyped marks exist and is absent when they
do not · the picker sheet offers both routes and the worksheet path carries `mistakeAware=1` ·
Show more/less both directions · the accordion is single-open · tag/subtext agreement · marks
denomination (no `%` anywhere in rendered output) · the first-run example never renders the student's
own name.

---

## 9 · STANDING — every lane inherits these

**★ SHOW THE EVIDENCE, NOT THE CONCLUSION.** Never *"X is absent / live / ran"* without pasting the
command and its literal output, **and stating what proves the command could have found X.** If you
cannot show it, say **"I could not verify."**
**★ NEVER `head`, NEVER `grep -c`, ON AN EXISTENCE QUESTION.** — A count cannot tell code from a
comment about code — a `grep -c` returned 2 and both hits were comments documenting a deletion.
**★ ENUMERATE THE SET; DO NOT GREP A MEMBER.** ⚠  The auth door's test surface was enumerated as 5, 9
and 16 by three different methods. **Only running it is the set.**
**★ TRACE THE WHOLE PATH.** *"The field reaches the emitter"* is not *"the request reaches the
emitter"* — a guard rejected it one layer up and typed grading was broken in production for a week.
**★ A COUNT IS READ AT THE TIME, NEVER CARRIED — including from this brief.**
**★ MOUNT ≠  LIVE.** Trace the trigger.
**★ RESTORE BY BYTE SNAPSHOT AND SHA** — never `git checkout`, never `git diff`. Assert
`mutated-sha != baseline-sha` **before** recording any red.
**★ `scope:guard` BEFORE `git add`** · `tsc` both configs · ⚠  **`check:mojibake` scans TRACKED files
only** — stage before claiming clean · ⚠  `tsc … | head` returns `head`'s exit code.
**★ NEVER read or push from `C:\Projects\Lazytopper-Production`.**
**★ PUSH AS DRAFT. Never `gh pr ready`, never merge.**
**★★ WRITE THE LIVE-VERIFY INTO EVERY BRIEF AND TREAT IT AS THE GATE.** Six PRs, 1,463 tests and six
green CI runs sat over a typed-answer path that had **never once worked in production** until the
owner tried it on his phone. **No gate found it.**
**IF THIS SPEC IS WRONG, YOUR VERIFIED FINDING WINS.**

---

## 10 · RULE 0 — THE HANDOFF IS YOURS, EVERY WAVE, UNASKED

**A wave is closed when `handoff/` describes trunk**, not when its PRs merge. Archive the state file
first and alone, verified by SHA. One handoff PR, seven paths, **exactly one un-superseded
`[CURRENT]`**, prepends **merged and proven by a per-file heading census** — uniqueness is not
completeness.
★★ **The WIRE-2 dormancy block in `CURRENT_STATE.md` must survive every prepend and be RESTATED in
your new `[CURRENT]`.** Its absence once cost five days.
★ **Budget for it. If you would reach 25% before writing it, stop dispatching and write it.**

> ⁇ ★★ **TWO CONTROLLERS ARE RUNNING — you and the DPDP controller.** Product PRs may race; **handoff
> PRs must queue.** — **YOU write the handoff for BOTH arcs.** The DPDP controller supplies you a
> bounded close-out (lanes, PR numbers, FU ids, decisions) and opens no handoff PR of its own.
> Force-merging two handoffs via the GitHub UI has silently preserved stale content with no gate
> catching it.
>
> ⚠  **`SETTINGS-1` (DPDP) queues behind `MI-CONCEPT-1` (yours).** Tell the DPDP controller the moment
> `MI-CONCEPT-1` is on trunk — it is blocked until you do.

<!--
  ^^^ THE STARRED LINE ABOVE ("YOU write the handoff for BOTH arcs") IS SUPERSEDED.
  See CONTROLLER_ADDENDUM_Context_Safeguards.md v1.1 section 6: the rule is POSITIONAL, per WAVE.
  Whoever closes a wave runs `gh pr list --state open` first; if no handoff PR is open they write it,
  covering their own lanes AND every lane the other arc merged since the last handoff. If one IS
  open, they hand their bounded close-out to that controller and stand down.
-->
