import { use, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { trackNamedEvent, type NamedAnalyticsEvent } from "../analytics/analytics";
import { useReturnTicket } from "../components/navigation/ReturnTicket";
import { MathText } from "../components/question/MathText";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { ncertCode, ncertPracticePath, ncertReadPath, ncertRowsForSlug } from "../config/ncertBooks";
import {
  bankSlugOf,
  bookChapterNo,
  hasBook,
  parseSolutionsPath,
  publishedRows,
  solutionsBookName,
  solutionsChapter,
  solutionsPath,
  solutionsTitle,
  type PublishSafeRow,
  type SolutionsBook,
  type SolutionsChapter,
} from "../config/solutionsPublishSafe";
import { CBSE_2027_MAIN_EXAM_WINDOW } from "./cbse2027Sources";
import { chapterUnit, UNIT_MARKS } from "../config/syllabus2026-27";
import { ensureBankChapters, getBankRows, isBankChapterLoaded } from "../data/bankChapters/loader";
import type { CanonicalQuestion } from "../data/predictionTypes";
import { compareAnswer, compareOption, correctOptionIndex, type Verdict } from "../lib/solutions/compareAnswer";
import "./solutions.css";

/**
 * SolutionsPage — `/ncert-solutions/:chapter` and `/ncert-exemplar/:chapter` (SOLUTIONS-1, lane G;
 * #973 D259 / D260 / D261). Pilot: Chapter 6 Triangles; SOLUTIONS-2 (owner 18 Oct 2026): every Maths chapter.
 *
 * ★ FREE, ATTEMPT-FIRST (D259). Before an attempt: the question, its options (MCQ / AR), and
 *   "Stuck? Show a hint" (the FIRST step only). An attempt is any MCQ pick or any non-empty typed
 *   answer (no "close to correct" gate); the photo check is the third route and leaves the page.
 *   After it: the full step-by-step solution. No account, ever, for any of this.
 * ★ SAME HTML FOR EVERYONE. Every solution is rendered into the page and only `hidden` until the
 *   attempt, so the prerender (and Googlebot) carry the same markup a student gets. No cloaking.
 * ★ VERDICTS (D260). MCQ / AR: ✓ / ✗ when exactly one option equals the key. Typed: ✓ / ✗ ONLY
 *   for rows opted in in `solutionsPublishSafe.ts`, via `compareAnswer` (never wrong for a correct
 *   equivalent; unsure → no verdict). Every ✗ ends in the "Check my answer" line.
 * ★ DATA (D261). Allowlist ∩ the bank chapter's SERVED rows (the chapter module drops every
 *   WITHHELD_QUESTION_IDS row), so a row withheld later disappears on the next build.
 * ★ FIRST PAINT. The app shows the prerendered markup as this route's Suspense fallback; the page
 *   SUSPENDS (React `use`) until the chapter chunk is in, instead of rendering a loading state that
 *   would blank the prerendered solutions.
 * ★ URGENCY: real facts only (D260 §2) — the CBSE main-exam window constant, pre-boards in
 *   December, the official 2026-27 unit marks. No counts, no timers, no prices.
 */

const chapterLoads = new Map<string, Promise<void>>();

function useServedRows(slug: string): CanonicalQuestion[] {
  if (!isBankChapterLoaded(slug)) {
    let p = chapterLoads.get(slug);
    if (!p) {
      p = ensureBankChapters([slug]).catch((error: unknown) => {
        chapterLoads.delete(slug);
        throw error;
      });
      chapterLoads.set(slug, p);
    }
    use(p);
  }
  return getBankRows([slug]);
}

const track = (name: NamedAnalyticsEvent) => trackNamedEvent(name);

/** The page's h1 — one builder, shared with the static heads (`solutionsTitle`). */
export function solutionsH1(book: SolutionsBook, ch: SolutionsChapter): string {
  return solutionsTitle(book, ch);
}

const anchorOf = (id: string) => id.toLowerCase();

/** "NCERT Ex 6.2 Q1(i)" → "Exercise 6.2"; anything without an exercise number → null (never invented). */
export function exerciseOf(ref: string | undefined): string | null {
  const m = /\bEx(?:ercise)?\s*(\d+\.\d+)/i.exec(String(ref ?? ""));
  return m ? `Exercise ${m[1]}` : null;
}

const OTHER_GROUP = "Examples and more questions";

function groupRows<T extends { q: CanonicalQuestion }>(rows: T[]): Array<{ title: string; rows: T[] }> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const title = exerciseOf(row.q.ncertRef) ?? OTHER_GROUP;
    groups.set(title, [...(groups.get(title) ?? []), row]);
  }
  const num = (t: string) => (t === OTHER_GROUP ? Infinity : Number(t.replace("Exercise ", "")));
  return [...groups.entries()].sort((a, b) => num(a[0]) - num(b[0])).map(([title, rs]) => ({ title, rows: rs }));
}

