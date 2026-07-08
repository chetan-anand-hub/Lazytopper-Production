# LazyTopper Note-Spec — Schema Contract v1.2
**Date:** 2026-06-21 (v1.1) · 2026-07-08 (v1.2) · **Status:** validated against the locked Light note · **Author:** Claude (cofounder)
**v1.2** adds per-step marks to worked examples — see **"v1.2 — per-step marks"** at the bottom. **v1.1** folds in eight refinements found by back-converting Light — see **"v1.1 — changes from the Light stress-test"**; those overrides are authoritative where they touch a field below. The worked reference spec is **`light-reflection-and-refraction.json`**.

## Why this exists
A **note-spec** is the structured single source of truth for one chapter note. It replaces hand-authored HTML. From one spec we render **two targets** and feed **one consumer**:
- **Preview target** — the kit (`lazytopper_notes_kit.py`) renders `spec → standalone HTML` for owner review (figures inlined as base64). *Exactly the review experience you have now.*
- **App target** — the React `<Note spec={…}/>` component (PR-F) renders it in the PWA (shared KaTeX/D3 bundle, figures as WebP assets, shared auth/progress/MI).
- **Tutor consumer** — the tutor reads `spec.definitions[].verbatim` (and examples, concepts) **directly as data** — no HTML scraping. This is the whole reason we chose spec-over-HTML.

**Authoring rule:** from Step 2 on, agents author **specs**, never HTML. The preview is generated, not written.

---

## Top-level shape
```jsonc
{
  "schema_version": "1.0",
  "meta": { … },              // identity + subject-adaptive switches
  "board_asks": "string",     // AUTHORED — "what the board actually asks" banner
  "big_idea": { … },          // AUTHORED
  "definitions": [ … ],       // NCERT-VERBATIM (sourced) + plain (authored)
  "concepts": [ … ],          // the 7 must-know (authored body, real "tested" pill)
  "examples": [ … ],          // REAL NCERT/CBSE only (sourced) — subject-adaptive
  "strategies": [ … ],        // AUTHORED
  "pitfalls": [ … ],          // REAL mistakes only — owner-verified, never invented
  "formula_strip": [ … ],     // sourced
  "mindmap": { … },
  "third_tab_content": { … }, // shape switches on meta.third_tab.kind
  "figures": { … },           // figure manifest (3-bucket rule)
  "source_ledger": [ … ]      // one row per sourced field — owner spot-check
}
```

### `meta` — identity + the two adaptivity switches
```jsonc
"meta": {
  "topic_key": "light-reflection-and-refraction",  // MUST match topics.ts EXACTLY
  "subject": "physics",                            // physics | chemistry | biology | maths
  "chapter_no": 9,
  "title": "Light – Reflection and Refraction",
  "weightage": "high",                             // high | medium | low
  "third_tab": { "label": "Rules", "kind": "rules" },
  "source_edition": "NCERT Reprint 2026-27, Class 10 Science, Ch 9"
}
```
Two discriminators drive all subject-adaptivity, so the renderer/component never hard-codes per-subject logic:
- **`third_tab.kind`** ∈ `proof | rules | derivations | reactions | diagrams` (Maths→proof, Physics→rules/derivations, Chemistry→reactions, Biology→diagrams).
- **`examples[].kind`** ∈ `numerical | reaction | process` (Maths/Physics→numerical, Chemistry→reaction, Biology→process).

### `definitions[]` — the tutor-critical unit
```jsonc
{
  "id": "def_pole",
  "term": "Pole",
  "verbatim": "The centre of the reflecting surface of a spherical mirror is a point called the pole.",
  "plain": "The dead-centre of the mirror surface — your measuring origin.",   // AUTHORED, SEPARATE
  "memorise": true,
  "source": { "ncert_page": 135, "edition": "2026-27", "chapter": 9 }           // REQUIRED
}
```
`verbatim` is character-exact NCERT (the tutor reads this). `plain` is the authored gloss the student also sees. **Keeping them separate is non-negotiable** — fusing them would make the tutor teach paraphrase.

