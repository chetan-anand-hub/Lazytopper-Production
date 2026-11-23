import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  DIFFICULTY_EXPLAINER,
  DIFFICULTY_LABELS,
  loadPaperDifficulty,
  showsChip,
  tsDifficultyDisabled,
  type PaperDifficultyLabel,
  type PaperDifficultyMap,
} from "../../lib/testSeries/paperDifficulty";
import type { SeriesChapterTest, SeriesFullMock, SeriesMockRound, SeriesProgress, SeriesSubject, SeriesTestProgress } from "../../lib/testSeries/testSeries";

/**
 * TS-UX-PAGE-1 (owner, 19 Nov 2026) - /test-series "Take a test": the 180-tile grid replaced by four short steps, so the page is a few
 * screens shorter on a phone.
 *
 *   1 Subject (Maths | Science)   2 Chapter tests | Full-length   3 a chapter (select), then its paper 1..P   -or-   a full-length paper (select)
 *   4 ONE primary "Start" link to the exact URL the old tile opened (chapterTestSeriesHref / fullMockSeriesHref, carried on each test).
 *
 * Progress ("not started", "attempted", "graded 31 of 40") comes only from the student's REAL session records (the `progress` prop);
 * signed out, the selects show no status at all. Nothing here gates or grants anything: the routes' own rules decide access.
 * Every control is >= 48 px tall (CSS .lt-ts-pick__ctl). Class-based CSS only.
 *
 * TS-DIFF-1: an "Easier / Standard / Harder" chip + a filter on the full-length list. The labels are LAZY (paperDifficulty.json is its own
 * chunk, fetched after mount), so the first paint is unchanged; until they load - or under VITE_TS_DIFFICULTY_DISABLED - nothing shows.
 */

type SeriesType = "chapter" | "full";

export interface TestSeriesPaperPickerProps {
  chapters: SeriesChapterTest[];
  mocks: SeriesFullMock[];
  rounds: SeriesMockRound[];
  /** The student's real series progress; null = signed out / still loading. */
  progress: SeriesProgress | null;
  mocksPerSubject: number;
}

export function statusWords(p: SeriesTestProgress | undefined, signedIn: boolean): string {
  if (!signedIn || !p || p.status === "not-started") return "not started";
  if (p.status === "graded" && p.score) return `graded ${p.score.awarded} of ${p.score.total}`;
  return "attempted";
}

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];

type DiffFilter = "all" | PaperDifficultyLabel;
const FILTERS: ReadonlyArray<{ id: DiffFilter; text: string }> = [{ id: "all", text: "All" }, ...DIFFICULTY_LABELS.map((l) => ({ id: l, text: l }))];

function DifficultyChip({ label, testId }: { label: PaperDifficultyLabel; testId: string }) {
  return (
    <span className={`lt-ts-diff lt-ts-diff--${label.toLowerCase()}`} aria-label={`Difficulty: ${label}`} data-testid={testId}>
      {label}
    </span>
  );
}

/** A small bar of REAL progress (done of total); signed out it shows the count only, in the same box. */
function MiniProgress({ done, total, show, testId }: { done: number; total: number; show: boolean; testId: string }) {
  return (
    <span className="lt-ts-mini" data-testid={testId}>
      {show ? (
        <>
          <progress className="lt-ts-mini__bar" max={total} value={done} aria-label={`${done} of ${total} done`} />
          <span className="lt-ts-mini__lbl">
            {done}/{total} done
          </span>
        </>
      ) : (
        <span className="lt-ts-mini__lbl">{total} tests</span>
      )}
    </span>
  );
}

