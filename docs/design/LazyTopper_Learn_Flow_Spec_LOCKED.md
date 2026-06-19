# LazyTopper — Learn Flow Redesign · LOCKED SPEC
### Date locked: 2026-06-01 · Owner approved · Base: trunk tip (post-#172, code `a636037`)
### Surfaces: Exam Trends + Topic Hub + concept tutor + Check & Improve (untouched here)
### Two parallel tracks: A = Design/UI build · B = Content generation

---

## ⚠️ FINAL IA SUPERSESSION — 2026-06-19 (owner-approved · binding)

The owner approved a **final Topic Hub IA** on 2026-06-19. The decisions below **SUPERSEDE** the
corresponding points in the original (2026-06-01) "Topic Hub" and "Formula sheet & Proofs" sections
further down this file. Where the two conflict, **this section wins**. The visual reference is
[topichub_ia_mockup_FINAL_2026-06-19.html](./topichub_ia_mockup_FINAL_2026-06-19.html). This update
supersedes the previously committed locked spec (#261).

- **Learn-first hierarchy (NEW).** The concept rows are the **HERO** of the page — headed
  "Learn the N concepts". The topic-level **action band RECEDES below them** into a quiet, dashed
  zone labelled "When you're ready — practise or test the whole topic". (Supersedes the original
  framing where the action affordances led.)
- **Notes = ONE unified view (NEW).** A single **Notes** toggle opens one note containing
  **formulae + proofs + mind-map as sections**. This **SUPERSEDES** the original split
  "Formula sheet" tab + "Proofs" tab — there are no longer separate tabs; it is one Notes view.
- **Examiner's tips = a clickable panel (NEW).** A clickable **"Examiner's tips"** affordance expands
  to show **3–4 per-topic examiner-POV tips** (diagram discipline · method-mark/formula ·
  common-trap · presentation/units). This **SUPERSEDES** the original single buried "examiner tip
  survives as ONE line". Tips are **CONTENT, authored per-topic** — real examiner guidance,
  anti-fabrication: never invented.
- **Concept-row action = "Teach me" (RENAME).** The per-concept tutor action is now **"Teach me"**
  (was **"Learn this"**). It opens the concept tutor (`concept_teach` mode — engine unchanged).
- **Concept-row "Practise" = auto-filtered (CLARIFY).** The per-concept **"Practise"** opens Quick
  Practice **auto-filtered to that concept + its mark band** — NOT the whole topic.
- **Topic-level action band = three actions (NEW).** "**Practise this topic**" (primary, solid green) ·
  "**Chapter test**" (secondary; timed/untimed) · "**Worksheet**" (secondary; was
  "Generate worksheet"). All three sit in the receded band.
- **Two-Practise differentiation (NEW).** Topic-level = full phrase **"Practise this topic"** +
  solid primary + lives in the band. Concept-level = short **"Practise"** + green-tint secondary +
  lives inside the concept card. The two must remain visually and verbally distinct.
- **Navy product sidebar is a CONSTANT (REAFFIRM).** Light nav text, active item highlighted,
  **Mistake Intel panel pinned at the bottom of the sidebar**. It must be respected, not reinvented.
  Mobile = navy bottom tab bar. **⚠️ MI is sidebar CHROME, not Topic Hub page content.** The MI panel
  is part of the **global product sidebar shown on every page** — it is NOT a Topic Hub page-body
  element. The original spec's rule "Mistake Intelligence stays on Home/Me, not here [the Topic Hub
  page body]" still HOLDS and is preserved by the final IA — there is **no supersession of the MI
  placement rule**. PR-D must keep MI in the sidebar and must NOT add it to the Topic Hub page body.
- **Category (B) split-with-parity stands.** Desktop / mobile may differ in **interaction**
  (interactive side-by-side on desktop / full-screen on mobile) but share the **SAME grammar/tokens,
  SAME data, single-sourced behavior, 360px-safe**.

---

## DESIGN DECISIONS (locked — do not re-open without owner)
> **NOTE (2026-06-19):** Several points in this original section are superseded by the
> **FINAL IA SUPERSESSION** block above. Read that block first; it wins on any conflict.

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
