<!--
CONTROLLER PREAMBLE (added by the Wave ME-C controller on receipt; the body below is the
attached document, transcribed on receipt 2026-08-09 per "AN ATTACHED DOCUMENT IS NOT A FILE").
- Trunk re-derived at receipt: eeafb99b0c437998067478f603af66d32e431b58 (matches the brief).
- Emphasis markers arrived transport-corrupted in the attachment. They are DECORATIVE and carry
  no instruction; they have been rendered as plain ASCII markers here. NOTHING was reworded,
  reordered, or removed.
- CONTROLLER CORRECTIONS FOUND BEFORE DISPATCH are recorded in the trailing section
  "ME-C CONTROLLER ERRATA". The body is left as authored; read the errata with it.
-->

# CONTROLLER - WAVE ME-C . ME-2, THE v7 PAGE

**v1.0 . 2026-08-09 . trunk `eeafb99b` at authoring - RE-DERIVE IT.**
Read first: `LazyTopper_Controller_Subagent_Model.md`, then
`CONTROLLER_ADDENDUM_Context_Safeguards.md` (**v1.1 - mandatory**).
Companion, LOCKED: **`LazyTopper_MeProgress_v7_FINAL.html`**.
Also on disk: ME-B's written ME-2 brief, beside `handoff/WAVE_STATE_ME_B_ARCHIVE.md`. **Read it.**

> - **ONE LANE. It is the largest single lane on this board and it runs alone.**
> - Report `CONTEXT REMAINING: n%` in every message.
> - **A CLOSEOUT controller runs in parallel** on `handoff/`, `.github/`, manifests, `Dockerfile`.
> Exact-path disjoint - **confirm with `gh pr list --state open` before dispatch.**

---

## 0 . WHY THIS LANE IS LOAD-BEARING

**THREE things on trunk are dead until ME-2 ships.** Every ME-B lane is inert without you: ME-2 is
not one lane among several - **it is the lane that turns three others on.**

**1 . `#647` TOPICHUB-1 is a consumer with no producer.** Verified: `navigation.ts` emits **zero**
`concept=`. `buildDesktopTopicHubPath` is structurally incapable - `DesktopRouteContext` is
`{source, returnTo}` only. **Today `?concept=` is reachable only by hand-typed URL.**
-> **`navigation.ts` is in YOUR allowlist. ME-2 is the producer.** If ME-2 does not ship, a merged,
tested, live lane is dead code.

**2 . `#649` RETRY-1 is a producer with no consumer** - `src/services/mistakeRetry.ts`, two files, zero
`.tsx`. Nothing renders its decision. **ME-2 is the consumer.**

**3 . `expectedMarks` is dormant** - tree-shaken, zero consumers outside
`src/prediction/`. **ME-2 ends it.**

**And one thing ME-2 must NOT break.** `#646` (SETTINGS-1) added the student's DPDP controls to the
page you are rebuilding:

```
MeProgressPage.tsx:41    import AccountDataControls from "../components/account/AccountDataControls";
MeProgressPage.tsx:980   <AccountDataControls />
```

**Preserve it, as the LAST section.** Removing it silently removes a student's legally-required
ability to export and delete their data. **Pin it with a test.**

---

## 1 . THE HARD CONSTRAINT - three resolvers were wrong

**ME-2 must emit `?concept=<EXACT boardEssentials name, URI-encoded>`.**

**Not a slug. Not a `conceptKey`. Not lower-cased. The verbatim label.**

**Three different resolvers were proposed across Wave ME-B and all three were wrong:**
`resolveCanonicalSlug` is a chapter authority and never returns a concept . `conceptKeyForLabel`
resolves against the tutor figure catalogue, **a strict subset returning null for 39 of 112 live
concepts** - whose own data file says *"conceptKey ... never resolve on it"* . and the third was mine.

**The reason is structural: `BoardConcept` has NO key field. A concept's identity IS its name.**
That is also what `buildTutorPath` already emits (`concept: concept.name`), so the vocabulary is
consistent across surfaces. **`#647` consumes the label. Emit the label.**

---

## 2 . THE PAGE

