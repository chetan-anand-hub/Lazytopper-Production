import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import NcertChapterReader from "../components/ncert/NcertChapterReader";
import { useReturnTicket } from "../components/navigation/ReturnTicket";
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
import { booksOf, solutionsChapterForNcert, solutionsPath } from "../config/solutionsPublishSafe";
import "./ncertBooks.css";

/** The row's "Solutions" link: its solutions page (NCERT book first, else Exemplar), or nothing. */
export function solutionsHrefForRow(row: Pick<NcertBookChapter, "book" | "slug" | "chapter">): string | null {
  if (row.book !== "Maths") return null;
  const ch = solutionsChapterForNcert(row.slug, row.chapter);
  const book = ch ? booksOf(ch)[0] : undefined;
  return ch && book ? solutionsPath(book, ch.slug) : null;
}

function solutionsRowLink(row: NcertBookChapter) {
  const href = solutionsHrefForRow(row);
  return href ? (
    <Link to={href} data-testid={`nb-solutions-${ncertCode(row)}`}>
      Solutions
    </Link>
  ) : null;
}

/**
 * NcertBooksPage — `/ncert-class-10` (NCERT-BOOKS-1, lane G; D210 / D211 / D213; 1b owner 14 Oct).
 *
 * The NCERT Class 10 Maths and Science textbooks for the 2027 boards, chapter by chapter,
 * read ON LazyTopper. Each row: "Read the chapter" (our stored copy drawn in an on-site reader,
 * loaded only on click; the official ncert.nic.in file when our copy is missing or fails),
 * and always beside it the chapter's Notes, Formulae, Practice and Check my answer.
 *
 * ★ PRODUCT CHROME (1b). The route sits in the desktop shell (blue sidebar, where "NCERT Books"
 * is a rail item) and is self-chromed on mobile, the same treatment as `/cbse/class-10`. A back
 * link (return ticket, else Home) is the exit at every width.
 *
 * ★ SUBJECT TOGGLE (1b). Maths | Science is a `role="tablist"`, the CBSE page's grammar.
 * `?subject=science` (or the old `#science` jump link) preselects it. BOTH panels stay mounted
 * and toggle `hidden`, so the prerender and a crawler carry all 27 rows; the capture loads the
 * bare path, so the frozen body is the default (Maths) view.
 *
 * ★ HONEST LINKS ONLY (D210 §2). Every link is a route that exists today: `/notes/<slug>`,
 * `/notes/<slug>#formulae` (NOTES-FORMULA-3a; every chapter's note has a formula strip — a
 * guard asserts it), the practice route the notes page uses, `/check-improve`.
 *
 * ★ THE CREDIT LINE IS ALWAYS VISIBLE (D213 §1): "NCERT Class 10 <Book>, Chapter N (code) ·
 * official copy ncert.nic.in" — a trust signal for parents and search engines.
 *
 * ★ ONE COMPONENT AT EVERY WIDTH, responsive by CSS alone (owner ruling (a)); nothing fetched on
 * render, so a signed-out reader and a crawler see the same page the prerender freezes.
 */

const BOOKS: readonly NcertBook[] = ["Maths", "Science"];
type BookKey = "maths" | "science";
const keyOf = (book: NcertBook): BookKey => (book === "Maths" ? "maths" : "science");

