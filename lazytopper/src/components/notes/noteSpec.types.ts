/**
 * noteSpec.types.ts — TypeScript mirror of the note-spec contract
 * (`notes/NoteSpec_Schema.md`, schema v1.2) as enforced by
 * `notes/validate_spec.py`.
 *
 * The spec JSON under `notes/specs/<topic_key>.json` is the single source of
 * truth for one chapter note; `<Note spec={…}/>` renders it and the tutor
 * reads its fields as data. Subject-adaptivity is driven ONLY by the two
 * discriminators `meta.third_tab.kind` and `examples[].kind` — the renderer
 * never hard-codes per-subject logic.
 *
 * v1.1 field-level rules baked in here:
 *   - definitions carry `tier` ("headline" | "key-term"); `plain` is optional.
 *   - solution steps carry optional `lead` / `concept_tag`.
 *   - `third_tab_content` for kind "rules" is an array of typed sub-blocks.
 *   - `formula_strip[]` items need no per-item source.
 *   - `strategies[]` carry an optional `cue`; `big_idea` has a `tagline`.
 *
 * v1.2 (per-step marks) — reverses v1.1's "marks live only in mark_logic":
 *   - each worked example carries `marks_total` (its CBSE mark value) and each
 *     scoring `solution_steps[].mark` (a number of marks; CBSE half-marks are
 *     real, so 0.5 is valid). Steps that earn no independent mark simply omit
 *     `mark`. When an example carries mark data, validator Rule 10 enforces the
 *     per-step marks sum to `marks_total`. `mark_logic` stays as the authored
 *     overview; the per-step marks are the where-each-mark-lands detail.
 */

export type NoteSubject = "physics" | "chemistry" | "biology" | "maths";
export type NoteWeightage = "high" | "medium" | "low";
export type ThirdTabKind =
  | "proof"
  | "rules"
  | "derivations"
  | "reactions"
  | "diagrams";
export type ExampleKind = "numerical" | "reaction" | "process";
export type DefinitionTier = "headline" | "key-term";
export type FigureBucket = "ncert" | "authored_svg" | "generated";

/** Provenance block. Shape varies by what is being sourced. */
export interface NoteSource {
  ncert_page?: number;
  edition?: string;
  chapter?: number;
  ncert_example?: string;
  ncert_fig?: string;
  pdf?: string;
  page_pdf?: number;
  crop?: number[];
  clean?: string | null;
  refill?: string | null;
  note?: string;
}

export interface NoteMeta {
  topic_key: string;
  subject: NoteSubject;
  chapter_no: number;
  title: string;
  weightage: NoteWeightage;
  third_tab: { label: string; kind: ThirdTabKind };
  source_edition: string;
}

export interface NoteBigIdea {
  tagline?: string | null;
  body?: string | null;
}

export interface NoteDefinition {
  id: string;
  tier: DefinitionTier;
  term: string;
  /** CHARACTER-EXACT NCERT text — the tutor reads this. Never paraphrased. */
  verbatim: string;
  /** Authored gloss, kept SEPARATE from the verbatim. Null for key-terms. */
  plain?: string | null;
  memorise?: boolean;
  source: NoteSource;
}

export interface NoteConcept {
  id: string;
  title: string;
  body: string;
  /** A REAL CBSE pattern (e.g. "3-mark numerical") — never invented. */
  tested?: string | null;
  figure_ref?: string | null;
  source?: NoteSource | null;
}

export interface NoteSolutionStep {
  /** Bold lead-in, e.g. "Mirror formula." */
  lead?: string | null;
  text: string;
  /** kind:"reaction" steps may carry an equation instead of inline math. */
  equation?: string | null;
  math?: string | null;
  concept_tag?: string | null;
  /**
   * v1.2 — marks this step earns in the CBSE step-marking scheme (a number;
   * 0.5 is valid — stating a formula alone earns half a mark). Omit on steps
   * that carry no independent mark. When any step in an example carries a
   * `mark`, all present marks must sum to the example's `marks_total`
   * (validator Rule 10).
   */
  mark?: number | null;
}

