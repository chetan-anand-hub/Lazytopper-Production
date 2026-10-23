// src/services/meHomeSummary.ts
//
// MI-HOME-SYNC — the numbers Home's Mistake Intelligence card, the sidebar MI panel and the
// Quick Practice "My weak areas" card show, derived EXACTLY as Me/Progress derives them: the SAME
// shared read (`readStudyModel`, Me's default window), the SAME paper choice, the SAME split
// (`splitPaperMarks`), the SAME chapter list (`buildChapters`, moved here VERBATIM from
// pages/MeProgressPage.tsx, which re-exports it) and the SAME concept rows (`viewRowsFrom`). The
// Practise hrefs come from the SAME builders Me's buttons call (Me calls them from here too), so
// a Home "Practise" and Me's "Practise" for the same chapter / concept can never drift apart.
//
// No new marks rule. The one finer grain added — `mistakeLossByType` — is `mistakeLossByGroup`'s
// rule read per stored type (v2 entries by their own marks, legacy entries by their step
// deductions, as stored); its group sums ARE Me's split (pinned in meHomeSummary.test.tsx).
//
// READ COST (per signed-in Home view, shared by the Home card and the sidebar through a 60 s
// in-tab memo): one unscoped read (progress + mistake history, no Tutor read) + one paper-scoped
// progress read (no mistake history, no Tutor read — the paper's mistakes are cut from the
// unscoped history with the read model's own `buildMistakeView`). Quick Practice's card reads the
// paper-scoped progress only, and shares the memo with the sidebar when the paper matches.

import {
  ME_DEFAULT_WINDOW,
  boardChapterKey,
  buildMistakeView,
  readStudyModel,
  rungNamesWeakness,
  subjectRungOf,
  type MistakeView,
  type ReadSubject,
  type StudyReadModel,
  type StudyReadQuery,
} from "./progressReadModel";
import type { ConceptRung, RungTrend } from "./progressStore";
import { conceptSetPath, type ConceptSetContext, type ConceptSetRef } from "../lib/desktop/conceptSetPath";
import type { MistakeLogEntry } from "./mistakeLogService";
import { studyDataVersion } from "./studyDataSignal";
import { lostMarksOf, splitPaperMarks, viewRowsFrom, type PaperSplit, type ViewRow } from "./meSplit";
import { entryMarksLost, isStoredMistakeType, type StoredMistakeType } from "../lib/mistakeDisplay";
import { desktopTopicForWeakAreaKey } from "../lib/desktop/topics";
import {
  buildDesktopConceptPracticePath,
  withQuery,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../lib/desktop/navigation";

/** Me/Progress's route context — every Practise href Me builds carries it (Me imports it). */
export const ME_ROUTE_CTX: DesktopRouteContext = { source: "me", returnTo: "/me" };
/** WEAK-AREA-DIRECT: Me's concept Practise also names its Back (`?backLabel=`, as the Topic Hub does). */
export const ME_CONCEPT_CTX: ConceptSetContext = { ...ME_ROUTE_CTX, backLabel: "Back to Me / Progress" };

/** The two papers, in Me's order (Maths first breaks a tie). */
export const ME_PAPERS: DesktopSubject[] = ["Maths", "Science"];

export const mePaperScopeKey = (paper: DesktopSubject): ReadSubject =>
  paper === "Science" ? "science" : "maths";

/* ───────────────────────── moved VERBATIM from MeProgressPage ───────────────────────── */

export interface Chapter {
  key: string;
  label: string;
  slug: string | null;
  subject: DesktopSubject | null;
  lost: number;
  /** The dominant KNOWLEDGE-gap type for this chapter, or null. */
  gapType: "conceptual" | "calculation" | null;
  /** The most recent mistake-log entry for this chapter - the retry candidate. */
  retryEntry: MistakeLogEntry | null;
}

/**
 * The chapter list. Sourced from the windowed topic rungs, resolved against the
 * canonical desktop registry so a chapter that does not resolve is routed honestly
 * rather than emitted as a broken path.
 *
 * Ordering is by marks on the table, descending, with the rung key as the tie-break -
 * so it is STABLE between visits and only moves when new graded data moves it. It is
 * never reshuffled for variety.
 */
export function buildChapters(
  topics: RungTrend[],
  paper: DesktopSubject,
  byChapter: MistakeView["byChapter"],
): Chapter[] {
  // ME-ENGINE-1 PR-1 — the mistakes per chapter come from the shared read model, grouped by its
  // ONE canonicaliser (`boardChapterKey`, the 26 board chapters). This page used to group them
  // with `normalizeTopicKey` (the topicAliasMap vocabulary: "reproduction",
  // "heredity-and-evolution") — a second canonicaliser, the G3 #10 split.
  const rows: Chapter[] = [];
  for (const rung of topics) {
    // A mistake-type key can never enter the chapter list - it is not a chapter.
    if (isStoredMistakeType(rung.key.toLowerCase())) continue;
    const meta = desktopTopicForWeakAreaKey(rung.key);
    // Subject purity. The read is already scoped, so this only ever excludes a row
    // that RESOLVES to the other paper; an unresolvable key is kept and routed honestly.
    if (meta?.subject && meta.subject !== paper) continue;

    const canonical = boardChapterKey(rung.key);
    const entries = (canonical ? byChapter[canonical] ?? [] : [])
      .slice()
      .sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""));

    // MI-CARELESS-1 — the chapter's marks per type by `mistakeLossByType` (below): a v2 entry by
    // its OWN marks, a count-only legacy entry by its step deductions. The per-step deductions
    // alone UNDER-state a v2 loss (departure-zeroed work, a consequential slip's inherited marks
    // and objective steps carry 0 or less on the step), which left a concept-gap chapter untagged.
    const { conceptual, calculation } = mistakeLossByType(entries);
    // A chapter is tagged ONLY with a knowledge-gap type — owner ruling: that is
    // `conceptual` alone. Calculation is careless ("you already know this"), so a
    // calculation-dominant chapter carries no tag at all: naming a chapter after a slip
    // would be the moat breaking in a different costume. `calculation` is still summed
    // above only so the comparison stays honest about what dominated.
    const gapType = conceptual > 0 && conceptual >= calculation ? "conceptual" : null;

    rows.push({
      key: rung.key,
      label: meta?.name || rung.label || rung.key,
      slug: meta?.slug ?? null,
      subject: meta?.subject ?? null,
      lost: lostMarksOf(rung) ?? 0,
      gapType,
      retryEntry: entries[0] ?? null,
    });
  }

  rows.sort((a, b) => (b.lost !== a.lost ? b.lost - a.lost : a.key.localeCompare(b.key)));
  return rows;
}