**The prototype is authoritative for FLOW, STRUCTURE, COPY and INFORMATION ORDER. The repo is
authoritative for VISUAL TOKENS.** Visual disagreement -> **the repo wins**.

`#631` already converged `/me` onto one responsive `MeProgressPage.tsx`. **ME-2 rebuilds its
presentation; it does not re-do the convergence.** Keep: the both-mechanisms back-nav contract, the
moat test, the `useIsDesktop()` split, and the existing test suite's shape.

### Top to bottom
1. **Paper switch** - Maths / Science, each with its own marks-on-the-table.
   **Two separate 80-mark exams. Nothing below the switch may mix them.** Correctness, not taste.
2. **Hero** - *"there are N marks on the table"*, then the paper as a **four-segment bar**.
   **RULED: the segments mirror the shipped scorecard's own grouping** (`ResultsScorecard.tsx:308`
   and `:319`) - **secured . careless slips (Silly + Presentation) . knowledge gaps (Conceptual +
   Calculation) . unclassified.** The legend names all four MI types under their two headings, so
   **Calculation has a home and nothing is invisible.**
   **The unclassified segment has TWO sources** - legitimate binary 1-markers, **and**
   `[FU-GRADER-DEDUCTION-WITHOUT-TYPE]`, a live server-side defect where the grader deducts marks on a
   step carrying no `mistakeType`. **Do not design it as a dumping ground; do not fix the grader here.**
3. **Easy marks** - careless total, ONE CTA opening a picker sheet (worksheet **or** quick practice).
   Mirror `TutorPickerModal` (`homeDestinations.tsx:344`, `role="dialog"` + `aria-modal`). The
   worksheet route is `buildDesktopWorksheetPath({scope:"full-subject", mistakeAware:true})` -
   `mistakeAware=1` is read by `studyContext.ts:99` and mapped by `savedWorksheets.ts:82`.
4. **Start here** - one card, **top 3 + Show more / Show less**. One card per chapter . suppress what
   is already improving . decay anything unseen ~30 days . per-candidate confidence floor .
   **stable between visits, recomputed on new graded data, never reshuffled.**
   **The verb comes from the candidate's own dominant type:** conceptual -> **Learn** . calculation and
   careless -> **Practise** . a bank-backed question -> **Re-do**.
   **`#649` RETRY-1 shipped `src/services/mistakeRetry.ts` AND NOTHING ELSE - no UI at all.
   It is a producer with no consumer, exactly as `#647` is a consumer with no producer. CALL the
   module; do not re-derive its rules.** It already encodes, mutation-verified:
   bank-backed id -> **"Re-do that one"** . synthetic `ws:`/`fm:`/`ct:` -> **"Try one like it"** .
   no id -> **NO affordance at all**. Worksheet,
   full-mock and chapter-test carry **synthetic ids** (`ws:`/`fm:`/`ct:`) and cannot re-serve the exact
   question: those say **"Try one like it"**, never "Re-do that one". A C&I entry with no id gets
   **no retry affordance at all** - owner-ruled: silence, not a topic-scoped fallback.
5. **Journey** - one line, `+N marks a paper`, with the trend icon.
6. **Deeper analysis** - **one slicer, one action per row**: By concept (Practise) . By chapter
   (single-open accordion; *"Learn this chapter"* only inside an open one - **this is where
   `?concept=` is emitted**) . By CBSE section (Practise, via `params.set("section", ...)`).
7. **First run** - a **named example student**, dashed frame, explicit *"Example - not your marks"*,
   plus the 0-of-5 unlock strip. Owner-ratified, superseding `MeProgress_Redesign_Spec §5`.
   **Never the student's own name on invented numbers.**
8. **Recent work is REMOVED.**
9. **"Your data" - the DPDP section. `<AccountDataControls />`, LAST, ALWAYS.**
   **THE v7 PROTOTYPE PREDATES `#646` AND DOES NOT SHOW THIS SECTION.** It is **not** an omission you
   may treat as a deletion. It ships on trunk today at `MeProgressPage.tsx:980` and it carries the
   student's legally-required export and erasure controls.
   **Design it into the page rather than leaving it appended.** It must read as a deliberate final
   section in the page's own language - heading, one line of framing, then the two controls - not as a
   block bolted below the rebuild. **Its copy, semantics and destructive-confirmation flow are
   `#646`'s and are NOT yours to change.** Style the container; leave the controls alone.
   **Pin it with a test AND a mutation** (remove it -> red). Removing it silently removes a minor's
   ability to export and delete their data.

