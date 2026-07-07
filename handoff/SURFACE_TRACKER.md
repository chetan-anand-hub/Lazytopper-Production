# LazyTopper — SURFACE TRACKER (the road to soft launch)
**Home:** this file lives at `handoff/SURFACE_TRACKER.md` in the repo (version-controlled, beside CURRENT_STATE). **Trunk at last sync:** `8c4c159` (#341 Progress-Journey ARC · PR-2 — the **Universal `<ResultsScorecard>`** extracted from `WorksheetScorecard`: one shared results SHELL + a typed 4-surface variant interface (`components/results/`). **Worksheet + Quick Practice variants LIVE**; Chapter Test + Full Mock = `deferred:true` config seams pending those surfaces' rebuilds. Presentational — writes nothing (§1a: Quick Practice writes no session record; worksheet write stays in `gradeWorksheetAndRecord`). **No COMPLETION cell moved** — both live surfaces were already ✅ and the worksheet scorecard is byte-identical (the non-regression gate); this consolidates shared chrome the later arc surfaces (histories/Me/CT/FM) will reuse) (#338 Progress-Journey ARC · PR-1 — the session-record **DATA LAYER**: `sessionRecords/{uid}/records/{code}` store + `progressStore` aggregation reader + durable cross-device `#NN` + `perQuestionRef`; the connectivity spine the scorecard/histories/Me/Home arc reads — **no surface COMPLETION cell moved** (data plumbing; the surfaces that read it are later arc PRs); new Firestore collection → rule deployed `dc73360`) (#330 Light extraction — CONTENT-ONLY: question-bank supply enriched 326→767 with bound figures; **no surface cells moved**) (post-#297 Z3 figure-binding — Quick Practice now renders bound source figures as `<img>` for Z3 case-based questions). **Maintainer ritual:** see §3 — it is updated in the SAME post-PR handoff the agent already does, reconciled by the cofounder each session, and the Verified column flipped by the owner.

This is the **glanceable "are we there yet" view** that the per-PR CURRENT_STATE/ROADMAP can't give. CURRENT_STATE answers "what did the last PR do"; THIS answers "how complete is each surface, and what's left to soft launch."

---
## 1 · THE NORTH STAR (definition of soft-launch-ready)
Soft launch = **every CORE student surface is Built + Redesigned (to the new grammar) + responsive on Desktop AND Mobile + MI-connected (where applicable) + owner Live-verified.**
Goal ORDER (owner-set): **(1)** finish & converge the surfaces + make everything responsive on both widths + wire MI through-and-through (the *architecture & plumbing*) → **(2)** then enrich data gradually (extraction, notes authoring). Data enrichment is a PARALLEL track and is NOT part of the architecture gate — a surface can be "done" structurally with a thin-but-honest bank.

**Legend:** ✅ done · 🟡 partial / in progress · ⬜ not started · ⚠️ done-but-owner-live-verify-pending · — not applicable
**Mobile column rule:** ✅ only if the surface renders the CURRENT design on mobile (one responsive component or verified mobile build). 🟡 if it still routes to an OLD/dead mobile surface — that drift is the known launch risk and must reach ✅.

**⚠️ THE SCOPE-IS-NOT-FIXED PRINCIPLE (read before trusting any row).** A surface's definition-of-done is NOT known in full up front. Building a surface *discovers* necessary pieces — the worksheet generator revealed the scorecard, the nomenclature, the durable record, the parent/teacher foundation; none was in the original plan, all proved necessary. This is scope *discovery*, not scope creep. So every row carries a **Scope** status, and the completion cells (✅/🟡) are read **against the surface's CURRENTLY-KNOWN scope** — which can grow.
- **Scope = `Settling`** — still discovering necessary detailing; the known scope is probably not the whole scope. Do NOT read a row of ✅s as "finished" while Scope is Settling.
- **Scope = `Locked`** — the shape has stabilized; nothing obvious remains; ✅s can be trusted as truly done. A `Locked` surface that later sprouts a new necessary piece is a useful signal (the lock was premature) — reopen it to `Settling`, log the discovery (§2a + the repo's DECISION_LOG), and usually spawn a NEW PR rather than swell an open one.

## 2 · THE MATRIX
Cells are read against each surface's CURRENTLY-KNOWN scope (see the Scope column + §4 discovered-scope log).
| Surface | Scope | Built | Redesigned | Desktop | Mobile | MI | Verified | Next action |
|---|---|---|---|---|---|---|---|---|
| **Check & Improve** | Locked | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | mature; MI/grader reference. #333: multi-Q now shows per-step annotation (expandable) + Download/Read graded solution on both paths (bridge to Universal Scorecard), owner live-verified. #331 fixed Bug 2/3. No cells moved (already ✅) |
| **Quick Practice** | Locked | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | none — mature (finish-session scorecard, exact mark-band) |
| **Exam Trends** | Locked | ✅ | ✅ | ✅ | 🟡 | — | 🟡 | confirm mobile parity |
| **HPQ / Predicted** | Locked | ✅ | ✅ | ✅ | 🟡 | — | 🟡 | confirm mobile parity |
| **Topic Hub** | Settling | ✅ | ✅ | ✅ | ✅ | — | ✅ | PR-F content (Notes + Examiner's tips) → PR-G delete dead old surfaces |
| **Worksheet** | Settling | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | **owner live-verify #291+#295**; then PR-B durable record (discovered scope — see §4) |
| **Chapter Test** | Settling | ✅(old) | ⬜ | 🟡 | 🟡 | 🟡 | ⬜ | **REDESIGN (next design)** — board-pattern paper, scorecard-and-sheet pattern, E2b upload grade for subjective+MI; its `<ResultsScorecard>` variant is a `deferred:true` seam (#341) → the rebuild FILLS config, not re-architects |
| **Full Mock** | Settling | ✅(old) | ⬜ | 🟡 | 🟡 | ⬜ | ⬜ | rebuild — re-source pool onto `canonicalQuestionBank` (keep prediction overlay) + E2b grade seam + redesign; its `<ResultsScorecard>` variant is a `deferred:true` seam (#341) → the rebuild FILLS config (section-breakdown lens), not re-architects |
| **Me / Progress** | Settling | ✅ | ⬜ | 🟡 | 🟡 | ✅ | ⬜ | REDESIGN to a visual progress *journey* (houses My Tests); reads scorecard data |
| **Tutor / Learn (TeachFlow)** | Settling | ✅ | 🟡 | ✅ | 🟡 | — | 🟡 | PR-D.1 mobile tutor toggle; [FU-CONTEXTUAL-TUTOR-REBUILD] |
| **Home** | Settling | ✅ | 🟡 | 🟡 | ✅ | — | 🟡 | converge to orient-first; real-insights wiring; confirm desktop |
| **Landing** | Locked | ✅ | ✅ | ✅ | ✅ | — | 🟡 | confirm both widths |
| **Login** | Locked | ✅ | ✅ | ✅ | ✅ | — | ✅ | none (Firebase live) |
| **Notes** (content track) | Settling | ✅ | — | ✅ | 🟡 | — | ⚠️ | FULLY RENDERS (#329): visual d3 mindmap + generated figures (Quadratic triptych) + Download-PDF — every tab, no placeholders; render pipeline proven, ~30 chapters remain (spec authoring, Fable content lane). Owner live-verify of visual/print pending (mobile ≤380px + PDF chrome) |

## 2a · DISCOVERED-SCOPE LOG (scope that emerged AFTER a surface was first planned)
The record of how each surface revealed its true shape. Each entry: what was discovered · why it became necessary · where it went (PR / queued). This is not noise — it is the most reusable artifact here: it teaches us to predict the *next* surface's hidden scope (Chapter Test will discover its own equivalents).
- **Worksheet** (originally "a responsive generator"):
  - *Scorecard popup* — graded results needed a summary surface, not a wall of per-question text → PR-A (#295).
  - *Worksheet nomenclature `WS-{S}-{TOPIC}-{NN}`* — durable records and "which worksheet" need a stable identity → PR-A device-local, PR-B durable.
  - *Four-type breakdown on the scorecard* — the MI moat had to be reflected at the worksheet surface → PR-A.
  - *Branded graded PDF* — students wanted to keep/share the graded sheet → PR-A.
  - *Durable per-student record (uniqueness + journey + scorecard persistence)* — device-local couldn't guarantee fresh questions or a Me/Progress journey → PR-B (#321) MERGED, and now genuinely LIVE end-to-end after **#322** (`706cc12`). *Discovered while live-verifying PR-B:* the record was merged but non-functional — Firestore's `getFirestore` init threw on every `undefined`-bearing attempt doc and fire-and-forget `.catch` hid it (see D32). #322's `initializeFirestore(..., { ignoreUndefinedProperties: true })` fixed it; owner live-verified the durable `practiceInsights/{uid}/attempts` write on production. This does NOT flip Me/Progress to ✅ (the visual journey redesign is still pending) — it makes the persistence FOUNDATION the redesign reads from actually work.
  - *Parent/teacher view foundation* — once a durable record existed, seeding the parent/teacher storage became cheap and obvious → PR-B foundation; the VIEW is a later deliberate feature.
  - *Session-record DATA LAYER (Progress-Journey ARC · PR-1, #338 `d704b1c`)* — the durable per-COMPLETED-session record (`sessionRecords/{uid}/records/{code}`) + the ONE `progressStore` aggregation reader + durable cross-device `#NN` + `perQuestionRef` (review-my-answers) generalise the PR-B per-ATTEMPT record to the graded-SESSION altitude. This is the connectivity spine the Universal Scorecard (arc PR-2), per-surface histories (PR-3), **Me/Progress** (PR-4), and the Home ungraded nudge (PR-5) all READ — so those surfaces' redesigns now have their data foundation. **No completion cell flips yet** (data plumbing only; the reading surfaces are the later arc PRs). New top-level Firestore collection → owner-deployed rule `dc73360`.
  - *Universal `<ResultsScorecard>` (Progress-Journey ARC · PR-2, #341 `8c4c159`)* — the worksheet scorecard (PR-A discovered scope) was extracted into ONE shared results shell (`components/results/ResultsScorecard.tsx`) + a typed 4-surface variant interface (`scorecardVariants.ts`). Worksheet + Quick Practice variants are LIVE and behaviour-identical (worksheet proven byte-identical = the non-regression gate); Chapter Test + Full Mock are `deferred:true` config seams so those rebuilds (below) FILL config, not re-architect. Presentational — writes nothing (§1a). The old per-surface `WorksheetScorecard.tsx` was deleted (absorbed). No completion cell flips (both live surfaces already ✅); this is the shared chrome the per-surface histories (PR-3), Me/Progress (PR-4), and the CT/FM rebuilds will reuse.
- **Topic Hub** (originally "an IA layout"):
  - *Exact mark-band filter* — concept-row Practise leaked wrong-mark questions through coarse buckets → PR-E1.
  - *Two-pool count divergence fix* — the "N available" hint and the displayed set drew from different samples → PR-E1.
  - *Concept rows FULLY SEEDED* — only 14 topics had real authored `boardEssentials`; the other 12 fell back to the generic `buildSampleActionable` "core ideas" rows → #337 authored real CBSE-2026-27 concepts for all 12, so **26/26 topics now render real board-essential concepts** (none on the fallback; `buildSampleActionable` retained as the net). Pedagogy sign-off (selection + mark bands) deferred to student-QC ([FU-TOPICHUB-PEDAGOGY-REVIEW]).
- **Chapter Test / Full Mock / Me-Progress:** *(none yet — Settling; expect discoveries during their redesign; log them here as they surface.)*

## 2b · OPEN DISCOVERED ITEMS NOT YET PLACED
(Discovered-necessary work that hasn't been assigned to a PR yet — the holding pen so nothing falls through.)
- *(none open right now — PR-B holds the current Worksheet discoveries.)*

## 3 · THE UPDATE DISCIPLINE (the culture that keeps this honest)
The tracker stays fresh because it rides the ritual that ALREADY happens, not a new separate process.

**Trigger A — every PR (the agent).** When a PR moves a surface's status, the agent flips the cell(s) here **in the same docs-handoff PR** it already files alongside CURRENT_STATE/ROADMAP. One line added to `handoff/templates/session-update-template.md` and to CLAUDE.md's handoff ritual: *"Update SURFACE_TRACKER.md cells for any surface this PR moved; if none moved, state so."* No flip is silent.

**Trigger B — every session (the cofounder / Claude).** At session START, reconcile the matrix against the repo (same verify-before-asserting rule — confirm a cell marked ✅ is actually true in the code) and flag any drift. At session END, ensure the matrix reflects what moved. The cofounder owns the *accuracy* of this file; the agent owns the *per-PR flip*.

**Trigger C — every live-verify (the owner).** When Chetan live-verifies a surface, the **Verified** cell flips ✅ (he says so; the agent or cofounder records it). A surface is never "done" on static work alone — ⚠️ until the owner verifies.

**Trigger D — the moment scope is DISCOVERED (anyone, mid-work).** When, mid-PR or mid-design, a new piece is decided necessary that wasn't in the plan, treat it as a first-class event, not a silent expansion:
1. **Log the decision** in the repo's `handoff/DECISION_LOG.md` with the rationale ("decided X necessary because …").
2. **Add it to §2a** under that surface (what · why · where it went), and keep the surface's **Scope = `Settling`** until the dust settles.
3. **Decide placement:** small + tightly coupled → fold into the open PR and note it in the report; non-trivial or separable → **spawn a NEW queued PR** (PR-A → PR-B was exactly this) and park it in §2b until assigned. **Default to spawning, not swelling** — a PR that grows mid-flight is the one most likely to slip past review. A surface only flips to `Locked` when no obvious discovered work remains.

**Cadence & milestones.** The matrix is the standing "are we there yet" board. A surface going fully green across all its applicable columns is a milestone — a one-line SESSION_LOG entry. The soft-launch gate is met when every CORE surface row (Check&Improve, Quick Practice, Topic Hub, Worksheet, Chapter Test, Full Mock, Me/Progress, Tutor, Home, Landing, Login) is ✅/✅ across Built · Redesigned · Desktop · Mobile · MI · Verified.

**Anti-rot guarantee.** Because the flip lives inside the existing post-PR handoff (the thing the agent does every single PR), it cannot drift far. The classic failure — a standalone tracker nobody updates — is avoided by *not* making it standalone.

## 4 · READING THE BOARD RIGHT NOW (so the path is unambiguous)
- **Mature / done (5):** Check & Improve, Quick Practice, Topic Hub, Login — plus Worksheet pending only the owner live-verify.
- **The surface-completion critical path (your stated priority):** **Chapter Test redesign → Full Mock rebuild → Me/Progress redesign.** These three are the bulk of "surfaces complete + responsive both + MI through." Chapter Test is next (design first); it establishes the scorecard-and-sheet + upload-grade pattern that Full Mock and Me/Progress reuse.
- **The cross-cutting mobile-drift risk:** several surfaces are 🟡 on Mobile because they still route to an OLD design (the split-component legacy). PR-G's deletion of dead old-mobile surfaces + per-surface convergence to one responsive component is what turns those ✅. Track it per surface here, not as a vague "make it responsive" task.
- **MI through-and-through:** ✅ on Check&Improve, Quick Practice, Worksheet. **Gaps:** Chapter Test (MCQ-only today — needs the E2b upload loop for subjective + mistake-type MI) and Full Mock (⬜). Closing those two is "MI through-and-through."
- **Data (parallel, later):** extraction (next folder = Foundation 5-mark LA/proofs) and Notes authoring enrich the banks gradually; they do NOT block the architecture gate.
