# Tutor Visual Catalogue — Handoff / Coordination (Fable curation lane ↔ Opus tutor build)

**Purpose:** coordinate the exact `conceptVisualCatalogue` output shape between the
Fable concept→figure curation lane (produces the DATA) and the Opus tutor build
(Stage 3 CONSUMES the data). Fable curates content immediately; the FILE FORMAT is
not frozen until Opus confirms its Stage-3 pre-flight shape here.

Task spec: `AGENT_FABLE_concept_figure_curation_2026-07-13.md`.

---

## Status (Fable lane)
- Base SHA: `0c5f75d` on `base/approved-thru-437`.
- Curation is READ-ONLY: it references existing assets only, authors no figures/code,
  edits no registry/note-spec/bank file. Deliverable = ONE new data file
  (`conceptFigureCatalogue.curated.ts`) + `GAPS.md`, both under a curation folder,
  NOT wired into the app until owner spot-check + Opus Stage-3 consumption.

## Concept vocabulary decided (source of the concept rows)
The concept rows a student sees = the **`boardEssentials`** array in
`lazytopper/src/lib/desktop/topicHubContent.ts` (the SEEDED map). Each row is a
`{ name, oneLineUse, marks }`. For topics NOT in the SEEDED map (sample-preview
fallback), the fallback vocabulary is `coreIdeas` in
`lazytopper/src/data/topicHubContent.ts` for that `topicKey` — flagged per row.

`conceptKey` is derived from the boardEssentials row `name` (slugified) and is NOT a
canonical topic slug — only `topicKey` goes through `resolveCanonicalSlug`
(`data/syllabus/canonicalTopicSlug`). A concept-level canonical resolver does not
exist in the repo; if Opus needs one for lookup, flag it here.

## Three asset sources (all READ-ONLY)
1. Notes figures — `notes/assets/<chapter>/*.webp`, captioned in
   `notes/specs/<topic>.json` (`figures` block + `figure_ref` in concepts). PRIMARY.
2. Bank figures — `MATHS_FIGURE_VISUALS` / `SCIENCE_FIGURE_VISUALS` in
   `lazytopper/src/data/visualConceptRegistry.ts`, keyed by `questionId`, resolved
   via `getFiguresForQuestion()`. NOT concept-tagged — mapping is curation judgment.
3. Interactives — `MATHS_VISUALS` / `SCIENCE_VISUALS` in the same registry, keyed
   by `makeId(subject,chapter,concept)`. Enrichment/fallback only (per D-TUT-14).

## PROPOSED output shape (default; Opus please confirm or amend BELOW)
```ts
export interface ConceptFigureRow {
  conceptKey: string;      // slugified boardEssentials name (concept-level, NOT a topic slug)
  topicKey: string;        // canonical topics.ts slug via resolveCanonicalSlug
  subject: "maths" | "science";
  conceptLabel: string;    // boardEssentials `name`, verbatim
  best: {
    kind: "notes-figure" | "bank-figure" | "interactive" | "none";
    ref: string;           // notes asset path | questionId | interactive id | ""
    why: string;           // one line: why this figure explains this concept
  };
  alternates?: Array<{ kind: ...; ref: string; why: string }>;  // 0-3 ranked
  gap: boolean;            // true only when best.kind === "none"
  vocabSource: "boardEssentials" | "coreIdeas";  // provenance of the concept row
  scopeCaveat?: string;    // set when concept sits outside 2026-27 chapter scope
}
export const conceptFigureCatalogue: ConceptFigureRow[] = [ ... ];
```

### OPUS — Stage-3 pre-flight: confirm or amend here
- [ ] ref shape for bank figures: bare `questionId` (default) OR the
      `MATHS_FIGURE_VISUALS` `.id`? (curation stores questionId; note if you want id)
- [ ] interactive ref: the registry `.id` (default) OR `.filePath`?
- [ ] do you want a per-concept canonical resolver, or is topicKey-scoped lookup +
      conceptKey-slug match enough?
- [ ] TS export (default) vs JSON? (task spec allows either)
- [ ] final filename / location for the wired artefact.

Until these boxes are checked, Fable keeps the format soft and the data complete.