const LETTERS = ["a", "b", "c", "d", "e"];

function CheckLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <Link to="/check-improve" className={className} onClick={() => track("sol_check_start")}>
      {children}
    </Link>
  );
}

function QuestionCard({ q, safe }: { q: CanonicalQuestion; safe: PublishSafeRow }) {
  const anchor = anchorOf(q.id);
  const options = Array.isArray(q.options) ? q.options : null;
  const steps = Array.isArray(q.solutionSteps) ? q.solutionSteps : [];
  const key = String(q.finalAnswer ?? q.answer ?? "");
  const correct = options ? correctOptionIndex(String(q.answer ?? ""), options) : null;

  const [hint, setHint] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState<{ verdict: Verdict; shown: string } | null>(null);
  const attempted = pick !== null || submitted !== null;

  const unlock = () => {
    if (!attempted) track("sol_unlock");
  };

  const onPick = (i: number) => {
    if (pick !== null) return;
    unlock();
    setPick(i);
    track("sol_attempt_mcq");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!typed.trim() || submitted) return;
    const result = safe.verdict === "value" ? compareAnswer(typed, key) : { verdict: "none" as const, shown: typed.trim() };
    unlock();
    setSubmitted(result);
    track(
      result.verdict === "right"
        ? "sol_attempt_typed_right"
        : result.verdict === "wrong"
          ? "sol_attempt_typed_wrong"
          : "sol_attempt_no_verdict",
    );
  };

  const verdict: Verdict | null = options && pick !== null ? compareOption(pick, String(q.answer ?? ""), options) : submitted?.verdict ?? null;

  return (
    <article
      id={anchor}
      className="lt-ncs__q"
      data-testid={`ncs-q-${anchor}`}
      data-verdict={options ? "option" : safe.verdict === "value" ? "value" : "none"}
    >
      <header className="lt-ncs__qhead">
        <span className="lt-ncs__ref">{q.ncertRef ?? q.id}</span>
        <span className="lt-ncs__marks">
          {q.marks} {q.marks === 1 ? "mark" : "marks"}
        </span>
      </header>
      <div className="lt-ncs__stem">
        <MathText text={String(q.questionText ?? "")} />
      </div>

      {options ? (
        <ol className="lt-ncs__opts" aria-label="Options">
          {options.map((opt, i) => {
            const state = pick === null ? "" : i === correct ? " is-right" : i === pick ? " is-wrong" : "";
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`lt-ncs__opt${state}`}
                  aria-pressed={pick === i}
                  disabled={pick !== null}
                  onClick={() => onPick(i)}
                >
                  <span className="lt-ncs__optl">({LETTERS[i] ?? i + 1})</span> <MathText text={String(opt)} />
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <form className="lt-ncs__try" onSubmit={onSubmit}>
          <label htmlFor={`ncs-in-${anchor}`}>Your final answer</label>
          <div className="lt-ncs__tryrow">
            <input
              id={`ncs-in-${anchor}`}
              type="text"
              autoComplete="off"
              value={typed}
              disabled={submitted !== null}
              placeholder={safe.verdict === "value" ? "e.g. 2 cm" : "Type your last line, then check"}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button type="submit" disabled={!typed.trim() || submitted !== null}>
              Check
            </button>
          </div>
        </form>
      )}

      {!attempted && steps.length > 0 && (
        <div className="lt-ncs__hintbox">
          <button
            type="button"
            className="lt-ncs__hintbtn"
            aria-expanded={hint}
            aria-controls={`ncs-hint-${anchor}`}
            onClick={() => {
              if (!hint) track("sol_hint");
              setHint(!hint);
            }}
          >
            Stuck? Show a hint
          </button>
          <div id={`ncs-hint-${anchor}`} className="lt-ncs__hint" hidden={!hint} data-testid={`ncs-hint-${anchor}`}>
            <span className="lt-ncs__steplabel">Step 1</span> <MathText text={String(steps[0])} />
          </div>
        </div>
      )}

      <div className="lt-ncs__sol" hidden={!attempted} data-testid={`ncs-sol-${anchor}`}>
        {verdict === "right" && (
          <p className="lt-ncs__verdict is-right">✓ {options ? "Correct." : "Your answer matches."}</p>
        )}
        {verdict === "wrong" && (
          <p className="lt-ncs__verdict is-wrong">
            ✗ {options ? "Not quite." : <>Your answer: {submitted?.shown} · Correct: {key}</>}
          </p>
        )}
        {submitted && verdict === "none" && <p className="lt-ncs__yours">Your answer: {submitted.shown}</p>}
        {verdict === "wrong" && (
          <p className="lt-ncs__convert">
            You lost marks here. Find out exactly where →{" "}
            <CheckLink className="lt-ncs__convertlink">Check my answer</CheckLink>
          </p>
        )}
        <h4 className="lt-ncs__solh">Step-by-step solution</h4>
        <ol className="lt-ncs__steps">
          {steps.map((s, i) => (
            <li key={i}>
              <MathText text={String(s)} />
            </li>
          ))}
        </ol>
        <p className="lt-ncs__final">
          <strong>Answer:</strong> <MathText text={key} />
        </p>
        {verdict !== "wrong" && (
          <p className="lt-ncs__photo">
            <CheckLink className="lt-ncs__photolink">
              See exactly which step lost you marks: photograph your working (first check free)
            </CheckLink>
          </p>
        )}
      </div>
    </article>
  );
}

function ChapterSolutions({ book, ch }: { book: SolutionsBook; ch: SolutionsChapter }) {
  // SOLUTIONS-2: a chapter's bank / notes slug can differ from its URL slug (trigonometry → Ch 8 and Ch 9).
  const bank = bankSlugOf(ch);
  const served = useServedRows(bank);
  const rows = publishedRows(served, ch, book);
  const groups = groupRows(rows);
  const here = solutionsPath(book, ch.slug);
  const ncertRow = ncertRowsForSlug(bank).find((r) => r.chapter === ch.chapter) ?? null;
  const unit = chapterUnit(bank);
  const totalMarks = unit ? Object.values(UNIT_MARKS[unit.subject]).reduce((a, b) => a + b, 0) : null;
  const sibling: SolutionsBook = book === "ncert" ? "exemplar" : "ncert";
  const BOOK_NAME = { ncert: solutionsBookName("ncert"), exemplar: solutionsBookName("exemplar") };

  const ticket = useReturnTicket();
  const backHref = ticket?.path ?? "/";
  const backLabel = ticket?.label ?? "Home";

  return (
    <main className="lt-ncs" data-testid="ncert-solutions-page" data-book={book}>
      <header className="lt-ncs__hero">
        <div className="lt-ncs__w">
          <Link to={backHref} className="lt-ncs__back">
            <span aria-hidden="true">←</span>
            <span>{backLabel}</span>
          </Link>
          <p className="lt-ncs__eyebrow">CBSE Class 10 · Boards 2027 · NCERT 2026-27 syllabus</p>
          <h1>{solutionsH1(book, ch)}</h1>
          <p className="lt-ncs__sub">
            Try each question first: pick an option or type your final answer, then see the full step-by-step
            solution. Stuck? Open the first step as a hint. Free, no account needed.
          </p>
          <ul className="lt-ncs__facts">
            <li>Boards begin {CBSE_2027_MAIN_EXAM_WINDOW}</li>
            <li>Pre-boards are in December</li>
            {unit && totalMarks ? (
              <li>
                {ch.title} is in {unit.unitName}, which carries {unit.unitMarks} of the {totalMarks} marks in the
                2026-27 CBSE {ch.subject} paper
              </li>
            ) : null}
          </ul>
        </div>
      </header>

      <div className="lt-ncs__w lt-ncs__body">
        <nav className="lt-ncs__links" aria-label={`${ch.title}: more on this chapter`}>
          <Link to={`/notes/${bank}`}>Notes</Link>
          <Link to={`/notes/${bank}#formulae`}>Formulae</Link>
          {ncertRow ? (
            <Link to={ncertReadPath(ncertRow, here, BOOK_NAME[book])}>
              Read NCERT Chapter {ch.chapter} ({ncertCode(ncertRow)})
            </Link>
          ) : null}
          {ncertRow ? <Link to={ncertPracticePath(ncertRow)}>Practice</Link> : null}
          <CheckLink className="">Check my answer</CheckLink>
          {hasBook(ch, sibling) ? <Link to={solutionsPath(sibling, ch.slug)}>{BOOK_NAME[sibling]}</Link> : null}
        </nav>

        <p className="lt-ncs__count">
          {rows.length} {book === "ncert" ? "NCERT textbook" : "NCERT Exemplar"} questions from Chapter{" "}
          {bookChapterNo(ch, book)}
        </p>

        {groups.map((g) => (
          <section key={g.title} className="lt-ncs__group" aria-label={g.title}>
            <h2>{g.title}</h2>
            {g.rows.map(({ q, safe }) => (
              <QuestionCard key={q.id} q={q} safe={safe} />
            ))}
          </section>
        ))}

        <section className="lt-ncs__cta" aria-labelledby="ncs-cta-h">
          <h2 id="ncs-cta-h">Would your working get full marks?</h2>
          <p>
            Board examiners mark every step. Photograph your written answer and see the marks for each step, and
            exactly where they were lost. Your first answer check is free.
          </p>
          <CheckLink className="lt-ncs__ctabtn">Check my answer</CheckLink>
        </section>

        <p className="lt-ncs__fine">
          Questions from the NCERT Class 10 {ch.subject === "Maths" ? "Mathematics" : ch.subject}{" "}
          {book === "ncert" ? "textbook" : "Exemplar Problems"}; the solutions are written by LazyTopper. LazyTopper is
          an independent platform and is not affiliated with CBSE or NCERT.
        </p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}

export default function SolutionsPage() {
  const { pathname } = useLocation();
  const parsed = parseSolutionsPath(pathname);
  const ch = parsed ? solutionsChapter(parsed.slug) : null;
  // Only the allowlisted chapters exist, and a book page only when that book has rows. Anything else
  // goes to the NCERT books page in the app (vercel.json is generated from the router, so like
  // /notes/:topicSlug any one-segment chapter reaches the shell; this redirect handles the rest,
  // FU-SOLUTIONS-UNKNOWN-CHAPTER-404).
  if (!parsed || !ch || !hasBook(ch, parsed.book)) return <Navigate to="/ncert-class-10" replace />;
  return <ChapterSolutions book={parsed.book} ch={ch} />;
}
