// src/lib/desktop/conceptSetPath.ts
//
// WEAK-AREA-DIRECT - where a named weak concept's "Practise" goes (Me's By-concept rows via
// services/meHomeSummary `meConceptPractisePath`, and Quick Practice's "My weak areas" card).
//
// EXACT, or honest: the concept's set is the EXACT served bank rows behind Me's row - the same
// `focusBankIds` + `strictFocus` path the Topic Hub concept cards use (conceptPractice.ts, D74):
//   - a mapped row (an Exam Trends concept name): the chapter's rows whose subtopic resolves to that
//     concept (conceptPractiseTarget - the lookup Me itself counts with);
//   - an unmapped row (a kept subtopic): the chapter's unmapped rows whose subtopic IS the label;
//   - fewer than MIN_CONCEPT_PRACTISE_ROWS rows, or no resolvable chapter of this paper: the paper's
//     whole Quick Practice set with NO focus (never a concept promised and not served, never the hub).
// A soft `subtopicHint` reorder is never sent as the concept: bank subtopic strings rarely contain
// Me's concept names, so it served the whole chapter under the concept's name.
//
// BUNDLE: the rows come from the ~411KB bank id index, which Home and Quick Practice do not load.
// So this module stays light (topic registry + path builders): the render-time href is the honest
// fallback, and the exact set is computed at CLICK time (`resolveConceptSetPath`, a dynamic import of
// ./conceptSetTarget), then navigated to.

import { desktopTopicForWeakAreaKey } from "./topics";
import {
  buildDesktopConceptPracticePath,
  withQuery,
  type DesktopRouteContext,
  type DesktopSubject,
} from "./navigation";

/** A concept row as Me names it: its label, and its chapter (ConceptRung.chapter) when known. */
export interface ConceptSetRef {
  label: string;
  chapter?: string;
}

/** Route context plus the practice page's Back label (sent as `?backLabel=`, as the Topic Hub does). */
export interface ConceptSetContext extends DesktopRouteContext {
  backLabel?: string;
}

/** The resolved served set: exactly these ids, or none (the honest fallback). */
export type ConceptSetTarget = { kind: "exact"; ids: string[]; count: number } | { kind: "none" };

/** The paper's whole Quick Practice set, no focus. */
export function conceptSetFallbackPath(paper: DesktopSubject, ctx: ConceptSetContext = {}): string {
  const params = new URLSearchParams();
  params.set("scope", "full-subject");
  if (ctx.backLabel) params.set("backLabel", ctx.backLabel);
  if (ctx.source) params.set("source", ctx.source);
  if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
  return withQuery(`/practice/10/${paper}`, params);
}

/** The board chapter slug of the row's chapter when it is a chapter of `paper`, else null. */
export function conceptSetChapterSlug(paper: DesktopSubject, concept: ConceptSetRef): string | null {
  const meta = concept.chapter ? desktopTopicForWeakAreaKey(concept.chapter) : undefined;
  return meta && meta.subject === paper && meta.slug ? meta.slug : null;
}

/** The href for a resolved target (pure; the exact set carries focusBankIds + strictFocus + count). */
export function conceptSetPathFor(
  paper: DesktopSubject,
  concept: ConceptSetRef,
  target: ConceptSetTarget,
  ctx: ConceptSetContext = {},
): string {
  const slug = conceptSetChapterSlug(paper, concept);
  if (!slug || target.kind !== "exact" || target.ids.length === 0) return conceptSetFallbackPath(paper, ctx);
  return buildDesktopConceptPracticePath({
    subject: paper,
    topic: slug,
    focus: concept.label,
    focusBankIds: target.ids,
    count: target.count,
    ...ctx,
  });
}

/** The render-time href: the honest fallback (the exact set is resolved on click). */
export function conceptSetPath(
  paper: DesktopSubject,
  _concept: ConceptSetRef,
  ctx: ConceptSetContext = {},
): string {
  return conceptSetFallbackPath(paper, ctx);
}

/** The concept's exact set href, computed lazily (loads the bank id index on first use). */
export async function resolveConceptSetPath(
  paper: DesktopSubject,
  concept: ConceptSetRef,
  ctx: ConceptSetContext = {},
): Promise<string> {
  const slug = conceptSetChapterSlug(paper, concept);
  if (!slug) return conceptSetFallbackPath(paper, ctx);
  const { conceptSetTarget } = await import("./conceptSetTarget");
  return conceptSetPathFor(paper, concept, conceptSetTarget(slug, concept.label), ctx);
}

/** The minimal click event a Link hands its onClick. */
interface ClickLike {
  preventDefault(): void;
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * A Link onClick that resolves the exact set, then navigates. A modified / non-primary click keeps
 * the Link's own (fallback) href. A failed import navigates to the fallback.
 */
export function conceptSetClick(
  navigate: (to: string, opts?: { state?: unknown }) => void,
  paper: DesktopSubject,
  concept: ConceptSetRef,
  ctx: ConceptSetContext = {},
  state?: unknown,
): (e: ClickLike) => void {
  return (e) => {
    if ((e.button ?? 0) !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const go = (to: string) => navigate(to, state === undefined ? undefined : { state });
    resolveConceptSetPath(paper, concept, ctx).then(go, () => go(conceptSetFallbackPath(paper, ctx)));
  };
}
