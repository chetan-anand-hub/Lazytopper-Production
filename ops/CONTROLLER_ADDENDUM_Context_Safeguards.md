<!--
PROVENANCE — read this before treating any glyph in this file as authoritative.

THIS FILE IS A REPAIR, NOT THE ORIGINAL. It is a rule-based restoration of an untracked
owner-supplied document that reached disk transport-corrupted. It is committed to git for the
first time on 2026-08-13 by lane OPS-F, because until now it existed as a SINGLE UNTRACKED COPY
on one laptop and nothing could recover it.

SOURCE (read-only, unmodified by this lane):
  path   CONTROLLER_ADDENDUM_Context_Safeguards.md
  bytes  10223
  sha256 74676dfdc54600d61ac2effbaa78439358669d41852a5159fe18b887429d662a

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

  R1   x14   U+00C2 U+00B7                                  -> · middle dot             MECHANICAL  cp1252 decode of C2 B7 is exact; nothing was lost
  R2   x6    U+00C2 U+00A7                                  -> § section sign           MECHANICAL  cp1252 decode of C2 A7 is exact; nothing was lost
  R4   x1    U+00C3 U+00A7                                  -> § section sign           INFERRED    the mechanical decode gives c-cedilla, which is WRONG; the text reads '[section sign]2 applies regardless of who opens the PR' and six other section signs in this file are written the same way
  R6   x3    U+00C3 U+00A2 x3                               -> ★★★                      INFERRED    the house emphasis ladder; this file itself calls them 'the starred lines'
  R7   x7    U+00C3 U+00A2 x2                               -> ★★                       INFERRED    same ladder, two-star tier
  R9   x8    U+00C3 U+00A2 followed by TWO spaces           -> ⚠ warning sign           INFERRED    see (b) above: the doubled space is the surviving 0xA0 third byte. Every instance introduces a caution
  R10  x10   U+00C3 U+00A2, single, in line-start position  -> ★ star                   INFERRED    scaffolding only to its left (heading, bullet, blockquote, table cell, bold-open)
  R11  x39   U+00C3 U+00A2, single, mid-line                -> — em dash                INFERRED    the dominant original use; this is the DEFAULT and therefore the least certain large class
  R14  x1    U+00C3 U+00A2, single, immediately after another marker -> ⁇ left visible           AMBIGUOUS   a marker directly following another marker; context does not settle it
  R18  x1    U+00C3 U+00A2, single, wrapped in bold delimiters alone -> ★ star                   INFERRED    the sentence names its own subject: 'the two [glyph] lines'
  TOTAL 90 substitutions — 20 MECHANICAL, 69 INFERRED, 1 LEFT MARKED AS AMBIGUOUS

WHAT WAS MECHANICAL (byte-recoverable, certain):
  R1   x14   -> · middle dot
  R2   x6    -> § section sign

WHAT WAS INFERRED FROM CONTEXT (a human should spot-check these):
  R4   x1    -> § section sign
  R6   x3    -> ★★★
  R7   x7    -> ★★
  R9   x8    -> ⚠ warning sign
  R10  x10   -> ★ star
  R11  x39   -> — em dash
  R18  x1    -> ★ star

AMBIGUOUS, DELIBERATELY LEFT VISIBLE AS ⁇ (rule R14) — the context does not settle
which glyph was lost, and guessing silently would hide that:
  section 5, 'What is blocked and on whom [em dash] [?] e.g.' — one marker follows another; the second could be a star or a double arrow.

NO WORDS WERE ADDED, REMOVED, OR REORDERED. Only marker glyphs were restored.
PROVEN, not asserted: every non-ASCII character was stripped from the source and from this
file's body, and the two results were compared. They are BYTE-IDENTICAL
(9807 ASCII characters each). Every rule above replaces a non-ASCII run with a
non-ASCII glyph, so no ASCII byte anywhere in the document could move. This header is the only
text added, and it is confined to this comment block.

If the owner still holds the original attachment, replace this file with it and delete this
note. Until then this is the best available copy, and it says so.
—— lane OPS-F, wave OPS-1, base a09653676a299bd2e0ccd2d7fd7672d9138d1d0f
-->

# CONTROLLER ADDENDUM — SURVIVING CONTEXT EXHAUSTION

**Mandatory. Both controllers. Read before your first dispatch.**
**v1.1 · 2026-08-08.** Amends `LazyTopper_Controller_Subagent_Model.md` §2 and Rule 0.

<!--
PROVENANCE — read this before trusting the file.
- Sections 0-5 are the owner-supplied v1.0 body, transcribed VERBATIM to disk by the ME-A controller
  on 2026-08-08. It arrived as an ATTACHMENT and was not on disk.
