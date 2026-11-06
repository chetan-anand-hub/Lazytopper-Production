import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { sendAnalyticsHit } from "../analytics/analytics";
import NcertChapterReader from "../components/ncert/NcertChapterReader";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  NCERT_CLASS10_CHAPTERS,
  NCERT_HUB_PATH,
  ncertBookName,
  ncertCode,
  ncertHubChapterPath,
  ncertHubSlug,
  ncertHubSubjectOf,
  ncertHubSubjectPath,
  ncertOfficialUrl,
  type NcertBook,
  type NcertBookChapter,
  type NcertHubSubject,
} from "../config/ncertBooks";
import { booksOf, solutionsChapterForNcert, solutionsPath, type SolutionsChapter } from "../config/solutionsPublishSafe";
import { chapterUnit, UNIT_MARKS } from "../config/syllabusUnits2026-27";
import { hasUsedFreeCheck, isFreeCheckClientEnabled } from "../services/freeCheckClient";
import "./ncertBooks.css";

/** The row's "Solutions" link: its solutions page (NCERT book first, else Exemplar), or nothing. */
export function solutionsHrefForRow(row: Pick<NcertBookChapter, "book" | "slug" | "chapter">): string | null {
  // SOLUTIONS-SCI-1: Science rows link too. The chapter is matched by slug AND number AND subject,
  // so Science Ch 11 (electricity) can never resolve to Maths Ch 11.
  const found = solutionsChapterForNcert(row.slug, row.chapter);
  const ch = found && found.subject === row.book ? found : null;
  const book = ch ? booksOf(ch)[0] : undefined;
  return ch && book ? solutionsPath(book, ch.slug) : null;
}

/**
 * NcertBooksPage — `/ncert-class-10`, the NCERT Hub (NCERT-HUB-1, owner approval 6 Nov 2026 20:32 IST;
 * before it NCERT-BOOKS-1, lane G, D210 / D211 / D213).
 *
 * Pick a subject (chips) and a chapter (dropdown) — the Practice Hub's picker grammar — and ONE card
 * shows that chapter's NCERT and Exemplar solutions, the on-site book reader, the important
 * questions, the notes and the answer check.
 *
 * ★ STATE IN THE URL. `?subject=maths&ch=<slug>` (`ncertHubSlug`): shareable, and every pick is a
 * history entry so back / forward walk it. With no `?subject=` the last subject this browser picked is
 * used (localStorage, every access in try / catch); the legacy `#science` hash still works, and the
 * rail picker's `?read=<code>` opens that chapter with its reader. The query never forms a second
 * canonical (`canonicalPathFor` drops it): every hub URL canonicalises to `/ncert-class-10`.
 *
 * ★ HONEST TILES (owner): a tile renders only when its target exists for THAT chapter. The NCERT and
 * Exemplar tiles are driven by the solutions config (`SOLUTIONS_CHAPTERS`, the same allowlist the
 * solutions pages publish from), matched by subject AND chapter number AND slug, so a Science chapter
 * gets them the build its page is published, and never before. The question count is the
 * allowlist's length: every allowlisted id is served and never withheld (solutions guards). The
 * weightage chip is the real 2026-27 unit marks (`syllabusUnits2026-27`), never an estimate. No
 * "coming soon" tile, ever.
 *
 * ★ CRAWLABLE. Nothing is fetched on render. The prerender captures the bare path (empty state), and
 * the "All N chapters" lists of BOTH subjects stay in the HTML (the other subject's is `hidden`), each
 * chapter with links to its indexable pages (solutions, notes).
 *
 * ★ PRODUCT CHROME. Desktop shell (the rail's "NCERT Hub"), self-chromed on mobile; the NAV-1 header
 * row owns Back. ONE component at every width, responsive by CSS alone; no inline style objects.
 */

