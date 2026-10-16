// src/lib/desktop/conceptSetPath.ts
//
// WEAK-AREA-DIRECT — the ONE href a named weak concept's "Practise" opens (Me's By-concept rows via
// services/meHomeSummary `meConceptPractisePath`, and Quick Practice's "My weak areas" card).
//
// It lands IN a Quick Practice set on that concept: `/practice/10/<Subject>?topic=<chapter slug>
// &focus=<concept>&subtopicHint=<concept>` — the concept-focus path PracticePage already reads (the
// tutor's `buildQuickPracticeRoundTripHref` and the Topic Hub concept rows send the same params).
// The generic `/practice-hub` picker ignores `focus`, so sending a concept there lost it (the
// live defect on 998ab2a3).
//
// Kept in lib/ (light imports only: the topic registry + the path builders) so the Quick Practice
// page can build the card's href without pulling the Me read model into its chunk.

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

/**
 * The concept's Quick Practice set. The chapter must resolve (any spelling the topic registry
 * knows) to a chapter of `paper`; otherwise — no chapter on the row (an unmapped subtopic seen in
 * more than one chapter), an unknown chapter, or the other paper — it opens the paper's Quick
 * Practice page WITHOUT a focus (an honest landing, never a concept promised and not served, and
 * never the hub picker).
 */
export function conceptSetPath(
  paper: DesktopSubject,
  concept: ConceptSetRef,
  ctx: DesktopRouteContext = {},
): string {
  const meta = concept.chapter ? desktopTopicForWeakAreaKey(concept.chapter) : undefined;
  if (meta && meta.subject === paper && meta.slug) {
    return buildDesktopConceptPracticePath({
      subject: paper,
      topic: meta.slug,
      focus: concept.label,
      subtopicHint: concept.label,
      ...ctx,
    });
  }
  const params = new URLSearchParams();
  params.set("scope", "full-subject");
  if (ctx.source) params.set("source", ctx.source);
  if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
  return withQuery(`/practice/10/${paper}`, params);
}