- Section 6 is v1.1. It REPLACES the v1.0 section 6 in full, per the owner's ruling of 2026-08-08.
  The v1.0 text is retained at the bottom under "SUPERSEDED" so the change is auditable — it is
  NOT in force.
- Transport-corrupted marker glyphs ("a-hat" sequences) are DECORATIVE. Read the words.
-->

---

## 0 · WHAT HAPPENED LAST TIME

The Wave 5G controller ran to **~4% context** with `ME-PROGRESS` still in flight. It did the right
things at the end — wrote `WAVE_STATE_WAVE5G_LIVE.md` (10,869 bytes) to disk before going quiet, and
**refused** to start the archive or the handoff PR rather than half-doing them.

**But the wave closed with `handoff/` still describing the PREVIOUS wave**, and the owner had to
recover it by hand.

> ★★ **The cause is structural. Rule 0 makes the handoff the LAST act — so running out of context
> always destroys the one artefact nobody else can reconstruct.**

The five rules below invert that.

---

## 1 · ★★★ ONE CONTROLLER PER **WAVE**, NEVER PER ARC

**Your lifetime is one wave. When its lanes are on trunk and the handoff is written, you stand down
and a FRESH controller takes the next wave.**

- ME arc — **three** controllers (ME-A, ME-B, ME-C), not one.
- DPDP arc — **two** (DPDP-A, DPDP-B).

★ Measured rate: a controller obeying the bounded report burns **~2% per lane**; one that pastes
subagent findings burned **43% on a single lane.** A four-lane wave plus its handoff is comfortably
survivable. **An arc is not.**

★ **A controller that finishes its wave with context left does NOT take the next wave.** It stands
down. This is the same rule subagents already follow, applied one level up.

---

## 2 · ★★ THE HANDOFF IS WRITTEN INCREMENTALLY, NOT AT THE END

`handoff/WAVE_STATE.md` (untracked) gains a section you append to **after every single subagent
returns** — not at the end, not from memory:

```markdown
## HANDOFF DRAFT — prose, ready to paste

### [CURRENT] <headline>
<two or three sentences: what landed, what it means for a student>

### Lanes
| lane | PR | what it changed | what it disproved |

### FU ids — new / closed / kept open
### Decisions made, with the reason
### ★ CARRY FORWARD VERBATIM
- the WIRE-2 dormancy block
- <anything else that must survive the prepend>
```

> ★★ **RULE: you may not dispatch the next lane until the previous lane's paragraph is in that
> section.** Two minutes each. It converts the handoff from a task you might not reach into a paste
> you have already done.

★ If you die at 4%, your replacement opens the PR from this text in ten minutes. **If you survive,
your own handoff is already written.**

---

## 3 · ★★ HARD FLOORS, AND THE OWNER ENFORCES THEM

**Report `CONTEXT REMAINING: n%` in EVERY message to the owner.** Not occasionally — every message.

| At | You do |
|---|---|
| **45%** | ★ Announce it. *"I have context for roughly N more lanes."* Say the number |
| **35%** | **Dispatch nothing new.** Finish what is running |
| **30%** | Write the archive file and verify it **by SHA** |
| **25%** | Open the handoff PR from your HANDOFF DRAFT, then stand down |

⚠  **A self-policed floor is not a mechanism.** The owner reads your percentage in every message and
will stop you. **If you are below 35% and still dispatching, you are in breach and he will say so.**

★ **These floors assume the §2 draft exists.** Without it the real floor is far higher, because
writing a handoff from memory at 25% is exactly what cannot be done.

---

## 4 · ★★ THE FOUR THINGS THAT BURN A CONTROLLER

**A · Pasting a subagent's report.** Read the **VERDICT**, the two **★** lines, and the disk path.
Nothing else. ⚠  **If a subagent returns more than the bounded template, do not paste it — go to the
file.** *(This single behaviour cost 43% in one lane.)*

**B · "Just checking" a file.** ★★ **The moment you read product source you are a subagent with a
plan attached, and the model has collapsed back into what it replaced.** Dispatch a scout instead —
**a scout that writes nothing is a legitimate outcome.**

**C · Re-deriving what is already on disk.** Trunk, open PRs, lane status — **read your own state
file.** Re-derive trunk with `git ls-remote` only; never by reading the repo.

**D · Summarising for the owner.** — **Give him the disk path and the starred lines.** He can open
the file. Re-typing it into your context costs you the wave.

---

## 5 · ★ WHAT A REPLACEMENT MUST BE ABLE TO DO FROM DISK ALONE

Assume you die without warning. Your state file must let a fresh controller resume **without asking
the owner anything**:

- Trunk SHA at last update · every lane with its status, PR number and allowlist
- **The HANDOFF DRAFT of §2**
- Every decision made, **with its reason** — not just the verdict
- What is **blocked and on whom** — ⁇ e.g. *"`SETTINGS-1` waits on `MI-CONCEPT-1`; the ME controller
  must signal"*