### `concepts[]` — the 7 must-know
```jsonc
{ "id": "c1", "title": "…", "body": "AUTHORED scaffolding",
  "tested": "5-mark ray-diagram + nature-of-image questions",   // REAL CBSE pattern
  "figure_ref": "fig_mirror_97b",                                // optional → figures{}
  "source": { "ncert_page": 138, "edition": "2026-27" } }        // null if purely authored
```

### `examples[]` — real only, subject-adaptive
```jsonc
{
  "id": "ex_92", "shape": "Concave mirror — image distance & nature", "kind": "numerical",
  "problem_verbatim": "EXACT NCERT problem text.",
  "solution_steps": [
    { "text": "Given u = −25 cm, f = −15 cm.", "math": "$\\frac1v+\\frac1u=\\frac1f$", "mark": 1 },
    { "text": "Solve for v.", "math": "$v=-37.5\\,\\text{cm}$", "mark": 1 }
  ],
  "mark_logic": "Where marks sit: formula (1) · signed substitution (1) · answer+nature (1).",  // AUTHORED
  "source": { "ncert_example": "9.2", "ncert_page": 144, "edition": "2026-27" }   // REQUIRED
}
```
For `kind:"reaction"` a step may carry `equation` instead of `math`; for `kind:"process"` steps are stages of a process walkthrough. Same shape, different reading.

### `formula_strip[]` / `pitfalls[]` / `strategies[]`
```jsonc
"formula_strip": [ { "label": "Mirror formula", "math": "$\\frac1v+\\frac1u=\\frac1f$",
                     "source": { "ncert_page": 143, "edition": "2026-27" } } ],
"pitfalls":   [ { "text": "Sign slip: u is negative for a real object.", "owner_verified": true } ],
"strategies": [ { "text": "Draw the ray diagram before plugging into the formula." } ]   // AUTHORED
```
`pitfalls` can't be machine-verified as "real" — they carry `owner_verified` and stay an explicit owner-review item. Honest omission beats a fabricated pitfall.

