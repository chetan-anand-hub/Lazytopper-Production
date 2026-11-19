/**
 * HUB-TS-1 - the Practice hub's Test Series chooser (a bottom sheet on a phone, a dialog from 640 px). LAZY: the hub imports it with
 * React.lazy and mounts it only after a tap (or a `?ct=1` / `?ts=` arrival), so the landing's first paint and bundle do not grow.
 *
 *   1 Subject (Maths | Science)  2 Chapter tests | Full-length tests
 *   3a chapters in syllabus order, "k of P done" from the student's own records   3b full-length papers by the calendar's two rounds
 *   4  paper tiles 1..P for the chosen chapter (hidden while P = 1)                CTA -> the exact URLs /test-series opens
 *   + the FRESH options (today's Chapter Test / Full Mock draw, unchanged).
 *
 * Nothing here gates or grants anything: access is the routes' own (MockViewGate, the series start/written-check gates).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { isPaidPremium } from "../../services/subscriptionService";
import { isTestSeriesPackOffered, testSeriesPriceLine } from "../../services/packs";
import { TsClockSlot } from "../packs/TestSeriesFoundingClause";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { withQuery } from "../../lib/desktop/navigation";
import { useNavigateAfterPaint } from "../../lib/useNavigateAfterPaint";
import { FREE_TESTS_ALLOWED, countTestsTaken } from "../../lib/testSeries/seriesAccess";
import { TEST_SERIES_PATH, seriesProgress, seriesSchedule, type SeriesProgress, type SeriesSubject } from "../../lib/testSeries/testSeries";
import { chapterTestLandingPath } from "../practice/ChapterTestPicker";
import { writtenCheckGateDisabled } from "./WrittenCheckGate";
import { useTestSeriesOwnership } from "./testSeriesOwnership";
import type { SessionRecord } from "../../services/sessionRecords";
import {
  CHAPTER_PAPERS_PER_CHAPTER,
  chapterPaperHref,
  chapterPaperTiles,
  chapterRows,
  defaultChapterKey,
  defaultMockN,
  defaultPaperK,
  defaultPaperProgress,
  mockGroups,
  type PaperProgressFn,
} from "./seriesChooserModel";
import type { SeriesChooserTab } from "./hubTsFlag";
import "./seriesChooser.css";

export interface SeriesChooserProps {
  open: boolean;
  onClose: () => void;
  /** Which tab it opens on (`?ct=1` / `?ts=1` -> chapter, `?ts=full` -> full). */
  initialTab?: SeriesChooserTab;
  initialSubject?: SeriesSubject;
  /** The hub URL the FRESH full-length test returns to (what the old "Full Test" card passed). */
  returnTo?: string;
  grade?: string;
  /** Test hooks / the multi-paper lane: papers per chapter, the URL of paper k, per-paper progress. */
  papersPerChapter?: number;
  paperHref?: (subject: SeriesSubject, topicKey: string, k: number) => string;
  paperProgress?: PaperProgressFn;
  /** Navigation that outlives this dialog (the hub's own deferred navigate): the chooser unmounts when it closes, which would cancel its own. */
  navigate?: (to: string) => void;
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];

function statusWords(status: string, score: { awarded: number; total: number } | null): string {
  if (status === "graded" && score) return `graded ${score.awarded} of ${score.total}`;
  return status === "attempted" ? "attempted" : "not started";
}

