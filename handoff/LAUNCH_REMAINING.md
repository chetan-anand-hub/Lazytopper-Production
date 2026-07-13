# LazyTopper — LAUNCH_REMAINING (the distance-to-launch board)

**Repo home:** `handoff/LAUNCH_REMAINING.md` (version-controlled — this is the source of truth; the copy in
`/mnt/user-data/outputs/` is just the export the cofounder session writes for the owner to commit).
**Trunk at last sync:** `ae5e671` (branch tip; code trunk `e33b9d3`, #395 C&I PR-1; #396 bank Batch 6 after it). _Prior sync `9f5b5c4` (code `25257c0`, #391)._
**Created:** 2026-07-13 · **Last reconciled:** 2026-07-13 (agent docs-handoff, post-#395).

## WHAT THIS FILE IS (and is NOT) — its lane vs the other handoff docs
This is the single **ordered "what's left till we can flip the switch"** board: the critical-path sequence + the hard
pre-launch gates in one place. It answers *"what is the very next domino, and how far are we?"*
- It does **NOT** duplicate `SURFACE_TRACKER.md` (that owns the per-surface Built/Redesigned/Desktop/Mobile/MI/Verified
  matrix — the source of truth for surface completeness; this file **references** its cells, never re-states them).
- It does **NOT** duplicate `OPEN_QUESTIONS_AND_FOLLOWUPS.md` (that is the full FU ledger; this file lists only the FUs
  that actually gate launch).
- It does **NOT** duplicate `CURRENT_STATE.md` (what the last PR did) or `NEXT_ACTION.md` (the per-PR pointer).
If this file and `SURFACE_TRACKER` ever disagree, **SURFACE_TRACKER wins on surface cells**; this file is reconciled to it.

---

## §0 · THE UPDATE SYSTEM (how this stays true across sessions — read before editing)
This tracker persists in **two** places and is kept honest by **riding the ritual that already happens**, never a new
separate process (the standalone-tracker-nobody-updates failure is exactly what this avoids).

**Where it persists**
1. **In the repo (the durable spine):** `handoff/LAUNCH_REMAINING.md`, version-controlled beside `SURFACE_TRACKER`.
   Every change lands through the normal docs-handoff path, so git history IS the audit trail.
2. **Across Anthropic sessions:** every cofounder session **reads it LIVE from the repo at bootstrap** (it is on the
   skill's bootstrap read-list, alongside CURRENT_STATE / SURFACE_TRACKER / OPEN_QUESTIONS) — never from memory or a
   paste. The uploaded per-session handoff `.md` is orientation only; **this file + SURFACE_TRACKER govern.**

**The four update triggers (mirror `SURFACE_TRACKER` §3 exactly — same culture, no new burden)**
- **Trigger A — every PR (the agent).** If a PR advances a critical-path item or flips a gate, update the relevant
  line **in the SAME docs-handoff PR** it already files. If nothing here moved, state "LAUNCH_REMAINING: no change."
- **Trigger B — every session (the cofounder / Claude).** At session **start**, reconcile every line against the live
  repo (verify-before-asserting: an item marked done must be true in code/tracker). At session **end**, ensure the
  board reflects what moved. The cofounder owns this file's *accuracy*; the agent owns the *per-PR flip*.
- **Trigger C — every live-verify (the owner).** When Chetan live-verifies a surface or clears a gate, the matching
  line flips to ✅ done (he says so; cofounder or agent records it). Nothing is "launch-ready" on static work alone.
- **Trigger D — scope discovered mid-work (anyone).** A newly-discovered launch blocker is added here **and** logged in
  `DECISION_LOG.md` + `OPEN_QUESTIONS` the moment it's decided necessary — never a silent expansion.

**Who may write it**
- **Owner (Chetan):** may **direct-push** edits straight to trunk — it's `*.md` in `handoff/`, revertible text (per the
  direct-push scope rule). His own words in a text file → push.
- **Agent-produced edits:** go through a PR like all agent output. A **docs-only** PR touching strictly `handoff/*.md`
  may self-merge (§6a); serialize docs-handoff PRs (they edit the same files).

**The shape rule (so it never drifts in format).** Keep the sections below in this order. Status tokens:
`✅ done · 🔵 in flight · 🟡 queued/specced · ⬜ not started · ⚠️ built-but-live-verify-pending · 🔒 owner-gated`.
Every line carries a **source** (a SURFACE_TRACKER surface, a PR#, or an `[FU-…]`) so it's checkable. Append a dated
one-liner to §8 on every change. Do not let this file grow a per-surface matrix — that's SURFACE_TRACKER's job.

**Optional later automation** (not built — logged so we don't pretend it exists): a CI check could assert this file was
touched in any docs-handoff PR that also flipped a `SURFACE_TRACKER` cell, the same way `lane-overlap` / the state-board
ledger mechanize the deterministic parts. Ritual-anchored is what's proven here; automate only once it's felt necessary.

---

## §1 · LAUNCH DEFINITION (north star — from SURFACE_TRACKER §1)
**Soft launch = every CORE student surface is Built + Redesigned (new grammar) + responsive Desktop AND Mobile +
MI-connected (where applicable) + owner Live-verified — PLUS every hard pre-launch gate (§6) cleared.**
Owner-set order: **(1)** converge + make responsive + wire MI through (architecture & plumbing) → **(2)** enrich data
gradually (extraction/notes — a PARALLEL track, NOT part of the architecture gate). Audience is minors (~15–16yo):
child-safe, honest empty-states over fabrication, MI's careless-vs-weakness split is the moat.

---

## §2 · THE CRITICAL PATH (the ordered dominoes — this is the "what next" spine)
Locked dependency chain (from the design arc + the 2026-07-12 handoff). Parallel lanes noted.

1. ✅ **FT-FINALIZE (#391) MERGED** — Full Test reachable from hub + Home; chain unblocked. Owner **production live-verify still pending** → flips Full Mock's Verified cell (§5). *(§3.1)*
2. ✅ **C&I PR-1 (#395) MERGED** — Check & Improve is a first-class SessionSurface (durable records into the SAME stream every surface uses; owner byte-reviewed CLEAN). Closes [FU-CI-SCORECARD-VARIANT] + [FU-CI-DEVICE-LOCAL-SEQUENCE]. Remaining C&I arc = PR-2 per-question topic → PR-3/4 solution cache — **parallel depth, NOT on the launch spine.** *(SURFACE_TRACKER C&I row, Scope→Settling)*
3. 🟡 **PR-B progress memory layer** — the **launch-blocker**; **NOW the immediate next domino** — and #395 unblocked it to aggregate check-improve alongside worksheet/CT/FM. Dispatch to a fresh Opus agent AFTER the cofounder re-checks PR-B's file-list disjointness vs the merged #395 diff (owner confirms before dispatch). *(§4)*
4. ⬜ **Progress Arc PR-4 — Me/Progress redesign** — reads PR-B. *(§5)*
5. ⬜ **Home nudge PR-5** — orient-first convergence + ungraded nudge; reads PR-B. *(§5)*
6. 🔒 **Pre-launch gates (§6)** cleared + **MockViewGate flips** (CT, FM) + **mobile-parity confirms** (§5) + owner
   live-verify sweep.

**Parallel (do not block the spine):** Tutor rebuild *(§3.3, blocked on owner brainstorm)* · Bank expansion *(§7)* ·
Legacy faulty-question audit *(§7, after expansion)*.

---

## §3 · IN FLIGHT NOW (live lanes)
- **§3.1 ✅ FT-FINALIZE (#391) MERGED** (code trunk `25257c0`) — owner byte-reviewed clean, sacred files byte-identical.
  Full Test is LINKED from the practice hub + Home (no more URL-only route), MockViewGate the only gate; cross-device
  upload-later persists the paper TEXT-only at `sessionRecords/{uid}/fullMockPapers/{code}` (firestore.rules untouched);
  title-case + stale-comment fixes landed. Closed `[FU-FM-HUB-ENTRY]`, `[FU-FM-CROSS-DEVICE-UPLOAD]`,
  `[FU-TOPIC-DISPLAY-TITLECASE]`, `[FU-SCORECARD-STALE-HEADER-COMMENTS]`. **Remaining = owner production live-verify only**
  (§5). New FUs: `[FU-RETIRE-EXAM-SIMULATION-LINKS]` (6 legacy pages still link `/exam-simulation`),
  `[FU-VITEST-PREEXISTING-FAILURES]` (CI-invisible, pre-existing).
- **§3.2 🔵 BANK EXPANSION (Fable) — ~22 topics remain** (bank 7,084 → **7,342**; 4 topics done). Fresh Fable window
  booted after context-limit rotation. **Watch:** verify its first batch kept the **≥75 distinct floor** + the
  **two-direction syllabus gate** across the handoff. Byte-review each batch. Parallel data track — not an arch gate.
- **§3.3 🟡 TUTOR (design) — blocked on owner.** Two-panel Trig mockup REJECTED; awaiting the owner's answer on *what*
  made it bad (concept / visual / conversation-feel / interaction / whole chat-tutor framing). Do **not** rebuild on the
  rejected concept. `[FU-CONTEXTUAL-TUTOR-REBUILD]` + PR-D.1 mobile toggle downstream of that answer.

---

## §4 · QUEUED & SPECCED (files ready in the session outputs / repo)
- ✅ **C&I PR-1 — MERGED (#395, `e33b9d3`)** — the plumbing landed exactly as specced (record + topicSource + 5th
  variant + history overlay + durable `#NN`; detection/correction/MI byte-intact; shell zero-line-diff). Follow-on
  C&I depth (PR-2 per-question topic → PR-3/4 solution cache, owner 3-gate sign-off) is parallel, not spine.
- 🟡 **PR-B progress memory layer (launch-blocker) — THE NEXT DOMINO** (unblocked by #395 to aggregate
  check-improve alongside the other graded surfaces; re-check file-list disjointness vs the merged #395 diff
  before dispatch) — multi-rung windowed aggregation
  (subject→topic→concept→section→mistake-type, all derivable from the durable streams), consolidate 4 stores → ONE
  `progressStore`, honest-or-silent per rung. ~90% infra exists; only visible change = a working week/2wk/month/4mo
  window selector. Unblocks Me/Progress + Progress Arc + honest "vs last time" everywhere.
- 🟡 **CT-balanced-mix `[FU-CT-BALANCED-MIX]`** — small, SEPARATE CT PR: wire Chapter Test to the shipped
  `drawBalancedSet` (utils/balancedMockDraw.ts). Not folded into FT.
- ⬜ **Legacy faulty-question audit** — spec **NOT yet written** (decisions locked: WITHHELD-now-delete-later-after-QA,
  runs AFTER expansion refills to floor, floor-safe). Write when owner asks.

---

## §5 · SURFACES REMAINING (compact — cell detail lives in SURFACE_TRACKER §2)
Only surfaces NOT yet fully green are listed. See `SURFACE_TRACKER.md` for the authoritative cells.
- ⚠️ **Full Mock** — BUILT (#387) + LINKED (#391, hub + Home); ONLY remaining = owner **production live-verify**
  (checklist in `report-ftfinalize-build-2026-07-13.md` §7).
- ⬜ **Me / Progress** — full **redesign** to the visual journey (Redesigned ⬜, Desktop/Mobile 🟡); blocked on PR-B → arc PR-4.
- 🟡 **Home** — converge to orient-first + real-insights wiring + ungraded nudge (arc PR-5, after PR-B).
- 🟡 **Tutor / Learn** — rebuild to locked contract + mobile toggle; blocked on owner brainstorm (§3.3).
- 🔒 **Chapter Test** — matrix-green; behind `MockViewGate` (owner flips at launch) + `[FU-CT-BALANCED-MIX]` (§4).
- 🟡 **Exam Trends** — confirm mobile parity + live-verify.
- 🟡 **HPQ / Predicted** — confirm mobile parity + live-verify.
- 🟡 **Landing** — confirm both widths.

**Mature / done (no launch work):** Check & Improve · Quick Practice · Topic Hub · Worksheet · Notes · Login.
(Cross-surface topic-key P0 already cured, #363.)

---

## §6 · HARD PRE-LAUNCH GATES (centralized here — no other doc holds these together)
These are independent of surface completeness and are each easy to forget.
- 🔒 **`[FU-DETECTION-META-LAUNCH-FLIP]`** — flip `SHOW_DETECTION_META = false` in
  `lazytopper/src/utils/checkImproveDetection.ts` before C&I ships to students. One line; hides only the source-label
  meta, never the detected values or the [Change] control. Verify on desktop + app after flipping.
- 🔒 **AI cost / rate-limit hardening `[D25]`** — add gateway rate limiting + leaner call patterns + a cost ceiling
  before the student link (Gemini 429 "credits depleted" hit in testing). Bundle with the Railway deploy.
- 🔒 **`[MI-EVAL]`** — the 40–60 graded-answer check-solution eval set (+ tutor fabricated-solution correctness eval).
  Gates how hard we lean on AI-estimated grades; unblocks the eval-gated MI items.
- 🔒 **`MockViewGate` flips** — Chapter Test + Full Mock go live at the owner's discretion at launch.
- ▫️ **SMS deliverability `[SMS-DELIVERABILITY]`** — Firebase default SMS lands in Android spam; MEDIUM, **not** a hard
  blocker (Google sign-in is primary; phone is fallback).
- ▫️ **`[FU-RETIRE-EXAM-SIMULATION-LINKS]`** — 6 legacy pages still link the retired `/exam-simulation`; cleanup lane,
  not a hard gate. `[FU-VITEST-PREEXISTING-FAILURES]` = CI-invisible test debt (6 pre-existing failures in 3 untouched
  files), not a blocker.

---

## §7 · PARALLEL DATA TRACK (enriches; does NOT gate the architecture)
- 🔵 **Bank expansion** — ~22 topics remain (§3.2). Floors: A/B/C extract-max no ceiling; D/E/proofs/case-based ≥75
  distinct + honest-stop. Source of truth: `handoff/BANK_EXPANSION_LANE_STATE.md`.
- ⬜ **Legacy faulty-question audit** — after expansion; WITHHELD-now-delete-later; floor-safe (§4).
- ✅ **Notes** — all 26 canonical topics specced + audited; clickable NCERT page-cites LIVE (#375). Done.

---

## §8 · CHANGE LOG (append one dated line per change — newest first)
- **2026-07-13 (post-#395)** — **C&I PR-1 #395 MERGED** (code trunk `e33b9d3`; sync tip `ae5e671` incl. #396 bank
  Batch 6). Critical-path domino #2 done → **PR-B is now the immediate next domino** (and #395 unblocked it to
  aggregate check-improve). Closed `[FU-CI-SCORECARD-VARIANT]` + `[FU-CI-DEVICE-LOCAL-SEQUENCE]`; new
  `[FU-CI-TOPICSOURCE-BANK-MATCHED-RESERVED]` (reserved-not-emitted — never wire a fake matcher) +
  `[FU-CI-PERQUESTION-TOPIC]` (arc PR-2). C&I Scope reopened Locked→Settling while the arc completes.
- **2026-07-13 (re-sync)** — Trunk advanced mid-session `c4fef2d` → `9f5b5c4` (code `25257c0`). **FT-finalize #391
  MERGED** — Full Test linked (hub + Home); `[FU-FM-HUB-ENTRY]` / `[FU-FM-CROSS-DEVICE-UPLOAD]` /
  `[FU-TOPIC-DISPLAY-TITLECASE]` / `[FU-SCORECARD-STALE-HEADER-COMMENTS]` closed. Critical-path domino #1 done →
  **C&I PR-1 is now the immediate next**; Full Mock pending only owner production live-verify. New FUs:
  `[FU-RETIRE-EXAM-SIMULATION-LINKS]`, `[FU-VITEST-PREEXISTING-FAILURES]`.
- **2026-07-13** — File created. Baseline reconciled against trunk `c4fef2d` + SURFACE_TRACKER matrix + the 2026-07-12
  cofounder handoff (cross-checked vs the still-active old session, in sync). Critical path: FT-finalize → C&I PR-1 →
  PR-B (launch-blocker) → Me/Progress (arc PR-4) + Home (arc PR-5); Tutor + bank expansion parallel; then §6 gates +
  MockViewGate flips + mobile-parity confirms + owner live-verify sweep.