### THE THREE VIEWS MUST RECONCILE - owner-ruled
Hero, By-concept and By-section must sum to the same total. **The hero is truth; each view carries an
explicit "not yet attributable" remainder row** so all three reconcile. **A student will add them
up.** Three unexplained totals is the one thing this page cannot ship with.

### Non-negotiable
- **Honest-or-silent at SENTENCE level.** The line under each action card renders **only when
  `stepDetails` supports it.**
- **Tag and subtext must AGREE.** A sign slip is a **Silly slip**, never a Conceptual gap. Dropped
  state symbols are **Presentation**. A prototype iteration shipped this contradiction in the
  **first-run example** - the first sentence a new student ever reads.
- **Vocabulary matches the shipped scorecard exactly** - `Conceptual`, `Calculation`, `Silly`,
  `Presentation`. **No invented synonyms.**
- **Never surface silly/presentation as a topic weakness.** The moat. Keep the existing test verbatim.
- **Marks, never percentages.** **No internal vocabulary on screen** - test: could a student who
  has never used the product parse this sentence?
- **ONE responsive design.** Swipe rails are **mobile-only** - the container query turns a stacked
  grid into a snap rail (mirror `MobileHome.tsx:122-140`). A prototype iteration applied
  `display:flex` at all widths and desktop inherited a rail it should never have had.
- **NO PERFORMANCE CLAIM MAY BE ASSERTED FROM A URL PARAMETER.** `CLAUDE.md` §5. This is why
  `#647`'s badge reads *"You came here for this."* rather than naming marks.

