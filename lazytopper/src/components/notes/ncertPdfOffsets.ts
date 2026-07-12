/**
 * ncertPdfOffsets.ts — per-chapter NCERT PDF page offsets (k).
 *
 * A note's clickable "p.N" cite (see <CiteLine> in Note.tsx) carries the printed
 * TEXTBOOK page number (`source.ncert_page`) — that is what the student sees and
 * it must stay unchanged. But the PDFs uploaded to Firebase Storage are
 * PER-CHAPTER files (`ncert/{subject}/ch{N}.pdf`, see buildNcertPdfUrl) whose
 * internal page 1 is that chapter's FIRST page — NOT textbook page N. So the PDF
 * `#page=` fragment must be the page number WITHIN the chapter file:
 *
 *     pdf_page (1-based) = textbook_page - k        (clamp >= 1)
 *
 * where k = (textbook page printed on the chapter file's first PDF page) - 1.
 *
 * k was derived EMPIRICALLY per chapter by reading the printed page numbers off
 * the source NCERT PDFs with pymupdf, then verified against EVERY `ncert_page`
 * cite in that chapter's spec (2026-07-12 — see
 * `docs/.../ncert-upload-manifest`). k = 0 means the chapter file already opens
 * on textbook page 1 (page-aligned: real-numbers, chemical-reactions).
 *
 * Keys mirror the Storage object-path segment `{subject}/ch{chapter}`, so this
 * map is the single companion to the upload manifest — one row per uploaded PDF.
 * This lives here (not in the specs) so the verbatim content specs stay pure and
 * the validator is untouched: the offset is a property of the PDF artifact, not
 * of the cited content.
 */
import type { NoteSubject } from "./noteSpec.types";

/** Build the offset-map / Storage-path key for a (subject, chapter) pair. */
export function ncertPdfKey(subject: NoteSubject, chapter: number): string {
  return `${subject}/ch${chapter}`;
}

/**
 * Per-chapter offset k, keyed by `{subject}/ch{chapter}` (mirrors the Storage
 * path). 26 chapters — the 13 Science (jesc1NN) + 13 Maths (jemh1NN) note specs.
 */
export const NCERT_PDF_PAGE_OFFSETS: Record<string, number> = {
  // ── Physics (Science book jesc1NN) ────────────────────────────────
  "physics/ch9": 133, // Light – Reflection and Refraction  (jesc109)
  "physics/ch10": 160, // The Human Eye and the Colourful World (jesc110)
  "physics/ch11": 170, // Electricity                        (jesc111)
  "physics/ch12": 194, // Magnetic Effects of Electric Current (jesc112)
  // ── Chemistry (Science book jesc1NN) ──────────────────────────────
  "chemistry/ch1": 0, // Chemical Reactions and Equations    (jesc101)
  "chemistry/ch2": 16, // Acids, Bases and Salts             (jesc102)
  "chemistry/ch3": 36, // Metals and Non-metals              (jesc103)
  "chemistry/ch4": 57, // Carbon and its Compounds           (jesc104)
  // ── Biology (Science book jesc1NN) ────────────────────────────────
  "biology/ch5": 78, // Life Processes                       (jesc105)
  "biology/ch6": 99, // Control and Coordination             (jesc106)
  "biology/ch7": 112, // How do Organisms Reproduce?         (jesc107)
  "biology/ch8": 127, // Heredity                            (jesc108)
  "biology/ch13": 207, // Our Environment                    (jesc113)
  // ── Maths (Mathematics book jemh1NN) ──────────────────────────────
  "maths/ch1": 0, // Real Numbers                            (jemh101)
  "maths/ch2": 9, // Polynomials                             (jemh102)
  "maths/ch3": 23, // Pair of Linear Equations in Two Variables (jemh103)
  "maths/ch4": 37, // Quadratic Equations                    (jemh104)
  "maths/ch5": 48, // Arithmetic Progressions                (jemh105)
  "maths/ch6": 72, // Triangles                              (jemh106)
  "maths/ch7": 98, // Coordinate Geometry                    (jemh107)
  "maths/ch8": 112, // Introduction to Trigonometry          (jemh108)
  "maths/ch10": 143, // Circles                              (jemh110)
  "maths/ch11": 153, // Areas Related to Circles             (jemh111)
  "maths/ch12": 160, // Surface Areas and Volumes            (jemh112)
  "maths/ch13": 170, // Statistics                           (jemh113)
  "maths/ch14": 201, // Probability                          (jemh114)
};

/**
 * Map a printed NCERT textbook page to the 1-based page WITHIN the per-chapter
 * Storage PDF. Unmapped chapters fall back to page-aligned (k = 0); the result
 * is clamped to >= 1 so a cite on the chapter's opening page never underflows.
 */
export function ncertPdfPage(
  subject: NoteSubject,
  chapter: number,
  ncertPage: number,
): number {
  const k = NCERT_PDF_PAGE_OFFSETS[ncertPdfKey(subject, chapter)] ?? 0;
  return Math.max(1, ncertPage - k);
}
