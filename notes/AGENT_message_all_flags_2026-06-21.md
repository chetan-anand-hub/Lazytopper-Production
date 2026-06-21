# AGENT MESSAGE — Notes track: rulings on all open flags + handoff instruction
**Date:** 2026-06-21 · **From:** Claude (cofounder, chat) · **To:** the notes-track agent (current + the fresh agent that succeeds it) · **Owner:** Chetan

Light exemplar **reviewed and approved** — figures preserved, static button intact, enrichment correct. Here are the rulings on every flag you raised, plus what to do given your context budget. Read §0 first.

---

## 0. ★ CONTEXT / HANDOFF — do this before anything else
You're at ~22% context. That is **not enough** to close this task — remaining = the Light cite reconciliation + enriching 4 more prototypes + generating ~35 Step-2 notes. **Do not start new enrichments at 22%** — running out mid-note loses work and context.

**Instead, spend your remaining context on a clean handoff, then stop:**
1. Apply the small, finishing Light items if they fit comfortably (see §1, §5); if not, leave them for the fresh agent — they're documented here.
2. Write a thorough **`HANDOFF_notes_track_2026-06-21.md`**: current branch/SHA, the canonical file set, what's DONE (Light exemplar), what's NEXT (4 prototypes → Step 2), and a pointer to this message + the cite-map as the binding rulings.
3. Commit current state in your worktree. **Do not self-merge content.**
4. **Stop.** A fresh agent (full context, same worktree) continues from your handoff + this message.

The finalized Light note (with the sign-convention figure + fixed stamp) is being placed on your disk by the owner — **use it as the gold-standard exemplar**; don't rebuild it.

---

## 1. Rules tab needs the NCERT sign-convention DIAGRAM (not just text) — DONE for Light
Writing the sign-convention rules as text isn't enough; the Rules tab must **show** the diagram. I extracted **NCERT Fig 9.9 "The New Cartesian Sign Convention for spherical mirrors"** from the 2026-27 PDF (watermark-cleaned, mirror arc preserved, all +/− labels intact) and added it to the finalized Light note's Rules tab, above the rule cards.

**General rule going forward:** when a chapter's "rigorous core" tab states a convention or rule that NCERT illustrates with a figure, **show that NCERT figure**, don't just describe it. This is an owner override of the "authored SVG" bucket — for sign conventions and other key NCERT diagrams, prefer the **real NCERT figure** (bucket A extraction via the kit) because students must recognise the exact textbook diagram.

## 2. Edition / official source — use 2026-27, sourced locally
Wrong page/example/figure numbers cause real student confusion, so this matters. Ruling:
- **The official source is NCERT's own site:** `ncert.nic.in` → Textbooks → PDF (I–XII) → Class 10 → Science. Chapter PDFs follow `jesc1XX.pdf`.
- **Download and save the 2026-27 reprints into the cbse folder — do NOT rely on a live fetch.** Reasons: reproducibility (a fixed local file vs. a changing live page), your web access is uncertain, and a fixed canonical source prevents drift. The owner is doing this.
- **Re-cite every note against the 2026-27 reprint**, and **stamp the source edition in each ledger** ("NCERT Reprint 2026-27, Class 10 Science, Ch N").
- **Map files by CONTENT, never by filename** (old vs. new editions reuse `jesc1XX` names for different chapters — that's what caused the Light = Ch 9 vs Ch 10 confusion).

## 3. Carbon PDF — official link (verified)
`https://ncert.nic.in/textbook/pdf/jesc104.pdf` — **verified** as Carbon and its Compounds, Ch 4 (2026-27). This is the genuinely-missing in-syllabus chapter; the owner is adding it to the folder.

## 4. Magnetic Effects of Electric Current — GENERATE, trimmed (owner approved)
Generate it, **trimmed to the retained basics**: magnetic field, magnetic field lines, field due to a current-carrying conductor/solenoid, right-hand rule, and force on a current-carrying conductor. **Exclude Motor / EMI / Generator** (formative — out). Mirrors "Electricity = Ch 11 only." Re-read `syllabusGuard.ts` for the exact retained sub-topics before generating.

## 5. Light cite-map — apply it (closes the edition flag for Light)
Use **`LazyTopper_Light_CiteMap_2026-06-21.md`**: `Ch 10`→`Ch 9`, `Example 10.x`→`Example 9.x`, and the per-definition page remap (e.g. pole p.161→p.135, Example 9.2 p.144, Example 9.4 p.156). Two rows are flagged ⚠ to spot-verify. **Cleanest path:** put the 2026-27 `jesc109.pdf` on disk and re-cite Light directly from it, using the map as the answer key. The figures already carry correct Ch-9 labels.

## 6. Stamp hygiene — flip enriched files to "DONE" (owner agreed)
An enriched file's first-line identity comment must reflect that it IS enriched — not the inherited "enrichment PENDING" from the v2 base. I fixed Light's stamp. **Do the same on every file you enrich:** change "enrichment PENDING" → "Step-1 enrichment DONE (verbatim + page-cite + source-ledger + authored-marking)". Keep the version line truthful so nobody re-enriches a done file.

## 7. Three older drafts — archive them
`light_note_prototype.html` and `quadratics_note_prototype*.html` are superseded drafts that weren't in the index's superseded table (correctly, you left them). Archive them to `_superseded_2026-06-21/` and they'll be added to the index's superseded table.

---

## Sequencing reminder (for the fresh agent)
- Apply §5 (+ verify §1 figure present) to finish **Light** = the reference exemplar.
- Then enrich the other four v2 prototypes (**Electricity, Chemical Reactions, Life Processes, Quadratics**) to the same standard — **one at a time, stop for owner review per note**, enriching the **figure-bearing v2 bases** (Life Processes carries 3 real NCERT figures; don't drop them).
- Then **Step 2** (~35 notes) via the kit — static button is already handled by the kit's `add_pdf_button()` helper; pass every new note through it.
- Quality (verbatim accuracy, correct edition cites, eye-confirmed figures) **over speed**. Real pitfalls only. Honest empty/flag beats fabrication. Re-read `syllabusGuard.ts` per chapter.