### BAR NUMERAL CONTRAST - the cofounder's earlier figures were WRONG
**Measured against the real tokens** (`--me-navy: hsl(222,47%,24%)`, `MeProgressPage.tsx:1001` - **not**
the login page's `#071a3d`):

| Segment | Navy on it | White on it |
|---|---|---|
| `--accent hsl(152,55%,45%)` | **4.68** | 2.70 |
| `--silly hsl(0,70%,62%)` | **3.53** | 3.59 |
| `--conceptual hsl(215,75%,60%)` | **3.74** | 4.03 |

**Navy fails normal-text AA on two segments.** **RULED: use the large-text threshold (3:1), which
these numerals already qualify for** - 14pt **bold** = 18.66px, and they are already `font-weight:700`.
At >=18.66px bold, navy passes on all three. **Do NOT repaint `MISTAKE_TONE`** - it is used verbatim
across the scorecard, MI card and history; changing it repaints the product's entire mistake
vocabulary to fix one bar.
**At 360px a 7%-wide segment is ~23px and an 18.66px bold two-digit numeral will not fit. Raise the
render threshold to ~12% and let the legend carry the rest** - the legend already prints every number.
**Verify with an alpha-compositing probe.** One that does not composite alpha returns numbers that
are simply wrong - this repo has produced a false contrast failure that way.

---

## 3 . TESTS

Harvest the existing suite and add: **subject purity** (no Maths row under Science, both directions,
with a CONTROL) . the unclassified segment renders when untyped marks exist and is absent when they do
not . **the three views reconcile to the hero total** . the picker offers both routes and the worksheet
path carries `mistakeAware=1` . Show more/less both ways . the accordion is single-open .
tag/subtext agreement . **no `%` anywhere in rendered output** . the first-run example never renders
the student's own name . **`<AccountDataControls />` is present and last** . **the emitted
`?concept=` is the verbatim `boardEssentials` name, URI-encoded** (CONTROL: a slugified value fails).

**Mutations:** remove `AccountDataControls` -> red . slugify the concept param -> red . mix a Maths row
into Science -> red . make a view's total disagree with the hero -> red.
**Each mutation must name the assertion that catches it.** If you cannot, build a positive control
or drop it - `[FU-BRIEF-INERT-MUTATION-SPECIFIED]`.

---

## 4 . STANDING

**THE EVIDENCE LADDER:** *a test proves the code works; a build chunk proves it ships; only a boot
proves it runs.*
**SHOW THE EVIDENCE, NOT THE CONCLUSION.** **NEVER `head`/`grep -c` ON AN EXISTENCE QUESTION** -
**a grep is only as good as its pattern.** **ENUMERATE THE SET.**
**A COUNT IS READ AT THE TIME, NEVER CARRIED - including from this brief.** The full vitest suite
was 112 files / 1387 tests and is now 135 / 1662. **Read it from the run.**
**NO FALSE REDS . NO INERT MUTATIONS . VERIFY THE RESTORE AGAINST THE FILE YOU MUTATED.**
**GET THE BASE UNDERNEATH YOU - a revert does not conflict, it just disappears.**
**CARRY FORWARD VERBATIM NEVER MEANS CARRY FORWARD UNCHECKED.**
**SCREENSHOTS CHANGE CODE.** Three defects on the DPDP flow passed every wording assertion - a
duplicated heading, a confirm button hidden because `<main class="animate-float-up">` carries a
`transform` that traps fixed descendants, and a white-on-white button. **Capture at 1440, 1023, 390
and 360 before commit.**
**NEVER read or push from `C:\Projects\Lazytopper-Production`.** **PUSH AS DRAFT.**

**IF THIS SPEC IS WRONG, YOUR VERIFIED FINDING WINS.** Five lanes in the last wave disproved part of
their own spec; three of those errors were the cofounder's, including two in this document's own
lineage.

---

## 5 . RULE 0

**Budget for the handoff. If you would reach 25% before writing it, stop and write it.**
**Before opening a handoff PR, run `gh pr list --state open`.** If CLOSEOUT's is open, hand it your
close-out and stand down.
**If you stand down without a handoff, the LAST line of your final message must be the exact path
of your close-out and the fact that it is unarchived.**
**ME-2 ends two dormancies** - `expectedMarks`, and `#647`'s dead-consumer status. **Record both.**

---
---

# ME-C CONTROLLER ERRATA

Found by the ME-C controller BEFORE dispatch, from repo metadata only. The body above is left as
authored; these corrections govern where they conflict.

**E1 . `navigation.ts` is AMBIGUOUS on trunk - the allowlist as written is unsatisfiable.**
Three files match that basename at `eeafb99b`:
```
lazytopper/src/lib/desktop/navigation.ts        <- the path builders (buildDesktopTopicHubPath)
lazytopper/src/types/navigation.ts
lazytopper/src/navigation/practiceNavigation.ts
```
The brief's `§0.1` claim is about the desktop path builder, so the intended file is
`lazytopper/src/lib/desktop/navigation.ts`. WHERE ELSE? applies: `DesktopRouteContext` may be
DECLARED in `src/types/navigation.ts` rather than beside its builder, in which case emitting
`?concept=` requires BOTH files and a one-file allowlist blocks the lane. SCOUT-1 resolves this;
the allowlist is written from its finding, not from this brief.

**E2 . The `ResultsScorecard` line references are self-contradictory in this document's lineage.**
The body above says `:308` and `:319`. The dispatch message that accompanied it says `:301` and
`:308`. LINE REFERENCES ARE DERIVED VALUES - neither is citable. Cite the grouping by its rendered
string ("Where your marks went") and by symbol, and re-derive the location at build time.

**E3 . `MeProgressPage.tsx:41` / `:980` / `:1001` are line references and go stale the moment the
lane edits the file.** Verify `<AccountDataControls />` and `--me-navy` by symbol/quoted token, not
by line. The IMPORT and the RENDER were both confirmed present on trunk by path; the lines were not
re-derived by the controller and must not be trusted as coordinates.

**E4 . `gh pr list --state open` returned `[]` at dispatch time (2026-08-09).** ME-B's `#647`,
`#649` and handoff `#650` are all MERGED, not draft as earlier documents state - `#650` IS trunk
`eeafb99b`. There is NO open handoff PR and NO open CLOSEOUT PR at dispatch. Re-run the check
before opening one.
