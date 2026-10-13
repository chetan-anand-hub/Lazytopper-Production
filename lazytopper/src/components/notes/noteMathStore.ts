/**
 * noteMathStore — precomputed KaTeX HTML for the note specs' formulas.
 *
 * `scripts/genNoteMath.ts` renders every `$…$` formula of `notes/specs/<slug>.json` once, at
 * build time, with `NOTE_KATEX_OPTIONS`, into `./noteMath/<slug>.json` ({ latex: html }). Each
 * map is its own lazy chunk, fetched together with the chapter's spec (`ensureNoteSpec`), so a
 * note page needs no `katex` code and no `renderToString` call at all. Identical formulas render
 * identically, so one flat store serves every chapter.
 *
 * A formula missing from the store (a stale map, or text that did not come from a spec) is not
 * an error: `NoteRichText` renders it through a lazily imported katex instead.
 */

const mathLoaders = import.meta.glob("./noteMath/*.json", {
  import: "default",
}) as Record<string, () => Promise<unknown>>;

const store = new Map<string, string>();
const settled = new Map<string, Promise<void>>();

/** `./noteMath/electricity.json` → `electricity`. */
function slugOfMathPath(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, "");
}

const loaderBySlug: ReadonlyMap<string, () => Promise<unknown>> = new Map(
  Object.entries(mathLoaders).map(([path, load]) => [slugOfMathPath(path), load]),
);

/** Precomputed HTML for a formula key (see `noteLatexKey`), or undefined. SYNCHRONOUS. */
export function lookupNoteMath(latex: string): string | undefined {
  return store.get(latex);
}

/** Add a { latex: html } map to the store (also used by tests). */
export function registerNoteMath(map: Readonly<Record<string, string>>): void {
  for (const [latex, html] of Object.entries(map)) store.set(latex, html);
}

/**
 * Load one chapter's formula map. NEVER rejects: if the chunk is missing or fails, the
 * chapter still renders, its formulas going through the katex fallback.
 */
export function ensureNoteMath(slug: string): Promise<void> {
  const load = loaderBySlug.get(slug);
  if (!load) return Promise.resolve();
  let pending = settled.get(slug);
  if (!pending) {
    pending = load().then(
      (value) => {
        if (typeof value === "object" && value !== null) {
          registerNoteMath(value as Record<string, string>);
        }
      },
      () => {
        settled.delete(slug);
      },
    );
    settled.set(slug, pending);
  }
  return pending;
}