export default function TestSeriesPaperPicker({ chapters, mocks, rounds, progress, mocksPerSubject }: TestSeriesPaperPickerProps) {
  const signedIn = Boolean(progress);
  const [subject, setSubject] = useState<SeriesSubject>("Maths");
  const [type, setType] = useState<SeriesType>("chapter");
  const [chapterKey, setChapterKey] = useState<string>("");
  const [paper, setPaper] = useState(1);
  const [fullN, setFullN] = useState(1);
  // The student's own choice always wins: the "next test" suggestion seeds the pickers once, and never after they touched one.
  const touched = useRef(false);
  const seeded = useRef(false);
  // TS-DIFF-1: the labels arrive after mount (lazy chunk); null = not loaded, killed, or failed -> no chip, no filter.
  const [diff, setDiff] = useState<PaperDifficultyMap | null>(null);
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  useEffect(() => {
    if (tsDifficultyDisabled()) return;
    let live = true;
    void loadPaperDifficulty().then((m) => {
      if (live) setDiff(m);
    });
    return () => {
      live = false;
    };
  }, []);
  const labelOf = (code: string): PaperDifficultyLabel | undefined => diff?.[`TS-${code}`]?.label;

  const groups = useMemo(() => {
    const m = new Map<string, SeriesChapterTest[]>();
    for (const c of chapters) m.set(c.topicKey, [...(m.get(c.topicKey) ?? []), c]);
    return [...m.values()];
  }, [chapters]);
  const subjectGroups = useMemo(() => groups.filter((g) => g[0].subject === subject), [groups, subject]);
  const subjectMocks = useMemo(() => mocks.filter((m) => m.subject === subject), [mocks, subject]);

  const status = (code: string) => progress?.byCode[code];
  const startedCount = (codes: string[]) => (progress ? codes.filter((c) => (status(c)?.status ?? "not-started") !== "not-started").length : 0);

  // First not-started test (series order), once the real progress is in: the pickers open on it.
  useEffect(() => {
    if (!progress || seeded.current || touched.current) return;
    seeded.current = true;
    const next = [...chapters, ...mocks].find((t) => (progress.byCode[t.code]?.status ?? "not-started") === "not-started");
    if (!next) return;
    setSubject(next.subject);
    if (next.kind === "chapter") {
      setType("chapter");
      setChapterKey(next.baseCode);
      setPaper(next.paper);
    } else {
      setType("full");
      setFullN(next.n);
    }
  }, [progress, chapters, mocks]);

  const group = subjectGroups.find((g) => g[0].baseCode === chapterKey) ?? subjectGroups[0];
  const chapterTest = group ? group.find((c) => c.paper === paper) ?? group[0] : undefined;
  // The filter only narrows the full-length list; an empty result (cannot happen with real labels) falls back to the whole list.
  const filteredMocks = useMemo(() => {
    if (!diff || diffFilter === "all") return subjectMocks;
    const f = subjectMocks.filter((m) => diff[`TS-${m.code}`]?.label === diffFilter);
    return f.length ? f : subjectMocks;
  }, [diff, diffFilter, subjectMocks]);
  const fullTest = filteredMocks.find((m) => m.n === fullN) ?? filteredMocks[0];
  const selected = type === "chapter" ? chapterTest : fullTest;
  const touch = () => {
    touched.current = true;
  };

  const chapterLabel = (g: SeriesChapterTest[]) => {
    const c = g[0];
    const head = `${String(c.index).padStart(2, "0")} · ${c.label}`;
    return signedIn ? `${head} · ${startedCount(g.map((p) => p.code))} of ${g.length} done` : head;
  };
  const selLabel = selected ? labelOf(selected.code) : undefined;
  const selChip = selected && showsChip(selected.kind, selLabel) ? selLabel : undefined;
  const picked = selected ? statusWords(status(selected.code), signedIn) : "";
  const goLabel =
    selected && selected.kind === "chapter"
      ? `Start: ${selected.label}${group && group.length > 1 ? `, paper ${selected.paper}` : ""}`
      : selected
        ? `Start: Full-length test ${selected.n}`
        : "Start";
  const subjectCodes = (type === "chapter" ? chapters : mocks).filter((t) => t.subject === subject).map((t) => t.code);

  return (
    <div className="lt-ts-pick" data-testid="ts-picker">
      <div className="lt-ts-pick__seg" role="group" aria-label="Subject" data-testid="ts-pick-subject">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            type="button"
            className="lt-ts-pick__segbtn"
            aria-pressed={subject === s}
            onClick={() => {
              touch();
              setSubject(s);
              setChapterKey("");
              setPaper(1);
              setFullN(1);
            }}
            data-testid={`ts-pick-subject-${s}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="lt-ts-pick__seg" role="group" aria-label="Test type" data-testid="ts-pick-type">
        <button
          type="button"
          className="lt-ts-pick__segbtn"
          aria-pressed={type === "chapter"}
          onClick={() => {
            touch();
            setType("chapter");
          }}
          data-testid="ts-pick-type-chapter"
        >
          Chapter tests
        </button>
        <button
          type="button"
          className="lt-ts-pick__segbtn"
          aria-pressed={type === "full"}
          onClick={() => {
            touch();
            setType("full");
          }}
          data-testid="ts-pick-type-full"
        >
          Full-length
        </button>
      </div>

      {type === "chapter" ? (
        <div className="lt-ts-pick__row" data-testid="ts-pick-chapter-row">
          <label className="lt-ts-pick__fld lt-ts-pick__fld--wide">
            <span className="lt-ts-pick__lbl">Chapter</span>
            <select
              className="lt-ts-pick__ctl"
              value={group?.[0].baseCode ?? ""}
              onChange={(e) => {
                touch();
                setChapterKey(e.target.value);
                setPaper(1);
              }}
              data-testid="ts-pick-chapter"
            >
              {subjectGroups.map((g) => (
                <option key={g[0].baseCode} value={g[0].baseCode}>
                  {chapterLabel(g)}
                </option>
              ))}
            </select>
          </label>
          {group && group.length > 1 && (
            <label className="lt-ts-pick__fld">
              <span className="lt-ts-pick__lbl">Paper</span>
              <select
                className="lt-ts-pick__ctl"
                value={chapterTest?.paper ?? 1}
                onChange={(e) => {
                  touch();
                  setPaper(Number(e.target.value));
                }}
                data-testid="ts-pick-paper"
              >
                {group.map((p) => (
                  <option key={p.code} value={p.paper}>
                    {`Paper ${p.paper}${showsChip("chapter", labelOf(p.code)) ? ` · ${labelOf(p.code)}` : ""}${signedIn ? ` · ${statusWords(status(p.code), true)}` : ""}`}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : (
        <div className="lt-ts-pick__row" data-testid="ts-pick-full-row">
          {diff && (
            <div className="lt-ts-pick__seg lt-ts-pick__seg--4" role="group" aria-label="Filter full-length papers by difficulty" data-testid="ts-pick-diff-filter">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="lt-ts-pick__segbtn"
                  aria-pressed={diffFilter === f.id}
                  onClick={() => {
                    touch();
                    setDiffFilter(f.id);
                  }}
                  data-testid={`ts-pick-diff-${f.id}`}
                >
                  {f.text}
                </button>
              ))}
            </div>
          )}
          <label className="lt-ts-pick__fld lt-ts-pick__fld--wide">
            <span className="lt-ts-pick__lbl">Full-length paper (80 marks, 3 hours)</span>
            <select
              className="lt-ts-pick__ctl"
              value={fullTest?.n ?? 1}
              onChange={(e) => {
                touch();
                setFullN(Number(e.target.value));
              }}
              data-testid="ts-pick-full"
            >
              {rounds
                .filter((r) => filteredMocks.some((m) => m.n >= r.from && m.n <= r.to))
                .map((r) => (
                <optgroup key={r.id} label={`${r.id === "round1" ? "Round 1 (Dec)" : "Round 2 (Jan)"}: ${r.from}–${r.to}`}>
                  {filteredMocks
                    .filter((m) => m.n >= r.from && m.n <= r.to)
                    .map((m) => (
                      <option key={m.code} value={m.n}>
                        {`Full-length ${m.n}${showsChip("mock", labelOf(m.code)) ? ` · ${labelOf(m.code)}` : ""}${signedIn ? ` · ${statusWords(status(m.code), true)}` : ""}`}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="lt-ts-pick__go" data-testid="ts-pick-go">
        {selected && (
          <Link className="lt-ts-btn lt-ts-btn--primary lt-ts-pick__btn" to={selected.href} data-testid="ts-start" data-code={selected.code} data-status={status(selected.code)?.status ?? "not-started"}>
            {goLabel} →
          </Link>
        )}
        {diff && (
          <p className="lt-ts-diff__note" data-testid="ts-pick-diff-note">
            {selChip && <DifficultyChip label={selChip} testId="ts-pick-diff-chip" />}
            <span>{DIFFICULTY_EXPLAINER}</span>
          </p>
        )}
        <p className="lt-ts-pick__state" data-testid="ts-pick-state">
          {signedIn ? picked : `${type === "chapter" ? "Chapter tests" : `${mocksPerSubject} full-length papers`} · ${subject}`}
        </p>
      </div>
      <MiniProgress done={startedCount(subjectCodes)} total={subjectCodes.length} show={signedIn} testId="ts-pick-progress" />
    </div>
  );
}