/** `?subject=` (or the legacy `#maths` / `#science` jump hash) → the open tab; Maths otherwise. */
export function ncertSubjectFrom(param: string | null, hash: string): BookKey {
  const p = String(param || "").trim().toLowerCase();
  if (p === "science" || p === "maths") return p;
  return hash.replace(/^#/, "").toLowerCase() === "science" ? "science" : "maths";
}

function ChapterRow({
  row,
  readCode,
  onReaderClosed,
}: {
  row: NcertBookChapter;
  readCode: string;
  onReaderClosed: () => void;
}) {
  const code = ncertCode(row);
  return (
    <li className="lt-nb__row" data-testid={`nb-row-${code}`}>
      <div className="lt-nb__rowhead">
        <span className="lt-nb__num">Ch {row.chapter}</span>
        <h3 className="lt-nb__title">{row.title}</h3>
      </div>
      <div className="lt-nb__actions">
        <NcertChapterReader row={row} openRequested={readCode === code} onClosed={onReaderClosed} />
        <span className="lt-nb__links">
          <Link to={`/notes/${row.slug}`}>Notes</Link>
          <Link to={`/notes/${row.slug}#formulae`}>Formulae</Link>
          <Link to={ncertPracticePath(row)}>Practice</Link>
          <Link to="/check-improve">Check my answer</Link>
          {/* SOLUTIONS-1/2 — only where a solutions page exists, never a placeholder (NCERT page first, else Exemplar). */}
          {solutionsRowLink(row)}
        </span>
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
  const [params, setParams] = useSearchParams();
  // NCERT-BOOKS-1b — `?read=<code>` (the rail picker's landing) opens that chapter's reader.
  const readCode = String(params.get("read") || "").trim().toLowerCase();
  const onReaderClosed = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("read");
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [setParams]);
  const { hash } = useLocation();
  const [subject, setSubject] = useState<BookKey>(() => ncertSubjectFrom(params.get("subject"), hash));
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // A later deep link within the page (e.g. an in-app link to ?subject=science) follows too.
  useEffect(() => {
    setSubject(ncertSubjectFrom(params.get("subject"), hash));
  }, [params, hash]);

  const ticket = useReturnTicket();
  const backHref = ticket?.path ?? "/";
  const backLabel = ticket?.label ?? "Home";

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next: BookKey = subject === "maths" ? "science" : "maths";
    setSubject(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <main className="lt-nb" data-testid="ncert-books-page">
      <header className="lt-nb__hero">
        <div className="lt-nb__w">
          <Link to={backHref} className="lt-nb__back">
            <span aria-hidden="true">←</span>
            <span>{backLabel}</span>
          </Link>
          <p className="lt-nb__eyebrow">CBSE Class 10 · Boards 2027 · NCERT 2026-27 edition</p>
          <h1>NCERT Class 10 Maths and Science Books, Chapter-wise</h1>
          <p className="lt-nb__sub">
            Read every chapter of the NCERT Class 10 Mathematics and Science textbooks here, then go straight to that
            chapter&rsquo;s notes, formulae and practice, or photograph a written answer and see the marks for every
            step.
          </p>
        </div>
      </header>

      <div className="lt-nb__w lt-nb__body">
        <div className="lt-nb__tabs" role="tablist" aria-label="Subject">
          {BOOKS.map((book) => {
            const key = keyOf(book);
            const count = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === book).length;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`nb-tab-${key}`}
                className="lt-nb__tab"
                aria-selected={key === subject}
                aria-controls={`nb-panel-${key}`}
                tabIndex={key === subject ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[key] = node;
                }}
                onClick={() => setSubject(key)}
                onKeyDown={onTabKeyDown}
                data-testid={`nb-tab-${key}`}
              >
                {ncertBookName(book)} <span className="lt-nb__tabn">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Both panels stay mounted and toggle `hidden`: a crawler reads all 27 rows. */}
        {BOOKS.map((book) => {
          const rows = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === book);
          const key = keyOf(book);
          return (
            <section
              key={book}
              id={`nb-panel-${key}`}
              role="tabpanel"
              aria-labelledby={`nb-tab-${key}`}
              className="lt-nb__book"
              hidden={key !== subject}
              data-testid={`nb-panel-${key}`}
            >
              <h2 id={key}>
                NCERT Class 10 {ncertBookName(book)} <span className="lt-nb__count">{rows.length} chapters</span>
              </h2>
              <ol className="lt-nb__list">
                {rows.map((row) => (
                  <ChapterRow
                    key={`${row.book}-${row.chapter}`}
                    row={row}
                    readCode={readCode}
                    onReaderClosed={onReaderClosed}
                  />
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