- ★ **Which artefacts are your own extract rather than an owner-authored source.** The last controller
  flagged that the prototype on disk was its extract — **that warning prevented a wrong authority
  being trusted.** Do the same for anything you produced.

**Write it after every subagent returns. Verify by SHA, never by `git diff`.**

---

## 6 · ⚠  TWO CONTROLLERS ARE RUNNING — THE HANDOFF LOCK  **(v1.1 — REPLACES v1.0 §6 IN FULL)**

**The handoff rule is PER-WAVE and POSITIONAL, never per-arc and never by name.**

An earlier version said *"the Me/Progress controller writes the handoff for both arcs."* That
collided with §1. **There is no single Me/Progress controller** — there are three, one per wave, each
standing down when its wave closes. **A permanently-named owner cannot outlive its own author**, so
the rule had to become positional.

> ★★★ **THE RULE:** *whoever closes a wave writes the handoff for everything that has landed since
> the last one — their own arc and the other's.*

**The invariant is not "ME owns the handoff."** It is: **exactly one handoff PR open at any moment,
and no wave closes without its content landing.**

### The check, before you open a handoff PR — A COMMAND, NOT A HABIT

```bash
gh pr list --state open
```

- **No other handoff PR open — YOU WRITE IT.** Cover your own lanes **and every lane the other arc
  has merged since the last handoff.** ⚠  **Ask that controller for its bounded close-out first —
  lanes, PR numbers, FU ids, decisions with reasons — and WAIT for it. Do not guess its content.**
- **Another handoff PR already open — DO NOT OPEN A SECOND.** Hand your close-out to that controller
  and stand down. **Your wave is closed when your content is in its PR.**

★ **DPDP controller, this REVERSES your earlier instruction.** You were told never to write a
handoff. **You may — and must — when no other is open.** `handoff/**` stays out of your *product*
lane allowlists either way.

### Unchanged
- The seven `handoff/` files are a **single shared lock**. **Product PRs may race; handoff PRs
  queue.**
- Exactly **one un-superseded `[CURRENT]`**, with the previous one **demoted, not deleted**.
- Prepends proven by a **per-file heading census** — **uniqueness is not completeness.**
- ★★ The **WIRE-2 dormancy block must survive every prepend and be RESTATED in the new
  `[CURRENT]`.** Its absence once cost five days.
- §2 applies regardless of who opens the PR: **the HANDOFF DRAFT is written incrementally, after
  every subagent returns.** By the time your wave closes it is already written — whether you paste
  it into a PR or hand it to someone who will.

⚠  **Force-merging two handoffs through the GitHub UI has silently preserved stale content over
corrections, with no gate catching it.** **That is why the check above is a command you run, not a
rule you remember.**

### ⚠  STANDING DEBT AT v1.1 — `handoff/` IS FOUR COMMITS STALE
Verified 2026-08-08 by the ME-A controller against `origin/base/approved-thru-437`:
the last handoff was **#628** at `9f78ebc1`. Merged since, unrecorded:

| PR | commit | what |
|---|---|---|
| #629 | `e0ed7588` | FENCE-1 — a student cannot forge the typed-answer delimiter |
| #630 | `a0c9c50b` | DPDP-1 — the verified student data map + a drift guard |
| #632 | `7786878d` | premise ledger gate for agent specs |
| #631 | `6c94d8f0` | ME-PROGRESS — `/me` converged onto one responsive page |

**Whichever controller writes the FIRST handoff covers these four as well as its own wave.**
**#631 is the significant one:** `/me` converged onto one responsive `MeProgressPage.tsx` and
**stopped reading device-local data** — verified, 6 `getWindowedProgress`, 0 `loadInsights`; both
old twins deleted.

---

> ★★★ **THE ONE SENTENCE:** *a controller that dies having closed its wave is a success; a controller
> that dies mid-arc with an unwritten handoff costs the owner a day.* **Bound your lifetime to one
> wave and write the handoff as you go, and neither failure is available to you.**

---
---

## SUPERSEDED — v1.0 §6, RETAINED FOR AUDIT ONLY. **NOT IN FORCE.**

> ## 6 · ⚠  TWO CONTROLLERS ARE RUNNING — THE HANDOFF LOCK
>
> Product PRs may race; **handoff PRs queue.** The seven `handoff/` files are a single shared lock.
>
> - ★ **The Me/Progress controller writes the handoff for BOTH arcs.**
> - **`handoff/**` must never appear in a DPDP allowlist.**
> - DPDP hands over a bounded close-out — lanes, PRs, FU ids, decisions — and opens no handoff PR.
> - ⚠  **Force-merging two handoffs through the GitHub UI has silently preserved stale content over
>   corrections, with no gate catching it.**
