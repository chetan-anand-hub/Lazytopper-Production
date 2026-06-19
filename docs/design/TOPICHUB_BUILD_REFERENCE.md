# Topic Hub Build Reference — BINDING SPEC INDEX

**Status:** LOCKED · Owner-approved · Committed 2026-06-18 · **Updated 2026-06-19 (final IA)**
**Purpose:** This is the **binding spec** for the Topic Hub / Learn-Flow rebuild (a soft-launch blocker, owner decision 2026-06-18). The rebuild must be built and reviewed against these in-repo files — not against a chat attachment. Build "done" is checked against this committed source.

---

## ⚠️ FINAL IA UPDATE — 2026-06-19

The owner approved a **final Topic Hub IA** on 2026-06-19, recorded in the **FINAL IA SUPERSESSION**
block at the top of [LazyTopper_Learn_Flow_Spec_LOCKED.md](./LazyTopper_Learn_Flow_Spec_LOCKED.md)
and visualised in **[topichub_ia_mockup_FINAL_2026-06-19.html](./topichub_ia_mockup_FINAL_2026-06-19.html)**.
It **supersedes the previously committed locked spec (#261)** on these points: learn-first hierarchy
(concept rows are the hero; topic action band recedes below into a quiet/dashed zone); **Notes = one
unified view** (formulae + proofs + mind-map as sections — replaces the split Formula-sheet/Proofs
tabs); **Examiner's tips = a clickable panel** of 3–4 per-topic tips (replaces the single buried line);
concept action **"Teach me"** (was "Learn this"); concept **"Practise"** auto-filtered to concept +
mark band; topic action band = **Practise this topic / Chapter test / Worksheet** ("Worksheet" was
"Generate worksheet"); navy product sidebar + Mistake Intel panel are a **constant**. When the final
mockup and the older `01_full_flow…` prototype disagree on the **Topic Hub**, the **final mockup wins**.

---

## The two binding sources (in this folder)

1. **[LazyTopper_Learn_Flow_Spec_LOCKED.md](./LazyTopper_Learn_Flow_Spec_LOCKED.md)** — the LOCKED written spec.
   Locked 2026-06-01, owner-approved. Covers Exam Trends (ranked priority list), Topic Hub
   (concept-spine layout), the concept tutor (`concept_teach`), Formula sheet / Proofs panels,
   design grammar, and the two parallel tracks (A = Design/UI build · B = Content generation).
   Design decisions in that file are locked — do not re-open without the owner.

2. **[01_full_flow_examtrends_to_topichub_to_tutor.html](./01_full_flow_examtrends_to_topichub_to_tutor.html)** —
   the LOCKED visual/interaction prototype. The canonical reference for the **structure, flow, and
   interaction model** of Exam Trends → Topic Hub → tutor + interactive.

   > **LOCKED PROTOTYPE — agent note:** Replicate the **STRUCTURE / FLOW / INTERACTION MODEL**,
   > **not** the placeholder SVGs (those are simplified stand-ins for the real interactive HTML
   > files in `public/visuals/`). Use the real `styles.css` design tokens on the real build.
   > The live tutor streams from `/api/mentor` in **`concept_teach`** mode — the prototype's tutor
   > text is scripted only to show the flow.

3. **[topichub_ia_mockup_FINAL_2026-06-19.html](./topichub_ia_mockup_FINAL_2026-06-19.html)** —
   the **FINAL Topic Hub IA** (owner-approved 2026-06-19). The canonical visual reference for the
   **Topic Hub page specifically** — learn-first hierarchy, receded action band, clickable
   Examiner's tips, unified Notes, "Teach me" + concept-level "Practise", and the constant navy
   sidebar with the Mistake Intel panel. **On the Topic Hub it supersedes the `01_full_flow…`
   prototype** wherever the two disagree. (The `01_full_flow…` prototype remains canonical for the
   Exam Trends → tutor flow.)

---

## Build classification & grammar (binding)

- **Category (B): split-with-parity.** Desktop = side-by-side interactive (the interactive opens
  in a separate window beside the chat). Mobile = full-screen toggle (not side-by-side).
- **Design grammar = `styles.css` tokens only.** Fraunces (display/headings) + Inter (body),
  brand green `hsl(152,55%,45%)`, **light mode**. Content pages (formula sheets, proofs, generated
  interactives) must consume these tokens — no reinvented colours or fonts.
- **Reuse the existing tutor engine** (`ConceptTeachDrawer` → `TeachFlow` → `/api/mentor`,
  `concept_teach` mode). Do not build a new chat; do not use `TutorDrawerV2` / `MentorPanel` (dead code).
- **Honest placeholders** for content not yet generated ("visual soon" / "proofs coming") —
  never fabricate a proof, formula, or insight.

---

## How to use this during the rebuild

- Treat the LOCKED spec as the source of truth for *what* ships and the prototype as the source of
  truth for *how it looks and behaves*.
- Any deviation from a locked decision requires explicit owner sign-off recorded in
  `handoff/DECISION_LOG.md`.
- This index is the prerequisite committed reference for the Topic Hub rebuild PRs (PR-B onward).

---

## Planned PR sequence (post-final-IA)

The rebuild proceeds as small, reviewable PRs, each verified against the final IA above:

- **PR-C — tutor flow.** Wire the concept-row **"Teach me"** action into the existing
  `concept_teach` tutor engine (per-concept context; engine unchanged).
- **PR-D — layout / action-band / tips / notes-consolidation.** Flip to the learn-first hierarchy
  (concept rows as hero), recede the topic-level action band into the quiet/dashed zone, add the
  clickable **Examiner's tips** panel, and consolidate Formula-sheet + Proofs into the single
  unified **Notes** view.
- **PR-E — chapter-test + worksheet wiring.** Wire the topic-level action band's **Chapter test**
  (timed/untimed) and **Worksheet** actions, plus the concept-level **Practise** auto-filter
  (concept + mark band).
- **PR-F — content fill.** Author the per-topic Examiner's tips (anti-fabrication: real examiner
  guidance) and the unified Notes content (formulae + proofs + mind-map sections).
- **PR-G — delete dead old-mobile.** Remove the superseded old mobile Topic Hub code once the new
  IA ships at all widths.