### `third_tab_content` — shape switches on `kind`
```jsonc
// kind:"rules"  (Physics conventions, e.g. Light)
{ "kind": "rules", "intro": "AUTHORED framing.", "figure_ref": "fig_signconv_99",
  "groups": [ { "heading": "Distances (along principal axis)",
                "rows": [ { "sign": "•", "text": "Measured from the pole / optical centre." },
                          { "sign": "−", "text": "Against incident light → negative." } ] } ] }
// kind:"proof"        → { "steps": [ { "claim": "...", "justification": "...", "math": "$...$" } ] }
// kind:"derivations"  → { "derivations": [ { "name": "...", "steps": [...], "source": {…} } ] }
// kind:"reactions"    → { "reactions": [ { "name": "...", "equation": "$...$", "conditions": "...", "source": {…} } ] }
// kind:"diagrams"     → { "diagrams": [ "fig_nephron", "fig_neuron" ] }   // refs into figures{}
```
**Owner rule already in force:** when a convention/rule has a real NCERT figure, the tab carries `figure_ref` to it (e.g. Light's `fig_signconv_99`).

### `figures{}` — the manifest (encodes the 3-bucket rule + how to reproduce + final asset)
```jsonc
"fig_mirror_97b": {
  "bucket": "ncert",                       // ncert | authored_svg | generated
  "tag": "NCERT Fig 9.7(b)",
  "caption": "Concave mirror · object beyond C → real, inverted, diminished.",
  "legend": "Two standard rays meet between C and F.",          // AUTHORED read-the-figure line
  "source": { "pdf": "jesc109", "edition": "2026-27", "ncert_fig": "9.7(b)",
              "page_pdf": 8, "crop": [780,460,1680,1160], "clean": "luminance@193", "refill": null },
  "asset": "light/fig_mirror_97b.webp"     // App target uses this; preview inlines base64
}
// bucket:"authored_svg" → { "svg_ref": "VI_SVG", "tag", "caption" }            (kit-authored SVG)
// bucket:"generated"    → { "generator": "parabola", "params": {…}, "tag", "caption" }  (data graph)
```
The `source` block makes every NCERT figure **reproducible** (rerun crop+clean) and **auditable**. Bucket A = NCERT extraction, B = authored SVG, C = generated graph — unchanged from the locked rule.

### `source_ledger[]`
One row per sourced field (verbatim, example, figure, formula). Derivable, but stored explicitly so you can spot-check provenance at a glance and the validator can count-match it.

---

## The validator — what makes parallelism safe (hard gate)
A spec is **invalid** (REJECT — fails the `SubagentStop` hook) if any of these hold:
1. A `definitions[].verbatim`, `examples[]`, `figure(bucket:ncert)`, or `formula_strip[]` entry has a **missing/empty `source`**.
2. `meta.topic_key` is **not present in `topics.ts`**.
3. Any **banned-syllabus keyword** (read live from `syllabusGuard.ts`, never memory) appears anywhere in the spec.
4. `third_tab_content.kind` ≠ `meta.third_tab.kind`, or its shape doesn't match that kind.
5. `examples[].kind` is not in the subject's allowed set.
6. **Mojibake / cid artifacts** present in any text field.
7. `source_ledger` row-count ≠ number of sourced fields.
8. A `figure(bucket:authored_svg)` references a non-existent `svg_ref`, or `bucket:generated` lacks `generator`+`params`.
9. A required top-level / `meta` key is **missing**, or a used `figure_ref` does **not resolve** into `figures{}`.
10. **(v1.2)** An example carries per-step marks but they do **not sum to `marks_total`** — or `marks_total` and per-step marks are not both present, or a step `mark` is not a positive multiple of 0.5. Fires only when the example carries mark data (backward-compatible with pre-v1.2 specs).

What the validator **cannot** check (stays owner-review): whether a `pitfall` is genuinely a real CBSE mistake, and whether authored pedagogy is sound. That's the irreducible human-review core — small, and now isolated.

---

## Proposed repo layout
```
notes/
  specs/      <topic_key>.json            # the source of truth (authored)
  assets/     <topic_key>/<fig_id>.webp   # App-target figure assets
  preview/    <topic_key>.html            # kit-generated, for owner review (gitignored or kept)
  lazytopper_notes_kit.py                 # evolves to: render_note(spec) -> preview HTML
  validate_spec.py                        # the hard gate above (also the SubagentStop hook)
```
React `<Note>` (PR-F) imports `specs/*.json` + `assets/*`; the tutor imports `specs/*.json`.

---

## What I need from you
1. **Sign off on the shape** (especially the two discriminators and the source-required gate).
2. Confirm the **repo layout** (`notes/specs` + `notes/assets`) is fine.
Then: I write `validate_spec.py` + evolve the kit to `render_note(spec)`, back-convert Light to `light-…​.json` as the worked reference, and PR-F builds `<Note>` against it. The Step-2 agents author specs against this contract, validator-gated — which is what makes the 35-note fan-out safe to parallelize.

---

## v1.1 — changes from the Light stress-test
Back-converting the locked Light note into `light-reflection-and-refraction.json` (14 definitions, 5 concepts, 2 examples, 3 NCERT figures) validated the shape and surfaced eight refinements. The schema held — no structural rethink, only these field-level changes (authoritative over v1.0 above):

1. **`definitions[]` has two tiers.** Add **`tier`** ∈ `headline | key-term`. *headline* = full card (term + verbatim + `plain` gloss + source). *key-term* = compact verbatim-only entry (the 8-term cluster: pole, centre of curvature, …). So **`plain` is OPTIONAL** (null for key-terms). Light = 6 headline + 8 key-terms = 14 total.

2. **`examples[].solution_steps` is richer.** Each step = `{ "lead": "Mirror formula.", "text": "…$math$…", "concept_tag": "substitute with signs", "mark": null }`. `lead` (bold lead-in) and `concept_tag` (links the step to a concept) are new; **per-step `mark` is OPTIONAL**.

3. **Marks live in `examples[].mark_logic`, not per step.** It's a single AUTHORED string (e.g. *"1 for signed data · 1 for formula + solving v · 1 for nature + size"*). Keep it; don't force marks onto steps.

4. **`third_tab_content` for `kind:"rules"` is an array of sub-blocks, not a flat list.** Shape:
   `{ "kind":"rules", "intro":"…", "figure_ref":"fig_99", "blocks":[ {heading, type:"sign-table", rows:[{sign,text}]}, {heading, type:"rule-list", items:[…]} ] }`.
   Light's Rules tab is exactly this: two sign-tables (distances / what-it-means) + one ray-construction rule-list, under one shared figure. The other `kind`s (proof/derivations/reactions/diagrams) follow the same "array of typed sub-blocks" pattern.

5. **`strategies[]` carry a `cue`.** `{ "cue":"Numerical?", "text":"Write u,v,f with signs first…" }`. Add optional `cue`.

6. **`big_idea` has a `tagline`.** `{ "tagline":"Light bends and bounces — predictably.", "body":"…" }`. Add `tagline`.

7. **`formula_strip[]` source is OPTIONAL.** The strip is one-screen recall of formulas already sourced in definitions/examples; items are `{label, math}` with no per-item cite. (Validator rule #1 therefore excludes `formula_strip` from the source-required set — definitions, examples, and NCERT figures still require source.)

8. **`concepts[]` is variable-length and `tested` may be authored-later.** Not a fixed 7 (Light has 5). The "where tested" pill is sometimes added in authoring rather than lifted from source — `tested` may be filled by the author, and must reflect a REAL CBSE pattern.

**Two carry-over build steps confirmed by the back-conversion (not schema, but required):**
- **Figures:** the spec stores `source` (crop/clean params) + `asset` path — never base64. A one-time build extracts the 3 base64 images currently in the Light HTML → `notes/assets/light/*.webp`.
- **Mindmap:** Light's tree currently lives in the note's D3 JS; the kit's back-conversion lifts it into `spec.mindmap = {root, branches:[{label, children:[…]}]}`. Marked `_TODO` in the Light spec until the kit does this.

**Verdict:** schema is sound. Light fits cleanly with these eight field-level edits. Safe to (a) write `validate_spec.py` to these rules, (b) evolve the kit to `render_note(spec)` and finish Light's figure/mindmap lift, then (c) build `<Note>` (PR-F) against `light-reflection-and-refraction.json`.

---

## v1.2 — per-step marks
The notes-v1.2 template pass adds **where each mark is earned** to worked examples. This **reverses v1.1 point 3** ("marks live in `mark_logic`, not per step"): marks now live BOTH per-step (the detail) and in `mark_logic` (the authored overview). Two field changes, both additive/backward-compatible:

1. **`examples[].marks_total`** (number) — the example's total CBSE marks. Present whenever the solution steps carry per-step marks.
2. **`examples[].solution_steps[].mark`** (number) — the marks that step earns in the CBSE step-marking scheme. **Half-marks are real** (stating a formula alone earns 0.5), so `0.5` is valid; a step may carry `2` where it bundles two separately-credited elements. **Steps that earn no independent mark simply OMIT `mark`** (e.g. a pure-method line, or a process stage not separately credited in that mark scheme) — they contribute 0 to the sum and render without a chip.

**Anti-fabrication:** the per-step split must trace to the real CBSE scheme captured in that example's `mark_logic` string — don't invent marks; the per-step marks must sum to `marks_total`.

**Validator (Rule 10):** fires only when an example carries mark data. When it does, `marks_total` and at least one step `mark` must both be present, every step `mark` must be a positive multiple of 0.5, and the per-step marks (absent = 0) must sum to `marks_total`. Examples with no mark data are untouched.

**Render (`<Note>`):** each worked example shows its total on the header (e.g. "3 marks"), and each scoring step shows a small mark chip (e.g. "½ mark", "1 mark", "2 marks") so a student sees where each mark lands; the chips visibly sum to the header total. `mark_logic` still renders as the authored overview line below the steps.

**Also in the v1.2 UI pass** (component-only, not schema): the Mindmap tab is a responsive, collapsible vertical tree; `<Note>` opens as a popup (`NoteModal`) over the Topic Hub rather than inline; and cited NCERT page refs ("p.144") are clickable, opening an `NcertPageModal` that embeds the page-aligned chapter PDF from Firebase Storage with an honest "coming soon" fallback until the PDFs are hosted ([FU-NOTES-NCERT-PDF-HOSTING]).
