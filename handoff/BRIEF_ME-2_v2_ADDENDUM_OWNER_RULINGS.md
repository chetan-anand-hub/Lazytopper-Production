> **HEADER 1 — added on landing, 2026-08-13.** `BRIEF_ME-2_v2.md` is an INSTRUCTION — a
> controller dispatch — and is deliberately not committed to trunk, per this project's
> convention that instructions are not tracked. It exists untracked in the owner's working
> tree at `handoff/BRIEF_ME-2_v2.md`. This addendum's override clause therefore has no
> counterpart in the repository and cannot be resolved from it. The instruction file was not
> lost.
>
> **HEADER 2 — added on landing, 2026-08-13. RULING 1 BELOW WAS SUBSEQUENTLY DISPROVED AND
> REVERSED.** The ruling to *darken* the segment tones is the inverted one: `--me-navy` is the
> TEXT colour, so darkening a segment LOWERS the contrast ratio. The lane built LIGHTER,
> measured the darken route, and reported instead of complying; the owner confirmed the
> lighter direction and it merged in `#655`. **The shipped code is correct; the written ruling
> below is wrong.** See `handoff/WAVE_STATE_ME_C_ARCHIVE.md:47-58`. Do not act on ruling 1 as
> written.

# ADDENDUM — OWNER RULINGS ON #655 · Wave ME-C
### 2026-08-09 · owner-ruled · amends `handoff/BRIEF_ME-2_v2.md` §6 · trunk `eeafb99b`

Six decisions were owed before `#655` merges. **All six are now ruled.** Five are records; **ONE
requires code.** Where this file conflicts with `BRIEF_ME-2_v2.md`, **this file wins.**

---

## ★ RULING 1 — `MISTAKE_TONE` IS **UNFROZEN**. THIS IS THE ONE THAT NEEDS CODE.

**The freeze is lifted. The owner's stated reason for it was false and he has confirmed the
disproof himself:** `git grep -ln MISTAKE_TONE` returns exactly ONE file, `MeProgressPage.tsx`.
It is **not** shared with the scorecard, the MI card or history.

**DO THIS:**
- **Darken the segment tones so each clears `4.5:1` against `--me-navy: hsl(222,47%,24%)` at
  NORMAL text size.**
- ⚠ **This REPLACES the large-text workaround.** `BRIEF_ME-2_v2.md` §6 ruled that numerals stay at
  the 3:1 large-text threshold (≥18.66px bold) with a ~12% render floor. **That was working around
  the symptom.** Owner: *"that fixes the actual cause rather than working around it with 18.66px
  numerals that don't fit at 360px."*
- → **Re-derive the render threshold.** Once numerals no longer need to be 18.66px bold, the ~12%
  floor was sized for a constraint that no longer exists. Compute the real floor from the actual
  rendered numeral size and **report the number you derived and why.**
- **Keep the legend as the fallback for narrow segments.** It already prints every number. Segments
  too narrow for a numeral stay silent; the legend carries them.
- ⚠ **MEASURE WITH AN ALPHA-COMPOSITING PROBE.** A probe that does not composite alpha returns
  numbers that are simply wrong — **this repo has produced a false contrast failure exactly that
  way**, and the figures in this arc's lineage were already wrong once (measured against the login
  page's `#071a3d` instead of `--me-navy`). **Report the measured ratio for every segment, before
  and after.**
- The four MI tones are the page's own (`MISTAKE_TONE` is page-local, so **you own it outright**).
  The bar's segments also use `--accent` (secured) and `--untyped` (unclassified) — **include those
  in the measurement and darken them too if they do not clear 4.5:1.**
- **Vocabulary is unchanged.** `Conceptual` / `Calculation` / `Silly` / `Presentation` stay exactly
  as they are. This is a tone change, not a naming change.

**Re-run after the change:** the full gate set, the alpha-compositing probe, **and screenshots at
1440 / 1023 / 390 / 360** — the 360 capture is the whole point of the ruling. Push to the same
branch; `#655` stays a DRAFT.

---

## RULING 2 — the journey line: **SHIP ME-2's VERSION.** No code change.
ME-2 refused to build *"+N marks a paper"* because it is a performance projection (a percentage
delta × an 80-mark paper the student has not sat) and shipped honest raw-marks movement instead.
**Approved. Correctness wins.**
★ **Logged for a follow-up, NOT a blocker:** *"18 of 24 against 12 of 20"* asks a student to compare
two ratios with different denominators. It is harder to read than *"+3 marks"* — **but it is true,
and the alternative is not.** Tighten the copy in a follow-up.
→ `[FU-ME-JOURNEY-COPY-RATIO-LEGIBILITY]`

## RULING 3 — `/full-mock` losing its `/me` entry point: **APPROVED.** No code change.
Verified reachable from the practice hub (5 refs) and Home's `FirstSession`. **v7 deliberately
removed the full-mock card and the entry point is not orphaned.**
→ `[FU-ME-FULLMOCK-ENTRY-POINT]` **CLOSED — not a defect.**

## RULING 4 — the device-local history seam: **APPROVED.** No code change.
v7 removed "Recent work" by design: nothing on it was actionable, and C&I, Chapter Test and Full
Mock each own their own history.
★ It also **retires an honest-but-awkward caveat** — *"Saved on this device. Work graded on another
device appears in your before→now trend, not in this list"* — **a seam that only existed because the
section did.** Removing the section removed the need for the apology.
→ `[FU-ME-HISTORY-DEVICE-LOCAL]` **CLOSED — resolved by deletion, not deferred.**

## RULING 5 — inline `style={{}}`: **PERMITTED FOR DATA-DRIVEN VALUES ONLY.** No code change.
The page's `className` + scoped CSS string mirrors `MOBILE_HOME_CSS`, the established pattern.
**Static styling goes in the CSS block; anything computed from data — segment widths, ring dashes —
must be inline. There is no other way to express it.** This confirms controller ruling **D9**;
ME-2 already built to it.
⚠ **Record for the next lane:** the owner reads `CLAUDE.md` §7 as *mandating* inline styles over
Tailwind; §7 as written says *"No inline `style={{}}` objects in new components (use CSS classes)"*.
**The operative instruction is identical either way** (data-driven inline, static in CSS), so nothing
changes here — but a future lane reading §7 literally would reach the opposite conclusion.
→ `[FU-CLAUDEMD-S7-INLINE-STYLE-WORDING]`

## ★ RULING 6 — `ProgressWindowArc`: the controller's report **STANDS**.
Owner: *"I was about to wrongly correct it."* `ResultsScorecard.tsx:167` mentions it **only in a
comment**. It is now **unmounted everywhere**.
★★ **But do not merely record a dormancy.** A component with **zero mounts and a live test suite** is
**the `MentorSolveDrawer` shape — the thing that read as LIVE across six handoff documents.** A green
suite on an unreachable component is exactly the evidence that misleads the next reader.
→ `[FU-PROGRESSWINDOWARC-UNMOUNTED]` — **decide delete-or-keep in a follow-up. Do not let it sit
unmounted-but-tested.** Supersedes `[FU-ME-PROGRESSWINDOWARC-DORMANT]`.
