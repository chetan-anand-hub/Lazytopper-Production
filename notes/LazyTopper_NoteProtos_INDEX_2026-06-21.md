# LazyTopper Note Prototypes — INDEX & VERSION MANIFEST
**Stamp:** 2026-06-21 · **Version of this set:** v2 · **Author:** Claude (notes track)
**Purpose:** the single source of truth for which note-prototype file is canonical. Hand the agent the **v2 files only**; everything else is superseded.

---

## Naming convention (so nothing is ambiguous again)
```
LazyTopper_NoteProto_<Subject>_<Topic>_v<N>_<YYYY-MM-DD>.html
```
- **Subject / Topic** — self-describing, no guessing from a filename.
- **v\<N\>** — version. v1 = the 2026-06-09 set; **v2 = the current canonical set** (figures + Download-PDF button).
- **\<date\>** — the date this version was finalized (2026-06-21).
- Each file also carries a **version comment as its first line** (`<!-- LazyTopper Note Prototype | … | v2 | 2026-06-21 | … -->`), so its identity survives any future rename or copy.

---

## The canonical set (v2 · 2026-06-21) — USE THESE
| File | Subject | Topic | Figures | Third tab |
|---|---|---|---|---|
| `LazyTopper_NoteProto_Physics_Light_v2_2026-06-21.html` | Physics | Light | **NCERT** Fig 9.7(b) mirror + 9.10 slab | Rules |
| `LazyTopper_NoteProto_Physics_Electricity_v2_2026-06-21.html` | Physics | Electricity (Ch 11 only) | authored SVG (circuits, V–I) | Derivations |
| `LazyTopper_NoteProto_Chemistry_ChemicalReactions_v2_2026-06-21.html` | Chemistry | Chemical Reactions | none (KaTeX) | Reactions |
| `LazyTopper_NoteProto_Biology_LifeProcesses_v2_2026-06-21.html` | Biology | Life Processes | **NCERT** Fig 5.6 canal + 5.10 heart + 5.14 nephron | Diagrams |
| `LazyTopper_NoteProto_Maths_QuadraticEquations_v2_2026-06-21.html` | Maths | Quadratic Equations | generated SVG (parabolas) | Proof |

**Every v2 file has:** the locked 7-part spine + subject-adaptive third tab, and a **static "↓ Download PDF" button** on every tab (prints only the active tab).

---

## Superseded → canonical (delete or archive the left column)
| Old name (do NOT hand to the agent) | Why superseded | Canonical replacement |
|---|---|---|
| `light_note_FINAL.html` | authored-SVG mirror, **no** NCERT figures, no print button | `…Physics_Light_v2…` |
| `light_note_2026-06-09.html` | pre-rename of the same | `…Physics_Light_v2…` |
| `electricity_note_2026-06-09.html` | pre-rename | `…Physics_Electricity_v2…` |
| `chemical_reactions_note_2026-06-09.html` | pre-rename | `…Chemistry_ChemicalReactions_v2…` |
| `life_processes_note_2026-06-09.html` | pre-rename | `…Biology_LifeProcesses_v2…` |
| `life_processes_note_prototype.html` | early draft | `…Biology_LifeProcesses_v2…` |
| `quadratics_note_FINAL.html` | had no Download-PDF button | `…Maths_QuadraticEquations_v2…` |
| `carbon_note_prototype.html` | early Carbon draft (not in this set) | (regenerate in Step 2) |

---

## ⚠️ State of these prototypes (read before enriching)
These are the canonical **structure + figure + print** bases. They are **NOT content-final** — they still carry the gap the methodology flagged (§A.2/§E.2): **faithful paraphrases, not verbatim NCERT, and no source ledger.** Step 1 of the notes track enriches each of these to the verbatim + page-cite + source-ledger + authored-marking standard (the Light enrichment exemplar set that bar). So: **enrich these v2 bases — do not treat them as finished, and do not enrich the old superseded files.**

## Changelog
- **v2 (2026-06-21):** real NCERT figures swapped into Light (Fig 9.7b, 9.10); static Download-PDF button added to all five (was JS-injected/missing); files renamed + version-stamped; this index created.
- **v1 (2026-06-09):** original structure/visual prototypes (paraphrase definitions, no ledger).
