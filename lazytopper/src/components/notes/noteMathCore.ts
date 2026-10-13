/**
 * noteMathCore — the ONE definition of how a note's `$…$` formula is found and rendered.
 *
 * Shared by the runtime (`NoteRichText`, which must NOT import katex) and the build-side
 * generator (`scripts/genNoteMath.ts`, which does). The precomputed map is only correct while
 * both sides agree on the pattern, the trim and the options, so neither keeps its own copy.
 * `noteMath.guard.test.ts` re-renders every formula in the 26 specs with these options and
 * requires the committed map to match byte for byte.
 */

/** Split on $…$ (no lookbehind games: specs never use bare `$` in prose). */
export const NOTE_MATH_RE = /\$([^$]+)\$/g;

/** The exact KaTeX options notes have always been rendered with. */
export const NOTE_KATEX_OPTIONS = {
  throwOnError: false,
  displayMode: false,
  output: "html",
  trust: false,
  strict: "ignore",
} as const;

/** The map key for a formula: the text between the dollars, trimmed. */
export function noteLatexKey(rawBetweenDollars: string): string {
  return rawBetweenDollars.trim();
}

/** Every distinct formula key in one text field, in order of appearance. */
export function noteLatexOf(text: string): string[] {
  const keys: string[] = [];
  for (const match of text.matchAll(NOTE_MATH_RE)) keys.push(noteLatexKey(match[1]));
  return keys;
}
