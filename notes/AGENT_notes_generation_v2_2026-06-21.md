# AGENT BRIEF — Generate LazyTopper chapter notes from local NCERT PDFs (v2)
**Version:** v2 · **Updated:** 2026-06-20 · **Rev 2026-06-21:** prototype reference list folded to the canonical v2 filenames (see `LazyTopper_NoteProtos_INDEX_2026-06-21.md`) · (supersedes the 2026-06-09 brief) · **Author:** Claude (technical cofounder, chat) · **Executor:** Claude Code agent · **Approver:** Chetan (owner)
**Read alongside:** `AGENT_notes_generation_dispatch_2026-06-20.md` (the current dispatch instruction — the binding task wrapper) + `LazyTopper_Notes_Methodology_Handoff_2026-06-09.md` (the methodology). This v2 brief carries the detailed rules; the dispatch adds the v2 deltas below.

> ## ★ WHAT CHANGED IN v2 (read first)
> 1. **NCERT path is now known:** `C:\\Users\\Chetan\\OneDrive\\Desktop\\diff\\cbse-papers\\ncert books` (subfolders: mathematics, science, Exemplar). Read chapter PDFs from there.
> 2. **★ Verbatim definitions are now ALSO TUTOR INFRASTRUCTURE — not just student-facing.** The LazyTopper conversational tutor (in design) will be GROUNDED in these notes: it pulls the verbatim NCERT definition, leads with it, and tells the student "memorise this exact wording." A paraphrase here would make the TUTOR teach the wrong thing. So the verbatim-definition rule (§4) is now doubly load-bearing — treat it as the single most important correctness property of each note. If exact NCERT text can't be located, FLAG it; never present a paraphrase as the NCERT definition.
> 3. **Each verbatim definition must be clearly MARKED for memorisation** ("the exact wording CBSE wants — memorise this"), with the friendly 15-year-old explanation as a SEPARATE element after it.
> 4. **"Pitfalls" element = real "where students lose marks" annotations** (consistency with the worksheet answer keys): real common CBSE mistakes only (sign errors, missing units, unconcluded proofs, wrong exact-wording) — a real pitfall or none, NEVER an invented plausible-sounding one.
> 5. **Worktree isolation (mandatory):** run in your OWN worktree `C:/Projects/LT-worktrees/notes-gen -b feat/notes-generation` off the verified trunk tip; `git branch --show-current` check before any commit. This runs PARALLEL to the PR-E frontend track (different files, safe).
> 6. **Sequence:** STEP 1 = enrich the 5 finalized prototypes to the verbatim+page-cite+source-ledger standard FIRST (they become the reference exemplars), THEN STEP 2 = generate the remaining ~35, batched by subject for owner review.


You are generating Class 10 CBSE chapter notes (Science + Maths) in the **locked LazyTopper note format**, reading NCERT PDFs from a **local folder on the owner's laptop**. This brief carries every rule. Follow it exactly; when in doubt, STOP and ask the owner.

---

## 0. Operating model (firm — do not deviate)
- **chat = architect** (wrote this brief and the kit). **You = executor.** **Owner = sole approver.**
- You **STOP for owner review after each topic**. You **NEVER self-merge content**. Only docs/handoff `.md` PRs may be self-merged, per the standing rule. The owner merges all note/content PRs.
- **Static gates are necessary but NOT sufficient.** A note that "builds" or opens in a browser is *not* a note that is correct. Every topic gets an owner eyeball before sign-off. Your job is to make that review fast by attaching a complete source ledger (Section 8).
- If anything in this brief conflicts with something you find in the repo (e.g. `CLAUDE.md`, `syllabusGuard.ts`), the **repo wins for syllabus/commands**; flag the conflict to the owner.

---

