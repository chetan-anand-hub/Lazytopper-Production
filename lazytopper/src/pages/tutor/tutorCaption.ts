// src/pages/tutor/tutorCaption.ts
// TUTOR-UX-1 (A) — the student-facing caption for a tutor diagram.
//
// A catalogue row's `best.why` is the CURATOR's internal rationale ("... literally 'The New
// Cartesian Sign Convention ...'", "... not isolated."). resolveBest copies it verbatim into
// `body.caption` (conceptVisualCatalogue.ts:128 notes figure, :132 bank figure), and the panel
// used it as both alt text and the visible figcaption. This module is the ONE place that turns
// that rationale into something a Class 10 student should read. The rationale text itself is
// never shown: only an NCERT figure reference (when the rationale starts with one) plus the
// concept label.

/** "NCERT Fig 9.9", "NCERT Fig 6.1a", "NCERT Fig 7.1(a)" at the start of a rationale. */
const NCERT_FIG_REF = /^NCERT Fig \d+\.\d+(?:\([a-z]\)|[a-z])?/;

/** Captions the resolver writes ITSELF for a question-figure override
 *  (conceptVisualCatalogue.ts:183). They are already student copy, so they pass through. */
const STUDENT_COPY_CAPTIONS: ReadonlySet<string> = new Set(["The figure from this question."]);

const MAX_CAPTION_CHARS = 80;

/** Clean caption for the diagram panel. `rationale` is `body.caption` as the resolver gave it. */
export function studentCaption(rationale: string, conceptLabel: string): string {
  const raw = (rationale ?? "").trim();
  if (STUDENT_COPY_CAPTIONS.has(raw)) return raw;
  const label = (conceptLabel ?? "").trim();
  const ref = NCERT_FIG_REF.exec(raw)?.[0];
  const build = (l: string) => (ref ? (l ? `${ref} \u00b7 ${l}` : ref) : l);
  if (build(label).length <= MAX_CAPTION_CHARS) return build(label);
  // Too long: first drop the trailing formula / parenthetical from the label ...
  const cut = label.search(/\(/);
  const short = cut > 0 ? label.slice(0, cut).trim() : label;
  if (build(short).length <= MAX_CAPTION_CHARS) return build(short);
  // ... and as a last resort trim the label with an ellipsis, keeping the figure reference whole.
  const head = ref ? `${ref} \u00b7 ` : "";
  return `${head}${short.slice(0, Math.max(0, MAX_CAPTION_CHARS - head.length - 1)).trimEnd()}\u2026`;
}
