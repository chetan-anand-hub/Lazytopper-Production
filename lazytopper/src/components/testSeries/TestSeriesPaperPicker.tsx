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
import { FOCUS_THEMES, loadFocusSetMeta, type FocusSet, type FocusSetMeta, type FocusSetProgress, type FocusThemeId } from "../../lib/testSeries/focusSets";

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
 *
 * TS-THEMES-1: a third segment, "Focus sets" (a BONUS: short papers on one question type, not counted in the series' test count),
 * shown only when the page passes `focusSets` (none under VITE_TS_FOCUS_SETS_DISABLED). Theme (select), then set 1..5 (select, with
 * its marks and minutes once the small pins chunk has loaded), then the same ONE Start link to the set's Full Mock URL.
 *
 * TS-NAV-2 (owner, 25 Nov 2026): (1) the picker REMEMBERS the student's choice (subject, type, chapter, paper, full-length n, focus
 * theme and set) in sessionStorage `lt-ts-picker` - UI state only, nothing about access or progress - and restores it when the student
 * comes back to /test-series in the same tab session; it scrolls itself into view ONLY when the student is returning from a paper (a
 * flag written on Start, consumed once). Unreadable / unwritable storage -> today's defaults. (2) The link says "Open: ..." on a paper
 * the student already started (same href); "Start: ..." otherwise. Kill switch VITE_TS_NAV2_DISABLED (any value but "", "0", "false")
 * -> no memory, no scroll, always "Start". The select arrows are CSS (testSeriesPage.css) and stay on regardless.
 */

type SeriesType = "chapter" | "full" | "focus";

export interface TestSeriesPaperPickerProps {
  chapters: SeriesChapterTest[];
  mocks: SeriesFullMock[];
  rounds: SeriesMockRound[];
  /** The student's real series progress; null = signed out / still loading. */
  progress: SeriesProgress | null;
  mocksPerSubject: number;
  /** TS-THEMES-1: the bonus focus sets; empty / absent = no "Focus sets" segment (the kill switch). */
  focusSets?: FocusSet[];
  /** The student's real focus-set progress (from their session records); null = signed out / loading. */
  focusProgress?: Record<string, FocusSetProgress> | null;
  /** "Bonus: 30 focus sets" - the count, from code. */
  focusCount?: number;
}

export function statusWords(p: SeriesTestProgress | undefined, signedIn: boolean): string {
  if (!signedIn || !p || p.status === "not-started") return "not started";
  if (p.status === "graded" && p.score) return `graded ${p.score.awarded} of ${p.score.total}`;
  return "attempted";
}

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];

/** TS-NAV-2 kill switch (same reading as VITE_TS_NAV_DISABLED). */
export function tsNav2Disabled(): boolean {
  const v = import.meta.env?.VITE_TS_NAV2_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** TS-NAV-2: the sessionStorage key of the picker's remembered choice (UI state only). */
export const TS_PICKER_STORAGE_KEY = "lt-ts-picker";

export interface PickerMemory {
  subject: SeriesSubject;
  type: SeriesType;
  chapterKey: string;
  paper: number;
  fullN: number;
  focusTheme: string;
  focusN: number;
  /** Set on Start: the next /test-series mount is a return from a paper (scroll the picker into view once). */
  back?: boolean;
}

const posInt = (v: unknown, d: number) => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 999 ? v : d);

/** The remembered choice, or null (nothing stored, unreadable, malformed, or the kill switch). Never throws. */
export function readPickerMemory(): PickerMemory | null {
  if (tsNav2Disabled()) return null;
  try {
    const raw = window.sessionStorage.getItem(TS_PICKER_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const subject = SUBJECTS.find((s) => s === o.subject);
    const type = (["chapter", "full", "focus"] as const).find((t) => t === o.type);
    if (!subject || !type) return null;
    return {
      subject,
      type,
      chapterKey: typeof o.chapterKey === "string" ? o.chapterKey.slice(0, 80) : "",
      paper: posInt(o.paper, 1),
      fullN: posInt(o.fullN, 1),
      focusTheme: typeof o.focusTheme === "string" ? o.focusTheme.slice(0, 40) : "",
      focusN: posInt(o.focusN, 1),
      back: o.back === true,
    };
  } catch {
    return null;
  }
}

/** Remember the choice; storage errors are ignored (the picker then simply forgets). */
export function writePickerMemory(m: PickerMemory): void {
  if (tsNav2Disabled()) return;
  try {
    window.sessionStorage.setItem(TS_PICKER_STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* private mode / quota: forget */
  }
}

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
function MiniProgress({ done, total, show, testId, noun = "tests" }: { done: number; total: number; show: boolean; testId: string; noun?: string }) {
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
        <span className="lt-ts-mini__lbl">
          {total} {noun}
        </span>
      )}
    </span>
  );
}