/**
 * Me's default paper: the one with more marks on the table (Maths wins a tie), or null when
 * neither paper has lost a mark (Me then keeps Maths). Moved from Me's paper effect.
 */
export function mePaperOf(subjectRungs: RungTrend[]): DesktopSubject | null {
  const lostByPaper: Record<string, number | null> = {};
  for (const p of ME_PAPERS) {
    const rung = subjectRungs.find((r) => r.key.toLowerCase() === mePaperScopeKey(p));
    lostByPaper[p] = rung ? lostMarksOf(rung) : null;
  }
  const best = ME_PAPERS.slice().sort((a, b) => (lostByPaper[b] ?? -1) - (lostByPaper[a] ?? -1))[0];
  return best && (lostByPaper[best] ?? 0) > 0 ? best : null;
}

/** Me's "Start here" chapter Practise href (Me's start-here card calls this). */
export function meChapterPractisePath(
  c: Pick<Chapter, "slug" | "subject" | "label">,
  ctx: DesktopRouteContext = ME_ROUTE_CTX,
): string {
  if (c.slug && c.subject) {
    return buildDesktopConceptPracticePath({
      subject: c.subject,
      topic: c.slug,
      backLabel: `Back to ${c.label}`,
      ...ctx,
    });
  }
  const params = new URLSearchParams();
  if (ctx.source) params.set("source", ctx.source);
  if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
  return withQuery("/exam-trends", params);
}

/** Me's per-concept row Practise href (Me's "By concept" rows call this; so does Quick Practice's
 *  "My weak areas" card). ONE concept per href. WEAK-AREA-DIRECT: the RENDER-time href is the
 *  paper's honest whole set (no focus); the click (`conceptSetClick`) resolves the concept's EXACT
 *  set lazily (lib/desktop/conceptSetPath), so Home / Quick Practice never load the bank index. */
export function meConceptPractisePath(
  paper: DesktopSubject,
  concept: ConceptSetRef,
  ctx: ConceptSetContext = ME_CONCEPT_CTX,
): string {
  return conceptSetPath(paper, concept, ctx);
}

/** Me's "By concept" rows (`viewRowsFrom`, unchanged) with each row's chapter, so its Practise
 *  can open the concept's own set. A row without a chapter stays as it was. */
