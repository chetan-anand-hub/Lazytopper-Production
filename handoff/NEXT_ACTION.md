# LazyTopper — Next Action

Last updated: 2026-05-23 (post-PR #114)
Live base SHA: d0b34932ce30805e6e3b7a492ffdb3d3538d24d4

## Immediate next action: PRE-P1 — Symbol restoration in P0.5 case-based files

Branch: `content/fix-p05-symbol-restoration`
Mode: Low (~30 min)
Scope: data-only — affects three files registered in PR #114.

### What needs to be fixed

Mojibake in the following files (UTF-8 multibyte sequences inherited from the
diff/ source packs, rendered as Latin-1 garbage in the repo):

  lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts        (6 questions)
  lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts    (5 questions)
  lazytopper/src/data/questionBanks/class10/maths/circles.proof.ts          (10 questions)

Affected fields: `questionText`, `solutionSteps`, `answer`, `finalAnswer`, `explanation`, `strategyHint`.

### Symbols observed (non-exhaustive — full list to be derived during fix)

| Garbled | Should be | Where it appears |
|---|---|---|
| `â–³` | `△` | Triangle notation in geometry/trig questions |
| `âˆ¥` | `∥` | "Parallel to" in BPT/similar-triangle questions |
| `âˆ ` | `∠` | Angle notation in proofs |
| `âˆš` | `√` | Square root in Pythagoras/quadratic answers |
| `Â²` | `²` | Squared exponent |
| `Â³` | `³` | Cubed exponent |
| `Î©` | `Ω` | Ohms in electricity case sets |
| `Â·` | `·` | Middle dot (e.g. Ω·m) |
| `â‚‚` `â‚ƒ` `â‚„` `â‚†` `â‚â‚‚` | `₂` `₃` `₄` `₆` `₁₂` | Chemistry/physics subscripts (CO₂, H₂O, C₆H₁₂O₆, S₁₂) |
| `âº` `â»` | `⁺` `⁻` | Charge superscripts (K⁺, 10⁻⁸) |
| `â†’` | `→` | Reaction arrow / "then" |
| `âˆ’` | `−` | Minus sign (distinct from `-`) |
| `Ã—` | `×` | Multiplication sign |
| `Â°` | `°` | Degree symbol |
| `â‰…` | `≅` | Congruence (in proofs) |
| `â‰ˆ` | `≈` | Approximately equal |
| `â‰¥` | `≥` | Greater-than-or-equal |
| `â‚¹` | `₹` | Rupee sign (AP savings case set) |
| `âœ“` | `✓` | Tick mark (verification steps) |
| `â€"` | `—` | Em dash |
| `â€™` | `'` | Right single quote / apostrophe |

### Fix mechanism (recommended)

1. Read each file with `[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)`.
2. Apply a fixed table of byte-level replacements (do NOT regenerate text from a different
   encoding — the diff/ source PDFs are not re-extracted in this PR).
3. Write back with UTF-8 (no BOM).
4. Spot-check 2–3 questions per file by reading the rendered Unicode in a UTF-8 terminal.
5. Run all 6 validations (V1–V6 from the P0.5 prompt). Expect all PASS — this fix is
   text-content-only, not structural.
6. Commit message: `content: PRE-P1 symbol restoration in P0.5 case-based + circles proof files`

### Why PRE-P1 (not part of P0.5)

P0.5 was scoped as registration-only and the mojibake was inherited from the diff/ sources.
Fixing it required either restructuring those sources (out of P0.5 scope) or a follow-up
data-only cleanup. The follow-up is the right shape: small, isolated, validated, and gates
P1-M (which will introduce more symbol-heavy content from CBSE Practise Papers).

### Hard rules

- Do NOT change any field other than the text fields listed above.
- Do NOT change ids, marks, sections, formats, topicKeys, isCompetencyBased.
- Do NOT touch any file other than the three named above.
- Do NOT modify the diff/ originals (preserve for traceability).
- Do NOT delete the merge script `diff/_p05_merge_caseSets.mjs`.

---

## After PRE-P1: P1-M — CBSE Practise Papers Maths Standard (High mode, ~1 session)

Source: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\CBSE Practise Papers\Maths Std.pdf`
Pages: 234 | Extractable: YES (pdfplumber) | MS: bundled inline
Expected yield: ~400–550 questions across all 13 Maths topics, all 5 sections
Branch: `content/practise-papers-maths`
ID prefix: `PP-M-{TOPIC_SHORT}-{SEQ}`
File naming: `maths/{topicSlug}.practise.ts` (one file per topic)

Symbol restoration must already be merged (PRE-P1) before this starts — the same mojibake
problem will recur in any text-heavy PDF extraction, and the PRE-P1 byte-replacement table
is the canonical fix recipe.

Additional symbol restoration required during P1-M extraction:
  θ missing where sin/cos/tan present → restore
  ° missing where angle of elevation/depression present → restore
  √ missing where square root mentioned → restore

## Then: P1-S — CBSE Practise Papers Science (High mode, ~1 session)

Source: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\CBSE Practise Papers\Science.pdf`
Pages: 321 | Extractable: YES | MS: bundled inline
Expected yield: ~400–550 questions across all 12 Science topics, all 5 sections
Branch: `content/practise-papers-science`
ID prefix: `PP-S-{TOPIC_SHORT}-{SEQ}`
File naming: `science/{topicSlug}.practise.ts` (one file per topic)

## Full extraction queue (reference)

P0     ✅ COMPLETE — PR #112 (62 Qs, AR+proof packs)
P0.5   ✅ COMPLETE — PR #114 (21 Qs, case-based Sec E merged + circles proof Sec C/D)
PRE-P1 ⏳ NEXT     — Symbol restoration in P0.5 files (~30 min, data-only)
P1-M   ⏳ PENDING  — Practise Papers Maths (~400–550 Qs)
P1-S   ⏳ PENDING  — Practise Papers Science (~400–550 Qs)
P2     ⏳ PENDING  — Additional PQ 2023-24 + SQP (~344 Qs)
P3     ⏳ PENDING  — Meridian worksheets + Maths QB READY (~475 Qs)
P4-M   ⏳ PENDING  — cbjemaco + cbjemacq Maths (~750–1,050 Qs)
P4b-S  ⏳ PENDING  — Science Chapter-wise cbjescco+cbjesccq (~1,422 Qs)
P5-M   ⏳ PENDING  — PYQ papers Maths 2022-2025 (~400 Qs) [requires K2H-8f fix]
P5-S   ⏳ PENDING  — PYQ papers Science 2022-2025 (~400 Qs)
P6     ⏳ PENDING  — Sample papers + Preboard PDFs (~200 Qs)
P7     ⏳ PENDING  — Pack retirement (trigger: authentic count ≥ 6,000)
P8     🔒 DEFERRED — OCR-gated sources (~1,100 Qs, needs OCR tool)

Pack retirement threshold: 6,000 authentic questions
Current authentic total: 1,630 (post-PR #114)
Target authentic total (P0–P6, no OCR): ~5,941 net after 15% dedup

## Engine fix required before P5

K2H-8f: practiceSetGenerator.ts does not bias pool toward pyqYear-tagged questions.
PYQ filter returns 0 results when pyqOnly===true.
Branch: `fix/pyq-engine-bias`
Mode: Medium
Do alongside or before P5-M PYQ extraction.

## Operating rules for all content sessions

- SHA verification mandatory before every agent prompt
- All 6 validations before every content commit
- Owner reviews extraction report before any commit
- Every content PR followed immediately by a docs-only handoff PR
- Anti-fabrication: every question from source PDF only
- topicKey must match topics.ts exactly — verify before every extraction
- No Maths Basic papers (only Standard syllabus)
- Pack files must NOT be deleted until authentic count ≥ 6,000