const BOOKS: readonly NcertBook[] = ["Maths", "Science"];
type BookKey = NcertHubSubject;
const keyOf = ncertHubSubjectOf;
const bookOf = (key: BookKey): NcertBook => (key === "maths" ? "Maths" : "Science");

/** The last subject this browser picked on the hub (a per-viewer convenience; never required). */
export const NCERT_HUB_SUBJECT_KEY = "lazytopper.ncertHub.subject";

function readStoredSubject(): BookKey | null {
  try {
    const v = window.localStorage.getItem(NCERT_HUB_SUBJECT_KEY);
    return v === "maths" || v === "science" ? v : null;
  } catch {
    return null;
  }
}

function storeSubject(key: BookKey): void {
  try {
    window.localStorage.setItem(NCERT_HUB_SUBJECT_KEY, key);
  } catch {
    /* a private window or blocked storage: the URL still carries the choice */
  }
}

/** `?subject=` (or the legacy `#maths` / `#science` jump hash) → the subject; Maths otherwise. */
export function ncertSubjectFrom(param: string | null, hash: string): BookKey {
  const p = String(param || "").trim().toLowerCase();
  if (p === "science" || p === "maths") return p;
  return hash.replace(/^#/, "").toLowerCase() === "science" ? "science" : "maths";
}

/** True when the URL names the subject itself (a param or the legacy hash). */
function urlNamesSubject(param: string | null, hash: string): boolean {
  const p = String(param || "").trim().toLowerCase();
  const h = hash.replace(/^#/, "").toLowerCase();
  return p === "science" || p === "maths" || h === "science" || h === "maths";
}

/**
 * The hub's state from the URL: the chapter (`?ch=`, else the `?read=` code), and the subject (that
 * chapter's book, else `?subject=` / the hash, else the stored subject, else Maths). A `?ch=` that
 * names no chapter, or a chapter of the other subject, is ignored rather than guessed.
 */
export function ncertHubState(
  params: URLSearchParams,
  hash: string,
  stored: BookKey | null,
): { subject: BookKey; row: NcertBookChapter | null; readCode: string } {
  const readCode = String(params.get("read") || "").trim().toLowerCase();
  const chSlug = String(params.get("ch") || "").trim().toLowerCase();
  const subjectParam = params.get("subject");
  const named = urlNamesSubject(subjectParam, hash);
  const byCh = chSlug ? NCERT_CLASS10_CHAPTERS.find((r) => ncertHubSlug(r) === chSlug) ?? null : null;
  const byRead = readCode ? NCERT_CLASS10_CHAPTERS.find((r) => ncertCode(r) === readCode) ?? null : null;
  const picked = byCh ?? byRead;
  const subject: BookKey = named ? ncertSubjectFrom(subjectParam, hash) : picked ? keyOf(picked.book) : stored ?? "maths";
  const row = picked && keyOf(picked.book) === subject ? picked : null;
  return { subject, row, readCode };
}

/** The published solutions chapter for an NCERT row (subject + chapter number + slug), or null. */
export function hubSolutionsChapter(row: NcertBookChapter): SolutionsChapter | null {
  const ch = solutionsChapterForNcert(row.slug, row.chapter);
  // `subject` is compared as a string: the config's union widens when Science pages are published.
  return ch && String(ch.subject) === row.book ? ch : null;
}

export type HubTileId = "ncert" | "exemplar" | "read" | "important" | "notes" | "check";

export interface HubTile {
  readonly id: HubTileId;
  readonly title: string;
  readonly sub: string;
  /** Internal route; absent for the reader tile (it opens in place). */
  readonly to?: string;
}

/**
 * The tiles for one chapter, in the owner's order, each only when its target exists. `freeCheckOpen`
 * is whether this browser still has its first free answer check (the line under "Check my answer").
 */
export function hubTiles(row: NcertBookChapter, freeCheckOpen: boolean): HubTile[] {
  const sol = hubSolutionsChapter(row);
  const tiles: HubTile[] = [];
  if (sol && sol.ncert.length > 0) {
    tiles.push({
      id: "ncert",
      title: "NCERT Solutions",
      sub: `${sol.ncert.length} question${sol.ncert.length === 1 ? "" : "s"} · try first`,
      to: solutionsPath("ncert", sol.slug),
    });
  }
  if (sol && sol.exemplar.length > 0) {
    tiles.push({
      id: "exemplar",
      title: "Exemplar Solutions",
      sub: `${sol.exemplar.length} question${sol.exemplar.length === 1 ? "" : "s"} · harder practice`,
      to: solutionsPath("exemplar", sol.slug),
    });
  }
  tiles.push({ id: "read", title: "Read the chapter", sub: "Official NCERT 2026-27" });
  tiles.push({
    id: "important",
    title: "Important Qs",
    sub: "Likely board questions",
    // The Exam Trends deep link: the subject's Important Questions scoped to the chapter by `?topic=<slug>`.
    to: `/highly-probable/10/${row.book}?topic=${encodeURIComponent(row.slug)}`,
  });
  tiles.push({ id: "notes", title: "Notes & Formulae", sub: "Revision notes, formula strip", to: `/notes/${row.slug}` });
  tiles.push({
    id: "check",
    title: "Check my answer",
    sub: freeCheckOpen ? "First check free" : "CBSE step marking",
    to: "/check-improve",
  });
  return tiles;
}

const TILE_ICON: Readonly<Record<HubTileId, string>> = {
  ncert: "✍️",
  exemplar: "🧩",
  read: "📖",
  important: "⭐",
  notes: "📝",
  check: "📸",
};

/** The unit-weightage chip ("Geometry · 15 of 80 marks"), only where the 2026-27 syllabus gives it. */
export function hubWeightage(row: NcertBookChapter): string | null {
  const unit = chapterUnit(row.slug);
  if (!unit) return null;
  const total = Object.values(UNIT_MARKS[unit.subject]).reduce((a, b) => a + b, 0);
  return total > 0 ? `${unit.unitName} · ${unit.unitMarks} of ${total} marks` : null;
}

/**
 * NCERT-HUB-1 analytics — vendor-only events (GA4 / Vercel), the NAV-PRICING-1 pattern: the name plus
 * coarse slugs (subject, chapter slug, tile id), never an id, a uid or text. Not in the first-party
 * activity allow-list, so it adds nothing there.
 */
function trackHub(name: "ncert_hub_pick" | "ncert_hub_tile", data: Record<string, string>): void {
  try {
    sendAnalyticsHit("event", { name, data }, { ga4: data });
  } catch {
    /* analytics must never break the page */
  }
}

function freeCheckOpenNow(): boolean {
  try {
    return isFreeCheckClientEnabled() && !hasUsedFreeCheck();
  } catch {
    return false;
  }
}

function ChapterCard({
  row,
  readOpen,
  onReaderClosed,
}: {
  row: NcertBookChapter;
  readOpen: boolean;
  onReaderClosed: () => void;
}) {
  const code = ncertCode(row);
  const subject = keyOf(row.book);
  const chapter = ncertHubSlug(row);
  const weight = hubWeightage(row);
  const tiles = hubTiles(row, freeCheckOpenNow());
  const tap = (tile: HubTileId) => trackHub("ncert_hub_tile", { tile, subject, chapter });

  return (
    <article className="lt-nb__chcard" data-testid="nb-card" data-chapter={chapter} aria-labelledby="nb-card-h">
      <div className="lt-nb__cardtop">
        <p className="lt-nb__cardk">
          {row.book} · Chapter {row.chapter}
        </p>
        <h2 id="nb-card-h">{row.title}</h2>
        {weight ? (
          <span className="lt-nb__weight" data-testid="nb-weight">
            {weight}
          </span>
        ) : null}
      </div>
      <ul className="lt-nb__tiles">
        {tiles.map((t) => {
          const inner = (
            <>
              <span className="lt-nb__ti" aria-hidden="true">
                {TILE_ICON[t.id]}
              </span>
              <span className="lt-nb__tt">{t.title}</span>
              <span className="lt-nb__ts">{t.sub}</span>
            </>
          );
          const cls = `lt-nb__tile${t.id === "ncert" ? " lt-nb__tile--pri" : ""}`;
          return (
            <li key={t.id} data-testid={`nb-tile-${t.id}`}>
              {t.id === "read" ? (
                <NcertChapterReader
                  row={row}
                  openRequested={readOpen}
                  onClosed={onReaderClosed}
                  triggerClassName={cls}
                  onTrigger={() => tap("read")}
                >
                  {inner}
                </NcertChapterReader>
              ) : (
                <Link className={cls} to={t.to ?? NCERT_HUB_PATH} onClick={() => tap(t.id)}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {/* D213 §1 — the credit line, always visible: a trust signal for parents and search engines. */}
      <p className="lt-nb__credit">
        NCERT Class 10 {ncertBookName(row.book)}, Chapter {row.chapter} ({code}) · official copy{" "}
        <a href={ncertOfficialUrl(row)} target="_blank" rel="noopener noreferrer">
          ncert.nic.in
        </a>
      </p>
    </article>
  );
}

/** One chapter in the "All N chapters" list: the chapter (opens its card here) + its indexable pages. */
function AllChaptersRow({ row, onPick }: { row: NcertBookChapter; onPick: (row: NcertBookChapter) => void }) {
  const sol = hubSolutionsChapter(row);
  return (
    <li className="lt-nb__allrow" data-testid={`nb-row-${ncertCode(row)}`}>
      <Link
        className="lt-nb__allch"
        to={ncertHubChapterPath(row)}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          onPick(row);
        }}
        preventScrollReset
      >
        Ch {row.chapter} {row.title}
      </Link>
      <span className="lt-nb__alllinks">
        {sol && sol.ncert.length > 0 ? <Link to={solutionsPath("ncert", sol.slug)}>NCERT</Link> : null}
        {sol && sol.exemplar.length > 0 ? <Link to={solutionsPath("exemplar", sol.slug)}>Exemplar</Link> : null}
        <Link to={`/notes/${row.slug}`}>Notes</Link>
      </span>
    </li>
  );
}

export default function NcertBooksPage() {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  // Read once per mount: the stored subject is only the default when the URL names none.
  const [stored] = useState<BookKey | null>(() => readStoredSubject());
  const { subject, row, readCode } = useMemo(() => ncertHubState(params, hash, stored), [params, hash, stored]);
  const book = bookOf(subject);
  const rowsOf = (b: NcertBook) => NCERT_CLASS10_CHAPTERS.filter((r) => r.book === b);
  const subjectRows = rowsOf(book);

  // Keep the stored default in step with whatever the URL shows (a shared link counts as a pick).
  useEffect(() => {
    if (params.get("subject") || params.get("ch")) storeSubject(subject);
  }, [params, subject]);

  const pickSubject = (key: BookKey) => {
    if (key === subject && !row) return;
    storeSubject(key);
    trackHub("ncert_hub_pick", { kind: "subject", subject: key });
    setParams(new URLSearchParams({ subject: key }), { preventScrollReset: true });
  };

  const pickChapter = useCallback(
    (r: NcertBookChapter) => {
      const key = keyOf(r.book);
      storeSubject(key);
      trackHub("ncert_hub_pick", { kind: "chapter", subject: key, chapter: ncertHubSlug(r) });
      setParams(new URLSearchParams({ subject: key, ch: ncertHubSlug(r) }), { preventScrollReset: true });
    },
    [setParams],
  );

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

  return (
    <main className="lt-nb" data-testid="ncert-books-page">
      <header className="lt-nb__hero">
        <div className="lt-nb__w lt-nb__w--hub">
          {/* NAV-FIX-1: the page-level back link is gone — the NAV-1 header row owns Back (one per page). */}
          <p className="lt-nb__eyebrow">CBSE Class 10 · Boards 2027 · NCERT 2026-27 edition</p>
          <h1>NCERT Hub — Class 10 Books, NCERT &amp; Exemplar Solutions</h1>
          <p className="lt-nb__sub">
            Pick a subject and chapter: read the official 2026-27 book, work through the NCERT and Exemplar questions
            with step-by-step solutions, and see the important questions.
          </p>
        </div>
      </header>

      <div className="lt-nb__w lt-nb__w--hub lt-nb__body">
        <nav aria-label="Breadcrumb" className="lt-nb__crumbs" data-testid="nb-crumbs">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span>{" "}
          <Link to={NCERT_HUB_PATH} aria-current={row || params.get("subject") ? undefined : "page"}>
            NCERT Hub
          </Link>
          {row || params.get("subject") ? (
            <>
              {" "}
              <span aria-hidden="true">›</span>{" "}
              <Link to={ncertHubSubjectPath(subject)} aria-current={row ? undefined : "page"}>
                {book}
              </Link>
            </>
          ) : null}
          {row ? (
            <>
              {" "}
              <span aria-hidden="true">›</span>{" "}
              <Link to={ncertHubChapterPath(row)} aria-current="page">
                Ch {row.chapter} {row.title}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="lt-nb__hub">
          <section className="lt-nb__picker" aria-label="Pick a chapter" data-testid="nb-picker">
            <p className="lt-nb__lbl" id="nb-subject-lbl">
              Subject
            </p>
            <div className="lt-nb__chips" role="group" aria-labelledby="nb-subject-lbl">
              {BOOKS.map((b) => {
                const key = keyOf(b);
                return (
                  <button
                    key={key}
                    type="button"
                    className="lt-nb__chip"
                    aria-pressed={key === subject}
                    onClick={() => pickSubject(key)}
                    data-testid={`nb-subject-${key}`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
            <label className="lt-nb__lbl" htmlFor="nb-chapter">
              Chapter
            </label>
            <select
              id="nb-chapter"
              className={`lt-nb__select${row ? "" : " lt-nb__select--empty"}`}
              value={row ? ncertHubSlug(row) : ""}
              onChange={(e) => {
                const r = subjectRows.find((x) => ncertHubSlug(x) === e.target.value);
                if (r) pickChapter(r);
              }}
              data-testid="nb-chapter"
            >
              <option value="" disabled>
                Choose a chapter
              </option>
              {subjectRows.map((r) => (
                <option key={ncertCode(r)} value={ncertHubSlug(r)}>
                  Ch {r.chapter} · {r.title}
                </option>
              ))}
            </select>
            <p className="lt-nb__pickfoot">{subjectRows.length} chapters · NCERT 2026-27 edition</p>
          </section>

          <div className="lt-nb__result">
            {row ? (
              <ChapterCard
                key={ncertCode(row)}
                row={row}
                readOpen={readCode === ncertCode(row)}
                onReaderClosed={onReaderClosed}
              />
            ) : (
              <p className="lt-nb__empty" data-testid="nb-empty">
                Pick a chapter to see its book, NCERT &amp; Exemplar solutions, important questions and notes — all in
                one place.
              </p>
            )}
          </div>
        </div>

        {/* Both subjects' lists stay in the HTML (the other one `hidden`): a crawler reads all 27 chapters. */}
        {BOOKS.map((b) => {
          const key = keyOf(b);
          const rows = rowsOf(b);
          return (
            <details
              key={key}
              className="lt-nb__all"
              hidden={key !== subject}
              data-testid={`nb-all-${key}`}
            >
              <summary>
                All {rows.length} {b} chapters
              </summary>
              <ol className="lt-nb__alllist">
                {rows.map((r) => (
                  <AllChaptersRow key={ncertCode(r)} row={r} onPick={pickChapter} />
                ))}
              </ol>
            </details>
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
