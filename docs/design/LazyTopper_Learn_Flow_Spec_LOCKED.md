# LazyTopper — Learn Flow Redesign · LOCKED SPEC
### Date locked: 2026-06-01 · Owner approved · Base: trunk tip (post-#172, code `a636037`)
### Surfaces: Exam Trends + Topic Hub + concept tutor + Check & Improve (untouched here)
### Two parallel tracks: A = Design/UI build · B = Content generation

---

## DESIGN DECISIONS (locked — do not re-open without owner)

### Exam Trends (replaces the card grid)
- **Ranked priority list**, not a uniform card grid. Topics sorted by marks weight (default) or trend.
- **Marks weight rendered as a visual bar** (size-of-prize); **trend colour-coded** (high=red, medium=amber, low=neutral). Rationale: weight = return-on-effort; trend = likelihood, the moat's intelligence made visible.
- **Sort toggle:** weight ↔ trend (early-prep vs exam-week strategies).
- **One primary action per row ("Open" → Topic Hub)**; secondary actions (Practice / Worksheet / Predicted / Add-to-selection) behind a "⋯" reveal — keeps all topics scannable.
- **Data-driven:** renders ALL topics (28) and BOTH subjects with the existing Maths/Science + science-stream toggles. Nothing hardcoded.
- **Proof-relevant topics flagged** with a small "proofs" marker.
- Layout unifies desktop + mobile (single-column ranked list ports cleanly to mobile).

### Topic Hub (rebuilt around the concept row)
- **Concept-spine layout:** the page IS its concept rows. Each row = name + sub-formula + mark band + visual badge + two actions: **"Learn this"** (tutor) and **"Practise"** (questions).
- **In-page back button** (top-left, "← Back to Exam Trends") — not a breadcrumb above the fold.
- **Header tabs:** Formula sheet (all topics) · Proofs (ONLY proof-relevant topics, driven by the teach-contract topic-shape) · Practice all.
- **Removed (deletions locked):** prose blurb-heavy snapshot, "Need a quick hand?" static panels (Explain/Show-visual/Mini-check), standalone "How boards use it" + "Mistakes & next action" prose accordions, the "Recommended next" banner. Examiner tip survives as ONE line. Mistake Intelligence stays on Home/Me, not here.
- Tight stat strip (trend · marks · sections) replaces the prose right-rail.

### Tutor ("Learn this" → concept tutor)
- Reuses the existing engine: `ConceptTeachDrawer` → `TeachFlow` → `/api/mentor` in **`concept_teach` mode** (already built; per-concept, not per-chapter). Do NOT build a new chat. Do NOT use `TutorDrawerV2`/`MentorPanel` (dead code).
- **Per concept row** (not chapter-level). Concept context passed in; `questionText` empty → triggers `concept_teach`.
- **Teach-first.** No diagram auto-opens.
- **Starter chips: 1–2, first/empty turn ONLY** ("I don't understand", "Give me an example"). Gone after the first exchange. Not on every turn.
- **Interactive is an EARNED reveal:** after teaching, the tutor offers "open the interactive"; only on student yes does it open.
- **Interactive opens in a SEPARATE side-by-side window** beside the chat (not inline in the chat), scrolled to the relevant part, with its own close control. On mobile: full-screen toggle, not side-by-side.

### Formula sheet & Proofs
- Each is a panel on the Topic Hub; **both offer a Download-PDF**.
- **PDFs are PRE-GENERATED static files** stored per-topic. NO runtime API cost, instant, identical for all, works even when the gateway is down. Reuse existing `jspdf` dependency (already in package.json) via an offline generation script.

### Design grammar (enforced on ALL content pages)
- Tokens from `styles.css`: `--font-display` (Fraunces, headings), `--font-body` (Inter), brand green `hsl(152,55%,45%)`. (Verify the live display font — styles.css token says Fraunces; an @import line references Space Grotesk — confirm in build.)
- Content pages (formula sheets, proofs, generated interactives) MUST consume these tokens — no reinvented colors/fonts. Light mode.

---

## TRACK A — DESIGN/UI BUILD (ships on a known timeline)
Shipped as small, reviewable, desktop + mobile PRs. Each proves desktop-unchanged where applicable, build green, guards pass. Honest "coming soon" placeholders where Track B content isn't ready yet.

Surfaces to build: `DesktopExamTrendsPage.tsx` (972 ln) + `pages/app/ExamTrends.tsx` (mobile); `DesktopTopicHubPage.tsx` (2,473 ln) + `pages/app/TopicHub.tsx` (mobile). All `/topic-hub*` already `RequirePremium` — access model unchanged.

(PR sequencing to be produced after reading staging — built in steps, never one giant rewrite.)

---

## TRACK B — CONTENT GENERATION (parallel, staged, with placeholders)
The UI ships with honest placeholders ("visual soon" / "proofs coming") and fills progressively as content lands. Stored at the contextual/relevant per-topic location, matching existing file conventions (`public/visuals/<subject>/<chapter>/<concept>.html`, etc.).

1. **Interactives** — ~40 missing concept files, **Claude-generated** (best-in-class for interactives), matching existing file pattern + design grammar. New files built **section-addressable** (so the tutor can deep-link the relevant part); existing files retrofitted only where it matters.
2. **Proofs** — authored, board-correct CBSE-format proofs for ALL proof-relevant topics, Maths AND Science. Stored per-topic.
3. **Formula sheets** — per-topic formula sets, Maths AND Science. Source: extend existing `topicHubContent.ts` data where possible.
4. **Pre-generated PDFs** — offline jspdf script renders formula-sheet + proof PDFs to static per-topic files.

### Content QA — ROBUST (owner: quality of content is paramount)
Content correctness is a launch-credibility / moat issue. QA must be a real gate, not a glance:
- **Proofs:** every proof verified board-correct (Given/To Prove/Construction/Proof structure; correct theorem citations; CBSE marking format). No unverified proof ships.
- **Interactives:** each opens, renders, is genuinely interactive, mathematically correct (e.g. a "parallel" line is actually parallel; a ratio actually updates correctly), and on design grammar. Visual-quality audit of the existing ~105 too (quality may vary — not yet eyeballed).
- **Formula sheets / PDFs:** every formula correct; PDF renders cleanly; design grammar; no syllabus-banned content (run against `syllabusGuard`).
- **Automated where possible:** a content-validation test (render check, schema/shape check, syllabus-guard check, broken-link/missing-file check) in the guard suite; manual sign-off for mathematical correctness.

---

## OUT OF SCOPE HERE (tracked elsewhere)
- API gateway Railway deploy (ISSUE-009) — the infra unlock for the tutor + Check & Improve in prod. Tutor UI ships behind it; works on local dev meanwhile.
- Clerk `pk_live_`, DNS (`lazytopper.in`), CI, eval set, compliance/DPDP, monetization charge path.

---

## NON-NEGOTIABLES CARRIED FORWARD
- Reuse existing engine; don't rebuild the tutor. Dead code (`TutorDrawerV2`, `MentorPanel`) untouched.
- Desktop-unchanged proof on any shared-surface edit; `npm run build` is the gate (not bare `tsc`).
- Per-concept `concept_teach` mode; verify `findVisualForConcept` mapping before diagram wiring.
- Honest placeholders for missing content; never fabricate a proof, formula, or insight.
