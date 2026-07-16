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

### OPUS — Stage-3 pre-flight: CONFIRMED 2026-07-16 (trunk `acf3092`)

Format is now **FROZEN** as proposed above, with ONE amendment (E) and one correction (C).
All five boxes answered. Verified against live trunk, not against this doc's prose.

- [x] **(A) bank-figure ref = bare `questionId`. CONFIRMED — keep as-is.**
      `getFiguresForQuestion(questionId)` (`visualConceptRegistry.ts:503`) is an exact,
      id-keyed filter returning `VisualConcept[]`. The resolver reads `filePath` OFF the
      returned entry and NEVER synthesizes a path from the questionId: entry `:484`
      (`CFPQ-S-LGHT-005` → `cfpq-s-lght-004.webp`) proves **one asset can legitimately
      serve two questionIds** (twin MCQs on the same photo). A path-synthesizing resolver
      would 404 there. `questionId` is the right ref; the `.id` would be redundant.
- [x] **(B) interactive ref = the registry `.id`. CONFIRMED — keep as-is.**
      `.filePath` is an implementation detail and would duplicate state. Note for the
      record: `makeId()` is module-PRIVATE and ids are computed at module init, so an id
      cannot be reconstructed from parts by a consumer. Stage 3 builds a `Map` over the
      exported `getAllConceptsList()` keyed on `.id` — the only exported id→entry path.
      (`MATHS_VISUALS`/`SCIENCE_VISUALS` are nested `ChapterVisuals[]`; the
      `*_FIGURE_VISUALS` are flat.)
