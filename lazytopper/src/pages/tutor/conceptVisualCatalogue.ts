// src/pages/tutor/conceptVisualCatalogue.ts
// Stage 3 (D-TUT-14/15) — the tutor explanation panel's visual RESOLVER.
//
// Turns a (subject, canonical topicKey, exact conceptLabel[, questionId]) into ONE
// resolved visual for the panel, following D-TUT-14's priority and D-TUT-15's
// exact-match-or-nothing rule. It NEVER fabricates: an unknown concept, or a curated
// ref whose asset is missing, resolves to a gap state — never a wrong/substring figure
// (that was the old findVisualForConcept bug this replaces).
//
// Reuses product primitives (D-TUT-12 "reuse the DATA, not the matcher"):
//   - getNoteAssetUrl()      — notes-figure asset URL, null when not extracted
//   - getFiguresForQuestion()— bank-figure entries by questionId (read filePath OFF the entry)
//   - getAllConceptsList()   — interactives; we build an id -> filePath Map (makeId is private)
//
// The catalogue DATA is conceptVisualCatalogue.data.ts (a wired copy of the Fable
// curation artefact). See its header for the LOOKUP CONTRACT (label, not conceptKey).

import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { getNoteAssetUrl } from "../../components/notes/noteSpecRegistry";
import { getFiguresForQuestion, getAllConceptsList } from "../../data/visualConceptRegistry";
import {
  conceptFigureCatalogue,
  type ConceptFigureRow,
  type NcertPageRefData,
} from "./conceptVisualCatalogue.data";

export type { NcertPageRefData } from "./conceptVisualCatalogue.data";

/** The panel body a resolved concept renders as. `interactive` is an OFFER, never an
 *  auto-embedded whole-chapter iframe (owner ruling, D-TUT-14 #3 / D-TUT-5). `gap` is the
 *  honest "no diagram yet" state (D-TUT-15) — shown, never faked.
 *
 *  `ncert` (owner ruling 2026-07-17) — an exact NCERT page rendered INLINE as the panel's
 *  primary content. It used to be permanently second-class ("offered ALONGSIDE the body...
 *  NOT as the body itself"), which meant a generic whole-chapter interactive outranked an
 *  exact page for the concept even when the page was plainly the better answer. It now
 *  COMPETES like every other kind — see resolveConceptVisual's priority.
 *
 *  ★ The panel MUST fail closed on this kind: the page is fetched from Firebase Storage at
 *  render time, so if the probe fails it renders the `gap` body instead — never a dead frame.
 *  A body kind is a claim that something is showable; for `ncert` that claim is only settled
 *  in the browser (see ExplanationPanel). */
export type VisualBody =
  | { kind: "image"; url: string; caption: string; source: "notes" | "bank" }
  | { kind: "interactive"; url: string; title: string }
  | { kind: "ncert"; page: NcertPageRefData }
  | { kind: "gap" };

export interface ResolvedVisual {
  conceptLabel: string;
  body: VisualBody;
  /** D-TUT-14 #1 — the exact NCERT page. Offered ALONGSIDE the body as a source link when a
   *  figure won the body; when NOTHING better existed it IS the body (`body.kind === "ncert"`)
   *  and the panel renders it inline rather than only behind a modal click-through. Always
   *  populated when the row carries a page, so the alongside-link stays available either way. */
  ncertPage?: NcertPageRefData;
  /** Curation's honest note when the concept sits outside 2026-27 chapter scope, or an
   *  asset is unavailable — surfaced quietly so the panel never implies false completeness. */
  scopeCaveat?: string;
}

const canon = (topicKey: string): string => resolveCanonicalSlug(topicKey) || topicKey;

// ── Indexes, built once (pure) ──────────────────────────────────────────────
// Two exact-lookup paths into the same rows, both keyed on STORED values (never a
// re-derived slug — that is the [FU-PROG-TOPIC-KEY-MISMATCH] trap ruling C forbids):
//   - byLabel: (canonical topicKey, exact conceptLabel) — conceptLabel is verbatim-equal to
//     the live boardEssentials name (verified 54/54), the human-facing exact key.
//   - byKey:   (canonical topicKey, stored conceptKey) — a clean kebab slug, used as the
//     regex-safe sentinel token the model emits (some conceptLabels contain "[]"/symbols).
const rowByLabel: ReadonlyMap<string, ConceptFigureRow> = (() => {
  const m = new Map<string, ConceptFigureRow>();
  for (const row of conceptFigureCatalogue) m.set(`${canon(row.topicKey)}\n${row.conceptLabel}`, row);
  return m;
})();
const rowByKey: ReadonlyMap<string, ConceptFigureRow> = (() => {
  const m = new Map<string, ConceptFigureRow>();
  for (const row of conceptFigureCatalogue) m.set(`${canon(row.topicKey)}\n${row.conceptKey}`, row);
  return m;
})();

