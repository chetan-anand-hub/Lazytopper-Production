/**
 * SEO-LLM-1 — the NCERT file code of the chapter a note covers, e.g. `jemh102`.
 *
 * ★ ONE COPY. The build script (`scripts/seo/writeStaticHeads.ts`: the <title> and the
 * <meta description>) and the notes page (`components/notes/Note.tsx`: the visible
 * "Official NCERT chapter PDF" link) both resolve the code HERE, from the note's own
 * parsed spec. Before this lane the logic lived only in the script, and the page could
 * not read it without restating it.
 *
 * ★ READ FROM THE NOTE'S OWN SPEC, never typed in:
 *   1. the `(jXXX1NN.pdf` code in `meta.source_edition`, when it names one;
 *   2. otherwise the ONE distinct `j(emh|esc)1NN` code in the spec's citation `pdf`
 *      fields.
 * Either way the code must equal the book's prefix (Mathematics → jemh, Science → jesc)
 * + "1" + the 2026-27 chapter number `source_edition` names first ("Ch N"), zero-padded.
 *
 * ⚠ ANYTHING ELSE THROWS — no code, two codes, or a code for another chapter. A title or
 * a link naming the wrong NCERT file is worse than none, so this never guesses.
 */

/** NCERT 2026-27 Class 10 file-name prefixes, keyed by the book named in `source_edition`. */
const NCERT_FILE_PREFIX: Readonly<Record<string, string>> = {
  Mathematics: "jemh",
  Science: "jesc",
};

/** Every string value under a `pdf` key, anywhere in a parsed spec. */
function citationPdfs(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => citationPdfs(v, out));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      if (key === "pdf" && typeof v === "string") out.push(v);
      else citationPdfs(v, out);
    }
  }
  return out;
}

/**
 * The code for one parsed note spec. `where` names the spec in the error (a file path in
 * the build script, the slug in the page). Throws, with "no resolvable NCERT file code",
 * when the spec does not name exactly one code that agrees with its own chapter.
 */
export function ncertFileCodeFromSpec(spec: unknown, where: string): string {
  const edition = (spec as { meta?: Record<string, unknown> } | null)?.meta?.source_edition;
  const fail = (why: string): never => {
    throw new Error(`${where} has no resolvable NCERT file code (${why})`);
  };
  if (typeof edition !== "string") return fail("no meta.source_edition");
  const book = /Class 10 (Mathematics|Science)\b/.exec(edition)?.[1];
  const chapter = /\bCh (\d{1,2})\b/.exec(edition)?.[1];
  if (!book || !chapter) return fail(`source_edition names no Class 10 book + "Ch N": ${edition}`);
  const expected = `${NCERT_FILE_PREFIX[book]}1${chapter.padStart(2, "0")}`;

  const fromEdition = /\((j(?:emh|esc)1\d{2})\.pdf/.exec(edition)?.[1];
  if (fromEdition) {
    if (fromEdition !== expected) return fail(`source_edition code ${fromEdition} is not ${expected}`);
    return fromEdition;
  }
  const codes = [
    ...new Set(
      citationPdfs(spec)
        .map((p) => /j(?:emh|esc)1\d{2}/.exec(p)?.[0])
        .filter((c): c is string => Boolean(c)),
    ),
  ];
  if (codes.length !== 1) return fail(`${codes.length} distinct citation codes: ${codes.join(", ")}`);
  if (codes[0] !== expected) return fail(`citation code ${codes[0]} is not ${expected}`);
  return codes[0];
}

/** The one official place an NCERT chapter PDF is served from. Never another host. */
export const NCERT_PDF_HOST = "https://ncert.nic.in/textbook/pdf/";

/** `https://ncert.nic.in/textbook/pdf/<code>.pdf`. */
export function ncertPdfHref(code: string): string {
  return `${NCERT_PDF_HOST}${code}.pdf`;
}

/** The note page's link text: "Official NCERT chapter PDF (jemh111) — ncert.nic.in". */
export function ncertPdfLinkText(code: string): string {
  return `Official NCERT chapter PDF (${code}) — ncert.nic.in`;
}

/** The code for the page, or `null` when the spec does not resolve one — no link, no guess. */
export function tryNcertFileCode(spec: unknown, where: string): string | null {
  try {
    return ncertFileCodeFromSpec(spec, where);
  } catch {
    return null;
  }
}
