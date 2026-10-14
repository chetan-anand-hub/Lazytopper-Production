/**
 * NCERT-BOOKS-1 (lane G, D210 / D211 / D213) — the 27 chapters of the NCERT Class 10
 * textbooks for the 2027 boards, in the 2026-27 (rationalised) numbering: Mathematics 14,
 * Science 13. The single source the `/ncert-class-10` page renders and the guard test reads.
 *
 * ★ NUMBERING AND TITLES ARE NCERT'S 2026-27 ONES, checked against the live ncert.nic.in
 * chapter PDFs (the file code IS the chapter: jemh1NN / jesc1NN). No chapter deleted from
 * the 2026-27 syllabus appears (Science "Sources of Energy", "Management of Natural
 * Resources" are gone from the book). Our notes merge Maths Ch 8 and Ch 9 into one spec
 * (`trigonometry`), so here they are two rows that both link to `/notes/trigonometry`.
 *
 * ★ `stored` IS A MEASURED FACT, NOT A HOPE. It is true only when our Firebase Storage copy
 * (`ncert/{storageSubject}/ch{chapter}.pdf`) returned HTTP 200 + application/pdf AND matched
 * the live ncert.nic.in file (page count, chapter title, sample page) in the lane's edition
 * check (listed in the AUDIT-REQUEST on #973). A row with `stored: false` never offers our
 * copy; its reader goes straight to the official file. The reader also falls back to the
 * official link at runtime if our copy fails to load, so a broken frame is never shown.
 */
import type { NoteSubject } from "../components/notes/noteSpec.types";

export type NcertBook = "Maths" | "Science";

export interface NcertBookChapter {
  readonly book: NcertBook;
  /** NCERT 2026-27 chapter number within the book. */
  readonly chapter: number;
  /** NCERT's chapter title. */
  readonly title: string;
  /** Our note / topic slug: `/notes/<slug>` exists for every row. */
  readonly slug: string;
  /** The Storage path segment our copy lives under (`ncert/<storageSubject>/ch<chapter>.pdf`). */
  readonly storageSubject: NoteSubject;
  /** Our copy is present AND the current edition (see the module header). */
  readonly stored: boolean;
}

export const NCERT_PDF_HOST = "https://ncert.nic.in/textbook/pdf/";

/** The NCERT file code: `jemh108`, `jesc105`. */
export function ncertCode(row: Pick<NcertBookChapter, "book" | "chapter">): string {
  return `${row.book === "Maths" ? "jemh" : "jesc"}1${String(row.chapter).padStart(2, "0")}`;
}

/** The official chapter PDF on ncert.nic.in. */
export function ncertOfficialUrl(row: Pick<NcertBookChapter, "book" | "chapter">): string {
  return `${NCERT_PDF_HOST}${ncertCode(row)}.pdf`;
}

/** The book's full name as NCERT prints it. */
export function ncertBookName(book: NcertBook): string {
  return book === "Maths" ? "Mathematics" : "Science";
}

const m = (chapter: number, title: string, slug: string, stored = true): NcertBookChapter => ({
  book: "Maths",
  chapter,
  title,
  slug,
  storageSubject: "maths",
  stored,
});

const s = (
  chapter: number,
  title: string,
  slug: string,
  storageSubject: NoteSubject,
  stored = true,
): NcertBookChapter => ({ book: "Science", chapter, title, slug, storageSubject, stored });

export const NCERT_CLASS10_CHAPTERS: readonly NcertBookChapter[] = [
  m(1, "Real Numbers", "real-numbers"),
  m(2, "Polynomials", "polynomials"),
  m(3, "Pair of Linear Equations in Two Variables", "pair-of-linear-equations"),
  m(4, "Quadratic Equations", "quadratic-equations"),
  m(5, "Arithmetic Progressions", "arithmetic-progression"),
  m(6, "Triangles", "triangles"),
  m(7, "Coordinate Geometry", "coordinate-geometry"),
  m(8, "Introduction to Trigonometry", "trigonometry"),
  // In Storage since 14 Oct 2026 (NCERT-BOOKS-1b: ncert/maths/ch9.pdf → 206, page 1 reads "Some
  // Applications of Trigonometry … 133 · 9.1 Heights and Distances", 11 pages).
  m(9, "Some Applications of Trigonometry", "trigonometry"),
  m(10, "Circles", "circles"),
  m(11, "Areas Related to Circles", "areas-related-to-circles"),
  m(12, "Surface Areas and Volumes", "surface-areas-and-volumes"),
  m(13, "Statistics", "statistics"),
  m(14, "Probability", "probability"),
  s(1, "Chemical Reactions and Equations", "chemical-reactions-and-equations", "chemistry"),
  s(2, "Acids, Bases and Salts", "acids-bases-and-salts", "chemistry"),
  s(3, "Metals and Non-metals", "metals-and-non-metals", "chemistry"),
  s(4, "Carbon and its Compounds", "carbon-and-its-compounds", "chemistry"),
  s(5, "Life Processes", "life-processes", "biology"),
  s(6, "Control and Coordination", "control-and-coordination", "biology"),
  s(7, "How do Organisms Reproduce?", "how-do-organisms-reproduce", "biology"),
  s(8, "Heredity", "heredity", "biology"),
  s(9, "Light – Reflection and Refraction", "light-reflection-and-refraction", "physics"),
  s(10, "The Human Eye and the Colourful World", "human-eye-and-colourful-world", "physics"),
  s(11, "Electricity", "electricity", "physics"),
  s(12, "Magnetic Effects of Electric Current", "magnetic-effects-of-electric-current", "physics"),
  s(13, "Our Environment", "our-environment", "biology"),
];

/** The practice route the notes page already uses (`Note.tsx` practicePath), returning here. */
export function ncertPracticePath(row: NcertBookChapter): string {
  return (
    `/practice/10/${row.book}?topic=${encodeURIComponent(row.slug)}` +
    `&returnTo=${encodeURIComponent("/ncert-class-10")}` +
    `&backLabel=${encodeURIComponent("Back to NCERT books")}`
  );
}
