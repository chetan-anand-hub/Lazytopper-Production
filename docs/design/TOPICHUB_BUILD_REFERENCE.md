# Topic Hub Build Reference — BINDING SPEC INDEX

**Status:** LOCKED · Owner-approved · Committed 2026-06-18
**Purpose:** This is the **binding spec** for the Topic Hub / Learn-Flow rebuild (a soft-launch blocker, owner decision 2026-06-18). The rebuild must be built and reviewed against these in-repo files — not against a chat attachment. Build "done" is checked against this committed source.

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