/**
 * Turn a REGISTRY `filePath` into a URL the browser can actually load.
 *
 * ★ Why this exists (a live #448 bug — a raw Vercel 404 rendered to a student):
 * the registry's filePaths are ROOT-relative public paths ("/visuals/…"), but the app is served
 * under Vite's `base: "/app/"` (vite.config.ts:28). A raw filePath therefore resolves to the
 * DOMAIN ROOT — `…/visuals/…` 404s while the asset really lives at `…/app/visuals/…` — and the
 * host's own 404 page renders inside our <iframe>/<img>.
 *
 * Mirrors the proven idiom at `components/VisualExplainer.tsx:20-26` (`toAbsoluteSrc`), which is
 * how EVERY other registry consumer already gets this right (they all route their filePath through
 * VisualExplainer). This is a DELIBERATE, cited duplication rather than importing that helper:
 * VisualExplainer is part of the old engine under retirement scrutiny (D-TUT-12), and coupling the
 * fresh tutor to a retiring component is worse debt than one small copy.
 * [FU-PUBLIC-ASSET-URL-SHARED] — extract a shared `publicAssetUrl()` when VisualExplainer retires.
 *
 * ★★ REGISTRY PATHS ONLY (interactive + bank-figure). NEVER apply this to `getNoteAssetUrl()`:
 * that returns a Vite-BUNDLED `?url` which ALREADY carries the base, so prefixing it would emit
 * "/app/app/…" and break the notes-figure rows that work today.
 */
const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
function publicPath(filePath: string): string {
  if (filePath.startsWith("blob:") || filePath.startsWith("http")) return filePath;
  return filePath.startsWith("/") ? `${BASE}${filePath}` : filePath;
}

// Interactive id -> browser-ready public URL. makeId() is module-private in the registry and ids
// are computed at its init, so this Map over the exported list is the only lookup path. The base
// is applied HERE, at the choke point, so every consumer gets a loadable URL.
const interactivePathById: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const c of getAllConceptsList()) m.set(c.id, publicPath(c.filePath));
  return m;
})();

function firstBankFigureUrl(questionId: string): string | null {
  const figs = getFiguresForQuestion(questionId);
  // Read filePath OFF the entry — never synthesize from questionId (one asset can serve two).
  return figs.length && figs[0].filePath ? publicPath(figs[0].filePath) : null;
}

/** Resolve the curated `best` ref to a concrete body, or a gap when its asset is missing. */
function resolveBest(row: ConceptFigureRow): VisualBody {
  const { kind, ref, why } = row.best;
  if (kind === "notes-figure") {
    const url = getNoteAssetUrl(ref);
    return url ? { kind: "image", url, caption: why, source: "notes" } : { kind: "gap" };
  }
  if (kind === "bank-figure") {
    const url = firstBankFigureUrl(ref);
    return url ? { kind: "image", url, caption: why, source: "bank" } : { kind: "gap" };
  }
  if (kind === "interactive") {
    const url = interactivePathById.get(ref);
    return url ? { kind: "interactive", url, title: why } : { kind: "gap" };
  }
  return { kind: "gap" };
}

/**
 * The panel's single visual for a concept, looked up by stored conceptKey (the sentinel
 * token) OR exact conceptLabel — whichever the caller has.
 *
 * Priority (D-TUT-14, as amended by the owner ruling of 2026-07-17):
 *   0. questionId in play → that question's REAL exam figure (bank) outranks the generic one.
 *   1. a real figure — the curated `best` when it resolves to an image (notes/bank). The
 *      workhorse: a concept-exact diagram beats everything.
 *   2. the NCERT page, INLINE. ★ This is the amendment: it now outranks `interactive`.
 *      Rationale — an `interactive` is a WHOLE-CHAPTER tool (the panel's own copy tells the
 *      student "use it to play, not as a single answer"), so for one specific concept an exact
 *      NCERT page is the better answer. Previously the page could never win at any fit, which
 *      is the second-class status this ruling removes.
 *   3. interactive — the opt-in OFFER (still never auto-embedded).
 *   4. gap — honest "no diagram yet", never a stretched figure.
 *
 * NOTE the asymmetry with #1: an image is proven to exist at build time (CI's
 * tutor_visual_catalogue_acceptance.mjs checks the asset is on disk), whereas an `ncert` body
 * is only a CLAIM until the browser probes Storage. That is why the panel must fail closed to
 * `gap` — see the VisualBody doc. Resolution stays pure/sync; reachability is the panel's job.
 *
 * Returns null ONLY when the concept isn't in the catalogue at all (nothing to show).
 */
