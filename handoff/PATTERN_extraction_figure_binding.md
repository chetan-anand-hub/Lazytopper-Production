# PATTERN — extraction figure binding + step-mark display (the Z3 golden slice)

> The reference pattern every future worksheet-folder extraction copies. Landed
> with PR #297 (`feat(z3): bind source figures + fix step-mark pill`).

## 1. What "binding a figure" means
A question can carry one or more **raster source figures** (the actual exam
diagram / data table / scenario photo lifted from the source DOCX). Binding =
making that committed image render in the question body, keyed to the exact
question — never by a guess.

## 2. The pipeline (4 steps — reuse this, do not invent a parallel system)
1. **Stage the asset.** Put the WebP under
   `lazytopper/public/visuals/maths/<chapter-slug>/<fig-id>.webp` (served
   statically at `/<base>/visuals/...`). One file per figure; multi-figure
   questions get `...-2.webp`, `...-3.webp` in **source order**.
2. **Register it** in `src/data/visualConceptRegistry.ts` as a `VisualConcept`
   in the `MATHS_FIGURE_VISUALS` array, with:
   - `id` unique (`maths-<chapter-slug>-fig-<fig-id>`),
   - `filePath` = the public path,
   - `isInteractive: false` (it is a raster, not an HTML explainer),
   - `questionId` = the canonical question id (e.g. `"Z3-RN-003"`).
   These figure concepts are deliberately kept OUT of `MATHS_VISUALS/concepts`
   so they never pollute the keyword-heuristic explainer scoring.
3. **Set the row fields** in the question bank: on the matching row set
   `visualExplainerId: "<primary figure id>"` and `requiresDiagram: true`.
   (`visualExplainerId` already exists on `CanonicalQuestion` — never edit
   `predictionTypes.ts`.)
4. **Render.** `getFiguresForQuestion(questionId)` returns the bound figures in
   order; `QuestionVisualAid` (given `questionId`) renders them as `<img>` and
   takes priority over its synthetic SVG / AI fallback. A question with no bound
   figure returns `[]` → unchanged heuristic behavior (the 6,500+ untouched).

### Why questionId, not keyword resolution
The legacy `findVisualForConcept` / `visualExplainerId` path is **keyword-scored**
and built for interactive `.html` concept explainers. Source figures must be
**exact** — a wrong figure on a question is worse than none — so they resolve by
`questionId` equality only. `visualExplainerId` is still set on the row (it feeds
the tutor surfaces and documents the primary figure), but the practice render is
id-keyed.

### Gotcha — `VisualExplainer` is HTML-only
`components/VisualExplainer.tsx` `fetch()`es its `src` as **HTML** into an
iframe; hand it a `.webp` and it renders broken binary. Raster figures therefore
render as a plain `<img>` (in `QuestionVisualAid`), NOT through `VisualExplainer`.
(This was the original brief's incorrect premise — at trunk the raster `<img>`
pipeline did not exist and was built in #297.)

## 3. The `[N mark]` step convention + how the renderer consumes it
Authored `solutionSteps` lead with a CBSE step-marking tag:
`"[1 mark] ..."`, `"[2 marks] ..."`, `"[½ mark] ..."`, `"[1 1/2 marks] ..."`.
The runtime (`buildLocalSolution`) keeps the authored string as the step **body**
but assigns a *distributed* `step.marks` that can disagree with the tag (a
`[1 mark]` step could show a "½ mark" pill). The shared renderer
(`PracticeQuestionCard`) therefore:
- parses the **leading authored tag** for the pill value, and
- **strips the tag from the displayed body** so pill and text agree.
- **Backward-compatible:** a step with no leading tag falls back to the
  distributed `step.marks` and the body is shown unchanged.

Author tags so they SUM to the question's marks (Section A=1, B=2, C=3, D=5,
E=4) per the CBSE 2026-27 scheme.

## 4. The EMF limitation (the authored-SVG backlog)
Some source figures are **EMF** (vector, unrasterizable). There is no WebP to
bind. Do NOT fabricate or substitute a lookalike — leave `requiresDiagram`
honest and record the question id as a candidate for a future authored SVG.
(In Z3: `Z3-RN-001/002/005/006/007/008/009/010` were EMF-only — see
`[FU-Z3-EMF-SVG]`.)

## 5. Policy — bind if the source has a figure
Owner policy (2026-06): if the SOURCE has a figure for a question, **provide it**
— including decorative scenario photos/clipart (case-based questions show
diagrams; that is standard board pattern). Show the figure AND keep any text that
was also transcribed (e.g. the Flipkart carton table). Exclusions: true DOCX
**chrome** (logos, page headers, answer-key decoration, figures outside any
question's paragraph range) and EMF-unavailable figures. Always **eye-confirm**
each figure against its question before binding — a figure on the wrong question
is worse than none.
