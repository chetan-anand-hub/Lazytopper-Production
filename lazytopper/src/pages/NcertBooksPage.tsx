import { Link } from "react-router-dom";

import NcertChapterReader from "../components/ncert/NcertChapterReader";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  NCERT_CLASS10_CHAPTERS,
  ncertBookName,
  ncertCode,
  ncertOfficialUrl,
  ncertPracticePath,
  type NcertBook,
  type NcertBookChapter,
} from "../config/ncertBooks";
import "./ncertBooks.css";

/**
 * NcertBooksPage — `/ncert-class-10` (NCERT-BOOKS-1, lane G; D210 / D211 / D213).
 *
 * The NCERT Class 10 Maths and Science textbooks for the 2027 boards, chapter by chapter,
 * read ON LazyTopper. Each row: "Read the chapter" (our stored copy in an on-site reader,
 * loaded only on click; the official ncert.nic.in file when our copy is missing or fails),
 * and always beside it the chapter's Notes, Practice and Check my answer.
 *
 * ★ HONEST LINKS ONLY (D210 §2). Every link is a route that exists today: `/notes/<slug>`,
 * the practice route the notes page uses, `/check-improve`. No link to pages that do not
 * exist yet and no "coming soon" stub. (The Formulae & Tricks anchor is added once
 * NOTES-FORMULA-3a is LIVE.)
 *
 * ★ THE CREDIT LINE IS ALWAYS VISIBLE (D213 §1): "NCERT Class 10 <Book>, Chapter N (code) ·
 * official copy ncert.nic.in" — a trust signal for parents and search engines.
 *
 * ★ ONE COMPONENT AT EVERY WIDTH, nothing fetched on render: a signed-out reader and a
 * crawler see the same page, which is what the prerender freezes.
 */

const BOOKS: readonly NcertBook[] = ["Maths", "Science"];

function ChapterRow({ row }: { row: NcertBookChapter }) {
  const code = ncertCode(row);
  return (
    <li className="lt-nb__row" data-testid={`nb-row-${code}`}>
      <div className="lt-nb__rowhead">
        <span className="lt-nb__num">Ch {row.chapter}</span>
        <h3 className="lt-nb__title">{row.title}</h3>
      </div>
      <div className="lt-nb__actions">
        <NcertChapterReader row={row} />
        <Link to={`/notes/${row.slug}`}>Notes</Link>
        <Link to={ncertPracticePath(row)}>Practice</Link>
        <Link to="/check-improve">Check my answer</Link>
      </div>
      <p className="lt-nb__credit">
        NCERT Class 10 {ncertBookName(row.book)}, Chapter {row.chapter} ({code}) · official copy{" "}
        <a href={ncertOfficialUrl(row)} target="_blank" rel="noopener noreferrer">
          ncert.nic.in
        </a>
      </p>
    </li>
  );
}

export default function NcertBooksPage() {
  return (
    <main className="lt-nb" data-testid="ncert-books-page">
      <header className="lt-nb__hero">
        <div className="lt-nb__w">
          <p className="lt-nb__eyebrow">CBSE Class 10 · Boards 2027 · NCERT 2026-27 edition</p>
          <h1>NCERT Class 10 Maths and Science Books, Chapter-wise</h1>
          <p className="lt-nb__sub">
            Read every chapter of the NCERT Class 10 Mathematics and Science textbooks here, then go straight to that
            chapter&rsquo;s notes and practice, or photograph a written answer and see the marks for every step.
          </p>
          <p className="lt-nb__jump">
            <a href="#maths">Mathematics · 14 chapters</a>
            <a href="#science">Science · 13 chapters</a>
          </p>
        </div>
      </header>

      <div className="lt-nb__w lt-nb__body">
        {BOOKS.map((book) => {
          const rows = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === book);
          const id = book === "Maths" ? "maths" : "science";
          return (
            <section key={book} aria-labelledby={id} className="lt-nb__book">
              <h2 id={id}>
                NCERT Class 10 {ncertBookName(book)} <span className="lt-nb__count">{rows.length} chapters</span>
              </h2>
              <ol className="lt-nb__list">
                {rows.map((row) => (
                  <ChapterRow key={`${row.book}-${row.chapter}`} row={row} />
                ))}
              </ol>
            </section>
          );
        })}

        <section aria-labelledby="nb-about" className="lt-nb__about">
          <h2 id="nb-about">About these books</h2>
          <p>
            These are the NCERT textbooks for the 2026-27 session, the edition the CBSE Class 10 board exam in 2027
            follows. Chapters removed from the syllabus are not listed. Mathematics Chapters 8 and 9 (trigonometry and
            its applications) share one set of LazyTopper notes. The official sample papers and marking schemes are on
            our <Link to="/cbse/class-10">CBSE Class 10 page</Link>.
          </p>
        </section>

        <p className="lt-nb__fine">
          LazyTopper is an independent platform and is not affiliated with CBSE or NCERT. Textbook copyright belongs to
          NCERT.
        </p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