export function resolveConceptVisual(args: {
  subject: "maths" | "science" | "";
  topicKey: string;
  conceptKey?: string;
  conceptLabel?: string;
  questionId?: string;
}): ResolvedVisual | null {
  const topic = canon(args.topicKey);
  const row = args.conceptKey
    ? rowByKey.get(`${topic}\n${args.conceptKey}`)
    : args.conceptLabel
      ? rowByLabel.get(`${topic}\n${args.conceptLabel}`)
      : undefined;
  if (!row) return null; // exact-match-or-nothing (D-TUT-15) — never a substring guess

  // D-TUT-14 #2: a specific question in play → prefer its own exam figure over the generic.
  let body: VisualBody | null = null;
  if (args.questionId) {
    const url = firstBankFigureUrl(args.questionId);
    if (url) body = { kind: "image", url, caption: "The figure from this question.", source: "bank" };
  }
  if (!body) {
    // A real figure wins outright; otherwise the NCERT page outranks an interactive/gap.
    // `resolveBest` already degrades a curated ref whose asset is missing to `gap`, so this
    // also promotes the page over that degraded state rather than showing "no diagram yet"
    // when we do in fact have the exact page.
    const best = resolveBest(row);
    if (best.kind === "image") body = best;
    else if (row.ncertPage) body = { kind: "ncert", page: row.ncertPage };
    else body = best;
  }

  return {
    conceptLabel: row.conceptLabel,
    body,
    ...(row.ncertPage ? { ncertPage: row.ncertPage } : {}),
    ...(row.scopeCaveat ? { scopeCaveat: row.scopeCaveat } : {}),
  };
}

/** The stored conceptKey for an exact (canonical topicKey, conceptLabel), or null. Used to
 *  decide whether a specific-question figure override applies to the concept being shown —
 *  the questionId figure is only ever right for the concept the student arrived on. */
export function conceptKeyForLabel(args: { topicKey: string; conceptLabel: string }): string | null {
  return rowByLabel.get(`${canon(args.topicKey)}\n${args.conceptLabel}`)?.conceptKey ?? null;
}

export interface CatalogueFigureOption {
  /** Stable kebab slug — the regex-safe sentinel token the model emits (`[[figure:<key>]]`). */
  key: string;
  /** Human label shown to the model so it knows what each key means. */
  label: string;
  /** True when this concept has a curated, exact NCERT page the panel can show.
   *
   *  ★ DATA ONLY — this field exists so the prompt CAN eventually say so; nothing in the
   *  prompt reads it yet. Until it does, the model still has no idea the capability exists,
   *  which is why it flatly answers "I cannot open NCERT pages" even for a concept that has
   *  one. Writing that copy is the tutor-round-trip lane's sequenced task, not this one's.
   *
   *  ★★ This field is only useful if it SURVIVES the wire: `normalizeFigures` in
   *  server/routes/tutor.cjs rebuilds each option as a fresh object, so a field added here
   *  and nowhere else is silently dropped before the prompt is built. Keep the two in step. */
  hasNcertPage: boolean;
}

/**
 * The options for a topic that have SOMETHING to show. Passed to the model so it emits
 * `[[figure:<key>]]` chosen from a CLOSED set — the only robust way to keep the client-side
 * lookup an exact match (never fuzzy, D-TUT-15). The key is a clean slug (regex-safe even when
 * the label carries "[]"/symbols).
 *
 * ★ "Something to show" is NOT the same as "best.kind !== 'none'" any more. A gap row that
 * carries an NCERT page now resolves to a real `ncert` body (owner ruling 2026-07-17), so
 * excluding it would hide the one concept whose ONLY visual is the page — the model could
 * never signal it, the panel could never open, and the promotion would be dead code for
 * exactly the row it was built for (carbon · "Functional groups" is that row today). The
 * old rationale ("signalling a figure that resolves to an empty panel is pointless") held
 * only while the page could not fill the panel; it now can.
 */
export function catalogueFiguresForTopic(args: {
  subject: "maths" | "science" | "";
  topicKey: string;
}): CatalogueFigureOption[] {
  const topic = canon(args.topicKey);
  const out: CatalogueFigureOption[] = [];
  for (const row of conceptFigureCatalogue) {
    if (canon(row.topicKey) !== topic) continue;
    if (args.subject && row.subject !== args.subject) continue;
    if (row.best.kind === "none" && !row.ncertPage) continue; // nothing at all to show
    out.push({ key: row.conceptKey, label: row.conceptLabel, hasNcertPage: Boolean(row.ncertPage) });
  }
  return out;
}