export default function TestSeriesPaperPicker({ chapters, mocks, rounds, progress, mocksPerSubject, focusSets = [], focusProgress = null, focusCount = 0 }: TestSeriesPaperPickerProps) {
  const signedIn = Boolean(progress);
  // TS-NAV-2: the remembered choice (read once, on mount). A restored choice counts as the student's own: the "next test" seed never overrides it.
  const [memory] = useState(readPickerMemory);
  const [subject, setSubject] = useState<SeriesSubject>(memory?.subject ?? "Maths");
  const [type, setType] = useState<SeriesType>(memory?.type ?? "chapter");
  const [chapterKey, setChapterKey] = useState<string>(memory?.chapterKey ?? "");
  const [paper, setPaper] = useState(memory?.paper ?? 1);
  const [fullN, setFullN] = useState(memory?.fullN ?? 1);
  // The student's own choice always wins: the "next test" suggestion seeds the pickers once, and never after they touched one.
  const touched = useRef(memory !== null);
  const rootRef = useRef<HTMLDivElement>(null);
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
  // TS-THEMES-1: the focus-set marks / minutes come from the pins chunk, fetched only when the "Focus sets" segment is opened.
  const hasFocus = focusSets.length > 0;
  const [focusTheme, setFocusTheme] = useState<FocusThemeId | "">((memory?.focusTheme as FocusThemeId | undefined) ?? "");
  const [focusN, setFocusN] = useState(memory?.focusN ?? 1);
  // TS-NAV-2: returning from a paper -> bring the picker into view ONCE (after this commit's route-change scroll reset), then drop the flag.
  useEffect(() => {
    if (!memory) return undefined;
    writePickerMemory({ ...memory, back: false });
    if (!memory.back) return undefined;
    const t = window.setTimeout(() => rootRef.current?.scrollIntoView?.({ block: "start" }), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const memoryNow = (back: boolean): PickerMemory => ({ subject, type, chapterKey, paper, fullN, focusTheme, focusN, back });
  // Remember every choice the student made (never the untouched defaults, so a first visit still gets the "next test" seed later).
  useEffect(() => {
    if (touched.current) writePickerMemory(memoryNow(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, type, chapterKey, paper, fullN, focusTheme, focusN]);
  const [focusMeta, setFocusMeta] = useState<Record<string, FocusSetMeta> | null>(null);
  useEffect(() => {
    if (type !== "focus" || focusMeta || !hasFocus) return undefined;
    let live = true;
    void loadFocusSetMeta().then((m) => {
      if (live) setFocusMeta(m);
    });
    return () => {
      live = false;
    };
  }, [type, focusMeta, hasFocus]);

  const shownType: SeriesType = type === "focus" && !hasFocus ? "chapter" : type;
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
  const subjectThemes = FOCUS_THEMES.filter((t) => t.subject === subject && focusSets.some((f) => f.subject === subject && f.theme === t.id));
  const theme = subjectThemes.find((t) => t.id === focusTheme) ?? subjectThemes[0];
  const themeSets = theme ? focusSets.filter((f) => f.subject === subject && f.theme === theme.id) : [];
  const focusTest = themeSets.find((f) => f.n === focusN) ?? themeSets[0];
  const selected = shownType === "chapter" ? chapterTest : shownType === "full" ? fullTest : focusTest;
  const focusStatus = (code: string): SeriesTestProgress | undefined => focusProgress?.[code];
  const metaWords = (code: string) => {
    const m = focusMeta?.[code];
    return m ? ` · ${m.marks} marks · ${m.minutes} min` : "";
  };
  const touch = () => {
    touched.current = true;
  };

  const chapterLabel = (g: SeriesChapterTest[]) => {
    const c = g[0];
    const head = `${String(c.index).padStart(2, "0")} · ${c.label}`;
    return signedIn ? `${head} · ${startedCount(g.map((p) => p.code))} of ${g.length} done` : head;
  };
  const selLabel = selected && selected.kind !== "focus" ? labelOf(selected.code) : undefined;
  const selChip = selected && selected.kind !== "focus" && showsChip(selected.kind, selLabel) ? selLabel : undefined;
  const picked = selected ? statusWords(selected.kind === "focus" ? focusStatus(selected.code) : status(selected.code), signedIn) : "";
  const selectedStatus = selected ? (selected.kind === "focus" ? focusStatus(selected.code) : status(selected.code))?.status ?? "not-started" : "not-started";
  // TS-NAV-2: a paper the student already started / attempted / is awaiting says "Open", the same link.
  const verb = !tsNav2Disabled() && selectedStatus !== "not-started" ? "Open" : "Start";
  const goLabel =
    selected && selected.kind === "chapter"
      ? `${verb}: ${selected.label}${group && group.length > 1 ? `, paper ${selected.paper}` : ""}`
      : selected && selected.kind === "focus"
        ? `${verb}: ${selected.themeTitle}, set ${selected.n}`
        : selected
          ? `${verb}: Full-length test ${selected.n}`
          : "Start";
  const subjectCodes = (shownType === "chapter" ? chapters : shownType === "full" ? mocks : focusSets).filter((t) => t.subject === subject).map((t) => t.code);
  const doneCount = (codes: string[]) =>
    shownType === "focus" ? (focusProgress ? codes.filter((c) => (focusStatus(c)?.status ?? "not-started") !== "not-started").length : 0) : startedCount(codes);

  return (
    <div className="lt-ts-pick" data-testid="ts-picker" ref={rootRef}>
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
              setFocusTheme("");
              setFocusN(1);
            }}
            data-testid={`ts-pick-subject-${s}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className={`lt-ts-pick__seg${hasFocus ? " lt-ts-pick__seg--3" : ""}`} role="group" aria-label="Test type" data-testid="ts-pick-type">
        <button
          type="button"
          className="lt-ts-pick__segbtn"
          aria-pressed={shownType === "chapter"}
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
          aria-pressed={shownType === "full"}
          onClick={() => {
            touch();
            setType("full");
          }}
          data-testid="ts-pick-type-full"
        >
          Full-length
        </button>
        {hasFocus && (
          <button
            type="button"
            className="lt-ts-pick__segbtn"
            aria-pressed={shownType === "focus"}
            onClick={() => {
              touch();
              setType("focus");
            }}
            data-testid="ts-pick-type-focus"
          >
            Focus sets
          </button>
        )}
      </div>

      {shownType === "chapter" ? (
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
      ) : shownType === "focus" ? (
        <div className="lt-ts-pick__row lt-ts-pick__row--focus" data-testid="ts-pick-focus-row">
          <p className="lt-ts-focus__bonus" data-testid="ts-pick-focus-bonus">
            <span className="lt-ts-focus__tag">Bonus</span>
            <span>
              {focusCount} focus sets: short papers on one question type, on top of the series tests. Written answers, checked step by step.
            </span>
          </p>
          <label className="lt-ts-pick__fld lt-ts-pick__fld--wide">
            <span className="lt-ts-pick__lbl">Question type</span>
            <select
              className="lt-ts-pick__ctl"
              value={theme?.id ?? ""}
              onChange={(e) => {
                touch();
                setFocusTheme(e.target.value as FocusThemeId);
                setFocusN(1);
              }}
              data-testid="ts-pick-focus-theme"
            >
              {subjectThemes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="lt-ts-pick__fld">
            <span className="lt-ts-pick__lbl">Set</span>
            <select
              className="lt-ts-pick__ctl"
              value={focusTest?.n ?? 1}
              onChange={(e) => {
                touch();
                setFocusN(Number(e.target.value));
              }}
              data-testid="ts-pick-focus-set"
            >
              {themeSets.map((f) => (
                <option key={f.code} value={f.n}>
                  {`Set ${f.n}${metaWords(f.code)}${signedIn ? ` · ${statusWords(focusStatus(f.code), true)}` : ""}`}
                </option>
              ))}
            </select>
          </label>
          {theme && (
            <p className="lt-ts-diff__note lt-ts-focus__blurb" data-testid="ts-pick-focus-blurb">
              {theme.blurb}
            </p>
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
          <Link
            className="lt-ts-btn lt-ts-btn--primary lt-ts-pick__btn"
            to={selected.href}
            data-testid="ts-start"
            data-code={selected.code}
            data-status={selectedStatus}
            onClick={() => writePickerMemory(memoryNow(true))}
          >
            {goLabel} →
          </Link>
        )}
        {diff && shownType !== "focus" && (
          <p className="lt-ts-diff__note" data-testid="ts-pick-diff-note">
            {selChip && <DifficultyChip label={selChip} testId="ts-pick-diff-chip" />}
            <span>{DIFFICULTY_EXPLAINER}</span>
          </p>
        )}
        <p className="lt-ts-pick__state" data-testid="ts-pick-state">
          {signedIn
            ? picked
            : `${shownType === "chapter" ? "Chapter tests" : shownType === "full" ? `${mocksPerSubject} full-length papers` : `${subjectCodes.length} focus sets`} · ${subject}`}
        </p>
      </div>
      <MiniProgress done={doneCount(subjectCodes)} total={subjectCodes.length} show={signedIn} testId="ts-pick-progress" noun={shownType === "focus" ? "sets" : "tests"} />
    </div>
  );
}