export function meConceptRowsFrom(concepts: readonly ConceptRung[]): Array<ViewRow & { chapter?: string }> {
  const chapterByKey = new Map(concepts.map((c) => [c.key, c.chapter]));
  return viewRowsFrom(concepts as ConceptRung[]).map((r) => {
    const chapter = chapterByKey.get(r.key);
    return chapter ? { ...r, chapter } : r;
  });
}

/* ───────────────────────── the per-type marks (same rule, finer grain) ───────────────────────── */

export type TypeMarks = Record<StoredMistakeType, number>;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * `mistakeLossByGroup`'s rule read per stored type: a v2 entry by its own marks
 * (`entryMarksLost`), a legacy count-only entry by the step deductions the grader wrote on typed
 * steps, as stored. Group sums: knowledge = conceptual, technique = presentation, careless =
 * calculation + silly — Me's split. Not-attempted and untyped marks are no type and are left out.
 */
export function mistakeLossByType(entries: readonly MistakeLogEntry[]): TypeMarks {
  const out: TypeMarks = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const entry of entries) {
    const v2 = entryMarksLost(entry);
    if (v2) {
      out.conceptual += v2.conceptual;
      out.calculation += v2.calculation;
      out.silly += v2.silly;
      out.presentation += v2.presentation;
      continue;
    }
    for (const step of entry.stepDetails ?? []) {
      const type = String(step?.mistakeType ?? "").trim().toLowerCase();
      const marks = Number(step?.marksDeducted);
      if (!Number.isFinite(marks) || marks <= 0) continue;
      if (isStoredMistakeType(type)) out[type] += marks;
    }
  }
  return {
    conceptual: round1(out.conceptual),
    calculation: round1(out.calculation),
    silly: round1(out.silly),
    presentation: round1(out.presentation),
  };
}

/* ───────────────────────── the summary ───────────────────────── */

export interface MeHomeRow {
  key: string;
  label: string;
  lost: number;
  /** A concept row's chapter (ConceptRung.chapter), when known — its Practise opens that chapter's set. */
  chapter?: string;
  practisePath: string;
}

export interface MeHomeSummary {
  /** The paper Me opens on (more marks on the table; Maths on a tie or when none lost). */
  paper: DesktopSubject;
  /** Me's hero split for that paper — null below Me's gate (Me names nothing then). */
  split: PaperSplit | null;
  /** Me's "<N> marks on the table" (0 when `split` is null). */
  lost: number;
  /** Marks lost per stored type, summing to Me's split groups; null when Me withholds the split. */
  typeMarks: TypeMarks | null;
  /** True when this paper's window holds at least one typed mistake mark (hides the
   *  "Check a written answer" prompt); independent of whether Me can split the marks. */
  hasTyped: boolean;
  /** Me's "Start here" card #1 (its biggest win), with Me's Practise href. */
  topChapter: MeHomeRow | null;
  /** Me's "By concept" rows, worst first, each with Me's Practise href. */
  concepts: MeHomeRow[];
}

/**
 * Pure: Me's numbers from Me's two reads (the unscoped `all` read and the paper-scoped
 * `paperModel` read) — exactly what MeProgressPage computes on its first render.
 */
export function computeMeHomeSummary(
  all: Pick<StudyReadModel, "progress">,
  paper: DesktopSubject,
  paperProgress: Pick<StudyReadModel["progress"], "topics" | "concepts">,
  paperMistakes: Pick<MistakeView, "entries" | "byChapter">,
): MeHomeSummary {
  const paperRung =
    (all.progress.subjects ?? []).find((r) => r.key.toLowerCase() === mePaperScopeKey(paper)) ?? null;
  const split = splitPaperMarks(paperRung, paperMistakes.entries);
  const byType = mistakeLossByType(paperMistakes.entries);
  const typeMarks = split && split.splitKnown ? byType : null;
  // Whether a typed mistake EXISTS for this paper — not whether Me could split it (an
  // over-attributing log has splitKnown false but the student has already checked written work).
  const hasTyped = byType.conceptual + byType.calculation + byType.silly + byType.presentation > 0;
  const chapters = buildChapters(paperProgress.topics ?? [], paper, paperMistakes.byChapter);
  const first = chapters[0];
  const topChapter =
    first && first.lost > 0
      ? { key: first.key, label: first.label, lost: first.lost, practisePath: meChapterPractisePath(first) }
      : null;
  const concepts = meConceptRowsFrom(paperProgress.concepts ?? []).map((r) => ({
    ...r,
    practisePath: meConceptPractisePath(paper, r),
  }));
  return { paper, split, lost: split?.lost ?? 0, typeMarks, hasTyped, topChapter, concepts };
}