export default function SeriesChooser({
  open,
  onClose,
  initialTab = "chapter",
  initialSubject = "Maths",
  returnTo = "/practice-hub",
  grade = "10",
  papersPerChapter = CHAPTER_PAPERS_PER_CHAPTER,
  paperHref = chapterPaperHref,
  paperProgress,
  navigate,
}: SeriesChooserProps) {
  const { user, loading: authLoading } = useAuth();
  const signedIn = Boolean(user?.uid) && !user?.isLocalSession;
  const uid = signedIn ? (user?.uid ?? null) : null;
  const ownNavigate = useNavigateAfterPaint();
  const navigateAfterPaint = navigate ?? ownNavigate;
  const popRef = useRef<HTMLDivElement | null>(null);

  const [subject, setSubject] = useState<SeriesSubject>(initialSubject);
  const [tab, setTab] = useState<SeriesChooserTab>(initialTab);
  const [pickedChapter, setPickedChapter] = useState<string | null>(null);
  const [pickedPaper, setPickedPaper] = useState<number | null>(null);
  const [pickedMock, setPickedMock] = useState<number | null>(null);

  // ── The student's own records (the SAME source /test-series reads); signed out -> none, no progress text ──
  const [records, setRecords] = useState<SessionRecord[] | null>(null);
  useEffect(() => {
    if (!open || authLoading || !uid) {
      setRecords(null);
      return undefined;
    }
    let live = true;
    import("../../services/sessionRecords")
      .then((m) => m.getSessionRecordsFromCloud(uid))
      .then((r) => {
        if (live) setRecords(r);
      })
      .catch(() => {
        if (live) setRecords([]);
      });
    return () => {
      live = false;
    };
  }, [open, authLoading, uid]);
  const progress: SeriesProgress | null = useMemo(() => (records ? seriesProgress(records) : null), [records]);
  const paperProg = useMemo(() => paperProgress ?? defaultPaperProgress(progress), [paperProgress, progress]);

  // ── Access (display only): a Board Pass holder or a Test Series owner has everything; the rest see the free-test tag + price ──
  const subscription = useSubscription();
  const paid = signedIn && subscription.hydrated && isPaidPremium(subscription.status);
  const ownership = useTestSeriesOwnership(signedIn && subscription.hydrated && !paid ? uid : null);
  const gateOff = writtenCheckGateDisabled();
  const accessKnown = !signedIn || (subscription.hydrated && (paid || ownership.phase === "ready"));
  const entitled = gateOff || paid || ownership.owns;
  const testsTaken = records ? countTestsTaken(records) : null;
  let freeTag: string | null = null;
  if (accessKnown && !entitled) {
    if (!signedIn) freeTag = `${FREE_TESTS_ALLOWED} free test`;
    else if (testsTaken !== null) freeTag = testsTaken < FREE_TESTS_ALLOWED ? `${FREE_TESTS_ALLOWED} free test` : "Free test used";
  }
  const priceLine = accessKnown && !entitled && isTestSeriesPackOffered() ? testSeriesPriceLine(Date.now()) : null;

  // ── Derived selections ──
  const rows = useMemo(() => chapterRows(subject, progress, papersPerChapter, paperProg), [subject, progress, papersPerChapter, paperProg]);
  const chapterKey = rows.some((r) => r.test.topicKey === pickedChapter) ? (pickedChapter as string) : defaultChapterKey(rows, progress !== null);
  const chapter = rows.find((r) => r.test.topicKey === chapterKey)?.test ?? null;
  const tiles = useMemo(() => (chapter ? chapterPaperTiles(chapter, papersPerChapter, paperProg, paperHref) : []), [chapter, papersPerChapter, paperProg, paperHref]);
  const paperK = pickedPaper !== null && tiles.some((t) => t.k === pickedPaper) ? pickedPaper : defaultPaperK(tiles, progress !== null);
  const chapterTile = tiles.find((t) => t.k === paperK) ?? null;
  const groups = useMemo(() => mockGroups(subject, progress), [subject, progress]);
  const mockN = pickedMock ?? defaultMockN(groups, progress);
  const mockTile = groups.flatMap((g) => g.tiles).find((t) => t.n === mockN) ?? null;
  const schedule = useMemo(() => seriesSchedule(predictCbseExamDate("10")), []);
  const manyPapers = tiles.length > 1;

  const pickSubject = (s: SeriesSubject) => {
    setSubject(s);
    setPickedChapter(null);
    setPickedPaper(null);
    setPickedMock(null);
  };

  const go = useCallback(
    (href: string) => {
      onClose();
      navigateAfterPaint(href);
    },
    [onClose, navigateAfterPaint],
  );

  // Focus into the dialog on open, back to the opener on close; Tab cycles inside; Escape closes.
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement as HTMLElement | null;
    const pop = popRef.current;
    pop?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    return () => {
      const now = document.activeElement;
      const lost = !now || now === document.body || (pop ? pop.contains(now) : false);
      if (lost && opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    };
  }, [open]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key !== "Tab" || !popRef.current) return;
    const items = Array.from(popRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !active || !items.includes(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !active || !items.includes(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  const freshChapterHref = chapter ? chapterTestLandingPath(subject, chapter.topicKey) : null;
  const freshFullHref = withQuery(`/full-mock/${grade}/${subject}`, new URLSearchParams({ source: "practice", returnTo }));
  const chapterCta = chapter ? `Start ${chapter.label}${manyPapers ? ` · Paper ${paperK}` : ""} →` : "Pick a chapter";
  const fullCta = `Start ${subject} · Full-Length Test ${mockN} →`;
  const roundTitle = (id: "round1" | "round2") => schedule?.find((r) => r.id === id);

  return createPortal(
    <div
      className="lt-tsc-ov"
      data-testid="ts-chooser"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lt-tsc-pop" ref={popRef} role="dialog" aria-modal="true" aria-label="Test Series" onKeyDown={onKeyDown}>
        <div className="lt-tsc-head">
          <h2 tabIndex={-1}>Test Series</h2>
          <button type="button" className="lt-tsc-x" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
        <div className="lt-tsc-meta" data-testid="ts-chooser-meta">
          <span className="lt-tsc-tag" data-testid="ts-free-tag">
            {freeTag ?? ""}
          </span>
          <span className="lt-tsc-price" data-testid="ts-price">
            {priceLine ? <TsClockSlot variant="line" testId="ts-price-clock">{priceLine}</TsClockSlot> : null}
          </span>
          <Link className="lt-tsc-more" to={TEST_SERIES_PATH} onClick={onClose} data-testid="ts-more">
            How it works
          </Link>
        </div>

        <div className="lt-tsc-seg" role="group" aria-label="Subject">
          {SUBJECTS.map((s) => (
            <button key={s} type="button" aria-pressed={subject === s} data-testid={`ts-subject-${s}`} onClick={() => pickSubject(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="lt-tsc-seg" role="group" aria-label="Kind of test">
          <button type="button" aria-pressed={tab === "chapter"} data-testid="ts-tab-chapter" onClick={() => setTab("chapter")}>
            Chapter tests
          </button>
          <button type="button" aria-pressed={tab === "full"} data-testid="ts-tab-full" onClick={() => setTab("full")}>
            Full-length tests
          </button>
        </div>

        <div className="lt-tsc-body">
          {tab === "chapter" ? (
            <>
              <ul className="lt-tsc-list" aria-label={`${subject} chapters`} data-testid="ts-chapters">
                {rows.map((r) => (
                  <li key={r.test.code}>
                    <button
                      type="button"
                      className="lt-tsc-row"
                      aria-pressed={r.test.topicKey === chapterKey}
                      data-testid={`ts-chapter-${r.test.topicKey}`}
                      onClick={() => {
                        setPickedChapter(r.test.topicKey);
                        setPickedPaper(null);
                      }}
                    >
                      <span className="lt-tsc-num">{String(r.test.index).padStart(2, "0")}</span>
                      <span className="lt-tsc-name">{r.test.label}</span>
                      <span className="lt-tsc-prog" data-testid="ts-chapter-progress">
                        {r.label ?? ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {manyPapers ? (
                <div className="lt-tsc-papers" role="group" aria-label="Paper" data-testid="ts-papers">
                  {tiles.map((t) => (
                    <button
                      key={t.k}
                      type="button"
                      className="lt-tsc-tile"
                      aria-pressed={t.k === paperK}
                      aria-label={`Paper ${t.k}, ${statusWords(t.status, t.score)}`}
                      data-testid={`ts-paper-${t.k}`}
                      onClick={() => setPickedPaper(t.k)}
                    >
                      <span className="lt-tsc-tile__n">{t.k}</span>
                      <span className="lt-tsc-tile__s">{t.status === "graded" && t.score ? `${t.score.awarded}/${t.score.total}` : t.status === "attempted" ? "Done" : progress ? "New" : ""}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div data-testid="ts-fulls">
              {groups.map((g) => {
                const row = roundTitle(g.round.id);
                return (
                  <section key={g.round.id} className="lt-tsc-round" aria-label={row?.title ?? g.round.id}>
                    <h3>
                      {row ? `${row.title} · ${row.when}` : `Tests ${g.round.from}–${g.round.to}`}
                    </h3>
                    <div className="lt-tsc-tiles">
                      {g.tiles.map((t) => (
                        <button
                          key={t.n}
                          type="button"
                          className="lt-tsc-tile"
                          aria-pressed={t.n === mockN}
                          aria-label={`Full-Length Test ${t.n}, ${subject}, ${t.next ? "next, " : ""}${statusWords(t.status, t.score)}`}
                          data-testid={`ts-mock-${t.n}`}
                          data-status={t.status}
                          onClick={() => setPickedMock(t.n)}
                        >
                          <span className="lt-tsc-tile__n">{t.n}</span>
                          <span className="lt-tsc-tile__s">{t.status === "graded" && t.score ? `${t.score.awarded}/${t.score.total}` : t.status === "attempted" ? "Done" : t.next ? "Next" : ""}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="lt-tsc-foot">
          {tab === "chapter" ? (
            <>
              <button type="button" className="lt-tsc-go" data-testid="ts-go" disabled={!chapterTile} onClick={() => chapterTile && go(chapterTile.href)}>
                {chapterCta}
              </button>
              <button type="button" className="lt-tsc-fresh" data-testid="ts-fresh" disabled={!freshChapterHref} onClick={() => freshChapterHref && go(freshChapterHref)}>
                Or a fresh practice test on this chapter
              </button>
            </>
          ) : (
            <>
              <button type="button" className="lt-tsc-go" data-testid="ts-go" disabled={!mockTile} onClick={() => mockTile && go(mockTile.href)}>
                {fullCta}
              </button>
              <button type="button" className="lt-tsc-fresh" data-testid="ts-fresh" onClick={() => go(freshFullHref)}>
                Or a fresh full-length test
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