## 1. What you have been handed
1. **`lazytopper_notes_kit.py`** — the **LOCKED renderer + figure toolkit + two worked examples** (Electricity, Chemical Reactions). Reuse its helpers (`head`, `js`, `mind_panel`, `fig`, `ex`, `zig`, the authored SVGs) and its figure toolkit. **Do not reinvent the CSS/JS/structure or restyle anything.** Run `python lazytopper_notes_kit.py` to regenerate the two examples into `out/` and confirm your environment works (incl. the "Save as PDF" button).
2. **Five canonical v2 prototypes (HTML)** — the `LazyTopper_NoteProto_*_v2_2026-06-21.html` set (Light, Electricity, Chemical Reactions, Life Processes, Quadratic Equations). The authoritative file list + old→new mapping is in **`LazyTopper_NoteProtos_INDEX_2026-06-21.md`**. These are the **visual gold standard** and show all five subject-adaptive third-tab variants. Match them. **Use ONLY the v2 files;** `*_FINAL` / `*_2026-06-09` are SUPERSEDED. `…_Physics_Light_v2…` and `…_Biology_LifeProcesses_v2…` carry the real NCERT figures — enrich those, not the old authored-SVG/paraphrase copies.
3. **This brief.**

---

## 2. Where the PDFs are
The owner will give you the **absolute path** to the local NCERT folder (e.g. `C:\Users\Chetan\...\NCERT\`). Read chapter PDFs from there.
- **Use PyMuPDF (`pymupdf` / `import fitz`) for everything** — text and figure rasterization. `pip install pymupdf`.
- **pdfplumber is RETIRED** — it cannot decode CBSE subset fonts and emits `(cid:NNNN)` garbage. Never use it.
- Run `ftfy.fix_text()` on any extracted string before using it.

---

## 3. The note anatomy — the universal seven-part spine (don't deviate)
Three tabs: **Note / Mindmap / [third tab]**. The **Note** panel contains, in this order:
1. **Eyebrow chips** — `Subject · Ch N`, `Class 10 · CBSE 2026-27`, weightage.
2. **`h1.title`** — the chapter title.
3. **"What the board actually asks"** banner — the real exam focus, in one or two sentences.
4. **The Big Idea** — one heading + one short paragraph framing the whole chapter.
5. **Definitions the board rewards** — NCERT-verbatim, as green-left-border cards.
6. **Must-know concepts (7)** — each with a "where tested" pill; some carry a figure.
7. **Worked examples** — the subject's natural unit (see §3a).
8. **Strategy** → **Pitfalls** → **Formula / fact strip**.

The **Mindmap** panel = the chapter tree (mm JSON, see the examples).

The **third tab is subject-adaptive** — same slot ("the rigorous formal core"), label fits the chapter:
| Subject | Third-tab label | What it holds |
|---|---|---|
| Maths | **Proof** | the chapter's formal proof(s) / derivation(s) |
| Physics | **Rules** or **Derivations** | ray-rules / sign-convention, OR the combination & law derivations |
| Chemistry | **Reactions** | the canonical balanced equations, grouped |
| Biology | **Diagrams** | the labelled NCERT figures students must draw |

### 3a. The worked-examples unit adapts by subject
- **Maths / Physics** → solved **numericals** (real NCERT Examples). Step 1 lists given quantities **with units**, then formula, then substitute.
- **Chemistry** → balancing / reaction-type **problems** (real NCERT Examples).
- **Biology** → **process walkthroughs** (digestion, double circulation, urine formation, …). For these, "mark-logic" lists the **keywords examiners reward**, not a fabricated numeric split.

---

## 4. CONTENT RULES — ANTI-FABRICATION IS ABSOLUTE
This is the line you do not cross. **Honest empty states always beat fake data.**
- **Definitions: NCERT-VERBATIM.** Quote the textbook's exact wording. Do not paraphrase a definition the board expects word-for-word. Cite the NCERT page.
- **Worked examples: REAL NCERT solved Examples, or real CBSE PYQ / Sample / CBE items ONLY.** Never invent a question, never write "CBSE-style" content, never fabricate data or a mark scheme. Mark-logic must trace to the bank's real `[N mark]` solution format or a real scheme — never an invented scale. Cite each (NCERT Example x.y / PYQ year).
- **"Where tested" pills** must reflect actual CBSE patterns, not a guess.
- **If you cannot source something, leave it out and flag it** in the report. Do not fill the gap with plausible-sounding content.
- **Maintain a per-note SOURCE LEDGER**: every definition, every example, every figure, each with its exact NCERT page / paper. This is the artifact the owner spot-checks — it is mandatory.

---

## 5. SYLLABUS GUARD — MANDATORY before each chapter
- **Re-read `scripts/src/syllabusGuard.ts` in the repo BEFORE generating any chapter.** Copy the exact banned keywords into your working notes. **Never rely on memory** — prior sessions shipped contaminated extractions by skipping this.
- Confirm the chapter **and every sub-topic** is in the **2026-27 rationalized** syllabus. Drop banned / formative-only content.
- **`topic_key` MUST match `topics.ts` exactly** (kebab-case).

**Known banned / out (verify against the file — this list may be stale):**
- **Maths OUT:** Euclid's Division Lemma/Algorithm, Polynomial Division Algorithm, Cross-Multiplication method, Complementary-Angle trigonometry, Frustum, all Constructions, Ogive / cumulative-frequency graph, terminating-decimals, cubic zeroes↔coefficients, coordinate-geometry triangle area, solid-shape conversions.
- **Science OUT / formative:** Periodic Classification of Elements; the **Evolution cluster** (Darwin, natural selection, fossils, speciation, **homologous ORGANS**, acquired traits, origin of life); **Sources of Energy** (whole chapter); **Management of Natural Resources**; **Motor / EMI / Generator** (Ch 12 — formative). So **Electricity = Ch 11 only.**
- **RETAINED (in):** Step-Deviation method; Our Environment; Reproduction (+ reproductive health); Heredity / Mendel; **homologous SERIES** (chemistry).
- **TRAPS:** homologous **SERIES** (IN, chemistry) ≠ homologous **ORGANS** (OUT, evolution). Sum/product of roots IS in, catalogued under Polynomials.

---

## 6. FIGURES — the three-bucket rule (use the toolkit)
- **Bucket A — ray diagrams, complex apparatus, biological figures → NCERT extraction.** Use `ncert_figure(pdf, page, box, tag, caption, legend, mode, refill, fmt)`.
  - **CONFIRM EVERY CROP BY EYE BEFORE EMBEDDING.** NCERT wraps body text tight against figures; a too-wide box bleeds paragraph text into the figure. *We hit this twice — on the heart and the nephron.* Workflow: `rasterize(pdf, page)` → **view the page image** → pick a box → crop → **view the crop** → adjust until labels are complete and no text bleeds → only then embed.
  - `mode="luminance"` for **line art** (mirror/lens/slab ray diagrams). `mode="saturation"` for **colour biological figures** (heart/canal/nephron) — it preserves coloured ink that a luminance cut would eat (e.g. the pale-blue heart chambers). Use `fmt="JPEG"` for colour figures to keep size sane.
  - `refill=(x0,y0,x1,y1)` re-strokes an **intentional light-grey fill** the cleanup removes (the glass-slab body, a shaded mirror back).
- **Bucket B — simple labelled schematics (sign convention, labelled axes) → authored SVG.** Themeable, colour-coded. Copy the pattern of `VI_SVG` / `SERIES_SVG` / `PARALLEL_SVG`.
- **Bucket C — data-plottable graphs → generated SVG** computed from values (correct by construction).

---

## 7. How to build one note (the repeatable loop)
1. Re-read `syllabusGuard.ts`; write down the in/out scope for this chapter.
2. Read the chapter PDF with pymupdf: pull **verbatim definitions**, the **solved Examples**, and the **figure inventory** (which figures exist, on which pages).
3. Author the content by **reusing the kit helpers** and **mimicking the ELEC/CHEM/LP construction** in the kit + prototypes. Keep prose tight and exam-focused.
4. Extract figures via the toolkit, **confirming each crop by eye**.
5. Build the HTML; write it to the output folder (Section 9).
6. Run the **self-validation checklist** (Section 8).
7. Write the **report + source ledger** to the diff folder and **STOP for owner review**. Do not merge.

---

## 8. Self-validation checklist (run before you report)
- [ ] `topic_key` exists in `topics.ts`, kebab-case, exact.
- [ ] Every **definition** is NCERT-verbatim with a page cite.
- [ ] Every **worked example** is a real NCERT/CBSE item, with step-by-step + mark-logic + source.
- [ ] **No banned-syllabus keyword** present (grep the note against the list you copied from `syllabusGuard.ts`).
- [ ] Exactly **7 concepts**, each with a "where tested" pill.
- [ ] Every **figure**: crop confirmed by eye, watermark gone, **no text bleed**, labels intact, correct bucket.
- [ ] **Third tab** matches the subject (Proof / Rules / Derivations / Reactions / Diagrams).
- [ ] Opens in a browser: tabs switch, KaTeX renders, mindmap draws, **"Save as PDF" prints only the active tab** with no chrome.
- [ ] **Source ledger complete.**

---

## 9. Output & reporting
- **First topic = a single chapter end-to-end, then STOP and report.** Do **not** batch until the owner has signed off on one. This de-risks the pipeline on one note before forty.
- Write notes to the output location the owner confirms (e.g. a `notes/` output dir or a dedicated branch). Standalone self-contained HTML for now (see Section 11).
- **Per-topic report to the diff folder**, containing: the note file path; the **source ledger**; the **syllabus-scope notes** (what you dropped and why); the **figure manifest** (bucket + crop box + clean mode per figure); and a list of anything you **could not source** (flagged, never faked).

---

## 10. Sequencing & topic list
- Batch **by subject**, order **by board weightage**.
- **Confirm the full `topic_key` list against `topics.ts`** before starting — it is the source of truth, not this list. Indicative Class 10 set (drop trimmed/formative ones):
  - **Maths:** real-numbers, polynomials, pair-of-linear-equations, quadratic-equations, arithmetic-progressions, triangles, coordinate-geometry, introduction-to-trigonometry, applications-of-trigonometry, circles, areas-related-to-circles, surface-areas-and-volumes, statistics, probability.
  - **Physics:** light-reflection-refraction, the-human-eye, electricity *(Ch 11 only)*.
  - **Chemistry:** chemical-reactions-and-equations, acids-bases-and-salts, metals-and-non-metals, carbon-and-its-compounds.
  - **Biology:** life-processes, control-and-coordination, how-organisms-reproduce, heredity, our-environment.
- Already prototyped (the **v2 canonical set** — Step 1 enriches these): light, electricity, chemical-reactions, life-processes, quadratic-equations → `LazyTopper_NoteProto_*_v2_2026-06-21.html` (see `LazyTopper_NoteProtos_INDEX_2026-06-21.md`).

---

## 11. Open decision for the owner — asset / integration strategy
The prototypes embed figures as **base64** with inline CSS/JS (fine for preview; ~300 KB for a figure-heavy note, heavy at 40 notes). **Default for now: generate standalone self-contained HTML like the prototypes.** The owner will decide production integration later — standalone HTML vs a shared in-app React `<Note>` component with figures as optimized static assets (WebP), one shared stylesheet, and bundled KaTeX. Until then, do not optimize prematurely; keep the spec/content as the single source of truth so it can re-render to either target.

---

## 12. Hard "do nots"
- Do not fabricate questions, data, definitions, or mark schemes.
- Do not skip the `syllabusGuard.ts` re-read.
- Do not embed a figure crop you have not viewed.
- Do not restyle, re-layout, or "improve" the locked grammar.
- Do not self-merge content. Do not proceed past one topic without owner sign-off.
- Do not use pdfplumber. Do not trust memory over the repo for syllabus/commands.