export interface NoteExample {
  id: string;
  shape: string;
  kind: ExampleKind;
  /** EXACT NCERT/CBSE problem text. */
  problem_verbatim: string;
  solution_steps: NoteSolutionStep[];
  /**
   * v1.2 — the example's total CBSE marks. Present whenever the solution steps
   * carry per-step marks; the per-step `mark` values must sum to it (Rule 10).
   */
  marks_total?: number | null;
  /** AUTHORED string tracing to the real mark scheme. */
  mark_logic?: string | null;
  source: NoteSource;
}

export interface NoteStrategy {
  cue?: string | null;
  text: string;
}

export interface NotePitfall {
  text: string;
  owner_verified?: boolean;
}

export interface NoteFormulaItem {
  label: string;
  math: string;
  source?: NoteSource | null;
}

/** Mindmap tree. `_TODO` marks a spec whose tree has not been lifted yet. */
export interface NoteMindmapBranch {
  label: string;
  children?: Array<string | NoteMindmapBranch>;
}
export interface NoteMindmap {
  root?: string;
  branches?: NoteMindmapBranch[];
  _TODO?: string;
}

/* ── third_tab_content — shape switches on `kind` ──────────────────── */

export interface RulesSignRow {
  sign: string;
  text: string;
}
export type RulesBlock =
  | { heading: string; type: "sign-table"; rows: RulesSignRow[] }
  | { heading: string; type: "rule-list"; items: string[] };

export interface ThirdTabRules {
  kind: "rules";
  intro?: string | null;
  figure_ref?: string | null;
  blocks: RulesBlock[];
}

export interface ProofStep {
  claim: string;
  justification?: string | null;
  math?: string | null;
}
export interface ThirdTabProof {
  kind: "proof";
  intro?: string | null;
  figure_ref?: string | null;
  name?: string | null;
  steps: ProofStep[];
  source?: NoteSource | null;
}

export interface Derivation {
  name: string;
  steps: ProofStep[];
  source?: NoteSource | null;
}
export interface ThirdTabDerivations {
  kind: "derivations";
  intro?: string | null;
  figure_ref?: string | null;
  derivations: Derivation[];
}

export interface ReactionItem {
  name: string;
  equation: string;
  conditions?: string | null;
  source?: NoteSource | null;
}
export interface ThirdTabReactions {
  kind: "reactions";
  intro?: string | null;
  figure_ref?: string | null;
  reactions: ReactionItem[];
}

export interface ThirdTabDiagrams {
  kind: "diagrams";
  intro?: string | null;
  figure_ref?: string | null;
  /** Refs into figures{}. */
  diagrams: string[];
}

export type ThirdTabContent =
  | ThirdTabRules
  | ThirdTabProof
  | ThirdTabDerivations
  | ThirdTabReactions
  | ThirdTabDiagrams;

/* ── figures{} — the 3-bucket manifest ─────────────────────────────── */

export interface NoteFigure {
  bucket: FigureBucket;
  tag?: string | null;
  caption?: string | null;
  /** AUTHORED read-the-figure line. */
  legend?: string | null;
  /** Required (non-empty) for bucket "ncert" — makes the crop reproducible. */
  source?: NoteSource | null;
  /** App-target asset path relative to notes/assets/ (e.g. "light/fig_99.webp"). */
  asset?: string | null;
  /** bucket "authored_svg" only. */
  svg_ref?: string | null;
  /** bucket "generated" only. */
  generator?: string | null;
  params?: Record<string, unknown> | null;
}

export interface SourceLedgerRow {
  item: string;
  type: string;
  source: string;
}

export interface NoteSpec {
  schema_version: string;
  meta: NoteMeta;
  board_asks: string;
  big_idea: NoteBigIdea;
  definitions: NoteDefinition[];
  concepts: NoteConcept[];
  examples: NoteExample[];
  strategies: NoteStrategy[];
  pitfalls: NotePitfall[];
  formula_strip: NoteFormulaItem[];
  mindmap: NoteMindmap;
  third_tab_content: ThirdTabContent;
  figures: Record<string, NoteFigure>;
  source_ledger: SourceLedgerRow[];
}