- [x] **(C) NO per-concept canonical resolver. The lookup key is `conceptLabel`, NOT
      `conceptKey`.** ★ This corrects a claim in the catalogue's own header.
      The header states `conceptKey = slugified conceptLabel`. **That is not true for 46
      of the 54 rows (85%)** — verified mechanically against the repo's only slugify idiom
      (`makeId`'s `toLowerCase().replace(/[^a-z0-9]+/g,"-")`). The keys are *editorial
      abbreviations*, which is good curation but not a derivable function:
      `"Pythagoras theorem (a² + b² = c²)"` → key `pythagoras-theorem` but slugifies to
      `pythagoras-theorem-a-b-c`; `"Tangent ⟂ radius…"` → key
      `tangent-perp-radius-at-point-of-contact` (a human rendering of `⟂` as `perp`).
      A resolver that slugified the live boardEssentials `name` at runtime to find a
      `conceptKey` would silently miss 46/54 concepts — **the exact
      [FU-PROG-TOPIC-KEY-MISMATCH] failure** (two canonicalizers disagree → zero rows),
      reproduced in a new lane.
      **Resolution — no data change needed.** All 54 `conceptLabel`s were verified present
      **verbatim** in the live `lib/desktop/topicHubContent.ts` `name:` literals (54/54, zero
      misses). So: lookup = `(resolveCanonicalSlug(topicKey), exact conceptLabel string)`.
      `conceptKey` is retained as a **stable human-readable id only — never a lookup key**.
      Stage 3 ships a test asserting every row's `(topicKey, conceptLabel)` still resolves
      against live `boardEssentials`, so any future label edit fails CI instead of silently
      blanking the panel. **Fable: keep `conceptLabel` byte-verbatim with the hub row —
      it is now load-bearing.** The header's `conceptKey` line should be corrected to
      "editorial slug; not machine-derived; not a lookup key."
- [x] **(D) TS export. CONFIRMED** — typed, compile-time-checked, matches repo idiom.
      Keep `.ts`; no JSON.
- [x] **(E) Wired location: `lazytopper/src/pages/tutor/conceptVisualCatalogue.data.ts`**,
      with the resolver alongside it in `pages/tutor/`. **Not** `src/data/` — that path is
      globally forbidden by CLAUDE.md §4 and is not in the tutor lane's file map. The
      staged `handoff/curation/` copy stays as the curation lane's artefact of record.
      *(Owner may instead grant a narrow `src/data/` exception; `pages/tutor/` is the
      in-scope default and needs no exception.)*

### ★ AMENDMENT — ONE NEW OPTIONAL FIELD REQUESTED (D-TUT-14 priority #1)

D-TUT-14 ranks **exact NCERT page** ABOVE figures, and the mechanism is live and healthy
(26 chapter PDFs hosted + public-read, probed HTTP 200 this session; `NcertPageModal` +
`ncertPdfOffsets` ready; `[FU-NOTES-NCERT-PDF-HOSTING]` is RESOLVED — the older
"nothing hosted yet" prose in that FU and in the source docstrings is stale).

**But the catalogue carries no page reference, and there is no concept→page map in the
repo.** Pages live in the note specs as `source.ncert_page` on a spec concept. Matching a
`boardEssentials` label to a note-spec concept would require a *fuzzy* matcher — i.e.
inventing the second matcher that D-TUT-15 exists to forbid. Stage 3 will not build that.

So priority #1 is deferred to a curated field rather than guessed. Proposed additive shape
(optional; absent = no NCERT link shown, which is honest, not a gap):

```ts
  ncertPage?: { subject: "physics" | "chemistry" | "biology" | "maths";
                chapter: number; page: number };  // page = the PRINTED NCERT page
```
`NcertPageRef` is exactly this shape; `ncertPdfPage()` applies the per-chapter offset.
This is **curation judgment, not code** — same discipline as the figure rows, and
owner-verifiable (open the page, check the concept is on it). Stage 3 reads the field if
present and renders the "open the exact NCERT page" affordance; it ships without it and
lights up per-row as the field lands, no redeploy of the panel logic.

**Fable lane: this is the one thing Stage 3 wants that the data doesn't yet have.** Not a
blocker — the panel ships on figures (47/54 rows carry a real asset).

### Verification performed against trunk `acf3092` (so this doc records fact, not intent)
- **All 102 asset-bearing refs resolve** (40 notes-figure, 43 interactive, 19 bank-figure;
  7 `none`/gap rows). Zero broken refs — re-checked against `git ls-files` for exact CASE,
  since Windows would false-green a case-wrong ref that then breaks the linux-pinned build.
- Notes figures resolve via `getNoteAssetUrl()` (`noteSpecRegistry.ts:60`), which globs
  `notes/assets/**` at build time and **returns null when absent** — Stage 3 reuses it
  rather than re-globbing; it gives honest-or-silent for free. Notes assets live at the
  **repo root** `notes/assets/`, NOT under `lazytopper/` and NOT static-served.
- The GAPS.md precedent (`fig_distance_plane`/`fig_section_divide` are generator specs that
  do not exist on disk) was handled correctly by the curation: those two appear ONLY in
  comments/`scopeCaveat` strings, never as a live `ref:`. It did not recur elsewhere.

Format frozen. Fable may resume with (C)'s label-verbatim rule + the (E) `ncertPage` field.

---

## POST-#448 ADDENDUM (2026-07-16, trunk `0e42e16`) — the catalogue is WIRED; what changed for this lane

Stage 3 shipped. The catalogue is now consumed by the live tutor panel, so this lane's data is
load-bearing product content, not a staged artefact. Four things changed since the confirmation above.

**1. The wired copy lives at `lazytopper/src/pages/tutor/conceptVisualCatalogue.data.ts`** (per ruling E).
`handoff/curation/conceptFigureCatalogue.curated.ts` **stays as the curation lane's artefact of record**
(the app's tsconfig includes only `src/`, so `handoff/` cannot be imported). **Keep the two in sync.**

**2. ★ TWO conceptLabels CHANGED — the wired copy is authoritative on these.** Both were owner-ruled
NCERT-fidelity corrections to `boardEssentials`, applied in lockstep (a label edit that misses the
catalogue now **fails CI** — see 3):
- `areas-related-to-circles`: ~~"Circumference & area recap (C = 2πr, A = πr²)"~~ → **"Radius from a given
  circumference, diameter or area"**. The 2026-27 reprint DELETED the "Perimeter and Area of a Circle — A
  Review" section, but Exercise 11.1 Q2 (p158) still tests the skill ⇒ **renamed, not retired.**
- `carbon-and-its-compounds`: ~~"…, >C=O, –X)"~~ → **"Functional groups (–OH, –CHO, –COOH, >C=O, –Cl, –Br)"**.
  `–X` was a lone over-reach (NCERT Table 4.3 lists only —Cl/—Br, never F/I). **`>C=O` was deliberately KEPT**
  — it is shared student-facing vocabulary with the question bank; narrowing the hub alone would desync it
  from the answers students read.
- **`conceptKey` was NOT renamed on either row** — it is an editorial id AND is **persisted as the figure
  signal in durable tutor sessions**; renaming it would blank the panel on live threads. *Never rename a
  conceptKey because its display label changed.*

**3. ★ A CI gate now enforces this contract.** `lazytopper/scripts/ops/tutor_visual_catalogue_acceptance.mjs`
(in the gated ops matrix) **fails the build** on: a `conceptLabel` that is not a live `boardEssentials` name
(**label drift** — the exact silent-blank failure ruling C identified), a `notes-figure`/`bank-figure` ref whose
asset is missing, or a non-slug/duplicate `conceptKey`. Proven to fail on both, not assumed. ⇒ **Editing a
label on either side now requires the lockstep edit; the guard will catch it if you forget.**

**4. ★★ "HARD GAP" IN `GAPS.md` MEANS CURATION JUDGMENT, NOT A VERIFIED CENSUS.** #448 traced all 7 hard gaps
against the **official 2026-27 NCERT PDFs** and found:
- **Two "hard gaps" have real NCERT source art** to trace — atmospheric refraction (**Fig 10.9 + Fig 10.10**,
  p168) and functional groups (**Table 4.3**, p66). *"No fitting asset in OUR catalogue" ≠ "NCERT has none".*
- **#6 was not a gap at all** — a **functional-groups INTERACTIVE exists** (`visualConceptRegistry.ts:234` →
  `/visuals/science/carbon-compounds/functional-groups.html`, file present); it was recorded `none` as a
  "keyword-heuristic concept stub". The outcome is unchanged (a curated figure outranks a whole-chapter
  interactive) but **the hard-gap count was off by one**.
This is **not** a criticism of the curation — precision-over-coverage was the right discipline, and the honest
`scopeCaveat` notes are what made the trace fast. It is a **framing** fix so a future reader doesn't read the
count as a census of NCERT. A caveat line is added to GAPS.md's header in this same docs PR.

### What Stage 3 still wants from this lane (unchanged priority order)
- **The `ncertPage` field (E)** — still the one thing the panel wants that the data lacks. The affordance is
  **built and dormant**; it lights up per-row the moment a row carries the field, with no redeploy. D-TUT-14
  ranks the exact NCERT page **above** figures, and the PDFs are hosted and healthy (probed HTTP 200). This is
  curation judgment, not code — matching a label to a note-spec page would need a fuzzy matcher, which
  **D-TUT-15 forbids**.
- **The last 2 gap figures** ([FU-TUTOR-LAST-2-GAP-FIGURES]) — now unblocked; Opus authors, owner verifies.
- **Rows for the topics still in bank expansion** — curate as their figures land, per the original §3 scope.