/* ───────────────────────── the shared, memoised read ───────────────────────── */

const MEMO_MS = 60_000;
// MI-CONSISTENCY-1 — every key carries `studyDataVersion()`: a write on this device (an attempt,
// a mistake, a session record, the wrong-answer log) starts a fresh read at once instead of
// serving the pre-write read for up to MEMO_MS (services/studyDataSignal).
const memo = new Map<string, { at: number; p: Promise<unknown> }>();

function memoised<T>(key: string, run: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = memo.get(key);
  if (hit && now - hit.at < MEMO_MS) return hit.p as Promise<T>;
  const p = run();
  // Superseded versions' reads are never asked for again: drop the expired ones as we go.
  for (const [k, v] of memo) if (now - v.at >= MEMO_MS) memo.delete(k);
  memo.set(key, { at: now, p });
  // A failed read is never cached.
  p.catch(() => {
    if (memo.get(key)?.p === p) memo.delete(key);
  });
  return p;
}

/** Test seam: forget every memoised read. */
export function resetMeHomeMemo(): void {
  memo.clear();
}

/** The shared read model's reader for ONE uid (the sidebar passes its own `readStudyModel(uid, q)`
 *  call so its one source stays visible in its file; every reader is `readStudyModel`). */
export type MeHomeReader = (query: StudyReadQuery) => Promise<StudyReadModel>;

function readAll(uid: string, gen: number, reader: MeHomeReader): Promise<StudyReadModel> {
  return memoised(`all|${uid}|${gen}|v${studyDataVersion()}`, () => reader({ window: ME_DEFAULT_WINDOW, tutor: false }));
}

function readPaper(uid: string, gen: number, paper: DesktopSubject, reader: MeHomeReader): Promise<StudyReadModel> {
  return memoised(`paper|${uid}|${gen}|v${studyDataVersion()}|${paper}`, () =>
    reader({ window: ME_DEFAULT_WINDOW, subject: mePaperScopeKey(paper), mistakes: false, tutor: false }),
  );
}

export interface MeHomeRead {
  /** The unscoped read (both papers) — the sidebar's checked-answers / biggest-loss source. */
  all: StudyReadModel;
  summary: MeHomeSummary;
}

/** Home + sidebar: Me's paper, Me's numbers. `gen` busts the memo after a mistake-log hydration. */
export async function loadMeHome(
  uid: string,
  gen = 0,
  reader: MeHomeReader = (q) => readStudyModel(uid, q),
): Promise<MeHomeRead> {
  const all = await readAll(uid, gen, reader);
  const paper = mePaperOf(all.progress.subjects ?? []) ?? "Maths";
  const scoped = await readPaper(uid, gen, paper, reader);
  const paperMistakes = buildMistakeView(
    all.mistakes.entries,
    { start: all.range.start, end: all.range.end, subject: mePaperScopeKey(paper) },
    all.mistakes.complete,
  );
  return { all, summary: computeMeHomeSummary(all, paper, scoped.progress, paperMistakes) };
}

/** Quick Practice: Me's concept rows for ONE paper (the page's subject), with Me's hrefs.
 *  Naming a concept IS naming a weakness, so the rows are returned ONLY when the paper's rung
 *  passes Me's gate (`rungNamesWeakness`, the one predicate Me / the Tutor brief ask); below it
 *  → [] (the card stays locked). The rung comes from the scoped read's own `progress.subjects`:
 *  a subject-scoped read builds the paper's rung from the SAME subject-filtered graded points the
 *  unscoped read uses for that paper (progressStore `getWindowedProgress` → `buildSubjectRung`),
 *  so asking the unscoped read as well could never find a rung this one lacks — it would only
 *  add a read (with mistake history) for every student below the gate. */
export async function loadMeConceptRows(
  uid: string,
  paper: DesktopSubject,
  gen = 0,
  reader: MeHomeReader = (q) => readStudyModel(uid, q),
): Promise<MeHomeRow[]> {
  const scoped = await readPaper(uid, gen, paper, reader);
  if (!rungNamesWeakness(subjectRungOf(scoped.progress, mePaperScopeKey(paper)))) return [];
  return meConceptRowsFrom(scoped.progress.concepts ?? []).map((r) => ({
    ...r,
    practisePath: meConceptPractisePath(paper, r),
  }));
}
